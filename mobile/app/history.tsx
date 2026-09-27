// ATS Checker - History Screen
// Shows previous analysis results with scores and dates

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import {
  Colors,
  FontSizes,
  FontWeights,
  BorderRadius,
  Spacing,
  Shadows,
  getScoreColor,
  getScoreLabel,
} from '../theme';
import { EmptyState, GradientButton } from '../components';
import {
  getHistory,
  deleteAnalysis,
  clearAllData,
} from '../services/storageService';
import type { AnalysisHistoryItem } from '../types';

export default function HistoryScreen() {
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = useCallback(async () => {
    const data = await getHistory();
    setHistory(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }, [loadHistory]);

  const handleDelete = useCallback(
    (item: AnalysisHistoryItem) => {
      Alert.alert(
        'Delete Analysis',
        `Remove analysis for "${item.jobTitle}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await deleteAnalysis(item.id);
              await loadHistory();
            },
          },
        ]
      );
    },
    [loadHistory]
  );

  const handleClearAll = useCallback(() => {
    if (history.length === 0) return;
    Alert.alert(
      'Clear All History',
      'This will permanently delete all analysis history. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            await loadHistory();
          },
        },
      ]
    );
  }, [history.length, loadHistory]);

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const renderItem = ({ item }: { item: AnalysisHistoryItem }) => {
    const scoreColor = getScoreColor(item.score);
    const scoreLabel = getScoreLabel(item.score);

    return (
      <TouchableOpacity
        style={styles.historyCard}
        activeOpacity={0.7}
        onLongPress={() => handleDelete(item)}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.scoreBadge, { borderColor: scoreColor }]}>
            <Text style={[styles.scoreValue, { color: scoreColor }]}>
              {item.score}
            </Text>
          </View>
        </View>
        <View style={styles.cardCenter}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.jobTitle}
          </Text>
          {item.company ? (
            <Text style={styles.cardCompany} numberOfLines={1}>
              {item.company}
            </Text>
          ) : null}
          <View style={styles.cardMeta}>
            <Ionicons
              name="document-text-outline"
              size={12}
              color={Colors.textMuted}
            />
            <Text style={styles.cardFileName} numberOfLines={1}>
              {item.fileName}
            </Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.scoreLabelSmall, { color: scoreColor }]}>
            {scoreLabel}
          </Text>
          <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (history.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="time-outline"
          title="No History Yet"
          description="Your past analysis results will appear here. Start by analyzing a resume against a job description."
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with clear button */}
      <View style={styles.headerRow}>
        <Text style={styles.headerCount}>
          {history.length} {history.length === 1 ? 'analysis' : 'analyses'}
        </Text>
        <GradientButton
          title="Clear All"
          variant="ghost"
          size="small"
          onPress={handleClearAll}
        />
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerCount: {
    fontSize: FontSizes.body,
    color: Colors.textSecondary,
    fontWeight: FontWeights.medium,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.huge,
  },
  separator: {
    height: Spacing.md,
  },

  // History Card
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...Shadows.small,
  },
  cardLeft: {
    marginRight: Spacing.md,
  },
  scoreBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  scoreValue: {
    fontSize: FontSizes.bodyLarge,
    fontWeight: FontWeights.extrabold,
  },
  cardCenter: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  cardTitle: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  cardCompany: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardFileName: {
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
    flex: 1,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  scoreLabelSmall: {
    fontSize: FontSizes.caption,
    fontWeight: FontWeights.bold,
    marginBottom: 4,
  },
  cardDate: {
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
  },
});
