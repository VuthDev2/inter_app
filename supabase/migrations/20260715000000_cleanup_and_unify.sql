-- =============================================================================
-- Cleanup: drop old `sessions` (QR rooms — feature removed) and recreate as
-- a unified `live_sessions` table. Keep `recording_sessions` as `recordings`.
-- =============================================================================

-- ── 1. Drop old live-sessions table (QR codes deleted) ───────────────────────
DROP TABLE IF EXISTS public.session_participants CASCADE;
DROP TABLE IF EXISTS public.transcripts            CASCADE;
DROP TABLE IF EXISTS public.sessions               CASCADE;

-- ── 2. Rename recording_sessions → recordings ────────────────────────────────
ALTER TABLE public.recording_sessions RENAME TO recordings;
ALTER TABLE public.recordings RENAME CONSTRAINT recording_sessions_pkey TO recordings_pkey;
ALTER INDEX public.recording_sessions_owner_created_idx RENAME TO recordings_owner_created_idx;
ALTER INDEX public.recording_sessions_owner_type_idx   RENAME TO recordings_owner_type_idx;

-- Add language pair columns (needed if a recording is later used for live)
ALTER TABLE public.recordings
  ADD COLUMN source_lang TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN target_lang TEXT NOT NULL DEFAULT 'ja';

-- ── 3. Live sessions ─────────────────────────────────────────────────────────
CREATE TABLE public.live_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_lang TEXT NOT NULL DEFAULT 'en',
  target_lang TEXT NOT NULL DEFAULT 'ja',
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  mode        TEXT NOT NULL DEFAULT 'one-way' CHECK (mode IN ('one-way', 'two-way')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at    TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_sessions TO authenticated;
GRANT ALL    ON public.live_sessions TO service_role;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own live sessions"
  ON public.live_sessions FOR SELECT TO authenticated
  USING (auth.uid() = host_id);
CREATE POLICY "Users can create live sessions"
  ON public.live_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Host can update own live sessions"
  ON public.live_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = host_id);
CREATE POLICY "Host can delete own live sessions"
  ON public.live_sessions FOR DELETE TO authenticated
  USING (auth.uid() = host_id);

CREATE INDEX live_sessions_host_created_idx ON public.live_sessions(host_id, created_at DESC);

-- ── 4. Transcripts (belong to a live session) ────────────────────────────────
CREATE TABLE public.transcripts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  speaker_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_lang     TEXT NOT NULL,
  target_lang     TEXT NOT NULL,
  original_text   TEXT NOT NULL,
  translated_text TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transcripts TO authenticated;
GRANT ALL    ON public.transcripts TO service_role;
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transcripts"
  ON public.transcripts FOR SELECT TO authenticated
  USING (auth.uid() = speaker_id);
CREATE POLICY "Users can insert own transcripts"
  ON public.transcripts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = speaker_id);
CREATE POLICY "Users can update own transcripts"
  ON public.transcripts FOR UPDATE TO authenticated
  USING (auth.uid() = speaker_id)
  WITH CHECK (auth.uid() = speaker_id);

CREATE INDEX transcripts_session_idx ON public.transcripts(session_id, created_at);

-- ── 5. Realtime ──────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.transcripts;

-- ── 6. Update the auto-profile trigger to also create preferences ────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;
