// ATS Checker - KeywordBadge Component
// Displays a keyword with category color and importance indicator

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Keyword } from '../types';
import {
  Colors,
  FontSizes,
  FontWeights,
  BorderRadius,
  Spacing,
  getCategoryColor,
} from '../theme';

interface KeywordBadgeProps {
  keyword: Keyword;
  compact?: boolean;
}

export function KeywordBadge({ keyword, compact = false }: KeywordBadgeProps) {
  const categoryColor = getCategoryColor(keyword.category);

  return (
    <View
      style={[
        styles.badge,
        compact && styles.badgeCompact,
        { borderColor: categoryColor + '40' },
        keyword.found ? styles.found : styles.missing,
      ]}
    >
      <Ionicons
        name={keyword.found ? 'checkmark-circle' : 'close-circle'}
        size={compact ? 12 : 14}
        color={keyword.found ? Colors.success : Colors.error}
        style={styles.icon}
      />
      <Text
        style={[
          styles.text,
          compact && styles.textCompact,
          { color: keyword.found ? Colors.textPrimary : Colors.textSecondary },
        ]}
        numberOfLines={1}
      >
        {keyword.term}
      </Text>
      {!compact && keyword.importance === 'high' && (
        <View style={[styles.importanceDot, { backgroundColor: Colors.accentTertiary }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  badgeCompact: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  found: {
    backgroundColor: Colors.success + '10',
  },
  missing: {
    backgroundColor: Colors.error + '10',
  },
  icon: {
    marginRight: Spacing.xs,
  },
  text: {
    fontSize: FontSizes.small,
    fontWeight: FontWeights.medium,
  },
  textCompact: {
    fontSize: FontSizes.caption,
  },
  importanceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: Spacing.xs,
  },
});
