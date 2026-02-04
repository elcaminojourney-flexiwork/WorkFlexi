import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, ImageBackground, Image, Platform, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const COLORS = { purple100: '#F3E8FF', purple200: '#E9D5FF', purple300: '#D8B4FE', purple400: '#C084FC', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED', purple800: '#6D28D9', blue100: '#DBEAFE', blue200: '#BFDBFE', blue300: '#93C5FD', blue400: '#60A5FA', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8', white: '#FFFFFF', gray900: '#111827' };

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
      if (!user) { router.replace('/auth/login'); return; }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(p);
      const { count: pc } = await supabase.from('shift_applications').select('*', { count: 'exact', head: true }).eq('worker_id', user.id).eq('status', 'pending');
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

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#FFF" />}>
        
        <View style={styles.statsRow}>
          <LinearGradient colors={[COLORS.purple400, COLORS.purple300]} style={styles.statCard}>
            <Ionicons name="briefcase" size={32} color="#FFF" />
            <Text style={styles.statValue}>{stats.upcoming}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </LinearGradient>
          <LinearGradient colors={[COLORS.blue400, COLORS.blue300]} style={styles.statCard}>
            <Ionicons name="document-text" size={32} color="#FFF" />
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </LinearGradient>
        </View>

        <LinearGradient colors={[COLORS.purple500, COLORS.blue500]} style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </LinearGradient>

        <View style={styles.menuGrid}>
          {menuItems.map((item, i) => (
            <TouchableOpacity key={i} style={styles.menuItem} onPress={() => router.push(item.route as any)}>
              <LinearGradient colors={item.colors} style={styles.menuGradient}>
                <Ionicons name={item.icon as any} size={36} color="#FFF" />
                <Text style={styles.menuLabel}>{item.label}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        <LinearGradient colors={[COLORS.purple300, COLORS.blue300]} style={styles.ctaCard}>
          <LinearGradient colors={[COLORS.purple600, COLORS.blue600]} style={styles.ctaHeader}>
            <Ionicons name="search" size={24} color="#FFF" />
            <Text style={styles.ctaTitle}>Find Your Next Shift</Text>
          </LinearGradient>
          <View style={styles.ctaBody}>
            <Text style={styles.ctaText}>Browse available shifts and apply now!</Text>
            <TouchableOpacity onPress={() => router.push('/worker/browse-shifts' as any)}>
              <LinearGradient colors={[COLORS.purple600, COLORS.blue600]} style={styles.ctaBtn}>
                <Text style={styles.ctaBtnText}>Browse Shifts</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
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
