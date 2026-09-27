import { getCanonicalName, getTermVariations } from './aliases.js';

export interface KeywordMatchDetail {
  keyword: string;
  matched: boolean;
  matchedVariation?: string;
  count: number;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalizes text without removing meaningful technology symbols such as +, #,
 * and the dot in .NET. Whitespace is normalized so matching is deterministic.
 */
export function normalizeText(text: string): string {
  return (text ?? '')
    .toLowerCase()
    .replace(/[\u2018\u2019\u201a\u201b]/g, "'")
    .replace(/[\u201c\u201d\u201e\u201f]/g, '"')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function getMatchingVariations(term: string): string[] {
  const variations = getTermVariations(term);
  const expanded = new Set<string>();

  for (const variation of variations) {
    const normalized = normalizeText(variation);
    expanded.add(normalized);

    // Accept punctuation-separated and whitespace-separated forms of terms
    // such as Node.js / Node JS, but do not strip leading punctuation from .NET.
    if (/\w[./_-]\w/i.test(normalized)) {
      expanded.add(normalized.replace(/(?<=\w)[./_-](?=\w)/g, ''));
      expanded.add(normalized.replace(/(?<=\w)[./_-](?=\w)/g, ' '));
    }
  }

  return [...expanded];
}

/**
 * Builds a token-aware expression. Alphanumeric and technology-symbol
 * boundaries prevent Java matching JavaScript or Go matching Django.
 */
export function buildTokenRegex(term: string): RegExp {
  const normalized = normalizeText(term);
  const escaped = escapeRegex(normalized)
    .replace(/\s+/g, '[\\s._/-]+');

  return new RegExp(`(?<![a-z0-9_+#])${escaped}(?![a-z0-9_+#])`, 'i');
}

export function matchKeywordInText(keyword: string, text: string): KeywordMatchDetail {
  const cleanText = normalizeText(text);
  const cleanKeyword = normalizeText(keyword);

  if (!cleanText || !cleanKeyword) {
    return { keyword, matched: false, count: 0 };
  }

  for (const variation of getMatchingVariations(cleanKeyword)) {
    const regex = buildTokenRegex(variation);
    const matches = cleanText.match(new RegExp(regex.source, 'gi'));
    if (matches && matches.length > 0) {
      return {
        keyword,
        matched: true,
        matchedVariation: variation,
        count: matches.length,
      };
    }
  }

  return { keyword, matched: false, count: 0 };
}

export function matchKeywords(
  keywords: string[],
  cvText: string
): {
  matchedKeywords: string[];
  missingKeywords: string[];
  matchRate: number;
  details: KeywordMatchDetail[];
} {
  const seen = new Set<string>();
  const uniqueKeywords: string[] = [];

  for (const keyword of keywords ?? []) {
    const display = keyword.trim();
    const canonical = getCanonicalName(display);
    if (display && !seen.has(canonical)) {
      seen.add(canonical);
      uniqueKeywords.push(display);
    }
  }

  if (uniqueKeywords.length === 0) {
    return { matchedKeywords: [], missingKeywords: [], matchRate: 100, details: [] };
  }

  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];
  const details = uniqueKeywords.map((keyword) => matchKeywordInText(keyword, cvText));

  for (const detail of details) {
    if (detail.matched) matchedKeywords.push(detail.keyword);
    else missingKeywords.push(detail.keyword);
  }

  return {
    matchedKeywords,
    missingKeywords,
    matchRate: Math.round((matchedKeywords.length / uniqueKeywords.length) * 100),
    details,
  };
}
