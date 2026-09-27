// ATS Checker - SectionHeader Component
// Section header with optional icon and count badge

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, FontWeights, Spacing, BorderRadius } from '../theme';

interface SectionHeaderProps {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  count?: number;
  countColor?: string;
  subtitle?: string;
}

export function SectionHeader({
  title,
  icon,
  iconColor = Colors.primary,
  count,
  countColor = Colors.primary,
  subtitle,
}: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={iconColor}
            style={styles.icon}
          />
        )}
        <Text style={styles.title}>{title}</Text>
        {count !== undefined && (
          <View style={[styles.countBadge, { backgroundColor: countColor + '20' }]}>
            <Text style={[styles.countText, { color: countColor }]}>{count}</Text>
          </View>
        )}
      </View>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: FontSizes.subtitle,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginLeft: Spacing.sm,
  },
  countText: {
    fontSize: FontSizes.small,
    fontWeight: FontWeights.bold,
  },
  subtitle: {
    fontSize: FontSizes.small,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
});
