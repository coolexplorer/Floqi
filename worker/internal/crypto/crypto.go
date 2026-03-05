package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"strings"
	"sync"
)

var (
	encKey     []byte
	keyOnce    sync.Once
	keyInitErr error
)

// initKey loads the AES-256 encryption key from TOKEN_ENCRYPTION_KEY env var.
// Called lazily so TestMain can set the env var before any test runs.
func initKey() {
	keyHex := os.Getenv("TOKEN_ENCRYPTION_KEY")
	if keyHex == "" {
		keyInitErr = errors.New("TOKEN_ENCRYPTION_KEY not set")
		return
	}
	if len(keyHex) != 64 {
		keyInitErr = errors.New("TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes)")
		return
	}
	key, err := hex.DecodeString(keyHex)
	if err != nil {
		keyInitErr = fmt.Errorf("invalid TOKEN_ENCRYPTION_KEY: %w", err)
		return
	}
	encKey = key
}

func getKey() ([]byte, error) {
	keyOnce.Do(initKey)
	if keyInitErr != nil {
		return nil, keyInitErr
	}
	return encKey, nil
}

// Encrypt encrypts plaintext using AES-256-GCM.
// Returns format: "iv_hex:ciphertext_hex"
func Encrypt(plaintext string) (string, error) {
	key, err := getKey()
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize()) // 12 bytes for GCM
	if _, err := rand.Read(nonce); err != nil {
		return "", err
	}

	ciphertext := gcm.Seal(nil, nonce, []byte(plaintext), nil)

	return hex.EncodeToString(nonce) + ":" + hex.EncodeToString(ciphertext), nil
}

// Decrypt decrypts a ciphertext in format "iv_hex:ciphertext_hex".
func Decrypt(encrypted string) (string, error) {
	key, err := getKey()
	if err != nil {
		return "", err
	}

	parts := strings.SplitN(encrypted, ":", 2)
	if len(parts) != 2 {
		return "", errors.New("invalid encrypted format: expected iv_hex:ciphertext_hex")
	}

	nonce, err := hex.DecodeString(parts[0])
	if err != nil {
		return "", fmt.Errorf("invalid nonce hex: %w", err)
	}

	ciphertext, err := hex.DecodeString(parts[1])
	if err != nil {
		return "", fmt.Errorf("invalid ciphertext hex: %w", err)
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", fmt.Errorf("decryption failed: %w", err)
	}

	return string(plaintext), nil
}
