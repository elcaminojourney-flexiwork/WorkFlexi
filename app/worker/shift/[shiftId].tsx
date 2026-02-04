  import React, { useEffect, useState } from 'react';
  import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
    Platform,
  ImageBackground, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
  import { useLocalSearchParams, useRouter, usePathname } from 'expo-router';
import { Button } from 'react-native-paper';
import { supabase } from '../../../supabase';
import ConstitutionalScreen, { CardWhite, PanelPurple, PanelBlue } from '../../../components/ConstitutionalScreen';
import { Ionicons } from '@expo/vector-icons';
import { DateTimePicker } from '../../../components/ui/DateTimePicker';
import { calculateHoursFromTimes } from '../../../services/timesheets';
import { checkReviewExists } from '../../../services/reviews';
import { createNotification } from '../../../services/notifications';

type Shift = {
  id: string;
  job_title: string | null;
  title: string | null;
  industry: string | null;
  description: string | null;
  location: string | null;
  location_address: string | null;
  shift_date: string | null;
  start_time: string | null;
  end_time: string | null;
  hourly_rate: number | null;
  overtime_multiplier: number | null;
  status: string | null;
};

  type Application = {
    id: string;
    status: string | null;
  };

  type Timesheet = {
    id: string;
    clock_in_time: string | null;
    clock_out_time: string | null;
    break_duration_minutes: number | null;
    total_minutes: number | null;
    billable_minutes: number | null;
    total_hours: number | null;
    regular_hours: number | null;
    overtime_hours: number | null;
    employer_confirmed: boolean | null;
    dispute_raised: boolean | null;
    worker_confirmed: boolean | null;
  };

  
// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function WorkerShiftDetails() {
    const { shiftId: shiftIdParam, from } = useLocalSearchParams();
    // Normalize shiftId (Expo Router can give an array)
    const shiftId = Array.isArray(shiftIdParam) ? shiftIdParam[0] : shiftIdParam;
    const router = useRouter();
    const pathname = usePathname();
    
    // Determine back navigation - use 'from' param or smart default
    const getBackPath = () => {
      if (from && typeof from === 'string') {
        return from;
      }
      
      // Check if we came from my-shifts or applications based on referrer
      // Since we can't access browser history, use smart defaults
      // Default to browse-shifts, but can be overridden by 'from' param
      return '/worker/browse-shifts';
    };
    
    const handleBack = () => {
      router.replace(getBackPath() as any);
    };

    const [loading, setLoading] = useState(true);
    const [shift, setShift] = useState<Shift | null>(null);
    const [applying, setApplying] = useState(false);
    const [alreadyApplied, setAlreadyApplied] = useState(false);
    const [application, setApplication] = useState<Application | null>(null);
    const [timesheet, setTimesheet] = useState<Timesheet | null>(null);
    const [paymentId, setPaymentId] = useState<string | null>(null);
    const [hasReview, setHasReview] = useState(false);

    const [showClockInPicker, setShowClockInPicker] = useState(false);
    const [clockInTime, setClockInTime] = useState(new Date());
    const [isEditingClockIn, setIsEditingClockIn] = useState(false);

    const [showClockOutPicker, setShowClockOutPicker] = useState(false);
    const [clockOutTime, setClockOutTime] = useState(new Date());
    const [isEditingClockOut, setIsEditingClockOut] = useState(false);

    useEffect(() => {
      loadShift();
    }, []);

    const loadShift = async () => {
      try {
        setLoading(true);

        // Load shift
        const { data: shiftData, error: shiftError } = await supabase
          .from('shifts')
          .select('*')
          .eq('id', shiftId)
          .single();

        if (shiftError) {
          console.error('❌ Shift load error:', shiftError);
          Alert.alert('Error', `Unable to load shift: ${shiftError.message}`);
          router.back();
          return;
        }

        if (!shiftData) {
          Alert.alert('Error', 'Shift not found');
          router.back();
          return;
        }

        setShift(shiftData);

        // Load worker
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) return;

        // Check whether worker already applied + get status
        const { data: apps, error: appsError } = await supabase
          .from('applications')
          .select('id, status')
          .eq('worker_id', user.id)
          .eq('shift_id', shiftId)
          .limit(1);

        if (appsError) throw appsError;

        if (apps && apps.length > 0) {
          const app = apps[0];
          setAlreadyApplied(true);
          setApplication(app);

          // If there is an application, try to load latest timesheet for this worker & shift
          const { data: tsRows, error: tsError } = await supabase
            .from('timesheets')
            .select('*')
            .eq('shift_id', shiftId)
            .eq('worker_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (!tsError && tsRows && tsRows.length > 0) {
            const ts = tsRows[0];
            // Ensure we have the fields we need
            setTimesheet({
              ...ts,
              employer_confirmed: ts.employer_confirmed || false,
              dispute_raised: ts.dispute_raised || false,
            });
          }
        }

        // If shift is completed, find the payment ID for earning detail navigation
        if (shiftData.status === 'completed') {
          const { data: paymentData, error: paymentError } = await supabase
            .from('payments')
            .select('id')
            .eq('shift_id', shiftId)
            .eq('worker_id', user.id)
            .in('status', ['released', 'mock_released'])
            .order('released_at', { ascending: false })
            .limit(1)
            .maybeSingle(); // Use maybeSingle() instead of single() to avoid PGRST116 when no payment exists

          // Only set payment ID if payment exists (ignore error if no payment found)
          if (!paymentError && paymentData?.id) {
            setPaymentId(paymentData.id);
          }

          // Check if review already exists
          if (user) {
            const reviewed = await checkReviewExists(shiftId, user.id);
            setHasReview(reviewed);
          }
        }
      } catch (err) {
        console.error('❌ Shift load error:', err);
        console.error('Error details:', JSON.stringify(err, null, 2));
        if (err instanceof Error) {
          console.error('Error message:', err.message);
          console.error('Error stack:', err.stack);
        }
        Alert.alert('Error', 'Unable to load shift details');
      } finally {
        setLoading(false);
      }
    };

    const applyForShift = async () => {
      try {
        setApplying(true);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          Alert.alert('Error', 'Please login again');
          router.replace('/auth/select-user-type');
          return;
        }

        // Check if shift already has 3 or more active applications
        const { data: existingApps, error: countError } = await supabase
          .from('applications')
          .select('id')
          .eq('shift_id', shiftId)
          .in('status', ['pending', 'accepted']); // Active statuses

        if (countError) {
          console.error('Error checking applications:', countError);
          Alert.alert('Error', 'Unable to check shift availability');
          return;
        }

        const activeAppCount = (existingApps || []).length;
        if (activeAppCount >= 3) {
          Alert.alert(
            'Shift Full',
            'This shift already has enough applicants. Please choose another shift.'
          );
          return;
        }

        // 🔥 Get the employer_id from the shift
        const { data: shiftData, error: shiftError } = await supabase
          .from('shifts')
          .select('employer_id')
          .eq('id', shiftId)
          .single();

        if (shiftError || !shiftData) {
          Alert.alert('Error', 'Unable to find shift details');
          return;
        }

        // ✅ Insert application WITH employer_id
        const { error: insertError } = await supabase.from('applications').insert({
          shift_id: shiftId,
          worker_id: user.id,
          employer_id: shiftData.employer_id,
          status: 'pending',
        });

        if (insertError) throw insertError;

        // Notify employer about new application
        try {
          console.log('🔵 [APPLICATION] Starting notification process for employer...', {
            employerId: shiftData.employer_id,
            shiftId,
            workerId: user.id,
          });

          const { data: shiftInfo, error: shiftInfoError } = await supabase
            .from('shifts')
            .select('job_title')
            .eq('id', shiftId)
            .single();
          
          if (shiftInfoError) {
            console.error('🔴 [APPLICATION] Error fetching shift info for notification:', shiftInfoError);
          }

          if (shiftData.employer_id) {
            const { data: workerProfile, error: workerProfileError } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', user.id)
              .single();

            if (workerProfileError) {
              console.error('🔴 [APPLICATION] Error fetching worker profile for notification:', workerProfileError);
            }

            const notificationOptions = {
              userId: shiftData.employer_id,
              type: 'application' as const,
              title: 'New Application',
              message: `${workerProfile?.full_name || 'A worker'} applied for your shift: ${shiftInfo?.job_title || 'Shift'}`,
              link: `/employer/shift/${shiftId}`,
            };

            console.log('🔵 [APPLICATION] Creating notification for employer:', notificationOptions);

            const notificationResult = await createNotification(notificationOptions);

            if (notificationResult?.id) {
              console.log('✅ [APPLICATION] Notification created successfully for employer:', {
                notificationId: notificationResult.id,
                employerId: shiftData.employer_id,
              });
            } else {
              console.warn('⚠️ [APPLICATION] Notification creation returned null for employer:', {
                employerId: shiftData.employer_id,
              });
            }
          } else {
            console.warn('⚠️ [APPLICATION] No employer_id found for shift, cannot send notification');
          }
        } catch (notifErr) {
          console.error('🔴 [APPLICATION] Error notifying employer about application (non-critical):', notifErr);
          console.error('🔴 [APPLICATION] Error details:', JSON.stringify(notifErr, null, 2));
          // Don't fail application if notification fails
        }

        setAlreadyApplied(true);
        Alert.alert('Success', 'Your application has been sent!');
      } catch (err) {
        console.log('Apply error:', err);
        Alert.alert('Error', 'Unable to apply');
      } finally {
        setApplying(false);
      }
    };

    // ---- CLOCK IN HANDLERS ----
    const handleClockInPress = () => {
      // Always use time picker - default to current time or existing time if editing
      const defaultTime = timesheet?.clock_in_time
        ? new Date(timesheet.clock_in_time)
        : new Date();
      
      setClockInTime(defaultTime);
      setIsEditingClockIn(false);
      setShowClockInPicker(true);
    };

    const handleEditClockIn = () => {
      if (!timesheet?.clock_in_time) return;
      
      const existingTime = new Date(timesheet.clock_in_time);
      setClockInTime(existingTime);
      setIsEditingClockIn(true);
      setShowClockInPicker(true);
    };

    const handleClockIn = async (selectedTime: Date) => {
      try {
        if (!shiftId) {
          Alert.alert('Error', 'Shift ID is missing.');
          return;
        }

        if (!application || application.status !== 'accepted') {
          Alert.alert(
            'Not accepted yet',
            'You can only clock in after the employer has accepted you for this shift.'
          );
          return;
        }

        // Check if timesheet is locked (employer confirmed or dispute raised)
        if (timesheet?.employer_confirmed || timesheet?.dispute_raised) {
          Alert.alert(
            'Timesheet Locked',
            'This timesheet has been confirmed by the employer and cannot be edited.'
          );
          return;
        }

        // 🔐 Make sure we know who the worker is
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          console.log('Clock-in auth error:', userError);
          Alert.alert('Error', 'Please login again.');
          return;
        }

        if (isEditingClockIn && timesheet) {
          // Update existing timesheet
          let updateData: any = {
            clock_in_time: selectedTime.toISOString(),
          };

          // If clock-out already exists, recalculate hours
          if (timesheet.clock_out_time) {
            const clockIn = new Date(selectedTime);
            const clockOut = new Date(timesheet.clock_out_time);

            // Validate clock-out is after clock-in
            let diffMinutes = Math.round(
              (clockOut.getTime() - clockIn.getTime()) / (1000 * 60)
            );

            // Handle overnight shifts
            if (diffMinutes <= 0) {
              diffMinutes += 24 * 60;
            }

            if (diffMinutes <= 0) {
              Alert.alert(
                'Invalid Time',
                'Clock-out time cannot be earlier than clock-in time. Please select a valid time.'
              );
              return;
            }

            // Recalculate hours using centralized function
            const calculation = calculateHoursFromTimes({
              clockIn: clockIn.toISOString(),
              clockOut: clockOut.toISOString(),
              minimumHours: 4,
              overtimeThresholdHours: 8,
            });

            updateData = {
              ...updateData,
              break_duration_minutes: calculation.breakMinutes,
              total_minutes: calculation.totalMinutes,
              billable_minutes: calculation.billableMinutes,
              total_hours: calculation.billableHours,
              regular_hours: calculation.regularHours,
              overtime_hours: calculation.overtimeHours,
            };
          }

          const { data, error } = await supabase
            .from('timesheets')
            .update(updateData)
            .eq('id', timesheet.id)
            .select()
            .single();

          if (error) {
            console.log('Supabase update error:', error);
            Alert.alert('Error', 'Unable to update clock-in time.');
            return;
          }

          setTimesheet(data);
          
          // Update shift status to 'in_progress' when worker clocks in
          // Only update if shift is not already 'completed' or 'cancelled' (final states)
          const { data: currentShift, error: shiftQueryError } = await supabase
            .from('shifts')
            .select('id, status')
            .eq('id', shiftId)
            .single();

          if (shiftQueryError) {
            console.error('❌ Failed to query shift status:', shiftQueryError);
            Alert.alert('Warning', 'Clock-in saved but could not update shift status. Please refresh.');
          } else if (currentShift) {
            // Update to 'in_progress' if shift is not in a final state
            if (currentShift.status !== 'completed' && currentShift.status !== 'cancelled') {
              // Use database function to update shift status (bypasses RLS timing issues)
              const { error: shiftUpdateError } = await supabase.rpc(
                'update_shift_status_to_in_progress',
                {
                  p_shift_id: shiftId,
                  p_worker_id: user.id,
                }
              );

              if (shiftUpdateError) {
                console.error('❌ Failed to update shift status to in_progress:', shiftUpdateError);
                console.error('Error details:', JSON.stringify(shiftUpdateError, null, 2));
                Alert.alert('Warning', 'Clock-in saved but shift status update failed. Please refresh.');
              } else {
                console.log('✅ Shift status updated to in_progress on clock-in', { 
                  shiftId, 
                  previousStatus: currentShift.status,
                  newStatus: 'in_progress'
                });
                // Refresh shift data to show updated status
                try {
                  await loadShift();
                } catch (loadError) {
                  console.error('❌ Error refreshing shift data after status update:', loadError);
                  // Don't show alert here - the timesheet update already succeeded
                  // Just log the error for debugging
                }
              }
            } else {
              console.log('⚠️ Shift is in final state, skipping status update', { 
                shiftId, 
                status: currentShift.status 
              });
            }
          }

          Alert.alert('Success', 'Clock-in time updated.');
        } else {
          // Insert a new timesheet row
          const { data, error } = await supabase
            .from('timesheets')
            .insert({
              shift_id: shiftId,
              worker_id: user.id,
              application_id: application.id,
              clock_in_time: selectedTime.toISOString(),
              clock_in_confirmed_by_employer: false,
            })
            .select()
            .single();

          if (error) {
            console.log('Supabase insert error:', error);
            Alert.alert(
              'Error',
              error.message || 'Unable to save clock-in time.'
            );
            return;
          }

          setTimesheet(data);
          
          // Notify employer that worker has clocked in
          try {
            const { data: shiftInfo } = await supabase
              .from('shifts')
              .select('employer_id, job_title')
              .eq('id', shiftId)
              .single();
            
            const { data: workerProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', user.id)
              .single();

            if (shiftInfo?.employer_id) {
              await createNotification({
                userId: shiftInfo.employer_id,
                type: 'timesheet',
                title: 'Worker Clocked In',
                message: `${workerProfile?.full_name || 'Worker'} has clocked in for shift: ${shiftInfo?.job_title || 'Shift'}. Please confirm.`,
                link: `/employer/timesheet/${data.id}`,
              });
            }

            // Also notify worker as confirmation
            await createNotification({
              userId: user.id,
              type: 'timesheet',
              title: 'Clocked In Successfully',
              message: `You've clocked in for "${shiftInfo?.job_title || 'shift'}". Waiting for employer confirmation.`,
              link: `/worker/shift/${shiftId}`,
            });
          } catch (notifErr) {
            console.error('Error sending clock-in notifications (non-critical):', notifErr);
            // Don't fail clock-in if notification fails
          }
          
          // Update shift status to 'in_progress' when worker clocks in
          // Only update if shift is not already 'completed' or 'cancelled' (final states)
          const { data: currentShift, error: shiftQueryError } = await supabase
            .from('shifts')
            .select('id, status')
            .eq('id', shiftId)
            .single();

          if (shiftQueryError) {
            console.error('❌ Failed to query shift status:', shiftQueryError);
            Alert.alert('Warning', 'Clock-in saved but could not update shift status. Please refresh.');
          } else if (currentShift) {
            // Update to 'in_progress' if shift is not in a final state
            if (currentShift.status !== 'completed' && currentShift.status !== 'cancelled') {
              // Use database function to update shift status (bypasses RLS timing issues)
              const { error: shiftUpdateError } = await supabase.rpc(
                'update_shift_status_to_in_progress',
                {
                  p_shift_id: shiftId,
                  p_worker_id: user.id,
                }
              );

              if (shiftUpdateError) {
                console.error('❌ Failed to update shift status to in_progress:', shiftUpdateError);
                console.error('Error details:', JSON.stringify(shiftUpdateError, null, 2));
                Alert.alert('Warning', 'Clock-in saved but shift status update failed. Please refresh.');
              } else {
                console.log('✅ Shift status updated to in_progress on clock-in', { 
                  shiftId, 
                  previousStatus: currentShift.status,
                  newStatus: 'in_progress'
                });
                // Refresh shift data to show updated status
                try {
                  await loadShift();
                } catch (loadError) {
                  console.error('❌ Error refreshing shift data after status update:', loadError);
                  // Don't show alert here - the timesheet update already succeeded
                  // Just log the error for debugging
                }
              }
            } else {
              console.log('⚠️ Shift is in final state, skipping status update', { 
                shiftId, 
                status: currentShift.status 
              });
            }
          }

          Alert.alert('Success', 'You clocked in successfully.');
        }
      } catch (err: any) {
        console.log('Clock-in JS error:', err);
        Alert.alert('Error', err?.message || 'Unable to save clock-in time.');
      }
    };

    // ---- CLOCK OUT HANDLERS ----
    const handleClockOutPress = () => {
      // Always use time picker - default to current time or existing time if editing
      const defaultTime = timesheet?.clock_out_time
        ? new Date(timesheet.clock_out_time)
        : new Date();
      
      setClockOutTime(defaultTime);
      setIsEditingClockOut(false);
      setShowClockOutPicker(true);
    };

    const handleEditClockOut = () => {
      if (!timesheet?.clock_out_time) return;
      
      const existingTime = new Date(timesheet.clock_out_time);
      setClockOutTime(existingTime);
      setIsEditingClockOut(true);
      setShowClockOutPicker(true);
    };

    const handleClockOut = async (selectedTime: Date) => {
      try {
        if (!timesheet || !timesheet.clock_in_time) {
          Alert.alert(
            'Not clocked in',
            'You need to clock in before you can clock out.'
          );
          return;
        }

        // Check if timesheet is locked (employer confirmed or dispute raised)
        if (timesheet.employer_confirmed || timesheet.dispute_raised) {
          Alert.alert(
            'Timesheet Locked',
            'This timesheet has been confirmed by the employer and cannot be edited.'
          );
          return;
        }

        const clockIn = new Date(timesheet.clock_in_time);
        const clockOut = new Date(selectedTime);

        // Validate clock-out is after clock-in
        let diffMinutes = Math.round(
          (clockOut.getTime() - clockIn.getTime()) / (1000 * 60)
        );

        // Handle overnight shifts
        if (diffMinutes <= 0) {
          diffMinutes += 24 * 60;
        }

        if (diffMinutes <= 0) {
          Alert.alert(
            'Invalid Time',
            'Clock-out time cannot be earlier than clock-in time. Please select a valid time.'
          );
          return;
        }

        // Use centralized calculation function
        const calculation = calculateHoursFromTimes({
          clockIn: clockIn.toISOString(),
          clockOut: clockOut.toISOString(),
          minimumHours: 4,
          overtimeThresholdHours: 8,
        });

        // Update timesheet with calculated values
        const updateData: any = {
          clock_out_time: clockOut.toISOString(),
          break_duration_minutes: calculation.breakMinutes,
          total_minutes: calculation.totalMinutes,
          billable_minutes: calculation.billableMinutes,
          total_hours: calculation.billableHours,
          regular_hours: calculation.regularHours,
          overtime_hours: calculation.overtimeHours,
          worker_confirmed: true,
        };

        const { data, error } = await supabase
          .from('timesheets')
          .update(updateData)
          .eq('id', timesheet.id)
          .select('*')
          .single();

        if (error) {
          console.error('Clock-out error:', error);
          Alert.alert('Error', 'Unable to save clock-out time.');
          return;
        }

        setTimesheet(data);

        // Notify employer that worker has clocked out
        try {
          const { data: shiftInfo } = await supabase
            .from('shifts')
            .select('employer_id, job_title')
            .eq('id', shiftId)
            .single();
          
          const { data: workerProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

          if (shiftInfo?.employer_id) {
            await createNotification({
              userId: shiftInfo.employer_id,
              type: 'timesheet',
              title: 'Worker Clocked Out',
              message: `${workerProfile?.full_name || 'Worker'} has clocked out for shift: ${shiftInfo?.job_title || 'Shift'}. Please confirm.`,
              link: `/employer/timesheet/${timesheet.id}`,
            });
          }

          // Also notify worker as confirmation
          await createNotification({
            userId: user.id,
            type: 'timesheet',
            title: 'Clocked Out Successfully',
            message: `You've clocked out for "${shiftInfo?.job_title || 'shift'}". Waiting for employer confirmation.`,
            link: `/worker/shift/${shiftId}`,
          });
        } catch (notifErr) {
          console.error('Error sending clock-out notifications (non-critical):', notifErr);
          // Don't fail clock-out if notification fails
        }
        
        if (isEditingClockOut) {
          Alert.alert('Success', 'Clock-out time updated.');
        } else {
          Alert.alert(
            'Clocked out',
            'Your hours have been submitted to the employer for confirmation.'
          );
        }
      } catch (err) {
        console.log('Clock-out error:', err);
        Alert.alert('Error', 'Unable to clock out right now.');
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

    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading shift…</Text>
        </View>
      );
    }

    if (!shift) {
      return (
        <View style={styles.center}>
          <Text>No shift found.</Text>
          <Button
            mode="outlined"
            onPress={handleBack}
            icon="arrow-back"
            style={{ marginVertical: 8 }}
          >
            Back
          </Button>
        </View>
      );
    }

    return (
      <ConstitutionalScreen title="Shift details" showBack onBack={handleBack} showLogo theme="light">
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>
            {shift.job_title || shift.title || 'Shift'}
          </Text>

          <PanelPurple style={{ marginBottom: 12 }}>
            <View>
              <View style={styles.row}>
                <Ionicons name="briefcase-outline" size={16} color="#6B7280" />
                <Text style={styles.rowLabel}>Industry:</Text>
                <Text style={styles.rowValue}>{shift.industry}</Text>
              </View>

              <View style={styles.row}>
                <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                <Text style={styles.rowLabel}>Date:</Text>
                <Text style={styles.rowValue}>
                  {shift.shift_date ? formatDate(shift.shift_date) : '-'}
                </Text>
              </View>

              <View style={styles.row}>
                <Ionicons name="time-outline" size={16} color="#6B7280" />
                <Text style={styles.rowLabel}>Time:</Text>
                <Text style={styles.rowValue}>
                  {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                </Text>
              </View>
            </View>
          </PanelPurple>

          <PanelBlue style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>Location</Text>
            <Text style={styles.descriptionText}>
              {shift.location || shift.location_address}
            </Text>
          </PanelBlue>

          <PanelPurple style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>Description</Text>
            <Text style={styles.descriptionText}>{shift.description}</Text>
          </PanelPurple>

          <PanelBlue style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>Rate</Text>
            <Text style={styles.rateText}>
              SGD${(shift.hourly_rate || 0).toFixed(2)}/hour (×{shift.overtime_multiplier} OT)
            </Text>
          </PanelBlue>

          {/* Timesheet section for accepted workers */}
          {application && application.status === 'accepted' && (
            <PanelPurple style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>Your timesheet</Text>
              <View>

              {/* Case 1: not clocked in yet */}
              {!timesheet || !timesheet.clock_in_time ? (
                <>
                  <Text style={styles.timesheetText}>
                    When you arrive at the workplace, tap clock-in to start
                    tracking your hours.
                  </Text>

                  <Button
                    mode="contained"
                    onPress={handleClockInPress}
                    icon="play-circle"
                    buttonColor="#3B82F6"
                    style={{ marginTop: 8 }}
                    contentStyle={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
                  >
                    Clock in
                  </Button>
                </>
              ) : !timesheet.clock_out_time ? (
                /* Case 2: clocked in but not clocked out yet */
                <>
                  <View style={styles.timesheetRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.timesheetLabel}>Clock In:</Text>
                      <Text style={styles.timesheetText}>
                        {formatTime(timesheet.clock_in_time)} on{' '}
                        {formatDate(timesheet.clock_in_time)}
                      </Text>
                    </View>
                    {!timesheet.employer_confirmed && !timesheet.dispute_raised && (
                      <Button
                        mode="text"
                        onPress={handleEditClockIn}
                        icon="pencil"
                        textColor="#3B82F6"
                        compact
                        style={{ paddingHorizontal: 8 }}
                      >
                        Edit
                      </Button>
                    )}
                  </View>
                  <Text style={styles.timesheetSubText}>
                    When your shift ends, tap clock-out to submit your hours.
                  </Text>

                  <Button
                    mode="contained"
                    onPress={handleClockOutPress}
                    icon="stop-circle"
                    buttonColor="#6D28D9"
                    style={{ marginTop: 8 }}
                    contentStyle={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
                  >
                    Clock out
                  </Button>
                </>
              ) : (
                /* Case 3: fully submitted */
                <>
                  <View style={styles.timesheetRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.timesheetLabel}>Clock In:</Text>
                      <Text style={styles.timesheetText}>
                        {formatTime(timesheet.clock_in_time)} on{' '}
                        {formatDate(timesheet.clock_in_time)}
                      </Text>
                    </View>
                    {!timesheet.employer_confirmed && !timesheet.dispute_raised && (
                      <Button
                        mode="text"
                        onPress={handleEditClockIn}
                        icon="pencil"
                        textColor="#3B82F6"
                        compact
                        style={{ paddingHorizontal: 8 }}
                      >
                        Edit
                      </Button>
                    )}
                  </View>

                  <View style={styles.timesheetRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.timesheetLabel}>Clock Out:</Text>
                      <Text style={styles.timesheetText}>
                        {formatTime(timesheet.clock_out_time)} on{' '}
                        {formatDate(timesheet.clock_out_time)}
                      </Text>
                    </View>
                    {!timesheet.employer_confirmed && !timesheet.dispute_raised && (
                      <Button
                        mode="text"
                        onPress={handleEditClockOut}
                        icon="pencil"
                        textColor="#3B82F6"
                        compact
                        style={{ paddingHorizontal: 8 }}
                      >
                        Edit
                      </Button>
                    )}
                  </View>

                  {timesheet.employer_confirmed ? (
                    <View style={styles.lockedNotice}>
                      <Ionicons name="lock-closed" size={16} color="#6B7280" />
                      <Text style={styles.lockedText}>
                        Timesheet confirmed by employer. Times cannot be edited.
                      </Text>
                    </View>
                  ) : timesheet.dispute_raised ? (
                    <View style={styles.lockedNotice}>
                      <Ionicons name="alert-circle" size={16} color="#7C3AED" />
                      <Text style={styles.lockedText}>
                        Timesheet has an active dispute. Times cannot be edited.
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.timesheetSubText}>
                      Timesheet submitted. Waiting for employer confirmation.
                    </Text>
                  )}

                  <View style={styles.hoursSummary}>
                    <Text style={styles.hoursSummaryTitle}>Hours Summary:</Text>
                    <Text style={styles.hoursSummaryText}>
                      Total: {typeof timesheet.total_hours === 'number'
                        ? timesheet.total_hours.toFixed(2)
                        : timesheet.total_hours || '0.00'} hours
                    </Text>
                    <Text style={styles.hoursSummaryText}>
                      Regular: {typeof timesheet.regular_hours === 'number'
                        ? timesheet.regular_hours.toFixed(2)
                        : timesheet.regular_hours || '0.00'} hours
                    </Text>
                    <Text style={styles.hoursSummaryText}>
                      Overtime: {typeof timesheet.overtime_hours === 'number'
                        ? timesheet.overtime_hours.toFixed(2)
                        : timesheet.overtime_hours || '0.00'} hours
                    </Text>
                    <Text style={styles.hoursSummaryText}>
                      Break: {timesheet.break_duration_minutes != null
                        ? timesheet.break_duration_minutes
                        : 0} minutes
                    </Text>
                  </View>
                </>
              )}
              </View>
            </PanelPurple>
          )}

          {/* Completed shift - View Earnings & Review */}
          {shift.status === 'completed' && (
            <PanelBlue style={{ marginBottom: 12 }}>
              <View>
                <View style={styles.completedNotice}>
                  <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.completedTitle}>Shift Completed</Text>
                    <Text style={styles.completedText}>
                      This shift has been completed and payment has been released.
                      {paymentId || timesheet?.id
                        ? ' View your earning summary to see the payout details.'
                        : ' View your earnings to see all payouts.'}
                    </Text>
                  </View>
                </View>
              <View style={styles.completedActions}>
                {paymentId ? (
                  <Button
                    mode="contained"
                    onPress={() => router.push(`/worker/earning/${paymentId}`)}
                    icon="receipt"
                    style={{ flex: 1, marginRight: 4 }}
                    contentStyle={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
                  >
                    Earning Summary
                  </Button>
                ) : timesheet?.id ? (
                  <Button
                    mode="contained"
                    onPress={() => router.push(`/worker/timesheet/${timesheet.id}/earning?from=/worker/shift/${shiftId}`)}
                    icon="receipt"
                    style={{ flex: 1, marginRight: 4 }}
                    contentStyle={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
                  >
                    Earning Summary
                  </Button>
                ) : (
                  <Button
                    mode="contained"
                        onPress={() => router.push(`/worker/earnings?from=/worker/shift/${shiftId}`)}
                    icon="cash"
                    style={{ flex: 1, marginRight: 4 }}
                    contentStyle={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
                  >
                    View Earnings
                  </Button>
                )}
                {timesheet?.id && (
                  <Button
                    mode={hasReview ? 'outlined' : 'contained'}
                    onPress={() => {
                      if (hasReview) {
                        Alert.alert('Already Reviewed', 'You have already submitted a review for this shift.');
                      } else {
                        router.push(`/worker/review-employer/${timesheet.id}?from=/worker/shift/${shiftId}` as any);
                      }
                    }}
                    icon={hasReview ? 'check-circle' : 'star-outline'}
                    buttonColor={hasReview ? undefined : '#3B82F6'}
                    textColor={hasReview ? '#3B82F6' : '#FFFFFF'}
                    style={{ flex: 1, marginLeft: 4 }}
                    contentStyle={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
                  >
                    {hasReview ? 'Reviewed' : 'Review Employer'}
                  </Button>
                )}
              </View>
              </View>
            </PanelBlue>
          )}

          {/* APPLICATION STATUS / APPLY BUTTON */}
          {shift.status === 'open' && !alreadyApplied ? (
            // Worker hasn't applied yet - show Apply button
            <Button
              mode="contained"
              onPress={applyForShift}
              loading={applying}
              disabled={applying}
              style={{ marginVertical: 16 }}
              contentStyle={{ paddingVertical: 8 }}
              buttonColor="#3B82F6"
            >
              Apply for this shift
            </Button>
          ) : shift.status === 'open' && alreadyApplied && application ? (
            // Worker has applied - show application status
            <CardWhite style={{ marginVertical: 16 }}>
              <View>
                {application.status === 'pending' ? (
                  <>
                    <View style={styles.appliedBox}>
                      <Ionicons name="time-outline" size={22} color="#A855F7" />
                      <Text style={[styles.appliedText, { color: '#A855F7' }]}>
                        Application Pending
                      </Text>
                    </View>
                    <Text style={styles.statusSubtext}>
                      Your application is under review. The employer will notify you soon.
                    </Text>
                  </>
                ) : application.status === 'accepted' ? (
                  <>
                    <View style={styles.appliedBox}>
                      <Ionicons name="checkmark-circle" size={22} color="#3B82F6" />
                      <Text style={[styles.appliedText, { color: '#3B82F6' }]}>
                        Application Accepted!
                      </Text>
                    </View>
                    <Text style={styles.statusSubtext}>
                      Congratulations! You've been accepted for this shift. Be ready to clock in when the shift starts.
                    </Text>
                  </>
                ) : application.status === 'rejected' ? (
                  <>
                    <View style={styles.appliedBox}>
                      <Ionicons name="close-circle" size={22} color="#7C3AED" />
                      <Text style={[styles.appliedText, { color: '#7C3AED' }]}>
                        Application Rejected
                      </Text>
                    </View>
                    <Text style={styles.statusSubtext}>
                      Unfortunately, your application was not accepted for this shift.
                    </Text>
                  </>
                ) : application.status === 'withdrawn' ? (
                  <>
                    <View style={styles.appliedBox}>
                      <Ionicons name="information-circle" size={22} color="#6B7280" />
                      <Text style={[styles.appliedText, { color: '#6B7280' }]}>
                        Application Withdrawn
                      </Text>
                    </View>
                    <Text style={styles.statusSubtext}>
                      You withdrew your application for this shift. You can apply again if you change your mind.
                    </Text>
                    <Button
                      mode="outlined"
                      onPress={applyForShift}
                      loading={applying}
                      disabled={applying}
                      style={{ marginTop: 12 }}
                      buttonColor="#3B82F6"
                    >
                      Apply Again
                    </Button>
                  </>
                ) : (
                  <View style={styles.appliedBox}>
                    <Ionicons name="checkmark-circle" size={22} color="#3B82F6" />
                    <Text style={styles.appliedText}>You already applied</Text>
                  </View>
                )}
              </View>
            </CardWhite>
          ) : shift.status !== 'open' && shift.status !== 'completed' ? (
            <View style={styles.appliedBox}>
              <Ionicons name="information-circle" size={22} color="#6B7280" />
              <Text style={styles.appliedText}>This shift is {shift.status}</Text>
            </View>
          ) : null}

          {/* CLOCK IN TIME PICKER */}
          {showClockInPicker && (
            Platform.OS === 'web' ? (
              <View style={{ marginVertical: 12, padding: 12, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB' }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Clock In Time</Text>
                {/* @ts-ignore - Web-only HTML input */}
                <input
                  type="time"
                  value={`${clockInTime.getHours().toString().padStart(2, '0')}:${clockInTime.getMinutes().toString().padStart(2, '0')}`}
                  onChange={(e: any) => {
                    if (e.target.value) {
                      const [hours, minutes] = e.target.value.split(':');
                      let finalDate = new Date(clockInTime);
                      finalDate.setHours(parseInt(hours, 10));
                      finalDate.setMinutes(parseInt(minutes, 10));
                      
                      // Build full datetime using shift date if available
                      if (shift?.shift_date) {
                        const shiftDate = new Date(shift.shift_date + 'T00:00:00');
                        finalDate = new Date(
                          shiftDate.getFullYear(),
                          shiftDate.getMonth(),
                          shiftDate.getDate(),
                          parseInt(hours, 10),
                          parseInt(minutes, 10),
                          0,
                          0
                        );
                      }
                      setClockInTime(finalDate);
                    }
                  }}
                  onBlur={(e: any) => {
                    // Save when user finishes editing - read value directly from input
                    if (e.target.value) {
                      const [hours, minutes] = e.target.value.split(':');
                      let finalDate = new Date(clockInTime);
                      finalDate.setHours(parseInt(hours, 10));
                      finalDate.setMinutes(parseInt(minutes, 10));
                      
                      // Build full datetime using shift date if available
                      if (shift?.shift_date) {
                        const shiftDate = new Date(shift.shift_date + 'T00:00:00');
                        finalDate = new Date(
                          shiftDate.getFullYear(),
                          shiftDate.getMonth(),
                          shiftDate.getDate(),
                          parseInt(hours, 10),
                          parseInt(minutes, 10),
                          0,
                          0
                        );
                      }
                      setClockInTime(finalDate);
                      handleClockIn(finalDate);
                    }
                    setShowClockInPicker(false);
                    setIsEditingClockIn(false);
                  }}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '16px',
                    fontFamily: 'inherit',
                    width: '100%',
                  }}
                />
              </View>
            ) : (
              <DateTimePicker
                value={clockInTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  // always close the picker when user acts
                  setShowClockInPicker(false);

                  // if user picked a time (not cancelled)
                  if (selectedDate) {
                    // Build full datetime using shift date if available
                    let finalDate = new Date(selectedDate);
                    if (shift?.shift_date) {
                      const shiftDate = new Date(shift.shift_date + 'T00:00:00');
                      finalDate = new Date(
                        shiftDate.getFullYear(),
                        shiftDate.getMonth(),
                        shiftDate.getDate(),
                        selectedDate.getHours(),
                        selectedDate.getMinutes(),
                        0,
                        0
                      );
                    }
                    setClockInTime(finalDate);
                    // Save to Supabase with selected time
                    handleClockIn(finalDate);
                  }
                  setIsEditingClockIn(false);
                }}
              />
            )
          )}

          {/* CLOCK OUT TIME PICKER */}
          {showClockOutPicker && (
            Platform.OS === 'web' ? (
              <View style={{ marginVertical: 12, padding: 12, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB' }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Clock Out Time</Text>
                {/* @ts-ignore - Web-only HTML input */}
                <input
                  type="time"
                  value={`${clockOutTime.getHours().toString().padStart(2, '0')}:${clockOutTime.getMinutes().toString().padStart(2, '0')}`}
                  onChange={(e: any) => {
                    if (e.target.value) {
                      const [hours, minutes] = e.target.value.split(':');
                      let finalDate = new Date(clockOutTime);
                      finalDate.setHours(parseInt(hours, 10));
                      finalDate.setMinutes(parseInt(minutes, 10));
                      
                      // Build full datetime using shift date if available
                      if (shift?.shift_date) {
                        const shiftDate = new Date(shift.shift_date + 'T00:00:00');
                        finalDate = new Date(
                          shiftDate.getFullYear(),
                          shiftDate.getMonth(),
                          shiftDate.getDate(),
                          parseInt(hours, 10),
                          parseInt(minutes, 10),
                          0,
                          0
                        );
                      }
                      setClockOutTime(finalDate);
                    }
                  }}
                  onBlur={(e: any) => {
                    // Save when user finishes editing - read value directly from input
                    if (e.target.value) {
                      const [hours, minutes] = e.target.value.split(':');
                      let finalDate = new Date(clockOutTime);
                      finalDate.setHours(parseInt(hours, 10));
                      finalDate.setMinutes(parseInt(minutes, 10));
                      
                      // Build full datetime using shift date if available
                      if (shift?.shift_date) {
                        const shiftDate = new Date(shift.shift_date + 'T00:00:00');
                        finalDate = new Date(
                          shiftDate.getFullYear(),
                          shiftDate.getMonth(),
                          shiftDate.getDate(),
                          parseInt(hours, 10),
                          parseInt(minutes, 10),
                          0,
                          0
                        );
                      }
                      setClockOutTime(finalDate);
                      handleClockOut(finalDate);
                    }
                    setShowClockOutPicker(false);
                    setIsEditingClockOut(false);
                  }}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '16px',
                    fontFamily: 'inherit',
                    width: '100%',
                  }}
                />
              </View>
            ) : (
              <DateTimePicker
                value={clockOutTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  // close the picker
                  setShowClockOutPicker(false);

                  // if user picked a time (not cancelled)
                  if (selectedDate) {
                    // Build full datetime using shift date if available
                    let finalDate = new Date(selectedDate);
                    if (shift?.shift_date) {
                      const shiftDate = new Date(shift.shift_date + 'T00:00:00');
                      finalDate = new Date(
                        shiftDate.getFullYear(),
                        shiftDate.getMonth(),
                        shiftDate.getDate(),
                        selectedDate.getHours(),
                        selectedDate.getMinutes(),
                        0,
                        0
                      );
                    }
                    setClockOutTime(finalDate);
                    // Save to Supabase with chosen time
                    handleClockOut(finalDate);
                  }
                  setIsEditingClockOut(false);
                }}
              />
            )
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
    container: {
      flex: 1,
      padding: 20,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: '#6B7280',
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      color: '#111827',
      marginBottom: 16,
    },
    card: {
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#111827',
      marginBottom: 8,
    },
    row: {
      flexDirection: 'row',
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
    descriptionText: {
      fontSize: 14,
      color: '#374151',
    },
    rateText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#3B82F6',
    },
    applyButton: {
      backgroundColor: '#3B82F6',
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
    },
    applyButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: 'bold',
    },
    appliedBox: {
      marginTop: 20,
      backgroundColor: '#EFF6FF',
      borderRadius: 12,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      justifyContent: 'center',
    },
    appliedText: {
      fontSize: 14,
      color: '#1E40AF',
      fontWeight: '600',
    },
    statusSubtext: {
      fontSize: 13,
      color: '#6B7280',
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 18,
    },
    backButton: {
      marginTop: 16,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#3B82F6',
    },
    backButtonText: {
      color: '#3B82F6',
      fontWeight: '600',
    },
    timesheetText: {
      fontSize: 14,
      color: '#374151',
      marginBottom: 8,
    },
    timesheetSubText: {
      fontSize: 12,
      color: '#6B7280',
      marginBottom: 12,
    },
    clockButton: {
      marginTop: 8,
      backgroundColor: '#3B82F6', // worker = blue
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    clockButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '600',
      marginLeft: 8,
    },
    timesheetRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    timesheetLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: '#6B7280',
      marginBottom: 4,
    },
    editButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: '#EFF6FF',
    },
    editButtonText: {
      marginLeft: 4,
      fontSize: 12,
      fontWeight: '600',
      color: '#3B82F6',
    },
    lockedNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.9)',
      padding: 8,
      borderRadius: 6,
      marginTop: 8,
    },
    lockedText: {
      marginLeft: 6,
      fontSize: 12,
      color: '#6B7280',
    },
    hoursSummary: {
      marginTop: 12,
      padding: 12,
      backgroundColor: 'transparent',
      borderRadius: 8,
    },
    hoursSummaryTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#111827',
      marginBottom: 6,
    },
    hoursSummaryText: {
      fontSize: 13,
      color: '#374151',
      marginBottom: 2,
    },
    completedNotice: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    completedTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#111827',
      marginBottom: 4,
    },
    completedText: {
      fontSize: 14,
      color: '#6B7280',
      lineHeight: 20,
    },
    completedActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    completedActionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#3B82F6',
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 12,
    },
    reviewButton: {
      backgroundColor: '#3B82F6',
    },
    reviewedButton: {
      backgroundColor: '#3B82F6',
    },
    completedActionButtonText: {
      marginLeft: 6,
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });
