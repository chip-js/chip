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
  var Binding, Controller, Observer, attribs, chip, keyCode, keyCodes, name, normalizeExpression, varExpr, _i, _len,
    __slice = [].slice,
    __hasProp = {}.hasOwnProperty;

  chip = {};

  this.chip = chip;

  if (typeof define === 'function' && define.amd) {
    define('chip', chip);
  } else if (typeof exports === 'object' && typeof module === 'object') {
    module.exports = chip;
  }

  chip.templates = {};

  $(function() {
    var element, name, _results;
    $('script[type="text/html"]').each(function() {
      var $this, name;
      $this = $(this);
      name = $this.attr('name') || $this.attr('id');
      if (name) {
        chip.templates[name] = $this.html();
        return $this.remove();
      }
    });
    _results = [];
    while ((element = $('[data-controller]')).length) {
      name = element.attr('data-controller');
      element.removeAttr('data-controller');
      _results.push(Controller.create(element, name));
    }
    return _results;
  });

  chip.getTemplate = function(name) {
    if (!chip.templates.hasOwnProperty(name)) {
      throw 'Template "' + name + '" does not exist';
    }
    return $(chip.templates[name]);
  };

  chip.route = function(path, name, subroutes) {
    var parents;
    if (typeof name === 'function') {
      subroutes = name;
    }
    if (typeof name !== 'string') {
      name = path.replace(/^\//, '').replace(/\/\w/, function(match) {
        return match.slice(1).toUpperCase();
      });
    }
    if (!chip.route.parents) {
      chip.route.parents = [];
    }
    parents = chip.route.parents.slice();
    if (parents.length) {
      path = parents.join('') + path;
    }
    Path.map(path).to(function() {
      return chip.runRoute(name, parents);
    });
    if (subroutes) {
      chip.route.parents.push(path);
      subroutes(chip.route);
      return chip.route.parents.pop();
    }
  };

  chip.runRoute = function(name, parents) {
    var container, controller, path, selector, template, _i, _len;
    selector = ['[data-route]'];
    for (_i = 0, _len = parents.length; _i < _len; _i++) {
      path = parents[_i];
      selector.push('[data-route]');
    }
    selector = selector.join(' ');
    container = $(selector);
    controller = container.data('controller');
    if (controller != null) {
      if (typeof controller.teardown === "function") {
        controller.teardown();
      }
    }
    template = chip.getTemplate(name);
    container.data('controller', controller).html(template);
    controller = Controller.create(container, name);
    return controller.syncView();
  };

  chip.listen = function() {
    Path.history.listen();
    if (Path.history.supported) {
      return $('body').on('click', 'a[href]', function(event) {
        event.preventDefault();
        return Path.history.pushState({}, "", $(this).attr("href"));
      });
    }
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
          this.callback(value, splices);
        }
      } else if (value && this.oldValue && typeof value === 'object' && typeof this.oldValue === 'object') {
        changeRecords = equality.object(value, this.oldValue);
        if (changeRecords.length) {
          this.callback(value, changeRecords);
        }
      } else if (value !== this.oldValue) {
        this.callback(value);
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

  this.Observer = Observer;

  if (typeof define === 'function' && define.amd) {
    define('chip/observer', function() {
      return Observer;
    });
  } else if (typeof exports === 'object' && typeof module === 'object') {
    chip.Observer = Observer;
  }

  Controller = (function() {
    function Controller() {}

    Controller.prototype.watch = function(expr, skipTriggerImmediately, callback) {
      var getter, observer;
      getter = Controller.createBoundFunction(this, expr);
      if (!this.hasOwnProperty('_observers')) {
        this._observers = [];
      }
      observer = Observer.add(getter, skipTriggerImmediately, callback);
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

    Controller.prototype.close = function() {
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
      return Observer.sync(later);
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

    Controller.keywords = ['this', 'window', 'true', 'false'];

    Controller.definitions = {};

    Controller.define = function(name, defineFunction) {
      return this.definitions[name] = defineFunction;
    };

    Controller.getDefinition = function(name) {
      if (!this.definitions.hasOwnProperty(name)) {
        throw 'Controller definition "' + name + '" does not exist';
      }
      return this.definitions[name];
    };

    Controller.create = function(element, parentController, name, extend) {
      var NewController, controller, key, value;
      if (typeof parentController === 'string') {
        extend = name;
        name = parentController;
        parentController = void 0;
      }
      if (parentController) {
        NewController = function() {};
        if (parentController) {
          NewController.prototype = parentController;
        }
        controller = new NewController();
      } else {
        controller = new Controller();
      }
      element.on('elementRemove', function() {
        return controller.close();
      });
      controller.element = element;
      if (extend) {
        for (key in extend) {
          if (!__hasProp.call(extend, key)) continue;
          value = extend[key];
          controller[key] = value;
        }
      }
      if (name) {
        this.getDefinition(name)(controller);
      }
      element.bindTo(controller);
      return controller;
    };

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
          functionBody = ("try{return " + normalizedExpr + "}catch(e){throw") + (" 'Error processing binding expression `" + (expr.replace(/'/g, "\\'")) + "` ' + e}");
        }
        func = this.exprCache[normalizedExpr] = Function.apply(null, __slice.call(extraArgNames).concat([functionBody]));
      } catch (_error) {
        e = _error;
        throw 'Error evaluating code for observer binding: `' + expr + '` with error: ' + e.message;
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

  $.event.special.elementRemove = {
    remove: function(event) {
      return event.handler();
    }
  };

  varExpr = /[a-z$_\$][a-z_\$0-9\.-]*\s*:?|'|"/gi;

  normalizeExpression = function(expr, extraArgNames) {
    var ignore, index, match, rewritten;
    ignore = Controller.keywords.concat(extraArgNames);
    rewritten = '';
    index = 0;
    while ((match = varExpr.exec(expr))) {
      if (match) {
        match = match[0];
        rewritten += expr.slice(index, varExpr.lastIndex - match.length);
        if (match === "'" || match === '"') {
          index = varExpr.lastIndex;
          while (index < expr.length) {
            index = expr.indexOf(match, index) + 1;
            if (index === 0) {
              index = expr.length;
            }
            if (expr[index - 2] !== '\\') {
              rewritten += expr.slice(varExpr.lastIndex - 1, index);
              break;
            }
          }
          varExpr.lastIndex = index;
        } else if (expr[varExpr.lastIndex - match.length - 1] === '.') {
          rewritten += match;
          index = varExpr.lastIndex;
        } else {
          if (match.slice(-1) !== ':' && ignore.indexOf(match.split(/\.|\(/).shift()) === -1) {
            rewritten += 'this.';
          }
          rewritten += match;
          index = varExpr.lastIndex;
        }
      }
    }
    rewritten += expr.slice(index);
    return rewritten;
  };

  this.Controller = Controller;

  if (typeof define === 'function' && define.amd) {
    define('chip/controller', function() {
      return Controller;
    });
  } else if (typeof exports === 'object' && typeof module === 'object') {
    chip.Controller = Controller;
  }

  Binding = (function() {
    function Binding(name, expr) {
      this.name = name;
      this.expr = expr;
    }

    Binding.prefix = 'data-';

    Binding.blockHandlers = {};

    Binding.handlers = {};

    Binding.addHandler = function(name, handler) {
      return this.handlers[name] = handler;
    };

    Binding.addBlockHandler = function(name, handler) {
      return this.blockHandlers[name] = handler;
    };

    Binding.addEventHandler = function(eventName) {
      return this.addHandler(eventName, function(element, expr, controller) {
        return element.on(eventName, function(event) {
          event.preventDefault();
          return controller["eval"](expr);
        });
      });
    };

    Binding.addKeyEventHandler = function(name, keyCode) {
      return this.addHandler(name, function(element, expr, controller) {
        return element.on('keydown', function(event) {
          if (event.keyCode === keyCode) {
            event.preventDefault();
            return controller["eval"](expr);
          }
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
      var block, boundElements, handlers, prefixExp, processElement, selector;
      if (!controller) {
        controller = Controller.create(element);
      }
      prefixExp = new RegExp('^' + Binding.prefix);
      processElement = function(element) {
        var attr, attribs, expr, handler, node, _results;
        node = element.get(0);
        handler = null;
        attribs = Array.prototype.slice.call(node.attributes).filter(function(attr) {
          return prefixExp.test(attr.name) && handlers[attr.name.replace(prefixExp, '')];
        });
        _results = [];
        while (attribs.length) {
          attr = attribs.shift();
          if (!node.hasAttribute(attr.name)) {
            continue;
          }
          handler = handlers[attr.name.replace(prefixExp, '')];
          expr = attr.value;
          node.removeAttribute(attr.name);
          _results.push(handler(element, expr, controller));
        }
        return _results;
      };
      handlers = this.blockHandlers;
      selector = '[' + this.prefix + Object.keys(handlers).join('],[' + this.prefix) + ']';
      while ((block = element.find(selector)).length) {
        processElement(block.first());
      }
      handlers = this.handlers;
      selector = '[' + this.prefix + Object.keys(handlers).join('],[' + this.prefix) + ']';
      boundElements = element.filter(selector).add(element.find(selector));
      return boundElements.each(function() {
        return processElement(jQuery(this));
      });
    };

    return Binding;

  })();

  jQuery.fn.bindTo = function(controller) {
    return Binding.process(this, controller);
  };

  this.Binding = Binding;

  if (typeof define === 'function' && define.amd) {
    define('chip/binding', function() {
      return Binding;
    });
  } else if (typeof exports === 'object' && typeof module === 'object') {
    chip.Binding = Binding;
  }

  Binding.addHandler('if', function(element, expr, controller) {
    return controller.watch(expr, function(value) {
      if (value) {
        return element.show();
      } else {
        return element.hide();
      }
    });
  });

  Binding.addHandler('bind', function(element, expr, controller) {
    return controller.watch(expr, function(value) {
      return element.text(value != null ? value : '');
    });
  });

  Binding.addHandler('bind-html', function(element, expr, controller) {
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
      link = element.filter('a[href],a[data-attr^="href:"]').add(element.find('a[href],a[data-attr^="href:"]')).first();
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
    var observer, setter;
    observer = controller.watch(expr, function(value) {
      if (element.val() !== value) {
        return element.val(value);
      }
    });
    setter = controller.getBoundEval(expr + ' = value', 'value');
    return element.on('keydown keyup', function() {
      if (element.val() !== observer.oldValue) {
        setter(element.val());
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

  attribs = ['href', 'src'];

  for (_i = 0, _len = attribs.length; _i < _len; _i++) {
    name = attribs[_i];
    Binding.addAttributeHandler(name);
  }

  ['checked', 'disabled'].forEach(function(name) {
    return Binding.addAttributeToggleHandler(name);
  });

  Binding.addBlockHandler('repeat', function(element, expr, controller) {
    var controllerName, createElement, elements, extend, itemName, template, _ref;
    _ref = expr.split(/\s+in\s+/), itemName = _ref[0], expr = _ref[1];
    controllerName = element.attr('data-controller');
    element.removeAttr('data-controller');
    template = element;
    element = $('<script type="text/repeat-placeholder"><!--data-repeat="' + expr + '"--></script>').replaceAll(template);
    elements = $();
    extend = {};
    createElement = function(item) {
      var newElement;
      newElement = template.clone();
      extend[itemName] = item;
      Controller.create(newElement, controller, controllerName, extend);
      return newElement.get(0);
    };
    return controller.watch(expr, function(value, splices) {
      if (!splices) {
        elements.remove();
        elements = $();
        if (Array.isArray(value)) {
          value.forEach(function(item) {
            return elements.push(createElement(item));
          });
          return element.after(elements);
        }
      } else if (Array.isArray(value)) {
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
          removedElements = elements.splice.apply(elements, args.concat(newElements));
          $(removedElements).remove();
          if (splice.index === 0) {
            return element.after(newElements);
          } else {
            return elements.eq(splice.index - 1).after(newElements);
          }
        });
      }
    });
  });

  Binding.addBlockHandler('partial', function(element, expr, controller) {
    var extend, itemName, newController, parts;
    parts = expr.split(/\s+as\s+\s+with\s+/);
    name = parts.pop();
    expr = parts[0], itemName = parts[1];
    if (expr && itemName) {
      extend = {};
      extend[itemName] = controller["eval"](expr);
      controller.watch(expr, true, function(value) {
        return newController[itemName] = value;
      });
    }
    element.html(chip.getTemplate(name));
    return newController = Controller.create(element, controller, name, extend);
  });

  Binding.addBlockHandler('controller', function(element, controllerName, controller) {
    return Controller.create(element, controller, controllerName);
  });

  (function() {
    var EDIT_ADD, EDIT_DELETE, EDIT_LEAVE, EDIT_UPDATE, calcEditDistances, equality, newChange, newSplice, sharedPrefix, sharedSuffix, spliceOperationsFromEditDistances;
    equality = {};
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
      return length;
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
    calcEditDistances = function(current, currentStart, currentEnd, old, oldStart, oldEnd) {
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
    this.equality = equality;
    if (typeof define === 'function' && define.amd) {
      return define('chip/equality', function() {
        return equality;
      });
    } else if (typeof exports === 'object' && typeof module === 'object') {
      return chip.equality = equality;
    }
  }).call(this);

}).call(this);
