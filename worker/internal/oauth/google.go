package oauth

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// GoogleOAuthClient implements OAuthClient for Google OAuth2.
type GoogleOAuthClient struct {
	ClientID     string
	ClientSecret string
}

// NewGoogleOAuthClient creates a new GoogleOAuthClient.
func NewGoogleOAuthClient(clientID, clientSecret string) *GoogleOAuthClient {
	return &GoogleOAuthClient{
		ClientID:     clientID,
		ClientSecret: clientSecret,
	}
}

type googleTokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
}

// RefreshAccessToken refreshes a Google OAuth2 access token using the refresh token.
func (c *GoogleOAuthClient) RefreshAccessToken(ctx context.Context, refreshToken string) (string, string, time.Time, error) {
	data := url.Values{
		"grant_type":    {"refresh_token"},
		"client_id":     {c.ClientID},
		"client_secret": {c.ClientSecret},
		"refresh_token": {refreshToken},
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://oauth2.googleapis.com/token", strings.NewReader(data.Encode()))
	if err != nil {
		return "", "", time.Time{}, fmt.Errorf("create refresh request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", "", time.Time{}, fmt.Errorf("execute refresh request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", "", time.Time{}, fmt.Errorf("google token refresh failed with status %d", resp.StatusCode)
	}

	var tokenResp googleTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return "", "", time.Time{}, fmt.Errorf("decode token response: %w", err)
	}

	newRefreshToken := tokenResp.RefreshToken
	if newRefreshToken == "" {
		newRefreshToken = refreshToken
	}

	expiresAt := time.Now().Add(time.Duration(tokenResp.ExpiresIn) * time.Second)

	return tokenResp.AccessToken, newRefreshToken, expiresAt, nil
}
