(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.chip = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = require('./src/chip');

},{"./src/chip":4}],2:[function(require,module,exports){
module.exports = App;
var Router = require('./router');
var EventEmitter = require('./events');
var createFragments = require('fragments-js').create;
var Controller = require('./controller');
var forEach = Array.prototype.forEach;
var slice = Array.prototype.slice;

// # Chip App

// An App represents an app or module that can have routes, controllers, and templates defined.
function App(name) {
  Controller.call(this);
  EventEmitter.call(this);
  this.fragments = createFragments();
  this.app = this;
  this.name = name;
  this.controllers = {};
  this.templates = {};
  this.router = new Router();
  this.routePath = [];
  this.rootElement = document.documentElement;
  this.sync = this.sync.bind(this);
  this.router.on('error', function(event) {
    this.dispatchEvent(new CustomEvent('routeError', { detail: event.detail }));
  }, this);

  require('./binders')(this);
}

App.prototype = Object.create(Controller.prototype);
App.prototype.constructor = App;


// Initializes templates and controllers from the entire page or the `root` element if provided.
App.prototype.initApp = function(root) {
  if (this.constructor !== App) {
    throw new Error('initApp must be called from the app instance, not a controller');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', this.initApp.bind(this, root));
    return;
  }

  if (this.inited) {
    return;
  }

  this.inited = true
  if (root) {
    this.rootElement = root;
  }

  forEach.call(this.rootElement.querySelectorAll('script[type="text/html"], template'), function(script) {
    var name = script.getAttribute('name') || script.id;
    if (name) {
      this.template(name, script);
      script.parentNode.removeChild(script);
    }
  }, this);

  this.appController = this.createController({ element: this.rootElement, name: 'application' });
};


// Templates
// ---------

// Registers a new template by name with the provided `content` string. If no `content` is given then returns a new
// instance of a defined template. This instance is a document fragment.
App.prototype.template = function(name, content) {
  if (arguments.length > 1) {
    this.templates[name] = this.fragments.createTemplate(content);
    return this;
  } else {
    return this.templates[name];
  }
};


App.prototype.component = function(elementName, templateName) {
  var fragments = this.fragments;
  fragments.registerElement(elementName, {
    priority: 200,
    compiled: function() {
      var elem = this.element;
      var defaultBinder = fragments.getAttributeBinder('__default__');

      slice.call(elem.attributes).forEach(function(attr) {
        // Convert non-binding attributes into local bindings
        var Binder = fragments.findBinder('attribute', attr.name, attr.value);
        if (!Binder || Binder === defaultBinder) {
          elem.setAttribute('{' + attr.name + '}');
          elem.removeAttributeNode(attr);
        }
      });
    }
  })
};


// Controllers
// ---------

// Defines a controller initialization function. Registers the `initFunction` function with `name`. The function will
// be called with an instance of a controller as its only parameter every time a controller is created with that
// name.
//
// If no `initFunction` is provided, returns the `initFunction` previously registered or if none has been registered
// a function on the global scope with the name `name + 'Controller'` (e.g. `function blogController(){}`).
//
// **Example:**
//```javascript
// app.controller('home', function(controller) {
//   // do something as soon as it is instantiated
//   MyAppAPI.loadUser(function(err, user) {
//     controller.user = user
//     controller.sync()
//   })
//
//   // provide a function for the view to call. E.g. <button on-click="logout">Logout</button>
//   controller.logout = function() {
//     MyAppAPI.logout(function(err) {
//       controller.user = null
//       controller.sync()
//     })
//   }
// })
// ```
App.prototype.controller = function(name, initFunction) {
  if (arguments.length > 1) {
    this.controllers[name] = initFunction;
    return this;
  } else {
    return this.controllers[name] || window[name + 'Controller'];
  }
};


// Creates a new controller. Sets `options.parent` as the parent controller to this one. Sets `options.properties`
// properties onto the controller before binding and initialization. Binds `options.element` to the controller which
// updates HTML as data updates. Initializes the new controller with the `options.name` function set in
// `app.controller()`. Sets the new controller as a passthrough controller if `options.passthrough` is true.
App.prototype.createController = function(options) {
  if (!options) {
    options = {};
  }

  var controller;
  var parent = options.parent || this;

  // If `options.parent` is provided, the new controller will extend it. Any data or methods on the parent controller
  // will be available to the child unless overwritten by the child. This uses the prototype chain, thus overwriting a
  // property only sets it on the child and does not change the parent. The child cannot set data on the parent, only
  // read it or call methods on it.
  controller = Object.create(parent);
  controller._parent = parent;
  Controller.call(controller);
  parent._children.push(controller);

  // If `properties` is provided, all properties from that object will be copied over to the controller before it is
  // initialized by its definition or bound to its element.
  if (options.properties) {
    Object.keys(options.properties).forEach(function(key) {
      controller[key] = options.properties[key];
    });
  }

  if (options.element) {
    // Clean up old controller if one exists
    if (options.element.controller) {
      options.element.unbind();
      options.element.controller.closeController();
    }

    // Assign element
    controller.element = options.element;
    controller.element.controller = controller;
  }

  // If `name` is supplied the controller definition by that name will be run to initialize this controller before the
  // bindings are set up.
  if (options.name) {
    var initFunction = this.controller(options.name);
    if (initFunction) {
      initFunction(controller);
    }
  }

  // Binds the element to the new controller
  if (options.element) {
    this.fragments.bindElement(options.element, controller);
  }

  return controller;
};

// Syncs the observers to propogate changes to the HTML, call callback after
App.prototype.sync = function(callback) {
  this.fragments.sync(callback);
  return this;
};


// Routing
// ------

// Registers a `callback` function to be called when the given param `name` is matched in a URL
App.prototype.param = function(name, callback) {
  if (typeof callback === 'function') {
    var origCallback = callback, app = this;

    // Set the params and query onto the app before running the callback
    callback = function(req, next) {
      app.params = req.params;
      app.query = req.query
      origCallback(app.appController, next);
    };
  }

  this.router.param(name, callback);
  return this;
};


// Create a route to be run when the given URL `path` is hit in the browser URL. The route `name` is used to load the
// template and controller by the same name. This template will be placed in the first element on page with a
// `bind-route` attribute.
App.prototype.route = function(path, handler, subroutes, runBefore) {
  var app = this.app;
  var callback;

  if (typeof handler === 'function' && handler.toString().match(/\(route\)/)) {
    subroutes = handler;
    handler = null;
  }

  if (!handler) {
    handler = path.replace(/^\//, '');
  }

  if (typeof handler === 'function') {
    // Subroutes not supported with callbacks, only with string handlers.
    callback = handler;

  } else if (typeof handler === 'string') {

    // If the handler is a string load the controller/template by that name.
    var name = handler;
    callback = function(req, next) {
      // Run a previous route first and allow it to then run this one again after
      if (runBefore && !runBefore.ran) {
        runBefore.ran = true;
        runBefore(req, callback);
        return;
      }

      if (runBefore) {
        delete runBefore.ran;
      }

      app.routePath.push(name);
      app.sync();
    };

    // Adds the subroutes and only calls this callback before they get called when they match.
    if (subroutes) {
      subroutes(function(subpath, handler, subroutes) {
        if (subpath === '/') {
          subpath = '';
        }
        app.route(path + subpath, handler, subroutes, callback);
      });
    }

  } else {
    throw new TypeError('route handler must be a string path or a function');
  }


  this.router.route(path, function(req, next) {
    var event = new CustomEvent('routeChanging', { cancelable: true });
    app.dispatchEvent(event);

    if (!event.defaultPrevented) {
      app.params = req.params;
      app.query = req.query;
      if (app.path === req.path) {
        req.isSamePath = true;
      }
      app.path = req.path;
      app.dispatchEvent(new CustomEvent('routeChange', { detail: req }));
      app.routePath.length = 0;
      callback(req, next);
      app.dispatchEvent(new CustomEvent('routeChanged', { detail: req }));
    }
  });

};


// Redirects to the provided URL
App.prototype.redirect = function(url, replace) {
  this.router.redirect(url, replace);
};


App.prototype.hasMatchingRoutes = function(url) {
  this.router.getRoutesMatchingPath(this.router.getUrlParts(url).path).length > 0;
};


// Listen to URL changes
App.prototype.listen = function(options) {
  if (!options) {
    options = {};
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', this.listen.bind(this, options));
    return this;
  }

  // Stop listening if requested
  if (options.stop) {
    if (this._routeHandler) {
      this.router.off('change', this._routeHandler);
    }

    if (this._clickHandler) {
      this.rootElement.removeEventListener('click', this._clickHandler);
    }

    return this.router.listen(options);
  }

  // Start listening
  var app = this;

  // Add handler for when the route changes
  this._routeHandler = function(event, path) {
    app.dispatchEvent(new CustomEvent('urlChange', { detail: path }));
  };

  // Add handler for clicking links
  this._clickHandler = function(event) {
    var anchor;
    if ( !(anchor = event.target.closest('a[href]')) ) {
      return;
    }

    if (event.defaultPrevented) {
      // if something else already handled this, we won't
      return;
    }

    var linkHost = anchor.host.replace(/:80$|:443$/, '');
    var url = anchor.getAttribute('href').replace(/^#/, '');

    if (linkHost && linkHost !== location.host) {
      return;
    }

    if (event.metaKey || event.ctrlKey || anchor.getAttribute('target')) {
      return;
    }

    if (options.dontHandle404s && !app.hasMatchingRoutes(url)) {
      return;
    }

    event.preventDefault();
    if (anchor.href === location.href + '#') {
      return;
    }

    if (!anchor.disabled) {
      app.redirect(url);
    }
  };

  this.router.on('change', this._routeHandler);
  this.rootElement.addEventListener('click', this._clickHandler);
  this.router.listen(options);

  return this;
};



// Polyfill matches
if (!Element.prototype.matches) {
  Element.prototype.matches =
    Element.prototype.matchesSelector ||
    Element.prototype.webkitMatchesSelector ||
    Element.prototype.mozMatchesSelector ||
    Element.prototype.msMatchesSelector ||
    Element.prototype.oMatchesSelector;
}

// Polyfill closest
if (!Element.prototype.closest) {
  Element.prototype.closest = function closest(selector) {
    var element = this;
    do {
      if (element.matches(selector)) {
        return element;
      }
    } while ((element = element.parentNode) && element.nodeType === Node.ELEMENT_NODE);
    return null;
  }
}

},{"./binders":3,"./controller":5,"./events":6,"./router":7,"fragments-js":8}],3:[function(require,module,exports){
module.exports = registerBinders;
var compile = require('fragments-js/src/compile');

function registerBinders(app) {
  var fragments = app.fragments;

  fragments.animateAttribute = '[animate]';

  // ## bind-partial
  // Adds a handler to set the contents of the element with the template and controller by that name. The expression may
  // be just the name of the template/controller, or it may be of the format `partialName`. Use the local-* binding
  // to pass data into a partial.

  // **Example:**
  // ```html
  // <div [partial]="userInfo" {user}="{{getUser()}}" [class]="{{ { administrator: user.isAdmin } }}"></div>
  //
  // <script name="userInfo" type="text/html">
  //   <strong>{{ user.name }}</strong>
  // </script>
  // ```
  // *Result:*
  // ```html
  // <div class="administrator">
  //   <span>Jacob</span>
  // </div>
  // ```
  var PartialBinder = fragments.registerAttribute('[partial]', {
    animated: true,
    priority: 40,

    compiled: function() {
      var parent = this.element.parentNode;
      var placeholder = document.createTextNode('');
      parent.insertBefore(placeholder, this.element);

      if (this.element.childNodes.length) {
        // Use the contents of this partial as the default when no route matches or allow to be inserted
        // within
        this.content = fragments.createTemplate(this.element.childNodes);
      }

      this.template = fragments.createTemplate(this.element);
      this.element = placeholder;
    },

    created: function() {
      var placeholder = this.element;
      this.container = this.template.createView();
      placeholder.parentNode.insertBefore(this.container, placeholder.nextSibling);
      this.element = placeholder.nextSibling;
      placeholder.remove();
    },

    bound: function() {
      this.context._partialContent = this.content;
      this.lastContext = this.context;
    },

    unbound: function() {
      delete this.lastContext._partialContent;
      this.lastContext = null;
    },

    add: function(view) {
      this.element.parentNode.insertBefore(view, this.element.nextSibling);
    },

    updated: function(value) {
      if (this.animate) {
        this.updatedAnimated(value);
      } else {
        this.updatedRegular(value);
      }
    },

    updatedRegular: function(value) {
      if (this.showing) {
        this.showing.dispose();
        this.container.unbind();
        this.controller.closeController();
        this.showing = null;
        this.controller = null;
      }

      var template = app.template(value);

      if (template) {
        this.controller = this.context.createController({ element: this.element, name: value });
        this.showing = template.createView();
        this.element.appendChild(this.showing);
        this.container.bind(this.controller);
        this.showing.bind(this.controller);
      }
    },

    updatedAnimated: function(value) {
      this.lastValue = value;
      if (this.animating) {
        return;
      }

      if (this.showing) {
        this.animating = true;
        this.animateOut(this.container, true, function() {
          this.animating = false;

          if (this.showing) {
            this.showing.dispose();
            this.container.unbind();
            this.controller.closeController();
            this.showing = null;
            this.controller = null;
          }

          if (this.context) {
            this.updatedAnimated(this.lastValue);
          }
        });
        return;
      }

      var template = app.template(value);

      if (template) {
        this.controller = this.context.createController({ element: this.element, name: value });
        this.showing = template.createView();
        this.element.appendChild(this.showing);
        this.container.bind(this.controller);
        this.showing.bind(this.controller);
        this.context.sync();

        this.animating = true;
        this.animateIn(this.container, function() {
          this.animating = false;
          // if the value changed while this was animating run it again
          if (this.lastValue !== value) {
            this.updatedAnimated(this.lastValue);
          }
        });
      }
    }
  });


  var Binding = require('fragments-js/src/binding');
  var _super = Binding.prototype;

  // ## {*}
  // You may pass data into [partial] or [repeat] using this wildcard binding. The attribute name portion within the
  // bracktes will be converted to camelCase and the value will be set locally. Examples:
  // `{link}="{{user.addressUrl}}"` will pass the value of `user.addressUrl` into the partial as `link`.
  // `{post-body}="{{user.description}}"` will pass the value of `user.description` into the partial as `postBody`.
  fragments.registerAttribute('{*}', {
    created: function() {
      this.twoWayObserver = this.observe(this.camelCase, this.sendUpdate, this);
    },
    // Bind this to the given context object
    bind: function(context) {
      if (this.childContext == context) {
        return;
      }

      // Bind against the parent context
      this.childContext = context;
      _super.bind.call(this, context._parent);
      this.twoWayObserver.bind(context, true);
    },
    unbound: function() {
      this.twoWayObserver.unbind();
    },
    sendUpdate: function(value) {
      if (!this.skipSend) {
        this.observer.set(value);
        this.skipSend = true;
        var _this = this;
        setTimeout(function() {
          _this.skipSend = false;
        });
      }
    },
    updated: function(value) {
      if (!this.skipSend && value !== undefined) {
        this.childContext[this.camelCase] = value;
        this.skipSend = true;
        var _this = this;
        setTimeout(function() {
          _this.skipSend = false;
        });
      }
    }
  });


  // ## bind-content
  // Allows an element with a `[partial]` attribute to include HTML within it that may be inserted somewhere
  // inside the partial's template.
  fragments.registerAttribute('[content]', {
    priority: 40,
    bound: function() {
      if (this.context._partialContent) {
        this.content = this.context._partialContent.createView();
        this.element.appendChild(this.content);
        this.content.bind(this.context);
      }
    },
    unbound: function() {
      if (this.content) {
        this.content.dispose();
      }
    }
  });



  fragments.registerAttribute('[route]', PartialBinder.extend({
    compiled: function() {
      PartialBinder.prototype.compiled.call(this);
      this.expression = 'routePath[routeDepth]';
    },

    bound: function() {
      // Delete any depth existing on the controller and set its depth to 1 more than its parent controllers.
      delete this.context.routeDepth;
      this.context.routeDepth = this.context.routeDepth == null ? 0 : this.context.routeDepth + 1;
    }
  }));



  fragments.registerAttribute('[controller]', PartialBinder.extend({
    priority: 30,

    compiled: function() {
      this.bindings = compile(fragments, this.element);
    },

    created: function() {
      this.bindings = this.bindings.map(function(binding) {
        return binding.cloneForView(this.element);
      }, this);
    },

    bound: function() {
      var context = this.context.createController({ element: this.element, name: this.observer.get() });
      this.childContext = context;
      this.bindings.forEach(function(binding) {
        binding.bind(context);
      });
    },

    unbound: function() {
      this.bindings.forEach(function(binding) {
        binding.unbind();
      });
      this.childContext.closeController();
      this.childContext = null;
    }
  }));




  fragments.registerAttribute('[debug]', fragments.unregisterAttribute('debug'));
  fragments.registerAttribute('[text]', fragments.unregisterAttribute('text'));
  fragments.registerAttribute('[html]', fragments.unregisterAttribute('html'));
  fragments.registerAttribute('[class:*]', fragments.unregisterAttribute('class-*'));

  var ValueBinder = fragments.registerAttribute('[value]', fragments.unregisterAttribute('value'));
  ValueBinder.prototype.eventsAttrName = '[value-events]';
  ValueBinder.prototype.fieldAttrName = '[value-field]';

  fragments.registerAttribute('(*)', fragments.unregisterAttribute('on-*'));
  fragments.registerAttribute('(enter)', fragments.unregisterAttribute('on-enter'));
  fragments.registerAttribute('(ctrl-enter)', fragments.unregisterAttribute('on-ctrl-enter'));
  fragments.registerAttribute('(esc)', fragments.unregisterAttribute('on-esc'));
  fragments.registerAttribute('(escape)', fragments.getAttributeBinder('(esc)'));

  fragments.registerAttribute('[*]', fragments.unregisterAttribute('*$'));
  /*
  fragments.registerAttribute('*?', fragments.unregisterAttribute('*?'));
  fragments.registerAttribute('checked?', fragments.getAttributeBinder('value'));
  */

  var IfBinding = fragments.registerAttribute('[if]', fragments.getAttributeBinder('if'));
  IfBinding.prototype.unlessAttrName = '[unless]';
  IfBinding.prototype.elseIfAttrName = '[else-if]';
  IfBinding.prototype.elseUnlessAttrName = '[else-unless]';
  IfBinding.prototype.elseAttrName = '[else]';
  fragments.registerAttribute('[unless]', IfBinding);

  fragments.registerAttribute('[repeat]', fragments.getAttributeBinder('repeat'));
}

},{"fragments-js/src/binding":10,"fragments-js/src/compile":11}],4:[function(require,module,exports){
var App = require('./app');

// # Chip

// > Chip.js 2.0.0
//
// > (c) 2013 Jacob Wright, TeamSnap
// Chip may be freely distributed under the MIT license.
// For all details and documentation:
// <https://github.com/teamsnap/chip/>

// Contents
// --------
// * [chip](chip.html) the namespace, creates apps, and registers bindings and filters
// * [App](app.html) represents an app that can have routes, controllers, and templates defined
// * [Controller](controller.html) is used in the binding to attach data and run actions
// * [Router](router.html) is used for handling URL rounting
// * [Default binders](binders.html) registers the default binders chip provides

// Create Chip App
// -------------
// Creates a new chip app
module.exports = chip;

function chip(name, root) {
  var app = new App(name);
  app.initApp(root);
  return app;
}

chip.App = App;
chip.EventEmitter = require('./events');
chip.Controller = require('./controller');
chip.Router = require('./router');

},{"./app":2,"./controller":5,"./events":6,"./router":7}],5:[function(require,module,exports){
module.exports = Controller;
var Observer = require('fragments-js/src/observer');
var EventEmitter = require('./events');

// # Chip Controller

// A Controller is the object to which HTML elements are bound.
function Controller() {
  // Each controller needs unique instances of these properties. If we don't set them here they will be inherited from
  // the prototype chain and cause issues.
  this._observers = [];
  this._children = [];
  this._syncListeners = [];
  this._closed = false;
}

Controller.prototype = Object.create(EventEmitter.prototype);
Controller.prototype.constructor = Controller;


// Watches an expression for changes. Calls the `callback` immediately with the initial value and then every time the
// value in the expression changes. An expression can be as simple as `name` or as complex as `user.firstName + ' ' +
// user.lastName + ' - ' + user.getPostfix()`
Controller.prototype.watch = function(expr, skipUpdate, callback) {
  if (Array.isArray(expr)) {
    if (typeof skipUpdate === 'function') {
      callback = skipUpdate;
      skipUpdate = false;
    }

    var origCallback = callback;
    var calledThisRound = false;

    // with multiple observers, only call the original callback once on changes
    callback = function() {
      if (calledThisRound) {
        return;
      }

      calledThisRound = true;
      setTimeout(function() {
        calledThisRound = false;
      });

      var values = observers.map(function(observer) {
        return observer.get();
      });
      origCallback.apply(null, values);
    };


    var observers = expr.map(function(expr) {
      this.watch(expr, true, callback);
    }, this);

    if (!skipUpdate) {
      callback();
    }

    return observers;
  } else {
    var observer = new Observer(expr, callback, this);
    observer.bind(this, skipUpdate);

    // Store the observers with the controller so when it is closed we can clean up all observers as well
    this._observers.push(observer);
    return observer;
  }
}

// Stop watching an expression for changes.
Controller.prototype.unwatch = function(expr, callback) {
  return this._observers.some(function(observer, index) {
    if (observer.expr === expr && observer.callback === callback) {
      Observer.remove(observer);
      this._observers.splice(index, 1);
      return true;
    }
  }, this);
};

// Evaluates an expression immediately, returning the result
Controller.prototype.eval = function(expr, args) {
  if (args) {
    options = { args: Object.keys(args) };
    values = options.args.map(function(key) { return args[key]; });
  }
  return Observer.expression.get(expr, options).apply(this, values);
};


// Evaluates an expression immediately as a setter, setting `value` to the expression running through filters.
Controller.prototype.evalSetter = function(expr, value) {
  var context = this.hasOwnProperty('_origContext_') ? this._origContext_ : this;
  expression.getSetter(expr).call(context, value);
};


// Clones the object at the given property name for processing forms
Controller.prototype.cloneValue = function(property) {
  Observer.expression.diff.clone(this[property]);
};


// Removes and closes all observers for garbage-collection
Controller.prototype.closeController = function() {
  if (this._closed) {
    return;
  }

  this._closed = true;

  this._children.forEach(function(child) {
    child._parent = null;
    child.closeController();
  });

  if (this._parent) {
    var index = this._parent._children.indexOf(this);
    if (index !== -1) {
      this._parent._children.splice(index, 1);
    }
    this._parent = null
  }

  if (this.hasOwnProperty('beforeClose')) {
    this.beforeClose();
  }

  this._syncListeners.forEach(function(listener) {
    Observer.removeOnSync(listener);
  });
  this._syncListeners.length = 0;

  this._observers.forEach(function(observer) {
    Observer.remove(observer);
  });
  this._observers.length = 0;

  if (this.hasOwnProperty('onClose')) {
    this.onClose();
  }
};


// Syncs the observers to propogate changes to the HTML, call callback after
Controller.prototype.sync = function(callback) {
  Observer.sync(callback);
  return this;
};


// Runs the sync on the next tick, call callback after
Controller.prototype.syncLater = function(callback) {
  Observer.syncLater(callback)
  return this;
};


// Syncs the observers to propogate changes to the HTML for this controller only
Controller.prototype.syncThis = function() {
  this._observers.forEach(function(observer) {
    observer.sync();
  });
  this._children.forEach(function(child) {
    child.syncThis();
  });
  return this;
};


// call callback after the current sync
Controller.prototype.afterSync = function(callback) {
  Observer.afterSync(callback);
  return this;
};


// Runs the listener on every sync, stops once the controller is closed
Controller.prototype.onSync = function(listener) {
  this._syncListeners.push(listener);
  Observer.onSync(listener);
  return this;
}


// Removes a sync listener
Controller.prototype.removeOnSync = function(listener) {
  var index = this._syncListeners.indexOf(listener);
  if (index !== -1) {
    this._syncListeners.splice(index, 1);
  }
  Observer.removeOnSync(listener);
  return this;
};

},{"./events":6,"fragments-js/src/observer":15}],6:[function(require,module,exports){
module.exports = EventEmitter;

// A simple event emitter to provide an eventing system.
function EventEmitter(emitter) {
  if (this instanceof EventEmitter) {
    emitter = this;
  }

  var node = document.createTextNode('');

  // Add event listener
  emitter.on = emitter.addEventListener = node.addEventListener.bind(node);

  // Removes event listener
  emitter.off = emitter.removeEventListener = node.removeEventListener.bind(node);

  // Add event listener to only get called once, returns wrapped method for removing if needed
  emitter.one = function one(type, listener) {
    function one(event) {
      emitter.off(type, one);
      if (typeof listener === 'function') {
        listener.call(event);
      }
    }
    emitter.on(type, one);
    return one;
  }

  // Dispatch event and trigger listeners
  emitter.dispatchEvent = function dispatchEvent(event) {
    Object.defineProperty(event, 'target', { value: emitter });
    return node.dispatchEvent(event);
  }
}

},{}],7:[function(require,module,exports){
module.exports = Router;
Router.Route = Route;
var EventEmitter = require('./events');

// # Chip Routing

// Work inspired by and in some cases based off of work done for Express.js (https://github.com/visionmedia/express)
// Events: error, change
function Router() {
  EventEmitter.call(this);
  this.routes = [];
  this.params = {};
  this.paramsExp = {};
  this.prefix = '';
}

Router.prototype = Object.create(EventEmitter.prototype);


// Registers a `callback` function to be called when the given param `name` is matched in a URL
Router.prototype.param = function(name, callback) {
  if (typeof callback === 'function') {
    (this.params[name] || (this.params[name] = [])).push(callback);
  } else if (callback instanceof RegExp) {
    this.paramsExp[name] = callback;
  } else {
    throw new TypeError('param must have a callback of type "function" or RegExp. Got ' + callback + '.');
  }
  return this;
};


// Registers a `callback` function to be called when the given path matches a URL. The callback receives two
// arguments, `req`, and `next`, where `req` represents the request and has the properties, `url`, `path`, `params`
// and `query`. `req.params` is an object with the parameters from the path (e.g. /:username/* would make a params
// object with two properties, `username` and `*`). `req.query` is an object with key-value pairs from the query
// portion of the URL.
Router.prototype.route = function(path, callback) {
  if (typeof callback !== 'function') {
    throw new TypeError('route must have a callback of type "function". Got ' + callback + '.');
  }

  if (typeof path === 'string') {
    path = '/' + path;
    path = path.replace(/\/{2,}/g, '/');
  }
  this.routes.push(new Route(path, callback));
  return this;
};


Router.prototype.redirect = function(url, replace) {
  if (url.charAt(0) === '.' || url.split('//').length > 1) {
    var pathParts = document.createElement('a');
    pathParts.href = url;
    url = pathname(pathParts) + pathParts.search;
  } else {
    url = this.prefix + url;
  }

  if (this.currentUrl === url) {
    return;
  }

  // Redirects if the url isn't at this page.
  if (!this.hashOnly && this.root && url.indexOf(this.root) !== 0) {
    location.href = url;
    return;
  }

  var notFound = false;
  function errHandler(event) {
    if (event.detail === 'notFound') {
      notFound = true;
    }
  }
  this.on('error', errHandler);

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
    location.hash = (url === '/' ? '' : '#' + url);
  }

  this.off('error', errHandler);
  return !notFound;
};


Router.prototype.listen = function(options) {
  if (!options) {
    options = {};
  }
  if (options.stop) {
    if (this._handleChange) {
      window.removeEventListener('popstate', this._handleChange);
      window.removeEventListener('hashChange', this._handleChange);
    }
    return this;
  }

  if (options.root != null) this.root = options.root;
  if (options.prefix != null) this.prefix = options.prefix;
  if (options.hashOnly != null) this.hashOnly = options.hashOnly;
  this.usePushState = !this.hashOnly && window.history && window.history.pushState && true;
  if (this.root == null && !this.usePushState) this.hashOnly = true;
  if (this.hasOnly) this.prefix = '';
  var eventName, getUrl;

  this._handleChange = function() {
    var url = getUrl();
    if (this.currentUrl === url) {
      return;
    }
    this.currentUrl = url;
    this.dispatch(url);
  }.bind(this);


  if (this.usePushState) {
    // Fix the URL if linked with a hash
    if (location.hash) {
      url = location.pathname.replace(/\/$/, '') + location.hash.replace(/^#?\/?/, '/');
      history.replaceState({}, '', url);
    }

    eventName = 'popstate';
    getUrl = function() {
      return location.pathname + location.search;
    };
  } else {

    eventName = 'hashchange';
    getUrl = function() {
      return location.hash.replace(/^#\/?/, '/') || '/';
    };
  }

  window.addEventListener(eventName, this._handleChange);

  this._handleChange();
  return this;
};


var urlParts = document.createElement('a');

Router.prototype.getUrlParts = function(url) {
  urlParts.href = url;
  var path = pathname(urlParts);
  if (path.indexOf(this.prefix) !== 0) {
    return null;
  }
  path = path.replace(this.prefix, '');
  if (path.charAt(0) !== '/') {
    path = '/' + path;
  }
  return { path: path, query: urlParts.search };
};


Router.prototype.getRoutesMatchingPath = function(path) {
  if (path == null) {
    return [];
  }
  var paramsExp = this.paramsExp;

  return this.routes.filter(function(route) {
    if (!route.match(path)) {
      return false;
    }

    return Object.keys(route.params).every(function(key) {
      var value = route.params[key];
      return !paramsExp.hasOwnProperty(key) || paramsExp[key].text(value);
    });
  });
};



// Dispatches all callbacks which match the `url`. `url` should be the full pathname of the location and should not
// be used by your application. Use `redirect()` instead.
Router.prototype.dispatch = function(url) {
  var urlParts = this.getUrlParts(url);
  if (!urlParts) {
    return;
  }
  var path = urlParts.path;
  var req = { url: url, path: path, query: parseQuery(urlParts.query) };
  this.dispatchEvent(new CustomEvent('change', { detail: path }));

  var routes = this.getRoutesMatchingPath(path);
  var callbacks = [];
  var params = this.params;

  // Add all the callbacks for this URL (all matching routes and the params they're dependent on)
  routes.forEach(function(route) {
    // set the params on the req object first
    callbacks.push(function(req, next) {
      req.params = route.params;
      next();
    });

    Object.keys(route.params).forEach(function(key) {
      var paramCallbacks = this.params[key];
      if (paramCallbacks) {
        callbacks.push.apply(callbacks, paramCallbacks);
      }
    }, this);

    callbacks.push(route.callback);
  }, this);

  // Calls each callback one by one until either there is an error or we call all of them.
  var next = function(err) {
    if (err) {
      this.dispatchEvent(new CustomEvent('error', { detail: err }));
      return;
    }

    if (!callbacks.length) {
      return next('notFound');
    }

    callback = callbacks.shift();
    callback(req, next);
  }.bind(this);

  // Start running the callbacks, one by one
  if (callbacks.length === 0) {
    next('notFound');
  } else {
    next();
  }

  return this;
};


// Defines a central routing object which handles all URL changes and routes.
function Route(path, callback) {
  this.path = path;
  this.callback = callback;
  this.keys = [];
  this.expr = parsePath(path, this.keys);
}


// Determines whether route matches path
Route.prototype.match = function(path) {
  var match = this.expr.exec(path);
  if (!match) {
    return false;
  }
  this.params = {};

  for (var i = 1; i < match.length; i++) {
    var key = this.keys[i - 1];
    var value = match[i];

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


// Normalizes the given path string, returning a regular expression.
//
// An empty array should be passed, which will contain the placeholder key names. For example `"/user/:id"` will then
// contain `["id"]`.
function parsePath(path, keys) {
  if (path instanceof RegExp) {
    return path;
  }

  if (Array.isArray(path)) {
    path = '(' + path.join('|') + ')';
  }

  path = path
    .concat('/?')
    .replace(/\/\(/g, '(?:/')
    .replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?(\*)?/g, function(_, slash, format, key, capture, optional, star) {
      keys.push(key);
      slash = slash || '';
      var expr = '';
      if (!optional) expr += slash;
      expr += '(?:';
      if (optional) expr += slash;
      expr += format || '';
      expr += capture || (format && '([^/.]+?)' || '([^/]+?)') + ')';
      expr += optional || '';
      if (star) expr += '(/*)?';
      return expr;
    })
    .replace(/([\/.])/g, '\\$1')
    .replace(/\*/g, '(.*)');
  return new RegExp('^' + path + '$', 'i');
}


// Parses a location.search string into an object with key-value pairs.
function parseQuery(search) {
  var query = {};
  if (search === '') {
    return query;
  }

  search.replace(/^\?/, '').split('&').forEach(function(keyValue) {
    var parts = keyValue.split('=');
    var key = parts[0];
    var value = parts[1];
    query[decodeURIComponent(key)] = decodeURIComponent(value);
  });

  return query;
}

// Fix IE's missing slash prefix
function pathname(anchor) {
  var path = anchor.pathname;
  if (path.charAt(0) !== '/') {
    path = '/' + path;
  }
  return path;
}

},{"./events":6}],8:[function(require,module,exports){
var Fragments = require('./src/fragments');
var Observer = require('./src/observer');

function create() {
  var fragments = new Fragments(Observer);
  fragments.expression = Observer.expression;
  fragments.sync = Observer.sync;
  return fragments;
}

// Create an instance of fragments with the default observer
module.exports = create();
module.exports.create = create;

},{"./src/fragments":12,"./src/observer":15}],9:[function(require,module,exports){
module.exports = AnimatedBinding;
var animation = require('./util/animation');
var Binding = require('./binding');
var _super = Binding.prototype;

/**
 * Bindings which extend AnimatedBinding have the ability to animate elements that are added to the DOM and removed from
 * the DOM. This allows menus to slide open and closed, elements to fade in or drop down, and repeated items to appear
 * to move (if you get creative enough).
 *
 * The following 5 methods are helper DOM methods that allow registered bindings to work with CSS transitions for
 * animating elements. If an element has the `animate` attribute or a matching JavaScript method, these helper methods
 * will set a class on the node to trigger the animation and/or call the JavaScript methods to handle it.
 *
 * An animation may be either a CSS transition, a CSS animation, or a set of JavaScript methods that will be called.
 *
 * If using CSS, classes are added and removed from the element. When an element is inserted it will receive the `will-
 * animate-in` class before being added to the DOM, then it will receive the `animate-in` class immediately after being
 * added to the DOM, then both clases will be removed after the animation is complete. When an element is being removed
 * from the DOM it will receive the `will-animate-out` and `animate-out` classes, then the classes will be removed once
 * the animation is complete.
 *
 * If using JavaScript, methods must be defined  to animate the element there are 3 supported methods which can b
 *
 * TODO cache by class-name (Angular)? Only support javascript-style (Ember)? Add a `will-animate-in` and
 * `did-animate-in` etc.?
 * IF has any classes, add the `will-animate-in|out` and get computed duration. If none, return. Cache.
 * RULE is use unique class to define an animation. Or attribute `animate="fade"` will add the class?
 * `.fade.will-animate-in`, `.fade.animate-in`, `.fade.will-animate-out`, `.fade.animate-out`
 *
 * Events will be triggered on the elements named the same as the class names (e.g. `animate-in`) which may be listened
 * to in order to cancel an animation or respond to it.
 *
 * If the node has methods `animateIn(done)`, `animateOut(done)`, `animateMoveIn(done)`, or `animateMoveOut(done)`
 * defined on them then the helpers will allow an animation in JavaScript to be run and wait for the `done` function to
 * be called to know when the animation is complete.
 *
 * Be sure to actually have an animation defined for elements with the `animate` class/attribute because the helpers use
 * the `transitionend` and `animationend` events to know when the animation is finished, and if there is no animation
 * these events will never be triggered and the operation will never complete.
 */
function AnimatedBinding(properties) {
  var element = properties.node;
  var animate = element.getAttribute(properties.fragments.animateAttribute);
  var fragments = properties.fragments;

  if (animate !== null) {
    if (element.nodeName === 'TEMPLATE' || element.nodeName === 'SCRIPT') {
      throw new Error('Cannot animate multiple nodes in a template or script. Remove the [animate] attribute.');
    }

    setTimeout(function() {
      // Allow multiple bindings to animate by not removing until they have all been created
      element.removeAttribute(properties.fragments.animateAttribute);
    });

    this.animate = true;

    if (fragments.isBound('attribute', animate)) {
      // javascript animation
      this.animateExpression = fragments.codifyExpression('attribute', animate);
    } else {
      if (animate[0] === '.') {
        // class animation
        this.animateClassName = animate.slice(1);
      } else if (animate) {
        // registered animation
        var animateObject = fragments.getAnimation(animate);
        if (typeof animateObject === 'function') animateObject = new animateObject(this);
        this.animateObject = animateObject;
      }
    }
  }

  Binding.call(this, properties);
}


Binding.extend(AnimatedBinding, {
  init: function() {
    _super.init.call(this);

    if (this.animateExpression) {
      this.animateObserver = new this.Observer(this.animateExpression, function(value) {
        this.animateObject = value;
      }, this);
    }
  },

  bind: function(context) {
    if (this.context == context) {
      return;
    }
    _super.bind.call(this, context);

    if (this.animateObserver) {
      this.animateObserver.bind(context);
    }
  },

  unbind: function() {
    if (this.context === null) {
      return;
    }
    _super.unbind.call(this);

    if (this.animateObserver) {
      this.animateObserver.unbind();
    }
  },

  /**
   * Helper method to remove a node from the DOM, allowing for animations to occur. `callback` will be called when
   * finished.
   */
  animateOut: function(node, dontDispose, callback) {
    if (typeof dontDispose === 'function') {
      callback = dontDispose;
      dontDispose = false;
    }
    if (node.firstViewNode) node = node.firstViewNode;

    this.animateNode('out', node, function() {
      if (!dontDispose) {
        node.view.dispose();
      }
      if (callback) callback.call(this);
    });
  },

  /**
   * Helper method to insert a node in the DOM before another node, allowing for animations to occur. `callback` will
   * be called when finished. If `before` is not provided then the animation will be run without inserting the node.
   */
  animateIn: function(node, before, callback) {
    if (typeof before === 'function') {
      callback = before;
      before = null;
    }
    if (node.firstViewNode) node = node.firstViewNode;
    if (before && before.firstViewNode) before = before.firstViewNode;

    if (before) {
      before.parentNode.insertBefore(node, before);
    }
    this.animateNode('in', node, callback, this);
  },

  /**
   * Allow an element to use CSS3 transitions or animations to animate in or out of the page.
   */
  animateNode: function(direction, node, callback) {
    var animateObject, className, name, willName, didName, _this = this;

    if (this.animateObject && typeof this.animateObject === 'object') {
      animateObject = this.animateObject;
    } else if (this.animateClassName) {
      className = this.animateClassName;
    } else if (typeof this.animateObject === 'string') {
      className = this.animateObject;
    }

    if (animateObject) {
      var dir = direction === 'in' ? 'In' : 'Out';
      name = 'animate' + dir;
      willName = 'willAnimate' + dir;
      didName = 'didAnimate' + dir;

      animation.makeElementAnimatable(node);

      if (animateObject[willName]) {
        animateObject[willName](node);
        // trigger reflow
        node.offsetWidth = node.offsetWidth;
      }

      if (animateObject[name]) {
        animateObject[name](node, function() {
          if (animateObject[didName]) animateObject[didName](node);
          if (callback) callback.call(_this);
        });
      }
    } else {
      name = 'animate-' + direction;
      willName = 'will-animate-' + direction;
      if (className) node.classList.add(className);

      node.classList.add(willName);

      // trigger reflow
      node.offsetWidth = node.offsetWidth;
      node.classList.remove(willName);
      node.classList.add(name);

      var duration = getDuration.call(this, node, direction);
      function whenDone() {
        node.classList.remove(name);
        if (className) node.classList.remove(className);
        if (callback) callback.call(_this);
      }

      if (duration) {
        setTimeout(whenDone, duration);
      } else {
        whenDone();
      }
    }
  }
});


var transitionDurationName = 'transitionDuration';
var transitionDelayName = 'transitionDelay';
var animationDurationName = 'animationDuration';
var animationDelayName = 'animationDelay';
var style = document.documentElement.style;
if (style.transitionDuration === undefined && style.webkitTransitionDuration !== undefined) {
  transitionDurationName = 'webkitTransitionDuration';
  transitionDelayName = 'webkitTransitionDelay';
}
if (style.animationDuration === undefined && style.webkitAnimationDuration !== undefined) {
  animationDurationName = 'webkitAnimationDuration';
  animationDelayName = 'webkitAnimationDelay';
}


function getDuration(node, direction) {
  var milliseconds = this.clonedFrom['__animationDuration' + direction];
  if (!milliseconds) {
    // Recalc if node was out of DOM before and had 0 duration, assume there is always SOME duration.
    var styles = window.getComputedStyle(node);
    var seconds = Math.max(parseFloat(styles[transitionDurationName] || 0) +
                           parseFloat(styles[transitionDelayName] || 0),
                           parseFloat(styles[animationDurationName] || 0) +
                           parseFloat(styles[animationDelayName] || 0));
    milliseconds = seconds * 1000 || 0;
    this.clonedFrom.__animationDuration__ = milliseconds;
  }
  return milliseconds;
}

},{"./binding":10,"./util/animation":21}],10:[function(require,module,exports){
module.exports = Binding;
var extend = require('./util/extend');

/**
 * A binding is a link between an element and some data. Subclasses of Binding called binders define what a binding does
 * with that link. Instances of these binders are created as bindings on templates. When a view is stamped out from the
 * template the binding is "cloned" (it is actually extended for performance) and the `element`/`node` property is
 * updated to the matching element in the view.
 *
 * ### Properties
 *  * element: The element (or text node) this binding is bound to
 *  * node: Alias of element, since bindings may apply to text nodes this is more accurate
 *  * name: The attribute or element name (does not apply to matched text nodes)
 *  * match: The matched part of the name for wildcard attributes (e.g. `on-*` matching against `on-click` would have a
 *    match property equalling `click`). Use `this.camelCase` to get the match proerty camelCased.
 *  * expression: The expression this binding will use for its updates (does not apply to matched elements)
 *  * context: The context the exression operates within when bound
 */
function Binding(properties) {
  if (!properties.node || !properties.view) {
    throw new TypeError('A binding must receive a node and a view');
  }

  // element and node are aliases
  this._elementPath = initNodePath(properties.node, properties.view);
  this.node = properties.node;
  this.element = properties.node;
  this.name = properties.name;
  this.match = properties.match;
  this.expression = properties.expression;
  this.fragments = properties.fragments;
  this.context = null;
}

extend(Binding, {
  /**
   * Default priority binders may override.
   */
  priority: 0,


  /**
   * Initialize a cloned binding. This happens after a compiled binding on a template is cloned for a view.
   */
  init: function() {
    if (this.expression) {
      // An observer to observe value changes to the expression within a context
      this.observer = new this.Observer(this.expression, this.updated, this);
    }
    this.created();
  },

  /**
   * Clone this binding for a view. The element/node will be updated and the binding will be inited.
   */
  cloneForView: function(view) {
    if (!view) {
      throw new TypeError('A binding must clone against a view');
    }

    var node = view;
    this._elementPath.forEach(function(index) {
      node = node.childNodes[index];
    });

    var binding = Object.create(this);
    binding.clonedFrom = this;
    binding.element = node;
    binding.node = node;
    binding.init();
    return binding;
  },


  // Bind this to the given context object
  bind: function(context) {
    if (this.context == context) {
      return;
    }

    this.context = context;
    if (this.observer) {
      if (this.updated !== Binding.prototype.updated) {
        this.observer.forceUpdateNextSync = true;
        this.observer.bind(context);
      } else {
        // set the context but don't actually bind it since `updated` is a no-op
        this.observer.context = context;
      }
    }
    this.bound();
  },


  // Unbind this from its context
  unbind: function() {
    if (this.context === null) {
      return;
    }

    this.context = null;
    if (this.observer) this.observer.unbind();
    this.unbound();
  },


  // The function to run when the binding's element is compiled within a template
  compiled: function() {},

  // The function to run when the binding's element is created
  created: function() {},

  // The function to run when the expression's value changes
  updated: function() {},

  // The function to run when the binding is bound
  bound: function() {},

  // The function to run when the binding is unbound
  unbound: function() {},

  // Helper methods

  get camelCase() {
    return (this.match || this.name || '').replace(/-+(\w)/g, function(_, char) {
      return char.toUpperCase();
    });
  },

  observe: function(expression, callback, callbackContext) {
    return new this.Observer(expression, callback, callbackContext || this);
  }
});




var indexOf = Array.prototype.indexOf;

// Creates an array of indexes to help find the same element within a cloned view
function initNodePath(node, view) {
  var path = [];
  while (node !== view) {
    var parent = node.parentNode;
    path.unshift(indexOf.call(parent.childNodes, node));
    node = parent;
  }
  return path;
}

},{"./util/extend":22}],11:[function(require,module,exports){
var slice = Array.prototype.slice;
module.exports = compile;


// Walks the template DOM replacing any bindings and caching bindings onto the template object.
function compile(fragments, template) {
  var walker = document.createTreeWalker(template, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  var bindings = [], currentNode, parentNode, previousNode;

  // Reset first node to ensure it isn't a fragment
  walker.nextNode();
  walker.previousNode();

  // find bindings for each node
  do {
    currentNode = walker.currentNode;
    parentNode = currentNode.parentNode;
    bindings.push.apply(bindings, getBindingsForNode(fragments, currentNode, template));

    if (currentNode.parentNode !== parentNode) {
      // currentNode was removed and made a template
      walker.currentNode = previousNode || walker.root;
    } else {
      previousNode = currentNode;
    }
  } while (walker.nextNode());

  return bindings;
}



// Find all the bindings on a given node (text nodes will only ever have one binding).
function getBindingsForNode(fragments, node, view) {
  var bindings = [];
  var Binder, binding, expr, bound, match, attr, i;

  if (node.nodeType === Node.TEXT_NODE) {
    splitTextNode(fragments, node);

    // Find any binding for the text node
    if (fragments.isBound('text', node.nodeValue)) {
      expr = fragments.codifyExpression('text', node.nodeValue);
      node.nodeValue = '';
      Binder = fragments.findBinder('text', expr);
      binding = new Binder({ node: node, view: view, expression: expr, fragments: fragments });
      if (binding.compiled() !== false) {
        bindings.push(binding);
      }
    }
  } else {
    // If the element is removed from the DOM, stop. Check by looking at its parentNode
    var parent = node.parentNode;
    var DefaultBinder = fragments.getAttributeBinder('__default__');

    // Find any binding for the element
    Binder = fragments.findBinder('element', node.tagName.toLowerCase());
    if (Binder) {
      binding = new Binder({ node: node, view: view, fragments: fragments });
      if (binding.compiled() !== false) {
        bindings.push(binding);
      }
    }

    // If removed, made a template, don't continue processing
    if (node.parentNode !== parent) {
      return;
    }

    // Find and add any attribute bindings on an element. These can be attributes whose name matches a binding, or
    // they can be attributes which have a binding in the value such as `href="/post/{{ post.id }}"`.
    var bound = [];
    var attributes = slice.call(node.attributes);
    for (i = 0, l = attributes.length; i < l; i++) {
      var attr = attributes[i];
      var Binder = fragments.findBinder('attribute', attr.name, attr.value);
      if (Binder) {
        bound.push([ Binder, attr ]);
      }
    }

    // Make sure to create and process them in the correct priority order so if a binding create a template from the
    // node it doesn't process the others.
    bound.sort(sortAttributes);

    for (i = 0; i < bound.length; i++) {
      var Binder = bound[i][0];
      var attr = bound[i][1];
      var name = attr.name;
      var value = attr.value;
      if (Binder.expr) {
        match = name.match(Binder.expr);
        if (match) match = match[1];
      } else {
        match = null;
      }

      try {
        node.removeAttributeNode(attr);
      } catch(e) {}

      binding = new Binder({
        node: node,
        view: view,
        name: name,
        match: match,
        expression: value ? fragments.codifyExpression('attribute', value) : null,
        fragments: fragments
      });

      if (binding.compiled() !== false) {
        bindings.push(binding);
      } else if (Binder !== DefaultBinder && fragments.isBound('attribute', value)) {
        // Revert to default if this binding doesn't take
        bound.push([ DefaultBinder, attr ]);
      }

      if (node.parentNode !== parent) {
        break;
      }
    }
  }

  return bindings;
}


// Splits text nodes with expressions in them so they can be bound individually, has parentNode passed in since it may
// be a document fragment which appears as null on node.parentNode.
function splitTextNode(fragments, node) {
  if (!node.processed) {
    node.processed = true;
    var regex = fragments.binders.text._expr;
    var content = node.nodeValue;
    if (content.match(regex)) {
      var match, lastIndex = 0, parts = [], fragment = document.createDocumentFragment();
      while (match = regex.exec(content)) {
        parts.push(content.slice(lastIndex, regex.lastIndex - match[0].length));
        parts.push(match[0]);
        lastIndex = regex.lastIndex;
      }
      parts.push(content.slice(lastIndex));
      parts = parts.filter(notEmpty);

      node.nodeValue = parts[0];
      for (var i = 1; i < parts.length; i++) {
        var newTextNode = document.createTextNode(parts[i]);
        newTextNode.processed = true;
        fragment.appendChild(newTextNode);
      }
      node.parentNode.insertBefore(fragment, node.nextSibling);
    }
  }
}


function sortAttributes(a, b) {
  return b[0].prototype.priority - a[0].prototype.priority;
}

function notEmpty(value) {
  return Boolean(value);
}

},{}],12:[function(require,module,exports){
module.exports = Fragments;
var extend = require('./util/extend');
var toFragment = require('./util/toFragment');
var animation = require('./util/animation');
var Template = require('./template');
var View = require('./view');
var Binding = require('./binding');
var AnimatedBinding = require('./animatedBinding');
var compile = require('./compile');
var registerDefaultBinders = require('./registered/binders');
var registerDefaultFormatters = require('./registered/formatters');
var registerDefaultAnimations = require('./registered/animations');

/**
 * A Fragments object serves as a registry for binders and formatters
 * @param {[type]} ObserverClass [description]
 */
function Fragments(ObserverClass) {
  if (!ObserverClass) {
    throw new TypeError('Must provide an Observer class to Fragments.');
  }

  this.Observer = ObserverClass;
  this.formatters = ObserverClass.formatters = {};
  this.animations = {};
  this.animateAttribute = 'animate';

  this.binders = {
    element: { _wildcards: [] },
    attribute: { _wildcards: [], _expr: /{{\s*(.*?)\s*}}/g },
    text: { _wildcards: [], _expr: /{{\s*(.*?)\s*}}/g }
  };

  // Text binder for text nodes with expressions in them
  this.registerText('__default__', function(value) {
    this.element.textContent = (value != null) ? value : '';
  });

  // Catchall attribute binder for regular attributes with expressions in them
  this.registerAttribute('__default__', function(value) {
    if (value != null) {
      this.element.setAttribute(this.name, value);
    } else {
      this.element.removeAttribute(this.name);
    }
  });

  registerDefaultBinders(this);
  registerDefaultFormatters(this);
  registerDefaultAnimations(this);
}

Fragments.prototype = {

  /**
   * Takes an HTML string, an element, an array of elements, or a document fragment, and compiles it into a template.
   * Instances may then be created and bound to a given context.
   * @param {String|NodeList|HTMLCollection|HTMLTemplateElement|HTMLScriptElement|Node} html A Template can be created
   * from many different types of objects. Any of these will be converted into a document fragment for the template to
   * clone. Nodes and elements passed in will be removed from the DOM.
   */
  createTemplate: function(html) {
    var fragment = toFragment(html);
    if (fragment.childNodes.length === 0) {
      throw new Error('Cannot create a template from ' + html);
    }
    var template = extend.make(Template, fragment);
    template.bindings = compile(this, template);
    return template;
  },


  /**
   * Compiles bindings on an element.
   */
  compileElement: function(element) {
    if (!element.bindings) {
      element.bindings = compile(this, element);
      extend.make(View, element, element);
    }

    return element;
  },


  /**
   * Compiles and binds an element which was not created from a template. Mostly only used for binding the document's
   * html element.
   */
  bindElement: function(element, context) {
    this.compileElement(element);

    if (context) {
      element.bind(context);
    }

    return element;
  },


  /**
   * Registers a binder for a given type and name. A binder is a subclass of Binding and is used to create bindings on
   * an element or text node whose tag name, attribute name, or expression contents match this binder's name/expression.
   *
   * ### Parameters
   *
   *  * `type`: there are three types of binders: element, attribute, or text. These correspond to matching against an
   *    element's tag name, an element with the given attribute name, or a text node that matches the provided
   *    expression.
   *
   *  * `name`: to match, a binder needs the name of an element or attribute, or a regular expression that matches a
   *    given text node. Names for elements and attributes can be regular expressions as well, or they may be wildcard
   *    names by using an asterisk.
   *
   *  * `definition`: a binder is a subclass of Binding which overrides key methods, `compiled`, `created`, `updated`,
   *    `bound`, and `unbound`. The definition may be an actual subclass of Binding or it may be an object which will be
   *    used for the prototype of the newly created subclass. For many bindings only the `updated` method is overridden,
   *    so by just passing in a function for `definition` the binder will be created with that as its `updated` method.
   *
   * ### Explaination of properties and methods
   *
   *   * `priority` may be defined as number to instruct some binders to be processed before others. Binders with
   *   higher priority are processed first.
   *
   *   * `animated` can be set to `true` to extend the AnimatedBinding class which provides support for animation when
   *   insertingand removing nodes from the DOM. The `animated` property only *allows* animation but the element must
   *   have the `animate` attribute to use animation. A binding will have the `animate` property set to true when it is
   *   to be animated. Binders should have fast paths for when animation is not used rather than assuming animation will
   *   be used.
   *
   * Binders
   *
   * A binder can have 5 methods which will be called at various points in a binding's lifecycle. Many binders will
   * only use the `updated(value)` method, so calling register with a function instead of an object as its third
   * parameter is a shortcut to creating a binder with just an `update` method.
   *
   * Listed in order of when they occur in a binding's lifecycle:
   *
   *   * `compiled(options)` is called when first creating a binding during the template compilation process and receives
   * the `options` object that will be passed into `new Binding(options)`. This can be used for creating templates,
   * modifying the DOM (only subsequent DOM that hasn't already been processed) and other things that should be
   * applied at compile time and not duplicated for each view created.
   *
   *   * `created()` is called on the binding when a new view is created. This can be used to add event listeners on the
   * element or do other things that will persiste with the view through its many uses. Views may get reused so don't
   * do anything here to tie it to a given context.
   *
   *   * `attached()` is called on the binding when the view is bound to a given context and inserted into the DOM. This
   * can be used to handle context-specific actions, add listeners to the window or document (to be removed in
   * `detached`!), etc.
   *
   *   * `updated(value, oldValue, changeRecords)` is called on the binding whenever the value of the expression within
   * the attribute changes. For example, `bind-text="{{username}}"` will trigger `updated` with the value of username
   * whenever it changes on the given context. When the view is removed `updated` will be triggered with a value of
   * `undefined` if the value was not already `undefined`, giving a chance to "reset" to an empty state.
   *
   *   * `detached()` is called on the binding when the view is unbound to a given context and removed from the DOM. This
   * can be used to clean up anything done in `attached()` or in `updated()` before being removed.
   *
   * Element and attribute binders will apply whenever the tag name or attribute name is matched. In the case of
   * attribute binders if you only want it to match when expressions are used within the attribute, add `onlyWhenBound`
   * to the definition. Otherwise the binder will match and the value of the expression will simply be a string that
   * only calls updated once since it will not change.
   *
   * Note, attributes which match a binder are removed during compile. They are considered to be binding definitions and
   * not part of the element. Bindings may set the attribute which served as their definition if desired.
   *
   * ### Defaults
   *
   * There are default binders for attribute and text nodes which apply when no other binders match. They only apply to
   * attributes and text nodes with expressions in them (e.g. `{{foo}}`). The default is to set the attribute or text
   * node's value to the result of the expression. If you wanted to override this default you may register a binder with
   * the name `"__default__"`.
   *
   * **Example:** This binding handler adds pirateized text to an element.
   * ```javascript
   * registry.registerAttribute('my-pirate', function(value) {
   *   if (typeof value !== 'string') {
   *     value = '';
   *   } else {
   *     value = value
   *       .replace(/\Bing\b/g, "in'")
   *       .replace(/\bto\b/g, "t'")
   *       .replace(/\byou\b/, 'ye')
   *       + ' Arrrr!';
   *   }
   *   this.element.textContent = value;
   * });
   * ```
   *
   * ```html
   * <p my-pirate="{{post.body}}">This text will be replaced.</p>
   * ```
   */
  registerElement: function(name, definition) {
    return this.registerBinder('element', name, definition);
  },
  registerAttribute: function(name, definition) {
    return this.registerBinder('attribute', name, definition);
  },
  registerText: function(name, definition) {
    return this.registerBinder('text', name, definition);
  },
  registerBinder: function(type, name, definition) {
    var binder, binders = this.binders[type]
    var superClass = definition.animated ? AnimatedBinding : Binding;

    if (!binders) {
      throw new TypeError('`type` must be one of ' + Object.keys(this.binders).join(', '));
    }

    if (typeof definition === 'function') {
      if (definition.prototype instanceof Binding) {
        superClass = definition;
        definition = {};
      } else {
        definition = { updated: definition };
      }
    }

    // Create a subclass of Binding (or another binder) with the definition
    function Binder() {
      superClass.apply(this, arguments);
    }
    definition.Observer = this.Observer;
    superClass.extend(Binder, definition);

    var expr;
    if (name instanceof RegExp) {
      expr = name;
    } else if (name.indexOf('*') >= 0) {
      expr = new RegExp('^' + escapeRegExp(name).replace('\\*', '(.*)') + '$');
    }

    if (expr) {
      Binder.expr = expr;
      binders._wildcards.push(Binder);
      binders._wildcards.sort(this.bindingSort);
    }

    Binder.name = '' + name;
    binders[name] = Binder;
    return Binder;
  },


  /**
   * Removes a binder that was added with `register()`. If an RegExp was used in register for the name it must be used
   * to unregister, but it does not need to be the same instance.
   */
  unregisterElement: function(name) {
    return this.unregisterBinder('element', name);
  },
  unregisterAttribute: function(name) {
    return this.unregisterBinder('attribute', name);
  },
  unregisterText: function(name) {
    return this.unregisterBinder('text', name);
  },
  unregisterBinder: function(type, name) {
    var binder = this.getBinder(type, name), binders = this.binders[type];
    if (!binder) return;
    if (binder.expr) {
      var index = binders._wildcards.indexOf(binder);
      if (index >= 0) binders._wildcards.splice(index, 1);
    }
    delete binders[name];
    return binder;
  },


  /**
   * Returns a binder that was added with `register()` by type and name.
   */
  getElementBinder: function(name) {
    return this.getBinder('element', name);
  },
  getAttributeBinder: function(name) {
    return this.getBinder('attribute', name);
  },
  getTextBinder: function(name) {
    return this.getBinder('text', name);
  },
  getBinder: function(type, name) {
    var binders = this.binders[type];

    if (!binders) {
      throw new TypeError('`type` must be one of ' + Object.keys(this.binders).join(', '));
    }

    if (name && binders.hasOwnProperty(name)) {
      return binders[name];
    }
  },


  /**
   * Find a matching binder for the given type. Elements should only provide name. Attributes should provide the name
   * and value (value so the default can be returned if an expression exists in the value). Text nodes should only
   * provide the value (in place of the name) and will return the default if no binders match.
   */
  findBinder: function(type, name, value) {
    if (type === 'text' && value == null) {
      value = name;
      name = undefined;
    }
    var binder = this.getBinder(type, name), binders = this.binders[type];

    if (!binder) {
      var toMatch = (type === 'text') ? value : name;
      binders._wildcards.some(function(wildcardBinder) {
        if (toMatch.match(wildcardBinder.expr)) {
          binder = wildcardBinder;
          return true;
        }
      });
    }

    if (binder && type === 'attribute' && binder.onlyWhenBound && !this.isBound(type, value)) {
      // don't use the `value` binder if there is no expression in the attribute value (e.g. `value="some text"`)
      return;
    }

    if (!binder && value && (type === 'text' || this.isBound(type, value))) {
      // Test if the attribute value is bound (e.g. `href="/posts/{{ post.id }}"`)
      binder = this.getBinder(type, '__default__');
    }

    return binder;
  },


  /**
   * A Formatter is stored to process the value of an expression. This alters the value of what comes in with a function
   * that returns a new value. Formatters are added by using a single pipe character (`|`) followed by the name of the
   * formatter. Multiple formatters can be used by chaining pipes with formatter names. Formatters may also have
   * arguments passed to them by using the colon to separate arguments from the formatter name. The signature of a
   * formatter should be `function(value, args...)` where args are extra parameters passed into the formatter after
   * colons.
   *
   * *Example:*
   * ```js
   * registry.registerFormatter('uppercase', function(value) {
   *   if (typeof value != 'string') return ''
   *   return value.toUppercase()
   * })
   *
   * registry.registerFormatter('replace', function(value, replace, with) {
   *   if (typeof value != 'string') return ''
   *   return value.replace(replace, with)
   * })
   * ```html
   * <h1 bind-text="title | uppercase | replace:'LETTER':'NUMBER'"></h1>
   * ```
   * *Result:*
   * ```html
   * <h1>GETTING TO KNOW ALL ABOUT THE NUMBER A</h1>
   * ```
   *
   * A `valueFormatter` is like a formatter but used specifically with the `value` binding since it is a two-way binding. When
   * the value of the element is changed a `valueFormatter` can adjust the value from a string to the correct value type for
   * the controller expression. The signature for a `valueFormatter` includes the current value of the expression
   * before the optional arguments (if any). This allows dates to be adjusted and possibley other uses.
   *
   * *Example:*
   * ```js
   * registry.registerFormatter('numeric', function(value) {
   *   // value coming from the controller expression, to be set on the element
   *   if (value == null || isNaN(value)) return ''
   *   return value
   * })
   *
   * registry.registerFormatter('date-hour', function(value) {
   *   // value coming from the controller expression, to be set on the element
   *   if ( !(currentValue instanceof Date) ) return ''
   *   var hours = value.getHours()
   *   if (hours >= 12) hours -= 12
   *   if (hours == 0) hours = 12
   *   return hours
   * })
   * ```html
   * <label>Number Attending:</label>
   * <input size="4" bind-value="event.attendeeCount | numeric">
   * <label>Time:</label>
   * <input size="2" bind-value="event.date | date-hour"> :
   * <input size="2" bind-value="event.date | date-minute">
   * <select bind-value="event.date | date-ampm">
   *   <option>AM</option>
   *   <option>PM</option>
   * </select>
   * ```
   */
  registerFormatter: function (name, formatter) {
    this.formatters[name] = formatter;
  },


  /**
   * Unregisters a formatter.
   */
  unregisterFormatter: function (name, formatter) {
    delete this.formatters[name];
  },


  /**
   * Gets a registered formatter.
   */
  getFormatter: function (name) {
    return this.formatters[name];
  },


  /**
   * An Animation is stored to handle animations. A registered animation is an object (or class which instantiates into
   * an object) with the methods:
   *   * `willAnimateIn(element)`
   *   * `animateIn(element, callback)`
   *   * `didAnimateIn(element)`
   *   * `willAnimateOut(element)`
   *   * `animateOut(element, callback)`
   *   * `didAnimateOut(element)`
   *
   * Animation is included with binders which are registered with the `animated` property set to `true` (such as `if`
   * and `repeat`). Animations allow elements to fade in, fade out, slide down, collapse, move from one location in a
   * list to another, and more.
   *
   * To use animation add an attribute named `animate` onto an element with a supported binder.
   *
   * ### CSS Animations
   *
   * If the `animate` attribute does not have a value or the value is a class name (e.g. `animate=".my-fade"`) then
   * fragments will use a CSS transition/animation. Classes will be added and removed to trigger the animation.
   *
   *   * `.will-animate-in` is added right after an element is inserted into the DOM. This can be used to set the
   *     opacity to `0.0` for example. It is then removed on the next animation frame.
   *   * `.animate-in` is when `.will-animate-in` is removed. It can be used to set opacity to `1.0` for example. The
   *     `animation` style can be set on this class if using it. The `transition` style can be set here. Note that
   *     although the `animate` attribute is placed on an element with the `repeat` binder, these classes are added to
   *     its children as they get added and removed.
   *   * `.will-animate-out` is added before an element is removed from the DOM. This can be used to set the opacity to
   *     `1` for example. It is then removed on the next animation frame.
   *   * `.animate-out` is added when `.will-animate-out` is removed. It can be used to set opacity to `0.0` for
   *     example. The `animation` style can be set on this class if using it. The `transition` style can be set here or
   *     on another selector that matches the element. Note that although the `animate` attribute is placed on an
   *     element with the `repeat` binder, these classes are added to its children as they get added and removed.
   *
   * If the `animate` attribute is set to a class name (e.g. `animate=".my-fade"`) then that class name will be added as
   * a class to the element during animation. This allows you to use `.my-fade.will-animate-in`, `.my-fade.animate-in`,
   * etc. in your stylesheets to use the same animation throughout your application.
   *
   * ### JavaScript Animations
   *
   * If you need greater control over your animations JavaScript may be used. It is recommended that CSS styles still be
   * used by having your code set them manually. This allows the animation to take advantage of the browser
   * optimizations such as hardware acceleration. This is not a requirement.
   *
   * In order to use JavaScript an object should be passed into the `animation` attribute using an expression. This
   * object should have methods that allow JavaScript animation handling. For example, if you are bound to a context
   * with an object named `customFade` with animation methods, your element should have `attribute="{{customFade}}"`.
   * The following is a list of the methods you may implement.
   *
   *   * `willAnimateIn(element)` will be called after an element has been inserted into the DOM. Use it to set initial
   *     CSS properties before `animateIn` is called to set the final properties. This method is optional.
   *   * `animateIn(element, callback)` will be called shortly after `willAnimateIn` if it was defined. Use it to set
   *     final CSS properties.
   *   * `animateOut(element, done)` will be called before an element is to be removed from the DOM. `done` must be
   *     called when the animation is complete in order for the binder to finish removing the element. **Remember** to
   *     clean up by removing any styles that were added before calling `done()` so the element can be reused without
   *     side-effects.
   *
   * The `element` passed in will be polyfilled for with the `animate` method using
   * https://github.com/web-animations/web-animations-js.
   *
   * ### Registered Animations
   *
   * Animations may be registered and used throughout your application. To use a registered animation use its name in
   * the `animate` attribute (e.g. `animate="fade"`). Note the only difference between a registered animation and a
   * class registration is class registrations are prefixed with a dot (`.`). Registered animations are always
   * JavaScript animations. To register an animation use `fragments.registerAnimation(name, animationObject)`.
   *
   * The Animation module comes with several common animations registered by default. The defaults use CSS styles to
   * work correctly, using `element.animate`.
   *
   *   * `fade` will fade an element in and out over 300 milliseconds.
   *   * `slide` will slide an element down when it is added and slide it up when it is removed.
   *   * `slide-move` will move an element from its old location to its new location in a repeated list.
   *
   * Do you have another common animation you think should be included by default? Submit a pull request!
   */
  registerAnimation: function(name, animationObject) {
    this.animations[name] = animationObject;
  },


  /**
   * Unregisters an animation.
   */
  unregisterAnimation: function(name) {
    delete this.animations[name];
  },


  /**
   * Gets a registered animation.
   */
  getAnimation: function(name) {
    return this.animations[name];
  },


  /**
   * Prepare an element to be easier animatable (adding a simple `animate` polyfill if needed)
   */
  makeElementAnimatable: animation.makeElementAnimatable,


  /**
   * Sets the delimiters that define an expression. Default is `{{` and `}}` but this may be overridden. If empty
   * strings are passed in (for type "attribute" only) then no delimiters are required for matching attributes, but the
   * default attribute matcher will not apply to the rest of the attributes.
   */
  setExpressionDelimiters: function(type, pre, post) {
    if (type !== 'attribute' && type !== 'text') {
      throw new TypeError('Expression delimiters must be of type "attribute" or "text"');
    }

    this.binders[type]._expr = new RegExp(escapeRegExp(pre) + '(.*?)' + escapeRegExp(post), 'g');
  },


  /**
   * Tests whether a value has an expression in it. Something like `/user/{{user.id}}`.
   */
  isBound: function(type, value) {
    if (type !== 'attribute' && type !== 'text') {
      throw new TypeError('isBound must provide type "attribute" or "text"');
    }
    var expr = this.binders[type]._expr;
    return Boolean(expr && value && value.match(expr));
  },


  /**
   * The sort function to sort binders correctly
   */
  bindingSort: function(a, b) {
    return b.prototype.priority - a.prototype.priority;
  },


  /**
   * Converts an inverted expression from `/user/{{user.id}}` to `"/user/" + user.id`
   */
  codifyExpression: function(type, text) {
    if (type !== 'attribute' && type !== 'text') {
      throw new TypeError('codifyExpression must use type "attribute" or "text"');
    }

    var expr = this.binders[type]._expr;
    var match = text.match(expr);

    if (!match) {
      return '"' + text.replace(/"/g, '\\"') + '"';
    } else if (match.length === 1 && match[0] === text) {
      return text.replace(expr, '$1');
    } else {
      var newText = '"', lastIndex = 0;
      while (match = expr.exec(text)) {
        var str = text.slice(lastIndex, expr.lastIndex - match[0].length);
        newText += str.replace(/"/g, '\\"');
        newText += '" + (' + match[1] + ' || "") + "';
        lastIndex = expr.lastIndex;
      }
      newText += text.slice(lastIndex).replace(/"/g, '\\"') + '"';
      return newText.replace(/^"" \+ | "" \+ | \+ ""$/g, '');
    }
  }

};

// Takes a string like "(\*)" or "on-\*" and converts it into a regular expression.
function escapeRegExp(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

},{"./animatedBinding":9,"./binding":10,"./compile":11,"./registered/animations":17,"./registered/binders":18,"./registered/formatters":19,"./template":20,"./util/animation":21,"./util/extend":22,"./util/toFragment":23,"./view":24}],13:[function(require,module,exports){
/*
Copyright (c) 2015 Jacob Wright <jacwright@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
// # Diff
// > Based on work from Google's observe-js polyfill: https://github.com/Polymer/observe-js

// A namespace to store the functions on
var diff = exports;

(function() {

  diff.clone = clone;
  diff.values = diffValues;
  diff.basic = diffBasic;
  diff.objects = diffObjects;
  diff.arrays = diffArrays;


  // A change record for the object changes
  function ChangeRecord(object, type, name, oldValue) {
    this.object = object;
    this.type = type;
    this.name = name;
    this.oldValue = oldValue;
  }

  // A splice record for the array changes
  function Splice(index, removed, addedCount) {
    this.index = index;
    this.removed = removed;
    this.addedCount = addedCount;
  }


  // Creates a clone or copy of an array or object (or simply returns a string/number/boolean which are immutable)
  // Does not provide deep copies.
  function clone(value, deep) {
    if (Array.isArray(value)) {
      if (deep) {
        return value.map(function(value) {
          return clone(value, deep);
        });
      } else {
        return value.slice();
      }
    } else if (value && typeof value === 'object') {
      if (value.valueOf() !== value) {
        return new value.constructor(value.valueOf());
      } else {
        var copy = {};
        for (var key in value) {
          var objValue = value[key];
          if (deep) {
            objValue = clone(objValue, deep);
          }
          copy[key] = objValue;
        }
        return copy;
      }
    } else {
      return value;
    }
  }


  // Diffs two values, returning a truthy value if there are changes or `false` if there are no changes. If the two
  // values are both arrays or both objects, an array of changes (splices or change records) between the two will be
  // returned. Otherwise  `true` will be returned.
  function diffValues(value, oldValue) {
    if (Array.isArray(value) && Array.isArray(oldValue)) {
      // If an array has changed calculate the splices
      var splices = diffArrays(value, oldValue);
      return splices.length ? splices : false;
    } else if (value && oldValue && typeof value === 'object' && typeof oldValue === 'object') {
      // If an object has changed calculate the chnages and call the callback
      // Allow dates and Number/String objects to be compared
      var valueValue = value.valueOf();
      var oldValueValue = oldValue.valueOf();

      // Allow dates and Number/String objects to be compared
      if (typeof valueValue !== 'object' && typeof oldValueValue !== 'object') {
        return valueValue !== oldValueValue;
      } else {
        var changeRecords = diffObjects(value, oldValue);
        return changeRecords.length ? changeRecords : false;
      }
    } else {
      // If a value has changed call the callback
      return diffBasic(value, oldValue);
    }
  }


  // Diffs two basic types, returning true if changed or false if not
  function diffBasic(value, oldValue) {
   if (value && oldValue && typeof value === 'object' && typeof oldValue === 'object') {
      // Allow dates and Number/String objects to be compared
      var valueValue = value.valueOf();
      var oldValueValue = oldValue.valueOf();

      // Allow dates and Number/String objects to be compared
      if (typeof valueValue !== 'object' && typeof oldValueValue !== 'object') {
        return diffBasic(valueValue, oldValueValue);
      }
    }

    // If a value has changed call the callback
    if (typeof value === 'number' && typeof oldValue === 'number' && isNaN(value) && isNaN(oldValue)) {
      return false;
    } else {
      return value !== oldValue;
    }
  }


  // Diffs two objects returning an array of change records. The change record looks like:
  // ```javascript
  // {
  //   object: object,
  //   type: 'deleted|updated|new',
  //   name: 'propertyName',
  //   oldValue: oldValue
  // }
  // ```
  function diffObjects(object, oldObject) {
    var changeRecords = [];
    var prop, oldValue, value;

    // Goes through the old object (should be a clone) and look for things that are now gone or changed
    for (prop in oldObject) {
      oldValue = oldObject[prop];
      value = object[prop];

      // Allow for the case of obj.prop = undefined (which is a new property, even if it is undefined)
      if (value !== undefined && !diffBasic(value, oldValue)) {
        continue;
      }

      // If the property is gone it was removed
      if (! (prop in object)) {
        changeRecords.push(new ChangeRecord(object, 'deleted', prop, oldValue));
      } else if (diffBasic(value, oldValue)) {
        changeRecords.push(new ChangeRecord(object, 'updated', prop, oldValue));
      }
    }

    // Goes through the old object and looks for things that are new
    for (prop in object) {
      value = object[prop];
      if (! (prop in oldObject)) {
        changeRecords.push(new ChangeRecord(object, 'new', prop));
      }
    }

    if (Array.isArray(object) && object.length !== oldObject.length) {
      changeRecords.push(new ChangeRecord(object, 'updated', 'length', oldObject.length));
    }

    return changeRecords;
  }





  EDIT_LEAVE = 0
  EDIT_UPDATE = 1
  EDIT_ADD = 2
  EDIT_DELETE = 3


  // Diffs two arrays returning an array of splices. A splice object looks like:
  // ```javascript
  // {
  //   index: 3,
  //   removed: [item, item],
  //   addedCount: 0
  // }
  // ```
  function diffArrays(value, oldValue) {
    var currentStart = 0;
    var currentEnd = value.length;
    var oldStart = 0;
    var oldEnd = oldValue.length;

    var minLength = Math.min(currentEnd, oldEnd);
    var prefixCount = sharedPrefix(value, oldValue, minLength);
    var suffixCount = sharedSuffix(value, oldValue, minLength - prefixCount);

    currentStart += prefixCount;
    oldStart += prefixCount;
    currentEnd -= suffixCount;
    oldEnd -= suffixCount;

    if (currentEnd - currentStart === 0 && oldEnd - oldStart === 0) {
      return [];
    }

    // if nothing was added, only removed from one spot
    if (currentStart === currentEnd) {
      return [ new Splice(currentStart, oldValue.slice(oldStart, oldEnd), 0) ];
    }

    // if nothing was removed, only added to one spot
    if (oldStart === oldEnd) {
      return [ new Splice(currentStart, [], currentEnd - currentStart) ];
    }

    // a mixture of adds and removes
    var distances = calcEditDistances(value, currentStart, currentEnd, oldValue, oldStart, oldEnd);
    var ops = spliceOperationsFromEditDistances(distances);

    var splice = null;
    var splices = [];
    var index = currentStart;
    var oldIndex = oldStart;

    for (var i = 0, l = ops.length; i < l; i++) {
      var op = ops[i];
      if (op === EDIT_LEAVE) {
        if (splice) {
          splices.push(splice);
          splice = null;
        }

        index++;
        oldIndex++;
      } else if (op === EDIT_UPDATE) {
        if (!splice) {
          splice = new Splice(index, [], 0);
        }

        splice.addedCount++;
        index++;

        splice.removed.push(oldValue[oldIndex]);
        oldIndex++;
      } else if (op === EDIT_ADD) {
        if (!splice) {
          splice = new Splice(index, [], 0);
        }

        splice.addedCount++;
        index++;
      } else if (op === EDIT_DELETE) {
        if (!splice) {
          splice = new Splice(index, [], 0);
        }

        splice.removed.push(oldValue[oldIndex]);
        oldIndex++;
      }
    }

    if (splice) {
      splices.push(splice);
    }

    return splices;
  }




  // find the number of items at the beginning that are the same
  function sharedPrefix(current, old, searchLength) {
    for (var i = 0; i < searchLength; i++) {
      if (diffBasic(current[i], old[i])) {
        return i;
      }
    }
    return searchLength;
  }


  // find the number of items at the end that are the same
  function sharedSuffix(current, old, searchLength) {
    var index1 = current.length;
    var index2 = old.length;
    var count = 0;
    while (count < searchLength && !diffBasic(current[--index1], old[--index2])) {
      count++;
    }
    return count;
  }


  function spliceOperationsFromEditDistances(distances) {
    var i = distances.length - 1;
    var j = distances[0].length - 1;
    var current = distances[i][j];
    var edits = [];
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

      var northWest = distances[i - 1][j - 1];
      var west = distances[i - 1][j];
      var north = distances[i][j - 1];

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
  }


  function calcEditDistances(current, currentStart, currentEnd, old, oldStart, oldEnd) {
    // "Deletion" columns
    var rowCount = oldEnd - oldStart + 1;
    var columnCount = currentEnd - currentStart + 1;
    var distances = new Array(rowCount);
    var i, j;

    // "Addition" rows. Initialize null column.
    for (i = 0; i < rowCount; i++) {
      distances[i] = new Array(columnCount);
      distances[i][0] = i;
    }

    // Initialize null row
    for (j = 0; j < columnCount; j++) {
      distances[0][j] = j;
    }

    for (i = 1; i < rowCount; i++) {
      for (j = 1; j < columnCount; j++) {
        if (!diffBasic(current[currentStart + j - 1], old[oldStart + i - 1])) {
          distances[i][j] = distances[i - 1][j - 1];
        } else {
          var north = distances[i - 1][j] + 1;
          var west = distances[i][j - 1] + 1;
          distances[i][j] = north < west ? north : west;
        }
      }
    }

    return distances;
  }
})();

},{}],14:[function(require,module,exports){
// # Chip Expression

// Parses a string of JavaScript into a function which can be bound to a scope.
//
// Allows undefined or null values to return undefined rather than throwing
// errors, allows for formatters on data, and provides detailed error reporting.

// The expression object with its expression cache.
var expression = exports;
expression.cache = {};
expression.globals = ['true', 'false', 'null', 'undefined', 'window', 'this'];
expression.get = getExpression;
expression.getSetter = getSetter;
expression.bind = bindExpression;


// Creates a function from the given expression. An `options` object may be
// provided with the following options:
// * `args` is an array of strings which will be the function's argument names
// * `globals` is an array of strings which define globals available to the
// function (these will not be prefixed with `this.`). `'true'`, `'false'`,
// `'null'`, and `'window'` are included by default.
//
// This function will be cached so subsequent calls with the same expression will
// return the same function. E.g. the expression "name" will always return a
// single function with the body `return this.name`.
function getExpression(expr, options) {
  if (!options) options = {};
  if (!options.args) options.args = [];
  var cacheKey = expr + '|' + options.args.join(',');
  // Returns the cached function for this expression if it exists.
  var func = expression.cache[cacheKey];
  if (func) {
    return func;
  }

  options.args.unshift('_formatters_');

  // Prefix all property lookups with the `this` keyword. Ignores keywords
  // (window, true, false) and extra args
  var body = parseExpression(expr, options);

  try {
    func = expression.cache[cacheKey] = Function.apply(null, options.args.concat(body));
  } catch (e) {
    if (options.ignoreErrors) return;
    // Throws an error if the expression was not valid JavaScript
    console.error('Bad expression:\n`' + expr + '`\n' + 'Compiled expression:\n' + body);
    throw new Error(e.message);
  }
  return func;
}


// Creates a setter function from the given expression.
function getSetter(expr, options) {
  if (!options) options = {};
  options.args = ['value'];
  expr = expr.replace(/(\s*\||$)/, ' = value$1');
  return getExpression(expr, options);
}



// Compiles an expression and binds it in the given scope. This allows it to be
// called from anywhere (e.g. event listeners) while retaining the scope.
function bindExpression(expr, scope, options) {
  return getExpression(expr, options).bind(scope);
}

// finds all quoted strings
var quoteExpr = /(['"\/])(\\\1|[^\1])*?\1/g;

// finds all empty quoted strings
var emptyQuoteExpr = /(['"\/])\1/g;

// finds pipes that aren't ORs (` | ` not ` || `) for formatters
var pipeExpr = /\|(\|)?/g;

// finds the parts of a formatter (name and args)
var formatterExpr = /^([^\(]+)(?:\((.*)\))?$/;

// finds argument separators for formatters (`arg1:arg2`)
var argSeparator = /\s*,\s*/g;

// matches property chains (e.g. `name`, `user.name`, and `user.fullName().capitalize()`)
var propExpr = /((\{|,|\.)?\s*)([a-z$_\$](?:[a-z_\$0-9\.-]|\[['"\d]+\])*)(\s*(:|\(|\[)?)/gi;

// links in a property chain
var chainLinks = /\.|\[/g;

// the property name part of links
var chainLink = /\.|\[|\(/;

// determines whether an expression is a setter or getter (`name` vs
// `name = 'bob'`)
var setterExpr = /\s=\s/;

var ignore = null;
var strings = [];
var referenceCount = 0;
var currentReference = 0;
var currentIndex = 0;
var finishedChain = false;
var continuation = false;

// Adds `this.` to the beginning of each valid property in an expression,
// processes formatters, and provides null-termination in property chains
function parseExpression(expr, options) {
  initParse(expr, options);
  expr = pullOutStrings(expr);
  expr = parseFormatters(expr);
  expr = parseExpr(expr);
  expr = 'return ' + expr;
  expr = putInStrings(expr);
  expr = addReferences(expr);
  return expr;
}


function initParse(expr, options) {
  referenceCount = currentReference = 0;
  // Ignores keywords and provided argument names
  ignore = expression.globals.concat(options.globals || [], options.args || []);
  strings.length = 0;
}


// Adds placeholders for strings so we can process the rest without their content
// messing us up.
function pullOutStrings(expr) {
  return expr.replace(quoteExpr, function(str, quote) {
    strings.push(str);
    return quote + quote; // placeholder for the string
  });
}


// Replaces string placeholders.
function putInStrings(expr) {
  return expr.replace(emptyQuoteExpr, function() {
    return strings.shift();
  });
}


// Prepends reference variable definitions
function addReferences(expr) {
  if (referenceCount) {
    var refs = [];
    for (var i = 1; i <= referenceCount; i++) {
      refs.push('_ref' + i);
    }
    expr = 'var ' + refs.join(', ') + ';\n' + expr;
  }
  return expr;
}


function parseFormatters(expr) {
  // Removes formatters from expression string
  expr = expr.replace(pipeExpr, function(match, orIndicator) {
    if (orIndicator) return match;
    return '@@@';
  });

  formatters = expr.split(/\s*@@@\s*/);
  expr = formatters.shift();
  if (!formatters.length) return expr;

  // Processes the formatters
  // If the expression is a setter the value will be run through the formatters
  var setter = '';
  value = expr;

  if (setterExpr.test(expr)) {
    var parts = expr.split(setterExpr);
    setter = parts[0] + ' = ';
    value = parts[1];
  }

  formatters.forEach(function(formatter) {
    var match = formatter.trim().match(formatterExpr);
    if (!match) throw new Error('Formatter is invalid: ' + formatter);
    var formatterName = match[1];
    var args = match[2] ? match[2].split(argSeparator) : [];
    args.unshift(value);
    if (setter) args.push(true);
    value = '_formatters_.' + formatterName + '.call(this, ' + args.join(', ') + ')';
  });

  return setter + value;
}


function parseExpr(expr) {
  if (setterExpr.test(expr)) {
    var parts = expr.split(' = ');
    var setter = parts[0];
    var value = parts[1];
    var negate = '';
    if (setter.charAt(0) === '!') {
      negate = '!';
      setter = setter.slice(1);
    }
    setter = parsePropertyChains(setter).replace(/^\(|\)$/g, '') + ' = ';
    value = parsePropertyChains(value);
    return setter + negate + value;
  } else {
    return parsePropertyChains(expr);
  }
}


function parsePropertyChains(expr) {
  var javascript = '', js;
  // allow recursion into function args by resetting propExpr
  var previousIndexes = [currentIndex, propExpr.lastIndex];
  currentIndex = 0;
  propExpr.lastIndex = 0;
  while ((js = nextChain(expr)) !== false) {
    javascript += js;
  }
  currentIndex = previousIndexes[0];
  propExpr.lastIndex = previousIndexes[1];
  return javascript;
}


function nextChain(expr) {
  if (finishedChain) {
    return (finishedChain = false);
  }
  var match = propExpr.exec(expr);
  if (!match) {
    finishedChain = true // make sure next call we return false
    return expr.slice(currentIndex);
  }

  // `prefix` is `objIndicator` with the whitespace that may come after it.
  var prefix = match[1];

  // `objIndicator` is `{` or `,` and let's us know this is an object property
  // name (e.g. prop in `{prop:false}`).
  var objIndicator = match[2];

  // `propChain` is the chain of properties matched (e.g. `this.user.email`).
  var propChain = match[3];

  // `postfix` is the `colonOrParen` with whitespace before it.
  var postfix = match[4];

  // `colonOrParen` matches the colon (:) after the property (if it is an object)
  // or parenthesis if it is a function. We use `colonOrParen` and `objIndicator`
  // to know if it is an object.
  var colonOrParen = match[5];

  match = match[0];

  var skipped = expr.slice(currentIndex, propExpr.lastIndex - match.length);
  currentIndex = propExpr.lastIndex;

  // skips object keys e.g. test in `{test:true}`.
  if (objIndicator && colonOrParen === ':') {
    return skipped + match;
  }

  return skipped + parseChain(prefix, propChain, postfix, colonOrParen, expr);
}


function splitLinks(chain) {
  var index = 0;
  var parts = [];
  var match;
  while (match = chainLinks.exec(chain)) {
    if (chainLinks.lastIndex === 1) continue;
    parts.push(chain.slice(index, chainLinks.lastIndex - 1));
    index = chainLinks.lastIndex - 1;
  }
  parts.push(chain.slice(index));
  return parts;
}


function addThis(chain) {
  if (ignore.indexOf(chain.split(chainLink).shift()) === -1) {
    return 'this.' + chain;
  } else {
    return chain;
  }
}


function parseChain(prefix, propChain, postfix, paren, expr) {
  // continuations after a function (e.g. `getUser(12).firstName`).
  continuation = prefix === '.';
  if (continuation) {
    propChain = '.' + propChain;
    prefix = '';
  }

  var links = splitLinks(propChain);
  var newChain = '';

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
          newChain += '_ref' + currentReference + link + ')';
        } else {
          postfix = postfix.replace(paren, '');
          newChain += parseFunction(link, index, expr);
        }
      }
    });
  }

  return prefix + newChain + postfix;
}


var parens = {
  '(': ')',
  '[': ']'
};

// Handles a function to be called in its correct scope
// Finds the end of the function and processes the arguments
function parseFunction(link, index, expr) {
  var call = getFunctionCall(expr);
  link += call.slice(0, 1) + '~~insideParens~~' + call.slice(-1);
  var insideParens = call.slice(1, -1);

  if (expr.charAt(propExpr.lastIndex) === '.') {
    link = parsePart(link, index)
  } else if (index === 0) {
    link = parsePart(link, index);
    link += '_ref' + currentReference + ')';
  } else {
    link = '_ref' + currentReference + link + ')';
  }

  var ref = currentReference;
  link = link.replace('~~insideParens~~', parsePropertyChains(insideParens));
  currentReference = ref;
  return link;
}


// returns the call part of a function (e.g. `test(123)` would return `(123)`)
function getFunctionCall(expr) {
  var startIndex = propExpr.lastIndex;
  var open = expr.charAt(startIndex - 1);
  var close = parens[open];
  var endIndex = startIndex - 1;
  var parenCount = 1;
  while (endIndex++ < expr.length) {
    var ch = expr.charAt(endIndex);
    if (ch === open) parenCount++;
    else if (ch === close) parenCount--;
    if (parenCount === 0) break;
  }
  currentIndex = propExpr.lastIndex = endIndex + 1;
  return open + expr.slice(startIndex, endIndex) + close;
}



function parsePart(part, index) {
  // if the first
  if (index === 0 && !continuation) {
    if (ignore.indexOf(part.split(/\.|\(|\[/).shift()) === -1) {
      part = 'this.' + part;
    }
  } else {
    part = '_ref' + currentReference + part;
  }

  currentReference = ++referenceCount;
  var ref = '_ref' + currentReference;
  return '(' + ref + ' = ' + part + ') == null ? undefined : ';
}

},{}],15:[function(require,module,exports){
module.exports = exports = require('./observer');
exports.expression = require('./expression');
exports.expression.diff = require('./diff');

},{"./diff":13,"./expression":14,"./observer":16}],16:[function(require,module,exports){
module.exports = Observer;
var expression = require('./expression');
var diff = require('./diff');
var requestAnimationFrame = window.requestAnimationFrame || setTimeout;
var cancelAnimationFrame = window.cancelAnimationFrame || clearTimeout;

// # Observer

// Defines an observer class which represents an expression. Whenever that expression returns a new value the `callback`
// is called with the value.
//
// If the old and new values were either an array or an object, the `callback` also
// receives an array of splices (for an array), or an array of change objects (for an object) which are the same
// format that `Array.observe` and `Object.observe` return <http://wiki.ecmascript.org/doku.php?id=harmony:observe>.
function Observer(expr, callback, callbackContext) {
  if (typeof expr === 'function') {
    this.getter = expr;
    this.setter = expr;
  } else {
    this.getter = expression.get(expr);
  }
  this.expr = expr;
  this.callback = callback;
  this.callbackContext = callbackContext;
  this.skip = false;
  this.forceUpdateNextSync = false;
  this.context = null;
  this.oldValue = undefined;
}

Observer.prototype = {

  // Binds this expression to a given context
  bind: function(context, skipUpdate) {
    this.context = context;
    if (this.callback) {
      Observer.add(this, skipUpdate);
    }
  },

  // Unbinds this expression
  unbind: function() {
    this.context = null;
    Observer.remove(this);
    this.sync();
  },

  // Returns the current value of this observer
  get: function() {
    if (this.context) {
      return this.getter.call(this.context, Observer.formatters);
    }
  },

  // Sets the value of this expression
  set: function(value) {
    if (!this.context) return;
    if (this.setter === false) return;
    if (!this.setter) {
      this.setter = typeof this.expr === 'string'
        ? expression.getSetter(this.expr, { ignoreErrors: true }) || false
        : false;
      if (!this.setter) return;
    }

    try {
      var result = this.setter.call(this.context._origContext_ || this.context, Observer.formatters, value);
    } catch(e) {
      return;
    }

    this.sync();
    Observer.sync();
    return result;
  },


  // Instructs this observer to not call its `callback` on the next sync, whether the value has changed or not
  skipNextSync: function() {
    this.skip = true;
  },


  // Syncs this observer now, calling the callback immediately if there have been changes
  sync: function() {
    var value = this.get();

    // Don't call the callback if `skipNextSync` was called on the observer
    if (this.skip || !this.callback) {
      this.skip = false;
    } else {
      // If an array has changed calculate the splices and call the callback. This
      var changed = diff.values(value, this.oldValue);
      if (!changed && !this.forceUpdateNextSync) return;
      this.forceUpdateNextSync = false;
      if (Array.isArray(changed)) {
        this.callback.call(this.callbackContext, value, this.oldValue, changed)
      } else {
        this.callback.call(this.callbackContext, value, this.oldValue);
      }
    }

    // Store an immutable version of the value, allowing for arrays and objects to change instance but not content and
    // still refrain from dispatching callbacks (e.g. when using an object in bind-class or when using array formatters
    // in bind-each)
    this.oldValue = diff.clone(value);
  }
};


// An array of all observers, considered *private*
Observer.observers = [];

// An array of callbacks to run after the next sync, considered *private*
Observer.callbacks = [];
Observer.listeners = [];

// Adds a new observer to be synced with changes. If `skipUpdate` is true then the callback will only be called when a
// change is made, not initially.
Observer.add = function(observer, skipUpdate) {
  this.observers.push(observer);
  if (!skipUpdate) observer.sync();
};

// Removes an observer, stopping it from being run
Observer.remove = function(observer) {
  var index = this.observers.indexOf(observer);
  if (index !== -1) {
    this.observers.splice(index, 1);
    return true;
  } else {
    return false;
  }
};

// *private* properties used in the sync cycle
Observer.syncing = false;
Observer.rerun = false;
Observer.cycles = 0;
Observer.max = 10;
Observer.timeout = null;
Observer.syncPending = null;

// Schedules an observer sync cycle which checks all the observers to see if they've changed.
Observer.sync = function(callback) {
  if (Observer.syncPending) return false;
  Observer.syncPending = requestAnimationFrame(function() {
    Observer.syncNow(callback);
  });
  return true;
};

// Runs the observer sync cycle which checks all the observers to see if they've changed.
Observer.syncNow = function(callback) {
  if (typeof callback === 'function') {
    Observer.afterSync(callback);
  }

  cancelAnimationFrame(Observer.syncPending);
  Observer.syncPending = null;

  if (Observer.syncing) {
    Observer.rerun = true;
    return false;
  }

  Observer.syncing = true;
  Observer.rerun = true;
  Observer.cycles = 0;

  // Allow callbacks to run the sync cycle again immediately, but stop at `Observer.max` (default 10) cycles to we don't
  // run infinite loops
  while (Observer.rerun) {
    if (++Observer.cycles === Observer.max) {
      throw new Error('Infinite observer syncing, an observer is calling Observer.sync() too many times');
    }
    Observer.rerun = false;
    // the observer array may increase or decrease in size (remaining observers) during the sync
    for (var i = 0; i < Observer.observers.length; i++) {
      Observer.observers[i].sync();
    }
  }

  while (Observer.callbacks.length) {
    Observer.callbacks.shift()();
  }

  for (var i = 0, l = Observer.listeners.length; i < l; i++) {
    var listener = Observer.listeners[i];
    listener();
  }

  Observer.syncing = false;
  Observer.cycles = 0;
  return true;
};

// After the next sync (or the current if in the middle of one), run the provided callback
Observer.afterSync = function(callback) {
  if (typeof callback !== 'function') {
    throw new TypeError('callback must be a function');
  }
  Observer.callbacks.push(callback);
};

Observer.onSync = function(listener) {
  if (typeof listener === 'function') {
    throw new TypeError('listener must be a function');
  }
  Observer.listeners.push(listener);
};

Observer.removeOnSync = function(listener) {
  if (typeof listener === 'function') {
    throw new TypeError('listener must be a function');
  }
  var index = Observer.listeners.indexOf(listener);
  if (index !== -1) {
    Observer.listeners.splice(index, 1).pop();
  }
};

},{"./diff":13,"./expression":14}],17:[function(require,module,exports){
module.exports = registerDefaults;

/**
 * # Default Binders
 * Registers default binders with a fragments object.
 */
function registerDefaults(fragments) {

  /**
   * Fade in and out
   */
  fragments.registerAnimation('fade', {
    options: {
      duration: 300,
      easing: 'ease-in-out'
    },
    animateIn: function(element, done) {
      element.animate([
        { opacity: '0' },
        { opacity: '1' }
      ], this.options).onfinish = done;
    },
    animateOut: function(element, done) {
      element.animate([
        { opacity: '1' },
        { opacity: '0' }
      ], this.options).onfinish = done;
    }
  });

  var slides = {
    slide: 'height',
    slidev: 'height',
    slideh: 'width'
  };

  var animating = new Map();

  function obj(key, value) {
    var obj = {};
    obj[key] = value;
    return obj;
  }

  /**
   * Slide down and up, left and right
   */
  Object.keys(slides).forEach(function(name) {
    var property = slides[name];

    fragments.registerAnimation(name, {
      options: {
        duration: 300,
        easing: 'ease-in-out'
      },
      animateIn: function(element, done) {
        var value = element.getComputedCSS(property);
        if (!value || value === '0px') {
          return done();
        }

        element.style.overflow = 'hidden';
        element.animate([
          obj(property, '0px'),
          obj(property, value)
        ], this.options).onfinish = function() {
          element.style.overflow = '';
          done();
        };
      },
      animateOut: function(element, done) {
        var value = element.getComputedCSS(property);
        if (!value || value === '0px') {
          return done();
        }

        element.style.overflow = 'hidden';
        element.animate([
          obj(property, value),
          obj(property, '0px')
        ], this.options).onfinish = function() {
          element.style.overflow = '';
          done();
        };
      }
    });


    /**
     * Move items up and down in a list, slide down and up
     */
    fragments.registerAnimation(name + '-move', {
      options: {
        duration: 300,
        easing: 'ease-in-out'
      },

      animateIn: function(element, done) {
        var value = element.getComputedCSS(property);
        if (!value || value === '0px') {
          return done();
        }

        var item = element.view && element.view._repeatItem_;
        if (item) {
          animating.set(item, element);
          setTimeout(function() {
            animating.delete(item);
          });
        }

        // Do the slide
        element.style.overflow = 'hidden';
        element.animate([
          obj(property, '0px'),
          obj(property, value)
        ], this.options).onfinish = function() {
          element.style.overflow = '';
          done();
        };
      },

      animateOut: function(element, done) {
        var value = element.getComputedCSS(property);
        if (!value || value === '0px') {
          return done();
        }

        var item = element.view && element.view._repeatItem_;
        if (item) {
          var newElement = animating.get(item);
          if (newElement && newElement.parentNode === element.parentNode) {
            // This item is being removed in one place and added into another. Make it look like its moving by making both
            // elements not visible and having a clone move above the items to the new location.
            element = this.animateMove(element, newElement);
          }
        }

        // Do the slide
        element.style.overflow = 'hidden';
        element.animate([
          obj(property, value),
          obj(property, '0px')
        ], this.options).onfinish = function() {
          element.style.overflow = '';
          done();
        };
      },

      animateMove: function(oldElement, newElement) {
        var placeholderElement;
        var parent = newElement.parentNode;
        if (!parent.__slideMoveHandled) {
          parent.__slideMoveHandled = true;
          if (window.getComputedStyle(parent).position === 'static') {
            parent.style.position = 'relative';
          }
        }

        var origStyle = oldElement.getAttribute('style');
        var style = window.getComputedStyle(oldElement);
        var marginOffsetLeft = -parseInt(style.marginLeft);
        var marginOffsetTop = -parseInt(style.marginTop);
        var oldLeft = oldElement.offsetLeft;
        var oldTop = oldElement.offsetTop;

        placeholderElement = fragments.makeElementAnimatable(oldElement.cloneNode(true));
        placeholderElement.style.width = oldElement.style.width = style.width;
        placeholderElement.style.height = oldElement.style.height = style.height;
        placeholderElement.style.opacity = '0';

        oldElement.style.position = 'absolute';
        oldElement.style.zIndex = 1000;
        parent.insertBefore(placeholderElement, oldElement);
        newElement.style.opacity = '0';

        oldElement.animate([
          { top: oldTop + marginOffsetTop + 'px', left: oldLeft + marginOffsetLeft + 'px' },
          { top: newElement.offsetTop + marginOffsetTop + 'px', left: newElement.offsetLeft + marginOffsetLeft + 'px' }
        ], this.options).onfinish = function() {
          placeholderElement.remove();
          origStyle ? oldElement.setAttribute('style', origStyle) : oldElement.removeAttribute('style');
          newElement.style.opacity = '';
        };

        return placeholderElement;
      }
    });

  });

}

},{}],18:[function(require,module,exports){
module.exports = registerDefaults;
var diff = require('../observer/diff');

/**
 * # Default Binders
 * Registers default binders with a fragments object.
 */
function registerDefaults(fragments) {

  /**
   * Prints out the value of the expression to the console.
   */
  fragments.registerAttribute('debug', {
    priority: 60,
    updated: function(value) {
      console.info('Debug:', this.expression, '=', value);
    }
  });


  /**
   * ## text
   * Adds a binder to display escaped text inside an element. This can be done with binding directly in text nodes but
   * using the attribute binder prevents a flash of unstyled content on the main page.
   *
   * **Example:**
   * ```html
   * <h1 text="{{post.title}}">Untitled</h1>
   * <div html="{{post.body | markdown}}"></div>
   * ```
   * *Result:*
   * ```html
   * <h1>Little Red</h1>
   * <div>
   *   <p>Little Red Riding Hood is a story about a little girl.</p>
   *   <p>
   *     More info can be found on
   *     <a href="http://en.wikipedia.org/wiki/Little_Red_Riding_Hood">Wikipedia</a>
   *   </p>
   * </div>
   * ```
   */
  fragments.registerAttribute('text', function(value) {
    this.element.textContent = (value == null ? '' : value);
  });


  /**
   * ## html
   * Adds a binder to display unescaped HTML inside an element. Be sure it's trusted! This should be used with filters
   * which create HTML from something safe.
   *
   * **Example:**
   * ```html
   * <h1>{{post.title}}</h1>
   * <div html="{{post.body | markdown}}"></div>
   * ```
   * *Result:*
   * ```html
   * <h1>Little Red</h1>
   * <div>
   *   <p>Little Red Riding Hood is a story about a little girl.</p>
   *   <p>
   *     More info can be found on
   *     <a href="http://en.wikipedia.org/wiki/Little_Red_Riding_Hood">Wikipedia</a>
   *   </p>
   * </div>
   * ```
   */
  fragments.registerAttribute('html', function(value) {
    this.element.innerHTML = (value == null ? '' : value);
  });



  /**
   * ## class-[className]
   * Adds a binder to add classes to an element dependent on whether the expression is true or false.
   *
   * **Example:**
   * ```html
   * <div class="user-item" class-selected-user="{{selected === user}}">
   *   <button class="btn primary" class-highlight="{{ready}}"></button>
   * </div>
   * ```
   * *Result if `selected` equals the `user` and `ready` is `true`:*
   * ```html
   * <div class="user-item selected-user">
   *   <button class="btn primary highlight"></button>
   * </div>
   * ```
   */
  fragments.registerAttribute('class-*', function(value) {
    if (value) {
      this.element.classList.add(this.match);
    } else {
      this.element.classList.remove(this.match);
    }
  });



  /**
   * ## value
   * Adds a binder which sets the value of an HTML form element. This binder also updates the data as it is changed in
   * the form element, providing two way binding.
   *
   * **Example:**
   * ```html
   * <label>First Name</label>
   * <input type="text" name="firstName" value="user.firstName">
   *
   * <label>Last Name</label>
   * <input type="text" name="lastName" value="user.lastName">
   * ```
   * *Result:*
   * ```html
   * <label>First Name</label>
   * <input type="text" name="firstName" value="Jacob">
   *
   * <label>Last Name</label>
   * <input type="text" name="lastName" value="Wright">
   * ```
   * And when the user changes the text in the first input to "Jac", `user.firstName` will be updated immediately with
   * the value of `'Jac'`.
   */
  fragments.registerAttribute('value', {
    onlyWhenBound: true,
    eventsAttrName: 'value-events',
    fieldAttrName: 'value-field',
    defaultEvents: [ 'change' ],

    compiled: function() {
      var name = this.element.tagName.toLowerCase();
      var type = this.element.type;
      this.methods = inputMethods[type] || inputMethods[name];

      if (!this.methods) {
        return false;
      }

      if (this.element.hasAttribute(this.eventsAttrName)) {
        this.events = this.element.getAttribute(this.eventsAttrName).split(' ');
        this.element.removeAttribute(this.eventsAttrName);
      } else if (name !== 'option') {
        this.events = this.defaultEvents;
      }

      if (this.element.hasAttribute(this.fieldAttrName)) {
        this.valueField = this.element.getAttribute(this.fieldAttrName);
        this.element.removeAttribute(this.fieldAttrName);
      }

      if (type === 'option') {
        this.valueField = this.element.parentNode.valueField;
      }
    },

    created: function() {
      if (!this.events) return; // nothing for <option> here
      var element = this.element;
      var observer = this.observer;
      var input = this.methods;
      var valueField = this.valueField;

      // The 2-way binding part is setting values on certain events
      function onChange() {
        if (input.get.call(element, valueField) !== observer.oldValue && !element.readOnly) {
          observer.set(input.get.call(element, valueField));
        }
      }

      if (element.type === 'text') {
        element.addEventListener('keydown', function(event) {
          if (event.keyCode === 13) onChange();
        });
      }

      this.events.forEach(function(event) {
        element.addEventListener(event, onChange);
      });
    },

    updated: function(value) {
      if (this.methods.get.call(this.element, this.valueField) != value) {
        this.methods.set.call(this.element, value, this.valueField);
      }
    }
  });

  /**
   * Handle the different form types
   */
  var defaultInputMethod = {
    get: function() { return this.value; },
    set: function(value) { this.value = (value == null) ? '' : value; }
  };

  var inputMethods = {
    checkbox: {
      get: function() { return this.checked; },
      set: function(value) { this.checked = !!value; }
    },

    file: {
      get: function() { return this.files && this.files[0]; },
      set: function(value) {}
    },

    select: {
      get: function(valueField) {
        if (valueField) {
          return this.options[this.selectedIndex].valueObject;
        } else {
          return this.value;
        }
      },
      set: function(value, valueField) {
        if (value && valueField) {
          this.valueObject = value;
          this.value = value[valueField];
        } else {
          this.value = (value == null) ? '' : value;
        }
      }
    },

    option: {
      get: function(valueField) {
        return valueField ? this.valueObject[valueField] : this.value;
      },
      set: function(value, valueField) {
        if (value && valueField) {
          this.valueObject = value;
          this.value = value[valueField];
        } else {
          this.value = (value == null) ? '' : value;
        }
      }
    },

    input: defaultInputMethod,

    textarea: defaultInputMethod
  };


  /**
   * ## on-[event]
   * Adds a binder for each event name in the array. When the event is triggered the expression will be run.
   *
   * **Example Events:**
   *
   * * on-click
   * * on-dblclick
   * * on-submit
   * * on-change
   * * on-focus
   * * on-blur
   *
   * **Example:**
   * ```html
   * <form on-submit="{{saveUser()}}">
   *   <input name="firstName" value="Jacob">
   *   <button>Save</button>
   * </form>
   * ```
   * *Result (events don't affect the HTML):*
   * ```html
   * <form>
   *   <input name="firstName" value="Jacob">
   *   <button>Save</button>
   * </form>
   * ```
   */
  fragments.registerAttribute('on-*', {
    created: function() {
      var eventName = this.match;
      var _this = this;
      this.element.addEventListener(eventName, function(event) {
        if (!this.hasAttribute('disabled') && _this.context) {
          // Set the event on the context so it may be used in the expression when the event is triggered.
          var priorEvent = Object.getOwnPropertyDescriptor(_this.context, 'event');
          var priorElement = Object.getOwnPropertyDescriptor(_this.context, 'element');
          _this.context.event = event;
          _this.context.element = _this.element;

          // Let an on-[event] make the function call with its own arguments
          var listener = _this.observer.get();

          // Or just return a function which will be called with the event object
          if (typeof listener === 'function') listener.call(_this.context, event);

          // Reset the context to its prior state
          if (priorEvent) {
            Object.defineProperty(_this.context, 'event', priorEvent);
          } else {
            delete _this.context.event;
          }

          if (priorElement) {
            Object.defineProperty(_this.context, 'element', priorElement);
          } else {
            delete _this.context.element;
          }
        }
      });
    }
  });


  /**
   * ## on-[key event]
   * Adds a binder which is triggered when the keydown event's `keyCode` property matches. If the name includes ctrl
   * then it will only fire when the key plus the ctrlKey or metaKey is pressed.
   *
   * **Key Events:**
   *
   * * on-enter
   * * on-ctrl-enter
   * * on-esc
   *
   * **Example:**
   * ```html
   * <input on-enter="{{save()}}" on-esc="{{cancel()}}">
   * ```
   * *Result:*
   * ```html
   * <input>
   * ```
   */
  var keyCodes = { enter: 13, esc: 27, 'ctrl-enter': 13 };

  Object.keys(keyCodes).forEach(function(name) {
    var keyCode = keyCodes[name];

    fragments.registerAttribute('on-' + name, {
      created: function() {
        var useCtrlKey = name.indexOf('ctrl-') === 0;
        var _this = this;
        this.element.addEventListener('keydown', function(event) {
          if (useCtrlKey && !(event.ctrlKey || event.metaKey) || !_this.context) {
            return;
          }

          if (event.keyCode !== keyCode) {
            return;
          }

          event.preventDefault();

          if (!this.hasAttribute('disabled')) {
            // Set the event on the context so it may be used in the expression when the event is triggered.
            var prior = Object.getOwnPropertyDescriptor(_this.context, 'event');
            _this.context.event = event;

            // Let an on-[event] make the function call with its own arguments
            var listener = _this.observer.get();

            // Or just return a function which will be called with the event object
            if (typeof listener === 'function') listener.call(_this.context, event);

            // Reset the context to its prior state
            if (prior) {
              Object.defineProperty(_this.context, event, prior);
            } else {
              delete _this.context.event;
            }
          }
        });
      }
    })
  });


  /**
   * ## [attribute]$
   * Adds a binder to set the attribute of element to the value of the expression. Use this when you don't want an
   * `<img>` to try and load its `src` before being evaluated. This is only needed on the index.html page as template
   * will be processed before being inserted into the DOM. Generally you can just use `attr="{{expr}}"`.
   *
   * **Example Attributes:**
   *
   * **Example:**
   * ```html
   * <img src$="{{user.avatarUrl}}">
   * ```
   * *Result:*
   * ```html
   * <img src="http://cdn.example.com/avatars/jacwright-small.png">
   * ```
   */
  fragments.registerAttribute('*$', function(value) {
    var attrName = this.match;
    if (!value) {
      this.element.removeAttribute(attrName);
    } else {
      this.element.setAttribute(attrName, value);
    }
  });


  /**
   * ## [attribute]?
   * Adds a binder to toggle an attribute on or off if the expression is truthy or falsey. Use for attributes without
   * values such as `selected`, `disabled`, or `readonly`. `checked?` will use 2-way databinding.
   *
   * **Example:**
   * ```html
   * <label>Is Administrator</label>
   * <input type="checkbox" checked?="{{user.isAdmin}}">
   * <button disabled?="{{isProcessing}}">Submit</button>
   * ```
   * *Result if `isProcessing` is `true` and `user.isAdmin` is false:*
   * ```html
   * <label>Is Administrator</label>
   * <input type="checkbox">
   * <button disabled>Submit</button>
   * ```
   */
  fragments.registerAttribute('*?', function(value) {
    var attrName = this.match;
    if (!value) {
      this.element.removeAttribute(attrName);
    } else {
      this.element.setAttribute(attrName, '');
    }
  });


  /**
   * Add a clone of the `value` binder for `checked?` so checkboxes can have two-way binding using `checked?`.
   */
  fragments.registerAttribute('checked?', fragments.getAttributeBinder('value'));



  /**
   * ## if, unless, else-if, else-unless, else
   * Adds a binder to show or hide the element if the value is truthy or falsey. Actually removes the element from the
   * DOM when hidden, replacing it with a non-visible placeholder and not needlessly executing bindings inside.
   *
   * **Example:**
   * ```html
   * <ul class="header-links">
   *   <li if="user"><a href="/account">My Account</a></li>
   *   <li unless="user"><a href="/login">Sign In</a></li>
   *   <li else><a href="/logout">Sign Out</a></li>
   * </ul>
   * ```
   * *Result if `user` is null:*
   * ```html
   * <ul class="header-links">
   *   <li><a href="/login">Sign In</a></li>
   * </ul>
   * ```
   */
  var IfBinding = fragments.registerAttribute('if', {
    animated: true,
    priority: 50,
    unlessAttrName: 'unless',
    elseIfAttrName: 'else-if',
    elseUnlessAttrName: 'else-unless',
    elseAttrName: 'else',

    compiled: function() {
      var element = this.element;
      var expressions = [ wrapIfExp(this.expression, this.name === this.unlessAttrName) ];
      var placeholder = document.createTextNode('');
      var node = element.nextElementSibling;
      this.element = placeholder;
      element.parentNode.replaceChild(placeholder, element);

      // Stores a template for all the elements that can go into this spot
      this.templates = [ fragments.createTemplate(element) ];

      // Pull out any other elements that are chained with this one
      while (node) {
        var next = node.nextElementSibling;
        var expression;
        if (node.hasAttribute(this.elseIfAttrName)) {
          expression = fragments.codifyExpression('attribute', node.getAttribute(this.elseIfAttrName));
          expressions.push(wrapIfExp(expression, false));
          node.removeAttribute(this.elseIfAttrName);
        } else if (node.hasAttribute(this.elseUnlessAttrName)) {
          expression = fragments.codifyExpression('attribute', node.getAttribute(this.elseUnlessAttrName));
          expressions.push(wrapIfExp(expression, true));
          node.removeAttribute(this.elseUnlessAttrName);
        } else if (node.hasAttribute(this.elseAttrName)) {
          node.removeAttribute(this.elseAttrName);
          next = null;
        } else {
          break;
        }

        node.remove();
        this.templates.push(fragments.createTemplate(node));
        node = next;
      }

      // An expression that will return an index. Something like this `expr ? 0 : expr2 ? 1 : expr3 ? 2 : 3`. This will
      // be used to know which section to show in the if/else-if/else grouping.
      this.expression = expressions.map(function(expr, index) {
        return expr + ' ? ' + index + ' : ';
      }).join('') + expressions.length;
    },

    updated: function(index) {
      // For performance provide an alternate code path for animation
      if (this.animate) {
        this.updatedAnimated(index);
      } else {
        this.updatedRegular(index);
      }
    },

    add: function(view) {
      this.element.parentNode.insertBefore(view, this.element.nextSibling);
    },

    remove: function(view) {
      view.dispose();
    },

    updatedRegular: function(index) {
      if (this.showing) {
        this.remove(this.showing);
        this.showing = null;
      }
      var template = this.templates[index];
      if (template) {
        this.showing = template.createView();
        this.showing.bind(this.context);
        this.add(this.showing);
      }
    },

    updatedAnimated: function(index) {
      this.lastValue = index;
      if (this.animating) {
        return;
      }

      if (this.showing) {
        this.animating = true;
        this.animateOut(this.showing, true, function() {
          this.animating = false;

          if (this.showing) {
            // Make sure this wasn't unbound while we were animating
            this.remove(this.showing);
            this.showing = null;
          }

          if (this.context) {
            // finish by animating the new element in (if any), unless no longer bound
            this.updatedAnimated(this.lastValue);
          }
        });
        return;
      }

      var template = this.templates[index];
      if (template) {
        this.showing = template.createView();
        this.showing.bind(this.context);
        this.add(this.showing);
        this.animating = true;
        this.animateIn(this.showing, function() {
          this.animating = false;
          // if the value changed while this was animating run it again
          if (this.lastValue !== index) {
            this.updatedAnimated(this.lastValue);
          }
        });
      }
    },

    unbound: function() {
      // Clean up
      if (this.showing) {
        this.showing.dispose();
        this.showing = null;
        this.lastValue = null;
        this.animating = false;
      }
    }
  });

  fragments.registerAttribute('unless', IfBinding);

  function wrapIfExp(expr, isUnless) {
    return (isUnless ? '!' : '') + expr;
  }


  /**
   * ## repeat
   * Adds a binder to duplicate an element for each item in an array. The expression may be of the format `epxr` or
   * `itemName in expr` where `itemName` is the name each item inside the array will be referenced by within bindings
   * inside the element.
   *
   * **Example:**
   * ```html
   * <div each="{{post in posts}}" class-featured="{{post.isFeatured}}">
   *   <h1>{{post.title}}</h1>
   *   <div html="{{post.body | markdown}}"></div>
   * </div>
   * ```
   * *Result if there are 2 posts and the first one is featured:*
   * ```html
   * <div class="featured">
   *   <h1>Little Red</h1>
   *   <div>
   *     <p>Little Red Riding Hood is a story about a little girl.</p>
   *     <p>
   *       More info can be found on
   *       <a href="http://en.wikipedia.org/wiki/Little_Red_Riding_Hood">Wikipedia</a>
   *     </p>
   *   </div>
   * </div>
   * <div>
   *   <h1>Big Blue</h1>
   *   <div>
   *     <p>Some thoughts on the New York Giants.</p>
   *     <p>
   *       More info can be found on
   *       <a href="http://en.wikipedia.org/wiki/New_York_Giants">Wikipedia</a>
   *     </p>
   *   </div>
   * </div>
   * ```
   */
  fragments.registerAttribute('repeat', {
    animated: true,
    priority: 100,

    compiled: function() {
      var parent = this.element.parentNode;
      var placeholder = document.createTextNode('');
      parent.insertBefore(placeholder, this.element);
      this.template = fragments.createTemplate(this.element);
      this.element = placeholder;

      var parts = this.expression.split(/\s+in\s+/);
      this.expression = parts.pop();
      var key = parts.pop();
      if (key) {
        parts = key.split(/\s*,\s*/);
        this.valueName = parts.pop();
        this.keyName = parts.pop();
      }
    },

    created: function() {
      this.views = [];
      this.observer.getChangeRecords = true;
    },

    unbound: function() {
      if (this.views.length) {
        this.views.forEach(this.removeView);
        this.views.length = 0;
        this.animating = false;
        this.valueWhileAnimating = null;
      }
    },

    removeView: function(view) {
      view.dispose();
      view._repeatItem_ = null;
    },

    updated: function(value, oldValue, changes) {
      if (!changes) {
        this.populate(value);
      } else {
        if (this.animate) {
          this.updateChangesAnimated(value, changes);
        } else {
          this.updateChanges(value, changes);
        }
      }
    },

    // Method for creating and setting up new views for our list
    createView: function(key, value) {
      var view = this.template.createView();
      var context = value;
      if (this.valueName) {
        context = Object.create(this.context);
        if (this.keyName) context[this.keyName] = key;
        context[this.valueName] = value;
        context._origContext_ = this.context.hasOwnProperty('_origContext_')
          ? this.context._origContext_
          : this.context;
      }
      view.bind(context);
      view._repeatItem_ = value;
      return view;
    },

    populate: function(value) {
      if (this.animating) {
        this.valueWhileAnimating = value;
        return;
      }

      if (this.views.length) {
        this.views.forEach(this.removeView);
        this.views.length = 0;
      }

      if (Array.isArray(value) && value.length) {
        var frag = document.createDocumentFragment();

        value.forEach(function(item, index) {
          var view = this.createView(index, item);
          this.views.push(view);
          frag.appendChild(view);
        }, this);

        this.element.parentNode.insertBefore(frag, this.element.nextSibling);
      }
    },

    /**
     * This un-animated version removes all removed views first so they can be returned to the pool and then adds new
     * views back in. This is the most optimal method when not animating.
     */
    updateChanges: function(value, changes) {
      // Remove everything first, then add again, allowing for element reuse from the pool
      var addedCount = 0;

      changes.forEach(function(splice) {
        addedCount += splice.addedCount;
        if (!splice.removed.length) {
          return;
        }
        var removed = this.views.splice(splice.index - addedCount, splice.removed.length);
        removed.forEach(this.removeView);
      }, this);

      // Add the new/moved views
      changes.forEach(function(splice) {
        if (!splice.addedCount) return;
        var addedViews = [];
        var fragment = document.createDocumentFragment();
        var index = splice.index;
        var endIndex = index + splice.addedCount;

        for (var i = index; i < endIndex; i++) {
          var item = value[i];
          view = this.createView(i, item);
          addedViews.push(view);
          fragment.appendChild(view);
        }
        this.views.splice.apply(this.views, [ index, 0 ].concat(addedViews));
        var previousView = this.views[index - 1];
        var nextSibling = previousView ? previousView.lastViewNode.nextSibling : this.element.nextSibling;
        this.element.parentNode.insertBefore(fragment, nextSibling);
      }, this);
    },

    /**
     * This animated version must animate removed nodes out while added nodes are animating in making it less optimal
     * (but cool looking). It also handles "move" animations for nodes which are moving place within the list.
     */
    updateChangesAnimated: function(value, changes) {
      if (this.animating) {
        this.valueWhileAnimating = value;
        return;
      }
      var animatingValue = value.slice();
      this.animating = true;

      // Run updates which occured while this was animating.
      function whenDone() {
        // The last animation finished will run this
        if (--whenDone.count !== 0) return;

        this.animating = false;
        if (this.valueWhileAnimating) {
          var changes = diff.arrays(this.valueWhileAnimating, animatingValue);
          this.updateChangesAnimated(this.valueWhileAnimating, changes);
          this.valueWhileAnimating = null;
        }
      }
      whenDone.count = 0;

      var allAdded = [];
      var allRemoved = [];

      changes.forEach(function(splice) {
        var addedViews = [];
        var fragment = document.createDocumentFragment();
        var index = splice.index;
        var endIndex = index + splice.addedCount;
        var removedCount = splice.removed.length;

        for (var i = index; i < endIndex; i++) {
          var item = value[i];
          var view = this.createView(i, item);
          addedViews.push(view);
          fragment.appendChild(view);
        }

        var removedViews = this.views.splice.apply(this.views, [ index, removedCount ].concat(addedViews));
        var previousView = this.views[index - 1];
        var nextSibling = previousView ? previousView.lastViewNode.nextSibling : this.element.nextSibling;
        this.element.parentNode.insertBefore(fragment, nextSibling);

        allAdded = allAdded.concat(addedViews);
        allRemoved = allRemoved.concat(removedViews);
      }, this);


      allAdded.forEach(function(view) {
        whenDone.count++;
        this.animateIn(view, whenDone);
      }, this);

      allRemoved.forEach(function(view) {
        whenDone.count++;
        this.animateOut(view, whenDone);
      }, this);
    }
  });
}

},{"../observer/diff":13}],19:[function(require,module,exports){
module.exports = registerDefaults;


/**
 * # Default Formatters
 * Registers default formatters with a fragments object.
 */
function registerDefaults(fragments) {

  /**
   *
   */
  fragments.registerFormatter('tokenList', function(value) {

    if (Array.isArray(value)) {
      return value.join(' ');
    }

    if (value && typeof value === 'object') {
      var classes = [];
      Object.keys(value).forEach(function(className) {
        if (value[className]) {
          classes.push(className);
        }
      });
      return classes.join(' ');
    }

    return value || '';
  });


  /**
   * v TODO v
   */
  fragments.registerFormatter('styles', function(value) {

    if (Array.isArray(value)) {
      return value.join(' ');
    }

    if (value && typeof value === 'object') {
      var classes = [];
      Object.keys(value).forEach(function(className) {
        if (value[className]) {
          classes.push(className);
        }
      });
      return classes.join(' ');
    }

    return value || '';
  });


  /**
   * ## filter
   * Filters an array by the given filter function(s), may provide a function, an
   * array, or an object with filtering functions
   */
  fragments.registerFormatter('filter', function(value, filterFunc) {
    if (!Array.isArray(value)) {
      return [];
    } else if (!filterFunc) {
      return value;
    }

    if (typeof filterFunc === 'function') {
      value = value.filter(filterFunc, this);
    } else if (Array.isArray(filterFunc)) {
      filterFunc.forEach(function(func) {
        value = value.filter(func, this);
      });
    } else if (typeof filterFunc === 'object') {
      Object.keys(filterFunc).forEach(function(key) {
        var func = filterFunc[key];
        if (typeof func === 'function') {
          value = value.filter(func, this);
        }
      });
    }
    return value;
  });


  /**
   * ## map
   * Adds a formatter to map an array or value by the given mapping function
   */
  fragments.registerFormatter('map', function(value, mapFunc) {
    if (value == null || typeof mapFunc !== 'function') {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map(mapFunc, this);
    } else {
      return mapFunc.call(this, value);
    }
  });


  /**
   * ## reduce
   * Adds a formatter to reduce an array or value by the given reduce function
   */
  fragments.registerFormatter('reduce', function(value, reduceFunc, initialValue) {
    if (value == null || typeof mapFunc !== 'function') {
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


  /**
   * ## reduce
   * Adds a formatter to reduce an array or value by the given reduce function
   */
  fragments.registerFormatter('slice', function(value, index, endIndex) {
    if (Array.isArray(value)) {
      return value.slice(index, endIndex);
    } else {
      return value;
    }
  });


  /**
   * ## date
   * Adds a formatter to format dates and strings
   */
  fragments.registerFormatter('date', function(value) {
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


  /**
   * ## log
   * Adds a formatter to log the value of the expression, useful for debugging
   */
  fragments.registerFormatter('log', function(value, prefix) {
    if (prefix == null) prefix = 'Log:';
    console.log(prefix, value);
    return value;
  });


  /**
   * ## limit
   * Adds a formatter to limit the length of an array or string
   */
  fragments.registerFormatter('limit', function(value, limit) {
    if (value && typeof value.slice === 'function') {
      if (limit < 0) {
        return value.slice(limit);
      } else {
        value.slice(0, limit);
      }
    } else {
      return value;
    }
  });


  /**
   * ## sort
   * Sorts an array given a field name or sort function, and a direction
   */
  fragments.registerFormatter('sort', function(value, sortFunc, dir) {
    if (!sortFunc || !Array.isArray(value)) {
      return value;
    }
    dir = (dir === 'desc') ? -1 : 1;
    if (typeof sortFunc === 'string') {
      var parts = sortFunc.split(':');
      var prop = parts[0];
      var dir2 = parts[1];
      dir2 = (dir2 === 'desc') ? -1 : 1;
      dir = dir || dir2;
      var sortFunc = function(a, b) {
        if (a[prop] > b[prop]) return dir;
        if (a[prop] < b[prop]) return -dir;
        return 0;
      };
    } else if (dir === -1) {
      var origFunc = sortFunc;
      sortFunc = function(a, b) { return -origFunc(a, b); };
    }

    return value.slice().sort(sortFunc);
  });


  /**
   * ## addQuery
   * Takes the input URL and adds (or replaces) the field in the query
   */
  fragments.registerFormatter('addQuery', function(value, queryField, queryValue) {
    var url = value || location.href;
    var parts = url.split('?');
    url = parts[0];
    var query = parts[1];
    var addedQuery = '';
    if (queryValue != null) {
      addedQuery = queryField + '=' + encodeURIComponent(queryValue);
    }

    if (query) {
      var expr = new RegExp('\\b' + queryField + '=[^&]*');
      if (expr.test(query)) {
        query = query.replace(expr, addedQuery);
      } else if (addedQuery) {
        query += '&' + addedQuery;
      }
    } else {
      query = addedQuery;
    }
    if (query) {
      url += '?' + query;
    }
    return url;
  });


  var div = document.createElement('div')
  function escapeHTML(value) {
    div.textContent = value || '';
    return div.innerHTML;
  }


  /**
   * ## escape
   * HTML escapes content. For use with other HTML-adding formatters such as autolink.
   *
   * **Example:**
   * ```xml
   * <div bind-html="tweet.content | escape | autolink:true"></div>
   * ```
   * *Result:*
   * ```xml
   * <div>Check out <a href="https://github.com/chip-js/" target="_blank">https://github.com/chip-js/</a>!</div>
   * ```
   */
  fragments.registerFormatter('escape', escapeHTML);


  /**
   * ## p
   * HTML escapes content wrapping paragraphs in <p> tags.
   *
   * **Example:**
   * ```xml
   * <div bind-html="tweet.content | p | autolink:true"></div>
   * ```
   * *Result:*
   * ```xml
   * <div><p>Check out <a href="https://github.com/chip-js/" target="_blank">https://github.com/chip-js/</a>!</p>
   * <p>It's great</p></div>
   * ```
   */
  fragments.registerFormatter('p', function(value) {
    var lines = (value || '').split(/\r?\n/);
    var escaped = lines.map(function(line) { return escapeHTML(line) || '<br>'; });
    return '<p>' + escaped.join('</p><p>') + '</p>';
  });


  /**
   * ## br
   * HTML escapes content adding <br> tags in place of newlines characters.
   *
   * **Example:**
   * ```xml
   * <div bind-html="tweet.content | br | autolink:true"></div>
   * ```
   * *Result:*
   * ```xml
   * <div>Check out <a href="https://github.com/chip-js/" target="_blank">https://github.com/chip-js/</a>!<br>
   * It's great</div>
   * ```
   */
  fragments.registerFormatter('br', function(value) {
    var lines = (value || '').split(/\r?\n/);
    return lines.map(escapeHTML).join('<br>');
  });


  /**
   * ## newline
   * HTML escapes content adding <p> tags at double newlines and <br> tags in place of single newline characters.
   *
   * **Example:**
   * ```xml
   * <div bind-html="tweet.content | newline | autolink:true"></div>
   * ```
   * *Result:*
   * ```xml
   * <div><p>Check out <a href="https://github.com/chip-js/" target="_blank">https://github.com/chip-js/</a>!<br>
   * It's great</p></div>
   * ```
   */
  fragments.registerFormatter('newline', function(value) {
    var paragraphs = (value || '').split(/\r?\n\s*\r?\n/);
    var escaped = paragraphs.map(function(paragraph) {
      var lines = paragraph.split(/\r?\n/);
      return lines.map(escapeHTML).join('<br>');
    });
    return '<p>' + escaped.join('</p><p>') + '</p>';
  });



  var urlExp = /(^|\s|\()((?:https?|ftp):\/\/[\-A-Z0-9+\u0026@#\/%?=()~_|!:,.;]*[\-A-Z0-9+\u0026@#\/%=~(_|])/gi;
  /**
   * ## autolink
   * Adds automatic links to escaped content (be sure to escape user content). Can be used on existing HTML content as it
   * will skip URLs within HTML tags. Passing true in the second parameter will set the target to `_blank`.
   *
   * **Example:**
   * ```xml
   * <div bind-html="tweet.content | escape | autolink:true"></div>
   * ```
   * *Result:*
   * ```xml
   * <div>Check out <a href="https://github.com/chip-js/" target="_blank">https://github.com/chip-js/</a>!</div>
   * ```
   */
  fragments.registerFormatter('autolink', function(value, target) {
    target = (target) ? ' target="_blank"' : '';

    return ('' + value).replace(/<[^>]+>|[^<]+/g, function(match) {
      if (match.charAt(0) === '<') {
        return match;
      }
      return match.replace(urlExp, '$1<a href="$2"' + target + '>$2</a>');
    });
  });


  /**
   *
   */
  fragments.registerFormatter('int', function(value) {
    value = parseInt(value);
    return isNaN(value) ? null : value;
  });


  /**
   *
   */
  fragments.registerFormatter('float', function(value) {
    value = parseFloat(value);
    return isNaN(value) ? null : value;
  });


  /**
   *
   */
  fragments.registerFormatter('bool', function(value) {
    return value && value !== '0' && value !== 'false';
  });
}

},{}],20:[function(require,module,exports){
module.exports = Template;
var View = require('./view');
var extend = require('./util/extend');


/**
 * ## Template
 * Takes an HTML string, an element, an array of elements, or a document fragment, and compiles it into a template.
 * Instances may then be created and bound to a given context.
 * @param {String|NodeList|HTMLCollection|HTMLTemplateElement|HTMLScriptElement|Node} html A Template can be created
 * from many different types of objects. Any of these will be converted into a document fragment for the template to
 * clone. Nodes and elements passed in will be removed from the DOM.
 */
function Template() {
  this.pool = [];
}


Template.prototype = {

  /**
   * Creates a new view cloned from this template.
   */
  createView: function() {
    if (this.pool.length) {
      return this.pool.pop();
    }

    return extend.make(View, document.importNode(this, true), this);
  },

  returnView: function(view) {
    if (this.pool.indexOf(view) === -1) {
      this.pool.push(view);
    }
  }
};

},{"./util/extend":22,"./view":24}],21:[function(require,module,exports){
// Helper methods for animation
exports.makeElementAnimatable = makeElementAnimatable;
exports.getComputedCSS = getComputedCSS;
exports.animateElement = animateElement;

function makeElementAnimatable(element) {
  // Add polyfill just on this element
  if (!element.animate) {
    element.animate = animateElement;
  }

  // Not a polyfill but a helper
  if (!element.getComputedCSS) {
    element.getComputedCSS = getComputedCSS;
  }

  return element;
}

/**
 * Get the computed style on an element.
 */
function getComputedCSS(styleName) {
  if (this.ownerDocument.defaultView.opener) {
    return this.ownerDocument.defaultView.getComputedStyle(this)[styleName];
  }
  return window.getComputedStyle(this)[styleName];
}

/**
 * Very basic polyfill for Element.animate if it doesn't exist. If it does, use the native.
 * This only supports two css states. It will overwrite existing styles. It doesn't return an animation play control. It
 * only supports duration, delay, and easing. Returns an object with a property onfinish.
 */
function animateElement(css, options) {
  if (!Array.isArray(css) || css.length !== 2) {
    throw new TypeError('animate polyfill requires an array for css with an initial and final state');
  }

  if (!options || !options.hasOwnProperty('duration')) {
    throw new TypeError('animate polyfill requires options with a duration');
  }

  var duration = options.duration || 0;
  var delay = options.delay || 0;
  var easing = options.easing;
  var initialCss = css[0];
  var finalCss = css[1];
  var allCss = {};
  var playback = { onfinish: null };

  Object.keys(initialCss).forEach(function(key) {
    allCss[key] = true;
    element.style[key] = initialCss[key];
  });

  // trigger reflow
  element.offsetWidth;

  var transitionOptions = ' ' + duration + 'ms';
  if (easing) {
    transitionOptions += ' ' + easing;
  }
  if (delay) {
    transitionOptions += ' ' + delay + 'ms';
  }

  element.style.transition = Object.keys(finalCss).map(function(key) {
    return key + transitionOptions
  }).join(', ');

  Object.keys(finalCss).forEach(function(key) {
    allCss[key] = true;
    element.style[key] = finalCss[key];
  });

  setTimeout(function() {
    Object.keys(allCss).forEach(function(key) {
      element.style[key] = '';
    });

    if (playback.onfinish) {
      playback.onfinish();
    }
  }, duration + delay);

  return playback;
}

},{}],22:[function(require,module,exports){
var global = (function() { return this })();
var slice = Array.prototype.slice;
module.exports = extend;
extend.make = make;


/**
 * Creates a new prototype for the given contructor and sets an `extend` method on it. If `extend` is called from a
 * it will extend that class.
 */
function extend(constructor, prototype) {
  var superClass = this === global ? Object : this;
  if (typeof constructor !== 'function' && !prototype) {
    prototype = constructor;
    constructor = function() {
      superClass.apply(this, arguments);
    };
  }
  constructor.extend = extend;
  var descriptors = getPrototypeDescriptors(constructor, prototype);
  constructor.prototype = Object.create(superClass.prototype, descriptors);
  return constructor;
}


/**
 * Makes a native object pretend to be a class (e.g. adds methods to a DocumentFragment and calls the constructor).
 */
function make(constructor, object) {
  if (typeof constructor !== 'function' || typeof object !== 'object') {
    throw new TypeError('make must accept a function constructor and an object');
  }
  var args = slice.call(arguments, 2);
  var proto = constructor.prototype;
  for (var key in proto) {
    object[key] = proto[key];
  }
  constructor.apply(object, args);
  return object;
}


function getPrototypeDescriptors(constructor, prototype) {
  var descriptors = {
    constructor: { writable: true, configurable: true, value: constructor }
  };

  Object.getOwnPropertyNames(prototype).forEach(function(name) {
    var descriptor = Object.getOwnPropertyDescriptor(prototype, name);
    descriptor.enumerable = false;
    descriptors[name] = descriptor;
  });
  return descriptors;
}

},{}],23:[function(require,module,exports){
module.exports = toFragment;

// Convert stuff into document fragments. Stuff can be:
// * A string of HTML text
// * An element or text node
// * A NodeList or HTMLCollection (e.g. `element.childNodes` or `element.children`)
// * A jQuery object
// * A script element with a `type` attribute of `"text/*"` (e.g. `<script type="text/html">My template code!</script>`)
// * A template element (e.g. `<template>My template code!</template>`)
function toFragment(html) {
  if (html instanceof DocumentFragment) {
    return html;
  } else if (typeof html === 'string') {
    return stringToFragment(html);
  } else if (html instanceof Node) {
    return nodeToFragment(html);
  } else if (html.hasOwnProperty('length')) {
    return listToFragment(html);
  } else {
    throw new TypeError('Unsupported Template Type: Cannot convert `' + html + '` into a document fragment.');
  }
}

// Converts an HTML node into a document fragment. If it is a <template> node its contents will be used. If it is a
// <script> node its string-based contents will be converted to HTML first, then used. Otherwise a clone of the node
// itself will be used.
function nodeToFragment(node) {
  if (node.content instanceof DocumentFragment) {
    return node.content;
  } else if (node.tagName === 'SCRIPT') {
    return stringToFragment(node.innerHTML);
  } else {
    var fragment = document.createDocumentFragment();
    if (node.tagName === 'TEMPLATE') {
      for (var i = 0, l = node.childNodes.length; i < l; i++) {
        fragment.appendChild(node.childNodes[i]);
      }
    } else {
      fragment.appendChild(node);
    }
    return fragment;
  }
}

// Converts an HTMLCollection, NodeList, jQuery object, or array into a document fragment.
function listToFragment(list) {
  var fragment = document.createDocumentFragment();
  for (var i = 0, l = list.length; i < l; i++) {
    // Use toFragment since this may be an array of text, a jQuery object of `<template>`s, etc.
    fragment.appendChild(toFragment(list[i]));
  }
  return fragment;
}

// Converts a string of HTML text into a document fragment.
function stringToFragment(string) {
  var templateElement;
  templateElement = document.createElement('template');
  templateElement.innerHTML = string;
  return templateElement.content;
}

// If HTML Templates are not available (e.g. in IE) then use an older method to work with certain elements.
if (!document.createElement('template').content instanceof DocumentFragment) {
  stringToFragment = (function() {
    var tagExp = /<([\w:-]+)/;

    // Copied from jQuery (https://github.com/jquery/jquery/blob/master/LICENSE.txt)
    var wrapMap = {
      option: [ 1, '<select multiple="multiple">', '</select>' ],
      legend: [ 1, '<fieldset>', '</fieldset>' ],
      thead: [ 1, '<table>', '</table>' ],
      tr: [ 2, '<table><tbody>', '</tbody></table>' ],
      td: [ 3, '<table><tbody><tr>', '</tr></tbody></table>' ],
      col: [ 2, '<table><tbody></tbody><colgroup>', '</colgroup></table>' ],
      area: [ 1, '<map>', '</map>' ],
      _default: [ 0, '', '' ]
    };
    wrapMap.optgroup = wrapMap.option;
    wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
    wrapMap.th = wrapMap.td;

    return function stringToFragment(string) {
      var tag = string.match(tagExp);
      var parts = wrapMap[tag] || wrapMap._default;
      var depth = parts[0];
      var prefix = parts[1];
      var postfix = parts[2];
      var div = document.createElement('div');
      div.innerHTML = prefix + string + postfix;
      while (depth--) {
        div = div.lastChild;
      }
      var fragment = document.createDocumentFragment();
      while (div.firstChild) {
        fragment.appendChild(div.firstChild);
      }
      return fragment;
    };
  })();
}

},{}],24:[function(require,module,exports){
module.exports = View;


/**
 * ## View
 * A DocumentFragment with bindings.
 */
function View(template) {
  this.template = template;
  this.firstViewNode = this.firstChild;
  this.lastViewNode = this.lastChild;
  if (this.firstViewNode) {
    this.firstViewNode.view = this;
    this.lastViewNode.view = this;
  }
  this.bindings = this.template.bindings.map(function(binding) {
    return binding.cloneForView(this);
  }, this);
}


View.prototype = {

  /**
   * Removes a view from the DOM. A view is a DocumentFragment, so `remove()` returns all its nodes to itself.
   */
  remove: function() {
    var node = this.firstViewNode;
    var next;

    if (node.parentNode !== this) {
      // Remove all the nodes and put them back into this fragment
      while (node) {
        next = (node === this.lastViewNode) ? null : node.nextSibling;
        this.appendChild(node);
        node = next;
      }
    }

    return this;
  },


  /**
   * Removes a view (if not already removed) and adds the view to its template's pool.
   */
  dispose: function() {
    // Make sure the view is removed from the DOM
    this.unbind();
    this.remove();
    if (this.template) {
      this.template.returnView(this);
    }
  },


  /**
   * Binds a view to a given context.
   */
  bind: function(context) {
    this.bindings.forEach(function(binding) {
      binding.bind(context);
    });
  },


  /**
   * Unbinds a view from any context.
   */
  unbind: function() {
    this.bindings.forEach(function(binding) {
      binding.unbind();
    });
  }
};

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsInNyYy9hcHAuanMiLCJzcmMvYmluZGVycy5qcyIsInNyYy9jaGlwLmpzIiwic3JjL2NvbnRyb2xsZXIuanMiLCJzcmMvZXZlbnRzLmpzIiwic3JjL3JvdXRlci5qcyIsIi4uL2ZyYWdtZW50cy1qcy9pbmRleC5qcyIsIi4uL2ZyYWdtZW50cy1qcy9zcmMvYW5pbWF0ZWRCaW5kaW5nLmpzIiwiLi4vZnJhZ21lbnRzLWpzL3NyYy9iaW5kaW5nLmpzIiwiLi4vZnJhZ21lbnRzLWpzL3NyYy9jb21waWxlLmpzIiwiLi4vZnJhZ21lbnRzLWpzL3NyYy9mcmFnbWVudHMuanMiLCIuLi9mcmFnbWVudHMtanMvc3JjL29ic2VydmVyL2RpZmYuanMiLCIuLi9mcmFnbWVudHMtanMvc3JjL29ic2VydmVyL2V4cHJlc3Npb24uanMiLCIuLi9mcmFnbWVudHMtanMvc3JjL29ic2VydmVyL2luZGV4LmpzIiwiLi4vZnJhZ21lbnRzLWpzL3NyYy9vYnNlcnZlci9vYnNlcnZlci5qcyIsIi4uL2ZyYWdtZW50cy1qcy9zcmMvcmVnaXN0ZXJlZC9hbmltYXRpb25zLmpzIiwiLi4vZnJhZ21lbnRzLWpzL3NyYy9yZWdpc3RlcmVkL2JpbmRlcnMuanMiLCIuLi9mcmFnbWVudHMtanMvc3JjL3JlZ2lzdGVyZWQvZm9ybWF0dGVycy5qcyIsIi4uL2ZyYWdtZW50cy1qcy9zcmMvdGVtcGxhdGUuanMiLCIuLi9mcmFnbWVudHMtanMvc3JjL3V0aWwvYW5pbWF0aW9uLmpzIiwiLi4vZnJhZ21lbnRzLWpzL3NyYy91dGlsL2V4dGVuZC5qcyIsIi4uL2ZyYWdtZW50cy1qcy9zcmMvdXRpbC90b0ZyYWdtZW50LmpzIiwiLi4vZnJhZ21lbnRzLWpzL3NyYy92aWV3LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbk1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3prQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdFlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4WUE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3ekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vc3JjL2NoaXAnKTtcbiIsIm1vZHVsZS5leHBvcnRzID0gQXBwO1xudmFyIFJvdXRlciA9IHJlcXVpcmUoJy4vcm91dGVyJyk7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnLi9ldmVudHMnKTtcbnZhciBjcmVhdGVGcmFnbWVudHMgPSByZXF1aXJlKCdmcmFnbWVudHMtanMnKS5jcmVhdGU7XG52YXIgQ29udHJvbGxlciA9IHJlcXVpcmUoJy4vY29udHJvbGxlcicpO1xudmFyIGZvckVhY2ggPSBBcnJheS5wcm90b3R5cGUuZm9yRWFjaDtcbnZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcblxuLy8gIyBDaGlwIEFwcFxuXG4vLyBBbiBBcHAgcmVwcmVzZW50cyBhbiBhcHAgb3IgbW9kdWxlIHRoYXQgY2FuIGhhdmUgcm91dGVzLCBjb250cm9sbGVycywgYW5kIHRlbXBsYXRlcyBkZWZpbmVkLlxuZnVuY3Rpb24gQXBwKG5hbWUpIHtcbiAgQ29udHJvbGxlci5jYWxsKHRoaXMpO1xuICBFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcbiAgdGhpcy5mcmFnbWVudHMgPSBjcmVhdGVGcmFnbWVudHMoKTtcbiAgdGhpcy5hcHAgPSB0aGlzO1xuICB0aGlzLm5hbWUgPSBuYW1lO1xuICB0aGlzLmNvbnRyb2xsZXJzID0ge307XG4gIHRoaXMudGVtcGxhdGVzID0ge307XG4gIHRoaXMucm91dGVyID0gbmV3IFJvdXRlcigpO1xuICB0aGlzLnJvdXRlUGF0aCA9IFtdO1xuICB0aGlzLnJvb3RFbGVtZW50ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICB0aGlzLnN5bmMgPSB0aGlzLnN5bmMuYmluZCh0aGlzKTtcbiAgdGhpcy5yb3V0ZXIub24oJ2Vycm9yJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdyb3V0ZUVycm9yJywgeyBkZXRhaWw6IGV2ZW50LmRldGFpbCB9KSk7XG4gIH0sIHRoaXMpO1xuXG4gIHJlcXVpcmUoJy4vYmluZGVycycpKHRoaXMpO1xufVxuXG5BcHAucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShDb250cm9sbGVyLnByb3RvdHlwZSk7XG5BcHAucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQXBwO1xuXG5cbi8vIEluaXRpYWxpemVzIHRlbXBsYXRlcyBhbmQgY29udHJvbGxlcnMgZnJvbSB0aGUgZW50aXJlIHBhZ2Ugb3IgdGhlIGByb290YCBlbGVtZW50IGlmIHByb3ZpZGVkLlxuQXBwLnByb3RvdHlwZS5pbml0QXBwID0gZnVuY3Rpb24ocm9vdCkge1xuICBpZiAodGhpcy5jb25zdHJ1Y3RvciAhPT0gQXBwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdpbml0QXBwIG11c3QgYmUgY2FsbGVkIGZyb20gdGhlIGFwcCBpbnN0YW5jZSwgbm90IGEgY29udHJvbGxlcicpO1xuICB9XG5cbiAgaWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgPT09ICdsb2FkaW5nJykge1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCB0aGlzLmluaXRBcHAuYmluZCh0aGlzLCByb290KSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKHRoaXMuaW5pdGVkKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdGhpcy5pbml0ZWQgPSB0cnVlXG4gIGlmIChyb290KSB7XG4gICAgdGhpcy5yb290RWxlbWVudCA9IHJvb3Q7XG4gIH1cblxuICBmb3JFYWNoLmNhbGwodGhpcy5yb290RWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKCdzY3JpcHRbdHlwZT1cInRleHQvaHRtbFwiXSwgdGVtcGxhdGUnKSwgZnVuY3Rpb24oc2NyaXB0KSB7XG4gICAgdmFyIG5hbWUgPSBzY3JpcHQuZ2V0QXR0cmlidXRlKCduYW1lJykgfHwgc2NyaXB0LmlkO1xuICAgIGlmIChuYW1lKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlKG5hbWUsIHNjcmlwdCk7XG4gICAgICBzY3JpcHQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChzY3JpcHQpO1xuICAgIH1cbiAgfSwgdGhpcyk7XG5cbiAgdGhpcy5hcHBDb250cm9sbGVyID0gdGhpcy5jcmVhdGVDb250cm9sbGVyKHsgZWxlbWVudDogdGhpcy5yb290RWxlbWVudCwgbmFtZTogJ2FwcGxpY2F0aW9uJyB9KTtcbn07XG5cblxuLy8gVGVtcGxhdGVzXG4vLyAtLS0tLS0tLS1cblxuLy8gUmVnaXN0ZXJzIGEgbmV3IHRlbXBsYXRlIGJ5IG5hbWUgd2l0aCB0aGUgcHJvdmlkZWQgYGNvbnRlbnRgIHN0cmluZy4gSWYgbm8gYGNvbnRlbnRgIGlzIGdpdmVuIHRoZW4gcmV0dXJucyBhIG5ld1xuLy8gaW5zdGFuY2Ugb2YgYSBkZWZpbmVkIHRlbXBsYXRlLiBUaGlzIGluc3RhbmNlIGlzIGEgZG9jdW1lbnQgZnJhZ21lbnQuXG5BcHAucHJvdG90eXBlLnRlbXBsYXRlID0gZnVuY3Rpb24obmFtZSwgY29udGVudCkge1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICB0aGlzLnRlbXBsYXRlc1tuYW1lXSA9IHRoaXMuZnJhZ21lbnRzLmNyZWF0ZVRlbXBsYXRlKGNvbnRlbnQpO1xuICAgIHJldHVybiB0aGlzO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB0aGlzLnRlbXBsYXRlc1tuYW1lXTtcbiAgfVxufTtcblxuXG5BcHAucHJvdG90eXBlLmNvbXBvbmVudCA9IGZ1bmN0aW9uKGVsZW1lbnROYW1lLCB0ZW1wbGF0ZU5hbWUpIHtcbiAgdmFyIGZyYWdtZW50cyA9IHRoaXMuZnJhZ21lbnRzO1xuICBmcmFnbWVudHMucmVnaXN0ZXJFbGVtZW50KGVsZW1lbnROYW1lLCB7XG4gICAgcHJpb3JpdHk6IDIwMCxcbiAgICBjb21waWxlZDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZWxlbSA9IHRoaXMuZWxlbWVudDtcbiAgICAgIHZhciBkZWZhdWx0QmluZGVyID0gZnJhZ21lbnRzLmdldEF0dHJpYnV0ZUJpbmRlcignX19kZWZhdWx0X18nKTtcblxuICAgICAgc2xpY2UuY2FsbChlbGVtLmF0dHJpYnV0ZXMpLmZvckVhY2goZnVuY3Rpb24oYXR0cikge1xuICAgICAgICAvLyBDb252ZXJ0IG5vbi1iaW5kaW5nIGF0dHJpYnV0ZXMgaW50byBsb2NhbCBiaW5kaW5nc1xuICAgICAgICB2YXIgQmluZGVyID0gZnJhZ21lbnRzLmZpbmRCaW5kZXIoJ2F0dHJpYnV0ZScsIGF0dHIubmFtZSwgYXR0ci52YWx1ZSk7XG4gICAgICAgIGlmICghQmluZGVyIHx8IEJpbmRlciA9PT0gZGVmYXVsdEJpbmRlcikge1xuICAgICAgICAgIGVsZW0uc2V0QXR0cmlidXRlKCd7JyArIGF0dHIubmFtZSArICd9Jyk7XG4gICAgICAgICAgZWxlbS5yZW1vdmVBdHRyaWJ1dGVOb2RlKGF0dHIpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH0pXG59O1xuXG5cbi8vIENvbnRyb2xsZXJzXG4vLyAtLS0tLS0tLS1cblxuLy8gRGVmaW5lcyBhIGNvbnRyb2xsZXIgaW5pdGlhbGl6YXRpb24gZnVuY3Rpb24uIFJlZ2lzdGVycyB0aGUgYGluaXRGdW5jdGlvbmAgZnVuY3Rpb24gd2l0aCBgbmFtZWAuIFRoZSBmdW5jdGlvbiB3aWxsXG4vLyBiZSBjYWxsZWQgd2l0aCBhbiBpbnN0YW5jZSBvZiBhIGNvbnRyb2xsZXIgYXMgaXRzIG9ubHkgcGFyYW1ldGVyIGV2ZXJ5IHRpbWUgYSBjb250cm9sbGVyIGlzIGNyZWF0ZWQgd2l0aCB0aGF0XG4vLyBuYW1lLlxuLy9cbi8vIElmIG5vIGBpbml0RnVuY3Rpb25gIGlzIHByb3ZpZGVkLCByZXR1cm5zIHRoZSBgaW5pdEZ1bmN0aW9uYCBwcmV2aW91c2x5IHJlZ2lzdGVyZWQgb3IgaWYgbm9uZSBoYXMgYmVlbiByZWdpc3RlcmVkXG4vLyBhIGZ1bmN0aW9uIG9uIHRoZSBnbG9iYWwgc2NvcGUgd2l0aCB0aGUgbmFtZSBgbmFtZSArICdDb250cm9sbGVyJ2AgKGUuZy4gYGZ1bmN0aW9uIGJsb2dDb250cm9sbGVyKCl7fWApLlxuLy9cbi8vICoqRXhhbXBsZToqKlxuLy9gYGBqYXZhc2NyaXB0XG4vLyBhcHAuY29udHJvbGxlcignaG9tZScsIGZ1bmN0aW9uKGNvbnRyb2xsZXIpIHtcbi8vICAgLy8gZG8gc29tZXRoaW5nIGFzIHNvb24gYXMgaXQgaXMgaW5zdGFudGlhdGVkXG4vLyAgIE15QXBwQVBJLmxvYWRVc2VyKGZ1bmN0aW9uKGVyciwgdXNlcikge1xuLy8gICAgIGNvbnRyb2xsZXIudXNlciA9IHVzZXJcbi8vICAgICBjb250cm9sbGVyLnN5bmMoKVxuLy8gICB9KVxuLy9cbi8vICAgLy8gcHJvdmlkZSBhIGZ1bmN0aW9uIGZvciB0aGUgdmlldyB0byBjYWxsLiBFLmcuIDxidXR0b24gb24tY2xpY2s9XCJsb2dvdXRcIj5Mb2dvdXQ8L2J1dHRvbj5cbi8vICAgY29udHJvbGxlci5sb2dvdXQgPSBmdW5jdGlvbigpIHtcbi8vICAgICBNeUFwcEFQSS5sb2dvdXQoZnVuY3Rpb24oZXJyKSB7XG4vLyAgICAgICBjb250cm9sbGVyLnVzZXIgPSBudWxsXG4vLyAgICAgICBjb250cm9sbGVyLnN5bmMoKVxuLy8gICAgIH0pXG4vLyAgIH1cbi8vIH0pXG4vLyBgYGBcbkFwcC5wcm90b3R5cGUuY29udHJvbGxlciA9IGZ1bmN0aW9uKG5hbWUsIGluaXRGdW5jdGlvbikge1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICB0aGlzLmNvbnRyb2xsZXJzW25hbWVdID0gaW5pdEZ1bmN0aW9uO1xuICAgIHJldHVybiB0aGlzO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB0aGlzLmNvbnRyb2xsZXJzW25hbWVdIHx8IHdpbmRvd1tuYW1lICsgJ0NvbnRyb2xsZXInXTtcbiAgfVxufTtcblxuXG4vLyBDcmVhdGVzIGEgbmV3IGNvbnRyb2xsZXIuIFNldHMgYG9wdGlvbnMucGFyZW50YCBhcyB0aGUgcGFyZW50IGNvbnRyb2xsZXIgdG8gdGhpcyBvbmUuIFNldHMgYG9wdGlvbnMucHJvcGVydGllc2Bcbi8vIHByb3BlcnRpZXMgb250byB0aGUgY29udHJvbGxlciBiZWZvcmUgYmluZGluZyBhbmQgaW5pdGlhbGl6YXRpb24uIEJpbmRzIGBvcHRpb25zLmVsZW1lbnRgIHRvIHRoZSBjb250cm9sbGVyIHdoaWNoXG4vLyB1cGRhdGVzIEhUTUwgYXMgZGF0YSB1cGRhdGVzLiBJbml0aWFsaXplcyB0aGUgbmV3IGNvbnRyb2xsZXIgd2l0aCB0aGUgYG9wdGlvbnMubmFtZWAgZnVuY3Rpb24gc2V0IGluXG4vLyBgYXBwLmNvbnRyb2xsZXIoKWAuIFNldHMgdGhlIG5ldyBjb250cm9sbGVyIGFzIGEgcGFzc3Rocm91Z2ggY29udHJvbGxlciBpZiBgb3B0aW9ucy5wYXNzdGhyb3VnaGAgaXMgdHJ1ZS5cbkFwcC5wcm90b3R5cGUuY3JlYXRlQ29udHJvbGxlciA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgaWYgKCFvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IHt9O1xuICB9XG5cbiAgdmFyIGNvbnRyb2xsZXI7XG4gIHZhciBwYXJlbnQgPSBvcHRpb25zLnBhcmVudCB8fCB0aGlzO1xuXG4gIC8vIElmIGBvcHRpb25zLnBhcmVudGAgaXMgcHJvdmlkZWQsIHRoZSBuZXcgY29udHJvbGxlciB3aWxsIGV4dGVuZCBpdC4gQW55IGRhdGEgb3IgbWV0aG9kcyBvbiB0aGUgcGFyZW50IGNvbnRyb2xsZXJcbiAgLy8gd2lsbCBiZSBhdmFpbGFibGUgdG8gdGhlIGNoaWxkIHVubGVzcyBvdmVyd3JpdHRlbiBieSB0aGUgY2hpbGQuIFRoaXMgdXNlcyB0aGUgcHJvdG90eXBlIGNoYWluLCB0aHVzIG92ZXJ3cml0aW5nIGFcbiAgLy8gcHJvcGVydHkgb25seSBzZXRzIGl0IG9uIHRoZSBjaGlsZCBhbmQgZG9lcyBub3QgY2hhbmdlIHRoZSBwYXJlbnQuIFRoZSBjaGlsZCBjYW5ub3Qgc2V0IGRhdGEgb24gdGhlIHBhcmVudCwgb25seVxuICAvLyByZWFkIGl0IG9yIGNhbGwgbWV0aG9kcyBvbiBpdC5cbiAgY29udHJvbGxlciA9IE9iamVjdC5jcmVhdGUocGFyZW50KTtcbiAgY29udHJvbGxlci5fcGFyZW50ID0gcGFyZW50O1xuICBDb250cm9sbGVyLmNhbGwoY29udHJvbGxlcik7XG4gIHBhcmVudC5fY2hpbGRyZW4ucHVzaChjb250cm9sbGVyKTtcblxuICAvLyBJZiBgcHJvcGVydGllc2AgaXMgcHJvdmlkZWQsIGFsbCBwcm9wZXJ0aWVzIGZyb20gdGhhdCBvYmplY3Qgd2lsbCBiZSBjb3BpZWQgb3ZlciB0byB0aGUgY29udHJvbGxlciBiZWZvcmUgaXQgaXNcbiAgLy8gaW5pdGlhbGl6ZWQgYnkgaXRzIGRlZmluaXRpb24gb3IgYm91bmQgdG8gaXRzIGVsZW1lbnQuXG4gIGlmIChvcHRpb25zLnByb3BlcnRpZXMpIHtcbiAgICBPYmplY3Qua2V5cyhvcHRpb25zLnByb3BlcnRpZXMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICBjb250cm9sbGVyW2tleV0gPSBvcHRpb25zLnByb3BlcnRpZXNba2V5XTtcbiAgICB9KTtcbiAgfVxuXG4gIGlmIChvcHRpb25zLmVsZW1lbnQpIHtcbiAgICAvLyBDbGVhbiB1cCBvbGQgY29udHJvbGxlciBpZiBvbmUgZXhpc3RzXG4gICAgaWYgKG9wdGlvbnMuZWxlbWVudC5jb250cm9sbGVyKSB7XG4gICAgICBvcHRpb25zLmVsZW1lbnQudW5iaW5kKCk7XG4gICAgICBvcHRpb25zLmVsZW1lbnQuY29udHJvbGxlci5jbG9zZUNvbnRyb2xsZXIoKTtcbiAgICB9XG5cbiAgICAvLyBBc3NpZ24gZWxlbWVudFxuICAgIGNvbnRyb2xsZXIuZWxlbWVudCA9IG9wdGlvbnMuZWxlbWVudDtcbiAgICBjb250cm9sbGVyLmVsZW1lbnQuY29udHJvbGxlciA9IGNvbnRyb2xsZXI7XG4gIH1cblxuICAvLyBJZiBgbmFtZWAgaXMgc3VwcGxpZWQgdGhlIGNvbnRyb2xsZXIgZGVmaW5pdGlvbiBieSB0aGF0IG5hbWUgd2lsbCBiZSBydW4gdG8gaW5pdGlhbGl6ZSB0aGlzIGNvbnRyb2xsZXIgYmVmb3JlIHRoZVxuICAvLyBiaW5kaW5ncyBhcmUgc2V0IHVwLlxuICBpZiAob3B0aW9ucy5uYW1lKSB7XG4gICAgdmFyIGluaXRGdW5jdGlvbiA9IHRoaXMuY29udHJvbGxlcihvcHRpb25zLm5hbWUpO1xuICAgIGlmIChpbml0RnVuY3Rpb24pIHtcbiAgICAgIGluaXRGdW5jdGlvbihjb250cm9sbGVyKTtcbiAgICB9XG4gIH1cblxuICAvLyBCaW5kcyB0aGUgZWxlbWVudCB0byB0aGUgbmV3IGNvbnRyb2xsZXJcbiAgaWYgKG9wdGlvbnMuZWxlbWVudCkge1xuICAgIHRoaXMuZnJhZ21lbnRzLmJpbmRFbGVtZW50KG9wdGlvbnMuZWxlbWVudCwgY29udHJvbGxlcik7XG4gIH1cblxuICByZXR1cm4gY29udHJvbGxlcjtcbn07XG5cbi8vIFN5bmNzIHRoZSBvYnNlcnZlcnMgdG8gcHJvcG9nYXRlIGNoYW5nZXMgdG8gdGhlIEhUTUwsIGNhbGwgY2FsbGJhY2sgYWZ0ZXJcbkFwcC5wcm90b3R5cGUuc3luYyA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gIHRoaXMuZnJhZ21lbnRzLnN5bmMoY2FsbGJhY2spO1xuICByZXR1cm4gdGhpcztcbn07XG5cblxuLy8gUm91dGluZ1xuLy8gLS0tLS0tXG5cbi8vIFJlZ2lzdGVycyBhIGBjYWxsYmFja2AgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdoZW4gdGhlIGdpdmVuIHBhcmFtIGBuYW1lYCBpcyBtYXRjaGVkIGluIGEgVVJMXG5BcHAucHJvdG90eXBlLnBhcmFtID0gZnVuY3Rpb24obmFtZSwgY2FsbGJhY2spIHtcbiAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHZhciBvcmlnQ2FsbGJhY2sgPSBjYWxsYmFjaywgYXBwID0gdGhpcztcblxuICAgIC8vIFNldCB0aGUgcGFyYW1zIGFuZCBxdWVyeSBvbnRvIHRoZSBhcHAgYmVmb3JlIHJ1bm5pbmcgdGhlIGNhbGxiYWNrXG4gICAgY2FsbGJhY2sgPSBmdW5jdGlvbihyZXEsIG5leHQpIHtcbiAgICAgIGFwcC5wYXJhbXMgPSByZXEucGFyYW1zO1xuICAgICAgYXBwLnF1ZXJ5ID0gcmVxLnF1ZXJ5XG4gICAgICBvcmlnQ2FsbGJhY2soYXBwLmFwcENvbnRyb2xsZXIsIG5leHQpO1xuICAgIH07XG4gIH1cblxuICB0aGlzLnJvdXRlci5wYXJhbShuYW1lLCBjYWxsYmFjayk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuXG4vLyBDcmVhdGUgYSByb3V0ZSB0byBiZSBydW4gd2hlbiB0aGUgZ2l2ZW4gVVJMIGBwYXRoYCBpcyBoaXQgaW4gdGhlIGJyb3dzZXIgVVJMLiBUaGUgcm91dGUgYG5hbWVgIGlzIHVzZWQgdG8gbG9hZCB0aGVcbi8vIHRlbXBsYXRlIGFuZCBjb250cm9sbGVyIGJ5IHRoZSBzYW1lIG5hbWUuIFRoaXMgdGVtcGxhdGUgd2lsbCBiZSBwbGFjZWQgaW4gdGhlIGZpcnN0IGVsZW1lbnQgb24gcGFnZSB3aXRoIGFcbi8vIGBiaW5kLXJvdXRlYCBhdHRyaWJ1dGUuXG5BcHAucHJvdG90eXBlLnJvdXRlID0gZnVuY3Rpb24ocGF0aCwgaGFuZGxlciwgc3Vicm91dGVzLCBydW5CZWZvcmUpIHtcbiAgdmFyIGFwcCA9IHRoaXMuYXBwO1xuICB2YXIgY2FsbGJhY2s7XG5cbiAgaWYgKHR5cGVvZiBoYW5kbGVyID09PSAnZnVuY3Rpb24nICYmIGhhbmRsZXIudG9TdHJpbmcoKS5tYXRjaCgvXFwocm91dGVcXCkvKSkge1xuICAgIHN1YnJvdXRlcyA9IGhhbmRsZXI7XG4gICAgaGFuZGxlciA9IG51bGw7XG4gIH1cblxuICBpZiAoIWhhbmRsZXIpIHtcbiAgICBoYW5kbGVyID0gcGF0aC5yZXBsYWNlKC9eXFwvLywgJycpO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBoYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgLy8gU3Vicm91dGVzIG5vdCBzdXBwb3J0ZWQgd2l0aCBjYWxsYmFja3MsIG9ubHkgd2l0aCBzdHJpbmcgaGFuZGxlcnMuXG4gICAgY2FsbGJhY2sgPSBoYW5kbGVyO1xuXG4gIH0gZWxzZSBpZiAodHlwZW9mIGhhbmRsZXIgPT09ICdzdHJpbmcnKSB7XG5cbiAgICAvLyBJZiB0aGUgaGFuZGxlciBpcyBhIHN0cmluZyBsb2FkIHRoZSBjb250cm9sbGVyL3RlbXBsYXRlIGJ5IHRoYXQgbmFtZS5cbiAgICB2YXIgbmFtZSA9IGhhbmRsZXI7XG4gICAgY2FsbGJhY2sgPSBmdW5jdGlvbihyZXEsIG5leHQpIHtcbiAgICAgIC8vIFJ1biBhIHByZXZpb3VzIHJvdXRlIGZpcnN0IGFuZCBhbGxvdyBpdCB0byB0aGVuIHJ1biB0aGlzIG9uZSBhZ2FpbiBhZnRlclxuICAgICAgaWYgKHJ1bkJlZm9yZSAmJiAhcnVuQmVmb3JlLnJhbikge1xuICAgICAgICBydW5CZWZvcmUucmFuID0gdHJ1ZTtcbiAgICAgICAgcnVuQmVmb3JlKHJlcSwgY2FsbGJhY2spO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChydW5CZWZvcmUpIHtcbiAgICAgICAgZGVsZXRlIHJ1bkJlZm9yZS5yYW47XG4gICAgICB9XG5cbiAgICAgIGFwcC5yb3V0ZVBhdGgucHVzaChuYW1lKTtcbiAgICAgIGFwcC5zeW5jKCk7XG4gICAgfTtcblxuICAgIC8vIEFkZHMgdGhlIHN1YnJvdXRlcyBhbmQgb25seSBjYWxscyB0aGlzIGNhbGxiYWNrIGJlZm9yZSB0aGV5IGdldCBjYWxsZWQgd2hlbiB0aGV5IG1hdGNoLlxuICAgIGlmIChzdWJyb3V0ZXMpIHtcbiAgICAgIHN1YnJvdXRlcyhmdW5jdGlvbihzdWJwYXRoLCBoYW5kbGVyLCBzdWJyb3V0ZXMpIHtcbiAgICAgICAgaWYgKHN1YnBhdGggPT09ICcvJykge1xuICAgICAgICAgIHN1YnBhdGggPSAnJztcbiAgICAgICAgfVxuICAgICAgICBhcHAucm91dGUocGF0aCArIHN1YnBhdGgsIGhhbmRsZXIsIHN1YnJvdXRlcywgY2FsbGJhY2spO1xuICAgICAgfSk7XG4gICAgfVxuXG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcigncm91dGUgaGFuZGxlciBtdXN0IGJlIGEgc3RyaW5nIHBhdGggb3IgYSBmdW5jdGlvbicpO1xuICB9XG5cblxuICB0aGlzLnJvdXRlci5yb3V0ZShwYXRoLCBmdW5jdGlvbihyZXEsIG5leHQpIHtcbiAgICB2YXIgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoJ3JvdXRlQ2hhbmdpbmcnLCB7IGNhbmNlbGFibGU6IHRydWUgfSk7XG4gICAgYXBwLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuXG4gICAgaWYgKCFldmVudC5kZWZhdWx0UHJldmVudGVkKSB7XG4gICAgICBhcHAucGFyYW1zID0gcmVxLnBhcmFtcztcbiAgICAgIGFwcC5xdWVyeSA9IHJlcS5xdWVyeTtcbiAgICAgIGlmIChhcHAucGF0aCA9PT0gcmVxLnBhdGgpIHtcbiAgICAgICAgcmVxLmlzU2FtZVBhdGggPSB0cnVlO1xuICAgICAgfVxuICAgICAgYXBwLnBhdGggPSByZXEucGF0aDtcbiAgICAgIGFwcC5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgncm91dGVDaGFuZ2UnLCB7IGRldGFpbDogcmVxIH0pKTtcbiAgICAgIGFwcC5yb3V0ZVBhdGgubGVuZ3RoID0gMDtcbiAgICAgIGNhbGxiYWNrKHJlcSwgbmV4dCk7XG4gICAgICBhcHAuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ3JvdXRlQ2hhbmdlZCcsIHsgZGV0YWlsOiByZXEgfSkpO1xuICAgIH1cbiAgfSk7XG5cbn07XG5cblxuLy8gUmVkaXJlY3RzIHRvIHRoZSBwcm92aWRlZCBVUkxcbkFwcC5wcm90b3R5cGUucmVkaXJlY3QgPSBmdW5jdGlvbih1cmwsIHJlcGxhY2UpIHtcbiAgdGhpcy5yb3V0ZXIucmVkaXJlY3QodXJsLCByZXBsYWNlKTtcbn07XG5cblxuQXBwLnByb3RvdHlwZS5oYXNNYXRjaGluZ1JvdXRlcyA9IGZ1bmN0aW9uKHVybCkge1xuICB0aGlzLnJvdXRlci5nZXRSb3V0ZXNNYXRjaGluZ1BhdGgodGhpcy5yb3V0ZXIuZ2V0VXJsUGFydHModXJsKS5wYXRoKS5sZW5ndGggPiAwO1xufTtcblxuXG4vLyBMaXN0ZW4gdG8gVVJMIGNoYW5nZXNcbkFwcC5wcm90b3R5cGUubGlzdGVuID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICBpZiAoIW9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0ge307XG4gIH1cblxuICBpZiAoZG9jdW1lbnQucmVhZHlTdGF0ZSA9PT0gJ2xvYWRpbmcnKSB7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIHRoaXMubGlzdGVuLmJpbmQodGhpcywgb3B0aW9ucykpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gU3RvcCBsaXN0ZW5pbmcgaWYgcmVxdWVzdGVkXG4gIGlmIChvcHRpb25zLnN0b3ApIHtcbiAgICBpZiAodGhpcy5fcm91dGVIYW5kbGVyKSB7XG4gICAgICB0aGlzLnJvdXRlci5vZmYoJ2NoYW5nZScsIHRoaXMuX3JvdXRlSGFuZGxlcik7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2NsaWNrSGFuZGxlcikge1xuICAgICAgdGhpcy5yb290RWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuX2NsaWNrSGFuZGxlcik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucm91dGVyLmxpc3RlbihvcHRpb25zKTtcbiAgfVxuXG4gIC8vIFN0YXJ0IGxpc3RlbmluZ1xuICB2YXIgYXBwID0gdGhpcztcblxuICAvLyBBZGQgaGFuZGxlciBmb3Igd2hlbiB0aGUgcm91dGUgY2hhbmdlc1xuICB0aGlzLl9yb3V0ZUhhbmRsZXIgPSBmdW5jdGlvbihldmVudCwgcGF0aCkge1xuICAgIGFwcC5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgndXJsQ2hhbmdlJywgeyBkZXRhaWw6IHBhdGggfSkpO1xuICB9O1xuXG4gIC8vIEFkZCBoYW5kbGVyIGZvciBjbGlja2luZyBsaW5rc1xuICB0aGlzLl9jbGlja0hhbmRsZXIgPSBmdW5jdGlvbihldmVudCkge1xuICAgIHZhciBhbmNob3I7XG4gICAgaWYgKCAhKGFuY2hvciA9IGV2ZW50LnRhcmdldC5jbG9zZXN0KCdhW2hyZWZdJykpICkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChldmVudC5kZWZhdWx0UHJldmVudGVkKSB7XG4gICAgICAvLyBpZiBzb21ldGhpbmcgZWxzZSBhbHJlYWR5IGhhbmRsZWQgdGhpcywgd2Ugd29uJ3RcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgbGlua0hvc3QgPSBhbmNob3IuaG9zdC5yZXBsYWNlKC86ODAkfDo0NDMkLywgJycpO1xuICAgIHZhciB1cmwgPSBhbmNob3IuZ2V0QXR0cmlidXRlKCdocmVmJykucmVwbGFjZSgvXiMvLCAnJyk7XG5cbiAgICBpZiAobGlua0hvc3QgJiYgbGlua0hvc3QgIT09IGxvY2F0aW9uLmhvc3QpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoZXZlbnQubWV0YUtleSB8fCBldmVudC5jdHJsS2V5IHx8IGFuY2hvci5nZXRBdHRyaWJ1dGUoJ3RhcmdldCcpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuZG9udEhhbmRsZTQwNHMgJiYgIWFwcC5oYXNNYXRjaGluZ1JvdXRlcyh1cmwpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBpZiAoYW5jaG9yLmhyZWYgPT09IGxvY2F0aW9uLmhyZWYgKyAnIycpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIWFuY2hvci5kaXNhYmxlZCkge1xuICAgICAgYXBwLnJlZGlyZWN0KHVybCk7XG4gICAgfVxuICB9O1xuXG4gIHRoaXMucm91dGVyLm9uKCdjaGFuZ2UnLCB0aGlzLl9yb3V0ZUhhbmRsZXIpO1xuICB0aGlzLnJvb3RFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5fY2xpY2tIYW5kbGVyKTtcbiAgdGhpcy5yb3V0ZXIubGlzdGVuKG9wdGlvbnMpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuXG5cbi8vIFBvbHlmaWxsIG1hdGNoZXNcbmlmICghRWxlbWVudC5wcm90b3R5cGUubWF0Y2hlcykge1xuICBFbGVtZW50LnByb3RvdHlwZS5tYXRjaGVzID1cbiAgICBFbGVtZW50LnByb3RvdHlwZS5tYXRjaGVzU2VsZWN0b3IgfHxcbiAgICBFbGVtZW50LnByb3RvdHlwZS53ZWJraXRNYXRjaGVzU2VsZWN0b3IgfHxcbiAgICBFbGVtZW50LnByb3RvdHlwZS5tb3pNYXRjaGVzU2VsZWN0b3IgfHxcbiAgICBFbGVtZW50LnByb3RvdHlwZS5tc01hdGNoZXNTZWxlY3RvciB8fFxuICAgIEVsZW1lbnQucHJvdG90eXBlLm9NYXRjaGVzU2VsZWN0b3I7XG59XG5cbi8vIFBvbHlmaWxsIGNsb3Nlc3RcbmlmICghRWxlbWVudC5wcm90b3R5cGUuY2xvc2VzdCkge1xuICBFbGVtZW50LnByb3RvdHlwZS5jbG9zZXN0ID0gZnVuY3Rpb24gY2xvc2VzdChzZWxlY3Rvcikge1xuICAgIHZhciBlbGVtZW50ID0gdGhpcztcbiAgICBkbyB7XG4gICAgICBpZiAoZWxlbWVudC5tYXRjaGVzKHNlbGVjdG9yKSkge1xuICAgICAgICByZXR1cm4gZWxlbWVudDtcbiAgICAgIH1cbiAgICB9IHdoaWxlICgoZWxlbWVudCA9IGVsZW1lbnQucGFyZW50Tm9kZSkgJiYgZWxlbWVudC5ub2RlVHlwZSA9PT0gTm9kZS5FTEVNRU5UX05PREUpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlZ2lzdGVyQmluZGVycztcbnZhciBjb21waWxlID0gcmVxdWlyZSgnZnJhZ21lbnRzLWpzL3NyYy9jb21waWxlJyk7XG5cbmZ1bmN0aW9uIHJlZ2lzdGVyQmluZGVycyhhcHApIHtcbiAgdmFyIGZyYWdtZW50cyA9IGFwcC5mcmFnbWVudHM7XG5cbiAgZnJhZ21lbnRzLmFuaW1hdGVBdHRyaWJ1dGUgPSAnW2FuaW1hdGVdJztcblxuICAvLyAjIyBiaW5kLXBhcnRpYWxcbiAgLy8gQWRkcyBhIGhhbmRsZXIgdG8gc2V0IHRoZSBjb250ZW50cyBvZiB0aGUgZWxlbWVudCB3aXRoIHRoZSB0ZW1wbGF0ZSBhbmQgY29udHJvbGxlciBieSB0aGF0IG5hbWUuIFRoZSBleHByZXNzaW9uIG1heVxuICAvLyBiZSBqdXN0IHRoZSBuYW1lIG9mIHRoZSB0ZW1wbGF0ZS9jb250cm9sbGVyLCBvciBpdCBtYXkgYmUgb2YgdGhlIGZvcm1hdCBgcGFydGlhbE5hbWVgLiBVc2UgdGhlIGxvY2FsLSogYmluZGluZ1xuICAvLyB0byBwYXNzIGRhdGEgaW50byBhIHBhcnRpYWwuXG5cbiAgLy8gKipFeGFtcGxlOioqXG4gIC8vIGBgYGh0bWxcbiAgLy8gPGRpdiBbcGFydGlhbF09XCJ1c2VySW5mb1wiIHt1c2VyfT1cInt7Z2V0VXNlcigpfX1cIiBbY2xhc3NdPVwie3sgeyBhZG1pbmlzdHJhdG9yOiB1c2VyLmlzQWRtaW4gfSB9fVwiPjwvZGl2PlxuICAvL1xuICAvLyA8c2NyaXB0IG5hbWU9XCJ1c2VySW5mb1wiIHR5cGU9XCJ0ZXh0L2h0bWxcIj5cbiAgLy8gICA8c3Ryb25nPnt7IHVzZXIubmFtZSB9fTwvc3Ryb25nPlxuICAvLyA8L3NjcmlwdD5cbiAgLy8gYGBgXG4gIC8vICpSZXN1bHQ6KlxuICAvLyBgYGBodG1sXG4gIC8vIDxkaXYgY2xhc3M9XCJhZG1pbmlzdHJhdG9yXCI+XG4gIC8vICAgPHNwYW4+SmFjb2I8L3NwYW4+XG4gIC8vIDwvZGl2PlxuICAvLyBgYGBcbiAgdmFyIFBhcnRpYWxCaW5kZXIgPSBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ1twYXJ0aWFsXScsIHtcbiAgICBhbmltYXRlZDogdHJ1ZSxcbiAgICBwcmlvcml0eTogNDAsXG5cbiAgICBjb21waWxlZDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcGFyZW50ID0gdGhpcy5lbGVtZW50LnBhcmVudE5vZGU7XG4gICAgICB2YXIgcGxhY2Vob2xkZXIgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKHBsYWNlaG9sZGVyLCB0aGlzLmVsZW1lbnQpO1xuXG4gICAgICBpZiAodGhpcy5lbGVtZW50LmNoaWxkTm9kZXMubGVuZ3RoKSB7XG4gICAgICAgIC8vIFVzZSB0aGUgY29udGVudHMgb2YgdGhpcyBwYXJ0aWFsIGFzIHRoZSBkZWZhdWx0IHdoZW4gbm8gcm91dGUgbWF0Y2hlcyBvciBhbGxvdyB0byBiZSBpbnNlcnRlZFxuICAgICAgICAvLyB3aXRoaW5cbiAgICAgICAgdGhpcy5jb250ZW50ID0gZnJhZ21lbnRzLmNyZWF0ZVRlbXBsYXRlKHRoaXMuZWxlbWVudC5jaGlsZE5vZGVzKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy50ZW1wbGF0ZSA9IGZyYWdtZW50cy5jcmVhdGVUZW1wbGF0ZSh0aGlzLmVsZW1lbnQpO1xuICAgICAgdGhpcy5lbGVtZW50ID0gcGxhY2Vob2xkZXI7XG4gICAgfSxcblxuICAgIGNyZWF0ZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHBsYWNlaG9sZGVyID0gdGhpcy5lbGVtZW50O1xuICAgICAgdGhpcy5jb250YWluZXIgPSB0aGlzLnRlbXBsYXRlLmNyZWF0ZVZpZXcoKTtcbiAgICAgIHBsYWNlaG9sZGVyLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMuY29udGFpbmVyLCBwbGFjZWhvbGRlci5uZXh0U2libGluZyk7XG4gICAgICB0aGlzLmVsZW1lbnQgPSBwbGFjZWhvbGRlci5uZXh0U2libGluZztcbiAgICAgIHBsYWNlaG9sZGVyLnJlbW92ZSgpO1xuICAgIH0sXG5cbiAgICBib3VuZDogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmNvbnRleHQuX3BhcnRpYWxDb250ZW50ID0gdGhpcy5jb250ZW50O1xuICAgICAgdGhpcy5sYXN0Q29udGV4dCA9IHRoaXMuY29udGV4dDtcbiAgICB9LFxuXG4gICAgdW5ib3VuZDogZnVuY3Rpb24oKSB7XG4gICAgICBkZWxldGUgdGhpcy5sYXN0Q29udGV4dC5fcGFydGlhbENvbnRlbnQ7XG4gICAgICB0aGlzLmxhc3RDb250ZXh0ID0gbnVsbDtcbiAgICB9LFxuXG4gICAgYWRkOiBmdW5jdGlvbih2aWV3KSB7XG4gICAgICB0aGlzLmVsZW1lbnQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodmlldywgdGhpcy5lbGVtZW50Lm5leHRTaWJsaW5nKTtcbiAgICB9LFxuXG4gICAgdXBkYXRlZDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGlmICh0aGlzLmFuaW1hdGUpIHtcbiAgICAgICAgdGhpcy51cGRhdGVkQW5pbWF0ZWQodmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy51cGRhdGVkUmVndWxhcih2YWx1ZSk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIHVwZGF0ZWRSZWd1bGFyOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgaWYgKHRoaXMuc2hvd2luZykge1xuICAgICAgICB0aGlzLnNob3dpbmcuZGlzcG9zZSgpO1xuICAgICAgICB0aGlzLmNvbnRhaW5lci51bmJpbmQoKTtcbiAgICAgICAgdGhpcy5jb250cm9sbGVyLmNsb3NlQ29udHJvbGxlcigpO1xuICAgICAgICB0aGlzLnNob3dpbmcgPSBudWxsO1xuICAgICAgICB0aGlzLmNvbnRyb2xsZXIgPSBudWxsO1xuICAgICAgfVxuXG4gICAgICB2YXIgdGVtcGxhdGUgPSBhcHAudGVtcGxhdGUodmFsdWUpO1xuXG4gICAgICBpZiAodGVtcGxhdGUpIHtcbiAgICAgICAgdGhpcy5jb250cm9sbGVyID0gdGhpcy5jb250ZXh0LmNyZWF0ZUNvbnRyb2xsZXIoeyBlbGVtZW50OiB0aGlzLmVsZW1lbnQsIG5hbWU6IHZhbHVlIH0pO1xuICAgICAgICB0aGlzLnNob3dpbmcgPSB0ZW1wbGF0ZS5jcmVhdGVWaWV3KCk7XG4gICAgICAgIHRoaXMuZWxlbWVudC5hcHBlbmRDaGlsZCh0aGlzLnNob3dpbmcpO1xuICAgICAgICB0aGlzLmNvbnRhaW5lci5iaW5kKHRoaXMuY29udHJvbGxlcik7XG4gICAgICAgIHRoaXMuc2hvd2luZy5iaW5kKHRoaXMuY29udHJvbGxlcik7XG4gICAgICB9XG4gICAgfSxcblxuICAgIHVwZGF0ZWRBbmltYXRlZDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHRoaXMubGFzdFZhbHVlID0gdmFsdWU7XG4gICAgICBpZiAodGhpcy5hbmltYXRpbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5zaG93aW5nKSB7XG4gICAgICAgIHRoaXMuYW5pbWF0aW5nID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5hbmltYXRlT3V0KHRoaXMuY29udGFpbmVyLCB0cnVlLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICB0aGlzLmFuaW1hdGluZyA9IGZhbHNlO1xuXG4gICAgICAgICAgaWYgKHRoaXMuc2hvd2luZykge1xuICAgICAgICAgICAgdGhpcy5zaG93aW5nLmRpc3Bvc2UoKTtcbiAgICAgICAgICAgIHRoaXMuY29udGFpbmVyLnVuYmluZCgpO1xuICAgICAgICAgICAgdGhpcy5jb250cm9sbGVyLmNsb3NlQ29udHJvbGxlcigpO1xuICAgICAgICAgICAgdGhpcy5zaG93aW5nID0gbnVsbDtcbiAgICAgICAgICAgIHRoaXMuY29udHJvbGxlciA9IG51bGw7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHRoaXMuY29udGV4dCkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVkQW5pbWF0ZWQodGhpcy5sYXN0VmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIHRlbXBsYXRlID0gYXBwLnRlbXBsYXRlKHZhbHVlKTtcblxuICAgICAgaWYgKHRlbXBsYXRlKSB7XG4gICAgICAgIHRoaXMuY29udHJvbGxlciA9IHRoaXMuY29udGV4dC5jcmVhdGVDb250cm9sbGVyKHsgZWxlbWVudDogdGhpcy5lbGVtZW50LCBuYW1lOiB2YWx1ZSB9KTtcbiAgICAgICAgdGhpcy5zaG93aW5nID0gdGVtcGxhdGUuY3JlYXRlVmlldygpO1xuICAgICAgICB0aGlzLmVsZW1lbnQuYXBwZW5kQ2hpbGQodGhpcy5zaG93aW5nKTtcbiAgICAgICAgdGhpcy5jb250YWluZXIuYmluZCh0aGlzLmNvbnRyb2xsZXIpO1xuICAgICAgICB0aGlzLnNob3dpbmcuYmluZCh0aGlzLmNvbnRyb2xsZXIpO1xuICAgICAgICB0aGlzLmNvbnRleHQuc3luYygpO1xuXG4gICAgICAgIHRoaXMuYW5pbWF0aW5nID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5hbmltYXRlSW4odGhpcy5jb250YWluZXIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHRoaXMuYW5pbWF0aW5nID0gZmFsc2U7XG4gICAgICAgICAgLy8gaWYgdGhlIHZhbHVlIGNoYW5nZWQgd2hpbGUgdGhpcyB3YXMgYW5pbWF0aW5nIHJ1biBpdCBhZ2FpblxuICAgICAgICAgIGlmICh0aGlzLmxhc3RWYWx1ZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlZEFuaW1hdGVkKHRoaXMubGFzdFZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cblxuICB2YXIgQmluZGluZyA9IHJlcXVpcmUoJ2ZyYWdtZW50cy1qcy9zcmMvYmluZGluZycpO1xuICB2YXIgX3N1cGVyID0gQmluZGluZy5wcm90b3R5cGU7XG5cbiAgLy8gIyMgeyp9XG4gIC8vIFlvdSBtYXkgcGFzcyBkYXRhIGludG8gW3BhcnRpYWxdIG9yIFtyZXBlYXRdIHVzaW5nIHRoaXMgd2lsZGNhcmQgYmluZGluZy4gVGhlIGF0dHJpYnV0ZSBuYW1lIHBvcnRpb24gd2l0aGluIHRoZVxuICAvLyBicmFja3RlcyB3aWxsIGJlIGNvbnZlcnRlZCB0byBjYW1lbENhc2UgYW5kIHRoZSB2YWx1ZSB3aWxsIGJlIHNldCBsb2NhbGx5LiBFeGFtcGxlczpcbiAgLy8gYHtsaW5rfT1cInt7dXNlci5hZGRyZXNzVXJsfX1cImAgd2lsbCBwYXNzIHRoZSB2YWx1ZSBvZiBgdXNlci5hZGRyZXNzVXJsYCBpbnRvIHRoZSBwYXJ0aWFsIGFzIGBsaW5rYC5cbiAgLy8gYHtwb3N0LWJvZHl9PVwie3t1c2VyLmRlc2NyaXB0aW9ufX1cImAgd2lsbCBwYXNzIHRoZSB2YWx1ZSBvZiBgdXNlci5kZXNjcmlwdGlvbmAgaW50byB0aGUgcGFydGlhbCBhcyBgcG9zdEJvZHlgLlxuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ3sqfScsIHtcbiAgICBjcmVhdGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMudHdvV2F5T2JzZXJ2ZXIgPSB0aGlzLm9ic2VydmUodGhpcy5jYW1lbENhc2UsIHRoaXMuc2VuZFVwZGF0ZSwgdGhpcyk7XG4gICAgfSxcbiAgICAvLyBCaW5kIHRoaXMgdG8gdGhlIGdpdmVuIGNvbnRleHQgb2JqZWN0XG4gICAgYmluZDogZnVuY3Rpb24oY29udGV4dCkge1xuICAgICAgaWYgKHRoaXMuY2hpbGRDb250ZXh0ID09IGNvbnRleHQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBCaW5kIGFnYWluc3QgdGhlIHBhcmVudCBjb250ZXh0XG4gICAgICB0aGlzLmNoaWxkQ29udGV4dCA9IGNvbnRleHQ7XG4gICAgICBfc3VwZXIuYmluZC5jYWxsKHRoaXMsIGNvbnRleHQuX3BhcmVudCk7XG4gICAgICB0aGlzLnR3b1dheU9ic2VydmVyLmJpbmQoY29udGV4dCwgdHJ1ZSk7XG4gICAgfSxcbiAgICB1bmJvdW5kOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMudHdvV2F5T2JzZXJ2ZXIudW5iaW5kKCk7XG4gICAgfSxcbiAgICBzZW5kVXBkYXRlOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgaWYgKCF0aGlzLnNraXBTZW5kKSB7XG4gICAgICAgIHRoaXMub2JzZXJ2ZXIuc2V0KHZhbHVlKTtcbiAgICAgICAgdGhpcy5za2lwU2VuZCA9IHRydWU7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgX3RoaXMuc2tpcFNlbmQgPSBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSxcbiAgICB1cGRhdGVkOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgaWYgKCF0aGlzLnNraXBTZW5kICYmIHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5jaGlsZENvbnRleHRbdGhpcy5jYW1lbENhc2VdID0gdmFsdWU7XG4gICAgICAgIHRoaXMuc2tpcFNlbmQgPSB0cnVlO1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIF90aGlzLnNraXBTZW5kID0gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cblxuICAvLyAjIyBiaW5kLWNvbnRlbnRcbiAgLy8gQWxsb3dzIGFuIGVsZW1lbnQgd2l0aCBhIGBbcGFydGlhbF1gIGF0dHJpYnV0ZSB0byBpbmNsdWRlIEhUTUwgd2l0aGluIGl0IHRoYXQgbWF5IGJlIGluc2VydGVkIHNvbWV3aGVyZVxuICAvLyBpbnNpZGUgdGhlIHBhcnRpYWwncyB0ZW1wbGF0ZS5cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdbY29udGVudF0nLCB7XG4gICAgcHJpb3JpdHk6IDQwLFxuICAgIGJvdW5kOiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh0aGlzLmNvbnRleHQuX3BhcnRpYWxDb250ZW50KSB7XG4gICAgICAgIHRoaXMuY29udGVudCA9IHRoaXMuY29udGV4dC5fcGFydGlhbENvbnRlbnQuY3JlYXRlVmlldygpO1xuICAgICAgICB0aGlzLmVsZW1lbnQuYXBwZW5kQ2hpbGQodGhpcy5jb250ZW50KTtcbiAgICAgICAgdGhpcy5jb250ZW50LmJpbmQodGhpcy5jb250ZXh0KTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHVuYm91bmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHRoaXMuY29udGVudCkge1xuICAgICAgICB0aGlzLmNvbnRlbnQuZGlzcG9zZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cblxuXG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnW3JvdXRlXScsIFBhcnRpYWxCaW5kZXIuZXh0ZW5kKHtcbiAgICBjb21waWxlZDogZnVuY3Rpb24oKSB7XG4gICAgICBQYXJ0aWFsQmluZGVyLnByb3RvdHlwZS5jb21waWxlZC5jYWxsKHRoaXMpO1xuICAgICAgdGhpcy5leHByZXNzaW9uID0gJ3JvdXRlUGF0aFtyb3V0ZURlcHRoXSc7XG4gICAgfSxcblxuICAgIGJvdW5kOiBmdW5jdGlvbigpIHtcbiAgICAgIC8vIERlbGV0ZSBhbnkgZGVwdGggZXhpc3Rpbmcgb24gdGhlIGNvbnRyb2xsZXIgYW5kIHNldCBpdHMgZGVwdGggdG8gMSBtb3JlIHRoYW4gaXRzIHBhcmVudCBjb250cm9sbGVycy5cbiAgICAgIGRlbGV0ZSB0aGlzLmNvbnRleHQucm91dGVEZXB0aDtcbiAgICAgIHRoaXMuY29udGV4dC5yb3V0ZURlcHRoID0gdGhpcy5jb250ZXh0LnJvdXRlRGVwdGggPT0gbnVsbCA/IDAgOiB0aGlzLmNvbnRleHQucm91dGVEZXB0aCArIDE7XG4gICAgfVxuICB9KSk7XG5cblxuXG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnW2NvbnRyb2xsZXJdJywgUGFydGlhbEJpbmRlci5leHRlbmQoe1xuICAgIHByaW9yaXR5OiAzMCxcblxuICAgIGNvbXBpbGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuYmluZGluZ3MgPSBjb21waWxlKGZyYWdtZW50cywgdGhpcy5lbGVtZW50KTtcbiAgICB9LFxuXG4gICAgY3JlYXRlZDogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmJpbmRpbmdzID0gdGhpcy5iaW5kaW5ncy5tYXAoZnVuY3Rpb24oYmluZGluZykge1xuICAgICAgICByZXR1cm4gYmluZGluZy5jbG9uZUZvclZpZXcodGhpcy5lbGVtZW50KTtcbiAgICAgIH0sIHRoaXMpO1xuICAgIH0sXG5cbiAgICBib3VuZDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgY29udGV4dCA9IHRoaXMuY29udGV4dC5jcmVhdGVDb250cm9sbGVyKHsgZWxlbWVudDogdGhpcy5lbGVtZW50LCBuYW1lOiB0aGlzLm9ic2VydmVyLmdldCgpIH0pO1xuICAgICAgdGhpcy5jaGlsZENvbnRleHQgPSBjb250ZXh0O1xuICAgICAgdGhpcy5iaW5kaW5ncy5mb3JFYWNoKGZ1bmN0aW9uKGJpbmRpbmcpIHtcbiAgICAgICAgYmluZGluZy5iaW5kKGNvbnRleHQpO1xuICAgICAgfSk7XG4gICAgfSxcblxuICAgIHVuYm91bmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5iaW5kaW5ncy5mb3JFYWNoKGZ1bmN0aW9uKGJpbmRpbmcpIHtcbiAgICAgICAgYmluZGluZy51bmJpbmQoKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5jaGlsZENvbnRleHQuY2xvc2VDb250cm9sbGVyKCk7XG4gICAgICB0aGlzLmNoaWxkQ29udGV4dCA9IG51bGw7XG4gICAgfVxuICB9KSk7XG5cblxuXG5cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdbZGVidWddJywgZnJhZ21lbnRzLnVucmVnaXN0ZXJBdHRyaWJ1dGUoJ2RlYnVnJykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ1t0ZXh0XScsIGZyYWdtZW50cy51bnJlZ2lzdGVyQXR0cmlidXRlKCd0ZXh0JykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ1todG1sXScsIGZyYWdtZW50cy51bnJlZ2lzdGVyQXR0cmlidXRlKCdodG1sJykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ1tjbGFzczoqXScsIGZyYWdtZW50cy51bnJlZ2lzdGVyQXR0cmlidXRlKCdjbGFzcy0qJykpO1xuXG4gIHZhciBWYWx1ZUJpbmRlciA9IGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnW3ZhbHVlXScsIGZyYWdtZW50cy51bnJlZ2lzdGVyQXR0cmlidXRlKCd2YWx1ZScpKTtcbiAgVmFsdWVCaW5kZXIucHJvdG90eXBlLmV2ZW50c0F0dHJOYW1lID0gJ1t2YWx1ZS1ldmVudHNdJztcbiAgVmFsdWVCaW5kZXIucHJvdG90eXBlLmZpZWxkQXR0ck5hbWUgPSAnW3ZhbHVlLWZpZWxkXSc7XG5cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCcoKiknLCBmcmFnbWVudHMudW5yZWdpc3RlckF0dHJpYnV0ZSgnb24tKicpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCcoZW50ZXIpJywgZnJhZ21lbnRzLnVucmVnaXN0ZXJBdHRyaWJ1dGUoJ29uLWVudGVyJykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJyhjdHJsLWVudGVyKScsIGZyYWdtZW50cy51bnJlZ2lzdGVyQXR0cmlidXRlKCdvbi1jdHJsLWVudGVyJykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJyhlc2MpJywgZnJhZ21lbnRzLnVucmVnaXN0ZXJBdHRyaWJ1dGUoJ29uLWVzYycpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCcoZXNjYXBlKScsIGZyYWdtZW50cy5nZXRBdHRyaWJ1dGVCaW5kZXIoJyhlc2MpJykpO1xuXG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnWypdJywgZnJhZ21lbnRzLnVucmVnaXN0ZXJBdHRyaWJ1dGUoJyokJykpO1xuICAvKlxuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJyo/JywgZnJhZ21lbnRzLnVucmVnaXN0ZXJBdHRyaWJ1dGUoJyo/JykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ2NoZWNrZWQ/JywgZnJhZ21lbnRzLmdldEF0dHJpYnV0ZUJpbmRlcigndmFsdWUnKSk7XG4gICovXG5cbiAgdmFyIElmQmluZGluZyA9IGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnW2lmXScsIGZyYWdtZW50cy5nZXRBdHRyaWJ1dGVCaW5kZXIoJ2lmJykpO1xuICBJZkJpbmRpbmcucHJvdG90eXBlLnVubGVzc0F0dHJOYW1lID0gJ1t1bmxlc3NdJztcbiAgSWZCaW5kaW5nLnByb3RvdHlwZS5lbHNlSWZBdHRyTmFtZSA9ICdbZWxzZS1pZl0nO1xuICBJZkJpbmRpbmcucHJvdG90eXBlLmVsc2VVbmxlc3NBdHRyTmFtZSA9ICdbZWxzZS11bmxlc3NdJztcbiAgSWZCaW5kaW5nLnByb3RvdHlwZS5lbHNlQXR0ck5hbWUgPSAnW2Vsc2VdJztcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdbdW5sZXNzXScsIElmQmluZGluZyk7XG5cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdbcmVwZWF0XScsIGZyYWdtZW50cy5nZXRBdHRyaWJ1dGVCaW5kZXIoJ3JlcGVhdCcpKTtcbn1cbiIsInZhciBBcHAgPSByZXF1aXJlKCcuL2FwcCcpO1xuXG4vLyAjIENoaXBcblxuLy8gPiBDaGlwLmpzIDIuMC4wXG4vL1xuLy8gPiAoYykgMjAxMyBKYWNvYiBXcmlnaHQsIFRlYW1TbmFwXG4vLyBDaGlwIG1heSBiZSBmcmVlbHkgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxuLy8gRm9yIGFsbCBkZXRhaWxzIGFuZCBkb2N1bWVudGF0aW9uOlxuLy8gPGh0dHBzOi8vZ2l0aHViLmNvbS90ZWFtc25hcC9jaGlwLz5cblxuLy8gQ29udGVudHNcbi8vIC0tLS0tLS0tXG4vLyAqIFtjaGlwXShjaGlwLmh0bWwpIHRoZSBuYW1lc3BhY2UsIGNyZWF0ZXMgYXBwcywgYW5kIHJlZ2lzdGVycyBiaW5kaW5ncyBhbmQgZmlsdGVyc1xuLy8gKiBbQXBwXShhcHAuaHRtbCkgcmVwcmVzZW50cyBhbiBhcHAgdGhhdCBjYW4gaGF2ZSByb3V0ZXMsIGNvbnRyb2xsZXJzLCBhbmQgdGVtcGxhdGVzIGRlZmluZWRcbi8vICogW0NvbnRyb2xsZXJdKGNvbnRyb2xsZXIuaHRtbCkgaXMgdXNlZCBpbiB0aGUgYmluZGluZyB0byBhdHRhY2ggZGF0YSBhbmQgcnVuIGFjdGlvbnNcbi8vICogW1JvdXRlcl0ocm91dGVyLmh0bWwpIGlzIHVzZWQgZm9yIGhhbmRsaW5nIFVSTCByb3VudGluZ1xuLy8gKiBbRGVmYXVsdCBiaW5kZXJzXShiaW5kZXJzLmh0bWwpIHJlZ2lzdGVycyB0aGUgZGVmYXVsdCBiaW5kZXJzIGNoaXAgcHJvdmlkZXNcblxuLy8gQ3JlYXRlIENoaXAgQXBwXG4vLyAtLS0tLS0tLS0tLS0tXG4vLyBDcmVhdGVzIGEgbmV3IGNoaXAgYXBwXG5tb2R1bGUuZXhwb3J0cyA9IGNoaXA7XG5cbmZ1bmN0aW9uIGNoaXAobmFtZSwgcm9vdCkge1xuICB2YXIgYXBwID0gbmV3IEFwcChuYW1lKTtcbiAgYXBwLmluaXRBcHAocm9vdCk7XG4gIHJldHVybiBhcHA7XG59XG5cbmNoaXAuQXBwID0gQXBwO1xuY2hpcC5FdmVudEVtaXR0ZXIgPSByZXF1aXJlKCcuL2V2ZW50cycpO1xuY2hpcC5Db250cm9sbGVyID0gcmVxdWlyZSgnLi9jb250cm9sbGVyJyk7XG5jaGlwLlJvdXRlciA9IHJlcXVpcmUoJy4vcm91dGVyJyk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IENvbnRyb2xsZXI7XG52YXIgT2JzZXJ2ZXIgPSByZXF1aXJlKCdmcmFnbWVudHMtanMvc3JjL29ic2VydmVyJyk7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnLi9ldmVudHMnKTtcblxuLy8gIyBDaGlwIENvbnRyb2xsZXJcblxuLy8gQSBDb250cm9sbGVyIGlzIHRoZSBvYmplY3QgdG8gd2hpY2ggSFRNTCBlbGVtZW50cyBhcmUgYm91bmQuXG5mdW5jdGlvbiBDb250cm9sbGVyKCkge1xuICAvLyBFYWNoIGNvbnRyb2xsZXIgbmVlZHMgdW5pcXVlIGluc3RhbmNlcyBvZiB0aGVzZSBwcm9wZXJ0aWVzLiBJZiB3ZSBkb24ndCBzZXQgdGhlbSBoZXJlIHRoZXkgd2lsbCBiZSBpbmhlcml0ZWQgZnJvbVxuICAvLyB0aGUgcHJvdG90eXBlIGNoYWluIGFuZCBjYXVzZSBpc3N1ZXMuXG4gIHRoaXMuX29ic2VydmVycyA9IFtdO1xuICB0aGlzLl9jaGlsZHJlbiA9IFtdO1xuICB0aGlzLl9zeW5jTGlzdGVuZXJzID0gW107XG4gIHRoaXMuX2Nsb3NlZCA9IGZhbHNlO1xufVxuXG5Db250cm9sbGVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnRFbWl0dGVyLnByb3RvdHlwZSk7XG5Db250cm9sbGVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IENvbnRyb2xsZXI7XG5cblxuLy8gV2F0Y2hlcyBhbiBleHByZXNzaW9uIGZvciBjaGFuZ2VzLiBDYWxscyB0aGUgYGNhbGxiYWNrYCBpbW1lZGlhdGVseSB3aXRoIHRoZSBpbml0aWFsIHZhbHVlIGFuZCB0aGVuIGV2ZXJ5IHRpbWUgdGhlXG4vLyB2YWx1ZSBpbiB0aGUgZXhwcmVzc2lvbiBjaGFuZ2VzLiBBbiBleHByZXNzaW9uIGNhbiBiZSBhcyBzaW1wbGUgYXMgYG5hbWVgIG9yIGFzIGNvbXBsZXggYXMgYHVzZXIuZmlyc3ROYW1lICsgJyAnICtcbi8vIHVzZXIubGFzdE5hbWUgKyAnIC0gJyArIHVzZXIuZ2V0UG9zdGZpeCgpYFxuQ29udHJvbGxlci5wcm90b3R5cGUud2F0Y2ggPSBmdW5jdGlvbihleHByLCBza2lwVXBkYXRlLCBjYWxsYmFjaykge1xuICBpZiAoQXJyYXkuaXNBcnJheShleHByKSkge1xuICAgIGlmICh0eXBlb2Ygc2tpcFVwZGF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY2FsbGJhY2sgPSBza2lwVXBkYXRlO1xuICAgICAgc2tpcFVwZGF0ZSA9IGZhbHNlO1xuICAgIH1cblxuICAgIHZhciBvcmlnQ2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICB2YXIgY2FsbGVkVGhpc1JvdW5kID0gZmFsc2U7XG5cbiAgICAvLyB3aXRoIG11bHRpcGxlIG9ic2VydmVycywgb25seSBjYWxsIHRoZSBvcmlnaW5hbCBjYWxsYmFjayBvbmNlIG9uIGNoYW5nZXNcbiAgICBjYWxsYmFjayA9IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKGNhbGxlZFRoaXNSb3VuZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNhbGxlZFRoaXNSb3VuZCA9IHRydWU7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBjYWxsZWRUaGlzUm91bmQgPSBmYWxzZTtcbiAgICAgIH0pO1xuXG4gICAgICB2YXIgdmFsdWVzID0gb2JzZXJ2ZXJzLm1hcChmdW5jdGlvbihvYnNlcnZlcikge1xuICAgICAgICByZXR1cm4gb2JzZXJ2ZXIuZ2V0KCk7XG4gICAgICB9KTtcbiAgICAgIG9yaWdDYWxsYmFjay5hcHBseShudWxsLCB2YWx1ZXMpO1xuICAgIH07XG5cblxuICAgIHZhciBvYnNlcnZlcnMgPSBleHByLm1hcChmdW5jdGlvbihleHByKSB7XG4gICAgICB0aGlzLndhdGNoKGV4cHIsIHRydWUsIGNhbGxiYWNrKTtcbiAgICB9LCB0aGlzKTtcblxuICAgIGlmICghc2tpcFVwZGF0ZSkge1xuICAgICAgY2FsbGJhY2soKTtcbiAgICB9XG5cbiAgICByZXR1cm4gb2JzZXJ2ZXJzO1xuICB9IGVsc2Uge1xuICAgIHZhciBvYnNlcnZlciA9IG5ldyBPYnNlcnZlcihleHByLCBjYWxsYmFjaywgdGhpcyk7XG4gICAgb2JzZXJ2ZXIuYmluZCh0aGlzLCBza2lwVXBkYXRlKTtcblxuICAgIC8vIFN0b3JlIHRoZSBvYnNlcnZlcnMgd2l0aCB0aGUgY29udHJvbGxlciBzbyB3aGVuIGl0IGlzIGNsb3NlZCB3ZSBjYW4gY2xlYW4gdXAgYWxsIG9ic2VydmVycyBhcyB3ZWxsXG4gICAgdGhpcy5fb2JzZXJ2ZXJzLnB1c2gob2JzZXJ2ZXIpO1xuICAgIHJldHVybiBvYnNlcnZlcjtcbiAgfVxufVxuXG4vLyBTdG9wIHdhdGNoaW5nIGFuIGV4cHJlc3Npb24gZm9yIGNoYW5nZXMuXG5Db250cm9sbGVyLnByb3RvdHlwZS51bndhdGNoID0gZnVuY3Rpb24oZXhwciwgY2FsbGJhY2spIHtcbiAgcmV0dXJuIHRoaXMuX29ic2VydmVycy5zb21lKGZ1bmN0aW9uKG9ic2VydmVyLCBpbmRleCkge1xuICAgIGlmIChvYnNlcnZlci5leHByID09PSBleHByICYmIG9ic2VydmVyLmNhbGxiYWNrID09PSBjYWxsYmFjaykge1xuICAgICAgT2JzZXJ2ZXIucmVtb3ZlKG9ic2VydmVyKTtcbiAgICAgIHRoaXMuX29ic2VydmVycy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9LCB0aGlzKTtcbn07XG5cbi8vIEV2YWx1YXRlcyBhbiBleHByZXNzaW9uIGltbWVkaWF0ZWx5LCByZXR1cm5pbmcgdGhlIHJlc3VsdFxuQ29udHJvbGxlci5wcm90b3R5cGUuZXZhbCA9IGZ1bmN0aW9uKGV4cHIsIGFyZ3MpIHtcbiAgaWYgKGFyZ3MpIHtcbiAgICBvcHRpb25zID0geyBhcmdzOiBPYmplY3Qua2V5cyhhcmdzKSB9O1xuICAgIHZhbHVlcyA9IG9wdGlvbnMuYXJncy5tYXAoZnVuY3Rpb24oa2V5KSB7IHJldHVybiBhcmdzW2tleV07IH0pO1xuICB9XG4gIHJldHVybiBPYnNlcnZlci5leHByZXNzaW9uLmdldChleHByLCBvcHRpb25zKS5hcHBseSh0aGlzLCB2YWx1ZXMpO1xufTtcblxuXG4vLyBFdmFsdWF0ZXMgYW4gZXhwcmVzc2lvbiBpbW1lZGlhdGVseSBhcyBhIHNldHRlciwgc2V0dGluZyBgdmFsdWVgIHRvIHRoZSBleHByZXNzaW9uIHJ1bm5pbmcgdGhyb3VnaCBmaWx0ZXJzLlxuQ29udHJvbGxlci5wcm90b3R5cGUuZXZhbFNldHRlciA9IGZ1bmN0aW9uKGV4cHIsIHZhbHVlKSB7XG4gIHZhciBjb250ZXh0ID0gdGhpcy5oYXNPd25Qcm9wZXJ0eSgnX29yaWdDb250ZXh0XycpID8gdGhpcy5fb3JpZ0NvbnRleHRfIDogdGhpcztcbiAgZXhwcmVzc2lvbi5nZXRTZXR0ZXIoZXhwcikuY2FsbChjb250ZXh0LCB2YWx1ZSk7XG59O1xuXG5cbi8vIENsb25lcyB0aGUgb2JqZWN0IGF0IHRoZSBnaXZlbiBwcm9wZXJ0eSBuYW1lIGZvciBwcm9jZXNzaW5nIGZvcm1zXG5Db250cm9sbGVyLnByb3RvdHlwZS5jbG9uZVZhbHVlID0gZnVuY3Rpb24ocHJvcGVydHkpIHtcbiAgT2JzZXJ2ZXIuZXhwcmVzc2lvbi5kaWZmLmNsb25lKHRoaXNbcHJvcGVydHldKTtcbn07XG5cblxuLy8gUmVtb3ZlcyBhbmQgY2xvc2VzIGFsbCBvYnNlcnZlcnMgZm9yIGdhcmJhZ2UtY29sbGVjdGlvblxuQ29udHJvbGxlci5wcm90b3R5cGUuY2xvc2VDb250cm9sbGVyID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLl9jbG9zZWQpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB0aGlzLl9jbG9zZWQgPSB0cnVlO1xuXG4gIHRoaXMuX2NoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpIHtcbiAgICBjaGlsZC5fcGFyZW50ID0gbnVsbDtcbiAgICBjaGlsZC5jbG9zZUNvbnRyb2xsZXIoKTtcbiAgfSk7XG5cbiAgaWYgKHRoaXMuX3BhcmVudCkge1xuICAgIHZhciBpbmRleCA9IHRoaXMuX3BhcmVudC5fY2hpbGRyZW4uaW5kZXhPZih0aGlzKTtcbiAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICB0aGlzLl9wYXJlbnQuX2NoaWxkcmVuLnNwbGljZShpbmRleCwgMSk7XG4gICAgfVxuICAgIHRoaXMuX3BhcmVudCA9IG51bGxcbiAgfVxuXG4gIGlmICh0aGlzLmhhc093blByb3BlcnR5KCdiZWZvcmVDbG9zZScpKSB7XG4gICAgdGhpcy5iZWZvcmVDbG9zZSgpO1xuICB9XG5cbiAgdGhpcy5fc3luY0xpc3RlbmVycy5mb3JFYWNoKGZ1bmN0aW9uKGxpc3RlbmVyKSB7XG4gICAgT2JzZXJ2ZXIucmVtb3ZlT25TeW5jKGxpc3RlbmVyKTtcbiAgfSk7XG4gIHRoaXMuX3N5bmNMaXN0ZW5lcnMubGVuZ3RoID0gMDtcblxuICB0aGlzLl9vYnNlcnZlcnMuZm9yRWFjaChmdW5jdGlvbihvYnNlcnZlcikge1xuICAgIE9ic2VydmVyLnJlbW92ZShvYnNlcnZlcik7XG4gIH0pO1xuICB0aGlzLl9vYnNlcnZlcnMubGVuZ3RoID0gMDtcblxuICBpZiAodGhpcy5oYXNPd25Qcm9wZXJ0eSgnb25DbG9zZScpKSB7XG4gICAgdGhpcy5vbkNsb3NlKCk7XG4gIH1cbn07XG5cblxuLy8gU3luY3MgdGhlIG9ic2VydmVycyB0byBwcm9wb2dhdGUgY2hhbmdlcyB0byB0aGUgSFRNTCwgY2FsbCBjYWxsYmFjayBhZnRlclxuQ29udHJvbGxlci5wcm90b3R5cGUuc3luYyA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gIE9ic2VydmVyLnN5bmMoY2FsbGJhY2spO1xuICByZXR1cm4gdGhpcztcbn07XG5cblxuLy8gUnVucyB0aGUgc3luYyBvbiB0aGUgbmV4dCB0aWNrLCBjYWxsIGNhbGxiYWNrIGFmdGVyXG5Db250cm9sbGVyLnByb3RvdHlwZS5zeW5jTGF0ZXIgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICBPYnNlcnZlci5zeW5jTGF0ZXIoY2FsbGJhY2spXG4gIHJldHVybiB0aGlzO1xufTtcblxuXG4vLyBTeW5jcyB0aGUgb2JzZXJ2ZXJzIHRvIHByb3BvZ2F0ZSBjaGFuZ2VzIHRvIHRoZSBIVE1MIGZvciB0aGlzIGNvbnRyb2xsZXIgb25seVxuQ29udHJvbGxlci5wcm90b3R5cGUuc3luY1RoaXMgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5fb2JzZXJ2ZXJzLmZvckVhY2goZnVuY3Rpb24ob2JzZXJ2ZXIpIHtcbiAgICBvYnNlcnZlci5zeW5jKCk7XG4gIH0pO1xuICB0aGlzLl9jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgY2hpbGQuc3luY1RoaXMoKTtcbiAgfSk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuXG4vLyBjYWxsIGNhbGxiYWNrIGFmdGVyIHRoZSBjdXJyZW50IHN5bmNcbkNvbnRyb2xsZXIucHJvdG90eXBlLmFmdGVyU3luYyA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gIE9ic2VydmVyLmFmdGVyU3luYyhjYWxsYmFjayk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuXG4vLyBSdW5zIHRoZSBsaXN0ZW5lciBvbiBldmVyeSBzeW5jLCBzdG9wcyBvbmNlIHRoZSBjb250cm9sbGVyIGlzIGNsb3NlZFxuQ29udHJvbGxlci5wcm90b3R5cGUub25TeW5jID0gZnVuY3Rpb24obGlzdGVuZXIpIHtcbiAgdGhpcy5fc3luY0xpc3RlbmVycy5wdXNoKGxpc3RlbmVyKTtcbiAgT2JzZXJ2ZXIub25TeW5jKGxpc3RlbmVyKTtcbiAgcmV0dXJuIHRoaXM7XG59XG5cblxuLy8gUmVtb3ZlcyBhIHN5bmMgbGlzdGVuZXJcbkNvbnRyb2xsZXIucHJvdG90eXBlLnJlbW92ZU9uU3luYyA9IGZ1bmN0aW9uKGxpc3RlbmVyKSB7XG4gIHZhciBpbmRleCA9IHRoaXMuX3N5bmNMaXN0ZW5lcnMuaW5kZXhPZihsaXN0ZW5lcik7XG4gIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICB0aGlzLl9zeW5jTGlzdGVuZXJzLnNwbGljZShpbmRleCwgMSk7XG4gIH1cbiAgT2JzZXJ2ZXIucmVtb3ZlT25TeW5jKGxpc3RlbmVyKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEEgc2ltcGxlIGV2ZW50IGVtaXR0ZXIgdG8gcHJvdmlkZSBhbiBldmVudGluZyBzeXN0ZW0uXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoZW1pdHRlcikge1xuICBpZiAodGhpcyBpbnN0YW5jZW9mIEV2ZW50RW1pdHRlcikge1xuICAgIGVtaXR0ZXIgPSB0aGlzO1xuICB9XG5cbiAgdmFyIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG5cbiAgLy8gQWRkIGV2ZW50IGxpc3RlbmVyXG4gIGVtaXR0ZXIub24gPSBlbWl0dGVyLmFkZEV2ZW50TGlzdGVuZXIgPSBub2RlLmFkZEV2ZW50TGlzdGVuZXIuYmluZChub2RlKTtcblxuICAvLyBSZW1vdmVzIGV2ZW50IGxpc3RlbmVyXG4gIGVtaXR0ZXIub2ZmID0gZW1pdHRlci5yZW1vdmVFdmVudExpc3RlbmVyID0gbm9kZS5yZW1vdmVFdmVudExpc3RlbmVyLmJpbmQobm9kZSk7XG5cbiAgLy8gQWRkIGV2ZW50IGxpc3RlbmVyIHRvIG9ubHkgZ2V0IGNhbGxlZCBvbmNlLCByZXR1cm5zIHdyYXBwZWQgbWV0aG9kIGZvciByZW1vdmluZyBpZiBuZWVkZWRcbiAgZW1pdHRlci5vbmUgPSBmdW5jdGlvbiBvbmUodHlwZSwgbGlzdGVuZXIpIHtcbiAgICBmdW5jdGlvbiBvbmUoZXZlbnQpIHtcbiAgICAgIGVtaXR0ZXIub2ZmKHR5cGUsIG9uZSk7XG4gICAgICBpZiAodHlwZW9mIGxpc3RlbmVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGxpc3RlbmVyLmNhbGwoZXZlbnQpO1xuICAgICAgfVxuICAgIH1cbiAgICBlbWl0dGVyLm9uKHR5cGUsIG9uZSk7XG4gICAgcmV0dXJuIG9uZTtcbiAgfVxuXG4gIC8vIERpc3BhdGNoIGV2ZW50IGFuZCB0cmlnZ2VyIGxpc3RlbmVyc1xuICBlbWl0dGVyLmRpc3BhdGNoRXZlbnQgPSBmdW5jdGlvbiBkaXNwYXRjaEV2ZW50KGV2ZW50KSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGV2ZW50LCAndGFyZ2V0JywgeyB2YWx1ZTogZW1pdHRlciB9KTtcbiAgICByZXR1cm4gbm9kZS5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBSb3V0ZXI7XG5Sb3V0ZXIuUm91dGUgPSBSb3V0ZTtcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCcuL2V2ZW50cycpO1xuXG4vLyAjIENoaXAgUm91dGluZ1xuXG4vLyBXb3JrIGluc3BpcmVkIGJ5IGFuZCBpbiBzb21lIGNhc2VzIGJhc2VkIG9mZiBvZiB3b3JrIGRvbmUgZm9yIEV4cHJlc3MuanMgKGh0dHBzOi8vZ2l0aHViLmNvbS92aXNpb25tZWRpYS9leHByZXNzKVxuLy8gRXZlbnRzOiBlcnJvciwgY2hhbmdlXG5mdW5jdGlvbiBSb3V0ZXIoKSB7XG4gIEV2ZW50RW1pdHRlci5jYWxsKHRoaXMpO1xuICB0aGlzLnJvdXRlcyA9IFtdO1xuICB0aGlzLnBhcmFtcyA9IHt9O1xuICB0aGlzLnBhcmFtc0V4cCA9IHt9O1xuICB0aGlzLnByZWZpeCA9ICcnO1xufVxuXG5Sb3V0ZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudEVtaXR0ZXIucHJvdG90eXBlKTtcblxuXG4vLyBSZWdpc3RlcnMgYSBgY2FsbGJhY2tgIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aGVuIHRoZSBnaXZlbiBwYXJhbSBgbmFtZWAgaXMgbWF0Y2hlZCBpbiBhIFVSTFxuUm91dGVyLnByb3RvdHlwZS5wYXJhbSA9IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrKSB7XG4gIGlmICh0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAodGhpcy5wYXJhbXNbbmFtZV0gfHwgKHRoaXMucGFyYW1zW25hbWVdID0gW10pKS5wdXNoKGNhbGxiYWNrKTtcbiAgfSBlbHNlIGlmIChjYWxsYmFjayBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgIHRoaXMucGFyYW1zRXhwW25hbWVdID0gY2FsbGJhY2s7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcigncGFyYW0gbXVzdCBoYXZlIGEgY2FsbGJhY2sgb2YgdHlwZSBcImZ1bmN0aW9uXCIgb3IgUmVnRXhwLiBHb3QgJyArIGNhbGxiYWNrICsgJy4nKTtcbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cblxuLy8gUmVnaXN0ZXJzIGEgYGNhbGxiYWNrYCBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2hlbiB0aGUgZ2l2ZW4gcGF0aCBtYXRjaGVzIGEgVVJMLiBUaGUgY2FsbGJhY2sgcmVjZWl2ZXMgdHdvXG4vLyBhcmd1bWVudHMsIGByZXFgLCBhbmQgYG5leHRgLCB3aGVyZSBgcmVxYCByZXByZXNlbnRzIHRoZSByZXF1ZXN0IGFuZCBoYXMgdGhlIHByb3BlcnRpZXMsIGB1cmxgLCBgcGF0aGAsIGBwYXJhbXNgXG4vLyBhbmQgYHF1ZXJ5YC4gYHJlcS5wYXJhbXNgIGlzIGFuIG9iamVjdCB3aXRoIHRoZSBwYXJhbWV0ZXJzIGZyb20gdGhlIHBhdGggKGUuZy4gLzp1c2VybmFtZS8qIHdvdWxkIG1ha2UgYSBwYXJhbXNcbi8vIG9iamVjdCB3aXRoIHR3byBwcm9wZXJ0aWVzLCBgdXNlcm5hbWVgIGFuZCBgKmApLiBgcmVxLnF1ZXJ5YCBpcyBhbiBvYmplY3Qgd2l0aCBrZXktdmFsdWUgcGFpcnMgZnJvbSB0aGUgcXVlcnlcbi8vIHBvcnRpb24gb2YgdGhlIFVSTC5cblJvdXRlci5wcm90b3R5cGUucm91dGUgPSBmdW5jdGlvbihwYXRoLCBjYWxsYmFjaykge1xuICBpZiAodHlwZW9mIGNhbGxiYWNrICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcigncm91dGUgbXVzdCBoYXZlIGEgY2FsbGJhY2sgb2YgdHlwZSBcImZ1bmN0aW9uXCIuIEdvdCAnICsgY2FsbGJhY2sgKyAnLicpO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgIHBhdGggPSAnLycgKyBwYXRoO1xuICAgIHBhdGggPSBwYXRoLnJlcGxhY2UoL1xcL3syLH0vZywgJy8nKTtcbiAgfVxuICB0aGlzLnJvdXRlcy5wdXNoKG5ldyBSb3V0ZShwYXRoLCBjYWxsYmFjaykpO1xuICByZXR1cm4gdGhpcztcbn07XG5cblxuUm91dGVyLnByb3RvdHlwZS5yZWRpcmVjdCA9IGZ1bmN0aW9uKHVybCwgcmVwbGFjZSkge1xuICBpZiAodXJsLmNoYXJBdCgwKSA9PT0gJy4nIHx8IHVybC5zcGxpdCgnLy8nKS5sZW5ndGggPiAxKSB7XG4gICAgdmFyIHBhdGhQYXJ0cyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICBwYXRoUGFydHMuaHJlZiA9IHVybDtcbiAgICB1cmwgPSBwYXRobmFtZShwYXRoUGFydHMpICsgcGF0aFBhcnRzLnNlYXJjaDtcbiAgfSBlbHNlIHtcbiAgICB1cmwgPSB0aGlzLnByZWZpeCArIHVybDtcbiAgfVxuXG4gIGlmICh0aGlzLmN1cnJlbnRVcmwgPT09IHVybCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIFJlZGlyZWN0cyBpZiB0aGUgdXJsIGlzbid0IGF0IHRoaXMgcGFnZS5cbiAgaWYgKCF0aGlzLmhhc2hPbmx5ICYmIHRoaXMucm9vdCAmJiB1cmwuaW5kZXhPZih0aGlzLnJvb3QpICE9PSAwKSB7XG4gICAgbG9jYXRpb24uaHJlZiA9IHVybDtcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgbm90Rm91bmQgPSBmYWxzZTtcbiAgZnVuY3Rpb24gZXJySGFuZGxlcihldmVudCkge1xuICAgIGlmIChldmVudC5kZXRhaWwgPT09ICdub3RGb3VuZCcpIHtcbiAgICAgIG5vdEZvdW5kID0gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgdGhpcy5vbignZXJyb3InLCBlcnJIYW5kbGVyKTtcblxuICBpZiAodGhpcy51c2VQdXNoU3RhdGUpIHtcbiAgICBpZiAocmVwbGFjZSkge1xuICAgICAgaGlzdG9yeS5yZXBsYWNlU3RhdGUoe30sICcnLCB1cmwpO1xuICAgIH0gZWxzZSB7XG4gICAgICBoaXN0b3J5LnB1c2hTdGF0ZSh7fSwgJycsIHVybCk7XG4gICAgfVxuICAgIHRoaXMuY3VycmVudFVybCA9IHVybDtcbiAgICB0aGlzLmRpc3BhdGNoKHVybCk7XG4gIH0gZWxzZSB7XG4gICAgaWYgKCF0aGlzLmhhc2hPbmx5KSB7XG4gICAgICB1cmwgPSB1cmwucmVwbGFjZSh0aGlzLnJvb3QsICcnKTtcbiAgICAgIGlmICh1cmwuY2hhckF0KDApICE9PSAnLycpIHtcbiAgICAgICAgdXJsID0gJy8nICsgdXJsO1xuICAgICAgfVxuICAgIH1cbiAgICBsb2NhdGlvbi5oYXNoID0gKHVybCA9PT0gJy8nID8gJycgOiAnIycgKyB1cmwpO1xuICB9XG5cbiAgdGhpcy5vZmYoJ2Vycm9yJywgZXJySGFuZGxlcik7XG4gIHJldHVybiAhbm90Rm91bmQ7XG59O1xuXG5cblJvdXRlci5wcm90b3R5cGUubGlzdGVuID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICBpZiAoIW9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0ge307XG4gIH1cbiAgaWYgKG9wdGlvbnMuc3RvcCkge1xuICAgIGlmICh0aGlzLl9oYW5kbGVDaGFuZ2UpIHtcbiAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIHRoaXMuX2hhbmRsZUNoYW5nZSk7XG4gICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignaGFzaENoYW5nZScsIHRoaXMuX2hhbmRsZUNoYW5nZSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgaWYgKG9wdGlvbnMucm9vdCAhPSBudWxsKSB0aGlzLnJvb3QgPSBvcHRpb25zLnJvb3Q7XG4gIGlmIChvcHRpb25zLnByZWZpeCAhPSBudWxsKSB0aGlzLnByZWZpeCA9IG9wdGlvbnMucHJlZml4O1xuICBpZiAob3B0aW9ucy5oYXNoT25seSAhPSBudWxsKSB0aGlzLmhhc2hPbmx5ID0gb3B0aW9ucy5oYXNoT25seTtcbiAgdGhpcy51c2VQdXNoU3RhdGUgPSAhdGhpcy5oYXNoT25seSAmJiB3aW5kb3cuaGlzdG9yeSAmJiB3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUgJiYgdHJ1ZTtcbiAgaWYgKHRoaXMucm9vdCA9PSBudWxsICYmICF0aGlzLnVzZVB1c2hTdGF0ZSkgdGhpcy5oYXNoT25seSA9IHRydWU7XG4gIGlmICh0aGlzLmhhc09ubHkpIHRoaXMucHJlZml4ID0gJyc7XG4gIHZhciBldmVudE5hbWUsIGdldFVybDtcblxuICB0aGlzLl9oYW5kbGVDaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdXJsID0gZ2V0VXJsKCk7XG4gICAgaWYgKHRoaXMuY3VycmVudFVybCA9PT0gdXJsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuY3VycmVudFVybCA9IHVybDtcbiAgICB0aGlzLmRpc3BhdGNoKHVybCk7XG4gIH0uYmluZCh0aGlzKTtcblxuXG4gIGlmICh0aGlzLnVzZVB1c2hTdGF0ZSkge1xuICAgIC8vIEZpeCB0aGUgVVJMIGlmIGxpbmtlZCB3aXRoIGEgaGFzaFxuICAgIGlmIChsb2NhdGlvbi5oYXNoKSB7XG4gICAgICB1cmwgPSBsb2NhdGlvbi5wYXRobmFtZS5yZXBsYWNlKC9cXC8kLywgJycpICsgbG9jYXRpb24uaGFzaC5yZXBsYWNlKC9eIz9cXC8/LywgJy8nKTtcbiAgICAgIGhpc3RvcnkucmVwbGFjZVN0YXRlKHt9LCAnJywgdXJsKTtcbiAgICB9XG5cbiAgICBldmVudE5hbWUgPSAncG9wc3RhdGUnO1xuICAgIGdldFVybCA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGxvY2F0aW9uLnBhdGhuYW1lICsgbG9jYXRpb24uc2VhcmNoO1xuICAgIH07XG4gIH0gZWxzZSB7XG5cbiAgICBldmVudE5hbWUgPSAnaGFzaGNoYW5nZSc7XG4gICAgZ2V0VXJsID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbG9jYXRpb24uaGFzaC5yZXBsYWNlKC9eI1xcLz8vLCAnLycpIHx8ICcvJztcbiAgICB9O1xuICB9XG5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCB0aGlzLl9oYW5kbGVDaGFuZ2UpO1xuXG4gIHRoaXMuX2hhbmRsZUNoYW5nZSgpO1xuICByZXR1cm4gdGhpcztcbn07XG5cblxudmFyIHVybFBhcnRzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuXG5Sb3V0ZXIucHJvdG90eXBlLmdldFVybFBhcnRzID0gZnVuY3Rpb24odXJsKSB7XG4gIHVybFBhcnRzLmhyZWYgPSB1cmw7XG4gIHZhciBwYXRoID0gcGF0aG5hbWUodXJsUGFydHMpO1xuICBpZiAocGF0aC5pbmRleE9mKHRoaXMucHJlZml4KSAhPT0gMCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHBhdGggPSBwYXRoLnJlcGxhY2UodGhpcy5wcmVmaXgsICcnKTtcbiAgaWYgKHBhdGguY2hhckF0KDApICE9PSAnLycpIHtcbiAgICBwYXRoID0gJy8nICsgcGF0aDtcbiAgfVxuICByZXR1cm4geyBwYXRoOiBwYXRoLCBxdWVyeTogdXJsUGFydHMuc2VhcmNoIH07XG59O1xuXG5cblJvdXRlci5wcm90b3R5cGUuZ2V0Um91dGVzTWF0Y2hpbmdQYXRoID0gZnVuY3Rpb24ocGF0aCkge1xuICBpZiAocGF0aCA9PSBudWxsKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG4gIHZhciBwYXJhbXNFeHAgPSB0aGlzLnBhcmFtc0V4cDtcblxuICByZXR1cm4gdGhpcy5yb3V0ZXMuZmlsdGVyKGZ1bmN0aW9uKHJvdXRlKSB7XG4gICAgaWYgKCFyb3V0ZS5tYXRjaChwYXRoKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiBPYmplY3Qua2V5cyhyb3V0ZS5wYXJhbXMpLmV2ZXJ5KGZ1bmN0aW9uKGtleSkge1xuICAgICAgdmFyIHZhbHVlID0gcm91dGUucGFyYW1zW2tleV07XG4gICAgICByZXR1cm4gIXBhcmFtc0V4cC5oYXNPd25Qcm9wZXJ0eShrZXkpIHx8IHBhcmFtc0V4cFtrZXldLnRleHQodmFsdWUpO1xuICAgIH0pO1xuICB9KTtcbn07XG5cblxuXG4vLyBEaXNwYXRjaGVzIGFsbCBjYWxsYmFja3Mgd2hpY2ggbWF0Y2ggdGhlIGB1cmxgLiBgdXJsYCBzaG91bGQgYmUgdGhlIGZ1bGwgcGF0aG5hbWUgb2YgdGhlIGxvY2F0aW9uIGFuZCBzaG91bGQgbm90XG4vLyBiZSB1c2VkIGJ5IHlvdXIgYXBwbGljYXRpb24uIFVzZSBgcmVkaXJlY3QoKWAgaW5zdGVhZC5cblJvdXRlci5wcm90b3R5cGUuZGlzcGF0Y2ggPSBmdW5jdGlvbih1cmwpIHtcbiAgdmFyIHVybFBhcnRzID0gdGhpcy5nZXRVcmxQYXJ0cyh1cmwpO1xuICBpZiAoIXVybFBhcnRzKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciBwYXRoID0gdXJsUGFydHMucGF0aDtcbiAgdmFyIHJlcSA9IHsgdXJsOiB1cmwsIHBhdGg6IHBhdGgsIHF1ZXJ5OiBwYXJzZVF1ZXJ5KHVybFBhcnRzLnF1ZXJ5KSB9O1xuICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdjaGFuZ2UnLCB7IGRldGFpbDogcGF0aCB9KSk7XG5cbiAgdmFyIHJvdXRlcyA9IHRoaXMuZ2V0Um91dGVzTWF0Y2hpbmdQYXRoKHBhdGgpO1xuICB2YXIgY2FsbGJhY2tzID0gW107XG4gIHZhciBwYXJhbXMgPSB0aGlzLnBhcmFtcztcblxuICAvLyBBZGQgYWxsIHRoZSBjYWxsYmFja3MgZm9yIHRoaXMgVVJMIChhbGwgbWF0Y2hpbmcgcm91dGVzIGFuZCB0aGUgcGFyYW1zIHRoZXkncmUgZGVwZW5kZW50IG9uKVxuICByb3V0ZXMuZm9yRWFjaChmdW5jdGlvbihyb3V0ZSkge1xuICAgIC8vIHNldCB0aGUgcGFyYW1zIG9uIHRoZSByZXEgb2JqZWN0IGZpcnN0XG4gICAgY2FsbGJhY2tzLnB1c2goZnVuY3Rpb24ocmVxLCBuZXh0KSB7XG4gICAgICByZXEucGFyYW1zID0gcm91dGUucGFyYW1zO1xuICAgICAgbmV4dCgpO1xuICAgIH0pO1xuXG4gICAgT2JqZWN0LmtleXMocm91dGUucGFyYW1zKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgdmFyIHBhcmFtQ2FsbGJhY2tzID0gdGhpcy5wYXJhbXNba2V5XTtcbiAgICAgIGlmIChwYXJhbUNhbGxiYWNrcykge1xuICAgICAgICBjYWxsYmFja3MucHVzaC5hcHBseShjYWxsYmFja3MsIHBhcmFtQ2FsbGJhY2tzKTtcbiAgICAgIH1cbiAgICB9LCB0aGlzKTtcblxuICAgIGNhbGxiYWNrcy5wdXNoKHJvdXRlLmNhbGxiYWNrKTtcbiAgfSwgdGhpcyk7XG5cbiAgLy8gQ2FsbHMgZWFjaCBjYWxsYmFjayBvbmUgYnkgb25lIHVudGlsIGVpdGhlciB0aGVyZSBpcyBhbiBlcnJvciBvciB3ZSBjYWxsIGFsbCBvZiB0aGVtLlxuICB2YXIgbmV4dCA9IGZ1bmN0aW9uKGVycikge1xuICAgIGlmIChlcnIpIHtcbiAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2Vycm9yJywgeyBkZXRhaWw6IGVyciB9KSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCFjYWxsYmFja3MubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gbmV4dCgnbm90Rm91bmQnKTtcbiAgICB9XG5cbiAgICBjYWxsYmFjayA9IGNhbGxiYWNrcy5zaGlmdCgpO1xuICAgIGNhbGxiYWNrKHJlcSwgbmV4dCk7XG4gIH0uYmluZCh0aGlzKTtcblxuICAvLyBTdGFydCBydW5uaW5nIHRoZSBjYWxsYmFja3MsIG9uZSBieSBvbmVcbiAgaWYgKGNhbGxiYWNrcy5sZW5ndGggPT09IDApIHtcbiAgICBuZXh0KCdub3RGb3VuZCcpO1xuICB9IGVsc2Uge1xuICAgIG5leHQoKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuXG4vLyBEZWZpbmVzIGEgY2VudHJhbCByb3V0aW5nIG9iamVjdCB3aGljaCBoYW5kbGVzIGFsbCBVUkwgY2hhbmdlcyBhbmQgcm91dGVzLlxuZnVuY3Rpb24gUm91dGUocGF0aCwgY2FsbGJhY2spIHtcbiAgdGhpcy5wYXRoID0gcGF0aDtcbiAgdGhpcy5jYWxsYmFjayA9IGNhbGxiYWNrO1xuICB0aGlzLmtleXMgPSBbXTtcbiAgdGhpcy5leHByID0gcGFyc2VQYXRoKHBhdGgsIHRoaXMua2V5cyk7XG59XG5cblxuLy8gRGV0ZXJtaW5lcyB3aGV0aGVyIHJvdXRlIG1hdGNoZXMgcGF0aFxuUm91dGUucHJvdG90eXBlLm1hdGNoID0gZnVuY3Rpb24ocGF0aCkge1xuICB2YXIgbWF0Y2ggPSB0aGlzLmV4cHIuZXhlYyhwYXRoKTtcbiAgaWYgKCFtYXRjaCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICB0aGlzLnBhcmFtcyA9IHt9O1xuXG4gIGZvciAodmFyIGkgPSAxOyBpIDwgbWF0Y2gubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIga2V5ID0gdGhpcy5rZXlzW2kgLSAxXTtcbiAgICB2YXIgdmFsdWUgPSBtYXRjaFtpXTtcblxuICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICB2YWx1ZSA9IGRlY29kZVVSSUNvbXBvbmVudCh2YWx1ZSk7XG4gICAgfVxuXG4gICAgaWYgKCFrZXkpIHtcbiAgICAgIGtleSA9ICcqJztcbiAgICB9XG5cbiAgICB0aGlzLnBhcmFtc1trZXldID0gdmFsdWU7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cblxuLy8gTm9ybWFsaXplcyB0aGUgZ2l2ZW4gcGF0aCBzdHJpbmcsIHJldHVybmluZyBhIHJlZ3VsYXIgZXhwcmVzc2lvbi5cbi8vXG4vLyBBbiBlbXB0eSBhcnJheSBzaG91bGQgYmUgcGFzc2VkLCB3aGljaCB3aWxsIGNvbnRhaW4gdGhlIHBsYWNlaG9sZGVyIGtleSBuYW1lcy4gRm9yIGV4YW1wbGUgYFwiL3VzZXIvOmlkXCJgIHdpbGwgdGhlblxuLy8gY29udGFpbiBgW1wiaWRcIl1gLlxuZnVuY3Rpb24gcGFyc2VQYXRoKHBhdGgsIGtleXMpIHtcbiAgaWYgKHBhdGggaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICByZXR1cm4gcGF0aDtcbiAgfVxuXG4gIGlmIChBcnJheS5pc0FycmF5KHBhdGgpKSB7XG4gICAgcGF0aCA9ICcoJyArIHBhdGguam9pbignfCcpICsgJyknO1xuICB9XG5cbiAgcGF0aCA9IHBhdGhcbiAgICAuY29uY2F0KCcvPycpXG4gICAgLnJlcGxhY2UoL1xcL1xcKC9nLCAnKD86LycpXG4gICAgLnJlcGxhY2UoLyhcXC8pPyhcXC4pPzooXFx3KykoPzooXFwoLio/XFwpKSk/KFxcPyk/KFxcKik/L2csIGZ1bmN0aW9uKF8sIHNsYXNoLCBmb3JtYXQsIGtleSwgY2FwdHVyZSwgb3B0aW9uYWwsIHN0YXIpIHtcbiAgICAgIGtleXMucHVzaChrZXkpO1xuICAgICAgc2xhc2ggPSBzbGFzaCB8fCAnJztcbiAgICAgIHZhciBleHByID0gJyc7XG4gICAgICBpZiAoIW9wdGlvbmFsKSBleHByICs9IHNsYXNoO1xuICAgICAgZXhwciArPSAnKD86JztcbiAgICAgIGlmIChvcHRpb25hbCkgZXhwciArPSBzbGFzaDtcbiAgICAgIGV4cHIgKz0gZm9ybWF0IHx8ICcnO1xuICAgICAgZXhwciArPSBjYXB0dXJlIHx8IChmb3JtYXQgJiYgJyhbXi8uXSs/KScgfHwgJyhbXi9dKz8pJykgKyAnKSc7XG4gICAgICBleHByICs9IG9wdGlvbmFsIHx8ICcnO1xuICAgICAgaWYgKHN0YXIpIGV4cHIgKz0gJygvKik/JztcbiAgICAgIHJldHVybiBleHByO1xuICAgIH0pXG4gICAgLnJlcGxhY2UoLyhbXFwvLl0pL2csICdcXFxcJDEnKVxuICAgIC5yZXBsYWNlKC9cXCovZywgJyguKiknKTtcbiAgcmV0dXJuIG5ldyBSZWdFeHAoJ14nICsgcGF0aCArICckJywgJ2knKTtcbn1cblxuXG4vLyBQYXJzZXMgYSBsb2NhdGlvbi5zZWFyY2ggc3RyaW5nIGludG8gYW4gb2JqZWN0IHdpdGgga2V5LXZhbHVlIHBhaXJzLlxuZnVuY3Rpb24gcGFyc2VRdWVyeShzZWFyY2gpIHtcbiAgdmFyIHF1ZXJ5ID0ge307XG4gIGlmIChzZWFyY2ggPT09ICcnKSB7XG4gICAgcmV0dXJuIHF1ZXJ5O1xuICB9XG5cbiAgc2VhcmNoLnJlcGxhY2UoL15cXD8vLCAnJykuc3BsaXQoJyYnKS5mb3JFYWNoKGZ1bmN0aW9uKGtleVZhbHVlKSB7XG4gICAgdmFyIHBhcnRzID0ga2V5VmFsdWUuc3BsaXQoJz0nKTtcbiAgICB2YXIga2V5ID0gcGFydHNbMF07XG4gICAgdmFyIHZhbHVlID0gcGFydHNbMV07XG4gICAgcXVlcnlbZGVjb2RlVVJJQ29tcG9uZW50KGtleSldID0gZGVjb2RlVVJJQ29tcG9uZW50KHZhbHVlKTtcbiAgfSk7XG5cbiAgcmV0dXJuIHF1ZXJ5O1xufVxuXG4vLyBGaXggSUUncyBtaXNzaW5nIHNsYXNoIHByZWZpeFxuZnVuY3Rpb24gcGF0aG5hbWUoYW5jaG9yKSB7XG4gIHZhciBwYXRoID0gYW5jaG9yLnBhdGhuYW1lO1xuICBpZiAocGF0aC5jaGFyQXQoMCkgIT09ICcvJykge1xuICAgIHBhdGggPSAnLycgKyBwYXRoO1xuICB9XG4gIHJldHVybiBwYXRoO1xufVxuIiwidmFyIEZyYWdtZW50cyA9IHJlcXVpcmUoJy4vc3JjL2ZyYWdtZW50cycpO1xudmFyIE9ic2VydmVyID0gcmVxdWlyZSgnLi9zcmMvb2JzZXJ2ZXInKTtcblxuZnVuY3Rpb24gY3JlYXRlKCkge1xuICB2YXIgZnJhZ21lbnRzID0gbmV3IEZyYWdtZW50cyhPYnNlcnZlcik7XG4gIGZyYWdtZW50cy5leHByZXNzaW9uID0gT2JzZXJ2ZXIuZXhwcmVzc2lvbjtcbiAgZnJhZ21lbnRzLnN5bmMgPSBPYnNlcnZlci5zeW5jO1xuICByZXR1cm4gZnJhZ21lbnRzO1xufVxuXG4vLyBDcmVhdGUgYW4gaW5zdGFuY2Ugb2YgZnJhZ21lbnRzIHdpdGggdGhlIGRlZmF1bHQgb2JzZXJ2ZXJcbm1vZHVsZS5leHBvcnRzID0gY3JlYXRlKCk7XG5tb2R1bGUuZXhwb3J0cy5jcmVhdGUgPSBjcmVhdGU7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IEFuaW1hdGVkQmluZGluZztcbnZhciBhbmltYXRpb24gPSByZXF1aXJlKCcuL3V0aWwvYW5pbWF0aW9uJyk7XG52YXIgQmluZGluZyA9IHJlcXVpcmUoJy4vYmluZGluZycpO1xudmFyIF9zdXBlciA9IEJpbmRpbmcucHJvdG90eXBlO1xuXG4vKipcbiAqIEJpbmRpbmdzIHdoaWNoIGV4dGVuZCBBbmltYXRlZEJpbmRpbmcgaGF2ZSB0aGUgYWJpbGl0eSB0byBhbmltYXRlIGVsZW1lbnRzIHRoYXQgYXJlIGFkZGVkIHRvIHRoZSBET00gYW5kIHJlbW92ZWQgZnJvbVxuICogdGhlIERPTS4gVGhpcyBhbGxvd3MgbWVudXMgdG8gc2xpZGUgb3BlbiBhbmQgY2xvc2VkLCBlbGVtZW50cyB0byBmYWRlIGluIG9yIGRyb3AgZG93biwgYW5kIHJlcGVhdGVkIGl0ZW1zIHRvIGFwcGVhclxuICogdG8gbW92ZSAoaWYgeW91IGdldCBjcmVhdGl2ZSBlbm91Z2gpLlxuICpcbiAqIFRoZSBmb2xsb3dpbmcgNSBtZXRob2RzIGFyZSBoZWxwZXIgRE9NIG1ldGhvZHMgdGhhdCBhbGxvdyByZWdpc3RlcmVkIGJpbmRpbmdzIHRvIHdvcmsgd2l0aCBDU1MgdHJhbnNpdGlvbnMgZm9yXG4gKiBhbmltYXRpbmcgZWxlbWVudHMuIElmIGFuIGVsZW1lbnQgaGFzIHRoZSBgYW5pbWF0ZWAgYXR0cmlidXRlIG9yIGEgbWF0Y2hpbmcgSmF2YVNjcmlwdCBtZXRob2QsIHRoZXNlIGhlbHBlciBtZXRob2RzXG4gKiB3aWxsIHNldCBhIGNsYXNzIG9uIHRoZSBub2RlIHRvIHRyaWdnZXIgdGhlIGFuaW1hdGlvbiBhbmQvb3IgY2FsbCB0aGUgSmF2YVNjcmlwdCBtZXRob2RzIHRvIGhhbmRsZSBpdC5cbiAqXG4gKiBBbiBhbmltYXRpb24gbWF5IGJlIGVpdGhlciBhIENTUyB0cmFuc2l0aW9uLCBhIENTUyBhbmltYXRpb24sIG9yIGEgc2V0IG9mIEphdmFTY3JpcHQgbWV0aG9kcyB0aGF0IHdpbGwgYmUgY2FsbGVkLlxuICpcbiAqIElmIHVzaW5nIENTUywgY2xhc3NlcyBhcmUgYWRkZWQgYW5kIHJlbW92ZWQgZnJvbSB0aGUgZWxlbWVudC4gV2hlbiBhbiBlbGVtZW50IGlzIGluc2VydGVkIGl0IHdpbGwgcmVjZWl2ZSB0aGUgYHdpbGwtXG4gKiBhbmltYXRlLWluYCBjbGFzcyBiZWZvcmUgYmVpbmcgYWRkZWQgdG8gdGhlIERPTSwgdGhlbiBpdCB3aWxsIHJlY2VpdmUgdGhlIGBhbmltYXRlLWluYCBjbGFzcyBpbW1lZGlhdGVseSBhZnRlciBiZWluZ1xuICogYWRkZWQgdG8gdGhlIERPTSwgdGhlbiBib3RoIGNsYXNlcyB3aWxsIGJlIHJlbW92ZWQgYWZ0ZXIgdGhlIGFuaW1hdGlvbiBpcyBjb21wbGV0ZS4gV2hlbiBhbiBlbGVtZW50IGlzIGJlaW5nIHJlbW92ZWRcbiAqIGZyb20gdGhlIERPTSBpdCB3aWxsIHJlY2VpdmUgdGhlIGB3aWxsLWFuaW1hdGUtb3V0YCBhbmQgYGFuaW1hdGUtb3V0YCBjbGFzc2VzLCB0aGVuIHRoZSBjbGFzc2VzIHdpbGwgYmUgcmVtb3ZlZCBvbmNlXG4gKiB0aGUgYW5pbWF0aW9uIGlzIGNvbXBsZXRlLlxuICpcbiAqIElmIHVzaW5nIEphdmFTY3JpcHQsIG1ldGhvZHMgbXVzdCBiZSBkZWZpbmVkICB0byBhbmltYXRlIHRoZSBlbGVtZW50IHRoZXJlIGFyZSAzIHN1cHBvcnRlZCBtZXRob2RzIHdoaWNoIGNhbiBiXG4gKlxuICogVE9ETyBjYWNoZSBieSBjbGFzcy1uYW1lIChBbmd1bGFyKT8gT25seSBzdXBwb3J0IGphdmFzY3JpcHQtc3R5bGUgKEVtYmVyKT8gQWRkIGEgYHdpbGwtYW5pbWF0ZS1pbmAgYW5kXG4gKiBgZGlkLWFuaW1hdGUtaW5gIGV0Yy4/XG4gKiBJRiBoYXMgYW55IGNsYXNzZXMsIGFkZCB0aGUgYHdpbGwtYW5pbWF0ZS1pbnxvdXRgIGFuZCBnZXQgY29tcHV0ZWQgZHVyYXRpb24uIElmIG5vbmUsIHJldHVybi4gQ2FjaGUuXG4gKiBSVUxFIGlzIHVzZSB1bmlxdWUgY2xhc3MgdG8gZGVmaW5lIGFuIGFuaW1hdGlvbi4gT3IgYXR0cmlidXRlIGBhbmltYXRlPVwiZmFkZVwiYCB3aWxsIGFkZCB0aGUgY2xhc3M/XG4gKiBgLmZhZGUud2lsbC1hbmltYXRlLWluYCwgYC5mYWRlLmFuaW1hdGUtaW5gLCBgLmZhZGUud2lsbC1hbmltYXRlLW91dGAsIGAuZmFkZS5hbmltYXRlLW91dGBcbiAqXG4gKiBFdmVudHMgd2lsbCBiZSB0cmlnZ2VyZWQgb24gdGhlIGVsZW1lbnRzIG5hbWVkIHRoZSBzYW1lIGFzIHRoZSBjbGFzcyBuYW1lcyAoZS5nLiBgYW5pbWF0ZS1pbmApIHdoaWNoIG1heSBiZSBsaXN0ZW5lZFxuICogdG8gaW4gb3JkZXIgdG8gY2FuY2VsIGFuIGFuaW1hdGlvbiBvciByZXNwb25kIHRvIGl0LlxuICpcbiAqIElmIHRoZSBub2RlIGhhcyBtZXRob2RzIGBhbmltYXRlSW4oZG9uZSlgLCBgYW5pbWF0ZU91dChkb25lKWAsIGBhbmltYXRlTW92ZUluKGRvbmUpYCwgb3IgYGFuaW1hdGVNb3ZlT3V0KGRvbmUpYFxuICogZGVmaW5lZCBvbiB0aGVtIHRoZW4gdGhlIGhlbHBlcnMgd2lsbCBhbGxvdyBhbiBhbmltYXRpb24gaW4gSmF2YVNjcmlwdCB0byBiZSBydW4gYW5kIHdhaXQgZm9yIHRoZSBgZG9uZWAgZnVuY3Rpb24gdG9cbiAqIGJlIGNhbGxlZCB0byBrbm93IHdoZW4gdGhlIGFuaW1hdGlvbiBpcyBjb21wbGV0ZS5cbiAqXG4gKiBCZSBzdXJlIHRvIGFjdHVhbGx5IGhhdmUgYW4gYW5pbWF0aW9uIGRlZmluZWQgZm9yIGVsZW1lbnRzIHdpdGggdGhlIGBhbmltYXRlYCBjbGFzcy9hdHRyaWJ1dGUgYmVjYXVzZSB0aGUgaGVscGVycyB1c2VcbiAqIHRoZSBgdHJhbnNpdGlvbmVuZGAgYW5kIGBhbmltYXRpb25lbmRgIGV2ZW50cyB0byBrbm93IHdoZW4gdGhlIGFuaW1hdGlvbiBpcyBmaW5pc2hlZCwgYW5kIGlmIHRoZXJlIGlzIG5vIGFuaW1hdGlvblxuICogdGhlc2UgZXZlbnRzIHdpbGwgbmV2ZXIgYmUgdHJpZ2dlcmVkIGFuZCB0aGUgb3BlcmF0aW9uIHdpbGwgbmV2ZXIgY29tcGxldGUuXG4gKi9cbmZ1bmN0aW9uIEFuaW1hdGVkQmluZGluZyhwcm9wZXJ0aWVzKSB7XG4gIHZhciBlbGVtZW50ID0gcHJvcGVydGllcy5ub2RlO1xuICB2YXIgYW5pbWF0ZSA9IGVsZW1lbnQuZ2V0QXR0cmlidXRlKHByb3BlcnRpZXMuZnJhZ21lbnRzLmFuaW1hdGVBdHRyaWJ1dGUpO1xuICB2YXIgZnJhZ21lbnRzID0gcHJvcGVydGllcy5mcmFnbWVudHM7XG5cbiAgaWYgKGFuaW1hdGUgIT09IG51bGwpIHtcbiAgICBpZiAoZWxlbWVudC5ub2RlTmFtZSA9PT0gJ1RFTVBMQVRFJyB8fCBlbGVtZW50Lm5vZGVOYW1lID09PSAnU0NSSVBUJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgYW5pbWF0ZSBtdWx0aXBsZSBub2RlcyBpbiBhIHRlbXBsYXRlIG9yIHNjcmlwdC4gUmVtb3ZlIHRoZSBbYW5pbWF0ZV0gYXR0cmlidXRlLicpO1xuICAgIH1cblxuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAvLyBBbGxvdyBtdWx0aXBsZSBiaW5kaW5ncyB0byBhbmltYXRlIGJ5IG5vdCByZW1vdmluZyB1bnRpbCB0aGV5IGhhdmUgYWxsIGJlZW4gY3JlYXRlZFxuICAgICAgZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUocHJvcGVydGllcy5mcmFnbWVudHMuYW5pbWF0ZUF0dHJpYnV0ZSk7XG4gICAgfSk7XG5cbiAgICB0aGlzLmFuaW1hdGUgPSB0cnVlO1xuXG4gICAgaWYgKGZyYWdtZW50cy5pc0JvdW5kKCdhdHRyaWJ1dGUnLCBhbmltYXRlKSkge1xuICAgICAgLy8gamF2YXNjcmlwdCBhbmltYXRpb25cbiAgICAgIHRoaXMuYW5pbWF0ZUV4cHJlc3Npb24gPSBmcmFnbWVudHMuY29kaWZ5RXhwcmVzc2lvbignYXR0cmlidXRlJywgYW5pbWF0ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChhbmltYXRlWzBdID09PSAnLicpIHtcbiAgICAgICAgLy8gY2xhc3MgYW5pbWF0aW9uXG4gICAgICAgIHRoaXMuYW5pbWF0ZUNsYXNzTmFtZSA9IGFuaW1hdGUuc2xpY2UoMSk7XG4gICAgICB9IGVsc2UgaWYgKGFuaW1hdGUpIHtcbiAgICAgICAgLy8gcmVnaXN0ZXJlZCBhbmltYXRpb25cbiAgICAgICAgdmFyIGFuaW1hdGVPYmplY3QgPSBmcmFnbWVudHMuZ2V0QW5pbWF0aW9uKGFuaW1hdGUpO1xuICAgICAgICBpZiAodHlwZW9mIGFuaW1hdGVPYmplY3QgPT09ICdmdW5jdGlvbicpIGFuaW1hdGVPYmplY3QgPSBuZXcgYW5pbWF0ZU9iamVjdCh0aGlzKTtcbiAgICAgICAgdGhpcy5hbmltYXRlT2JqZWN0ID0gYW5pbWF0ZU9iamVjdDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBCaW5kaW5nLmNhbGwodGhpcywgcHJvcGVydGllcyk7XG59XG5cblxuQmluZGluZy5leHRlbmQoQW5pbWF0ZWRCaW5kaW5nLCB7XG4gIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIF9zdXBlci5pbml0LmNhbGwodGhpcyk7XG5cbiAgICBpZiAodGhpcy5hbmltYXRlRXhwcmVzc2lvbikge1xuICAgICAgdGhpcy5hbmltYXRlT2JzZXJ2ZXIgPSBuZXcgdGhpcy5PYnNlcnZlcih0aGlzLmFuaW1hdGVFeHByZXNzaW9uLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGlzLmFuaW1hdGVPYmplY3QgPSB2YWx1ZTtcbiAgICAgIH0sIHRoaXMpO1xuICAgIH1cbiAgfSxcblxuICBiaW5kOiBmdW5jdGlvbihjb250ZXh0KSB7XG4gICAgaWYgKHRoaXMuY29udGV4dCA9PSBjb250ZXh0KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIF9zdXBlci5iaW5kLmNhbGwodGhpcywgY29udGV4dCk7XG5cbiAgICBpZiAodGhpcy5hbmltYXRlT2JzZXJ2ZXIpIHtcbiAgICAgIHRoaXMuYW5pbWF0ZU9ic2VydmVyLmJpbmQoY29udGV4dCk7XG4gICAgfVxuICB9LFxuXG4gIHVuYmluZDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuY29udGV4dCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBfc3VwZXIudW5iaW5kLmNhbGwodGhpcyk7XG5cbiAgICBpZiAodGhpcy5hbmltYXRlT2JzZXJ2ZXIpIHtcbiAgICAgIHRoaXMuYW5pbWF0ZU9ic2VydmVyLnVuYmluZCgpO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogSGVscGVyIG1ldGhvZCB0byByZW1vdmUgYSBub2RlIGZyb20gdGhlIERPTSwgYWxsb3dpbmcgZm9yIGFuaW1hdGlvbnMgdG8gb2NjdXIuIGBjYWxsYmFja2Agd2lsbCBiZSBjYWxsZWQgd2hlblxuICAgKiBmaW5pc2hlZC5cbiAgICovXG4gIGFuaW1hdGVPdXQ6IGZ1bmN0aW9uKG5vZGUsIGRvbnREaXNwb3NlLCBjYWxsYmFjaykge1xuICAgIGlmICh0eXBlb2YgZG9udERpc3Bvc2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNhbGxiYWNrID0gZG9udERpc3Bvc2U7XG4gICAgICBkb250RGlzcG9zZSA9IGZhbHNlO1xuICAgIH1cbiAgICBpZiAobm9kZS5maXJzdFZpZXdOb2RlKSBub2RlID0gbm9kZS5maXJzdFZpZXdOb2RlO1xuXG4gICAgdGhpcy5hbmltYXRlTm9kZSgnb3V0Jywgbm9kZSwgZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoIWRvbnREaXNwb3NlKSB7XG4gICAgICAgIG5vZGUudmlldy5kaXNwb3NlKCk7XG4gICAgICB9XG4gICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrLmNhbGwodGhpcyk7XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEhlbHBlciBtZXRob2QgdG8gaW5zZXJ0IGEgbm9kZSBpbiB0aGUgRE9NIGJlZm9yZSBhbm90aGVyIG5vZGUsIGFsbG93aW5nIGZvciBhbmltYXRpb25zIHRvIG9jY3VyLiBgY2FsbGJhY2tgIHdpbGxcbiAgICogYmUgY2FsbGVkIHdoZW4gZmluaXNoZWQuIElmIGBiZWZvcmVgIGlzIG5vdCBwcm92aWRlZCB0aGVuIHRoZSBhbmltYXRpb24gd2lsbCBiZSBydW4gd2l0aG91dCBpbnNlcnRpbmcgdGhlIG5vZGUuXG4gICAqL1xuICBhbmltYXRlSW46IGZ1bmN0aW9uKG5vZGUsIGJlZm9yZSwgY2FsbGJhY2spIHtcbiAgICBpZiAodHlwZW9mIGJlZm9yZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY2FsbGJhY2sgPSBiZWZvcmU7XG4gICAgICBiZWZvcmUgPSBudWxsO1xuICAgIH1cbiAgICBpZiAobm9kZS5maXJzdFZpZXdOb2RlKSBub2RlID0gbm9kZS5maXJzdFZpZXdOb2RlO1xuICAgIGlmIChiZWZvcmUgJiYgYmVmb3JlLmZpcnN0Vmlld05vZGUpIGJlZm9yZSA9IGJlZm9yZS5maXJzdFZpZXdOb2RlO1xuXG4gICAgaWYgKGJlZm9yZSkge1xuICAgICAgYmVmb3JlLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKG5vZGUsIGJlZm9yZSk7XG4gICAgfVxuICAgIHRoaXMuYW5pbWF0ZU5vZGUoJ2luJywgbm9kZSwgY2FsbGJhY2ssIHRoaXMpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBbGxvdyBhbiBlbGVtZW50IHRvIHVzZSBDU1MzIHRyYW5zaXRpb25zIG9yIGFuaW1hdGlvbnMgdG8gYW5pbWF0ZSBpbiBvciBvdXQgb2YgdGhlIHBhZ2UuXG4gICAqL1xuICBhbmltYXRlTm9kZTogZnVuY3Rpb24oZGlyZWN0aW9uLCBub2RlLCBjYWxsYmFjaykge1xuICAgIHZhciBhbmltYXRlT2JqZWN0LCBjbGFzc05hbWUsIG5hbWUsIHdpbGxOYW1lLCBkaWROYW1lLCBfdGhpcyA9IHRoaXM7XG5cbiAgICBpZiAodGhpcy5hbmltYXRlT2JqZWN0ICYmIHR5cGVvZiB0aGlzLmFuaW1hdGVPYmplY3QgPT09ICdvYmplY3QnKSB7XG4gICAgICBhbmltYXRlT2JqZWN0ID0gdGhpcy5hbmltYXRlT2JqZWN0O1xuICAgIH0gZWxzZSBpZiAodGhpcy5hbmltYXRlQ2xhc3NOYW1lKSB7XG4gICAgICBjbGFzc05hbWUgPSB0aGlzLmFuaW1hdGVDbGFzc05hbWU7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdGhpcy5hbmltYXRlT2JqZWN0ID09PSAnc3RyaW5nJykge1xuICAgICAgY2xhc3NOYW1lID0gdGhpcy5hbmltYXRlT2JqZWN0O1xuICAgIH1cblxuICAgIGlmIChhbmltYXRlT2JqZWN0KSB7XG4gICAgICB2YXIgZGlyID0gZGlyZWN0aW9uID09PSAnaW4nID8gJ0luJyA6ICdPdXQnO1xuICAgICAgbmFtZSA9ICdhbmltYXRlJyArIGRpcjtcbiAgICAgIHdpbGxOYW1lID0gJ3dpbGxBbmltYXRlJyArIGRpcjtcbiAgICAgIGRpZE5hbWUgPSAnZGlkQW5pbWF0ZScgKyBkaXI7XG5cbiAgICAgIGFuaW1hdGlvbi5tYWtlRWxlbWVudEFuaW1hdGFibGUobm9kZSk7XG5cbiAgICAgIGlmIChhbmltYXRlT2JqZWN0W3dpbGxOYW1lXSkge1xuICAgICAgICBhbmltYXRlT2JqZWN0W3dpbGxOYW1lXShub2RlKTtcbiAgICAgICAgLy8gdHJpZ2dlciByZWZsb3dcbiAgICAgICAgbm9kZS5vZmZzZXRXaWR0aCA9IG5vZGUub2Zmc2V0V2lkdGg7XG4gICAgICB9XG5cbiAgICAgIGlmIChhbmltYXRlT2JqZWN0W25hbWVdKSB7XG4gICAgICAgIGFuaW1hdGVPYmplY3RbbmFtZV0obm9kZSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKGFuaW1hdGVPYmplY3RbZGlkTmFtZV0pIGFuaW1hdGVPYmplY3RbZGlkTmFtZV0obm9kZSk7XG4gICAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjay5jYWxsKF90aGlzKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG5hbWUgPSAnYW5pbWF0ZS0nICsgZGlyZWN0aW9uO1xuICAgICAgd2lsbE5hbWUgPSAnd2lsbC1hbmltYXRlLScgKyBkaXJlY3Rpb247XG4gICAgICBpZiAoY2xhc3NOYW1lKSBub2RlLmNsYXNzTGlzdC5hZGQoY2xhc3NOYW1lKTtcblxuICAgICAgbm9kZS5jbGFzc0xpc3QuYWRkKHdpbGxOYW1lKTtcblxuICAgICAgLy8gdHJpZ2dlciByZWZsb3dcbiAgICAgIG5vZGUub2Zmc2V0V2lkdGggPSBub2RlLm9mZnNldFdpZHRoO1xuICAgICAgbm9kZS5jbGFzc0xpc3QucmVtb3ZlKHdpbGxOYW1lKTtcbiAgICAgIG5vZGUuY2xhc3NMaXN0LmFkZChuYW1lKTtcblxuICAgICAgdmFyIGR1cmF0aW9uID0gZ2V0RHVyYXRpb24uY2FsbCh0aGlzLCBub2RlLCBkaXJlY3Rpb24pO1xuICAgICAgZnVuY3Rpb24gd2hlbkRvbmUoKSB7XG4gICAgICAgIG5vZGUuY2xhc3NMaXN0LnJlbW92ZShuYW1lKTtcbiAgICAgICAgaWYgKGNsYXNzTmFtZSkgbm9kZS5jbGFzc0xpc3QucmVtb3ZlKGNsYXNzTmFtZSk7XG4gICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2suY2FsbChfdGhpcyk7XG4gICAgICB9XG5cbiAgICAgIGlmIChkdXJhdGlvbikge1xuICAgICAgICBzZXRUaW1lb3V0KHdoZW5Eb25lLCBkdXJhdGlvbik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB3aGVuRG9uZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufSk7XG5cblxudmFyIHRyYW5zaXRpb25EdXJhdGlvbk5hbWUgPSAndHJhbnNpdGlvbkR1cmF0aW9uJztcbnZhciB0cmFuc2l0aW9uRGVsYXlOYW1lID0gJ3RyYW5zaXRpb25EZWxheSc7XG52YXIgYW5pbWF0aW9uRHVyYXRpb25OYW1lID0gJ2FuaW1hdGlvbkR1cmF0aW9uJztcbnZhciBhbmltYXRpb25EZWxheU5hbWUgPSAnYW5pbWF0aW9uRGVsYXknO1xudmFyIHN0eWxlID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlO1xuaWYgKHN0eWxlLnRyYW5zaXRpb25EdXJhdGlvbiA9PT0gdW5kZWZpbmVkICYmIHN0eWxlLndlYmtpdFRyYW5zaXRpb25EdXJhdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gIHRyYW5zaXRpb25EdXJhdGlvbk5hbWUgPSAnd2Via2l0VHJhbnNpdGlvbkR1cmF0aW9uJztcbiAgdHJhbnNpdGlvbkRlbGF5TmFtZSA9ICd3ZWJraXRUcmFuc2l0aW9uRGVsYXknO1xufVxuaWYgKHN0eWxlLmFuaW1hdGlvbkR1cmF0aW9uID09PSB1bmRlZmluZWQgJiYgc3R5bGUud2Via2l0QW5pbWF0aW9uRHVyYXRpb24gIT09IHVuZGVmaW5lZCkge1xuICBhbmltYXRpb25EdXJhdGlvbk5hbWUgPSAnd2Via2l0QW5pbWF0aW9uRHVyYXRpb24nO1xuICBhbmltYXRpb25EZWxheU5hbWUgPSAnd2Via2l0QW5pbWF0aW9uRGVsYXknO1xufVxuXG5cbmZ1bmN0aW9uIGdldER1cmF0aW9uKG5vZGUsIGRpcmVjdGlvbikge1xuICB2YXIgbWlsbGlzZWNvbmRzID0gdGhpcy5jbG9uZWRGcm9tWydfX2FuaW1hdGlvbkR1cmF0aW9uJyArIGRpcmVjdGlvbl07XG4gIGlmICghbWlsbGlzZWNvbmRzKSB7XG4gICAgLy8gUmVjYWxjIGlmIG5vZGUgd2FzIG91dCBvZiBET00gYmVmb3JlIGFuZCBoYWQgMCBkdXJhdGlvbiwgYXNzdW1lIHRoZXJlIGlzIGFsd2F5cyBTT01FIGR1cmF0aW9uLlxuICAgIHZhciBzdHlsZXMgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShub2RlKTtcbiAgICB2YXIgc2Vjb25kcyA9IE1hdGgubWF4KHBhcnNlRmxvYXQoc3R5bGVzW3RyYW5zaXRpb25EdXJhdGlvbk5hbWVdIHx8IDApICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlRmxvYXQoc3R5bGVzW3RyYW5zaXRpb25EZWxheU5hbWVdIHx8IDApLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VGbG9hdChzdHlsZXNbYW5pbWF0aW9uRHVyYXRpb25OYW1lXSB8fCAwKSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJzZUZsb2F0KHN0eWxlc1thbmltYXRpb25EZWxheU5hbWVdIHx8IDApKTtcbiAgICBtaWxsaXNlY29uZHMgPSBzZWNvbmRzICogMTAwMCB8fCAwO1xuICAgIHRoaXMuY2xvbmVkRnJvbS5fX2FuaW1hdGlvbkR1cmF0aW9uX18gPSBtaWxsaXNlY29uZHM7XG4gIH1cbiAgcmV0dXJuIG1pbGxpc2Vjb25kcztcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gQmluZGluZztcbnZhciBleHRlbmQgPSByZXF1aXJlKCcuL3V0aWwvZXh0ZW5kJyk7XG5cbi8qKlxuICogQSBiaW5kaW5nIGlzIGEgbGluayBiZXR3ZWVuIGFuIGVsZW1lbnQgYW5kIHNvbWUgZGF0YS4gU3ViY2xhc3NlcyBvZiBCaW5kaW5nIGNhbGxlZCBiaW5kZXJzIGRlZmluZSB3aGF0IGEgYmluZGluZyBkb2VzXG4gKiB3aXRoIHRoYXQgbGluay4gSW5zdGFuY2VzIG9mIHRoZXNlIGJpbmRlcnMgYXJlIGNyZWF0ZWQgYXMgYmluZGluZ3Mgb24gdGVtcGxhdGVzLiBXaGVuIGEgdmlldyBpcyBzdGFtcGVkIG91dCBmcm9tIHRoZVxuICogdGVtcGxhdGUgdGhlIGJpbmRpbmcgaXMgXCJjbG9uZWRcIiAoaXQgaXMgYWN0dWFsbHkgZXh0ZW5kZWQgZm9yIHBlcmZvcm1hbmNlKSBhbmQgdGhlIGBlbGVtZW50YC9gbm9kZWAgcHJvcGVydHkgaXNcbiAqIHVwZGF0ZWQgdG8gdGhlIG1hdGNoaW5nIGVsZW1lbnQgaW4gdGhlIHZpZXcuXG4gKlxuICogIyMjIFByb3BlcnRpZXNcbiAqICAqIGVsZW1lbnQ6IFRoZSBlbGVtZW50IChvciB0ZXh0IG5vZGUpIHRoaXMgYmluZGluZyBpcyBib3VuZCB0b1xuICogICogbm9kZTogQWxpYXMgb2YgZWxlbWVudCwgc2luY2UgYmluZGluZ3MgbWF5IGFwcGx5IHRvIHRleHQgbm9kZXMgdGhpcyBpcyBtb3JlIGFjY3VyYXRlXG4gKiAgKiBuYW1lOiBUaGUgYXR0cmlidXRlIG9yIGVsZW1lbnQgbmFtZSAoZG9lcyBub3QgYXBwbHkgdG8gbWF0Y2hlZCB0ZXh0IG5vZGVzKVxuICogICogbWF0Y2g6IFRoZSBtYXRjaGVkIHBhcnQgb2YgdGhlIG5hbWUgZm9yIHdpbGRjYXJkIGF0dHJpYnV0ZXMgKGUuZy4gYG9uLSpgIG1hdGNoaW5nIGFnYWluc3QgYG9uLWNsaWNrYCB3b3VsZCBoYXZlIGFcbiAqICAgIG1hdGNoIHByb3BlcnR5IGVxdWFsbGluZyBgY2xpY2tgKS4gVXNlIGB0aGlzLmNhbWVsQ2FzZWAgdG8gZ2V0IHRoZSBtYXRjaCBwcm9lcnR5IGNhbWVsQ2FzZWQuXG4gKiAgKiBleHByZXNzaW9uOiBUaGUgZXhwcmVzc2lvbiB0aGlzIGJpbmRpbmcgd2lsbCB1c2UgZm9yIGl0cyB1cGRhdGVzIChkb2VzIG5vdCBhcHBseSB0byBtYXRjaGVkIGVsZW1lbnRzKVxuICogICogY29udGV4dDogVGhlIGNvbnRleHQgdGhlIGV4cmVzc2lvbiBvcGVyYXRlcyB3aXRoaW4gd2hlbiBib3VuZFxuICovXG5mdW5jdGlvbiBCaW5kaW5nKHByb3BlcnRpZXMpIHtcbiAgaWYgKCFwcm9wZXJ0aWVzLm5vZGUgfHwgIXByb3BlcnRpZXMudmlldykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0EgYmluZGluZyBtdXN0IHJlY2VpdmUgYSBub2RlIGFuZCBhIHZpZXcnKTtcbiAgfVxuXG4gIC8vIGVsZW1lbnQgYW5kIG5vZGUgYXJlIGFsaWFzZXNcbiAgdGhpcy5fZWxlbWVudFBhdGggPSBpbml0Tm9kZVBhdGgocHJvcGVydGllcy5ub2RlLCBwcm9wZXJ0aWVzLnZpZXcpO1xuICB0aGlzLm5vZGUgPSBwcm9wZXJ0aWVzLm5vZGU7XG4gIHRoaXMuZWxlbWVudCA9IHByb3BlcnRpZXMubm9kZTtcbiAgdGhpcy5uYW1lID0gcHJvcGVydGllcy5uYW1lO1xuICB0aGlzLm1hdGNoID0gcHJvcGVydGllcy5tYXRjaDtcbiAgdGhpcy5leHByZXNzaW9uID0gcHJvcGVydGllcy5leHByZXNzaW9uO1xuICB0aGlzLmZyYWdtZW50cyA9IHByb3BlcnRpZXMuZnJhZ21lbnRzO1xuICB0aGlzLmNvbnRleHQgPSBudWxsO1xufVxuXG5leHRlbmQoQmluZGluZywge1xuICAvKipcbiAgICogRGVmYXVsdCBwcmlvcml0eSBiaW5kZXJzIG1heSBvdmVycmlkZS5cbiAgICovXG4gIHByaW9yaXR5OiAwLFxuXG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYSBjbG9uZWQgYmluZGluZy4gVGhpcyBoYXBwZW5zIGFmdGVyIGEgY29tcGlsZWQgYmluZGluZyBvbiBhIHRlbXBsYXRlIGlzIGNsb25lZCBmb3IgYSB2aWV3LlxuICAgKi9cbiAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuZXhwcmVzc2lvbikge1xuICAgICAgLy8gQW4gb2JzZXJ2ZXIgdG8gb2JzZXJ2ZSB2YWx1ZSBjaGFuZ2VzIHRvIHRoZSBleHByZXNzaW9uIHdpdGhpbiBhIGNvbnRleHRcbiAgICAgIHRoaXMub2JzZXJ2ZXIgPSBuZXcgdGhpcy5PYnNlcnZlcih0aGlzLmV4cHJlc3Npb24sIHRoaXMudXBkYXRlZCwgdGhpcyk7XG4gICAgfVxuICAgIHRoaXMuY3JlYXRlZCgpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDbG9uZSB0aGlzIGJpbmRpbmcgZm9yIGEgdmlldy4gVGhlIGVsZW1lbnQvbm9kZSB3aWxsIGJlIHVwZGF0ZWQgYW5kIHRoZSBiaW5kaW5nIHdpbGwgYmUgaW5pdGVkLlxuICAgKi9cbiAgY2xvbmVGb3JWaWV3OiBmdW5jdGlvbih2aWV3KSB7XG4gICAgaWYgKCF2aWV3KSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBIGJpbmRpbmcgbXVzdCBjbG9uZSBhZ2FpbnN0IGEgdmlldycpO1xuICAgIH1cblxuICAgIHZhciBub2RlID0gdmlldztcbiAgICB0aGlzLl9lbGVtZW50UGF0aC5mb3JFYWNoKGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICBub2RlID0gbm9kZS5jaGlsZE5vZGVzW2luZGV4XTtcbiAgICB9KTtcblxuICAgIHZhciBiaW5kaW5nID0gT2JqZWN0LmNyZWF0ZSh0aGlzKTtcbiAgICBiaW5kaW5nLmNsb25lZEZyb20gPSB0aGlzO1xuICAgIGJpbmRpbmcuZWxlbWVudCA9IG5vZGU7XG4gICAgYmluZGluZy5ub2RlID0gbm9kZTtcbiAgICBiaW5kaW5nLmluaXQoKTtcbiAgICByZXR1cm4gYmluZGluZztcbiAgfSxcblxuXG4gIC8vIEJpbmQgdGhpcyB0byB0aGUgZ2l2ZW4gY29udGV4dCBvYmplY3RcbiAgYmluZDogZnVuY3Rpb24oY29udGV4dCkge1xuICAgIGlmICh0aGlzLmNvbnRleHQgPT0gY29udGV4dCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG4gICAgaWYgKHRoaXMub2JzZXJ2ZXIpIHtcbiAgICAgIGlmICh0aGlzLnVwZGF0ZWQgIT09IEJpbmRpbmcucHJvdG90eXBlLnVwZGF0ZWQpIHtcbiAgICAgICAgdGhpcy5vYnNlcnZlci5mb3JjZVVwZGF0ZU5leHRTeW5jID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5vYnNlcnZlci5iaW5kKGNvbnRleHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gc2V0IHRoZSBjb250ZXh0IGJ1dCBkb24ndCBhY3R1YWxseSBiaW5kIGl0IHNpbmNlIGB1cGRhdGVkYCBpcyBhIG5vLW9wXG4gICAgICAgIHRoaXMub2JzZXJ2ZXIuY29udGV4dCA9IGNvbnRleHQ7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuYm91bmQoKTtcbiAgfSxcblxuXG4gIC8vIFVuYmluZCB0aGlzIGZyb20gaXRzIGNvbnRleHRcbiAgdW5iaW5kOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5jb250ZXh0ID09PSBudWxsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5jb250ZXh0ID0gbnVsbDtcbiAgICBpZiAodGhpcy5vYnNlcnZlcikgdGhpcy5vYnNlcnZlci51bmJpbmQoKTtcbiAgICB0aGlzLnVuYm91bmQoKTtcbiAgfSxcblxuXG4gIC8vIFRoZSBmdW5jdGlvbiB0byBydW4gd2hlbiB0aGUgYmluZGluZydzIGVsZW1lbnQgaXMgY29tcGlsZWQgd2l0aGluIGEgdGVtcGxhdGVcbiAgY29tcGlsZWQ6IGZ1bmN0aW9uKCkge30sXG5cbiAgLy8gVGhlIGZ1bmN0aW9uIHRvIHJ1biB3aGVuIHRoZSBiaW5kaW5nJ3MgZWxlbWVudCBpcyBjcmVhdGVkXG4gIGNyZWF0ZWQ6IGZ1bmN0aW9uKCkge30sXG5cbiAgLy8gVGhlIGZ1bmN0aW9uIHRvIHJ1biB3aGVuIHRoZSBleHByZXNzaW9uJ3MgdmFsdWUgY2hhbmdlc1xuICB1cGRhdGVkOiBmdW5jdGlvbigpIHt9LFxuXG4gIC8vIFRoZSBmdW5jdGlvbiB0byBydW4gd2hlbiB0aGUgYmluZGluZyBpcyBib3VuZFxuICBib3VuZDogZnVuY3Rpb24oKSB7fSxcblxuICAvLyBUaGUgZnVuY3Rpb24gdG8gcnVuIHdoZW4gdGhlIGJpbmRpbmcgaXMgdW5ib3VuZFxuICB1bmJvdW5kOiBmdW5jdGlvbigpIHt9LFxuXG4gIC8vIEhlbHBlciBtZXRob2RzXG5cbiAgZ2V0IGNhbWVsQ2FzZSgpIHtcbiAgICByZXR1cm4gKHRoaXMubWF0Y2ggfHwgdGhpcy5uYW1lIHx8ICcnKS5yZXBsYWNlKC8tKyhcXHcpL2csIGZ1bmN0aW9uKF8sIGNoYXIpIHtcbiAgICAgIHJldHVybiBjaGFyLnRvVXBwZXJDYXNlKCk7XG4gICAgfSk7XG4gIH0sXG5cbiAgb2JzZXJ2ZTogZnVuY3Rpb24oZXhwcmVzc2lvbiwgY2FsbGJhY2ssIGNhbGxiYWNrQ29udGV4dCkge1xuICAgIHJldHVybiBuZXcgdGhpcy5PYnNlcnZlcihleHByZXNzaW9uLCBjYWxsYmFjaywgY2FsbGJhY2tDb250ZXh0IHx8IHRoaXMpO1xuICB9XG59KTtcblxuXG5cblxudmFyIGluZGV4T2YgPSBBcnJheS5wcm90b3R5cGUuaW5kZXhPZjtcblxuLy8gQ3JlYXRlcyBhbiBhcnJheSBvZiBpbmRleGVzIHRvIGhlbHAgZmluZCB0aGUgc2FtZSBlbGVtZW50IHdpdGhpbiBhIGNsb25lZCB2aWV3XG5mdW5jdGlvbiBpbml0Tm9kZVBhdGgobm9kZSwgdmlldykge1xuICB2YXIgcGF0aCA9IFtdO1xuICB3aGlsZSAobm9kZSAhPT0gdmlldykge1xuICAgIHZhciBwYXJlbnQgPSBub2RlLnBhcmVudE5vZGU7XG4gICAgcGF0aC51bnNoaWZ0KGluZGV4T2YuY2FsbChwYXJlbnQuY2hpbGROb2Rlcywgbm9kZSkpO1xuICAgIG5vZGUgPSBwYXJlbnQ7XG4gIH1cbiAgcmV0dXJuIHBhdGg7XG59XG4iLCJ2YXIgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG5tb2R1bGUuZXhwb3J0cyA9IGNvbXBpbGU7XG5cblxuLy8gV2Fsa3MgdGhlIHRlbXBsYXRlIERPTSByZXBsYWNpbmcgYW55IGJpbmRpbmdzIGFuZCBjYWNoaW5nIGJpbmRpbmdzIG9udG8gdGhlIHRlbXBsYXRlIG9iamVjdC5cbmZ1bmN0aW9uIGNvbXBpbGUoZnJhZ21lbnRzLCB0ZW1wbGF0ZSkge1xuICB2YXIgd2Fsa2VyID0gZG9jdW1lbnQuY3JlYXRlVHJlZVdhbGtlcih0ZW1wbGF0ZSwgTm9kZUZpbHRlci5TSE9XX0VMRU1FTlQgfCBOb2RlRmlsdGVyLlNIT1dfVEVYVCk7XG4gIHZhciBiaW5kaW5ncyA9IFtdLCBjdXJyZW50Tm9kZSwgcGFyZW50Tm9kZSwgcHJldmlvdXNOb2RlO1xuXG4gIC8vIFJlc2V0IGZpcnN0IG5vZGUgdG8gZW5zdXJlIGl0IGlzbid0IGEgZnJhZ21lbnRcbiAgd2Fsa2VyLm5leHROb2RlKCk7XG4gIHdhbGtlci5wcmV2aW91c05vZGUoKTtcblxuICAvLyBmaW5kIGJpbmRpbmdzIGZvciBlYWNoIG5vZGVcbiAgZG8ge1xuICAgIGN1cnJlbnROb2RlID0gd2Fsa2VyLmN1cnJlbnROb2RlO1xuICAgIHBhcmVudE5vZGUgPSBjdXJyZW50Tm9kZS5wYXJlbnROb2RlO1xuICAgIGJpbmRpbmdzLnB1c2guYXBwbHkoYmluZGluZ3MsIGdldEJpbmRpbmdzRm9yTm9kZShmcmFnbWVudHMsIGN1cnJlbnROb2RlLCB0ZW1wbGF0ZSkpO1xuXG4gICAgaWYgKGN1cnJlbnROb2RlLnBhcmVudE5vZGUgIT09IHBhcmVudE5vZGUpIHtcbiAgICAgIC8vIGN1cnJlbnROb2RlIHdhcyByZW1vdmVkIGFuZCBtYWRlIGEgdGVtcGxhdGVcbiAgICAgIHdhbGtlci5jdXJyZW50Tm9kZSA9IHByZXZpb3VzTm9kZSB8fCB3YWxrZXIucm9vdDtcbiAgICB9IGVsc2Uge1xuICAgICAgcHJldmlvdXNOb2RlID0gY3VycmVudE5vZGU7XG4gICAgfVxuICB9IHdoaWxlICh3YWxrZXIubmV4dE5vZGUoKSk7XG5cbiAgcmV0dXJuIGJpbmRpbmdzO1xufVxuXG5cblxuLy8gRmluZCBhbGwgdGhlIGJpbmRpbmdzIG9uIGEgZ2l2ZW4gbm9kZSAodGV4dCBub2RlcyB3aWxsIG9ubHkgZXZlciBoYXZlIG9uZSBiaW5kaW5nKS5cbmZ1bmN0aW9uIGdldEJpbmRpbmdzRm9yTm9kZShmcmFnbWVudHMsIG5vZGUsIHZpZXcpIHtcbiAgdmFyIGJpbmRpbmdzID0gW107XG4gIHZhciBCaW5kZXIsIGJpbmRpbmcsIGV4cHIsIGJvdW5kLCBtYXRjaCwgYXR0ciwgaTtcblxuICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gTm9kZS5URVhUX05PREUpIHtcbiAgICBzcGxpdFRleHROb2RlKGZyYWdtZW50cywgbm9kZSk7XG5cbiAgICAvLyBGaW5kIGFueSBiaW5kaW5nIGZvciB0aGUgdGV4dCBub2RlXG4gICAgaWYgKGZyYWdtZW50cy5pc0JvdW5kKCd0ZXh0Jywgbm9kZS5ub2RlVmFsdWUpKSB7XG4gICAgICBleHByID0gZnJhZ21lbnRzLmNvZGlmeUV4cHJlc3Npb24oJ3RleHQnLCBub2RlLm5vZGVWYWx1ZSk7XG4gICAgICBub2RlLm5vZGVWYWx1ZSA9ICcnO1xuICAgICAgQmluZGVyID0gZnJhZ21lbnRzLmZpbmRCaW5kZXIoJ3RleHQnLCBleHByKTtcbiAgICAgIGJpbmRpbmcgPSBuZXcgQmluZGVyKHsgbm9kZTogbm9kZSwgdmlldzogdmlldywgZXhwcmVzc2lvbjogZXhwciwgZnJhZ21lbnRzOiBmcmFnbWVudHMgfSk7XG4gICAgICBpZiAoYmluZGluZy5jb21waWxlZCgpICE9PSBmYWxzZSkge1xuICAgICAgICBiaW5kaW5ncy5wdXNoKGJpbmRpbmcpO1xuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyBJZiB0aGUgZWxlbWVudCBpcyByZW1vdmVkIGZyb20gdGhlIERPTSwgc3RvcC4gQ2hlY2sgYnkgbG9va2luZyBhdCBpdHMgcGFyZW50Tm9kZVxuICAgIHZhciBwYXJlbnQgPSBub2RlLnBhcmVudE5vZGU7XG4gICAgdmFyIERlZmF1bHRCaW5kZXIgPSBmcmFnbWVudHMuZ2V0QXR0cmlidXRlQmluZGVyKCdfX2RlZmF1bHRfXycpO1xuXG4gICAgLy8gRmluZCBhbnkgYmluZGluZyBmb3IgdGhlIGVsZW1lbnRcbiAgICBCaW5kZXIgPSBmcmFnbWVudHMuZmluZEJpbmRlcignZWxlbWVudCcsIG5vZGUudGFnTmFtZS50b0xvd2VyQ2FzZSgpKTtcbiAgICBpZiAoQmluZGVyKSB7XG4gICAgICBiaW5kaW5nID0gbmV3IEJpbmRlcih7IG5vZGU6IG5vZGUsIHZpZXc6IHZpZXcsIGZyYWdtZW50czogZnJhZ21lbnRzIH0pO1xuICAgICAgaWYgKGJpbmRpbmcuY29tcGlsZWQoKSAhPT0gZmFsc2UpIHtcbiAgICAgICAgYmluZGluZ3MucHVzaChiaW5kaW5nKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBJZiByZW1vdmVkLCBtYWRlIGEgdGVtcGxhdGUsIGRvbid0IGNvbnRpbnVlIHByb2Nlc3NpbmdcbiAgICBpZiAobm9kZS5wYXJlbnROb2RlICE9PSBwYXJlbnQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBGaW5kIGFuZCBhZGQgYW55IGF0dHJpYnV0ZSBiaW5kaW5ncyBvbiBhbiBlbGVtZW50LiBUaGVzZSBjYW4gYmUgYXR0cmlidXRlcyB3aG9zZSBuYW1lIG1hdGNoZXMgYSBiaW5kaW5nLCBvclxuICAgIC8vIHRoZXkgY2FuIGJlIGF0dHJpYnV0ZXMgd2hpY2ggaGF2ZSBhIGJpbmRpbmcgaW4gdGhlIHZhbHVlIHN1Y2ggYXMgYGhyZWY9XCIvcG9zdC97eyBwb3N0LmlkIH19XCJgLlxuICAgIHZhciBib3VuZCA9IFtdO1xuICAgIHZhciBhdHRyaWJ1dGVzID0gc2xpY2UuY2FsbChub2RlLmF0dHJpYnV0ZXMpO1xuICAgIGZvciAoaSA9IDAsIGwgPSBhdHRyaWJ1dGVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgdmFyIGF0dHIgPSBhdHRyaWJ1dGVzW2ldO1xuICAgICAgdmFyIEJpbmRlciA9IGZyYWdtZW50cy5maW5kQmluZGVyKCdhdHRyaWJ1dGUnLCBhdHRyLm5hbWUsIGF0dHIudmFsdWUpO1xuICAgICAgaWYgKEJpbmRlcikge1xuICAgICAgICBib3VuZC5wdXNoKFsgQmluZGVyLCBhdHRyIF0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE1ha2Ugc3VyZSB0byBjcmVhdGUgYW5kIHByb2Nlc3MgdGhlbSBpbiB0aGUgY29ycmVjdCBwcmlvcml0eSBvcmRlciBzbyBpZiBhIGJpbmRpbmcgY3JlYXRlIGEgdGVtcGxhdGUgZnJvbSB0aGVcbiAgICAvLyBub2RlIGl0IGRvZXNuJ3QgcHJvY2VzcyB0aGUgb3RoZXJzLlxuICAgIGJvdW5kLnNvcnQoc29ydEF0dHJpYnV0ZXMpO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IGJvdW5kLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgQmluZGVyID0gYm91bmRbaV1bMF07XG4gICAgICB2YXIgYXR0ciA9IGJvdW5kW2ldWzFdO1xuICAgICAgdmFyIG5hbWUgPSBhdHRyLm5hbWU7XG4gICAgICB2YXIgdmFsdWUgPSBhdHRyLnZhbHVlO1xuICAgICAgaWYgKEJpbmRlci5leHByKSB7XG4gICAgICAgIG1hdGNoID0gbmFtZS5tYXRjaChCaW5kZXIuZXhwcik7XG4gICAgICAgIGlmIChtYXRjaCkgbWF0Y2ggPSBtYXRjaFsxXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1hdGNoID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgdHJ5IHtcbiAgICAgICAgbm9kZS5yZW1vdmVBdHRyaWJ1dGVOb2RlKGF0dHIpO1xuICAgICAgfSBjYXRjaChlKSB7fVxuXG4gICAgICBiaW5kaW5nID0gbmV3IEJpbmRlcih7XG4gICAgICAgIG5vZGU6IG5vZGUsXG4gICAgICAgIHZpZXc6IHZpZXcsXG4gICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgIG1hdGNoOiBtYXRjaCxcbiAgICAgICAgZXhwcmVzc2lvbjogdmFsdWUgPyBmcmFnbWVudHMuY29kaWZ5RXhwcmVzc2lvbignYXR0cmlidXRlJywgdmFsdWUpIDogbnVsbCxcbiAgICAgICAgZnJhZ21lbnRzOiBmcmFnbWVudHNcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoYmluZGluZy5jb21waWxlZCgpICE9PSBmYWxzZSkge1xuICAgICAgICBiaW5kaW5ncy5wdXNoKGJpbmRpbmcpO1xuICAgICAgfSBlbHNlIGlmIChCaW5kZXIgIT09IERlZmF1bHRCaW5kZXIgJiYgZnJhZ21lbnRzLmlzQm91bmQoJ2F0dHJpYnV0ZScsIHZhbHVlKSkge1xuICAgICAgICAvLyBSZXZlcnQgdG8gZGVmYXVsdCBpZiB0aGlzIGJpbmRpbmcgZG9lc24ndCB0YWtlXG4gICAgICAgIGJvdW5kLnB1c2goWyBEZWZhdWx0QmluZGVyLCBhdHRyIF0pO1xuICAgICAgfVxuXG4gICAgICBpZiAobm9kZS5wYXJlbnROb2RlICE9PSBwYXJlbnQpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJpbmRpbmdzO1xufVxuXG5cbi8vIFNwbGl0cyB0ZXh0IG5vZGVzIHdpdGggZXhwcmVzc2lvbnMgaW4gdGhlbSBzbyB0aGV5IGNhbiBiZSBib3VuZCBpbmRpdmlkdWFsbHksIGhhcyBwYXJlbnROb2RlIHBhc3NlZCBpbiBzaW5jZSBpdCBtYXlcbi8vIGJlIGEgZG9jdW1lbnQgZnJhZ21lbnQgd2hpY2ggYXBwZWFycyBhcyBudWxsIG9uIG5vZGUucGFyZW50Tm9kZS5cbmZ1bmN0aW9uIHNwbGl0VGV4dE5vZGUoZnJhZ21lbnRzLCBub2RlKSB7XG4gIGlmICghbm9kZS5wcm9jZXNzZWQpIHtcbiAgICBub2RlLnByb2Nlc3NlZCA9IHRydWU7XG4gICAgdmFyIHJlZ2V4ID0gZnJhZ21lbnRzLmJpbmRlcnMudGV4dC5fZXhwcjtcbiAgICB2YXIgY29udGVudCA9IG5vZGUubm9kZVZhbHVlO1xuICAgIGlmIChjb250ZW50Lm1hdGNoKHJlZ2V4KSkge1xuICAgICAgdmFyIG1hdGNoLCBsYXN0SW5kZXggPSAwLCBwYXJ0cyA9IFtdLCBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICAgIHdoaWxlIChtYXRjaCA9IHJlZ2V4LmV4ZWMoY29udGVudCkpIHtcbiAgICAgICAgcGFydHMucHVzaChjb250ZW50LnNsaWNlKGxhc3RJbmRleCwgcmVnZXgubGFzdEluZGV4IC0gbWF0Y2hbMF0ubGVuZ3RoKSk7XG4gICAgICAgIHBhcnRzLnB1c2gobWF0Y2hbMF0pO1xuICAgICAgICBsYXN0SW5kZXggPSByZWdleC5sYXN0SW5kZXg7XG4gICAgICB9XG4gICAgICBwYXJ0cy5wdXNoKGNvbnRlbnQuc2xpY2UobGFzdEluZGV4KSk7XG4gICAgICBwYXJ0cyA9IHBhcnRzLmZpbHRlcihub3RFbXB0eSk7XG5cbiAgICAgIG5vZGUubm9kZVZhbHVlID0gcGFydHNbMF07XG4gICAgICBmb3IgKHZhciBpID0gMTsgaSA8IHBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBuZXdUZXh0Tm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHBhcnRzW2ldKTtcbiAgICAgICAgbmV3VGV4dE5vZGUucHJvY2Vzc2VkID0gdHJ1ZTtcbiAgICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQobmV3VGV4dE5vZGUpO1xuICAgICAgfVxuICAgICAgbm9kZS5wYXJlbnROb2RlLmluc2VydEJlZm9yZShmcmFnbWVudCwgbm9kZS5uZXh0U2libGluZyk7XG4gICAgfVxuICB9XG59XG5cblxuZnVuY3Rpb24gc29ydEF0dHJpYnV0ZXMoYSwgYikge1xuICByZXR1cm4gYlswXS5wcm90b3R5cGUucHJpb3JpdHkgLSBhWzBdLnByb3RvdHlwZS5wcmlvcml0eTtcbn1cblxuZnVuY3Rpb24gbm90RW1wdHkodmFsdWUpIHtcbiAgcmV0dXJuIEJvb2xlYW4odmFsdWUpO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBGcmFnbWVudHM7XG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnLi91dGlsL2V4dGVuZCcpO1xudmFyIHRvRnJhZ21lbnQgPSByZXF1aXJlKCcuL3V0aWwvdG9GcmFnbWVudCcpO1xudmFyIGFuaW1hdGlvbiA9IHJlcXVpcmUoJy4vdXRpbC9hbmltYXRpb24nKTtcbnZhciBUZW1wbGF0ZSA9IHJlcXVpcmUoJy4vdGVtcGxhdGUnKTtcbnZhciBWaWV3ID0gcmVxdWlyZSgnLi92aWV3Jyk7XG52YXIgQmluZGluZyA9IHJlcXVpcmUoJy4vYmluZGluZycpO1xudmFyIEFuaW1hdGVkQmluZGluZyA9IHJlcXVpcmUoJy4vYW5pbWF0ZWRCaW5kaW5nJyk7XG52YXIgY29tcGlsZSA9IHJlcXVpcmUoJy4vY29tcGlsZScpO1xudmFyIHJlZ2lzdGVyRGVmYXVsdEJpbmRlcnMgPSByZXF1aXJlKCcuL3JlZ2lzdGVyZWQvYmluZGVycycpO1xudmFyIHJlZ2lzdGVyRGVmYXVsdEZvcm1hdHRlcnMgPSByZXF1aXJlKCcuL3JlZ2lzdGVyZWQvZm9ybWF0dGVycycpO1xudmFyIHJlZ2lzdGVyRGVmYXVsdEFuaW1hdGlvbnMgPSByZXF1aXJlKCcuL3JlZ2lzdGVyZWQvYW5pbWF0aW9ucycpO1xuXG4vKipcbiAqIEEgRnJhZ21lbnRzIG9iamVjdCBzZXJ2ZXMgYXMgYSByZWdpc3RyeSBmb3IgYmluZGVycyBhbmQgZm9ybWF0dGVyc1xuICogQHBhcmFtIHtbdHlwZV19IE9ic2VydmVyQ2xhc3MgW2Rlc2NyaXB0aW9uXVxuICovXG5mdW5jdGlvbiBGcmFnbWVudHMoT2JzZXJ2ZXJDbGFzcykge1xuICBpZiAoIU9ic2VydmVyQ2xhc3MpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdNdXN0IHByb3ZpZGUgYW4gT2JzZXJ2ZXIgY2xhc3MgdG8gRnJhZ21lbnRzLicpO1xuICB9XG5cbiAgdGhpcy5PYnNlcnZlciA9IE9ic2VydmVyQ2xhc3M7XG4gIHRoaXMuZm9ybWF0dGVycyA9IE9ic2VydmVyQ2xhc3MuZm9ybWF0dGVycyA9IHt9O1xuICB0aGlzLmFuaW1hdGlvbnMgPSB7fTtcbiAgdGhpcy5hbmltYXRlQXR0cmlidXRlID0gJ2FuaW1hdGUnO1xuXG4gIHRoaXMuYmluZGVycyA9IHtcbiAgICBlbGVtZW50OiB7IF93aWxkY2FyZHM6IFtdIH0sXG4gICAgYXR0cmlidXRlOiB7IF93aWxkY2FyZHM6IFtdLCBfZXhwcjogL3t7XFxzKiguKj8pXFxzKn19L2cgfSxcbiAgICB0ZXh0OiB7IF93aWxkY2FyZHM6IFtdLCBfZXhwcjogL3t7XFxzKiguKj8pXFxzKn19L2cgfVxuICB9O1xuXG4gIC8vIFRleHQgYmluZGVyIGZvciB0ZXh0IG5vZGVzIHdpdGggZXhwcmVzc2lvbnMgaW4gdGhlbVxuICB0aGlzLnJlZ2lzdGVyVGV4dCgnX19kZWZhdWx0X18nLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHRoaXMuZWxlbWVudC50ZXh0Q29udGVudCA9ICh2YWx1ZSAhPSBudWxsKSA/IHZhbHVlIDogJyc7XG4gIH0pO1xuXG4gIC8vIENhdGNoYWxsIGF0dHJpYnV0ZSBiaW5kZXIgZm9yIHJlZ3VsYXIgYXR0cmlidXRlcyB3aXRoIGV4cHJlc3Npb25zIGluIHRoZW1cbiAgdGhpcy5yZWdpc3RlckF0dHJpYnV0ZSgnX19kZWZhdWx0X18nLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSAhPSBudWxsKSB7XG4gICAgICB0aGlzLmVsZW1lbnQuc2V0QXR0cmlidXRlKHRoaXMubmFtZSwgdmFsdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKHRoaXMubmFtZSk7XG4gICAgfVxuICB9KTtcblxuICByZWdpc3RlckRlZmF1bHRCaW5kZXJzKHRoaXMpO1xuICByZWdpc3RlckRlZmF1bHRGb3JtYXR0ZXJzKHRoaXMpO1xuICByZWdpc3RlckRlZmF1bHRBbmltYXRpb25zKHRoaXMpO1xufVxuXG5GcmFnbWVudHMucHJvdG90eXBlID0ge1xuXG4gIC8qKlxuICAgKiBUYWtlcyBhbiBIVE1MIHN0cmluZywgYW4gZWxlbWVudCwgYW4gYXJyYXkgb2YgZWxlbWVudHMsIG9yIGEgZG9jdW1lbnQgZnJhZ21lbnQsIGFuZCBjb21waWxlcyBpdCBpbnRvIGEgdGVtcGxhdGUuXG4gICAqIEluc3RhbmNlcyBtYXkgdGhlbiBiZSBjcmVhdGVkIGFuZCBib3VuZCB0byBhIGdpdmVuIGNvbnRleHQuXG4gICAqIEBwYXJhbSB7U3RyaW5nfE5vZGVMaXN0fEhUTUxDb2xsZWN0aW9ufEhUTUxUZW1wbGF0ZUVsZW1lbnR8SFRNTFNjcmlwdEVsZW1lbnR8Tm9kZX0gaHRtbCBBIFRlbXBsYXRlIGNhbiBiZSBjcmVhdGVkXG4gICAqIGZyb20gbWFueSBkaWZmZXJlbnQgdHlwZXMgb2Ygb2JqZWN0cy4gQW55IG9mIHRoZXNlIHdpbGwgYmUgY29udmVydGVkIGludG8gYSBkb2N1bWVudCBmcmFnbWVudCBmb3IgdGhlIHRlbXBsYXRlIHRvXG4gICAqIGNsb25lLiBOb2RlcyBhbmQgZWxlbWVudHMgcGFzc2VkIGluIHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoZSBET00uXG4gICAqL1xuICBjcmVhdGVUZW1wbGF0ZTogZnVuY3Rpb24oaHRtbCkge1xuICAgIHZhciBmcmFnbWVudCA9IHRvRnJhZ21lbnQoaHRtbCk7XG4gICAgaWYgKGZyYWdtZW50LmNoaWxkTm9kZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBjcmVhdGUgYSB0ZW1wbGF0ZSBmcm9tICcgKyBodG1sKTtcbiAgICB9XG4gICAgdmFyIHRlbXBsYXRlID0gZXh0ZW5kLm1ha2UoVGVtcGxhdGUsIGZyYWdtZW50KTtcbiAgICB0ZW1wbGF0ZS5iaW5kaW5ncyA9IGNvbXBpbGUodGhpcywgdGVtcGxhdGUpO1xuICAgIHJldHVybiB0ZW1wbGF0ZTtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBDb21waWxlcyBiaW5kaW5ncyBvbiBhbiBlbGVtZW50LlxuICAgKi9cbiAgY29tcGlsZUVsZW1lbnQ6IGZ1bmN0aW9uKGVsZW1lbnQpIHtcbiAgICBpZiAoIWVsZW1lbnQuYmluZGluZ3MpIHtcbiAgICAgIGVsZW1lbnQuYmluZGluZ3MgPSBjb21waWxlKHRoaXMsIGVsZW1lbnQpO1xuICAgICAgZXh0ZW5kLm1ha2UoVmlldywgZWxlbWVudCwgZWxlbWVudCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGVsZW1lbnQ7XG4gIH0sXG5cblxuICAvKipcbiAgICogQ29tcGlsZXMgYW5kIGJpbmRzIGFuIGVsZW1lbnQgd2hpY2ggd2FzIG5vdCBjcmVhdGVkIGZyb20gYSB0ZW1wbGF0ZS4gTW9zdGx5IG9ubHkgdXNlZCBmb3IgYmluZGluZyB0aGUgZG9jdW1lbnQnc1xuICAgKiBodG1sIGVsZW1lbnQuXG4gICAqL1xuICBiaW5kRWxlbWVudDogZnVuY3Rpb24oZWxlbWVudCwgY29udGV4dCkge1xuICAgIHRoaXMuY29tcGlsZUVsZW1lbnQoZWxlbWVudCk7XG5cbiAgICBpZiAoY29udGV4dCkge1xuICAgICAgZWxlbWVudC5iaW5kKGNvbnRleHQpO1xuICAgIH1cblxuICAgIHJldHVybiBlbGVtZW50O1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVycyBhIGJpbmRlciBmb3IgYSBnaXZlbiB0eXBlIGFuZCBuYW1lLiBBIGJpbmRlciBpcyBhIHN1YmNsYXNzIG9mIEJpbmRpbmcgYW5kIGlzIHVzZWQgdG8gY3JlYXRlIGJpbmRpbmdzIG9uXG4gICAqIGFuIGVsZW1lbnQgb3IgdGV4dCBub2RlIHdob3NlIHRhZyBuYW1lLCBhdHRyaWJ1dGUgbmFtZSwgb3IgZXhwcmVzc2lvbiBjb250ZW50cyBtYXRjaCB0aGlzIGJpbmRlcidzIG5hbWUvZXhwcmVzc2lvbi5cbiAgICpcbiAgICogIyMjIFBhcmFtZXRlcnNcbiAgICpcbiAgICogICogYHR5cGVgOiB0aGVyZSBhcmUgdGhyZWUgdHlwZXMgb2YgYmluZGVyczogZWxlbWVudCwgYXR0cmlidXRlLCBvciB0ZXh0LiBUaGVzZSBjb3JyZXNwb25kIHRvIG1hdGNoaW5nIGFnYWluc3QgYW5cbiAgICogICAgZWxlbWVudCdzIHRhZyBuYW1lLCBhbiBlbGVtZW50IHdpdGggdGhlIGdpdmVuIGF0dHJpYnV0ZSBuYW1lLCBvciBhIHRleHQgbm9kZSB0aGF0IG1hdGNoZXMgdGhlIHByb3ZpZGVkXG4gICAqICAgIGV4cHJlc3Npb24uXG4gICAqXG4gICAqICAqIGBuYW1lYDogdG8gbWF0Y2gsIGEgYmluZGVyIG5lZWRzIHRoZSBuYW1lIG9mIGFuIGVsZW1lbnQgb3IgYXR0cmlidXRlLCBvciBhIHJlZ3VsYXIgZXhwcmVzc2lvbiB0aGF0IG1hdGNoZXMgYVxuICAgKiAgICBnaXZlbiB0ZXh0IG5vZGUuIE5hbWVzIGZvciBlbGVtZW50cyBhbmQgYXR0cmlidXRlcyBjYW4gYmUgcmVndWxhciBleHByZXNzaW9ucyBhcyB3ZWxsLCBvciB0aGV5IG1heSBiZSB3aWxkY2FyZFxuICAgKiAgICBuYW1lcyBieSB1c2luZyBhbiBhc3Rlcmlzay5cbiAgICpcbiAgICogICogYGRlZmluaXRpb25gOiBhIGJpbmRlciBpcyBhIHN1YmNsYXNzIG9mIEJpbmRpbmcgd2hpY2ggb3ZlcnJpZGVzIGtleSBtZXRob2RzLCBgY29tcGlsZWRgLCBgY3JlYXRlZGAsIGB1cGRhdGVkYCxcbiAgICogICAgYGJvdW5kYCwgYW5kIGB1bmJvdW5kYC4gVGhlIGRlZmluaXRpb24gbWF5IGJlIGFuIGFjdHVhbCBzdWJjbGFzcyBvZiBCaW5kaW5nIG9yIGl0IG1heSBiZSBhbiBvYmplY3Qgd2hpY2ggd2lsbCBiZVxuICAgKiAgICB1c2VkIGZvciB0aGUgcHJvdG90eXBlIG9mIHRoZSBuZXdseSBjcmVhdGVkIHN1YmNsYXNzLiBGb3IgbWFueSBiaW5kaW5ncyBvbmx5IHRoZSBgdXBkYXRlZGAgbWV0aG9kIGlzIG92ZXJyaWRkZW4sXG4gICAqICAgIHNvIGJ5IGp1c3QgcGFzc2luZyBpbiBhIGZ1bmN0aW9uIGZvciBgZGVmaW5pdGlvbmAgdGhlIGJpbmRlciB3aWxsIGJlIGNyZWF0ZWQgd2l0aCB0aGF0IGFzIGl0cyBgdXBkYXRlZGAgbWV0aG9kLlxuICAgKlxuICAgKiAjIyMgRXhwbGFpbmF0aW9uIG9mIHByb3BlcnRpZXMgYW5kIG1ldGhvZHNcbiAgICpcbiAgICogICAqIGBwcmlvcml0eWAgbWF5IGJlIGRlZmluZWQgYXMgbnVtYmVyIHRvIGluc3RydWN0IHNvbWUgYmluZGVycyB0byBiZSBwcm9jZXNzZWQgYmVmb3JlIG90aGVycy4gQmluZGVycyB3aXRoXG4gICAqICAgaGlnaGVyIHByaW9yaXR5IGFyZSBwcm9jZXNzZWQgZmlyc3QuXG4gICAqXG4gICAqICAgKiBgYW5pbWF0ZWRgIGNhbiBiZSBzZXQgdG8gYHRydWVgIHRvIGV4dGVuZCB0aGUgQW5pbWF0ZWRCaW5kaW5nIGNsYXNzIHdoaWNoIHByb3ZpZGVzIHN1cHBvcnQgZm9yIGFuaW1hdGlvbiB3aGVuXG4gICAqICAgaW5zZXJ0aW5nYW5kIHJlbW92aW5nIG5vZGVzIGZyb20gdGhlIERPTS4gVGhlIGBhbmltYXRlZGAgcHJvcGVydHkgb25seSAqYWxsb3dzKiBhbmltYXRpb24gYnV0IHRoZSBlbGVtZW50IG11c3RcbiAgICogICBoYXZlIHRoZSBgYW5pbWF0ZWAgYXR0cmlidXRlIHRvIHVzZSBhbmltYXRpb24uIEEgYmluZGluZyB3aWxsIGhhdmUgdGhlIGBhbmltYXRlYCBwcm9wZXJ0eSBzZXQgdG8gdHJ1ZSB3aGVuIGl0IGlzXG4gICAqICAgdG8gYmUgYW5pbWF0ZWQuIEJpbmRlcnMgc2hvdWxkIGhhdmUgZmFzdCBwYXRocyBmb3Igd2hlbiBhbmltYXRpb24gaXMgbm90IHVzZWQgcmF0aGVyIHRoYW4gYXNzdW1pbmcgYW5pbWF0aW9uIHdpbGxcbiAgICogICBiZSB1c2VkLlxuICAgKlxuICAgKiBCaW5kZXJzXG4gICAqXG4gICAqIEEgYmluZGVyIGNhbiBoYXZlIDUgbWV0aG9kcyB3aGljaCB3aWxsIGJlIGNhbGxlZCBhdCB2YXJpb3VzIHBvaW50cyBpbiBhIGJpbmRpbmcncyBsaWZlY3ljbGUuIE1hbnkgYmluZGVycyB3aWxsXG4gICAqIG9ubHkgdXNlIHRoZSBgdXBkYXRlZCh2YWx1ZSlgIG1ldGhvZCwgc28gY2FsbGluZyByZWdpc3RlciB3aXRoIGEgZnVuY3Rpb24gaW5zdGVhZCBvZiBhbiBvYmplY3QgYXMgaXRzIHRoaXJkXG4gICAqIHBhcmFtZXRlciBpcyBhIHNob3J0Y3V0IHRvIGNyZWF0aW5nIGEgYmluZGVyIHdpdGgganVzdCBhbiBgdXBkYXRlYCBtZXRob2QuXG4gICAqXG4gICAqIExpc3RlZCBpbiBvcmRlciBvZiB3aGVuIHRoZXkgb2NjdXIgaW4gYSBiaW5kaW5nJ3MgbGlmZWN5Y2xlOlxuICAgKlxuICAgKiAgICogYGNvbXBpbGVkKG9wdGlvbnMpYCBpcyBjYWxsZWQgd2hlbiBmaXJzdCBjcmVhdGluZyBhIGJpbmRpbmcgZHVyaW5nIHRoZSB0ZW1wbGF0ZSBjb21waWxhdGlvbiBwcm9jZXNzIGFuZCByZWNlaXZlc1xuICAgKiB0aGUgYG9wdGlvbnNgIG9iamVjdCB0aGF0IHdpbGwgYmUgcGFzc2VkIGludG8gYG5ldyBCaW5kaW5nKG9wdGlvbnMpYC4gVGhpcyBjYW4gYmUgdXNlZCBmb3IgY3JlYXRpbmcgdGVtcGxhdGVzLFxuICAgKiBtb2RpZnlpbmcgdGhlIERPTSAob25seSBzdWJzZXF1ZW50IERPTSB0aGF0IGhhc24ndCBhbHJlYWR5IGJlZW4gcHJvY2Vzc2VkKSBhbmQgb3RoZXIgdGhpbmdzIHRoYXQgc2hvdWxkIGJlXG4gICAqIGFwcGxpZWQgYXQgY29tcGlsZSB0aW1lIGFuZCBub3QgZHVwbGljYXRlZCBmb3IgZWFjaCB2aWV3IGNyZWF0ZWQuXG4gICAqXG4gICAqICAgKiBgY3JlYXRlZCgpYCBpcyBjYWxsZWQgb24gdGhlIGJpbmRpbmcgd2hlbiBhIG5ldyB2aWV3IGlzIGNyZWF0ZWQuIFRoaXMgY2FuIGJlIHVzZWQgdG8gYWRkIGV2ZW50IGxpc3RlbmVycyBvbiB0aGVcbiAgICogZWxlbWVudCBvciBkbyBvdGhlciB0aGluZ3MgdGhhdCB3aWxsIHBlcnNpc3RlIHdpdGggdGhlIHZpZXcgdGhyb3VnaCBpdHMgbWFueSB1c2VzLiBWaWV3cyBtYXkgZ2V0IHJldXNlZCBzbyBkb24ndFxuICAgKiBkbyBhbnl0aGluZyBoZXJlIHRvIHRpZSBpdCB0byBhIGdpdmVuIGNvbnRleHQuXG4gICAqXG4gICAqICAgKiBgYXR0YWNoZWQoKWAgaXMgY2FsbGVkIG9uIHRoZSBiaW5kaW5nIHdoZW4gdGhlIHZpZXcgaXMgYm91bmQgdG8gYSBnaXZlbiBjb250ZXh0IGFuZCBpbnNlcnRlZCBpbnRvIHRoZSBET00uIFRoaXNcbiAgICogY2FuIGJlIHVzZWQgdG8gaGFuZGxlIGNvbnRleHQtc3BlY2lmaWMgYWN0aW9ucywgYWRkIGxpc3RlbmVycyB0byB0aGUgd2luZG93IG9yIGRvY3VtZW50ICh0byBiZSByZW1vdmVkIGluXG4gICAqIGBkZXRhY2hlZGAhKSwgZXRjLlxuICAgKlxuICAgKiAgICogYHVwZGF0ZWQodmFsdWUsIG9sZFZhbHVlLCBjaGFuZ2VSZWNvcmRzKWAgaXMgY2FsbGVkIG9uIHRoZSBiaW5kaW5nIHdoZW5ldmVyIHRoZSB2YWx1ZSBvZiB0aGUgZXhwcmVzc2lvbiB3aXRoaW5cbiAgICogdGhlIGF0dHJpYnV0ZSBjaGFuZ2VzLiBGb3IgZXhhbXBsZSwgYGJpbmQtdGV4dD1cInt7dXNlcm5hbWV9fVwiYCB3aWxsIHRyaWdnZXIgYHVwZGF0ZWRgIHdpdGggdGhlIHZhbHVlIG9mIHVzZXJuYW1lXG4gICAqIHdoZW5ldmVyIGl0IGNoYW5nZXMgb24gdGhlIGdpdmVuIGNvbnRleHQuIFdoZW4gdGhlIHZpZXcgaXMgcmVtb3ZlZCBgdXBkYXRlZGAgd2lsbCBiZSB0cmlnZ2VyZWQgd2l0aCBhIHZhbHVlIG9mXG4gICAqIGB1bmRlZmluZWRgIGlmIHRoZSB2YWx1ZSB3YXMgbm90IGFscmVhZHkgYHVuZGVmaW5lZGAsIGdpdmluZyBhIGNoYW5jZSB0byBcInJlc2V0XCIgdG8gYW4gZW1wdHkgc3RhdGUuXG4gICAqXG4gICAqICAgKiBgZGV0YWNoZWQoKWAgaXMgY2FsbGVkIG9uIHRoZSBiaW5kaW5nIHdoZW4gdGhlIHZpZXcgaXMgdW5ib3VuZCB0byBhIGdpdmVuIGNvbnRleHQgYW5kIHJlbW92ZWQgZnJvbSB0aGUgRE9NLiBUaGlzXG4gICAqIGNhbiBiZSB1c2VkIHRvIGNsZWFuIHVwIGFueXRoaW5nIGRvbmUgaW4gYGF0dGFjaGVkKClgIG9yIGluIGB1cGRhdGVkKClgIGJlZm9yZSBiZWluZyByZW1vdmVkLlxuICAgKlxuICAgKiBFbGVtZW50IGFuZCBhdHRyaWJ1dGUgYmluZGVycyB3aWxsIGFwcGx5IHdoZW5ldmVyIHRoZSB0YWcgbmFtZSBvciBhdHRyaWJ1dGUgbmFtZSBpcyBtYXRjaGVkLiBJbiB0aGUgY2FzZSBvZlxuICAgKiBhdHRyaWJ1dGUgYmluZGVycyBpZiB5b3Ugb25seSB3YW50IGl0IHRvIG1hdGNoIHdoZW4gZXhwcmVzc2lvbnMgYXJlIHVzZWQgd2l0aGluIHRoZSBhdHRyaWJ1dGUsIGFkZCBgb25seVdoZW5Cb3VuZGBcbiAgICogdG8gdGhlIGRlZmluaXRpb24uIE90aGVyd2lzZSB0aGUgYmluZGVyIHdpbGwgbWF0Y2ggYW5kIHRoZSB2YWx1ZSBvZiB0aGUgZXhwcmVzc2lvbiB3aWxsIHNpbXBseSBiZSBhIHN0cmluZyB0aGF0XG4gICAqIG9ubHkgY2FsbHMgdXBkYXRlZCBvbmNlIHNpbmNlIGl0IHdpbGwgbm90IGNoYW5nZS5cbiAgICpcbiAgICogTm90ZSwgYXR0cmlidXRlcyB3aGljaCBtYXRjaCBhIGJpbmRlciBhcmUgcmVtb3ZlZCBkdXJpbmcgY29tcGlsZS4gVGhleSBhcmUgY29uc2lkZXJlZCB0byBiZSBiaW5kaW5nIGRlZmluaXRpb25zIGFuZFxuICAgKiBub3QgcGFydCBvZiB0aGUgZWxlbWVudC4gQmluZGluZ3MgbWF5IHNldCB0aGUgYXR0cmlidXRlIHdoaWNoIHNlcnZlZCBhcyB0aGVpciBkZWZpbml0aW9uIGlmIGRlc2lyZWQuXG4gICAqXG4gICAqICMjIyBEZWZhdWx0c1xuICAgKlxuICAgKiBUaGVyZSBhcmUgZGVmYXVsdCBiaW5kZXJzIGZvciBhdHRyaWJ1dGUgYW5kIHRleHQgbm9kZXMgd2hpY2ggYXBwbHkgd2hlbiBubyBvdGhlciBiaW5kZXJzIG1hdGNoLiBUaGV5IG9ubHkgYXBwbHkgdG9cbiAgICogYXR0cmlidXRlcyBhbmQgdGV4dCBub2RlcyB3aXRoIGV4cHJlc3Npb25zIGluIHRoZW0gKGUuZy4gYHt7Zm9vfX1gKS4gVGhlIGRlZmF1bHQgaXMgdG8gc2V0IHRoZSBhdHRyaWJ1dGUgb3IgdGV4dFxuICAgKiBub2RlJ3MgdmFsdWUgdG8gdGhlIHJlc3VsdCBvZiB0aGUgZXhwcmVzc2lvbi4gSWYgeW91IHdhbnRlZCB0byBvdmVycmlkZSB0aGlzIGRlZmF1bHQgeW91IG1heSByZWdpc3RlciBhIGJpbmRlciB3aXRoXG4gICAqIHRoZSBuYW1lIGBcIl9fZGVmYXVsdF9fXCJgLlxuICAgKlxuICAgKiAqKkV4YW1wbGU6KiogVGhpcyBiaW5kaW5nIGhhbmRsZXIgYWRkcyBwaXJhdGVpemVkIHRleHQgdG8gYW4gZWxlbWVudC5cbiAgICogYGBgamF2YXNjcmlwdFxuICAgKiByZWdpc3RyeS5yZWdpc3RlckF0dHJpYnV0ZSgnbXktcGlyYXRlJywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICogICBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgKiAgICAgdmFsdWUgPSAnJztcbiAgICogICB9IGVsc2Uge1xuICAgKiAgICAgdmFsdWUgPSB2YWx1ZVxuICAgKiAgICAgICAucmVwbGFjZSgvXFxCaW5nXFxiL2csIFwiaW4nXCIpXG4gICAqICAgICAgIC5yZXBsYWNlKC9cXGJ0b1xcYi9nLCBcInQnXCIpXG4gICAqICAgICAgIC5yZXBsYWNlKC9cXGJ5b3VcXGIvLCAneWUnKVxuICAgKiAgICAgICArICcgQXJycnIhJztcbiAgICogICB9XG4gICAqICAgdGhpcy5lbGVtZW50LnRleHRDb250ZW50ID0gdmFsdWU7XG4gICAqIH0pO1xuICAgKiBgYGBcbiAgICpcbiAgICogYGBgaHRtbFxuICAgKiA8cCBteS1waXJhdGU9XCJ7e3Bvc3QuYm9keX19XCI+VGhpcyB0ZXh0IHdpbGwgYmUgcmVwbGFjZWQuPC9wPlxuICAgKiBgYGBcbiAgICovXG4gIHJlZ2lzdGVyRWxlbWVudDogZnVuY3Rpb24obmFtZSwgZGVmaW5pdGlvbikge1xuICAgIHJldHVybiB0aGlzLnJlZ2lzdGVyQmluZGVyKCdlbGVtZW50JywgbmFtZSwgZGVmaW5pdGlvbik7XG4gIH0sXG4gIHJlZ2lzdGVyQXR0cmlidXRlOiBmdW5jdGlvbihuYW1lLCBkZWZpbml0aW9uKSB7XG4gICAgcmV0dXJuIHRoaXMucmVnaXN0ZXJCaW5kZXIoJ2F0dHJpYnV0ZScsIG5hbWUsIGRlZmluaXRpb24pO1xuICB9LFxuICByZWdpc3RlclRleHQ6IGZ1bmN0aW9uKG5hbWUsIGRlZmluaXRpb24pIHtcbiAgICByZXR1cm4gdGhpcy5yZWdpc3RlckJpbmRlcigndGV4dCcsIG5hbWUsIGRlZmluaXRpb24pO1xuICB9LFxuICByZWdpc3RlckJpbmRlcjogZnVuY3Rpb24odHlwZSwgbmFtZSwgZGVmaW5pdGlvbikge1xuICAgIHZhciBiaW5kZXIsIGJpbmRlcnMgPSB0aGlzLmJpbmRlcnNbdHlwZV1cbiAgICB2YXIgc3VwZXJDbGFzcyA9IGRlZmluaXRpb24uYW5pbWF0ZWQgPyBBbmltYXRlZEJpbmRpbmcgOiBCaW5kaW5nO1xuXG4gICAgaWYgKCFiaW5kZXJzKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdgdHlwZWAgbXVzdCBiZSBvbmUgb2YgJyArIE9iamVjdC5rZXlzKHRoaXMuYmluZGVycykuam9pbignLCAnKSk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBkZWZpbml0aW9uID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBpZiAoZGVmaW5pdGlvbi5wcm90b3R5cGUgaW5zdGFuY2VvZiBCaW5kaW5nKSB7XG4gICAgICAgIHN1cGVyQ2xhc3MgPSBkZWZpbml0aW9uO1xuICAgICAgICBkZWZpbml0aW9uID0ge307XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZWZpbml0aW9uID0geyB1cGRhdGVkOiBkZWZpbml0aW9uIH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIGEgc3ViY2xhc3Mgb2YgQmluZGluZyAob3IgYW5vdGhlciBiaW5kZXIpIHdpdGggdGhlIGRlZmluaXRpb25cbiAgICBmdW5jdGlvbiBCaW5kZXIoKSB7XG4gICAgICBzdXBlckNsYXNzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIGRlZmluaXRpb24uT2JzZXJ2ZXIgPSB0aGlzLk9ic2VydmVyO1xuICAgIHN1cGVyQ2xhc3MuZXh0ZW5kKEJpbmRlciwgZGVmaW5pdGlvbik7XG5cbiAgICB2YXIgZXhwcjtcbiAgICBpZiAobmFtZSBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgZXhwciA9IG5hbWU7XG4gICAgfSBlbHNlIGlmIChuYW1lLmluZGV4T2YoJyonKSA+PSAwKSB7XG4gICAgICBleHByID0gbmV3IFJlZ0V4cCgnXicgKyBlc2NhcGVSZWdFeHAobmFtZSkucmVwbGFjZSgnXFxcXConLCAnKC4qKScpICsgJyQnKTtcbiAgICB9XG5cbiAgICBpZiAoZXhwcikge1xuICAgICAgQmluZGVyLmV4cHIgPSBleHByO1xuICAgICAgYmluZGVycy5fd2lsZGNhcmRzLnB1c2goQmluZGVyKTtcbiAgICAgIGJpbmRlcnMuX3dpbGRjYXJkcy5zb3J0KHRoaXMuYmluZGluZ1NvcnQpO1xuICAgIH1cblxuICAgIEJpbmRlci5uYW1lID0gJycgKyBuYW1lO1xuICAgIGJpbmRlcnNbbmFtZV0gPSBCaW5kZXI7XG4gICAgcmV0dXJuIEJpbmRlcjtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGEgYmluZGVyIHRoYXQgd2FzIGFkZGVkIHdpdGggYHJlZ2lzdGVyKClgLiBJZiBhbiBSZWdFeHAgd2FzIHVzZWQgaW4gcmVnaXN0ZXIgZm9yIHRoZSBuYW1lIGl0IG11c3QgYmUgdXNlZFxuICAgKiB0byB1bnJlZ2lzdGVyLCBidXQgaXQgZG9lcyBub3QgbmVlZCB0byBiZSB0aGUgc2FtZSBpbnN0YW5jZS5cbiAgICovXG4gIHVucmVnaXN0ZXJFbGVtZW50OiBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMudW5yZWdpc3RlckJpbmRlcignZWxlbWVudCcsIG5hbWUpO1xuICB9LFxuICB1bnJlZ2lzdGVyQXR0cmlidXRlOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMudW5yZWdpc3RlckJpbmRlcignYXR0cmlidXRlJywgbmFtZSk7XG4gIH0sXG4gIHVucmVnaXN0ZXJUZXh0OiBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMudW5yZWdpc3RlckJpbmRlcigndGV4dCcsIG5hbWUpO1xuICB9LFxuICB1bnJlZ2lzdGVyQmluZGVyOiBmdW5jdGlvbih0eXBlLCBuYW1lKSB7XG4gICAgdmFyIGJpbmRlciA9IHRoaXMuZ2V0QmluZGVyKHR5cGUsIG5hbWUpLCBiaW5kZXJzID0gdGhpcy5iaW5kZXJzW3R5cGVdO1xuICAgIGlmICghYmluZGVyKSByZXR1cm47XG4gICAgaWYgKGJpbmRlci5leHByKSB7XG4gICAgICB2YXIgaW5kZXggPSBiaW5kZXJzLl93aWxkY2FyZHMuaW5kZXhPZihiaW5kZXIpO1xuICAgICAgaWYgKGluZGV4ID49IDApIGJpbmRlcnMuX3dpbGRjYXJkcy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH1cbiAgICBkZWxldGUgYmluZGVyc1tuYW1lXTtcbiAgICByZXR1cm4gYmluZGVyO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBiaW5kZXIgdGhhdCB3YXMgYWRkZWQgd2l0aCBgcmVnaXN0ZXIoKWAgYnkgdHlwZSBhbmQgbmFtZS5cbiAgICovXG4gIGdldEVsZW1lbnRCaW5kZXI6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRCaW5kZXIoJ2VsZW1lbnQnLCBuYW1lKTtcbiAgfSxcbiAgZ2V0QXR0cmlidXRlQmluZGVyOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QmluZGVyKCdhdHRyaWJ1dGUnLCBuYW1lKTtcbiAgfSxcbiAgZ2V0VGV4dEJpbmRlcjogZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLmdldEJpbmRlcigndGV4dCcsIG5hbWUpO1xuICB9LFxuICBnZXRCaW5kZXI6IGZ1bmN0aW9uKHR5cGUsIG5hbWUpIHtcbiAgICB2YXIgYmluZGVycyA9IHRoaXMuYmluZGVyc1t0eXBlXTtcblxuICAgIGlmICghYmluZGVycykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYHR5cGVgIG11c3QgYmUgb25lIG9mICcgKyBPYmplY3Qua2V5cyh0aGlzLmJpbmRlcnMpLmpvaW4oJywgJykpO1xuICAgIH1cblxuICAgIGlmIChuYW1lICYmIGJpbmRlcnMuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgIHJldHVybiBiaW5kZXJzW25hbWVdO1xuICAgIH1cbiAgfSxcblxuXG4gIC8qKlxuICAgKiBGaW5kIGEgbWF0Y2hpbmcgYmluZGVyIGZvciB0aGUgZ2l2ZW4gdHlwZS4gRWxlbWVudHMgc2hvdWxkIG9ubHkgcHJvdmlkZSBuYW1lLiBBdHRyaWJ1dGVzIHNob3VsZCBwcm92aWRlIHRoZSBuYW1lXG4gICAqIGFuZCB2YWx1ZSAodmFsdWUgc28gdGhlIGRlZmF1bHQgY2FuIGJlIHJldHVybmVkIGlmIGFuIGV4cHJlc3Npb24gZXhpc3RzIGluIHRoZSB2YWx1ZSkuIFRleHQgbm9kZXMgc2hvdWxkIG9ubHlcbiAgICogcHJvdmlkZSB0aGUgdmFsdWUgKGluIHBsYWNlIG9mIHRoZSBuYW1lKSBhbmQgd2lsbCByZXR1cm4gdGhlIGRlZmF1bHQgaWYgbm8gYmluZGVycyBtYXRjaC5cbiAgICovXG4gIGZpbmRCaW5kZXI6IGZ1bmN0aW9uKHR5cGUsIG5hbWUsIHZhbHVlKSB7XG4gICAgaWYgKHR5cGUgPT09ICd0ZXh0JyAmJiB2YWx1ZSA9PSBudWxsKSB7XG4gICAgICB2YWx1ZSA9IG5hbWU7XG4gICAgICBuYW1lID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgYmluZGVyID0gdGhpcy5nZXRCaW5kZXIodHlwZSwgbmFtZSksIGJpbmRlcnMgPSB0aGlzLmJpbmRlcnNbdHlwZV07XG5cbiAgICBpZiAoIWJpbmRlcikge1xuICAgICAgdmFyIHRvTWF0Y2ggPSAodHlwZSA9PT0gJ3RleHQnKSA/IHZhbHVlIDogbmFtZTtcbiAgICAgIGJpbmRlcnMuX3dpbGRjYXJkcy5zb21lKGZ1bmN0aW9uKHdpbGRjYXJkQmluZGVyKSB7XG4gICAgICAgIGlmICh0b01hdGNoLm1hdGNoKHdpbGRjYXJkQmluZGVyLmV4cHIpKSB7XG4gICAgICAgICAgYmluZGVyID0gd2lsZGNhcmRCaW5kZXI7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChiaW5kZXIgJiYgdHlwZSA9PT0gJ2F0dHJpYnV0ZScgJiYgYmluZGVyLm9ubHlXaGVuQm91bmQgJiYgIXRoaXMuaXNCb3VuZCh0eXBlLCB2YWx1ZSkpIHtcbiAgICAgIC8vIGRvbid0IHVzZSB0aGUgYHZhbHVlYCBiaW5kZXIgaWYgdGhlcmUgaXMgbm8gZXhwcmVzc2lvbiBpbiB0aGUgYXR0cmlidXRlIHZhbHVlIChlLmcuIGB2YWx1ZT1cInNvbWUgdGV4dFwiYClcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIWJpbmRlciAmJiB2YWx1ZSAmJiAodHlwZSA9PT0gJ3RleHQnIHx8IHRoaXMuaXNCb3VuZCh0eXBlLCB2YWx1ZSkpKSB7XG4gICAgICAvLyBUZXN0IGlmIHRoZSBhdHRyaWJ1dGUgdmFsdWUgaXMgYm91bmQgKGUuZy4gYGhyZWY9XCIvcG9zdHMve3sgcG9zdC5pZCB9fVwiYClcbiAgICAgIGJpbmRlciA9IHRoaXMuZ2V0QmluZGVyKHR5cGUsICdfX2RlZmF1bHRfXycpO1xuICAgIH1cblxuICAgIHJldHVybiBiaW5kZXI7XG4gIH0sXG5cblxuICAvKipcbiAgICogQSBGb3JtYXR0ZXIgaXMgc3RvcmVkIHRvIHByb2Nlc3MgdGhlIHZhbHVlIG9mIGFuIGV4cHJlc3Npb24uIFRoaXMgYWx0ZXJzIHRoZSB2YWx1ZSBvZiB3aGF0IGNvbWVzIGluIHdpdGggYSBmdW5jdGlvblxuICAgKiB0aGF0IHJldHVybnMgYSBuZXcgdmFsdWUuIEZvcm1hdHRlcnMgYXJlIGFkZGVkIGJ5IHVzaW5nIGEgc2luZ2xlIHBpcGUgY2hhcmFjdGVyIChgfGApIGZvbGxvd2VkIGJ5IHRoZSBuYW1lIG9mIHRoZVxuICAgKiBmb3JtYXR0ZXIuIE11bHRpcGxlIGZvcm1hdHRlcnMgY2FuIGJlIHVzZWQgYnkgY2hhaW5pbmcgcGlwZXMgd2l0aCBmb3JtYXR0ZXIgbmFtZXMuIEZvcm1hdHRlcnMgbWF5IGFsc28gaGF2ZVxuICAgKiBhcmd1bWVudHMgcGFzc2VkIHRvIHRoZW0gYnkgdXNpbmcgdGhlIGNvbG9uIHRvIHNlcGFyYXRlIGFyZ3VtZW50cyBmcm9tIHRoZSBmb3JtYXR0ZXIgbmFtZS4gVGhlIHNpZ25hdHVyZSBvZiBhXG4gICAqIGZvcm1hdHRlciBzaG91bGQgYmUgYGZ1bmN0aW9uKHZhbHVlLCBhcmdzLi4uKWAgd2hlcmUgYXJncyBhcmUgZXh0cmEgcGFyYW1ldGVycyBwYXNzZWQgaW50byB0aGUgZm9ybWF0dGVyIGFmdGVyXG4gICAqIGNvbG9ucy5cbiAgICpcbiAgICogKkV4YW1wbGU6KlxuICAgKiBgYGBqc1xuICAgKiByZWdpc3RyeS5yZWdpc3RlckZvcm1hdHRlcigndXBwZXJjYXNlJywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICogICBpZiAodHlwZW9mIHZhbHVlICE9ICdzdHJpbmcnKSByZXR1cm4gJydcbiAgICogICByZXR1cm4gdmFsdWUudG9VcHBlcmNhc2UoKVxuICAgKiB9KVxuICAgKlxuICAgKiByZWdpc3RyeS5yZWdpc3RlckZvcm1hdHRlcigncmVwbGFjZScsIGZ1bmN0aW9uKHZhbHVlLCByZXBsYWNlLCB3aXRoKSB7XG4gICAqICAgaWYgKHR5cGVvZiB2YWx1ZSAhPSAnc3RyaW5nJykgcmV0dXJuICcnXG4gICAqICAgcmV0dXJuIHZhbHVlLnJlcGxhY2UocmVwbGFjZSwgd2l0aClcbiAgICogfSlcbiAgICogYGBgaHRtbFxuICAgKiA8aDEgYmluZC10ZXh0PVwidGl0bGUgfCB1cHBlcmNhc2UgfCByZXBsYWNlOidMRVRURVInOidOVU1CRVInXCI+PC9oMT5cbiAgICogYGBgXG4gICAqICpSZXN1bHQ6KlxuICAgKiBgYGBodG1sXG4gICAqIDxoMT5HRVRUSU5HIFRPIEtOT1cgQUxMIEFCT1VUIFRIRSBOVU1CRVIgQTwvaDE+XG4gICAqIGBgYFxuICAgKlxuICAgKiBBIGB2YWx1ZUZvcm1hdHRlcmAgaXMgbGlrZSBhIGZvcm1hdHRlciBidXQgdXNlZCBzcGVjaWZpY2FsbHkgd2l0aCB0aGUgYHZhbHVlYCBiaW5kaW5nIHNpbmNlIGl0IGlzIGEgdHdvLXdheSBiaW5kaW5nLiBXaGVuXG4gICAqIHRoZSB2YWx1ZSBvZiB0aGUgZWxlbWVudCBpcyBjaGFuZ2VkIGEgYHZhbHVlRm9ybWF0dGVyYCBjYW4gYWRqdXN0IHRoZSB2YWx1ZSBmcm9tIGEgc3RyaW5nIHRvIHRoZSBjb3JyZWN0IHZhbHVlIHR5cGUgZm9yXG4gICAqIHRoZSBjb250cm9sbGVyIGV4cHJlc3Npb24uIFRoZSBzaWduYXR1cmUgZm9yIGEgYHZhbHVlRm9ybWF0dGVyYCBpbmNsdWRlcyB0aGUgY3VycmVudCB2YWx1ZSBvZiB0aGUgZXhwcmVzc2lvblxuICAgKiBiZWZvcmUgdGhlIG9wdGlvbmFsIGFyZ3VtZW50cyAoaWYgYW55KS4gVGhpcyBhbGxvd3MgZGF0ZXMgdG8gYmUgYWRqdXN0ZWQgYW5kIHBvc3NpYmxleSBvdGhlciB1c2VzLlxuICAgKlxuICAgKiAqRXhhbXBsZToqXG4gICAqIGBgYGpzXG4gICAqIHJlZ2lzdHJ5LnJlZ2lzdGVyRm9ybWF0dGVyKCdudW1lcmljJywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICogICAvLyB2YWx1ZSBjb21pbmcgZnJvbSB0aGUgY29udHJvbGxlciBleHByZXNzaW9uLCB0byBiZSBzZXQgb24gdGhlIGVsZW1lbnRcbiAgICogICBpZiAodmFsdWUgPT0gbnVsbCB8fCBpc05hTih2YWx1ZSkpIHJldHVybiAnJ1xuICAgKiAgIHJldHVybiB2YWx1ZVxuICAgKiB9KVxuICAgKlxuICAgKiByZWdpc3RyeS5yZWdpc3RlckZvcm1hdHRlcignZGF0ZS1ob3VyJywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICogICAvLyB2YWx1ZSBjb21pbmcgZnJvbSB0aGUgY29udHJvbGxlciBleHByZXNzaW9uLCB0byBiZSBzZXQgb24gdGhlIGVsZW1lbnRcbiAgICogICBpZiAoICEoY3VycmVudFZhbHVlIGluc3RhbmNlb2YgRGF0ZSkgKSByZXR1cm4gJydcbiAgICogICB2YXIgaG91cnMgPSB2YWx1ZS5nZXRIb3VycygpXG4gICAqICAgaWYgKGhvdXJzID49IDEyKSBob3VycyAtPSAxMlxuICAgKiAgIGlmIChob3VycyA9PSAwKSBob3VycyA9IDEyXG4gICAqICAgcmV0dXJuIGhvdXJzXG4gICAqIH0pXG4gICAqIGBgYGh0bWxcbiAgICogPGxhYmVsPk51bWJlciBBdHRlbmRpbmc6PC9sYWJlbD5cbiAgICogPGlucHV0IHNpemU9XCI0XCIgYmluZC12YWx1ZT1cImV2ZW50LmF0dGVuZGVlQ291bnQgfCBudW1lcmljXCI+XG4gICAqIDxsYWJlbD5UaW1lOjwvbGFiZWw+XG4gICAqIDxpbnB1dCBzaXplPVwiMlwiIGJpbmQtdmFsdWU9XCJldmVudC5kYXRlIHwgZGF0ZS1ob3VyXCI+IDpcbiAgICogPGlucHV0IHNpemU9XCIyXCIgYmluZC12YWx1ZT1cImV2ZW50LmRhdGUgfCBkYXRlLW1pbnV0ZVwiPlxuICAgKiA8c2VsZWN0IGJpbmQtdmFsdWU9XCJldmVudC5kYXRlIHwgZGF0ZS1hbXBtXCI+XG4gICAqICAgPG9wdGlvbj5BTTwvb3B0aW9uPlxuICAgKiAgIDxvcHRpb24+UE08L29wdGlvbj5cbiAgICogPC9zZWxlY3Q+XG4gICAqIGBgYFxuICAgKi9cbiAgcmVnaXN0ZXJGb3JtYXR0ZXI6IGZ1bmN0aW9uIChuYW1lLCBmb3JtYXR0ZXIpIHtcbiAgICB0aGlzLmZvcm1hdHRlcnNbbmFtZV0gPSBmb3JtYXR0ZXI7XG4gIH0sXG5cblxuICAvKipcbiAgICogVW5yZWdpc3RlcnMgYSBmb3JtYXR0ZXIuXG4gICAqL1xuICB1bnJlZ2lzdGVyRm9ybWF0dGVyOiBmdW5jdGlvbiAobmFtZSwgZm9ybWF0dGVyKSB7XG4gICAgZGVsZXRlIHRoaXMuZm9ybWF0dGVyc1tuYW1lXTtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBHZXRzIGEgcmVnaXN0ZXJlZCBmb3JtYXR0ZXIuXG4gICAqL1xuICBnZXRGb3JtYXR0ZXI6IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuZm9ybWF0dGVyc1tuYW1lXTtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBBbiBBbmltYXRpb24gaXMgc3RvcmVkIHRvIGhhbmRsZSBhbmltYXRpb25zLiBBIHJlZ2lzdGVyZWQgYW5pbWF0aW9uIGlzIGFuIG9iamVjdCAob3IgY2xhc3Mgd2hpY2ggaW5zdGFudGlhdGVzIGludG9cbiAgICogYW4gb2JqZWN0KSB3aXRoIHRoZSBtZXRob2RzOlxuICAgKiAgICogYHdpbGxBbmltYXRlSW4oZWxlbWVudClgXG4gICAqICAgKiBgYW5pbWF0ZUluKGVsZW1lbnQsIGNhbGxiYWNrKWBcbiAgICogICAqIGBkaWRBbmltYXRlSW4oZWxlbWVudClgXG4gICAqICAgKiBgd2lsbEFuaW1hdGVPdXQoZWxlbWVudClgXG4gICAqICAgKiBgYW5pbWF0ZU91dChlbGVtZW50LCBjYWxsYmFjaylgXG4gICAqICAgKiBgZGlkQW5pbWF0ZU91dChlbGVtZW50KWBcbiAgICpcbiAgICogQW5pbWF0aW9uIGlzIGluY2x1ZGVkIHdpdGggYmluZGVycyB3aGljaCBhcmUgcmVnaXN0ZXJlZCB3aXRoIHRoZSBgYW5pbWF0ZWRgIHByb3BlcnR5IHNldCB0byBgdHJ1ZWAgKHN1Y2ggYXMgYGlmYFxuICAgKiBhbmQgYHJlcGVhdGApLiBBbmltYXRpb25zIGFsbG93IGVsZW1lbnRzIHRvIGZhZGUgaW4sIGZhZGUgb3V0LCBzbGlkZSBkb3duLCBjb2xsYXBzZSwgbW92ZSBmcm9tIG9uZSBsb2NhdGlvbiBpbiBhXG4gICAqIGxpc3QgdG8gYW5vdGhlciwgYW5kIG1vcmUuXG4gICAqXG4gICAqIFRvIHVzZSBhbmltYXRpb24gYWRkIGFuIGF0dHJpYnV0ZSBuYW1lZCBgYW5pbWF0ZWAgb250byBhbiBlbGVtZW50IHdpdGggYSBzdXBwb3J0ZWQgYmluZGVyLlxuICAgKlxuICAgKiAjIyMgQ1NTIEFuaW1hdGlvbnNcbiAgICpcbiAgICogSWYgdGhlIGBhbmltYXRlYCBhdHRyaWJ1dGUgZG9lcyBub3QgaGF2ZSBhIHZhbHVlIG9yIHRoZSB2YWx1ZSBpcyBhIGNsYXNzIG5hbWUgKGUuZy4gYGFuaW1hdGU9XCIubXktZmFkZVwiYCkgdGhlblxuICAgKiBmcmFnbWVudHMgd2lsbCB1c2UgYSBDU1MgdHJhbnNpdGlvbi9hbmltYXRpb24uIENsYXNzZXMgd2lsbCBiZSBhZGRlZCBhbmQgcmVtb3ZlZCB0byB0cmlnZ2VyIHRoZSBhbmltYXRpb24uXG4gICAqXG4gICAqICAgKiBgLndpbGwtYW5pbWF0ZS1pbmAgaXMgYWRkZWQgcmlnaHQgYWZ0ZXIgYW4gZWxlbWVudCBpcyBpbnNlcnRlZCBpbnRvIHRoZSBET00uIFRoaXMgY2FuIGJlIHVzZWQgdG8gc2V0IHRoZVxuICAgKiAgICAgb3BhY2l0eSB0byBgMC4wYCBmb3IgZXhhbXBsZS4gSXQgaXMgdGhlbiByZW1vdmVkIG9uIHRoZSBuZXh0IGFuaW1hdGlvbiBmcmFtZS5cbiAgICogICAqIGAuYW5pbWF0ZS1pbmAgaXMgd2hlbiBgLndpbGwtYW5pbWF0ZS1pbmAgaXMgcmVtb3ZlZC4gSXQgY2FuIGJlIHVzZWQgdG8gc2V0IG9wYWNpdHkgdG8gYDEuMGAgZm9yIGV4YW1wbGUuIFRoZVxuICAgKiAgICAgYGFuaW1hdGlvbmAgc3R5bGUgY2FuIGJlIHNldCBvbiB0aGlzIGNsYXNzIGlmIHVzaW5nIGl0LiBUaGUgYHRyYW5zaXRpb25gIHN0eWxlIGNhbiBiZSBzZXQgaGVyZS4gTm90ZSB0aGF0XG4gICAqICAgICBhbHRob3VnaCB0aGUgYGFuaW1hdGVgIGF0dHJpYnV0ZSBpcyBwbGFjZWQgb24gYW4gZWxlbWVudCB3aXRoIHRoZSBgcmVwZWF0YCBiaW5kZXIsIHRoZXNlIGNsYXNzZXMgYXJlIGFkZGVkIHRvXG4gICAqICAgICBpdHMgY2hpbGRyZW4gYXMgdGhleSBnZXQgYWRkZWQgYW5kIHJlbW92ZWQuXG4gICAqICAgKiBgLndpbGwtYW5pbWF0ZS1vdXRgIGlzIGFkZGVkIGJlZm9yZSBhbiBlbGVtZW50IGlzIHJlbW92ZWQgZnJvbSB0aGUgRE9NLiBUaGlzIGNhbiBiZSB1c2VkIHRvIHNldCB0aGUgb3BhY2l0eSB0b1xuICAgKiAgICAgYDFgIGZvciBleGFtcGxlLiBJdCBpcyB0aGVuIHJlbW92ZWQgb24gdGhlIG5leHQgYW5pbWF0aW9uIGZyYW1lLlxuICAgKiAgICogYC5hbmltYXRlLW91dGAgaXMgYWRkZWQgd2hlbiBgLndpbGwtYW5pbWF0ZS1vdXRgIGlzIHJlbW92ZWQuIEl0IGNhbiBiZSB1c2VkIHRvIHNldCBvcGFjaXR5IHRvIGAwLjBgIGZvclxuICAgKiAgICAgZXhhbXBsZS4gVGhlIGBhbmltYXRpb25gIHN0eWxlIGNhbiBiZSBzZXQgb24gdGhpcyBjbGFzcyBpZiB1c2luZyBpdC4gVGhlIGB0cmFuc2l0aW9uYCBzdHlsZSBjYW4gYmUgc2V0IGhlcmUgb3JcbiAgICogICAgIG9uIGFub3RoZXIgc2VsZWN0b3IgdGhhdCBtYXRjaGVzIHRoZSBlbGVtZW50LiBOb3RlIHRoYXQgYWx0aG91Z2ggdGhlIGBhbmltYXRlYCBhdHRyaWJ1dGUgaXMgcGxhY2VkIG9uIGFuXG4gICAqICAgICBlbGVtZW50IHdpdGggdGhlIGByZXBlYXRgIGJpbmRlciwgdGhlc2UgY2xhc3NlcyBhcmUgYWRkZWQgdG8gaXRzIGNoaWxkcmVuIGFzIHRoZXkgZ2V0IGFkZGVkIGFuZCByZW1vdmVkLlxuICAgKlxuICAgKiBJZiB0aGUgYGFuaW1hdGVgIGF0dHJpYnV0ZSBpcyBzZXQgdG8gYSBjbGFzcyBuYW1lIChlLmcuIGBhbmltYXRlPVwiLm15LWZhZGVcImApIHRoZW4gdGhhdCBjbGFzcyBuYW1lIHdpbGwgYmUgYWRkZWQgYXNcbiAgICogYSBjbGFzcyB0byB0aGUgZWxlbWVudCBkdXJpbmcgYW5pbWF0aW9uLiBUaGlzIGFsbG93cyB5b3UgdG8gdXNlIGAubXktZmFkZS53aWxsLWFuaW1hdGUtaW5gLCBgLm15LWZhZGUuYW5pbWF0ZS1pbmAsXG4gICAqIGV0Yy4gaW4geW91ciBzdHlsZXNoZWV0cyB0byB1c2UgdGhlIHNhbWUgYW5pbWF0aW9uIHRocm91Z2hvdXQgeW91ciBhcHBsaWNhdGlvbi5cbiAgICpcbiAgICogIyMjIEphdmFTY3JpcHQgQW5pbWF0aW9uc1xuICAgKlxuICAgKiBJZiB5b3UgbmVlZCBncmVhdGVyIGNvbnRyb2wgb3ZlciB5b3VyIGFuaW1hdGlvbnMgSmF2YVNjcmlwdCBtYXkgYmUgdXNlZC4gSXQgaXMgcmVjb21tZW5kZWQgdGhhdCBDU1Mgc3R5bGVzIHN0aWxsIGJlXG4gICAqIHVzZWQgYnkgaGF2aW5nIHlvdXIgY29kZSBzZXQgdGhlbSBtYW51YWxseS4gVGhpcyBhbGxvd3MgdGhlIGFuaW1hdGlvbiB0byB0YWtlIGFkdmFudGFnZSBvZiB0aGUgYnJvd3NlclxuICAgKiBvcHRpbWl6YXRpb25zIHN1Y2ggYXMgaGFyZHdhcmUgYWNjZWxlcmF0aW9uLiBUaGlzIGlzIG5vdCBhIHJlcXVpcmVtZW50LlxuICAgKlxuICAgKiBJbiBvcmRlciB0byB1c2UgSmF2YVNjcmlwdCBhbiBvYmplY3Qgc2hvdWxkIGJlIHBhc3NlZCBpbnRvIHRoZSBgYW5pbWF0aW9uYCBhdHRyaWJ1dGUgdXNpbmcgYW4gZXhwcmVzc2lvbi4gVGhpc1xuICAgKiBvYmplY3Qgc2hvdWxkIGhhdmUgbWV0aG9kcyB0aGF0IGFsbG93IEphdmFTY3JpcHQgYW5pbWF0aW9uIGhhbmRsaW5nLiBGb3IgZXhhbXBsZSwgaWYgeW91IGFyZSBib3VuZCB0byBhIGNvbnRleHRcbiAgICogd2l0aCBhbiBvYmplY3QgbmFtZWQgYGN1c3RvbUZhZGVgIHdpdGggYW5pbWF0aW9uIG1ldGhvZHMsIHlvdXIgZWxlbWVudCBzaG91bGQgaGF2ZSBgYXR0cmlidXRlPVwie3tjdXN0b21GYWRlfX1cImAuXG4gICAqIFRoZSBmb2xsb3dpbmcgaXMgYSBsaXN0IG9mIHRoZSBtZXRob2RzIHlvdSBtYXkgaW1wbGVtZW50LlxuICAgKlxuICAgKiAgICogYHdpbGxBbmltYXRlSW4oZWxlbWVudClgIHdpbGwgYmUgY2FsbGVkIGFmdGVyIGFuIGVsZW1lbnQgaGFzIGJlZW4gaW5zZXJ0ZWQgaW50byB0aGUgRE9NLiBVc2UgaXQgdG8gc2V0IGluaXRpYWxcbiAgICogICAgIENTUyBwcm9wZXJ0aWVzIGJlZm9yZSBgYW5pbWF0ZUluYCBpcyBjYWxsZWQgdG8gc2V0IHRoZSBmaW5hbCBwcm9wZXJ0aWVzLiBUaGlzIG1ldGhvZCBpcyBvcHRpb25hbC5cbiAgICogICAqIGBhbmltYXRlSW4oZWxlbWVudCwgY2FsbGJhY2spYCB3aWxsIGJlIGNhbGxlZCBzaG9ydGx5IGFmdGVyIGB3aWxsQW5pbWF0ZUluYCBpZiBpdCB3YXMgZGVmaW5lZC4gVXNlIGl0IHRvIHNldFxuICAgKiAgICAgZmluYWwgQ1NTIHByb3BlcnRpZXMuXG4gICAqICAgKiBgYW5pbWF0ZU91dChlbGVtZW50LCBkb25lKWAgd2lsbCBiZSBjYWxsZWQgYmVmb3JlIGFuIGVsZW1lbnQgaXMgdG8gYmUgcmVtb3ZlZCBmcm9tIHRoZSBET00uIGBkb25lYCBtdXN0IGJlXG4gICAqICAgICBjYWxsZWQgd2hlbiB0aGUgYW5pbWF0aW9uIGlzIGNvbXBsZXRlIGluIG9yZGVyIGZvciB0aGUgYmluZGVyIHRvIGZpbmlzaCByZW1vdmluZyB0aGUgZWxlbWVudC4gKipSZW1lbWJlcioqIHRvXG4gICAqICAgICBjbGVhbiB1cCBieSByZW1vdmluZyBhbnkgc3R5bGVzIHRoYXQgd2VyZSBhZGRlZCBiZWZvcmUgY2FsbGluZyBgZG9uZSgpYCBzbyB0aGUgZWxlbWVudCBjYW4gYmUgcmV1c2VkIHdpdGhvdXRcbiAgICogICAgIHNpZGUtZWZmZWN0cy5cbiAgICpcbiAgICogVGhlIGBlbGVtZW50YCBwYXNzZWQgaW4gd2lsbCBiZSBwb2x5ZmlsbGVkIGZvciB3aXRoIHRoZSBgYW5pbWF0ZWAgbWV0aG9kIHVzaW5nXG4gICAqIGh0dHBzOi8vZ2l0aHViLmNvbS93ZWItYW5pbWF0aW9ucy93ZWItYW5pbWF0aW9ucy1qcy5cbiAgICpcbiAgICogIyMjIFJlZ2lzdGVyZWQgQW5pbWF0aW9uc1xuICAgKlxuICAgKiBBbmltYXRpb25zIG1heSBiZSByZWdpc3RlcmVkIGFuZCB1c2VkIHRocm91Z2hvdXQgeW91ciBhcHBsaWNhdGlvbi4gVG8gdXNlIGEgcmVnaXN0ZXJlZCBhbmltYXRpb24gdXNlIGl0cyBuYW1lIGluXG4gICAqIHRoZSBgYW5pbWF0ZWAgYXR0cmlidXRlIChlLmcuIGBhbmltYXRlPVwiZmFkZVwiYCkuIE5vdGUgdGhlIG9ubHkgZGlmZmVyZW5jZSBiZXR3ZWVuIGEgcmVnaXN0ZXJlZCBhbmltYXRpb24gYW5kIGFcbiAgICogY2xhc3MgcmVnaXN0cmF0aW9uIGlzIGNsYXNzIHJlZ2lzdHJhdGlvbnMgYXJlIHByZWZpeGVkIHdpdGggYSBkb3QgKGAuYCkuIFJlZ2lzdGVyZWQgYW5pbWF0aW9ucyBhcmUgYWx3YXlzXG4gICAqIEphdmFTY3JpcHQgYW5pbWF0aW9ucy4gVG8gcmVnaXN0ZXIgYW4gYW5pbWF0aW9uIHVzZSBgZnJhZ21lbnRzLnJlZ2lzdGVyQW5pbWF0aW9uKG5hbWUsIGFuaW1hdGlvbk9iamVjdClgLlxuICAgKlxuICAgKiBUaGUgQW5pbWF0aW9uIG1vZHVsZSBjb21lcyB3aXRoIHNldmVyYWwgY29tbW9uIGFuaW1hdGlvbnMgcmVnaXN0ZXJlZCBieSBkZWZhdWx0LiBUaGUgZGVmYXVsdHMgdXNlIENTUyBzdHlsZXMgdG9cbiAgICogd29yayBjb3JyZWN0bHksIHVzaW5nIGBlbGVtZW50LmFuaW1hdGVgLlxuICAgKlxuICAgKiAgICogYGZhZGVgIHdpbGwgZmFkZSBhbiBlbGVtZW50IGluIGFuZCBvdXQgb3ZlciAzMDAgbWlsbGlzZWNvbmRzLlxuICAgKiAgICogYHNsaWRlYCB3aWxsIHNsaWRlIGFuIGVsZW1lbnQgZG93biB3aGVuIGl0IGlzIGFkZGVkIGFuZCBzbGlkZSBpdCB1cCB3aGVuIGl0IGlzIHJlbW92ZWQuXG4gICAqICAgKiBgc2xpZGUtbW92ZWAgd2lsbCBtb3ZlIGFuIGVsZW1lbnQgZnJvbSBpdHMgb2xkIGxvY2F0aW9uIHRvIGl0cyBuZXcgbG9jYXRpb24gaW4gYSByZXBlYXRlZCBsaXN0LlxuICAgKlxuICAgKiBEbyB5b3UgaGF2ZSBhbm90aGVyIGNvbW1vbiBhbmltYXRpb24geW91IHRoaW5rIHNob3VsZCBiZSBpbmNsdWRlZCBieSBkZWZhdWx0PyBTdWJtaXQgYSBwdWxsIHJlcXVlc3QhXG4gICAqL1xuICByZWdpc3RlckFuaW1hdGlvbjogZnVuY3Rpb24obmFtZSwgYW5pbWF0aW9uT2JqZWN0KSB7XG4gICAgdGhpcy5hbmltYXRpb25zW25hbWVdID0gYW5pbWF0aW9uT2JqZWN0O1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIFVucmVnaXN0ZXJzIGFuIGFuaW1hdGlvbi5cbiAgICovXG4gIHVucmVnaXN0ZXJBbmltYXRpb246IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBkZWxldGUgdGhpcy5hbmltYXRpb25zW25hbWVdO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIEdldHMgYSByZWdpc3RlcmVkIGFuaW1hdGlvbi5cbiAgICovXG4gIGdldEFuaW1hdGlvbjogZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLmFuaW1hdGlvbnNbbmFtZV07XG4gIH0sXG5cblxuICAvKipcbiAgICogUHJlcGFyZSBhbiBlbGVtZW50IHRvIGJlIGVhc2llciBhbmltYXRhYmxlIChhZGRpbmcgYSBzaW1wbGUgYGFuaW1hdGVgIHBvbHlmaWxsIGlmIG5lZWRlZClcbiAgICovXG4gIG1ha2VFbGVtZW50QW5pbWF0YWJsZTogYW5pbWF0aW9uLm1ha2VFbGVtZW50QW5pbWF0YWJsZSxcblxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBkZWxpbWl0ZXJzIHRoYXQgZGVmaW5lIGFuIGV4cHJlc3Npb24uIERlZmF1bHQgaXMgYHt7YCBhbmQgYH19YCBidXQgdGhpcyBtYXkgYmUgb3ZlcnJpZGRlbi4gSWYgZW1wdHlcbiAgICogc3RyaW5ncyBhcmUgcGFzc2VkIGluIChmb3IgdHlwZSBcImF0dHJpYnV0ZVwiIG9ubHkpIHRoZW4gbm8gZGVsaW1pdGVycyBhcmUgcmVxdWlyZWQgZm9yIG1hdGNoaW5nIGF0dHJpYnV0ZXMsIGJ1dCB0aGVcbiAgICogZGVmYXVsdCBhdHRyaWJ1dGUgbWF0Y2hlciB3aWxsIG5vdCBhcHBseSB0byB0aGUgcmVzdCBvZiB0aGUgYXR0cmlidXRlcy5cbiAgICovXG4gIHNldEV4cHJlc3Npb25EZWxpbWl0ZXJzOiBmdW5jdGlvbih0eXBlLCBwcmUsIHBvc3QpIHtcbiAgICBpZiAodHlwZSAhPT0gJ2F0dHJpYnV0ZScgJiYgdHlwZSAhPT0gJ3RleHQnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdFeHByZXNzaW9uIGRlbGltaXRlcnMgbXVzdCBiZSBvZiB0eXBlIFwiYXR0cmlidXRlXCIgb3IgXCJ0ZXh0XCInKTtcbiAgICB9XG5cbiAgICB0aGlzLmJpbmRlcnNbdHlwZV0uX2V4cHIgPSBuZXcgUmVnRXhwKGVzY2FwZVJlZ0V4cChwcmUpICsgJyguKj8pJyArIGVzY2FwZVJlZ0V4cChwb3N0KSwgJ2cnKTtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBUZXN0cyB3aGV0aGVyIGEgdmFsdWUgaGFzIGFuIGV4cHJlc3Npb24gaW4gaXQuIFNvbWV0aGluZyBsaWtlIGAvdXNlci97e3VzZXIuaWR9fWAuXG4gICAqL1xuICBpc0JvdW5kOiBmdW5jdGlvbih0eXBlLCB2YWx1ZSkge1xuICAgIGlmICh0eXBlICE9PSAnYXR0cmlidXRlJyAmJiB0eXBlICE9PSAndGV4dCcpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2lzQm91bmQgbXVzdCBwcm92aWRlIHR5cGUgXCJhdHRyaWJ1dGVcIiBvciBcInRleHRcIicpO1xuICAgIH1cbiAgICB2YXIgZXhwciA9IHRoaXMuYmluZGVyc1t0eXBlXS5fZXhwcjtcbiAgICByZXR1cm4gQm9vbGVhbihleHByICYmIHZhbHVlICYmIHZhbHVlLm1hdGNoKGV4cHIpKTtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBUaGUgc29ydCBmdW5jdGlvbiB0byBzb3J0IGJpbmRlcnMgY29ycmVjdGx5XG4gICAqL1xuICBiaW5kaW5nU29ydDogZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBiLnByb3RvdHlwZS5wcmlvcml0eSAtIGEucHJvdG90eXBlLnByaW9yaXR5O1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIENvbnZlcnRzIGFuIGludmVydGVkIGV4cHJlc3Npb24gZnJvbSBgL3VzZXIve3t1c2VyLmlkfX1gIHRvIGBcIi91c2VyL1wiICsgdXNlci5pZGBcbiAgICovXG4gIGNvZGlmeUV4cHJlc3Npb246IGZ1bmN0aW9uKHR5cGUsIHRleHQpIHtcbiAgICBpZiAodHlwZSAhPT0gJ2F0dHJpYnV0ZScgJiYgdHlwZSAhPT0gJ3RleHQnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdjb2RpZnlFeHByZXNzaW9uIG11c3QgdXNlIHR5cGUgXCJhdHRyaWJ1dGVcIiBvciBcInRleHRcIicpO1xuICAgIH1cblxuICAgIHZhciBleHByID0gdGhpcy5iaW5kZXJzW3R5cGVdLl9leHByO1xuICAgIHZhciBtYXRjaCA9IHRleHQubWF0Y2goZXhwcik7XG5cbiAgICBpZiAoIW1hdGNoKSB7XG4gICAgICByZXR1cm4gJ1wiJyArIHRleHQucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpICsgJ1wiJztcbiAgICB9IGVsc2UgaWYgKG1hdGNoLmxlbmd0aCA9PT0gMSAmJiBtYXRjaFswXSA9PT0gdGV4dCkge1xuICAgICAgcmV0dXJuIHRleHQucmVwbGFjZShleHByLCAnJDEnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIG5ld1RleHQgPSAnXCInLCBsYXN0SW5kZXggPSAwO1xuICAgICAgd2hpbGUgKG1hdGNoID0gZXhwci5leGVjKHRleHQpKSB7XG4gICAgICAgIHZhciBzdHIgPSB0ZXh0LnNsaWNlKGxhc3RJbmRleCwgZXhwci5sYXN0SW5kZXggLSBtYXRjaFswXS5sZW5ndGgpO1xuICAgICAgICBuZXdUZXh0ICs9IHN0ci5yZXBsYWNlKC9cIi9nLCAnXFxcXFwiJyk7XG4gICAgICAgIG5ld1RleHQgKz0gJ1wiICsgKCcgKyBtYXRjaFsxXSArICcgfHwgXCJcIikgKyBcIic7XG4gICAgICAgIGxhc3RJbmRleCA9IGV4cHIubGFzdEluZGV4O1xuICAgICAgfVxuICAgICAgbmV3VGV4dCArPSB0ZXh0LnNsaWNlKGxhc3RJbmRleCkucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpICsgJ1wiJztcbiAgICAgIHJldHVybiBuZXdUZXh0LnJlcGxhY2UoL15cIlwiIFxcKyB8IFwiXCIgXFwrIHwgXFwrIFwiXCIkL2csICcnKTtcbiAgICB9XG4gIH1cblxufTtcblxuLy8gVGFrZXMgYSBzdHJpbmcgbGlrZSBcIihcXCopXCIgb3IgXCJvbi1cXCpcIiBhbmQgY29udmVydHMgaXQgaW50byBhIHJlZ3VsYXIgZXhwcmVzc2lvbi5cbmZ1bmN0aW9uIGVzY2FwZVJlZ0V4cCh0ZXh0KSB7XG4gIHJldHVybiB0ZXh0LnJlcGxhY2UoL1stW1xcXXt9KCkqKz8uLFxcXFxeJHwjXFxzXS9nLCBcIlxcXFwkJlwiKTtcbn1cbiIsIi8qXG5Db3B5cmlnaHQgKGMpIDIwMTUgSmFjb2IgV3JpZ2h0IDxqYWN3cmlnaHRAZ21haWwuY29tPlxuXG5QZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG5vZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG5pbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG50byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG5jb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbmZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG5cblRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG5hbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cblxuVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG5GSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbkFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbkxJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG5PVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG5USEUgU09GVFdBUkUuXG4qL1xuLy8gIyBEaWZmXG4vLyA+IEJhc2VkIG9uIHdvcmsgZnJvbSBHb29nbGUncyBvYnNlcnZlLWpzIHBvbHlmaWxsOiBodHRwczovL2dpdGh1Yi5jb20vUG9seW1lci9vYnNlcnZlLWpzXG5cbi8vIEEgbmFtZXNwYWNlIHRvIHN0b3JlIHRoZSBmdW5jdGlvbnMgb25cbnZhciBkaWZmID0gZXhwb3J0cztcblxuKGZ1bmN0aW9uKCkge1xuXG4gIGRpZmYuY2xvbmUgPSBjbG9uZTtcbiAgZGlmZi52YWx1ZXMgPSBkaWZmVmFsdWVzO1xuICBkaWZmLmJhc2ljID0gZGlmZkJhc2ljO1xuICBkaWZmLm9iamVjdHMgPSBkaWZmT2JqZWN0cztcbiAgZGlmZi5hcnJheXMgPSBkaWZmQXJyYXlzO1xuXG5cbiAgLy8gQSBjaGFuZ2UgcmVjb3JkIGZvciB0aGUgb2JqZWN0IGNoYW5nZXNcbiAgZnVuY3Rpb24gQ2hhbmdlUmVjb3JkKG9iamVjdCwgdHlwZSwgbmFtZSwgb2xkVmFsdWUpIHtcbiAgICB0aGlzLm9iamVjdCA9IG9iamVjdDtcbiAgICB0aGlzLnR5cGUgPSB0eXBlO1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgdGhpcy5vbGRWYWx1ZSA9IG9sZFZhbHVlO1xuICB9XG5cbiAgLy8gQSBzcGxpY2UgcmVjb3JkIGZvciB0aGUgYXJyYXkgY2hhbmdlc1xuICBmdW5jdGlvbiBTcGxpY2UoaW5kZXgsIHJlbW92ZWQsIGFkZGVkQ291bnQpIHtcbiAgICB0aGlzLmluZGV4ID0gaW5kZXg7XG4gICAgdGhpcy5yZW1vdmVkID0gcmVtb3ZlZDtcbiAgICB0aGlzLmFkZGVkQ291bnQgPSBhZGRlZENvdW50O1xuICB9XG5cblxuICAvLyBDcmVhdGVzIGEgY2xvbmUgb3IgY29weSBvZiBhbiBhcnJheSBvciBvYmplY3QgKG9yIHNpbXBseSByZXR1cm5zIGEgc3RyaW5nL251bWJlci9ib29sZWFuIHdoaWNoIGFyZSBpbW11dGFibGUpXG4gIC8vIERvZXMgbm90IHByb3ZpZGUgZGVlcCBjb3BpZXMuXG4gIGZ1bmN0aW9uIGNsb25lKHZhbHVlLCBkZWVwKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICBpZiAoZGVlcCkge1xuICAgICAgICByZXR1cm4gdmFsdWUubWFwKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGNsb25lKHZhbHVlLCBkZWVwKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdmFsdWUuc2xpY2UoKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGlmICh2YWx1ZS52YWx1ZU9mKCkgIT09IHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBuZXcgdmFsdWUuY29uc3RydWN0b3IodmFsdWUudmFsdWVPZigpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBjb3B5ID0ge307XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB2YWx1ZSkge1xuICAgICAgICAgIHZhciBvYmpWYWx1ZSA9IHZhbHVlW2tleV07XG4gICAgICAgICAgaWYgKGRlZXApIHtcbiAgICAgICAgICAgIG9ialZhbHVlID0gY2xvbmUob2JqVmFsdWUsIGRlZXApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb3B5W2tleV0gPSBvYmpWYWx1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY29weTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgfVxuXG5cbiAgLy8gRGlmZnMgdHdvIHZhbHVlcywgcmV0dXJuaW5nIGEgdHJ1dGh5IHZhbHVlIGlmIHRoZXJlIGFyZSBjaGFuZ2VzIG9yIGBmYWxzZWAgaWYgdGhlcmUgYXJlIG5vIGNoYW5nZXMuIElmIHRoZSB0d29cbiAgLy8gdmFsdWVzIGFyZSBib3RoIGFycmF5cyBvciBib3RoIG9iamVjdHMsIGFuIGFycmF5IG9mIGNoYW5nZXMgKHNwbGljZXMgb3IgY2hhbmdlIHJlY29yZHMpIGJldHdlZW4gdGhlIHR3byB3aWxsIGJlXG4gIC8vIHJldHVybmVkLiBPdGhlcndpc2UgIGB0cnVlYCB3aWxsIGJlIHJldHVybmVkLlxuICBmdW5jdGlvbiBkaWZmVmFsdWVzKHZhbHVlLCBvbGRWYWx1ZSkge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSAmJiBBcnJheS5pc0FycmF5KG9sZFZhbHVlKSkge1xuICAgICAgLy8gSWYgYW4gYXJyYXkgaGFzIGNoYW5nZWQgY2FsY3VsYXRlIHRoZSBzcGxpY2VzXG4gICAgICB2YXIgc3BsaWNlcyA9IGRpZmZBcnJheXModmFsdWUsIG9sZFZhbHVlKTtcbiAgICAgIHJldHVybiBzcGxpY2VzLmxlbmd0aCA/IHNwbGljZXMgOiBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKHZhbHVlICYmIG9sZFZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG9sZFZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgLy8gSWYgYW4gb2JqZWN0IGhhcyBjaGFuZ2VkIGNhbGN1bGF0ZSB0aGUgY2huYWdlcyBhbmQgY2FsbCB0aGUgY2FsbGJhY2tcbiAgICAgIC8vIEFsbG93IGRhdGVzIGFuZCBOdW1iZXIvU3RyaW5nIG9iamVjdHMgdG8gYmUgY29tcGFyZWRcbiAgICAgIHZhciB2YWx1ZVZhbHVlID0gdmFsdWUudmFsdWVPZigpO1xuICAgICAgdmFyIG9sZFZhbHVlVmFsdWUgPSBvbGRWYWx1ZS52YWx1ZU9mKCk7XG5cbiAgICAgIC8vIEFsbG93IGRhdGVzIGFuZCBOdW1iZXIvU3RyaW5nIG9iamVjdHMgdG8gYmUgY29tcGFyZWRcbiAgICAgIGlmICh0eXBlb2YgdmFsdWVWYWx1ZSAhPT0gJ29iamVjdCcgJiYgdHlwZW9mIG9sZFZhbHVlVmFsdWUgIT09ICdvYmplY3QnKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZVZhbHVlICE9PSBvbGRWYWx1ZVZhbHVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGNoYW5nZVJlY29yZHMgPSBkaWZmT2JqZWN0cyh2YWx1ZSwgb2xkVmFsdWUpO1xuICAgICAgICByZXR1cm4gY2hhbmdlUmVjb3Jkcy5sZW5ndGggPyBjaGFuZ2VSZWNvcmRzIDogZmFsc2U7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElmIGEgdmFsdWUgaGFzIGNoYW5nZWQgY2FsbCB0aGUgY2FsbGJhY2tcbiAgICAgIHJldHVybiBkaWZmQmFzaWModmFsdWUsIG9sZFZhbHVlKTtcbiAgICB9XG4gIH1cblxuXG4gIC8vIERpZmZzIHR3byBiYXNpYyB0eXBlcywgcmV0dXJuaW5nIHRydWUgaWYgY2hhbmdlZCBvciBmYWxzZSBpZiBub3RcbiAgZnVuY3Rpb24gZGlmZkJhc2ljKHZhbHVlLCBvbGRWYWx1ZSkge1xuICAgaWYgKHZhbHVlICYmIG9sZFZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG9sZFZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgLy8gQWxsb3cgZGF0ZXMgYW5kIE51bWJlci9TdHJpbmcgb2JqZWN0cyB0byBiZSBjb21wYXJlZFxuICAgICAgdmFyIHZhbHVlVmFsdWUgPSB2YWx1ZS52YWx1ZU9mKCk7XG4gICAgICB2YXIgb2xkVmFsdWVWYWx1ZSA9IG9sZFZhbHVlLnZhbHVlT2YoKTtcblxuICAgICAgLy8gQWxsb3cgZGF0ZXMgYW5kIE51bWJlci9TdHJpbmcgb2JqZWN0cyB0byBiZSBjb21wYXJlZFxuICAgICAgaWYgKHR5cGVvZiB2YWx1ZVZhbHVlICE9PSAnb2JqZWN0JyAmJiB0eXBlb2Ygb2xkVmFsdWVWYWx1ZSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgcmV0dXJuIGRpZmZCYXNpYyh2YWx1ZVZhbHVlLCBvbGRWYWx1ZVZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBJZiBhIHZhbHVlIGhhcyBjaGFuZ2VkIGNhbGwgdGhlIGNhbGxiYWNrXG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicgJiYgdHlwZW9mIG9sZFZhbHVlID09PSAnbnVtYmVyJyAmJiBpc05hTih2YWx1ZSkgJiYgaXNOYU4ob2xkVmFsdWUpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB2YWx1ZSAhPT0gb2xkVmFsdWU7XG4gICAgfVxuICB9XG5cblxuICAvLyBEaWZmcyB0d28gb2JqZWN0cyByZXR1cm5pbmcgYW4gYXJyYXkgb2YgY2hhbmdlIHJlY29yZHMuIFRoZSBjaGFuZ2UgcmVjb3JkIGxvb2tzIGxpa2U6XG4gIC8vIGBgYGphdmFzY3JpcHRcbiAgLy8ge1xuICAvLyAgIG9iamVjdDogb2JqZWN0LFxuICAvLyAgIHR5cGU6ICdkZWxldGVkfHVwZGF0ZWR8bmV3JyxcbiAgLy8gICBuYW1lOiAncHJvcGVydHlOYW1lJyxcbiAgLy8gICBvbGRWYWx1ZTogb2xkVmFsdWVcbiAgLy8gfVxuICAvLyBgYGBcbiAgZnVuY3Rpb24gZGlmZk9iamVjdHMob2JqZWN0LCBvbGRPYmplY3QpIHtcbiAgICB2YXIgY2hhbmdlUmVjb3JkcyA9IFtdO1xuICAgIHZhciBwcm9wLCBvbGRWYWx1ZSwgdmFsdWU7XG5cbiAgICAvLyBHb2VzIHRocm91Z2ggdGhlIG9sZCBvYmplY3QgKHNob3VsZCBiZSBhIGNsb25lKSBhbmQgbG9vayBmb3IgdGhpbmdzIHRoYXQgYXJlIG5vdyBnb25lIG9yIGNoYW5nZWRcbiAgICBmb3IgKHByb3AgaW4gb2xkT2JqZWN0KSB7XG4gICAgICBvbGRWYWx1ZSA9IG9sZE9iamVjdFtwcm9wXTtcbiAgICAgIHZhbHVlID0gb2JqZWN0W3Byb3BdO1xuXG4gICAgICAvLyBBbGxvdyBmb3IgdGhlIGNhc2Ugb2Ygb2JqLnByb3AgPSB1bmRlZmluZWQgKHdoaWNoIGlzIGEgbmV3IHByb3BlcnR5LCBldmVuIGlmIGl0IGlzIHVuZGVmaW5lZClcbiAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmICFkaWZmQmFzaWModmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgLy8gSWYgdGhlIHByb3BlcnR5IGlzIGdvbmUgaXQgd2FzIHJlbW92ZWRcbiAgICAgIGlmICghIChwcm9wIGluIG9iamVjdCkpIHtcbiAgICAgICAgY2hhbmdlUmVjb3Jkcy5wdXNoKG5ldyBDaGFuZ2VSZWNvcmQob2JqZWN0LCAnZGVsZXRlZCcsIHByb3AsIG9sZFZhbHVlKSk7XG4gICAgICB9IGVsc2UgaWYgKGRpZmZCYXNpYyh2YWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgIGNoYW5nZVJlY29yZHMucHVzaChuZXcgQ2hhbmdlUmVjb3JkKG9iamVjdCwgJ3VwZGF0ZWQnLCBwcm9wLCBvbGRWYWx1ZSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEdvZXMgdGhyb3VnaCB0aGUgb2xkIG9iamVjdCBhbmQgbG9va3MgZm9yIHRoaW5ncyB0aGF0IGFyZSBuZXdcbiAgICBmb3IgKHByb3AgaW4gb2JqZWN0KSB7XG4gICAgICB2YWx1ZSA9IG9iamVjdFtwcm9wXTtcbiAgICAgIGlmICghIChwcm9wIGluIG9sZE9iamVjdCkpIHtcbiAgICAgICAgY2hhbmdlUmVjb3Jkcy5wdXNoKG5ldyBDaGFuZ2VSZWNvcmQob2JqZWN0LCAnbmV3JywgcHJvcCkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChBcnJheS5pc0FycmF5KG9iamVjdCkgJiYgb2JqZWN0Lmxlbmd0aCAhPT0gb2xkT2JqZWN0Lmxlbmd0aCkge1xuICAgICAgY2hhbmdlUmVjb3Jkcy5wdXNoKG5ldyBDaGFuZ2VSZWNvcmQob2JqZWN0LCAndXBkYXRlZCcsICdsZW5ndGgnLCBvbGRPYmplY3QubGVuZ3RoKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNoYW5nZVJlY29yZHM7XG4gIH1cblxuXG5cblxuXG4gIEVESVRfTEVBVkUgPSAwXG4gIEVESVRfVVBEQVRFID0gMVxuICBFRElUX0FERCA9IDJcbiAgRURJVF9ERUxFVEUgPSAzXG5cblxuICAvLyBEaWZmcyB0d28gYXJyYXlzIHJldHVybmluZyBhbiBhcnJheSBvZiBzcGxpY2VzLiBBIHNwbGljZSBvYmplY3QgbG9va3MgbGlrZTpcbiAgLy8gYGBgamF2YXNjcmlwdFxuICAvLyB7XG4gIC8vICAgaW5kZXg6IDMsXG4gIC8vICAgcmVtb3ZlZDogW2l0ZW0sIGl0ZW1dLFxuICAvLyAgIGFkZGVkQ291bnQ6IDBcbiAgLy8gfVxuICAvLyBgYGBcbiAgZnVuY3Rpb24gZGlmZkFycmF5cyh2YWx1ZSwgb2xkVmFsdWUpIHtcbiAgICB2YXIgY3VycmVudFN0YXJ0ID0gMDtcbiAgICB2YXIgY3VycmVudEVuZCA9IHZhbHVlLmxlbmd0aDtcbiAgICB2YXIgb2xkU3RhcnQgPSAwO1xuICAgIHZhciBvbGRFbmQgPSBvbGRWYWx1ZS5sZW5ndGg7XG5cbiAgICB2YXIgbWluTGVuZ3RoID0gTWF0aC5taW4oY3VycmVudEVuZCwgb2xkRW5kKTtcbiAgICB2YXIgcHJlZml4Q291bnQgPSBzaGFyZWRQcmVmaXgodmFsdWUsIG9sZFZhbHVlLCBtaW5MZW5ndGgpO1xuICAgIHZhciBzdWZmaXhDb3VudCA9IHNoYXJlZFN1ZmZpeCh2YWx1ZSwgb2xkVmFsdWUsIG1pbkxlbmd0aCAtIHByZWZpeENvdW50KTtcblxuICAgIGN1cnJlbnRTdGFydCArPSBwcmVmaXhDb3VudDtcbiAgICBvbGRTdGFydCArPSBwcmVmaXhDb3VudDtcbiAgICBjdXJyZW50RW5kIC09IHN1ZmZpeENvdW50O1xuICAgIG9sZEVuZCAtPSBzdWZmaXhDb3VudDtcblxuICAgIGlmIChjdXJyZW50RW5kIC0gY3VycmVudFN0YXJ0ID09PSAwICYmIG9sZEVuZCAtIG9sZFN0YXJ0ID09PSAwKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgLy8gaWYgbm90aGluZyB3YXMgYWRkZWQsIG9ubHkgcmVtb3ZlZCBmcm9tIG9uZSBzcG90XG4gICAgaWYgKGN1cnJlbnRTdGFydCA9PT0gY3VycmVudEVuZCkge1xuICAgICAgcmV0dXJuIFsgbmV3IFNwbGljZShjdXJyZW50U3RhcnQsIG9sZFZhbHVlLnNsaWNlKG9sZFN0YXJ0LCBvbGRFbmQpLCAwKSBdO1xuICAgIH1cblxuICAgIC8vIGlmIG5vdGhpbmcgd2FzIHJlbW92ZWQsIG9ubHkgYWRkZWQgdG8gb25lIHNwb3RcbiAgICBpZiAob2xkU3RhcnQgPT09IG9sZEVuZCkge1xuICAgICAgcmV0dXJuIFsgbmV3IFNwbGljZShjdXJyZW50U3RhcnQsIFtdLCBjdXJyZW50RW5kIC0gY3VycmVudFN0YXJ0KSBdO1xuICAgIH1cblxuICAgIC8vIGEgbWl4dHVyZSBvZiBhZGRzIGFuZCByZW1vdmVzXG4gICAgdmFyIGRpc3RhbmNlcyA9IGNhbGNFZGl0RGlzdGFuY2VzKHZhbHVlLCBjdXJyZW50U3RhcnQsIGN1cnJlbnRFbmQsIG9sZFZhbHVlLCBvbGRTdGFydCwgb2xkRW5kKTtcbiAgICB2YXIgb3BzID0gc3BsaWNlT3BlcmF0aW9uc0Zyb21FZGl0RGlzdGFuY2VzKGRpc3RhbmNlcyk7XG5cbiAgICB2YXIgc3BsaWNlID0gbnVsbDtcbiAgICB2YXIgc3BsaWNlcyA9IFtdO1xuICAgIHZhciBpbmRleCA9IGN1cnJlbnRTdGFydDtcbiAgICB2YXIgb2xkSW5kZXggPSBvbGRTdGFydDtcblxuICAgIGZvciAodmFyIGkgPSAwLCBsID0gb3BzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgdmFyIG9wID0gb3BzW2ldO1xuICAgICAgaWYgKG9wID09PSBFRElUX0xFQVZFKSB7XG4gICAgICAgIGlmIChzcGxpY2UpIHtcbiAgICAgICAgICBzcGxpY2VzLnB1c2goc3BsaWNlKTtcbiAgICAgICAgICBzcGxpY2UgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgaW5kZXgrKztcbiAgICAgICAgb2xkSW5kZXgrKztcbiAgICAgIH0gZWxzZSBpZiAob3AgPT09IEVESVRfVVBEQVRFKSB7XG4gICAgICAgIGlmICghc3BsaWNlKSB7XG4gICAgICAgICAgc3BsaWNlID0gbmV3IFNwbGljZShpbmRleCwgW10sIDApO1xuICAgICAgICB9XG5cbiAgICAgICAgc3BsaWNlLmFkZGVkQ291bnQrKztcbiAgICAgICAgaW5kZXgrKztcblxuICAgICAgICBzcGxpY2UucmVtb3ZlZC5wdXNoKG9sZFZhbHVlW29sZEluZGV4XSk7XG4gICAgICAgIG9sZEluZGV4Kys7XG4gICAgICB9IGVsc2UgaWYgKG9wID09PSBFRElUX0FERCkge1xuICAgICAgICBpZiAoIXNwbGljZSkge1xuICAgICAgICAgIHNwbGljZSA9IG5ldyBTcGxpY2UoaW5kZXgsIFtdLCAwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNwbGljZS5hZGRlZENvdW50Kys7XG4gICAgICAgIGluZGV4Kys7XG4gICAgICB9IGVsc2UgaWYgKG9wID09PSBFRElUX0RFTEVURSkge1xuICAgICAgICBpZiAoIXNwbGljZSkge1xuICAgICAgICAgIHNwbGljZSA9IG5ldyBTcGxpY2UoaW5kZXgsIFtdLCAwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNwbGljZS5yZW1vdmVkLnB1c2gob2xkVmFsdWVbb2xkSW5kZXhdKTtcbiAgICAgICAgb2xkSW5kZXgrKztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc3BsaWNlKSB7XG4gICAgICBzcGxpY2VzLnB1c2goc3BsaWNlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3BsaWNlcztcbiAgfVxuXG5cblxuXG4gIC8vIGZpbmQgdGhlIG51bWJlciBvZiBpdGVtcyBhdCB0aGUgYmVnaW5uaW5nIHRoYXQgYXJlIHRoZSBzYW1lXG4gIGZ1bmN0aW9uIHNoYXJlZFByZWZpeChjdXJyZW50LCBvbGQsIHNlYXJjaExlbmd0aCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2VhcmNoTGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChkaWZmQmFzaWMoY3VycmVudFtpXSwgb2xkW2ldKSkge1xuICAgICAgICByZXR1cm4gaTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHNlYXJjaExlbmd0aDtcbiAgfVxuXG5cbiAgLy8gZmluZCB0aGUgbnVtYmVyIG9mIGl0ZW1zIGF0IHRoZSBlbmQgdGhhdCBhcmUgdGhlIHNhbWVcbiAgZnVuY3Rpb24gc2hhcmVkU3VmZml4KGN1cnJlbnQsIG9sZCwgc2VhcmNoTGVuZ3RoKSB7XG4gICAgdmFyIGluZGV4MSA9IGN1cnJlbnQubGVuZ3RoO1xuICAgIHZhciBpbmRleDIgPSBvbGQubGVuZ3RoO1xuICAgIHZhciBjb3VudCA9IDA7XG4gICAgd2hpbGUgKGNvdW50IDwgc2VhcmNoTGVuZ3RoICYmICFkaWZmQmFzaWMoY3VycmVudFstLWluZGV4MV0sIG9sZFstLWluZGV4Ml0pKSB7XG4gICAgICBjb3VudCsrO1xuICAgIH1cbiAgICByZXR1cm4gY291bnQ7XG4gIH1cblxuXG4gIGZ1bmN0aW9uIHNwbGljZU9wZXJhdGlvbnNGcm9tRWRpdERpc3RhbmNlcyhkaXN0YW5jZXMpIHtcbiAgICB2YXIgaSA9IGRpc3RhbmNlcy5sZW5ndGggLSAxO1xuICAgIHZhciBqID0gZGlzdGFuY2VzWzBdLmxlbmd0aCAtIDE7XG4gICAgdmFyIGN1cnJlbnQgPSBkaXN0YW5jZXNbaV1bal07XG4gICAgdmFyIGVkaXRzID0gW107XG4gICAgd2hpbGUgKGkgPiAwIHx8IGogPiAwKSB7XG4gICAgICBpZiAoaSA9PT0gMCkge1xuICAgICAgICBlZGl0cy5wdXNoKEVESVRfQUREKTtcbiAgICAgICAgai0tO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGogPT09IDApIHtcbiAgICAgICAgZWRpdHMucHVzaChFRElUX0RFTEVURSk7XG4gICAgICAgIGktLTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIHZhciBub3J0aFdlc3QgPSBkaXN0YW5jZXNbaSAtIDFdW2ogLSAxXTtcbiAgICAgIHZhciB3ZXN0ID0gZGlzdGFuY2VzW2kgLSAxXVtqXTtcbiAgICAgIHZhciBub3J0aCA9IGRpc3RhbmNlc1tpXVtqIC0gMV07XG5cbiAgICAgIGlmICh3ZXN0IDwgbm9ydGgpIHtcbiAgICAgICAgbWluID0gd2VzdCA8IG5vcnRoV2VzdCA/IHdlc3QgOiBub3J0aFdlc3Q7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtaW4gPSBub3J0aCA8IG5vcnRoV2VzdCA/IG5vcnRoIDogbm9ydGhXZXN0O1xuICAgICAgfVxuXG4gICAgICBpZiAobWluID09PSBub3J0aFdlc3QpIHtcbiAgICAgICAgaWYgKG5vcnRoV2VzdCA9PT0gY3VycmVudCkge1xuICAgICAgICAgIGVkaXRzLnB1c2goRURJVF9MRUFWRSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZWRpdHMucHVzaChFRElUX1VQREFURSk7XG4gICAgICAgICAgY3VycmVudCA9IG5vcnRoV2VzdDtcbiAgICAgICAgfVxuICAgICAgICBpLS07XG4gICAgICAgIGotLTtcbiAgICAgIH0gZWxzZSBpZiAobWluID09PSB3ZXN0KSB7XG4gICAgICAgIGVkaXRzLnB1c2goRURJVF9ERUxFVEUpO1xuICAgICAgICBpLS07XG4gICAgICAgIGN1cnJlbnQgPSB3ZXN0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZWRpdHMucHVzaChFRElUX0FERCk7XG4gICAgICAgIGotLTtcbiAgICAgICAgY3VycmVudCA9IG5vcnRoO1xuICAgICAgfVxuICAgIH1cbiAgICBlZGl0cy5yZXZlcnNlKCk7XG4gICAgcmV0dXJuIGVkaXRzO1xuICB9XG5cblxuICBmdW5jdGlvbiBjYWxjRWRpdERpc3RhbmNlcyhjdXJyZW50LCBjdXJyZW50U3RhcnQsIGN1cnJlbnRFbmQsIG9sZCwgb2xkU3RhcnQsIG9sZEVuZCkge1xuICAgIC8vIFwiRGVsZXRpb25cIiBjb2x1bW5zXG4gICAgdmFyIHJvd0NvdW50ID0gb2xkRW5kIC0gb2xkU3RhcnQgKyAxO1xuICAgIHZhciBjb2x1bW5Db3VudCA9IGN1cnJlbnRFbmQgLSBjdXJyZW50U3RhcnQgKyAxO1xuICAgIHZhciBkaXN0YW5jZXMgPSBuZXcgQXJyYXkocm93Q291bnQpO1xuICAgIHZhciBpLCBqO1xuXG4gICAgLy8gXCJBZGRpdGlvblwiIHJvd3MuIEluaXRpYWxpemUgbnVsbCBjb2x1bW4uXG4gICAgZm9yIChpID0gMDsgaSA8IHJvd0NvdW50OyBpKyspIHtcbiAgICAgIGRpc3RhbmNlc1tpXSA9IG5ldyBBcnJheShjb2x1bW5Db3VudCk7XG4gICAgICBkaXN0YW5jZXNbaV1bMF0gPSBpO1xuICAgIH1cblxuICAgIC8vIEluaXRpYWxpemUgbnVsbCByb3dcbiAgICBmb3IgKGogPSAwOyBqIDwgY29sdW1uQ291bnQ7IGorKykge1xuICAgICAgZGlzdGFuY2VzWzBdW2pdID0gajtcbiAgICB9XG5cbiAgICBmb3IgKGkgPSAxOyBpIDwgcm93Q291bnQ7IGkrKykge1xuICAgICAgZm9yIChqID0gMTsgaiA8IGNvbHVtbkNvdW50OyBqKyspIHtcbiAgICAgICAgaWYgKCFkaWZmQmFzaWMoY3VycmVudFtjdXJyZW50U3RhcnQgKyBqIC0gMV0sIG9sZFtvbGRTdGFydCArIGkgLSAxXSkpIHtcbiAgICAgICAgICBkaXN0YW5jZXNbaV1bal0gPSBkaXN0YW5jZXNbaSAtIDFdW2ogLSAxXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YXIgbm9ydGggPSBkaXN0YW5jZXNbaSAtIDFdW2pdICsgMTtcbiAgICAgICAgICB2YXIgd2VzdCA9IGRpc3RhbmNlc1tpXVtqIC0gMV0gKyAxO1xuICAgICAgICAgIGRpc3RhbmNlc1tpXVtqXSA9IG5vcnRoIDwgd2VzdCA/IG5vcnRoIDogd2VzdDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBkaXN0YW5jZXM7XG4gIH1cbn0pKCk7XG4iLCIvLyAjIENoaXAgRXhwcmVzc2lvblxuXG4vLyBQYXJzZXMgYSBzdHJpbmcgb2YgSmF2YVNjcmlwdCBpbnRvIGEgZnVuY3Rpb24gd2hpY2ggY2FuIGJlIGJvdW5kIHRvIGEgc2NvcGUuXG4vL1xuLy8gQWxsb3dzIHVuZGVmaW5lZCBvciBudWxsIHZhbHVlcyB0byByZXR1cm4gdW5kZWZpbmVkIHJhdGhlciB0aGFuIHRocm93aW5nXG4vLyBlcnJvcnMsIGFsbG93cyBmb3IgZm9ybWF0dGVycyBvbiBkYXRhLCBhbmQgcHJvdmlkZXMgZGV0YWlsZWQgZXJyb3IgcmVwb3J0aW5nLlxuXG4vLyBUaGUgZXhwcmVzc2lvbiBvYmplY3Qgd2l0aCBpdHMgZXhwcmVzc2lvbiBjYWNoZS5cbnZhciBleHByZXNzaW9uID0gZXhwb3J0cztcbmV4cHJlc3Npb24uY2FjaGUgPSB7fTtcbmV4cHJlc3Npb24uZ2xvYmFscyA9IFsndHJ1ZScsICdmYWxzZScsICdudWxsJywgJ3VuZGVmaW5lZCcsICd3aW5kb3cnLCAndGhpcyddO1xuZXhwcmVzc2lvbi5nZXQgPSBnZXRFeHByZXNzaW9uO1xuZXhwcmVzc2lvbi5nZXRTZXR0ZXIgPSBnZXRTZXR0ZXI7XG5leHByZXNzaW9uLmJpbmQgPSBiaW5kRXhwcmVzc2lvbjtcblxuXG4vLyBDcmVhdGVzIGEgZnVuY3Rpb24gZnJvbSB0aGUgZ2l2ZW4gZXhwcmVzc2lvbi4gQW4gYG9wdGlvbnNgIG9iamVjdCBtYXkgYmVcbi8vIHByb3ZpZGVkIHdpdGggdGhlIGZvbGxvd2luZyBvcHRpb25zOlxuLy8gKiBgYXJnc2AgaXMgYW4gYXJyYXkgb2Ygc3RyaW5ncyB3aGljaCB3aWxsIGJlIHRoZSBmdW5jdGlvbidzIGFyZ3VtZW50IG5hbWVzXG4vLyAqIGBnbG9iYWxzYCBpcyBhbiBhcnJheSBvZiBzdHJpbmdzIHdoaWNoIGRlZmluZSBnbG9iYWxzIGF2YWlsYWJsZSB0byB0aGVcbi8vIGZ1bmN0aW9uICh0aGVzZSB3aWxsIG5vdCBiZSBwcmVmaXhlZCB3aXRoIGB0aGlzLmApLiBgJ3RydWUnYCwgYCdmYWxzZSdgLFxuLy8gYCdudWxsJ2AsIGFuZCBgJ3dpbmRvdydgIGFyZSBpbmNsdWRlZCBieSBkZWZhdWx0LlxuLy9cbi8vIFRoaXMgZnVuY3Rpb24gd2lsbCBiZSBjYWNoZWQgc28gc3Vic2VxdWVudCBjYWxscyB3aXRoIHRoZSBzYW1lIGV4cHJlc3Npb24gd2lsbFxuLy8gcmV0dXJuIHRoZSBzYW1lIGZ1bmN0aW9uLiBFLmcuIHRoZSBleHByZXNzaW9uIFwibmFtZVwiIHdpbGwgYWx3YXlzIHJldHVybiBhXG4vLyBzaW5nbGUgZnVuY3Rpb24gd2l0aCB0aGUgYm9keSBgcmV0dXJuIHRoaXMubmFtZWAuXG5mdW5jdGlvbiBnZXRFeHByZXNzaW9uKGV4cHIsIG9wdGlvbnMpIHtcbiAgaWYgKCFvcHRpb25zKSBvcHRpb25zID0ge307XG4gIGlmICghb3B0aW9ucy5hcmdzKSBvcHRpb25zLmFyZ3MgPSBbXTtcbiAgdmFyIGNhY2hlS2V5ID0gZXhwciArICd8JyArIG9wdGlvbnMuYXJncy5qb2luKCcsJyk7XG4gIC8vIFJldHVybnMgdGhlIGNhY2hlZCBmdW5jdGlvbiBmb3IgdGhpcyBleHByZXNzaW9uIGlmIGl0IGV4aXN0cy5cbiAgdmFyIGZ1bmMgPSBleHByZXNzaW9uLmNhY2hlW2NhY2hlS2V5XTtcbiAgaWYgKGZ1bmMpIHtcbiAgICByZXR1cm4gZnVuYztcbiAgfVxuXG4gIG9wdGlvbnMuYXJncy51bnNoaWZ0KCdfZm9ybWF0dGVyc18nKTtcblxuICAvLyBQcmVmaXggYWxsIHByb3BlcnR5IGxvb2t1cHMgd2l0aCB0aGUgYHRoaXNgIGtleXdvcmQuIElnbm9yZXMga2V5d29yZHNcbiAgLy8gKHdpbmRvdywgdHJ1ZSwgZmFsc2UpIGFuZCBleHRyYSBhcmdzXG4gIHZhciBib2R5ID0gcGFyc2VFeHByZXNzaW9uKGV4cHIsIG9wdGlvbnMpO1xuXG4gIHRyeSB7XG4gICAgZnVuYyA9IGV4cHJlc3Npb24uY2FjaGVbY2FjaGVLZXldID0gRnVuY3Rpb24uYXBwbHkobnVsbCwgb3B0aW9ucy5hcmdzLmNvbmNhdChib2R5KSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBpZiAob3B0aW9ucy5pZ25vcmVFcnJvcnMpIHJldHVybjtcbiAgICAvLyBUaHJvd3MgYW4gZXJyb3IgaWYgdGhlIGV4cHJlc3Npb24gd2FzIG5vdCB2YWxpZCBKYXZhU2NyaXB0XG4gICAgY29uc29sZS5lcnJvcignQmFkIGV4cHJlc3Npb246XFxuYCcgKyBleHByICsgJ2BcXG4nICsgJ0NvbXBpbGVkIGV4cHJlc3Npb246XFxuJyArIGJvZHkpO1xuICAgIHRocm93IG5ldyBFcnJvcihlLm1lc3NhZ2UpO1xuICB9XG4gIHJldHVybiBmdW5jO1xufVxuXG5cbi8vIENyZWF0ZXMgYSBzZXR0ZXIgZnVuY3Rpb24gZnJvbSB0aGUgZ2l2ZW4gZXhwcmVzc2lvbi5cbmZ1bmN0aW9uIGdldFNldHRlcihleHByLCBvcHRpb25zKSB7XG4gIGlmICghb3B0aW9ucykgb3B0aW9ucyA9IHt9O1xuICBvcHRpb25zLmFyZ3MgPSBbJ3ZhbHVlJ107XG4gIGV4cHIgPSBleHByLnJlcGxhY2UoLyhcXHMqXFx8fCQpLywgJyA9IHZhbHVlJDEnKTtcbiAgcmV0dXJuIGdldEV4cHJlc3Npb24oZXhwciwgb3B0aW9ucyk7XG59XG5cblxuXG4vLyBDb21waWxlcyBhbiBleHByZXNzaW9uIGFuZCBiaW5kcyBpdCBpbiB0aGUgZ2l2ZW4gc2NvcGUuIFRoaXMgYWxsb3dzIGl0IHRvIGJlXG4vLyBjYWxsZWQgZnJvbSBhbnl3aGVyZSAoZS5nLiBldmVudCBsaXN0ZW5lcnMpIHdoaWxlIHJldGFpbmluZyB0aGUgc2NvcGUuXG5mdW5jdGlvbiBiaW5kRXhwcmVzc2lvbihleHByLCBzY29wZSwgb3B0aW9ucykge1xuICByZXR1cm4gZ2V0RXhwcmVzc2lvbihleHByLCBvcHRpb25zKS5iaW5kKHNjb3BlKTtcbn1cblxuLy8gZmluZHMgYWxsIHF1b3RlZCBzdHJpbmdzXG52YXIgcXVvdGVFeHByID0gLyhbJ1wiXFwvXSkoXFxcXFxcMXxbXlxcMV0pKj9cXDEvZztcblxuLy8gZmluZHMgYWxsIGVtcHR5IHF1b3RlZCBzdHJpbmdzXG52YXIgZW1wdHlRdW90ZUV4cHIgPSAvKFsnXCJcXC9dKVxcMS9nO1xuXG4vLyBmaW5kcyBwaXBlcyB0aGF0IGFyZW4ndCBPUnMgKGAgfCBgIG5vdCBgIHx8IGApIGZvciBmb3JtYXR0ZXJzXG52YXIgcGlwZUV4cHIgPSAvXFx8KFxcfCk/L2c7XG5cbi8vIGZpbmRzIHRoZSBwYXJ0cyBvZiBhIGZvcm1hdHRlciAobmFtZSBhbmQgYXJncylcbnZhciBmb3JtYXR0ZXJFeHByID0gL14oW15cXChdKykoPzpcXCgoLiopXFwpKT8kLztcblxuLy8gZmluZHMgYXJndW1lbnQgc2VwYXJhdG9ycyBmb3IgZm9ybWF0dGVycyAoYGFyZzE6YXJnMmApXG52YXIgYXJnU2VwYXJhdG9yID0gL1xccyosXFxzKi9nO1xuXG4vLyBtYXRjaGVzIHByb3BlcnR5IGNoYWlucyAoZS5nLiBgbmFtZWAsIGB1c2VyLm5hbWVgLCBhbmQgYHVzZXIuZnVsbE5hbWUoKS5jYXBpdGFsaXplKClgKVxudmFyIHByb3BFeHByID0gLygoXFx7fCx8XFwuKT9cXHMqKShbYS16JF9cXCRdKD86W2Etel9cXCQwLTlcXC4tXXxcXFtbJ1wiXFxkXStcXF0pKikoXFxzKig6fFxcKHxcXFspPykvZ2k7XG5cbi8vIGxpbmtzIGluIGEgcHJvcGVydHkgY2hhaW5cbnZhciBjaGFpbkxpbmtzID0gL1xcLnxcXFsvZztcblxuLy8gdGhlIHByb3BlcnR5IG5hbWUgcGFydCBvZiBsaW5rc1xudmFyIGNoYWluTGluayA9IC9cXC58XFxbfFxcKC87XG5cbi8vIGRldGVybWluZXMgd2hldGhlciBhbiBleHByZXNzaW9uIGlzIGEgc2V0dGVyIG9yIGdldHRlciAoYG5hbWVgIHZzXG4vLyBgbmFtZSA9ICdib2InYClcbnZhciBzZXR0ZXJFeHByID0gL1xccz1cXHMvO1xuXG52YXIgaWdub3JlID0gbnVsbDtcbnZhciBzdHJpbmdzID0gW107XG52YXIgcmVmZXJlbmNlQ291bnQgPSAwO1xudmFyIGN1cnJlbnRSZWZlcmVuY2UgPSAwO1xudmFyIGN1cnJlbnRJbmRleCA9IDA7XG52YXIgZmluaXNoZWRDaGFpbiA9IGZhbHNlO1xudmFyIGNvbnRpbnVhdGlvbiA9IGZhbHNlO1xuXG4vLyBBZGRzIGB0aGlzLmAgdG8gdGhlIGJlZ2lubmluZyBvZiBlYWNoIHZhbGlkIHByb3BlcnR5IGluIGFuIGV4cHJlc3Npb24sXG4vLyBwcm9jZXNzZXMgZm9ybWF0dGVycywgYW5kIHByb3ZpZGVzIG51bGwtdGVybWluYXRpb24gaW4gcHJvcGVydHkgY2hhaW5zXG5mdW5jdGlvbiBwYXJzZUV4cHJlc3Npb24oZXhwciwgb3B0aW9ucykge1xuICBpbml0UGFyc2UoZXhwciwgb3B0aW9ucyk7XG4gIGV4cHIgPSBwdWxsT3V0U3RyaW5ncyhleHByKTtcbiAgZXhwciA9IHBhcnNlRm9ybWF0dGVycyhleHByKTtcbiAgZXhwciA9IHBhcnNlRXhwcihleHByKTtcbiAgZXhwciA9ICdyZXR1cm4gJyArIGV4cHI7XG4gIGV4cHIgPSBwdXRJblN0cmluZ3MoZXhwcik7XG4gIGV4cHIgPSBhZGRSZWZlcmVuY2VzKGV4cHIpO1xuICByZXR1cm4gZXhwcjtcbn1cblxuXG5mdW5jdGlvbiBpbml0UGFyc2UoZXhwciwgb3B0aW9ucykge1xuICByZWZlcmVuY2VDb3VudCA9IGN1cnJlbnRSZWZlcmVuY2UgPSAwO1xuICAvLyBJZ25vcmVzIGtleXdvcmRzIGFuZCBwcm92aWRlZCBhcmd1bWVudCBuYW1lc1xuICBpZ25vcmUgPSBleHByZXNzaW9uLmdsb2JhbHMuY29uY2F0KG9wdGlvbnMuZ2xvYmFscyB8fCBbXSwgb3B0aW9ucy5hcmdzIHx8IFtdKTtcbiAgc3RyaW5ncy5sZW5ndGggPSAwO1xufVxuXG5cbi8vIEFkZHMgcGxhY2Vob2xkZXJzIGZvciBzdHJpbmdzIHNvIHdlIGNhbiBwcm9jZXNzIHRoZSByZXN0IHdpdGhvdXQgdGhlaXIgY29udGVudFxuLy8gbWVzc2luZyB1cyB1cC5cbmZ1bmN0aW9uIHB1bGxPdXRTdHJpbmdzKGV4cHIpIHtcbiAgcmV0dXJuIGV4cHIucmVwbGFjZShxdW90ZUV4cHIsIGZ1bmN0aW9uKHN0ciwgcXVvdGUpIHtcbiAgICBzdHJpbmdzLnB1c2goc3RyKTtcbiAgICByZXR1cm4gcXVvdGUgKyBxdW90ZTsgLy8gcGxhY2Vob2xkZXIgZm9yIHRoZSBzdHJpbmdcbiAgfSk7XG59XG5cblxuLy8gUmVwbGFjZXMgc3RyaW5nIHBsYWNlaG9sZGVycy5cbmZ1bmN0aW9uIHB1dEluU3RyaW5ncyhleHByKSB7XG4gIHJldHVybiBleHByLnJlcGxhY2UoZW1wdHlRdW90ZUV4cHIsIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBzdHJpbmdzLnNoaWZ0KCk7XG4gIH0pO1xufVxuXG5cbi8vIFByZXBlbmRzIHJlZmVyZW5jZSB2YXJpYWJsZSBkZWZpbml0aW9uc1xuZnVuY3Rpb24gYWRkUmVmZXJlbmNlcyhleHByKSB7XG4gIGlmIChyZWZlcmVuY2VDb3VudCkge1xuICAgIHZhciByZWZzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPD0gcmVmZXJlbmNlQ291bnQ7IGkrKykge1xuICAgICAgcmVmcy5wdXNoKCdfcmVmJyArIGkpO1xuICAgIH1cbiAgICBleHByID0gJ3ZhciAnICsgcmVmcy5qb2luKCcsICcpICsgJztcXG4nICsgZXhwcjtcbiAgfVxuICByZXR1cm4gZXhwcjtcbn1cblxuXG5mdW5jdGlvbiBwYXJzZUZvcm1hdHRlcnMoZXhwcikge1xuICAvLyBSZW1vdmVzIGZvcm1hdHRlcnMgZnJvbSBleHByZXNzaW9uIHN0cmluZ1xuICBleHByID0gZXhwci5yZXBsYWNlKHBpcGVFeHByLCBmdW5jdGlvbihtYXRjaCwgb3JJbmRpY2F0b3IpIHtcbiAgICBpZiAob3JJbmRpY2F0b3IpIHJldHVybiBtYXRjaDtcbiAgICByZXR1cm4gJ0BAQCc7XG4gIH0pO1xuXG4gIGZvcm1hdHRlcnMgPSBleHByLnNwbGl0KC9cXHMqQEBAXFxzKi8pO1xuICBleHByID0gZm9ybWF0dGVycy5zaGlmdCgpO1xuICBpZiAoIWZvcm1hdHRlcnMubGVuZ3RoKSByZXR1cm4gZXhwcjtcblxuICAvLyBQcm9jZXNzZXMgdGhlIGZvcm1hdHRlcnNcbiAgLy8gSWYgdGhlIGV4cHJlc3Npb24gaXMgYSBzZXR0ZXIgdGhlIHZhbHVlIHdpbGwgYmUgcnVuIHRocm91Z2ggdGhlIGZvcm1hdHRlcnNcbiAgdmFyIHNldHRlciA9ICcnO1xuICB2YWx1ZSA9IGV4cHI7XG5cbiAgaWYgKHNldHRlckV4cHIudGVzdChleHByKSkge1xuICAgIHZhciBwYXJ0cyA9IGV4cHIuc3BsaXQoc2V0dGVyRXhwcik7XG4gICAgc2V0dGVyID0gcGFydHNbMF0gKyAnID0gJztcbiAgICB2YWx1ZSA9IHBhcnRzWzFdO1xuICB9XG5cbiAgZm9ybWF0dGVycy5mb3JFYWNoKGZ1bmN0aW9uKGZvcm1hdHRlcikge1xuICAgIHZhciBtYXRjaCA9IGZvcm1hdHRlci50cmltKCkubWF0Y2goZm9ybWF0dGVyRXhwcik7XG4gICAgaWYgKCFtYXRjaCkgdGhyb3cgbmV3IEVycm9yKCdGb3JtYXR0ZXIgaXMgaW52YWxpZDogJyArIGZvcm1hdHRlcik7XG4gICAgdmFyIGZvcm1hdHRlck5hbWUgPSBtYXRjaFsxXTtcbiAgICB2YXIgYXJncyA9IG1hdGNoWzJdID8gbWF0Y2hbMl0uc3BsaXQoYXJnU2VwYXJhdG9yKSA6IFtdO1xuICAgIGFyZ3MudW5zaGlmdCh2YWx1ZSk7XG4gICAgaWYgKHNldHRlcikgYXJncy5wdXNoKHRydWUpO1xuICAgIHZhbHVlID0gJ19mb3JtYXR0ZXJzXy4nICsgZm9ybWF0dGVyTmFtZSArICcuY2FsbCh0aGlzLCAnICsgYXJncy5qb2luKCcsICcpICsgJyknO1xuICB9KTtcblxuICByZXR1cm4gc2V0dGVyICsgdmFsdWU7XG59XG5cblxuZnVuY3Rpb24gcGFyc2VFeHByKGV4cHIpIHtcbiAgaWYgKHNldHRlckV4cHIudGVzdChleHByKSkge1xuICAgIHZhciBwYXJ0cyA9IGV4cHIuc3BsaXQoJyA9ICcpO1xuICAgIHZhciBzZXR0ZXIgPSBwYXJ0c1swXTtcbiAgICB2YXIgdmFsdWUgPSBwYXJ0c1sxXTtcbiAgICB2YXIgbmVnYXRlID0gJyc7XG4gICAgaWYgKHNldHRlci5jaGFyQXQoMCkgPT09ICchJykge1xuICAgICAgbmVnYXRlID0gJyEnO1xuICAgICAgc2V0dGVyID0gc2V0dGVyLnNsaWNlKDEpO1xuICAgIH1cbiAgICBzZXR0ZXIgPSBwYXJzZVByb3BlcnR5Q2hhaW5zKHNldHRlcikucmVwbGFjZSgvXlxcKHxcXCkkL2csICcnKSArICcgPSAnO1xuICAgIHZhbHVlID0gcGFyc2VQcm9wZXJ0eUNoYWlucyh2YWx1ZSk7XG4gICAgcmV0dXJuIHNldHRlciArIG5lZ2F0ZSArIHZhbHVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBwYXJzZVByb3BlcnR5Q2hhaW5zKGV4cHIpO1xuICB9XG59XG5cblxuZnVuY3Rpb24gcGFyc2VQcm9wZXJ0eUNoYWlucyhleHByKSB7XG4gIHZhciBqYXZhc2NyaXB0ID0gJycsIGpzO1xuICAvLyBhbGxvdyByZWN1cnNpb24gaW50byBmdW5jdGlvbiBhcmdzIGJ5IHJlc2V0dGluZyBwcm9wRXhwclxuICB2YXIgcHJldmlvdXNJbmRleGVzID0gW2N1cnJlbnRJbmRleCwgcHJvcEV4cHIubGFzdEluZGV4XTtcbiAgY3VycmVudEluZGV4ID0gMDtcbiAgcHJvcEV4cHIubGFzdEluZGV4ID0gMDtcbiAgd2hpbGUgKChqcyA9IG5leHRDaGFpbihleHByKSkgIT09IGZhbHNlKSB7XG4gICAgamF2YXNjcmlwdCArPSBqcztcbiAgfVxuICBjdXJyZW50SW5kZXggPSBwcmV2aW91c0luZGV4ZXNbMF07XG4gIHByb3BFeHByLmxhc3RJbmRleCA9IHByZXZpb3VzSW5kZXhlc1sxXTtcbiAgcmV0dXJuIGphdmFzY3JpcHQ7XG59XG5cblxuZnVuY3Rpb24gbmV4dENoYWluKGV4cHIpIHtcbiAgaWYgKGZpbmlzaGVkQ2hhaW4pIHtcbiAgICByZXR1cm4gKGZpbmlzaGVkQ2hhaW4gPSBmYWxzZSk7XG4gIH1cbiAgdmFyIG1hdGNoID0gcHJvcEV4cHIuZXhlYyhleHByKTtcbiAgaWYgKCFtYXRjaCkge1xuICAgIGZpbmlzaGVkQ2hhaW4gPSB0cnVlIC8vIG1ha2Ugc3VyZSBuZXh0IGNhbGwgd2UgcmV0dXJuIGZhbHNlXG4gICAgcmV0dXJuIGV4cHIuc2xpY2UoY3VycmVudEluZGV4KTtcbiAgfVxuXG4gIC8vIGBwcmVmaXhgIGlzIGBvYmpJbmRpY2F0b3JgIHdpdGggdGhlIHdoaXRlc3BhY2UgdGhhdCBtYXkgY29tZSBhZnRlciBpdC5cbiAgdmFyIHByZWZpeCA9IG1hdGNoWzFdO1xuXG4gIC8vIGBvYmpJbmRpY2F0b3JgIGlzIGB7YCBvciBgLGAgYW5kIGxldCdzIHVzIGtub3cgdGhpcyBpcyBhbiBvYmplY3QgcHJvcGVydHlcbiAgLy8gbmFtZSAoZS5nLiBwcm9wIGluIGB7cHJvcDpmYWxzZX1gKS5cbiAgdmFyIG9iakluZGljYXRvciA9IG1hdGNoWzJdO1xuXG4gIC8vIGBwcm9wQ2hhaW5gIGlzIHRoZSBjaGFpbiBvZiBwcm9wZXJ0aWVzIG1hdGNoZWQgKGUuZy4gYHRoaXMudXNlci5lbWFpbGApLlxuICB2YXIgcHJvcENoYWluID0gbWF0Y2hbM107XG5cbiAgLy8gYHBvc3RmaXhgIGlzIHRoZSBgY29sb25PclBhcmVuYCB3aXRoIHdoaXRlc3BhY2UgYmVmb3JlIGl0LlxuICB2YXIgcG9zdGZpeCA9IG1hdGNoWzRdO1xuXG4gIC8vIGBjb2xvbk9yUGFyZW5gIG1hdGNoZXMgdGhlIGNvbG9uICg6KSBhZnRlciB0aGUgcHJvcGVydHkgKGlmIGl0IGlzIGFuIG9iamVjdClcbiAgLy8gb3IgcGFyZW50aGVzaXMgaWYgaXQgaXMgYSBmdW5jdGlvbi4gV2UgdXNlIGBjb2xvbk9yUGFyZW5gIGFuZCBgb2JqSW5kaWNhdG9yYFxuICAvLyB0byBrbm93IGlmIGl0IGlzIGFuIG9iamVjdC5cbiAgdmFyIGNvbG9uT3JQYXJlbiA9IG1hdGNoWzVdO1xuXG4gIG1hdGNoID0gbWF0Y2hbMF07XG5cbiAgdmFyIHNraXBwZWQgPSBleHByLnNsaWNlKGN1cnJlbnRJbmRleCwgcHJvcEV4cHIubGFzdEluZGV4IC0gbWF0Y2gubGVuZ3RoKTtcbiAgY3VycmVudEluZGV4ID0gcHJvcEV4cHIubGFzdEluZGV4O1xuXG4gIC8vIHNraXBzIG9iamVjdCBrZXlzIGUuZy4gdGVzdCBpbiBge3Rlc3Q6dHJ1ZX1gLlxuICBpZiAob2JqSW5kaWNhdG9yICYmIGNvbG9uT3JQYXJlbiA9PT0gJzonKSB7XG4gICAgcmV0dXJuIHNraXBwZWQgKyBtYXRjaDtcbiAgfVxuXG4gIHJldHVybiBza2lwcGVkICsgcGFyc2VDaGFpbihwcmVmaXgsIHByb3BDaGFpbiwgcG9zdGZpeCwgY29sb25PclBhcmVuLCBleHByKTtcbn1cblxuXG5mdW5jdGlvbiBzcGxpdExpbmtzKGNoYWluKSB7XG4gIHZhciBpbmRleCA9IDA7XG4gIHZhciBwYXJ0cyA9IFtdO1xuICB2YXIgbWF0Y2g7XG4gIHdoaWxlIChtYXRjaCA9IGNoYWluTGlua3MuZXhlYyhjaGFpbikpIHtcbiAgICBpZiAoY2hhaW5MaW5rcy5sYXN0SW5kZXggPT09IDEpIGNvbnRpbnVlO1xuICAgIHBhcnRzLnB1c2goY2hhaW4uc2xpY2UoaW5kZXgsIGNoYWluTGlua3MubGFzdEluZGV4IC0gMSkpO1xuICAgIGluZGV4ID0gY2hhaW5MaW5rcy5sYXN0SW5kZXggLSAxO1xuICB9XG4gIHBhcnRzLnB1c2goY2hhaW4uc2xpY2UoaW5kZXgpKTtcbiAgcmV0dXJuIHBhcnRzO1xufVxuXG5cbmZ1bmN0aW9uIGFkZFRoaXMoY2hhaW4pIHtcbiAgaWYgKGlnbm9yZS5pbmRleE9mKGNoYWluLnNwbGl0KGNoYWluTGluaykuc2hpZnQoKSkgPT09IC0xKSB7XG4gICAgcmV0dXJuICd0aGlzLicgKyBjaGFpbjtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gY2hhaW47XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBwYXJzZUNoYWluKHByZWZpeCwgcHJvcENoYWluLCBwb3N0Zml4LCBwYXJlbiwgZXhwcikge1xuICAvLyBjb250aW51YXRpb25zIGFmdGVyIGEgZnVuY3Rpb24gKGUuZy4gYGdldFVzZXIoMTIpLmZpcnN0TmFtZWApLlxuICBjb250aW51YXRpb24gPSBwcmVmaXggPT09ICcuJztcbiAgaWYgKGNvbnRpbnVhdGlvbikge1xuICAgIHByb3BDaGFpbiA9ICcuJyArIHByb3BDaGFpbjtcbiAgICBwcmVmaXggPSAnJztcbiAgfVxuXG4gIHZhciBsaW5rcyA9IHNwbGl0TGlua3MocHJvcENoYWluKTtcbiAgdmFyIG5ld0NoYWluID0gJyc7XG5cbiAgaWYgKGxpbmtzLmxlbmd0aCA9PT0gMSAmJiAhY29udGludWF0aW9uICYmICFwYXJlbikge1xuICAgIGxpbmsgPSBsaW5rc1swXTtcbiAgICBuZXdDaGFpbiA9IGFkZFRoaXMobGluayk7XG4gIH0gZWxzZSB7XG4gICAgaWYgKCFjb250aW51YXRpb24pIHtcbiAgICAgIG5ld0NoYWluID0gJygnO1xuICAgIH1cblxuICAgIGxpbmtzLmZvckVhY2goZnVuY3Rpb24obGluaywgaW5kZXgpIHtcbiAgICAgIGlmIChpbmRleCAhPT0gbGlua3MubGVuZ3RoIC0gMSkge1xuICAgICAgICBuZXdDaGFpbiArPSBwYXJzZVBhcnQobGluaywgaW5kZXgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCFwYXJlbnNbcGFyZW5dKSB7XG4gICAgICAgICAgbmV3Q2hhaW4gKz0gJ19yZWYnICsgY3VycmVudFJlZmVyZW5jZSArIGxpbmsgKyAnKSc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcG9zdGZpeCA9IHBvc3RmaXgucmVwbGFjZShwYXJlbiwgJycpO1xuICAgICAgICAgIG5ld0NoYWluICs9IHBhcnNlRnVuY3Rpb24obGluaywgaW5kZXgsIGV4cHIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gcHJlZml4ICsgbmV3Q2hhaW4gKyBwb3N0Zml4O1xufVxuXG5cbnZhciBwYXJlbnMgPSB7XG4gICcoJzogJyknLFxuICAnWyc6ICddJ1xufTtcblxuLy8gSGFuZGxlcyBhIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBpbiBpdHMgY29ycmVjdCBzY29wZVxuLy8gRmluZHMgdGhlIGVuZCBvZiB0aGUgZnVuY3Rpb24gYW5kIHByb2Nlc3NlcyB0aGUgYXJndW1lbnRzXG5mdW5jdGlvbiBwYXJzZUZ1bmN0aW9uKGxpbmssIGluZGV4LCBleHByKSB7XG4gIHZhciBjYWxsID0gZ2V0RnVuY3Rpb25DYWxsKGV4cHIpO1xuICBsaW5rICs9IGNhbGwuc2xpY2UoMCwgMSkgKyAnfn5pbnNpZGVQYXJlbnN+ficgKyBjYWxsLnNsaWNlKC0xKTtcbiAgdmFyIGluc2lkZVBhcmVucyA9IGNhbGwuc2xpY2UoMSwgLTEpO1xuXG4gIGlmIChleHByLmNoYXJBdChwcm9wRXhwci5sYXN0SW5kZXgpID09PSAnLicpIHtcbiAgICBsaW5rID0gcGFyc2VQYXJ0KGxpbmssIGluZGV4KVxuICB9IGVsc2UgaWYgKGluZGV4ID09PSAwKSB7XG4gICAgbGluayA9IHBhcnNlUGFydChsaW5rLCBpbmRleCk7XG4gICAgbGluayArPSAnX3JlZicgKyBjdXJyZW50UmVmZXJlbmNlICsgJyknO1xuICB9IGVsc2Uge1xuICAgIGxpbmsgPSAnX3JlZicgKyBjdXJyZW50UmVmZXJlbmNlICsgbGluayArICcpJztcbiAgfVxuXG4gIHZhciByZWYgPSBjdXJyZW50UmVmZXJlbmNlO1xuICBsaW5rID0gbGluay5yZXBsYWNlKCd+fmluc2lkZVBhcmVuc35+JywgcGFyc2VQcm9wZXJ0eUNoYWlucyhpbnNpZGVQYXJlbnMpKTtcbiAgY3VycmVudFJlZmVyZW5jZSA9IHJlZjtcbiAgcmV0dXJuIGxpbms7XG59XG5cblxuLy8gcmV0dXJucyB0aGUgY2FsbCBwYXJ0IG9mIGEgZnVuY3Rpb24gKGUuZy4gYHRlc3QoMTIzKWAgd291bGQgcmV0dXJuIGAoMTIzKWApXG5mdW5jdGlvbiBnZXRGdW5jdGlvbkNhbGwoZXhwcikge1xuICB2YXIgc3RhcnRJbmRleCA9IHByb3BFeHByLmxhc3RJbmRleDtcbiAgdmFyIG9wZW4gPSBleHByLmNoYXJBdChzdGFydEluZGV4IC0gMSk7XG4gIHZhciBjbG9zZSA9IHBhcmVuc1tvcGVuXTtcbiAgdmFyIGVuZEluZGV4ID0gc3RhcnRJbmRleCAtIDE7XG4gIHZhciBwYXJlbkNvdW50ID0gMTtcbiAgd2hpbGUgKGVuZEluZGV4KysgPCBleHByLmxlbmd0aCkge1xuICAgIHZhciBjaCA9IGV4cHIuY2hhckF0KGVuZEluZGV4KTtcbiAgICBpZiAoY2ggPT09IG9wZW4pIHBhcmVuQ291bnQrKztcbiAgICBlbHNlIGlmIChjaCA9PT0gY2xvc2UpIHBhcmVuQ291bnQtLTtcbiAgICBpZiAocGFyZW5Db3VudCA9PT0gMCkgYnJlYWs7XG4gIH1cbiAgY3VycmVudEluZGV4ID0gcHJvcEV4cHIubGFzdEluZGV4ID0gZW5kSW5kZXggKyAxO1xuICByZXR1cm4gb3BlbiArIGV4cHIuc2xpY2Uoc3RhcnRJbmRleCwgZW5kSW5kZXgpICsgY2xvc2U7XG59XG5cblxuXG5mdW5jdGlvbiBwYXJzZVBhcnQocGFydCwgaW5kZXgpIHtcbiAgLy8gaWYgdGhlIGZpcnN0XG4gIGlmIChpbmRleCA9PT0gMCAmJiAhY29udGludWF0aW9uKSB7XG4gICAgaWYgKGlnbm9yZS5pbmRleE9mKHBhcnQuc3BsaXQoL1xcLnxcXCh8XFxbLykuc2hpZnQoKSkgPT09IC0xKSB7XG4gICAgICBwYXJ0ID0gJ3RoaXMuJyArIHBhcnQ7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHBhcnQgPSAnX3JlZicgKyBjdXJyZW50UmVmZXJlbmNlICsgcGFydDtcbiAgfVxuXG4gIGN1cnJlbnRSZWZlcmVuY2UgPSArK3JlZmVyZW5jZUNvdW50O1xuICB2YXIgcmVmID0gJ19yZWYnICsgY3VycmVudFJlZmVyZW5jZTtcbiAgcmV0dXJuICcoJyArIHJlZiArICcgPSAnICsgcGFydCArICcpID09IG51bGwgPyB1bmRlZmluZWQgOiAnO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gcmVxdWlyZSgnLi9vYnNlcnZlcicpO1xuZXhwb3J0cy5leHByZXNzaW9uID0gcmVxdWlyZSgnLi9leHByZXNzaW9uJyk7XG5leHBvcnRzLmV4cHJlc3Npb24uZGlmZiA9IHJlcXVpcmUoJy4vZGlmZicpO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBPYnNlcnZlcjtcbnZhciBleHByZXNzaW9uID0gcmVxdWlyZSgnLi9leHByZXNzaW9uJyk7XG52YXIgZGlmZiA9IHJlcXVpcmUoJy4vZGlmZicpO1xudmFyIHJlcXVlc3RBbmltYXRpb25GcmFtZSA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgc2V0VGltZW91dDtcbnZhciBjYW5jZWxBbmltYXRpb25GcmFtZSA9IHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSB8fCBjbGVhclRpbWVvdXQ7XG5cbi8vICMgT2JzZXJ2ZXJcblxuLy8gRGVmaW5lcyBhbiBvYnNlcnZlciBjbGFzcyB3aGljaCByZXByZXNlbnRzIGFuIGV4cHJlc3Npb24uIFdoZW5ldmVyIHRoYXQgZXhwcmVzc2lvbiByZXR1cm5zIGEgbmV3IHZhbHVlIHRoZSBgY2FsbGJhY2tgXG4vLyBpcyBjYWxsZWQgd2l0aCB0aGUgdmFsdWUuXG4vL1xuLy8gSWYgdGhlIG9sZCBhbmQgbmV3IHZhbHVlcyB3ZXJlIGVpdGhlciBhbiBhcnJheSBvciBhbiBvYmplY3QsIHRoZSBgY2FsbGJhY2tgIGFsc29cbi8vIHJlY2VpdmVzIGFuIGFycmF5IG9mIHNwbGljZXMgKGZvciBhbiBhcnJheSksIG9yIGFuIGFycmF5IG9mIGNoYW5nZSBvYmplY3RzIChmb3IgYW4gb2JqZWN0KSB3aGljaCBhcmUgdGhlIHNhbWVcbi8vIGZvcm1hdCB0aGF0IGBBcnJheS5vYnNlcnZlYCBhbmQgYE9iamVjdC5vYnNlcnZlYCByZXR1cm4gPGh0dHA6Ly93aWtpLmVjbWFzY3JpcHQub3JnL2Rva3UucGhwP2lkPWhhcm1vbnk6b2JzZXJ2ZT4uXG5mdW5jdGlvbiBPYnNlcnZlcihleHByLCBjYWxsYmFjaywgY2FsbGJhY2tDb250ZXh0KSB7XG4gIGlmICh0eXBlb2YgZXhwciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHRoaXMuZ2V0dGVyID0gZXhwcjtcbiAgICB0aGlzLnNldHRlciA9IGV4cHI7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5nZXR0ZXIgPSBleHByZXNzaW9uLmdldChleHByKTtcbiAgfVxuICB0aGlzLmV4cHIgPSBleHByO1xuICB0aGlzLmNhbGxiYWNrID0gY2FsbGJhY2s7XG4gIHRoaXMuY2FsbGJhY2tDb250ZXh0ID0gY2FsbGJhY2tDb250ZXh0O1xuICB0aGlzLnNraXAgPSBmYWxzZTtcbiAgdGhpcy5mb3JjZVVwZGF0ZU5leHRTeW5jID0gZmFsc2U7XG4gIHRoaXMuY29udGV4dCA9IG51bGw7XG4gIHRoaXMub2xkVmFsdWUgPSB1bmRlZmluZWQ7XG59XG5cbk9ic2VydmVyLnByb3RvdHlwZSA9IHtcblxuICAvLyBCaW5kcyB0aGlzIGV4cHJlc3Npb24gdG8gYSBnaXZlbiBjb250ZXh0XG4gIGJpbmQ6IGZ1bmN0aW9uKGNvbnRleHQsIHNraXBVcGRhdGUpIHtcbiAgICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICAgIGlmICh0aGlzLmNhbGxiYWNrKSB7XG4gICAgICBPYnNlcnZlci5hZGQodGhpcywgc2tpcFVwZGF0ZSk7XG4gICAgfVxuICB9LFxuXG4gIC8vIFVuYmluZHMgdGhpcyBleHByZXNzaW9uXG4gIHVuYmluZDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5jb250ZXh0ID0gbnVsbDtcbiAgICBPYnNlcnZlci5yZW1vdmUodGhpcyk7XG4gICAgdGhpcy5zeW5jKCk7XG4gIH0sXG5cbiAgLy8gUmV0dXJucyB0aGUgY3VycmVudCB2YWx1ZSBvZiB0aGlzIG9ic2VydmVyXG4gIGdldDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuY29udGV4dCkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0dGVyLmNhbGwodGhpcy5jb250ZXh0LCBPYnNlcnZlci5mb3JtYXR0ZXJzKTtcbiAgICB9XG4gIH0sXG5cbiAgLy8gU2V0cyB0aGUgdmFsdWUgb2YgdGhpcyBleHByZXNzaW9uXG4gIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAoIXRoaXMuY29udGV4dCkgcmV0dXJuO1xuICAgIGlmICh0aGlzLnNldHRlciA9PT0gZmFsc2UpIHJldHVybjtcbiAgICBpZiAoIXRoaXMuc2V0dGVyKSB7XG4gICAgICB0aGlzLnNldHRlciA9IHR5cGVvZiB0aGlzLmV4cHIgPT09ICdzdHJpbmcnXG4gICAgICAgID8gZXhwcmVzc2lvbi5nZXRTZXR0ZXIodGhpcy5leHByLCB7IGlnbm9yZUVycm9yczogdHJ1ZSB9KSB8fCBmYWxzZVxuICAgICAgICA6IGZhbHNlO1xuICAgICAgaWYgKCF0aGlzLnNldHRlcikgcmV0dXJuO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICB2YXIgcmVzdWx0ID0gdGhpcy5zZXR0ZXIuY2FsbCh0aGlzLmNvbnRleHQuX29yaWdDb250ZXh0XyB8fCB0aGlzLmNvbnRleHQsIE9ic2VydmVyLmZvcm1hdHRlcnMsIHZhbHVlKTtcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLnN5bmMoKTtcbiAgICBPYnNlcnZlci5zeW5jKCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSxcblxuXG4gIC8vIEluc3RydWN0cyB0aGlzIG9ic2VydmVyIHRvIG5vdCBjYWxsIGl0cyBgY2FsbGJhY2tgIG9uIHRoZSBuZXh0IHN5bmMsIHdoZXRoZXIgdGhlIHZhbHVlIGhhcyBjaGFuZ2VkIG9yIG5vdFxuICBza2lwTmV4dFN5bmM6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2tpcCA9IHRydWU7XG4gIH0sXG5cblxuICAvLyBTeW5jcyB0aGlzIG9ic2VydmVyIG5vdywgY2FsbGluZyB0aGUgY2FsbGJhY2sgaW1tZWRpYXRlbHkgaWYgdGhlcmUgaGF2ZSBiZWVuIGNoYW5nZXNcbiAgc3luYzogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHZhbHVlID0gdGhpcy5nZXQoKTtcblxuICAgIC8vIERvbid0IGNhbGwgdGhlIGNhbGxiYWNrIGlmIGBza2lwTmV4dFN5bmNgIHdhcyBjYWxsZWQgb24gdGhlIG9ic2VydmVyXG4gICAgaWYgKHRoaXMuc2tpcCB8fCAhdGhpcy5jYWxsYmFjaykge1xuICAgICAgdGhpcy5za2lwID0gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElmIGFuIGFycmF5IGhhcyBjaGFuZ2VkIGNhbGN1bGF0ZSB0aGUgc3BsaWNlcyBhbmQgY2FsbCB0aGUgY2FsbGJhY2suIFRoaXNcbiAgICAgIHZhciBjaGFuZ2VkID0gZGlmZi52YWx1ZXModmFsdWUsIHRoaXMub2xkVmFsdWUpO1xuICAgICAgaWYgKCFjaGFuZ2VkICYmICF0aGlzLmZvcmNlVXBkYXRlTmV4dFN5bmMpIHJldHVybjtcbiAgICAgIHRoaXMuZm9yY2VVcGRhdGVOZXh0U3luYyA9IGZhbHNlO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoY2hhbmdlZCkpIHtcbiAgICAgICAgdGhpcy5jYWxsYmFjay5jYWxsKHRoaXMuY2FsbGJhY2tDb250ZXh0LCB2YWx1ZSwgdGhpcy5vbGRWYWx1ZSwgY2hhbmdlZClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuY2FsbGJhY2suY2FsbCh0aGlzLmNhbGxiYWNrQ29udGV4dCwgdmFsdWUsIHRoaXMub2xkVmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFN0b3JlIGFuIGltbXV0YWJsZSB2ZXJzaW9uIG9mIHRoZSB2YWx1ZSwgYWxsb3dpbmcgZm9yIGFycmF5cyBhbmQgb2JqZWN0cyB0byBjaGFuZ2UgaW5zdGFuY2UgYnV0IG5vdCBjb250ZW50IGFuZFxuICAgIC8vIHN0aWxsIHJlZnJhaW4gZnJvbSBkaXNwYXRjaGluZyBjYWxsYmFja3MgKGUuZy4gd2hlbiB1c2luZyBhbiBvYmplY3QgaW4gYmluZC1jbGFzcyBvciB3aGVuIHVzaW5nIGFycmF5IGZvcm1hdHRlcnNcbiAgICAvLyBpbiBiaW5kLWVhY2gpXG4gICAgdGhpcy5vbGRWYWx1ZSA9IGRpZmYuY2xvbmUodmFsdWUpO1xuICB9XG59O1xuXG5cbi8vIEFuIGFycmF5IG9mIGFsbCBvYnNlcnZlcnMsIGNvbnNpZGVyZWQgKnByaXZhdGUqXG5PYnNlcnZlci5vYnNlcnZlcnMgPSBbXTtcblxuLy8gQW4gYXJyYXkgb2YgY2FsbGJhY2tzIHRvIHJ1biBhZnRlciB0aGUgbmV4dCBzeW5jLCBjb25zaWRlcmVkICpwcml2YXRlKlxuT2JzZXJ2ZXIuY2FsbGJhY2tzID0gW107XG5PYnNlcnZlci5saXN0ZW5lcnMgPSBbXTtcblxuLy8gQWRkcyBhIG5ldyBvYnNlcnZlciB0byBiZSBzeW5jZWQgd2l0aCBjaGFuZ2VzLiBJZiBgc2tpcFVwZGF0ZWAgaXMgdHJ1ZSB0aGVuIHRoZSBjYWxsYmFjayB3aWxsIG9ubHkgYmUgY2FsbGVkIHdoZW4gYVxuLy8gY2hhbmdlIGlzIG1hZGUsIG5vdCBpbml0aWFsbHkuXG5PYnNlcnZlci5hZGQgPSBmdW5jdGlvbihvYnNlcnZlciwgc2tpcFVwZGF0ZSkge1xuICB0aGlzLm9ic2VydmVycy5wdXNoKG9ic2VydmVyKTtcbiAgaWYgKCFza2lwVXBkYXRlKSBvYnNlcnZlci5zeW5jKCk7XG59O1xuXG4vLyBSZW1vdmVzIGFuIG9ic2VydmVyLCBzdG9wcGluZyBpdCBmcm9tIGJlaW5nIHJ1blxuT2JzZXJ2ZXIucmVtb3ZlID0gZnVuY3Rpb24ob2JzZXJ2ZXIpIHtcbiAgdmFyIGluZGV4ID0gdGhpcy5vYnNlcnZlcnMuaW5kZXhPZihvYnNlcnZlcik7XG4gIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICB0aGlzLm9ic2VydmVycy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufTtcblxuLy8gKnByaXZhdGUqIHByb3BlcnRpZXMgdXNlZCBpbiB0aGUgc3luYyBjeWNsZVxuT2JzZXJ2ZXIuc3luY2luZyA9IGZhbHNlO1xuT2JzZXJ2ZXIucmVydW4gPSBmYWxzZTtcbk9ic2VydmVyLmN5Y2xlcyA9IDA7XG5PYnNlcnZlci5tYXggPSAxMDtcbk9ic2VydmVyLnRpbWVvdXQgPSBudWxsO1xuT2JzZXJ2ZXIuc3luY1BlbmRpbmcgPSBudWxsO1xuXG4vLyBTY2hlZHVsZXMgYW4gb2JzZXJ2ZXIgc3luYyBjeWNsZSB3aGljaCBjaGVja3MgYWxsIHRoZSBvYnNlcnZlcnMgdG8gc2VlIGlmIHRoZXkndmUgY2hhbmdlZC5cbk9ic2VydmVyLnN5bmMgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICBpZiAoT2JzZXJ2ZXIuc3luY1BlbmRpbmcpIHJldHVybiBmYWxzZTtcbiAgT2JzZXJ2ZXIuc3luY1BlbmRpbmcgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZnVuY3Rpb24oKSB7XG4gICAgT2JzZXJ2ZXIuc3luY05vdyhjYWxsYmFjayk7XG4gIH0pO1xuICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8vIFJ1bnMgdGhlIG9ic2VydmVyIHN5bmMgY3ljbGUgd2hpY2ggY2hlY2tzIGFsbCB0aGUgb2JzZXJ2ZXJzIHRvIHNlZSBpZiB0aGV5J3ZlIGNoYW5nZWQuXG5PYnNlcnZlci5zeW5jTm93ID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIE9ic2VydmVyLmFmdGVyU3luYyhjYWxsYmFjayk7XG4gIH1cblxuICBjYW5jZWxBbmltYXRpb25GcmFtZShPYnNlcnZlci5zeW5jUGVuZGluZyk7XG4gIE9ic2VydmVyLnN5bmNQZW5kaW5nID0gbnVsbDtcblxuICBpZiAoT2JzZXJ2ZXIuc3luY2luZykge1xuICAgIE9ic2VydmVyLnJlcnVuID0gdHJ1ZTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBPYnNlcnZlci5zeW5jaW5nID0gdHJ1ZTtcbiAgT2JzZXJ2ZXIucmVydW4gPSB0cnVlO1xuICBPYnNlcnZlci5jeWNsZXMgPSAwO1xuXG4gIC8vIEFsbG93IGNhbGxiYWNrcyB0byBydW4gdGhlIHN5bmMgY3ljbGUgYWdhaW4gaW1tZWRpYXRlbHksIGJ1dCBzdG9wIGF0IGBPYnNlcnZlci5tYXhgIChkZWZhdWx0IDEwKSBjeWNsZXMgdG8gd2UgZG9uJ3RcbiAgLy8gcnVuIGluZmluaXRlIGxvb3BzXG4gIHdoaWxlIChPYnNlcnZlci5yZXJ1bikge1xuICAgIGlmICgrK09ic2VydmVyLmN5Y2xlcyA9PT0gT2JzZXJ2ZXIubWF4KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0luZmluaXRlIG9ic2VydmVyIHN5bmNpbmcsIGFuIG9ic2VydmVyIGlzIGNhbGxpbmcgT2JzZXJ2ZXIuc3luYygpIHRvbyBtYW55IHRpbWVzJyk7XG4gICAgfVxuICAgIE9ic2VydmVyLnJlcnVuID0gZmFsc2U7XG4gICAgLy8gdGhlIG9ic2VydmVyIGFycmF5IG1heSBpbmNyZWFzZSBvciBkZWNyZWFzZSBpbiBzaXplIChyZW1haW5pbmcgb2JzZXJ2ZXJzKSBkdXJpbmcgdGhlIHN5bmNcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IE9ic2VydmVyLm9ic2VydmVycy5sZW5ndGg7IGkrKykge1xuICAgICAgT2JzZXJ2ZXIub2JzZXJ2ZXJzW2ldLnN5bmMoKTtcbiAgICB9XG4gIH1cblxuICB3aGlsZSAoT2JzZXJ2ZXIuY2FsbGJhY2tzLmxlbmd0aCkge1xuICAgIE9ic2VydmVyLmNhbGxiYWNrcy5zaGlmdCgpKCk7XG4gIH1cblxuICBmb3IgKHZhciBpID0gMCwgbCA9IE9ic2VydmVyLmxpc3RlbmVycy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICB2YXIgbGlzdGVuZXIgPSBPYnNlcnZlci5saXN0ZW5lcnNbaV07XG4gICAgbGlzdGVuZXIoKTtcbiAgfVxuXG4gIE9ic2VydmVyLnN5bmNpbmcgPSBmYWxzZTtcbiAgT2JzZXJ2ZXIuY3ljbGVzID0gMDtcbiAgcmV0dXJuIHRydWU7XG59O1xuXG4vLyBBZnRlciB0aGUgbmV4dCBzeW5jIChvciB0aGUgY3VycmVudCBpZiBpbiB0aGUgbWlkZGxlIG9mIG9uZSksIHJ1biB0aGUgcHJvdmlkZWQgY2FsbGJhY2tcbk9ic2VydmVyLmFmdGVyU3luYyA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gIGlmICh0eXBlb2YgY2FsbGJhY2sgIT09ICdmdW5jdGlvbicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgfVxuICBPYnNlcnZlci5jYWxsYmFja3MucHVzaChjYWxsYmFjayk7XG59O1xuXG5PYnNlcnZlci5vblN5bmMgPSBmdW5jdGlvbihsaXN0ZW5lcikge1xuICBpZiAodHlwZW9mIGxpc3RlbmVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gIH1cbiAgT2JzZXJ2ZXIubGlzdGVuZXJzLnB1c2gobGlzdGVuZXIpO1xufTtcblxuT2JzZXJ2ZXIucmVtb3ZlT25TeW5jID0gZnVuY3Rpb24obGlzdGVuZXIpIHtcbiAgaWYgKHR5cGVvZiBsaXN0ZW5lciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICB9XG4gIHZhciBpbmRleCA9IE9ic2VydmVyLmxpc3RlbmVycy5pbmRleE9mKGxpc3RlbmVyKTtcbiAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgIE9ic2VydmVyLmxpc3RlbmVycy5zcGxpY2UoaW5kZXgsIDEpLnBvcCgpO1xuICB9XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSByZWdpc3RlckRlZmF1bHRzO1xuXG4vKipcbiAqICMgRGVmYXVsdCBCaW5kZXJzXG4gKiBSZWdpc3RlcnMgZGVmYXVsdCBiaW5kZXJzIHdpdGggYSBmcmFnbWVudHMgb2JqZWN0LlxuICovXG5mdW5jdGlvbiByZWdpc3RlckRlZmF1bHRzKGZyYWdtZW50cykge1xuXG4gIC8qKlxuICAgKiBGYWRlIGluIGFuZCBvdXRcbiAgICovXG4gIGZyYWdtZW50cy5yZWdpc3RlckFuaW1hdGlvbignZmFkZScsIHtcbiAgICBvcHRpb25zOiB7XG4gICAgICBkdXJhdGlvbjogMzAwLFxuICAgICAgZWFzaW5nOiAnZWFzZS1pbi1vdXQnXG4gICAgfSxcbiAgICBhbmltYXRlSW46IGZ1bmN0aW9uKGVsZW1lbnQsIGRvbmUpIHtcbiAgICAgIGVsZW1lbnQuYW5pbWF0ZShbXG4gICAgICAgIHsgb3BhY2l0eTogJzAnIH0sXG4gICAgICAgIHsgb3BhY2l0eTogJzEnIH1cbiAgICAgIF0sIHRoaXMub3B0aW9ucykub25maW5pc2ggPSBkb25lO1xuICAgIH0sXG4gICAgYW5pbWF0ZU91dDogZnVuY3Rpb24oZWxlbWVudCwgZG9uZSkge1xuICAgICAgZWxlbWVudC5hbmltYXRlKFtcbiAgICAgICAgeyBvcGFjaXR5OiAnMScgfSxcbiAgICAgICAgeyBvcGFjaXR5OiAnMCcgfVxuICAgICAgXSwgdGhpcy5vcHRpb25zKS5vbmZpbmlzaCA9IGRvbmU7XG4gICAgfVxuICB9KTtcblxuICB2YXIgc2xpZGVzID0ge1xuICAgIHNsaWRlOiAnaGVpZ2h0JyxcbiAgICBzbGlkZXY6ICdoZWlnaHQnLFxuICAgIHNsaWRlaDogJ3dpZHRoJ1xuICB9O1xuXG4gIHZhciBhbmltYXRpbmcgPSBuZXcgTWFwKCk7XG5cbiAgZnVuY3Rpb24gb2JqKGtleSwgdmFsdWUpIHtcbiAgICB2YXIgb2JqID0ge307XG4gICAgb2JqW2tleV0gPSB2YWx1ZTtcbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgLyoqXG4gICAqIFNsaWRlIGRvd24gYW5kIHVwLCBsZWZ0IGFuZCByaWdodFxuICAgKi9cbiAgT2JqZWN0LmtleXMoc2xpZGVzKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgcHJvcGVydHkgPSBzbGlkZXNbbmFtZV07XG5cbiAgICBmcmFnbWVudHMucmVnaXN0ZXJBbmltYXRpb24obmFtZSwge1xuICAgICAgb3B0aW9uczoge1xuICAgICAgICBkdXJhdGlvbjogMzAwLFxuICAgICAgICBlYXNpbmc6ICdlYXNlLWluLW91dCdcbiAgICAgIH0sXG4gICAgICBhbmltYXRlSW46IGZ1bmN0aW9uKGVsZW1lbnQsIGRvbmUpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gZWxlbWVudC5nZXRDb21wdXRlZENTUyhwcm9wZXJ0eSk7XG4gICAgICAgIGlmICghdmFsdWUgfHwgdmFsdWUgPT09ICcwcHgnKSB7XG4gICAgICAgICAgcmV0dXJuIGRvbmUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGVsZW1lbnQuc3R5bGUub3ZlcmZsb3cgPSAnaGlkZGVuJztcbiAgICAgICAgZWxlbWVudC5hbmltYXRlKFtcbiAgICAgICAgICBvYmoocHJvcGVydHksICcwcHgnKSxcbiAgICAgICAgICBvYmoocHJvcGVydHksIHZhbHVlKVxuICAgICAgICBdLCB0aGlzLm9wdGlvbnMpLm9uZmluaXNoID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgZWxlbWVudC5zdHlsZS5vdmVyZmxvdyA9ICcnO1xuICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgfTtcbiAgICAgIH0sXG4gICAgICBhbmltYXRlT3V0OiBmdW5jdGlvbihlbGVtZW50LCBkb25lKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGVsZW1lbnQuZ2V0Q29tcHV0ZWRDU1MocHJvcGVydHkpO1xuICAgICAgICBpZiAoIXZhbHVlIHx8IHZhbHVlID09PSAnMHB4Jykge1xuICAgICAgICAgIHJldHVybiBkb25lKCk7XG4gICAgICAgIH1cblxuICAgICAgICBlbGVtZW50LnN0eWxlLm92ZXJmbG93ID0gJ2hpZGRlbic7XG4gICAgICAgIGVsZW1lbnQuYW5pbWF0ZShbXG4gICAgICAgICAgb2JqKHByb3BlcnR5LCB2YWx1ZSksXG4gICAgICAgICAgb2JqKHByb3BlcnR5LCAnMHB4JylcbiAgICAgICAgXSwgdGhpcy5vcHRpb25zKS5vbmZpbmlzaCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGVsZW1lbnQuc3R5bGUub3ZlcmZsb3cgPSAnJztcbiAgICAgICAgICBkb25lKCk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSk7XG5cblxuICAgIC8qKlxuICAgICAqIE1vdmUgaXRlbXMgdXAgYW5kIGRvd24gaW4gYSBsaXN0LCBzbGlkZSBkb3duIGFuZCB1cFxuICAgICAqL1xuICAgIGZyYWdtZW50cy5yZWdpc3RlckFuaW1hdGlvbihuYW1lICsgJy1tb3ZlJywge1xuICAgICAgb3B0aW9uczoge1xuICAgICAgICBkdXJhdGlvbjogMzAwLFxuICAgICAgICBlYXNpbmc6ICdlYXNlLWluLW91dCdcbiAgICAgIH0sXG5cbiAgICAgIGFuaW1hdGVJbjogZnVuY3Rpb24oZWxlbWVudCwgZG9uZSkge1xuICAgICAgICB2YXIgdmFsdWUgPSBlbGVtZW50LmdldENvbXB1dGVkQ1NTKHByb3BlcnR5KTtcbiAgICAgICAgaWYgKCF2YWx1ZSB8fCB2YWx1ZSA9PT0gJzBweCcpIHtcbiAgICAgICAgICByZXR1cm4gZG9uZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGl0ZW0gPSBlbGVtZW50LnZpZXcgJiYgZWxlbWVudC52aWV3Ll9yZXBlYXRJdGVtXztcbiAgICAgICAgaWYgKGl0ZW0pIHtcbiAgICAgICAgICBhbmltYXRpbmcuc2V0KGl0ZW0sIGVsZW1lbnQpO1xuICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBhbmltYXRpbmcuZGVsZXRlKGl0ZW0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRG8gdGhlIHNsaWRlXG4gICAgICAgIGVsZW1lbnQuc3R5bGUub3ZlcmZsb3cgPSAnaGlkZGVuJztcbiAgICAgICAgZWxlbWVudC5hbmltYXRlKFtcbiAgICAgICAgICBvYmoocHJvcGVydHksICcwcHgnKSxcbiAgICAgICAgICBvYmoocHJvcGVydHksIHZhbHVlKVxuICAgICAgICBdLCB0aGlzLm9wdGlvbnMpLm9uZmluaXNoID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgZWxlbWVudC5zdHlsZS5vdmVyZmxvdyA9ICcnO1xuICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgfTtcbiAgICAgIH0sXG5cbiAgICAgIGFuaW1hdGVPdXQ6IGZ1bmN0aW9uKGVsZW1lbnQsIGRvbmUpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gZWxlbWVudC5nZXRDb21wdXRlZENTUyhwcm9wZXJ0eSk7XG4gICAgICAgIGlmICghdmFsdWUgfHwgdmFsdWUgPT09ICcwcHgnKSB7XG4gICAgICAgICAgcmV0dXJuIGRvbmUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBpdGVtID0gZWxlbWVudC52aWV3ICYmIGVsZW1lbnQudmlldy5fcmVwZWF0SXRlbV87XG4gICAgICAgIGlmIChpdGVtKSB7XG4gICAgICAgICAgdmFyIG5ld0VsZW1lbnQgPSBhbmltYXRpbmcuZ2V0KGl0ZW0pO1xuICAgICAgICAgIGlmIChuZXdFbGVtZW50ICYmIG5ld0VsZW1lbnQucGFyZW50Tm9kZSA9PT0gZWxlbWVudC5wYXJlbnROb2RlKSB7XG4gICAgICAgICAgICAvLyBUaGlzIGl0ZW0gaXMgYmVpbmcgcmVtb3ZlZCBpbiBvbmUgcGxhY2UgYW5kIGFkZGVkIGludG8gYW5vdGhlci4gTWFrZSBpdCBsb29rIGxpa2UgaXRzIG1vdmluZyBieSBtYWtpbmcgYm90aFxuICAgICAgICAgICAgLy8gZWxlbWVudHMgbm90IHZpc2libGUgYW5kIGhhdmluZyBhIGNsb25lIG1vdmUgYWJvdmUgdGhlIGl0ZW1zIHRvIHRoZSBuZXcgbG9jYXRpb24uXG4gICAgICAgICAgICBlbGVtZW50ID0gdGhpcy5hbmltYXRlTW92ZShlbGVtZW50LCBuZXdFbGVtZW50KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEbyB0aGUgc2xpZGVcbiAgICAgICAgZWxlbWVudC5zdHlsZS5vdmVyZmxvdyA9ICdoaWRkZW4nO1xuICAgICAgICBlbGVtZW50LmFuaW1hdGUoW1xuICAgICAgICAgIG9iaihwcm9wZXJ0eSwgdmFsdWUpLFxuICAgICAgICAgIG9iaihwcm9wZXJ0eSwgJzBweCcpXG4gICAgICAgIF0sIHRoaXMub3B0aW9ucykub25maW5pc2ggPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBlbGVtZW50LnN0eWxlLm92ZXJmbG93ID0gJyc7XG4gICAgICAgICAgZG9uZSgpO1xuICAgICAgICB9O1xuICAgICAgfSxcblxuICAgICAgYW5pbWF0ZU1vdmU6IGZ1bmN0aW9uKG9sZEVsZW1lbnQsIG5ld0VsZW1lbnQpIHtcbiAgICAgICAgdmFyIHBsYWNlaG9sZGVyRWxlbWVudDtcbiAgICAgICAgdmFyIHBhcmVudCA9IG5ld0VsZW1lbnQucGFyZW50Tm9kZTtcbiAgICAgICAgaWYgKCFwYXJlbnQuX19zbGlkZU1vdmVIYW5kbGVkKSB7XG4gICAgICAgICAgcGFyZW50Ll9fc2xpZGVNb3ZlSGFuZGxlZCA9IHRydWU7XG4gICAgICAgICAgaWYgKHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHBhcmVudCkucG9zaXRpb24gPT09ICdzdGF0aWMnKSB7XG4gICAgICAgICAgICBwYXJlbnQuc3R5bGUucG9zaXRpb24gPSAncmVsYXRpdmUnO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBvcmlnU3R5bGUgPSBvbGRFbGVtZW50LmdldEF0dHJpYnV0ZSgnc3R5bGUnKTtcbiAgICAgICAgdmFyIHN0eWxlID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUob2xkRWxlbWVudCk7XG4gICAgICAgIHZhciBtYXJnaW5PZmZzZXRMZWZ0ID0gLXBhcnNlSW50KHN0eWxlLm1hcmdpbkxlZnQpO1xuICAgICAgICB2YXIgbWFyZ2luT2Zmc2V0VG9wID0gLXBhcnNlSW50KHN0eWxlLm1hcmdpblRvcCk7XG4gICAgICAgIHZhciBvbGRMZWZ0ID0gb2xkRWxlbWVudC5vZmZzZXRMZWZ0O1xuICAgICAgICB2YXIgb2xkVG9wID0gb2xkRWxlbWVudC5vZmZzZXRUb3A7XG5cbiAgICAgICAgcGxhY2Vob2xkZXJFbGVtZW50ID0gZnJhZ21lbnRzLm1ha2VFbGVtZW50QW5pbWF0YWJsZShvbGRFbGVtZW50LmNsb25lTm9kZSh0cnVlKSk7XG4gICAgICAgIHBsYWNlaG9sZGVyRWxlbWVudC5zdHlsZS53aWR0aCA9IG9sZEVsZW1lbnQuc3R5bGUud2lkdGggPSBzdHlsZS53aWR0aDtcbiAgICAgICAgcGxhY2Vob2xkZXJFbGVtZW50LnN0eWxlLmhlaWdodCA9IG9sZEVsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gc3R5bGUuaGVpZ2h0O1xuICAgICAgICBwbGFjZWhvbGRlckVsZW1lbnQuc3R5bGUub3BhY2l0eSA9ICcwJztcblxuICAgICAgICBvbGRFbGVtZW50LnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcbiAgICAgICAgb2xkRWxlbWVudC5zdHlsZS56SW5kZXggPSAxMDAwO1xuICAgICAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKHBsYWNlaG9sZGVyRWxlbWVudCwgb2xkRWxlbWVudCk7XG4gICAgICAgIG5ld0VsZW1lbnQuc3R5bGUub3BhY2l0eSA9ICcwJztcblxuICAgICAgICBvbGRFbGVtZW50LmFuaW1hdGUoW1xuICAgICAgICAgIHsgdG9wOiBvbGRUb3AgKyBtYXJnaW5PZmZzZXRUb3AgKyAncHgnLCBsZWZ0OiBvbGRMZWZ0ICsgbWFyZ2luT2Zmc2V0TGVmdCArICdweCcgfSxcbiAgICAgICAgICB7IHRvcDogbmV3RWxlbWVudC5vZmZzZXRUb3AgKyBtYXJnaW5PZmZzZXRUb3AgKyAncHgnLCBsZWZ0OiBuZXdFbGVtZW50Lm9mZnNldExlZnQgKyBtYXJnaW5PZmZzZXRMZWZ0ICsgJ3B4JyB9XG4gICAgICAgIF0sIHRoaXMub3B0aW9ucykub25maW5pc2ggPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBwbGFjZWhvbGRlckVsZW1lbnQucmVtb3ZlKCk7XG4gICAgICAgICAgb3JpZ1N0eWxlID8gb2xkRWxlbWVudC5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgb3JpZ1N0eWxlKSA6IG9sZEVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKCdzdHlsZScpO1xuICAgICAgICAgIG5ld0VsZW1lbnQuc3R5bGUub3BhY2l0eSA9ICcnO1xuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBwbGFjZWhvbGRlckVsZW1lbnQ7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgfSk7XG5cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gcmVnaXN0ZXJEZWZhdWx0cztcbnZhciBkaWZmID0gcmVxdWlyZSgnLi4vb2JzZXJ2ZXIvZGlmZicpO1xuXG4vKipcbiAqICMgRGVmYXVsdCBCaW5kZXJzXG4gKiBSZWdpc3RlcnMgZGVmYXVsdCBiaW5kZXJzIHdpdGggYSBmcmFnbWVudHMgb2JqZWN0LlxuICovXG5mdW5jdGlvbiByZWdpc3RlckRlZmF1bHRzKGZyYWdtZW50cykge1xuXG4gIC8qKlxuICAgKiBQcmludHMgb3V0IHRoZSB2YWx1ZSBvZiB0aGUgZXhwcmVzc2lvbiB0byB0aGUgY29uc29sZS5cbiAgICovXG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnZGVidWcnLCB7XG4gICAgcHJpb3JpdHk6IDYwLFxuICAgIHVwZGF0ZWQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBjb25zb2xlLmluZm8oJ0RlYnVnOicsIHRoaXMuZXhwcmVzc2lvbiwgJz0nLCB2YWx1ZSk7XG4gICAgfVxuICB9KTtcblxuXG4gIC8qKlxuICAgKiAjIyB0ZXh0XG4gICAqIEFkZHMgYSBiaW5kZXIgdG8gZGlzcGxheSBlc2NhcGVkIHRleHQgaW5zaWRlIGFuIGVsZW1lbnQuIFRoaXMgY2FuIGJlIGRvbmUgd2l0aCBiaW5kaW5nIGRpcmVjdGx5IGluIHRleHQgbm9kZXMgYnV0XG4gICAqIHVzaW5nIHRoZSBhdHRyaWJ1dGUgYmluZGVyIHByZXZlbnRzIGEgZmxhc2ggb2YgdW5zdHlsZWQgY29udGVudCBvbiB0aGUgbWFpbiBwYWdlLlxuICAgKlxuICAgKiAqKkV4YW1wbGU6KipcbiAgICogYGBgaHRtbFxuICAgKiA8aDEgdGV4dD1cInt7cG9zdC50aXRsZX19XCI+VW50aXRsZWQ8L2gxPlxuICAgKiA8ZGl2IGh0bWw9XCJ7e3Bvc3QuYm9keSB8IG1hcmtkb3dufX1cIj48L2Rpdj5cbiAgICogYGBgXG4gICAqICpSZXN1bHQ6KlxuICAgKiBgYGBodG1sXG4gICAqIDxoMT5MaXR0bGUgUmVkPC9oMT5cbiAgICogPGRpdj5cbiAgICogICA8cD5MaXR0bGUgUmVkIFJpZGluZyBIb29kIGlzIGEgc3RvcnkgYWJvdXQgYSBsaXR0bGUgZ2lybC48L3A+XG4gICAqICAgPHA+XG4gICAqICAgICBNb3JlIGluZm8gY2FuIGJlIGZvdW5kIG9uXG4gICAqICAgICA8YSBocmVmPVwiaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9MaXR0bGVfUmVkX1JpZGluZ19Ib29kXCI+V2lraXBlZGlhPC9hPlxuICAgKiAgIDwvcD5cbiAgICogPC9kaXY+XG4gICAqIGBgYFxuICAgKi9cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCd0ZXh0JywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICB0aGlzLmVsZW1lbnQudGV4dENvbnRlbnQgPSAodmFsdWUgPT0gbnVsbCA/ICcnIDogdmFsdWUpO1xuICB9KTtcblxuXG4gIC8qKlxuICAgKiAjIyBodG1sXG4gICAqIEFkZHMgYSBiaW5kZXIgdG8gZGlzcGxheSB1bmVzY2FwZWQgSFRNTCBpbnNpZGUgYW4gZWxlbWVudC4gQmUgc3VyZSBpdCdzIHRydXN0ZWQhIFRoaXMgc2hvdWxkIGJlIHVzZWQgd2l0aCBmaWx0ZXJzXG4gICAqIHdoaWNoIGNyZWF0ZSBIVE1MIGZyb20gc29tZXRoaW5nIHNhZmUuXG4gICAqXG4gICAqICoqRXhhbXBsZToqKlxuICAgKiBgYGBodG1sXG4gICAqIDxoMT57e3Bvc3QudGl0bGV9fTwvaDE+XG4gICAqIDxkaXYgaHRtbD1cInt7cG9zdC5ib2R5IHwgbWFya2Rvd259fVwiPjwvZGl2PlxuICAgKiBgYGBcbiAgICogKlJlc3VsdDoqXG4gICAqIGBgYGh0bWxcbiAgICogPGgxPkxpdHRsZSBSZWQ8L2gxPlxuICAgKiA8ZGl2PlxuICAgKiAgIDxwPkxpdHRsZSBSZWQgUmlkaW5nIEhvb2QgaXMgYSBzdG9yeSBhYm91dCBhIGxpdHRsZSBnaXJsLjwvcD5cbiAgICogICA8cD5cbiAgICogICAgIE1vcmUgaW5mbyBjYW4gYmUgZm91bmQgb25cbiAgICogICAgIDxhIGhyZWY9XCJodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0xpdHRsZV9SZWRfUmlkaW5nX0hvb2RcIj5XaWtpcGVkaWE8L2E+XG4gICAqICAgPC9wPlxuICAgKiA8L2Rpdj5cbiAgICogYGBgXG4gICAqL1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ2h0bWwnLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHRoaXMuZWxlbWVudC5pbm5lckhUTUwgPSAodmFsdWUgPT0gbnVsbCA/ICcnIDogdmFsdWUpO1xuICB9KTtcblxuXG5cbiAgLyoqXG4gICAqICMjIGNsYXNzLVtjbGFzc05hbWVdXG4gICAqIEFkZHMgYSBiaW5kZXIgdG8gYWRkIGNsYXNzZXMgdG8gYW4gZWxlbWVudCBkZXBlbmRlbnQgb24gd2hldGhlciB0aGUgZXhwcmVzc2lvbiBpcyB0cnVlIG9yIGZhbHNlLlxuICAgKlxuICAgKiAqKkV4YW1wbGU6KipcbiAgICogYGBgaHRtbFxuICAgKiA8ZGl2IGNsYXNzPVwidXNlci1pdGVtXCIgY2xhc3Mtc2VsZWN0ZWQtdXNlcj1cInt7c2VsZWN0ZWQgPT09IHVzZXJ9fVwiPlxuICAgKiAgIDxidXR0b24gY2xhc3M9XCJidG4gcHJpbWFyeVwiIGNsYXNzLWhpZ2hsaWdodD1cInt7cmVhZHl9fVwiPjwvYnV0dG9uPlxuICAgKiA8L2Rpdj5cbiAgICogYGBgXG4gICAqICpSZXN1bHQgaWYgYHNlbGVjdGVkYCBlcXVhbHMgdGhlIGB1c2VyYCBhbmQgYHJlYWR5YCBpcyBgdHJ1ZWA6KlxuICAgKiBgYGBodG1sXG4gICAqIDxkaXYgY2xhc3M9XCJ1c2VyLWl0ZW0gc2VsZWN0ZWQtdXNlclwiPlxuICAgKiAgIDxidXR0b24gY2xhc3M9XCJidG4gcHJpbWFyeSBoaWdobGlnaHRcIj48L2J1dHRvbj5cbiAgICogPC9kaXY+XG4gICAqIGBgYFxuICAgKi9cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdjbGFzcy0qJywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAodmFsdWUpIHtcbiAgICAgIHRoaXMuZWxlbWVudC5jbGFzc0xpc3QuYWRkKHRoaXMubWF0Y2gpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZSh0aGlzLm1hdGNoKTtcbiAgICB9XG4gIH0pO1xuXG5cblxuICAvKipcbiAgICogIyMgdmFsdWVcbiAgICogQWRkcyBhIGJpbmRlciB3aGljaCBzZXRzIHRoZSB2YWx1ZSBvZiBhbiBIVE1MIGZvcm0gZWxlbWVudC4gVGhpcyBiaW5kZXIgYWxzbyB1cGRhdGVzIHRoZSBkYXRhIGFzIGl0IGlzIGNoYW5nZWQgaW5cbiAgICogdGhlIGZvcm0gZWxlbWVudCwgcHJvdmlkaW5nIHR3byB3YXkgYmluZGluZy5cbiAgICpcbiAgICogKipFeGFtcGxlOioqXG4gICAqIGBgYGh0bWxcbiAgICogPGxhYmVsPkZpcnN0IE5hbWU8L2xhYmVsPlxuICAgKiA8aW5wdXQgdHlwZT1cInRleHRcIiBuYW1lPVwiZmlyc3ROYW1lXCIgdmFsdWU9XCJ1c2VyLmZpcnN0TmFtZVwiPlxuICAgKlxuICAgKiA8bGFiZWw+TGFzdCBOYW1lPC9sYWJlbD5cbiAgICogPGlucHV0IHR5cGU9XCJ0ZXh0XCIgbmFtZT1cImxhc3ROYW1lXCIgdmFsdWU9XCJ1c2VyLmxhc3ROYW1lXCI+XG4gICAqIGBgYFxuICAgKiAqUmVzdWx0OipcbiAgICogYGBgaHRtbFxuICAgKiA8bGFiZWw+Rmlyc3QgTmFtZTwvbGFiZWw+XG4gICAqIDxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCJmaXJzdE5hbWVcIiB2YWx1ZT1cIkphY29iXCI+XG4gICAqXG4gICAqIDxsYWJlbD5MYXN0IE5hbWU8L2xhYmVsPlxuICAgKiA8aW5wdXQgdHlwZT1cInRleHRcIiBuYW1lPVwibGFzdE5hbWVcIiB2YWx1ZT1cIldyaWdodFwiPlxuICAgKiBgYGBcbiAgICogQW5kIHdoZW4gdGhlIHVzZXIgY2hhbmdlcyB0aGUgdGV4dCBpbiB0aGUgZmlyc3QgaW5wdXQgdG8gXCJKYWNcIiwgYHVzZXIuZmlyc3ROYW1lYCB3aWxsIGJlIHVwZGF0ZWQgaW1tZWRpYXRlbHkgd2l0aFxuICAgKiB0aGUgdmFsdWUgb2YgYCdKYWMnYC5cbiAgICovXG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgndmFsdWUnLCB7XG4gICAgb25seVdoZW5Cb3VuZDogdHJ1ZSxcbiAgICBldmVudHNBdHRyTmFtZTogJ3ZhbHVlLWV2ZW50cycsXG4gICAgZmllbGRBdHRyTmFtZTogJ3ZhbHVlLWZpZWxkJyxcbiAgICBkZWZhdWx0RXZlbnRzOiBbICdjaGFuZ2UnIF0sXG5cbiAgICBjb21waWxlZDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbmFtZSA9IHRoaXMuZWxlbWVudC50YWdOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICB2YXIgdHlwZSA9IHRoaXMuZWxlbWVudC50eXBlO1xuICAgICAgdGhpcy5tZXRob2RzID0gaW5wdXRNZXRob2RzW3R5cGVdIHx8IGlucHV0TWV0aG9kc1tuYW1lXTtcblxuICAgICAgaWYgKCF0aGlzLm1ldGhvZHMpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5lbGVtZW50Lmhhc0F0dHJpYnV0ZSh0aGlzLmV2ZW50c0F0dHJOYW1lKSkge1xuICAgICAgICB0aGlzLmV2ZW50cyA9IHRoaXMuZWxlbWVudC5nZXRBdHRyaWJ1dGUodGhpcy5ldmVudHNBdHRyTmFtZSkuc3BsaXQoJyAnKTtcbiAgICAgICAgdGhpcy5lbGVtZW50LnJlbW92ZUF0dHJpYnV0ZSh0aGlzLmV2ZW50c0F0dHJOYW1lKTtcbiAgICAgIH0gZWxzZSBpZiAobmFtZSAhPT0gJ29wdGlvbicpIHtcbiAgICAgICAgdGhpcy5ldmVudHMgPSB0aGlzLmRlZmF1bHRFdmVudHM7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLmVsZW1lbnQuaGFzQXR0cmlidXRlKHRoaXMuZmllbGRBdHRyTmFtZSkpIHtcbiAgICAgICAgdGhpcy52YWx1ZUZpZWxkID0gdGhpcy5lbGVtZW50LmdldEF0dHJpYnV0ZSh0aGlzLmZpZWxkQXR0ck5hbWUpO1xuICAgICAgICB0aGlzLmVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKHRoaXMuZmllbGRBdHRyTmFtZSk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlID09PSAnb3B0aW9uJykge1xuICAgICAgICB0aGlzLnZhbHVlRmllbGQgPSB0aGlzLmVsZW1lbnQucGFyZW50Tm9kZS52YWx1ZUZpZWxkO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBjcmVhdGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICghdGhpcy5ldmVudHMpIHJldHVybjsgLy8gbm90aGluZyBmb3IgPG9wdGlvbj4gaGVyZVxuICAgICAgdmFyIGVsZW1lbnQgPSB0aGlzLmVsZW1lbnQ7XG4gICAgICB2YXIgb2JzZXJ2ZXIgPSB0aGlzLm9ic2VydmVyO1xuICAgICAgdmFyIGlucHV0ID0gdGhpcy5tZXRob2RzO1xuICAgICAgdmFyIHZhbHVlRmllbGQgPSB0aGlzLnZhbHVlRmllbGQ7XG5cbiAgICAgIC8vIFRoZSAyLXdheSBiaW5kaW5nIHBhcnQgaXMgc2V0dGluZyB2YWx1ZXMgb24gY2VydGFpbiBldmVudHNcbiAgICAgIGZ1bmN0aW9uIG9uQ2hhbmdlKCkge1xuICAgICAgICBpZiAoaW5wdXQuZ2V0LmNhbGwoZWxlbWVudCwgdmFsdWVGaWVsZCkgIT09IG9ic2VydmVyLm9sZFZhbHVlICYmICFlbGVtZW50LnJlYWRPbmx5KSB7XG4gICAgICAgICAgb2JzZXJ2ZXIuc2V0KGlucHV0LmdldC5jYWxsKGVsZW1lbnQsIHZhbHVlRmllbGQpKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoZWxlbWVudC50eXBlID09PSAndGV4dCcpIHtcbiAgICAgICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMTMpIG9uQ2hhbmdlKCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmV2ZW50cy5mb3JFYWNoKGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgb25DaGFuZ2UpO1xuICAgICAgfSk7XG4gICAgfSxcblxuICAgIHVwZGF0ZWQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBpZiAodGhpcy5tZXRob2RzLmdldC5jYWxsKHRoaXMuZWxlbWVudCwgdGhpcy52YWx1ZUZpZWxkKSAhPSB2YWx1ZSkge1xuICAgICAgICB0aGlzLm1ldGhvZHMuc2V0LmNhbGwodGhpcy5lbGVtZW50LCB2YWx1ZSwgdGhpcy52YWx1ZUZpZWxkKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIC8qKlxuICAgKiBIYW5kbGUgdGhlIGRpZmZlcmVudCBmb3JtIHR5cGVzXG4gICAqL1xuICB2YXIgZGVmYXVsdElucHV0TWV0aG9kID0ge1xuICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnZhbHVlOyB9LFxuICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgdGhpcy52YWx1ZSA9ICh2YWx1ZSA9PSBudWxsKSA/ICcnIDogdmFsdWU7IH1cbiAgfTtcblxuICB2YXIgaW5wdXRNZXRob2RzID0ge1xuICAgIGNoZWNrYm94OiB7XG4gICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5jaGVja2VkOyB9LFxuICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyB0aGlzLmNoZWNrZWQgPSAhIXZhbHVlOyB9XG4gICAgfSxcblxuICAgIGZpbGU6IHtcbiAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmZpbGVzICYmIHRoaXMuZmlsZXNbMF07IH0sXG4gICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7fVxuICAgIH0sXG5cbiAgICBzZWxlY3Q6IHtcbiAgICAgIGdldDogZnVuY3Rpb24odmFsdWVGaWVsZCkge1xuICAgICAgICBpZiAodmFsdWVGaWVsZCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLm9wdGlvbnNbdGhpcy5zZWxlY3RlZEluZGV4XS52YWx1ZU9iamVjdDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy52YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIHNldDogZnVuY3Rpb24odmFsdWUsIHZhbHVlRmllbGQpIHtcbiAgICAgICAgaWYgKHZhbHVlICYmIHZhbHVlRmllbGQpIHtcbiAgICAgICAgICB0aGlzLnZhbHVlT2JqZWN0ID0gdmFsdWU7XG4gICAgICAgICAgdGhpcy52YWx1ZSA9IHZhbHVlW3ZhbHVlRmllbGRdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMudmFsdWUgPSAodmFsdWUgPT0gbnVsbCkgPyAnJyA6IHZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcblxuICAgIG9wdGlvbjoge1xuICAgICAgZ2V0OiBmdW5jdGlvbih2YWx1ZUZpZWxkKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZUZpZWxkID8gdGhpcy52YWx1ZU9iamVjdFt2YWx1ZUZpZWxkXSA6IHRoaXMudmFsdWU7XG4gICAgICB9LFxuICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSwgdmFsdWVGaWVsZCkge1xuICAgICAgICBpZiAodmFsdWUgJiYgdmFsdWVGaWVsZCkge1xuICAgICAgICAgIHRoaXMudmFsdWVPYmplY3QgPSB2YWx1ZTtcbiAgICAgICAgICB0aGlzLnZhbHVlID0gdmFsdWVbdmFsdWVGaWVsZF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy52YWx1ZSA9ICh2YWx1ZSA9PSBudWxsKSA/ICcnIDogdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuXG4gICAgaW5wdXQ6IGRlZmF1bHRJbnB1dE1ldGhvZCxcblxuICAgIHRleHRhcmVhOiBkZWZhdWx0SW5wdXRNZXRob2RcbiAgfTtcblxuXG4gIC8qKlxuICAgKiAjIyBvbi1bZXZlbnRdXG4gICAqIEFkZHMgYSBiaW5kZXIgZm9yIGVhY2ggZXZlbnQgbmFtZSBpbiB0aGUgYXJyYXkuIFdoZW4gdGhlIGV2ZW50IGlzIHRyaWdnZXJlZCB0aGUgZXhwcmVzc2lvbiB3aWxsIGJlIHJ1bi5cbiAgICpcbiAgICogKipFeGFtcGxlIEV2ZW50czoqKlxuICAgKlxuICAgKiAqIG9uLWNsaWNrXG4gICAqICogb24tZGJsY2xpY2tcbiAgICogKiBvbi1zdWJtaXRcbiAgICogKiBvbi1jaGFuZ2VcbiAgICogKiBvbi1mb2N1c1xuICAgKiAqIG9uLWJsdXJcbiAgICpcbiAgICogKipFeGFtcGxlOioqXG4gICAqIGBgYGh0bWxcbiAgICogPGZvcm0gb24tc3VibWl0PVwie3tzYXZlVXNlcigpfX1cIj5cbiAgICogICA8aW5wdXQgbmFtZT1cImZpcnN0TmFtZVwiIHZhbHVlPVwiSmFjb2JcIj5cbiAgICogICA8YnV0dG9uPlNhdmU8L2J1dHRvbj5cbiAgICogPC9mb3JtPlxuICAgKiBgYGBcbiAgICogKlJlc3VsdCAoZXZlbnRzIGRvbid0IGFmZmVjdCB0aGUgSFRNTCk6KlxuICAgKiBgYGBodG1sXG4gICAqIDxmb3JtPlxuICAgKiAgIDxpbnB1dCBuYW1lPVwiZmlyc3ROYW1lXCIgdmFsdWU9XCJKYWNvYlwiPlxuICAgKiAgIDxidXR0b24+U2F2ZTwvYnV0dG9uPlxuICAgKiA8L2Zvcm0+XG4gICAqIGBgYFxuICAgKi9cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdvbi0qJywge1xuICAgIGNyZWF0ZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGV2ZW50TmFtZSA9IHRoaXMubWF0Y2g7XG4gICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgdGhpcy5lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICBpZiAoIXRoaXMuaGFzQXR0cmlidXRlKCdkaXNhYmxlZCcpICYmIF90aGlzLmNvbnRleHQpIHtcbiAgICAgICAgICAvLyBTZXQgdGhlIGV2ZW50IG9uIHRoZSBjb250ZXh0IHNvIGl0IG1heSBiZSB1c2VkIGluIHRoZSBleHByZXNzaW9uIHdoZW4gdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgICAgICB2YXIgcHJpb3JFdmVudCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IoX3RoaXMuY29udGV4dCwgJ2V2ZW50Jyk7XG4gICAgICAgICAgdmFyIHByaW9yRWxlbWVudCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IoX3RoaXMuY29udGV4dCwgJ2VsZW1lbnQnKTtcbiAgICAgICAgICBfdGhpcy5jb250ZXh0LmV2ZW50ID0gZXZlbnQ7XG4gICAgICAgICAgX3RoaXMuY29udGV4dC5lbGVtZW50ID0gX3RoaXMuZWxlbWVudDtcblxuICAgICAgICAgIC8vIExldCBhbiBvbi1bZXZlbnRdIG1ha2UgdGhlIGZ1bmN0aW9uIGNhbGwgd2l0aCBpdHMgb3duIGFyZ3VtZW50c1xuICAgICAgICAgIHZhciBsaXN0ZW5lciA9IF90aGlzLm9ic2VydmVyLmdldCgpO1xuXG4gICAgICAgICAgLy8gT3IganVzdCByZXR1cm4gYSBmdW5jdGlvbiB3aGljaCB3aWxsIGJlIGNhbGxlZCB3aXRoIHRoZSBldmVudCBvYmplY3RcbiAgICAgICAgICBpZiAodHlwZW9mIGxpc3RlbmVyID09PSAnZnVuY3Rpb24nKSBsaXN0ZW5lci5jYWxsKF90aGlzLmNvbnRleHQsIGV2ZW50KTtcblxuICAgICAgICAgIC8vIFJlc2V0IHRoZSBjb250ZXh0IHRvIGl0cyBwcmlvciBzdGF0ZVxuICAgICAgICAgIGlmIChwcmlvckV2ZW50KSB7XG4gICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoX3RoaXMuY29udGV4dCwgJ2V2ZW50JywgcHJpb3JFdmVudCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRlbGV0ZSBfdGhpcy5jb250ZXh0LmV2ZW50O1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChwcmlvckVsZW1lbnQpIHtcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShfdGhpcy5jb250ZXh0LCAnZWxlbWVudCcsIHByaW9yRWxlbWVudCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRlbGV0ZSBfdGhpcy5jb250ZXh0LmVsZW1lbnQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuXG5cbiAgLyoqXG4gICAqICMjIG9uLVtrZXkgZXZlbnRdXG4gICAqIEFkZHMgYSBiaW5kZXIgd2hpY2ggaXMgdHJpZ2dlcmVkIHdoZW4gdGhlIGtleWRvd24gZXZlbnQncyBga2V5Q29kZWAgcHJvcGVydHkgbWF0Y2hlcy4gSWYgdGhlIG5hbWUgaW5jbHVkZXMgY3RybFxuICAgKiB0aGVuIGl0IHdpbGwgb25seSBmaXJlIHdoZW4gdGhlIGtleSBwbHVzIHRoZSBjdHJsS2V5IG9yIG1ldGFLZXkgaXMgcHJlc3NlZC5cbiAgICpcbiAgICogKipLZXkgRXZlbnRzOioqXG4gICAqXG4gICAqICogb24tZW50ZXJcbiAgICogKiBvbi1jdHJsLWVudGVyXG4gICAqICogb24tZXNjXG4gICAqXG4gICAqICoqRXhhbXBsZToqKlxuICAgKiBgYGBodG1sXG4gICAqIDxpbnB1dCBvbi1lbnRlcj1cInt7c2F2ZSgpfX1cIiBvbi1lc2M9XCJ7e2NhbmNlbCgpfX1cIj5cbiAgICogYGBgXG4gICAqICpSZXN1bHQ6KlxuICAgKiBgYGBodG1sXG4gICAqIDxpbnB1dD5cbiAgICogYGBgXG4gICAqL1xuICB2YXIga2V5Q29kZXMgPSB7IGVudGVyOiAxMywgZXNjOiAyNywgJ2N0cmwtZW50ZXInOiAxMyB9O1xuXG4gIE9iamVjdC5rZXlzKGtleUNvZGVzKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIga2V5Q29kZSA9IGtleUNvZGVzW25hbWVdO1xuXG4gICAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdvbi0nICsgbmFtZSwge1xuICAgICAgY3JlYXRlZDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB1c2VDdHJsS2V5ID0gbmFtZS5pbmRleE9mKCdjdHJsLScpID09PSAwO1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICB0aGlzLmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgaWYgKHVzZUN0cmxLZXkgJiYgIShldmVudC5jdHJsS2V5IHx8IGV2ZW50Lm1ldGFLZXkpIHx8ICFfdGhpcy5jb250ZXh0KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGV2ZW50LmtleUNvZGUgIT09IGtleUNvZGUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgaWYgKCF0aGlzLmhhc0F0dHJpYnV0ZSgnZGlzYWJsZWQnKSkge1xuICAgICAgICAgICAgLy8gU2V0IHRoZSBldmVudCBvbiB0aGUgY29udGV4dCBzbyBpdCBtYXkgYmUgdXNlZCBpbiB0aGUgZXhwcmVzc2lvbiB3aGVuIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICAgICAgICB2YXIgcHJpb3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKF90aGlzLmNvbnRleHQsICdldmVudCcpO1xuICAgICAgICAgICAgX3RoaXMuY29udGV4dC5ldmVudCA9IGV2ZW50O1xuXG4gICAgICAgICAgICAvLyBMZXQgYW4gb24tW2V2ZW50XSBtYWtlIHRoZSBmdW5jdGlvbiBjYWxsIHdpdGggaXRzIG93biBhcmd1bWVudHNcbiAgICAgICAgICAgIHZhciBsaXN0ZW5lciA9IF90aGlzLm9ic2VydmVyLmdldCgpO1xuXG4gICAgICAgICAgICAvLyBPciBqdXN0IHJldHVybiBhIGZ1bmN0aW9uIHdoaWNoIHdpbGwgYmUgY2FsbGVkIHdpdGggdGhlIGV2ZW50IG9iamVjdFxuICAgICAgICAgICAgaWYgKHR5cGVvZiBsaXN0ZW5lciA9PT0gJ2Z1bmN0aW9uJykgbGlzdGVuZXIuY2FsbChfdGhpcy5jb250ZXh0LCBldmVudCk7XG5cbiAgICAgICAgICAgIC8vIFJlc2V0IHRoZSBjb250ZXh0IHRvIGl0cyBwcmlvciBzdGF0ZVxuICAgICAgICAgICAgaWYgKHByaW9yKSB7XG4gICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShfdGhpcy5jb250ZXh0LCBldmVudCwgcHJpb3IpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgZGVsZXRlIF90aGlzLmNvbnRleHQuZXZlbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KVxuICB9KTtcblxuXG4gIC8qKlxuICAgKiAjIyBbYXR0cmlidXRlXSRcbiAgICogQWRkcyBhIGJpbmRlciB0byBzZXQgdGhlIGF0dHJpYnV0ZSBvZiBlbGVtZW50IHRvIHRoZSB2YWx1ZSBvZiB0aGUgZXhwcmVzc2lvbi4gVXNlIHRoaXMgd2hlbiB5b3UgZG9uJ3Qgd2FudCBhblxuICAgKiBgPGltZz5gIHRvIHRyeSBhbmQgbG9hZCBpdHMgYHNyY2AgYmVmb3JlIGJlaW5nIGV2YWx1YXRlZC4gVGhpcyBpcyBvbmx5IG5lZWRlZCBvbiB0aGUgaW5kZXguaHRtbCBwYWdlIGFzIHRlbXBsYXRlXG4gICAqIHdpbGwgYmUgcHJvY2Vzc2VkIGJlZm9yZSBiZWluZyBpbnNlcnRlZCBpbnRvIHRoZSBET00uIEdlbmVyYWxseSB5b3UgY2FuIGp1c3QgdXNlIGBhdHRyPVwie3tleHByfX1cImAuXG4gICAqXG4gICAqICoqRXhhbXBsZSBBdHRyaWJ1dGVzOioqXG4gICAqXG4gICAqICoqRXhhbXBsZToqKlxuICAgKiBgYGBodG1sXG4gICAqIDxpbWcgc3JjJD1cInt7dXNlci5hdmF0YXJVcmx9fVwiPlxuICAgKiBgYGBcbiAgICogKlJlc3VsdDoqXG4gICAqIGBgYGh0bWxcbiAgICogPGltZyBzcmM9XCJodHRwOi8vY2RuLmV4YW1wbGUuY29tL2F2YXRhcnMvamFjd3JpZ2h0LXNtYWxsLnBuZ1wiPlxuICAgKiBgYGBcbiAgICovXG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnKiQnLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHZhciBhdHRyTmFtZSA9IHRoaXMubWF0Y2g7XG4gICAgaWYgKCF2YWx1ZSkge1xuICAgICAgdGhpcy5lbGVtZW50LnJlbW92ZUF0dHJpYnV0ZShhdHRyTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZWxlbWVudC5zZXRBdHRyaWJ1dGUoYXR0ck5hbWUsIHZhbHVlKTtcbiAgICB9XG4gIH0pO1xuXG5cbiAgLyoqXG4gICAqICMjIFthdHRyaWJ1dGVdP1xuICAgKiBBZGRzIGEgYmluZGVyIHRvIHRvZ2dsZSBhbiBhdHRyaWJ1dGUgb24gb3Igb2ZmIGlmIHRoZSBleHByZXNzaW9uIGlzIHRydXRoeSBvciBmYWxzZXkuIFVzZSBmb3IgYXR0cmlidXRlcyB3aXRob3V0XG4gICAqIHZhbHVlcyBzdWNoIGFzIGBzZWxlY3RlZGAsIGBkaXNhYmxlZGAsIG9yIGByZWFkb25seWAuIGBjaGVja2VkP2Agd2lsbCB1c2UgMi13YXkgZGF0YWJpbmRpbmcuXG4gICAqXG4gICAqICoqRXhhbXBsZToqKlxuICAgKiBgYGBodG1sXG4gICAqIDxsYWJlbD5JcyBBZG1pbmlzdHJhdG9yPC9sYWJlbD5cbiAgICogPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGNoZWNrZWQ/PVwie3t1c2VyLmlzQWRtaW59fVwiPlxuICAgKiA8YnV0dG9uIGRpc2FibGVkPz1cInt7aXNQcm9jZXNzaW5nfX1cIj5TdWJtaXQ8L2J1dHRvbj5cbiAgICogYGBgXG4gICAqICpSZXN1bHQgaWYgYGlzUHJvY2Vzc2luZ2AgaXMgYHRydWVgIGFuZCBgdXNlci5pc0FkbWluYCBpcyBmYWxzZToqXG4gICAqIGBgYGh0bWxcbiAgICogPGxhYmVsPklzIEFkbWluaXN0cmF0b3I8L2xhYmVsPlxuICAgKiA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCI+XG4gICAqIDxidXR0b24gZGlzYWJsZWQ+U3VibWl0PC9idXR0b24+XG4gICAqIGBgYFxuICAgKi9cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCcqPycsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgdmFyIGF0dHJOYW1lID0gdGhpcy5tYXRjaDtcbiAgICBpZiAoIXZhbHVlKSB7XG4gICAgICB0aGlzLmVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKGF0dHJOYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZShhdHRyTmFtZSwgJycpO1xuICAgIH1cbiAgfSk7XG5cblxuICAvKipcbiAgICogQWRkIGEgY2xvbmUgb2YgdGhlIGB2YWx1ZWAgYmluZGVyIGZvciBgY2hlY2tlZD9gIHNvIGNoZWNrYm94ZXMgY2FuIGhhdmUgdHdvLXdheSBiaW5kaW5nIHVzaW5nIGBjaGVja2VkP2AuXG4gICAqL1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ2NoZWNrZWQ/JywgZnJhZ21lbnRzLmdldEF0dHJpYnV0ZUJpbmRlcigndmFsdWUnKSk7XG5cblxuXG4gIC8qKlxuICAgKiAjIyBpZiwgdW5sZXNzLCBlbHNlLWlmLCBlbHNlLXVubGVzcywgZWxzZVxuICAgKiBBZGRzIGEgYmluZGVyIHRvIHNob3cgb3IgaGlkZSB0aGUgZWxlbWVudCBpZiB0aGUgdmFsdWUgaXMgdHJ1dGh5IG9yIGZhbHNleS4gQWN0dWFsbHkgcmVtb3ZlcyB0aGUgZWxlbWVudCBmcm9tIHRoZVxuICAgKiBET00gd2hlbiBoaWRkZW4sIHJlcGxhY2luZyBpdCB3aXRoIGEgbm9uLXZpc2libGUgcGxhY2Vob2xkZXIgYW5kIG5vdCBuZWVkbGVzc2x5IGV4ZWN1dGluZyBiaW5kaW5ncyBpbnNpZGUuXG4gICAqXG4gICAqICoqRXhhbXBsZToqKlxuICAgKiBgYGBodG1sXG4gICAqIDx1bCBjbGFzcz1cImhlYWRlci1saW5rc1wiPlxuICAgKiAgIDxsaSBpZj1cInVzZXJcIj48YSBocmVmPVwiL2FjY291bnRcIj5NeSBBY2NvdW50PC9hPjwvbGk+XG4gICAqICAgPGxpIHVubGVzcz1cInVzZXJcIj48YSBocmVmPVwiL2xvZ2luXCI+U2lnbiBJbjwvYT48L2xpPlxuICAgKiAgIDxsaSBlbHNlPjxhIGhyZWY9XCIvbG9nb3V0XCI+U2lnbiBPdXQ8L2E+PC9saT5cbiAgICogPC91bD5cbiAgICogYGBgXG4gICAqICpSZXN1bHQgaWYgYHVzZXJgIGlzIG51bGw6KlxuICAgKiBgYGBodG1sXG4gICAqIDx1bCBjbGFzcz1cImhlYWRlci1saW5rc1wiPlxuICAgKiAgIDxsaT48YSBocmVmPVwiL2xvZ2luXCI+U2lnbiBJbjwvYT48L2xpPlxuICAgKiA8L3VsPlxuICAgKiBgYGBcbiAgICovXG4gIHZhciBJZkJpbmRpbmcgPSBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ2lmJywge1xuICAgIGFuaW1hdGVkOiB0cnVlLFxuICAgIHByaW9yaXR5OiA1MCxcbiAgICB1bmxlc3NBdHRyTmFtZTogJ3VubGVzcycsXG4gICAgZWxzZUlmQXR0ck5hbWU6ICdlbHNlLWlmJyxcbiAgICBlbHNlVW5sZXNzQXR0ck5hbWU6ICdlbHNlLXVubGVzcycsXG4gICAgZWxzZUF0dHJOYW1lOiAnZWxzZScsXG5cbiAgICBjb21waWxlZDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZWxlbWVudCA9IHRoaXMuZWxlbWVudDtcbiAgICAgIHZhciBleHByZXNzaW9ucyA9IFsgd3JhcElmRXhwKHRoaXMuZXhwcmVzc2lvbiwgdGhpcy5uYW1lID09PSB0aGlzLnVubGVzc0F0dHJOYW1lKSBdO1xuICAgICAgdmFyIHBsYWNlaG9sZGVyID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICAgICAgdmFyIG5vZGUgPSBlbGVtZW50Lm5leHRFbGVtZW50U2libGluZztcbiAgICAgIHRoaXMuZWxlbWVudCA9IHBsYWNlaG9sZGVyO1xuICAgICAgZWxlbWVudC5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChwbGFjZWhvbGRlciwgZWxlbWVudCk7XG5cbiAgICAgIC8vIFN0b3JlcyBhIHRlbXBsYXRlIGZvciBhbGwgdGhlIGVsZW1lbnRzIHRoYXQgY2FuIGdvIGludG8gdGhpcyBzcG90XG4gICAgICB0aGlzLnRlbXBsYXRlcyA9IFsgZnJhZ21lbnRzLmNyZWF0ZVRlbXBsYXRlKGVsZW1lbnQpIF07XG5cbiAgICAgIC8vIFB1bGwgb3V0IGFueSBvdGhlciBlbGVtZW50cyB0aGF0IGFyZSBjaGFpbmVkIHdpdGggdGhpcyBvbmVcbiAgICAgIHdoaWxlIChub2RlKSB7XG4gICAgICAgIHZhciBuZXh0ID0gbm9kZS5uZXh0RWxlbWVudFNpYmxpbmc7XG4gICAgICAgIHZhciBleHByZXNzaW9uO1xuICAgICAgICBpZiAobm9kZS5oYXNBdHRyaWJ1dGUodGhpcy5lbHNlSWZBdHRyTmFtZSkpIHtcbiAgICAgICAgICBleHByZXNzaW9uID0gZnJhZ21lbnRzLmNvZGlmeUV4cHJlc3Npb24oJ2F0dHJpYnV0ZScsIG5vZGUuZ2V0QXR0cmlidXRlKHRoaXMuZWxzZUlmQXR0ck5hbWUpKTtcbiAgICAgICAgICBleHByZXNzaW9ucy5wdXNoKHdyYXBJZkV4cChleHByZXNzaW9uLCBmYWxzZSkpO1xuICAgICAgICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKHRoaXMuZWxzZUlmQXR0ck5hbWUpO1xuICAgICAgICB9IGVsc2UgaWYgKG5vZGUuaGFzQXR0cmlidXRlKHRoaXMuZWxzZVVubGVzc0F0dHJOYW1lKSkge1xuICAgICAgICAgIGV4cHJlc3Npb24gPSBmcmFnbWVudHMuY29kaWZ5RXhwcmVzc2lvbignYXR0cmlidXRlJywgbm9kZS5nZXRBdHRyaWJ1dGUodGhpcy5lbHNlVW5sZXNzQXR0ck5hbWUpKTtcbiAgICAgICAgICBleHByZXNzaW9ucy5wdXNoKHdyYXBJZkV4cChleHByZXNzaW9uLCB0cnVlKSk7XG4gICAgICAgICAgbm9kZS5yZW1vdmVBdHRyaWJ1dGUodGhpcy5lbHNlVW5sZXNzQXR0ck5hbWUpO1xuICAgICAgICB9IGVsc2UgaWYgKG5vZGUuaGFzQXR0cmlidXRlKHRoaXMuZWxzZUF0dHJOYW1lKSkge1xuICAgICAgICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKHRoaXMuZWxzZUF0dHJOYW1lKTtcbiAgICAgICAgICBuZXh0ID0gbnVsbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIG5vZGUucmVtb3ZlKCk7XG4gICAgICAgIHRoaXMudGVtcGxhdGVzLnB1c2goZnJhZ21lbnRzLmNyZWF0ZVRlbXBsYXRlKG5vZGUpKTtcbiAgICAgICAgbm9kZSA9IG5leHQ7XG4gICAgICB9XG5cbiAgICAgIC8vIEFuIGV4cHJlc3Npb24gdGhhdCB3aWxsIHJldHVybiBhbiBpbmRleC4gU29tZXRoaW5nIGxpa2UgdGhpcyBgZXhwciA/IDAgOiBleHByMiA/IDEgOiBleHByMyA/IDIgOiAzYC4gVGhpcyB3aWxsXG4gICAgICAvLyBiZSB1c2VkIHRvIGtub3cgd2hpY2ggc2VjdGlvbiB0byBzaG93IGluIHRoZSBpZi9lbHNlLWlmL2Vsc2UgZ3JvdXBpbmcuXG4gICAgICB0aGlzLmV4cHJlc3Npb24gPSBleHByZXNzaW9ucy5tYXAoZnVuY3Rpb24oZXhwciwgaW5kZXgpIHtcbiAgICAgICAgcmV0dXJuIGV4cHIgKyAnID8gJyArIGluZGV4ICsgJyA6ICc7XG4gICAgICB9KS5qb2luKCcnKSArIGV4cHJlc3Npb25zLmxlbmd0aDtcbiAgICB9LFxuXG4gICAgdXBkYXRlZDogZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgIC8vIEZvciBwZXJmb3JtYW5jZSBwcm92aWRlIGFuIGFsdGVybmF0ZSBjb2RlIHBhdGggZm9yIGFuaW1hdGlvblxuICAgICAgaWYgKHRoaXMuYW5pbWF0ZSkge1xuICAgICAgICB0aGlzLnVwZGF0ZWRBbmltYXRlZChpbmRleCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnVwZGF0ZWRSZWd1bGFyKGluZGV4KTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgYWRkOiBmdW5jdGlvbih2aWV3KSB7XG4gICAgICB0aGlzLmVsZW1lbnQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodmlldywgdGhpcy5lbGVtZW50Lm5leHRTaWJsaW5nKTtcbiAgICB9LFxuXG4gICAgcmVtb3ZlOiBmdW5jdGlvbih2aWV3KSB7XG4gICAgICB2aWV3LmRpc3Bvc2UoKTtcbiAgICB9LFxuXG4gICAgdXBkYXRlZFJlZ3VsYXI6IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICBpZiAodGhpcy5zaG93aW5nKSB7XG4gICAgICAgIHRoaXMucmVtb3ZlKHRoaXMuc2hvd2luZyk7XG4gICAgICAgIHRoaXMuc2hvd2luZyA9IG51bGw7XG4gICAgICB9XG4gICAgICB2YXIgdGVtcGxhdGUgPSB0aGlzLnRlbXBsYXRlc1tpbmRleF07XG4gICAgICBpZiAodGVtcGxhdGUpIHtcbiAgICAgICAgdGhpcy5zaG93aW5nID0gdGVtcGxhdGUuY3JlYXRlVmlldygpO1xuICAgICAgICB0aGlzLnNob3dpbmcuYmluZCh0aGlzLmNvbnRleHQpO1xuICAgICAgICB0aGlzLmFkZCh0aGlzLnNob3dpbmcpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICB1cGRhdGVkQW5pbWF0ZWQ6IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICB0aGlzLmxhc3RWYWx1ZSA9IGluZGV4O1xuICAgICAgaWYgKHRoaXMuYW5pbWF0aW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuc2hvd2luZykge1xuICAgICAgICB0aGlzLmFuaW1hdGluZyA9IHRydWU7XG4gICAgICAgIHRoaXMuYW5pbWF0ZU91dCh0aGlzLnNob3dpbmcsIHRydWUsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHRoaXMuYW5pbWF0aW5nID0gZmFsc2U7XG5cbiAgICAgICAgICBpZiAodGhpcy5zaG93aW5nKSB7XG4gICAgICAgICAgICAvLyBNYWtlIHN1cmUgdGhpcyB3YXNuJ3QgdW5ib3VuZCB3aGlsZSB3ZSB3ZXJlIGFuaW1hdGluZ1xuICAgICAgICAgICAgdGhpcy5yZW1vdmUodGhpcy5zaG93aW5nKTtcbiAgICAgICAgICAgIHRoaXMuc2hvd2luZyA9IG51bGw7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHRoaXMuY29udGV4dCkge1xuICAgICAgICAgICAgLy8gZmluaXNoIGJ5IGFuaW1hdGluZyB0aGUgbmV3IGVsZW1lbnQgaW4gKGlmIGFueSksIHVubGVzcyBubyBsb25nZXIgYm91bmRcbiAgICAgICAgICAgIHRoaXMudXBkYXRlZEFuaW1hdGVkKHRoaXMubGFzdFZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHZhciB0ZW1wbGF0ZSA9IHRoaXMudGVtcGxhdGVzW2luZGV4XTtcbiAgICAgIGlmICh0ZW1wbGF0ZSkge1xuICAgICAgICB0aGlzLnNob3dpbmcgPSB0ZW1wbGF0ZS5jcmVhdGVWaWV3KCk7XG4gICAgICAgIHRoaXMuc2hvd2luZy5iaW5kKHRoaXMuY29udGV4dCk7XG4gICAgICAgIHRoaXMuYWRkKHRoaXMuc2hvd2luZyk7XG4gICAgICAgIHRoaXMuYW5pbWF0aW5nID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5hbmltYXRlSW4odGhpcy5zaG93aW5nLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICB0aGlzLmFuaW1hdGluZyA9IGZhbHNlO1xuICAgICAgICAgIC8vIGlmIHRoZSB2YWx1ZSBjaGFuZ2VkIHdoaWxlIHRoaXMgd2FzIGFuaW1hdGluZyBydW4gaXQgYWdhaW5cbiAgICAgICAgICBpZiAodGhpcy5sYXN0VmFsdWUgIT09IGluZGV4KSB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZWRBbmltYXRlZCh0aGlzLmxhc3RWYWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgdW5ib3VuZDogZnVuY3Rpb24oKSB7XG4gICAgICAvLyBDbGVhbiB1cFxuICAgICAgaWYgKHRoaXMuc2hvd2luZykge1xuICAgICAgICB0aGlzLnNob3dpbmcuZGlzcG9zZSgpO1xuICAgICAgICB0aGlzLnNob3dpbmcgPSBudWxsO1xuICAgICAgICB0aGlzLmxhc3RWYWx1ZSA9IG51bGw7XG4gICAgICAgIHRoaXMuYW5pbWF0aW5nID0gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ3VubGVzcycsIElmQmluZGluZyk7XG5cbiAgZnVuY3Rpb24gd3JhcElmRXhwKGV4cHIsIGlzVW5sZXNzKSB7XG4gICAgcmV0dXJuIChpc1VubGVzcyA/ICchJyA6ICcnKSArIGV4cHI7XG4gIH1cblxuXG4gIC8qKlxuICAgKiAjIyByZXBlYXRcbiAgICogQWRkcyBhIGJpbmRlciB0byBkdXBsaWNhdGUgYW4gZWxlbWVudCBmb3IgZWFjaCBpdGVtIGluIGFuIGFycmF5LiBUaGUgZXhwcmVzc2lvbiBtYXkgYmUgb2YgdGhlIGZvcm1hdCBgZXB4cmAgb3JcbiAgICogYGl0ZW1OYW1lIGluIGV4cHJgIHdoZXJlIGBpdGVtTmFtZWAgaXMgdGhlIG5hbWUgZWFjaCBpdGVtIGluc2lkZSB0aGUgYXJyYXkgd2lsbCBiZSByZWZlcmVuY2VkIGJ5IHdpdGhpbiBiaW5kaW5nc1xuICAgKiBpbnNpZGUgdGhlIGVsZW1lbnQuXG4gICAqXG4gICAqICoqRXhhbXBsZToqKlxuICAgKiBgYGBodG1sXG4gICAqIDxkaXYgZWFjaD1cInt7cG9zdCBpbiBwb3N0c319XCIgY2xhc3MtZmVhdHVyZWQ9XCJ7e3Bvc3QuaXNGZWF0dXJlZH19XCI+XG4gICAqICAgPGgxPnt7cG9zdC50aXRsZX19PC9oMT5cbiAgICogICA8ZGl2IGh0bWw9XCJ7e3Bvc3QuYm9keSB8IG1hcmtkb3dufX1cIj48L2Rpdj5cbiAgICogPC9kaXY+XG4gICAqIGBgYFxuICAgKiAqUmVzdWx0IGlmIHRoZXJlIGFyZSAyIHBvc3RzIGFuZCB0aGUgZmlyc3Qgb25lIGlzIGZlYXR1cmVkOipcbiAgICogYGBgaHRtbFxuICAgKiA8ZGl2IGNsYXNzPVwiZmVhdHVyZWRcIj5cbiAgICogICA8aDE+TGl0dGxlIFJlZDwvaDE+XG4gICAqICAgPGRpdj5cbiAgICogICAgIDxwPkxpdHRsZSBSZWQgUmlkaW5nIEhvb2QgaXMgYSBzdG9yeSBhYm91dCBhIGxpdHRsZSBnaXJsLjwvcD5cbiAgICogICAgIDxwPlxuICAgKiAgICAgICBNb3JlIGluZm8gY2FuIGJlIGZvdW5kIG9uXG4gICAqICAgICAgIDxhIGhyZWY9XCJodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0xpdHRsZV9SZWRfUmlkaW5nX0hvb2RcIj5XaWtpcGVkaWE8L2E+XG4gICAqICAgICA8L3A+XG4gICAqICAgPC9kaXY+XG4gICAqIDwvZGl2PlxuICAgKiA8ZGl2PlxuICAgKiAgIDxoMT5CaWcgQmx1ZTwvaDE+XG4gICAqICAgPGRpdj5cbiAgICogICAgIDxwPlNvbWUgdGhvdWdodHMgb24gdGhlIE5ldyBZb3JrIEdpYW50cy48L3A+XG4gICAqICAgICA8cD5cbiAgICogICAgICAgTW9yZSBpbmZvIGNhbiBiZSBmb3VuZCBvblxuICAgKiAgICAgICA8YSBocmVmPVwiaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9OZXdfWW9ya19HaWFudHNcIj5XaWtpcGVkaWE8L2E+XG4gICAqICAgICA8L3A+XG4gICAqICAgPC9kaXY+XG4gICAqIDwvZGl2PlxuICAgKiBgYGBcbiAgICovXG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgncmVwZWF0Jywge1xuICAgIGFuaW1hdGVkOiB0cnVlLFxuICAgIHByaW9yaXR5OiAxMDAsXG5cbiAgICBjb21waWxlZDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcGFyZW50ID0gdGhpcy5lbGVtZW50LnBhcmVudE5vZGU7XG4gICAgICB2YXIgcGxhY2Vob2xkZXIgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKHBsYWNlaG9sZGVyLCB0aGlzLmVsZW1lbnQpO1xuICAgICAgdGhpcy50ZW1wbGF0ZSA9IGZyYWdtZW50cy5jcmVhdGVUZW1wbGF0ZSh0aGlzLmVsZW1lbnQpO1xuICAgICAgdGhpcy5lbGVtZW50ID0gcGxhY2Vob2xkZXI7XG5cbiAgICAgIHZhciBwYXJ0cyA9IHRoaXMuZXhwcmVzc2lvbi5zcGxpdCgvXFxzK2luXFxzKy8pO1xuICAgICAgdGhpcy5leHByZXNzaW9uID0gcGFydHMucG9wKCk7XG4gICAgICB2YXIga2V5ID0gcGFydHMucG9wKCk7XG4gICAgICBpZiAoa2V5KSB7XG4gICAgICAgIHBhcnRzID0ga2V5LnNwbGl0KC9cXHMqLFxccyovKTtcbiAgICAgICAgdGhpcy52YWx1ZU5hbWUgPSBwYXJ0cy5wb3AoKTtcbiAgICAgICAgdGhpcy5rZXlOYW1lID0gcGFydHMucG9wKCk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIGNyZWF0ZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy52aWV3cyA9IFtdO1xuICAgICAgdGhpcy5vYnNlcnZlci5nZXRDaGFuZ2VSZWNvcmRzID0gdHJ1ZTtcbiAgICB9LFxuXG4gICAgdW5ib3VuZDogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAodGhpcy52aWV3cy5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy52aWV3cy5mb3JFYWNoKHRoaXMucmVtb3ZlVmlldyk7XG4gICAgICAgIHRoaXMudmlld3MubGVuZ3RoID0gMDtcbiAgICAgICAgdGhpcy5hbmltYXRpbmcgPSBmYWxzZTtcbiAgICAgICAgdGhpcy52YWx1ZVdoaWxlQW5pbWF0aW5nID0gbnVsbDtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgcmVtb3ZlVmlldzogZnVuY3Rpb24odmlldykge1xuICAgICAgdmlldy5kaXNwb3NlKCk7XG4gICAgICB2aWV3Ll9yZXBlYXRJdGVtXyA9IG51bGw7XG4gICAgfSxcblxuICAgIHVwZGF0ZWQ6IGZ1bmN0aW9uKHZhbHVlLCBvbGRWYWx1ZSwgY2hhbmdlcykge1xuICAgICAgaWYgKCFjaGFuZ2VzKSB7XG4gICAgICAgIHRoaXMucG9wdWxhdGUodmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHRoaXMuYW5pbWF0ZSkge1xuICAgICAgICAgIHRoaXMudXBkYXRlQ2hhbmdlc0FuaW1hdGVkKHZhbHVlLCBjaGFuZ2VzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnVwZGF0ZUNoYW5nZXModmFsdWUsIGNoYW5nZXMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcblxuICAgIC8vIE1ldGhvZCBmb3IgY3JlYXRpbmcgYW5kIHNldHRpbmcgdXAgbmV3IHZpZXdzIGZvciBvdXIgbGlzdFxuICAgIGNyZWF0ZVZpZXc6IGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcbiAgICAgIHZhciB2aWV3ID0gdGhpcy50ZW1wbGF0ZS5jcmVhdGVWaWV3KCk7XG4gICAgICB2YXIgY29udGV4dCA9IHZhbHVlO1xuICAgICAgaWYgKHRoaXMudmFsdWVOYW1lKSB7XG4gICAgICAgIGNvbnRleHQgPSBPYmplY3QuY3JlYXRlKHRoaXMuY29udGV4dCk7XG4gICAgICAgIGlmICh0aGlzLmtleU5hbWUpIGNvbnRleHRbdGhpcy5rZXlOYW1lXSA9IGtleTtcbiAgICAgICAgY29udGV4dFt0aGlzLnZhbHVlTmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgY29udGV4dC5fb3JpZ0NvbnRleHRfID0gdGhpcy5jb250ZXh0Lmhhc093blByb3BlcnR5KCdfb3JpZ0NvbnRleHRfJylcbiAgICAgICAgICA/IHRoaXMuY29udGV4dC5fb3JpZ0NvbnRleHRfXG4gICAgICAgICAgOiB0aGlzLmNvbnRleHQ7XG4gICAgICB9XG4gICAgICB2aWV3LmJpbmQoY29udGV4dCk7XG4gICAgICB2aWV3Ll9yZXBlYXRJdGVtXyA9IHZhbHVlO1xuICAgICAgcmV0dXJuIHZpZXc7XG4gICAgfSxcblxuICAgIHBvcHVsYXRlOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgaWYgKHRoaXMuYW5pbWF0aW5nKSB7XG4gICAgICAgIHRoaXMudmFsdWVXaGlsZUFuaW1hdGluZyA9IHZhbHVlO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLnZpZXdzLmxlbmd0aCkge1xuICAgICAgICB0aGlzLnZpZXdzLmZvckVhY2godGhpcy5yZW1vdmVWaWV3KTtcbiAgICAgICAgdGhpcy52aWV3cy5sZW5ndGggPSAwO1xuICAgICAgfVxuXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUubGVuZ3RoKSB7XG4gICAgICAgIHZhciBmcmFnID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuXG4gICAgICAgIHZhbHVlLmZvckVhY2goZnVuY3Rpb24oaXRlbSwgaW5kZXgpIHtcbiAgICAgICAgICB2YXIgdmlldyA9IHRoaXMuY3JlYXRlVmlldyhpbmRleCwgaXRlbSk7XG4gICAgICAgICAgdGhpcy52aWV3cy5wdXNoKHZpZXcpO1xuICAgICAgICAgIGZyYWcuYXBwZW5kQ2hpbGQodmlldyk7XG4gICAgICAgIH0sIHRoaXMpO1xuXG4gICAgICAgIHRoaXMuZWxlbWVudC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShmcmFnLCB0aGlzLmVsZW1lbnQubmV4dFNpYmxpbmcpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUaGlzIHVuLWFuaW1hdGVkIHZlcnNpb24gcmVtb3ZlcyBhbGwgcmVtb3ZlZCB2aWV3cyBmaXJzdCBzbyB0aGV5IGNhbiBiZSByZXR1cm5lZCB0byB0aGUgcG9vbCBhbmQgdGhlbiBhZGRzIG5ld1xuICAgICAqIHZpZXdzIGJhY2sgaW4uIFRoaXMgaXMgdGhlIG1vc3Qgb3B0aW1hbCBtZXRob2Qgd2hlbiBub3QgYW5pbWF0aW5nLlxuICAgICAqL1xuICAgIHVwZGF0ZUNoYW5nZXM6IGZ1bmN0aW9uKHZhbHVlLCBjaGFuZ2VzKSB7XG4gICAgICAvLyBSZW1vdmUgZXZlcnl0aGluZyBmaXJzdCwgdGhlbiBhZGQgYWdhaW4sIGFsbG93aW5nIGZvciBlbGVtZW50IHJldXNlIGZyb20gdGhlIHBvb2xcbiAgICAgIHZhciBhZGRlZENvdW50ID0gMDtcblxuICAgICAgY2hhbmdlcy5mb3JFYWNoKGZ1bmN0aW9uKHNwbGljZSkge1xuICAgICAgICBhZGRlZENvdW50ICs9IHNwbGljZS5hZGRlZENvdW50O1xuICAgICAgICBpZiAoIXNwbGljZS5yZW1vdmVkLmxlbmd0aCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcmVtb3ZlZCA9IHRoaXMudmlld3Muc3BsaWNlKHNwbGljZS5pbmRleCAtIGFkZGVkQ291bnQsIHNwbGljZS5yZW1vdmVkLmxlbmd0aCk7XG4gICAgICAgIHJlbW92ZWQuZm9yRWFjaCh0aGlzLnJlbW92ZVZpZXcpO1xuICAgICAgfSwgdGhpcyk7XG5cbiAgICAgIC8vIEFkZCB0aGUgbmV3L21vdmVkIHZpZXdzXG4gICAgICBjaGFuZ2VzLmZvckVhY2goZnVuY3Rpb24oc3BsaWNlKSB7XG4gICAgICAgIGlmICghc3BsaWNlLmFkZGVkQ291bnQpIHJldHVybjtcbiAgICAgICAgdmFyIGFkZGVkVmlld3MgPSBbXTtcbiAgICAgICAgdmFyIGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgICAgICB2YXIgaW5kZXggPSBzcGxpY2UuaW5kZXg7XG4gICAgICAgIHZhciBlbmRJbmRleCA9IGluZGV4ICsgc3BsaWNlLmFkZGVkQ291bnQ7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IGluZGV4OyBpIDwgZW5kSW5kZXg7IGkrKykge1xuICAgICAgICAgIHZhciBpdGVtID0gdmFsdWVbaV07XG4gICAgICAgICAgdmlldyA9IHRoaXMuY3JlYXRlVmlldyhpLCBpdGVtKTtcbiAgICAgICAgICBhZGRlZFZpZXdzLnB1c2godmlldyk7XG4gICAgICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQodmlldyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy52aWV3cy5zcGxpY2UuYXBwbHkodGhpcy52aWV3cywgWyBpbmRleCwgMCBdLmNvbmNhdChhZGRlZFZpZXdzKSk7XG4gICAgICAgIHZhciBwcmV2aW91c1ZpZXcgPSB0aGlzLnZpZXdzW2luZGV4IC0gMV07XG4gICAgICAgIHZhciBuZXh0U2libGluZyA9IHByZXZpb3VzVmlldyA/IHByZXZpb3VzVmlldy5sYXN0Vmlld05vZGUubmV4dFNpYmxpbmcgOiB0aGlzLmVsZW1lbnQubmV4dFNpYmxpbmc7XG4gICAgICAgIHRoaXMuZWxlbWVudC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShmcmFnbWVudCwgbmV4dFNpYmxpbmcpO1xuICAgICAgfSwgdGhpcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRoaXMgYW5pbWF0ZWQgdmVyc2lvbiBtdXN0IGFuaW1hdGUgcmVtb3ZlZCBub2RlcyBvdXQgd2hpbGUgYWRkZWQgbm9kZXMgYXJlIGFuaW1hdGluZyBpbiBtYWtpbmcgaXQgbGVzcyBvcHRpbWFsXG4gICAgICogKGJ1dCBjb29sIGxvb2tpbmcpLiBJdCBhbHNvIGhhbmRsZXMgXCJtb3ZlXCIgYW5pbWF0aW9ucyBmb3Igbm9kZXMgd2hpY2ggYXJlIG1vdmluZyBwbGFjZSB3aXRoaW4gdGhlIGxpc3QuXG4gICAgICovXG4gICAgdXBkYXRlQ2hhbmdlc0FuaW1hdGVkOiBmdW5jdGlvbih2YWx1ZSwgY2hhbmdlcykge1xuICAgICAgaWYgKHRoaXMuYW5pbWF0aW5nKSB7XG4gICAgICAgIHRoaXMudmFsdWVXaGlsZUFuaW1hdGluZyA9IHZhbHVlO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIgYW5pbWF0aW5nVmFsdWUgPSB2YWx1ZS5zbGljZSgpO1xuICAgICAgdGhpcy5hbmltYXRpbmcgPSB0cnVlO1xuXG4gICAgICAvLyBSdW4gdXBkYXRlcyB3aGljaCBvY2N1cmVkIHdoaWxlIHRoaXMgd2FzIGFuaW1hdGluZy5cbiAgICAgIGZ1bmN0aW9uIHdoZW5Eb25lKCkge1xuICAgICAgICAvLyBUaGUgbGFzdCBhbmltYXRpb24gZmluaXNoZWQgd2lsbCBydW4gdGhpc1xuICAgICAgICBpZiAoLS13aGVuRG9uZS5jb3VudCAhPT0gMCkgcmV0dXJuO1xuXG4gICAgICAgIHRoaXMuYW5pbWF0aW5nID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLnZhbHVlV2hpbGVBbmltYXRpbmcpIHtcbiAgICAgICAgICB2YXIgY2hhbmdlcyA9IGRpZmYuYXJyYXlzKHRoaXMudmFsdWVXaGlsZUFuaW1hdGluZywgYW5pbWF0aW5nVmFsdWUpO1xuICAgICAgICAgIHRoaXMudXBkYXRlQ2hhbmdlc0FuaW1hdGVkKHRoaXMudmFsdWVXaGlsZUFuaW1hdGluZywgY2hhbmdlcyk7XG4gICAgICAgICAgdGhpcy52YWx1ZVdoaWxlQW5pbWF0aW5nID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgd2hlbkRvbmUuY291bnQgPSAwO1xuXG4gICAgICB2YXIgYWxsQWRkZWQgPSBbXTtcbiAgICAgIHZhciBhbGxSZW1vdmVkID0gW107XG5cbiAgICAgIGNoYW5nZXMuZm9yRWFjaChmdW5jdGlvbihzcGxpY2UpIHtcbiAgICAgICAgdmFyIGFkZGVkVmlld3MgPSBbXTtcbiAgICAgICAgdmFyIGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgICAgICB2YXIgaW5kZXggPSBzcGxpY2UuaW5kZXg7XG4gICAgICAgIHZhciBlbmRJbmRleCA9IGluZGV4ICsgc3BsaWNlLmFkZGVkQ291bnQ7XG4gICAgICAgIHZhciByZW1vdmVkQ291bnQgPSBzcGxpY2UucmVtb3ZlZC5sZW5ndGg7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IGluZGV4OyBpIDwgZW5kSW5kZXg7IGkrKykge1xuICAgICAgICAgIHZhciBpdGVtID0gdmFsdWVbaV07XG4gICAgICAgICAgdmFyIHZpZXcgPSB0aGlzLmNyZWF0ZVZpZXcoaSwgaXRlbSk7XG4gICAgICAgICAgYWRkZWRWaWV3cy5wdXNoKHZpZXcpO1xuICAgICAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKHZpZXcpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHJlbW92ZWRWaWV3cyA9IHRoaXMudmlld3Muc3BsaWNlLmFwcGx5KHRoaXMudmlld3MsIFsgaW5kZXgsIHJlbW92ZWRDb3VudCBdLmNvbmNhdChhZGRlZFZpZXdzKSk7XG4gICAgICAgIHZhciBwcmV2aW91c1ZpZXcgPSB0aGlzLnZpZXdzW2luZGV4IC0gMV07XG4gICAgICAgIHZhciBuZXh0U2libGluZyA9IHByZXZpb3VzVmlldyA/IHByZXZpb3VzVmlldy5sYXN0Vmlld05vZGUubmV4dFNpYmxpbmcgOiB0aGlzLmVsZW1lbnQubmV4dFNpYmxpbmc7XG4gICAgICAgIHRoaXMuZWxlbWVudC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShmcmFnbWVudCwgbmV4dFNpYmxpbmcpO1xuXG4gICAgICAgIGFsbEFkZGVkID0gYWxsQWRkZWQuY29uY2F0KGFkZGVkVmlld3MpO1xuICAgICAgICBhbGxSZW1vdmVkID0gYWxsUmVtb3ZlZC5jb25jYXQocmVtb3ZlZFZpZXdzKTtcbiAgICAgIH0sIHRoaXMpO1xuXG5cbiAgICAgIGFsbEFkZGVkLmZvckVhY2goZnVuY3Rpb24odmlldykge1xuICAgICAgICB3aGVuRG9uZS5jb3VudCsrO1xuICAgICAgICB0aGlzLmFuaW1hdGVJbih2aWV3LCB3aGVuRG9uZSk7XG4gICAgICB9LCB0aGlzKTtcblxuICAgICAgYWxsUmVtb3ZlZC5mb3JFYWNoKGZ1bmN0aW9uKHZpZXcpIHtcbiAgICAgICAgd2hlbkRvbmUuY291bnQrKztcbiAgICAgICAgdGhpcy5hbmltYXRlT3V0KHZpZXcsIHdoZW5Eb25lKTtcbiAgICAgIH0sIHRoaXMpO1xuICAgIH1cbiAgfSk7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlZ2lzdGVyRGVmYXVsdHM7XG5cblxuLyoqXG4gKiAjIERlZmF1bHQgRm9ybWF0dGVyc1xuICogUmVnaXN0ZXJzIGRlZmF1bHQgZm9ybWF0dGVycyB3aXRoIGEgZnJhZ21lbnRzIG9iamVjdC5cbiAqL1xuZnVuY3Rpb24gcmVnaXN0ZXJEZWZhdWx0cyhmcmFnbWVudHMpIHtcblxuICAvKipcbiAgICpcbiAgICovXG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcigndG9rZW5MaXN0JywgZnVuY3Rpb24odmFsdWUpIHtcblxuICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgcmV0dXJuIHZhbHVlLmpvaW4oJyAnKTtcbiAgICB9XG5cbiAgICBpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgdmFyIGNsYXNzZXMgPSBbXTtcbiAgICAgIE9iamVjdC5rZXlzKHZhbHVlKS5mb3JFYWNoKGZ1bmN0aW9uKGNsYXNzTmFtZSkge1xuICAgICAgICBpZiAodmFsdWVbY2xhc3NOYW1lXSkge1xuICAgICAgICAgIGNsYXNzZXMucHVzaChjbGFzc05hbWUpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBjbGFzc2VzLmpvaW4oJyAnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdmFsdWUgfHwgJyc7XG4gIH0pO1xuXG5cbiAgLyoqXG4gICAqIHYgVE9ETyB2XG4gICAqL1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ3N0eWxlcycsIGZ1bmN0aW9uKHZhbHVlKSB7XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiB2YWx1ZS5qb2luKCcgJyk7XG4gICAgfVxuXG4gICAgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHZhciBjbGFzc2VzID0gW107XG4gICAgICBPYmplY3Qua2V5cyh2YWx1ZSkuZm9yRWFjaChmdW5jdGlvbihjbGFzc05hbWUpIHtcbiAgICAgICAgaWYgKHZhbHVlW2NsYXNzTmFtZV0pIHtcbiAgICAgICAgICBjbGFzc2VzLnB1c2goY2xhc3NOYW1lKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gY2xhc3Nlcy5qb2luKCcgJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbHVlIHx8ICcnO1xuICB9KTtcblxuXG4gIC8qKlxuICAgKiAjIyBmaWx0ZXJcbiAgICogRmlsdGVycyBhbiBhcnJheSBieSB0aGUgZ2l2ZW4gZmlsdGVyIGZ1bmN0aW9uKHMpLCBtYXkgcHJvdmlkZSBhIGZ1bmN0aW9uLCBhblxuICAgKiBhcnJheSwgb3IgYW4gb2JqZWN0IHdpdGggZmlsdGVyaW5nIGZ1bmN0aW9uc1xuICAgKi9cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCdmaWx0ZXInLCBmdW5jdGlvbih2YWx1ZSwgZmlsdGVyRnVuYykge1xuICAgIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9IGVsc2UgaWYgKCFmaWx0ZXJGdW5jKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBmaWx0ZXJGdW5jID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB2YWx1ZSA9IHZhbHVlLmZpbHRlcihmaWx0ZXJGdW5jLCB0aGlzKTtcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoZmlsdGVyRnVuYykpIHtcbiAgICAgIGZpbHRlckZ1bmMuZm9yRWFjaChmdW5jdGlvbihmdW5jKSB7XG4gICAgICAgIHZhbHVlID0gdmFsdWUuZmlsdGVyKGZ1bmMsIHRoaXMpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZmlsdGVyRnVuYyA9PT0gJ29iamVjdCcpIHtcbiAgICAgIE9iamVjdC5rZXlzKGZpbHRlckZ1bmMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhciBmdW5jID0gZmlsdGVyRnVuY1trZXldO1xuICAgICAgICBpZiAodHlwZW9mIGZ1bmMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICB2YWx1ZSA9IHZhbHVlLmZpbHRlcihmdW5jLCB0aGlzKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZTtcbiAgfSk7XG5cblxuICAvKipcbiAgICogIyMgbWFwXG4gICAqIEFkZHMgYSBmb3JtYXR0ZXIgdG8gbWFwIGFuIGFycmF5IG9yIHZhbHVlIGJ5IHRoZSBnaXZlbiBtYXBwaW5nIGZ1bmN0aW9uXG4gICAqL1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ21hcCcsIGZ1bmN0aW9uKHZhbHVlLCBtYXBGdW5jKSB7XG4gICAgaWYgKHZhbHVlID09IG51bGwgfHwgdHlwZW9mIG1hcEZ1bmMgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICByZXR1cm4gdmFsdWUubWFwKG1hcEZ1bmMsIHRoaXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbWFwRnVuYy5jYWxsKHRoaXMsIHZhbHVlKTtcbiAgICB9XG4gIH0pO1xuXG5cbiAgLyoqXG4gICAqICMjIHJlZHVjZVxuICAgKiBBZGRzIGEgZm9ybWF0dGVyIHRvIHJlZHVjZSBhbiBhcnJheSBvciB2YWx1ZSBieSB0aGUgZ2l2ZW4gcmVkdWNlIGZ1bmN0aW9uXG4gICAqL1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ3JlZHVjZScsIGZ1bmN0aW9uKHZhbHVlLCByZWR1Y2VGdW5jLCBpbml0aWFsVmFsdWUpIHtcbiAgICBpZiAodmFsdWUgPT0gbnVsbCB8fCB0eXBlb2YgbWFwRnVuYyAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAzKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5yZWR1Y2UocmVkdWNlRnVuYywgaW5pdGlhbFZhbHVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5yZWR1Y2UocmVkdWNlRnVuYyk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAzKSB7XG4gICAgICByZXR1cm4gcmVkdWNlRnVuYyhpbml0aWFsVmFsdWUsIHZhbHVlKTtcbiAgICB9XG4gIH0pO1xuXG5cbiAgLyoqXG4gICAqICMjIHJlZHVjZVxuICAgKiBBZGRzIGEgZm9ybWF0dGVyIHRvIHJlZHVjZSBhbiBhcnJheSBvciB2YWx1ZSBieSB0aGUgZ2l2ZW4gcmVkdWNlIGZ1bmN0aW9uXG4gICAqL1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ3NsaWNlJywgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBlbmRJbmRleCkge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgcmV0dXJuIHZhbHVlLnNsaWNlKGluZGV4LCBlbmRJbmRleCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gIH0pO1xuXG5cbiAgLyoqXG4gICAqICMjIGRhdGVcbiAgICogQWRkcyBhIGZvcm1hdHRlciB0byBmb3JtYXQgZGF0ZXMgYW5kIHN0cmluZ3NcbiAgICovXG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcignZGF0ZScsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgaWYgKCF2YWx1ZSkge1xuICAgICAgcmV0dXJuICcnO1xuICAgIH1cblxuICAgIGlmICghKHZhbHVlIGluc3RhbmNlb2YgRGF0ZSkpIHtcbiAgICAgIHZhbHVlID0gbmV3IERhdGUodmFsdWUpO1xuICAgIH1cblxuICAgIGlmIChpc05hTih2YWx1ZS5nZXRUaW1lKCkpKSB7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbHVlLnRvTG9jYWxlU3RyaW5nKCk7XG4gIH0pO1xuXG5cbiAgLyoqXG4gICAqICMjIGxvZ1xuICAgKiBBZGRzIGEgZm9ybWF0dGVyIHRvIGxvZyB0aGUgdmFsdWUgb2YgdGhlIGV4cHJlc3Npb24sIHVzZWZ1bCBmb3IgZGVidWdnaW5nXG4gICAqL1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ2xvZycsIGZ1bmN0aW9uKHZhbHVlLCBwcmVmaXgpIHtcbiAgICBpZiAocHJlZml4ID09IG51bGwpIHByZWZpeCA9ICdMb2c6JztcbiAgICBjb25zb2xlLmxvZyhwcmVmaXgsIHZhbHVlKTtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH0pO1xuXG5cbiAgLyoqXG4gICAqICMjIGxpbWl0XG4gICAqIEFkZHMgYSBmb3JtYXR0ZXIgdG8gbGltaXQgdGhlIGxlbmd0aCBvZiBhbiBhcnJheSBvciBzdHJpbmdcbiAgICovXG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcignbGltaXQnLCBmdW5jdGlvbih2YWx1ZSwgbGltaXQpIHtcbiAgICBpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlLnNsaWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBpZiAobGltaXQgPCAwKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5zbGljZShsaW1pdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YWx1ZS5zbGljZSgwLCBsaW1pdCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gIH0pO1xuXG5cbiAgLyoqXG4gICAqICMjIHNvcnRcbiAgICogU29ydHMgYW4gYXJyYXkgZ2l2ZW4gYSBmaWVsZCBuYW1lIG9yIHNvcnQgZnVuY3Rpb24sIGFuZCBhIGRpcmVjdGlvblxuICAgKi9cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCdzb3J0JywgZnVuY3Rpb24odmFsdWUsIHNvcnRGdW5jLCBkaXIpIHtcbiAgICBpZiAoIXNvcnRGdW5jIHx8ICFBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICBkaXIgPSAoZGlyID09PSAnZGVzYycpID8gLTEgOiAxO1xuICAgIGlmICh0eXBlb2Ygc29ydEZ1bmMgPT09ICdzdHJpbmcnKSB7XG4gICAgICB2YXIgcGFydHMgPSBzb3J0RnVuYy5zcGxpdCgnOicpO1xuICAgICAgdmFyIHByb3AgPSBwYXJ0c1swXTtcbiAgICAgIHZhciBkaXIyID0gcGFydHNbMV07XG4gICAgICBkaXIyID0gKGRpcjIgPT09ICdkZXNjJykgPyAtMSA6IDE7XG4gICAgICBkaXIgPSBkaXIgfHwgZGlyMjtcbiAgICAgIHZhciBzb3J0RnVuYyA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgaWYgKGFbcHJvcF0gPiBiW3Byb3BdKSByZXR1cm4gZGlyO1xuICAgICAgICBpZiAoYVtwcm9wXSA8IGJbcHJvcF0pIHJldHVybiAtZGlyO1xuICAgICAgICByZXR1cm4gMDtcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChkaXIgPT09IC0xKSB7XG4gICAgICB2YXIgb3JpZ0Z1bmMgPSBzb3J0RnVuYztcbiAgICAgIHNvcnRGdW5jID0gZnVuY3Rpb24oYSwgYikgeyByZXR1cm4gLW9yaWdGdW5jKGEsIGIpOyB9O1xuICAgIH1cblxuICAgIHJldHVybiB2YWx1ZS5zbGljZSgpLnNvcnQoc29ydEZ1bmMpO1xuICB9KTtcblxuXG4gIC8qKlxuICAgKiAjIyBhZGRRdWVyeVxuICAgKiBUYWtlcyB0aGUgaW5wdXQgVVJMIGFuZCBhZGRzIChvciByZXBsYWNlcykgdGhlIGZpZWxkIGluIHRoZSBxdWVyeVxuICAgKi9cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCdhZGRRdWVyeScsIGZ1bmN0aW9uKHZhbHVlLCBxdWVyeUZpZWxkLCBxdWVyeVZhbHVlKSB7XG4gICAgdmFyIHVybCA9IHZhbHVlIHx8IGxvY2F0aW9uLmhyZWY7XG4gICAgdmFyIHBhcnRzID0gdXJsLnNwbGl0KCc/Jyk7XG4gICAgdXJsID0gcGFydHNbMF07XG4gICAgdmFyIHF1ZXJ5ID0gcGFydHNbMV07XG4gICAgdmFyIGFkZGVkUXVlcnkgPSAnJztcbiAgICBpZiAocXVlcnlWYWx1ZSAhPSBudWxsKSB7XG4gICAgICBhZGRlZFF1ZXJ5ID0gcXVlcnlGaWVsZCArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudChxdWVyeVZhbHVlKTtcbiAgICB9XG5cbiAgICBpZiAocXVlcnkpIHtcbiAgICAgIHZhciBleHByID0gbmV3IFJlZ0V4cCgnXFxcXGInICsgcXVlcnlGaWVsZCArICc9W14mXSonKTtcbiAgICAgIGlmIChleHByLnRlc3QocXVlcnkpKSB7XG4gICAgICAgIHF1ZXJ5ID0gcXVlcnkucmVwbGFjZShleHByLCBhZGRlZFF1ZXJ5KTtcbiAgICAgIH0gZWxzZSBpZiAoYWRkZWRRdWVyeSkge1xuICAgICAgICBxdWVyeSArPSAnJicgKyBhZGRlZFF1ZXJ5O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBxdWVyeSA9IGFkZGVkUXVlcnk7XG4gICAgfVxuICAgIGlmIChxdWVyeSkge1xuICAgICAgdXJsICs9ICc/JyArIHF1ZXJ5O1xuICAgIH1cbiAgICByZXR1cm4gdXJsO1xuICB9KTtcblxuXG4gIHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICBmdW5jdGlvbiBlc2NhcGVIVE1MKHZhbHVlKSB7XG4gICAgZGl2LnRleHRDb250ZW50ID0gdmFsdWUgfHwgJyc7XG4gICAgcmV0dXJuIGRpdi5pbm5lckhUTUw7XG4gIH1cblxuXG4gIC8qKlxuICAgKiAjIyBlc2NhcGVcbiAgICogSFRNTCBlc2NhcGVzIGNvbnRlbnQuIEZvciB1c2Ugd2l0aCBvdGhlciBIVE1MLWFkZGluZyBmb3JtYXR0ZXJzIHN1Y2ggYXMgYXV0b2xpbmsuXG4gICAqXG4gICAqICoqRXhhbXBsZToqKlxuICAgKiBgYGB4bWxcbiAgICogPGRpdiBiaW5kLWh0bWw9XCJ0d2VldC5jb250ZW50IHwgZXNjYXBlIHwgYXV0b2xpbms6dHJ1ZVwiPjwvZGl2PlxuICAgKiBgYGBcbiAgICogKlJlc3VsdDoqXG4gICAqIGBgYHhtbFxuICAgKiA8ZGl2PkNoZWNrIG91dCA8YSBocmVmPVwiaHR0cHM6Ly9naXRodWIuY29tL2NoaXAtanMvXCIgdGFyZ2V0PVwiX2JsYW5rXCI+aHR0cHM6Ly9naXRodWIuY29tL2NoaXAtanMvPC9hPiE8L2Rpdj5cbiAgICogYGBgXG4gICAqL1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ2VzY2FwZScsIGVzY2FwZUhUTUwpO1xuXG5cbiAgLyoqXG4gICAqICMjIHBcbiAgICogSFRNTCBlc2NhcGVzIGNvbnRlbnQgd3JhcHBpbmcgcGFyYWdyYXBocyBpbiA8cD4gdGFncy5cbiAgICpcbiAgICogKipFeGFtcGxlOioqXG4gICAqIGBgYHhtbFxuICAgKiA8ZGl2IGJpbmQtaHRtbD1cInR3ZWV0LmNvbnRlbnQgfCBwIHwgYXV0b2xpbms6dHJ1ZVwiPjwvZGl2PlxuICAgKiBgYGBcbiAgICogKlJlc3VsdDoqXG4gICAqIGBgYHhtbFxuICAgKiA8ZGl2PjxwPkNoZWNrIG91dCA8YSBocmVmPVwiaHR0cHM6Ly9naXRodWIuY29tL2NoaXAtanMvXCIgdGFyZ2V0PVwiX2JsYW5rXCI+aHR0cHM6Ly9naXRodWIuY29tL2NoaXAtanMvPC9hPiE8L3A+XG4gICAqIDxwPkl0J3MgZ3JlYXQ8L3A+PC9kaXY+XG4gICAqIGBgYFxuICAgKi9cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCdwJywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICB2YXIgbGluZXMgPSAodmFsdWUgfHwgJycpLnNwbGl0KC9cXHI/XFxuLyk7XG4gICAgdmFyIGVzY2FwZWQgPSBsaW5lcy5tYXAoZnVuY3Rpb24obGluZSkgeyByZXR1cm4gZXNjYXBlSFRNTChsaW5lKSB8fCAnPGJyPic7IH0pO1xuICAgIHJldHVybiAnPHA+JyArIGVzY2FwZWQuam9pbignPC9wPjxwPicpICsgJzwvcD4nO1xuICB9KTtcblxuXG4gIC8qKlxuICAgKiAjIyBiclxuICAgKiBIVE1MIGVzY2FwZXMgY29udGVudCBhZGRpbmcgPGJyPiB0YWdzIGluIHBsYWNlIG9mIG5ld2xpbmVzIGNoYXJhY3RlcnMuXG4gICAqXG4gICAqICoqRXhhbXBsZToqKlxuICAgKiBgYGB4bWxcbiAgICogPGRpdiBiaW5kLWh0bWw9XCJ0d2VldC5jb250ZW50IHwgYnIgfCBhdXRvbGluazp0cnVlXCI+PC9kaXY+XG4gICAqIGBgYFxuICAgKiAqUmVzdWx0OipcbiAgICogYGBgeG1sXG4gICAqIDxkaXY+Q2hlY2sgb3V0IDxhIGhyZWY9XCJodHRwczovL2dpdGh1Yi5jb20vY2hpcC1qcy9cIiB0YXJnZXQ9XCJfYmxhbmtcIj5odHRwczovL2dpdGh1Yi5jb20vY2hpcC1qcy88L2E+ITxicj5cbiAgICogSXQncyBncmVhdDwvZGl2PlxuICAgKiBgYGBcbiAgICovXG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcignYnInLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHZhciBsaW5lcyA9ICh2YWx1ZSB8fCAnJykuc3BsaXQoL1xccj9cXG4vKTtcbiAgICByZXR1cm4gbGluZXMubWFwKGVzY2FwZUhUTUwpLmpvaW4oJzxicj4nKTtcbiAgfSk7XG5cblxuICAvKipcbiAgICogIyMgbmV3bGluZVxuICAgKiBIVE1MIGVzY2FwZXMgY29udGVudCBhZGRpbmcgPHA+IHRhZ3MgYXQgZG91YmxlIG5ld2xpbmVzIGFuZCA8YnI+IHRhZ3MgaW4gcGxhY2Ugb2Ygc2luZ2xlIG5ld2xpbmUgY2hhcmFjdGVycy5cbiAgICpcbiAgICogKipFeGFtcGxlOioqXG4gICAqIGBgYHhtbFxuICAgKiA8ZGl2IGJpbmQtaHRtbD1cInR3ZWV0LmNvbnRlbnQgfCBuZXdsaW5lIHwgYXV0b2xpbms6dHJ1ZVwiPjwvZGl2PlxuICAgKiBgYGBcbiAgICogKlJlc3VsdDoqXG4gICAqIGBgYHhtbFxuICAgKiA8ZGl2PjxwPkNoZWNrIG91dCA8YSBocmVmPVwiaHR0cHM6Ly9naXRodWIuY29tL2NoaXAtanMvXCIgdGFyZ2V0PVwiX2JsYW5rXCI+aHR0cHM6Ly9naXRodWIuY29tL2NoaXAtanMvPC9hPiE8YnI+XG4gICAqIEl0J3MgZ3JlYXQ8L3A+PC9kaXY+XG4gICAqIGBgYFxuICAgKi9cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCduZXdsaW5lJywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICB2YXIgcGFyYWdyYXBocyA9ICh2YWx1ZSB8fCAnJykuc3BsaXQoL1xccj9cXG5cXHMqXFxyP1xcbi8pO1xuICAgIHZhciBlc2NhcGVkID0gcGFyYWdyYXBocy5tYXAoZnVuY3Rpb24ocGFyYWdyYXBoKSB7XG4gICAgICB2YXIgbGluZXMgPSBwYXJhZ3JhcGguc3BsaXQoL1xccj9cXG4vKTtcbiAgICAgIHJldHVybiBsaW5lcy5tYXAoZXNjYXBlSFRNTCkuam9pbignPGJyPicpO1xuICAgIH0pO1xuICAgIHJldHVybiAnPHA+JyArIGVzY2FwZWQuam9pbignPC9wPjxwPicpICsgJzwvcD4nO1xuICB9KTtcblxuXG5cbiAgdmFyIHVybEV4cCA9IC8oXnxcXHN8XFwoKSgoPzpodHRwcz98ZnRwKTpcXC9cXC9bXFwtQS1aMC05K1xcdTAwMjZAI1xcLyU/PSgpfl98ITosLjtdKltcXC1BLVowLTkrXFx1MDAyNkAjXFwvJT1+KF98XSkvZ2k7XG4gIC8qKlxuICAgKiAjIyBhdXRvbGlua1xuICAgKiBBZGRzIGF1dG9tYXRpYyBsaW5rcyB0byBlc2NhcGVkIGNvbnRlbnQgKGJlIHN1cmUgdG8gZXNjYXBlIHVzZXIgY29udGVudCkuIENhbiBiZSB1c2VkIG9uIGV4aXN0aW5nIEhUTUwgY29udGVudCBhcyBpdFxuICAgKiB3aWxsIHNraXAgVVJMcyB3aXRoaW4gSFRNTCB0YWdzLiBQYXNzaW5nIHRydWUgaW4gdGhlIHNlY29uZCBwYXJhbWV0ZXIgd2lsbCBzZXQgdGhlIHRhcmdldCB0byBgX2JsYW5rYC5cbiAgICpcbiAgICogKipFeGFtcGxlOioqXG4gICAqIGBgYHhtbFxuICAgKiA8ZGl2IGJpbmQtaHRtbD1cInR3ZWV0LmNvbnRlbnQgfCBlc2NhcGUgfCBhdXRvbGluazp0cnVlXCI+PC9kaXY+XG4gICAqIGBgYFxuICAgKiAqUmVzdWx0OipcbiAgICogYGBgeG1sXG4gICAqIDxkaXY+Q2hlY2sgb3V0IDxhIGhyZWY9XCJodHRwczovL2dpdGh1Yi5jb20vY2hpcC1qcy9cIiB0YXJnZXQ9XCJfYmxhbmtcIj5odHRwczovL2dpdGh1Yi5jb20vY2hpcC1qcy88L2E+ITwvZGl2PlxuICAgKiBgYGBcbiAgICovXG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcignYXV0b2xpbmsnLCBmdW5jdGlvbih2YWx1ZSwgdGFyZ2V0KSB7XG4gICAgdGFyZ2V0ID0gKHRhcmdldCkgPyAnIHRhcmdldD1cIl9ibGFua1wiJyA6ICcnO1xuXG4gICAgcmV0dXJuICgnJyArIHZhbHVlKS5yZXBsYWNlKC88W14+XSs+fFtePF0rL2csIGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgICBpZiAobWF0Y2guY2hhckF0KDApID09PSAnPCcpIHtcbiAgICAgICAgcmV0dXJuIG1hdGNoO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG1hdGNoLnJlcGxhY2UodXJsRXhwLCAnJDE8YSBocmVmPVwiJDJcIicgKyB0YXJnZXQgKyAnPiQyPC9hPicpO1xuICAgIH0pO1xuICB9KTtcblxuXG4gIC8qKlxuICAgKlxuICAgKi9cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCdpbnQnLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHZhbHVlID0gcGFyc2VJbnQodmFsdWUpO1xuICAgIHJldHVybiBpc05hTih2YWx1ZSkgPyBudWxsIDogdmFsdWU7XG4gIH0pO1xuXG5cbiAgLyoqXG4gICAqXG4gICAqL1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ2Zsb2F0JywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICB2YWx1ZSA9IHBhcnNlRmxvYXQodmFsdWUpO1xuICAgIHJldHVybiBpc05hTih2YWx1ZSkgPyBudWxsIDogdmFsdWU7XG4gIH0pO1xuXG5cbiAgLyoqXG4gICAqXG4gICAqL1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ2Jvb2wnLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZSAmJiB2YWx1ZSAhPT0gJzAnICYmIHZhbHVlICE9PSAnZmFsc2UnO1xuICB9KTtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gVGVtcGxhdGU7XG52YXIgVmlldyA9IHJlcXVpcmUoJy4vdmlldycpO1xudmFyIGV4dGVuZCA9IHJlcXVpcmUoJy4vdXRpbC9leHRlbmQnKTtcblxuXG4vKipcbiAqICMjIFRlbXBsYXRlXG4gKiBUYWtlcyBhbiBIVE1MIHN0cmluZywgYW4gZWxlbWVudCwgYW4gYXJyYXkgb2YgZWxlbWVudHMsIG9yIGEgZG9jdW1lbnQgZnJhZ21lbnQsIGFuZCBjb21waWxlcyBpdCBpbnRvIGEgdGVtcGxhdGUuXG4gKiBJbnN0YW5jZXMgbWF5IHRoZW4gYmUgY3JlYXRlZCBhbmQgYm91bmQgdG8gYSBnaXZlbiBjb250ZXh0LlxuICogQHBhcmFtIHtTdHJpbmd8Tm9kZUxpc3R8SFRNTENvbGxlY3Rpb258SFRNTFRlbXBsYXRlRWxlbWVudHxIVE1MU2NyaXB0RWxlbWVudHxOb2RlfSBodG1sIEEgVGVtcGxhdGUgY2FuIGJlIGNyZWF0ZWRcbiAqIGZyb20gbWFueSBkaWZmZXJlbnQgdHlwZXMgb2Ygb2JqZWN0cy4gQW55IG9mIHRoZXNlIHdpbGwgYmUgY29udmVydGVkIGludG8gYSBkb2N1bWVudCBmcmFnbWVudCBmb3IgdGhlIHRlbXBsYXRlIHRvXG4gKiBjbG9uZS4gTm9kZXMgYW5kIGVsZW1lbnRzIHBhc3NlZCBpbiB3aWxsIGJlIHJlbW92ZWQgZnJvbSB0aGUgRE9NLlxuICovXG5mdW5jdGlvbiBUZW1wbGF0ZSgpIHtcbiAgdGhpcy5wb29sID0gW107XG59XG5cblxuVGVtcGxhdGUucHJvdG90eXBlID0ge1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IHZpZXcgY2xvbmVkIGZyb20gdGhpcyB0ZW1wbGF0ZS5cbiAgICovXG4gIGNyZWF0ZVZpZXc6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLnBvb2wubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gdGhpcy5wb29sLnBvcCgpO1xuICAgIH1cblxuICAgIHJldHVybiBleHRlbmQubWFrZShWaWV3LCBkb2N1bWVudC5pbXBvcnROb2RlKHRoaXMsIHRydWUpLCB0aGlzKTtcbiAgfSxcblxuICByZXR1cm5WaWV3OiBmdW5jdGlvbih2aWV3KSB7XG4gICAgaWYgKHRoaXMucG9vbC5pbmRleE9mKHZpZXcpID09PSAtMSkge1xuICAgICAgdGhpcy5wb29sLnB1c2godmlldyk7XG4gICAgfVxuICB9XG59O1xuIiwiLy8gSGVscGVyIG1ldGhvZHMgZm9yIGFuaW1hdGlvblxuZXhwb3J0cy5tYWtlRWxlbWVudEFuaW1hdGFibGUgPSBtYWtlRWxlbWVudEFuaW1hdGFibGU7XG5leHBvcnRzLmdldENvbXB1dGVkQ1NTID0gZ2V0Q29tcHV0ZWRDU1M7XG5leHBvcnRzLmFuaW1hdGVFbGVtZW50ID0gYW5pbWF0ZUVsZW1lbnQ7XG5cbmZ1bmN0aW9uIG1ha2VFbGVtZW50QW5pbWF0YWJsZShlbGVtZW50KSB7XG4gIC8vIEFkZCBwb2x5ZmlsbCBqdXN0IG9uIHRoaXMgZWxlbWVudFxuICBpZiAoIWVsZW1lbnQuYW5pbWF0ZSkge1xuICAgIGVsZW1lbnQuYW5pbWF0ZSA9IGFuaW1hdGVFbGVtZW50O1xuICB9XG5cbiAgLy8gTm90IGEgcG9seWZpbGwgYnV0IGEgaGVscGVyXG4gIGlmICghZWxlbWVudC5nZXRDb21wdXRlZENTUykge1xuICAgIGVsZW1lbnQuZ2V0Q29tcHV0ZWRDU1MgPSBnZXRDb21wdXRlZENTUztcbiAgfVxuXG4gIHJldHVybiBlbGVtZW50O1xufVxuXG4vKipcbiAqIEdldCB0aGUgY29tcHV0ZWQgc3R5bGUgb24gYW4gZWxlbWVudC5cbiAqL1xuZnVuY3Rpb24gZ2V0Q29tcHV0ZWRDU1Moc3R5bGVOYW1lKSB7XG4gIGlmICh0aGlzLm93bmVyRG9jdW1lbnQuZGVmYXVsdFZpZXcub3BlbmVyKSB7XG4gICAgcmV0dXJuIHRoaXMub3duZXJEb2N1bWVudC5kZWZhdWx0Vmlldy5nZXRDb21wdXRlZFN0eWxlKHRoaXMpW3N0eWxlTmFtZV07XG4gIH1cbiAgcmV0dXJuIHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHRoaXMpW3N0eWxlTmFtZV07XG59XG5cbi8qKlxuICogVmVyeSBiYXNpYyBwb2x5ZmlsbCBmb3IgRWxlbWVudC5hbmltYXRlIGlmIGl0IGRvZXNuJ3QgZXhpc3QuIElmIGl0IGRvZXMsIHVzZSB0aGUgbmF0aXZlLlxuICogVGhpcyBvbmx5IHN1cHBvcnRzIHR3byBjc3Mgc3RhdGVzLiBJdCB3aWxsIG92ZXJ3cml0ZSBleGlzdGluZyBzdHlsZXMuIEl0IGRvZXNuJ3QgcmV0dXJuIGFuIGFuaW1hdGlvbiBwbGF5IGNvbnRyb2wuIEl0XG4gKiBvbmx5IHN1cHBvcnRzIGR1cmF0aW9uLCBkZWxheSwgYW5kIGVhc2luZy4gUmV0dXJucyBhbiBvYmplY3Qgd2l0aCBhIHByb3BlcnR5IG9uZmluaXNoLlxuICovXG5mdW5jdGlvbiBhbmltYXRlRWxlbWVudChjc3MsIG9wdGlvbnMpIHtcbiAgaWYgKCFBcnJheS5pc0FycmF5KGNzcykgfHwgY3NzLmxlbmd0aCAhPT0gMikge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2FuaW1hdGUgcG9seWZpbGwgcmVxdWlyZXMgYW4gYXJyYXkgZm9yIGNzcyB3aXRoIGFuIGluaXRpYWwgYW5kIGZpbmFsIHN0YXRlJyk7XG4gIH1cblxuICBpZiAoIW9wdGlvbnMgfHwgIW9wdGlvbnMuaGFzT3duUHJvcGVydHkoJ2R1cmF0aW9uJykpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdhbmltYXRlIHBvbHlmaWxsIHJlcXVpcmVzIG9wdGlvbnMgd2l0aCBhIGR1cmF0aW9uJyk7XG4gIH1cblxuICB2YXIgZHVyYXRpb24gPSBvcHRpb25zLmR1cmF0aW9uIHx8IDA7XG4gIHZhciBkZWxheSA9IG9wdGlvbnMuZGVsYXkgfHwgMDtcbiAgdmFyIGVhc2luZyA9IG9wdGlvbnMuZWFzaW5nO1xuICB2YXIgaW5pdGlhbENzcyA9IGNzc1swXTtcbiAgdmFyIGZpbmFsQ3NzID0gY3NzWzFdO1xuICB2YXIgYWxsQ3NzID0ge307XG4gIHZhciBwbGF5YmFjayA9IHsgb25maW5pc2g6IG51bGwgfTtcblxuICBPYmplY3Qua2V5cyhpbml0aWFsQ3NzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIGFsbENzc1trZXldID0gdHJ1ZTtcbiAgICBlbGVtZW50LnN0eWxlW2tleV0gPSBpbml0aWFsQ3NzW2tleV07XG4gIH0pO1xuXG4gIC8vIHRyaWdnZXIgcmVmbG93XG4gIGVsZW1lbnQub2Zmc2V0V2lkdGg7XG5cbiAgdmFyIHRyYW5zaXRpb25PcHRpb25zID0gJyAnICsgZHVyYXRpb24gKyAnbXMnO1xuICBpZiAoZWFzaW5nKSB7XG4gICAgdHJhbnNpdGlvbk9wdGlvbnMgKz0gJyAnICsgZWFzaW5nO1xuICB9XG4gIGlmIChkZWxheSkge1xuICAgIHRyYW5zaXRpb25PcHRpb25zICs9ICcgJyArIGRlbGF5ICsgJ21zJztcbiAgfVxuXG4gIGVsZW1lbnQuc3R5bGUudHJhbnNpdGlvbiA9IE9iamVjdC5rZXlzKGZpbmFsQ3NzKS5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgcmV0dXJuIGtleSArIHRyYW5zaXRpb25PcHRpb25zXG4gIH0pLmpvaW4oJywgJyk7XG5cbiAgT2JqZWN0LmtleXMoZmluYWxDc3MpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgYWxsQ3NzW2tleV0gPSB0cnVlO1xuICAgIGVsZW1lbnQuc3R5bGVba2V5XSA9IGZpbmFsQ3NzW2tleV07XG4gIH0pO1xuXG4gIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgT2JqZWN0LmtleXMoYWxsQ3NzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgZWxlbWVudC5zdHlsZVtrZXldID0gJyc7XG4gICAgfSk7XG5cbiAgICBpZiAocGxheWJhY2sub25maW5pc2gpIHtcbiAgICAgIHBsYXliYWNrLm9uZmluaXNoKCk7XG4gICAgfVxuICB9LCBkdXJhdGlvbiArIGRlbGF5KTtcblxuICByZXR1cm4gcGxheWJhY2s7XG59XG4iLCJ2YXIgZ2xvYmFsID0gKGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcyB9KSgpO1xudmFyIHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xubW9kdWxlLmV4cG9ydHMgPSBleHRlbmQ7XG5leHRlbmQubWFrZSA9IG1ha2U7XG5cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IHByb3RvdHlwZSBmb3IgdGhlIGdpdmVuIGNvbnRydWN0b3IgYW5kIHNldHMgYW4gYGV4dGVuZGAgbWV0aG9kIG9uIGl0LiBJZiBgZXh0ZW5kYCBpcyBjYWxsZWQgZnJvbSBhXG4gKiBpdCB3aWxsIGV4dGVuZCB0aGF0IGNsYXNzLlxuICovXG5mdW5jdGlvbiBleHRlbmQoY29uc3RydWN0b3IsIHByb3RvdHlwZSkge1xuICB2YXIgc3VwZXJDbGFzcyA9IHRoaXMgPT09IGdsb2JhbCA/IE9iamVjdCA6IHRoaXM7XG4gIGlmICh0eXBlb2YgY29uc3RydWN0b3IgIT09ICdmdW5jdGlvbicgJiYgIXByb3RvdHlwZSkge1xuICAgIHByb3RvdHlwZSA9IGNvbnN0cnVjdG9yO1xuICAgIGNvbnN0cnVjdG9yID0gZnVuY3Rpb24oKSB7XG4gICAgICBzdXBlckNsYXNzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfVxuICBjb25zdHJ1Y3Rvci5leHRlbmQgPSBleHRlbmQ7XG4gIHZhciBkZXNjcmlwdG9ycyA9IGdldFByb3RvdHlwZURlc2NyaXB0b3JzKGNvbnN0cnVjdG9yLCBwcm90b3R5cGUpO1xuICBjb25zdHJ1Y3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ2xhc3MucHJvdG90eXBlLCBkZXNjcmlwdG9ycyk7XG4gIHJldHVybiBjb25zdHJ1Y3Rvcjtcbn1cblxuXG4vKipcbiAqIE1ha2VzIGEgbmF0aXZlIG9iamVjdCBwcmV0ZW5kIHRvIGJlIGEgY2xhc3MgKGUuZy4gYWRkcyBtZXRob2RzIHRvIGEgRG9jdW1lbnRGcmFnbWVudCBhbmQgY2FsbHMgdGhlIGNvbnN0cnVjdG9yKS5cbiAqL1xuZnVuY3Rpb24gbWFrZShjb25zdHJ1Y3Rvciwgb2JqZWN0KSB7XG4gIGlmICh0eXBlb2YgY29uc3RydWN0b3IgIT09ICdmdW5jdGlvbicgfHwgdHlwZW9mIG9iamVjdCAhPT0gJ29iamVjdCcpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdtYWtlIG11c3QgYWNjZXB0IGEgZnVuY3Rpb24gY29uc3RydWN0b3IgYW5kIGFuIG9iamVjdCcpO1xuICB9XG4gIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICB2YXIgcHJvdG8gPSBjb25zdHJ1Y3Rvci5wcm90b3R5cGU7XG4gIGZvciAodmFyIGtleSBpbiBwcm90bykge1xuICAgIG9iamVjdFtrZXldID0gcHJvdG9ba2V5XTtcbiAgfVxuICBjb25zdHJ1Y3Rvci5hcHBseShvYmplY3QsIGFyZ3MpO1xuICByZXR1cm4gb2JqZWN0O1xufVxuXG5cbmZ1bmN0aW9uIGdldFByb3RvdHlwZURlc2NyaXB0b3JzKGNvbnN0cnVjdG9yLCBwcm90b3R5cGUpIHtcbiAgdmFyIGRlc2NyaXB0b3JzID0ge1xuICAgIGNvbnN0cnVjdG9yOiB7IHdyaXRhYmxlOiB0cnVlLCBjb25maWd1cmFibGU6IHRydWUsIHZhbHVlOiBjb25zdHJ1Y3RvciB9XG4gIH07XG5cbiAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMocHJvdG90eXBlKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IocHJvdG90eXBlLCBuYW1lKTtcbiAgICBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBmYWxzZTtcbiAgICBkZXNjcmlwdG9yc1tuYW1lXSA9IGRlc2NyaXB0b3I7XG4gIH0pO1xuICByZXR1cm4gZGVzY3JpcHRvcnM7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHRvRnJhZ21lbnQ7XG5cbi8vIENvbnZlcnQgc3R1ZmYgaW50byBkb2N1bWVudCBmcmFnbWVudHMuIFN0dWZmIGNhbiBiZTpcbi8vICogQSBzdHJpbmcgb2YgSFRNTCB0ZXh0XG4vLyAqIEFuIGVsZW1lbnQgb3IgdGV4dCBub2RlXG4vLyAqIEEgTm9kZUxpc3Qgb3IgSFRNTENvbGxlY3Rpb24gKGUuZy4gYGVsZW1lbnQuY2hpbGROb2Rlc2Agb3IgYGVsZW1lbnQuY2hpbGRyZW5gKVxuLy8gKiBBIGpRdWVyeSBvYmplY3Rcbi8vICogQSBzY3JpcHQgZWxlbWVudCB3aXRoIGEgYHR5cGVgIGF0dHJpYnV0ZSBvZiBgXCJ0ZXh0LypcImAgKGUuZy4gYDxzY3JpcHQgdHlwZT1cInRleHQvaHRtbFwiPk15IHRlbXBsYXRlIGNvZGUhPC9zY3JpcHQ+YClcbi8vICogQSB0ZW1wbGF0ZSBlbGVtZW50IChlLmcuIGA8dGVtcGxhdGU+TXkgdGVtcGxhdGUgY29kZSE8L3RlbXBsYXRlPmApXG5mdW5jdGlvbiB0b0ZyYWdtZW50KGh0bWwpIHtcbiAgaWYgKGh0bWwgaW5zdGFuY2VvZiBEb2N1bWVudEZyYWdtZW50KSB7XG4gICAgcmV0dXJuIGh0bWw7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGh0bWwgPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIHN0cmluZ1RvRnJhZ21lbnQoaHRtbCk7XG4gIH0gZWxzZSBpZiAoaHRtbCBpbnN0YW5jZW9mIE5vZGUpIHtcbiAgICByZXR1cm4gbm9kZVRvRnJhZ21lbnQoaHRtbCk7XG4gIH0gZWxzZSBpZiAoaHRtbC5oYXNPd25Qcm9wZXJ0eSgnbGVuZ3RoJykpIHtcbiAgICByZXR1cm4gbGlzdFRvRnJhZ21lbnQoaHRtbCk7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5zdXBwb3J0ZWQgVGVtcGxhdGUgVHlwZTogQ2Fubm90IGNvbnZlcnQgYCcgKyBodG1sICsgJ2AgaW50byBhIGRvY3VtZW50IGZyYWdtZW50LicpO1xuICB9XG59XG5cbi8vIENvbnZlcnRzIGFuIEhUTUwgbm9kZSBpbnRvIGEgZG9jdW1lbnQgZnJhZ21lbnQuIElmIGl0IGlzIGEgPHRlbXBsYXRlPiBub2RlIGl0cyBjb250ZW50cyB3aWxsIGJlIHVzZWQuIElmIGl0IGlzIGFcbi8vIDxzY3JpcHQ+IG5vZGUgaXRzIHN0cmluZy1iYXNlZCBjb250ZW50cyB3aWxsIGJlIGNvbnZlcnRlZCB0byBIVE1MIGZpcnN0LCB0aGVuIHVzZWQuIE90aGVyd2lzZSBhIGNsb25lIG9mIHRoZSBub2RlXG4vLyBpdHNlbGYgd2lsbCBiZSB1c2VkLlxuZnVuY3Rpb24gbm9kZVRvRnJhZ21lbnQobm9kZSkge1xuICBpZiAobm9kZS5jb250ZW50IGluc3RhbmNlb2YgRG9jdW1lbnRGcmFnbWVudCkge1xuICAgIHJldHVybiBub2RlLmNvbnRlbnQ7XG4gIH0gZWxzZSBpZiAobm9kZS50YWdOYW1lID09PSAnU0NSSVBUJykge1xuICAgIHJldHVybiBzdHJpbmdUb0ZyYWdtZW50KG5vZGUuaW5uZXJIVE1MKTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgaWYgKG5vZGUudGFnTmFtZSA9PT0gJ1RFTVBMQVRFJykge1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBub2RlLmNoaWxkTm9kZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKG5vZGUuY2hpbGROb2Rlc1tpXSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKG5vZGUpO1xuICAgIH1cbiAgICByZXR1cm4gZnJhZ21lbnQ7XG4gIH1cbn1cblxuLy8gQ29udmVydHMgYW4gSFRNTENvbGxlY3Rpb24sIE5vZGVMaXN0LCBqUXVlcnkgb2JqZWN0LCBvciBhcnJheSBpbnRvIGEgZG9jdW1lbnQgZnJhZ21lbnQuXG5mdW5jdGlvbiBsaXN0VG9GcmFnbWVudChsaXN0KSB7XG4gIHZhciBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBsaXN0Lmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIC8vIFVzZSB0b0ZyYWdtZW50IHNpbmNlIHRoaXMgbWF5IGJlIGFuIGFycmF5IG9mIHRleHQsIGEgalF1ZXJ5IG9iamVjdCBvZiBgPHRlbXBsYXRlPmBzLCBldGMuXG4gICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQodG9GcmFnbWVudChsaXN0W2ldKSk7XG4gIH1cbiAgcmV0dXJuIGZyYWdtZW50O1xufVxuXG4vLyBDb252ZXJ0cyBhIHN0cmluZyBvZiBIVE1MIHRleHQgaW50byBhIGRvY3VtZW50IGZyYWdtZW50LlxuZnVuY3Rpb24gc3RyaW5nVG9GcmFnbWVudChzdHJpbmcpIHtcbiAgdmFyIHRlbXBsYXRlRWxlbWVudDtcbiAgdGVtcGxhdGVFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGVtcGxhdGUnKTtcbiAgdGVtcGxhdGVFbGVtZW50LmlubmVySFRNTCA9IHN0cmluZztcbiAgcmV0dXJuIHRlbXBsYXRlRWxlbWVudC5jb250ZW50O1xufVxuXG4vLyBJZiBIVE1MIFRlbXBsYXRlcyBhcmUgbm90IGF2YWlsYWJsZSAoZS5nLiBpbiBJRSkgdGhlbiB1c2UgYW4gb2xkZXIgbWV0aG9kIHRvIHdvcmsgd2l0aCBjZXJ0YWluIGVsZW1lbnRzLlxuaWYgKCFkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZW1wbGF0ZScpLmNvbnRlbnQgaW5zdGFuY2VvZiBEb2N1bWVudEZyYWdtZW50KSB7XG4gIHN0cmluZ1RvRnJhZ21lbnQgPSAoZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRhZ0V4cCA9IC88KFtcXHc6LV0rKS87XG5cbiAgICAvLyBDb3BpZWQgZnJvbSBqUXVlcnkgKGh0dHBzOi8vZ2l0aHViLmNvbS9qcXVlcnkvanF1ZXJ5L2Jsb2IvbWFzdGVyL0xJQ0VOU0UudHh0KVxuICAgIHZhciB3cmFwTWFwID0ge1xuICAgICAgb3B0aW9uOiBbIDEsICc8c2VsZWN0IG11bHRpcGxlPVwibXVsdGlwbGVcIj4nLCAnPC9zZWxlY3Q+JyBdLFxuICAgICAgbGVnZW5kOiBbIDEsICc8ZmllbGRzZXQ+JywgJzwvZmllbGRzZXQ+JyBdLFxuICAgICAgdGhlYWQ6IFsgMSwgJzx0YWJsZT4nLCAnPC90YWJsZT4nIF0sXG4gICAgICB0cjogWyAyLCAnPHRhYmxlPjx0Ym9keT4nLCAnPC90Ym9keT48L3RhYmxlPicgXSxcbiAgICAgIHRkOiBbIDMsICc8dGFibGU+PHRib2R5Pjx0cj4nLCAnPC90cj48L3Rib2R5PjwvdGFibGU+JyBdLFxuICAgICAgY29sOiBbIDIsICc8dGFibGU+PHRib2R5PjwvdGJvZHk+PGNvbGdyb3VwPicsICc8L2NvbGdyb3VwPjwvdGFibGU+JyBdLFxuICAgICAgYXJlYTogWyAxLCAnPG1hcD4nLCAnPC9tYXA+JyBdLFxuICAgICAgX2RlZmF1bHQ6IFsgMCwgJycsICcnIF1cbiAgICB9O1xuICAgIHdyYXBNYXAub3B0Z3JvdXAgPSB3cmFwTWFwLm9wdGlvbjtcbiAgICB3cmFwTWFwLnRib2R5ID0gd3JhcE1hcC50Zm9vdCA9IHdyYXBNYXAuY29sZ3JvdXAgPSB3cmFwTWFwLmNhcHRpb24gPSB3cmFwTWFwLnRoZWFkO1xuICAgIHdyYXBNYXAudGggPSB3cmFwTWFwLnRkO1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIHN0cmluZ1RvRnJhZ21lbnQoc3RyaW5nKSB7XG4gICAgICB2YXIgdGFnID0gc3RyaW5nLm1hdGNoKHRhZ0V4cCk7XG4gICAgICB2YXIgcGFydHMgPSB3cmFwTWFwW3RhZ10gfHwgd3JhcE1hcC5fZGVmYXVsdDtcbiAgICAgIHZhciBkZXB0aCA9IHBhcnRzWzBdO1xuICAgICAgdmFyIHByZWZpeCA9IHBhcnRzWzFdO1xuICAgICAgdmFyIHBvc3RmaXggPSBwYXJ0c1syXTtcbiAgICAgIHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIGRpdi5pbm5lckhUTUwgPSBwcmVmaXggKyBzdHJpbmcgKyBwb3N0Zml4O1xuICAgICAgd2hpbGUgKGRlcHRoLS0pIHtcbiAgICAgICAgZGl2ID0gZGl2Lmxhc3RDaGlsZDtcbiAgICAgIH1cbiAgICAgIHZhciBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICAgIHdoaWxlIChkaXYuZmlyc3RDaGlsZCkge1xuICAgICAgICBmcmFnbWVudC5hcHBlbmRDaGlsZChkaXYuZmlyc3RDaGlsZCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZnJhZ21lbnQ7XG4gICAgfTtcbiAgfSkoKTtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gVmlldztcblxuXG4vKipcbiAqICMjIFZpZXdcbiAqIEEgRG9jdW1lbnRGcmFnbWVudCB3aXRoIGJpbmRpbmdzLlxuICovXG5mdW5jdGlvbiBWaWV3KHRlbXBsYXRlKSB7XG4gIHRoaXMudGVtcGxhdGUgPSB0ZW1wbGF0ZTtcbiAgdGhpcy5maXJzdFZpZXdOb2RlID0gdGhpcy5maXJzdENoaWxkO1xuICB0aGlzLmxhc3RWaWV3Tm9kZSA9IHRoaXMubGFzdENoaWxkO1xuICBpZiAodGhpcy5maXJzdFZpZXdOb2RlKSB7XG4gICAgdGhpcy5maXJzdFZpZXdOb2RlLnZpZXcgPSB0aGlzO1xuICAgIHRoaXMubGFzdFZpZXdOb2RlLnZpZXcgPSB0aGlzO1xuICB9XG4gIHRoaXMuYmluZGluZ3MgPSB0aGlzLnRlbXBsYXRlLmJpbmRpbmdzLm1hcChmdW5jdGlvbihiaW5kaW5nKSB7XG4gICAgcmV0dXJuIGJpbmRpbmcuY2xvbmVGb3JWaWV3KHRoaXMpO1xuICB9LCB0aGlzKTtcbn1cblxuXG5WaWV3LnByb3RvdHlwZSA9IHtcblxuICAvKipcbiAgICogUmVtb3ZlcyBhIHZpZXcgZnJvbSB0aGUgRE9NLiBBIHZpZXcgaXMgYSBEb2N1bWVudEZyYWdtZW50LCBzbyBgcmVtb3ZlKClgIHJldHVybnMgYWxsIGl0cyBub2RlcyB0byBpdHNlbGYuXG4gICAqL1xuICByZW1vdmU6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBub2RlID0gdGhpcy5maXJzdFZpZXdOb2RlO1xuICAgIHZhciBuZXh0O1xuXG4gICAgaWYgKG5vZGUucGFyZW50Tm9kZSAhPT0gdGhpcykge1xuICAgICAgLy8gUmVtb3ZlIGFsbCB0aGUgbm9kZXMgYW5kIHB1dCB0aGVtIGJhY2sgaW50byB0aGlzIGZyYWdtZW50XG4gICAgICB3aGlsZSAobm9kZSkge1xuICAgICAgICBuZXh0ID0gKG5vZGUgPT09IHRoaXMubGFzdFZpZXdOb2RlKSA/IG51bGwgOiBub2RlLm5leHRTaWJsaW5nO1xuICAgICAgICB0aGlzLmFwcGVuZENoaWxkKG5vZGUpO1xuICAgICAgICBub2RlID0gbmV4dDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGEgdmlldyAoaWYgbm90IGFscmVhZHkgcmVtb3ZlZCkgYW5kIGFkZHMgdGhlIHZpZXcgdG8gaXRzIHRlbXBsYXRlJ3MgcG9vbC5cbiAgICovXG4gIGRpc3Bvc2U6IGZ1bmN0aW9uKCkge1xuICAgIC8vIE1ha2Ugc3VyZSB0aGUgdmlldyBpcyByZW1vdmVkIGZyb20gdGhlIERPTVxuICAgIHRoaXMudW5iaW5kKCk7XG4gICAgdGhpcy5yZW1vdmUoKTtcbiAgICBpZiAodGhpcy50ZW1wbGF0ZSkge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5yZXR1cm5WaWV3KHRoaXMpO1xuICAgIH1cbiAgfSxcblxuXG4gIC8qKlxuICAgKiBCaW5kcyBhIHZpZXcgdG8gYSBnaXZlbiBjb250ZXh0LlxuICAgKi9cbiAgYmluZDogZnVuY3Rpb24oY29udGV4dCkge1xuICAgIHRoaXMuYmluZGluZ3MuZm9yRWFjaChmdW5jdGlvbihiaW5kaW5nKSB7XG4gICAgICBiaW5kaW5nLmJpbmQoY29udGV4dCk7XG4gICAgfSk7XG4gIH0sXG5cblxuICAvKipcbiAgICogVW5iaW5kcyBhIHZpZXcgZnJvbSBhbnkgY29udGV4dC5cbiAgICovXG4gIHVuYmluZDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5iaW5kaW5ncy5mb3JFYWNoKGZ1bmN0aW9uKGJpbmRpbmcpIHtcbiAgICAgIGJpbmRpbmcudW5iaW5kKCk7XG4gICAgfSk7XG4gIH1cbn07XG4iXX0=
