package agent

import (
	"context"
	"encoding/json"
	"errors"
	"time"
)

// Sentinel errors
var ErrMaxIterationsReached = errors.New("max iterations reached")

// MaxIterations is the maximum number of tool-use loops before returning an error.
const MaxIterations = 10

// ToolCallRecord represents a single MCP tool invocation for the execution log.
// Field names use camelCase JSON tags to match the frontend ToolCall interface.
type ToolCallRecord struct {
	ID       string          `json:"id"`
	ToolName string          `json:"toolName"`
	Input    json.RawMessage `json:"input"`
	Output   json.RawMessage `json:"output"`
	Duration int64           `json:"duration"` // milliseconds
	Status   string          `json:"status"`   // "success" or "error"
}

// ExecutionResult holds the output and telemetry of a completed automation run.
type ExecutionResult struct {
	Output         string
	InputTokens    int64
	OutputTokens   int64
	IterationCount int
	ToolCalls      []ToolCallRecord
}

// ToolUseBlock represents a single tool call requested by the AI.
type ToolUseBlock struct {
	ID    string
	Name  string
	Input []byte // JSON-encoded input
}

// AnthropicMessage represents a parsed response from the Anthropic Messages API.
type AnthropicMessage struct {
	StopReason    string        // "end_turn", "tool_use", "max_tokens", "stop_sequence"
	TextContent   string        // populated when StopReason = "end_turn"
	ToolUseBlocks []ToolUseBlock // populated when StopReason = "tool_use"
	InputTokens   int64
	OutputTokens  int64
}

// ConversationTurn represents one turn in the conversation history.
type ConversationTurn struct {
	Role    string // "user" or "assistant"
	Content interface{}
}

// ToolDef describes a tool available to the AI.
type ToolDef struct {
	Name        string
	Description string
	InputSchema interface{}
}

// AnthropicClient is the interface for sending requests to Anthropic's Messages API.
type AnthropicClient interface {
	CreateMessage(ctx context.Context, system string, messages []ConversationTurn, tools []ToolDef) (*AnthropicMessage, error)
}

// ToolRegistry is the interface for executing tools by name.
type ToolRegistry interface {
	Execute(ctx context.Context, toolName string, input []byte) (string, error)
	ListTools() []ToolDef
}

// toolResult is a tool_result content block passed back to the AI after execution.
type toolResult struct {
	Type      string `json:"type"`
	ToolUseID string `json:"tool_use_id"`
	Content   string `json:"content"`
	IsError   bool   `json:"is_error,omitempty"`
}

const maxToolResultLen = 200

func truncateToolResult(result string) string {
	if len(result) <= maxToolResultLen {
		return result
	}
	return result[:maxToolResultLen] + "... [truncated]"
}

// ExecuteAutomation runs the AI agent loop for the given prompt.
// It calls the Anthropic API, handles tool_use blocks, and loops until
// end_turn or MaxIterations is reached.
func ExecuteAutomation(ctx context.Context, client AnthropicClient, registry ToolRegistry, system string, prompt string) (*ExecutionResult, error) {
	messages := []ConversationTurn{
		{Role: "user", Content: prompt},
	}

	result := &ExecutionResult{}

	for i := 0; i < MaxIterations; i++ {
		response, err := client.CreateMessage(ctx, system, messages, registry.ListTools())
		if err != nil {
			return nil, err
		}

		result.IterationCount++
		result.InputTokens += response.InputTokens
		result.OutputTokens += response.OutputTokens

		switch response.StopReason {
		case "end_turn", "max_tokens":
			result.Output = response.TextContent
			return result, nil

		case "tool_use":
			// Append assistant message with tool_use blocks
			messages = append(messages, ConversationTurn{
				Role:    "assistant",
				Content: response.ToolUseBlocks,
			})

			// Execute each tool; on error pass is_error:true to the AI
			results := make([]toolResult, 0, len(response.ToolUseBlocks))
			for _, block := range response.ToolUseBlocks {
				startTime := time.Now()
				content, toolErr := registry.Execute(ctx, block.Name, block.Input)
				elapsed := time.Since(startTime).Milliseconds()

				record := ToolCallRecord{
					ID:       block.ID,
					ToolName: block.Name,
					Input:    json.RawMessage(block.Input),
					Duration: elapsed,
				}

				if toolErr != nil {
					results = append(results, toolResult{
						Type:      "tool_result",
						ToolUseID: block.ID,
						Content:   "error: " + toolErr.Error(),
						IsError:   true,
					})
					record.Status = "error"
					record.Output, _ = json.Marshal(map[string]string{"error": toolErr.Error()})
				} else {
					results = append(results, toolResult{
						Type:      "tool_result",
						ToolUseID: block.ID,
						Content:   truncateToolResult(content),
					})
					record.Status = "success"
					// Try to store as JSON; fallback to string wrapper
					if json.Valid([]byte(content)) {
						record.Output = json.RawMessage(content)
					} else {
						record.Output, _ = json.Marshal(content)
					}
				}
				result.ToolCalls = append(result.ToolCalls, record)
			}

			messages = append(messages, ConversationTurn{
				Role:    "user",
				Content: results,
			})

		default:
			result.Output = response.TextContent
			return result, nil
		}
	}

	return nil, ErrMaxIterationsReached
}
