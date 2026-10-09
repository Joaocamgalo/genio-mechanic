import type { SyncQueueItem, SyncQueueStatus } from './syncTypes';

export function updateSyncStatus<T>(
  item: SyncQueueItem<T>,
  status: SyncQueueStatus,
  now = new Date()
): SyncQueueItem<T> {
  return {
    ...item,
    status,
    updatedAt: now.toISOString(),
  };
}

export function registerSyncFailure<T>(
  item: SyncQueueItem<T>,
  message: string,
  nextAttemptAt: string | null,
  now = new Date()
): SyncQueueItem<T> {
  return {
    ...item,
    status: 'failed',
    attempts: item.attempts + 1,
    lastError: message,
    nextAttemptAt,
    updatedAt: now.toISOString(),
  };
}
