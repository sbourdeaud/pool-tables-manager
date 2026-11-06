const request = require('supertest');
const sharp = require('sharp');
const { setupAuthBypass } = require('./helpers/authBypass');

jest.mock('../src/prismaClient', () => ({
  ...require('./__mocks__/src/prismaClient'),
  tableBackgroundImage: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), count: jest.fn(), delete: jest.fn() },
  tableType: { ...require('./__mocks__/src/prismaClient').tableType, findFirst: jest.fn() },
}));
const prisma = require('../src/prismaClient');
const app = require('../server');

describe('TableType CRUD', () => {
  const agent = request.agent(app);

  beforeEach(() => {
    jest.resetAllMocks();
    setupAuthBypass(prisma);
    prisma.$transaction.mockImplementation(async (operation) => operation(prisma));
    prisma.$executeRaw.mockResolvedValue(0);
  });

  test('GET /api/table-types', async () => {
    prisma.tableType.findMany.mockResolvedValue([{ id: 'tt1', name_en: 'Pool', base_hourly_cents: 2500 }]);
    const res = await agent.get('/api/table-types');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /api/table-types', async () => {
    prisma.tableType.create.mockResolvedValue({ id: 'tt2', name_en: 'Snooker', base_hourly_cents: 3000 });
    const res = await agent.post('/api/table-types').send({ name_en: 'Snooker', name_fr: 'Snooker', base_hourly_cents: 3000 });
    expect(res.status).toBe(201);
    expect(res.body.name_en).toBe('Snooker');
  });

  test('POST /api/table-types stores the selected icon', async () => {
    prisma.tableType.create.mockResolvedValue({ id: 'tt3', name_en: 'Carom', icon: 'carom', base_hourly_cents: 3000 });
    const res = await agent.post('/api/table-types').send({ name_en: 'Carom', name_fr: 'Carambole', icon: 'carom', base_hourly_cents: 3000 });
    expect(res.status).toBe(201);
    expect(prisma.tableType.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ icon: 'carom' }),
    }));
  });

  test('POST /api/table-types derives an icon from the name when omitted', async () => {
    prisma.tableType.create.mockResolvedValue({ id: 'tt2', name_en: 'Snooker', icon: 'snooker', base_hourly_cents: 3000 });
    const res = await agent.post('/api/table-types').send({ name_en: 'Snooker', name_fr: 'Snooker', base_hourly_cents: 3000 });
    expect(res.status).toBe(201);
    expect(prisma.tableType.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ icon: 'snooker' }),
    }));
  });

  test('PUT /api/table-types/:id', async () => {
    prisma.tableType.update.mockResolvedValue({ id: 'tt2', name_en: 'Snooker', icon: 'pyramid', base_hourly_cents: 3200 });
    const res = await agent.put('/api/table-types/tt2').send({ name_en: 'Snooker', name_fr: 'Snooker', icon: 'pyramid', base_hourly_cents: 3200 });
    expect(res.status).toBe(200);
    expect(res.body.base_hourly_cents).toBe(3200);
    expect(prisma.tableType.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ icon: 'pyramid' }),
    }));
  });

  test.each(['preset-1', 'preset-2', 'preset-3', 'preset-4', null])('creates and updates background %s', async (background) => {
    prisma.tableType.create.mockImplementation(async ({ data }) => ({ id: 'tt1', ...data }));
    prisma.tableType.update.mockImplementation(async ({ data }) => ({ id: 'tt1', ...data }));
    const created = await agent.post('/api/table-types').send({ name_en: 'Pool', base_hourly_cents: 2500, background });
    const updated = await agent.put('/api/table-types/tt1').send({ background });
    expect(created.status).toBe(201);
    expect(updated.status).toBe(200);
    expect(created.body.background).toBe(background);
    expect(updated.body.background).toBe(background);
    expect(prisma.tableBackgroundImage.findUnique).not.toHaveBeenCalled();
  });

  test('defaults a new background to null and preserves an omitted update', async () => {
    prisma.tableType.create.mockImplementation(async ({ data }) => ({ id: 'tt1', ...data }));
    prisma.tableType.update.mockImplementation(async ({ data }) => ({ id: 'tt1', background: 'preset-3', ...data }));
    const created = await agent.post('/api/table-types').send({ name_en: 'Pool', base_hourly_cents: 2500 });
    const updated = await agent.put('/api/table-types/tt1').send({ name_en: 'Renamed' });
    expect(created.status).toBe(201);
    expect(created.body.background).toBeNull();
    expect(updated.status).toBe(200);
    expect(updated.body.background).toBe('preset-3');
    expect(prisma.tableType.update.mock.calls[0][0].data).not.toHaveProperty('background');
  });

  test.each([0, 1, 70, 99, 100])('creates and updates background opacity %i', async (backgroundOpacity) => {
    prisma.tableType.create.mockImplementation(async ({ data }) => ({ id: 'tt1', ...data }));
    prisma.tableType.update.mockImplementation(async ({ data }) => ({ id: 'tt1', ...data }));
    const created = await agent.post('/api/table-types').send({ name_en: 'Pool', base_hourly_cents: 2500, backgroundOpacity });
    const updated = await agent.put('/api/table-types/tt1').send({ backgroundOpacity });
    expect(created.status).toBe(201);
    expect(updated.status).toBe(200);
    expect(created.body.backgroundOpacity).toBe(backgroundOpacity);
    expect(updated.body.backgroundOpacity).toBe(backgroundOpacity);
  });

  test('defaults opacity on creation and preserves it on an omitted update', async () => {
    prisma.tableType.create.mockImplementation(async ({ data }) => ({ id: 'tt1', ...data }));
    prisma.tableType.update.mockImplementation(async ({ data }) => ({ id: 'tt1', backgroundOpacity: 0, ...data }));
    const created = await agent.post('/api/table-types').send({ name_en: 'Pool', base_hourly_cents: 2500 });
    const updated = await agent.put('/api/table-types/tt1').send({ name_en: 'Renamed' });
    expect(created.status).toBe(201);
    expect(created.body.backgroundOpacity).toBe(70);
    expect(updated.status).toBe(200);
    expect(updated.body.backgroundOpacity).toBe(0);
    expect(prisma.tableType.update.mock.calls[0][0].data).not.toHaveProperty('backgroundOpacity');
  });

  test.each([-1, 101, 1.5, '70', '', null, true, {}, []])('rejects invalid opacity %j on create and update', async (backgroundOpacity) => {
    const created = await agent.post('/api/table-types').send({ name_en: 'Pool', base_hourly_cents: 2500, backgroundOpacity });
    const updated = await agent.put('/api/table-types/tt1').send({ backgroundOpacity });
    expect(created.status).toBe(400);
    expect(updated.status).toBe(400);
    expect(created.body.error).toBe('invalid_background_opacity');
    expect(updated.body.error).toBe('invalid_background_opacity');
    expect(prisma.tableType.create).not.toHaveBeenCalled();
    expect(prisma.tableType.update).not.toHaveBeenCalled();
  });

  test('stores and lists references to an existing uploaded image', async () => {
    const id = '6cbcfbf5-58e7-44d8-a99a-80c1f8fd83fe';
    const background = `upload:${id}`;
    prisma.tableBackgroundImage.findUnique.mockResolvedValue({ id });
    prisma.tableType.create.mockImplementation(async ({ data }) => ({ id: 'tt1', ...data }));
    prisma.tableType.update.mockImplementation(async ({ data }) => ({ id: 'tt1', ...data }));
    prisma.tableType.findMany.mockResolvedValue([{ id: 'tt1', background }]);
    const created = await agent.post('/api/table-types').send({ name_en: 'Pool', base_hourly_cents: 2500, background });
    const updated = await agent.put('/api/table-types/tt1').send({ background });
    const listed = await agent.get('/api/table-types');
    expect(created.status).toBe(201);
    expect(updated.status).toBe(200);
    expect(created.body.background).toBe(background);
    expect(updated.body.background).toBe(background);
    expect(listed.body[0].background).toBe(background);
    expect(prisma.tableBackgroundImage.findUnique).toHaveBeenCalledWith({ where: { id }, select: { id: true } });
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(prisma.$executeRaw).toHaveBeenCalledWith(['LOCK TABLE "TableBackgroundImage" IN EXCLUSIVE MODE']);
    expect(prisma.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(prisma.tableBackgroundImage.findUnique.mock.invocationCallOrder[0]);
    expect(prisma.tableBackgroundImage.findUnique.mock.invocationCallOrder[0]).toBeLessThan(prisma.tableType.create.mock.invocationCallOrder[0]);
    expect(prisma.$executeRaw.mock.invocationCallOrder[1]).toBeLessThan(prisma.tableType.update.mock.invocationCallOrder[0]);
  });

  test.each(['6CBCFBF5-58E7-44D8-A99A-80C1F8FD83FE', '6CbCfbF5-58E7-44d8-A99a-80C1f8FD83Fe'])('normalizes uploaded background UUID %s on create and update', async (inputId) => {
    const id = '6cbcfbf5-58e7-44d8-a99a-80c1f8fd83fe';
    const background = `upload:${id}`;
    prisma.tableBackgroundImage.findUnique.mockResolvedValue({ id });
    prisma.tableType.create.mockImplementation(async ({ data }) => ({ id: 'tt1', ...data }));
    prisma.tableType.update.mockImplementation(async ({ data }) => ({ id: 'tt1', ...data }));
    const created = await agent.post('/api/table-types').send({ name_en: 'Pool', base_hourly_cents: 2500, background: `upload:${inputId}` });
    const updated = await agent.put('/api/table-types/tt1').send({ background: `upload:${inputId}` });
    expect(created.status).toBe(201);
    expect(updated.status).toBe(200);
    expect(created.body.background).toBe(background);
    expect(updated.body.background).toBe(background);
    expect(prisma.tableType.create.mock.calls[0][0].data.background).toBe(background);
    expect(prisma.tableType.update.mock.calls[0][0].data.background).toBe(background);
    expect(prisma.tableBackgroundImage.findUnique).toHaveBeenCalledWith({ where: { id }, select: { id: true } });
  });

  test.each(['preset-0', 'preset-5', '', 'upload:bad-id', 'https://example.com/image.png', 1, false, {}, []])('rejects invalid background %j on create and update', async (background) => {
    const created = await agent.post('/api/table-types').send({ name_en: 'Pool', base_hourly_cents: 2500, background });
    const updated = await agent.put('/api/table-types/tt1').send({ background });
    expect(created.status).toBe(400);
    expect(updated.status).toBe(400);
    expect(created.body.error).toBe('invalid_background');
    expect(updated.body.error).toBe('invalid_background');
    expect(prisma.tableType.create).not.toHaveBeenCalled();
    expect(prisma.tableType.update).not.toHaveBeenCalled();
  });

  test('rejects nonexistent uploaded backgrounds without writing the table type', async () => {
    prisma.tableBackgroundImage.findUnique.mockResolvedValue(null);
    const background = 'upload:6cbcfbf5-58e7-44d8-a99a-80c1f8fd83fe';
    const created = await agent.post('/api/table-types').send({ name_en: 'Pool', base_hourly_cents: 2500, background });
    const updated = await agent.put('/api/table-types/tt1').send({ background });
    expect(created.status).toBe(404);
    expect(updated.status).toBe(404);
    expect(updated.body.error).toBe('background_image_not_found');
    expect(prisma.tableType.create).not.toHaveBeenCalled();
    expect(prisma.tableType.update).not.toHaveBeenCalled();
  });

  test('DELETE /api/table-types/:id when no tables or events exist', async () => {
    prisma.poolTable.count.mockResolvedValue(0);
    prisma.venueEvent.findMany.mockResolvedValue([]);
    prisma.tableType.delete.mockResolvedValue({});
    const res = await agent.delete('/api/table-types/tt2');
    expect([200,204]).toContain(res.status);
  });

  test('DELETE /api/table-types/:id when events use the type returns 409', async () => {
    prisma.poolTable.count.mockResolvedValue(0);
    prisma.venueEvent.findMany.mockResolvedValue([{ tableTypeIdsJson: '["tt2"]' }]);
    const res = await agent.delete('/api/table-types/tt2');
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('has_events');
  });

  test('DELETE /api/table-types/:id when tables exist returns 409', async () => {
    prisma.poolTable.count.mockResolvedValue(2);
    const res = await agent.delete('/api/table-types/tt2');
    expect(res.status).toBe(409);
  });
});

describe('Table background images', () => {
  const id = '6cbcfbf5-58e7-44d8-a99a-80c1f8fd83fe';
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADElEQVQImWP4z8AAAAMBAQCc479ZAAAAAElFTkSuQmCC', 'base64');
  const jpeg = Buffer.from('/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAABgj/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABykX//Z', 'base64');
  const webp = Buffer.from('UklGRjwAAABXRUJQVlA4IDAAAADQAQCdASoBAAEAAUAmJaACdLoB+AADsAD+8ut//NgVzXPv9//S4P0uD9Lg/9KQAAA=', 'base64');

  beforeEach(() => {
    jest.resetAllMocks();
    setupAuthBypass(prisma);
    prisma.$transaction.mockImplementation(async (operation) => operation(prisma));
    prisma.$executeRaw.mockResolvedValue(0);
    prisma.tableBackgroundImage.create.mockImplementation(async ({ data }) => ({ id, ...data }));
    prisma.tableBackgroundImage.count.mockResolvedValue(0);
    prisma.tableBackgroundImage.findUnique.mockResolvedValue({ id });
    prisma.tableBackgroundImage.delete.mockResolvedValue({ id });
    prisma.tableType.findFirst.mockResolvedValue(null);
  });

  test('lists metadata without selecting or returning image bytes or creation dates', async () => {
    prisma.tableBackgroundImage.findMany.mockResolvedValue([{ id, contentType: 'image/png', bytes: png, createdAt: new Date() }]);
    const res = await request(app).get('/api/table-background-images');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id, contentType: 'image/png' }]);
    expect(prisma.tableBackgroundImage.findMany).toHaveBeenCalledWith({ select: { id: true, contentType: true }, orderBy: { createdAt: 'asc' } });
  });

  test.each([['image/png', png], ['image/jpeg', jpeg], ['image/webp', webp]])('decodes a valid one-pixel %s and persists a re-encoded image', async (contentType, bytes) => {
    const original = await sharp(bytes, { failOn: 'warning' }).raw().toBuffer({ resolveWithObject: true });
    expect(original.info).toMatchObject({ width: 1, height: 1, channels: 3 });
    const res = await request(app).post('/api/table-background-images').set('Content-Type', contentType).send(bytes);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id, contentType });
    expect(prisma.tableBackgroundImage.create).toHaveBeenCalledWith({ data: { contentType, bytes: expect.any(Buffer) }, select: { id: true, contentType: true } });
    const stored = prisma.tableBackgroundImage.create.mock.calls[0][0].data.bytes;
    const metadata = await sharp(stored).metadata();
    expect(metadata).toMatchObject({ format: contentType.slice(6), width: 1, height: 1 });
    const decoded = await sharp(stored, { failOn: 'warning' }).raw().toBuffer();
    expect(decoded.length).toBe(3);
    expect(decoded[0]).toBeGreaterThan(240);
    expect(decoded[1]).toBeLessThan(10);
    expect(decoded[2]).toBeLessThan(10);
    expect(prisma.$executeRaw).toHaveBeenCalledWith(['LOCK TABLE "TableBackgroundImage" IN EXCLUSIVE MODE']);
  });

  test.each([['image/png', png], ['image/jpeg', jpeg], ['image/webp', webp]])('strips metadata and trailing payloads from %s', async (contentType, bytes) => {
    const tagged = await sharp(bytes).withExif({ IFD0: { Artist: 'Private uploader', Orientation: '6' } }).toBuffer();
    expect((await sharp(tagged).metadata()).exif).toBeDefined();
    const res = await request(app).post('/api/table-background-images').set('Content-Type', contentType).send(Buffer.concat([tagged, Buffer.from('<script>untrusted</script>')]));
    expect(res.status).toBe(201);
    const stored = prisma.tableBackgroundImage.create.mock.calls[0][0].data.bytes;
    const metadata = await sharp(stored).metadata();
    for (const key of ['exif', 'icc', 'iptc', 'xmp', 'orientation']) expect(metadata[key]).toBeUndefined();
    expect(stored.includes(Buffer.from('Private uploader'))).toBe(false);
    expect(stored.includes(Buffer.from('<script>'))).toBe(false);
    await expect(sharp(stored, { failOn: 'warning' }).raw().toBuffer()).resolves.toHaveLength(3);
  });

  test('normalizes media types and accepts a trailing slash', async () => {
    const res = await request(app).post('/API/TABLE-BACKGROUND-IMAGES/').set('Content-Type', 'image/PNG; charset=binary').send(png);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id, contentType: 'image/png' });
  });

  test('accepts exactly 5 MiB but rejects one byte more without inserting', async () => {
    const exact = Buffer.alloc(5 * 1024 * 1024);
    png.copy(exact);
    const accepted = await request(app).post('/api/table-background-images').set('Content-Type', 'image/png').send(exact);
    expect(accepted.status).toBe(201);
    prisma.tableBackgroundImage.create.mockClear();
    const rejected = await request(app).post('/api/table-background-images').set('Content-Type', 'image/png').send(Buffer.concat([exact, Buffer.alloc(1)]));
    expect(rejected.status).toBe(413);
    expect(rejected.body.error).toBe('image_too_large');
    expect(prisma.tableBackgroundImage.create).not.toHaveBeenCalled();
  });

  test.each(['image/svg+xml', 'text/html', 'image/gif', 'application/octet-stream', 'application/json'])('rejects %s without global JSON parsing', async (contentType) => {
    const res = await request(app).post('/api/table-background-images').set('Content-Type', contentType).send('{not-json <svg><script>alert(1)</script></svg>');
    expect(res.status).toBe(415);
    expect(res.body.error).toBe('unsupported_image_type');
    expect(prisma.tableBackgroundImage.create).not.toHaveBeenCalled();
  });

  test.each(['image/jpeg', 'image/png', 'image/webp'])('rejects SVG, HTML, and empty bodies disguised as %s', async (contentType) => {
    for (const bytes of [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), Buffer.from('<!doctype html><html></html>'), Buffer.alloc(0)]) {
      const res = await request(app).post('/api/table-background-images').set('Content-Type', contentType).send(bytes);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('invalid_image');
    }
    expect(prisma.tableBackgroundImage.create).not.toHaveBeenCalled();
  });

  test.each([['image/png', png.subarray(0, 8)], ['image/jpeg', jpeg.subarray(0, 3)], ['image/webp', webp.subarray(0, 12)], ['image/jpeg', png], ['image/png', webp], ['image/webp', jpeg]])('rejects truncated or mismatched %s headers', async (contentType, bytes) => {
    const res = await request(app).post('/api/table-background-images').set('Content-Type', contentType).send(bytes);
    expect(res.status).toBe(400);
    expect(prisma.tableBackgroundImage.create).not.toHaveBeenCalled();
  });

  test.each([
    ['image/png', png.subarray(0, 33)],
    ['image/jpeg', jpeg.subarray(0, jpeg.indexOf(Buffer.from('ffc0', 'hex')) + 19)],
    ['image/webp', (() => {
      const header = Buffer.from(webp.subarray(0, 30));
      header.writeUInt32LE(header.length - 8, 4);
      header.writeUInt32LE(10, 16);
      return header;
    })()],
  ])('rejects %s truncated after its complete dimension header', async (contentType, bytes) => {
    const res = await request(app).post('/api/table-background-images').set('Content-Type', contentType).send(bytes);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_image');
    expect(prisma.tableBackgroundImage.create).not.toHaveBeenCalled();
  });

  test('rejects corrupt PNG dimensions and WebP container lengths', async () => {
    const invalidPng = Buffer.from(png);
    invalidPng.writeUInt32BE(0, 16);
    const invalidWebp = Buffer.from(webp);
    invalidWebp.writeUInt32LE(0, 4);
    for (const [contentType, bytes] of [['image/png', invalidPng], ['image/webp', invalidWebp]]) {
      const res = await request(app).post('/api/table-background-images').set('Content-Type', contentType).send(bytes);
      expect(res.status).toBe(400);
    }
    expect(prisma.tableBackgroundImage.create).not.toHaveBeenCalled();
  });

  test.each([[8193, 1], [1, 8193], [4097, 4096]])('rejects decoded dimensions %i x %i without inserting', async (width, height) => {
    const bytes = await sharp({ create: { width, height, channels: 3, background: 'red' } }).png().toBuffer();
    expect(bytes.length).toBeLessThan(5 * 1024 * 1024);
    const res = await request(app).post('/api/table-background-images').set('Content-Type', 'image/png').send(bytes);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_image');
    expect(prisma.tableBackgroundImage.create).not.toHaveBeenCalled();
  });

  test.each([[8192, 1], [1, 8192], [4096, 4096]])('accepts bounded decoded dimensions %i x %i', async (width, height) => {
    const bytes = await sharp({ create: { width, height, channels: 3, background: 'red' } }).png().toBuffer();
    const res = await request(app).post('/api/table-background-images').set('Content-Type', 'image/png').send(bytes);
    expect(res.status).toBe(201);
  });

  test('rejects animated WebP rather than validating only its first frame', async () => {
    const frames = await Promise.all(['red', 'blue'].map((background) => sharp({ create: { width: 1, height: 1, channels: 3, background } }).png().toBuffer()));
    const bytes = await sharp(frames, { join: { animated: true } }).webp().toBuffer();
    expect((await sharp(bytes).metadata()).pages).toBe(2);
    const res = await request(app).post('/api/table-background-images').set('Content-Type', 'image/webp').send(bytes);
    expect(res.status).toBe(400);
    expect(prisma.tableBackgroundImage.create).not.toHaveBeenCalled();
  });

  test.each([['image/png', png], ['image/jpeg', jpeg], ['image/webp', webp]])('rejects %s with a missing image-data tail', async (contentType, bytes) => {
    const truncated = bytes.subarray(0, bytes.length - (contentType === 'image/png' ? 24 : 8));
    const res = await request(app).post('/api/table-background-images').set('Content-Type', contentType).send(truncated);
    expect(res.status).toBe(400);
    expect(prisma.tableBackgroundImage.create).not.toHaveBeenCalled();
  });

  test('allows the 32nd image and rejects further uploads without inserting', async () => {
    prisma.tableBackgroundImage.count.mockResolvedValueOnce(31).mockResolvedValue(32);
    expect((await request(app).post('/api/table-background-images').set('Content-Type', 'image/png').send(png)).status).toBe(201);
    prisma.tableBackgroundImage.create.mockClear();
    const res = await request(app).post('/api/table-background-images').set('Content-Type', 'image/png').send(png);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('background_image_limit_reached');
    expect(prisma.tableBackgroundImage.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(prisma.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(prisma.tableBackgroundImage.count.mock.invocationCallOrder[0]);
  });

  test('deletes an unreferenced image and frees an upload slot', async () => {
    let count = 32;
    prisma.tableBackgroundImage.count.mockImplementation(async () => count);
    prisma.tableBackgroundImage.delete.mockImplementation(async () => { count -= 1; return { id }; });
    const deleted = await request(app).delete(`/api/table-background-images/${id}`);
    expect(deleted.status).toBe(204);
    expect(prisma.tableBackgroundImage.delete).toHaveBeenCalledWith({ where: { id } });
    expect(prisma.tableType.findFirst).toHaveBeenCalledWith({ where: { background: { equals: `upload:${id}`, mode: 'insensitive' } }, select: { id: true } });
    expect((await request(app).post('/api/table-background-images').set('Content-Type', 'image/png').send(png)).status).toBe(201);
  });

  test('refuses to delete an image referenced by a table type', async () => {
    prisma.tableType.findFirst.mockResolvedValue({ id: 'tt1' });
    const res = await request(app).delete(`/api/table-background-images/${id.toUpperCase()}`);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('background_image_in_use');
    expect(prisma.tableType.findFirst).toHaveBeenCalledWith({ where: { background: { equals: `upload:${id}`, mode: 'insensitive' } }, select: { id: true } });
    expect(prisma.tableBackgroundImage.delete).not.toHaveBeenCalled();
    expect(prisma.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(prisma.tableType.findFirst.mock.invocationCallOrder[0]);
  });

  test('validates deletion ids and returns 404 for missing images', async () => {
    const invalid = await request(app).delete('/api/table-background-images/not-a-uuid');
    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toBe('invalid_image_id');
    expect(prisma.$transaction).not.toHaveBeenCalled();
    prisma.tableBackgroundImage.findUnique.mockResolvedValue(null);
    const missing = await request(app).delete(`/api/table-background-images/${id}`);
    expect(missing.status).toBe(404);
    expect(missing.body.error).toBe('background_image_not_found');
    expect(prisma.tableBackgroundImage.delete).not.toHaveBeenCalled();
  });

  test('rejects compressed uploads rather than inflating past the byte limit', async () => {
    const res = await request(app).post('/api/table-background-images').set('Content-Type', 'image/png').set('Content-Encoding', 'gzip').send(require('zlib').gzipSync(png));
    expect(res.status).toBe(415);
    expect(prisma.tableBackgroundImage.create).not.toHaveBeenCalled();
  });

  test('protects listing, uploading, and deletion with configured authentication', async () => {
    prisma.setting.findMany.mockResolvedValue([{ key: 'oidc_enabled', value: 'true' }]);
    const listed = await request(app).get('/api/table-background-images');
    const uploaded = await request(app).post('/api/table-background-images').set('Content-Type', 'image/png').send(png);
    const deleted = await request(app).delete(`/api/table-background-images/${id}`);
    expect(listed.status).toBe(401);
    expect(uploaded.status).toBe(401);
    expect(deleted.status).toBe(401);
    expect(prisma.tableBackgroundImage.findMany).not.toHaveBeenCalled();
    expect(prisma.tableBackgroundImage.create).not.toHaveBeenCalled();
    expect(prisma.tableBackgroundImage.delete).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('allows a signed-in admin to upload, list, and delete images', async () => {
    const hash = require('bcryptjs').hashSync('test-password', 4);
    prisma.setting.findMany.mockResolvedValue([{ key: 'local_admin_password_hash', value: hash }]);
    prisma.setting.findUnique.mockResolvedValue({ key: 'local_admin_password_hash', value: hash });
    prisma.tableBackgroundImage.findMany.mockResolvedValue([{ id, contentType: 'image/png' }]);
    const agent = request.agent(app);
    const login = await agent.post('/auth/local/login').send({ username: 'admin', password: 'test-password' });
    expect(login.status).toBe(200);
    expect((await agent.get('/api/table-background-images')).status).toBe(200);
    expect((await agent.post('/api/table-background-images').set('Content-Type', 'image/png').send(png)).status).toBe(201);
    expect((await agent.delete(`/api/table-background-images/${id}`)).status).toBe(204);
  });

  test.each([['image/png', png, 'png'], ['image/jpeg', jpeg, 'jpg'], ['image/webp', webp, 'webp']])('serves %s binary publicly with safe headers', async (contentType, bytes, extension) => {
    prisma.setting.findMany.mockResolvedValue([{ key: 'oidc_enabled', value: 'true' }]);
    prisma.tableBackgroundImage.findUnique.mockResolvedValue({ id, contentType, bytes: new Uint8Array(bytes) });
    const res = await request(app).get(`/api/table-background-images/${id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(bytes);
    expect(res.headers['content-type']).toBe(contentType);
    expect(res.headers['content-length']).toBe(String(bytes.length));
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBe("default-src 'none'; sandbox");
    expect(res.headers['content-disposition']).toBe(`inline; filename="background-${id}.${extension}"`);
    expect(res.headers['cache-control']).toBe('public, no-cache');
    expect(prisma.setting.findMany).not.toHaveBeenCalled();
  });

  test('revalidates cached images and returns 404 after deletion', async () => {
    prisma.tableBackgroundImage.findUnique.mockResolvedValue({ id, contentType: 'image/png', bytes: png });
    const initial = await request(app).get(`/api/table-background-images/${id}`);
    expect(initial.status).toBe(200);
    expect(initial.headers['cache-control']).toBe('public, no-cache');
    expect(initial.headers.etag).toBeDefined();
    const cached = await request(app).get(`/api/table-background-images/${id}`).set('If-None-Match', initial.headers.etag);
    expect(cached.status).toBe(304);
    expect((await request(app).delete(`/api/table-background-images/${id}`)).status).toBe(204);
    prisma.tableBackgroundImage.findUnique.mockResolvedValue(null);
    const missing = await request(app).get(`/api/table-background-images/${id}`).set('If-None-Match', initial.headers.etag);
    expect(missing.status).toBe(404);
    expect(missing.body.error).toBe('background_image_not_found');
  });

  test('returns 400 for invalid ids and 404 for missing images', async () => {
    const invalid = await request(app).get('/api/table-background-images/not-a-uuid');
    expect(invalid.status).toBe(400);
    expect(prisma.tableBackgroundImage.findUnique).not.toHaveBeenCalled();
    prisma.tableBackgroundImage.findUnique.mockResolvedValue(null);
    const missing = await request(app).get(`/api/table-background-images/${id}`);
    expect(missing.status).toBe(404);
    expect(missing.body.error).toBe('background_image_not_found');
  });
});
