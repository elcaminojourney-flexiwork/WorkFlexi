/**
 * Web fallback for expo-haptics
 * Provides haptic-like feedback using CSS animations and visual feedback
 */

import { Platform } from 'react-native';

export enum ImpactFeedbackStyle {
  Light = 'light',
  Medium = 'medium',
  Heavy = 'heavy',
}

export enum NotificationFeedbackType {
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
}

/**
 * Web implementation of haptic feedback
 * Uses visual feedback and optional vibration API
 */
export async function impactAsync(style: ImpactFeedbackStyle = ImpactFeedbackStyle.Medium) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  // Use Vibration API if available (mobile browsers)
  if ('vibrate' in navigator) {
    const patterns = {
      [ImpactFeedbackStyle.Light]: 10,
      [ImpactFeedbackStyle.Medium]: 20,
      [ImpactFeedbackStyle.Heavy]: 30,
    };
    navigator.vibrate(patterns[style]);
  }

  // Add visual feedback via CSS class
  const body = document.body;
  const intensity = {
    [ImpactFeedbackStyle.Light]: 'haptic-light',
    [ImpactFeedbackStyle.Medium]: 'haptic-medium',
    [ImpactFeedbackStyle.Heavy]: 'haptic-heavy',
  };

  body.classList.add(intensity[style]);
  setTimeout(() => {
    body.classList.remove(intensity[style]);
  }, 100);
}

export async function notificationAsync(type: NotificationFeedbackType) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  if ('vibrate' in navigator) {
    const patterns = {
      [NotificationFeedbackType.Success]: [10, 50, 10],
      [NotificationFeedbackType.Warning]: [20, 50, 20],
      [NotificationFeedbackType.Error]: [30, 50, 30, 50, 30],
    };
    navigator.vibrate(patterns[type]);
  }
}

export async function selectionAsync() {
  return impactAsync(ImpactFeedbackStyle.Light);
}
