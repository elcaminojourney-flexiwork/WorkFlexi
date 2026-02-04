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
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase';
import { palette, colors, gradients, typography, spacing, borderRadius, shadows } from '../../../constants/theme';
import { createOrganisation, getMyOrganisations, createVenue } from '../../../services/organisations';
import ConstitutionalScreen, { CardWhite, PanelPurple } from '../../../components/ConstitutionalScreen';


// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function OrganisationSetup() {
  const router = useRouter();
  const [step, setStep] = useState<'list' | 'create-org' | 'create-venue'>('list');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organisations, setOrganisations] = useState<any[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  
  // Form state
  const [orgForm, setOrgForm] = useState({
    name: '',
    business_reg_number: '',
    industry: 'food_and_beverage',
    billing_email: '',
  });
  
  const [venueForm, setVenueForm] = useState({
    name: '',
    address: '',
    postal_code: '',
    city: 'Singapore',
    phone: '',
    email: '',
  });

  useEffect(() => {
    loadOrganisations();
  }, []);

  const loadOrganisations = async () => {
    try {
      const result = await getMyOrganisations();
      if (!result.error) {
        setOrganisations(result.data || []);
      }
    } catch (error) {
      console.error('Error loading organisations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganisation = async () => {
    if (!orgForm.name.trim()) {
      Alert.alert('Error', 'Please enter organisation name');
      return;
    }

    setSaving(true);
    try {
      const result = await createOrganisation({
        name: orgForm.name,
        business_reg_number: orgForm.business_reg_number || undefined,
        industry: orgForm.industry,
        billing_email: orgForm.billing_email || undefined,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setSelectedOrg(result.data);
      setStep('create-venue');
      loadOrganisations();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create organisation');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateVenue = async () => {
    if (!venueForm.name.trim()) {
      Alert.alert('Error', 'Please enter venue name');
      return;
    }

    setSaving(true);
    try {
      const result = await createVenue({
        organisation_id: selectedOrg.id,
        name: venueForm.name,
        address: venueForm.address || undefined,
        postal_code: venueForm.postal_code || undefined,
        city: venueForm.city,
        phone: venueForm.phone || undefined,
        email: venueForm.email || undefined,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      Alert.alert('Success', 'Organisation and venue created!', [
        {
          text: 'Go to Rota',
          onPress: () => router.push(`/employer/rota?venueId=${result.data?.id}`),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create venue');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectOrg = (org: any) => {
    if (org.venues?.length > 0) {
      // Has venues, go to first venue's rota
      router.push(`/employer/rota?venueId=${org.venues[0].id}`);
    } else {
      // No venues, create one
      setSelectedOrg(org);
      setStep('create-venue');
    }
  };

  if (loading) {
    return (
      <ConstitutionalScreen title="My Organisations" showBack onBack={() => router.back()} showLogo theme="light">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.purple[500]} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </ConstitutionalScreen>
    );
  }

  if (step === 'list') {
    return (
      <ConstitutionalScreen title="My Organisations" showBack onBack={() => router.back()} showLogo theme="light">
        {organisations.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="business-outline" size={64} color={palette.purple[300]} />
            </View>
            <Text style={styles.emptyTitle}>No organisations yet</Text>
            <Text style={styles.emptyText}>
              Create your organisation to start managing your team and schedules
            </Text>
          </View>
        ) : (
          organisations.map((org) => (
            <CardWhite key={org.id} onPress={() => handleSelectOrg(org)} style={styles.orgCard}>
              <View style={styles.orgIcon}>
                <Ionicons name="business" size={28} color={palette.purple[500]} />
              </View>
              <View style={styles.orgInfo}>
                <Text style={styles.orgName}>{org.name}</Text>
                <Text style={styles.orgMeta}>
                  {org.venues?.length || 0} venue{org.venues?.length !== 1 ? 's' : ''} • {org.team_count || 0} team members
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={palette.gray[400]} />
            </CardWhite>
          ))
        )}

        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setStep('create-org')}
        >
          <LinearGradient
            colors={gradients.primary}
            style={styles.createButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="add-circle" size={24} color={palette.white} />
            <Text style={styles.createButtonText}>Create New Organisation</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ConstitutionalScreen>
    );
  }

  if (step === 'create-org') {
    return (
      <ConstitutionalScreen title="New Organisation" showBack onBack={() => setStep('list')} showLogo theme="light">
          <PanelPurple style={styles.formCard}>
            <View style={styles.stepIndicator}>
              <View style={styles.stepActive}>
                <Text style={styles.stepNumber}>1</Text>
              </View>
              <View style={styles.stepLine} />
              <View style={styles.stepInactive}>
                <Text style={styles.stepNumberInactive}>2</Text>
              </View>
            </View>
            <Text style={styles.stepLabel}>Organisation Details</Text>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Organisation Name *</Text>
              <TextInput
                style={styles.formInput}
                value={orgForm.name}
                onChangeText={(v) => setOrgForm(prev => ({ ...prev, name: v }))}
                placeholder="e.g., Pisa Pizza Pte Ltd"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Business Registration Number</Text>
              <TextInput
                style={styles.formInput}
                value={orgForm.business_reg_number}
                onChangeText={(v) => setOrgForm(prev => ({ ...prev, business_reg_number: v }))}
                placeholder="e.g., 202012345A"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Industry</Text>
              <View style={styles.industryGrid}>
                {[
                  { value: 'food_and_beverage', label: 'F&B', icon: 'restaurant' },
                  { value: 'hospitality', label: 'Hospitality', icon: 'bed' },
                  { value: 'retail', label: 'Retail', icon: 'cart' },
                  { value: 'events', label: 'Events', icon: 'calendar' },
                ].map((industry) => (
                  <TouchableOpacity
                    key={industry.value}
                    style={[
                      styles.industryOption,
                      orgForm.industry === industry.value && styles.industryOptionActive
                    ]}
                    onPress={() => setOrgForm(prev => ({ ...prev, industry: industry.value }))}
                  >
                    <Ionicons 
                      name={industry.icon as any} 
                      size={24} 
                      color={orgForm.industry === industry.value ? palette.purple[500] : palette.gray[400]} 
                    />
                    <Text style={[
                      styles.industryLabel,
                      orgForm.industry === industry.value && styles.industryLabelActive
                    ]}>
                      {industry.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Billing Email</Text>
              <TextInput
                style={styles.formInput}
                value={orgForm.billing_email}
                onChangeText={(v) => setOrgForm(prev => ({ ...prev, billing_email: v }))}
                placeholder="billing@yourcompany.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, saving && styles.submitButtonDisabled]}
              onPress={handleCreateOrganisation}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={palette.white} />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Continue to Venue Setup</Text>
                  <Ionicons name="arrow-forward" size={20} color={palette.white} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Create Venue Form
  if (step === 'create-venue') {
    return (
      <View style={styles.container}>
        <LinearGradient colors={gradients.employer} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => setStep('create-org')} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={palette.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Venue</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        <ScrollView style={styles.content}>
          <View style={styles.formCard}>
            <View style={styles.stepIndicator}>
              <View style={styles.stepComplete}>
                <Ionicons name="checkmark" size={16} color={palette.white} />
              </View>
              <View style={styles.stepLineComplete} />
              <View style={styles.stepActive}>
                <Text style={styles.stepNumber}>2</Text>
              </View>
            </View>
            <Text style={styles.stepLabel}>Venue Details</Text>

            <View style={styles.orgBadge}>
              <Ionicons name="business" size={16} color={palette.purple[600]} />
              <Text style={styles.orgBadgeText}>{selectedOrg?.name}</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Venue Name *</Text>
              <TextInput
                style={styles.formInput}
                value={venueForm.name}
                onChangeText={(v) => setVenueForm(prev => ({ ...prev, name: v }))}
                placeholder="e.g., Orchard Branch"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Address</Text>
              <TextInput
                style={styles.formInput}
                value={venueForm.address}
                onChangeText={(v) => setVenueForm(prev => ({ ...prev, address: v }))}
                placeholder="Street address"
                multiline
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: spacing.sm }]}>
                <Text style={styles.formLabel}>Postal Code</Text>
                <TextInput
                  style={styles.formInput}
                  value={venueForm.postal_code}
                  onChangeText={(v) => setVenueForm(prev => ({ ...prev, postal_code: v }))}
                  placeholder="123456"
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>City</Text>
                <TextInput
                  style={styles.formInput}
                  value={venueForm.city}
                  onChangeText={(v) => setVenueForm(prev => ({ ...prev, city: v }))}
                  placeholder="Singapore"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Phone</Text>
              <TextInput
                style={styles.formInput}
                value={venueForm.phone}
                onChangeText={(v) => setVenueForm(prev => ({ ...prev, phone: v }))}
                placeholder="+65 1234 5678"
                keyboardType="phone-pad"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, saving && styles.submitButtonDisabled]}
              onPress={handleCreateVenue}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={palette.white} />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Create & Go to Rota</Text>
                  <Ionicons name="calendar" size={20} color={palette.white} />
                </>
              )}
            </TouchableOpacity>
          </PanelPurple>
      </ConstitutionalScreen>
    );
  }

  return null;
}

const styles = StyleSheet.create({

  logoBox: { position: 'absolute', top: Platform.OS === 'web' ? 16 : 52, left: 16, zIndex: 1000, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, padding: 8, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  logo: { width: 32, height: 32 },

  loadingContainer: { paddingVertical: spacing.xl },
  loadingText: { marginTop: spacing.md, color: colors.textSecondary },
  
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl3 },
  emptyIcon: { width: 120, height: 120, borderRadius: 60, backgroundColor: palette.purple[50], justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg },
  emptyTitle: { fontSize: typography.sizes.h3, fontWeight: typography.weights.bold, color: colors.textPrimary },
  emptyText: { fontSize: typography.sizes.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.xl },
  
  orgCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm },
  orgIcon: { width: 56, height: 56, borderRadius: borderRadius.lg, backgroundColor: palette.purple[100], justifyContent: 'center', alignItems: 'center' },
  orgInfo: { flex: 1, marginLeft: spacing.md },
  orgName: { fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.textPrimary },
  orgMeta: { fontSize: typography.sizes.caption, color: colors.textSecondary, marginTop: 2 },
  
  createButton: { marginTop: spacing.lg, borderRadius: borderRadius.xl, overflow: 'hidden' },
  createButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.lg, gap: spacing.sm },
  createButtonText: { fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: palette.white },
  
  formCard: { marginBottom: spacing.lg },
  
  stepIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  stepActive: { width: 32, height: 32, borderRadius: 16, backgroundColor: palette.purple[500], justifyContent: 'center', alignItems: 'center' },
  stepInactive: { width: 32, height: 32, borderRadius: 16, backgroundColor: palette.gray[200], justifyContent: 'center', alignItems: 'center' },
  stepComplete: { width: 32, height: 32, borderRadius: 16, backgroundColor: palette.blue[500], justifyContent: 'center', alignItems: 'center' },
  stepNumber: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: palette.white },
  stepNumberInactive: { fontSize: typography.sizes.body, fontWeight: typography.weights.bold, color: palette.gray[500] },
  stepLine: { width: 40, height: 2, backgroundColor: palette.gray[200], marginHorizontal: spacing.sm },
  stepLineComplete: { width: 40, height: 2, backgroundColor: palette.blue[500], marginHorizontal: spacing.sm },
  stepLabel: { fontSize: typography.sizes.h3, fontWeight: typography.weights.semibold, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.lg },
  
  orgBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.purple[100], paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, alignSelf: 'flex-start', marginBottom: spacing.lg, gap: spacing.xs },
  orgBadgeText: { fontSize: typography.sizes.caption, fontWeight: typography.weights.medium, color: palette.purple[700] },
  
  formGroup: { marginBottom: spacing.lg },
  formLabel: { fontSize: typography.sizes.body, fontWeight: typography.weights.medium, color: colors.textPrimary, marginBottom: spacing.sm },
  formInput: { backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.md, fontSize: typography.sizes.body, borderWidth: 1, borderColor: colors.borderLight },
  formRow: { flexDirection: 'row' },
  
  industryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  industryOption: { width: '48%', paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderRadius: borderRadius.lg, borderWidth: 2, borderColor: colors.borderLight, alignItems: 'center', backgroundColor: colors.background },
  industryOptionActive: { borderColor: palette.purple[500], backgroundColor: palette.purple[50] },
  industryLabel: { fontSize: typography.sizes.caption, color: colors.textSecondary, marginTop: spacing.xs },
  industryLabelActive: { color: palette.purple[700], fontWeight: typography.weights.medium },
  
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: palette.purple[500], paddingVertical: spacing.lg, borderRadius: borderRadius.xl, marginTop: spacing.lg, gap: spacing.sm, ...shadows.purpleLg },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: palette.white },
});
