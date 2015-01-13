function reviveApi(returnPort, methodNames, values, methodHelps) {
  function send(cmd) {
    returnPort.postMessage({
      cmd: cmd,
      args: Array.prototype.slice.call(arguments, 1)
    }, '*');
  }
  var api = {};
  methodNames.forEach(function (name) {
    if (values[name]) {
      api[name] = values[name];
    } else {
      api[name] = send.bind(null, name);
    }
    if (methodHelps[name]) {
      api[name].help = methodHelps[name];
    }
  });

  return api;
}

module.exports = reviveApi;
