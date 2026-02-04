import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';
import ConstitutionalScreen, { CardWhite, PanelBlue, PanelPurple } from '../../components/ConstitutionalScreen';

const { width } = Dimensions.get('window');
const COLORS = { purple100: '#F3E8FF', purple200: '#E9D5FF', purple300: '#D8B4FE', purple400: '#C084FC', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED', purple800: '#6D28D9', blue100: '#DBEAFE', blue200: '#BFDBFE', blue300: '#93C5FD', blue400: '#60A5FA', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8', white: '#FFFFFF', gray900: '#111827' };

export default function EmployerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ activeShifts: 0, pendingApps: 0 });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/auth/select-user-type'); return; }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(p);
      let activeShifts = 0;
      let pendingApps = 0;
      try {
        const { count: sc } = await supabase.from('shifts').select('*', { count: 'exact', head: true }).eq('employer_id', user.id).eq('status', 'open');
        activeShifts = sc ?? 0;
      } catch (_) { /* stats may fail if table/RLS not ready */ }
      try {
        const { count: ac } = await supabase.from('shift_applications').select('*, shifts!inner(employer_id)', { count: 'exact', head: true }).eq('shifts.employer_id', user.id).eq('status', 'pending');
        pendingApps = ac ?? 0;
      } catch (_) { /* optional stats */ }
      setStats({ activeShifts, pendingApps });
    } catch (e) { console.error(e); } finally { setLoading(false); setRefreshing(false); }
  };

  const quickActions = [
    { icon: 'add-circle', label: 'Post Shift', route: '/employer/post-shift' },
    { icon: 'calendar', label: 'My Shifts', route: '/employer/my-shifts' },
    { icon: 'people', label: 'My Team', route: '/employer/my-team' },
    { icon: 'document-text', label: 'Applications', route: '/employer/applications' },
  ];
  const moreItems = [
    { icon: 'heart', label: 'Favorites', route: '/employer/favorites' },
    { icon: 'card', label: 'Payments', route: '/employer/payments' },
    { icon: 'grid', label: 'Rota', route: '/employer/rota' },
    { icon: 'settings', label: 'Settings', route: '/employer/settings' },
  ];

  if (loading) {
    return (
      <ConstitutionalScreen title={undefined} showBack={false} showLogo theme="light">
        <View style={styles.center}><ActivityIndicator size="large" color="#3B82F6" /><Text style={styles.loadingText}>Loading...</Text></View>
      </ConstitutionalScreen>
    );
  }

  return (
    <ConstitutionalScreen title={undefined} showBack={false} showLogo theme="light" scrollable={false}>
      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}>
        <View style={styles.welcomeRow}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{profile?.company_name || profile?.full_name || 'Employer'}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/employer/profile' as any)}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profile?.full_name?.[0]?.toUpperCase() || 'E'}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <CardWhite style={styles.statCard}>
            <Ionicons name="briefcase" size={32} color={COLORS.blue600} />
            <Text style={styles.statValue}>{stats.activeShifts}</Text>
            <Text style={styles.statLabel}>Active Shifts</Text>
          </CardWhite>
          <CardWhite style={styles.statCard}>
            <Ionicons name="document-text" size={32} color={COLORS.purple600} />
            <Text style={styles.statValue}>{stats.pendingApps}</Text>
            <Text style={styles.statLabel}>Pending Apps</Text>
          </CardWhite>
        </View>

        <PanelBlue style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </PanelBlue>

        <View style={styles.quickActionsGrid}>
          {quickActions.map((item, i) => (
            <CardWhite key={i} style={styles.quickActionCard} onPress={() => router.push(item.route as any)}>
              <Ionicons name={item.icon as any} size={36} color={COLORS.purple600} />
              <Text style={styles.menuLabel}>{item.label}</Text>
            </CardWhite>
          ))}
        </View>

        <PanelBlue style={[styles.sectionHeader, { marginTop: 20 }]}>
          <Text style={styles.sectionTitle}>More</Text>
        </PanelBlue>

        <View style={styles.quickActionsGrid}>
          {moreItems.map((item, i) => (
            <CardWhite key={i} style={styles.quickActionCard} onPress={() => router.push(item.route as any)}>
              <Ionicons name={item.icon as any} size={36} color={COLORS.purple600} />
              <Text style={styles.menuLabel}>{item.label}</Text>
            </CardWhite>
          ))}
        </View>

        <PanelPurple style={styles.ctaCard}>
          <View style={styles.ctaHeader}>
            <Ionicons name="flash" size={24} color={COLORS.purple700} />
            <Text style={styles.ctaTitle}>Post Your First Shift</Text>
          </View>
          <View style={styles.ctaBody}>
            <Text style={styles.ctaText}>Get started by posting a shift to attract workers</Text>
            <TouchableOpacity onPress={() => router.push('/employer/post-shift' as any)} style={styles.ctaBtn}>
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.ctaBtnText}>Post Shift</Text>
            </TouchableOpacity>
          </View>
        </PanelPurple>

        <View style={{ height: 100 }} />
      </ScrollView>
    </ConstitutionalScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6B7280', fontWeight: '500' },
  content: { flex: 1, paddingHorizontal: 16 },
  welcomeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 4 },
  greeting: { fontSize: 14, color: '#6B7280' },
  userName: { fontSize: 22, fontWeight: '800', color: '#111827', marginTop: 4 },
  avatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.purple100 },
  avatarText: { fontSize: 22, fontWeight: '700', color: COLORS.purple700 },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  statCard: { flex: 1, borderRadius: 16, padding: 20, alignItems: 'center' },
  statValue: { fontSize: 32, fontWeight: '800', color: '#111827', marginTop: 8 },
  statLabel: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  sectionHeader: { marginTop: 24, marginBottom: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E40AF' },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickActionCard: { width: (width - 32 - 12) / 2, minHeight: 120, borderRadius: 16, padding: 20, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 8 },
  ctaCard: { marginTop: 24, borderRadius: 16, overflow: 'hidden' },
  ctaHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: 'rgba(147, 51, 234, 0.12)' },
  ctaTitle: { fontSize: 18, fontWeight: '700', color: COLORS.purple700 },
  ctaBody: { padding: 20 },
  ctaText: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, backgroundColor: COLORS.purple600 },
  ctaBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
