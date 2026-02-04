import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ImageBackground, Image, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../../../supabase';
import { Ionicons } from '@expo/vector-icons';

const COLORS = { purple100: '#F3E8FF', purple200: '#E9D5FF', purple300: '#D8B4FE', purple400: '#C084FC', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED', purple800: '#6D28D9', blue100: '#DBEAFE', blue200: '#BFDBFE', blue300: '#93C5FD', blue400: '#60A5FA', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8', white: '#FFFFFF', gray900: '#111827' };

export default function SettingsPage() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { setLoggingOut(true); await supabase.auth.signOut(); router.replace('/auth/login'); }},
    ]);
  };

  const menuItems = [
    { icon: 'person-outline', label: 'Edit Profile', route: '/employer/edit-profile', colors: [COLORS.purple500, COLORS.blue500] },
    { icon: 'notifications-outline', label: 'Notifications', route: '/employer/settings/notifications', colors: [COLORS.blue500, COLORS.purple500] },
    { icon: 'card-outline', label: 'Payment Methods', route: '/employer/settings/payment-methods', colors: [COLORS.purple600, COLORS.blue600] },
    { icon: 'business-outline', label: 'Organisation', route: '/employer/organisation', colors: [COLORS.blue600, COLORS.purple600] },
    { icon: 'help-circle-outline', label: 'Help & Support', route: null, colors: [COLORS.purple500, COLORS.blue500] },
    { icon: 'document-text-outline', label: 'Terms & Privacy', route: null, colors: [COLORS.blue500, COLORS.purple500] },
  ];

  return (
    <ImageBackground source={require('../../../assets/images/background.webp')} style={styles.container} resizeMode="cover">
      <LinearGradient colors={['rgba(139, 92, 246, 0.95)', 'rgba(59, 130, 246, 0.92)', 'rgba(147, 51, 234, 0.90)']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.logoBox}><Image source={require('../../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" /></View>

      <LinearGradient colors={[COLORS.purple700, COLORS.blue600]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color="#FFF" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 44 }} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        <LinearGradient colors={[COLORS.purple200, COLORS.blue200]} style={styles.menuCard}>
          {menuItems.map((item, i) => (
            <TouchableOpacity key={i} onPress={() => item.route && router.push(item.route as any)} style={[styles.menuItem, i < menuItems.length - 1 && styles.menuItemBorder]}>
              <LinearGradient colors={item.colors} style={styles.menuIcon}>
                <Ionicons name={item.icon as any} size={22} color="#FFF" />
              </LinearGradient>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.purple400} />
            </TouchableOpacity>
          ))}
        </LinearGradient>

        <TouchableOpacity onPress={handleLogout} disabled={loggingOut}>
          <LinearGradient colors={['#7C3AED', '#6D28D9']} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color="#FFF" />
            <Text style={styles.logoutText}>{loggingOut ? 'Logging out...' : 'Logout'}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.version}>FlexiWork v1.0.0</Text>
        <View style={{ height: 100 }} />
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  logoBox: { position: 'absolute', top: Platform.OS === 'web' ? 16 : 52, left: 16, zIndex: 1000, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, padding: 8 },
  logo: { width: 32, height: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'web' ? 70 : 100, paddingBottom: 16, paddingHorizontal: 20 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFF' },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  menuCard: { borderRadius: 24, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.purple300 },
  menuIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.gray900 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 20, marginTop: 24 },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  version: { textAlign: 'center', marginTop: 24, fontSize: 12, color: 'rgba(255,255,255,0.6)' },
});
