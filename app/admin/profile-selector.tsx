import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Button, Card, TextInput as PaperTextInput } from 'react-native-paper';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  user_type: string | null;
  average_rating: number | null;
  is_blocked: boolean | null;
};


// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function ProfileSelectorScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter a profile ID or email');
      return;
    }

    try {
      setLoading(true);

      const query = searchQuery.trim();
      
      // Try to search by ID first (UUID format)
      let queryBuilder = supabase
        .from('profiles')
        .select('id, full_name, email, user_type, average_rating, is_blocked');

      // Check if it looks like a UUID (36 chars with dashes)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query);
      
      if (isUUID) {
        // Search by ID (exact match)
        queryBuilder = queryBuilder.eq('id', query);
      } else {
        // Search by email (case-insensitive partial match)
        queryBuilder = queryBuilder.ilike('email', `%${query}%`);
      }

      const { data, error } = await queryBuilder.limit(20);

      if (error) {
        console.error('Search error:', error);
        throw error;
      }

      const results = (data || []) as Profile[];
      setProfiles(results);

      if (results.length === 0) {
        Alert.alert('No Results', 'No profiles found matching your search');
      }
    } catch (err: any) {
      console.error('Error searching profiles:', err);
      Alert.alert('Error', err.message || 'Failed to search profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSelect = (profileId: string) => {
    router.push(`/admin/manage-profile?profileId=${profileId}`);
  };

  return (
    <ImageBackground source={require('../../assets/images/background.webp')} style={styles.bg} resizeMode="cover">
      <LinearGradient colors={['#8B5CF6', '#3B82F6', '#9333EA']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Button mode="text" onPress={() => router.back()} icon="arrow-back">
          Back
        </Button>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card mode="elevated" style={{ marginBottom: 16 }}>
          <Card.Title title="Profile Selector" titleStyle={{ fontSize: 16, fontWeight: 'bold' }} />
          <Card.Content>
            <PaperTextInput
              label="Search by Profile ID or Email"
              value={searchQuery}
              onChangeText={setSearchQuery}
              mode="outlined"
              style={{ marginBottom: 12 }}
              placeholder="Enter profile ID or email"
            />
            <Button
              mode="contained"
              onPress={handleSearch}
              loading={loading}
              disabled={loading}
              icon="magnify"
            >
              Search
            </Button>
          </Card.Content>
        </Card>

        {/* Results */}
        {profiles.length > 0 && (
          <Card mode="elevated">
            <Card.Title title="Results" titleStyle={{ fontSize: 16, fontWeight: 'bold' }} />
            <Card.Content>
              {profiles.map((profile) => (
                <TouchableOpacity
                  key={profile.id}
                  style={styles.profileItem}
                  onPress={() => handleProfileSelect(profile.id)}
                >
                  <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>
                      {profile.full_name || 'Unnamed'}
                    </Text>
                    <Text style={styles.profileEmail}>{profile.email || 'No email'}</Text>
                    <Text style={styles.profileMeta}>
                      {profile.user_type || 'N/A'} • Rating: {profile.average_rating?.toFixed(2) || 'N/A'}
                      {profile.is_blocked && ' • BLOCKED'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </Card.Content>
          </Card>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
    flex: 1,
    padding: 20,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  profileMeta: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
