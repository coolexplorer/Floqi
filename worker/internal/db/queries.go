package db

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// DueAutomation represents an automation that is due to run.
type DueAutomation struct {
	ID           string
	ScheduleCron string
	Timezone     string
	NextRunAt    time.Time
}

// AutomationConfig holds the automation configuration needed by the runner.
type AutomationConfig struct {
	ID     string
	Name   string
	Prompt string
	UserID string
}

// DBStore implements all database operations needed by the worker.
type DBStore struct {
	pool *pgxpool.Pool
}

// NewDBStore creates a new DBStore backed by the given connection pool.
func NewDBStore(pool *pgxpool.Pool) *DBStore {
	return &DBStore{pool: pool}
}

// GetDueAutomations returns active automations whose next_run_at <= now.
func (s *DBStore) GetDueAutomations(ctx context.Context, now time.Time) ([]DueAutomation, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, schedule_cron, timezone, next_run_at FROM automations
		 WHERE status = 'active' AND next_run_at <= $1`,
		now,
	)
	if err != nil {
		return nil, fmt.Errorf("get due automations: %w", err)
	}
	defer rows.Close()

	var automations []DueAutomation
	for rows.Next() {
		var a DueAutomation
		if err := rows.Scan(&a.ID, &a.ScheduleCron, &a.Timezone, &a.NextRunAt); err != nil {
			return nil, fmt.Errorf("scan automation: %w", err)
		}
		automations = append(automations, a)
	}
	return automations, rows.Err()
}

// UpdateNextRunAt updates the next_run_at field for an automation.
func (s *DBStore) UpdateNextRunAt(ctx context.Context, automationID string, nextRunAt time.Time) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE automations SET next_run_at = $1 WHERE id = $2`,
		nextRunAt, automationID,
	)
	if err != nil {
		return fmt.Errorf("update next_run_at: %w", err)
	}
	return nil
}

// CreateExecutionLog inserts a new execution log record and returns its ID.
func (s *DBStore) CreateExecutionLog(ctx context.Context, automationID, status string) (string, error) {
	var id string
	err := s.pool.QueryRow(ctx,
		`INSERT INTO execution_logs (automation_id, status) VALUES ($1, $2) RETURNING id`,
		automationID, status,
	).Scan(&id)
	if err != nil {
		return "", fmt.Errorf("create execution log: %w", err)
	}
	return id, nil
}

// UpdateExecutionLog updates the status and result of an execution log on completion.
func (s *DBStore) UpdateExecutionLog(ctx context.Context, logID, status, output, errorMsg string, retried bool) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE execution_logs SET status = $1, error_message = $2, completed_at = NOW() WHERE id = $3`,
		status, errorMsg, logID,
	)
	if err != nil {
		return fmt.Errorf("update execution log: %w", err)
	}
	return nil
}

// GetLatestLogID returns the ID of the most recent execution log for an automation.
func (s *DBStore) GetLatestLogID(ctx context.Context, automationID string) (string, error) {
	var id string
	err := s.pool.QueryRow(ctx,
		`SELECT id FROM execution_logs WHERE automation_id = $1 ORDER BY created_at DESC LIMIT 1`,
		automationID,
	).Scan(&id)
	if err != nil {
		return "", fmt.Errorf("get latest log id: %w", err)
	}
	return id, nil
}

// GetAutomationConfig loads the automation configuration needed to execute a run.
// The prompt is constructed from the template_type stored in the database.
func (s *DBStore) GetAutomationConfig(ctx context.Context, automationID string) (*AutomationConfig, error) {
	var cfg AutomationConfig
	var templateType string
	err := s.pool.QueryRow(ctx,
		`SELECT id, name, template_type, user_id FROM automations WHERE id = $1`,
		automationID,
	).Scan(&cfg.ID, &cfg.Name, &templateType, &cfg.UserID)
	if err != nil {
		return nil, fmt.Errorf("get automation config %s: %w", automationID, err)
	}
	cfg.Prompt = buildPrompt(templateType, cfg.Name)
	return &cfg, nil
}

// buildPrompt constructs the LLM prompt for an automation based on its template type.
func buildPrompt(templateType, name string) string {
	switch templateType {
	case "morning_briefing":
		return "Summarize today's schedule, unread emails, and weather for the user as a morning briefing."
	case "email_triage":
		return "Review and classify the user's unread emails as urgent, important, or reference."
	case "reading_digest":
		return "Compile a digest of recent news and articles matching the user's interests."
	case "weekly_review":
		return "Summarize the user's activities, completed tasks, and key events from the past week."
	case "smart_save":
		return "Monitor and save relevant emails and news articles to the user's Notion workspace."
	default:
		return fmt.Sprintf("Execute the '%s' automation workflow.", name)
	}
}
