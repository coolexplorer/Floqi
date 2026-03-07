-- ============================================================
-- Migration 006: usage_tracking 테이블 생성
-- 목적: 사용자별 월간 실행 횟수 및 LLM 토큰/비용 추적
-- ============================================================

CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_start     DATE NOT NULL,
  executions_count INTEGER DEFAULT 0,
  llm_tokens_total INTEGER DEFAULT 0,
  llm_cost_total   NUMERIC(10,4) DEFAULT 0,
  UNIQUE(user_id, period_start)
);

-- ============================================================
-- 인덱스
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id
  ON public.usage_tracking(user_id);

-- ============================================================
-- RLS (Row Level Security) 설정
-- ============================================================

ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 사용량 데이터만 조회 가능
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'usage_tracking' AND policyname = 'users_own_usage'
  ) THEN
    CREATE POLICY "users_own_usage"
      ON public.usage_tracking
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Worker (service_role)는 모든 사용량 데이터에 접근 가능
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'usage_tracking' AND policyname = 'service_role_usage'
  ) THEN
    CREATE POLICY "service_role_usage"
      ON public.usage_tracking
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
