import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, ImageBackground, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';

const COLORS = { purple100: '#F3E8FF', purple200: '#E9D5FF', purple300: '#D8B4FE', purple400: '#C084FC', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED', purple800: '#6D28D9', blue100: '#DBEAFE', blue200: '#BFDBFE', blue300: '#93C5FD', blue400: '#60A5FA', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8', white: '#FFFFFF', gray900: '#111827' };

type App = { id: string; shift_id: string; worker_id: string; status: string; worker_name: string | null; shift_title: string | null; created_at: string; };

export default function ApplicationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apps, setApps] = useState<App[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => { loadApps(); }, []);

  const loadApps = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/auth/login'); return; }
      const { data } = await supabase.from('shift_applications').select('id, shift_id, worker_id, status, created_at, shifts(title), profiles!shift_applications_worker_id_fkey(full_name)').eq('shifts.employer_id', user.id).order('created_at', { ascending: false });
      setApps((data || []).map((a: any) => ({ id: a.id, shift_id: a.shift_id, worker_id: a.worker_id, status: a.status, worker_name: a.profiles?.full_name, shift_title: a.shifts?.title, created_at: a.created_at })));
    } catch (e) { Alert.alert('Error', 'Failed'); } finally { setLoading(false); setRefreshing(false); }
  };

  const handleAction = async (id: string, action: 'approved' | 'rejected') => {
    await supabase.from('shift_applications').update({ status: action }).eq('id', id);
    setApps(apps.map(a => a.id === id ? { ...a, status: action } : a));
  };

  const filtered = apps.filter(a => filter === 'all' || a.status === filter);
  const pendingCount = apps.filter(a => a.status === 'pending').length;

  if (loading) {
    return (
      <ImageBackground source={require('../../assets/images/background.webp')} style={styles.container} resizeMode="cover">
        <LinearGradient colors={['rgba(139, 92, 246, 0.95)', 'rgba(59, 130, 246, 0.92)', 'rgba(147, 51, 234, 0.90)']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.logoBox}><Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" /></View>
        <View style={styles.center}><ActivityIndicator size="large" color="#FFF" /></View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={require('../../assets/images/background.webp')} style={styles.container} resizeMode="cover">
      <LinearGradient colors={['rgba(139, 92, 246, 0.95)', 'rgba(59, 130, 246, 0.92)', 'rgba(147, 51, 234, 0.90)']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.logoBox}><Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" /></View>

      <LinearGradient colors={[COLORS.purple700, COLORS.blue600]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color="#FFF" /></TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Applications</Text>
          {pendingCount > 0 && <LinearGradient colors={['#7C3AED', '#6D28D9']} style={styles.badge}><Text style={styles.badgeText}>{pendingCount}</Text></LinearGradient>}
        </View>
        <View style={{ width: 44 }} />
      </LinearGradient>

      <View style={styles.filterRow}>
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)}>
            <LinearGradient colors={filter === f ? [COLORS.purple600, COLORS.blue600] : [COLORS.purple200, COLORS.blue200]} style={styles.filterBtn}>
              <Text style={[styles.filterText, filter === f && { color: '#FFF' }]}>{f}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadApps(); }} tintColor="#FFF" />}>
        {filtered.length === 0 ? (
          <LinearGradient colors={[COLORS.purple200, COLORS.blue200]} style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={64} color={COLORS.purple600} />
            <Text style={styles.emptyTitle}>No applications</Text>
          </LinearGradient>
        ) : (
          filtered.map((a) => (
            <LinearGradient key={a.id} colors={[COLORS.purple200, COLORS.blue200]} style={styles.card}>
              <View style={styles.cardHeader}>
                <LinearGradient colors={[COLORS.purple500, COLORS.blue500]} style={styles.cardAvatar}>
                  <Text style={styles.avatarText}>{a.worker_name?.[0]?.toUpperCase() || '?'}</Text>
                </LinearGradient>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{a.worker_name || 'Unknown'}</Text>
                  <Text style={styles.cardShift}>{a.shift_title}</Text>
                </View>
                <LinearGradient colors={a.status === 'pending' ? [COLORS.purple300, COLORS.purple200] : a.status === 'approved' ? [COLORS.blue300, COLORS.blue200] : [COLORS.purple100, COLORS.blue100]} style={styles.statusBadge}>
                  <Text style={styles.statusText}>{a.status}</Text>
                </LinearGradient>
              </View>
              {a.status === 'pending' && (
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => handleAction(a.id, 'rejected')} style={styles.rejectBtn}>
                    <Ionicons name="close" size={20} color={COLORS.purple700} />
                    <Text style={styles.rejectText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleAction(a.id, 'approved')}>
                    <LinearGradient colors={[COLORS.purple600, COLORS.blue600]} style={styles.approveBtn}>
                      <Ionicons name="checkmark" size={20} color="#FFF" />
                      <Text style={styles.approveText}>Approve</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </LinearGradient>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  logoBox: { position: 'absolute', top: Platform.OS === 'web' ? 16 : 52, left: 16, zIndex: 1000, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, padding: 8 },
  logo: { width: 32, height: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'web' ? 70 : 100, paddingBottom: 16, paddingHorizontal: 20 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFF' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16 },
  filterText: { fontSize: 13, fontWeight: '600', color: COLORS.purple700, textTransform: 'capitalize' },
  content: { flex: 1, paddingHorizontal: 16 },
  emptyCard: { borderRadius: 24, padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.purple800, marginTop: 16 },
  card: { borderRadius: 20, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardAvatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  cardInfo: { flex: 1, marginLeft: 16 },
  cardName: { fontSize: 17, fontWeight: '700', color: COLORS.gray900 },
  cardShift: { fontSize: 14, color: COLORS.purple600, marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600', color: COLORS.purple700, textTransform: 'capitalize' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.purple300 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: COLORS.purple100 },
  rejectText: { fontSize: 14, fontWeight: '600', color: COLORS.purple700 },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, paddingHorizontal: 20 },
  approveText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
});
