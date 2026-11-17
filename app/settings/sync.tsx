// app/settings/sync.tsx
// Backup and Sync Center Screen (T18 + T19).
// Manages PocketBase optional authentication, sync diagnostics, manual push/pull, and parked operations.

import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Screen, Press, Button, TextField, SegmentedControl, SyncChip } from '@/ui/components';
import { useTheme } from '@/ui/theme/useTheme';
import { useUiStore } from '@/ui/theme/uiStore';
import {
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  isAuthenticated,
  replaceLocalDataForNewOwner,
} from '@/api/auth';
import { syncEngine, type SyncEngineState } from '@/sync/engine';
import { enqueueInitialSync } from '@/sync/enqueueInitial';
import { getParkedOps, retryOp, discardOp } from '@/db/repositories/outbox';
import type { OutboxItem } from '@/db/schema';

export default function SyncScreen(): React.JSX.Element {
  const router = useRouter();
  const { colors, space, radius, type, hit } = useTheme();
  const showToast = useUiStore((state) => state.showToast);

  const [engineState, setEngineState] = useState<SyncEngineState>(syncEngine.getState());
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [parkedOps, setParkedOps] = useState<OutboxItem[]>([]);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSyncingNow, setIsSyncingNow] = useState(false);

  const loadParked = useCallback(async (): Promise<void> => {
    try {
      const ops = await getParkedOps();
      setParkedOps(ops);
    } catch {
      setParkedOps([]);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((state) => {
      setEngineState(state);
      setCurrentUser(getCurrentUser());
    });
    void loadParked();
    return () => unsubscribe();
  }, [loadParked]);

  const handleSignInOrSignUp = async (forceReplace = false): Promise<void> => {
    if (!email.trim() || !password.trim()) {
      setAuthError('Email and password are required.');
      return;
    }

    setAuthError(null);
    setIsSubmittingAuth(true);

    try {
      if (authMode === 'signup') {
        const signupRes = await signUp(email.trim(), password.trim(), password.trim());
        if (!signupRes.ok) {
          setAuthError(signupRes.error.message || 'Could not create account');
          setIsSubmittingAuth(false);
          return;
        }
      }

      const res = await signIn(email.trim(), password.trim(), { forceReplace });
      if (!res.ok) {
        if (res.error.class === 'conflict') {
          // Account guard prompt: Local data belongs to another user
          Alert.alert(
            'Account Mismatch',
            'Local data on this phone belongs to a different account. Do you want to replace local data with your account data, or cancel?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Replace Local Data',
                style: 'destructive',
                onPress: async () => {
                  try {
                    setIsSubmittingAuth(true);
                    const retryRes = await signIn(email.trim(), password.trim(), {
                      forceReplace: true,
                    });
                    if (retryRes.ok) {
                      await replaceLocalDataForNewOwner(retryRes.value.user.id);
                      await syncEngine.sync();
                      showToast({ message: 'Account connected and synchronized.' });
                    }
                  } catch {
                    Alert.alert('Error', 'Failed to replace local data.');
                  } finally {
                    setIsSubmittingAuth(false);
                  }
                },
              },
            ]
          );
        } else {
          setAuthError(res.error.message || 'Authentication failed');
        }
        setIsSubmittingAuth(false);
        return;
      }

      // First sign-in success: enqueue existing local data
      await enqueueInitialSync();
      void syncEngine.sync();
      setCurrentUser(getCurrentUser());
      showToast({ message: 'Signed in successfully. Syncing...' });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setAuthError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleSignOut = async (): Promise<void> => {
    Alert.alert(
      'Sign Out',
      'Local data will remain on this phone. Automatic backup and sync will pause until you sign in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            setCurrentUser(null);
            await syncEngine.refreshCounts();
            showToast({ message: 'Signed out.' });
          },
        },
      ]
    );
  };

  const handleSyncNow = async (): Promise<void> => {
    if (!engineState.isOnline) {
      showToast({ message: "You're offline. Changes are saved locally." });
      return;
    }
    setIsSyncingNow(true);
    try {
      await syncEngine.sync();
      await loadParked();
      showToast({ message: 'Sync complete.' });
    } catch {
      showToast({ message: 'Sync failed. Will retry automatically.' });
    } finally {
      setIsSyncingNow(false);
    }
  };

  const handleRetryParked = async (seq: number): Promise<void> => {
    await retryOp(seq);
    await loadParked();
    syncEngine.requestSync();
    showToast({ message: 'Retrying item...' });
  };

  const handleDiscardParked = async (seq: number): Promise<void> => {
    await discardOp(seq);
    await loadParked();
    void syncEngine.refreshCounts();
    showToast({ message: 'Item discarded.' });
  };

  const formatLastSynced = (): string => {
    if (!engineState.lastSyncedAt) return 'Never';
    const seconds = Math.floor((Date.now() - engineState.lastSyncedAt) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const signedIn = isAuthenticated() && !!currentUser;

  return (
    <Screen style={styles.container}>
      {/* Header */}
      <View
        style={[
          styles.headerBar,
          {
            paddingHorizontal: space.lg,
            paddingVertical: space.md,
            borderBottomColor: colors.hairline,
            borderBottomWidth: 1,
          },
        ]}
      >
        <Press
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={[styles.backButton, { minHeight: hit.min, minWidth: hit.min }]}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Press>
        <Text style={[type.heading, { color: colors.text }]}>Backup & Sync</Text>
        <View style={{ width: hit.min }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { padding: space.lg, gap: space.xl }]}
        >
          {!signedIn ? (
            /* Not signed in: Intro & Sign-in / Sign-up form */
            <View style={{ gap: space.lg }}>
              <View style={{ gap: space.xs }}>
                <Text style={[type.title, { color: colors.text }]}>Sync with PocketBase</Text>
                <Text style={[type.body, { color: colors.textSecondary }]}>
                  Optional cloud sync. Your data stays on this device and works offline. Sign in to
                  keep an encrypted backup or access your spending on other devices.
                </Text>
              </View>

              <SegmentedControl
                options={[
                  { label: 'Sign In', value: 'signin' },
                  { label: 'Create Account', value: 'signup' },
                ]}
                value={authMode}
                onChange={(val) => {
                  setAuthMode(val as 'signin' | 'signup');
                  setAuthError(null);
                }}
              />

              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    padding: space.lg,
                    gap: space.md,
                  },
                ]}
              >
                <TextField
                  label="Email address"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />

                <TextField
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />

                {authError ? (
                  <Text style={[type.caption, { color: colors.danger }]}>{authError}</Text>
                ) : null}

                <Button
                  label={authMode === 'signin' ? 'Sign In & Sync' : 'Create Account & Sync'}
                  variant="primary"
                  loading={isSubmittingAuth}
                  onPress={() => void handleSignInOrSignUp(false)}
                />
              </View>
            </View>
          ) : (
            /* Signed in: Account info & sync diagnostics */
            <View style={{ gap: space.lg }}>
              {/* Account card */}
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    padding: space.lg,
                    gap: space.sm,
                  },
                ]}
              >
                <View style={styles.cardRow}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[type.caption, { color: colors.textSecondary }]}>
                      CONNECTED ACCOUNT
                    </Text>
                    <Text style={[type.heading, { color: colors.text }]}>{currentUser.email}</Text>
                  </View>
                  <SyncChip
                    status={engineState.status}
                    pendingCount={engineState.pendingCount}
                    onPress={() => void handleSyncNow()}
                  />
                </View>
              </View>

              {/* Status & Stats */}
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    padding: space.lg,
                    gap: space.md,
                  },
                ]}
              >
                <Text style={[type.label, { color: colors.textSecondary }]}>SYNC STATUS</Text>

                <View style={styles.statRow}>
                  <Text style={[type.body, { color: colors.text }]}>Last Synced</Text>
                  <Text style={[type.body, { color: colors.textSecondary }]}>
                    {formatLastSynced()}
                  </Text>
                </View>

                <View style={styles.statRow}>
                  <Text style={[type.body, { color: colors.text }]}>Waiting to Upload</Text>
                  <Text style={[type.body, { color: colors.textSecondary }]}>
                    {engineState.pendingCount}
                  </Text>
                </View>

                <View style={styles.statRow}>
                  <Text style={[type.body, { color: colors.text }]}>Connection</Text>
                  <Text
                    style={[
                      type.body,
                      { color: engineState.isOnline ? colors.income : colors.textSecondary },
                    ]}
                  >
                    {engineState.isOnline ? 'Online' : 'Offline'}
                  </Text>
                </View>

                <Button
                  label={isSyncingNow || engineState.isDraining ? 'Syncing...' : 'Sync Now'}
                  variant="secondary"
                  disabled={isSyncingNow || engineState.isDraining || !engineState.isOnline}
                  onPress={() => void handleSyncNow()}
                />
              </View>

              {/* Parked / Failed items if any */}
              {parkedOps.length > 0 ? (
                <View style={{ gap: space.sm }}>
                  <Text style={[type.label, { color: colors.danger }]}>FAILED ITEMS</Text>
                  {parkedOps.map((op) => (
                    <View
                      key={op.seq}
                      style={[
                        styles.card,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                          borderRadius: radius.md,
                          padding: space.md,
                          gap: space.sm,
                        },
                      ]}
                    >
                      <View style={styles.cardRow}>
                        <Text style={[type.caption, { color: colors.text, textTransform: 'uppercase' }]}>
                          {op.entity} ({op.op})
                        </Text>
                      </View>
                      <Text style={[type.caption, { color: colors.danger }]}>
                        {op.lastError || 'Validation or conflict error'}
                      </Text>
                      <View style={[styles.cardRow, { gap: space.sm }]}>
                        <Button
                          label="Retry"
                          variant="secondary"
                          onPress={() => void handleRetryParked(op.seq)}
                        />
                        <Button
                          label="Discard"
                          variant="ghost"
                          onPress={() => void handleDiscardParked(op.seq)}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}

              {/* Sign out */}
              <View style={{ marginTop: space.md }}>
                <Button label="Sign Out" variant="danger" onPress={() => void handleSignOut()} />
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {},
  card: {
    borderWidth: 1,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
