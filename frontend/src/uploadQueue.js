const DB_NAME = 'sauroraa-album'
const DB_VERSION = 1
const STORE_NAME = 'upload_queue'

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('event_kind', ['eventId', 'kind'], { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withStore(mode, callback) {
  const db = await openDb()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode)
    const store = transaction.objectStore(STORE_NAME)
    callback(store, transaction, resolve, reject)
    transaction.onerror = () => reject(transaction.error)
    transaction.oncomplete = () => db.close()
  })
}

export async function replaceUploadQueue(eventId, kind, files) {
  const normalizedFiles = Array.from(files)
  const existing = await getUploadQueue(eventId, kind)
  if (existing.length) {
    await removeUploadQueueItems(existing.map((item) => item.id))
  }

  if (!normalizedFiles.length) return []

  const items = normalizedFiles.map((file, index) => ({
    id: `${eventId}:${kind}:${Date.now()}:${index}:${file.name}`,
    eventId: String(eventId),
    kind,
    name: file.name,
    size: file.size,
    lastModified: file.lastModified,
    file,
  }))

  await withStore('readwrite', (store, _transaction, resolve) => {
    items.forEach((item) => store.put(item))
    resolve(items)
  })

  return items
}

export async function getUploadQueue(eventId, kind) {
  return withStore('readonly', (store, _transaction, resolve, reject) => {
    const index = store.index('event_kind')
    const request = index.getAll([String(eventId), kind])
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

export async function removeUploadQueueItems(ids) {
  if (!ids.length) return

  await withStore('readwrite', (store, _transaction, resolve) => {
    ids.forEach((id) => store.delete(id))
    resolve(true)
  })
}
