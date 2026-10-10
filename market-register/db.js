// Offline IndexedDB storage. No remote endpoint is used.
const DB_NAME = 'market-register-local';
const DB_VERSION = 1;
const STORES = ['products', 'shows', 'sales', 'meta'];
let opening;

export function openDB() {
  if (!opening) {
    opening = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB is unavailable on this browser.'));
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const name of STORES) if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => { db.close(); opening = null; };
        resolve(db);
      };
      req.onerror = () => reject(req.error || new Error('Could not open local database.'));
      req.onblocked = () => reject(new Error('Close other copies of this app and try again.'));
    });
  }
  return opening;
}

export async function getAll(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], 'readonly');
    const req = tx.objectStore(storeName).getAll();
    tx.oncomplete = () => resolve(req.result || []);
    tx.onerror = () => reject(tx.error || new Error('Database read failed.'));
    tx.onabort = () => reject(tx.error || new Error('Database read aborted.'));
  });
}

export async function getMeta(id, fallback = null) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['meta'], 'readonly');
    const req = tx.objectStore('meta').get(id);
    tx.oncomplete = () => resolve(req.result ? req.result.value : fallback);
    tx.onerror = () => reject(tx.error || new Error('Could not read settings.'));
  });
}

export async function put(storeName, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], 'readwrite');
    tx.objectStore(storeName).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Database write failed.'));
    tx.onabort = () => reject(tx.error || new Error('Database write aborted.'));
  });
}

export const setMeta = (id, value) => put('meta', { id, value });

// A completed sale and clearing its draft cart are one atomic database transaction.
export async function commitSale(sale) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['sales', 'meta'], 'readwrite');
    tx.objectStore('sales').add(sale);
    tx.objectStore('meta').put({id:'draftCart',value:{}});
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Could not record sale.'));
    tx.onabort = () => reject(tx.error || new Error('Could not record sale.'));
  });
}

// Consistent backup snapshot from one readonly transaction.
export async function snapshot() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES, 'readonly');
    const results = {};
    for (const name of STORES) {
      const req = tx.objectStore(name).getAll();
      req.onsuccess = () => { results[name] = req.result || []; };
    }
    tx.oncomplete = () => resolve(results);
    tx.onerror = () => reject(tx.error || new Error('Could not create backup snapshot.'));
    tx.onabort = () => reject(tx.error || new Error('Could not create backup snapshot.'));
  });
}

// One atomic transaction: an interrupted restore cannot leave a half-replaced database.
export async function restore(snapshotData) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES, 'readwrite');
    for (const name of STORES) {
      const store = tx.objectStore(name);
      store.clear();
      for (const row of snapshotData[name]) store.add(row);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Restore failed: no data was replaced.'));
    tx.onabort = () => reject(tx.error || new Error('Restore aborted: no data was replaced.'));
  });
}
