import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, TextInput as RNTextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';
import ConstitutionalScreen, { PanelPurple, PanelBlue } from '../../components/ConstitutionalScreen';

const COLORS = { purple200: '#E9D5FF', purple400: '#C084FC', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', white: '#FFFFFF' };

type Shift = { id: string; title: string; shift_date: string; start_time: string; location: string; hourly_rate: number; employer_name?: string; };

export default function BrowseShiftsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { loadShifts(); }, []);

  const loadShifts = async () => {
    try {
      setLoading(true);
      const { data } = await supabase.from('shifts').select('*, profiles!shifts_employer_id_fkey(full_name, company_name)').eq('status', 'open').in('visibility', ['marketplace', 'both']).order('shift_date', { ascending: true });
      setShifts((data || []).map((s: any) => ({ ...s, employer_name: s.profiles?.company_name || s.profiles?.full_name || 'Unknown' })));
    } catch (e) { Alert.alert('Error', 'Failed'); } finally { setLoading(false); setRefreshing(false); }
  };

  const filtered = shifts.filter(s => !searchQuery || s.title?.toLowerCase().includes(searchQuery.toLowerCase()));
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

  if (loading) {
    return (
      <ConstitutionalScreen title="Browse Shifts" showBack onBack={() => router.back()} showLogo>
        <View style={styles.center}><ActivityIndicator size="large" color="#FFF" /></View>
      </ConstitutionalScreen>
    );
  }

  return (
    <ConstitutionalScreen title="Browse Shifts" showBack onBack={() => router.back()} showLogo>
      <PanelPurple style={styles.searchBox}>
        <Ionicons name="search" size={20} color="#7C3AED" />
        <RNTextInput style={styles.searchInput} placeholder="Search shifts..." placeholderTextColor="#9CA3AF" value={searchQuery} onChangeText={setSearchQuery} />
      </PanelPurple>
      <PanelBlue style={styles.resultsBar}>
        <Text style={styles.resultsText}>{filtered.length} shifts available</Text>
      </PanelBlue>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadShifts(); }} tintColor="#FFF" />}>
        {filtered.length === 0 ? (
          <PanelBlue>
            <View style={styles.emptyCard}>
              <Ionicons name="briefcase-outline" size={64} color="#2563EB" />
              <Text style={styles.emptyTitle}>No shifts available</Text>
            </View>
          </PanelBlue>
        ) : (
          filtered.map((s) => (
            <PanelPurple key={s.id} onPress={() => router.push(`/worker/shift/${s.id}` as any)}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIcon}><Ionicons name="briefcase" size={24} color="#7C3AED" /></View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{s.title}</Text>
                  <Text style={styles.cardEmployer}>{s.employer_name}</Text>
                </View>
                <View style={styles.rateBadge}><Text style={styles.rateText}>${s.hourly_rate}/hr</Text></View>
              </View>
              <View style={styles.cardDetails}>
                <View style={styles.detailRow}><Ionicons name="calendar" size={16} color="#7C3AED" /><Text style={styles.detailText}>{formatDate(s.shift_date)}</Text></View>
                <View style={styles.detailRow}><Ionicons name="location" size={16} color="#2563EB" /><Text style={styles.detailText} numberOfLines={1}>{s.location}</Text></View>
              </View>
            </PanelPurple>
          ))
        )}
        <View style={{ height: 80 }} />
      </ScrollView>
    </ConstitutionalScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  searchBox: { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 12 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: '#111827', paddingVertical: 4 },
  resultsBar: { paddingVertical: 12, paddingHorizontal: 16, marginBottom: 12 },
  resultsText: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  content: { paddingHorizontal: 4, paddingTop: 4 },
  emptyCard: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#7C3AED', marginTop: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3E8FF', justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, marginLeft: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  cardEmployer: { fontSize: 14, color: '#7C3AED', marginTop: 2 },
  rateBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#DBEAFE' },
  rateText: { fontSize: 14, fontWeight: '700', color: '#2563EB' },
  cardDetails: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  detailText: { marginLeft: 8, fontSize: 14, color: '#374151', flex: 1 },
});
