/**
 * FlexiWork Modern Design System v2.0
 * 
 * Color Distribution:
 * - 45% Purple (#8B5CF6, #A855F7, #7C3AED)
 * - 35% Blue (#3B82F6, #2563EB, #1D4ED8)
 * - 20% Neutrals (Gray, Black, White)
 * 
 * NO OTHER COLORS ALLOWED
 */

// ============================================================================
// STRICT COLOR PALETTE - ONLY THESE COLORS ALLOWED
// ============================================================================

export const palette = {
  // Purple (45% - Primary, Dominant)
  purple: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6',
    600: '#7C3AED',
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95',
  },
  
  // Blue (35% - Secondary, Accent)
  blue: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  
  // Neutrals (20% - Background, Text, Borders)
  gray: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
  
  white: '#FFFFFF',
  black: '#000000',
};

// ============================================================================
// PRIMARY GRADIENTS (Purple → Blue)
// ============================================================================

export const gradients = {
  primary: [palette.purple[500], palette.purple[600], palette.blue[500]],
  purple: [palette.purple[400], palette.purple[500], palette.purple[600]],
  blue: [palette.blue[400], palette.blue[500], palette.blue[600]],
  primaryLight: [palette.purple[50], palette.blue[50]],
  purpleLight: [palette.purple[50], palette.purple[100]],
  blueLight: [palette.blue[50], palette.blue[100]],
  primaryDark: [palette.purple[700], palette.blue[700]],
  worker: [palette.blue[400], palette.blue[500], palette.purple[500]],
  workerLight: [palette.blue[50], palette.blue[100]],
  employer: [palette.purple[500], palette.purple[600], palette.purple[700]],
  employerLight: [palette.purple[50], palette.purple[100]],
  employee: [palette.purple[500], palette.blue[500]],
  employeeLight: [palette.purple[100], palette.blue[100]],
};

// ============================================================================
// SEMANTIC COLORS
// ============================================================================

export const colors = {
  primaryPurple: palette.purple[500],
  primaryBlue: palette.blue[500],
  
  worker: palette.blue[500],
  workerAccent: palette.blue[600],
  employer: palette.purple[500],
  employerAccent: palette.purple[600],
  employee: palette.purple[400],
  employeeAccent: palette.purple[500],
  admin: palette.purple[700],
  
  success: {
    gradient: [palette.blue[500], palette.blue[600]],
    solid: palette.blue[500],
    light: palette.blue[100],
    text: palette.blue[800],
  },
  
  warning: {
    gradient: [palette.purple[400], palette.purple[500]],
    solid: palette.purple[400],
    light: palette.purple[100],
    text: palette.purple[800],
  },
  
  error: {
    gradient: [palette.purple[600], palette.purple[700]],
    solid: palette.purple[600],
    light: palette.purple[100],
    text: palette.purple[900],
  },
  
  info: {
    gradient: [palette.blue[400], palette.blue[500]],
    solid: palette.blue[500],
    light: palette.blue[100],
    text: palette.blue[800],
  },
  
  pending: {
    gradient: [palette.purple[300], palette.purple[400]],
    solid: palette.purple[400],
    light: palette.purple[50],
    text: palette.purple[700],
  },
  
  background: palette.gray[50],
  surface: palette.white,
  surfaceElevated: palette.white,
  
  border: `rgba(148, 163, 184, 0.2)`,
  borderDark: `rgba(148, 163, 184, 0.4)`,
  borderLight: palette.gray[200],
  borderMedium: palette.gray[300],
  borderPurple: `rgba(139, 92, 246, 0.3)`,
  borderBlue: `rgba(59, 130, 246, 0.3)`,
  
  textPrimary: palette.gray[900],
  textSecondary: palette.gray[600],
  textTertiary: palette.gray[400],
  textOnGradient: palette.white,
  textOnPurple: palette.white,
  textOnBlue: palette.white,
  disabled: palette.gray[300],
  
  cardPurple: palette.purple[50],
  cardBlue: palette.blue[50],
  cardGray: palette.gray[100],
};

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
  hero: { fontSize: 34, fontWeight: '700' as const, lineHeight: 42, letterSpacing: -0.5 },
  h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 36, letterSpacing: -0.3 },
  h2: { fontSize: 22, fontWeight: '600' as const, lineHeight: 30 },
  h3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 26 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodySm: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16, letterSpacing: 0.3 },
  
  sizes: { hero: 34, h1: 28, h2: 22, h3: 18, h4: 18, bodyLarge: 16, body: 14, caption: 12, tiny: 10 },
  weights: { bold: '700' as const, semibold: '600' as const, medium: '500' as const, regular: '400' as const, light: '300' as const },
  lineHeights: { tight: 1.2, normal: 1.5, relaxed: 1.75 },
};

// ============================================================================
// SPACING & BORDER RADIUS
// ============================================================================

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, '2xl': 48, '3xl': 64, xl2: 48, xl3: 64 };
export const borderRadius = { sm: 8, md: 12, lg: 14, xl: 16, '2xl': 20, '3xl': 24, full: 9999 };

// ============================================================================
// SHADOWS
// ============================================================================

export const shadows = {
  none: { shadowColor: 'transparent', elevation: 0 },
  sm: { shadowColor: palette.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  md: { shadowColor: palette.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  lg: { shadowColor: palette.black, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6 },
  xl: { shadowColor: palette.black, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 8 },
  purpleLg: { shadowColor: palette.purple[500], shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 8 },
  blueLg: { shadowColor: palette.blue[500], shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 8 },
  coloredLg: { shadowColor: palette.purple[500], shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 8 },
};

// ============================================================================
// BUTTON STYLES
// ============================================================================

export const buttonStyles = {
  hero: { paddingVertical: 18, paddingHorizontal: 32, borderRadius: borderRadius.xl, ...shadows.purpleLg },
  heroText: { color: colors.textOnGradient, fontSize: 17, fontWeight: '600' as const, letterSpacing: 0.5 },
  primary: { backgroundColor: palette.purple[500], paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: borderRadius.md, ...shadows.purpleLg },
  primaryText: { color: palette.white, fontSize: typography.sizes.bodyLarge, fontWeight: typography.weights.semibold },
  secondary: { backgroundColor: palette.blue[500], paddingVertical: 16, paddingHorizontal: 28, borderRadius: borderRadius.xl, ...shadows.blueLg },
  secondaryText: { color: palette.white, fontSize: 16, fontWeight: '600' as const },
  outline: { backgroundColor: 'transparent', paddingVertical: 16, paddingHorizontal: 28, borderRadius: borderRadius.xl, borderWidth: 2, borderColor: palette.purple[500] },
  outlineText: { color: palette.purple[500], fontSize: 16, fontWeight: '600' as const },
  tertiary: { backgroundColor: 'transparent', paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderRadius: borderRadius.md },
  tertiaryText: { color: palette.purple[500], fontSize: typography.sizes.body, fontWeight: typography.weights.medium },
  icon: { backgroundColor: palette.purple[100], width: 40, height: 40, borderRadius: borderRadius.full, justifyContent: 'center', alignItems: 'center' },
};

// ============================================================================
// CARD STYLES
// ============================================================================

export const cardStyles = {
  elevated: { backgroundColor: colors.surface, borderRadius: borderRadius['2xl'], padding: 20, ...shadows.md, borderWidth: 1, borderColor: colors.border },
  gradient: { borderRadius: borderRadius['3xl'], padding: 28, ...shadows.purpleLg },
  glass: { backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: borderRadius['2xl'], padding: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)', ...shadows.lg },
  purple: { backgroundColor: palette.purple[50], borderRadius: borderRadius['2xl'], padding: 20, borderWidth: 1, borderColor: colors.borderPurple },
  blue: { backgroundColor: palette.blue[50], borderRadius: borderRadius['2xl'], padding: 20, borderWidth: 1, borderColor: colors.borderBlue },
  standard: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, ...shadows.sm },
};

// ============================================================================
// INPUT STYLES
// ============================================================================

export const inputStyles = {
  container: { backgroundColor: colors.background, borderWidth: 2, borderColor: 'transparent', borderRadius: borderRadius.lg, paddingVertical: 16, paddingHorizontal: 20 },
  text: { fontSize: 16, color: colors.textPrimary },
  focus: { borderColor: palette.purple[500], backgroundColor: colors.surface, ...shadows.sm, shadowColor: palette.purple[500], shadowOpacity: 0.15, shadowRadius: 8 },
  error: { borderColor: palette.purple[600] },
  errorText: { color: palette.purple[700], fontSize: 12, marginTop: spacing.xs },
  withIcon: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 20, paddingVertical: 4 },
  iconContainer: { marginRight: 12, width: 24, height: 24 },
};

// ============================================================================
// STATUS BADGE STYLES
// ============================================================================

export const statusBadgeStyles = {
  container: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: borderRadius.full },
  text: { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.5 },
  success: { backgroundColor: palette.blue[100], borderWidth: 1, borderColor: palette.blue[300] },
  successText: { color: palette.blue[700] },
  pending: { backgroundColor: palette.purple[100], borderWidth: 1, borderColor: palette.purple[300] },
  pendingText: { color: palette.purple[700] },
  error: { backgroundColor: palette.purple[200], borderWidth: 1, borderColor: palette.purple[400] },
  errorText: { color: palette.purple[800] },
  info: { backgroundColor: palette.blue[100], borderWidth: 1, borderColor: palette.blue[300] },
  infoText: { color: palette.blue[700] },
};

// ============================================================================
// STAT CARD STYLES
// ============================================================================

export const statCardStyles = {
  container: { backgroundColor: colors.surface, borderRadius: borderRadius['2xl'], padding: 24, alignItems: 'center' as const, ...shadows.sm, borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.08)' },
  iconContainer: { width: 56, height: 56, borderRadius: borderRadius.xl, justifyContent: 'center' as const, alignItems: 'center' as const, marginBottom: 16 },
  iconContainerPurple: { backgroundColor: palette.purple[100] },
  iconContainerBlue: { backgroundColor: palette.blue[100] },
  number: { fontSize: 32, fontWeight: '700' as const, color: colors.textPrimary, marginTop: 8 },
  label: { fontSize: 14, color: palette.gray[500], fontWeight: '500' as const, textAlign: 'center' as const, marginTop: 4 },
};

// ============================================================================
// STATUS COLORS
// ============================================================================

export const statusColors = {
  published: palette.blue[500], open: palette.blue[500], completed: palette.blue[600], accepted: palette.blue[500],
  confirmed: palette.blue[500], approved: palette.blue[500], active: palette.blue[500],
  in_progress: palette.purple[400], pending: palette.purple[400], pending_target: palette.purple[400],
  pending_manager: palette.purple[500], draft: palette.purple[300],
  cancelled: palette.purple[600], rejected: palette.purple[600], rejected_target: palette.purple[600],
  rejected_manager: palette.purple[700], expired: palette.purple[500], no_show: palette.purple[700],
  terminated: palette.purple[800], inactive: palette.gray[400],
  swapped_out: palette.gray[500], clocked_in: palette.blue[400], clocked_out: palette.blue[500], disputed: palette.purple[500],
};

// ============================================================================
// ROLE COLORS
// ============================================================================

export const roleColors = {
  chef: palette.purple[500], barista: palette.purple[400], server: palette.blue[500], host: palette.purple[300],
  kp: palette.blue[400], runner: palette.blue[300], bartender: palette.purple[600], cashier: palette.blue[600],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const getUserColor = (userType: 'worker' | 'employer' | 'admin' | 'employee'): string => {
  const colorMap = { worker: colors.worker, employer: colors.employer, admin: colors.admin, employee: colors.employee };
  return colorMap[userType] || colors.primaryPurple;
};

export const getStatusColor = (status: string): string => {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
  return statusColors[normalizedStatus as keyof typeof statusColors] || colors.textSecondary;
};

export const getGradientColors = (gradientType: keyof typeof gradients = 'primary'): string[] => gradients[gradientType];
export const getUserGradient = (userType: 'worker' | 'employer' | 'employee'): string[] => gradients[userType] || gradients.primary;

// ============================================================================
// NAVIGATION & CALENDAR
// ============================================================================

export const navbarColors = {
  background: palette.white, activeIcon: palette.purple[500], inactiveIcon: palette.gray[400],
  activeText: palette.purple[600], inactiveText: palette.gray[500], indicator: palette.purple[500], border: palette.gray[200],
};

export const calendarColors = {
  background: palette.white, headerBackground: palette.purple[500], headerText: palette.white,
  dayBackground: palette.gray[50], dayText: palette.gray[900], todayBackground: palette.purple[100],
  todayText: palette.purple[700], selectedBackground: palette.purple[500], selectedText: palette.white,
  shiftPurple: palette.purple[200], shiftBlue: palette.blue[200], shiftBorder: palette.purple[300],
};
