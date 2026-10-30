// Deterministic in-memory card provider for tests and hardware-free development
// (PAYMENT_PROVIDER=fake). Payments are captured immediately.

const crypto = require('crypto');

const intents = new Map(); // providerRef -> { status, amountCents }

module.exports = {
  name: 'fake',
  isConfigured: () => true,

  async createCardPayment({ amountCents }) {
    const providerRef = 'fake_' + crypto.randomUUID();
    intents.set(providerRef, { status: 'captured', amountCents });
    return { providerRef, status: 'captured' };
  },

  async getStatus(providerRef) {
    const intent = intents.get(providerRef);
    return { status: intent ? intent.status : 'failed' };
  },

  async cancel(providerRef) {
    const intent = intents.get(providerRef);
    if (intent && intent.status === 'captured') {
      const err = new Error('already_captured');
      err.code = 'already_captured';
      throw err;
    }
    if (intent) intent.status = 'canceled';
    return { status: 'canceled' };
  },

  async refund() {
    return { status: 'refunded' };
  },

  // No real settlement data for the fake provider.
  async getSettlement() {
    return { available: false };
  },

  // The fake provider has no webhooks.
  verifyWebhook() {
    return null;
  },
};
