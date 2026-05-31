
CREATE TABLE public.attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL,
  set text,
  total int NOT NULL,
  correct int NOT NULL,
  pct numeric NOT NULL,
  passed boolean NOT NULL,
  domains jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX attempts_user_created_idx ON public.attempts(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attempts TO authenticated;
GRANT ALL ON public.attempts TO service_role;

ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attempts_select_own" ON public.attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "attempts_insert_own" ON public.attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "attempts_delete_own" ON public.attempts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.mastery (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  mastered_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mastery TO authenticated;
GRANT ALL ON public.mastery TO service_role;

ALTER TABLE public.mastery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mastery_select_own" ON public.mastery FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "mastery_insert_own" ON public.mastery FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mastery_delete_own" ON public.mastery FOR DELETE TO authenticated USING (auth.uid() = user_id);
