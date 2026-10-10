const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'market-register/index.html'), 'utf8');
const source = fs.readFileSync(path.join(root, 'market-register/app.js'), 'utf8')
  .replace(/^import \* as db from '\.\/db.js';\s*/, '');

async function app(saved = { products: [], shows: [], sales: [], meta: [] }, { failWrites = false } = {}) {
  const dom = new JSDOM(html, { url: 'https://site.test/market-register/', runScripts: 'outside-only' });
  const { window } = dom;
  window.HTMLDialogElement.prototype.showModal = function() { this.setAttribute('open', ''); };
  window.HTMLDialogElement.prototype.close = function() { this.removeAttribute('open'); };
  window.console.error = () => {};
  function put(store, row) {
    if (failWrites) throw new Error('Storage is full.');
    saved[store] = [...saved[store].filter(item => item.id !== row.id), structuredClone(row)];
  }
  const db = {
    getAll: async store => structuredClone(saved[store]),
    getMeta: async (id, fallback = null) => structuredClone(saved.meta.find(row => row.id === id)?.value ?? fallback),
    put: async (store, row) => put(store, row),
    setMeta: async (id, value) => put('meta', { id, value }),
    setMetaValues: async values => {
      if (failWrites) throw new Error('Storage is full.');
      for (const [id, value] of Object.entries(values)) put('meta', { id, value });
    },
    commitProduct: async product => {
      if (failWrites) throw new Error('Storage is full.');
      put('products', product);
      put('meta', { id: 'lastProductCategory', value: product.category });
    },
  };
  const context = dom.getInternalVMContext();
  context.db = db;
  await new vm.Script(source, { filename: 'market-register/app.js' }).runInContext(context);
  const byId = id => window.document.getElementById(id);
  const settle = () => new Promise(resolve => setImmediate(resolve));
  const open = () => {
    window.document.querySelector('[data-view="products"]').click();
    byId('add-product').click();
  };
  const addCategory = async name => {
    byId('start-add-category').click();
    byId('new-category-name').value = name;
    byId('save-category').click();
    await settle();
  };
  const saveProduct = async (category, another = false) => {
    byId('product-name').value = 'Example Product';
    byId('product-price').value = '12.00';
    byId('product-category').value = category;
    const submitter = byId(another ? 'save-add-another' : 'save-product');
    byId('product-form').dispatchEvent(new window.SubmitEvent('submit', { bubbles: true, cancelable: true, submitter }));
    await settle();
  };
  const options = () => Array.from(byId('product-category').options, option => option.value);
  return { dom, byId, open, addCategory, saveProduct, options, saved };
}

test('categories are a dropdown, include legacy custom names, and reject an arbitrary typo', async () => {
  const saved = { products: [
    { id: 'p1', name: 'Example', category: ' COASTERS ', priceCents: 1200, active: true },
    { id: 'p2', name: 'Example custom', category: 'Pottery', priceCents: 1200, active: true },
  ], shows: [], sales: [], meta: [] };
  const page = await app(saved);
  try {
    page.open();
    assert.equal(page.byId('product-category').tagName, 'SELECT');
    assert.deepEqual(page.options(), ['3D Printing', 'Jewelry', 'Bracelets', 'Coasters', 'Pottery']);
    await page.saveProduct('Caosters');
    assert.equal(saved.products.length, 2);
    assert.match(page.byId('toast').textContent, /choose a category/);
    assert.equal(page.byId('product-dialog').open, true);
  } finally { page.dom.window.close(); }
});

test('saved category survives a new entry, Save and add another, and an app restart', async () => {
  const first = await app();
  try {
    first.open();
    await first.saveProduct('Coasters', true);
    assert.equal(first.byId('product-dialog').open, true);
    assert.equal(first.byId('product-category').value, 'Coasters');
    first.byId('product-dialog').close();
    first.open();
    assert.equal(first.byId('product-category').value, 'Coasters');
    const restarted = await app(first.saved);
    try {
      restarted.open();
      assert.equal(restarted.byId('product-category').value, 'Coasters');
    } finally { restarted.dom.window.close(); }
  } finally { first.dom.window.close(); }
});

test('a new category is remembered without a product and repeated case or spaces reuse it', async () => {
  const first = await app();
  try {
    first.open();
    await first.addCategory('  Home   Decor  ');
    assert.equal(first.byId('product-category').value, 'Home Decor');
    assert.equal(first.byId('new-category-fields').hidden, true);
    await first.addCategory(' home decor ');
    assert.equal(first.options().filter(name => name === 'Home Decor').length, 1);
    await first.addCategory(' COASTERS ');
    assert.equal(first.byId('product-category').value, 'Coasters');
    assert.equal(first.options().filter(name => name === 'Coasters').length, 1);
    const restarted = await app(first.saved);
    try {
      restarted.open();
      assert.ok(restarted.options().includes('Home Decor'));
      assert.equal(restarted.byId('product-category').value, 'Coasters');
    } finally { restarted.dom.window.close(); }
  } finally { first.dom.window.close(); }
});

test('failed storage does not claim a new category or product was saved', async () => {
  const page = await app(undefined, { failWrites: true });
  try {
    page.open();
    await page.addCategory('Pottery');
    assert.equal(page.options().includes('Pottery'), false);
    assert.equal(page.byId('new-category-fields').hidden, false);
    assert.match(page.byId('category-message').textContent, /Could not save/);
    await page.saveProduct('Coasters');
    assert.equal(page.saved.products.length, 0);
    assert.equal(page.byId('product-dialog').open, true);
  } finally { page.dom.window.close(); }
});

test('an old typo can be corrected through the dropdown without changing historical sales', async () => {
  const historicalSales = [{ id: 's1', lines: [{ category: 'Caosters' }] }];
  const saved = { products: [{ id: 'p1', sku: 'MR-0001', name: 'Example Coaster', category: 'Caosters', priceCents: 1200, active: true }], shows: [], sales: structuredClone(historicalSales), meta: [] };
  const page = await app(saved);
  try {
    page.dom.window.document.querySelector('[data-view="products"]').click();
    page.dom.window.document.querySelector('.manage-actions button').click();
    assert.equal(page.byId('product-category').value, 'Caosters');
    await page.saveProduct('Coasters');
    assert.equal(saved.products.length, 1);
    assert.equal(saved.products[0].category, 'Coasters');
    assert.deepEqual(saved.sales, historicalSales);
    page.open();
    assert.equal(page.options().includes('Caosters'), false);
    assert.equal(page.byId('product-category').value, 'Coasters');
  } finally { page.dom.window.close(); }
});
