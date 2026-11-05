import { palette } from '@/theme/colors';

/** WCAG relative luminance of a #RRGGBB color. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

// Text/background pairs the UI actually uses. WCAG AA needs 4.5:1 for normal text.
const PAIRS = [
  ['text', 'background'],
  ['text', 'surface'],
  ['textSecondary', 'background'],
  ['textSecondary', 'surface'],
  ['onPrimary', 'primary'],
  ['primary', 'surface'],
  ['danger', 'surface'],
  ['danger', 'surfaceMuted'],
  ['primary', 'surfaceMuted'],
  ['text', 'surfaceMuted'],
] as const;

describe.each(['light', 'dark'] as const)('%s palette contrast', (scheme) => {
  it.each(PAIRS)('%s on %s meets WCAG AA (4.5:1)', (fg, bg) => {
    const colors = palette[scheme];
    expect(contrast(colors[fg], colors[bg])).toBeGreaterThanOrEqual(4.5);
  });
});
