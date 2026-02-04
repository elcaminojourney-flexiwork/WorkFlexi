import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
ImageBackground, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Card, Chip } from 'react-native-paper';
import { supabase } from '../../../supabase';
import { Ionicons } from '@expo/vector-icons';
import { createEscrowForShift } from '../../../services/payments';
import { checkReviewExists } from '../../../services/reviews';

// Mock mode flag - matches services/payments.ts
const PAYMENTS_ENABLED = false;

const ESCROW_REQUIRED = false; // TEMPORARY: allow shifts to go live without payment

type Shift = {
  id: string;
  employer_id: string;
  title: string | null;
  job_title: string | null;
  job_role: string | null;
  industry: string | null;
  description: string | null;
  location_address: string | null;
  location: string | null;
  location_lat: number | null;
  location_lng: number | null;
  shift_date: string | null;
  start_time: string | null;
  end_time: string | null;
  hourly_rate: number | null;
  overtime_multiplier: number | null;
  workers_needed: number | null;
  max_applicants: number | null;
  accepted_count: number | null;
  required_skills: string[] | null;
  status: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  experience_level: string | null;
  total_cost: number | null;
  platform_fee: number | null;
  total_amount: number | null;
  payment_status: string | null;
};
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
};


// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function ShiftDetails() {
  const { shiftId: shiftIdParam, from } = useLocalSearchParams();
  // Normalize shiftId (Expo Router can give an array)
  const shiftId = Array.isArray(shiftIdParam) ? shiftIdParam[0] : shiftIdParam;
  const router = useRouter();
  
  // Determine back navigation - use 'from' param or smart default
  const getBackPath = () => {
    if (from && typeof from === 'string') {
      return from;
    }
    // Default fallback based on common navigation patterns
    return '/employer/my-shifts';
  };
  
  const handleBack = () => {
    router.replace(getBackPath() as any);
  };
  const [loading, setLoading] = useState(true);
  const [retryLoading, setRetryLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [shift, setShift] = useState<Shift | null>(null);
  const [timesheet, setTimesheet] = useState<Timesheet | null>(null);
  const [hasBookedWorker, setHasBookedWorker] = useState(false);
  const [bookedWorkerName, setBookedWorkerName] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [hasReview, setHasReview] = useState(false);
  const handleConfirmTimesheet = async () => {
    if (!timesheet) {
      Alert.alert('No timesheet', 'There is no timesheet to confirm yet.');
      return;
    }
    if (!timesheet.clock_in_time || !timesheet.clock_out_time) {
      Alert.alert(
        'Not finished yet',
        'You can only confirm once the worker has clocked in and out.'
      );
      return;
    }

    try {
      const { data, error } = await supabase
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

      if (error) throw error;

      setTimesheet(data as Timesheet);
      Alert.alert('Confirmed', 'Hours have been confirmed. Payment can now be released.');
    } catch (err) {
      console.log('Confirm timesheet error:', err);
      Alert.alert('Error', 'Unable to confirm this timesheet.');
    }
  };

  const handleDisputeTimesheet = async () => {
    if (!timesheet) {
      Alert.alert('No timesheet', 'There is no timesheet to dispute yet.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('timesheets')
        .update({
          dispute_raised: true,
          employer_confirmed: false,
        })
        .eq('id', timesheet.id)
        .select('*')
        .single();

      if (error) throw error;

      setTimesheet(data as Timesheet);
      Alert.alert(
        'Dispute raised',
        'We have marked this timesheet as disputed. Payment will be held.'
      );
    } catch (err) {
      console.log('Dispute timesheet error:', err);
      Alert.alert('Error', 'Unable to raise a dispute right now.');
    }
  };

  useEffect(() => {
    loadShift();
  }, []);

  const loadShift = async () => {
    try {
      setLoading(true);

      // 1) Load the shift itself
      const { data: shiftData, error: shiftError } = await supabase
        .from('shifts')
        .select('*')
        .eq('id', shiftId)
        .single();

      if (shiftError) {
        console.error('Shift load error:', shiftError);
        // Check if it's a "not found" error
        if (shiftError.code === 'PGRST116' || shiftError.message?.includes('0 rows')) {
          throw new Error('Shift not found. It may have been deleted or you may not have access to it.');
        }
        throw shiftError;
      }
      
      if (!shiftData) {
        throw new Error('Shift data is empty. Please try again.');
      }
      
      setShift(shiftData as Shift);

      // 2) Load the most recent timesheet for this shift (if any)
      const { data: tsRows, error: tsError } = await supabase
        .from('timesheets')
        .select('*')
        .eq('shift_id', shiftId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!tsError && tsRows && tsRows.length > 0) {
        setTimesheet(tsRows[0] as Timesheet);
      } else {
        setTimesheet(null);
      }

      // 3) Check if there are any accepted applications (booked workers)
      const { data: acceptedApps, error: appsError } = await supabase
        .from('applications')
        .select(`
          id,
          worker_id,
          worker:profiles!applications_worker_id_fkey (
            full_name
          )
        `)
        .eq('shift_id', shiftId)
        .eq('status', 'accepted')
        .limit(1);

      if (!appsError && acceptedApps && acceptedApps.length > 0) {
        setHasBookedWorker(true);
        const worker = (acceptedApps[0] as any)?.worker;
        setBookedWorkerName(worker?.full_name || 'Worker');
      } else {
        setHasBookedWorker(false);
        setBookedWorkerName(null);
      }

      // 4) If shift is completed, find the payment ID for invoice navigation
      // Skip payment query in mock mode to avoid RLS errors
      if (shiftData.status === 'completed') {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          if (PAYMENTS_ENABLED) {
            const { data: paymentData } = await supabase
              .from('payments')
              .select('id')
              .eq('shift_id', shiftId)
              .eq('employer_id', user.id)
              .in('status', ['released', 'mock_released'])
              .order('released_at', { ascending: false })
              .limit(1)
              .single();

            if (paymentData?.id) {
              setPaymentId(paymentData.id);
            }
          }
          // In mock mode, paymentId is not needed - invoice page will use timesheet/shift ID
          
          // Check if review already exists
          if (user && timesheet?.id) {
            const reviewed = await checkReviewExists(shiftId, user.id);
            setHasReview(reviewed);
          }
        }
      }
    } catch (err: any) {
      console.error('Shift load error:', err);
      const errorMessage = err?.message || 'Unable to load shift details.';
      console.error('Error details:', JSON.stringify(err, null, 2));
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value: string | null) => {
    if (!value) return '-';
    const d = new Date(value);
    if (isNaN(d.getTime())) {
      // handle plain date like "2025-11-25"
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
      case 'draft':
      default:
        return '#8B5CF6';
    }
  };

  const getStatusLabel = (status: string | null) => {
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
        return 'Draft';
      default:
        return status || '-';
    }
  };

  const getPaymentBadgeText = (paymentStatus: string | null) => {
    if (!paymentStatus) return 'Unpaid';
    switch (paymentStatus) {
      case 'held_in_escrow':
        return 'Escrow funded';
      case 'released':
        return 'Paid to worker';
      case 'refunded':
        return 'Refunded';
      case 'pending':
      default:
        return paymentStatus;
    }
  };

  const calculateEstimatedHours = (shift: Shift): number => {
    if (!shift.start_time || !shift.end_time) return 0;
    
    const start = new Date(shift.start_time);
    const end = new Date(shift.end_time);
    
    let totalMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    if (totalMinutes <= 0) {
      totalMinutes += 24 * 60; // Handle overnight shifts
    }
    
    const totalHours = totalMinutes / 60;
    const breakMinutes = totalHours > 6 ? 45 : 0;
    const workHoursPerWorker = (totalMinutes - breakMinutes) / 60;
    const workers = shift.workers_needed || 1;
    
    return workHoursPerWorker * workers;
  };

  // Calculate shift start datetime from shift_date + start_time
  const getShiftStartDateTime = (shift: Shift): Date | null => {
    if (!shift.shift_date || !shift.start_time) return null;
    
    try {
      // Parse shift_date (format: "YYYY-MM-DD")
      const dateParts = shift.shift_date.split('-');
      if (dateParts.length !== 3) return null;
      
      // Parse start_time (format: "HH:MM" or "HH:MM:SS" or ISO string)
      let hours = 0;
      let minutes = 0;
      
      if (shift.start_time.includes('T')) {
        // ISO string format
        const date = new Date(shift.start_time);
        hours = date.getHours();
        minutes = date.getMinutes();
      } else {
        // Time string format "HH:MM" or "HH:MM:SS"
        const timeParts = shift.start_time.split(':');
        hours = parseInt(timeParts[0] || '0', 10);
        minutes = parseInt(timeParts[1] || '0', 10);
      }
      
      const shiftStart = new Date(
        parseInt(dateParts[0], 10),
        parseInt(dateParts[1], 10) - 1, // Month is 0-indexed
        parseInt(dateParts[2], 10),
        hours,
        minutes,
        0,
        0
      );
      
      return shiftStart;
    } catch (e) {
      console.warn('Failed to parse shift start time:', e);
      return null;
    }
  };

  // Check if we're within 24 hours of shift start
  const isWithin24Hours = (shift: Shift): boolean => {
    const shiftStart = getShiftStartDateTime(shift);
    if (!shiftStart) return false;
    
    const now = new Date();
    const hoursUntilStart = (shiftStart.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return hoursUntilStart <= 24;
  };

  const handleCancelShift = async () => {
    if (!shift) return;

    // Check if worker is booked
    if (hasBookedWorker) {
      Alert.alert(
        'Cannot Cancel',
        'A worker is already booked for this shift. You cannot cancel directly. Please contact admin to request cancellation.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check 24h rule for shifts with booked workers (redundant check, but keep for safety)
    if (hasBookedWorker && isWithin24Hours(shift)) {
      Alert.alert(
        'Cannot Cancel',
        'Within 24 hours of shift start and a worker is booked. Please contact admin to request cancellation.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Cancel Shift',
      'Are you sure you want to cancel this shift? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelling(true);

              const {
                data: { user },
                error: userError,
              } = await supabase.auth.getUser();

              if (userError || !user) {
                Alert.alert('Error', 'Please login again');
                router.replace('/auth/login');
                return;
              }

              const { error } = await supabase
                .from('shifts')
                .update({
                  status: 'cancelled',
                  cancelled_at: new Date().toISOString(),
                })
                .eq('id', shift.id)
                .eq('employer_id', user.id); // Safety check: only cancel own shifts

              if (error) throw error;

              Alert.alert('Success', 'Shift has been cancelled.', [
                {
                  text: 'OK',
                  onPress: () => {
                    router.replace('/employer/my-shifts');
                  },
                },
              ]);
            } catch (err: any) {
              console.error('Cancel shift error:', err);
              Alert.alert(
                'Error',
                err?.message || 'Failed to cancel shift. Please try again.'
              );
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handleRetryPayment = async () => {
    if (!shift) {
      Alert.alert('Error', 'Shift data is not loaded. Please refresh the page.');
      return;
    }
    
    try {
      setRetryLoading(true);
      console.log('🔄 Starting retry payment for shift:', shift.id);
      
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('❌ User authentication error:', userError);
        Alert.alert('Error', 'Please login again');
        router.replace('/auth/login');
        return;
      }

      console.log('✅ User authenticated:', user.id);

      if (ESCROW_REQUIRED) {
        // Real escrow flow: create escrow, then update shift to 'open'
        if (!shift.hourly_rate) {
          Alert.alert('Error', 'Hourly rate is missing. Please edit the shift first.');
          return;
        }

        // Calculate estimated hours from shift data
        const estimatedHours = calculateEstimatedHours(shift);
        
        if (estimatedHours <= 0) {
          Alert.alert('Error', 'Invalid shift duration. Please check start and end times.');
          return;
        }

        console.log('💰 Creating escrow payment...', { estimatedHours, hourlyRate: shift.hourly_rate });

        // Create escrow payment
        const escrow = await createEscrowForShift({
          shiftId: shift.id,
          employerId: user.id,
          estimatedHours: estimatedHours,
          hourlyRate: shift.hourly_rate,
          platformFeePercentage: 0.15,
        });

        console.log('✅ Escrow created successfully:', escrow.id);

        // Update shift status to 'open'
        const { error: updateError } = await supabase
          .from('shifts')
          .update({
            status: 'open',
            payment_status: 'held_in_escrow',
          })
          .eq('id', shift.id)
          .eq('employer_id', user.id); // Safety check: only update own shifts

        if (updateError) {
          console.error('❌ Failed to update shift status:', updateError);
          console.error('Update error details:', JSON.stringify(updateError, null, 2));
          throw new Error(`Failed to update shift status: ${updateError.message || 'Unknown error'}`);
        }

        console.log('✅ Shift status updated to "open"');

        // Reload shift to reflect new status
        await loadShift();

        Alert.alert(
          'Success!',
          'Payment completed. Your shift is now open and visible to workers.',
          [{ text: 'OK' }]
        );
      } else {
        // Mock mode: skip escrow, directly update shift to 'open'
        console.log('🔄 Mock mode: Updating shift status to "open" directly...');
        
        const { error: updateError, data: updateData } = await supabase
          .from('shifts')
          .update({
            status: 'open',
            payment_status: 'pending',
          })
          .eq('id', shift.id)
          .eq('employer_id', user.id) // Safety check: only update own shifts
          .select();

        if (updateError) {
          console.error('❌ Failed to update shift status:', updateError);
          console.error('Update error details:', JSON.stringify(updateError, null, 2));
          throw new Error(`Failed to publish shift: ${updateError.message || 'Unknown error'}`);
        }

        console.log('✅ Shift status updated to "open" (mock mode):', updateData);

        // Reload shift to reflect new status
        await loadShift();

        Alert.alert(
          'Shift published (mock mode)',
          'Payment will be wired later when real Stripe is enabled.',
          [{ text: 'OK' }]
        );
      }
    } catch (err: any) {
      console.error('❌ Retry payment failed:', err);
      console.error('Error details:', JSON.stringify(err, null, 2));
      const errorMessage = err?.message || err?.toString() || 'Failed to create escrow payment. Please try again later.';
      Alert.alert(
        'Payment Failed',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setRetryLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading shift…</Text>
      </View>
    );
  }

  if (!shift) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No shift found.</Text>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={handleBack}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>

      </View>
    );
  }

  const skillsList =
    Array.isArray(shift.required_skills) && shift.required_skills.length > 0
      ? shift.required_skills
      : [];

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={handleBack}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shift details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Title + status */}
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>
              {shift.job_title || shift.title || 'Untitled shift'}
            </Text>
            {shift.job_role ? (
              <Text style={styles.subtitle}>{shift.job_role}</Text>
            ) : null}
          </View>
          <Chip
            mode="flat"
            style={{ backgroundColor: getStatusColor(shift.status) }}
            textStyle={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}
          >
            {getStatusLabel(shift.status)}
          </Chip>
        </View>

        {/* Industry + date/time + location */}
        <Card mode="elevated" style={{ marginBottom: 12 }}>
          <Card.Content>
            {shift.industry ? (
              <View style={styles.row}>
                <Ionicons name="briefcase-outline" size={16} color="#6B7280" />
                <Text style={styles.rowLabel}>Industry:</Text>
                <Text style={styles.rowValue}>{shift.industry}</Text>
              </View>
            ) : null}

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
              <Text style={styles.rowLabel}>Time:</Text>
              <Text style={styles.rowValue}>
                {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
              </Text>
            </View>

            <View style={styles.row}>
              <Ionicons name="location-outline" size={16} color="#6B7280" />
              <Text style={styles.rowLabel}>Location:</Text>
              <Text style={styles.rowValue}>
                {shift.location || shift.location_address || 'Singapore'}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Requirements */}
        <Card mode="elevated" style={{ marginBottom: 12 }}>
          <Card.Title title="Requirements" titleStyle={{ fontSize: 16, fontWeight: 'bold' }} />
          <Card.Content>

          <View style={styles.row}>
            <Ionicons name="people-outline" size={16} color="#6B7280" />
            <Text style={styles.rowLabel}>Workers needed:</Text>
            <Text style={styles.rowValue}>
              {shift.workers_needed ?? '-'}
            </Text>
          </View>

          <View style={styles.row}>
            <Ionicons name="checkmark-done-outline" size={16} color="#6B7280" />
            <Text style={styles.rowLabel}>Experience level:</Text>
            <Text style={styles.rowValue}>
              {shift.experience_level || 'Any'}
            </Text>
          </View>

            <View style={styles.skillsContainer}>
              <Text style={styles.sectionLabel}>Required skills</Text>
              {skillsList.length === 0 ? (
                <Text style={styles.emptySubText}>No specific skills listed.</Text>
              ) : (
                <View style={styles.chipRow}>
                  {skillsList.map((skill) => (
                    <View key={skill} style={styles.chip}>
                      <Text style={styles.chipText}>{skill}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </Card.Content>
        </Card>

        {/* Description */}
        {shift.description ? (
          <Card mode="elevated" style={{ marginBottom: 12 }}>
            <Card.Title title="Shift description" titleStyle={{ fontSize: 16, fontWeight: 'bold' }} />
            <Card.Content>
              <Text style={styles.descriptionText}>{shift.description}</Text>
            </Card.Content>
          </Card>
        ) : null}

        {/* Draft shift warning */}
        {shift.status === 'draft' && (
          <View style={styles.draftWarningCard}>
            <View style={styles.draftWarningHeader}>
              <Ionicons name="alert-circle" size={24} color="#8B5CF6" />
              <Text style={styles.draftWarningTitle}>Draft Shift</Text>
            </View>
            <Text style={styles.draftWarningText}>
              {ESCROW_REQUIRED 
                ? 'Payment failed earlier. Your shift is saved as draft. Complete payment to publish it.'
                : 'Your shift is saved as draft. Click "Publish Shift" to make it visible to workers.'}
            </Text>
            <Button
              mode="contained"
              onPress={handleRetryPayment}
              loading={retryLoading}
              disabled={retryLoading}
              icon={ESCROW_REQUIRED ? "credit-card" : "publish"}
              buttonColor="#3B82F6"
              style={{ marginVertical: 8 }}
              contentStyle={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
            >
              {ESCROW_REQUIRED ? 'Retry payment' : 'Publish Shift'}
            </Button>
          </View>
        )}

        {/* Payment / Escrow */}
        <Card mode="elevated" style={{ marginBottom: 12 }}>
          <Card.Title title="Payment & escrow" titleStyle={{ fontSize: 16, fontWeight: 'bold' }} />
          <Card.Content>
            <View style={styles.row}>
              <Ionicons name="cash-outline" size={16} color="#6B7280" />
              <Text style={styles.rowLabel}>Hourly rate:</Text>
              <Text style={styles.rowValue}>
                {shift.hourly_rate != null ? `SGD$${(shift.hourly_rate).toFixed(2)}` : '-'}
              </Text>
            </View>

            <View style={styles.row}>
              <Ionicons name="timer-outline" size={16} color="#6B7280" />
              <Text style={styles.rowLabel}>Overtime multiplier:</Text>
              <Text style={styles.rowValue}>
                {shift.overtime_multiplier != null
                  ? `× ${shift.overtime_multiplier}`
                  : '× 1.0'}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Worker cost:</Text>
              <Text style={styles.rowValueBold}>
              {shift.total_cost != null ? `SGD$${(shift.total_cost).toFixed(2)}` : '-'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Platform fee (15%):</Text>
            <Text style={styles.rowValueBold}>
              {shift.platform_fee != null ? `SGD$${(shift.platform_fee).toFixed(2)}` : '-'}
            </Text>
          </View>

          <View style={styles.rowTotal}>
            <Text style={styles.totalLabel}>Total to hold in escrow:</Text>
            <Text style={styles.totalValue}>
              {shift.total_amount != null ? `SGD$${(shift.total_amount).toFixed(2)}` : '-'}
            </Text>
          </View>

            <View style={styles.escrowBadgeRow}>
              <View style={styles.escrowBadge}>
                <Ionicons name="shield-checkmark" size={18} color="#3B82F6" />
                <Text style={styles.escrowBadgeText}>
                  {getPaymentBadgeText(shift.payment_status)}
                </Text>
              </View>
              <Text style={styles.escrowHint}>
                Payment is held securely in escrow and released after shift
                completion.
              </Text>
            </View>
          </Card.Content>
        </Card>

        {timesheet && (
          <View style={styles.timesheetButtonWrapper}>
            <Button
              mode="contained"
              onPress={() => router.push(`/employer/timesheet/${timesheet.id}?from=/employer/shift/${shiftId}`)}
              icon="file-document"
              style={{ marginVertical: 8 }}
              contentStyle={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
            >
              View full timesheet
            </Button>
          </View>
        )}

        {/* Booked worker warning */}
        {hasBookedWorker && shift.status !== 'cancelled' && shift.status !== 'completed' && (
          <View style={styles.warningCard}>
            <View style={styles.warningHeader}>
              <Ionicons name="alert-circle" size={20} color="#8B5CF6" />
              <Text style={styles.warningTitle}>Worker Booked</Text>
            </View>
            <Text style={styles.warningText}>
              {bookedWorkerName && (
                <Text style={styles.warningTextBold}>
                  {bookedWorkerName} is booked for this shift.{'\n'}
                </Text>
              )}
              You cannot cancel directly.
              {isWithin24Hours(shift) && ' Within 24 hours of shift start, please contact admin to request cancellation.'}
            </Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          {/* View applications - only if not completed */}
          {shift.status !== 'completed' && (
            <Button
              mode="outlined"
              onPress={() => router.push(`/employer/applications?shiftId=${shift.id}&from=/employer/shift/${shiftId}`)}
              icon="account-group"
              textColor="#8B5CF6"
              style={{ marginVertical: 4 }}
              contentStyle={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
            >
              Applications
            </Button>
          )}

          {/* View Invoice - only if completed */}
          {shift.status === 'completed' && (
            <Button
              mode="outlined"
              onPress={() => {
                // If paymentId exists, use it; otherwise use timesheet or shift to generate invoice
                if (paymentId) {
                  router.push(`/employer/payment/${paymentId}?from=/employer/shift/${shiftId}`);
                } else if (timesheet?.id) {
                  // Use timesheet ID to generate invoice from timesheet data
                  router.push(`/employer/timesheet/${timesheet.id}/invoice?from=/employer/shift/${shiftId}`);
                } else if (shift.id) {
                  // Fallback: use shift ID (invoice page will handle loading timesheet)
                  router.push(`/employer/timesheet/${shift.id}/invoice?from=/employer/shift/${shiftId}`);
                }
              }}
              icon="receipt"
              textColor="#8B5CF6"
              style={{ marginVertical: 4 }}
              contentStyle={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
            >
              View Invoice
            </Button>
          )}

          {/* Review Worker - only if completed */}
          {shift.status === 'completed' && timesheet?.id && (
            <Button
              mode={hasReview ? 'outlined' : 'outlined'}
              onPress={() => {
                if (hasReview) {
                  Alert.alert('Already Reviewed', 'You have already submitted a review for this shift.');
                } else {
                  router.push(`/employer/review-worker/${timesheet.id}?from=/employer/shift/${shiftId}` as any);
                }
              }}
              icon={hasReview ? 'check-circle' : 'star-outline'}
              textColor={hasReview ? '#3B82F6' : '#8B5CF6'}
              style={{ marginVertical: 4 }}
              contentStyle={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
            >
              {hasReview ? 'Reviewed' : 'Review Worker'}
            </Button>
          )}

          {/* Edit shift - only if not cancelled or completed */}
          {shift.status !== 'cancelled' && shift.status !== 'completed' && (
            <Button
              mode="outlined"
              onPress={() => router.push(`/employer/edit-shift?shiftId=${shift.id}&from=/employer/shift/${shiftId}`)}
              icon="pencil"
              textColor="#8B5CF6"
              style={{ marginVertical: 4 }}
              contentStyle={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
            >
              Edit
            </Button>
          )}

          {/* Cancel shift - only if no booked worker and not already cancelled/completed */}
          {!hasBookedWorker &&
            shift.status !== 'cancelled' &&
            shift.status !== 'completed' && (
              <Button
                mode="outlined"
                onPress={handleCancelShift}
                loading={cancelling}
                disabled={cancelling}
                icon="close-circle"
                textColor="#7C3AED"
                buttonColor="#EDE9FE"
                style={{ marginVertical: 4, borderColor: '#FCA5A5' }}
                contentStyle={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
              >
                Cancel Shift
              </Button>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
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
    minWidth: 110,
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
  rowTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
    justifyContent: 'space-between',
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
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  escrowBadgeRow: {
    marginTop: 12,
  },
  escrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  escrowBadgeText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
  },
  escrowHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280',
  },
  skillsContainer: {
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  emptySubText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  chip: {
    backgroundColor: '#F3E8FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  chipText: {
    fontSize: 12,
    color: '#6D28D9',
    fontWeight: '500',
  },
  descriptionText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8B5CF6',
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  secondaryButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  timesheetActionsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: COLORS.purple600,
  },
  confirmButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disputeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  disputeButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#5B21B6',
  },
  timesheetButtonWrapper: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  timesheetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    paddingVertical: 12,
    backgroundColor: '#8B5CF6',
  },
  timesheetButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  draftWarningCard: {
    backgroundColor: '#FAF5FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  draftWarningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  draftWarningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6D28D9',
    marginLeft: 8,
  },
  draftWarningText: {
    fontSize: 14,
    color: '#9A3412',
    lineHeight: 20,
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  retryButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  warningCard: {
    backgroundColor: '#FAF5FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#6D28D9',
    marginLeft: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#9A3412',
    lineHeight: 18,
  },
  warningTextBold: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#9A3412',
  },
  cancelButton: {
    borderColor: '#FCA5A5',
    backgroundColor: '#EDE9FE',
  },
  cancelButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
  },
  reviewedButton: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  reviewedButtonText: {
    color: '#3B82F6',
  },
});
