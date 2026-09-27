// ATS Checker - Storage Service
// Handles persistent storage of analysis history using AsyncStorage

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ATSAnalysis, AnalysisHistoryItem } from '../types';

const HISTORY_KEY = '@ats_checker_history';
const ANALYSIS_PREFIX = '@ats_checker_analysis_';

/**
 * Save a completed analysis to storage
 */
export async function saveAnalysis(analysis: ATSAnalysis): Promise<void> {
  // Save full analysis
  await AsyncStorage.setItem(
    `${ANALYSIS_PREFIX}${analysis.id}`,
    JSON.stringify(analysis)
  );

  // Update history list
  const history = await getHistory();
  const historyItem: AnalysisHistoryItem = {
    id: analysis.id,
    fileName: analysis.fileName,
    jobTitle: analysis.jobTitle,
    company: analysis.company,
    score: analysis.score,
    createdAt: analysis.createdAt,
  };
  history.unshift(historyItem);

  // Keep only last 50 entries
  const trimmed = history.slice(0, 50);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

/**
 * Get analysis history list
 */
export async function getHistory(): Promise<AnalysisHistoryItem[]> {
  try {
    const data = await AsyncStorage.getItem(HISTORY_KEY);
    if (data) {
      return JSON.parse(data) as AnalysisHistoryItem[];
    }
  } catch {
    // Return empty on error
  }
  return [];
}

/**
 * Get a full analysis by ID
 */
export async function getAnalysis(id: string): Promise<ATSAnalysis | null> {
  try {
    const data = await AsyncStorage.getItem(`${ANALYSIS_PREFIX}${id}`);
    if (data) {
      return JSON.parse(data) as ATSAnalysis;
    }
  } catch {
    // Return null on error
  }
  return null;
}

/**
 * Delete an analysis by ID
 */
export async function deleteAnalysis(id: string): Promise<void> {
  await AsyncStorage.removeItem(`${ANALYSIS_PREFIX}${id}`);

  const history = await getHistory();
  const updated = history.filter((item) => item.id !== id);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

/**
 * Clear all analysis data
 */
export async function clearAllData(): Promise<void> {
  const history = await getHistory();
  const keys = history.map((item) => `${ANALYSIS_PREFIX}${item.id}`);
  keys.push(HISTORY_KEY);
  await AsyncStorage.multiRemove(keys);
}
