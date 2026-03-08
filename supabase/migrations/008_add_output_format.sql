-- ============================================================
-- Migration 008: automations 테이블에 output_format 컬럼 추가
-- 목적: 자동화 실행 결과의 출력 형식 설정 (email, notion, both)
-- ============================================================

ALTER TABLE public.automations ADD COLUMN IF NOT EXISTS output_format TEXT DEFAULT 'email';
