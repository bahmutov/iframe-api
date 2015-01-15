/* eslint no-use-before-define:0 */
function peel(data) {
  var defer = stamp.__deferred[data.__stamp];
  if (defer) {
    if (typeof defer.resolve !== 'function') {
      throw new Error('missing resolve method for ' + data.__stamp);
    }
    delete data.__stamp;
    delete stamp.__deferred[data.__stamp];
    // TODO handle errors by calling defer.reject
    defer.resolve(data.result);
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
    if (arguments.length !== 1 ||
      typeof mailman !== 'object') {
      throw new Error('expected just data ' + JSON.stringify(arguments));
    }
    peel(mailman);
  }
}

var id = 0;
stamp.__deferred = [];

module.exports = stamp;
