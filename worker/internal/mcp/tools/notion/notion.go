// Package notion provides an MCP tool client for Notion API operations.
package notion

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
)

// Page represents a Notion page.
type Page struct {
	ID    string
	Title string
	URL   string
}

// Client wraps the Notion API with an integration token.
type Client struct {
	token      string
	baseURL    string
	httpClient *http.Client
}

// New creates a Notion client with the given integration token.
func New(token string) *Client {
	return &Client{
		token:      token,
		baseURL:    "https://api.notion.com",
		httpClient: http.DefaultClient,
	}
}

// newWithHTTP creates a client with a custom HTTP client and base URL (for testing).
func newWithHTTP(token, baseURL string, client *http.Client) *Client {
	return &Client{token: token, baseURL: baseURL, httpClient: client}
}

// apiPageResponse is the internal struct used for decoding Notion API page objects.
type apiPageResponse struct {
	ID         string                 `json:"id"`
	URL        string                 `json:"url"`
	Properties map[string]interface{} `json:"properties"`
}

func (p *apiPageResponse) toPage() *Page {
	return &Page{ID: p.ID, Title: extractTitle(p.Properties), URL: p.URL}
}

// extractTitle parses the title from Notion page properties.
// Notion stores page title as: properties.title.title[0].plain_text
func extractTitle(props map[string]interface{}) string {
	titleProp, ok := props["title"].(map[string]interface{})
	if !ok {
		return ""
	}
	titles, ok := titleProp["title"].([]interface{})
	if !ok || len(titles) == 0 {
		return ""
	}
	first, ok := titles[0].(map[string]interface{})
	if !ok {
		return ""
	}
	title, _ := first["plain_text"].(string)
	return title
}

func (c *Client) newRequest(ctx context.Context, method, path string, body []byte) (*http.Request, error) {
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Notion-Version", "2022-06-28")
	return req, nil
}

// CreatePage creates a new page in the given Notion database.
func (c *Client) CreatePage(ctx context.Context, databaseID, title, content string) (*Page, error) {
	body := map[string]interface{}{
		"parent": map[string]string{"database_id": databaseID},
		"properties": map[string]interface{}{
			"title": map[string]interface{}{
				"title": []map[string]interface{}{
					{"text": map[string]string{"content": title}},
				},
			},
		},
		"children": []map[string]interface{}{
			{
				"object": "block",
				"type":   "paragraph",
				"paragraph": map[string]interface{}{
					"rich_text": []map[string]interface{}{
						{"type": "text", "text": map[string]string{"content": content}},
					},
				},
			},
		},
	}

	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	req, err := c.newRequest(ctx, http.MethodPost, "/v1/pages", bodyBytes)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("notion API returned status %d", resp.StatusCode)
	}

	var apiResp apiPageResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return nil, err
	}
	return apiResp.toPage(), nil
}

// SearchPages searches for pages matching the given query string.
func (c *Client) SearchPages(ctx context.Context, query string) ([]Page, error) {
	bodyBytes, err := json.Marshal(map[string]string{"query": query})
	if err != nil {
		return nil, err
	}

	req, err := c.newRequest(ctx, http.MethodPost, "/v1/search", bodyBytes)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("notion API returned status %d", resp.StatusCode)
	}

	var apiResp struct {
		Results []apiPageResponse `json:"results"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return nil, err
	}

	pages := make([]Page, 0, len(apiResp.Results))
	for i := range apiResp.Results {
		pages = append(pages, *apiResp.Results[i].toPage())
	}
	return pages, nil
}
