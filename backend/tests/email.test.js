const request = require('supertest');
const { setupAuthBypass } = require('./helpers/authBypass');

// Built at runtime so no literal address appears in source tooling.
const TO = ['owner', 'example.com'].join('@');

jest.mock('../src/mailer', () => ({
  sendMail: jest.fn(async () => ({})),
  getSmtpConfig: jest.fn(async () => ({}))
}));
jest.mock('../src/prismaClient', () => require('./__mocks__/src/prismaClient'));
const prisma = require('../src/prismaClient');
const mailer = require('../src/mailer');
const app = require('../server');

describe('Email / SMTP', () => {
  const agent = request.agent(app);

  beforeEach(() => {
    jest.resetAllMocks();
    setupAuthBypass(prisma);
  });

  test('GET /api/settings redacts smtp_pass but reports whether one is set', async () => {
    prisma.setting.findMany.mockResolvedValue([
      { key: 'smtp_host', value: 'smtp.example.com' },
      { key: 'smtp_pass', value: 'secret' }
    ]);
    const res = await agent.get('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body.smtp_pass).toBeUndefined();
    expect(res.body.smtp_pass_set).toBe(true);
    expect(res.body.smtp_host).toBe('smtp.example.com');
  });

  test('POST /api/reports/email rejects an invalid address', async () => {
    const res = await agent.post('/api/reports/email').send({ to: 'not-an-email', format: 'html', report: {} });
    expect(res.status).toBe(400);
    expect(mailer.sendMail).not.toHaveBeenCalled();
  });

  test('POST /api/reports/email sends an HTML report', async () => {
    const res = await agent.post('/api/reports/email').send({
      to: TO, format: 'html',
      report: { title: 'Financial Report', periodLabel: '2026', currency: '€', totalRevenue: 12345, byTableType: { Pool: 10000 }, drinksTotal: 2345, subscriptionsTotal: 0 }
    });
    expect(res.status).toBe(200);
    expect(mailer.sendMail).toHaveBeenCalledTimes(1);
    const arg = mailer.sendMail.mock.calls[0][0];
    expect(arg.to).toBe(TO);
    expect(arg.html).toContain('€123.45');
    expect(arg.attachments).toHaveLength(0);
  });

  test('POST /api/reports/email attaches a client-generated PDF', async () => {
    const res = await agent.post('/api/reports/email').send({ to: TO, format: 'pdf', pdfBase64: 'JVBERi0=', report: { title: 'Financial Report' } });
    expect(res.status).toBe(200);
    const arg = mailer.sendMail.mock.calls[0][0];
    expect(arg.attachments[0].content).toBe('JVBERi0=');
    expect(arg.attachments[0].contentType).toBe('application/pdf');
  });

  test('POST /api/reports/email pdf format without an attachment is rejected', async () => {
    const res = await agent.post('/api/reports/email').send({ to: TO, format: 'pdf', report: {} });
    expect(res.status).toBe(400);
    expect(mailer.sendMail).not.toHaveBeenCalled();
  });

  test('POST /api/admin/smtp/test sends a test email', async () => {
    const res = await agent.post('/api/admin/smtp/test').send({ to: TO });
    expect(res.status).toBe(200);
    expect(mailer.sendMail).toHaveBeenCalledTimes(1);
  });

  test('maintenance alert emails once when usage crosses the threshold', async () => {
    prisma.setting.findUnique.mockResolvedValue({ key: 'maintenance_alert_email', value: TO });
    const startedAt = new Date(Date.now() - 4 * 3600 * 1000);
    prisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ id: 'sess-1', table_id: 'tbl-1', started_at: startedAt }])
      .mockResolvedValueOnce([{ number: 5, used_since_maintenance_seconds: 4 * 3600, max_used_hours: 4 }]);
    prisma.$executeRawUnsafe.mockResolvedValue({});

    const res = await agent.patch('/api/sessions/sess-1/end');
    expect(res.status).toBe(200);
    expect(mailer.sendMail).toHaveBeenCalledTimes(1);
    expect(mailer.sendMail.mock.calls[0][0].to).toBe(TO);
  });

  test('maintenance alert does not fire when the table was already over the threshold', async () => {
    prisma.setting.findUnique.mockResolvedValue({ key: 'maintenance_alert_email', value: TO });
    const startedAt = new Date(Date.now() - 3600 * 1000); // adds ~1h
    prisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ id: 'sess-1', table_id: 'tbl-1', started_at: startedAt }])
      .mockResolvedValueOnce([{ number: 5, used_since_maintenance_seconds: 6 * 3600, max_used_hours: 4 }]);
    prisma.$executeRawUnsafe.mockResolvedValue({});

    const res = await agent.patch('/api/sessions/sess-1/end');
    expect(res.status).toBe(200);
    expect(mailer.sendMail).not.toHaveBeenCalled();
  });
});
