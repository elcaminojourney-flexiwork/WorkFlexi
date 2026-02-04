/**
 * Web Navigation Bar Component
 * 
 * Horizontal navigation bar for web platform
 * Replaces bottom tab bar on desktop/web views
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../constants/theme';

export interface NavItem {
  name: string;
  href: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface WebNavbarProps {
  items: NavItem[];
}

export function WebNavbar({ items }: WebNavbarProps) {
  const router = useRouter();
  const segments = useSegments();
  const currentPath = '/' + segments.join('/');

  if (Platform.OS !== 'web') {
    return null; // Only render on web
  }

  return (
    <View style={styles.navbar}>
      <View style={styles.navbarContent}>
        {/* Logo/Brand */}
        <TouchableOpacity
          style={styles.logo}
          onPress={() => router.push('/')}
        >
          <Text style={styles.logoText}>FlexiWork</Text>
        </TouchableOpacity>

        {/* Navigation Items */}
        <View style={styles.navItems}>
          {items.map((item) => {
            // Normalize paths for comparison
            const itemPath = item.href.replace('/(tabs)', '');
            const normalizedCurrentPath = currentPath.replace('/(tabs)', '');
            const isActive = 
              normalizedCurrentPath === itemPath || 
              normalizedCurrentPath.startsWith(itemPath + '/') ||
              (itemPath === '' && normalizedCurrentPath === '/');
            
            return (
              <TouchableOpacity
                key={item.href}
                style={[styles.navItem, isActive && styles.navItemActive]}
                onPress={() => router.push(item.href)}
              >
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={isActive ? colors.primaryBlue : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.navItemText,
                    isActive && styles.navItemTextActive,
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    ...shadows.sm,
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  },
  navbarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    maxWidth: 1200,
    width: '100%',
    marginHorizontal: 'auto',
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.bold,
    color: colors.primaryBlue,
  },
  navItems: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  navItemActive: {
    backgroundColor: colors.primaryBlue + '10', // 10% opacity
  },
  navItemText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  navItemTextActive: {
    color: colors.primaryBlue,
    fontWeight: typography.weights.semibold,
  },
});

