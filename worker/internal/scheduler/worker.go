package scheduler

import (
	"context"
	"encoding/json"

	"floqi/worker/internal/agent"
	"github.com/hibiken/asynq"
)

// RunnerFunc executes an automation by ID and returns the result or an error.
type RunnerFunc func(ctx context.Context, automationID string) (*agent.ExecutionResult, error)

// ExecutionLogger records the lifecycle of each automation execution in the database.
type ExecutionLogger interface {
	CreateExecutionLog(ctx context.Context, automationID string, status string) (string, error)
	UpdateExecutionLog(ctx context.Context, logID string, status string, output string, errorMsg string, retried bool) error
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

// handleAutomationRun is the Asynq handler for automation:run tasks.
// It creates an execution log, runs the automation, then updates the log with the result.
// Returning an error causes Asynq to schedule a retry.
func (w *AutomationWorker) handleAutomationRun(ctx context.Context, task *asynq.Task) error {
	var payload map[string]string
	json.Unmarshal(task.Payload(), &payload)
	automationID := payload["automation_id"]

	retryCount := w.getRetryCount(ctx)
	retried := retryCount > 0

	var logID string
	if retryCount == 0 {
		logID, _ = w.logger.CreateExecutionLog(ctx, automationID, "running")
	}

	result, err := w.run(ctx, automationID)
	if err != nil {
		w.logger.UpdateExecutionLog(ctx, logID, "failed", "", err.Error(), retried)
		return err
	}

	w.logger.UpdateExecutionLog(ctx, logID, "success", result.Output, "", retried)
	return nil
}
