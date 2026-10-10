// Fictional records only, shared by automated tests and local PDF layout review.
const show = {id:'example-show', name:'Example Autumn Market', date:'2026-10-10', completedAt:'2026-10-10T20:00:00Z'};
function sale(id, timestamp, paymentMethod, lines, voidedAt=null) {
  const subtotalCents = lines.reduce((sum,line) => sum + line.quantity * line.unitPriceCents,0);
  const totalCents = lines.reduce((sum,line) => sum + line.unitNetPricesCents.reduce((sum,value) => sum + value,0),0);
  return {id, showId:show.id, showName:show.name, showDate:show.date, timestamp, paymentMethod, lines, subtotalCents, discountCents:subtotalCents-totalCents, totalCents, voidedAt};
}
function line(name, category, prices, original=prices[0]) {
  return {productId:name, sku:'EXAMPLE', name, category, quantity:prices.length, unitPriceCents:original, unitNetPricesCents:prices};
}
const sales = [
  sale('example-card-2','2026-10-10T14:20:00Z','Card',[line('Hand-painted autumn ornament','Decorations',[1500])]),
  sale('example-cash','2026-10-10T14:00:00Z','Cash',[line('Mini dragon','3D Printing',[400])]),
  sale('example-card-void','2026-10-10T14:30:00Z','Card',[line('Coaster','Coasters',[400])],'2026-10-10T14:32:00Z'),
  sale('example-square','2026-10-10T14:10:00Z','Square',[line('Lake coaster','Coasters',[333,333,334],400)]),
  sale('example-venmo','2026-10-10T14:40:00Z','Venmo',[line('Café bracelet','Jewelry',[800])]),
  sale('example-cashapp','2026-10-10T14:50:00Z','Cash App',[line('Example wooden puzzle','Games',[1200])]),
  {...sale('other-show-card','2026-10-03T14:00:00Z','Card',[line('Another show item','Other',[9999])]),showId:'other-show'},
];
const { priceSale } = require('../../market-register/data.js');
const adjustmentProducts = [
  { id:'example-coaster', sku:'EXAMPLE-1', name:'Autumn coaster', category:'Coasters', priceCents:400, promoEligible:true },
  { id:'example-ornament', sku:'EXAMPLE-2', name:'Hand-painted ornament', category:'Decorations', priceCents:1500 },
];
function adjustedSale(id, timestamp, paymentMethod, cart, adjustments, voidedAt=null) {
  const priced = priceSale(adjustmentProducts, cart, adjustments);
  return { id, showId:show.id, showName:show.name, showDate:show.date, timestamp, paymentMethod, ...priced, voidedAt };
}
const adjustedSales = [
  adjustedSale('example-both','2026-10-10T14:00:00Z','Card',{'example-coaster':3,'example-ornament':1},{manualDiscountCents:500,tipCents:300}),
  adjustedSale('example-tip','2026-10-10T14:10:00Z','Cash',{'example-ornament':1},{tipCents:200}),
  adjustedSale('example-discount','2026-10-10T14:20:00Z','Venmo',{'example-coaster':1},{manualDiscountCents:100}),
  adjustedSale('example-void-both','2026-10-10T14:30:00Z','Card',{'example-ornament':1},{manualDiscountCents:200,tipCents:100},'2026-10-10T14:35:00Z'),
];
module.exports = {show, sales, sale, line, adjustedSales};
