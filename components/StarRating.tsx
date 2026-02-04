import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type StarRatingProps = {
  rating: number; // 0-5 (0 = no rating selected)
  onRatingChange: (rating: number) => void;
  size?: number;
  color?: string;
  emptyColor?: string;
  showLabel?: boolean;
  label?: string;
  required?: boolean;
  disabled?: boolean;
};

export default function StarRating({
  rating,
  onRatingChange,
  size = 32,
  color = '#FBBF24', // Gold color for stars
  emptyColor = '#D1D5DB', // Gray for empty stars
  showLabel = true,
  label,
  required = false,
  disabled = false,
}: StarRatingProps) {
  const handleStarPress = (selectedRating: number) => {
    if (disabled) return;
    // Toggle: if clicking the same star, set to 0 (unrated)
    if (rating === selectedRating) {
      onRatingChange(0);
    } else {
      onRatingChange(selectedRating);
    }
  };

  return (
    <View style={styles.container}>
      {showLabel && label && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{label}</Text>
          {required && <Text style={styles.required}> *</Text>}
        </View>
      )}
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((starValue) => (
          <TouchableOpacity
            key={starValue}
            onPress={() => handleStarPress(starValue)}
            disabled={disabled}
            activeOpacity={0.7}
            style={styles.starButton}
          >
            <Ionicons
              name={starValue <= rating ? 'star' : 'star-outline'}
              size={size}
              color={starValue <= rating ? color : emptyColor}
            />
          </TouchableOpacity>
        ))}
      </View>
      {rating > 0 && (
        <Text style={styles.ratingText}>
          {rating === 1 ? 'Poor' : rating === 2 ? 'Fair' : rating === 3 ? 'Good' : rating === 4 ? 'Very Good' : 'Excellent'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  labelContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  required: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7C3AED',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    marginTop: 4,
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
});

