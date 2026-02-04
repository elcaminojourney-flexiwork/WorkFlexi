import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';
import ConstitutionalScreen, { PanelPurple } from '../../components/ConstitutionalScreen';

const COLORS = { purple600: '#9333EA', blue600: '#2563EB', gray400: '#9CA3AF', white: '#FFFFFF' };

export default function WorkerSettingsPage() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        setLoggingOut(true);
        await supabase.auth.signOut();
        router.replace('/auth/select-user-type');
      }},
    ]);
  };

  const menuItems = [
    { icon: 'person-outline', label: 'Edit Profile', route: '/worker/edit-profile', color: COLORS.purple600 },
    { icon: 'notifications-outline', label: 'Notifications', route: null, color: COLORS.blue600 },
    { icon: 'card-outline', label: 'Bank Details', route: null, color: COLORS.purple600 },
    { icon: 'shield-checkmark-outline', label: 'KYC Verification', route: '/worker/kyc-upgrade', color: COLORS.blue600 },
    { icon: 'help-circle-outline', label: 'Help & Support', route: null, color: COLORS.purple600 },
    { icon: 'document-text-outline', label: 'Terms & Privacy', route: null, color: COLORS.blue600 },
  ];

  return (
    <ConstitutionalScreen title="Settings" showBack onBack={() => router.back()} showLogo showFooter>
      <CardWhite style={styles.menuCard}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.menuItem, index < menuItems.length - 1 && styles.menuItemBorder]}
            onPress={() => item.route && router.push(item.route as any)}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
              <Ionicons name={item.icon as any} size={22} color={item.color} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray400} />
          </TouchableOpacity>
        ))}
      </PanelPurple>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} disabled={loggingOut}>
        <LinearGradient colors={['#7C3AED', '#2563EB']} style={styles.logoutGradient}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.white} />
          <Text style={styles.logoutText}>{loggingOut ? 'Logging out...' : 'Logout'}</Text>
        </LinearGradient>
      </TouchableOpacity>

      <View style={{ height: 80 }} />
    </ConstitutionalScreen>
  );
}

const styles = StyleSheet.create({
  menuCard: { marginBottom: 0, padding: 0, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  menuIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: '#111827' },
  logoutBtn: { marginTop: 24, borderRadius: 16, overflow: 'hidden', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  logoutGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
