package scheduler

// TC-NEW-001: calculateNextRun 타임존 에러 반환 테스트
//
// 수정 요구사항 (dispatcher.go):
//   - calculateNextRun: 유효하지 않은 timezone 문자열이 주어졌을 때
//     loc = time.UTC로 silently fallback하지 말고 error를 반환해야 함
//
// 현재 구현 (Red 상태):
//   loc, err := time.LoadLocation(timezone)
//   if err != nil {
//       loc = time.UTC  // ← 버그: 에러를 무시하고 UTC로 폴백
//   }
//
// 기대 구현 (Green 목표):
//   loc, err := time.LoadLocation(timezone)
//   if err != nil {
//       return time.Time{}, fmt.Errorf("invalid timezone %q: %w", timezone, err)
//   }

import (
	"testing"
	"time"

	"github.com/robfig/cron/v3"
)

// TestCalculateNextRun_InvalidTimezone verifies that calculateNextRun returns an error
// when the timezone string is invalid, instead of silently falling back to UTC.
//
// Reproduces the issue found in CTO review:
//   - If a user saves an automation with a typo'd timezone (e.g. "Amercia/New_York"),
//     the dispatcher currently falls back to UTC without any logging.
//   - This can cause automations to fire at incorrect times with no diagnostic info.
//
// Red Phase: This test FAILS with the current implementation because
// calculateNextRun returns (nextTime, nil) instead of (zero, error).
func TestCalculateNextRun_InvalidTimezone(t *testing.T) {
	parser := cron.NewParser(cron.Minute | cron.Hour | cron.Dom | cron.Month | cron.Dow)
	now := time.Date(2026, 3, 6, 10, 0, 0, 0, time.UTC)
	cronExpr := "0 8 * * *"
	invalidTimezone := "Not/A/Real/Timezone"

	_, err := calculateNextRun(parser, cronExpr, invalidTimezone, now)
	if err == nil {
		t.Errorf("calculateNextRun(%q, %q): expected error for invalid timezone, got nil",
			cronExpr, invalidTimezone)
		t.Log("  HINT: dispatcher.go:103 silently falls back to UTC — propagate the error instead")
	}
}

// TestCalculateNextRun_ValidTimezone_KST verifies that a valid non-UTC timezone
// correctly shifts the cron schedule.
//
// "0 8 * * *" in KST (UTC+9) → fires at 08:00 KST = 23:00 UTC (previous day).
// After now=2026-03-06T10:00Z the next 08:00 KST is 2026-03-07T08:00 KST = 2026-03-06T23:00Z.
func TestCalculateNextRun_ValidTimezone_KST(t *testing.T) {
	parser := cron.NewParser(cron.Minute | cron.Hour | cron.Dom | cron.Month | cron.Dow)
	// 2026-03-06 10:00 UTC = 2026-03-06 19:00 KST (already past 08:00 KST today)
	now := time.Date(2026, 3, 6, 10, 0, 0, 0, time.UTC)

	nextRun, err := calculateNextRun(parser, "0 8 * * *", "Asia/Seoul", now)
	if err != nil {
		t.Fatalf("calculateNextRun with valid timezone returned error: %v", err)
	}

	// Expected: next 08:00 KST = 2026-03-07T08:00+09:00 = 2026-03-06T23:00Z
	expected := time.Date(2026, 3, 6, 23, 0, 0, 0, time.UTC)
	if !nextRun.Equal(expected) {
		t.Errorf("calculateNextRun KST: got %v, want %v", nextRun, expected)
	}
}
