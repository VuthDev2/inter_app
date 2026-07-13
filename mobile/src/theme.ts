// Design tokens mirroring the web app's oklch-based color system
// --primary: oklch(0.55 0.15 250) ≈ #4B71C4 (professional blue)
export const colors = {
  // Base
  background: "#F7F8FB",   // oklch(0.98 0.01 250)
  surface: "#FFFFFF",       // oklch(1 0 0)
  surfaceMuted: "#F1F3F8",  // oklch(0.95 0.02 250)

  // Text
  text: "#161B2E",          // oklch(0.15 0.02 250)
  subtleText: "#4A536B",    // oklch(0.4 0.03 250)
  muted: "#7B8299",         // oklch(0.55 0.02 250)

  // Border / Input
  border: "#DDE1EF",        // oklch(0.9 0.02 250)
  input: "#DDE1EF",

  // Primary (Professional Blue)
  primary: "#4B71C4",       // oklch(0.55 0.15 250)
  primaryPressed: "#3A5EA8",
  primaryForeground: "#F7F8FB",
  primarySoft: "#EEF2FC",   // primary/10

  // Secondary
  secondary: "#F1F3F8",     // oklch(0.95 0.02 250)
  secondaryForeground: "#2B3250",

  // Destructive
  red: "#C0392B",           // oklch(0.55 0.22 25)
  redSoft: "#FEE2E2",

  // Accents (kept for Settings rows)
  amber: "#B45309",
  amberSoft: "#FEF3C7",
  purple: "#7C3AED",
  purpleSoft: "#EDE9FE",
  blue: "#4B71C4",
  blueSoft: "#EEF2FC",

  // Waveform / live session
  waveformBg: "#111827",
  waveformActiveBg: "#0F172A",

  // Tab bar — inactive tabs are near-black (matches screenshot)
  tabInactive: "#1C1C1E",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
};

export const radius = {
  sm: 6,
  md: 8,    // oklch radius-md = 0.875rem - 2px ≈ 12px → use 10 for mobile
  lg: 14,   // oklch radius-lg = 0.875rem ≈ 14px
  xl: 18,
  xxl: 22,
};
