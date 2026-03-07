-- ============================================================
-- Migration 007: profiles 테이블에 plan 및 stripe_customer_id 컬럼 추가
-- 목적: 사용자 요금제(free/pro) 및 Stripe 고객 ID 저장
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
