// Payment provider selection for card payments (POS phase 2).
//
//   PAYMENT_PROVIDER=fake          -> deterministic in-memory provider (tests/dev, no hardware)
//   STRIPE_SECRET_KEY set          -> Stripe Terminal (server-driven reader integration)
//   otherwise                      -> no card provider (cash only)
//
// Card payments require the POS feature (pos_enabled) as well; see
// docs/POS-INTEGRATION-PLAN.md.

let cached = null;
let cachedMode = '';

function buildProvider() {
  const mode = String(process.env.PAYMENT_PROVIDER || '').toLowerCase();
  if (mode === 'fake') return require('./fakeProvider');
  if (process.env.STRIPE_SECRET_KEY) return require('./stripeProvider').createStripeProvider(process.env.STRIPE_SECRET_KEY);
  return null;
}

function getCardProvider() {
  const mode = String(process.env.PAYMENT_PROVIDER || '').toLowerCase() || (process.env.STRIPE_SECRET_KEY ? 'stripe' : 'none');
  if (cachedMode !== mode) {
    cached = buildProvider();
    cachedMode = mode;
  }
  return cached;
}

function getPublicConfig() {
  const provider = getCardProvider();
  if (!provider) return { card_enabled: false, provider: null };
  const configured = provider.isConfigured ? provider.isConfigured() : true;
  return { card_enabled: Boolean(configured), provider: provider.name };
}

module.exports = { getCardProvider, getPublicConfig };
