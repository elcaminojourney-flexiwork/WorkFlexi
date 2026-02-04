import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { supabase } from '../../supabase';

export default function EmployerLayout() {
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
        if (!profile || profile.user_type !== 'employer') {
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
      {/* Employer dashboard */}
      <Stack.Screen name="index" />

      {/* Organisation & Rota Module */}
      <Stack.Screen name="organisation" />
      <Stack.Screen name="rota" />

      {/* Shifts (Gig Marketplace) */}
      <Stack.Screen name="post-shift" />
      <Stack.Screen name="my-shifts" />
      <Stack.Screen name="shift/[shiftId]" />
      <Stack.Screen name="edit-shift" />

      {/* Applications */}
      <Stack.Screen name="applications" />

      {/* Timesheets */}
      <Stack.Screen name="timesheet/[timesheetId]" />
      <Stack.Screen name="timesheet/[timesheetId]/payment-summary" />
      <Stack.Screen name="timesheet/[timesheetId]/invoice" />
      <Stack.Screen name="timesheet/dispute" />
      <Stack.Screen name="timesheet/dispute/[disputeId]" />

      {/* Payments */}
      <Stack.Screen name="payments" />
      <Stack.Screen name="payment/[paymentId]" />

      {/* Profile */}
      <Stack.Screen name="profile" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="worker-profile" />

      {/* Reviews & Favorites */}
      <Stack.Screen name="review-worker/[timesheetId]" />
      <Stack.Screen name="favorites" />
      <Stack.Screen name="my-team" />

      {/* Team Management */}
      <Stack.Screen name="team" />

      {/* Settings */}
      <Stack.Screen name="settings/index" />
      <Stack.Screen name="settings/payment-methods" />
      <Stack.Screen name="settings/notifications" />

      {/* Other */}
      <Stack.Screen name="notifications" />
      <Stack.Screen name="onboarding" />
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

