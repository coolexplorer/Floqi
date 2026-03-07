package agent

import "log"

// DecryptFunc is a function that decrypts an AES-256-GCM ciphertext string.
// Matches the signature of crypto.Decrypt.
type DecryptFunc func(encrypted string) (string, error)

// LLMConfig holds the user's LLM configuration.
// Mode can be "managed" (service API key) or "byok" (user's own key).
type LLMConfig struct {
	Mode            string
	EncryptedAPIKey string
}

// resolveLLMConfig returns the API key to use for LLM calls.
// - "byok" mode with a valid encrypted key → decrypt and return user's key
// - "byok" mode with decryption failure → fall back to managedKey (logged)
// - "byok" mode with empty encrypted key → fall back to managedKey
// - "managed" mode or any other value → return managedKey
func resolveLLMConfig(config LLMConfig, decrypt DecryptFunc, managedKey string) (string, error) {
	if config.Mode != "byok" || config.EncryptedAPIKey == "" {
		return managedKey, nil
	}

	key, err := decrypt(config.EncryptedAPIKey)
	if err != nil {
		log.Printf("BYOK: decryption failed, falling back to managed key: %v", err)
		return managedKey, nil
	}

	return key, nil
}
