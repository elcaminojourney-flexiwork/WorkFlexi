import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';
import ConstitutionalScreen, { PanelPurple, PanelBlue } from '../../components/ConstitutionalScreen';

const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple300: '#D8B4FE',
  purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED', purple800: '#6D28D9',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue300: '#93C5FD',
  blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray400: '#9CA3AF', gray500: '#6B7280', gray900: '#111827',
  white: '#FFFFFF',
};

type Shift = { id: string; title: string; shift_date: string; start_time: string; end_time: string; status: string; workers_needed: number; hourly_rate: number; };

export default function MyShiftsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'completed'>('all');

  useEffect(() => { loadShifts(); }, []);

  const loadShifts = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/auth/select-user-type'); return; }

      const { data } = await supabase.from('shifts').select('*').eq('employer_id', user.id).order('shift_date', { ascending: false });
      setShifts(data || []);
    } catch (e) {
      Alert.alert('Error', 'Failed to load shifts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filtered = shifts.filter(s => filter === 'all' || s.status === filter);
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  const formatTime = (d: string) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  if (loading) {
    return (
      <ConstitutionalScreen title="My Shifts" showBack onBack={() => router.back()} showLogo theme="light">
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#3B82F6" /><Text style={styles.loadingText}>Loading shifts...</Text></View>
      </ConstitutionalScreen>
    );
  }

  return (
    <ConstitutionalScreen title="My Shifts" showBack onBack={() => router.back()} showLogo theme="light">
      <View style={styles.filterRow}>
        {(['all', 'open', 'in_progress', 'completed'] as const).map((f) => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)}>
            <View style={[styles.filterBtn, filter === f && styles.filterBtnActive]}>
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f.replace('_', ' ')}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadShifts(); }} />}>
        {filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}><Ionicons name="calendar-outline" size={64} color={COLORS.purple600} /></View>
            <Text style={styles.emptyTitle}>No shifts found</Text>
            <Text style={styles.emptyText}>Post your first shift to get started</Text>
            <TouchableOpacity onPress={() => router.push('/employer/post-shift' as any)} style={styles.emptyBtn}>
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.emptyBtnText}>Post Shift</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filtered.map((shift) => (
            <PanelPurple key={shift.id} style={styles.shiftCard} onPress={() => router.push(`/employer/shift/${shift.id}` as any)}>
              <View style={styles.shiftHeader}>
                <View style={styles.shiftIcon}>
                  <Ionicons name="briefcase" size={24} color={COLORS.purple700} />
                </View>
                <View style={styles.shiftInfo}>
                  <Text style={styles.shiftTitle}>{shift.title}</Text>
                  <View style={styles.shiftMeta}>
                    <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                    <Text style={styles.shiftMetaText}>{formatDate(shift.shift_date)}</Text>
                    <Ionicons name="time-outline" size={14} color="#6B7280" style={{ marginLeft: 12 }} />
                    <Text style={styles.shiftMetaText}>{formatTime(shift.start_time)}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, shift.status === 'open' && styles.statusOpen, shift.status === 'completed' && styles.statusCompleted]}>
                  <Text style={styles.statusText}>{shift.status}</Text>
                </View>
              </View>
              <View style={styles.shiftFooter}>
                <View style={styles.shiftStat}>
                  <Ionicons name="people" size={16} color={COLORS.purple600} />
                  <Text style={styles.shiftStatText}>{shift.workers_needed} workers</Text>
                </View>
                <View style={styles.shiftStat}>
                  <Ionicons name="cash" size={16} color={COLORS.blue600} />
                  <Text style={styles.shiftStatText}>SGD ${shift.hourly_rate}/hr</Text>
                </View>
              </View>
            </PanelPurple>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </ConstitutionalScreen>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6B7280', fontWeight: '500' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#E5E7EB' },
  filterBtnActive: { backgroundColor: COLORS.purple600 },
  filterText: { fontSize: 13, fontWeight: '600', color: '#374151', textTransform: 'capitalize' },
  filterTextActive: { color: '#FFF' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 24, backgroundColor: COLORS.purple50 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 16, backgroundColor: COLORS.purple600 },
  emptyBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  shiftCard: { borderRadius: 16, padding: 20, marginBottom: 16 },
  shiftHeader: { flexDirection: 'row', alignItems: 'center' },
  shiftIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.purple100 },
  shiftInfo: { flex: 1, marginLeft: 16 },
  shiftTitle: { fontSize: 17, fontWeight: '700', color: COLORS.gray900 },
  shiftMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  shiftMetaText: { fontSize: 13, color: '#6B7280', marginLeft: 4 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: COLORS.blue100 },
  statusOpen: { backgroundColor: COLORS.blue100 },
  statusCompleted: { backgroundColor: COLORS.purple100 },
  statusText: { fontSize: 12, fontWeight: '600', color: '#374151', textTransform: 'capitalize' },
  shiftFooter: { flexDirection: 'row', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB', gap: 24 },
  shiftStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shiftStatText: { fontSize: 13, color: '#6B7280' },
});
