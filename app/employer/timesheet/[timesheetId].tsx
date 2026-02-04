import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { createNotification } from '../../../services/notifications';
import { supabase } from '../../../supabase';
import ConstitutionalScreen, { PanelPurple } from '../../../components/ConstitutionalScreen';

type Timesheet = {
  id: string;
  shift_id: string;
  worker_id: string;
  application_id: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  break_duration_minutes: number | null;
  total_minutes: number | null;
  billable_minutes: number | null;
  total_hours: number | null;
  regular_hours: number | null;
  overtime_hours: number | null;
  clock_in_confirmed_by_employer: boolean | null;
  clock_out_confirmed_by_employer: boolean | null;
  employer_confirmed: boolean | null;
  worker_confirmed: boolean | null;
  dispute_raised: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  // optional extra fields if they exist in DB
  dispute_reason?: string | null;
  dispute_notes?: string | null;
};

type WorkerProfile = {
  id: string;
  full_name: string | null;
};

type ShiftSummary = {
  id: string;
  job_title: string | null;
  shift_date: string | null;
  start_time: string | null;
  end_time: string | null;
  hourly_rate: number | null;
  overtime_multiplier: number | null;
};

type DisputeSummary = {
  id: string;
  timesheet_id: string;
  dispute_type: string;
  status: string;
  reason: string | null;
  created_at: string;
};


// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function EmployerTimesheetDetails() {
  const { timesheetId } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [timesheet, setTimesheet] = useState<Timesheet | null>(null);
  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [shift, setShift] = useState<ShiftSummary | null>(null);
  const [dispute, setDispute] = useState<DisputeSummary | null>(null);

  const normalisedTimesheetId =
    Array.isArray(timesheetId) ? timesheetId[0] : timesheetId;

  const handleConfirmClockIn = async () => {
    if (!timesheet) {
      Alert.alert('No timesheet', 'There is no timesheet to confirm.');
      return;
    }
    if (!timesheet.clock_in_time) {
      Alert.alert('Not clocked in', 'The worker has not clocked in yet.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('timesheets')
        .update({
          clock_in_confirmed_by_employer: true,
        })
        .eq('id', timesheet.id)
        .select('*')
        .single();

      if (error) throw error;

      setTimesheet(data as Timesheet);

      // Notify worker that clock-in has been confirmed
      try {
        if (timesheet.worker_id && timesheet.shift_id) {
          const { data: shiftInfo } = await supabase
            .from('shifts')
            .select('job_title')
            .eq('id', timesheet.shift_id)
            .single();

          await createNotification({
            userId: timesheet.worker_id,
            type: 'timesheet',
            title: 'Clock-In Confirmed',
            message: `Your clock-in time for "${shiftInfo?.job_title || 'shift'}" has been confirmed by the employer.`,
            link: `/worker/shift/${timesheet.shift_id}`,
          });
        }
      } catch (notifErr) {
        console.error('Error notifying worker about clock-in confirmation (non-critical):', notifErr);
        // Don't fail confirmation if notification fails
      }

      Alert.alert(
        'Clock-in confirmed',
        'You have confirmed the worker\'s clock-in time.'
      );
    } catch (err) {
      console.log('Confirm clock-in error:', err);
      Alert.alert('Error', 'Unable to confirm clock-in right now.');
    }
  };

  const handleConfirmClockOut = async () => {
    if (!timesheet) {
      Alert.alert('No timesheet', 'There is no timesheet to confirm.');
      return;
    }
    if (!timesheet.clock_out_time) {
      Alert.alert('Not clocked out', 'The worker has not clocked out yet.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('timesheets')
        .update({
          clock_out_confirmed_by_employer: true,
        })
        .eq('id', timesheet.id)
        .select('*')
        .single();

      if (error) throw error;

      setTimesheet(data as Timesheet);

      // Notify worker that clock-out has been confirmed
      try {
        if (timesheet.worker_id && timesheet.shift_id) {
          const { data: shiftInfo } = await supabase
            .from('shifts')
            .select('job_title')
            .eq('id', timesheet.shift_id)
            .single();

          await createNotification({
            userId: timesheet.worker_id,
            type: 'timesheet',
            title: 'Clock-Out Confirmed',
            message: `Your clock-out time for "${shiftInfo?.job_title || 'shift'}" has been confirmed by the employer.`,
            link: `/worker/shift/${timesheet.shift_id}`,
          });
        }
      } catch (notifErr) {
        console.error('Error notifying worker about clock-out confirmation (non-critical):', notifErr);
        // Don't fail confirmation if notification fails
      }

      Alert.alert(
        'Clock-out confirmed',
        'You have confirmed the worker\'s clock-out time.'
      );
    } catch (err) {
      console.log('Confirm clock-out error:', err);
      Alert.alert('Error', 'Unable to confirm clock-out.');
    }
  };

  // Navigate to the dispute-creation form
  const handleGoToDispute = () => {
    if (!timesheet) {
      Alert.alert('No timesheet', 'There is no timesheet to dispute.');
      return;
    }

    router.push(`/employer/timesheet/dispute?timesheetId=${timesheet.id}`);
  };

  // Navigate to view/edit existing dispute
  const handleViewDispute = () => {
    if (!dispute) {
      Alert.alert(
        'No dispute record',
        'We could not find a dispute linked to this timesheet.'
      );
      return;
    }
    router.push(`/employer/timesheet/dispute/${dispute.id}?from=/employer/timesheet/${timesheet.id}`);
  };

  // Step 1: Confirm timesheet data only (no payment finalization)
  const handleConfirmTimesheetOnly = async () => {
    if (!timesheet) {
      Alert.alert('No timesheet', 'There is no timesheet to confirm.');
      return;
    }

    if (!timesheet.clock_in_time || !timesheet.clock_out_time) {
      Alert.alert(
        'Not finished yet',
        'You can only confirm once the worker has clocked in and out.'
      );
      return;
    }

    if (timesheet.employer_confirmed) {
      Alert.alert('Already confirmed', 'This timesheet has already been confirmed.');
      return;
    }

    if (timesheet.dispute_raised || dispute) {
      Alert.alert(
        'Dispute active',
        'Cannot confirm a timesheet with an active dispute. Please resolve the dispute first.'
      );
      return;
    }

    try {
      setConfirming(true);

      // Mark timesheet as confirmed (Step 1 only)
      const { data: updatedTimesheet, error: tsError } = await supabase
        .from('timesheets')
        .update({
          employer_confirmed: true,
          dispute_raised: false,
          clock_in_confirmed_by_employer: true,
          clock_out_confirmed_by_employer: true,
        })
        .eq('id', timesheet.id)
        .select('*')
        .single();

      if (tsError) throw tsError;

      // Update local state
      setTimesheet(updatedTimesheet as Timesheet);

      // Notify worker that timesheet has been confirmed
      try {
        if (timesheet.worker_id && timesheet.shift_id) {
          const { data: shiftInfo } = await supabase
            .from('shifts')
            .select('job_title')
            .eq('id', timesheet.shift_id)
            .single();

          await createNotification({
            userId: timesheet.worker_id,
            type: 'timesheet',
            title: 'Timesheet Confirmed',
            message: `Your timesheet for "${shiftInfo?.job_title || 'shift'}" has been confirmed. Payment will be processed shortly.`,
            link: `/worker/timesheet/${timesheet.id}`,
          });
        }
      } catch (notifErr) {
        console.error('Error notifying worker about timesheet confirmation (non-critical):', notifErr);
        // Don't fail confirmation if notification fails
      }

      // Navigate to payment summary screen (Step 2)
      Alert.alert(
        'Timesheet Confirmed',
        'Timesheet confirmed. Next step: review and confirm payment.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.push(`/employer/timesheet/${timesheet.id}/payment-summary?from=/employer/timesheet/${timesheet.id}`);
            },
          },
        ]
      );
    } catch (err: any) {
      console.error('Confirm timesheet error:', err);
      Alert.alert(
        'Error',
        err?.message || 'Unable to confirm this timesheet.'
      );
    } finally {
      setConfirming(false);
    }
  };

  useEffect(() => {
    if (!normalisedTimesheetId) {
      setLoading(false);
      return;
    }
    loadTimesheet(normalisedTimesheetId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalisedTimesheetId]);

  const loadTimesheet = async (id: string) => {
    try {
      setLoading(true);

      // 1) Load the timesheet itself
      const { data: tsData, error: tsError } = await supabase
        .from('timesheets')
        .select('*')
        .eq('id', id)
        .single();

      if (tsError) throw tsError;
      const ts = tsData as Timesheet;
      setTimesheet(ts);

      // 2) Load worker profile (for name)
      if (ts.worker_id) {
        const { data: workerData, error: workerError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('id', ts.worker_id)
          .single();

        if (!workerError && workerData) {
          setWorker(workerData as WorkerProfile);
        }
      }

      // 3) Load shift summary (for title + date/time + rate)
      if (ts.shift_id) {
        const { data: shiftData, error: shiftError } = await supabase
          .from('shifts')
          .select(
            'id, job_title, shift_date, start_time, end_time, hourly_rate, overtime_multiplier'
          )
          .eq('id', ts.shift_id)
          .single();

        if (!shiftError && shiftData) {
          setShift(shiftData as ShiftSummary);
        }
      }

      // 4) Load latest dispute (if any) for this timesheet
      const { data: disputeData, error: disputeError } = await supabase
        .from('disputes')
        .select('id, timesheet_id, dispute_type, status, reason, created_at')
        .eq('timesheet_id', id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!disputeError && disputeData && disputeData.length > 0) {
        setDispute(disputeData[0] as DisputeSummary);
      } else {
        setDispute(null);
      }
    } catch (err) {
      console.log('Timesheet load error:', err);
      Alert.alert('Error', 'Unable to load timesheet.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value: string | null) => {
    if (!value) return '-';
    const d = new Date(value);
    if (isNaN(d.getTime())) {
      return new Date(value + 'T00:00:00').toLocaleDateString('en-SG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
    return d.toLocaleDateString('en-SG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (value: string | null) => {
    if (!value) return '-';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleTimeString('en-SG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleBack = () => {
    if (from && typeof from === 'string') {
      router.replace(from as any);
    } else {
      router.replace('/employer/my-shifts');
    }
  };

  if (loading) {
    return (
      <ConstitutionalScreen title="Timesheet" showBack onBack={handleBack} showLogo theme="light">
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading timesheet…</Text>
        </View>
      </ConstitutionalScreen>
    );
  }

  if (!timesheet) {
    return (
      <ConstitutionalScreen title="Timesheet" showBack onBack={handleBack} showLogo theme="light">
        <View style={styles.center}>
          <Text style={styles.emptyText}>No timesheet found.</Text>
        </View>
      </ConstitutionalScreen>
    );
  }

  const workerName =
    worker?.full_name ||
    `Worker ${timesheet.worker_id ? timesheet.worker_id.slice(0, 6) : ''}`;

  // Dispute label text for the Hours summary section
  let disputeLabel = 'No dispute';
  if (dispute) {
    disputeLabel = `Disputed (${dispute.status})`;
  } else if (timesheet.dispute_raised) {
    disputeLabel = 'Disputed';
  }

  return (
    <ConstitutionalScreen title="Timesheet" showBack onBack={handleBack} showLogo theme="light">
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <PanelPurple style={{ marginBottom: 12 }}>
          <Text style={styles.cardTitle}>Worker</Text>
            <Text style={styles.workerName}>{workerName}</Text>

            {shift && (
              <>
                <View style={styles.row}>
                  <Ionicons name="briefcase-outline" size={16} color="#6B7280" />
                  <Text style={styles.rowLabel}>Job:</Text>
                  <Text style={styles.rowValue}>
                    {shift.job_title || 'Shift'}
                  </Text>
                </View>

                <View style={styles.row}>
                  <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                  <Text style={styles.rowLabel}>Date:</Text>
                  <Text style={styles.rowValue}>
                    {shift.shift_date
                      ? formatDate(shift.shift_date)
                      : formatDate(shift.start_time)}
                  </Text>
                </View>

                <View style={styles.row}>
                  <Ionicons name="time-outline" size={16} color="#6B7280" />
                  <Text style={styles.rowLabel}>Scheduled time:</Text>
                  <Text style={styles.rowValue}>
                    {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                  </Text>
                </View>
              </>
            )}
        </PanelPurple>

        <PanelPurple style={{ marginBottom: 12 }}>
          <Text style={styles.cardTitleBold}>Clock-in / Clock-out</Text>
          <View style={styles.row}>
            <Ionicons name="log-in-outline" size={16} color="#6B7280" />
            <Text style={styles.rowLabel}>Clock in:</Text>
            <Text style={styles.rowValue}>
              {timesheet.clock_in_time
                ? `${formatTime(timesheet.clock_in_time)}`
                : '-'}
            </Text>
          </View>

          <View style={styles.row}>
            <Ionicons name="log-out-outline" size={16} color="#6B7280" />
            <Text style={styles.rowLabel}>Clock out:</Text>
            <Text style={styles.rowValue}>
              {timesheet.clock_out_time
                ? `${formatTime(timesheet.clock_out_time)}`
                : 'Not submitted yet'}
            </Text>
          </View>

          <View style={styles.row}>
            <Ionicons name="timer-outline" size={16} color="#6B7280" />
            <Text style={styles.rowLabel}>Break:</Text>
            <Text style={styles.rowValue}>
              {timesheet.break_duration_minutes != null
                ? `${timesheet.break_duration_minutes} min`
                : '0 min'}
            </Text>
          </View>

          {/* Buttons to confirm clock-in / out */}
          {timesheet.clock_in_time &&
            !timesheet.clock_in_confirmed_by_employer && (
              <View style={{ marginTop: 12 }}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleConfirmClockIn}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.primaryButtonText}>
                    Confirm clock-in
                  </Text>
                </TouchableOpacity>
              </View>
            )}

          {timesheet.clock_out_time &&
            !timesheet.clock_out_confirmed_by_employer && (
              <View style={{ marginTop: 12 }}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleConfirmClockOut}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.primaryButtonText}>
                    Confirm clock-out
                  </Text>
                </TouchableOpacity>
              </View>
            )}
        </PanelPurple>

        <PanelPurple style={{ marginBottom: 12 }}>
          <Text style={styles.cardTitleBold}>Hours summary</Text>
          <View style={styles.row}>
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text style={styles.rowLabel}>Total hours:</Text>
            <Text style={styles.rowValue}>
              {typeof timesheet.total_hours === 'number'
                ? `${timesheet.total_hours.toFixed(2)} h`
                : '-'}
            </Text>
          </View>

          <View style={styles.row}>
            <Ionicons name="flash-outline" size={16} color="#6B7280" />
            <Text style={styles.rowLabel}>Overtime:</Text>
            <Text style={styles.rowValue}>
              {typeof timesheet.overtime_hours === 'number'
                ? `${timesheet.overtime_hours.toFixed(2)} h`
                : '0.00 h'}
            </Text>
          </View>

          <View style={styles.row}>
            <Ionicons
              name="checkmark-circle-outline"
              size={16}
              color="#6B7280"
            />
            <Text style={styles.rowLabel}>Employer confirmed:</Text>
            <Text style={styles.rowValue}>
              {timesheet.employer_confirmed ? 'Yes' : 'No'}
            </Text>
          </View>

          <View style={styles.row}>
            <Ionicons
              name="alert-circle-outline"
              size={16}
              color="#6B7280"
            />
            <Text style={styles.rowLabel}>Dispute:</Text>
            <Text style={styles.rowValue}>{disputeLabel}</Text>
          </View>

            <Text style={styles.hintText}>
              Employers can confirm or dispute hours, but cannot reduce worked
              time or change clock-in / clock-out. Any overtime will be billed
              automatically when you approve.
            </Text>
          </Card.Content>
        </Card>

          {/* Step 1: Confirm timesheet button - only show if clocked in/out and not confirmed */}
          {timesheet.clock_in_time &&
            timesheet.clock_out_time &&
            !timesheet.employer_confirmed &&
            !timesheet.dispute_raised &&
            !dispute && (
              <View style={{ marginTop: 12 }}>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: '#3B82F6' }]}
                  onPress={handleConfirmTimesheetOnly}
                  disabled={confirming}
                >
                  {confirming ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text style={styles.primaryButtonText}>
                        Confirm timesheet
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

          {/* Dispute actions */}
          {!timesheet.dispute_raised && !dispute && !timesheet.employer_confirmed && (
            <View style={{ marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: '#6D28D9' }]}
                onPress={handleGoToDispute}
              >
                <Ionicons name="alert-circle" size={18} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Dispute timesheet</Text>
              </TouchableOpacity>
            </View>
          )}

          {dispute && (
            <View style={{ marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: '#111827' }]}
                onPress={handleViewDispute}
              >
                <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>View dispute</Text>
              </TouchableOpacity>
            </View>
          )}

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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'transparent',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  backButtonText: {
    marginLeft: 6,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 8 },
  cardTitleBold: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  workerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rowLabel: {
    marginLeft: 6,
    fontSize: 14,
    color: '#6B7280',
    minWidth: 120,
  },
  rowValue: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
    textAlign: 'right',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  hintText: {
    marginTop: 10,
    fontSize: 12,
    color: '#6B7280',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    paddingVertical: 10,
    backgroundColor: '#8B5CF6',
  },
  primaryButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
