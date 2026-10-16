#!/usr/bin/env python3
"""Build the public Version 1.03 guide, using only fictional examples.

Requires ReportLab. Run from any directory; the output stays inside the app's
scope so its service worker can make the guide available offline. Each chapter
has an intentional page break, a contents link, and a PDF bookmark. The page
count assertion catches accidental overflow when the wording is changed.
"""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "market-register/output/pdf/market-register-user-guide-v1.03.pdf"
TOTAL_PAGES = 12
FOREST = colors.HexColor("#244c41")
INK = colors.HexColor("#22362d")
MUTED = colors.HexColor("#52645b")
PALE = colors.HexColor("#f0f5f0")
RULE = colors.HexColor("#cbd7d0")
WIDTH = letter[0] - 96
APP_URL = "https://deanlefor.com/market-register/"
APPLE_INSTALL = "https://support.apple.com/guide/ipad/ipad8f1f7a29/ipados"
APPLE_PDF = "https://support.apple.com/guide/ipad/download-a-pdf-ipade2917f90/ipados"

STYLES = {
    "body": ParagraphStyle(
        "Body", fontName="Helvetica", fontSize=11, leading=15,
        textColor=INK, spaceAfter=8, alignment=TA_LEFT,
    ),
    "small": ParagraphStyle(
        "Small", fontName="Helvetica", fontSize=9.5, leading=13,
        textColor=MUTED, spaceAfter=7,
    ),
    "title": ParagraphStyle(
        "Title", fontName="Helvetica-Bold", fontSize=26, leading=30,
        textColor=FOREST, spaceAfter=12,
    ),
    "heading": ParagraphStyle(
        "Heading", fontName="Helvetica-Bold", fontSize=12.5, leading=16,
        textColor=FOREST, spaceBefore=10, spaceAfter=5, keepWithNext=True,
    ),
    "kicker": ParagraphStyle(
        "Kicker", fontName="Helvetica-Bold", fontSize=9, leading=12,
        textColor=MUTED, spaceAfter=6, keepWithNext=True,
    ),
    "step": ParagraphStyle(
        "Step", fontName="Helvetica", fontSize=11, leading=15,
        textColor=INK, leftIndent=20, firstLineIndent=-20, spaceAfter=8,
    ),
    "cell": ParagraphStyle(
        "Cell", fontName="Helvetica", fontSize=10.5, leading=14,
        textColor=INK,
    ),
    "callout": ParagraphStyle(
        "Callout", fontName="Helvetica", fontSize=11, leading=15,
        textColor=INK,
    ),
}


class GuideDocument(BaseDocTemplate):
    """Attach real destinations after layout, so links survive wording edits."""

    def afterFlowable(self, flowable):
        if getattr(flowable, "bookmark_key", None):
            self.canv.bookmarkPage(flowable.bookmark_key)
            self.canv.addOutlineEntry(
                flowable.getPlainText(), flowable.bookmark_key, level=0
            )


def page_chrome(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(RULE)
    canvas.line(48, 751, 564, 751)
    canvas.setFont("Helvetica-Bold", 9)
    canvas.setFillColor(FOREST)
    canvas.drawString(48, 763, "MARKET REGISTER")
    canvas.setFont("Helvetica", 9)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(564, 763, "USER GUIDE  |  VERSION 1.03")
    canvas.line(48, 43, 564, 43)
    canvas.setFont("Helvetica", 8.5)
    canvas.drawString(48, 29, "Version 1.03 trial guide  |  October 16, 2026")
    canvas.drawRightString(564, 29, f"{doc.page} / {TOTAL_PAGES}")
    canvas.restoreState()


story = []


def p(text, style="body"):
    # Built-in PDF fonts stay portable; avoid unsupported decorative glyphs.
    assert text.isascii(), text
    story.append(Paragraph(text, STYLES[style]))


def h(text):
    p(text, "heading")


def step(number, text):
    p(f'<b><font color="#244c41">{number}.</font></b>  {text}', "step")


def bullet(text):
    p(f"<b>-</b>  {text}", "step")


def link(url, label):
    return f'<link href="{url}" color="#244c41"><u>{label}</u></link>'


def callout(text):
    assert text.isascii(), text
    table = Table([[Paragraph(text, STYLES["callout"])]], colWidths=[WIDTH])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALE),
        ("BOX", (0, 0), (-1, -1), 0.6, RULE),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.extend([table, Spacer(1, 9)])


def table(rows, widths, header=True):
    cells = [[Paragraph(value, STYLES["cell"]) for value in row] for row in rows]
    grid = Table(cells, colWidths=widths, hAlign="LEFT", repeatRows=int(header))
    commands = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, RULE),
    ]
    if header:
        commands.append(("BACKGROUND", (0, 0), (-1, 0), PALE))
    grid.setStyle(TableStyle(commands))
    story.extend([grid, Spacer(1, 9)])


def chapter(number, title, key):
    if story:
        story.append(PageBreak())
    p(f"{number:02d}  /  VERSION 1.03", "kicker")
    heading = Paragraph(title, STYLES["title"])
    heading.bookmark_key = key
    story.append(heading)


chapter(1, "Your booth, one sale at a time", "start")
p("<b>Market Register user guide</b><br/>A practical guide for the Mac and iPad, from adding products to closing a show.")
p(f'Open the app: {link(APP_URL, "deanlefor.com/market-register/")}')
callout("<b>The daily routine:</b> choose the show, tap the items, collect payment, record the sale, then save reports and a full backup at the end of the show.")
h("Quick start")
step(1, "Open <b>Products</b> and add your products, prices, categories, and optional photos.")
step(2, "In <b>Register</b>, choose an open show or use <b>+ New show</b>. Check its name and date.")
step(3, "Tap the items for this customer. Check quantities, any tip or discount, and the total.")
step(4, "Collect payment separately. Choose <b>Cash, Card, or Venmo</b>, then tap <b>Record completed sale</b>.")
step(5, "At the end, review <b>Shows &amp; reports</b>, complete the show, save exports, and save a <b>full backup</b>.")
h("Find what you need")
contents = [
    (2, "Getting started and using the iPad app", "setup"),
    (3, "Products, photos, and categories", "products"),
    (4, "Recording a sale", "sales"),
    (5, "Tips, dollar discounts, and 3 for $10", "adjustments"),
    (6, "Shows, completion, and corrections", "shows"),
    (7, "PDF reports and show totals", "reports"),
    (8, "Excel and CSV exports", "exports"),
    (9, "Backups, restoring, and moving records", "backups"),
    (10, "Data management and starting fresh", "data"),
    (11, "Refresh and troubleshooting", "help"),
    (12, "Before-show and end-of-show checklists", "checklists"),
]
for page_number, title, key in contents:
    p(f'<link href="#{key}" color="#244c41">{page_number:02d}  |  {title}</link>', "small")

chapter(2, "Getting started", "setup")
h("On the Mac")
p(f'Open {link(APP_URL, "the Market Register website")} in Safari or Chrome. Use the same browser and website address each time. For everyday use, the website is ready; you do not need to run a local test server.')
h("Install on the iPad")
step(1, "Open the website in <b>Safari</b> while connected to the internet.")
step(2, "Tap <b>Share</b>, then <b>View More</b> if shown, and <b>Add to Home Screen</b>.")
step(3, "If <b>Open as Web App</b> is shown, turn it on. Tap <b>Add</b>.")
step(4, "Open <b>Market Register</b> from its Home Screen icon while online. Install first, then enter products or restore a backup into this copy.")
p(f'Apple reference: {link(APPLE_INSTALL, "Add a website to the iPad Home Screen")}. Menu wording can vary with iPadOS.', "small")
h("Where your records live")
p("Products, photos, sales, and settings are saved automatically in this copy of the app on this device. The website does not receive them. There is no account or automatic synchronization.")
p("The Mac, another browser, a localhost test, and the installed iPad app can have separate records. If a copy looks empty, check the original copy and transfer a full backup (page 9). Use one copy at a time.")
callout("<b>Keep independent backups.</b> Clearing website data, removing the app, or losing the device can remove local records. Use normal browsing for ongoing records, and save a full backup outside the app after every show.")
h("Offline use")
p("Load the installed app online first. Before relying on it, turn off both Wi-Fi and cellular internet and check that it reopens. The cached app supports products, sales, reports, exports, and this guide. Card or Venmo payment collection still depends on the separate payment service.")
p("The website is unlisted but has no password protection. Someone with its address can open their own copy; your local sales records are not supplied to them. Keep backups and sales exports off the public website.", "small")

chapter(3, "Products, photos, and categories", "products")
h("Add a product")
step(1, "Open <b>Products</b> and tap <b>+ Add product</b>.")
step(2, "Enter the <b>Name</b> and <b>Price</b> in dollars, with up to two decimal places. Choose a <b>Category</b> from the dropdown.")
step(3, "For a new category, use <b>Add category</b>, check its spelling, and save it. It becomes a remembered dropdown choice. Capitalization or spacing differences reuse an existing name; a spelling mistake can still create a different category.")
step(4, "Add an optional photo and SKU. Leaving SKU blank gives the product an automatic reference such as <b>MR-0001</b>. Existing SKUs must be unique.")
step(5, "For a qualifying $4 product, check <b>Eligible for the 3 x $4 for $10 promotion</b>. Tap <b>Save product</b>, or <b>Save &amp; add another</b> to keep the category for the next new product. The last saved category is remembered for later entries.")
h("Choose a photo")
p("Use <b>Take photo</b> on the iPad or <b>Choose existing photo</b> for a picture from Photos or Files. The picker can vary by device; on the Mac, it may open a file chooser. Wait for the preview and resizing message before saving.")
p("The whole picture fits into a compressed square image. The default <b>256 x 256</b> size keeps storage and backups small; <b>384 x 384</b> and <b>512 x 512</b> are optional. The size choice affects new photos. You can replace or remove a photo later by editing the product.")
h("Manage the catalog")
bullet("<b>Edit</b> changes the product for future sales. Past sales keep the name, category, and price recorded at the time.")
bullet("<b>Duplicate</b> creates a variation with a new reference; review its name and price before saving.")
bullet("<b>Hide</b> removes a product from checkout. To bring it back, check <b>Show hidden products</b> and tap <b>Show</b>.")
bullet("Use search and category filters to find products. Items appear alphabetically in Products and Register; numbers sort naturally, such as Item 2 before Item 10.")
callout("There are no stock quantities. Hide a sold-out item yourself. Hidden products still belong to their categories; category merging and deletion are explained on page 10.")

chapter(4, "Recording a sale", "sales")
step(1, "In <b>Register</b>, check <b>Current show</b>. Choose an open show, or tap <b>+ New show</b> and enter its name and date.")
step(2, "Tap each product the customer is buying. Each tap adds one item. Search narrows the list; use its <b>X (Clear search)</b> button to clear it without changing the basket or category.")
step(3, "Review <b>Current sale</b>. Use the quantity <b>+</b> and <b>-</b> controls to correct the basket. The total updates as items change.")
step(4, "If needed, expand <b>Tip &amp; discount</b>. Enter dollar amounts, then check the total again. Both fields can be used on the same sale (page 5).")
step(5, "Collect and confirm payment outside this app. Select the actual payment method: <b>Cash, Card, or Venmo</b>.")
step(6, "Tap <b>Record completed sale</b> once. Wait for confirmation. The basket and search clear for the next customer; a failed save keeps both.")
callout("<b>Check the payment button for every customer.</b> Each fresh sale defaults to Card. After recording or clearing a sale, Card is selected again. An unfinished sale keeps its chosen method when reopening the app.")
h("Cash and change")
p("Select <b>Cash</b> to open the optional <b>Cash received ($)</b> field. A $12 sale paid with $20 shows <b>$8 Change due</b>. The field accepts digits and a decimal point and requests a numeric keypad. Short cash shows <b>Still due</b>; correct the amount or clear this optional field before recording.")
p("Change uses the final total after tips and discounts. Cash received resets for the next sale; the saved confirmation still shows change due. Reports record the sale total, not the cash tendered.", "small")
h("What is saved")
p("A completed sale saves the show, timestamp, items, payment method, tip, discounts, and total. Tips and discounts reset after saving. Payment collection, tax, and payment-service receipts are handled separately.")
h("An unfinished or abandoned basket")
p("The basket and valid tip/discount amounts are remembered on this device. Confirm <b>Clear current sale</b> to abandon the basket; recorded sales remain. Finish or clear it before changing or completing the show. Failed saves keep the basket for another attempt.")
p("<b>Avoid duplicates:</b> wait while saving. If unsure whether a sale saved, check the show's transaction history before entering it again. Use <b>Void last sale</b> or the history's <b>Void</b> button for a confirmed mistake (page 6).")

chapter(5, "Tips and discounts", "adjustments")
h("The optional section")
p("Open <b>Tip &amp; discount</b> under Current sale only when you need it. Leave a field blank or enter zero when it is unused. Enter dollars with up to two decimal places; do not enter percentages or negative amounts.")
p("One sale can have a tip and a dollar discount. The discount reduces the item total after any automatic promotion savings. It cannot exceed that remaining item total. The tip is added afterward and is never discounted.")
table([
    ["<b>Example sale</b>", "<b>Amount</b>"],
    ["Items", "$12.00"],
    ["Dollar discount", "-$2.00"],
    ["Tip", "+$3.00"],
    ["<b>Total to collect and record</b>", "<b>$13.00</b>"],
], [386, 130])
p("If an amount is invalid, the app displays a warning and disables <b>Record completed sale</b> until it is fixed. Enter the tip in this field instead of creating a separate Tip product.")
h("Automatic 3 for $10 pricing")
p("Only $4 products marked as eligible participate. Qualifying items can be mixed. Each group of three eligible items receives $2 in savings automatically; other items keep their normal prices.")
table([
    ["<b>Eligible $4 items</b>", "<b>Price after promotion</b>"],
    ["3 items", "$10.00"],
    ["4 items", "$14.00"],
    ["6 items", "$20.00"],
], [386, 130])
h("How these amounts appear in records")
p("Reports separate <b>Tips</b>, <b>Dollar discounts</b>, and <b>3 for $10 savings</b>. Total collected and payment totals include tips; item counts and product/category sales totals cover merchandise only.")
p("Discounts are spread across the individual items with exact cent rounding. The ledger and Excel export add a separate <b>Tip</b> row, category <b>Tips</b>, after the sale's items. Those rows add up to the collected total. Voiding the sale excludes all its amounts from totals.")

chapter(6, "Shows and corrections", "shows")
h("Choose the right show")
p("Create a show with its name and date before selling. The <b>Current show</b> picker in Register controls where the next sale goes. It lists open shows. The <b>View show</b> picker in Shows &amp; reports chooses a report; it does not switch the Register's current show.")
p("Record or clear unfinished items and tip/discount entries before switching shows, creating another show, or completing the current one.")
h("Complete a show")
step(1, "Finish the last sale and review the show's transactions and totals.")
step(2, "Tap <b>Complete show</b> beside Current show or in <b>Shows &amp; reports</b>. Read and confirm the prompt.")
step(3, "The show remains available for reports, but new sales and voids are blocked. Completing the current show leaves Register with no show selected.")
step(4, "Save the reports you need and a fresh full backup. At the next event, create or select its open show before adding items.")
h("Correct a recorded sale")
p("Use <b>Void last sale</b> for the most recent sale, or select the show in <b>Shows &amp; reports</b>, find its transaction, and tap <b>Void</b>. Confirm the amount and transaction before proceeding.")
p("Voiding keeps an audit record marked <b>VOIDED</b> and excludes the entire sale, including its tip and discounts, from totals. To correct an item or payment method, void the mistaken sale and record the corrected sale. There is no direct edit or unvoid button.")
callout("Voiding here does not refund money through a card or Venmo service. Handle any needed refund separately. When correcting only the record of a payment already collected, do not collect it again.")
h("Reopen a completed show")
step(1, "Select it in <b>Shows &amp; reports</b>, choose <b>Reopen show</b>, and confirm.")
step(2, "To enter a missed sale, also select that show under <b>Current show</b> in Register. Reopening alone does not select it there.")
step(3, "Make the correction, complete the show again, and save updated reports and a new full backup.")

chapter(7, "PDF reports and show totals", "reports")
step(1, "Open <b>Shows &amp; reports</b> and choose the show under <b>View show</b>.")
step(2, "Review the totals, then choose a button under <b>PDF reports</b>. Each button creates a real PDF for that selected show.")
h("Card transactions PDF")
p("A chronological record of every <b>Card</b> transaction, including older sales labeled <b>Square</b>. It shows an app reference, time, item details, tip, discounts, and the full recorded amount. Blank <b>Tax added</b> and <b>Final charged amount</b> columns give you space to add those figures later, outside this system.")
p("Voided card sales are marked and excluded from totals. A large basket may continue under the same reference; its amount is shown once. The app reference is not a card processor receipt number. Match the report to your separate payment records.")
h("Item ledger PDF")
p("A simple chronological ledger with one row per individual item and any separate tip row. It includes time, transaction reference, category, payment method, and the item's price after discounts. Voided rows remain visible and do not count in totals.")
h("Show summary PDF")
p("An overview of total collected, transactions, items, tips, both types of discounts, average transaction, payment totals, category totals, and products ranked by quantity sold. Use it to review the event and see what sold best.")
h("Understand the screen totals")
bullet("<b>Total collected</b> and payment totals include tips and exclude voided sales.")
bullet("<b>Items sold</b> counts merchandise units, not tips. Product and category totals show merchandise revenue after discounts.")
bullet("Later tax or adjustments made outside the app are not included. Older payment labels remain visible; only Card and older Square records enter the card report.")
h("Save or print a report")
p("Use the share or download options to save the PDF, then open it to check the show name. If sharing is canceled, use <b>Download prepared PDF</b>. Generate a fresh report after changing records; a saved report does not update itself.")
p(f'On the iPad, a PDF open in Safari can be saved using <b>Share</b>, <b>View More</b>, then <b>Save to Files</b>. See {link(APPLE_PDF, "Apple: download a PDF to Files")}. To print, use your PDF viewer\'s Print option.', "small")

chapter(8, "Excel and CSV exports", "exports")
p("In <b>Shows &amp; reports</b>, select the show first. Every export covers that show only and excludes voided sales.")
h("Export for Excel")
p("The <b>.xlsx</b> file has one <b>Sales</b> worksheet. SKU starts in <b>A1</b>; the other fields follow through H. There are no headings or blank rows.")
table([
    ["<b>Excel column</b>", "<b>What it contains</b>"],
    ["A - SKU", "Recorded SKU as text. Blank for tips or missing SKUs."],
    ["B - Item Title", "The recorded product name; <b>Tip</b> for a tip row."],
    ["C - Category", "The recorded category; <b>Tips</b> for a tip row."],
    ["D - Price", "Actual amount for this individual item after discounts."],
    ["E - Payment", "The transaction's payment method."],
    ["F - Location (Show Name)", "The selected show's name."],
    ["G - Date", "The show's date, displayed as m/d/yy."],
    ["H - Year", "The year from the show's date."],
], [185, 331])
p("Each unit gets a row, even when bought together. Tips follow the sale's items. Prices include discounts: three qualifying $4 items sold for $10 export as $3.33, $3.33, and $3.34.")
p("Open the file in Excel and copy its rows into the Sales sheet of your existing workbook if needed. The app does not modify that workbook or refresh its pivot tables automatically.")
h("Detailed CSV")
p("A transaction export with headings, SKUs, transaction IDs, sale timestamps, original prices, discounts, and tip rows.")
h("Product totals CSV")
p("A summary with headings, product references, categories, quantities, and merchandise revenue after discounts. Tips are not included in product totals.")
callout("Reports and sales exports are not full backups. They cannot restore your catalog, photos, all shows, settings, or complete sale history. Use <b>Backups > Save full backup</b> for recovery.")

chapter(9, "Backups and moving records", "backups")
h("Save a full backup")
step(1, "Open <b>Backups</b> and tap <b>Save full backup</b>.")
step(2, "Use the share or download options to save the <b>.json</b> file in Files, iCloud Drive, or on a computer.")
step(3, "Open Files or the destination folder and verify that the file is actually there. A message saying it was prepared does not prove that it was saved outside the app.")
p("A full backup includes every product and saved photo, all shows, sales including void history, categories, settings, and the saved unfinished sale. The record counts on this page cover all local records, not just the selected show.")
callout("Save a fresh backup after every show and before restoring or deleting data. Keep several dated copies and at least one copy off the iPad. Backups are manual; an existing file does not gain later sales automatically.")
h("Restore a backup")
step(1, "Save a backup of the current copy first if you might need it. Close other copies of the app.")
step(2, "In <b>Backups</b>, tap <b>Choose backup file</b> and select the intended full <b>.json</b> backup.")
step(3, "Read the replacement warning. Confirm only when you intend to replace this copy's current records with that file.")
step(4, "Check products, photos, shows, sales, and totals afterward. Damaged or unsupported files are rejected before replacement is offered.")
p("Restore replaces the current local records; it does not combine two catalogs or merge later sales. Records on other devices and separately saved files are unaffected. Older compatible backups remain supported.")
h("Move from the Mac or a test copy to the iPad")
step(1, "Save a full backup from the copy that contains the records you want.")
step(2, "Transfer that file to the iPad, for example through iCloud Drive or AirDrop.")
step(3, "Open the installed Home Screen app, restore the file, and verify the records. Use that copy going forward.")
p("For later transfers, make a new backup. There is no automatic sync and no safe merge of two devices' separate sales histories.")

chapter(10, "Data management", "data")
p("Open <b>Data management</b> to read this guide, tidy categories, or remove test data. The <b>Go to backups</b> button is a shortcut to save a full copy first.")
h("Delete an unused category")
p("Use <b>Delete unused category</b> and confirm. The category must contain no products, including hidden ones. Hiding a product does not make its category empty. You can add the category again later through <b>Add category</b> in the product form.")
h("Merge duplicate or misspelled categories")
step(1, "Find the category you want to remove and tap <b>Merge into another</b>.")
step(2, "Choose the correct destination category and review the confirmation.")
step(3, "Confirm <b>Merge categories</b>. All products in the old category, including hidden products, move to the destination; the old category name is removed.")
p("Example: merge <b>Caosters</b> into <b>Coasters</b>. For one incorrectly categorized product, you can instead edit that product's category. Product photos and prices stay with the products. Past sales retain their recorded category names.")
h("DELETE ALL DATA")
callout("<b>This is for starting over, not refreshing the app.</b> It removes all records in this copy, including products and photos, categories, shows, sales and void history, the current sale, and settings. There is no undo except restoring a full backup.")
step(1, "Save and verify a full backup of anything you want to keep. Close other copies of the app.")
step(2, "Tap <b>DELETE ALL DATA...</b>. This first tap opens a warning; it does not delete anything.")
step(3, "Check the acknowledgment and type <b>DELETE ALL DATA</b> exactly, including capitalization and spaces.")
step(4, "Only then can you tap <b>Delete everything permanently</b>. Pressing Enter does not confirm deletion. Use <b>Cancel</b> to leave without deleting.")
p("After deletion, starter categories return. The app, its offline files, and this guide remain available. Other devices' records and full backup files already saved outside the app are not deleted.")

chapter(11, "Refresh and troubleshooting", "help")
h("Refresh an installed iPad app")
p("Use <b>Refresh app</b> in the footer while online. Finish or close an open form and record or clear an unfinished sale first. Refresh loads the latest app files without clearing your records. Check for <b>Version 1.03</b> in the footer.")
p("The guide opens from Data management. After the updated app has loaded online, it is cached with the app. You can also save a separate PDF copy to Files.")
h("Another copy changed the records")
p("Close the other copy. If this copy shows a refresh warning, finish or close its form and use <b>Refresh app</b> to load saved records. Stale writes are blocked. Refreshing a stale copy with unfinished edits can ask permission to discard those edits; read that prompt carefully.")
h("Products are missing from Register")
p("Check the search text and category filter. In Products, check <b>Show hidden products</b> and bring back an item with <b>Show</b>. Select an open show before trying to add items. The app does not track or automatically hide sold-out inventory.")
h("Record completed sale is unavailable")
p("Check that an open show is selected, the basket has items, tip/discount entries are valid, any entered cash covers the total, and no save or stale-copy warning is pending. A completed show must be reopened before more sales or voids can be recorded.")
h("This copy looks empty")
p("Check the device, browser, website address, and whether you opened Safari or the Home Screen app. Open the original copy and save a full backup, then restore it into the intended copy. Do not delete anything as a troubleshooting step.")
h("An export looks wrong or will not save")
p("Check the selected show and generate a fresh report. <b>Export for Excel</b> should produce an .xlsx file with eight columns starting at A1. The CSV buttons intentionally include headings. If PDF sharing was canceled, use <b>Download prepared PDF</b>. If a writer cannot load, refresh online and try again.")
h("A save or storage error appears")
p("Keep the unfinished sale, check the message, and verify any existing backup. Stop entering sales until saving works again. Record the exact message and what you were doing so we can investigate; avoid clearing website data to fix it.")

chapter(12, "Your show-day checklist", "checklists")
h("Before the show")
bullet("Charge the iPad and open the installed app you plan to use. Close other copies.")
bullet("Load the app online, then check offline reopening before depending on it at the booth.")
bullet("Check product names, categories, prices, photos, hidden items, and 3-for-$10 eligibility.")
bullet("Create or select the right show. Verify its name and date in Register.")
bullet("Confirm the separate card and Venmo payment tools are ready. The register does not collect payments.")
bullet("Verify a recent full backup exists outside the app.")
h("For each customer")
bullet("Check the items and quantities. Add a tip and/or dollar discount only when needed.")
bullet("Check the total, collect payment separately, and select Cash, Card, or Venmo.")
bullet("Tap Record completed sale once and wait for confirmation and a clear basket.")
h("At the end of the show")
bullet("Record or clear the last unfinished sale. Review transactions and payment totals against your separate payment records.")
bullet("Correct mistakes with Void and a replacement record if needed, then complete the show.")
bullet("Save the Card transactions PDF for later tax work, the Item ledger PDF for the sale-by-sale record, and the Show summary PDF for an overview.")
bullet("Save the Excel export if you are updating your existing workbook.")
bullet("Save a new full backup and verify the actual file. Keep a copy off the iPad.")
h("During the Version 1.03 trial")
p("Use this version for the planned week or two and note anything confusing or missing. Useful notes include the device, app version, what you tapped, what you expected, and what happened. Keep your full backups and exported sales files private.")
callout("<b>Three things to remember:</b><br/>Check the show. Check the payment method. Save and verify a full backup after every show.")


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = GuideDocument(
        str(OUTPUT), pagesize=letter, leftMargin=48, rightMargin=48,
        topMargin=58, bottomMargin=56, pageCompression=1, invariant=1,
        title="Market Register - Version 1.03 User Guide",
        author="Market Register", subject="How to use Market Register Version 1.03",
        creator="Market Register user guide builder",
    )
    frame = Frame(48, 56, WIDTH, 678, leftPadding=0, rightPadding=0,
                  topPadding=0, bottomPadding=0, id="guide")
    doc.addPageTemplates(PageTemplate(id="guide", frames=[frame], onPage=page_chrome))
    doc.build(story)
    if doc.page != TOTAL_PAGES:
        raise RuntimeError(f"Chapter overflow: expected {TOTAL_PAGES} pages, got {doc.page}")
    print(f"Created {OUTPUT} ({doc.page} pages, {OUTPUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
