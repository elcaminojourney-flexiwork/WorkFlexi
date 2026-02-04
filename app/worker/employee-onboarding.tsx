import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, ImageBackground,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button, TextInput } from 'react-native-paper';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';
import ConstitutionalScreen from '../../components/ConstitutionalScreen';


// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function EmployeeOnboardingPage() {
  const router = useRouter();
  const { userId, inviteCode, employerId } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [verifyingPhone, setVerifyingPhone] = useState(false);

  // Simplified fields - only name and phone
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Validate invite code and employer ID
  useEffect(() => {
    if (!inviteCode || !employerId) {
      Alert.alert(
        'Invalid Invite',
        'This invite link is invalid. Please contact your employer for a new invite.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/auth/select-user-type'),
          },
        ]
      );
    }
  }, [inviteCode, employerId]);

  async function handleSendOTP() {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    // Basic phone validation (Singapore format: +65XXXXXXXX or similar)
    const phoneRegex = /^\+?[0-9]{8,15}$/;
    if (!phoneRegex.test(phone.trim())) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setVerifyingPhone(true);

    try {
      // Note: In a real implementation, you would call a Supabase Edge Function
      // or backend service to send OTP via SMS
      // For now, we'll simulate OTP sending (in production, use Twilio, AWS SNS, etc.)
      
      // TODO: Implement actual OTP sending via Edge Function
      // For MVP, we'll skip OTP verification and allow direct completion
      // In production: await supabase.functions.invoke('send-otp', { body: { phone } });
      
      Alert.alert(
        'OTP Sent',
        `OTP verification will be implemented in production. For now, you can proceed.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setOtpSent(true);
              // For MVP: Auto-complete OTP step
              setOtpCode('123456'); // Placeholder
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send OTP');
    } finally {
      setVerifyingPhone(false);
    }
  }

  async function handleComplete() {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    if (!userId) {
      Alert.alert('Error', 'User ID is missing');
      return;
    }

    if (!employerId) {
      Alert.alert('Error', 'Employer ID is missing from invite');
      return;
    }

    setLoading(true);

    try {
      // Verify employer exists
      const { data: employer, error: employerError } = await supabase
        .from('profiles')
        .select('id, company_name')
        .eq('id', employerId)
        .eq('user_type', 'employer')
        .single();

      if (employerError || !employer) {
        throw new Error('Invalid employer. Please contact your employer for a new invite.');
      }

      // Update profile with simplified employee onboarding data
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          onboarding_completed: true,
          onboarding_type: 'employee',
          marketplace_enabled: false, // Employees cannot access marketplace
          employed_by: [
            {
              employer_id: employerId,
              role: 'employee', // Default role
              status: 'active',
            },
          ],
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      Alert.alert(
        'Welcome! 🎉',
        `You've been successfully onboarded as an employee of ${employer.company_name || 'your employer'}.`,
        [
          {
            text: 'Get Started',
            onPress: () => router.replace('/worker'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Employee onboarding error:', error);
      Alert.alert('Error', error.message || 'Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ConstitutionalScreen title="Employee Onboarding" showBack onBack={() => router.replace('/auth/select-user-type')} showLogo theme="light">
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="person-add" size={48} color="#3B82F6" style={styles.icon} />
          <Text style={styles.title}>Employee Onboarding</Text>
          <Text style={styles.subtitle}>
            You've been invited to join your employer's team
          </Text>
        </View>

        <View style={styles.form}>
          {/* Full Name */}
          <TextInput
            label="Full Name *"
            value={fullName}
            onChangeText={setFullName}
            mode="outlined"
            style={styles.input}
            disabled={loading}
            left={<TextInput.Icon icon="account" />}
          />

          {/* Phone Number */}
          <TextInput
            label="Phone Number *"
            value={phone}
            onChangeText={setPhone}
            mode="outlined"
            keyboardType="phone-pad"
            style={styles.input}
            disabled={loading || otpSent}
            left={<TextInput.Icon icon="phone" />}
            placeholder="+65XXXXXXXX"
          />

          {/* OTP Section (optional for MVP) */}
          {otpSent && (
            <View style={styles.otpSection}>
              <TextInput
                label="OTP Code"
                value={otpCode}
                onChangeText={setOtpCode}
                mode="outlined"
                keyboardType="number-pad"
                style={styles.input}
                disabled={loading}
                left={<TextInput.Icon icon="lock" />}
                placeholder="Enter 6-digit code"
              />
              <Text style={styles.otpNote}>
                OTP verification will be implemented in production
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            {!otpSent ? (
              <Button
                mode="contained"
                onPress={handleSendOTP}
                loading={verifyingPhone}
                disabled={loading || !fullName.trim() || !phone.trim()}
                style={styles.primaryButton}
              >
                Send OTP
              </Button>
            ) : (
              <Button
                mode="contained"
                onPress={handleComplete}
                loading={loading}
                disabled={loading || !fullName.trim() || !phone.trim()}
                style={styles.primaryButton}
              >
                Complete Onboarding
              </Button>
            )}

            <Button
              mode="text"
              onPress={() => router.replace('/auth/select-user-type')}
              disabled={loading}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
            <Text style={styles.infoText}>
              This is a simplified onboarding process for employees. Your employer has already added you to their team.
            </Text>
          </View>
        </View>
      </View>
    </ConstitutionalScreen>
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
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  otpSection: {
    marginBottom: 16,
  },
  otpNote: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    marginLeft: 12,
    fontStyle: 'italic',
  },
  actions: {
    marginTop: 8,
  },
  primaryButton: {
    marginBottom: 12,
    paddingVertical: 4,
  },
  cancelButton: {
    marginTop: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 12,
    borderRadius: 8,
    marginTop: 24,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
});
