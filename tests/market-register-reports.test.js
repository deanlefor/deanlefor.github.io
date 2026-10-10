const test = require('node:test');
const assert = require('node:assert/strict');
const reports = require('../market-register/reports.js');
const pdfMake = require('../market-register/vendor/pdfmake.min.js');
pdfMake.addVirtualFileSystem(require('../market-register/vendor/vfs_fonts.js'));
const {show,sales,sale,line,adjustedSales} = require('./fixtures/market-register-reports.js');
const options = {generatedAt:new Date('2026-10-10T21:00:00Z'), timeZone:'America/New_York'};

test('transaction adjustments reconcile across reports without counting tips as merchandise or including void amounts', async () => {
  const before = structuredClone(adjustedSales);
  const data = reports.model(show, adjustedSales);
  assert.equal(data.total, 4300);
  assert.equal(data.tipTotal, 500);
  assert.equal(data.merchandiseTotal, 3800);
  assert.equal(data.discount, 800);
  assert.equal(data.manualDiscount, 600);
  assert.equal(data.promotionDiscount, 200);
  assert.equal(data.items, 6);
  assert.equal(data.validCount, 3);
  assert.equal(data.cardCount, 1);
  assert.equal(data.cardTotal, 2300);
  assert.equal(data.payments.reduce((sum,row) => sum + row.total,0),data.total);
  assert.equal(data.categories.reduce((sum,row) => sum + row.total,0),data.merchandiseTotal);
  assert.equal(data.products.reduce((sum,row) => sum + row.qty,0),data.items);
  assert.equal(data.ledger.filter(row=>!row.sale.voidedAt).reduce((sum,row)=>sum+row.amount,0),data.total);
  assert.equal(data.ledger.filter(row=>row.isTip).length,3);
  assert.deepEqual(data.ledger.filter(row=>row.sale.id==='example-both').map(row=>row.name),['Autumn coaster','Autumn coaster','Autumn coaster','Hand-painted ornament','Tip']);
  assert.deepEqual(adjustedSales,before);
  for (const kind of ['card','ledger','summary']) {
    const doc=reports.definition(kind,data,options);
    const text=JSON.stringify(doc);
    assert.match(text,/Tip/);
    if (kind==='card') {
      const rows=doc.content.find(node=>node.table).table.body;
      assert.equal(rows[1][3].text,'$23.00');
      assert.match(JSON.stringify(rows[1]),/Tip: \$3.00/);
      assert.match(JSON.stringify(rows[1]),/Discount: \$5.00/);
      assert.deepEqual(rows[1].slice(4,6),['','']);
      assert.equal(rows.at(-1)[3].text,'$23.00');
    }
    const bytes=await pdfMake.createPdf(doc).getBuffer();
    assert.equal(bytes.subarray(0,5).toString(),'%PDF-');
  }
});

test('card records include Card and legacy Square only, in time order, with voids excluded from totals', () => {
  const before = structuredClone(sales);
  const data = reports.model(show,sales);
  assert.deepEqual(data.cards.map(sale => [sale.id,sale.ref]), [['example-square','002'],['example-card-2','003'],['example-card-void','004']]);
  assert.equal(data.cardCount,2); assert.equal(data.cardTotal,2500);
  assert.equal(data.validCount,5); assert.equal(data.total,4900);
  assert.equal(data.discount,200); assert.equal(data.items,7);
  assert.deepEqual(data.payments.find(row => row.name==='Card'),{name:'Card',count:2,total:2500});
  assert.equal(data.payments.find(row => row.name==='CashApp').total,1200);
  assert.deepEqual(sales,before,'reading a report never rewrites stored history');
  assert.equal(reports.paymentName('PayPal'),'PayPal');
  assert.equal(reports.paymentName('Other'),'Other');
});

test('ledger retains every individual unit and promotion cents, chronological references, and void history', () => {
  const data=reports.model(show,sales);
  assert.equal(data.ledger.length,8);
  assert.deepEqual(data.ledger.filter(row=>row.sale.ref==='002').map(row=>row.amount),[333,333,334]);
  assert.deepEqual(data.ledger.map(row=>row.sale.ref),['001','002','002','002','003','004','005','006']);
  assert.equal(data.ledger.filter(row=>!row.sale.voidedAt).reduce((sum,row)=>sum+row.amount,0),data.total);
  assert.equal(data.categories.reduce((sum,row)=>sum+row.total,0),data.total);
  assert.equal(data.products.reduce((sum,row)=>sum+row.qty,0),data.items);
  assert.equal(data.products[0].name,'Lake coaster');
});

test('card PDF offers blank tax and final charged cells for recorded sales, and no write-in cells for voids', () => {
  const doc=reports.definition('card',reports.model(show,sales),options);
  const table=doc.content.find(node=>node.table).table;
  assert.equal(table.headerRows,1);
  const [header,first,second,voided,total]=table.body;
  assert.equal(header[4].text,'Tax added');
  assert.equal(header[5].text,'Final\ncharged');
  for(const row of [first,second]) assert.deepEqual(row.slice(4,6),['','']);
  assert.deepEqual(voided.slice(4,6),['-','-']);
  assert.match(voided[6].text,/VOIDED/);
  assert.equal(total[3].text,'$25.00');
  assert.match(JSON.stringify(doc),/example-square/);
});

test('reports handle empty shows, zero-dollar transactions, old payment choices, and edited product categories', async () => {
  for(const kind of ['card','ledger','summary']) {
    const doc=reports.definition(kind,reports.model(show,[]),options);
    const bytes=await pdfMake.createPdf(doc).getBuffer();
    assert.equal(bytes.subarray(0,5).toString(),'%PDF-');
  }
  const zero=sale('zero','2026-10-10T15:00:00Z','Card',[line('Gift','Gifts',[0])]);
  const older=sale('paypal','2026-10-10T16:00:00Z','PayPal',[{...line('Gift','New category',[100]),productId:'Gift'}]);
  const data=reports.model(show,[zero,older]);
  assert.equal(data.cardCount,1); assert.equal(data.cardTotal,0);
  assert.equal(data.products.length,2);
  assert.equal(data.payments.find(row=>row.name==='PayPal').total,100);
});

test('all report formats produce real multi-page PDFs for long names and a busy show', async () => {
  const busy=Array.from({length:90},(_,i)=>sale(`example-${i}`,new Date(Date.UTC(2026,9,10,12,i)).toISOString(),i%2 ? 'Square':'Card',[
    line(`Café autumn coaster - a long descriptive product name ${i}`,'Handmade decorations and gifts',[333,333,334],400)
  ]));
  for(const kind of ['card','ledger','summary']) {
    const doc=reports.definition(kind,reports.model(show,busy),options);
    const bytes=await pdfMake.createPdf(doc).getBuffer();
    assert.equal(bytes.subarray(0,5).toString(),'%PDF-');
    const count=(bytes.toString('latin1').match(/\/Type \/Page\b/g)||[]).length;
    assert.ok(count>1,`${kind} paginates a busy show`);
  }
});

test('a large card basket continues across bounded rows without repeating its amount or tax fields', async () => {
  const basket=sale('example-large-basket','2026-10-10T14:00:00Z','Card',Array.from({length:50},(_,i)=>
    line(`Example handmade decoration with a deliberately long descriptive title ${i}`,'Decorations',[500])));
  const doc=reports.definition('card',reports.model(show,[basket]),options);
  const rows=doc.content.find(node=>node.table).table.body.slice(1,-1);
  assert.equal(rows.length,13);
  assert.equal(rows[0][3].text,'$250.00');
  assert.ok(rows.slice(1).every(row=>row[3]===''&&row[4]==='-'&&row[5]==='-'));
  assert.ok(rows.every(row=>row[0]==='001'));
  const bytes=await pdfMake.createPdf(doc).getBuffer();
  assert.ok((bytes.toString('latin1').match(/\/Type \/Page\b/g)||[]).length>1);
});

test('transaction order uses actual times across timezone offsets with stable tied references', () => {
  const timed=[sale('later','2026-10-10T12:00:00Z','Card',[line('Later','Gifts',[100])]),
    sale('b','2026-10-10T13:00:00+02:00','Card',[line('Earlier','Gifts',[100])]),
    sale('a','2026-10-10T11:00:00Z','Card',[line('Tie','Gifts',[100])])];
  assert.deepEqual(reports.model(show,timed).transactions.map(row=>[row.id,row.ref]),[['a','001'],['b','002'],['later','003']]);
});
