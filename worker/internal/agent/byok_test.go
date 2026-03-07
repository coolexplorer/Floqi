package agent

// TC-5018~5021: Managed/BYOK LLM 분기 테스트 (TDD Red Phase)
// US-505: 사용자의 Managed/BYOK LLM 설정에 따라 적절한 API 키를 사용한다.
//
// 구현 요구사항:
//   - LLMConfig 타입: mode ("managed"|"byok"), encrypted_api_key
//   - resolveLLMConfig(config LLMConfig, decrypt DecryptFunc, managedKey string) (string, error)
//   - TC-5018: mode="managed" → managedKey 반환
//   - TC-5019: mode="byok" + 유효한 encrypted_api_key → 복호화된 키 반환
//   - TC-5020: mode="byok" + 복호화 실패 → managedKey 폴백, 에러 로깅
//   - TC-5021: 빈 LLMConfig (zero value) → managed 모드 기본 동작
//
// FAILURES expected (Red phase):
//   - LLMConfig 타입 미정의 → 컴파일 에러
//   - resolveLLMConfig 함수 미구현 → 컴파일 에러

import (
	"errors"
	"testing"
)

// ── TC-5018: managed 모드 ──────────────────────────────────────────────────────

// TC-5018: llm_config.mode = "managed" → 서비스 ANTHROPIC_API_KEY 사용
func TestResolveLLMConfig_ManagedMode(t *testing.T) {
	config := LLMConfig{
		Mode: "managed",
	}
	managedKey := "sk-ant-managed-key"

	// 복호화 함수는 호출되어서는 안 됨
	decryptCalled := false
	decrypt := func(encrypted string) (string, error) {
		decryptCalled = true
		return "", nil
	}

	key, err := resolveLLMConfig(config, decrypt, managedKey)
	if err != nil {
		t.Fatalf("TC-5018: unexpected error: %v", err)
	}
	if key != managedKey {
		t.Errorf("TC-5018: key = %q, want managed key %q", key, managedKey)
	}
	if decryptCalled {
		t.Error("TC-5018: decrypt should NOT be called for managed mode")
	}
}

// ── TC-5019: BYOK 모드 (유효한 키) ───────────────────────────────────────────

// TC-5019: llm_config.mode = "byok", 유효한 키 → 복호화된 사용자 API 키 사용
func TestResolveLLMConfig_BYOKMode_ValidKey(t *testing.T) {
	encryptedKey := "a1b2c3:d4e5f6" // 암호화된 키 (hex format)
	decryptedKey := "sk-ant-user-byok-key"
	managedKey := "sk-ant-managed-key"

	config := LLMConfig{
		Mode:            "byok",
		EncryptedAPIKey: encryptedKey,
	}

	decrypt := func(encrypted string) (string, error) {
		if encrypted != encryptedKey {
			t.Errorf("TC-5019: decrypt called with %q, want %q", encrypted, encryptedKey)
		}
		return decryptedKey, nil
	}

	key, err := resolveLLMConfig(config, decrypt, managedKey)
	if err != nil {
		t.Fatalf("TC-5019: unexpected error: %v", err)
	}
	if key != decryptedKey {
		t.Errorf("TC-5019: key = %q, want decrypted user key %q", key, decryptedKey)
	}
}

// TC-5019: BYOK 모드에서 managedKey를 사용하지 않는지 확인
func TestResolveLLMConfig_BYOKMode_DoesNotUseManagedKey(t *testing.T) {
	config := LLMConfig{
		Mode:            "byok",
		EncryptedAPIKey: "encrypted-key",
	}
	managedKey := "sk-ant-managed-key"
	userKey := "sk-ant-user-key"

	decrypt := func(_ string) (string, error) { return userKey, nil }

	key, err := resolveLLMConfig(config, decrypt, managedKey)
	if err != nil {
		t.Fatalf("TC-5019: unexpected error: %v", err)
	}
	if key == managedKey {
		t.Error("TC-5019: returned managed key — should return user's BYOK key")
	}
	if key != userKey {
		t.Errorf("TC-5019: key = %q, want %q", key, userKey)
	}
}

// ── TC-5020: BYOK 모드 (복호화 실패) → managed 폴백 ─────────────────────────

// TC-5020: llm_config.mode = "byok", 복호화 실패 → managed 모드로 폴백, 에러 로깅
func TestResolveLLMConfig_BYOKMode_DecryptFailure_FallsBackToManaged(t *testing.T) {
	config := LLMConfig{
		Mode:            "byok",
		EncryptedAPIKey: "corrupted-cipher",
	}
	managedKey := "sk-ant-managed-key"
	decryptErr := errors.New("cipher: message authentication failed")

	decrypt := func(_ string) (string, error) {
		return "", decryptErr
	}

	// 복호화 실패해도 함수는 에러를 반환하지 않고 managedKey로 폴백
	key, err := resolveLLMConfig(config, decrypt, managedKey)
	if err != nil {
		t.Fatalf("TC-5020: unexpected error on fallback: %v (should fallback gracefully)", err)
	}
	if key != managedKey {
		t.Errorf("TC-5020: key = %q, want managed fallback key %q", key, managedKey)
	}
}

// TC-5020: 폴백 시 반환값이 빈 문자열이 아닌지 확인
func TestResolveLLMConfig_BYOKMode_DecryptFailure_NonEmptyKey(t *testing.T) {
	config := LLMConfig{Mode: "byok", EncryptedAPIKey: "bad-cipher"}
	managedKey := "sk-ant-managed-fallback"

	decrypt := func(_ string) (string, error) {
		return "", errors.New("decryption error")
	}

	key, _ := resolveLLMConfig(config, decrypt, managedKey)
	if key == "" {
		t.Error("TC-5020: fallback key should not be empty")
	}
}

// ── TC-5021: 빈 LLMConfig → managed 기본 동작 ────────────────────────────────

// TC-5021: llm_config가 빈 JSON (zero value LLMConfig) → managed 모드로 기본 동작
func TestResolveLLMConfig_EmptyConfig_DefaultsToManaged(t *testing.T) {
	config := LLMConfig{} // zero value: mode="", encrypted_api_key=""
	managedKey := "sk-ant-managed-key"

	decryptCalled := false
	decrypt := func(_ string) (string, error) {
		decryptCalled = true
		return "user-key", nil
	}

	key, err := resolveLLMConfig(config, decrypt, managedKey)
	if err != nil {
		t.Fatalf("TC-5021: unexpected error: %v", err)
	}
	if key != managedKey {
		t.Errorf("TC-5021: key = %q, want managed key %q for empty config", key, managedKey)
	}
	if decryptCalled {
		t.Error("TC-5021: decrypt should NOT be called for empty config (defaults to managed)")
	}
}

// TC-5021: mode가 알 수 없는 값인 경우에도 managed로 안전하게 폴백
func TestResolveLLMConfig_UnknownMode_FallsBackToManaged(t *testing.T) {
	config := LLMConfig{Mode: "unknown-mode"}
	managedKey := "sk-ant-managed-key"

	decrypt := func(_ string) (string, error) { return "user-key", nil }

	key, err := resolveLLMConfig(config, decrypt, managedKey)
	if err != nil {
		t.Fatalf("TC-5021: unexpected error for unknown mode: %v", err)
	}
	if key != managedKey {
		t.Errorf("TC-5021: key = %q for unknown mode, want managed fallback %q", key, managedKey)
	}
}

// TC-5021: BYOK 모드이지만 encrypted_api_key가 비어있는 경우 → managed 폴백
func TestResolveLLMConfig_BYOKMode_EmptyEncryptedKey_FallsBackToManaged(t *testing.T) {
	config := LLMConfig{
		Mode:            "byok",
		EncryptedAPIKey: "", // 키가 설정되지 않음
	}
	managedKey := "sk-ant-managed-key"

	decryptCalled := false
	decrypt := func(_ string) (string, error) {
		decryptCalled = true
		return "user-key", nil
	}

	key, err := resolveLLMConfig(config, decrypt, managedKey)
	if err != nil {
		t.Fatalf("TC-5021: unexpected error: %v", err)
	}
	if key != managedKey {
		t.Errorf("TC-5021: key = %q for empty byok key, want managed fallback %q", key, managedKey)
	}
	if decryptCalled {
		t.Error("TC-5021: decrypt should NOT be called when encrypted_api_key is empty")
	}
}
