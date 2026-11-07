function createVenueEventRoutes({ prisma, requireAuth }) {
  function parseVenueCalendarMonth(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}$/.test(value)) return null;
    const [year, month] = value.split('-').map(Number);
    if (month < 1 || month > 12) return null;
    return { start: new Date(Date.UTC(year, month - 1, 1)), end: new Date(Date.UTC(year, month, 1)) };
  }

  function parseVenueEventDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
  }

  function normalizeVenueEventInput(body) {
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const description = body?.description == null ? null : typeof body.description === 'string' ? body.description.trim() : false;
    const eventDate = parseVenueEventDate(body?.eventDate);
    const allDay = body?.allDay === true;
    const tableTypeIds = Array.isArray(body?.tableTypeIds) ? [...new Set(body.tableTypeIds.filter((id) => typeof id === 'string').map((id) => id.trim()).filter(Boolean))] : [];
    const startTime = allDay ? null : body?.startTime;
    const endTime = allDay ? null : body?.endTime;
    const validTime = (time) => typeof time === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);

    if (!title || title.length > 120 || description === false || description?.length > 2000 || !eventDate || !tableTypeIds.length) return null;
    if (!allDay && (!validTime(startTime) || !validTime(endTime) || endTime <= startTime)) return null;

    return { title, description: description || null, eventDate, allDay, startTime, endTime, tableTypeIds };
  }

  function venueEventData(input) {
    const { tableTypeIds, ...data } = input;
    return { ...data, tableTypeIdsJson: JSON.stringify(tableTypeIds) };
  }

  function mapVenueEvent(event, tableTypes, locale = 'en') {
    let tableTypeIds = [];
    try {
      const parsed = JSON.parse(event.tableTypeIdsJson);
      if (Array.isArray(parsed)) tableTypeIds = parsed.filter((id) => typeof id === 'string');
    } catch {}
    const tableTypeById = Object.fromEntries(tableTypes.map((type) => [type.id, type]));
    const eventDate = event.eventDate instanceof Date ? event.eventDate.toISOString().slice(0, 10) : String(event.eventDate).slice(0, 10);
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      eventDate,
      allDay: event.allDay,
      startTime: event.startTime,
      endTime: event.endTime,
      tableTypeIds,
      tableTypes: tableTypeIds.map((id) => {
        const type = tableTypeById[id];
        return type ? { id, name: locale === 'fr' ? type.name_fr || type.name_en : type.name_en || type.name_fr } : null;
      }).filter(Boolean),
    };
  }

  async function getVenueEvents(start, end, locale = 'en') {
    const [events, tableTypes] = await Promise.all([
      prisma.venueEvent.findMany({
        where: { eventDate: { gte: start, lt: end } },
        orderBy: [{ eventDate: 'asc' }, { allDay: 'desc' }, { startTime: 'asc' }],
      }),
      prisma.tableType.findMany(),
    ]);
    return events.map((event) => mapVenueEvent(event, tableTypes, locale));
  }

  function registerStaffRoutes(app) {
    app.get('/api/events', requireAuth, async (req, res) => {
      const month = parseVenueCalendarMonth(req.query.month);
      if (!month) return res.status(400).json({ error: 'invalid_month' });
      try {
        res.json(await getVenueEvents(month.start, month.end));
      } catch (e) { console.error(e); res.status(500).json({ error: 'db_error' }); }
    });

    app.post('/api/events', requireAuth, async (req, res) => {
      const input = normalizeVenueEventInput(req.body);
      if (!input) return res.status(400).json({ error: 'invalid_event' });
      try {
        const tableTypes = await prisma.tableType.findMany({ where: { id: { in: input.tableTypeIds } } });
        if (tableTypes.length !== input.tableTypeIds.length) return res.status(400).json({ error: 'invalid_table_types' });
        const event = await prisma.venueEvent.create({
          data: venueEventData(input),
        });
        res.status(201).json(mapVenueEvent(event, tableTypes));
      } catch (e) { console.error(e); res.status(500).json({ error: 'db_error' }); }
    });

    app.put('/api/events/:id', requireAuth, async (req, res) => {
      const input = normalizeVenueEventInput(req.body);
      if (!input) return res.status(400).json({ error: 'invalid_event' });
      try {
        const existing = await prisma.venueEvent.findUnique({ where: { id: req.params.id } });
        if (!existing) return res.status(404).json({ error: 'event_not_found' });
        const tableTypes = await prisma.tableType.findMany({ where: { id: { in: input.tableTypeIds } } });
        if (tableTypes.length !== input.tableTypeIds.length) return res.status(400).json({ error: 'invalid_table_types' });
        const event = await prisma.venueEvent.update({
          where: { id: req.params.id },
          data: venueEventData(input),
        });
        res.json(mapVenueEvent(event, tableTypes));
      } catch (e) { console.error(e); res.status(500).json({ error: 'db_error' }); }
    });

    app.delete('/api/events/:id', requireAuth, async (req, res) => {
      try {
        const result = await prisma.venueEvent.deleteMany({ where: { id: req.params.id } });
        if (!result.count) return res.status(404).json({ error: 'event_not_found' });
        res.status(204).end();
      } catch (e) { console.error(e); res.status(500).json({ error: 'db_error' }); }
    });
  }

  function registerPublicRoutes(app) {
    app.get('/api/public/events', async (req, res) => {
      res.set('Cache-Control', 'no-store');
      const month = parseVenueCalendarMonth(req.query.month);
      if (!month) return res.status(400).json({ error: 'invalid_month' });
      const locale = req.query.lang === 'fr' ? 'fr' : 'en';
      try {
        res.json(await getVenueEvents(month.start, month.end, locale));
      } catch (e) { console.error(e); res.status(500).json({ error: 'db_error' }); }
    });
  }

  return { registerStaffRoutes, registerPublicRoutes };
}

module.exports = { createVenueEventRoutes };
