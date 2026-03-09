-- ============================================================
-- Migration 011: automations UPDATE RLS - WITH CHECK 추가
-- 목적: 사용자가 자신의 automation의 user_id를 타인 ID로 변경하는 것을 방지
-- ============================================================

-- 기존 UPDATE 정책 삭제 후 WITH CHECK 포함하여 재생성
DROP POLICY IF EXISTS "Users can update own automations" ON public.automations;

CREATE POLICY "Users can update own automations"
  ON public.automations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
