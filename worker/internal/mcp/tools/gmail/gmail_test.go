package gmail

// TC-4002, TC-4004 관련: Gmail MCP 도구 테스트 (TDD Red Phase)
//
// 구현 요구사항:
//   - ReadInbox(ctx, maxResults) ([]Email, error): 받은편지함 이메일 목록 반환
//   - SendEmail(ctx, to, subject, body) error: 이메일 발송
//   - SearchEmail(ctx, query) ([]Email, error): Gmail 검색 쿼리로 필터링된 이메일 반환
//
// Mock 전략:
//   - httptest.NewServer로 Gmail API 응답 모킹
//   - newWithOptions + option.WithHTTPClient + option.WithEndpoint 로 테스트 서버 주입

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"google.golang.org/api/option"
)

// gmailListResponse mirrors the Gmail API list messages response structure.
type gmailListResponse struct {
	Messages           []gmailMessageRef `json:"messages"`
	ResultSizeEstimate int               `json:"resultSizeEstimate"`
}

type gmailMessageRef struct {
	ID       string `json:"id"`
	ThreadID string `json:"threadId"`
}

// gmailMessageResponse mirrors the Gmail API get message response structure.
type gmailMessageResponse struct {
	ID      string               `json:"id"`
	Snippet string               `json:"snippet"`
	Payload gmailMessagePayload  `json:"payload"`
}

type gmailMessagePayload struct {
	Headers []gmailHeader `json:"headers"`
}

type gmailHeader struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

// setupGmailTestServer creates an httptest server that mimics Gmail API responses.
func setupGmailTestServer(t *testing.T, emails []gmailMessageResponse) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()

	// List messages endpoint
	mux.HandleFunc("/gmail/v1/users/me/messages", func(w http.ResponseWriter, r *http.Request) {
		refs := make([]gmailMessageRef, len(emails))
		for i, e := range emails {
			refs[i] = gmailMessageRef{ID: e.ID, ThreadID: "thread_" + e.ID}
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(gmailListResponse{
			Messages:           refs,
			ResultSizeEstimate: len(refs),
		})
	})

	// Get individual message endpoint
	for _, email := range emails {
		e := email // capture loop var
		mux.HandleFunc("/gmail/v1/users/me/messages/"+e.ID, func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(e)
		})
	}

	// Send message endpoint
	mux.HandleFunc("/gmail/v1/users/me/messages/send", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"id": "sent_msg_1"})
	})

	return httptest.NewServer(mux)
}

// TC-4002 관련: ReadInbox(maxResults=10) → returns []Email
func TestReadInbox(t *testing.T) {
	mockEmails := []gmailMessageResponse{
		{
			ID:      "msg1",
			Snippet: "Hey, meeting tomorrow at 10am",
			Payload: gmailMessagePayload{
				Headers: []gmailHeader{
					{Name: "From", Value: "boss@example.com"},
					{Name: "Subject", Value: "Meeting Tomorrow"},
					{Name: "Date", Value: "Thu, 6 Mar 2026 09:00:00 +0900"},
				},
			},
		},
		{
			ID:      "msg2",
			Snippet: "Your weekly report is ready",
			Payload: gmailMessagePayload{
				Headers: []gmailHeader{
					{Name: "From", Value: "reports@example.com"},
					{Name: "Subject", Value: "Weekly Report"},
					{Name: "Date", Value: "Thu, 6 Mar 2026 08:00:00 +0900"},
				},
			},
		},
	}

	ts := setupGmailTestServer(t, mockEmails)
	defer ts.Close()

	client := newWithOptions(
		"fake-oauth-token",
		option.WithHTTPClient(ts.Client()),
		option.WithEndpoint(ts.URL+"/"),
		option.WithoutAuthentication(),
	)

	emails, err := client.ReadInbox(context.Background(), 10)
	if err != nil {
		t.Fatalf("TestReadInbox: unexpected error: %v", err)
	}
	if len(emails) != 2 {
		t.Errorf("TestReadInbox: got %d emails, want 2", len(emails))
	}
	if emails[0].From != "boss@example.com" {
		t.Errorf("TestReadInbox: emails[0].From = %q, want %q", emails[0].From, "boss@example.com")
	}
	if emails[0].Subject != "Meeting Tomorrow" {
		t.Errorf("TestReadInbox: emails[0].Subject = %q, want %q", emails[0].Subject, "Meeting Tomorrow")
	}
}

// TC-4004 관련: SendEmail(to, subject, body) → success
func TestSendEmail(t *testing.T) {
	ts := setupGmailTestServer(t, nil)
	defer ts.Close()

	client := newWithOptions(
		"fake-oauth-token",
		option.WithHTTPClient(ts.Client()),
		option.WithEndpoint(ts.URL+"/"),
		option.WithoutAuthentication(),
	)

	err := client.SendEmail(
		context.Background(),
		"user@example.com",
		"Morning Briefing",
		"오늘 일정: 오전 10시 팀 미팅\n날씨: 맑음 15도\n",
	)
	if err != nil {
		t.Fatalf("TestSendEmail: unexpected error: %v", err)
	}
}

// SearchEmail(query) → filtered []Email
func TestSearchEmail(t *testing.T) {
	mockEmails := []gmailMessageResponse{
		{
			ID:      "msg3",
			Snippet: "Important: Q1 budget review",
			Payload: gmailMessagePayload{
				Headers: []gmailHeader{
					{Name: "From", Value: "finance@example.com"},
					{Name: "Subject", Value: "Q1 Budget Review"},
				},
			},
		},
	}

	ts := setupGmailTestServer(t, mockEmails)
	defer ts.Close()

	client := newWithOptions(
		"fake-oauth-token",
		option.WithHTTPClient(ts.Client()),
		option.WithEndpoint(ts.URL+"/"),
		option.WithoutAuthentication(),
	)

	emails, err := client.SearchEmail(context.Background(), "is:important subject:budget")
	if err != nil {
		t.Fatalf("TestSearchEmail: unexpected error: %v", err)
	}
	if len(emails) == 0 {
		t.Error("TestSearchEmail: expected at least 1 email matching query")
	}
	if emails[0].Subject != "Q1 Budget Review" {
		t.Errorf("TestSearchEmail: emails[0].Subject = %q, want %q", emails[0].Subject, "Q1 Budget Review")
	}
}
