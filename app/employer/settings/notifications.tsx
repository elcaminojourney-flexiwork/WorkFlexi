import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
ImageBackground, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Card, Switch, List } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase';

type NotificationPreferences = {
  id: string;
  user_id: string;
  email_application: boolean;
  email_shift: boolean;
  email_timesheet: boolean;
  email_payment: boolean;
  email_dispute: boolean;
  inapp_application: boolean;
  inapp_shift: boolean;
  inapp_timesheet: boolean;
  inapp_payment: boolean;
  inapp_dispute: boolean;
};


// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function EmployerNotificationSettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert('Error', 'Please login again');
        router.replace('/auth/login');
        return;
      }

      // Get or create preferences
      const { data, error } = await supabase.rpc('get_or_create_notification_preferences', {
        p_user_id: user.id,
      });

      if (error) {
        // If function doesn't exist, create default preferences manually
        const { data: existing } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (existing) {
          setPreferences(existing as NotificationPreferences);
        } else {
          // Create default preferences
          const { data: newPrefs } = await supabase
            .from('notification_preferences')
            .insert({
              user_id: user.id,
            })
            .select()
            .single();

          if (newPrefs) {
            setPreferences(newPrefs as NotificationPreferences);
          }
        }
      } else {
        setPreferences(data as NotificationPreferences);
      }
    } catch (err) {
      console.error('Error loading preferences:', err);
      Alert.alert('Error', 'Unable to load notification preferences.');
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!preferences) return;

    try {
      setSaving(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const updated = { ...preferences, [key]: value };
      setPreferences(updated as NotificationPreferences);

      const { error } = await supabase
        .from('notification_preferences')
        .update({ [key]: value, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating preference:', err);
      Alert.alert('Error', 'Unable to update preference. Please try again.');
      // Revert on error
      loadPreferences();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6D28D9" />
      </View>
    );
  }

  if (!preferences) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Unable to load preferences</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => router.replace('/employer/settings')}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Email Notifications Section */}
        <Card mode="elevated" style={styles.section}>
          <Card.Title
            title="Email Notifications"
            titleStyle={styles.sectionTitle}
            left={(props) => <Ionicons name="mail-outline" size={24} color="#6D28D9" />}
          />
          <Card.Content>
            <List.Item
              title="New Applications"
              description="Get notified when workers apply to your shifts"
              right={() => (
                <Switch
                  value={preferences.email_application}
                  onValueChange={(value) => updatePreference('email_application', value)}
                  disabled={saving}
                />
              )}
            />
            <List.Item
              title="Shift Reminders"
              description="Get notified about shift updates and reminders"
              right={() => (
                <Switch
                  value={preferences.email_shift}
                  onValueChange={(value) => updatePreference('email_shift', value)}
                  disabled={saving}
                />
              )}
            />
            <List.Item
              title="Timesheet Updates"
              description="Get notified when workers clock in/out"
              right={() => (
                <Switch
                  value={preferences.email_timesheet}
                  onValueChange={(value) => updatePreference('email_timesheet', value)}
                  disabled={saving}
                />
              )}
            />
            <List.Item
              title="Payment Updates"
              description="Get notified about payment status changes"
              right={() => (
                <Switch
                  value={preferences.email_payment}
                  onValueChange={(value) => updatePreference('email_payment', value)}
                  disabled={saving}
                />
              )}
            />
            <List.Item
              title="Dispute Updates"
              description="Get notified about dispute status changes"
              right={() => (
                <Switch
                  value={preferences.email_dispute}
                  onValueChange={(value) => updatePreference('email_dispute', value)}
                  disabled={saving}
                />
              )}
            />
          </Card.Content>
        </Card>

        {/* In-App Notifications Section */}
        <Card mode="elevated" style={styles.section}>
          <Card.Title
            title="In-App Notifications"
            titleStyle={styles.sectionTitle}
            left={(props) => <Ionicons name="notifications-outline" size={24} color="#6D28D9" />}
          />
          <Card.Content>
            <List.Item
              title="New Applications"
              description="Show notifications in the app"
              right={() => (
                <Switch
                  value={preferences.inapp_application}
                  onValueChange={(value) => updatePreference('inapp_application', value)}
                  disabled={saving}
                />
              )}
            />
            <List.Item
              title="Shift Reminders"
              description="Show notifications in the app"
              right={() => (
                <Switch
                  value={preferences.inapp_shift}
                  onValueChange={(value) => updatePreference('inapp_shift', value)}
                  disabled={saving}
                />
              )}
            />
            <List.Item
              title="Timesheet Updates"
              description="Show notifications in the app"
              right={() => (
                <Switch
                  value={preferences.inapp_timesheet}
                  onValueChange={(value) => updatePreference('inapp_timesheet', value)}
                  disabled={saving}
                />
              )}
            />
            <List.Item
              title="Payment Updates"
              description="Show notifications in the app"
              right={() => (
                <Switch
                  value={preferences.inapp_payment}
                  onValueChange={(value) => updatePreference('inapp_payment', value)}
                  disabled={saving}
                />
              )}
            />
            <List.Item
              title="Dispute Updates"
              description="Show notifications in the app"
              right={() => (
                <Switch
                  value={preferences.inapp_dispute}
                  onValueChange={(value) => updatePreference('inapp_dispute', value)}
                  disabled={saving}
                />
              )}
            />
          </Card.Content>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({

  logoBox: { position: 'absolute', top: Platform.OS === 'web' ? 16 : 52, left: 16, zIndex: 1000, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, padding: 8, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  logo: { width: 32, height: 32 },

  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerBackButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#7C3AED',
    fontSize: 16,
  },
  section: {
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
});
