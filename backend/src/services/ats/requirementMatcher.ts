import { JobRequirements, RequirementItem } from '../jobs/types.js';
import { CategoryMatchResult, RequirementMatchResult, StructuredCV } from './types.js';
import { matchEducation } from './educationMatcher.js';
import { matchExperience } from './experienceMatcher.js';
import { matchKeywordInText } from './keywordMatcher.js';
import { buildCvSearchText, matchSkills, toCategoryResult } from './skillMatcher.js';

function matchSimpleList(
  requirements: RequirementItem[],
  cv: StructuredCV,
  category: string
): CategoryMatchResult {
  if (!requirements?.length) {
    return toCategoryResult(category, []);
  }

  const cvText = buildCvSearchText(cv);
  const items: RequirementMatchResult[] = requirements.map((requirement) => {
    const match = matchKeywordInText(requirement.name, cvText);
    if (match.matched) {
      return {
        name: requirement.name.trim(),
        importance: requirement.importance,
        status: 'MATCHED',
        score: 1,
        evidence: `Matched as '${match.matchedVariation}'`,
      };
    }

    return {
      name: requirement.name.trim(),
      importance: requirement.importance,
      status: requirement.importance === 'INFORMATIONAL' ? 'UNKNOWN' : 'MISSING',
      score: 0,
      notes: requirement.importance === 'INFORMATIONAL'
        ? 'Informational requirement is not verified'
        : 'Requirement is not found in the CV',
    };
  });

  return toCategoryResult(category, items);
}

export function matchAllRequirements(
  jd: JobRequirements,
  cv: StructuredCV
): Record<string, CategoryMatchResult> {
  const requiredSkills = [
    ...(jd.requiredSkills ?? []),
    ...(jd.requiredTechnologies ?? []),
  ];
  const preferredSkills = [
    ...(jd.preferredSkills ?? []),
    ...(jd.preferredTechnologies ?? []),
  ];
  const requiredKeywords = (jd.importantKeywords ?? []).filter(
    (keyword) => keyword.importance === 'REQUIRED'
  );
  const preferredKeywords = (jd.importantKeywords ?? []).filter(
    (keyword) => keyword.importance !== 'REQUIRED'
  );

  return {
    requiredSkills: matchSkills(requiredSkills, cv, 'requiredSkills'),
    preferredSkills: matchSkills(preferredSkills, cv, 'preferredSkills'),
    requiredKeywords: matchSkills(requiredKeywords, cv, 'requiredKeywords'),
    preferredKeywords: matchSkills(preferredKeywords, cv, 'preferredKeywords'),
    experience: matchExperience(jd.requiredExperience ?? [], cv),
    education: matchEducation(jd.educationRequirements ?? [], cv),
    certifications: matchSimpleList(jd.certifications ?? [], cv, 'certifications'),
    languages: matchSimpleList(jd.languages ?? [], cv, 'languages'),
  };
}
