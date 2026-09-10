import { type LiveSession } from "../services/storage";
import { useState } from "react";

import type { LanguageCode } from "../constants/data";
import { usePreferences } from "../features/preferences/context";
import { SessionScreen } from "./SessionScreen";

export function LiveScreen({
  active = true,
  resume,
  onResumed,
}: {
  active?: boolean;
  resume?: LiveSession | null;
  onResumed?: () => void;
}) {
  const {
    preferred_source_lang: defaultSource,
    preferred_target_lang: defaultTarget,
  } = usePreferences();
  const [source] = useState<LanguageCode>(defaultSource);
  const [target] = useState<LanguageCode>(defaultTarget);

  return (
    <SessionScreen
      embedded
      active={active}
      initialSource={source}
      initialTarget={target}
      resume={resume}
      onResumed={onResumed}
    />
  );
}
