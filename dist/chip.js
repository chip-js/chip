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
  var App, Binding, Controller, Filter, Observer, Route, Router, argSeparator, attribs, chip, emptyQuoteExpr, equality, keyCode, keyCodes, makeEventEmitter, name, normalizeExpression, parsePath, parseQuery, pipeExpr, processPart, processProperties, quoteExpr, setterExpr, varExpr, _i, _len,
    __slice = [].slice,
    __hasProp = {}.hasOwnProperty;

  chip = {
    init: function() {
      if (!this.rootApp) {
        this.rootApp = chip.app();
      }
      return this.rootApp.init();
    },
    app: function(appName) {
      var app;
      app = new App(appName);
      if (!appName) {
        this.rootApp = app;
      }
      return app;
    },
    addBinding: function(name, priority, handler) {
      return Binding.addBinding(name, priority, handler);
    },
    addEventBinding: function(eventName) {
      return Binding.addEventBinding(eventName);
    },
    addKeyEventBinding: function(name, keyCode, ctrlKey) {
      return Binding.addKeyEventBinding(name, keyCode, ctrlKey);
    },
    addAttributeBinding: function(name) {
      return Binding.addAttributeBinding(name);
    },
    addAttributeToggleBinding: function(name) {
      return Binding.addAttributeToggleBinding(name);
    },
    filter: function(name, filter) {
      if (typeof filter === 'function') {
        Filter.addFilter(name, filter);
        return this;
      } else {
        return Filter.runFilter(name, filter);
      }
    }
  };

  $(function() {
    return chip.init();
  });

  window.chip = chip;

  makeEventEmitter = function(object) {
    var eventEmitter;
    if (object.trigger) {
      throw new Error('Object has already become an event emitter');
    }
    eventEmitter = $({});
    object.on = eventEmitter.on.bind(eventEmitter);
    object.one = eventEmitter.one.bind(eventEmitter);
    object.off = eventEmitter.off.bind(eventEmitter);
    return object.trigger = eventEmitter.trigger.bind(eventEmitter);
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
      if (path[0] !== '/') {
        path = '/' + path;
      }
      this.routes.push(new Route(path, callback));
      return this;
    };

    Router.prototype.redirect = function(url) {
      url = this.prefix + url;
      if (this.currentUrl === url) {
        return;
      }
      if (!this.hashOnly && this.root && url.indexOf(this.root) !== 0) {
        location.href = url;
        return;
      }
      if (this.usePushState) {
        history.pushState({}, '', url);
        this.currentUrl = url;
        this.dispatch(url);
      } else {
        if (!this.hashOnly) {
          url = url.replace(this.root, '');
          if (url[0] !== '/') {
            url = '/' + url;
          }
        }
        location.hash = url === '/' ? '' : '#' + url;
      }
      return this;
    };

    Router.prototype.listen = function(options) {
      var getUrl, handleChange, url, _ref,
        _this = this;
      if (options == null) {
        options = {};
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
      handleChange = function() {
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
        $(window).on('popstate', handleChange);
      } else {
        if (!(this.hashOnly || location.pathname === this.root)) {
          location.href = this.root + '#' + location.pathname;
          return;
        }
        getUrl = function() {
          return (_this.hashOnly ? '' : location.pathname.replace(/\/$/, '')) + location.hash.replace(/^#?\/?/, '/');
        };
        $(window).on('hashchange', handleChange);
      }
      handleChange();
      return this;
    };

    Router.prototype.dispatch = function(url) {
      var callbacks, next, path, pathParts, req, routes,
        _this = this;
      pathParts = document.createElement('a');
      pathParts.href = url;
      req = {
        query: parseQuery(pathParts.search)
      };
      path = pathParts.pathname;
      if (path[0] !== '/') {
        path = '/' + path;
      }
      if (path.indexOf(this.prefix) !== 0) {
        return;
      }
      path = path.replace(this.prefix, '');
      this.trigger('change', path);
      routes = this.routes.filter(function(route) {
        return route.match(path);
      });
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
          return _this.trigger('error', err);
        }
        if (callbacks.length === 0) {
          return;
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
      var changeRecords, splices, value;
      value = this.getter();
      if (this.skip) {
        delete this.skip;
      } else if (Array.isArray(value) && Array.isArray(this.oldValue)) {
        splices = equality.array(value, this.oldValue);
        if (splices.length) {
          this.callback(value, this.oldValue, splices);
        }
      } else if (value && this.oldValue && typeof value === 'object' && typeof this.oldValue === 'object') {
        changeRecords = equality.object(value, this.oldValue);
        if (changeRecords.length) {
          this.callback(value, this.oldValue, changeRecords);
        }
      } else if (value !== this.oldValue) {
        this.callback(value, this.oldValue);
      } else {
        return;
      }
      return this.oldValue = Observer.immutable(value);
    };

    Observer.prototype.close = function() {
      return Observer.remove(this);
    };

    Observer.observers = [];

    Observer.add = function(getter, skipTriggerImmediately, callback) {
      var observer, value;
      if (typeof skipTriggerImmediately === 'function') {
        callback = skipTriggerImmediately;
        skipTriggerImmediately = false;
      }
      value = getter();
      observer = new Observer(getter, callback, this.immutable(value));
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

    Observer.sync = function(asynchronous) {
      var _this = this;
      if (this.syncing) {
        this.rerun = true;
        return false;
      }
      if (asynchronous) {
        if (!this.timeout) {
          this.timeout = setTimeout(function() {
            _this.timeout = null;
            return _this.sync();
          }, 0);
          return true;
        } else {
          return false;
        }
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
      this.syncing = false;
      this.cycles = 0;
      return true;
    };

    Observer.immutable = function(value) {
      if (Array.isArray(value)) {
        return value.slice();
      } else if (value && typeof value === 'object') {
        return this.copyObject(value);
      } else {
        return value;
      }
    };

    Observer.copyObject = function(object) {
      var copy, key, value;
      copy = {};
      for (key in object) {
        value = object[key];
        copy[key] = value;
      }
      return copy;
    };

    return Observer;

  })();

  chip.Observer = Observer;

  Controller = (function() {
    function Controller() {
      this._observers = [];
    }

    Controller.prototype.watch = function(expr, skipTriggerImmediately, callback) {
      var getter, observer;
      if (typeof expr === 'function') {
        getter = expr;
      } else {
        getter = Controller.createBoundFunction(this, expr);
      }
      observer = Observer.add(getter, skipTriggerImmediately, callback);
      observer.expr = expr;
      this._observers.push(observer);
      return observer;
    };

    Controller.prototype["eval"] = function(expr) {
      return Controller.createFunction(expr).call(this);
    };

    Controller.prototype.evalSetter = function(expr, value) {
      if (this.passthrough()) {
        return this.passthrough().evalSetter(expr, value);
      }
      expr = expr.replace(/(\s*\||$)/, ' = value$1');
      return Controller.createFunction(expr, ['value']).call(this, value);
    };

    Controller.prototype.getBoundEval = function() {
      var expr, extraArgNames;
      expr = arguments[0], extraArgNames = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return Controller.createBoundFunction(this, expr, extraArgNames);
    };

    Controller.prototype.redirect = function(url) {
      this.app.redirect(url);
      return this;
    };

    Controller.prototype.cloneValue = function(property) {
      return Observer.immutable(this[property]);
    };

    Controller.prototype.closeController = function() {
      var observer, _i, _len, _ref;
      if (this._observers) {
        _ref = this._observers;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          observer = _ref[_i];
          observer.close();
        }
        this._observers.length = 0;
      }
    };

    Controller.prototype.syncView = function(later) {
      Observer.sync(later);
      if (typeof later === 'function') {
        setTimeout(later);
      }
      return this;
    };

    Controller.prototype.syncNow = function() {
      var observer, _i, _len, _ref;
      _ref = this._observers;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        observer = _ref[_i];
        observer.sync();
      }
      return this;
    };

    Controller.prototype.runFilter = function() {
      var args, filterName, value;
      value = arguments[0], filterName = arguments[1], args = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
      return Filter.runFilter.apply(Filter, [filterName, value].concat(__slice.call(args)));
    };

    Controller.prototype.passthrough = function(value) {
      if (arguments.length) {
        return this._passthrough = value;
      } else {
        if (this.hasOwnProperty('_passthrough')) {
          return this._passthrough;
        } else {
          return null;
        }
      }
    };

    Controller.keywords = ['this', 'window', '$', 'true', 'false'];

    Controller.filters = {};

    Controller.exprCache = {};

    Controller.createFunction = function(expr, extraArgNames) {
      var e, func, normalizedExpr;
      if (extraArgNames == null) {
        extraArgNames = [];
      }
      func = this.exprCache[expr];
      if (func) {
        return func;
      }
      normalizedExpr = normalizeExpression(expr, extraArgNames);
      try {
        func = this.exprCache[expr] = Function.apply(null, __slice.call(extraArgNames).concat([normalizedExpr]));
      } catch (_error) {
        e = _error;
        throw new Error(e.message + ' in observer binding:\n`' + expr + '`\n' + 'Compiled binding:\n' + functionBody);
      }
      return func;
    };

    Controller.createBoundFunction = function(controller, expr, extraArgNames) {
      var func;
      func = Controller.createFunction(expr, extraArgNames);
      return func.bind(controller);
    };

    return Controller;

  })();

  $.fn.controller = function(passthrough) {
    var controller, element;
    element = this;
    while (element.length) {
      controller = element.data('controller');
      if (controller) {
        if (passthrough && controller.passthrough()) {
          return controller.passthrough();
        } else {
          return controller;
        }
      }
      element = element.parent();
    }
    return null;
  };

  $.event.special.elementRemove = {
    remove: function(event) {
      return event.handler();
    }
  };

  varExpr = /[a-z$_\$][a-z_\$0-9\.-]*\s*:?|'|"/gi;

  quoteExpr = /(['"])(\\\1|[^\1])*?\1/g;

  emptyQuoteExpr = /(['"])\1/g;

  pipeExpr = /\|(\|)?/g;

  argSeparator = /\s*:\s*/g;

  setterExpr = /\s=\s/;

  normalizeExpression = function(expr, extraArgNames) {
    var filters, i, options, orig, refs, setter, strIndex, strings, value, _i, _ref, _ref1, _ref2, _ref3;
    orig = expr;
    options = {
      references: 0,
      ignore: Controller.keywords.concat(extraArgNames)
    };
    strings = [];
    expr = expr.replace(quoteExpr, function(str, quote) {
      strings.push(str);
      return quote + quote;
    });
    expr = expr.replace(pipeExpr, function(match, orIndicator) {
      if (orIndicator) {
        return match;
      }
      return '@@@';
    });
    filters = expr.split(/\s*@@@\s*/);
    expr = filters.shift();
    if (filters.length) {
      if (setterExpr.test(expr)) {
        _ref = expr.split(' = '), setter = _ref[0], value = _ref[1];
        setter = processProperties(setter, options).replace(/^\(|\)$/g, '') + ' = ';
        value = processProperties(value, options);
      } else {
        setter = '';
        value = processProperties(expr, options);
      }
      strIndex = ((_ref1 = expr.match(quoteExpr)) != null ? _ref1.length : void 0) || 0;
      filters.forEach(function(filter) {
        var args, _ref2;
        args = filter.split(argSeparator);
        strings.splice(strIndex++, 0, "'" + args[0] + "'");
        strIndex += ((_ref2 = filter.match(quoteExpr)) != null ? _ref2.length : void 0) || 0;
        args[0] = "''";
        args = args.map(function(arg) {
          return processProperties(arg, options);
        });
        return value = "this.runFilter(" + value + "," + (args.join(',')) + ")";
      });
      expr = setter + value;
    } else {
      if (setterExpr.test(expr)) {
        _ref2 = expr.split(' = '), setter = _ref2[0], value = _ref2[1];
        setter = processProperties(setter, options).replace(/^\(|\)$/g, '') + ' = ';
        value = processProperties(value, options);
        expr = setter + value;
      } else {
        expr = processProperties(expr, options);
      }
    }
    expr = 'return ' + expr;
    expr = expr.replace(emptyQuoteExpr, function() {
      return strings.shift();
    });
    if (options.references) {
      refs = [];
      for (i = _i = 1, _ref3 = options.references; 1 <= _ref3 ? _i <= _ref3 : _i >= _ref3; i = 1 <= _ref3 ? ++_i : --_i) {
        refs.push('_ref' + i);
      }
      expr = 'var ' + refs.join(', ') + ';\n' + expr;
    }
    return expr;
  };

  processProperties = function(expr, options) {
    var currentIndex, index, matchArgs, newExpr, processProperty, propExpr;
    if (options == null) {
      options = {};
    }
    if (!options.references) {
      options.references = 0;
    }
    if (!options.ignore) {
      options.ignore = [];
    }
    propExpr = /((\{|,|\.)?\s*)([a-z$_\$][a-z_\$0-9\.-]*)(\s*(:|\()?)/gi;
    currentIndex = 0;
    newExpr = '';
    processProperty = function(match, prefix, objIndicator, propChain, postfix, colonOrParen) {
      var continuation, index, newChain, parts;
      index = propExpr.lastIndex - match.length;
      if (objIndicator && colonOrParen === ':' || options.ignore.indexOf(propChain.split(/\.|\(/).shift()) !== -1) {
        return match;
      }
      continuation = prefix === '.';
      if (continuation) {
        prefix = '';
      }
      parts = propChain.split('.');
      newChain = '';
      if (parts.length === 1 && !continuation) {
        newChain = 'this.' + parts[0];
      } else {
        if (!continuation) {
          newChain += '(';
        }
        parts.forEach(function(part, partIndex) {
          var endIndex, innards, parenCount, startIndex;
          if (partIndex === parts.length - 1) {
            if (colonOrParen === '(') {
              parenCount = 1;
              startIndex = propExpr.lastIndex;
              endIndex = startIndex - 1;
              while (endIndex++ < expr.length) {
                switch (expr[endIndex]) {
                  case '(':
                    parenCount++;
                    break;
                  case ')':
                    parenCount--;
                }
                if (parenCount === 0) {
                  break;
                }
              }
              propExpr.lastIndex = endIndex + 1;
              innards = processProperties(expr.slice(startIndex, endIndex), options);
              part += '(' + innards + ')';
              postfix = '';
              if (expr[endIndex + 1] === '.') {
                newChain += processPart(options, part, partIndex, continuation);
                console.log('will continue:', newChain);
                return;
              }
            }
            newChain += "_ref" + options.references + "." + part + ")";
          } else {
            return newChain += processPart(options, part, partIndex, continuation);
          }
        });
      }
      if (continuation) {
        console.log('continuation:', newChain);
      }
      return prefix + newChain + postfix;
    };
    while ((matchArgs = propExpr.exec(expr))) {
      index = propExpr.lastIndex - matchArgs[0].length;
      newExpr += expr.slice(currentIndex, index) + processProperty.apply(null, matchArgs);
      currentIndex = propExpr.lastIndex;
    }
    newExpr += expr.slice(currentIndex);
    return newExpr;
  };

  processPart = function(options, part, index, continuation) {
    var ref;
    if (index === 0 && !continuation) {
      part = "this." + part;
    } else {
      part = "_ref" + options.references + "." + part;
    }
    ref = "_ref" + (++options.references);
    return "(" + ref + " = " + part + ") == null ? undefined : ";
  };

  chip.Controller = Controller;

  App = (function() {
    function App(appName) {
      this.name = appName;
      this.bindingPrefix = 'data-';
      this.controllers = {};
      this.templates = {};
      this.router = new Router();
      this.rootElement = $('html');
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
      while ((element = this.rootElement.find('[data-controller]:first')).length) {
        name = element.attr('data-controller');
        element.removeAttr('data-controller');
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

    App.prototype.controller = function(name, initFunction) {
      if (arguments.length > 1) {
        this.controllers[name] = initFunction;
        return this;
      } else {
        return this.controllers[name] || window[name + 'Controller'];
      }
    };

    App.prototype.createController = function(options) {
      var NewController, controller, key, value, _base, _ref,
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
        if (options.passthrough) {
          if (options.parent.passthrough()) {
            controller.passthrough(options.parent.passthrough());
          } else {
            controller.passthrough(options.parent);
          }
        }
      } else {
        controller = new Controller();
        makeEventEmitter(controller);
        controller.app = this;
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
        options.element.on('elementRemove', function() {
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
            var container, controller, i, parentController, selector, _i;
            parentController = _this.rootController;
            if (before) {
              parentController = before(req, next);
            }
            _this.rootController.params = req.params;
            _this.rootController.query = req.query;
            selector = [];
            for (i = _i = 0; 0 <= depth ? _i <= depth : _i >= depth; i = 0 <= depth ? ++_i : --_i) {
              selector.push('[data-route]');
            }
            container = _this.rootElement.find(selector.join(' ') + ':first');
            if (!container.length) {
              return;
            }
            container.attr('data-route', name);
            container.html(_this.template(name));
            controller = _this.createController({
              element: container,
              parent: parentController,
              name: name
            });
            return controller.syncView();
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

    App.prototype.redirect = function(url) {
      return this.router.redirect(url);
    };

    App.prototype.mount = function(path, app) {};

    App.prototype.listen = function(options) {
      var _this = this;
      return $(function() {
        var app;
        _this.router.on('change', function(event, path) {
          return _this.rootController.trigger('urlChange', path);
        });
        app = _this;
        _this.rootElement.on('click', 'a[href]', function(event) {
          if (event.isDefaultPrevented()) {
            return;
          }
          if (this.host !== location.host || this.href === location.href + '#') {
            return;
          }
          event.preventDefault();
          return app.redirect($(this).attr("href"));
        });
        return _this.router.listen(options);
      });
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

    Binding.addBinding = function(name, priority, handler) {
      var entry;
      if (typeof priority === 'function') {
        handler = priority;
        priority = 0;
      }
      entry = {
        name: name,
        priority: priority,
        handler: handler
      };
      this.bindings[name] = entry;
      this.bindings.push(entry);
      return this.bindings.sort(function(a, b) {
        return b.priority - a.priority;
      });
    };

    Binding.removeBinding = function(name) {
      var entry;
      entry = this.bindings[name];
      if (!entry) {
        return;
      }
      delete this.bindings[name];
      return this.bindings.splice(this.bindings.indexOf(entry), 1);
    };

    Binding.addEventBinding = function(eventName) {
      return this.addBinding(eventName, function(element, expr, controller) {
        return element.on(eventName, function(event) {
          event.preventDefault();
          return controller["eval"](expr);
        });
      });
    };

    Binding.addKeyEventBinding = function(name, keyCode, ctrlKey) {
      return this.addBinding(name, function(element, expr, controller) {
        return element.on('keydown', function(event) {
          if ((ctrlKey != null) && (event.ctrlKey !== ctrlKey && event.metaKey !== ctrlKey)) {
            return;
          }
          if (event.keyCode !== keyCode) {
            return;
          }
          event.preventDefault();
          return controller["eval"](expr);
        });
      });
    };

    Binding.addAttributeBinding = function(name) {
      return this.addBinding(name, function(element, expr, controller) {
        return controller.watch(expr, function(value) {
          if (value != null) {
            element.attr(name, value);
            return element.trigger(name + 'Changed');
          } else {
            return element.removeAttr(name);
          }
        });
      });
    };

    Binding.addAttributeToggleBinding = function(name) {
      return this.addBinding(name, function(element, expr, controller) {
        return controller.watch(expr, function(value) {
          return element.prop(name, value || false);
        });
      });
    };

    Binding.process = function(element, controller) {
      var attr, attribs, newController, node, parentNode, prefix,
        _this = this;
      if (!(controller instanceof Controller)) {
        throw new Error('A Controller is required to bind a jQuery element.');
      }
      node = element.get(0);
      parentNode = node.parentNode;
      prefix = controller.app.bindingPrefix;
      attribs = $(node.attributes).toArray().filter(function(attr) {
        return attr.name.indexOf(prefix) === 0 && _this.bindings[attr.name.replace(prefix, '')] && attr.value !== void 0;
      });
      attribs = attribs.map(function(attr) {
        var entry;
        entry = _this.bindings[attr.name.replace(prefix, '')];
        return {
          name: attr.name,
          value: attr.value,
          priority: entry.priority,
          handler: entry.handler
        };
      });
      attribs = attribs.sort(function(a, b) {
        return b.priority - a.priority;
      });
      while (attribs.length) {
        attr = attribs.shift();
        if (!node.hasAttribute(attr.name)) {
          continue;
        }
        node.removeAttribute(attr.name);
        newController = attr.handler(element, attr.value, controller);
        if (node.parentNode !== parentNode) {
          return;
        }
        if (newController instanceof Controller) {
          controller = newController;
        }
      }
      return element.children().each(function(index, child) {
        return _this.process($(child), controller);
      });
    };

    return Binding;

  })();

  jQuery.fn.bindTo = function(controller) {
    if (this.length !== 0) {
      return Binding.process(this, controller);
    }
  };

  chip.Binding = Binding;

  Filter = (function() {
    function Filter(name, filter) {
      this.name = name;
      this.filter = filter;
    }

    Filter.filters = {};

    Filter.addFilter = function(name, filter) {
      this.filters[name] = new Filter(name, filter);
      return this;
    };

    Filter.runFilter = function() {
      var args, filter, name, value, _ref;
      name = arguments[0], value = arguments[1], args = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
      filter = ((_ref = this.filters[name]) != null ? _ref.filter : void 0) || window[name];
      if (filter) {
        return filter.apply(null, [value].concat(__slice.call(args)));
      } else {
        console.error("Filter `" + filterName + "` has not been defined.");
        return value;
      }
    };

    return Filter;

  })();

  chip.addBinding('debug', function(element, expr, controller) {
    return controller.watch(expr, function(value) {
      return console.info('Debug:', expr, '=', value);
    });
  });

  chip.addBinding('text', function(element, expr, controller) {
    return controller.watch(expr, function(value) {
      return element.text(value != null ? value : '');
    });
  });

  chip.addBinding('html', function(element, expr, controller) {
    return controller.watch(expr, function(value) {
      return element.html(value != null ? value : '');
    });
  });

  chip.addBinding('class', function(element, expr, controller) {
    return controller.watch(expr, function(value) {
      var className, toggle, _results;
      if (Array.isArray(value)) {
        value = value.join(' ');
      }
      if (typeof value === 'string') {
        return element.attr('class', value);
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

  chip.addBinding('active', function(element, expr, controller) {
    var link, refresh;
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
      element.on('elementRemove', function() {
        return controller.off('urlChange', refresh);
      });
      return refresh();
    }
  });

  chip.addBinding('active-section', function(element, expr, controller) {
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
    element.on('elementRemove', function() {
      return controller.off('urlChange', refresh);
    });
    return refresh();
  });

  chip.addBinding('value', function(element, expr, controller) {
    var getValue, observer, setValue;
    getValue = element.attr('type') === 'checkbox' ? function() {
      return element.prop('checked');
    } : function() {
      return element.val();
    };
    setValue = element.attr('type') === 'checkbox' ? function(value) {
      return element.prop('checked', value);
    } : function(value) {
      return element.val(value);
    };
    observer = controller.watch(expr, function(value) {
      if (getValue() !== value) {
        return setValue(value);
      }
    });
    if (element.is('select')) {
      setTimeout(function() {
        setValue(controller["eval"](expr));
        return controller.evalSetter(expr, getValue());
      });
    } else {
      controller.evalSetter(expr, getValue());
    }
    return element.on('keydown keyup change', function() {
      if (getValue() !== observer.oldValue) {
        controller.evalSetter(expr, getValue());
        observer.skipNextSync();
        return controller.syncView();
      }
    });
  });

  ['click', 'dblclick', 'submit', 'change', 'focus', 'blur'].forEach(function(name) {
    return chip.addEventBinding(name);
  });

  keyCodes = {
    enter: 13,
    esc: 27
  };

  for (name in keyCodes) {
    if (!__hasProp.call(keyCodes, name)) continue;
    keyCode = keyCodes[name];
    chip.addKeyEventBinding(name, keyCode);
  }

  chip.addKeyEventBinding('ctrl-enter', keyCodes.enter, true);

  attribs = ['href', 'src', 'id'];

  for (_i = 0, _len = attribs.length; _i < _len; _i++) {
    name = attribs[_i];
    chip.addAttributeBinding(name);
  }

  ['checked', 'disabled'].forEach(function(name) {
    return chip.addAttributeToggleBinding(name);
  });

  chip.addBinding('if', 50, function(element, expr, controller) {
    var controllerName, placeholder, template;
    template = element;
    placeholder = $('<!--data-if="' + expr + '"-->').replaceAll(template);
    controllerName = element.attr('data-controller');
    element.removeAttr('data-controller');
    return controller.watch(expr, function(value) {
      if (value) {
        if (placeholder.parent().length) {
          element = template.clone();
          controller.child({
            element: element,
            name: controllerName,
            passthrough: true
          });
          return placeholder.replaceWith(element);
        }
      } else {
        if (!placeholder.parent().length) {
          return element.replaceWith(placeholder);
        }
      }
    });
  });

  chip.addBinding('repeat', 100, function(element, expr, controller) {
    var controllerName, createElement, elements, itemName, orig, placeholder, propName, properties, template, value, _ref, _ref1;
    orig = expr;
    _ref = expr.split(/\s+in\s+/), itemName = _ref[0], expr = _ref[1];
    if (!(itemName && expr)) {
      throw 'Invalid data-repeat "';
      +orig;
      +'". Requires the format "todo in todos"';
      +' or "key, prop in todos".';
    }
    controllerName = element.attr('data-controller');
    element.removeAttr('data-controller');
    _ref1 = itemName.split(/\s*,\s*/), itemName = _ref1[0], propName = _ref1[1];
    template = element;
    placeholder = $('<!--data-repeat="' + expr + '"-->').replaceAll(template);
    elements = $();
    properties = {};
    value = null;
    createElement = function(item) {
      var newElement;
      newElement = template.clone();
      if (!Array.isArray(value)) {
        if (propName) {
          properties[propName] = item;
        }
        properties[itemName] = value[item];
      } else {
        properties[itemName] = item;
      }
      controller.child({
        element: newElement,
        name: controllerName,
        properties: properties
      });
      return newElement.get(0);
    };
    return controller.watch(expr, function(newValue, oldValue, splices) {
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
          value.forEach(function(item) {
            return elements.push(createElement(item));
          });
          return placeholder.after(elements).remove();
        }
      } else if (Array.isArray(value) || (value && typeof value === 'object')) {
        if (!Array.isArray(value)) {
          splices = equality.array(Object.keys(value, oldValue));
        }
        return splices.forEach(function(splice) {
          var addIndex, args, item, newElements, removedElements;
          args = [splice.index, splice.removed.length];
          newElements = [];
          addIndex = splice.index;
          while (addIndex < splice.index + splice.addedCount) {
            item = value[addIndex];
            newElements.push(createElement(item));
            addIndex++;
          }
          removedElements = $(elements.splice.apply(elements, args.concat(newElements)));
          if (removedElements.length) {
            if (elements.length - newElements.length === 0) {
              removedElements.eq(0).replaceWith(placeholder);
            }
            removedElements.remove();
          }
          if (newElements.length) {
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
  });

  chip.addBinding('partial', 50, function(element, expr, controller) {
    var childController, itemExpr, itemName, nameExpr, parts, properties;
    parts = expr.split(/\s+as\s+\s+with\s+/);
    nameExpr = parts.pop();
    itemExpr = parts[0], itemName = parts[1];
    childController = null;
    properties = {};
    if (itemExpr && itemName) {
      controller.watch(itemExpr, true, function(value) {
        return childController[itemName] = value;
      });
    }
    return controller.watch(nameExpr, function(name) {
      if (name == null) {
        return;
      }
      element.html(controller.template(name));
      if (itemExpr && itemName) {
        properties[itemName] = controller["eval"](itemExpr);
      }
      return childController = controller.child({
        element: element,
        name: name,
        properties: properties
      });
    });
  });

  chip.addBinding('controller', 30, function(element, controllerName, controller) {
    return controller.child({
      element: element,
      name: controllerName
    });
  });

  chip.filter('filter', function(value, filterFunc) {
    if (!Array.isArray(value)) {
      return [];
    }
    if (!filterFunc) {
      return value;
    }
    return value.filter(filterFunc);
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

  chip.filter('sort', function(value, sortFunc) {
    if (Array.isArray(value)) {
      return value.slice().sort(sortFunc);
    } else {
      return value;
    }
  });

  equality = {};

  (function() {
    var EDIT_ADD, EDIT_DELETE, EDIT_LEAVE, EDIT_UPDATE, calcEditDistances, newChange, newSplice, sharedPrefix, sharedSuffix, spliceOperationsFromEditDistances;
    equality.object = function(object, oldObject) {
      var changeRecords, newValue, oldValue, prop;
      changeRecords = [];
      for (prop in oldObject) {
        oldValue = oldObject[prop];
        newValue = object[prop];
        if (newValue !== void 0 && newValue === oldValue) {
          continue;
        }
        if (!(prop in object)) {
          changeRecords.push(newChange(object, 'deleted', prop, oldValue));
          continue;
        }
        if (newValue !== oldValue) {
          changeRecords.push(newChange(object, 'updated', prop, oldValue));
        }
      }
      for (prop in object) {
        newValue = object[prop];
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
    equality.array = function(value, oldValue) {
      var currentEnd, currentStart, distances, index, minLength, oldEnd, oldIndex, oldStart, op, ops, prefixCount, splice, splices, suffixCount, _j, _len1;
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
      for (_j = 0, _len1 = ops.length; _j < _len1; _j++) {
        op = ops[_j];
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
      var i, _j;
      for (i = _j = 0; 0 <= searchLength ? _j < searchLength : _j > searchLength; i = 0 <= searchLength ? ++_j : --_j) {
        if (current[i] !== old[i]) {
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
      while (count < searchLength && current[--index1] === old[--index2]) {
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
      var columnCount, distances, i, j, north, rowCount, west, _j, _k, _l, _m;
      rowCount = oldEnd - oldStart + 1;
      columnCount = currentEnd - currentStart + 1;
      distances = new Array(rowCount);
      for (i = _j = 0; 0 <= rowCount ? _j < rowCount : _j > rowCount; i = 0 <= rowCount ? ++_j : --_j) {
        distances[i] = new Array(columnCount);
        distances[i][0] = i;
      }
      for (j = _k = 0; 0 <= columnCount ? _k < columnCount : _k > columnCount; j = 0 <= columnCount ? ++_k : --_k) {
        distances[0][j] = j;
      }
      for (i = _l = 1; 1 <= rowCount ? _l < rowCount : _l > rowCount; i = 1 <= rowCount ? ++_l : --_l) {
        for (j = _m = 1; 1 <= columnCount ? _m < columnCount : _m > columnCount; j = 1 <= columnCount ? ++_m : --_m) {
          if (current[currentStart + j - 1] === old[oldStart + i - 1]) {
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

  chip.equality = equality;

}).call(this);
