-- ============================================================
-- Migration 000: Local development stubs for Supabase auth schema
-- 목적: 로컬 PostgreSQL에서 Supabase auth 스키마 시뮬레이션
-- 주의: 이 파일은 로컬 개발용으로만 사용. 프로덕션 Supabase에는 적용 불필요.
-- ============================================================

-- auth 스키마 생성 (Supabase GoTrue가 관리하는 스키마 시뮬레이션)
CREATE SCHEMA IF NOT EXISTS auth;

-- auth.users 테이블 스텁 (Supabase GoTrue의 users 테이블 최소 구현)
CREATE TABLE IF NOT EXISTS auth.users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email               TEXT UNIQUE,
  raw_user_meta_data  JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- service_role 역할 생성 (Worker가 RLS 우회 시 사용)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role BYPASSRLS;
  END IF;
END $$;

-- postgres 유저에게 service_role 권한 부여 (Worker 로컬 연결 시 RLS 우회)
GRANT service_role TO postgres;

-- auth 스키마 권한 부여
GRANT USAGE ON SCHEMA auth TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres;

-- auth.uid() 스텁 함수 (Supabase JWT에서 사용자 UUID를 반환하는 함수 시뮬레이션)
-- 로컬 개발에서는 세션 변수 'request.jwt.claim.sub'를 사용하거나 NULL 반환
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.sub', true)::UUID,
    NULL::UUID
  );
$$ LANGUAGE sql STABLE;

-- auth.role() 스텁 함수
CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.role', true),
    'anon'
  );
$$ LANGUAGE sql STABLE;

-- auth.email() 스텁 함수
CREATE OR REPLACE FUNCTION auth.email() RETURNS TEXT AS $$
  SELECT current_setting('request.jwt.claim.email', true);
$$ LANGUAGE sql STABLE;

-- ============================================================
-- 로컬 개발 편의를 위해 테스트 사용자 생성 (선택적)
-- Worker 테스트 시 이 UUID를 사용자 ID로 활용 가능
-- ============================================================
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'dev@floqi.local',
  '{"full_name": "Dev User"}'
) ON CONFLICT (id) DO NOTHING;
