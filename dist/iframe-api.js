!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.iframeApi=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process,global){
/*!
 * @overview es6-promise - a tiny implementation of Promises/A+.
 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/jakearchibald/es6-promise/master/LICENSE
 * @version   2.0.1
 */

(function() {
    "use strict";

    function $$utils$$objectOrFunction(x) {
      return typeof x === 'function' || (typeof x === 'object' && x !== null);
    }

    function $$utils$$isFunction(x) {
      return typeof x === 'function';
    }

    function $$utils$$isMaybeThenable(x) {
      return typeof x === 'object' && x !== null;
    }

    var $$utils$$_isArray;

    if (!Array.isArray) {
      $$utils$$_isArray = function (x) {
        return Object.prototype.toString.call(x) === '[object Array]';
      };
    } else {
      $$utils$$_isArray = Array.isArray;
    }

    var $$utils$$isArray = $$utils$$_isArray;
    var $$utils$$now = Date.now || function() { return new Date().getTime(); };
    function $$utils$$F() { }

    var $$utils$$o_create = (Object.create || function (o) {
      if (arguments.length > 1) {
        throw new Error('Second argument not supported');
      }
      if (typeof o !== 'object') {
        throw new TypeError('Argument must be an object');
      }
      $$utils$$F.prototype = o;
      return new $$utils$$F();
    });

    var $$asap$$len = 0;

    var $$asap$$default = function asap(callback, arg) {
      $$asap$$queue[$$asap$$len] = callback;
      $$asap$$queue[$$asap$$len + 1] = arg;
      $$asap$$len += 2;
      if ($$asap$$len === 2) {
        // If len is 1, that means that we need to schedule an async flush.
        // If additional callbacks are queued before the queue is flushed, they
        // will be processed by this flush that we are scheduling.
        $$asap$$scheduleFlush();
      }
    };

    var $$asap$$browserGlobal = (typeof window !== 'undefined') ? window : {};
    var $$asap$$BrowserMutationObserver = $$asap$$browserGlobal.MutationObserver || $$asap$$browserGlobal.WebKitMutationObserver;

    // test for web worker but not in IE10
    var $$asap$$isWorker = typeof Uint8ClampedArray !== 'undefined' &&
      typeof importScripts !== 'undefined' &&
      typeof MessageChannel !== 'undefined';

    // node
    function $$asap$$useNextTick() {
      return function() {
        process.nextTick($$asap$$flush);
      };
    }

    function $$asap$$useMutationObserver() {
      var iterations = 0;
      var observer = new $$asap$$BrowserMutationObserver($$asap$$flush);
      var node = document.createTextNode('');
      observer.observe(node, { characterData: true });

      return function() {
        node.data = (iterations = ++iterations % 2);
      };
    }

    // web worker
    function $$asap$$useMessageChannel() {
      var channel = new MessageChannel();
      channel.port1.onmessage = $$asap$$flush;
      return function () {
        channel.port2.postMessage(0);
      };
    }

    function $$asap$$useSetTimeout() {
      return function() {
        setTimeout($$asap$$flush, 1);
      };
    }

    var $$asap$$queue = new Array(1000);

    function $$asap$$flush() {
      for (var i = 0; i < $$asap$$len; i+=2) {
        var callback = $$asap$$queue[i];
        var arg = $$asap$$queue[i+1];

        callback(arg);

        $$asap$$queue[i] = undefined;
        $$asap$$queue[i+1] = undefined;
      }

      $$asap$$len = 0;
    }

    var $$asap$$scheduleFlush;

    // Decide what async method to use to triggering processing of queued callbacks:
    if (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]') {
      $$asap$$scheduleFlush = $$asap$$useNextTick();
    } else if ($$asap$$BrowserMutationObserver) {
      $$asap$$scheduleFlush = $$asap$$useMutationObserver();
    } else if ($$asap$$isWorker) {
      $$asap$$scheduleFlush = $$asap$$useMessageChannel();
    } else {
      $$asap$$scheduleFlush = $$asap$$useSetTimeout();
    }

    function $$$internal$$noop() {}
    var $$$internal$$PENDING   = void 0;
    var $$$internal$$FULFILLED = 1;
    var $$$internal$$REJECTED  = 2;
    var $$$internal$$GET_THEN_ERROR = new $$$internal$$ErrorObject();

    function $$$internal$$selfFullfillment() {
      return new TypeError("You cannot resolve a promise with itself");
    }

    function $$$internal$$cannotReturnOwn() {
      return new TypeError('A promises callback cannot return that same promise.')
    }

    function $$$internal$$getThen(promise) {
      try {
        return promise.then;
      } catch(error) {
        $$$internal$$GET_THEN_ERROR.error = error;
        return $$$internal$$GET_THEN_ERROR;
      }
    }

    function $$$internal$$tryThen(then, value, fulfillmentHandler, rejectionHandler) {
      try {
        then.call(value, fulfillmentHandler, rejectionHandler);
      } catch(e) {
        return e;
      }
    }

    function $$$internal$$handleForeignThenable(promise, thenable, then) {
       $$asap$$default(function(promise) {
        var sealed = false;
        var error = $$$internal$$tryThen(then, thenable, function(value) {
          if (sealed) { return; }
          sealed = true;
          if (thenable !== value) {
            $$$internal$$resolve(promise, value);
          } else {
            $$$internal$$fulfill(promise, value);
          }
        }, function(reason) {
          if (sealed) { return; }
          sealed = true;

          $$$internal$$reject(promise, reason);
        }, 'Settle: ' + (promise._label || ' unknown promise'));

        if (!sealed && error) {
          sealed = true;
          $$$internal$$reject(promise, error);
        }
      }, promise);
    }

    function $$$internal$$handleOwnThenable(promise, thenable) {
      if (thenable._state === $$$internal$$FULFILLED) {
        $$$internal$$fulfill(promise, thenable._result);
      } else if (promise._state === $$$internal$$REJECTED) {
        $$$internal$$reject(promise, thenable._result);
      } else {
        $$$internal$$subscribe(thenable, undefined, function(value) {
          $$$internal$$resolve(promise, value);
        }, function(reason) {
          $$$internal$$reject(promise, reason);
        });
      }
    }

    function $$$internal$$handleMaybeThenable(promise, maybeThenable) {
      if (maybeThenable.constructor === promise.constructor) {
        $$$internal$$handleOwnThenable(promise, maybeThenable);
      } else {
        var then = $$$internal$$getThen(maybeThenable);

        if (then === $$$internal$$GET_THEN_ERROR) {
          $$$internal$$reject(promise, $$$internal$$GET_THEN_ERROR.error);
        } else if (then === undefined) {
          $$$internal$$fulfill(promise, maybeThenable);
        } else if ($$utils$$isFunction(then)) {
          $$$internal$$handleForeignThenable(promise, maybeThenable, then);
        } else {
          $$$internal$$fulfill(promise, maybeThenable);
        }
      }
    }

    function $$$internal$$resolve(promise, value) {
      if (promise === value) {
        $$$internal$$reject(promise, $$$internal$$selfFullfillment());
      } else if ($$utils$$objectOrFunction(value)) {
        $$$internal$$handleMaybeThenable(promise, value);
      } else {
        $$$internal$$fulfill(promise, value);
      }
    }

    function $$$internal$$publishRejection(promise) {
      if (promise._onerror) {
        promise._onerror(promise._result);
      }

      $$$internal$$publish(promise);
    }

    function $$$internal$$fulfill(promise, value) {
      if (promise._state !== $$$internal$$PENDING) { return; }

      promise._result = value;
      promise._state = $$$internal$$FULFILLED;

      if (promise._subscribers.length === 0) {
      } else {
        $$asap$$default($$$internal$$publish, promise);
      }
    }

    function $$$internal$$reject(promise, reason) {
      if (promise._state !== $$$internal$$PENDING) { return; }
      promise._state = $$$internal$$REJECTED;
      promise._result = reason;

      $$asap$$default($$$internal$$publishRejection, promise);
    }

    function $$$internal$$subscribe(parent, child, onFulfillment, onRejection) {
      var subscribers = parent._subscribers;
      var length = subscribers.length;

      parent._onerror = null;

      subscribers[length] = child;
      subscribers[length + $$$internal$$FULFILLED] = onFulfillment;
      subscribers[length + $$$internal$$REJECTED]  = onRejection;

      if (length === 0 && parent._state) {
        $$asap$$default($$$internal$$publish, parent);
      }
    }

    function $$$internal$$publish(promise) {
      var subscribers = promise._subscribers;
      var settled = promise._state;

      if (subscribers.length === 0) { return; }

      var child, callback, detail = promise._result;

      for (var i = 0; i < subscribers.length; i += 3) {
        child = subscribers[i];
        callback = subscribers[i + settled];

        if (child) {
          $$$internal$$invokeCallback(settled, child, callback, detail);
        } else {
          callback(detail);
        }
      }

      promise._subscribers.length = 0;
    }

    function $$$internal$$ErrorObject() {
      this.error = null;
    }

    var $$$internal$$TRY_CATCH_ERROR = new $$$internal$$ErrorObject();

    function $$$internal$$tryCatch(callback, detail) {
      try {
        return callback(detail);
      } catch(e) {
        $$$internal$$TRY_CATCH_ERROR.error = e;
        return $$$internal$$TRY_CATCH_ERROR;
      }
    }

    function $$$internal$$invokeCallback(settled, promise, callback, detail) {
      var hasCallback = $$utils$$isFunction(callback),
          value, error, succeeded, failed;

      if (hasCallback) {
        value = $$$internal$$tryCatch(callback, detail);

        if (value === $$$internal$$TRY_CATCH_ERROR) {
          failed = true;
          error = value.error;
          value = null;
        } else {
          succeeded = true;
        }

        if (promise === value) {
          $$$internal$$reject(promise, $$$internal$$cannotReturnOwn());
          return;
        }

      } else {
        value = detail;
        succeeded = true;
      }

      if (promise._state !== $$$internal$$PENDING) {
        // noop
      } else if (hasCallback && succeeded) {
        $$$internal$$resolve(promise, value);
      } else if (failed) {
        $$$internal$$reject(promise, error);
      } else if (settled === $$$internal$$FULFILLED) {
        $$$internal$$fulfill(promise, value);
      } else if (settled === $$$internal$$REJECTED) {
        $$$internal$$reject(promise, value);
      }
    }

    function $$$internal$$initializePromise(promise, resolver) {
      try {
        resolver(function resolvePromise(value){
          $$$internal$$resolve(promise, value);
        }, function rejectPromise(reason) {
          $$$internal$$reject(promise, reason);
        });
      } catch(e) {
        $$$internal$$reject(promise, e);
      }
    }

    function $$$enumerator$$makeSettledResult(state, position, value) {
      if (state === $$$internal$$FULFILLED) {
        return {
          state: 'fulfilled',
          value: value
        };
      } else {
        return {
          state: 'rejected',
          reason: value
        };
      }
    }

    function $$$enumerator$$Enumerator(Constructor, input, abortOnReject, label) {
      this._instanceConstructor = Constructor;
      this.promise = new Constructor($$$internal$$noop, label);
      this._abortOnReject = abortOnReject;

      if (this._validateInput(input)) {
        this._input     = input;
        this.length     = input.length;
        this._remaining = input.length;

        this._init();

        if (this.length === 0) {
          $$$internal$$fulfill(this.promise, this._result);
        } else {
          this.length = this.length || 0;
          this._enumerate();
          if (this._remaining === 0) {
            $$$internal$$fulfill(this.promise, this._result);
          }
        }
      } else {
        $$$internal$$reject(this.promise, this._validationError());
      }
    }

    $$$enumerator$$Enumerator.prototype._validateInput = function(input) {
      return $$utils$$isArray(input);
    };

    $$$enumerator$$Enumerator.prototype._validationError = function() {
      return new Error('Array Methods must be provided an Array');
    };

    $$$enumerator$$Enumerator.prototype._init = function() {
      this._result = new Array(this.length);
    };

    var $$$enumerator$$default = $$$enumerator$$Enumerator;

    $$$enumerator$$Enumerator.prototype._enumerate = function() {
      var length  = this.length;
      var promise = this.promise;
      var input   = this._input;

      for (var i = 0; promise._state === $$$internal$$PENDING && i < length; i++) {
        this._eachEntry(input[i], i);
      }
    };

    $$$enumerator$$Enumerator.prototype._eachEntry = function(entry, i) {
      var c = this._instanceConstructor;
      if ($$utils$$isMaybeThenable(entry)) {
        if (entry.constructor === c && entry._state !== $$$internal$$PENDING) {
          entry._onerror = null;
          this._settledAt(entry._state, i, entry._result);
        } else {
          this._willSettleAt(c.resolve(entry), i);
        }
      } else {
        this._remaining--;
        this._result[i] = this._makeResult($$$internal$$FULFILLED, i, entry);
      }
    };

    $$$enumerator$$Enumerator.prototype._settledAt = function(state, i, value) {
      var promise = this.promise;

      if (promise._state === $$$internal$$PENDING) {
        this._remaining--;

        if (this._abortOnReject && state === $$$internal$$REJECTED) {
          $$$internal$$reject(promise, value);
        } else {
          this._result[i] = this._makeResult(state, i, value);
        }
      }

      if (this._remaining === 0) {
        $$$internal$$fulfill(promise, this._result);
      }
    };

    $$$enumerator$$Enumerator.prototype._makeResult = function(state, i, value) {
      return value;
    };

    $$$enumerator$$Enumerator.prototype._willSettleAt = function(promise, i) {
      var enumerator = this;

      $$$internal$$subscribe(promise, undefined, function(value) {
        enumerator._settledAt($$$internal$$FULFILLED, i, value);
      }, function(reason) {
        enumerator._settledAt($$$internal$$REJECTED, i, reason);
      });
    };

    var $$promise$all$$default = function all(entries, label) {
      return new $$$enumerator$$default(this, entries, true /* abort on reject */, label).promise;
    };

    var $$promise$race$$default = function race(entries, label) {
      /*jshint validthis:true */
      var Constructor = this;

      var promise = new Constructor($$$internal$$noop, label);

      if (!$$utils$$isArray(entries)) {
        $$$internal$$reject(promise, new TypeError('You must pass an array to race.'));
        return promise;
      }

      var length = entries.length;

      function onFulfillment(value) {
        $$$internal$$resolve(promise, value);
      }

      function onRejection(reason) {
        $$$internal$$reject(promise, reason);
      }

      for (var i = 0; promise._state === $$$internal$$PENDING && i < length; i++) {
        $$$internal$$subscribe(Constructor.resolve(entries[i]), undefined, onFulfillment, onRejection);
      }

      return promise;
    };

    var $$promise$resolve$$default = function resolve(object, label) {
      /*jshint validthis:true */
      var Constructor = this;

      if (object && typeof object === 'object' && object.constructor === Constructor) {
        return object;
      }

      var promise = new Constructor($$$internal$$noop, label);
      $$$internal$$resolve(promise, object);
      return promise;
    };

    var $$promise$reject$$default = function reject(reason, label) {
      /*jshint validthis:true */
      var Constructor = this;
      var promise = new Constructor($$$internal$$noop, label);
      $$$internal$$reject(promise, reason);
      return promise;
    };

    var $$es6$promise$promise$$counter = 0;

    function $$es6$promise$promise$$needsResolver() {
      throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
    }

    function $$es6$promise$promise$$needsNew() {
      throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
    }

    var $$es6$promise$promise$$default = $$es6$promise$promise$$Promise;

    /**
      Promise objects represent the eventual result of an asynchronous operation. The
      primary way of interacting with a promise is through its `then` method, which
      registers callbacks to receive either a promise’s eventual value or the reason
      why the promise cannot be fulfilled.

      Terminology
      -----------

      - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
      - `thenable` is an object or function that defines a `then` method.
      - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
      - `exception` is a value that is thrown using the throw statement.
      - `reason` is a value that indicates why a promise was rejected.
      - `settled` the final resting state of a promise, fulfilled or rejected.

      A promise can be in one of three states: pending, fulfilled, or rejected.

      Promises that are fulfilled have a fulfillment value and are in the fulfilled
      state.  Promises that are rejected have a rejection reason and are in the
      rejected state.  A fulfillment value is never a thenable.

      Promises can also be said to *resolve* a value.  If this value is also a
      promise, then the original promise's settled state will match the value's
      settled state.  So a promise that *resolves* a promise that rejects will
      itself reject, and a promise that *resolves* a promise that fulfills will
      itself fulfill.


      Basic Usage:
      ------------

      ```js
      var promise = new Promise(function(resolve, reject) {
        // on success
        resolve(value);

        // on failure
        reject(reason);
      });

      promise.then(function(value) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Advanced Usage:
      ---------------

      Promises shine when abstracting away asynchronous interactions such as
      `XMLHttpRequest`s.

      ```js
      function getJSON(url) {
        return new Promise(function(resolve, reject){
          var xhr = new XMLHttpRequest();

          xhr.open('GET', url);
          xhr.onreadystatechange = handler;
          xhr.responseType = 'json';
          xhr.setRequestHeader('Accept', 'application/json');
          xhr.send();

          function handler() {
            if (this.readyState === this.DONE) {
              if (this.status === 200) {
                resolve(this.response);
              } else {
                reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
              }
            }
          };
        });
      }

      getJSON('/posts.json').then(function(json) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Unlike callbacks, promises are great composable primitives.

      ```js
      Promise.all([
        getJSON('/posts'),
        getJSON('/comments')
      ]).then(function(values){
        values[0] // => postsJSON
        values[1] // => commentsJSON

        return values;
      });
      ```

      @class Promise
      @param {function} resolver
      Useful for tooling.
      @constructor
    */
    function $$es6$promise$promise$$Promise(resolver) {
      this._id = $$es6$promise$promise$$counter++;
      this._state = undefined;
      this._result = undefined;
      this._subscribers = [];

      if ($$$internal$$noop !== resolver) {
        if (!$$utils$$isFunction(resolver)) {
          $$es6$promise$promise$$needsResolver();
        }

        if (!(this instanceof $$es6$promise$promise$$Promise)) {
          $$es6$promise$promise$$needsNew();
        }

        $$$internal$$initializePromise(this, resolver);
      }
    }

    $$es6$promise$promise$$Promise.all = $$promise$all$$default;
    $$es6$promise$promise$$Promise.race = $$promise$race$$default;
    $$es6$promise$promise$$Promise.resolve = $$promise$resolve$$default;
    $$es6$promise$promise$$Promise.reject = $$promise$reject$$default;

    $$es6$promise$promise$$Promise.prototype = {
      constructor: $$es6$promise$promise$$Promise,

    /**
      The primary way of interacting with a promise is through its `then` method,
      which registers callbacks to receive either a promise's eventual value or the
      reason why the promise cannot be fulfilled.

      ```js
      findUser().then(function(user){
        // user is available
      }, function(reason){
        // user is unavailable, and you are given the reason why
      });
      ```

      Chaining
      --------

      The return value of `then` is itself a promise.  This second, 'downstream'
      promise is resolved with the return value of the first promise's fulfillment
      or rejection handler, or rejected if the handler throws an exception.

      ```js
      findUser().then(function (user) {
        return user.name;
      }, function (reason) {
        return 'default name';
      }).then(function (userName) {
        // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
        // will be `'default name'`
      });

      findUser().then(function (user) {
        throw new Error('Found user, but still unhappy');
      }, function (reason) {
        throw new Error('`findUser` rejected and we're unhappy');
      }).then(function (value) {
        // never reached
      }, function (reason) {
        // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
        // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
      });
      ```
      If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.

      ```js
      findUser().then(function (user) {
        throw new PedagogicalException('Upstream error');
      }).then(function (value) {
        // never reached
      }).then(function (value) {
        // never reached
      }, function (reason) {
        // The `PedgagocialException` is propagated all the way down to here
      });
      ```

      Assimilation
      ------------

      Sometimes the value you want to propagate to a downstream promise can only be
      retrieved asynchronously. This can be achieved by returning a promise in the
      fulfillment or rejection handler. The downstream promise will then be pending
      until the returned promise is settled. This is called *assimilation*.

      ```js
      findUser().then(function (user) {
        return findCommentsByAuthor(user);
      }).then(function (comments) {
        // The user's comments are now available
      });
      ```

      If the assimliated promise rejects, then the downstream promise will also reject.

      ```js
      findUser().then(function (user) {
        return findCommentsByAuthor(user);
      }).then(function (comments) {
        // If `findCommentsByAuthor` fulfills, we'll have the value here
      }, function (reason) {
        // If `findCommentsByAuthor` rejects, we'll have the reason here
      });
      ```

      Simple Example
      --------------

      Synchronous Example

      ```javascript
      var result;

      try {
        result = findResult();
        // success
      } catch(reason) {
        // failure
      }
      ```

      Errback Example

      ```js
      findResult(function(result, err){
        if (err) {
          // failure
        } else {
          // success
        }
      });
      ```

      Promise Example;

      ```javascript
      findResult().then(function(result){
        // success
      }, function(reason){
        // failure
      });
      ```

      Advanced Example
      --------------

      Synchronous Example

      ```javascript
      var author, books;

      try {
        author = findAuthor();
        books  = findBooksByAuthor(author);
        // success
      } catch(reason) {
        // failure
      }
      ```

      Errback Example

      ```js

      function foundBooks(books) {

      }

      function failure(reason) {

      }

      findAuthor(function(author, err){
        if (err) {
          failure(err);
          // failure
        } else {
          try {
            findBoooksByAuthor(author, function(books, err) {
              if (err) {
                failure(err);
              } else {
                try {
                  foundBooks(books);
                } catch(reason) {
                  failure(reason);
                }
              }
            });
          } catch(error) {
            failure(err);
          }
          // success
        }
      });
      ```

      Promise Example;

      ```javascript
      findAuthor().
        then(findBooksByAuthor).
        then(function(books){
          // found books
      }).catch(function(reason){
        // something went wrong
      });
      ```

      @method then
      @param {Function} onFulfilled
      @param {Function} onRejected
      Useful for tooling.
      @return {Promise}
    */
      then: function(onFulfillment, onRejection) {
        var parent = this;
        var state = parent._state;

        if (state === $$$internal$$FULFILLED && !onFulfillment || state === $$$internal$$REJECTED && !onRejection) {
          return this;
        }

        var child = new this.constructor($$$internal$$noop);
        var result = parent._result;

        if (state) {
          var callback = arguments[state - 1];
          $$asap$$default(function(){
            $$$internal$$invokeCallback(state, child, callback, result);
          });
        } else {
          $$$internal$$subscribe(parent, child, onFulfillment, onRejection);
        }

        return child;
      },

    /**
      `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
      as the catch block of a try/catch statement.

      ```js
      function findAuthor(){
        throw new Error('couldn't find that author');
      }

      // synchronous
      try {
        findAuthor();
      } catch(reason) {
        // something went wrong
      }

      // async with promises
      findAuthor().catch(function(reason){
        // something went wrong
      });
      ```

      @method catch
      @param {Function} onRejection
      Useful for tooling.
      @return {Promise}
    */
      'catch': function(onRejection) {
        return this.then(null, onRejection);
      }
    };

    var $$es6$promise$polyfill$$default = function polyfill() {
      var local;

      if (typeof global !== 'undefined') {
        local = global;
      } else if (typeof window !== 'undefined' && window.document) {
        local = window;
      } else {
        local = self;
      }

      var es6PromiseSupport =
        "Promise" in local &&
        // Some of these methods are missing from
        // Firefox/Chrome experimental implementations
        "resolve" in local.Promise &&
        "reject" in local.Promise &&
        "all" in local.Promise &&
        "race" in local.Promise &&
        // Older version of the spec had a resolver object
        // as the arg rather than a function
        (function() {
          var resolve;
          new local.Promise(function(r) { resolve = r; });
          return $$utils$$isFunction(resolve);
        }());

      if (!es6PromiseSupport) {
        local.Promise = $$es6$promise$promise$$default;
      }
    };

    var es6$promise$umd$$ES6Promise = {
      'Promise': $$es6$promise$promise$$default,
      'polyfill': $$es6$promise$polyfill$$default
    };

    /* global define:true module:true window: true */
    if (typeof define === 'function' && define['amd']) {
      define(function() { return es6$promise$umd$$ES6Promise; });
    } else if (typeof module !== 'undefined' && module['exports']) {
      module['exports'] = es6$promise$umd$$ES6Promise;
    } else if (typeof this !== 'undefined') {
      this['ES6Promise'] = es6$promise$umd$$ES6Promise;
    }
}).call(this);
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":2}],2:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canMutationObserver = typeof window !== 'undefined'
    && window.MutationObserver;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    var queue = [];

    if (canMutationObserver) {
        var hiddenDiv = document.createElement("div");
        var observer = new MutationObserver(function () {
            var queueList = queue.slice();
            queue.length = 0;
            queueList.forEach(function (fn) {
                fn();
            });
        });

        observer.observe(hiddenDiv, { attributes: true });

        return function nextTick(fn) {
            if (!queue.length) {
                hiddenDiv.setAttribute('yes', 'no');
            }
            queue.push(fn);
        };
    }

    if (canPost) {
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],3:[function(require,module,exports){
require('es6-promise').polyfill();

/* eslint no-use-before-define:0 */
function open(envelope) {
  console.log('opening envelope', envelope);

  if (envelope.replies) {
    console.log('this envelope is a reply', envelope.replies);
    console.log(stamp.__deferred);
    var defer = stamp.__deferred[envelope.stamp];
    if (defer) {
      console.log('received response', envelope);
      var letter = envelope.payload;
      if (typeof defer.resolve !== 'function') {
        throw new Error('missing resolve method for ' + envelope.stamp);
      }
      console.log('resolving with payload', letter, 'for stamp', envelope.stamp);
      delete envelope.stamp;
      delete stamp.__deferred[envelope.stamp];

      // TODO handle errors by calling defer.reject
      // if (!letter) {
      // throw new Error('missing payload in', envelope);
      // }

      defer.resolve(letter);
      console.log('after resolve');
      return;
    }
  }

  console.log('returning payload from envelope', envelope);
  return envelope.payload;
}

function hasBeenStamped(cargo) {
  return cargo && cargo.stamp;
}

function deliver(mailman, address, data) {

  var cargo = data;
  if (!hasBeenStamped(cargo)) {
    id += 1;
    cargo = {
      payload: data,
      stamp: String(id),
      replies: 0
    };
  } else {
    if (typeof cargo.replies !== 'number') {
      throw new Error('Cannot find replies property ' + JSON.stringify(cargo));
    }
    cargo.replies += 1;
  }

  setTimeout(function () {
    mailman(address, cargo);
  }, 0);

  return new Promise(function (resolve, reject) {
    stamp.__deferred[cargo.stamp] = {
      resolve: resolve.bind(this),
      reject: reject.bind(this)
    };
  });
}

function stamp(mailman, address, data) {
  // console.log(arguments);

  if (typeof mailman === 'function') {
    return deliver(mailman, address, data);
  } else if (arguments.length === 2 && hasBeenStamped(mailman)) {
    var envelope = mailman;
    console.log('resealing envelope', envelope);
    data = address;
    envelope.payload = data;
    return envelope;
  } else if (arguments.length === 1 && hasBeenStamped(mailman)) {
    console.log('opening envelope?', mailman);
    if (arguments.length !== 1 ||
      typeof mailman !== 'object') {
      throw new Error('expected just data ' + JSON.stringify(arguments));
    }
    return open(mailman);
  }

  // do not have an envelope or stamp
  if (data && data.payload) {
    return data.payload;
  }
  return data;
}

stamp.is = function is(data) {
  return hasBeenStamped(data);
};

var id = 0;
stamp.__deferred = {};

module.exports = stamp;

},{"es6-promise":1}],4:[function(require,module,exports){
require('es6-promise').polyfill();

function isIframed() {
  return parent !== window;
}

var apiMethods = require('./lib/api-methods');
var la = require('./lib/la');
var stamp = require('./lib/post-stamp');
var selfAddressed = require('self-addressed');

var iframeApi = function iframeApi(myApi, userOptions) {
  var params = {
    myApi: myApi,
    options: userOptions || {}
  };
  var log = params.options.debug || params.options.verbose ?
    console.log.bind(console) : function noop() {};

  return new Promise(function (resolve, reject) {

    function handshake(callerOptions, port) {
      console.log('handshake with caller', JSON.stringify(callerOptions));
      if (!isIframed()) {
        log('responding to handshake');
        apiMethods.handshake(port, params.options);
      }
    }

    function receiveApi(received, port) {
      try {
        var api = apiMethods.reviveApi(params.options, received, port);
        if (!isIframed() && params.myApi) {
          log('sending external api back to the iframe');
          apiMethods.send(params.myApi, port, params.options);
        }
        resolve(api);
      } catch (err) {
        reject(err);
      }
    }

    function callApiMethod(data) {
      var cmd = data.cmd;
      var args = data.args;
      la(typeof cmd === 'string', 'missing command string', cmd);
      if (!Array.isArray(args)) {
        args = [];
      }

      if (params.myApi) {
        var method = params.myApi[cmd];
        if (typeof method === 'function') {
          var result = method.apply(params.myApi, args);
          log('method', cmd, 'result', JSON.stringify(result));
          return result;
        } else {
          log('unknown command', cmd, 'from the parent');
        }
      }
    }

    function processMessage(e) {
      la(e.data, 'expected message with data');
      var data = e.data.payload ? e.data.payload : e.data;

      if (!data || !data.cmd) {
        var msg = 'invalid message received by the iframe API';
        log(msg);
        throw new Error(msg);
      }

      if (selfAddressed.is(e.data)) {
        log('received envelope from the other side', e.data);
        var letter = selfAddressed(e.data);
        if (!letter) {
          log('nothing to do for envelope', e.data);
        }
      }

      switch (data.cmd) {
        case '__handshake': {
          return handshake(data, e.source);
        }
        case '__api': {
          return receiveApi(data, e.source);
        }
        case '__method_response': {
          la(e.data.stamp, 'missing return stamp', e.data);
          log('received response', data.args[0], 'to command', e.data.stamp);
          return stamp(e.data);
        }
        default: {
          var result = callApiMethod(data, e);
          apiMethods.respond(e.source, e.data, result);
        }
      }

    }
    window.addEventListener('message', processMessage);

    if (isIframed() && params.myApi) {
      apiMethods.handshake(parent, params.options)
        .then(function (optionsFromOtherSide) {
          var api = typeof params.myApi === 'function' ? params.myApi(optionsFromOtherSide) : params.myApi;
          apiMethods.send(api, parent, params.options);
        });
      // apiMethods.send(params.myApi, parent, params.options);
      /*
        TODO switch to promise-returning handshake
        apiMethods.handshake(parent, params.options)
      */
    }
  });
};

module.exports = iframeApi;

},{"./lib/api-methods":5,"./lib/la":6,"./lib/post-stamp":9,"es6-promise":1,"self-addressed":3}],5:[function(require,module,exports){
var verifyMd5 = require('./verify-md5');
var la = require('./la');
// var stamp = require('./post-stamp');
var selfAddressed = require('self-addressed');

function post(port, msg) {
  port.postMessage(msg, '*');
}

/* eslint no-new:0 */
function apiFactory(port, methodNames, values, methodHelps) {
  values = values || {};
  methodHelps = methodHelps || {};

  if (typeof port.postMessage !== 'function') {
    throw new Error('Invalid port - does not have postMessage');
  }

  // var sendTo = stamp.bind(null, post, port);

  function send(cmd) {
    return post({
      cmd: cmd,
      args: Array.prototype.slice.call(arguments, 1)
    });
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

var md5 = require('./md5');
la(typeof md5 === 'function', 'cannot find md5 function');
var minify = require('./minify');

function sendApi(api, target, options) {
  la(target && target.postMessage, 'missing target postMessage function');
  options = options || {};

  var apiSource = apiFactory.toString();
  var methodNames = Object.keys(api);
  var methodHelps = {};
  // values for non-methods
  var values = {};

  methodNames.forEach(function (name) {
    var fn = api[name];
    if (typeof fn === 'function') {
      methodHelps[name] = fn.help;
    } else {
      values[name] = api[name];
    }
  });

  if (!options.debug) {
    apiSource = minify(apiSource);
  }

  // TODO(gleb): validate that api source can be recreated back

  post(target, {
    cmd: '__api',
    source: apiSource,
    md5: md5(apiSource),
    methodNames: methodNames,
    methodHelps: methodHelps,
    values: values
  });
}

// sending result for command back to the caller
function respond(port, commandData, result) {
  la(typeof commandData === 'object' && commandData.stamp,
    'missing command stamp', commandData);

  console.log('responding to command', commandData.stamp, 'with', result);

  // var stampIt = post.bind(null, post, port);

  commandData.payload = {
    cmd: '__method_response',
    args: [result]
  };

  post(commandData);
}

function handshake(port, options) {
  /*
  post(port, {
    cmd: '__handshake',
    options: options
  });*/
  return selfAddressed(post, port, {
    cmd: '__handshake',
    options: options
  });
}

function reviveApi(userOptions, received, port) {
  la(arguments.length === 3, 'missing arguments to revive api');
  la(port && typeof port.postMessage === 'function',
    'invalid port object');
  verifyMd5(userOptions, received);

  received.methodNames = Array.isArray(received.methodNames) ? received.methodNames : [];
  received.methodHelps = Array.isArray(received.methodHelps) ? received.methodHelps : [];

  /* jshint -W061 */
  /* eslint no-eval:0 */
  // event.source is the communication channel pointing at iframe
  // it allows posting messages back to the iframe
  return eval('(' + received.source +
    ')(port, received.methodNames, received.values, received.methodHelps)');
}

module.exports = {
  handshake: handshake,
  apiFactory: apiFactory,
  send: sendApi,
  reviveApi: reviveApi,
  respond: respond
};

},{"./la":6,"./md5":7,"./minify":8,"./verify-md5":11,"self-addressed":3}],6:[function(require,module,exports){
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

},{"./to-array":10}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
var la = require('./la');
function removeWhiteSpace(src) {
  la(src, 'missing source', src);
  return src.replace(/\s{2,}/g, '');
}

module.exports = removeWhiteSpace;

},{"./la":6}],9:[function(require,module,exports){
/* eslint no-use-before-define:0 */
function peel(cargo) {
  var defer = stamp.__deferred[cargo.stamp];
  if (defer) {
    if (typeof defer.resolve !== 'function') {
      throw new Error('missing resolve method for ' + cargo.stamp);
    }
    delete cargo.stamp;
    delete stamp.__deferred[cargo.stamp];
    // TODO handle errors by calling defer.reject
    if (!cargo.payload) {
      throw new Error('missing payload in', cargo);
    }
    var result = Array.isArray(cargo.payload.args) && cargo.payload.args[0];
    defer.resolve(result);
  }
}

function hasBeenStamped(cargo) {
  return cargo.stamp;
}

function deliver(mailman, address, data) {

  var cargo = data;
  if (!hasBeenStamped(cargo)) {
    id += 1;
    cargo = {
      payload: data,
      stamp: id
    };
  }

  mailman(address, cargo);

  return new Promise(function (resolve, reject) {
    stamp.__deferred[id] = {
      resolve: resolve.bind(this),
      reject: reject.bind(this)
    };
  });
}

function stamp(mailman, address, data) {
  if (typeof mailman === 'function') {
    return deliver(mailman, address, data);
  } else {
    if (arguments.length !== 1 ||
      typeof mailman !== 'object') {
      throw new Error('expected just data ' + JSON.stringify(arguments));
    }
    peel(mailman);
  }
}

var id = 0;
stamp.__deferred = [];

module.exports = stamp;

},{}],10:[function(require,module,exports){
function toArray(list) {
  return Array.prototype.slice.call(list, 0);
}
module.exports = toArray;

},{}],11:[function(require,module,exports){
var la = require('./la');
var md5 = require('./md5');

function verifyMd5(options, received) {
  options = options || {};
  received = received || {};

  // console.log(received.md5);

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

},{"./la":6,"./md5":7}]},{},[4])(4)
});