const { estimateWaitlistEntries } = require('../src/waitlist-estimates');

describe('waitlist wait estimates', () => {
  test('uses a near hourly boundary as the next expected release', () => {
    const now = new Date('2026-01-01T12:55:00.000Z');
    const result = estimateWaitlistEntries({
      now,
      entries: [{ id: 'entry1', tableTypeId: 'type1', createdAt: new Date('2026-01-01T12:40:00.000Z') }],
      tables: [{ id: 'table1', tableTypeId: 'type1', status: 'occupied' }],
      activeSessions: [{ tableId: 'table1', startedAt: new Date('2026-01-01T12:00:00.000Z') }],
      sessionHistory: [{ tableId: 'table1', startedAt: new Date('2026-01-01T08:00:00.000Z'), endedAt: new Date('2026-01-01T10:00:00.000Z') }],
    });

    expect(result.entries[0].expectedWaitMinutes).toBe(5);
    expect(result.entries[0].elapsedMinutes).toBe(15);
    expect(result.averageWaitMinutes).toBe(5);
  });

  test('uses historical session lengths to estimate turnover for queued parties', () => {
    const now = new Date('2026-01-01T12:40:00.000Z');
    const result = estimateWaitlistEntries({
      now,
      entries: [
        { id: 'entry2', tableTypeId: 'type1', createdAt: new Date('2026-01-01T12:20:00.000Z') },
        { id: 'entry1', tableTypeId: 'type1', createdAt: new Date('2026-01-01T12:10:00.000Z') },
      ],
      tables: [{ id: 'table1', tableTypeId: 'type1', status: 'occupied' }],
      activeSessions: [{ tableId: 'table1', startedAt: new Date('2026-01-01T12:00:00.000Z') }],
      sessionHistory: [{ tableId: 'table1', startedAt: new Date('2026-01-01T08:00:00.000Z'), endedAt: new Date('2026-01-01T09:30:00.000Z') }],
    });

    expect(result.entries.map((entry) => entry.id)).toEqual(['entry1', 'entry2']);
    expect(result.entries.map((entry) => entry.expectedWaitMinutes)).toEqual([50, 140]);
    expect(result.entries.map((entry) => entry.position)).toEqual([1, 2]);
  });

  test('returns an unknown ETA when no table of the requested type exists', () => {
    const result = estimateWaitlistEntries({
      entries: [{ id: 'entry1', tableTypeId: 'type1', createdAt: new Date() }],
      tables: [{ id: 'table2', tableTypeId: 'type2', status: 'available' }],
      activeSessions: [],
      sessionHistory: [],
      now: new Date(),
    });

    expect(result.entries[0].expectedWaitMinutes).toBeNull();
    expect(result.averageWaitMinutes).toBeNull();
  });
});
