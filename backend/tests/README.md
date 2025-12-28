# Backend Integration Tests

## Overview
Comprehensive Jest + Supertest integration test suite for the Pool Tables Manager backend API. Tests verify all major workflows without requiring a live database connection.

## Test Coverage
**24 tests across 10 test suites (100% passing)**

### Covered Workflows
- ✅ **Authentication** (2 tests): Local auth setup, login, token rotation, clear
- ✅ **Sessions** (3 tests): Create session, end session, get session details
- ✅ **Table Types** (5 tests): Full CRUD operations + conflict handling
- ✅ **Public Endpoints** (3 tests): Public table access with PIN validation
- ✅ **Subscriptions** (2 tests): Create subscription, delete subscription
- ✅ **Reports** (2 tests): Financial reports validation
- ✅ **Settlements** (1 test): Partial settlement flow
- ✅ **Settings** (2 tests): Get settings, update settings
- ✅ **Patrons** (2 tests): Create patron, list patrons
- ✅ **UI Endpoints** (2 tests): Health check, drinks API

## Architecture

### Mocking Strategy
Tests use a **manual Jest mock** of the Prisma client (`tests/__mocks__/src/prismaClient.js`) with:
- **Stateful implementations** for models requiring persistence across operations (settings, users, subscriptions)
- **Test-specific mocks** for models with complex queries (sessions, tables, table types)

### Key Components

1. **Shared Prisma Mock** (`tests/__mocks__/src/prismaClient.js`)
   - Exports `state` object containing in-memory data structures
   - Implements stateful methods for `setting`, `user`, `subscription` models
   - Used by all tests via `jest.mock('../src/prismaClient')`

2. **Auth Bypass Helper** (`tests/helpers/authBypass.js`)
   - `setupAuthBypass(prisma)`: Bypasses requireAuth middleware for tests
   - `restoreStatefulMocks(prisma)`: Restores stateful implementations after `jest.resetAllMocks()`

3. **Server Configuration** (`server.js`)
   - Modified with `require.main === module` check to prevent auto-listen during test imports
   - Exports `app` for Supertest integration

## Running Tests

### Local Development
```bash
cd backend
npm test
```

### CI Environment (Docker)
```bash
docker run --rm \
  --network pool-tables-manager_default \
  -v $(pwd)/backend:/app \
  -w /app \
  node:18-bullseye \
  bash -c "npm test"
```

### Test Options
```bash
# Run specific test file
npm test -- subscriptions.test.js

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch

# Verbose output
npm test -- --verbose
```

## Test Patterns

### Pattern 1: Simple Mocks (sessions, tabletypes, reports)
```javascript
beforeEach(() => {
  jest.resetAllMocks();
  setupAuthBypass(prisma);
});

test('Example', async () => {
  prisma.tableType.findMany.mockResolvedValue([/* ... */]);
  const res = await agent.get('/api/table-types');
  expect(res.status).toBe(200);
});
```

### Pattern 2: Stateful Mocks (subscriptions, settings, patrons)
```javascript
beforeEach(() => {
  jest.resetAllMocks();
  restoreStatefulMocks(prisma); // IMPORTANT: Before setupAuthBypass
  prisma.state.users = [];
  setupAuthBypass(prisma);
});

test('Example', async () => {
  const res = await agent.post('/api/subscriptions')
    .send({ name: 'John', email: 'john@example.com', duration_months: 3 });
  expect(res.status).toBe(201);
  expect(prisma.state.subscriptions).toHaveLength(1);
});
```

## CI Integration

### GitHub Actions Example
```yaml
name: Backend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        working-directory: backend
        run: npm ci
        
      - name: Run tests
        working-directory: backend
        run: npm test
        
      - name: Upload coverage
        if: always()
        uses: codecov/codecov-action@v3
        with:
          directory: backend/coverage
```

### GitLab CI Example
```yaml
test:backend:
  image: node:18-bullseye
  stage: test
  script:
    - cd backend
    - npm ci
    - npm test
  coverage: '/Lines\s+:\s+([0-9.]+)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: backend/coverage/cobertura-coverage.xml
```

## Maintenance

### Adding New Tests
1. Create test file in `tests/` directory
2. Import mocked Prisma client: `jest.mock('../src/prismaClient', () => require('./__mocks__/src/prismaClient'))`
3. Choose appropriate pattern (simple vs stateful mocks)
4. Implement test assertions

### Extending Stateful Mocks
If a new model needs stateful behavior:
1. Add state property in `tests/__mocks__/src/prismaClient.js` (e.g., `state.newModel = []`)
2. Implement stateful methods (create, findMany, etc.)
3. Add restoration logic to `restoreStatefulMocks()` in `tests/helpers/authBypass.js`

### Troubleshooting

**Problem**: Tests fail with 500 errors after adding `jest.resetAllMocks()`
- **Solution**: Call `restoreStatefulMocks(prisma)` after `jest.resetAllMocks()` in beforeEach

**Problem**: Auth middleware blocks test requests
- **Solution**: Call `setupAuthBypass(prisma)` in beforeEach (after restoreStatefulMocks if using stateful mocks)

**Problem**: Port conflict (EADDRINUSE 3000)
- **Solution**: Server now checks `require.main === module` before auto-listening. If still occurring, ensure you're importing the exported `app`, not starting the server.

## Performance
- **Execution time**: ~39 seconds for full suite (serial execution with `--runInBand`)
- **No database required**: All tests use mocked Prisma client
- **Isolated**: Each test has clean state via `beforeEach` hooks

## Future Enhancements
- [ ] Add integration tests for WebSocket endpoints (if applicable)
- [ ] Add tests for error handling edge cases
- [ ] Add tests for concurrent operations
- [ ] Expand coverage for admin endpoints
- [ ] Add performance benchmarks
