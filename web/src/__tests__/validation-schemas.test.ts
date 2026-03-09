/**
 * Unit Tests — Validation Schemas
 *
 * Tests validate:
 * - createAutomationSchema: valid input, field validations, defaults
 * - updateAutomationSchema: empty object, partial update, field limits
 * - byokSchema: valid key, empty string, prefix validation
 */

import {
  createAutomationSchema,
  updateAutomationSchema,
  byokSchema,
} from '@/lib/validation/schemas';

// ─── createAutomationSchema ───────────────────────────────────────────────────

describe('createAutomationSchema', () => {
  const validInput = {
    name: 'My Morning Briefing',
    template_type: 'morning_briefing' as const,
    schedule_cron: '0 8 * * *',
  };

  // 1. Valid complete input → success
  it('valid complete input → success', () => {
    const result = createAutomationSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  // 2. Missing name → failure with "Name is required"
  it('missing name → failure with "Name is required"', () => {
    const input = { ...validInput, name: '' };
    const result = createAutomationSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain('Name is required');
    }
  });

  // 3. Name > 100 chars → failure "Name too long"
  it('name longer than 100 chars → failure "Name too long"', () => {
    const input = { ...validInput, name: 'a'.repeat(101) };
    const result = createAutomationSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain('Name too long');
    }
  });

  // 4. Invalid template_type → failure
  it('invalid template_type → failure', () => {
    const input = { ...validInput, template_type: 'invalid_type' };
    const result = createAutomationSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  // 5. Missing schedule_cron → failure
  it('missing schedule_cron → failure', () => {
    const { schedule_cron: _, ...inputWithoutCron } = validInput;
    const result = createAutomationSchema.safeParse(inputWithoutCron);
    expect(result.success).toBe(false);
  });

  // 6. Optional fields default correctly
  it('optional fields default to config={}, timezone="UTC", status="paused"', () => {
    const result = createAutomationSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.config).toEqual({});
      expect(result.data.timezone).toBe('UTC');
      expect(result.data.status).toBe('paused');
    }
  });
});

// ─── updateAutomationSchema ───────────────────────────────────────────────────

describe('updateAutomationSchema', () => {
  // 7. Empty object {} → failure "At least one field must be provided"
  it('empty object {} → failure "At least one field must be provided"', () => {
    const result = updateAutomationSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain('At least one field must be provided');
    }
  });

  // 8. Valid partial update { status: 'active' } → success
  it('valid partial update { status: "active" } → success', () => {
    const result = updateAutomationSchema.safeParse({ status: 'active' });
    expect(result.success).toBe(true);
  });

  // 9. Invalid status value → failure
  it('invalid status value → failure', () => {
    const result = updateAutomationSchema.safeParse({ status: 'running' });
    expect(result.success).toBe(false);
  });

  // 10. agent_prompt > 2000 chars → failure
  it('agent_prompt longer than 2000 chars → failure', () => {
    const result = updateAutomationSchema.safeParse({
      agent_prompt: 'a'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});

// ─── byokSchema ───────────────────────────────────────────────────────────────

describe('byokSchema', () => {
  // 11. Valid key "sk-ant-api03-abc123" → success
  it('valid key "sk-ant-api03-abc123" → success', () => {
    const result = byokSchema.safeParse({ apiKey: 'sk-ant-api03-abc123' });
    expect(result.success).toBe(true);
  });

  // 12. Empty string → failure
  it('empty apiKey string → failure', () => {
    const result = byokSchema.safeParse({ apiKey: '' });
    expect(result.success).toBe(false);
  });

  // 13. Key without "sk-ant-" prefix → failure "Invalid API key format"
  it('key without "sk-ant-" prefix → failure "Invalid API key format"', () => {
    const result = byokSchema.safeParse({ apiKey: 'openai-key-abc123' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain('Invalid API key format');
    }
  });

  // 14. Prefix only "sk-ant-" → success (min(1) passes since prefix itself has length > 0)
  it('prefix only "sk-ant-" → success (min(1) passes)', () => {
    const result = byokSchema.safeParse({ apiKey: 'sk-ant-' });
    expect(result.success).toBe(true);
  });
});
