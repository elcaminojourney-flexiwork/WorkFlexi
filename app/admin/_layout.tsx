import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      {/* Revenue Overview */}
      <Stack.Screen name="revenue" />
      {/* Admin Login */}
      <Stack.Screen name="login" />
      {/* Profile Selector */}
      <Stack.Screen name="profile-selector" />
      {/* Manage Profile */}
      <Stack.Screen name="manage-profile" />
    </Stack>
  );
}

