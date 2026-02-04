import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../../supabase';
import ConstitutionalScreen, { PanelPurple } from '../../../../components/ConstitutionalScreen';

type Dispute = {
  id: string;
  timesheet_id: string;
  raised_by: string;
  dispute_type: string;
  reason: string | null;
  resolution_notes: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
};


// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function DisputeDetails() {
  const { disputeId, from } = useLocalSearchParams<{ disputeId?: string; from?: string }>();
  const router = useRouter();

  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'open' | 'resolved' | string>('open');

  const normalisedDisputeId =
    Array.isArray(disputeId) ? disputeId[0] : disputeId;

  useEffect(() => {
    if (!normalisedDisputeId) return;

    const fetchDispute = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('disputes')
          .select('*')
          .eq('id', normalisedDisputeId)
          .single();

        if (error) {
          console.log('Fetch dispute error:', error);
          Alert.alert(
            'Error',
            error.message || 'Could not load dispute details.'
          );
          return;
        }

        const d = data as Dispute;
        setDispute(d);
        setNotes(d.resolution_notes || '');
        setStatus((d.status as 'open' | 'resolved') || 'open');
      } catch (err: any) {
        console.log('Fetch dispute catch error:', err);
        Alert.alert(
          'Error',
          err?.message || 'Could not load dispute details.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDispute();
  }, [normalisedDisputeId]);

  const handleSave = async () => {
    if (!normalisedDisputeId) return;

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('disputes')
        .update({
          resolution_notes: notes.trim(),
          status, // keep whatever status is currently set
        })
        .eq('id', normalisedDisputeId)
        .select('*')
        .single();

      if (error) {
        console.log('Update dispute error:', error);
        Alert.alert(
          'Error',
          error.message || 'Could not update dispute.'
        );
        return;
      }

      setDispute(data as Dispute);
      Alert.alert('Saved', 'Dispute has been updated.');
    } catch (err: any) {
      console.log('Update dispute catch error:', err);
      Alert.alert(
        'Error',
        err?.message || 'Could not update dispute.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleResolve = async () => {
    if (!normalisedDisputeId) return;

    if (status === 'resolved') {
      Alert.alert('Already resolved', 'This dispute is already marked as resolved.');
      return;
    }

    try {
      setResolving(true);

      // 1) Get the current user – this will be stored in resolved_by
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData?.user) {
        console.log('getUser error or no user (resolve):', userError);
        Alert.alert(
          'Error',
          'We could not identify your account. Please log in again and try resolving the dispute once more.'
        );
        return;
      }

      const adminId = userData.user.id;
      const now = new Date().toISOString();

      // 2) Update dispute as resolved, with who resolved it
      const { data, error } = await supabase
        .from('disputes')
        .update({
          status: 'resolved',
          resolved_at: now,
          resolved_by: adminId,
          resolution_notes: notes.trim(),
        })
        .eq('id', normalisedDisputeId)
        .select('*')
        .single();

      if (error) {
        console.log('Resolve dispute error:', error);
        Alert.alert(
          'Error',
          error.message || 'Could not resolve dispute.'
        );
        return;
      }

      const updated = data as Dispute;
      setDispute(updated);
      setStatus('resolved');
      setNotes(updated.resolution_notes || notes.trim());

      Alert.alert('Resolved', 'This dispute has been marked as resolved.');
    } catch (err: any) {
      console.log('Resolve dispute catch error:', err);
      Alert.alert(
        'Error',
        err?.message || 'Could not resolve dispute.'
      );
    } finally {
      setResolving(false);
    }
  };

  const prettyType = (type: string) => {
    switch (type) {
      case 'hours':
        return 'Hours / clock-in issue';
      case 'no_show':
        return 'No-show / left early';
      case 'quality':
        return 'Behaviour / quality issue';
      case 'payment':
        return 'Payment / billing issue';
      case 'other':
      default:
        return 'Other';
    }
  };

  const prettyStatus = (value: string) => {
    if (value === 'resolved') return 'Resolved';
    return 'Open';
  };

  const handleBack = () => {
    if (from && typeof from === 'string') {
      router.replace(from as any);
    } else {
      router.back();
    }
  };

  if (loading) {
    return (
      <ConstitutionalScreen title="Dispute details" showBack onBack={handleBack} showLogo theme="light">
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" />
        </View>
      </ConstitutionalScreen>
    );
  }

  if (!dispute) {
    return (
      <ConstitutionalScreen title="Dispute details" showBack onBack={handleBack} showLogo theme="light">
        <View style={styles.centerContent}>
          <Text style={{ color: '#111827' }}>Dispute not found.</Text>
        </View>
      </ConstitutionalScreen>
    );
  }

  return (
    <ConstitutionalScreen title="Dispute details" showBack onBack={handleBack} showLogo theme="light">
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <PanelPurple style={{ marginBottom: 12 }}>
          <Text style={styles.cardTitleBold}>Dispute info</Text>
            <Text style={styles.rowLabel}>Type</Text>
            <Text style={styles.rowValue}>{prettyType(dispute.dispute_type)}</Text>

            <Text style={styles.rowLabel}>Status</Text>
            <Chip
              mode="flat"
              style={{
                backgroundColor: status === 'resolved' ? '#7C3AED' : '#8B5CF6',
                alignSelf: 'flex-start',
                marginTop: 4,
              }}
              textStyle={{
                color: '#FFFFFF',
                fontSize: 12,
                fontWeight: '600',
              }}
            >
              {prettyStatus(status)}
            </Chip>

            <Text style={styles.rowLabel}>Original reason</Text>
            <Text style={styles.rowValue}>{dispute.reason || '—'}</Text>

            <Text style={styles.rowLabel}>Created at</Text>
            <Text style={styles.rowValue}>
              {new Date(dispute.created_at).toLocaleString()}
            </Text>

            {dispute.resolved_at && (
              <>
                <Text style={styles.rowLabel}>Resolved at</Text>
                <Text style={styles.rowValue}>
                  {new Date(dispute.resolved_at).toLocaleString()}
                </Text>
              </>
            )}
        </PanelPurple>

        <PanelPurple style={{ marginBottom: 12 }}>
          <Text style={styles.cardTitleBold}>Resolution notes</Text>
            <Text style={styles.subText}>
              Add or update your internal notes about how this dispute was handled.
            </Text>
            <TextInput
              style={styles.textArea}
              value={notes}
              onChangeText={setNotes}
              placeholder="Example: Spoke with worker and adjusted billable hours."
              multiline
              numberOfLines={4}
            />
        </PanelPurple>

        <TouchableOpacity
          style={[
            styles.saveButton,
            saving && { opacity: 0.7 },
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          <Ionicons name="save-outline" size={18} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving…' : 'Save changes'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.resolveButton,
            status === 'resolved' && { opacity: 0.7 },
            resolving && { opacity: 0.7 },
          ]}
          onPress={handleResolve}
          disabled={resolving || status === 'resolved'}
        >
          <Ionicons name="checkmark-done-outline" size={18} color="#FFFFFF" />
          <Text style={styles.resolveButtonText}>
            {status === 'resolved'
              ? 'Dispute resolved'
              : resolving
              ? 'Resolving…'
              : 'Mark as resolved'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </ConstitutionalScreen>
  );
}

const styles = StyleSheet.create({

  logoBox: { position: 'absolute', top: Platform.OS === 'web' ? 16 : 52, left: 16, zIndex: 1000, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, padding: 8, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  logo: { width: 32, height: 32 },

  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  cardTitleBold: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 8,
  },
  rowValue: {
    fontSize: 14,
    color: '#111827',
  },
  textArea: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 10,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#111827',
    backgroundColor: 'transparent',
  },
  saveButton: {
    marginTop: 8,
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  resolveButton: {
    marginTop: 8,
    backgroundColor: '#7C3AED',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resolveButtonText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusPill: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    overflow: 'hidden',
  },
  statusOpen: {
    backgroundColor: '#8B5CF6',
  },
  statusResolved: {
    backgroundColor: '#7C3AED',
  },
});
