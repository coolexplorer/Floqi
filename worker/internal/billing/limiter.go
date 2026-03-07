package billing

import (
	"context"
	"errors"
	"fmt"
)

// ErrExecutionLimitExceeded is returned when a user has exceeded their monthly execution limit.
var ErrExecutionLimitExceeded = errors.New("monthly execution limit exceeded")

// PlanLimits defines execution limits per plan. -1 means unlimited.
var PlanLimits = map[string]int{
	"free": 30,
	"pro":  500,
	"byok": -1,
}

// UsageChecker is the interface for querying current usage and plan.
type UsageChecker interface {
	GetMonthlyExecutionCount(ctx context.Context, userID string) (int, error)
	GetUserPlan(ctx context.Context, userID string) (string, error)
}

// CheckExecutionLimit verifies if a user can execute based on their plan and current usage.
func CheckExecutionLimit(ctx context.Context, checker UsageChecker, userID string) error {
	plan, err := checker.GetUserPlan(ctx, userID)
	if err != nil {
		return fmt.Errorf("get user plan: %w", err)
	}

	limit, ok := PlanLimits[plan]
	if !ok {
		limit = PlanLimits["free"]
	}

	// Unlimited plan
	if limit == -1 {
		return nil
	}

	count, err := checker.GetMonthlyExecutionCount(ctx, userID)
	if err != nil {
		return fmt.Errorf("get monthly execution count: %w", err)
	}

	if count >= limit {
		return ErrExecutionLimitExceeded
	}

	return nil
}
