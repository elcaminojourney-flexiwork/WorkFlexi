import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Button, TextInput } from 'react-native-paper';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';


// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function KYCUpgradePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Step 1: Job Preferences
  const [skills, setSkills] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<'beginner' | 'intermediate' | 'experienced'>('beginner');
  const [jobTypes, setJobTypes] = useState('');

  // Step 2: Location & Availability
  const [preferredLocation, setPreferredLocation] = useState('');
  const [preferredArea, setPreferredArea] = useState('');
  const [availability, setAvailability] = useState('');

  // Step 3: Documents
  const [icNumber, setIcNumber] = useState('');
  const [hasWorkPermit, setHasWorkPermit] = useState(true);
  const [bio, setBio] = useState('');

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert('Error', 'Please login again');
        router.replace('/auth/select-user-type');
        return;
      }

      setUserId(user.id);

      // Load existing profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('skills, experience_level, job_types_interested, preferred_location, preferred_area, availability, ic_number, has_work_permit, bio')
        .eq('id', user.id)
        .single();

      if (profile) {
        setSkills(profile.skills || '');
        setExperienceLevel((profile.experience_level as any) || 'beginner');
        setJobTypes(profile.job_types_interested || '');
        setPreferredLocation(profile.preferred_location || '');
        setPreferredArea(profile.preferred_area || '');
        setAvailability(profile.availability || '');
        setIcNumber(profile.ic_number || '');
        setHasWorkPermit(profile.has_work_permit ?? true);
        setBio(profile.bio || '');
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  async function handleComplete() {
    if (!userId) {
      Alert.alert('Error', 'User ID is missing');
      return;
    }

    // Validation
    if (!skills || !jobTypes) {
      Alert.alert('Error', 'Please fill in your skills and job types');
      return;
    }

    if (!preferredLocation) {
      Alert.alert('Error', 'Please enter your preferred work location');
      return;
    }

    if (!icNumber) {
      Alert.alert('Error', 'Please enter your IC/Passport number for verification');
      return;
    }

    setLoading(true);

    try {
      // Update profile with KYC data and enable marketplace access
      const { error } = await supabase
        .from('profiles')
        .update({
          skills: skills.trim(),
          experience_level: experienceLevel,
          job_types_interested: jobTypes.trim(),
          preferred_location: preferredLocation.trim(),
          preferred_area: preferredArea.trim() || null,
          availability: availability.trim() || null,
          ic_number: icNumber.trim(),
          has_work_permit: hasWorkPermit,
          bio: bio.trim() || null,
          marketplace_enabled: true, // Enable marketplace access
          onboarding_type: 'both', // Can access both employee and marketplace features
          profile_status: 'pending_verification', // Admin needs to verify documents
        })
        .eq('id', userId);

      if (error) throw error;

      Alert.alert(
        'KYC Verification Submitted! 🎉',
        'Your KYC documents have been submitted for verification. You will receive marketplace access once verified (usually within 24 hours). You can still access your employer\'s internal shifts.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/worker'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  function renderStepIndicator() {
    return (
      <View style={styles.stepIndicator}>
        {[1, 2, 3].map((s) => (
          <View key={s} style={styles.stepContainer}>
            <View style={[styles.stepCircle, step >= s && styles.stepCircleActive]}>
              <Text style={[styles.stepNumber, step >= s && styles.stepNumberActive]}>
                {s}
              </Text>
            </View>
            {s < 3 && <View style={[styles.stepLine, step > s && styles.stepLineActive]} />}
          </View>
        ))}
      </View>
    );
  }

  function renderStep1() {
    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Job Preferences</Text>
        <Text style={styles.stepSubtitle}>Tell us about your work experience</Text>

        <TextInput
          label="Skills *"
          value={skills}
          onChangeText={setSkills}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={styles.input}
          placeholder="e.g. Customer service, Food handling, Cashier"
        />

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Experience Level *</Text>
          {['beginner', 'intermediate', 'experienced'].map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.radioOption,
                experienceLevel === level && styles.radioOptionSelected,
              ]}
              onPress={() => setExperienceLevel(level as any)}
            >
              <View style={styles.radioCircle}>
                {experienceLevel === level && <View style={styles.radioCircleInner} />}
              </View>
              <Text style={styles.radioText}>
                {level === 'beginner' && 'Beginner (0-1 years)'}
                {level === 'intermediate' && 'Intermediate (1-3 years)'}
                {level === 'experienced' && 'Experienced (3+ years)'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          label="Job Types Interested *"
          value={jobTypes}
          onChangeText={setJobTypes}
          mode="outlined"
          style={styles.input}
          placeholder="e.g. F&B, Retail, Events, Warehouse"
        />
      </View>
    );
  }

  function renderStep2() {
    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Location & Availability</Text>
        <Text style={styles.stepSubtitle}>Where and when can you work?</Text>

        <TextInput
          label="Preferred Work Location *"
          value={preferredLocation}
          onChangeText={setPreferredLocation}
          mode="outlined"
          style={styles.input}
          placeholder="e.g. Central Singapore, Orchard Road"
        />

        <TextInput
          label="Preferred Area (Optional)"
          value={preferredArea}
          onChangeText={setPreferredArea}
          mode="outlined"
          style={styles.input}
          placeholder="e.g. Specific MRT stations or areas"
        />

        <TextInput
          label="Availability (Optional)"
          value={availability}
          onChangeText={setAvailability}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={styles.input}
          placeholder="e.g. Weekends only, Evenings, Flexible"
        />
      </View>
    );
  }

  function renderStep3() {
    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>KYC Verification</Text>
        <Text style={styles.stepSubtitle}>Complete verification to access marketplace</Text>

        <TextInput
          label="IC / Passport Number *"
          value={icNumber}
          onChangeText={setIcNumber}
          mode="outlined"
          style={styles.input}
          placeholder="e.g. S1234567A"
        />

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Work Permit Status *</Text>
          <TouchableOpacity
            style={styles.switchRow}
            onPress={() => setHasWorkPermit(!hasWorkPermit)}
          >
            <Text style={styles.switchLabel}>
              {hasWorkPermit ? 'I have a valid work permit' : 'I do not have a work permit'}
            </Text>
            <View style={[styles.switch, hasWorkPermit && styles.switchActive]}>
              <View style={[styles.switchThumb, hasWorkPermit && styles.switchThumbActive]} />
            </View>
          </TouchableOpacity>
        </View>

        <TextInput
          label="Bio (Optional)"
          value={bio}
          onChangeText={setBio}
          mode="outlined"
          multiline
          numberOfLines={4}
          style={styles.input}
          placeholder="Tell employers about yourself..."
        />

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
          <Text style={styles.infoText}>
            Your documents will be verified by our team. Once verified, you'll have access to all marketplace shifts while still maintaining access to your employer's internal shifts.
          </Text>
        </View>
      </View>
    );
  }

  const handleNext = () => {
    if (step === 1) {
      if (!skills.trim() || !jobTypes.trim()) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }
    } else if (step === 2) {
      if (!preferredLocation.trim()) {
        Alert.alert('Error', 'Please enter your preferred work location');
        return;
      }
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>KYC Verification</Text>
        <View style={{ width: 24 }} />
      </View>

      {renderStepIndicator()}

      <View style={styles.content}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        <View style={styles.actions}>
          {step < 3 ? (
            <Button
              mode="contained"
              onPress={handleNext}
              disabled={loading}
              style={styles.primaryButton}
              icon="arrow-forward"
            >
              Next
            </Button>
          ) : (
            <Button
              mode="contained"
              onPress={handleComplete}
              loading={loading}
              disabled={loading}
              style={styles.primaryButton}
              icon="check-circle"
            >
              Submit for Verification
            </Button>
          )}

          {step > 1 && (
            <Button
              mode="outlined"
              onPress={handleBack}
              disabled={loading}
              style={styles.secondaryButton}
            >
              Back
            </Button>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({

  logoBox: { position: 'absolute', top: Platform.OS === 'web' ? 16 : 52, left: 16, zIndex: 1000, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, padding: 8, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  logo: { width: 32, height: 32 },

  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#3B82F6',
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#9CA3AF',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepLine: {
    width: 50,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: '#3B82F6',
  },
  content: {
    padding: 20,
  },
  stepContent: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  radioOptionSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
  },
  radioText: {
    fontSize: 16,
    color: '#111827',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 16,
  },
  switchLabel: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  switch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D1D5DB',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchActive: {
    backgroundColor: '#3B82F6',
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignSelf: 'flex-start',
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 18,
  },
  actions: {
    marginTop: 24,
  },
  primaryButton: {
    marginBottom: 12,
    backgroundColor: '#3B82F6',
  },
  secondaryButton: {
    marginBottom: 12,
  },
});
