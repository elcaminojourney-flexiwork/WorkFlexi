import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';
import ConstitutionalScreen, { PanelPurple, PanelBlue } from '../../components/ConstitutionalScreen';

const COLORS = { purple300: '#D8B4FE', purple600: '#9333EA', blue500: '#3B82F6', blue600: '#2563EB', white: '#FFFFFF' };

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
      <ConstitutionalScreen title="My Applications" showBack onBack={() => router.back()} showLogo>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFF" />
          <Text style={styles.loadingText}>Loading applications...</Text>
        </View>
      </ConstitutionalScreen>
    );
  }

  return (
    <ConstitutionalScreen title="My Applications" showBack onBack={() => router.back()} showLogo>
      <PanelPurple style={styles.filterRow}>
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterBtnActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </PanelPurple>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadApplications(); }} tintColor="#FFF" />}>
        {filtered.length === 0 ? (
          <PanelBlue>
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}><Ionicons name="document-text-outline" size={64} color="#2563EB" /></View>
              <Text style={styles.emptyTitle}>No applications</Text>
              <Text style={styles.emptyText}>Apply for shifts to see them here</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/worker/browse-shifts' as any)}>
                <LinearGradient colors={['#7C3AED', '#2563EB']} style={styles.emptyBtnGradient}>
                  <Ionicons name="search" size={20} color={COLORS.white} />
                  <Text style={styles.emptyBtnText}>Browse Shifts</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </PanelBlue>
        ) : (
          filtered.map((app) => (
            <PanelPurple key={app.id} onPress={() => router.push(`/worker/shift/${app.shift_id}` as any)}>
              <View style={styles.cardHeader}>
                <View style={styles.avatar}><Ionicons name="briefcase" size={24} color="#7C3AED" /></View>
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
            </PanelPurple>
          ))
        )}
        <View style={{ height: 80 }} />
      </ScrollView>
    </ConstitutionalScreen>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 12, fontSize: 16, color: 'rgba(255,255,255,0.9)' },
  filterRow: { flexDirection: 'row', paddingVertical: 8, gap: 8, marginBottom: 16 },
  filterBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center' },
  filterBtnActive: { backgroundColor: '#FFFFFF' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF', textTransform: 'capitalize' },
  filterTextActive: { color: '#7C3AED' },
  scrollContent: { paddingHorizontal: 4 },
  emptyContainer: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F3E8FF', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 20 },
  emptyBtn: { borderRadius: 16, overflow: 'hidden' },
  emptyBtnGradient: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 24 },
  emptyBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3E8FF', justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, marginLeft: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  cardEmployer: { fontSize: 14, color: '#7C3AED', marginTop: 2 },
  cardDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusApproved: { backgroundColor: '#D1FAE5' },
  statusRejected: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize', color: '#374151' },
  cancelBtn: { marginTop: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: '#FEE2E2', alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#7C3AED' },
});
