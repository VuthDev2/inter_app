CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TABLE IF NOT EXISTS public.recording_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recording_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  transcript TEXT,
  source_audio BOOLEAN NOT NULL DEFAULT true,
  template_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'saved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recording_sessions TO authenticated;
GRANT ALL ON public.recording_sessions TO service_role;

ALTER TABLE public.recording_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recording sessions"
  ON public.recording_sessions FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own recording sessions"
  ON public.recording_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own recording sessions"
  ON public.recording_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own recording sessions"
  ON public.recording_sessions FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

CREATE INDEX recording_sessions_owner_created_idx
  ON public.recording_sessions(owner_id, created_at DESC);

CREATE INDEX recording_sessions_owner_type_idx
  ON public.recording_sessions(owner_id, recording_type);

CREATE TRIGGER recording_sessions_set_updated_at
  BEFORE UPDATE ON public.recording_sessions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
