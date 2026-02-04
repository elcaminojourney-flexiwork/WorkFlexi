/**
 * Unified haptics interface for web and native
 * Automatically uses web fallback on web platform
 */

import { Platform } from 'react-native';
import * as ExpoHaptics from 'expo-haptics';
import { impactAsync as webImpactAsync, ImpactFeedbackStyle as WebImpactStyle, notificationAsync as webNotificationAsync, NotificationFeedbackType as WebNotificationType, selectionAsync as webSelectionAsync } from './webHaptics';

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
 * Impact haptic feedback
 */
export async function impactAsync(style: ImpactFeedbackStyle = ImpactFeedbackStyle.Medium) {
  if (Platform.OS === 'web') {
    return webImpactAsync(style as WebImpactStyle);
  }
  return ExpoHaptics.impactAsync(style as ExpoHaptics.ImpactFeedbackStyle);
}

/**
 * Notification haptic feedback
 */
export async function notificationAsync(type: NotificationFeedbackType) {
  if (Platform.OS === 'web') {
    return webNotificationAsync(type as WebNotificationType);
  }
  return ExpoHaptics.notificationAsync(type as ExpoHaptics.NotificationFeedbackType);
}

/**
 * Selection haptic feedback
 */
export async function selectionAsync() {
  if (Platform.OS === 'web') {
    return webSelectionAsync();
  }
  return ExpoHaptics.selectionAsync();
}
