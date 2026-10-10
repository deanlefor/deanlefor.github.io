# Market Register — prototype 0.8

A small, locally stored sales register for an iPad at a farmers market or craft booth.

**What it does:** product photo buttons, categories, a running sale total, named markets/shows, payment-method notation, 3-for-$10 pricing for designated $4 products, reports, Excel-compatible exports, and full backup/restore.

**What it deliberately does NOT do:** accept payments, synchronize to the cloud, require an account or subscription, keep quantities on hand, calculate production costs, or modify your existing Excel workbook directly.

> **Prototype, not yet production-validated.** Test on the actual iPad, including an offline restart and restoring a backup on another device, before recording real sales. Until then, keep the existing notebook/Excel workflow as a fallback.

## First test on a Mac

1. Unzip the project folder.
2. Open Terminal in the folder containing `index.html`.
3. Run `python3 -m http.server 8000` (if you have Python 3), or use another local static web server.
4. Visit `http://localhost:8000` in Safari or Chrome. The first load needs a browser that supports IndexedDB.
5. In **Products**, select **Add product**. Enter **Mini Dragon**, price **4.00**, category **3D Printing**. For a photo, choose **Take photo** on the iPad or **Choose existing photo** on any supported device. The image is automatically resized and compressed. Choose **Save & add another** to continue entering that category.
6. Under **Register**, select **New show**, enter a market name and date, then tap products. Mark the payment method *after* collecting money in the separate payment app and press **Record completed sale**.
7. Use **Shows & reports** to view the totals and export.
8. Go to **Backups** and save a full `.json` backup *outside the browser*.

Opening `index.html` directly as a file is **not** a substitute for running a local web server. In particular, installable offline behavior requires HTTPS or localhost.

## Install on the iPad (after first testing)

### This website's deployment

The application lives at `/market-register/` on this website. Keep it out of
homepage links, navigation, the terminal directory, and the sitemap. Its HTML
requests `noindex, nofollow`; this is an unlisted public app, with no access
control. Inventory, photos, and sales remain in each device's IndexedDB.

If transferring records from a localhost test, save a full backup there and
restore it at the hosted address. The two addresses have separate browser data.
On an iPad, install the Home Screen app before restoring or entering real data.

The service worker is scoped to this directory and caches only its static app
files. Bump its cache version whenever these files change. Never commit full
backups or sales exports to this public repository.

### General hosting instructions

This is a static Progressive Web App (PWA), so you can publish the *app code* with any HTTPS static hosting service. You do not need a server, cloud database, or user accounts for the app itself. One free route is GitHub Pages:

1. Create a GitHub repository for the application code. It can be a public repository because it contains only code, **not** your parents' sales data. Confirm the repository's privacy and Pages availability before publishing.
2. Upload the **contents** of this folder so `index.html`, `app.js`, `db.js`, and the other app files are at the deployed site root. Do not upload backup files, customer information, or sales exports.
3. In repository **Settings → Pages**, choose deployment from your main branch and the root folder.
4. Once Pages provides an `https://...` URL, open it on the iPad using Safari.
5. In Safari's Share menu choose **Add to Home Screen** and open **Market Register** from its new Home Screen icon.
6. While online, open the app and let it finish loading. Then turn off Wi-Fi and cellular access and test that the installed app still opens and records a test sale.

**Important:** Treat the installed Home Screen app as its own storage environment. Do not assume catalog data entered in a Safari tab will automatically appear after installing the Home Screen app. Start entering real products *after* installation, or use the full backup/restore mechanism to transfer data.

The web host serves only the HTML, JavaScript, CSS, and icon files. This app has no code to upload photos or transactions to any server. The browser may still contact the static host for application updates.

## Data and backups (important)

- Every product, show, and completed sale is saved in **IndexedDB** local to the installed app. A completed sale and clearing its checkout cart are saved atomically.
- Product photos are resized to reduce storage size, then saved alongside the local catalog. Default: **256 × 256 pixels**, saved as a compressed JPEG; optional sizes **384 × 384** and **512 × 512** are available in the Add Product form. The size preference is remembered on that device.
- **Take photo** requests the rear-facing camera using an HTML file input with `capture="environment"`. The actual camera/photo picker may vary with Safari and iPadOS; on a Mac, the same control might open a file picker instead. **Choose existing photo** allows the photo library or files. The application does not change the device's system camera quality, and you do not need to adjust the iPad's Camera settings.
- The saved square image is letterboxed to retain the entire product, not cropped. It is recompressed at about 70% JPEG quality; original high-resolution images and GPS/EXIF metadata are not stored as the product image in the local database. The device may independently store pictures in Photos depending on its camera workflow.
- The photo is converted before the product can be saved. A status message displays its dimensions and approximate compressed size. The complete backup includes the compressed images as part of its JSON, whereas Excel sales exports contain no photos.
- **Backups → Save full backup** prepares a restorable `.json` file containing products, photos, shows, sales (including void history), and app settings. Use the iPad Share sheet or download UI to place it in **Files**, **iCloud Drive**, or copy it to a computer.
- **Backups → Choose backup file** replaces the current local data *only after a warning and your confirmation*. Restore a test file on another device before the first live market.
- A note saying a backup was **prepared** is **not proof it was saved elsewhere**. Confirm the file exists in Files or on the computer.
- Exporting show sales for Excel is **not** a full backup. It excludes your product photos and most catalog information.
- Clearing website data, removing an installed PWA, changing the app's website origin, losing the iPad, or certain browser/device failures may delete local records. Make an independent full backup after each market. Keep at least one copy off the iPad.

**This PWA cannot silently write the live database continuously to an arbitrary file in the iPad Files app.** Automatic live files would require a different deployment approach, such as a native or native-wrapped application. The backup action is intentionally explicit.

## Completing and reopening a show

Choose or create an open show before tapping products to start a sale. The
Register lists only open shows and displays the selected show's name and date.
A pending sale must be recorded or cleared before switching to another show or
creating one.

Use **Complete show** beside the Register's show picker, or in **Shows &
reports**. Completion requires confirmation and blocks new sales and voids for
that show. An unfinished sale at that show must be recorded or cleared first.
Completing the current show leaves the Register with no show selected, so the
next market's sales cannot be added to it by accident.

Completed shows remain available in **Shows & reports**, including all sales
and void history. Export the completed show for Excel and use **Go to backups**
to save a full backup. Show status is included in full backups and persists
when restoring or reopening the app. Existing shows from older versions remain
open until you complete them.

For a missed sale or correction, select the completed show in **Shows &
reports**, choose **Reopen show**, and confirm. Reopening enables sales and
voids but does not switch the Register to that show automatically. Select it
in the Register when you are ready to record a missed sale; complete it again
after making the correction.

## Starting fresh after testing

Open **Data management → DELETE ALL DATA…**. The first tap opens a warning;
it does not delete anything. To enable the final deletion button, check the
acknowledgment and type **DELETE ALL DATA** exactly. Pressing Enter does not
confirm deletion. Canceling or reopening the warning resets the confirmation.

Deletion removes this installation’s products and photos, shows, sales
(including voided sales), saved categories, current cart, and settings together
in one transaction. Starter categories return. The app remains installed and
its offline files remain available. Other tools on the website, records on
other devices, and independent backup files are unaffected. There is no undo;
save a full backup first if anything should be kept. Close other copies before
continuing, particularly copies running an older app version. Current copies
reload after a reset, restore, or category change, and stale writes are blocked.

## Your existing Excel workbook

The **Export for Excel** button makes a real Excel workbook (`.xlsx`) with a single `Sales` worksheet and these seven columns in this order:

```
Item Title,Category,Price,Payment,Location (Show Name),Date,Year
```

A separate row is written for *each individual item sold*, with **no title/header row or blank rows between items**, even when multiple items were purchased in one transaction. Location is the selected show's name; Date and Year come from that show's date. Voided sales are excluded. `Price` is the **actual amount allocated to that item after promotion discounts** so the rows add up to the collected amount. For a three-for-$10 purchase of three eligible $4 items, the three exported prices are $3.33, $3.33, and $3.34. The **Detailed CSV** keeps its headers and also includes SKUs, transaction IDs, original prices, and item discount amounts. **Product totals CSV** keeps its headers and summarizes quantity and revenue by product.

The first item starts in cell A1. Prices, dates, and years are typed spreadsheet values; prices display two decimal places and dates display as `m/d/yy`. Names and categories remain literal text, including names beginning with spreadsheet formula characters. The workbook does not pass through CSV/text import, avoiding blank rows inserted by text-sharing workflows. The Excel writer is stored with the app and works offline.

Open the exported workbook and copy the item rows into the existing workbook's `Sales` sheet. The application does not update the existing workbook in place or automatically refresh pivot tables.

### Refreshing the app

Use **Refresh app** in the footer while online to load the latest app files. Finish or close any open form and record or clear a pending sale first. The button does not clear records or browser storage. Updated page assets have versioned URLs, and the offline worker revalidates app files while online.

If an older copy does not yet have the button, reload the Safari page (or fully close and reopen the Home Screen app while online) and check for **Prototype 0.8** in the footer before exporting again.

## PDF reports and payment choices

In **Shows & reports**, select the show, then choose one of the three **PDF
reports**. Each report is a real `.pdf` file that can be saved, shared, or
printed. If sharing is canceled, **Download prepared PDF** still saves the
generated file without having to recreate it.

- **Card transactions PDF:** each Card transaction, in time order, with its
  items, recorded amount, app reference, and blank columns for tax added and
  final charged amount. Older **Square** records count as Card. Large baskets
  continue under the same reference with the amount shown once.
- **Item ledger PDF:** one row per individual item in chronological order,
  showing its date/time, transaction reference, category, payment method, and
  actual price after promotion discounts. Voided items remain visible.
- **Show summary PDF:** recorded revenue, transactions, items, discounts,
  average transaction, payment totals, category totals, and products ranked by
  quantity sold.

Voided sales are marked and excluded from every total. Table headings repeat
on later pages. Each page identifies the show, its status, generation time,
time zone, and page number. The reports use the selected show's records saved
on this device. Tax and adjustments made outside the app are not calculated
or included; app references are not card processor receipt IDs.

The Register offers exactly **Cash, Card, Venmo, and CashApp**. Historical
Square and Cash App labels display/export as Card and CashApp without rewriting
the original records or backups. Historical PayPal and Other entries remain
visible under their original labels and are not silently treated as Card.
The PDF writer and fonts are bundled locally, so reports also work offline
after the updated app has loaded and cached while online.

## Product entry and discounts

- Under **Products**, add a name, price, category, and optionally a photo and an existing SKU.
- Choose an existing category from the dropdown. **Add category** creates a new,
  remembered option explicitly; differences in capitalization or spacing reuse
  the existing name. Categories are saved even before their first product.
- The last category used for a saved product is remembered after reopening the
  form or restarting the app. Existing product categories remain available.
- **Data management → Merge into another** moves every product in a category,
  including hidden products, into the selected category and removes the old
  name. Historical sales retain their original category labels.
- **Delete unused category** removes an empty category after confirmation,
  including a starter category. It stays removed after restarting or restoring
  a current backup. Use **Add category** to bring the name back.
- Choose **Save & add another** to keep the same category for the next entry.
- Use **Duplicate** to create variations, or **Hide** to remove a discontinued product from checkout without deleting its recorded history.
- Each product gets an internal unique ID even if a SKU is later edited. Auto-generated SKUs start `MR-0001`.
- For the currently implemented promotional rule, check **Eligible for 3 × $4 for $10** on *any $4 item* that qualifies. The app automatically discounts each group of three eligible items by $2. It records the specific items sold, not a generic promotion placeholder.
- There are no on-hand stock counts. Sold-out items must be hidden manually.

## Suggested acceptance test before a live show

1. On the iPad, add a product using **Take photo**; on a Mac test **Choose existing photo**. Confirm the photo preview shows the whole product, then save it. Test **Save & add another** and reopen the first product to confirm its picture remains. Try the 256 × 256 default setting before using a larger size.
2. Add two $4 qualifying products and a third non-qualifying product. Confirm a mixed basket of three eligible units totals $10, and verify the discount disappears if one unit is removed.
3. Record a test show, three completed transactions using different payment methods, and void one transaction.
4. Confirm the show revenue and payment totals exclude the voided transaction.
5. Export the Excel workbook and both CSVs. Open the workbook in Excel and check its seven columns, consecutive item rows starting at A1, absence of headers/SKU, and prices that add up to the register total. Check that the CSV reports retain their headers. Save all three PDF reports, check the card transactions against Card/Square sales, verify that the ledger is chronological and every total excludes voided sales, and print a page to check handwriting space for tax.
6. Save a full backup with at least one product photo. Confirm the `.json` file can be found outside the browser.
7. Restore the backup on a second installation / test device. Check that the photo, sales, prices, and show name return correctly.
8. Install to the iPad Home Screen and test starting the app **with internet fully disabled** (not just disabling Wi-Fi while cellular remains on).
9. After a new sale, save a fresh backup and confirm it contains the latest transaction. Do this before relying on the application.

## Technical notes

- Plain HTML, CSS, and JavaScript, with locally bundled SheetJS for Excel and pdfmake/Roboto for PDFs (versions, sources, integrity, and licenses in `vendor/README.md`). No external script or PDF service is used.
- Local data: IndexedDB (`db.js`). Photos are compressed by the device before storing.
- Offline application shell: service worker (`service-worker.js`). It caches only static application files, not customer information.
- App-install information: `manifest.webmanifest` and the `icons/` directory.
- UI, pricing, and reporting: `app.js`, `index.html`, and `styles.css`.
- Tested with an automated Chromium-based **interface simulation** using an in-memory database mock. Tested image upload via both input fields, 256 × 256 and 512 × 512 JPEG conversion, product creation, checkout and photo inclusion in full backup, as well as earlier discount/report/CSV tests. **Actual iPad camera picker, IndexedDB persistence, Safari/iPadOS file handling, and offline installation must still be checked on hardware.**

## Planned but not included

Product rearranging via drag-and-drop; a richer discount editor; category-specific display ordering; direct import of legacy product catalogs; split payments; automatic backup to an external file; multi-device synchronization. None is necessary to evaluate the initial booth workflow.
