package webhook

// TC-10013~TC-10015: Webhook HMAC 검증 테스트 (TDD Red Phase)
// US-1004: Webhook 수신 시 HMAC 서명을 검증한다.
//
// 구현 요구사항:
//   - VerifyHMAC(body []byte, signature string, secret string) bool
//     - HMAC-SHA256 서명 검증
//     - constant-time 비교 (타이밍 공격 방어)
//     - signature 형식: "sha256=<hex>"
//   - Handler: NewHandler(secret string, queue QueueClient) http.Handler
//     - POST /webhook 수신
//     - X-Floqi-Signature 헤더 검증
//     - 유효한 서명 → 200 OK, 태스크 enqueue
//     - 서명 누락 → 401 Unauthorized
//     - 잘못된 서명 → 401 Unauthorized
//
// TC-10019~TC-10021: Webhook Trigger → Automation Executor 연동 테스트 (TDD Red Phase)
// US-1005: Webhook 수신 시 자동화를 직접 실행하고 결과를 응답으로 반환한다.
//
// 추가 구현 요구사항:
//   - WebhookExecutionResult 구조체:
//     - AutomationID string `json:"automation_id"`
//     - Output       string `json:"output"`
//     - Success      bool   `json:"success"`
//   - AutomationExecutor 인터페이스:
//     - Execute(ctx context.Context, automationID string) (*WebhookExecutionResult, error)
//   - ErrAutomationNotFound: 존재하지 않는 자동화 ID 조회 시 반환하는 에러
//   - NewExecutorHandler(secret string, executor AutomationExecutor) http.Handler
//     - 유효한 서명 + 존재하는 automation_id → 실행 → 결과 JSON 응답 → 200 OK
//     - 유효한 서명 + 존재하지 않는 automation_id → 404 Not Found
//     - 잘못된/누락된 서명 → 401 Unauthorized
//
// FAILURES expected (Red phase):
//   - webhook 패키지 미존재 → 컴파일 에러
//   - VerifyHMAC 함수 미구현 → 컴파일 에러
//   - NewHandler 함수 미구현 → 컴파일 에러
//   - WebhookExecutionResult 타입 미정의 → 컴파일 에러 (TC-10019~10021)
//   - AutomationExecutor 인터페이스 미정의 → 컴파일 에러 (TC-10019~10021)
//   - ErrAutomationNotFound 미정의 → 컴파일 에러 (TC-10021)
//   - NewExecutorHandler 함수 미구현 → 컴파일 에러 (TC-10019~10021)

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

const testSecret = "test-webhook-secret-key"

// computeHMAC은 테스트용 올바른 서명을 생성하는 헬퍼.
// 실제 VerifyHMAC과 동일한 알고리즘(HMAC-SHA256, "sha256=" 접두사) 사용.
func computeHMAC(body []byte, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}

// ── TC-10013: 유효한 HMAC 서명 → 200 OK ──────────────────────────────────────

// TC-10013: VerifyHMAC - 올바른 서명 → true 반환
func TestVerifyHMAC_ValidSignature(t *testing.T) {
	body := []byte(`{"automation_id":"auto-123","trigger":"manual"}`)
	signature := computeHMAC(body, testSecret)

	// EXPECT: VerifyHMAC이 true 반환
	// ACTUAL: VerifyHMAC 미구현 → 컴파일 에러
	if !VerifyHMAC(body, signature, testSecret) {
		t.Error("TC-10013: VerifyHMAC returned false for valid signature")
	}
}

// TC-10013: HTTP 핸들러 - 유효한 서명 포함 요청 → 200 OK
func TestWebhookHandler_ValidSignature_Returns200(t *testing.T) {
	body := []byte(`{"automation_id":"auto-123","trigger":"manual"}`)
	signature := computeHMAC(body, testSecret)

	req := httptest.NewRequest(http.MethodPost, "/webhook", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Floqi-Signature", signature)

	rr := httptest.NewRecorder()

	// EXPECT: NewHandler가 정의되어 있고 200 OK 반환
	// ACTUAL: NewHandler 미구현 → 컴파일 에러
	handler := NewHandler(testSecret, nil)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("TC-10013: status = %d, want %d", rr.Code, http.StatusOK)
	}
}

// TC-10013: VerifyHMAC은 "sha256=" 접두사가 포함된 서명 형식을 처리한다
func TestVerifyHMAC_WithSha256Prefix(t *testing.T) {
	body := []byte(`{"event":"test"}`)
	mac := hmac.New(sha256.New, []byte(testSecret))
	mac.Write(body)
	signature := "sha256=" + hex.EncodeToString(mac.Sum(nil))

	if !VerifyHMAC(body, signature, testSecret) {
		t.Error("TC-10013: VerifyHMAC failed with sha256= prefix format")
	}
}

// TC-10013: 서로 다른 바디에 대해 서명이 올바르게 구분된다
func TestVerifyHMAC_DifferentBodies_DifferentSignatures(t *testing.T) {
	body1 := []byte(`{"automation_id":"auto-001"}`)
	body2 := []byte(`{"automation_id":"auto-002"}`)

	sig1 := computeHMAC(body1, testSecret)
	sig2 := computeHMAC(body2, testSecret)

	if sig1 == sig2 {
		t.Error("TC-10013: different bodies produced identical HMAC signatures")
	}

	// 각 서명은 해당 바디에 대해서만 유효해야 함
	if !VerifyHMAC(body1, sig1, testSecret) {
		t.Error("TC-10013: body1 with sig1 should be valid")
	}
	if !VerifyHMAC(body2, sig2, testSecret) {
		t.Error("TC-10013: body2 with sig2 should be valid")
	}
}

// ── TC-10014: HMAC 서명 누락 → 401 Unauthorized ──────────────────────────────

// TC-10014: HTTP 핸들러 - X-Floqi-Signature 헤더 없음 → 401
func TestWebhookHandler_MissingSignature_Returns401(t *testing.T) {
	body := []byte(`{"automation_id":"auto-123","trigger":"manual"}`)

	req := httptest.NewRequest(http.MethodPost, "/webhook", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	// X-Floqi-Signature 헤더를 의도적으로 누락

	rr := httptest.NewRecorder()

	// EXPECT: 서명 없는 요청 → 401
	// ACTUAL: NewHandler 미구현 → 컴파일 에러
	handler := NewHandler(testSecret, nil)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("TC-10014: status = %d, want %d (missing signature)", rr.Code, http.StatusUnauthorized)
	}
}

// TC-10014: HTTP 핸들러 - 빈 서명 헤더 → 401
func TestWebhookHandler_EmptySignature_Returns401(t *testing.T) {
	body := []byte(`{"automation_id":"auto-123"}`)

	req := httptest.NewRequest(http.MethodPost, "/webhook", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Floqi-Signature", "") // 빈 서명

	rr := httptest.NewRecorder()

	handler := NewHandler(testSecret, nil)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("TC-10014: status = %d, want %d (empty signature)", rr.Code, http.StatusUnauthorized)
	}
}

// TC-10014: VerifyHMAC - 빈 서명 문자열 → false
func TestVerifyHMAC_EmptySignature_ReturnsFalse(t *testing.T) {
	body := []byte(`{"event":"test"}`)

	if VerifyHMAC(body, "", testSecret) {
		t.Error("TC-10014: VerifyHMAC should return false for empty signature")
	}
}

// ── TC-10015: 잘못된 HMAC 서명 → 401 Unauthorized ────────────────────────────

// TC-10015: HTTP 핸들러 - 잘못된 서명 → 401
func TestWebhookHandler_InvalidSignature_Returns401(t *testing.T) {
	body := []byte(`{"automation_id":"auto-123","trigger":"manual"}`)
	wrongSignature := "sha256=deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef"

	req := httptest.NewRequest(http.MethodPost, "/webhook", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Floqi-Signature", wrongSignature)

	rr := httptest.NewRecorder()

	// EXPECT: 잘못된 서명 → 401
	// ACTUAL: NewHandler 미구현 → 컴파일 에러
	handler := NewHandler(testSecret, nil)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("TC-10015: status = %d, want %d (invalid signature)", rr.Code, http.StatusUnauthorized)
	}
}

// TC-10015: VerifyHMAC - 잘못된 hex 서명 → false
func TestVerifyHMAC_WrongSignature_ReturnsFalse(t *testing.T) {
	body := []byte(`{"event":"test"}`)
	wrongSig := "sha256=0000000000000000000000000000000000000000000000000000000000000000"

	if VerifyHMAC(body, wrongSig, testSecret) {
		t.Error("TC-10015: VerifyHMAC returned true for wrong signature")
	}
}

// TC-10015: VerifyHMAC - 다른 secret으로 생성된 서명 → false
func TestVerifyHMAC_WrongSecret_ReturnsFalse(t *testing.T) {
	body := []byte(`{"event":"test"}`)
	wrongSecretSig := computeHMAC(body, "wrong-secret-key")

	// 다른 secret으로 만든 서명은 testSecret으로 검증 시 실패해야 함
	if VerifyHMAC(body, wrongSecretSig, testSecret) {
		t.Error("TC-10015: VerifyHMAC returned true for signature made with wrong secret")
	}
}

// TC-10015: VerifyHMAC - 바디 변조 시 서명 불일치 → false
func TestVerifyHMAC_TamperedBody_ReturnsFalse(t *testing.T) {
	originalBody := []byte(`{"automation_id":"auto-123"}`)
	signature := computeHMAC(originalBody, testSecret)

	tamperedBody := []byte(`{"automation_id":"auto-999"}`) // 변조된 바디

	if VerifyHMAC(tamperedBody, signature, testSecret) {
		t.Error("TC-10015: VerifyHMAC returned true for tampered request body")
	}
}

// ── TC-10016: Enqueue path — automation_id 파싱 및 큐 등록 ────────────────────

// mockQueue는 Enqueue 호출을 캡처하는 테스트용 QueueClient 구현체.
type mockQueue struct {
	calledWith []string
	errToReturn error
}

func (m *mockQueue) Enqueue(automationID string) error {
	m.calledWith = append(m.calledWith, automationID)
	return m.errToReturn
}

// TC-10016: 유효한 서명 + automation_id 포함 바디 → Enqueue 호출 및 200 OK
func TestWebhookHandler_ValidPayload_EnqueuesAutomation(t *testing.T) {
	body := []byte(`{"automation_id":"auto-123","trigger":"manual"}`)
	signature := computeHMAC(body, testSecret)

	req := httptest.NewRequest(http.MethodPost, "/webhook", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Floqi-Signature", signature)

	rr := httptest.NewRecorder()
	q := &mockQueue{}
	handler := NewHandler(testSecret, q)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("TC-10016: status = %d, want %d", rr.Code, http.StatusOK)
	}
	if len(q.calledWith) != 1 || q.calledWith[0] != "auto-123" {
		t.Errorf("TC-10016: Enqueue called with %v, want [auto-123]", q.calledWith)
	}
}

// TC-10016: 유효한 서명이지만 automation_id 누락 → 400 Bad Request, Enqueue 미호출
func TestWebhookHandler_MissingAutomationID_Returns400(t *testing.T) {
	body := []byte(`{"trigger":"manual"}`)
	signature := computeHMAC(body, testSecret)

	req := httptest.NewRequest(http.MethodPost, "/webhook", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Floqi-Signature", signature)

	rr := httptest.NewRecorder()
	q := &mockQueue{}
	handler := NewHandler(testSecret, q)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("TC-10016: status = %d, want %d (missing automation_id)", rr.Code, http.StatusBadRequest)
	}
	if len(q.calledWith) != 0 {
		t.Errorf("TC-10016: Enqueue should not be called when automation_id is missing")
	}
}

// TC-10016: Enqueue 실패 → 500 Internal Server Error
func TestWebhookHandler_EnqueueFailure_Returns500(t *testing.T) {
	body := []byte(`{"automation_id":"auto-456"}`)
	signature := computeHMAC(body, testSecret)

	req := httptest.NewRequest(http.MethodPost, "/webhook", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Floqi-Signature", signature)

	rr := httptest.NewRecorder()
	q := &mockQueue{errToReturn: errors.New("redis unavailable")}
	handler := NewHandler(testSecret, q)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Errorf("TC-10016: status = %d, want %d (enqueue failure)", rr.Code, http.StatusInternalServerError)
	}
}

// TC-10015: VerifyHMAC은 timing attack 방어를 위해 constant-time 비교를 사용해야 한다
// hmac.Equal을 사용하는지 간접적으로 검증 (비슷하지만 다른 서명도 false)
func TestVerifyHMAC_NearlyValidSignature_ReturnsFalse(t *testing.T) {
	body := []byte(`{"event":"timing_test"}`)
	validSig := computeHMAC(body, testSecret)

	// 서명의 마지막 문자를 변경하여 거의 유효한 서명 생성
	sigBytes := []byte(validSig)
	if len(sigBytes) > 0 {
		if sigBytes[len(sigBytes)-1] == 'a' {
			sigBytes[len(sigBytes)-1] = 'b'
		} else {
			sigBytes[len(sigBytes)-1] = 'a'
		}
	}
	nearlyValidSig := string(sigBytes)

	if VerifyHMAC(body, nearlyValidSig, testSecret) {
		t.Error("TC-10015: VerifyHMAC should return false for nearly-valid signature (1 char diff)")
	}
}

// ── TC-10019~10021: Webhook Trigger → Automation Executor 연동 ────────────────

// mockAutomationExecutor는 AutomationExecutor 인터페이스의 테스트 구현체.
// ACTUAL: AutomationExecutor 인터페이스 미정의 → 컴파일 에러
type mockAutomationExecutor struct {
	results     map[string]*WebhookExecutionResult
	errToReturn error
}

func (m *mockAutomationExecutor) Execute(ctx context.Context, automationID string) (*WebhookExecutionResult, error) {
	if m.errToReturn != nil {
		return nil, m.errToReturn
	}
	if result, ok := m.results[automationID]; ok {
		return result, nil
	}
	return nil, ErrAutomationNotFound
}

// TC-10019: 유효한 서명 + 유효한 automation_id → executor 호출 후 200 OK
func TestExecutorHandler_ValidPayload_ExecutesAutomation(t *testing.T) {
	body := []byte(`{"automation_id":"auto-weekly-123"}`)
	signature := computeHMAC(body, testSecret)

	req := httptest.NewRequest(http.MethodPost, "/webhook/execute", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Floqi-Signature", signature)

	rr := httptest.NewRecorder()

	// EXPECT: NewExecutorHandler가 정의되어 있고 executor를 호출 후 200 OK 반환
	// ACTUAL: NewExecutorHandler 미구현 → 컴파일 에러
	executor := &mockAutomationExecutor{
		results: map[string]*WebhookExecutionResult{
			"auto-weekly-123": {
				AutomationID: "auto-weekly-123",
				Output:       "주간 리뷰가 발송되었습니다.",
				Success:      true,
			},
		},
	}
	handler := NewExecutorHandler(testSecret, executor)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("TC-10019: status = %d, want %d", rr.Code, http.StatusOK)
	}
}

// TC-10020: 유효한 서명 + 유효한 automation_id → 실행 결과가 JSON 응답 바디에 포함
func TestExecutorHandler_ValidPayload_ReturnsExecutionResult(t *testing.T) {
	body := []byte(`{"automation_id":"auto-smart-save-456"}`)
	signature := computeHMAC(body, testSecret)

	req := httptest.NewRequest(http.MethodPost, "/webhook/execute", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Floqi-Signature", signature)

	rr := httptest.NewRecorder()

	// EXPECT: 실행 결과(output, success)가 JSON 응답에 포함
	// ACTUAL: NewExecutorHandler 미구현 → 컴파일 에러
	executor := &mockAutomationExecutor{
		results: map[string]*WebhookExecutionResult{
			"auto-smart-save-456": {
				AutomationID: "auto-smart-save-456",
				Output:       "AI 뉴스 3건이 Notion에 저장되었습니다.",
				Success:      true,
			},
		},
	}
	handler := NewExecutorHandler(testSecret, executor)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("TC-10020: status = %d, want %d", rr.Code, http.StatusOK)
	}

	// 응답 바디에 실행 결과 포함 확인
	responseBody := rr.Body.String()
	if responseBody == "" {
		t.Error("TC-10020: response body should contain execution result, got empty body")
	}
	// automation_id 또는 output이 응답에 포함되어야 함
	if !strings.Contains(responseBody, "auto-smart-save-456") && !strings.Contains(responseBody, "Notion") {
		t.Errorf("TC-10020: response body should contain execution result, got: %q", responseBody)
	}
}

// TC-10021: 유효한 서명 + 존재하지 않는 automation_id → 404 Not Found
func TestExecutorHandler_InvalidAutomationID_Returns404(t *testing.T) {
	body := []byte(`{"automation_id":"auto-nonexistent-999"}`)
	signature := computeHMAC(body, testSecret)

	req := httptest.NewRequest(http.MethodPost, "/webhook/execute", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Floqi-Signature", signature)

	rr := httptest.NewRecorder()

	// EXPECT: 존재하지 않는 automation_id → ErrAutomationNotFound → 404 반환
	// ACTUAL: NewExecutorHandler, ErrAutomationNotFound 미구현 → 컴파일 에러
	executor := &mockAutomationExecutor{
		results: map[string]*WebhookExecutionResult{}, // 빈 맵 — 어떤 automation도 없음
	}
	handler := NewExecutorHandler(testSecret, executor)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Errorf("TC-10021: status = %d, want %d (invalid automation_id)", rr.Code, http.StatusNotFound)
	}
}

// TC-10021: NewExecutorHandler도 잘못된 서명 → 401 Unauthorized 반환해야 함
func TestExecutorHandler_InvalidSignature_Returns401(t *testing.T) {
	body := []byte(`{"automation_id":"auto-123"}`)
	wrongSignature := "sha256=deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef"

	req := httptest.NewRequest(http.MethodPost, "/webhook/execute", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Floqi-Signature", wrongSignature)

	rr := httptest.NewRecorder()

	// EXPECT: 잘못된 서명 → 401 (executor 호출 없이)
	// ACTUAL: NewExecutorHandler 미구현 → 컴파일 에러
	executor := &mockAutomationExecutor{
		results: map[string]*WebhookExecutionResult{
			"auto-123": {AutomationID: "auto-123", Output: "done", Success: true},
		},
	}
	handler := NewExecutorHandler(testSecret, executor)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("TC-10021: status = %d, want %d (invalid signature)", rr.Code, http.StatusUnauthorized)
	}
}

