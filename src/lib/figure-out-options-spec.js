/* global describe, it */
var la = require('./la');

describe('figure-out-options', function () {
  var figure = require('./figure-out-options');

  var myApi = {};
  var noop = function () {};
  var options = {};

  it('detects single callback', function () {
    var params = figure(noop);
    la(typeof params === 'object');
    la(params.callback = noop);
  });

  it('detects my api and callback', function () {
    var params = figure(myApi, noop);
    la(params.callback === noop, 'found callback');
    la(params.myApi === myApi, 'found my api');
  });

  it('detects callback, options', function () {
    var params = figure(noop, options);
    la(!params.myApi, 'there is no api');
    la(params.callback === noop, 'found callback');
    la(params.options === options, 'found options');
  });

  it('detects myApi, callback, options', function () {
    var params = figure(myApi, noop, options);
    la(params.myApi === myApi, 'found api');
    la(params.callback === noop, 'found callback');
    la(params.options === options, 'found options');
  });
});
