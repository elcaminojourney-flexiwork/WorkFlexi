import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, ImageBackground, Image, Platform, TextInput as RNTextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

type Favorite = { id: string; worker_id: string; worker_name: string | null; worker_email: string | null; average_rating: number | null; notes: string | null; };

export default function FavoritesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { loadFavorites(); }, []);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/auth/select-user-type'); return; }

      const { data } = await supabase
        .from('favorites')
        .select('id, worker_id, notes, profiles!favorites_worker_id_fkey(full_name, email, average_rating)')
        .eq('employer_id', user.id);

      const mapped = (data || []).map((f: any) => ({
        id: f.id,
        worker_id: f.worker_id,
        worker_name: f.profiles?.full_name,
        worker_email: f.profiles?.email,
        average_rating: f.profiles?.average_rating,
        notes: f.notes,
      }));
      setFavorites(mapped);
    } catch (e) {
      Alert.alert('Error', 'Failed to load favorites');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const removeFavorite = async (id: string) => {
    Alert.alert('Remove Favorite', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await supabase.from('favorites').delete().eq('id', id);
        setFavorites(favorites.filter(f => f.id !== id));
      }},
    ]);
  };

  const filtered = favorites.filter(f => !searchQuery.trim() || f.worker_name?.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) {
    return (
      <ImageBackground source={require('../../assets/images/background.webp')} style={styles.container} resizeMode="cover">
        <LinearGradient colors={['rgba(139, 92, 246, 0.92)', 'rgba(59, 130, 246, 0.88)', 'rgba(147, 51, 234, 0.85)']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.logoBox}><Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" /></View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.white} />
          <Text style={styles.loadingText}>Loading favorites...</Text>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={require('../../assets/images/background.webp')} style={styles.container} resizeMode="cover">
      <LinearGradient colors={['rgba(139, 92, 246, 0.92)', 'rgba(59, 130, 246, 0.88)', 'rgba(147, 51, 234, 0.85)']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.logoBox}><Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" /></View>

      <LinearGradient colors={[COLORS.purple600, COLORS.purple700, COLORS.blue600]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="heart" size={24} color={COLORS.white} />
          <Text style={styles.headerTitle}>Favorites</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={COLORS.gray400} />
          <RNTextInput style={styles.searchInput} placeholder="Search favorites..." placeholderTextColor={COLORS.gray400} value={searchQuery} onChangeText={setSearchQuery} />
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <LinearGradient colors={[COLORS.purple100, COLORS.purple50]} style={styles.statGradient}>
            <Ionicons name="heart" size={24} color={COLORS.purple600} />
            <Text style={styles.statValue}>{favorites.length}</Text>
            <Text style={styles.statLabel}>Favorites</Text>
          </LinearGradient>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadFavorites(); }} tintColor={COLORS.purple600} />}>
        {filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}><Ionicons name="heart-outline" size={64} color={COLORS.purple300} /></View>
            <Text style={styles.emptyTitle}>No favorites yet</Text>
            <Text style={styles.emptyText}>Add workers to your favorites for quick access</Text>
          </View>
        ) : (
          filtered.map((fav) => (
            <TouchableOpacity key={fav.id} style={styles.card} onPress={() => router.push(`/employer/worker-profile?workerId=${fav.worker_id}` as any)}>
              <View style={styles.cardHeader}>
                <LinearGradient colors={[COLORS.purple500, COLORS.blue500]} style={styles.avatar}>
                  <Text style={styles.avatarText}>{fav.worker_name?.[0]?.toUpperCase() || '?'}</Text>
                </LinearGradient>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{fav.worker_name || 'Unknown'}</Text>
                  <Text style={styles.cardEmail}>{fav.worker_email}</Text>
                  {fav.average_rating && (
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={14} color="#A855F7" />
                      <Text style={styles.ratingText}>{fav.average_rating.toFixed(1)}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity onPress={() => removeFavorite(fav.id)} style={styles.removeBtn}>
                  <Ionicons name="heart-dislike" size={20} color={COLORS.purple600} />
                </TouchableOpacity>
              </View>
              {fav.notes && <Text style={styles.notes}>{fav.notes}</Text>}
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
  logoBox: { position: 'absolute', top: Platform.OS === 'web' ? 16 : 52, left: 16, zIndex: 1000, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, padding: 8, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
  logo: { width: 32, height: 32 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#FFFFFF', fontWeight: '500' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'web' ? 70 : 100, paddingBottom: 20, paddingHorizontal: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 16, color: '#111827' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 8 },
  statCard: { flex: 1, borderRadius: 16, overflow: 'hidden', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  statGradient: { padding: 16, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800', color: '#111827', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIcon: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  emptyText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  cardInfo: { flex: 1, marginLeft: 16 },
  cardName: { fontSize: 18, fontWeight: '700', color: '#111827' },
  cardEmail: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingText: { fontSize: 14, fontWeight: '600', color: '#111827' },
  removeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FAF5FF', justifyContent: 'center', alignItems: 'center' },
  notes: { fontSize: 14, color: '#6B7280', marginTop: 12, padding: 12, backgroundColor: '#F9FAFB', borderRadius: 12 },
});
