var la = require('./la');
function removeWhiteSpace(src) {
  la(src, 'missing source', src);
  return src.replace(/\s{2,}/g, '');
}

module.exports = removeWhiteSpace;
