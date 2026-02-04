import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';
import ConstitutionalScreen, { PanelPurple, PanelBlue } from '../../components/ConstitutionalScreen';

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
      if (!user) { router.replace('/auth/select-user-type'); return; }
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

  const titleWithBadge = pendingCount > 0 ? `Applications (${pendingCount})` : 'Applications';

  if (loading) {
    return (
      <ConstitutionalScreen title="Applications" showBack onBack={() => router.back()} showLogo theme="light">
        <View style={styles.center}><ActivityIndicator size="large" color="#3B82F6" /></View>
      </ConstitutionalScreen>
    );
  }

  return (
    <ConstitutionalScreen title={titleWithBadge} showBack onBack={() => router.back()} showLogo theme="light">
      <View style={styles.filterRow}>
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)}>
            <View style={[styles.filterBtn, filter === f && styles.filterBtnActive]}>
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadApps(); }} />}>
        {filtered.length === 0 ? (
          <PanelBlue style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={64} color={COLORS.purple600} />
            <Text style={styles.emptyTitle}>No applications</Text>
          </PanelBlue>
        ) : (
          filtered.map((a) => (
            <PanelPurple key={a.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardAvatar}>
                  <Text style={styles.avatarText}>{a.worker_name?.[0]?.toUpperCase() || '?'}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{a.worker_name || 'Unknown'}</Text>
                  <Text style={styles.cardShift}>{a.shift_title}</Text>
                </View>
                <View style={[styles.statusBadge, a.status === 'pending' && styles.statusBadgePending, a.status === 'approved' && styles.statusBadgeApproved]}>
                  <Text style={styles.statusText}>{a.status}</Text>
                </View>
              </View>
              {a.status === 'pending' && (
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => handleAction(a.id, 'rejected')} style={styles.rejectBtn}>
                    <Ionicons name="close" size={20} color={COLORS.purple700} />
                    <Text style={styles.rejectText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleAction(a.id, 'approved')} style={styles.approveBtn}>
                    <Ionicons name="checkmark" size={20} color="#FFF" />
                    <Text style={styles.approveText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              )}
            </PanelPurple>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </ConstitutionalScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#E5E7EB' },
  filterBtnActive: { backgroundColor: COLORS.purple600 },
  filterText: { fontSize: 13, fontWeight: '600', color: '#374151', textTransform: 'capitalize' },
  filterTextActive: { color: '#FFF' },
  content: { flex: 1, paddingHorizontal: 16 },
  emptyCard: { borderRadius: 16, padding: 40, alignItems: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.purple800, marginTop: 16 },
  card: { borderRadius: 16, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardAvatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.purple200 },
  avatarText: { fontSize: 20, fontWeight: '700', color: COLORS.purple700 },
  cardInfo: { flex: 1, marginLeft: 16 },
  cardName: { fontSize: 17, fontWeight: '700', color: COLORS.gray900 },
  cardShift: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: '#E5E7EB' },
  statusBadgePending: { backgroundColor: COLORS.purple100 },
  statusBadgeApproved: { backgroundColor: COLORS.blue100 },
  statusText: { fontSize: 12, fontWeight: '600', color: '#374151', textTransform: 'capitalize' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: COLORS.purple50 },
  rejectText: { fontSize: 14, fontWeight: '600', color: COLORS.purple700 },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, paddingHorizontal: 20, backgroundColor: COLORS.purple600 },
  approveText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
});
