import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
ImageBackground, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Button, Card, Chip } from 'react-native-paper';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';
import { checkReviewExists } from '../../services/reviews';

type Shift = {
  id: string;
  job_title: string | null;
  shift_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  hourly_rate: number | null;
  status: string | null;
};

type Application = {
  id: string;
  shift_id: string;
  status: string | null;
};

type Timesheet = {
  id: string;
  shift_id: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  employer_confirmed: boolean | null;
  dispute_raised: boolean | null;
};

type Payment = {
  id: string;
  shift_id: string;
  status: string | null;
};

type Dispute = {
  id: string;
  shift_id: string;
  timesheet_id: string;
  status: string | null;
};

type ShiftWithDetails = Shift & {
  application?: Application;
  timesheet?: Timesheet;
  payment?: Payment;
};

const tabs = [
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];


// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function WorkerMyShifts() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'open' | 'in_progress' | 'completed' | 'cancelled'
  >('open');
  const [shifts, setShifts] = useState<ShiftWithDetails[]>([]);
  const [reviewStatusMap, setReviewStatusMap] = useState<Record<string, boolean>>({}); // shift_id -> has_review

  useEffect(() => {
    loadShifts();
  }, [activeTab]);

  // Data flow: Loads shifts where worker is linked via applications/timesheets/payments
  // Filters by status only - no extra conditions (employer_confirmed, payment status, etc.)
  // Status is the source of truth for which tab a shift appears in
  // Relationships (applications/timesheets/payments) decide who sees it, not whether it appears
  const loadShifts = async () => {
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

      // Load all shifts where worker is linked via:
      // 1. Applications (worker applied)
      // 2. Timesheets (worker clocked in)
      // 3. Payments (worker was paid)
      // This ensures we capture all shifts the worker has worked on, including completed ones

      // 1. Get shift IDs from applications (ALL statuses: pending, accepted, rejected, withdrawn)
      // CRITICAL: Load ALL applications regardless of status to ensure no shifts are lost
      const { data: appsData, error: appsError } = await supabase
        .from('applications')
        .select('shift_id, status')
        .eq('worker_id', user.id);

      if (appsError) {
        console.error('Error loading applications for worker shifts:', appsError);
        throw appsError;
      }

      const applicationShiftIds = new Set((appsData || []).map((a) => a.shift_id));
      
      // Log for debugging
      console.log('Worker My Shifts - Applications loaded:', {
        total: appsData?.length || 0,
        shiftIds: Array.from(applicationShiftIds),
      });

      // 2. Get shift IDs from timesheets (worker has clocked in)
      // CRITICAL: Load ALL timesheets regardless of status to ensure no shifts are lost
      const { data: timesheetsData, error: tsError } = await supabase
        .from('timesheets')
        .select('id, shift_id, clock_in_time, clock_out_time, employer_confirmed, dispute_raised')
        .eq('worker_id', user.id);

      if (tsError) {
        console.error('Error loading timesheets for worker shifts:', tsError);
        throw tsError;
      }

      const timesheetShiftIds = new Set((timesheetsData || []).map((ts) => ts.shift_id));
      
      // Log for debugging
      console.log('Worker My Shifts - Timesheets loaded:', {
        total: timesheetsData?.length || 0,
        shiftIds: Array.from(timesheetShiftIds),
      });

      // 3. Get shift IDs from payments (worker was paid)
      // CRITICAL: Load ALL payments regardless of status to ensure no shifts are lost
      // This includes held_in_escrow, released, and any other statuses
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('shift_id, status')
        .eq('worker_id', user.id);

      if (paymentsError) {
        console.error('Error loading payments for worker shifts:', paymentsError);
        throw paymentsError;
      }

      const paymentShiftIds = new Set((paymentsData || []).map((p) => p.shift_id));
      
      // Log for debugging
      console.log('Worker My Shifts - Payments loaded:', {
        total: paymentsData?.length || 0,
        shiftIds: Array.from(paymentShiftIds),
      });

      // Combine all shift IDs (union of all three sources)
      // CRITICAL: This ensures we capture ALL shifts the worker is linked to, regardless of how
      const allShiftIds = Array.from(
        new Set([
          ...applicationShiftIds,
          ...timesheetShiftIds,
          ...paymentShiftIds,
        ])
      );

      // Log combined shift IDs for debugging
      console.log('Worker My Shifts - Combined shift IDs:', {
        fromApplications: applicationShiftIds.size,
        fromTimesheets: timesheetShiftIds.size,
        fromPayments: paymentShiftIds.size,
        totalUnique: allShiftIds.length,
        allShiftIds,
      });

      if (allShiftIds.length === 0) {
        console.log('Worker My Shifts - No shifts found for worker');
        setShifts([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Load shifts for all these IDs - CRITICAL: Load ALL shifts regardless of status
      // This ensures completed, cancelled, and any other status shifts are included
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shifts')
        .select('id, job_title, shift_date, start_time, end_time, location, hourly_rate, status')
        .in('id', allShiftIds)
        .order('shift_date', { ascending: true });

      if (shiftsError) {
        console.error('Error loading shifts for worker:', shiftsError);
        throw shiftsError;
      }

      // Log loaded shifts for debugging
      console.log('Worker My Shifts - Shifts loaded from database:', {
        requested: allShiftIds.length,
        loaded: shiftsData?.length || 0,
        shifts: (shiftsData || []).map((s) => ({ id: s.id, status: s.status, job_title: s.job_title })),
      });

      const shiftsList = (shiftsData as Shift[]) || [];

      // Debug: Log raw status values from database
      console.log('Worker My Shifts - Raw shifts from DB:', 
        shiftsList.map((s) => ({ id: s.id, status: s.status, statusType: typeof s.status }))
      );

      // Load full applications data for these shifts
      const { data: appsFullData, error: appsFullError } = await supabase
        .from('applications')
        .select('*')
        .eq('worker_id', user.id)
        .in('shift_id', allShiftIds);

      if (appsFullError) throw appsFullError;

      const applications = (appsFullData as Application[]) || [];

      // Load full timesheets data for these shifts
      const timesheets = (timesheetsData as Timesheet[]) || [];
      const timesheetMap: Record<string, Timesheet> = {};
      timesheets.forEach((ts) => {
        timesheetMap[ts.shift_id] = ts;
      });

      // Load full payments data for these shifts (not just released ones)
      const { data: paymentsFullData, error: paymentsFullError } = await supabase
        .from('payments')
        .select('id, shift_id, status')
        .eq('worker_id', user.id)
        .in('shift_id', allShiftIds);

      if (paymentsFullError) throw paymentsFullError;

      const payments = (paymentsFullData as Payment[]) || [];
      const paymentMap: Record<string, Payment> = {};
      payments.forEach((p) => {
        paymentMap[p.shift_id] = p;
      });

      // Note: Disputes do NOT change shift status
      // Shift stays 'in_progress' even when dispute is active
      // Status only changes when: worker clocks in → 'in_progress', employer confirms & pays → 'completed'

      // Combine data - Use shift.status directly from database (source of truth)
      // Status flow:
      // - 'open' → until worker clocks in
      // - 'in_progress' → when worker clocks in (stays in_progress even with disputes)
      // - 'completed' → when employer confirms & pays
      // - 'cancelled' → when shift is cancelled
      const shiftsWithDetails: ShiftWithDetails[] = shiftsList.map((shift) => {
        const app = applications.find((a) => a.shift_id === shift.id);
        const ts = timesheetMap[shift.id];
        const payment = paymentMap[shift.id];

        // Use shift.status directly from database - it's the source of truth
        // Status is updated in DB when:
        // - Worker clocks in → 'in_progress' (updated in worker/shift/[shiftId].tsx)
        // - Employer confirms & pays → 'completed' (updated in services/payments.ts)
        // - Disputes do NOT change status (shift stays 'in_progress')
        return {
          id: shift.id,
          job_title: shift.job_title,
          shift_date: shift.shift_date,
          start_time: shift.start_time,
          end_time: shift.end_time,
          location: shift.location,
          hourly_rate: shift.hourly_rate,
          status: shift.status || 'open', // Use DB status directly
          application: app,
          timesheet: ts,
          payment: payment,
        };
      });

      // Filter based on active tab - use DB status directly
      let filtered: ShiftWithDetails[] = [];

      switch (activeTab) {
        case 'open':
          // Open: status === 'open' ONLY (explicitly exclude all other statuses including draft)
          filtered = shiftsWithDetails.filter((item) => {
            return item.status === 'open'; // Only 'open' status (draft is not 'open', so excluded automatically)
          });
          break;

        case 'in_progress':
          // In Progress: status === 'in_progress'
          filtered = shiftsWithDetails.filter((item) => {
            return item.status === 'in_progress';
          });
          break;

        case 'completed':
          // Completed: status === 'completed'
          filtered = shiftsWithDetails.filter((item) => {
            return item.status === 'completed';
          });
          break;

        case 'cancelled':
          // Cancelled: status === 'cancelled' ONLY
          filtered = shiftsWithDetails.filter((item) => {
            return item.status === 'cancelled';
          });
          break;
      }

      // Log counts for debugging
      const openCount = shiftsWithDetails.filter((s) => s.status === 'open').length;
      const inProgressCount = shiftsWithDetails.filter((s) => s.status === 'in_progress').length;
      const completedCount = shiftsWithDetails.filter((s) => s.status === 'completed').length;
      const cancelledCount = shiftsWithDetails.filter((s) => s.status === 'cancelled').length;
      console.log('Worker My Shifts counts:', { openCount, inProgressCount, completedCount, cancelledCount });

      // Check review status for completed shifts
      const completedShifts = filtered.filter((s) => s.status === 'completed');
      if (completedShifts.length > 0) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const reviewChecks = await Promise.all(
            completedShifts.map(async (shift) => {
              const hasReview = await checkReviewExists(shift.id, user.id);
              return { shiftId: shift.id, hasReview };
            })
          );

          const reviewStatusData: Record<string, boolean> = {};
          reviewChecks.forEach(({ shiftId, hasReview }) => {
            reviewStatusData[shiftId] = hasReview;
          });
          setReviewStatusMap(reviewStatusData);
        }
      }

      setShifts(filtered);
    } catch (err) {
      console.error('Error loading shifts:', err);
      Alert.alert('Error', 'Failed to load your shifts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadShifts();
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

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'open':
        return '#3B82F6';
      case 'in_progress':
        return '#3B82F6';
      case 'completed':
        return '#6B7280';
      case 'cancelled':
        return '#7C3AED';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status: string | null | undefined) => {
    // CRITICAL: Use shift.status exactly as it comes from database
    // Do NOT default to 'open' or derive from other sources
    if (!status) {
      console.warn('getStatusText called with null/undefined status');
      return 'Unknown';
    }
    
    switch (status) {
      case 'open':
        return 'Open';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'draft':
        return 'Draft'; // Should never show to workers, but handle it
      default:
        // Return the actual status value, don't default to 'Open'
        console.warn('getStatusText called with unexpected status:', status);
        return status;
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading your shifts…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Button
          mode="text"
          onPress={() => router.replace('/worker')}
          icon="arrow-back"
          style={{ marginLeft: -8 }}
        >
          Back
        </Button>
        <Text style={styles.headerTitle}>My Shifts</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && styles.tabActive,
              ]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Shifts List */}
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {shifts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyStateText}>
              No {activeTab === 'open' ? 'open' : activeTab.replace('_', ' ')}{' '}
              shifts
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {activeTab === 'open' &&
                'You don\'t have any upcoming accepted shifts.'}
              {activeTab === 'in_progress' &&
                'You don\'t have any shifts in progress right now.'}
              {activeTab === 'completed' &&
                'You haven\'t completed any shifts yet.'}
              {activeTab === 'cancelled' &&
                'You don\'t have any cancelled shifts.'}
            </Text>
          </View>
        ) : (
          shifts.map((shift) => (
            <TouchableOpacity
              key={shift.id}
              onPress={() => {
                // Always navigate to shift details - the shift details page will show earning summary for completed shifts
                router.push(`/worker/shift/${shift.id}?from=/worker/my-shifts`);
              }}
              style={{ marginBottom: 12 }}
            >
              <Card mode="elevated" style={{ marginBottom: 0 }}>
                <Card.Title
                  title={shift.job_title || 'Shift'}
                  titleStyle={{ fontSize: 16, fontWeight: 'bold' }}
                  right={() => (
                    <Chip
                      mode="flat"
                      style={{ backgroundColor: getStatusColor(shift.status) }}
                      textStyle={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}
                    >
                      {getStatusText(shift.status)}
                    </Chip>
                  )}
                />
                <Card.Content>
                  <View style={styles.cardRow}>
                    <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                    <Text style={styles.cardRowText}>
                      {formatDate(shift.shift_date)}
                    </Text>
                  </View>

                  <View style={styles.cardRow}>
                    <Ionicons name="time-outline" size={14} color="#6B7280" />
                    <Text style={styles.cardRowText}>
                      {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                    </Text>
                  </View>

                  <View style={styles.cardRow}>
                    <Ionicons name="location-outline" size={14} color="#6B7280" />
                    <Text style={styles.cardRowText}>
                      {shift.location || 'Location TBD'}
                    </Text>
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={styles.hourlyRate}>
                      {shift.hourly_rate != null
                        ? `SGD$${(shift.hourly_rate || 0).toFixed(2)}/hour`
                        : 'Rate not set'}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </View>

                  {/* Action Buttons for Completed Shifts */}
                  {shift.status === 'completed' && (
                    <View style={styles.completedActions}>
                      {shift.payment?.id && (
                        <Button
                          mode="outlined"
                          onPress={(e) => {
                            e.stopPropagation(); // Prevent card navigation
                            router.push(`/worker/earning/${shift.payment!.id}?from=/worker/my-shifts`);
                          }}
                          icon="receipt"
                          textColor="#3B82F6"
                          compact
                          style={{ flex: 1, marginRight: 4 }}
                          contentStyle={{ paddingVertical: 4 }}
                        >
                          Earning Summary
                        </Button>
                      )}
                      {shift.timesheet?.id && (
                        <Button
                          mode={reviewStatusMap[shift.id] ? 'outlined' : 'outlined'}
                          onPress={(e) => {
                            e.stopPropagation(); // Prevent card navigation
                            if (reviewStatusMap[shift.id]) {
                              Alert.alert('Already Reviewed', 'You have already submitted a review for this shift.');
                            } else {
                              router.push(`/worker/review-employer/${shift.timesheet!.id}?from=/worker/my-shifts` as any);
                            }
                          }}
                          icon={reviewStatusMap[shift.id] ? 'check-circle' : 'star-outline'}
                          textColor={reviewStatusMap[shift.id] ? '#3B82F6' : '#3B82F6'}
                          buttonColor={reviewStatusMap[shift.id] ? '#EFF6FF' : undefined}
                          style={{ flex: 1, marginLeft: 4, borderColor: reviewStatusMap[shift.id] ? '#3B82F6' : undefined }}
                          compact
                          contentStyle={{ paddingVertical: 4 }}
                        >
                          {reviewStatusMap[shift.id] ? 'Reviewed' : 'Leave Review'}
                        </Button>
                      )}
                    </View>
                  )}
                </Card.Content>
              </Card>
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 40 }} />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  tabsContainer: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabsScroll: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  cardRowText: {
    fontSize: 14,
    color: '#6B7280',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  hourlyRate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  completedActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  actionButtonReviewed: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  actionButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  actionButtonTextReviewed: {
    color: '#3B82F6',
  },
});

