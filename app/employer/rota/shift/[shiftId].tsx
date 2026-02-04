import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ConstitutionalScreen, { PanelPurple } from '../../../components/ConstitutionalScreen';
import { getRotaShift } from '../../../services/rota';
import { palette, colors, typography, spacing, borderRadius } from '../../../constants/theme';

export default function RotaShiftDetail() {
  const router = useRouter();
  const { shiftId, venueId } = useLocalSearchParams<{ shiftId: string; venueId?: string }>();
  const [loading, setLoading] = useState(true);
  const [shift, setShift] = useState<any>(null);

  useEffect(() => {
    if (shiftId) {
      loadShift();
    } else {
      setLoading(false);
    }
  }, [shiftId]);

  const loadShift = async () => {
    if (!shiftId) return;
    try {
      const result = await getRotaShift(shiftId);
      if (result.error) throw result.error;
      setShift(result.data);
    } catch (e) {
      console.error('Error loading rota shift:', e);
      Alert.alert('Error', 'Failed to load shift');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ConstitutionalScreen title="Shift" showBack onBack={() => router.back()} showLogo theme="light">
        <View style={styles.center}>
          <ActivityIndicator size="large" color={palette.purple[500]} />
          <Text style={styles.loadingText}>Loading shift...</Text>
        </View>
      </ConstitutionalScreen>
    );
  }

  if (!shift) {
    return (
      <ConstitutionalScreen title="Shift" showBack onBack={() => router.back()} showLogo theme="light">
        <View style={styles.center}>
          <Text style={styles.emptyText}>Shift not found.</Text>
          <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
            <Text style={styles.backLinkText}>Back to Rota</Text>
          </TouchableOpacity>
        </View>
      </ConstitutionalScreen>
    );
  }

  const role = shift.role || {};
  const allocations = shift.allocations || [];
  const invites = shift.invites || [];

  return (
    <ConstitutionalScreen title={role.name || 'Shift'} showBack onBack={() => router.back()} showLogo theme="light">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <PanelPurple style={styles.card}>
          <Text style={styles.cardTitle}>Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Role</Text>
            <Text style={styles.value}>{role.name || '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{shift.shift_date || '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Time</Text>
            <Text style={styles.value}>
              {shift.start_time?.substring(0, 5)} – {shift.end_time?.substring(0, 5)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Staff</Text>
            <Text style={styles.value}>
              {allocations.filter((a: any) => !['cancelled', 'swapped_out'].includes(a.status)).length} / {shift.headcount_needed || 1}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>{shift.status || '—'}</Text>
          </View>
          {shift.notes ? (
            <View style={styles.row}>
              <Text style={styles.label}>Notes</Text>
              <Text style={styles.value}>{shift.notes}</Text>
            </View>
          ) : null}
        </PanelPurple>

        {allocations.length > 0 && (
          <PanelPurple style={styles.card}>
            <Text style={styles.cardTitle}>Allocated</Text>
            {allocations
              .filter((a: any) => !['cancelled', 'swapped_out'].includes(a.status))
              .map((a: any) => (
                <View key={a.id} style={styles.memberRow}>
                  <Ionicons name="person" size={18} color={palette.purple[600]} />
                  <Text style={styles.memberName}>{a.team_member?.full_name || 'Team member'}</Text>
                  <Text style={styles.memberStatus}>{a.status}</Text>
                </View>
              ))}
          </PanelPurple>
        )}

        {invites.filter((i: any) => i.status === 'pending').length > 0 && (
          <PanelPurple style={styles.card}>
            <Text style={styles.cardTitle}>Pending invites</Text>
            {invites
              .filter((i: any) => i.status === 'pending')
              .map((i: any) => (
                <View key={i.id} style={styles.memberRow}>
                  <Ionicons name="mail-outline" size={18} color={palette.gray[500]} />
                  <Text style={styles.memberName}>{i.team_member?.full_name || 'Invited'}</Text>
                </View>
              ))}
          </PanelPurple>
        )}

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color={palette.purple[600]} />
          <Text style={styles.backButtonText}>Back to Rota</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </ConstitutionalScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  loadingText: { marginTop: spacing.md, color: colors.textSecondary },
  emptyText: { fontSize: typography.sizes.body, color: colors.textSecondary, marginBottom: spacing.md },
  backLink: { paddingVertical: spacing.sm },
  backLinkText: { fontSize: typography.sizes.body, color: palette.purple[600], fontWeight: typography.weights.semibold },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg },
  card: { marginBottom: spacing.lg },
  cardTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: colors.textPrimary, marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  label: { fontSize: typography.sizes.body, color: colors.textSecondary },
  value: { fontSize: typography.sizes.body, fontWeight: typography.weights.medium, color: colors.textPrimary },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.sm },
  memberName: { flex: 1, fontSize: typography.sizes.body, color: colors.textPrimary },
  memberStatus: { fontSize: typography.sizes.caption, color: colors.textSecondary, textTransform: 'capitalize' },
  backButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  backButtonText: { fontSize: typography.sizes.body, color: palette.purple[600], fontWeight: typography.weights.semibold },
});
