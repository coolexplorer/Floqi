package mcp

import (
	"context"
	"testing"

	"floqi/worker/internal/agent"
)

func TestRegistry_ListTools(t *testing.T) {
	registry, err := NewRegistry("", "", "", "", "")
	if err != nil {
		t.Fatalf("NewRegistry failed: %v", err)
	}

	tools := registry.ListTools()

	if len(tools) != 9 {
		t.Fatalf("expected 9 tools, got %d", len(tools))
	}

	wantNames := []string{"read_inbox", "send_email", "search_email", "list_events", "create_event", "get_weather", "fetch_headlines", "create_notion_page", "search_notion_pages"}
	for i, want := range wantNames {
		if tools[i].Name != want {
			t.Errorf("tools[%d].Name = %q, want %q", i, tools[i].Name, want)
		}
	}
}

func TestRegistry_ListTools_ImplementsInterface(t *testing.T) {
	registry, _ := NewRegistry("", "", "", "", "")

	// Verify StandardRegistry satisfies agent.ToolRegistry at compile time.
	var _ agent.ToolRegistry = registry
}

func TestRegistry_Execute_UnknownTool(t *testing.T) {
	registry, _ := NewRegistry("", "", "", "", "")

	_, err := registry.Execute(context.Background(), "unknown_tool", []byte("{}"))
	if err == nil {
		t.Fatal("expected error for unknown tool, got nil")
	}
	if err.Error() != "unknown tool: unknown_tool" {
		t.Errorf("error = %q, want %q", err.Error(), "unknown tool: unknown_tool")
	}
}

func TestRegistry_Execute_InvalidJSON(t *testing.T) {
	registry, _ := NewRegistry("", "", "", "", "")

	_, err := registry.Execute(context.Background(), "read_inbox", []byte("not-json"))
	if err == nil {
		t.Fatal("expected error for invalid JSON, got nil")
	}
}

func TestRegistry_Execute_ListEvents_InvalidTimeMin(t *testing.T) {
	registry, _ := NewRegistry("", "", "", "", "")

	_, err := registry.Execute(context.Background(), "list_events", []byte(`{"time_min":"not-a-time","time_max":"2026-01-01T00:00:00Z"}`))
	if err == nil {
		t.Fatal("expected error for invalid time_min, got nil")
	}
}

func TestRegistry_Execute_ListEvents_InvalidTimeMax(t *testing.T) {
	registry, _ := NewRegistry("", "", "", "", "")

	_, err := registry.Execute(context.Background(), "list_events", []byte(`{"time_min":"2026-01-01T00:00:00Z","time_max":"not-a-time"}`))
	if err == nil {
		t.Fatal("expected error for invalid time_max, got nil")
	}
}

func TestRegistry_Execute_CreateEvent_InvalidTimes(t *testing.T) {
	registry, _ := NewRegistry("", "", "", "", "")

	_, err := registry.Execute(context.Background(), "create_event", []byte(`{"summary":"Test","start":"bad","end":"2026-01-01T01:00:00Z"}`))
	if err == nil {
		t.Fatal("expected error for invalid start time, got nil")
	}
}

func TestRegistry_ListToolsForTemplate(t *testing.T) {
	registry, _ := NewRegistry("", "", "", "", "")

	tests := []struct {
		template  string
		wantCount int
		wantNames []string
	}{
		{"email_triage", 2, []string{"read_inbox", "send_email"}},
		{"morning_briefing", 4, []string{"read_inbox", "list_events", "get_weather", "send_email"}},
		{"reading_digest", 3, []string{"fetch_headlines", "create_notion_page", "send_email"}},
		{"weekly_review", 3, []string{"read_inbox", "list_events", "send_email"}},
		{"smart_save", 3, []string{"read_inbox", "search_email", "create_notion_page"}},
		{"unknown_template", 9, nil},
	}

	for _, tt := range tests {
		t.Run(tt.template, func(t *testing.T) {
			tools := registry.ListToolsForTemplate(tt.template)
			if len(tools) != tt.wantCount {
				t.Errorf("ListToolsForTemplate(%q) returned %d tools, want %d", tt.template, len(tools), tt.wantCount)
			}
			if tt.wantNames != nil {
				names := make([]string, len(tools))
				for i, tool := range tools {
					names[i] = tool.Name
				}
				for _, want := range tt.wantNames {
					found := false
					for _, got := range names {
						if got == want {
							found = true
							break
						}
					}
					if !found {
						t.Errorf("ListToolsForTemplate(%q) missing tool %q, got %v", tt.template, want, names)
					}
				}
			}
		})
	}
}

func TestRegistry_ListTools_AllHaveDescriptions(t *testing.T) {
	registry, _ := NewRegistry("", "", "", "", "")
	tools := registry.ListTools()

	for _, tool := range tools {
		if tool.Description == "" {
			t.Errorf("tool %q has empty description", tool.Name)
		}
		if tool.InputSchema == nil {
			t.Errorf("tool %q has nil InputSchema", tool.Name)
		}
	}
}
