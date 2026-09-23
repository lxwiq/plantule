/** 4-point spacing scale. Screen edges use `lg`. */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 28,
  full: 9999,
} as const;

/** Minimum touch target (Material guidelines). */
export const touchTarget = 48;

export const motion = {
  fast: 150,
  base: 250,
} as const;
