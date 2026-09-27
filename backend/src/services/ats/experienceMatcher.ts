import { RequirementItem } from '../jobs/types.js';
import { CategoryMatchResult, RequirementMatchResult, StructuredCV } from './types.js';
import { buildTokenRegex, matchKeywordInText, normalizeText } from './keywordMatcher.js';
import { buildCvSearchText, toCategoryResult } from './skillMatcher.js';

export function extractRequiredYears(text: string): number | null {
  const match = normalizeText(text).match(/(?:minimum\s+|at\s+least\s+)?(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)/i);
  return match ? Number(match[1]) : null;
}

export function extractTargetSkill(requirementName: string): string {
  return normalizeText(requirementName)
    .replace(/\d+(?:\.\d+)?\+?\s*(?:years?|yrs?)/gi, ' ')
    .replace(/\b(?:minimum|at\s+least|of|in|with|required|plus|experience|years?)\b/gi, ' ')
    .replace(/[,:;()[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function calculateCvYears(cv: StructuredCV): number | null {
  if (typeof cv.totalYearsOfExperience === 'number' && cv.totalYearsOfExperience > 0) {
    return cv.totalYearsOfExperience;
  }

  const historyYears = (cv.experienceHistory ?? [])
    .map((experience) => experience.years ?? 0)
    .filter((years) => years > 0);
  if (historyYears.length) return historyYears.reduce((sum, years) => sum + years, 0);

  const match = normalizeText(cv.rawText ?? '').match(
    /(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?experience/i
  );
  return match ? Number(match[1]) : null;
}

function findSpecificYears(targetSkill: string, cv: StructuredCV): number | null {
  const skillPattern = buildTokenRegex(targetSkill).source;
  const durationFirst = new RegExp(
    `(\\d+(?:\\.\\d+)?)\\+?\\s*(?:years?|yrs?)(?:\\s+of)?(?:\\s+experience)?(?:\\s+(?:in|with|using|on))?\\s*${skillPattern}`,
    'i'
  );
  const rawText = normalizeText(cv.rawText ?? '');
  const durationMatch = rawText.match(durationFirst);
  if (durationMatch) return Number(durationMatch[1]);

  const historyYears = (cv.experienceHistory ?? [])
    .filter((experience) =>
      (experience.technologies ?? []).some((technology) =>
        matchKeywordInText(targetSkill, technology).matched
      )
    )
    .map((experience) => experience.years ?? 0)
    .filter((years) => years > 0);
  return historyYears.length ? Math.max(...historyYears) : null;
}

export function matchExperience(
  requirements: RequirementItem[],
  cv: StructuredCV
): CategoryMatchResult {
  if (!requirements?.length) return toCategoryResult('experience', []);

  const cvText = buildCvSearchText(cv);
  const totalYears = calculateCvYears(cv);
  const items: RequirementMatchResult[] = [];

  for (const requirement of requirements) {
    const requiredYears = extractRequiredYears(`${requirement.name} ${requirement.evidence}`);
    const targetSkill = extractTargetSkill(requirement.name);

    if (!targetSkill) {
      if (requiredYears === null) {
        items.push({
          name: requirement.name,
          importance: requirement.importance,
          status: 'UNKNOWN',
          score: 0,
          notes: 'Experience requirement does not state a verifiable duration',
        });
      } else if (totalYears === null) {
        items.push({
          name: requirement.name,
          importance: requirement.importance,
          status: 'UNKNOWN',
          score: 0,
          notes: 'Total career tenure is not specified in the CV',
        });
      } else if (totalYears >= requiredYears) {
        items.push({
          name: requirement.name,
          importance: requirement.importance,
          status: 'MATCHED',
          score: 1,
          evidence: `${totalYears} years of experience meets the ${requiredYears}-year requirement`,
        });
      } else {
        items.push({
          name: requirement.name,
          importance: requirement.importance,
          status: 'PARTIAL',
          score: 0.5,
          evidence: `${totalYears} years of experience found; ${requiredYears} required`,
        });
      }
      continue;
    }

    if (!matchKeywordInText(targetSkill, cvText).matched) {
      items.push({
        name: requirement.name,
        importance: requirement.importance,
        status: 'MISSING',
        score: 0,
        notes: `No evidence of '${targetSkill}' found in the CV`,
      });
      continue;
    }

    if (requiredYears === null) {
      items.push({
        name: requirement.name,
        importance: requirement.importance,
        status: 'MATCHED',
        score: 1,
        evidence: `Experience with '${targetSkill}' is listed in the CV`,
      });
      continue;
    }

    const specificYears = findSpecificYears(targetSkill, cv);
    if (specificYears !== null) {
      if (specificYears >= requiredYears) {
        items.push({
          name: requirement.name,
          importance: requirement.importance,
          status: 'MATCHED',
          score: 1,
          evidence: `${specificYears} years of '${targetSkill}' verified; ${requiredYears} required`,
        });
      } else {
        items.push({
          name: requirement.name,
          importance: requirement.importance,
          status: 'PARTIAL',
          score: 0.5,
          evidence: `${specificYears} years of '${targetSkill}' found; ${requiredYears} required`,
        });
      }
      continue;
    }

    // Total tenure cannot prove duration for this particular skill.
    items.push({
      name: requirement.name,
      importance: requirement.importance,
      status: 'UNKNOWN',
      score: 0,
      notes: `'${targetSkill}' is mentioned, but exact duration/years cannot be verified from the CV`,
    });
  }

  return toCategoryResult('experience', items);
}
