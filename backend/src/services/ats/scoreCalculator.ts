import {
  AtsMatchReport,
  CategoryMatchResult,
  DEFAULT_SCORE_WEIGHTS,
  ScoreWeights,
} from './types.js';

/**
 * Deterministically computes ATS scores and aggregates match results.
 * Weights are completely configurable and never hardcoded.
 */
export function calculateAtsScores(
  categories: Record<string, CategoryMatchResult>,
  weights: ScoreWeights = DEFAULT_SCORE_WEIGHTS
): AtsMatchReport {
  let weightedSum = 0;
  let activeWeightTotal = 0;

  // Map category keys to configured weights
  const weightMap: Record<string, number> = {
    requiredSkills: weights.requiredSkills,
    requiredKeywords: weights.requiredKeywords,
    experience: weights.experience,
    education: weights.education,
    certifications: weights.certifications,
    preferredSkills: weights.preferredSkills,
    preferredKeywords: weights.preferredKeywords ?? 0,
  };

  let totalRequirements = 0;
  let totalMatched = 0;
  let totalPartial = 0;
  let totalMissing = 0;
  let totalUnknown = 0;

  for (const [key, result] of Object.entries(categories)) {
    totalRequirements += result.totalCount;
    totalMatched += result.matchedCount;
    totalPartial += result.partialCount;
    totalMissing += result.missingCount;
    totalUnknown += result.unknownCount;

    const weight = weightMap[key] ?? 0;

    // Only apply weight if category had requirements defined in the JD
    if (result.totalCount > 0 && weight > 0) {
      weightedSum += result.score * weight;
      activeWeightTotal += weight;
    }
  }

  // If activeWeightTotal is 0 (e.g. empty JD), overall score is 0
  const overallScore =
    activeWeightTotal > 0 ? Math.round(weightedSum / activeWeightTotal) : 0;

  return {
    overallScore: Math.max(0, Math.min(100, overallScore)),
    requiredSkillsMatch: categories.requiredSkills?.score ?? 100,
    preferredSkillsMatch: categories.preferredSkills?.score ?? 100,
    requiredKeywordMatch: categories.requiredKeywords?.score ?? 100,
    preferredKeywordMatch: categories.preferredKeywords?.score ?? 100,
    experienceMatch: categories.experience?.score ?? 100,
    educationMatch: categories.education?.score ?? 100,
    certificationMatch: categories.certifications?.score ?? 100,
    categories,
    summary: {
      totalRequirements,
      totalMatched,
      totalPartial,
      totalMissing,
      totalUnknown,
    },
  };
}
