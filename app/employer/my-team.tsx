import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, ImageBackground, Image, Platform, TextInput as RNTextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';

const COLORS = { purple100: '#F3E8FF', purple200: '#E9D5FF', purple300: '#D8B4FE', purple400: '#C084FC', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED', purple800: '#6D28D9', blue100: '#DBEAFE', blue200: '#BFDBFE', blue300: '#93C5FD', blue400: '#60A5FA', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8', white: '#FFFFFF', gray900: '#111827' };

type TeamMember = { id: string; full_name: string | null; email: string | null; status: string; role: string; };

export default function MyTeamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { loadTeam(); }, []);

  const loadTeam = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/auth/login'); return; }
      const { data: workers } = await supabase.from('profiles').select('id, full_name, email, employed_by').eq('user_type', 'worker');
      const team = (workers || []).map((w) => {
        const emp = (w.employed_by || []).find((e: any) => e.employer_id === user.id);
        if (!emp) return null;
        return { id: w.id, full_name: w.full_name, email: w.email, status: emp.status || 'active', role: emp.role || 'employee' };
      }).filter(Boolean) as TeamMember[];
      setMembers(team);
    } catch (e) { Alert.alert('Error', 'Failed to load'); } finally { setLoading(false); setRefreshing(false); }
  };

  const filtered = members.filter(m => !searchQuery || m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()));

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
        <Text style={styles.headerTitle}>My Team</Text>
        <TouchableOpacity style={styles.addBtn}><Ionicons name="person-add" size={24} color="#FFF" /></TouchableOpacity>
      </LinearGradient>

      <LinearGradient colors={[COLORS.purple300, COLORS.blue200]} style={styles.searchBox}>
        <Ionicons name="search" size={20} color={COLORS.purple600} />
        <RNTextInput style={styles.searchInput} placeholder="Search team..." placeholderTextColor={COLORS.purple400} value={searchQuery} onChangeText={setSearchQuery} />
      </LinearGradient>

      <LinearGradient colors={[COLORS.purple400, COLORS.blue400]} style={styles.statsBar}>
        <View style={styles.stat}><Text style={styles.statNum}>{members.length}</Text><Text style={styles.statLabel}>Total</Text></View>
        <View style={styles.stat}><Text style={styles.statNum}>{members.filter(m => m.status === 'active').length}</Text><Text style={styles.statLabel}>Active</Text></View>
      </LinearGradient>

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTeam(); }} tintColor="#FFF" />}>
        {filtered.length === 0 ? (
          <LinearGradient colors={[COLORS.purple200, COLORS.blue200]} style={styles.emptyCard}>
            <Ionicons name="people-outline" size={64} color={COLORS.purple600} />
            <Text style={styles.emptyTitle}>No team members yet</Text>
            <Text style={styles.emptyText}>Add team members to get started</Text>
          </LinearGradient>
        ) : (
          filtered.map((m) => (
            <TouchableOpacity key={m.id} onPress={() => router.push(`/employer/worker-profile?workerId=${m.id}` as any)}>
              <LinearGradient colors={[COLORS.purple200, COLORS.blue200]} style={styles.card}>
                <LinearGradient colors={[COLORS.purple500, COLORS.blue500]} style={styles.cardAvatar}>
                  <Text style={styles.avatarText}>{m.full_name?.[0]?.toUpperCase() || '?'}</Text>
                </LinearGradient>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{m.full_name || 'Unknown'}</Text>
                  <Text style={styles.cardRole}>{m.role}</Text>
                  <Text style={styles.cardEmail}>{m.email}</Text>
                </View>
                <LinearGradient colors={m.status === 'active' ? [COLORS.blue300, COLORS.blue200] : [COLORS.purple200, COLORS.purple100]} style={styles.statusBadge}>
                  <Text style={styles.statusText}>{m.status}</Text>
                </LinearGradient>
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
  logoBox: { position: 'absolute', top: Platform.OS === 'web' ? 16 : 52, left: 16, zIndex: 1000, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, padding: 8 },
  logo: { width: 32, height: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'web' ? 70 : 100, paddingBottom: 16, paddingHorizontal: 20 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFF' },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  searchBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginVertical: 12, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 20, gap: 12 },
  searchInput: { flex: 1, fontSize: 16, color: COLORS.gray900 },
  statsBar: { flexDirection: 'row', marginHorizontal: 16, borderRadius: 16, padding: 16, gap: 24, marginBottom: 12 },
  stat: { alignItems: 'center' },
  statNum: { fontSize: 28, fontWeight: '800', color: '#FFF' },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.9)' },
  content: { flex: 1, paddingHorizontal: 16 },
  emptyCard: { borderRadius: 24, padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.purple800, marginTop: 16 },
  emptyText: { fontSize: 14, color: COLORS.purple600, marginTop: 8 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 12 },
  cardAvatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  cardInfo: { flex: 1, marginLeft: 16 },
  cardName: { fontSize: 17, fontWeight: '700', color: COLORS.gray900 },
  cardRole: { fontSize: 14, color: COLORS.purple600, marginTop: 2 },
  cardEmail: { fontSize: 12, color: COLORS.purple400, marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600', color: COLORS.purple700, textTransform: 'capitalize' },
});
