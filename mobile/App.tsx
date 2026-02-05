/**
 * Main App Component - React Native
 * Entry point for Autocab Connect365 Mobile
 * 
 * Phase 1: Basic setup with placeholder views
 * Phase 2: Service integration (SIP, Audio, Permissions)
 * Phase 3: Full UI component migration
 */

import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';

// Initialize i18n
import { initializeI18n } from './src/i18n';
import { initializeVerboseLogging } from './src/utils';
import { useTheme } from './src/styles/theme';

const Tab = createBottomTabNavigator();

/**
 * Placeholder views - will be implemented in Phase 3
 */
function DialView() {
  const { t } = useTranslation();
  const theme = useTheme();
  
  return (
    <View style={[styles.centered, { backgroundColor: theme.background }]}>
      <Text style={[styles.text, { color: theme.text }]}>
        {t('dial')} View - Coming Soon
      </Text>
      <Text style={[styles.subtext, { color: theme.textSecondary }]}>
        Phase 3: UI Component Migration
      </Text>
    </View>
  );
}

function ContactsView() {
  const { t } = useTranslation();
  const theme = useTheme();
  
  return (
    <View style={[styles.centered, { backgroundColor: theme.background }]}>
      <Text style={[styles.text, { color: theme.text }]}>
        {t('contacts')} View - Coming Soon
      </Text>
    </View>
  );
}

function ActivityView() {
  const { t } = useTranslation();
  const theme = useTheme();
  
  return (
    <View style={[styles.centered, { backgroundColor: theme.background }]}>
      <Text style={[styles.text, { color: theme.text }]}>
        {t('activity')} View - Coming Soon
      </Text>
    </View>
  );
}

function SettingsView() {
  const { t } = useTranslation();
  const theme = useTheme();
  
  return (
    <View style={[styles.centered, { backgroundColor: theme.background }]}>
      <Text style={[styles.text, { color: theme.text }]}>
        {t('settings')} View - Coming Soon
      </Text>
    </View>
  );
}

/**
 * Loading screen while app initializes
 */
function LoadingScreen() {
  const theme = useTheme();
  
  return (
    <View style={[styles.centered, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={[styles.loadingText, { color: theme.text }]}>
        Initializing Autocab Connect365...
      </Text>
    </View>
  );
}

/**
 * Main App Component
 */
function App(): React.JSX.Element {
  const [isReady, setIsReady] = useState(false);
  const theme = useTheme();
  const { t } = useTranslation();

  useEffect(() => {
    async function initialize() {
      try {
        console.log('[App] Starting initialization...');
        
        // Initialize i18n
        await initializeI18n();
        console.log('[App] ✓ i18n initialized');
        
        // Initialize verbose logging setting
        await initializeVerboseLogging();
        console.log('[App] ✓ Verbose logging initialized');
        
        // TODO Phase 2: Initialize services
        // - SIPService
        // - Audio routing
        // - Permissions
        
        console.log('[App] ✓ Initialization complete');
        setIsReady(true);
      } catch (error) {
        console.error('[App] Initialization error:', error);
        // Still set ready to show error state
        setIsReady(true);
      }
    }

    initialize();
  }, []);

  if (!isReady) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={theme.background === '#111827' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: theme.primary,
            tabBarInactiveTintColor: theme.textSecondary,
            tabBarStyle: {
              backgroundColor: theme.surface,
              borderTopColor: theme.border,
            },
          }}
        >
          <Tab.Screen
            name="Dial"
            component={DialView}
            options={{
              tabBarLabel: t('dial'),
              tabBarIcon: ({ color, size }) => (
                <Text style={{ fontSize: size, color }}>📞</Text>
              ),
            }}
          />
          <Tab.Screen
            name="Contacts"
            component={ContactsView}
            options={{
              tabBarLabel: t('contacts'),
              tabBarIcon: ({ color, size }) => (
                <Text style={{ fontSize: size, color }}>👥</Text>
              ),
            }}
          />
          <Tab.Screen
            name="Activity"
            component={ActivityView}
            options={{
              tabBarLabel: t('activity'),
              tabBarIcon: ({ color, size }) => (
                <Text style={{ fontSize: size, color }}>📋</Text>
              ),
            }}
          />
          <Tab.Screen
            name="Settings"
            component={SettingsView}
            options={{
              tabBarLabel: t('settings'),
              tabBarIcon: ({ color, size }) => (
                <Text style={{ fontSize: size, color }}>⚙️</Text>
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 14,
    marginTop: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
});

export default App;
