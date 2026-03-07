package agent

// TC-4015~4017: Smart Save E2E 테스트 (TDD Red Phase)
// US-405: 스마트 자동 저장 자동화
//
// 구현 요구사항:
//   - buildSystemPrompt("smart_save"): 자동 저장 관련 구체적 지시 포함
//     ("save", "저장", "Notion" 등 키워드 포함)
//   - TC-4015: read_inbox(keyword query) → 키워드로 이메일 필터링
//   - TC-4016: fetch_headlines(category) → 관심 분야 뉴스 기사 수집
//   - TC-4017: create_notion_page(title, content) → 수집된 콘텐츠 Notion 저장
//
// FAILURES expected (Red phase):
//   - buildSystemPrompt("smart_save"): 현재 default case 반환
//     → "You are a helpful AI assistant." 에 "save"/"저장"/"Notion" 없음 → TestSmartSave_SystemPrompt 실패

import (
	"context"
	"strings"
	"testing"
)

// TestSmartSave_SystemPrompt는 "smart_save" 템플릿이 저장 관련 시스템 프롬프트를 생성하는지 검증한다.
// FAIL expected (Red phase): buildSystemPrompt에 "smart_save" case가 없어 기본값 반환.
func TestSmartSave_SystemPrompt(t *testing.T) {
	profile := UserProfile{
		Timezone:          "Asia/Seoul",
		PreferredLanguage: "ko",
	}

	prompt := buildSystemPrompt(profile, "smart_save")

	// EXPECT: 자동 저장 관련 구체적 지시 포함 ("save" 또는 "저장")
	// ACTUAL: default case → "You are a helpful AI assistant." → 실패
	if !strings.Contains(prompt, "save") && !strings.Contains(prompt, "저장") {
		t.Errorf("TC-4015: smart_save prompt missing save-specific instructions\nprompt: %q", prompt)
	}
	// EXPECT: Notion 저장 대상 언급
	// ACTUAL: default case → "Notion" 없음 → 실패
	if !strings.Contains(prompt, "Notion") && !strings.Contains(prompt, "notion") {
		t.Errorf("TC-4015: smart_save prompt should mention Notion as target storage\nprompt: %q", prompt)
	}
}

// TestSmartSave_FiltersEmailsByKeyword는 Smart Save가 키워드로 이메일을 필터링하고 Notion에 저장하는지 검증한다. (TC-4015, TC-4017)
func TestSmartSave_FiltersEmailsByKeyword(t *testing.T) {
	// ── 테스트 데이터 ────────────────────────────────────────────────────────
	filteredEmailsJSON := `[
		{"id": "m1", "from": "partner@startup.io", "subject": "AI Partnership Proposal", "snippet": "Let us discuss AI collaboration opportunities."},
		{"id": "m2", "from": "research@openai.com", "subject": "AI Research Update", "snippet": "Latest findings in LLM development."}
	]`

	var capturedReadInboxInput []byte
	var capturedNotionInput []byte

	// ── 레지스트리 목 설정 ───────────────────────────────────────────────────
	registry := &integrationMockRegistry{
		handlers: map[string]func([]byte) (string, error){
			"read_inbox": func(input []byte) (string, error) {
				capturedReadInboxInput = input
				return filteredEmailsJSON, nil
			},
			"create_notion_page": func(input []byte) (string, error) {
				capturedNotionInput = input
				return `{"id":"page-emails-001","title":"AI Emails","url":"https://notion.so/page-emails-001"}`, nil
			},
		},
	}

	// ── Anthropic 클라이언트 목: 3턴 시뮬레이션 ─────────────────────────────
	// 턴 1: read_inbox — 키워드 "AI" 필터링 (TC-4015)
	// 턴 2: create_notion_page — 필터링된 이메일 저장 (TC-4017)
	// 턴 3: end_turn
	client := &mockAnthropicClient{
		responses: []*AnthropicMessage{
			// 턴 1: 키워드 "AI"로 이메일 검색 (TC-4015)
			{
				StopReason: "tool_use",
				ToolUseBlocks: []ToolUseBlock{
					{ID: "tu_1", Name: "read_inbox", Input: []byte(`{"query":"AI","max_results":10}`)},
				},
				InputTokens: 120, OutputTokens: 30,
			},
			// 턴 2: 필터링된 이메일을 Notion에 저장 (TC-4017)
			{
				StopReason: "tool_use",
				ToolUseBlocks: []ToolUseBlock{
					{ID: "tu_2", Name: "create_notion_page", Input: []byte(`{"database_id":"db-smart-save","title":"AI Emails - 2026-03-07","content":"AI Partnership Proposal\nAI Research Update"}`)},
				},
				InputTokens: 400, OutputTokens: 150,
			},
			// 턴 3: 완료
			{
				StopReason:   "end_turn",
				TextContent:  "AI 관련 이메일 2개가 Notion에 저장되었습니다. (https://notion.so/page-emails-001)",
				InputTokens:  450,
				OutputTokens: 30,
			},
		},
	}

	// ── 실행 ─────────────────────────────────────────────────────────────────
	result, err := ExecuteAutomation(
		context.Background(),
		client,
		registry,
		"AI 관련 이메일을 찾아서 Notion 데이터베이스(db-smart-save)에 저장해 주세요.",
	)

	// ── TC-4015, TC-4017 검증 ─────────────────────────────────────────────────

	// 에러 없음
	if err != nil {
		t.Fatalf("TC-4015: unexpected error: %v", err)
	}

	// TC-4015: read_inbox 첫 번째 호출 확인
	if len(registry.calls) < 1 || registry.calls[0] != "read_inbox" {
		t.Errorf("TC-4015: 1st tool = %q, want \"read_inbox\"", firstOrEmpty(registry.calls, 0))
	}

	// TC-4015: read_inbox 입력에 키워드 필터 포함 확인
	if capturedReadInboxInput != nil {
		inputStr := string(capturedReadInboxInput)
		if !strings.Contains(inputStr, "AI") {
			t.Errorf("TC-4015: read_inbox input should contain keyword filter 'AI', got: %s", inputStr)
		}
	}

	// TC-4017: create_notion_page 호출 확인
	notionCalled := false
	for _, call := range registry.calls {
		if call == "create_notion_page" {
			notionCalled = true
			break
		}
	}
	if !notionCalled {
		t.Errorf("TC-4017: create_notion_page was not called, calls: %v", registry.calls)
	}

	// TC-4017: Notion 페이지에 필터링된 이메일 내용 포함 확인
	if capturedNotionInput != nil {
		notionStr := string(capturedNotionInput)
		if !strings.Contains(notionStr, "AI Partnership") && !strings.Contains(notionStr, "AI Research") {
			t.Errorf("TC-4017: Notion page content missing filtered email subject, got: %s", notionStr)
		}
	}

	// 최종 결과에 Notion URL 포함 확인
	if !strings.Contains(result.Output, "notion.so") && !strings.Contains(result.Output, "Notion") {
		t.Errorf("TC-4017: output should reference Notion save result, got: %q", result.Output)
	}
}

// TestSmartSave_FetchesNewsAndSavesToNotion는 Smart Save가 뉴스를 수집하고 Notion에 저장하는지 검증한다. (TC-4016, TC-4017)
func TestSmartSave_FetchesNewsAndSavesToNotion(t *testing.T) {
	// ── 테스트 데이터 ────────────────────────────────────────────────────────
	newsJSON := `[
		{"title": "GPT-5 Released by OpenAI", "description": "OpenAI announces next generation model.", "url": "https://openai.com/gpt5", "source": "OpenAI Blog", "published_at": "2026-03-07T10:00:00Z"},
		{"title": "Claude 4 Surpasses Human Benchmarks", "description": "Anthropic's Claude 4 sets new records.", "url": "https://anthropic.com/claude4", "source": "Anthropic", "published_at": "2026-03-07T09:00:00Z"}
	]`

	notionPageJSON := `{"id": "page-news-001", "title": "AI News Digest - 2026-03-07", "url": "https://notion.so/page-news-001"}`

	var capturedFetchInput []byte
	var capturedNotionInput []byte

	// ── 레지스트리 목 설정 ───────────────────────────────────────────────────
	registry := &integrationMockRegistry{
		handlers: map[string]func([]byte) (string, error){
			"fetch_headlines": func(input []byte) (string, error) {
				capturedFetchInput = input
				return newsJSON, nil
			},
			"create_notion_page": func(input []byte) (string, error) {
				capturedNotionInput = input
				return notionPageJSON, nil
			},
		},
	}

	// ── Anthropic 클라이언트 목: 3턴 시뮬레이션 ─────────────────────────────
	// 턴 1: fetch_headlines — AI/기술 뉴스 수집 (TC-4016)
	// 턴 2: create_notion_page — 수집된 기사 요약 저장 (TC-4017)
	// 턴 3: end_turn
	client := &mockAnthropicClient{
		responses: []*AnthropicMessage{
			// 턴 1: AI/기술 뉴스 수집 (TC-4016)
			{
				StopReason: "tool_use",
				ToolUseBlocks: []ToolUseBlock{
					{ID: "tu_1", Name: "fetch_headlines", Input: []byte(`{"category":"technology","page_size":5}`)},
				},
				InputTokens: 130, OutputTokens: 35,
			},
			// 턴 2: 수집된 기사를 Notion에 저장 (TC-4017)
			{
				StopReason: "tool_use",
				ToolUseBlocks: []ToolUseBlock{
					{ID: "tu_2", Name: "create_notion_page", Input: []byte(`{"database_id":"db-news","title":"AI News Digest - 2026-03-07","content":"GPT-5 Released by OpenAI\nClaude 4 Surpasses Human Benchmarks"}`)},
				},
				InputTokens: 450, OutputTokens: 180,
			},
			// 턴 3: 완료
			{
				StopReason:   "end_turn",
				TextContent:  "오늘의 AI 뉴스 2건이 Notion에 저장되었습니다. (https://notion.so/page-news-001)",
				InputTokens:  500,
				OutputTokens: 35,
			},
		},
	}

	// ── 실행 ─────────────────────────────────────────────────────────────────
	result, err := ExecuteAutomation(
		context.Background(),
		client,
		registry,
		"오늘의 AI/기술 뉴스를 수집하여 Notion 데이터베이스(db-news)에 저장해 주세요.",
	)

	// ── TC-4016~4017 검증 ─────────────────────────────────────────────────────

	// 에러 없음
	if err != nil {
		t.Fatalf("TC-4016~4017: unexpected error: %v", err)
	}

	// 전체 도구 호출 횟수: fetch_headlines + create_notion_page = 2
	if len(registry.calls) != 2 {
		t.Errorf("TC-4016~4017: tool call count = %d, want 2 (fetch_headlines, create_notion_page)",
			len(registry.calls))
	}

	// TC-4016: fetch_headlines 첫 번째 호출 확인
	if len(registry.calls) < 1 || registry.calls[0] != "fetch_headlines" {
		t.Errorf("TC-4016: 1st tool = %q, want \"fetch_headlines\"", firstOrEmpty(registry.calls, 0))
	}

	// TC-4016: fetch_headlines 입력에 카테고리 파라미터 포함 확인
	if capturedFetchInput != nil {
		if !strings.Contains(string(capturedFetchInput), "technology") {
			t.Errorf("TC-4016: fetch_headlines input should contain category 'technology', got: %s", capturedFetchInput)
		}
	}

	// TC-4017: create_notion_page 두 번째 호출 확인
	if len(registry.calls) < 2 || registry.calls[1] != "create_notion_page" {
		t.Errorf("TC-4017: 2nd tool = %q, want \"create_notion_page\"", firstOrEmpty(registry.calls, 1))
	}

	// TC-4017: Notion 페이지 내용에 수집된 기사 제목 포함 확인
	if capturedNotionInput == nil {
		t.Fatal("TC-4017: create_notion_page was not called or input was not captured")
	}
	notionStr := string(capturedNotionInput)
	if !strings.Contains(notionStr, "GPT-5") {
		t.Errorf("TC-4017: Notion page content missing article 'GPT-5', got: %s", notionStr)
	}

	// 최종 결과에 Notion URL 포함 확인
	if !strings.Contains(result.Output, "notion.so") && !strings.Contains(result.Output, "Notion") {
		t.Errorf("TC-4017: output should reference Notion save result, got: %q", result.Output)
	}

	// 반복 횟수: 3턴 (tool_use 2회 + end_turn 1회)
	if result.IterationCount != 3 {
		t.Errorf("TC-4016~4017: iterationCount = %d, want 3", result.IterationCount)
	}

	// 토큰 총합 검증 (130+450+500=1080 input, 35+180+35=250 output)
	wantInput := int64(130 + 450 + 500)
	wantOutput := int64(35 + 180 + 35)
	if result.InputTokens != wantInput {
		t.Errorf("TC-4016~4017: inputTokens = %d, want %d", result.InputTokens, wantInput)
	}
	if result.OutputTokens != wantOutput {
		t.Errorf("TC-4016~4017: outputTokens = %d, want %d", result.OutputTokens, wantOutput)
	}
}

// TestSmartSave_SavesEmailsToNotion는 뉴스레터 이메일을 Notion에 저장하는 흐름을 검증한다. (TC-4017 추가)
func TestSmartSave_SavesEmailsToNotion(t *testing.T) {
	emailsJSON := `[
		{"id": "m1", "from": "newsletter@ai-weekly.com", "subject": "AI Weekly #42", "snippet": "Top AI stories this week."},
		{"id": "m2", "from": "research@deepmind.com", "subject": "Gemini Ultra Research", "snippet": "New research on multimodal AI."}
	]`

	var capturedNotionInput []byte

	registry := &integrationMockRegistry{
		handlers: map[string]func([]byte) (string, error){
			"read_inbox": func(input []byte) (string, error) {
				return emailsJSON, nil
			},
			"create_notion_page": func(input []byte) (string, error) {
				capturedNotionInput = input
				return `{"id":"page-newsletters-001","url":"https://notion.so/page-newsletters-001"}`, nil
			},
		},
	}

	client := &mockAnthropicClient{
		responses: []*AnthropicMessage{
			// 턴 1: AI 뉴스레터 이메일 검색 (TC-4015)
			{
				StopReason: "tool_use",
				ToolUseBlocks: []ToolUseBlock{
					{ID: "tu_1", Name: "read_inbox", Input: []byte(`{"query":"AI newsletter","max_results":10}`)},
				},
				InputTokens: 110, OutputTokens: 30,
			},
			// 턴 2: 이메일 내용을 Notion에 저장 (TC-4017)
			{
				StopReason: "tool_use",
				ToolUseBlocks: []ToolUseBlock{
					{ID: "tu_2", Name: "create_notion_page", Input: []byte(`{"database_id":"db-smart-save","title":"AI Newsletter Digest","content":"AI Weekly #42\nGemini Ultra Research"}`)},
				},
				InputTokens: 380, OutputTokens: 160,
			},
			// 턴 3: 완료
			{
				StopReason:   "end_turn",
				TextContent:  "AI 뉴스레터 2개가 Notion에 저장되었습니다.",
				InputTokens:  420,
				OutputTokens: 25,
			},
		},
	}

	result, err := ExecuteAutomation(
		context.Background(),
		client,
		registry,
		"AI 관련 뉴스레터를 Notion(db-smart-save)에 저장해 주세요.",
	)

	// TC-4017: 에러 없음
	if err != nil {
		t.Fatalf("TC-4017: unexpected error: %v", err)
	}

	// TC-4017: create_notion_page 호출 및 뉴스레터 내용 포함 확인
	if capturedNotionInput == nil {
		t.Fatal("TC-4017: create_notion_page was not called")
	}
	notionStr := string(capturedNotionInput)
	if !strings.Contains(notionStr, "AI Weekly") {
		t.Errorf("TC-4017: Notion page should contain email content 'AI Weekly', got: %s", notionStr)
	}

	if result.Output == "" {
		t.Error("TC-4017: expected non-empty output")
	}
}

// TC-4015: Notion 미연결 상태에서 Smart Save 실행 → 에러 반환
//
// 수락 기준: "Notion 미연결 상태에서 Smart Save 실행 → 실패 로그 + 'Notion 연결 필요' 안내"
//
// NOTE: ExecuteSmartSave는 아직 구현되지 않은 함수입니다.
// 이 테스트는 실제 ExecuteSmartSave 구현이 추가될 때 활성화됩니다 (현재 컴파일 에러로 비활성화).
// 구현 요구사항:
//   - ExecuteSmartSave(profile UserProfile, registry ToolRegistry, webhookData string) (*ExecutionResult, error)
//   - Notion 도구(create_notion_page)가 레지스트리에 없을 경우 에러 반환
//   - 에러 메시지에 "Notion" 포함
//   - ExecutionResult.Status = "failed" (또는 err != nil)
//
// func TestSmartSave_NotionDisconnected_ReturnsError(t *testing.T) {
// 	profile := UserProfile{
// 		Timezone:          "Asia/Seoul",
// 		PreferredLanguage: "ko",
// 	}
//
// 	// create_notion_page 도구가 없는 레지스트리 — Notion 미연결 상태 시뮬레이션
// 	registry := &integrationMockRegistry{
// 		handlers: map[string]func([]byte) (string, error){
// 			"read_inbox":      func(input []byte) (string, error) { return "[]", nil },
// 			"fetch_headlines": func(input []byte) (string, error) { return "[]", nil },
// 			// create_notion_page 의도적으로 미등록
// 		},
// 	}
//
// 	result, err := ExecuteSmartSave(profile, registry, "webhook-data")
//
// 	// TC-4015: Notion 미연결 시 에러 반환 기대
// 	if err == nil {
// 		t.Error("TC-4015: Expected error when Notion is disconnected, got nil")
// 	}
// 	if err != nil && !strings.Contains(err.Error(), "Notion") {
// 		t.Errorf("TC-4015: Error should mention Notion: %v", err)
// 	}
// 	if result != nil && result.Status != "failed" {
// 		t.Errorf("TC-4015: Status = %s, want 'failed'", result.Status)
// 	}
// }
