-- ============================================================
-- Migration 005: user_preferences 테이블 생성
-- 목적: AI가 학습한 사용자 선호도 및 개인화 데이터 저장
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category      TEXT NOT NULL,                          -- 선호도 분류 (e.g., 'email', 'schedule', 'content')
  key           TEXT NOT NULL,                          -- 선호도 키 (e.g., 'briefing_time', 'language')
  value         JSONB NOT NULL,                         -- 선호도 값 (임의 JSON)
  learned_from  TEXT,                                   -- 학습 출처 (e.g., 'user_feedback', 'usage_pattern')
  confidence    NUMERIC(3,2) DEFAULT 1.0,               -- 신뢰도 (0.00 ~ 1.00)
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category, key)                        -- 사용자당 동일 카테고리/키 중복 불가
);

-- ============================================================
-- 인덱스
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id
  ON public.user_preferences(user_id);

-- ============================================================
-- RLS (Row Level Security) 설정
-- ============================================================

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 선호도만 조회/생성/수정/삭제 가능
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_preferences' AND policyname = 'users_own_preferences'
  ) THEN
    CREATE POLICY "users_own_preferences"
      ON public.user_preferences
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 트리거: updated_at 자동 갱신
-- ============================================================

DROP TRIGGER IF EXISTS user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
