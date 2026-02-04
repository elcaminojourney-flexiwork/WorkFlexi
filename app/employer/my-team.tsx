import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, TextInput as RNTextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';
import ConstitutionalScreen, { PanelPurple, PanelBlue } from '../../components/ConstitutionalScreen';

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
      if (!user) { router.replace('/auth/select-user-type'); return; }
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
      <ConstitutionalScreen title="My Team" showBack onBack={() => router.back()} showLogo theme="light">
        <View style={styles.center}><ActivityIndicator size="large" color="#3B82F6" /></View>
      </ConstitutionalScreen>
    );
  }

  return (
    <ConstitutionalScreen title="My Team" showBack onBack={() => router.back()} showLogo theme="light">
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color="#6B7280" />
        <RNTextInput style={styles.searchInput} placeholder="Search team..." placeholderTextColor="#9CA3AF" value={searchQuery} onChangeText={setSearchQuery} />
      </View>

      <PanelBlue style={styles.statsBar}>
        <View style={styles.stat}><Text style={styles.statNum}>{members.length}</Text><Text style={styles.statLabel}>Total</Text></View>
        <View style={styles.stat}><Text style={styles.statNum}>{members.filter(m => m.status === 'active').length}</Text><Text style={styles.statLabel}>Active</Text></View>
      </PanelBlue>

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTeam(); }} />}>
        {filtered.length === 0 ? (
          <PanelPurple style={styles.emptyCard}>
            <Ionicons name="people-outline" size={64} color={COLORS.purple600} />
            <Text style={styles.emptyTitle}>No team members yet</Text>
            <Text style={styles.emptyText}>Add team members to get started</Text>
          </PanelPurple>
        ) : (
          filtered.map((m) => (
            <PanelPurple key={m.id} style={styles.card} onPress={() => router.push(`/employer/worker-profile?workerId=${m.id}` as any)}>
              <View style={styles.cardAvatar}>
                <Text style={styles.avatarText}>{m.full_name?.[0]?.toUpperCase() || '?'}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{m.full_name || 'Unknown'}</Text>
                <Text style={styles.cardRole}>{m.role}</Text>
                <Text style={styles.cardEmail}>{m.email}</Text>
              </View>
              <View style={[styles.statusBadge, m.status === 'active' ? styles.statusActive : styles.statusInactive]}>
                <Text style={styles.statusText}>{m.status}</Text>
              </View>
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
  searchBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginVertical: 12, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, gap: 12, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB' },
  searchInput: { flex: 1, fontSize: 16, color: COLORS.gray900 },
  statsBar: { flexDirection: 'row', marginHorizontal: 16, borderRadius: 16, padding: 16, gap: 24, marginBottom: 12 },
  stat: { alignItems: 'center' },
  statNum: { fontSize: 28, fontWeight: '800', color: '#1E40AF' },
  statLabel: { fontSize: 12, color: '#6B7280' },
  content: { flex: 1, paddingHorizontal: 16 },
  emptyCard: { borderRadius: 16, padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.purple800, marginTop: 16 },
  emptyText: { fontSize: 14, color: '#6B7280', marginTop: 8 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 12 },
  cardAvatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.purple200 },
  avatarText: { fontSize: 20, fontWeight: '700', color: COLORS.purple700 },
  cardInfo: { flex: 1, marginLeft: 16 },
  cardName: { fontSize: 17, fontWeight: '700', color: COLORS.gray900 },
  cardRole: { fontSize: 14, color: COLORS.purple600, marginTop: 2 },
  cardEmail: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: COLORS.purple100 },
  statusActive: { backgroundColor: COLORS.blue100 },
  statusInactive: { backgroundColor: COLORS.purple100 },
  statusText: { fontSize: 12, fontWeight: '600', color: '#374151', textTransform: 'capitalize' },
});
