package calendar

// TC-4001 관련: Google Calendar MCP 도구 테스트 (TDD Red Phase)
//
// 구현 요구사항:
//   - ListEvents(ctx, timeMin, timeMax) ([]Event, error): 기간 내 캘린더 이벤트 목록 반환
//   - CreateEvent(ctx, summary, start, end) (*Event, error): 새 이벤트 생성
//
// Mock 전략:
//   - httptest.NewServer로 Google Calendar API 응답 모킹
//   - newWithOptions + option.WithHTTPClient + option.WithEndpoint 로 테스트 서버 주입

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"google.golang.org/api/option"
)

// calendarListResponse mirrors the Google Calendar API list events response.
type calendarListResponse struct {
	Items []*calendarEvent `json:"items"`
}

// calendarEvent mirrors the Google Calendar API event resource.
type calendarEvent struct {
	ID       string              `json:"id"`
	Summary  string              `json:"summary"`
	Location string              `json:"location,omitempty"`
	Start    calendarEventTime   `json:"start"`
	End      calendarEventTime   `json:"end"`
}

type calendarEventTime struct {
	DateTime string `json:"dateTime"`
	TimeZone string `json:"timeZone,omitempty"`
}

// setupCalendarTestServer creates an httptest server that mimics Calendar API responses.
func setupCalendarTestServer(t *testing.T, events []*calendarEvent) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()

	// List events endpoint
	mux.HandleFunc("/calendar/v3/calendars/primary/events", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(calendarListResponse{Items: events})
			return
		}
		// POST = create event
		if r.Method == http.MethodPost {
			var req calendarEvent
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				http.Error(w, "bad request", http.StatusBadRequest)
				return
			}
			req.ID = "new_event_1"
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(req)
		}
	})

	return httptest.NewServer(mux)
}

// TC-4001 관련: ListEvents(timeMin, timeMax) → returns []Event
func TestListEvents(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	todayStart := now.Truncate(24 * time.Hour)
	todayEnd := todayStart.Add(24 * time.Hour)

	mockEvents := []*calendarEvent{
		{
			ID:      "event1",
			Summary: "Team Standup",
			Start:   calendarEventTime{DateTime: todayStart.Add(10 * time.Hour).Format(time.RFC3339)},
			End:     calendarEventTime{DateTime: todayStart.Add(10*time.Hour + 30*time.Minute).Format(time.RFC3339)},
		},
		{
			ID:      "event2",
			Summary: "Lunch with Designer",
			Start:   calendarEventTime{DateTime: todayStart.Add(12 * time.Hour).Format(time.RFC3339)},
			End:     calendarEventTime{DateTime: todayStart.Add(13 * time.Hour).Format(time.RFC3339)},
		},
	}

	ts := setupCalendarTestServer(t, mockEvents)
	defer ts.Close()

	client := newWithOptions(
		"fake-oauth-token",
		option.WithHTTPClient(ts.Client()),
		option.WithEndpoint(ts.URL+"/"),
		option.WithoutAuthentication(),
	)

	events, err := client.ListEvents(context.Background(), todayStart, todayEnd)
	if err != nil {
		t.Fatalf("TestListEvents: unexpected error: %v", err)
	}
	if len(events) != 2 {
		t.Errorf("TestListEvents: got %d events, want 2", len(events))
	}
	if events[0].Summary != "Team Standup" {
		t.Errorf("TestListEvents: events[0].Summary = %q, want %q", events[0].Summary, "Team Standup")
	}
	if events[0].Start.IsZero() {
		t.Error("TestListEvents: events[0].Start must not be zero")
	}
}

// CreateEvent(summary, start, end) → success, returns *Event with ID
func TestCreateEvent(t *testing.T) {
	ts := setupCalendarTestServer(t, nil)
	defer ts.Close()

	client := newWithOptions(
		"fake-oauth-token",
		option.WithHTTPClient(ts.Client()),
		option.WithEndpoint(ts.URL+"/"),
		option.WithoutAuthentication(),
	)

	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Hour)
	end := start.Add(time.Hour)

	event, err := client.CreateEvent(context.Background(), "Morning Briefing Review", start, end)
	if err != nil {
		t.Fatalf("TestCreateEvent: unexpected error: %v", err)
	}
	if event == nil {
		t.Fatal("TestCreateEvent: expected non-nil Event")
	}
	if event.ID == "" {
		t.Error("TestCreateEvent: expected non-empty event ID")
	}
	if event.Summary != "Morning Briefing Review" {
		t.Errorf("TestCreateEvent: event.Summary = %q, want %q", event.Summary, "Morning Briefing Review")
	}
}
