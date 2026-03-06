package scheduler

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/hibiken/asynq"
)

// mockQueueClient captures the most recent Enqueue call for assertion.
type mockQueueClient struct {
	lastTask *asynq.Task
	lastOpts []asynq.Option
}

func (m *mockQueueClient) Enqueue(task *asynq.Task, opts ...asynq.Option) (*asynq.TaskInfo, error) {
	m.lastTask = task
	m.lastOpts = opts
	return &asynq.TaskInfo{}, nil
}

// TC-Queue-1: EnqueueAutomation success
// Verifies: no error, Enqueue called, task type = "automation:run",
// payload JSON has automation_id = "auto-123".
func TestEnqueueAutomation_Success(t *testing.T) {
	mock := &mockQueueClient{}
	queue := NewAutomationQueue(mock)

	err := queue.EnqueueAutomation(context.Background(), "auto-123")
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	if mock.lastTask == nil {
		t.Fatal("expected Enqueue to be called, but it was not")
	}

	if mock.lastTask.Type() != TaskTypeAutomationRun {
		t.Errorf("task type = %q, want %q", mock.lastTask.Type(), TaskTypeAutomationRun)
	}

	var payload struct {
		AutomationID string `json:"automation_id"`
	}
	if err := json.Unmarshal(mock.lastTask.Payload(), &payload); err != nil {
		t.Fatalf("payload is not valid JSON: %v", err)
	}
	if payload.AutomationID != "auto-123" {
		t.Errorf("payload automation_id = %q, want %q", payload.AutomationID, "auto-123")
	}
}

// TC-Queue-2: Task options verification
// Verifies: Enqueue called with at least 3 options (MaxRetry, Timeout, Queue).
func TestEnqueueAutomation_TaskOptions(t *testing.T) {
	mock := &mockQueueClient{}
	queue := NewAutomationQueue(mock)

	err := queue.EnqueueAutomation(context.Background(), "auto-456")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if mock.lastTask == nil {
		t.Fatal("expected Enqueue to be called")
	}

	// Expect MaxRetry(3), Timeout(5m), Queue("default") = at least 3 options
	const expectedMinOpts = 3
	if len(mock.lastOpts) < expectedMinOpts {
		t.Errorf("expected at least %d options (MaxRetry, Timeout, Queue), got %d",
			expectedMinOpts, len(mock.lastOpts))
	}
}

// TC-Queue-3: Empty automationID validation
// Verifies: error returned, Enqueue NOT called.
func TestEnqueueAutomation_EmptyAutomationID(t *testing.T) {
	mock := &mockQueueClient{}
	queue := NewAutomationQueue(mock)

	err := queue.EnqueueAutomation(context.Background(), "")
	if err == nil {
		t.Fatal("expected error for empty automationID, got nil")
	}

	if mock.lastTask != nil {
		t.Error("expected no task to be enqueued for empty automationID")
	}
}
