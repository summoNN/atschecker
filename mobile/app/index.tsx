// ATS Checker - Analyze Screen (Home)
// CV upload and job description input

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import {
  Colors,
  FontSizes,
  FontWeights,
  BorderRadius,
  Spacing,
  Shadows,
} from '../theme';
import { GlassCard, GradientButton } from '../components';
import { analyzeCV, ApiError, API_BASE_URL } from '../services/analysisService';
import { saveAnalysis } from '../services/storageService';
import type { JobDescriptionInput, ATSAnalysis } from '../types';

// We store the latest analysis in a simple module-level variable
// so the results screen can read it. In production, use a proper state manager.
let latestAnalysis: ATSAnalysis | null = null;
export function getLatestAnalysis(): ATSAnalysis | null {
  return latestAnalysis;
}

export default function AnalyzeScreen() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    uri: string;
    file?: Blob;
  } | null>(null);
  const [jobDescription, setJobDescription] = useState<JobDescriptionInput>({
    title: '',
    company: '',
    description: '',
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const pickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile({
          name: asset.name,
          uri: asset.uri,
          file: asset.file,
        });
      }
    } catch {
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) {
      Alert.alert('Missing CV', 'Please select a PDF resume to analyze.');
      return;
    }
    if (!jobDescription.description.trim()) {
      Alert.alert(
        'Missing Job Description',
        'Please paste the job description to analyze against.'
      );
      return;
    }

    setIsAnalyzing(true);
    try {
      const analysis = await analyzeCV(
        selectedFile.uri,
        selectedFile.name,
        jobDescription,
        selectedFile.file
      );
      await saveAnalysis(analysis);
      latestAnalysis = analysis;
      router.push('/results');
    } catch (error: unknown) {
      Alert.alert('Analysis failed', getAnalysisErrorMessage(error));
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedFile, jobDescription, router]);

  const isReady =
    selectedFile !== null && jobDescription.description.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.heroTitle}>ATS Resume Checker</Text>
          <Text style={styles.heroSubtitle}>
            Upload your CV and paste a job description to get an instant ATS
            compatibility score with actionable recommendations.
          </Text>
        </View>

        {/* Step 1: Upload CV */}
        <View style={styles.stepContainer}>
          <View style={styles.stepHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNumber}>1</Text>
            </View>
            <Text style={styles.stepTitle}>Upload Your Resume</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.uploadArea,
              selectedFile && styles.uploadAreaSelected,
            ]}
            onPress={pickDocument}
            activeOpacity={0.7}
          >
            {selectedFile ? (
              <View style={styles.fileInfo}>
                <View style={styles.fileIconContainer}>
                  <Ionicons
                    name="document-text"
                    size={28}
                    color={Colors.success}
                  />
                </View>
                <View style={styles.fileDetails}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {selectedFile.name}
                  </Text>
                  <Text style={styles.fileAction}>Tap to change file</Text>
                </View>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={Colors.success}
                />
              </View>
            ) : (
              <View style={styles.uploadPlaceholder}>
                <View style={styles.uploadIconCircle}>
                  <Ionicons
                    name="cloud-upload-outline"
                    size={32}
                    color={Colors.primary}
                  />
                </View>
                <Text style={styles.uploadText}>Tap to select PDF resume</Text>
                <Text style={styles.uploadHint}>PDF format recommended</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Step 2: Job Description */}
        <View style={styles.stepContainer}>
          <View style={styles.stepHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNumber}>2</Text>
            </View>
            <Text style={styles.stepTitle}>Paste Job Description</Text>
          </View>

          <GlassCard>
            <TextInput
              style={styles.input}
              placeholder="Job Title (e.g., Senior Software Engineer)"
              placeholderTextColor={Colors.textMuted}
              value={jobDescription.title}
              onChangeText={(text) =>
                setJobDescription((prev) => ({ ...prev, title: text }))
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Company Name (optional)"
              placeholderTextColor={Colors.textMuted}
              value={jobDescription.company}
              onChangeText={(text) =>
                setJobDescription((prev) => ({ ...prev, company: text }))
              }
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Paste the full job description here..."
              placeholderTextColor={Colors.textMuted}
              value={jobDescription.description}
              onChangeText={(text) =>
                setJobDescription((prev) => ({ ...prev, description: text }))
              }
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />
          </GlassCard>
        </View>

        {/* Analyze Button */}
        <View style={styles.analyzeSection}>
          <GradientButton
            title={isAnalyzing ? 'Analyzing...' : 'Analyze My Resume'}
            onPress={handleAnalyze}
            loading={isAnalyzing}
            disabled={!isReady}
            icon="sparkles"
            size="large"
            style={styles.analyzeButton}
          />
          {!isReady && (
            <Text style={styles.readyHint}>
              {!selectedFile
                ? 'Upload your resume to get started'
                : 'Paste a job description to continue'}
            </Text>
          )}
        </View>

        {/* Bottom spacer for keyboard */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function getAnalysisErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Analysis failed. Please try again.';
  if (error.code === 'TIMEOUT') return 'The backend took too long to respond. Please try again.';
  if (error.code === 'NETWORK') return `Could not reach ${API_BASE_URL}. Check the API URL and your network connection.`;
  if (error.status === 400) return 'Please check the CV and job description and try again.';
  if (error.status === 413) return 'The CV file is too large. Please choose a smaller PDF.';
  if (error.status === 429) return 'The service is busy. Please wait and try again.';
  if (error.status && error.status >= 500) return 'The backend is temporarily unavailable. Please try again.';
  return error.message;
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.glow,
  },
  heroTitle: {
    fontSize: FontSizes.heading,
    fontWeight: FontWeights.extrabold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  heroSubtitle: {
    fontSize: FontSizes.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.lg,
  },

  // Steps
  stepContainer: {
    marginBottom: Spacing.xxl,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  stepNumber: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  stepTitle: {
    fontSize: FontSizes.bodyLarge,
    fontWeight: FontWeights.semibold,
    color: Colors.textPrimary,
  },

  // Upload
  uploadArea: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    backgroundColor: Colors.surfaceElevated,
  },
  uploadAreaSelected: {
    borderColor: Colors.success + '60',
    borderStyle: 'solid',
    backgroundColor: Colors.success + '08',
    padding: Spacing.lg,
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  uploadIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  uploadText: {
    fontSize: FontSizes.bodyLarge,
    fontWeight: FontWeights.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  uploadHint: {
    fontSize: FontSizes.small,
    color: Colors.textMuted,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.success + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  fileAction: {
    fontSize: FontSizes.small,
    color: Colors.textMuted,
  },

  // Inputs
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    fontSize: FontSizes.body,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  textArea: {
    minHeight: 160,
    marginBottom: 0,
  },

  // Analyze
  analyzeSection: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  analyzeButton: {
    width: '100%',
  },
  readyHint: {
    fontSize: FontSizes.small,
    color: Colors.textMuted,
    marginTop: Spacing.md,
  },

  bottomSpacer: {
    height: 40,
  },
});
