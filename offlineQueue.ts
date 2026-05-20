// Offline action queue using IndexedDB
// Actions taken offline are queued and replayed when connectivity returns

const DB_NAME = 'helikon-offline'
const DB_VERSION = 1
const STORE_NAME = 'action-queue'

export interface OfflineAction {
  id: string
  type: string
  payload: Record<string, unknown>
  timestamp: number
  retries: number
}

let db: IDBDatabase | null = null

async function openDB(): Promise<IDBDatabase> {
  if (db) return db
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const database = (e.target as IDBOpenDBRequest).result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    req.onsuccess = (e) => {
      db = (e.target as IDBOpenDBRequest).result
      resolve(db)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function enqueueAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retries'>): Promise<void> {
  const database = await openDB()
  const item: OfflineAction = {
    ...action,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    retries: 0,
  }
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.add(item)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function getQueuedActions(): Promise<OfflineAction[]> {
  const database = await openDB()
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function removeAction(id: string): Promise<void> {
  const database = await openDB()
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function getQueueSize(): Promise<number> {
  const actions = await getQueuedActions()
  return actions.length
}

// Sync queued actions when back online
export function startSyncListener(
  onSync: (action: OfflineAction) => Promise<void>
): () => void {
  const handleOnline = async () => {
    const actions = await getQueuedActions()
    for (const action of actions) {
      try {
        await onSync(action)
        await removeAction(action.id)
      } catch (err) {
        console.error('Failed to sync offline action', action.id, err)
      }
    }
  }

  window.addEventListener('online', handleOnline)
  // Also try immediately on mount in case we're already online
  if (navigator.onLine) handleOnline()

  return () => window.removeEventListener('online', handleOnline)
}
