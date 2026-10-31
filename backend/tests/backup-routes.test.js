const request = require('supertest');
const { setupAuthBypass } = require('./helpers/authBypass');

jest.mock('../src/prismaClient', () => require('./__mocks__/src/prismaClient'));
jest.mock('../src/backup', () => ({
  createBackupService: () => ({
    exportTo: async (res) => {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', 'attachment; filename="test.dump"');
      res.send(Buffer.from('DUMP-BYTES'));
    },
    importFrom: async (buffer) => ({ ok: true, sizeBytes: buffer.length }),
  }),
}));
const prisma = require('../src/prismaClient');
const app = require('../server');

describe('Backup routes', () => {
  const agent = request.agent(app);
  beforeEach(() => {
    jest.resetAllMocks();
    setupAuthBypass(prisma);
  });

  test('GET /api/admin/backup/export streams the dump', async () => {
    const res = await agent.get('/api/admin/backup/export');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/octet-stream');
    expect(res.headers['content-disposition']).toContain('attachment; filename="test.dump"');
    expect(res.body.toString()).toBe('DUMP-BYTES');
  });

  test('POST /api/admin/backup/import accepts a raw archive', async () => {
    const res = await agent
      .post('/api/admin/backup/import')
      .set('Content-Type', 'application/octet-stream')
      .send(Buffer.from('ARCHIVE'));
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.sizeBytes).toBe(7);
  });

  test('POST /api/admin/backup/import rejects empty uploads', async () => {
    const res = await agent
      .post('/api/admin/backup/import')
      .set('Content-Type', 'application/octet-stream')
      .send(Buffer.alloc(0));
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('empty_upload');
  });
});
