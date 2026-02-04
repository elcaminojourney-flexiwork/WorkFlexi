/**
 * Modern UI Components Library
 * 
 * Professional app-style components with:
 * - 3D effects and shadows
 * - Purple/Blue color scheme (45% purple, 35% blue, 20% neutral)
 * - Consistent styling across all screens
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ImageBackground,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// ============================================================================
// COLOR PALETTE
// ============================================================================
export const modernColors = {
  // Primary Purple (45%)
  purple: {
    50: '#FAF5FF',
    100: '#F3E8FF',
    200: '#E9D5FF',
    300: '#D8B4FE',
    400: '#C084FC',
    500: '#A855F7',
    600: '#9333EA',
    700: '#7C3AED',
    800: '#6D28D9',
    900: '#5B21B6',
  },
  // Secondary Blue (35%)
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
  // Neutrals (20%)
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  white: '#FFFFFF',
  black: '#000000',
};

// ============================================================================
// PAGE WRAPPER - Background + Logo for ALL pages
// ============================================================================
export function ModernPageWrapper({ 
  children, 
  showHeader = true,
  headerTitle = '',
  headerGradient = true,
  scrollable = true,
  refreshControl,
}: {
  children: React.ReactNode;
  showHeader?: boolean;
  headerTitle?: string;
  headerGradient?: boolean;
  scrollable?: boolean;
  refreshControl?: React.ReactElement;
}) {
  const Container = scrollable ? ScrollView : View;
  
  return (
    <ImageBackground
      source={require('../assets/images/background.webp')}
      style={styles.pageBackground}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['rgba(139, 92, 246, 0.12)', 'rgba(59, 130, 246, 0.08)', 'rgba(255, 255, 255, 0.95)']}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <Container 
        style={styles.pageContent}
        contentContainerStyle={scrollable ? styles.scrollContent : undefined}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </Container>
    </ImageBackground>
  );
}

// ============================================================================
// HERO HEADER - Purple gradient header with title
// ============================================================================
export function HeroHeader({
  title,
  subtitle,
  rightComponent,
}: {
  title: string;
  subtitle?: string;
  rightComponent?: React.ReactNode;
}) {
  return (
    <LinearGradient
      colors={[modernColors.purple[600], modernColors.purple[700], modernColors.blue[600]]}
      style={styles.heroHeader}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.heroContent}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroTitle}>{title}</Text>
          {subtitle && <Text style={styles.heroSubtitle}>{subtitle}</Text>}
        </View>
        {rightComponent && <View style={styles.heroRight}>{rightComponent}</View>}
      </View>
    </LinearGradient>
  );
}

// ============================================================================
// NAVIGATION TABS
// ============================================================================
export function NavTabs({
  tabs,
  activeTab,
  onTabPress,
}: {
  tabs: { key: string; label: string; icon?: string }[];
  activeTab: string;
  onTabPress: (key: string) => void;
}) {
  return (
    <View style={styles.navTabsContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.navTabsScroll}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.navTab, isActive && styles.navTabActive]}
              onPress={() => onTabPress(tab.key)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isActive 
                  ? [modernColors.purple[600], modernColors.purple[700]]
                  : ['transparent', 'transparent']
                }
                style={styles.navTabGradient}
              >
                {tab.icon && (
                  <Ionicons 
                    name={tab.icon as any} 
                    size={18} 
                    color={isActive ? modernColors.white : modernColors.gray[600]} 
                  />
                )}
                <Text style={[styles.navTabText, isActive && styles.navTabTextActive]}>
                  {tab.label}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ============================================================================
// STAT CARD - Modern stat display with icon and percentage
// ============================================================================
export function StatCard({
  icon,
  iconColor = modernColors.purple[500],
  iconBgColor = modernColors.purple[100],
  label,
  value,
  subtext,
  percentage,
  percentagePositive = true,
}: {
  icon: string;
  iconColor?: string;
  iconBgColor?: string;
  label: string;
  value: string | number;
  subtext?: string;
  percentage?: string;
  percentagePositive?: boolean;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statCardHeader}>
        <View style={[styles.statIconBg, { backgroundColor: iconBgColor }]}>
          <Ionicons name={icon as any} size={24} color={iconColor} />
        </View>
        {percentage && (
          <Text style={[
            styles.statPercentage,
            { color: percentagePositive ? modernColors.blue[600] : modernColors.purple[600] }
          ]}>
            {percentage}
          </Text>
        )}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {subtext && <Text style={styles.statSubtext}>{subtext}</Text>}
    </View>
  );
}

// ============================================================================
// ACTION BUTTON - 3D gradient button
// ============================================================================
export function ActionButton({
  title,
  icon,
  onPress,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
}: {
  title: string;
  icon?: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
}) {
  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';
  
  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        isPrimary && styles.actionButtonPrimary,
        isOutline && styles.actionButtonOutline,
        size === 'large' && styles.actionButtonLarge,
        size === 'small' && styles.actionButtonSmall,
        fullWidth && styles.actionButtonFullWidth,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {isPrimary ? (
        <LinearGradient
          colors={[modernColors.purple[500], modernColors.purple[600], modernColors.purple[700]]}
          style={styles.actionButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {icon && <Ionicons name={icon as any} size={20} color={modernColors.white} style={styles.actionButtonIcon} />}
          <Text style={styles.actionButtonTextPrimary}>{title}</Text>
        </LinearGradient>
      ) : (
        <View style={styles.actionButtonContent}>
          {icon && (
            <Ionicons 
              name={icon as any} 
              size={20} 
              color={isOutline ? modernColors.purple[600] : modernColors.gray[700]} 
              style={styles.actionButtonIcon} 
            />
          )}
          <Text style={[
            styles.actionButtonText,
            isOutline && styles.actionButtonTextOutline,
          ]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ============================================================================
// MODERN CARD - Container with 3D shadow
// ============================================================================
export function ModernCard({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
}) {
  const Wrapper = onPress ? TouchableOpacity : View;
  
  return (
    <Wrapper 
      style={[styles.modernCard, style]} 
      onPress={onPress}
      activeOpacity={0.9}
    >
      {children}
    </Wrapper>
  );
}

// ============================================================================
// SHIFT CARD - For displaying shift information
// ============================================================================
export function ShiftCard({
  title,
  location,
  date,
  time,
  slots,
  slotsTotal,
  status,
  statusColor,
  workers = [],
  onPress,
}: {
  title: string;
  location?: string;
  date: string;
  time: string;
  slots: number;
  slotsTotal: number;
  status: string;
  statusColor?: string;
  workers?: { type: string; count: number }[];
  onPress?: () => void;
}) {
  const isFilled = slots >= slotsTotal;
  const badgeColor = statusColor || (isFilled ? modernColors.blue[500] : modernColors.purple[500]);
  const badgeBgColor = isFilled ? modernColors.blue[50] : modernColors.purple[50];
  
  return (
    <ModernCard onPress={onPress} style={styles.shiftCard}>
      <View style={styles.shiftCardHeader}>
        <View style={styles.shiftCardLeft}>
          <Text style={styles.shiftTitle}>{title}</Text>
          {location && <Text style={styles.shiftLocation}>{location}</Text>}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: badgeBgColor }]}>
          <Text style={[styles.statusBadgeText, { color: badgeColor }]}>{status}</Text>
        </View>
      </View>
      
      <View style={styles.shiftDetails}>
        <View style={styles.shiftDetailRow}>
          <Ionicons name="calendar-outline" size={16} color={modernColors.gray[500]} />
          <Text style={styles.shiftDetailText}>{date}</Text>
        </View>
        <View style={styles.shiftDetailRow}>
          <Ionicons name="time-outline" size={16} color={modernColors.gray[500]} />
          <Text style={styles.shiftDetailText}>{time}</Text>
        </View>
        <Text style={[styles.shiftSlots, { color: isFilled ? modernColors.blue[600] : modernColors.purple[600] }]}>
          {slots}/{slotsTotal} slots
        </Text>
      </View>

      {workers.length > 0 && (
        <View style={styles.workerTags}>
          {workers.map((w, i) => (
            <View key={i} style={[styles.workerTag, { backgroundColor: i === 0 ? modernColors.purple[100] : modernColors.blue[100] }]}>
              <Text style={[styles.workerTagText, { color: i === 0 ? modernColors.purple[700] : modernColors.blue[700] }]}>
                {w.count} {w.type}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ModernCard>
  );
}

// ============================================================================
// SECTION HEADER
// ============================================================================
export function SectionHeader({
  title,
  actionText,
  onActionPress,
}: {
  title: string;
  actionText?: string;
  onActionPress?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionText && (
        <TouchableOpacity onPress={onActionPress}>
          <Text style={styles.sectionAction}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================================================
// QUICK ACTIONS PANEL
// ============================================================================
export function QuickActionsPanel({
  actions,
}: {
  actions: { title: string; icon: string; onPress: () => void; badge?: number; primary?: boolean }[];
}) {
  return (
    <ModernCard style={styles.quickActionsPanel}>
      <Text style={styles.quickActionsTitle}>Quick Actions</Text>
      {actions.map((action, index) => (
        <TouchableOpacity 
          key={index}
          style={[styles.quickAction, action.primary && styles.quickActionPrimary]}
          onPress={action.onPress}
          activeOpacity={0.85}
        >
          {action.primary ? (
            <LinearGradient
              colors={[modernColors.purple[500], modernColors.purple[600]]}
              style={styles.quickActionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.quickActionTextPrimary}>{action.title}</Text>
              <Ionicons name={action.icon as any} size={20} color={modernColors.white} />
            </LinearGradient>
          ) : (
            <>
              <Text style={styles.quickActionText}>{action.title}</Text>
              <View style={styles.quickActionRight}>
                {action.badge !== undefined && (
                  <View style={styles.quickActionBadge}>
                    <Text style={styles.quickActionBadgeText}>{action.badge}</Text>
                  </View>
                )}
                <Ionicons name={action.icon as any} size={20} color={modernColors.purple[600]} />
              </View>
            </>
          )}
        </TouchableOpacity>
      ))}
    </ModernCard>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  // Page Wrapper
  pageBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  logoContainer: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 16 : 52,
    left: 16,
    zIndex: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 8,
    shadowColor: modernColors.purple[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  logo: {
    width: 36,
    height: 36,
  },
  pageContent: {
    flex: 1,
    paddingTop: Platform.OS === 'web' ? 70 : 100,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Hero Header
  heroHeader: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 20,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLeft: {
    flex: 1,
  },
  heroRight: {},
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: modernColors.white,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },

  // Nav Tabs
  navTabsContainer: {
    backgroundColor: modernColors.white,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    shadowColor: modernColors.gray[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  navTabsScroll: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  navTab: {
    marginHorizontal: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  navTabActive: {},
  navTabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  navTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: modernColors.gray[600],
  },
  navTabTextActive: {
    color: modernColors.white,
  },

  // Stat Card
  statCard: {
    backgroundColor: modernColors.white,
    borderRadius: 20,
    padding: 20,
    minWidth: 160,
    shadowColor: modernColors.gray[900],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  statIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statPercentage: {
    fontSize: 14,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 14,
    color: modernColors.gray[500],
    marginBottom: 4,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: modernColors.gray[900],
  },
  statSubtext: {
    fontSize: 12,
    color: modernColors.gray[400],
    marginTop: 4,
  },

  // Action Button
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: modernColors.purple[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  actionButtonPrimary: {},
  actionButtonOutline: {
    backgroundColor: modernColors.white,
    borderWidth: 2,
    borderColor: modernColors.purple[200],
    shadowOpacity: 0.1,
  },
  actionButtonLarge: {},
  actionButtonSmall: {},
  actionButtonFullWidth: {
    width: '100%',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 8,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 8,
  },
  actionButtonIcon: {},
  actionButtonTextPrimary: {
    fontSize: 16,
    fontWeight: '700',
    color: modernColors.white,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: modernColors.gray[700],
  },
  actionButtonTextOutline: {
    color: modernColors.purple[600],
  },

  // Modern Card
  modernCard: {
    backgroundColor: modernColors.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: modernColors.gray[900],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 16,
  },

  // Shift Card
  shiftCard: {
    marginHorizontal: 16,
  },
  shiftCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  shiftCardLeft: {
    flex: 1,
  },
  shiftTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: modernColors.gray[900],
    marginBottom: 4,
  },
  shiftLocation: {
    fontSize: 14,
    color: modernColors.gray[500],
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  shiftDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  shiftDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shiftDetailText: {
    fontSize: 14,
    color: modernColors.gray[600],
  },
  shiftSlots: {
    fontSize: 14,
    fontWeight: '700',
  },
  workerTags: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  workerTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  workerTagText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: modernColors.gray[900],
  },
  sectionAction: {
    fontSize: 14,
    fontWeight: '600',
    color: modernColors.purple[600],
  },

  // Quick Actions Panel
  quickActionsPanel: {
    marginHorizontal: 16,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: modernColors.gray[900],
    marginBottom: 16,
  },
  quickAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: modernColors.gray[100],
  },
  quickActionPrimary: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    borderBottomWidth: 0,
  },
  quickActionGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    width: '100%',
  },
  quickActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: modernColors.purple[600],
  },
  quickActionTextPrimary: {
    fontSize: 16,
    fontWeight: '700',
    color: modernColors.white,
  },
  quickActionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickActionBadge: {
    backgroundColor: modernColors.purple[100],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  quickActionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: modernColors.purple[700],
  },
});
