/** Spacing scale in points. Use these instead of random numbers so layouts stay consistent. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
} as const;

/** Minimum touch target size recommended by Apple (44pt) and Google (48dp). */
export const MIN_TOUCH = 48;

/** Keep text lines readable on tablets. */
export const MAX_CONTENT_WIDTH = 640;
