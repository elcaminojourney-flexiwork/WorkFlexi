import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ImageBackground, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../supabase';

export default function SelectUserTypePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setChecking(false);
          return;
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type, onboarding_completed')
          .eq('id', session.user.id)
          .single();
        if (!profile) {
          setChecking(false);
          return;
        }
        const basePath = profile.user_type === 'employer' ? '/employer' : '/worker';
        const destination = profile.onboarding_completed ? basePath : `${basePath}/onboarding`;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.location.href = destination;
        } else {
          router.replace(destination as any);
        }
      } catch {
        setChecking(false);
      }
    })();
  }, [router]);

  if (checking) {
    return (
      <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#7C3AED' }]}>
        <ActivityIndicator size="large" color="#FFF" />
        <Text style={{ marginTop: 12, color: '#FFF', fontSize: 16 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require('../../assets/images/background.webp')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      {/* Purple/Blue gradient overlay */}
      <LinearGradient
        colors={['rgba(139, 92, 246, 0.95)', 'rgba(59, 130, 246, 0.90)', 'rgba(139, 92, 246, 0.85)']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.container}>
        {/* Header: centered logo (double size), no round icon */}
        <View style={styles.header}>
          <View style={styles.logoCenterWrapper}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logoCenter}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Welcome to FlexiWork</Text>
          <Text style={styles.subtitle}>Choose how you'd like to use the platform</Text>
        </View>

        {/* Options Container */}
        <View style={styles.optionsContainer}>
          {/* Worker Card */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => router.push('/auth/login?type=worker')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFC']}
              style={styles.cardGradient}
            >
              <View style={styles.cardContent}>
                <View style={[styles.iconBadge, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="person" size={32} color="#3B82F6" />
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.optionTitle}>I'm a Worker</Text>
                  <Text style={styles.optionDescription}>
                    Find shifts, apply for jobs, and earn money
                  </Text>
                </View>
                <View style={[styles.arrowBadge, { backgroundColor: '#3B82F6' }]}>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Employer Card */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => router.push('/auth/login?type=employer')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#FFFFFF', '#FAF5FF']}
              style={styles.cardGradient}
            >
              <View style={styles.cardContent}>
                <View style={[styles.iconBadge, { backgroundColor: '#F5F3FF' }]}>
                  <Ionicons name="business" size={32} color="#8B5CF6" />
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.optionTitle}>I'm an Employer</Text>
                  <Text style={styles.optionDescription}>
                    Post shifts, hire workers, and manage your team
                  </Text>
                </View>
                <View style={[styles.arrowBadge, { backgroundColor: '#8B5CF6' }]}>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Footer: Sign up as Worker / Employer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>New to FlexiWork?</Text>
          <View style={styles.signUpRow}>
            <TouchableOpacity onPress={() => router.push('/auth/register?type=worker')}>
              <Text style={styles.signUpLink}>Sign up as Worker</Text>
            </TouchableOpacity>
            <Text style={styles.footerText}> · </Text>
            <TouchableOpacity onPress={() => router.push('/auth/register?type=employer')}>
              <Text style={styles.signUpLink}>Sign up as Employer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    padding: 24,
    paddingTop: Platform.OS === 'web' ? 24 : 60,
  },
  header: {
    alignItems: 'center',
    marginTop: Platform.OS === 'web' ? 48 : 60,
    marginBottom: 32,
  },
  logoCenterWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  logoCenter: {
    width: 80,
    height: 80,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '500',
  },
  optionsContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  optionCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  cardGradient: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  arrowBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontWeight: '500',
  },
  signUpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  signUpLink: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
