/**
 * Modern Status Badge Component
 * 
 * Pill-style status indicators with tinted backgrounds.
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, typography, spacing, borderRadius, statusBadgeStyles } from '../../constants/theme';

export type StatusType = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface StatusBadgeProps {
  status: StatusType;
  text: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

/**
 * Status Badge Component
 * 
 * Modern pill-style badge with tinted background
 */
export function StatusBadge({
  status,
  text,
  style,
  textStyle,
}: StatusBadgeProps) {
  const statusConfig = getStatusConfig(status);

  return (
    <View style={[statusBadgeStyles.container, statusConfig.container, style]}>
      <Text style={[statusBadgeStyles.text, statusConfig.text, textStyle]}>
        {text}
      </Text>
    </View>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStatusConfig(status: StatusType) {
  switch (status) {
    case 'success':
      return {
        container: {
          backgroundColor: colors.success.light,
          borderColor: 'rgba(16, 185, 129, 0.3)',
        },
        text: {
          color: colors.success.text,
        },
      };
    case 'warning':
      return {
        container: {
          backgroundColor: colors.warning.light,
          borderColor: 'rgba(245, 158, 11, 0.3)',
        },
        text: {
          color: colors.warning.text,
        },
      };
    case 'error':
      return {
        container: {
          backgroundColor: colors.error.light,
          borderColor: 'rgba(239, 68, 68, 0.3)',
        },
        text: {
          color: colors.error.text,
        },
      };
    case 'info':
      return {
        container: {
          backgroundColor: colors.info.light,
          borderColor: 'rgba(59, 130, 246, 0.3)',
        },
        text: {
          color: colors.info.text,
        },
      };
    case 'neutral':
    default:
      return {
        container: {
          backgroundColor: 'rgba(148, 163, 184, 0.1)',
          borderColor: 'rgba(148, 163, 184, 0.3)',
        },
        text: {
          color: colors.textSecondary,
        },
      };
  }
}

