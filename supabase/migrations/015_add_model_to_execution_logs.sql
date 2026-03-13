-- ============================================================
-- Migration 015: execution_logs에 model 컬럼 추가
-- 목적: 실행 시 사용된 LLM 모델 추적
-- ============================================================

ALTER TABLE execution_logs ADD COLUMN IF NOT EXISTS model TEXT;
