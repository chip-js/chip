//----------------------------------------------------------------------
//
// ECMAScript 5 Polyfills
//
//----------------------------------------------------------------------

//----------------------------------------------------------------------
// ES5 15.2 Object Objects
//----------------------------------------------------------------------

//
// ES5 15.2.3 Properties of the Object Constructor
//

// ES5 15.2.3.2 Object.getPrototypeOf ( O )
// From http://ejohn.org/blog/objectgetprototypeof/
// NOTE: won't work for typical function T() {}; T.prototype = {}; new T; case
// since the constructor property is destroyed.
if (!Object.getPrototypeOf) {
  Object.getPrototypeOf = function (o) {
    if (o !== Object(o)) { throw new TypeError("Object.getPrototypeOf called on non-object"); }
    return o.__proto__ || o.constructor.prototype || Object.prototype;
  };
}

//    // ES5 15.2.3.3 Object.getOwnPropertyDescriptor ( O, P )
//    if (typeof Object.getOwnPropertyDescriptor !== "function") {
//        Object.getOwnPropertyDescriptor = function (o, name) {
//            if (o !== Object(o)) { throw new TypeError(); }
//            if (o.hasOwnProperty(name)) {
//                return {
//                    value: o[name],
//                    enumerable: true,
//                    writable: true,
//                    configurable: true
//                };
//            }
//        };
//    }

// ES5 15.2.3.4 Object.getOwnPropertyNames ( O )
if (typeof Object.getOwnPropertyNames !== "function") {
  Object.getOwnPropertyNames = function (o) {
    if (o !== Object(o)) { throw new TypeError("Object.getOwnPropertyNames called on non-object"); }
    var props = [], p;
    for (p in o) {
      if (Object.prototype.hasOwnProperty.call(o, p)) {
        props.push(p);
      }
    }
    return props;
  };
}

// ES5 15.2.3.5 Object.create ( O [, Properties] )
if (typeof Object.create !== "function") {
  Object.create = function (prototype, properties) {
    "use strict";
    if (typeof prototype !== "object") { throw new TypeError(); }
    /** @constructor */
    function Ctor() {}
    Ctor.prototype = prototype;
    var o = new Ctor();
    if (prototype) { o.constructor = Ctor; }
    if (arguments.length > 1) {
      if (properties !== Object(properties)) { throw new TypeError(); }
      Object.defineProperties(o, properties);
    }
    return o;
  };
}

// ES 15.2.3.6 Object.defineProperty ( O, P, Attributes )
// Partial support for most common case - getters, setters, and values
(function() {
  if (!Object.defineProperty ||
      !(function () { try { Object.defineProperty({}, 'x', {}); return true; } catch (e) { return false; } } ())) {
    var orig = Object.defineProperty;
    Object.defineProperty = function (o, prop, desc) {
      "use strict";

      // In IE8 try built-in implementation for defining properties on DOM prototypes.
      if (orig) { try { return orig(o, prop, desc); } catch (e) {} }

      if (o !== Object(o)) { throw new TypeError("Object.defineProperty called on non-object"); }
      if (Object.prototype.__defineGetter__ && ('get' in desc)) {
        Object.prototype.__defineGetter__.call(o, prop, desc.get);
      }
      if (Object.prototype.__defineSetter__ && ('set' in desc)) {
        Object.prototype.__defineSetter__.call(o, prop, desc.set);
      }
      if ('value' in desc) {
        o[prop] = desc.value;
      }
      return o;
    };
  }
}());

// ES 15.2.3.7 Object.defineProperties ( O, Properties )
if (typeof Object.defineProperties !== "function") {
  Object.defineProperties = function (o, properties) {
    "use strict";
    if (o !== Object(o)) { throw new TypeError("Object.defineProperties called on non-object"); }
    var name;
    for (name in properties) {
      if (Object.prototype.hasOwnProperty.call(properties, name)) {
        Object.defineProperty(o, name, properties[name]);
      }
    }
    return o;
  };
}


// ES5 15.2.3.14 Object.keys ( O )
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Object/keys
if (!Object.keys) {
  Object.keys = function (o) {
    if (o !== Object(o)) { throw new TypeError('Object.keys called on non-object'); }
    var ret = [], p;
    for (p in o) {
      if (Object.prototype.hasOwnProperty.call(o, p)) {
        ret.push(p);
      }
    }
    return ret;
  };
}

//----------------------------------------------------------------------
// ES5 15.3 Function Objects
//----------------------------------------------------------------------

//
// ES5 15.3.4 Properties of the Function Prototype Object
//

// ES5 15.3.4.5 Function.prototype.bind ( thisArg [, arg1 [, arg2, ... ]] )
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Function/bind
if (!Function.prototype.bind) {
  Function.prototype.bind = function (o) {
    if (typeof this !== 'function') { throw new TypeError("Bind must be called on a function"); }
    var slice = [].slice,
        args = slice.call(arguments, 1),
        self = this,
        bound = function () {
          return self.apply(this instanceof nop ? this : (o || {}),
                            args.concat(slice.call(arguments)));
        };

    /** @constructor */
    function nop() {}
    nop.prototype = self.prototype;

    bound.prototype = new nop();

    return bound;
  };
}


//----------------------------------------------------------------------
// ES5 15.4 Array Objects
//----------------------------------------------------------------------

//
// ES5 15.4.3 Properties of the Array Constructor
//


// ES5 15.4.3.2 Array.isArray ( arg )
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/isArray
Array.isArray = Array.isArray || function (o) { return Boolean(o && Object.prototype.toString.call(Object(o)) === '[object Array]'); };


//
// ES5 15.4.4 Properties of the Array Prototype Object
//

// ES5 15.4.4.14 Array.prototype.indexOf ( searchElement [ , fromIndex ] )
// From https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/indexOf
if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function (searchElement /*, fromIndex */) {
    "use strict";

    if (this === void 0 || this === null) { throw new TypeError(); }

    var t = Object(this);
    var len = t.length >>> 0;
    if (len === 0) { return -1; }

    var n = 0;
    if (arguments.length > 0) {
      n = Number(arguments[1]);
      if (isNaN(n)) {
        n = 0;
      } else if (n !== 0 && n !== (1 / 0) && n !== -(1 / 0)) {
        n = (n > 0 || -1) * Math.floor(Math.abs(n));
      }
    }

    if (n >= len) { return -1; }

    var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);

    for (; k < len; k++) {
      if (k in t && t[k] === searchElement) {
        return k;
      }
    }
    return -1;
  };
}

// ES5 15.4.4.15 Array.prototype.lastIndexOf ( searchElement [ , fromIndex ] )
// From https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/lastIndexOf
if (!Array.prototype.lastIndexOf) {
  Array.prototype.lastIndexOf = function (searchElement /*, fromIndex*/) {
    "use strict";

    if (this === void 0 || this === null) { throw new TypeError(); }

    var t = Object(this);
    var len = t.length >>> 0;
    if (len === 0) { return -1; }

    var n = len;
    if (arguments.length > 1) {
      n = Number(arguments[1]);
      if (n !== n) {
        n = 0;
      } else if (n !== 0 && n !== (1 / 0) && n !== -(1 / 0)) {
        n = (n > 0 || -1) * Math.floor(Math.abs(n));
      }
    }

    var k = n >= 0 ? Math.min(n, len - 1) : len - Math.abs(n);

    for (; k >= 0; k--) {
      if (k in t && t[k] === searchElement) {
        return k;
      }
    }
    return -1;
  };
}

// ES5 15.4.4.16 Array.prototype.every ( callbackfn [ , thisArg ] )
// From https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/every
if (!Array.prototype.every) {
  Array.prototype.every = function (fun /*, thisp */) {
    "use strict";

    if (this === void 0 || this === null) { throw new TypeError(); }

    var t = Object(this);
    var len = t.length >>> 0;
    if (typeof fun !== "function") { throw new TypeError(); }

    var thisp = arguments[1], i;
    for (i = 0; i < len; i++) {
      if (i in t && !fun.call(thisp, t[i], i, t)) {
        return false;
      }
    }

    return true;
  };
}

// ES5 15.4.4.17 Array.prototype.some ( callbackfn [ , thisArg ] )
// From https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/some
if (!Array.prototype.some) {
  Array.prototype.some = function (fun /*, thisp */) {
    "use strict";

    if (this === void 0 || this === null) { throw new TypeError(); }

    var t = Object(this);
    var len = t.length >>> 0;
    if (typeof fun !== "function") { throw new TypeError(); }

    var thisp = arguments[1], i;
    for (i = 0; i < len; i++) {
      if (i in t && fun.call(thisp, t[i], i, t)) {
        return true;
      }
    }

    return false;
  };
}

// ES5 15.4.4.18 Array.prototype.forEach ( callbackfn [ , thisArg ] )
// From https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/forEach
if (!Array.prototype.forEach) {
  Array.prototype.forEach = function (fun /*, thisp */) {
    "use strict";

    if (this === void 0 || this === null) { throw new TypeError(); }

    var t = Object(this);
    var len = t.length >>> 0;
    if (typeof fun !== "function") { throw new TypeError(); }

    var thisp = arguments[1], i;
    for (i = 0; i < len; i++) {
      if (i in t) {
        fun.call(thisp, t[i], i, t);
      }
    }
  };
}


// ES5 15.4.4.19 Array.prototype.map ( callbackfn [ , thisArg ] )
// From https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/Map
if (!Array.prototype.map) {
  Array.prototype.map = function (fun /*, thisp */) {
    "use strict";

    if (this === void 0 || this === null) { throw new TypeError(); }

    var t = Object(this);
    var len = t.length >>> 0;
    if (typeof fun !== "function") { throw new TypeError(); }

    var res = []; res.length = len;
    var thisp = arguments[1], i;
    for (i = 0; i < len; i++) {
      if (i in t) {
        res[i] = fun.call(thisp, t[i], i, t);
      }
    }

    return res;
  };
}

// ES5 15.4.4.20 Array.prototype.filter ( callbackfn [ , thisArg ] )
// From https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/Filter
if (!Array.prototype.filter) {
  Array.prototype.filter = function (fun /*, thisp */) {
    "use strict";

    if (this === void 0 || this === null) { throw new TypeError(); }

    var t = Object(this);
    var len = t.length >>> 0;
    if (typeof fun !== "function") { throw new TypeError(); }

    var res = [];
    var thisp = arguments[1], i;
    for (i = 0; i < len; i++) {
      if (i in t) {
        var val = t[i]; // in case fun mutates this
        if (fun.call(thisp, val, i, t)) {
          res.push(val);
        }
      }
    }

    return res;
  };
}


// ES5 15.4.4.21 Array.prototype.reduce ( callbackfn [ , initialValue ] )
// From https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/Reduce
if (!Array.prototype.reduce) {
  Array.prototype.reduce = function (fun /*, initialValue */) {
    "use strict";

    if (this === void 0 || this === null) { throw new TypeError(); }

    var t = Object(this);
    var len = t.length >>> 0;
    if (typeof fun !== "function") { throw new TypeError(); }

    // no value to return if no initial value and an empty array
    if (len === 0 && arguments.length === 1) { throw new TypeError(); }

    var k = 0;
    var accumulator;
    if (arguments.length >= 2) {
      accumulator = arguments[1];
    } else {
      do {
        if (k in t) {
          accumulator = t[k++];
          break;
        }

        // if array contains no values, no initial value to return
        if (++k >= len) { throw new TypeError(); }
      }
      while (true);
    }

    while (k < len) {
      if (k in t) {
        accumulator = fun.call(undefined, accumulator, t[k], k, t);
      }
      k++;
    }

    return accumulator;
  };
}


// ES5 15.4.4.22 Array.prototype.reduceRight ( callbackfn [, initialValue ] )
// From https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/ReduceRight
if (!Array.prototype.reduceRight) {
  Array.prototype.reduceRight = function (callbackfn /*, initialValue */) {
    "use strict";

    if (this === void 0 || this === null) { throw new TypeError(); }

    var t = Object(this);
    var len = t.length >>> 0;
    if (typeof callbackfn !== "function") { throw new TypeError(); }

    // no value to return if no initial value, empty array
    if (len === 0 && arguments.length === 1) { throw new TypeError(); }

    var k = len - 1;
    var accumulator;
    if (arguments.length >= 2) {
      accumulator = arguments[1];
    } else {
      do {
        if (k in this) {
          accumulator = this[k--];
          break;
        }

        // if array contains no values, no initial value to return
        if (--k < 0) { throw new TypeError(); }
      }
      while (true);
    }

    while (k >= 0) {
      if (k in t) {
        accumulator = callbackfn.call(undefined, accumulator, t[k], k, t);
      }
      k--;
    }

    return accumulator;
  };
}


//----------------------------------------------------------------------
// ES5 15.5 String Objects
//----------------------------------------------------------------------

//
// ES5 15.5.4 Properties of the String Prototype Object
//


// ES5 15.5.4.20 String.prototype.trim()
if (!String.prototype.trim) {
  String.prototype.trim = function () {
    return String(this).replace(/^\s+/, '').replace(/\s+$/, '');
  };
}



//----------------------------------------------------------------------
// ES5 15.9 Date Objects
//----------------------------------------------------------------------


//
// ES 15.9.4 Properties of the Date Constructor
//

// ES5 15.9.4.4 Date.now ( )
// From https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Global_Objects/Date/now
if (!Date.now) {
  Date.now = function now() {
    return Number(new Date());
  };
}


//
// ES5 15.9.5 Properties of the Date Prototype Object
//

// ES5 15.9.4.43 Date.prototype.toISOString ( )
// Inspired by http://www.json.org/json2.js
if (!Date.prototype.toISOString) {
  Date.prototype.toISOString = function () {
    function pad2(n) { return ('00' + n).slice(-2); }
    function pad3(n) { return ('000' + n).slice(-3); }

    return this.getUTCFullYear() + '-' +
      pad2(this.getUTCMonth() + 1) + '-' +
      pad2(this.getUTCDate()) + 'T' +
      pad2(this.getUTCHours()) + ':' +
      pad2(this.getUTCMinutes()) + ':' +
      pad2(this.getUTCSeconds()) + '.' +
      pad3(this.getUTCMilliseconds()) + 'Z';
  };
}

(function() {
  var App, Binding, Controller, Filter, Observer, Route, Router, Walker, addReferences, addThis, argSeparator, bindingSort, chainLink, chainLinks, chip, continuation, currentIndex, currentReference, diff, div, emptyQuoteExpr, expression, filterAttributes, finishedChain, getBoundAttributes, getFunctionCall, ignore, initParse, invertedExpr, keyCode, keyCodes, makeEventEmitter, name, nextChain, parens, parseChain, parseExpr, parseFilters, parseFunction, parsePart, parsePath, parsePropertyChains, parseQuery, pathname, pipeExpr, prepareScope, propExpr, pullOutStrings, putInStrings, quoteExpr, referenceCount, setterExpr, sortAttributes, splitLinks, strings, swapPlaceholder, urlExp,
    __slice = [].slice,
    __hasProp = {}.hasOwnProperty;

  chip = {
    init: function() {
      if (!chip.rootApp) {
        chip.rootApp = chip.app();
      }
      return chip.rootApp.init();
    },
    app: function(appName) {
      var app;
      app = new App(appName);
      if (!appName) {
        chip.rootApp = app;
      }
      return app;
    },
    binding: function(name, priority, handler) {
      var _ref;
      if (priority || handler) {
        return Binding.addBinding(name, priority, handler);
      } else {
        return (_ref = Binding.bindings[name]) != null ? _ref.handler : void 0;
      }
    },
    eventBinding: function(eventName) {
      return Binding.addEventBinding(eventName);
    },
    keyEventBinding: function(name, keyCode, ctrlKey) {
      return Binding.addKeyEventBinding(name, keyCode, ctrlKey);
    },
    attributeBinding: function(name) {
      return Binding.addAttributeBinding(name);
    },
    attributeToggleBinding: function(name) {
      return Binding.addAttributeToggleBinding(name);
    },
    filter: function(name, filter, valueFilter) {
      if (typeof filter === 'function' || typeof valueFilter === 'function') {
        Filter.addFilter(name, filter, valueFilter);
        return this;
      } else if (filter) {
        return [Filter.getFilter(name), Filter.getValueFilter(name)];
      } else {
        return Filter.getFilter(name);
      }
    }
  };

  $(document).on('ready.chip', chip.init);

  window.chip = chip;

  makeEventEmitter = function(object, eventEmitter) {
    if (object.trigger) {
      throw new Error('Object has already become an event emitter');
    }
    eventEmitter = eventEmitter || $({});
    object.on = eventEmitter.on.bind(eventEmitter);
    object.one = eventEmitter.one.bind(eventEmitter);
    object.off = eventEmitter.off.bind(eventEmitter);
    object.trigger = eventEmitter.trigger.bind(eventEmitter);
    return eventEmitter;
  };

  chip.makeEventEmitter = makeEventEmitter;

  Router = (function() {
    function Router() {
      this.routes = [];
      this.params = {};
      this.prefix = '';
      makeEventEmitter(this);
    }

    Router.prototype.param = function(name, callback) {
      if (typeof callback !== 'function') {
        throw new Error('param must have a callback of type "function". Got ' + callback + '.');
      }
      (this.params[name] || (this.params[name] = [])).push(callback);
      return this;
    };

    Router.prototype.route = function(path, callback) {
      if (typeof callback !== 'function') {
        throw new Error('route must have a callback of type "function". Got ' + callback + '.');
      }
      if (path.charAt(0) !== '/') {
        path = '/' + path;
      }
      this.routes.push(new Route(path, callback));
      return this;
    };

    Router.prototype.redirect = function(url, replace) {
      var errHandler, notFound, pathParts;
      if (replace == null) {
        replace = false;
      }
      if (url.charAt(0) === '.' || url.split('//').length > 1) {
        pathParts = document.createElement('a');
        pathParts.href = url;
        url = pathname(pathParts) + pathParts.search;
      } else {
        url = this.prefix + url;
      }
      if (this.currentUrl === url) {
        return;
      }
      if (!this.hashOnly && this.root && url.indexOf(this.root) !== 0) {
        location.href = url;
        return;
      }
      notFound = false;
      this.on('error', (errHandler = function(err) {
        if (err === 'notFound') {
          return notFound = true;
        }
      }));
      if (this.usePushState) {
        if (replace) {
          history.replaceState({}, '', url);
        } else {
          history.pushState({}, '', url);
        }
        this.currentUrl = url;
        this.dispatch(url);
      } else {
        if (!this.hashOnly) {
          url = url.replace(this.root, '');
          if (url.charAt(0) !== '/') {
            url = '/' + url;
          }
        }
        location.hash = url === '/' ? '' : '#' + url;
      }
      this.off('error', errHandler);
      return !notFound;
    };

    Router.prototype.listen = function(options) {
      var getUrl, url, _ref,
        _this = this;
      if (options == null) {
        options = {};
      }
      if (options.stop) {
        if (this._handleChange) {
          $(window).off('popstate hashChange', this._handleChange);
        }
        return this;
      }
      if (options.root != null) {
        this.root = options.root;
      }
      if (options.prefix != null) {
        this.prefix = options.prefix;
      }
      if (options.hashOnly != null) {
        this.hashOnly = options.hashOnly;
      }
      this.usePushState = !this.hashOnly && (((_ref = window.history) != null ? _ref.pushState : void 0) != null);
      if ((this.root == null) && !this.usePushState) {
        this.hashOnly = true;
      }
      if (this.hashOnly) {
        this.prefix = '';
      }
      getUrl = null;
      this._handleChange = function() {
        var url;
        url = getUrl();
        if (_this.currentUrl === url) {
          return;
        }
        _this.currentUrl = url;
        return _this.dispatch(url);
      };
      if (this.usePushState) {
        if (location.hash) {
          url = location.pathname.replace(/\/$/, '') + location.hash.replace(/^#?\/?/, '/');
          history.replaceState({}, '', url);
        }
        getUrl = function() {
          return location.pathname + location.search;
        };
        $(window).on('popstate', this._handleChange);
      } else {
        getUrl = function() {
          if (location.hash) {
            return location.hash.replace(/^#\/?/, '/');
          } else {
            return location.pathname + location.search;
          }
        };
        $(window).on('hashchange', this._handleChange);
      }
      this._handleChange();
      return this;
    };

    Router.prototype.getUrlParts = function(url) {
      var path, urlParts;
      urlParts = document.createElement('a');
      urlParts.href = url;
      path = pathname(urlParts);
      if (path.indexOf(this.prefix) !== 0) {
        return null;
      }
      path.replace(this.prefix, '');
      return {
        path: path,
        query: urlParts.search
      };
    };

    Router.prototype.getRoutesMatchingPath = function(path) {
      var _ref;
      path = (_ref = this.getUrlParts(path)) != null ? _ref.path : void 0;
      if (path == null) {
        return [];
      }
      return this.routes.filter(function(route) {
        return route.match(path);
      });
    };

    Router.prototype.dispatch = function(url) {
      var callbacks, next, path, req, routes, urlParts,
        _this = this;
      urlParts = this.getUrlParts(url);
      if (!urlParts) {
        return;
      }
      path = urlParts.path;
      req = {
        url: url,
        path: path,
        query: parseQuery(urlParts.query)
      };
      this.trigger('change', [path]);
      routes = this.getRoutesMatchingPath(path);
      callbacks = [];
      routes.forEach(function(route) {
        var key, value, _ref;
        callbacks.push(function(req, next) {
          req.params = route.params;
          return next();
        });
        _ref = route.params;
        for (key in _ref) {
          value = _ref[key];
          if (!_this.params[key]) {
            continue;
          }
          callbacks.push.apply(callbacks, _this.params[key]);
        }
        return callbacks.push(route.callback);
      });
      next = function(err) {
        var callback;
        if (err) {
          return _this.trigger('error', [err]);
        }
        if (callbacks.length === 0) {
          return next('notFound');
        }
        callback = callbacks.shift();
        return callback(req, next);
      };
      if (callbacks.length === 0) {
        next('notFound');
      } else {
        next();
      }
      return this;
    };

    return Router;

  })();

  chip.Router = Router;

  Route = (function() {
    function Route(path, callback) {
      this.path = path;
      this.callback = callback;
      this.keys = [];
      this.expr = parsePath(path, this.keys);
    }

    Route.prototype.match = function(path) {
      var i, key, match, value, _i, _len;
      if (!(match = this.expr.exec(path))) {
        return false;
      }
      this.params = {};
      for (i = _i = 0, _len = match.length; _i < _len; i = ++_i) {
        value = match[i];
        if (i === 0) {
          continue;
        }
        key = this.keys[i - 1];
        if (typeof value === 'string') {
          value = decodeURIComponent(value);
        }
        if (!key) {
          key = '*';
        }
        this.params[key] = value;
      }
      return true;
    };

    return Route;

  })();

  chip.Route = Route;

  parsePath = function(path, keys) {
    if (path instanceof RegExp) {
      return path;
    }
    if (Array.isArray(path)) {
      path = '(' + path.join('|') + ')';
    }
    path = path.concat('/?').replace(/\/\(/g, '(?:/').replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?(\*)?/g, function(_, slash, format, key, capture, optional, star) {
      var expr;
      keys.push(key);
      slash = slash || '';
      expr = '';
      if (!optional) {
        expr += slash;
      }
      expr += '(?:';
      if (optional) {
        expr += slash;
      }
      expr += format || '';
      expr += capture || (format && '([^/.]+?)' || '([^/]+?)') + ')';
      expr += optional || '';
      if (star) {
        expr += '(/*)?';
      }
      return expr;
    }).replace(/([\/.])/g, '\\$1').replace(/\*/g, '(.*)');
    return new RegExp('^' + path + '$', 'i');
  };

  parseQuery = function(search) {
    var query;
    query = {};
    if (search === '') {
      return query;
    }
    search.replace(/^\?/, '').split('&').forEach(function(keyValue) {
      var key, value, _ref;
      _ref = keyValue.split('='), key = _ref[0], value = _ref[1];
      return query[decodeURIComponent(key)] = decodeURIComponent(value);
    });
    return query;
  };

  pathname = function(anchor) {
    var path;
    path = anchor.pathname;
    if (path.charAt(0) !== '/') {
      path = '/' + path;
    }
    return path;
  };

  Observer = (function() {
    function Observer(getter, callback, oldValue) {
      this.getter = getter;
      this.callback = callback;
      this.oldValue = oldValue;
    }

    Observer.prototype.skipNextSync = function() {
      return this.skip = true;
    };

    Observer.prototype.sync = function() {
      var changed, value;
      value = this.getter();
      if (this.skip) {
        delete this.skip;
      } else {
        changed = diff.values(value, this.oldValue);
        if (!changed) {
          return;
        }
        if (Array.isArray(changed)) {
          this.callback(value, this.oldValue, changed);
        } else {
          this.callback(value, this.oldValue);
        }
      }
      return this.oldValue = diff.clone(value);
    };

    Observer.prototype.close = function() {
      return Observer.remove(this);
    };

    Observer.observers = [];

    Observer.callbacks = [];

    Observer.listeners = [];

    Observer.add = function(getter, skipTriggerImmediately, callback) {
      var observer, value;
      if (typeof skipTriggerImmediately === 'function') {
        callback = skipTriggerImmediately;
        skipTriggerImmediately = false;
      }
      value = getter();
      observer = new Observer(getter, callback, diff.clone(value));
      this.observers.push(observer);
      if (!skipTriggerImmediately) {
        callback(value);
      }
      return observer;
    };

    Observer.remove = function(observer) {
      var index;
      index = this.observers.indexOf(observer);
      if (index !== -1) {
        this.observers.splice(index, 1);
        return true;
      } else {
        return false;
      }
    };

    Observer.syncing = false;

    Observer.rerun = false;

    Observer.cycles = 0;

    Observer.max = 10;

    Observer.timeout = null;

    Observer.sync = function(callback) {
      var listener, _i, _len, _ref;
      if (typeof callback === 'function') {
        this.afterSync(callback);
      }
      if (this.syncing) {
        this.rerun = true;
        return false;
      }
      this.syncing = true;
      this.rerun = true;
      this.cycles = 0;
      while (this.rerun) {
        if (++this.cycles === this.max) {
          throw 'Infinite observer syncing, an observer is calling Observer.sync() too many times';
        }
        this.rerun = false;
        for (var i = 0; i < this.observers.length; i++) {
        this.observers[i].sync()
      };
      }
      while (this.callbacks.length) {
        this.callbacks.shift()();
      }
      _ref = this.listeners;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        listener = _ref[_i];
        listener();
      }
      this.syncing = false;
      this.cycles = 0;
      return true;
    };

    Observer.syncLater = function(callback) {
      var _this = this;
      if (!this.timeout) {
        this.timeout = setTimeout(function() {
          _this.timeout = null;
          return _this.sync(callback);
        });
        return true;
      } else {
        return false;
      }
    };

    Observer.afterSync = function(callback) {
      if (typeof callback !== 'function') {
        throw new TypeError('callback must be a function');
      }
      return this.callbacks.push(callback);
    };

    Observer.onSync = function(listener) {
      if (typeof listener !== 'function') {
        throw new TypeError('listener must be a function');
      }
      return this.listeners.push(listener);
    };

    Observer.removeOnSync = function(listener) {
      var index;
      if (typeof listener !== 'function') {
        throw new TypeError('listener must be a function');
      }
      index = this.listeners.indexOf(listener);
      if (index !== -1) {
        return this.listeners.splice(index, 1).pop();
      }
    };

    return Observer;

  })();

  chip.Observer = Observer;

  Controller = (function() {
    function Controller() {
      this._observers = [];
      this._children = [];
      this._syncListeners = [];
      this._closed = false;
    }

    Controller.prototype.watch = function(expr, skipTriggerImmediately, callback) {
      var calledThisRound, getter, observer, observers, origCallback,
        _this = this;
      if (Array.isArray(expr)) {
        if (typeof skipTriggerImmediately === 'function') {
          callback = skipTriggerImmediately;
          skipTriggerImmediately = false;
        }
        origCallback = callback;
        calledThisRound = false;
        callback = function() {
          var values;
          if (calledThisRound) {
            return;
          }
          calledThisRound = true;
          setTimeout(function() {
            return calledThisRound = false;
          });
          values = observers.map(function(observer) {
            return observer.getter();
          });
          return origCallback.apply(null, values);
        };
        observers = expr.map(function(expr) {
          return _this.watch(expr, true, callback);
        });
        if (!skipTriggerImmediately) {
          callback();
        }
        return observers;
      }
      if (typeof expr === 'function') {
        getter = expr;
      } else {
        getter = expression.bind(expr, this);
      }
      observer = Observer.add(getter, skipTriggerImmediately, callback);
      observer.expr = expr;
      this._observers.push(observer);
      return observer;
    };

    Controller.prototype.unwatch = function(expr, callback) {
      var _this = this;
      return this._observers.some(function(observer, index) {
        if (observer.expr === expr && observer.callback === callback) {
          observer.close();
          _this._observers.splice(index, 1);
          return true;
        } else {
          return false;
        }
      });
    };

    Controller.prototype["eval"] = function(expr, args) {
      var options, values;
      if (args) {
        options = {
          args: Object.keys(args)
        };
        values = options.args.map(function(key) {
          return args[key];
        });
      }
      return expression.get(expr, options).apply(this, values);
    };

    Controller.prototype.evalSetter = function(expr, value) {
      if (this.passthrough() !== this) {
        return this.passthrough().evalSetter(expr, value);
      }
      expr = expr.replace(/(\s*\||$)/, ' = value$1');
      return expression.get(expr, {
        args: ['value']
      }).call(this, value);
    };

    Controller.prototype.getBoundEval = function() {
      var expr, extraArgNames;
      expr = arguments[0], extraArgNames = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return expression.bind(expr, this, {
        args: extraArgNames
      });
    };

    Controller.prototype.redirect = function(url, replace) {
      if (replace == null) {
        replace = false;
      }
      this.app.redirect(url, replace);
      return this;
    };

    Controller.prototype.cloneValue = function(property) {
      return diff.clone(this[property]);
    };

    Controller.prototype.closeController = function() {
      var child, index, listener, observer, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _ref2, _ref3;
      if (this._closed) {
        return;
      }
      this._closed = true;
      _ref = this._children;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        child = _ref[_i];
        child.parent = null;
        child.closeController();
      }
      if ((_ref1 = this.parent) != null ? _ref1._children : void 0) {
        index = this.parent._children.indexOf(this);
        if (index !== -1) {
          this.parent._children.splice(index, 1);
        }
      }
      if (this.hasOwnProperty('beforeClose')) {
        this.beforeClose();
      }
      if (this._syncListeners) {
        _ref2 = this._syncListeners;
        for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
          listener = _ref2[_j];
          Observer.removeOnSync(listener);
        }
        delete this._syncListeners;
      }
      _ref3 = this._observers;
      for (_k = 0, _len2 = _ref3.length; _k < _len2; _k++) {
        observer = _ref3[_k];
        observer.close();
      }
      this._observers.length = 0;
      if (this.hasOwnProperty('onClose')) {
        this.onClose();
      }
    };

    Controller.prototype.sync = function(callback) {
      Observer.sync(callback);
      return this;
    };

    Controller.prototype.syncLater = function(callback) {
      Observer.syncLater(callback);
      return this;
    };

    Controller.prototype.syncThis = function() {
      this._observers.forEach(function(observer) {
        return observer.sync();
      });
      this._children.forEach(function(child) {
        return child.syncThis();
      });
      return this;
    };

    Controller.prototype.afterSync = function(callback) {
      Observer.afterSync(callback);
      return this;
    };

    Controller.prototype.onSync = function(listener) {
      this._syncListeners.push(listener);
      Observer.onSync(listener);
      return this;
    };

    Controller.prototype.removeOnSync = function(listener) {
      var index;
      index = this._syncListeners.indexOf(listener);
      if (index !== -1) {
        this._syncListeners.splice(index, 1);
      }
      Observer.removeOnSync(listener);
      return this;
    };

    Controller.prototype.passthrough = function(value) {
      if (arguments.length) {
        return this._passthrough = value;
      } else {
        if (this.hasOwnProperty('_passthrough')) {
          return this._passthrough;
        } else {
          return this;
        }
      }
    };

    return Controller;

  })();

  $.fn.controller = function(passthrough) {
    var controller, element;
    element = this;
    while (element.length) {
      controller = element.data('controller');
      if (controller) {
        if (passthrough) {
          return controller.passthrough();
        } else {
          return controller;
        }
      }
      element = element.parent();
    }
    return null;
  };

  if (!$.widget) {
    $.cleanData = (function(orig) {
      return function(elems) {
        var e, elem, _i, _len;
        for (_i = 0, _len = elems.length; _i < _len; _i++) {
          elem = elems[_i];
          try {
            $(elem).triggerHandler('remove');
          } catch (_error) {
            e = _error;
          }
        }
        return orig(elems);
      };
    })($.cleanData);
  }

  chip.Controller = Controller;

  expression = {
    cache: {},
    globals: ['true', 'false', 'window', 'this']
  };

  expression.isInverted = function(expr) {
    return expr.match(invertedExpr) && true;
  };

  expression.revert = function(expr) {
    expr = '"' + expr.replace(invertedExpr, function(match, expr) {
      return '" + (' + expr + ') + "';
    }) + '"';
    return expr.replace(/^"" \+ | \+ ""$/g, '');
  };

  expression.get = function(expr, options) {
    var args, body, cacheKey, e, func;
    if (options == null) {
      options = {};
    }
    args = options.args || [];
    cacheKey = expr + '|' + args.join(',');
    func = expression.cache[cacheKey];
    if (func) {
      return func;
    }
    body = expression.parse(expr, options);
    try {
      func = expression.cache[cacheKey] = Function.apply(null, __slice.call(args).concat([body]));
    } catch (_error) {
      e = _error;
      if (console) {
        console.error('Bad expression:\n`' + expr + '`\n' + 'Compiled expression:\n' + body);
      }
      throw new Error(e.message);
    }
    return func;
  };

  expression.bind = function(expr, scope, options) {
    return expression.get(expr, options).bind(scope);
  };

  invertedExpr = /{{(.*)}}/g;

  quoteExpr = /(['"\/])(\\\1|[^\1])*?\1/g;

  emptyQuoteExpr = /(['"\/])\1/g;

  pipeExpr = /\|(\|)?/g;

  argSeparator = /\s*:\s*/g;

  propExpr = /((\{|,|\.)?\s*)([a-z$_\$](?:[a-z_\$0-9\.-]|\[['"\d]+\])*)(\s*(:|\(|\[)?)/gi;

  chainLinks = /\.|\[/g;

  chainLink = /\.|\[|\(/;

  setterExpr = /\s=\s/;

  ignore = null;

  strings = [];

  referenceCount = 0;

  currentReference = 0;

  currentIndex = 0;

  finishedChain = false;

  continuation = false;

  expression.parse = function(expr, options) {
    initParse(expr, options);
    expr = pullOutStrings(expr);
    expr = parseFilters(expr);
    expr = parseExpr(expr);
    expr = 'return ' + expr;
    expr = putInStrings(expr);
    expr = addReferences(expr);
    return expr;
  };

  initParse = function(expr, options) {
    referenceCount = currentReference = 0;
    ignore = expression.globals.concat((options != null ? options.globals : void 0) || [], (options != null ? options.args : void 0) || []);
    return strings.length = 0;
  };

  pullOutStrings = function(expr) {
    var javascript;
    return javascript = expr.replace(quoteExpr, function(str, quote) {
      strings.push(str);
      return quote + quote;
    });
  };

  putInStrings = function(expr) {
    return expr = expr.replace(emptyQuoteExpr, function() {
      return strings.shift();
    });
  };

  addReferences = function(expr) {
    var i, refs, _i;
    if (referenceCount) {
      refs = [];
      for (i = _i = 1; 1 <= referenceCount ? _i <= referenceCount : _i >= referenceCount; i = 1 <= referenceCount ? ++_i : --_i) {
        refs.push('_ref' + i);
      }
      expr = 'var ' + refs.join(', ') + ';\n' + expr;
    }
    return expr;
  };

  parseFilters = function(expr) {
    var filters, setter, value, _ref;
    expr = expr.replace(pipeExpr, function(match, orIndicator) {
      if (orIndicator) {
        return match;
      }
      return '@@@';
    });
    filters = expr.split(/\s*@@@\s*/);
    expr = filters.shift();
    if (!filters.length) {
      return expr;
    }
    if (setterExpr.test(expr)) {
      _ref = expr.split(setterExpr), setter = _ref[0], value = _ref[1];
      setter += ' = ';
    } else {
      setter = '';
      value = expr;
    }
    filters.forEach(function(filter) {
      var args, filterName;
      args = filter.split(argSeparator);
      filterName = args.shift();
      args.unshift(value);
      if (setter) {
        args.push(true);
      }
      return value = "_filters." + filterName + ".call(this, " + (args.join(', ')) + ")";
    });
    return setter + value;
  };

  parseExpr = function(expr) {
    var setter, value, _ref;
    if (setterExpr.test(expr)) {
      _ref = expr.split(' = '), setter = _ref[0], value = _ref[1];
      setter = parsePropertyChains(setter).replace(/^\(|\)$/g, '') + ' = ';
      value = parsePropertyChains(value);
      return setter + value;
    } else {
      return parsePropertyChains(expr);
    }
  };

  parsePropertyChains = function(expr) {
    var javascript, js, previousIndexes;
    javascript = '';
    previousIndexes = [currentIndex, propExpr.lastIndex];
    currentIndex = 0;
    propExpr.lastIndex = 0;
    while ((js = nextChain(expr)) !== false) {
      javascript += js;
    }
    propExpr.lastIndex = previousIndexes.pop();
    currentIndex = previousIndexes.pop();
    return javascript;
  };

  nextChain = function(expr) {
    var colonOrParen, match, objIndicator, postfix, prefix, propChain, skipped, _ref;
    if (finishedChain) {
      return (finishedChain = false);
    }
    match = propExpr.exec(expr);
    if (!match) {
      finishedChain = true;
      return expr.slice(currentIndex);
    }
    _ref = match, match = _ref[0], prefix = _ref[1], objIndicator = _ref[2], propChain = _ref[3], postfix = _ref[4], colonOrParen = _ref[5];
    skipped = expr.slice(currentIndex, propExpr.lastIndex - match.length);
    currentIndex = propExpr.lastIndex;
    if (objIndicator && colonOrParen === ':') {
      return skipped + match;
    }
    return skipped + parseChain(prefix, propChain, postfix, colonOrParen, expr);
  };

  splitLinks = function(chain) {
    var index, match, parts;
    index = 0;
    parts = [];
    while ((match = chainLinks.exec(chain))) {
      if (chainLinks.lastIndex === 1) {
        continue;
      }
      parts.push(chain.slice(index, chainLinks.lastIndex - 1));
      index = chainLinks.lastIndex - 1;
    }
    parts.push(chain.slice(index));
    return parts;
  };

  addThis = function(chain) {
    if (ignore.indexOf(chain.split(chainLink).shift()) === -1) {
      return "this." + chain;
    } else {
      return chain;
    }
  };

  parseChain = function(prefix, propChain, postfix, paren, expr) {
    var link, links, newChain;
    continuation = prefix === '.';
    if (continuation) {
      propChain = '.' + propChain;
      prefix = '';
    }
    links = splitLinks(propChain);
    newChain = '';
    if (links.length === 1 && !continuation && !paren) {
      link = links[0];
      newChain = addThis(link);
    } else {
      if (!continuation) {
        newChain = '(';
      }
      links.forEach(function(link, index) {
        if (index !== links.length - 1) {
          newChain += parsePart(link, index);
        } else {
          if (!parens[paren]) {
            newChain += "_ref" + currentReference + link + ")";
          } else {
            postfix = postfix.replace(paren, '');
            newChain += parseFunction(link, index, expr);
          }
        }
      });
    }
    return prefix + newChain + postfix;
  };

  parens = {
    '(': ')',
    '[': ']'
  };

  parseFunction = function(link, index, expr) {
    var call, insideParens, ref;
    call = getFunctionCall(expr);
    link += call.slice(0, 1) + '~~insideParens~~' + call.slice(-1);
    insideParens = call.slice(1, -1);
    if (expr.charAt(propExpr.lastIndex) === '.') {
      link = parsePart(link, index);
    } else if (index === 0) {
      link = parsePart(link, index);
      link += "_ref" + currentReference + ")";
    } else {
      link = "_ref" + currentReference + link + ")";
    }
    ref = currentReference;
    link = link.replace('~~insideParens~~', parsePropertyChains(insideParens));
    currentReference = ref;
    return link;
  };

  getFunctionCall = function(expr) {
    var close, endIndex, open, parenCount, startIndex;
    startIndex = propExpr.lastIndex;
    open = expr.charAt(startIndex - 1);
    close = parens[open];
    endIndex = startIndex - 1;
    parenCount = 1;
    while (endIndex++ < expr.length) {
      switch (expr.charAt(endIndex)) {
        case open:
          parenCount++;
          break;
        case close:
          parenCount--;
      }
      if (parenCount === 0) {
        break;
      }
    }
    currentIndex = propExpr.lastIndex = endIndex + 1;
    return open + expr.slice(startIndex, endIndex) + close;
  };

  parsePart = function(part, index) {
    var ref;
    if (index === 0 && !continuation) {
      if (ignore.indexOf(part.split(/\.|\(|\[/).shift()) === -1) {
        part = "this." + part;
      } else {
        part = "" + part;
      }
    } else {
      part = "_ref" + currentReference + part;
    }
    currentReference = ++referenceCount;
    ref = "_ref" + currentReference;
    return "(" + ref + " = " + part + ") == null ? undefined : ";
  };

  chip.expression = expression;

  App = (function() {
    function App(appName) {
      var _this = this;
      this.name = appName;
      this.controllers = {};
      this.templates = {};
      this.router = new Router();
      this.rootElement = $('html');
      this.translations = {};
      this._emitter = makeEventEmitter(this);
      this.router.on('error', function(event, err) {
        return _this.trigger('routeError', [err]);
      });
    }

    App.prototype.init = function(root) {
      var app, element, name;
      if (this.inited) {
        return this.rootController;
      }
      this.inited = true;
      if (root) {
        this.rootElement = root;
      }
      this.rootController = this.createController({
        element: this.rootElement,
        name: 'application'
      });
      app = this;
      this.rootElement.find('script[type="text/html"]').each(function() {
        var $this, name;
        $this = $(this);
        name = $this.attr('name') || $this.attr('id');
        if (name) {
          app.template(name, $this.html());
          return $this.remove();
        }
      });
      while ((element = this.rootElement.find("[bind-controller]:first")).length) {
        name = element.attr("bind-controller");
        element.removeAttr("bind-controller");
        this.createController({
          element: element,
          name: name,
          parent: this.rootController
        });
      }
      return this.rootController;
    };

    App.prototype.template = function(name, content) {
      if (arguments.length > 1) {
        this.templates[name] = content;
        return this;
      } else {
        if (!this.templates.hasOwnProperty(name)) {
          throw 'Template "' + name + '" does not exist';
        }
        return $(this.templates[name].trim());
      }
    };

    App.prototype.translate = function(translations, merge) {
      var key, value, _ref;
      if (!merge) {
        _ref = this.translations;
        for (key in _ref) {
          value = _ref[key];
          delete this.translations[key];
        }
      }
      for (key in translations) {
        value = translations[key];
        this.translations[key] = value;
      }
      return this.trigger('translationChange', [this.translations]);
    };

    App.prototype.controller = function(name, initFunction) {
      if (arguments.length > 1) {
        this.controllers[name] = initFunction;
        return this;
      } else {
        return this.controllers[name] || window[name + 'Controller'];
      }
    };

    App.prototype.createController = function(options) {
      var NewController, controller, key, old, value, _base, _ref,
        _this = this;
      if (options == null) {
        options = {};
      }
      if (options.parent instanceof Controller) {
        NewController = function() {
          return Controller.call(this);
        };
        if (options.parent) {
          NewController.prototype = options.parent;
        }
        controller = new NewController();
        controller.parent = options.parent;
        options.parent._children.push(controller);
        if (options.passthrough) {
          controller.passthrough(options.parent.passthrough());
        }
      } else {
        controller = new Controller();
        makeEventEmitter(controller, this._emitter);
        controller.app = this;
        controller.translations = this.translations;
        controller._filters = Filter.filters;
      }
      if (options.properties) {
        _ref = options.properties;
        for (key in _ref) {
          if (!__hasProp.call(_ref, key)) continue;
          value = _ref[key];
          controller[key] = value;
        }
      }
      controller.child = function(options) {
        if (options == null) {
          options = {};
        }
        options.parent = controller;
        return _this.createController(options);
      };
      controller.template = function(name) {
        return _this.template(name);
      };
      if (options.element) {
        if ((old = options.element.data('controller'))) {
          options.element.off('remove.controller');
          old.closeController();
        }
        options.element.one('remove.controller', function() {
          return controller.closeController();
        });
        controller.element = options.element;
        options.element.data('controller', controller);
      }
      if (options.name) {
        if (typeof (_base = this.controller(options.name)) === "function") {
          _base(controller);
        }
      }
      if (options.element) {
        options.element.bindTo(controller);
      }
      return controller;
    };

    App.prototype.param = function(name, callback) {
      var wrappedCallback,
        _this = this;
      wrappedCallback = function(req, next) {
        _this.rootController.params = req.params;
        _this.rootController.query = req.query;
        return callback(_this.rootController, next);
      };
      this.router.param(name, wrappedCallback);
      return this;
    };

    App.prototype.route = function(path, handler, subroutes) {
      var handleRoute,
        _this = this;
      handleRoute = function(path, handler, subroutes, depth, before) {
        var callback, name;
        if (typeof handler === 'function' && handler.toString().match(/\(route\)/)) {
          subroutes = handler;
          handler = null;
        }
        if (!handler) {
          handler = path.replace(/^\//, '');
        }
        if (typeof handler === 'string') {
          name = handler;
          callback = function(req, next) {
            var container, i, isExistingRoute, selector, showNextPage, _i;
            if (before && !req.calledBefore) {
              req.calledBefore = true;
              before(req, callback);
              return;
            }
            _this.rootController.params = req.params;
            _this.rootController.query = req.query;
            selector = [];
            for (i = _i = 0; 0 <= depth ? _i <= depth : _i >= depth; i = 0 <= depth ? ++_i : --_i) {
              selector.push("[bind-route]");
            }
            container = _this.rootElement.find(selector.join(' ') + ':first');
            isExistingRoute = _this.rootController.route;
            if (req.isSamePath == null) {
              req.isSamePath = req.path === _this.rootController.path;
            }
            if (container.length) {
              showNextPage = function() {
                var parentController, placholder;
                container.attr("bind-route", name);
                _this.rootController.route = name;
                _this.rootController.path = req.path;
                _this.trigger('routeChange', [name]);
                if (req.isSamePath) {
                  container.animateIn();
                } else {
                  if (container.willAnimate()) {
                    placholder = $('<!--container-->').insertBefore(container);
                    container.detach();
                    setTimeout(function() {
                      placholder.after(container).remove();
                      return container.animateIn();
                    });
                  }
                  container.html(_this.template(name));
                  parentController = container.parent().controller() || _this.rootController;
                  _this.createController({
                    element: container,
                    parent: parentController,
                    name: name
                  });
                  _this.trigger('routeComplete');
                }
                _this.rootController.sync();
                window.scrollTo(0, 0);
                if (subroutes) {
                  return next(req, next);
                }
              };
              if (isExistingRoute) {
                return container.animateOut(req.isSamePath, showNextPage);
              } else {
                return showNextPage();
              }
            }
          };
          if (typeof subroutes === 'function') {
            subroutes(function(subpath, handler, subroutes) {
              if (subpath === '/') {
                subpath = '';
              }
              return handleRoute(path + subpath, handler, subroutes, depth + 1, callback);
            });
            return;
          }
        } else if (typeof handler === 'function') {
          callback = function(req, next) {
            _this.rootController.params = req.params;
            _this.rootController.query = req.query;
            return handler(_this.rootController, next);
          };
        } else {
          throw new Error('route handler must be a string path or a function');
        }
        return _this.router.route(path, callback);
      };
      handleRoute(path, handler, subroutes, 0);
      return this;
    };

    App.prototype.redirect = function(url, replace) {
      if (replace == null) {
        replace = false;
      }
      return this.router.redirect(url, replace);
    };

    App.prototype.hasMatchingRoutes = function(url) {
      return this.router.getRoutesMatchingPath(url).length > 0;
    };

    App.prototype.mount = function(path, app) {};

    App.prototype.listen = function(options) {
      var _this = this;
      if (options == null) {
        options = {};
      }
      $(function() {
        var app;
        if (options.stop) {
          if (_this._routeHandler) {
            _this.router.off('change', _this._routeHandler);
          }
          if (_this._clickHandler) {
            _this.rootElement.off('click', _this._clickHandler);
          }
          return _this.router.listen(options);
        }
        app = _this;
        _this._routeHandler = function(event, path) {
          return _this.trigger('urlChange', [path]);
        };
        _this._clickHandler = function(event) {
          var anchor, linkHost, url;
          if (!(anchor = $(event.target).closest('a[href]').get(0))) {
            return;
          }
          if (event.isDefaultPrevented()) {
            return;
          }
          linkHost = anchor.host.replace(/:80$|:443$/, '');
          url = $(anchor).attr('href').replace(/^#/, '');
          if (linkHost && linkHost !== location.host) {
            return;
          }
          if (event.metaKey || event.ctrlKey || $(event.target).attr('target')) {
            return;
          }
          if (options.dontHandle404s && !app.hasMatchingRoutes(url)) {
            return;
          }
          event.preventDefault();
          if (anchor.href === location.href + '#') {
            return;
          }
          if (!$(anchor).attr('disabled')) {
            return app.redirect(url);
          }
        };
        _this.router.on('change', _this._routeHandler);
        _this.rootElement.on('click', _this._clickHandler);
        return _this.router.listen(options);
      });
      return this;
    };

    return App;

  })();

  chip.App = App;

  Binding = (function() {
    function Binding(name, expr) {
      this.name = name;
      this.expr = expr;
    }

    Binding.bindings = [];

    Binding.addBinding = function(name, options, handler) {
      var entry;
      if (typeof options === 'function') {
        handler = options;
        options = {};
      } else if (!options) {
        options = {};
      }
      entry = {
        name: options.name || name,
        priority: options.priority || 0,
        keepAttribute: options.keepAttribute,
        handler: handler
      };
      this.bindings[name] = entry;
      this.bindings.push(entry);
      this.bindings.sort(bindingSort);
      return entry;
    };

    Binding.getBinding = function(name) {
      if (this.bindings.hasOwnProperty(name)) {
        return this.bindings[name];
      }
    };

    Binding.removeBinding = function(name) {
      var entry;
      entry = this.getBinding(name);
      if (!entry) {
        return;
      }
      delete this.bindings[name];
      return this.bindings.splice(this.bindings.indexOf(entry), 1);
    };

    Binding.addEventBinding = function(name, options) {
      var eventName;
      eventName = name.split('-').slice(1).join('-');
      return this.addBinding(name, options, function(element, attr, controller) {
        var expr;
        expr = attr.value;
        return element.on(eventName, function(event) {
          event.preventDefault();
          if (!element.attr('disabled')) {
            controller.thisElement = element;
            controller["eval"](expr);
            return delete controller.thisElement;
          }
        });
      });
    };

    Binding.addKeyEventBinding = function(name, keyCode, ctrlKey, options) {
      return this.addBinding(name, options, function(element, attr, controller) {
        var expr;
        expr = attr.value;
        return element.on('keydown', function(event) {
          if ((ctrlKey != null) && (event.ctrlKey !== ctrlKey && event.metaKey !== ctrlKey)) {
            return;
          }
          if (event.keyCode !== keyCode) {
            return;
          }
          event.preventDefault();
          if (!element.attr('disabled')) {
            controller.thisElement = element;
            controller["eval"](expr);
            return delete controller.thisElement;
          }
        });
      });
    };

    Binding.addAttributeBinding = function(name, options) {
      var attrName;
      attrName = name.split('-').slice(1).join('-');
      return this.addBinding(name, options, function(element, attr, controller) {
        var expr;
        expr = attr.value;
        return controller.watch(expr, function(value) {
          if (value != null) {
            element.attr(attrName, value);
            return element.trigger(attrName + 'Changed');
          } else {
            return element.removeAttr(attrName);
          }
        });
      });
    };

    Binding.addAttributeToggleBinding = function(name, options) {
      var attrName;
      attrName = name.split('-').slice(1).join('-');
      return this.addBinding(name, options, function(element, attr, controller) {
        var expr;
        expr = attr.value;
        return controller.watch(expr, function(value) {
          return element.prop(attrName, value && true || false);
        });
      });
    };

    Binding.process = function(element, controller) {
      var attribute, attributes, binding, node, parentNode, processed, result, slice, walker;
      if (!(controller instanceof Controller)) {
        throw new Error('A Controller is required to bind a jQuery element.');
      }
      slice = Array.prototype.slice;
      walker = new Walker(element.get(0));
      processed = [];
      walker.onElementDone = function(node) {
        if (processed.length && processed[processed.length - 1].get(0) === node) {
          return processed.pop().trigger('processed');
        }
      };
      while (node = walker.next()) {
        if (node !== walker.root) {
          element = $(node);
        }
        parentNode = node.parentNode;
        attributes = slice.call(node.attributes).map(getBoundAttributes).filter(filterAttributes).sort(sortAttributes);
        if (attributes.length) {
          processed.push(element);
        }
        while (attributes.length) {
          attribute = attributes.shift();
          binding = attribute.binding;
          if (!binding.keepAttribute) {
            element.removeAttr(attribute.name);
          }
          if (binding.name.slice(-2) === '-*') {
            attribute.match = attribute.name.replace(binding.name.slice(0, -1), '');
            attribute.camel = attribute.match.replace(/[-_]+(\w)/g, function(_, char) {
              return char.toUpperCase();
            });
          }
          result = binding.handler(element, attribute, controller);
          if (node.parentNode !== parentNode) {
            processed.pop();
            break;
          }
          if (result === false) {
            walker.skip();
            break;
          }
        }
      }
      return element;
    };

    return Binding;

  })();

  getBoundAttributes = function(attr) {
    var binding, parts;
    binding = Binding.getBinding(attr.name);
    if (!binding) {
      parts = attr.name.split('-');
      while (parts.length > 1) {
        parts.pop();
        if ((binding = Binding.getBinding(parts.join('-') + '-*'))) {
          break;
        }
      }
    }
    if (!binding) {
      if (expression.isInverted(attr.value)) {
        binding = Binding.getBinding('attr-*');
      }
    }
    if (binding) {
      return {
        binding: binding,
        name: attr.name,
        value: attr.value
      };
    }
  };

  filterAttributes = function(binding) {
    return binding;
  };

  sortAttributes = function(a, b) {
    return b.binding.priority - a.binding.priority;
  };

  bindingSort = function(a, b) {
    return b.priority - a.priority;
  };

  jQuery.fn.bindTo = function(controller) {
    if (this.length !== 0) {
      return Binding.process(this, controller);
    }
  };

  chip.Binding = Binding;

  Walker = (function() {
    function Walker(root) {
      this.root = root;
      this.current = null;
    }

    Walker.prototype.onElementDone = function() {};

    Walker.prototype.next = function() {
      if (this.current === null) {
        this.current = this.root;
      } else {
        if (this.current !== this.root && this.current.parentNode === null) {
          this.current = this.placeholder;
        }
        this.current = this.traverse(this.current);
      }
      if (this.current) {
        this.placeholder = {
          parentNode: this.current.parentNode,
          nextElementSibling: this.current.nextElementSibling
        };
      } else {
        this.placeholder = null;
        this.onElementDone(this.root);
      }
      return this.current;
    };

    Walker.prototype.traverse = function(node) {
      var child, sibling;
      if (node.nodeType) {
        child = node.firstElementChild;
        if (child) {
          return child;
        }
      }
      while (node !== null) {
        if (node.nodeType) {
          this.onElementDone(node);
        }
        if (node === this.root) {
          return null;
        }
        sibling = node.nextElementSibling;
        if (sibling) {
          return sibling;
        }
        node = node.parentNode;
      }
      return node;
    };

    Walker.prototype.skip = function() {
      return this.current = this.placeholder;
    };

    return Walker;

  })();

  Filter = (function() {
    function Filter(name, filter) {
      this.name = name;
      this.filter = filter;
    }

    Filter.filters = {};

    Filter.addFilter = function(name, filter) {
      if (filter != null) {
        this.filters[name] = filter;
      }
      return this;
    };

    Filter.getFilter = function(name) {
      return this.filters[name];
    };

    return Filter;

  })();

  chip.binding('bind-debug', {
    priority: 200
  }, function(element, attr, controller) {
    var expr;
    expr = attr.value;
    return controller.watch(expr, function(value) {
      return typeof console !== "undefined" && console !== null ? console.info('Debug:', expr, '=', value) : void 0;
    });
  });

  chip.binding('bind-route', {
    keepAttribute: true
  }, function() {});

  chip.binding('bind-text', function(element, attr, controller) {
    var expr;
    expr = attr.value;
    return controller.watch(expr, function(value) {
      return element.text(value != null ? value : '');
    });
  });

  chip.binding('bind-html', function(element, attr, controller) {
    var expr;
    expr = attr.value;
    return controller.watch(expr, function(value) {
      return element.html(value != null ? value : '');
    });
  });

  chip.binding('bind-trim', function(element, attr, controller) {
    var next, node, _results;
    node = element.get(0).firstChild;
    _results = [];
    while (node) {
      next = node.nextSibling;
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.nodeValue.match(/^\s*$/)) {
          node.parentNode.removeChild(node);
        } else {
          node.textContent = node.textContent.trim();
        }
      }
      _results.push(node = next);
    }
    return _results;
  });

  chip.binding('bind-translate', function(element, attr, controller) {
    var i, node, nodes, placeholders, refresh, text, _i, _len;
    nodes = element.get(0).childNodes;
    text = '';
    placeholders = [];
    for (i = _i = 0, _len = nodes.length; _i < _len; i = ++_i) {
      node = nodes[i];
      if (node.nodeType === 3) {
        if (!(node.nodeValue.trim() === '' && (i === 0 || i === nodes.length - 1))) {
          text += node.nodeValue;
        }
      } else if (node.nodeType === 1) {
        text += '%{' + placeholders.length + '}';
        placeholders.push(node);
      }
    }
    refresh = function() {
      var exp, lastIndex, match, startIndex, translation;
      translation = controller.translations[text] || text;
      exp = /%{(\d+)}/g;
      nodes = [];
      lastIndex = 0;
      while ((match = exp.exec(translation))) {
        startIndex = exp.lastIndex - match[0].length;
        if (lastIndex !== startIndex) {
          nodes.push(document.createTextNode(translation.slice(lastIndex, startIndex)));
        }
        nodes.push(placeholders[match[1]]);
        lastIndex = exp.lastIndex;
      }
      if (lastIndex !== translation.length) {
        nodes.push(document.createTextNode(translation.slice(lastIndex)));
      }
      return element.html(nodes);
    };
    element.on('remove', function() {
      return controller.off('translationChange', refresh);
    });
    controller.on('translationChange', refresh);
    if (controller.translations[text]) {
      return refresh();
    }
  });

  chip.binding('bind-class', function(element, attr, controller) {
    var expr, prevClasses;
    expr = attr.value;
    prevClasses = (element.attr('class') || '').split(/\s+/);
    if (prevClasses[0] === '') {
      prevClasses.pop();
    }
    return controller.watch(expr, function(value) {
      var className, toggle, _results;
      if (Array.isArray(value)) {
        value = value.join(' ');
      }
      if (typeof value === 'string') {
        return element.attr('class', value.split(/\s+/).concat(prevClasses).join(' '));
      } else if (value && typeof value === 'object') {
        _results = [];
        for (className in value) {
          if (!__hasProp.call(value, className)) continue;
          toggle = value[className];
          if (toggle) {
            _results.push(element.addClass(className));
          } else {
            _results.push(element.removeClass(className));
          }
        }
        return _results;
      }
    });
  });

  chip.binding('bind-attr', function(element, attr, controller) {
    var expr;
    expr = attr.value;
    return controller.watch(expr, function(value, oldValue, changes) {
      var attrName, attrValue, _results;
      if (changes) {
        return changes.forEach(function(change) {
          if (change.type === 'deleted' || (value[change.name] == null)) {
            element.removeAttr(change.name);
            return element.trigger(change.name + 'Changed');
          } else {
            element.attr(change.name, value[change.name]);
            return element.trigger(change.name + 'Changed');
          }
        });
      } else if (value && typeof value === 'object') {
        _results = [];
        for (attrName in value) {
          if (!__hasProp.call(value, attrName)) continue;
          attrValue = value[attrName];
          if (attrValue != null) {
            element.attr(attrName, attrValue);
            _results.push(element.trigger(attrName + 'Changed'));
          } else {
            element.removeAttr(attrName);
            _results.push(element.trigger(attrName + 'Changed'));
          }
        }
        return _results;
      }
    });
  });

  chip.binding('bind-active', function(element, attr, controller) {
    var expr, link, refresh;
    expr = attr.value;
    if (expr) {
      return controller.watch(expr, function(value) {
        if (value) {
          return element.addClass('active');
        } else {
          return element.removeClass('active');
        }
      });
    } else {
      refresh = function() {
        if (link.length && link.get(0).href === location.href) {
          return element.addClass('active');
        } else {
          return element.removeClass('active');
        }
      };
      link = element.filter('a').add(element.find('a')).first();
      link.on('hrefChanged', refresh);
      controller.on('urlChange', refresh);
      element.on('remove', function() {
        return controller.off('urlChange', refresh);
      });
      return refresh();
    }
  });

  chip.binding('bind-active-section', function(element, attr, controller) {
    var link, refresh;
    refresh = function() {
      if (link.length && location.href.indexOf(link.get(0).href) === 0) {
        return element.addClass('active');
      } else {
        return element.removeClass('active');
      }
    };
    link = element.filter('a').add(element.find('a')).first();
    link.on('hrefChanged', refresh);
    controller.on('urlChange', refresh);
    element.on('remove', function() {
      return controller.off('urlChange', refresh);
    });
    return refresh();
  });

  chip.binding('bind-change-action', function(element, attr, controller) {
    var action, expr, _ref;
    expr = attr.value;
    _ref = expr.split(/\s*!\s*/), expr = _ref[0], action = _ref[1];
    return controller.watch(expr, function(value) {
      controller.thisElement = element;
      controller["eval"](action);
      return delete controller.thisElement;
    });
  });

  chip.binding('bind-show', function(element, attr, controller) {
    var expr;
    expr = attr.value;
    return controller.watch(expr, function(value) {
      if (value) {
        return element.show();
      } else {
        return element.hide();
      }
    });
  });

  chip.binding('bind-hide', function(element, attr, controller) {
    var expr;
    expr = attr.value;
    return controller.watch(expr, function(value) {
      if (value) {
        return element.hide();
      } else {
        return element.show();
      }
    });
  });

  chip.binding('bind-value', function(element, attr, controller) {
    var checkedAttr, checkedValue, events, expr, fieldExpr, getValue, observer, selectValueField, setValue, uncheckedAttr, uncheckedValue, watchExpr;
    expr = attr.value;
    watchExpr = expr;
    fieldExpr = element.attr('bind-value-field');
    element.removeAttr('bind-value-field');
    if (element.is('select')) {
      selectValueField = fieldExpr ? controller["eval"](fieldExpr) : null;
      chip.lastSelectValueField = selectValueField;
    }
    if (element.is('option') && (fieldExpr || chip.lastSelectValueField)) {
      if (fieldExpr) {
        selectValueField = controller["eval"](fieldExpr);
      } else {
        selectValueField = chip.lastSelectValueField;
      }
      watchExpr += '.' + selectValueField;
    }
    if (element.attr('type') === 'checkbox') {
      checkedAttr = element.attr('checked-value') || 'true';
      uncheckedAttr = element.attr('unchecked-value') || 'false';
      element.removeAttr('checked-value');
      element.removeAttr('unchecked-value');
      checkedValue = controller["eval"](checkedAttr);
      uncheckedValue = controller["eval"](uncheckedAttr);
    }
    getValue = element.attr('type') === 'checkbox' ? function() {
      return element.prop('checked') && checkedValue || uncheckedValue;
    } : element.attr('type') === 'file' ? function() {
      var _ref;
      return (_ref = element.get(0).files) != null ? _ref[0] : void 0;
    } : element.is(':not(input,select,textarea,option)') ? function() {
      return element.find('input:radio:checked').val();
    } : selectValueField && element.is('select') ? function(realValue) {
      if (realValue) {
        return $(element.get(0).options[element.get(0).selectedIndex]).data('value');
      } else {
        return element.val();
      }
    } : function() {
      return element.val();
    };
    setValue = element.attr('type') === 'checkbox' ? function(value) {
      return element.prop('checked', value === checkedValue);
    } : element.attr('type') === 'file' ? function(value) {} : element.is(':not(input,select,textarea,option)') ? function(value) {
      element.find('input:radio:checked').prop('checked', false);
      return element.find('input:radio[value="' + value + '"]').prop('checked', true);
    } : function(value) {
      var strValue;
      strValue = selectValueField && (value != null ? value[selectValueField] : void 0) || value;
      if (strValue != null) {
        strValue = '' + strValue;
      }
      element.val(strValue);
      if (selectValueField) {
        return element.data('value', value);
      }
    };
    observer = controller.watch(watchExpr, function(value) {
      if (getValue() !== '' + value) {
        return setValue(controller["eval"](expr));
      }
    });
    if (element.is('option')) {
      return;
    }
    if (element.is('select')) {
      element.one('processed', function() {
        setValue(controller["eval"](expr));
        if (!element.is('[readonly]')) {
          return controller.evalSetter(expr, getValue(true));
        }
      });
    } else if (!element.is('[readonly]')) {
      controller.evalSetter(expr, getValue());
    }
    events = element.attr('bind-value-events') || 'change';
    element.removeAttr('bind-value-events');
    if (element.is(':text')) {
      element.on('keydown', function(event) {
        if (event.keyCode === 13) {
          return element.trigger('change');
        }
      });
    }
    return element.on(events, function() {
      if (getValue() !== observer.oldValue && !element.is('[readonly]')) {
        controller.evalSetter(expr, getValue(true));
        observer.skipNextSync();
        return controller.sync();
      }
    });
  });

  chip.binding('on-*', function(element, attr, controller) {
    var eventName, expr;
    eventName = attr.match;
    expr = attr.value;
    return element.on(eventName, function(event) {
      if (event.originalEvent) {
        event.preventDefault();
      }
      if (!element.attr('disabled')) {
        return controller["eval"](expr, {
          event: event,
          element: element
        });
      }
    });
  });

  keyCodes = {
    enter: 13,
    esc: 27
  };

  for (name in keyCodes) {
    if (!__hasProp.call(keyCodes, name)) continue;
    keyCode = keyCodes[name];
    chip.keyEventBinding('on-' + name, keyCode);
  }

  chip.keyEventBinding('on-ctrl-enter', keyCodes.enter, true);

  chip.binding('attr-*', function(element, attr, controller) {
    var attrName, expr;
    if (attr.name !== attr.match) {
      attrName = attr.match;
      expr = attr.value;
    } else {
      attrName = attr.name;
      expr = expression.revert(attr.value);
    }
    return controller.watch(expr, function(value) {
      if (value != null) {
        element.attr(attrName, value);
        return element.trigger(attrName + 'Changed');
      } else {
        return element.removeAttr(attrName);
      }
    });
  });

  ['attr-checked', 'attr-disabled', 'attr-multiple', 'attr-readonly', 'attr-selected'].forEach(function(name) {
    return chip.attributeToggleBinding(name);
  });

  $.fn.animateIn = function(callback) {
    var placeholder,
      _this = this;
    if (this.parent().length) {
      placeholder = $('<!---->');
      this.before(placeholder);
      this.detach();
    }
    this.addClass('animate-in');
    if (placeholder) {
      placeholder.after(this);
      placeholder.remove();
    }
    setTimeout(function() {
      _this.removeClass('animate-in');
      if (callback) {
        if (_this.willAnimate()) {
          return _this.one('webkittransitionend transitionend webkitanimationend animationend', function() {
            return callback();
          });
        } else {
          return callback();
        }
      }
    });
    return this;
  };

  $.fn.animateOut = function(dontRemove, callback) {
    var done, duration, timeout,
      _this = this;
    if (typeof dontRemove === 'function') {
      callback = dontRemove;
      dontRemove = false;
    }
    if (!dontRemove) {
      this.triggerHandler('remove');
    }
    duration = this.cssDuration('transition') || this.cssDuration('animation');
    if (duration) {
      this.addClass('animate-out');
      done = function() {
        clearTimeout(timeout);
        _this.off('webkittransitionend transitionend webkitanimationend animationend', done);
        _this.removeClass('animate-out');
        if (callback) {
          return callback();
        } else {
          return _this.remove();
        }
      };
      this.one('webkittransitionend transitionend webkitanimationend animationend', done);
      timeout = setTimeout(done, duration + 100);
    } else {
      if (callback) {
        callback();
      } else if (!dontRemove) {
        this.remove();
      }
    }
    return this;
  };

  $.fn.cssDuration = function(property) {
    var millis, time;
    time = this.css(property + '-duration') || this.css('-webkit-' + property + '-duration');
    millis = parseFloat(time);
    if (/\ds/.test(time)) {
      millis *= 1000;
    }
    return millis || 0;
  };

  $.fn.willAnimate = function() {
    return (this.cssDuration('transition' || this.cssDuration('animation'))) && true;
  };

  chip.binding.prepareScope = prepareScope = function(element, attr, controller) {
    var controllerName, frag, placeholder, template;
    template = $(element);
    placeholder = $("<!--" + attr.name + "=\"" + attr.value + "\"-->");
    if (controller.element[0] === element[0]) {
      frag = document.createDocumentFragment();
      frag.appendChild(placeholder[0]);
      element[0] = frag;
    } else {
      element.replaceWith(placeholder);
    }
    controllerName = element.attr('bind-controller');
    element.removeAttr('bind-controller');
    return {
      template: template,
      placeholder: placeholder,
      controllerName: controllerName
    };
  };

  chip.binding.swapPlaceholder = swapPlaceholder = function(placeholder, element) {
    return placeholder[0].parentNode.replaceChild(element[0], placeholder[0]);
  };

  chip.binding('bind-if', {
    priority: 50
  }, function(element, attr, controller) {
    var controllerName, expr, placeholder, template, _ref;
    expr = attr.value;
    _ref = prepareScope(element, attr, controller), template = _ref.template, placeholder = _ref.placeholder, controllerName = _ref.controllerName;
    controller.watch(expr, function(value) {
      if (value) {
        if (placeholder[0].parentNode) {
          element = template.clone().animateIn();
          controller.child({
            element: element,
            name: controllerName,
            passthrough: true
          });
          return swapPlaceholder(placeholder, element);
        }
      } else {
        if (!placeholder[0].parentNode) {
          element.before(placeholder);
          return element.animateOut();
        }
      }
    });
    return false;
  });

  chip.binding('bind-unless', {
    priority: 50
  }, function(element, attr, controller) {
    var controllerName, expr, placeholder, template, _ref;
    expr = attr.value;
    _ref = prepareScope(element, attr, controller), template = _ref.template, placeholder = _ref.placeholder, controllerName = _ref.controllerName;
    controller.watch(expr, function(value) {
      if (!value) {
        if (placeholder[0].parentNode) {
          element = template.clone().animateIn();
          controller.child({
            element: element,
            name: controllerName,
            passthrough: true
          });
          return swapPlaceholder(placeholder, element);
        }
      } else {
        if (!placeholder[0].parentNode) {
          element.before(placeholder);
          return element.animateOut();
        }
      }
    });
    return false;
  });

  chip.binding('bind-each', {
    priority: 100
  }, function(element, attr, controller) {
    var controllerName, createElement, elements, expr, itemName, match, orig, placeholder, propName, properties, template, value, _ref, _ref1, _ref2;
    orig = expr = attr.value;
    _ref = prepareScope(element, attr, controller), template = _ref.template, placeholder = _ref.placeholder, controllerName = _ref.controllerName;
    _ref1 = expr.split(/\s+in\s+/), itemName = _ref1[0], expr = _ref1[1];
    _ref2 = itemName.split(/\s*,\s*/), itemName = _ref2[0], propName = _ref2[1];
    if (!(itemName && expr)) {
      throw "Invalid bind-each=\"" + orig + '". Requires the format "item in list"' + ' or "key, propery in object".';
    }
    if ((match = expr.match(/\[(.+?)(\.{2,3})(.+)\]/))) {
      if (match[2] === '..') {
        controller.__each_range = function(start, end) {
          var num, _i, _results;
          if (start == null) {
            start = 0;
          }
          if (end == null) {
            end = 0;
          }
          _results = [];
          for (num = _i = start; start <= end ? _i <= end : _i >= end; num = start <= end ? ++_i : --_i) {
            _results.push(num);
          }
          return _results;
        };
      } else {
        controller.__each_range = function(start, end) {
          var num, _i, _results;
          if (start == null) {
            start = 0;
          }
          if (end == null) {
            end = 0;
          }
          _results = [];
          for (num = _i = start; start <= end ? _i < end : _i > end; num = start <= end ? ++_i : --_i) {
            _results.push(num);
          }
          return _results;
        };
      }
      expr = "__each_range(" + match[1] + ", " + match[3] + ")";
    }
    elements = $();
    properties = {};
    value = null;
    createElement = function(item, index) {
      var newElement;
      newElement = template.clone();
      if (!Array.isArray(value)) {
        if (propName) {
          properties[propName] = item;
        }
        properties[itemName] = value[item];
      } else {
        properties[itemName] = item;
        properties.index = index;
      }
      controller.child({
        element: newElement,
        name: controllerName,
        properties: properties
      });
      return newElement.get(0);
    };
    controller.watch(expr, function(newValue, oldValue, splices) {
      var hasNew;
      value = newValue;
      if (!splices) {
        if (elements.length) {
          elements.eq(0).replaceWith(placeholder);
          elements.remove();
          elements = $();
        }
        if (newValue && !Array.isArray(newValue) && typeof newValue === 'object') {
          newValue = Object.keys(newValue);
        }
        if (Array.isArray(value) && value.length) {
          value.forEach(function(item, index) {
            return elements.push(createElement(item, index));
          });
          return placeholder.after(elements).remove();
        }
      } else if (Array.isArray(value) || (value && typeof value === 'object')) {
        if (!Array.isArray(value)) {
          splices = diff.arrays(Object.keys(value), Object.keys(oldValue));
        }
        hasNew = 0;
        splices.forEach(function(splice) {
          return hasNew += splice.addedCount;
        });
        return splices.forEach(function(splice) {
          var addIndex, args, item, newElements, removedElements;
          args = [splice.index, splice.removed.length];
          newElements = [];
          addIndex = splice.index;
          while (addIndex < splice.index + splice.addedCount) {
            item = value[addIndex];
            newElements.push(createElement(item, addIndex));
            addIndex++;
          }
          removedElements = $(elements.splice.apply(elements, args.concat(newElements)));
          if (removedElements.length) {
            if (elements.length - newElements.length === 0) {
              removedElements.eq(0).before(placeholder);
            }
            if (hasNew) {
              removedElements.remove();
            } else {
              removedElements.animateOut();
            }
          }
          if (newElements.length) {
            $(newElements).animateIn();
            if (splice.index === 0) {
              if (placeholder.parent().length) {
                return placeholder.after(newElements).remove();
              } else {
                return elements.eq(newElements.length).before(newElements);
              }
            } else {
              return elements.eq(splice.index - 1).after(newElements);
            }
          }
        });
      }
    });
    return false;
  });

  chip.binding('bind-partial', {
    priority: 40
  }, function(element, attr, controller) {
    var childController, expr, properties;
    expr = attr.value;
    childController = null;
    if (element.children().length) {
      properties = {
        _partialContent: element.children().remove()
      };
    } else {
      properties = {
        _partialContent: null
      };
    }
    if (element.is('iframe')) {
      element.css({
        border: 'none',
        background: 'none transparent',
        width: '100%'
      });
    }
    controller.watch(expr, function(name) {
      var e, setup, _ref, _ref1;
      if (element.is('iframe')) {
        if ((_ref = element.data('body')) != null) {
          _ref.triggerHandler('remove');
        }
        if ((_ref1 = element.data('body')) != null) {
          _ref1.html('');
        }
        element.removeData('body');
        if (!name) {
          return;
        }
        setup = function(body) {
          body.siblings('head').html($('link[rel="stylesheet"][href]').clone()).append('<style>\nbody {\n  background: none transparent;\n  width: auto;\n  min-width: 0;\n  margin: 0;\n  padding: 0;\n}\n</style>');
          body.html(controller.template(name));
          childController = controller.child({
            element: body,
            name: name,
            properties: properties
          });
          element.height(body.outerHeight());
          return element.data('body', body);
        };
        try {
          return setup(element.contents().find('body'));
        } catch (_error) {
          e = _error;
          element.one('load', function() {
            return setup(element.contents().find('body'));
          });
          return element.attr('src', 'about:blank');
        }
      } else {
        return element.animateOut(function() {
          element.html('');
          if (name == null) {
            return;
          }
          element.html(controller.template(name));
          element.animateIn();
          return childController = controller.child({
            element: element,
            name: name,
            properties: properties
          });
        });
      }
    });
    return false;
  });

  chip.binding('local-*', {
    priority: 20
  }, function(element, attr, controller) {
    var expr, prop;
    expr = attr.value;
    prop = attr.camel;
    if (expr) {
      controller.watch(expr, function(value) {
        return controller[prop] = value;
      });
      if (expr.slice(-1) !== ')') {
        return controller.watch(prop, true, function(value) {
          return controller.parent.passthrough().evalSetter(expr, value);
        });
      }
    } else {
      return controller[prop] = true;
    }
  });

  chip.binding('bind-content', {
    priority: 40
  }, function(element, attr, controller) {
    if (controller._partialContent) {
      return element.html(controller._partialContent);
    }
  });

  chip.binding('bind-controller', {
    priority: 30
  }, function(element, attr, controller) {
    var controllerName;
    controllerName = attr.value;
    controller.child({
      element: element,
      name: controllerName
    });
    return false;
  });

  chip.filter('filter', function(value, filterFunc) {
    var func, key, _i, _len;
    if (!Array.isArray(value)) {
      return [];
    }
    if (!filterFunc) {
      return value;
    }
    if (typeof filterFunc === 'function') {
      return value.filter(filterFunc, this);
    } else if (Array.isArray(filterFunc)) {
      for (_i = 0, _len = filterFunc.length; _i < _len; _i++) {
        func = filterFunc[_i];
        value = value.filter(func, this);
      }
      return value;
    } else if (typeof filterFunc === 'object') {
      for (key in filterFunc) {
        if (!__hasProp.call(filterFunc, key)) continue;
        func = filterFunc[key];
        if (typeof func === 'function') {
          value = value.filter(func, this);
        }
      }
      return value;
    }
  });

  chip.filter('map', function(value, mapFunc) {
    if (!((value != null) && mapFunc)) {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map(mapFunc, this);
    } else {
      return mapFunc.call(this, value);
    }
  });

  chip.filter('reduce', function(value, reduceFunc, initialValue) {
    if (!((value != null) && reduceFunc)) {
      return value;
    }
    if (Array.isArray(value)) {
      if (arguments.length === 3) {
        return value.reduce(reduceFunc, initialValue);
      } else {
        return value.reduce(reduceFunc);
      }
    } else if (arguments.length === 3) {
      return reduceFunc(initialValue, value);
    }
  });

  chip.filter('slice', function(value, index, endIndex) {
    if (Array.isArray(value)) {
      return value.slice(index, endIndex);
    } else {
      return value;
    }
  });

  chip.filter('date', function(value) {
    if (!value) {
      return '';
    }
    if (!(value instanceof Date)) {
      value = new Date(value);
    }
    if (isNaN(value.getTime())) {
      return '';
    }
    return value.toLocaleString();
  });

  chip.filter('log', function(value, prefix) {
    if (prefix == null) {
      prefix = 'Log';
    }
    console.log(prefix + ':', value);
    return value;
  });

  chip.filter('limit', function(value, limit) {
    if (value && typeof value.slice === 'function') {
      if (limit < 0) {
        return value.slice(limit);
      } else {
        return value.slice(0, limit);
      }
    } else {
      return value;
    }
  });

  chip.filter('sort', function(value, sortFunc, dir) {
    var dir2, origFunc, prop, _ref;
    if (!(sortFunc && Array.isArray(value))) {
      return value;
    }
    dir = dir === 'desc' ? -1 : 1;
    if (typeof sortFunc === 'string') {
      _ref = sortFunc.split(':'), prop = _ref[0], dir2 = _ref[1];
      dir2 = dir2 === 'desc' ? -1 : 1;
      dir = dir || dir2;
      sortFunc = function(a, b) {
        if (a[prop] > b[prop]) {
          return dir;
        }
        if (a[prop] < b[prop]) {
          return -dir;
        }
        return 0;
      };
    } else if (dir === -1) {
      origFunc = sortFunc;
      sortFunc = function(a, b) {
        return -origFunc(a, b);
      };
    }
    return value.slice().sort(sortFunc);
  });

  chip.filter('addQuery', function(value, queryField, queryValue) {
    var addedQuery, expr, query, url, _ref;
    url = value || location.href;
    _ref = url.split('?'), url = _ref[0], query = _ref[1];
    addedQuery = '';
    if (queryValue != null) {
      addedQuery = queryField + '=' + encodeURIComponent(queryValue);
    }
    if (query) {
      expr = new RegExp('\\b' + queryField + '=[^&]*');
      if (expr.test(query)) {
        query = query.replace(expr, addedQuery);
      } else if (addedQuery) {
        query += '&' + addedQuery;
      }
    } else {
      query = addedQuery;
    }
    if (query) {
      url = [url, query].join('?');
    }
    return url;
  });

  chip.filter('paginate', function(value, pageSize, defaultPage, name) {
    var begin, currentPage, end, index, pageCount, pagination, _ref;
    if (defaultPage == null) {
      defaultPage = 1;
    }
    if (name == null) {
      name = 'pagination';
    }
    if (!(pageSize && Array.isArray(value))) {
      delete this.app.rootController[name];
      this.trigger('paginated');
      return value;
    } else {
      pageCount = Math.ceil(value.length / pageSize);
      if (defaultPage < 0) {
        defaultPage = pageCount + defaultPage + 1;
      } else if (typeof defaultPage === 'function') {
        defaultPage = defaultPage(value, pageSize, pageCount) || 1;
      }
      currentPage = Math.min(pageCount, Math.max(1, ((_ref = this.query) != null ? _ref.page : void 0) || defaultPage));
      index = currentPage - 1;
      begin = index * pageSize;
      end = Math.min(begin + pageSize, value.length);
      if (!this.app.rootController[name]) {
        this.app.rootController[name] = {};
      }
      pagination = this.app.rootController[name];
      pagination.array = value;
      pagination.page = value.slice(begin, end);
      pagination.pageSize = pageSize;
      pagination.pageCount = pageCount;
      pagination.defaultPage = defaultPage;
      pagination.currentPage = currentPage;
      pagination.beginIndex = begin;
      pagination.endIndex = end;
      this.trigger('paginated');
      return pagination.page;
    }
  });

  div = null;

  chip.filter('escape', function(value) {
    if (!div) {
      div = $('<div></div>');
    }
    return div.text(value || '').text();
  });

  chip.filter('p', function(value) {
    var escaped, lines;
    if (!div) {
      div = $('<div></div>');
    }
    lines = (value || '').split(/\r?\n/);
    escaped = lines.map(function(line) {
      return div.text(line).text() || '<br>';
    });
    return '<p>' + escaped.join('</p><p>') + '</p>';
  });

  chip.filter('br', function(value) {
    var escaped, lines;
    if (!div) {
      div = $('<div></div>');
    }
    lines = (value || '').split(/\r?\n/);
    escaped = lines.map(function(line) {
      return div.text(line).text();
    });
    return escaped.join('<br>');
  });

  chip.filter('newline', function(value) {
    var escaped, paragraphs;
    if (!div) {
      div = $('<div></div>');
    }
    paragraphs = (value || '').split(/\r?\n\s*\r?\n/);
    escaped = paragraphs.map(function(paragraph) {
      var lines;
      lines = paragraph.split(/\r?\n/);
      escaped = lines.map(function(line) {
        return div.text(line).text();
      });
      return escaped.join('<br>');
    });
    return '<p>' + escaped.join('</p><p>') + '</p>';
  });

  urlExp = /(^|\s|\()((?:https?|ftp):\/\/[\-A-Z0-9+\u0026@#\/%?=()~_|!:,.;]*[\-A-Z0-9+\u0026@#\/%=~(_|])/gi;

  chip.filter('autolink', function(value, target) {
    target = target ? ' target="_blank"' : '';
    return ('' + value).replace(/<[^>]+>|[^<]+/g, function(match) {
      if (match.charAt(0) === '<') {
        return match;
      }
      return match.replace(urlExp, '$1<a href="$2"' + target + '>$2</a>');
    });
  });

  chip.filter('int', function(value) {
    value = parseInt(value);
    if (isNaN(value)) {
      return null;
    } else {
      return value;
    }
  });

  chip.filter('float', function(value) {
    value = parseFloat(value);
    if (isNaN(value)) {
      return null;
    } else {
      return value;
    }
  });

  chip.filter('bool', function(value) {
    return value && value !== '0' && value !== 'false';
  });

  diff = {};

  (function() {
    var EDIT_ADD, EDIT_DELETE, EDIT_LEAVE, EDIT_UPDATE, calcEditDistances, newChange, newSplice, sharedPrefix, sharedSuffix, spliceOperationsFromEditDistances;
    diff.clone = function(value, deep) {
      var copy, key, objValue;
      if (Array.isArray(value)) {
        if (deep) {
          return value.map(function(value) {
            return diff.clone(value, deep);
          });
        } else {
          return value.slice();
        }
      } else if (value && typeof value === 'object') {
        if (value.valueOf() !== value) {
          return new value.constructor(value.valueOf());
        } else {
          copy = {};
          for (key in value) {
            objValue = value[key];
            if (deep) {
              objValue = diff.clone(objValue, deep);
            }
            copy[key] = objValue;
          }
          return copy;
        }
      } else {
        return value;
      }
    };
    diff.values = function(value, oldValue) {
      var changeRecords, oldValueValue, splices, valueValue;
      if (Array.isArray(value) && Array.isArray(oldValue)) {
        splices = diff.arrays(value, oldValue);
        if (splices.length) {
          return splices;
        } else {
          return false;
        }
      } else if (value && oldValue && typeof value === 'object' && typeof oldValue === 'object') {
        valueValue = value.valueOf();
        oldValueValue = oldValue.valueOf();
        if (typeof valueValue !== 'object' && typeof oldValueValue !== 'object') {
          return valueValue !== oldValueValue;
        } else {
          changeRecords = diff.objects(value, oldValue);
          if (changeRecords.length) {
            return changeRecords;
          } else {
            return false;
          }
        }
      } else {
        return diff.basic(value, oldValue);
      }
    };
    diff.basic = function(value, oldValue) {
      var oldValueValue, valueValue;
      if (value && oldValue && typeof value === 'object' && typeof oldValue === 'object') {
        valueValue = value.valueOf();
        oldValueValue = oldValue.valueOf();
        if (typeof valueValue !== 'object' && typeof oldValueValue !== 'object') {
          return diff.basic(valueValue, oldValueValue);
        }
      }
      if (typeof value === 'number' && typeof oldValue === 'number' && isNaN(value) && isNaN(oldValue)) {
        return false;
      } else {
        return value !== oldValue;
      }
    };
    diff.objects = function(object, oldObject) {
      var changeRecords, oldValue, prop, value;
      changeRecords = [];
      for (prop in oldObject) {
        oldValue = oldObject[prop];
        value = object[prop];
        if (value !== void 0 && !diff.basic(value, oldValue)) {
          continue;
        }
        if (!(prop in object)) {
          changeRecords.push(newChange(object, 'deleted', prop, oldValue));
          continue;
        }
        if (diff.basic(value, oldValue)) {
          changeRecords.push(newChange(object, 'updated', prop, oldValue));
        }
      }
      for (prop in object) {
        value = object[prop];
        if (prop in oldObject) {
          continue;
        }
        changeRecords.push(newChange(object, 'new', prop));
      }
      if (Array.isArray(object) && object.length !== oldObject.length) {
        changeRecords.push(newChange(object, 'updated', 'length', oldObject.length));
      }
      return changeRecords;
    };
    newChange = function(object, type, name, oldValue) {
      return {
        object: object,
        type: type,
        name: name,
        oldValue: oldValue
      };
    };
    EDIT_LEAVE = 0;
    EDIT_UPDATE = 1;
    EDIT_ADD = 2;
    EDIT_DELETE = 3;
    diff.arrays = function(value, oldValue) {
      var currentEnd, currentStart, distances, index, minLength, oldEnd, oldIndex, oldStart, op, ops, prefixCount, splice, splices, suffixCount, _i, _len;
      currentStart = 0;
      currentEnd = value.length;
      oldStart = 0;
      oldEnd = oldValue.length;
      minLength = Math.min(currentEnd, oldEnd);
      prefixCount = sharedPrefix(value, oldValue, minLength);
      suffixCount = sharedSuffix(value, oldValue, minLength - prefixCount);
      currentStart += prefixCount;
      oldStart += prefixCount;
      currentEnd -= suffixCount;
      oldEnd -= suffixCount;
      if (currentEnd - currentStart === 0 && oldEnd - oldStart === 0) {
        return [];
      }
      if (currentStart === currentEnd) {
        return [newSplice(currentStart, oldValue.slice(oldStart, oldEnd), 0)];
      }
      if (oldStart === oldEnd) {
        return [newSplice(currentStart, [], currentEnd - currentStart)];
      }
      distances = calcEditDistances(value, currentStart, currentEnd, oldValue, oldStart, oldEnd);
      ops = spliceOperationsFromEditDistances(distances);
      splice = void 0;
      splices = [];
      index = currentStart;
      oldIndex = oldStart;
      for (_i = 0, _len = ops.length; _i < _len; _i++) {
        op = ops[_i];
        if (op === EDIT_LEAVE) {
          if (splice) {
            splices.push(splice);
            splice = void 0;
          }
          index++;
          oldIndex++;
        } else if (op === EDIT_UPDATE) {
          if (!splice) {
            splice = newSplice(index, [], 0);
          }
          splice.addedCount++;
          index++;
          splice.removed.push(oldValue[oldIndex]);
          oldIndex++;
        } else if (op === EDIT_ADD) {
          if (!splice) {
            splice = newSplice(index, [], 0);
          }
          splice.addedCount++;
          index++;
        } else if (op === EDIT_DELETE) {
          if (!splice) {
            splice = newSplice(index, [], 0);
          }
          splice.removed.push(oldValue[oldIndex]);
          oldIndex++;
        }
      }
      if (splice) {
        splices.push(splice);
      }
      return splices;
    };
    sharedPrefix = function(current, old, searchLength) {
      var i, _i;
      for (i = _i = 0; 0 <= searchLength ? _i < searchLength : _i > searchLength; i = 0 <= searchLength ? ++_i : --_i) {
        if (diff.basic(current[i], old[i])) {
          return i;
        }
      }
      return searchLength;
    };
    sharedSuffix = function(current, old, searchLength) {
      var count, index1, index2;
      index1 = current.length;
      index2 = old.length;
      count = 0;
      while (count < searchLength && !diff.basic(current[--index1], old[--index2])) {
        count++;
      }
      return count;
    };
    newSplice = function(index, removed, addedCount) {
      return {
        index: index,
        removed: removed,
        addedCount: addedCount
      };
    };
    spliceOperationsFromEditDistances = function(distances) {
      var current, edits, i, j, min, north, northWest, west;
      i = distances.length - 1;
      j = distances[0].length - 1;
      current = distances[i][j];
      edits = [];
      while (i > 0 || j > 0) {
        if (i === 0) {
          edits.push(EDIT_ADD);
          j--;
          continue;
        }
        if (j === 0) {
          edits.push(EDIT_DELETE);
          i--;
          continue;
        }
        northWest = distances[i - 1][j - 1];
        west = distances[i - 1][j];
        north = distances[i][j - 1];
        if (west < north) {
          min = west < northWest ? west : northWest;
        } else {
          min = north < northWest ? north : northWest;
        }
        if (min === northWest) {
          if (northWest === current) {
            edits.push(EDIT_LEAVE);
          } else {
            edits.push(EDIT_UPDATE);
            current = northWest;
          }
          i--;
          j--;
        } else if (min === west) {
          edits.push(EDIT_DELETE);
          i--;
          current = west;
        } else {
          edits.push(EDIT_ADD);
          j--;
          current = north;
        }
      }
      edits.reverse();
      return edits;
    };
    return calcEditDistances = function(current, currentStart, currentEnd, old, oldStart, oldEnd) {
      var columnCount, distances, i, j, north, rowCount, west, _i, _j, _k, _l;
      rowCount = oldEnd - oldStart + 1;
      columnCount = currentEnd - currentStart + 1;
      distances = new Array(rowCount);
      for (i = _i = 0; 0 <= rowCount ? _i < rowCount : _i > rowCount; i = 0 <= rowCount ? ++_i : --_i) {
        distances[i] = new Array(columnCount);
        distances[i][0] = i;
      }
      for (j = _j = 0; 0 <= columnCount ? _j < columnCount : _j > columnCount; j = 0 <= columnCount ? ++_j : --_j) {
        distances[0][j] = j;
      }
      for (i = _k = 1; 1 <= rowCount ? _k < rowCount : _k > rowCount; i = 1 <= rowCount ? ++_k : --_k) {
        for (j = _l = 1; 1 <= columnCount ? _l < columnCount : _l > columnCount; j = 1 <= columnCount ? ++_l : --_l) {
          if (!diff.basic(current[currentStart + j - 1], old[oldStart + i - 1])) {
            distances[i][j] = distances[i - 1][j - 1];
          } else {
            north = distances[i - 1][j] + 1;
            west = distances[i][j - 1] + 1;
            distances[i][j] = north < west ? north : west;
          }
        }
      }
      return distances;
    };
  }).call(this);

  chip.diff = diff;

}).call(this);
