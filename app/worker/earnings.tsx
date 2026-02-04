import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TouchableOpacity,
ImageBackground, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';

type PaymentRecord = {
  id: string;
  shift_id: string;
  worker_id: string;
  worker_payout: number | null;
  platform_fee: number;
  status: string;
  released_at: string | null;
  created_at: string;
};

type ShiftSummary = {
  id: string;
  job_title: string | null;
  shift_date: string | null;
};

type PaymentWithShift = PaymentRecord & {
  shift: ShiftSummary | null;
};


// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function WorkerEarnings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState<PaymentWithShift[]>([]);
  const [lifetimeEarnings, setLifetimeEarnings] = useState(0);
  const [thisMonthEarnings, setThisMonthEarnings] = useState(0);
  const [thisWeekEarnings, setThisWeekEarnings] = useState(0);

  useEffect(() => {
    loadEarnings();
  }, []);

  const loadEarnings = async () => {
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

      // Query payments where status = 'released' and worker_id = current worker
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('worker_id', user.id)
        .eq('status', 'released')
        .not('worker_payout', 'is', null)
        .order('released_at', { ascending: false });

      if (paymentsError) {
        throw paymentsError;
      }

      const paymentsList = (paymentsData || []) as PaymentRecord[];

      // Get unique shift IDs
      const shiftIds = Array.from(
        new Set(paymentsList.map((p) => p.shift_id).filter(Boolean))
      );

      // Load shifts data
      let shiftsMap: Record<string, ShiftSummary> = {};
      if (shiftIds.length > 0) {
        const { data: shiftsData, error: shiftsError } = await supabase
          .from('shifts')
          .select('id, job_title, shift_date')
          .in('id', shiftIds);

        if (!shiftsError && shiftsData) {
          shiftsData.forEach((shift) => {
            shiftsMap[shift.id] = shift as ShiftSummary;
          });
        }
      }

      // Combine payments with shift data
      const paymentsWithShifts: PaymentWithShift[] = paymentsList.map(
        (payment) => ({
          ...payment,
          shift: shiftsMap[payment.shift_id] || null,
        })
      );

      setPayments(paymentsWithShifts);

      // Calculate earnings
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
      startOfWeek.setHours(0, 0, 0, 0);

      let lifetime = 0;
      let thisMonth = 0;
      let thisWeek = 0;

      paymentsWithShifts.forEach((payment) => {
        const payout = payment.worker_payout || 0;
        lifetime += payout;

        // Check if payment is in current month
        if (payment.released_at) {
          const releasedDate = new Date(payment.released_at);
          if (releasedDate >= startOfMonth) {
            thisMonth += payout;
          }

          // Check if payment is in current week
          if (releasedDate >= startOfWeek) {
            thisWeek += payout;
          }
        }
      });

      setLifetimeEarnings(lifetime);
      setThisMonthEarnings(thisMonth);
      setThisWeekEarnings(thisWeek);
    } catch (err) {
      console.error('Error loading earnings:', err);
      Alert.alert('Error', 'Unable to load earnings. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadEarnings();
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

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading earnings…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => router.replace('/worker')}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Earnings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Earnings Summary Cards */}
        <View style={styles.summaryContainer}>
          {/* Lifetime Earnings */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryCardHeader}>
              <Ionicons name="trophy-outline" size={24} color="#3B82F6" />
              <Text style={styles.summaryCardLabel}>Lifetime</Text>
            </View>
            <Text style={styles.summaryCardValue}>
              {formatCurrency(lifetimeEarnings)}
            </Text>
          </View>

          {/* This Month */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryCardHeader}>
              <Ionicons name="calendar-outline" size={24} color="#3B82F6" />
              <Text style={styles.summaryCardLabel}>This Month</Text>
            </View>
            <Text style={styles.summaryCardValue}>
              {formatCurrency(thisMonthEarnings)}
            </Text>
          </View>

          {/* This Week */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryCardHeader}>
              <Ionicons name="time-outline" size={24} color="#3B82F6" />
              <Text style={styles.summaryCardLabel}>This Week</Text>
            </View>
            <Text style={styles.summaryCardValue}>
              {formatCurrency(thisWeekEarnings)}
            </Text>
          </View>
        </View>

        {/* Recent Payouts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Payouts</Text>

          {payments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>
                No payments yet
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Your earnings will appear here once shifts are completed and payments are released.
              </Text>
            </View>
          ) : (
            payments.map((payment) => (
              <TouchableOpacity
                key={payment.id}
                style={styles.paymentCard}
                onPress={() => router.push(`/worker/earning/${payment.id}?from=/worker/earnings`)}
              >
                <View style={styles.paymentCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.paymentJobTitle}>
                      {payment.shift?.job_title || 'Shift'}
                    </Text>
                    <Text style={styles.paymentDate}>
                      {formatDate(payment.shift?.shift_date || payment.released_at)}
                    </Text>
                  </View>
                  <View style={styles.paymentAmountContainer}>
                    <Text style={styles.paymentAmount}>
                      {formatCurrency(payment.worker_payout || 0)}
                    </Text>
                  </View>
                </View>

                <View style={styles.paymentDetails}>
                  <View style={styles.paymentDetailRow}>
                    <Ionicons name="cash-outline" size={16} color="#6B7280" />
                    <Text style={styles.paymentDetailLabel}>Platform fee:</Text>
                    <Text style={styles.paymentDetailValue}>
                      {formatCurrency(payment.platform_fee)}
                    </Text>
                  </View>
                  <View style={styles.paymentDetailRow}>
                    <Ionicons name="checkmark-circle" size={16} color="#3B82F6" />
                    <Text style={styles.paymentDetailLabel}>Status:</Text>
                    <Text style={styles.paymentStatus}>Released</Text>
                  </View>
                </View>

                <View style={styles.paymentCardFooter}>
                  <Text style={styles.viewDetailsText}>View details</Text>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

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
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryCardLabel: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  summaryCardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  paymentCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  paymentCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  paymentJobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  paymentDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  paymentAmountContainer: {
    marginLeft: 12,
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  paymentDetails: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  paymentDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentDetailLabel: {
    marginLeft: 6,
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  paymentDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  paymentStatus: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  paymentCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  viewDetailsText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
});

