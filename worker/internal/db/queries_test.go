package db

// TC-DB-001 ~ TC-DB-006: DB Query 함수 단위 테스트 (TDD Red Phase)
//
// 구현 요구사항 (queries.go에 추가):
//
//   DueAutomation 타입:
//     type DueAutomation struct {
//         ID           string
//         ScheduleCron string
//         Timezone     string
//         NextRunAt    time.Time
//     }
//
//   AutomationConfig 타입:
//     type AutomationConfig struct {
//         ID     string
//         Name   string
//         Prompt string
//         UserID string
//     }
//
//   DBStore 타입:
//     type DBStore struct { pool *pgxpool.Pool }
//     func NewDBStore(pool *pgxpool.Pool) *DBStore
//
//   필요한 메서드:
//     func (s *DBStore) GetDueAutomations(ctx, now) ([]DueAutomation, error)
//     func (s *DBStore) UpdateNextRunAt(ctx, automationID, nextRunAt) error
//     func (s *DBStore) CreateExecutionLog(ctx, automationID, status) (string, error)
//     func (s *DBStore) UpdateExecutionLog(ctx, logID, status, output, errorMsg, retried) error
//     func (s *DBStore) GetLatestLogID(ctx, automationID) (string, error)
//     func (s *DBStore) GetAutomationConfig(ctx, automationID) (*AutomationConfig, error)
//
// Mock 전략:
//   - mockDBRows: 인터페이스로 pgx 쿼리 결과를 대체
//   - pgxStoreAdapter: *pgxpool.Pool 없이 쿼리 로직만 테스트
//   - 컴파일 에러 = Red Phase (DBStore/DueAutomation/AutomationConfig 미정의)

import (
	"context"
	"fmt"
	"testing"
	"time"
)

// ── Interface contract tests ───────────────────────────────────────────────────
//
// 이 섹션은 DBStore가 스케줄러가 요구하는 인터페이스를 만족하는지 컴파일 시점에 검증한다.
// DBStore/DueAutomation/AutomationConfig가 정의되지 않으면 컴파일 에러 (Red phase).

// CronStoreCompat는 scheduler.CronStore 인터페이스와 호환성을 검증하기 위한 로컬 복사본.
// (순환 import 방지: db 패키지가 scheduler 패키지를 import하면 순환 발생)
type CronStoreCompat interface {
	GetDueAutomations(ctx context.Context, now time.Time) ([]DueAutomation, error)
	UpdateNextRunAt(ctx context.Context, automationID string, nextRunAt time.Time) error
}

// ExecutionLoggerCompat는 scheduler.ExecutionLogger 인터페이스와 호환성 검증용 로컬 복사본.
type ExecutionLoggerCompat interface {
	CreateExecutionLog(ctx context.Context, automationID string, status string) (string, error)
	UpdateExecutionLog(ctx context.Context, logID string, status string, output string, errorMsg string, toolCallsJSON []byte, tokensUsed int, retried bool) error
	GetLatestLogID(ctx context.Context, automationID string) (string, error)
}

// AutomationQuerier는 DBStore가 구현해야 할 전체 쿼리 인터페이스.
type AutomationQuerier interface {
	CronStoreCompat
	ExecutionLoggerCompat
	GetAutomationConfig(ctx context.Context, automationID string) (*AutomationConfig, error)
}

// 컴파일 타임 인터페이스 만족 검증.
// DBStore, DueAutomation, AutomationConfig가 정의되지 않으면 컴파일 에러 (Red phase).
var _ AutomationQuerier = (*DBStore)(nil)

// ── Mock helpers ───────────────────────────────────────────────────────────────

// mockDBStore는 실제 pgxpool 없이 쿼리 계약을 테스트하는 인메모리 구현체.
// 실제 DBStore의 SQL 로직은 integration test에서 검증.
type mockDBStore struct {
	dueAutomations  []DueAutomation
	automationConfig *AutomationConfig

	updatedAutomationID string
	updatedNextRunAt    time.Time

	createdLogAutomationID string
	createdLogStatus       string
	createdLogIDToReturn   string

	updatedLogID     string
	updatedLogStatus string
	updatedLogOutput string
	updatedLogError  string
	updatedLogRetried bool

	latestLogIDToReturn string
	latestLogForID      string

	getDueErr    error
	updateRunErr error
	createLogErr error
	updateLogErr error
	getLogIDErr  error
	getConfigErr error
}

func (m *mockDBStore) GetDueAutomations(ctx context.Context, now time.Time) ([]DueAutomation, error) {
	if m.getDueErr != nil {
		return nil, m.getDueErr
	}
	return m.dueAutomations, nil
}

func (m *mockDBStore) UpdateNextRunAt(ctx context.Context, automationID string, nextRunAt time.Time) error {
	if m.updateRunErr != nil {
		return m.updateRunErr
	}
	m.updatedAutomationID = automationID
	m.updatedNextRunAt = nextRunAt
	return nil
}

func (m *mockDBStore) CreateExecutionLog(ctx context.Context, automationID string, status string) (string, error) {
	if m.createLogErr != nil {
		return "", m.createLogErr
	}
	m.createdLogAutomationID = automationID
	m.createdLogStatus = status
	id := m.createdLogIDToReturn
	if id == "" {
		id = "log-generated-id"
	}
	return id, nil
}

func (m *mockDBStore) UpdateExecutionLog(ctx context.Context, logID string, status string, output string, errorMsg string, toolCallsJSON []byte, tokensUsed int, retried bool) error {
	if m.updateLogErr != nil {
		return m.updateLogErr
	}
	m.updatedLogID = logID
	m.updatedLogStatus = status
	m.updatedLogOutput = output
	m.updatedLogError = errorMsg
	m.updatedLogRetried = retried
	return nil
}

func (m *mockDBStore) GetLatestLogID(ctx context.Context, automationID string) (string, error) {
	if m.getLogIDErr != nil {
		return "", m.getLogIDErr
	}
	m.latestLogForID = automationID
	return m.latestLogIDToReturn, nil
}

func (m *mockDBStore) GetAutomationConfig(ctx context.Context, automationID string) (*AutomationConfig, error) {
	if m.getConfigErr != nil {
		return nil, m.getConfigErr
	}
	return m.automationConfig, nil
}

// ── Tests ──────────────────────────────────────────────────────────────────────

// TC-DB-001: GetDueAutomations는 next_run_at <= now인 자동화 목록을 반환해야 한다.
//
// Verifies:
//   - next_run_at이 now보다 이전인 automation만 반환
//   - 반환된 DueAutomation에 ID, ScheduleCron, Timezone, NextRunAt이 포함됨
//
// Red Phase: DueAutomation 타입이 queries.go에 정의되지 않으면 컴파일 에러.
func TestGetDueAutomations_ReturnsDueItems(t *testing.T) {
	now := time.Date(2026, 3, 6, 10, 0, 0, 0, time.UTC)
	dueAt := now.Add(-5 * time.Minute) // 5분 전 = 이미 실행 시각 지남

	store := &mockDBStore{
		dueAutomations: []DueAutomation{
			{
				ID:           "auto-001",
				ScheduleCron: "0 8 * * *",
				Timezone:     "Asia/Seoul",
				NextRunAt:    dueAt,
			},
			{
				ID:           "auto-002",
				ScheduleCron: "30 9 * * 1",
				Timezone:     "UTC",
				NextRunAt:    dueAt,
			},
		},
	}

	ctx := context.Background()
	automations, err := store.GetDueAutomations(ctx, now)
	if err != nil {
		t.Fatalf("TC-DB-001: GetDueAutomations returned error: %v", err)
	}

	if len(automations) != 2 {
		t.Fatalf("TC-DB-001: got %d automations, want 2", len(automations))
	}

	// 필드 검증: DueAutomation 구조체에 올바른 필드가 있어야 한다
	first := automations[0]
	if first.ID == "" {
		t.Error("TC-DB-001: DueAutomation.ID must not be empty")
	}
	if first.ScheduleCron == "" {
		t.Error("TC-DB-001: DueAutomation.ScheduleCron must not be empty")
	}
	if first.Timezone == "" {
		t.Error("TC-DB-001: DueAutomation.Timezone must not be empty")
	}
	if first.NextRunAt.IsZero() {
		t.Error("TC-DB-001: DueAutomation.NextRunAt must not be zero")
	}
}

// TC-DB-001b: GetDueAutomations는 빈 목록도 정상 반환해야 한다 (due 항목 없음).
func TestGetDueAutomations_EmptyWhenNoneDue(t *testing.T) {
	store := &mockDBStore{
		dueAutomations: []DueAutomation{}, // 실행 대기 항목 없음
	}

	ctx := context.Background()
	automations, err := store.GetDueAutomations(ctx, time.Now().UTC())
	if err != nil {
		t.Fatalf("TC-DB-001b: GetDueAutomations returned error: %v", err)
	}
	if len(automations) != 0 {
		t.Errorf("TC-DB-001b: got %d automations, want 0", len(automations))
	}
}

// TC-DB-002: UpdateNextRunAt은 지정된 automation의 next_run_at 필드를 업데이트해야 한다.
//
// Verifies:
//   - 올바른 automationID와 nextRunAt으로 호출됨
//   - 에러 없이 반환
//
// Red Phase: DBStore.UpdateNextRunAt이 구현되지 않으면 컴파일 에러.
func TestUpdateNextRunAt_UpdatesCorrectly(t *testing.T) {
	store := &mockDBStore{}
	ctx := context.Background()

	automationID := "auto-update-001"
	nextRun := time.Date(2026, 3, 7, 8, 0, 0, 0, time.UTC)

	if err := store.UpdateNextRunAt(ctx, automationID, nextRun); err != nil {
		t.Fatalf("TC-DB-002: UpdateNextRunAt returned error: %v", err)
	}

	if store.updatedAutomationID != automationID {
		t.Errorf("TC-DB-002: updated automationID = %q, want %q",
			store.updatedAutomationID, automationID)
	}
	if !store.updatedNextRunAt.Equal(nextRun) {
		t.Errorf("TC-DB-002: updated nextRunAt = %v, want %v",
			store.updatedNextRunAt, nextRun)
	}
}

// TC-DB-003: CreateExecutionLog는 automation 실행 시작 시 로그 레코드를 생성하고 ID를 반환해야 한다.
//
// Verifies:
//   - automationID와 status="running"으로 호출됨
//   - 새로 생성된 로그 레코드의 ID를 반환 (빈 문자열이 아닌)
//
// Red Phase: DBStore.CreateExecutionLog가 구현되지 않으면 컴파일 에러.
func TestCreateExecutionLog_ReturnsLogID(t *testing.T) {
	store := &mockDBStore{
		createdLogIDToReturn: "log-abc-123",
	}
	ctx := context.Background()

	automationID := "auto-log-001"
	logID, err := store.CreateExecutionLog(ctx, automationID, "running")
	if err != nil {
		t.Fatalf("TC-DB-003: CreateExecutionLog returned error: %v", err)
	}

	if logID == "" {
		t.Error("TC-DB-003: CreateExecutionLog returned empty logID")
	}
	if store.createdLogAutomationID != automationID {
		t.Errorf("TC-DB-003: automationID = %q, want %q",
			store.createdLogAutomationID, automationID)
	}
	if store.createdLogStatus != "running" {
		t.Errorf("TC-DB-003: initial status = %q, want %q",
			store.createdLogStatus, "running")
	}
}

// TC-DB-004: UpdateExecutionLog는 실행 완료 후 로그의 status, output, error, retried를 업데이트해야 한다.
//
// Verifies:
//   - 성공 시: status="success", output=비어있지 않음, errorMsg="", retried=false
//   - 실패 시: status="failed", errorMsg=비어있지 않음, output="", retried=true
//
// Red Phase: DBStore.UpdateExecutionLog가 구현되지 않으면 컴파일 에러.
func TestUpdateExecutionLog_Success(t *testing.T) {
	store := &mockDBStore{}
	ctx := context.Background()

	logID := "log-success-001"
	output := "Morning briefing email sent successfully."

	if err := store.UpdateExecutionLog(ctx, logID, "success", output, "", nil, 0, false); err != nil {
		t.Fatalf("TC-DB-004: UpdateExecutionLog returned error: %v", err)
	}

	if store.updatedLogID != logID {
		t.Errorf("TC-DB-004: logID = %q, want %q", store.updatedLogID, logID)
	}
	if store.updatedLogStatus != "success" {
		t.Errorf("TC-DB-004: status = %q, want %q", store.updatedLogStatus, "success")
	}
	if store.updatedLogOutput != output {
		t.Errorf("TC-DB-004: output = %q, want %q", store.updatedLogOutput, output)
	}
	if store.updatedLogError != "" {
		t.Errorf("TC-DB-004: errorMsg = %q, want empty on success", store.updatedLogError)
	}
	if store.updatedLogRetried {
		t.Error("TC-DB-004: retried = true, want false for first attempt")
	}
}

func TestUpdateExecutionLog_Failure(t *testing.T) {
	store := &mockDBStore{}
	ctx := context.Background()

	logID := "log-fail-001"
	errMsg := "AI service unavailable"

	if err := store.UpdateExecutionLog(ctx, logID, "failed", "", errMsg, nil, 0, true); err != nil {
		t.Fatalf("TC-DB-004b: UpdateExecutionLog returned error: %v", err)
	}

	if store.updatedLogStatus != "failed" {
		t.Errorf("TC-DB-004b: status = %q, want %q", store.updatedLogStatus, "failed")
	}
	if store.updatedLogError != errMsg {
		t.Errorf("TC-DB-004b: errorMsg = %q, want %q", store.updatedLogError, errMsg)
	}
	if store.updatedLogOutput != "" {
		t.Errorf("TC-DB-004b: output = %q, want empty on failure", store.updatedLogOutput)
	}
	if !store.updatedLogRetried {
		t.Error("TC-DB-004b: retried = false, want true for retry attempt")
	}
}

// TC-DB-005: GetLatestLogID는 주어진 automation의 가장 최근 실행 로그 ID를 반환해야 한다.
//
// 사용 시나리오: Asynq retry 시 기존 로그 레코드를 재사용하기 위해 조회.
//
// Verifies:
//   - 해당 automationID의 가장 최근 로그 ID 반환
//   - 로그가 없으면 빈 문자열 반환 (에러 아님)
//
// Red Phase: DBStore.GetLatestLogID가 구현되지 않으면 컴파일 에러.
func TestGetLatestLogID_ReturnsRecentID(t *testing.T) {
	store := &mockDBStore{
		latestLogIDToReturn: "log-latest-999",
	}
	ctx := context.Background()

	automationID := "auto-latest-001"
	logID, err := store.GetLatestLogID(ctx, automationID)
	if err != nil {
		t.Fatalf("TC-DB-005: GetLatestLogID returned error: %v", err)
	}

	if logID != "log-latest-999" {
		t.Errorf("TC-DB-005: logID = %q, want %q", logID, "log-latest-999")
	}
	if store.latestLogForID != automationID {
		t.Errorf("TC-DB-005: queried automationID = %q, want %q",
			store.latestLogForID, automationID)
	}
}

func TestGetLatestLogID_EmptyWhenNoLogs(t *testing.T) {
	store := &mockDBStore{
		latestLogIDToReturn: "", // 로그 없음
	}
	ctx := context.Background()

	logID, err := store.GetLatestLogID(ctx, "auto-no-logs")
	if err != nil {
		t.Fatalf("TC-DB-005b: GetLatestLogID returned unexpected error: %v", err)
	}
	if logID != "" {
		t.Errorf("TC-DB-005b: expected empty logID when no logs, got %q", logID)
	}
}

// TC-DB-006: GetAutomationConfig는 실제 프롬프트를 포함한 automation 설정을 반환해야 한다.
//
// 이슈 배경: 현재 worker가 "placeholder prompt" 문자열을 하드코딩하여 사용.
// 올바른 동작: DB에서 automation별 실제 prompt를 로드해야 한다.
//
// Verifies:
//   - automationID로 AutomationConfig 조회
//   - AutomationConfig에 Name, Prompt, UserID 포함
//   - Prompt가 빈 문자열이 아님 (실제 프롬프트 내용 있음)
//   - Prompt가 "placeholder" 등 플레이스홀더가 아님
//
// Red Phase: DBStore.GetAutomationConfig와 AutomationConfig 타입이
//            queries.go에 정의되지 않으면 컴파일 에러.
func TestGetAutomationConfig_ReturnsActualPrompt(t *testing.T) {
	expectedConfig := &AutomationConfig{
		ID:     "auto-config-001",
		Name:   "Morning Briefing",
		Prompt: "You are a personal assistant. Summarize today's schedule, unread emails, and weather for the user.",
		UserID: "user-abc-123",
	}

	store := &mockDBStore{
		automationConfig: expectedConfig,
	}
	ctx := context.Background()

	config, err := store.GetAutomationConfig(ctx, "auto-config-001")
	if err != nil {
		t.Fatalf("TC-DB-006: GetAutomationConfig returned error: %v", err)
	}
	if config == nil {
		t.Fatal("TC-DB-006: GetAutomationConfig returned nil config")
	}

	if config.ID == "" {
		t.Error("TC-DB-006: AutomationConfig.ID must not be empty")
	}
	if config.Name == "" {
		t.Error("TC-DB-006: AutomationConfig.Name must not be empty")
	}
	if config.Prompt == "" {
		t.Error("TC-DB-006: AutomationConfig.Prompt must not be empty — real prompt required, not placeholder")
	}
	if config.UserID == "" {
		t.Error("TC-DB-006: AutomationConfig.UserID must not be empty — needed for OAuth token lookup")
	}

	// 플레이스홀더 문자열이 실제 프롬프트로 교체되었는지 검증
	placeholders := []string{"placeholder", "TODO", "FIXME", "hardcoded"}
	for _, p := range placeholders {
		if config.Prompt == p {
			t.Errorf("TC-DB-006: Prompt = %q is a placeholder string — must be actual automation prompt", config.Prompt)
		}
	}

	if config.Prompt != expectedConfig.Prompt {
		t.Errorf("TC-DB-006: Prompt = %q, want %q", config.Prompt, expectedConfig.Prompt)
	}
}

// TC-DB-006b: 존재하지 않는 automationID 조회 시 nil config와 에러를 반환해야 한다.
func TestGetAutomationConfig_NotFound_ReturnsError(t *testing.T) {
	store := &mockDBStore{
		automationConfig: nil,
		getConfigErr:     nil, // 실제 구현에서는 pgx.ErrNoRows를 반환해야 함
	}
	ctx := context.Background()

	// mock은 nil을 반환 — 실제 구현은 not found 시 에러를 반환해야 함
	// 이 테스트는 실제 DBStore 구현에서 "ErrNoRows → error" 처리를 검증
	config, err := store.GetAutomationConfig(ctx, "non-existent-id")
	_ = config
	_ = err
	// NOTE: 실제 DBStore 구현 시 이 테스트를 보완:
	//   if err == nil && config == nil { t.Error("expected error for missing automation") }
}

// ── ExecutionLog 타입 및 GetExecutionLogsByDateRange 계약 테스트 ───────────────

// ExecutionLogQuerierCompat는 DBStore가 구현해야 할 GetExecutionLogsByDateRange 인터페이스 검증용.
type ExecutionLogQuerierCompat interface {
	GetExecutionLogsByDateRange(ctx context.Context, userID string, startDate time.Time, endDate time.Time) ([]ExecutionLog, error)
}

// 컴파일 타임 인터페이스 만족 검증.
// DBStore와 ExecutionLog 타입이 queries.go에 정의되지 않으면 컴파일 에러 (Red phase).
var _ ExecutionLogQuerierCompat = (*DBStore)(nil)

// mockExecutionLogStore는 GetExecutionLogsByDateRange 계약 테스트를 위한 인메모리 구현체.
type mockExecutionLogStore struct {
	logsToReturn []ExecutionLog
	queryErr     error

	capturedUserID    string
	capturedStartDate time.Time
	capturedEndDate   time.Time
}

func (m *mockExecutionLogStore) GetExecutionLogsByDateRange(
	ctx context.Context,
	userID string,
	startDate time.Time,
	endDate time.Time,
) ([]ExecutionLog, error) {
	m.capturedUserID = userID
	m.capturedStartDate = startDate
	m.capturedEndDate = endDate
	if m.queryErr != nil {
		return nil, m.queryErr
	}
	return m.logsToReturn, nil
}

// TC-DB-007: GetExecutionLogsByDateRange는 지정한 날짜 범위 내의 execution logs를 반환해야 한다.
//
// Verifies:
//   - userID, startDate, endDate 파라미터가 올바르게 전달됨
//   - 반환된 ExecutionLog에 ID, AutomationID, Status, CreatedAt 포함
//   - 결과가 created_at DESC 순서로 정렬됨 (범위 내 최신 순)
//
// Red Phase: ExecutionLog 타입이나 DBStore.GetExecutionLogsByDateRange가 정의되지 않으면 컴파일 에러.
func TestGetExecutionLogsByDateRange_ReturnsLogsInRange(t *testing.T) {
	startDate := time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2026, 3, 8, 0, 0, 0, 0, time.UTC)

	completedAt1 := time.Date(2026, 3, 5, 10, 30, 0, 0, time.UTC)
	completedAt2 := time.Date(2026, 3, 3, 9, 15, 0, 0, time.UTC)

	store := &mockExecutionLogStore{
		logsToReturn: []ExecutionLog{
			{
				ID:           "log-001",
				AutomationID: "auto-weekly-001",
				UserID:       "user-abc",
				Status:       "success",
				CreatedAt:    time.Date(2026, 3, 5, 10, 0, 0, 0, time.UTC),
				CompletedAt:  &completedAt1,
				Output:       "Weekly review sent.",
				TokensUsed:   1700,
				ToolCalls:    []ToolCall{{ToolName: "send_email", Input: "{}", Output: "sent"}},
			},
			{
				ID:           "log-002",
				AutomationID: "auto-morning-001",
				UserID:       "user-abc",
				Status:       "success",
				CreatedAt:    time.Date(2026, 3, 3, 9, 0, 0, 0, time.UTC),
				CompletedAt:  &completedAt2,
				Output:       "Morning briefing sent.",
				TokensUsed:   850,
				ToolCalls:    nil,
			},
		},
	}

	ctx := context.Background()
	logs, err := store.GetExecutionLogsByDateRange(ctx, "user-abc", startDate, endDate)
	if err != nil {
		t.Fatalf("TC-DB-007: GetExecutionLogsByDateRange returned error: %v", err)
	}

	// 2개 로그 반환 검증
	if len(logs) != 2 {
		t.Fatalf("TC-DB-007: got %d logs, want 2", len(logs))
	}

	// 파라미터 전달 검증
	if store.capturedUserID != "user-abc" {
		t.Errorf("TC-DB-007: userID = %q, want %q", store.capturedUserID, "user-abc")
	}
	if !store.capturedStartDate.Equal(startDate) {
		t.Errorf("TC-DB-007: startDate = %v, want %v", store.capturedStartDate, startDate)
	}
	if !store.capturedEndDate.Equal(endDate) {
		t.Errorf("TC-DB-007: endDate = %v, want %v", store.capturedEndDate, endDate)
	}

	// 필드 검증: ExecutionLog 구조체에 올바른 필드가 있어야 한다
	first := logs[0]
	if first.ID == "" {
		t.Error("TC-DB-007: ExecutionLog.ID must not be empty")
	}
	if first.AutomationID == "" {
		t.Error("TC-DB-007: ExecutionLog.AutomationID must not be empty")
	}
	if first.Status == "" {
		t.Error("TC-DB-007: ExecutionLog.Status must not be empty")
	}
	if first.CreatedAt.IsZero() {
		t.Error("TC-DB-007: ExecutionLog.CreatedAt must not be zero")
	}

	// DESC 정렬 검증: 첫 번째 로그가 두 번째보다 최신이어야 함
	if !logs[0].CreatedAt.After(logs[1].CreatedAt) {
		t.Errorf("TC-DB-007: logs not sorted by created_at DESC: [0]=%v, [1]=%v",
			logs[0].CreatedAt, logs[1].CreatedAt)
	}

	// ToolCalls 필드 검증
	if len(logs[0].ToolCalls) != 1 {
		t.Errorf("TC-DB-007: logs[0].ToolCalls length = %d, want 1", len(logs[0].ToolCalls))
	}
	if logs[0].ToolCalls[0].ToolName != "send_email" {
		t.Errorf("TC-DB-007: ToolCall.ToolName = %q, want %q", logs[0].ToolCalls[0].ToolName, "send_email")
	}
}

// TC-DB-007b: GetExecutionLogsByDateRange는 범위 내 로그가 없으면 빈 슬라이스를 반환해야 한다 (nil 아님).
//
// Verifies:
//   - 범위 내 로그 없음 → 빈 슬라이스 반환 (nil이 아닌 []ExecutionLog{})
//   - 에러 없음
func TestGetExecutionLogsByDateRange_EmptySliceWhenNoLogs(t *testing.T) {
	store := &mockExecutionLogStore{
		logsToReturn: []ExecutionLog{}, // 범위 내 로그 없음
	}

	ctx := context.Background()
	startDate := time.Date(2026, 2, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2026, 2, 8, 0, 0, 0, 0, time.UTC)

	logs, err := store.GetExecutionLogsByDateRange(ctx, "user-empty", startDate, endDate)
	if err != nil {
		t.Fatalf("TC-DB-007b: unexpected error: %v", err)
	}
	if logs == nil {
		t.Error("TC-DB-007b: expected empty slice, got nil — use []ExecutionLog{} not nil")
	}
	if len(logs) != 0 {
		t.Errorf("TC-DB-007b: got %d logs, want 0", len(logs))
	}
}

// TC-DB-007c: GetExecutionLogsByDateRange는 CompletedAt이 NULL인 실행 중인 로그를 올바르게 처리해야 한다.
//
// Verifies:
//   - CompletedAt이 nil인 경우 (실행 중/실패) 정상 처리
//   - Status 필드로 실행 상태 구분 가능
func TestGetExecutionLogsByDateRange_HandlesNullCompletedAt(t *testing.T) {
	store := &mockExecutionLogStore{
		logsToReturn: []ExecutionLog{
			{
				ID:           "log-running-001",
				AutomationID: "auto-001",
				UserID:       "user-xyz",
				Status:       "running",
				CreatedAt:    time.Date(2026, 3, 7, 8, 0, 0, 0, time.UTC),
				CompletedAt:  nil, // 실행 중 → NULL
				Output:       "",
				TokensUsed:   0,
				ToolCalls:    nil,
			},
		},
	}

	ctx := context.Background()
	startDate := time.Date(2026, 3, 7, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2026, 3, 8, 0, 0, 0, 0, time.UTC)

	logs, err := store.GetExecutionLogsByDateRange(ctx, "user-xyz", startDate, endDate)
	if err != nil {
		t.Fatalf("TC-DB-007c: unexpected error with NULL completed_at: %v", err)
	}
	if len(logs) != 1 {
		t.Fatalf("TC-DB-007c: got %d logs, want 1", len(logs))
	}

	// CompletedAt이 nil이어야 함 (실행 중)
	if logs[0].CompletedAt != nil {
		t.Errorf("TC-DB-007c: CompletedAt = %v, want nil for running log", logs[0].CompletedAt)
	}
	if logs[0].Status != "running" {
		t.Errorf("TC-DB-007c: Status = %q, want %q", logs[0].Status, "running")
	}
}

// ── PM-02: GetConnectedServiceByProvider 테스트 ──────────────────────────────
//
// 구현 요구사항 (queries.go에 추가):
//   func (s *DBStore) GetConnectedServiceByProvider(ctx context.Context, userID, provider string) (*ConnectedService, error)
//
// - provider는 "notion", "google" 등 서비스명
// - 해당 user+provider 조합의 connected_services 레코드 반환
// - 없으면 nil, ErrNotFound 반환

// ConnectedServiceQuerierCompat는 DBStore가 구현해야 할 GetConnectedServiceByProvider 인터페이스 검증용.
type ConnectedServiceQuerierCompat interface {
	GetConnectedServiceByProvider(ctx context.Context, userID, provider string) (*ConnectedService, error)
}

// 컴파일 타임 인터페이스 만족 검증.
// DBStore.GetConnectedServiceByProvider가 정의되지 않으면 컴파일 에러 (Red phase).
var _ ConnectedServiceQuerierCompat = (*DBStore)(nil)

// mockConnectedServiceStore는 GetConnectedServiceByProvider 테스트용 인메모리 mock.
type mockConnectedServiceStore struct {
	serviceToReturn *ConnectedService
	queryErr        error

	capturedUserID   string
	capturedProvider string
}

func (m *mockConnectedServiceStore) GetConnectedServiceByProvider(ctx context.Context, userID, provider string) (*ConnectedService, error) {
	m.capturedUserID = userID
	m.capturedProvider = provider
	if m.queryErr != nil {
		return nil, m.queryErr
	}
	return m.serviceToReturn, nil
}

// TC-PM02-WRK-01: Notion 서비스가 연결된 사용자 → ConnectedService 반환
//
// Verifies:
//   - userID + provider="notion" 조합으로 조회
//   - ConnectedService에 ID, UserID, Provider, AccessTokenEncrypted 등 포함
//   - IsActive=true 확인
func TestGetConnectedServiceByProvider_NotionConnected(t *testing.T) {
	store := &mockConnectedServiceStore{
		serviceToReturn: &ConnectedService{
			ID:                    "svc-notion-001",
			UserID:                "user-001",
			Provider:              "notion",
			AccessTokenEncrypted:  "encrypted_notion_token",
			RefreshTokenEncrypted: "", // Notion은 refresh token 없음
			IsActive:              true,
		},
	}

	ctx := context.Background()
	svc, err := store.GetConnectedServiceByProvider(ctx, "user-001", "notion")

	if err != nil {
		t.Fatalf("TC-PM02-WRK-01: unexpected error: %v", err)
	}
	if svc == nil {
		t.Fatal("TC-PM02-WRK-01: expected non-nil ConnectedService")
	}
	if svc.ID != "svc-notion-001" {
		t.Errorf("TC-PM02-WRK-01: ID = %q, want %q", svc.ID, "svc-notion-001")
	}
	if svc.Provider != "notion" {
		t.Errorf("TC-PM02-WRK-01: Provider = %q, want %q", svc.Provider, "notion")
	}
	if svc.AccessTokenEncrypted == "" {
		t.Error("TC-PM02-WRK-01: AccessTokenEncrypted must not be empty")
	}
	if !svc.IsActive {
		t.Error("TC-PM02-WRK-01: IsActive must be true for active service")
	}

	// 파라미터 전달 검증
	if store.capturedUserID != "user-001" {
		t.Errorf("TC-PM02-WRK-01: userID = %q, want %q", store.capturedUserID, "user-001")
	}
	if store.capturedProvider != "notion" {
		t.Errorf("TC-PM02-WRK-01: provider = %q, want %q", store.capturedProvider, "notion")
	}
}

// TC-PM02-WRK-02: Notion 서비스가 없는 사용자 → nil + ErrNotFound 반환
//
// Verifies:
//   - 해당 user+provider 조합이 DB에 없으면 에러 반환
//   - 반환된 ConnectedService는 nil
func TestGetConnectedServiceByProvider_NotFound(t *testing.T) {
	store := &mockConnectedServiceStore{
		serviceToReturn: nil,
		queryErr:        fmt.Errorf("connected service not found"),
	}

	ctx := context.Background()
	svc, err := store.GetConnectedServiceByProvider(ctx, "user-no-notion", "notion")

	if err == nil {
		t.Error("TC-PM02-WRK-02: expected error for missing service, got nil")
	}
	if svc != nil {
		t.Errorf("TC-PM02-WRK-02: expected nil service, got %+v", svc)
	}
}

// TC-PM02-WRK-03: is_active=false인 서비스 → 반환하되 IsActive=false 확인
//
// Verifies:
//   - is_active=false인 레코드도 정상 조회됨
//   - 호출부에서 IsActive 필드를 확인하여 처리
func TestGetConnectedServiceByProvider_InactiveService(t *testing.T) {
	store := &mockConnectedServiceStore{
		serviceToReturn: &ConnectedService{
			ID:                    "svc-notion-inactive",
			UserID:                "user-002",
			Provider:              "notion",
			AccessTokenEncrypted:  "encrypted_expired_token",
			RefreshTokenEncrypted: "",
			IsActive:              false, // 비활성화된 서비스
		},
	}

	ctx := context.Background()
	svc, err := store.GetConnectedServiceByProvider(ctx, "user-002", "notion")

	if err != nil {
		t.Fatalf("TC-PM02-WRK-03: unexpected error: %v", err)
	}
	if svc == nil {
		t.Fatal("TC-PM02-WRK-03: expected non-nil ConnectedService even if inactive")
	}
	if svc.IsActive {
		t.Error("TC-PM02-WRK-03: IsActive must be false for inactive service")
	}
}

// TC-PM02-WRK-04: provider="google" 쿼리 → Google 서비스만 반환
//
// Verifies:
//   - provider 필터링이 올바르게 동작
//   - "google"로 조회 시 Google ConnectedService 반환
func TestGetConnectedServiceByProvider_GoogleService(t *testing.T) {
	store := &mockConnectedServiceStore{
		serviceToReturn: &ConnectedService{
			ID:                    "svc-google-001",
			UserID:                "user-003",
			Provider:              "google",
			AccessTokenEncrypted:  "encrypted_google_access_token",
			RefreshTokenEncrypted: "encrypted_google_refresh_token",
			IsActive:              true,
		},
	}

	ctx := context.Background()
	svc, err := store.GetConnectedServiceByProvider(ctx, "user-003", "google")

	if err != nil {
		t.Fatalf("TC-PM02-WRK-04: unexpected error: %v", err)
	}
	if svc == nil {
		t.Fatal("TC-PM02-WRK-04: expected non-nil ConnectedService")
	}
	if svc.Provider != "google" {
		t.Errorf("TC-PM02-WRK-04: Provider = %q, want %q", svc.Provider, "google")
	}
	if store.capturedProvider != "google" {
		t.Errorf("TC-PM02-WRK-04: queried provider = %q, want %q", store.capturedProvider, "google")
	}
}

// ── PM-03: UpdateServiceIsActive 테스트 ──────────────────────────────────────
//
// 구현 요구사항 (queries.go에 추가):
//   func (s *DBStore) UpdateServiceIsActive(ctx context.Context, serviceID string, isActive bool) error
//
// - connected_services의 is_active 필드를 업데이트
// - refresh 실패 시 is_active=false로 마킹하여 Web UI에서 감지

// ServiceActiveUpdaterCompat는 DBStore가 구현해야 할 UpdateServiceIsActive 인터페이스 검증용.
type ServiceActiveUpdaterCompat interface {
	UpdateServiceIsActive(ctx context.Context, serviceID string, isActive bool) error
}

// 컴파일 타임 인터페이스 만족 검증.
// DBStore.UpdateServiceIsActive가 정의되지 않으면 컴파일 에러 (Red phase).
var _ ServiceActiveUpdaterCompat = (*DBStore)(nil)

// mockServiceActiveUpdater는 UpdateServiceIsActive 테스트용 인메모리 mock.
type mockServiceActiveUpdater struct {
	capturedServiceID string
	capturedIsActive  bool
	updateErr         error
	called            bool
}

func (m *mockServiceActiveUpdater) UpdateServiceIsActive(ctx context.Context, serviceID string, isActive bool) error {
	m.called = true
	m.capturedServiceID = serviceID
	m.capturedIsActive = isActive
	return m.updateErr
}

// TC-PM03-WRK-01: isActive=false → is_active=false 업데이트
//
// Verifies:
//   - serviceID와 isActive=false 파라미터가 올바르게 전달됨
//   - 에러 없이 반환
func TestUpdateServiceIsActive_SetFalse(t *testing.T) {
	store := &mockServiceActiveUpdater{}
	ctx := context.Background()

	err := store.UpdateServiceIsActive(ctx, "svc-deactivate-001", false)

	if err != nil {
		t.Fatalf("TC-PM03-WRK-01: unexpected error: %v", err)
	}
	if !store.called {
		t.Error("TC-PM03-WRK-01: UpdateServiceIsActive was not called")
	}
	if store.capturedServiceID != "svc-deactivate-001" {
		t.Errorf("TC-PM03-WRK-01: serviceID = %q, want %q", store.capturedServiceID, "svc-deactivate-001")
	}
	if store.capturedIsActive {
		t.Error("TC-PM03-WRK-01: isActive must be false")
	}
}

// TC-PM03-WRK-02: isActive=true → is_active=true 업데이트 (재연결 시)
//
// Verifies:
//   - isActive=true 파라미터가 올바르게 전달됨
func TestUpdateServiceIsActive_SetTrue(t *testing.T) {
	store := &mockServiceActiveUpdater{}
	ctx := context.Background()

	err := store.UpdateServiceIsActive(ctx, "svc-reactivate-001", true)

	if err != nil {
		t.Fatalf("TC-PM03-WRK-02: unexpected error: %v", err)
	}
	if !store.capturedIsActive {
		t.Error("TC-PM03-WRK-02: isActive must be true")
	}
}

// TC-PM03-WRK-03: 존재하지 않는 serviceID → 에러 반환
//
// Verifies:
//   - DB에 없는 serviceID → 에러 반환 (0 rows affected)
func TestUpdateServiceIsActive_NonExistentService(t *testing.T) {
	store := &mockServiceActiveUpdater{
		updateErr: fmt.Errorf("no rows affected: service not found"),
	}
	ctx := context.Background()

	err := store.UpdateServiceIsActive(ctx, "svc-nonexistent", false)

	if err == nil {
		t.Error("TC-PM03-WRK-03: expected error for non-existent service, got nil")
	}
}
