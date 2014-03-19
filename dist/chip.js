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
  var App, Binding, Controller, Filter, Observer, Route, Router, argSeparator, attribs, chip, compare, div, emptyQuoteExpr, keyCode, keyCodes, makeEventEmitter, name, normalizeExpression, parsePath, parseQuery, pipeExpr, processPart, processProperties, quoteExpr, setterExpr, urlExp, varExpr, _i, _len,
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

    Router.prototype.redirect = function(url) {
      var errHandler, notFound, pathParts;
      if (url.charAt(0) === '.') {
        pathParts = document.createElement('a');
        pathParts.href = url;
        url = pathParts.pathname;
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
        history.pushState({}, '', url);
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
          $(window).off('popstate hashchange', this._handleChange);
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
          return (_this.hashOnly ? '' : location.pathname.replace(/\/$/, '')) + location.hash.replace(/^#\/?/, '/');
        };
        $(window).on('hashchange', this._handleChange);
      }
      this._handleChange();
      return this;
    };

    Router.prototype.dispatch = function(url) {
      var callbacks, next, path, pathParts, req, routes,
        _this = this;
      pathParts = document.createElement('a');
      pathParts.href = url;
      path = pathParts.pathname;
      if (path.charAt(0) !== '/') {
        path = '/' + path;
      }
      if (path.indexOf(this.prefix) !== 0) {
        return;
      }
      path = path.replace(this.prefix, '');
      req = {
        url: url,
        path: path,
        query: parseQuery(pathParts.search)
      };
      this.trigger('change', [path]);
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
        changed = compare.values(value, this.oldValue);
        if (!changed) {
          return;
        }
        if (Array.isArray(changed)) {
          this.callback(value, this.oldValue, changed);
        } else {
          this.callback(value, this.oldValue);
        }
      }
      return this.oldValue = compare.clone(value);
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
      observer = new Observer(getter, callback, compare.clone(value));
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

    return Observer;

  })();

  chip.Observer = Observer;

  Controller = (function() {
    function Controller() {
      this._observers = [];
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
        getter = Controller.createBoundFunction(this, expr);
      }
      observer = Observer.add(getter, skipTriggerImmediately, callback);
      observer.expr = expr;
      this._observers.push(observer);
      return observer;
    };

    Controller.prototype.unwatch = function(expr, callback) {
      return this._observers.some(function(observer) {
        if (observer.expr === expr && observer.callback === callback) {
          this._observers.remove(observer);
          return true;
        } else {
          return false;
        }
      });
    };

    Controller.prototype["eval"] = function(expr) {
      return Controller.createFunction(expr).call(this);
    };

    Controller.prototype.evalSetter = function(expr, value) {
      if (this.passthrough() !== this) {
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
      return compare.clone(this[property]);
    };

    Controller.prototype.closeController = function() {
      var observer, _i, _len, _ref;
      if (this.hasOwnProperty('beforeClose')) {
        this.beforeClose();
      }
      if (this._observers) {
        _ref = this._observers;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          observer = _ref[_i];
          observer.close();
        }
        this._observers.length = 0;
      }
    };

    Controller.prototype.sync = function(later) {
      Observer.sync(later);
      if (typeof later === 'function') {
        setTimeout(later);
      }
      return this;
    };

    Controller.prototype.runFilter = function() {
      var args, filterName, value;
      value = arguments[0], filterName = arguments[1], args = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
      return Filter.runFilter.apply(Filter, [this, filterName, value].concat(__slice.call(args)));
    };

    Controller.prototype.runValueFilter = function() {
      var args, currentValue, filterName, value;
      value = arguments[0], currentValue = arguments[1], filterName = arguments[2], args = 4 <= arguments.length ? __slice.call(arguments, 3) : [];
      return Filter.runValueFilter.apply(Filter, [this, filterName, value, currentValue].concat(__slice.call(args)));
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
        throw new Error(e.message + ' in observer binding:\n`' + expr + '`\n' + 'Compiled binding:\n' + normalizedExpr);
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

  varExpr = /[a-z$_\$][a-z_\$0-9\.-]*\s*:?|'|"/gi;

  quoteExpr = /(['"\/])(\\\1|[^\1])*?\1/g;

  emptyQuoteExpr = /(['"\/])\1/g;

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
        var args, getter, _ref2;
        args = filter.split(argSeparator);
        strings.splice(strIndex++, 0, "'" + args[0] + "'");
        strIndex += ((_ref2 = filter.match(quoteExpr)) != null ? _ref2.length : void 0) || 0;
        args[0] = "''";
        args = args.map(function(arg) {
          return processProperties(arg, options);
        });
        if (setter) {
          getter = setter.split(' : ').pop().split(' = ').shift();
          return value = "this.runValueFilter(" + value + ", " + getter + ", " + (args.join(', ')) + ")";
        } else {
          return value = "this.runFilter(" + value + ", " + (args.join(', ')) + ")";
        }
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
    options.currentRef = options.references;
    if (!options.ignore) {
      options.ignore = [];
    }
    propExpr = /((\{|,|\.)?\s*)([a-z$_\$](?:[a-z_\$0-9\.-]|\[['"\d]+\])*)(\s*(:|\(|\[)?)/gi;
    currentIndex = 0;
    newExpr = '';
    processProperty = function(match, prefix, objIndicator, propChain, postfix, colonOrParen) {
      var breaks, continuation, index, newChain, part, parts;
      index = propExpr.lastIndex - match.length;
      if (objIndicator && colonOrParen === ':') {
        return match;
      }
      continuation = prefix === '.';
      if (continuation) {
        propChain = '.' + propChain;
        prefix = '';
      }
      breaks = /\.|\[/g;
      index = 0;
      parts = [];
      while ((match = breaks.exec(propChain))) {
        if (breaks.lastIndex === 1) {
          continue;
        }
        parts.push(propChain.slice(index, breaks.lastIndex - 1));
        index = breaks.lastIndex - 1;
      }
      parts.push(propChain.slice(index));
      newChain = '';
      if (parts.length === 1 && !continuation && !colonOrParen) {
        part = parts[0];
        newChain = options.ignore.indexOf(part) === -1 ? 'this.' + part : part;
      } else {
        if (!continuation) {
          newChain += '(';
        }
        parts.forEach(function(part, partIndex) {
          var close, currentRef, endIndex, innards, open, parenCount, startIndex;
          if (partIndex !== parts.length - 1) {
            return newChain += processPart(options, part, partIndex, continuation);
          } else {
            if (colonOrParen !== '(' && colonOrParen !== '[') {
              return newChain += "_ref" + options.currentRef + part + ")";
            } else {
              open = colonOrParen;
              close = colonOrParen === '(' ? ')' : ']';
              parenCount = 1;
              startIndex = propExpr.lastIndex;
              endIndex = startIndex - 1;
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
              propExpr.lastIndex = endIndex + 1;
              postfix = '';
              part += open + '~~innards~~' + close;
              if (expr.charAt(endIndex + 1) === '.') {
                newChain += processPart(options, part, partIndex, continuation);
              } else if (partIndex === 0) {
                newChain += processPart(options, part, partIndex, continuation);
                newChain += "_ref" + options.currentRef + ")";
              } else {
                newChain += "_ref" + options.currentRef + part + ")";
              }
              currentRef = options.currentRef;
              innards = processProperties(expr.slice(startIndex, endIndex), options);
              newChain = newChain.replace(/~~innards~~/, innards);
              return options.currentRef = currentRef;
            }
          }
        });
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
      if (options.ignore.indexOf(part.split(/\.|\(/).shift()) === -1) {
        part = "this." + part;
      } else {
        part = "" + part;
      }
    } else {
      part = "_ref" + options.currentRef + part;
    }
    options.currentRef = ++options.references;
    ref = "_ref" + options.currentRef;
    return "(" + ref + " = " + part + ") == null ? undefined : ";
  };

  chip.Controller = Controller;

  App = (function() {
    function App(appName) {
      var _this = this;
      this.name = appName;
      this.bindingPrefix = 'chip-';
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
      while ((element = this.rootElement.find("[" + this.bindingPrefix + "controller]:first")).length) {
        name = element.attr("" + this.bindingPrefix + "controller");
        element.removeAttr("" + this.bindingPrefix + "controller");
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
        if (options.passthrough) {
          controller.passthrough(options.parent.passthrough());
        }
      } else {
        controller = new Controller();
        makeEventEmitter(controller, this._emitter);
        controller.app = this;
        controller.translations = this.translations;
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
              selector.push("[" + _this.bindingPrefix + "route]");
            }
            container = _this.rootElement.find(selector.join(' ') + ':first');
            isExistingRoute = _this.rootController.route;
            if (req.isSamePath == null) {
              req.isSamePath = req.path === _this.rootController.path;
            }
            if (container.length) {
              showNextPage = function() {
                var parentController, placholder;
                container.attr("" + _this.bindingPrefix + "route", name);
                _this.rootController.route = name;
                _this.rootController.path = req.path;
                _this.trigger('routeChange', [name]);
                if (req.isSamePath) {
                  container.animateIn();
                } else {
                  placholder = $('<!--container-->').insertBefore(container);
                  container.detach();
                  setTimeout(function() {
                    placholder.after(container).remove();
                    return container.animateIn();
                  });
                  container.html(_this.template(name));
                  parentController = container.parent().controller() || _this.rootController;
                  _this.createController({
                    element: container,
                    parent: parentController,
                    name: name
                  });
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

    App.prototype.redirect = function(url) {
      return this.router.redirect(url);
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
            _this.rootElement.off('click', 'a[href]', _this._clickHandler);
          }
          return _this.router.listen(options);
        }
        app = _this;
        _this._routeHandler = function(event, path) {
          return _this.trigger('urlChange', [path]);
        };
        _this._clickHandler = function(event) {
          if (event.isDefaultPrevented()) {
            return;
          }
          if (this.host !== location.host || this.href === location.href + '#') {
            return;
          }
          if (event.metaKey || event.ctrlKey || $(event.target).attr('target')) {
            return;
          }
          event.preventDefault();
          if (!$(this).attr('disabled')) {
            return app.redirect($(this).attr('href').replace(/^#/, ''));
          }
        };
        _this.router.on('change', _this._routeHandler);
        _this.rootElement.on('click', 'a[href]', _this._clickHandler);
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
          if (!element.attr('disabled')) {
            return controller["eval"](expr);
          }
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
          if (!element.attr('disabled')) {
            return controller["eval"](expr);
          }
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
          return element.attr(name, value && true || false);
        });
      });
    };

    Binding.process = function(element, controller) {
      var attr, attribs, newController, parentNode, prefix,
        _this = this;
      if (!(controller instanceof Controller)) {
        throw new Error('A Controller is required to bind a jQuery element.');
      }
      parentNode = element.parent().get(0);
      prefix = controller.app.bindingPrefix;
      attribs = $(element.get(0).attributes).toArray().filter(function(attr) {
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
        if (element.attr(attr.name) == null) {
          continue;
        }
        element.removeAttr(attr.name);
        newController = attr.handler(element, attr.value, controller);
        if (element.parent().get(0) !== parentNode) {
          return;
        }
        if (newController instanceof Controller && newController !== controller) {
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

    Filter.valueFilters = {};

    Filter.addFilter = function(name, filter, valueFilter) {
      if (filter != null) {
        this.filters[name] = new Filter(name, filter);
      }
      if (valueFilter != null) {
        this.valueFilters[name] = new Filter(name, valueFilter);
      }
      return this;
    };

    Filter.getFilter = function(name) {
      return this.filters[name];
    };

    Filter.getValueFilter = function(name) {
      return this.valueFilters[name];
    };

    Filter.runFilter = function() {
      var args, controller, filter, name, value, _ref;
      controller = arguments[0], name = arguments[1], value = arguments[2], args = 4 <= arguments.length ? __slice.call(arguments, 3) : [];
      filter = (_ref = this.filters[name]) != null ? _ref.filter : void 0;
      if (filter) {
        return filter.apply(null, [controller, value].concat(__slice.call(args)));
      } else {
        return value;
      }
    };

    Filter.runValueFilter = function() {
      var args, controller, currentValue, filter, name, value, _ref;
      controller = arguments[0], name = arguments[1], value = arguments[2], currentValue = arguments[3], args = 5 <= arguments.length ? __slice.call(arguments, 4) : [];
      filter = (_ref = this.valueFilters[name]) != null ? _ref.filter : void 0;
      if (filter) {
        return filter.apply(null, [controller, value, currentValue].concat(__slice.call(args)));
      } else {
        return value;
      }
    };

    return Filter;

  })();

  chip.binding('debug', 200, function(element, expr, controller) {
    return controller.watch(expr, function(value) {
      return typeof console !== "undefined" && console !== null ? console.info('Debug:', expr, '=', value) : void 0;
    });
  });

  chip.binding('text', function(element, expr, controller) {
    return controller.watch(expr, function(value) {
      return element.text(value != null ? value : '');
    });
  });

  chip.binding('html', function(element, expr, controller) {
    return controller.watch(expr, function(value) {
      return element.html(value != null ? value : '');
    });
  });

  chip.binding('trim', function(element, expr, controller) {
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

  chip.binding('translate', function(element, expr, controller) {
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

  chip.binding('class', function(element, expr, controller) {
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

  chip.binding('active', function(element, expr, controller) {
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
      element.on('remove', function() {
        return controller.off('urlChange', refresh);
      });
      return refresh();
    }
  });

  chip.binding('active-section', function(element, expr, controller) {
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

  chip.binding('value', function(element, expr, controller) {
    var events, getValue, observer, setValue;
    getValue = element.attr('type') === 'checkbox' ? function() {
      return element.prop('checked');
    } : element.is(':not(input,select,textarea,option)') ? function() {
      return element.find('input:radio:checked').val();
    } : function() {
      return element.val();
    };
    setValue = element.attr('type') === 'checkbox' ? function(value) {
      return element.prop('checked', value);
    } : element.is(':not(input,select,textarea,option)') ? function(value) {
      element.find('input:radio:checked').prop('checked', false);
      return element.find('input:radio[value="' + value + '"]').prop('checked', true);
    } : function(value) {
      return element.val(value);
    };
    observer = controller.watch(expr, function(value) {
      if (getValue() != value) {
        return setValue(value);
      }
    });
    if (element.is('option')) {
      return;
    }
    if (element.is('select')) {
      setTimeout(function() {
        setValue(controller["eval"](expr));
        return controller.evalSetter(expr, getValue());
      });
    } else {
      controller.evalSetter(expr, getValue());
    }
    events = element.attr('chip-value-events') || 'change';
    element.removeAttr('chip-value-events');
    if (element.is(':text')) {
      element.on('keydown', function(event) {
        if (event.keyCode === 13) {
          return element.trigger('change');
        }
      });
    }
    return element.on(events, function() {
      if (getValue() !== observer.oldValue) {
        controller.evalSetter(expr, getValue());
        observer.skipNextSync();
        return controller.sync();
      }
    });
  });

  ['click', 'dblclick', 'submit', 'change', 'focus', 'blur', 'keydown', 'keyup', 'paste'].forEach(function(name) {
    return chip.eventBinding(name);
  });

  keyCodes = {
    enter: 13,
    esc: 27
  };

  for (name in keyCodes) {
    if (!__hasProp.call(keyCodes, name)) continue;
    keyCode = keyCodes[name];
    chip.keyEventBinding(name, keyCode);
  }

  chip.keyEventBinding('ctrl-enter', keyCodes.enter, true);

  attribs = ['href', 'src', 'id'];

  for (_i = 0, _len = attribs.length; _i < _len; _i++) {
    name = attribs[_i];
    chip.attributeBinding(name);
  }

  ['checked', 'disabled'].forEach(function(name) {
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
        if (_this.cssDuration('transition') || _this.cssDuration('animation')) {
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

  chip.binding('if', 50, function(element, expr, controller) {
    var controllerName, placeholder, prefix, template;
    prefix = controller.app.bindingPrefix;
    template = element;
    placeholder = $("<!--" + prefix + "if=\"" + expr + "\"-->").replaceAll(template);
    controllerName = element.attr(prefix + 'controller');
    element.removeAttr(prefix + 'controller');
    return controller.watch(expr, function(value) {
      if (value) {
        if (placeholder.parent().length) {
          element = template.clone().animateIn();
          controller.child({
            element: element,
            name: controllerName,
            passthrough: true
          });
          return placeholder.replaceWith(element);
        }
      } else {
        if (!placeholder.parent().length) {
          return element.animateOut(function() {
            return element.replaceWith(placeholder);
          });
        }
      }
    });
  });

  chip.binding('unless', 50, function(element, expr, controller) {
    var controllerName, placeholder, prefix, template;
    prefix = controller.app.bindingPrefix;
    template = element;
    placeholder = $("<!--" + prefix + "unless=\"" + expr + "\"-->").replaceAll(template);
    controllerName = element.attr(prefix + 'controller');
    element.removeAttr(prefix + 'controller');
    return controller.watch(expr, function(value) {
      if (!value) {
        if (placeholder.parent().length) {
          element = template.clone().animateIn();
          controller.child({
            element: element,
            name: controllerName,
            passthrough: true
          });
          return placeholder.replaceWith(element);
        }
      } else {
        if (!placeholder.parent().length) {
          element.before(placeholder);
          return element.animateOut();
        }
      }
    });
  });

  chip.binding('each', 100, function(element, expr, controller) {
    var controllerName, createElement, elements, itemName, orig, placeholder, prefix, propName, properties, template, value, _ref, _ref1;
    prefix = controller.app.bindingPrefix;
    orig = expr;
    _ref = expr.split(/\s+in\s+/), itemName = _ref[0], expr = _ref[1];
    if (!(itemName && expr)) {
      throw ("Invalid " + prefix + "each=\"") + orig + '". Requires the format "item in list"' + ' or "key, propery in object".';
    }
    controllerName = element.attr(prefix + 'controller');
    element.removeAttr(prefix + 'controller');
    _ref1 = itemName.split(/\s*,\s*/), itemName = _ref1[0], propName = _ref1[1];
    template = element;
    placeholder = $("<!--" + prefix + "each=\"" + expr + "\"-->").replaceAll(template);
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
    return controller.watch(expr, function(newValue, oldValue, splices) {
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
          splices = compare.arrays(Object.keys(value), Object.keys(oldValue));
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
  });

  chip.binding('partial', 50, function(element, expr, controller) {
    var childController, itemExpr, itemName, nameExpr, parts, properties;
    parts = expr.split(/\s+as\s+|\s+with\s+/);
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
      return element.animateOut(function() {
        element.html(controller.template(name));
        if (itemExpr && itemName) {
          properties[itemName] = controller["eval"](itemExpr);
        }
        element.animateIn();
        return childController = controller.child({
          element: element,
          name: name,
          properties: properties
        });
      });
    });
  });

  chip.binding('controller', 30, function(element, controllerName, controller) {
    return controller.child({
      element: element,
      name: controllerName
    });
  });

  chip.filter('filter', function(controller, value, filterFunc) {
    if (!Array.isArray(value)) {
      return [];
    }
    if (!filterFunc) {
      return value;
    }
    return value.filter(filterFunc, controller);
  });

  chip.filter('map', function(controller, value, mapFunc) {
    if (!((value != null) && mapFunc)) {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map(mapFunc, controller);
    } else {
      return mapFunc.call(controller, value);
    }
  });

  chip.filter('reduce', function(controller, value, reduceFunc, initialValue) {
    if (!((value != null) && reduceFunc)) {
      return value;
    }
    if (Array.isArray(value)) {
      if (arguments.length === 4) {
        return value.reduce(reduceFunc, initialValue);
      } else {
        return value.reduce(reduceFunc);
      }
    } else if (arguments.length === 4) {
      return reduceFunc(initialValue, value);
    }
  });

  chip.filter('slice', function(controller, value, index, endIndex) {
    if (Array.isArray(value)) {
      return value.slice(index, endIndex);
    } else {
      return value;
    }
  });

  chip.filter('date', function(controller, value) {
    if (!value) {
      return '';
    }
    if (!(value instanceof Date)) {
      value = new Date(controller, value);
    }
    if (isNaN(value.getTime())) {
      return '';
    }
    return value.toLocaleString();
  });

  chip.filter('log', function(controller, value, prefix) {
    if (prefix == null) {
      prefix = 'Log';
    }
    console.log(prefix + ':', value);
    return value;
  });

  chip.filter('limit', function(controller, value, limit) {
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

  chip.filter('sort', function(controller, value, sortFunc) {
    var dir, prop, _ref;
    if (!sortFunc) {
      return value;
    }
    if (typeof sortFunc === 'string') {
      _ref = sortFunc.split(':'), prop = _ref[0], dir = _ref[1];
      dir = dir === 'desc' ? -1 : 1;
      sortFunc = function(a, b) {
        if (a[prop] > b[prop]) {
          return dir;
        }
        if (a[prop] < b[prop]) {
          return -dir;
        }
        return 0;
      };
    }
    if (Array.isArray(value)) {
      return value.slice().sort(sortFunc);
    } else {
      return value;
    }
  });

  div = null;

  chip.filter('escape', function(controller, value) {
    if (!div) {
      div = $('<div></div>');
    }
    return div.text(controller, value || '').text();
  });

  chip.filter('p', function(controller, value) {
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

  chip.filter('br', function(controller, value) {
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

  chip.filter('newline', function(controller, value) {
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

  chip.filter('autolink', function(controller, value, target) {
    target = target ? ' target="_blank"' : '';
    return ('' + value).replace(/<[^>]+>|[^<]+/g, function(match) {
      if (match.charAt(0) === '<') {
        return match;
      }
      return match.replace(urlExp, '$1<a href="$2"' + target + '>$2</a>');
    });
  });

  chip.filter('int', function(controller, value) {
    value = parseInt(value);
    if (isNaN(value)) {
      return null;
    } else {
      return value;
    }
  }, function(controller, value) {
    value = parseInt(value);
    if (isNaN(value)) {
      return null;
    } else {
      return value;
    }
  });

  chip.filter('float', function(controller, value) {
    value = parseFloat(value);
    if (isNaN(value)) {
      return null;
    } else {
      return value;
    }
  }, function(controller, value) {
    value = parseInt(value);
    if (isNaN(value)) {
      return null;
    } else {
      return value;
    }
  });

  compare = {};

  (function() {
    var EDIT_ADD, EDIT_DELETE, EDIT_LEAVE, EDIT_UPDATE, calcEditDistances, newChange, newSplice, sharedPrefix, sharedSuffix, spliceOperationsFromEditDistances;
    compare.clone = function(value, deep) {
      var copy, key, objValue;
      if (Array.isArray(value)) {
        if (deep) {
          return value.map(function(value) {
            return compare.clone(value, deep);
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
              objValue = compare.clone(objValue, deep);
            }
            copy[key] = objValue;
          }
          return copy;
        }
      } else {
        return value;
      }
    };
    compare.values = function(value, oldValue) {
      var changeRecords, oldValueValue, splices, valueValue;
      if (Array.isArray(value) && Array.isArray(oldValue)) {
        splices = compare.arrays(value, oldValue);
        if (splices.length) {
          return splices;
        } else {
          return false;
        }
      } else if (value && oldValue && typeof value === 'object' && typeof oldValue === 'object') {
        valueValue = value.valueOf();
        oldValueValue = oldValue.valueOf();
        if (valueValue !== value && oldValueValue !== oldValue) {
          return valueValue !== oldValueValue;
        } else {
          changeRecords = compare.objects(value, oldValue);
          if (changeRecords.length) {
            return changeRecords;
          } else {
            return false;
          }
        }
      } else {
        return value !== oldValue;
      }
    };
    compare.objects = function(object, oldObject) {
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
    compare.arrays = function(value, oldValue) {
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

  chip.compare = compare;

}).call(this);
