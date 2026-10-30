// Jest stub for openid-client v6 (ESM-only). The unit tests do not exercise
// real OIDC flows; this keeps server.js loadable in the CJS test runtime.
const notImplemented = () => {
  throw new Error('openid-client is stubbed in tests');
};

module.exports = new Proxy(
  {
    discovery: notImplemented,
    randomPKCECodeVerifier: notImplemented,
    calculatePKCECodeChallenge: notImplemented,
    randomState: notImplemented,
    buildAuthorizationUrl: notImplemented,
    authorizationCodeGrant: notImplemented,
    fetchUserInfo: notImplemented,
  },
  {
    get(target, prop) {
      if (prop in target) return target[prop];
      return notImplemented;
    },
  },
);
