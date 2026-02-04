/**
 * Modern Input Component
 * 
 * Text input with focus animations and modern styling.
 * Supports icons and error states.
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows, inputStyles } from '../../constants/theme';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  containerStyle?: ViewStyle;
}

/**
 * Modern Text Input Component
 */
export function Input({
  label,
  error,
  icon,
  iconPosition = 'left',
  containerStyle,
  style,
  ...textInputProps
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const inputContainerStyle: ViewStyle[] = [
    inputStyles.container,
    icon && inputStyles.withIcon,
    isFocused && inputStyles.focus,
    error && inputStyles.error,
    containerStyle,
  ];

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={inputContainerStyle}>
        {icon && iconPosition === 'left' && (
          <View style={inputStyles.iconContainer}>
            <Ionicons
              name={icon}
              size={20}
              color={isFocused ? colors.primaryBlue : colors.textTertiary}
            />
          </View>
        )}
        
        <TextInput
          {...textInputProps}
          style={[inputStyles.text, style]}
          placeholderTextColor={colors.textTertiary}
          onFocus={(e) => {
            setIsFocused(true);
            textInputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            textInputProps.onBlur?.(e);
          }}
        />
        
        {icon && iconPosition === 'right' && (
          <View style={inputStyles.iconContainer}>
            <Ionicons
              name={icon}
              size={20}
              color={isFocused ? colors.primaryBlue : colors.textTertiary}
            />
          </View>
        )}
      </View>
      
      {error && <Text style={[inputStyles.errorText, styles.errorText]}>{error}</Text>}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.bodySm.fontSize,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  errorText: {
    marginTop: spacing.xs,
  },
});

