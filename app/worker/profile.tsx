import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, ScrollView, TouchableOpacity, Platform, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../supabase';
import ReviewCard from '../../components/ReviewCard';
import { NotificationList } from '../../components/ui/NotificationList';
import ConstitutionalScreen, { PanelPurple, PanelBlue } from '../../components/ConstitutionalScreen';

type WorkerProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  user_type: string | null;
  average_rating: number | null;
  total_reviews: number | null;
  skills: string | null;
  experience_level: string | null;
  preferred_location: string | null;
  bio: string | null;
  cv_url: string | null;
  profile_photo_url: string | null;
  is_blocked: boolean | null;
  marketplace_enabled: boolean | null;
  onboarding_type: string | null;
  kyc_verified: boolean | null;
};


// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function WorkerProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
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
        Alert.alert('Error', 'Please login again');
        router.replace('/auth/select-user-type');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select(
          `
          id,
          full_name,
          email,
          phone,
          location,
          user_type,
          average_rating,
          total_reviews,
          skills,
          experience_level,
          preferred_location,
          bio,
          cv_url,
          profile_photo_url,
          is_blocked,
          marketplace_enabled,
          onboarding_type,
          kyc_verified
        `
        )
        .eq('id', user.id)
        .eq('user_type', 'worker')
        .single();

      if (error) throw error;

      setProfile(data as WorkerProfile);
      
      // Load reviews
      loadReviews(0);
    } catch (err) {
      console.log('Error loading worker profile:', err);
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

      if (reviewsError) {
        console.error('Error loading reviews:', reviewsError);
        return;
      }

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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/');
    } catch (err) {
      console.log('Logout error:', err);
      Alert.alert('Error', 'Could not log out, please try again.');
    }
  };

  if (loading) {
    return (
      <ConstitutionalScreen title="Your profile" showBack onBack={() => router.replace('/worker')} showLogo>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FFF" />
          <Text style={styles.loadingText}>Loading your profile…</Text>
        </View>
      </ConstitutionalScreen>
    );
  }

  if (!profile) {
    return (
      <ConstitutionalScreen title="Your profile" showBack onBack={() => router.replace('/worker')} showLogo>
        <Text style={styles.emptyText}>Profile not found.</Text>
        <TouchableOpacity onPress={() => router.replace('/worker')} style={styles.backButtonWrap}>
          <Text style={styles.backButtonText}>Back to dashboard</Text>
        </TouchableOpacity>
      </ConstitutionalScreen>
    );
  }

  return (
    <ConstitutionalScreen title="Your profile" showBack onBack={() => router.replace('/worker')} showLogo>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {profile.is_blocked && (
          <PanelPurple style={{ borderWidth: 2, borderColor: '#7C3AED' }}>
            <View style={styles.blockedWarning}>
              <Ionicons name="warning" size={24} color="#7C3AED" />
              <View style={styles.blockedWarningText}>
                <Text style={styles.blockedWarningTitle}>Profile Blocked</Text>
                <Text style={styles.blockedWarningMessage}>
                  Your profile has been blocked due to low rating (average: {profile.average_rating?.toFixed(1) || 'N/A'}/5.0). Please contact support.
                </Text>
              </View>
            </View>
          </PanelPurple>
        )}

        <PanelPurple style={{ alignItems: 'center', paddingVertical: 24 }}>
          {profile.profile_photo_url ? (
            <Image source={{ uri: profile.profile_photo_url }} style={styles.profilePhoto} />
          ) : (
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={32} color="#3B82F6" />
            </View>
          )}
          <Text style={styles.nameText}>{profile.full_name || 'Worker'}</Text>
          <Text style={styles.roleText}>Flexi worker</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={18} color="#FBBF24" />
            <Text style={styles.ratingText}>{profile.average_rating != null ? profile.average_rating.toFixed(1) : '–'}</Text>
            <Text style={styles.ratingCount}>({profile.total_reviews || 0} reviews)</Text>
          </View>
        </PanelPurple>

        <PanelBlue>
          <Text style={styles.cardTitle}>Contact</Text>
          <View style={styles.row}><Ionicons name="mail-outline" size={18} color="#2563EB" /><Text style={styles.rowLabel}>Email</Text><Text style={styles.rowValue}>{profile.email || 'Not set'}</Text></View>
          <View style={styles.row}><Ionicons name="call-outline" size={18} color="#2563EB" /><Text style={styles.rowLabel}>Phone</Text><Text style={styles.rowValue}>{profile.phone || 'Not set'}</Text></View>
          <View style={styles.row}><Ionicons name="location-outline" size={18} color="#2563EB" /><Text style={styles.rowLabel}>Base location</Text><Text style={styles.rowValue}>{profile.location || 'Not set'}</Text></View>
        </PanelBlue>

        <PanelPurple>
          <Text style={styles.cardTitle}>Work preferences</Text>
          <View style={styles.row}><Ionicons name="briefcase-outline" size={18} color="#7C3AED" /><Text style={styles.rowLabel}>Experience level</Text><Text style={styles.rowValue}>{profile.experience_level || 'Any / not set'}</Text></View>
          <View style={styles.row}><Ionicons name="pin-outline" size={18} color="#7C3AED" /><Text style={styles.rowLabel}>Preferred area</Text><Text style={styles.rowValue}>{profile.preferred_location || 'Any / not set'}</Text></View>
          <View style={styles.skillsBlock}>
            <Text style={styles.sectionLabel}>Skills</Text>
            {profile.skills ? <Text style={styles.skillsText}>{profile.skills}</Text> : <Text style={styles.emptySubText}>No skills added yet.</Text>}
          </View>
        </PanelPurple>

        <PanelBlue>
          <Text style={styles.cardTitle}>About you</Text>
          <Text style={styles.bioText}>{profile.bio || 'Tell employers more about yourself in your bio.'}</Text>
        </PanelBlue>

        {profile.cv_url && (
          <PanelBlue onPress={() => { if (Platform.OS === 'web') window.open(profile.cv_url!, '_blank'); else Alert.alert('CV', 'View CV in browser: ' + profile.cv_url); }}>
            <Text style={styles.cardTitle}>CV / Resume</Text>
            <View style={styles.cvButton}>
              <Ionicons name="document-text" size={20} color="#2563EB" />
              <Text style={styles.cvButtonText}>View CV / Resume</Text>
              <Ionicons name="open-outline" size={18} color="#2563EB" />
            </View>
          </PanelBlue>
        )}

        {(profile.marketplace_enabled === false && (profile.onboarding_type === 'employee' || profile.onboarding_type === null)) && (
          <PanelBlue style={{ borderWidth: 2, borderColor: '#3B82F6' }}>
            <View style={styles.upgradeCard}>
              <Ionicons name="star" size={32} color="#3B82F6" />
              <View style={styles.upgradeContent}>
                <Text style={styles.upgradeTitle}>Upgrade to Marketplace Access</Text>
                <Text style={styles.upgradeText}>Complete KYC verification to access shifts from all employers.</Text>
                <TouchableOpacity onPress={() => router.push('/worker/kyc-upgrade')} style={styles.ctaBtn}>
                  <Text style={styles.ctaBtnText}>Start KYC Verification</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          </PanelBlue>
        )}

        <PanelPurple>
          <Text style={styles.cardTitle}>Reviews ({profile.total_reviews || 0})</Text>
          {reviews.length === 0 && !reviewsLoading ? (
            <Text style={styles.emptySubText}>No reviews yet</Text>
          ) : (
            <>
              {reviews.map((review) => <ReviewCard key={review.id} review={review} reviewerType="employer" />)}
              {hasMoreReviews && (
                <Button mode="text" onPress={loadMoreReviews} loading={reviewsLoading} disabled={reviewsLoading} style={{ marginTop: 8 }}>Load More Reviews</Button>
              )}
            </>
          )}
        </PanelPurple>

        <PanelPurple>
          <Text style={styles.cardTitle}>Notifications</Text>
          <NotificationList userId={profile.id} limit={10} />
        </PanelPurple>

        <PanelBlue onPress={() => router.push('/worker/settings')}>
          <Text style={styles.cardTitle}>Settings</Text>
          <View style={styles.settingsItem}>
            <Ionicons name="notifications-outline" size={20} color="#2563EB" />
            <Text style={styles.settingsItemText}>Notification Settings</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </View>
        </PanelBlue>

        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={() => router.push('/worker/edit-profile')} style={styles.editBtn}>
            <Ionicons name="pencil-outline" size={20} color="#2563EB" />
            <Text style={styles.editBtnText}>Edit profile</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtnWrap}>
            <LinearGradient colors={['#7C3AED', '#2563EB']} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={20} color="#FFF" />
              <Text style={styles.logoutBtnText}>Logout</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ConstitutionalScreen>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 4, paddingTop: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 10, fontSize: 16, color: 'rgba(255,255,255,0.9)' },
  emptyText: { fontSize: 16, color: 'rgba(255,255,255,0.9)', marginBottom: 12 },
  backButtonWrap: { paddingVertical: 12, alignItems: 'center' },
  backButtonText: { fontSize: 16, fontWeight: '600', color: '#DBEAFE' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#3B82F6', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, marginTop: 12 },
  ctaBtnText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 2, borderColor: '#2563EB', marginRight: 8 },
  editBtnText: { fontSize: 14, fontWeight: '600', color: '#2563EB' },
  logoutBtnWrap: { flex: 1, borderRadius: 16, overflow: 'hidden', marginLeft: 8 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  logoutBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  nameText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  roleText: {
    marginTop: 4,
    fontSize: 14,
    color: '#6B7280',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
    color: '#5B21B6',
  },
  ratingCount: {
    marginLeft: 4,
    fontSize: 12,
    color: '#B45309',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rowLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  rowValue: {
    fontSize: 14,
    color: '#111827',
    textAlign: 'right',
    flex: 1,
  },
  skillsBlock: {
    marginTop: 10,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  skillsText: {
    fontSize: 14,
    color: '#374151',
  },
  emptySubText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  bioText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  secondaryButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  dangerButton: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
  },
  dangerButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadMoreButton: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  cvButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  cvButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  upgradeContent: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  upgradeText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  settingsItemText: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#3B82F6',
    marginBottom: 12,
  },
  blockedWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  blockedWarningText: {
    flex: 1,
  },
  blockedWarningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7C3AED',
    marginBottom: 4,
  },
  blockedWarningMessage: {
    fontSize: 14,
    color: '#991B1B',
    lineHeight: 20,
  },
});
