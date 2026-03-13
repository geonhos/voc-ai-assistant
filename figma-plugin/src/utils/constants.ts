// Design tokens from UX_SPECIFICATION.md

export const COLORS = {
  // Primary
  primary: '#2563EB',
  primaryLight: '#DBEAFE',
  primaryDark: '#1E40AF',

  // Success
  success: '#10B981',
  successLight: '#ECFDF5',
  successBorder: '#A7F3D0',

  // Warning
  warning: '#F59E0B',
  warningLight: '#FFFBEB',

  // Danger
  danger: '#EF4444',
  dangerLight: '#FEE2E2',

  // Neutral
  neutral900: '#111827',
  neutral700: '#374151',
  neutral500: '#6B7280',
  neutral300: '#D1D5DB',
  neutral100: '#F3F4F6',
  neutral50: '#F9FAFB',

  // Pure
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const CONVERSATION_STATUS: Record<string, { bg: string; text: string; label: string }> = {
  ACTIVE:     { bg: '#ECFDF5', text: '#065F46', label: '진행중' },
  ESCALATED:  { bg: '#FFFBEB', text: '#92400E', label: '에스컬레이션' },
  RESOLVED:   { bg: '#DBEAFE', text: '#1E40AF', label: '해결' },
  CLOSED:     { bg: '#F3F4F6', text: '#374151', label: '종료' },
} as const;

export const FONT_FAMILY = 'Inter';
export const FONT_FALLBACK = 'Roboto';

export interface TypoToken {
  name: string;
  size: number;
  weight: number;
  lineHeight: number;
  letterSpacing?: number;
}

export const TYPOGRAPHY: TypoToken[] = [
  { name: 'Heading 1',  size: 24, weight: 700, lineHeight: 32 },
  { name: 'Heading 2',  size: 20, weight: 600, lineHeight: 28 },
  { name: 'Heading 3',  size: 16, weight: 600, lineHeight: 24 },
  { name: 'Body',       size: 14, weight: 400, lineHeight: 20 },
  { name: 'Body Medium',size: 14, weight: 500, lineHeight: 20 },
  { name: 'Body Bold',  size: 14, weight: 600, lineHeight: 20 },
  { name: 'Caption',    size: 12, weight: 400, lineHeight: 16 },
  { name: 'Overline',   size: 11, weight: 500, lineHeight: 16, letterSpacing: 0.5 },
  { name: 'KPI Number', size: 32, weight: 700, lineHeight: 40 },
];

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const RADIUS = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

// Layout
export const SCREEN_WIDTH = 1440;
export const SIDEBAR_WIDTH = 240;
export const CONTENT_WIDTH = SCREEN_WIDTH - SIDEBAR_WIDTH;
export const HEADER_HEIGHT = 56;
export const CHAT_WIDTH = 420;
export const CHAT_HEIGHT = 720;
