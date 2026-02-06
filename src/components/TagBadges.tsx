import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tag } from '../types';
import {
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
} from '../utils/constants';

interface TagBadgesProps {
  tags: Tag[];
}

export function TagBadges({ tags }: TagBadgesProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {tags.map((tag) => (
        <View
          key={tag.id}
          style={[styles.badge, { backgroundColor: tag.color + '20' }]}
        >
          <View style={[styles.dot, { backgroundColor: tag.color }]} />
          <Text style={[styles.badgeText, { color: tag.color }]}>
            {tag.name}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: SPACING.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: FONT_SIZES.xs - 1,
    fontWeight: '600',
  },
});
