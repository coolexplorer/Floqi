package scheduler

// TC-5001~5004: CronDispatcher 단위 테스트 (TDD Red Phase)
//
// 구현 요구사항 (dispatcher.go에 추가):
//   - ScheduledAutomation: ID, ScheduleCron, Timezone, NextRunAt 필드
//   - CronStore interface: GetDueAutomations, UpdateNextRunAt
//   - CronEnqueuer interface: EnqueueAutomation
//   - CronDispatcher struct: db CronStore, queue CronEnqueuer, pollInterval time.Duration
//   - NewCronDispatcher(db CronStore, q CronEnqueuer, interval time.Duration) *CronDispatcher
//   - (*CronDispatcher).checkAndEnqueue(ctx context.Context) error
//   - (*CronDispatcher).checkAndEnqueueAt(ctx context.Context, now time.Time) error
//
// Mock 전략:
//   - mockCronStore: GetDueAutomations/UpdateNextRunAt 호출 캡처
//   - mockCronEnqueuer: EnqueueAutomation 호출 캡처
//   - checkAndEnqueueAt(ctx, now)로 결정론적 next_run_at 계산 테스트

import (
	"context"
	"testing"
	"time"
)

// ── Mock helpers ─────────────────────────────────────────────────────────────

type updateNextRunAtCall struct {
	automationID string
	nextRunAt    time.Time
}

// mockCronStore implements CronStore (to be defined in dispatcher.go).
// ScheduledAutomation은 dispatcher.go에 정의되어야 함 → 컴파일 실패 (Red phase).
type mockCronStore struct {
	dueAutomations []ScheduledAutomation // ← undefined: compile error (Red)
	updateCalls    []updateNextRunAtCall
	getDueCalls    int
	getErr         error
	updateErr      error
}

func (m *mockCronStore) GetDueAutomations(ctx context.Context, now time.Time) ([]ScheduledAutomation, error) {
	m.getDueCalls++
	if m.getErr != nil {
		return nil, m.getErr
	}
	return m.dueAutomations, nil
}

func (m *mockCronStore) UpdateNextRunAt(ctx context.Context, automationID string, nextRunAt time.Time) error {
	if m.updateErr != nil {
		return m.updateErr
	}
	m.updateCalls = append(m.updateCalls, updateNextRunAtCall{
		automationID: automationID,
		nextRunAt:    nextRunAt,
	})
	return nil
}

// mockCronEnqueuer implements CronEnqueuer (to be defined in dispatcher.go).
type mockCronEnqueuer struct {
	enqueuedIDs []string
	returnErr   error
}

func (m *mockCronEnqueuer) EnqueueAutomation(ctx context.Context, automationID string) error {
	if m.returnErr != nil {
		return m.returnErr
	}
	m.enqueuedIDs = append(m.enqueuedIDs, automationID)
	return nil
}

// ── Tests ─────────────────────────────────────────────────────────────────────

// TC-5001: CronDispatcher가 next_run_at ≤ now인 active automation을 감지하여 enqueue해야 한다.
//
// Verifies:
//   - checkAndEnqueue가 GetDueAutomations 결과를 순회하여 모두 enqueue
//   - 2개의 due automation → 2번 EnqueueAutomation 호출
func TestCronDispatcher_TC5001_DetectsDueAutomations(t *testing.T) {
	now := time.Now().UTC()
	dueAt := now.Add(-time.Minute) // 1분 전 = 이미 실행 시각 지남

	store := &mockCronStore{
		dueAutomations: []ScheduledAutomation{
			{ID: "auto-1", ScheduleCron: "0 8 * * *", Timezone: "UTC", NextRunAt: dueAt},
			{ID: "auto-2", ScheduleCron: "30 9 * * *", Timezone: "UTC", NextRunAt: dueAt},
		},
	}
	enqueuer := &mockCronEnqueuer{}

	dispatcher := NewCronDispatcher(store, enqueuer, time.Minute)

	if err := dispatcher.checkAndEnqueue(context.Background()); err != nil {
		t.Fatalf("TC-5001: checkAndEnqueue returned unexpected error: %v", err)
	}

	if len(enqueuer.enqueuedIDs) != 2 {
		t.Errorf("TC-5001: enqueued %d automations, want 2", len(enqueuer.enqueuedIDs))
	}

	enqueued := make(map[string]bool, len(enqueuer.enqueuedIDs))
	for _, id := range enqueuer.enqueuedIDs {
		enqueued[id] = true
	}
	if !enqueued["auto-1"] {
		t.Error("TC-5001: auto-1 was not enqueued")
	}
	if !enqueued["auto-2"] {
		t.Error("TC-5001: auto-2 was not enqueued")
	}
}

// TC-5002: enqueue 후 next_run_at이 다음 크론 주기로 업데이트돼야 한다.
//
// Verifies:
//   - UpdateNextRunAt이 enqueue 후 호출됨
//   - "0 8 * * *" 크론 + now=2026-03-06T10:00Z → nextRunAt=2026-03-07T08:00Z
func TestCronDispatcher_TC5002_UpdatesNextRunAt(t *testing.T) {
	// 결정론적 "now" 고정: 2026-03-06 10:00:00 UTC
	// "0 8 * * *" 다음 실행: 2026-03-07 08:00:00 UTC
	now := time.Date(2026, 3, 6, 10, 0, 0, 0, time.UTC)
	dueAt := time.Date(2026, 3, 6, 8, 0, 0, 0, time.UTC)

	store := &mockCronStore{
		dueAutomations: []ScheduledAutomation{
			{
				ID:           "auto-briefing",
				ScheduleCron: "0 8 * * *",
				Timezone:     "UTC",
				NextRunAt:    dueAt,
			},
		},
	}
	enqueuer := &mockCronEnqueuer{}

	dispatcher := NewCronDispatcher(store, enqueuer, time.Minute)

	// checkAndEnqueueAt: 결정론적 시각을 주입해 next_run_at 계산을 테스트
	if err := dispatcher.checkAndEnqueueAt(context.Background(), now); err != nil {
		t.Fatalf("TC-5002: checkAndEnqueueAt returned unexpected error: %v", err)
	}

	// enqueue가 먼저 일어나야 한다
	if len(enqueuer.enqueuedIDs) != 1 {
		t.Fatalf("TC-5002: expected 1 enqueue call, got %d", len(enqueuer.enqueuedIDs))
	}

	// UpdateNextRunAt이 호출돼야 한다
	if len(store.updateCalls) != 1 {
		t.Fatalf("TC-5002: expected 1 UpdateNextRunAt call, got %d", len(store.updateCalls))
	}

	update := store.updateCalls[0]
	if update.automationID != "auto-briefing" {
		t.Errorf("TC-5002: UpdateNextRunAt automationID = %q, want %q",
			update.automationID, "auto-briefing")
	}

	expectedNextRun := time.Date(2026, 3, 7, 8, 0, 0, 0, time.UTC)
	if !update.nextRunAt.Equal(expectedNextRun) {
		t.Errorf("TC-5002: nextRunAt = %v, want %v", update.nextRunAt, expectedNextRun)
	}
}

// TC-5003: status=paused인 automation은 스케줄링에서 제외돼야 한다.
//
// Verifies:
//   - GetDueAutomations가 빈 목록을 반환할 때 (paused 항목이 DB에서 필터됨)
//     EnqueueAutomation이 한 번도 호출되지 않음
//   - GetDueAutomations는 정확히 1번 호출됨
func TestCronDispatcher_TC5003_PausedAutomationsExcluded(t *testing.T) {
	// DB 레벨에서 status='active' 필터 적용 → paused 항목은 반환되지 않음
	store := &mockCronStore{
		dueAutomations: []ScheduledAutomation{}, // paused 항목 제외 후 빈 목록
	}
	enqueuer := &mockCronEnqueuer{}

	dispatcher := NewCronDispatcher(store, enqueuer, time.Minute)

	if err := dispatcher.checkAndEnqueue(context.Background()); err != nil {
		t.Fatalf("TC-5003: checkAndEnqueue returned unexpected error: %v", err)
	}

	// 아무것도 enqueue되지 않아야 함
	if len(enqueuer.enqueuedIDs) != 0 {
		t.Errorf("TC-5003: expected 0 enqueues (paused excluded), got %d: %v",
			len(enqueuer.enqueuedIDs), enqueuer.enqueuedIDs)
	}

	// GetDueAutomations는 정확히 1번 호출돼야 함
	if store.getDueCalls != 1 {
		t.Errorf("TC-5003: GetDueAutomations called %d times, want 1", store.getDueCalls)
	}
}

// TC-5004: 단일 사이클 내 동일 automationID 중복 반환 시 한 번만 enqueue돼야 한다.
//
// 시나리오: GetDueAutomations가 같은 automation을 2번 반환하는 경우
// (DB 레이스 조건 또는 파티션 중복 등으로 인한 방어적 처리)
//
// Verifies:
//   - 중복된 automationID가 있어도 EnqueueAutomation은 1번만 호출됨
//   - 두 번째 중복 항목은 무시됨
func TestCronDispatcher_TC5004_DeduplicatesWithinCycle(t *testing.T) {
	now := time.Now().UTC()
	dueAt := now.Add(-time.Minute)

	// 같은 automation이 2번 포함된 목록 (중복 시나리오)
	dupAutomation := ScheduledAutomation{
		ID:           "auto-dup",
		ScheduleCron: "0 8 * * *",
		Timezone:     "UTC",
		NextRunAt:    dueAt,
	}
	store := &mockCronStore{
		dueAutomations: []ScheduledAutomation{dupAutomation, dupAutomation},
	}
	enqueuer := &mockCronEnqueuer{}

	dispatcher := NewCronDispatcher(store, enqueuer, time.Minute)

	if err := dispatcher.checkAndEnqueue(context.Background()); err != nil {
		t.Fatalf("TC-5004: checkAndEnqueue returned unexpected error: %v", err)
	}

	// auto-dup은 정확히 1번만 enqueue돼야 함
	dupCount := 0
	for _, id := range enqueuer.enqueuedIDs {
		if id == "auto-dup" {
			dupCount++
		}
	}
	if dupCount != 1 {
		t.Errorf("TC-5004: auto-dup enqueued %d times, want exactly 1 (dedup required)", dupCount)
	}
}
