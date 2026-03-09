import { z } from 'zod';

const TEMPLATE_TYPES = ['morning_briefing', 'email_triage', 'reading_digest', 'weekly_review', 'smart_save'] as const;
const AUTOMATION_STATUSES = ['active', 'paused'] as const;

export const createAutomationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500).optional(),
  template_type: z.enum(TEMPLATE_TYPES),
  config: z.record(z.string(), z.unknown()).optional().default({}),
  schedule_cron: z.string().min(1, 'Cron expression is required'),
  timezone: z.string().optional().default('UTC'),
  status: z.enum(AUTOMATION_STATUSES).optional().default('paused'),
});

export const updateAutomationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  status: z.enum(AUTOMATION_STATUSES).optional(),
  schedule_cron: z.string().min(1).optional(),
  agent_prompt: z.string().max(2000).optional(),
}).refine(data => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

export const byokSchema = z.object({
  apiKey: z.string().min(1).startsWith('sk-ant-', 'Invalid API key format'),
});
