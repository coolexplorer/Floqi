package notion

// TC-4010~4011 관련: Notion API MCP 도구 테스트 (TDD Red Phase)
//
// 구현 요구사항:
//   - CreatePage(ctx, databaseID, title, content) (*Page, error): Notion 데이터베이스에 새 페이지 생성
//   - SearchPages(ctx, query) ([]Page, error): 제목으로 Notion 페이지 검색
//   - Page: ID, Title, URL, CreatedTime 필드 포함
//
// Mock 전략:
//   - httptest.NewServer로 Notion API 응답 모킹
//   - newWithHTTP(token, baseURL, httpClient)로 테스트 서버 주입

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// notionPageResponse mirrors the Notion API page object structure.
type notionPageResponse struct {
	Object         string                 `json:"object"`
	ID             string                 `json:"id"`
	URL            string                 `json:"url"`
	CreatedTime    string                 `json:"created_time"`
	Properties     map[string]interface{} `json:"properties"`
}

// notionSearchResponse mirrors the Notion API search response structure.
type notionSearchResponse struct {
	Object  string               `json:"object"`
	Results []notionPageResponse `json:"results"`
	HasMore bool                 `json:"has_more"`
}

// setupNotionCreateServer creates an httptest server that mimics Notion pages create endpoint.
func setupNotionCreateServer(t *testing.T, response notionPageResponse, statusCode int) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/pages" {
			http.Error(w, "unexpected path: "+r.URL.Path, http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(statusCode)
		if statusCode == http.StatusOK {
			json.NewEncoder(w).Encode(response)
		}
	}))
}

// setupNotionSearchServer creates an httptest server that mimics Notion search endpoint.
func setupNotionSearchServer(t *testing.T, results []notionPageResponse) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()

	// Search endpoint
	mux.HandleFunc("/v1/search", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		resp := notionSearchResponse{
			Object:  "list",
			Results: results,
			HasMore: false,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	})

	return httptest.NewServer(mux)
}

// TC-4010 관련: CreatePage(databaseID, title, content) → returns *Page with ID
func TestCreatePage_Success(t *testing.T) {
	mockResponse := notionPageResponse{
		Object:      "page",
		ID:          "abc123-def456",
		URL:         "https://notion.so/ABC-123",
		CreatedTime: "2026-03-06T09:00:00.000Z",
		Properties: map[string]interface{}{
			"title": map[string]interface{}{
				"title": []map[string]interface{}{
					{"plain_text": "Reading Digest: AI News"},
				},
			},
		},
	}

	ts := setupNotionCreateServer(t, mockResponse, http.StatusOK)
	defer ts.Close()

	client := newWithHTTP("fake-notion-token", ts.URL, ts.Client())

	page, err := client.CreatePage(
		context.Background(),
		"db-12345",
		"Reading Digest: AI News",
		"## Today's AI Headlines\n\n- AI Breakthrough in 2026\n- The Future of Automation\n",
	)
	if err != nil {
		t.Fatalf("CreatePage: unexpected error: %v", err)
	}
	if page == nil {
		t.Fatal("CreatePage: expected non-nil Page")
	}
	if page.ID == "" {
		t.Error("CreatePage: expected non-empty page ID")
	}
	if page.Title == "" {
		t.Error("CreatePage: expected non-empty page Title")
	}
	if page.URL == "" {
		t.Error("CreatePage: expected non-empty page URL")
	}
}

// TestCreatePage_HTTPError: API가 401/500 응답을 반환할 때 에러를 반환해야 한다.
func TestCreatePage_HTTPError(t *testing.T) {
	tests := []struct {
		name       string
		statusCode int
	}{
		{"unauthorized", http.StatusUnauthorized},
		{"internal server error", http.StatusInternalServerError},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ts := setupNotionCreateServer(t, notionPageResponse{}, tt.statusCode)
			defer ts.Close()

			client := newWithHTTP("fake-notion-token", ts.URL, ts.Client())

			_, err := client.CreatePage(
				context.Background(),
				"db-12345",
				"Test Page",
				"Some content",
			)
			if err == nil {
				t.Fatalf("CreatePage: expected error for HTTP %d, got nil", tt.statusCode)
			}
		})
	}
}

// TestCreatePage_InvalidJSON: 응답 바디가 유효하지 않은 JSON일 때 에러를 반환해야 한다.
func TestCreatePage_InvalidJSON(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("not valid json {{ broken"))
	}))
	defer server.Close()

	client := newWithHTTP("fake-notion-token", server.URL, server.Client())

	_, err := client.CreatePage(
		context.Background(),
		"db-12345",
		"Test Page",
		"Some content",
	)
	if err == nil {
		t.Fatal("CreatePage: expected error for invalid JSON, got nil")
	}
}

// TC-4011 관련: SearchPages(query) → returns []Page matching query
func TestSearchPages_Success(t *testing.T) {
	mockResults := []notionPageResponse{
		{
			Object:      "page",
			ID:          "page-111",
			URL:         "https://notion.so/Reading-Digest-111",
			CreatedTime: "2026-03-05T09:00:00.000Z",
			Properties: map[string]interface{}{
				"title": map[string]interface{}{
					"title": []map[string]interface{}{
						{"plain_text": "Reading Digest: Tech News"},
					},
				},
			},
		},
		{
			Object:      "page",
			ID:          "page-222",
			URL:         "https://notion.so/Reading-Digest-222",
			CreatedTime: "2026-03-04T09:00:00.000Z",
			Properties: map[string]interface{}{
				"title": map[string]interface{}{
					"title": []map[string]interface{}{
						{"plain_text": "Reading Digest: Business News"},
					},
				},
			},
		},
	}

	ts := setupNotionSearchServer(t, mockResults)
	defer ts.Close()

	client := newWithHTTP("fake-notion-token", ts.URL, ts.Client())

	pages, err := client.SearchPages(context.Background(), "Reading Digest")
	if err != nil {
		t.Fatalf("SearchPages: unexpected error: %v", err)
	}
	if len(pages) != 2 {
		t.Errorf("SearchPages: got %d pages, want 2", len(pages))
	}
	if pages[0].ID == "" {
		t.Error("SearchPages: pages[0].ID must not be empty")
	}
}

// TestSearchPages_EmptyResults: 검색 결과가 없을 때 빈 슬라이스를 반환해야 한다.
func TestSearchPages_EmptyResults(t *testing.T) {
	ts := setupNotionSearchServer(t, []notionPageResponse{})
	defer ts.Close()

	client := newWithHTTP("fake-notion-token", ts.URL, ts.Client())

	pages, err := client.SearchPages(context.Background(), "nonexistent query xyz")
	if err != nil {
		t.Fatalf("SearchPages: unexpected error for empty results: %v", err)
	}
	if len(pages) != 0 {
		t.Errorf("SearchPages: got %d pages, want 0", len(pages))
	}
}
