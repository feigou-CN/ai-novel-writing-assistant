import type { StoreName } from '@/types'

const DB_NAME = 'novel-web-tool'
const DB_VERSION = 4

function getObjectStores(): IDBObjectStoreParameters[] {
  return [
    // Each store indexed by novelId for easy querying
  ]
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains('novels')) {
        db.createObjectStore('novels', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('chapters')) {
        const store = db.createObjectStore('chapters', { keyPath: 'id' })
        store.createIndex('novelId', 'novelId', { unique: false })
      }
      if (!db.objectStoreNames.contains('characters')) {
        const store = db.createObjectStore('characters', { keyPath: 'id' })
        store.createIndex('novelId', 'novelId', { unique: false })
      }
      if (!db.objectStoreNames.contains('worldSettings')) {
        const store = db.createObjectStore('worldSettings', { keyPath: 'id' })
        store.createIndex('novelId', 'novelId', { unique: false })
      }
      if (!db.objectStoreNames.contains('events')) {
        const store = db.createObjectStore('events', { keyPath: 'id' })
        store.createIndex('novelId', 'novelId', { unique: false })
      }
      if (!db.objectStoreNames.contains('outlines')) {
        db.createObjectStore('outlines', { keyPath: 'novelId' })
      }
      if (!db.objectStoreNames.contains('chatMessages')) {
        const store = db.createObjectStore('chatMessages', { keyPath: 'id' })
        store.createIndex('novelId', 'novelId', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
      if (!db.objectStoreNames.contains('novelMemory')) {
        db.createObjectStore('novelMemory', { keyPath: 'novelId' })
      }
      if (!db.objectStoreNames.contains('timelineTracks')) {
        const store = db.createObjectStore('timelineTracks', { keyPath: 'id' })
        store.createIndex('novelId', 'novelId', { unique: false })
      }
      if (!db.objectStoreNames.contains('timelineEvents')) {
        const store = db.createObjectStore('timelineEvents', { keyPath: 'id' })
        store.createIndex('novelId', 'novelId', { unique: false })
      }
      if (!db.objectStoreNames.contains('characterRelations')) {
        const store = db.createObjectStore('characterRelations', { keyPath: 'id' })
        store.createIndex('novelId', 'novelId', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

let _db: IDBDatabase | null = null

async function getDB(): Promise<IDBDatabase> {
  if (_db) return _db
  _db = await openDB()
  return _db
}

export async function getAll<T>(storeName: StoreName): Promise<T[]> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result as T[])
    request.onerror = () => reject(request.error)
  })
}

export async function get<T>(storeName: StoreName, key: string): Promise<T | undefined> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const request = store.get(key)
    request.onsuccess = () => resolve(request.result as T | undefined)
    request.onerror = () => reject(request.error)
  })
}

export async function put<T>(storeName: StoreName, data: T): Promise<void> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.put(data)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function del(storeName: StoreName, key: string): Promise<void> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.delete(key)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function getAllByIndex<T>(
  storeName: StoreName,
  indexName: string,
  value: string
): Promise<T[]> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const index = store.index(indexName)
    const request = index.getAll(value)
    request.onsuccess = () => resolve(request.result as T[])
    request.onerror = () => reject(request.error)
  })
}

export async function deleteByIndex(
  storeName: StoreName,
  indexName: string,
  value: string
): Promise<void> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const index = store.index(indexName)
    const request = index.openCursor(value)

    request.onsuccess = () => {
      const cursor = request.result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      } else {
        resolve()
      }
    }
    request.onerror = () => reject(request.error)
  })
}
