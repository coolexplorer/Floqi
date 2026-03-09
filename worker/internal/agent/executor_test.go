package agent

// TC-5005~5010: AI Agent Tool Use 루프 테스트 (TDD Red Phase)
//
// 구현 요구사항:
//   - ExecuteAutomation(ctx, client, registry, prompt) (*ExecutionResult, error)
//   - AnthropicClient 인터페이스: CreateMessage(ctx, messages, tools) (*AnthropicMessage, error)
//   - ToolRegistry 인터페이스: Execute(ctx, toolName, input) (string, error) + ListTools() []ToolDef
//   - StopReason = "end_turn" 시 루프 종료, TextContent 반환
//   - StopReason = "tool_use" 시 도구 실행 후 tool_result를 대화 이력에 추가하고 재호출
//   - MaxIterations(10) 초과 시 ErrMaxIterationsReached 반환
//   - 도구 실행 실패 시 is_error=true 를 AI에 전달, AI의 대체 응답으로 계속 진행
//   - API 에러(컨텍스트 타임아웃 포함) 시 에러 즉시 반환

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"
	"unicode/utf8"
)

// ── Mock helpers ──────────────────────────────────────────────────────────────

// mockAnthropicClient returns pre-defined AnthropicMessage responses in sequence.
type mockAnthropicClient struct {
	responses []*AnthropicMessage
	callIndex int
	err       error
}

func (m *mockAnthropicClient) CreateMessage(
	ctx context.Context,
	system string,
	messages []ConversationTurn,
	tools []ToolDef,
) (*AnthropicMessage, error) {
	if m.err != nil {
		return nil, m.err
	}
	if m.callIndex >= len(m.responses) {
		return nil, fmt.Errorf("unexpected CreateMessage call #%d (only %d response(s) configured)",
			m.callIndex+1, len(m.responses))
	}
	resp := m.responses[m.callIndex]
	m.callIndex++
	return resp, nil
}

// mockToolRegistry records calls and returns pre-defined results or a fixed error.
type mockToolRegistry struct {
	results map[string]string // toolName → JSON result
	err     error
	calls   []string // ordered list of tool names that were called
}

func (m *mockToolRegistry) Execute(ctx context.Context, toolName string, input []byte) (string, error) {
	m.calls = append(m.calls, toolName)
	if m.err != nil {
		return "", m.err
	}
	if result, ok := m.results[toolName]; ok {
		return result, nil
	}
	return `"ok"`, nil
}

func (m *mockToolRegistry) ListTools() []ToolDef {
	return []ToolDef{
		{Name: "read_inbox", Description: "Read Gmail inbox"},
		{Name: "list_events", Description: "List calendar events"},
		{Name: "send_email", Description: "Send email via Gmail"},
	}
}

// ── Tests ─────────────────────────────────────────────────────────────────────

// TC-5005: Anthropic API 호출 성공 (tool_use 없음)
// 기대: StopReason = end_turn, 텍스트 결과 반환, 토큰 집계
func TestExecuteAutomation_EndTurn(t *testing.T) {
	client := &mockAnthropicClient{
		responses: []*AnthropicMessage{
			{
				StopReason:   "end_turn",
				TextContent:  "Morning briefing complete.",
				InputTokens:  100,
				OutputTokens: 50,
			},
		},
	}
	registry := &mockToolRegistry{results: map[string]string{}}

	result, err := ExecuteAutomation(context.Background(), client, registry, "", "Prepare morning briefing", registry.ListTools())
	if err != nil {
		t.Fatalf("TC-5005: unexpected error: %v", err)
	}
	if result.Output != "Morning briefing complete." {
		t.Errorf("TC-5005: output = %q, want %q", result.Output, "Morning briefing complete.")
	}
	if result.IterationCount != 1 {
		t.Errorf("TC-5005: iterationCount = %d, want 1", result.IterationCount)
	}
	if result.InputTokens != 100 {
		t.Errorf("TC-5005: inputTokens = %d, want 100", result.InputTokens)
	}
	if result.OutputTokens != 50 {
		t.Errorf("TC-5005: outputTokens = %d, want 50", result.OutputTokens)
	}
}

// TC-5006: tool_use 1회 → tool_result → end_turn
// 기대: 도구 호출 1회, 최종 텍스트 결과 반환, 총 2회 API 호출
func TestExecuteAutomation_SingleToolUse(t *testing.T) {
	client := &mockAnthropicClient{
		responses: []*AnthropicMessage{
			{
				StopReason: "tool_use",
				ToolUseBlocks: []ToolUseBlock{
					{ID: "tu_1", Name: "read_inbox", Input: []byte(`{"maxResults":10}`)},
				},
				InputTokens: 100, OutputTokens: 30,
			},
			{
				StopReason:   "end_turn",
				TextContent:  "You have 3 unread emails.",
				InputTokens:  200,
				OutputTokens: 50,
			},
		},
	}
	registry := &mockToolRegistry{
		results: map[string]string{
			"read_inbox": `[{"from":"boss@example.com","subject":"Meeting"}]`,
		},
	}

	result, err := ExecuteAutomation(context.Background(), client, registry, "", "Check my inbox", registry.ListTools())
	if err != nil {
		t.Fatalf("TC-5006: unexpected error: %v", err)
	}
	if result.Output != "You have 3 unread emails." {
		t.Errorf("TC-5006: output = %q, want %q", result.Output, "You have 3 unread emails.")
	}
	if len(registry.calls) != 1 || registry.calls[0] != "read_inbox" {
		t.Errorf("TC-5006: tool calls = %v, want [read_inbox]", registry.calls)
	}
	if result.IterationCount != 2 {
		t.Errorf("TC-5006: iterationCount = %d, want 2", result.IterationCount)
	}
}

// TC-5007: tool_use 3회 연속 → end_turn
// 기대: 3개 도구 순차 호출, 모든 결과 대화 이력에 포함, 토큰 총합 집계
func TestExecuteAutomation_MultipleToolUse(t *testing.T) {
	client := &mockAnthropicClient{
		responses: []*AnthropicMessage{
			{
				StopReason:    "tool_use",
				ToolUseBlocks: []ToolUseBlock{{ID: "tu_1", Name: "read_inbox", Input: []byte(`{}`)}},
				InputTokens: 100, OutputTokens: 30,
			},
			{
				StopReason:    "tool_use",
				ToolUseBlocks: []ToolUseBlock{{ID: "tu_2", Name: "list_events", Input: []byte(`{}`)}},
				InputTokens: 200, OutputTokens: 40,
			},
			{
				StopReason:    "tool_use",
				ToolUseBlocks: []ToolUseBlock{{ID: "tu_3", Name: "send_email", Input: []byte(`{}`)}},
				InputTokens: 300, OutputTokens: 50,
			},
			{
				StopReason:   "end_turn",
				TextContent:  "Morning briefing sent.",
				InputTokens:  400,
				OutputTokens: 60,
			},
		},
	}
	registry := &mockToolRegistry{results: map[string]string{
		"read_inbox":  `[]`,
		"list_events": `[]`,
		"send_email":  `"sent"`,
	}}

	result, err := ExecuteAutomation(context.Background(), client, registry, "", "Run morning briefing", registry.ListTools())
	if err != nil {
		t.Fatalf("TC-5007: unexpected error: %v", err)
	}
	if result.Output != "Morning briefing sent." {
		t.Errorf("TC-5007: output = %q, want %q", result.Output, "Morning briefing sent.")
	}

	expectedTools := []string{"read_inbox", "list_events", "send_email"}
	if len(registry.calls) != len(expectedTools) {
		t.Fatalf("TC-5007: tool calls count = %d, want %d", len(registry.calls), len(expectedTools))
	}
	for i, want := range expectedTools {
		if registry.calls[i] != want {
			t.Errorf("TC-5007: tool[%d] = %q, want %q", i, registry.calls[i], want)
		}
	}

	// 4회 반복의 토큰 총합 검증 (100+200+300+400=1000 input, 30+40+50+60=180 output)
	if result.InputTokens != 1000 {
		t.Errorf("TC-5007: total inputTokens = %d, want 1000", result.InputTokens)
	}
	if result.OutputTokens != 180 {
		t.Errorf("TC-5007: total outputTokens = %d, want 180", result.OutputTokens)
	}
}

// TC-5008: maxIterations(10) 도달
// 기대: ErrMaxIterationsReached 에러 반환
func TestExecuteAutomation_MaxIterationsExceeded(t *testing.T) {
	// MaxIterations+1 개의 tool_use 응답 → 제한 초과
	responses := make([]*AnthropicMessage, MaxIterations+1)
	for i := range responses {
		responses[i] = &AnthropicMessage{
			StopReason:    "tool_use",
			ToolUseBlocks: []ToolUseBlock{{ID: fmt.Sprintf("tu_%d", i+1), Name: "read_inbox", Input: []byte(`{}`)}},
			InputTokens: 100, OutputTokens: 30,
		}
	}
	client := &mockAnthropicClient{responses: responses}
	registry := &mockToolRegistry{results: map[string]string{"read_inbox": `[]`}}

	_, err := ExecuteAutomation(context.Background(), client, registry, "", "Loop forever", registry.ListTools())
	if err == nil {
		t.Fatal("TC-5008: expected error for max iterations, got nil")
	}
	if !errors.Is(err, ErrMaxIterationsReached) {
		t.Errorf("TC-5008: error = %v, want ErrMaxIterationsReached", err)
	}
}

// TC-5009: 도구 실행 중 에러 발생
// 기대: tool_result에 is_error:true 전달, AI가 대체 방안으로 end_turn 반환
func TestExecuteAutomation_ToolExecutionError(t *testing.T) {
	client := &mockAnthropicClient{
		responses: []*AnthropicMessage{
			{
				StopReason:    "tool_use",
				ToolUseBlocks: []ToolUseBlock{{ID: "tu_1", Name: "read_inbox", Input: []byte(`{}`)}},
				InputTokens: 100, OutputTokens: 30,
			},
			{
				// AI가 is_error:true 를 받고 대체 응답을 제공
				StopReason:   "end_turn",
				TextContent:  "Unable to access inbox. Please check your connection.",
				InputTokens:  150,
				OutputTokens: 40,
			},
		},
	}
	// 도구 실행 실패 설정
	registry := &mockToolRegistry{err: errors.New("OAuth token expired")}

	result, err := ExecuteAutomation(context.Background(), client, registry, "", "Check inbox", registry.ListTools())
	if err != nil {
		t.Fatalf("TC-5009: unexpected top-level error (tool error should be passed to AI, not propagated): %v", err)
	}
	if result.Output == "" {
		t.Error("TC-5009: expected non-empty output even when tool fails")
	}
	// 도구 호출 시도가 이루어졌는지 확인
	if len(registry.calls) == 0 {
		t.Error("TC-5009: expected tool to be attempted before receiving is_error result")
	}
}

// TC-5010: Anthropic API 타임아웃
// 기대: 에러 반환, context.DeadlineExceeded 래핑
func TestExecuteAutomation_APITimeout(t *testing.T) {
	client := &mockAnthropicClient{
		err: context.DeadlineExceeded,
	}
	registry := &mockToolRegistry{}

	_, err := ExecuteAutomation(context.Background(), client, registry, "", "Run briefing", registry.ListTools())
	if err == nil {
		t.Fatal("TC-5010: expected timeout error, got nil")
	}
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Errorf("TC-5010: error = %v, want context.DeadlineExceeded", err)
	}
}

// TestTruncateToolResult verifies boundary conditions and UTF-8 safety.
func TestTruncateToolResult(t *testing.T) {
	tests := []struct {
		name       string
		input      string
		wantFull   bool // expect no truncation
		wantSuffix string
	}{
		{"short string", "hello", true, ""},
		{"exactly 200 chars", strings.Repeat("a", 200), true, ""},
		{"201 chars truncated", strings.Repeat("b", 201), false, "... [truncated]"},
		{"long string", strings.Repeat("c", 500), false, "... [truncated]"},
		{"empty string", "", true, ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := truncateToolResult(tt.input)
			if tt.wantFull {
				if result != tt.input {
					t.Errorf("expected no truncation, got %q", result)
				}
			} else {
				if !strings.HasSuffix(result, tt.wantSuffix) {
					t.Errorf("expected suffix %q, got %q", tt.wantSuffix, result)
				}
				if len(result) > 200+len("... [truncated]") {
					t.Errorf("truncated result too long: %d chars", len(result))
				}
			}
		})
	}
}

// TestTruncateToolResult_UTF8 verifies multi-byte characters are not split.
func TestTruncateToolResult_UTF8(t *testing.T) {
	// Create a string with multi-byte Korean characters that would be split at byte 200
	// Each Korean char is 3 bytes. 66 chars = 198 bytes. 67th char starts at byte 198, ends at 201.
	korean := strings.Repeat("가", 67) // 201 bytes
	result := truncateToolResult(korean)
	if !strings.HasSuffix(result, "... [truncated]") {
		t.Error("expected truncation for 201-byte Korean string")
	}
	// Verify the truncated part is valid UTF-8
	prefix := strings.TrimSuffix(result, "... [truncated]")
	if !utf8.ValidString(prefix) {
		t.Errorf("truncated prefix is not valid UTF-8: %q", prefix)
	}
}

// mockAnthropicClientWithCapture captures the system parameter for assertions.
type mockAnthropicClientWithCapture struct {
	response   *AnthropicMessage
	lastSystem string
}

func (m *mockAnthropicClientWithCapture) CreateMessage(
	ctx context.Context,
	system string,
	messages []ConversationTurn,
	tools []ToolDef,
) (*AnthropicMessage, error) {
	m.lastSystem = system
	return m.response, nil
}

// TestExecuteAutomation_SystemPromptForwarded verifies system prompt reaches the API client.
func TestExecuteAutomation_SystemPromptForwarded(t *testing.T) {
	client := &mockAnthropicClientWithCapture{
		response: &AnthropicMessage{
			StopReason:   "end_turn",
			TextContent:  "done",
			InputTokens:  10,
			OutputTokens: 5,
		},
	}
	registry := &mockToolRegistry{results: map[string]string{}}
	tools := registry.ListTools()

	_, err := ExecuteAutomation(context.Background(), client, registry, "You are a test assistant.", "Do something", tools)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if client.lastSystem != "You are a test assistant." {
		t.Errorf("system = %q, want %q", client.lastSystem, "You are a test assistant.")
	}
}
