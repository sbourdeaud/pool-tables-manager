const express = require('express');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();
const session = require('express-session');
const { Issuer, generators } = require('openid-client');
const bcrypt = require('bcryptjs');
const prisma = require('./src/prismaClient');

const app = express();
app.use(cors());
app.use(express.json());

// Session configuration
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev_secret_change_me';
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Helper: Read OIDC settings from DB
async function getOidcSettings(){
  const rows = await prisma.setting.findMany({ where: { key: { in: ['oidc_enabled','oidc_issuer','oidc_client_id','oidc_client_secret','oidc_scope','oidc_redirect_uri','local_admin_password_hash'] } } });
  const obj = Object.fromEntries(rows.map(r => [r.key, r.value]));
  return obj;
}

async function getSettingValue(key){
  const row = await prisma.setting.findUnique({ where: { key } }).catch(()=>null);
  return row ? row.value : null;
}

// Simple helper to build client (cached)
let _oidcClientCache = null;
async function getOidcClient(){
  const s = await getOidcSettings();
  if(!s || s.oidc_enabled !== 'true') return null;
  if(_oidcClientCache && _oidcClientCache.issuer === s.oidc_issuer) return _oidcClientCache.client;
  const issuer = await Issuer.discover(s.oidc_issuer);
  const client = new issuer.Client({ client_id: s.oidc_client_id, client_secret: s.oidc_client_secret });
  _oidcClientCache = { issuer: s.oidc_issuer, client };
  return client;
}

const PORT = process.env.PORT || 3000;

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// Route for public table view (remains unauthenticated)
app.get('/table:tableNumber', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'table.html'));
});

// Public live table-status board (no authentication, no PIN)
app.get('/status', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'status.html'));
});

// Serve admin and dashboard routes only to authenticated users
app.get('/admin', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Authentication routes (OIDC skeleton)
app.get('/auth/login', async (req, res) => {
  try {
    const client = await getOidcClient();
    if(!client) return res.status(400).send('OIDC not configured');
    const s = await getOidcSettings();
    const redirectUri = s.oidc_redirect_uri || `http://localhost:${PORT}/auth/callback`;
    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);
    req.session.codeVerifier = codeVerifier;
    const url = client.authorizationUrl({
      scope: s.oidc_scope || 'openid profile email',
      redirect_uri: redirectUri,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });
    res.redirect(url);
  } catch (err) {
    console.error('OIDC login error', err);
    res.status(500).send('OIDC login error');
  }
});

app.get('/auth/callback', async (req, res) => {
  try {
    const client = await getOidcClient();
    if(!client) return res.status(400).send('OIDC not configured');
    const params = client.callbackParams(req);
    const s = await getOidcSettings();
    const redirectUri = s.oidc_redirect_uri || `http://localhost:${PORT}/auth/callback`;
    const tokenSet = await client.callback(redirectUri, params, { code_verifier: req.session.codeVerifier });
    const userinfo = await client.userinfo(tokenSet.access_token);
    req.session.user = { tokenSet, userinfo };
    res.redirect('/');
  } catch (err) {
    console.error('OIDC callback error', err);
    res.status(500).send('OIDC callback error');
  }
});

app.get('/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Local auth endpoints
app.get('/api/auth/info', async (req, res) => {
  try{
    const s = await getOidcSettings();
    const oidcEnabled = s.oidc_enabled === 'true';
    const localHash = s.local_admin_password_hash;
    const authenticated = !!(req.session && req.session.user);
    res.json({ oidc_enabled: oidcEnabled, local_admin_setup: !!localHash, authenticated, user: req.session?.user });
  }catch(err){ console.error(err); res.status(500).json({ error: 'internal' }); }
});

// Setup local admin password (only allowed when OIDC is not enabled and no local admin present)
app.post('/api/auth/local-setup', async (req, res) => {
  try{
    const s = await getOidcSettings();
    if(s.oidc_enabled === 'true') return res.status(400).json({ error: 'oidc_enabled' });
    const existing = await getSettingValue('local_admin_password_hash');
    if(existing) return res.status(400).json({ error: 'already_configured' });
    const { password } = req.body;
    if(!password || password.length < 6) return res.status(400).json({ error: 'weak_password' });
    const hash = await bcrypt.hash(password, 10);
    await prisma.setting.upsert({ where: { key: 'local_admin_password_hash' }, update: { value: hash }, create: { key: 'local_admin_password_hash', value: hash } });
    // create admin user entry optionally
    console.log(`[AUDIT] local-setup by ${req.ip} at ${new Date().toISOString()}`);
    res.json({ success: true });
  }catch(err){ console.error(err); res.status(500).json({ error: 'internal' }); }
});

// Local login (username 'admin')
app.post('/auth/local/login', async (req, res) => {
  try{
    const s = await getOidcSettings();
    if(s.oidc_enabled === 'true') return res.status(400).json({ error: 'oidc_enabled' });
    const { username, password } = req.body;
    if(username !== 'admin') return res.status(400).json({ error: 'invalid_user' });
    const hash = await getSettingValue('local_admin_password_hash');
    if(!hash) return res.status(400).json({ error: 'not_configured' });
    const ok = await bcrypt.compare(password, hash);
    if(!ok) return res.status(401).json({ error: 'invalid_credentials' });
    req.session.user = { local: true, username: 'admin' };
    console.log(`[AUDIT] local-login success from ${req.ip} at ${new Date().toISOString()}`);
    res.json({ success: true });
  }catch(err){ console.error(err); res.status(500).json({ error: 'internal' }); }
});

// Rotate local admin password (authenticated via current local admin session)
app.post('/api/auth/local-rotate', requireAuth, async (req, res) => {
  try{
    const { currentPassword, newPassword } = req.body;
    if(!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'weak_password' });
    const hash = await getSettingValue('local_admin_password_hash');
    if(!hash) return res.status(400).json({ error: 'not_configured' });
    const ok = await bcrypt.compare(currentPassword, hash);
    if(!ok) return res.status(401).json({ error: 'invalid_credentials' });
    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.setting.upsert({ where: { key: 'local_admin_password_hash' }, update: { value: newHash }, create: { key: 'local_admin_password_hash', value: newHash } });
    console.log(`[AUDIT] local-rotate by ${req.ip} at ${new Date().toISOString()}`);
    res.json({ success: true });
  }catch(err){ console.error(err); res.status(500).json({ error: 'internal' }); }
});

// Clear local admin (remove password hash) - requires auth
app.delete('/api/auth/local-clear', requireAuth, async (req, res) => {
  try{
    await prisma.setting.deleteMany({ where: { key: 'local_admin_password_hash' } });
    console.log(`[AUDIT] local-clear by ${req.ip} at ${new Date().toISOString()}`);
    res.json({ success: true });
  }catch(err){ console.error(err); res.status(500).json({ error: 'internal' }); }
});

// Middleware to protect admin routes when OIDC is enabled
async function requireAuth(req, res, next){
  try{
    const s = await getOidcSettings();
    const oidcEnabled = s.oidc_enabled === 'true';
    const localHash = s.local_admin_password_hash;

    // If neither OIDC nor local admin is configured, allow through (first-time bootstrap)
    if(!oidcEnabled && !localHash) return next();

    // If OIDC enabled -> require session.user (set by OIDC flow)
    if(oidcEnabled){
      if(req.session && req.session.user) return next();
      return res.status(401).send('Unauthorized');
    }

    // If local admin configured -> require session.user (local auth sets this)
    if(localHash){
      if(req.session && req.session.user) return next();
      return res.status(401).send('Unauthorized');
    }
    return next();
  }catch(err){
    next(err);
  }
}

// Mount protection for admin-prefixed routes
app.use('/api/admin', (req, res, next) => requireAuth(req, res, next));

// --- VAT / anti-fraud helpers -------------------------------------------------
// Prices in this app are stored VAT-included (TTC). Given a TTC total and a VAT
// rate, back out the VAT portion: vat = total - total / (1 + rate/100).
function vatAmountFromTotal(totalCents, ratePercent){
  const rate = Number(ratePercent) || 0;
  if(!totalCents || !rate) return 0;
  const htCents = totalCents / (1 + rate / 100);
  return Math.round(totalCents - htCents);
}

// Identify the logged-in staff member for audit trail purposes (void/correction logs).
function getActorName(req){
  const user = req.session && req.session.user;
  if(!user) return 'unknown';
  if(user.local) return user.username || 'admin';
  if(user.userinfo) return user.userinfo.email || user.userinfo.preferred_username || user.userinfo.name || 'oidc_user';
  return 'unknown';
}

// Soft-void a tab line item instead of hard-deleting it: French anti-fraud law
// (CGI art. 286-I-3 bis / ISCA) requires that recorded sales are never destroyed.
// The row is kept with voidedAt/voidedBy/voidReason set, and all reporting/read
// queries filter it out via `voidedAt: null`.
async function voidTabLineItem(id, actor, reason){
  return prisma.tabLineItem.update({
    where: { id },
    data: { voidedAt: new Date(), voidedBy: actor, voidReason: reason || 'voided' }
  });
}

// Admin OIDC test endpoint
app.get('/api/admin/oidc/test', async (req, res) => {
  try {
    const s = await getOidcSettings();
    if(!s || !s.oidc_issuer) return res.status(400).json({ error: 'oidc_not_configured' });
    const issuer = await Issuer.discover(s.oidc_issuer);
    return res.json({ issuer: issuer.metadata });
  } catch (err) {
    console.error('OIDC test error', err);
    res.status(500).json({ error: 'oidc_test_failed', message: err.message });
  }
});

// Health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// i18n bundles
app.get('/api/i18n/:locale', (req, res) => {
  const loc = req.params.locale === 'fr' ? 'fr' : 'en';
  res.sendFile(path.join(__dirname, 'public', 'i18n', `${loc}.json`));
});

// Settings
app.get('/api/settings', async (req, res) => {
  try {
    const rows = await prisma.setting.findMany();
    const obj = Object.fromEntries(rows.map(r => [r.key, r.value]));
    res.json(obj);
  } catch (e) { console.error(e); res.status(500).json({ error: 'db_error' }); }
});

app.patch('/api/settings', requireAuth, async (req, res) => {
  try {
    const updates = req.body; // { currency: '$' }
    const results = [];
    for (const [key, value] of Object.entries(updates)){
      const up = await prisma.setting.upsert({ where: { key }, update: { value: String(value) }, create: { key, value: String(value) } });
      results.push(up);
    }
    const obj = Object.fromEntries(results.map(r => [r.key, r.value]));
    res.json(obj);
  } catch (e) { console.error(e); res.status(500).json({ error: 'db_error' }); }
});

// Clear all session history (danger zone). Sessions that fall within a closed
// accounting period are preserved (French law requires closed-period sales records
// be retained, not deleted) - only unclosed/test data can be wiped from here.
app.delete('/api/admin/clear-history', async (req, res) => {
  try {
    const closures = await prisma.closurePeriod.findMany({ select: { fromDate: true, toDate: true } });
    const protectedRanges = closures.map(c => `(ended_at >= '${c.fromDate.toISOString()}' AND ended_at <= '${c.toDate.toISOString()}')`);
    const protectionClause = protectedRanges.length ? `AND NOT (${protectedRanges.join(' OR ')})` : '';

    // Delete all tab line items for ended, unprotected sessions
    await prisma.$executeRawUnsafe(`
      DELETE FROM "TabLineItem" 
      WHERE session_id IN (SELECT id FROM "Session" WHERE status = 'ended' ${protectionClause})
    `);
    
    // Delete all ended, unprotected sessions
    const result = await prisma.$executeRawUnsafe(`
      DELETE FROM "Session" WHERE status = 'ended' ${protectionClause}
    `);
    
    res.json({ success: true, message: 'Session history cleared' });
  } catch (e) { 
    console.error(e); 
    res.status(500).json({ error: 'db_error' }); 
  }
});

// Financial Reports
app.get('/api/reports/financial', requireAuth, async (req, res) => {
  try {
    const { periodType, year, month, quarter, date, weekDate } = req.query;
    let startDate, endDate;
    
    if(periodType === 'day'){
      const d = new Date(date);
      startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      endDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    } else if(periodType === 'week'){
      if(!weekDate){
        return res.status(400).json({ error: 'weekDate is required for week reports' });
      }
      const d = new Date(weekDate + 'T00:00:00');
      if(isNaN(d.getTime())){
        return res.status(400).json({ error: 'Invalid weekDate' });
      }
      startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      endDate = new Date(startDate.getTime() + (6 * 24 * 60 * 60 * 1000));
      endDate.setHours(23, 59, 59, 999);
    } else if(periodType === 'month'){
      startDate = new Date(parseInt(year), parseInt(month)-1, 1);
      endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
    } else if(periodType === 'quarter'){
      const q = parseInt(quarter);
      const startMonth = (q-1) * 3;
      startDate = new Date(parseInt(year), startMonth, 1);
      endDate = new Date(parseInt(year), startMonth + 3, 0, 23, 59, 59, 999);
    } else {
      startDate = new Date(parseInt(year), 0, 1);
      endDate = new Date(parseInt(year), 11, 31, 23, 59, 59, 999);
    }
    
    // Get all completed sessions in the period
    const sessions = await prisma.$queryRaw`
      SELECT s.id, s.table_id, s.started_at, s.ended_at, s.number_of_players
      FROM "Session" s
      WHERE s.status = 'ended'
      AND s.ended_at >= ${startDate}
      AND s.ended_at <= ${endDate}
    `;
    
    // Calculate table charges by type
    const byTableType = {};
    let totalTableCharges = 0;
    
    for(const sess of sessions){
      // Get table type
      const tableData = await prisma.$queryRawUnsafe(`
        SELECT tt.name_en, tt.base_hourly_cents
        FROM "PoolTable" pt
        JOIN "TableType" tt ON pt.table_type_id = tt.id
        WHERE pt.id = $1::uuid
      `, sess.table_id);
      const table = Array.isArray(tableData) ? tableData[0] : tableData;
      
      if(table && sess.started_at && sess.ended_at){
        const elapsedMs = new Date(sess.ended_at).getTime() - new Date(sess.started_at).getTime();
        const hoursCharged = Math.ceil(elapsedMs / 3600000);
        
        // Check for subscriber discount
        const subscriberMeta = await prisma.tabLineItem.findFirst({
          where: { sessionId: sess.id, type: 'meta', description: 'subscriber_count' }
        });
        const subscriberCount = subscriberMeta ? subscriberMeta.quantity : 0;
        const nonSubscriberCount = (sess.number_of_players || 1) - subscriberCount;
        
        let tableCharge = 0;
        if(nonSubscriberCount > 0){
          const baseCharge = hoursCharged * table.base_hourly_cents;
          if(subscriberCount > 0){
            const discountSetting = await prisma.setting.findUnique({ where: { key: 'subscriber_discount' } });
            const discountPercent = discountSetting ? parseFloat(discountSetting.value) : 50;
            tableCharge = Math.round(baseCharge * (1 - discountPercent / 100));
          } else {
            tableCharge = baseCharge;
          }
        }
        
        if(!byTableType[table.name_en]) byTableType[table.name_en] = 0;
        byTableType[table.name_en] += tableCharge;
        totalTableCharges += tableCharge;
      }
    }
    
    // Get drinks total from all tab line items in the period
    const sessionIds = sessions.map(s => s.id);
    let drinksTotal = 0;
    
    if(sessionIds.length > 0){
      const items = await prisma.tabLineItem.findMany({
        where: {
          sessionId: { in: sessionIds },
          type: { notIn: ['meta', 'settlement', 'table_settlement'] },
          voidedAt: null
        }
      });
      drinksTotal = items.reduce((sum, item) => sum + (item.totalCents || 0), 0);
    }
    
    // Get subscriptions total (subscriptions that were active during the period)
    const subscriptions = await prisma.subscription.findMany({
      where: {
        active_from: { lte: endDate }
      }
    });
    
    let subscriptionsTotal = 0;
    for(const sub of subscriptions){
      const subStart = new Date(sub.active_from);
      // Count how many months this subscription was active in the period
      if(subStart <= endDate){
        subscriptionsTotal += sub.monthly_fee_cents;
      }
    }
    
    const totalRevenue = totalTableCharges + drinksTotal + subscriptionsTotal;
    
    // For weekly, monthly and quarterly reports, generate time series data
    let timeSeries = null;
    if(periodType === 'week' || periodType === 'month' || periodType === 'quarter'){
      timeSeries = [];
      let numPeriods;
      if(periodType === 'week'){
        numPeriods = 7;
      } else if(periodType === 'month'){
        numPeriods = new Date(parseInt(year), parseInt(month), 0).getDate();
      } else {
        numPeriods = Math.ceil((endDate - startDate) / (7 * 24 * 60 * 60 * 1000));
      }
      
      for(let i = 0; i < numPeriods; i++){
        let periodStart, periodEnd, label;
        
        if(periodType === 'week'){
          // Daily breakdown for week
          periodStart = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
          periodEnd = new Date(periodStart.getTime());
          periodEnd.setHours(23, 59, 59, 999);
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          label = dayNames[periodStart.getDay()];
        } else if(periodType === 'month'){
          // Daily breakdown
          periodStart = new Date(parseInt(year), parseInt(month)-1, i+1, 0, 0, 0, 0);
          periodEnd = new Date(parseInt(year), parseInt(month)-1, i+1, 23, 59, 59, 999);
          label = `${i+1}`;
        } else {
          // Weekly breakdown
          periodStart = new Date(startDate.getTime() + (i * 7 * 24 * 60 * 60 * 1000));
          periodEnd = new Date(Math.min(periodStart.getTime() + (7 * 24 * 60 * 60 * 1000) - 1, endDate.getTime()));
          label = `Week ${i+1}`;
        }
        
        // Get day of week for monthly reports (week reports already have it in label)
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayOfWeek = periodType === 'month' ? dayNames[periodStart.getDay()] : null;
        
        // Get sessions for this period
        const periodSessions = sessions.filter(s => {
          const endedAt = new Date(s.ended_at);
          return endedAt >= periodStart && endedAt <= periodEnd;
        });
        
        let periodTables = 0;
        let periodDrinks = 0;
        let periodSubs = 0;
        
        // Calculate table charges for period
        for(const sess of periodSessions){
          const tableData = await prisma.$queryRawUnsafe(`
            SELECT tt.base_hourly_cents
            FROM "PoolTable" pt
            JOIN "TableType" tt ON pt.table_type_id = tt.id
            WHERE pt.id = $1::uuid
          `, sess.table_id);
          const table = Array.isArray(tableData) ? tableData[0] : tableData;
          
          if(table && sess.started_at && sess.ended_at){
            const elapsedMs = new Date(sess.ended_at).getTime() - new Date(sess.started_at).getTime();
            const hoursCharged = Math.ceil(elapsedMs / 3600000);
            
            const subscriberMeta = await prisma.tabLineItem.findFirst({
              where: { sessionId: sess.id, type: 'meta', description: 'subscriber_count' }
            });
            const subscriberCount = subscriberMeta ? subscriberMeta.quantity : 0;
            const nonSubscriberCount = (sess.number_of_players || 1) - subscriberCount;
            
            if(nonSubscriberCount > 0){
              const baseCharge = hoursCharged * table.base_hourly_cents;
              if(subscriberCount > 0){
                const discountSetting = await prisma.setting.findUnique({ where: { key: 'subscriber_discount' } });
                const discountPercent = discountSetting ? parseFloat(discountSetting.value) : 50;
                periodTables += Math.round(baseCharge * (1 - discountPercent / 100));
              } else {
                periodTables += baseCharge;
              }
            }
          }
        }
        
        // Calculate drinks for period
        const periodSessionIds = periodSessions.map(s => s.id);
        if(periodSessionIds.length > 0){
          const items = await prisma.tabLineItem.findMany({
            where: {
              sessionId: { in: periodSessionIds },
              type: { not: 'meta' },
              voidedAt: null
            }
          });
          periodDrinks = items.reduce((sum, item) => sum + (item.totalCents || 0), 0);
        }
        
        // Subscriptions (distributed evenly across period for simplicity)
        if(subscriptionsTotal > 0){
          periodSubs = Math.round(subscriptionsTotal / numPeriods);
        }
        
        timeSeries.push({
          label,
          dayOfWeek,
          tables: periodTables,
          drinks: periodDrinks,
          subscriptions: periodSubs,
          total: periodTables + periodDrinks + periodSubs
        });
      }
    }
    
    // For monthly reports, calculate day of week analysis
    let dayOfWeekAnalysis = null;
    if(periodType === 'month' && timeSeries){
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayAbbr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayTotals = {};
      
      for(const entry of timeSeries){
        if(entry.dayOfWeek){
          if(!dayTotals[entry.dayOfWeek]){
            dayTotals[entry.dayOfWeek] = { total: 0, count: 0 };
          }
          dayTotals[entry.dayOfWeek].total += entry.total;
          dayTotals[entry.dayOfWeek].count += 1;
        }
      }
      
      dayOfWeekAnalysis = dayAbbr.map((abbr, idx) => ({
        day: dayNames[idx],
        abbr: abbr,
        total: dayTotals[abbr] ? dayTotals[abbr].total : 0,
        count: dayTotals[abbr] ? dayTotals[abbr].count : 0
      })).sort((a, b) => b.total - a.total);
    }
    
    // For daily reports, include detailed charges
    let details = null;
    if(periodType === 'day'){
      details = [];
      for(const sess of sessions){
        const tableData = await prisma.$queryRawUnsafe(`
          SELECT pt.number, tt.name_en
          FROM "PoolTable" pt
          JOIN "TableType" tt ON pt.table_type_id = tt.id
          WHERE pt.id = $1::uuid
        `, sess.table_id);
        const table = Array.isArray(tableData) ? tableData[0] : tableData;
        
        const items = await prisma.tabLineItem.findMany({
          where: { sessionId: sess.id, type: { notIn: ['meta', 'settlement', 'table_settlement'] }, voidedAt: null }
        });
        
        const elapsedMs = new Date(sess.ended_at).getTime() - new Date(sess.started_at).getTime();
        const hoursCharged = Math.ceil(elapsedMs / 3600000);
        
        // Calculate table charge for this session
        const subscriberMeta = await prisma.tabLineItem.findFirst({
          where: { sessionId: sess.id, type: 'meta', description: 'subscriber_count' }
        });
        const subscriberCount = subscriberMeta ? subscriberMeta.quantity : 0;
        const nonSubscriberCount = (sess.number_of_players || 1) - subscriberCount;
        
        let tableCharge = 0;
        if(table && nonSubscriberCount > 0){
          const tableType = await prisma.$queryRawUnsafe(`
            SELECT tt.base_hourly_cents
            FROM "PoolTable" pt
            JOIN "TableType" tt ON pt.table_type_id = tt.id
            WHERE pt.id = $1::uuid
          `, sess.table_id);
          const tt = Array.isArray(tableType) ? tableType[0] : tableType;
          
          if(tt){
            const baseCharge = hoursCharged * tt.base_hourly_cents;
            if(subscriberCount > 0){
              const discountSetting = await prisma.setting.findUnique({ where: { key: 'subscriber_discount' } });
              const discountPercent = discountSetting ? parseFloat(discountSetting.value) : 50;
              tableCharge = Math.round(baseCharge * (1 - discountPercent / 100));
            } else {
              tableCharge = baseCharge;
            }
          }
        }
        
        details.push({
          sessionId: sess.id,
          tableType: table?.name_en || 'Unknown',
          tableNumber: table?.number || '?',
          tableCharge,
          hoursCharged,
          items: items.map(i => ({
            id: i.id,
            description: i.description,
            quantity: i.quantity,
            totalCents: i.totalCents
          }))
        });
      }
    }
    
    res.json({
      totalRevenue,
      byTableType,
      drinksTotal,
      subscriptionsTotal,
      tableChargesTotal: totalTableCharges,
      ...(timeSeries && { timeSeries }),
      ...(dayOfWeekAnalysis && { dayOfWeekAnalysis }),
      ...(details && { details })
    });
  } catch(err){
    console.error(err);
    res.status(500).json({ error: 'db_error' });
  }
});

// Resolve a periodType ('day'|'month'|'quarter'|'year') + query params into a date range,
// along with a stable periodKey used for period-closure locking.
function resolveVatPeriod(query){
  const { periodType, year, month, quarter, date } = query;
  let startDate, endDate, periodKey;
  if(periodType === 'day'){
    const d = new Date(date);
    startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    endDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    periodKey = date;
  } else if(periodType === 'month'){
    startDate = new Date(parseInt(year), parseInt(month)-1, 1);
    endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
    periodKey = `${year}-${String(month).padStart(2,'0')}`;
  } else if(periodType === 'quarter'){
    const q = parseInt(quarter);
    const startMonth = (q-1) * 3;
    startDate = new Date(parseInt(year), startMonth, 1);
    endDate = new Date(parseInt(year), startMonth + 3, 0, 23, 59, 59, 999);
    periodKey = `${year}-Q${q}`;
  } else {
    startDate = new Date(parseInt(year), 0, 1);
    endDate = new Date(parseInt(year), 11, 31, 23, 59, 59, 999);
    periodKey = `${year}`;
  }
  return { startDate, endDate, periodKey };
}

// Aggregate every non-voided tab line item in a date range, grouped by VAT rate.
// Reporting is based on persisted sale records (not a live recomputation) so that
// discounts and corrections are reflected, consistent with the anti-fraud ledger.
async function aggregateVat(startDate, endDate){
  const items = await prisma.tabLineItem.findMany({
    where: { createdAt: { gte: startDate, lte: endDate }, voidedAt: null, type: { not: 'meta' } }
  });

  const byRate = {};
  const byCategory = { table: 0, drinks: 0, discount: 0, other: 0 };
  let grandTotalTtcCents = 0;
  let grandVatCents = 0;

  for(const item of items){
    const rate = item.vatRatePercent != null ? item.vatRatePercent : 20;
    if(!byRate[rate]) byRate[rate] = { totalTtcCents: 0, vatCents: 0, htCents: 0 };
    // Legacy rows (created before VAT snapshotting existed) have vat_rate_percent = null and
    // vat_amount_cents defaulted to 0 by the DB - recompute their VAT live in that case rather
    // than trusting the stored 0, which would understate VAT due.
    const vat = item.vatRatePercent != null ? (item.vatAmountCents || 0) : vatAmountFromTotal(item.totalCents, rate);
    byRate[rate].totalTtcCents += item.totalCents;
    byRate[rate].vatCents += vat;
    byRate[rate].htCents += (item.totalCents - vat);
    grandTotalTtcCents += item.totalCents;
    grandVatCents += vat;

    const cat = item.type === 'table_time' || item.type === 'table_settlement' ? 'table'
      : item.type === 'discount' ? 'discount'
      : (item.type === 'drink' || item.type === 'menu_item') ? 'drinks'
      : 'other';
    byCategory[cat] += item.totalCents;
  }

  return {
    byRate, byCategory,
    grandTotalTtcCents,
    grandVatCents,
    grandHtCents: grandTotalTtcCents - grandVatCents,
    lineCount: items.length,
    items
  };
}

// French VAT (TVA) report for a given period - the figures a business owner needs
// to fill in their CA3/CA12 VAT declaration.
app.get('/api/reports/vat', requireAuth, async (req, res) => {
  try {
    const { startDate, endDate, periodKey } = resolveVatPeriod(req.query);
    const agg = await aggregateVat(startDate, endDate);
    const closure = await prisma.closurePeriod.findUnique({ where: { periodType_periodKey: { periodType: req.query.periodType || 'month', periodKey } } }).catch(()=>null);
    res.json({
      periodKey,
      fromDate: startDate,
      toDate: endDate,
      byRate: agg.byRate,
      byCategory: agg.byCategory,
      grandTotalTtcCents: agg.grandTotalTtcCents,
      grandVatCents: agg.grandVatCents,
      grandHtCents: agg.grandHtCents,
      lineCount: agg.lineCount,
      closed: !!closure,
      closedAt: closure ? closure.closedAt : null
    });
  } catch(err){ console.error(err); res.status(500).json({ error: 'db_error' }); }
});

// CSV export of the detailed VAT ledger for a period (for handing to an accountant)
app.get('/api/reports/vat/export', requireAuth, async (req, res) => {
  try {
    const { startDate, endDate, periodKey } = resolveVatPeriod(req.query);
    const agg = await aggregateVat(startDate, endDate);
    const rows = [['Date','Session ID','Type','Description','Quantity','Unit Price (cents)','Total TTC (cents)','VAT Rate %','VAT (cents)','Total HT (cents)']];
    for(const item of agg.items){
      const rate = item.vatRatePercent != null ? item.vatRatePercent : 20;
      const vat = item.vatRatePercent != null ? (item.vatAmountCents || 0) : vatAmountFromTotal(item.totalCents, rate);
      rows.push([
        new Date(item.createdAt).toISOString(), item.sessionId, item.type, (item.description||'').replace(/,/g,';'),
        item.quantity, item.unitPrice, item.totalCents, rate, vat, item.totalCents - vat
      ]);
    }
    const csv = rows.map(r => r.join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="vat-report-${periodKey}.csv"`);
    res.send(csv);
  } catch(err){ console.error(err); res.status(500).json({ error: 'db_error' }); }
});

// Lock (close) a VAT period once it has been declared/filed. Closed periods can no
// longer have their sales history cleared from the admin "clear history" tool.
app.post('/api/closures', requireAuth, async (req, res) => {
  try {
    const { periodType } = req.body;
    const { startDate, endDate, periodKey } = resolveVatPeriod(req.body);
    const agg = await aggregateVat(startDate, endDate);
    const closure = await prisma.closurePeriod.create({
      data: {
        periodType, periodKey, fromDate: startDate, toDate: endDate,
        totalsJson: JSON.stringify(agg.byRate),
        totalHtCents: agg.grandHtCents, totalVatCents: agg.grandVatCents, totalTtcCents: agg.grandTotalTtcCents,
        closedBy: getActorName(req)
      }
    });
    res.status(201).json(closure);
  } catch(err){
    if(err.code === 'P2002') return res.status(409).json({ error: 'already_closed' });
    console.error(err); res.status(500).json({ error: 'db_error' });
  }
});

app.get('/api/closures', requireAuth, async (req, res) => {
  try {
    const closures = await prisma.closurePeriod.findMany({ orderBy: { closedAt: 'desc' } });
    res.json(closures);
  } catch(err){ console.error(err); res.status(500).json({ error: 'db_error' }); }
});

// Reporting: aggregate totals over period
app.get('/api/reports', requireAuth, async (req, res) => {
  try{
    const { period='monthly', start, scope='overall', table_type_id } = req.query;
    // Determine date_trunc arg
    let trunc = 'month';
    if(period === 'yearly') trunc = 'year';
    if(period === 'quarterly') trunc = 'quarter';
    const startDate = start ? new Date(start) : new Date();
    // Build basic query over TabLineItem totals joined to Session and TableType when needed
    if(scope === 'drinks'){
      const rows = await prisma.$queryRawUnsafe(
        `SELECT date_trunc('${trunc}', s.started_at) as period, sum(tli.total_cents) as total_cents
         FROM "TabLineItem" tli
         JOIN "Session" s ON s.id = tli.session_id
         WHERE tli.type IN ('menu_item','custom_charge') AND s.started_at >= $1
         GROUP BY period ORDER BY period;`,
        startDate
      );
      return res.json(rows);
    }
    if(scope === 'table_type' && table_type_id){
      const rows = await prisma.$queryRawUnsafe(
        `SELECT date_trunc('${trunc}', s.started_at) as period, tp.name_en as table_type, sum(tli.total_cents) as total_cents
         FROM "TabLineItem" tli
         JOIN "Session" s ON s.id = tli.session_id
         JOIN "PoolTable" p ON p.id = s.table_id
         JOIN "TableType" tp ON tp.id = p.table_type_id
         WHERE p.table_type_id::text = $1 AND s.started_at >= $2
         GROUP BY period, tp.name_en ORDER BY period;`,
        table_type_id, startDate
      );
      return res.json(rows);
    }
    // overall
    const rows = await prisma.$queryRawUnsafe(
      `SELECT date_trunc('${trunc}', s.started_at) as period, sum(tli.total_cents) as total_cents
       FROM "TabLineItem" tli
       JOIN "Session" s ON s.id = tli.session_id
       WHERE s.started_at >= $1
       GROUP BY period ORDER BY period;`,
      startDate
    );
    res.json(rows);
  }catch(e){ console.error(e); res.status(500).json({ error: 'db_error' }); }
});

// Ensure camelCase columns exist for Prisma compatibility with the existing snake_case DB
(async function ensureCamelColumns(){
  try{
    await prisma.$executeRawUnsafe(`ALTER TABLE "PoolTable" ADD COLUMN IF NOT EXISTS "tableTypeId" uuid`);
    await prisma.$executeRawUnsafe(`UPDATE "PoolTable" SET "tableTypeId" = table_type_id WHERE "tableTypeId" IS NULL`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PoolTable_tableTypeId_idx" ON "PoolTable" ("tableTypeId")`);

    await prisma.$executeRawUnsafe(`ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "tableId" uuid`);
    await prisma.$executeRawUnsafe(`UPDATE "Session" SET "tableId" = table_id WHERE "tableId" IS NULL`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Session_tableId_idx" ON "Session" ("tableId")`);

    // Reset tables that are occupied but have no active session
    await prisma.$executeRawUnsafe(`
      UPDATE "PoolTable" 
      SET status = 'available' 
      WHERE status = 'occupied' 
      AND id NOT IN (SELECT table_id FROM "Session" WHERE status = 'active')
    `);

    console.log('DB column sync: ensured camelCase columns for Prisma');
  }catch(e){ console.error('DB column sync failed', e); }
})();

app.get('/api/drinks', async (req, res) => {
  const locale = req.query.lang === 'fr' ? 'fr' : 'en';
  try {
    const list = await prisma.drink.findMany({ orderBy: { createdAt: 'asc' } });
    const mapped = list.map(d => ({ id: d.id, name: locale === 'fr' && d.name_fr ? d.name_fr : d.name_en, price_cents: d.price_cents, taxable: d.taxable, vatRatePercent: d.vatRatePercent }));
    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db_error' });
  }
});

app.post('/api/admin/drinks', requireAuth, async (req, res) => {
  const { name_en, name_fr, price_cents, taxable, vatRatePercent } = req.body;
  try {
    const created = await prisma.drink.create({ data: { name_en, name_fr, price_cents, taxable: !!taxable, vatRatePercent: Number(vatRatePercent) || 20 } });
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'db_error' });
  }
});

// Drink management: get single, update, delete
app.get('/api/admin/drinks/:id', requireAuth, async (req, res) => {
  try {
    const d = await prisma.drink.findUnique({ where: { id: req.params.id } });
    if (!d) return res.status(404).json({ error: 'not_found' });
    res.json(d);
  } catch (err) { console.error(err); res.status(500).json({ error: 'db_error' }); }
});

app.put('/api/admin/drinks/:id', requireAuth, async (req, res) => {
  const { name_en, name_fr, price_cents, taxable, vatRatePercent } = req.body;
  try {
    const updated = await prisma.drink.update({ where: { id: req.params.id }, data: { name_en, name_fr, price_cents, taxable: !!taxable, vatRatePercent: Number(vatRatePercent) || 20 } });
    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ error: 'db_error' }); }
});

app.delete('/api/admin/drinks/:id', requireAuth, async (req, res) => {
  try {
    await prisma.drink.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) { console.error(err); res.status(500).json({ error: 'db_error' }); }
});

// Table types and tables
app.get('/api/table-types', requireAuth, async (req, res) => {
  try { const types = await prisma.tableType.findMany({ orderBy: { createdAt: 'asc' } }); res.json(types); } catch (e) { console.error(e); res.status(500).json({ error: 'db_error' }); }
});

app.post('/api/table-types', requireAuth, async (req, res) => {
  const { name_en, name_fr, base_hourly_cents, vatRatePercent } = req.body;
  try { const t = await prisma.tableType.create({ data: { name_en, name_fr, base_hourly_cents, vatRatePercent: Number(vatRatePercent) || 20 } }); res.status(201).json(t); } catch (e) { console.error(e); res.status(500).json({ error: 'db_error' }); }
});

// Update table type
app.put('/api/table-types/:id', requireAuth, async (req, res) => {
  const { name_en, name_fr, base_hourly_cents, vatRatePercent } = req.body;
  try {
    const updated = await prisma.tableType.update({ where: { id: req.params.id }, data: { name_en, name_fr, base_hourly_cents, vatRatePercent: Number(vatRatePercent) || 20 } });
    res.json(updated);
  } catch (e) { console.error(e); res.status(500).json({ error: 'db_error' }); }
});

// Delete table type (only if no tables exist for it)
app.delete('/api/table-types/:id', requireAuth, async (req, res) => {
  try {
    const count = await prisma.poolTable.count({ where: { tableTypeId: req.params.id } });
    if (count > 0) return res.status(409).json({ error: 'has_tables' });
    await prisma.tableType.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) { console.error(e); res.status(500).json({ error: 'db_error' }); }
});

app.get('/api/tables', requireAuth, async (req, res) => {
  try {
    const rows = await prisma.$queryRawUnsafe(`SELECT id, table_type_id, number, status, created_at FROM "PoolTable" ORDER BY created_at ASC`);
    const mapped = rows.map(r => ({ id: r.id, tableTypeId: r.table_type_id, number: r.number, status: r.status, createdAt: r.created_at }));
    res.json(mapped);
  } catch (e) { console.error(e); res.status(500).json({ error: 'db_error' }); }
});

// Bulk create tables
app.post('/api/tables/bulk', requireAuth, async (req, res) => {
  const { tableTypeId, quantity } = req.body;
  console.log('/api/tables/bulk POST body:', req.body);
  if (!tableTypeId) return res.status(400).json({ error: 'missing_tableTypeId' });
  const qty = parseInt(quantity || 1, 10);
  if (qty < 1 || qty > 50) return res.status(400).json({ error: 'invalid_quantity', message: 'Quantity must be between 1 and 50' });
  
  try {
    const created = [];
    // Get the highest table number
    const maxNum = await prisma.$queryRawUnsafe(`SELECT COALESCE(MAX(number), 0) as max FROM "PoolTable"`);
    let nextNumber = (Array.isArray(maxNum) ? maxNum[0].max : maxNum.max) + 1;
    
    // Create tables sequentially
    for (let i = 0; i < qty; i++) {
      const tableId = crypto.randomUUID();
      const result = await prisma.$queryRawUnsafe(
        `INSERT INTO "PoolTable" (id, table_type_id, number, status, created_at) VALUES ($1::uuid, $2::uuid, $3, 'available', now()) RETURNING id, table_type_id, number, status, created_at`,
        tableId, tableTypeId, nextNumber + i
      );
      const r = Array.isArray(result) ? result[0] : result;
      created.push({ id: r.id, tableTypeId: r.table_type_id, number: r.number, status: r.status, createdAt: r.created_at });
    }
    
    res.status(201).json({ tables: created, count: created.length });
  } catch (e) {
    console.error('Failed creating tables (bulk):', e);
    res.status(500).json({ error: 'db_error', message: e.message });
  }
});

app.post('/api/tables', requireAuth, async (req, res) => {
  const { tableTypeId } = req.body;
  console.log('/api/tables POST body:', req.body);
  if (!tableTypeId) return res.status(400).json({ error: 'missing_tableTypeId' });
  try {
    // Get the highest table number across all types and add 1
    const maxNum = await prisma.$queryRawUnsafe(`SELECT COALESCE(MAX(number), 0) as max FROM "PoolTable"`);
    const nextNumber = (Array.isArray(maxNum) ? maxNum[0].max : maxNum.max) + 1;
    
    const tableId = crypto.randomUUID();
    const created = await prisma.$queryRawUnsafe(`INSERT INTO "PoolTable" (id, table_type_id, number, status, created_at) VALUES ($1::uuid, $2::uuid, $3, 'available', now()) RETURNING id, table_type_id, number, status, created_at`, tableId, tableTypeId, nextNumber);
    const r = Array.isArray(created) ? created[0] : created;
    res.status(201).json({ id: r.id, tableTypeId: r.table_type_id, number: r.number, status: r.status, createdAt: r.created_at });
  } catch (e) {
    console.error('Failed creating table (raw):', e);
    res.status(500).json({ error: 'db_error', message: e.message });
  }
});

// Update table (number or status)
app.put('/api/tables/:id', requireAuth, async (req, res) => {
  try {
    console.log('[PUT /api/tables/:id] Request body:', req.body);
    console.log('[PUT /api/tables/:id] Table ID:', req.params.id);
    const { number, status, tableTypeId } = req.body;
    const updates = [];
    const params = [];
    if (typeof number !== 'undefined') { params.push(number); updates.push(`number = $${params.length}`); }
    if (typeof status !== 'undefined') { params.push(status); updates.push(`status = $${params.length}`); }
    if (typeof tableTypeId !== 'undefined') { params.push(tableTypeId); updates.push(`table_type_id = $${params.length}::uuid`); }
    if (updates.length === 0) return res.status(400).json({ error: 'no_updates' });
    params.push(req.params.id);
    const sql = `UPDATE "PoolTable" SET ${updates.join(', ')} WHERE id::text = $${params.length} RETURNING id, table_type_id, number, status, created_at`;
    console.log('[PUT /api/tables/:id] SQL:', sql);
    console.log('[PUT /api/tables/:id] Params:', params);
    const out = await prisma.$queryRawUnsafe(sql, ...params);
    const r = Array.isArray(out) ? out[0] : out;
    console.log('[PUT /api/tables/:id] Result:', r);
    res.json({ id: r.id, tableTypeId: r.table_type_id, number: r.number, status: r.status, createdAt: r.created_at });
  } catch (e) { console.error('[PUT /api/tables/:id] Error:', e); res.status(500).json({ error: 'db_error' }); }
});

// Delete table
app.delete('/api/tables/:id', requireAuth, async (req, res) => {
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "PoolTable" WHERE id::text = $1`, req.params.id);
    res.status(204).end();
  } catch (e) { console.error(e); res.status(500).json({ error: 'db_error' }); }
});

// Sessions: start, end
app.post('/api/sessions', requireAuth, async (req, res) => {
  const { tableId, patronId, numberOfPlayers, subscriberCount } = req.body;
  try {
    // Generate 4-digit PIN
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    
    // mark table occupied and create session in transaction using raw SQL (snake_case DB)
    const result = await prisma.$transaction(async (tx) => {
      const tbl = await tx.$queryRawUnsafe(`SELECT id, table_type_id, number, status FROM "PoolTable" WHERE id::text = $1 FOR UPDATE`, tableId);
      const table = Array.isArray(tbl) ? tbl[0] : tbl;
      if (!table) throw new Error('table_not_found');
      if (table.status === 'occupied') throw new Error('table_unavailable');
      await tx.$executeRawUnsafe(`UPDATE "PoolTable" SET status = 'occupied' WHERE id::text = $1`, tableId);
      const sessionId = crypto.randomUUID();
      const sess = await tx.$queryRawUnsafe(`INSERT INTO "Session" (id, table_id, patron_id, number_of_players, pin, started_at, status, created_at) VALUES ($1::uuid, $2::uuid, $3, $4, $5, now(), 'active', now()) RETURNING id, table_id, patron_id, started_at, ended_at, status, created_at, number_of_players, pin`, sessionId, tableId, patronId, numberOfPlayers || 1, pin);
      const s = Array.isArray(sess) ? sess[0] : sess;
      
      // Store subscriber count as a session note or in a custom field (for now, store as tab line item with type 'meta')
      if(subscriberCount && subscriberCount > 0){
        await tx.$executeRawUnsafe(`INSERT INTO "TabLineItem" (id, session_id, type, description, quantity, unit_price, total_cents, created_at) VALUES ($1::uuid, $2::uuid, 'meta', 'subscriber_count', $3, 0, 0, now())`, crypto.randomUUID(), s.id, subscriberCount);
      }
      
      // Map snake_case DB fields to camelCase for frontend
      return { 
        id: s.id, 
        tableId: s.table_id, 
        patronId: s.patron_id, 
        startedAt: s.started_at, 
        endedAt: s.ended_at, 
        status: s.status, 
        createdAt: s.created_at, 
        numberOfPlayers: s.number_of_players, 
        pin: s.pin 
      };
    });
    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    if (err.message === 'table_unavailable') return res.status(409).json({ error: 'table_unavailable' });
    res.status(500).json({ error: 'db_error' });
  }
});

app.patch('/api/sessions/:id/end', requireAuth, async (req, res) => {
  try {
    // end session and free table using raw SQL
    const out = await prisma.$queryRawUnsafe(`UPDATE "Session" SET ended_at = now(), status = 'ended' WHERE id::text = $1 RETURNING id, table_id`, req.params.id);
    const row = Array.isArray(out) ? out[0] : out;
    if(!row) return res.status(404).json({ error: 'not_found' });
    await prisma.$executeRawUnsafe(`UPDATE "PoolTable" SET status = 'available' WHERE id::text = $1`, row.table_id);
    res.json({ id: row.id });
  } catch (err) { console.error(err); res.status(500).json({ error: 'db_error' }); }
});

// Compute the live table-time charge (and the table type's VAT rate) for an active session
async function getTableChargeForSession(session){
  const tableRows = await prisma.$queryRawUnsafe(`
    SELECT tt.base_hourly_cents, tt.vat_rate_percent
    FROM "PoolTable" p JOIN "TableType" tt ON tt.id = p.table_type_id
    WHERE p.id::text = $1
  `, session.tableId);
  const table = Array.isArray(tableRows) ? tableRows[0] : tableRows;
  if(!table || !session.startedAt) return { tableCharge: 0, hoursCharged: 0, vatRatePercent: 20 };

  const items = await prisma.tabLineItem.findMany({ where: { sessionId: session.id, voidedAt: null } });
  const subscriberMeta = items.find(i => i.type === 'meta' && i.description === 'subscriber_count');
  const subscriberCount = subscriberMeta ? subscriberMeta.quantity : 0;
  const nonSubscriberCount = (session.numberOfPlayers || 1) - subscriberCount;
  const tableSettlements = items.filter(i => i.type === 'table_settlement').reduce((sum,i)=>sum + (i.totalCents || 0), 0);

  const elapsedMs = Date.now() - new Date(session.startedAt).getTime();
  const hoursCharged = Math.ceil(elapsedMs / 3600000);
  let tableCharge = 0;
  if(nonSubscriberCount > 0){
    const baseCharge = hoursCharged * table.base_hourly_cents;
    if(subscriberCount > 0){
      const discountSetting = await prisma.setting.findUnique({ where: { key: 'subscriber_discount' } });
      const discountPercent = discountSetting ? parseFloat(discountSetting.value) : 50;
      tableCharge = Math.round(baseCharge * (1 - discountPercent / 100));
    } else {
      tableCharge = baseCharge;
    }
    tableCharge += tableSettlements;
  }
  return { tableCharge, hoursCharged, vatRatePercent: table.vat_rate_percent != null ? table.vat_rate_percent : 20 };
}

// Checkout: finalize and pay out a session. Persists the final table-time charge and
// any discount as durable, VAT-tagged tab line items, issues a sequentially numbered
// receipt (required for French anti-fraud compliance), then ends the session.
app.post('/api/sessions/:id/checkout', requireAuth, async (req, res) => {
  try {
    const session = await prisma.session.findUnique({ where: { id: req.params.id } });
    if(!session) return res.status(404).json({ error: 'not_found' });
    if(session.status !== 'active') return res.status(409).json({ error: 'session_not_active' });

    const discountCentsRequested = Math.max(0, Math.round(Number(req.body.discountCents) || 0));

    const { tableCharge, vatRatePercent: tableVatRate } = await getTableChargeForSession(session);
    const saleItems = await prisma.tabLineItem.findMany({
      where: { sessionId: session.id, voidedAt: null, type: { notIn: ['meta', 'table_settlement', 'settlement'] } }
    });

    // Group every amount due (table time + drinks/other charges) by VAT rate bucket
    const buckets = {}; // rate -> { totalCents, vatCents }
    const addToBucket = (rate, cents) => {
      const r = rate != null ? rate : 20;
      if(!buckets[r]) buckets[r] = { totalCents: 0 };
      buckets[r].totalCents += cents;
    };
    if(tableCharge > 0) addToBucket(tableVatRate, tableCharge);
    for(const item of saleItems) addToBucket(item.vatRatePercent, item.totalCents);

    const grossTotalCents = Object.values(buckets).reduce((s,b)=>s+b.totalCents, 0);
    const discountCents = Math.min(discountCentsRequested, grossTotalCents);

    const receiptItems = saleItems.map(i => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, totalCents: i.totalCents, vatRatePercent: i.vatRatePercent }));
    if(tableCharge > 0) receiptItems.unshift({ description: 'Table Time', quantity: 1, unitPrice: tableCharge, totalCents: tableCharge, vatRatePercent: tableVatRate });

    const result = await prisma.$transaction(async (tx) => {
      // Persist the table-time charge as a durable, VAT-tagged sale record
      if(tableCharge > 0){
        await tx.tabLineItem.create({ data: {
          sessionId: session.id, type: 'table_time', description: 'Table Time',
          quantity: 1, unitPrice: tableCharge, totalCents: tableCharge,
          vatRatePercent: tableVatRate, vatAmountCents: vatAmountFromTotal(tableCharge, tableVatRate)
        }});
      }

      // VAT due on the gross sale (before discount), and the discount split
      // proportionally across VAT-rate buckets so each discount line keeps a
      // well-defined rate (persisted as negative line items).
      const rates = Object.keys(buckets);
      let vatCents = 0;
      let allocated = 0;
      for(let idx = 0; idx < rates.length; idx++){
        const rate = rates[idx];
        const bucket = buckets[rate];
        vatCents += vatAmountFromTotal(bucket.totalCents, Number(rate));

        if(discountCents <= 0) continue;
        const isLast = idx === rates.length - 1;
        const share = isLast ? (discountCents - allocated) : Math.round(discountCents * (bucket.totalCents / grossTotalCents));
        allocated += share;
        if(share > 0){
          vatCents -= vatAmountFromTotal(share, Number(rate));
          await tx.tabLineItem.create({ data: {
            sessionId: session.id, type: 'discount', description: 'Checkout discount',
            quantity: 1, unitPrice: -share, totalCents: -share,
            vatRatePercent: Number(rate), vatAmountCents: -vatAmountFromTotal(share, Number(rate))
          }});
        }
      }

      const totalTtcCents = grossTotalCents - discountCents;
      const subtotalHtCents = totalTtcCents - vatCents;

      // Sequential receipt number per year (advisory lock avoids race conditions on the sequence)
      const year = new Date().getFullYear();
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext('receipt_seq_' || $1::text))`, String(year));
      const maxRow = await tx.$queryRawUnsafe(`SELECT COALESCE(MAX(number), 0) + 1 as next FROM "Receipt" WHERE year = $1`, year);
      const nextNumber = Array.isArray(maxRow) ? Number(maxRow[0].next) : Number(maxRow.next);

      const receipt = await tx.receipt.create({ data: {
        number: nextNumber, year, sessionId: session.id,
        itemsJson: JSON.stringify(receiptItems),
        subtotalHtCents, vatCents, totalTtcCents, discountCents
      }});

      await tx.$executeRawUnsafe(`UPDATE "Session" SET ended_at = now(), status = 'ended' WHERE id::text = $1`, session.id);
      await tx.$executeRawUnsafe(`UPDATE "PoolTable" SET status = 'available' WHERE id::text = $1`, session.tableId);

      return receipt;
    });

    res.json({ receiptNumber: result.number, year: result.year, totalTtcCents: result.totalTtcCents, vatCents: result.vatCents, discountCents: result.discountCents });
  } catch (err) { console.error(err); res.status(500).json({ error: 'checkout_failed' }); }
});

// Update session (e.g., player count)
app.patch('/api/sessions/:id', requireAuth, async (req, res) => {
  try {
    const { numberOfPlayers } = req.body;
    if (typeof numberOfPlayers !== 'undefined') {
      const out = await prisma.$queryRawUnsafe(`UPDATE "Session" SET number_of_players = $1 WHERE id::text = $2 RETURNING id, table_id, patron_id, started_at, ended_at, status, created_at, number_of_players`, numberOfPlayers, req.params.id);
      const row = Array.isArray(out) ? out[0] : out;
      if (!row) return res.status(404).json({ error: 'not_found' });
      res.json({ id: row.id, tableId: row.table_id, patronId: row.patron_id, startedAt: row.started_at, endedAt: row.ended_at, status: row.status, createdAt: row.created_at, numberOfPlayers: row.number_of_players });
    } else {
      res.status(400).json({ error: 'no_updates' });
    }
  } catch (err) { console.error(err); res.status(500).json({ error: 'db_error' }); }
});

// Session partial settlement (when player leaves mid-session)
app.post('/api/sessions/:id/settle', requireAuth, async (req, res) => {
  try {
    const { tableSettlementCents, items, isSubscriber } = req.body;
    const sessionId = req.params.id;
    const actor = getActorName(req);

    // If table settlement amount is provided, add a negative line item for it,
    // snapshotting the table type's current VAT rate.
    if (tableSettlementCents && tableSettlementCents > 0) {
      const sessionRow = await prisma.session.findUnique({ where: { id: sessionId } });
      let tableVatRate = 20;
      if(sessionRow){
        const tableTypeRows = await prisma.$queryRawUnsafe(`
          SELECT tt.vat_rate_percent FROM "PoolTable" p JOIN "TableType" tt ON tt.id = p.table_type_id WHERE p.id::text = $1
        `, sessionRow.tableId);
        const tt = Array.isArray(tableTypeRows) ? tableTypeRows[0] : tableTypeRows;
        if(tt && tt.vat_rate_percent != null) tableVatRate = tt.vat_rate_percent;
      }
      await prisma.$queryRawUnsafe(
        `INSERT INTO "TabLineItem" (id, session_id, type, description, quantity, unit_price, total_cents, vat_rate_percent, vat_amount_cents, created_at) 
         VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        crypto.randomUUID(),
        sessionId,
        'table_settlement',
        'Table charge settlement',
        1,
        -tableSettlementCents,
        -tableSettlementCents,
        tableVatRate,
        -vatAmountFromTotal(tableSettlementCents, tableVatRate)
      );
    }
    
    // Update subscriber count if settling player is a subscriber (metadata only, not a sale record)
    if(isSubscriber){
      const subscriberMeta = await prisma.tabLineItem.findFirst({
        where: { sessionId, type: 'meta', description: 'subscriber_count' }
      });
      
      if(subscriberMeta){
        const newSubscriberCount = Math.max(0, subscriberMeta.quantity - 1);
        if(newSubscriberCount > 0){
          await prisma.tabLineItem.update({
            where: { id: subscriberMeta.id },
            data: { quantity: newSubscriberCount }
          });
        } else {
          await prisma.tabLineItem.delete({ where: { id: subscriberMeta.id } });
        }
      }
    }
    
    // For each selected drink item with quantity, settle part (or all) of it.
    // The original sale row is never deleted/overwritten: it is voided and, if a
    // partial quantity remains, a replacement row is inserted for the remainder.
    if (Array.isArray(items) && items.length > 0) {
      for (const settlementItem of items) {
        const { itemId, quantity } = settlementItem;
        const settleQty = Number(quantity) || 0;
        
        if(settleQty <= 0) continue;
        
        const item = await prisma.tabLineItem.findUnique({ where: { id: itemId } });
        
        if (item && item.sessionId === sessionId && !item.voidedAt && settleQty <= item.quantity) {
          const settledAmount = Math.round(item.unitPrice * settleQty);
          const rate = item.vatRatePercent != null ? item.vatRatePercent : 20;
          
          // Add negative line item to record this settlement
          await prisma.tabLineItem.create({
            data: {
              sessionId,
              type: 'settlement',
              description: `Settlement: ${item.description}`,
              quantity: -settleQty,
              unitPrice: item.unitPrice,
              totalCents: -settledAmount,
              vatRatePercent: rate,
              vatAmountCents: -vatAmountFromTotal(settledAmount, rate)
            }
          });
          
          // Void the original item, replacing it with the remaining quantity (if any)
          await voidTabLineItem(item.id, actor, 'settled (partial payment)');
          const remainingQty = item.quantity - settleQty;
          if(remainingQty > 0){
            const remainingTotal = Math.round(item.unitPrice * remainingQty);
            await prisma.tabLineItem.create({
              data: {
                sessionId,
                type: item.type,
                description: item.description,
                quantity: remainingQty,
                unitPrice: item.unitPrice,
                totalCents: remainingTotal,
                vatRatePercent: rate,
                vatAmountCents: vatAmountFromTotal(remainingTotal, rate),
                correctedFromId: item.id
              }
            });
          }
        }
      }
    }
    
    res.json({ success: true });
  } catch (err) { 
    console.error(err); 
    res.status(500).json({ error: 'settlement_failed' }); 
  }
});

// Session detail including tab items and totals
app.get('/api/sessions/:id', async (req, res) => {
  try {
    const s = await prisma.session.findUnique({ where: { id: req.params.id } });
    if(!s) return res.status(404).json({ error: 'not_found' });
    const items = await prisma.tabLineItem.findMany({ where: { sessionId: req.params.id, voidedAt: null } });
    
    // Check for subscriber count meta item
    const subscriberMeta = items.find(i => i.type === 'meta' && i.description === 'subscriber_count');
    const subscriberCount = subscriberMeta ? subscriberMeta.quantity : 0;
    const nonSubscriberCount = (s.numberOfPlayers || 1) - subscriberCount;
    
    // Calculate items total (exclude meta, table_settlement, and settlement items)
    // Settlement items are already reflected in the reduced quantities of original items
    const itemsTotal = items.filter(i => i.type !== 'meta' && i.type !== 'table_settlement' && i.type !== 'settlement').reduce((sum,i)=>sum + (i.totalCents || 0), 0);
    
    // Calculate total table charge settlements
    const tableSettlements = items.filter(i => i.type === 'table_settlement').reduce((sum,i)=>sum + (i.totalCents || 0), 0);
    
    // Calculate table charge with subscriber discount
    let tableCharge = 0;
    if(s.startedAt && s.status === 'active'){
      const tableRows = await prisma.$queryRawUnsafe(`
        SELECT p.id, tt.base_hourly_cents 
        FROM "PoolTable" p 
        JOIN "TableType" tt ON tt.id = p.table_type_id 
        WHERE p.id::text = $1
      `, s.tableId);
      const table = Array.isArray(tableRows) ? tableRows[0] : tableRows;
      if(table && table.base_hourly_cents){
        const elapsedMs = Date.now() - new Date(s.startedAt).getTime();
        const hoursCharged = Math.ceil(elapsedMs / 3600000);
        
        // Get subscriber discount setting
        const discountSetting = await prisma.setting.findUnique({ where: { key: 'subscriber_discount' } });
        const discountPercent = discountSetting ? parseFloat(discountSetting.value) : 50;
        
        // Subscribers pay 0, non-subscribers get discount if playing with subscribers
        if(nonSubscriberCount > 0){
          const baseCharge = hoursCharged * table.base_hourly_cents;
          if(subscriberCount > 0){
            // Apply discount for non-subscribers playing with subscribers
            tableCharge = Math.round(baseCharge * (1 - discountPercent / 100));
          } else {
            // No subscribers, full charge
            tableCharge = baseCharge;
          }
        }
        // If all subscribers, tableCharge remains 0
      }
    }
    
    // Apply settlements to table charge only if there are non-subscribers remaining
    // If only subscribers remain, table charge is 0 regardless of previous settlements
    console.log('[Session Detail] Session ID:', req.params.id);
    console.log('[Session Detail] Player count:', s.numberOfPlayers);
    console.log('[Session Detail] Subscriber count:', subscriberCount);
    console.log('[Session Detail] Non-subscriber count:', nonSubscriberCount);
    console.log('[Session Detail] Calculated table charge (before settlements):', tableCharge);
    console.log('[Session Detail] Table settlements:', tableSettlements);
    console.log('[Session Detail] Items total:', itemsTotal);
    
    if(nonSubscriberCount > 0){
      tableCharge = tableCharge + tableSettlements;
      console.log('[Session Detail] Applied settlements, new table charge:', tableCharge);
    } else {
      console.log('[Session Detail] Only subscribers remain, ignoring settlements, keeping tableCharge at:', tableCharge);
    }
    
    const total = itemsTotal + tableCharge;
    console.log('[Session Detail] Final table charge:', tableCharge);
    console.log('[Session Detail] Grand total:', total);
    console.log('[Session Detail] Returning: { totalCents:', total, ', itemsTotal:', itemsTotal, ', tableCharge:', tableCharge, ', subscriberCount:', subscriberCount, '}');
    
    res.json({ session: s, items: items.filter(i => i.type !== 'meta' && i.type !== 'table_settlement' && i.type !== 'settlement'), totalCents: total, itemsTotal, tableCharge, subscriberCount });
  } catch (e) { console.error(e); res.status(500).json({ error: 'db_error' }); }
});

// Add tab line item (menu item or custom)
app.post('/api/sessions/:id/items', requireAuth, async (req, res) => {
  try{
    const { type, description, quantity, unitPrice, vatRatePercent } = req.body; // unitPrice in cents
    const qty = Number(quantity) || 1;
    const totalCents = Math.round((Number(unitPrice)||0)*qty);
    const rate = Number(vatRatePercent) || 20;
    const item = await prisma.tabLineItem.create({ data: { sessionId: req.params.id, type: type||'custom', description, quantity: qty, unitPrice: Number(unitPrice)||0, totalCents, vatRatePercent: rate, vatAmountCents: vatAmountFromTotal(totalCents, rate) } });
    res.status(201).json(item);
  }catch(e){ console.error(e); res.status(500).json({ error: 'db_error' }); }
});

// Delete (void) tab line item - kept for audit trail, never hard-deleted
app.delete('/api/sessions/:sessionId/items/:itemId', requireAuth, async (req, res) => {
  try{
    await voidTabLineItem(req.params.itemId, getActorName(req), req.query.reason || 'removed by staff');
    res.status(204).end();
  }catch(e){ console.error(e); res.status(500).json({ error: 'db_error' }); }
});

// Edit tab line item amount: the original row is voided and a replacement row is
// inserted linked via correctedFromId, preserving a full audit trail of corrections.
app.patch('/api/tab-items/:id', requireAuth, async (req, res) => {
  try{
    const { totalCents } = req.body;
    const original = await prisma.tabLineItem.findUnique({ where: { id: req.params.id } });
    if(!original) return res.status(404).json({ error: 'not_found' });
    const actor = getActorName(req);
    await voidTabLineItem(original.id, actor, 'corrected: amount changed');
    const newTotal = Number(totalCents);
    const rate = original.vatRatePercent != null ? original.vatRatePercent : 20;
    const updated = await prisma.tabLineItem.create({
      data: {
        sessionId: original.sessionId,
        type: original.type,
        description: original.description,
        quantity: original.quantity,
        unitPrice: original.unitPrice,
        totalCents: newTotal,
        vatRatePercent: rate,
        vatAmountCents: vatAmountFromTotal(newTotal, rate),
        correctedFromId: original.id
      }
    });
    res.json(updated);
  }catch(e){ console.error(e); res.status(500).json({ error: 'db_error' }); }
});

// Delete (void) tab line item (alternative endpoint) - kept for audit trail
app.delete('/api/tab-items/:id', requireAuth, async (req, res) => {
  try{
    await voidTabLineItem(req.params.id, getActorName(req), req.query.reason || 'removed by staff');
    res.status(204).end();
  }catch(e){ console.error(e); res.status(500).json({ error: 'db_error' }); }
});

// Switch table for an active session
app.post('/api/sessions/:id/switch', async (req, res) => {
  try{
    const { newTableId } = req.body;
    const sessionId = req.params.id;
    
    const result = await prisma.$transaction(async (tx)=>{
      // Get current session to know old table
      const currentSession = await tx.$queryRawUnsafe(`SELECT id, table_id FROM "Session" WHERE id = $1::uuid`, sessionId);
      const sess = Array.isArray(currentSession) ? currentSession[0] : currentSession;
      if(!sess) throw new Error('session_not_found');
      const oldTableId = sess.table_id;
      
      // Check target table availability
      const targetRows = await tx.$queryRawUnsafe(`SELECT id, status FROM "PoolTable" WHERE id = $1::uuid`, newTableId);
      const target = Array.isArray(targetRows) ? targetRows[0] : targetRows;
      if(!target) throw new Error('table_not_found');
      if(target.status === 'occupied') throw new Error('table_unavailable');
      
      // Update session to new table
      await tx.$executeRawUnsafe(`UPDATE "Session" SET table_id = $1::uuid WHERE id = $2::uuid`, newTableId, sessionId);
      
      // Free old table and occupy new table
      await tx.$executeRawUnsafe(`UPDATE "PoolTable" SET status = 'available' WHERE id = $1::uuid`, oldTableId);
      await tx.$executeRawUnsafe(`UPDATE "PoolTable" SET status = 'occupied' WHERE id = $1::uuid`, newTableId);
      
      // Return updated session info
      const updated = await tx.$queryRawUnsafe(`SELECT id, table_id, patron_id, started_at, ended_at, status, created_at, number_of_players FROM "Session" WHERE id = $1::uuid`, sessionId);
      const u = Array.isArray(updated) ? updated[0] : updated;
      return { id: u.id, tableId: u.table_id, patronId: u.patron_id, startedAt: u.started_at, endedAt: u.ended_at, status: u.status, createdAt: u.created_at, numberOfPlayers: u.number_of_players };
    });
    res.json(result);
  }catch(e){ console.error(e); if(e.message==='table_unavailable') return res.status(409).json({ error: 'table_unavailable' }); res.status(500).json({ error: 'db_error' }); }
});

app.get('/api/sessions', requireAuth, async (req, res) => {
  try {
    const rows = await prisma.$queryRawUnsafe(`SELECT id, table_id, patron_id, started_at, ended_at, status, created_at, number_of_players, pin FROM "Session" WHERE status <> 'cancelled' ORDER BY started_at DESC`);
    const mapped = rows.map(r => ({ id: r.id, tableId: r.table_id, patronId: r.patron_id, startedAt: r.started_at, endedAt: r.ended_at, status: r.status, createdAt: r.created_at, numberOfPlayers: r.number_of_players, pin: r.pin }));
    res.json(mapped);
  } catch (err) { console.error(err); res.status(500).json({ error: 'db_error' }); }
});

// Subscriptions CRUD
app.get('/api/subscriptions', requireAuth, async (req, res) => { 
  try { 
    const subs = await prisma.subscription.findMany(); 
    // Fetch patron details for each subscription
    const subsWithPatrons = await Promise.all(subs.map(async (s) => {
      const patron = await prisma.user.findUnique({ where: { id: s.patronId } }).catch(() => null);
      return { ...s, patronName: patron?.name, patronEmail: patron?.email };
    }));
    res.json(subsWithPatrons); 
  } catch (e) { console.error(e); res.status(500).json({ error: 'db_error' }); } 
});

app.post('/api/subscriptions/:id/renew', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await prisma.subscription.update({
      where: { id },
      data: { activeFrom: new Date() }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/subscriptions', requireAuth, async (req, res) => { 
  const { patron_name, patron_email, plan_name, monthly_fee_cents, active_from } = req.body; 
  try { 
    // Create or find patron
    let patron = await prisma.user.findUnique({ where: { email: patron_email } }).catch(() => null);
    if(!patron){
      patron = await prisma.user.create({ data: { name: patron_name, email: patron_email, role: 'user' } });
    }
    const sub = await prisma.subscription.create({ data: { patronId: patron.id, plan_name, monthly_fee_cents, active_from: active_from ? new Date(active_from) : new Date() } }); 
    res.status(201).json({ ...sub, patronName: patron.name, patronEmail: patron.email }); 
  } catch (e) { console.error(e); res.status(500).json({ error: 'db_error' }); } 
});

// Delete subscription
app.delete('/api/subscriptions/:id', requireAuth, async (req, res) => {
  try {
    await prisma.subscription.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) { console.error(e); res.status(500).json({ error: 'db_error' }); }
});

// Patrons (users)
app.post('/api/patrons', async (req, res) => {
  try{
    const { name, email } = req.body;
    const p = await prisma.user.create({ data: { name, email, role: 'user' } });
    res.status(201).json(p);
  }catch(e){ console.error(e); res.status(500).json({ error: 'db_error' }); }
});

app.get('/api/patrons', requireAuth, async (req, res) => { try{ const list = await prisma.user.findMany({ where: { role: 'user' } }); res.json(list); }catch(e){ console.error(e); res.status(500).json({ error: 'db_error' }); } });

// Public live table-status board data. Unauthenticated by design: exposes only
// table number, table type, status, and (when occupied) player count and start
// time. Never exposes session ids, PINs, tab items, or amounts.
app.get('/api/public/tables', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const [tables, types, sessions] = await Promise.all([
      prisma.poolTable.findMany({ orderBy: { number: 'asc' } }),
      prisma.tableType.findMany(),
      prisma.session.findMany({ where: { status: 'active' } })
    ]);
    const typeNameById = Object.fromEntries((types || []).map(t => [t.id, t.name_en || t.name_fr || null]));
    const activeByTableId = Object.fromEntries((sessions || []).map(s => [s.tableId, s]));
    const out = (tables || []).map(tb => {
      const session = activeByTableId[tb.id];
      const status = tb.status === 'maintenance' ? 'maintenance' : (session ? 'occupied' : 'available');
      const entry = { number: tb.number, typeName: typeNameById[tb.tableTypeId] || null, status };
      if (status === 'occupied') {
        entry.numberOfPlayers = session.numberOfPlayers || 1;
        entry.startedAt = session.startedAt;
      }
      return entry;
    });
    res.json(out);
  } catch (e) { console.error(e); res.status(500).json({ error: 'db_error' }); }
});

// Public table view - get session info by table number
app.get('/api/public/table/:tableNumber', async (req, res) => {
  try {
    const tableNumber = parseInt(req.params.tableNumber);
    const pin = req.query.pin;
    
    // Find table by number
    const tables = await prisma.poolTable.findMany({ where: { number: tableNumber } });
    const table = tables[0];
    
    if (!table) {
      return res.status(404).json({ error: 'table_not_found' });
    }
    
    // Find active session for this table
    const sessions = await prisma.session.findMany({ 
      where: { 
        tableId: table.id,
        status: 'active'
      }
    });
    const session = sessions[0];
    
    if (!session) {
      return res.json({ table: { number: tableNumber, name: `Table ${tableNumber}` }, session: null });
    }
    
    // Validate PIN
    if (!pin || session.pin !== pin) {
      return res.status(403).json({ error: 'invalid_pin' });
    }
    
    // Get session details with items
    const items = await prisma.tabLineItem.findMany({ where: { sessionId: session.id, voidedAt: null } });
    
    // Check for subscriber count meta item
    const subscriberMeta = items.find(i => i.type === 'meta' && i.description === 'subscriber_count');
    const subscriberCount = subscriberMeta ? subscriberMeta.quantity : 0;
    const nonSubscriberCount = (session.numberOfPlayers || 1) - subscriberCount;
    
    // Calculate items total (exclude meta, table_settlement, and settlement items)
    // Settlement items are already reflected in the reduced quantities of original items
    const itemsTotal = items.filter(i => i.type !== 'meta' && i.type !== 'table_settlement' && i.type !== 'settlement').reduce((sum,i)=>sum + (i.totalCents || 0), 0);
    
    // Calculate table charge settlements
    const tableSettlements = items.filter(i => i.type === 'table_settlement').reduce((sum,i)=>sum + (i.totalCents || 0), 0);
    
    // Get table type information
    const tableTypeRows = await prisma.$queryRawUnsafe(`
      SELECT tt.id, tt.name_en, tt.name_fr, tt.base_hourly_cents 
      FROM "PoolTable" p 
      JOIN "TableType" tt ON tt.id = p.table_type_id 
      WHERE p.id::text = $1
    `, table.id);
    const tableType = Array.isArray(tableTypeRows) ? tableTypeRows[0] : tableTypeRows;
    
    // Calculate table charge with subscriber discount
    let tableCharge = 0;
    if(session.startedAt && session.status === 'active'){
      if(tableType && tableType.base_hourly_cents){
        const elapsedMs = Date.now() - new Date(session.startedAt).getTime();
        const hoursCharged = Math.ceil(elapsedMs / 3600000);
        
        // Get subscriber discount setting
        const discountSetting = await prisma.setting.findUnique({ where: { key: 'subscriber_discount' } });
        const discountPercent = discountSetting ? parseFloat(discountSetting.value) : 50;
        
        // Subscribers pay 0, non-subscribers get discount if playing with subscribers
        if(nonSubscriberCount > 0){
          const baseCharge = hoursCharged * tableType.base_hourly_cents;
          if(subscriberCount > 0){
            // Apply discount for non-subscribers playing with subscribers
            tableCharge = Math.round(baseCharge * (1 - discountPercent / 100));
          } else {
            // No subscribers, full charge
            tableCharge = baseCharge;
          }
        }
        // If all subscribers, tableCharge remains 0
      }
    }
    
    // Apply settlements to table charge only if there are non-subscribers remaining
    if(nonSubscriberCount > 0){
      tableCharge = tableCharge + tableSettlements;
    }
    
    const total = itemsTotal + tableCharge;

    // Pending drink orders this player has placed, still awaiting staff fulfillment
    const pendingOrders = await prisma.pendingOrder.findMany({
      where: { sessionId: session.id, status: 'pending' },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ 
      table: { 
        number: tableNumber, 
        name: `Table ${tableNumber}`,
        type: tableType ? tableType.name_en : null
      },
      session: {
        startedAt: session.startedAt,
        numberOfPlayers: session.numberOfPlayers
      },
      items: items.filter(i => i.type !== 'meta' && i.type !== 'table_settlement' && i.type !== 'settlement'),
      totalCents: total,
      itemsTotal,
      tableCharge,
      pendingOrders: pendingOrders.map(o => ({ id: o.id, items: JSON.parse(o.itemsJson), totalCents: o.totalCents, createdAt: o.createdAt }))
    });
  } catch (e) { 
    console.error(e); 
    res.status(500).json({ error: 'db_error' }); 
  }
});

// Public: place a drink order for a table (requires the table's session PIN).
// Prices are always resolved server-side from the Drink table, never trusted from the client.
app.post('/api/public/table/:tableNumber/order', async (req, res) => {
  try {
    const tableNumber = parseInt(req.params.tableNumber);
    const { pin, items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'empty_order' });
    }

    const tables = await prisma.poolTable.findMany({ where: { number: tableNumber } });
    const table = tables[0];
    if (!table) return res.status(404).json({ error: 'table_not_found' });

    const sessions = await prisma.session.findMany({ where: { tableId: table.id, status: 'active' } });
    const session = sessions[0];
    if (!session) return res.status(400).json({ error: 'no_active_session' });

    if (!pin || session.pin !== pin) {
      return res.status(403).json({ error: 'invalid_pin' });
    }

    // Resolve each requested drink against current catalog prices
    const drinkIds = items.map(i => i.drinkId);
    const drinks = await prisma.drink.findMany({ where: { id: { in: drinkIds } } });
    const drinkById = Object.fromEntries(drinks.map(d => [d.id, d]));

    const resolvedItems = [];
    let totalCents = 0;
    for (const reqItem of items) {
      const drink = drinkById[reqItem.drinkId];
      const quantity = Math.max(1, Math.min(50, parseInt(reqItem.quantity) || 1));
      if (!drink) continue; // silently skip unknown/removed drinks
      const totalForItem = drink.price_cents * quantity;
      resolvedItems.push({
        drinkId: drink.id,
        description: drink.name_en,
        quantity,
        unitPriceCents: drink.price_cents,
        totalCents: totalForItem,
        vatRatePercent: drink.vatRatePercent
      });
      totalCents += totalForItem;
    }

    if (resolvedItems.length === 0) {
      return res.status(400).json({ error: 'empty_order' });
    }

    const order = await prisma.pendingOrder.create({
      data: {
        sessionId: session.id,
        tableId: table.id,
        itemsJson: JSON.stringify(resolvedItems),
        totalCents,
        status: 'pending'
      }
    });

    res.status(201).json({ id: order.id, items: resolvedItems, totalCents: order.totalCents, createdAt: order.createdAt });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'db_error' });
  }
});

// Staff: list all pending drink orders across all tables, for the dashboard panel
app.get('/api/pending-orders', requireAuth, async (req, res) => {
  try {
    const orders = await prisma.pendingOrder.findMany({ where: { status: 'pending' }, orderBy: { createdAt: 'asc' } });
    const tableIds = [...new Set(orders.map(o => o.tableId))];
    const tables = tableIds.length ? await prisma.poolTable.findMany({ where: { id: { in: tableIds } } }) : [];
    const tableById = Object.fromEntries(tables.map(t => [t.id, t]));
    res.json(orders.map(o => ({
      id: o.id,
      sessionId: o.sessionId,
      tableId: o.tableId,
      tableNumber: tableById[o.tableId]?.number ?? null,
      items: JSON.parse(o.itemsJson),
      totalCents: o.totalCents,
      createdAt: o.createdAt
    })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'db_error' });
  }
});

// Staff: fulfill a pending order - adds its items to the table's tab and marks it done
app.post('/api/pending-orders/:id/fulfill', requireAuth, async (req, res) => {
  try {
    const order = await prisma.pendingOrder.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ error: 'not_found' });
    if (order.status !== 'pending') return res.status(400).json({ error: 'already_resolved' });

    const session = await prisma.session.findUnique({ where: { id: order.sessionId } });
    if (!session || session.status !== 'active') {
      return res.status(409).json({ error: 'session_ended' });
    }

    const items = JSON.parse(order.itemsJson);
    await prisma.$transaction([
      ...items.map(item => {
        const rate = item.vatRatePercent != null ? item.vatRatePercent : 20;
        return prisma.tabLineItem.create({
          data: {
            sessionId: order.sessionId,
            type: 'drink',
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPriceCents,
            totalCents: item.totalCents,
            vatRatePercent: rate,
            vatAmountCents: vatAmountFromTotal(item.totalCents, rate)
          }
        });
      }),
      prisma.pendingOrder.update({ where: { id: order.id }, data: { status: 'fulfilled', fulfilledAt: new Date() } })
    ]);

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'db_error' });
  }
});

// Staff: cancel/reject a pending order without adding it to the tab
app.post('/api/pending-orders/:id/cancel', requireAuth, async (req, res) => {
  try {
    const order = await prisma.pendingOrder.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ error: 'not_found' });
    if (order.status !== 'pending') return res.status(400).json({ error: 'already_resolved' });

    await prisma.pendingOrder.update({ where: { id: order.id }, data: { status: 'cancelled', fulfilledAt: new Date() } });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'db_error' });
  }
});

// Seed database with default table types and drinks on startup
async function seedDefaults() {
  try {
    // Check if any table types exist
    const typeCount = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "TableType"`);
    const count = Array.isArray(typeCount) ? parseInt(typeCount[0].count) : parseInt(typeCount.count);
    
    if (count === 0) {
      console.log('Seeding default table types...');
      await prisma.$executeRawUnsafe(`
        INSERT INTO "TableType" (id, name_en, name_fr, base_hourly_cents, created_at)
        VALUES 
          (gen_random_uuid(), 'American', 'Américaine', 3000, now()),
          (gen_random_uuid(), 'Pool', 'Pool', 2500, now()),
          (gen_random_uuid(), 'Snooker', 'Snooker', 4000, now()),
          (gen_random_uuid(), 'French', 'Française', 3500, now())
        ON CONFLICT DO NOTHING
      `);
      console.log('Default table types seeded.');
    }
    
    // Check if any drinks exist
    const drinkCount = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "Drink"`);
    const dcount = Array.isArray(drinkCount) ? parseInt(drinkCount[0].count) : parseInt(drinkCount.count);
    
    if (dcount === 0) {
      console.log('Seeding default drinks...');
      await prisma.$executeRawUnsafe(`
        INSERT INTO "Drink" (id, name_en, name_fr, price_cents, taxable, vat_rate_percent, created_at)
        VALUES 
          (gen_random_uuid(), 'Beer', 'Bière', 600, true, 20, now()),
          (gen_random_uuid(), 'Soda', 'Soda', 300, false, 10, now())
        ON CONFLICT DO NOTHING
      `);
      console.log('Default drinks seeded.');
    }
  } catch (e) {
    console.error('Seeding error:', e);
  }
}

// Start server and seed defaults
// Start server and seed defaults when not running tests
async function startServer(){
  await seedDefaults();
  app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
}

// Only start the server when executed directly (not when required/imported by tests)
if (require.main === module) {
  // Prevent automatic start when running tests or when explicitly skipped.
  // Jest sets `JEST_WORKER_ID` for its workers; some environments may not set NODE_ENV.
  const skipForTest = process.env.NODE_ENV === 'test' || typeof process.env.JEST_WORKER_ID !== 'undefined' || process.env.SKIP_SERVER === '1';
  if (!skipForTest) {
    startServer();
  }
}

module.exports = app;
