import { Link, Stack } from 'expo-router';
import { StyleSheet, ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';


// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <ThemedView style={styles.container}>
        <ThemedText type="title">This screen does not exist.</ThemedText>
        <Link href="/" style={styles.link}>
          <ThemedText type="link">Go to home screen!</ThemedText>
        </Link>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({

  logoBox: { position: 'absolute', top: Platform.OS === 'web' ? 16 : 52, left: 16, zIndex: 1000, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, padding: 8, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  logo: { width: 32, height: 32 },

  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
