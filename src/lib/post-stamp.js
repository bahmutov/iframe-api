/* eslint no-use-before-define:0 */
function peel(cargo) {
  var defer = stamp.__deferred[cargo.stamp];
  if (defer) {
    if (typeof defer.resolve !== 'function') {
      throw new Error('missing resolve method for ' + cargo.stamp);
    }
    delete cargo.stamp;
    delete stamp.__deferred[cargo.stamp];
    // TODO handle errors by calling defer.reject
    if (!cargo.payload) {
      throw new Error('missing payload in', cargo);
    }
    var result = Array.isArray(cargo.payload.args) && cargo.payload.args[0];
    defer.resolve(result);
  }
}

function hasBeenStamped(cargo) {
  return cargo.stamp;
}

function deliver(mailman, address, data) {

  var cargo = data;
  if (!hasBeenStamped(cargo)) {
    id += 1;
    cargo = {
      payload: data,
      stamp: id
    };
  }

  mailman(address, cargo);

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
