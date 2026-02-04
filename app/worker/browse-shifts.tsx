import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, ImageBackground, Image, Platform, TextInput as RNTextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';

const COLORS = { purple100: '#F3E8FF', purple200: '#E9D5FF', purple300: '#D8B4FE', purple400: '#C084FC', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED', purple800: '#6D28D9', blue100: '#DBEAFE', blue200: '#BFDBFE', blue300: '#93C5FD', blue400: '#60A5FA', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8', white: '#FFFFFF', gray900: '#111827' };

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
        <Text style={styles.headerTitle}>Browse Shifts</Text>
        <View style={{ width: 44 }} />
      </LinearGradient>

      <LinearGradient colors={[COLORS.purple300, COLORS.blue200]} style={styles.searchBox}>
        <Ionicons name="search" size={20} color={COLORS.purple600} />
        <RNTextInput style={styles.searchInput} placeholder="Search shifts..." placeholderTextColor={COLORS.purple400} value={searchQuery} onChangeText={setSearchQuery} />
      </LinearGradient>

      <LinearGradient colors={[COLORS.purple500, COLORS.blue500]} style={styles.resultsBar}>
        <Text style={styles.resultsText}>{filtered.length} shifts available</Text>
      </LinearGradient>

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadShifts(); }} tintColor="#FFF" />}>
        {filtered.length === 0 ? (
          <LinearGradient colors={[COLORS.purple200, COLORS.blue200]} style={styles.emptyCard}>
            <Ionicons name="briefcase-outline" size={64} color={COLORS.purple600} />
            <Text style={styles.emptyTitle}>No shifts available</Text>
          </LinearGradient>
        ) : (
          filtered.map((s) => (
            <TouchableOpacity key={s.id} onPress={() => router.push(`/worker/shift/${s.id}` as any)}>
              <LinearGradient colors={[COLORS.purple200, COLORS.blue200]} style={styles.card}>
                <View style={styles.cardHeader}>
                  <LinearGradient colors={[COLORS.purple500, COLORS.blue500]} style={styles.cardIcon}>
                    <Ionicons name="briefcase" size={24} color="#FFF" />
                  </LinearGradient>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{s.title}</Text>
                    <Text style={styles.cardEmployer}>{s.employer_name}</Text>
                  </View>
                  <LinearGradient colors={[COLORS.purple600, COLORS.blue600]} style={styles.rateBadge}>
                    <Text style={styles.rateText}>${s.hourly_rate}/hr</Text>
                  </LinearGradient>
                </View>
                <View style={styles.cardDetails}>
                  <View style={styles.detailRow}><Ionicons name="calendar" size={16} color={COLORS.purple600} /><Text style={styles.detailText}>{formatDate(s.shift_date)}</Text></View>
                  <View style={styles.detailRow}><Ionicons name="location" size={16} color={COLORS.blue600} /><Text style={styles.detailText} numberOfLines={1}>{s.location}</Text></View>
                </View>
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
  searchBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginVertical: 12, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 20, gap: 12 },
  searchInput: { flex: 1, fontSize: 16, color: COLORS.gray900 },
  resultsBar: { marginHorizontal: 16, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, marginBottom: 12 },
  resultsText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  content: { flex: 1, paddingHorizontal: 16 },
  emptyCard: { borderRadius: 24, padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.purple800, marginTop: 16 },
  card: { borderRadius: 20, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardIcon: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, marginLeft: 16 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: COLORS.gray900 },
  cardEmployer: { fontSize: 14, color: COLORS.purple600, marginTop: 2 },
  rateBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  rateText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  cardDetails: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.purple300, gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailText: { fontSize: 14, color: COLORS.purple700, flex: 1 },
});
