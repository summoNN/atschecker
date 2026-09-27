// ATS Checker - GlassCard Component
// Glassmorphism-style card with subtle transparency and border

import React from 'react';
import {
  View,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '../theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  noPadding?: boolean;
}

export function GlassCard({
  children,
  style,
  elevated = false,
  noPadding = false,
}: GlassCardProps) {
  return (
    <View
      style={[
        styles.card,
        elevated && styles.elevated,
        noPadding && styles.noPadding,
        elevated ? Shadows.medium : Shadows.small,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  elevated: {
    backgroundColor: Colors.surfaceHighlight,
  },
  noPadding: {
    padding: 0,
  },
});
