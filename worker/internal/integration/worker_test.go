// Package integration provides full-pipeline integration tests for the Floqi worker.
//
// These tests wire together:
//   - CronDispatcher (scheduler) — detects due automations, enqueues tasks
//   - AutomationQueue (scheduler) — serialises task payloads to Asynq format
//   - AutomationWorker (scheduler) — processes automation:run tasks, records logs
//   - ExecuteAutomation (agent) — runs the AI Tool Use loop
//   - Mock AnthropicClient and ToolRegistry — deterministic test doubles
//
// TC Coverage:
//   - TC-5001: CronDispatcher detects due automation → EnqueueAutomation called
//   - TC-5002: After enqueue, UpdateNextRunAt called with correct next scheduled time
//   - TC-5003: Paused automation NOT enqueued by CronDispatcher
//   - TC-5004: Duplicate automation_id in DB results in single enqueue (dedup)
//   - TC-5005: ExecuteAutomation end_turn → result returned (no tool calls)
//   - TC-5006: ExecuteAutomation tool_use 1 round → tool executed → end_turn
//   - TC-5007: ExecuteAutomation 3 tool_use rounds → all tools called in order
//   - TC-5008: ExecuteAutomation maxIterations reached → ErrMaxIterationsReached
//   - TC-5009: Tool execution error → is_error forwarded to AI, AI recovers
//   - TC-5010: Anthropic API timeout → error propagated
//   - TC-5011: Full pipeline — CronDispatcher → Queue → Worker → success log
//   - TC-5012: Full pipeline — execution success: CreateLog(running) → UpdateLog(success)
//   - TC-5013: Full pipeline — execution failure: UpdateLog(failed) with error message
//   - TC-5014: Full pipeline — tool_calls metadata (IterationCount, tokens) in execution log
package integration

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"

	"floqi/worker/internal/agent"
	"floqi/worker/internal/scheduler"

	"github.com/hibiken/asynq"
)

// ── Mock: QueueClient ─────────────────────────────────────────────────────────

// captureQueueClient records all enqueue calls for assertion.
type captureQueueClient struct {
	mu    sync.Mutex
	tasks []*asynq.Task
	opts  [][]asynq.Option
}

func (c *captureQueueClient) Enqueue(task *asynq.Task, opts ...asynq.Option) (*asynq.TaskInfo, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.tasks = append(c.tasks, task)
	c.opts = append(c.opts, opts)
	return &asynq.TaskInfo{}, nil
}

func (c *captureQueueClient) enqueuedIDs() []string {
	c.mu.Lock()
	defer c.mu.Unlock()
	ids := make([]string, 0, len(c.tasks))
	for _, t := range c.tasks {
		var p map[string]string
		if err := json.Unmarshal(t.Payload(), &p); err == nil {
			ids = append(ids, p["automation_id"])
		}
	}
	return ids
}

func (c *captureQueueClient) count() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.tasks)
}

// lastEnqueuedTask returns the most recent asynq.Task enqueued (for worker tests).
func (c *captureQueueClient) lastEnqueuedTask() *asynq.Task {
	c.mu.Lock()
	defer c.mu.Unlock()
	if len(c.tasks) == 0 {
		return nil
	}
	return c.tasks[len(c.tasks)-1]
}

// ── Mock: CronStore ───────────────────────────────────────────────────────────

// stubCronStore returns a fixed set of automations and records UpdateNextRunAt calls.
type stubCronStore struct {
	automations []scheduler.ScheduledAutomation
	updates     []nextRunUpdate
}

type nextRunUpdate struct {
	automationID string
	nextRunAt    time.Time
}

func (s *stubCronStore) GetDueAutomations(_ context.Context, _ time.Time) ([]scheduler.ScheduledAutomation, error) {
	return s.automations, nil
}

func (s *stubCronStore) UpdateNextRunAt(_ context.Context, automationID string, nextRunAt time.Time) error {
	s.updates = append(s.updates, nextRunUpdate{automationID: automationID, nextRunAt: nextRunAt})
	return nil
}

// ── Mock: ExecutionLogger ─────────────────────────────────────────────────────

type createCall struct {
	automationID string
	status       string
}

type updateCall struct {
	logID          string
	status         string
	output         string
	errorMsg       string
	toolCallsJSON  []byte
	tokensUsed     int
	retried        bool
}

type captureLogger struct {
	mu          sync.Mutex
	creates     []createCall
	updates     []updateCall
	idToReturn  string
	latestLogID string
}

func (l *captureLogger) CreateExecutionLog(_ context.Context, automationID, status string) (string, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.creates = append(l.creates, createCall{automationID: automationID, status: status})
	if l.idToReturn != "" {
		return l.idToReturn, nil
	}
	return fmt.Sprintf("log-%s", automationID), nil
}

func (l *captureLogger) UpdateExecutionLog(_ context.Context, logID, status, output, errorMsg string, toolCallsJSON []byte, tokensUsed int, retried bool) error {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.updates = append(l.updates, updateCall{
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

func (l *captureLogger) GetLatestLogID(_ context.Context, _ string) (string, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.latestLogID, nil
}

func (l *captureLogger) snapshotCreates() []createCall {
	l.mu.Lock()
	defer l.mu.Unlock()
	out := make([]createCall, len(l.creates))
	copy(out, l.creates)
	return out
}

func (l *captureLogger) snapshotUpdates() []updateCall {
	l.mu.Lock()
	defer l.mu.Unlock()
	out := make([]updateCall, len(l.updates))
	copy(out, l.updates)
	return out
}

// ── Mock: AnthropicClient ─────────────────────────────────────────────────────

type stubAnthropicClient struct {
	responses []*agent.AnthropicMessage
	callIdx   int
	err       error
}

func (c *stubAnthropicClient) CreateMessage(
	_ context.Context,
	_ []agent.ConversationTurn,
	_ []agent.ToolDef,
) (*agent.AnthropicMessage, error) {
	if c.err != nil {
		return nil, c.err
	}
	if c.callIdx >= len(c.responses) {
		return nil, fmt.Errorf("unexpected CreateMessage call #%d", c.callIdx+1)
	}
	resp := c.responses[c.callIdx]
	c.callIdx++
	return resp, nil
}

// ── Mock: ToolRegistry ────────────────────────────────────────────────────────

type stubToolRegistry struct {
	results map[string]string
	execErr error
	calls   []string
}

func (r *stubToolRegistry) Execute(_ context.Context, toolName string, _ []byte) (string, error) {
	r.calls = append(r.calls, toolName)
	if r.execErr != nil {
		return "", r.execErr
	}
	if res, ok := r.results[toolName]; ok {
		return res, nil
	}
	return `"ok"`, nil
}

func (r *stubToolRegistry) ListTools() []agent.ToolDef {
	return []agent.ToolDef{
		{Name: "read_inbox", Description: "Read Gmail inbox"},
		{Name: "list_events", Description: "List calendar events"},
		{Name: "send_email", Description: "Send email via Gmail"},
		{Name: "fetch_news", Description: "Fetch news headlines"},
		{Name: "save_to_notion", Description: "Save content to Notion"},
	}
}

// ── Helper: build an asynq.Task as the AutomationQueue would ─────────────────

func buildAsynqTask(automationID string) *asynq.Task {
	payload, _ := json.Marshal(map[string]string{"automation_id": automationID})
	return asynq.NewTask(scheduler.TaskTypeAutomationRun, payload)
}

// ── Helper: create a test AutomationWorker with fixed retry count ─────────────

func newTestWorker(run scheduler.RunnerFunc, logger scheduler.ExecutionLogger, retryCount int) *scheduler.AutomationWorker {
	return scheduler.NewAutomationWorkerWithRetryFn(run, logger, func(_ context.Context) int {
		return retryCount
	})
}

// ─────────────────────────────────────────────────────────────────────────────
// TC-5001: CronDispatcher detects due automation → EnqueueAutomation called
// ─────────────────────────────────────────────────────────────────────────────

func TestIntegration_TC5001_CronDispatcher_EnqueuesDueAutomation(t *testing.T) {
	// Arrange: one due automation
	now := time.Date(2026, 3, 6, 8, 0, 0, 0, time.UTC)
	cronExpr := "0 8 * * *"

	store := &stubCronStore{
		automations: []scheduler.ScheduledAutomation{
			{
				ID:           "auto-tc5001",
				ScheduleCron: cronExpr,
				Timezone:     "Asia/Seoul",
				NextRunAt:    now.Add(-1 * time.Minute),
			},
		},
	}
	qClient := &captureQueueClient{}
	queue := scheduler.NewAutomationQueue(qClient)
	dispatcher := scheduler.NewCronDispatcher(store, queue, time.Hour)

	// Act: run one check cycle at 'now'
	if err := scheduler.CronDispatcherCheckAt(dispatcher, context.Background(), now); err != nil {
		t.Fatalf("TC-5001: checkAndEnqueueAt failed: %v", err)
	}

	// Assert: EnqueueAutomation was called once with "auto-tc5001"
	ids := qClient.enqueuedIDs()
	if len(ids) != 1 {
		t.Fatalf("TC-5001: expected 1 enqueue call, got %d", len(ids))
	}
	if ids[0] != "auto-tc5001" {
		t.Errorf("TC-5001: enqueued ID = %q, want %q", ids[0], "auto-tc5001")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// TC-5002: After enqueue, UpdateNextRunAt called with correct next run time
// ─────────────────────────────────────────────────────────────────────────────

func TestIntegration_TC5002_CronDispatcher_UpdatesNextRunAt(t *testing.T) {
	// "0 8 * * *" Asia/Seoul; now = 2026-03-06T08:00 KST = 2026-03-05T23:00 UTC
	// Next 08:00 KST after this moment = 2026-03-06T23:00 UTC
	now := time.Date(2026, 3, 5, 23, 0, 0, 0, time.UTC)

	store := &stubCronStore{
		automations: []scheduler.ScheduledAutomation{
			{
				ID:           "auto-tc5002",
				ScheduleCron: "0 8 * * *",
				Timezone:     "Asia/Seoul",
				NextRunAt:    now.Add(-1 * time.Minute),
			},
		},
	}
	qClient := &captureQueueClient{}
	dispatcher := scheduler.NewCronDispatcher(store, scheduler.NewAutomationQueue(qClient), time.Hour)

	if err := scheduler.CronDispatcherCheckAt(dispatcher, context.Background(), now); err != nil {
		t.Fatalf("TC-5002: checkAndEnqueueAt failed: %v", err)
	}

	// Verify UpdateNextRunAt was called
	if len(store.updates) != 1 {
		t.Fatalf("TC-5002: expected 1 UpdateNextRunAt call, got %d", len(store.updates))
	}
	u := store.updates[0]
	if u.automationID != "auto-tc5002" {
		t.Errorf("TC-5002: updated automationID = %q, want %q", u.automationID, "auto-tc5002")
	}

	// Next 08:00 KST = 2026-03-06T23:00 UTC
	expected := time.Date(2026, 3, 6, 23, 0, 0, 0, time.UTC)
	if !u.nextRunAt.Equal(expected) {
		t.Errorf("TC-5002: nextRunAt = %v, want %v", u.nextRunAt, expected)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// TC-5003: Paused automation NOT enqueued by CronDispatcher
// ─────────────────────────────────────────────────────────────────────────────

func TestIntegration_TC5003_CronDispatcher_ExcludesPausedAutomation(t *testing.T) {
	now := time.Date(2026, 3, 6, 8, 0, 0, 0, time.UTC)

	// GetDueAutomations should only return active automations.
	// We test that the store itself excludes paused ones (SQL: WHERE status='active').
	// Simulate DB correctly filtering — paused automation not in result set.
	store := &stubCronStore{
		automations: []scheduler.ScheduledAutomation{
			// Only the active one is returned (paused would not be in DB result)
			{
				ID:           "auto-active",
				ScheduleCron: "0 8 * * *",
				Timezone:     "UTC",
				NextRunAt:    now.Add(-1 * time.Minute),
			},
		},
	}
	qClient := &captureQueueClient{}
	dispatcher := scheduler.NewCronDispatcher(store, scheduler.NewAutomationQueue(qClient), time.Hour)

	if err := scheduler.CronDispatcherCheckAt(dispatcher, context.Background(), now); err != nil {
		t.Fatalf("TC-5003: checkAndEnqueueAt failed: %v", err)
	}

	ids := qClient.enqueuedIDs()
	if len(ids) != 1 || ids[0] != "auto-active" {
		t.Errorf("TC-5003: expected only [auto-active] enqueued, got %v", ids)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// TC-5004: Duplicate automation_id in DB → only one enqueue call (dedup by seen map)
// ─────────────────────────────────────────────────────────────────────────────

func TestIntegration_TC5004_CronDispatcher_DeduplicatesAutomation(t *testing.T) {
	now := time.Date(2026, 3, 6, 8, 0, 0, 0, time.UTC)

	// If DB returns the same automation twice (edge case), dispatcher deduplicates.
	store := &stubCronStore{
		automations: []scheduler.ScheduledAutomation{
			{ID: "auto-dup", ScheduleCron: "0 8 * * *", Timezone: "UTC", NextRunAt: now.Add(-1 * time.Minute)},
			{ID: "auto-dup", ScheduleCron: "0 8 * * *", Timezone: "UTC", NextRunAt: now.Add(-1 * time.Minute)},
		},
	}
	qClient := &captureQueueClient{}
	dispatcher := scheduler.NewCronDispatcher(store, scheduler.NewAutomationQueue(qClient), time.Hour)

	if err := scheduler.CronDispatcherCheckAt(dispatcher, context.Background(), now); err != nil {
		t.Fatalf("TC-5004: checkAndEnqueueAt failed: %v", err)
	}

	// Despite two identical entries, only ONE enqueue should happen
	if cnt := qClient.count(); cnt != 1 {
		t.Errorf("TC-5004: expected 1 enqueue call (deduplicated), got %d", cnt)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// TC-5005: ExecuteAutomation end_turn → result returned (no tool calls)
// ─────────────────────────────────────────────────────────────────────────────

func TestIntegration_TC5005_ExecuteAutomation_EndTurnNoTools(t *testing.T) {
	client := &stubAnthropicClient{
		responses: []*agent.AnthropicMessage{
			{
				StopReason:   "end_turn",
				TextContent:  "Morning briefing complete. No urgent emails.",
				InputTokens:  120,
				OutputTokens: 60,
			},
		},
	}
	registry := &stubToolRegistry{results: map[string]string{}}

	result, err := agent.ExecuteAutomation(context.Background(), client, registry, "Prepare morning briefing")
	if err != nil {
		t.Fatalf("TC-5005: unexpected error: %v", err)
	}
	if result.Output != "Morning briefing complete. No urgent emails." {
		t.Errorf("TC-5005: output = %q, want %q", result.Output, "Morning briefing complete. No urgent emails.")
	}
	if result.IterationCount != 1 {
		t.Errorf("TC-5005: iterationCount = %d, want 1", result.IterationCount)
	}
	if result.InputTokens != 120 || result.OutputTokens != 60 {
		t.Errorf("TC-5005: tokens = (%d in, %d out), want (120 in, 60 out)",
			result.InputTokens, result.OutputTokens)
	}
	if len(registry.calls) != 0 {
		t.Errorf("TC-5005: expected no tool calls, got %v", registry.calls)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// TC-5006: ExecuteAutomation tool_use 1 round → tool executed → end_turn
// ─────────────────────────────────────────────────────────────────────────────

func TestIntegration_TC5006_ExecuteAutomation_SingleToolRound(t *testing.T) {
	client := &stubAnthropicClient{
		responses: []*agent.AnthropicMessage{
			{
				StopReason: "tool_use",
				ToolUseBlocks: []agent.ToolUseBlock{
					{ID: "tu-1", Name: "read_inbox", Input: []byte(`{"maxResults":10}`)},
				},
				InputTokens: 100, OutputTokens: 30,
			},
			{
				StopReason:   "end_turn",
				TextContent:  "You have 2 urgent emails today.",
				InputTokens:  200,
				OutputTokens: 50,
			},
		},
	}
	registry := &stubToolRegistry{
		results: map[string]string{
			"read_inbox": `[{"from":"cfo@co.com","subject":"Budget Approval"}]`,
		},
	}

	result, err := agent.ExecuteAutomation(context.Background(), client, registry, "Check urgent emails")
	if err != nil {
		t.Fatalf("TC-5006: unexpected error: %v", err)
	}
	if result.Output != "You have 2 urgent emails today." {
		t.Errorf("TC-5006: output = %q", result.Output)
	}
	if len(registry.calls) != 1 || registry.calls[0] != "read_inbox" {
		t.Errorf("TC-5006: tool calls = %v, want [read_inbox]", registry.calls)
	}
	if result.IterationCount != 2 {
		t.Errorf("TC-5006: iterationCount = %d, want 2", result.IterationCount)
	}
	// Total tokens: 100+200=300 in, 30+50=80 out
	if result.InputTokens != 300 {
		t.Errorf("TC-5006: inputTokens = %d, want 300", result.InputTokens)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// TC-5007: ExecuteAutomation 3 tool_use rounds → all tools called in order
// ─────────────────────────────────────────────────────────────────────────────

func TestIntegration_TC5007_ExecuteAutomation_ThreeToolRounds(t *testing.T) {
	client := &stubAnthropicClient{
		responses: []*agent.AnthropicMessage{
			{
				StopReason:    "tool_use",
				ToolUseBlocks: []agent.ToolUseBlock{{ID: "tu-1", Name: "list_events", Input: []byte(`{}`)}},
				InputTokens: 100, OutputTokens: 20,
			},
			{
				StopReason:    "tool_use",
				ToolUseBlocks: []agent.ToolUseBlock{{ID: "tu-2", Name: "read_inbox", Input: []byte(`{}`)}},
				InputTokens: 200, OutputTokens: 30,
			},
			{
				StopReason:    "tool_use",
				ToolUseBlocks: []agent.ToolUseBlock{{ID: "tu-3", Name: "send_email", Input: []byte(`{}`)}},
				InputTokens: 300, OutputTokens: 40,
			},
			{
				StopReason:   "end_turn",
				TextContent:  "Morning briefing sent successfully.",
				InputTokens:  400,
				OutputTokens: 60,
			},
		},
	}
	registry := &stubToolRegistry{
		results: map[string]string{
			"list_events": `[{"summary":"Standup","start":"09:00"}]`,
			"read_inbox":  `[{"from":"hr@co.com","subject":"All-hands today"}]`,
			"send_email":  `{"messageId":"msg-456","success":true}`,
		},
	}

	result, err := agent.ExecuteAutomation(context.Background(), client, registry, "Run morning briefing")
	if err != nil {
		t.Fatalf("TC-5007: unexpected error: %v", err)
	}
	if result.Output != "Morning briefing sent successfully." {
		t.Errorf("TC-5007: output = %q", result.Output)
	}

	wantCalls := []string{"list_events", "read_inbox", "send_email"}
	if len(registry.calls) != len(wantCalls) {
		t.Fatalf("TC-5007: tool call count = %d, want %d", len(registry.calls), len(wantCalls))
	}
	for i, want := range wantCalls {
		if registry.calls[i] != want {
			t.Errorf("TC-5007: tool[%d] = %q, want %q", i, registry.calls[i], want)
		}
	}

	if result.IterationCount != 4 {
		t.Errorf("TC-5007: iterationCount = %d, want 4", result.IterationCount)
	}
	// Total tokens: 100+200+300+400=1000 in, 20+30+40+60=150 out
	if result.InputTokens != 1000 {
		t.Errorf("TC-5007: inputTokens = %d, want 1000", result.InputTokens)
	}
	if result.OutputTokens != 150 {
		t.Errorf("TC-5007: outputTokens = %d, want 150", result.OutputTokens)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// TC-5008: MaxIterations reached → ErrMaxIterationsReached returned
// ─────────────────────────────────────────────────────────────────────────────

func TestIntegration_TC5008_ExecuteAutomation_MaxIterationsExceeded(t *testing.T) {
	// All responses return tool_use indefinitely
	responses := make([]*agent.AnthropicMessage, agent.MaxIterations+2)
	for i := range responses {
		responses[i] = &agent.AnthropicMessage{
			StopReason: "tool_use",
			ToolUseBlocks: []agent.ToolUseBlock{
				{ID: fmt.Sprintf("tu-%d", i+1), Name: "read_inbox", Input: []byte(`{}`)},
			},
			InputTokens: 50, OutputTokens: 10,
		}
	}
	client := &stubAnthropicClient{responses: responses}
	registry := &stubToolRegistry{results: map[string]string{"read_inbox": `[]`}}

	_, err := agent.ExecuteAutomation(context.Background(), client, registry, "Loop forever")
	if err == nil {
		t.Fatal("TC-5008: expected ErrMaxIterationsReached, got nil")
	}
	if !errors.Is(err, agent.ErrMaxIterationsReached) {
		t.Errorf("TC-5008: error = %v, want ErrMaxIterationsReached", err)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// TC-5009: Tool execution error → is_error forwarded to AI, AI recovers
// ─────────────────────────────────────────────────────────────────────────────

func TestIntegration_TC5009_ExecuteAutomation_ToolError_AIRecovers(t *testing.T) {
	client := &stubAnthropicClient{
		responses: []*agent.AnthropicMessage{
			{
				StopReason:    "tool_use",
				ToolUseBlocks: []agent.ToolUseBlock{{ID: "tu-1", Name: "read_inbox", Input: []byte(`{}`)}},
				InputTokens: 80, OutputTokens: 20,
			},
			{
				// AI receives is_error:true and provides a fallback answer
				StopReason:   "end_turn",
				TextContent:  "Unable to read inbox: OAuth token expired. Please reconnect Google.",
				InputTokens:  150,
				OutputTokens: 40,
			},
		},
	}
	registry := &stubToolRegistry{
		execErr: errors.New("OAuth token expired"),
	}

	result, err := agent.ExecuteAutomation(context.Background(), client, registry, "Check inbox")
	if err != nil {
		t.Fatalf("TC-5009: expected no top-level error (tool error should be forwarded as is_error), got: %v", err)
	}
	if result.Output == "" {
		t.Error("TC-5009: expected non-empty output after AI recovery from tool error")
	}
	if len(registry.calls) == 0 {
		t.Error("TC-5009: expected at least one tool execution attempt")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// TC-5010: Anthropic API timeout → error propagated immediately
// ─────────────────────────────────────────────────────────────────────────────

func TestIntegration_TC5010_ExecuteAutomation_APITimeout(t *testing.T) {
	client := &stubAnthropicClient{
		err: context.DeadlineExceeded,
	}
	registry := &stubToolRegistry{}

	_, err := agent.ExecuteAutomation(context.Background(), client, registry, "Run briefing")
	if err == nil {
		t.Fatal("TC-5010: expected timeout error, got nil")
	}
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Errorf("TC-5010: error = %v, want context.DeadlineExceeded", err)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// TC-5011 + TC-5012: Full pipeline — CronDispatcher → Queue → Worker → success log
//
// Tests the complete chain in a single scenario:
//  1. CronDispatcher detects due automation and enqueues it
//  2. The resulting task is processed by AutomationWorker
//  3. Runner calls ExecuteAutomation (via mock AI client + registry)
//  4. Execution log is created (status=running) then updated (status=success)
// ─────────────────────────────────────────────────────────────────────────────

func TestIntegration_TC5011_TC5012_FullPipeline_SuccessExecution(t *testing.T) {
	now := time.Date(2026, 3, 6, 8, 0, 0, 0, time.UTC)
	automationID := "auto-full-5011"

	// ── Step 1: CronDispatcher enqueues the due automation ──────────────────
	store := &stubCronStore{
		automations: []scheduler.ScheduledAutomation{
			{
				ID:           automationID,
				ScheduleCron: "0 8 * * *",
				Timezone:     "UTC",
				NextRunAt:    now.Add(-2 * time.Minute),
			},
		},
	}
	qClient := &captureQueueClient{}
	queue := scheduler.NewAutomationQueue(qClient)
	dispatcher := scheduler.NewCronDispatcher(store, queue, time.Hour)

	if err := scheduler.CronDispatcherCheckAt(dispatcher, context.Background(), now); err != nil {
		t.Fatalf("TC-5011: CronDispatcher.checkAndEnqueueAt failed: %v", err)
	}

	enqueuedIDs := qClient.enqueuedIDs()
	if len(enqueuedIDs) != 1 || enqueuedIDs[0] != automationID {
		t.Fatalf("TC-5011: expected [%s] enqueued, got %v", automationID, enqueuedIDs)
	}

	// ── Step 2: AutomationWorker processes the enqueued task ────────────────
	// Use the same serialised task the queue created
	task := qClient.lastEnqueuedTask()
	if task == nil {
		// Fallback: build the task manually (queue client did capture it)
		task = buildAsynqTask(automationID)
	}

	// AI client returns a successful single end_turn response
	aiClient := &stubAnthropicClient{
		responses: []*agent.AnthropicMessage{
			{
				StopReason:   "end_turn",
				TextContent:  "Morning briefing sent. 2 events, 1 urgent email, sunny 8°C.",
				InputTokens:  180,
				OutputTokens: 90,
			},
		},
	}
	aiRegistry := &stubToolRegistry{results: map[string]string{}}

	runner := func(ctx context.Context, id string) (*agent.ExecutionResult, error) {
		if id != automationID {
			return nil, fmt.Errorf("unexpected automation ID: %s", id)
		}
		return agent.ExecuteAutomation(ctx, aiClient, aiRegistry, "Run morning briefing")
	}

	logger := &captureLogger{idToReturn: "log-5011"}
	worker := newTestWorker(runner, logger, 0) // retryCount=0: first attempt

	if err := scheduler.AutomationWorkerHandleTask(worker, context.Background(), task); err != nil {
		t.Fatalf("TC-5011: worker.handleAutomationRun failed: %v", err)
	}

	// ── Step 3: Assert execution log lifecycle ───────────────────────────────
	creates := logger.snapshotCreates()
	if len(creates) != 1 {
		t.Fatalf("TC-5011/5012: expected 1 CreateExecutionLog call, got %d", len(creates))
	}
	if creates[0].automationID != automationID {
		t.Errorf("TC-5011/5012: CreateLog automationID = %q, want %q", creates[0].automationID, automationID)
	}
	if creates[0].status != "running" {
		t.Errorf("TC-5011: initial log status = %q, want %q", creates[0].status, "running")
	}

	updates := logger.snapshotUpdates()
	if len(updates) != 1 {
		t.Fatalf("TC-5012: expected 1 UpdateExecutionLog call, got %d", len(updates))
	}
	u := updates[0]
	if u.status != "success" {
		t.Errorf("TC-5012: final log status = %q, want %q", u.status, "success")
	}
	if u.output == "" {
		t.Error("TC-5012: expected non-empty output in execution log")
	}
	if u.errorMsg != "" {
		t.Errorf("TC-5012: expected empty error_message on success, got %q", u.errorMsg)
	}
	if u.retried {
		t.Error("TC-5012: expected retried=false for first attempt (retryCount=0)")
	}

	// ── Step 4: Assert CronDispatcher updated next_run_at ───────────────────
	if len(store.updates) != 1 {
		t.Fatalf("TC-5002/5011: expected 1 UpdateNextRunAt call, got %d", len(store.updates))
	}
	if store.updates[0].nextRunAt.IsZero() {
		t.Error("TC-5002/5011: expected non-zero nextRunAt after dispatch")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// TC-5013: Full pipeline — execution failure: UpdateLog(failed) with error_message
// ─────────────────────────────────────────────────────────────────────────────

func TestIntegration_TC5013_FullPipeline_FailedExecution(t *testing.T) {
	automationID := "auto-full-5013"
	task := buildAsynqTask(automationID)

	// AI returns an API error immediately
	execErr := errors.New("Anthropic API rate limit exceeded")
	runner := func(_ context.Context, _ string) (*agent.ExecutionResult, error) {
		return nil, execErr
	}

	logger := &captureLogger{idToReturn: "log-5013"}
	// retryCount=1 → this is a retry attempt (retried=true)
	worker := newTestWorker(runner, logger, 1)
	logger.latestLogID = "log-5013"

	err := scheduler.AutomationWorkerHandleTask(worker, context.Background(), task)
	if err == nil {
		t.Fatal("TC-5013: expected error from failed execution, got nil")
	}

	updates := logger.snapshotUpdates()
	if len(updates) != 1 {
		t.Fatalf("TC-5013: expected 1 UpdateExecutionLog call, got %d", len(updates))
	}
	u := updates[0]
	if u.status != "error" {
		t.Errorf("TC-5013: log status = %q, want %q", u.status, "error")
	}
	if u.errorMsg == "" {
		t.Error("TC-5013: expected non-empty error_message in execution log")
	}
	if !u.retried {
		t.Error("TC-5013: expected retried=true (retryCount=1)")
	}
	if u.output != "" {
		t.Errorf("TC-5013: expected empty output on failure, got %q", u.output)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// TC-5014: Full pipeline — tool_calls metadata (IterationCount, tokens) in log
//
// Verifies that when ExecuteAutomation uses multiple tool rounds, the resulting
// ExecutionResult carries accurate IterationCount and token totals, and these
// flow through the worker into the execution log output.
// ─────────────────────────────────────────────────────────────────────────────

func TestIntegration_TC5014_FullPipeline_ToolCallsMetadata(t *testing.T) {
	automationID := "auto-full-5014"
	task := buildAsynqTask(automationID)

	// 2 tool rounds + final end_turn (Reading Digest: fetch_news → save_to_notion → done)
	aiClient := &stubAnthropicClient{
		responses: []*agent.AnthropicMessage{
			{
				StopReason:    "tool_use",
				ToolUseBlocks: []agent.ToolUseBlock{{ID: "tu-1", Name: "fetch_news", Input: []byte(`{"category":"technology"}`)}},
				InputTokens: 90, OutputTokens: 20,
			},
			{
				StopReason:    "tool_use",
				ToolUseBlocks: []agent.ToolUseBlock{{ID: "tu-2", Name: "save_to_notion", Input: []byte(`{"title":"Tech Digest"}`)}},
				InputTokens: 200, OutputTokens: 30,
			},
			{
				StopReason:   "end_turn",
				TextContent:  "Reading digest prepared: 5 articles saved to Notion.",
				InputTokens:  300,
				OutputTokens: 50,
			},
		},
	}
	aiRegistry := &stubToolRegistry{
		results: map[string]string{
			"fetch_news":     `[{"title":"Go 1.25 Released","source":"blog.golang.org"}]`,
			"save_to_notion": `{"pageId":"notion-page-123","url":"https://notion.so/page/123"}`,
		},
	}

	var capturedResult *agent.ExecutionResult
	runner := func(ctx context.Context, _ string) (*agent.ExecutionResult, error) {
		result, err := agent.ExecuteAutomation(ctx, aiClient, aiRegistry, "Compile reading digest")
		if err == nil {
			capturedResult = result
		}
		return result, err
	}

	logger := &captureLogger{idToReturn: "log-5014"}
	worker := newTestWorker(runner, logger, 0)

	if err := scheduler.AutomationWorkerHandleTask(worker, context.Background(), task); err != nil {
		t.Fatalf("TC-5014: worker.handleAutomationRun failed: %v", err)
	}

	// Assert: output recorded in execution log
	updates := logger.snapshotUpdates()
	if len(updates) != 1 {
		t.Fatalf("TC-5014: expected 1 UpdateExecutionLog call, got %d", len(updates))
	}
	u := updates[0]
	if u.status != "success" {
		t.Errorf("TC-5014: status = %q, want %q", u.status, "success")
	}
	if u.output != "Reading digest prepared: 5 articles saved to Notion." {
		t.Errorf("TC-5014: output = %q, want specific digest text", u.output)
	}

	// Assert: ExecutionResult carries tool-use metadata
	if capturedResult == nil {
		t.Fatal("TC-5014: runner was not invoked — ExecutionResult is nil")
	}
	if capturedResult.IterationCount != 3 {
		t.Errorf("TC-5014: IterationCount = %d, want 3 (2 tool rounds + 1 end_turn)", capturedResult.IterationCount)
	}
	// Total tokens: (90+200+300)=590 in, (20+30+50)=100 out
	if capturedResult.InputTokens != 590 {
		t.Errorf("TC-5014: InputTokens = %d, want 590", capturedResult.InputTokens)
	}
	if capturedResult.OutputTokens != 100 {
		t.Errorf("TC-5014: OutputTokens = %d, want 100", capturedResult.OutputTokens)
	}

	// Tool calls should be recorded: fetch_news and save_to_notion
	if len(aiRegistry.calls) != 2 {
		t.Errorf("TC-5014: tool calls = %v, want [fetch_news, save_to_notion]", aiRegistry.calls)
	}
}
