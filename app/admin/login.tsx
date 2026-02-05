import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Button, TextInput } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

const ADMIN_PASSWORD = '1984.09.13';


// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function AdminLoginScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    if (password.trim() === ADMIN_PASSWORD) {
      // Navigate to profile selector
      router.push('/admin/profile-selector');
    } else {
      Alert.alert('Error', 'Incorrect password');
      setPassword('');
    }
  };

  return (
    <ImageBackground source={require('../../assets/images/background.webp')} style={styles.bg} resizeMode="cover">
      <LinearGradient colors={['#8B5CF6', '#3B82F6', '#9333EA']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="lock-closed" size={64} color="#8B5CF6" />
        </View>
        <Text style={styles.title}>Admin Login</Text>
        <Text style={styles.subtitle}>Enter password to access admin panel</Text>

        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          mode="outlined"
          secureTextEntry
          style={{ marginTop: 24, marginBottom: 16 }}
          onSubmitEditing={handleLogin}
          autoFocus={Platform.OS === 'web'}
        />

        <Button
          mode="contained"
          onPress={handleLogin}
          loading={loading}
          disabled={loading || !password.trim()}
          icon="lock-open"
          style={{ marginTop: 8 }}
          contentStyle={{ paddingVertical: 8 }}
        >
          Login
        </Button>

        <Button
          mode="text"
          onPress={() => router.back()}
          style={{ marginTop: 16 }}
        >
          Cancel
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  logoBox: { position: 'absolute', top: Platform.OS === 'web' ? 16 : 52, left: 16, zIndex: 1000, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, padding: 8, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  logo: { width: 32, height: 32 },

  container: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
});
