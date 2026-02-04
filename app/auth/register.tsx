import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ImageBackground, Image, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../supabase';

const COLORS = {
  purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED', purple100: '#F3E8FF', purple200: '#E9D5FF',
  blue500: '#3B82F6', blue600: '#2563EB', blue100: '#DBEAFE',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function RegisterPage() {
  const router = useRouter();
  const { type } = useLocalSearchParams();
  const userType = (type as string) || 'worker';
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (userType === 'employer' && !companyName) {
      Alert.alert('Error', 'Please enter your company name');
      return;
    }

    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: authData.user.id,
          full_name: fullName,
          email: email,
          user_type: userType,
          company_name: userType === 'employer' ? companyName : null,
          onboarding_completed: false,
          created_at: new Date().toISOString(),
        });
        if (profileError) throw profileError;

        // New sign up → onboarding (user is already logged in)
        router.replace(`/${userType}/onboarding` as any);
      }
    } catch (error: any) {
      const msg = (error.message || '').toLowerCase();
      const friendly = (msg.includes('fetch') || msg.includes('network')) 
        ? 'Cannot reach the server. Check your internet. If the app worked before, the backend may be paused (Supabase dashboard).'
        : error.message;
      Alert.alert('Registration Failed', friendly);
    } finally {
      setLoading(false);
    }
  };

  const isEmployer = userType === 'employer';

  return (
    <ImageBackground source={require('../../assets/images/background.webp')} style={styles.bg} resizeMode="cover">
      <LinearGradient colors={['rgba(139, 92, 246, 0.95)', 'rgba(59, 130, 246, 0.90)', 'rgba(147, 51, 234, 0.92)']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      
      {/* Logo */}
      <View style={styles.logoBox}>
        <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name={isEmployer ? 'business' : 'person-add'} size={40} color={COLORS.purple600} />
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join FlexiWork as {isEmployer ? 'an Employer' : 'a Worker'}</Text>
            <TouchableOpacity onPress={() => router.replace(`/auth/register?type=${isEmployer ? 'worker' : 'employer'}` as any)} style={styles.switchTypeBtn}>
              <Text style={styles.switchTypeText}>{isEmployer ? 'Sign up as Worker instead' : 'Sign up as Employer instead'}</Text>
            </TouchableOpacity>
          </View>

          {/* Register Card */}
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color={COLORS.gray400} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="John Doe" placeholderTextColor={COLORS.gray400} value={fullName} onChangeText={setFullName} autoCapitalize="words" />
              </View>
            </View>

            {isEmployer && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Company Name</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="business-outline" size={20} color={COLORS.gray400} style={styles.inputIcon} />
                  <TextInput style={styles.input} placeholder="Your Company Ltd" placeholderTextColor={COLORS.gray400} value={companyName} onChangeText={setCompanyName} />
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={COLORS.gray400} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="your@email.com" placeholderTextColor={COLORS.gray400} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="key-outline" size={20} color={COLORS.gray400} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Min. 6 characters" placeholderTextColor={COLORS.gray400} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.gray400} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.gray400} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Repeat password" placeholderTextColor={COLORS.gray400} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} />
              </View>
            </View>

            <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} disabled={loading} activeOpacity={0.9}>
              <LinearGradient colors={[COLORS.purple600, COLORS.purple700]} style={styles.registerBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <>
                    <Text style={styles.registerBtnText}>Create Account</Text>
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/auth/login')} activeOpacity={0.8}>
              <Text style={styles.loginBtnText}>Already have an account? Sign In</Text>
            </TouchableOpacity>
          </View>

          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/auth/select-user-type')}>
            <Ionicons name="arrow-back" size={20} color={COLORS.white} />
            <Text style={styles.backText}>Back to selection</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: Platform.OS === 'web' ? 100 : 130, paddingBottom: 40 },
  
  logoBox: { position: 'absolute', top: Platform.OS === 'web' ? 16 : 52, left: 16, zIndex: 100, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: 8, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
  logo: { width: 40, height: 40 },

  header: { alignItems: 'center', marginBottom: 28 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.95)', justifyContent: 'center', alignItems: 'center', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 10 },
  title: { fontSize: 32, fontWeight: '800', color: COLORS.white, marginBottom: 8, textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },

  card: { backgroundColor: COLORS.white, borderRadius: 24, padding: 24, shadowColor: '#1E293B', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 32, elevation: 16, marginBottom: 24 },
  
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.gray700, marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.gray50, borderRadius: 14, borderWidth: 2, borderColor: COLORS.gray100, paddingHorizontal: 14 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: COLORS.gray900 },
  eyeBtn: { padding: 4 },

  registerBtn: { borderRadius: 16, overflow: 'hidden', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8, marginTop: 8, marginBottom: 20 },
  registerBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 10 },
  registerBtnText: { fontSize: 18, fontWeight: '700', color: COLORS.white },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.gray200 },
  dividerText: { marginHorizontal: 16, fontSize: 14, color: COLORS.gray400, fontWeight: '500' },

  loginBtn: { borderWidth: 2, borderColor: COLORS.purple200, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  loginBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.purple600 },

  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  backText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  switchTypeBtn: { marginTop: 8 },
  switchTypeText: { fontSize: 14, color: 'rgba(255,255,255,0.95)', fontWeight: '600', textDecorationLine: 'underline' },
});
