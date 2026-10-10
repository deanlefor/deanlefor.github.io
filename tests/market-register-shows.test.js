const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const { IDBFactory } = require('fake-indexeddb');
const XLSX = require('../market-register/vendor/xlsx.mini.min.js');

const root = path.resolve(__dirname, '..');
const dbSource = fs.readFileSync(path.join(root, 'market-register/db.js'), 'utf8').replace(/^export /gm, '');
const appSource = fs.readFileSync(path.join(root, 'market-register/app.js'), 'utf8').replace(/^import \* as db from '\.\/db.js';\s*/, '');
const html = fs.readFileSync(path.join(root, 'market-register/index.html'), 'utf8');
const copy = value => JSON.parse(JSON.stringify(value));
function storage(indexedDB = new IDBFactory()) {
  return vm.runInNewContext(`${dbSource}\n({ openDB, getAll, getMeta, put, setMeta, setMetaValues, commitProduct, commitSale, createShow, selectShow, setShowCompleted, voidRecordedSale, changeCategory, clearAllData, snapshot, restore });`, {
    indexedDB, window: { indexedDB }, crypto, Date, console,
  });
}
function sale(id = 'sale1', showId = 'show1') {
  return { id, showId, showName: 'Example market', showDate: '2026-10-10', timestamp: '2026-10-10T12:00:00Z', paymentMethod: 'Cash', lines: [{ productId: 'p1', sku: 'MR-0001', name: 'Example', category: 'Coasters', quantity: 1, unitPriceCents: 1200, unitNetPricesCents: [1200] }], subtotalCents: 1200, discountCents: 0, totalCents: 1200, voidedAt: null };
}
function records() {
  return { products: [{ id: 'p1', sku: 'MR-0001', name: 'Example', category: 'Coasters', active: true, priceCents: 1200, photo: null }], shows: [
    { id: 'show1', name: 'Example market', date: '2026-10-10', createdAt: '2026-10-10T10:00:00Z' },
    { id: 'show2', name: 'Earlier market', date: '2026-10-03', createdAt: '2026-10-03T10:00:00Z', completedAt: '2026-10-03T18:00:00Z' },
  ], sales: [sale()], meta: [{ id: 'activeShowId', value: 'show1' }, { id: 'draftCart', value: {} }] };
}
async function page(saved = records(), { db = storage() } = {}) {
  await db.restore(saved);
  const dom = new JSDOM(html, { url: 'https://site.test/market-register/', runScripts: 'outside-only' });
  const { window } = dom;
  const exports = [];
  window.Blob = Blob;
  window.File = File;
  window.XLSX = XLSX;
  window.navigator.canShare = () => true;
  window.navigator.share = async ({ files }) => { exports.push(...files); };
  window.HTMLDialogElement.prototype.showModal = function() { this.setAttribute('open', ''); };
  window.HTMLDialogElement.prototype.close = function() { this.removeAttribute('open'); };
  window.confirm = () => true;
  window.console.error = () => {};
  const context = dom.getInternalVMContext(); context.db = db;
  await new vm.Script(appSource, { filename: 'market-register/app.js' }).runInContext(context);
  const byId = id => window.document.getElementById(id);
  const settle = async () => { for (let i = 0; i < 20; i++) await new Promise(resolve => setImmediate(resolve)); };
  const view = name => window.document.querySelector(`[data-view="${name}"]`).click();
  const select = async (id, value) => { byId(id).value = value; byId(id).dispatchEvent(new window.Event('change')); await settle(); };
  return { dom, db, byId, settle, view, select, exports };
}

test('Export for Excel starts with a single sold item in the requested seven columns, without headers or SKU', async () => {
  const app = await page();
  try {
    app.view('shows');
    app.byId('export-excel').click(); await app.settle();
    assert.equal(app.exports.length, 1);
    const file = app.exports[0];
    assert.equal(file.name, '2026-10-10-Example-market-excel-sales.xlsx');
    assert.equal(file.type, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const bytes = Buffer.from(await file.arrayBuffer());
    assert.equal(bytes.subarray(0, 2).toString(), 'PK', 'a real workbook ZIP package, not renamed CSV');
    const workbook = XLSX.read(bytes, { type: 'buffer', cellNF: true });
    assert.deepEqual(workbook.SheetNames, ['Sales']);
    const sheet = workbook.Sheets.Sales;
    assert.equal(sheet['!ref'], 'A1:G1');
    assert.deepEqual(XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }), [['Example','Coasters','12.00','Cash','Example market','10/10/26','2026']]);
    assert.equal(sheet.C1.t, 'n'); assert.equal(sheet.C1.v, 12);
    assert.equal(sheet.F1.t, 'n');
    const date = XLSX.SSF.parse_date_code(sheet.F1.v);
    assert.deepEqual([date.y,date.m,date.d], [2026,10,10]);
    assert.equal(sheet.G1.t, 'n'); assert.equal(sheet.G1.v, 2026);
  } finally { app.dom.window.close(); }
});

test('Excel rows are consecutive, escaped, chronological, and limited to nonvoid items for the selected show', async () => {
  const data = records();
  data.shows[0].name = 'Example "Fall", market';
  const discounted = sale('discounted');
  discounted.timestamp = '2026-10-11T00:30:00Z';
  discounted.paymentMethod = 'Card';
  discounted.lines[0] = { ...discounted.lines[0], name: 'Oak "leaf", coaster', quantity: 3, unitPriceCents: 400, unitNetPricesCents: [333,333,334] };
  discounted.subtotalCents = 1200; discounted.discountCents = 200; discounted.totalCents = 1000;
  const earlier = sale('earlier');
  earlier.lines[0].name = '=Example title';
  earlier.lines[0].category = 'Signs';
  const voided = sale('voided'); voided.voidedAt = '2026-10-10T13:00:00Z';
  data.sales = [discounted, sale('different-show','show2'), voided, earlier];
  const app = await page(data);
  try {
    app.view('shows');
    app.byId('export-excel').click(); await app.settle();
    assert.equal(app.exports.length, 1);
    const workbook = XLSX.read(Buffer.from(await app.exports[0].arrayBuffer()), { type: 'buffer' });
    const sheet = workbook.Sheets.Sales;
    assert.equal(sheet['!ref'], 'A1:G4', 'four consecutive rows and exactly seven columns');
    assert.deepEqual(XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }), [
      ['=Example title','Signs','12.00','Cash','Example "Fall", market','10/10/26','2026'],
      ['Oak "leaf", coaster','Coasters','3.33','Card','Example "Fall", market','10/10/26','2026'],
      ['Oak "leaf", coaster','Coasters','3.33','Card','Example "Fall", market','10/10/26','2026'],
      ['Oak "leaf", coaster','Coasters','3.34','Card','Example "Fall", market','10/10/26','2026'],
    ]);
    assert.equal(sheet.A1.t, 's'); assert.equal(sheet.A1.f, undefined, 'a formula-like name stays literal text');
    assert.equal([sheet.C2,sheet.C3,sheet.C4].reduce((cents,cell) => cents + Math.round(cell.v*100), 0), 1000);
    for (const address of Object.keys(sheet).filter(key => !key.startsWith('!'))) assert.equal(sheet[address].f, undefined);
  } finally { app.dom.window.close(); }
});

test('all exports report no sales when the selected show has only voided sales', async () => {
  const data = records(); data.sales[0].voidedAt = '2026-10-10T13:00:00Z';
  const app = await page(data);
  try {
    app.view('shows');
    for (const id of ['export-excel','export-detail','export-summary']) {
      app.byId(id).click(); await app.settle();
      assert.equal(app.exports.length, 0);
      assert.match(app.byId('toast').textContent, /no sales to export/i);
    }
    await app.select('report-show-select', 'show2');
    app.byId('export-excel').click(); await app.settle();
    assert.equal(app.exports.length, 0, 'a show with no sales has no header-only export');
  } finally { app.dom.window.close(); }
});

test('detailed and product totals exports retain their column headers', async () => {
  const app = await page();
  try {
    app.view('shows');
    app.byId('export-detail').click(); await app.settle();
    app.byId('export-summary').click(); await app.settle();
    assert.equal(app.exports.length, 2);
    assert.equal((await app.exports[0].text()).split('\r\n')[0], '"Transaction ID","Time","SKU","Titles","Category","Original Price","Discount","Price Charged","Payment","Location","Date"');
    assert.equal((await app.exports[1].text()).split('\r\n')[0], '"SKU","Product","Category","Quantity","Net Sales"');
    assert.equal((await app.exports[1].text()).split('\r\n')[1], '"MR-0001","Example","Coasters","1","12.00"');
  } finally { app.dom.window.close(); }
});

test('refresh refuses to discard an open product form or a pending sale, and explains offline status', async () => {
  const app = await page();
  try {
    app.view('products'); app.byId('add-product').click();
    app.byId('product-name').value = 'Unsaved example';
    app.byId('refresh-app').click(); await app.settle();
    assert.match(app.byId('toast').textContent, /close the open form/i);
    assert.equal(app.byId('product-name').value, 'Unsaved example');
    app.byId('product-dialog').querySelector('[data-close-dialog]').click();
    app.view('register'); app.dom.window.document.querySelector('.product-tile').click(); await app.settle();
    const before = copy(await app.db.snapshot());
    app.byId('refresh-app').click(); await app.settle();
    assert.match(app.byId('toast').textContent, /current sale/i);
    assert.deepEqual(copy(await app.db.snapshot()), before);
    app.byId('clear-cart').click(); await app.settle();
    Object.defineProperty(app.dom.window.navigator, 'onLine', { value: false });
    app.byId('refresh-app').click(); await app.settle();
    assert.match(app.byId('toast').textContent, /connect to the internet/i);
  } finally { app.dom.window.close(); }
});

test('legacy shows stay open; completion locks records, clears selection, and persists in full backups', async () => {
  const db = storage(); await db.restore(records());
  const before = copy(await db.snapshot());
  const completed = await db.setShowCompleted('show1', true);
  assert.ok(completed.completedAt);
  assert.equal(await db.getMeta('activeShowId'), null);
  await assert.rejects(db.selectShow('show1'), /open show/);
  await assert.rejects(db.commitSale(sale('missed')), /completed/);
  await assert.rejects(db.voidRecordedSale('sale1'), /completed/);
  const after = copy(await db.snapshot());
  assert.deepEqual(after.sales, before.sales);
  assert.deepEqual(after.products, before.products);
  const restored = storage(); await restored.restore(after);
  await assert.rejects(restored.selectShow('show1'), /open show/);
  await restored.setShowCompleted('show1', false);
  assert.equal(await restored.getMeta('activeShowId'), null, 'reopening does not silently select another show');
  await restored.selectShow('show1');
  await restored.commitSale(sale('missed'));
  await restored.voidRecordedSale('sale1');
  const sales = await restored.getAll('sales');
  assert.equal(sales.length, 2);
  assert.ok(sales.find(row => row.id === 'sale1').voidedAt);
});

test('an unfinished sale blocks show completion, switching, and creating a new show without losing the cart', async () => {
  const db = storage(); const data = records();
  data.meta.find(row => row.id === 'draftCart').value = { p1: 2 };
  data.shows[1].completedAt = null;
  await db.restore(data);
  const before = copy(await db.snapshot());
  await assert.rejects(db.setShowCompleted('show1', true), /current sale/);
  await assert.rejects(db.selectShow('show2'), /current sale/);
  await assert.rejects(db.selectShow(null), /current sale/);
  await assert.rejects(db.createShow({ id: 'show3', name: 'New show', date: '2026-10-11' }), /current sale/);
  assert.deepEqual(copy(await db.snapshot()), before);
  await db.commitSale(sale('finish-draft'));
  await db.setShowCompleted('show1', true);
  assert.deepEqual(copy(await db.getMeta('draftCart')), {});
});

test('completing a different show leaves the current sale assigned to its original show', async () => {
  const db = storage(); const data = records();
  data.shows[1].completedAt = null;
  data.meta.find(row => row.id === 'draftCart').value = { p1: 2 };
  await db.restore(data);
  await db.setShowCompleted('show2', true);
  assert.equal(await db.getMeta('activeShowId'), 'show1');
  assert.deepEqual(copy(await db.getMeta('draftCart')), { p1: 2 });
  await assert.rejects(db.commitSale(sale('wrong-show','show2')), /completed/);
});

test('a stale open copy cannot add or void sales after show completion', async () => {
  const indexedDB = new IDBFactory(); const first = storage(indexedDB);
  await first.restore(records());
  const second = storage(indexedDB); await second.openDB();
  await first.setShowCompleted('show1', true);
  await assert.rejects(second.commitSale(sale('stale')), /Reload this app/);
  await assert.rejects(second.voidRecordedSale('sale1'), /Reload this app/);
  assert.deepEqual(copy(await first.getAll('sales')), records().sales);
});

test('a failed completion does not close the show or change its current selection', async () => {
  const db = storage(); await db.restore(records());
  const before = copy(await db.snapshot());
  const connection = await db.openDB(); const transaction = connection.transaction.bind(connection);
  connection.transaction = (names, mode) => {
    const tx = transaction(names, mode);
    if (mode === 'readwrite') tx.objectStore('shows').put = () => { throw new Error('Simulated storage failure'); };
    return tx;
  };
  await assert.rejects(db.setShowCompleted('show1', true), /Simulated storage failure/);
  assert.deepEqual(copy(await db.snapshot()), before);
});

test('the Register excludes completed shows while reports show status, exports, and an explicit reopen flow', async () => {
  const app = await page();
  try {
    assert.deepEqual(Array.from(app.byId('active-show-select').options, option => option.value), ['', 'show1']);
    assert.match(app.byId('active-show-select').selectedOptions[0].text, /Open/);
    app.view('shows'); await app.select('report-show-select','show2');
    assert.equal(app.byId('report-show-status').textContent, 'Completed');
    assert.equal(app.byId('change-show-status').textContent, 'Reopen show');
    for (const id of ['export-excel','export-detail','export-summary']) assert.equal(app.byId(id).disabled, false);
    assert.equal(app.byId('completed-show-backup').hidden, false);
    app.byId('change-show-status').click();
    assert.equal(app.byId('show-status-dialog').open, true);
    assert.match(app.byId('show-status-dialog-details').textContent, /choose this show/i);
    app.byId('confirm-show-status').click(); await app.settle();
    assert.equal(app.byId('report-show-status').textContent, 'Open');
    assert.equal(await app.db.getMeta('activeShowId'), 'show1');
    assert.ok(Array.from(app.byId('active-show-select').options).some(option => option.value === 'show2'));
  } finally { app.dom.window.close(); }
});

test('completion requires confirmation, retains report totals, blocks voids, and prompts backup', async () => {
  const app = await page();
  try {
    app.byId('complete-current-show').click();
    assert.equal(app.byId('show-status-dialog').open, true);
    assert.match(app.byId('show-status-dialog-summary').textContent, /Example market/);
    app.byId('show-status-dialog').querySelector('[data-close-dialog]').click();
    assert.equal((await app.db.getAll('shows')).find(show => show.id === 'show1').completedAt, undefined);
    app.byId('complete-current-show').click();
    app.byId('confirm-show-status').click(); await app.settle();
    assert.equal(app.byId('show-status-dialog').open, false);
    assert.equal(app.byId('view-shows').hidden, false);
    assert.equal(app.byId('report-show-status').textContent, 'Completed');
    assert.match(app.byId('report-show-status-detail').textContent, /export.*full backup/i);
    assert.match(app.byId('reports-body').textContent, /\$12\.00/);
    const voidButton = app.dom.window.document.querySelector('.transaction-controls button');
    assert.equal(voidButton.disabled, true);
    voidButton.dispatchEvent(new app.dom.window.Event('click')); await app.settle();
    assert.equal((await app.db.getAll('sales'))[0].voidedAt, null);
    app.view('register');
    assert.equal(app.byId('active-show-select').value, '');
    assert.equal(app.byId('complete-sale').disabled, true);
    assert.equal(app.byId('register-show-prompt').hidden, false);
    const tile = app.dom.window.document.querySelector('.product-tile');
    assert.equal(tile.disabled, true);
    tile.dispatchEvent(new app.dom.window.Event('click')); await app.settle();
    assert.equal(app.byId('cart-item-count').textContent,'0 items');
    assert.equal(Array.from(app.byId('active-show-select').options).some(option => option.value === 'show1'), false);
    const backup = await app.db.snapshot(); const restarted = await page(copy(backup));
    try { restarted.view('shows'); assert.equal(restarted.byId('report-show-status').textContent,'Completed'); }
    finally { restarted.dom.window.close(); }
  } finally { app.dom.window.close(); }
});

test('the UI protects a pending sale against completion and switching to another show', async () => {
  const data = records(); data.shows[1].completedAt = null;
  const app = await page(data);
  try {
    app.dom.window.document.querySelector('.product-tile').click(); await app.settle();
    app.byId('complete-current-show').click();
    assert.equal(app.byId('show-status-dialog').open, false);
    assert.match(app.byId('toast').textContent, /Record or clear/);
    await app.select('active-show-select','show2');
    assert.equal(app.byId('active-show-select').value,'show1');
    assert.equal(await app.db.getMeta('activeShowId'),'show1');
    app.byId('new-show-register').click();
    assert.equal(app.byId('show-dialog').open,false);
    assert.equal(app.byId('cart-item-count').textContent,'1 item');
    app.byId('clear-cart').click(); await app.settle();
    app.byId('complete-current-show').click();
    assert.equal(app.byId('show-status-dialog').open,true);
    app.byId('confirm-show-status').click(); await app.settle();
    assert.equal(app.byId('report-show-status').textContent,'Completed');
  } finally { app.dom.window.close(); }
});

test('sales cannot be saved under a different open show than the currently selected one', async () => {
  const db = storage(); const data = records(); data.shows[1].completedAt = null;
  await db.restore(data);
  await assert.rejects(db.commitSale(sale('wrong-show','show2')), /current show changed/);
  assert.deepEqual(copy(await db.getAll('sales')), data.sales);
});
