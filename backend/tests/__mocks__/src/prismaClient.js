const state = { mockSettings: {}, users: [], subscriptions: [] };

const mk = () => jest.fn();

// Minimal stateful implementations for settings, users, and subscriptions to support tests that rely on state
const setting = {
  findMany: jest.fn(async () => Object.entries(state.mockSettings).map(([key, value]) => ({ key, value }))),
  findUnique: jest.fn(async ({ where }) => {
    const key = where?.key;
    if (!key) return null;
    const val = state.mockSettings[key];
    return typeof val === 'undefined' ? null : { key, value: val };
  }),
  upsert: jest.fn(async ({ where, update, create }) => {
    const key = where?.key || (create && create.key);
    const value = (update && update.value) || (create && create.value);
    state.mockSettings[key] = String(value);
    return { key, value: String(value) };
  }),
  update: mk(),
  deleteMany: jest.fn(async ({ where }) => {
    if (where && where.key) {
      delete state.mockSettings[where.key];
    }
    return {};
  })
};

const user = {
  create: jest.fn(async ({ data }) => {
    const id = `u${state.users.length + 1}`;
    const u = { id, ...data };
    state.users.push(u);
    return u;
  }),
  findUnique: jest.fn(async ({ where }) => {
    if (where?.email) return state.users.find(u => u.email === where.email) || null;
    if (where?.id) return state.users.find(u => u.id === where.id) || null;
    return null;
  }),
  findMany: jest.fn(async ({ where } = {}) => {
    if (!where) return state.users.slice();
    // Filter by role if specified
    if (where.role) return state.users.filter(u => u.role === where.role);
    return state.users.slice();
  }),
  update: mk(),
  delete: mk()
};

const subscription = {
  create: jest.fn(async ({ data }) => {
    const id = `sub${state.subscriptions.length + 1}`;
    const sub = { id, ...data };
    state.subscriptions.push(sub);
    return sub;
  }),
  delete: jest.fn(async ({ where }) => {
    const idx = state.subscriptions.findIndex(s => s.id === where.id);
    if (idx !== -1) state.subscriptions.splice(idx, 1);
    return {};
  }),
  findMany: jest.fn(async () => state.subscriptions.slice()),
  update: mk()
};

module.exports = {
  state,
  setting,
  poolTable: { findMany: mk(), findUnique: mk(), create: mk(), update: mk(), count: mk() },
  tableType: { findMany: mk(), create: mk(), update: mk(), delete: mk() },
  session: { findMany: mk(), findUnique: mk(), create: mk(), update: mk(), deleteMany: mk() },
  tabLineItem: { findMany: mk(), findFirst: mk(), create: mk(), update: mk(), delete: mk() },
  user,
  subscription,
  drink: { findMany: mk(), create: mk(), findUnique: mk(), update: mk(), delete: mk() },

  // Raw helpers
  $queryRaw: mk(),
  $queryRawUnsafe: mk(),
  $executeRaw: mk(),
  $executeRawUnsafe: mk(),

  // Transaction helper (tests may mockImplementation on this)
  $transaction: mk(),
};
