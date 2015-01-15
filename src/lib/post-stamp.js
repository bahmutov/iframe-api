/* eslint no-use-before-define:0 */
var la = require('./la');

function peel(data) {
  var defer = stamp.__deferred[data.__stamp];
  if (defer) {
    la(typeof defer.resolve === 'function', 'missing resolve method for', data.__stamp);
    delete data.__stamp;
    defer.resolve(data.result);
    delete stamp.__deferred[data.__stamp];
  }
}

function deliver(mailman, address, data) {
  id += 1;

  data.__stamp = id;

  mailman(address, data);

  return new Promise(function (resolve, reject) {
    stamp.__deferred[id] = {
      resolve: resolve.bind(this),
      reject: reject.bind(this)
    };
  });
}

function stamp(mailman, address, data) {
  if (typeof mailman === 'function') {
    return deliver(mailman, address, data);
  } else {
    la(arguments.length === 1 &&
      typeof mailman === 'object', 'expected just data', arguments);
    peel(mailman);
  }
}

var id = 0;
stamp.__deferred = [];

module.exports = stamp;
