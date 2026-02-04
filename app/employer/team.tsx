import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Platform, ImageBackground, Image, Dimensions, TextInput as RNTextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Button, Dialog, Portal, TextInput } from 'react-native-paper';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';
import { inviteTeamMember, bulkInviteTeamMembers } from '../../services/team';

const { width } = Dimensions.get('window');

const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

type TeamMember = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  onboarding_type: string | null;
  employed_by: any;
  status: 'active' | 'inactive';
  role: string;
};

export default function TeamManagement() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { loadTeamMembers(); }, []);

  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/auth/login'); return; }

      const { data: allWorkers } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, onboarding_type, employed_by')
        .eq('user_type', 'worker');

      const members = (allWorkers || []).map((worker) => {
        const employedBy = worker.employed_by || [];
        if (!Array.isArray(employedBy)) return null;
        const employment = employedBy.find((emp: any) => emp.employer_id === user.id);
        if (!employment) return null;
        return { ...worker, status: employment.status || 'active', role: employment.role || 'employee' } as TeamMember;
      }).filter(Boolean) as TeamMember[];

      setTeamMembers(members);
    } catch (error) {
      Alert.alert('Error', 'Failed to load team');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) { Alert.alert('Error', 'Email is required'); return; }
    setSendingInvite(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await inviteTeamMember(user.id, { email: inviteEmail, name: inviteName, phone: invitePhone, role: inviteRole });
      Alert.alert('Success', 'Invitation sent!');
      setShowInviteDialog(false);
      setInviteEmail(''); setInviteName(''); setInvitePhone(''); setInviteRole('');
      loadTeamMembers();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSendingInvite(false);
    }
  };

  const filteredMembers = teamMembers.filter(m => 
    !searchQuery.trim() || 
    m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <ImageBackground source={require('../../assets/images/background.webp')} style={styles.container} resizeMode="cover">
        <LinearGradient colors={['rgba(139, 92, 246, 0.92)', 'rgba(59, 130, 246, 0.88)', 'rgba(147, 51, 234, 0.85)']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.logoBox}><Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" /></View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.white} />
          <Text style={styles.loadingText}>Loading team...</Text>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={require('../../assets/images/background.webp')} style={styles.container} resizeMode="cover">
      <LinearGradient colors={['rgba(139, 92, 246, 0.92)', 'rgba(59, 130, 246, 0.88)', 'rgba(147, 51, 234, 0.85)']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.logoBox}><Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" /></View>

      {/* Header */}
      <LinearGradient colors={[COLORS.purple600, COLORS.purple700, COLORS.blue600]} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="people" size={24} color={COLORS.white} />
          <Text style={styles.headerTitle}>Manage Team</Text>
        </View>
        <TouchableOpacity onPress={() => setShowInviteDialog(true)} style={styles.addBtn}>
          <Ionicons name="person-add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </LinearGradient>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={COLORS.gray400} />
          <RNTextInput style={styles.searchInput} placeholder="Search team..." placeholderTextColor={COLORS.gray400} value={searchQuery} onChangeText={setSearchQuery} />
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <LinearGradient colors={[COLORS.purple100, COLORS.purple50]} style={styles.statGradient}>
            <Ionicons name="people" size={24} color={COLORS.purple600} />
            <Text style={styles.statValue}>{teamMembers.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </LinearGradient>
        </View>
        <View style={styles.statCard}>
          <LinearGradient colors={[COLORS.blue100, COLORS.blue50]} style={styles.statGradient}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.blue600} />
            <Text style={styles.statValue}>{teamMembers.filter(m => m.status === 'active').length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </LinearGradient>
        </View>
      </View>

      {/* Team List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTeamMembers(); }} tintColor={COLORS.purple600} />}>
        {filteredMembers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}><Ionicons name="people-outline" size={64} color={COLORS.purple300} /></View>
            <Text style={styles.emptyTitle}>No team members</Text>
            <Text style={styles.emptyText}>Add team members to get started</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowInviteDialog(true)}>
              <LinearGradient colors={[COLORS.purple600, COLORS.blue600]} style={styles.emptyBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="person-add" size={20} color={COLORS.white} />
                <Text style={styles.emptyBtnText}>Add Member</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          filteredMembers.map((member) => (
            <TouchableOpacity key={member.id} style={styles.memberCard} onPress={() => router.push(`/employer/worker-profile?workerId=${member.id}` as any)}>
              <View style={styles.memberHeader}>
                <LinearGradient colors={[COLORS.purple500, COLORS.blue500]} style={styles.avatar}>
                  <Text style={styles.avatarText}>{member.full_name?.[0]?.toUpperCase() || '?'}</Text>
                </LinearGradient>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.full_name || 'Unknown'}</Text>
                  <Text style={styles.memberRole}>{member.role}</Text>
                  <Text style={styles.memberEmail}>{member.email}</Text>
                </View>
                <View style={[styles.statusBadge, member.status === 'active' ? styles.statusActive : styles.statusInactive]}>
                  <Text style={styles.statusText}>{member.status}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Invite Dialog */}
      <Portal>
        <Dialog visible={showInviteDialog} onDismiss={() => setShowInviteDialog(false)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>Invite Team Member</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Email *" value={inviteEmail} onChangeText={setInviteEmail} mode="outlined" keyboardType="email-address" style={styles.dialogInput} outlineColor={COLORS.purple200} activeOutlineColor={COLORS.purple600} />
            <TextInput label="Name" value={inviteName} onChangeText={setInviteName} mode="outlined" style={styles.dialogInput} outlineColor={COLORS.purple200} activeOutlineColor={COLORS.purple600} />
            <TextInput label="Phone" value={invitePhone} onChangeText={setInvitePhone} mode="outlined" keyboardType="phone-pad" style={styles.dialogInput} outlineColor={COLORS.purple200} activeOutlineColor={COLORS.purple600} />
            <TextInput label="Role" value={inviteRole} onChangeText={setInviteRole} mode="outlined" placeholder="e.g. waiter" style={styles.dialogInput} outlineColor={COLORS.purple200} activeOutlineColor={COLORS.purple600} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowInviteDialog(false)} textColor={COLORS.gray500}>Cancel</Button>
            <Button onPress={handleInvite} mode="contained" buttonColor={COLORS.purple600} loading={sendingInvite}>Invite</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  logoBox: { position: 'absolute', top: Platform.OS === 'web' ? 16 : 52, left: 16, zIndex: 1000, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, padding: 8, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
  logo: { width: 32, height: 32 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: COLORS.white, fontWeight: '500' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'web' ? 70 : 100, paddingBottom: 20, paddingHorizontal: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.white },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 16, color: COLORS.gray900 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 8 },
  statCard: { flex: 1, borderRadius: 16, overflow: 'hidden', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  statGradient: { padding: 16, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800', color: COLORS.gray900, marginTop: 8 },
  statLabel: { fontSize: 12, color: COLORS.gray500, marginTop: 4 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIcon: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: COLORS.white, marginBottom: 8 },
  emptyText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 24 },
  emptyBtn: { borderRadius: 16, overflow: 'hidden' },
  emptyBtnGradient: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 24 },
  emptyBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  memberCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6 },
  memberHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 22, fontWeight: '700', color: COLORS.white },
  memberInfo: { flex: 1, marginLeft: 16 },
  memberName: { fontSize: 18, fontWeight: '700', color: COLORS.gray900 },
  memberRole: { fontSize: 14, color: COLORS.purple600, marginTop: 2 },
  memberEmail: { fontSize: 12, color: COLORS.gray400, marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusActive: { backgroundColor: COLORS.blue100 },
  statusInactive: { backgroundColor: COLORS.gray100 },
  statusText: { fontSize: 12, fontWeight: '600', color: COLORS.blue600, textTransform: 'capitalize' },
  dialog: { borderRadius: 20, backgroundColor: COLORS.white },
  dialogTitle: { fontSize: 20, fontWeight: '700', color: COLORS.gray900 },
  dialogInput: { marginBottom: 12, backgroundColor: COLORS.white },
});
