package billing

import (
	"context"
	"errors"
	"testing"
)

// mockUsageChecker는 UsageChecker 인터페이스의 인메모리 mock 구현체.
type mockUsageChecker struct {
	plan           string
	executionCount int
	planErr        error
	countErr       error
}

func (m *mockUsageChecker) GetMonthlyExecutionCount(ctx context.Context, userID string) (int, error) {
	if m.countErr != nil {
		return 0, m.countErr
	}
	return m.executionCount, nil
}

func (m *mockUsageChecker) GetUserPlan(ctx context.Context, userID string) (string, error) {
	if m.planErr != nil {
		return "", m.planErr
	}
	return m.plan, nil
}

// TC-8008: Free 사용자가 한도 이내 (5회 실행) → CheckExecutionLimit nil 반환 (허용)
func TestCheckExecutionLimit_FreeUserWithinLimit(t *testing.T) {
	checker := &mockUsageChecker{
		plan:           "free",
		executionCount: 5,
	}

	err := CheckExecutionLimit(context.Background(), checker, "user-free-001")
	if err != nil {
		t.Errorf("TC-8008: free user with 5 executions should be allowed, got error: %v", err)
	}
}

// TC-8009: Free 사용자가 한도 도달 (30회 실행) → ErrExecutionLimitExceeded 반환
func TestCheckExecutionLimit_FreeUserAtLimit(t *testing.T) {
	checker := &mockUsageChecker{
		plan:           "free",
		executionCount: 30,
	}

	err := CheckExecutionLimit(context.Background(), checker, "user-free-002")
	if err == nil {
		t.Fatal("TC-8009: free user at 30 executions should be rejected, got nil")
	}
	if !errors.Is(err, ErrExecutionLimitExceeded) {
		t.Errorf("TC-8009: expected ErrExecutionLimitExceeded, got: %v", err)
	}
}

// TC-8009b: Free 사용자가 한도 초과 (35회 실행) → ErrExecutionLimitExceeded 반환
func TestCheckExecutionLimit_FreeUserOverLimit(t *testing.T) {
	checker := &mockUsageChecker{
		plan:           "free",
		executionCount: 35,
	}

	err := CheckExecutionLimit(context.Background(), checker, "user-free-003")
	if err == nil {
		t.Fatal("TC-8009b: free user over limit should be rejected, got nil")
	}
	if !errors.Is(err, ErrExecutionLimitExceeded) {
		t.Errorf("TC-8009b: expected ErrExecutionLimitExceeded, got: %v", err)
	}
}

// TC-8010: Pro 사용자는 500회까지 허용
func TestCheckExecutionLimit_ProUserWithinLimit(t *testing.T) {
	checker := &mockUsageChecker{
		plan:           "pro",
		executionCount: 100,
	}

	err := CheckExecutionLimit(context.Background(), checker, "user-pro-001")
	if err != nil {
		t.Errorf("TC-8010: pro user with 100 executions should be allowed, got error: %v", err)
	}
}

// TC-8010b: Pro 사용자가 한도 도달 (500회) → ErrExecutionLimitExceeded 반환
func TestCheckExecutionLimit_ProUserAtLimit(t *testing.T) {
	checker := &mockUsageChecker{
		plan:           "pro",
		executionCount: 500,
	}

	err := CheckExecutionLimit(context.Background(), checker, "user-pro-002")
	if err == nil {
		t.Fatal("TC-8010b: pro user at 500 executions should be rejected, got nil")
	}
	if !errors.Is(err, ErrExecutionLimitExceeded) {
		t.Errorf("TC-8010b: expected ErrExecutionLimitExceeded, got: %v", err)
	}
}

// TC-8011: BYOK 사용자 → 항상 허용 (무제한)
func TestCheckExecutionLimit_BYOKUserUnlimited(t *testing.T) {
	checker := &mockUsageChecker{
		plan:           "byok",
		executionCount: 10000,
	}

	err := CheckExecutionLimit(context.Background(), checker, "user-byok-001")
	if err != nil {
		t.Errorf("TC-8011: byok user should always be allowed, got error: %v", err)
	}
}

// TC-8008c: 알 수 없는 plan → free로 간주하여 30회 제한 적용
func TestCheckExecutionLimit_UnknownPlanDefaultsToFree(t *testing.T) {
	checker := &mockUsageChecker{
		plan:           "unknown_plan",
		executionCount: 30,
	}

	err := CheckExecutionLimit(context.Background(), checker, "user-unknown-001")
	if err == nil {
		t.Fatal("TC-8008c: unknown plan at 30 executions should be rejected (defaults to free limit)")
	}
	if !errors.Is(err, ErrExecutionLimitExceeded) {
		t.Errorf("TC-8008c: expected ErrExecutionLimitExceeded, got: %v", err)
	}
}

// GetUserPlan 에러 시 에러 전파
func TestCheckExecutionLimit_GetPlanError(t *testing.T) {
	checker := &mockUsageChecker{
		planErr: errors.New("db connection failed"),
	}

	err := CheckExecutionLimit(context.Background(), checker, "user-err-001")
	if err == nil {
		t.Fatal("expected error when GetUserPlan fails, got nil")
	}
}

// GetMonthlyExecutionCount 에러 시 에러 전파
func TestCheckExecutionLimit_GetCountError(t *testing.T) {
	checker := &mockUsageChecker{
		plan:     "free",
		countErr: errors.New("db connection failed"),
	}

	err := CheckExecutionLimit(context.Background(), checker, "user-err-002")
	if err == nil {
		t.Fatal("expected error when GetMonthlyExecutionCount fails, got nil")
	}
}
