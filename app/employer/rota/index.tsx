import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase';
import { palette, colors, gradients, typography, spacing, borderRadius } from '../../../constants/theme';
import { getWeeklyRota, publishRotaWeek, copyRotaWeek } from '../../../services/rota';
import ConstitutionalScreen from '../../../components/ConstitutionalScreen';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const FULL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];


// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function RotaCalendar() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const venueId = params.venueId as string;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [shifts, setShifts] = useState<any[]>([]);
  const [venue, setVenue] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState<any>(null);

  useEffect(() => {
    if (venueId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [venueId, weekStart]);

  function getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  const loadData = async () => {
    try {
      // Load venue
      const { data: venueData, error: venueError } = await supabase
        .from('venues')
        .select('*, organisations(*)')
        .eq('id', venueId)
        .single();

      if (venueError) throw venueError;
      setVenue(venueData);

      // Load roles for this venue
      const { data: rolesData, error: rolesError } = await supabase
        .from('venue_roles')
        .select('*, roles(*)')
        .eq('venue_id', venueId)
        .eq('is_active', true);

      if (!rolesError && rolesData) {
        setRoles(rolesData.map(vr => vr.roles).filter(Boolean));
      }

      // Load weekly rota
      const weekStartStr = weekStart.toISOString().split('T')[0];
      const result = await getWeeklyRota(venueId, weekStartStr);
      
      if (result.error) {
        console.error('Error loading rota:', result.error);
        setShifts([]);
      } else {
        setShifts(result.data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setVenue(null);
      setShifts([]);
      setRoles([]);
      Alert.alert('Error', 'Failed to load rota data. Check that the venue exists and rota is set up.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const navigateWeek = (direction: number) => {
    const newDate = new Date(weekStart);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setWeekStart(newDate);
  };

  const handlePublishWeek = async () => {
    Alert.alert(
      'Publish Rota',
      'Are you sure you want to publish this week\'s rota? Team members will be notified.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Publish',
          onPress: async () => {
            setPublishing(true);
            const weekStartStr = weekStart.toISOString().split('T')[0];
            const result = await publishRotaWeek(venueId, weekStartStr);
            setPublishing(false);
            
            if (result.error) {
              Alert.alert('Error', 'Failed to publish rota');
            } else {
              Alert.alert('Success', `${result.data} shifts published`);
              loadData();
            }
          },
        },
      ]
    );
  };

  const handleCopyWeek = async (sourceWeekStart: string) => {
    const targetWeekStr = weekStart.toISOString().split('T')[0];
    const result = await copyRotaWeek(venueId, sourceWeekStart, targetWeekStr);
    
    setShowCopyModal(false);
    
    if (result.error) {
      Alert.alert('Error', 'Failed to copy rota');
    } else {
      Alert.alert('Success', `${result.data} shifts copied`);
      loadData();
    }
  };

  const getShiftsForDay = (dayIndex: number) => {
    const targetDate = new Date(weekStart);
    targetDate.setDate(targetDate.getDate() + dayIndex);
    const dateStr = targetDate.toISOString().split('T')[0];
    return shifts.filter(s => s.shift_date === dateStr);
  };

  const formatWeekRange = () => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    const startStr = weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const endStr = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  };

  const getDayDate = (dayIndex: number) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayIndex);
    return date.getDate();
  };

  const isToday = (dayIndex: number) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayIndex);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const hasDraftShifts = shifts.some(s => s.status === 'draft');

  if (loading) {
    return (
      <ConstitutionalScreen title="Rota" showBack onBack={() => router.back()} showLogo theme="light" scrollable={false}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.purple[500]} />
          <Text style={styles.loadingText}>Loading rota...</Text>
        </View>
      </ConstitutionalScreen>
    );
  }

  if (!venueId) {
    return (
      <ConstitutionalScreen title="Rota" showBack onBack={() => router.back()} showLogo theme="light">
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="calendar-outline" size={64} color={palette.purple[300]} />
          </View>
          <Text style={styles.emptyTitle}>Select a venue</Text>
          <Text style={styles.emptyText}>
            Open rota from an organisation or venue to see the weekly schedule.
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => router.replace('/employer/organisation')}>
            <Ionicons name="business" size={20} color="#FFFFFF" />
            <Text style={styles.emptyButtonText}>My Organisations</Text>
          </TouchableOpacity>
        </View>
      </ConstitutionalScreen>
    );
  }

  return (
    <ConstitutionalScreen title={venue?.name || 'Rota'} showBack onBack={() => router.back()} showLogo theme="light" scrollable={false}>
      <View style={styles.weekNavWrap}>
        <TouchableOpacity onPress={() => router.push(`/employer/rota/settings?venueId=${venueId}`)} style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={22} color={palette.purple[600]} />
        </TouchableOpacity>
        <View style={styles.weekNav}>
          <TouchableOpacity onPress={() => navigateWeek(-1)} style={styles.weekNavButton}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setWeekStart(getMonday(new Date()))} style={styles.weekDisplay}>
            <Text style={styles.weekText}>{formatWeekRange()}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigateWeek(1)} style={styles.weekNavButton}>
            <Ionicons name="chevron-forward" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setShowCopyModal(true)}
        >
          <Ionicons name="copy-outline" size={20} color={palette.purple[600]} />
          <Text style={styles.actionButtonText}>Copy Week</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.actionButtonPrimary]}
          onPress={() => router.push(`/employer/rota/add-shift?venueId=${venueId}&date=${weekStart.toISOString().split('T')[0]}`)}
        >
          <Ionicons name="add" size={20} color={palette.white} />
          <Text style={styles.actionButtonTextPrimary}>Add Shift</Text>
        </TouchableOpacity>

        {hasDraftShifts && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.actionButtonPublish]}
            onPress={handlePublishWeek}
            disabled={publishing}
          >
            {publishing ? (
              <ActivityIndicator size="small" color={palette.white} />
            ) : (
              <>
                <Ionicons name="paper-plane" size={20} color={palette.white} />
                <Text style={styles.actionButtonTextPrimary}>Publish</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Calendar Grid */}
      <ScrollView
        style={styles.calendarScroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Day Headers */}
        <View style={styles.dayHeaders}>
          {DAYS.map((day, index) => (
            <View 
              key={day} 
              style={[
                styles.dayHeader,
                isToday(index) && styles.dayHeaderToday
              ]}
            >
              <Text style={[styles.dayName, isToday(index) && styles.dayNameToday]}>{day}</Text>
              <Text style={[styles.dayDate, isToday(index) && styles.dayDateToday]}>{getDayDate(index)}</Text>
            </View>
          ))}
        </View>

        {/* Shifts Grid */}
        <View style={styles.shiftsGrid}>
          {DAYS.map((day, dayIndex) => {
            const dayShifts = getShiftsForDay(dayIndex);
            return (
              <View key={day} style={styles.dayColumn}>
                {dayShifts.length === 0 ? (
                  <TouchableOpacity 
                    style={styles.emptyDay}
                    onPress={() => {
                      const targetDate = new Date(weekStart);
                      targetDate.setDate(targetDate.getDate() + dayIndex);
                      router.push(`/employer/rota/add-shift?venueId=${venueId}&date=${targetDate.toISOString().split('T')[0]}`);
                    }}
                  >
                    <Ionicons name="add" size={24} color={palette.gray[400]} />
                  </TouchableOpacity>
                ) : (
                  dayShifts.map((shift) => (
                    <TouchableOpacity 
                      key={shift.shift_id}
                      style={[
                        styles.shiftCard,
                        { backgroundColor: shift.role_colour ? `${shift.role_colour}30` : palette.purple[100] },
                        shift.status === 'draft' && styles.shiftCardDraft
                      ]}
                      onPress={() => router.push(`/employer/rota/shift/${shift.shift_id}?venueId=${venueId}`)}
                    >
                      <View style={[styles.shiftRoleBar, { backgroundColor: shift.role_colour || palette.purple[500] }]} />
                      <Text style={styles.shiftTime}>{shift.start_time?.substring(0, 5)} - {shift.end_time?.substring(0, 5)}</Text>
                      <Text style={styles.shiftRole} numberOfLines={1}>{shift.role_name}</Text>
                      <View style={styles.shiftFooter}>
                        <Text style={styles.shiftCount}>
                          {shift.headcount_filled}/{shift.headcount_needed}
                        </Text>
                        {shift.status === 'draft' && (
                          <View style={styles.draftBadge}>
                            <Text style={styles.draftBadgeText}>Draft</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            );
          })}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Roles</Text>
          <View style={styles.legendItems}>
            {roles.slice(0, 6).map((role) => (
              <View key={role.id} style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: role.colour || palette.purple[500] }]} />
                <Text style={styles.legendText}>{role.name}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Copy Week Modal */}
      <Modal
        visible={showCopyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCopyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Copy Week From</Text>
            <Text style={styles.modalSubtitle}>Select a week to copy shifts from</Text>
            
            {[-1, -2, -3, -4].map((weeksAgo) => {
              const sourceDate = new Date(weekStart);
              sourceDate.setDate(sourceDate.getDate() + (weeksAgo * 7));
              const sourceStr = sourceDate.toISOString().split('T')[0];
              const endDate = new Date(sourceDate);
              endDate.setDate(endDate.getDate() + 6);
              
              return (
                <TouchableOpacity
                  key={weeksAgo}
                  style={styles.copyOption}
                  onPress={() => handleCopyWeek(sourceStr)}
                >
                  <Text style={styles.copyOptionText}>
                    {sourceDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - {endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color={palette.gray[400]} />
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity 
              style={styles.modalCancel}
              onPress={() => setShowCopyModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ConstitutionalScreen>
  );
}

const styles = StyleSheet.create({

  logoBox: { position: 'absolute', top: Platform.OS === 'web' ? 16 : 52, left: 16, zIndex: 1000, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, padding: 8, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  logo: { width: 32, height: 32 },

  loadingContainer: { paddingVertical: spacing.xl },
  loadingText: { marginTop: spacing.md, color: colors.textSecondary, fontSize: typography.sizes.body },

  emptyState: { alignItems: 'center', paddingVertical: spacing.xl3 },
  emptyIcon: { width: 120, height: 120, borderRadius: 60, backgroundColor: palette.purple[50], justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg },
  emptyTitle: { fontSize: typography.sizes.h3, fontWeight: typography.weights.bold, color: colors.textPrimary, marginBottom: spacing.sm },
  emptyText: { fontSize: typography.sizes.body, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  emptyButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: palette.purple[500], paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: borderRadius.lg },
  emptyButtonText: { color: '#FFFFFF', fontWeight: typography.weights.semibold, fontSize: typography.sizes.body },
  
  weekNavWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  settingsButton: { position: 'absolute', right: spacing.md, padding: spacing.sm },
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  weekNavButton: { padding: spacing.sm },
  weekDisplay: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  weekText: { fontSize: typography.sizes.bodyLarge, fontWeight: typography.weights.semibold, color: colors.textPrimary },
  
  actionBar: { flexDirection: 'row', padding: spacing.md, gap: spacing.sm, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  actionButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: palette.purple[300], gap: spacing.xs },
  actionButtonText: { fontSize: typography.sizes.body, color: palette.purple[600], fontWeight: typography.weights.medium },
  actionButtonPrimary: { backgroundColor: palette.purple[500], borderColor: palette.purple[500] },
  actionButtonPublish: { backgroundColor: palette.blue[500], borderColor: palette.blue[500] },
  actionButtonTextPrimary: { fontSize: typography.sizes.body, color: palette.white, fontWeight: typography.weights.medium },
  
  calendarScroll: { flex: 1 },
  dayHeaders: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  dayHeader: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
  dayHeaderToday: { backgroundColor: palette.purple[100] },
  dayName: { fontSize: typography.sizes.caption, color: colors.textSecondary, fontWeight: typography.weights.medium },
  dayNameToday: { color: palette.purple[700] },
  dayDate: { fontSize: typography.sizes.bodyLarge, color: colors.textPrimary, fontWeight: typography.weights.semibold, marginTop: 2 },
  dayDateToday: { color: palette.purple[700] },
  
  shiftsGrid: { flexDirection: 'row', minHeight: 400 },
  dayColumn: { flex: 1, borderRightWidth: 1, borderRightColor: colors.borderLight, padding: 4, gap: 4 },
  emptyDay: { flex: 1, minHeight: 80, justifyContent: 'center', alignItems: 'center', backgroundColor: palette.gray[50], borderRadius: borderRadius.sm, borderStyle: 'dashed', borderWidth: 1, borderColor: palette.gray[300] },
  
  shiftCard: { borderRadius: borderRadius.sm, padding: spacing.xs, overflow: 'hidden' },
  shiftCardDraft: { borderStyle: 'dashed', borderWidth: 1, borderColor: palette.purple[400] },
  shiftRoleBar: { height: 3, borderRadius: 2, marginBottom: 4 },
  shiftTime: { fontSize: 10, color: colors.textPrimary, fontWeight: typography.weights.semibold },
  shiftRole: { fontSize: 9, color: colors.textSecondary, marginTop: 2 },
  shiftFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  shiftCount: { fontSize: 9, color: colors.textTertiary },
  draftBadge: { backgroundColor: palette.purple[500], paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  draftBadgeText: { fontSize: 7, color: palette.white, fontWeight: typography.weights.semibold },
  
  legend: { padding: spacing.lg, backgroundColor: '#FFFFFF', margin: spacing.md, borderRadius: borderRadius.lg },
  legendTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.textPrimary, marginBottom: spacing.sm },
  legendItems: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendColor: { width: 12, height: 12, borderRadius: 3 },
  legendText: { fontSize: typography.sizes.caption, color: colors.textSecondary },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: borderRadius.xl, padding: spacing.lg, width: '85%', maxWidth: 400 },
  modalTitle: { fontSize: typography.sizes.h3, fontWeight: typography.weights.bold, color: colors.textPrimary, marginBottom: spacing.xs },
  modalSubtitle: { fontSize: typography.sizes.body, color: colors.textSecondary, marginBottom: spacing.lg },
  copyOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  copyOptionText: { fontSize: typography.sizes.body, color: colors.textPrimary },
  modalCancel: { marginTop: spacing.lg, paddingVertical: spacing.md, alignItems: 'center' },
  modalCancelText: { fontSize: typography.sizes.body, color: palette.purple[500], fontWeight: typography.weights.semibold },
});
