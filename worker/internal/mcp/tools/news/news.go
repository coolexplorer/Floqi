// Package news provides an MCP tool client for News API operations.
package news

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
)

// Article represents a news article from the News API.
type Article struct {
	Title       string
	Description string
	URL         string
	PublishedAt string
	Source      string
}

// Client wraps the News API with an API key.
type Client struct {
	apiKey     string
	baseURL    string
	httpClient *http.Client
}

// New creates a News client with the given API key.
func New(apiKey string) *Client {
	return &Client{
		apiKey:     apiKey,
		baseURL:    "https://newsapi.org",
		httpClient: http.DefaultClient,
	}
}

// newWithHTTP creates a client with a custom HTTP client and base URL (for testing).
func newWithHTTP(apiKey, baseURL string, client *http.Client) *Client {
	return &Client{apiKey: apiKey, baseURL: baseURL, httpClient: client}
}

// FetchHeadlines returns top headlines for the given category.
func (c *Client) FetchHeadlines(ctx context.Context, category string, pageSize int) ([]Article, error) {
	endpoint := fmt.Sprintf("%s/v2/top-headlines?apiKey=%s&category=%s&pageSize=%d",
		c.baseURL, c.apiKey, url.QueryEscape(category), pageSize)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("news API returned status %d", resp.StatusCode)
	}

	var apiResp struct {
		Articles []struct {
			Source struct {
				Name string `json:"name"`
			} `json:"source"`
			Title       string `json:"title"`
			Description string `json:"description"`
			URL         string `json:"url"`
			PublishedAt string `json:"publishedAt"`
		} `json:"articles"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return nil, err
	}

	articles := make([]Article, 0, len(apiResp.Articles))
	for _, a := range apiResp.Articles {
		articles = append(articles, Article{
			Title:       a.Title,
			Description: a.Description,
			URL:         a.URL,
			PublishedAt: a.PublishedAt,
			Source:      a.Source.Name,
		})
	}
	return articles, nil
}
