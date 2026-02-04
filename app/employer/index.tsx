import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, ImageBackground, Image, Platform, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';

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
      const { count: sc } = await supabase.from('shifts').select('*', { count: 'exact', head: true }).eq('employer_id', user.id).eq('status', 'open');
      const { count: ac } = await supabase.from('shift_applications').select('*, shifts!inner(employer_id)', { count: 'exact', head: true }).eq('shifts.employer_id', user.id).eq('status', 'pending');
      setStats({ activeShifts: sc || 0, pendingApps: ac || 0 });
    } catch (e) { console.error(e); } finally { setLoading(false); setRefreshing(false); }
  };

  const menuItems = [
    { icon: 'add-circle', label: 'Post Shift', route: '/employer/post-shift', colors: [COLORS.purple600, COLORS.blue600] },
    { icon: 'calendar', label: 'My Shifts', route: '/employer/my-shifts', colors: [COLORS.blue600, COLORS.purple600] },
    { icon: 'people', label: 'My Team', route: '/employer/my-team', colors: [COLORS.purple700, COLORS.blue700] },
    { icon: 'document-text', label: 'Applications', route: '/employer/applications', colors: [COLORS.blue700, COLORS.purple700] },
    { icon: 'heart', label: 'Favorites', route: '/employer/favorites', colors: [COLORS.purple500, COLORS.purple700] },
    { icon: 'card', label: 'Payments', route: '/employer/payments', colors: [COLORS.blue500, COLORS.blue700] },
    { icon: 'grid', label: 'Rota', route: '/employer/rota', colors: [COLORS.purple600, COLORS.blue500] },
    { icon: 'settings', label: 'Settings', route: '/employer/settings', colors: [COLORS.blue600, COLORS.purple500] },
  ];

  if (loading) {
    return (
      <ImageBackground source={require('../../assets/images/background.webp')} style={styles.container} resizeMode="cover">
        <LinearGradient colors={['rgba(139, 92, 246, 0.95)', 'rgba(59, 130, 246, 0.92)', 'rgba(147, 51, 234, 0.90)']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.logoBox}><Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" /></View>
        <View style={styles.center}><ActivityIndicator size="large" color="#FFF" /><Text style={styles.loadingText}>Loading...</Text></View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={require('../../assets/images/background.webp')} style={styles.container} resizeMode="cover">
      <LinearGradient colors={['rgba(139, 92, 246, 0.95)', 'rgba(59, 130, 246, 0.92)', 'rgba(147, 51, 234, 0.90)']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.logoBox}><Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" /></View>

      <LinearGradient colors={[COLORS.purple700, COLORS.blue600]} style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{profile?.company_name || profile?.full_name || 'Employer'}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/employer/profile' as any)}>
          <LinearGradient colors={[COLORS.purple400, COLORS.blue400]} style={styles.avatar}>
            <Text style={styles.avatarText}>{profile?.full_name?.[0]?.toUpperCase() || 'E'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#FFF" />}>
        
        <View style={styles.statsRow}>
          <LinearGradient colors={[COLORS.purple400, COLORS.purple300]} style={styles.statCard}>
            <Ionicons name="briefcase" size={32} color={COLORS.white} />
            <Text style={styles.statValue}>{stats.activeShifts}</Text>
            <Text style={styles.statLabel}>Active Shifts</Text>
          </LinearGradient>
          <LinearGradient colors={[COLORS.blue400, COLORS.blue300]} style={styles.statCard}>
            <Ionicons name="document-text" size={32} color={COLORS.white} />
            <Text style={styles.statValue}>{stats.pendingApps}</Text>
            <Text style={styles.statLabel}>Pending Apps</Text>
          </LinearGradient>
        </View>

        <LinearGradient colors={[COLORS.purple500, COLORS.blue500]} style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </LinearGradient>

        <View style={styles.menuGrid}>
          {menuItems.map((item, i) => (
            <TouchableOpacity key={i} style={styles.menuItem} onPress={() => router.push(item.route as any)}>
              <LinearGradient colors={item.colors} style={styles.menuGradient}>
                <Ionicons name={item.icon as any} size={36} color={COLORS.white} />
                <Text style={styles.menuLabel}>{item.label}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        <LinearGradient colors={[COLORS.purple300, COLORS.blue300]} style={styles.ctaCard}>
          <LinearGradient colors={[COLORS.purple600, COLORS.blue600]} style={styles.ctaHeader}>
            <Ionicons name="flash" size={24} color={COLORS.white} />
            <Text style={styles.ctaTitle}>Post Your First Shift</Text>
          </LinearGradient>
          <View style={styles.ctaBody}>
            <Text style={styles.ctaText}>Get started by posting a shift to attract workers</Text>
            <TouchableOpacity onPress={() => router.push('/employer/post-shift' as any)}>
              <LinearGradient colors={[COLORS.purple600, COLORS.blue600]} style={styles.ctaBtn}>
                <Ionicons name="add" size={20} color={COLORS.white} />
                <Text style={styles.ctaBtnText}>Post Shift</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>

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
  loadingText: { marginTop: 12, fontSize: 16, color: '#FFF', fontWeight: '500' },
  header: { paddingTop: Platform.OS === 'web' ? 70 : 100, paddingBottom: 24, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  userName: { fontSize: 26, fontWeight: '800', color: '#FFF', marginTop: 4 },
  avatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 22, fontWeight: '700', color: '#FFF' },
  content: { flex: 1, paddingHorizontal: 16 },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  statCard: { flex: 1, borderRadius: 20, padding: 20, alignItems: 'center' },
  statValue: { fontSize: 36, fontWeight: '800', color: '#FFF', marginTop: 8 },
  statLabel: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  sectionHeader: { marginTop: 24, marginBottom: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  menuItem: { width: (width - 44) / 2, borderRadius: 20, overflow: 'hidden' },
  menuGradient: { padding: 24, alignItems: 'center', gap: 12 },
  menuLabel: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  ctaCard: { marginTop: 24, borderRadius: 24, overflow: 'hidden' },
  ctaHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  ctaTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  ctaBody: { padding: 20 },
  ctaText: { fontSize: 14, color: COLORS.purple800, marginBottom: 16 },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 16 },
  ctaBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
