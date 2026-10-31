# Pool Tables Manager - User Guide

## Welcome to Pool Tables Manager

Pool Tables Manager is a comprehensive solution for managing pool hall operations. This guide will help you understand and use all the features available in the application.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Starting a Session](#starting-a-session)
4. [Managing Active Sessions](#managing-active-sessions)
5. [Adding Items to Tabs](#adding-items-to-tabs)
6. [Pending Orders (Player Self-Service)](#pending-orders-player-self-service)
7. [Player Settlements](#player-settlements)
8. [Ending Sessions (Checkout)](#ending-sessions-checkout)
9. [Subscriptions](#subscriptions)
10. [Public Table View](#public-table-view)
11. [Admin Features](#admin-features)
12. [Reports](#reports)
13. [VAT (TVA) Reporting — France](#vat-tva-reporting--france)
14. [Payments (optional POS)](#payments-optional-pos)
15. [Setting Up Card Payments (Administrator)](#setting-up-card-payments-administrator)

---

## Getting Started

### Accessing the Application

Open your web browser and navigate to `http://localhost:3000` (or your server address).

The first time, you are asked to define the local admin password (or to sign in if a password/OIDC
is already configured). After signing in, the dashboard displays all your tables organised by type.

### Main Menu

The header has three entries plus the theme toggle and a logout button:

- **Dashboard** - Live tables, sessions and pending orders
- **Admin** - Menu, table inventory, subscriptions, reports and settings
- **Public Status** - Opens the customer-facing availability board in a new tab (no login needed)
- **Help** - In-app user guide (this document) with a table of contents; includes a link to the API reference
- **Log out** (top-right) - Ends the admin session. With OIDC enabled the identity-provider
  session is ended too when supported; you are returned to the login page

---

## Dashboard Overview

The dashboard is your central hub for managing all tables.

### Table Display

Tables are grouped by type (American, Pool, Snooker, French, …) with flag badges and colour-coded tiles:
- **Green tiles** = Available tables
- **Red tiles** = Active sessions
- Maintenance tables are hidden from the dashboard (manage them in Admin → Table Types & Inventory)

Two layouts are available (choose in **Settings → Dashboard layout**):

- **Sections** (default) — all types as collapsible groups. A row of **flags at the top** jumps
  (and expands) to a type; use the chevron on a group to collapse it. Collapsed state is remembered
  on this device.
- **Tabs** — one table type per tab; drag the **grip handle** next to a tab to reorder tabs.

In both layouts you can reorder the table-type groups: in Sections mode drag the **⋮⋮ grip** at the
left of a group header. The order is saved for all staff devices and is also used by the public
status board.

### Table Information

Each tile shows:
- Table number and type
- Session PIN (when active) - displayed next to table number, e.g., "#5 (1234)"
- Duration of current session
- Current player count
- Tab total (running charges)
- Quick action buttons

### Quick Actions

**Available Tables:**
- **Start Session** - Begin a new session
- **Maintenance** - Take the table out of service (reset the usage counter when returning it)

**Active Tables:**
- **Drink** - Add drinks to the tab (grouped by menu category)
- **Transfer** - Move the session to another table
- **Checkout** - Apply a discount, print the tab estimate, complete payment and print the invoice
- **−** next to the player count - Player settlement (one player pays their share and leaves)
- **+** - Add a player — asks whether they are a subscriber (affects the discount)
- **QR thumbnail** - Enlarge the player QR code

---

## Starting a Session

1. Click **▶ Start** on an available table
2. Set the number of players (default: 1)
3. (Optional) Select subscribers from your list
   - Subscribers receive discounts when playing; **subscriber-only sessions are allowed** (0
     non-subscribers) and play free table time
   - At least one player (subscriber or not) is required
4. Click **Start Session**

**What Happens:**
- A unique 4-digit PIN is generated for the session
- The table is marked as occupied
- Charges begin accumulating based on elapsed time
- PIN is displayed on the table tile for players to access their tab

---

## Managing Active Sessions

### Real-Time Updates

Active sessions display:
- **Duration** - Updates every second (e.g., "1h 23m 45s")
- **Hours Charged** - Rounded up to nearest hour
- **Tab Total** - Table charge + item charges

### Table Charges

Charges are calculated per hour based on table type:
- **American Pool:** €30/hour
- **Pool:** €25/hour
- **Snooker:** €40/hour
- **French Billiards:** €35/hour

Time is always rounded up to the next hour (e.g., 1 hour 1 minute = 2 hours charged).

### Subscriber Discounts

When subscribers play with non-subscribers:
- **Default:** 50% discount on table charge
- **All subscribers:** No charge
- **No subscribers:** Full price

*Discount percentage can be adjusted in Settings.*

---

## Adding Items to Tabs

### Quick Add Drinks

1. Click **Drink** on an active table tile
2. Browse the drink menu — use the **category pills** (Cold / Hot / Alcoholic) and the **search box**
   to find items quickly
3. Use **+** and **-** buttons to select quantities
4. Click **Add to tab**

### Custom Charges

From the session details:
1. Click the active table to view details
2. Scroll to "Add Custom Charge"
3. Enter description and amount
4. Click **Add Charge**

**Use Cases:**
- Food items
- Equipment rentals
- Special fees
- Additional services

---

## Pending Orders (Player Self-Service)

Players can order drinks themselves from the [Public Table View](#public-table-view) on their phone, without needing staff to walk over and take the order.

### How it works

1. A player on the table-specific page enters the table's **PIN code** and selects drinks from the menu.
2. The order is submitted and appears instantly on the main dashboard under a new **"Pending Orders"** section at the top of the screen, above the Tables grid.
3. A chime sound ("Bright Triangle") plays on the admin dashboard whenever a new order arrives, so staff don't need to keep watching the screen.
4. Each pending order shows the table number, the items ordered, and the total.
5. Staff reviews the order and clicks **✓ Fulfilled** once the drinks have been delivered.
6. On fulfillment, the order's items are automatically added to that table's tab — no need to re-enter anything manually.

**Security:** The PIN requirement prevents other players, or someone who isn't at the table, from placing orders against your tab.

**Audio Cues:** The order-arrival chime respects the **Audio Cues** setting on the Settings page.

---

## Player Settlements

When a player wants to leave while others continue playing:

1. Click **🧾 Settle** on the table tile
2. Review the current tab and table charge
3. **Select Table Charge Option:**
   - **Player's share** - Equal split among original players
   - **Full table charge** - Player pays entire table charge
   - **Skip table charge** - Only pay for items

4. **Select Items:**
   - Use quantity spinners to select items player consumed
   - Can settle partial quantities (e.g., 1 of 3 beers)

5. Click **💰 Settle**

**What Happens:**
- Selected items are removed or reduced on the tab
- Player count decreases by 1
- Remaining players' view updates automatically
- Receipt can be printed

**Important:** Settlement amounts are based on the *original* table charge before any previous settlements.

---

## Ending Sessions (Checkout)

When all players are finished:

1. Click **✓ Checkout** on the table tile
2. Review the final charges:
   - Table charge (based on total duration)
   - All items on the tab
   - Any previous settlements (shown as deductions)
3. **Optional:** Click **🖨 Print Receipt** for a paper copy
4. Click **End Session** to complete

**What Happens:**
- Final total is calculated
- Session is marked as complete
- Table becomes available for next session
- Data is saved for reports

---

## Subscriptions

### What are Subscriptions?

Subscriptions are pre-paid memberships that provide table charge discounts.

### Viewing Subscriptions

1. Open menu (☰)
2. Click **Subscriptions**
3. View all active subscriptions with:
   - Player name
   - Start date
   - End date
   - Current status

### Using Subscriptions

When starting a session:
1. Set player count
2. Check boxes next to subscriber names
3. System automatically applies discount

**Benefits:**
- Reduced or eliminated table charges
- Tracked usage for analytics
- Incentivizes regular customers

---

## Public Table View

Players can view their tab in real-time from any device, and order drinks themselves.

### Accessing Table View

**URL Format:** `http://[server]/table.html?number=[table_number]`

Example: `http://localhost:3000/table.html?number=5`

### First-Time Access

1. Player navigates to the URL
2. Enters the 4-digit PIN (shown on dashboard)
3. PIN is saved for the session

### What Players See

- Table number and type
- Current duration
- Player count
- All items on the tab with quantities and prices
- Table charge (hours and amount)
- Running total
- A drink menu they can order from directly (PIN required) — see [Pending Orders](#pending-orders-player-self-service)

**Auto-Refresh:** The view refreshes automatically (every ~10 seconds, and immediately when you return to the tab), so fulfilled orders and tab changes appear promptly.

### QR Codes

Every active table tile on the dashboard shows a **QR code** that links directly to that table's view with its PIN pre-filled, so a player can simply scan it with their phone's camera to start monitoring their session — no need to type the URL or PIN manually. Click the QR code on the dashboard to enlarge it (handy for printing or displaying at the table).

**Controlling the hostname used in QR codes:** By default, QR codes point at whatever address your browser used to load the admin dashboard (e.g. `http://localhost:3000`), which only works on the same machine. To make QR codes scannable from players' phones, set **Public Base URL** in Admin → Settings to the hostname/IP or FQDN your phones can actually reach, for example `http://192.168.1.50:3000` or `https://pool.example.com`. Leave it blank to fall back to the current browser address.

---

## Admin Features

Access via menu (☰) → **Admin Panel**

### Table Types & Inventory

**Manage Table Types:**
- Add new table types (e.g., "Billiards", "Carom")
- Set hourly rates in your currency
- Set the **VAT rate** applied to that table type's time charges (20%, 10%, or 0% — see [VAT (TVA) Reporting](#vat-tva-reporting--france))
- Edit or delete existing types

**Manage Tables:**
- **Add Tables:** specify a quantity to create multiple tables at once (auto-numbered sequentially)
- **Renumber:** click the **pencil** next to a table number, type the new number and press Enter
  (a number already in use is rejected with an explanatory message)
- **Delete Tables:** Remove unused tables
- **Set Maintenance Mode:** Temporarily disable tables; returning a table to service resets its
  usage-since-maintenance counter
- **Order the types:** use the **↑/↓** buttons on each type to change the order used on the dashboard,
  the dashboard tabs/flag navigator and the public status board

**Bulk Operations:**
- Add multiple tables of same type (1-50 at once)
- Tables automatically get next available numbers

### Drink Menu Management

1. Click **Drinks Menu**
2. **Add New Item:**
   - Name
   - Price
   - VAT rate (20% standard, 10% reduced, or 0% exempt — see [VAT (TVA) Reporting](#vat-tva-reporting--france))
   - **Category** — Cold, Hot, Alcoholic, Other (or none). Categories group the menu on the player
     ordering screen and in the dashboard's "Add drink" dialog.
3. **Edit/Delete:** Use the pencil/trash buttons next to each item

**Multi-Language Support:**
- Items can have English and French names
- Display language can be changed in Settings

### Payments (optional POS)

Payments are **off by default**. Enable them in **Settings → General → “Payments (POS)”** (also see
[Setting Up Card Payments](#setting-up-card-payments-administrator) for card terminals).

Once enabled:

- **Checkout** collects money before the invoice is issued:
  - **Cash:** type the cash received and click **Add payment** (the change is shown). Use **Exact
    amount** to pay the remaining balance exactly.
  - **Card (terminal):** click **Card (terminal) — €X**. A “Present card on the terminal…” banner
    appears; the customer taps/inserts their card and the payment is added automatically. **Cancel**
    stops the terminal action.
  - **Split payments:** add several payments (cash and/or card) until the remaining balance reaches
    zero. **Complete checkout** is enabled only when the tab is fully paid.
  - Discounts are locked once a payment has been added (prevents amount drift).
- **Receipts** (on screen and the printed invoice) list the payment method(s) and any change due.
- **Admin → Cash & Payments** (shown only when enabled):
  - **Cash shift:** open a shift with an opening float at the start of the day; at closing enter the
    counted cash — expected total (float + net cash) and **variance** are computed. A non-zero
    variance emails the configured maintenance address (when SMTP is set).
  - **Refunds:** per payment, with an amount (partial allowed) and optional reason. Refunding an
    invoiced payment issues a numbered **credit note (avoir)**; the toast shows its number.
  - **Credit notes:** listed with a **Print** button (adds the original receipt reference and the VAT
    breakdown; save as PDF from the print dialog).
  - **Day close & reconciliation:** pick a date to see payments by method, credit notes and cash
    expected/counted/variance; **Export CSV** downloads the payment ledger; **Close day** locks the
    day (refused while a cash shift is open).
- **Reports → Financial** shows **Paid by cash/card** and **Refunds (credit notes)** rows (also in the
  PDF and Excel exports). The **VAT / TVA** report subtracts credit notes and shows a *Refunds
  (credit notes)* category.

### Settings

Access via menu (☰) → **Settings**

**Available Settings:**

- **Application Name:** Header display name (e.g., "Joe's Pool Hall")
- **Public Base URL:** Hostname/IP or FQDN used when generating table QR codes (see [QR Codes](#qr-codes)); leave blank to use the address you're currently browsing from
- **Dashboard layout:** Sections (collapsible groups + flag navigator) or Tabs (one type per tab)
- **Language:** English or Français
- **Currency:** $ (USD), € (EUR), or £ (GBP)
- **Subscriber Discount:** Percentage discount (0-100%)
- **Audio Cues:** Toggle UI click sounds and the new-order chime
- **Fiscal / Legal Information:** Legal business name, SIRET, SIREN, TVA intracommunautaire number, registered address, VAT regime, and declaration periodicity — used on the VAT report and for your own records (see [VAT (TVA) Reporting](#vat-tva-reporting--france))

**Danger Zone:**
- **Clear All Session History:** Permanently deletes completed sessions
  - Requires double confirmation
  - Active sessions are NOT affected
  - Sessions inside a **closed VAT period** are also protected and will not be deleted

---

## Setting Up Card Payments (Administrator)

### What you need

- The app running (Docker) on a machine that can reach the internet.
- A **Stripe account** (business details verified). Start in **test mode**.
- A **Stripe Terminal reader** (e.g. WisePOS E) paired to the venue's Wi‑Fi — or, for testing, a
  Stripe **simulated reader**.
- **Stripe must be able to reach** your server at `https://<your-domain>/api/webhooks/stripe`
  (public HTTPS, reverse proxy, or a tunnel during the pilot). The app itself may stay on HTTP inside
  the LAN.
- Cash-only venues need none of this: just enable Payments and use cash.

### Steps

1. **Stripe (test mode)**
   - Pair/register the reader (Dashboard → Terminal → Readers); note its id (`tmr_…`).
   - Developers → Webhooks → add `https://<your-domain>/api/webhooks/stripe` with events
     `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`; copy the
     signing secret (`whsec_…`).
2. **Server configuration** (compose environment / `.env`), then restart (`docker compose up -d`):
   - `STRIPE_SECRET_KEY=sk_test_…` (the live key later)
   - `STRIPE_TERMINAL_READER_ID=tmr_…`
   - `STRIPE_WEBHOOK_SECRET=whsec_…`
   - `COOKIE_SECURE=true` when the app is served over HTTPS
3. **App settings**
   - **Settings → General → “Payments (POS)” → on**.
   - Currency must be `€`, `$` or `£` (sent to Stripe as eur/usd/gbp).
   - Set the application name and the Fiscal / Legal information (used by reports and your records).
   - Optional: SMTP settings + maintenance alert email for cash-variance alerts.
4. **Test without buying hardware**
   - `PAYMENT_PROVIDER=fake` in the environment: payments capture instantly (no terminal, no network) —
     good for training/testing the UI.
   - Or use Stripe test mode with a **simulated reader** to exercise the real card flow.
5. **Pilot checklist before going live**
   - Cash sale with split + change; card sale; declined card then retry; cancel on the terminal;
     partial refund (print the credit note); close the shift; close the day and export the CSV.
   - Switch Stripe to live keys only after the pilot passes.

### Troubleshooting & operations

- **Webhook not arriving** (terminal shows paid but the app still says “presenting”): check the
  endpoint URL, signing secret and event subscriptions; the app also polls the payment status and
  re-syncs stale card payments whenever the Cash page loads. If the payment is abandoned, press
  **Cancel** next to it on Admin → Cash & Payments.
- **Terminal vs app totals differ** on the day-close card: the “Terminal (Stripe)” row comes from
  Stripe balance transactions (gross minus refunds, plus the fees shown). Check the payment fee
  display, refunds on the stripe dashboard, and that the day boundary matches your accounting day.
  The row is only shown when Stripe settlement data is available.
- **Disable payments quickly**: switch **Settings → General → “Payments (POS)”** off — checkout
  returns to the pre-POS behaviour, card options disappear, and the Cash page is hidden. Existing
  receipts, credit notes and history are untouched.
- **Rotate keys/reader**: update `STRIPE_SECRET_KEY` / `STRIPE_TERMINAL_READER_ID` /
  `STRIPE_WEBHOOK_SECRET` in the environment and restart (`docker compose up -d`). Stop using the old
  reader in the Stripe Dashboard.
- **Going live**: replace test keys/secrets with live ones, then repeat the pilot checklist with a
  small real payment before announcing card payments.
- **Cash-only venues**: no Stripe setup is needed; enable Payments and use cash. Shifts, refunds,
  credit notes, day close and CSV all work without any terminal.

### Things to know

- **One reader per deployment**: the reader id is configured in the environment. Multiple counters
  would need reader selection (not implemented).
- **Internet dependency**: card payments need a connection; if it drops mid-payment the payment can
  remain “presenting” — cancel/refund it from the Cash page. Cash always works.
- **Single staff login**: the app has one admin login today; payments/credit notes record that user.
- **NF525 (France)**: the app records sales and payments with sequential receipts, immutable lines,
  credit notes and period closures — but certification is a legal attestation process. Confirm with
  your expert-comptable before advertising compliance or enabling card payments in production.
- This integrates **payments**, not an external bar POS (menu/order sync) and not customer
  self-payment from the phone.

## Reports

Access via **Admin → Reports**. The page has two tabs: **Financial** and **VAT / TVA**.

### Financial Reports

Generate detailed revenue reports for any time period.

**Period Types:**
- **Day:** Specific date with session details
- **Week:** 7-day period starting Monday
- **Month:** Full calendar month
- **Quarter:** Q1, Q2, Q3, or Q4
- **Year:** Annual summary

**Report Contents:**

1. **Total Revenue** - All sources combined

2. **Revenue by Table Type**
   - American Pool: €X
   - Pool: €X
   - Snooker: €X
   - French: €X

3. **Drinks/Items Revenue** - Food and beverage sales

4. **Subscriptions Revenue** - Active subscriptions in period

5. **Time Series Analysis** (Week/Month/Quarter/Year reports)
   - Revenue trends over time
   - Day-of-week analysis
   - Peak hours identification

6. **Daily Details** (Day reports only)
   - Individual session breakdowns
   - Table usage by session
   - Item-level details
   - Ability to edit/delete charges

### Understanding Reports

**What's Included:**
- Table charges from completed sessions
- All menu items and custom charges
- Subscription revenue

**What's Excluded:**
- Active (ongoing) sessions
- Settlement accounting entries (these are internal adjustments)
- Maintenance or paused tables

**Auto-Load:** Current day report generates automatically when you open the Reports page.

---

## VAT (TVA) Reporting — France

> ⚠️ **Not legal or tax advice.** Consult your *expert-comptable* to confirm these figures and procedures match your business's specific VAT regime before filing. See [VAT-COMPLIANCE.md](VAT-COMPLIANCE.md) for the full conformity notes.

The **VAT / TVA** tab of the Reports page prepares your periodic VAT declaration (CA3/CA12).

### Generating a VAT report

1. Choose a **Period Type** (Month, Quarter, Year, or Day) and the specific period.
2. Click **Load VAT report** to see a breakdown by VAT rate:
   - Total HT (excluding VAT)
   - TVA (VAT amount)
   - Total TTC (including VAT)
3. A breakdown by category (table time, drinks, discounts, other) is shown below the table.

### Closing a period

Once you've filed your declaration for a period with the tax authorities, click **Close period**. This:
- Snapshots the period's totals for your records.
- Prevents **Clear All Session History** from ever deleting sales within that period, so your filed figures always remain traceable in the database.

Closed periods appear in a history list below the report, showing the period, totals, and who closed it.

### Exporting for your accountant

Click **Export CSV ledger** to download every individual sale line in the selected period (date, table/session, description, quantity, unit price, VAT rate, VAT amount, HT amount) — handy for handing off to your accountant or for long-term archival.

### Keeping VAT reports accurate

- Set each drink's and table type's VAT rate correctly in Admin (see [Drink Menu Management](#drink-menu-management) and [Table Types & Inventory](#table-types--inventory)).
- **Always use "✓ Checkout" → Complete Payment** to end sessions that generated revenue — this is what records the table-time charge and issues a sequential receipt. Ending a session any other way will leave that table-time charge out of the VAT report.
- Fill in your **Fiscal / Legal Information** in Settings (SIRET, TVA number, VAT regime, etc.) so it's on hand when filing.

---

## Tips and Best Practices

### For Daily Operations

1. **Start of Day:**
   - Check for any orphaned "occupied" tables
   - Review yesterday's report
   - Ensure all tables set to "available"

2. **During Service:**
   - Use quick drink buttons for speed
   - Check PIN with players when they need tab access
   - Monitor long-running sessions

3. **End of Day:**
   - Checkout all remaining sessions
   - Generate daily report
   - Review any issues or adjustments

### For Settlements

- Always verify player count before settling
- Print receipts for customer records
- Double-check selected items match what player consumed

### For Accuracy

- Add items to tabs immediately (don't wait until checkout)
- Use custom charges for non-menu items
- Verify player count is correct at session start

### For Customer Service

- Share table URLs with players early in session
- Post QR codes near tables for easy access
- Explain subscriber benefits to encourage sign-ups

---

## Keyboard Shortcuts

Currently, the application is mouse/touch-driven with no keyboard shortcuts. All actions require clicking buttons.

---

## Mobile Access

The application is fully responsive and works on:
- Desktop browsers
- Tablets
- Smartphones

**Recommended for:**
- Staff: Desktop/tablet for dashboard
- Players: Smartphones for table view

---

## Troubleshooting

### Common Issues

**"Failed to start session"**
- Check if table is truly available
- Ensure subscriber count ≤ total players
- Refresh the page and try again
- Contact administrator if persistent

**PIN not working**
- Verify PIN from dashboard matches
- Check table number is correct
- PIN expires when session ends

**Items not appearing on tab**
- Confirm item was added (check for success message)
- Wait ~10 seconds for auto-refresh (public view), or return to the tab to refresh immediately
- Refresh the dashboard manually

**Wrong amounts showing**
- Verify correct currency setting
- Check if settlements were applied
- Review individual line items in session details

### Getting Help

If issues persist:
1. Note the table number and time
2. Take a screenshot if possible
3. Contact the system administrator
4. Check Docker logs (for admins)

---

## Frequently Asked Questions

**Q: Can I edit a session after it's started?**
A: Yes, you can add/remove items and adjust player count during the session.

**Q: What happens if I accidentally end a session?**
A: Ended sessions cannot be reopened. You would need to start a new session.

**Q: Can players add items themselves?**
A: No, only staff can add items. Players can only view their tab.

**Q: How do I handle comp (free) sessions?**
A: Start a session with 1 player, add items, then checkout and don't charge.

**Q: Can I change the hourly rate mid-session?**
A: No, rate changes only affect new sessions. Active sessions use the original rate.

**Q: What if internet goes down?**
A: The system requires network access. Active sessions remain, but updates pause until connection restored.

**Q: Can I export report data?**
A: Currently, reports are view-only. Use browser print/PDF for records.

**Q: How far back can I view reports?**
A: As long as session history is retained (until manually cleared via Settings).

---

## Feature Summary

### Core Features
✓ Real-time session monitoring
✓ Automatic time-based charging
✓ Multi-player support with settlements
✓ PIN-protected player views
✓ Drink and item management
✓ Custom charge support
✓ Table transfers
✓ Receipt printing
✓ Player self-service drink ordering with audio-notified Pending Orders queue
✓ QR codes for one-tap table access from a player's phone

### Admin Features
✓ Table type and inventory management
✓ Bulk table creation
✓ Drink menu configuration with VAT rates
✓ Subscription management
✓ Financial reporting (multiple periods)
✓ VAT (TVA) reporting, CSV export, and period closures for French compliance
✓ Multi-currency support
✓ Subscriber discount system
✓ Session history management
✓ Configurable public base URL for QR codes
✓ Fiscal/legal business information

### Player Features
✓ Real-time tab viewing
✓ Auto-refreshing display
✓ Mobile-friendly interface
✓ PIN-protected access
✓ Self-service drink ordering via QR code

---

## Support

For technical support or feature requests, contact your system administrator.

---

**Version:** 1.0  
**Last Updated:** December 2025

---

Thank you for using Pool Tables Manager! We hope this guide helps you make the most of the application. For technical documentation, developers should refer to `DEVELOPER_README.md`.
