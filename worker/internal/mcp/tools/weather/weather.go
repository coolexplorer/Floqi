// Package weather provides an MCP tool client for weather data via OpenWeatherMap API.
package weather

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
)

// WeatherData represents current weather conditions for a location.
type WeatherData struct {
	Location    string
	TempCelsius float64
	Condition   string // e.g. "clear sky", "light rain"
	Humidity    int    // percentage
}

// Client wraps the OpenWeatherMap API.
type Client struct {
	apiKey     string
	httpClient *http.Client
	baseURL    string // configurable for testing
}

// New creates a Weather client with the given API key.
func New(apiKey string) *Client {
	return &Client{
		apiKey:     apiKey,
		httpClient: http.DefaultClient,
		baseURL:    "https://api.openweathermap.org",
	}
}

// newWithHTTP creates a client with a custom HTTP client and base URL (for testing).
func newWithHTTP(apiKey, baseURL string, httpClient *http.Client) *Client {
	return &Client{apiKey: apiKey, httpClient: httpClient, baseURL: baseURL}
}

// GetWeather returns current weather data for the given location string.
func (c *Client) GetWeather(ctx context.Context, location string) (*WeatherData, error) {
	endpoint := fmt.Sprintf("%s/data/2.5/weather?q=%s&appid=%s&units=metric",
		c.baseURL, url.QueryEscape(location), c.apiKey)

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
		return nil, fmt.Errorf("weather API returned status %d", resp.StatusCode)
	}

	var apiResp struct {
		Name string `json:"name"`
		Main struct {
			Temp     float64 `json:"temp"`
			Humidity int     `json:"humidity"`
		} `json:"main"`
		Weather []struct {
			Description string `json:"description"`
		} `json:"weather"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return nil, err
	}

	condition := ""
	if len(apiResp.Weather) > 0 {
		condition = apiResp.Weather[0].Description
	}

	return &WeatherData{
		Location:    apiResp.Name,
		TempCelsius: apiResp.Main.Temp,
		Condition:   condition,
		Humidity:    apiResp.Main.Humidity,
	}, nil
}
