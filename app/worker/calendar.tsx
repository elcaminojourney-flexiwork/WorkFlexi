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
  Modal,
ImageBackground, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Button, Card, Chip, SegmentedButtons, Portal } from 'react-native-paper';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';

type Shift = {
  id: string;
  job_title: string | null;
  title: string | null;
  industry: string | null;
  description: string | null;
  shift_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  location_address: string | null;
  hourly_rate: number | null;
  overtime_multiplier: number | null;
  status: string | null;
};

type Application = {
  id: string;
  shift_id: string;
  status: string | null;
};

type ShiftWithApplication = Shift & {
  application?: Application;
};


// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function WorkerCalendar() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<ShiftWithApplication[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedShift, setSelectedShift] = useState<ShiftWithApplication | null>(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [loadingShiftDetails, setLoadingShiftDetails] = useState(false);

  useEffect(() => {
    loadShifts();
  }, []);

  const loadShifts = async () => {
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

      // Load all shifts where worker is linked via applications/timesheets/payments
      // Same logic as my-shifts.tsx
      const { data: appsData } = await supabase
        .from('applications')
        .select('shift_id, status')
        .eq('worker_id', user.id);

      const { data: timesheetsData } = await supabase
        .from('timesheets')
        .select('shift_id')
        .eq('worker_id', user.id);

      const { data: paymentsData } = await supabase
        .from('payments')
        .select('shift_id')
        .eq('worker_id', user.id);

      const allShiftIds = Array.from(
        new Set([
          ...(appsData || []).map((a) => a.shift_id),
          ...(timesheetsData || []).map((ts: any) => ts.shift_id),
          ...(paymentsData || []).map((p: any) => p.shift_id),
        ])
      );

      if (allShiftIds.length === 0) {
        setShifts([]);
        return;
      }

      // Load shifts with all necessary fields for popup
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shifts')
        .select('id, job_title, title, industry, description, shift_date, start_time, end_time, location, location_address, hourly_rate, overtime_multiplier, status')
        .in('id', allShiftIds)
        .order('shift_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (shiftsError) throw shiftsError;

      // Load applications for status
      const { data: appsFullData } = await supabase
        .from('applications')
        .select('*')
        .eq('worker_id', user.id)
        .in('shift_id', allShiftIds);

      const appMap: Record<string, Application> = {};
      (appsFullData || []).forEach((app: any) => {
        if (!appMap[app.shift_id] || app.status === 'accepted') {
          appMap[app.shift_id] = app;
        }
      });

      const shiftsWithApps: ShiftWithApplication[] = (shiftsData || []).map((shift: any) => ({
        ...shift,
        application: appMap[shift.id],
      }));

      setShifts(shiftsWithApps);
    } catch (err) {
      console.error('Error loading shifts for calendar:', err);
      Alert.alert('Error', 'Failed to load shifts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadShifts();
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-SG', {
      day: 'numeric',
      month: 'short',
    });
  };

  const formatDateFull = (date: Date | string | null) => {
    if (!date) return '-';
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return typeof date === 'string' ? date : '-';
    return dateObj.toLocaleDateString('en-SG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getDaysInWeek = (date: Date): Date[] => {
    const day = date.getDay();
    const diff = date.getDate() - day;
    const startOfWeek = new Date(date.getFullYear(), date.getMonth(), date.getDate() - day);
    startOfWeek.setHours(0, 0, 0, 0);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(startOfWeek.getDate() + i);
      days.push(dayDate);
    }
    return days;
  };

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];
    
    // Add days from previous month to fill first week
    const startDay = firstDay.getDay();
    for (let i = startDay - 1; i >= 0; i--) {
      const prevDay = new Date(year, month, -i);
      days.push(prevDay);
    }
    
    // Add all days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    // Add days from next month to fill last week
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }
    
    return days;
  };

  const getShiftsForDate = (date: Date): ShiftWithApplication[] => {
    const dateStr = date.toISOString().split('T')[0];
    return shifts.filter((shift) => {
      if (!shift.shift_date) return false;
      const shiftDate = shift.shift_date.split('T')[0];
      return shiftDate === dateStr;
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(null);
  };

  const getStatusColor = (status: string | null, appStatus: string | null) => {
    if (status === 'completed') return '#3B82F6';
    if (status === 'in_progress') return '#3B82F6';
    if (status === 'cancelled') return '#7C3AED';
    if (appStatus === 'accepted') return '#3B82F6';
    if (appStatus === 'pending') return '#FBBF24';
    if (appStatus === 'rejected') return '#7C3AED';
    return '#6B7280';
  };

  const getStatusLabel = (status: string | null, appStatus: string | null) => {
    if (status === 'completed') return 'Completed';
    if (status === 'in_progress') return 'In Progress';
    if (status === 'cancelled') return 'Cancelled';
    if (appStatus === 'accepted') return 'Accepted';
    if (appStatus === 'pending') return 'Pending';
    if (appStatus === 'rejected') return 'Rejected';
    return 'Unknown';
  };

  const handleShiftPress = async (shift: ShiftWithApplication) => {
    setSelectedShift(shift);
    setShowShiftModal(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading calendar...</Text>
      </View>
    );
  }

  const days = viewMode === 'week' ? getDaysInWeek(currentDate) : getDaysInMonth(currentDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calendar</Text>
        <TouchableOpacity onPress={goToToday}>
          <Text style={styles.todayButton}>Today</Text>
        </TouchableOpacity>
      </View>

      {/* View Mode Toggle */}
      <View style={styles.viewModeContainer}>
        <SegmentedButtons
          value={viewMode}
          onValueChange={(value) => setViewMode(value as 'week' | 'month')}
          buttons={[
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      {/* Navigation */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          onPress={() => viewMode === 'week' ? navigateWeek('prev') : navigateMonth('prev')}
          style={styles.navButton}
        >
          <Ionicons name="chevron-back" size={24} color="#3B82F6" />
        </TouchableOpacity>
        
        <Text style={styles.currentDateText}>
          {viewMode === 'week'
            ? `${formatDate(days[0])} - ${formatDate(days[6])}`
            : currentDate.toLocaleDateString('en-SG', { month: 'long', year: 'numeric' })}
        </Text>
        
        <TouchableOpacity
          onPress={() => viewMode === 'week' ? navigateWeek('next') : navigateMonth('next')}
          style={styles.navButton}
        >
          <Ionicons name="chevron-forward" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {/* Calendar View */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {viewMode === 'week' ? (
          // Week View
          <View style={styles.weekContainer}>
            {days.map((day, index) => {
              const dayShifts = getShiftsForDate(day);
              const isToday = day.toDateString() === today.toDateString();
              const isSelected = selectedDate?.toDateString() === day.toDateString();
              
              return (
                <View key={index} style={styles.weekDay}>
                  <TouchableOpacity
                    style={[
                      styles.dayHeader,
                      isToday && styles.todayHeader,
                      isSelected && styles.selectedHeader,
                    ]}
                    onPress={() => setSelectedDate(day)}
                  >
                    <Text style={[styles.dayName, isToday && styles.todayText]}>
                      {day.toLocaleDateString('en-SG', { weekday: 'short' })}
                    </Text>
                    <Text style={[styles.dayNumber, isToday && styles.todayText]}>
                      {day.getDate()}
                    </Text>
                  </TouchableOpacity>
                  
                  <View style={styles.shiftsContainer}>
                    {dayShifts.length === 0 ? (
                      <Text style={styles.noShiftsText}>No shifts</Text>
                    ) : (
                      dayShifts.slice(0, 3).map((shift) => (
                        <TouchableOpacity
                          key={shift.id}
                          style={[
                            styles.shiftDot,
                            { backgroundColor: getStatusColor(shift.status, shift.application?.status || null) },
                          ]}
                          onPress={() => handleShiftPress(shift)}
                        >
                          <Text style={styles.shiftDotText} numberOfLines={1}>
                            {formatTime(shift.start_time)}
                          </Text>
                        </TouchableOpacity>
                      ))
                    )}
                    {dayShifts.length > 3 && (
                      <Text style={styles.moreShiftsText}>+{dayShifts.length - 3} more</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          // Month View
          <View style={styles.monthContainer}>
            {/* Weekday headers */}
            <View style={styles.weekdayHeaders}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                <Text key={index} style={styles.weekdayHeader}>
                  {day}
                </Text>
              ))}
            </View>
            
            {/* Calendar grid */}
            <View style={styles.calendarGrid}>
              {days.map((day, index) => {
                const dayShifts = getShiftsForDate(day);
                const isToday = day.toDateString() === today.toDateString();
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                const isSelected = selectedDate?.toDateString() === day.toDateString();
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.calendarDay,
                      !isCurrentMonth && styles.otherMonthDay,
                      isToday && styles.todayDay,
                      isSelected && styles.selectedDay,
                    ]}
                    onPress={() => setSelectedDate(day)}
                  >
                    <Text
                      style={[
                        styles.calendarDayNumber,
                        !isCurrentMonth && styles.otherMonthText,
                        isToday && styles.todayText,
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                    {dayShifts.length > 0 && (
                      <View style={styles.shiftIndicators}>
                        {dayShifts.slice(0, 3).map((shift, shiftIndex) => (
                          <View
                            key={shiftIndex}
                            style={[
                              styles.shiftIndicator,
                              { backgroundColor: getStatusColor(shift.status, shift.application?.status || null) },
                            ]}
                          />
                        ))}
                        {dayShifts.length > 3 && (
                          <Text style={styles.moreIndicator}>+{dayShifts.length - 3}</Text>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Selected Date Details */}
        {selectedDate && (
          <View style={styles.selectedDateSection}>
            <Text style={styles.selectedDateTitle}>
              {formatDateFull(selectedDate)}
            </Text>
            {getShiftsForDate(selectedDate).length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content style={styles.emptyCardContent}>
                  <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
                  <Text style={styles.emptyCardText}>No shifts on this day</Text>
                </Card.Content>
              </Card>
            ) : (
              getShiftsForDate(selectedDate).map((shift) => (
                <Card
                  key={shift.id}
                  style={styles.shiftCard}
                  onPress={() => handleShiftPress(shift)}
                >
                  <Card.Content>
                    <View style={styles.shiftCardHeader}>
                      <Text style={styles.shiftCardTitle}>
                        {shift.job_title || 'Shift'}
                      </Text>
                      <Chip
                        mode="flat"
                        style={{
                          backgroundColor: getStatusColor(shift.status, shift.application?.status || null),
                        }}
                        textStyle={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}
                      >
                        {getStatusLabel(shift.status, shift.application?.status || null)}
                      </Chip>
                    </View>
                    
                    <View style={styles.shiftCardRow}>
                      <Ionicons name="time-outline" size={16} color="#6B7280" />
                      <Text style={styles.shiftCardText}>
                        {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                      </Text>
                    </View>
                    
                    {shift.location && (
                      <View style={styles.shiftCardRow}>
                        <Ionicons name="location-outline" size={16} color="#6B7280" />
                        <Text style={styles.shiftCardText}>{shift.location}</Text>
                      </View>
                    )}
                    
                    {shift.hourly_rate && (
                      <View style={styles.shiftCardRow}>
                        <Ionicons name="cash-outline" size={16} color="#6B7280" />
                        <Text style={styles.shiftCardText}>
                          SGD${shift.hourly_rate.toFixed(2)}/hour
                        </Text>
                      </View>
                    )}
                  </Card.Content>
                </Card>
              ))
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Shift Details Modal */}
      <Portal>
        <Modal
          visible={showShiftModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowShiftModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {selectedShift && (
                <>
                  {/* Modal Header */}
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>
                      {selectedShift.job_title || selectedShift.title || 'Shift'}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowShiftModal(false)}
                      style={styles.closeButton}
                    >
                      <Ionicons name="close" size={24} color="#111827" />
                    </TouchableOpacity>
                  </View>

                  {/* Modal Body */}
                  <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                    {/* Status Chip */}
                    <View style={styles.modalStatusContainer}>
                      <Chip
                        mode="flat"
                        style={{
                          backgroundColor: getStatusColor(selectedShift.status, selectedShift.application?.status || null),
                          alignSelf: 'flex-start',
                        }}
                        textStyle={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}
                      >
                        {getStatusLabel(selectedShift.status, selectedShift.application?.status || null)}
                      </Chip>
                    </View>

                    {/* Date and Time */}
                    <Card style={styles.modalCard}>
                      <Card.Content>
                        <View style={styles.modalRow}>
                          <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
                          <View style={styles.modalRowContent}>
                            <Text style={styles.modalRowLabel}>Date</Text>
                            <Text style={styles.modalRowValue}>
                              {formatDateFull(selectedShift.shift_date)}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.modalRow}>
                          <Ionicons name="time-outline" size={20} color="#3B82F6" />
                          <View style={styles.modalRowContent}>
                            <Text style={styles.modalRowLabel}>Time</Text>
                            <Text style={styles.modalRowValue}>
                              {formatTime(selectedShift.start_time)} - {formatTime(selectedShift.end_time)}
                            </Text>
                          </View>
                        </View>
                      </Card.Content>
                    </Card>

                    {/* Industry */}
                    {selectedShift.industry && (
                      <Card style={styles.modalCard}>
                        <Card.Content>
                          <View style={styles.modalRow}>
                            <Ionicons name="business-outline" size={20} color="#3B82F6" />
                            <View style={styles.modalRowContent}>
                              <Text style={styles.modalRowLabel}>Industry</Text>
                              <Text style={styles.modalRowValue}>{selectedShift.industry}</Text>
                            </View>
                          </View>
                        </Card.Content>
                      </Card>
                    )}

                    {/* Location */}
                    {(selectedShift.location || selectedShift.location_address) && (
                      <Card style={styles.modalCard}>
                        <Card.Title title="Location" titleStyle={{ fontSize: 16, fontWeight: 'bold' }} />
                        <Card.Content>
                          <Text style={styles.modalDescriptionText}>
                            {selectedShift.location || selectedShift.location_address}
                          </Text>
                        </Card.Content>
                      </Card>
                    )}

                    {/* Description */}
                    {selectedShift.description && (
                      <Card style={styles.modalCard}>
                        <Card.Title title="Description" titleStyle={{ fontSize: 16, fontWeight: 'bold' }} />
                        <Card.Content>
                          <Text style={styles.modalDescriptionText}>
                            {selectedShift.description}
                          </Text>
                        </Card.Content>
                      </Card>
                    )}

                    {/* Payment */}
                    {selectedShift.hourly_rate && (
                      <Card style={styles.modalCard}>
                        <Card.Content>
                          <View style={styles.modalRow}>
                            <Ionicons name="cash-outline" size={20} color="#3B82F6" />
                            <View style={styles.modalRowContent}>
                              <Text style={styles.modalRowLabel}>Hourly Rate</Text>
                              <Text style={styles.modalRowValue}>
                                SGD${(selectedShift.hourly_rate || 0).toFixed(2)}/hour
                                {selectedShift.overtime_multiplier && selectedShift.overtime_multiplier > 1 && (
                                  <Text style={styles.modalOvertimeText}>
                                    {' '}(×{selectedShift.overtime_multiplier} OT)
                                  </Text>
                                )}
                              </Text>
                            </View>
                          </View>
                        </Card.Content>
                      </Card>
                    )}

                    {/* Action Button */}
                    <Button
                      mode="contained"
                      onPress={() => {
                        setShowShiftModal(false);
                        router.push(`/worker/shift/${selectedShift.id}`);
                      }}
                      style={styles.modalActionButton}
                      contentStyle={styles.modalActionButtonContent}
                    >
                      View Full Details
                    </Button>
                  </ScrollView>
                </>
              )}
            </View>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({

  logoBox: { position: 'absolute', top: Platform.OS === 'web' ? 16 : 52, left: 16, zIndex: 1000, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, padding: 8, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  logo: { width: 32, height: 32 },

  container: {
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
    marginTop: 12,
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  todayButton: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  viewModeContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  segmentedButtons: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  navButton: {
    padding: 8,
  },
  currentDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  weekContainer: {
    padding: 12,
  },
  weekDay: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  todayHeader: {
    backgroundColor: '#EFF6FF',
    padding: 8,
    borderRadius: 8,
    margin: -8,
    marginBottom: 0,
  },
  selectedHeader: {
    backgroundColor: '#DBEAFE',
  },
  dayName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  todayText: {
    color: '#3B82F6',
  },
  shiftsContainer: {
    gap: 6,
  },
  shiftDot: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  shiftDotText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  noShiftsText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  moreShiftsText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  monthContainer: {
    padding: 12,
  },
  weekdayHeaders: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  weekdayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    padding: 4,
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 4,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  otherMonthDay: {
    backgroundColor: 'transparent',
  },
  todayDay: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    borderWidth: 2,
  },
  selectedDay: {
    backgroundColor: '#DBEAFE',
  },
  calendarDayNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  otherMonthText: {
    color: '#9CA3AF',
  },
  shiftIndicators: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    width: '100%',
    justifyContent: 'center',
  },
  shiftIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  moreIndicator: {
    fontSize: 8,
    color: '#6B7280',
    fontWeight: '600',
  },
  selectedDateSection: {
    padding: 20,
  },
  selectedDateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  emptyCard: {
    marginBottom: 12,
  },
  emptyCardContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyCardText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  shiftCard: {
    marginBottom: 12,
  },
  shiftCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  shiftCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
  },
  shiftCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  shiftCardText: {
    fontSize: 14,
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  modalStatusContainer: {
    marginBottom: 16,
  },
  modalCard: {
    marginBottom: 12,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalRowContent: {
    flex: 1,
    marginLeft: 12,
  },
  modalRowLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  modalRowValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  modalOvertimeText: {
    fontSize: 12,
    color: '#6B7280',
  },
  modalDescriptionText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  modalActionButton: {
    marginTop: 16,
    borderRadius: 8,
  },
  modalActionButtonContent: {
    paddingVertical: 8,
  },
});
