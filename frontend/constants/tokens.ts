// Design token system — all spacing, typography, radius, and shadow values.
// Never use magic numbers in component or screen files; import from here.

// ── Spacing ─────────────────────────────────────────────────────────────────
// 4-point base grid. Use multiples of 4.
export const spacing = {
  xxs:  2,
  xs:   4,
  sm:   8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  '3xl': 32,
  '4xl': 48,
  '5xl': 64,
} as const;

// ── Typography ───────────────────────────────────────────────────────────────
// Mirrors Apple HIG text styles. Use these instead of ad-hoc fontSize values.
export const typography = {
  largeTitle: { fontSize: 34, fontWeight: '700' as const, letterSpacing:  0.37 },
  title1:     { fontSize: 28, fontWeight: '700' as const, letterSpacing:  0.36 },
  title2:     { fontSize: 22, fontWeight: '700' as const, letterSpacing:  0.35 },
  title3:     { fontSize: 20, fontWeight: '600' as const, letterSpacing:  0.38 },
  headline:   { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.41 },
  body:       { fontSize: 17, fontWeight: '400' as const, letterSpacing: -0.41 },
  callout:    { fontSize: 16, fontWeight: '400' as const, letterSpacing: -0.32 },
  subhead:    { fontSize: 15, fontWeight: '400' as const, letterSpacing: -0.24 },
  footnote:   { fontSize: 13, fontWeight: '400' as const, letterSpacing: -0.08 },
  caption1:   { fontSize: 12, fontWeight: '400' as const, letterSpacing:  0.00 },
  caption2:   { fontSize: 11, fontWeight: '400' as const, letterSpacing:  0.07 },
} as const;

// ── Border Radius ────────────────────────────────────────────────────────────
// Always pair with borderCurve: 'continuous' for squircle shape.
export const radius = {
  xs:   6,
  sm:   10,
  md:   14,
  lg:   18,
  xl:   22,
  card: 16,
  pill: 9999,
} as const;

// ── Shadows (CSS boxShadow) ──────────────────────────────────────────────────
// Use boxShadow style prop — never elevation or legacy RN shadow props.
export const shadows = {
  xs:   '0 1px 2px rgba(0, 0, 0, 0.05)',
  sm:   '0 1px 4px rgba(0, 0, 0, 0.07)',
  md:   '0 2px 8px rgba(0, 0, 0, 0.08)',
  lg:   '0 4px 16px rgba(0, 0, 0, 0.10)',
  card: '0 2px 12px rgba(0, 0, 0, 0.07)',
  float:'0 8px 24px rgba(0, 0, 0, 0.12)',
} as const;

// ── Animation Durations (ms) ─────────────────────────────────────────────────
export const duration = {
  fast:   150,
  normal: 250,
  slow:   400,
} as const;
