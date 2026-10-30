const state = { mockSettings: {}, users: [], subscriptions: [], payments: [], cashShifts: [], receipts: [], paymentEvents: [], creditNotes: [], closures: [] };

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

// Plain async implementations (not jest.fn) so they survive jest.resetAllMocks().
const payment = {
  create: async ({ data }) => {
    const record = { id: `pay${state.payments.length + 1}`, refundedCents: 0, status: 'captured', createdAt: new Date(), updatedAt: new Date(), ...data };
    state.payments.push(record);
    return record;
  },
  findMany: async (args = {}) => {
    const where = args.where || {};
    let list = state.payments.slice();
    if (where.method) list = list.filter(p => p.method === where.method);
    if (where.id && Array.isArray(where.id.in)) list = list.filter(p => where.id.in.includes(p.id));
    if (where.createdAt) {
      const { gte, lte } = where.createdAt;
      list = list.filter(p => (!gte || new Date(p.createdAt) >= new Date(gte)) && (!lte || new Date(p.createdAt) <= new Date(lte)));
    }
    if (args.orderBy && args.orderBy.createdAt === 'desc') list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (args.take) list = list.slice(0, args.take);
    return list;
  },
  findUnique: async ({ where }) => state.payments.find(p => p.id === where.id) || null,
  findFirst: async ({ where } = {}) => {
    if (where && where.providerRef) return state.payments.find(p => p.providerRef === where.providerRef) || null;
    return state.payments[0] || null;
  },
  update: async ({ where, data }) => {
    const record = state.payments.find(p => p.id === where.id);
    if (!record) throw new Error('payment not found');
    Object.assign(record, data);
    return record;
  }
};

const receipt = {
  create: async ({ data }) => {
    const record = { id: `rec${state.receipts.length + 1}`, ...data };
    state.receipts.push(record);
    return record;
  },
  findMany: async (args = {}) => {
    const ids = args.where && args.where.id && args.where.id.in;
    return state.receipts.filter(r => !ids || ids.includes(r.id));
  },
  findUnique: async ({ where }) => state.receipts.find(r => r.id === where.id) || null
};

const creditNote = {
  create: async ({ data }) => {
    const record = { id: `cn${state.creditNotes.length + 1}`, createdAt: new Date(), ...data };
    state.creditNotes.push(record);
    return record;
  },
  findMany: async (args = {}) => {
    const where = args.where || {};
    let list = state.creditNotes.slice();
    if (where.createdAt) {
      const { gte, lte } = where.createdAt;
      list = list.filter(n => (!gte || new Date(n.createdAt) >= new Date(gte)) && (!lte || new Date(n.createdAt) <= new Date(lte)));
    }
    return list;
  }
};

const closurePeriod = {
  create: async ({ data }) => {
    if (state.closures.some(c => c.periodType === data.periodType && c.periodKey === data.periodKey)) {
      const err = new Error('unique constraint');
      err.code = 'P2002';
      throw err;
    }
    const record = { id: `cl${state.closures.length + 1}`, closedAt: new Date(), ...data };
    state.closures.push(record);
    return record;
  },
  findUnique: async ({ where }) => {
    const key = where && where.periodType_periodKey;
    if (!key) return null;
    return state.closures.find(c => c.periodType === key.periodType && c.periodKey === key.periodKey) || null;
  },
  findMany: async () => state.closures.slice()
};

const paymentEvent = {
  findUnique: async ({ where }) => state.paymentEvents.find(e => e.eventId === where.eventId) || null,
  create: async ({ data }) => {
    const record = { id: `evt${state.paymentEvents.length + 1}`, createdAt: new Date(), ...data };
    state.paymentEvents.push(record);
    return record;
  }
};

// Transaction object used by checkout tests: models + inert raw helpers with a
// canned receipt-sequence response.
const makeTx = () => ({
  tabLineItem: module.exports.tabLineItem,
  payment: module.exports.payment,
  receipt: module.exports.receipt,
  creditNote: module.exports.creditNote,
  cashShift: module.exports.cashShift,
  closurePeriod: module.exports.closurePeriod,
  poolTable: module.exports.poolTable,
  $executeRawUnsafe: async () => ({}),
  $queryRawUnsafe: async (sql) => {
    const text = String(sql);
    if (text.includes('MAX(number)') && text.includes('"CreditNote"')) return [{ next: (state.creditNotes.length || 0) + 1 }];
    if (text.includes('MAX(number)') && text.includes('"Receipt"')) return [{ next: (state.receipts.length || 0) + 1 }];
    return [];
  },
  $queryRaw: async () => []
});

const cashShift = {
  findFirst: async (args = {}) => {
    const where = args.where || {};
    const list = state.cashShifts.filter(shift => (where.closedAt === null ? !shift.closedAt : true));
    return list.length ? list[list.length - 1] : null;
  },
  findUnique: async ({ where }) => state.cashShifts.find(shift => shift.id === where.id) || null,
  findMany: async () => state.cashShifts.slice(),
  create: async ({ data }) => {
    const shift = { id: `shift${state.cashShifts.length + 1}`, openedAt: new Date(), ...data };
    state.cashShifts.push(shift);
    return shift;
  },
  update: async ({ where, data }) => {
    const shift = state.cashShifts.find(x => x.id === where.id);
    if (!shift) throw new Error('shift not found');
    Object.assign(shift, data);
    return shift;
  }
};

module.exports = {
  state,
  setting,
  payment,
  cashShift,
  receipt,
  creditNote,
  closurePeriod,
  paymentEvent,
  __makeTx: makeTx,
  poolTable: { findMany: mk(), findUnique: mk(), create: mk(), update: mk(), count: mk() },
  tableType: { findMany: mk(), create: mk(), update: mk(), delete: mk() },
  session: { findMany: mk(), findUnique: mk(), create: mk(), update: mk(), deleteMany: mk() },
  tabLineItem: { findMany: mk(), findFirst: mk(), findUnique: mk(), create: mk(), update: mk(), delete: mk() },
  user,
  subscription,
  drink: { findMany: mk(), create: mk(), findUnique: mk(), update: mk(), delete: mk() },
  // Plain (non-jest.fn) default so it survives jest.resetAllMocks() in suites
  // that don't restore stateful mocks; the public table endpoint expects an array.
  pendingOrder: { findMany: async () => [], findUnique: mk(), create: mk(), update: mk() },

  // Raw helpers
  $queryRaw: mk(),
  $queryRawUnsafe: mk(),
  $executeRaw: mk(),
  $executeRawUnsafe: mk(),

  // Transaction helper (tests may mockImplementation on this)
  $transaction: jest.fn(async (fn) => fn(makeTx())),
};
