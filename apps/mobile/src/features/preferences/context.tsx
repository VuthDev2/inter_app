import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import type { LanguageCode } from "../../constants/data";
import { appStorage } from "../../services/nativeStorage";
import { supabase } from "../../services/supabase";
import { useAuth } from "../auth/auth";

const PREFS_CACHE_KEY = "quickvoice.userPreferences";

export type UserPreferences = {
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
};

const DEFAULTS: UserPreferences = {
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
        const { data } = await supabase!
          .from("user_preferences")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (data) {
          const next: UserPreferences = {
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

  const update = useCallback(
    (partial: Partial<UserPreferences>) => {
      setPrefs((prev) => {
        const next = { ...prev, ...partial };
        appStorage.setItem(PREFS_CACHE_KEY, JSON.stringify(next));

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          if (supabase && user) {
            supabase
              .from("user_preferences")
              .upsert({ user_id: user.id, ...next, updated_at: new Date().toISOString() })
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
