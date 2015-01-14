// to be run from <iframe src="..." ...></iframe>

function isIframed() {
  return parent !== window;
}

var la = require('./la');
var apiMethods = require('./revive-api');
var figureOutOptions = require('./figure-out-options');

var iframeApi = function iframeApi(myApi, cb, userOptions) {
  var params = figureOutOptions(myApi, cb, userOptions);

  la(typeof params.callback === 'function', 'need callback function', params);

  function processMessage(e) {
    if (!e.data || !e.data.cmd) {
      console.error('invalid message received by the iframe API', e.data);
      return;
    }

    if (e.data.cmd === 'api') {
      try {
        var api = apiMethods.reviveApi(params.options, e.data, parent);

        if (!isIframed() && params.myApi) {
          console.log('sending external api back to the iframe');
          apiMethods.send(params.myApi, e.source);
        }

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

  window.onmessage = processMessage;

  if (isIframed() && params.myApi) {
    apiMethods.send(params.myApi, parent);
  }
};

module.exports = iframeApi;
