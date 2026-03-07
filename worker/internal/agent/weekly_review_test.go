package agent

// TC-4012~4014: Weekly Review E2E 테스트 (TDD Red Phase)
// US-404: 주간 리뷰 자동화
//
// 구현 요구사항:
//   - buildSystemPrompt("weekly_review"): 주간 리뷰 관련 구체적 지시 포함
//     ("weekly", "주간", "7일", "past 7 days" 등 키워드 포함)
//   - 실행 흐름: list_events(지난 7일 범위) → read_inbox(중요 이메일) → send_email(주간 요약)
//   - list_events 호출 시 start_date / end_date 파라미터로 7일 범위 지정
//
// FAILURES expected (Red phase):
//   - buildSystemPrompt("weekly_review"): 현재 default case 반환
//     → "You are a helpful AI assistant." 에 "weekly"/"주간" 없음 → TestWeeklyReview_SystemPrompt 실패

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
)

// TestWeeklyReview_SystemPrompt는 "weekly_review" 템플릿이 주간 리뷰 관련 시스템 프롬프트를 생성하는지 검증한다.
// FAIL expected (Red phase): buildSystemPrompt에 "weekly_review" case가 없어 기본값 반환.
func TestWeeklyReview_SystemPrompt(t *testing.T) {
	profile := UserProfile{
		Timezone:          "Asia/Seoul",
		PreferredLanguage: "ko",
	}

	prompt := buildSystemPrompt(profile, "weekly_review")

	// EXPECT: 주간 리뷰 관련 구체적 지시 포함 ("weekly" 또는 "주간")
	// ACTUAL: default case → "You are a helpful AI assistant." → 실패
	if !strings.Contains(prompt, "weekly") && !strings.Contains(prompt, "주간") {
		t.Errorf("TC-4012: weekly_review prompt missing weekly-specific instructions\nprompt: %q", prompt)
	}
	// EXPECT: 지난 7일 범위 언급
	// ACTUAL: default case → "7" 또는 "seven" 없음 → 실패
	if !strings.Contains(prompt, "7") && !strings.Contains(prompt, "seven") && !strings.Contains(prompt, "week") {
		t.Errorf("TC-4012: weekly_review prompt should mention 7-day range\nprompt: %q", prompt)
	}
}

// TestWeeklyReview_E2E는 Weekly Review 자동화 전체 흐름을 검증한다. (TC-4012~4014)
//
// 흐름:
//
//	TC-4012: list_events(지난 7일 캘린더) → 4개 이벤트 반환
//	TC-4013: read_inbox(중요 이메일) → 3개 이메일 반환
//	TC-4014: send_email(주간 요약 본문) → 발송 완료
func TestWeeklyReview_E2E(t *testing.T) {
	// ── 테스트 데이터 ────────────────────────────────────────────────────────
	weeklyEventsJSON := `[
		{"id": "e1", "summary": "Team Meeting", "start": "2026-03-01T10:00:00+09:00", "end": "2026-03-01T11:00:00+09:00"},
		{"id": "e2", "summary": "Product Demo", "start": "2026-03-03T14:00:00+09:00", "end": "2026-03-03T15:30:00+09:00"},
		{"id": "e3", "summary": "1:1 with Manager", "start": "2026-03-05T09:00:00+09:00", "end": "2026-03-05T09:30:00+09:00"},
		{"id": "e4", "summary": "Sprint Retrospective", "start": "2026-03-07T16:00:00+09:00", "end": "2026-03-07T17:00:00+09:00"}
	]`

	weeklyEmailsJSON := `[
		{"id": "m1", "from": "ceo@company.com", "subject": "Q1 Performance Review", "snippet": "Please review attached Q1 metrics."},
		{"id": "m2", "from": "client@bigcorp.com", "subject": "Project Approval", "snippet": "We approve your proposal."},
		{"id": "m3", "from": "team@company.com", "subject": "Sprint 7 Kickoff", "snippet": "Sprint 7 starts next week."}
	]`

	var capturedListEventsInput []byte
	var capturedEmailInput []byte

	// ── 레지스트리 목 설정 ───────────────────────────────────────────────────
	registry := &integrationMockRegistry{
		handlers: map[string]func([]byte) (string, error){
			"list_events": func(input []byte) (string, error) {
				capturedListEventsInput = input
				return weeklyEventsJSON, nil
			},
			"read_inbox": func(input []byte) (string, error) {
				return weeklyEmailsJSON, nil
			},
			"send_email": func(input []byte) (string, error) {
				capturedEmailInput = input
				return `"Weekly review sent successfully"`, nil
			},
		},
	}

	// ── Anthropic 클라이언트 목: 4턴 시뮬레이션 ─────────────────────────────
	// 턴 1: list_events — 지난 7일 캘린더 조회 (TC-4012)
	// 턴 2: read_inbox — 중요 이메일 조회 (TC-4013)
	// 턴 3: send_email — 주간 요약 발송 (TC-4014)
	// 턴 4: end_turn
	weeklyEmailBody := "주간 리뷰 - 2026-03-01 ~ 2026-03-07\n\n" +
		"[이번 주 일정]\n" +
		"- 03/01 10:00 Team Meeting\n" +
		"- 03/03 14:00 Product Demo\n" +
		"- 03/05 09:00 1:1 with Manager\n" +
		"- 03/07 16:00 Sprint Retrospective\n\n" +
		"[중요 이메일]\n" +
		"- ceo@company.com: Q1 Performance Review\n" +
		"- client@bigcorp.com: Project Approval"

	sendEmailInput, _ := json.Marshal(map[string]string{
		"to":      "user@example.com",
		"subject": "Weekly Review - 2026-03-01 ~ 2026-03-07",
		"body":    weeklyEmailBody,
	})

	client := &mockAnthropicClient{
		responses: []*AnthropicMessage{
			// 턴 1: 지난 7일 캘린더 이벤트 조회 (TC-4012)
			{
				StopReason: "tool_use",
				ToolUseBlocks: []ToolUseBlock{
					{ID: "tu_1", Name: "list_events", Input: []byte(`{"start_date":"2026-03-01","end_date":"2026-03-07"}`)},
				},
				InputTokens: 150, OutputTokens: 40,
			},
			// 턴 2: 중요 이메일 조회 (TC-4013)
			{
				StopReason: "tool_use",
				ToolUseBlocks: []ToolUseBlock{
					{ID: "tu_2", Name: "read_inbox", Input: []byte(`{"query":"is:important","max_results":20}`)},
				},
				InputTokens: 300, OutputTokens: 35,
			},
			// 턴 3: 주간 요약 이메일 발송 (TC-4014)
			{
				StopReason: "tool_use",
				ToolUseBlocks: []ToolUseBlock{
					{ID: "tu_3", Name: "send_email", Input: sendEmailInput},
				},
				InputTokens: 600, OutputTokens: 250,
			},
			// 턴 4: 완료
			{
				StopReason:   "end_turn",
				TextContent:  "주간 리뷰가 user@example.com으로 발송되었습니다.",
				InputTokens:  650,
				OutputTokens: 30,
			},
		},
	}

	// ── 실행 ─────────────────────────────────────────────────────────────────
	result, err := ExecuteAutomation(
		context.Background(),
		client,
		registry,
		"지난 한 주를 정리하여 주간 리뷰를 작성하고 user@example.com으로 발송해 주세요.",
	)

	// ── TC-4012~4014 검증 ─────────────────────────────────────────────────────

	// 에러 없음
	if err != nil {
		t.Fatalf("TC-4012~4014: unexpected error: %v", err)
	}

	// 전체 도구 호출: list_events + read_inbox + send_email = 3
	if len(registry.calls) != 3 {
		t.Errorf("TC-4012~4014: tool call count = %d, want 3 (list_events, read_inbox, send_email)",
			len(registry.calls))
	}

	// TC-4012: list_events 첫 번째 호출 확인 (지난 7일 캘린더)
	if len(registry.calls) < 1 || registry.calls[0] != "list_events" {
		t.Errorf("TC-4012: 1st tool = %q, want \"list_events\"", firstOrEmpty(registry.calls, 0))
	}

	// TC-4012: list_events 입력에 날짜 범위 포함 확인
	if capturedListEventsInput != nil {
		inputStr := string(capturedListEventsInput)
		if !strings.Contains(inputStr, "2026-03") {
			t.Errorf("TC-4012: list_events input should contain date range, got: %s", inputStr)
		}
	}

	// TC-4013: read_inbox 두 번째 호출 확인 (중요 이메일)
	if len(registry.calls) < 2 || registry.calls[1] != "read_inbox" {
		t.Errorf("TC-4013: 2nd tool = %q, want \"read_inbox\"", firstOrEmpty(registry.calls, 1))
	}

	// TC-4014: send_email 세 번째 호출 확인 (주간 요약 포함)
	if len(registry.calls) < 3 || registry.calls[2] != "send_email" {
		t.Errorf("TC-4014: 3rd tool = %q, want \"send_email\"", firstOrEmpty(registry.calls, 2))
	}

	// TC-4014: 이메일 본문에 캘린더 이벤트 데이터 포함 확인
	if capturedEmailInput == nil {
		t.Fatal("TC-4014: send_email was not called or input was not captured")
	}
	emailBodyStr := string(capturedEmailInput)
	if !strings.Contains(emailBodyStr, "Team Meeting") {
		t.Errorf("TC-4014: email body missing calendar event 'Team Meeting': %q", emailBodyStr)
	}
	if !strings.Contains(emailBodyStr, "Q1 Performance Review") {
		t.Errorf("TC-4014: email body missing email summary 'Q1 Performance Review': %q", emailBodyStr)
	}

	// 최종 출력 확인
	if result.Output == "" {
		t.Error("TC-4012~4014: expected non-empty output")
	}

	// 총 반복 횟수: 4턴 (tool_use 3회 + end_turn 1회)
	if result.IterationCount != 4 {
		t.Errorf("TC-4012~4014: iterationCount = %d, want 4", result.IterationCount)
	}

	// 토큰 총합 검증 (150+300+600+650=1700 input, 40+35+250+30=355 output)
	wantInput := int64(150 + 300 + 600 + 650)
	wantOutput := int64(40 + 35 + 250 + 30)
	if result.InputTokens != wantInput {
		t.Errorf("TC-4012~4014: inputTokens = %d, want %d", result.InputTokens, wantInput)
	}
	if result.OutputTokens != wantOutput {
		t.Errorf("TC-4012~4014: outputTokens = %d, want %d", result.OutputTokens, wantOutput)
	}
}

// TestWeeklyReview_NoCalendarEvents는 한 주간 캘린더 이벤트가 없는 경우를 검증한다. (TC-4012 edge case)
// 일정이 없어도 이메일은 조회하고 요약을 발송해야 한다.
func TestWeeklyReview_NoCalendarEvents(t *testing.T) {
	registry := &integrationMockRegistry{
		handlers: map[string]func([]byte) (string, error){
			"list_events": func(input []byte) (string, error) {
				return `[]`, nil // 이번 주 일정 없음
			},
			"read_inbox": func(input []byte) (string, error) {
				return `[]`, nil
			},
			"send_email": func(input []byte) (string, error) {
				return `"sent"`, nil
			},
		},
	}

	client := &mockAnthropicClient{
		responses: []*AnthropicMessage{
			{
				StopReason: "tool_use",
				ToolUseBlocks: []ToolUseBlock{
					{ID: "tu_1", Name: "list_events", Input: []byte(`{"start_date":"2026-03-01","end_date":"2026-03-07"}`)},
				},
				InputTokens: 150, OutputTokens: 35,
			},
			{
				StopReason: "tool_use",
				ToolUseBlocks: []ToolUseBlock{
					{ID: "tu_2", Name: "read_inbox", Input: []byte(`{"query":"is:important"}`)},
				},
				InputTokens: 200, OutputTokens: 25,
			},
			{
				StopReason: "tool_use",
				ToolUseBlocks: []ToolUseBlock{
					{ID: "tu_3", Name: "send_email", Input: []byte(`{"to":"user@example.com","subject":"Weekly Review","body":"이번 주 등록된 일정과 중요 이메일이 없습니다."}`)},
				},
				InputTokens: 300, OutputTokens: 80,
			},
			{
				StopReason:   "end_turn",
				TextContent:  "이번 주는 등록된 일정이 없었습니다. 주간 리뷰가 발송되었습니다.",
				InputTokens:  350,
				OutputTokens: 30,
			},
		},
	}

	result, err := ExecuteAutomation(
		context.Background(),
		client,
		registry,
		"이번 주 활동을 정리하여 주간 리뷰를 작성해 주세요.",
	)

	// TC-4012 edge: 에러 없음 (일정 없어도 정상 처리)
	if err != nil {
		t.Fatalf("TC-4012 (no events): unexpected error: %v", err)
	}
	if result.Output == "" {
		t.Error("TC-4012 (no events): expected non-empty output even with no events")
	}

	// list_events 첫 번째로 호출되어야 함
	if len(registry.calls) < 1 || registry.calls[0] != "list_events" {
		t.Errorf("TC-4012 (no events): expected list_events to be called first, calls: %v", registry.calls)
	}
}
