// Backup validation is shared with tests and runs before any replacement warning.
// Keep version 1 compatible: old optional settings and timestamps may be absent.
(function (root, factory) {
  const data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  else root.MarketData = data;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const MAX_CART_ITEMS = 10000;
  const object = (value) =>
    value !== null && typeof value === 'object' && !Array.isArray(value);
  const text = (value) => typeof value === 'string' && value.trim().length > 0;
  const cents = (value) => Number.isSafeInteger(value) && value >= 0;
  const timestamp = (value) =>
    typeof value === 'string' &&
    /^\d{4}-\d\d-\d\dT/.test(value) &&
    calendarDate(value.slice(0, 10)) &&
    Number.isFinite(Date.parse(value));
  const optionalTimestamp = (value) =>
    value === null || value === undefined || timestamp(value);
  function calendarDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\d$/.test(value))
      return false;
    const date = new Date(`${value}T00:00:00Z`);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }
  function validateBackup(backup) {
    if (
      !object(backup) ||
      backup.kind !== 'market-register-full-backup' ||
      backup.version !== 1 ||
      !object(backup.data)
    ) {
      throw new Error(
        'This is not a supported Market Register backup (version 1).',
      );
    }
    const data = backup.data;
    for (const key of ['products', 'shows', 'sales', 'meta']) {
      if (!Array.isArray(data[key]) || data[key].length > 50000)
        throw new Error(`Backup has an invalid ${key} section.`);
      const ids = new Set();
      for (const row of data[key]) {
        if (
          !object(row) ||
          !text(row.id) ||
          ['__proto__', 'constructor', 'prototype'].includes(row.id) ||
          ids.has(row.id)
        ) {
          throw new Error(`Backup has invalid or duplicate IDs in ${key}.`);
        }
        ids.add(row.id);
      }
    }
    const productIds = new Set(data.products.map((row) => row.id));
    const showIds = new Set(data.shows.map((row) => row.id));
    for (const product of data.products) {
      if (
        !text(product.name) ||
        !text(product.category) ||
        !cents(product.priceCents) ||
        product.priceCents > 999900 ||
        typeof product.active !== 'boolean' ||
        (product.sku !== undefined && typeof product.sku !== 'string') ||
        (product.promoEligible !== undefined &&
          typeof product.promoEligible !== 'boolean') ||
        !optionalTimestamp(product.createdAt) ||
        !optionalTimestamp(product.updatedAt)
      )
        throw new Error('Backup contains an invalid product.');
      if (
        product.photo !== null &&
        product.photo !== undefined &&
        !(
          typeof product.photo === 'string' &&
          /^data:image\/(jpeg|png|webp);base64,/.test(product.photo)
        )
      ) {
        throw new Error('Backup contains an unsupported product photo.');
      }
    }
    for (const show of data.shows) {
      if (
        !text(show.name) ||
        !calendarDate(show.date) ||
        !optionalTimestamp(show.createdAt) ||
        !optionalTimestamp(show.completedAt)
      ) {
        throw new Error('Backup contains an invalid show.');
      }
    }
    for (const sale of data.sales) {
      if (
        !showIds.has(sale.showId) ||
        !timestamp(sale.timestamp) ||
        !text(sale.paymentMethod) ||
        !optionalTimestamp(sale.voidedAt) ||
        !Array.isArray(sale.lines) ||
        !sale.lines.length ||
        !cents(sale.subtotalCents) ||
        !cents(sale.discountCents) ||
        !cents(sale.totalCents)
      ) {
        throw new Error('Backup contains an invalid sale.');
      }
      let subtotal = 0,
        net = 0,
        quantity = 0;
      for (const line of sale.lines) {
        // Historical lines are self-contained snapshots. A retired catalog ID
        // need not still exist; names, category, and all prices must be intact.
        if (
          !object(line) ||
          !text(line.productId) ||
          !text(line.name) ||
          !text(line.category) ||
          (line.sku !== undefined && typeof line.sku !== 'string') ||
          !cents(line.unitPriceCents) ||
          !Number.isSafeInteger(line.quantity) ||
          line.quantity <= 0 ||
          !Array.isArray(line.unitNetPricesCents) ||
          line.unitNetPricesCents.length !== line.quantity ||
          line.unitNetPricesCents.some(
            (value) => !cents(value) || value > line.unitPriceCents,
          )
        ) {
          throw new Error('Backup contains invalid item prices or details.');
        }
        quantity += line.quantity;
        subtotal += line.quantity * line.unitPriceCents;
        net += line.unitNetPricesCents.reduce((sum, value) => sum + value, 0);
      }
      if (
        quantity > MAX_CART_ITEMS ||
        !cents(subtotal) ||
        !cents(net) ||
        subtotal !== sale.subtotalCents ||
        net !== sale.totalCents ||
        subtotal - net !== sale.discountCents
      ) {
        throw new Error('Backup contains inconsistent sale totals.');
      }
    }
    for (const { id, value } of data.meta) {
      let valid = true;
      if (id === 'draftCart')
        valid =
          object(value) &&
          Object.entries(value).every(
            ([productId, qty]) =>
              productIds.has(productId) && Number.isSafeInteger(qty) && qty > 0,
          ) &&
          Object.values(value).reduce((sum, qty) => sum + qty, 0) <=
            MAX_CART_ITEMS;
      if (id === 'activeShowId') valid = value === null || showIds.has(value);
      if (id === 'productCategories' || id === 'removedProductCategories')
        valid = Array.isArray(value) && value.every(text);
      if (id === 'lastProductCategory') valid = value === null || text(value);
      if (id === 'lastBackupPreparedAt') valid = optionalTimestamp(value);
      if (id === 'photoSize') valid = [256, 384, 512].includes(value);
      if (id === 'draftPayment')
        valid = ['Cash', 'Card', 'Venmo'].includes(value);
      if (!valid) throw new Error(`Backup contains an invalid ${id} setting.`);
    }
    return data;
  }
  return { validateBackup, calendarDate, MAX_CART_ITEMS };
});
