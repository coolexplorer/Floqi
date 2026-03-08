-- ============================================================
-- Migration 009: automations 테이블에 agent_prompt 컬럼 추가
-- 목적: AI 에이전트에게 전달할 프롬프트 저장
-- ============================================================

ALTER TABLE public.automations ADD COLUMN IF NOT EXISTS agent_prompt TEXT;
