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
