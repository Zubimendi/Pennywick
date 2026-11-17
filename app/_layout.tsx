import React, { useEffect, useState, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, Text, AppState, AppStateStatus } from 'react-native';
import { Toast } from '@/ui/components/Toast';
import { Button } from '@/ui/components/Button';
import { AppLockOverlay } from '@/ui/components/AppLockOverlay';
import { useTheme } from '@/ui/theme/useTheme';
import { initDatabase } from '@/db/init';
import { getSetting, SETTINGS_KEYS } from '@/db/repositories/settings';
import { runRecurrenceCatchUp } from '@/features/recurring/recurrenceEngine';
import { syncEngine } from '@/sync/engine';

export function ErrorBoundary({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}): React.JSX.Element {
  const { colors, space, type } = useTheme();

  return (
    <View
      style={[
        styles.recoveryContainer,
        { backgroundColor: colors.bg, padding: space.xl, gap: space.md },
      ]}
    >
      <Text style={[type.title, { color: colors.danger }]}>Database Error</Text>
      <Text style={[type.body, { color: colors.textSecondary }]}>
        {error.message || 'Pennywick encountered a problem loading local data.'}
      </Text>
      <Button label="Restart" onPress={retry} variant="primary" />
    </View>
  );
}

export default function RootLayout(): React.JSX.Element {
  const { colors, isDark } = useTheme();
  const [isDbReady, setIsDbReady] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [savedPin, setSavedPin] = useState<string | null>(null);
  const backgroundTimeRef = useRef<number | null>(null);

  useEffect(() => {
    async function prepare(): Promise<void> {
      try {
        await initDatabase();
        setIsDbReady(true);
        void runRecurrenceCatchUp();
        void syncEngine.start();
      } catch (err) {
        console.error('Failed to initialize database:', err);
        setInitError(err instanceof Error ? err : new Error('DB initialization error'));
      }
    }
    void prepare();

    const subscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundTimeRef.current = Date.now();
      } else if (nextState === 'active') {
        void runRecurrenceCatchUp();

        // Check if App Lock is enabled and 60 seconds have elapsed
        if (backgroundTimeRef.current) {
          const elapsedMs = Date.now() - backgroundTimeRef.current;
          if (elapsedMs >= 60000) {
            try {
              const lockEnabled = await getSetting(SETTINGS_KEYS.APP_LOCK);
              if (lockEnabled === 'true') {
                const pin = await getSetting(SETTINGS_KEYS.APP_LOCK_PIN);
                setSavedPin(pin);
                setIsLocked(true);
              }
            } catch (e) {
              console.error('Failed to check app lock setting:', e);
            }
          }
        }
        backgroundTimeRef.current = null;
      }
    });

    return () => {
      subscription.remove();
      syncEngine.stop();
    };
  }, []);

  if (initError) {
    return (
      <ErrorBoundary
        error={initError}
        retry={() => {
          setInitError(null);
          void initDatabase().then(() => setIsDbReady(true));
        }}
      />
    );
  }

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.root}>
        {isDbReady ? (
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="add"
              options={{
                presentation: 'modal',
                headerShown: false,
              }}
            />
            <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
          </Stack>
        ) : (
          <View style={[styles.root, { backgroundColor: colors.bg }]} />
        )}
        <Toast />
        {isLocked && (
          <AppLockOverlay
            onUnlock={() => setIsLocked(false)}
            savedPin={savedPin}
          />
        )}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  recoveryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
