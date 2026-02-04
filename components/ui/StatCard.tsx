/**
 * Stat Card Component
 * 
 * Dashboard stat cards with gradient icon backgrounds.
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows, statCardStyles, gradients } from '../../constants/theme';

export interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  gradientColors?: string[];
  userType?: 'worker' | 'employer';
  style?: ViewStyle;
  onPress?: () => void;
}

/**
 * Stat Card Component
 * 
 * Dashboard stat card with gradient icon and value display
 */
export function StatCard({
  icon,
  value,
  label,
  gradientColors,
  userType,
  style,
  onPress,
}: StatCardProps) {
  // Determine gradient colors
  let finalGradientColors = gradientColors || gradients.primary;
  if (userType === 'employer') {
    finalGradientColors = gradients.employer;
  } else if (userType === 'worker') {
    finalGradientColors = gradients.worker;
  }

  const content = (
    <View style={[statCardStyles.container, style]}>
      <View style={[statCardStyles.iconContainer, { overflow: 'hidden' }]}>
        <LinearGradient
          colors={finalGradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Ionicons name={icon} size={28} color={colors.textOnGradient} />
      </View>
      
      <Text style={statCardStyles.number}>{value}</Text>
      <Text style={statCardStyles.label}>{label}</Text>
    </View>
  );

  if (onPress) {
    const { TouchableOpacity } = require('react-native');
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

