import { AccentColor, ColorScheme, ThemeBase } from '../types';
import { ACCENT_CATALOGUE, DEFAULT_COLOR_SCHEME, resolveThemeTokens } from './themes';

export function parseHexColor(color?: string): [number, number, number] | null {
  if (!color) return null;
  const clean = color.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }
  return null;
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  );
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  const l = (max + min) / 2;

  if (d === 0) return [0, 0, l];

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) {
    h = (gn - bn) / d + (gn < bn ? 6 : 0);
  } else if (max === gn) {
    h = (bn - rn) / d + 2;
  } else {
    h = (rn - gn) / d + 4;
  }
  h /= 6;
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

export function getRelativeLuminance(r: number, g: number, b: number): number {
  const toLinear = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function getContrastRatio(hexA: string, hexB: string): number {
  const rgbA = parseHexColor(hexA);
  const rgbB = parseHexColor(hexB);
  if (!rgbA || !rgbB) return 1;
  const lA = getRelativeLuminance(rgbA[0], rgbA[1], rgbA[2]);
  const lB = getRelativeLuminance(rgbB[0], rgbB[1], rgbB[2]);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

export function getAccentSwatchHex(
  accentColor: AccentColor,
  colorScheme: ColorScheme = DEFAULT_COLOR_SCHEME
): string {
  const entry = ACCENT_CATALOGUE.find((a) => a.id === accentColor) || ACCENT_CATALOGUE[0];
  return colorScheme === 'dark' ? entry.swatchDark : entry.swatchLight;
}

export function getReadableForegroundForBackground(bgHex: string): '#ffffff' | '#111827' {
  const whiteContrast = getContrastRatio(bgHex, '#ffffff');
  const darkContrast = getContrastRatio(bgHex, '#111827');
  return whiteContrast >= darkContrast ? '#ffffff' : '#111827';
}

/**
 * Ensures a service/activity/event calendar color has at least ~4.5:1 contrast
 * against the active Viewer card background while preserving its hue.
 * Darkens slightly in light mode or lightens slightly in dark mode if needed.
 */
export function getReadableViewerTitleColor(
  rawColor: string | undefined,
  theme: ThemeBase,
  colorScheme: ColorScheme = DEFAULT_COLOR_SCHEME,
  accentColor: AccentColor
): string {
  const resolvedScheme = colorScheme || DEFAULT_COLOR_SCHEME;
  const fallbackHex = getAccentSwatchHex(accentColor, resolvedScheme);
  const parsed = parseHexColor(rawColor);
  const baseHex = parsed ? rgbToHex(parsed[0], parsed[1], parsed[2]) : fallbackHex;
  const surfaceHex = resolveThemeTokens(theme, resolvedScheme).surface;

  const targetRatio = 4.55;
  if (getContrastRatio(baseHex, surfaceHex) >= targetRatio) {
    return baseHex;
  }

  const rgb = parseHexColor(baseHex);
  if (!rgb) return baseHex;
  const [h, s, l] = rgbToHsl(rgb[0], rgb[1], rgb[2]);

  if (resolvedScheme === 'light') {
    let low = 0;
    let high = l;
    let bestHex = baseHex;
    for (let i = 0; i < 20; i++) {
      const mid = (low + high) / 2;
      const [r, g, b] = hslToRgb(h, s, mid);
      const candidate = rgbToHex(r, g, b);
      if (getContrastRatio(candidate, surfaceHex) >= targetRatio) {
        bestHex = candidate;
        low = mid; // try slightly lighter while still keeping >= 4.55
      } else {
        high = mid;
      }
    }
    return getContrastRatio(bestHex, surfaceHex) >= 4.5 ? bestHex : '#111827';
  }

  // Dark mode: lighten while keeping the same hue
  let low = l;
  let high = 1;
  let bestHex = baseHex;
  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2;
    const [r, g, b] = hslToRgb(h, s, mid);
    const candidate = rgbToHex(r, g, b);
    if (getContrastRatio(candidate, surfaceHex) >= targetRatio) {
      bestHex = candidate;
      high = mid; // try slightly darker while still keeping >= 4.55
    } else {
      low = mid;
    }
  }
  return getContrastRatio(bestHex, surfaceHex) >= 4.5 ? bestHex : '#f8fafc';
}
