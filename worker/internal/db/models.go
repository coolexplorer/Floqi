package db

import "time"

// ConnectedService represents an OAuth-connected external service for a user.
// Tokens are stored encrypted using AES-256-GCM.
type ConnectedService struct {
	ID                    string
	UserID                string
	Provider              string
	AccessTokenEncrypted  string
	RefreshTokenEncrypted string
	ExpiresAt             time.Time
	IsActive              bool
}
