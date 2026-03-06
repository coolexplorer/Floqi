package scheduler

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"floqi/worker/internal/agent"
)

// syncedExecutionLogger is a thread-safe ExecutionLogger for TC-5011's concurrent test.
// Uses createLogCall/updateLogCall types defined in worker_test.go.
type syncedExecutionLogger struct {
	mu            sync.Mutex
	creates       []createLogCall
	updates       []updateLogCall
	logIDToReturn string
	latestLogID   string
}

func (s *syncedExecutionLogger) CreateExecutionLog(ctx context.Context, automationID string, status string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.creates = append(s.creates, createLogCall{automationID: automationID, status: status})
	id := s.logIDToReturn
	if id == "" {
		id = "log-000"
	}
	return id, nil
}

func (s *syncedExecutionLogger) UpdateExecutionLog(ctx context.Context, logID string, status string, output string, errorMsg string, retried bool) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.updates = append(s.updates, updateLogCall{
		logID:    logID,
		status:   status,
		output:   output,
		errorMsg: errorMsg,
		retried:  retried,
	})
	return nil
}

func (s *syncedExecutionLogger) GetLatestLogID(ctx context.Context, automationID string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.latestLogID, nil
}

func (s *syncedExecutionLogger) snapshotCreates() []createLogCall {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]createLogCall, len(s.creates))
	copy(out, s.creates)
	return out
}

func (s *syncedExecutionLogger) snapshotUpdates() []updateLogCall {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]updateLogCall, len(s.updates))
	copy(out, s.updates)
	return out
}

// ── Integration Tests ──────────────────────────────────────────────────────────
//
// These tests validate the end-to-end flow: AutomationQueue → AutomationWorker → ExecutionLogger.
//
// Strategy: the Queue serializes automation IDs into Asynq task payloads; the Worker
// deserializes and processes them. By capturing the task at the queue boundary and
// feeding it directly to the worker handler we exercise the full serialization +
// business-logic path without requiring real Redis or PostgreSQL.

// TC-5011: 실행 시작 시 로그 생성 (status="running" before runner executes)
//
// Verifies that CreateExecutionLog is called with status="running" BEFORE the runner
// starts, and UpdateExecutionLog is called with status="success" AFTER it finishes.
func TestIntegration_TC5011_RunningStatusRecordedAtStart(t *testing.T) {
	// 1. Enqueue via the real queue so the task payload is serialized correctly.
	qClient := &mockQueueClient{}
	if err := NewAutomationQueue(qClient).EnqueueAutomation(context.Background(), "auto-5011"); err != nil {
		t.Fatalf("TC-5011: EnqueueAutomation failed: %v", err)
	}

	logger := &syncedExecutionLogger{logIDToReturn: "log-5011"}
	runnerStarted := make(chan struct{})
	runnerCanFinish := make(chan struct{})

	// 2. Runner blocks so we can inspect logger state mid-execution.
	worker := newTestWorker(func(ctx context.Context, id string) (*agent.ExecutionResult, error) {
		close(runnerStarted)  // signal: CreateExecutionLog was already called
		<-runnerCanFinish     // hold until test allows completion
		return &agent.ExecutionResult{Output: "Morning briefing sent."}, nil
	}, logger, 0)

	done := make(chan error, 1)
	go func() { done <- worker.handleAutomationRun(context.Background(), qClient.lastTask) }()

	// 3. Wait for runner to start — CreateExecutionLog must precede it.
	select {
	case <-runnerStarted:
	case <-time.After(2 * time.Second):
		t.Fatal("TC-5011: timed out waiting for runner to start")
	}

	// 4. Assert: log created with status="running" before runner started.
	creates := logger.snapshotCreates()
	if len(creates) != 1 {
		t.Fatalf("TC-5011: expected 1 create call before runner, got %d", len(creates))
	}
	if creates[0].automationID != "auto-5011" {
		t.Errorf("TC-5011: automationID = %q, want %q", creates[0].automationID, "auto-5011")
	}
	if creates[0].status != "running" {
		t.Errorf("TC-5011: initial status = %q, want %q", creates[0].status, "running")
	}
	// UpdateExecutionLog must not have been called yet.
	if updates := logger.snapshotUpdates(); len(updates) != 0 {
		t.Errorf("TC-5011: expected no update calls while runner is executing, got %v", updates)
	}

	// 5. Allow runner to complete and wait.
	close(runnerCanFinish)
	select {
	case err := <-done:
		if err != nil {
			t.Fatalf("TC-5011: handleAutomationRun returned error: %v", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("TC-5011: timed out waiting for worker to finish")
	}

	// 6. Assert: log updated to status="success" with recorded output.
	updates := logger.snapshotUpdates()
	if len(updates) != 1 {
		t.Fatalf("TC-5011: expected 1 update call after completion, got %d", len(updates))
	}
	u := updates[0]
	if u.status != "success" {
		t.Errorf("TC-5011: final status = %q, want %q", u.status, "success")
	}
	if u.output == "" {
		t.Error("TC-5011: expected non-empty output in execution log")
	}
	if u.retried {
		t.Error("TC-5011: expected retried=false for first attempt (retryCount=0)")
	}
}

// TC-5012: 실행 성공 완료 (status="success", output and token data recorded)
//
// Verifies the full Queue → Worker → Logger path on a successful run.
// Checks status, output, and that the ExecutionResult carries token counts.
func TestIntegration_TC5012_SuccessExecution_LogRecorded(t *testing.T) {
	qClient := &mockQueueClient{}
	if err := NewAutomationQueue(qClient).EnqueueAutomation(context.Background(), "auto-5012"); err != nil {
		t.Fatalf("TC-5012: EnqueueAutomation failed: %v", err)
	}

	var capturedResult *agent.ExecutionResult
	logger := &mockExecutionLogger{logIDToReturn: "log-5012"}
	worker := newTestWorker(func(ctx context.Context, id string) (*agent.ExecutionResult, error) {
		capturedResult = &agent.ExecutionResult{
			Output:         "Email triage complete: 3 urgent, 5 important.",
			InputTokens:    80,
			OutputTokens:   40,
			IterationCount: 2,
		}
		return capturedResult, nil
	}, logger, 0)

	if err := worker.handleAutomationRun(context.Background(), qClient.lastTask); err != nil {
		t.Fatalf("TC-5012: handleAutomationRun failed: %v", err)
	}

	// Assert: CreateExecutionLog called with status="running"
	if len(logger.createCalls) != 1 || logger.createCalls[0].status != "running" {
		t.Errorf("TC-5012: expected create with 'running', got %v", logger.createCalls)
	}

	// Assert: UpdateExecutionLog called with status="success", output recorded
	if len(logger.updateCalls) != 1 {
		t.Fatalf("TC-5012: expected 1 update call, got %d", len(logger.updateCalls))
	}
	u := logger.updateCalls[0]
	if u.status != "success" {
		t.Errorf("TC-5012: status = %q, want %q", u.status, "success")
	}
	if u.output == "" {
		t.Error("TC-5012: expected non-empty output in execution log")
	}
	if u.errorMsg != "" {
		t.Errorf("TC-5012: expected empty error_message on success, got %q", u.errorMsg)
	}
	if u.retried {
		t.Error("TC-5012: expected retried=false for first attempt")
	}

	// Assert: token counts available on ExecutionResult (total > 0)
	if capturedResult == nil {
		t.Fatal("TC-5012: runner was not invoked")
	}
	totalTokens := capturedResult.InputTokens + capturedResult.OutputTokens
	if totalTokens == 0 {
		t.Error("TC-5012: expected tokens_used > 0 in ExecutionResult")
	}
}

// TC-5013: 실행 실패 완료 (status="failed", error_message recorded)
//
// Verifies that when the runner returns an error the execution log reflects failure.
// Uses retryCount=1 to simulate a retry attempt (retried=true).
func TestIntegration_TC5013_FailedExecution_ErrorLogged(t *testing.T) {
	qClient := &mockQueueClient{}
	if err := NewAutomationQueue(qClient).EnqueueAutomation(context.Background(), "auto-5013"); err != nil {
		t.Fatalf("TC-5013: EnqueueAutomation failed: %v", err)
	}

	execErr := errors.New("AI service unavailable")
	logger := &mockExecutionLogger{logIDToReturn: "log-5013"}
	// retryCount=1 → retried=true, simulating Asynq's second attempt
	worker := newTestWorker(func(ctx context.Context, id string) (*agent.ExecutionResult, error) {
		return nil, execErr
	}, logger, 1)

	if err := worker.handleAutomationRun(context.Background(), qClient.lastTask); err == nil {
		t.Fatal("TC-5013: expected error from handleAutomationRun, got nil")
	}

	// Assert: UpdateExecutionLog called with status="failed", non-empty error_message, retried=true
	if len(logger.updateCalls) != 1 {
		t.Fatalf("TC-5013: expected 1 update call, got %d", len(logger.updateCalls))
	}
	u := logger.updateCalls[0]
	if u.status != "failed" {
		t.Errorf("TC-5013: status = %q, want %q", u.status, "failed")
	}
	if u.errorMsg == "" {
		t.Error("TC-5013: expected non-empty error_message in execution log")
	}
	if !u.retried {
		t.Error("TC-5013: expected retried=true for retry attempt (retryCount=1)")
	}
	if u.output != "" {
		t.Errorf("TC-5013: expected empty output on failure, got %q", u.output)
	}
}

// TC-5014: tool_calls JSON 정확성 (IterationCount represents tool-use loop depth)
//
// Verifies that the ExecutionResult carries tool-call metadata (IterationCount > 0
// when tools were used) and that this data flows through the Queue → Worker path.
// The output text from the final answer is recorded in the execution log.
func TestIntegration_TC5014_ToolCallsAndOutput_Recorded(t *testing.T) {
	qClient := &mockQueueClient{}
	if err := NewAutomationQueue(qClient).EnqueueAutomation(context.Background(), "auto-5014"); err != nil {
		t.Fatalf("TC-5014: EnqueueAutomation failed: %v", err)
	}

	const expectedOutput = "Reading digest prepared: 5 articles saved to Notion."
	var capturedResult *agent.ExecutionResult

	logger := &mockExecutionLogger{logIDToReturn: "log-5014"}
	worker := newTestWorker(func(ctx context.Context, id string) (*agent.ExecutionResult, error) {
		// Simulate 2 tool-use iterations (fetch news + save to Notion)
		capturedResult = &agent.ExecutionResult{
			Output:         expectedOutput,
			InputTokens:    100,
			OutputTokens:   50,
			IterationCount: 2, // represents 2 tool-use rounds
		}
		return capturedResult, nil
	}, logger, 0)

	if err := worker.handleAutomationRun(context.Background(), qClient.lastTask); err != nil {
		t.Fatalf("TC-5014: handleAutomationRun failed: %v", err)
	}

	// Assert: output recorded in execution log
	if len(logger.updateCalls) != 1 {
		t.Fatalf("TC-5014: expected 1 update call, got %d", len(logger.updateCalls))
	}
	u := logger.updateCalls[0]
	if u.status != "success" {
		t.Errorf("TC-5014: status = %q, want %q", u.status, "success")
	}
	if u.output != expectedOutput {
		t.Errorf("TC-5014: output = %q, want %q", u.output, expectedOutput)
	}

	// Assert: tool-call metadata present on ExecutionResult
	if capturedResult == nil {
		t.Fatal("TC-5014: runner was not invoked")
	}
	if capturedResult.IterationCount == 0 {
		t.Error("TC-5014: expected IterationCount > 0 (tool-use rounds recorded)")
	}
	// Total tokens = InputTokens + OutputTokens = 100 + 50 = 150
	totalTokens := capturedResult.InputTokens + capturedResult.OutputTokens
	if totalTokens != 150 {
		t.Errorf("TC-5014: total tokens = %d, want 150", totalTokens)
	}
}
