const test = require('node:test');
const assert = require('node:assert/strict');
const {validateBackup,calendarDate} = require('../market-register/data.js');
const {show,sales} = require('./fixtures/market-register-reports.js');
function backup() {
  return structuredClone({kind:'market-register-full-backup',version:1,data:{
    products:[{id:'example-product',name:'Example product',category:'Coasters',active:true,priceCents:400,photo:null}],
    shows:[show],sales:sales.filter(sale=>sale.showId===show.id),
    meta:[{id:'draftCart',value:{'example-product':2}},{id:'activeShowId',value:show.id},{id:'photoSize',value:256}]
  }});
}

test('version 1 backups retain legacy payments, optional metadata, historical product IDs, and voids unchanged', () => {
  const data=backup();const before=structuredClone(data);
  assert.equal(validateBackup(data),data.data);
  assert.deepEqual(data,before);
  data.data.shows[0]={...show};delete data.data.shows[0].completedAt;
  data.data.products[0].sku='OLD';
  assert.doesNotThrow(()=>validateBackup(data));
  assert.equal(calendarDate('2024-02-29'),true);
  for(const date of ['2026-02-29','2026-02-31','2026-13-01','not-a-date'])assert.equal(calendarDate(date),false);
});

const damage={
  'bad product price':data=>data.products[0].priceCents=1.5,
  'bad active flag':data=>data.products[0].active='yes',
  'duplicate ID':data=>data.products.push({...data.products[0]}),
  'unsafe object key':data=>data.products[0].id='__proto__',
  'bad photo':data=>data.products[0].photo='https://example.test/photo.jpg',
  'impossible show date':data=>data.shows[0].date='2026-02-31',
  'bad completion time':data=>data.shows[0].completedAt='bad-time',
  'missing sale time':data=>delete data.sales[0].timestamp,
  'orphaned show':data=>data.sales[0].showId='missing-show',
  'missing payment':data=>delete data.sales[0].paymentMethod,
  'empty sale':data=>data.sales[0].lines=[],
  'missing historical name':data=>delete data.sales[0].lines[0].name,
  'wrong unit count':data=>data.sales[0].lines[0].quantity=2,
  'negative net price':data=>data.sales[0].lines[0].unitNetPricesCents[0]=-1,
  'wrong subtotal':data=>data.sales[0].subtotalCents++,
  'wrong discount':data=>data.sales[0].discountCents++,
  'wrong total':data=>data.sales[0].totalCents++,
  'invalid void time':data=>data.sales[0].voidedAt='invalid',
  'invalid cart quantity':data=>data.meta[0].value['example-product']=0.5,
  'oversized draft':data=>data.meta[0].value['example-product']=10001,
  'missing draft product':data=>data.meta[0].value={missing:1},
  'bad category list':data=>data.meta.push({id:'productCategories',value:'Coasters'}),
  'bad active show':data=>data.meta[1].value='missing-show'
};
for(const [name,change] of Object.entries(damage))test(`backup rejects ${name} before replacement`,()=>{
  const data=backup();change(data.data);
  assert.throws(()=>validateBackup(data),/Backup/);
});
