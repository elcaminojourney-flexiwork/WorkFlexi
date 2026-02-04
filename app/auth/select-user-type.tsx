import { View, Text, TouchableOpacity, StyleSheet, Image, ImageBackground, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SelectUserTypePage() {
  const router = useRouter();

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
        {/* Logo */}
        <View style={styles.logoWrapper}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="people" size={48} color="#8B5CF6" />
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

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            New to FlexiWork? You'll be able to sign up after selecting your type.
          </Text>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  logoBox: { position: 'absolute', top: Platform.OS === 'web' ? 16 : 52, left: 16, zIndex: 1000, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, padding: 8, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
  logo: { width: 32, height: 32 },

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
  logoWrapper: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 16 : 52,
    left: 16,
    zIndex: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logo: {
    width: 40,
    height: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 80,
    marginBottom: 40,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
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
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontWeight: '500',
  },
});
