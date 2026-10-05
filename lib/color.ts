/**
 * Colour helpers. The client only configures five brand colours in data/config.json;
 * text colour on top of primary/accent is computed so contrast is always readable.
 */

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function channel(v: number) {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio, from 1 to 21. */
export function contrastRatio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** White or near-black, whichever reads better on the given background. */
export function readableOn(bg: string) {
  return contrastRatio(bg, '#ffffff') >= contrastRatio(bg, '#161616') ? '#ffffff' : '#161616';
}

export interface ThemeColors {
  primary: string;
  accent: string;
  background: string;
  surface: string;
  foreground: string;
}

/** CSS custom properties applied on <html>. Tailwind tokens read them (see globals.css). */
export function getThemeVars(colors: ThemeColors): Record<string, string> {
  return {
    '--primary': colors.primary,
    '--primary-foreground': readableOn(colors.primary),
    '--accent': colors.accent,
    '--accent-foreground': readableOn(colors.accent),
    '--background': colors.background,
    '--surface': colors.surface,
    '--foreground': colors.foreground,
  };
}
