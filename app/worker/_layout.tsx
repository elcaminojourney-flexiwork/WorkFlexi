import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { supabase } from '../../supabase';

export default function WorkerLayout() {
  const router = useRouter();
  const [guardReady, setGuardReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!session?.user) {
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.location.href = '/auth/select-user-type';
          } else {
            router.replace('/auth/select-user-type');
          }
          setGuardReady(true);
          setAuthorized(false);
          return;
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', session.user.id)
          .single();
        if (cancelled) return;
        if (!profile || profile.user_type !== 'worker') {
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.location.href = '/auth/select-user-type';
          } else {
            router.replace('/auth/select-user-type');
          }
          setGuardReady(true);
          setAuthorized(false);
          return;
        }
        setGuardReady(true);
        setAuthorized(true);
      } catch {
        if (!cancelled) {
          setGuardReady(true);
          setAuthorized(false);
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.location.href = '/auth/select-user-type';
          } else {
            router.replace('/auth/select-user-type');
          }
        }
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  if (!guardReady || !authorized) {
    return (
      <View style={styles.guard}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.guardText}>Checking access...</Text>
      </View>
    );
  }

  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      {/* Worker dashboard */}
      <Stack.Screen name="index" />

      {/* Browse + shift details */}
      <Stack.Screen name="browse-shifts" />
      <Stack.Screen name="shift/[shiftId]" />

      {/* My Shifts & Applications */}
      <Stack.Screen name="my-shifts" />
      <Stack.Screen name="applications" />
      <Stack.Screen name="calendar" />

      {/* Worker profile screens */}
      <Stack.Screen name="profile" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="settings" />

      {/* Earnings */}
      <Stack.Screen name="earnings" />
      <Stack.Screen name="earning/[paymentId]" />
      <Stack.Screen name="timesheet/[timesheetId]/earning" />

      {/* Onboarding */}
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="employee-onboarding" />
      <Stack.Screen name="kyc-upgrade" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  guard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  guardText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
});
