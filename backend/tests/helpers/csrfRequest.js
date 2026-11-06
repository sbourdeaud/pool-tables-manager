const supertest = require('supertest');

function csrfAgent(app) {
  const agent = supertest.agent(app);
  let pendingToken;
  function getToken() {
    if (!pendingToken) {
      pendingToken = agent.get('/api/csrf-token').then(res => {
        if (res.status !== 200 || typeof res.body.token !== 'string') throw new Error('CSRF token fetch failed');
        return res.body.token;
      }).finally(() => { pendingToken = undefined; });
    }
    return pendingToken;
  }
  return new Proxy(agent, {
    get(target, method) {
      if (!['post', 'put', 'patch', 'delete'].includes(method)) {
        return typeof target[method] === 'function' ? target[method].bind(target) : target[method];
      }
      return (url) => {
        if (method === 'post' && url === '/api/webhooks/stripe') return target[method](url);
        const calls = [];
        let pending;
        function execute() {
          if (!pending) pending = getToken().then(token => {
            const req = target[method](url).set('x-csrf-token', token);
            for (const [name, args] of calls) req[name](...args);
            return req;
          });
          return pending;
        }
        const chain = new Proxy({}, {
          get(unused, name) {
            if (['then', 'catch', 'finally'].includes(name)) return (...args) => execute()[name](...args);
            if (name === 'end') return callback => {
              execute().then(res => callback(null, res), callback);
              return chain;
            };
            return (...args) => { calls.push([name, args]); return chain; };
          }
        });
        return chain;
      };
    }
  });
}

csrfAgent.agent = csrfAgent;
module.exports = csrfAgent;
