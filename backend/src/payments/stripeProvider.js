// Stripe Terminal provider — server-driven integration: the backend creates a
// PaymentIntent and asks a pre-registered reader (Stripe Dashboard) to process it.
// No browser SDK / secure context is required, which suits a self-hosted HTTP app.
//
// Environment:
//   STRIPE_SECRET_KEY           API secret key (test or live)
//   STRIPE_TERMINAL_READER_ID   Reader id (tmr_...) registered in the Dashboard
//   STRIPE_WEBHOOK_SECRET       Endpoint signing secret (whsec_...) for /api/webhooks/stripe

const CURRENCY_MAP = {
  '$': 'usd',
  USD: 'usd',
  '€': 'eur',
  EUR: 'eur',
  '£': 'gbp',
  GBP: 'gbp',
  'A$': 'aud',
  AUD: 'aud',
  'CA$': 'cad',
  CAD: 'cad',
  'NZ$': 'nzd',
  NZD: 'nzd',
  'R': 'zar',
  ZAR: 'zar',
  '₹': 'inr',
  INR: 'inr',
  'S$': 'sgd',
  SGD: 'sgd',
  '₱': 'php',
  PHP: 'php',
  '₦': 'ngn',
  NGN: 'ngn',
  'KSh': 'kes',
  KES: 'kes',
  'GH₵': 'ghs',
  GHS: 'ghs',
  'PKR': 'pkr',
  '৳': 'bdt',
  BDT: 'bdt',
  'LKR': 'lkr',
  'RM': 'myr',
  MYR: 'myr',
  'J$': 'jmd',
  JMD: 'jmd',
  'TT$': 'ttd',
  TTD: 'ttd',
  'B$': 'bsd',
  BSD: 'bsd',
  'Bds$': 'bbd',
  BBD: 'bbd',
  'BZ$': 'bzd',
  BZD: 'bzd',
  'G$': 'gyd',
  GYD: 'gyd',
  'FJ$': 'fjd',
  FJD: 'fjd',
  'PGK': 'pgk',
  'WS$': 'wst',
  WST: 'wst',
  'T$': 'top',
  TOP: 'top',
  'VT': 'vuv',
  VUV: 'vuv',
  'SI$': 'sbd',
  SBD: 'sbd',
  'P': 'bwp',
  BWP: 'bwp',
  'N$': 'nad',
  NAD: 'nad',
  'ZiG': 'zwg',
  ZWG: 'zwg',
  'ZK': 'zmw',
  ZMW: 'zmw',
  'USh': 'ugx',
  UGX: 'ugx',
  'TSh': 'tzs',
  TZS: 'tzs',
  'FRw': 'rwf',
  RWF: 'rwf',
  'SS£': 'ssp',
  SSP: 'ssp',
  'SDG': 'sdg',
  'MK': 'mwk',
  MWK: 'mwk',
  'LSL': 'lsl',
  'E': 'szl',
  SZL: 'szl',
  'D': 'gmd',
  GMD: 'gmd',
  'Le': 'sle',
  SLE: 'sle',
  'L$': 'lrd',
  LRD: 'lrd',
  'SCR': 'scr',
  'MUR': 'mur',
  'EC$': 'xcd',
  XCD: 'xcd',
  'CI$': 'kyd',
  KYD: 'kyd',
  'BD$': 'bmd',
  BMD: 'bmd',
  'FK£': 'fkp',
  FKP: 'fkp',
  'GI£': 'gip',
  GIP: 'gip',
  'SH£': 'shp',
  SHP: 'shp',
  'HK$': 'hkd',
  HKD: 'hkd',
  'BN$': 'bnd',
  BND: 'bnd',
  'CHF': 'chf',
  'CFA': 'xof',
  XOF: 'xof',
  'FCFA': 'xaf',
  XAF: 'xaf',
  'G': 'htg',
  HTG: 'htg',
  'Ar': 'mga',
  MGA: 'mga',
  'FC': 'cdf',
  CDF: 'cdf',
  'Fdj': 'djf',
  DJF: 'djf',
  'CF': 'kmf',
  KMF: 'kmf',
  'MX$': 'mxn',
  MXN: 'mxn',
  'AR$': 'ars',
  ARS: 'ars',
  'COL$': 'cop',
  COP: 'cop',
  'CLP$': 'clp',
  CLP: 'clp',
  'S/': 'pen',
  PEN: 'pen',
  '$U': 'uyu',
  UYU: 'uyu',
  'Bs': 'bob',
  BOB: 'bob',
  '₲': 'pyg',
  PYG: 'pyg',
  'Bs.S': 'ves',
  VES: 'ves',
  'Q': 'gtq',
  GTQ: 'gtq',
  'HNL': 'hnl',
  'C$': 'nio',
  NIO: 'nio',
  '₡': 'crc',
  CRC: 'crc',
  'RD$': 'dop',
  DOP: 'dop',
  'CUP$': 'cup',
  CUP: 'cup',
  'B/.': 'pab',
  PAB: 'pab',
  'Sr$': 'srd',
  SRD: 'srd',
  'Afl.': 'awg',
  AWG: 'awg',
  'ƒ': 'ang',
  ANG: 'ang',
  'SAR': 'sar',
  'AED': 'aed',
  'E£': 'egp',
  EGP: 'egp',
  'DA': 'dzd',
  DZD: 'dzd',
  'DH': 'mad',
  MAD: 'mad',
  'DT': 'tnd',
  TND: 'tnd',
  'LD': 'lyd',
  LYD: 'lyd',
  'IQD': 'iqd',
  'JD': 'jod',
  JOD: 'jod',
  'KD': 'kwd',
  KWD: 'kwd',
  'QR': 'qar',
  QAR: 'qar',
  'BD': 'bhd',
  BHD: 'bhd',
  'OMR': 'omr',
  'YER': 'yer',
  'L£': 'lbp',
  LBP: 'lbp',
  'S£': 'syp',
  SYP: 'syp',
  '₪': 'ils',
  ILS: 'ils',
  'UM': 'mru',
  MRU: 'mru',
  'SOS': 'sos',
  'ERN': 'ern',
  'R$': 'brl',
  BRL: 'brl',
  'Kz': 'aoa',
  AOA: 'aoa',
  'MT': 'mzn',
  MZN: 'mzn',
  'Esc': 'cve',
  CVE: 'cve',
  'Db': 'stn',
  STN: 'stn',
  'CN¥': 'cny',
  CNY: 'cny',
  'NT$': 'twd',
  TWD: 'twd',
  'MOP$': 'mop',
  MOP: 'mop',
  '¥': 'jpy',
  JPY: 'jpy',
  '₩': 'krw',
  KRW: 'krw',
  'KP₩': 'kpw',
  KPW: 'kpw',
};

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
