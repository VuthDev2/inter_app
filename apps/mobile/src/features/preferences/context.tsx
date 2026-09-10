import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import type { LanguageCode } from "../../constants/data";
import { appStorage } from "../../services/nativeStorage";
import { setDeviceAudioSettings, type SpeakerOutput } from "../../services/audioSettings";
import { setCloudSyncEnabled } from "../../services/storage";
import { supabase } from "../../services/supabase";
import { useAuth } from "../auth/auth";

const PREFS_CACHE_KEY = "quickvoice.userPreferences";

export type UserPreferences = {
  ui_language: "en" | "ja";
  appearance_mode: "system" | "light" | "dark";
  text_size: "small" | "default" | "large";
  preferred_source_lang: LanguageCode;
  preferred_target_lang: LanguageCode;
  auto_speak: boolean;
  dark_mode: boolean;
  compact_view: boolean;
  session_alerts: boolean;
  sound_enabled: boolean;
  haptics_enabled: boolean;
  session_mode: "one-way" | "two-way";
  tts_speed: number;
  /** Copy conversations to Supabase so they can be opened on the web app or
   *  another device. Off by default: it moves recorded speech off this phone. */
  cloud_sync: boolean;
  /** Where translations are played: the loudspeaker, or the earpiece. */
  speaker_output: SpeakerOutput;
  /** Judge speech as a rise above the room rather than a plain loudness, so
   *  steady background noise is never sent to the model. */
  noise_cancellation: boolean;
};

const DEFAULTS: UserPreferences = {
  ui_language: "en",
  appearance_mode: "system",
  text_size: "default",
  preferred_source_lang: "en",
  preferred_target_lang: "ja",
  auto_speak: true,
  dark_mode: false,
  compact_view: false,
  session_alerts: true,
  sound_enabled: true,
  haptics_enabled: false,
  session_mode: "one-way",
  tts_speed: 1.0,
  cloud_sync: false,
  speaker_output: "speaker",
  noise_cancellation: true,
};

type PreferencesContextValue = UserPreferences & {
  loaded: boolean;
  update: (partial: Partial<UserPreferences>) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user || !supabase) {
      appStorage.getItem(PREFS_CACHE_KEY).then((raw) => {
        if (raw) {
          try { setPrefs((p) => ({ ...p, ...JSON.parse(raw) })); } catch { /* */ }
        }
        setLoaded(true);
      });
      return;
    }

    const loadFromDb = async () => {
      try {
        let cached: Partial<UserPreferences> = {};
        const raw = await appStorage.getItem(PREFS_CACHE_KEY);
        if (raw) {
          try { cached = JSON.parse(raw) as Partial<UserPreferences>; } catch { /* */ }
        }
        setPrefs((current) => ({ ...current, ...cached }));
        const { data } = await supabase!
          .from("user_preferences")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (data) {
          const next: UserPreferences = {
            ui_language: cached.ui_language ?? DEFAULTS.ui_language,
            appearance_mode: cached.appearance_mode ?? DEFAULTS.appearance_mode,
            text_size: cached.text_size ?? DEFAULTS.text_size,
            // Device-level, like the three above: it is not stored in
            // user_preferences, so it comes from this device's cache.
            cloud_sync: cached.cloud_sync ?? DEFAULTS.cloud_sync,
            speaker_output: cached.speaker_output ?? DEFAULTS.speaker_output,
            noise_cancellation: cached.noise_cancellation ?? DEFAULTS.noise_cancellation,
            preferred_source_lang: (data.preferred_source_lang ?? DEFAULTS.preferred_source_lang) as LanguageCode,
            preferred_target_lang: (data.preferred_target_lang ?? DEFAULTS.preferred_target_lang) as LanguageCode,
            auto_speak: data.auto_speak ?? DEFAULTS.auto_speak,
            dark_mode: data.dark_mode ?? DEFAULTS.dark_mode,
            compact_view: data.compact_view ?? DEFAULTS.compact_view,
            session_alerts: data.session_alerts ?? DEFAULTS.session_alerts,
            sound_enabled: data.sound_enabled ?? DEFAULTS.sound_enabled,
            haptics_enabled: data.haptics_enabled ?? DEFAULTS.haptics_enabled,
            session_mode: data.session_mode ?? DEFAULTS.session_mode,
            tts_speed: data.tts_speed ?? DEFAULTS.tts_speed,
          };
          setPrefs(next);
          appStorage.setItem(PREFS_CACHE_KEY, JSON.stringify(next));
        }
        setLoaded(true);
      } catch {
        setLoaded(true);
      }
    };

    loadFromDb();
  }, [user?.id]);

  // The storage helpers are plain functions, not components, so they cannot read
  // this context. Mirror the switch down to them whenever it changes — including
  // on first load, so a preference restored from cache or the database applies
  // before anything gets a chance to sync.
  useEffect(() => {
    setCloudSyncEnabled(prefs.cloud_sync);
  }, [prefs.cloud_sync]);

  // Likewise for the audio services, which are singletons rather than
  // components: they read the current values at the start of each turn.
  useEffect(() => {
    setDeviceAudioSettings({
      speaker_output: prefs.speaker_output,
      noise_cancellation: prefs.noise_cancellation,
    });
  }, [prefs.speaker_output, prefs.noise_cancellation]);

  const update = useCallback(
    (partial: Partial<UserPreferences>) => {
      setPrefs((prev) => {
        const next = { ...prev, ...partial };
        appStorage.setItem(PREFS_CACHE_KEY, JSON.stringify(next));

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          if (supabase && user) {
            const {
              appearance_mode: _appearanceMode,
              text_size: _textSize,
              ui_language: _uiLanguage,
              // Device-level switch, and there is no column for it: including
              // it would make the whole upsert fail.
              cloud_sync: _cloudSync,
              // Same story: both describe this handset's speaker and
              // microphone, and neither has a column to sync into.
              speaker_output: _speakerOutput,
              noise_cancellation: _noiseCancellation,
              ...syncedPreferences
            } = next;
            supabase
              .from("user_preferences")
              .upsert({ user_id: user.id, ...syncedPreferences, updated_at: new Date().toISOString() })
              .then(({ error }) => {
                if (error) console.warn("[preferences] Sync failed:", error);
              });
          }
        }, 500);

        return next;
      });
    },
    [user?.id],
  );

  const value = useMemo<PreferencesContextValue>(
    () => ({ ...prefs, loaded, update }),
    [prefs, loaded, update],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error("usePreferences must be used inside PreferencesProvider");
  return value;
}
