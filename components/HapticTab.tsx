import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { impactAsync, ImpactFeedbackStyle } from '@/utils/webHaptics';

export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      onPressIn={async (ev) => {
        // Add haptic feedback
        if (Platform.OS === 'web') {
          // Web fallback
          await impactAsync(ImpactFeedbackStyle.Light);
        } else if (process.env.EXPO_OS === 'ios') {
          // Native iOS
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
