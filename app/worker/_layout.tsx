import { Stack } from 'expo-router';

export default function WorkerLayout() {
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
