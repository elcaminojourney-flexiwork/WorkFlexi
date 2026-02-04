// app/index.tsx - Entry point with fast redirect (no infinite loading)
import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, Platform, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../supabase';

const MAX_WAIT = 3000; // Maximum 3 seconds before forcing login redirect

export default function IndexPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'redirecting'>('loading');
  const didRedirect = useRef(false);

  useEffect(() => {
    // Force redirect after MAX_WAIT ms to prevent infinite loading
    const forceTimer = setTimeout(() => {
      if (!didRedirect.current) {
        console.log('⏱️ Force redirect to login (timeout)');
        doRedirect('/auth/login');
      }
    }, MAX_WAIT);

    // Check auth status
    checkAuth();

    return () => clearTimeout(forceTimer);
  }, []);

  const doRedirect = (path: string) => {
    if (didRedirect.current) return;
    didRedirect.current = true;
    setStatus('redirecting');
    
    console.log('🚀 Navigating to:', path);
    
    // Use router for navigation
    setTimeout(() => {
      router.replace(path as any);
    }, 100);
  };

  const checkAuth = async () => {
    try {
      console.log('🔄 Checking session...');
      
      // Quick session check
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.log('📭 No session, redirecting to login');
        doRedirect('/auth/login');
        return;
      }

      // Get profile to determine user type
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type, onboarding_completed')
        .eq('id', session.user.id)
        .single();

      if (!profile) {
        console.log('❌ No profile found');
        doRedirect('/auth/login');
        return;
      }

      // Redirect based on user type and onboarding status
      const basePath = profile.user_type === 'employer' ? '/employer' : '/worker';
      const destination = profile.onboarding_completed ? basePath : `${basePath}/onboarding`;
      
      console.log('✅ User found, going to:', destination);
      doRedirect(destination);

    } catch (err) {
      console.error('❌ Auth check error:', err);
      doRedirect('/auth/login');
    }
  };

  return (
    <LinearGradient 
      colors={['#7C3AED', '#3B82F6', '#8B5CF6']} 
      style={styles.container}
    >
      {/* Logo */}
      <View style={styles.logoBox}>
        <Image 
          source={require('../assets/images/logo.png')} 
          style={styles.logo} 
          resizeMode="contain" 
        />
      </View>

      <View style={styles.content}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.title}>FlexiWork</Text>
        <Text style={styles.subtitle}>
          {status === 'loading' ? 'Loading...' : 'Redirecting...'}
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  logoBox: { 
    position: 'absolute', 
    top: Platform.OS === 'web' ? 16 : 52, 
    left: 16, 
    zIndex: 1000, 
    backgroundColor: 'rgba(255,255,255,0.95)', 
    borderRadius: 14, 
    padding: 8,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  logo: { 
    width: 36, 
    height: 36,
  },
  content: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 24,
  },
  title: { 
    marginTop: 20, 
    fontSize: 32, 
    fontWeight: '800', 
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: { 
    marginTop: 8, 
    fontSize: 16, 
    color: 'rgba(255,255,255,0.9)',
  },
});
