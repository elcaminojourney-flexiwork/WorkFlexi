// Team member detail – employer/rota/team/[id]
// Cél: a listából router.push(`/employer/rota/team/${member.id}?organisationId=...`) ne 404-oljon.
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../../supabase';
import { palette, colors, typography, spacing } from '../../../../constants/theme';
import ConstitutionalScreen from '../../../../components/ConstitutionalScreen';

export default function TeamMemberDetailScreen() {
  const router = useRouter();
  const { id, organisationId } = useLocalSearchParams<{ id: string; organisationId?: string }>();
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const result = await supabase
          .from('team_members')
          .select('id, full_name, email, phone, status, employment_type, created_at')
          .eq('id', id)
          .single();
        if (result.error) throw result.error;
        setMember(result.data);
      } catch (e) {
        console.error(e);
        Alert.alert('Hiba', 'A tag adatai nem tölthetők.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <ConstitutionalScreen title="Tag adatai" showBack onBack={() => router.back()} showLogo theme="light">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={palette.purple[500]} />
          <Text style={styles.loadingText}>Betöltés...</Text>
        </View>
      </ConstitutionalScreen>
    );
  }

  if (!member) {
    return (
      <ConstitutionalScreen title="Tag adatai" showBack onBack={() => router.back()} showLogo theme="light">
        <View style={styles.centered}>
          <Text style={styles.empty}>Nem található tag.</Text>
        </View>
      </ConstitutionalScreen>
    );
  }

  return (
    <ConstitutionalScreen title={member.full_name || 'Tag adatai'} showBack onBack={() => router.back()} showLogo theme="light">
      <View style={styles.block}>
        <Text style={styles.label}>Státusz</Text>
        <Text style={styles.value}>{member.status ?? '–'}</Text>
      </View>
      <View style={styles.block}>
        <Text style={styles.label}>Foglalkoztatás</Text>
        <Text style={styles.value}>{member.employment_type === 'full_time' ? 'Teljes állás' : member.employment_type === 'part_time' ? 'Részállás' : member.employment_type ?? '–'}</Text>
      </View>
      {member.email ? (
        <View style={styles.block}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{member.email}</Text>
        </View>
      ) : null}
      {member.phone ? (
        <View style={styles.block}>
          <Text style={styles.label}>Telefon</Text>
          <Text style={styles.value}>{member.phone}</Text>
        </View>
      ) : null}
    </ConstitutionalScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  loadingText: { marginTop: spacing.md, color: colors.textSecondary },
  empty: { color: colors.textSecondary, fontSize: typography.sizes.body },
  block: { marginBottom: spacing.lg },
  label: { fontSize: typography.sizes.caption, color: colors.textTertiary, marginBottom: 4 },
  value: { fontSize: typography.sizes.body, color: colors.textPrimary, fontWeight: typography.weights.medium },
});
