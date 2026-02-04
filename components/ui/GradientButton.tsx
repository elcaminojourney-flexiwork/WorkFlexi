/**
 * Gradient Button Component
 * 
 * Hero button with gradient background for primary actions.
 * Modern design inspired by Stripe, Linear, and Revolut.
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows, buttonStyles, gradients } from '../../constants/theme';

export type GradientButtonVariant = 'hero' | 'secondary';
export type GradientButtonSize = 'small' | 'medium' | 'large';

export interface GradientButtonProps {
  title: string;
  onPress: () => void;
  variant?: GradientButtonVariant;
  size?: GradientButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  gradientColors?: string[]; // Custom gradient colors
  userType?: 'worker' | 'employer'; // User-specific gradient
}

/**
 * Gradient Button Component
 * 
 * Primary call-to-action button with gradient background
 */
export function GradientButton({
  title,
  onPress,
  variant = 'hero',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
  gradientColors,
  userType,
}: GradientButtonProps) {
  const sizeStyles = getSizeStyles(size);
  const variantStyles = getVariantStyles(variant, disabled);
  const textVariantStyles = getTextVariantStyles(variant, disabled);
  
  // Determine gradient colors
  let finalGradientColors: string[] = gradientColors || gradients.primary;
  if (userType === 'employer') {
    finalGradientColors = gradients.employer;
  } else if (userType === 'worker') {
    finalGradientColors = gradients.worker;
  }
  
  // Ensure at least 2 colors for LinearGradient
  if (finalGradientColors.length < 2) {
    finalGradientColors = gradients.primary;
  }

  const buttonContent = (
    <>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'hero' ? colors.textOnGradient : colors.primaryBlue}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Ionicons
              name={icon}
              size={20}
              color={variant === 'hero' ? colors.textOnGradient : colors.primaryBlue}
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
              color={variant === 'hero' ? colors.textOnGradient : colors.primaryBlue}
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

  // Hero button with gradient
  if (variant === 'hero' && !disabled) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
        style={[baseStyle, { overflow: 'hidden' }]}
      >
        <LinearGradient
          colors={finalGradientColors as any}
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

  // Secondary button (ghost style)
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getSizeStyles(size: GradientButtonSize) {
  switch (size) {
    case 'small':
      return {
        container: {
          paddingVertical: 14,
          paddingHorizontal: 24,
        },
        text: {
          fontSize: 15,
        },
      };
    case 'large':
      return {
        container: {
          paddingVertical: 20,
          paddingHorizontal: 36,
        },
        text: {
          fontSize: 18,
        },
      };
    case 'medium':
    default:
      return {
        container: {
          paddingVertical: 18,
          paddingHorizontal: 32,
        },
        text: {
          fontSize: 17,
        },
      };
  }
}

function getVariantStyles(variant: GradientButtonVariant, disabled: boolean): ViewStyle {
  switch (variant) {
    case 'hero':
      return {
        borderRadius: borderRadius.xl,
        ...shadows.coloredLg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      };
    case 'secondary':
      return {
        backgroundColor: 'transparent',
        borderRadius: borderRadius.xl,
        borderWidth: 2,
        borderColor: disabled ? colors.disabled : 'rgba(59, 130, 246, 0.3)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      };
    default:
      return {};
  }
}

function getTextVariantStyles(variant: GradientButtonVariant, disabled: boolean): TextStyle {
  switch (variant) {
    case 'hero':
      return {
        color: colors.textOnGradient,
        fontWeight: '600',
        letterSpacing: 0.5,
      };
    case 'secondary':
      return {
        color: disabled ? colors.disabled : colors.primaryBlue,
        fontWeight: '600',
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

