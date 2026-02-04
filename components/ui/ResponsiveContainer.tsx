/**
 * Responsive Container Component
 * 
 * Automatically adjusts layout based on screen size
 */

import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { getResponsiveContainerStyle, getDeviceType } from '../../constants/responsive';

export interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  fullWidthOnMobile?: boolean;
}

export function ResponsiveContainer({
  children,
  style,
  fullWidthOnMobile = true,
}: ResponsiveContainerProps) {
  const deviceType = getDeviceType();
  const containerStyle = getResponsiveContainerStyle();

  const combinedStyle: ViewStyle = {
    ...containerStyle,
    ...(fullWidthOnMobile && deviceType === 'mobile' && { width: '100%' }),
    ...style,
  };

  return <View style={combinedStyle}>{children}</View>;
}

