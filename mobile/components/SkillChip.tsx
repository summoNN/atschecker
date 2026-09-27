// ATS Checker - SkillChip Component
// Displays a detected skill with category color and proficiency level

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Skill } from '../types';
import {
  Colors,
  FontSizes,
  FontWeights,
  BorderRadius,
  Spacing,
  getCategoryColor,
} from '../theme';

interface SkillChipProps {
  skill: Skill;
}

const PROFICIENCY_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Mid',
  advanced: 'Advanced',
  expert: 'Expert',
};

export function SkillChip({ skill }: SkillChipProps) {
  const categoryColor = getCategoryColor(skill.category);

  return (
    <View style={[styles.chip, { borderColor: categoryColor + '50' }]}>
      <View style={[styles.dot, { backgroundColor: categoryColor }]} />
      <Text style={styles.name}>{skill.name}</Text>
      {skill.proficiencyLevel && (
        <Text style={[styles.level, { color: categoryColor }]}>
          {PROFICIENCY_LABELS[skill.proficiencyLevel] ?? skill.proficiencyLevel}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    backgroundColor: Colors.surfaceElevated,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  name: {
    fontSize: FontSizes.small,
    fontWeight: FontWeights.medium,
    color: Colors.textPrimary,
  },
  level: {
    fontSize: FontSizes.caption,
    fontWeight: FontWeights.semibold,
    marginLeft: Spacing.sm,
  },
});
