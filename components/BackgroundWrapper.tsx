/**
 * BackgroundWrapper - Universal background component
 * 
 * Provides consistent FlexiWork branding across ALL pages:
 * - Faded background image
 * - Logo in corner
 * - Professional gradient overlays
 * 
 * Design inspired by joinflexi.work
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ImageBackground,
  Image,
  Platform,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface BackgroundWrapperProps {
  children: React.ReactNode;
  showLogo?: boolean;
  logoPosition?: 'top-left' | 'top-right' | 'none';
  useSafeArea?: boolean;
  bgOpacity?: number;
  style?: any;
  noPadding?: boolean;
}

export default function BackgroundWrapper({
  children,
  showLogo = true,
  logoPosition = 'top-left',
  useSafeArea = true,
  bgOpacity = 0.08,
  style,
  noPadding = false,
}: BackgroundWrapperProps) {
  const Container = useSafeArea ? SafeAreaView : View;

  return (
    <View style={[styles.container, style]}>
      {/* Background Image - Faded */}
      <ImageBackground
        source={require('../assets/images/background.webp')}
        style={styles.bgImage}
        resizeMode="cover"
        imageStyle={{ opacity: bgOpacity }}
      >
        {/* Primary gradient overlay - Purple/Blue brand */}
        <LinearGradient
          colors={[
            'rgba(139, 92, 246, 0.08)',
            'rgba(59, 130, 246, 0.05)',
            'rgba(245, 243, 255, 0.95)',
          ]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

        {/* Brand accent gradient - visible */}
        <LinearGradient
          colors={[
            'rgba(139, 92, 246, 0.12)',
            'rgba(59, 130, 246, 0.08)',
            'transparent',
          ]}
          style={[StyleSheet.absoluteFillObject, { height: '40%' }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </ImageBackground>

      {/* FlexiWork Logo */}
      {showLogo && logoPosition !== 'none' && (
        <View style={[
          styles.logoWrapper,
          logoPosition === 'top-right' ? styles.logoRight : styles.logoLeft,
        ]}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      )}

      {/* Main Content */}
      <Container style={[styles.content, noPadding && styles.noPadding]}>
        {children}
      </Container>
    </View>
  );
}

/**
 * ScrollBackground - For ScrollViews
 */
export function ScrollBackground({ 
  children,
  style,
}: { 
  children: React.ReactNode;
  style?: any;
}) {
  return (
    <View style={[styles.scrollBg, style]}>
      <LinearGradient
        colors={['rgba(139, 92, 246, 0.08)', 'transparent']}
        style={styles.scrollGradient}
      />
      {children}
    </View>
  );
}

/**
 * LogoHeader - Standalone logo
 */
export function LogoHeader({ size = 40, style }: { size?: number; style?: any }) {
  return (
    <View style={[styles.logoHeader, style]}>
      <Image
        source={require('../assets/images/logo.png')}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
  },
  logoWrapper: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 16 : 52,
    zIndex: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 6,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  logoLeft: { left: 16 },
  logoRight: { right: 16 },
  logo: { width: 36, height: 36 },
  content: { flex: 1 },
  noPadding: { paddingTop: 0 },
  scrollBg: { flex: 1, backgroundColor: 'transparent' },
  scrollGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    zIndex: -1,
  },
  logoHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 10,
    padding: 4,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
});
