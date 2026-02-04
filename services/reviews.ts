/**
 * Review Service
 * Handles creation of reviews and updating profile statistics
 */

import { supabase } from '../supabase';

export type ReviewInput = {
  shift_id: string;
  timesheet_id?: string;
  reviewer_id: string;
  reviewee_id: string;
  reviewer_type: 'employer' | 'worker';
  
  // Required
  overall_rating: number;
  
  // Optional employer ratings (when reviewing worker)
  punctuality_rating?: number;
  quality_rating?: number;
  reliability_rating?: number;
  communication_rating?: number;
  
  // Optional worker ratings (when reviewing employer)
  work_environment_rating?: number;
  payment_fairness_rating?: number;
  management_rating?: number;
  
  // Optional
  review_text?: string;
  tags?: string[];
  would_recommend?: boolean;
};

/**
 * Create a review and update profile statistics
 */
export async function createReview(input: ReviewInput): Promise<{ id: string }> {
  try {
    // Validate required fields
    if (!input.shift_id || !input.reviewer_id || !input.reviewee_id) {
      throw new Error('Missing required fields: shift_id, reviewer_id, reviewee_id');
    }

    if (!input.overall_rating || input.overall_rating < 1 || input.overall_rating > 5) {
      throw new Error('Overall rating must be between 1 and 5');
    }

    if (input.reviewer_id === input.reviewee_id) {
      throw new Error('Reviewer and reviewee cannot be the same person');
    }

    // Validate review text length
    if (input.review_text && input.review_text.length > 500) {
      throw new Error('Review text must be 500 characters or less');
    }

    // Check if review already exists for this shift and reviewer
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('shift_id', input.shift_id)
      .eq('reviewer_id', input.reviewer_id)
      .single();

    if (existingReview) {
      throw new Error('You have already reviewed this shift');
    }

    // Check if shift is completed (reviews only allowed for completed shifts)
    const { data: shiftData, error: shiftError } = await supabase
      .from('shifts')
      .select('status')
      .eq('id', input.shift_id)
      .single();

    if (shiftError || !shiftData) {
      throw new Error('Shift not found');
    }

    if (shiftData.status !== 'completed') {
      throw new Error('Reviews can only be submitted for completed shifts');
    }

    // Check if review is within 7 days of shift completion
    // (We'll get the shift's updated_at or use timesheet's paid_at)
    const { data: timesheetData } = await supabase
      .from('timesheets')
      .select('paid_at, created_at')
      .eq('shift_id', input.shift_id)
      .limit(1)
      .single();

    if (timesheetData) {
      const completionDate = timesheetData.paid_at 
        ? new Date(timesheetData.paid_at)
        : new Date(timesheetData.created_at);
      
      const daysSinceCompletion = (Date.now() - completionDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceCompletion > 7) {
        throw new Error('Review window has closed. Reviews must be submitted within 7 days of shift completion.');
      }
    }

    // Insert review
    const { data: reviewData, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        shift_id: input.shift_id,
        timesheet_id: input.timesheet_id,
        reviewer_id: input.reviewer_id,
        reviewee_id: input.reviewee_id,
        reviewer_type: input.reviewer_type,
        overall_rating: input.overall_rating,
        punctuality_rating: input.punctuality_rating,
        quality_rating: input.quality_rating,
        reliability_rating: input.reliability_rating,
        communication_rating: input.communication_rating,
        work_environment_rating: input.work_environment_rating,
        payment_fairness_rating: input.payment_fairness_rating,
        management_rating: input.management_rating,
        review_text: input.review_text || null,
        tags: input.tags || [],
        would_recommend: input.would_recommend || false,
      })
      .select('id')
      .single();

    if (reviewError) {
      console.error('Review creation error:', reviewError);
      throw new Error(`Failed to create review: ${reviewError.message}`);
    }

    // Update profile statistics for the reviewee
    await updateProfileReviewStats(input.reviewee_id);

    return { id: reviewData.id };
  } catch (error: any) {
    console.error('Error creating review:', error);
    throw error;
  }
}

/**
 * Update profile review statistics (average_rating, total_reviews, would_recommend_percentage)
 */
async function updateProfileReviewStats(profileId: string): Promise<void> {
  try {
    // Get all reviews for this profile
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('overall_rating, would_recommend')
      .eq('reviewee_id', profileId)
      .eq('is_public', true);

    if (reviewsError) {
      console.error('Error fetching reviews for stats:', reviewsError);
      return;
    }

    if (!reviews || reviews.length === 0) {
      // No reviews, set defaults
      await supabase
        .from('profiles')
        .update({
          average_rating: 0,
          total_reviews: 0,
          would_recommend_percentage: 0,
        })
        .eq('id', profileId);
      return;
    }

    // Calculate statistics
    const totalReviews = reviews.length;
    const sumRatings = reviews.reduce((sum, r) => sum + (r.overall_rating || 0), 0);
    const averageRating = totalReviews > 0 ? sumRatings / totalReviews : 0;
    
    const wouldRecommendCount = reviews.filter(r => r.would_recommend === true).length;
    const wouldRecommendPercentage = totalReviews > 0 
      ? Math.round((wouldRecommendCount / totalReviews) * 100) 
      : 0;

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        average_rating: Math.round(averageRating * 100) / 100, // Round to 2 decimal places
        total_reviews: totalReviews,
        would_recommend_percentage: wouldRecommendPercentage,
      })
      .eq('id', profileId);

    if (updateError) {
      console.error('Error updating profile stats:', updateError);
    }
  } catch (error) {
    console.error('Error updating profile review stats:', error);
  }
}

/**
 * Check if a review already exists for a shift and reviewer
 */
export async function checkReviewExists(
  shiftId: string,
  reviewerId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('id')
      .eq('shift_id', shiftId)
      .eq('reviewer_id', reviewerId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine
      console.error('Error checking review existence:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking review existence:', error);
    return false;
  }
}

/**
 * Get review for a shift and reviewer
 */
export async function getReview(
  shiftId: string,
  reviewerId: string
): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('shift_id', shiftId)
      .eq('reviewer_id', reviewerId)
      .single();

    if (error && error.code === 'PGRST116') {
      return null; // No review found
    }

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error getting review:', error);
    return null;
  }
}

