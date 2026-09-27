// ATS Checker - RecommendationCard Component
// Displays a single recommendation with priority and type indicators

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Recommendation, RecommendationType } from '../types';
import {
  Colors,
  FontSizes,
  FontWeights,
  BorderRadius,
  Spacing,
  getPriorityColor,
} from '../theme';

interface RecommendationCardProps {
  recommendation: Recommendation;
}

const TYPE_ICONS: Record<RecommendationType, keyof typeof Ionicons.glyphMap> = {
  add_keyword: 'add-circle-outline',
  improve_formatting: 'document-text-outline',
  add_section: 'layers-outline',
  quantify_achievement: 'bar-chart-outline',
  remove_content: 'trash-outline',
  reorder_content: 'swap-vertical-outline',
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Critical',
  important: 'Important',
  nice_to_have: 'Nice to Have',
};

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const priorityColor = getPriorityColor(recommendation.priority);
  const iconName = TYPE_ICONS[recommendation.type] ?? 'information-circle-outline';

  return (
    <View style={[styles.card, { borderLeftColor: priorityColor }]}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: priorityColor + '20' }]}>
          <Ionicons name={iconName} size={18} color={priorityColor} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={2}>
            {recommendation.title}
          </Text>
          <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '20' }]}>
            <Text style={[styles.priorityText, { color: priorityColor }]}>
              {PRIORITY_LABELS[recommendation.priority] ?? recommendation.priority}
            </Text>
          </View>
        </View>
      </View>
      <Text style={styles.description}>{recommendation.description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  priorityText: {
    fontSize: FontSizes.caption,
    fontWeight: FontWeights.semibold,
  },
  description: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
