// include this from external website (the one that iframes)
// installs api object that can be used to execute code
// in iframe's context

(function initIframeApi(md5) {

  /* global console */

  function toArray(list) {
    return Array.prototype.slice.call(list, 0);
  }

  function la(condition) {
    if (!condition) {
      var msg = toArray(arguments);
      msg.shift();
      msg = msg.map(JSON.stringify);
      throw new Error(msg.join(' '));
    }
  }

  la(typeof md5 === 'function', 'cannot find md5 function');

  function makeExternalApi(methodNames, values) {
    function send(cmd) {
      // parent is the window element from iframe
      parent.postMessage({
        cmd: cmd,
        args: Array.prototype.slice.call(arguments, 1)
      }, '*');
    }
    var api = {};
    methodNames.forEach(function (name) {
      if (typeof values[name] !== 'undefined') {
        api[name] = values[name];
      } else {
        api[name] = send.bind(null, name);
      }
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
      // console.log('parent received', event.data);

      function reviveApi(options) {
        console.log('received iframe API, MD5', options.md5);
        // you can verify that md5 of the src matches passed from
        /* jshint -W061 */
        /* eslint no-eval:0 */
        // event.source is the communication channel pointing at iframe
        // it allows posting messages back to the iframe
        return eval('(' + options.source +
          ')(event.source, options.apiMethodNames, options.values, options.apiMethodHelps)');
      }

      function sendExternalApi(frameApi) {
        console.assert(frameApi, 'missing frame api');

        if (externalApi) {
          console.log('sending external api back to the frame');
          console.assert(typeof frameApi.api === 'function', 'missing frameApi.api', frameApi);

          var methodNames = Object.keys(externalApi);
          var source = makeExternalApi.toString();
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
        frameApi = reviveApi(event.data);
        sendExternalApi(frameApi);

        // we no longer need to api method
        delete frameApi.api;

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
}(window.md5));
