import { JobRequirements } from '../jobs/types.js';
import { StructuredCV, ScoreWeights, AtsMatchReport, DEFAULT_SCORE_WEIGHTS } from './types.js';
import { matchAllRequirements } from './requirementMatcher.js';
import { calculateAtsScores } from './scoreCalculator.js';

export * from './types.js';
export * from './aliases.js';
export * from './keywordMatcher.js';
export * from './skillMatcher.js';
export * from './experienceMatcher.js';
export * from './educationMatcher.js';
export * from './requirementMatcher.js';
export * from './scoreCalculator.js';

/**
 * Main deterministic ATS evaluation function.
 * Matches StructuredCV against JobRequirements using configurable weights.
 */
export function evaluateAtsMatch(
  cv: StructuredCV,
  jd: JobRequirements,
  weights: ScoreWeights = DEFAULT_SCORE_WEIGHTS
): AtsMatchReport {
  const hasCvEvidence = Boolean(
    cv && (
      cv.rawText?.trim() ||
      cv.skills?.length ||
      cv.technologies?.length ||
      cv.experienceHistory?.length ||
      cv.education?.length ||
      cv.certifications?.length ||
      cv.languages?.length
    )
  );

  // An actually empty CV receives no credit in any category. Structured data
  // is still valid evidence even when rawText is empty.
  if (!hasCvEvidence) {
    const emptyCategories = matchAllRequirements(jd, { rawText: '' });
    const report = calculateAtsScores(emptyCategories, weights);
    return {
      ...report,
      overallScore: 0,
      requiredSkillsMatch: 0,
      preferredSkillsMatch: 0,
      requiredKeywordMatch: 0,
      preferredKeywordMatch: 0,
      experienceMatch: 0,
      educationMatch: 0,
      certificationMatch: 0,
    };
  }

  const categoryResults = matchAllRequirements(jd, cv);
  return calculateAtsScores(categoryResults, weights);
}
