import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button, TextInput } from 'react-native-paper';
import { supabase } from '../../supabase';


// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function WorkerOnboardingPage() {
  const router = useRouter();
  const { userId } = useLocalSearchParams();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Job Preferences
  const [skills, setSkills] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<'beginner' | 'intermediate' | 'experienced'>('beginner');
  const [jobTypes, setJobTypes] = useState('');

  // Step 2: Location & Availability
  const [preferredLocation, setPreferredLocation] = useState('');
  const [preferredArea, setPreferredArea] = useState('');
  const [availability, setAvailability] = useState('');

  // Step 3 & 4: Documents (we'll handle file upload differently for web preview)
  const [icNumber, setIcNumber] = useState('');
  const [hasWorkPermit, setHasWorkPermit] = useState(true);
  const [bio, setBio] = useState('');

  async function handleComplete() {
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
      // Update profile with onboarding data
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
          onboarding_completed: true,
          profile_status: 'pending_verification', // Admin needs to verify documents
        })
        .eq('id', userId);

      if (error) throw error;

      Alert.alert(
        'Profile Complete! 🎉',
        'Your profile is under review. You can start browsing shifts, but you can only apply once verified (usually within 24 hours).',
        [
          {
            text: 'Start Browsing',
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
        {[1, 2, 3, 4].map((s) => (
          <View key={s} style={styles.stepContainer}>
            <View style={[styles.stepCircle, step >= s && styles.stepCircleActive]}>
              <Text style={[styles.stepNumber, step >= s && styles.stepNumberActive]}>
                {s}
              </Text>
            </View>
            {s < 4 && <View style={[styles.stepLine, step > s && styles.stepLineActive]} />}
          </View>
        ))}
      </View>
    );
  }

  function renderStep1() {
    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>👷 Your Skills & Experience</Text>
        <Text style={styles.stepSubtitle}>Help employers find you for the right jobs</Text>

        <Text style={styles.label}>What skills do you have? *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Cashier, Kitchen Helper, Warehouse, Driver"
          value={skills}
          onChangeText={setSkills}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Experience Level *</Text>
        <View style={styles.radioGroup}>
          {['beginner', 'intermediate', 'experienced'].map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.radioButton,
                experienceLevel === level && styles.radioButtonActive,
              ]}
              onPress={() => setExperienceLevel(level as any)}
            >
              <Text style={[
                styles.radioText,
                experienceLevel === level && styles.radioTextActive,
              ]}>
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>What type of jobs are you looking for? *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., F&B, Retail, Warehouse, Events"
          value={jobTypes}
          onChangeText={setJobTypes}
          multiline
          numberOfLines={3}
        />

        <Button
          mode="contained"
          onPress={() => {
            if (!skills || !jobTypes) {
              Alert.alert('Required', 'Please fill in all required fields');
              return;
            }
            setStep(2);
          }}
          icon="arrow-forward"
          style={{ marginVertical: 8 }}
          contentStyle={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
        >
          Next
        </Button>
      </View>
    );
  }

  function renderStep2() {
    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>📍 Location & Availability</Text>
        <Text style={styles.stepSubtitle}>Where and when can you work?</Text>

        <Text style={styles.label}>Preferred Work Location *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Central, Orchard, Marina Bay"
          value={preferredLocation}
          onChangeText={setPreferredLocation}
        />

        <Text style={styles.label}>Specific Area (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., City Square, Orchard Road"
          value={preferredArea}
          onChangeText={setPreferredArea}
        />

        <Text style={styles.label}>Your Availability (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Weekends, Evenings, Full-time"
          value={availability}
          onChangeText={setAvailability}
          multiline
          numberOfLines={2}
        />

        <View style={styles.buttonRow}>
          <Button
            mode="outlined"
            onPress={() => setStep(1)}
            icon="arrow-back"
            style={{ flex: 1, marginRight: 8 }}
            contentStyle={{ paddingVertical: 8 }}
          >
            Back
          </Button>

          <Button
            mode="contained"
            onPress={() => {
              if (!preferredLocation) {
                Alert.alert('Required', 'Please enter your preferred location');
                return;
              }
              setStep(3);
            }}
            icon="arrow-forward"
            style={{ flex: 1, marginLeft: 8 }}
            contentStyle={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
          >
            Next
          </Button>
        </View>
      </View>
    );
  }

  function renderStep3() {
    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>🆔 Identity Verification</Text>
        <Text style={styles.stepSubtitle}>Required for right to work verification</Text>

        <Text style={styles.label}>IC / Passport Number *</Text>
        <TextInput
          label="IC/Passport number"
          value={icNumber}
          onChangeText={setIcNumber}
          mode="outlined"
          style={styles.input}
        />

        <Text style={styles.label}>Right to Work</Text>
        <View style={styles.radioGroup}>
          <TouchableOpacity
            style={[
              styles.radioButton,
              hasWorkPermit && styles.radioButtonActive,
            ]}
            onPress={() => setHasWorkPermit(true)}
          >
            <Text style={[
              styles.radioText,
              hasWorkPermit && styles.radioTextActive,
            ]}>
              Singaporean / PR
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.radioButton,
              !hasWorkPermit && styles.radioButtonActive,
            ]}
            onPress={() => setHasWorkPermit(false)}
          >
            <Text style={[
              styles.radioText,
              !hasWorkPermit && styles.radioTextActive,
            ]}>
              Foreign Worker
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            📝 Note: After completing this form, our team will contact you to verify your documents (IC/Passport photo) via WhatsApp or email within 24 hours.
          </Text>
        </View>

        <View style={styles.buttonRow}>
          <Button
            mode="outlined"
            onPress={() => setStep(2)}
            icon="arrow-back"
            style={{ flex: 1, marginRight: 8 }}
            contentStyle={{ paddingVertical: 8 }}
          >
            Back
          </Button>

          <Button
            mode="contained"
            onPress={() => {
              if (!icNumber) {
                Alert.alert('Required', 'Please enter your IC/Passport number');
                return;
              }
              setStep(4);
            }}
            icon="arrow-forward"
            style={{ flex: 1, marginLeft: 8 }}
            contentStyle={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
          >
            Next
          </Button>
        </View>
      </View>
    );
  }

  function renderStep4() {
    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>✍️ Tell Us About Yourself</Text>
        <Text style={styles.stepSubtitle}>Optional but helps you stand out!</Text>

        <Text style={styles.label}>Short Bio (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Tell employers about yourself, your work ethic, achievements, etc."
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={5}
        />

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 Tip: Mention your reliability, punctuality, or any special achievements to increase your chances of getting hired!
          </Text>
        </View>

        <View style={styles.buttonRow}>
          <Button
            mode="outlined"
            onPress={() => setStep(3)}
            icon="arrow-back"
            style={{ flex: 1, marginRight: 8 }}
            contentStyle={{ paddingVertical: 8 }}
          >
            Back
          </Button>

          <Button
            mode="contained"
            onPress={handleComplete}
            loading={loading}
            disabled={loading}
            icon="check-circle"
            buttonColor="#3B82F6"
            style={{ flex: 1, marginLeft: 8 }}
            contentStyle={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
          >
            Complete Profile 🎉
          </Button>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>Step {step} of 4</Text>

        {renderStepIndicator()}

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
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
  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 30,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#2563EB',
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#64748B',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepLine: {
    width: 30,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 5,
  },
  stepLineActive: {
    backgroundColor: '#2563EB',
  },
  stepContent: {
    width: '100%',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  radioButton: {
    flex: 1,
    minWidth: 100,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  radioButtonActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  radioText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
  radioTextActive: {
    color: '#2563EB',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 20,
  },
  backButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  completeButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
});