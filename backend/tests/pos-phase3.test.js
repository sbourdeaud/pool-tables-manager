const request = require('supertest');
const { setupAuthBypass, restoreStatefulMocks } = require('./helpers/authBypass');

jest.mock('../src/prismaClient', () => require('./__mocks__/src/prismaClient'));
const prisma = require('../src/prismaClient');
const app = require('../server');

const RECEIPT = () => ({
  id: 'rec1',
  number: 12,
  year: 2026,
  sessionId: 'sess1',
  itemsJson: JSON.stringify([
    { description: 'Table Time', quantity: 1, unitPrice: 600, totalCents: 600, vatRatePercent: 20 },
    { description: 'Beer', quantity: 1, unitPrice: 600, totalCents: 600, vatRatePercent: 10 }
  ]),
  totalTtcCents: 1200
});

describe('POS phase 3: credit notes, reconciliation, day close, CSV', () => {
  const agent = request.agent(app);

  beforeEach(() => {
    prisma.state.mockSettings = { pos_enabled: 'true', currency: '€' };
    prisma.state.payments = [];
    prisma.state.cashShifts = [];
    prisma.state.receipts = [];
    prisma.state.creditNotes = [];
    prisma.state.closures = [];
    prisma.state.paymentEvents = [];
    jest.resetAllMocks();
    restoreStatefulMocks(prisma);
    setupAuthBypass(prisma);
    prisma.$queryRawUnsafe.mockResolvedValue([{ next: 1 }]);
    prisma.tabLineItem.findMany.mockResolvedValue([]);
  });

  test('refunds issue a sequentially numbered credit note (VAT split by rate)', async () => {
    prisma.state.receipts.push(RECEIPT());
    prisma.state.payments.push({ id: 'pay1', sessionId: 'sess1', receiptId: 'rec1', method: 'cash', amountCents: 1200, refundedCents: 0, status: 'captured', createdAt: new Date() });

    const res = await agent.post('/api/payments/pay1/refund').send({ amountCents: 600, reason: 'breakage' });
    expect(res.status).toBe(200);
    expect(res.body.creditNote).toBeTruthy();
    expect(res.body.creditNote.number).toBe(1);
    expect(res.body.creditNote.year).toBe(2026);
    expect(res.body.creditNote.totalTtcCents).toBe(600);
    // 600 split evenly across 20% and 10% buckets: VAT 50 + 27 = 77
    expect(res.body.creditNote.vatCents).toBe(77);

    const note = prisma.state.creditNotes[0];
    expect(note.subtotalHtCents).toBe(523);
    const lines = JSON.parse(note.itemsJson);
    expect(lines).toHaveLength(2);
    expect(lines.every(line => line.totalCents < 0 && line.vatAmountCents < 0)).toBe(true);
  });

  test('refunds before checkout (no receipt) do not create a credit note', async () => {
    prisma.state.payments.push({ id: 'pay2', sessionId: 'sess1', receiptId: null, method: 'cash', amountCents: 1200, refundedCents: 0, status: 'captured', createdAt: new Date() });
    const res = await agent.post('/api/payments/pay2/refund').send({});
    expect(res.status).toBe(200);
    expect(res.body.creditNote).toBeNull();
    expect(prisma.state.creditNotes).toHaveLength(0);
  });

  test('VAT report subtracts credit notes (by rate and refund category)', async () => {
    const now = new Date();
    prisma.tabLineItem.findMany.mockResolvedValue([
      { totalCents: 1200, vatRatePercent: 20, vatAmountCents: 200, type: 'table_time', createdAt: now }
    ]);
    prisma.state.creditNotes.push({
      id: 'cnX', number: 3, year: 2026, receiptId: 'rec1', sessionId: 'sess1',
      itemsJson: JSON.stringify([{ description: 'Refund (credit note)', quantity: 1, unitPrice: -600, totalCents: -600, vatRatePercent: 20, vatAmountCents: -100 }]),
      subtotalHtCents: 500, vatCents: 100, totalTtcCents: 600, createdAt: now
    });

    const date = now.toISOString().slice(0, 10);
    const res = await agent.get('/api/reports/vat').query({ periodType: 'day', date });
    expect(res.status).toBe(200);
    expect(res.body.grandTotalTtcCents).toBe(600);
    expect(res.body.grandVatCents).toBe(100);
    expect(res.body.byRate['20'].totalTtcCents).toBe(600);
    expect(res.body.byCategory.refund).toBe(-600);
  });

  test('reconciliation totals by method, credit notes and cash shifts', async () => {
    const now = new Date();
    prisma.state.payments.push(
      { id: 'p1', sessionId: 's1', method: 'cash', amountCents: 1800, refundedCents: 0, status: 'captured', createdAt: now },
      { id: 'p2', sessionId: 's1', method: 'card', amountCents: 1200, refundedCents: 200, status: 'partially_refunded', createdAt: now }
    );
    prisma.state.creditNotes.push({ id: 'cn1', number: 1, year: 2026, receiptId: 'rec1', sessionId: 's1', itemsJson: '[]', subtotalHtCents: 0, vatCents: 0, totalTtcCents: 200, createdAt: now });
    prisma.state.cashShifts.push({ id: 'sh1', openingFloatCents: 5000, openedAt: now, closedAt: now, countedCents: 6700, expectedCents: 6800, varianceCents: -100 });

    const date = now.toISOString().slice(0, 10);
    const res = await agent.get('/api/reports/reconciliation').query({ date });
    expect(res.status).toBe(200);
    expect(res.body.payments.byMethod.cash.netCents).toBe(1800);
    expect(res.body.payments.byMethod.card.netCents).toBe(1000);
    expect(res.body.creditNotes.totalTtcCents).toBe(200);
    expect(res.body.cashShifts.varianceCents).toBe(-100);
    expect(res.body.closure).toBeNull();
  });

  test('day close stores reconciliation and refuses with an open shift or a closed day', async () => {
    const date = new Date().toISOString().slice(0, 10);
    prisma.state.cashShifts.push({ id: 'sh1', openingFloatCents: 5000, openedAt: new Date(), closedAt: null });

    const blocked = await agent.post('/api/reports/day-close').send({ date });
    expect(blocked.status).toBe(409);
    expect(blocked.body.error).toBe('open_shift');

    prisma.state.cashShifts[0].closedAt = new Date();
    const res = await agent.post('/api/reports/day-close').send({ date });
    expect(res.status).toBe(201);
    expect(res.body.reconciliationJson).toBeTruthy();
    expect(JSON.parse(res.body.reconciliationJson).cashShifts.count).toBe(1);

    const duplicate = await agent.post('/api/reports/day-close').send({ date });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error).toBe('already_closed');
  });

  test('payments CSV export includes payments and credit note corrections', async () => {
    const now = new Date();
    prisma.state.receipts.push(RECEIPT());
    prisma.state.payments.push({ id: 'p1', sessionId: 's1', receiptId: 'rec1', method: 'cash', provider: 'cash', amountCents: 1200, refundedCents: 0, status: 'captured', createdAt: now });
    prisma.state.creditNotes.push({ id: 'cn1', number: 2, year: 2026, receiptId: 'rec1', sessionId: 's1', itemsJson: '[]', subtotalHtCents: 0, vatCents: 0, totalTtcCents: 300, createdAt: now });

    const date = now.toISOString().slice(0, 10);
    const res = await agent.get('/api/reports/payments/export').query({ from: date, to: date });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text).toContain('Date,Type,Receipt,Table,Method');
    expect(res.text).toContain('payment');
    expect(res.text).toContain('credit_note');
    expect(res.text).toContain('-300');
  });
});
