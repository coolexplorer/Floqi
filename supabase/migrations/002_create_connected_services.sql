-- ============================================================
-- Migration 002: connected_services 테이블 생성
-- 목적: OAuth 토큰 (암호화) 및 서비스 연결 상태 관리
-- ============================================================

CREATE TABLE IF NOT EXISTS public.connected_services (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider                TEXT NOT NULL,                -- 'google' | 'notion'
  access_token_encrypted  TEXT NOT NULL,                -- AES-256-GCM 암호화된 access token
  refresh_token_encrypted TEXT,                         -- AES-256-GCM 암호화된 refresh token
  token_expires_at        TIMESTAMPTZ,                  -- access token 만료 시각
  scopes                  TEXT[],                       -- 부여된 OAuth scope 목록
  metadata                JSONB DEFAULT '{}',           -- 추가 메타데이터 (provider별 user info 등)
  is_active               BOOLEAN DEFAULT TRUE,         -- 연결 활성화 여부
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)                             -- 사용자당 동일 provider 중복 불가
);

-- ============================================================
-- 인덱스
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_connected_services_user_provider
  ON public.connected_services(user_id, provider);

-- ============================================================
-- RLS (Row Level Security) 설정
-- ============================================================

ALTER TABLE public.connected_services ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 연결만 조회/생성/수정/삭제 가능
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'connected_services' AND policyname = 'users_own_services'
  ) THEN
    CREATE POLICY "users_own_services"
      ON public.connected_services
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 트리거: updated_at 자동 갱신
-- ============================================================

DROP TRIGGER IF EXISTS connected_services_updated_at ON public.connected_services;
CREATE TRIGGER connected_services_updated_at
  BEFORE UPDATE ON public.connected_services
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
