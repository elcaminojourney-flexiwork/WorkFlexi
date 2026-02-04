import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Card, Chip } from 'react-native-paper';
import { supabase } from '../../../../supabase';
import { Ionicons } from '@expo/vector-icons';
import { calculateHoursFromTimes } from '../../../../services/timesheets';

type TimesheetDetails = {
  id: string;
  shift_id: string;
  worker_id: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  break_duration_minutes: number | null;
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
  overtime_multiplier: number | null;
  employer_id: string;
};

type WorkerProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  bank_account_number: string | null;
};

type EmployerProfile = {
  id: string;
  company_name: string | null;
  phone: string | null;
  location: string | null;
};


// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function TimesheetEarningDetails() {
  const { timesheetId } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [timesheet, setTimesheet] = useState<TimesheetDetails | null>(null);
  const [shift, setShift] = useState<ShiftDetails | null>(null);
  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [employer, setEmployer] = useState<EmployerProfile | null>(null);
  const [earningNumber, setEarningNumber] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<{
    regularHours: number;
    regularAmount: number;
    overtimeHours: number;
    overtimeAmount: number;
    subtotal: number;
    platformFee: number;
    platformFeePercentage: number;
    totalCharged: number;
    workerPayout: number;
  } | null>(null);

  useEffect(() => {
    if (timesheetId) {
      loadEarningDetails(
        Array.isArray(timesheetId) ? timesheetId[0] : timesheetId
      );
    }
  }, [timesheetId]);

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

      // Load timesheet - check via shift relationship if direct worker_id filter fails
      let timesheetData = null;
      
      // First try: direct worker_id match
      const { data: tsWithWorker, error: tsError1 } = await supabase
        .from('timesheets')
        .select('*')
        .eq('id', id)
        .eq('worker_id', user.id)
        .single();

      if (!tsError1 && tsWithWorker) {
        timesheetData = tsWithWorker;
      } else {
        // Second try: load timesheet and verify via shift relationship
        const { data: tsData, error: tsError2 } = await supabase
          .from('timesheets')
          .select('*')
          .eq('id', id)
          .single();

        if (tsError2 || !tsData) {
          throw new Error('Timesheet not found');
        }

        // Verify the timesheet belongs to this worker
        if (tsData.worker_id !== user.id) {
          throw new Error('Timesheet not found');
        }
        
        timesheetData = tsData;
      }

      const timesheetRecord = timesheetData as TimesheetDetails;
      setTimesheet(timesheetRecord);

      if (!timesheetRecord.clock_in_time || !timesheetRecord.clock_out_time) {
        throw new Error('Timesheet must have both clock-in and clock-out times');
      }

      if (!timesheetRecord.shift_id) {
        throw new Error('Timesheet must be linked to a shift');
      }

      // Load shift details
      const { data: shiftData, error: shiftError } = await supabase
        .from('shifts')
        .select('id, job_title, shift_date, start_time, end_time, location, location_address, hourly_rate, overtime_multiplier, employer_id')
        .eq('id', timesheetRecord.shift_id)
        .single();

      if (shiftError || !shiftData) {
        throw new Error('Shift not found');
      }

      setShift(shiftData as ShiftDetails);

      if (!shiftData.hourly_rate) {
        throw new Error('Shift must have an hourly rate');
      }

      // Load worker profile
      const { data: workerData, error: workerError } = await supabase
        .from('profiles')
        .select('id, full_name, phone, email, bank_account_number')
        .eq('id', user.id)
        .single();

      if (!workerError && workerData) {
        setWorker(workerData as WorkerProfile);
      }

      // Load employer profile
      if (shiftData.employer_id) {
        const { data: employerData, error: employerError } = await supabase
          .from('profiles')
          .select('id, company_name, phone, location')
          .eq('id', shiftData.employer_id)
          .single();

        if (!employerError && employerData) {
          setEmployer(employerData as EmployerProfile);
        }
      }

      // Calculate payment breakdown using same logic as invoice page
      const hoursCalculation = calculateHoursFromTimes({
        clockIn: timesheetRecord.clock_in_time,
        clockOut: timesheetRecord.clock_out_time,
        breakMinutes: timesheetRecord.break_duration_minutes ?? undefined,
        minimumHours: 4,
        overtimeThresholdHours: 8,
      });

      const hourlyRate = shiftData.hourly_rate;
      const overtimeMultiplier = shiftData.overtime_multiplier || 1;
      const regularAmount = Math.round(hoursCalculation.regularHours * hourlyRate * 100) / 100;
      const overtimeAmount = Math.round(hoursCalculation.overtimeHours * hourlyRate * overtimeMultiplier * 100) / 100;
      const subtotal = Math.round((regularAmount + overtimeAmount) * 100) / 100;
      
      const platformFeePercentage = 0.15;
      const platformFee = Math.round(subtotal * platformFeePercentage * 100) / 100;
      const totalCharged = Math.round((subtotal + platformFee) * 100) / 100;
      // Worker receives full subtotal - platform fee is only charged to employer
      const workerPayout = subtotal;

      setPaymentData({
        regularHours: hoursCalculation.regularHours,
        regularAmount,
        overtimeHours: hoursCalculation.overtimeHours,
        overtimeAmount,
        subtotal,
        platformFee,
        platformFeePercentage,
        totalCharged,
        workerPayout,
      });

      // Generate earning number
      const earnNum = generateEarningNumber(timesheetRecord.id, timesheetRecord.shift_id);
      setEarningNumber(earnNum);
    } catch (err: any) {
      console.error('Error loading earning details:', err);
      Alert.alert('Error', err?.message || 'Unable to load earning details.');
    } finally {
      setLoading(false);
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

  const generateEarningNumber = (id: string, shiftId?: string) => {
    // Generate earning number from shift ID and date, or use provided ID
    const baseId = shiftId || id;
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const idStr = baseId.slice(0, 8).toUpperCase();
    return `EARN-${dateStr}-${idStr}`;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading earning details…</Text>
      </View>
    );
  }

  if (!timesheet || !shift || !paymentData) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Earning data not found</Text>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => {
            if (from && typeof from === 'string') {
              router.replace(from as any);
            } else {
              router.replace('/worker/my-shifts');
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
              router.replace('/worker/my-shifts');
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
              {earningNumber || generateEarningNumber(timesheet.id, shift.id)}
            </Text>
          </View>
          <View style={styles.earningDateContainer}>
            <Text style={styles.earningDateLabel}>Paid on:</Text>
            <Text style={styles.earningDate}>
              {formatDate(timesheet.clock_out_time || shift.shift_date)}
            </Text>
          </View>
        </View>

        {/* Employer Info */}
        {employer && (
          <Card mode="elevated" style={{ marginBottom: 12 }}>
            <Card.Title title="FROM" titleStyle={{ fontSize: 14, fontWeight: 'bold', color: '#6B7280' }} />
            <Card.Content>
              <Text style={styles.companyName}>
                {employer.company_name || 'Employer'}
              </Text>
              {employer.location && (
                <Text style={styles.companyEmail}>{employer.location}</Text>
              )}
              {employer.phone && (
                <Text style={styles.companyEmail}>{employer.phone}</Text>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Worker Info */}
        <Card mode="elevated" style={{ marginBottom: 12 }}>
          <Card.Title title="PAID TO" titleStyle={{ fontSize: 14, fontWeight: 'bold', color: '#6B7280' }} />
          <Card.Content>
            <Text style={styles.workerName}>
              {worker?.full_name || 'Worker'}
            </Text>
            {worker?.phone && (
              <Text style={styles.workerEmail}>{worker.phone}</Text>
            )}
            {worker?.email && (
              <Text style={styles.workerEmail}>{worker.email}</Text>
            )}
            {worker?.bank_account_number && (
              <Text style={styles.workerEmail}>
                Bank: ****{worker.bank_account_number.slice(-4)}
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* Shift Details */}
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

        {/* Time Breakdown */}
        {timesheet && paymentData && (
          <Card mode="elevated" style={{ marginBottom: 12 }}>
            <Card.Title title="TIME BREAKDOWN" titleStyle={{ fontSize: 16, fontWeight: 'bold' }} />
            <Card.Content>
              {timesheet.clock_in_time && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Clock in:</Text>
                  <Text style={styles.detailValue}>
                    {formatTime(timesheet.clock_in_time)}
                  </Text>
                </View>
              )}
              {timesheet.clock_out_time && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Clock out:</Text>
                  <Text style={styles.detailValue}>
                    {formatTime(timesheet.clock_out_time)}
                  </Text>
                </View>
              )}
              {timesheet.break_duration_minutes != null && timesheet.break_duration_minutes > 0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Break deducted:</Text>
                  <Text style={styles.detailValue}>
                    {timesheet.break_duration_minutes} min (unpaid)
                  </Text>
                </View>
              )}
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Billable hours:</Text>
                <Text style={styles.detailValueBold}>
                  {(paymentData.regularHours + paymentData.overtimeHours).toFixed(2)} hours
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  Regular hours (up to 8h):
                </Text>
                <Text style={styles.detailValue}>
                  {paymentData.regularHours.toFixed(2)} hours @ SGD${(shift?.hourly_rate || 0).toFixed(2)}/hr
                </Text>
              </View>
              {paymentData.overtimeHours > 0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    Overtime hours (over 8h):
                  </Text>
                  <Text style={styles.detailValue}>
                    {paymentData.overtimeHours.toFixed(2)} hours @ SGD${(shift?.hourly_rate || 0).toFixed(2)}/hr
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Payment Breakdown */}
        <Card mode="elevated" style={{ marginBottom: 12 }}>
          <Card.Title title="PAYMENT BREAKDOWN" titleStyle={{ fontSize: 16, fontWeight: 'bold' }} />
          <Card.Content>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>
              Regular Pay:
            </Text>
            <Text style={styles.breakdownValue}>
              {paymentData.regularHours.toFixed(2)} hrs × SGD${(shift?.hourly_rate || 0).toFixed(2)} = {formatCurrency(paymentData.regularAmount)}
            </Text>
          </View>

          {paymentData.overtimeHours > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                Overtime Pay:
              </Text>
              <Text style={styles.breakdownValue}>
                {paymentData.overtimeHours.toFixed(2)} hrs × SGD${(shift?.hourly_rate || 0).toFixed(2)} × {(shift?.overtime_multiplier || 1).toFixed(1)} = {formatCurrency(paymentData.overtimeAmount)}
              </Text>
            </View>
          )}

          <View style={styles.dividerThick} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Earnings:</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(paymentData.workerPayout)}
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
                PAID
              </Chip>
            </View>
            <Text style={styles.statusDate}>
              Payment via Stripe Escrow
            </Text>
            {(timesheet.clock_out_time || shift.shift_date) && (
              <Text style={styles.statusDate}>
                Paid: {formatDate(timesheet.clock_out_time || shift.shift_date)}, {formatTime(timesheet.clock_out_time)}
            </Text>
          )}
            <View style={styles.divider} />
            <Text style={styles.thankYouText}>
              Thank you for using FlexiWork! 🚀
            </Text>
          </Card.Content>
        </Card>

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
  companyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  companyEmail: {
    fontSize: 14,
    color: '#6B7280',
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
  detailValueBold: {
    fontSize: 14,
    fontWeight: 'bold',
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
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  dividerThick: {
    height: 2,
    backgroundColor: '#111827',
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
    marginTop: 4,
  },
  thankYouText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
});

