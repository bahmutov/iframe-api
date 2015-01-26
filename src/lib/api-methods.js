var verifyMd5 = require('./verify-md5');
var la = require('./la');
var selfAddressed = require('self-addressed');

function post(port, msg) {
  port.postMessage(msg, '*');
}

/* eslint no-new:0 */
function apiFactory(port, methodNames, values, methodHelps) {
  values = values || {};
  methodHelps = methodHelps || {};

  if (typeof port.postMessage !== 'function') {
    throw new Error('Invalid port - does not have postMessage');
  }

  function send(cmd) {
    return selfAddressed(post, port, {
      cmd: cmd,
      args: Array.prototype.slice.call(arguments, 1)
    });

    /*
    return post(port, {
      cmd: cmd,
      args: Array.prototype.slice.call(arguments, 1)
    });*/
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

var md5 = require('./md5');
la(typeof md5 === 'function', 'cannot find md5 function');
var minify = require('./minify');

function sendApi(api, target, options) {
  la(target && target.postMessage, 'missing target postMessage function');
  options = options || {};

  var apiSource = apiFactory.toString();
  var methodNames = Object.keys(api);
  var methodHelps = {};
  // values for non-methods
  var values = {};

  methodNames.forEach(function (name) {
    var fn = api[name];
    if (typeof fn === 'function') {
      methodHelps[name] = fn.help;
    } else {
      values[name] = api[name];
    }
  });

  if (!options.debug) {
    apiSource = minify(apiSource);
  }

  // TODO(gleb): validate that api source can be recreated back

  post(target, {
    cmd: '__api',
    source: apiSource,
    md5: md5(apiSource),
    methodNames: methodNames,
    methodHelps: methodHelps,
    values: values
  });
}

// sending result for command back to the caller
function respond(port, commandData, result) {
  la(typeof commandData === 'object' && commandData.stamp,
    'missing command stamp', commandData);

  console.log('responding to command', commandData.stamp, 'with', result);

  // var stampIt = post.bind(null, post, port);

  commandData.payload = {
    cmd: '__method_response',
    args: [result]
  };

  post(commandData);
}

function handshake(port, options) {
  return selfAddressed(post, port, {
    cmd: '__handshake',
    options: options
  });
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
  handshake: handshake,
  apiFactory: apiFactory,
  send: sendApi,
  reviveApi: reviveApi,
  post: post,
  respond: respond
};
