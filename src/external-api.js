// include this from external website (the one that iframes)
// installs api object that can be used to execute code
// in iframe's context

// this (parent) website API to be called from the iframe
var parentApi = {
  message: function () {
    /* eslint no-alert:0, no-undef:0 */
    alert(Array.prototype.slice.call(arguments, 0).join(' '));
  }
};

function externalApi() {
  function send(cmd) {
    parent.postMessage({
      cmd: cmd,
      args: Array.prototype.slice.call(arguments, 1)
    }, '*');
  }

  // the api should match closely parentApi object
  var api = {
    message: send.bind(null, 'message')
  };
  return api;
}

// receives message (possibly from the iframe)
window.onmessage = function (event) {
  console.log('parent received', event.data);

  function reviveApi(options) {
    console.log('received iframe API, MD5', options.md5);
    // you can verify that md5 of the src matches passed from
    /* jshint -W061 */
    /* eslint no-eval:0 */
    window.iframeApi = eval('(' + options.text + ')(event.source, options.apiMethodNames, options.apiMethodHelps)');
    console.log('You can now access iframe via iframeApi object');
  }

  function sendExternalApi() {
    window.iframeApi.api(externalApi.toString());
  }

  if (event.data.cmd === 'api') {
    reviveApi(event.data);
    sendExternalApi();
    return;
  }

  var method = parentApi[event.data.cmd];
  if (typeof method === 'function') {
    // parent has a method iframe is trying to call
    method.apply(parentApi, event.data.args);
  }
};
