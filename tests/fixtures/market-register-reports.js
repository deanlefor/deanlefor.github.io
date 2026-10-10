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
module.exports = {show, sales, sale, line};
