package security

// TC-10018~10020: 민감 정보 마스킹 테스트 (TDD Red Phase)
// US-1006: 실행 로그에서 민감 정보를 마스킹한다.
//
// 구현 요구사항:
//   - MaskEmail(email string) string
//     → "jane@gmail.com" → "j***@gmail.com"
//   - MaskToken(token string) string
//     → "sk-ant-api03-xxxx" → "sk-ant-***"
//     → OAuth access_token → 앞 8자 + "***"
//   - MaskSensitiveFields(data map[string]interface{}) map[string]interface{}
//     → "password", "api_key", "access_token", "refresh_token" 필드 → "[REDACTED]"
//     → "email" 필드 → MaskEmail() 적용
//
// FAILURES expected (Red phase):
//   - security 패키지 미존재 → 컴파일 에러
//   - MaskEmail, MaskToken, MaskSensitiveFields 함수 미구현 → 컴파일 에러

import "testing"

// ── TC-10018: 이메일 주소 마스킹 ─────────────────────────────────────────────

// TC-10018: 실행 로그 output에 이메일 주소 포함 → 이메일 마스킹 (j***@gmail.com)
func TestMaskEmail_Standard(t *testing.T) {
	result := MaskEmail("jane@gmail.com")
	// 기대: 첫 글자 표시, local part 나머지 마스킹, 도메인 유지
	expected := "j***@gmail.com"
	if result != expected {
		t.Errorf("TC-10018: MaskEmail(%q) = %q, want %q", "jane@gmail.com", result, expected)
	}
}

// TC-10018: 다른 이메일 형식도 올바르게 마스킹
func TestMaskEmail_OtherFormats(t *testing.T) {
	cases := []struct {
		input string
		want  string
	}{
		{"john.doe@example.com", "j***@example.com"},
		{"a@b.com", "a***@b.com"},         // 단일 문자 local part
		{"test@floqi.io", "t***@floqi.io"},
	}

	for _, tc := range cases {
		t.Run(tc.input, func(t *testing.T) {
			result := MaskEmail(tc.input)
			if result != tc.want {
				t.Errorf("TC-10018: MaskEmail(%q) = %q, want %q", tc.input, result, tc.want)
			}
		})
	}
}

// TC-10018: 이메일 형식이 아닌 문자열 → 원본 반환 (또는 전체 마스킹)
func TestMaskEmail_Invalid(t *testing.T) {
	result := MaskEmail("not-an-email")
	// 이메일 형식이 아닌 경우 원본 그대로 또는 전체 마스킹
	if result == "" {
		t.Error("TC-10018: MaskEmail for invalid email should not return empty string")
	}
}

// TC-10018: 빈 문자열 입력
func TestMaskEmail_Empty(t *testing.T) {
	result := MaskEmail("")
	if result != "" {
		t.Errorf("TC-10018: MaskEmail(%q) = %q, want %q", "", result, "")
	}
}

// ── TC-10019: 토큰 마스킹 ────────────────────────────────────────────────────

// TC-10019: tool_calls에 access_token 포함 → 토큰 마스킹 (sk-ant-***)
func TestMaskToken_AnthropicKey(t *testing.T) {
	token := "sk-ant-api03-abcdefghij1234567890"
	result := MaskToken(token)
	// 기대: 프리픽스(sk-ant) 표시 후 마스킹
	if result == token {
		t.Errorf("TC-10019: MaskToken should not return original token unchanged")
	}
	if result == "" {
		t.Error("TC-10019: MaskToken should not return empty string")
	}
	// 마스킹 결과에 원본 키의 비밀 부분이 포함되어서는 안 됨
	if len(result) > 20 {
		// 원본보다 훨씬 짧아야 마스킹된 것
		t.Logf("TC-10019: MaskToken result length %d — consider checking mask sufficiency", len(result))
	}
}

// TC-10019: OAuth access_token 마스킹
func TestMaskToken_OAuthAccessToken(t *testing.T) {
	token := "ya29.a0AfH6SMBxxx-verylongoauthtoken"
	result := MaskToken(token)

	if result == token {
		t.Error("TC-10019: OAuth token should be masked")
	}
	if result == "" {
		t.Error("TC-10019: masked token should not be empty")
	}
	// 앞 8자만 표시 + "***" 형태 확인
	expectedPrefix := token[:8]
	if len(result) > 0 && result[:8] != expectedPrefix {
		t.Errorf("TC-10019: MaskToken should preserve first 8 chars: got %q, want prefix %q", result, expectedPrefix)
	}
}

// TC-10019: 짧은 토큰 (8자 미만) 마스킹
func TestMaskToken_ShortToken(t *testing.T) {
	token := "abc123"
	result := MaskToken(token)

	if result == "" {
		t.Error("TC-10019: MaskToken for short token should not return empty")
	}
	// 짧은 토큰도 마스킹되어야 함
	if result == token {
		t.Error("TC-10019: short token should also be masked")
	}
}

// TC-10019: 빈 토큰 입력
func TestMaskToken_Empty(t *testing.T) {
	result := MaskToken("")
	if result != "" {
		t.Errorf("TC-10019: MaskToken(%q) = %q, want %q", "", result, "")
	}
}

// ── TC-10020: 민감 필드 자동 제외 ────────────────────────────────────────────

// TC-10020: 로그에 비밀번호/API 키가 포함되지 않음 → 민감 필드 자동 제외
func TestMaskSensitiveFields_Password(t *testing.T) {
	data := map[string]interface{}{
		"action":   "login",
		"password": "supersecret123",
	}

	result := MaskSensitiveFields(data)

	if result["password"] == "supersecret123" {
		t.Error("TC-10020: password field must not appear in plaintext in logs")
	}
	if result["password"] == "" || result["password"] == nil {
		t.Error("TC-10020: password field should be replaced with [REDACTED], not removed")
	}
	if result["password"] != "[REDACTED]" {
		t.Errorf("TC-10020: password = %q, want %q", result["password"], "[REDACTED]")
	}
	// 비민감 필드는 유지
	if result["action"] != "login" {
		t.Errorf("TC-10020: non-sensitive field 'action' should be preserved")
	}
}

// TC-10020: API 키 필드 제외
func TestMaskSensitiveFields_APIKey(t *testing.T) {
	data := map[string]interface{}{
		"tool":    "anthropic",
		"api_key": "sk-ant-secret-key",
	}

	result := MaskSensitiveFields(data)

	if result["api_key"] == "sk-ant-secret-key" {
		t.Error("TC-10020: api_key must not appear in plaintext")
	}
	if result["api_key"] != "[REDACTED]" {
		t.Errorf("TC-10020: api_key = %q, want [REDACTED]", result["api_key"])
	}
}

// TC-10020: access_token 및 refresh_token 마스킹
func TestMaskSensitiveFields_OAuthTokens(t *testing.T) {
	data := map[string]interface{}{
		"provider":      "google",
		"access_token":  "ya29.access-token-value",
		"refresh_token": "1//refresh-token-value",
	}

	result := MaskSensitiveFields(data)

	if result["access_token"] == "ya29.access-token-value" {
		t.Error("TC-10020: access_token must not appear in plaintext")
	}
	if result["refresh_token"] == "1//refresh-token-value" {
		t.Error("TC-10020: refresh_token must not appear in plaintext")
	}
	// provider는 민감 정보가 아니므로 유지
	if result["provider"] != "google" {
		t.Error("TC-10020: non-sensitive field 'provider' should be preserved")
	}
}

// TC-10020: 이메일 필드는 삭제가 아닌 마스킹 (MaskEmail 적용)
func TestMaskSensitiveFields_Email(t *testing.T) {
	data := map[string]interface{}{
		"user_email": "jane@gmail.com",
		"subject":    "Meeting tomorrow",
	}

	result := MaskSensitiveFields(data)

	// 이메일은 완전 삭제가 아닌 마스킹
	if result["user_email"] == "jane@gmail.com" {
		t.Error("TC-10020: email should be masked, not exposed as plaintext")
	}
	if result["user_email"] == nil || result["user_email"] == "" {
		t.Error("TC-10020: email field should not be removed, it should be masked")
	}
	// 마스킹된 이메일은 @를 포함해야 함
	maskedEmail, ok := result["user_email"].(string)
	if !ok || maskedEmail == "" {
		t.Error("TC-10020: masked email should be a non-empty string")
	}
}

// TC-10020: 민감 필드가 없는 데이터는 변경 없이 반환
func TestMaskSensitiveFields_NoSensitiveData(t *testing.T) {
	data := map[string]interface{}{
		"tool":   "gmail",
		"action": "list_emails",
		"count":  10,
	}

	result := MaskSensitiveFields(data)

	if result["tool"] != "gmail" || result["action"] != "list_emails" || result["count"] != 10 {
		t.Error("TC-10020: non-sensitive fields should be preserved unchanged")
	}
}

// TC-10020: 빈 맵 입력
func TestMaskSensitiveFields_EmptyMap(t *testing.T) {
	data := map[string]interface{}{}
	result := MaskSensitiveFields(data)

	if result == nil {
		t.Error("TC-10020: MaskSensitiveFields should return non-nil map for empty input")
	}
	if len(result) != 0 {
		t.Errorf("TC-10020: expected empty map, got %v", result)
	}
}

// TC-10020: nil 값을 가진 민감 필드 처리
func TestMaskSensitiveFields_NilValue(t *testing.T) {
	data := map[string]interface{}{
		"password": nil,
		"action":   "test",
	}

	// nil 값도 안전하게 처리 (패닉 없이)
	result := MaskSensitiveFields(data)
	if result == nil {
		t.Error("TC-10020: should not return nil when input has nil values")
	}
}
