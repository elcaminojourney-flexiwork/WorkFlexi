import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ConstitutionalScreen from '../../../components/ConstitutionalScreen';

export default function RotaSettings() {
  const router = useRouter();
  const { venueId } = useLocalSearchParams<{ venueId?: string }>();

  return (
    <ConstitutionalScreen
      title="Rota Settings"
      showBack
      onBack={() => router.back()}
      showLogo
      theme="light"
    >
      <View style={styles.content}>
        <Text style={styles.title}>Venue settings</Text>
        <Text style={styles.subtitle}>
          Configure roles, default times, and notifications for this venue. Full settings coming soon.
        </Text>
        {venueId ? (
          <Text style={styles.hint}>Venue ID: {venueId}</Text>
        ) : null}
      </View>
    </ConstitutionalScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6B7280', lineHeight: 24 },
  hint: { marginTop: 16, fontSize: 14, color: '#9CA3AF' },
});
