const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { IDBFactory } = require('fake-indexeddb');

const source = fs.readFileSync(path.join(__dirname, '../market-register/db.js'), 'utf8').replace(/^export /gm, '');
function storage(indexedDB = new IDBFactory()) {
  return vm.runInNewContext(`${source}\n({ openDB, getAll, getMeta, put, setMeta, setMetaValues, commitProduct, commitSale, changeCategory, clearAllData, snapshot, restore });`, {
    indexedDB, window: { indexedDB }, crypto, Date, console,
  });
}
const copy = value => JSON.parse(JSON.stringify(value));
function records() {
  return {
    products: [
      { id: 'p1', name: 'Test coaster', category: 'Caosters', active: true, priceCents: 1200, photo: 'data:image/jpeg;base64,example' },
      { id: 'p2', name: 'Hidden coaster', category: ' caosters ', active: false, priceCents: 400, photo: null },
      { id: 'p3', name: 'Other product', category: 'Jewelry', active: true, priceCents: 500 },
    ],
    shows: [{ id: 'show1', name: 'Test market', date: '2026-10-10' }],
    sales: [{ id: 'sale1', showId: 'show1', lines: [{ category: 'Caosters' }], totalCents: 1200, voidedAt: null }],
    meta: [
      { id: 'productCategories', value: ['Caosters','Empty category'] },
      { id: 'lastProductCategory', value: 'Caosters' },
      { id: 'draftCart', value: { p1: 2 } },
      { id: 'photoSize', value: 512 },
      { id: 'lastBackupPreparedAt', value: '2026-10-10T12:00:00Z' },
    ],
  };
}

test('merge moves active and hidden products, preserves photos and sales, and survives backup/restore', async () => {
  const db = storage();
  const before = records();
  await db.restore(before);
  assert.equal(await db.changeCategory('Caosters','Coasters'), 2);
  const after = copy(await db.snapshot());
  assert.equal(after.products.find(p => p.id === 'p1').category, 'Coasters');
  assert.equal(after.products.find(p => p.id === 'p1').photo, before.products[0].photo);
  assert.equal(after.products.find(p => p.id === 'p2').category, 'Coasters');
  assert.equal(after.products.find(p => p.id === 'p2').active, false);
  assert.deepEqual(after.products.find(p => p.id === 'p3'), before.products[2]);
  assert.deepEqual(after.sales, before.sales);
  assert.deepEqual(after.shows, before.shows);
  assert.equal(await db.getMeta('lastProductCategory'), 'Coasters');
  assert.deepEqual(copy(await db.getMeta('removedProductCategories')), ['Caosters']);
  assert.deepEqual(copy(await db.getMeta('draftCart')), { p1: 2 });
  const restored = storage();
  await restored.restore(after);
  assert.deepEqual(copy(await restored.snapshot()), after);
});

test('delete rejects categories in use and persists deletion of custom and starter categories', async () => {
  const db = storage();
  await db.restore(records());
  const before = copy(await db.snapshot());
  await assert.rejects(db.changeCategory('Caosters'), /still has products/);
  assert.deepEqual(copy(await db.snapshot()), before);
  await assert.rejects(db.changeCategory('Coasters',' coasters '), /different categories/);
  await db.changeCategory('Empty category');
  await db.changeCategory('Bracelets');
  assert.deepEqual(copy(await db.getMeta('removedProductCategories')), ['Empty category','Bracelets']);
  assert.deepEqual(copy(await db.getMeta('productCategories')), ['Caosters']);
  assert.deepEqual(copy(await db.getAll('sales')), before.sales);
});

test('a storage error rolls back every part of a category merge', async () => {
  const db = storage();
  await db.restore(records());
  const before = copy(await db.snapshot());
  const connection = await db.openDB();
  const transaction = connection.transaction.bind(connection);
  connection.transaction = (names, mode) => {
    const tx = transaction(names, mode);
    if (mode === 'readwrite') {
      const store = tx.objectStore('products');
      const put = store.put.bind(store);
      store.put = row => { if (row.id === 'p2') throw new Error('Simulated write failure'); return put(row); };
    }
    return tx;
  };
  await assert.rejects(db.changeCategory('Caosters','Coasters'), /Simulated write failure/);
  assert.deepEqual(copy(await db.snapshot()), before);
});

test('clear removes all app records together, preserves other databases, and permits a fresh catalog', async () => {
  const indexedDB = new IDBFactory();
  const db = storage(indexedDB);
  await db.restore(records());
  const other = await new Promise((resolve, reject) => {
    const req = indexedDB.open('another-tool');
    req.onupgradeneeded = () => req.result.createObjectStore('records', { keyPath: 'id' });
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
  await new Promise((resolve, reject) => {
    const tx = other.transaction('records','readwrite');
    tx.objectStore('records').put({ id: 'keep', value: 42 });
    tx.oncomplete = resolve; tx.onabort = () => reject(tx.error);
  });
  await db.clearAllData();
  assert.deepEqual(copy(await db.snapshot()), { products: [], shows: [], sales: [], meta: [] });
  assert.equal(await db.getMeta('lastBackupPreparedAt'), null);
  const retained = await new Promise(resolve => {
    const req = other.transaction('records').objectStore('records').get('keep');
    req.onsuccess = () => resolve(req.result);
  });
  assert.deepEqual(retained, { id: 'keep', value: 42 });
  await db.commitProduct({ id: 'new', name: 'Fresh catalog', category: 'Coasters', priceCents: 500 });
  assert.equal((await db.getAll('products')).length, 1);
  assert.equal(await db.getMeta('lastProductCategory'), 'Coasters');
  other.close();
});

test('an interrupted clear leaves all records and settings intact', async () => {
  const db = storage();
  await db.restore(records());
  const before = copy(await db.snapshot());
  const connection = await db.openDB();
  const transaction = connection.transaction.bind(connection);
  connection.transaction = (names, mode) => {
    const tx = transaction(names, mode);
    if (mode === 'readwrite') tx.objectStore('sales').clear = () => { throw new Error('Simulated deletion failure'); };
    return tx;
  };
  await assert.rejects(db.clearAllData(), /Simulated deletion failure/);
  assert.deepEqual(copy(await db.snapshot()), before);
});

test('stale open copies cannot reinsert old records after a reset or category merge', async () => {
  const indexedDB = new IDBFactory();
  const first = storage(indexedDB);
  await first.restore(records());
  const second = storage(indexedDB);
  await second.openDB();
  await first.clearAllData();
  await assert.rejects(second.commitProduct(records().products[0]), /Reload this app/);
  await assert.rejects(second.setMeta('draftCart', { p1: 2 }), /Reload this app/);
  assert.deepEqual(copy(await first.snapshot()), { products: [], shows: [], sales: [], meta: [] });
  await first.restore(records());
  const third = storage(indexedDB);
  await third.openDB();
  await first.changeCategory('Caosters','Coasters');
  await assert.rejects(third.put('products', records().products[0]), /Reload this app/);
  assert.equal((await first.getAll('products')).find(p => p.id === 'p1').category, 'Coasters');
});

test('a failed restore leaves prior records intact and a pre-reset full backup restores them', async () => {
  const db = storage();
  await db.restore(records());
  const before = copy(await db.snapshot());
  const broken = records();
  broken.products.push(broken.products[0]);
  await assert.rejects(db.restore(broken));
  assert.deepEqual(copy(await db.snapshot()), before);
  await db.clearAllData();
  await db.restore(before);
  assert.deepEqual(copy(await db.snapshot()), before);
});

test('ordinary writes protect carts and catalogs in other copies, while this copy can queue writes', async () => {
  const indexedDB = new IDBFactory();
  const first = storage(indexedDB); await first.restore(records());
  const second = storage(indexedDB); await second.openDB();
  await first.setMeta('draftCart', {p1:3});
  await assert.rejects(second.setMeta('draftCart', {p1:1}), {code:'DATA_CHANGED'});
  await second.snapshot();
  await assert.rejects(second.commitProduct({...records().products[0],priceCents:900}), /Reload this app/,
    'a backup read must not let an old UI overwrite the latest data');
  await second.snapshot({refreshRevision:true});
  await second.commitProduct({...records().products[0],priceCents:900});
  await assert.rejects(first.commitProduct(records().products[0]), /Reload this app/);
  await second.setMetaValues({productCategories:['Coasters'],lastProductCategory:'Coasters'});
  await Promise.all(Array.from({length:20},(_,i)=>second.setMeta('draftCart',{p1:i+1})));
  assert.deepEqual(copy(await second.getMeta('draftCart')),{p1:20});
  assert.equal((await second.getAll('products')).find(row=>row.id==='p1').priceCents,900);
});

test('a temporary open failure can be retried instead of reusing a rejected promise', async () => {
  const factory = new IDBFactory();
  let attempts=0;
  const indexedDB={open:(...args)=>{
    if(++attempts>1)return factory.open(...args);
    const request={error:new Error('Temporary storage failure')};
    setImmediate(()=>request.onerror());
    return request;
  }};
  const db=storage(indexedDB);
  await assert.rejects(db.openDB(),/Temporary storage failure/);
  await db.openDB();
  await db.setMeta('photoSize',256);
  assert.equal(await db.getMeta('photoSize'),256);
  assert.equal(attempts,2);
});

for (const version of [1, 2]) {
test(`the storage upgrade preserves version ${version} records and closes older writers`, async () => {
  const indexedDB=new IDBFactory();
  const legacy=await new Promise((resolve,reject)=>{
    const request=indexedDB.open('market-register-local',version);
    request.onupgradeneeded=()=>{for(const name of ['products','shows','sales','meta'])request.result.createObjectStore(name,{keyPath:'id'});};
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
  const original=records();
  await new Promise((resolve,reject)=>{
    const tx=legacy.transaction(['products','shows','sales','meta'],'readwrite');
    for(const [name,rows] of Object.entries(original))for(const row of rows)tx.objectStore(name).add(row);
    tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);
  });
  let closed=false;
  legacy.onversionchange=()=>{closed=true;legacy.close();};
  const upgraded=storage(indexedDB);await upgraded.openDB();
  assert.equal(closed,true);
  assert.equal((await upgraded.openDB()).version,3);
  const after=copy(await upgraded.snapshot());
  for(const name of Object.keys(original))original[name].sort((a,b)=>a.id.localeCompare(b.id));
  assert.deepEqual(after,original);
  await assert.rejects(new Promise((resolve,reject)=>{
    const request=indexedDB.open('market-register-local',version);
    request.onsuccess=()=>{request.result.close();resolve();};request.onerror=()=>reject(request.error);
  }),{name:'VersionError'});
});

}

test('reconnecting after a closed database does not authorize stale catalog writes', async () => {
  const indexedDB=new IDBFactory();const first=storage(indexedDB);
  await first.restore(records());
  const second=storage(indexedDB);await second.openDB();
  const connection=await first.openDB();connection.close();connection.onclose();
  await second.commitProduct({...records().products[0],priceCents:900});
  await assert.rejects(first.commitProduct(records().products[0]),{code:'DATA_CHANGED'});
  assert.equal((await first.getAll('products')).find(row=>row.id==='p1').priceCents,900);
});
