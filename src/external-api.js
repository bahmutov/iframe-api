// include this from external website (the one that iframes)
// installs api object that can be used to execute code
// in iframe's context

var md5 = require('./md5');
var la = require('./la');
la(typeof md5 === 'function', 'cannot find md5 function');

var makeExternalApi = require('./revive-api');

function iframeApi(externalApi, callback, options) {
  if (typeof externalApi === 'function') {
    options = callback;
    callback = externalApi;
    externalApi = null;
  }
  options = options || {};

  var frameApi;

  var verifyMd5 = require('./verify-md5');
  var removeWhiteSpace = require('./minify');

  // receives message (possibly from the iframe)
  function processMessage(event) {

    function reviveApi(opts) {
      verifyMd5(options, opts);

      /* jshint -W061 */
      /* eslint no-eval:0 */
      // event.source is the communication channel pointing at iframe
      // it allows posting messages back to the iframe
      return eval('(' + opts.source +
        ')(event.source, opts.apiMethodNames, opts.values, opts.apiMethodHelps)');
    }

    function sendExternalApi(frameApi) {
      console.assert(frameApi, 'missing frame api');

      if (externalApi) {
        console.log('sending external api back to the frame');
        console.assert(typeof frameApi.api === 'function', 'missing frameApi.api', frameApi);

        var methodNames = Object.keys(externalApi);
        var source = makeExternalApi.toString();
        source = removeWhiteSpace(source);

        var values = {};
        methodNames.forEach(function (name) {
          if (typeof externalApi[name] !== 'function') {
            values[name] = externalApi[name];
          }
        });

        frameApi.api({
          source: source,
          md5: md5(source),
          methodNames: methodNames,
          values: values
        });
      }
    }

    if (event.data.cmd === 'api') {
      try {
        frameApi = reviveApi(event.data);
        sendExternalApi(frameApi);
        // we no longer need to api method
        delete frameApi.api;
        setTimeout(function () {
          callback(null, frameApi);
        }, 0);
      } catch (err) {
        setTimeout(function () {
          callback(err);
        }, 0);
      }

      return;
    }

    if (externalApi) {
      var method = externalApi[event.data.cmd];
      if (typeof method === 'function') {
        // parent has a method iframe is trying to call
        method.apply(externalApi, event.data.args);
      }
    }
  }

  window.onmessage = processMessage;
}

module.exports = iframeApi;
