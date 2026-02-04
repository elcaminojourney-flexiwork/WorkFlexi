import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ReviewCardProps = {
  review: {
    id: string;
    overall_rating: number;
    review_text: string | null;
    tags: string[] | null;
    would_recommend: boolean | null;
    created_at: string;
    reviewer: {
      full_name: string | null;
      company_name: string | null;
    } | null;
    shift: {
      job_title: string | null;
      shift_date: string | null;
    } | null;
  };
  reviewerType: 'employer' | 'worker';
};

export default function ReviewCard({ review, reviewerType }: ReviewCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-SG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const reviewerName =
    reviewerType === 'employer'
      ? review.reviewer?.company_name || review.reviewer?.full_name || 'Employer'
      : review.reviewer?.full_name || 'Worker';

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={16}
            color={star <= rating ? '#FBBF24' : '#D1D5DB'}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.card}>
      {/* Header: Rating and Reviewer */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {renderStars(review.overall_rating)}
          {review.would_recommend && (
            <View style={styles.recommendBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#3B82F6" />
              <Text style={styles.recommendText}>
                {reviewerType === 'employer' ? 'Would hire again' : 'Would work again'}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.date}>{formatDate(review.created_at)}</Text>
      </View>

      {/* Reviewer Name and Shift */}
      <View style={styles.metaRow}>
        <Text style={styles.reviewerName}>{reviewerName}</Text>
        {review.shift?.job_title && (
          <Text style={styles.shiftInfo}>
            • {review.shift.job_title}
            {review.shift.shift_date && ` • ${formatDate(review.shift.shift_date)}`}
          </Text>
        )}
      </View>

      {/* Tags */}
      {review.tags && review.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {review.tags.map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag.replace(/_/g, ' ')}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Review Text */}
      {review.review_text && (
        <Text style={styles.reviewText}>{review.review_text}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 6,
  },
  recommendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  recommendText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  date: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  metaRow: {
    marginBottom: 8,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  shiftInfo: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    color: '#374151',
    textTransform: 'capitalize',
  },
  reviewText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginTop: 4,
  },
});

