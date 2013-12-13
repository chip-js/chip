var Path = {
    'version': "0.8.4",
    'map': function (path) {
        if (Path.routes.defined.hasOwnProperty(path)) {
            return Path.routes.defined[path];
        } else {
            return new Path.core.route(path);
        }
    },
    'root': function (path) {
        Path.routes.root = path;
    },
    'rescue': function (fn) {
        Path.routes.rescue = fn;
    },
    'history': {
        'initial':{}, // Empty container for "Initial Popstate" checking variables.
        'pushState': function(state, title, path){
            if(Path.history.supported){
                history.pushState(state, title, path);
                Path.dispatch(path);
            } else {
                if(Path.history.fallback){
                    window.location.hash = "#" + path;
                }
            }
        },
        'popState': function(event){
            var initialPop = !Path.history.initial.popped && location.href == Path.history.initial.URL;
            Path.history.initial.popped = true;
            if(initialPop) return;
            Path.dispatch(document.location.pathname);
        },
        'listen': function(fallback){
            Path.history.supported = !!(window.history && window.history.pushState);
            Path.history.fallback  = fallback;

            if(Path.history.supported){
                Path.history.initial.popped = ('state' in window.history), Path.history.initial.URL = location.href;
                window.onpopstate = Path.history.popState;
            } else {
                if(Path.history.fallback){
                    for(route in Path.routes.defined){
                        if(route.charAt(0) != "#"){
                          Path.routes.defined["#"+route] = Path.routes.defined[route];
                          Path.routes.defined["#"+route].path = "#"+route;
                        }
                    }
                    Path.listen();
                }
            }
        }
    },
    'match': function (path, parameterize) {
        var params = {}, route = null, possible_routes, slice, i, j, compare;
        for (route in Path.routes.defined) {
            if (route !== null && route !== undefined) {
                route = Path.routes.defined[route];
                possible_routes = route.partition();
                for (j = 0; j < possible_routes.length; j++) {
                    slice = possible_routes[j];
                    compare = path;
                    if (slice.search(/:/) > 0) {
                        for (i = 0; i < slice.split("/").length; i++) {
                            if ((i < compare.split("/").length) && (slice.split("/")[i].charAt(0) === ":")) {
                                params[slice.split('/')[i].replace(/:/, '')] = compare.split("/")[i];
                                compare = compare.replace(compare.split("/")[i], slice.split("/")[i]);
                            }
                        }
                    }
                    if (slice === compare) {
                        if (parameterize) {
                            route.params = params;
                        }
                        return route;
                    }
                }
            }
        }
        return null;
    },
    'dispatch': function (passed_route) {
        var previous_route, matched_route;
        if (Path.routes.current !== passed_route) {
            Path.routes.previous = Path.routes.current;
            Path.routes.current = passed_route;
            matched_route = Path.match(passed_route, true);

            if (Path.routes.previous) {
                previous_route = Path.match(Path.routes.previous);
                if (previous_route !== null && previous_route.do_exit !== null) {
                    previous_route.do_exit();
                }
            }

            if (matched_route !== null) {
                matched_route.run();
	            
		        // TODO add event listeners, come up with a better way to do this
		        if (Path.onchange) {
			        Path.onchange(previous_route, matched_route);
		        }
                return true;
            } else {
                if (Path.routes.rescue !== null) {
                    Path.routes.rescue();
                }
	            if (Path.onchange) {
                    Path.onchange(previous_route, matched_route);
                }
            }
        }
    },
    'listen': function () {
        var fn = function(){ Path.dispatch(location.hash); }

        if (location.hash === "") {
            if (Path.routes.root !== null) {
                location.hash = Path.routes.root;
            }
        }

        // The 'document.documentMode' checks below ensure that PathJS fires the right events
        // even in IE "Quirks Mode".
        if ("onhashchange" in window && (!document.documentMode || document.documentMode >= 8)) {
            window.onhashchange = fn;
        } else {
            setInterval(fn, 50);
        }

        if(location.hash !== "") {
            Path.dispatch(location.hash);
        }
    },
    'core': {
        'route': function (path) {
            this.path = path;
            this.action = null;
            this.do_enter = [];
            this.do_exit = null;
            this.params = {};
            Path.routes.defined[path] = this;
        }
    },
    'routes': {
        'current': null,
        'root': null,
        'rescue': null,
        'previous': null,
        'defined': {}
    }
};
Path.core.route.prototype = {
    'to': function (fn) {
        this.action = fn;
        return this;
    },
    'enter': function (fns) {
        if (fns instanceof Array) {
            this.do_enter = this.do_enter.concat(fns);
        } else {
            this.do_enter.push(fns);
        }
        return this;
    },
    'exit': function (fn) {
        this.do_exit = fn;
        return this;
    },
    'partition': function () {
        var parts = [], options = [], re = /\(([^}]+?)\)/g, text, i;
        while (text = re.exec(this.path)) {
            parts.push(text[1]);
        }
        options.push(this.path.split("(")[0]);
        for (i = 0; i < parts.length; i++) {
            options.push(options[options.length - 1] + parts[i]);
        }
        return options;
    },
    'run': function () {
        var halt_execution = false, i, result, previous;

        if (Path.routes.defined[this.path].hasOwnProperty("do_enter")) {
            if (Path.routes.defined[this.path].do_enter.length > 0) {
                for (i = 0; i < Path.routes.defined[this.path].do_enter.length; i++) {
                    result = Path.routes.defined[this.path].do_enter[i].apply(this, null);
                    if (result === false) {
                        halt_execution = true;
                        break;
                    }
                }
            }
        }
        if (!halt_execution) {
            Path.routes.defined[this.path].action();
        }
    }
};

(function() {
  var App, Binding, Controller, Observer, Route, Router, argSeparator, attribs, chip, emptyQuoteExpr, equality, hasFilter, keyCode, keyCodes, makeEventEmitter, name, normalizeExpression, parsePath, parseQuery, pipeExpr, propExpr, quoteExpr, varExpr, _i, _len,
    __slice = [].slice,
    __hasProp = {}.hasOwnProperty;

  makeEventEmitter = function(object) {
    var eventEmitter;
    eventEmitter = $({});
    object.on = eventEmitter.on.bind(eventEmitter);
    object.one = eventEmitter.one.bind(eventEmitter);
    object.off = eventEmitter.off.bind(eventEmitter);
    return object.trigger = eventEmitter.trigger.bind(eventEmitter);
  };

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
    }
  };

  $(function() {
    return chip.init();
  });

  window.chip = chip;

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
      if (!this.hashOnly && url.indexOf(this.root) !== 0) {
        location.href = url;
        return;
      }
      if (this.usePushState) {
        history.pushState({}, '', url);
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
      var callbacks, doneParams, next, path, pathParts, req, routes,
        _this = this;
      pathParts = document.createElement('a');
      pathParts.href = url;
      req = {
        query: parseQuery(pathParts.search)
      };
      path = pathParts.pathname;
      if (path.indexOf(this.prefix) !== 0) {
        return;
      }
      path = path.replace(this.prefix, '');
      this.trigger('change', path);
      routes = this.routes.filter(function(route) {
        return route.match(path);
      });
      callbacks = [];
      doneParams = {};
      routes.forEach(function(route) {
        var key, value, _ref;
        callbacks.push(function(next) {
          req.params = route.params;
          return next();
        });
        _ref = route.params;
        for (key in _ref) {
          value = _ref[key];
          if (doneParams[key] === value || !this.params[key]) {
            continue;
          }
          doneParams[key] = value;
          this.params[key].forEach(function(callback) {
            return callbacks.push(callback.bind(null, req, value));
          });
        }
        return callbacks.push(route.callback.bind(null, req));
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
        return callback(next);
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
        return expr += '(/*)?';
      }
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
    Controller.prototype.params = {};

    function Controller() {
      this._observers = [];
    }

    Controller.prototype.watch = function(expr, skipTriggerImmediately, callback) {
      var getter, observer;
      getter = Controller.createBoundFunction(this, expr);
      observer = Observer.add(getter, skipTriggerImmediately, callback);
      observer.expr = expr;
      this._observers.push(observer);
      return observer;
    };

    Controller.prototype["eval"] = function(expr) {
      return Controller.createFunction(expr).call(this);
    };

    Controller.prototype.getBoundEval = function() {
      var expr, extraArgNames;
      expr = arguments[0], extraArgNames = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      return Controller.createBoundFunction(this, expr, extraArgNames);
    };

    Controller.prototype.exprHasFilter = function(expr) {
      return hasFilter(expr);
    };

    Controller.prototype.redirect = function(url) {
      return chip.redirect(url);
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
        return setTimeout(later);
      }
    };

    Controller.prototype.syncNow = function() {
      var observer, _i, _len, _ref, _results;
      _ref = this._observers;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        observer = _ref[_i];
        _results.push(observer.sync());
      }
      return _results;
    };

    Controller.prototype.runFilter = function() {
      var args, filter, filterName, value;
      value = arguments[0], filterName = arguments[1], args = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
      filter = Controller.filters[filterName];
      if (filter) {
        return filter.apply(null, [this, value].concat(__slice.call(args)));
      } else {
        console.error("Filter `" + filterName + "` has not been defined.");
        return value;
      }
    };

    Controller.keywords = ['this', 'window', '$', 'true', 'false'];

    Controller.filters = {};

    Controller.exprCache = {};

    Controller.createFunction = function(expr, extraArgNames) {
      var e, func, functionBody, normalizedExpr;
      if (extraArgNames == null) {
        extraArgNames = [];
      }
      normalizedExpr = normalizeExpression(expr, extraArgNames);
      func = this.exprCache[normalizedExpr];
      if (func) {
        return func;
      }
      try {
        if (normalizedExpr.indexOf('(') === -1) {
          functionBody = "try{return " + normalizedExpr + "}catch(e){}";
        } else {
          functionBody = ("try{return " + normalizedExpr + "}catch(e){throw new Error(") + ("'Error processing binding expression `" + (expr.replace(/'/g, "\\'")) + "` ' + e)}");
        }
        func = this.exprCache[normalizedExpr] = Function.apply(null, __slice.call(extraArgNames).concat([functionBody]));
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
        if (passthrough && controller.passthrough) {
          return controller.passthrough;
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

  propExpr = /((\{|,)?\s*)([a-z$_\$][a-z_\$0-9\.-]*)(\s*(:)?)/gi;

  pipeExpr = /\|(\|)?/g;

  argSeparator = /\s*:\s*/g;

  normalizeExpression = function(expr, extraArgNames) {
    var filters, ignore, strIndex, strings, _ref;
    ignore = Controller.keywords.concat(extraArgNames);
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
      strIndex = ((_ref = expr.match(quoteExpr)) != null ? _ref.length : void 0) || 0;
      filters.forEach(function(filter) {
        var args, _ref1;
        args = filter.split(argSeparator);
        strings.splice(strIndex++, 0, "'" + args[0] + "'");
        strIndex += ((_ref1 = filter.match(quoteExpr)) != null ? _ref1.length : void 0) || 0;
        args[0] = "''";
        return expr = "runFilter(" + expr + "," + (args.join(',')) + ")";
      });
    }
    expr = expr.replace(propExpr, function(match, prefix, objIndicator, propChain, postfix, colon, index, str) {
      if (objIndicator && colon || str[index + prefix.length - 1] === '.') {
        return match;
      }
      if (ignore.indexOf(propChain.split(/\.|\(/).shift()) !== -1) {
        return match;
      }
      return prefix + 'this.' + propChain + postfix;
    });
    expr = expr.replace(emptyQuoteExpr, function() {
      return strings.shift();
    });
    return expr;
  };

  hasFilter = function(expr) {
    expr = expr.replace(pipeExpr, function(match, orIndicator) {
      if (orIndicator) {
        return match;
      }
      return '@@@';
    });
    return expr.indexOf('@@@') !== -1;
  };

  chip.Controller = Controller;

  App = (function() {
    function App(appName) {
      this.name = appName;
      this.controllers = {};
      this.templates = {};
      this.router = new Router();
      this.rootElement = $('html');
    }

    App.prototype.init = function(root) {
      var app, element, name, _results;
      if (this.inited) {
        return;
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
      _results = [];
      while ((element = this.rootElement.find('[data-controller]:first')).length) {
        name = element.attr('data-controller');
        element.removeAttr('data-controller');
        _results.push(this.createController({
          element: element,
          name: name,
          parent: this.rootController
        }));
      }
      return _results;
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
          if (options.parent.hasOwnProperty('passthrough')) {
            controller.passthrough = options.parent.passthrough;
          } else {
            controller.passthrough = options.parent;
          }
        }
      } else {
        controller = new Controller();
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

    App.prototype.route = function(path, handler) {
      var name,
        _this = this;
      if (!handler) {
        handler = path.replace(/^\//, '');
      }
      if (typeof handler === 'string') {
        name = handler;
        handler = function(req, next) {
          var container, controller, key, value;
          for (key in req) {
            if (!__hasProp.call(req, key)) continue;
            value = req[key];
            Controller.prototype[key] = value;
          }
          container = _this.rootElement.find('[data-route]:first');
          container.html(_this.template(name));
          controller = _this.createController({
            element: container,
            parent: _this.rootController,
            name: name
          });
          return controller.syncView();
        };
      }
      this.router.route(path, handler);
      return this;
    };

    App.prototype.redirect = function(url) {
      return this.router.redirect(url);
    };

    App.prototype.mount = function(path, app) {};

    App.prototype.listen = function(options) {
      var router;
      router = this.router;
      $(function() {
        return router.listen(options);
      });
      return this.rootElement.on('click', 'a[href]', function(event) {
        if (event.isDefaultPrevented()) {
          return;
        }
        if (this.host !== location.host || this.href === location.href + '#') {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        return router.redirect($(this).attr("href"));
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

    Binding.prefix = 'data-';

    Binding.handlers = [];

    Binding.addHandler = function(name, priority, handler) {
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
      this.handlers[name] = entry;
      this.handlers.push(entry);
      return this.handlers.sort(function(a, b) {
        return b.priority - a.priority;
      });
    };

    Binding.addEventHandler = function(eventName) {
      return this.addHandler(eventName, function(element, expr, controller) {
        return element.on(eventName, function(event) {
          event.preventDefault();
          return controller["eval"](expr);
        });
      });
    };

    Binding.addKeyEventHandler = function(name, keyCode, ctrlKey) {
      return this.addHandler(name, function(element, expr, controller) {
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

    Binding.addAttributeHandler = function(name) {
      return this.addHandler(name, function(element, expr, controller) {
        return controller.watch(expr, function(value) {
          if (value != null) {
            return element.attr(name, value);
          } else {
            return element.removeAttr(name);
          }
        });
      });
    };

    Binding.addAttributeToggleHandler = function(name) {
      return this.addHandler(name, function(element, expr, controller) {
        return controller.watch(expr, function(value) {
          return element.prop(name, value || false);
        });
      });
    };

    Binding.process = function(element, controller) {
      var attr, attribs, child, children, newController, node, parentNode, _i, _len, _results,
        _this = this;
      if (!(controller instanceof Controller)) {
        throw new Error('A Controller is required to bind a jQuery element.');
      }
      node = element.get(0);
      parentNode = node.parentNode;
      attribs = Array.prototype.slice.call(node.attributes);
      attribs = attribs.filter(function(attr) {
        return attr.name.indexOf(_this.prefix) === 0 && _this.handlers[attr.name.replace(_this.prefix, '')];
      });
      attribs = attribs.map(function(attr) {
        var entry;
        entry = _this.handlers[attr.name.replace(_this.prefix, '')];
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
      children = Array.prototype.slice.call(node.children);
      _results = [];
      for (_i = 0, _len = children.length; _i < _len; _i++) {
        child = children[_i];
        _results.push(this.process($(child), controller));
      }
      return _results;
    };

    return Binding;

  })();

  jQuery.fn.bindTo = function(controller) {
    return Binding.process(this, controller);
  };

  chip.Binding = Binding;

  Binding.addHandler('debug', function(element, expr, controller) {
    return controller.watch(expr, function(value) {
      return console.info('Debug:', expr, '=', value);
    });
  });

  Binding.addHandler('text', function(element, expr, controller) {
    return controller.watch(expr, function(value) {
      return element.text(value != null ? value : '');
    });
  });

  Binding.addHandler('html', function(element, expr, controller) {
    return controller.watch(expr, function(value) {
      return element.html(value != null ? value : '');
    });
  });

  Binding.addHandler('class', function(element, expr, controller) {
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

  Binding.addHandler('active', function(element, expr, controller) {
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
      link = element.filter('a[href],a[data-href]').add(element.find('a[href],a[data-href]')).first();
      if (link.attr('data-href')) {
        link.on('hrefChanged', refresh);
      }
      $(document).on('urlChange', refresh);
      element.on('elementRemove', function() {
        return $(document).off('urlChange', refresh);
      });
      return refresh();
    }
  });

  Path.onchange = function() {
    return $(document).trigger('urlChange');
  };

  Binding.addHandler('value', function(element, expr, controller) {
    var getValue, observer, setValue, setter, setterController;
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
    if (controller.exprHasFilter(expr)) {
      return;
    }
    setterController = controller.passthrough || controller;
    setter = setterController.getBoundEval(expr + ' = value', 'value');
    if (element.filter('select').length) {
      setTimeout(function() {
        setValue(controller["eval"](expr));
        return setter(getValue());
      });
    } else {
      setter(getValue());
    }
    return element.on('keydown keyup change', function() {
      if (getValue() !== observer.oldValue) {
        setter(getValue());
        observer.skipNextSync();
        return controller.syncView();
      }
    });
  });

  ['click', 'dblclick', 'submit', 'change', 'focus', 'blur'].forEach(function(name) {
    return Binding.addEventHandler(name);
  });

  keyCodes = {
    enter: 13,
    esc: 27
  };

  for (name in keyCodes) {
    if (!__hasProp.call(keyCodes, name)) continue;
    keyCode = keyCodes[name];
    Binding.addKeyEventHandler(name, keyCode);
  }

  Binding.addKeyEventHandler('ctrl-enter', keyCodes.enter, true);

  attribs = ['href', 'src', 'id'];

  for (_i = 0, _len = attribs.length; _i < _len; _i++) {
    name = attribs[_i];
    Binding.addAttributeHandler(name);
  }

  ['checked', 'disabled'].forEach(function(name) {
    return Binding.addAttributeToggleHandler(name);
  });

  Binding.addHandler('if', 50, function(element, expr, controller) {
    var controllerName, placeholder, template;
    template = element;
    placeholder = $('<script type="text/if-placeholder"><!--' + expr + '--></script>').replaceAll(template);
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

  Binding.addHandler('repeat', 100, function(element, expr, controller) {
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
    placeholder = $('<script type="text/repeat-placeholder"><!--' + expr + '--></script>').replaceAll(template);
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

  Binding.addHandler('partial', 50, function(element, expr, controller) {
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

  Binding.addHandler('controller', 30, function(element, controllerName, controller) {
    return controller.child({
      element: element,
      name: controllerName
    });
  });

  Controller.filters.filter = function(controller, value, filterFunc) {
    if (!Array.isArray(value)) {
      return [];
    }
    if (!filterFunc) {
      return value;
    }
    return value.filter(filterFunc);
  };

  Controller.filters.date = function(controller, value) {
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
  };

  Controller.filters.log = function(controller, value, prefix) {
    if (prefix == null) {
      prefix = 'Log';
    }
    console.log(prefix + ':', value);
    return value;
  };

  Controller.filters.limit = function(controller, value, limit) {
    if (value && typeof value.slice === 'function') {
      if (limit < 0) {
        return value.slice(limit);
      } else {
        return value.slice(0, limit);
      }
    } else {
      return value;
    }
  };

  Controller.filters.sort = function(controller, value, sortFunc) {
    if (Array.isArray(value)) {
      return value.slice().sort(sortFunc);
    } else {
      return value;
    }
  };

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
