import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../../supabase';
import { finalizePaymentForTimesheet } from '../../../../services/payments';
import { calculateHoursFromTimes } from '../../../../services/timesheets';
import ConstitutionalScreen, { PanelPurple } from '../../../../components/ConstitutionalScreen';

// Mock mode flag - matches services/payments.ts
const PAYMENTS_ENABLED = false;

type Timesheet = {
  id: string;
  shift_id: string;
  worker_id: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  break_duration_minutes: number | null;
  total_hours: number | null;
  regular_hours: number | null;
  overtime_hours: number | null;
  employer_confirmed: boolean | null;
};

type Shift = {
  id: string;
  hourly_rate: number | null;
  overtime_multiplier: number | null;
  job_title: string | null;
  shift_date: string | null;
};

type EscrowPayment = {
  id: string;
  shift_id: string;
  total_charged: number | null;
  platform_fee_percentage: number | null;
  status: string | null;
};


// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function PaymentSummary() {
  const { timesheetId } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState(false);
  const [timesheet, setTimesheet] = useState<Timesheet | null>(null);
  const [shift, setShift] = useState<Shift | null>(null);
  const [escrowPayment, setEscrowPayment] = useState<EscrowPayment | null>(null);

  const normalizedTimesheetId = Array.isArray(timesheetId)
    ? timesheetId[0]
    : timesheetId;

  useEffect(() => {
    if (!normalizedTimesheetId) {
      setLoading(false);
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedTimesheetId]);

  const loadData = async () => {
    try {
      setLoading(true);

      if (!normalizedTimesheetId) {
        Alert.alert('Error', 'No timesheet ID provided');
        router.back();
        return;
      }

      // 1) Load timesheet
      const { data: tsData, error: tsError } = await supabase
        .from('timesheets')
        .select('*')
        .eq('id', normalizedTimesheetId)
        .single();

      if (tsError || !tsData) {
        throw new Error('Timesheet not found');
      }

      const ts = tsData as Timesheet;
      setTimesheet(ts);

      if (!ts.clock_in_time || !ts.clock_out_time) {
        Alert.alert(
          'Incomplete Timesheet',
          'Timesheet must have both clock-in and clock-out times.'
        );
        router.back();
        return;
      }

      // 2) Load shift
      if (ts.shift_id) {
        const { data: shiftData, error: shiftError } = await supabase
          .from('shifts')
          .select('id, hourly_rate, overtime_multiplier, job_title, shift_date')
          .eq('id', ts.shift_id)
          .single();

        if (!shiftError && shiftData) {
          setShift(shiftData as Shift);
        }
      }

      // 3) Load escrow payment (handle both real and mock statuses)
      // Skip payment query in mock mode to avoid RLS errors
      if (ts.shift_id) {
        if (PAYMENTS_ENABLED) {
          const { data: paymentData, error: paymentError } = await supabase
            .from('payments')
            .select('*')
            .eq('shift_id', ts.shift_id)
            .in('status', ['held_in_escrow', 'mock_held', 'released', 'mock_released'])
            .order('created_at', { ascending: false })
            .limit(1);

          if (!paymentError && paymentData && paymentData.length > 0) {
            setEscrowPayment(paymentData[0] as EscrowPayment);
          }
        } else {
          // Mock mode: Set mock escrow payment data
          setEscrowPayment({
            id: 'mock-' + ts.shift_id,
            shift_id: ts.shift_id,
            total_charged: null,
            platform_fee_percentage: 0.15,
            status: 'mock_held',
          } as EscrowPayment);
        }
      }
    } catch (err) {
      console.error('Load payment summary error:', err);
      Alert.alert('Error', 'Unable to load payment summary');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleReleasePayment = async () => {
    if (!timesheet || !normalizedTimesheetId) {
      Alert.alert('Error', 'Timesheet data missing');
      return;
    }

    try {
      setReleasing(true);

      // Check if payment already released (handle both real and mock statuses)
      // Skip payment query in mock mode to avoid RLS errors
      if (PAYMENTS_ENABLED && timesheet.shift_id) {
        const { data: currentPayment } = await supabase
          .from('payments')
          .select('status')
          .eq('shift_id', timesheet.shift_id)
          .in('status', ['released', 'mock_released'])
          .limit(1);

        if (currentPayment && currentPayment.length > 0) {
          Alert.alert(
            'Already Released',
            'Payment has already been released for this timesheet.'
          );
          return;
        }
      }
      // In mock mode, check if shift is already completed instead
      if (!PAYMENTS_ENABLED && timesheet.shift_id) {
        const { data: shiftData } = await supabase
          .from('shifts')
          .select('status')
          .eq('id', timesheet.shift_id)
          .single();
        
        if (shiftData?.status === 'completed') {
          Alert.alert(
            'Already Released',
            'Payment has already been released for this timesheet.'
          );
          return;
        }
      }

      console.log('[PAYMENT SUMMARY] Calling finalizePaymentForTimesheet...', { timesheetId: normalizedTimesheetId });
      
      const result = await finalizePaymentForTimesheet({
        timesheetId: normalizedTimesheetId,
      });

      console.log('[PAYMENT SUMMARY] Payment finalized:', {
        paymentId: result.payment.id,
        shiftUpdated: result.shiftUpdated,
        workerPayout: result.payment.worker_payout,
      });

      const workerPayout = result.payment.worker_payout || 0;

      // Reload escrow payment to show updated status
      // Skip payment query in mock mode to avoid RLS errors
      if (PAYMENTS_ENABLED && timesheet.shift_id) {
        const { data: paymentData } = await supabase
          .from('payments')
          .select('*')
          .eq('shift_id', timesheet.shift_id)
          .in('status', ['held_in_escrow', 'mock_held', 'released', 'mock_released'])
          .order('created_at', { ascending: false })
          .limit(1);

        if (paymentData && paymentData.length > 0) {
          setEscrowPayment(paymentData[0] as EscrowPayment);
        }
      }
      // In mock mode, update to mock_released status
      if (!PAYMENTS_ENABLED) {
        setEscrowPayment({
          id: 'mock-' + timesheet.shift_id,
          shift_id: timesheet.shift_id,
          total_charged: null,
          platform_fee_percentage: 0.15,
          status: 'mock_released',
        } as EscrowPayment);
      }

      Alert.alert(
        'Payment Released',
        `Payment released. Worker payout: SGD$${workerPayout.toFixed(2)}`,
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/employer/payments');
            },
          },
        ]
      );
    } catch (err: any) {
      console.error('Release payment error:', err);
      Alert.alert(
        'Error',
        err?.message || 'Unable to release payment right now.'
      );
    } finally {
      setReleasing(false);
    }
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

  const handleBack = () => {
    if (from && typeof from === 'string') {
      router.replace(from as any);
    } else {
      router.replace('/employer/my-shifts');
    }
  };

  if (loading) {
    return (
      <ConstitutionalScreen title="Payment Summary" showBack onBack={handleBack} showLogo theme="light">
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading payment summary…</Text>
        </View>
      </ConstitutionalScreen>
    );
  }

  if (!timesheet || !shift) {
    return (
      <ConstitutionalScreen title="Payment Summary" showBack onBack={handleBack} showLogo theme="light">
        <View style={styles.center}>
          <Text style={styles.emptyText}>Unable to load payment details.</Text>
        </View>
      </ConstitutionalScreen>
    );
  }

  // Calculate hours using centralized function
  const hoursCalculation = calculateHoursFromTimes({
    clockIn: timesheet.clock_in_time!,
    clockOut: timesheet.clock_out_time!,
    breakMinutes: timesheet.break_duration_minutes ?? undefined,
    minimumHours: 4,
    overtimeThresholdHours: 8,
  });

  // Calculate amounts
  const hourlyRate = shift.hourly_rate || 0;
  const overtimeMultiplier = shift.overtime_multiplier || 1;
  const regularAmount = hoursCalculation.regularHours * hourlyRate;
  const overtimeAmount =
    hoursCalculation.overtimeHours * hourlyRate * overtimeMultiplier;
  const subtotal = regularAmount + overtimeAmount;

  // Platform fee
  const platformFeePercentage =
    escrowPayment?.platform_fee_percentage ?? 0.15;
  const platformFeeAmount = subtotal * platformFeePercentage;
  const totalPayable = subtotal + platformFeeAmount;

  // Escrow comparison (if escrow payment exists)
  const escrowHeld = escrowPayment?.total_charged || 0;
  const difference = escrowPayment ? totalPayable - escrowHeld : 0;

  // Check if already released (handle both real and mock statuses)
  const isAlreadyReleased =
    escrowPayment?.status === 'released' ||
    escrowPayment?.status === 'mock_released';

  return (
    <ConstitutionalScreen title="Payment Summary" showBack onBack={handleBack} showLogo theme="light">
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <PanelPurple style={{ marginBottom: 12 }}>
          <Text style={styles.cardTitleBold}>Work Hours</Text>
          <View style={styles.row}>
            <Ionicons name="log-in-outline" size={16} color="#6B7280" />
            <Text style={styles.rowLabel}>Clock in:</Text>
            <Text style={styles.rowValue}>
              {formatTime(timesheet.clock_in_time)}
            </Text>
          </View>

          <View style={styles.row}>
            <Ionicons name="log-out-outline" size={16} color="#6B7280" />
            <Text style={styles.rowLabel}>Clock out:</Text>
            <Text style={styles.rowValue}>
              {formatTime(timesheet.clock_out_time)}
            </Text>
          </View>

          <View style={styles.row}>
            <Ionicons name="timer-outline" size={16} color="#6B7280" />
            <Text style={styles.rowLabel}>Break:</Text>
            <Text style={styles.rowValue}>
              {hoursCalculation.breakMinutes} minutes
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Total worked:</Text>
            <Text style={styles.rowValue}>
              {(hoursCalculation.totalMinutes / 60).toFixed(2)} hours
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Billable hours (min 4h):</Text>
            <Text style={styles.rowValueBold}>
              {hoursCalculation.billableHours.toFixed(2)} hours
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Regular hours:</Text>
            <Text style={styles.rowValue}>
              {hoursCalculation.regularHours.toFixed(2)} hours
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Overtime hours:</Text>
            <Text style={styles.rowValue}>
              {hoursCalculation.overtimeHours.toFixed(2)} hours
            </Text>
          </View>
        </PanelPurple>

        <PanelPurple style={{ marginBottom: 12 }}>
          <Text style={styles.cardTitleBold}>Amounts</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Regular:</Text>
            <Text style={styles.rowValue}>
              {hoursCalculation.regularHours.toFixed(2)} × SGD${hourlyRate.toFixed(2)} ={' '}
              <Text style={styles.amountText}>
                SGD${regularAmount.toFixed(2)}
              </Text>
            </Text>
          </View>

          {hoursCalculation.overtimeHours > 0 && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Overtime:</Text>
              <Text style={styles.rowValue}>
                {hoursCalculation.overtimeHours.toFixed(2)} × SGD${hourlyRate.toFixed(2)} ×{' '}
                {overtimeMultiplier} ={' '}
                <Text style={styles.amountText}>
                  SGD${overtimeAmount.toFixed(2)}
                </Text>
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.rowTotal}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>SGD${subtotal.toFixed(2)}</Text>
          </View>
        </PanelPurple>

        <PanelPurple style={{ marginBottom: 12 }}>
          <Text style={styles.cardTitleBold}>Platform Fee</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Platform fee ({platformFeePercentage * 100}%):</Text>
            <Text style={styles.rowValueBold}>
              SGD${platformFeeAmount.toFixed(2)}
            </Text>
          </View>

            <Text style={styles.hintText}>
              Covers platform operation, worker support, and shift matching.
            </Text>
        </PanelPurple>

        <PanelPurple style={{ marginBottom: 12 }}>
          <Text style={styles.cardTitleBold}>Escrow & Final</Text>
          {escrowPayment ? (
            <>
              <View style={styles.row}>
                <Ionicons name="shield-checkmark" size={16} color="#3B82F6" />
                <Text style={styles.rowLabel}>Escrow held:</Text>
                <Text style={styles.rowValue}>
                  SGD${escrowHeld.toFixed(2)}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.row}>
              <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
              <Text style={styles.rowLabel}>Escrow:</Text>
              <Text style={styles.rowValue}>Not found (mock mode)</Text>
            </View>
          )}

          <View style={styles.row}>
            <Ionicons name="cash-outline" size={16} color="#8B5CF6" />
            <Text style={styles.rowLabel}>Final payable:</Text>
            <Text style={styles.rowValueBold}>
              SGD${totalPayable.toFixed(2)}
            </Text>
          </View>

          {escrowPayment && difference !== 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Difference:</Text>
                <Text
                  style={[
                    styles.rowValueBold,
                    { color: difference > 0 ? '#6D28D9' : '#3B82F6' },
                  ]}
                >
                  {difference > 0 ? '+' : ''}SGD${Math.abs(difference).toFixed(2)}
                </Text>
              </View>
              <Text style={styles.hintText}>
                {difference > 0
                  ? 'Additional amount to be charged (mock mode - no real billing yet).'
                  : 'Surplus amount (mock mode - no refund processed yet).'}
              </Text>
            </>
          )}

            {isAlreadyReleased && (
              <View style={styles.releasedNotice}>
                <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                <Text style={styles.releasedText}>
                  Payment has already been released.
                </Text>
              </View>
            )}
        </PanelPurple>

        {/* Release Payment Button */}
        {!isAlreadyReleased && timesheet.employer_confirmed && (
          <TouchableOpacity
            style={styles.releaseButton}
            onPress={handleReleasePayment}
            disabled={releasing}
          >
            {releasing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.releaseButtonText}>
                  Confirm & release payment
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
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
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  backButtonText: {
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
  cardTitle: {
    fontSize: 16,
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
  rowValueBold: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    textAlign: 'right',
  },
  amountText: {
    fontWeight: '600',
    color: '#8B5CF6',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  rowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  hintText: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  releasedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  releasedText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '600',
  },
  releaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  releaseButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

