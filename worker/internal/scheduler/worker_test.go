package scheduler

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"floqi/worker/internal/agent"
	"github.com/hibiken/asynq"
)

// ── Mock helpers ──────────────────────────────────────────────────────────────

// mockExecutionLogger captures CreateExecutionLog and UpdateExecutionLog calls.
type mockExecutionLogger struct {
	createCalls   []createLogCall
	updateCalls   []updateLogCall
	logIDToReturn string
	latestLogID   string
}

type createLogCall struct {
	automationID string
	status       string
}

type updateLogCall struct {
	logID          string
	status         string
	output         string
	errorMsg       string
	toolCallsJSON  []byte
	tokensUsed     int
	retried        bool
}

func (m *mockExecutionLogger) CreateExecutionLog(ctx context.Context, automationID string, status string) (string, error) {
	m.createCalls = append(m.createCalls, createLogCall{automationID: automationID, status: status})
	id := m.logIDToReturn
	if id == "" {
		id = "log-001"
	}
	return id, nil
}

func (m *mockExecutionLogger) UpdateExecutionLog(ctx context.Context, logID string, status string, output string, errorMsg string, toolCallsJSON []byte, tokensUsed int, retried bool) error {
	m.updateCalls = append(m.updateCalls, updateLogCall{
		logID:          logID,
		status:         status,
		output:         output,
		errorMsg:       errorMsg,
		toolCallsJSON:  toolCallsJSON,
		tokensUsed:     tokensUsed,
		retried:        retried,
	})
	return nil
}

func (m *mockExecutionLogger) GetLatestLogID(ctx context.Context, automationID string) (string, error) {
	return m.latestLogID, nil
}

// newTestWorker creates an AutomationWorker with an injected fixed retry count
// so tests can simulate first attempts (retryCount=0) and retries (retryCount>0).
func newTestWorker(run RunnerFunc, logger ExecutionLogger, retryCount int) *AutomationWorker {
	return &AutomationWorker{
		run:    run,
		logger: logger,
		getRetryCount: func(ctx context.Context) int {
			return retryCount
		},
	}
}

// makeTask builds an asynq.Task with the given automationID in its JSON payload.
func makeTask(automationID string) *asynq.Task {
	payload, _ := json.Marshal(map[string]string{"automation_id": automationID})
	return asynq.NewTask(TaskTypeAutomationRun, payload)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

// TC-5001: Successful automation run (first attempt)
// Verifies:
//   - handleAutomationRun returns nil
//   - CreateExecutionLog called with correct automationID
//   - UpdateExecutionLog called with status="success", retried=false, correct output
func TestHandleAutomationRun_Success(t *testing.T) {
	mockLogger := &mockExecutionLogger{}

	mockRun := func(ctx context.Context, automationID string) (*agent.ExecutionResult, error) {
		if automationID != "auto-789" {
			return nil, errors.New("unexpected automationID: " + automationID)
		}
		return &agent.ExecutionResult{Output: "Briefing sent."}, nil
	}

	worker := newTestWorker(mockRun, mockLogger, 0) // retryCount=0: first attempt
	task := makeTask("auto-789")

	err := worker.handleAutomationRun(context.Background(), task)
	if err != nil {
		t.Fatalf("TC-5001: expected nil error, got: %v", err)
	}

	// Verify execution log was created with automationID
	if len(mockLogger.createCalls) != 1 {
		t.Fatalf("TC-5001: expected 1 CreateExecutionLog call, got %d", len(mockLogger.createCalls))
	}
	if mockLogger.createCalls[0].automationID != "auto-789" {
		t.Errorf("TC-5001: CreateExecutionLog automationID = %q, want %q",
			mockLogger.createCalls[0].automationID, "auto-789")
	}

	// Verify execution log updated to success
	if len(mockLogger.updateCalls) != 1 {
		t.Fatalf("TC-5001: expected 1 UpdateExecutionLog call, got %d", len(mockLogger.updateCalls))
	}
	u := mockLogger.updateCalls[0]
	if u.status != "success" {
		t.Errorf("TC-5001: update status = %q, want %q", u.status, "success")
	}
	if u.retried {
		t.Error("TC-5001: expected retried=false for first attempt (retryCount=0)")
	}
	if u.output != "Briefing sent." {
		t.Errorf("TC-5001: update output = %q, want %q", u.output, "Briefing sent.")
	}
}

// TC-5015: API timeout triggers Asynq retry
// When ExecuteAutomation returns context.DeadlineExceeded, the handler must:
//   - Return an error (so Asynq retries the task)
//   - Propagate context.DeadlineExceeded
//   - Update execution log with status="error" and non-empty error_message
func TestHandleAutomationRun_APITimeout_TriggersRetry(t *testing.T) {
	mockLogger := &mockExecutionLogger{}

	mockRun := func(ctx context.Context, automationID string) (*agent.ExecutionResult, error) {
		return nil, context.DeadlineExceeded
	}

	worker := newTestWorker(mockRun, mockLogger, 0)
	task := makeTask("auto-101")

	err := worker.handleAutomationRun(context.Background(), task)
	if err == nil {
		t.Fatal("TC-5015: expected error (to trigger Asynq retry), got nil")
	}
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Errorf("TC-5015: error = %v, want to wrap context.DeadlineExceeded", err)
	}

	// Verify execution log updated with failure
	if len(mockLogger.updateCalls) != 1 {
		t.Fatalf("TC-5015: expected 1 UpdateExecutionLog call, got %d", len(mockLogger.updateCalls))
	}
	u := mockLogger.updateCalls[0]
	if u.status != "error" {
		t.Errorf("TC-5015: update status = %q, want %q", u.status, "error")
	}
	if u.errorMsg == "" {
		t.Error("TC-5015: expected non-empty error_message in execution log")
	}
}

// TC-5016: 2 failures then success — 3rd attempt succeeds
// Simulates retryCount=2 (third attempt after two prior failures).
// Verifies:
//   - handleAutomationRun returns nil
//   - UpdateExecutionLog called with status="success", retried=true
func TestHandleAutomationRun_RetryThenSuccess(t *testing.T) {
	mockLogger := &mockExecutionLogger{}

	mockRun := func(ctx context.Context, automationID string) (*agent.ExecutionResult, error) {
		return &agent.ExecutionResult{Output: "Completed after retries."}, nil
	}

	// retryCount=2: this is the 3rd attempt (after 2 failures)
	worker := newTestWorker(mockRun, mockLogger, 2)
	task := makeTask("auto-202")

	err := worker.handleAutomationRun(context.Background(), task)
	if err != nil {
		t.Fatalf("TC-5016: expected nil error on successful retry, got: %v", err)
	}

	if len(mockLogger.updateCalls) != 1 {
		t.Fatalf("TC-5016: expected 1 UpdateExecutionLog call, got %d", len(mockLogger.updateCalls))
	}
	u := mockLogger.updateCalls[0]
	if u.status != "success" {
		t.Errorf("TC-5016: update status = %q, want %q", u.status, "success")
	}
	if !u.retried {
		t.Error("TC-5016: expected retried=true because retryCount=2")
	}
	if u.output != "Completed after retries." {
		t.Errorf("TC-5016: update output = %q, want %q", u.output, "Completed after retries.")
	}
}

// TC-5017: 3 failures → final failure
// Simulates retryCount=2 (third/final attempt) where execution still fails.
// Verifies:
//   - handleAutomationRun returns non-nil error
//   - UpdateExecutionLog called with status="failed", retried=true, non-empty error_message
func TestHandleAutomationRun_AllRetriesFailed(t *testing.T) {
	mockLogger := &mockExecutionLogger{}

	execErr := errors.New("AI service unavailable")
	mockRun := func(ctx context.Context, automationID string) (*agent.ExecutionResult, error) {
		return nil, execErr
	}

	// retryCount=2: third attempt (MaxRetry=2 → no more retries after this)
	worker := newTestWorker(mockRun, mockLogger, 2)
	task := makeTask("auto-303")

	err := worker.handleAutomationRun(context.Background(), task)
	if err == nil {
		t.Fatal("TC-5017: expected error for permanently failed automation, got nil")
	}

	if len(mockLogger.updateCalls) != 1 {
		t.Fatalf("TC-5017: expected 1 UpdateExecutionLog call, got %d", len(mockLogger.updateCalls))
	}
	u := mockLogger.updateCalls[0]
	if u.status != "error" {
		t.Errorf("TC-5017: update status = %q, want %q", u.status, "error")
	}
	if !u.retried {
		t.Error("TC-5017: expected retried=true because retryCount=2")
	}
	if u.errorMsg == "" {
		t.Error("TC-5017: expected non-empty error_message in execution log")
	}
}

// Issue 2: invalid JSON payload returns error immediately.
func TestHandleAutomationRun_InvalidPayload_ReturnsError(t *testing.T) {
	mockLogger := &mockExecutionLogger{}
	worker := newTestWorker(nil, mockLogger, 0)
	task := asynq.NewTask(TaskTypeAutomationRun, []byte("not-json"))

	err := worker.handleAutomationRun(context.Background(), task)
	if err == nil {
		t.Fatal("expected error for invalid JSON payload, got nil")
	}
	if len(mockLogger.createCalls) != 0 {
		t.Error("expected no CreateExecutionLog call on invalid payload")
	}
}

// Issue 2: empty automationID in payload returns error.
func TestHandleAutomationRun_EmptyAutomationID_ReturnsError(t *testing.T) {
	mockLogger := &mockExecutionLogger{}
	worker := newTestWorker(nil, mockLogger, 0)
	payload, _ := json.Marshal(map[string]string{"automation_id": ""})
	task := asynq.NewTask(TaskTypeAutomationRun, payload)

	err := worker.handleAutomationRun(context.Background(), task)
	if err == nil {
		t.Fatal("expected error for empty automationID, got nil")
	}
}

// Issue 1: on retry (retryCount>0), GetLatestLogID is used instead of CreateExecutionLog.
func TestHandleAutomationRun_Retry_UsesGetLatestLogID(t *testing.T) {
	mockLogger := &mockExecutionLogger{latestLogID: "log-retry-999"}

	mockRun := func(ctx context.Context, automationID string) (*agent.ExecutionResult, error) {
		return &agent.ExecutionResult{Output: "retry success"}, nil
	}

	worker := newTestWorker(mockRun, mockLogger, 1) // retryCount=1: second attempt
	task := makeTask("auto-retry")

	err := worker.handleAutomationRun(context.Background(), task)
	if err != nil {
		t.Fatalf("expected nil error on retry success, got: %v", err)
	}

	// CreateExecutionLog must NOT be called on retry
	if len(mockLogger.createCalls) != 0 {
		t.Errorf("expected 0 CreateExecutionLog calls on retry, got %d", len(mockLogger.createCalls))
	}

	// UpdateExecutionLog must use the logID from GetLatestLogID
	if len(mockLogger.updateCalls) != 1 {
		t.Fatalf("expected 1 UpdateExecutionLog call, got %d", len(mockLogger.updateCalls))
	}
	if mockLogger.updateCalls[0].logID != "log-retry-999" {
		t.Errorf("logID = %q, want %q", mockLogger.updateCalls[0].logID, "log-retry-999")
	}
}
