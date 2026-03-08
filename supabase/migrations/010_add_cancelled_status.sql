-- ============================================================
-- Migration 010: Add 'cancelled' status to execution_logs
-- 목적: 실행 취소 기능 지원
-- ============================================================

ALTER TABLE public.execution_logs DROP CONSTRAINT IF EXISTS execution_logs_status_check;
ALTER TABLE public.execution_logs ADD CONSTRAINT execution_logs_status_check
  CHECK (status IN ('running', 'success', 'error', 'cancelled'));
