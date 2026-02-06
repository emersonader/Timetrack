import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Tag } from '../types';
import { useTags } from '../hooks/useTags';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from '../utils/constants';

interface TagPickerProps {
  selectedTagIds: number[];
  onTagsChange: (tagIds: number[]) => void;
  compact?: boolean;
}

export function TagPicker({ selectedTagIds, onTagsChange, compact = false }: TagPickerProps) {
  const { tags, isLoading } = useTags();

  const toggleTag = (tagId: number) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onTagsChange([...selectedTagIds, tagId]);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }

  if (tags.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {!compact && <Text style={styles.label}>Tags</Text>}
      <View style={styles.tagsContainer}>
        {tags.map((tag) => {
          const isSelected = selectedTagIds.includes(tag.id);
          return (
            <TouchableOpacity
              key={tag.id}
              style={[
                styles.tagPill,
                isSelected
                  ? { backgroundColor: tag.color }
                  : styles.tagPillUnselected,
              ]}
              onPress={() => toggleTag(tag.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tagText,
                  isSelected
                    ? styles.tagTextSelected
                    : { color: COLORS.gray600 },
                ]}
              >
                {tag.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  loadingContainer: {
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  tagPill: {
    height: 28,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagPillUnselected: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray300,
  },
  tagText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
  },
  tagTextSelected: {
    color: COLORS.white,
  },
});
