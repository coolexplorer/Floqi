package weather

// TC-4003 관련: Weather MCP 도구 테스트 (TDD Red Phase)
//
// 구현 요구사항:
//   - GetWeather(ctx, location) (*WeatherData, error): 위치 문자열로 현재 날씨 반환
//   - WeatherData: Location, TempCelsius, Condition, Humidity 필드 포함
//
// Mock 전략:
//   - httptest.NewServer로 OpenWeatherMap API 응답 모킹
//   - newWithHTTP(apiKey, baseURL, httpClient)로 테스트 서버 주입

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// openWeatherResponse mirrors the OpenWeatherMap current weather API response.
type openWeatherResponse struct {
	Name string `json:"name"`
	Main struct {
		Temp     float64 `json:"temp"`
		Humidity int     `json:"humidity"`
	} `json:"main"`
	Weather []struct {
		Description string `json:"description"`
	} `json:"weather"`
}

// setupWeatherTestServer creates an httptest server that mimics OpenWeatherMap API.
func setupWeatherTestServer(t *testing.T, location string, tempCelsius float64, condition string, humidity int) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify the request path
		if r.URL.Path != "/data/2.5/weather" {
			http.Error(w, "unexpected path: "+r.URL.Path, http.StatusNotFound)
			return
		}

		resp := openWeatherResponse{
			Name: location,
		}
		resp.Main.Temp = tempCelsius
		resp.Main.Humidity = humidity
		resp.Weather = []struct {
			Description string `json:"description"`
		}{{Description: condition}}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}))
}

// TC-4003 관련: GetWeather(location) → returns *WeatherData
func TestGetWeather(t *testing.T) {
	tests := []struct {
		name      string
		location  string
		wantTemp  float64
		wantCond  string
		wantHumid int
	}{
		{
			name:      "Seoul clear weather",
			location:  "Seoul",
			wantTemp:  15.0,
			wantCond:  "clear sky",
			wantHumid: 55,
		},
		{
			name:      "Busan rainy weather",
			location:  "Busan",
			wantTemp:  12.5,
			wantCond:  "light rain",
			wantHumid: 80,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ts := setupWeatherTestServer(t, tt.location, tt.wantTemp, tt.wantCond, tt.wantHumid)
			defer ts.Close()

			client := newWithHTTP("fake-api-key", ts.URL, ts.Client())

			data, err := client.GetWeather(context.Background(), tt.location)
			if err != nil {
				t.Fatalf("GetWeather(%q): unexpected error: %v", tt.location, err)
			}
			if data == nil {
				t.Fatalf("GetWeather(%q): expected non-nil WeatherData", tt.location)
			}
			if data.Location != tt.location {
				t.Errorf("Location = %q, want %q", data.Location, tt.location)
			}
			if data.TempCelsius != tt.wantTemp {
				t.Errorf("TempCelsius = %.1f, want %.1f", data.TempCelsius, tt.wantTemp)
			}
			if data.Condition != tt.wantCond {
				t.Errorf("Condition = %q, want %q", data.Condition, tt.wantCond)
			}
			if data.Humidity != tt.wantHumid {
				t.Errorf("Humidity = %d, want %d", data.Humidity, tt.wantHumid)
			}
		})
	}
}
