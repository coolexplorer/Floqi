-- ============================================================
-- Migration 000: Local development init
-- 목적: 로컬 개발 환경 공통 설정
--
-- Supabase CLI (supabase start) 사용 시:
--   auth 스키마는 GoTrue가 자동 관리하므로 스텁 불필요.
--   이 마이그레이션은 service_role 등 공통 설정만 수행.
--
-- Docker Compose (bare PostgreSQL) 사용 시:
--   auth 스키마 스텁이 필요하면 000_bare_pg_auth_stub.sql을 별도로 실행.
-- ============================================================

-- service_role 역할 생성 (Worker가 RLS 우회 시 사용)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role BYPASSRLS;
  END IF;
END $$;

-- postgres 유저에게 service_role 권한 부여
DO $$ BEGIN
  IF NOT pg_has_role('postgres', 'service_role', 'MEMBER') THEN
    GRANT service_role TO postgres;
  END IF;
END $$;
