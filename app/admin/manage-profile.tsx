import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button, Card, Switch, TextInput as PaperTextInput } from 'react-native-paper';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  user_type: string | null;
  average_rating: number | null;
  total_reviews: number | null;
  is_blocked: boolean | null;
};


// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function ManageProfileScreen() {
  const router = useRouter();
  const { profileId } = useLocalSearchParams();
  const normalizedProfileId = Array.isArray(profileId) ? profileId[0] : profileId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [manualRating, setManualRating] = useState('');

  useEffect(() => {
    if (normalizedProfileId) {
      loadProfile();
    }
  }, [normalizedProfileId]);

  const loadProfile = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, user_type, average_rating, total_reviews, is_blocked')
        .eq('id', normalizedProfileId)
        .single();

      if (error) throw error;

      setProfile(data as Profile);
      setIsBlocked(data.is_blocked || false);
      setManualRating(data.average_rating?.toFixed(2) || '');
    } catch (err: any) {
      console.error('Error loading profile:', err);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const updates: any = {
        is_blocked: isBlocked,
      };

      // Update rating if manually set
      if (manualRating.trim()) {
        const rating = parseFloat(manualRating);
        if (isNaN(rating) || rating < 0 || rating > 5) {
          Alert.alert('Error', 'Rating must be between 0 and 5');
          return;
        }
        updates.average_rating = rating;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', normalizedProfileId);

      if (error) throw error;

      Alert.alert('Success', 'Profile updated successfully', [
        {
          text: 'OK',
          onPress: () => {
            loadProfile();
          },
        },
      ]);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      Alert.alert('Error', err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading profile…</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Profile not found</Text>
        <Button mode="outlined" onPress={() => router.back()} style={{ marginTop: 16 }}>
          Back
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Button mode="text" onPress={() => router.back()} icon="arrow-back">
          Back
        </Button>
        <Text style={styles.headerTitle}>Manage Profile</Text>
        <View style={{ width: 80 }} />
      </View>

      <View style={styles.content}>
        {/* Profile Info */}
        <Card mode="elevated" style={{ marginBottom: 16 }}>
          <Card.Title title="Profile Information" titleStyle={{ fontSize: 16, fontWeight: 'bold' }} />
          <Card.Content>
            <View style={styles.row}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{profile.full_name || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>{profile.email || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>User Type:</Text>
              <Text style={styles.value}>{profile.user_type || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Current Rating:</Text>
              <Text style={styles.value}>
                {profile.average_rating != null ? profile.average_rating.toFixed(2) : 'N/A'} / 5.0
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Total Reviews:</Text>
              <Text style={styles.value}>{profile.total_reviews || 0}</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Block Status */}
        <Card mode="elevated" style={{ marginBottom: 16 }}>
          <Card.Title title="Block Status" titleStyle={{ fontSize: 16, fontWeight: 'bold' }} />
          <Card.Content>
            <View style={styles.switchRow}>
              <View style={styles.switchLabelContainer}>
                <Text style={styles.switchLabel}>Profile Blocked</Text>
                <Text style={styles.switchHelper}>
                  Blocked profiles cannot see shifts or be invited by employers
                </Text>
              </View>
              <Switch
                value={isBlocked}
                onValueChange={setIsBlocked}
                trackColor={{ false: '#E5E7EB', true: '#7C3AED' }}
                thumbColor={isBlocked ? '#6D28D9' : '#F9FAFB'}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Manual Rating */}
        <Card mode="elevated" style={{ marginBottom: 16 }}>
          <Card.Title title="Manual Rating Override" titleStyle={{ fontSize: 16, fontWeight: 'bold' }} />
          <Card.Content>
            <Text style={styles.helperText}>
              Manually set the average rating (0.0 - 5.0). This will override the calculated rating.
            </Text>
            <PaperTextInput
              label="Average Rating"
              value={manualRating}
              onChangeText={setManualRating}
              mode="outlined"
              keyboardType="decimal-pad"
              style={{ marginTop: 8 }}
              placeholder="e.g. 4.5"
            />
            <Text style={styles.helperTextSmall}>
              Current calculated rating: {profile.average_rating?.toFixed(2) || 'N/A'}
            </Text>
          </Card.Content>
        </Card>

        {/* Save Button */}
        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          icon="content-save"
          style={{ marginVertical: 16 }}
          contentStyle={{ paddingVertical: 8 }}
        >
          Save Changes
        </Button>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({

  logoBox: { position: 'absolute', top: Platform.OS === 'web' ? 16 : 52, left: 16, zIndex: 1000, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, padding: 8, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  logo: { width: 32, height: 32 },

  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    color: '#7C3AED',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  content: {
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  value: {
    fontSize: 14,
    color: '#111827',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  switchHelper: {
    fontSize: 13,
    color: '#6B7280',
  },
  helperText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  helperTextSmall: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
});
