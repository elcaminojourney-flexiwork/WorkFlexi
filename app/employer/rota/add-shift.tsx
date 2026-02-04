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
  ImageBackground,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase';
import { palette, colors, gradients, typography, spacing, borderRadius, shadows } from '../../../constants/theme';
import { createRotaShift, createRotaShiftsBatch } from '../../../services/rota';


// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function AddShift() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const venueId = params.venueId as string;
  const initialDate = params.date as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [shiftDate, setShiftDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [headcount, setHeadcount] = useState('1');
  const [hourlyRate, setHourlyRate] = useState('');
  const [notes, setNotes] = useState('');
  const [gigEnabled, setGigEnabled] = useState(false);

  useEffect(() => {
    loadRoles();
  }, [venueId]);

  const loadRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('venue_roles')
        .select('*, roles(*)')
        .eq('venue_id', venueId)
        .eq('is_active', true)
        .order('roles(sort_order)');

      if (error) throw error;

      const rolesList = data?.map(vr => vr.roles).filter(Boolean) || [];
      setRoles(rolesList);
      
      if (rolesList.length > 0 && !selectedRole) {
        setSelectedRole(rolesList[0].id);
        if (rolesList[0].hourly_rate_default) {
          setHourlyRate(rolesList[0].hourly_rate_default.toString());
        }
      }
    } catch (error) {
      console.error('Error loading roles:', error);
      Alert.alert('Error', 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = (roleId: string) => {
    setSelectedRole(roleId);
    const role = roles.find(r => r.id === roleId);
    if (role?.hourly_rate_default) {
      setHourlyRate(role.hourly_rate_default.toString());
    }
  };

  const validateForm = () => {
    if (!selectedRole) {
      Alert.alert('Error', 'Please select a role');
      return false;
    }
    if (!shiftDate) {
      Alert.alert('Error', 'Please select a date');
      return false;
    }
    if (!startTime || !endTime) {
      Alert.alert('Error', 'Please set start and end times');
      return false;
    }
    if (startTime >= endTime) {
      Alert.alert('Error', 'End time must be after start time');
      return false;
    }
    if (parseInt(headcount) < 1) {
      Alert.alert('Error', 'Headcount must be at least 1');
      return false;
    }
    if (gigEnabled && (!hourlyRate || parseFloat(hourlyRate) <= 0)) {
      Alert.alert('Error', 'Hourly rate is required when gig platform is enabled');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const result = await createRotaShift({
        venue_id: venueId,
        role_id: selectedRole!,
        shift_date: shiftDate,
        start_time: startTime,
        end_time: endTime,
        headcount_needed: parseInt(headcount),
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        notes: notes || undefined,
        gig_platform_enabled: gigEnabled,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      Alert.alert('Success', 'Shift created successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Error creating shift:', error);
      Alert.alert('Error', error.message || 'Failed to create shift');
    } finally {
      setSaving(false);
    }
  };

  const TimeInput = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) => (
    <View style={styles.timeInputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.timeInput}
        value={value}
        onChangeText={onChange}
        placeholder="HH:MM"
        keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={palette.purple[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={gradients.employer} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="close" size={24} color={palette.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Shift</Text>
          <TouchableOpacity 
            onPress={handleSave} 
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={palette.white} />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date</Text>
          <TextInput
            style={styles.dateInput}
            value={shiftDate}
            onChangeText={setShiftDate}
            placeholder="YYYY-MM-DD"
          />
        </View>

        {/* Time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time</Text>
          <View style={styles.timeRow}>
            <TimeInput value={startTime} onChange={setStartTime} label="Start" />
            <View style={styles.timeSeparator}>
              <Ionicons name="arrow-forward" size={20} color={palette.gray[400]} />
            </View>
            <TimeInput value={endTime} onChange={setEndTime} label="End" />
          </View>
        </View>

        {/* Role Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Role</Text>
          <View style={styles.rolesGrid}>
            {roles.map((role) => (
              <TouchableOpacity
                key={role.id}
                style={[
                  styles.roleCard,
                  selectedRole === role.id && styles.roleCardSelected,
                  { borderColor: role.colour || palette.purple[500] }
                ]}
                onPress={() => handleRoleSelect(role.id)}
              >
                <View style={[styles.roleColorBar, { backgroundColor: role.colour || palette.purple[500] }]} />
                <Text style={[
                  styles.roleName,
                  selectedRole === role.id && styles.roleNameSelected
                ]}>
                  {role.name}
                </Text>
                {selectedRole === role.id && (
                  <Ionicons name="checkmark-circle" size={20} color={palette.purple[500]} style={styles.roleCheck} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Headcount */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workers Needed</Text>
          <View style={styles.counterRow}>
            <TouchableOpacity 
              style={styles.counterButton}
              onPress={() => setHeadcount(Math.max(1, parseInt(headcount) - 1).toString())}
            >
              <Ionicons name="remove" size={24} color={palette.purple[500]} />
            </TouchableOpacity>
            <TextInput
              style={styles.counterInput}
              value={headcount}
              onChangeText={(v) => setHeadcount(v.replace(/[^0-9]/g, '') || '1')}
              keyboardType="numeric"
              textAlign="center"
            />
            <TouchableOpacity 
              style={styles.counterButton}
              onPress={() => setHeadcount((parseInt(headcount) + 1).toString())}
            >
              <Ionicons name="add" size={24} color={palette.purple[500]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Gig Platform Toggle */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.toggleRow}
            onPress={() => setGigEnabled(!gigEnabled)}
          >
            <View style={styles.toggleInfo}>
              <Ionicons name="globe-outline" size={24} color={palette.purple[500]} />
              <View style={styles.toggleText}>
                <Text style={styles.toggleTitle}>Post to Gig Marketplace</Text>
                <Text style={styles.toggleSubtitle}>Allow gig workers to apply if shift not filled</Text>
              </View>
            </View>
            <View style={[styles.toggle, gigEnabled && styles.toggleActive]}>
              <View style={[styles.toggleKnob, gigEnabled && styles.toggleKnobActive]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Hourly Rate (shown when gig enabled or always for reference) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hourly Rate {gigEnabled && <Text style={styles.required}>*</Text>}</Text>
          <View style={styles.rateInputContainer}>
            <Text style={styles.currency}>SGD $</Text>
            <TextInput
              style={styles.rateInput}
              value={hourlyRate}
              onChangeText={setHourlyRate}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
            <Text style={styles.perHour}>/hour</Text>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any special instructions..."
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({

  logoBox: { position: 'absolute', top: Platform.OS === 'web' ? 16 : 52, left: 16, zIndex: 1000, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, padding: 8, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  logo: { width: 32, height: 32 },

  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  
  header: { paddingTop: 50, paddingBottom: spacing.md, paddingHorizontal: spacing.lg },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { padding: spacing.sm },
  headerTitle: { fontSize: typography.sizes.h3, fontWeight: typography.weights.bold, color: palette.white },
  saveButton: { backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: borderRadius.md },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: palette.white, fontWeight: typography.weights.semibold, fontSize: typography.sizes.body },
  
  content: { flex: 1, padding: spacing.lg },
  
  section: { marginBottom: spacing.xl },
  sectionTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.semibold, color: colors.textPrimary, marginBottom: spacing.sm },
  required: { color: palette.purple[500] },
  
  dateInput: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, fontSize: typography.sizes.body, color: colors.textPrimary, borderWidth: 1, borderColor: colors.borderLight },
  
  timeRow: { flexDirection: 'row', alignItems: 'center' },
  timeInputContainer: { flex: 1 },
  inputLabel: { fontSize: typography.sizes.caption, color: colors.textSecondary, marginBottom: spacing.xs },
  timeInput: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, fontSize: typography.sizes.body, color: colors.textPrimary, borderWidth: 1, borderColor: colors.borderLight, textAlign: 'center' },
  timeSeparator: { paddingHorizontal: spacing.md, paddingTop: spacing.lg },
  
  rolesGrid: { gap: spacing.sm },
  roleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 2, borderColor: colors.borderLight },
  roleCardSelected: { backgroundColor: palette.purple[50], borderColor: palette.purple[500] },
  roleColorBar: { width: 4, height: 24, borderRadius: 2, marginRight: spacing.md },
  roleName: { flex: 1, fontSize: typography.sizes.body, color: colors.textPrimary },
  roleNameSelected: { fontWeight: typography.weights.semibold, color: palette.purple[700] },
  roleCheck: { marginLeft: spacing.sm },
  
  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  counterButton: { width: 48, height: 48, borderRadius: borderRadius.full, backgroundColor: palette.purple[100], justifyContent: 'center', alignItems: 'center' },
  counterInput: { width: 60, fontSize: typography.sizes.h2, fontWeight: typography.weights.bold, color: colors.textPrimary },
  
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.borderLight },
  toggleInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  toggleText: { marginLeft: spacing.md },
  toggleTitle: { fontSize: typography.sizes.body, fontWeight: typography.weights.medium, color: colors.textPrimary },
  toggleSubtitle: { fontSize: typography.sizes.caption, color: colors.textSecondary, marginTop: 2 },
  toggle: { width: 50, height: 30, borderRadius: 15, backgroundColor: palette.gray[300], padding: 2, justifyContent: 'center' },
  toggleActive: { backgroundColor: palette.purple[500] },
  toggleKnob: { width: 26, height: 26, borderRadius: 13, backgroundColor: palette.white },
  toggleKnobActive: { alignSelf: 'flex-end' },
  
  rateInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.borderLight },
  currency: { fontSize: typography.sizes.body, color: colors.textSecondary, marginRight: spacing.sm },
  rateInput: { flex: 1, fontSize: typography.sizes.h3, fontWeight: typography.weights.semibold, color: colors.textPrimary },
  perHour: { fontSize: typography.sizes.body, color: colors.textSecondary },
  
  notesInput: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, fontSize: typography.sizes.body, color: colors.textPrimary, borderWidth: 1, borderColor: colors.borderLight, minHeight: 100 },
});
