import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
ImageBackground, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, TextInput } from 'react-native-paper';
import { supabase } from '../../../supabase';
import { Ionicons } from '@expo/vector-icons';
import StarRating from '../../../components/StarRating';
import { createReview, checkReviewExists } from '../../../services/reviews';
import ConstitutionalScreen, { PanelPurple, PanelBlue } from '../../../components/ConstitutionalScreen';

type Timesheet = {
  id: string;
  shift_id: string;
  employer_id: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
};

type Shift = {
  id: string;
  job_title: string | null;
  shift_date: string | null;
  employer_id: string | null;
};

type Employer = {
  id: string;
  company_name: string | null;
  full_name: string | null;
};

// Tags for worker reviewing employer
const EMPLOYER_TAGS = [
  { id: 'great_workplace', label: 'Great workplace' },
  { id: 'fair_pay', label: 'Fair pay' },
  { id: 'clear_instructions', label: 'Clear instructions' },
  { id: 'respectful', label: 'Respectful' },
  { id: 'well_organized', label: 'Well-organized' },
  { id: 'flexible', label: 'Flexible' },
  { id: 'unclear_expectations', label: 'Unclear expectations' },
  { id: 'poor_conditions', label: 'Poor conditions' },
  { id: 'payment_issues', label: 'Payment issues' },
];


// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function ReviewEmployer() {
  const { timesheetId, from } = useLocalSearchParams<{ timesheetId: string; from?: string }>();
  const router = useRouter();
  const normalizedTimesheetId = Array.isArray(timesheetId) ? timesheetId[0] : timesheetId;
  const onBack = () => {
    if (from && typeof from === 'string') router.replace(from as any);
    else router.replace('/worker/my-shifts');
  };

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timesheet, setTimesheet] = useState<Timesheet | null>(null);
  const [shift, setShift] = useState<Shift | null>(null);
  const [employer, setEmployer] = useState<Employer | null>(null);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  // Ratings
  const [overallRating, setOverallRating] = useState(0);
  const [workEnvironmentRating, setWorkEnvironmentRating] = useState(0);
  const [paymentFairnessRating, setPaymentFairnessRating] = useState(0);
  const [managementRating, setManagementRating] = useState(0);

  // Tags
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Review text
  const [reviewText, setReviewText] = useState('');

  // Options
  const [wouldWorkAgain, setWouldWorkAgain] = useState(false);

  useEffect(() => {
    if (normalizedTimesheetId) {
      loadData();
    }
  }, [normalizedTimesheetId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load timesheet
      const { data: tsData, error: tsError } = await supabase
        .from('timesheets')
        .select('*')
        .eq('id', normalizedTimesheetId)
        .single();

      if (tsError) {
        console.error('Timesheet load error:', tsError);
        Alert.alert(
          'Error',
          `Failed to load timesheet: ${tsError.message || 'Unknown error'}`
        );
        router.back();
        return;
      }

      if (!tsData) {
        Alert.alert('Error', 'Timesheet not found');
        router.back();
        return;
      }

      const ts = tsData as Timesheet;
      setTimesheet(ts);

      // Load shift (which contains employer_id)
      if (ts.shift_id) {
        const { data: shiftData, error: shiftError } = await supabase
          .from('shifts')
          .select('id, job_title, shift_date, employer_id')
          .eq('id', ts.shift_id)
          .single();

        if (shiftError) {
          console.error('Shift load error:', shiftError);
        } else if (shiftData) {
          setShift(shiftData as Shift);
          
          // Load employer using employer_id from shift
          if (shiftData.employer_id) {
            console.log('Loading employer profile for ID:', shiftData.employer_id);
            const { data: employerData, error: employerError } = await supabase
              .from('profiles')
              .select('id, company_name, full_name, user_type')
              .eq('id', shiftData.employer_id)
              .single();

            if (employerError) {
              console.error('Employer profile load error:', employerError);
              console.error('Error code:', employerError.code);
              console.error('Error message:', employerError.message);
              console.error('Error details:', employerError.details);
              console.error('Error hint:', employerError.hint);
            } else if (employerData) {
              console.log('Employer profile loaded successfully:', employerData);
              setEmployer(employerData as Employer);
            } else {
              console.warn('No employer data returned (but no error)');
            }
          } else {
            console.error('Shift has no employer_id:', shiftData);
          }
        }
      } else {
        console.error('Timesheet has no shift_id:', ts);
      }

      // Check if already reviewed
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && ts.shift_id) {
        const reviewed = await checkReviewExists(ts.shift_id, user.id);
        setAlreadyReviewed(reviewed);
      }
    } catch (error) {
      console.error('Error loading review data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Failed to load review data: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSubmit = async () => {
    // Validation
    if (overallRating === 0) {
      Alert.alert('Required', 'Please provide an overall experience rating');
      return;
    }

    try {
      setSubmitting(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert('Error', 'Please login again');
        router.replace('/auth/select-user-type');
        return;
      }

      if (!timesheet || !shift || !employer) {
        Alert.alert('Error', 'Missing required data');
        return;
      }

      // Create review
      await createReview({
        shift_id: shift.id,
        timesheet_id: timesheet.id,
        reviewer_id: user.id,
        reviewee_id: employer.id,
        reviewer_type: 'worker',
        overall_rating: overallRating,
        work_environment_rating: workEnvironmentRating || undefined,
        payment_fairness_rating: paymentFairnessRating || undefined,
        management_rating: managementRating || undefined,
        review_text: reviewText.trim() || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        would_recommend: wouldWorkAgain,
      });

      Alert.alert('Success', 'Review submitted successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', error.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-SG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (alreadyReviewed) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => {
            if (from && typeof from === 'string') {
              router.replace(from as any);
            } else {
              router.replace('/worker/my-shifts');
            }
          }}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review Employer</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="checkmark-circle" size={64} color="#3B82F6" />
          <Text style={styles.alreadyReviewedTitle}>Already Reviewed</Text>
          <Text style={styles.alreadyReviewedText}>
            You have already submitted a review for this shift.
          </Text>
        </View>
      </View>
    );
  }

  if (!timesheet || !shift || !employer) {
    const missingData = [];
    if (!timesheet) missingData.push('timesheet');
    if (!shift) missingData.push('shift');
    if (!employer) missingData.push('employer profile');
    
    return (
      <ConstitutionalScreen title="Review Employer" showBack onBack={onBack} showLogo theme="light">
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle-outline" size={48} color="#7C3AED" />
          <Text style={styles.errorText}>Unable to load review data</Text>
          <Text style={styles.errorSubtext}>
            Missing: {missingData.join(', ')}
          </Text>
          <Text style={styles.errorSubtext}>
            Please check console for details.
          </Text>
        </View>
      </ConstitutionalScreen>
    );
  }

  const employerName = employer.company_name || employer.full_name || 'Employer';

  return (
    <ConstitutionalScreen title="Rate Employer" showBack onBack={onBack} showLogo theme="light">
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Employer Info */}
        <PanelPurple style={styles.infoCard}>
          <Text style={styles.employerName}>{employerName}</Text>
          <Text style={styles.shiftInfo}>
            {shift.job_title || 'Shift'} • {formatDate(shift.shift_date)}
          </Text>
        </PanelPurple>

        {/* Overall Experience (Required) */}
        <PanelBlue style={styles.section}>
          <StarRating
            rating={overallRating}
            onRatingChange={setOverallRating}
            label="Overall Experience"
            required
          />
        </PanelBlue>

        {/* Additional Ratings */}
        <View style={styles.section}>
          <StarRating
            rating={workEnvironmentRating}
            onRatingChange={setWorkEnvironmentRating}
            label="Work Environment"
          />
          <StarRating
            rating={paymentFairnessRating}
            onRatingChange={setPaymentFairnessRating}
            label="Payment & Fairness"
          />
          <StarRating
            rating={managementRating}
            onRatingChange={setManagementRating}
            label="Management"
          />
        </PanelPurple>

        {/* Quick Tags */}
        <PanelBlue style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Tags</Text>
          <Text style={styles.sectionSubtitle}>Select all that apply</Text>
          <View style={styles.tagsContainer}>
            {EMPLOYER_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag.id}
                style={[
                  styles.tag,
                  selectedTags.includes(tag.id) && styles.tagSelected,
                ]}
                onPress={() => handleTagToggle(tag.id)}
              >
                <Ionicons
                  name={selectedTags.includes(tag.id) ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={selectedTags.includes(tag.id) ? '#3B82F6' : '#9CA3AF'}
                />
                <Text
                  style={[
                    styles.tagText,
                    selectedTags.includes(tag.id) && styles.tagTextSelected,
                  ]}
                >
                  {tag.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Written Review */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Share your experience</Text>
          <Text style={styles.sectionSubtitle}>(optional)</Text>
          <TextInput
            label="Share your experience (optional)"
            value={reviewText}
            onChangeText={setReviewText}
            mode="outlined"
            multiline
            numberOfLines={4}
            maxLength={500}
            style={styles.textInput}
          />
          <Text style={styles.charCount}>
            {reviewText.length}/500 characters
          </Text>
        </View>

        {/* Options */}
        <PanelBlue style={styles.section}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setWouldWorkAgain(!wouldWorkAgain)}
          >
            <Ionicons
              name={wouldWorkAgain ? 'checkbox' : 'square-outline'}
              size={24}
              color={wouldWorkAgain ? '#3B82F6' : '#9CA3AF'}
            />
            <Text style={styles.checkboxLabel}>
              I would work for this employer again
            </Text>
          </TouchableOpacity>
        </PanelBlue>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Review</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ConstitutionalScreen>
  );
}

const styles = StyleSheet.create({

  logoBox: { position: 'absolute', top: Platform.OS === 'web' ? 16 : 52, left: 16, zIndex: 1000, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, padding: 8, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  logo: { width: 32, height: 32 },

  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alreadyReviewedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
  },
  alreadyReviewedText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7C3AED',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 20,
    margin: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  employerName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  shiftInfo: {
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: 'transparent',
    marginRight: 8,
    marginBottom: 8,
  },
  tagSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  tagText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#6B7280',
  },
  tagTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'right',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkboxLabel: {
    marginLeft: 12,
    fontSize: 16,
    color: '#111827',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

