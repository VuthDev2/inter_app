-- ── 1. Drop old QR-room tables ────────────────────────────────────────────────
DROP TABLE IF EXISTS public.session_participants CASCADE;
DROP TABLE IF EXISTS public.sessions               CASCADE;

-- ── 2. Rename recording_sessions → recordings ────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recording_sessions') THEN
    ALTER TABLE public.recording_sessions RENAME TO recordings;
  END IF;
END $$;

-- ── 3. Ensure recordings has owner_id + source/target ─────────────────────────
ALTER TABLE IF EXISTS public.recordings
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.recordings
  ADD COLUMN IF NOT EXISTS source_lang TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS target_lang TEXT NOT NULL DEFAULT 'ja';

-- Drop all policies on recordings first (some depend on host_id)
DROP POLICY IF EXISTS "Users can create sessions as host"        ON public.recordings;
DROP POLICY IF EXISTS "Host can update own sessions"             ON public.recordings;
DROP POLICY IF EXISTS "Host can delete own sessions"             ON public.recordings;
DROP POLICY IF EXISTS "Authenticated can view sessions to look up by code" ON public.recordings;
DROP POLICY IF EXISTS "Users can create sessions"                ON public.recordings;
DROP POLICY IF EXISTS "Users can view own recording sessions"    ON public.recordings;
DROP POLICY IF EXISTS "Users can create own recording sessions"  ON public.recordings;
DROP POLICY IF EXISTS "Users can update own recording sessions"  ON public.recordings;
DROP POLICY IF EXISTS "Users can delete own recording sessions"  ON public.recordings;
DROP POLICY IF EXISTS "Users can view own recordings"            ON public.recordings;
DROP POLICY IF EXISTS "Users can create own recordings"          ON public.recordings;
DROP POLICY IF EXISTS "Users can update own recordings"          ON public.recordings;
DROP POLICY IF EXISTS "Users can delete own recordings"          ON public.recordings;

-- Copy data from host_id → owner_id, then drop host_id
UPDATE public.recordings SET owner_id = host_id WHERE owner_id IS NULL AND host_id IS NOT NULL;
ALTER TABLE IF EXISTS public.recordings DROP COLUMN IF EXISTS host_id;

-- ── 4. Create live_sessions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.live_sessions (
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

DROP POLICY IF EXISTS "Users can view own live sessions" ON public.live_sessions;
CREATE POLICY "Users can view own live sessions"
  ON public.live_sessions FOR SELECT TO authenticated
  USING (auth.uid() = host_id);

DROP POLICY IF EXISTS "Users can create live sessions" ON public.live_sessions;
CREATE POLICY "Users can create live sessions"
  ON public.live_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "Host can update own live sessions" ON public.live_sessions;
CREATE POLICY "Host can update own live sessions"
  ON public.live_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = host_id);

DROP POLICY IF EXISTS "Host can delete own live sessions" ON public.live_sessions;
CREATE POLICY "Host can delete own live sessions"
  ON public.live_sessions FOR DELETE TO authenticated
  USING (auth.uid() = host_id);

CREATE INDEX IF NOT EXISTS live_sessions_host_created_idx
  ON public.live_sessions(host_id, created_at DESC);

-- ── 5. Create transcripts ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transcripts (
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

DROP POLICY IF EXISTS "Users can view own transcripts" ON public.transcripts;
CREATE POLICY "Users can view own transcripts"
  ON public.transcripts FOR SELECT TO authenticated
  USING (auth.uid() = speaker_id);

DROP POLICY IF EXISTS "Users can insert own transcripts" ON public.transcripts;
CREATE POLICY "Users can insert own transcripts"
  ON public.transcripts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = speaker_id);

DROP POLICY IF EXISTS "Users can update own transcripts" ON public.transcripts;
CREATE POLICY "Users can update own transcripts"
  ON public.transcripts FOR UPDATE TO authenticated
  USING (auth.uid() = speaker_id)
  WITH CHECK (auth.uid() = speaker_id);

CREATE INDEX IF NOT EXISTS transcripts_session_idx
  ON public.transcripts(session_id, created_at);

-- ── 6. Realtime ──────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'transcripts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transcripts;
  END IF;
END $$;
