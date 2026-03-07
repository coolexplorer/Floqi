-- ============================================================
-- Migration 003: automations 테이블 생성
-- 목적: 사용자 자동화 워크플로우 설정 저장
-- ============================================================

CREATE TABLE IF NOT EXISTS public.automations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  template_type TEXT NOT NULL CHECK (template_type IN ('morning_briefing', 'email_triage', 'reading_digest', 'weekly_review', 'smart_save')),
  config        JSONB DEFAULT '{}',
  schedule_cron TEXT NOT NULL,                              -- cron 표현식 (예: '0 8 * * *')
  timezone      TEXT DEFAULT 'UTC',
  status        TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  last_run_at   TIMESTAMPTZ,
  next_run_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 인덱스
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_automations_user_id
  ON public.automations(user_id);

CREATE INDEX IF NOT EXISTS idx_automations_status
  ON public.automations(status);

CREATE INDEX IF NOT EXISTS idx_automations_next_run
  ON public.automations(next_run_at) WHERE status = 'active';

-- ============================================================
-- RLS (Row Level Security) 설정
-- ============================================================

ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 자동화만 조회 가능
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'automations' AND policyname = 'Users can view own automations'
  ) THEN
    CREATE POLICY "Users can view own automations"
      ON public.automations FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 사용자는 자신의 자동화만 생성 가능
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'automations' AND policyname = 'Users can insert own automations'
  ) THEN
    CREATE POLICY "Users can insert own automations"
      ON public.automations FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 사용자는 자신의 자동화만 수정 가능
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'automations' AND policyname = 'Users can update own automations'
  ) THEN
    CREATE POLICY "Users can update own automations"
      ON public.automations FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 사용자는 자신의 자동화만 삭제 가능
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'automations' AND policyname = 'Users can delete own automations'
  ) THEN
    CREATE POLICY "Users can delete own automations"
      ON public.automations FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 트리거: updated_at 자동 갱신
-- ============================================================

DROP TRIGGER IF EXISTS update_automations_updated_at ON public.automations;
CREATE TRIGGER update_automations_updated_at
  BEFORE UPDATE ON public.automations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
