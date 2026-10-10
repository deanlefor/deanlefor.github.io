// Offline IndexedDB storage. No remote endpoint is used.
const DB_NAME = 'market-register-local';
const DB_VERSION = 1;
const STORES = ['products', 'shows', 'sales', 'meta'];
let opening;
let revision = null;
const REVISION_KEY = 'dataRevision';

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
        const tx = db.transaction(['meta'], 'readonly');
        const read = tx.objectStore('meta').get(REVISION_KEY);
        tx.oncomplete = () => { revision = read.result?.value ?? null; resolve(db); };
        tx.onabort = tx.onerror = () => reject(tx.error || new Error('Could not read local data version.'));
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

// The version check prevents another open copy from writing stale records after
// a reset, restore, or category merge. The check and write share one transaction.
async function write(names, enqueue, message, changesData = false) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([...new Set([...names, 'meta'])], 'readwrite');
    const meta = tx.objectStore('meta');
    const check = meta.get(REVISION_KEY);
    let nextRevision;
    let failure, result;
    const fail = error => { failure = error; tx.abort(); };
    check.onsuccess = () => {
      if ((check.result?.value ?? null) !== revision) {
        return fail(new Error('Data changed in another copy of Market Register. Reload this app before saving.'));
      }
      try {
        nextRevision = changesData ? (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`) : revision;
        enqueue(tx, value => { result = value; }, fail);
        if (changesData) meta.put({ id: REVISION_KEY, value: nextRevision });
      } catch (error) { fail(error); }
    };
    tx.oncomplete = () => { revision = nextRevision; resolve(result); };
    tx.onerror = () => reject(failure || tx.error || new Error(message));
    tx.onabort = () => reject(failure || tx.error || new Error(message));
  });
}

export const put = (storeName, value) => write([storeName], tx => tx.objectStore(storeName).put(value), 'Database write failed.');
export const setMeta = (id, value) => put('meta', { id, value });

export function setMetaValues(values) {
  return write(['meta'], tx => {
    for (const [id, value] of Object.entries(values)) tx.objectStore('meta').put({ id, value });
  }, 'Category settings were not saved.');
}

// Save a product and its remembered category together.
export function commitProduct(product) {
  return write(['products'], tx => {
    tx.objectStore('products').put(product);
    tx.objectStore('meta').put({ id: 'lastProductCategory', value: product.category });
  }, 'Product was not saved.');
}

// A completed sale and clearing its draft cart are one atomic database transaction.
export function commitSale(sale) {
  return write(['sales', 'shows'], (tx, done, fail) => {
    const show = tx.objectStore('shows').get(sale.showId);
    const active = tx.objectStore('meta').get('activeShowId');
    let loaded = 0;
    const save = () => {
      if (++loaded !== 2) return;
      if (!show.result || show.result.completedAt) return fail(new Error('This show is completed or unavailable. Reopen it before recording sales.'));
      if (active.result?.value !== sale.showId) return fail(new Error('The current show changed. Check the selected show before recording this sale.'));
      try {
        tx.objectStore('sales').add(sale);
        tx.objectStore('meta').put({id:'draftCart',value:{}});
      } catch (error) { fail(error); }
    };
    show.onsuccess = active.onsuccess = save;
  }, 'Could not record sale.');
}

const hasDraft = draft => draft && typeof draft === 'object' && Object.values(draft).some(quantity => Number(quantity) > 0);

export function createShow(show) {
  return write(['shows'], (tx, done, fail) => {
    const draft = tx.objectStore('meta').get('draftCart');
    draft.onsuccess = () => {
      if (hasDraft(draft.result?.value)) return fail(new Error('Record or clear the current sale before creating another show.'));
      try {
        tx.objectStore('shows').add({ ...show, completedAt: null });
        tx.objectStore('meta').put({ id: 'activeShowId', value: show.id });
      } catch (error) { fail(error); }
    };
  }, 'Could not create the show.');
}

export function selectShow(id) {
  return write(['shows'], (tx, done, fail) => {
    const meta = tx.objectStore('meta');
    const show = id ? tx.objectStore('shows').get(id) : null;
    const settings = meta.getAll();
    let loaded = 0;
    const select = () => {
      if (++loaded !== (show ? 2 : 1)) return;
      if (id && (!show.result || show.result.completedAt)) return fail(new Error('Choose an open show. Completed shows must be reopened from Shows & reports.'));
      const active = settings.result.find(row => row.id === 'activeShowId')?.value;
      const draft = settings.result.find(row => row.id === 'draftCart')?.value;
      if (hasDraft(draft) && active && active !== id) return fail(new Error('Record or clear the current sale before switching shows.'));
      try { meta.put({ id: 'activeShowId', value: id || null }); } catch (error) { fail(error); }
    };
    settings.onsuccess = select;
    if (show) show.onsuccess = select;
  }, 'Could not select the show.');
}

export function setShowCompleted(id, completed) {
  return write(['shows'], (tx, done, fail) => {
    const shows = tx.objectStore('shows'), meta = tx.objectStore('meta');
    const show = shows.get(id), settings = meta.getAll();
    let loaded = 0;
    const update = () => {
      if (++loaded !== 2) return;
      if (!show.result) return fail(new Error('This show is no longer available. Reload the app.'));
      const active = settings.result.find(row => row.id === 'activeShowId')?.value;
      const draft = settings.result.find(row => row.id === 'draftCart')?.value;
      if (completed && active === id && hasDraft(draft)) return fail(new Error('Record or clear the current sale before completing this show.'));
      try {
        const updated = { ...show.result, completedAt: completed ? (show.result.completedAt || new Date().toISOString()) : null };
        shows.put(updated);
        if (completed && active === id) meta.put({ id: 'activeShowId', value: null });
        done(updated);
      } catch (error) { fail(error); }
    };
    show.onsuccess = settings.onsuccess = update;
  }, 'The show status was not saved.', true);
}

export function voidRecordedSale(id) {
  return write(['sales', 'shows'], (tx, done, fail) => {
    const sales = tx.objectStore('sales');
    const sale = sales.get(id);
    sale.onsuccess = () => {
      if (!sale.result) return fail(new Error('This sale is no longer available. Reload the app.'));
      const show = tx.objectStore('shows').get(sale.result.showId);
      show.onsuccess = () => {
        if (!show.result || show.result.completedAt) return fail(new Error('This show is completed. Reopen it before voiding a sale.'));
        try {
          const updated = { ...sale.result, voidedAt: sale.result.voidedAt || new Date().toISOString() };
          sales.put(updated); done(updated);
        } catch (error) { fail(error); }
      };
    };
  }, 'The sale was not voided.');
}

const categoryKey = value => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US') : '';
export function changeCategory(source, target = null) {
  const sourceKey = categoryKey(source), targetKey = categoryKey(target);
  if (!sourceKey || (target !== null && (!targetKey || targetKey === sourceKey))) return Promise.reject(new Error('Choose two different categories to merge.'));
  return write(['products'], (tx, done, fail) => {
    const products = tx.objectStore('products'), meta = tx.objectStore('meta');
    const rows = products.getAll(), settings = meta.getAll();
    let loaded = 0;
    const apply = () => {
      if (++loaded !== 2) return;
      try {
        const matching = rows.result.filter(product => categoryKey(product.category) === sourceKey);
        if (!target && matching.length) return fail(new Error('This category still has products, including hidden products. Merge it instead.'));
        const get = (id, fallback) => settings.result.find(row => row.id === id)?.value ?? fallback;
        const strings = value => Array.isArray(value) ? value.filter(item => typeof item === 'string') : [];
        const categories = strings(get('productCategories', [])).filter(name => categoryKey(name) !== sourceKey);
        const removed = strings(get('removedProductCategories', [])).filter(name => categoryKey(name) !== targetKey);
        if (!removed.some(name => categoryKey(name) === sourceKey)) removed.push(source);
        if (target && !categories.some(name => categoryKey(name) === targetKey)) categories.push(target);
        for (const product of matching) products.put({ ...product, category: target, updatedAt: new Date().toISOString() });
        meta.put({ id: 'productCategories', value: categories });
        meta.put({ id: 'removedProductCategories', value: removed });
        if (categoryKey(get('lastProductCategory', null)) === sourceKey) meta.put({ id: 'lastProductCategory', value: target });
        done(matching.length);
      } catch (error) { fail(error); }
    };
    rows.onsuccess = settings.onsuccess = apply;
  }, 'Category changes were not saved.', true);
}

// Clears only this app's records. Static offline files and other tools remain.
export function clearAllData() {
  return write(STORES, tx => {
    for (const name of STORES) tx.objectStore(name).clear();
  }, 'Deletion failed. Your data was not removed.', true);
}

// Consistent backup snapshot from one readonly transaction.
export async function snapshot() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES, 'readonly');
    const results = {};
    for (const name of STORES) {
      const req = tx.objectStore(name).getAll();
      req.onsuccess = () => { results[name] = (req.result || []).filter(row => name !== 'meta' || row.id !== REVISION_KEY); };
    }
    tx.oncomplete = () => resolve(results);
    tx.onerror = () => reject(tx.error || new Error('Could not create backup snapshot.'));
    tx.onabort = () => reject(tx.error || new Error('Could not create backup snapshot.'));
  });
}

// One atomic transaction: an interrupted restore cannot leave a half-replaced database.
export function restore(snapshotData) {
  return write(STORES, tx => {
    for (const name of STORES) {
      const store = tx.objectStore(name);
      store.clear();
      for (const row of snapshotData[name]) if (name !== 'meta' || row.id !== REVISION_KEY) store.add(row);
    }
  }, 'Restore failed: no data was replaced.', true);
}
