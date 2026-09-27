// ATS Checker - Theme Tests

import {
  getScoreColor,
  getScoreLabel,
  getCategoryColor,
  getPriorityColor,
  Colors,
} from '../../theme';

describe('Theme Utilities', () => {
  describe('getScoreColor', () => {
    it('returns excellent color for scores >= 85', () => {
      expect(getScoreColor(85)).toBe(Colors.scoreExcellent);
      expect(getScoreColor(100)).toBe(Colors.scoreExcellent);
      expect(getScoreColor(90)).toBe(Colors.scoreExcellent);
    });

    it('returns good color for scores 70-84', () => {
      expect(getScoreColor(70)).toBe(Colors.scoreGood);
      expect(getScoreColor(84)).toBe(Colors.scoreGood);
    });

    it('returns average color for scores 50-69', () => {
      expect(getScoreColor(50)).toBe(Colors.scoreAverage);
      expect(getScoreColor(69)).toBe(Colors.scoreAverage);
    });

    it('returns poor color for scores 30-49', () => {
      expect(getScoreColor(30)).toBe(Colors.scorePoor);
      expect(getScoreColor(49)).toBe(Colors.scorePoor);
    });

    it('returns critical color for scores < 30', () => {
      expect(getScoreColor(0)).toBe(Colors.scoreCritical);
      expect(getScoreColor(29)).toBe(Colors.scoreCritical);
    });
  });

  describe('getScoreLabel', () => {
    it('returns correct labels for score ranges', () => {
      expect(getScoreLabel(90)).toBe('Excellent');
      expect(getScoreLabel(75)).toBe('Good');
      expect(getScoreLabel(60)).toBe('Average');
      expect(getScoreLabel(35)).toBe('Needs Work');
      expect(getScoreLabel(10)).toBe('Critical');
    });
  });

  describe('getCategoryColor', () => {
    it('returns correct colors for known categories', () => {
      expect(getCategoryColor('technical')).toBe(Colors.categoryTechnical);
      expect(getCategoryColor('soft_skill')).toBe(Colors.categorySoftSkill);
      expect(getCategoryColor('certification')).toBe(Colors.categoryCertification);
    });

    it('returns muted color for unknown categories', () => {
      expect(getCategoryColor('unknown')).toBe(Colors.textMuted);
    });
  });

  describe('getPriorityColor', () => {
    it('returns correct colors for priorities', () => {
      expect(getPriorityColor('critical')).toBe(Colors.priorityCritical);
      expect(getPriorityColor('important')).toBe(Colors.priorityImportant);
      expect(getPriorityColor('nice_to_have')).toBe(Colors.priorityNiceToHave);
    });

    it('returns muted color for unknown priority', () => {
      expect(getPriorityColor('unknown')).toBe(Colors.textMuted);
    });
  });
});
