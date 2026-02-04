/**
 * Responsive Design Utilities
 * 
 * Provides breakpoints and responsive helpers for different screen sizes
 */

import { Dimensions } from 'react-native';

// Breakpoints
export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1440,
};

// Get current screen dimensions
export const getScreenDimensions = () => {
  const { width, height } = Dimensions.get('window');
  return { width, height };
};

// Device type detection
export const getDeviceType = () => {
  const { width } = Dimensions.get('window');
  
  if (width <= BREAKPOINTS.mobile) {
    return 'mobile';
  } else if (width <= BREAKPOINTS.tablet) {
    return 'tablet';
  } else {
    return 'desktop';
  }
};

// Boolean helpers
export const isMobile = () => {
  const { width } = Dimensions.get('window');
  return width <= BREAKPOINTS.mobile;
};

export const isTablet = () => {
  const { width } = Dimensions.get('window');
  return width > BREAKPOINTS.mobile && width <= BREAKPOINTS.tablet;
};

export const isDesktop = () => {
  const { width } = Dimensions.get('window');
  return width > BREAKPOINTS.tablet;
};

// Responsive value helper
// Usage: responsive({ mobile: 16, tablet: 24, desktop: 32 })
export const responsive = <T>(values: {
  mobile?: T;
  tablet?: T;
  desktop?: T;
}): T => {
  const deviceType = getDeviceType();
  return values[deviceType] ?? values.mobile ?? values.tablet ?? values.desktop!;
};

// Responsive container styles
export const getResponsiveContainerStyle = () => {
  const deviceType = getDeviceType();
  
  if (deviceType === 'desktop') {
    return {
      width: '60%',
      maxWidth: 1200,
      marginHorizontal: 'auto' as const,
    };
  } else if (deviceType === 'tablet') {
    return {
      width: '90%',
      maxWidth: 900,
      marginHorizontal: 'auto' as const,
    };
  } else {
    return {
      width: '100%',
      marginHorizontal: 0,
    };
  }
};

// Responsive padding
export const getResponsivePadding = () => {
  return responsive({
    mobile: 16,
    tablet: 24,
    desktop: 32,
  });
};

// Responsive font sizes
export const getResponsiveFontSize = (baseSize: number) => {
  return responsive({
    mobile: baseSize,
    tablet: baseSize * 1.1,
    desktop: baseSize * 1.2,
  });
};

// Responsive grid columns
export const getResponsiveColumns = () => {
  return responsive({
    mobile: 1,
    tablet: 2,
    desktop: 3,
  });
};

// Responsive spacing multiplier
export const getResponsiveSpacing = (baseSpacing: number) => {
  return responsive({
    mobile: baseSpacing,
    tablet: baseSpacing * 1.25,
    desktop: baseSpacing * 1.5,
  });
};

