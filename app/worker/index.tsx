import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';
import ConstitutionalScreen, { CardWhite, PanelBlue } from '../../components/ConstitutionalScreen';

const { width } = Dimensions.get('window');
const COLORS = { purple400: '#C084FC', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED', purple800: '#6D28D9', blue400: '#60A5FA', blue500: '#3B82F6', blue600: '#2563EB', white: '#FFFFFF' };

export default function WorkerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ upcoming: 0, pending: 0 });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/auth/select-user-type'); return; }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(p);
      const { count: pc } = await supabase.from('applications').select('*', { count: 'exact', head: true }).eq('worker_id', user.id).eq('status', 'pending');
      setStats({ upcoming: 0, pending: pc || 0 });
    } catch (e) { console.error(e); } finally { setLoading(false); setRefreshing(false); }
  };

  const menuItems = [
    { icon: 'search', label: 'Browse Shifts', route: '/worker/browse-shifts', colors: [COLORS.purple600, COLORS.blue600] },
    { icon: 'calendar', label: 'My Shifts', route: '/worker/my-shifts', colors: [COLORS.blue600, COLORS.purple600] },
    { icon: 'document-text', label: 'Applications', route: '/worker/applications', colors: [COLORS.purple700, COLORS.blue700] },
    { icon: 'wallet', label: 'Earnings', route: '/worker/earnings', colors: [COLORS.blue700, COLORS.purple700] },
    { icon: 'calendar-outline', label: 'Calendar', route: '/worker/calendar', colors: [COLORS.purple500, COLORS.purple700] },
    { icon: 'settings', label: 'Settings', route: '/worker/settings', colors: [COLORS.blue500, COLORS.blue700] },
  ];

  if (loading) {
    return (
      <ConstitutionalScreen title={undefined} showBack={false} showLogo theme="light">
        <View style={styles.center}><ActivityIndicator size="large" color="#7C3AED" /></View>
      </ConstitutionalScreen>
    );
  }

  return (
    <ConstitutionalScreen title={undefined} showBack={false} showLogo theme="light" scrollable={false}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#7C3AED" />}>
        <LinearGradient colors={['#9333EA', '#7C3AED', '#3B82F6']} style={styles.banner}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{profile?.full_name || 'Worker'}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/worker/profile' as any)}>
            <LinearGradient colors={[COLORS.purple400, COLORS.blue400]} style={styles.avatar}>
              <Text style={styles.avatarText}>{profile?.full_name?.[0]?.toUpperCase() || 'W'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.statsRow}>
          <CardWhite style={styles.statCard}>
            <Ionicons name="briefcase" size={28} color="#7C3AED" />
            <Text style={styles.statValue}>{stats.upcoming}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </CardWhite>
          <CardWhite style={styles.statCard}>
            <Ionicons name="document-text" size={28} color="#2563EB" />
            <Text style={styles.statValueBlue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </CardWhite>
        </View>

        <PanelBlue style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </PanelBlue>

        <View style={styles.menuGrid}>
          {menuItems.map((item, i) => (
            <CardWhite key={i} style={styles.menuItem} onPress={() => router.push(item.route as any)}>
              <Ionicons name={item.icon as any} size={32} color="#7C3AED" />
              <Text style={styles.menuLabel}>{item.label}</Text>
            </CardWhite>
          ))}
        </View>

        <CardWhite style={styles.ctaCard}>
          <Text style={styles.ctaTitle}>Find Your Next Shift</Text>
          <Text style={styles.ctaText}>Browse available shifts and apply now!</Text>
          <TouchableOpacity onPress={() => router.push('/worker/browse-shifts' as any)} style={styles.ctaBtnWrap}>
            <LinearGradient colors={[COLORS.purple600, COLORS.blue600]} style={styles.ctaBtn}>
              <Text style={styles.ctaBtnText}>Browse Shifts</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </CardWhite>

        <View style={{ height: 100 }} />
      </ScrollView>
    </ConstitutionalScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  banner: { paddingTop: Platform.OS === 'web' ? 70 : 100, paddingBottom: 24, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  userName: { fontSize: 26, fontWeight: '800', color: '#FFF', marginTop: 4 },
  avatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 22, fontWeight: '700', color: '#FFF' },
  content: { flex: 1 },
  contentInner: { paddingHorizontal: 16, paddingTop: 16 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, alignItems: 'center', marginBottom: 0 },
  statValue: { fontSize: 28, fontWeight: '800', color: '#7C3AED', marginTop: 8 },
  statValueBlue: { fontSize: 28, fontWeight: '800', color: '#2563EB', marginTop: 8 },
  statLabel: { fontSize: 13, color: '#64748B', marginTop: 4 },
  sectionHeader: { marginBottom: 12, marginTop: 0 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  menuItem: { width: (width - 44) / 2, alignItems: 'center', gap: 8, marginBottom: 0 },
  menuLabel: { fontSize: 14, fontWeight: '700', color: '#111827' },
  ctaCard: { marginTop: 8 },
  ctaTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  ctaText: { fontSize: 14, color: '#64748B', marginBottom: 16 },
  ctaBtnWrap: { alignSelf: 'flex-start' },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 16 },
  ctaBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
