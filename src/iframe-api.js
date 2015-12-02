require('es6-promise').polyfill();

function isIframed() {
  return parent !== window && !window.iFrameApiParent;
}

var apiMethods = require('./lib/api-methods');
var la = require('./lib/la');
var selfAddressed = require('self-addressed');

function toString(x) {
  return typeof x === 'string' ? x : JSON.stringify(x);
}

function toStrings() {
  return Array.prototype.splice.call(arguments, 0).map(toString);
}

var iframeApi = function iframeApi(myApi, userOptions) {
  var params = {
    myApi: myApi,
    options: userOptions || {}
  };
  params.options.isIframed = isIframed();

  var log = params.options.debug || params.options.verbose ?
    function () {
      console.log.apply(console, toStrings.apply(null, arguments));
    } : function noop() {};

  function callApiMethod(data) {
    var cmd = data.cmd;
    var args = data.args;
    la(typeof cmd === 'string', 'missing command string', cmd);
    if (!Array.isArray(args)) {
      args = [];
    }

    if (params.myApi) {
      var method = params.myApi[cmd];
      if (typeof method === 'function') {
        var result = method.apply(params.myApi, args);
        // log('method', cmd, 'result', JSON.stringify(result));
        return result;
      } else {
        log('unknown command', cmd, 'from the parent');
      }
    }
  }

  return new Promise(function (resolve, reject) {

    function handshakeEnvelope(envelope, port) {
      console.log('handshake envelope with caller', JSON.stringify(envelope));

      if (!isIframed()) {
        log('responding to handshake from iframe');
        var letter = selfAddressed(envelope);
        if (letter) {
          console.log('iframe hadnshake options', JSON.stringify(letter));
        }
        selfAddressed(envelope, params.options);
        selfAddressed(apiMethods.post, port, envelope);
      }
    }

    function isPromise(x) {
      return x && typeof x.then === 'function';
    }

    function respond(port, envelope, result) {
      selfAddressed(envelope, result);
      selfAddressed(apiMethods.post, port, envelope);
    }

    function respondToMail(envelope, port) {
      var letter = selfAddressed(envelope);
      console.log('responding to letter', JSON.stringify(letter));
      var result = callApiMethod(letter);
      if (isPromise(result)) {
        result.then(function (value) {
          respond(port, envelope, value);
        });
      } else {
        respond(port, envelope, result);
      }
    }

    function receiveApi(received, port) {
      try {
        var api = apiMethods.reviveApi(params.options, received, port);
        if (!isIframed() && params.myApi) {
          log('sending external api back to the iframe');
          apiMethods.send(params.myApi, port, params.options);
        }
        resolve(api);
      } catch (err) {
        reject(err);
      }
    }

    function processMessage(e) {
      la(e.data, 'expected message with data');
      if (selfAddressed.is(e.data)) {
        log('received envelope from the other side', e.data);
        var letter = selfAddressed(e.data);
        if (!letter) {
          log('nothing to do for envelope', e.data);
        } else {
          switch (letter.cmd) {
            case '__handshake': {
              return handshakeEnvelope(e.data, e.source);
            }
            default: {
              return respondToMail(e.data, e.source);
            }
          }
        }
        return;
      }

      var data = e.data.payload ? e.data.payload : e.data;

      if (!data || !data.cmd) {
        var msg = 'invalid message received by the iframe API';
        log(msg);
        throw new Error(msg);
      }

      switch (data.cmd) {
        case '__api': {
          return receiveApi(data, e.source);
        }
      }

    }
    window.addEventListener('message', processMessage);

    if (isIframed() && params.myApi) {
      apiMethods.handshake(parent, params.options)
        .then(function (optionsFromOtherSide) {
          var api = typeof params.myApi === 'function' ? params.myApi(optionsFromOtherSide) : params.myApi;
          console.log('has received handshake options', JSON.stringify(optionsFromOtherSide));
          apiMethods.send(api, parent, params.options);
        });
    }
  });
};

module.exports = iframeApi;
