package crypto

// TC-10001 ~ TC-10005: AES-256-GCM 암호화/복호화 테스트 (TDD Red Phase)
//
// 이 테스트 파일은 crypto.go 구현 이전에 작성되었습니다.
// crypto.go가 존재하지 않으므로 Encrypt/Decrypt가 정의되지 않아 컴파일 실패합니다.
//
// 구현 요구사항:
// - Encrypt(plaintext string) (string, error): AES-256-GCM 암호화
// - Decrypt(encrypted string) (string, error): AES-256-GCM 복호화
// - 암호문 형식: "iv_hex:ciphertext_hex"
// - TOKEN_ENCRYPTION_KEY 환경변수에서 32바이트(64 hex chars) 키 로드

import (
	"os"
	"strings"
	"testing"
)

// TestMain: 테스트 실행 전 암호화 키 환경변수 설정
// 구현은 lazy initialization을 사용해야 TestMain에서 설정한 값이 반영됨
func TestMain(m *testing.M) {
	// 32바이트 = 64 hex 문자 (AES-256 키)
	os.Setenv("TOKEN_ENCRYPTION_KEY", "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef")
	os.Exit(m.Run())
}

// TC-10001: Encrypt → Decrypt → 원본 텍스트 일치
func TestEncryptDecrypt(t *testing.T) {
	plaintext := "sensitive_token_12345"

	encrypted, err := Encrypt(plaintext)
	if err != nil {
		t.Fatalf("Encrypt failed: %v", err)
	}
	if encrypted == plaintext {
		t.Error("encrypted text must not equal plaintext")
	}
	if encrypted == "" {
		t.Error("encrypted text must not be empty")
	}

	decrypted, err := Decrypt(encrypted)
	if err != nil {
		t.Fatalf("Decrypt failed: %v", err)
	}
	if decrypted != plaintext {
		t.Errorf("expected %q, got %q", plaintext, decrypted)
	}
}

// TC-10002: 잘못된 암호문(변조된 데이터) 복호화 시 에러 반환
func TestDecryptTamperedCiphertext(t *testing.T) {
	encrypted, err := Encrypt("test")
	if err != nil {
		t.Fatalf("Encrypt failed: %v", err)
	}

	tampered := encrypted + "corrupted"

	_, err = Decrypt(tampered)
	if err == nil {
		t.Error("expected error for tampered ciphertext, got nil")
	}
}

// TC-10003: 빈 문자열 암호화/복호화 정상 동작
func TestEncryptDecryptEmptyString(t *testing.T) {
	encrypted, err := Encrypt("")
	if err != nil {
		t.Fatalf("Encrypt empty string failed: %v", err)
	}
	if encrypted == "" {
		t.Error("encrypted result must not be empty even for empty input")
	}

	decrypted, err := Decrypt(encrypted)
	if err != nil {
		t.Fatalf("Decrypt empty string failed: %v", err)
	}
	if decrypted != "" {
		t.Errorf("expected empty string, got %q", decrypted)
	}
}

// TC-10004: 긴 텍스트(10,000자) 암호화/복호화
func TestEncryptDecryptLongText(t *testing.T) {
	longText := strings.Repeat("a", 10000)

	encrypted, err := Encrypt(longText)
	if err != nil {
		t.Fatalf("Encrypt long text failed: %v", err)
	}

	decrypted, err := Decrypt(encrypted)
	if err != nil {
		t.Fatalf("Decrypt long text failed: %v", err)
	}
	if decrypted != longText {
		t.Errorf("decrypted text does not match original long text (len: %d vs %d)", len(decrypted), len(longText))
	}
}

// TC-10005: 동일 평문을 2회 암호화 → 서로 다른 암호문 (nonce 랜덤성 검증)
func TestEncryptNonceRandomness(t *testing.T) {
	text := "test"

	enc1, err := Encrypt(text)
	if err != nil {
		t.Fatalf("first Encrypt failed: %v", err)
	}

	enc2, err := Encrypt(text)
	if err != nil {
		t.Fatalf("second Encrypt failed: %v", err)
	}

	if enc1 == enc2 {
		t.Error("two encryptions of same plaintext must produce different ciphertexts (nonce randomness)")
	}
}

// 암호문 형식 검증: "iv_hex:ciphertext_hex" (§7 스펙)
func TestEncryptedFormat(t *testing.T) {
	encrypted, err := Encrypt("hello")
	if err != nil {
		t.Fatalf("Encrypt failed: %v", err)
	}

	parts := strings.SplitN(encrypted, ":", 2)
	if len(parts) != 2 {
		t.Errorf("expected format 'iv_hex:ciphertext_hex', got: %q", encrypted)
		return
	}

	iv, ciphertext := parts[0], parts[1]
	if len(iv) == 0 {
		t.Error("IV part must not be empty")
	}
	if len(ciphertext) == 0 {
		t.Error("ciphertext part must not be empty")
	}
}
