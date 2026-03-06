package oauth_test

// TC-2014 ~ TC-2016: OAuth 토큰 자동 갱신 테스트 (TDD Red Phase)
//
// 이 테스트 파일은 token.go 구현 이전에 작성되었습니다.
// GetAccessToken, OAuthClient 등이 정의되지 않아 컴파일 실패합니다.
//
// 구현 요구사항:
// - GetAccessToken(ctx, svc, client) (string, error): 유효한 access token 반환
// - OAuthClient interface: RefreshAccessToken(ctx, refreshToken) 메서드
// - 만료 임박 기준: 5분 (preemptive refresh threshold)
// - 토큰 갱신 시 svc 필드 업데이트 (AccessTokenEncrypted, RefreshTokenEncrypted, ExpiresAt)

import (
	"context"
	"errors"
	"os"
	"testing"
	"time"

	"floqi/worker/internal/db"
	"floqi/worker/internal/oauth"
)

// TestMain: 암호화 키 환경변수 설정 (crypto 패키지 lazy init 지원)
func TestMain(m *testing.M) {
	os.Setenv("TOKEN_ENCRYPTION_KEY", "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef")
	os.Exit(m.Run())
}

// mockOAuthClient는 oauth.OAuthClient 인터페이스의 테스트 구현체입니다.
// RefreshAccessToken 호출 여부와 반환값을 제어할 수 있습니다.
type mockOAuthClient struct {
	refreshCalled       bool
	newAccessToken      string
	newRefreshToken     string
	newExpiresAt        time.Time
	err                 error
}

// RefreshAccessToken은 oauth.OAuthClient 인터페이스를 구현합니다.
// 실제 Google OAuth API 호출 없이 테스트 데이터를 반환합니다.
func (m *mockOAuthClient) RefreshAccessToken(ctx context.Context, refreshToken string) (accessToken, newRefreshToken string, expiresAt time.Time, err error) {
	m.refreshCalled = true
	if m.err != nil {
		return "", "", time.Time{}, m.err
	}
	return m.newAccessToken, m.newRefreshToken, m.newExpiresAt, nil
}

// TC-2014: 만료되지 않은 토큰 (10분 후 만료) → 현재 토큰 반환, 갱신 없음
//
// 기대 동작:
// - OAuthClient.RefreshAccessToken 호출하지 않음
// - 현재 access_token 복호화하여 반환
func TestGetAccessToken_NotExpired(t *testing.T) {
	ctx := context.Background()

	mock := &mockOAuthClient{
		newAccessToken:  "should_not_be_called",
		newRefreshToken: "should_not_be_called",
		newExpiresAt:    time.Now().Add(1 * time.Hour),
	}

	// 토큰이 10분 후 만료 → 갱신 대상 아님
	// 실제 구현에서는 crypto.Encrypt("current_access_token")으로 생성
	// Red phase에서는 플레이스홀더 사용 (crypto.Encrypt 미구현)
	svc := &db.ConnectedService{
		ID:                    "svc-001",
		UserID:                "user-001",
		Provider:              "google",
		AccessTokenEncrypted:  "PLACEHOLDER_ENCRYPTED_CURRENT_TOKEN",
		RefreshTokenEncrypted: "PLACEHOLDER_ENCRYPTED_REFRESH_TOKEN",
		ExpiresAt:             time.Now().Add(10 * time.Minute),
		IsActive:              true,
	}

	result, err := oauth.GetAccessToken(ctx, svc, mock)

	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	if result == "" {
		t.Error("expected non-empty access token")
	}
	if mock.refreshCalled {
		t.Error("RefreshAccessToken must NOT be called when token is not expired")
	}
}

// TC-2015: 만료된 토큰 (1시간 전 만료) → RefreshToken 호출 → 새 토큰 반환
//
// 기대 동작:
// - OAuthClient.RefreshAccessToken 호출됨
// - svc.AccessTokenEncrypted, svc.RefreshTokenEncrypted, svc.ExpiresAt 업데이트됨
// - 새 access_token (복호화 상태) 반환
func TestGetAccessToken_Expired(t *testing.T) {
	ctx := context.Background()

	mock := &mockOAuthClient{
		newAccessToken:  "refreshed_access_token_xyz",
		newRefreshToken: "new_refresh_token_xyz",
		newExpiresAt:    time.Now().Add(1 * time.Hour),
	}

	originalAccessToken := "PLACEHOLDER_ENCRYPTED_ACCESS_TOKEN"
	svc := &db.ConnectedService{
		ID:                    "svc-002",
		UserID:                "user-002",
		Provider:              "google",
		AccessTokenEncrypted:  originalAccessToken,
		RefreshTokenEncrypted: "PLACEHOLDER_ENCRYPTED_REFRESH_TOKEN",
		ExpiresAt:             time.Now().Add(-1 * time.Hour), // 1시간 전 만료
		IsActive:              true,
	}

	result, err := oauth.GetAccessToken(ctx, svc, mock)

	if err != nil {
		t.Fatalf("expected no error after refresh, got: %v", err)
	}
	if !mock.refreshCalled {
		t.Error("RefreshAccessToken MUST be called when token is expired")
	}
	if result != "refreshed_access_token_xyz" {
		t.Errorf("expected new access token, got: %q", result)
	}
	// svc가 새 토큰으로 업데이트되어야 함
	if svc.AccessTokenEncrypted == originalAccessToken {
		t.Error("svc.AccessTokenEncrypted must be updated with new encrypted token")
	}
	if svc.ExpiresAt.Before(time.Now()) {
		t.Error("svc.ExpiresAt must be updated to a future time")
	}
}

// TC-2016: 5분 이내 만료 예정 토큰 → 선제적 갱신 (Preemptive Refresh)
//
// 기대 동작:
// - 만료까지 3분 남음 (임박) → RefreshAccessToken 호출
// - 새 토큰 반환
func TestGetAccessToken_ExpiresWithin5Min(t *testing.T) {
	ctx := context.Background()

	mock := &mockOAuthClient{
		newAccessToken:  "preemptively_refreshed_token",
		newRefreshToken: "new_refresh_token_preemptive",
		newExpiresAt:    time.Now().Add(1 * time.Hour),
	}

	// 만료까지 3분 → 5분 임박 기준 이내이므로 선제적 갱신 대상
	svc := &db.ConnectedService{
		ID:                    "svc-003",
		UserID:                "user-003",
		Provider:              "google",
		AccessTokenEncrypted:  "PLACEHOLDER_ENCRYPTED_ACCESS_TOKEN",
		RefreshTokenEncrypted: "PLACEHOLDER_ENCRYPTED_REFRESH_TOKEN",
		ExpiresAt:             time.Now().Add(3 * time.Minute),
		IsActive:              true,
	}

	result, err := oauth.GetAccessToken(ctx, svc, mock)

	if err != nil {
		t.Fatalf("expected no error for preemptive refresh, got: %v", err)
	}
	if !mock.refreshCalled {
		t.Error("RefreshAccessToken MUST be called for preemptive refresh (token expiring in 3 min)")
	}
	if result != "preemptively_refreshed_token" {
		t.Errorf("expected preemptively refreshed token, got: %q", result)
	}
}

// 추가 테스트: RefreshToken 자체가 만료된 경우 (TC-2016 from test-cases.md)
// refresh_token 만료 (Google revoke) → 갱신 실패, 에러 반환
func TestGetAccessToken_RefreshTokenExpired(t *testing.T) {
	ctx := context.Background()

	refreshErr := errors.New("oauth2: token expired and refresh token is not valid")
	mock := &mockOAuthClient{
		err: refreshErr,
	}

	svc := &db.ConnectedService{
		ID:                    "svc-004",
		UserID:                "user-004",
		Provider:              "google",
		AccessTokenEncrypted:  "PLACEHOLDER_ENCRYPTED_ACCESS_TOKEN",
		RefreshTokenEncrypted: "PLACEHOLDER_ENCRYPTED_EXPIRED_REFRESH_TOKEN",
		ExpiresAt:             time.Now().Add(-2 * time.Hour), // 이미 만료
		IsActive:              true,
	}

	_, err := oauth.GetAccessToken(ctx, svc, mock)

	if err == nil {
		t.Error("expected error when refresh token is expired, got nil")
	}
}
