// app/auth/login.tsx - Login page with timeout handling
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ImageBackground, Image, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../supabase';

const COLORS = {
  purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED', purple100: '#F3E8FF',
  blue500: '#3B82F6', blue600: '#2563EB', blue100: '#DBEAFE',
  gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

const LOGIN_TIMEOUT = 15000; // 15 seconds

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Login timed out. Please check your connection.')), LOGIN_TIMEOUT);
    });

    try {
      // Race login against timeout
      const { data, error } = await Promise.race([
        supabase.auth.signInWithPassword({ email: email.trim(), password }),
        timeoutPromise.then(() => { throw new Error('timeout'); })
      ]) as any;

      if (error) throw error;
      if (!data?.user) throw new Error('No user data received');

      // Get profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_type, onboarding_completed')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('Profile not found');
      }

      // Determine destination
      const basePath = profile.user_type === 'employer' ? '/employer' : '/worker';
      const destination = profile.onboarding_completed ? basePath : `${basePath}/onboarding`;

      console.log('✅ Login success, redirecting to:', destination);

      // Navigate using router
      router.replace(destination as any);

    } catch (error: any) {
      console.error('❌ Login error:', error);
      
      let message = 'Login failed. Please try again.';
      if (error.message?.includes('timeout')) {
        message = 'Connection timed out. Please check your internet.';
      } else if (error.message?.includes('Invalid login')) {
        message = 'Invalid email or password.';
      } else if (error.message) {
        message = error.message;
      }
      
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground source={require('../../assets/images/background.webp')} style={styles.bg} resizeMode="cover">
      <LinearGradient colors={['rgba(139, 92, 246, 0.95)', 'rgba(59, 130, 246, 0.92)', 'rgba(147, 51, 234, 0.90)']} style={StyleSheet.absoluteFillObject} />
      
      <View style={styles.logoBox}>
        <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
          </View>

          {/* Form Card */}
          <LinearGradient colors={[COLORS.purple100, COLORS.blue100]} style={styles.card}>
            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={COLORS.purple600} />
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor={COLORS.gray400}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.purple600} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.gray400}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.gray500} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity onPress={() => router.push('/auth/reset')}>
              <Text style={styles.forgot}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity onPress={handleLogin} disabled={loading} style={styles.loginBtn}>
              <LinearGradient colors={[COLORS.purple600, COLORS.blue600]} style={styles.loginGradient}>
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <>
                    <Text style={styles.loginText}>Sign In</Text>
                    <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>

          {/* Register Link */}
          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/auth/select-user-type')}>
              <Text style={styles.registerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoBox: { position: 'absolute', top: Platform.OS === 'web' ? 16 : 52, left: 16, zIndex: 1000, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, padding: 8 },
  logo: { width: 32, height: 32 },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 32, fontWeight: '800', color: '#FFF' },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 8 },
  card: { borderRadius: 24, padding: 24 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', color: COLORS.purple700, marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 2, borderColor: COLORS.purple100 },
  input: { flex: 1, fontSize: 16, color: COLORS.gray900, marginLeft: 12 },
  forgot: { textAlign: 'right', color: COLORS.purple600, fontWeight: '600', marginBottom: 24 },
  loginBtn: { borderRadius: 16, overflow: 'hidden' },
  loginGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  loginText: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  registerText: { color: 'rgba(255,255,255,0.8)', fontSize: 15 },
  registerLink: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
