// ATS Checker - Results Screen
// Displays the full analysis results with score, keywords, skills, recommendations

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Colors,
  FontSizes,
  FontWeights,
  BorderRadius,
  Spacing,
  getScoreColor,
} from '../theme';
import {
  ScoreRing,
  GlassCard,
  SectionHeader,
  KeywordBadge,
  SkillChip,
  RecommendationCard,
  EmptyState,
  GradientButton,
} from '../components';
import { getLatestAnalysis } from './index';
import type { ATSAnalysis } from '../types';

type ResultTab = 'overview' | 'keywords' | 'skills' | 'recommendations';

export default function ResultsScreen() {
  const router = useRouter();
  const [analysis, setAnalysis] = useState<ATSAnalysis | null>(() => getLatestAnalysis());
  const [activeTab, setActiveTab] = useState<ResultTab>('overview');

  const loadAnalysis = useCallback(() => {
    const latest = getLatestAnalysis();
    setAnalysis(latest);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAnalysis();
    }, [loadAnalysis])
  );

  if (!analysis) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="analytics-outline"
          title="No Results Yet"
          description="Analyze a resume against a job description to see your ATS compatibility score and recommendations."
        >
          <GradientButton
            title="Start Analysis"
            icon="scan-outline"
            onPress={() => router.push('/')}
          />
        </EmptyState>
      </View>
    );
  }

  const scoreColor = getScoreColor(analysis.score);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={loadAnalysis}
          tintColor={Colors.primary}
        />
      }
    >
      {/* Score Header */}
      <View style={styles.scoreSection}>
        <ScoreRing score={analysis.score} />
        <Text style={styles.jobTitle}>{analysis.jobTitle}</Text>
        {analysis.company ? (
          <Text style={styles.company}>{analysis.company}</Text>
        ) : null}
        <Text style={styles.fileName}>
          <Ionicons name="document-text-outline" size={12} color={Colors.textMuted} />{' '}
          {analysis.fileName}
        </Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <GlassCard style={styles.statCard}>
          <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
          <Text style={styles.statValue}>{analysis.matchedKeywords.length}</Text>
          <Text style={styles.statLabel}>Matched</Text>
        </GlassCard>
        <GlassCard style={styles.statCard}>
          <Ionicons name="close-circle" size={22} color={Colors.error} />
          <Text style={styles.statValue}>{analysis.missingKeywords.length}</Text>
          <Text style={styles.statLabel}>Missing</Text>
        </GlassCard>
        <GlassCard style={styles.statCard}>
          <Ionicons name="code-slash" size={22} color={Colors.info} />
          <Text style={styles.statValue}>{analysis.detectedSkills.length}</Text>
          <Text style={styles.statLabel}>Skills</Text>
        </GlassCard>
        <GlassCard style={styles.statCard}>
          <Ionicons name="bulb" size={22} color={Colors.accentSecondary} />
          <Text style={styles.statValue}>{analysis.recommendations.length}</Text>
          <Text style={styles.statLabel}>Tips</Text>
        </GlassCard>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        {(['overview', 'keywords', 'skills', 'recommendations'] as ResultTab[]).map(
          (tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'overview' && (
          <OverviewTab analysis={analysis} scoreColor={scoreColor} />
        )}
        {activeTab === 'keywords' && <KeywordsTab analysis={analysis} />}
        {activeTab === 'skills' && <SkillsTab analysis={analysis} />}
        {activeTab === 'recommendations' && (
          <RecommendationsTab analysis={analysis} />
        )}
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

// ── Overview Tab ────────────────────────────────────────────
function OverviewTab({
  analysis,
  scoreColor,
}: {
  analysis: ATSAnalysis;
  scoreColor: string;
}) {
  const matchRate =
    analysis.matchedKeywords.length > 0
      ? Math.round(
          (analysis.matchedKeywords.length /
            (analysis.matchedKeywords.length + analysis.missingKeywords.length)) *
            100
        )
      : 0;

  return (
    <>
      {/* Match Rate Bar */}
      <GlassCard style={styles.overviewCard}>
        <SectionHeader
          title="Keyword Match Rate"
          icon="pie-chart-outline"
          iconColor={Colors.info}
        />
        <View style={styles.matchBarContainer}>
          <View style={styles.matchBarBg}>
            <View
              style={[
                styles.matchBarFill,
                {
                  width: `${matchRate}%`,
                  backgroundColor: scoreColor,
                },
              ]}
            />
          </View>
          <Text style={[styles.matchRateText, { color: scoreColor }]}>
            {matchRate}%
          </Text>
        </View>
        <Text style={styles.matchRateHint}>
          {analysis.matchedKeywords.length} of{' '}
          {analysis.matchedKeywords.length + analysis.missingKeywords.length} keywords
          found in your resume
        </Text>
      </GlassCard>

      {/* Top Missing Keywords */}
      <GlassCard style={styles.overviewCard}>
        <SectionHeader
          title="Top Missing Keywords"
          icon="alert-circle-outline"
          iconColor={Colors.error}
          count={analysis.missingKeywords.filter((k) => k.importance === 'high').length}
          countColor={Colors.error}
          subtitle="High priority keywords not found in your resume"
        />
        <View style={styles.badgeGrid}>
          {analysis.missingKeywords
            .filter((k) => k.importance === 'high')
            .map((keyword) => (
              <KeywordBadge key={keyword.term} keyword={keyword} />
            ))}
        </View>
      </GlassCard>

      {/* Top Recommendations */}
      <GlassCard style={styles.overviewCard}>
        <SectionHeader
          title="Top Recommendations"
          icon="bulb-outline"
          iconColor={Colors.accentSecondary}
          subtitle="Most impactful improvements you can make"
        />
        {analysis.recommendations
          .filter((r) => r.priority === 'critical')
          .slice(0, 3)
          .map((rec) => (
            <RecommendationCard key={rec.id} recommendation={rec} />
          ))}
      </GlassCard>

      <GlassCard style={styles.overviewCard}>
        <SectionHeader
          title="Requirement Evidence"
          icon="list-outline"
          iconColor={Colors.info}
          count={analysis.requirements?.length ?? 0}
          countColor={Colors.info}
        />
        {(analysis.requirements ?? []).map((item, index) => (
          <View key={`${item.requirement}-${index}`} style={styles.detailItem}>
            <Text style={styles.detailTitle}>{item.requirement}</Text>
            <Text style={styles.detailStatus}>{item.status}</Text>
            {item.evidence ? <Text style={styles.detailText}>{item.evidence}</Text> : null}
          </View>
        ))}
      </GlassCard>

      {(analysis.strengths?.length ?? 0) > 0 && (
        <GlassCard style={styles.overviewCard}>
          <SectionHeader title="Strengths" icon="checkmark-circle-outline" iconColor={Colors.success} />
          {analysis.strengths?.map((strength, index) => (
            <Text key={`${strength}-${index}`} style={styles.detailText}>• {strength}</Text>
          ))}
        </GlassCard>
      )}

      {(analysis.gaps?.length ?? 0) > 0 && (
        <GlassCard style={styles.overviewCard}>
          <SectionHeader title="Gaps" icon="alert-circle-outline" iconColor={Colors.error} />
          {analysis.gaps?.map((gap, index) => (
            <Text key={`${gap}-${index}`} style={styles.detailText}>• {gap}</Text>
          ))}
        </GlassCard>
      )}

      {(analysis.atsWarnings?.length ?? 0) > 0 && (
        <GlassCard style={styles.overviewCard}>
          <SectionHeader title="ATS Warnings" icon="warning-outline" iconColor={Colors.accentSecondary} />
          {analysis.atsWarnings?.map((warning, index) => (
            <Text key={`${warning}-${index}`} style={styles.detailText}>• {warning}</Text>
          ))}
        </GlassCard>
      )}

      {analysis.explanation ? (
        <GlassCard style={styles.overviewCard}>
          <SectionHeader title="Explanation" icon="information-circle-outline" iconColor={Colors.info} />
          <Text style={styles.detailText}>{analysis.explanation}</Text>
        </GlassCard>
      ) : null}
    </>
  );
}

// ── Keywords Tab ────────────────────────────────────────────
function KeywordsTab({ analysis }: { analysis: ATSAnalysis }) {
  return (
    <>
      <GlassCard style={styles.overviewCard}>
        <SectionHeader
          title="Matched Keywords"
          icon="checkmark-circle-outline"
          iconColor={Colors.success}
          count={analysis.matchedKeywords.length}
          countColor={Colors.success}
        />
        <View style={styles.badgeGrid}>
          {analysis.matchedKeywords.map((keyword) => (
            <KeywordBadge key={keyword.term} keyword={keyword} />
          ))}
        </View>
      </GlassCard>

      <GlassCard style={styles.overviewCard}>
        <SectionHeader
          title="Missing Keywords"
          icon="close-circle-outline"
          iconColor={Colors.error}
          count={analysis.missingKeywords.length}
          countColor={Colors.error}
          subtitle="Add these keywords to improve your ATS score"
        />
        <View style={styles.badgeGrid}>
          {analysis.missingKeywords.map((keyword) => (
            <KeywordBadge key={keyword.term} keyword={keyword} />
          ))}
        </View>
      </GlassCard>
    </>
  );
}

// ── Skills Tab ──────────────────────────────────────────────
function SkillsTab({ analysis }: { analysis: ATSAnalysis }) {
  const categories = [...new Set(analysis.detectedSkills.map((s) => s.category))];

  return (
    <>
      {categories.map((category) => (
        <GlassCard key={category} style={styles.overviewCard}>
          <SectionHeader
            title={formatCategory(category)}
            icon="code-slash-outline"
            iconColor={Colors.info}
            count={analysis.detectedSkills.filter((s) => s.category === category).length}
            countColor={Colors.info}
          />
          <View style={styles.badgeGrid}>
            {analysis.detectedSkills
              .filter((s) => s.category === category)
              .map((skill) => (
                <SkillChip key={skill.name} skill={skill} />
              ))}
          </View>
        </GlassCard>
      ))}
    </>
  );
}

// ── Recommendations Tab ─────────────────────────────────────
function RecommendationsTab({ analysis }: { analysis: ATSAnalysis }) {
  return (
    <>
      <SectionHeader
        title="All Recommendations"
        icon="bulb-outline"
        iconColor={Colors.accentSecondary}
        count={analysis.recommendations.length}
        countColor={Colors.accentSecondary}
        subtitle="Sorted by priority — address critical items first"
      />
      {analysis.recommendations.map((rec) => (
        <RecommendationCard key={rec.id} recommendation={rec} />
      ))}
    </>
  );
}

// ── Helpers ─────────────────────────────────────────────────
function formatCategory(category: string): string {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },

  // Score Section
  scoreSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  jobTitle: {
    fontSize: FontSizes.title,
    fontWeight: FontWeights.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  company: {
    fontSize: FontSizes.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  fileName: {
    fontSize: FontSizes.small,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  statValue: {
    fontSize: FontSizes.title,
    fontWeight: FontWeights.extrabold,
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: FontSizes.small,
    fontWeight: FontWeights.medium,
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.white,
    fontWeight: FontWeights.semibold,
  },

  // Tab Content
  tabContent: {
    minHeight: 300,
  },

  // Cards
  overviewCard: {
    marginBottom: Spacing.lg,
  },
  detailItem: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: Spacing.sm,
  },
  detailTitle: {
    color: Colors.textPrimary,
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
  },
  detailStatus: {
    color: Colors.primary,
    fontSize: FontSizes.caption,
    fontWeight: FontWeights.bold,
    marginTop: 2,
  },
  detailText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.small,
    lineHeight: 20,
    marginTop: Spacing.xs,
  },

  // Match Bar
  matchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  matchBarBg: {
    flex: 1,
    height: 10,
    backgroundColor: Colors.surface,
    borderRadius: 5,
    overflow: 'hidden',
  },
  matchBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  matchRateText: {
    fontSize: FontSizes.bodyLarge,
    fontWeight: FontWeights.bold,
    minWidth: 40,
    textAlign: 'right',
  },
  matchRateHint: {
    fontSize: FontSizes.small,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },

  // Badge Grid
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  bottomSpacer: {
    height: 40,
  },
});
