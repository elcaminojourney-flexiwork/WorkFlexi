import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Button } from 'react-native-paper';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';
import ConstitutionalScreen, { PanelPurple, PanelBlue } from '../../components/ConstitutionalScreen';
import ReviewCard from '../../components/ReviewCard';
import { NotificationList } from '../../components/ui/NotificationList';

type EmployerProfile = {
  id: string;
  user_type: string | null;
  full_name: string | null;
  phone: string | null;
  location: string | null;
  profile_photo_url: string | null;
  kyc_verified: boolean | null;
  bank_details_verified: boolean | null;
  average_rating: number | null;
  total_reviews: number | null;
  company_name: string | null;
  company_registration: string | null;
  company_address: string | null;
  industry: string | null;
  contact_person: string | null;
  contact_role: string | null;
  contact_phone: string | null;
  billing_email: string | null;
  email: string | null;
  onboarding_completed: boolean | null;
  profile_status: string | null;
};


// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function EmployerProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(0);
  const [hasMoreReviews, setHasMoreReviews] = useState(true);
  const REVIEWS_PER_PAGE = 10;

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert('Error', 'Please login again.');
        router.replace('/auth/select-user-type');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .eq('user_type', 'employer')
        .single();

      if (error) throw error;

      setProfile(data as EmployerProfile);
      
      // Load reviews
      loadReviews(0);
    } catch (err) {
      console.log('Error loading employer profile:', err);
      Alert.alert('Error', 'Unable to load your profile.');
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async (page: number) => {
    try {
      setReviewsLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Load reviews with pagination
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('id, overall_rating, review_text, tags, would_recommend, created_at, reviewer_id, shift_id')
        .eq('reviewee_id', user.id)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .range(page * REVIEWS_PER_PAGE, (page + 1) * REVIEWS_PER_PAGE - 1);

      if (reviewsError) {
        console.error('Error loading reviews:', reviewsError);
        return;
      }

      // Load reviewer profiles and shift details for each review
      const reviewsWithDetails = await Promise.all(
        (reviewsData || []).map(async (review: any) => {
          // Load reviewer profile
          const { data: reviewerData } = await supabase
            .from('profiles')
            .select('full_name, company_name')
            .eq('id', review.reviewer_id)
            .single();

          // Load shift details
          const { data: shiftData } = await supabase
            .from('shifts')
            .select('job_title, shift_date')
            .eq('id', review.shift_id)
            .single();

          return {
            ...review,
            reviewer: reviewerData || null,
            shift: shiftData || null,
          };
        })
      );

      if (page === 0) {
        setReviews(reviewsWithDetails);
      } else {
        setReviews((prev) => [...prev, ...reviewsWithDetails]);
      }

      setHasMoreReviews(reviewsWithDetails.length === REVIEWS_PER_PAGE);
    } catch (err) {
      console.error('Error loading reviews:', err);
    } finally {
      setReviewsLoading(false);
    }
  };

  const loadMoreReviews = () => {
    if (!reviewsLoading && hasMoreReviews) {
      const nextPage = reviewsPage + 1;
      setReviewsPage(nextPage);
      loadReviews(nextPage);
    }
  };

  const formatVerification = (value: boolean | null) => {
    if (value === true) return 'Verified';
    if (value === false) return 'Not verified';
    return 'Not set';
  };

  const formatProfileStatus = (status: string | null) => {
    if (!status) return 'Not set';
    return status.replace('_', ' ');
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
        <Text style={styles.emptyText}>No employer profile found.</Text>
        <Button
          mode="contained"
          onPress={() => router.replace('/employer')}
          style={{ marginVertical: 8 }}
        >
          Back to dashboard
        </Button>
      </View>
    );
  }

  return (
    <ConstitutionalScreen title="Employer profile" showBack onBack={() => router.replace('/employer')} showLogo theme="light">
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Logo */}
        {profile.profile_photo_url && (
          <PanelBlue style={{ marginBottom: 12, alignItems: 'center', paddingVertical: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>Logo</Text>
            <Image
              source={{ uri: profile.profile_photo_url }}
              style={styles.profilePhoto}
            />
          </PanelBlue>
        )}

        {/* Company card */}
        <PanelPurple style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>Company</Text>
          <View>
            <View style={styles.row}>
              <Text style={styles.label}>Company name</Text>
              <Text style={styles.value}>
                {profile.company_name || 'Not set'}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Registration</Text>
              <Text style={styles.value}>
                {profile.company_registration || 'Not set'}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Address</Text>
              <Text style={styles.value}>
                {profile.company_address || 'Not set'}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Industry</Text>
              <Text style={styles.value}>{profile.industry || 'Not set'}</Text>
            </View>
          </View>
        </PanelPurple>

        {/* Contact card */}
        <PanelBlue style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>Contact details</Text>
          <View>
          <View style={styles.row}>
            <Text style={styles.label}>Contact person</Text>
            <Text style={styles.value}>
              {profile.contact_person || profile.full_name || 'Not set'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Role</Text>
            <Text style={styles.value}>
              {profile.contact_role || 'Not set'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Phone</Text>
            <Text style={styles.value}>
              {profile.contact_phone || profile.phone || 'Not set'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Login email</Text>
            <Text style={styles.value}>{profile.email || 'Not set'} </Text>
          </View>

            <View style={styles.row}>
              <Text style={styles.label}>Billing email</Text>
              <Text style={styles.value}>
                {profile.billing_email || profile.email || 'Not set'}
              </Text>
            </View>
          </View>
        </PanelBlue>

        {/* Status + trust */}
        <PanelPurple style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>Account status</Text>
          <View style={styles.row}>
              <Text style={styles.label}>Profile status</Text>
              <Text style={styles.value}>
                {formatProfileStatus(profile.profile_status)}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>KYC</Text>
              <Text
                style={[
                  styles.value,
                  profile.kyc_verified && { color: '#3B82F6' },
                ]}
              >
                {formatVerification(profile.kyc_verified)}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Bank details</Text>
              <Text
                style={[
                  styles.value,
                  profile.bank_details_verified && { color: '#3B82F6' },
                ]}
              >
                {formatVerification(profile.bank_details_verified)}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Rating</Text>
              <Text style={styles.value}>
                {profile.average_rating != null
                  ? `${profile.average_rating.toFixed(1)} ★ (${profile.total_reviews || 0} reviews)`
                  : 'No reviews yet'}
              </Text>
            </View>
        </PanelPurple>

        {/* Reviews */}
        <PanelBlue style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>Reviews ({profile.total_reviews || 0})</Text>
          <View>
          {reviews.length === 0 && !reviewsLoading ? (
            <Text style={styles.emptySubText}>No reviews yet</Text>
          ) : (
            <>
              {reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  reviewerType="worker"
                />
              ))}
              {hasMoreReviews && (
                <Button
                  mode="text"
                  onPress={loadMoreReviews}
                  loading={reviewsLoading}
                  disabled={reviewsLoading}
                  style={{ marginTop: 8 }}
                >
                  Load More Reviews
                </Button>
              )}
            </>
          )}
          </View>
        </PanelBlue>

        {/* Notifications */}
        <PanelPurple style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>Notifications</Text>
          <View style={{ paddingVertical: 8 }}>
            <NotificationList userId={profile.id} limit={10} />
          </View>
        </PanelPurple>

        {/* Settings */}
        <PanelBlue style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>Settings</Text>
          <View>
            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => router.push('/employer/settings')}
            >
              <Ionicons name="settings-outline" size={20} color="#6D28D9" />
              <Text style={styles.settingsItemText}>Settings</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </PanelBlue>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <Button
            mode="contained"
            onPress={() => router.push('/employer/edit-profile')}
            icon="pencil"
            style={{ marginVertical: 8 }}
            contentStyle={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
          >
            Edit profile
          </Button>
        </View>

        <View style={styles.buttonRow}>
          <Button
            mode="outlined"
            onPress={() => router.push('/employer/notifications')}
            icon="bell-outline"
            style={{ marginVertical: 8 }}
            textColor="#8B5CF6"
            contentStyle={{ paddingVertical: 8 }}
          >
            Notification settings
          </Button>

        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ConstitutionalScreen>
  );
}

const styles = StyleSheet.create({

  logoBox: { position: 'absolute', top: Platform.OS === 'web' ? 16 : 52, left: 16, zIndex: 1000, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, padding: 8, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  logo: { width: 32, height: 32 },

  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#6B7280',
    fontSize: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
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
  headerBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
    textAlign: 'right',
  },
  buttonRow: {
    marginTop: 8,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(255,255,255,0.95)',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  settingsItemText: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    marginLeft: 12,
  },
  loadMoreButton: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#8B5CF6',
  },
});
