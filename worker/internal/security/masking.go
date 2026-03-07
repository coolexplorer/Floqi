package security

import "strings"

// MaskEmail masks an email address, showing only the first character of the local part.
// Example: "jane@gmail.com" → "j***@gmail.com"
// Returns empty string for empty input, original for invalid email format.
func MaskEmail(email string) string {
	if email == "" {
		return ""
	}

	atIdx := strings.Index(email, "@")
	if atIdx < 0 {
		return email // not a valid email, return as-is
	}

	local := email[:atIdx]
	domain := email[atIdx:] // includes "@"

	if len(local) == 0 {
		return "***" + domain
	}

	return string(local[0]) + "***" + domain
}

// MaskToken masks a token, showing only the first 8 characters.
// Example: "sk-ant-api03-abcdefgh" → "sk-ant-a***"
// Short tokens (< 8 chars) are fully masked as "***".
func MaskToken(token string) string {
	if token == "" {
		return ""
	}

	if len(token) <= 8 {
		return "***"
	}

	return token[:8] + "***"
}

// sensitiveFields lists field names whose values should be replaced with "[REDACTED]".
var sensitiveFields = map[string]bool{
	"password":      true,
	"api_key":       true,
	"access_token":  true,
	"refresh_token": true,
}

// MaskSensitiveFields returns a copy of data with sensitive values masked.
// - "password", "api_key", "access_token", "refresh_token" → "[REDACTED]"
// - fields containing "email" → MaskEmail applied
// - all other fields → preserved unchanged
func MaskSensitiveFields(data map[string]interface{}) map[string]interface{} {
	result := make(map[string]interface{}, len(data))

	for k, v := range data {
		if sensitiveFields[k] {
			result[k] = "[REDACTED]"
			continue
		}

		if strings.Contains(k, "email") {
			if s, ok := v.(string); ok {
				result[k] = MaskEmail(s)
			} else {
				result[k] = v
			}
			continue
		}

		result[k] = v
	}

	return result
}
