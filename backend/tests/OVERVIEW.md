# Test Suite Structure

This directory contains integration tests for the Pool Tables Manager backend API.

## File Organization

```
tests/
├── __mocks__/
│   └── src/
│       └── prismaClient.js       # Shared manual mock with stateful implementations
├── helpers/
│   └── authBypass.js             # Auth bypass + stateful mock restoration
├── auth.test.js                  # Authentication flow tests
├── sessions.test.js              # Session management tests
├── tabletypes.test.js            # Table type CRUD tests
├── public.test.js                # Public endpoint tests
├── subscriptions.test.js         # Subscription management tests
├── reports.test.js               # Financial reports tests
├── settlements.test.js           # Settlement workflow tests
├── settings.test.js              # Settings API tests
├── patrons.test.js               # Patron management tests
├── ui.test.js                    # UI/health endpoints tests
└── README.md                     # This file
```

## Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run specific test file
npm test -- subscriptions.test.js

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## Test Results Summary

| Test Suite | Tests | Status | Coverage |
|------------|-------|--------|----------|
| auth.test.js | 2 | ✅ PASS | Local auth flow |
| sessions.test.js | 3 | ✅ PASS | Session lifecycle |
| tabletypes.test.js | 5 | ✅ PASS | Full CRUD |
| public.test.js | 3 | ✅ PASS | Public access |
| subscriptions.test.js | 2 | ✅ PASS | Sub management |
| reports.test.js | 2 | ✅ PASS | Financial reports |
| settlements.test.js | 1 | ✅ PASS | Partial settlements |
| settings.test.js | 2 | ✅ PASS | Settings API |
| patrons.test.js | 2 | ✅ PASS | Patron CRUD |
| ui.test.js | 2 | ✅ PASS | Health/drinks |
| **TOTAL** | **24** | **✅ 100%** | **All workflows** |

## Common Issues

### Issue: Tests fail with 500 errors after jest.resetAllMocks()
**Cause**: `jest.resetAllMocks()` removes stateful mock implementations  
**Fix**: Call `restoreStatefulMocks(prisma)` after `jest.resetAllMocks()`:
```javascript
beforeEach(() => {
  jest.resetAllMocks();
  restoreStatefulMocks(prisma); // Add this
  setupAuthBypass(prisma);
});
```

### Issue: Auth middleware blocks requests
**Cause**: requireAuth middleware checking OIDC settings  
**Fix**: Call `setupAuthBypass(prisma)` in beforeEach:
```javascript
const { setupAuthBypass } = require('./helpers/authBypass');
beforeEach(() => {
  setupAuthBypass(prisma);
});
```

### Issue: Port 3000 already in use
**Cause**: Server auto-listening on import  
**Fix**: Already resolved - `server.js` now uses `require.main === module` check

## Adding New Tests

1. **Create test file** in `tests/` directory
2. **Import dependencies**:
   ```javascript
   const request = require('supertest');
   const { setupAuthBypass, restoreStatefulMocks } = require('./helpers/authBypass');
   
   jest.mock('../src/prismaClient', () => require('./__mocks__/src/prismaClient'));
   const prisma = require('../src/prismaClient');
   const app = require('../server');
   ```

3. **Choose pattern based on needs**:
   - **Simple mocks**: For endpoints with straightforward Prisma queries
   - **Stateful mocks**: For endpoints that create/modify data across requests

4. **Write tests** following existing patterns

## Documentation
See [README.md](./README.md) for comprehensive documentation including:
- Architecture details
- Mocking strategies
- CI integration examples
- Maintenance guide
