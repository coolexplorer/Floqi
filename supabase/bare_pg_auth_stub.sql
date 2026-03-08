-- ============================================================
-- Auth schema stub for bare PostgreSQL (Docker Compose용)
-- Supabase CLI 사용 시에는 불필요 (GoTrue가 auth 스키마 관리)
-- Docker Compose의 postgres 컨테이너 사용 시만 적용
-- ============================================================

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email               TEXT UNIQUE,
  raw_user_meta_data  JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- auth 스키마 권한 부여
GRANT USAGE ON SCHEMA auth TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres;

-- auth.uid() 스텁 함수
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

-- 테스트 사용자
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'dev@floqi.local',
  '{"full_name": "Dev User"}'
) ON CONFLICT (id) DO NOTHING;
