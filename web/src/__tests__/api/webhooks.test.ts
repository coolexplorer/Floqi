/**
 * Webhook Trigger API Route Tests — TC-5022~5024
 * TDD Red Phase: Route does NOT exist yet → import will fail (compilation error)
 *
 * US-506: Webhook 트리거 — Next.js API Route로 webhook 수신,
 *         HMAC 서명 검증 후 Redis를 통해 Go Worker에 전달
 *
 * Tests validate:
 * - TC-5022: 유효한 Webhook POST 요청 → Redis 큐에 enqueue, 202 응답
 * - TC-5023: 존재하지 않는 automation_id → 404 응답
 * - TC-5024: HMAC 서명 검증 실패 → 401 응답, 태스크 미생성
 *
 * FAILURE expected (Red phase):
 *   - @/app/api/webhooks/[id]/route 파일이 없음 → 모듈 임포트 실패
 *   - POST 함수가 정의되어 있지 않음 → 런타임 오류
 *
 * Implementation requirements for Green phase:
 *   - Route: web/src/app/api/webhooks/[id]/route.ts
 *   - HMAC validation: x-floqi-signature header (HMAC-SHA256 with WEBHOOK_SECRET)
 *   - Automation lookup: Supabase automations table (no user auth required for webhooks)
 *   - Redis enqueue: enqueueAutomation(automationId) from @/lib/redis
 *   - Response: 202 Accepted on success
 */

import { NextRequest } from "next/server";

// EXPECT: POST exported from webhook route
// ACTUAL: Route file does not exist → import fails (Red phase)
import { POST } from "@/app/api/webhooks/[id]/route";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Use vi.hoisted() to avoid hoisting issues with vi.mock factory references
const { mockSingle, mockEq, mockSelect, mockFrom, mockEnqueueAutomation } =
  vi.hoisted(() => {
    const mockSingle = vi.fn();
    const mockEq = vi.fn(() => ({ single: mockSingle }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));
    const mockFrom = vi.fn(() => ({ select: mockSelect }));
    const mockEnqueueAutomation = vi.fn();
    return { mockSingle, mockEq, mockSelect, mockFrom, mockEnqueueAutomation };
  });

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: mockFrom,
    })
  ),
}));

vi.mock("@/lib/redis", () => ({
  enqueueAutomation: mockEnqueueAutomation,
}));

// ─── HMAC Signature Helper ─────────────────────────────────────────────────────

const WEBHOOK_SECRET = "test-webhook-secret-32-chars-abcd";

/**
 * Generates a valid HMAC-SHA256 signature for the given payload.
 * Mimics how the webhook sender should sign the request.
 */
async function generateHmacSignature(
  payload: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return "sha256=" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const AUTOMATION_ID = "auto-webhook-001";
const BASE_URL = "http://localhost/api/webhooks";

const validAutomation = {
  id: AUTOMATION_ID,
  status: "active",
  template_type: "smart_save",
};

const validPayload = JSON.stringify({
  event: "new_email",
  data: {
    subject: "AI Partnership Proposal",
    from: "partner@startup.io",
  },
});

// ─── TC-5022: 유효한 Webhook → 202 + Redis enqueue ────────────────────────────

describe("TC-5022: Valid Webhook POST → 202 + Redis enqueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WEBHOOK_SECRET = WEBHOOK_SECRET;

    // Automation exists in Supabase
    mockSingle.mockResolvedValue({
      data: validAutomation,
      error: null,
    });

    // Redis enqueue succeeds
    mockEnqueueAutomation.mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env.WEBHOOK_SECRET;
  });

  it("TC-5022: valid signature + existing automation → 202 Accepted", async () => {
    const signature = await generateHmacSignature(validPayload, WEBHOOK_SECRET);

    const request = new NextRequest(`${BASE_URL}/${AUTOMATION_ID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-floqi-signature": signature,
      },
      body: validPayload,
    });

    // EXPECT: POST returns 202
    // ACTUAL: Route does not exist → test fails (Red phase)
    const response = await POST(request, {
      params: Promise.resolve({ id: AUTOMATION_ID }),
    });

    expect(response.status).toBe(202);
  });

  it("TC-5022: valid request → enqueueAutomation called with correct id", async () => {
    const signature = await generateHmacSignature(validPayload, WEBHOOK_SECRET);

    const request = new NextRequest(`${BASE_URL}/${AUTOMATION_ID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-floqi-signature": signature,
      },
      body: validPayload,
    });

    await POST(request, { params: Promise.resolve({ id: AUTOMATION_ID }) });

    // EXPECT: Redis queue receives the automation_id
    expect(mockEnqueueAutomation).toHaveBeenCalledWith(AUTOMATION_ID);
  });

  it("TC-5022: 202 response body contains queued status", async () => {
    const signature = await generateHmacSignature(validPayload, WEBHOOK_SECRET);

    const request = new NextRequest(`${BASE_URL}/${AUTOMATION_ID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-floqi-signature": signature,
      },
      body: validPayload,
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: AUTOMATION_ID }),
    });

    const body = await response.json();
    expect(body).toMatchObject({
      status: expect.stringMatching(/queued|accepted/i),
    });
  });

  it("TC-5022: Supabase queried with correct automation_id (no user auth)", async () => {
    const signature = await generateHmacSignature(validPayload, WEBHOOK_SECRET);

    const request = new NextRequest(`${BASE_URL}/${AUTOMATION_ID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-floqi-signature": signature,
      },
      body: validPayload,
    });

    await POST(request, { params: Promise.resolve({ id: AUTOMATION_ID }) });

    // Webhook route queries automations without user auth (uses service role)
    expect(mockFrom).toHaveBeenCalledWith("automations");
    expect(mockEq).toHaveBeenCalledWith("id", AUTOMATION_ID);
  });
});

// ─── TC-5023: 존재하지 않는 automation_id → 404 ───────────────────────────────

describe("TC-5023: Non-existent automation_id → 404", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WEBHOOK_SECRET = WEBHOOK_SECRET;
  });

  afterEach(() => {
    delete process.env.WEBHOOK_SECRET;
  });

  it("TC-5023: automation not found in Supabase → 404 Not Found", async () => {
    const nonExistentId = "auto-does-not-exist";

    // Automation does NOT exist
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "Row not found" },
    });

    const signature = await generateHmacSignature(validPayload, WEBHOOK_SECRET);

    const request = new NextRequest(`${BASE_URL}/${nonExistentId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-floqi-signature": signature,
      },
      body: validPayload,
    });

    // EXPECT: 404
    // ACTUAL: Route does not exist → test fails (Red phase)
    const response = await POST(request, {
      params: Promise.resolve({ id: nonExistentId }),
    });

    expect(response.status).toBe(404);
  });

  it("TC-5023: 404 → enqueueAutomation NOT called", async () => {
    const nonExistentId = "auto-does-not-exist";

    mockSingle.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "Row not found" },
    });

    const signature = await generateHmacSignature(validPayload, WEBHOOK_SECRET);

    const request = new NextRequest(`${BASE_URL}/${nonExistentId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-floqi-signature": signature,
      },
      body: validPayload,
    });

    await POST(request, { params: Promise.resolve({ id: nonExistentId }) });

    // Critical: Redis enqueue must NOT be called when automation doesn't exist
    expect(mockEnqueueAutomation).not.toHaveBeenCalled();
  });

  it("TC-5023: 404 response body explains automation not found", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "not found" } });

    const signature = await generateHmacSignature(validPayload, WEBHOOK_SECRET);

    const request = new NextRequest(`${BASE_URL}/nonexistent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-floqi-signature": signature,
      },
      body: validPayload,
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: "nonexistent" }),
    });

    const body = await response.json();
    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
  });
});

// ─── TC-5024: HMAC 서명 검증 실패 → 401 ─────────────────────────────────────

describe("TC-5024: Invalid HMAC signature → 401 Unauthorized", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WEBHOOK_SECRET = WEBHOOK_SECRET;

    // Automation exists (to isolate signature failure)
    mockSingle.mockResolvedValue({
      data: validAutomation,
      error: null,
    });
  });

  afterEach(() => {
    delete process.env.WEBHOOK_SECRET;
  });

  it("TC-5024: missing x-floqi-signature header → 401", async () => {
    const request = new NextRequest(`${BASE_URL}/${AUTOMATION_ID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // No x-floqi-signature header
      },
      body: validPayload,
    });

    // EXPECT: 401 Unauthorized
    // ACTUAL: Route does not exist → test fails (Red phase)
    const response = await POST(request, {
      params: Promise.resolve({ id: AUTOMATION_ID }),
    });

    expect(response.status).toBe(401);
  });

  it("TC-5024: wrong signature value → 401", async () => {
    const request = new NextRequest(`${BASE_URL}/${AUTOMATION_ID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-floqi-signature": "sha256=deadbeefdeadbeefdeadbeef",
      },
      body: validPayload,
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: AUTOMATION_ID }),
    });

    expect(response.status).toBe(401);
  });

  it("TC-5024: tampered payload (valid signature for different body) → 401", async () => {
    // Sign a different payload
    const differentPayload = JSON.stringify({ event: "different_event" });
    const signatureForDifferentPayload = await generateHmacSignature(
      differentPayload,
      WEBHOOK_SECRET
    );

    const request = new NextRequest(`${BASE_URL}/${AUTOMATION_ID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Signature was for a different payload
        "x-floqi-signature": signatureForDifferentPayload,
      },
      body: validPayload, // tampered body
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: AUTOMATION_ID }),
    });

    expect(response.status).toBe(401);
  });

  it("TC-5024: invalid signature → enqueueAutomation NOT called", async () => {
    const request = new NextRequest(`${BASE_URL}/${AUTOMATION_ID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-floqi-signature": "sha256=invalid",
      },
      body: validPayload,
    });

    await POST(request, { params: Promise.resolve({ id: AUTOMATION_ID }) });

    // Critical: No task enqueued when signature is invalid
    expect(mockEnqueueAutomation).not.toHaveBeenCalled();
  });

  it("TC-5024: invalid signature → Supabase NOT queried (signature checked first)", async () => {
    const request = new NextRequest(`${BASE_URL}/${AUTOMATION_ID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-floqi-signature": "sha256=invalid",
      },
      body: validPayload,
    });

    await POST(request, { params: Promise.resolve({ id: AUTOMATION_ID }) });

    // Signature should be validated BEFORE Supabase lookup (security first)
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

// ─── TC-5025: 비활성 Automation → 400 ─────────────────────────────────────────

describe("TC-5025: Inactive automation → 400 Bad Request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WEBHOOK_SECRET = WEBHOOK_SECRET;
  });

  afterEach(() => {
    delete process.env.WEBHOOK_SECRET;
  });

  it("TC-5025: paused automation → 400 Bad Request", async () => {
    mockSingle.mockResolvedValue({
      data: { id: AUTOMATION_ID, status: "paused" },
      error: null,
    });

    const signature = await generateHmacSignature(validPayload, WEBHOOK_SECRET);

    const request = new NextRequest(`${BASE_URL}/${AUTOMATION_ID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-floqi-signature": signature,
      },
      body: validPayload,
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: AUTOMATION_ID }),
    });

    expect(response.status).toBe(400);
  });

  it("TC-5025: inactive automation → enqueueAutomation NOT called", async () => {
    mockSingle.mockResolvedValue({
      data: { id: AUTOMATION_ID, status: "paused" },
      error: null,
    });

    const signature = await generateHmacSignature(validPayload, WEBHOOK_SECRET);

    const request = new NextRequest(`${BASE_URL}/${AUTOMATION_ID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-floqi-signature": signature,
      },
      body: validPayload,
    });

    await POST(request, { params: Promise.resolve({ id: AUTOMATION_ID }) });

    expect(mockEnqueueAutomation).not.toHaveBeenCalled();
  });

  it("TC-5025: 400 response body explains automation is not active", async () => {
    mockSingle.mockResolvedValue({
      data: { id: AUTOMATION_ID, status: "paused" },
      error: null,
    });

    const signature = await generateHmacSignature(validPayload, WEBHOOK_SECRET);

    const request = new NextRequest(`${BASE_URL}/${AUTOMATION_ID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-floqi-signature": signature,
      },
      body: validPayload,
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: AUTOMATION_ID }),
    });

    const body = await response.json();
    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
  });
});
