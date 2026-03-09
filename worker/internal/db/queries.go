package db

import (
	"context"
	"encoding/json"
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
	ID           string
	Name         string
	Prompt       string
	UserID       string
	TemplateType string
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
func (s *DBStore) UpdateExecutionLog(ctx context.Context, logID, status, output, errorMsg string, toolCallsJSON []byte, tokensUsed int, retried bool) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE execution_logs
		 SET status = $1, error_message = $2, tool_calls = $3, tokens_used = $4, completed_at = NOW()
		 WHERE id = $5`,
		status, errorMsg, toolCallsJSON, tokensUsed, logID,
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
	cfg.TemplateType = templateType
	cfg.Prompt = buildPrompt(templateType, cfg.Name)
	return &cfg, nil
}

// ExecutionLog represents a single execution log record for an automation run.
type ExecutionLog struct {
	ID           string
	AutomationID string
	UserID       string
	Status       string
	CreatedAt    time.Time
	CompletedAt  *time.Time
	Output       string
	TokensUsed   int
	ToolCalls    []ToolCall
}

// ToolCall represents a single MCP tool invocation recorded in an execution log.
type ToolCall struct {
	ToolName string `json:"tool_name"`
	Input    string `json:"input"`
	Output   string `json:"output"`
}

// GetExecutionLogsByDateRange fetches execution logs for a user within a date range.
// Used by Weekly Review template to aggregate weekly statistics.
func (s *DBStore) GetExecutionLogsByDateRange(
	ctx context.Context,
	userID string,
	startDate time.Time,
	endDate time.Time,
) ([]ExecutionLog, error) {
	query := `
		SELECT id, automation_id, status, created_at, completed_at, output, tokens_used, tool_calls
		FROM execution_logs
		WHERE user_id = $1
		  AND created_at >= $2
		  AND created_at < $3
		ORDER BY created_at DESC
	`

	rows, err := s.pool.Query(ctx, query, userID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to query execution logs: %w", err)
	}
	defer rows.Close()

	logs := []ExecutionLog{}
	for rows.Next() {
		var log ExecutionLog
		var toolCallsJSON []byte
		err := rows.Scan(
			&log.ID,
			&log.AutomationID,
			&log.Status,
			&log.CreatedAt,
			&log.CompletedAt,
			&log.Output,
			&log.TokensUsed,
			&toolCallsJSON,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan execution log: %w", err)
		}

		if toolCallsJSON != nil {
			if err := json.Unmarshal(toolCallsJSON, &log.ToolCalls); err != nil {
				return nil, fmt.Errorf("failed to parse tool_calls: %w", err)
			}
		}

		logs = append(logs, log)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating execution logs: %w", err)
	}

	return logs, nil
}

// GetConnectedServiceByProvider returns the connected service for a user and provider.
// Returns nil and an error if no service is found.
func (s *DBStore) GetConnectedServiceByProvider(ctx context.Context, userID, provider string) (*ConnectedService, error) {
	var svc ConnectedService
	err := s.pool.QueryRow(ctx,
		`SELECT id, user_id, provider, access_token_encrypted, refresh_token_encrypted, token_expires_at, is_active
		 FROM connected_services
		 WHERE user_id = $1 AND provider = $2
		 LIMIT 1`,
		userID, provider,
	).Scan(&svc.ID, &svc.UserID, &svc.Provider, &svc.AccessTokenEncrypted, &svc.RefreshTokenEncrypted, &svc.ExpiresAt, &svc.IsActive)
	if err != nil {
		return nil, fmt.Errorf("get connected service by provider: %w", err)
	}
	return &svc, nil
}

// UpdateServiceTokens persists refreshed OAuth tokens back to the database.
func (s *DBStore) UpdateServiceTokens(ctx context.Context, serviceID, accessTokenEncrypted, refreshTokenEncrypted string, expiresAt time.Time) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE connected_services
		 SET access_token_encrypted = $1, refresh_token_encrypted = $2, token_expires_at = $3, updated_at = NOW()
		 WHERE id = $4`,
		accessTokenEncrypted, refreshTokenEncrypted, expiresAt, serviceID,
	)
	if err != nil {
		return fmt.Errorf("update service tokens: %w", err)
	}
	return nil
}

// UpdateServiceIsActive updates the is_active field for a connected service.
func (s *DBStore) UpdateServiceIsActive(ctx context.Context, serviceID string, isActive bool) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE connected_services SET is_active = $1 WHERE id = $2`,
		isActive, serviceID,
	)
	if err != nil {
		return fmt.Errorf("update service is_active: %w", err)
	}
	return nil
}

// GetMonthlyExecutionCount returns the execution count for the current month.
func (s *DBStore) GetMonthlyExecutionCount(ctx context.Context, userID string) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx,
		`SELECT COALESCE(executions_count, 0) FROM usage_tracking
		 WHERE user_id = $1 AND period_start = date_trunc('month', NOW())::date`,
		userID,
	).Scan(&count)
	if err != nil {
		// No record found means 0 executions
		if err.Error() == "no rows in result set" {
			return 0, nil
		}
		return 0, fmt.Errorf("get monthly execution count: %w", err)
	}
	return count, nil
}

// GetUserPlan returns the user's current plan from profiles.
func (s *DBStore) GetUserPlan(ctx context.Context, userID string) (string, error) {
	var plan string
	err := s.pool.QueryRow(ctx,
		`SELECT COALESCE(plan, 'free') FROM profiles WHERE id = $1`,
		userID,
	).Scan(&plan)
	if err != nil {
		return "", fmt.Errorf("get user plan: %w", err)
	}
	return plan, nil
}

// IncrementExecutionCount increments the monthly execution counter via upsert.
func (s *DBStore) IncrementExecutionCount(ctx context.Context, userID string, tokensUsed int) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO usage_tracking (user_id, period_start, executions_count, llm_tokens_total)
		 VALUES ($1, date_trunc('month', NOW())::date, 1, $2)
		 ON CONFLICT (user_id, period_start)
		 DO UPDATE SET executions_count = usage_tracking.executions_count + 1,
		               llm_tokens_total = usage_tracking.llm_tokens_total + $2`,
		userID, tokensUsed,
	)
	if err != nil {
		return fmt.Errorf("increment execution count: %w", err)
	}
	return nil
}

// buildPrompt constructs the LLM prompt for an automation based on its template type.
// Prompts explicitly instruct the AI to use the available tools.
func buildPrompt(templateType, name string) string {
	switch templateType {
	case "morning_briefing":
		return `1. list_events: today's events (time_min=today 00:00, time_max=today 23:59, RFC3339)
2. read_inbox: 10 recent emails
3. get_weather: current weather for user's city
4. send_email: compose and send morning briefing summary`
	case "email_triage":
		return `1. read_inbox: max_results=20
2. Classify each email as Urgent/Important/Reference
3. Return triage report`
	case "reading_digest":
		return `1. fetch_headlines: category="technology"
2. fetch_headlines: category="business"
3. Summarize top 5 articles from both categories`
	case "weekly_review":
		return `1. list_events: this week Mon-Sun
2. search_email: query="is:sent" for sent emails this week
3. Compile weekly summary: activities, achievements, priorities`
	case "smart_save":
		return `1. read_inbox: recent emails
2. Identify important content worth saving
3. create_notion_page: save each important item
4. Return summary of saved items`
	default:
		return fmt.Sprintf("Execute '%s' automation. Use available tools.", name)
	}
}
