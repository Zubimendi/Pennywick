// src/sync/status.ts
// Sync status derivation based on network connectivity, engine activity, and outbox state.

export type SyncStatusType = 'not_signed_in' | 'offline' | 'syncing' | 'issue' | 'pending' | 'up_to_date';

export interface SyncStateSnapshot {
  isSignedIn: boolean;
  isOnline: boolean;
  isDraining: boolean;
  isPulling: boolean;
  hasAuthIssue: boolean;
  parkedOpsCount: number;
  pendingOpsCount: number;
}

/**
 * Derives the high-level sync status according to architecture rules:
 * 1. Not signed in: no sync active
 * 2. Offline: NetInfo reports no connection
 * 3. Syncing: Engine drain or pull in progress
 * 4. Issue: Parked ops exist or auth needs renewal
 * 5. Pending: Pending ops exist and not syncing
 * 6. Up to date: None of the above
 */
export function deriveSyncStatus(state: SyncStateSnapshot): SyncStatusType {
  if (!state.isSignedIn) {
    return 'not_signed_in';
  }

  if (!state.isOnline) {
    return 'offline';
  }

  if (state.isDraining || state.isPulling) {
    return 'syncing';
  }

  if (state.hasAuthIssue || state.parkedOpsCount > 0) {
    return 'issue';
  }

  if (state.pendingOpsCount > 0) {
    return 'pending';
  }

  return 'up_to_date';
}

export interface SyncChipInfo {
  status: SyncStatusType;
  label: string;
  icon: string;
  colorKey: 'income' | 'warning' | 'danger' | 'textSecondary';
}

export function getSyncChipInfo(status: SyncStatusType, pendingCount = 0): SyncChipInfo | null {
  switch (status) {
    case 'not_signed_in':
      return null;
    case 'up_to_date':
      return {
        status,
        label: 'Up to date',
        icon: 'checkmark-circle-outline',
        colorKey: 'income',
      };
    case 'syncing':
      return {
        status,
        label: 'Syncing',
        icon: 'sync-outline',
        colorKey: 'warning',
      };
    case 'pending':
      return {
        status,
        label: pendingCount === 1 ? '1 waiting' : `${pendingCount} waiting`,
        icon: 'cloud-upload-outline',
        colorKey: 'warning',
      };
    case 'offline':
      return {
        status,
        label: 'Offline',
        icon: 'cloud-offline-outline',
        colorKey: 'textSecondary',
      };
    case 'issue':
      return {
        status,
        label: 'Sync issue',
        icon: 'alert-circle-outline',
        colorKey: 'danger',
      };
  }
}
