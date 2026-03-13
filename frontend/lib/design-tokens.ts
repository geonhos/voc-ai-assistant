export const colors = {
  primary: '#2563EB',
  primaryLight: '#EFF6FF',
  primaryDark: '#1E40AF',
  success: '#10B981',
  successLight: '#ECFDF5',
  successBorder: '#A7F3D0',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  danger: '#EF4444',
  dangerLight: '#FEF2F2',
  white: '#FFFFFF',
  neutral50: '#F9FAFB',
  neutral100: '#F3F4F6',
  neutral200: '#E5E7EB',
  neutral300: '#D1D5DB',
  neutral500: '#6B7280',
  neutral700: '#374151',
  neutral900: '#111827',
} as const;

export const typography = {
  heading1: { size: '24px', weight: 700, lineHeight: '32px' },
  heading2: { size: '20px', weight: 600, lineHeight: '28px' },
  heading3: { size: '16px', weight: 600, lineHeight: '24px' },
  body: { size: '14px', weight: 400, lineHeight: '20px' },
  bodyBold: { size: '14px', weight: 600, lineHeight: '20px' },
  caption: { size: '12px', weight: 400, lineHeight: '16px' },
  small: { size: '11px', weight: 400, lineHeight: '14px' },
} as const;

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  base: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
} as const;

export const radius = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
} as const;
