import * as db from './db.js';

// Market Register 0.3: no backend, analytics, account, or payment API.
// This application's "inventory" is a product catalog; quantities on hand aren't tracked.

const money = cents => (cents / 100).toLocaleString('en-US', {style:'currency', currency:'USD'});
const shortDate = date => {
  if (!date || !/^\d{4}-\d\d-\d\d$/.test(date)) return date || '';
  const [year, month, day] = date.split('-');
  return `${Number(month)}/${Number(day)}/${year}`;
};
const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const byId = id => document.getElementById(id);
const element = (tag, className='', text='') => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== '') node.textContent = text;
  return node;
};
const safeString = value => typeof value === 'string' ? value : String(value ?? '');
const state = {
  products:[], shows:[], sales:[], cart:{}, activeShowId:null, reportShowId:null,
  activeCategory:'All', view:'register', productPhoto:null, editingProductId:null,
  payment:'Square', completing:false, lastSaleId:null, lastBackupAt:null, ready:false,
  photoSize:256, photoProcessing:false, categories:[], lastProductCategory:null
};
let toastTimer;
let cartSaveQueue = Promise.resolve();
let photoRequestId=0;

function toast(message, error=false) {
  const node = byId('toast');
  clearTimeout(toastTimer);
  node.textContent = message;
  node.className = `toast visible${error ? ' error' : ''}`;
  toastTimer = setTimeout(() => { node.className = 'toast'; }, 4200);
}
function errorMessage(error) {
  console.error(error);
  toast(error?.message || 'Something went wrong. No changes were made.', true);
}
function currentShow() { return state.shows.find(show=>show.id===state.activeShowId) || null; }
const cleanCategory = value => typeof value === 'string' ? value.trim().replace(/\s+/g,' ') : '';
const categoryKey = value => cleanCategory(value).toLocaleLowerCase('en-US');
function categoryList() {
  const unique = new Map();
  for(const value of ['3D Printing','Jewelry','Bracelets','Coasters',...state.categories,...state.products.map(p=>p.category)]) {
    const category=cleanCategory(value);
    if(category && !unique.has(categoryKey(category)))unique.set(categoryKey(category),category);
  }
  return [...unique.values()];
}
function canonicalCategory(value) {
  return categoryList().find(category=>categoryKey(category)===categoryKey(value)) || cleanCategory(value);
}
function fillProductCategories(selected) {
  const select=byId('product-category');select.replaceChildren();
  categoryList().forEach(category=>select.add(new Option(category,category)));
  select.value=canonicalCategory(selected);
  if(!select.value)select.value=categoryList()[0];
}
function closeCategoryEntry() {
  byId('new-category-fields').hidden=true;
  byId('new-category-name').value='';
}
async function addCategory() {
  const name=cleanCategory(byId('new-category-name').value);
  const message=byId('category-message');
  if(!name || name.length>55){message.textContent='Enter a category name of up to 55 characters.';return;}
  if(categoryKey(name)==='all'){message.textContent='Choose another name. All is used to show every category.';return;}
  const existing=categoryList().find(category=>categoryKey(category)===categoryKey(name));
  const selected=existing || name;
  const categories=existing?state.categories:[...state.categories,name];
  const button=byId('save-category');button.disabled=true;
  try {
    await db.setMetaValues({productCategories:categories,lastProductCategory:selected});
    state.categories=categories;state.lastProductCategory=selected;
    fillProductCategories(selected);closeCategoryEntry();
    toast(existing?`Selected existing category: ${existing}.`:`Category added: ${name}.`);
    byId('product-category').focus();
  }catch(error){message.textContent='Could not save the category. Please try again.';errorMessage(error);}
  finally{button.disabled=false;}
}
function sortProducts(products) {
  return [...products].sort((a,b) => (a.sortOrder || 0)-(b.sortOrder || 0) || a.name.localeCompare(b.name));
}
function newSKU() {
  const used = new Set(state.products.map(p=>p.sku?.toUpperCase()).filter(Boolean));
  let i = 1;
  while (used.has(`MR-${String(i).padStart(4,'0')}`)) i++;
  return `MR-${String(i).padStart(4,'0')}`;
}
function persistCart() {
  const cartSnapshot = {...state.cart};
  cartSaveQueue = cartSaveQueue.catch(()=>{}).then(() => db.setMeta('draftCart',cartSnapshot));
  cartSaveQueue.catch(errorMessage);
}
function totalCount() { return Object.values(state.cart).reduce((sum,q)=>sum+q,0); }

// Apply "3 for $10" only to marked $4 items. Each actual item remains identifiable.
// Allocate the $2 bundle discount across 3 unit rows (67c, 67c, 66c).
function priceCart() {
  let subtotalCents=0;
  const lines=[];
  const eligible=[];
  for (const product of state.products) {
    const quantity = Math.max(0, Number(state.cart[product.id]) || 0);
    if (!quantity) continue;
    const prices = Array(quantity).fill(product.priceCents);
    subtotalCents += quantity * product.priceCents;
    const line = {
      productId:product.id, sku:product.sku, name:product.name, category:canonicalCategory(product.category),
      unitPriceCents:product.priceCents, quantity, unitNetPricesCents:prices,
      promotionEligible: Boolean(product.promoEligible && product.priceCents===400)
    };
    lines.push(line);
    if (line.promotionEligible) for(let i=0;i<quantity;i++) eligible.push({line,index:i});
  }
  const bundles=Math.floor(eligible.length/3);
  for(let k=0;k<bundles;k++) {
    [67,67,66].forEach((discount,i)=>{
      const unit=eligible[k*3+i];
      unit.line.unitNetPricesCents[unit.index] -= discount;
    });
  }
  const discountCents = bundles*200;
  return {lines, subtotalCents, discountCents, totalCents:subtotalCents-discountCents,bundles};
}

function setView(view) {
  state.view=view;
  document.querySelectorAll('[data-view]').forEach(button=>{
    const selected = button.dataset.view===view;
    button.classList.toggle('is-active',selected);
    if (selected) button.setAttribute('aria-current','page');
    else button.removeAttribute('aria-current');
  });
  document.querySelectorAll('section.view').forEach(section=>{
    const selected=section.id===`view-${view}`;
    section.classList.toggle('is-visible',selected);
    section.hidden=!selected;
  });
  render();
}
function makeEmpty(title, description, buttonLabel, clickHandler) {
  const content = document.createDocumentFragment();
  content.append(element('h2','',title));
  content.append(element('p','',description));
  if (buttonLabel) {
    const button=element('button','btn btn-primary',buttonLabel);
    button.type='button'; button.addEventListener('click',clickHandler); content.append(button);
  }
  return content;
}
function showCategoryButton(cat) {
  const button=element('button',`category-tab${state.activeCategory===cat ? ' is-selected' : ''}`,cat);
  button.type='button'; button.setAttribute('aria-pressed',String(state.activeCategory===cat));
  button.addEventListener('click',()=>{state.activeCategory=cat;renderRegister();});
  return button;
}
function renderShowPickers() {
  const sorted=[...state.shows].sort((a,b)=> b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  for (const [id, selected] of [['active-show-select',state.activeShowId],['report-show-select',state.reportShowId]]) {
    const select=byId(id);
    select.replaceChildren();
    select.add(new Option(sorted.length ? 'Choose a show' : 'No shows yet',''));
    sorted.forEach(show=>select.add(new Option(`${show.name} · ${shortDate(show.date)}`,show.id)));
    select.value=selected || '';
  }
}
function renderRegister() {
  renderShowPickers();
  const show=currentShow();
  byId('cart-show-label').textContent=show? `${show.name} · ${shortDate(show.date)}` : 'Choose or create a show';
  const tabs=byId('category-tabs');tabs.replaceChildren();
  const categories=['All',...new Set(state.products.filter(p=>p.active).map(p=>canonicalCategory(p.category)).filter(Boolean))];
  if (!categories.includes(state.activeCategory)) state.activeCategory='All';
  categories.forEach(cat=>tabs.append(showCategoryButton(cat)));

  const filter=byId('register-search').value.trim().toLocaleLowerCase();
  const shown=sortProducts(state.products.filter(p => p.active &&
    (state.activeCategory==='All'||canonicalCategory(p.category)===state.activeCategory) &&
    (!filter||`${p.name} ${p.sku} ${p.category}`.toLocaleLowerCase().includes(filter))));
  const grid=byId('product-grid');grid.replaceChildren();
  for(const product of shown) {
    const tile=element('button','product-tile');
    tile.type='button';
    tile.title=`Add ${product.name}: ${money(product.priceCents)}`;
    tile.setAttribute('aria-label',`Add ${product.name}, ${money(product.priceCents)}${state.cart[product.id] ? `, ${state.cart[product.id]} in cart` : ''}`);
    if (product.photo) { const img=element('img','tile-picture');img.src=product.photo;img.alt='';img.loading='lazy';tile.append(img); }
    else { const image=element('div','tile-picture placeholder',product.name.trim().charAt(0).toUpperCase());image.setAttribute('aria-hidden','true');tile.append(image); }
    const details=element('div','tile-info');
    details.append(element('div','tile-name',product.name));
    const footer=element('div');footer.append(element('div','tile-price',money(product.priceCents)));
    if (product.promoEligible && product.priceCents===400) footer.append(element('span','tile-promo','3 for $10'));
    details.append(footer);tile.append(details);
    const inCart=state.cart[product.id] || 0;
    if(inCart) tile.append(element('div','cart-bubble',String(inCart)));
    tile.addEventListener('click',()=>addToCart(product.id));
    grid.append(tile);
  }
  const empty=byId('register-empty');
  empty.hidden=shown.length>0;
  if(!shown.length) {
    empty.replaceChildren();
    const noProducts=state.products.filter(p=>p.active).length===0;
    empty.append(makeEmpty(noProducts?'Your catalog starts here':'No matching products',
      noProducts?'Add your first product, then tap it here to begin a sale.':'Try another category or search term.',
      noProducts?'Add a product':null,()=>openProductDialog()));
  }
  renderCart();
}
function addToCart(id) {
  if (!state.ready || state.completing) return;
  state.cart[id]=(state.cart[id]||0)+1;
  state.lastSaleId=null;
  persistCart();renderRegister();
}
function decreaseCart(id) {
  if (state.completing) return;
  const next=(state.cart[id]||0)-1;
  if (next>0) state.cart[id]=next;
  else delete state.cart[id];
  persistCart();renderRegister();
}
function renderCart() {
  const breakdown=priceCart();
  byId('cart-item-count').textContent=`${totalCount()} ${totalCount()===1 ? 'item' : 'items'}`;
  const list=byId('cart-items');list.replaceChildren();
  if(!breakdown.lines.length) list.append(element('div','cart-empty','Tap a picture to add an item.'));
  for(const item of breakdown.lines) {
    const row=element('div','cart-item');
    const content=element('div','cart-item-main');
    content.append(element('div','cart-item-name',item.name));
    content.append(element('div','cart-item-price',`${money(item.unitPriceCents)} each · ${money(item.unitPriceCents * item.quantity)}`));
    row.append(content);
    const qty=element('div','qty-controls');
    const minus=element('button','qty-button','−');minus.type='button';minus.setAttribute('aria-label',`Remove one ${item.name}`);minus.addEventListener('click',()=>decreaseCart(item.productId));
    const plus=element('button','qty-button','+');plus.type='button';plus.setAttribute('aria-label',`Add one ${item.name}`);plus.addEventListener('click',()=>addToCart(item.productId));
    qty.append(minus,element('span','qty-label',String(item.quantity)),plus);row.append(qty);list.append(row);
  }
  byId('cart-subtotal').textContent=money(breakdown.subtotalCents);
  byId('cart-discount').textContent=`−${money(breakdown.discountCents)}`;
  byId('discount-row').hidden=breakdown.discountCents===0;
  byId('cart-total').textContent=money(breakdown.totalCents);
  byId('complete-sale').disabled=!breakdown.lines.length || !currentShow() || !state.ready || state.completing;
  byId('complete-sale').textContent=state.completing?'Saving sale…':'Record completed sale';
  byId('clear-cart').disabled=!breakdown.lines.length || state.completing;
  const undo=byId('undo-area');
  undo.hidden=!state.lastSaleId;
  if(state.lastSaleId) {
    const sale=state.sales.find(s=>s.id===state.lastSaleId);
    byId('last-sale-summary').textContent=sale?`Recorded ${money(sale.totalCents)}.`:'Sale recorded.';
  }
}
async function completeSale() {
  if(state.completing) return;
  const show=currentShow();const priced=priceCart();
  if(!show) return toast('Create or choose a show first.',true);
  if(!priced.lines.length) return;
  state.completing=true;renderCart();
  const sale={
    id:uid(), showId:show.id, showName:show.name, showDate:show.date,
    timestamp:new Date().toISOString(), paymentMethod:state.payment,
    lines:priced.lines,subtotalCents:priced.subtotalCents,
    discountCents:priced.discountCents,totalCents:priced.totalCents,
    voidedAt:null
  };
  try {
    // Ensure no older draft-cart save can race a successful sale commit.
    await cartSaveQueue;
    await db.commitSale(sale);
    state.sales.unshift(sale);
    state.cart={};state.lastSaleId=sale.id;
    toast(`${money(sale.totalCents)} sale recorded. Payment method: ${state.payment}.`);
  } catch(error) {errorMessage(error);}
  finally {state.completing=false;renderRegister();}
}
async function voidSale(id) {
  const sale=state.sales.find(s=>s.id===id);
  if(!sale || sale.voidedAt) return;
  if(!window.confirm(`Void this ${money(sale.totalCents)} sale? It will remain in the audit history but no longer count in show totals.`)) return;
  const updated={...sale,voidedAt:new Date().toISOString()};
  try {await db.put('sales',updated);state.sales=state.sales.map(s=>s.id===id?updated:s);state.lastSaleId=null;render();toast('Sale voided.');}
  catch(error){errorMessage(error);}
}

function openProductDialog(product=null, duplicate=false, categoryOverride=null) {
  photoRequestId++; // Any previous asynchronous image conversion is now obsolete.
  setPhotoProcessing(false);
  byId('product-camera').value='';
  byId('product-photo').value='';
  byId('photo-size').value=String(state.photoSize);
  const editing=Boolean(product && !duplicate);
  state.editingProductId=editing?product.id:null;
  state.productPhoto=product?.photo || null;
  byId('product-dialog-title').textContent=editing?'Edit product':duplicate?'Duplicate product':'Add a product';
  byId('save-add-another').hidden=editing;
  byId('product-id').value=state.editingProductId || '';
  byId('product-name').value=duplicate?`${product.name} (copy)`:(product?.name || '');
  byId('product-price').value=product? (product.priceCents/100).toFixed(2) : '';
  fillProductCategories(categoryOverride || product?.category || (state.activeCategory==='All'?state.lastProductCategory:state.activeCategory) || '3D Printing');
  closeCategoryEntry();
  byId('product-sku').value=duplicate?'':(product?.sku || '');
  byId('product-promo').checked=Boolean(product?.promoEligible);
  refreshPhotoPreview();
  byId('photo-status').textContent=state.productPhoto?'Current product photo loaded.':'New photos are resized and stored only in the app.';
  byId('product-dialog').showModal();
  setTimeout(()=>byId('product-name').focus(),30);
}
function refreshPhotoPreview() {
  const root=byId('photo-preview');root.replaceChildren();
  if(state.productPhoto){const img=element('img');img.src=state.productPhoto;img.alt='Product picture preview';root.append(img);}
  else root.append(element('span','photo-placeholder','Photo'));
  byId('remove-photo').disabled=!state.productPhoto;
}
function setPhotoProcessing(busy) {
  state.photoProcessing=busy;
  for(const id of ['product-camera','product-photo','photo-size','remove-photo','save-product','save-add-another']) {
    const control=byId(id);if(control)control.disabled=busy;
  }
  byId('photo-preview').setAttribute('aria-busy',String(busy));
  byId('photo-preview').closest('.photo-input-col')?.setAttribute('aria-busy',String(busy));
}
function photoBytes(photoDataURL) {
  const comma=photoDataURL.indexOf(',');
  return comma<0?0:Math.ceil((photoDataURL.length-comma-1)*3/4);
}
async function compressPhoto(file,size=256) {
  if(!file.type.startsWith('image/')) throw new Error('Choose a picture from the camera or photo library.');
  if(file.size>35*1024*1024) throw new Error('This picture is too large to process. Please choose a smaller one.');
  const imageURL=URL.createObjectURL(file);
  try {
    const img=new Image();
    // Set load listeners before the URL to avoid missing a fast load.
    const ready=new Promise((resolve,reject)=>{
      img.onload=resolve;
      img.onerror=()=>reject(new Error('Could not read this picture. Please try a different photo.'));
    });
    img.src=imageURL;
    await ready;
    if(!img.naturalWidth||!img.naturalHeight)throw new Error('This picture has invalid dimensions.');
    if(![256,384,512].includes(size))throw new Error('Choose a supported image size.');
    const canvas=document.createElement('canvas');
    canvas.width=size;canvas.height=size;
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Photo processing is unavailable on this device.');
    ctx.fillStyle='#f3f1ea';ctx.fillRect(0,0,size,size);
    // "Contain" preserves the complete figurine or bracelet, rather than cropping it off.
    const factor=Math.min(size/img.naturalWidth,size/img.naturalHeight);
    const w=Math.round(img.naturalWidth*factor),h=Math.round(img.naturalHeight*factor);
    ctx.drawImage(img,Math.round((size-w)/2),Math.round((size-h)/2),w,h);
    return canvas.toDataURL('image/jpeg',0.70);
  } finally {URL.revokeObjectURL(imageURL);}
}
async function processPhotoFile(file) {
  const id=++photoRequestId;
  const size=Number(byId('photo-size').value);
  setPhotoProcessing(true);
  byId('photo-status').textContent='Preparing small product picture…';
  try {
    const photo=await compressPhoto(file,size);
    if(id!==photoRequestId)return;
    state.productPhoto=photo;
    refreshPhotoPreview();
    const kb=Math.max(1,Math.round(photoBytes(photo)/1024));
    byId('photo-status').textContent=`Saved photo: ${size} × ${size} · approximately ${kb} KB.`;
    toast('Photo ready. Save the product when finished.');
  }catch(error){
    if(id===photoRequestId){byId('photo-status').textContent='Could not process picture. Try again.';errorMessage(error);}
  }finally{if(id===photoRequestId)setPhotoProcessing(false);}
}
async function saveProduct(event) {
  event.preventDefault();
  if(state.photoProcessing){toast('Please wait for the photo to finish processing.',true);return;}
  const name=byId('product-name').value.trim();
  const category=byId('product-category').value;
  const priceText=byId('product-price').value;
  const priceValue=Number(priceText);
  if(!name||!categoryList().includes(category)||priceText.trim()===''||!Number.isFinite(priceValue)||priceValue<0||priceValue>9999){toast('Enter a product name, choose a category, and enter a valid price.',true);return;}
  const priceCents=Math.round(priceValue*100);
  const promoEligible=byId('product-promo').checked;
  if(promoEligible && priceCents!==400){toast('The 3-for-$10 promotion is only for products priced at $4.00.',true);return;}
  const addAnother=event.submitter?.dataset.action==='another';
  const existing=state.products.find(p=>p.id===state.editingProductId);
  const sku=byId('product-sku').value.trim() || (existing?.sku || newSKU());
  const duplicateSKU=state.products.find(p=>p.sku?.toLowerCase()===sku.toLowerCase() && p.id!==existing?.id);
  if(duplicateSKU) {toast(`SKU "${sku}" is already used. Please choose another.`,true);return;}
  const product={
    id:existing?.id || uid(), sku, name, category,priceCents, promoEligible,
    photo:state.productPhoto, active:existing?.active??true,
    sortOrder:existing?.sortOrder ?? Date.now(),
    createdAt:existing?.createdAt || new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };
  const saveButton=byId('save-product');const anotherButton=byId('save-add-another');saveButton.disabled=true;anotherButton.disabled=true;
  try {
    await db.commitProduct(product);
    state.lastProductCategory=category;
    if(existing) state.products=state.products.map(p=>p.id===product.id?product:p);
    else state.products.push(product);
    byId('product-dialog').close();
    render();toast(existing?'Product updated.':'Product added.');
    if(addAnother && !existing)openProductDialog(null,false,category);
  }catch(error){errorMessage(error);}
  finally{saveButton.disabled=false;anotherButton.disabled=false;}
}
async function toggleProduct(id) {
  const product=state.products.find(p=>p.id===id);if(!product)return;
  const updated={...product,active:!product.active,updatedAt:new Date().toISOString()};
  try {await db.put('products',updated);state.products=state.products.map(p=>p.id===id?updated:p);render();toast(updated.active?'Product shown on register.':'Product hidden; its sales remain in reports.');}
  catch(error){errorMessage(error);}
}
function renderProducts(){
  const categorySelect=byId('manage-category');const current=categorySelect.value || 'all';categorySelect.replaceChildren();categorySelect.add(new Option('All categories','all'));
  categoryList().forEach(c=>categorySelect.add(new Option(c,c)));
  categorySelect.value=[...categorySelect.options].some(o=>o.value===current)?current:'all';
  const search=byId('manage-search').value.trim().toLocaleLowerCase();
  const includeHidden=byId('show-hidden').checked;
  const filtered=sortProducts(state.products.filter(p=> (includeHidden||p.active) && (categorySelect.value==='all'||canonicalCategory(p.category)===categorySelect.value) &&
    (!search||`${p.name} ${p.sku} ${p.category}`.toLocaleLowerCase().includes(search))));
  const active=state.products.filter(p=>p.active).length;
  byId('product-count').textContent=`${active} active · ${state.products.length-active} hidden`;
  const list=byId('manage-product-list');list.replaceChildren();
  for(const p of filtered){
    const card=element('article',`surface product-manage-card${p.active?'':' is-hidden'}`);
    if(p.photo){const image=element('img','manage-thumb');image.src=p.photo;image.alt='';image.loading='lazy';card.append(image);}
    else card.append(element('div','manage-thumb',p.name.trim().charAt(0).toUpperCase()));
    const info=element('div');info.append(element('div','manage-title',p.name));
    info.append(element('div','manage-subtitle',`${money(p.priceCents)} · ${canonicalCategory(p.category)} · ${p.sku}${p.active?'':' · HIDDEN'}`));
    const actions=element('div','manage-actions');
    for(const [label,fn] of [
      ['Edit',()=>openProductDialog(p)],
      ['Duplicate',()=>openProductDialog(p,true)],
      [p.active?'Hide':'Show',()=>toggleProduct(p.id)]
    ]){
      const button=element('button','btn btn-outline btn-small',label);button.type='button';button.addEventListener('click',fn);actions.append(button);
    }
    info.append(actions);card.append(info);list.append(card);
  }
  const empty=byId('manage-empty');empty.hidden=filtered.length>0;
  if(!filtered.length){empty.replaceChildren();empty.append(makeEmpty(state.products.length?'No products match your filters':'No products added yet',
    'Each product needs only a name, category, and price. Photos can be added later.',
    state.products.length?null:'Add first product',()=>openProductDialog()));}
}
function openShowDialog(){byId('show-name').value='';byId('show-date').value=localDate();byId('show-dialog').showModal();setTimeout(()=>byId('show-name').focus(),30);}
async function saveShow(event){
  event.preventDefault();
  const name=byId('show-name').value.trim();const date=byId('show-date').value;
  if(!name||!/^\d{4}-\d{2}-\d{2}$/.test(date)){toast('Enter a show name and date.',true);return;}
  const show={id:uid(),name,date,createdAt:new Date().toISOString()};
  try {
    await db.put('shows',show);await db.setMeta('activeShowId',show.id);
    state.shows.push(show);state.activeShowId=show.id;state.reportShowId=show.id;
    byId('show-dialog').close();setView('register');toast('Show created and selected.');
  }catch(error){errorMessage(error);}
}
async function chooseShow(id){
  state.activeShowId=id||null;
  try{await db.setMeta('activeShowId',state.activeShowId);renderRegister();}
  catch(error){errorMessage(error);}
}
function nonvoidSales(showId){return state.sales.filter(s=>s.showId===showId && !s.voidedAt);}
function reportData(showId){
  const sales=nonvoidSales(showId);
  const result={sales,items:0,total:0,discount:0,payment:new Map(),category:new Map(),products:new Map()};
  for(const s of sales){
    result.total+=s.totalCents;result.discount+=s.discountCents;
    result.payment.set(s.paymentMethod,(result.payment.get(s.paymentMethod)||0)+s.totalCents);
    for(const line of s.lines){
      result.items+=line.quantity;
      const net=line.unitNetPricesCents.reduce((a,b)=>a+b,0);
      const cat=result.category.get(line.category)||{qty:0,total:0};cat.qty+=line.quantity;cat.total+=net;result.category.set(line.category,cat);
      const key=line.productId;
      const product=result.products.get(key)||{sku:line.sku,name:line.name,category:line.category,qty:0,total:0};
      product.qty+=line.quantity;product.total+=net;result.products.set(key,product);
    }
  }
  return result;
}
function statCard(label,value){const card=element('div','surface stat-card');card.append(element('div','stat-caption',label),element('div','stat-number',value));return card;}
function reportTable(title,headers,rows){
  const panel=element('section','surface report-block');panel.append(element('h2','',title));
  if(rows.length===0){panel.append(element('p','subtle-text','Nothing recorded yet.'));return panel;}
  const table=element('table','report-table');const thead=element('thead');const tr=element('tr');
  headers.forEach(h=>tr.append(element('th','',h)));thead.append(tr);table.append(thead);
  const body=element('tbody');
  for(const fields of rows){const row=element('tr');fields.forEach((value,i)=>row.append(element('td',i===fields.length-1?'right':'',safeString(value))));body.append(row);}
  table.append(body);panel.append(table);return panel;
}
function renderReports(){
  renderShowPickers();
  const area=byId('reports-body');area.replaceChildren();
  const show=state.shows.find(s=>s.id===state.reportShowId);
  ['export-excel','export-detail','export-summary'].forEach(id=>byId(id).disabled=!show);
  if(!show){const empty=element('div','surface empty-state');empty.append(makeEmpty('Create a show to see reports','Every recorded sale will appear here under its show name and date.','New show',openShowDialog));area.append(empty);return;}
  const data=reportData(show.id);
  const cards=element('div','report-stats');
  cards.append(statCard('Show revenue',money(data.total)),statCard('Items sold',String(data.items)),statCard('Transactions',String(data.sales.length)));
  area.append(cards);
  const split=element('div','report-details');
  const payments=[...data.payment.entries()].sort((a,b)=>b[1]-a[1]).map(([name,total])=>[name,money(total)]);
  const categories=[...data.category.entries()].sort((a,b)=>b[1].total-a[1].total).map(([name,o])=>[name,String(o.qty),money(o.total)]);
  split.append(reportTable('Payment methods',['Method','Total'],payments));
  split.append(reportTable('Categories',['Category','Items','Total'],categories));
  area.append(split);
  const products=[...data.products.values()].sort((a,b)=>b.qty-a.qty || a.name.localeCompare(b.name)).map(p=>[p.name,`${p.sku} · ${p.category}`,String(p.qty),money(p.total)]);
  area.append(reportTable('Items sold by product',['Product','SKU / category','Qty','Total'],products));
  const panel=element('section','surface report-block transactions');panel.append(element('h2','','Transactions (including voided sales)'));
  const all=state.sales.filter(s=>s.showId===show.id).sort((a,b)=>b.timestamp.localeCompare(a.timestamp));
  if(!all.length)panel.append(element('p','subtle-text','No transactions for this show yet.'));
  for(const sale of all){
    const row=element('div',`transaction-row${sale.voidedAt?' is-void':''}`);
    const desc=element('div');
    desc.append(element('div','transaction-summary',`${money(sale.totalCents)} · ${sale.paymentMethod}${sale.voidedAt?' · VOIDED':''}`));
    const when=new Date(sale.timestamp).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
    const parts=sale.lines.map(line=>`${line.quantity} ${line.name}`).join(', ');
    desc.append(element('div','transaction-detail',`${when} · ${parts}`));row.append(desc);
    const actions=element('div','transaction-controls');
    if(!sale.voidedAt){
      const voidButton=element('button','btn btn-outline btn-small','Void');voidButton.type='button';voidButton.addEventListener('click',()=>voidSale(sale.id));actions.append(voidButton);
    }
    row.append(actions);panel.append(row);
  }
  area.append(panel);
}

function fileSafe(text){return (text || 'show').replace(/[^a-z0-9_-]+/gi,'-').replace(/^-|-$/g,'').slice(0,60)||'show';}
function csvCell(value){
  let s=safeString(value);
  // Prevent product names entered by a user from becoming Excel spreadsheet formulas.
  if(/^[\s]*[=+@\-\t\r]/.test(s)) s="'"+s;
  return `"${s.replaceAll('"','""')}"`;
}
function makeCSV(rows){return '\ufeff' + rows.map(row=>row.map(csvCell).join(',')).join('\r\n') + '\r\n';}
async function saveFile(blob,filename){
  const file=new File([blob],filename,{type:blob.type});
  if(navigator.share && navigator.canShare?.({files:[file]})){
    try{await navigator.share({files:[file],title:filename});return true;}
    catch(error){if(error?.name==='AbortError')return false;console.warn('Share sheet unavailable, using download',error);}
  }
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=filename;a.hidden=true;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
  return true; // Download initiated; not proof it was saved elsewhere.
}
async function downloadCSV(rows,filename){
  if(rows.length<=1){toast('There are no sales to export for this show.',true);return;}
  const file=new Blob([makeCSV(rows)],{type:'text/csv;charset=utf-8'});
  const launched=await saveFile(file,filename);
  if(launched)toast('Export prepared. Save the file outside this app.');
}
function reportShow(){return state.shows.find(s=>s.id===state.reportShowId);}
async function exportShow(mode){
  const show=reportShow();if(!show)return;
  const sales=nonvoidSales(show.id).sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
  const stem=`${show.date}-${fileSafe(show.name)}`;
  const excel=[['SKU','Titles','Category','Price','Payment','Location','Date','Year']];
  const detail=[['Transaction ID','Time','SKU','Titles','Category','Original Price','Discount','Price Charged','Payment','Location','Date']];
  for(const sale of sales){
    for(const line of sale.lines){
      for(const unitNet of line.unitNetPricesCents){
        excel.push([line.sku,line.name,line.category,(unitNet/100).toFixed(2),sale.paymentMethod,show.name,shortDate(show.date),show.date.slice(0,4)]);
        detail.push([sale.id,sale.timestamp,line.sku,line.name,line.category,(line.unitPriceCents/100).toFixed(2),((line.unitPriceCents-unitNet)/100).toFixed(2),(unitNet/100).toFixed(2),sale.paymentMethod,show.name,shortDate(show.date)]);
      }
    }
  }
  if(mode==='excel')return downloadCSV(excel,`${stem}-excel-sales.csv`);
  if(mode==='detail')return downloadCSV(detail,`${stem}-transactions.csv`);
  const data=reportData(show.id);
  const summary=[['SKU','Product','Category','Quantity','Net Sales']];
  for(const item of [...data.products.values()].sort((a,b)=>a.category.localeCompare(b.category)||a.name.localeCompare(b.name))){
    summary.push([item.sku,item.name,item.category,String(item.qty),(item.total/100).toFixed(2)]);
  }
  return downloadCSV(summary,`${stem}-product-totals.csv`);
}

function backupIsValid(data){
  if(!data||data.kind!=='market-register-full-backup'||data.version!==1||!data.data)throw new Error('This is not a supported Market Register backup (version 1).');
  for(const key of ['products','shows','sales','meta']){
    const rows=data.data[key];
    if(!Array.isArray(rows)||rows.length>50000) throw new Error(`Backup has an invalid ${key} section.`);
    const ids=new Set();
    for(const row of rows){
      if(!row||typeof row!=='object'||typeof row.id!=='string'||!row.id||ids.has(row.id))throw new Error(`Backup has invalid or duplicate IDs in ${key}.`);
      ids.add(row.id);
    }
  }
  for(const p of data.data.products){
    if(typeof p.name!=='string'||typeof p.category!=='string'||typeof p.priceCents!=='number'||!Number.isSafeInteger(p.priceCents)||p.priceCents<0||p.priceCents>999900) throw new Error('Backup contains an invalid product.');
    if(p.photo!==null&&p.photo!==undefined&& !(typeof p.photo==='string' && /^data:image\/(jpeg|png|webp);base64,/.test(p.photo)))throw new Error('Backup contains an unsupported product photo.');
  }
  for(const s of data.data.shows){if(typeof s.name!=='string'||typeof s.date!=='string') throw new Error('Backup contains an invalid show.');}
  for(const s of data.data.sales){
    if(typeof s.showId!=='string'||!Array.isArray(s.lines)||!Number.isSafeInteger(s.totalCents)||s.totalCents<0) throw new Error('Backup contains an invalid sale.');
    for(const line of s.lines){if(!Array.isArray(line.unitNetPricesCents)||line.unitNetPricesCents.length!==line.quantity||line.unitNetPricesCents.some(x=>!Number.isSafeInteger(x)||x<0))throw new Error('Backup contains invalid item prices.');}
  }
  return data.data;
}
async function createBackup(){
  const button=byId('create-backup');button.disabled=true;button.textContent='Preparing backup…';
  try {
    const snapshot=await db.snapshot();
    const content={kind:'market-register-full-backup',version:1,createdAt:new Date().toISOString(),data:snapshot};
    const blob=new Blob([JSON.stringify(content)],{type:'application/json'});
    const launched=await saveFile(blob,`market-register-full-backup-${localDate()}.json`);
    if(launched){
      state.lastBackupAt=new Date().toISOString();
      await db.setMeta('lastBackupPreparedAt',state.lastBackupAt);
      toast('Backup prepared. Verify you saved it in Files or on another device.');
      renderBackup();
    }
  } catch(error){errorMessage(error);}
  finally{button.disabled=false;button.textContent='Save full backup';}
}
async function restoreBackup(file){
  if(!file)return;
  if(file.size>250*1024*1024){toast('Backup is too large to import on this device.',true);return;}
  try {
    const raw=await file.text();
    const data=backupIsValid(JSON.parse(raw));
    const current=await db.snapshot();
    const count=current.products.length+current.shows.length+current.sales.length;
    const warning=`Restore ${data.products.length} products, ${data.shows.length} shows, and ${data.sales.length} sales?\n\nThis REPLACES all data currently stored on this iPad${count?` (${current.products.length} products, ${current.shows.length} shows, ${current.sales.length} sales)`:''}.\n\nMake a separate full backup of the current data first. This action cannot be undone.`;
    if(!window.confirm(warning))return;
    await db.restore(data);
    await reloadData();
    state.lastSaleId=null;state.activeCategory='All';
    setView('backup');toast('Backup restored. Verify the product and show totals.');
  }catch(error){errorMessage(error);}
}
async function renderBackup(){
  byId('backup-record-summary').textContent=`${state.products.length} products · ${state.shows.length} shows · ${state.sales.length} sales (including voided)`;
  const text=state.lastBackupAt?
    `Last backup prepared ${new Date(state.lastBackupAt).toLocaleString()}. Check that the backup file was actually saved.`:
    'No full backup has been generated from this installation. Save one before relying on the app.';
  byId('last-backup-label').textContent=text;
  if(navigator.storage?.estimate){
    try{const {usage,quota}=await navigator.storage.estimate();byId('backup-size').textContent=`Estimated browser storage used: ${(usage/1048576).toFixed(1)} MB${quota?` (device quota approximately ${(quota/1048576).toFixed(0)} MB)`:''}.`;}catch{}
  }
}
function render(){
  if(!state.ready) return;
  if(state.view==='register')renderRegister();
  if(state.view==='products')renderProducts();
  if(state.view==='shows')renderReports();
  if(state.view==='backup')renderBackup();
}
async function reloadData(){
  const [products,shows,sales,active,draft,lastBackup,categories,lastCategory]=await Promise.all([
    db.getAll('products'),db.getAll('shows'),db.getAll('sales'),db.getMeta('activeShowId'),db.getMeta('draftCart',{}),db.getMeta('lastBackupPreparedAt'),db.getMeta('productCategories',[]),db.getMeta('lastProductCategory')
  ]);
  state.products=products;state.shows=shows;state.sales=sales;
  state.categories=Array.isArray(categories)?categories.filter(category=>typeof category==='string'):[];
  state.lastProductCategory=canonicalCategory(lastCategory) || null;
  state.activeShowId=shows.some(s=>s.id===active)?active:null;
  state.reportShowId=state.activeShowId || [...shows].sort((a,b)=>b.date.localeCompare(a.date))[0]?.id || null;
  state.cart=Object.fromEntries(Object.entries(draft||{}).filter(([id,qty])=>products.some(p=>p.id===id)&&Number.isSafeInteger(qty)&&qty>0));
  state.lastBackupAt=lastBackup;
  state.ready=true;
}
function updateNetworkStatus(){
  const node=byId('network-status');
  const offline=!navigator.onLine;
  node.classList.toggle('is-offline',offline);
  node.querySelector('span:last-child').textContent=offline?'Offline · local data':'Local-first';
}
function connectEvents(){
  document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>setView(btn.dataset.view)));
  document.querySelectorAll('[data-close-dialog]').forEach(btn=>btn.addEventListener('click',()=>byId(btn.dataset.closeDialog).close()));
  byId('register-search').addEventListener('input',renderRegister);
  byId('active-show-select').addEventListener('change',event=>chooseShow(event.target.value));
  byId('new-show-register').addEventListener('click',openShowDialog);
  byId('new-show-report').addEventListener('click',openShowDialog);
  byId('complete-sale').addEventListener('click',completeSale);
  byId('clear-cart').addEventListener('click',()=>{
    if(totalCount()&&!window.confirm('Remove the items from the current sale? No sale has been recorded yet.'))return;
    state.cart={};persistCart();state.lastSaleId=null;renderRegister();
  });
  byId('undo-sale').addEventListener('click',()=>voidSale(state.lastSaleId));
  document.querySelectorAll('input[name="payment"]').forEach(input=>input.addEventListener('change',event=>state.payment=event.target.value));
  byId('add-product').addEventListener('click',()=>openProductDialog());
  byId('product-form').addEventListener('submit',saveProduct);
  byId('start-add-category').addEventListener('click',()=>{
    byId('new-category-fields').hidden=false;
    byId('category-message').textContent='Check the name before adding it. Existing categories are selected above.';
    byId('new-category-name').focus();
  });
  byId('cancel-add-category').addEventListener('click',()=>{closeCategoryEntry();byId('product-category').focus();});
  byId('save-category').addEventListener('click',addCategory);
  byId('new-category-name').addEventListener('keydown',event=>{
    if(event.key==='Enter'){event.preventDefault();if(!byId('save-category').disabled)addCategory();}
  });
  for(const id of ['product-camera','product-photo']){
    byId(id).addEventListener('change',async event=>{
      const file=event.target.files?.[0];
      if(!file)return;
      try{await processPhotoFile(file);}finally{event.target.value='';}
    });
  }
  byId('photo-size').addEventListener('change',async event=>{
    const value=Number(event.target.value);
    if(![256,384,512].includes(value))return;
    state.photoSize=value;
    byId('photo-status').textContent=`New photos will be saved at ${value} × ${value}. Existing pictures are unchanged.`;
    try{await db.setMeta('photoSize',value);}catch(error){errorMessage(error);}
  });
  byId('remove-photo').addEventListener('click',()=>{
    photoRequestId++;
    state.productPhoto=null;setPhotoProcessing(false);refreshPhotoPreview();
    byId('photo-status').textContent='Product photo removed.';
  });
  byId('manage-search').addEventListener('input',renderProducts);
  byId('manage-category').addEventListener('change',renderProducts);
  byId('show-hidden').addEventListener('change',renderProducts);
  byId('show-form').addEventListener('submit',saveShow);
  byId('report-show-select').addEventListener('change',event=>{state.reportShowId=event.target.value||null;renderReports();});
  byId('export-excel').addEventListener('click',()=>exportShow('excel').catch(errorMessage));
  byId('export-detail').addEventListener('click',()=>exportShow('detail').catch(errorMessage));
  byId('export-summary').addEventListener('click',()=>exportShow('summary').catch(errorMessage));
  byId('create-backup').addEventListener('click',createBackup);
  byId('start-restore').addEventListener('click',()=>byId('restore-file').click());
  byId('restore-file').addEventListener('change',async event=>{
    const file=event.target.files?.[0];event.target.value='';if(file)await restoreBackup(file);
  });
  window.addEventListener('online',updateNetworkStatus);
  window.addEventListener('offline',updateNetworkStatus);
}
async function startup(){
  connectEvents();updateNetworkStatus();
  try{
    await reloadData();
    const persistedSize=Number(await db.getMeta('photoSize',256));
    state.photoSize=[256,384,512].includes(persistedSize)?persistedSize:256;
    render();
  }catch(error){
    console.error(error);
    const container=byId('view-register');
    const warning=element('div','empty-state');warning.append(makeEmpty('Local storage could not be opened',
      'The register is disabled rather than risk losing transactions. Check your browser storage settings and reload.',null));
    container.prepend(warning);toast('Could not open local storage. Sales are disabled.',true);
    document.querySelectorAll('.nav-tab').forEach(b=>b.disabled=true);
    byId('complete-sale').disabled=true;
    return;
  }
  if ('serviceWorker' in navigator && location.protocol!=='file:') {
    navigator.serviceWorker.register('./service-worker.js').catch(error=>console.warn('Offline installation unavailable',error));
  }
}
startup();
