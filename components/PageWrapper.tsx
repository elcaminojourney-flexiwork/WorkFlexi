/**
 * PageWrapper - Universal wrapper for ALL FlexiWork screens
 * 
 * Provides:
 * - Background image with gradient overlay
 * - Logo in top left corner
 * - Consistent styling
 * 
 * MUST be used by every screen for consistent design
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ImageBackground,
  Image,
  Platform,
  ScrollView,
  RefreshControl,
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, SHADOWS, RADIUS, SPACING } from '../constants/GlobalStyles';

interface PageWrapperProps {
  children: React.ReactNode;
  scrollable?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  showLogo?: boolean;
  noPadding?: boolean;
  keyboardAvoiding?: boolean;
  style?: any;
}

export default function PageWrapper({
  children,
  scrollable = true,
  refreshing = false,
  onRefresh,
  showLogo = true,
  noPadding = false,
  keyboardAvoiding = false,
  style,
}: PageWrapperProps) {
  const content = (
    <>
      {/* Background Image */}
      <ImageBackground
        source={require('../assets/images/background.webp')}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
        imageStyle={{ opacity: 0.15 }}
      >
        {/* Gradient Overlay - Purple/Blue tint */}
        <LinearGradient
          colors={GRADIENTS.bgOverlay as any}
          style={StyleSheet.absoluteFillObject}
        />
      </ImageBackground>

      {/* Logo - Fixed position, always visible */}
      {showLogo && (
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      )}

      {/* Main Content */}
      {scrollable ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            noPadding && styles.noPadding,
            style,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={COLORS.purple600}
                colors={[COLORS.purple600]}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.staticContent, noPadding && styles.noPadding, style]}>
          {children}
        </View>
      )}
    </>
  );

  if (keyboardAvoiding) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        {content}
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      {content}
    </View>
  );
}

// ============================================================================
// HERO HEADER - Purple gradient header component
// ============================================================================
interface HeroHeaderProps {
  title: string;
  subtitle?: string;
  showToggle?: boolean;
  toggleLabel?: string;
  rightContent?: React.ReactNode;
}

export function HeroHeader({
  title,
  subtitle,
  showToggle = false,
  toggleLabel = 'FlexiWork Rosta',
  rightContent,
}: HeroHeaderProps) {
  return (
    <LinearGradient
      colors={GRADIENTS.header as any}
      style={styles.heroHeader}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {showToggle && (
        <View style={styles.toggleRow}>
          <View style={styles.toggle}>
            <View style={styles.toggleThumb} />
          </View>
          <View style={styles.toggleLabel}>
            <View style={styles.toggleLabelText}>{toggleLabel}</View>
          </View>
        </View>
      )}
      <View style={styles.heroContent}>
        <View style={styles.heroLeft}>
          <View style={styles.heroTitle}>{title}</View>
          {subtitle && <View style={styles.heroSubtitle}>{subtitle}</View>}
        </View>
        {rightContent && <View style={styles.heroRight}>{rightContent}</View>}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray50,
  },
  
  logoContainer: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 16 : 52,
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
  
  scrollView: {
    flex: 1,
  },
  
  scrollContent: {
    paddingTop: Platform.OS === 'web' ? 80 : 110,
    paddingBottom: 40,
  },
  
  staticContent: {
    flex: 1,
    paddingTop: Platform.OS === 'web' ? 80 : 110,
  },
  
  noPadding: {
    paddingTop: 0,
  },
  
  // Hero Header styles
  heroHeader: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    overflow: 'hidden',
  },
  
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  
  toggle: {
    width: 44,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    padding: 2,
  },
  
  toggleThumb: {
    width: 20,
    height: 20,
    backgroundColor: COLORS.white,
    borderRadius: 10,
  },
  
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  
  toggleLabelText: {
    color: COLORS.white,
  },
  
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  
  heroLeft: {
    flex: 1,
  },
  
  heroRight: {},
  
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 4,
  },
  
  heroSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
  },
});
