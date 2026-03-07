package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"floqi/worker/internal/agent"
	"floqi/worker/internal/mcp/tools/calendar"
	"floqi/worker/internal/mcp/tools/gmail"
	"floqi/worker/internal/mcp/tools/weather"
)

// StandardRegistry connects Gmail, Calendar, and Weather tool clients to the agent executor.
type StandardRegistry struct {
	gmailClient    *gmail.Client
	calendarClient *calendar.Client
	weatherClient  *weather.Client
}

// NewRegistry creates a StandardRegistry with tool clients initialized from the given credentials.
func NewRegistry(gmailToken, calendarToken, weatherAPIKey string) (*StandardRegistry, error) {
	return &StandardRegistry{
		gmailClient:    gmail.New(gmailToken),
		calendarClient: calendar.New(calendarToken),
		weatherClient:  weather.New(weatherAPIKey),
	}, nil
}

// ListTools returns the 6 available tools with their schemas.
func (r *StandardRegistry) ListTools() []agent.ToolDef {
	return []agent.ToolDef{
		{
			Name:        "read_inbox",
			Description: "Read recent emails from Gmail inbox",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"max_results": map[string]interface{}{
						"type":        "integer",
						"description": "Maximum number of emails to return (default 10)",
					},
				},
			},
		},
		{
			Name:        "send_email",
			Description: "Send an email via Gmail",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"to":      map[string]string{"type": "string", "description": "Recipient email"},
					"subject": map[string]string{"type": "string", "description": "Email subject"},
					"body":    map[string]string{"type": "string", "description": "Email body"},
				},
				"required": []string{"to", "subject", "body"},
			},
		},
		{
			Name:        "search_email",
			Description: "Search emails in Gmail",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"query": map[string]string{"type": "string", "description": "Gmail search query (e.g., 'is:unread')"},
				},
				"required": []string{"query"},
			},
		},
		{
			Name:        "list_events",
			Description: "List calendar events",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"time_min": map[string]string{"type": "string", "description": "Start time (RFC3339)"},
					"time_max": map[string]string{"type": "string", "description": "End time (RFC3339)"},
				},
			},
		},
		{
			Name:        "create_event",
			Description: "Create a calendar event",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"summary": map[string]string{"type": "string", "description": "Event title"},
					"start":   map[string]string{"type": "string", "description": "Start time (RFC3339)"},
					"end":     map[string]string{"type": "string", "description": "End time (RFC3339)"},
				},
				"required": []string{"summary", "start", "end"},
			},
		},
		{
			Name:        "get_weather",
			Description: "Get current weather for a location",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"location": map[string]string{"type": "string", "description": "City name (e.g., 'Seoul')"},
				},
				"required": []string{"location"},
			},
		},
	}
}

// Execute dispatches a tool call by name, decodes the JSON input, and returns the result.
func (r *StandardRegistry) Execute(ctx context.Context, toolName string, input []byte) (string, error) {
	var params map[string]interface{}
	if err := json.Unmarshal(input, &params); err != nil {
		return "", fmt.Errorf("invalid tool input JSON: %w", err)
	}

	switch toolName {
	case "read_inbox":
		maxResults := 10
		if mr, ok := params["max_results"].(float64); ok {
			maxResults = int(mr)
		}
		emails, err := r.gmailClient.ReadInbox(ctx, maxResults)
		if err != nil {
			return "", err
		}
		result, _ := json.Marshal(emails)
		return string(result), nil

	case "send_email":
		to, _ := params["to"].(string)
		subject, _ := params["subject"].(string)
		body, _ := params["body"].(string)
		if err := r.gmailClient.SendEmail(ctx, to, subject, body); err != nil {
			return "", err
		}
		return "Email sent successfully", nil

	case "search_email":
		query, _ := params["query"].(string)
		emails, err := r.gmailClient.SearchEmail(ctx, query)
		if err != nil {
			return "", err
		}
		result, _ := json.Marshal(emails)
		return string(result), nil

	case "list_events":
		timeMinStr, _ := params["time_min"].(string)
		timeMaxStr, _ := params["time_max"].(string)
		timeMin, err := time.Parse(time.RFC3339, timeMinStr)
		if err != nil {
			return "", fmt.Errorf("invalid time_min: %w", err)
		}
		timeMax, err := time.Parse(time.RFC3339, timeMaxStr)
		if err != nil {
			return "", fmt.Errorf("invalid time_max: %w", err)
		}
		events, err := r.calendarClient.ListEvents(ctx, timeMin, timeMax)
		if err != nil {
			return "", err
		}
		result, _ := json.Marshal(events)
		return string(result), nil

	case "create_event":
		summary, _ := params["summary"].(string)
		startStr, _ := params["start"].(string)
		endStr, _ := params["end"].(string)
		start, err := time.Parse(time.RFC3339, startStr)
		if err != nil {
			return "", fmt.Errorf("invalid start time: %w", err)
		}
		end, err := time.Parse(time.RFC3339, endStr)
		if err != nil {
			return "", fmt.Errorf("invalid end time: %w", err)
		}
		if _, err := r.calendarClient.CreateEvent(ctx, summary, start, end); err != nil {
			return "", err
		}
		return "Event created successfully", nil

	case "get_weather":
		location, _ := params["location"].(string)
		w, err := r.weatherClient.GetWeather(ctx, location)
		if err != nil {
			return "", err
		}
		result, _ := json.Marshal(w)
		return string(result), nil

	default:
		return "", fmt.Errorf("unknown tool: %s", toolName)
	}
}
