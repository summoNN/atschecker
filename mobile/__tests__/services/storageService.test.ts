// ATS Checker - Storage Service Tests

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveAnalysis,
  getHistory,
  getAnalysis,
  deleteAnalysis,
  clearAllData,
} from '../../services/storageService';
import type { ATSAnalysis } from '../../types';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
}));

const mockAnalysis: ATSAnalysis = {
  id: 'test-123',
  fileName: 'resume.pdf',
  jobTitle: 'Software Engineer',
  company: 'Test Corp',
  score: 75,
  matchedKeywords: [],
  missingKeywords: [],
  detectedSkills: [],
  recommendations: [],
  createdAt: '2024-01-01T00:00:00.000Z',
};

describe('Storage Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveAnalysis', () => {
    it('saves analysis and updates history', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      await saveAnalysis(mockAnalysis);

      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(2);
      // First call: save full analysis
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@ats_checker_analysis_test-123',
        JSON.stringify(mockAnalysis)
      );
    });
  });

  describe('getHistory', () => {
    it('returns empty array when no history', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const result = await getHistory();
      expect(result).toEqual([]);
    });

    it('returns parsed history', async () => {
      const mockHistory = [
        {
          id: 'test-123',
          fileName: 'resume.pdf',
          jobTitle: 'Software Engineer',
          company: 'Test Corp',
          score: 75,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(mockHistory)
      );

      const result = await getHistory();
      expect(result).toEqual(mockHistory);
    });

    it('returns empty array on error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('fail'));

      const result = await getHistory();
      expect(result).toEqual([]);
    });
  });

  describe('getAnalysis', () => {
    it('returns null when not found', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const result = await getAnalysis('nonexistent');
      expect(result).toBeNull();
    });

    it('returns parsed analysis', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(mockAnalysis)
      );

      const result = await getAnalysis('test-123');
      expect(result).toEqual(mockAnalysis);
    });
  });

  describe('deleteAnalysis', () => {
    it('removes analysis and updates history', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify([{ id: 'test-123' }, { id: 'other' }])
      );

      await deleteAnalysis('test-123');

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
        '@ats_checker_analysis_test-123'
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@ats_checker_history',
        JSON.stringify([{ id: 'other' }])
      );
    });
  });

  describe('clearAllData', () => {
    it('removes all analysis data', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify([{ id: 'a' }, { id: 'b' }])
      );

      await clearAllData();

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        '@ats_checker_analysis_a',
        '@ats_checker_analysis_b',
        '@ats_checker_history',
      ]);
    });
  });
});
