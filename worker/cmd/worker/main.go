package main

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	anthropic "github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
	"github.com/anthropics/anthropic-sdk-go/packages/param"
	"github.com/hibiken/asynq"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/getsentry/sentry-go"

	"floqi/worker/internal/agent"
	"floqi/worker/internal/config"
	"floqi/worker/internal/db"
	"floqi/worker/internal/mcp"
	"floqi/worker/internal/oauth"
	"floqi/worker/internal/scheduler"
)

var cancelFuncs sync.Map // automationID → context.CancelFunc

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

	// Initialize Sentry
	if sentryDSN := os.Getenv("SENTRY_DSN"); sentryDSN != "" {
		err := sentry.Init(sentry.ClientOptions{
			Dsn:              sentryDSN,
			TracesSampleRate: 0.1,
			Environment:      os.Getenv("APP_ENV"),
		})
		if err != nil {
			log.Warn().Err(err).Msg("Sentry initialization failed")
		} else {
			log.Info().Msg("Sentry initialized")
			defer sentry.Flush(2 * time.Second)
		}
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
	if cfg.RedisTLS {
		redisOpt.TLSConfig = &tls.Config{}
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

	// 7. Create DBStore and runner function (executes an automation by ID)
	dbStore := db.NewDBStore(pool)
	runner := func(ctx context.Context, automationID string) (*agent.ExecutionResult, error) {
		// Create cancellable context and register it
		ctx, cancel := context.WithCancel(ctx)
		cancelFuncs.Store(automationID, cancel)
		defer cancelFuncs.Delete(automationID)
		defer cancel()

		// Load automation config (name, prompt, user_id) from DB
		autoCfg, err := dbStore.GetAutomationConfig(ctx, automationID)
		if err != nil {
			return nil, fmt.Errorf("load automation config: %w", err)
		}

		// Load user's Google OAuth token with automatic refresh
		svc, svcErr := dbStore.GetConnectedServiceByProvider(ctx, autoCfg.UserID, "google")
		var gmailToken, calendarToken string
		if svcErr == nil && svc != nil {
			googleClient := oauth.NewGoogleOAuthClient(cfg.GoogleClientID, cfg.GoogleClientSecret)
			token, tokenErr := oauth.GetAccessTokenAndMarkExpiredOnFailure(ctx, pool, svc, googleClient)
			if tokenErr != nil {
				log.Warn().Err(tokenErr).Str("user_id", autoCfg.UserID).Msg("failed to get Google access token, continuing without")
			} else {
				gmailToken = token
				calendarToken = token
			}
		}

		// Create per-user MCP registry with actual OAuth tokens
		userRegistry, registryErr := mcp.NewRegistry(
			gmailToken,
			calendarToken,
			cfg.WeatherAPIKey,
			cfg.NewsAPIKey,
			cfg.NotionToken,
		)
		if registryErr != nil {
			return nil, fmt.Errorf("create user registry: %w", registryErr)
		}

		return agent.ExecuteAutomation(ctx, agentClient, userRegistry, autoCfg.Prompt)
	}

	// 8. Create AutomationQueue
	queue := scheduler.NewAutomationQueue(asynqClient)

	// 9. Create AutomationWorker (dbStore implements scheduler.ExecutionLogger)
	worker := scheduler.NewAutomationWorker(runner, dbStore)

	// 10. Create CronDispatcher (cronAdapter adapts db.DBStore to scheduler.CronStore)
	cronAdapter := &dbCronAdapter{store: dbStore}
	dispatcher := scheduler.NewCronDispatcher(cronAdapter, queue, pollInterval)

	// 11. Start HTTP enqueue endpoint (for Web API to trigger tasks)
	enqueuePort := os.Getenv("ENQUEUE_PORT")
	if enqueuePort == "" {
		enqueuePort = "8081"
	}
	httpMux := http.NewServeMux()
	httpMux.HandleFunc("POST /enqueue", func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			AutomationID string `json:"automation_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.AutomationID == "" {
			http.Error(w, `{"error":"invalid body"}`, http.StatusBadRequest)
			return
		}
		if err := queue.EnqueueAutomation(r.Context(), body.AutomationID); err != nil {
			log.Error().Err(err).Str("automation_id", body.AutomationID).Msg("HTTP enqueue failed")
			http.Error(w, `{"error":"enqueue failed"}`, http.StatusInternalServerError)
			return
		}
		log.Info().Str("automation_id", body.AutomationID).Msg("Task enqueued via HTTP")
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"queued"}`))
	})
	httpMux.HandleFunc("POST /cancel", func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			AutomationID string `json:"automation_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.AutomationID == "" {
			http.Error(w, `{"error":"invalid body"}`, http.StatusBadRequest)
			return
		}

		// Try to cancel running task
		if cancelFn, ok := cancelFuncs.LoadAndDelete(body.AutomationID); ok {
			cancelFn.(context.CancelFunc)()
			log.Info().Str("automation_id", body.AutomationID).Msg("Running task cancelled")
			w.Header().Set("Content-Type", "application/json")
			w.Write([]byte(`{"status":"cancelled"}`))
			return
		}

		// Try to delete from Asynq queue (pending task)
		inspector := asynq.NewInspector(redisOpt)
		tasks, _ := inspector.ListPendingTasks("default")
		for _, t := range tasks {
			var payload struct {
				AutomationID string `json:"automation_id"`
			}
			if json.Unmarshal(t.Payload, &payload) == nil && payload.AutomationID == body.AutomationID {
				if delErr := inspector.DeleteTask("default", t.ID); delErr == nil {
					log.Info().Str("automation_id", body.AutomationID).Msg("Pending task deleted from queue")
					w.Header().Set("Content-Type", "application/json")
					w.Write([]byte(`{"status":"cancelled"}`))
					return
				}
			}
		}

		http.Error(w, `{"error":"task not found or already completed"}`, http.StatusNotFound)
	})
	go func() {
		log.Info().Str("port", enqueuePort).Msg("HTTP enqueue endpoint started")
		if err := http.ListenAndServe(":"+enqueuePort, httpMux); err != nil {
			log.Error().Err(err).Msg("HTTP server stopped")
		}
	}()

	// 12. Start Asynq server (processes queued tasks)
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
		schema := anthropic.ToolInputSchemaParam{}
		if schemaMap, ok := t.InputSchema.(map[string]interface{}); ok {
			if props, exists := schemaMap["properties"]; exists {
				schema.Properties = props
			}
		}
		tool := anthropic.ToolUnionParamOfTool(schema, t.Name)
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

// ── DB adapter ────────────────────────────────────────────────────────────────

// dbCronAdapter adapts db.DBStore to the scheduler.CronStore interface,
// converting db.DueAutomation to scheduler.ScheduledAutomation.
type dbCronAdapter struct {
	store *db.DBStore
}

func (a *dbCronAdapter) GetDueAutomations(ctx context.Context, now time.Time) ([]scheduler.ScheduledAutomation, error) {
	due, err := a.store.GetDueAutomations(ctx, now)
	if err != nil {
		return nil, err
	}
	result := make([]scheduler.ScheduledAutomation, len(due))
	for i, d := range due {
		result[i] = scheduler.ScheduledAutomation{
			ID:           d.ID,
			ScheduleCron: d.ScheduleCron,
			Timezone:     d.Timezone,
			NextRunAt:    d.NextRunAt,
		}
	}
	return result, nil
}

func (a *dbCronAdapter) UpdateNextRunAt(ctx context.Context, automationID string, nextRunAt time.Time) error {
	return a.store.UpdateNextRunAt(ctx, automationID, nextRunAt)
}
