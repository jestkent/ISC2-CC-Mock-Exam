-- Add correct count tracking to mastery
ALTER TABLE public.mastery
  ADD COLUMN IF NOT EXISTS correct_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_correct_at timestamptz NOT NULL DEFAULT now();

-- Per-user settings
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hide_mastered boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_settings_select_own" ON public.user_settings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_settings_insert_own" ON public.user_settings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_settings_update_own" ON public.user_settings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_settings_delete_own" ON public.user_settings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);