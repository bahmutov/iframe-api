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

    function verifyMd5(opts) {
      console.log('received iframe API, MD5', opts.md5);
      // you can verify that md5 of the src matches passed from
      var computedMD5;
      if (typeof options.md5 === 'boolean' && options.md5) {
        computedMD5 = md5(opts.source);
        la(computedMD5 === opts.md5,
          'computed MD5', computedMD5, 'does not match specified', opts.md5);
      } else if (typeof options.md5 === 'string') {
        computedMD5 = md5(opts.source);
        la(computedMD5 === options.md5,
          'computed MD5', computedMD5, 'does not match required', options.md5);
      }
    }

    // receives message (possibly from the iframe)
    function processMessage(event) {

      function reviveApi(opts) {
        verifyMd5(opts);

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

  window.iframeApi = iframeApi;
}(window.md5));
