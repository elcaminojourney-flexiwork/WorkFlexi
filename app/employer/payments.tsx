import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, ImageBackground, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray100: '#F3F4F6', gray400: '#9CA3AF', gray500: '#6B7280', gray900: '#111827',
  white: '#FFFFFF', success: '#3B82F6',
};

type Payment = { id: string; amount: number; status: string; worker_name: string | null; created_at: string; };

export default function PaymentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => { loadPayments(); }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/auth/login'); return; }

      const { data } = await supabase
        .from('payments')
        .select('id, amount, status, created_at, profiles!payments_worker_id_fkey(full_name)')
        .eq('employer_id', user.id)
        .order('created_at', { ascending: false });

      const mapped = (data || []).map((p: any) => ({
        id: p.id, amount: p.amount, status: p.status, created_at: p.created_at,
        worker_name: p.profiles?.full_name,
      }));
      setPayments(mapped);
    } catch (e) {
      Alert.alert('Error', 'Failed to load payments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filtered = payments.filter(p => filter === 'all' || p.status === filter);
  const totalPending = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return (
      <ImageBackground source={require('../../assets/images/background.webp')} style={styles.container} resizeMode="cover">
        <LinearGradient colors={['rgba(139, 92, 246, 0.92)', 'rgba(59, 130, 246, 0.88)', 'rgba(147, 51, 234, 0.85)']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.logoBox}><Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" /></View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.white} />
          <Text style={styles.loadingText}>Loading payments...</Text>
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
          <Ionicons name="card" size={24} color={COLORS.white} />
          <Text style={styles.headerTitle}>Payments</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <LinearGradient colors={[COLORS.purple100, COLORS.purple50]} style={styles.statGradient}>
            <Ionicons name="time" size={24} color={COLORS.purple600} />
            <Text style={styles.statValue}>${totalPending.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </LinearGradient>
        </View>
        <View style={styles.statCard}>
          <LinearGradient colors={[COLORS.blue100, COLORS.blue50]} style={styles.statGradient}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.blue600} />
            <Text style={styles.statValue}>${totalPaid.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Paid</Text>
          </LinearGradient>
        </View>
      </View>

      <View style={styles.filterRow}>
        {(['all', 'pending', 'completed'] as const).map((f) => (
          <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterBtnActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPayments(); }} tintColor={COLORS.purple600} />}>
        {filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}><Ionicons name="card-outline" size={64} color={COLORS.purple300} /></View>
            <Text style={styles.emptyTitle}>No payments</Text>
            <Text style={styles.emptyText}>Payments will appear here after shifts are completed</Text>
          </View>
        ) : (
          filtered.map((payment) => (
            <TouchableOpacity key={payment.id} style={styles.card} onPress={() => router.push(`/employer/payment/${payment.id}` as any)}>
              <View style={styles.cardHeader}>
                <LinearGradient colors={[COLORS.purple500, COLORS.blue500]} style={styles.avatar}>
                  <Ionicons name="card" size={24} color={COLORS.white} />
                </LinearGradient>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{payment.worker_name || 'Unknown Worker'}</Text>
                  <Text style={styles.cardDate}>{new Date(payment.created_at).toLocaleDateString()}</Text>
                </View>
                <View style={styles.amountContainer}>
                  <Text style={styles.amount}>${payment.amount.toFixed(2)}</Text>
                  <View style={[styles.statusBadge, payment.status === 'completed' ? styles.statusCompleted : styles.statusPending]}>
                    <Text style={styles.statusText}>{payment.status}</Text>
                  </View>
                </View>
              </View>
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
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  statCard: { flex: 1, borderRadius: 16, overflow: 'hidden', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  statGradient: { padding: 16, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#111827', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center' },
  filterBtnActive: { backgroundColor: '#FFFFFF' },
  filterText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', textTransform: 'capitalize' },
  filterTextActive: { color: COLORS.purple600 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIcon: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  emptyText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, marginLeft: 16 },
  cardName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  cardDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  amountContainer: { alignItems: 'flex-end' },
  amount: { fontSize: 20, fontWeight: '800', color: COLORS.purple600 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 4 },
  statusCompleted: { backgroundColor: '#D1FAE5' },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize', color: '#374151' },
});
