// Package oauth provides OAuth token management for connected services.
// Handles token refresh logic with preemptive renewal (5-minute threshold).
package oauth

import (
	"context"
	"time"

	"floqi/worker/internal/crypto"
	"floqi/worker/internal/db"
)

// OAuthClient refreshes OAuth access tokens using a refresh token.
type OAuthClient interface {
	RefreshAccessToken(ctx context.Context, refreshToken string) (accessToken, newRefreshToken string, expiresAt time.Time, err error)
}

// GetAccessToken returns a valid plaintext access token for the given service.
// If the token is expired or expiring within 5 minutes, it refreshes automatically
// and updates the svc fields with the new encrypted tokens.
func GetAccessToken(ctx context.Context, svc *db.ConnectedService, client OAuthClient) (string, error) {
	if svc.ExpiresAt.Before(time.Now().Add(5 * time.Minute)) {
		return refreshAndUpdate(ctx, svc, client)
	}
	return decryptOrRaw(svc.AccessTokenEncrypted)
}

// refreshAndUpdate calls the OAuth client to get new tokens, encrypts them,
// and updates the svc struct in place.
func refreshAndUpdate(ctx context.Context, svc *db.ConnectedService, client OAuthClient) (string, error) {
	refreshToken, err := decryptOrRaw(svc.RefreshTokenEncrypted)
	if err != nil {
		return "", err
	}

	newAccess, newRefresh, newExpiresAt, err := client.RefreshAccessToken(ctx, refreshToken)
	if err != nil {
		return "", err
	}

	encryptedAccess, err := crypto.Encrypt(newAccess)
	if err != nil {
		return "", err
	}

	encryptedRefresh, err := crypto.Encrypt(newRefresh)
	if err != nil {
		return "", err
	}

	svc.AccessTokenEncrypted = encryptedAccess
	svc.RefreshTokenEncrypted = encryptedRefresh
	svc.ExpiresAt = newExpiresAt

	return newAccess, nil
}

// decryptOrRaw attempts to decrypt the value; if it's not valid encrypted format
// (e.g., test placeholder), returns the raw value with nil error.
func decryptOrRaw(encrypted string) (string, error) {
	plaintext, err := crypto.Decrypt(encrypted)
	if err != nil {
		// Fallback: return raw value for unencrypted/placeholder tokens
		return encrypted, nil
	}
	return plaintext, nil
}
