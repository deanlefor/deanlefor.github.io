const test = require('node:test');
const assert = require('node:assert/strict');
const { parseDollarCents, priceSale } = require('../market-register/data.js');

const products = [
  { id: 'coaster', name: 'Coaster', category: 'Coasters', priceCents: 400, promoEligible: true },
  { id: 'gift', name: 'Gift', category: 'Gifts', priceCents: 1250 },
  { id: 'free', name: 'Free sample', category: 'Gifts', priceCents: 0 },
];
const net = sale => sale.lines.flatMap(line => line.unitNetPricesCents);

test('dollar amounts accept exact cents and reject negatives, percent, rounding, and unsafe values', () => {
  for (const [input, expected] of [['', 0], ['  ', 0], ['0', 0], ['.99', 99], ['1.', 100], ['2.50', 250], ['0003.01', 301], ['1.15', 115]])
    assert.equal(parseDollarCents(input), expected);
  for (const input of ['-1', '3%', '2.001', '1e3', 'NaN', '.', '1,000', '90071992547409.92'])
    assert.equal(parseDollarCents(input), null, input);
});

test('both adjustments apply after bundles and preserve the exact collected amount without changing products', () => {
  const before = structuredClone(products);
  const priced = priceSale(products, { coaster: 3, gift: 1 }, { tipCents: 300, manualDiscountCents: 250 });
  assert.equal(priced.subtotalCents, 2450);
  assert.equal(priced.promotionDiscountCents, 200);
  assert.equal(priced.manualDiscountCents, 250);
  assert.equal(priced.discountCents, 450);
  assert.equal(priced.merchandiseTotalCents, 2000);
  assert.equal(priced.totalCents, 2300);
  assert.deepEqual(net(priced), [296, 296, 297, 1111]);
  assert.equal(net(priced).reduce((sum, cents) => sum + cents, 0) + priced.tipCents, priced.totalCents);
  assert.deepEqual(products, before);
});

test('discounts cannot consume a tip or exceed merchandise, and a full discount keeps free items nonnegative', () => {
  assert.throws(() => priceSale(products, { coaster: 3 }, { manualDiscountCents: 1001, tipCents: 500 }), /cannot exceed/);
  const free = priceSale(products, { coaster: 3, gift: 2, free: 4 }, { manualDiscountCents: 3500, tipCents: 200 });
  assert.ok(net(free).every(cents => cents === 0));
  assert.equal(free.totalCents, 200);
  for (const discount of [1, 2, 17, 333, 999, 3499]) {
    const priced = priceSale(products, { coaster: 3, gift: 2, free: 4 }, { manualDiscountCents: discount });
    assert.ok(net(priced).every(cents => Number.isSafeInteger(cents) && cents >= 0));
    assert.equal(net(priced).reduce((sum, cents) => sum + cents, 0), 3500 - discount);
    assert.deepEqual(priced.lines.at(-1).unitNetPricesCents, [0, 0, 0, 0]);
  }
});

test('large baskets allocate all cents exactly even when multiplication exceeds safe floating-point integers', () => {
  const expensive = [{ ...products[1], priceCents: 999900 }];
  const priced = priceSale(expensive, { gift: 10000 }, { manualDiscountCents: 9998999999, tipCents: 123 });
  assert.equal(priced.totalCents, 124);
  assert.equal(net(priced).reduce((sum, cents) => sum + cents, 0), 1);
  assert.ok(net(priced).every(cents => cents === 0 || cents === 1));
});
