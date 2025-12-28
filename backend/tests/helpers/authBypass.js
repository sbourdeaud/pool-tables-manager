// Shared helper to pre-stub Prisma methods used by requireAuth and other middleware/startup code
// Import this in test files and call setupAuthBypass() in beforeEach() to bypass auth.

function setupAuthBypass(prisma) {
  // Stub setting lookups required by getOidcSettings (used by requireAuth)
  // Return empty when no auth configured
  // IMPORTANT: For tests using stateful mocks, call restoreStatefulMocks() BEFORE this function
  // This function will only set up mocks if they haven't been implemented yet
  
  // Check if setting.findMany has an implementation (from stateful mocks)
  const hasStatefulMock = prisma.setting.findMany._isMockFunction && 
                          prisma.setting.findMany.getMockImplementation();
  
  if (!hasStatefulMock) {
    // No stateful mock, set up simple bypass mocks
    prisma.setting.findMany.mockResolvedValue([]);
    prisma.setting.findUnique.mockResolvedValue(null);
  }
  // If stateful mock exists, don't override it
}

function restoreStatefulMocks(prisma) {
  // Restore stateful implementations after jest.resetAllMocks()
  const state = prisma.state;
  
  // Restore setting methods
  prisma.setting.findMany.mockImplementation(async () => 
    Object.entries(state.mockSettings).map(([key, value]) => ({ key, value }))
  );
  prisma.setting.findUnique.mockImplementation(async ({ where }) => {
    const key = where?.key;
    if (!key) return null;
    const val = state.mockSettings[key];
    return typeof val === 'undefined' ? null : { key, value: val };
  });
  prisma.setting.upsert.mockImplementation(async ({ where, update, create }) => {
    const key = where?.key || (create && create.key);
    const value = (update && update.value) || (create && create.value);
    state.mockSettings[key] = String(value);
    return { key, value: String(value) };
  });
  prisma.setting.deleteMany.mockImplementation(async ({ where }) => {
    if (where && where.key) {
      delete state.mockSettings[where.key];
    }
    return {};
  });
  
  // Restore user methods
  prisma.user.create.mockImplementation(async ({ data }) => {
    const id = `u${state.users.length + 1}`;
    const u = { id, ...data };
    state.users.push(u);
    return u;
  });
  prisma.user.findUnique.mockImplementation(async ({ where }) => {
    if (where?.email) return state.users.find(u => u.email === where.email) || null;
    if (where?.id) return state.users.find(u => u.id === where.id) || null;
    return null;
  });
  prisma.user.findMany.mockImplementation(async ({ where } = {}) => {
    if (!where) return state.users.slice();
    if (where.role) return state.users.filter(u => u.role === where.role);
    return state.users.slice();
  });
  
  // Restore subscription methods
  prisma.subscription.create.mockImplementation(async ({ data }) => {
    const id = `sub${state.subscriptions.length + 1}`;
    const sub = { id, ...data };
    state.subscriptions.push(sub);
    return sub;
  });
  prisma.subscription.delete.mockImplementation(async ({ where }) => {
    const idx = state.subscriptions.findIndex(s => s.id === where.id);
    if (idx !== -1) state.subscriptions.splice(idx, 1);
    return {};
  });
  prisma.subscription.findMany.mockImplementation(async () => state.subscriptions.slice());
}

module.exports = { setupAuthBypass, restoreStatefulMocks };
