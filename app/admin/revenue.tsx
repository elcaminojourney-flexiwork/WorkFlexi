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
ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';

type PaymentRecord = {
  id: string;
  employer_id: string;
  subtotal: number;
  platform_fee: number;
  total_charged: number;
  status: string;
  payment_captured_at: string | null;
  released_at: string | null;
  created_at: string;
};


// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function AdminRevenue() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [lifetimeRevenue, setLifetimeRevenue] = useState(0);
  const [thisMonthRevenue, setThisMonthRevenue] = useState(0);
  const [thisWeekRevenue, setThisWeekRevenue] = useState(0);

  useEffect(() => {
    loadRevenue();
  }, []);

  const loadRevenue = async () => {
    try {
      setLoading(true);

      // Query payments where status = 'released'
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('status', 'released')
        .order('released_at', { ascending: false })
        .order('payment_captured_at', { ascending: false });

      if (paymentsError) {
        throw paymentsError;
      }

      const paymentsList = (paymentsData || []) as PaymentRecord[];
      setPayments(paymentsList);

      // Calculate revenue
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
      startOfWeek.setHours(0, 0, 0, 0);

      let lifetime = 0;
      let thisMonth = 0;
      let thisWeek = 0;

      paymentsList.forEach((payment) => {
        const fee = payment.platform_fee || 0;
        lifetime += fee;

        // Use payment_captured_at or released_at for date filtering
        const paymentDate = payment.payment_captured_at || payment.released_at;
        if (paymentDate) {
          const date = new Date(paymentDate);

          // Check if payment is in current month
          if (date >= startOfMonth) {
            thisMonth += fee;
          }

          // Check if payment is in current week
          if (date >= startOfWeek) {
            thisWeek += fee;
          }
        }
      });

      setLifetimeRevenue(lifetime);
      setThisMonthRevenue(thisMonth);
      setThisWeekRevenue(thisWeek);
    } catch (err) {
      console.error('Error loading revenue:', err);
      Alert.alert('Error', 'Unable to load revenue data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRevenue();
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

  const formatEmployerId = (id: string) => {
    return id.slice(0, 8) + '...';
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading revenue…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Platform Revenue</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Revenue Summary Cards */}
        <View style={styles.summaryContainer}>
          {/* Lifetime Revenue */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryCardHeader}>
              <Ionicons name="trophy-outline" size={24} color="#3B82F6" />
              <Text style={styles.summaryCardLabel}>Lifetime</Text>
            </View>
            <Text style={styles.summaryCardValue}>
              {formatCurrency(lifetimeRevenue)}
            </Text>
          </View>

          {/* This Month */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryCardHeader}>
              <Ionicons name="calendar-outline" size={24} color="#3B82F6" />
              <Text style={styles.summaryCardLabel}>This Month</Text>
            </View>
            <Text style={styles.summaryCardValue}>
              {formatCurrency(thisMonthRevenue)}
            </Text>
          </View>

          {/* This Week */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryCardHeader}>
              <Ionicons name="time-outline" size={24} color="#3B82F6" />
              <Text style={styles.summaryCardLabel}>This Week</Text>
            </View>
            <Text style={styles.summaryCardValue}>
              {formatCurrency(thisWeekRevenue)}
            </Text>
          </View>
        </View>

        {/* Recent Payments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Payments</Text>

          {payments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>No payments yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Revenue will appear here once payments are released.
              </Text>
            </View>
          ) : (
            payments.map((payment) => (
              <View key={payment.id} style={styles.paymentCard}>
                <View style={styles.paymentCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.paymentDate}>
                      {formatDate(payment.payment_captured_at || payment.released_at)}
                    </Text>
                    <Text style={styles.paymentEmployerId}>
                      Employer: {formatEmployerId(payment.employer_id)}
                    </Text>
                  </View>
                  <View style={styles.paymentAmountContainer}>
                    <Text style={styles.paymentAmount}>
                      {formatCurrency(payment.platform_fee)}
                    </Text>
                  </View>
                </View>

                <View style={styles.paymentDetails}>
                  <View style={styles.paymentDetailRow}>
                    <Text style={styles.paymentDetailLabel}>Subtotal:</Text>
                    <Text style={styles.paymentDetailValue}>
                      {formatCurrency(payment.subtotal)}
                    </Text>
                  </View>
                  <View style={styles.paymentDetailRow}>
                    <Text style={styles.paymentDetailLabel}>Platform Fee:</Text>
                    <Text style={styles.paymentDetailValue}>
                      {formatCurrency(payment.platform_fee)}
                    </Text>
                  </View>
                  <View style={styles.paymentDetailRow}>
                    <Text style={styles.paymentDetailLabel}>Total Charged:</Text>
                    <Text style={styles.paymentDetailValue}>
                      {formatCurrency(payment.total_charged)}
                    </Text>
                  </View>
                </View>
              </View>
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
  paymentDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  paymentEmployerId: {
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  paymentDetailLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  paymentDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
});

