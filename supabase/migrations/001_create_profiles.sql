-- ============================================================
-- Migration 001: profiles 테이블 생성
-- 목적: Supabase Auth 사용자 확장 정보 저장
-- ============================================================

-- profiles 테이블 생성 (IF NOT EXISTS로 멱등성 보장)
CREATE TABLE IF NOT EXISTS public.profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name          TEXT,
  email                 TEXT NOT NULL,
  timezone              TEXT DEFAULT 'UTC',
  preferred_language    TEXT DEFAULT 'en',
  llm_provider          TEXT DEFAULT 'managed',        -- 'managed' | 'byok'
  llm_api_key_encrypted TEXT,                          -- BYOK 시 AES-256-GCM 암호화된 API 키
  llm_model             TEXT DEFAULT 'claude-sonnet-4-6',
  onboarding_completed  BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS (Row Level Security) 설정
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 프로필만 조회/수정 가능
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'users_own_data'
  ) THEN
    CREATE POLICY "users_own_data"
      ON public.profiles
      FOR ALL
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- ============================================================
-- 트리거: updated_at 자동 갱신
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 트리거: auth.users INSERT 시 profiles 자동 생성
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
