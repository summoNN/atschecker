// ATS Checker - ScoreRing Component
// Animated circular score display with gradient-inspired styling

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Colors,
  FontSizes,
  FontWeights,
  getScoreColor,
  getScoreLabel,
  getGlowShadow,
} from '../theme';

interface ScoreRingProps {
  score: number;
  size?: number;
  animated?: boolean;
}

export function ScoreRing({ score, size = 180, animated = true }: ScoreRingProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    if (!animated) {
      return;
    }

    let startTime: number | null = null;
    const duration = 1000;
    let animationFrameId: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(easedProgress * score));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [score, animated]);

  const displayScore = animated ? animatedScore : score;
  const scoreColor = getScoreColor(score);
  const scoreLabel = getScoreLabel(score);
  const innerSize = size - 16;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Outer glow ring */}
      <View
        style={[
          styles.outerRing,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: scoreColor,
          },
          getGlowShadow(scoreColor),
        ]}
      />
      {/* Inner dark circle */}
      <View
        style={[
          styles.innerCircle,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
          },
        ]}
      >
        <Text
          style={[
            styles.scoreText,
            { fontSize: size * 0.28, color: scoreColor },
          ]}
        >
          {displayScore}
        </Text>
        <Text style={[styles.labelText, { color: scoreColor }]}>
          {scoreLabel}
        </Text>
        <Text style={styles.outOfText}>out of 100</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    borderWidth: 3,
  },
  innerCircle: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontWeight: FontWeights.extrabold,
  },
  labelText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    marginTop: 2,
  },
  outOfText: {
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
