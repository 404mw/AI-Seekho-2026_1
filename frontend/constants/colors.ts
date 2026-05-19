// White-theme first. No PlatformColor — explicit values for clean, predictable UI.
// Dark mode can be layered on later by swapping this file via a ThemeContext.
//
// FORBIDDEN: neon, electric, or fully-saturated colors (e.g. #00FF00, #FF00FF,
// #00FFFF, #FF0000 at full brightness). All values must be desaturated enough
// to feel premium on a white background. When in doubt, check: if it glows on
// a dark screen, it doesn't belong here.

export const colors = {
  // ── Backgrounds ────────────────────────────────────────────────────────────
  // subtle warm-white progression instead of gray blocks
  background:          '#FFFCF8',
  backgroundSecondary: '#FAF6F1',
  backgroundTertiary:  '#FFFDFB',
  backgroundElevated:  '#FFFFFF',

  // layered surfaces
  surfaceSoft:         '#F8F3EE',
  surfaceMuted:        '#F4EEE8',
  surfaceGlass:        'rgba(255, 252, 248, 0.72)',

  // ── Text ───────────────────────────────────────────────────────────────────
  // slightly warm dark tones
  label:           '#1F1A17',
  labelSecondary:  'rgba(31, 26, 23, 0.68)',
  labelTertiary:   'rgba(31, 26, 23, 0.42)',
  labelQuaternary: 'rgba(31, 26, 23, 0.22)',

  // ── Brand / Accent ─────────────────────────────────────────────────────────
  // softened indigo-blue
  accent:           '#5B6CFF',
  accentHover:      '#4D5DE8',
  accentPressed:    '#4452CC',

  accentLight:      'rgba(91, 108, 255, 0.10)',
  accentLighter:    'rgba(91, 108, 255, 0.06)',
  accentBorder:     'rgba(91, 108, 255, 0.18)',

  accentText:       '#FFFFFF',

  // optional secondary accent
  brandSecondary:       '#8A63F6',
  brandSecondaryLight:  'rgba(138, 99, 246, 0.10)',

  // ── Semantic Status ────────────────────────────────────────────────────────
  success:       '#3A9B6C',
  successLight:  'rgba(58, 155, 108, 0.12)',
  successText:   '#245C42',

  warning:       '#C98A2E',
  warningLight:  'rgba(201, 138, 46, 0.12)',
  warningText:   '#734700',

  error:         '#CC625B',
  errorLight:    'rgba(204, 98, 91, 0.12)',
  errorText:     '#7A2E2A',

  pending:       '#C98A2E',
  processing:    '#5B6CFF',
  completed:     '#3A9B6C',
  cancelled:     'rgba(31, 26, 23, 0.26)',

  // ── Borders / Separators ──────────────────────────────────────────────────
  // warm separators instead of cold grays
  separator:       'rgba(74, 58, 46, 0.08)',
  separatorOpaque: '#EEE5DC',

  border:          '#E9E0D7',
  borderStrong:    '#DDD1C6',

  // ── Overlays ───────────────────────────────────────────────────────────────
  overlay:         'rgba(24, 18, 14, 0.42)',
  scrim:           'rgba(36, 26, 20, 0.03)',

  // ── Inputs ─────────────────────────────────────────────────────────────────
  inputBackground: '#FFFDFB',
  inputBorder:     '#E6DDD4',
  inputBorderFocus:'rgba(91, 108, 255, 0.34)',
  placeholder:     'rgba(31, 26, 23, 0.30)',

  // ── Cards / Effects ────────────────────────────────────────────────────────
  cardShadow:      'rgba(58, 42, 28, 0.05)',

  skeleton:        '#EFE7DE',
  shimmer:         '#F8F3EE',

  // ── Gradients ──────────────────────────────────────────────────────────────
  gradientStart:   '#6674FF',
  gradientEnd:     '#8A63F6',
} as const;

export type ColorToken = keyof typeof colors;