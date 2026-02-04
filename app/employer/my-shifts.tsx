import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, ImageBackground, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';

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
      if (!user) { router.replace('/auth/login'); return; }

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
      <ImageBackground source={require('../../assets/images/background.webp')} style={styles.container} resizeMode="cover">
        <LinearGradient colors={['rgba(139, 92, 246, 0.92)', 'rgba(59, 130, 246, 0.88)', 'rgba(147, 51, 234, 0.85)']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.logoBox}><Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" /></View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.white} />
          <Text style={styles.loadingText}>Loading shifts...</Text>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={require('../../assets/images/background.webp')} style={styles.container} resizeMode="cover">
      <LinearGradient colors={['rgba(139, 92, 246, 0.92)', 'rgba(59, 130, 246, 0.88)', 'rgba(147, 51, 234, 0.85)']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.logoBox}><Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" /></View>

      <LinearGradient colors={[COLORS.purple700, COLORS.purple600, COLORS.blue600]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="calendar" size={24} color={COLORS.white} />
          <Text style={styles.headerTitle}>My Shifts</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/employer/post-shift' as any)} style={styles.addBtn}>
          <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.filterRow}>
        {(['all', 'open', 'in_progress', 'completed'] as const).map((f) => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)}>
            <LinearGradient colors={filter === f ? [COLORS.purple600, COLORS.blue600] : [COLORS.purple100, COLORS.blue100]} style={styles.filterBtn}>
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f.replace('_', ' ')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadShifts(); }} tintColor={COLORS.white} />}>
        {filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <LinearGradient colors={[COLORS.purple100, COLORS.blue100]} style={styles.emptyIcon}>
              <Ionicons name="calendar-outline" size={64} color={COLORS.purple600} />
            </LinearGradient>
            <Text style={styles.emptyTitle}>No shifts found</Text>
            <Text style={styles.emptyText}>Post your first shift to get started</Text>
            <TouchableOpacity onPress={() => router.push('/employer/post-shift' as any)}>
              <LinearGradient colors={[COLORS.purple600, COLORS.blue600]} style={styles.emptyBtn}>
                <Ionicons name="add" size={20} color={COLORS.white} />
                <Text style={styles.emptyBtnText}>Post Shift</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          filtered.map((shift) => (
            <TouchableOpacity key={shift.id} onPress={() => router.push(`/employer/shift/${shift.id}` as any)}>
              <LinearGradient colors={[COLORS.purple100, COLORS.blue50]} style={styles.shiftCard}>
                <View style={styles.shiftHeader}>
                  <LinearGradient colors={[COLORS.purple500, COLORS.blue500]} style={styles.shiftIcon}>
                    <Ionicons name="briefcase" size={24} color={COLORS.white} />
                  </LinearGradient>
                  <View style={styles.shiftInfo}>
                    <Text style={styles.shiftTitle}>{shift.title}</Text>
                    <View style={styles.shiftMeta}>
                      <Ionicons name="calendar-outline" size={14} color={COLORS.purple600} />
                      <Text style={styles.shiftMetaText}>{formatDate(shift.shift_date)}</Text>
                      <Ionicons name="time-outline" size={14} color={COLORS.blue600} style={{ marginLeft: 12 }} />
                      <Text style={styles.shiftMetaText}>{formatTime(shift.start_time)}</Text>
                    </View>
                  </View>
                  <LinearGradient colors={shift.status === 'open' ? [COLORS.blue200, COLORS.blue100] : shift.status === 'completed' ? [COLORS.purple200, COLORS.purple100] : [COLORS.purple100, COLORS.blue100]} style={styles.statusBadge}>
                    <Text style={styles.statusText}>{shift.status}</Text>
                  </LinearGradient>
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
              </LinearGradient>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  logoBox: { position: 'absolute', top: Platform.OS === 'web' ? 16 : 52, left: 16, zIndex: 1000, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, padding: 8, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
  logo: { width: 32, height: 32 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: COLORS.white, fontWeight: '500' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'web' ? 70 : 100, paddingBottom: 20, paddingHorizontal: 20 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.white },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  filterText: { fontSize: 13, fontWeight: '600', color: COLORS.purple700, textTransform: 'capitalize' },
  filterTextActive: { color: COLORS.white },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: COLORS.white, marginBottom: 8 },
  emptyText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 24 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 16 },
  emptyBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  shiftCard: { borderRadius: 20, padding: 20, marginBottom: 16 },
  shiftHeader: { flexDirection: 'row', alignItems: 'center' },
  shiftIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  shiftInfo: { flex: 1, marginLeft: 16 },
  shiftTitle: { fontSize: 17, fontWeight: '700', color: COLORS.gray900 },
  shiftMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  shiftMetaText: { fontSize: 13, color: COLORS.gray500, marginLeft: 4 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  statusText: { fontSize: 12, fontWeight: '600', color: COLORS.purple700, textTransform: 'capitalize' },
  shiftFooter: { flexDirection: 'row', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.purple200, gap: 24 },
  shiftStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shiftStatText: { fontSize: 13, color: COLORS.gray500 },
});
