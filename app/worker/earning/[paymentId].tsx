import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
ImageBackground, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Card, Chip } from 'react-native-paper';
import { supabase } from '../../../supabase';
import { Ionicons } from '@expo/vector-icons';

type PaymentRecord = {
  id: string;
  shift_id: string;
  employer_id: string;
  worker_id: string | null;
  timesheet_id: string | null;
  regular_hours: number;
  regular_amount: number;
  overtime_hours: number;
  overtime_amount: number;
  subtotal: number;
  platform_fee: number;
  platform_fee_percentage: number;
  total_charged: number;
  worker_payout: number | null;
  status: string;
  released_at: string | null;
  payment_captured_at: string | null;
  created_at: string;
};

type ShiftDetails = {
  id: string;
  job_title: string | null;
  shift_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  location_address: string | null;
  hourly_rate: number | null;
};

type TimesheetDetails = {
  id: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  break_duration_minutes: number | null;
  total_minutes_worked: number | null;
};

type WorkerProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
};


// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function WorkerEarningDetails() {
  const { paymentId } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [shift, setShift] = useState<ShiftDetails | null>(null);
  const [timesheet, setTimesheet] = useState<TimesheetDetails | null>(null);
  const [worker, setWorker] = useState<WorkerProfile | null>(null);

  useEffect(() => {
    if (paymentId) {
      loadEarningDetails(
        Array.isArray(paymentId) ? paymentId[0] : paymentId
      );
    }
  }, [paymentId]);

  const loadEarningDetails = async (id: string) => {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert('Error', 'Please login again');
        router.replace('/auth/login');
        return;
      }

      // Load payment - check if it's a mock payment ID or real
      const isMockPayment = id.startsWith('mock-final-');
      
      if (isMockPayment) {
        // For mock payments, try to find the actual payment by timesheet ID
        const timesheetId = id.replace('mock-final-', '');
        const { data: paymentData } = await supabase
          .from('payments')
          .select('*')
          .eq('timesheet_id', timesheetId)
          .eq('worker_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (paymentData) {
          setPayment(paymentData as PaymentRecord);
          await loadRelatedData(paymentData as PaymentRecord, user.id);
        } else {
          throw new Error('Payment not found');
        }
      } else {
        // Load real payment
        const { data: paymentData, error: paymentError } = await supabase
          .from('payments')
          .select('*')
          .eq('id', id)
          .eq('worker_id', user.id)
          .single();

        if (paymentError || !paymentData) {
          throw new Error('Payment not found');
        }

        const paymentRecord = paymentData as PaymentRecord;
        setPayment(paymentRecord);
        await loadRelatedData(paymentRecord, user.id);
      }
    } catch (err: any) {
      console.error('Error loading earning details:', err);
      Alert.alert('Error', err?.message || 'Unable to load earning details.');
    } finally {
      setLoading(false);
    }
  };

  const loadRelatedData = async (paymentRecord: PaymentRecord, userId: string) => {
    // Load shift details
    if (paymentRecord.shift_id) {
      const { data: shiftData, error: shiftError } = await supabase
        .from('shifts')
        .select('id, job_title, shift_date, start_time, end_time, location, location_address, hourly_rate')
        .eq('id', paymentRecord.shift_id)
        .single();

      if (!shiftError && shiftData) {
        setShift(shiftData as ShiftDetails);
      }
    }

    // Load timesheet details (for clock-in/out times)
    if (paymentRecord.timesheet_id) {
      const { data: timesheetData, error: timesheetError } = await supabase
        .from('timesheets')
        .select('id, clock_in_time, clock_out_time, break_duration_minutes, total_minutes_worked')
        .eq('id', paymentRecord.timesheet_id)
        .single();

      if (!timesheetError && timesheetData) {
        setTimesheet(timesheetData as TimesheetDetails);
      }
    }

    // Load worker profile
    const { data: workerData, error: workerError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', userId)
      .single();

    if (!workerError && workerData) {
      setWorker(workerData as WorkerProfile);
    }
  };

  const formatCurrency = (amount: number) => {
    return `SGD$${amount.toFixed(2)}`;
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

  const formatDateTime = (value: string | null) => {
    if (!value) return '-';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleString('en-SG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const generateEarningNumber = (paymentId: string) => {
    return `EARN-${paymentId.slice(0, 8).toUpperCase()}`;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading earning details…</Text>
      </View>
    );
  }

  if (!payment) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Earning not found</Text>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => {
            if (from && typeof from === 'string') {
              router.replace(from as any);
            } else {
              router.replace('/worker/earnings');
            }
          }}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => {
            if (from && typeof from === 'string') {
              router.replace(from as any);
            } else {
              router.replace('/worker/earnings');
            }
          }}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earning Summary</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Earning Header */}
        <View style={styles.earningHeader}>
          <View>
            <Text style={styles.earningTitle}>Earning Summary</Text>
            <Text style={styles.earningNumber}>
              {generateEarningNumber(payment.id)}
            </Text>
          </View>
          <View style={styles.earningDateContainer}>
            <Text style={styles.earningDateLabel}>Paid on:</Text>
            <Text style={styles.earningDate}>
              {formatDate(payment.released_at || payment.created_at)}
            </Text>
          </View>
        </View>

        {/* Worker Info */}
        <Card mode="elevated" style={{ marginBottom: 12 }}>
          <Card.Title title="Paid To" titleStyle={{ fontSize: 14, fontWeight: 'bold', color: '#6B7280' }} />
          <Card.Content>
            <Text style={styles.workerName}>
              {worker?.full_name || 'Worker'}
            </Text>
            {worker?.email && (
              <Text style={styles.workerEmail}>{worker.email}</Text>
            )}
          </Card.Content>
        </Card>

        {/* Shift Details */}
        {shift && (
          <Card mode="elevated" style={{ marginBottom: 12 }}>
            <Card.Title title="Shift Details" titleStyle={{ fontSize: 16, fontWeight: 'bold' }} />
            <Card.Content>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Job Title:</Text>
              <Text style={styles.detailValue}>
                {shift.job_title || 'Shift'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date:</Text>
              <Text style={styles.detailValue}>
                {formatDate(shift.shift_date)}
              </Text>
            </View>
            {(shift.start_time || shift.end_time) && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Scheduled Time:</Text>
                <Text style={styles.detailValue}>
                  {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                </Text>
              </View>
            )}
            {(shift.location || shift.location_address) && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Location:</Text>
                <Text style={styles.detailValue}>
                  {shift.location || shift.location_address}
                </Text>
              </View>
            )}
            </Card.Content>
          </Card>
        )}

        {/* Hours Worked */}
        {timesheet && (timesheet.clock_in_time || timesheet.clock_out_time) && (
          <Card mode="elevated" style={{ marginBottom: 12 }}>
            <Card.Title title="Hours Worked" titleStyle={{ fontSize: 16, fontWeight: 'bold' }} />
            <Card.Content>
            
            {timesheet.clock_in_time && (
              <View style={styles.detailRow}>
                <Ionicons name="log-in-outline" size={16} color="#6B7280" />
                <Text style={styles.detailLabel}>Clock in:</Text>
                <Text style={styles.detailValue}>
                  {formatDateTime(timesheet.clock_in_time)}
                </Text>
              </View>
            )}

            {timesheet.clock_out_time && (
              <View style={styles.detailRow}>
                <Ionicons name="log-out-outline" size={16} color="#6B7280" />
                <Text style={styles.detailLabel}>Clock out:</Text>
                <Text style={styles.detailValue}>
                  {formatDateTime(timesheet.clock_out_time)}
                </Text>
              </View>
            )}

            {timesheet.break_duration_minutes != null && timesheet.break_duration_minutes > 0 && (
              <View style={styles.detailRow}>
                <Ionicons name="timer-outline" size={16} color="#6B7280" />
                <Text style={styles.detailLabel}>Break:</Text>
                <Text style={styles.detailValue}>
                  {timesheet.break_duration_minutes} minutes
                </Text>
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Regular Hours:</Text>
              <Text style={styles.detailValue}>
                {payment.regular_hours.toFixed(2)} h
              </Text>
            </View>

            {payment.overtime_hours > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Overtime Hours:</Text>
                <Text style={styles.detailValue}>
                  {payment.overtime_hours.toFixed(2)} h
                </Text>
              </View>
            )}
            </Card.Content>
          </Card>
        )}

        {/* Payment Breakdown */}
        <Card mode="elevated" style={{ marginBottom: 12 }}>
          <Card.Title title="Payment Breakdown" titleStyle={{ fontSize: 16, fontWeight: 'bold' }} />
          <Card.Content>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Regular Hours:</Text>
            <Text style={styles.breakdownValue}>
              {payment.regular_hours.toFixed(2)} h
            </Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Regular Amount:</Text>
            <Text style={styles.breakdownValue}>
              {formatCurrency(payment.regular_amount)}
            </Text>
          </View>

          {payment.overtime_hours > 0 && (
            <>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Overtime Hours:</Text>
                <Text style={styles.breakdownValue}>
                  {payment.overtime_hours.toFixed(2)} h
                </Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Overtime Amount:</Text>
                <Text style={styles.breakdownValue}>
                  {formatCurrency(payment.overtime_amount)}
                </Text>
              </View>
            </>
          )}

          <View style={styles.divider} />

          <View style={styles.dividerThick} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Earnings:</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(payment.worker_payout || payment.subtotal || 0)}
            </Text>
          </View>
          </Card.Content>
        </Card>

        {/* Payment Status */}
        <Card mode="elevated" style={{ marginBottom: 12 }}>
          <Card.Content>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Payment Status:</Text>
              <Chip
                mode="flat"
                icon={() => <Ionicons name="checkmark-circle" size={16} color="#3B82F6" />}
                style={{ backgroundColor: '#EFF6FF' }}
                textStyle={{ color: '#1E40AF', fontSize: 12, fontWeight: '600' }}
              >
                Paid
              </Chip>
            </View>
            {payment.released_at && (
              <Text style={styles.statusDate}>
                Payment released on {formatDateTime(payment.released_at)}
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* Review Button (Placeholder for Step 4) */}
        {/* Will be implemented in Step 4 */}
        {/* <View style={styles.card}>
          <TouchableOpacity
            style={styles.reviewButton}
            onPress={() => {
              // Navigate to review page (Step 4)
              router.push(`/worker/review/${payment.shift_id}`);
            }}
          >
            <Ionicons name="star-outline" size={20} color="#FFFFFF" />
            <Text style={styles.reviewButtonText}>Review Employer</Text>
          </TouchableOpacity>
        </View> */}

        <View style={{ height: 32 }} />
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
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  backButtonText: {
    marginLeft: 6,
    color: '#3B82F6',
    fontWeight: '600',
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
  earningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
  },
  earningTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  earningNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  earningDateContainer: {
    alignItems: 'flex-end',
  },
  earningDateLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  earningDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
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
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  workerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  workerEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    textAlign: 'right',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  deductionText: {
    color: '#7C3AED',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
  },
  statusDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  reviewButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  reviewButtonText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

