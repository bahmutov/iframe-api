// include this from external website (the one that iframes)
// installs api object that can be used to execute code
// in iframe's context

var la = require('./la');
var apiMethods = require('./revive-api');
var figureOutOptions = require('./figure-out-options');

function iframeApi(myApi, cb, userOptions) {
  var params = figureOutOptions(myApi, cb, userOptions);
  la(params, 'could not figure out options');
  params.options = params.options || {};

  var frameApi;

  function processMessage(event) {

    if (event.data.cmd === 'api') {
      try {
        frameApi = apiMethods.reviveApi(params.options, event.data, event.source);

        if (params.myApi) {
          console.log('sending external api back to the frame');
          apiMethods.send(params.myApi, event.source);
        }

        // we no longer need to api method
        delete frameApi.api;
        setTimeout(function () {
          params.callback(null, frameApi);
        }, 0);
      } catch (err) {
        setTimeout(function () {
          params.callback(err);
        }, 0);
      }

      return;
    }

    if (params.myApi) {
      var method = params.myApi[event.data.cmd];
      if (typeof method === 'function') {
        // parent has a method iframe is trying to call
        method.apply(params.myApi, event.data.args);
      }
    }
  }

  window.onmessage = processMessage;
}

module.exports = iframeApi;
