!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.iframeApi=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var la = require('./la');

function find(list, predicate, stopCriteria) {
  var k, n = list.length;
  for (k = 0; k < n; k += 1) {
    if (typeof stopCriteria === 'function') {
      if (stopCriteria(list[k], k)) {
        return;
      }
    }
    if (predicate(list[k])) {
      return list[k];
    }
  }
}

function remove(list, o) {
  if (!o) {
    return;
  }

  var k, n = list.length;
  for (k = 0; k < n; k += 1) {
    if (list[k] === o) {
      delete list[k];
      return o;
    }
  }
  throw new Error('Could not find object in the list ' + JSON.stringify(o));
}

function isFunction(x) {
  return typeof x === 'function';
}

function compose(f, g) {
  return function fg() {
    return f.call(null, g.apply(null, arguments));
  };
}

function isPlainObject(x) {
  return typeof x === 'object' && x.constructor === Object;
}

module.exports = function figureOutOptions() {
  var del = remove.bind(null, arguments);
  var search = find.bind(null, arguments);
  var removeFound = compose(del, search);

  var params = {};

  // todo replace with composition operator
  params.myApi = removeFound(isPlainObject, isFunction);

  params.callback = removeFound(isFunction);
  la(typeof params.callback === 'function', 'could not find callback function');

  params.options = removeFound(isPlainObject);

  return params;
};

},{"./la":3}],2:[function(require,module,exports){
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
  var figureOutOptions = require('./figure-out-options');

  var iframeApi = function iframeApi(myApi, cb, userOptions) {
    var params = figureOutOptions(myApi, cb, userOptions);

    la(typeof params.callback === 'function', 'need callback function', params);

    var receivedExternalApi = function receivedExternalApi(received) {
      /* jshint -W061 */
      /* eslint no-eval:0 */
      la(typeof received === 'object', 'expected parent api options', received);
      la(typeof received.source === 'string', 'cannot find source', received);
      la(Array.isArray(received.methodNames), 'cannot find method names', received);
      la(typeof received.values === 'object', 'cannot find api property values', received);

      var verifyMd5 = require('./verify-md5');
      verifyMd5(params.options, received);

      var api = eval('(' + received.source + ')(parent, received.methodNames, received.values)');

      console.log('got an api to the external site');
      setTimeout(function () {
        params.callback(null, api);
      }, 0);
    };

    function messageToApi(e) {
      if (!e.data || !e.data.cmd) {
        console.error('invalid message received by the iframe API', e.data);
        return;
      }

      if (e.data.cmd === 'api') {
        receivedExternalApi(e.data.args[0]);
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

    var md5 = require('./md5');
    la(typeof md5 === 'function', 'cannot find md5 function');
    window.onmessage = messageToApi;

    la(isIframed(), 'not iframed');

    if (params.myApi) {
      // placeholder for API method to send parent's api back to iframe
      params.myApi.api = function () {};

      var apiSource = reviveApi.toString();
      var apiMethodNames = Object.keys(params.myApi);
      var apiMethodHelps = {};
      // values for non-methods
      var values = {};

      apiMethodNames.forEach(function (name) {
        var fn = params.myApi[name];
        if (typeof fn === 'function') {
          apiMethodHelps[name] = fn.help;
        } else {
          values[name] = params.myApi[name];
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

},{"./figure-out-options":1,"./la":3,"./md5":4,"./minify":5,"./revive-api":6,"./verify-md5":8}],3:[function(require,module,exports){
var toArray = require('./to-array');

function la(condition) {
  if (!condition) {
    var msg = toArray(arguments);
    msg.shift();
    msg = msg.map(JSON.stringify);
    throw new Error(msg.join(' '));
  }
}

module.exports = la;

},{"./to-array":7}],4:[function(require,module,exports){
// utility - MD5 computation from
var md5 = (function md5init() {

  // taken from http://www.myersdaily.org/joseph/javascript/md5.js
  function md5cycle(x, k) {
    var a = x[0],
        b = x[1],
        c = x[2],
        d = x[3];

    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22, 1236535329);

    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);

    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);

    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);

    x[0] = add32(a, x[0]);
    x[1] = add32(b, x[1]);
    x[2] = add32(c, x[2]);
    x[3] = add32(d, x[3]);
  }

  function cmn(q, a, b, x, s, t) {
      a = add32(add32(a, q), add32(x, t));
      return add32((a << s) | (a >>> (32 - s)), b);
  }

  function ff(a, b, c, d, x, s, t) {
    return cmn((b & c) | ((~b) & d), a, b, x, s, t);
  }

  function gg(a, b, c, d, x, s, t) {
      return cmn((b & d) | (c & (~d)), a, b, x, s, t);
  }

  function hh(a, b, c, d, x, s, t) {
      return cmn(b ^ c ^ d, a, b, x, s, t);
  }

  function ii(a, b, c, d, x, s, t) {
      return cmn(c ^ (b | (~d)), a, b, x, s, t);
  }

  function md51(s) {
      txt = '';
      var n = s.length,
          state = [1732584193, -271733879, -1732584194, 271733878],
          i;
      for (i = 64; i <= s.length; i += 64) {
          md5cycle(state, md5blk(s.substring(i - 64, i)));
      }
      s = s.substring(i - 64);
      var tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      for (i = 0; i < s.length; i++) {
        tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
      }
      tail[i >> 2] |= 0x80 << ((i % 4) << 3);
      if (i > 55) {
        md5cycle(state, tail);
        for (i = 0; i < 16; i++) {
          tail[i] = 0;
        }
      }
      tail[14] = n * 8;
      md5cycle(state, tail);
      return state;
  }

  /* there needs to be support for Unicode here,
   * unless we pretend that we can redefine the MD-5
   * algorithm for multi-byte characters (perhaps
   * by adding every four 16-bit characters and
   * shortening the sum to 32 bits). Otherwise
   * I suggest performing MD-5 as if every character
   * was two bytes--e.g., 0040 0025 = @%--but then
   * how will an ordinary MD-5 sum be matched?
   * There is no way to standardize text to something
   * like UTF-8 before transformation; speed cost is
   * utterly prohibitive. The JavaScript standard
   * itself needs to look at this: it should start
   * providing access to strings as preformed UTF-8
   * 8-bit unsigned value arrays.
   */

  function md5blk(s) { /* I figured global was faster.   */
    var md5blks = [],
        i; /* Andy King said do it this way. */
    for (i = 0; i < 64; i += 4) {
      md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }

  var hex_chr = '0123456789abcdef'.split('');

  function rhex(n) {
      var s = '',
          j = 0;
      for (; j < 4; j++)
          s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] + hex_chr[(n >> (j * 8)) & 0x0F];
      return s;
  }

  function hex(x) {
      for (var i = 0; i < x.length; i++)
          x[i] = rhex(x[i]);
      return x.join('');
  }

  function md5(s) {
      return hex(md51(s));
  }

  return md5;
}());

/* this function is much faster,
so if possible we use it. Some IEs
are the only ones I know of that
need the idiotic second function,
generated by an if clause.  */

function add32(a, b) {
    return (a + b) & 0xFFFFFFFF;
}

if (md5('hello') != '5d41402abc4b2a76b9719d911017c592') {
    function add32(x, y) {
        var lsw = (x & 0xFFFF) + (y & 0xFFFF),
            msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xFFFF);
    }
}

module.exports = md5;

},{}],5:[function(require,module,exports){
var la = require('./la');
function removeWhiteSpace(src) {
  la(src, 'missing source', src);
  return src.replace(/\s{2,}/g, '');
}

module.exports = removeWhiteSpace;

},{"./la":3}],6:[function(require,module,exports){
function reviveApi(returnPort, methodNames, values, methodHelps) {
  values = values || {};
  methodHelps = methodHelps || {};

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

},{}],7:[function(require,module,exports){
function toArray(list) {
  return Array.prototype.slice.call(list, 0);
}
module.exports = toArray;

},{}],8:[function(require,module,exports){
var la = require('./la');
var md5 = require('./md5');

function verifyMd5(options, received) {
  options = options || {};
  received = received || {};

  var computedMD5;
  if (typeof options.md5 === 'boolean' && options.md5) {
    computedMD5 = md5(received.source);
    la(computedMD5 === received.md5,
      'computed MD5', computedMD5, 'does not match specified', received.md5);
  } else if (typeof options.md5 === 'string') {
    computedMD5 = md5(received.source);
    la(computedMD5 === options.md5,
      'computed MD5', computedMD5, 'does not match required', options.md5);
  }
}

module.exports = verifyMd5;

},{"./la":3,"./md5":4}]},{},[2])(2)
});