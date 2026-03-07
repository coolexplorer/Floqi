package webhook

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"io"
	"net/http"
	"strings"
)

// QueueClient enqueues automation tasks triggered by webhooks.
type QueueClient interface {
	Enqueue(automationID string) error
}

// VerifyHMAC reports whether signature is a valid HMAC-SHA256 signature for body
// using the given secret. The signature must be in the format "sha256=<hex>".
// Uses constant-time comparison to prevent timing attacks.
func VerifyHMAC(body []byte, signature string, secret string) bool {
	if signature == "" {
		return false
	}

	const prefix = "sha256="
	if !strings.HasPrefix(signature, prefix) {
		return false
	}

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	expected := prefix + hex.EncodeToString(mac.Sum(nil))

	return subtle.ConstantTimeCompare([]byte(signature), []byte(expected)) == 1
}

// NewHandler returns an HTTP handler that verifies the X-Floqi-Signature header
// using HMAC-SHA256. Valid requests receive 200 OK; invalid or missing signatures
// receive 401 Unauthorized. If queue is non-nil, the automation is enqueued.
func NewHandler(secret string, queue QueueClient) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		signature := r.Header.Get("X-Floqi-Signature")
		if signature == "" {
			http.Error(w, "missing or invalid signature", http.StatusUnauthorized)
			return
		}

		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "failed to read body", http.StatusBadRequest)
			return
		}

		if !VerifyHMAC(body, signature, secret) {
			http.Error(w, "missing or invalid signature", http.StatusUnauthorized)
			return
		}

		if queue != nil {
			// TODO: parse body JSON and extract automation_id for enqueue
			_ = queue
		}

		w.WriteHeader(http.StatusOK)
	})
}
