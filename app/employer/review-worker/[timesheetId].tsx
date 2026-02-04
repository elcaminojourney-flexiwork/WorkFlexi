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

type Timesheet = {
  id: string;
  shift_id: string;
  worker_id: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
};

type Shift = {
  id: string;
  job_title: string | null;
  shift_date: string | null;
};

type Worker = {
  id: string;
  full_name: string | null;
};

// Tags for employer reviewing worker
const WORKER_TAGS = [
  { id: 'professional', label: 'Professional' },
  { id: 'fast_learner', label: 'Fast learner' },
  { id: 'team_player', label: 'Team player' },
  { id: 'great_attitude', label: 'Great attitude' },
  { id: 'excellent_communication', label: 'Excellent communication' },
  { id: 'reliable', label: 'Reliable' },
  { id: 'goes_above_beyond', label: 'Goes above and beyond' },
  { id: 'needs_supervision', label: 'Needs supervision' },
  { id: 'late_arrival', label: 'Late arrival' },
  { id: 'early_departure', label: 'Early departure' },
];


// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function ReviewWorker() {
  const { timesheetId } = useLocalSearchParams();
  const router = useRouter();
  const normalizedTimesheetId = Array.isArray(timesheetId) ? timesheetId[0] : timesheetId;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timesheet, setTimesheet] = useState<Timesheet | null>(null);
  const [shift, setShift] = useState<Shift | null>(null);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  // Ratings
  const [overallRating, setOverallRating] = useState(0);
  const [punctualityRating, setPunctualityRating] = useState(0);
  const [qualityRating, setQualityRating] = useState(0);
  const [reliabilityRating, setReliabilityRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);

  // Tags
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Review text
  const [reviewText, setReviewText] = useState('');

  // Options
  const [wouldHireAgain, setWouldHireAgain] = useState(false);
  const [addToFavorites, setAddToFavorites] = useState(false);

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

      // Load shift
      if (ts.shift_id) {
        const { data: shiftData, error: shiftError } = await supabase
          .from('shifts')
          .select('id, job_title, shift_date')
          .eq('id', ts.shift_id)
          .single();

        if (shiftError) {
          console.error('Shift load error:', shiftError);
        } else if (shiftData) {
          setShift(shiftData as Shift);
        }
      }

      // Load worker
      if (ts.worker_id) {
        const { data: workerData, error: workerError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('id', ts.worker_id)
          .single();

        if (workerError) {
          console.error('Worker profile load error:', workerError);
        } else if (workerData) {
          setWorker(workerData as Worker);
        }
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
      Alert.alert('Required', 'Please provide an overall performance rating');
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

      if (!timesheet || !shift || !worker) {
        Alert.alert('Error', 'Missing required data');
        return;
      }

      // Create review
      await createReview({
        shift_id: shift.id,
        timesheet_id: timesheet.id,
        reviewer_id: user.id,
        reviewee_id: worker.id,
        reviewer_type: 'employer',
        overall_rating: overallRating,
        punctuality_rating: punctualityRating || undefined,
        quality_rating: qualityRating || undefined,
        reliability_rating: reliabilityRating || undefined,
        communication_rating: communicationRating || undefined,
        review_text: reviewText.trim() || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        would_recommend: wouldHireAgain,
      });

      // Add to favorites if selected
      if (addToFavorites) {
        const { error: favoriteError } = await supabase
          .from('favorites')
          .upsert({
            employer_id: user.id,
            worker_id: worker.id,
          });

        if (favoriteError) {
          console.error('Error adding to favorites:', favoriteError);
          // Don't fail the review if favorites fails
        }
      }

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
        <ActivityIndicator size="large" color="#8B5CF6" />
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
            router.replace('/employer/my-shifts');
          }
        }}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review Worker</Text>
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

  if (!timesheet || !shift || !worker) {
    const missingData = [];
    if (!timesheet) missingData.push('timesheet');
    if (!shift) missingData.push('shift');
    if (!worker) missingData.push('worker profile');
    
    return (
      <View style={styles.container}>
        <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (from && typeof from === 'string') {
            router.replace(from as any);
          } else {
            router.replace('/employer/my-shifts');
          }
        }}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review Worker</Text>
          <View style={{ width: 24 }} />
        </View>
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
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rate Worker</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Worker Info */}
        <View style={styles.infoCard}>
          <Text style={styles.workerName}>{worker.full_name || 'Worker'}</Text>
          <Text style={styles.shiftInfo}>
            {shift.job_title || 'Shift'} • {formatDate(shift.shift_date)}
          </Text>
        </View>

        {/* Overall Performance (Required) */}
        <View style={styles.section}>
          <StarRating
            rating={overallRating}
            onRatingChange={setOverallRating}
            label="Overall Performance"
            required
          />
        </View>

        {/* Additional Ratings */}
        <View style={styles.section}>
          <StarRating
            rating={punctualityRating}
            onRatingChange={setPunctualityRating}
            label="Punctuality"
          />
          <StarRating
            rating={qualityRating}
            onRatingChange={setQualityRating}
            label="Work Quality"
          />
          <StarRating
            rating={reliabilityRating}
            onRatingChange={setReliabilityRating}
            label="Reliability"
          />
          <StarRating
            rating={communicationRating}
            onRatingChange={setCommunicationRating}
            label="Communication"
          />
        </View>

        {/* Quick Tags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Tags</Text>
          <Text style={styles.sectionSubtitle}>Select all that apply</Text>
          <View style={styles.tagsContainer}>
            {WORKER_TAGS.map((tag) => (
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
                  color={selectedTags.includes(tag.id) ? '#8B5CF6' : '#9CA3AF'}
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
            style={styles.textInput}
            placeholder="Share your experience (optional)"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            maxLength={500}
            value={reviewText}
            onChangeText={setReviewText}
          />
          <Text style={styles.charCount}>
            {reviewText.length}/500 characters
          </Text>
        </View>

        {/* Options */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setWouldHireAgain(!wouldHireAgain)}
          >
            <Ionicons
              name={wouldHireAgain ? 'checkbox' : 'square-outline'}
              size={24}
              color={wouldHireAgain ? '#8B5CF6' : '#9CA3AF'}
            />
            <Text style={styles.checkboxLabel}>
              I would hire this worker again
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setAddToFavorites(!addToFavorites)}
          >
            <Ionicons
              name={addToFavorites ? 'checkbox' : 'square-outline'}
              size={24}
              color={addToFavorites ? '#8B5CF6' : '#9CA3AF'}
            />
            <Text style={styles.checkboxLabel}>
              Add to Favorites ⭐
            </Text>
          </TouchableOpacity>
        </View>

        {/* Submit Button */}
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting}
          style={{ marginVertical: 16 }}
          contentStyle={{ paddingVertical: 8 }}
        >
          Submit Review
        </Button>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
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
  workerName: {
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
    borderColor: '#8B5CF6',
    backgroundColor: '#FAF5FF',
  },
  tagText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#6B7280',
  },
  tagTextSelected: {
    color: '#8B5CF6',
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
    backgroundColor: '#8B5CF6',
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

