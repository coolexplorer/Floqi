package news

// TC-4009~4011 관련: News API MCP 도구 테스트 (TDD Red Phase)
//
// 구현 요구사항:
//   - FetchHeadlines(ctx, category, pageSize) ([]Article, error): 카테고리별 뉴스 헤드라인 반환
//   - Article: Title, Description, URL, Source, PublishedAt 필드 포함
//
// Mock 전략:
//   - httptest.NewServer로 NewsAPI 응답 모킹
//   - newWithHTTP(apiKey, baseURL, httpClient)로 테스트 서버 주입

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// newsAPIResponse mirrors the NewsAPI top-headlines response structure.
type newsAPIResponse struct {
	Status       string           `json:"status"`
	TotalResults int              `json:"totalResults"`
	Articles     []newsAPIArticle `json:"articles"`
}

type newsAPIArticle struct {
	Source      newsAPISource `json:"source"`
	Title       string        `json:"title"`
	Description string        `json:"description"`
	URL         string        `json:"url"`
	PublishedAt string        `json:"publishedAt"`
}

type newsAPISource struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// setupNewsTestServer creates an httptest server that mimics NewsAPI responses.
func setupNewsTestServer(t *testing.T, articles []newsAPIArticle) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v2/top-headlines" {
			http.Error(w, "unexpected path: "+r.URL.Path, http.StatusNotFound)
			return
		}
		resp := newsAPIResponse{
			Status:       "ok",
			TotalResults: len(articles),
			Articles:     articles,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}))
}

// TC-4009 관련: FetchHeadlines(category, pageSize) → returns []Article
func TestFetchHeadlines_Success(t *testing.T) {
	mockArticles := []newsAPIArticle{
		{
			Source:      newsAPISource{ID: "techcrunch", Name: "TechCrunch"},
			Title:       "AI Breakthrough in 2026",
			Description: "Researchers announce major AI advancement",
			URL:         "https://techcrunch.com/ai-breakthrough",
			PublishedAt: "2026-03-06T09:00:00Z",
		},
		{
			Source:      newsAPISource{ID: "wired", Name: "Wired"},
			Title:       "The Future of Automation",
			Description: "How automation is reshaping industries",
			URL:         "https://wired.com/automation-future",
			PublishedAt: "2026-03-06T08:30:00Z",
		},
	}

	ts := setupNewsTestServer(t, mockArticles)
	defer ts.Close()

	client := newWithHTTP("fake-api-key", ts.URL, ts.Client())

	articles, err := client.FetchHeadlines(context.Background(), "technology", 10)
	if err != nil {
		t.Fatalf("FetchHeadlines: unexpected error: %v", err)
	}
	if len(articles) != 2 {
		t.Errorf("FetchHeadlines: got %d articles, want 2", len(articles))
	}
	if articles[0].Title != "AI Breakthrough in 2026" {
		t.Errorf("FetchHeadlines: articles[0].Title = %q, want %q", articles[0].Title, "AI Breakthrough in 2026")
	}
	if articles[0].Source != "TechCrunch" {
		t.Errorf("FetchHeadlines: articles[0].Source = %q, want %q", articles[0].Source, "TechCrunch")
	}
	if articles[0].URL == "" {
		t.Error("FetchHeadlines: articles[0].URL must not be empty")
	}
}

// TestFetchHeadlines_HTTPError: API가 5xx 응답을 반환할 때 에러를 반환해야 한다.
func TestFetchHeadlines_HTTPError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	client := newWithHTTP("fake-api-key", server.URL, server.Client())

	_, err := client.FetchHeadlines(context.Background(), "technology", 5)
	if err == nil {
		t.Fatal("FetchHeadlines: expected error for HTTP 500, got nil")
	}
}

// TestFetchHeadlines_InvalidJSON: 응답 바디가 유효하지 않은 JSON일 때 에러를 반환해야 한다.
func TestFetchHeadlines_InvalidJSON(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("not valid json {{ broken"))
	}))
	defer server.Close()

	client := newWithHTTP("fake-api-key", server.URL, server.Client())

	_, err := client.FetchHeadlines(context.Background(), "technology", 5)
	if err == nil {
		t.Fatal("FetchHeadlines: expected error for invalid JSON, got nil")
	}
}

// TestFetchHeadlines_EmptyArticles: articles 배열이 비어 있을 때 빈 슬라이스를 반환해야 한다.
func TestFetchHeadlines_EmptyArticles(t *testing.T) {
	ts := setupNewsTestServer(t, []newsAPIArticle{})
	defer ts.Close()

	client := newWithHTTP("fake-api-key", ts.URL, ts.Client())

	articles, err := client.FetchHeadlines(context.Background(), "technology", 5)
	if err != nil {
		t.Fatalf("FetchHeadlines: unexpected error for empty articles: %v", err)
	}
	if len(articles) != 0 {
		t.Errorf("FetchHeadlines: got %d articles, want 0", len(articles))
	}
}

// TestFetchHeadlines_FilterByCategory: 카테고리 파라미터가 요청 쿼리에 포함돼야 한다.
func TestFetchHeadlines_FilterByCategory(t *testing.T) {
	var capturedCategory string

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedCategory = r.URL.Query().Get("category")
		resp := newsAPIResponse{
			Status:       "ok",
			TotalResults: 1,
			Articles: []newsAPIArticle{
				{
					Source:      newsAPISource{Name: "Reuters"},
					Title:       "Business News Today",
					Description: "Top business stories",
					URL:         "https://reuters.com/business",
					PublishedAt: "2026-03-06T10:00:00Z",
				},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	client := newWithHTTP("fake-api-key", server.URL, server.Client())

	_, err := client.FetchHeadlines(context.Background(), "business", 5)
	if err != nil {
		t.Fatalf("FetchHeadlines: unexpected error: %v", err)
	}
	if capturedCategory != "business" {
		t.Errorf("FetchHeadlines: category query param = %q, want %q", capturedCategory, "business")
	}
}
