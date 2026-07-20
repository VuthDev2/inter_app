import { createContext, useContext, type ReactNode } from "react";

import { usePreferences } from "../features/preferences/context";
import { darkColors, lightColors, type ThemeColors } from "./themes";

const ThemeContext = createContext<ThemeColors>(lightColors);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { dark_mode } = usePreferences();
  const colors = dark_mode ? darkColors : lightColors;
  return <ThemeContext.Provider value={colors}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
