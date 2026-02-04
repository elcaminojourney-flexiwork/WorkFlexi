import { Stack } from 'expo-router';

export default function RotaLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="add-shift" />
      <Stack.Screen name="shift/[shiftId]" />
      <Stack.Screen name="team" />
      <Stack.Screen name="swaps" />
      <Stack.Screen name="timekeeping" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
