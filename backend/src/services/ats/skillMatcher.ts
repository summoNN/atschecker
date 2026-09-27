import { RequirementItem } from '../jobs/types.js';
import { CategoryMatchResult, RequirementMatchResult, StructuredCV } from './types.js';
import { matchKeywordInText } from './keywordMatcher.js';

export function buildCvSearchText(cv: StructuredCV): string {
  return [
    cv.rawText ?? '',
    ...(cv.skills ?? []),
    ...(cv.technologies ?? []),
    ...(cv.languages ?? []),
    ...(cv.certifications ?? []),
    ...(cv.experienceHistory ?? []).flatMap((experience) => [
      experience.title ?? '',
      experience.company ?? '',
      experience.description ?? '',
      ...(experience.technologies ?? []),
    ]),
    ...(cv.education ?? []).flatMap((education) => [
      education.degree ?? '',
      education.field ?? '',
      education.institution ?? '',
    ]),
  ].join(' ');
}

function emptyCategory(category: string): CategoryMatchResult {
  return {
    category,
    score: 100,
    totalCount: 0,
    matchedCount: 0,
    partialCount: 0,
    missingCount: 0,
    unknownCount: 0,
    items: [],
  };
}

function resultFor(
  item: RequirementItem,
  status: RequirementMatchResult['status'],
  score: number,
  evidence?: string,
  notes?: string
): RequirementMatchResult {
  return { name: item.name.trim(), importance: item.importance, status, score, evidence, notes };
}

export function matchSkills(
  skills: RequirementItem[],
  cv: StructuredCV,
  categoryName = 'skills'
): CategoryMatchResult {
  if (!skills?.length) return emptyCategory(categoryName);

  const cvText = buildCvSearchText(cv);
  const items: RequirementMatchResult[] = [];

  for (const skill of skills) {
    const direct = matchKeywordInText(skill.name, cvText);
    if (direct.matched) {
      items.push(resultFor(skill, 'MATCHED', 1, `Matched as '${direct.matchedVariation}'`));
      continue;
    }

    const words = skill.name
      .trim()
      .split(/\s+/)
      .filter((word) => word.replace(/[^a-z0-9+#.]/gi, '').length > 2);
    const matchedWords = words.filter((word) => matchKeywordInText(word, cvText).matched);
    if (words.length > 1 && matchedWords.length > 0 && matchedWords.length < words.length) {
      items.push(
        resultFor(skill, 'PARTIAL', 0.5, `Matched sub-terms: ${matchedWords.join(', ')}`)
      );
      continue;
    }

    if (skill.importance === 'INFORMATIONAL') {
      items.push(resultFor(skill, 'UNKNOWN', 0, undefined, 'Informational skill is not verified'));
    } else {
      items.push(resultFor(skill, 'MISSING', 0, undefined, 'Skill is not found in the CV'));
    }
  }

  return toCategoryResult(categoryName, items);
}

export function toCategoryResult(category: string, items: RequirementMatchResult[]): CategoryMatchResult {
  const matchedCount = items.filter((item) => item.status === 'MATCHED').length;
  const partialCount = items.filter((item) => item.status === 'PARTIAL').length;
  const missingCount = items.filter((item) => item.status === 'MISSING').length;
  const unknownCount = items.filter((item) => item.status === 'UNKNOWN').length;
  const earned = items.reduce((sum, item) => sum + item.score, 0);

  return {
    category,
    score: items.length ? Math.round((earned / items.length) * 100) : 100,
    totalCount: items.length,
    matchedCount,
    partialCount,
    missingCount,
    unknownCount,
    items,
  };
}
