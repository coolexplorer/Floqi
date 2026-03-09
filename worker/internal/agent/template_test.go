package agent

// TC-4001~4008: Morning Briefing 및 Email Triage 통합 테스트
//
// Morning Briefing (US-401):
//   TC-4001: calendar_list_events_today 호출 확인
//   TC-4002: gmail_list_recent_emails 호출 확인
//   TC-4003: weather_current 호출 확인
//   TC-4004: 모든 도구 결과 종합 → send_email 호출 (이메일 본문에 요약 포함)
//   TC-4005: Google 미연결 → tool_use 실패 → 에러 결과 반환
//
// Email Triage (US-402):
//   TC-4006: gmail_list_recent_emails(query: "is:unread") 호출 확인
//   TC-4007: AI가 긴급/중요/참고로 분류 → result_summary 포함
//   TC-4008: 미읽은 이메일 0개 → "새로운 이메일이 없습니다" 결과

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
)

// integrationMockRegistry는 각 도구별 핸들러 함수를 통해 입력을 캡처하는 레지스트리 목.
// executor_test.go의 mockToolRegistry와 달리 도구별 커스텀 핸들러를 지원한다.
type integrationMockRegistry struct {
	handlers map[string]func([]byte) (string, error)
	calls    []string
	inputs   map[string][]byte
}

func (m *integrationMockRegistry) Execute(ctx context.Context, toolName string, input []byte) (string, error) {
	m.calls = append(m.calls, toolName)
	if m.inputs == nil {
		m.inputs = make(map[string][]byte)
	}
	m.inputs[toolName] = input

	if fn, ok := m.handlers[toolName]; ok {
		return fn(input)
	}
	return `"ok"`, nil
}

func (m *integrationMockRegistry) ListTools() []ToolDef {
	return []ToolDef{
		{Name: "read_inbox", Description: "Read Gmail inbox messages. Params: max_results (int), query (string)."},
		{Name: "list_events", Description: "List Google Calendar events for today. Params: date (string, YYYY-MM-DD)."},
		{Name: "get_weather", Description: "Get current weather data for a location. Params: location (string)."},
		{Name: "send_email", Description: "Send an email via Gmail. Params: to (string), subject (string), body (string)."},
		{Name: "fetch_headlines", Description: "Fetch top news headlines by category. Params: category (string), page_size (int)."},
		{Name: "create_notion_page", Description: "Create a new page in a Notion database. Params: database_id (string), title (string), content (string)."},
	}
}

// ── TC-4001~4004: Morning Briefing E2E ────────────────────────────────────────

// TestMorningBriefing_E2E는 Morning Briefing 자동화 전체 흐름을 검증한다.
// AI가 inbox → calendar → weather → send_email 순서로 도구를 호출하고,
// 최종 이메일 본문에 수집한 데이터 요약이 포함되는지 확인한다.
func TestMorningBriefing_E2E(t *testing.T) {
	// ── 테스트 데이터 ────────────────────────────────────────────────────────
	inboxJSON := `[
		{"id": "1", "from": "boss@company.com", "subject": "Q4 Review", "snippet": "Please prepare Q4 report by Friday.", "date": "2026-03-06"},
		{"id": "2", "from": "client@acme.com", "subject": "Contract Renewal", "snippet": "Let's discuss contract terms.", "date": "2026-03-06"}
	]`

	calendarJSON := `[
		{"id": "e1", "summary": "Team Standup", "start": "2026-03-06T09:00:00+09:00", "end": "2026-03-06T09:30:00+09:00"},
		{"id": "e2", "summary": "Product Review", "start": "2026-03-06T14:00:00+09:00", "end": "2026-03-06T15:00:00+09:00"}
	]`

	weatherJSON := `{"location": "Seoul", "temp": 15, "condition": "Partly Cloudy", "humidity": 60}`

	// send_email 입력 캡처용
	var capturedEmailInput []byte

	// ── 레지스트리 목 설정 ───────────────────────────────────────────────────
	registry := &integrationMockRegistry{
		handlers: map[string]func([]byte) (string, error){
			"read_inbox": func(input []byte) (string, error) {
				return inboxJSON, nil
			},
			"list_events": func(input []byte) (string, error) {
				return calendarJSON, nil
			},
			"get_weather": func(input []byte) (string, error) {
				return weatherJSON, nil
			},
			"send_email": func(input []byte) (string, error) {
				capturedEmailInput = input
				return `"Email sent successfully"`, nil
			},
		},
	}

	// ── Anthropic 클라이언트 목: 5턴 시뮬레이션 ─────────────────────────────
	// 턴 1: read_inbox 호출
	// 턴 2: list_events 호출
	// 턴 3: get_weather 호출
	// 턴 4: send_email 호출 (본문에 수집된 데이터 요약 포함)
	// 턴 5: end_turn
	emailBody := "Good morning! Here is your daily briefing:\n\n" +
		"[Emails]\n- boss@company.com: Q4 Review - Please prepare Q4 report by Friday.\n" +
		"- client@acme.com: Contract Renewal\n\n" +
		"[Calendar]\n- 09:00 Team Standup\n- 14:00 Product Review\n\n" +
		"[Weather]\nSeoul: 15°C, Partly Cloudy, Humidity 60%"

	sendEmailInput, _ := json.Marshal(map[string]string{
		"to":      "user@example.com",
		"subject": "Morning Briefing - 2026-03-06",
		"body":    emailBody,
	})

	client := &mockAnthropicClient{
		responses: []*AnthropicMessage{
			// 턴 1: inbox 조회
			{
				StopReason: "tool_use",
				ToolUseBlocks: []ToolUseBlock{
					{ID: "tu_1", Name: "read_inbox", Input: []byte(`{"max_results": 5}`)},
				},
				InputTokens:  120,
				OutputTokens: 40,
			},
			// 턴 2: 캘린더 조회
			{
				StopReason: "tool_use",
				ToolUseBlocks: []ToolUseBlock{
					{ID: "tu_2", Name: "list_events", Input: []byte(`{"date": "2026-03-06"}`)},
				},
				InputTokens:  250,
				OutputTokens: 35,
			},
			// 턴 3: 날씨 조회
			{
				StopReason: "tool_use",
				ToolUseBlocks: []ToolUseBlock{
					{ID: "tu_3", Name: "get_weather", Input: []byte(`{"location": "Seoul"}`)},
				},
				InputTokens:  380,
				OutputTokens: 30,
			},
			// 턴 4: 이메일 발송 (수집한 데이터 요약 포함)
			{
				StopReason: "tool_use",
				ToolUseBlocks: []ToolUseBlock{
					{ID: "tu_4", Name: "send_email", Input: sendEmailInput},
				},
				InputTokens:  500,
				OutputTokens: 200,
			},
			// 턴 5: 완료
			{
				StopReason:   "end_turn",
				TextContent:  "Morning briefing sent successfully to user@example.com.",
				InputTokens:  550,
				OutputTokens: 30,
			},
		},
	}

	// ── 실행 ─────────────────────────────────────────────────────────────────
	result, err := ExecuteAutomation(
		context.Background(),
		client,
		registry,
		"",
		"Good morning! Please prepare my morning briefing and send it to user@example.com.",
		registry.ListTools(),
	)

	// ── TC-4001~4004 검증 ─────────────────────────────────────────────────────

	// 에러 없음
	if err != nil {
		t.Fatalf("TC-4001~4004: unexpected error: %v", err)
	}

	// 전체 도구 호출 횟수: read_inbox, list_events, get_weather, send_email
	if len(registry.calls) != 4 {
		t.Errorf("TC-4001~4004: tool call count = %d, want 4 (read_inbox, list_events, get_weather, send_email)",
			len(registry.calls))
	}

	// TC-4002: gmail_list_recent_emails 호출 확인
	if len(registry.calls) < 1 || registry.calls[0] != "read_inbox" {
		t.Errorf("TC-4002: 1st tool = %q, want \"read_inbox\"", firstOrEmpty(registry.calls, 0))
	}

	// TC-4001: calendar_list_events_today 호출 확인
	if len(registry.calls) < 2 || registry.calls[1] != "list_events" {
		t.Errorf("TC-4001: 2nd tool = %q, want \"list_events\"", firstOrEmpty(registry.calls, 1))
	}

	// TC-4003: weather_current 호출 확인
	if len(registry.calls) < 3 || registry.calls[2] != "get_weather" {
		t.Errorf("TC-4003: 3rd tool = %q, want \"get_weather\"", firstOrEmpty(registry.calls, 2))
	}

	// TC-4004: send_email 호출 확인 및 이메일 본문 내용 검증
	if len(registry.calls) < 4 || registry.calls[3] != "send_email" {
		t.Errorf("TC-4004: 4th tool = %q, want \"send_email\"", firstOrEmpty(registry.calls, 3))
	}

	// send_email 입력이 캡처되었는지 확인
	if capturedEmailInput == nil {
		t.Fatal("TC-4004: send_email was not called or input was not captured")
	}

	// 이메일 본문에 inbox, calendar, weather 데이터가 포함되어 있는지 확인
	emailBodyStr := string(capturedEmailInput)
	if !strings.Contains(emailBodyStr, "Q4 Review") {
		t.Errorf("TC-4004: email body missing inbox data: %q", emailBodyStr)
	}
	if !strings.Contains(emailBodyStr, "Team Standup") {
		t.Errorf("TC-4004: email body missing calendar data: %q", emailBodyStr)
	}
	if !strings.Contains(emailBodyStr, "15") {
		t.Errorf("TC-4004: email body missing weather data: %q", emailBodyStr)
	}

	// 최종 출력 확인
	if result.Output == "" {
		t.Error("TC-4001~4004: expected non-empty output")
	}

	// 총 반복 횟수: 5턴 (tool_use 4회 + end_turn 1회)
	if result.IterationCount != 5 {
		t.Errorf("TC-4001~4004: iterationCount = %d, want 5", result.IterationCount)
	}

	// 토큰 총합 검증
	wantInput := int64(120 + 250 + 380 + 500 + 550)
	wantOutput := int64(40 + 35 + 30 + 200 + 30)
	if result.InputTokens != wantInput {
		t.Errorf("TC-4001~4004: inputTokens = %d, want %d", result.InputTokens, wantInput)
	}
	if result.OutputTokens != wantOutput {
		t.Errorf("TC-4001~4004: outputTokens = %d, want %d", result.OutputTokens, wantOutput)
	}
}

// TestMorningBriefing_GoogleDisconnected는 Google 연결이 끊긴 경우
// tool_use 실패가 AI에 전달되고 에러 결과를 반환하는지 검증한다. (TC-4005)
func TestMorningBriefing_GoogleDisconnected(t *testing.T) {
	// 모든 도구가 OAuth 오류를 반환하는 레지스트리
	registry := &integrationMockRegistry{
		handlers: map[string]func([]byte) (string, error){
			"read_inbox": func(input []byte) (string, error) {
				return "", &toolError{"OAuth token expired: Google 재연결이 필요합니다"}
			},
		},
	}

	// AI는 tool 에러를 받고 에러 메시지를 반환
	client := &mockAnthropicClient{
		responses: []*AnthropicMessage{
			{
				StopReason: "tool_use",
				ToolUseBlocks: []ToolUseBlock{
					{ID: "tu_1", Name: "read_inbox", Input: []byte(`{"max_results": 5}`)},
				},
				InputTokens: 100, OutputTokens: 30,
			},
			{
				// AI가 is_error:true를 받고 대체 응답 반환
				StopReason:   "end_turn",
				TextContent:  "Google 서비스 연결이 필요합니다. 설정에서 Google 계정을 재연결해 주세요.",
				InputTokens:  150,
				OutputTokens: 40,
			},
		},
	}

	result, err := ExecuteAutomation(
		context.Background(),
		client,
		registry,
		"",
		"Good morning! Please prepare my morning briefing.",
		registry.ListTools(),
	)

	// TC-4005: 최상위 에러 없음 (tool 에러는 AI에게 전달되어 처리됨)
	if err != nil {
		t.Fatalf("TC-4005: unexpected top-level error: %v", err)
	}

	// AI가 재연결 메시지를 반환해야 함
	if !strings.Contains(result.Output, "Google") {
		t.Errorf("TC-4005: output should mention Google reconnect, got: %q", result.Output)
	}

	// read_inbox 호출이 시도되었는지 확인
	if len(registry.calls) == 0 || registry.calls[0] != "read_inbox" {
		t.Errorf("TC-4005: expected read_inbox attempt, calls: %v", registry.calls)
	}
}

// toolError는 도구 실행 오류를 나타내는 테스트용 에러 타입.
type toolError struct{ msg string }

func (e *toolError) Error() string { return e.msg }

// ── TC-4006~4008: Email Triage E2E ───────────────────────────────────────────

// TestEmailTriage_E2E는 Email Triage 자동화 전체 흐름을 검증한다.
// AI가 미읽은 이메일을 조회하고 긴급/중요/참고로 분류하는지 확인한다. (TC-4006, TC-4007)
func TestEmailTriage_E2E(t *testing.T) {
	// 10개의 미읽은 이메일 (다양한 우선순위)
	unreadEmailsJSON := `[
		{"id": "1", "from": "ceo@company.com", "subject": "URGENT: Board Meeting Tomorrow", "snippet": "Please prepare for tomorrow 9am board meeting."},
		{"id": "2", "from": "client@bigcorp.com", "subject": "Contract Issue - Need Response", "snippet": "We need to resolve this by EOD."},
		{"id": "3", "from": "devops@internal.com", "subject": "Production Bug - P1", "snippet": "Critical bug affecting 10% of users."},
		{"id": "4", "from": "manager@company.com", "subject": "Sprint Review Feedback", "snippet": "Good work this sprint."},
		{"id": "5", "from": "hr@company.com", "subject": "Benefits Enrollment Deadline", "snippet": "Deadline is next week."},
		{"id": "6", "from": "newsletter@techcrunch.com", "subject": "Weekly Tech Roundup", "snippet": "Top stories this week..."},
		{"id": "7", "from": "team@slack.com", "subject": "New message in #general", "snippet": "Hey team, quick update."},
		{"id": "8", "from": "partner@startup.io", "subject": "Partnership Opportunity", "snippet": "We'd love to collaborate."},
		{"id": "9", "from": "billing@aws.com", "subject": "Invoice for March 2026", "snippet": "Your invoice is ready."},
		{"id": "10", "from": "noreply@newsletter.com", "subject": "Daily Digest", "snippet": "Here are today's stories."}
	]`

	// ── 레지스트리 목 ─────────────────────────────────────────────────────────
	var capturedReadInboxInput []byte
	registry := &integrationMockRegistry{
		handlers: map[string]func([]byte) (string, error){
			"read_inbox": func(input []byte) (string, error) {
				capturedReadInboxInput = input
				return unreadEmailsJSON, nil
			},
		},
	}

	// ── AI 분류 결과: 긴급 3개, 중요 4개, 참고 3개 ───────────────────────────
	classificationOutput := "이메일 트리아지 결과:\n\n" +
		"🔴 긴급 (Urgent): 3개\n" +
		"- ceo@company.com: URGENT: Board Meeting Tomorrow\n" +
		"- client@bigcorp.com: Contract Issue - Need Response\n" +
		"- devops@internal.com: Production Bug - P1\n\n" +
		"🟡 중요 (Important): 4개\n" +
		"- manager@company.com: Sprint Review Feedback\n" +
		"- hr@company.com: Benefits Enrollment Deadline\n" +
		"- partner@startup.io: Partnership Opportunity\n" +
		"- billing@aws.com: Invoice for March 2026\n\n" +
		"📌 참고 (Reference): 3개\n" +
		"- newsletter@techcrunch.com: Weekly Tech Roundup\n" +
		"- team@slack.com: New message in #general\n" +
		"- noreply@newsletter.com: Daily Digest"

	client := &mockAnthropicClient{
		responses: []*AnthropicMessage{
			// 턴 1: 미읽은 이메일 조회 (TC-4006)
			{
				StopReason: "tool_use",
				ToolUseBlocks: []ToolUseBlock{
					{ID: "tu_1", Name: "read_inbox", Input: []byte(`{"query": "is:unread", "max_results": 50}`)},
				},
				InputTokens:  100,
				OutputTokens: 35,
			},
			// 턴 2: 분류 결과 반환 (TC-4007)
			{
				StopReason:   "end_turn",
				TextContent:  classificationOutput,
				InputTokens:  600,
				OutputTokens: 250,
			},
		},
	}

	// ── 실행 ─────────────────────────────────────────────────────────────────
	result, err := ExecuteAutomation(
		context.Background(),
		client,
		registry,
		"",
		"Please triage my unread emails and classify them as Urgent, Important, or Reference.",
		registry.ListTools(),
	)

	// TC-4006: 에러 없음
	if err != nil {
		t.Fatalf("TC-4006: unexpected error: %v", err)
	}

	// TC-4006: read_inbox 단 1회 호출 확인
	if len(registry.calls) != 1 {
		t.Errorf("TC-4006: tool call count = %d, want 1", len(registry.calls))
	}
	if len(registry.calls) > 0 && registry.calls[0] != "read_inbox" {
		t.Errorf("TC-4006: tool = %q, want \"read_inbox\"", registry.calls[0])
	}

	// TC-4006: read_inbox 쿼리에 "is:unread" 포함 확인
	if capturedReadInboxInput != nil && !strings.Contains(string(capturedReadInboxInput), "unread") {
		t.Errorf("TC-4006: read_inbox input should contain unread filter, got: %s", capturedReadInboxInput)
	}

	// TC-4007: 분류 결과에 긴급/중요/참고 포함 확인
	if !strings.Contains(result.Output, "긴급") && !strings.Contains(result.Output, "Urgent") {
		t.Errorf("TC-4007: output missing urgent category: %q", result.Output)
	}
	if !strings.Contains(result.Output, "중요") && !strings.Contains(result.Output, "Important") {
		t.Errorf("TC-4007: output missing important category: %q", result.Output)
	}
	if !strings.Contains(result.Output, "참고") && !strings.Contains(result.Output, "Reference") {
		t.Errorf("TC-4007: output missing reference category: %q", result.Output)
	}

	// 반복 횟수: 2턴 (tool_use 1회 + end_turn 1회)
	if result.IterationCount != 2 {
		t.Errorf("TC-4006~4007: iterationCount = %d, want 2", result.IterationCount)
	}
}

// TestEmailTriage_EmptyInbox는 미읽은 이메일이 없는 경우를 검증한다. (TC-4008)
func TestEmailTriage_EmptyInbox(t *testing.T) {
	registry := &integrationMockRegistry{
		handlers: map[string]func([]byte) (string, error){
			"read_inbox": func(input []byte) (string, error) {
				return `[]`, nil // 빈 배열 반환
			},
		},
	}

	client := &mockAnthropicClient{
		responses: []*AnthropicMessage{
			// 턴 1: 미읽은 이메일 조회
			{
				StopReason: "tool_use",
				ToolUseBlocks: []ToolUseBlock{
					{ID: "tu_1", Name: "read_inbox", Input: []byte(`{"query": "is:unread"}`)},
				},
				InputTokens: 100, OutputTokens: 30,
			},
			// 턴 2: 빈 결과 응답
			{
				StopReason:   "end_turn",
				TextContent:  "새로운 이메일이 없습니다. 받은 편지함이 비어 있습니다.",
				InputTokens:  150,
				OutputTokens: 25,
			},
		},
	}

	result, err := ExecuteAutomation(
		context.Background(),
		client,
		registry,
		"",
		"Please triage my unread emails.",
		registry.ListTools(),
	)

	// TC-4008: 에러 없음
	if err != nil {
		t.Fatalf("TC-4008: unexpected error: %v", err)
	}

	// TC-4008: "새로운 이메일이 없습니다" 결과 확인
	if !strings.Contains(result.Output, "새로운 이메일이 없습니다") && !strings.Contains(result.Output, "no new") {
		t.Errorf("TC-4008: output should indicate empty inbox, got: %q", result.Output)
	}
}

// ── 헬퍼 함수 ────────────────────────────────────────────────────────────────

// firstOrEmpty는 슬라이스의 idx 위치 값을 반환하거나, 범위를 벗어나면 빈 문자열을 반환한다.
func firstOrEmpty(calls []string, idx int) string {
	if idx < len(calls) {
		return calls[idx]
	}
	return ""
}

// assertEmailInputContains는 send_email 입력 JSON의 body 필드에 기대 문자열이 포함되는지 검증한다.
func assertEmailInputContains(t *testing.T, input []byte, want, label string) {
	t.Helper()
	var params map[string]string
	if err := json.Unmarshal(input, &params); err != nil {
		t.Errorf("%s: failed to parse send_email input JSON: %v", label, err)
		return
	}
	body, ok := params["body"]
	if !ok {
		// body가 없는 경우 전체 입력에서 검색
		body = string(input)
	}
	if !strings.Contains(body, want) {
		t.Errorf("%s: email body missing %q, got: %q", label, want, body)
	}
}

// ── TC-4009~4011: Reading Digest E2E ─────────────────────────────────────────

// TestReadingDigest_E2E는 Reading Digest 자동화 전체 흐름을 검증한다. (TC-4009~4011)
//
// 흐름:
//   TC-4009: AI가 fetch_headlines 호출 → 뉴스 기사 수집
//   TC-4010: 수집된 기사를 바탕으로 AI 요약 생성
//   TC-4011: create_notion_page 호출 → Notion에 요약 저장 (Notion 연결된 경우)
func TestReadingDigest_E2E(t *testing.T) {
	// ── 테스트 데이터 ────────────────────────────────────────────────────────
	headlinesJSON := `[
		{"title": "AI Breakthrough in 2026", "description": "Researchers announce major AI advancement in robotics.", "url": "https://techcrunch.com/ai-breakthrough", "source": "TechCrunch", "published_at": "2026-03-06T09:00:00Z"},
		{"title": "The Future of Automation", "description": "How automation is reshaping industries worldwide.", "url": "https://wired.com/automation-future", "source": "Wired", "published_at": "2026-03-06T08:30:00Z"},
		{"title": "Go 2.0 Released", "description": "Google releases Go 2.0 with major performance improvements.", "url": "https://blog.golang.org/go2", "source": "Go Blog", "published_at": "2026-03-06T07:00:00Z"}
	]`

	notionPageJSON := `{"id": "page-abc123", "title": "Reading Digest: Tech - 2026-03-06", "url": "https://notion.so/page-abc123"}`

	// create_notion_page 입력 캡처용
	var capturedNotionInput []byte

	// ── 레지스트리 목 설정 ───────────────────────────────────────────────────
	registry := &integrationMockRegistry{
		handlers: map[string]func([]byte) (string, error){
			"fetch_headlines": func(input []byte) (string, error) {
				return headlinesJSON, nil
			},
			"create_notion_page": func(input []byte) (string, error) {
				capturedNotionInput = input
				return notionPageJSON, nil
			},
		},
	}

	// ── Anthropic 클라이언트 목: 3턴 시뮬레이션 ─────────────────────────────
	// 턴 1: fetch_headlines 호출 (TC-4009)
	// 턴 2: create_notion_page 호출 (TC-4011) — 기사 요약 본문 포함
	// 턴 3: end_turn — 최종 요약 결과 반환 (TC-4010)
	notionContent := "## Tech Reading Digest - 2026-03-06\n\n" +
		"### AI Breakthrough in 2026\n" +
		"Researchers announce major AI advancement in robotics.\n" +
		"Source: TechCrunch\n\n" +
		"### The Future of Automation\n" +
		"How automation is reshaping industries worldwide.\n" +
		"Source: Wired\n\n" +
		"### Go 2.0 Released\n" +
		"Google releases Go 2.0 with major performance improvements.\n" +
		"Source: Go Blog"

	notionInput, _ := json.Marshal(map[string]string{
		"database_id": "db-reading-digest",
		"title":       "Reading Digest: Tech - 2026-03-06",
		"content":     notionContent,
	})

	client := &mockAnthropicClient{
		responses: []*AnthropicMessage{
			// 턴 1: 뉴스 헤드라인 수집 (TC-4009)
			{
				StopReason: "tool_use",
				ToolUseBlocks: []ToolUseBlock{
					{ID: "tu_1", Name: "fetch_headlines", Input: []byte(`{"category": "technology", "page_size": 10}`)},
				},
				InputTokens:  100,
				OutputTokens: 30,
			},
			// 턴 2: Notion에 요약 저장 (TC-4011)
			{
				StopReason: "tool_use",
				ToolUseBlocks: []ToolUseBlock{
					{ID: "tu_2", Name: "create_notion_page", Input: notionInput},
				},
				InputTokens:  400,
				OutputTokens: 180,
			},
			// 턴 3: 최종 결과 반환 (TC-4010)
			{
				StopReason:  "end_turn",
				TextContent: "Reading digest 완료: 3개 기사가 요약되어 Notion에 저장되었습니다. (https://notion.so/page-abc123)",
				InputTokens: 450,
				OutputTokens: 40,
			},
		},
	}

	// ── 실행 ─────────────────────────────────────────────────────────────────
	result, err := ExecuteAutomation(
		context.Background(),
		client,
		registry,
		"",
		"Please collect today's top technology news, summarize them, and save the digest to my Notion database (db-reading-digest).",
		registry.ListTools(),
	)

	// ── TC-4009~4011 검증 ─────────────────────────────────────────────────────

	// 에러 없음
	if err != nil {
		t.Fatalf("TC-4009~4011: unexpected error: %v", err)
	}

	// 전체 도구 호출 횟수: fetch_headlines + create_notion_page = 2
	if len(registry.calls) != 2 {
		t.Errorf("TC-4009~4011: tool call count = %d, want 2 (fetch_headlines, create_notion_page)",
			len(registry.calls))
	}

	// TC-4009: fetch_headlines 호출 확인
	if len(registry.calls) < 1 || registry.calls[0] != "fetch_headlines" {
		t.Errorf("TC-4009: 1st tool = %q, want \"fetch_headlines\"", firstOrEmpty(registry.calls, 0))
	}

	// TC-4009: fetch_headlines 입력에 category 파라미터 포함 확인
	if fetchInput, ok := registry.inputs["fetch_headlines"]; ok {
		if !strings.Contains(string(fetchInput), "technology") {
			t.Errorf("TC-4009: fetch_headlines input should contain category=technology, got: %s", fetchInput)
		}
	}

	// TC-4011: create_notion_page 호출 확인
	if len(registry.calls) < 2 || registry.calls[1] != "create_notion_page" {
		t.Errorf("TC-4011: 2nd tool = %q, want \"create_notion_page\"", firstOrEmpty(registry.calls, 1))
	}

	// TC-4011: create_notion_page 입력에 수집된 기사 제목 포함 확인
	if capturedNotionInput == nil {
		t.Fatal("TC-4011: create_notion_page was not called or input was not captured")
	}
	notionInputStr := string(capturedNotionInput)
	if !strings.Contains(notionInputStr, "AI Breakthrough") {
		t.Errorf("TC-4011: Notion page content missing article title 'AI Breakthrough', got: %s", notionInputStr)
	}

	// TC-4010: 최종 결과에 Notion URL 또는 완료 메시지 포함 확인
	if result.Output == "" {
		t.Error("TC-4010: expected non-empty output with summary")
	}
	if !strings.Contains(result.Output, "notion.so") && !strings.Contains(result.Output, "Notion") {
		t.Errorf("TC-4010: output should reference Notion save result, got: %q", result.Output)
	}

	// 반복 횟수: 3턴 (tool_use 2회 + end_turn 1회)
	if result.IterationCount != 3 {
		t.Errorf("TC-4009~4011: iterationCount = %d, want 3", result.IterationCount)
	}

	// 토큰 총합 검증
	wantInput := int64(100 + 400 + 450)
	wantOutput := int64(30 + 180 + 40)
	if result.InputTokens != wantInput {
		t.Errorf("TC-4009~4011: inputTokens = %d, want %d", result.InputTokens, wantInput)
	}
	if result.OutputTokens != wantOutput {
		t.Errorf("TC-4009~4011: outputTokens = %d, want %d", result.OutputTokens, wantOutput)
	}
}

// TestReadingDigest_NoNotion는 Notion이 연결되지 않은 경우
// AI가 create_notion_page 오류를 받고 대체 응답을 반환하는지 검증한다. (TC-4011 edge case)
func TestReadingDigest_NoNotion(t *testing.T) {
	headlinesJSON := `[
		{"title": "Tech News Today", "description": "Latest in technology.", "url": "https://example.com", "source": "TechNews", "published_at": "2026-03-06T09:00:00Z"}
	]`

	registry := &integrationMockRegistry{
		handlers: map[string]func([]byte) (string, error){
			"fetch_headlines": func(input []byte) (string, error) {
				return headlinesJSON, nil
			},
			"create_notion_page": func(input []byte) (string, error) {
				// Notion 미연결 → 에러 반환
				return "", &toolError{"Notion integration not connected: please connect Notion in Settings"}
			},
		},
	}

	client := &mockAnthropicClient{
		responses: []*AnthropicMessage{
			// 턴 1: 뉴스 수집
			{
				StopReason: "tool_use",
				ToolUseBlocks: []ToolUseBlock{
					{ID: "tu_1", Name: "fetch_headlines", Input: []byte(`{"category": "technology", "page_size": 5}`)},
				},
				InputTokens: 100, OutputTokens: 30,
			},
			// 턴 2: Notion 저장 시도
			{
				StopReason: "tool_use",
				ToolUseBlocks: []ToolUseBlock{
					{ID: "tu_2", Name: "create_notion_page", Input: []byte(`{"database_id":"db-1","title":"Digest","content":"Tech News Today: Latest in technology."}`)},
				},
				InputTokens: 300, OutputTokens: 120,
			},
			// 턴 3: Notion 에러 수신 후 대체 응답 — 요약은 텍스트로 반환
			{
				StopReason:   "end_turn",
				TextContent:  "Notion 연결이 필요합니다. 오늘의 뉴스 요약:\n\n- Tech News Today: Latest in technology.",
				InputTokens:  350,
				OutputTokens: 50,
			},
		},
	}

	result, err := ExecuteAutomation(
		context.Background(),
		client,
		registry,
		"",
		"Please collect tech news and save to my Notion.",
		registry.ListTools(),
	)

	// TC-4011 edge: 최상위 에러 없음 (tool 에러는 AI에게 전달되어 처리됨)
	if err != nil {
		t.Fatalf("TC-4011 (no Notion): unexpected top-level error: %v", err)
	}

	// fetch_headlines는 성공적으로 호출됨
	if len(registry.calls) < 1 || registry.calls[0] != "fetch_headlines" {
		t.Errorf("TC-4011 (no Notion): expected fetch_headlines to be called first, calls: %v", registry.calls)
	}

	// create_notion_page가 시도되었는지 확인
	notionAttempted := false
	for _, call := range registry.calls {
		if call == "create_notion_page" {
			notionAttempted = true
			break
		}
	}
	if !notionAttempted {
		t.Error("TC-4011 (no Notion): expected create_notion_page to be attempted")
	}

	// AI가 Notion 연결 안내 또는 대체 텍스트 요약을 반환해야 함
	if !strings.Contains(result.Output, "Notion") {
		t.Errorf("TC-4011 (no Notion): output should mention Notion, got: %q", result.Output)
	}
}
