package webhook

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
)

// QueueClient enqueues automation tasks triggered by webhooks.
type QueueClient interface {
	Enqueue(automationID string) error
}

// WebhookExecutionResult holds the result of executing an automation via webhook.
type WebhookExecutionResult struct {
	AutomationID string `json:"automation_id"`
	Output       string `json:"output"`
	Success      bool   `json:"success"`
}

// ErrAutomationNotFound is returned when the requested automation doesn't exist.
var ErrAutomationNotFound = errors.New("automation not found")

// AutomationExecutor executes an automation and returns the result.
type AutomationExecutor interface {
	Execute(ctx context.Context, automationID string) (*WebhookExecutionResult, error)
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
			var payload struct {
				AutomationID string `json:"automation_id"`
			}
			if err := json.Unmarshal(body, &payload); err != nil || payload.AutomationID == "" {
				http.Error(w, "invalid payload: missing automation_id", http.StatusBadRequest)
				return
			}
			if err := queue.Enqueue(payload.AutomationID); err != nil {
				http.Error(w, "failed to enqueue automation", http.StatusInternalServerError)
				return
			}
		}

		w.WriteHeader(http.StatusOK)
	})
}

// NewExecutorHandler returns an HTTP handler that verifies the HMAC signature,
// then executes the automation via the provided executor and returns the result as JSON.
// Returns 401 for invalid/missing signatures, 404 if automation not found, 500 on execution error.
func NewExecutorHandler(secret string, executor AutomationExecutor) http.Handler {
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

		var payload struct {
			AutomationID string `json:"automation_id"`
		}
		if err := json.Unmarshal(body, &payload); err != nil || payload.AutomationID == "" {
			http.Error(w, "invalid payload: missing automation_id", http.StatusBadRequest)
			return
		}

		result, err := executor.Execute(r.Context(), payload.AutomationID)
		if err != nil {
			if errors.Is(err, ErrAutomationNotFound) {
				http.Error(w, "automation not found", http.StatusNotFound)
				return
			}
			http.Error(w, "execution failed: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(result)
	})
}
