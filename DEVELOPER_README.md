# Pool Tables Manager - Developer Documentation

## Project Overview

Pool Tables Manager is a full-stack web application for managing pool hall operations, including table sessions, tab tracking, player settlements, subscriptions, and financial reporting.

**Tech Stack:**
- **Backend:** Node.js, Express, Prisma ORM
- **Database:** PostgreSQL
- **Frontend:** Vanilla JavaScript (no frameworks)
- **Deployment:** Docker & Docker Compose
- **UI:** Dark theme with modern, tile-based interface

## Architecture

### High-Level Structure

```
pool-tables-manager/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema
│   │   └── migrations/            # Database migrations
│   ├── public/
│   │   ├── main.js               # Frontend application (2300+ lines)
│   │   ├── index.html            # Main admin interface
│   │   └── table.html            # Public player-facing view
│   ├── src/
│   │   └── prismaClient.js       # Prisma client configuration
│   ├── server.js                 # Express API server (1100+ lines)
│   ├── Dockerfile                # Container definition
│   └── docker-compose.yml        # Service orchestration
```

### Database Schema

**Core Tables:**
- `TableType` - Pool table types (American, Snooker, etc.) with hourly rates
- `PoolTable` - Individual tables with status (available, occupied, maintenance)
- `Session` - Active/ended table sessions with timestamps, player count, PIN
- `TabLineItem` - Tab items (drinks, charges, settlements) linked to sessions
- `Drink` - Menu items with prices
- `Subscription` - Player subscriptions for discounts
- `Setting` - Application settings (currency, app name, discount %)

**Key Relationships:**
- Session → PoolTable (many-to-one)
- Session → TabLineItem (one-to-many)
- PoolTable → TableType (many-to-one)
- Subscription → Session (many-to-one, optional)

**Special Fields:**
- `Session.pin` - 4-digit PIN for public table access
- `Session.number_of_players` - Player count for charge splitting
- `TabLineItem.type` - Categories: `menu_item`, `custom_charge`, `meta`, `settlement`, `table_settlement`

## Backend API

### Core Endpoints

**Settings**
- `GET /api/settings` - Get all settings
- `PATCH /api/settings` - Update settings

**Table Types**
- `GET /api/table-types` - List all table types
- `POST /api/table-types` - Create table type
- `PUT /api/table-types/:id` - Update table type
- `DELETE /api/table-types/:id` - Delete table type

**Tables**
- `GET /api/tables` - List all tables
- `POST /api/tables` - Create single table
- `POST /api/tables/bulk` - Create multiple tables (quantity-based)
- `PUT /api/tables/:id` - Update table (number, type, status)
- `DELETE /api/tables/:id` - Delete table

**Sessions**
- `GET /api/sessions` - List all sessions
- `GET /api/sessions/:id` - Get session details with tab items
- `POST /api/sessions` - Start new session (generates PIN)
- `PATCH /api/sessions/:id` - Update session (player count, etc.)
- `PATCH /api/sessions/:id/end` - End session, calculate total
- `POST /api/sessions/:id/settle` - Player settlement (reduce items/charges)
- `POST /api/sessions/:id/transfer` - Transfer session to different table

**Tab Items**
- `POST /api/tab-items` - Add item to session tab
- `PUT /api/tab-items/:id` - Update tab item
- `DELETE /api/tab-items/:id` - Delete tab item

**Drinks (Menu)**
- `GET /api/drinks` - List drinks (with language support)
- `POST /api/admin/drinks` - Create drink
- `GET /api/admin/drinks/:id` - Get drink details
- `PUT /api/admin/drinks/:id` - Update drink
- `DELETE /api/admin/drinks/:id` - Delete drink

**Subscriptions**
- `GET /api/subscriptions` - List all subscriptions
- `POST /api/subscriptions` - Create subscription

**Reports**
- `GET /api/reports/financial` - Financial report by period (day/week/month/quarter/year)
- `GET /api/reports` - Chart data for analytics

**Public Access**
- `GET /api/public/table/:tableNumber` - Get table session info (requires PIN)

**Admin**
- `DELETE /api/admin/clear-history` - Clear all ended sessions and tab data

### UUID Handling Pattern

The application uses PostgreSQL UUIDs extensively. Due to mixing Prisma ORM with raw SQL, a specific pattern is required:

**For WHERE clauses with string parameters:**
```javascript
// Cast column to text for comparison
WHERE id::text = $1  // Parameter is string
```

**For INSERT statements:**
```javascript
// Generate UUID and cast parameter
const id = crypto.randomUUID();
INSERT INTO "Table" (id, ...) VALUES ($1::uuid, ...)
```

**For SELECT with UUID from database:**
```javascript
// No cast needed - database returns UUID type
WHERE pt.id = ${sess.table_id}  // sess.table_id is already UUID
```

## Frontend Architecture

### Single-Page Application Structure

The frontend (`main.js`) is a vanilla JavaScript SPA with no framework dependencies.

**Core Components:**
- `renderDashboard()` - Main table management view
- `renderAdminDashboard()` - Admin menu
- `renderTableManagement()` - Table/type configuration
- `renderDrinkManagement()` - Menu item management
- `renderSubscriptions()` - Subscription management
- `renderReports()` - Financial reporting
- `renderSettings()` - Application settings

**Modal System:**
- Start Session Modal - Player count, subscriber selection
- Add Drink Modal - Quick add drinks to active tabs
- Checkout Modal - End session and calculate total
- Settlement Modal - Player leaves, pays their share
- Transfer Modal - Move session to different table

### Key UI Features

**Dashboard:**
- Grouped by table type with colored headers
- Real-time duration updates (every second)
- Quick actions: Start, Pause, Transfer, Checkout
- PIN display for public access
- Flag icons for table types

**Session Management:**
- Supports multiple players per table
- Subscriber discount system (50% default)
- Dynamic charge calculation based on elapsed time
- Hourly rate rounding (ceil)

**Settlement System:**
- Player can settle their portion and leave
- Automatically reduces tab items and table charge
- Supports partial settlements (e.g., 1 of 2 beers)
- Creates negative line items for accounting
- Reduces player count after settlement

**Public Table View (`table.html`):**
- PIN-protected access per session
- Auto-refresh every 60 seconds
- Real-time tab display
- Mobile-friendly layout

## Key Workflows

### Session Lifecycle

1. **Start Session**
   - Select available table
   - Set player count and subscriber count
   - System generates 4-digit PIN
   - Table marked as occupied
   - Session starts with timestamp

2. **During Session**
   - Add drinks/items to tab
   - Add custom charges
   - View real-time accumulated charges
   - Transfer to different table if needed

3. **Player Settlement** (optional)
   - Player selects items to pay for
   - Choose table share (equal split) or full charge
   - System creates negative line items
   - Items reduced or removed from tab
   - Player count decremented

4. **Checkout (End Session)**
   - Review final charges
   - Calculate total (table + items)
   - Optional receipt printing
   - Session marked as ended
   - Table becomes available

### Revenue Calculation

**Table Charges:**
- Base: `hourlyRate * ceiledHours`
- With subscribers playing: Apply discount % to non-subscribers
- All subscribers: No charge

**Tab Items:**
- Direct sum of item totals
- Excludes: `meta`, `settlement`, `table_settlement` types

**Report Exclusions:**
- Settlement line items (negative) are filtered out
- Only actual charges counted in revenue

### Subscriber Discount Logic

```javascript
if (subscriberCount > 0 && nonSubscriberCount > 0) {
  // Mixed group: discount for non-subscribers
  charge = baseCharge * (1 - discountPercent / 100);
} else if (subscriberCount > 0 && nonSubscriberCount === 0) {
  // All subscribers: no charge
  charge = 0;
} else {
  // No subscribers: full charge
  charge = baseCharge;
}
```

## Development Setup

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL (via Docker)

### Running with Docker

```bash
cd backend
docker-compose up --build
```

Access at: `http://localhost:3000`

### Database Migrations

Migrations are in `backend/prisma/migrations/`. To create a new migration:

```bash
npx prisma migrate dev --name migration_name
```

### Environment Variables

Docker Compose sets:
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 3000)

## Features

### Admin Features
- Table type management (add/edit/delete with hourly rates)
- Table inventory (bulk creation, number editing)
- Drink menu management (multilingual support)
- Subscription management
- Financial reports (day/week/month/quarter/year)
- Settings (currency, app name, subscriber discount)
- Clear session history

### Operator Features
- Start/end sessions with PIN generation
- Real-time session monitoring
- Quick drink additions
- Player settlements
- Table transfers
- Custom charges
- Receipt printing

### Player Features
- Public table view with PIN access
- Real-time tab viewing
- Auto-refresh every 60 seconds

### Auto-Seeding
On server startup, the system automatically creates:
- Default table types: American (30€), Pool (25€), Snooker (40€), French (35€)
- Default drinks: Beer (6€), Soda (3€)

Only seeds if database is empty.

## Data Integrity

### Transaction Safety
Critical operations use Prisma transactions:
- Session creation (table lock + session insert)
- Session checkout (calculate + update + release table)
- Table transfer (validate + update + swap statuses)

### Validation
- Table availability checked before session start
- PIN validation for public access (403 on failure)
- Player count minimum 1
- UUID format validation on all ID parameters

### Edge Cases Handled
- Negative settlement amounts (prevented)
- Over-settlement (cannot settle more items than exist)
- Concurrent table access (database locks)
- Orphaned occupied tables (reset on startup)

## Performance Considerations

- **Parallel Fetches:** Dashboard loads types, tables, sessions in parallel
- **Indexed Queries:** Database indexes on foreign keys and status fields
- **Minimal DOM Updates:** Duration updates only modify text content
- **Debounced Refresh:** Auto-refresh limited to 60-second intervals

## Security

- No authentication system (trusted network assumption)
- PIN protection for public table views
- SQL injection prevention via parameterized queries
- CORS not configured (same-origin only)

## Known Limitations

- Single-language UI (English) with partial French support
- No user authentication/authorization
- No real-time WebSocket updates (polling-based)
- Manual receipt printing (browser print dialog)
- No payment integration

## Future Enhancements

See `TODO_LIST.md`:
- Table management start/stop controls
- Subscription create/delete UI improvements
- Visual updates to table management page

## Troubleshooting

**Common Issues:**

1. **"Failed to start session"**
   - Check Docker logs: `docker logs pool-tables-manager-app-1`
   - Usually UUID casting or missing ID errors

2. **UUID operator errors**
   - Ensure using `id::text = $1` pattern for string params
   - Use `crypto.randomUUID()` for raw SQL inserts

3. **Settlement math incorrect**
   - Check that settlement/table_settlement items are excluded from revenue
   - Verify player share uses correct (net or gross) charge

4. **Database connection issues**
   - Verify PostgreSQL container is running
   - Check `DATABASE_URL` environment variable

## Contributing

When modifying the codebase:
1. Follow existing UUID casting patterns
2. Test session lifecycle thoroughly
3. Verify report calculations after data model changes
4. Update both README files for feature additions
5. Rebuild Docker containers: `docker-compose up --build -d`

## License

[Add your license information]
