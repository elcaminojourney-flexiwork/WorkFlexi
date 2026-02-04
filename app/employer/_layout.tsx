import { Stack } from 'expo-router';

export default function EmployerLayout() {
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

