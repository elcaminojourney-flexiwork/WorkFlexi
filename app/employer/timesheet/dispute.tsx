import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
ImageBackground, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase';


// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function DisputeTimesheet() {
  const { timesheetId } = useLocalSearchParams();
  const router = useRouter();

  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [explanation, setExplanation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // UI labels
  const reasons = [
    'Worker did not show up / left early',
    'Worker behaviour or performance issue',
    'Clock-in / clock-out does not match reality',
    'Other',
  ];

  const handleSubmit = async () => {
    // Normalise id (Expo Router can give an array)
    const id = Array.isArray(timesheetId) ? timesheetId[0] : timesheetId;

    if (!id) {
      Alert.alert('Error', 'Missing timesheet id.');
      return;
    }

    if (!selectedReason) {
      Alert.alert('Missing info', 'Please select a reason for the dispute.');
      return;
    }

    if (!explanation.trim()) {
      Alert.alert(
        'Missing info',
        'Please add a short explanation so our team can review.'
      );
      return;
    }

    // Map pretty text → allowed dispute_type codes:
    // 'hours', 'no_show', 'quality', 'payment', 'other'
    let disputeType: 'hours' | 'no_show' | 'quality' | 'payment' | 'other';

    if (selectedReason === 'Worker did not show up / left early') {
      disputeType = 'no_show';
    } else if (selectedReason === 'Worker behaviour or performance issue') {
      disputeType = 'quality';
    } else if (selectedReason === 'Clock-in / clock-out does not match reality') {
      disputeType = 'hours';
    } else {
      disputeType = 'other';
    }

    try {
      setSubmitting(true);

      // 1) Get current user — needed for raised_by
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData?.user) {
        console.log('getUser error or no user:', userError);
        Alert.alert(
          'Error',
          'We could not identify your account. Please log in again and try disputing the timesheet once more.'
        );
        return;
      }

      const raisedBy = userData.user.id;

      console.log('Submitting dispute with payload:', {
        timesheetId: id,
        selectedReason,
        disputeType,
        explanation: explanation.trim(),
        raisedBy,
      });

      // 1a) Get timesheet to find shift_id
      const { data: timesheetData, error: tsLoadError } = await supabase
        .from('timesheets')
        .select('shift_id')
        .eq('id', id)
        .single();

      if (tsLoadError || !timesheetData?.shift_id) {
        console.log('Failed to load timesheet for shift_id:', tsLoadError);
        Alert.alert(
          'Error',
          'Could not find the timesheet. Please try again.'
        );
        return;
      }

      const shiftId = timesheetData.shift_id;

      // 2) Insert into disputes (no shift_id column - disputes table only has timesheet_id)
      const { error: disputeError } = await supabase.from('disputes').insert({
        timesheet_id: id,
        raised_by: raisedBy,
        dispute_type: disputeType,
        reason: selectedReason,
        resolution_notes: explanation.trim(),
        status: 'open',
      });

      if (disputeError) {
        console.log('Disputes insert error:', disputeError);
        Alert.alert(
          'Database error (disputes)',
          disputeError.message || 'Could not create dispute record.'
        );
        return;
      }

      // 3) Update timesheet flags
      const { error: timesheetError } = await supabase
        .from('timesheets')
        .update({
          dispute_raised: true,
          employer_confirmed: false,
          dispute_reason: selectedReason,
          dispute_notes: explanation.trim(),
        })
        .eq('id', id);

      if (timesheetError) {
        console.log('Timesheet dispute update error:', timesheetError);
        Alert.alert(
          'Database error (timesheets)',
          timesheetError.message || 'Could not update timesheet.'
        );
        return;
      }

      // Note: Disputes do NOT change shift status
      // Shift should already be 'in_progress' when dispute is raised (worker has clocked in)
      // Status stays 'in_progress' even with active dispute until employer confirms & pays

      Alert.alert(
        'Dispute submitted',
        'We have marked this timesheet as disputed and will review it.',
        [
          {
            text: 'OK',
            // 🔴 IMPORTANT CHANGE: force reload of timesheet screen
            onPress: () => router.replace(`/employer/timesheet/${id}`),
          },
        ]
      );
    } catch (err: any) {
      console.log('Dispute submit error (catch):', err);
      Alert.alert(
        'Error',
        err?.message || 'Unable to submit dispute right now. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => {
            if (from && typeof from === 'string') {
              router.replace(from as any);
            } else if (timesheetId) {
              router.replace(`/employer/timesheet/${timesheetId}`);
            } else {
              router.replace('/employer/my-shifts');
            }
          }}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dispute timesheet</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Card mode="elevated" style={{ marginBottom: 12 }}>
          <Card.Content>
            <Text style={styles.title}>Why are you disputing this timesheet?</Text>
            <Text style={styles.subText}>
              Payment will be held until our team reviews this case. Workers cannot
              have their hours reduced, but we can help resolve serious issues.
            </Text>

            <Text style={styles.sectionLabel}>Select a reason</Text>

            {reasons.map((reason) => {
              const selected = selectedReason === reason;
              return (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.reasonRow,
                    selected && styles.reasonRowSelected,
                  ]}
                  onPress={() => setSelectedReason(reason)}
                >
                  <View
                    style={[
                      styles.radioOuter,
                      selected && styles.radioOuterSelected,
                    ]}
                  >
                    {selected && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.reasonText}>{reason}</Text>
                </TouchableOpacity>
              );
            })}

            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
              Add a short explanation <Text style={{ color: '#6D28D9' }}>*</Text>
            </Text>

            <TextInput
              style={styles.textArea}
              value={explanation}
              onChangeText={setExplanation}
              placeholder="Example: Worker arrived 40 minutes late and did not complete closing tasks."
              multiline
              numberOfLines={4}
            />
          </Card.Content>
        </Card>

        <TouchableOpacity
          style={[
            styles.submitButton,
            submitting && { opacity: 0.7 },
          ]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Ionicons name="alert-circle" size={18} color="#FFFFFF" />
          <Text style={styles.submitButtonText}>
            {submitting ? 'Submitting…' : 'Submit dispute'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
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
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 999,
    marginBottom: 8,
  },
  reasonRowSelected: {
    backgroundColor: '#F3E8FF',
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioOuterSelected: {
    borderColor: '#8B5CF6',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#8B5CF6',
  },
  reasonText: {
    fontSize: 14,
    color: '#111827',
    flexShrink: 1,
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
  submitButton: {
    marginTop: 8,
    backgroundColor: '#6D28D9',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
