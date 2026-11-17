// src/sync/engine.ts
// Sync engine coordinator: listens to network & app state, orchestrates push/pull lifecycle.

import { AppState, type AppStateStatus } from 'react-native';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { drainOutbox } from './push';
import { pullChanges } from './pull';
import { getAllPendingCount, getParkedCount, setSyncNotifier } from '../db/repositories/outbox';
import { deriveSyncStatus, type SyncStatusType } from './status';
import { isAuthenticated, refreshAuth } from '../api/auth';
import { logger } from '../lib/logger';
import { now } from '../lib/clock';

export interface SyncEngineState {
  status: SyncStatusType;
  isSignedIn: boolean;
  isOnline: boolean;
  isDraining: boolean;
  isPulling: boolean;
  pendingCount: number;
  parkedCount: number;
  hasAuthIssue: boolean;
  lastSyncedAt: number | null;
}

type Listener = (state: SyncEngineState) => void;

class SyncEngine {
  private state: SyncEngineState = {
    status: 'not_signed_in',
    isSignedIn: false,
    isOnline: true,
    isDraining: false,
    isPulling: false,
    pendingCount: 0,
    parkedCount: 0,
    hasAuthIssue: false,
    lastSyncedAt: null,
  };

  private listeners = new Set<Listener>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribeNetInfo: (() => void) | null = null;
  private appStateSubscription: { remove: () => void } | null = null;
  private isStarted = false;

  public getState(): SyncEngineState {
    return { ...this.state };
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const derived = deriveSyncStatus({
      isSignedIn: this.state.isSignedIn,
      isOnline: this.state.isOnline,
      isDraining: this.state.isDraining,
      isPulling: this.state.isPulling,
      hasAuthIssue: this.state.hasAuthIssue,
      parkedOpsCount: this.state.parkedCount,
      pendingOpsCount: this.state.pendingCount,
    });

    this.state.status = derived;
    const snapshot = this.getState();
    this.listeners.forEach((l) => l(snapshot));
  }

  /**
   * Starts the sync engine.
   * Architecture rule: Call after first interactive render, never during module load.
   */
  public async start(): Promise<void> {
    if (this.isStarted) return;
    this.isStarted = true;

    // 1. Listen to network connectivity
    this.unsubscribeNetInfo = NetInfo.addEventListener((netState: NetInfoState) => {
      const wasOffline = !this.state.isOnline;
      this.state.isOnline = Boolean(netState.isConnected && netState.isInternetReachable !== false);

      // On connectivity regained, trigger sync
      if (wasOffline && this.state.isOnline) {
        logger.info('syncEngine:network_regained');
        void this.sync();
      }
      this.notify();
    });

    // 2. Listen to AppState foreground
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        logger.info('syncEngine:foreground_active');
        void this.sync();
      }
    });

    // 3. Initial check
    this.state.isSignedIn = isAuthenticated();
    await this.refreshCounts();

    // 4. Kick off initial sync if authenticated
    if (this.state.isSignedIn) {
      void this.sync();
    }
  }

  public stop(): void {
    if (!this.isStarted) return;
    this.isStarted = false;

    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Request a sync with 300 ms debounce (called after local repo writes).
   */
  public requestSync(): void {
    void this.refreshCounts();
    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    this.debounceTimer = setTimeout(() => {
      void this.sync();
    }, 300);
  }

  /**
   * Full sync cycle: drain outbox (push), then pull changes.
   */
  public async sync(): Promise<void> {
    this.state.isSignedIn = isAuthenticated();
    if (!this.state.isSignedIn || !this.state.isOnline || this.state.isDraining) {
      await this.refreshCounts();
      return;
    }

    this.state.isDraining = true;
    this.notify();

    try {
      // 1. Push pending changes
      await drainOutbox();

      // 2. Pull server changes
      this.state.isPulling = true;
      this.notify();
      await pullChanges();

      this.state.lastSyncedAt = now();
      this.state.hasAuthIssue = false;
    } catch (err: unknown) {
      logger.warn('syncEngine:sync_error', { error: String(err) });
      const status = (err as { status?: number })?.status;
      if (status === 401) {
        // Attempt single token refresh
        const refreshed = await refreshAuth();
        if (!refreshed.ok) {
          this.state.hasAuthIssue = true;
        }
      }
    } finally {
      this.state.isDraining = false;
      this.state.isPulling = false;
      await this.refreshCounts();
    }
  }

  public async refreshCounts(): Promise<void> {
    this.state.isSignedIn = isAuthenticated();
    this.state.pendingCount = await getAllPendingCount();
    this.state.parkedCount = await getParkedCount();
    this.notify();
  }
}

export const syncEngine = new SyncEngine();

// Connect repository writes to debounced engine sync
setSyncNotifier(() => {
  syncEngine.requestSync();
});

/** Convenience helper for repositories to request sync without full engine import. */
export function requestSync(): void {
  syncEngine.requestSync();
}
