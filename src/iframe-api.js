// to be run from <iframe src="..." ...></iframe>
(function (md5) {

  function isIframed() {
    return parent !== window;
  }

  if (!isIframed()) {
    // nothing to do, we are not inside an iframe
    return;
  }

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

  // actual methods to control our web application
  var commands = {
    message: function () {
      /* eslint no-alert:0 no-undef:0 */
      alert(toArray(arguments).join(' '));
    },
    api: function () {
      console.log('received parent api');
      /* jshint -W061 */
      /* eslint no-eval:0 */
      var options = arguments[0];
      la(typeof options === 'object', 'expected parent api options', options);
      la(typeof options.source === 'string', 'cannot find source', options);
      la(Array.isArray(options.methodNames), 'cannot find method names', options);
      window.parentApi = eval('(' + options.source + ')(options.methodNames)');
      console.log('you can make calls via parentApi object');
    },
    chart: function () {
    }
  };

  // explain what each API method does
  commands.message.help = 'Sends message to be displayed as a popup. api.message("hello", "world");';
  commands.chart.help = 'Change to display chart, api.chart([1, 2, 3])';

  // this function recreates the API object from source
  // TODO combine with similar function in external api
  function iframeApi(returnPort, methodNames, methodHelps) {
    function send(cmd) {
      returnPort.postMessage({
        cmd: cmd,
        args: Array.prototype.slice.call(arguments, 1)
      }, '*');
    }
    var api = {};
    methodNames.forEach(function (name) {
      api[name] = send.bind(null, name);
      if (methodHelps[name]) {
        api[name].help = methodHelps[name];
      }
    });

    return api;
  }

  function removeWhiteSpace(src) {
    la(src, 'missing source', src);
    return src.replace(/\s{2,}/g, '');
  }

  window.onload = function () {
    console.log('iframeApi is making an api call to parent');
    la(isIframed(), 'not iframed');

    var apiSource = iframeApi.toString();
    var apiMethodNames = Object.keys(commands);
    var apiMethodHelps = {};
    apiMethodNames.forEach(function (name) {
      var fn = commands[name];
      apiMethodHelps[name] = fn.help;
    });

    apiSource = removeWhiteSpace(apiSource);

    // TODO(gleb): validate that api source can be recreated back

    parent.postMessage({
      cmd: 'api',
      source: apiSource,
      md5: md5(apiSource),
      apiMethodNames: apiMethodNames,
      apiMethodHelps: apiMethodHelps
    }, '*');
  };

  window.onmessage = function (e) {
    if (!e.data || !e.data.cmd) {
      console.error('invalid message received by the iframe API', e.data);
      return;
    }

    var method = commands[e.data.cmd];
    if (typeof method === 'function') {
      var args = Array.isArray(e.data.args) ? e.data.args : [];
      method.apply(commands, args);
    } else {
      console.log('unknown command', e.data.cmd, 'from the parent', e.data.cmd);
    }
  };
}(window.md5));
