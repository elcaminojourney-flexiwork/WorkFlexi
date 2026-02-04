/**
 * Reusable Button Components
 * 
 * Uses the FlexiWork design system for consistent styling across the app.
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows, buttonStyles } from '../../constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  useGradient?: boolean; // Use gradient for primary button
}

/**
 * Primary Button Component
 * 
 * Main call-to-action button with gradient or solid background
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
  useGradient = false,
}: ButtonProps) {
  const sizeStyles = getSizeStyles(size);
  const variantStyles = getVariantStyles(variant, disabled);
  const textVariantStyles = getTextVariantStyles(variant, disabled);

  const buttonContent = (
    <>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.surface : colors.primaryBlue}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Ionicons
              name={icon}
              size={20}
              color={variant === 'primary' ? colors.surface : colors.primaryBlue}
              style={{ marginRight: spacing.xs }}
            />
          )}
          <Text style={[textVariantStyles, sizeStyles.text, textStyle]}>
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Ionicons
              name={icon}
              size={20}
              color={variant === 'primary' ? colors.surface : colors.primaryBlue}
              style={{ marginLeft: spacing.xs }}
            />
          )}
        </>
      )}
    </>
  );

  const baseStyle: ViewStyle = {
    ...variantStyles,
    ...sizeStyles.container,
    ...(fullWidth && { width: '100%' }),
    ...(disabled && { opacity: 0.5 }),
    ...style,
  };

  // Use gradient for primary button if requested
  if (variant === 'primary' && useGradient && !disabled) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
        style={[baseStyle, { overflow: 'hidden' }]}
      >
        <LinearGradient
          colors={['#3B82F6', '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.gradientContent}>
          {buttonContent}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={baseStyle}
    >
      {buttonContent}
    </TouchableOpacity>
  );
}

/**
 * Icon Button Component
 * 
 * Circular button with icon only
 */
export interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: number;
  color?: string;
  backgroundColor?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

export function IconButton({
  icon,
  onPress,
  size = 40,
  color = colors.primaryBlue,
  backgroundColor = `${colors.primaryBlue}1A`, // 10% opacity
  disabled = false,
  style,
}: IconButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        {
          width: size,
          height: size,
          borderRadius: borderRadius.full,
          backgroundColor,
          justifyContent: 'center',
          alignItems: 'center',
          ...(disabled && { opacity: 0.5 }),
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={size * 0.5} color={color} />
    </TouchableOpacity>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getSizeStyles(size: ButtonSize) {
  switch (size) {
    case 'small':
      return {
        container: {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
        },
        text: {
          fontSize: typography.sizes.body,
        },
      };
    case 'large':
      return {
        container: {
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.xl,
        },
        text: {
          fontSize: typography.sizes.h4,
        },
      };
    case 'medium':
    default:
      return {
        container: {
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
        },
        text: {
          fontSize: typography.sizes.bodyLarge,
        },
      };
  }
}

function getVariantStyles(variant: ButtonVariant, disabled: boolean): ViewStyle {
  switch (variant) {
    case 'primary':
      return {
        backgroundColor: disabled ? colors.disabled : colors.primaryBlue,
        borderRadius: borderRadius.md,
        ...shadows.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      };
    case 'secondary':
      return {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        borderWidth: 2,
        borderColor: disabled ? colors.disabled : colors.primaryBlue,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      };
    case 'tertiary':
      return {
        backgroundColor: 'transparent',
        borderRadius: borderRadius.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      };
    default:
      return {};
  }
}

function getTextVariantStyles(variant: ButtonVariant, disabled: boolean): TextStyle {
  switch (variant) {
    case 'primary':
      return {
        color: colors.surface,
        fontWeight: typography.weights.semibold,
      };
    case 'secondary':
      return {
        color: disabled ? colors.disabled : colors.primaryBlue,
        fontWeight: typography.weights.semibold,
      };
    case 'tertiary':
      return {
        color: disabled ? colors.disabled : colors.primaryBlue,
        fontWeight: typography.weights.medium,
      };
    default:
      return {};
  }
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  gradientContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

