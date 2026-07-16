import { StyleSheet } from "react-native";
import { colors, radius, spacing } from "./theme";

export const atoms = StyleSheet.create({
  // ── Flex ──
  flex1: { flex: 1 },
  flexRow: { flexDirection: "row" },
  flexCol: { flexDirection: "column" },
  flexWrap: { flexWrap: "wrap" },
  itemsCenter: { alignItems: "center" },
  itemsStart: { alignItems: "flex-start" },
  itemsEnd: { alignItems: "flex-end" },
  justifyCenter: { justifyContent: "center" },
  justifyBetween: { justifyContent: "space-between" },
  justifyEnd: { justifyContent: "flex-end" },
  selfCenter: { alignSelf: "center" },
  gapXs: { gap: spacing.xs },
  gapSm: { gap: spacing.sm },
  gapMd: { gap: spacing.md },
  gapLg: { gap: spacing.lg },
  gapXl: { gap: spacing.xl },

  // ── Padding ──
  pXs: { padding: spacing.xs },
  pSm: { padding: spacing.sm },
  pMd: { padding: spacing.md },
  pLg: { padding: spacing.lg },
  pXl: { padding: spacing.xl },
  pxSm: { paddingHorizontal: spacing.sm },
  pxMd: { paddingHorizontal: spacing.md },
  pxLg: { paddingHorizontal: spacing.lg },
  pySm: { paddingVertical: spacing.sm },
  pyMd: { paddingVertical: spacing.md },
  pyLg: { paddingVertical: spacing.lg },
  ptSm: { paddingTop: spacing.sm },
  ptMd: { paddingTop: spacing.md },
  ptLg: { paddingTop: spacing.lg },
  pbSm: { paddingBottom: spacing.sm },
  pbMd: { paddingBottom: spacing.md },
  pbLg: { paddingBottom: spacing.lg },
  pbXl: { paddingBottom: spacing.xl },

  // ── Margin ──
  m0: { margin: 0 },
  mtAuto: { marginTop: "auto" },
  mxAuto: { marginHorizontal: "auto" },

  // ── Border / Surface ──
  border1: { borderWidth: 1 },
  borderTop1: { borderTopWidth: 1 },
  borderBottom1: { borderBottomWidth: 1 },
  roundedSm: { borderRadius: radius.sm },
  roundedMd: { borderRadius: radius.md },
  roundedLg: { borderRadius: radius.lg },
  roundedXl: { borderRadius: radius.xl },
  roundedXxl: { borderRadius: radius.xxl },
  roundedFull: { borderRadius: 999 },

  // ── Background ──
  bgSurface: { backgroundColor: colors.surface },
  bgBackground: { backgroundColor: colors.background },
  bgSecondary: { backgroundColor: colors.secondary },
  bgPrimary: { backgroundColor: colors.primary },
  bgPrimarySoft: { backgroundColor: colors.primarySoft },

  // ── Text ──
  textCenter: { textAlign: "center" },
  textXs: { fontSize: 12 },
  textSm: { fontSize: 13 },
  textMd: { fontSize: 14 },
  textLg: { fontSize: 15 },
  textXl: { fontSize: 17 },
  text2xl: { fontSize: 22 },
  text3xl: { fontSize: 28 },
  text4xl: { fontSize: 30 },
  fontNormal: { fontWeight: "400" },
  fontMedium: { fontWeight: "500" },
  fontSemibold: { fontWeight: "600" },
  fontBold: { fontWeight: "700" },
  textMuted: { color: colors.muted },
  textPrimary: { color: colors.primary },
  textSurface: { color: colors.text },
  textWhite: { color: "#FFFFFF" },
  leadingTight: { lineHeight: 20 },
  leadingNormal: { lineHeight: 21 },
  leadingRelaxed: { lineHeight: 24 },
  letterSpacing: { letterSpacing: 0.1 },
  uppercase: { textTransform: "uppercase" },

  // ── Shadow (card) ──
  shadow: {
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  shadowMd: {
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  shadowLg: {
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },

  // ── Overflow ──
  overflowHidden: { overflow: "hidden" },

  // ── Card (common combo) ──
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardXxl: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xxl,
    padding: spacing.lg,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // ── Row (align center row) ──
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
