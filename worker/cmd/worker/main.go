package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	anthropic "github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
	"github.com/anthropics/anthropic-sdk-go/packages/param"
	"github.com/hibiken/asynq"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"floqi/worker/internal/agent"
	"floqi/worker/internal/config"
	"floqi/worker/internal/db"
	"floqi/worker/internal/mcp"
	"floqi/worker/internal/scheduler"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	// Configure structured logging
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})
	log.Info().Msg("Worker starting...")

	// 1. Load config
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatal().Err(err).Msg("failed to load config")
	}

	// 2. Connect to database
	ctx := context.Background()
	pool, err := db.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to database")
	}
	defer pool.Close()
	log.Info().Msg("Database connected")

	// 3. Parse cron poll interval (default: 1m)
	pollInterval := time.Minute
	if cfg.PollInterval != "" {
		if d, parseErr := time.ParseDuration(cfg.PollInterval); parseErr == nil {
			pollInterval = d
		}
	}

	// 4. Connect to Redis (Asynq)
	redisOpt := asynq.RedisClientOpt{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
	}
	asynqClient := asynq.NewClient(redisOpt)
	defer asynqClient.Close()
	log.Info().Str("addr", cfg.RedisAddr).Msg("Redis connected")

	// 5. Initialize MCP Registry with all 9 tools
	registry, err := mcp.NewRegistry(
		"",                // gmailToken — loaded per-user from DB at execution time
		"",                // calendarToken — loaded per-user from DB at execution time
		cfg.WeatherAPIKey, // global API key
		cfg.NewsAPIKey,    // global API key
		cfg.NotionToken,   // integration token
	)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to create MCP registry")
	}
	log.Info().Int("tools", len(registry.ListTools())).Msg("MCP Registry initialized")

	// 6. Create Anthropic client + agent executor adapter
	anthropicCl := anthropic.NewClient(option.WithAPIKey(cfg.AnthropicAPIKey))
	agentClient := &anthropicAdapter{client: &anthropicCl}

	// 7. Create runner function (executes an automation by ID)
	runner := func(ctx context.Context, automationID string) (*agent.ExecutionResult, error) {
		// TODO: Load per-automation prompt and per-user OAuth tokens from DB
		prompt := fmt.Sprintf("Execute automation task: %s", automationID)
		return agent.ExecuteAutomation(ctx, agentClient, registry, prompt)
	}

	// 8. Create AutomationQueue
	queue := scheduler.NewAutomationQueue(asynqClient)

	// 9. Create AutomationWorker
	execLogger := &dbExecutionLogger{pool: pool}
	worker := scheduler.NewAutomationWorker(runner, execLogger)

	// 10. Create CronDispatcher
	cronStore := &dbCronStore{pool: pool}
	dispatcher := scheduler.NewCronDispatcher(cronStore, queue, pollInterval)

	// 11. Start Asynq server (processes queued tasks)
	srv := asynq.NewServer(redisOpt, asynq.Config{
		Concurrency: 10,
		Queues:      map[string]int{"default": 10},
	})
	muxHandler := asynq.NewServeMux()
	muxHandler.HandleFunc(scheduler.TaskTypeAutomationRun, worker.Handler())

	go func() {
		if err := srv.Run(muxHandler); err != nil {
			log.Error().Err(err).Msg("Asynq server stopped")
		}
	}()
	log.Info().Msg("Asynq server started")

	// 12. Start CronDispatcher polling loop
	cronCtx, cronCancel := context.WithCancel(ctx)
	defer cronCancel()

	go func() {
		if err := dispatcher.Start(cronCtx); err != nil {
			log.Error().Err(err).Msg("CronDispatcher stopped")
		}
	}()
	log.Info().Dur("poll_interval", pollInterval).Msg("CronDispatcher started")

	// 13. Wait for shutdown signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("Shutdown signal received, stopping...")
	cronCancel()
	srv.Shutdown()
	log.Info().Msg("Worker stopped")
}

// ── Anthropic adapter ─────────────────────────────────────────────────────────

// anthropicAdapter implements agent.AnthropicClient using the Anthropic Go SDK.
type anthropicAdapter struct {
	client *anthropic.Client
}

func (a *anthropicAdapter) CreateMessage(ctx context.Context, messages []agent.ConversationTurn, tools []agent.ToolDef) (*agent.AnthropicMessage, error) {
	sdkMessages, err := convertMessages(messages)
	if err != nil {
		return nil, fmt.Errorf("convert messages: %w", err)
	}

	sdkTools := make([]anthropic.ToolUnionParam, 0, len(tools))
	for _, t := range tools {
		tool := anthropic.ToolUnionParamOfTool(
			anthropic.ToolInputSchemaParam{Properties: t.InputSchema},
			t.Name,
		)
		if t.Description != "" {
			tool.OfTool.Description = param.NewOpt(t.Description)
		}
		sdkTools = append(sdkTools, tool)
	}

	resp, err := a.client.Messages.New(ctx, anthropic.MessageNewParams{
		Model:     anthropic.ModelClaudeSonnet4_6,
		MaxTokens: 4096,
		Messages:  sdkMessages,
		Tools:     sdkTools,
	})
	if err != nil {
		return nil, err
	}

	result := &agent.AnthropicMessage{
		StopReason:   string(resp.StopReason),
		InputTokens:  resp.Usage.InputTokens,
		OutputTokens: resp.Usage.OutputTokens,
	}

	for _, block := range resp.Content {
		if tb := block.AsText(); tb.Type == "text" {
			result.TextContent = tb.Text
		} else if tu := block.AsToolUse(); tu.Type == "tool_use" {
			inputBytes, _ := json.Marshal(tu.Input)
			result.ToolUseBlocks = append(result.ToolUseBlocks, agent.ToolUseBlock{
				ID:    tu.ID,
				Name:  tu.Name,
				Input: inputBytes,
			})
		}
	}

	return result, nil
}

// convertMessages converts agent.ConversationTurn slice to Anthropic SDK MessageParams.
func convertMessages(turns []agent.ConversationTurn) ([]anthropic.MessageParam, error) {
	msgs := make([]anthropic.MessageParam, 0, len(turns))
	for _, turn := range turns {
		blocks, err := contentToBlocks(turn.Content)
		if err != nil {
			return nil, err
		}
		switch turn.Role {
		case "user":
			msgs = append(msgs, anthropic.NewUserMessage(blocks...))
		case "assistant":
			msgs = append(msgs, anthropic.NewAssistantMessage(blocks...))
		}
	}
	return msgs, nil
}

// contentToBlocks converts ConversationTurn.Content (interface{}) to SDK content blocks.
// Handles: string, []agent.ToolUseBlock, and JSON-serializable tool result slices.
func contentToBlocks(content interface{}) ([]anthropic.ContentBlockParamUnion, error) {
	switch v := content.(type) {
	case string:
		return []anthropic.ContentBlockParamUnion{anthropic.NewTextBlock(v)}, nil

	case []agent.ToolUseBlock:
		blocks := make([]anthropic.ContentBlockParamUnion, 0, len(v))
		for _, b := range v {
			var input map[string]interface{}
			json.Unmarshal(b.Input, &input) //nolint:errcheck
			blocks = append(blocks, anthropic.NewToolUseBlock(b.ID, input, b.Name))
		}
		return blocks, nil

	default:
		// Tool results — JSON round-trip since toolResult is unexported in agent package
		data, err := json.Marshal(content)
		if err != nil {
			return nil, fmt.Errorf("marshal content: %w", err)
		}
		var rawItems []struct {
			Type      string `json:"type"`
			ToolUseID string `json:"tool_use_id"`
			Content   string `json:"content"`
			IsError   bool   `json:"is_error"`
		}
		if err := json.Unmarshal(data, &rawItems); err != nil {
			return nil, fmt.Errorf("unmarshal tool results: %w", err)
		}
		blocks := make([]anthropic.ContentBlockParamUnion, 0, len(rawItems))
		for _, item := range rawItems {
			if item.Type == "tool_result" {
				blocks = append(blocks, anthropic.NewToolResultBlock(item.ToolUseID, item.Content, item.IsError))
			}
		}
		return blocks, nil
	}
}

// ── DB stub implementations ───────────────────────────────────────────────────
// These will be replaced with real SQL queries in a future sprint.

// dbCronStore implements scheduler.CronStore against PostgreSQL.
type dbCronStore struct {
	pool *pgxpool.Pool
}

func (s *dbCronStore) GetDueAutomations(ctx context.Context, now time.Time) ([]scheduler.ScheduledAutomation, error) {
	// TODO: SELECT id, schedule_cron, timezone, next_run_at FROM automations
	//       WHERE status = 'active' AND next_run_at <= $1
	return nil, nil
}

func (s *dbCronStore) UpdateNextRunAt(ctx context.Context, automationID string, nextRunAt time.Time) error {
	// TODO: UPDATE automations SET next_run_at = $1 WHERE id = $2
	return nil
}

// dbExecutionLogger implements scheduler.ExecutionLogger against PostgreSQL.
type dbExecutionLogger struct {
	pool *pgxpool.Pool
}

func (l *dbExecutionLogger) CreateExecutionLog(ctx context.Context, automationID, status string) (string, error) {
	// TODO: INSERT INTO execution_logs (automation_id, status, started_at) VALUES (...)
	return "", nil
}

func (l *dbExecutionLogger) UpdateExecutionLog(ctx context.Context, logID, status, output, errorMsg string, retried bool) error {
	// TODO: UPDATE execution_logs SET status=$1, output=$2, error_message=$3, retried=$4 WHERE id=$5
	return nil
}

func (l *dbExecutionLogger) GetLatestLogID(ctx context.Context, automationID string) (string, error) {
	// TODO: SELECT id FROM execution_logs WHERE automation_id=$1 ORDER BY started_at DESC LIMIT 1
	return "", nil
}
