// Shared by the browser and report tests; all amounts remain integer cents.
(function (root, factory) {
  const reports = factory();
  if (typeof module === 'object' && module.exports) module.exports = reports;
  else root.MarketReports = reports;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const money = (cents) =>
    (cents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  function paymentName(value) {
    if (value === 'Square') return 'Card';
    if (value === 'Cash App') return 'CashApp';
    return value || 'Unspecified';
  }
  function model(show, sales) {
    // Use actual instants rather than string order: restored ISO timestamps
    // may use different offsets. IDs make tied references stable across exports.
    const transactions = sales
      .filter((sale) => sale.showId === show.id)
      .sort(
        (a, b) =>
          Date.parse(a.timestamp) - Date.parse(b.timestamp) ||
          a.id.localeCompare(b.id),
      )
      .map((sale, index) => ({
        ...sale,
        // Older records stored only the automatic promotion discount.
        tipCents: sale.tipCents || 0,
        manualDiscountCents: sale.manualDiscountCents || 0,
        promotionDiscountCents:
          sale.promotionDiscountCents ??
          (sale.discountCents || 0) - (sale.manualDiscountCents || 0),
        payment: paymentName(sale.paymentMethod),
        ref: String(index + 1).padStart(3, '0'),
      }));
    const ledger = [],
      payments = new Map(),
      categories = new Map(),
      products = new Map();
    let total = 0,
      discount = 0,
      tipTotal = 0,
      manualDiscount = 0,
      promotionDiscount = 0,
      items = 0,
      validCount = 0;
    for (const sale of transactions) {
      if (!sale.voidedAt) {
        total += sale.totalCents;
        discount += sale.discountCents || 0;
        tipTotal += sale.tipCents;
        manualDiscount += sale.manualDiscountCents;
        promotionDiscount += sale.promotionDiscountCents;
        validCount++;
        const payment = payments.get(sale.payment) || {
          name: sale.payment,
          count: 0,
          total: 0,
        };
        payment.count++;
        payment.total += sale.totalCents;
        payments.set(sale.payment, payment);
      }
      for (const line of sale.lines) {
        for (const amount of line.unitNetPricesCents)
          ledger.push({
            sale,
            name: line.name,
            category: line.category,
            amount,
          });
        if (sale.voidedAt) continue;
        const net = line.unitNetPricesCents.reduce(
          (sum, amount) => sum + amount,
          0,
        );
        items += line.quantity;
        const category = categories.get(line.category) || {
          name: line.category,
          qty: 0,
          total: 0,
        };
        category.qty += line.quantity;
        category.total += net;
        categories.set(line.category, category);
        // Historical names and categories stay distinct even if the catalog was edited.
        const key = JSON.stringify([
          line.productId,
          line.sku || '',
          line.name,
          line.category,
        ]);
        const product = products.get(key) || {
          sku: line.sku || '',
          name: line.name,
          category: line.category,
          qty: 0,
          total: 0,
        };
        product.qty += line.quantity;
        product.total += net;
        products.set(key, product);
      }
      if (sale.tipCents)
        ledger.push({
          sale,
          name: 'Tip',
          category: 'Tips',
          amount: sale.tipCents,
          isTip: true,
        });
    }
    const cards = transactions.filter((sale) => sale.payment === 'Card');
    return {
      show,
      transactions,
      ledger,
      cards,
      total,
      discount,
      tipTotal,
      manualDiscount,
      promotionDiscount,
      merchandiseTotal: total - tipTotal,
      items,
      validCount,
      voidCount: transactions.length - validCount,
      cardTotal: cards
        .filter((sale) => !sale.voidedAt)
        .reduce((sum, sale) => sum + sale.totalCents, 0),
      cardCount: cards.filter((sale) => !sale.voidedAt).length,
      payments: [...payments.values()].sort(
        (a, b) => b.total - a.total || a.name.localeCompare(b.name),
      ),
      categories: [...categories.values()].sort(
        (a, b) => b.total - a.total || a.name.localeCompare(b.name),
      ),
      products: [...products.values()].sort(
        (a, b) =>
          b.qty - a.qty || b.total - a.total || a.name.localeCompare(b.name),
      ),
    };
  }
  const titles = {
    card: 'Card transactions',
    ledger: 'Item ledger',
    summary: 'Show summary',
  };
  function definition(
    kind,
    data,
    {
      generatedAt = new Date(),
      timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
    } = {},
  ) {
    if (!titles[kind]) throw new Error('Choose a supported PDF report.');
    const format = (timestamp) =>
      new Date(timestamp).toLocaleString('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
      });
    const showDate = data.show.date.split('-').reverse();
    const date = `${Number(showDate[1])}/${Number(showDate[0])}/${showDate[2]}`;
    const note = (text) => ({ text, style: 'note', margin: [0, 0, 0, 12] });
    const number = (value) => ({ text: String(value), alignment: 'right' });
    const amount = (value) => number(money(value));
    function table(headers, widths, rows, options = {}) {
      return {
        margin: [0, 0, 0, 14],
        fontSize: options.fontSize || 9,
        table: {
          headerRows: 1,
          dontBreakRows: true,
          widths,
          heights: options.height || undefined,
          body: [
            headers.map((text) => ({
              text,
              bold: true,
              color: '#ffffff',
              fillColor: '#244c41',
            })),
            ...rows,
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#ccd5d0',
          vLineColor: () => '#ccd5d0',
          paddingLeft: () => 6,
          paddingRight: () => 6,
          paddingTop: () => (kind === 'summary' ? 5 : 7),
          paddingBottom: () => (kind === 'summary' ? 5 : 7),
        },
      };
    }
    const content = [];
    if (kind === 'card') {
      content.push({
        text: `${data.cardCount} card transactions  |  Recorded amount: ${money(data.cardTotal)}  |  ${data.cards.length - data.cardCount} voided`,
        style: 'intro',
      });
      content.push(
        note(
          'Card payments only, including older Square records. Recorded amounts include tips and both discounts. Add tax and final charged amounts outside the app. Voided sales are shown for reference and excluded from totals.',
        ),
      );
      if (!data.cards.length)
        content.push({
          text: 'No card transactions recorded for this show.',
          margin: [0, 12, 0, 12],
        });
      else {
        const rows = data.cards.flatMap((sale) => {
          const chunks = [];
          // Bound each row so even a large basket can paginate without cutting a row.
          for (let index = 0; index < sale.lines.length; index += 4) {
            const continued = index > 0;
            const description = sale.lines
              .slice(index, index + 4)
              .map((line) => `${line.quantity} x ${line.name}`)
              .join('\n');
            chunks.push([
              sale.ref,
              format(sale.timestamp),
              {
                stack: [
                  {
                    text: `${continued ? 'Continued items:\n' : ''}${description}`,
                  },
                  ...(!continued && (sale.tipCents || sale.discountCents)
                    ? [
                        {
                          text: `Tip: ${money(sale.tipCents)}\nDiscount: ${money(sale.manualDiscountCents)} | 3 for $10: ${money(sale.promotionDiscountCents)}`,
                          fontSize: 8,
                          margin: [0, 5, 0, 0],
                        },
                      ]
                    : []),
                  {
                    text: `App ID: ${sale.id}`,
                    fontSize: 7,
                    color: '#66766d',
                    margin: [0, 5, 0, 0],
                  },
                ],
              },
              continued ? '' : amount(sale.totalCents),
              sale.voidedAt || continued ? '-' : '',
              sale.voidedAt || continued ? '-' : '',
              sale.voidedAt
                ? {
                    text: `VOIDED\n${format(sale.voidedAt)}`,
                    color: '#943b32',
                    fontSize: 8,
                  }
                : continued
                  ? 'Continued'
                  : 'Recorded',
            ]);
          }
          return chunks;
        });
        rows.push([
          { text: 'TOTAL (excludes voided)', colSpan: 3, bold: true },
          {},
          {},
          { ...amount(data.cardTotal), bold: true },
          '',
          '',
          '',
        ]);
        content.push(
          table(
            [
              'Ref.',
              'Date / time',
              'Items / app reference',
              'Recorded\namount',
              'Tax added',
              'Final\ncharged',
              'Status',
            ],
            [26, 100, '*', 67, 65, 75, 66],
            rows,
            { height: 42 },
          ),
        );
      }
      content.push(
        note(
          'App IDs identify Market Register records, not card processor receipts. Ref. numbers match the item ledger. Large sales continue under the same reference; their amount appears once. No tax is calculated or saved.',
        ),
      );
    } else if (kind === 'ledger') {
      content.push({
        text: `${data.items} items sold  |  Recorded amount: ${money(data.total)}  |  ${data.validCount} transactions`,
        style: 'intro',
      });
      content.push(
        note(
          `One row per individual item, oldest sale first. Item prices include all discounts; each tip has a separate row under its transaction. Tips do not count as items sold. ${data.voidCount} voided transactions are visible and excluded from the totals above. Ref. numbers match the card report.`,
        ),
      );
      if (!data.ledger.length)
        content.push({
          text: 'No items recorded for this show.',
          margin: [0, 12, 0, 12],
        });
      else
        content.push(
          table(
            [
              'Date / time',
              'Ref.',
              'Item title',
              'Category',
              'Payment',
              'Amount',
              'Status',
            ],
            [100, 26, '*', 91, 51, 59, 59],
            data.ledger.map((row) => [
              format(row.sale.timestamp),
              row.sale.ref,
              row.name,
              row.category,
              row.sale.payment,
              amount(row.amount),
              row.sale.voidedAt
                ? { text: 'VOIDED', color: '#943b32' }
                : 'Recorded',
            ]),
            { fontSize: 8.5 },
          ),
        );
    } else {
      content.push({
        text: `Recorded amount: ${money(data.total)}`,
        style: 'intro',
      });
      content.push(
        note(
          `${data.validCount} transactions  |  ${data.items} items sold  |  Discounts: ${money(data.discount)}\nAverage transaction: ${money(data.validCount ? Math.round(data.total / data.validCount) : 0)}  |  ${data.voidCount} voided transactions excluded`,
        ),
      );
      content.push(
        table(
          ['Sale amounts', 'Amount'],
          ['*', 110],
          [
            ['Items after discounts', amount(data.merchandiseTotal)],
            ['Tips', amount(data.tipTotal)],
            ['Dollar discounts', amount(data.manualDiscount)],
            ['3 for $10 savings', amount(data.promotionDiscount)],
          ],
        ),
      );
      content.push({ text: 'Payment totals', style: 'section' });
      if (data.payments.length)
        content.push(
          table(
            ['Payment', 'Transactions', 'Recorded amount'],
            ['*', 90, 110],
            data.payments.map((row) => [
              row.name,
              number(row.count),
              amount(row.total),
            ]),
          ),
        );
      else content.push(note('No nonvoid sales recorded.'));
      content.push({ text: 'Category totals - items only', style: 'section' });
      if (data.categories.length)
        content.push(
          table(
            ['Category', 'Items sold', 'Net item sales'],
            ['*', 70, 110],
            data.categories.map((row) => [
              row.name,
              number(row.qty),
              amount(row.total),
            ]),
          ),
        );
      else content.push(note('No items sold.'));
      content.push({ text: 'Products - most sold first', style: 'section' });
      if (data.products.length)
        content.push(
          table(
            ['Item title', 'Category', 'Items', 'Net item sales'],
            ['*', 100, 40, 100],
            data.products.map((row) => [
              row.name,
              row.category,
              number(row.qty),
              amount(row.total),
            ]),
          ),
        );
      else content.push(note('No items sold.'));
      content.push(
        note(
          'Totals use recorded sales after discounts, with voided sales excluded. Tax or payment adjustments made outside Market Register are not included. Historical PayPal and Other records retain their payment labels.',
        ),
      );
    }
    // A trailing paragraph margin must not create a blank final page.
    content[content.length - 1].margin = [0, 0, 0, 0];
    return {
      pageSize: 'LETTER',
      pageOrientation: kind === 'summary' ? 'portrait' : 'landscape',
      pageMargins: [36, 105, 36, 45],
      info: {
        title: `${titles[kind]} - ${data.show.name}`,
        author: 'Market Register',
        subject: 'Show sales records',
      },
      defaultStyle: { font: 'Roboto', fontSize: 9, color: '#24342c' },
      styles: {
        intro: { fontSize: 12, bold: true, margin: [0, 0, 0, 8] },
        section: { fontSize: 12, bold: true, margin: [0, 6, 0, 8] },
        note: { fontSize: 8, color: '#5d6c63', lineHeight: 1.25 },
      },
      header: {
        margin: [36, 24, 36, 0],
        stack: [
          {
            text: 'MARKET REGISTER',
            fontSize: 8,
            bold: true,
            color: '#64766b',
            characterSpacing: 1.5,
          },
          {
            text: titles[kind],
            fontSize: 21,
            bold: true,
            color: '#244c41',
            margin: [0, 4, 0, 3],
          },
          {
            text: `${data.show.name}  |  ${date}  |  ${data.show.completedAt ? 'Completed' : 'Open'}`,
            fontSize: 9,
          },
        ],
      },
      footer: (page, pages) => ({
        margin: [36, 12, 36, 0],
        columns: [
          {
            text: `Generated ${format(generatedAt)}  |  Times: ${timeZone}`,
            fontSize: 7,
            color: '#64766b',
          },
          {
            text: `Page ${page} of ${pages}`,
            fontSize: 7,
            alignment: 'right',
            width: 70,
          },
        ],
      }),
      content,
    };
  }
  return { paymentName, model, definition };
});
