import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, ImageBackground, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray100: '#F3F4F6', gray400: '#9CA3AF', gray500: '#6B7280', gray900: '#111827',
  white: '#FFFFFF',
};

type Application = { id: string; shift_id: string; status: string; shift_title: string | null; employer_name: string | null; shift_date: string | null; created_at: string; };

export default function WorkerApplicationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => { loadApplications(); }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/auth/select-user-type'); return; }

      const { data } = await supabase
        .from('shift_applications')
        .select('id, shift_id, status, created_at, shifts(title, start_time, profiles!shifts_employer_id_fkey(full_name))')
        .eq('worker_id', user.id)
        .order('created_at', { ascending: false });

      const mapped = (data || []).map((a: any) => ({
        id: a.id, shift_id: a.shift_id, status: a.status, created_at: a.created_at,
        shift_title: a.shifts?.title, employer_name: a.shifts?.profiles?.full_name, shift_date: a.shifts?.start_time,
      }));
      setApplications(mapped);
    } catch (e) {
      Alert.alert('Error', 'Failed to load applications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const cancelApplication = async (id: string) => {
    Alert.alert('Cancel Application', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', style: 'destructive', onPress: async () => {
        await supabase.from('shift_applications').delete().eq('id', id);
        setApplications(applications.filter(a => a.id !== id));
      }},
    ]);
  };

  const filtered = applications.filter(a => filter === 'all' || a.status === filter);
  const pendingCount = applications.filter(a => a.status === 'pending').length;

  if (loading) {
    return (
      <ImageBackground source={require('../../assets/images/background.webp')} style={styles.container} resizeMode="cover">
        <LinearGradient colors={['rgba(139, 92, 246, 0.92)', 'rgba(59, 130, 246, 0.88)', 'rgba(147, 51, 234, 0.85)']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.logoBox}><Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" /></View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.white} />
          <Text style={styles.loadingText}>Loading applications...</Text>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={require('../../assets/images/background.webp')} style={styles.container} resizeMode="cover">
      <LinearGradient colors={['rgba(139, 92, 246, 0.92)', 'rgba(59, 130, 246, 0.88)', 'rgba(147, 51, 234, 0.85)']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.logoBox}><Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" /></View>

      <LinearGradient colors={[COLORS.purple600, COLORS.purple700, COLORS.blue600]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="document-text" size={24} color={COLORS.white} />
          <Text style={styles.headerTitle}>My Applications</Text>
          {pendingCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{pendingCount}</Text></View>}
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <View style={styles.filterRow}>
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterBtnActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadApplications(); }} tintColor={COLORS.purple600} />}>
        {filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}><Ionicons name="document-text-outline" size={64} color={COLORS.purple300} /></View>
            <Text style={styles.emptyTitle}>No applications</Text>
            <Text style={styles.emptyText}>Apply for shifts to see them here</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/worker/browse-shifts' as any)}>
              <LinearGradient colors={[COLORS.purple600, COLORS.blue600]} style={styles.emptyBtnGradient}>
                <Ionicons name="search" size={20} color={COLORS.white} />
                <Text style={styles.emptyBtnText}>Browse Shifts</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          filtered.map((app) => (
            <TouchableOpacity key={app.id} style={styles.card} onPress={() => router.push(`/worker/shift/${app.shift_id}` as any)}>
              <View style={styles.cardHeader}>
                <LinearGradient colors={[COLORS.purple500, COLORS.blue500]} style={styles.avatar}>
                  <Ionicons name="briefcase" size={24} color={COLORS.white} />
                </LinearGradient>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{app.shift_title || 'Unknown Shift'}</Text>
                  <Text style={styles.cardEmployer}>{app.employer_name || 'Unknown Employer'}</Text>
                  {app.shift_date && <Text style={styles.cardDate}>{new Date(app.shift_date).toLocaleDateString()}</Text>}
                </View>
                <View style={[styles.statusBadge, app.status === 'pending' && styles.statusPending, app.status === 'approved' && styles.statusApproved, app.status === 'rejected' && styles.statusRejected]}>
                  <Text style={styles.statusText}>{app.status}</Text>
                </View>
              </View>
              {app.status === 'pending' && (
                <TouchableOpacity style={styles.cancelBtn} onPress={() => cancelApplication(app.id)}>
                  <Text style={styles.cancelText}>Cancel Application</Text>
                </TouchableOpacity>
              )}
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
  loadingText: { marginTop: 12, fontSize: 16, color: '#FFFFFF', fontWeight: '500' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'web' ? 70 : 100, paddingBottom: 20, paddingHorizontal: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  badge: { backgroundColor: '#7C3AED', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 4 },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center' },
  filterBtnActive: { backgroundColor: '#FFFFFF' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF', textTransform: 'capitalize' },
  filterTextActive: { color: COLORS.purple600 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIcon: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  emptyText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 24 },
  emptyBtn: { borderRadius: 16, overflow: 'hidden' },
  emptyBtnGradient: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 24 },
  emptyBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, marginLeft: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  cardEmployer: { fontSize: 14, color: COLORS.purple600, marginTop: 2 },
  cardDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusApproved: { backgroundColor: '#D1FAE5' },
  statusRejected: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize', color: '#374151' },
  cancelBtn: { marginTop: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: '#FEE2E2', alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#7C3AED' },
});
