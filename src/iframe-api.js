require('es6-promise').polyfill();

function isIframed() {
  return parent !== window;
}

var apiMethods = require('./api-methods');

var iframeApi = function iframeApi(myApi, userOptions) {
  var params = {
    myApi: myApi,
    options: userOptions || {}
  };
  var log = params.options.debug || params.options.verbose ?
    console.log.bind(console) : function noop() {};

  return new Promise(function (resolve, reject) {

    function processMessage(e) {
      if (!e.data || !e.data.cmd) {
        log('invalid message received by the iframe API', e.data);
        return;
      }
      if (e.data.cmd === 'api') {
        try {
          var api = apiMethods.reviveApi(params.options, e.data, e.source);
          if (!isIframed() && params.myApi) {
            log('sending external api back to the iframe');
            apiMethods.send(params.myApi, e.source);
          }
          resolve(api);
        } catch (err) {
          reject(err);
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
    window.addEventListener('message', processMessage);

    if (isIframed() && params.myApi) {
      apiMethods.send(params.myApi, parent);
    }
  });
};

module.exports = iframeApi;
