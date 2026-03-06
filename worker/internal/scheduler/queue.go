package scheduler

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/hibiken/asynq"
)

const TaskTypeAutomationRun = "automation:run"

// QueueClient abstracts the asynq.Client Enqueue operation for testability.
type QueueClient interface {
	Enqueue(task *asynq.Task, opts ...asynq.Option) (*asynq.TaskInfo, error)
}

// AutomationQueue enqueues automation:run tasks to Redis via Asynq.
type AutomationQueue struct {
	client QueueClient
}

// NewAutomationQueue creates a new AutomationQueue backed by the given client.
func NewAutomationQueue(client QueueClient) *AutomationQueue {
	return &AutomationQueue{client: client}
}

// EnqueueAutomation enqueues an automation run task with MaxRetry=3, Timeout=5m, Queue="default".
// Returns an error if automationID is empty or the enqueue operation fails.
func (q *AutomationQueue) EnqueueAutomation(ctx context.Context, automationID string) error {
	if automationID == "" {
		return errors.New("automationID cannot be empty")
	}

	payload, _ := json.Marshal(map[string]string{"automation_id": automationID})
	task := asynq.NewTask(TaskTypeAutomationRun, payload)

	opts := []asynq.Option{
		asynq.MaxRetry(3),
		asynq.Timeout(5 * time.Minute),
		asynq.Queue("default"),
	}

	_, err := q.client.Enqueue(task, opts...)
	return err
}
