package scheduler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"floqi/worker/internal/agent"
	"github.com/hibiken/asynq"
	"github.com/rs/zerolog/log"
)

// RunnerFunc executes an automation by ID and returns the result or an error.
type RunnerFunc func(ctx context.Context, automationID string) (*agent.ExecutionResult, error)

// ExecutionLogger records the lifecycle of each automation execution in the database.
type ExecutionLogger interface {
	CreateExecutionLog(ctx context.Context, automationID string, status string) (string, error)
	UpdateExecutionLog(ctx context.Context, logID string, status string, output string, errorMsg string, toolCallsJSON []byte, tokensUsed int, retried bool) error
	GetLatestLogID(ctx context.Context, automationID string) (string, error)
}

// AutomationWorker processes automation:run tasks from the Asynq queue.
type AutomationWorker struct {
	run           RunnerFunc
	logger        ExecutionLogger
	getRetryCount func(ctx context.Context) int
}

// NewAutomationWorker creates a new AutomationWorker with default asynq retry count extraction.
func NewAutomationWorker(run RunnerFunc, logger ExecutionLogger) *AutomationWorker {
	return &AutomationWorker{
		run:    run,
		logger: logger,
		getRetryCount: func(ctx context.Context) int {
			n, _ := asynq.GetRetryCount(ctx)
			return n
		},
	}
}

// NewAutomationWorkerWithRetryFn creates a new AutomationWorker with a custom retry count function.
// This is intended for use in tests to inject a deterministic retry count.
func NewAutomationWorkerWithRetryFn(run RunnerFunc, logger ExecutionLogger, retryFn func(context.Context) int) *AutomationWorker {
	return &AutomationWorker{run: run, logger: logger, getRetryCount: retryFn}
}

// AutomationWorkerHandleTask is a test helper that calls the internal handleAutomationRun method.
func AutomationWorkerHandleTask(w *AutomationWorker, ctx context.Context, task *asynq.Task) error {
	return w.handleAutomationRun(ctx, task)
}

// Handler returns the Asynq task handler function for mux registration.
func (w *AutomationWorker) Handler() func(context.Context, *asynq.Task) error {
	return w.handleAutomationRun
}

// handleAutomationRun is the Asynq handler for automation:run tasks.
// It creates an execution log, runs the automation, then updates the log with the result.
// Returning an error causes Asynq to schedule a retry.
func (w *AutomationWorker) handleAutomationRun(ctx context.Context, task *asynq.Task) error {
	var payload map[string]string
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal task payload: %w", err)
	}

	automationID := payload["automation_id"]
	if automationID == "" {
		return errors.New("automationID is empty in payload")
	}

	log.Info().Str("automation_id", automationID).Msg("Processing automation task")

	retryCount := w.getRetryCount(ctx)
	retried := retryCount > 0

	var logID string
	if retryCount == 0 {
		logID, _ = w.logger.CreateExecutionLog(ctx, automationID, "running")
	} else {
		logID, _ = w.logger.GetLatestLogID(ctx, automationID)
	}

	result, err := w.run(ctx, automationID)
	if err != nil {
		log.Error().Err(err).Str("automation_id", automationID).Msg("Automation execution failed")
		w.logger.UpdateExecutionLog(ctx, logID, "error", "", err.Error(), nil, 0, retried)
		return err
	}

	var toolCallsJSON []byte
	if len(result.ToolCalls) > 0 {
		toolCallsJSON, _ = json.Marshal(result.ToolCalls)
	} else {
		toolCallsJSON = []byte("[]")
	}
	tokensUsed := int(result.InputTokens + result.OutputTokens)

	w.logger.UpdateExecutionLog(ctx, logID, "success", result.Output, "", toolCallsJSON, tokensUsed, retried)
	return nil
}
