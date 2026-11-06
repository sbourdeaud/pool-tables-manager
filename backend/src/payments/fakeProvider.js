// Deterministic in-memory card provider for tests and hardware-free development
// (PAYMENT_PROVIDER=fake). Payments are captured immediately.

const crypto = require('crypto');

const intents = new Map(); // providerRef -> { status, amountCents }

module.exports = {
  name: 'fake',
  isConfigured: () => true,

  async createCardPayment({ amountCents, currency, reference }) {
    const existing = reference && [...intents.entries()].find(([, intent]) => intent.reference === reference);
    if(existing) return { providerRef: existing[0], status: existing[1].status };
    const providerRef = 'fake_' + crypto.randomUUID();
    intents.set(providerRef, { status: 'captured', amountCents, currency, reference });
    return { providerRef, status: 'captured' };
  },

  async reconcileCardPayment({ amountCents, currency, reference, createdAt, providerRef }) {
    if(!providerRef) {
      const age = Date.now() - new Date(createdAt).getTime();
      if(!reference || !Number.isFinite(age) || age < 0 || age >= 23 * 60 * 60 * 1000) throw new Error('payment_reconciliation_required');
      providerRef = (await this.createCardPayment({ amountCents, currency, reference })).providerRef;
    }
    const intent = intents.get(providerRef);
    if(!intent || intent.amountCents !== amountCents || intent.currency !== currency || intent.reference !== reference) throw new Error('payment_reconciliation_required');
    return { providerRef, status: intent.status };
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

  async refund({ reference, amountCents, providerRef }) {
    return { status: 'refunded', providerRefundRef: `fake_refund_${reference}`, amountCents, providerRef, reference };
  },

  async getRefund({ reference, amountCents, providerRef, providerRefundRef }) {
    return providerRefundRef ? { status: 'refunded', providerRefundRef, amountCents, providerRef, reference } : null;
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
