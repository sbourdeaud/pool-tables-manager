const prisma = require('./prismaClient');

// Read SMTP-related settings from the Setting table. Secrets never leave this module.
async function getSmtpConfig() {
  const keys = ['smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_pass', 'smtp_from'];
  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

// Build a nodemailer transport from stored settings. nodemailer is required lazily
// so importing this module never fails when the dependency is absent (e.g. tests).
async function buildTransport() {
  const s = await getSmtpConfig();
  if (!s.smtp_host) throw new Error('smtp_not_configured');
  const nodemailer = require('nodemailer');
  const port = parseInt(s.smtp_port || '587', 10);
  return nodemailer.createTransport({
    host: s.smtp_host,
    port,
    secure: s.smtp_secure === 'true' || port === 465,
    auth: s.smtp_user ? { user: s.smtp_user, pass: s.smtp_pass || '' } : undefined
  });
}

async function sendMail({ to, subject, html, text, attachments }) {
  const s = await getSmtpConfig();
  const transport = await buildTransport();
  return transport.sendMail({
    from: s.smtp_from || s.smtp_user || 'no-reply@localhost',
    to,
    subject,
    html,
    text,
    attachments
  });
}

module.exports = { getSmtpConfig, sendMail };
