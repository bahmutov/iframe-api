// to be run from <iframe src="..." ...></iframe>

function isIframed() {
  return parent !== window;
}

if (isIframed()) {
  var la = require('./la');

  // this function recreates the API object from source
  // TODO combine with similar function in external api
  var apiMethods = require('./revive-api');
  la(typeof apiMethods.reviveApi === 'function',
    'missing revive api function');

  var figureOutOptions = require('./figure-out-options');

  var iframeApi = function iframeApi(myApi, cb, userOptions) {
    var params = figureOutOptions(myApi, cb, userOptions);

    la(typeof params.callback === 'function', 'need callback function', params);

    function messageToApi(e) {
      if (!e.data || !e.data.cmd) {
        console.error('invalid message received by the iframe API', e.data);
        return;
      }

      if (e.data.cmd === 'api') {
        try {
          var api = apiMethods.reviveApi(params.options, e.data, parent);
          setTimeout(function () {
            params.callback(null, api);
          }, 0);
        } catch (err) {
          setTimeout(function () {
            params.callback(err);
          }, 0);
        }

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

    window.onmessage = messageToApi;

    la(isIframed(), 'not iframed');

    if (params.myApi) {
      apiMethods.send(params.myApi, parent);
    }
  };

  module.exports = iframeApi;
}
