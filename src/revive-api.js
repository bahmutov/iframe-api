var verifyMd5 = require('./verify-md5');
var la = require('./la');

function apiFactory(port, methodNames, values, methodHelps) {
  values = values || {};
  methodHelps = methodHelps || {};

  if (typeof port.postMessage !== 'function') {
    throw new Error('Invalid port - does not have postMessage');
  }

  function send(cmd) {
    port.postMessage({
      cmd: cmd,
      args: Array.prototype.slice.call(arguments, 1)
    }, '*');
  }
  var api = {};
  methodNames.forEach(function (name) {
    if (values[name]) {
      api[name] = values[name];
    } else {
      api[name] = send.bind(null, name);
    }
    if (methodHelps[name]) {
      api[name].help = methodHelps[name];
    }
  });

  return api;
}

function reviveApi(userOptions, received, port) {
  la(arguments.length === 3, 'missing arguments to revive api');
  la(port && typeof port.postMessage === 'function',
    'invalid port object');
  verifyMd5(userOptions, received);

  received.methodNames = Array.isArray(received.methodNames) ? received.methodNames : [];
  received.methodHelps = Array.isArray(received.methodHelps) ? received.methodHelps : [];

  /* jshint -W061 */
  /* eslint no-eval:0 */
  // event.source is the communication channel pointing at iframe
  // it allows posting messages back to the iframe
  return eval('(' + received.source +
    ')(port, received.methodNames, received.values, received.methodHelps)');
}

module.exports = {
  apiFactory: apiFactory,
  reviveApi: reviveApi
};
