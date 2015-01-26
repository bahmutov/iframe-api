require('es6-promise').polyfill();

function isIframed() {
  return parent !== window;
}

var apiMethods = require('./lib/api-methods');
var la = require('./lib/la');
// var stamp = require('./lib/post-stamp');
var selfAddressed = require('self-addressed');

var iframeApi = function iframeApi(myApi, userOptions) {
  var params = {
    myApi: myApi,
    options: userOptions || {}
  };
  params.options.isIframed = isIframed();

  var log = params.options.debug || params.options.verbose ?
    console.log.bind(console) : function noop() {};

  return new Promise(function (resolve, reject) {

    /*
    function handshake(callerOptions, port) {
      console.log('handshake with caller', JSON.stringify(callerOptions));
      if (!isIframed()) {
        log('responding to handshake from iframe');
        var letter = selfAddressed(callerOptions);
        if (letter) {
          console.log('iframe hadnshake options', JSON.stringify(letter));
        }
        apiMethods.handshake(port, params.options);
      }
    }*/

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
        // selfAddressed()
        // apiMethods.handshake(port, params.options);
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
          log('method', cmd, 'result', JSON.stringify(result));
          return result;
        } else {
          log('unknown command', cmd, 'from the parent');
        }
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
        /*
        case '__handshake': {
          return handshake(data, e.source);
        }*/
        case '__api': {
          return receiveApi(data, e.source);
        }
        /*
        case '__method_response': {
          la(e.data.stamp, 'missing return stamp', e.data);
          log('received response', data.args[0], 'to command', e.data.stamp);
          return stamp(e.data);
        }*/
        default: {
          var result = callApiMethod(data, e);
          apiMethods.respond(e.source, e.data, result);
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
      // apiMethods.send(params.myApi, parent, params.options);
      /*
        TODO switch to promise-returning handshake
        apiMethods.handshake(parent, params.options)
      */
    }
  });
};

module.exports = iframeApi;
