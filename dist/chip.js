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

(function(global) {
  var EDIT_ADD, EDIT_DELETE, EDIT_LEAVE, EDIT_UPDATE, calcEditDistances, calcSplices, copyObject, copyValue, diffObjects, newChange, newSplice, observers, sharedPrefix, sharedSuffix, spliceOperationsFromEditDistances;
  observers = [];
  global.observers = observers;
  setTimeout(function() {
    observers.calcSplices = calcSplices;
    return observers.diffObjects = diffObjects;
  });
  observers.add = function(expr, triggerNow, callback) {
    var observer, value;
    if (typeof triggerNow === 'function') {
      callback = triggerNow;
      triggerNow = false;
    }
    value = expr();
    observer = {
      expr: expr,
      callback: callback,
      oldValue: copyValue(value),
      close: function() {
        return observers.remove(observer);
      }
    };
    observers.push(observer);
    if (triggerNow) {
      callback(value);
    }
    return observer;
  };
  observers.remove = function(observer) {
    var index;
    index = observers.indexOf(observer);
    if (index) {
      return observers.splice(index, 1);
    }
  };
  observers.sync = function() {
    return observers.forEach(function(observer) {
      var changeRecords, splices, value;
      value = observer.expr();
      if (Array.isArray(value) && Array.isArray(observer.oldValue)) {
        splices = calcSplices(value, observer.oldValue);
        if (splices.length) {
          observer.callback(value, splices);
        }
      } else if (value && observer.oldValue && typeof value === 'object' && typeof observer.oldValue === 'object') {
        changeRecords = diffObjects(value, observer.oldValue);
        if (changeRecords.length) {
          observer.callback(value, changeRecords);
        }
      } else if (value !== observer.oldValue) {
        observer.callback(value);
      } else {
        return;
      }
      observer.oldValue = copyValue(value);
    });
  };
  copyValue = function(value) {
    if (Array.isArray(value)) {
      return value.slice();
    } else if (value && typeof value === 'object') {
      return copyObject(value);
    } else {
      return value;
    }
  };
  diffObjects = function(object, oldObject) {
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
  copyObject = function(object) {
    var copy, key, value;
    copy = Array.isArray(object) ? [] : {};
    for (key in copy) {
      value = copy[key];
      copy[key] = value;
    }
    if (Array.isArray(object)) {
      copy.length = object.length;
    }
    return copy;
  };
  EDIT_LEAVE = 0;
  EDIT_UPDATE = 1;
  EDIT_ADD = 2;
  EDIT_DELETE = 3;
  calcSplices = function(current, old) {
    var currentEnd, currentStart, distances, index, minLength, oldEnd, oldIndex, oldStart, op, ops, prefixCount, splice, splices, suffixCount, _i, _len;
    currentStart = 0;
    currentEnd = current.length;
    oldStart = 0;
    oldEnd = old.length;
    minLength = Math.min(currentEnd, oldEnd);
    prefixCount = sharedPrefix(current, old, minLength);
    suffixCount = sharedSuffix(current, old, minLength - prefixCount);
    currentStart += prefixCount;
    oldStart += prefixCount;
    currentEnd -= suffixCount;
    oldEnd -= suffixCount;
    if (currentEnd - currentStart === 0 && oldEnd - oldStart === 0) {
      return [];
    }
    if (currentStart === currentEnd) {
      return [newSplice(currentStart, old.slice(oldStart, oldEnd), 0)];
    }
    if (oldStart === oldEnd) {
      return [newSplice(currentStart, [], currentEnd - currentStart)];
    }
    distances = calcEditDistances(current, currentStart, currentEnd, old, oldStart, oldEnd);
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
        splice.removed.push(old[oldIndex]);
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
        splice.removed.push(old[oldIndex]);
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
})(this);

var __slice = [].slice;

(function($) {
  var attribs, bindExpression, bindTo, createBoundExpr, createFunction, evaluate, events, exprCache, getDataArgNames, getDataArgs, keyCodes, normalizeExpression, notThis, onRemove, toggles, varExpr;
  window.syncView = observers.sync;
  bindTo = $.fn.bindTo = function(data) {
    var bindings, block, blocksSelector, element, handleBinding, selector;
    element = this;
    if (!data) {
      data = {
        "this": {}
      };
    }
    if (!data.hasOwnProperty('this')) {
      data = {
        "this": data
      };
    }
    handleBinding = function(element, handlers) {
      var attr, attributes, binding, expr, _i, _len;
      attributes = Array.prototype.slice.call(element.get(0).attributes);
      for (_i = 0, _len = attributes.length; _i < _len; _i++) {
        attr = attributes[_i];
        if (attr.name.split('-').shift() !== 'data') {
          continue;
        }
        binding = handlers[attr.name.replace('data-', '')];
        if (binding) {
          expr = attr.value;
          element.removeAttr(attr.name);
          binding(element, expr, data);
        }
      }
    };
    blocksSelector = '[data-' + Object.keys(bindTo.blockHandlers).join('],[data-') + ']';
    while ((block = element.find(blocksSelector)).length) {
      handleBinding(block.first(), bindTo.blockHandlers);
    }
    selector = '[data-' + Object.keys(bindTo.handlers).join('],[data-') + ']';
    bindings = element.filter(selector).add(element.find(selector));
    bindings.each(function() {
      return handleBinding($(this), bindTo.handlers);
    });
    return element;
  };
  bindTo.blockHandlers = {
    repeat: function(element, expr, data) {
      var controllerName, createElement, elements, itemName, parent, template, _ref;
      _ref = expr.split(/\s+in\s+/), itemName = _ref[0], expr = _ref[1];
      controllerName = element.attr('data-controller');
      element.removeAttr('data-controller');
      parent = data["this"] || data;
      template = element;
      element = $('<script type="text/repeat-placeholder"><!--data-repeat="' + expr + '"--></script>').replaceAll(template);
      elements = $();
      createElement = function(model) {
        var controller, itemData, newElement;
        newElement = template.clone();
        if (controllerName) {
          controller = chip.getController(controllerName, {
            parent: parent,
            element: newElement,
            model: model
          });
        } else {
          controller = options.controller;
        }
        itemData = {
          "this": controller
        };
        itemData[itemName] = model;
        newElement.bindTo(itemData);
        if (controllerName) {
          if (typeof controller.setup === "function") {
            controller.setup();
          }
        }
        return newElement.get(0);
      };
      return bindExpression(element, expr, data, function(value, splices) {
        if (!splices) {
          elements.remove();
          elements = $();
          if (Array.isArray(value)) {
            value.forEach(function(item) {
              return elements.push(createElement(item));
            });
            return element.after(elements);
          }
        } else {
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
    },
    partial: function(element, expr, data) {
      return bindExpression(element, expr, data, function(value) {
        return element.html(value);
      });
    }
  };
  bindTo.handlers = {
    "if": function(element, expr, data) {
      return bindExpression(element, expr, data, function(value) {
        if (value) {
          return element.show();
        } else {
          return element.hide();
        }
      });
    },
    bind: function(element, expr, data) {
      return bindExpression(element, expr, data, function(value) {
        return element.text(value != null ? value : '');
      });
    },
    'bind-html': function(element, expr, data) {
      return bindExpression(element, expr, data, function(value) {
        return element.html(value != null ? value : '');
      });
    },
    active: function(element, expr, data) {
      var link, refresh;
      if (expr) {
        return bindExpression(element, expr, data, function(value) {
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
        link = element.filter('[href],[data-attr^="href:"]').add(element.children('[href],[data-attr^="href:"]')).first();
        link.on('boundUpdate', refresh);
        $(document).on('urlchange', refresh);
        onRemove(element, function() {
          return $(document).off('urlchange', refresh);
        });
        return refresh();
      }
    },
    "class": function(element, expr, data) {
      return bindExpression(element, expr, data, function(value) {
        var className, toggle, _results;
        if (Array.isArray(value)) {
          value = value.join(' ');
        }
        if (typeof value === 'string') {
          return element.attr('class', value);
        } else if (value && typeof value === 'object') {
          _results = [];
          for (className in value) {
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
    },
    value: function(element, expr, data) {
      var setter;
      bindExpression(element, expr, data, function(value) {
        return element.val(value);
      });
      setter = createBoundExpr(expr + ' = value', data, ['value']);
      setter(element.val());
      return element.on('keyup', function() {
        setter(element.val());
        return syncView();
      });
    }
  };
  events = ['click', 'dblclick', 'submit', 'change', 'focus', 'blur'];
  keyCodes = {
    enter: 13,
    esc: 27
  };
  toggles = ['checked', 'disabled'];
  attribs = ['href', 'src'];
  events.forEach(function(eventName) {
    return bindTo.handlers['on' + eventName] = function(element, expr, data) {
      return element.on(eventName, function(event) {
        event.preventDefault();
        return evaluate(expr, data);
      });
    };
  });
  Object.keys(keyCodes).forEach(function(name) {
    var keyCode;
    keyCode = keyCodes[name];
    return bindTo.handlers['on' + name] = function(element, expr, data) {
      return element.on('keydown', function(event) {
        if (event.keyCode === keyCode) {
          event.preventDefault();
          return evaluate(expr, data);
        }
      });
    };
  });
  toggles.forEach(function(attr) {
    return bindTo.handlers[attr] = function(element, expr, data) {
      return bindExpression(element, expr, data, function(value) {
        return element.prop(attr, value);
      });
    };
  });
  attribs.forEach(function(attr) {
    return bindTo.handlers[attr] = function(element, expr, data) {
      return bindExpression(element, expr, data, function(value) {
        if (value != null) {
          return element.attr(attr, value);
        } else {
          return element.removeAttr(attr);
        }
      });
    };
  });
  Path.onchange = function() {
    return $(document).trigger('urlchange');
  };
  onRemove = function(element, cb) {
    return element.on('removeObserver', cb);
  };
  $.event.special.removeObserver = {
    remove: function(event) {
      return event.handler();
    }
  };
  varExpr = /[a-z$_\$][a-z_\$0-9\.-]*\s*:?|'|"/gi;
  normalizeExpression = function(expr, argNames) {
    var index, match, rewritten;
    argNames = argNames.concat(['this', 'window', 'true', 'false']);
    rewritten = '';
    index = 0;
    while ((match = varExpr.exec(expr))) {
      if (match) {
        match = match[0];
        rewritten += expr.slice(index, varExpr.lastIndex - match.length);
        if (match === "'" || match === '"') {
          index = expr.indexOf(match, varExpr.lastIndex) + 1;
          rewritten += expr.slice(varExpr.lastIndex - 1, index);
          varExpr.lastIndex = index;
        } else if (expr[varExpr.lastIndex - match.length - 1] === '.') {
          rewritten += match;
          index = varExpr.lastIndex;
        } else {
          if (match.slice(-1) !== ':' && argNames.indexOf(match.split('.').shift()) === -1) {
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
  bindExpression = function(element, expr, data, callback) {
    var observer, wrapper;
    wrapper = function(value, changes) {
      element.trigger('boundUpdate');
      return callback(value, changes);
    };
    observer = observers.add(createBoundExpr(expr, data), true, wrapper);
    onRemove(element, function() {
      return observer.close();
    });
    return observer;
  };
  notThis = function(name) {
    return name !== 'this';
  };
  getDataArgNames = function(data) {
    return Object.keys(data).filter(notThis).sort();
  };
  getDataArgs = function(data) {
    return Object.keys(data).filter(notThis).sort().map(function(key) {
      return data[key];
    });
  };
  exprCache = {};
  createFunction = function(expr, data, extras) {
    var argNames, e, func, functionBody;
    argNames = getDataArgNames(data);
    if (extras) {
      argNames = argNames.concat(extras);
    }
    expr = normalizeExpression(expr, argNames);
    func = exprCache[expr];
    if (func) {
      return func;
    }
    try {
      if (expr.indexOf('(') === -1) {
        functionBody = "try{return " + expr + "}catch(e){}";
      } else {
        functionBody = "return " + expr;
      }
      func = exprCache[expr] = Function.apply(null, __slice.call(argNames).concat([functionBody]));
    } catch (_error) {
      e = _error;
      throw 'Error evaluating code for binding: "' + expr + '" with error: ' + e.message;
    }
    return func;
  };
  createBoundExpr = function(expr, data, extras) {
    var args, func;
    func = createFunction(expr, data, extras);
    args = getDataArgs(data);
    return func.bind.apply(func, [data["this"]].concat(__slice.call(args)));
  };
  return evaluate = function(expr, data) {
    var args, func;
    func = createFunction(expr, data);
    args = getDataArgs(data);
    return func.apply(data["this"], args);
  };
})(jQuery);

var __hasProp = {}.hasOwnProperty;

(function(global) {
  var chip;
  chip = {
    templates: {},
    controllers: {},
    getTemplate: function(name) {
      return $(chip.templates[name]);
    },
    getController: function(name, options) {
      if (!chip.controllers.hasOwnProperty(name)) {
        throw 'Controller "' + name + '" does not exist';
      }
      return new chip.controllers[name](options);
    },
    controller: function(name, definition) {
      var controller, key, value;
      if (definition == null) {
        definition = {};
      }
      controller = (function() {
        function controller(data) {
          if (data == null) {
            data = {};
          }
          this.name = name;
          this.parent = data.parent;
          this.model = data.model;
          this.element = data.element;
        }

        return controller;

      })();
      for (key in definition) {
        if (!__hasProp.call(definition, key)) continue;
        value = definition[key];
        controller.prototype[key] = value;
      }
      return chip.controllers[name] = controller;
    },
    runRoute: function(name, parents) {
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
      controller = chip.getController(name);
      template = chip.getTemplate(name);
      container.data('controller', controller).html(template).bindTo(controller);
      if (controller != null) {
        if (typeof controller.setup === "function") {
          controller.setup();
        }
      }
      return syncView();
    },
    route: function(path, name, subroutes) {
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
    },
    listen: function() {
      Path.history.listen();
      if (Path.history.supported) {
        return $('body').on('click', 'a[href]', function(event) {
          event.preventDefault();
          return Path.history.pushState({}, "", $(this).attr("href"));
        });
      }
    }
  };
  if (typeof define === 'function' && define.amd) {
    return define('chip', chip);
  } else if (typeof exports === 'object' && typeof module === 'object') {
    global.chip = chip;
    return module.exports = chip;
  } else {
    return global.chip = chip;
  }
})(this);
