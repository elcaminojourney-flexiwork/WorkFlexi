import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { TextInput, Button } from 'react-native-paper';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';


// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function EmployerOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Company Details (already have name & registration)
  const [companyAddress, setCompanyAddress] = useState('');
  const [industry, setIndustry] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');

  // Step 2: Contact Person
  const [contactPerson, setContactPerson] = useState('');
  const [contactRole, setContactRole] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Step 3: Billing
  const [billingEmail, setBillingEmail] = useState('');

  // Step 4: Payment (optional)
  // No state needed - this is just a placeholder UI

  const industries = [
    'F&B / Food Services',
    'Retail',
    'Warehouse / Logistics',
    'Events',
    'Hospitality / Hotels',
    'Cleaning Services',
    'Security',
    'Healthcare',
    'Other',
  ];

  async function handleComplete(skipPayment: boolean = false) {
    // Validation for required steps
    if (!companyAddress || !selectedIndustry) {
      Alert.alert('Error', 'Please fill in all company details');
      return;
    }

    if (!contactPerson || !contactPhone) {
      Alert.alert('Error', 'Please fill in contact person details');
      return;
    }

    if (!billingEmail) {
      Alert.alert('Error', 'Please enter billing email');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      // Update profile with onboarding data
      const { error } = await supabase
        .from('profiles')
        .update({
          company_address: companyAddress.trim(),
          industry: selectedIndustry,
          contact_person: contactPerson.trim(),
          contact_role: contactRole.trim() || null,
          contact_phone: contactPhone.trim(),
          billing_email: billingEmail.trim(),
          onboarding_completed: true,
          profile_status: 'active',
        })
        .eq('id', user.id);

      if (error) throw error;

      Alert.alert(
        'Welcome to Flexiwork! 🎉',
        'Your account is ready. You can now post shifts and hire workers.',
        [
          {
            text: 'Start Hiring',
            onPress: () => router.replace('/employer'),
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
        <Text style={styles.stepTitle}>🏢 Company Details</Text>
        <Text style={styles.stepSubtitle}>Complete your company information</Text>

        <TextInput
          label="Company Address (Singapore) *"
          value={companyAddress}
          onChangeText={setCompanyAddress}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={styles.input}
        />

        <Text style={styles.label}>Industry *</Text>
        <View style={styles.industryGrid}>
          {industries.map((ind) => (
            <TouchableOpacity
              key={ind}
              style={[
                styles.industryButton,
                selectedIndustry === ind && styles.industryButtonActive,
              ]}
              onPress={() => setSelectedIndustry(ind)}
            >
              <Text style={[
                styles.industryText,
                selectedIndustry === ind && styles.industryTextActive,
              ]}>
                {ind}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={() => {
            if (!companyAddress || !selectedIndustry) {
              Alert.alert('Required', 'Please fill in all fields');
              return;
            }
            setStep(2);
          }}
        >
          <Text style={styles.nextButtonText}>Next →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderStep2() {
    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>👤 Contact Person</Text>
        <Text style={styles.stepSubtitle}>Who should workers contact?</Text>

        <TextInput
          label="Contact Person Name *"
          value={contactPerson}
          onChangeText={setContactPerson}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Role / Position"
          value={contactRole}
          onChangeText={setContactRole}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Contact Phone *"
          value={contactPhone}
          onChangeText={setContactPhone}
          mode="outlined"
          keyboardType="phone-pad"
          style={styles.input}
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep(1)}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => {
              if (!contactPerson || !contactPhone) {
                Alert.alert('Required', 'Please fill in contact details');
                return;
              }
              setStep(3);
            }}
          >
            <Text style={styles.nextButtonText}>Next →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderStep3() {
    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>💳 Billing Information</Text>
        <Text style={styles.stepSubtitle}>For invoices and payment</Text>

        <TextInput
          label="Billing Email *"
          value={billingEmail}
          onChangeText={setBillingEmail}
          mode="outlined"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 Payment Setup: You'll add payment methods when posting your first shift. We hold payment in escrow to protect workers.
          </Text>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep(2)}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => {
              if (!billingEmail) {
                Alert.alert('Required', 'Please enter billing email');
                return;
              }
              setStep(4);
            }}
          >
            <Text style={styles.nextButtonText}>Next →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderStep4() {
    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>💳 Payment Setup (Optional)</Text>
        <Text style={styles.stepSubtitle}>Add payment methods for faster shift posting</Text>

        <View style={styles.paymentPlaceholder}>
          <Ionicons name="card-outline" size={48} color="#9CA3AF" />
          <Text style={styles.placeholderTitle}>Payment Setup Coming Soon</Text>
          <Text style={styles.placeholderText}>
            We're working on integrating secure payment methods. For now, you can add payment details when posting your first shift.
          </Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 <Text style={styles.infoBold}>How it works:</Text> When you post a shift, we'll create an escrow payment to hold funds until the shift is completed. This protects both you and the workers.
          </Text>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep(3)}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.skipButton, loading && styles.buttonDisabled]}
            onPress={() => handleComplete(true)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#64748B" />
            ) : (
              <Text style={styles.skipButtonText}>Skip for now</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.completeButtonFullWidth, loading && styles.buttonDisabled]}
          onPress={() => handleComplete(false)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.completeButtonText}>Complete Setup 🎉</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Employer Onboarding</Text>
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
    backgroundColor: '#8B5CF6',
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
    width: 40,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 5,
  },
  stepLineActive: {
    backgroundColor: '#8B5CF6',
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
    minHeight: 100,
    textAlignVertical: 'top',
  },
  industryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 30,
  },
  industryButton: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: '45%',
  },
  industryButtonActive: {
    borderColor: '#8B5CF6',
    backgroundColor: '#FAF5FF',
  },
  industryText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
  },
  industryTextActive: {
    color: '#8B5CF6',
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
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
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
  completeButtonFullWidth: {
    width: '100%',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
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
    backgroundColor: '#FAF5FF',
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#6D28D9',
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: 'bold',
  },
  paymentPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginBottom: 20,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  skipButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
  },
});