import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase';
import { palette, colors, typography, spacing, borderRadius, shadows } from '../../../constants/theme';
import { 
  inviteTeamMember, 
  getTeamMembersByOrganisation,
  terminateTeamMember,
  resendInvite,
} from '../../../services/team';
import ConstitutionalScreen, { CardWhite } from '../../../components/ConstitutionalScreen';


// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function TeamManagement() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const organisationId = params.organisationId as string;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [organisation, setOrganisation] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  // Invite form state
  const [inviteForm, setInviteForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    employment_type: 'part_time' as 'full_time' | 'part_time',
    selectedRoles: [] as string[],
    primaryRoleId: '',
    selectedVenues: [] as string[],
    primaryVenueId: '',
  });
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (organisationId) {
      loadData();
    }
  }, [organisationId]);

  const loadData = async () => {
    try {
      // Load organisation
      const { data: orgData, error: orgError } = await supabase
        .from('organisations')
        .select('*')
        .eq('id', organisationId)
        .single();

      if (orgError) throw orgError;
      setOrganisation(orgData);

      // Load roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .eq('organisation_id', organisationId)
        .eq('is_active', true)
        .order('sort_order');

      if (!rolesError) setRoles(rolesData || []);

      // Load venues
      const { data: venuesData, error: venuesError } = await supabase
        .from('venues')
        .select('*')
        .eq('organisation_id', organisationId)
        .eq('is_active', true);

      if (!venuesError) setVenues(venuesData || []);

      // Load team members
      const result = await getTeamMembersByOrganisation(organisationId);
      if (!result.error) {
        setTeamMembers(result.data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load team data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filteredMembers = teamMembers.filter(member => {
    const matchesFilter = filter === 'all' || member.status === filter;
    const matchesSearch = !searchQuery || 
      member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleInvite = async () => {
    if (!inviteForm.full_name.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }
    if (inviteForm.selectedRoles.length === 0) {
      Alert.alert('Error', 'Please select at least one role');
      return;
    }
    if (inviteForm.selectedVenues.length === 0) {
      Alert.alert('Error', 'Please select at least one venue');
      return;
    }

    setInviting(true);
    try {
      const result = await inviteTeamMember({
        organisation_id: organisationId,
        full_name: inviteForm.full_name,
        email: inviteForm.email || undefined,
        phone: inviteForm.phone || undefined,
        employment_type: inviteForm.employment_type,
        role_ids: inviteForm.selectedRoles,
        primary_role_id: inviteForm.primaryRoleId || inviteForm.selectedRoles[0],
        venue_ids: inviteForm.selectedVenues,
        primary_venue_id: inviteForm.primaryVenueId || inviteForm.selectedVenues[0],
      });

      if (result.error) {
        throw new Error(result.error);
      }

      Alert.alert('Success', `Invite code: ${result.data?.invite_code}\n\nShare this code with ${inviteForm.full_name} to join.`);
      setShowInviteModal(false);
      setInviteForm({
        full_name: '',
        email: '',
        phone: '',
        employment_type: 'part_time',
        selectedRoles: [],
        primaryRoleId: '',
        selectedVenues: [],
        primaryVenueId: '',
      });
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  };

  const handleResendInvite = async (memberId: string, memberName: string) => {
    Alert.alert(
      'Resend Invite',
      `Generate a new invite code for ${memberName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resend',
          onPress: async () => {
            const result = await resendInvite(memberId);
            if (result.error) {
              Alert.alert('Error', 'Failed to resend invite');
            } else {
              Alert.alert('Success', `New invite code: ${result.data?.invite_code}`);
              loadData();
            }
          },
        },
      ]
    );
  };

  const handleTerminate = async (memberId: string, memberName: string) => {
    Alert.alert(
      'Terminate Employee',
      `Are you sure you want to terminate ${memberName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Terminate',
          style: 'destructive',
          onPress: async () => {
            const result = await terminateTeamMember(memberId);
            if (result.error) {
              Alert.alert('Error', 'Failed to terminate employee');
            } else {
              Alert.alert('Success', 'Employee terminated');
              loadData();
            }
          },
        },
      ]
    );
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'active': return { backgroundColor: palette.blue[100], color: palette.blue[700] };
      case 'pending': return { backgroundColor: palette.purple[100], color: palette.purple[700] };
      case 'inactive': return { backgroundColor: palette.gray[200], color: palette.gray[600] };
      case 'terminated': return { backgroundColor: palette.purple[200], color: palette.purple[800] };
      default: return { backgroundColor: palette.gray[100], color: palette.gray[600] };
    }
  };

  const toggleRole = (roleId: string) => {
    setInviteForm(prev => {
      const selected = prev.selectedRoles.includes(roleId)
        ? prev.selectedRoles.filter(id => id !== roleId)
        : [...prev.selectedRoles, roleId];
      return {
        ...prev,
        selectedRoles: selected,
        primaryRoleId: selected.includes(prev.primaryRoleId) ? prev.primaryRoleId : selected[0] || '',
      };
    });
  };

  const toggleVenue = (venueId: string) => {
    setInviteForm(prev => {
      const selected = prev.selectedVenues.includes(venueId)
        ? prev.selectedVenues.filter(id => id !== venueId)
        : [...prev.selectedVenues, venueId];
      return {
        ...prev,
        selectedVenues: selected,
        primaryVenueId: selected.includes(prev.primaryVenueId) ? prev.primaryVenueId : selected[0] || '',
      };
    });
  };

  if (loading) {
    return (
      <ConstitutionalScreen title="Team" showBack onBack={() => router.back()} showLogo theme="light">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.purple[500]} />
          <Text style={styles.loadingText}>Loading team...</Text>
        </View>
      </ConstitutionalScreen>
    );
  }

  return (
    <ConstitutionalScreen title={organisation?.name || 'Team'} showBack onBack={() => router.back()} showLogo theme="light" scrollable={false}>
      <View style={styles.inviteRow}>
        <TouchableOpacity onPress={() => setShowInviteModal(true)} style={styles.inviteButton}>
          <Ionicons name="person-add" size={20} color="#FFFFFF" />
          <Text style={styles.inviteButtonText}>Invite Team Member</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={palette.gray[400]} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search team members..."
          placeholderTextColor={palette.gray[400]}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {(['all', 'active', 'pending', 'inactive'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
            {f !== 'all' && (
              <Text style={[styles.filterCount, filter === f && styles.filterCountActive]}>
                {teamMembers.filter(m => m.status === f).length}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Team List */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredMembers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={palette.gray[300]} />
            <Text style={styles.emptyStateTitle}>No team members found</Text>
            <Text style={styles.emptyStateText}>
              {filter === 'all' ? 'Add your first team member to get started' : `No ${filter} team members`}
            </Text>
            {filter === 'all' && (
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={() => setShowInviteModal(true)}
              >
                <Ionicons name="person-add" size={20} color={palette.white} />
                <Text style={styles.emptyStateButtonText}>Invite Team Member</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredMembers.map((member) => {
            const statusStyle = getStatusBadgeStyle(member.status);
            return (
              <CardWhite
                key={member.id}
                style={styles.memberCard}
                onPress={() => router.push(`/employer/rota/team/${member.id}?organisationId=${organisationId}`)}
              >
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberInitials}>
                    {member.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.full_name}</Text>
                  <View style={styles.memberMeta}>
                    <Text style={styles.memberType}>
                      {member.employment_type === 'full_time' ? 'Full-time' : 'Part-time'}
                    </Text>
                    {member.roles?.length > 0 && (
                      <>
                        <Text style={styles.memberDot}>•</Text>
                        <Text style={styles.memberRoles} numberOfLines={1}>
                          {member.roles.map((r: any) => r.name).join(', ')}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
                  <Text style={[styles.statusText, { color: statusStyle.color }]}>
                    {member.status}
                  </Text>
                </View>
                {member.status === 'pending' && (
                  <TouchableOpacity 
                    style={styles.resendButton}
                    onPress={() => handleResendInvite(member.id, member.full_name)}
                  >
                    <Ionicons name="refresh" size={20} color={palette.purple[500]} />
                  </TouchableOpacity>
                )}
              </CardWhite>
            );
          })
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Invite Modal */}
      <Modal
        visible={showInviteModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowInviteModal(false)}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Invite Team Member</Text>
            <TouchableOpacity 
              onPress={handleInvite}
              disabled={inviting}
            >
              {inviting ? (
                <ActivityIndicator size="small" color={palette.purple[500]} />
              ) : (
                <Text style={styles.modalSave}>Invite</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Name */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Full Name *</Text>
              <TextInput
                style={styles.formInput}
                value={inviteForm.full_name}
                onChangeText={(v) => setInviteForm(prev => ({ ...prev, full_name: v }))}
                placeholder="Enter full name"
              />
            </View>

            {/* Email */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Email</Text>
              <TextInput
                style={styles.formInput}
                value={inviteForm.email}
                onChangeText={(v) => setInviteForm(prev => ({ ...prev, email: v }))}
                placeholder="Enter email (optional)"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Phone */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Phone</Text>
              <TextInput
                style={styles.formInput}
                value={inviteForm.phone}
                onChangeText={(v) => setInviteForm(prev => ({ ...prev, phone: v }))}
                placeholder="Enter phone (optional)"
                keyboardType="phone-pad"
              />
            </View>

            {/* Employment Type */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Employment Type</Text>
              <View style={styles.typeToggle}>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    inviteForm.employment_type === 'full_time' && styles.typeOptionActive
                  ]}
                  onPress={() => setInviteForm(prev => ({ ...prev, employment_type: 'full_time' }))}
                >
                  <Text style={[
                    styles.typeOptionText,
                    inviteForm.employment_type === 'full_time' && styles.typeOptionTextActive
                  ]}>Full-time</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    inviteForm.employment_type === 'part_time' && styles.typeOptionActive
                  ]}
                  onPress={() => setInviteForm(prev => ({ ...prev, employment_type: 'part_time' }))}
                >
                  <Text style={[
                    styles.typeOptionText,
                    inviteForm.employment_type === 'part_time' && styles.typeOptionTextActive
                  ]}>Part-time</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Roles */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Roles *</Text>
              <View style={styles.selectionGrid}>
                {roles.map((role) => (
                  <TouchableOpacity
                    key={role.id}
                    style={[
                      styles.selectionChip,
                      inviteForm.selectedRoles.includes(role.id) && styles.selectionChipActive,
                      { borderColor: role.colour || palette.purple[500] }
                    ]}
                    onPress={() => toggleRole(role.id)}
                  >
                    <View style={[styles.chipDot, { backgroundColor: role.colour || palette.purple[500] }]} />
                    <Text style={[
                      styles.selectionChipText,
                      inviteForm.selectedRoles.includes(role.id) && styles.selectionChipTextActive
                    ]}>{role.name}</Text>
                    {inviteForm.selectedRoles.includes(role.id) && (
                      <Ionicons name="checkmark" size={16} color={palette.purple[500]} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Venues */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Venues *</Text>
              <View style={styles.selectionGrid}>
                {venues.map((venue) => (
                  <TouchableOpacity
                    key={venue.id}
                    style={[
                      styles.selectionChip,
                      inviteForm.selectedVenues.includes(venue.id) && styles.selectionChipActive
                    ]}
                    onPress={() => toggleVenue(venue.id)}
                  >
                    <Ionicons name="location" size={16} color={inviteForm.selectedVenues.includes(venue.id) ? palette.purple[500] : palette.gray[400]} />
                    <Text style={[
                      styles.selectionChipText,
                      inviteForm.selectedVenues.includes(venue.id) && styles.selectionChipTextActive
                    ]}>{venue.name}</Text>
                    {inviteForm.selectedVenues.includes(venue.id) && (
                      <Ionicons name="checkmark" size={16} color={palette.purple[500]} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      </Modal>
    </ConstitutionalScreen>
  );
}

const styles = StyleSheet.create({

  logoBox: { position: 'absolute', top: Platform.OS === 'web' ? 16 : 52, left: 16, zIndex: 1000, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, padding: 8, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  logo: { width: 32, height: 32 },

  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  loadingText: { marginTop: spacing.md, color: colors.textSecondary },
  
  header: { paddingTop: 50, paddingBottom: spacing.lg, paddingHorizontal: spacing.lg },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  backButton: { padding: spacing.sm, marginRight: spacing.sm },
  headerTitleContainer: { flex: 1 },
  headerTitle: { fontSize: typography.sizes.h2, fontWeight: typography.weights.bold, color: palette.white },
  headerSubtitle: { fontSize: typography.sizes.body, color: 'rgba(255,255,255,0.8)' },
  addButton: { padding: spacing.sm },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  searchInput: { flex: 1, marginLeft: spacing.sm, color: palette.white, fontSize: typography.sizes.body },
  
  filterTabs: { flexDirection: 'row', backgroundColor: '#FFFFFF', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  filterTab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginRight: spacing.sm, borderRadius: borderRadius.full },
  filterTabActive: { backgroundColor: palette.purple[100] },
  filterTabText: { fontSize: typography.sizes.body, color: colors.textSecondary },
  filterTabTextActive: { color: palette.purple[700], fontWeight: typography.weights.semibold },
  filterCount: { marginLeft: spacing.xs, fontSize: typography.sizes.caption, color: colors.textTertiary, backgroundColor: palette.gray[200], paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  filterCountActive: { backgroundColor: palette.purple[200], color: palette.purple[700] },
  
  content: { flex: 1, padding: spacing.md },
  
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl3 },
  emptyStateTitle: { fontSize: typography.sizes.h3, fontWeight: typography.weights.semibold, color: colors.textPrimary, marginTop: spacing.lg },
  emptyStateText: { fontSize: typography.sizes.body, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
  emptyStateButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.purple[500], paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: borderRadius.lg, marginTop: spacing.lg, gap: spacing.sm },
  emptyStateButtonText: { color: palette.white, fontWeight: typography.weights.semibold },
  
  memberCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, marginBottom: spacing.sm },
  memberAvatar: { width: 48, height: 48, borderRadius: borderRadius.full, backgroundColor: palette.purple[100], justifyContent: 'center', alignItems: 'center' },
  memberInitials: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: palette.purple[600] },
  memberInfo: { flex: 1, marginLeft: spacing.md },
  memberName: { fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.textPrimary },
  memberMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  memberType: { fontSize: typography.sizes.caption, color: colors.textSecondary },
  memberDot: { marginHorizontal: spacing.xs, color: colors.textTertiary },
  memberRoles: { fontSize: typography.sizes.caption, color: colors.textTertiary, flex: 1 },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.full },
  statusText: { fontSize: typography.sizes.caption, fontWeight: typography.weights.medium, textTransform: 'capitalize' },
  resendButton: { padding: spacing.sm, marginLeft: spacing.sm },
  
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.borderLight, backgroundColor: colors.surface },
  modalTitle: { fontSize: typography.sizes.h3, fontWeight: typography.weights.bold, color: colors.textPrimary },
  modalSave: { fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: palette.purple[500] },
  modalContent: { flex: 1, padding: spacing.lg },
  
  formGroup: { marginBottom: spacing.lg },
  formLabel: { fontSize: typography.sizes.body, fontWeight: typography.weights.medium, color: colors.textPrimary, marginBottom: spacing.sm },
  formInput: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, fontSize: typography.sizes.body, borderWidth: 1, borderColor: colors.borderLight },
  
  typeToggle: { flexDirection: 'row', gap: spacing.sm },
  typeOption: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.lg, borderWidth: 2, borderColor: colors.borderLight, alignItems: 'center' },
  typeOptionActive: { borderColor: palette.purple[500], backgroundColor: palette.purple[50] },
  typeOptionText: { fontSize: typography.sizes.body, color: colors.textSecondary },
  typeOptionTextActive: { color: palette.purple[700], fontWeight: typography.weights.semibold },
  
  selectionGrid: { gap: spacing.sm },
  selectionChip: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.lg, borderWidth: 2, borderColor: colors.borderLight, backgroundColor: colors.surface, gap: spacing.sm },
  selectionChipActive: { borderColor: palette.purple[500], backgroundColor: palette.purple[50] },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  selectionChipText: { flex: 1, fontSize: typography.sizes.body, color: colors.textSecondary },
  selectionChipTextActive: { color: palette.purple[700], fontWeight: typography.weights.medium },
});
