// to be run from <iframe src="..." ...></iframe>

function isIframed() {
  return parent !== window;
}

if (isIframed()) {
  var la = require('./la');

  // this function recreates the API object from source
  // TODO combine with similar function in external api
  var reviveApi = require('./revive-api');
  la(typeof reviveApi === 'function', 'missing revive api function');

  var removeWhiteSpace = require('./minify');
  var figureOutOptions = require('./figure-out-options');

  var iframeApi = function iframeApi(myApi, cb, userOptions) {
    var params = figureOutOptions(myApi, cb, userOptions);

    la(typeof params.callback === 'function', 'need callback function', params);

    var receivedExternalApi = function receivedExternalApi(received) {
      /* jshint -W061 */
      /* eslint no-eval:0 */
      la(typeof received === 'object', 'expected parent api options', received);
      la(typeof received.source === 'string', 'cannot find source', received);
      la(Array.isArray(received.methodNames), 'cannot find method names', received);
      la(typeof received.values === 'object', 'cannot find api property values', received);

      var verifyMd5 = require('./verify-md5');
      verifyMd5(params.options, received);

      var api = eval('(' + received.source + ')(parent, received.methodNames, received.values)');

      console.log('got an api to the external site');
      setTimeout(function () {
        params.callback(null, api);
      }, 0);
    };

    function messageToApi(e) {
      if (!e.data || !e.data.cmd) {
        console.error('invalid message received by the iframe API', e.data);
        return;
      }

      if (e.data.cmd === 'api') {
        receivedExternalApi(e.data.args[0]);
        return;
      }

      if (params.myApi) {
        var method = params.myApi[e.data.cmd];
        if (typeof method === 'function') {
          var args = Array.isArray(e.data.args) ? e.data.args : [];
          method.apply(params.myApi, args);
        } else {
          console.log('unknown command', e.data.cmd, 'from the parent', e.data.cmd);
        }
      }
    }

    var md5 = require('./md5');
    la(typeof md5 === 'function', 'cannot find md5 function');
    window.onmessage = messageToApi;

    la(isIframed(), 'not iframed');

    if (params.myApi) {
      // placeholder for API method to send parent's api back to iframe
      params.myApi.api = function () {};

      var apiSource = reviveApi.toString();
      var apiMethodNames = Object.keys(params.myApi);
      var apiMethodHelps = {};
      // values for non-methods
      var values = {};

      apiMethodNames.forEach(function (name) {
        var fn = params.myApi[name];
        if (typeof fn === 'function') {
          apiMethodHelps[name] = fn.help;
        } else {
          values[name] = params.myApi[name];
        }
      });

      apiSource = removeWhiteSpace(apiSource);

      // TODO(gleb): validate that api source can be recreated back

      parent.postMessage({
        cmd: 'api',
        source: apiSource,
        md5: md5(apiSource),
        apiMethodNames: apiMethodNames,
        apiMethodHelps: apiMethodHelps,
        values: values
      }, '*');
    }
  };

  module.exports = iframeApi;
}
