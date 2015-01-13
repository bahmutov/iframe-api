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

  var iframeApi = function iframeApi(commands, callback) {
    console.log('creating iframe api');

    if (typeof commands === 'function') {
      callback = commands;
      commands = null;
    }

    function messageToApi(e) {
      if (!e.data || !e.data.cmd) {
        console.error('invalid message received by the iframe API', e.data);
        return;
      }

      if (e.data.cmd === 'api') {
        var options = e.data.args[0];
        console.log('received parent api with MD5', options.md5);

        /* jshint -W061 */
        /* eslint no-eval:0 */
        la(typeof options === 'object', 'expected parent api options', options);
        la(typeof options.source === 'string', 'cannot find source', options);
        la(Array.isArray(options.methodNames), 'cannot find method names', options);
        la(typeof options.values === 'object', 'cannot find api property values', options);

        var api = eval('(' + options.source + ')(options.methodNames, options.values)');
        console.log('got an api to the external site');
        setTimeout(function () {
          callback(null, api);
        }, 0);
        return;
      }

      if (commands) {
        var method = commands[e.data.cmd];
        if (typeof method === 'function') {
          var args = Array.isArray(e.data.args) ? e.data.args : [];
          method.apply(commands, args);
        } else {
          console.log('unknown command', e.data.cmd, 'from the parent', e.data.cmd);
        }
      }
    }

    var md5 = require('./md5');
    la(typeof md5 === 'function', 'cannot find md5 function');
    window.onmessage = messageToApi;

    la(isIframed(), 'not iframed');

    if (commands) {
      // placeholder for API method to send parent's api back to iframe
      commands.api = function () {};

      var apiSource = reviveApi.toString();
      var apiMethodNames = Object.keys(commands);
      var apiMethodHelps = {};
      // values for non-methods
      var values = {};

      apiMethodNames.forEach(function (name) {
        var fn = commands[name];
        if (typeof fn === 'function') {
          apiMethodHelps[name] = fn.help;
        } else {
          values[name] = commands[name];
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
