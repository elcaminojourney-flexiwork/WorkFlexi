import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
ImageBackground, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, TextInput } from 'react-native-paper';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';
import ConstitutionalScreen from '../../components/ConstitutionalScreen';
import { DateTimePicker } from '../../components/ui/DateTimePicker';


// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function EditShift() {
  const { shiftId, from } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Shift fields
  const [jobTitle, setJobTitle] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [shiftDate, setShiftDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [workersNeeded, setWorkersNeeded] = useState('1');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');

  // Pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    loadShift();
  }, []);

  const industries = [
    'Food & Beverage',
    'Retail',
    'Warehouse & Logistics',
    'Events',
    'Cleaning & Maintenance',
    'Security',
    'Construction',
    'Healthcare Support',
    'Other',
  ];

  const calculateShiftDetails = () => {
    const start = new Date(startTime);
    const end = new Date(endTime);

    let totalMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60;
    }

    const totalHours = totalMinutes / 60;

    const breakMinutes = totalHours > 6 ? 45 : 0;
    const workHours = (totalMinutes - breakMinutes) / 60;

    const regularHours = Math.min(workHours, 8);
    const overtimeHours = Math.max(0, workHours - 8);

    const rate = parseFloat(hourlyRate || '0');
    const workers = parseInt(workersNeeded || '1', 10);
    const overtimeMultiplier = 1.5; // Standard overtime rate (1.5x) for hours over 8

    const regularCost = regularHours * rate * workers;
    const overtimeCost = overtimeHours * rate * overtimeMultiplier * workers;
    const workerCost = regularCost + overtimeCost;

    const platformFee = workerCost * 0.15;
    const totalAmount = workerCost + platformFee;

    return {
      totalHours: workHours.toFixed(2),
      breakMinutes,
      regularHours: regularHours.toFixed(2),
      overtimeHours: overtimeHours.toFixed(2),
      workerCost: workerCost.toFixed(2),
      platformFee: platformFee.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
    };
  };

  const loadShift = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('id', shiftId)
        .single();

      if (error) throw error;

      // Map DB → state
      setJobTitle(data.job_title || data.title || '');
      setIndustry(data.industry || '');
      setDescription(data.description || '');
      setLocation(data.location || data.location_address || '');
      setWorkersNeeded(String(data.workers_needed || '1'));
      setExperienceLevel(data.experience_level || '');
      setHourlyRate(data.hourly_rate ? String(data.hourly_rate) : '');
      setRequiredSkills(
        Array.isArray(data.required_skills)
          ? data.required_skills.join(', ')
          : ''
      );

      // Dates
      if (data.shift_date) {
        setShiftDate(new Date(data.shift_date + 'T00:00:00'));
      }
      if (data.start_time) {
        setStartTime(new Date(data.start_time));
      }
      if (data.end_time) {
        setEndTime(new Date(data.end_time));
      }
    } catch (err) {
      console.log('Error loading shift:', err);
      Alert.alert('Error', 'Unable to load shift for editing.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!jobTitle.trim()) {
      Alert.alert('Missing info', 'Please enter a job title.');
      return false;
    }
    if (!industry) {
      Alert.alert('Missing info', 'Please select an industry.');
      return false;
    }
    if (!description.trim()) {
      Alert.alert('Missing info', 'Please enter a description.');
      return false;
    }
    if (!location.trim()) {
      Alert.alert('Missing info', 'Please enter a location.');
      return false;
    }
    const workers = parseInt(workersNeeded || '0', 10);
    if (!workers || workers < 1 || workers > 50) {
      Alert.alert('Invalid input', 'Workers needed must be between 1 and 50.');
      return false;
    }
    const rate = parseFloat(hourlyRate || '0');
    if (!rate || rate < 8 || rate > 200) {
      Alert.alert(
        'Invalid rate',
        'Please enter a valid hourly rate between SGD$8.00-200.00.'
      );
      return false;
    }
    return true;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-SG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-SG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Format date as YYYY-MM-DD in local timezone (not UTC)
  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSave = async () => {
    try {
      if (!validateForm()) return;

      setSaving(true);

      const calculations = calculateShiftDetails();

      const startDateTime = new Date(
        shiftDate.getFullYear(),
        shiftDate.getMonth(),
        shiftDate.getDate(),
        startTime.getHours(),
        startTime.getMinutes(),
        0,
        0
      );

      const endDateTime = new Date(
        shiftDate.getFullYear(),
        shiftDate.getMonth(),
        shiftDate.getDate(),
        endTime.getHours(),
        endTime.getMinutes(),
        0,
        0
      );

      const workers = parseInt(workersNeeded || '1', 10);
      const rate = parseFloat(hourlyRate || '0');

      const updateData: any = {
        title: jobTitle.trim(),
        job_title: jobTitle.trim(),
        job_role: jobTitle.trim(),
        industry,
        description: description.trim(),
        location: location.trim(),
        location_address: location.trim(),
        shift_date: formatDateForInput(shiftDate),
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        workers_needed: workers,
        experience_level: experienceLevel || null,
        required_skills: requiredSkills
          ? requiredSkills.split(',').map((s) => s.trim()).filter(Boolean)
          : null,
        hourly_rate: rate,
        total_cost: parseFloat(calculations.workerCost),
        platform_fee: parseFloat(calculations.platformFee),
        total_amount: parseFloat(calculations.totalAmount),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('shifts')
        .update(updateData)
        .eq('id', shiftId);

      if (error) throw error;

      Alert.alert('Saved', 'Shift updated successfully.', [
        {
          text: 'OK',
          onPress: () => router.replace(`/employer/shift/${shiftId}`),
        },
      ]);
    } catch (err) {
      console.log('Error saving shift:', err);
      Alert.alert('Error', 'Unable to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading shift…</Text>
      </View>
    );
  }

  const onBack = () => {
    if (from && typeof from === 'string') router.replace(from as any);
    else if (shiftId) {
      const shiftIdStr = Array.isArray(shiftId) ? shiftId[0] : shiftId;
      router.replace(`/employer/shift/${shiftIdStr}` as any);
    } else router.replace('/employer/my-shifts');
  };

  return (
    <ConstitutionalScreen title="Edit Shift" showBack onBack={onBack} showLogo theme="light">
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Job title */}
        <TextInput
          label="Job title *"
          value={jobTitle}
          onChangeText={setJobTitle}
          mode="outlined"
          style={styles.input}
        />

        {/* Industry */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Industry *</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipRow}
          >
            {industries.map((ind) => (
              <TouchableOpacity
                key={ind}
                style={[
                  styles.chip,
                  industry === ind && styles.chipSelected,
                ]}
                onPress={() => setIndustry(ind)}
              >
                <Text
                  style={[
                    styles.chipText,
                    industry === ind && styles.chipTextSelected,
                  ]}
                >
                  {ind}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Description */}
        <TextInput
          label="Description *"
          value={description}
          onChangeText={setDescription}
          mode="outlined"
          multiline
          numberOfLines={4}
          style={styles.input}
        />

        {/* Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Shift date *</Text>
          {Platform.OS === 'web' ? (
            <View style={styles.dateButton}>
              {/* @ts-ignore - Web-only HTML input */}
              <input
                type="date"
                value={formatDateForInput(shiftDate)}
                min={formatDateForInput(new Date())}
                onChange={(e: any) => {
                  if (e.target.value) {
                    const newDate = new Date(e.target.value + 'T00:00:00');
                    setShiftDate(newDate);
                  }
                }}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '16px',
                  fontFamily: 'inherit',
                  width: '100%',
                }}
              />
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#8B5CF6" />
                <Text style={styles.dateText}>{formatDate(shiftDate)}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={shiftDate}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  onChange={(event, date) => {
                    if (Platform.OS !== 'ios') setShowDatePicker(false);
                    if (date) setShiftDate(date);
                  }}
                />
              )}
            </>
          )}
        </View>

        {/* Time */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Start time *</Text>
            {Platform.OS === 'web' ? (
              <View style={styles.dateButton}>
                {/* @ts-ignore - Web-only HTML input */}
                <input
                  type="time"
                  value={`${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`}
                  onChange={(e: any) => {
                    if (e.target.value) {
                      const [hours, minutes] = e.target.value.split(':');
                      const newDate = new Date(startTime);
                      newDate.setHours(parseInt(hours, 10));
                      newDate.setMinutes(parseInt(minutes, 10));
                      setStartTime(newDate);
                    }
                  }}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '16px',
                    fontFamily: 'inherit',
                    width: '100%',
                  }}
                />
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowStartPicker(true)}
                >
                  <Ionicons name="time-outline" size={20} color="#8B5CF6" />
                  <Text style={styles.dateText}>{formatTime(startTime)}</Text>
                </TouchableOpacity>
                {showStartPicker && (
                  <DateTimePicker
                    value={startTime}
                    mode="time"
                    display="default"
                    onChange={(event, date) => {
                      if (Platform.OS !== 'ios') setShowStartPicker(false);
                      if (date) setStartTime(date);
                    }}
                  />
                )}
              </>
            )}
          </View>

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>End time *</Text>
            {Platform.OS === 'web' ? (
              <View style={styles.dateButton}>
                {/* @ts-ignore - Web-only HTML input */}
                <input
                  type="time"
                  value={`${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`}
                  onChange={(e: any) => {
                    if (e.target.value) {
                      const [hours, minutes] = e.target.value.split(':');
                      const newDate = new Date(endTime);
                      newDate.setHours(parseInt(hours, 10));
                      newDate.setMinutes(parseInt(minutes, 10));
                      setEndTime(newDate);
                    }
                  }}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '16px',
                    fontFamily: 'inherit',
                    width: '100%',
                  }}
                />
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowEndPicker(true)}
                >
                  <Ionicons name="time-outline" size={20} color="#8B5CF6" />
                  <Text style={styles.dateText}>{formatTime(endTime)}</Text>
                </TouchableOpacity>
                {showEndPicker && (
                  <DateTimePicker
                    value={endTime}
                    mode="time"
                    display="default"
                    onChange={(event, date) => {
                      if (Platform.OS !== 'ios') setShowEndPicker(false);
                      if (date) setEndTime(date);
                    }}
                  />
                )}
              </>
            )}
          </View>
        </View>

        {/* Location */}
        <TextInput
          label="Location (Singapore) *"
          value={location}
          onChangeText={setLocation}
          mode="outlined"
          style={styles.input}
        />

        {/* Workers + experience */}
        <TextInput
          label="Workers needed *"
          value={workersNeeded}
          onChangeText={setWorkersNeeded}
          mode="outlined"
          keyboardType="number-pad"
          style={styles.input}
        />

        <TextInput
          label="Experience level (text)"
          value={experienceLevel}
          onChangeText={setExperienceLevel}
          mode="outlined"
          style={styles.input}
        />

        {/* Skills */}
        <TextInput
          label="Required skills (comma separated)"
          value={requiredSkills}
          onChangeText={setRequiredSkills}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={styles.input}
        />

        {/* Payment */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Hourly rate (SGD) *</Text>
          <View style={styles.currencyRow}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={styles.currencyInput}
              value={hourlyRate}
              onChangeText={setHourlyRate}
              keyboardType="decimal-pad"
              placeholder="12.00"
            />
          </View>
          <Text style={styles.helperText}>
            Typical gig rates in Singapore start from around SGD$12.00/hour.
          </Text>
        </View>

        {/* Simple summary */}
        {hourlyRate ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Payment summary (approx.)</Text>
            <Text style={styles.summaryLine}>
              Workers: {workersNeeded} | Rate: SGD${parseFloat(hourlyRate || '0').toFixed(2)}/hour
            </Text>
            <Text style={styles.summaryLine}>
              Total shift hours (after break): {calculateShiftDetails().totalHours}h
            </Text>
            <Text style={styles.summaryLine}>
              Worker cost: SGD${calculateShiftDetails().workerCost}
            </Text>
            <Text style={styles.summaryLine}>
              Platform fee (15%): SGD${calculateShiftDetails().platformFee}
            </Text>
            <Text style={styles.summaryTotal}>
              Total to hold in escrow: SGD${calculateShiftDetails().totalAmount}
            </Text>
          </View>
        ) : null}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save button */}
      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          icon="content-save"
          style={{ marginVertical: 8 }}
          contentStyle={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
        >
          Save changes
        </Button>
      </View>
    </ConstitutionalScreen>
  );
}

const styles = StyleSheet.create({

  logoBox: { position: 'absolute', top: Platform.OS === 'web' ? 16 : 52, left: 16, zIndex: 1000, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, padding: 8, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  logo: { width: 32, height: 32 },

  screen: { flex: 1, backgroundColor: 'transparent' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loadingText: { marginTop: 10, color: '#6B7280' },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  content: { flex: 1, padding: 20 },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: { height: 90, textAlignVertical: 'top' },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 12,
  },
  dateText: { marginLeft: 8, fontSize: 16, color: '#111827' },
  row: { flexDirection: 'row', gap: 12 },
  chipRow: { flexGrow: 0 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 8,
  },
  chipSelected: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  chipText: { fontSize: 13, color: '#6B7280' },
  chipTextSelected: { color: '#FFFFFF', fontWeight: '600' },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  currencySymbol: { fontSize: 18, fontWeight: 'bold', color: '#8B5CF6' },
  currencyInput: { flex: 1, padding: 10, fontSize: 16, color: '#111827' },
  helperText: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  summaryCard: {
    backgroundColor: '#FAF5FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: '#5B21B6' },
  summaryLine: { marginTop: 4, fontSize: 13, color: '#5B21B6' },
  summaryTotal: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '700',
    color: '#6D28D9',
  },
  footer: {
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  saveButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
