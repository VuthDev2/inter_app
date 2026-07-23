DROP TABLE IF EXISTS public.session_participants CASCADE;
DROP TABLE IF EXISTS public.sessions               CASCADE;
DROP TABLE IF EXISTS public.recording_sessions     CASCADE;

-- ─── Profiles ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                 UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name       TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL    ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users delete own profile" ON public.profiles;
CREATE POLICY "Users delete own profile"
  ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);


-- ─── Recordings (renamed from recording_sessions) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.recordings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recording_type    TEXT NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT,
  transcript        TEXT,
  source_audio      BOOLEAN NOT NULL DEFAULT true,
  source_lang       TEXT NOT NULL DEFAULT 'en',
  target_lang       TEXT NOT NULL DEFAULT 'ja',
  template_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  status            TEXT NOT NULL DEFAULT 'saved',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recordings TO authenticated;
GRANT ALL    ON public.recordings TO service_role;

ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own recordings" ON public.recordings;
CREATE POLICY "Users can view own recordings"
  ON public.recordings FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can create own recordings" ON public.recordings;
CREATE POLICY "Users can create own recordings"
  ON public.recordings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update own recordings" ON public.recordings;
CREATE POLICY "Users can update own recordings"
  ON public.recordings FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can delete own recordings" ON public.recordings;
CREATE POLICY "Users can delete own recordings"
  ON public.recordings FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS recordings_owner_created_idx
  ON public.recordings(owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS recordings_owner_type_idx
  ON public.recordings(owner_id, recording_type);


-- ─── Live Sessions ─────────────────────────────────────────────────────────────
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


-- ─── Transcripts ───────────────────────────────────────────────────────────────
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


-- ─── User Preferences ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id                 UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_source_lang   TEXT NOT NULL DEFAULT 'en',
  preferred_target_lang   TEXT NOT NULL DEFAULT 'ja',
  auto_speak              BOOLEAN NOT NULL DEFAULT true,
  dark_mode               BOOLEAN NOT NULL DEFAULT false,
  compact_view            BOOLEAN NOT NULL DEFAULT false,
  session_alerts          BOOLEAN NOT NULL DEFAULT true,
  sound_enabled           BOOLEAN NOT NULL DEFAULT true,
  haptics_enabled         BOOLEAN NOT NULL DEFAULT false,
  session_mode            TEXT NOT NULL DEFAULT 'one-way' CHECK (session_mode IN ('one-way', 'two-way')),
  tts_speed               REAL NOT NULL DEFAULT 1.0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.user_preferences TO authenticated;
GRANT ALL    ON public.user_preferences TO service_role;

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
CREATE POLICY "Users can view own preferences"
  ON public.user_preferences FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ─── Audio Recordings ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audio_recordings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recording_id    UUID REFERENCES public.recordings(id) ON DELETE SET NULL,
  live_session_id UUID REFERENCES public.live_sessions(id) ON DELETE SET NULL,
  file_path       TEXT NOT NULL,
  storage_path    TEXT,
  mime_type       TEXT NOT NULL DEFAULT 'audio/wav',
  duration_ms     INTEGER,
  file_size_bytes INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT audio_has_target CHECK (recording_id IS NOT NULL OR live_session_id IS NOT NULL)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.audio_recordings TO authenticated;
GRANT ALL    ON public.audio_recordings TO service_role;

ALTER TABLE public.audio_recordings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own audio recordings" ON public.audio_recordings;
CREATE POLICY "Users can view own audio recordings"
  ON public.audio_recordings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own audio recordings" ON public.audio_recordings;
CREATE POLICY "Users can create own audio recordings"
  ON public.audio_recordings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own audio recordings" ON public.audio_recordings;
CREATE POLICY "Users can update own audio recordings"
  ON public.audio_recordings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own audio recordings" ON public.audio_recordings;
CREATE POLICY "Users can delete own audio recordings"
  ON public.audio_recordings FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS audio_recordings_user_idx     ON public.audio_recordings(user_id);
CREATE INDEX IF NOT EXISTS audio_recordings_recording_idx ON public.audio_recordings(recording_id);
CREATE INDEX IF NOT EXISTS audio_recordings_live_idx     ON public.audio_recordings(live_session_id);
