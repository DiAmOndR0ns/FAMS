import { OfflineSyncOp } from "../types";

const QUEUE_KEY = "fams_offline_sync_queue";

export function getSyncQueue(): OfflineSyncOp[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Failed to read sync queue", error);
    return [];
  }
}

export function saveSyncQueue(queue: OfflineSyncOp[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error("Failed to save sync queue", error);
  }
}

export function addSyncOp(entity: OfflineSyncOp["entity"], type: OfflineSyncOp["type"], payload: any, actor: string) {
  const queue = getSyncQueue();
  const op: OfflineSyncOp = {
    id: `OP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    type,
    entity,
    payload,
    timestamp: new Date().toISOString(),
    actor
  };
  queue.push(op);
  saveSyncQueue(queue);
  
  // Also save locally to cache so offline reading displays it
  const cachedListKey = `fams_cache_${entity}`;
  try {
    const rawCache = localStorage.getItem(cachedListKey);
    const list = rawCache ? JSON.parse(rawCache) : [];
    if (type === "create") {
      list.unshift({ ...payload, id: payload.id || `SYNC-LOCAL-${Date.now()}`, isOfflinePlaceholder: true });
    } else if (type === "edit") {
      const idx = list.findIndex((x: any) => x.id === payload.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...payload, isOfflineModified: true };
      }
    }
    localStorage.setItem(cachedListKey, JSON.stringify(list));
  } catch (e) {
    console.error("Failed to update entity cache", e);
  }
}

export function clearSyncQueue() {
  saveSyncQueue([]);
}

// Keep local entity lists in cache for immediate instant rendering
export function getLocalCache<T>(entity: string, fallbackData: T[]): T[] {
  try {
    const raw = localStorage.getItem(`fams_cache_${entity}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Cache read failed", e);
  }
  // Store fallback to cache as initial bootstrap
  setLocalCache(entity, fallbackData);
  return fallbackData;
}

export function setLocalCache<T>(entity: string, data: T[]) {
  try {
    localStorage.setItem(`fams_cache_${entity}`, JSON.stringify(data));
  } catch (e) {
    console.error("Cache write failed", e);
  }
}
