/**
 * React Native Paper Theme Configuration
 * 
 * Material Design 3 themes for FlexiWork
 * Purple/Blue color scheme (45% purple, 35% blue, 20% neutral)
 */

import { MD3LightTheme } from 'react-native-paper';

// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF',
  purple100: '#F3E8FF',
  purple200: '#E9D5FF',
  purple500: '#A855F7',
  purple600: '#9333EA',
  purple700: '#7C3AED',
  blue50: '#EFF6FF',
  blue100: '#DBEAFE',
  blue500: '#3B82F6',
  blue600: '#2563EB',
  blue700: '#1D4ED8',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray500: '#6B7280',
  gray900: '#111827',
  white: '#FFFFFF',
};

export const workerTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: COLORS.blue600,
    secondary: COLORS.purple600,
    tertiary: COLORS.purple500,
    background: COLORS.gray50,
    surface: COLORS.white,
    surfaceVariant: COLORS.blue50,
    error: COLORS.purple700,
    success: COLORS.blue500,
    warning: COLORS.purple500,
    onPrimary: COLORS.white,
    onSecondary: COLORS.white,
    onSurface: COLORS.gray900,
    onSurfaceVariant: COLORS.gray500,
  },
};

export const employerTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: COLORS.purple600,
    secondary: COLORS.blue600,
    tertiary: COLORS.purple500,
    background: COLORS.purple50,
    surface: COLORS.white,
    surfaceVariant: COLORS.purple100,
    error: COLORS.purple700,
    success: COLORS.blue500,
    warning: COLORS.purple500,
    onPrimary: COLORS.white,
    onSecondary: COLORS.white,
    onSurface: COLORS.gray900,
    onSurfaceVariant: COLORS.gray500,
  },
};

export const defaultTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: COLORS.purple600,
    secondary: COLORS.blue600,
    tertiary: COLORS.purple500,
    error: COLORS.purple700,
    success: COLORS.blue500,
    warning: COLORS.purple500,
    background: COLORS.gray50,
    surface: COLORS.white,
    surfaceVariant: COLORS.purple50,
    onPrimary: COLORS.white,
    onSecondary: COLORS.white,
    onSurface: COLORS.gray900,
    onSurfaceVariant: COLORS.gray500,
  },
};
