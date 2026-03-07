-- ============================================================
-- Migration 004: execution_logs 테이블 생성
-- 목적: 자동화 실행 이력 및 도구 호출 결과 저장
-- ============================================================

CREATE TABLE IF NOT EXISTS public.execution_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id  UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  status         TEXT NOT NULL CHECK (status IN ('running', 'success', 'error')),
  started_at     TIMESTAMPTZ DEFAULT NOW(),
  completed_at   TIMESTAMPTZ,
  tool_calls     JSONB DEFAULT '[]',                        -- [{tool_name, input, output, duration, status}]
  error_message  TEXT,
  tokens_used    INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 인덱스
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_execution_logs_automation_id
  ON public.execution_logs(automation_id);

CREATE INDEX IF NOT EXISTS idx_execution_logs_status
  ON public.execution_logs(status);

CREATE INDEX IF NOT EXISTS idx_execution_logs_started_at
  ON public.execution_logs(started_at DESC);

-- ============================================================
-- RLS (Row Level Security) 설정
-- 사용자는 자신의 자동화에 속한 실행 로그만 조회 가능
-- Worker는 service_role 키로 RLS 우회하여 로그 기록
-- ============================================================

ALTER TABLE public.execution_logs ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 자동화에 속한 실행 로그만 조회 가능
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'execution_logs' AND policyname = 'Users can view own execution logs'
  ) THEN
    CREATE POLICY "Users can view own execution logs"
      ON public.execution_logs FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.automations
          WHERE automations.id = execution_logs.automation_id
          AND automations.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- service_role은 실행 로그 INSERT 가능 (Worker가 로그 기록)
-- 참고: service_role은 BYPASSRLS를 가지므로 이 정책이 없어도 삽입 가능하나
--       명시적으로 정의하여 의도를 문서화
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'execution_logs' AND policyname = 'Service role can insert execution logs'
  ) THEN
    CREATE POLICY "Service role can insert execution logs"
      ON public.execution_logs FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- service_role은 실행 로그 UPDATE 가능 (실행 완료 시 status, completed_at 업데이트)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'execution_logs' AND policyname = 'Service role can update execution logs'
  ) THEN
    CREATE POLICY "Service role can update execution logs"
      ON public.execution_logs FOR UPDATE
      TO service_role
      USING (true);
  END IF;
END $$;
