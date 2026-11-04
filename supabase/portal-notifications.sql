-- Unified in-app notifications (pairs with Web Push phone alerts).
-- Run once in the Supabase SQL Editor after push-subscriptions.sql.

CREATE TABLE IF NOT EXISTS public.portal_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'system'
    CHECK (category IN (
      'system',
      'teacher',
      'grades',
      'attendance',
      'announcement',
      'documents',
      'evaluation'
    )),
  title text NOT NULL,
  body text,
  href text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portal_notifications_profile_created_idx
  ON public.portal_notifications (profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS portal_notifications_unread_idx
  ON public.portal_notifications (profile_id)
  WHERE read_at IS NULL;

ALTER TABLE public.portal_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own portal notifications"
  ON public.portal_notifications;
CREATE POLICY "Users read own portal notifications"
  ON public.portal_notifications
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users update own portal notifications"
  ON public.portal_notifications;
CREATE POLICY "Users update own portal notifications"
  ON public.portal_notifications
  FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());
