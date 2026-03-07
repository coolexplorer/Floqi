package scheduler

import (
	"context"
	"time"

	"github.com/robfig/cron/v3"
)

// ScheduledAutomation represents an automation that is due to run.
type ScheduledAutomation struct {
	ID           string
	ScheduleCron string
	Timezone     string
	NextRunAt    time.Time
}

// CronStore abstracts database access for the CronDispatcher.
type CronStore interface {
	GetDueAutomations(ctx context.Context, now time.Time) ([]ScheduledAutomation, error)
	UpdateNextRunAt(ctx context.Context, automationID string, nextRunAt time.Time) error
}

// CronEnqueuer abstracts task queue access for the CronDispatcher.
type CronEnqueuer interface {
	EnqueueAutomation(ctx context.Context, automationID string) error
}

// CronDispatcher polls the database for due automations and enqueues them.
type CronDispatcher struct {
	db           CronStore
	queue        CronEnqueuer
	pollInterval time.Duration
}

// NewCronDispatcher creates a new CronDispatcher.
func NewCronDispatcher(db CronStore, q CronEnqueuer, interval time.Duration) *CronDispatcher {
	return &CronDispatcher{db: db, queue: q, pollInterval: interval}
}

// Start runs the polling loop until ctx is cancelled.
func (d *CronDispatcher) Start(ctx context.Context) error {
	ticker := time.NewTicker(d.pollInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			d.checkAndEnqueue(ctx) //nolint:errcheck
		case <-ctx.Done():
			return nil
		}
	}
}

// checkAndEnqueue runs one check cycle using the current time.
func (d *CronDispatcher) checkAndEnqueue(ctx context.Context) error {
	return d.checkAndEnqueueAt(ctx, time.Now().UTC())
}

// checkAndEnqueueAt runs one check cycle using the given time.
// It fetches due automations, enqueues each unique one, then updates next_run_at.
func (d *CronDispatcher) checkAndEnqueueAt(ctx context.Context, now time.Time) error {
	automations, err := d.db.GetDueAutomations(ctx, now)
	if err != nil {
		return err
	}

	parser := cron.NewParser(cron.Minute | cron.Hour | cron.Dom | cron.Month | cron.Dow)
	seen := make(map[string]bool, len(automations))

	for _, a := range automations {
		if seen[a.ID] {
			continue
		}
		seen[a.ID] = true

		if err := d.queue.EnqueueAutomation(ctx, a.ID); err != nil {
			return err
		}

		nextRun, err := calculateNextRun(parser, a.ScheduleCron, a.Timezone, now)
		if err != nil {
			return err
		}

		if err := d.db.UpdateNextRunAt(ctx, a.ID, nextRun); err != nil {
			return err
		}
	}
	return nil
}

// calculateNextRun returns the next scheduled time after now for the given cron expression,
// computed in the specified timezone and returned in UTC.
func calculateNextRun(parser cron.Parser, cronExpr, timezone string, now time.Time) (time.Time, error) {
	schedule, err := parser.Parse(cronExpr)
	if err != nil {
		return time.Time{}, err
	}

	loc, err := time.LoadLocation(timezone)
	if err != nil {
		loc = time.UTC
	}

	return schedule.Next(now.In(loc)).UTC(), nil
}
