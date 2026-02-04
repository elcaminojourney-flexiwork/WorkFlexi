/**
 * GLOBAL DESIGN SYSTEM - FlexiWork Modern UI
 * 
 * Purple/Blue color scheme (45% purple, 35% blue, 20% neutral)
 * Modern 3D cards with shadows
 * Consistent across ALL screens
 */

// ============================================================================
// COLOR PALETTE - Purple dominant
// ============================================================================
export const COLORS = {
  // Primary Purple (45%)
  purple50: '#FAF5FF',
  purple100: '#F3E8FF',
  purple200: '#E9D5FF',
  purple300: '#D8B4FE',
  purple400: '#C084FC',
  purple500: '#A855F7',
  purple600: '#9333EA',
  purple700: '#7C3AED',
  purple800: '#6D28D9',
  purple900: '#5B21B6',
  
  // Secondary Blue (35%)
  blue50: '#EFF6FF',
  blue100: '#DBEAFE',
  blue200: '#BFDBFE',
  blue300: '#93C5FD',
  blue400: '#60A5FA',
  blue500: '#3B82F6',
  blue600: '#2563EB',
  blue700: '#1D4ED8',
  blue800: '#1E40AF',
  blue900: '#1E3A8A',
  
  // Neutral (20%)
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
  
  white: '#FFFFFF',
  black: '#000000',
  
  // Status colors - using purple/blue variants
  success: '#3B82F6',     // Blue
  warning: '#A855F7',     // Purple
  error: '#7C3AED',       // Dark purple
  info: '#60A5FA',        // Light blue
};

// ============================================================================
// GRADIENTS
// ============================================================================
export const GRADIENTS = {
  // Main header gradient (like reference image)
  header: ['#9333EA', '#7C3AED', '#3B82F6'],
  headerLight: ['#A855F7', '#8B5CF6', '#60A5FA'],
  
  // Card gradients
  cardWhite: ['#FFFFFF', '#FAFAFA'],
  cardPurple: ['#FAF5FF', '#F3E8FF'],
  cardBlue: ['#EFF6FF', '#DBEAFE'],
  
  // Button gradients
  buttonPrimary: ['#9333EA', '#7C3AED'],
  buttonSecondary: ['#3B82F6', '#2563EB'],
  
  // Background overlay
  bgOverlay: ['rgba(139, 92, 246, 0.08)', 'rgba(59, 130, 246, 0.05)', 'rgba(255, 255, 255, 0.97)'],
};

// ============================================================================
// SHADOWS - 3D effect
// ============================================================================
export const SHADOWS = {
  card: {
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  cardHover: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 12,
  },
  button: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  logo: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
};

// ============================================================================
// SPACING
// ============================================================================
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// ============================================================================
// BORDER RADIUS
// ============================================================================
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

// ============================================================================
// TYPOGRAPHY
// ============================================================================
export const FONTS = {
  // Sizes
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 40,
  
  // Weights
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

// ============================================================================
// COMMON STYLES
// ============================================================================
export const COMMON_STYLES = {
  // Page background
  pageBackground: {
    flex: 1,
    backgroundColor: COLORS.gray50,
  },
  
  // Logo container (top left on all pages)
  logoContainer: {
    position: 'absolute' as const,
    top: 16,
    left: 16,
    zIndex: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    ...SHADOWS.logo,
  },
  
  logo: {
    width: 36,
    height: 36,
  },
  
  // Modern card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  
  // Stat card
  statCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    minWidth: 160,
    ...SHADOWS.card,
  },
  
  // Icon badge (for stat cards)
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  
  // Status badge
  statusBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
  },
  
  // Primary button
  buttonPrimary: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden' as const,
    ...SHADOWS.button,
  },
  
  buttonPrimaryInner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  
  buttonPrimaryText: {
    fontSize: FONTS.md,
    fontWeight: FONTS.bold,
    color: COLORS.white,
  },
  
  // Section header
  sectionHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: SPACING.md,
  },
  
  sectionTitle: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.gray900,
  },
  
  sectionAction: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.semibold,
    color: COLORS.purple600,
  },
  
  // Hero header gradient
  heroHeader: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.xl,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  
  heroTitle: {
    fontSize: FONTS.xxl,
    fontWeight: FONTS.extrabold,
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  
  heroSubtitle: {
    fontSize: FONTS.md,
    fontWeight: FONTS.medium,
    color: 'rgba(255, 255, 255, 0.9)',
  },
};

export default {
  COLORS,
  GRADIENTS,
  SHADOWS,
  SPACING,
  RADIUS,
  FONTS,
  COMMON_STYLES,
};
