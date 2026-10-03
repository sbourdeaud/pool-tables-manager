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

---

## Getting Started

### Accessing the Application

Open your web browser and navigate to: `http://localhost:3000` (or your server address)

The main dashboard will display all your pool tables organized by type.

### Main Menu

Click the **hamburger menu (☰)** in the top-right corner to access:
- **Admin Panel** - Configuration and management
- **Reports** - Financial reports
- **Subscriptions** - Manage player subscriptions
- **Settings** - Application preferences

---

## Dashboard Overview

The dashboard is your central hub for managing all tables.

### Table Display

Tables are grouped by type (American, Pool, Snooker, French) with color-coded headers:
- **Green tiles** = Available tables
- **Blue tiles** = Active sessions
- **Red tiles** = Maintenance mode

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
- **▶ Start** - Begin a new session

**Active Tables:**
- **🍺 Drink** - Add drinks to the tab
- **↗ Transfer** - Move session to another table
- **✓ Checkout** - End session and calculate total
- **🧾 Settle** - Player settlement (when multiple players)

---

## Starting a Session

1. Click **▶ Start** on an available table
2. Set the number of players (default: 1)
3. (Optional) Select subscribers from your list
   - Subscribers receive discounts when playing
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

1. Click **🍺 Drink** on an active table tile
2. Browse the drink menu
3. Use **+** and **-** buttons to select quantities
4. Click **Add to Tab**

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

**Auto-Refresh:** View updates every 60 seconds automatically.

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
- **Add Tables:** 
  - Specify quantity to create multiple tables at once
  - Tables auto-number sequentially
- **Edit Table Numbers:** Click "Edit #" to change table numbers
- **Delete Tables:** Remove unused tables
- **Set Maintenance Mode:** Temporarily disable tables

**Bulk Operations:**
- Add multiple tables of same type (1-50 at once)
- Tables automatically get next available numbers

### Drink Menu Management

1. Click **Drinks Menu**
2. **Add New Item:**
   - Name (English and French)
   - Price
   - VAT rate (20% standard, 10% reduced, or 0% exempt — see [VAT (TVA) Reporting](#vat-tva-reporting--france))
3. **Edit/Delete:** Use buttons next to each item

**Multi-Language Support:**
- Items can have English and French names
- Display language can be changed in Settings

### Settings

Access via menu (☰) → **Settings**

**Available Settings:**

- **Application Name:** Header display name (e.g., "Joe's Pool Hall")
- **Public Base URL:** Hostname/IP or FQDN used when generating table QR codes (see [QR Codes](#qr-codes)); leave blank to use the address you're currently browsing from
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

## Reports

Access via menu (☰) → **Reports**

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

Below the Financial Reports section, the Reports page has a dedicated **"TVA (VAT) Report"** panel for preparing your periodic VAT declaration (CA3/CA12).

### Generating a VAT report

1. Choose a **Period Type** (Month, Quarter, Year, or Day) and the specific period.
2. Click **Generate VAT Report** to see a breakdown by VAT rate:
   - Total HT (excluding VAT)
   - TVA (VAT amount)
   - Total TTC (including VAT)
3. A breakdown by category (table time, drinks, discounts, other) is shown below the table.

### Closing a period

Once you've filed your declaration for a period with the tax authorities, click **🔒 Close Period (lock for filing)**. This:
- Snapshots the period's totals for your records.
- Prevents **Clear All Session History** from ever deleting sales within that period, so your filed figures always remain traceable in the database.

Closed periods appear in a history list below the report, showing the period, totals, and who closed it.

### Exporting for your accountant

Click **Export CSV** to download every individual sale line in the selected period (date, table/session, description, quantity, unit price, VAT rate, VAT amount, HT amount) — handy for handing off to your accountant or for long-term archival.

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
- Wait 60 seconds for auto-refresh (public view)
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
