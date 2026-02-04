/**
 * Reusable Card Components
 * 
 * Uses the FlexiWork design system for consistent card styling across the app.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  colors,
  spacing,
  borderRadius,
  shadows,
  cardStyles,
} from '../../constants/theme';

export type CardVariant = 'standard' | 'elevated' | 'gradient' | 'glass';

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  onPress?: () => void;
  style?: ViewStyle;
  padding?: number;
  marginBottom?: number;
}

/**
 * Standard Card Component
 * 
 * Basic card with subtle shadow for content containers
 */
export function Card({
  children,
  variant = 'standard',
  onPress,
  style,
  padding,
  marginBottom,
}: CardProps) {
  const baseStyle: ViewStyle = {
    ...(variant === 'standard' && cardStyles.standard),
    ...(variant === 'elevated' && cardStyles.elevated),
    ...(variant === 'glass' && cardStyles.glass),
    ...(padding !== undefined && { padding }),
    ...(marginBottom !== undefined && { marginBottom }),
    ...style,
  };

  // Glass card (semi-transparent with blur effect)
  if (variant === 'glass') {
    const content = (
      <View style={[styles.glassContent, padding !== undefined && { padding }, marginBottom !== undefined && { marginBottom }]}>
        {children}
      </View>
    );

    if (onPress) {
      return (
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.8}
          style={baseStyle}
        >
          {content}
        </TouchableOpacity>
      );
    }

    return <View style={baseStyle}>{content}</View>;
  }

  // Gradient card
  if (variant === 'gradient') {
    const content = (
      <View style={[styles.gradientContent, padding !== undefined && { padding }, marginBottom !== undefined && { marginBottom }]}>
        {children}
      </View>
    );

    if (onPress) {
      return (
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.8}
          style={[baseStyle, { overflow: 'hidden' }]}
        >
          <LinearGradient
            colors={['#3B82F6', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          {content}
        </TouchableOpacity>
      );
    }

    return (
      <View style={[baseStyle, { overflow: 'hidden' }]}>
        <LinearGradient
          colors={['#3B82F6', '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        {content}
      </View>
    );
  }

  // Standard or elevated card
  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={baseStyle}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={baseStyle}>{children}</View>;
}

/**
 * Card Header Component
 * 
 * Header section for cards with title and optional action
 */
export interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  style?: ViewStyle;
}

export function CardHeader({
  title,
  subtitle,
  action,
  style,
}: CardHeaderProps) {
  return (
    <View style={[styles.header, style]}>
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
      </View>
      {action && <View>{action}</View>}
    </View>
  );
}

/**
 * Card Body Component
 * 
 * Main content area for cards
 */
export interface CardBodyProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function CardBody({ children, style }: CardBodyProps) {
  return <View style={[styles.body, style]}>{children}</View>;
}

/**
 * Card Footer Component
 * 
 * Footer section for cards with actions
 */
export interface CardFooterProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function CardFooter({ children, style }: CardFooterProps) {
  return <View style={[styles.footer, style]}>{children}</View>;
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  gradientContent: {
    borderRadius: borderRadius['3xl'],
    padding: 28,
  },
  glassContent: {
    borderRadius: borderRadius['2xl'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  body: {
    // Body content styling handled by children
  },
  footer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});

