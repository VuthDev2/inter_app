import { useState } from "react";

import type { LanguageCode } from "../constants/data";
import { usePreferences } from "../features/preferences/context";
import { SessionScreen } from "./SessionScreen";

export function LiveScreen() {
  const {
    preferred_source_lang: defaultSource,
    preferred_target_lang: defaultTarget,
  } = usePreferences();
  const [source] = useState<LanguageCode>(defaultSource);
  const [target] = useState<LanguageCode>(defaultTarget);

  return (
    <SessionScreen
      embedded
      initialSource={source}
      initialTarget={target}
    />
  );
}
