// include this from external website (the one that iframes)
// installs api object that can be used to execute code
// in iframe's context

(function initIframeApi() {

  /* global console */

  function makeExternalApi(methodNames) {
    function send(cmd) {
      // parent is the window element from iframe
      parent.postMessage({
        cmd: cmd,
        args: Array.prototype.slice.call(arguments, 1)
      }, '*');
    }
    var api = {};
    methodNames.forEach(function (name) {
      api[name] = send.bind(null, name);
    });
    return api;
  }

  function iframeApi(externalApi, callback, options) {
    if (typeof externalApi === 'function') {
      options = callback;
      callback = externalApi;
      externalApi = null;
    }
    options = options || {};

    var frameApi;

    // receives message (possibly from the iframe)
    function processMessage(event) {
      console.log('parent received', event.data);

      function reviveApi(options) {
        console.log('received iframe API, MD5', options.md5);
        // you can verify that md5 of the src matches passed from
        /* jshint -W061 */
        /* eslint no-eval:0 */
        // event.source is the communication channel pointing at iframe
        // it allows posting messages back to the iframe
        return eval('(' + options.source + ')(event.source, options.apiMethodNames, options.apiMethodHelps)');
      }

      function sendExternalApi(frameApi) {
        if (externalApi) {
          console.log('sending external api back to the frame');
          frameApi.api({
            source: makeExternalApi.toString(),
            methodNames: Object.keys(externalApi)
          });
        }
      }

      if (event.data.cmd === 'api') {
        frameApi = reviveApi(event.data);
        sendExternalApi(frameApi);
        setTimeout(function () {
          callback(null, frameApi);
        }, 0);
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

  window.iframeApi = iframeApi;
}());
