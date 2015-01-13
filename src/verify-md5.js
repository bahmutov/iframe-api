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
