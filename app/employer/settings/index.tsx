import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../../../supabase';
import { Ionicons } from '@expo/vector-icons';
import ConstitutionalScreen, { PanelPurple } from '../../../components/ConstitutionalScreen';

const COLORS = { purple300: '#D8B4FE', purple500: '#A855F7', purple600: '#9333EA', blue500: '#3B82F6', blue600: '#2563EB', gray900: '#111827' };

export default function SettingsPage() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { setLoggingOut(true); await supabase.auth.signOut(); router.replace('/auth/select-user-type'); }},
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
    <ConstitutionalScreen title="Settings" showBack onBack={() => router.back()} showLogo showFooter>
      <PanelPurple style={styles.menuCard}>
        {menuItems.map((item, i) => (
          <TouchableOpacity key={i} onPress={() => item.route && router.push(item.route as any)} style={[styles.menuItem, i < menuItems.length - 1 && styles.menuItemBorder]}>
            <View style={[styles.menuIcon, { backgroundColor: i % 2 === 0 ? '#F3E8FF' : '#DBEAFE' }]}>
              <Ionicons name={item.icon as any} size={22} color={COLORS.purple600} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        ))}
      </PanelPurple>

      <TouchableOpacity onPress={handleLogout} disabled={loggingOut} style={styles.logoutWrap}>
        <LinearGradient colors={['#7C3AED', '#2563EB']} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color="#FFF" />
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
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.gray900 },
  logoutWrap: { marginTop: 24, borderRadius: 16, overflow: 'hidden', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
