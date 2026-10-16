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
const appSource = fs.readFileSync(path.join(root, 'market-register/app.js'), 'utf8').replace(/^import \* as db from ['\"]\.\/db.js(?:\?v=[\d.]+)?['\"];\s*/, '');
const html = fs.readFileSync(path.join(root, 'market-register/index.html'), 'utf8');
const copy = value => JSON.parse(JSON.stringify(value));
function storage(indexedDB = new IDBFactory()) {
  return vm.runInNewContext(`${dbSource}\n({ openDB, onWrite, getAll, getMeta, put, setMeta, setMetaValues, commitProduct, commitSale, createShow, selectShow, setShowCompleted, voidRecordedSale, changeCategory, clearAllData, snapshot, restore });`, {
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
async function page(saved = records(), { db = storage(), channel = null } = {}) {
  await db.restore(saved);
  const dom = new JSDOM(html, { url: 'https://site.test/market-register/', runScripts: 'outside-only' });
  const { window } = dom;
  const exports = [];
  window.Blob = Blob;
  window.File = File;
  window.XLSX = XLSX;
  window.MarketReports = require('../market-register/reports.js');
  window.MarketData = require('../market-register/data.js');
  if(channel)window.BroadcastChannel=function(){return channel;};
  window.URL.createObjectURL = () => 'blob:example-pdf';
  window.URL.revokeObjectURL = () => {};
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

function adjustment(app, id, value) {
  app.byId(id).value = value;
  app.byId(id).dispatchEvent(new app.dom.window.Event('input'));
}

function payment(app, value) {
  app.dom.window.document.querySelector(`input[name="payment"][value="${value}"]`).click();
}

test('the search clear button restores the selected category without changing the current sale', async () => {
  const initial=records();
  initial.products.push(
    {...initial.products[0],id:'p2',sku:'MR-0002',name:'Oak coaster'},
    {...initial.products[0],id:'p3',sku:'MR-0003',name:'Bracelet',category:'Jewelry'},
  );
  const app=await page(initial);
  try {
    const document=app.dom.window.document;
    assert.equal(app.byId('clear-register-search').hidden,true);
    document.querySelector('.product-tile[aria-label^="Add Example,"]').click();
    [...document.querySelectorAll('.category-tab')].find(node=>node.textContent==='Coasters').click();
    adjustment(app,'register-search','oak');
    assert.deepEqual([...document.querySelectorAll('.tile-name')].map(node=>node.textContent),['Oak coaster']);
    assert.equal(app.byId('clear-register-search').hidden,false);
    app.byId('clear-register-search').click();
    assert.equal(app.byId('register-search').value,'');
    assert.equal(app.byId('clear-register-search').hidden,true);
    assert.equal(document.activeElement,app.byId('register-search'));
    assert.deepEqual([...document.querySelectorAll('.tile-name')].map(node=>node.textContent),['Example','Oak coaster']);
    assert.equal(app.byId('cart-total').textContent,'$12.00');
    assert.equal(app.byId('cart-item-count').textContent,'1 item');
    adjustment(app,'register-search','nothing matches');
    assert.match(app.byId('register-empty').textContent,/No matching products/);
    app.byId('clear-register-search').click();
    assert.equal(document.querySelectorAll('.product-tile').length,2);
  } finally { app.dom.window.close(); }
});

test('only a successful sale clears the register search and restores the product list', async () => {
  const initial=records(); initial.sales=[];
  initial.products.push({...initial.products[0],id:'p2',sku:'MR-0002',name:'Oak coaster'});
  const app=await page(initial);
  try {
    adjustment(app,'register-search','Example');
    app.dom.window.document.querySelector('.product-tile').click();
    const commit=app.db.commitSale;
    app.db.commitSale=async()=>{throw new Error('Example failed sale');};
    app.byId('complete-sale').click(); await app.settle();
    assert.equal(app.byId('register-search').value,'Example');
    assert.equal(app.byId('clear-register-search').hidden,false);
    assert.equal(app.byId('cart-total').textContent,'$12.00');
    assert.equal((await app.db.getAll('sales')).length,0);
    app.db.commitSale=commit;
    app.byId('complete-sale').click(); await app.settle();
    assert.equal((await app.db.getAll('sales')).length,1);
    assert.equal(app.byId('register-search').value,'');
    assert.equal(app.byId('clear-register-search').hidden,true);
    assert.equal(app.dom.window.document.querySelectorAll('.product-tile').length,2);
    assert.equal(app.byId('cart-item-count').textContent,'0 items');
    assert.equal(app.dom.window.document.querySelector('input[name="payment"]:checked').value,'Card');
  } finally { app.dom.window.close(); }
});

test('cash received shows change, keeps revenue at the sale total, and resets for the next customer', async () => {
  const initial = records(); initial.sales = [];
  const app = await page(initial);
  try {
    assert.equal(app.byId('cash-payment').hidden, true);
    app.dom.window.document.querySelector('.product-tile').click();
    payment(app, 'Cash');
    assert.equal(app.byId('cash-payment').hidden, false);
    assert.equal(app.dom.window.document.activeElement, app.byId('cash-received'));
    assert.equal(app.byId('cash-received').inputMode, 'decimal');
    adjustment(app, 'cash-received', '20');
    assert.equal(app.byId('cart-total').textContent, '$12.00');
    assert.equal(app.byId('cash-change-label').textContent, 'Change due');
    assert.equal(app.byId('cash-change').textContent, '$8.00');
    assert.equal(app.byId('complete-sale').disabled, false);
    app.byId('complete-sale').click(); await app.settle();
    const sales = await app.db.getAll('sales');
    assert.equal(sales.length, 1);
    assert.equal(sales[0].paymentMethod, 'Cash');
    assert.equal(sales[0].totalCents, 1200);
    assert.equal(app.byId('cash-received').value, '');
    assert.equal(app.byId('cash-change-row').hidden, true);
    assert.equal(app.byId('last-sale-summary').textContent, 'Recorded $12.00. Change due: $8.00.');
    assert.equal(app.dom.window.document.querySelector('input[name="payment"]:checked').value, 'Card');
    assert.equal(await app.db.getMeta('draftPayment'), 'Card');
    assert.equal(app.byId('cash-payment').hidden, true);
    app.view('shows');
    assert.match(app.byId('reports-body').textContent, /Total collected\$12.00/);
    app.view('register');
    app.dom.window.document.querySelector('.product-tile').click();
    assert.equal(app.byId('cash-received').value, '');
    assert.equal(app.byId('undo-area').hidden, true);
    assert.equal(app.byId('complete-sale').disabled, false, 'cash entry stays optional');
  } finally { app.dom.window.close(); }
});

test('cash change follows quantities, tips, and both discounts in exact cents, including short and exact payments', async () => {
  const initial = records(); initial.sales = [];
  initial.products[0].priceCents = 400;
  initial.products[0].promoEligible = true;
  const app = await page(initial);
  try {
    const add = () => app.dom.window.document.querySelector('.product-tile').click();
    add(); add(); add();
    assert.equal(app.byId('cart-total').textContent, '$10.00');
    payment(app, 'Cash');
    adjustment(app, 'cash-received', '20.10');
    adjustment(app, 'sale-discount', '2.05');
    adjustment(app, 'sale-tip', '3.20');
    assert.equal(app.byId('cart-total').textContent, '$11.15');
    assert.equal(app.byId('cash-change').textContent, '$8.95');
    add();
    assert.equal(app.byId('cash-change').textContent, '$4.95');
    adjustment(app, 'cash-received', '12');
    assert.equal(app.byId('cash-change-label').textContent, 'Still due');
    assert.equal(app.byId('cash-change').textContent, '$3.15');
    assert.equal(app.byId('complete-sale').disabled, true);
    assert.equal((await app.db.getAll('sales')).length, 0);
    adjustment(app, 'cash-received', '15.15');
    assert.equal(app.byId('cash-change-label').textContent, 'Change due');
    assert.equal(app.byId('cash-change').textContent, '$0.00');
    assert.equal(app.byId('complete-sale').disabled, false);
    adjustment(app, 'sale-discount', '99');
    assert.equal(app.byId('cash-change-row').hidden, true, 'invalid totals cannot produce change');
    assert.equal(app.byId('complete-sale').disabled, true);
    adjustment(app, 'sale-discount', '14');
    assert.equal(app.byId('cart-total').textContent, '$3.20');
    assert.equal(app.byId('cash-change').textContent, '$11.95');
    adjustment(app, 'sale-tip', '');
    assert.equal(app.byId('cart-total').textContent, '$0.00');
    assert.equal(app.byId('cash-change').textContent, '$15.15');
  } finally { app.dom.window.close(); }
});

test('only the cash field rejects nonnumeric edits and extra decimal places without changing their meaning', async () => {
  const app = await page();
  try {
    app.dom.window.document.querySelector('.product-tile').click();
    payment(app, 'Cash');
    adjustment(app, 'cash-received', '20');
    for (const invalid of ['2e1', '-20', 'twenty', '$20', '20.001', '20.1.2', '20\n']) {
      adjustment(app, 'cash-received', invalid);
      assert.equal(app.byId('cash-received').value, '20', invalid);
      assert.equal(app.byId('cash-change').textContent, '$8.00');
    }
    const cash = app.byId('cash-received');
    cash.setSelectionRange(0, cash.value.length);
    const letters = new app.dom.window.InputEvent('beforeinput', { data: 'abc', inputType: 'insertText', cancelable: true });
    cash.dispatchEvent(letters);
    assert.equal(letters.defaultPrevented, true);
    const number = new app.dom.window.InputEvent('beforeinput', { data: '25.50', inputType: 'insertFromPaste', cancelable: true });
    cash.dispatchEvent(number);
    assert.equal(number.defaultPrevented, false);
    adjustment(app, 'cash-received', '.');
    assert.equal(app.byId('complete-sale').disabled, true);
    assert.equal(cash.getAttribute('aria-invalid'), 'true');
    adjustment(app, 'cash-received', '999999999999999999');
    assert.equal(app.byId('complete-sale').disabled, true);
    adjustment(app, 'cash-received', '');
    assert.equal(app.byId('complete-sale').disabled, false);
    adjustment(app, 'register-search', 'Example');
    assert.equal(app.byId('register-search').value, 'Example');
    assert.equal(app.byId('register-search').getAttribute('inputmode'), null);
  } finally { app.dom.window.close(); }
});

test('switching payments and clearing cash-only input reset the calculator; failed sales retain cash received', async () => {
  const app = await page();
  try {
    payment(app, 'Cash');
    adjustment(app, 'cash-received', '20');
    assert.equal(app.byId('cash-change-row').hidden, true, 'an empty basket has no change');
    assert.equal(app.byId('clear-cart').disabled, false);
    app.byId('clear-cart').click(); await app.settle();
    assert.equal(app.byId('cash-received').value, '');
    assert.equal(app.dom.window.document.querySelector('input[name="payment"]:checked').value, 'Card');
    assert.equal(await app.db.getMeta('draftPayment'), 'Card');
    app.dom.window.document.querySelector('.product-tile').click();
    payment(app, 'Cash');
    adjustment(app, 'cash-received', '20');
    const commit = app.db.commitSale;
    app.db.commitSale = async () => { throw new Error('Example failed sale'); };
    app.byId('complete-sale').click(); await app.settle();
    assert.equal(app.byId('cash-received').value, '20');
    assert.equal(app.byId('cash-change').textContent, '$8.00');
    assert.equal(app.byId('cart-total').textContent, '$12.00');
    assert.equal(app.dom.window.document.querySelector('input[name="payment"]:checked').value, 'Cash', 'failed saves retain the current method');
    app.db.commitSale = commit;
    payment(app, 'Card');
    assert.equal(app.byId('cash-payment').hidden, true);
    assert.equal(app.byId('cash-received').value, '');
    payment(app, 'Venmo');
    assert.equal(app.byId('cash-payment').hidden, true);
    payment(app, 'Cash');
    assert.equal(app.byId('cash-received').value, '');
    assert.equal(app.byId('cash-change-row').hidden, true);
    app.byId('complete-sale').click(); await app.settle();
    assert.equal((await app.db.getAll('sales')).length, 2, 'cash can be recorded without the optional calculator');
    assert.equal(app.byId('last-sale-summary').textContent, 'Recorded $12.00.');
  } finally { app.dom.window.close(); }
});

test('an interrupted sale write rolls back its record and all draft resets; failed clearing retains the current sale', async () => {
  const app=await page();
  try {
    app.dom.window.document.querySelector('.product-tile').click();
    adjustment(app,'sale-tip','3'); adjustment(app,'sale-discount','2'); await app.settle();
    const before=copy(await app.db.snapshot());
    const connection=await app.db.openDB();
    const transaction=connection.transaction.bind(connection);
    connection.transaction=(names, mode)=>{
      const tx=transaction(names, mode);
      if(mode==='readwrite') {
        const meta=tx.objectStore('meta'), put=meta.put.bind(meta);
        meta.put=row=>{if(row.id==='draftManualDiscountCents')throw new Error('Simulated interrupted draft reset');return put(row);};
      }
      return tx;
    };
    app.byId('complete-sale').click(); await app.settle();
    assert.deepEqual(copy(await app.db.snapshot()), before);
    assert.equal(app.byId('cart-total').textContent,'$13.00');
    assert.equal(app.byId('sale-tip').value,'3');
    assert.equal(app.byId('sale-discount').value,'2');
    app.byId('clear-cart').click(); await app.settle();
    assert.deepEqual(copy(await app.db.snapshot()), before);
    assert.equal(app.byId('cart-total').textContent,'$13.00');
    assert.equal(app.byId('clear-cart').disabled,false);
    connection.transaction=transaction;
    app.byId('clear-cart').click(); await app.settle();
    assert.deepEqual(copy(await app.db.getMeta('draftCart')),{});
    assert.equal(await app.db.getMeta('draftTipCents'),0);
    assert.equal(await app.db.getMeta('draftManualDiscountCents'),0);
    assert.equal(app.byId('cart-total').textContent,'$0.00');
    assert.equal(app.byId('sale-tip').value,'');
  } finally {app.dom.window.close();}
});

test('a sale saves both dollar adjustments and resets them for the next customer; Excel and reports reconcile', async () => {
  const initial = records(); initial.sales = [];
  const app = await page(initial);
  try {
    assert.equal(app.byId('sale-adjustments').open, false);
    app.dom.window.document.querySelector('.product-tile').click();
    adjustment(app, 'sale-tip', '3');
    adjustment(app, 'sale-discount', '2');
    assert.equal(app.byId('cart-total').textContent, '$13.00');
    assert.equal(app.byId('tip-row').hidden, false);
    assert.equal(app.byId('manual-discount-row').hidden, false);
    app.byId('complete-sale').click(); await app.settle();
    const saved = copy(await app.db.getAll('sales'));
    assert.equal(saved.length, 1);
    assert.equal(saved[0].tipCents, 300);
    assert.equal(saved[0].manualDiscountCents, 200);
    assert.equal(saved[0].promotionDiscountCents, 0);
    assert.equal(saved[0].totalCents, 1300);
    assert.deepEqual(saved[0].lines[0].unitNetPricesCents, [1000]);
    assert.equal(await app.db.getMeta('draftTipCents'), 0);
    assert.equal(await app.db.getMeta('draftManualDiscountCents'), 0);
    assert.deepEqual(copy(await app.db.getMeta('draftCart')), {});
    assert.equal(app.byId('sale-tip').value, '');
    assert.equal(app.byId('sale-discount').value, '');
    assert.equal(app.byId('sale-adjustments').open, false);
    app.view('shows');
    assert.match(app.byId('reports-body').textContent, /Total collected\$13.00/);
    assert.match(app.byId('reports-body').textContent, /Items after discounts\$10.00Tips\$3.00Dollar discounts\$2.00/);
    assert.match(app.byId('reports-body').textContent, /Tip \$3.00 · Discount \$2.00/);
    app.byId('export-excel').click(); await app.settle();
    const book = XLSX.read(Buffer.from(await app.exports.at(-1).arrayBuffer()), { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json(book.Sheets.Sales, { header: 1 });
    assert.equal(rows.length, 2);
    assert.ok(rows.every(row => row.length === 8));
    assert.deepEqual(rows.map(row => row.slice(0, 5)), [['MR-0001', 'Example', 'Coasters', 10, 'Card'], ['', 'Tip', 'Tips', 3, 'Card']]);
    assert.equal(rows.reduce((sum, row) => sum + Math.round(row[3] * 100), 0), saved[0].totalCents);
    app.byId('export-detail').click(); await app.settle();
    assert.match(await app.exports.at(-1).text(), /"Tip","Tips","3.00","0.00","3.00"/);
    app.byId('export-summary').click(); await app.settle();
    const summary = await app.exports.at(-1).text();
    assert.match(summary, /"1","10.00"/);
    assert.doesNotMatch(summary, /"Tip"/);
    app.view('register');
    app.dom.window.document.querySelector('.product-tile').click();
    assert.equal(app.byId('cart-total').textContent, '$12.00');
    app.byId('complete-sale').click(); await app.settle();
    const next = (await app.db.getAll('sales')).find(sale => sale.id !== saved[0].id);
    assert.equal(next.tipCents, 0); assert.equal(next.manualDiscountCents, 0);
  } finally { app.dom.window.close(); }
});

test('invalid dollar entries and discounts above the item total block recording, including when a tip is present', async () => {
  const app = await page();
  try {
    app.dom.window.document.querySelector('.product-tile').click();
    adjustment(app, 'sale-tip', '5');
    for (const value of ['13', '-1', '2.001', '10%']) {
      adjustment(app, 'sale-discount', value);
      assert.equal(app.byId('complete-sale').disabled, true);
      assert.equal(app.byId('cart-total').textContent, '—');
      assert.equal(app.byId('adjustments-error').hidden, false);
      app.byId('complete-sale').click();
    }
    adjustment(app, 'sale-discount', '12');
    assert.equal(app.byId('cart-total').textContent, '$5.00');
    assert.equal(app.byId('complete-sale').disabled, false);
    adjustment(app, 'sale-tip', '-1');
    assert.equal(app.byId('complete-sale').disabled, true);
    await app.settle();
    assert.equal((await app.db.getAll('sales')).length, 1);
  } finally { app.dom.window.close(); }
});

test('draft amounts survive backup and reload, block show changes without items, and clear together', async () => {
  const initial = records(); initial.shows[1].completedAt = null;
  const app = await page(initial);
  let reopened;
  try {
    adjustment(app, 'sale-tip', '2.50');
    adjustment(app, 'sale-discount', '1.25');
    app.byId('new-show-register').click();
    assert.equal(app.byId('show-dialog').open, false);
    await app.select('active-show-select', 'show2');
    assert.equal(app.byId('active-show-select').value, 'show1');
    app.byId('complete-current-show').click();
    assert.equal(app.byId('show-status-dialog').open, false);
    app.view('backup'); app.byId('create-backup').click(); await app.settle();
    const backup = JSON.parse(await app.exports.at(-1).text());
    assert.doesNotThrow(() => app.dom.window.MarketData.validateBackup(backup));
    assert.equal(backup.data.meta.find(row => row.id === 'draftTipCents').value, 250);
    assert.equal(backup.data.meta.find(row => row.id === 'draftManualDiscountCents').value, 125);
    reopened = await page(backup.data);
    assert.equal(reopened.byId('sale-tip').value, '2.50');
    assert.equal(reopened.byId('sale-discount').value, '1.25');
    assert.equal(reopened.byId('sale-adjustments').open, true);
    assert.equal(reopened.byId('clear-cart').disabled, false);
    reopened.byId('clear-cart').click(); await reopened.settle();
    assert.equal(await reopened.db.getMeta('draftTipCents'), 0);
    assert.equal(await reopened.db.getMeta('draftManualDiscountCents'), 0);
    assert.equal(reopened.byId('sale-adjustments').open, false);
    assert.equal(reopened.byId('adjustments-error').hidden, true);
    await reopened.select('active-show-select', 'show2');
    assert.equal(reopened.byId('active-show-select').value, 'show2');
  } finally { app.dom.window.close(); reopened?.dom.window.close(); }
});

test('storage guards amount-only drafts and failed commits retain all sale amounts', async () => {
  const initial = records(); initial.shows[1].completedAt = null;
  const db = storage(); await db.restore(initial);
  await db.setMeta('draftTipCents', 300);
  await assert.rejects(db.selectShow('show2'), /current sale/);
  await assert.rejects(db.createShow({ id: 'show3', name: 'Other', date: '2026-10-10' }), /current sale/);
  await assert.rejects(db.setShowCompleted('show1', true), /current sale/);
  await db.setMetaValues({ draftTipCents: 0, draftManualDiscountCents: 200 });
  await assert.rejects(db.selectShow('show2'), /current sale/);
  const app = await page(initial);
  try {
    app.dom.window.document.querySelector('.product-tile').click();
    adjustment(app, 'sale-tip', '3'); adjustment(app, 'sale-discount', '2');
    const originalCommit = app.db.commitSale;
    app.db.commitSale = async () => { throw new Error('Simulated save failure'); };
    app.byId('complete-sale').click(); await app.settle();
    assert.equal(app.byId('cart-total').textContent, '$13.00');
    assert.equal(app.byId('sale-tip').value, '3');
    assert.equal(app.byId('sale-discount').value, '2');
    assert.equal(await app.db.getMeta('draftTipCents'), 300);
    assert.equal(await app.db.getMeta('draftManualDiscountCents'), 200);
    assert.equal((await app.db.getAll('sales')).length, 1);
    app.db.commitSale = originalCommit;
    app.byId('complete-sale').click(); await app.settle();
    assert.equal((await app.db.getAll('sales')).length, 2);
  } finally { app.dom.window.close(); }
});

test('the three payment buttons record their exact choice and legacy labels group in reports and Excel', async () => {
  const data=records();data.sales=[{...sale('square'),paymentMethod:'Square'}, {...sale('cashapp'),paymentMethod:'Cash App'}];
  const app=await page(data);
  try{
    const choices=[...app.dom.window.document.querySelectorAll('input[name="payment"]')];
    assert.deepEqual(choices.map(input=>input.value),['Cash','Card','Venmo']);
    for(const input of choices){
      app.dom.window.document.querySelector('.product-tile').click();
      input.checked=true;input.dispatchEvent(new app.dom.window.Event('change'));
      app.byId('complete-sale').click();await app.settle();
      const latest=(await app.db.getAll('sales')).find(sale=>!['square','cashapp'].includes(sale.id)&&sale.paymentMethod===input.value);
      assert.ok(latest,`${input.value} was saved`);
    }
    const before=copy(await app.db.snapshot());
    app.view('shows');
    assert.doesNotMatch(app.byId('reports-body').textContent,/Square|Cash App/);
    app.byId('export-excel').click();await app.settle();
    const book=XLSX.read(Buffer.from(await app.exports[0].arrayBuffer()),{type:'buffer'});
    const rows=XLSX.utils.sheet_to_json(book.Sheets.Sales,{header:1});
    assert.equal(rows.filter(row=>row[4]==='Card').length,2);
    assert.equal(rows.filter(row=>row[4]==='CashApp').length,1);
    assert.deepEqual(copy(await app.db.snapshot()),before);
  }finally{app.dom.window.close();}
});

test('PDF buttons share real PDFs for the selected show, preserve records, and offer a canceled-share download', async () => {
  const app=await page();
  try{
    const pdfMake=require('../market-register/vendor/pdfmake.min.js');
    pdfMake.addVirtualFileSystem(require('../market-register/vendor/vfs_fonts.js'));
    app.dom.window.pdfMake=pdfMake;
    const before=copy(await app.db.snapshot());
    app.view('shows');
    for(const [id,suffix] of [['export-card-pdf','card-transactions'],['export-ledger-pdf','item-ledger'],['export-show-pdf','show-summary']]){
      app.byId(id).click();
      for(let i=0;i<100 && app.byId(id).disabled;i++)await app.settle();
      const file=app.exports.at(-1);
      assert.equal(file.name,`2026-10-10-Example-market-${suffix}.pdf`);
      assert.equal(file.type,'application/pdf');
      assert.equal(Buffer.from(await file.arrayBuffer()).subarray(0,5).toString(),'%PDF-');
      assert.equal(app.byId('pdf-report-download').hidden,false);
    }
    assert.deepEqual(copy(await app.db.snapshot()),before);
    app.dom.window.navigator.share=async()=>{throw new DOMException('Canceled','AbortError');};
    app.byId('export-card-pdf').click();
    for(let i=0;i<100 && app.byId('export-card-pdf').disabled;i++)await app.settle();
    assert.match(app.byId('pdf-report-status').textContent,/sharing canceled/i);
    assert.equal(app.byId('pdf-report-download').download,'2026-10-10-Example-market-card-transactions.pdf');
    await app.select('report-show-select','show2');
    assert.equal(app.byId('pdf-report-download').hidden,true);
    await app.select('report-show-select','');
    assert.equal(app.byId('export-card-pdf').disabled,true);
  }finally{app.dom.window.close();}
});

test('Export for Excel starts with the recorded SKU in column A and shifts the seven existing fields to B-H', async () => {
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
    assert.equal(sheet['!ref'], 'A1:H1');
    assert.deepEqual(XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }), [['MR-0001','Example','Coasters','12.00','Cash','Example market','10/10/26','2026']]);
    assert.equal(sheet.A1.t, 's'); assert.equal(sheet.A1.v, 'MR-0001');
    assert.equal(sheet.D1.t, 'n'); assert.equal(sheet.D1.v, 12);
    assert.equal(sheet.G1.t, 'n');
    const date = XLSX.SSF.parse_date_code(sheet.G1.v);
    assert.deepEqual([date.y,date.m,date.d], [2026,10,10]);
    assert.equal(sheet.H1.t, 'n'); assert.equal(sheet.H1.v, 2026);
  } finally { app.dom.window.close(); }
});

test('Excel rows are consecutive, escaped, chronological, and limited to nonvoid items for the selected show', async () => {
  const data = records();
  data.shows[0].name = 'Example "Fall", market';
  data.products[0].sku = 'CURRENT-CATALOG-SKU';
  const discounted = sale('discounted');
  discounted.timestamp = '2026-10-11T00:30:00Z';
  discounted.paymentMethod = 'Card';
  discounted.lines[0] = { ...discounted.lines[0], sku: '=SKU', name: 'Oak "leaf", coaster', quantity: 3, unitPriceCents: 400, unitNetPricesCents: [333,333,334] };
  discounted.subtotalCents = 1200; discounted.discountCents = 200; discounted.totalCents = 1000;
  const earlier = sale('earlier');
  earlier.lines[0].name = '=Example title';
  earlier.lines[0].sku = '00123';
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
    assert.equal(sheet['!ref'], 'A1:H4', 'four consecutive rows and exactly eight columns');
    assert.deepEqual(XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }), [
      ['00123','=Example title','Signs','12.00','Cash','Example "Fall", market','10/10/26','2026'],
      ['=SKU','Oak "leaf", coaster','Coasters','3.33','Card','Example "Fall", market','10/10/26','2026'],
      ['=SKU','Oak "leaf", coaster','Coasters','3.33','Card','Example "Fall", market','10/10/26','2026'],
      ['=SKU','Oak "leaf", coaster','Coasters','3.34','Card','Example "Fall", market','10/10/26','2026'],
    ]);
    assert.equal(sheet.A1.t, 's'); assert.equal(sheet.A1.v, '00123', 'leading zeros stay intact');
    assert.equal(sheet.A2.t, 's'); assert.equal(sheet.A2.f, undefined, 'a formula-like SKU stays literal text');
    assert.equal(sheet.B1.t, 's'); assert.equal(sheet.B1.f, undefined, 'a formula-like name stays literal text');
    assert.equal([sheet.D2,sheet.D3,sheet.D4].reduce((cents,cell) => cents + Math.round(cell.v*100), 0), 1000);
    for (const address of Object.keys(sheet).filter(key => !key.startsWith('!'))) assert.equal(sheet[address].f, undefined);
  } finally { app.dom.window.close(); }
});

test('older sale items without a recorded SKU keep column A blank and all other Excel fields aligned', async () => {
  const initial=records();
  delete initial.sales[0].lines[0].sku;
  initial.products[0].sku='CURRENT-CATALOG-SKU';
  const app=await page(initial);
  try {
    const before=copy(await app.db.snapshot());
    app.view('shows');
    app.byId('export-excel').click(); await app.settle();
    const workbook=XLSX.read(Buffer.from(await app.exports[0].arrayBuffer()),{type:'buffer'});
    assert.deepEqual(XLSX.utils.sheet_to_json(workbook.Sheets.Sales,{header:1,raw:false}),[
      ['', 'Example', 'Coasters', '12.00', 'Cash', 'Example market', '10/10/26', '2026'],
    ]);
    assert.deepEqual(copy(await app.db.snapshot()),before);
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

test('screen and CSV preserve renamed product history with the same grouping as PDFs', async () => {
  const data=records();
  const renamed=sale('renamed');
  renamed.lines[0]={...renamed.lines[0],name:'Renamed example',category:'Jewelry',sku:'NEW-SKU'};
  data.sales.push(renamed);
  const app=await page(data);
  try{
    app.view('shows');
    const panels=[...app.byId('reports-body').querySelectorAll('.report-block')];
    const items=panels.find(panel=>panel.querySelector('h2').textContent==='Items sold by product');
    assert.equal(items.querySelectorAll('tbody tr').length,2);
    assert.match(items.textContent,/Renamed example/);
    app.byId('export-summary').click();await app.settle();
    const csv=await app.exports[0].text();
    assert.match(csv,/'?"MR-0001","Example","Coasters","1","12.00"/);
    assert.match(csv,/"NEW-SKU","Renamed example","Jewelry","1","12.00"/);
  }finally{app.dom.window.close();}
});

test('a backup waits for the latest pending cart write', async () => {
  const db=storage();
  let release;
  const gate=new Promise(resolve=>{release=resolve;});
  const setMeta=db.setMeta;
  db.setMeta=async(id,value)=>{if(id==='draftCart')await gate;return setMeta(id,value);};
  const app=await page(records(),{db});
  try{
    app.dom.window.document.querySelector('.product-tile').click();
    app.view('backup');app.byId('create-backup').click();await app.settle();
    assert.equal(app.exports.length,0);
    release();await app.settle();
    const backup=JSON.parse(await app.exports[0].text());
    assert.deepEqual(backup.data.meta.find(row=>row.id==='draftCart').value,{p1:1});
    assert.equal(require('../market-register/data.js').validateBackup(backup),backup.data);
  }finally{release();app.dom.window.close();}
});

test('a damaged backup is rejected before confirmation and leaves records intact', async () => {
  const app=await page();
  try{
    const before=copy(await app.db.snapshot());
    const broken=copy(before);broken.sales[0].totalCents=1;
    let confirmations=0;
    app.dom.window.confirm=()=>{confirmations++;return true;};
    const file=new File([JSON.stringify({kind:'market-register-full-backup',version:1,data:broken})],'broken.json',{type:'application/json'});
    Object.defineProperty(app.byId('restore-file'),'files',{value:[file]});
    app.byId('restore-file').dispatchEvent(new app.dom.window.Event('change'));await app.settle();
    assert.equal(confirmations,0);
    assert.match(app.byId('toast').textContent,/inconsistent sale totals/);
    assert.deepEqual(copy(await app.db.snapshot()),before);
  }finally{app.dom.window.close();}
});

test('rapid repeated product submissions cannot create duplicate records and prices require exact cents', async () => {
  const db=storage();
  let release;
  const gate=new Promise(resolve=>{release=resolve;});
  const commit=db.commitProduct;
  db.commitProduct=async product=>{await gate;return commit(product);};
  const app=await page(records(),{db});
  try{
    app.view('products');app.byId('add-product').click();
    app.byId('product-name').value='New product';app.byId('product-price').value='1.005';
    const submit=()=>app.byId('product-form').dispatchEvent(new app.dom.window.SubmitEvent('submit',{bubbles:true,cancelable:true,submitter:app.byId('save-product')}));
    submit();await app.settle();
    assert.match(app.byId('toast').textContent,/two decimal places/);
    app.byId('product-price').value='1.01';submit();submit();
    assert.equal(app.byId('save-product').disabled,true);
    release();await app.settle();
    const products=await app.db.getAll('products');
    assert.equal(products.length,2);
    assert.equal(products.find(row=>row.name==='New product').priceCents,101);
  }finally{release();app.dom.window.close();}
});

test('PDF failure messages persist and prepared files are invalidated by new sales', async () => {
  const app=await page();
  try{
    app.dom.window.pdfMake={createPdf:()=>({getBlob:async()=>{throw new Error('Simulated PDF failure');}})};
    app.view('shows');app.byId('export-card-pdf').click();await app.settle();
    assert.match(app.byId('pdf-report-status').textContent,/could not be prepared/);
    app.dom.window.pdfMake={createPdf:()=>({getBlob:async()=>new Blob(['%PDF-example'],{type:'application/pdf'})})};
    app.byId('export-card-pdf').click();await app.settle();
    assert.equal(app.byId('pdf-report-download').hidden,false);
    app.view('register');app.dom.window.document.querySelector('.product-tile').click();
    app.byId('complete-sale').click();await app.settle();
    app.view('shows');
    assert.equal(app.byId('pdf-report-download').hidden,true);
    assert.equal(app.byId('pdf-report-download').hasAttribute('href'),false);
  }finally{app.dom.window.close();}
});

test('a PDF finishing after records change cannot offer an outdated download', async () => {
  const app=await page();
  let release;
  const gate=new Promise(resolve=>{release=resolve;});
  try{
    app.dom.window.pdfMake={createPdf:()=>({getBlob:()=>gate})};
    app.view('shows');app.byId('export-card-pdf').click();await app.settle();
    app.view('register');app.dom.window.document.querySelector('.product-tile').click();
    app.byId('complete-sale').click();await app.settle();
    release(new Blob(['%PDF-example'],{type:'application/pdf'}));await app.settle();
    app.view('shows');
    assert.equal(app.exports.length,0);
    assert.equal(app.byId('pdf-report-download').hidden,true);
    assert.match(app.byId('pdf-report-status').textContent,/Records changed/);
  }finally{release(new Blob([]));app.dom.window.close();}
});

test('another copy changing records retains an unfinished form and disables stale writes', async () => {
  const indexedDB=new IDBFactory();const db=storage(indexedDB);
  const messages=[];const channel={postMessage:message=>messages.push(message)};
  const app=await page(records(),{db,channel});
  try{
    app.view('products');app.byId('add-product').click();
    app.byId('product-name').value='Unfinished product';app.byId('product-price').value='5.00';
    const other=storage(indexedDB);await other.openDB();
    await other.commitProduct({...records().products[0],priceCents:1500});
    channel.onmessage({data:'data-changed'});
    assert.equal(app.byId('product-dialog').open,true);
    assert.equal(app.byId('product-name').value,'Unfinished product');
    app.byId('product-form').dispatchEvent(new app.dom.window.SubmitEvent('submit',{bubbles:true,cancelable:true,submitter:app.byId('save-product')}));await app.settle();
    assert.equal((await db.getAll('products')).length,1);
    assert.match(app.byId('footer-save').textContent,/Records changed/);
    assert.equal(messages.length,0,'receiving a notice never writes or broadcasts');
  }finally{app.dom.window.close();}
});

test('committed UI writes notify other copies without relying on notifications for storage safety', async () => {
  const messages=[];const channel={postMessage:message=>messages.push(message)};
  const app=await page(records(),{channel});
  try{
    app.dom.window.document.querySelector('.product-tile').click();await app.settle();
    app.byId('complete-sale').click();await app.settle();
    assert.equal(messages.length,2,'cart save and completed sale each notify');
    assert.equal((await app.db.getAll('sales')).length,2);
  }finally{app.dom.window.close();}
});

test('mixed promotion baskets price every unit correctly and rapid checkout records only one sale', async () => {
  const data=records();data.sales=[];
  data.products=[{...data.products[0],id:'z',name:'Zebra',priceCents:400,promoEligible:true},
    {...data.products[0],id:'a',sku:'MR-0002',name:'apple',priceCents:400,promoEligible:true},
    {...data.products[0],id:'n',sku:'MR-0003',name:'Not eligible',priceCents:400,promoEligible:false}];
  const app=await page(data);
  try{
    const document=app.dom.window.document;
    assert.deepEqual([...document.querySelectorAll('.tile-name')].map(node=>node.textContent),['apple','Not eligible','Zebra']);
    const add=name=>document.querySelector(`.product-tile[aria-label^="Add ${name},"]`).click();
    add('Zebra');add('apple');add('Zebra');add('apple');add('Zebra');add('apple');add('Not eligible');
    assert.equal(app.byId('cart-subtotal').textContent,'$28.00');
    assert.equal(app.byId('cart-total').textContent,'$24.00');
    document.querySelector('[aria-label="Remove one apple"]').click();
    assert.equal(app.byId('cart-total').textContent,'$22.00');
    add('apple');
    app.byId('complete-sale').click();app.byId('complete-sale').dispatchEvent(new app.dom.window.Event('click'));
    for(let i=0;i<100 && app.byId('complete-sale').textContent==='Saving sale…';i++)await app.settle();
    const saved=await app.db.getAll('sales');assert.equal(saved.length,1);
    const transaction=saved[0];assert.equal(transaction.subtotalCents,2800);assert.equal(transaction.discountCents,400);assert.equal(transaction.totalCents,2400);
    assert.deepEqual(copy(transaction.lines.find(row=>row.productId==='n').unitNetPricesCents),[400]);
    assert.equal(transaction.lines.flatMap(row=>row.unitNetPricesCents).reduce((sum,price)=>sum+price,0),2400);
    assert.deepEqual(copy(await app.db.getMeta('draftCart')),{});
    app.view('shows');assert.match(app.byId('reports-body').textContent,/\$24\.00/);
    app.byId('export-excel').click();await app.settle();
    const book=XLSX.read(Buffer.from(await app.exports[0].arrayBuffer()),{type:'buffer'});
    const rows=XLSX.utils.sheet_to_json(book.Sheets.Sales,{header:1});
    assert.equal(rows.length,7);assert.equal(rows.reduce((sum,row)=>sum+Math.round(row[3]*100),0),2400);
  }finally{app.dom.window.close();}
});

test('an unfinished sale retains its payment selection after reopening the app', async () => {
  const app=await page();
  try{
    const venmo=app.dom.window.document.querySelector('input[name="payment"][value="Venmo"]');
    venmo.checked=true;venmo.dispatchEvent(new app.dom.window.Event('change'));
    app.dom.window.document.querySelector('.product-tile').click();await app.settle();
    const backup=copy(await app.db.snapshot());
    assert.equal(backup.meta.find(row=>row.id==='draftPayment').value,'Venmo');
    const restarted=await page(backup);
    try{
      assert.equal(restarted.byId('cart-item-count').textContent,'1 item');
      assert.equal(restarted.dom.window.document.querySelector('input[name="payment"]:checked').value,'Venmo');
      restarted.byId('complete-sale').click();await restarted.settle();
      const saved=(await restarted.db.getAll('sales')).find(row=>row.id!=='sale1');
      assert.equal(saved.paymentMethod,'Venmo');
      assert.equal(restarted.dom.window.document.querySelector('input[name="payment"]:checked').value,'Card');
      assert.equal(await restarted.db.getMeta('draftPayment'),'Card');
    }finally{restarted.dom.window.close();}
  }finally{app.dom.window.close();}
});

test('fresh sales start at Card even when old settings remember Cash or Venmo', async () => {
  for (const method of ['Cash', 'Venmo']) {
    const initial=records(); initial.meta.push({id:'draftPayment',value:method});
    const app=await page(initial);
    try {
      assert.equal(app.dom.window.document.querySelector('input[name="payment"]:checked').value,'Card');
      assert.equal(app.byId('cash-payment').hidden,true);
      app.dom.window.document.querySelector('.product-tile').click();
      payment(app,method); await app.settle();
      app.byId('clear-cart').click(); await app.settle();
      assert.equal(app.dom.window.document.querySelector('input[name="payment"]:checked').value,'Card');
      assert.equal(await app.db.getMeta('draftPayment'),'Card');
      const reopened=await page(copy(await app.db.snapshot()));
      try {
        assert.equal(reopened.dom.window.document.querySelector('input[name="payment"]:checked').value,'Card');
      } finally { reopened.dom.window.close(); }
    } finally { app.dom.window.close(); }
  }
  const pending=records(); pending.meta.push({id:'draftPayment',value:'Cash'}, {id:'draftTipCents',value:100});
  const app=await page(pending);
  try {
    assert.equal(app.dom.window.document.querySelector('input[name="payment"]:checked').value,'Cash', 'an amount-only draft still preserves its payment method');
  } finally { app.dom.window.close(); }
});
