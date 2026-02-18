// Font family
export const FONTS = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

// Color palette (light)
export const LIGHT_COLORS = {
  // Primary
  primary: '#059669',
  primaryDark: '#047857',
  primaryLight: '#10B981',

  // Secondary
  secondary: '#64748B',
  secondaryDark: '#475569',
  secondaryLight: '#94A3B8',

  // Success
  success: '#16A34A',
  successDark: '#15803D',
  successLight: '#4ADE80',

  // Warning
  warning: '#F59E0B',
  warningDark: '#D97706',
  warningLight: '#FBBF24',

  // Error
  error: '#EF4444',
  errorDark: '#DC2626',
  errorLight: '#F87171',

  // Neutral
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  // Background
  background: '#F9FAFB',
  surface: '#FFFFFF',

  // Text
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',
};

// Color palette (dark)
export const DARK_COLORS: typeof LIGHT_COLORS = {
  // Primary (same emerald)
  primary: '#059669',
  primaryDark: '#047857',
  primaryLight: '#10B981',

  // Secondary
  secondary: '#94A3B8',
  secondaryDark: '#CBD5E1',
  secondaryLight: '#64748B',

  // Success
  success: '#16A34A',
  successDark: '#15803D',
  successLight: '#4ADE80',

  // Warning
  warning: '#F59E0B',
  warningDark: '#D97706',
  warningLight: '#FBBF24',

  // Error
  error: '#EF4444',
  errorDark: '#DC2626',
  errorLight: '#F87171',

  // Neutral (inverted)
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#1A1A2E',
  gray100: '#1F2937',
  gray200: '#374151',
  gray300: '#4B5563',
  gray400: '#6B7280',
  gray500: '#9CA3AF',
  gray600: '#D1D5DB',
  gray700: '#E5E7EB',
  gray800: '#F3F4F6',
  gray900: '#F9FAFB',

  // Background
  background: '#0F172A',
  surface: '#1E293B',

  // Text
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  textInverse: '#111827',
};

// Keep COLORS as alias for LIGHT_COLORS for backward compatibility
export const COLORS = LIGHT_COLORS;

// Spacing scale
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Font sizes
export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// Border radius
export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

// Shadow styles
export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
};

// Timer update interval (ms)
export const TIMER_UPDATE_INTERVAL = 1000;

// Notification channel ID
export const NOTIFICATION_CHANNEL_ID = 'timer-channel';

// Database name
export const DATABASE_NAME = 'jobtimetracker.db';

// Default values
export const DEFAULT_HOURLY_RATE = 0;

// Date format patterns
export const DATE_FORMATS = {
  display: 'MMM d, yyyy',
  displayWithTime: 'MMM d, yyyy h:mm a',
  time: 'h:mm a',
  database: 'yyyy-MM-dd',
  iso: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
};
