# Pool Tables Manager - User Guide

## Welcome to Pool Tables Manager

Pool Tables Manager is a comprehensive solution for managing pool hall operations. This guide will help you understand and use all the features available in the application.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Starting a Session](#starting-a-session)
4. [Managing Active Sessions](#managing-active-sessions)
5. [Adding Items to Tabs](#adding-items-to-tabs)
6. [Player Settlements](#player-settlements)
7. [Ending Sessions (Checkout)](#ending-sessions-checkout)
8. [Subscriptions](#subscriptions)
9. [Public Table View](#public-table-view)
10. [Admin Features](#admin-features)
11. [Reports](#reports)

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

Players can view their tab in real-time from any device.

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

**Auto-Refresh:** View updates every 60 seconds automatically.

### QR Codes (Optional)

Consider creating QR codes linking to each table's URL for easy player access.

---

## Admin Features

Access via menu (☰) → **Admin Panel**

### Table Types & Inventory

**Manage Table Types:**
- Add new table types (e.g., "Billiards", "Carom")
- Set hourly rates in your currency
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
   - Tax status
3. **Edit/Delete:** Use buttons next to each item

**Multi-Language Support:**
- Items can have English and French names
- Display language can be changed in Settings

### Settings

Access via menu (☰) → **Settings**

**Available Settings:**

- **Application Name:** Header display name (e.g., "Joe's Pool Hall")
- **Language:** English or Français
- **Currency:** $ (USD), € (EUR), or £ (GBP)
- **Subscriber Discount:** Percentage discount (0-100%)
- **Audio Cues:** Toggle UI click sounds

**Danger Zone:**
- **Clear All Session History:** Permanently deletes completed sessions
  - Requires double confirmation
  - Active sessions are NOT affected
  - Use for cleanup or starting fresh

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

### Admin Features
✓ Table type and inventory management
✓ Bulk table creation
✓ Drink menu configuration
✓ Subscription management
✓ Financial reporting (multiple periods)
✓ Multi-currency support
✓ Subscriber discount system
✓ Session history management

### Player Features
✓ Real-time tab viewing
✓ Auto-refreshing display
✓ Mobile-friendly interface
✓ PIN-protected access

---

## Support

For technical support or feature requests, contact your system administrator.

---

**Version:** 1.0  
**Last Updated:** December 2025

---

Thank you for using Pool Tables Manager! We hope this guide helps you make the most of the application. For technical documentation, developers should refer to `DEVELOPER_README.md`.
