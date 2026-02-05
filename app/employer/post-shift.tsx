import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform, TextInput as RNTextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';
import { DateTimePicker } from '../../components/ui/DateTimePicker';
import ConstitutionalScreen, { PanelPurple, PanelBlue } from '../../components/ConstitutionalScreen';

const COLORS = {
  purple100: '#F3E8FF', purple200: '#E9D5FF', purple300: '#D8B4FE', purple400: '#C084FC',
  purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED', purple800: '#6D28D9',
  blue100: '#DBEAFE', blue200: '#BFDBFE', blue300: '#93C5FD', blue400: '#60A5FA',
  blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  white: '#FFFFFF', gray900: '#111827',
};

const industries = ['Food & Beverage', 'Retail', 'Warehouse & Logistics', 'Events', 'Cleaning & Maintenance', 'Security', 'Construction', 'Healthcare Support', 'Other'];
const experienceOptions = [{ value: '0-1', label: '0-1 years' }, { value: '1-3', label: '1-3 years' }, { value: '3-5', label: '3-5 years' }, { value: '5+', label: '5+ years' }];

export default function PostShift() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const [jobTitle, setJobTitle] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [shiftDate, setShiftDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [location, setLocation] = useState('');
  const [visibility, setVisibility] = useState<'internal' | 'marketplace' | 'both'>('marketplace');
  const [workersNeeded, setWorkersNeeded] = useState('1');
  const [experienceYears, setExperienceYears] = useState('0-1');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');

  const formatDate = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const formatTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const calculateShiftDetails = () => {
    const totalMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    const adjustedMinutes = totalMinutes <= 0 ? totalMinutes + 24 * 60 : totalMinutes;
    const totalHours = adjustedMinutes / 60;
    const breakMinutes = totalHours > 6 ? 45 : 0;
    const workHours = (adjustedMinutes - breakMinutes) / 60;
    const workers = parseInt(workersNeeded, 10) || 1;
    const rate = parseFloat(hourlyRate) || 0;
    const workerCost = workHours * rate * workers;
    const platformFee = workerCost * 0.15;
    return { workHours, workerCost, platformFee, totalAmount: workerCost + platformFee };
  };

  const handleNext = () => {
    if (currentStep === 1 && (!jobTitle.trim() || !industry || !description.trim())) {
      Alert.alert('Error', 'Please fill all required fields'); return;
    }
    if (currentStep === 2 && !location.trim()) {
      Alert.alert('Error', 'Please enter location'); return;
    }
    if (currentStep === 3 && (!hourlyRate || parseFloat(hourlyRate) <= 0)) {
      Alert.alert('Error', 'Please enter valid hourly rate'); return;
    }
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => currentStep > 1 ? setCurrentStep(currentStep - 1) : router.back();

  const handlePublish = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/auth/select-user-type'); return; }

      const calc = calculateShiftDetails();
      const { data: shift, error } = await supabase.from('shifts').insert([{
        employer_id: user.id, title: jobTitle.trim(), job_title: jobTitle.trim(), job_role: jobTitle.trim(),
        industry, description: description.trim(),
        shift_date: shiftDate.toISOString().split('T')[0],
        start_time: new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate(), startTime.getHours(), startTime.getMinutes()).toISOString(),
        end_time: new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate(), endTime.getHours(), endTime.getMinutes()).toISOString(),
        location: location.trim(), location_address: location.trim(), location_lat: 1.3521, location_lng: 103.8198,
        workers_needed: parseInt(workersNeeded, 10), experience_level: experienceYears,
        hourly_rate: parseFloat(hourlyRate), total_cost: calc.workerCost, platform_fee: calc.platformFee, total_amount: calc.totalAmount,
        visibility, status: 'open', payment_status: 'pending',
      }]).select().single();
      if (error) throw error;
      Alert.alert('Success!', 'Shift posted!', [{ text: 'View', onPress: () => router.replace(`/employer/shift/${shift.id}`) }]);
    } catch (err: any) {
      const msg = err?.message || err?.error_description || String(err);
      const details = err?.details ? ` (${err.details})` : '';
      Alert.alert('Error', (msg + details) || 'Failed to post shift. If you see 500, run the shifts RLS SQL in Supabase SQL Editor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConstitutionalScreen title="Post New Shift" showBack onBack={handleBack} showLogo theme="light" scrollable={false}>
      <LinearGradient colors={[COLORS.purple600, COLORS.blue500]} style={styles.progressBar}>
        {[1, 2, 3, 4].map((step) => (
          <View key={step} style={styles.progressStep}>
            <LinearGradient colors={currentStep >= step ? [COLORS.white, COLORS.purple100] : [COLORS.purple400, COLORS.blue400]} style={styles.progressDot}>
              <Text style={[styles.progressNum, currentStep >= step && { color: COLORS.purple700 }]}>{step}</Text>
            </LinearGradient>
            {step < 4 && <View style={[styles.progressLine, currentStep > step && styles.progressLineActive]} />}
          </View>
        ))}
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {currentStep === 1 && (
          <PanelPurple style={styles.card}>
            <LinearGradient colors={[COLORS.purple600, COLORS.blue600]} style={styles.cardHeader}>
              <Ionicons name="briefcase" size={24} color={COLORS.white} />
              <Text style={styles.cardTitle}>Shift Details</Text>
            </LinearGradient>

            <View style={styles.cardBody}>
              <Text style={styles.label}>Job Title *</Text>
              <LinearGradient colors={[COLORS.purple100, COLORS.blue100]} style={styles.inputBox}>
                <Ionicons name="briefcase-outline" size={20} color={COLORS.purple600} />
                <RNTextInput style={styles.input} placeholder="e.g. Waiter, Bartender" placeholderTextColor={COLORS.purple400} value={jobTitle} onChangeText={setJobTitle} />
              </LinearGradient>

              <Text style={styles.label}>Industry *</Text>
              <View style={styles.chipRow}>
                {industries.map((ind) => (
                  <TouchableOpacity key={ind} onPress={() => setIndustry(ind)}>
                    <LinearGradient colors={industry === ind ? [COLORS.purple600, COLORS.blue600] : [COLORS.purple200, COLORS.blue200]} style={styles.chip}>
                      <Text style={[styles.chipText, industry === ind && { color: COLORS.white }]}>{ind}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Description *</Text>
              <LinearGradient colors={[COLORS.purple100, COLORS.blue100]} style={[styles.inputBox, { minHeight: 100, alignItems: 'flex-start' }]}>
                <Ionicons name="document-text-outline" size={20} color={COLORS.purple600} style={{ marginTop: 4 }} />
                <RNTextInput style={[styles.input, { minHeight: 80 }]} placeholder="Describe the shift..." placeholderTextColor={COLORS.purple400} value={description} onChangeText={setDescription} multiline />
              </LinearGradient>

              <Text style={styles.label}>Visibility *</Text>
              {['internal', 'marketplace', 'both'].map((v) => (
                <TouchableOpacity key={v} onPress={() => setVisibility(v as any)}>
                  <LinearGradient colors={visibility === v ? [COLORS.purple500, COLORS.blue500] : [COLORS.purple200, COLORS.blue100]} style={styles.radioRow}>
                    <Ionicons name={visibility === v ? 'radio-button-on' : 'radio-button-off'} size={22} color={visibility === v ? COLORS.white : COLORS.purple600} />
                    <Text style={[styles.radioText, visibility === v && { color: COLORS.white, fontWeight: '700' }]}>
                      {v === 'internal' ? 'Internal (Team Only)' : v === 'marketplace' ? 'Marketplace (Public)' : 'Both'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </PanelPurple>
        )}

        {currentStep === 2 && (
          <PanelBlue style={styles.card}>
            <LinearGradient colors={[COLORS.blue600, COLORS.purple600]} style={styles.cardHeader}>
              <Ionicons name="calendar" size={24} color={COLORS.white} />
              <Text style={styles.cardTitle}>Date, Time & Location</Text>
            </LinearGradient>

            <View style={styles.cardBody}>
              <Text style={styles.label}>Shift Date *</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                <LinearGradient colors={[COLORS.blue200, COLORS.purple200]} style={styles.dateBtn}>
                  <Ionicons name="calendar" size={22} color={COLORS.purple600} />
                  <Text style={styles.dateBtnText}>{formatDate(shiftDate)}</Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.timeRow}>
                <View style={styles.timeCol}>
                  <Text style={styles.label}>Start *</Text>
                  <TouchableOpacity onPress={() => setShowStartTimePicker(true)}>
                    <LinearGradient colors={[COLORS.purple200, COLORS.blue200]} style={styles.dateBtn}>
                      <Ionicons name="time" size={20} color={COLORS.purple600} />
                      <Text style={styles.dateBtnText}>{formatTime(startTime)}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
                <View style={styles.timeCol}>
                  <Text style={styles.label}>End *</Text>
                  <TouchableOpacity onPress={() => setShowEndTimePicker(true)}>
                    <LinearGradient colors={[COLORS.blue200, COLORS.purple200]} style={styles.dateBtn}>
                      <Ionicons name="time" size={20} color={COLORS.blue600} />
                      <Text style={styles.dateBtnText}>{formatTime(endTime)}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.label}>Location *</Text>
              <LinearGradient colors={[COLORS.blue100, COLORS.purple100]} style={styles.inputBox}>
                <Ionicons name="location-outline" size={20} color={COLORS.blue600} />
                <RNTextInput style={styles.input} placeholder="Full address" placeholderTextColor={COLORS.blue400} value={location} onChangeText={setLocation} />
              </LinearGradient>

              <Text style={styles.label}>Workers Needed *</Text>
              <LinearGradient colors={[COLORS.purple100, COLORS.blue100]} style={styles.inputBox}>
                <Ionicons name="people-outline" size={20} color={COLORS.purple600} />
                <RNTextInput style={styles.input} placeholder="1" value={workersNeeded} onChangeText={setWorkersNeeded} keyboardType="numeric" />
              </LinearGradient>

              <Text style={styles.label}>Experience Required</Text>
              <View style={styles.chipRow}>
                {experienceOptions.map((opt) => (
                  <TouchableOpacity key={opt.value} onPress={() => setExperienceYears(opt.value)}>
                    <LinearGradient colors={experienceYears === opt.value ? [COLORS.blue600, COLORS.purple600] : [COLORS.blue200, COLORS.purple200]} style={styles.chip}>
                      <Text style={[styles.chipText, experienceYears === opt.value && { color: COLORS.white }]}>{opt.label}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </PanelBlue>
        )}

        {currentStep === 3 && (
          <PanelPurple style={styles.card}>
            <LinearGradient colors={[COLORS.purple600, COLORS.blue600]} style={styles.cardHeader}>
              <Ionicons name="cash" size={24} color={COLORS.white} />
              <Text style={styles.cardTitle}>Payment Details</Text>
            </LinearGradient>

            <View style={styles.cardBody}>
              <Text style={styles.label}>Hourly Rate (SGD) *</Text>
              <LinearGradient colors={[COLORS.purple100, COLORS.blue100]} style={styles.inputBox}>
                <Text style={styles.currency}>SGD</Text>
                <RNTextInput style={styles.input} placeholder="15.00" value={hourlyRate} onChangeText={setHourlyRate} keyboardType="decimal-pad" />
              </LinearGradient>

              {hourlyRate && parseFloat(hourlyRate) > 0 && (
                <LinearGradient colors={[COLORS.purple400, COLORS.blue400]} style={styles.calcCard}>
                  <Text style={styles.calcTitle}>Cost Breakdown</Text>
                  <View style={styles.calcRow}><Text style={styles.calcLabel}>Work Hours:</Text><Text style={styles.calcValue}>{calculateShiftDetails().workHours.toFixed(1)}h</Text></View>
                  <View style={styles.calcRow}><Text style={styles.calcLabel}>Workers:</Text><Text style={styles.calcValue}>× {workersNeeded}</Text></View>
                  <View style={styles.calcRow}><Text style={styles.calcLabel}>Worker Cost:</Text><Text style={styles.calcValue}>${calculateShiftDetails().workerCost.toFixed(2)}</Text></View>
                  <View style={styles.calcRow}><Text style={styles.calcLabel}>Platform (15%):</Text><Text style={styles.calcValue}>${calculateShiftDetails().platformFee.toFixed(2)}</Text></View>
                  <LinearGradient colors={[COLORS.purple600, COLORS.blue600]} style={styles.totalRow}>
                    <Text style={styles.totalLabel}>TOTAL:</Text>
                    <Text style={styles.totalValue}>SGD ${calculateShiftDetails().totalAmount.toFixed(2)}</Text>
                  </LinearGradient>
                </LinearGradient>
              )}
            </View>
          </PanelPurple>
        )}

        {currentStep === 4 && (
          <PanelBlue style={styles.card}>
            <LinearGradient colors={[COLORS.blue600, COLORS.purple600]} style={styles.cardHeader}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.white} />
              <Text style={styles.cardTitle}>Confirm & Publish</Text>
            </LinearGradient>

            <View style={styles.cardBody}>
              <LinearGradient colors={[COLORS.purple200, COLORS.blue200]} style={styles.summaryBox}>
                <View style={styles.summaryTwoRows}>
                  <View style={styles.summaryCol}>
                    <View style={styles.summaryRow}><Ionicons name="briefcase" size={18} color={COLORS.purple600} /><Text style={styles.summaryLabel}>Job:</Text><Text style={styles.summaryValue}>{jobTitle}</Text></View>
                    <View style={styles.summaryRow}><Ionicons name="business" size={18} color={COLORS.blue600} /><Text style={styles.summaryLabel}>Industry:</Text><Text style={styles.summaryValue}>{industry}</Text></View>
                    <View style={styles.summaryRow}><Ionicons name="calendar" size={18} color={COLORS.purple600} /><Text style={styles.summaryLabel}>Date:</Text><Text style={styles.summaryValue}>{formatDate(shiftDate)}</Text></View>
                    <View style={styles.summaryRow}><Ionicons name="time" size={18} color={COLORS.blue600} /><Text style={styles.summaryLabel}>Time:</Text><Text style={styles.summaryValue}>{formatTime(startTime)} - {formatTime(endTime)}</Text></View>
                  </View>
                  <View style={styles.summaryCol}>
                    <View style={styles.summaryRow}><Ionicons name="location" size={18} color={COLORS.purple600} /><Text style={styles.summaryLabel}>Location:</Text><Text style={styles.summaryValue}>{location}</Text></View>
                    <View style={styles.summaryRow}><Ionicons name="people" size={18} color={COLORS.blue600} /><Text style={styles.summaryLabel}>Workers:</Text><Text style={styles.summaryValue}>{workersNeeded}</Text></View>
                    <View style={styles.summaryRow}><Ionicons name="cash" size={18} color={COLORS.purple600} /><Text style={styles.summaryLabel}>Rate:</Text><Text style={styles.summaryValue}>SGD ${hourlyRate}/hr</Text></View>
                  </View>
                </View>
              </LinearGradient>
              <LinearGradient colors={[COLORS.purple500, COLORS.blue500]} style={styles.totalBox}>
                <Text style={styles.totalBoxLabel}>Total Amount</Text>
                <Text style={styles.totalBoxValue}>SGD ${calculateShiftDetails().totalAmount.toFixed(2)}</Text>
              </LinearGradient>
            </View>
          </PanelBlue>
        )}

        <View style={{ height: 140 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity onPress={currentStep < 4 ? handleNext : handlePublish} disabled={loading} style={styles.footerBtn}>
          <LinearGradient colors={[COLORS.purple600, COLORS.blue600]} style={styles.footerBtnGradient}>
            {loading ? <ActivityIndicator color={COLORS.white} /> : (
              <>
                <Ionicons name={currentStep < 4 ? 'arrow-forward' : 'checkmark-circle'} size={22} color={COLORS.white} />
                <Text style={styles.footerBtnText}>{currentStep < 4 ? `Continue to Step ${currentStep + 1}` : 'Publish Shift'}</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <DateTimePicker
          mode="date"
          value={shiftDate}
          onChange={(_, date) => {
            if (date) { setShiftDate(date); setShowDatePicker(false); }
          }}
        />
      )}
      {showStartTimePicker && (
        <DateTimePicker
          mode="time"
          value={startTime}
          onChange={(_, date) => {
            if (date) { setStartTime(date); setShowStartTimePicker(false); }
          }}
        />
      )}
      {showEndTimePicker && (
        <DateTimePicker
          mode="time"
          value={endTime}
          onChange={(_, date) => {
            if (date) { setEndTime(date); setShowEndTimePicker(false); }
          }}
        />
      )}
    </ConstitutionalScreen>
  );
}

const styles = StyleSheet.create({
  progressBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  progressStep: { flexDirection: 'row', alignItems: 'center' },
  progressDot: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  progressNum: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  progressLine: { width: 36, height: 4, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 4 },
  progressLineActive: { backgroundColor: '#FFFFFF' },
  content: { flex: 1 },
  card: { borderRadius: 20, marginBottom: 16, overflow: 'hidden', padding: 0, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, marginHorizontal: -20, marginTop: -20 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  cardBody: { padding: 20 },
  label: { fontSize: 14, fontWeight: '700', color: COLORS.purple800, marginBottom: 8, marginTop: 16 },
  inputBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  input: { flex: 1, fontSize: 16, color: COLORS.gray900 },
  currency: { fontSize: 16, fontWeight: '700', color: COLORS.purple600 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginBottom: 4 },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.purple700 },
  radioRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, marginBottom: 8, gap: 12 },
  radioText: { fontSize: 15, color: COLORS.purple700 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, gap: 12 },
  dateBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.purple700 },
  timeRow: { flexDirection: 'row', gap: 12 },
  timeCol: { flex: 1 },
  calcCard: { borderRadius: 20, padding: 20, marginTop: 16 },
  calcTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  calcLabel: { fontSize: 14, color: '#FFFFFF' },
  calcValue: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderRadius: 12, marginTop: 12 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  summaryBox: { borderRadius: 16, padding: 16 },
  summaryTwoRows: { flexDirection: 'row', gap: 16 },
  summaryCol: { flex: 1 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  summaryLabel: { fontSize: 14, color: COLORS.purple700, width: 70 },
  summaryValue: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.gray900 },
  totalBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderRadius: 16, marginTop: 16 },
  totalBoxLabel: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  totalBoxValue: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: Platform.OS === 'web' ? 20 : 36 },
  footerBtn: { borderRadius: 20, overflow: 'hidden' },
  footerBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
  footerBtnText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
});
