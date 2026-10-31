// Stripe Terminal provider — server-driven integration: the backend creates a
// PaymentIntent and asks a pre-registered reader (Stripe Dashboard) to process it.
// No browser SDK / secure context is required, which suits a self-hosted HTTP app.
//
// Environment:
//   STRIPE_SECRET_KEY           API secret key (test or live)
//   STRIPE_TERMINAL_READER_ID   Reader id (tmr_...) registered in the Dashboard
//   STRIPE_WEBHOOK_SECRET       Endpoint signing secret (whsec_...) for /api/webhooks/stripe

const CURRENCY_MAP = { '€': 'eur', '$': 'usd', '£': 'gbp', EUR: 'eur', USD: 'usd', GBP: 'gbp' };

function toStripeCurrency(currency) {
  return CURRENCY_MAP[currency] || 'eur';
}

function mapIntentStatus(status) {
  switch (status) {
    case 'succeeded':
      return 'captured';
    case 'canceled':
      return 'canceled';
    case 'requires_payment_method':
    case 'requires_confirmation':
    case 'requires_capture':
    case 'requires_action':
    case 'processing':
      return 'presenting';
    default:
      return 'failed';
  }
}

function createStripeProvider(secretKey) {
  // Required lazily so the SDK is only loaded when actually configured.
  const Stripe = require('stripe');
  const stripe = new Stripe(secretKey);
  const readerId = process.env.STRIPE_TERMINAL_READER_ID || '';

  return {
    name: 'stripe',
    isConfigured: () => Boolean(readerId),

    async createCardPayment({ amountCents, currency, reference }) {
      if (!readerId) {
        const err = new Error('reader_not_configured');
        err.code = 'reader_not_configured';
        throw err;
      }
      const intent = await stripe.paymentIntents.create(
        {
          amount: amountCents,
          currency: toStripeCurrency(currency),
          payment_method_types: ['card_present'],
          capture_method: 'automatic',
          metadata: reference ? { reference } : undefined,
        },
        reference ? { idempotencyKey: reference } : undefined,
      );
      // Server-driven: ask the reader to collect the card for this intent.
      await stripe.terminal.readers.processPaymentIntent(readerId, intent.id);
      return { providerRef: intent.id, status: mapIntentStatus(intent.status) };
    },

    async getStatus(providerRef) {
      const intent = await stripe.paymentIntents.retrieve(providerRef);
      return { status: mapIntentStatus(intent.status) };
    },

    async cancel(providerRef) {
      // Cancel any outstanding terminal action, then the intent itself.
      try {
        await stripe.terminal.readers.cancelAction(readerId);
      } catch {
        /* no action in progress */
      }
      try {
        const intent = await stripe.paymentIntents.cancel(providerRef);
        return { status: mapIntentStatus(intent.status) };
      } catch (err) {
        // Already succeeded -> cannot cancel; the caller should refund instead.
        return { status: 'captured' };
      }
    },

    async refund({ providerRef, amountCents }) {
      await stripe.refunds.create({ payment_intent: providerRef, amount: amountCents });
      return { status: 'refunded' };
    },

    // Gross/refunded/fee totals for the terminal charges in a date range, from
    // Stripe balance transactions (used for day-close reconciliation).
    async getSettlement({ start, end }) {
      const created = { gte: Math.floor(start.getTime() / 1000), lte: Math.floor(end.getTime() / 1000) };
      const transactions = [];
      let startingAfter;
      do {
        const page = await stripe.balanceTransactions.list({
          created,
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        });
        transactions.push(...page.data);
        startingAfter = page.has_more ? page.data[page.data.length - 1].id : undefined;
      } while (startingAfter);

      let grossCents = 0;
      let refundedCents = 0;
      let feeCents = 0;
      for (const txn of transactions) {
        if (txn.type === 'charge' || txn.type === 'payment') grossCents += txn.amount;
        else if (txn.type === 'refund') refundedCents += Math.abs(txn.amount);
        feeCents += txn.fee || 0;
      }
      return { available: true, grossCents, refundedCents, netCents: grossCents - refundedCents, feeCents };
    },

    verifyWebhook(rawBody, signature) {
      const secret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!secret) {
        const err = new Error('webhook_not_configured');
        err.code = 'webhook_not_configured';
        throw err;
      }
      return stripe.webhooks.constructEvent(rawBody, signature, secret);
    },
  };
}

module.exports = { createStripeProvider };
