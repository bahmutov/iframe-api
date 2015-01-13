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
