// ATS Checker - Root Layout
// Sets up navigation with expo-router tabs

import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { Colors, FontSizes, FontWeights } from '../theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.background,
            borderBottomWidth: 0,
            ...Platform.select({
              web: { boxShadow: 'none' },
              default: { elevation: 0, shadowOpacity: 0 },
            }),
          },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: {
            fontWeight: FontWeights.bold,
            fontSize: FontSizes.subtitle,
          },
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopColor: Colors.border,
            borderTopWidth: 1,
            height: 88,
            paddingBottom: 28,
            paddingTop: 8,
          },
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarLabelStyle: {
            fontSize: FontSizes.caption,
            fontWeight: FontWeights.medium,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Analyze',
            headerTitle: 'ATS Checker',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="scan-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="results"
          options={{
            title: 'Results',
            headerTitle: 'Analysis Results',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="analytics-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            headerTitle: 'Analysis History',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="time-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}
