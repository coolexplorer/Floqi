package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"floqi/worker/internal/agent"
	"floqi/worker/internal/mcp/tools/calendar"
	"floqi/worker/internal/mcp/tools/gmail"
	"floqi/worker/internal/mcp/tools/news"
	"floqi/worker/internal/mcp/tools/notion"
	"floqi/worker/internal/mcp/tools/weather"

	"github.com/rs/zerolog/log"
)

// AuthRefreshFunc is called when a Google API returns 401.
// It should refresh the OAuth token and return a new plaintext access token.
type AuthRefreshFunc func(ctx context.Context) (newToken string, err error)

// StandardRegistry connects Gmail, Calendar, Weather, News, and Notion tool clients to the agent executor.
type StandardRegistry struct {
	gmailClient    *gmail.Client
	calendarClient *calendar.Client
	weatherClient  *weather.Client
	newsClient     *news.Client
	notionClient   *notion.Client

	onAuthError   AuthRefreshFunc
	refreshedOnce sync.Once // ensures we only retry token refresh once per execution
	refreshed     bool
}

// NewRegistry creates a StandardRegistry with tool clients initialized from the given credentials.
func NewRegistry(gmailToken, calendarToken, weatherAPIKey, newsAPIKey, notionToken string) (*StandardRegistry, error) {
	return &StandardRegistry{
		gmailClient:    gmail.New(gmailToken),
		calendarClient: calendar.New(calendarToken),
		weatherClient:  weather.New(weatherAPIKey),
		newsClient:     news.New(newsAPIKey),
		notionClient:   notion.New(notionToken),
	}, nil
}

// SetAuthErrorHandler registers a callback invoked on Google 401 errors.
// The callback should refresh the token and return a new plaintext access token.
func (r *StandardRegistry) SetAuthErrorHandler(fn AuthRefreshFunc) {
	r.onAuthError = fn
}

// googleTools lists tool names that use Google OAuth tokens.
var googleTools = map[string]bool{
	"read_inbox":   true,
	"send_email":   true,
	"search_email": true,
	"list_events":  true,
	"create_event": true,
}

// isGoogleAuthError checks if the error is a Google API 401 authentication error.
func isGoogleAuthError(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "401") || strings.Contains(msg, "invalid authentication credentials") || strings.Contains(msg, "Invalid Credentials")
}

// ListTools returns the 9 available tools with their schemas.
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
					"to":      map[string]interface{}{"type": "string", "description": "Recipient email"},
					"subject": map[string]interface{}{"type": "string", "description": "Email subject"},
					"body":    map[string]interface{}{"type": "string", "description": "Email body"},
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
					"query": map[string]interface{}{"type": "string", "description": "Gmail search query (e.g., 'is:unread')"},
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
					"time_min": map[string]interface{}{"type": "string", "description": "Start time (RFC3339)"},
					"time_max": map[string]interface{}{"type": "string", "description": "End time (RFC3339)"},
				},
			},
		},
		{
			Name:        "create_event",
			Description: "Create a calendar event",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"summary": map[string]interface{}{"type": "string", "description": "Event title"},
					"start":   map[string]interface{}{"type": "string", "description": "Start time (RFC3339)"},
					"end":     map[string]interface{}{"type": "string", "description": "End time (RFC3339)"},
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
					"location": map[string]interface{}{"type": "string", "description": "City name (e.g., 'Seoul')"},
				},
				"required": []string{"location"},
			},
		},
		{
			Name:        "fetch_headlines",
			Description: "Fetch top news headlines by category",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"category":  map[string]interface{}{"type": "string", "description": "News category (e.g., technology, business)"},
					"page_size": map[string]interface{}{"type": "integer", "description": "Number of articles to return (default 10)"},
				},
				"required": []string{"category"},
			},
		},
		{
			Name:        "create_notion_page",
			Description: "Create a new page in a Notion database",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"database_id": map[string]interface{}{"type": "string", "description": "Notion database ID"},
					"title":       map[string]interface{}{"type": "string", "description": "Page title"},
					"content":     map[string]interface{}{"type": "string", "description": "Page content (markdown)"},
				},
				"required": []string{"database_id", "title", "content"},
			},
		},
		{
			Name:        "search_notion_pages",
			Description: "Search for pages in Notion by query",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"query": map[string]interface{}{"type": "string", "description": "Search query string"},
				},
				"required": []string{"query"},
			},
		},
	}
}

var templateTools = map[string][]string{
	"morning_briefing": {"read_inbox", "list_events", "get_weather", "send_email"},
	"email_triage":     {"read_inbox", "send_email"},
	"reading_digest":   {"fetch_headlines", "create_notion_page", "send_email"},
	"weekly_review":    {"read_inbox", "list_events", "send_email"},
	"smart_save":       {"read_inbox", "search_email", "create_notion_page"},
}

// ListToolsForTemplate returns only the tools needed for a specific template type.
// Falls back to all tools if the template type is unknown.
func (r *StandardRegistry) ListToolsForTemplate(templateType string) []agent.ToolDef {
	allowed, ok := templateTools[templateType]
	if !ok {
		return r.ListTools()
	}
	allowedSet := make(map[string]bool, len(allowed))
	for _, name := range allowed {
		allowedSet[name] = true
	}
	all := r.ListTools()
	filtered := make([]agent.ToolDef, 0, len(allowed))
	for _, tool := range all {
		if allowedSet[tool.Name] {
			filtered = append(filtered, tool)
		}
	}
	return filtered
}

// Execute dispatches a tool call by name, decodes the JSON input, and returns the result.
// For Google tools, if a 401 error occurs and an auth refresh handler is set,
// it refreshes the token and retries the call once.
func (r *StandardRegistry) Execute(ctx context.Context, toolName string, input []byte) (string, error) {
	result, err := r.execute(ctx, toolName, input)

	// Retry on Google 401: refresh token once and retry
	if err != nil && googleTools[toolName] && isGoogleAuthError(err) && r.onAuthError != nil && !r.refreshed {
		r.refreshedOnce.Do(func() {
			log.Info().Str("tool", toolName).Msg("Google 401 detected, attempting token refresh and retry")
			newToken, refreshErr := r.onAuthError(ctx)
			if refreshErr != nil {
				log.Warn().Err(refreshErr).Msg("token refresh failed during tool retry")
				return
			}
			r.gmailClient = gmail.New(newToken)
			r.calendarClient = calendar.New(newToken)
			r.refreshed = true
		})
		if r.refreshed {
			result, err = r.execute(ctx, toolName, input)
		}
	}

	return result, err
}

// execute is the internal tool dispatch without retry logic.
func (r *StandardRegistry) execute(ctx context.Context, toolName string, input []byte) (string, error) {
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

	case "fetch_headlines":
		category, _ := params["category"].(string)
		pageSize := 10
		if ps, ok := params["page_size"].(float64); ok {
			pageSize = int(ps)
		}
		articles, err := r.newsClient.FetchHeadlines(ctx, category, pageSize)
		if err != nil {
			return "", err
		}
		result, _ := json.Marshal(articles)
		return string(result), nil

	case "create_notion_page":
		databaseID, _ := params["database_id"].(string)
		title, _ := params["title"].(string)
		content, _ := params["content"].(string)
		page, err := r.notionClient.CreatePage(ctx, databaseID, title, content)
		if err != nil {
			return "", err
		}
		result, _ := json.Marshal(page)
		return string(result), nil

	case "search_notion_pages":
		query, _ := params["query"].(string)
		pages, err := r.notionClient.SearchPages(ctx, query)
		if err != nil {
			return "", err
		}
		result, _ := json.Marshal(pages)
		return string(result), nil

	default:
		return "", fmt.Errorf("unknown tool: %s", toolName)
	}
}
