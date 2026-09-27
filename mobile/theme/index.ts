// ATS Checker - Design Theme
// Premium dark theme with vibrant accent colors

import { Platform, type ViewStyle } from 'react-native';

export const Colors = {
  // Base palette
  background: '#0A0A1A',
  surface: '#12122A',
  surfaceElevated: '#1A1A3A',
  surfaceHighlight: '#222250',

  // Primary gradient colors
  primaryStart: '#6C5CE7',
  primaryEnd: '#A855F7',
  primary: '#8B5CF6',

  // Accent colors
  accent: '#06D6A0',
  accentSecondary: '#FFD166',
  accentTertiary: '#FF6B6B',

  // Score colors
  scoreExcellent: '#06D6A0',
  scoreGood: '#4ADE80',
  scoreAverage: '#FFD166',
  scorePoor: '#FF6B6B',
  scoreCritical: '#EF4444',

  // Text colors
  textPrimary: '#F1F1F8',
  textSecondary: '#A0A0C0',
  textMuted: '#6B6B8A',
  textInverse: '#0A0A1A',

  // Border colors
  border: '#2A2A4A',
  borderFocused: '#6C5CE7',

  // Category badge colors
  categoryTechnical: '#6C5CE7',
  categorySoftSkill: '#06D6A0',
  categoryCertification: '#FFD166',
  categoryEducation: '#4FC3F7',
  categoryExperience: '#FF8A65',
  categoryTool: '#CE93D8',
  categoryIndustry: '#80CBC4',

  // Priority colors
  priorityCritical: '#EF4444',
  priorityImportant: '#FFD166',
  priorityNiceToHave: '#4ADE80',

  // Status
  success: '#06D6A0',
  warning: '#FFD166',
  error: '#FF6B6B',
  info: '#4FC3F7',

  // Overlays
  overlay: 'rgba(10, 10, 26, 0.85)',
  glassBg: 'rgba(18, 18, 42, 0.8)',

  // White/transparent helpers
  white: '#FFFFFF',
  transparent: 'transparent',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const FontSizes = {
  caption: 11,
  small: 12,
  body: 14,
  bodyLarge: 16,
  subtitle: 18,
  title: 22,
  heading: 28,
  hero: 36,
} as const;

export const FontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;

function platformShadow(webShadow: string, nativeShadow: ViewStyle): ViewStyle {
  return Platform.select({
    web: { boxShadow: webShadow },
    default: nativeShadow,
  }) ?? nativeShadow;
}

export const Shadows = {
  small: platformShadow('0px 2px 4px rgba(0, 0, 0, 0.25)', {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  }),
  medium: platformShadow('0px 4px 8px rgba(0, 0, 0, 0.3)', {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  }),
  large: platformShadow('0px 6px 12px rgba(108, 92, 231, 0.25)', {
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  }),
  glow: platformShadow('0px 0px 16px rgba(108, 92, 231, 0.4)', {
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  }),
} as const;

export function getGlowShadow(color: string): ViewStyle {
  return Platform.select({
    web: { boxShadow: `0px 0px 20px ${color}` },
    default: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 10,
    },
  }) ?? {};
}

export function getScoreColor(score: number): string {
  if (score >= 85) return Colors.scoreExcellent;
  if (score >= 70) return Colors.scoreGood;
  if (score >= 50) return Colors.scoreAverage;
  if (score >= 30) return Colors.scorePoor;
  return Colors.scoreCritical;
}

export function getScoreLabel(score: number): string {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Average';
  if (score >= 30) return 'Needs Work';
  return 'Critical';
}

export function getCategoryColor(category: string): string {
  const map: Record<string, string> = {
    technical: Colors.categoryTechnical,
    soft_skill: Colors.categorySoftSkill,
    certification: Colors.categoryCertification,
    education: Colors.categoryEducation,
    experience: Colors.categoryExperience,
    tool: Colors.categoryTool,
    industry: Colors.categoryIndustry,
    programming: Colors.categoryTechnical,
    framework: Colors.primaryEnd,
    database: Colors.categoryEducation,
    cloud: Colors.info,
    devops: Colors.categoryExperience,
    design: Colors.categoryTool,
    management: Colors.accentSecondary,
    communication: Colors.categorySoftSkill,
    other: Colors.textMuted,
  };
  return map[category] ?? Colors.textMuted;
}

export function getPriorityColor(priority: string): string {
  const map: Record<string, string> = {
    critical: Colors.priorityCritical,
    important: Colors.priorityImportant,
    nice_to_have: Colors.priorityNiceToHave,
  };
  return map[priority] ?? Colors.textMuted;
}
