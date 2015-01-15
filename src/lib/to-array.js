function toArray(list) {
  return Array.prototype.slice.call(list, 0);
}
module.exports = toArray;
