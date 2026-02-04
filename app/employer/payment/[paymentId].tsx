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
import { Chip } from 'react-native-paper';
import { supabase } from '../../../supabase';
import ConstitutionalScreen, { PanelPurple, PanelBlue } from '../../../components/ConstitutionalScreen';
import { Ionicons } from '@expo/vector-icons';

type PaymentRecord = {
  id: string;
  shift_id: string;
  employer_id: string;
  worker_id: string | null;
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
};

type EmployerProfile = {
  id: string;
  company_name: string | null;
  email: string | null;
};


// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function PaymentInvoiceDetails() {
  const { paymentId, from } = useLocalSearchParams<{ paymentId: string; from?: string }>();
  const router = useRouter();
  const onBack = () => { if (from && typeof from === 'string') router.replace(from as any); else router.replace('/employer/payments'); };
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [shift, setShift] = useState<ShiftDetails | null>(null);
  const [employer, setEmployer] = useState<EmployerProfile | null>(null);

  useEffect(() => {
    if (paymentId) {
      loadPaymentDetails(
        Array.isArray(paymentId) ? paymentId[0] : paymentId
      );
    }
  }, [paymentId]);

  const loadPaymentDetails = async (id: string) => {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert('Error', 'Please login again');
        router.replace('/auth/select-user-type');
        return;
      }

      // Load payment
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', id)
        .eq('employer_id', user.id)
        .single();

      if (paymentError || !paymentData) {
        throw new Error('Payment not found');
      }

      const paymentRecord = paymentData as PaymentRecord;
      setPayment(paymentRecord);

      // Load shift details
      if (paymentRecord.shift_id) {
        const { data: shiftData, error: shiftError } = await supabase
          .from('shifts')
          .select('id, job_title, shift_date, start_time, end_time, location, location_address')
          .eq('id', paymentRecord.shift_id)
          .single();

        if (!shiftError && shiftData) {
          setShift(shiftData as ShiftDetails);
        }
      }

      // Load employer profile
      const { data: employerData, error: employerError } = await supabase
        .from('profiles')
        .select('id, company_name, email')
        .eq('id', user.id)
        .single();

      if (!employerError && employerData) {
        setEmployer(employerData as EmployerProfile);
      }
    } catch (err: any) {
      console.error('Error loading payment details:', err);
      Alert.alert('Error', err?.message || 'Unable to load payment details.');
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

  const generateInvoiceNumber = (paymentId: string) => {
    return `INV-${paymentId.slice(0, 8).toUpperCase()}`;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading invoice…</Text>
      </View>
    );
  }

  if (!payment) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Payment not found</Text>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => {
            if (from && typeof from === 'string') {
              router.replace(from as any);
            } else {
              router.replace('/employer/payments');
            }
          }}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ConstitutionalScreen title="Invoice" showBack onBack={onBack} showLogo theme="light">
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Invoice Header */}
        <View style={styles.invoiceHeader}>
          <View>
            <Text style={styles.invoiceTitle}>Invoice</Text>
            <Text style={styles.invoiceNumber}>
              {generateInvoiceNumber(payment.id)}
            </Text>
          </View>
          <View style={styles.invoiceDateContainer}>
            <Text style={styles.invoiceDateLabel}>Date:</Text>
            <Text style={styles.invoiceDate}>
              {formatDate(payment.released_at || payment.created_at)}
            </Text>
          </View>
        </View>

        {/* Employer Info */}
        <PanelPurple style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#6B7280', marginBottom: 8 }}>Bill To</Text>
          <Text style={styles.companyName}>
            {employer?.company_name || 'Employer'}
          </Text>
          {employer?.email && (
            <Text style={styles.companyEmail}>{employer.email}</Text>
          )}
        </PanelPurple>

        {/* Shift Details */}
        {shift && (
          <PanelPurple style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>Shift Details</Text>
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
                <Text style={styles.detailLabel}>Time:</Text>
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
          </PanelPurple>
        )}

        <PanelBlue style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>Payment Breakdown</Text>
          <View>

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

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Subtotal:</Text>
            <Text style={styles.breakdownValue}>
              {formatCurrency(payment.subtotal)}
            </Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>
              Platform Fee ({((payment.platform_fee_percentage || 0) * 100).toFixed(0)}%):
            </Text>
            <Text style={styles.breakdownValue}>
              {formatCurrency(payment.platform_fee)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Charged:</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(payment.total_charged)}
            </Text>
          </View>

          {payment.worker_payout && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Worker Payout:</Text>
              <Text style={styles.breakdownValue}>
                {formatCurrency(payment.worker_payout)}
              </Text>
            </View>
          )}
          </View>
        </PanelBlue>

        <PanelPurple style={{ marginBottom: 12 }}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Payment Status:</Text>
            <Chip
              mode="flat"
              icon={() => <Ionicons name="checkmark-circle" size={16} color="#3B82F6" />}
              style={{ backgroundColor: '#EFF6FF' }}
              textStyle={{ color: '#1E40AF', fontSize: 12, fontWeight: '600' }}
            >
              Released
            </Chip>
          </View>
          {payment.released_at && (
            <Text style={styles.statusDate}>
              Released on {formatDate(payment.released_at)}
            </Text>
          )}
        </PanelPurple>

        <View style={{ height: 32 }} />
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
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#8B5CF6',
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  invoiceNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  invoiceDateContainer: {
    alignItems: 'flex-end',
  },
  invoiceDateLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  invoiceDate: {
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
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
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
    color: '#8B5CF6',
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
});

