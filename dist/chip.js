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
  var app = this;
  var fragments = this.fragments;

  fragments.registerElement(elementName, {
    priority: 200,

    compiled: function() {
      if (this.element.childNodes.length) {
        // Save the contents of this component to insert within
        this.content = fragments.createTemplate(this.element.childNodes);
      }
    },

    created: function() {
      this.view = app.template(templateName).createView();
      this.element.appendChild(this.view);
    },

    bound: function() {
      this.context._partialContent = this.content;
      this.lastContext = this.context;
      this.view.bind(this.context);
    },

    unbound: function() {
      delete this.lastContext._partialContent;
      this.lastContext = null;
      this.view.unbind();
    }

  });

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
    return this.controllers[name] ||
      (typeof window[name + 'Controller'] === 'function' ? window[name + 'Controller'] : null);
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
    var parts = path.split('/');
    var length = parts[parts.length - 1] === '*' ? Infinity : parts.length;

    // If the handler is a string load the controller/template by that name.
    var name = handler;
    callback = function(req, next) {
      // Run a previous route first and allow it to then run this one again after
      if (runBefore) {
        runBefore(req, callback);
      }
      var matchingPath = req.path.split('/').slice(0, length).join('/');
      app.routePath.push({ name: name, path: matchingPath });
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
      callback(app.appController, next);
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

    getName: function(value) {
      return value;
    },

    updated: function(value) {
      if (this.animate && this.context) {
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

      var name = this.getName(value);
      var template = app.template(name);

      if (template) {
        this.controller = this.context.createController({ element: this.element, name: name });
        this.showing = template.createView();
        this.element.appendChild(this.showing);
        this.container.bind(this.controller);
        this.showing.bind(this.controller);
      }
    },

    updatedAnimated: function(value) {
      this.lastValue = value;
      if (this.animating) {
        // Obsoleted, will change after animation is finished.
        this.showing.unbind();
        return;
      }

      if (this.showing) {
        this.animating = true;
        this.showing.unbind();
        this.animateOut(this.container, function() {
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

      var name = this.getName(value);
      var template = app.template(name);

      if (template) {
        this.controller = this.context.createController({ element: this.element, name: name });
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
    },

    unbound: function() {
      if (this.showing) {
        this.showing.unbind();
      }
      this.lastValue = null;
      this.animating = false;
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
    compiled: function() {
      if (this.element.childNodes.length) {
        this.defaultContent = fragments.createTemplate(this.element.childNodes);
      }
    },
    bound: function() {
      var template = this.context._partialContent || this.defaultContent;
      if (template) {
        this.content = template.createView();
        this.element.appendChild(this.content);
        this.content.bind(this.context);
      }
    },
    unbound: function() {
      if (this.content) {
        this.content.dispose();
        this.content = null;
      }
    }
  });



  fragments.registerAttribute('[route]', PartialBinder.extend({
    compiled: function() {
      PartialBinder.prototype.compiled.call(this);
      this.expression = 'routePath[routeDepth]';
    },

    bind: function(context) {
      // Delete any depth existing on the controller and set its depth to 1 more than its parent controllers.
      delete context.routeDepth;
      context.routeDepth = context.routeDepth == null ? 0 : context.routeDepth + 1;
      return PartialBinder.prototype.bind.apply(this, arguments);
    },

    getName: function(value) {
      return value ? value.name : undefined;
    }
  }));



  fragments.registerAttribute('[controller]', {
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
    },

    disposed: function() {
      this.bindings.forEach(function(binding) {
        binding.dispose();
      });
    }
  });




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
  if (typeof skipUpdate === 'function') {
    callback = skipUpdate;
    skipUpdate = false;
  }

  if (Array.isArray(expr)) {
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
  animateOut: function(node, callback) {
    if (node.firstViewNode) node = node.firstViewNode;

    this.animateNode('out', node, function() {
      if (callback) callback.call(this);
    });
  },

  /**
   * Helper method to insert a node in the DOM before another node, allowing for animations to occur. `callback` will
   * be called when finished. If `before` is not provided then the animation will be run without inserting the node.
   */
  animateIn: function(node, callback) {
    if (node.firstViewNode) node = node.firstViewNode;
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

      if (direction === 'in') {
        var next = node.nextSibling, parent = node.parentNode;
        parent.removeChild(node);
        node.classList.add(willName);
        parent.insertBefore(node, next);
      } else {
        // trigger reflow
        node.offsetWidth = node.offsetWidth;
      }

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


  // Cleans up binding completely
  dispose: function() {
    this.unbind();
    if (this.observer) {
      // This will clear it out, nullifying any data stored
      this.observer.sync();
    }
    this.disposed();
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

  // The function to run when the binding is disposed
  disposed: function() {},

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

    if (name === this.animateAttribute) {
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
   * TODO: old docs, rewrite, there is an extra argument named `setter` which will be true when the expression is being "set" instead of "get"
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
      var result = this.setter.call(this.context, Observer.formatters, value);
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
      if (this.animate && this.context) {
        this.updatedAnimated(index);
      } else {
        this.updatedRegular(index);
      }
    },

    add: function(view) {
      this.element.parentNode.insertBefore(view, this.element.nextSibling);
    },

    // Doesn't do much, but allows sub-classes to alter the functionality.
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
        // Obsoleted, will change after animation is finished.
        this.showing.unbind();
        return;
      }

      if (this.showing) {
        this.animating = true;
        this.showing.unbind();
        this.animateOut(this.showing, function() {
          this.animating = false;

          if (this.showing) {
            // Make sure this wasn't unbound while we were animating (e.g. by a parent `if` that doesn't animate)
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
      if (this.showing) {
        this.showing.unbind();
      }
      this.lastValue = null;
      this.animating = false;
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

    removeView: function(view) {
      view.dispose();
      view._repeatItem_ = null;
    },

    updated: function(value, oldValue, changes) {
      if (!changes || !this.context) {
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
      var allAdded = [];
      var allRemoved = [];
      this.animating = true;

      // Run updates which occured while this was animating.
      function whenDone() {
        // The last animation finished will run this
        if (--whenDone.count !== 0) return;

        allRemoved.forEach(this.removeView);

        this.animating = false;
        if (this.valueWhileAnimating) {
          var changes = diff.arrays(this.valueWhileAnimating, animatingValue);
          this.updateChangesAnimated(this.valueWhileAnimating, changes);
          this.valueWhileAnimating = null;
        }
      }
      whenDone.count = 0;

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
        view.unbind();
        this.animateOut(view, whenDone);
      }, this);
    },

    unbound: function() {
      this.views.forEach(function(view) {
        view.unbind();
      });
      this.valueWhileAnimating = null;
      this.animating = false;
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
  function escapeHTML(value, setter) {
    if (setter) {
      div.innerHTML = value;
      return div.textContent;
    } else {
      div.textContent = value || '';
      return div.innerHTML;
    }
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
  fragments.registerFormatter('p', function(value, setter) {
    if (setter) {
      return escapeHTML(value, setter);
    } else {
      var lines = (value || '').split(/\r?\n/);
      var escaped = lines.map(function(line) { return escapeHTML(line) || '<br>'; });
      return '<p>' + escaped.join('</p>\n<p>') + '</p>';
    }
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
  fragments.registerFormatter('br', function(value, setter) {
    if (setter) {
      return escapeHTML(value, setter);
    } else {
      var lines = (value || '').split(/\r?\n/);
      return lines.map(escapeHTML).join('<br>\n');
    }
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
  fragments.registerFormatter('newline', function(value, setter) {
    if (setter) {
      return escapeHTML(value, setter);
    } else {
      var paragraphs = (value || '').split(/\r?\n\s*\r?\n/);
      var escaped = paragraphs.map(function(paragraph) {
        var lines = paragraph.split(/\r?\n/);
        return lines.map(escapeHTML).join('<br>\n');
      });
      return '<p>' + escaped.join('</p>\n\n<p>') + '</p>';
    }
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
  } else if ('length' in html) {
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
    if (l === list.length + 1) {
      // adjust for NodeLists which are live, they shrink as we pull nodes out of the DOM
      i--;
      l--;
    }
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
  this.bindings = this.template.bindings.map(function(binding) {
    return binding.cloneForView(this);
  }, this);
  this.firstViewNode = this.firstChild;
  this.lastViewNode = this.lastChild;
  if (this.firstViewNode) {
    this.firstViewNode.view = this;
    this.lastViewNode.view = this;
  }
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
    this.bindings.forEach(function(binding) {
      binding.dispose();
    });

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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsInNyYy9hcHAuanMiLCJzcmMvYmluZGVycy5qcyIsInNyYy9jaGlwLmpzIiwic3JjL2NvbnRyb2xsZXIuanMiLCJzcmMvZXZlbnRzLmpzIiwic3JjL3JvdXRlci5qcyIsIi4uL2ZyYWdtZW50cy1qcy9pbmRleC5qcyIsIi4uL2ZyYWdtZW50cy1qcy9zcmMvYW5pbWF0ZWRCaW5kaW5nLmpzIiwiLi4vZnJhZ21lbnRzLWpzL3NyYy9iaW5kaW5nLmpzIiwiLi4vZnJhZ21lbnRzLWpzL3NyYy9jb21waWxlLmpzIiwiLi4vZnJhZ21lbnRzLWpzL3NyYy9mcmFnbWVudHMuanMiLCIuLi9mcmFnbWVudHMtanMvc3JjL29ic2VydmVyL2RpZmYuanMiLCIuLi9mcmFnbWVudHMtanMvc3JjL29ic2VydmVyL2V4cHJlc3Npb24uanMiLCIuLi9mcmFnbWVudHMtanMvc3JjL29ic2VydmVyL2luZGV4LmpzIiwiLi4vZnJhZ21lbnRzLWpzL3NyYy9vYnNlcnZlci9vYnNlcnZlci5qcyIsIi4uL2ZyYWdtZW50cy1qcy9zcmMvcmVnaXN0ZXJlZC9hbmltYXRpb25zLmpzIiwiLi4vZnJhZ21lbnRzLWpzL3NyYy9yZWdpc3RlcmVkL2JpbmRlcnMuanMiLCIuLi9mcmFnbWVudHMtanMvc3JjL3JlZ2lzdGVyZWQvZm9ybWF0dGVycy5qcyIsIi4uL2ZyYWdtZW50cy1qcy9zcmMvdGVtcGxhdGUuanMiLCIuLi9mcmFnbWVudHMtanMvc3JjL3V0aWwvYW5pbWF0aW9uLmpzIiwiLi4vZnJhZ21lbnRzLWpzL3NyYy91dGlsL2V4dGVuZC5qcyIsIi4uL2ZyYWdtZW50cy1qcy9zcmMvdXRpbC90b0ZyYWdtZW50LmpzIiwiLi4vZnJhZ21lbnRzLWpzL3NyYy92aWV3LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDemFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNVZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25LQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25LQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdrQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdFlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4WUE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaDBCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDalpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vc3JjL2NoaXAnKTtcbiIsIm1vZHVsZS5leHBvcnRzID0gQXBwO1xudmFyIFJvdXRlciA9IHJlcXVpcmUoJy4vcm91dGVyJyk7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnLi9ldmVudHMnKTtcbnZhciBjcmVhdGVGcmFnbWVudHMgPSByZXF1aXJlKCdmcmFnbWVudHMtanMnKS5jcmVhdGU7XG52YXIgQ29udHJvbGxlciA9IHJlcXVpcmUoJy4vY29udHJvbGxlcicpO1xudmFyIGZvckVhY2ggPSBBcnJheS5wcm90b3R5cGUuZm9yRWFjaDtcbnZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcblxuLy8gIyBDaGlwIEFwcFxuXG4vLyBBbiBBcHAgcmVwcmVzZW50cyBhbiBhcHAgb3IgbW9kdWxlIHRoYXQgY2FuIGhhdmUgcm91dGVzLCBjb250cm9sbGVycywgYW5kIHRlbXBsYXRlcyBkZWZpbmVkLlxuZnVuY3Rpb24gQXBwKG5hbWUpIHtcbiAgQ29udHJvbGxlci5jYWxsKHRoaXMpO1xuICBFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcbiAgdGhpcy5mcmFnbWVudHMgPSBjcmVhdGVGcmFnbWVudHMoKTtcbiAgdGhpcy5hcHAgPSB0aGlzO1xuICB0aGlzLm5hbWUgPSBuYW1lO1xuICB0aGlzLmNvbnRyb2xsZXJzID0ge307XG4gIHRoaXMudGVtcGxhdGVzID0ge307XG4gIHRoaXMucm91dGVyID0gbmV3IFJvdXRlcigpO1xuICB0aGlzLnJvdXRlUGF0aCA9IFtdO1xuICB0aGlzLnJvb3RFbGVtZW50ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICB0aGlzLnN5bmMgPSB0aGlzLnN5bmMuYmluZCh0aGlzKTtcbiAgdGhpcy5yb3V0ZXIub24oJ2Vycm9yJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdyb3V0ZUVycm9yJywgeyBkZXRhaWw6IGV2ZW50LmRldGFpbCB9KSk7XG4gIH0sIHRoaXMpO1xuXG4gIHJlcXVpcmUoJy4vYmluZGVycycpKHRoaXMpO1xufVxuXG5BcHAucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShDb250cm9sbGVyLnByb3RvdHlwZSk7XG5BcHAucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQXBwO1xuXG5cbi8vIEluaXRpYWxpemVzIHRlbXBsYXRlcyBhbmQgY29udHJvbGxlcnMgZnJvbSB0aGUgZW50aXJlIHBhZ2Ugb3IgdGhlIGByb290YCBlbGVtZW50IGlmIHByb3ZpZGVkLlxuQXBwLnByb3RvdHlwZS5pbml0QXBwID0gZnVuY3Rpb24ocm9vdCkge1xuICBpZiAodGhpcy5jb25zdHJ1Y3RvciAhPT0gQXBwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdpbml0QXBwIG11c3QgYmUgY2FsbGVkIGZyb20gdGhlIGFwcCBpbnN0YW5jZSwgbm90IGEgY29udHJvbGxlcicpO1xuICB9XG5cbiAgaWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgPT09ICdsb2FkaW5nJykge1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCB0aGlzLmluaXRBcHAuYmluZCh0aGlzLCByb290KSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKHRoaXMuaW5pdGVkKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdGhpcy5pbml0ZWQgPSB0cnVlXG4gIGlmIChyb290KSB7XG4gICAgdGhpcy5yb290RWxlbWVudCA9IHJvb3Q7XG4gIH1cblxuICBmb3JFYWNoLmNhbGwodGhpcy5yb290RWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKCdzY3JpcHRbdHlwZT1cInRleHQvaHRtbFwiXSwgdGVtcGxhdGUnKSwgZnVuY3Rpb24oc2NyaXB0KSB7XG4gICAgdmFyIG5hbWUgPSBzY3JpcHQuZ2V0QXR0cmlidXRlKCduYW1lJykgfHwgc2NyaXB0LmlkO1xuICAgIGlmIChuYW1lKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlKG5hbWUsIHNjcmlwdCk7XG4gICAgICBzY3JpcHQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChzY3JpcHQpO1xuICAgIH1cbiAgfSwgdGhpcyk7XG5cbiAgdGhpcy5hcHBDb250cm9sbGVyID0gdGhpcy5jcmVhdGVDb250cm9sbGVyKHsgZWxlbWVudDogdGhpcy5yb290RWxlbWVudCwgbmFtZTogJ2FwcGxpY2F0aW9uJyB9KTtcbn07XG5cblxuLy8gVGVtcGxhdGVzXG4vLyAtLS0tLS0tLS1cblxuLy8gUmVnaXN0ZXJzIGEgbmV3IHRlbXBsYXRlIGJ5IG5hbWUgd2l0aCB0aGUgcHJvdmlkZWQgYGNvbnRlbnRgIHN0cmluZy4gSWYgbm8gYGNvbnRlbnRgIGlzIGdpdmVuIHRoZW4gcmV0dXJucyBhIG5ld1xuLy8gaW5zdGFuY2Ugb2YgYSBkZWZpbmVkIHRlbXBsYXRlLiBUaGlzIGluc3RhbmNlIGlzIGEgZG9jdW1lbnQgZnJhZ21lbnQuXG5BcHAucHJvdG90eXBlLnRlbXBsYXRlID0gZnVuY3Rpb24obmFtZSwgY29udGVudCkge1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICB0aGlzLnRlbXBsYXRlc1tuYW1lXSA9IHRoaXMuZnJhZ21lbnRzLmNyZWF0ZVRlbXBsYXRlKGNvbnRlbnQpO1xuICAgIHJldHVybiB0aGlzO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB0aGlzLnRlbXBsYXRlc1tuYW1lXTtcbiAgfVxufTtcblxuXG5BcHAucHJvdG90eXBlLmNvbXBvbmVudCA9IGZ1bmN0aW9uKGVsZW1lbnROYW1lLCB0ZW1wbGF0ZU5hbWUpIHtcbiAgdmFyIGFwcCA9IHRoaXM7XG4gIHZhciBmcmFnbWVudHMgPSB0aGlzLmZyYWdtZW50cztcblxuICBmcmFnbWVudHMucmVnaXN0ZXJFbGVtZW50KGVsZW1lbnROYW1lLCB7XG4gICAgcHJpb3JpdHk6IDIwMCxcblxuICAgIGNvbXBpbGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh0aGlzLmVsZW1lbnQuY2hpbGROb2Rlcy5sZW5ndGgpIHtcbiAgICAgICAgLy8gU2F2ZSB0aGUgY29udGVudHMgb2YgdGhpcyBjb21wb25lbnQgdG8gaW5zZXJ0IHdpdGhpblxuICAgICAgICB0aGlzLmNvbnRlbnQgPSBmcmFnbWVudHMuY3JlYXRlVGVtcGxhdGUodGhpcy5lbGVtZW50LmNoaWxkTm9kZXMpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBjcmVhdGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMudmlldyA9IGFwcC50ZW1wbGF0ZSh0ZW1wbGF0ZU5hbWUpLmNyZWF0ZVZpZXcoKTtcbiAgICAgIHRoaXMuZWxlbWVudC5hcHBlbmRDaGlsZCh0aGlzLnZpZXcpO1xuICAgIH0sXG5cbiAgICBib3VuZDogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmNvbnRleHQuX3BhcnRpYWxDb250ZW50ID0gdGhpcy5jb250ZW50O1xuICAgICAgdGhpcy5sYXN0Q29udGV4dCA9IHRoaXMuY29udGV4dDtcbiAgICAgIHRoaXMudmlldy5iaW5kKHRoaXMuY29udGV4dCk7XG4gICAgfSxcblxuICAgIHVuYm91bmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgZGVsZXRlIHRoaXMubGFzdENvbnRleHQuX3BhcnRpYWxDb250ZW50O1xuICAgICAgdGhpcy5sYXN0Q29udGV4dCA9IG51bGw7XG4gICAgICB0aGlzLnZpZXcudW5iaW5kKCk7XG4gICAgfVxuXG4gIH0pO1xuXG59O1xuXG5cbi8vIENvbnRyb2xsZXJzXG4vLyAtLS0tLS0tLS1cblxuLy8gRGVmaW5lcyBhIGNvbnRyb2xsZXIgaW5pdGlhbGl6YXRpb24gZnVuY3Rpb24uIFJlZ2lzdGVycyB0aGUgYGluaXRGdW5jdGlvbmAgZnVuY3Rpb24gd2l0aCBgbmFtZWAuIFRoZSBmdW5jdGlvbiB3aWxsXG4vLyBiZSBjYWxsZWQgd2l0aCBhbiBpbnN0YW5jZSBvZiBhIGNvbnRyb2xsZXIgYXMgaXRzIG9ubHkgcGFyYW1ldGVyIGV2ZXJ5IHRpbWUgYSBjb250cm9sbGVyIGlzIGNyZWF0ZWQgd2l0aCB0aGF0XG4vLyBuYW1lLlxuLy9cbi8vIElmIG5vIGBpbml0RnVuY3Rpb25gIGlzIHByb3ZpZGVkLCByZXR1cm5zIHRoZSBgaW5pdEZ1bmN0aW9uYCBwcmV2aW91c2x5IHJlZ2lzdGVyZWQgb3IgaWYgbm9uZSBoYXMgYmVlbiByZWdpc3RlcmVkXG4vLyBhIGZ1bmN0aW9uIG9uIHRoZSBnbG9iYWwgc2NvcGUgd2l0aCB0aGUgbmFtZSBgbmFtZSArICdDb250cm9sbGVyJ2AgKGUuZy4gYGZ1bmN0aW9uIGJsb2dDb250cm9sbGVyKCl7fWApLlxuLy9cbi8vICoqRXhhbXBsZToqKlxuLy9gYGBqYXZhc2NyaXB0XG4vLyBhcHAuY29udHJvbGxlcignaG9tZScsIGZ1bmN0aW9uKGNvbnRyb2xsZXIpIHtcbi8vICAgLy8gZG8gc29tZXRoaW5nIGFzIHNvb24gYXMgaXQgaXMgaW5zdGFudGlhdGVkXG4vLyAgIE15QXBwQVBJLmxvYWRVc2VyKGZ1bmN0aW9uKGVyciwgdXNlcikge1xuLy8gICAgIGNvbnRyb2xsZXIudXNlciA9IHVzZXJcbi8vICAgICBjb250cm9sbGVyLnN5bmMoKVxuLy8gICB9KVxuLy9cbi8vICAgLy8gcHJvdmlkZSBhIGZ1bmN0aW9uIGZvciB0aGUgdmlldyB0byBjYWxsLiBFLmcuIDxidXR0b24gb24tY2xpY2s9XCJsb2dvdXRcIj5Mb2dvdXQ8L2J1dHRvbj5cbi8vICAgY29udHJvbGxlci5sb2dvdXQgPSBmdW5jdGlvbigpIHtcbi8vICAgICBNeUFwcEFQSS5sb2dvdXQoZnVuY3Rpb24oZXJyKSB7XG4vLyAgICAgICBjb250cm9sbGVyLnVzZXIgPSBudWxsXG4vLyAgICAgICBjb250cm9sbGVyLnN5bmMoKVxuLy8gICAgIH0pXG4vLyAgIH1cbi8vIH0pXG4vLyBgYGBcbkFwcC5wcm90b3R5cGUuY29udHJvbGxlciA9IGZ1bmN0aW9uKG5hbWUsIGluaXRGdW5jdGlvbikge1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICB0aGlzLmNvbnRyb2xsZXJzW25hbWVdID0gaW5pdEZ1bmN0aW9uO1xuICAgIHJldHVybiB0aGlzO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB0aGlzLmNvbnRyb2xsZXJzW25hbWVdIHx8XG4gICAgICAodHlwZW9mIHdpbmRvd1tuYW1lICsgJ0NvbnRyb2xsZXInXSA9PT0gJ2Z1bmN0aW9uJyA/IHdpbmRvd1tuYW1lICsgJ0NvbnRyb2xsZXInXSA6IG51bGwpO1xuICB9XG59O1xuXG5cbi8vIENyZWF0ZXMgYSBuZXcgY29udHJvbGxlci4gU2V0cyBgb3B0aW9ucy5wYXJlbnRgIGFzIHRoZSBwYXJlbnQgY29udHJvbGxlciB0byB0aGlzIG9uZS4gU2V0cyBgb3B0aW9ucy5wcm9wZXJ0aWVzYFxuLy8gcHJvcGVydGllcyBvbnRvIHRoZSBjb250cm9sbGVyIGJlZm9yZSBiaW5kaW5nIGFuZCBpbml0aWFsaXphdGlvbi4gQmluZHMgYG9wdGlvbnMuZWxlbWVudGAgdG8gdGhlIGNvbnRyb2xsZXIgd2hpY2hcbi8vIHVwZGF0ZXMgSFRNTCBhcyBkYXRhIHVwZGF0ZXMuIEluaXRpYWxpemVzIHRoZSBuZXcgY29udHJvbGxlciB3aXRoIHRoZSBgb3B0aW9ucy5uYW1lYCBmdW5jdGlvbiBzZXQgaW5cbi8vIGBhcHAuY29udHJvbGxlcigpYC4gU2V0cyB0aGUgbmV3IGNvbnRyb2xsZXIgYXMgYSBwYXNzdGhyb3VnaCBjb250cm9sbGVyIGlmIGBvcHRpb25zLnBhc3N0aHJvdWdoYCBpcyB0cnVlLlxuQXBwLnByb3RvdHlwZS5jcmVhdGVDb250cm9sbGVyID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICBpZiAoIW9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0ge307XG4gIH1cblxuICB2YXIgY29udHJvbGxlcjtcbiAgdmFyIHBhcmVudCA9IG9wdGlvbnMucGFyZW50IHx8IHRoaXM7XG5cbiAgLy8gSWYgYG9wdGlvbnMucGFyZW50YCBpcyBwcm92aWRlZCwgdGhlIG5ldyBjb250cm9sbGVyIHdpbGwgZXh0ZW5kIGl0LiBBbnkgZGF0YSBvciBtZXRob2RzIG9uIHRoZSBwYXJlbnQgY29udHJvbGxlclxuICAvLyB3aWxsIGJlIGF2YWlsYWJsZSB0byB0aGUgY2hpbGQgdW5sZXNzIG92ZXJ3cml0dGVuIGJ5IHRoZSBjaGlsZC4gVGhpcyB1c2VzIHRoZSBwcm90b3R5cGUgY2hhaW4sIHRodXMgb3ZlcndyaXRpbmcgYVxuICAvLyBwcm9wZXJ0eSBvbmx5IHNldHMgaXQgb24gdGhlIGNoaWxkIGFuZCBkb2VzIG5vdCBjaGFuZ2UgdGhlIHBhcmVudC4gVGhlIGNoaWxkIGNhbm5vdCBzZXQgZGF0YSBvbiB0aGUgcGFyZW50LCBvbmx5XG4gIC8vIHJlYWQgaXQgb3IgY2FsbCBtZXRob2RzIG9uIGl0LlxuICBjb250cm9sbGVyID0gT2JqZWN0LmNyZWF0ZShwYXJlbnQpO1xuICBjb250cm9sbGVyLl9wYXJlbnQgPSBwYXJlbnQ7XG4gIENvbnRyb2xsZXIuY2FsbChjb250cm9sbGVyKTtcbiAgcGFyZW50Ll9jaGlsZHJlbi5wdXNoKGNvbnRyb2xsZXIpO1xuXG4gIC8vIElmIGBwcm9wZXJ0aWVzYCBpcyBwcm92aWRlZCwgYWxsIHByb3BlcnRpZXMgZnJvbSB0aGF0IG9iamVjdCB3aWxsIGJlIGNvcGllZCBvdmVyIHRvIHRoZSBjb250cm9sbGVyIGJlZm9yZSBpdCBpc1xuICAvLyBpbml0aWFsaXplZCBieSBpdHMgZGVmaW5pdGlvbiBvciBib3VuZCB0byBpdHMgZWxlbWVudC5cbiAgaWYgKG9wdGlvbnMucHJvcGVydGllcykge1xuICAgIE9iamVjdC5rZXlzKG9wdGlvbnMucHJvcGVydGllcykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgIGNvbnRyb2xsZXJba2V5XSA9IG9wdGlvbnMucHJvcGVydGllc1trZXldO1xuICAgIH0pO1xuICB9XG5cbiAgaWYgKG9wdGlvbnMuZWxlbWVudCkge1xuICAgIC8vIENsZWFuIHVwIG9sZCBjb250cm9sbGVyIGlmIG9uZSBleGlzdHNcbiAgICBpZiAob3B0aW9ucy5lbGVtZW50LmNvbnRyb2xsZXIpIHtcbiAgICAgIG9wdGlvbnMuZWxlbWVudC51bmJpbmQoKTtcbiAgICAgIG9wdGlvbnMuZWxlbWVudC5jb250cm9sbGVyLmNsb3NlQ29udHJvbGxlcigpO1xuICAgIH1cblxuICAgIC8vIEFzc2lnbiBlbGVtZW50XG4gICAgY29udHJvbGxlci5lbGVtZW50ID0gb3B0aW9ucy5lbGVtZW50O1xuICAgIGNvbnRyb2xsZXIuZWxlbWVudC5jb250cm9sbGVyID0gY29udHJvbGxlcjtcbiAgfVxuXG4gIC8vIElmIGBuYW1lYCBpcyBzdXBwbGllZCB0aGUgY29udHJvbGxlciBkZWZpbml0aW9uIGJ5IHRoYXQgbmFtZSB3aWxsIGJlIHJ1biB0byBpbml0aWFsaXplIHRoaXMgY29udHJvbGxlciBiZWZvcmUgdGhlXG4gIC8vIGJpbmRpbmdzIGFyZSBzZXQgdXAuXG4gIGlmIChvcHRpb25zLm5hbWUpIHtcbiAgICB2YXIgaW5pdEZ1bmN0aW9uID0gdGhpcy5jb250cm9sbGVyKG9wdGlvbnMubmFtZSk7XG4gICAgaWYgKGluaXRGdW5jdGlvbikge1xuICAgICAgaW5pdEZ1bmN0aW9uKGNvbnRyb2xsZXIpO1xuICAgIH1cbiAgfVxuXG4gIC8vIEJpbmRzIHRoZSBlbGVtZW50IHRvIHRoZSBuZXcgY29udHJvbGxlclxuICBpZiAob3B0aW9ucy5lbGVtZW50KSB7XG4gICAgdGhpcy5mcmFnbWVudHMuYmluZEVsZW1lbnQob3B0aW9ucy5lbGVtZW50LCBjb250cm9sbGVyKTtcbiAgfVxuXG4gIHJldHVybiBjb250cm9sbGVyO1xufTtcblxuLy8gU3luY3MgdGhlIG9ic2VydmVycyB0byBwcm9wb2dhdGUgY2hhbmdlcyB0byB0aGUgSFRNTCwgY2FsbCBjYWxsYmFjayBhZnRlclxuQXBwLnByb3RvdHlwZS5zeW5jID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgdGhpcy5mcmFnbWVudHMuc3luYyhjYWxsYmFjayk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuXG4vLyBSb3V0aW5nXG4vLyAtLS0tLS1cblxuLy8gUmVnaXN0ZXJzIGEgYGNhbGxiYWNrYCBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2hlbiB0aGUgZ2l2ZW4gcGFyYW0gYG5hbWVgIGlzIG1hdGNoZWQgaW4gYSBVUkxcbkFwcC5wcm90b3R5cGUucGFyYW0gPSBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaykge1xuICBpZiAodHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgdmFyIG9yaWdDYWxsYmFjayA9IGNhbGxiYWNrLCBhcHAgPSB0aGlzO1xuXG4gICAgLy8gU2V0IHRoZSBwYXJhbXMgYW5kIHF1ZXJ5IG9udG8gdGhlIGFwcCBiZWZvcmUgcnVubmluZyB0aGUgY2FsbGJhY2tcbiAgICBjYWxsYmFjayA9IGZ1bmN0aW9uKHJlcSwgbmV4dCkge1xuICAgICAgYXBwLnBhcmFtcyA9IHJlcS5wYXJhbXM7XG4gICAgICBhcHAucXVlcnkgPSByZXEucXVlcnlcbiAgICAgIG9yaWdDYWxsYmFjayhhcHAuYXBwQ29udHJvbGxlciwgbmV4dCk7XG4gICAgfTtcbiAgfVxuXG4gIHRoaXMucm91dGVyLnBhcmFtKG5hbWUsIGNhbGxiYWNrKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbi8vIENyZWF0ZSBhIHJvdXRlIHRvIGJlIHJ1biB3aGVuIHRoZSBnaXZlbiBVUkwgYHBhdGhgIGlzIGhpdCBpbiB0aGUgYnJvd3NlciBVUkwuIFRoZSByb3V0ZSBgbmFtZWAgaXMgdXNlZCB0byBsb2FkIHRoZVxuLy8gdGVtcGxhdGUgYW5kIGNvbnRyb2xsZXIgYnkgdGhlIHNhbWUgbmFtZS4gVGhpcyB0ZW1wbGF0ZSB3aWxsIGJlIHBsYWNlZCBpbiB0aGUgZmlyc3QgZWxlbWVudCBvbiBwYWdlIHdpdGggYVxuLy8gYGJpbmQtcm91dGVgIGF0dHJpYnV0ZS5cbkFwcC5wcm90b3R5cGUucm91dGUgPSBmdW5jdGlvbihwYXRoLCBoYW5kbGVyLCBzdWJyb3V0ZXMsIHJ1bkJlZm9yZSkge1xuICB2YXIgYXBwID0gdGhpcy5hcHA7XG4gIHZhciBjYWxsYmFjaztcblxuICBpZiAodHlwZW9mIGhhbmRsZXIgPT09ICdmdW5jdGlvbicgJiYgaGFuZGxlci50b1N0cmluZygpLm1hdGNoKC9cXChyb3V0ZVxcKS8pKSB7XG4gICAgc3Vicm91dGVzID0gaGFuZGxlcjtcbiAgICBoYW5kbGVyID0gbnVsbDtcbiAgfVxuXG4gIGlmICghaGFuZGxlcikge1xuICAgIGhhbmRsZXIgPSBwYXRoLnJlcGxhY2UoL15cXC8vLCAnJyk7XG4gIH1cblxuICBpZiAodHlwZW9mIGhhbmRsZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAvLyBTdWJyb3V0ZXMgbm90IHN1cHBvcnRlZCB3aXRoIGNhbGxiYWNrcywgb25seSB3aXRoIHN0cmluZyBoYW5kbGVycy5cbiAgICBjYWxsYmFjayA9IGhhbmRsZXI7XG5cbiAgfSBlbHNlIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gJ3N0cmluZycpIHtcbiAgICB2YXIgcGFydHMgPSBwYXRoLnNwbGl0KCcvJyk7XG4gICAgdmFyIGxlbmd0aCA9IHBhcnRzW3BhcnRzLmxlbmd0aCAtIDFdID09PSAnKicgPyBJbmZpbml0eSA6IHBhcnRzLmxlbmd0aDtcblxuICAgIC8vIElmIHRoZSBoYW5kbGVyIGlzIGEgc3RyaW5nIGxvYWQgdGhlIGNvbnRyb2xsZXIvdGVtcGxhdGUgYnkgdGhhdCBuYW1lLlxuICAgIHZhciBuYW1lID0gaGFuZGxlcjtcbiAgICBjYWxsYmFjayA9IGZ1bmN0aW9uKHJlcSwgbmV4dCkge1xuICAgICAgLy8gUnVuIGEgcHJldmlvdXMgcm91dGUgZmlyc3QgYW5kIGFsbG93IGl0IHRvIHRoZW4gcnVuIHRoaXMgb25lIGFnYWluIGFmdGVyXG4gICAgICBpZiAocnVuQmVmb3JlKSB7XG4gICAgICAgIHJ1bkJlZm9yZShyZXEsIGNhbGxiYWNrKTtcbiAgICAgIH1cbiAgICAgIHZhciBtYXRjaGluZ1BhdGggPSByZXEucGF0aC5zcGxpdCgnLycpLnNsaWNlKDAsIGxlbmd0aCkuam9pbignLycpO1xuICAgICAgYXBwLnJvdXRlUGF0aC5wdXNoKHsgbmFtZTogbmFtZSwgcGF0aDogbWF0Y2hpbmdQYXRoIH0pO1xuICAgICAgYXBwLnN5bmMoKTtcbiAgICB9O1xuXG4gICAgLy8gQWRkcyB0aGUgc3Vicm91dGVzIGFuZCBvbmx5IGNhbGxzIHRoaXMgY2FsbGJhY2sgYmVmb3JlIHRoZXkgZ2V0IGNhbGxlZCB3aGVuIHRoZXkgbWF0Y2guXG4gICAgaWYgKHN1YnJvdXRlcykge1xuICAgICAgc3Vicm91dGVzKGZ1bmN0aW9uKHN1YnBhdGgsIGhhbmRsZXIsIHN1YnJvdXRlcykge1xuICAgICAgICBpZiAoc3VicGF0aCA9PT0gJy8nKSB7XG4gICAgICAgICAgc3VicGF0aCA9ICcnO1xuICAgICAgICB9XG4gICAgICAgIGFwcC5yb3V0ZShwYXRoICsgc3VicGF0aCwgaGFuZGxlciwgc3Vicm91dGVzLCBjYWxsYmFjayk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdyb3V0ZSBoYW5kbGVyIG11c3QgYmUgYSBzdHJpbmcgcGF0aCBvciBhIGZ1bmN0aW9uJyk7XG4gIH1cblxuXG4gIHRoaXMucm91dGVyLnJvdXRlKHBhdGgsIGZ1bmN0aW9uKHJlcSwgbmV4dCkge1xuICAgIHZhciBldmVudCA9IG5ldyBDdXN0b21FdmVudCgncm91dGVDaGFuZ2luZycsIHsgY2FuY2VsYWJsZTogdHJ1ZSB9KTtcbiAgICBhcHAuZGlzcGF0Y2hFdmVudChldmVudCk7XG5cbiAgICBpZiAoIWV2ZW50LmRlZmF1bHRQcmV2ZW50ZWQpIHtcbiAgICAgIGFwcC5wYXJhbXMgPSByZXEucGFyYW1zO1xuICAgICAgYXBwLnF1ZXJ5ID0gcmVxLnF1ZXJ5O1xuICAgICAgaWYgKGFwcC5wYXRoID09PSByZXEucGF0aCkge1xuICAgICAgICByZXEuaXNTYW1lUGF0aCA9IHRydWU7XG4gICAgICB9XG4gICAgICBhcHAucGF0aCA9IHJlcS5wYXRoO1xuICAgICAgYXBwLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdyb3V0ZUNoYW5nZScsIHsgZGV0YWlsOiByZXEgfSkpO1xuICAgICAgYXBwLnJvdXRlUGF0aC5sZW5ndGggPSAwO1xuICAgICAgY2FsbGJhY2soYXBwLmFwcENvbnRyb2xsZXIsIG5leHQpO1xuICAgICAgYXBwLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdyb3V0ZUNoYW5nZWQnLCB7IGRldGFpbDogcmVxIH0pKTtcbiAgICB9XG4gIH0pO1xuXG59O1xuXG5cbi8vIFJlZGlyZWN0cyB0byB0aGUgcHJvdmlkZWQgVVJMXG5BcHAucHJvdG90eXBlLnJlZGlyZWN0ID0gZnVuY3Rpb24odXJsLCByZXBsYWNlKSB7XG4gIHRoaXMucm91dGVyLnJlZGlyZWN0KHVybCwgcmVwbGFjZSk7XG59O1xuXG5cbkFwcC5wcm90b3R5cGUuaGFzTWF0Y2hpbmdSb3V0ZXMgPSBmdW5jdGlvbih1cmwpIHtcbiAgdGhpcy5yb3V0ZXIuZ2V0Um91dGVzTWF0Y2hpbmdQYXRoKHRoaXMucm91dGVyLmdldFVybFBhcnRzKHVybCkucGF0aCkubGVuZ3RoID4gMDtcbn07XG5cblxuLy8gTGlzdGVuIHRvIFVSTCBjaGFuZ2VzXG5BcHAucHJvdG90eXBlLmxpc3RlbiA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgaWYgKCFvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IHt9O1xuICB9XG5cbiAgaWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgPT09ICdsb2FkaW5nJykge1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCB0aGlzLmxpc3Rlbi5iaW5kKHRoaXMsIG9wdGlvbnMpKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIFN0b3AgbGlzdGVuaW5nIGlmIHJlcXVlc3RlZFxuICBpZiAob3B0aW9ucy5zdG9wKSB7XG4gICAgaWYgKHRoaXMuX3JvdXRlSGFuZGxlcikge1xuICAgICAgdGhpcy5yb3V0ZXIub2ZmKCdjaGFuZ2UnLCB0aGlzLl9yb3V0ZUhhbmRsZXIpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9jbGlja0hhbmRsZXIpIHtcbiAgICAgIHRoaXMucm9vdEVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLl9jbGlja0hhbmRsZXIpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnJvdXRlci5saXN0ZW4ob3B0aW9ucyk7XG4gIH1cblxuICAvLyBTdGFydCBsaXN0ZW5pbmdcbiAgdmFyIGFwcCA9IHRoaXM7XG5cbiAgLy8gQWRkIGhhbmRsZXIgZm9yIHdoZW4gdGhlIHJvdXRlIGNoYW5nZXNcbiAgdGhpcy5fcm91dGVIYW5kbGVyID0gZnVuY3Rpb24oZXZlbnQsIHBhdGgpIHtcbiAgICBhcHAuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ3VybENoYW5nZScsIHsgZGV0YWlsOiBwYXRoIH0pKTtcbiAgfTtcblxuICAvLyBBZGQgaGFuZGxlciBmb3IgY2xpY2tpbmcgbGlua3NcbiAgdGhpcy5fY2xpY2tIYW5kbGVyID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICB2YXIgYW5jaG9yO1xuICAgIGlmICggIShhbmNob3IgPSBldmVudC50YXJnZXQuY2xvc2VzdCgnYVtocmVmXScpKSApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoZXZlbnQuZGVmYXVsdFByZXZlbnRlZCkge1xuICAgICAgLy8gaWYgc29tZXRoaW5nIGVsc2UgYWxyZWFkeSBoYW5kbGVkIHRoaXMsIHdlIHdvbid0XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGxpbmtIb3N0ID0gYW5jaG9yLmhvc3QucmVwbGFjZSgvOjgwJHw6NDQzJC8sICcnKTtcbiAgICB2YXIgdXJsID0gYW5jaG9yLmdldEF0dHJpYnV0ZSgnaHJlZicpLnJlcGxhY2UoL14jLywgJycpO1xuXG4gICAgaWYgKGxpbmtIb3N0ICYmIGxpbmtIb3N0ICE9PSBsb2NhdGlvbi5ob3N0KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKGV2ZW50Lm1ldGFLZXkgfHwgZXZlbnQuY3RybEtleSB8fCBhbmNob3IuZ2V0QXR0cmlidXRlKCd0YXJnZXQnKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmRvbnRIYW5kbGU0MDRzICYmICFhcHAuaGFzTWF0Y2hpbmdSb3V0ZXModXJsKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgaWYgKGFuY2hvci5ocmVmID09PSBsb2NhdGlvbi5ocmVmICsgJyMnKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCFhbmNob3IuZGlzYWJsZWQpIHtcbiAgICAgIGFwcC5yZWRpcmVjdCh1cmwpO1xuICAgIH1cbiAgfTtcblxuICB0aGlzLnJvdXRlci5vbignY2hhbmdlJywgdGhpcy5fcm91dGVIYW5kbGVyKTtcbiAgdGhpcy5yb290RWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuX2NsaWNrSGFuZGxlcik7XG4gIHRoaXMucm91dGVyLmxpc3RlbihvcHRpb25zKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cblxuXG4vLyBQb2x5ZmlsbCBtYXRjaGVzXG5pZiAoIUVsZW1lbnQucHJvdG90eXBlLm1hdGNoZXMpIHtcbiAgRWxlbWVudC5wcm90b3R5cGUubWF0Y2hlcyA9XG4gICAgRWxlbWVudC5wcm90b3R5cGUubWF0Y2hlc1NlbGVjdG9yIHx8XG4gICAgRWxlbWVudC5wcm90b3R5cGUud2Via2l0TWF0Y2hlc1NlbGVjdG9yIHx8XG4gICAgRWxlbWVudC5wcm90b3R5cGUubW96TWF0Y2hlc1NlbGVjdG9yIHx8XG4gICAgRWxlbWVudC5wcm90b3R5cGUubXNNYXRjaGVzU2VsZWN0b3IgfHxcbiAgICBFbGVtZW50LnByb3RvdHlwZS5vTWF0Y2hlc1NlbGVjdG9yO1xufVxuXG4vLyBQb2x5ZmlsbCBjbG9zZXN0XG5pZiAoIUVsZW1lbnQucHJvdG90eXBlLmNsb3Nlc3QpIHtcbiAgRWxlbWVudC5wcm90b3R5cGUuY2xvc2VzdCA9IGZ1bmN0aW9uIGNsb3Nlc3Qoc2VsZWN0b3IpIHtcbiAgICB2YXIgZWxlbWVudCA9IHRoaXM7XG4gICAgZG8ge1xuICAgICAgaWYgKGVsZW1lbnQubWF0Y2hlcyhzZWxlY3RvcikpIHtcbiAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XG4gICAgICB9XG4gICAgfSB3aGlsZSAoKGVsZW1lbnQgPSBlbGVtZW50LnBhcmVudE5vZGUpICYmIGVsZW1lbnQubm9kZVR5cGUgPT09IE5vZGUuRUxFTUVOVF9OT0RFKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSByZWdpc3RlckJpbmRlcnM7XG52YXIgY29tcGlsZSA9IHJlcXVpcmUoJ2ZyYWdtZW50cy1qcy9zcmMvY29tcGlsZScpO1xuXG5mdW5jdGlvbiByZWdpc3RlckJpbmRlcnMoYXBwKSB7XG4gIHZhciBmcmFnbWVudHMgPSBhcHAuZnJhZ21lbnRzO1xuXG4gIGZyYWdtZW50cy5hbmltYXRlQXR0cmlidXRlID0gJ1thbmltYXRlXSc7XG5cbiAgLy8gIyMgYmluZC1wYXJ0aWFsXG4gIC8vIEFkZHMgYSBoYW5kbGVyIHRvIHNldCB0aGUgY29udGVudHMgb2YgdGhlIGVsZW1lbnQgd2l0aCB0aGUgdGVtcGxhdGUgYW5kIGNvbnRyb2xsZXIgYnkgdGhhdCBuYW1lLiBUaGUgZXhwcmVzc2lvbiBtYXlcbiAgLy8gYmUganVzdCB0aGUgbmFtZSBvZiB0aGUgdGVtcGxhdGUvY29udHJvbGxlciwgb3IgaXQgbWF5IGJlIG9mIHRoZSBmb3JtYXQgYHBhcnRpYWxOYW1lYC4gVXNlIHRoZSBsb2NhbC0qIGJpbmRpbmdcbiAgLy8gdG8gcGFzcyBkYXRhIGludG8gYSBwYXJ0aWFsLlxuXG4gIC8vICoqRXhhbXBsZToqKlxuICAvLyBgYGBodG1sXG4gIC8vIDxkaXYgW3BhcnRpYWxdPVwidXNlckluZm9cIiB7dXNlcn09XCJ7e2dldFVzZXIoKX19XCIgW2NsYXNzXT1cInt7IHsgYWRtaW5pc3RyYXRvcjogdXNlci5pc0FkbWluIH0gfX1cIj48L2Rpdj5cbiAgLy9cbiAgLy8gPHNjcmlwdCBuYW1lPVwidXNlckluZm9cIiB0eXBlPVwidGV4dC9odG1sXCI+XG4gIC8vICAgPHN0cm9uZz57eyB1c2VyLm5hbWUgfX08L3N0cm9uZz5cbiAgLy8gPC9zY3JpcHQ+XG4gIC8vIGBgYFxuICAvLyAqUmVzdWx0OipcbiAgLy8gYGBgaHRtbFxuICAvLyA8ZGl2IGNsYXNzPVwiYWRtaW5pc3RyYXRvclwiPlxuICAvLyAgIDxzcGFuPkphY29iPC9zcGFuPlxuICAvLyA8L2Rpdj5cbiAgLy8gYGBgXG4gIHZhciBQYXJ0aWFsQmluZGVyID0gZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdbcGFydGlhbF0nLCB7XG4gICAgYW5pbWF0ZWQ6IHRydWUsXG4gICAgcHJpb3JpdHk6IDQwLFxuXG4gICAgY29tcGlsZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHBhcmVudCA9IHRoaXMuZWxlbWVudC5wYXJlbnROb2RlO1xuICAgICAgdmFyIHBsYWNlaG9sZGVyID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICAgICAgcGFyZW50Lmluc2VydEJlZm9yZShwbGFjZWhvbGRlciwgdGhpcy5lbGVtZW50KTtcblxuICAgICAgaWYgKHRoaXMuZWxlbWVudC5jaGlsZE5vZGVzLmxlbmd0aCkge1xuICAgICAgICAvLyBVc2UgdGhlIGNvbnRlbnRzIG9mIHRoaXMgcGFydGlhbCBhcyB0aGUgZGVmYXVsdCB3aGVuIG5vIHJvdXRlIG1hdGNoZXMgb3IgYWxsb3cgdG8gYmUgaW5zZXJ0ZWRcbiAgICAgICAgLy8gd2l0aGluXG4gICAgICAgIHRoaXMuY29udGVudCA9IGZyYWdtZW50cy5jcmVhdGVUZW1wbGF0ZSh0aGlzLmVsZW1lbnQuY2hpbGROb2Rlcyk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMudGVtcGxhdGUgPSBmcmFnbWVudHMuY3JlYXRlVGVtcGxhdGUodGhpcy5lbGVtZW50KTtcbiAgICAgIHRoaXMuZWxlbWVudCA9IHBsYWNlaG9sZGVyO1xuICAgIH0sXG5cbiAgICBjcmVhdGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBwbGFjZWhvbGRlciA9IHRoaXMuZWxlbWVudDtcbiAgICAgIHRoaXMuY29udGFpbmVyID0gdGhpcy50ZW1wbGF0ZS5jcmVhdGVWaWV3KCk7XG4gICAgICBwbGFjZWhvbGRlci5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmNvbnRhaW5lciwgcGxhY2Vob2xkZXIubmV4dFNpYmxpbmcpO1xuICAgICAgdGhpcy5lbGVtZW50ID0gcGxhY2Vob2xkZXIubmV4dFNpYmxpbmc7XG4gICAgICBwbGFjZWhvbGRlci5yZW1vdmUoKTtcbiAgICB9LFxuXG4gICAgYm91bmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5jb250ZXh0Ll9wYXJ0aWFsQ29udGVudCA9IHRoaXMuY29udGVudDtcbiAgICAgIHRoaXMubGFzdENvbnRleHQgPSB0aGlzLmNvbnRleHQ7XG4gICAgfSxcblxuICAgIHVuYm91bmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgZGVsZXRlIHRoaXMubGFzdENvbnRleHQuX3BhcnRpYWxDb250ZW50O1xuICAgICAgdGhpcy5sYXN0Q29udGV4dCA9IG51bGw7XG4gICAgfSxcblxuICAgIGdldE5hbWU6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfSxcblxuICAgIHVwZGF0ZWQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBpZiAodGhpcy5hbmltYXRlICYmIHRoaXMuY29udGV4dCkge1xuICAgICAgICB0aGlzLnVwZGF0ZWRBbmltYXRlZCh2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnVwZGF0ZWRSZWd1bGFyKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgdXBkYXRlZFJlZ3VsYXI6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBpZiAodGhpcy5zaG93aW5nKSB7XG4gICAgICAgIHRoaXMuc2hvd2luZy5kaXNwb3NlKCk7XG4gICAgICAgIHRoaXMuY29udGFpbmVyLnVuYmluZCgpO1xuICAgICAgICB0aGlzLmNvbnRyb2xsZXIuY2xvc2VDb250cm9sbGVyKCk7XG4gICAgICAgIHRoaXMuc2hvd2luZyA9IG51bGw7XG4gICAgICAgIHRoaXMuY29udHJvbGxlciA9IG51bGw7XG4gICAgICB9XG5cbiAgICAgIHZhciBuYW1lID0gdGhpcy5nZXROYW1lKHZhbHVlKTtcbiAgICAgIHZhciB0ZW1wbGF0ZSA9IGFwcC50ZW1wbGF0ZShuYW1lKTtcblxuICAgICAgaWYgKHRlbXBsYXRlKSB7XG4gICAgICAgIHRoaXMuY29udHJvbGxlciA9IHRoaXMuY29udGV4dC5jcmVhdGVDb250cm9sbGVyKHsgZWxlbWVudDogdGhpcy5lbGVtZW50LCBuYW1lOiBuYW1lIH0pO1xuICAgICAgICB0aGlzLnNob3dpbmcgPSB0ZW1wbGF0ZS5jcmVhdGVWaWV3KCk7XG4gICAgICAgIHRoaXMuZWxlbWVudC5hcHBlbmRDaGlsZCh0aGlzLnNob3dpbmcpO1xuICAgICAgICB0aGlzLmNvbnRhaW5lci5iaW5kKHRoaXMuY29udHJvbGxlcik7XG4gICAgICAgIHRoaXMuc2hvd2luZy5iaW5kKHRoaXMuY29udHJvbGxlcik7XG4gICAgICB9XG4gICAgfSxcblxuICAgIHVwZGF0ZWRBbmltYXRlZDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHRoaXMubGFzdFZhbHVlID0gdmFsdWU7XG4gICAgICBpZiAodGhpcy5hbmltYXRpbmcpIHtcbiAgICAgICAgLy8gT2Jzb2xldGVkLCB3aWxsIGNoYW5nZSBhZnRlciBhbmltYXRpb24gaXMgZmluaXNoZWQuXG4gICAgICAgIHRoaXMuc2hvd2luZy51bmJpbmQoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5zaG93aW5nKSB7XG4gICAgICAgIHRoaXMuYW5pbWF0aW5nID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5zaG93aW5nLnVuYmluZCgpO1xuICAgICAgICB0aGlzLmFuaW1hdGVPdXQodGhpcy5jb250YWluZXIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHRoaXMuYW5pbWF0aW5nID0gZmFsc2U7XG5cbiAgICAgICAgICBpZiAodGhpcy5zaG93aW5nKSB7XG4gICAgICAgICAgICB0aGlzLnNob3dpbmcuZGlzcG9zZSgpO1xuICAgICAgICAgICAgdGhpcy5jb250YWluZXIudW5iaW5kKCk7XG4gICAgICAgICAgICB0aGlzLmNvbnRyb2xsZXIuY2xvc2VDb250cm9sbGVyKCk7XG4gICAgICAgICAgICB0aGlzLnNob3dpbmcgPSBudWxsO1xuICAgICAgICAgICAgdGhpcy5jb250cm9sbGVyID0gbnVsbDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAodGhpcy5jb250ZXh0KSB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZWRBbmltYXRlZCh0aGlzLmxhc3RWYWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgbmFtZSA9IHRoaXMuZ2V0TmFtZSh2YWx1ZSk7XG4gICAgICB2YXIgdGVtcGxhdGUgPSBhcHAudGVtcGxhdGUobmFtZSk7XG5cbiAgICAgIGlmICh0ZW1wbGF0ZSkge1xuICAgICAgICB0aGlzLmNvbnRyb2xsZXIgPSB0aGlzLmNvbnRleHQuY3JlYXRlQ29udHJvbGxlcih7IGVsZW1lbnQ6IHRoaXMuZWxlbWVudCwgbmFtZTogbmFtZSB9KTtcbiAgICAgICAgdGhpcy5zaG93aW5nID0gdGVtcGxhdGUuY3JlYXRlVmlldygpO1xuICAgICAgICB0aGlzLmVsZW1lbnQuYXBwZW5kQ2hpbGQodGhpcy5zaG93aW5nKTtcbiAgICAgICAgdGhpcy5jb250YWluZXIuYmluZCh0aGlzLmNvbnRyb2xsZXIpO1xuICAgICAgICB0aGlzLnNob3dpbmcuYmluZCh0aGlzLmNvbnRyb2xsZXIpO1xuICAgICAgICB0aGlzLmNvbnRleHQuc3luYygpO1xuXG4gICAgICAgIHRoaXMuYW5pbWF0aW5nID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5hbmltYXRlSW4odGhpcy5jb250YWluZXIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHRoaXMuYW5pbWF0aW5nID0gZmFsc2U7XG4gICAgICAgICAgLy8gaWYgdGhlIHZhbHVlIGNoYW5nZWQgd2hpbGUgdGhpcyB3YXMgYW5pbWF0aW5nIHJ1biBpdCBhZ2FpblxuICAgICAgICAgIGlmICh0aGlzLmxhc3RWYWx1ZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlZEFuaW1hdGVkKHRoaXMubGFzdFZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICB1bmJvdW5kOiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh0aGlzLnNob3dpbmcpIHtcbiAgICAgICAgdGhpcy5zaG93aW5nLnVuYmluZCgpO1xuICAgICAgfVxuICAgICAgdGhpcy5sYXN0VmFsdWUgPSBudWxsO1xuICAgICAgdGhpcy5hbmltYXRpbmcgPSBmYWxzZTtcbiAgICB9XG4gIH0pO1xuXG5cbiAgdmFyIEJpbmRpbmcgPSByZXF1aXJlKCdmcmFnbWVudHMtanMvc3JjL2JpbmRpbmcnKTtcbiAgdmFyIF9zdXBlciA9IEJpbmRpbmcucHJvdG90eXBlO1xuXG4gIC8vICMjIHsqfVxuICAvLyBZb3UgbWF5IHBhc3MgZGF0YSBpbnRvIFtwYXJ0aWFsXSBvciBbcmVwZWF0XSB1c2luZyB0aGlzIHdpbGRjYXJkIGJpbmRpbmcuIFRoZSBhdHRyaWJ1dGUgbmFtZSBwb3J0aW9uIHdpdGhpbiB0aGVcbiAgLy8gYnJhY2t0ZXMgd2lsbCBiZSBjb252ZXJ0ZWQgdG8gY2FtZWxDYXNlIGFuZCB0aGUgdmFsdWUgd2lsbCBiZSBzZXQgbG9jYWxseS4gRXhhbXBsZXM6XG4gIC8vIGB7bGlua309XCJ7e3VzZXIuYWRkcmVzc1VybH19XCJgIHdpbGwgcGFzcyB0aGUgdmFsdWUgb2YgYHVzZXIuYWRkcmVzc1VybGAgaW50byB0aGUgcGFydGlhbCBhcyBgbGlua2AuXG4gIC8vIGB7cG9zdC1ib2R5fT1cInt7dXNlci5kZXNjcmlwdGlvbn19XCJgIHdpbGwgcGFzcyB0aGUgdmFsdWUgb2YgYHVzZXIuZGVzY3JpcHRpb25gIGludG8gdGhlIHBhcnRpYWwgYXMgYHBvc3RCb2R5YC5cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCd7Kn0nLCB7XG4gICAgY3JlYXRlZDogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLnR3b1dheU9ic2VydmVyID0gdGhpcy5vYnNlcnZlKHRoaXMuY2FtZWxDYXNlLCB0aGlzLnNlbmRVcGRhdGUsIHRoaXMpO1xuICAgIH0sXG4gICAgLy8gQmluZCB0aGlzIHRvIHRoZSBnaXZlbiBjb250ZXh0IG9iamVjdFxuICAgIGJpbmQ6IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgICAgIGlmICh0aGlzLmNoaWxkQ29udGV4dCA9PSBjb250ZXh0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gQmluZCBhZ2FpbnN0IHRoZSBwYXJlbnQgY29udGV4dFxuICAgICAgdGhpcy5jaGlsZENvbnRleHQgPSBjb250ZXh0O1xuICAgICAgX3N1cGVyLmJpbmQuY2FsbCh0aGlzLCBjb250ZXh0Ll9wYXJlbnQpO1xuICAgICAgdGhpcy50d29XYXlPYnNlcnZlci5iaW5kKGNvbnRleHQsIHRydWUpO1xuICAgIH0sXG4gICAgdW5ib3VuZDogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLnR3b1dheU9ic2VydmVyLnVuYmluZCgpO1xuICAgIH0sXG4gICAgc2VuZFVwZGF0ZTogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGlmICghdGhpcy5za2lwU2VuZCkge1xuICAgICAgICB0aGlzLm9ic2VydmVyLnNldCh2YWx1ZSk7XG4gICAgICAgIHRoaXMuc2tpcFNlbmQgPSB0cnVlO1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIF90aGlzLnNraXBTZW5kID0gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0sXG4gICAgdXBkYXRlZDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGlmICghdGhpcy5za2lwU2VuZCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuY2hpbGRDb250ZXh0W3RoaXMuY2FtZWxDYXNlXSA9IHZhbHVlO1xuICAgICAgICB0aGlzLnNraXBTZW5kID0gdHJ1ZTtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICBfdGhpcy5za2lwU2VuZCA9IGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG5cbiAgLy8gIyMgYmluZC1jb250ZW50XG4gIC8vIEFsbG93cyBhbiBlbGVtZW50IHdpdGggYSBgW3BhcnRpYWxdYCBhdHRyaWJ1dGUgdG8gaW5jbHVkZSBIVE1MIHdpdGhpbiBpdCB0aGF0IG1heSBiZSBpbnNlcnRlZCBzb21ld2hlcmVcbiAgLy8gaW5zaWRlIHRoZSBwYXJ0aWFsJ3MgdGVtcGxhdGUuXG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnW2NvbnRlbnRdJywge1xuICAgIHByaW9yaXR5OiA0MCxcbiAgICBjb21waWxlZDogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAodGhpcy5lbGVtZW50LmNoaWxkTm9kZXMubGVuZ3RoKSB7XG4gICAgICAgIHRoaXMuZGVmYXVsdENvbnRlbnQgPSBmcmFnbWVudHMuY3JlYXRlVGVtcGxhdGUodGhpcy5lbGVtZW50LmNoaWxkTm9kZXMpO1xuICAgICAgfVxuICAgIH0sXG4gICAgYm91bmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHRlbXBsYXRlID0gdGhpcy5jb250ZXh0Ll9wYXJ0aWFsQ29udGVudCB8fCB0aGlzLmRlZmF1bHRDb250ZW50O1xuICAgICAgaWYgKHRlbXBsYXRlKSB7XG4gICAgICAgIHRoaXMuY29udGVudCA9IHRlbXBsYXRlLmNyZWF0ZVZpZXcoKTtcbiAgICAgICAgdGhpcy5lbGVtZW50LmFwcGVuZENoaWxkKHRoaXMuY29udGVudCk7XG4gICAgICAgIHRoaXMuY29udGVudC5iaW5kKHRoaXMuY29udGV4dCk7XG4gICAgICB9XG4gICAgfSxcbiAgICB1bmJvdW5kOiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh0aGlzLmNvbnRlbnQpIHtcbiAgICAgICAgdGhpcy5jb250ZW50LmRpc3Bvc2UoKTtcbiAgICAgICAgdGhpcy5jb250ZW50ID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG5cblxuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ1tyb3V0ZV0nLCBQYXJ0aWFsQmluZGVyLmV4dGVuZCh7XG4gICAgY29tcGlsZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgUGFydGlhbEJpbmRlci5wcm90b3R5cGUuY29tcGlsZWQuY2FsbCh0aGlzKTtcbiAgICAgIHRoaXMuZXhwcmVzc2lvbiA9ICdyb3V0ZVBhdGhbcm91dGVEZXB0aF0nO1xuICAgIH0sXG5cbiAgICBiaW5kOiBmdW5jdGlvbihjb250ZXh0KSB7XG4gICAgICAvLyBEZWxldGUgYW55IGRlcHRoIGV4aXN0aW5nIG9uIHRoZSBjb250cm9sbGVyIGFuZCBzZXQgaXRzIGRlcHRoIHRvIDEgbW9yZSB0aGFuIGl0cyBwYXJlbnQgY29udHJvbGxlcnMuXG4gICAgICBkZWxldGUgY29udGV4dC5yb3V0ZURlcHRoO1xuICAgICAgY29udGV4dC5yb3V0ZURlcHRoID0gY29udGV4dC5yb3V0ZURlcHRoID09IG51bGwgPyAwIDogY29udGV4dC5yb3V0ZURlcHRoICsgMTtcbiAgICAgIHJldHVybiBQYXJ0aWFsQmluZGVyLnByb3RvdHlwZS5iaW5kLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfSxcblxuICAgIGdldE5hbWU6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXR1cm4gdmFsdWUgPyB2YWx1ZS5uYW1lIDogdW5kZWZpbmVkO1xuICAgIH1cbiAgfSkpO1xuXG5cblxuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ1tjb250cm9sbGVyXScsIHtcbiAgICBwcmlvcml0eTogMzAsXG5cbiAgICBjb21waWxlZDogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmJpbmRpbmdzID0gY29tcGlsZShmcmFnbWVudHMsIHRoaXMuZWxlbWVudCk7XG4gICAgfSxcblxuICAgIGNyZWF0ZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5iaW5kaW5ncyA9IHRoaXMuYmluZGluZ3MubWFwKGZ1bmN0aW9uKGJpbmRpbmcpIHtcbiAgICAgICAgcmV0dXJuIGJpbmRpbmcuY2xvbmVGb3JWaWV3KHRoaXMuZWxlbWVudCk7XG4gICAgICB9LCB0aGlzKTtcbiAgICB9LFxuXG4gICAgYm91bmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGNvbnRleHQgPSB0aGlzLmNvbnRleHQuY3JlYXRlQ29udHJvbGxlcih7IGVsZW1lbnQ6IHRoaXMuZWxlbWVudCwgbmFtZTogdGhpcy5vYnNlcnZlci5nZXQoKSB9KTtcbiAgICAgIHRoaXMuY2hpbGRDb250ZXh0ID0gY29udGV4dDtcbiAgICAgIHRoaXMuYmluZGluZ3MuZm9yRWFjaChmdW5jdGlvbihiaW5kaW5nKSB7XG4gICAgICAgIGJpbmRpbmcuYmluZChjb250ZXh0KTtcbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICB1bmJvdW5kOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuYmluZGluZ3MuZm9yRWFjaChmdW5jdGlvbihiaW5kaW5nKSB7XG4gICAgICAgIGJpbmRpbmcudW5iaW5kKCk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMuY2hpbGRDb250ZXh0LmNsb3NlQ29udHJvbGxlcigpO1xuICAgICAgdGhpcy5jaGlsZENvbnRleHQgPSBudWxsO1xuICAgIH0sXG5cbiAgICBkaXNwb3NlZDogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmJpbmRpbmdzLmZvckVhY2goZnVuY3Rpb24oYmluZGluZykge1xuICAgICAgICBiaW5kaW5nLmRpc3Bvc2UoKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG5cblxuXG5cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdbZGVidWddJywgZnJhZ21lbnRzLnVucmVnaXN0ZXJBdHRyaWJ1dGUoJ2RlYnVnJykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ1t0ZXh0XScsIGZyYWdtZW50cy51bnJlZ2lzdGVyQXR0cmlidXRlKCd0ZXh0JykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ1todG1sXScsIGZyYWdtZW50cy51bnJlZ2lzdGVyQXR0cmlidXRlKCdodG1sJykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ1tjbGFzczoqXScsIGZyYWdtZW50cy51bnJlZ2lzdGVyQXR0cmlidXRlKCdjbGFzcy0qJykpO1xuXG4gIHZhciBWYWx1ZUJpbmRlciA9IGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnW3ZhbHVlXScsIGZyYWdtZW50cy51bnJlZ2lzdGVyQXR0cmlidXRlKCd2YWx1ZScpKTtcbiAgVmFsdWVCaW5kZXIucHJvdG90eXBlLmV2ZW50c0F0dHJOYW1lID0gJ1t2YWx1ZS1ldmVudHNdJztcbiAgVmFsdWVCaW5kZXIucHJvdG90eXBlLmZpZWxkQXR0ck5hbWUgPSAnW3ZhbHVlLWZpZWxkXSc7XG5cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCcoKiknLCBmcmFnbWVudHMudW5yZWdpc3RlckF0dHJpYnV0ZSgnb24tKicpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCcoZW50ZXIpJywgZnJhZ21lbnRzLnVucmVnaXN0ZXJBdHRyaWJ1dGUoJ29uLWVudGVyJykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJyhjdHJsLWVudGVyKScsIGZyYWdtZW50cy51bnJlZ2lzdGVyQXR0cmlidXRlKCdvbi1jdHJsLWVudGVyJykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJyhlc2MpJywgZnJhZ21lbnRzLnVucmVnaXN0ZXJBdHRyaWJ1dGUoJ29uLWVzYycpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCcoZXNjYXBlKScsIGZyYWdtZW50cy5nZXRBdHRyaWJ1dGVCaW5kZXIoJyhlc2MpJykpO1xuXG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnWypdJywgZnJhZ21lbnRzLnVucmVnaXN0ZXJBdHRyaWJ1dGUoJyokJykpO1xuICAvKlxuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJyo/JywgZnJhZ21lbnRzLnVucmVnaXN0ZXJBdHRyaWJ1dGUoJyo/JykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ2NoZWNrZWQ/JywgZnJhZ21lbnRzLmdldEF0dHJpYnV0ZUJpbmRlcigndmFsdWUnKSk7XG4gICovXG5cbiAgdmFyIElmQmluZGluZyA9IGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnW2lmXScsIGZyYWdtZW50cy5nZXRBdHRyaWJ1dGVCaW5kZXIoJ2lmJykpO1xuICBJZkJpbmRpbmcucHJvdG90eXBlLnVubGVzc0F0dHJOYW1lID0gJ1t1bmxlc3NdJztcbiAgSWZCaW5kaW5nLnByb3RvdHlwZS5lbHNlSWZBdHRyTmFtZSA9ICdbZWxzZS1pZl0nO1xuICBJZkJpbmRpbmcucHJvdG90eXBlLmVsc2VVbmxlc3NBdHRyTmFtZSA9ICdbZWxzZS11bmxlc3NdJztcbiAgSWZCaW5kaW5nLnByb3RvdHlwZS5lbHNlQXR0ck5hbWUgPSAnW2Vsc2VdJztcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdbdW5sZXNzXScsIElmQmluZGluZyk7XG5cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdbcmVwZWF0XScsIGZyYWdtZW50cy5nZXRBdHRyaWJ1dGVCaW5kZXIoJ3JlcGVhdCcpKTtcbn1cbiIsInZhciBBcHAgPSByZXF1aXJlKCcuL2FwcCcpO1xuXG4vLyAjIENoaXBcblxuLy8gPiBDaGlwLmpzIDIuMC4wXG4vL1xuLy8gPiAoYykgMjAxMyBKYWNvYiBXcmlnaHQsIFRlYW1TbmFwXG4vLyBDaGlwIG1heSBiZSBmcmVlbHkgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxuLy8gRm9yIGFsbCBkZXRhaWxzIGFuZCBkb2N1bWVudGF0aW9uOlxuLy8gPGh0dHBzOi8vZ2l0aHViLmNvbS90ZWFtc25hcC9jaGlwLz5cblxuLy8gQ29udGVudHNcbi8vIC0tLS0tLS0tXG4vLyAqIFtjaGlwXShjaGlwLmh0bWwpIHRoZSBuYW1lc3BhY2UsIGNyZWF0ZXMgYXBwcywgYW5kIHJlZ2lzdGVycyBiaW5kaW5ncyBhbmQgZmlsdGVyc1xuLy8gKiBbQXBwXShhcHAuaHRtbCkgcmVwcmVzZW50cyBhbiBhcHAgdGhhdCBjYW4gaGF2ZSByb3V0ZXMsIGNvbnRyb2xsZXJzLCBhbmQgdGVtcGxhdGVzIGRlZmluZWRcbi8vICogW0NvbnRyb2xsZXJdKGNvbnRyb2xsZXIuaHRtbCkgaXMgdXNlZCBpbiB0aGUgYmluZGluZyB0byBhdHRhY2ggZGF0YSBhbmQgcnVuIGFjdGlvbnNcbi8vICogW1JvdXRlcl0ocm91dGVyLmh0bWwpIGlzIHVzZWQgZm9yIGhhbmRsaW5nIFVSTCByb3VudGluZ1xuLy8gKiBbRGVmYXVsdCBiaW5kZXJzXShiaW5kZXJzLmh0bWwpIHJlZ2lzdGVycyB0aGUgZGVmYXVsdCBiaW5kZXJzIGNoaXAgcHJvdmlkZXNcblxuLy8gQ3JlYXRlIENoaXAgQXBwXG4vLyAtLS0tLS0tLS0tLS0tXG4vLyBDcmVhdGVzIGEgbmV3IGNoaXAgYXBwXG5tb2R1bGUuZXhwb3J0cyA9IGNoaXA7XG5cbmZ1bmN0aW9uIGNoaXAobmFtZSwgcm9vdCkge1xuICB2YXIgYXBwID0gbmV3IEFwcChuYW1lKTtcbiAgYXBwLmluaXRBcHAocm9vdCk7XG4gIHJldHVybiBhcHA7XG59XG5cbmNoaXAuQXBwID0gQXBwO1xuY2hpcC5FdmVudEVtaXR0ZXIgPSByZXF1aXJlKCcuL2V2ZW50cycpO1xuY2hpcC5Db250cm9sbGVyID0gcmVxdWlyZSgnLi9jb250cm9sbGVyJyk7XG5jaGlwLlJvdXRlciA9IHJlcXVpcmUoJy4vcm91dGVyJyk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IENvbnRyb2xsZXI7XG52YXIgT2JzZXJ2ZXIgPSByZXF1aXJlKCdmcmFnbWVudHMtanMvc3JjL29ic2VydmVyJyk7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnLi9ldmVudHMnKTtcblxuLy8gIyBDaGlwIENvbnRyb2xsZXJcblxuLy8gQSBDb250cm9sbGVyIGlzIHRoZSBvYmplY3QgdG8gd2hpY2ggSFRNTCBlbGVtZW50cyBhcmUgYm91bmQuXG5mdW5jdGlvbiBDb250cm9sbGVyKCkge1xuICAvLyBFYWNoIGNvbnRyb2xsZXIgbmVlZHMgdW5pcXVlIGluc3RhbmNlcyBvZiB0aGVzZSBwcm9wZXJ0aWVzLiBJZiB3ZSBkb24ndCBzZXQgdGhlbSBoZXJlIHRoZXkgd2lsbCBiZSBpbmhlcml0ZWQgZnJvbVxuICAvLyB0aGUgcHJvdG90eXBlIGNoYWluIGFuZCBjYXVzZSBpc3N1ZXMuXG4gIHRoaXMuX29ic2VydmVycyA9IFtdO1xuICB0aGlzLl9jaGlsZHJlbiA9IFtdO1xuICB0aGlzLl9zeW5jTGlzdGVuZXJzID0gW107XG4gIHRoaXMuX2Nsb3NlZCA9IGZhbHNlO1xufVxuXG5Db250cm9sbGVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnRFbWl0dGVyLnByb3RvdHlwZSk7XG5Db250cm9sbGVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IENvbnRyb2xsZXI7XG5cblxuLy8gV2F0Y2hlcyBhbiBleHByZXNzaW9uIGZvciBjaGFuZ2VzLiBDYWxscyB0aGUgYGNhbGxiYWNrYCBpbW1lZGlhdGVseSB3aXRoIHRoZSBpbml0aWFsIHZhbHVlIGFuZCB0aGVuIGV2ZXJ5IHRpbWUgdGhlXG4vLyB2YWx1ZSBpbiB0aGUgZXhwcmVzc2lvbiBjaGFuZ2VzLiBBbiBleHByZXNzaW9uIGNhbiBiZSBhcyBzaW1wbGUgYXMgYG5hbWVgIG9yIGFzIGNvbXBsZXggYXMgYHVzZXIuZmlyc3ROYW1lICsgJyAnICtcbi8vIHVzZXIubGFzdE5hbWUgKyAnIC0gJyArIHVzZXIuZ2V0UG9zdGZpeCgpYFxuQ29udHJvbGxlci5wcm90b3R5cGUud2F0Y2ggPSBmdW5jdGlvbihleHByLCBza2lwVXBkYXRlLCBjYWxsYmFjaykge1xuICBpZiAodHlwZW9mIHNraXBVcGRhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICBjYWxsYmFjayA9IHNraXBVcGRhdGU7XG4gICAgc2tpcFVwZGF0ZSA9IGZhbHNlO1xuICB9XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkoZXhwcikpIHtcbiAgICB2YXIgb3JpZ0NhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgdmFyIGNhbGxlZFRoaXNSb3VuZCA9IGZhbHNlO1xuXG4gICAgLy8gd2l0aCBtdWx0aXBsZSBvYnNlcnZlcnMsIG9ubHkgY2FsbCB0aGUgb3JpZ2luYWwgY2FsbGJhY2sgb25jZSBvbiBjaGFuZ2VzXG4gICAgY2FsbGJhY2sgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmIChjYWxsZWRUaGlzUm91bmQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjYWxsZWRUaGlzUm91bmQgPSB0cnVlO1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgY2FsbGVkVGhpc1JvdW5kID0gZmFsc2U7XG4gICAgICB9KTtcblxuICAgICAgdmFyIHZhbHVlcyA9IG9ic2VydmVycy5tYXAoZnVuY3Rpb24ob2JzZXJ2ZXIpIHtcbiAgICAgICAgcmV0dXJuIG9ic2VydmVyLmdldCgpO1xuICAgICAgfSk7XG4gICAgICBvcmlnQ2FsbGJhY2suYXBwbHkobnVsbCwgdmFsdWVzKTtcbiAgICB9O1xuXG5cbiAgICB2YXIgb2JzZXJ2ZXJzID0gZXhwci5tYXAoZnVuY3Rpb24oZXhwcikge1xuICAgICAgdGhpcy53YXRjaChleHByLCB0cnVlLCBjYWxsYmFjayk7XG4gICAgfSwgdGhpcyk7XG5cbiAgICBpZiAoIXNraXBVcGRhdGUpIHtcbiAgICAgIGNhbGxiYWNrKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9ic2VydmVycztcbiAgfSBlbHNlIHtcbiAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgT2JzZXJ2ZXIoZXhwciwgY2FsbGJhY2ssIHRoaXMpO1xuICAgIG9ic2VydmVyLmJpbmQodGhpcywgc2tpcFVwZGF0ZSk7XG5cbiAgICAvLyBTdG9yZSB0aGUgb2JzZXJ2ZXJzIHdpdGggdGhlIGNvbnRyb2xsZXIgc28gd2hlbiBpdCBpcyBjbG9zZWQgd2UgY2FuIGNsZWFuIHVwIGFsbCBvYnNlcnZlcnMgYXMgd2VsbFxuICAgIHRoaXMuX29ic2VydmVycy5wdXNoKG9ic2VydmVyKTtcbiAgICByZXR1cm4gb2JzZXJ2ZXI7XG4gIH1cbn1cblxuLy8gU3RvcCB3YXRjaGluZyBhbiBleHByZXNzaW9uIGZvciBjaGFuZ2VzLlxuQ29udHJvbGxlci5wcm90b3R5cGUudW53YXRjaCA9IGZ1bmN0aW9uKGV4cHIsIGNhbGxiYWNrKSB7XG4gIHJldHVybiB0aGlzLl9vYnNlcnZlcnMuc29tZShmdW5jdGlvbihvYnNlcnZlciwgaW5kZXgpIHtcbiAgICBpZiAob2JzZXJ2ZXIuZXhwciA9PT0gZXhwciAmJiBvYnNlcnZlci5jYWxsYmFjayA9PT0gY2FsbGJhY2spIHtcbiAgICAgIE9ic2VydmVyLnJlbW92ZShvYnNlcnZlcik7XG4gICAgICB0aGlzLl9vYnNlcnZlcnMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfSwgdGhpcyk7XG59O1xuXG4vLyBFdmFsdWF0ZXMgYW4gZXhwcmVzc2lvbiBpbW1lZGlhdGVseSwgcmV0dXJuaW5nIHRoZSByZXN1bHRcbkNvbnRyb2xsZXIucHJvdG90eXBlLmV2YWwgPSBmdW5jdGlvbihleHByLCBhcmdzKSB7XG4gIGlmIChhcmdzKSB7XG4gICAgb3B0aW9ucyA9IHsgYXJnczogT2JqZWN0LmtleXMoYXJncykgfTtcbiAgICB2YWx1ZXMgPSBvcHRpb25zLmFyZ3MubWFwKGZ1bmN0aW9uKGtleSkgeyByZXR1cm4gYXJnc1trZXldOyB9KTtcbiAgfVxuICByZXR1cm4gT2JzZXJ2ZXIuZXhwcmVzc2lvbi5nZXQoZXhwciwgb3B0aW9ucykuYXBwbHkodGhpcywgdmFsdWVzKTtcbn07XG5cblxuLy8gRXZhbHVhdGVzIGFuIGV4cHJlc3Npb24gaW1tZWRpYXRlbHkgYXMgYSBzZXR0ZXIsIHNldHRpbmcgYHZhbHVlYCB0byB0aGUgZXhwcmVzc2lvbiBydW5uaW5nIHRocm91Z2ggZmlsdGVycy5cbkNvbnRyb2xsZXIucHJvdG90eXBlLmV2YWxTZXR0ZXIgPSBmdW5jdGlvbihleHByLCB2YWx1ZSkge1xuICB2YXIgY29udGV4dCA9IHRoaXMuaGFzT3duUHJvcGVydHkoJ19vcmlnQ29udGV4dF8nKSA/IHRoaXMuX29yaWdDb250ZXh0XyA6IHRoaXM7XG4gIGV4cHJlc3Npb24uZ2V0U2V0dGVyKGV4cHIpLmNhbGwoY29udGV4dCwgdmFsdWUpO1xufTtcblxuXG4vLyBDbG9uZXMgdGhlIG9iamVjdCBhdCB0aGUgZ2l2ZW4gcHJvcGVydHkgbmFtZSBmb3IgcHJvY2Vzc2luZyBmb3Jtc1xuQ29udHJvbGxlci5wcm90b3R5cGUuY2xvbmVWYWx1ZSA9IGZ1bmN0aW9uKHByb3BlcnR5KSB7XG4gIE9ic2VydmVyLmV4cHJlc3Npb24uZGlmZi5jbG9uZSh0aGlzW3Byb3BlcnR5XSk7XG59O1xuXG5cbi8vIFJlbW92ZXMgYW5kIGNsb3NlcyBhbGwgb2JzZXJ2ZXJzIGZvciBnYXJiYWdlLWNvbGxlY3Rpb25cbkNvbnRyb2xsZXIucHJvdG90eXBlLmNsb3NlQ29udHJvbGxlciA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5fY2xvc2VkKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdGhpcy5fY2xvc2VkID0gdHJ1ZTtcblxuICB0aGlzLl9jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgY2hpbGQuX3BhcmVudCA9IG51bGw7XG4gICAgY2hpbGQuY2xvc2VDb250cm9sbGVyKCk7XG4gIH0pO1xuXG4gIGlmICh0aGlzLl9wYXJlbnQpIHtcbiAgICB2YXIgaW5kZXggPSB0aGlzLl9wYXJlbnQuX2NoaWxkcmVuLmluZGV4T2YodGhpcyk7XG4gICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgdGhpcy5fcGFyZW50Ll9jaGlsZHJlbi5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH1cbiAgICB0aGlzLl9wYXJlbnQgPSBudWxsXG4gIH1cblxuICBpZiAodGhpcy5oYXNPd25Qcm9wZXJ0eSgnYmVmb3JlQ2xvc2UnKSkge1xuICAgIHRoaXMuYmVmb3JlQ2xvc2UoKTtcbiAgfVxuXG4gIHRoaXMuX3N5bmNMaXN0ZW5lcnMuZm9yRWFjaChmdW5jdGlvbihsaXN0ZW5lcikge1xuICAgIE9ic2VydmVyLnJlbW92ZU9uU3luYyhsaXN0ZW5lcik7XG4gIH0pO1xuICB0aGlzLl9zeW5jTGlzdGVuZXJzLmxlbmd0aCA9IDA7XG5cbiAgdGhpcy5fb2JzZXJ2ZXJzLmZvckVhY2goZnVuY3Rpb24ob2JzZXJ2ZXIpIHtcbiAgICBPYnNlcnZlci5yZW1vdmUob2JzZXJ2ZXIpO1xuICB9KTtcbiAgdGhpcy5fb2JzZXJ2ZXJzLmxlbmd0aCA9IDA7XG5cbiAgaWYgKHRoaXMuaGFzT3duUHJvcGVydHkoJ29uQ2xvc2UnKSkge1xuICAgIHRoaXMub25DbG9zZSgpO1xuICB9XG59O1xuXG5cbi8vIFN5bmNzIHRoZSBvYnNlcnZlcnMgdG8gcHJvcG9nYXRlIGNoYW5nZXMgdG8gdGhlIEhUTUwsIGNhbGwgY2FsbGJhY2sgYWZ0ZXJcbkNvbnRyb2xsZXIucHJvdG90eXBlLnN5bmMgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICBPYnNlcnZlci5zeW5jKGNhbGxiYWNrKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbi8vIFJ1bnMgdGhlIHN5bmMgb24gdGhlIG5leHQgdGljaywgY2FsbCBjYWxsYmFjayBhZnRlclxuQ29udHJvbGxlci5wcm90b3R5cGUuc3luY0xhdGVyID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgT2JzZXJ2ZXIuc3luY0xhdGVyKGNhbGxiYWNrKVxuICByZXR1cm4gdGhpcztcbn07XG5cblxuLy8gU3luY3MgdGhlIG9ic2VydmVycyB0byBwcm9wb2dhdGUgY2hhbmdlcyB0byB0aGUgSFRNTCBmb3IgdGhpcyBjb250cm9sbGVyIG9ubHlcbkNvbnRyb2xsZXIucHJvdG90eXBlLnN5bmNUaGlzID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuX29ic2VydmVycy5mb3JFYWNoKGZ1bmN0aW9uKG9ic2VydmVyKSB7XG4gICAgb2JzZXJ2ZXIuc3luYygpO1xuICB9KTtcbiAgdGhpcy5fY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihjaGlsZCkge1xuICAgIGNoaWxkLnN5bmNUaGlzKCk7XG4gIH0pO1xuICByZXR1cm4gdGhpcztcbn07XG5cblxuLy8gY2FsbCBjYWxsYmFjayBhZnRlciB0aGUgY3VycmVudCBzeW5jXG5Db250cm9sbGVyLnByb3RvdHlwZS5hZnRlclN5bmMgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICBPYnNlcnZlci5hZnRlclN5bmMoY2FsbGJhY2spO1xuICByZXR1cm4gdGhpcztcbn07XG5cblxuLy8gUnVucyB0aGUgbGlzdGVuZXIgb24gZXZlcnkgc3luYywgc3RvcHMgb25jZSB0aGUgY29udHJvbGxlciBpcyBjbG9zZWRcbkNvbnRyb2xsZXIucHJvdG90eXBlLm9uU3luYyA9IGZ1bmN0aW9uKGxpc3RlbmVyKSB7XG4gIHRoaXMuX3N5bmNMaXN0ZW5lcnMucHVzaChsaXN0ZW5lcik7XG4gIE9ic2VydmVyLm9uU3luYyhsaXN0ZW5lcik7XG4gIHJldHVybiB0aGlzO1xufVxuXG5cbi8vIFJlbW92ZXMgYSBzeW5jIGxpc3RlbmVyXG5Db250cm9sbGVyLnByb3RvdHlwZS5yZW1vdmVPblN5bmMgPSBmdW5jdGlvbihsaXN0ZW5lcikge1xuICB2YXIgaW5kZXggPSB0aGlzLl9zeW5jTGlzdGVuZXJzLmluZGV4T2YobGlzdGVuZXIpO1xuICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgdGhpcy5fc3luY0xpc3RlbmVycy5zcGxpY2UoaW5kZXgsIDEpO1xuICB9XG4gIE9ic2VydmVyLnJlbW92ZU9uU3luYyhsaXN0ZW5lcik7XG4gIHJldHVybiB0aGlzO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBBIHNpbXBsZSBldmVudCBlbWl0dGVyIHRvIHByb3ZpZGUgYW4gZXZlbnRpbmcgc3lzdGVtLlxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKGVtaXR0ZXIpIHtcbiAgaWYgKHRoaXMgaW5zdGFuY2VvZiBFdmVudEVtaXR0ZXIpIHtcbiAgICBlbWl0dGVyID0gdGhpcztcbiAgfVxuXG4gIHZhciBub2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuXG4gIC8vIEFkZCBldmVudCBsaXN0ZW5lclxuICBlbWl0dGVyLm9uID0gZW1pdHRlci5hZGRFdmVudExpc3RlbmVyID0gbm9kZS5hZGRFdmVudExpc3RlbmVyLmJpbmQobm9kZSk7XG5cbiAgLy8gUmVtb3ZlcyBldmVudCBsaXN0ZW5lclxuICBlbWl0dGVyLm9mZiA9IGVtaXR0ZXIucmVtb3ZlRXZlbnRMaXN0ZW5lciA9IG5vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lci5iaW5kKG5vZGUpO1xuXG4gIC8vIEFkZCBldmVudCBsaXN0ZW5lciB0byBvbmx5IGdldCBjYWxsZWQgb25jZSwgcmV0dXJucyB3cmFwcGVkIG1ldGhvZCBmb3IgcmVtb3ZpbmcgaWYgbmVlZGVkXG4gIGVtaXR0ZXIub25lID0gZnVuY3Rpb24gb25lKHR5cGUsIGxpc3RlbmVyKSB7XG4gICAgZnVuY3Rpb24gb25lKGV2ZW50KSB7XG4gICAgICBlbWl0dGVyLm9mZih0eXBlLCBvbmUpO1xuICAgICAgaWYgKHR5cGVvZiBsaXN0ZW5lciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBsaXN0ZW5lci5jYWxsKGV2ZW50KTtcbiAgICAgIH1cbiAgICB9XG4gICAgZW1pdHRlci5vbih0eXBlLCBvbmUpO1xuICAgIHJldHVybiBvbmU7XG4gIH1cblxuICAvLyBEaXNwYXRjaCBldmVudCBhbmQgdHJpZ2dlciBsaXN0ZW5lcnNcbiAgZW1pdHRlci5kaXNwYXRjaEV2ZW50ID0gZnVuY3Rpb24gZGlzcGF0Y2hFdmVudChldmVudCkge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShldmVudCwgJ3RhcmdldCcsIHsgdmFsdWU6IGVtaXR0ZXIgfSk7XG4gICAgcmV0dXJuIG5vZGUuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gUm91dGVyO1xuUm91dGVyLlJvdXRlID0gUm91dGU7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnLi9ldmVudHMnKTtcblxuLy8gIyBDaGlwIFJvdXRpbmdcblxuLy8gV29yayBpbnNwaXJlZCBieSBhbmQgaW4gc29tZSBjYXNlcyBiYXNlZCBvZmYgb2Ygd29yayBkb25lIGZvciBFeHByZXNzLmpzIChodHRwczovL2dpdGh1Yi5jb20vdmlzaW9ubWVkaWEvZXhwcmVzcylcbi8vIEV2ZW50czogZXJyb3IsIGNoYW5nZVxuZnVuY3Rpb24gUm91dGVyKCkge1xuICBFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcbiAgdGhpcy5yb3V0ZXMgPSBbXTtcbiAgdGhpcy5wYXJhbXMgPSB7fTtcbiAgdGhpcy5wYXJhbXNFeHAgPSB7fTtcbiAgdGhpcy5wcmVmaXggPSAnJztcbn1cblxuUm91dGVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnRFbWl0dGVyLnByb3RvdHlwZSk7XG5cblxuLy8gUmVnaXN0ZXJzIGEgYGNhbGxiYWNrYCBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2hlbiB0aGUgZ2l2ZW4gcGFyYW0gYG5hbWVgIGlzIG1hdGNoZWQgaW4gYSBVUkxcblJvdXRlci5wcm90b3R5cGUucGFyYW0gPSBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaykge1xuICBpZiAodHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgKHRoaXMucGFyYW1zW25hbWVdIHx8ICh0aGlzLnBhcmFtc1tuYW1lXSA9IFtdKSkucHVzaChjYWxsYmFjayk7XG4gIH0gZWxzZSBpZiAoY2FsbGJhY2sgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICB0aGlzLnBhcmFtc0V4cFtuYW1lXSA9IGNhbGxiYWNrO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3BhcmFtIG11c3QgaGF2ZSBhIGNhbGxiYWNrIG9mIHR5cGUgXCJmdW5jdGlvblwiIG9yIFJlZ0V4cC4gR290ICcgKyBjYWxsYmFjayArICcuJyk7XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbi8vIFJlZ2lzdGVycyBhIGBjYWxsYmFja2AgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdoZW4gdGhlIGdpdmVuIHBhdGggbWF0Y2hlcyBhIFVSTC4gVGhlIGNhbGxiYWNrIHJlY2VpdmVzIHR3b1xuLy8gYXJndW1lbnRzLCBgcmVxYCwgYW5kIGBuZXh0YCwgd2hlcmUgYHJlcWAgcmVwcmVzZW50cyB0aGUgcmVxdWVzdCBhbmQgaGFzIHRoZSBwcm9wZXJ0aWVzLCBgdXJsYCwgYHBhdGhgLCBgcGFyYW1zYFxuLy8gYW5kIGBxdWVyeWAuIGByZXEucGFyYW1zYCBpcyBhbiBvYmplY3Qgd2l0aCB0aGUgcGFyYW1ldGVycyBmcm9tIHRoZSBwYXRoIChlLmcuIC86dXNlcm5hbWUvKiB3b3VsZCBtYWtlIGEgcGFyYW1zXG4vLyBvYmplY3Qgd2l0aCB0d28gcHJvcGVydGllcywgYHVzZXJuYW1lYCBhbmQgYCpgKS4gYHJlcS5xdWVyeWAgaXMgYW4gb2JqZWN0IHdpdGgga2V5LXZhbHVlIHBhaXJzIGZyb20gdGhlIHF1ZXJ5XG4vLyBwb3J0aW9uIG9mIHRoZSBVUkwuXG5Sb3V0ZXIucHJvdG90eXBlLnJvdXRlID0gZnVuY3Rpb24ocGF0aCwgY2FsbGJhY2spIHtcbiAgaWYgKHR5cGVvZiBjYWxsYmFjayAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3JvdXRlIG11c3QgaGF2ZSBhIGNhbGxiYWNrIG9mIHR5cGUgXCJmdW5jdGlvblwiLiBHb3QgJyArIGNhbGxiYWNrICsgJy4nKTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgcGF0aCA9PT0gJ3N0cmluZycpIHtcbiAgICBwYXRoID0gJy8nICsgcGF0aDtcbiAgICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXC97Mix9L2csICcvJyk7XG4gIH1cbiAgdGhpcy5yb3V0ZXMucHVzaChuZXcgUm91dGUocGF0aCwgY2FsbGJhY2spKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5cblJvdXRlci5wcm90b3R5cGUucmVkaXJlY3QgPSBmdW5jdGlvbih1cmwsIHJlcGxhY2UpIHtcbiAgaWYgKHVybC5jaGFyQXQoMCkgPT09ICcuJyB8fCB1cmwuc3BsaXQoJy8vJykubGVuZ3RoID4gMSkge1xuICAgIHZhciBwYXRoUGFydHMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gICAgcGF0aFBhcnRzLmhyZWYgPSB1cmw7XG4gICAgdXJsID0gcGF0aG5hbWUocGF0aFBhcnRzKSArIHBhdGhQYXJ0cy5zZWFyY2g7XG4gIH0gZWxzZSB7XG4gICAgdXJsID0gdGhpcy5wcmVmaXggKyB1cmw7XG4gIH1cblxuICBpZiAodGhpcy5jdXJyZW50VXJsID09PSB1cmwpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBSZWRpcmVjdHMgaWYgdGhlIHVybCBpc24ndCBhdCB0aGlzIHBhZ2UuXG4gIGlmICghdGhpcy5oYXNoT25seSAmJiB0aGlzLnJvb3QgJiYgdXJsLmluZGV4T2YodGhpcy5yb290KSAhPT0gMCkge1xuICAgIGxvY2F0aW9uLmhyZWYgPSB1cmw7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmFyIG5vdEZvdW5kID0gZmFsc2U7XG4gIGZ1bmN0aW9uIGVyckhhbmRsZXIoZXZlbnQpIHtcbiAgICBpZiAoZXZlbnQuZGV0YWlsID09PSAnbm90Rm91bmQnKSB7XG4gICAgICBub3RGb3VuZCA9IHRydWU7XG4gICAgfVxuICB9XG4gIHRoaXMub24oJ2Vycm9yJywgZXJySGFuZGxlcik7XG5cbiAgaWYgKHRoaXMudXNlUHVzaFN0YXRlKSB7XG4gICAgaWYgKHJlcGxhY2UpIHtcbiAgICAgIGhpc3RvcnkucmVwbGFjZVN0YXRlKHt9LCAnJywgdXJsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaGlzdG9yeS5wdXNoU3RhdGUoe30sICcnLCB1cmwpO1xuICAgIH1cbiAgICB0aGlzLmN1cnJlbnRVcmwgPSB1cmw7XG4gICAgdGhpcy5kaXNwYXRjaCh1cmwpO1xuICB9IGVsc2Uge1xuICAgIGlmICghdGhpcy5oYXNoT25seSkge1xuICAgICAgdXJsID0gdXJsLnJlcGxhY2UodGhpcy5yb290LCAnJyk7XG4gICAgICBpZiAodXJsLmNoYXJBdCgwKSAhPT0gJy8nKSB7XG4gICAgICAgIHVybCA9ICcvJyArIHVybDtcbiAgICAgIH1cbiAgICB9XG4gICAgbG9jYXRpb24uaGFzaCA9ICh1cmwgPT09ICcvJyA/ICcnIDogJyMnICsgdXJsKTtcbiAgfVxuXG4gIHRoaXMub2ZmKCdlcnJvcicsIGVyckhhbmRsZXIpO1xuICByZXR1cm4gIW5vdEZvdW5kO1xufTtcblxuXG5Sb3V0ZXIucHJvdG90eXBlLmxpc3RlbiA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgaWYgKCFvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IHt9O1xuICB9XG4gIGlmIChvcHRpb25zLnN0b3ApIHtcbiAgICBpZiAodGhpcy5faGFuZGxlQ2hhbmdlKSB7XG4gICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCB0aGlzLl9oYW5kbGVDaGFuZ2UpO1xuICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2hhc2hDaGFuZ2UnLCB0aGlzLl9oYW5kbGVDaGFuZ2UpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGlmIChvcHRpb25zLnJvb3QgIT0gbnVsbCkgdGhpcy5yb290ID0gb3B0aW9ucy5yb290O1xuICBpZiAob3B0aW9ucy5wcmVmaXggIT0gbnVsbCkgdGhpcy5wcmVmaXggPSBvcHRpb25zLnByZWZpeDtcbiAgaWYgKG9wdGlvbnMuaGFzaE9ubHkgIT0gbnVsbCkgdGhpcy5oYXNoT25seSA9IG9wdGlvbnMuaGFzaE9ubHk7XG4gIHRoaXMudXNlUHVzaFN0YXRlID0gIXRoaXMuaGFzaE9ubHkgJiYgd2luZG93Lmhpc3RvcnkgJiYgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlICYmIHRydWU7XG4gIGlmICh0aGlzLnJvb3QgPT0gbnVsbCAmJiAhdGhpcy51c2VQdXNoU3RhdGUpIHRoaXMuaGFzaE9ubHkgPSB0cnVlO1xuICBpZiAodGhpcy5oYXNPbmx5KSB0aGlzLnByZWZpeCA9ICcnO1xuICB2YXIgZXZlbnROYW1lLCBnZXRVcmw7XG5cbiAgdGhpcy5faGFuZGxlQ2hhbmdlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHVybCA9IGdldFVybCgpO1xuICAgIGlmICh0aGlzLmN1cnJlbnRVcmwgPT09IHVybCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmN1cnJlbnRVcmwgPSB1cmw7XG4gICAgdGhpcy5kaXNwYXRjaCh1cmwpO1xuICB9LmJpbmQodGhpcyk7XG5cblxuICBpZiAodGhpcy51c2VQdXNoU3RhdGUpIHtcbiAgICAvLyBGaXggdGhlIFVSTCBpZiBsaW5rZWQgd2l0aCBhIGhhc2hcbiAgICBpZiAobG9jYXRpb24uaGFzaCkge1xuICAgICAgdXJsID0gbG9jYXRpb24ucGF0aG5hbWUucmVwbGFjZSgvXFwvJC8sICcnKSArIGxvY2F0aW9uLmhhc2gucmVwbGFjZSgvXiM/XFwvPy8sICcvJyk7XG4gICAgICBoaXN0b3J5LnJlcGxhY2VTdGF0ZSh7fSwgJycsIHVybCk7XG4gICAgfVxuXG4gICAgZXZlbnROYW1lID0gJ3BvcHN0YXRlJztcbiAgICBnZXRVcmwgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBsb2NhdGlvbi5wYXRobmFtZSArIGxvY2F0aW9uLnNlYXJjaDtcbiAgICB9O1xuICB9IGVsc2Uge1xuXG4gICAgZXZlbnROYW1lID0gJ2hhc2hjaGFuZ2UnO1xuICAgIGdldFVybCA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGxvY2F0aW9uLmhhc2gucmVwbGFjZSgvXiNcXC8/LywgJy8nKSB8fCAnLyc7XG4gICAgfTtcbiAgfVxuXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgdGhpcy5faGFuZGxlQ2hhbmdlKTtcblxuICB0aGlzLl9oYW5kbGVDaGFuZ2UoKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbnZhciB1cmxQYXJ0cyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcblxuUm91dGVyLnByb3RvdHlwZS5nZXRVcmxQYXJ0cyA9IGZ1bmN0aW9uKHVybCkge1xuICB1cmxQYXJ0cy5ocmVmID0gdXJsO1xuICB2YXIgcGF0aCA9IHBhdGhuYW1lKHVybFBhcnRzKTtcbiAgaWYgKHBhdGguaW5kZXhPZih0aGlzLnByZWZpeCkgIT09IDApIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBwYXRoID0gcGF0aC5yZXBsYWNlKHRoaXMucHJlZml4LCAnJyk7XG4gIGlmIChwYXRoLmNoYXJBdCgwKSAhPT0gJy8nKSB7XG4gICAgcGF0aCA9ICcvJyArIHBhdGg7XG4gIH1cbiAgcmV0dXJuIHsgcGF0aDogcGF0aCwgcXVlcnk6IHVybFBhcnRzLnNlYXJjaCB9O1xufTtcblxuXG5Sb3V0ZXIucHJvdG90eXBlLmdldFJvdXRlc01hdGNoaW5nUGF0aCA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgaWYgKHBhdGggPT0gbnVsbCkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuICB2YXIgcGFyYW1zRXhwID0gdGhpcy5wYXJhbXNFeHA7XG5cbiAgcmV0dXJuIHRoaXMucm91dGVzLmZpbHRlcihmdW5jdGlvbihyb3V0ZSkge1xuICAgIGlmICghcm91dGUubWF0Y2gocGF0aCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gT2JqZWN0LmtleXMocm91dGUucGFyYW1zKS5ldmVyeShmdW5jdGlvbihrZXkpIHtcbiAgICAgIHZhciB2YWx1ZSA9IHJvdXRlLnBhcmFtc1trZXldO1xuICAgICAgcmV0dXJuICFwYXJhbXNFeHAuaGFzT3duUHJvcGVydHkoa2V5KSB8fCBwYXJhbXNFeHBba2V5XS50ZXh0KHZhbHVlKTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG5cblxuLy8gRGlzcGF0Y2hlcyBhbGwgY2FsbGJhY2tzIHdoaWNoIG1hdGNoIHRoZSBgdXJsYC4gYHVybGAgc2hvdWxkIGJlIHRoZSBmdWxsIHBhdGhuYW1lIG9mIHRoZSBsb2NhdGlvbiBhbmQgc2hvdWxkIG5vdFxuLy8gYmUgdXNlZCBieSB5b3VyIGFwcGxpY2F0aW9uLiBVc2UgYHJlZGlyZWN0KClgIGluc3RlYWQuXG5Sb3V0ZXIucHJvdG90eXBlLmRpc3BhdGNoID0gZnVuY3Rpb24odXJsKSB7XG4gIHZhciB1cmxQYXJ0cyA9IHRoaXMuZ2V0VXJsUGFydHModXJsKTtcbiAgaWYgKCF1cmxQYXJ0cykge1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgcGF0aCA9IHVybFBhcnRzLnBhdGg7XG4gIHZhciByZXEgPSB7IHVybDogdXJsLCBwYXRoOiBwYXRoLCBxdWVyeTogcGFyc2VRdWVyeSh1cmxQYXJ0cy5xdWVyeSkgfTtcbiAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnY2hhbmdlJywgeyBkZXRhaWw6IHBhdGggfSkpO1xuXG4gIHZhciByb3V0ZXMgPSB0aGlzLmdldFJvdXRlc01hdGNoaW5nUGF0aChwYXRoKTtcbiAgdmFyIGNhbGxiYWNrcyA9IFtdO1xuICB2YXIgcGFyYW1zID0gdGhpcy5wYXJhbXM7XG5cbiAgLy8gQWRkIGFsbCB0aGUgY2FsbGJhY2tzIGZvciB0aGlzIFVSTCAoYWxsIG1hdGNoaW5nIHJvdXRlcyBhbmQgdGhlIHBhcmFtcyB0aGV5J3JlIGRlcGVuZGVudCBvbilcbiAgcm91dGVzLmZvckVhY2goZnVuY3Rpb24ocm91dGUpIHtcbiAgICAvLyBzZXQgdGhlIHBhcmFtcyBvbiB0aGUgcmVxIG9iamVjdCBmaXJzdFxuICAgIGNhbGxiYWNrcy5wdXNoKGZ1bmN0aW9uKHJlcSwgbmV4dCkge1xuICAgICAgcmVxLnBhcmFtcyA9IHJvdXRlLnBhcmFtcztcbiAgICAgIG5leHQoKTtcbiAgICB9KTtcblxuICAgIE9iamVjdC5rZXlzKHJvdXRlLnBhcmFtcykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgIHZhciBwYXJhbUNhbGxiYWNrcyA9IHRoaXMucGFyYW1zW2tleV07XG4gICAgICBpZiAocGFyYW1DYWxsYmFja3MpIHtcbiAgICAgICAgY2FsbGJhY2tzLnB1c2guYXBwbHkoY2FsbGJhY2tzLCBwYXJhbUNhbGxiYWNrcyk7XG4gICAgICB9XG4gICAgfSwgdGhpcyk7XG5cbiAgICBjYWxsYmFja3MucHVzaChyb3V0ZS5jYWxsYmFjayk7XG4gIH0sIHRoaXMpO1xuXG4gIC8vIENhbGxzIGVhY2ggY2FsbGJhY2sgb25lIGJ5IG9uZSB1bnRpbCBlaXRoZXIgdGhlcmUgaXMgYW4gZXJyb3Igb3Igd2UgY2FsbCBhbGwgb2YgdGhlbS5cbiAgdmFyIG5leHQgPSBmdW5jdGlvbihlcnIpIHtcbiAgICBpZiAoZXJyKSB7XG4gICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdlcnJvcicsIHsgZGV0YWlsOiBlcnIgfSkpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghY2FsbGJhY2tzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIG5leHQoJ25vdEZvdW5kJyk7XG4gICAgfVxuXG4gICAgY2FsbGJhY2sgPSBjYWxsYmFja3Muc2hpZnQoKTtcbiAgICBjYWxsYmFjayhyZXEsIG5leHQpO1xuICB9LmJpbmQodGhpcyk7XG5cbiAgLy8gU3RhcnQgcnVubmluZyB0aGUgY2FsbGJhY2tzLCBvbmUgYnkgb25lXG4gIGlmIChjYWxsYmFja3MubGVuZ3RoID09PSAwKSB7XG4gICAgbmV4dCgnbm90Rm91bmQnKTtcbiAgfSBlbHNlIHtcbiAgICBuZXh0KCk7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cblxuLy8gRGVmaW5lcyBhIGNlbnRyYWwgcm91dGluZyBvYmplY3Qgd2hpY2ggaGFuZGxlcyBhbGwgVVJMIGNoYW5nZXMgYW5kIHJvdXRlcy5cbmZ1bmN0aW9uIFJvdXRlKHBhdGgsIGNhbGxiYWNrKSB7XG4gIHRoaXMucGF0aCA9IHBhdGg7XG4gIHRoaXMuY2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgdGhpcy5rZXlzID0gW107XG4gIHRoaXMuZXhwciA9IHBhcnNlUGF0aChwYXRoLCB0aGlzLmtleXMpO1xufVxuXG5cbi8vIERldGVybWluZXMgd2hldGhlciByb3V0ZSBtYXRjaGVzIHBhdGhcblJvdXRlLnByb3RvdHlwZS5tYXRjaCA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIG1hdGNoID0gdGhpcy5leHByLmV4ZWMocGF0aCk7XG4gIGlmICghbWF0Y2gpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgdGhpcy5wYXJhbXMgPSB7fTtcblxuICBmb3IgKHZhciBpID0gMTsgaSA8IG1hdGNoLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGtleSA9IHRoaXMua2V5c1tpIC0gMV07XG4gICAgdmFyIHZhbHVlID0gbWF0Y2hbaV07XG5cbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgdmFsdWUgPSBkZWNvZGVVUklDb21wb25lbnQodmFsdWUpO1xuICAgIH1cblxuICAgIGlmICgha2V5KSB7XG4gICAgICBrZXkgPSAnKic7XG4gICAgfVxuXG4gICAgdGhpcy5wYXJhbXNba2V5XSA9IHZhbHVlO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5cbi8vIE5vcm1hbGl6ZXMgdGhlIGdpdmVuIHBhdGggc3RyaW5nLCByZXR1cm5pbmcgYSByZWd1bGFyIGV4cHJlc3Npb24uXG4vL1xuLy8gQW4gZW1wdHkgYXJyYXkgc2hvdWxkIGJlIHBhc3NlZCwgd2hpY2ggd2lsbCBjb250YWluIHRoZSBwbGFjZWhvbGRlciBrZXkgbmFtZXMuIEZvciBleGFtcGxlIGBcIi91c2VyLzppZFwiYCB3aWxsIHRoZW5cbi8vIGNvbnRhaW4gYFtcImlkXCJdYC5cbmZ1bmN0aW9uIHBhcnNlUGF0aChwYXRoLCBrZXlzKSB7XG4gIGlmIChwYXRoIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgcmV0dXJuIHBhdGg7XG4gIH1cblxuICBpZiAoQXJyYXkuaXNBcnJheShwYXRoKSkge1xuICAgIHBhdGggPSAnKCcgKyBwYXRoLmpvaW4oJ3wnKSArICcpJztcbiAgfVxuXG4gIHBhdGggPSBwYXRoXG4gICAgLmNvbmNhdCgnLz8nKVxuICAgIC5yZXBsYWNlKC9cXC9cXCgvZywgJyg/Oi8nKVxuICAgIC5yZXBsYWNlKC8oXFwvKT8oXFwuKT86KFxcdyspKD86KFxcKC4qP1xcKSkpPyhcXD8pPyhcXCopPy9nLCBmdW5jdGlvbihfLCBzbGFzaCwgZm9ybWF0LCBrZXksIGNhcHR1cmUsIG9wdGlvbmFsLCBzdGFyKSB7XG4gICAgICBrZXlzLnB1c2goa2V5KTtcbiAgICAgIHNsYXNoID0gc2xhc2ggfHwgJyc7XG4gICAgICB2YXIgZXhwciA9ICcnO1xuICAgICAgaWYgKCFvcHRpb25hbCkgZXhwciArPSBzbGFzaDtcbiAgICAgIGV4cHIgKz0gJyg/Oic7XG4gICAgICBpZiAob3B0aW9uYWwpIGV4cHIgKz0gc2xhc2g7XG4gICAgICBleHByICs9IGZvcm1hdCB8fCAnJztcbiAgICAgIGV4cHIgKz0gY2FwdHVyZSB8fCAoZm9ybWF0ICYmICcoW14vLl0rPyknIHx8ICcoW14vXSs/KScpICsgJyknO1xuICAgICAgZXhwciArPSBvcHRpb25hbCB8fCAnJztcbiAgICAgIGlmIChzdGFyKSBleHByICs9ICcoLyopPyc7XG4gICAgICByZXR1cm4gZXhwcjtcbiAgICB9KVxuICAgIC5yZXBsYWNlKC8oW1xcLy5dKS9nLCAnXFxcXCQxJylcbiAgICAucmVwbGFjZSgvXFwqL2csICcoLiopJyk7XG4gIHJldHVybiBuZXcgUmVnRXhwKCdeJyArIHBhdGggKyAnJCcsICdpJyk7XG59XG5cblxuLy8gUGFyc2VzIGEgbG9jYXRpb24uc2VhcmNoIHN0cmluZyBpbnRvIGFuIG9iamVjdCB3aXRoIGtleS12YWx1ZSBwYWlycy5cbmZ1bmN0aW9uIHBhcnNlUXVlcnkoc2VhcmNoKSB7XG4gIHZhciBxdWVyeSA9IHt9O1xuICBpZiAoc2VhcmNoID09PSAnJykge1xuICAgIHJldHVybiBxdWVyeTtcbiAgfVxuXG4gIHNlYXJjaC5yZXBsYWNlKC9eXFw/LywgJycpLnNwbGl0KCcmJykuZm9yRWFjaChmdW5jdGlvbihrZXlWYWx1ZSkge1xuICAgIHZhciBwYXJ0cyA9IGtleVZhbHVlLnNwbGl0KCc9Jyk7XG4gICAgdmFyIGtleSA9IHBhcnRzWzBdO1xuICAgIHZhciB2YWx1ZSA9IHBhcnRzWzFdO1xuICAgIHF1ZXJ5W2RlY29kZVVSSUNvbXBvbmVudChrZXkpXSA9IGRlY29kZVVSSUNvbXBvbmVudCh2YWx1ZSk7XG4gIH0pO1xuXG4gIHJldHVybiBxdWVyeTtcbn1cblxuLy8gRml4IElFJ3MgbWlzc2luZyBzbGFzaCBwcmVmaXhcbmZ1bmN0aW9uIHBhdGhuYW1lKGFuY2hvcikge1xuICB2YXIgcGF0aCA9IGFuY2hvci5wYXRobmFtZTtcbiAgaWYgKHBhdGguY2hhckF0KDApICE9PSAnLycpIHtcbiAgICBwYXRoID0gJy8nICsgcGF0aDtcbiAgfVxuICByZXR1cm4gcGF0aDtcbn1cbiIsInZhciBGcmFnbWVudHMgPSByZXF1aXJlKCcuL3NyYy9mcmFnbWVudHMnKTtcbnZhciBPYnNlcnZlciA9IHJlcXVpcmUoJy4vc3JjL29ic2VydmVyJyk7XG5cbmZ1bmN0aW9uIGNyZWF0ZSgpIHtcbiAgdmFyIGZyYWdtZW50cyA9IG5ldyBGcmFnbWVudHMoT2JzZXJ2ZXIpO1xuICBmcmFnbWVudHMuZXhwcmVzc2lvbiA9IE9ic2VydmVyLmV4cHJlc3Npb247XG4gIGZyYWdtZW50cy5zeW5jID0gT2JzZXJ2ZXIuc3luYztcbiAgcmV0dXJuIGZyYWdtZW50cztcbn1cblxuLy8gQ3JlYXRlIGFuIGluc3RhbmNlIG9mIGZyYWdtZW50cyB3aXRoIHRoZSBkZWZhdWx0IG9ic2VydmVyXG5tb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZSgpO1xubW9kdWxlLmV4cG9ydHMuY3JlYXRlID0gY3JlYXRlO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBBbmltYXRlZEJpbmRpbmc7XG52YXIgYW5pbWF0aW9uID0gcmVxdWlyZSgnLi91dGlsL2FuaW1hdGlvbicpO1xudmFyIEJpbmRpbmcgPSByZXF1aXJlKCcuL2JpbmRpbmcnKTtcbnZhciBfc3VwZXIgPSBCaW5kaW5nLnByb3RvdHlwZTtcblxuLyoqXG4gKiBCaW5kaW5ncyB3aGljaCBleHRlbmQgQW5pbWF0ZWRCaW5kaW5nIGhhdmUgdGhlIGFiaWxpdHkgdG8gYW5pbWF0ZSBlbGVtZW50cyB0aGF0IGFyZSBhZGRlZCB0byB0aGUgRE9NIGFuZCByZW1vdmVkIGZyb21cbiAqIHRoZSBET00uIFRoaXMgYWxsb3dzIG1lbnVzIHRvIHNsaWRlIG9wZW4gYW5kIGNsb3NlZCwgZWxlbWVudHMgdG8gZmFkZSBpbiBvciBkcm9wIGRvd24sIGFuZCByZXBlYXRlZCBpdGVtcyB0byBhcHBlYXJcbiAqIHRvIG1vdmUgKGlmIHlvdSBnZXQgY3JlYXRpdmUgZW5vdWdoKS5cbiAqXG4gKiBUaGUgZm9sbG93aW5nIDUgbWV0aG9kcyBhcmUgaGVscGVyIERPTSBtZXRob2RzIHRoYXQgYWxsb3cgcmVnaXN0ZXJlZCBiaW5kaW5ncyB0byB3b3JrIHdpdGggQ1NTIHRyYW5zaXRpb25zIGZvclxuICogYW5pbWF0aW5nIGVsZW1lbnRzLiBJZiBhbiBlbGVtZW50IGhhcyB0aGUgYGFuaW1hdGVgIGF0dHJpYnV0ZSBvciBhIG1hdGNoaW5nIEphdmFTY3JpcHQgbWV0aG9kLCB0aGVzZSBoZWxwZXIgbWV0aG9kc1xuICogd2lsbCBzZXQgYSBjbGFzcyBvbiB0aGUgbm9kZSB0byB0cmlnZ2VyIHRoZSBhbmltYXRpb24gYW5kL29yIGNhbGwgdGhlIEphdmFTY3JpcHQgbWV0aG9kcyB0byBoYW5kbGUgaXQuXG4gKlxuICogQW4gYW5pbWF0aW9uIG1heSBiZSBlaXRoZXIgYSBDU1MgdHJhbnNpdGlvbiwgYSBDU1MgYW5pbWF0aW9uLCBvciBhIHNldCBvZiBKYXZhU2NyaXB0IG1ldGhvZHMgdGhhdCB3aWxsIGJlIGNhbGxlZC5cbiAqXG4gKiBJZiB1c2luZyBDU1MsIGNsYXNzZXMgYXJlIGFkZGVkIGFuZCByZW1vdmVkIGZyb20gdGhlIGVsZW1lbnQuIFdoZW4gYW4gZWxlbWVudCBpcyBpbnNlcnRlZCBpdCB3aWxsIHJlY2VpdmUgdGhlIGB3aWxsLVxuICogYW5pbWF0ZS1pbmAgY2xhc3MgYmVmb3JlIGJlaW5nIGFkZGVkIHRvIHRoZSBET00sIHRoZW4gaXQgd2lsbCByZWNlaXZlIHRoZSBgYW5pbWF0ZS1pbmAgY2xhc3MgaW1tZWRpYXRlbHkgYWZ0ZXIgYmVpbmdcbiAqIGFkZGVkIHRvIHRoZSBET00sIHRoZW4gYm90aCBjbGFzZXMgd2lsbCBiZSByZW1vdmVkIGFmdGVyIHRoZSBhbmltYXRpb24gaXMgY29tcGxldGUuIFdoZW4gYW4gZWxlbWVudCBpcyBiZWluZyByZW1vdmVkXG4gKiBmcm9tIHRoZSBET00gaXQgd2lsbCByZWNlaXZlIHRoZSBgd2lsbC1hbmltYXRlLW91dGAgYW5kIGBhbmltYXRlLW91dGAgY2xhc3NlcywgdGhlbiB0aGUgY2xhc3NlcyB3aWxsIGJlIHJlbW92ZWQgb25jZVxuICogdGhlIGFuaW1hdGlvbiBpcyBjb21wbGV0ZS5cbiAqXG4gKiBJZiB1c2luZyBKYXZhU2NyaXB0LCBtZXRob2RzIG11c3QgYmUgZGVmaW5lZCAgdG8gYW5pbWF0ZSB0aGUgZWxlbWVudCB0aGVyZSBhcmUgMyBzdXBwb3J0ZWQgbWV0aG9kcyB3aGljaCBjYW4gYlxuICpcbiAqIFRPRE8gY2FjaGUgYnkgY2xhc3MtbmFtZSAoQW5ndWxhcik/IE9ubHkgc3VwcG9ydCBqYXZhc2NyaXB0LXN0eWxlIChFbWJlcik/IEFkZCBhIGB3aWxsLWFuaW1hdGUtaW5gIGFuZFxuICogYGRpZC1hbmltYXRlLWluYCBldGMuP1xuICogSUYgaGFzIGFueSBjbGFzc2VzLCBhZGQgdGhlIGB3aWxsLWFuaW1hdGUtaW58b3V0YCBhbmQgZ2V0IGNvbXB1dGVkIGR1cmF0aW9uLiBJZiBub25lLCByZXR1cm4uIENhY2hlLlxuICogUlVMRSBpcyB1c2UgdW5pcXVlIGNsYXNzIHRvIGRlZmluZSBhbiBhbmltYXRpb24uIE9yIGF0dHJpYnV0ZSBgYW5pbWF0ZT1cImZhZGVcImAgd2lsbCBhZGQgdGhlIGNsYXNzP1xuICogYC5mYWRlLndpbGwtYW5pbWF0ZS1pbmAsIGAuZmFkZS5hbmltYXRlLWluYCwgYC5mYWRlLndpbGwtYW5pbWF0ZS1vdXRgLCBgLmZhZGUuYW5pbWF0ZS1vdXRgXG4gKlxuICogRXZlbnRzIHdpbGwgYmUgdHJpZ2dlcmVkIG9uIHRoZSBlbGVtZW50cyBuYW1lZCB0aGUgc2FtZSBhcyB0aGUgY2xhc3MgbmFtZXMgKGUuZy4gYGFuaW1hdGUtaW5gKSB3aGljaCBtYXkgYmUgbGlzdGVuZWRcbiAqIHRvIGluIG9yZGVyIHRvIGNhbmNlbCBhbiBhbmltYXRpb24gb3IgcmVzcG9uZCB0byBpdC5cbiAqXG4gKiBJZiB0aGUgbm9kZSBoYXMgbWV0aG9kcyBgYW5pbWF0ZUluKGRvbmUpYCwgYGFuaW1hdGVPdXQoZG9uZSlgLCBgYW5pbWF0ZU1vdmVJbihkb25lKWAsIG9yIGBhbmltYXRlTW92ZU91dChkb25lKWBcbiAqIGRlZmluZWQgb24gdGhlbSB0aGVuIHRoZSBoZWxwZXJzIHdpbGwgYWxsb3cgYW4gYW5pbWF0aW9uIGluIEphdmFTY3JpcHQgdG8gYmUgcnVuIGFuZCB3YWl0IGZvciB0aGUgYGRvbmVgIGZ1bmN0aW9uIHRvXG4gKiBiZSBjYWxsZWQgdG8ga25vdyB3aGVuIHRoZSBhbmltYXRpb24gaXMgY29tcGxldGUuXG4gKlxuICogQmUgc3VyZSB0byBhY3R1YWxseSBoYXZlIGFuIGFuaW1hdGlvbiBkZWZpbmVkIGZvciBlbGVtZW50cyB3aXRoIHRoZSBgYW5pbWF0ZWAgY2xhc3MvYXR0cmlidXRlIGJlY2F1c2UgdGhlIGhlbHBlcnMgdXNlXG4gKiB0aGUgYHRyYW5zaXRpb25lbmRgIGFuZCBgYW5pbWF0aW9uZW5kYCBldmVudHMgdG8ga25vdyB3aGVuIHRoZSBhbmltYXRpb24gaXMgZmluaXNoZWQsIGFuZCBpZiB0aGVyZSBpcyBubyBhbmltYXRpb25cbiAqIHRoZXNlIGV2ZW50cyB3aWxsIG5ldmVyIGJlIHRyaWdnZXJlZCBhbmQgdGhlIG9wZXJhdGlvbiB3aWxsIG5ldmVyIGNvbXBsZXRlLlxuICovXG5mdW5jdGlvbiBBbmltYXRlZEJpbmRpbmcocHJvcGVydGllcykge1xuICB2YXIgZWxlbWVudCA9IHByb3BlcnRpZXMubm9kZTtcbiAgdmFyIGFuaW1hdGUgPSBlbGVtZW50LmdldEF0dHJpYnV0ZShwcm9wZXJ0aWVzLmZyYWdtZW50cy5hbmltYXRlQXR0cmlidXRlKTtcbiAgdmFyIGZyYWdtZW50cyA9IHByb3BlcnRpZXMuZnJhZ21lbnRzO1xuXG4gIGlmIChhbmltYXRlICE9PSBudWxsKSB7XG4gICAgaWYgKGVsZW1lbnQubm9kZU5hbWUgPT09ICdURU1QTEFURScgfHwgZWxlbWVudC5ub2RlTmFtZSA9PT0gJ1NDUklQVCcpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGFuaW1hdGUgbXVsdGlwbGUgbm9kZXMgaW4gYSB0ZW1wbGF0ZSBvciBzY3JpcHQuIFJlbW92ZSB0aGUgW2FuaW1hdGVdIGF0dHJpYnV0ZS4nKTtcbiAgICB9XG5cbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgLy8gQWxsb3cgbXVsdGlwbGUgYmluZGluZ3MgdG8gYW5pbWF0ZSBieSBub3QgcmVtb3ZpbmcgdW50aWwgdGhleSBoYXZlIGFsbCBiZWVuIGNyZWF0ZWRcbiAgICAgIGVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKHByb3BlcnRpZXMuZnJhZ21lbnRzLmFuaW1hdGVBdHRyaWJ1dGUpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5hbmltYXRlID0gdHJ1ZTtcblxuICAgIGlmIChmcmFnbWVudHMuaXNCb3VuZCgnYXR0cmlidXRlJywgYW5pbWF0ZSkpIHtcbiAgICAgIC8vIGphdmFzY3JpcHQgYW5pbWF0aW9uXG4gICAgICB0aGlzLmFuaW1hdGVFeHByZXNzaW9uID0gZnJhZ21lbnRzLmNvZGlmeUV4cHJlc3Npb24oJ2F0dHJpYnV0ZScsIGFuaW1hdGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoYW5pbWF0ZVswXSA9PT0gJy4nKSB7XG4gICAgICAgIC8vIGNsYXNzIGFuaW1hdGlvblxuICAgICAgICB0aGlzLmFuaW1hdGVDbGFzc05hbWUgPSBhbmltYXRlLnNsaWNlKDEpO1xuICAgICAgfSBlbHNlIGlmIChhbmltYXRlKSB7XG4gICAgICAgIC8vIHJlZ2lzdGVyZWQgYW5pbWF0aW9uXG4gICAgICAgIHZhciBhbmltYXRlT2JqZWN0ID0gZnJhZ21lbnRzLmdldEFuaW1hdGlvbihhbmltYXRlKTtcbiAgICAgICAgaWYgKHR5cGVvZiBhbmltYXRlT2JqZWN0ID09PSAnZnVuY3Rpb24nKSBhbmltYXRlT2JqZWN0ID0gbmV3IGFuaW1hdGVPYmplY3QodGhpcyk7XG4gICAgICAgIHRoaXMuYW5pbWF0ZU9iamVjdCA9IGFuaW1hdGVPYmplY3Q7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgQmluZGluZy5jYWxsKHRoaXMsIHByb3BlcnRpZXMpO1xufVxuXG5cbkJpbmRpbmcuZXh0ZW5kKEFuaW1hdGVkQmluZGluZywge1xuICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICBfc3VwZXIuaW5pdC5jYWxsKHRoaXMpO1xuXG4gICAgaWYgKHRoaXMuYW5pbWF0ZUV4cHJlc3Npb24pIHtcbiAgICAgIHRoaXMuYW5pbWF0ZU9ic2VydmVyID0gbmV3IHRoaXMuT2JzZXJ2ZXIodGhpcy5hbmltYXRlRXhwcmVzc2lvbiwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhpcy5hbmltYXRlT2JqZWN0ID0gdmFsdWU7XG4gICAgICB9LCB0aGlzKTtcbiAgICB9XG4gIH0sXG5cbiAgYmluZDogZnVuY3Rpb24oY29udGV4dCkge1xuICAgIGlmICh0aGlzLmNvbnRleHQgPT0gY29udGV4dCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBfc3VwZXIuYmluZC5jYWxsKHRoaXMsIGNvbnRleHQpO1xuXG4gICAgaWYgKHRoaXMuYW5pbWF0ZU9ic2VydmVyKSB7XG4gICAgICB0aGlzLmFuaW1hdGVPYnNlcnZlci5iaW5kKGNvbnRleHQpO1xuICAgIH1cbiAgfSxcblxuICB1bmJpbmQ6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLmNvbnRleHQgPT09IG51bGwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgX3N1cGVyLnVuYmluZC5jYWxsKHRoaXMpO1xuXG4gICAgaWYgKHRoaXMuYW5pbWF0ZU9ic2VydmVyKSB7XG4gICAgICB0aGlzLmFuaW1hdGVPYnNlcnZlci51bmJpbmQoKTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEhlbHBlciBtZXRob2QgdG8gcmVtb3ZlIGEgbm9kZSBmcm9tIHRoZSBET00sIGFsbG93aW5nIGZvciBhbmltYXRpb25zIHRvIG9jY3VyLiBgY2FsbGJhY2tgIHdpbGwgYmUgY2FsbGVkIHdoZW5cbiAgICogZmluaXNoZWQuXG4gICAqL1xuICBhbmltYXRlT3V0OiBmdW5jdGlvbihub2RlLCBjYWxsYmFjaykge1xuICAgIGlmIChub2RlLmZpcnN0Vmlld05vZGUpIG5vZGUgPSBub2RlLmZpcnN0Vmlld05vZGU7XG5cbiAgICB0aGlzLmFuaW1hdGVOb2RlKCdvdXQnLCBub2RlLCBmdW5jdGlvbigpIHtcbiAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2suY2FsbCh0aGlzKTtcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogSGVscGVyIG1ldGhvZCB0byBpbnNlcnQgYSBub2RlIGluIHRoZSBET00gYmVmb3JlIGFub3RoZXIgbm9kZSwgYWxsb3dpbmcgZm9yIGFuaW1hdGlvbnMgdG8gb2NjdXIuIGBjYWxsYmFja2Agd2lsbFxuICAgKiBiZSBjYWxsZWQgd2hlbiBmaW5pc2hlZC4gSWYgYGJlZm9yZWAgaXMgbm90IHByb3ZpZGVkIHRoZW4gdGhlIGFuaW1hdGlvbiB3aWxsIGJlIHJ1biB3aXRob3V0IGluc2VydGluZyB0aGUgbm9kZS5cbiAgICovXG4gIGFuaW1hdGVJbjogZnVuY3Rpb24obm9kZSwgY2FsbGJhY2spIHtcbiAgICBpZiAobm9kZS5maXJzdFZpZXdOb2RlKSBub2RlID0gbm9kZS5maXJzdFZpZXdOb2RlO1xuICAgIHRoaXMuYW5pbWF0ZU5vZGUoJ2luJywgbm9kZSwgY2FsbGJhY2ssIHRoaXMpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBbGxvdyBhbiBlbGVtZW50IHRvIHVzZSBDU1MzIHRyYW5zaXRpb25zIG9yIGFuaW1hdGlvbnMgdG8gYW5pbWF0ZSBpbiBvciBvdXQgb2YgdGhlIHBhZ2UuXG4gICAqL1xuICBhbmltYXRlTm9kZTogZnVuY3Rpb24oZGlyZWN0aW9uLCBub2RlLCBjYWxsYmFjaykge1xuICAgIHZhciBhbmltYXRlT2JqZWN0LCBjbGFzc05hbWUsIG5hbWUsIHdpbGxOYW1lLCBkaWROYW1lLCBfdGhpcyA9IHRoaXM7XG5cbiAgICBpZiAodGhpcy5hbmltYXRlT2JqZWN0ICYmIHR5cGVvZiB0aGlzLmFuaW1hdGVPYmplY3QgPT09ICdvYmplY3QnKSB7XG4gICAgICBhbmltYXRlT2JqZWN0ID0gdGhpcy5hbmltYXRlT2JqZWN0O1xuICAgIH0gZWxzZSBpZiAodGhpcy5hbmltYXRlQ2xhc3NOYW1lKSB7XG4gICAgICBjbGFzc05hbWUgPSB0aGlzLmFuaW1hdGVDbGFzc05hbWU7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdGhpcy5hbmltYXRlT2JqZWN0ID09PSAnc3RyaW5nJykge1xuICAgICAgY2xhc3NOYW1lID0gdGhpcy5hbmltYXRlT2JqZWN0O1xuICAgIH1cblxuICAgIGlmIChhbmltYXRlT2JqZWN0KSB7XG4gICAgICB2YXIgZGlyID0gZGlyZWN0aW9uID09PSAnaW4nID8gJ0luJyA6ICdPdXQnO1xuICAgICAgbmFtZSA9ICdhbmltYXRlJyArIGRpcjtcbiAgICAgIHdpbGxOYW1lID0gJ3dpbGxBbmltYXRlJyArIGRpcjtcbiAgICAgIGRpZE5hbWUgPSAnZGlkQW5pbWF0ZScgKyBkaXI7XG5cbiAgICAgIGFuaW1hdGlvbi5tYWtlRWxlbWVudEFuaW1hdGFibGUobm9kZSk7XG5cbiAgICAgIGlmIChhbmltYXRlT2JqZWN0W3dpbGxOYW1lXSkge1xuICAgICAgICBhbmltYXRlT2JqZWN0W3dpbGxOYW1lXShub2RlKTtcbiAgICAgICAgLy8gdHJpZ2dlciByZWZsb3dcbiAgICAgICAgbm9kZS5vZmZzZXRXaWR0aCA9IG5vZGUub2Zmc2V0V2lkdGg7XG4gICAgICB9XG5cbiAgICAgIGlmIChhbmltYXRlT2JqZWN0W25hbWVdKSB7XG4gICAgICAgIGFuaW1hdGVPYmplY3RbbmFtZV0obm9kZSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKGFuaW1hdGVPYmplY3RbZGlkTmFtZV0pIGFuaW1hdGVPYmplY3RbZGlkTmFtZV0obm9kZSk7XG4gICAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjay5jYWxsKF90aGlzKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG5hbWUgPSAnYW5pbWF0ZS0nICsgZGlyZWN0aW9uO1xuICAgICAgd2lsbE5hbWUgPSAnd2lsbC1hbmltYXRlLScgKyBkaXJlY3Rpb247XG4gICAgICBpZiAoY2xhc3NOYW1lKSBub2RlLmNsYXNzTGlzdC5hZGQoY2xhc3NOYW1lKTtcblxuICAgICAgaWYgKGRpcmVjdGlvbiA9PT0gJ2luJykge1xuICAgICAgICB2YXIgbmV4dCA9IG5vZGUubmV4dFNpYmxpbmcsIHBhcmVudCA9IG5vZGUucGFyZW50Tm9kZTtcbiAgICAgICAgcGFyZW50LnJlbW92ZUNoaWxkKG5vZGUpO1xuICAgICAgICBub2RlLmNsYXNzTGlzdC5hZGQod2lsbE5hbWUpO1xuICAgICAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKG5vZGUsIG5leHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gdHJpZ2dlciByZWZsb3dcbiAgICAgICAgbm9kZS5vZmZzZXRXaWR0aCA9IG5vZGUub2Zmc2V0V2lkdGg7XG4gICAgICB9XG5cbiAgICAgIG5vZGUuY2xhc3NMaXN0LnJlbW92ZSh3aWxsTmFtZSk7XG4gICAgICBub2RlLmNsYXNzTGlzdC5hZGQobmFtZSk7XG5cbiAgICAgIHZhciBkdXJhdGlvbiA9IGdldER1cmF0aW9uLmNhbGwodGhpcywgbm9kZSwgZGlyZWN0aW9uKTtcbiAgICAgIGZ1bmN0aW9uIHdoZW5Eb25lKCkge1xuICAgICAgICBub2RlLmNsYXNzTGlzdC5yZW1vdmUobmFtZSk7XG4gICAgICAgIGlmIChjbGFzc05hbWUpIG5vZGUuY2xhc3NMaXN0LnJlbW92ZShjbGFzc05hbWUpO1xuICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrLmNhbGwoX3RoaXMpO1xuICAgICAgfVxuXG4gICAgICBpZiAoZHVyYXRpb24pIHtcbiAgICAgICAgc2V0VGltZW91dCh3aGVuRG9uZSwgZHVyYXRpb24pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgd2hlbkRvbmUoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn0pO1xuXG5cbnZhciB0cmFuc2l0aW9uRHVyYXRpb25OYW1lID0gJ3RyYW5zaXRpb25EdXJhdGlvbic7XG52YXIgdHJhbnNpdGlvbkRlbGF5TmFtZSA9ICd0cmFuc2l0aW9uRGVsYXknO1xudmFyIGFuaW1hdGlvbkR1cmF0aW9uTmFtZSA9ICdhbmltYXRpb25EdXJhdGlvbic7XG52YXIgYW5pbWF0aW9uRGVsYXlOYW1lID0gJ2FuaW1hdGlvbkRlbGF5JztcbnZhciBzdHlsZSA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZTtcbmlmIChzdHlsZS50cmFuc2l0aW9uRHVyYXRpb24gPT09IHVuZGVmaW5lZCAmJiBzdHlsZS53ZWJraXRUcmFuc2l0aW9uRHVyYXRpb24gIT09IHVuZGVmaW5lZCkge1xuICB0cmFuc2l0aW9uRHVyYXRpb25OYW1lID0gJ3dlYmtpdFRyYW5zaXRpb25EdXJhdGlvbic7XG4gIHRyYW5zaXRpb25EZWxheU5hbWUgPSAnd2Via2l0VHJhbnNpdGlvbkRlbGF5Jztcbn1cbmlmIChzdHlsZS5hbmltYXRpb25EdXJhdGlvbiA9PT0gdW5kZWZpbmVkICYmIHN0eWxlLndlYmtpdEFuaW1hdGlvbkR1cmF0aW9uICE9PSB1bmRlZmluZWQpIHtcbiAgYW5pbWF0aW9uRHVyYXRpb25OYW1lID0gJ3dlYmtpdEFuaW1hdGlvbkR1cmF0aW9uJztcbiAgYW5pbWF0aW9uRGVsYXlOYW1lID0gJ3dlYmtpdEFuaW1hdGlvbkRlbGF5Jztcbn1cblxuXG5mdW5jdGlvbiBnZXREdXJhdGlvbihub2RlLCBkaXJlY3Rpb24pIHtcbiAgdmFyIG1pbGxpc2Vjb25kcyA9IHRoaXMuY2xvbmVkRnJvbVsnX19hbmltYXRpb25EdXJhdGlvbicgKyBkaXJlY3Rpb25dO1xuICBpZiAoIW1pbGxpc2Vjb25kcykge1xuICAgIC8vIFJlY2FsYyBpZiBub2RlIHdhcyBvdXQgb2YgRE9NIGJlZm9yZSBhbmQgaGFkIDAgZHVyYXRpb24sIGFzc3VtZSB0aGVyZSBpcyBhbHdheXMgU09NRSBkdXJhdGlvbi5cbiAgICB2YXIgc3R5bGVzID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUobm9kZSk7XG4gICAgdmFyIHNlY29uZHMgPSBNYXRoLm1heChwYXJzZUZsb2F0KHN0eWxlc1t0cmFuc2l0aW9uRHVyYXRpb25OYW1lXSB8fCAwKSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJzZUZsb2F0KHN0eWxlc1t0cmFuc2l0aW9uRGVsYXlOYW1lXSB8fCAwKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlRmxvYXQoc3R5bGVzW2FuaW1hdGlvbkR1cmF0aW9uTmFtZV0gfHwgMCkgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VGbG9hdChzdHlsZXNbYW5pbWF0aW9uRGVsYXlOYW1lXSB8fCAwKSk7XG4gICAgbWlsbGlzZWNvbmRzID0gc2Vjb25kcyAqIDEwMDAgfHwgMDtcbiAgICB0aGlzLmNsb25lZEZyb20uX19hbmltYXRpb25EdXJhdGlvbl9fID0gbWlsbGlzZWNvbmRzO1xuICB9XG4gIHJldHVybiBtaWxsaXNlY29uZHM7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IEJpbmRpbmc7XG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnLi91dGlsL2V4dGVuZCcpO1xuXG4vKipcbiAqIEEgYmluZGluZyBpcyBhIGxpbmsgYmV0d2VlbiBhbiBlbGVtZW50IGFuZCBzb21lIGRhdGEuIFN1YmNsYXNzZXMgb2YgQmluZGluZyBjYWxsZWQgYmluZGVycyBkZWZpbmUgd2hhdCBhIGJpbmRpbmcgZG9lc1xuICogd2l0aCB0aGF0IGxpbmsuIEluc3RhbmNlcyBvZiB0aGVzZSBiaW5kZXJzIGFyZSBjcmVhdGVkIGFzIGJpbmRpbmdzIG9uIHRlbXBsYXRlcy4gV2hlbiBhIHZpZXcgaXMgc3RhbXBlZCBvdXQgZnJvbSB0aGVcbiAqIHRlbXBsYXRlIHRoZSBiaW5kaW5nIGlzIFwiY2xvbmVkXCIgKGl0IGlzIGFjdHVhbGx5IGV4dGVuZGVkIGZvciBwZXJmb3JtYW5jZSkgYW5kIHRoZSBgZWxlbWVudGAvYG5vZGVgIHByb3BlcnR5IGlzXG4gKiB1cGRhdGVkIHRvIHRoZSBtYXRjaGluZyBlbGVtZW50IGluIHRoZSB2aWV3LlxuICpcbiAqICMjIyBQcm9wZXJ0aWVzXG4gKiAgKiBlbGVtZW50OiBUaGUgZWxlbWVudCAob3IgdGV4dCBub2RlKSB0aGlzIGJpbmRpbmcgaXMgYm91bmQgdG9cbiAqICAqIG5vZGU6IEFsaWFzIG9mIGVsZW1lbnQsIHNpbmNlIGJpbmRpbmdzIG1heSBhcHBseSB0byB0ZXh0IG5vZGVzIHRoaXMgaXMgbW9yZSBhY2N1cmF0ZVxuICogICogbmFtZTogVGhlIGF0dHJpYnV0ZSBvciBlbGVtZW50IG5hbWUgKGRvZXMgbm90IGFwcGx5IHRvIG1hdGNoZWQgdGV4dCBub2RlcylcbiAqICAqIG1hdGNoOiBUaGUgbWF0Y2hlZCBwYXJ0IG9mIHRoZSBuYW1lIGZvciB3aWxkY2FyZCBhdHRyaWJ1dGVzIChlLmcuIGBvbi0qYCBtYXRjaGluZyBhZ2FpbnN0IGBvbi1jbGlja2Agd291bGQgaGF2ZSBhXG4gKiAgICBtYXRjaCBwcm9wZXJ0eSBlcXVhbGxpbmcgYGNsaWNrYCkuIFVzZSBgdGhpcy5jYW1lbENhc2VgIHRvIGdldCB0aGUgbWF0Y2ggcHJvZXJ0eSBjYW1lbENhc2VkLlxuICogICogZXhwcmVzc2lvbjogVGhlIGV4cHJlc3Npb24gdGhpcyBiaW5kaW5nIHdpbGwgdXNlIGZvciBpdHMgdXBkYXRlcyAoZG9lcyBub3QgYXBwbHkgdG8gbWF0Y2hlZCBlbGVtZW50cylcbiAqICAqIGNvbnRleHQ6IFRoZSBjb250ZXh0IHRoZSBleHJlc3Npb24gb3BlcmF0ZXMgd2l0aGluIHdoZW4gYm91bmRcbiAqL1xuZnVuY3Rpb24gQmluZGluZyhwcm9wZXJ0aWVzKSB7XG4gIGlmICghcHJvcGVydGllcy5ub2RlIHx8ICFwcm9wZXJ0aWVzLnZpZXcpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBIGJpbmRpbmcgbXVzdCByZWNlaXZlIGEgbm9kZSBhbmQgYSB2aWV3Jyk7XG4gIH1cblxuICAvLyBlbGVtZW50IGFuZCBub2RlIGFyZSBhbGlhc2VzXG4gIHRoaXMuX2VsZW1lbnRQYXRoID0gaW5pdE5vZGVQYXRoKHByb3BlcnRpZXMubm9kZSwgcHJvcGVydGllcy52aWV3KTtcbiAgdGhpcy5ub2RlID0gcHJvcGVydGllcy5ub2RlO1xuICB0aGlzLmVsZW1lbnQgPSBwcm9wZXJ0aWVzLm5vZGU7XG4gIHRoaXMubmFtZSA9IHByb3BlcnRpZXMubmFtZTtcbiAgdGhpcy5tYXRjaCA9IHByb3BlcnRpZXMubWF0Y2g7XG4gIHRoaXMuZXhwcmVzc2lvbiA9IHByb3BlcnRpZXMuZXhwcmVzc2lvbjtcbiAgdGhpcy5mcmFnbWVudHMgPSBwcm9wZXJ0aWVzLmZyYWdtZW50cztcbiAgdGhpcy5jb250ZXh0ID0gbnVsbDtcbn1cblxuZXh0ZW5kKEJpbmRpbmcsIHtcbiAgLyoqXG4gICAqIERlZmF1bHQgcHJpb3JpdHkgYmluZGVycyBtYXkgb3ZlcnJpZGUuXG4gICAqL1xuICBwcmlvcml0eTogMCxcblxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGEgY2xvbmVkIGJpbmRpbmcuIFRoaXMgaGFwcGVucyBhZnRlciBhIGNvbXBpbGVkIGJpbmRpbmcgb24gYSB0ZW1wbGF0ZSBpcyBjbG9uZWQgZm9yIGEgdmlldy5cbiAgICovXG4gIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLmV4cHJlc3Npb24pIHtcbiAgICAgIC8vIEFuIG9ic2VydmVyIHRvIG9ic2VydmUgdmFsdWUgY2hhbmdlcyB0byB0aGUgZXhwcmVzc2lvbiB3aXRoaW4gYSBjb250ZXh0XG4gICAgICB0aGlzLm9ic2VydmVyID0gbmV3IHRoaXMuT2JzZXJ2ZXIodGhpcy5leHByZXNzaW9uLCB0aGlzLnVwZGF0ZWQsIHRoaXMpO1xuICAgIH1cbiAgICB0aGlzLmNyZWF0ZWQoKTtcbiAgfSxcblxuICAvKipcbiAgICogQ2xvbmUgdGhpcyBiaW5kaW5nIGZvciBhIHZpZXcuIFRoZSBlbGVtZW50L25vZGUgd2lsbCBiZSB1cGRhdGVkIGFuZCB0aGUgYmluZGluZyB3aWxsIGJlIGluaXRlZC5cbiAgICovXG4gIGNsb25lRm9yVmlldzogZnVuY3Rpb24odmlldykge1xuICAgIGlmICghdmlldykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQSBiaW5kaW5nIG11c3QgY2xvbmUgYWdhaW5zdCBhIHZpZXcnKTtcbiAgICB9XG5cbiAgICB2YXIgbm9kZSA9IHZpZXc7XG4gICAgdGhpcy5fZWxlbWVudFBhdGguZm9yRWFjaChmdW5jdGlvbihpbmRleCkge1xuICAgICAgbm9kZSA9IG5vZGUuY2hpbGROb2Rlc1tpbmRleF07XG4gICAgfSk7XG5cbiAgICB2YXIgYmluZGluZyA9IE9iamVjdC5jcmVhdGUodGhpcyk7XG4gICAgYmluZGluZy5jbG9uZWRGcm9tID0gdGhpcztcbiAgICBiaW5kaW5nLmVsZW1lbnQgPSBub2RlO1xuICAgIGJpbmRpbmcubm9kZSA9IG5vZGU7XG4gICAgYmluZGluZy5pbml0KCk7XG4gICAgcmV0dXJuIGJpbmRpbmc7XG4gIH0sXG5cblxuICAvLyBCaW5kIHRoaXMgdG8gdGhlIGdpdmVuIGNvbnRleHQgb2JqZWN0XG4gIGJpbmQ6IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgICBpZiAodGhpcy5jb250ZXh0ID09IGNvbnRleHQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICAgIGlmICh0aGlzLm9ic2VydmVyKSB7XG4gICAgICBpZiAodGhpcy51cGRhdGVkICE9PSBCaW5kaW5nLnByb3RvdHlwZS51cGRhdGVkKSB7XG4gICAgICAgIHRoaXMub2JzZXJ2ZXIuZm9yY2VVcGRhdGVOZXh0U3luYyA9IHRydWU7XG4gICAgICAgIHRoaXMub2JzZXJ2ZXIuYmluZChjb250ZXh0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHNldCB0aGUgY29udGV4dCBidXQgZG9uJ3QgYWN0dWFsbHkgYmluZCBpdCBzaW5jZSBgdXBkYXRlZGAgaXMgYSBuby1vcFxuICAgICAgICB0aGlzLm9ic2VydmVyLmNvbnRleHQgPSBjb250ZXh0O1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmJvdW5kKCk7XG4gIH0sXG5cblxuICAvLyBVbmJpbmQgdGhpcyBmcm9tIGl0cyBjb250ZXh0XG4gIHVuYmluZDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuY29udGV4dCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuY29udGV4dCA9IG51bGw7XG4gICAgaWYgKHRoaXMub2JzZXJ2ZXIpIHRoaXMub2JzZXJ2ZXIudW5iaW5kKCk7XG4gICAgdGhpcy51bmJvdW5kKCk7XG4gIH0sXG5cblxuICAvLyBDbGVhbnMgdXAgYmluZGluZyBjb21wbGV0ZWx5XG4gIGRpc3Bvc2U6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudW5iaW5kKCk7XG4gICAgaWYgKHRoaXMub2JzZXJ2ZXIpIHtcbiAgICAgIC8vIFRoaXMgd2lsbCBjbGVhciBpdCBvdXQsIG51bGxpZnlpbmcgYW55IGRhdGEgc3RvcmVkXG4gICAgICB0aGlzLm9ic2VydmVyLnN5bmMoKTtcbiAgICB9XG4gICAgdGhpcy5kaXNwb3NlZCgpO1xuICB9LFxuXG5cbiAgLy8gVGhlIGZ1bmN0aW9uIHRvIHJ1biB3aGVuIHRoZSBiaW5kaW5nJ3MgZWxlbWVudCBpcyBjb21waWxlZCB3aXRoaW4gYSB0ZW1wbGF0ZVxuICBjb21waWxlZDogZnVuY3Rpb24oKSB7fSxcblxuICAvLyBUaGUgZnVuY3Rpb24gdG8gcnVuIHdoZW4gdGhlIGJpbmRpbmcncyBlbGVtZW50IGlzIGNyZWF0ZWRcbiAgY3JlYXRlZDogZnVuY3Rpb24oKSB7fSxcblxuICAvLyBUaGUgZnVuY3Rpb24gdG8gcnVuIHdoZW4gdGhlIGV4cHJlc3Npb24ncyB2YWx1ZSBjaGFuZ2VzXG4gIHVwZGF0ZWQ6IGZ1bmN0aW9uKCkge30sXG5cbiAgLy8gVGhlIGZ1bmN0aW9uIHRvIHJ1biB3aGVuIHRoZSBiaW5kaW5nIGlzIGJvdW5kXG4gIGJvdW5kOiBmdW5jdGlvbigpIHt9LFxuXG4gIC8vIFRoZSBmdW5jdGlvbiB0byBydW4gd2hlbiB0aGUgYmluZGluZyBpcyB1bmJvdW5kXG4gIHVuYm91bmQ6IGZ1bmN0aW9uKCkge30sXG5cbiAgLy8gVGhlIGZ1bmN0aW9uIHRvIHJ1biB3aGVuIHRoZSBiaW5kaW5nIGlzIGRpc3Bvc2VkXG4gIGRpc3Bvc2VkOiBmdW5jdGlvbigpIHt9LFxuXG4gIC8vIEhlbHBlciBtZXRob2RzXG5cbiAgZ2V0IGNhbWVsQ2FzZSgpIHtcbiAgICByZXR1cm4gKHRoaXMubWF0Y2ggfHwgdGhpcy5uYW1lIHx8ICcnKS5yZXBsYWNlKC8tKyhcXHcpL2csIGZ1bmN0aW9uKF8sIGNoYXIpIHtcbiAgICAgIHJldHVybiBjaGFyLnRvVXBwZXJDYXNlKCk7XG4gICAgfSk7XG4gIH0sXG5cbiAgb2JzZXJ2ZTogZnVuY3Rpb24oZXhwcmVzc2lvbiwgY2FsbGJhY2ssIGNhbGxiYWNrQ29udGV4dCkge1xuICAgIHJldHVybiBuZXcgdGhpcy5PYnNlcnZlcihleHByZXNzaW9uLCBjYWxsYmFjaywgY2FsbGJhY2tDb250ZXh0IHx8IHRoaXMpO1xuICB9XG59KTtcblxuXG5cblxudmFyIGluZGV4T2YgPSBBcnJheS5wcm90b3R5cGUuaW5kZXhPZjtcblxuLy8gQ3JlYXRlcyBhbiBhcnJheSBvZiBpbmRleGVzIHRvIGhlbHAgZmluZCB0aGUgc2FtZSBlbGVtZW50IHdpdGhpbiBhIGNsb25lZCB2aWV3XG5mdW5jdGlvbiBpbml0Tm9kZVBhdGgobm9kZSwgdmlldykge1xuICB2YXIgcGF0aCA9IFtdO1xuICB3aGlsZSAobm9kZSAhPT0gdmlldykge1xuICAgIHZhciBwYXJlbnQgPSBub2RlLnBhcmVudE5vZGU7XG4gICAgcGF0aC51bnNoaWZ0KGluZGV4T2YuY2FsbChwYXJlbnQuY2hpbGROb2Rlcywgbm9kZSkpO1xuICAgIG5vZGUgPSBwYXJlbnQ7XG4gIH1cbiAgcmV0dXJuIHBhdGg7XG59XG4iLCJ2YXIgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG5tb2R1bGUuZXhwb3J0cyA9IGNvbXBpbGU7XG5cblxuLy8gV2Fsa3MgdGhlIHRlbXBsYXRlIERPTSByZXBsYWNpbmcgYW55IGJpbmRpbmdzIGFuZCBjYWNoaW5nIGJpbmRpbmdzIG9udG8gdGhlIHRlbXBsYXRlIG9iamVjdC5cbmZ1bmN0aW9uIGNvbXBpbGUoZnJhZ21lbnRzLCB0ZW1wbGF0ZSkge1xuICB2YXIgd2Fsa2VyID0gZG9jdW1lbnQuY3JlYXRlVHJlZVdhbGtlcih0ZW1wbGF0ZSwgTm9kZUZpbHRlci5TSE9XX0VMRU1FTlQgfCBOb2RlRmlsdGVyLlNIT1dfVEVYVCk7XG4gIHZhciBiaW5kaW5ncyA9IFtdLCBjdXJyZW50Tm9kZSwgcGFyZW50Tm9kZSwgcHJldmlvdXNOb2RlO1xuXG4gIC8vIFJlc2V0IGZpcnN0IG5vZGUgdG8gZW5zdXJlIGl0IGlzbid0IGEgZnJhZ21lbnRcbiAgd2Fsa2VyLm5leHROb2RlKCk7XG4gIHdhbGtlci5wcmV2aW91c05vZGUoKTtcblxuICAvLyBmaW5kIGJpbmRpbmdzIGZvciBlYWNoIG5vZGVcbiAgZG8ge1xuICAgIGN1cnJlbnROb2RlID0gd2Fsa2VyLmN1cnJlbnROb2RlO1xuICAgIHBhcmVudE5vZGUgPSBjdXJyZW50Tm9kZS5wYXJlbnROb2RlO1xuICAgIGJpbmRpbmdzLnB1c2guYXBwbHkoYmluZGluZ3MsIGdldEJpbmRpbmdzRm9yTm9kZShmcmFnbWVudHMsIGN1cnJlbnROb2RlLCB0ZW1wbGF0ZSkpO1xuXG4gICAgaWYgKGN1cnJlbnROb2RlLnBhcmVudE5vZGUgIT09IHBhcmVudE5vZGUpIHtcbiAgICAgIC8vIGN1cnJlbnROb2RlIHdhcyByZW1vdmVkIGFuZCBtYWRlIGEgdGVtcGxhdGVcbiAgICAgIHdhbGtlci5jdXJyZW50Tm9kZSA9IHByZXZpb3VzTm9kZSB8fCB3YWxrZXIucm9vdDtcbiAgICB9IGVsc2Uge1xuICAgICAgcHJldmlvdXNOb2RlID0gY3VycmVudE5vZGU7XG4gICAgfVxuICB9IHdoaWxlICh3YWxrZXIubmV4dE5vZGUoKSk7XG5cbiAgcmV0dXJuIGJpbmRpbmdzO1xufVxuXG5cblxuLy8gRmluZCBhbGwgdGhlIGJpbmRpbmdzIG9uIGEgZ2l2ZW4gbm9kZSAodGV4dCBub2RlcyB3aWxsIG9ubHkgZXZlciBoYXZlIG9uZSBiaW5kaW5nKS5cbmZ1bmN0aW9uIGdldEJpbmRpbmdzRm9yTm9kZShmcmFnbWVudHMsIG5vZGUsIHZpZXcpIHtcbiAgdmFyIGJpbmRpbmdzID0gW107XG4gIHZhciBCaW5kZXIsIGJpbmRpbmcsIGV4cHIsIGJvdW5kLCBtYXRjaCwgYXR0ciwgaTtcblxuICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gTm9kZS5URVhUX05PREUpIHtcbiAgICBzcGxpdFRleHROb2RlKGZyYWdtZW50cywgbm9kZSk7XG5cbiAgICAvLyBGaW5kIGFueSBiaW5kaW5nIGZvciB0aGUgdGV4dCBub2RlXG4gICAgaWYgKGZyYWdtZW50cy5pc0JvdW5kKCd0ZXh0Jywgbm9kZS5ub2RlVmFsdWUpKSB7XG4gICAgICBleHByID0gZnJhZ21lbnRzLmNvZGlmeUV4cHJlc3Npb24oJ3RleHQnLCBub2RlLm5vZGVWYWx1ZSk7XG4gICAgICBub2RlLm5vZGVWYWx1ZSA9ICcnO1xuICAgICAgQmluZGVyID0gZnJhZ21lbnRzLmZpbmRCaW5kZXIoJ3RleHQnLCBleHByKTtcbiAgICAgIGJpbmRpbmcgPSBuZXcgQmluZGVyKHsgbm9kZTogbm9kZSwgdmlldzogdmlldywgZXhwcmVzc2lvbjogZXhwciwgZnJhZ21lbnRzOiBmcmFnbWVudHMgfSk7XG4gICAgICBpZiAoYmluZGluZy5jb21waWxlZCgpICE9PSBmYWxzZSkge1xuICAgICAgICBiaW5kaW5ncy5wdXNoKGJpbmRpbmcpO1xuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyBJZiB0aGUgZWxlbWVudCBpcyByZW1vdmVkIGZyb20gdGhlIERPTSwgc3RvcC4gQ2hlY2sgYnkgbG9va2luZyBhdCBpdHMgcGFyZW50Tm9kZVxuICAgIHZhciBwYXJlbnQgPSBub2RlLnBhcmVudE5vZGU7XG4gICAgdmFyIERlZmF1bHRCaW5kZXIgPSBmcmFnbWVudHMuZ2V0QXR0cmlidXRlQmluZGVyKCdfX2RlZmF1bHRfXycpO1xuXG4gICAgLy8gRmluZCBhbnkgYmluZGluZyBmb3IgdGhlIGVsZW1lbnRcbiAgICBCaW5kZXIgPSBmcmFnbWVudHMuZmluZEJpbmRlcignZWxlbWVudCcsIG5vZGUudGFnTmFtZS50b0xvd2VyQ2FzZSgpKTtcbiAgICBpZiAoQmluZGVyKSB7XG4gICAgICBiaW5kaW5nID0gbmV3IEJpbmRlcih7IG5vZGU6IG5vZGUsIHZpZXc6IHZpZXcsIGZyYWdtZW50czogZnJhZ21lbnRzIH0pO1xuICAgICAgaWYgKGJpbmRpbmcuY29tcGlsZWQoKSAhPT0gZmFsc2UpIHtcbiAgICAgICAgYmluZGluZ3MucHVzaChiaW5kaW5nKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBJZiByZW1vdmVkLCBtYWRlIGEgdGVtcGxhdGUsIGRvbid0IGNvbnRpbnVlIHByb2Nlc3NpbmdcbiAgICBpZiAobm9kZS5wYXJlbnROb2RlICE9PSBwYXJlbnQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBGaW5kIGFuZCBhZGQgYW55IGF0dHJpYnV0ZSBiaW5kaW5ncyBvbiBhbiBlbGVtZW50LiBUaGVzZSBjYW4gYmUgYXR0cmlidXRlcyB3aG9zZSBuYW1lIG1hdGNoZXMgYSBiaW5kaW5nLCBvclxuICAgIC8vIHRoZXkgY2FuIGJlIGF0dHJpYnV0ZXMgd2hpY2ggaGF2ZSBhIGJpbmRpbmcgaW4gdGhlIHZhbHVlIHN1Y2ggYXMgYGhyZWY9XCIvcG9zdC97eyBwb3N0LmlkIH19XCJgLlxuICAgIHZhciBib3VuZCA9IFtdO1xuICAgIHZhciBhdHRyaWJ1dGVzID0gc2xpY2UuY2FsbChub2RlLmF0dHJpYnV0ZXMpO1xuICAgIGZvciAoaSA9IDAsIGwgPSBhdHRyaWJ1dGVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgdmFyIGF0dHIgPSBhdHRyaWJ1dGVzW2ldO1xuICAgICAgdmFyIEJpbmRlciA9IGZyYWdtZW50cy5maW5kQmluZGVyKCdhdHRyaWJ1dGUnLCBhdHRyLm5hbWUsIGF0dHIudmFsdWUpO1xuICAgICAgaWYgKEJpbmRlcikge1xuICAgICAgICBib3VuZC5wdXNoKFsgQmluZGVyLCBhdHRyIF0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE1ha2Ugc3VyZSB0byBjcmVhdGUgYW5kIHByb2Nlc3MgdGhlbSBpbiB0aGUgY29ycmVjdCBwcmlvcml0eSBvcmRlciBzbyBpZiBhIGJpbmRpbmcgY3JlYXRlIGEgdGVtcGxhdGUgZnJvbSB0aGVcbiAgICAvLyBub2RlIGl0IGRvZXNuJ3QgcHJvY2VzcyB0aGUgb3RoZXJzLlxuICAgIGJvdW5kLnNvcnQoc29ydEF0dHJpYnV0ZXMpO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IGJvdW5kLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgQmluZGVyID0gYm91bmRbaV1bMF07XG4gICAgICB2YXIgYXR0ciA9IGJvdW5kW2ldWzFdO1xuICAgICAgdmFyIG5hbWUgPSBhdHRyLm5hbWU7XG4gICAgICB2YXIgdmFsdWUgPSBhdHRyLnZhbHVlO1xuICAgICAgaWYgKEJpbmRlci5leHByKSB7XG4gICAgICAgIG1hdGNoID0gbmFtZS5tYXRjaChCaW5kZXIuZXhwcik7XG4gICAgICAgIGlmIChtYXRjaCkgbWF0Y2ggPSBtYXRjaFsxXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1hdGNoID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgdHJ5IHtcbiAgICAgICAgbm9kZS5yZW1vdmVBdHRyaWJ1dGVOb2RlKGF0dHIpO1xuICAgICAgfSBjYXRjaChlKSB7fVxuXG4gICAgICBiaW5kaW5nID0gbmV3IEJpbmRlcih7XG4gICAgICAgIG5vZGU6IG5vZGUsXG4gICAgICAgIHZpZXc6IHZpZXcsXG4gICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgIG1hdGNoOiBtYXRjaCxcbiAgICAgICAgZXhwcmVzc2lvbjogdmFsdWUgPyBmcmFnbWVudHMuY29kaWZ5RXhwcmVzc2lvbignYXR0cmlidXRlJywgdmFsdWUpIDogbnVsbCxcbiAgICAgICAgZnJhZ21lbnRzOiBmcmFnbWVudHNcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoYmluZGluZy5jb21waWxlZCgpICE9PSBmYWxzZSkge1xuICAgICAgICBiaW5kaW5ncy5wdXNoKGJpbmRpbmcpO1xuICAgICAgfSBlbHNlIGlmIChCaW5kZXIgIT09IERlZmF1bHRCaW5kZXIgJiYgZnJhZ21lbnRzLmlzQm91bmQoJ2F0dHJpYnV0ZScsIHZhbHVlKSkge1xuICAgICAgICAvLyBSZXZlcnQgdG8gZGVmYXVsdCBpZiB0aGlzIGJpbmRpbmcgZG9lc24ndCB0YWtlXG4gICAgICAgIGJvdW5kLnB1c2goWyBEZWZhdWx0QmluZGVyLCBhdHRyIF0pO1xuICAgICAgfVxuXG4gICAgICBpZiAobm9kZS5wYXJlbnROb2RlICE9PSBwYXJlbnQpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJpbmRpbmdzO1xufVxuXG5cbi8vIFNwbGl0cyB0ZXh0IG5vZGVzIHdpdGggZXhwcmVzc2lvbnMgaW4gdGhlbSBzbyB0aGV5IGNhbiBiZSBib3VuZCBpbmRpdmlkdWFsbHksIGhhcyBwYXJlbnROb2RlIHBhc3NlZCBpbiBzaW5jZSBpdCBtYXlcbi8vIGJlIGEgZG9jdW1lbnQgZnJhZ21lbnQgd2hpY2ggYXBwZWFycyBhcyBudWxsIG9uIG5vZGUucGFyZW50Tm9kZS5cbmZ1bmN0aW9uIHNwbGl0VGV4dE5vZGUoZnJhZ21lbnRzLCBub2RlKSB7XG4gIGlmICghbm9kZS5wcm9jZXNzZWQpIHtcbiAgICBub2RlLnByb2Nlc3NlZCA9IHRydWU7XG4gICAgdmFyIHJlZ2V4ID0gZnJhZ21lbnRzLmJpbmRlcnMudGV4dC5fZXhwcjtcbiAgICB2YXIgY29udGVudCA9IG5vZGUubm9kZVZhbHVlO1xuICAgIGlmIChjb250ZW50Lm1hdGNoKHJlZ2V4KSkge1xuICAgICAgdmFyIG1hdGNoLCBsYXN0SW5kZXggPSAwLCBwYXJ0cyA9IFtdLCBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICAgIHdoaWxlIChtYXRjaCA9IHJlZ2V4LmV4ZWMoY29udGVudCkpIHtcbiAgICAgICAgcGFydHMucHVzaChjb250ZW50LnNsaWNlKGxhc3RJbmRleCwgcmVnZXgubGFzdEluZGV4IC0gbWF0Y2hbMF0ubGVuZ3RoKSk7XG4gICAgICAgIHBhcnRzLnB1c2gobWF0Y2hbMF0pO1xuICAgICAgICBsYXN0SW5kZXggPSByZWdleC5sYXN0SW5kZXg7XG4gICAgICB9XG4gICAgICBwYXJ0cy5wdXNoKGNvbnRlbnQuc2xpY2UobGFzdEluZGV4KSk7XG4gICAgICBwYXJ0cyA9IHBhcnRzLmZpbHRlcihub3RFbXB0eSk7XG5cbiAgICAgIG5vZGUubm9kZVZhbHVlID0gcGFydHNbMF07XG4gICAgICBmb3IgKHZhciBpID0gMTsgaSA8IHBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBuZXdUZXh0Tm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHBhcnRzW2ldKTtcbiAgICAgICAgbmV3VGV4dE5vZGUucHJvY2Vzc2VkID0gdHJ1ZTtcbiAgICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQobmV3VGV4dE5vZGUpO1xuICAgICAgfVxuICAgICAgbm9kZS5wYXJlbnROb2RlLmluc2VydEJlZm9yZShmcmFnbWVudCwgbm9kZS5uZXh0U2libGluZyk7XG4gICAgfVxuICB9XG59XG5cblxuZnVuY3Rpb24gc29ydEF0dHJpYnV0ZXMoYSwgYikge1xuICByZXR1cm4gYlswXS5wcm90b3R5cGUucHJpb3JpdHkgLSBhWzBdLnByb3RvdHlwZS5wcmlvcml0eTtcbn1cblxuZnVuY3Rpb24gbm90RW1wdHkodmFsdWUpIHtcbiAgcmV0dXJuIEJvb2xlYW4odmFsdWUpO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBGcmFnbWVudHM7XG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnLi91dGlsL2V4dGVuZCcpO1xudmFyIHRvRnJhZ21lbnQgPSByZXF1aXJlKCcuL3V0aWwvdG9GcmFnbWVudCcpO1xudmFyIGFuaW1hdGlvbiA9IHJlcXVpcmUoJy4vdXRpbC9hbmltYXRpb24nKTtcbnZhciBUZW1wbGF0ZSA9IHJlcXVpcmUoJy4vdGVtcGxhdGUnKTtcbnZhciBWaWV3ID0gcmVxdWlyZSgnLi92aWV3Jyk7XG52YXIgQmluZGluZyA9IHJlcXVpcmUoJy4vYmluZGluZycpO1xudmFyIEFuaW1hdGVkQmluZGluZyA9IHJlcXVpcmUoJy4vYW5pbWF0ZWRCaW5kaW5nJyk7XG52YXIgY29tcGlsZSA9IHJlcXVpcmUoJy4vY29tcGlsZScpO1xudmFyIHJlZ2lzdGVyRGVmYXVsdEJpbmRlcnMgPSByZXF1aXJlKCcuL3JlZ2lzdGVyZWQvYmluZGVycycpO1xudmFyIHJlZ2lzdGVyRGVmYXVsdEZvcm1hdHRlcnMgPSByZXF1aXJlKCcuL3JlZ2lzdGVyZWQvZm9ybWF0dGVycycpO1xudmFyIHJlZ2lzdGVyRGVmYXVsdEFuaW1hdGlvbnMgPSByZXF1aXJlKCcuL3JlZ2lzdGVyZWQvYW5pbWF0aW9ucycpO1xuXG4vKipcbiAqIEEgRnJhZ21lbnRzIG9iamVjdCBzZXJ2ZXMgYXMgYSByZWdpc3RyeSBmb3IgYmluZGVycyBhbmQgZm9ybWF0dGVyc1xuICogQHBhcmFtIHtbdHlwZV19IE9ic2VydmVyQ2xhc3MgW2Rlc2NyaXB0aW9uXVxuICovXG5mdW5jdGlvbiBGcmFnbWVudHMoT2JzZXJ2ZXJDbGFzcykge1xuICBpZiAoIU9ic2VydmVyQ2xhc3MpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdNdXN0IHByb3ZpZGUgYW4gT2JzZXJ2ZXIgY2xhc3MgdG8gRnJhZ21lbnRzLicpO1xuICB9XG5cbiAgdGhpcy5PYnNlcnZlciA9IE9ic2VydmVyQ2xhc3M7XG4gIHRoaXMuZm9ybWF0dGVycyA9IE9ic2VydmVyQ2xhc3MuZm9ybWF0dGVycyA9IHt9O1xuICB0aGlzLmFuaW1hdGlvbnMgPSB7fTtcbiAgdGhpcy5hbmltYXRlQXR0cmlidXRlID0gJ2FuaW1hdGUnO1xuXG4gIHRoaXMuYmluZGVycyA9IHtcbiAgICBlbGVtZW50OiB7IF93aWxkY2FyZHM6IFtdIH0sXG4gICAgYXR0cmlidXRlOiB7IF93aWxkY2FyZHM6IFtdLCBfZXhwcjogL3t7XFxzKiguKj8pXFxzKn19L2cgfSxcbiAgICB0ZXh0OiB7IF93aWxkY2FyZHM6IFtdLCBfZXhwcjogL3t7XFxzKiguKj8pXFxzKn19L2cgfVxuICB9O1xuXG4gIC8vIFRleHQgYmluZGVyIGZvciB0ZXh0IG5vZGVzIHdpdGggZXhwcmVzc2lvbnMgaW4gdGhlbVxuICB0aGlzLnJlZ2lzdGVyVGV4dCgnX19kZWZhdWx0X18nLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHRoaXMuZWxlbWVudC50ZXh0Q29udGVudCA9ICh2YWx1ZSAhPSBudWxsKSA/IHZhbHVlIDogJyc7XG4gIH0pO1xuXG4gIC8vIENhdGNoYWxsIGF0dHJpYnV0ZSBiaW5kZXIgZm9yIHJlZ3VsYXIgYXR0cmlidXRlcyB3aXRoIGV4cHJlc3Npb25zIGluIHRoZW1cbiAgdGhpcy5yZWdpc3RlckF0dHJpYnV0ZSgnX19kZWZhdWx0X18nLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSAhPSBudWxsKSB7XG4gICAgICB0aGlzLmVsZW1lbnQuc2V0QXR0cmlidXRlKHRoaXMubmFtZSwgdmFsdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKHRoaXMubmFtZSk7XG4gICAgfVxuICB9KTtcblxuICByZWdpc3RlckRlZmF1bHRCaW5kZXJzKHRoaXMpO1xuICByZWdpc3RlckRlZmF1bHRGb3JtYXR0ZXJzKHRoaXMpO1xuICByZWdpc3RlckRlZmF1bHRBbmltYXRpb25zKHRoaXMpO1xufVxuXG5GcmFnbWVudHMucHJvdG90eXBlID0ge1xuXG4gIC8qKlxuICAgKiBUYWtlcyBhbiBIVE1MIHN0cmluZywgYW4gZWxlbWVudCwgYW4gYXJyYXkgb2YgZWxlbWVudHMsIG9yIGEgZG9jdW1lbnQgZnJhZ21lbnQsIGFuZCBjb21waWxlcyBpdCBpbnRvIGEgdGVtcGxhdGUuXG4gICAqIEluc3RhbmNlcyBtYXkgdGhlbiBiZSBjcmVhdGVkIGFuZCBib3VuZCB0byBhIGdpdmVuIGNvbnRleHQuXG4gICAqIEBwYXJhbSB7U3RyaW5nfE5vZGVMaXN0fEhUTUxDb2xsZWN0aW9ufEhUTUxUZW1wbGF0ZUVsZW1lbnR8SFRNTFNjcmlwdEVsZW1lbnR8Tm9kZX0gaHRtbCBBIFRlbXBsYXRlIGNhbiBiZSBjcmVhdGVkXG4gICAqIGZyb20gbWFueSBkaWZmZXJlbnQgdHlwZXMgb2Ygb2JqZWN0cy4gQW55IG9mIHRoZXNlIHdpbGwgYmUgY29udmVydGVkIGludG8gYSBkb2N1bWVudCBmcmFnbWVudCBmb3IgdGhlIHRlbXBsYXRlIHRvXG4gICAqIGNsb25lLiBOb2RlcyBhbmQgZWxlbWVudHMgcGFzc2VkIGluIHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoZSBET00uXG4gICAqL1xuICBjcmVhdGVUZW1wbGF0ZTogZnVuY3Rpb24oaHRtbCkge1xuICAgIHZhciBmcmFnbWVudCA9IHRvRnJhZ21lbnQoaHRtbCk7XG4gICAgaWYgKGZyYWdtZW50LmNoaWxkTm9kZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBjcmVhdGUgYSB0ZW1wbGF0ZSBmcm9tICcgKyBodG1sKTtcbiAgICB9XG4gICAgdmFyIHRlbXBsYXRlID0gZXh0ZW5kLm1ha2UoVGVtcGxhdGUsIGZyYWdtZW50KTtcbiAgICB0ZW1wbGF0ZS5iaW5kaW5ncyA9IGNvbXBpbGUodGhpcywgdGVtcGxhdGUpO1xuICAgIHJldHVybiB0ZW1wbGF0ZTtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBDb21waWxlcyBiaW5kaW5ncyBvbiBhbiBlbGVtZW50LlxuICAgKi9cbiAgY29tcGlsZUVsZW1lbnQ6IGZ1bmN0aW9uKGVsZW1lbnQpIHtcbiAgICBpZiAoIWVsZW1lbnQuYmluZGluZ3MpIHtcbiAgICAgIGVsZW1lbnQuYmluZGluZ3MgPSBjb21waWxlKHRoaXMsIGVsZW1lbnQpO1xuICAgICAgZXh0ZW5kLm1ha2UoVmlldywgZWxlbWVudCwgZWxlbWVudCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGVsZW1lbnQ7XG4gIH0sXG5cblxuICAvKipcbiAgICogQ29tcGlsZXMgYW5kIGJpbmRzIGFuIGVsZW1lbnQgd2hpY2ggd2FzIG5vdCBjcmVhdGVkIGZyb20gYSB0ZW1wbGF0ZS4gTW9zdGx5IG9ubHkgdXNlZCBmb3IgYmluZGluZyB0aGUgZG9jdW1lbnQnc1xuICAgKiBodG1sIGVsZW1lbnQuXG4gICAqL1xuICBiaW5kRWxlbWVudDogZnVuY3Rpb24oZWxlbWVudCwgY29udGV4dCkge1xuICAgIHRoaXMuY29tcGlsZUVsZW1lbnQoZWxlbWVudCk7XG5cbiAgICBpZiAoY29udGV4dCkge1xuICAgICAgZWxlbWVudC5iaW5kKGNvbnRleHQpO1xuICAgIH1cblxuICAgIHJldHVybiBlbGVtZW50O1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVycyBhIGJpbmRlciBmb3IgYSBnaXZlbiB0eXBlIGFuZCBuYW1lLiBBIGJpbmRlciBpcyBhIHN1YmNsYXNzIG9mIEJpbmRpbmcgYW5kIGlzIHVzZWQgdG8gY3JlYXRlIGJpbmRpbmdzIG9uXG4gICAqIGFuIGVsZW1lbnQgb3IgdGV4dCBub2RlIHdob3NlIHRhZyBuYW1lLCBhdHRyaWJ1dGUgbmFtZSwgb3IgZXhwcmVzc2lvbiBjb250ZW50cyBtYXRjaCB0aGlzIGJpbmRlcidzIG5hbWUvZXhwcmVzc2lvbi5cbiAgICpcbiAgICogIyMjIFBhcmFtZXRlcnNcbiAgICpcbiAgICogICogYHR5cGVgOiB0aGVyZSBhcmUgdGhyZWUgdHlwZXMgb2YgYmluZGVyczogZWxlbWVudCwgYXR0cmlidXRlLCBvciB0ZXh0LiBUaGVzZSBjb3JyZXNwb25kIHRvIG1hdGNoaW5nIGFnYWluc3QgYW5cbiAgICogICAgZWxlbWVudCdzIHRhZyBuYW1lLCBhbiBlbGVtZW50IHdpdGggdGhlIGdpdmVuIGF0dHJpYnV0ZSBuYW1lLCBvciBhIHRleHQgbm9kZSB0aGF0IG1hdGNoZXMgdGhlIHByb3ZpZGVkXG4gICAqICAgIGV4cHJlc3Npb24uXG4gICAqXG4gICAqICAqIGBuYW1lYDogdG8gbWF0Y2gsIGEgYmluZGVyIG5lZWRzIHRoZSBuYW1lIG9mIGFuIGVsZW1lbnQgb3IgYXR0cmlidXRlLCBvciBhIHJlZ3VsYXIgZXhwcmVzc2lvbiB0aGF0IG1hdGNoZXMgYVxuICAgKiAgICBnaXZlbiB0ZXh0IG5vZGUuIE5hbWVzIGZvciBlbGVtZW50cyBhbmQgYXR0cmlidXRlcyBjYW4gYmUgcmVndWxhciBleHByZXNzaW9ucyBhcyB3ZWxsLCBvciB0aGV5IG1heSBiZSB3aWxkY2FyZFxuICAgKiAgICBuYW1lcyBieSB1c2luZyBhbiBhc3Rlcmlzay5cbiAgICpcbiAgICogICogYGRlZmluaXRpb25gOiBhIGJpbmRlciBpcyBhIHN1YmNsYXNzIG9mIEJpbmRpbmcgd2hpY2ggb3ZlcnJpZGVzIGtleSBtZXRob2RzLCBgY29tcGlsZWRgLCBgY3JlYXRlZGAsIGB1cGRhdGVkYCxcbiAgICogICAgYGJvdW5kYCwgYW5kIGB1bmJvdW5kYC4gVGhlIGRlZmluaXRpb24gbWF5IGJlIGFuIGFjdHVhbCBzdWJjbGFzcyBvZiBCaW5kaW5nIG9yIGl0IG1heSBiZSBhbiBvYmplY3Qgd2hpY2ggd2lsbCBiZVxuICAgKiAgICB1c2VkIGZvciB0aGUgcHJvdG90eXBlIG9mIHRoZSBuZXdseSBjcmVhdGVkIHN1YmNsYXNzLiBGb3IgbWFueSBiaW5kaW5ncyBvbmx5IHRoZSBgdXBkYXRlZGAgbWV0aG9kIGlzIG92ZXJyaWRkZW4sXG4gICAqICAgIHNvIGJ5IGp1c3QgcGFzc2luZyBpbiBhIGZ1bmN0aW9uIGZvciBgZGVmaW5pdGlvbmAgdGhlIGJpbmRlciB3aWxsIGJlIGNyZWF0ZWQgd2l0aCB0aGF0IGFzIGl0cyBgdXBkYXRlZGAgbWV0aG9kLlxuICAgKlxuICAgKiAjIyMgRXhwbGFpbmF0aW9uIG9mIHByb3BlcnRpZXMgYW5kIG1ldGhvZHNcbiAgICpcbiAgICogICAqIGBwcmlvcml0eWAgbWF5IGJlIGRlZmluZWQgYXMgbnVtYmVyIHRvIGluc3RydWN0IHNvbWUgYmluZGVycyB0byBiZSBwcm9jZXNzZWQgYmVmb3JlIG90aGVycy4gQmluZGVycyB3aXRoXG4gICAqICAgaGlnaGVyIHByaW9yaXR5IGFyZSBwcm9jZXNzZWQgZmlyc3QuXG4gICAqXG4gICAqICAgKiBgYW5pbWF0ZWRgIGNhbiBiZSBzZXQgdG8gYHRydWVgIHRvIGV4dGVuZCB0aGUgQW5pbWF0ZWRCaW5kaW5nIGNsYXNzIHdoaWNoIHByb3ZpZGVzIHN1cHBvcnQgZm9yIGFuaW1hdGlvbiB3aGVuXG4gICAqICAgaW5zZXJ0aW5nYW5kIHJlbW92aW5nIG5vZGVzIGZyb20gdGhlIERPTS4gVGhlIGBhbmltYXRlZGAgcHJvcGVydHkgb25seSAqYWxsb3dzKiBhbmltYXRpb24gYnV0IHRoZSBlbGVtZW50IG11c3RcbiAgICogICBoYXZlIHRoZSBgYW5pbWF0ZWAgYXR0cmlidXRlIHRvIHVzZSBhbmltYXRpb24uIEEgYmluZGluZyB3aWxsIGhhdmUgdGhlIGBhbmltYXRlYCBwcm9wZXJ0eSBzZXQgdG8gdHJ1ZSB3aGVuIGl0IGlzXG4gICAqICAgdG8gYmUgYW5pbWF0ZWQuIEJpbmRlcnMgc2hvdWxkIGhhdmUgZmFzdCBwYXRocyBmb3Igd2hlbiBhbmltYXRpb24gaXMgbm90IHVzZWQgcmF0aGVyIHRoYW4gYXNzdW1pbmcgYW5pbWF0aW9uIHdpbGxcbiAgICogICBiZSB1c2VkLlxuICAgKlxuICAgKiBCaW5kZXJzXG4gICAqXG4gICAqIEEgYmluZGVyIGNhbiBoYXZlIDUgbWV0aG9kcyB3aGljaCB3aWxsIGJlIGNhbGxlZCBhdCB2YXJpb3VzIHBvaW50cyBpbiBhIGJpbmRpbmcncyBsaWZlY3ljbGUuIE1hbnkgYmluZGVycyB3aWxsXG4gICAqIG9ubHkgdXNlIHRoZSBgdXBkYXRlZCh2YWx1ZSlgIG1ldGhvZCwgc28gY2FsbGluZyByZWdpc3RlciB3aXRoIGEgZnVuY3Rpb24gaW5zdGVhZCBvZiBhbiBvYmplY3QgYXMgaXRzIHRoaXJkXG4gICAqIHBhcmFtZXRlciBpcyBhIHNob3J0Y3V0IHRvIGNyZWF0aW5nIGEgYmluZGVyIHdpdGgganVzdCBhbiBgdXBkYXRlYCBtZXRob2QuXG4gICAqXG4gICAqIExpc3RlZCBpbiBvcmRlciBvZiB3aGVuIHRoZXkgb2NjdXIgaW4gYSBiaW5kaW5nJ3MgbGlmZWN5Y2xlOlxuICAgKlxuICAgKiAgICogYGNvbXBpbGVkKG9wdGlvbnMpYCBpcyBjYWxsZWQgd2hlbiBmaXJzdCBjcmVhdGluZyBhIGJpbmRpbmcgZHVyaW5nIHRoZSB0ZW1wbGF0ZSBjb21waWxhdGlvbiBwcm9jZXNzIGFuZCByZWNlaXZlc1xuICAgKiB0aGUgYG9wdGlvbnNgIG9iamVjdCB0aGF0IHdpbGwgYmUgcGFzc2VkIGludG8gYG5ldyBCaW5kaW5nKG9wdGlvbnMpYC4gVGhpcyBjYW4gYmUgdXNlZCBmb3IgY3JlYXRpbmcgdGVtcGxhdGVzLFxuICAgKiBtb2RpZnlpbmcgdGhlIERPTSAob25seSBzdWJzZXF1ZW50IERPTSB0aGF0IGhhc24ndCBhbHJlYWR5IGJlZW4gcHJvY2Vzc2VkKSBhbmQgb3RoZXIgdGhpbmdzIHRoYXQgc2hvdWxkIGJlXG4gICAqIGFwcGxpZWQgYXQgY29tcGlsZSB0aW1lIGFuZCBub3QgZHVwbGljYXRlZCBmb3IgZWFjaCB2aWV3IGNyZWF0ZWQuXG4gICAqXG4gICAqICAgKiBgY3JlYXRlZCgpYCBpcyBjYWxsZWQgb24gdGhlIGJpbmRpbmcgd2hlbiBhIG5ldyB2aWV3IGlzIGNyZWF0ZWQuIFRoaXMgY2FuIGJlIHVzZWQgdG8gYWRkIGV2ZW50IGxpc3RlbmVycyBvbiB0aGVcbiAgICogZWxlbWVudCBvciBkbyBvdGhlciB0aGluZ3MgdGhhdCB3aWxsIHBlcnNpc3RlIHdpdGggdGhlIHZpZXcgdGhyb3VnaCBpdHMgbWFueSB1c2VzLiBWaWV3cyBtYXkgZ2V0IHJldXNlZCBzbyBkb24ndFxuICAgKiBkbyBhbnl0aGluZyBoZXJlIHRvIHRpZSBpdCB0byBhIGdpdmVuIGNvbnRleHQuXG4gICAqXG4gICAqICAgKiBgYXR0YWNoZWQoKWAgaXMgY2FsbGVkIG9uIHRoZSBiaW5kaW5nIHdoZW4gdGhlIHZpZXcgaXMgYm91bmQgdG8gYSBnaXZlbiBjb250ZXh0IGFuZCBpbnNlcnRlZCBpbnRvIHRoZSBET00uIFRoaXNcbiAgICogY2FuIGJlIHVzZWQgdG8gaGFuZGxlIGNvbnRleHQtc3BlY2lmaWMgYWN0aW9ucywgYWRkIGxpc3RlbmVycyB0byB0aGUgd2luZG93IG9yIGRvY3VtZW50ICh0byBiZSByZW1vdmVkIGluXG4gICAqIGBkZXRhY2hlZGAhKSwgZXRjLlxuICAgKlxuICAgKiAgICogYHVwZGF0ZWQodmFsdWUsIG9sZFZhbHVlLCBjaGFuZ2VSZWNvcmRzKWAgaXMgY2FsbGVkIG9uIHRoZSBiaW5kaW5nIHdoZW5ldmVyIHRoZSB2YWx1ZSBvZiB0aGUgZXhwcmVzc2lvbiB3aXRoaW5cbiAgICogdGhlIGF0dHJpYnV0ZSBjaGFuZ2VzLiBGb3IgZXhhbXBsZSwgYGJpbmQtdGV4dD1cInt7dXNlcm5hbWV9fVwiYCB3aWxsIHRyaWdnZXIgYHVwZGF0ZWRgIHdpdGggdGhlIHZhbHVlIG9mIHVzZXJuYW1lXG4gICAqIHdoZW5ldmVyIGl0IGNoYW5nZXMgb24gdGhlIGdpdmVuIGNvbnRleHQuIFdoZW4gdGhlIHZpZXcgaXMgcmVtb3ZlZCBgdXBkYXRlZGAgd2lsbCBiZSB0cmlnZ2VyZWQgd2l0aCBhIHZhbHVlIG9mXG4gICAqIGB1bmRlZmluZWRgIGlmIHRoZSB2YWx1ZSB3YXMgbm90IGFscmVhZHkgYHVuZGVmaW5lZGAsIGdpdmluZyBhIGNoYW5jZSB0byBcInJlc2V0XCIgdG8gYW4gZW1wdHkgc3RhdGUuXG4gICAqXG4gICAqICAgKiBgZGV0YWNoZWQoKWAgaXMgY2FsbGVkIG9uIHRoZSBiaW5kaW5nIHdoZW4gdGhlIHZpZXcgaXMgdW5ib3VuZCB0byBhIGdpdmVuIGNvbnRleHQgYW5kIHJlbW92ZWQgZnJvbSB0aGUgRE9NLiBUaGlzXG4gICAqIGNhbiBiZSB1c2VkIHRvIGNsZWFuIHVwIGFueXRoaW5nIGRvbmUgaW4gYGF0dGFjaGVkKClgIG9yIGluIGB1cGRhdGVkKClgIGJlZm9yZSBiZWluZyByZW1vdmVkLlxuICAgKlxuICAgKiBFbGVtZW50IGFuZCBhdHRyaWJ1dGUgYmluZGVycyB3aWxsIGFwcGx5IHdoZW5ldmVyIHRoZSB0YWcgbmFtZSBvciBhdHRyaWJ1dGUgbmFtZSBpcyBtYXRjaGVkLiBJbiB0aGUgY2FzZSBvZlxuICAgKiBhdHRyaWJ1dGUgYmluZGVycyBpZiB5b3Ugb25seSB3YW50IGl0IHRvIG1hdGNoIHdoZW4gZXhwcmVzc2lvbnMgYXJlIHVzZWQgd2l0aGluIHRoZSBhdHRyaWJ1dGUsIGFkZCBgb25seVdoZW5Cb3VuZGBcbiAgICogdG8gdGhlIGRlZmluaXRpb24uIE90aGVyd2lzZSB0aGUgYmluZGVyIHdpbGwgbWF0Y2ggYW5kIHRoZSB2YWx1ZSBvZiB0aGUgZXhwcmVzc2lvbiB3aWxsIHNpbXBseSBiZSBhIHN0cmluZyB0aGF0XG4gICAqIG9ubHkgY2FsbHMgdXBkYXRlZCBvbmNlIHNpbmNlIGl0IHdpbGwgbm90IGNoYW5nZS5cbiAgICpcbiAgICogTm90ZSwgYXR0cmlidXRlcyB3aGljaCBtYXRjaCBhIGJpbmRlciBhcmUgcmVtb3ZlZCBkdXJpbmcgY29tcGlsZS4gVGhleSBhcmUgY29uc2lkZXJlZCB0byBiZSBiaW5kaW5nIGRlZmluaXRpb25zIGFuZFxuICAgKiBub3QgcGFydCBvZiB0aGUgZWxlbWVudC4gQmluZGluZ3MgbWF5IHNldCB0aGUgYXR0cmlidXRlIHdoaWNoIHNlcnZlZCBhcyB0aGVpciBkZWZpbml0aW9uIGlmIGRlc2lyZWQuXG4gICAqXG4gICAqICMjIyBEZWZhdWx0c1xuICAgKlxuICAgKiBUaGVyZSBhcmUgZGVmYXVsdCBiaW5kZXJzIGZvciBhdHRyaWJ1dGUgYW5kIHRleHQgbm9kZXMgd2hpY2ggYXBwbHkgd2hlbiBubyBvdGhlciBiaW5kZXJzIG1hdGNoLiBUaGV5IG9ubHkgYXBwbHkgdG9cbiAgICogYXR0cmlidXRlcyBhbmQgdGV4dCBub2RlcyB3aXRoIGV4cHJlc3Npb25zIGluIHRoZW0gKGUuZy4gYHt7Zm9vfX1gKS4gVGhlIGRlZmF1bHQgaXMgdG8gc2V0IHRoZSBhdHRyaWJ1dGUgb3IgdGV4dFxuICAgKiBub2RlJ3MgdmFsdWUgdG8gdGhlIHJlc3VsdCBvZiB0aGUgZXhwcmVzc2lvbi4gSWYgeW91IHdhbnRlZCB0byBvdmVycmlkZSB0aGlzIGRlZmF1bHQgeW91IG1heSByZWdpc3RlciBhIGJpbmRlciB3aXRoXG4gICAqIHRoZSBuYW1lIGBcIl9fZGVmYXVsdF9fXCJgLlxuICAgKlxuICAgKiAqKkV4YW1wbGU6KiogVGhpcyBiaW5kaW5nIGhhbmRsZXIgYWRkcyBwaXJhdGVpemVkIHRleHQgdG8gYW4gZWxlbWVudC5cbiAgICogYGBgamF2YXNjcmlwdFxuICAgKiByZWdpc3RyeS5yZWdpc3RlckF0dHJpYnV0ZSgnbXktcGlyYXRlJywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICogICBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgKiAgICAgdmFsdWUgPSAnJztcbiAgICogICB9IGVsc2Uge1xuICAgKiAgICAgdmFsdWUgPSB2YWx1ZVxuICAgKiAgICAgICAucmVwbGFjZSgvXFxCaW5nXFxiL2csIFwiaW4nXCIpXG4gICAqICAgICAgIC5yZXBsYWNlKC9cXGJ0b1xcYi9nLCBcInQnXCIpXG4gICAqICAgICAgIC5yZXBsYWNlKC9cXGJ5b3VcXGIvLCAneWUnKVxuICAgKiAgICAgICArICcgQXJycnIhJztcbiAgICogICB9XG4gICAqICAgdGhpcy5lbGVtZW50LnRleHRDb250ZW50ID0gdmFsdWU7XG4gICAqIH0pO1xuICAgKiBgYGBcbiAgICpcbiAgICogYGBgaHRtbFxuICAgKiA8cCBteS1waXJhdGU9XCJ7e3Bvc3QuYm9keX19XCI+VGhpcyB0ZXh0IHdpbGwgYmUgcmVwbGFjZWQuPC9wPlxuICAgKiBgYGBcbiAgICovXG4gIHJlZ2lzdGVyRWxlbWVudDogZnVuY3Rpb24obmFtZSwgZGVmaW5pdGlvbikge1xuICAgIHJldHVybiB0aGlzLnJlZ2lzdGVyQmluZGVyKCdlbGVtZW50JywgbmFtZSwgZGVmaW5pdGlvbik7XG4gIH0sXG4gIHJlZ2lzdGVyQXR0cmlidXRlOiBmdW5jdGlvbihuYW1lLCBkZWZpbml0aW9uKSB7XG4gICAgcmV0dXJuIHRoaXMucmVnaXN0ZXJCaW5kZXIoJ2F0dHJpYnV0ZScsIG5hbWUsIGRlZmluaXRpb24pO1xuICB9LFxuICByZWdpc3RlclRleHQ6IGZ1bmN0aW9uKG5hbWUsIGRlZmluaXRpb24pIHtcbiAgICByZXR1cm4gdGhpcy5yZWdpc3RlckJpbmRlcigndGV4dCcsIG5hbWUsIGRlZmluaXRpb24pO1xuICB9LFxuICByZWdpc3RlckJpbmRlcjogZnVuY3Rpb24odHlwZSwgbmFtZSwgZGVmaW5pdGlvbikge1xuICAgIHZhciBiaW5kZXIsIGJpbmRlcnMgPSB0aGlzLmJpbmRlcnNbdHlwZV1cbiAgICB2YXIgc3VwZXJDbGFzcyA9IGRlZmluaXRpb24uYW5pbWF0ZWQgPyBBbmltYXRlZEJpbmRpbmcgOiBCaW5kaW5nO1xuXG4gICAgaWYgKCFiaW5kZXJzKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdgdHlwZWAgbXVzdCBiZSBvbmUgb2YgJyArIE9iamVjdC5rZXlzKHRoaXMuYmluZGVycykuam9pbignLCAnKSk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBkZWZpbml0aW9uID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBpZiAoZGVmaW5pdGlvbi5wcm90b3R5cGUgaW5zdGFuY2VvZiBCaW5kaW5nKSB7XG4gICAgICAgIHN1cGVyQ2xhc3MgPSBkZWZpbml0aW9uO1xuICAgICAgICBkZWZpbml0aW9uID0ge307XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZWZpbml0aW9uID0geyB1cGRhdGVkOiBkZWZpbml0aW9uIH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIGEgc3ViY2xhc3Mgb2YgQmluZGluZyAob3IgYW5vdGhlciBiaW5kZXIpIHdpdGggdGhlIGRlZmluaXRpb25cbiAgICBmdW5jdGlvbiBCaW5kZXIoKSB7XG4gICAgICBzdXBlckNsYXNzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIGRlZmluaXRpb24uT2JzZXJ2ZXIgPSB0aGlzLk9ic2VydmVyO1xuICAgIHN1cGVyQ2xhc3MuZXh0ZW5kKEJpbmRlciwgZGVmaW5pdGlvbik7XG5cbiAgICB2YXIgZXhwcjtcbiAgICBpZiAobmFtZSBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgZXhwciA9IG5hbWU7XG4gICAgfSBlbHNlIGlmIChuYW1lLmluZGV4T2YoJyonKSA+PSAwKSB7XG4gICAgICBleHByID0gbmV3IFJlZ0V4cCgnXicgKyBlc2NhcGVSZWdFeHAobmFtZSkucmVwbGFjZSgnXFxcXConLCAnKC4qKScpICsgJyQnKTtcbiAgICB9XG5cbiAgICBpZiAoZXhwcikge1xuICAgICAgQmluZGVyLmV4cHIgPSBleHByO1xuICAgICAgYmluZGVycy5fd2lsZGNhcmRzLnB1c2goQmluZGVyKTtcbiAgICAgIGJpbmRlcnMuX3dpbGRjYXJkcy5zb3J0KHRoaXMuYmluZGluZ1NvcnQpO1xuICAgIH1cblxuICAgIEJpbmRlci5uYW1lID0gJycgKyBuYW1lO1xuICAgIGJpbmRlcnNbbmFtZV0gPSBCaW5kZXI7XG4gICAgcmV0dXJuIEJpbmRlcjtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGEgYmluZGVyIHRoYXQgd2FzIGFkZGVkIHdpdGggYHJlZ2lzdGVyKClgLiBJZiBhbiBSZWdFeHAgd2FzIHVzZWQgaW4gcmVnaXN0ZXIgZm9yIHRoZSBuYW1lIGl0IG11c3QgYmUgdXNlZFxuICAgKiB0byB1bnJlZ2lzdGVyLCBidXQgaXQgZG9lcyBub3QgbmVlZCB0byBiZSB0aGUgc2FtZSBpbnN0YW5jZS5cbiAgICovXG4gIHVucmVnaXN0ZXJFbGVtZW50OiBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMudW5yZWdpc3RlckJpbmRlcignZWxlbWVudCcsIG5hbWUpO1xuICB9LFxuICB1bnJlZ2lzdGVyQXR0cmlidXRlOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMudW5yZWdpc3RlckJpbmRlcignYXR0cmlidXRlJywgbmFtZSk7XG4gIH0sXG4gIHVucmVnaXN0ZXJUZXh0OiBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMudW5yZWdpc3RlckJpbmRlcigndGV4dCcsIG5hbWUpO1xuICB9LFxuICB1bnJlZ2lzdGVyQmluZGVyOiBmdW5jdGlvbih0eXBlLCBuYW1lKSB7XG4gICAgdmFyIGJpbmRlciA9IHRoaXMuZ2V0QmluZGVyKHR5cGUsIG5hbWUpLCBiaW5kZXJzID0gdGhpcy5iaW5kZXJzW3R5cGVdO1xuICAgIGlmICghYmluZGVyKSByZXR1cm47XG4gICAgaWYgKGJpbmRlci5leHByKSB7XG4gICAgICB2YXIgaW5kZXggPSBiaW5kZXJzLl93aWxkY2FyZHMuaW5kZXhPZihiaW5kZXIpO1xuICAgICAgaWYgKGluZGV4ID49IDApIGJpbmRlcnMuX3dpbGRjYXJkcy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH1cbiAgICBkZWxldGUgYmluZGVyc1tuYW1lXTtcbiAgICByZXR1cm4gYmluZGVyO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBiaW5kZXIgdGhhdCB3YXMgYWRkZWQgd2l0aCBgcmVnaXN0ZXIoKWAgYnkgdHlwZSBhbmQgbmFtZS5cbiAgICovXG4gIGdldEVsZW1lbnRCaW5kZXI6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRCaW5kZXIoJ2VsZW1lbnQnLCBuYW1lKTtcbiAgfSxcbiAgZ2V0QXR0cmlidXRlQmluZGVyOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QmluZGVyKCdhdHRyaWJ1dGUnLCBuYW1lKTtcbiAgfSxcbiAgZ2V0VGV4dEJpbmRlcjogZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLmdldEJpbmRlcigndGV4dCcsIG5hbWUpO1xuICB9LFxuICBnZXRCaW5kZXI6IGZ1bmN0aW9uKHR5cGUsIG5hbWUpIHtcbiAgICB2YXIgYmluZGVycyA9IHRoaXMuYmluZGVyc1t0eXBlXTtcblxuICAgIGlmICghYmluZGVycykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYHR5cGVgIG11c3QgYmUgb25lIG9mICcgKyBPYmplY3Qua2V5cyh0aGlzLmJpbmRlcnMpLmpvaW4oJywgJykpO1xuICAgIH1cblxuICAgIGlmIChuYW1lICYmIGJpbmRlcnMuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgIHJldHVybiBiaW5kZXJzW25hbWVdO1xuICAgIH1cbiAgfSxcblxuXG4gIC8qKlxuICAgKiBGaW5kIGEgbWF0Y2hpbmcgYmluZGVyIGZvciB0aGUgZ2l2ZW4gdHlwZS4gRWxlbWVudHMgc2hvdWxkIG9ubHkgcHJvdmlkZSBuYW1lLiBBdHRyaWJ1dGVzIHNob3VsZCBwcm92aWRlIHRoZSBuYW1lXG4gICAqIGFuZCB2YWx1ZSAodmFsdWUgc28gdGhlIGRlZmF1bHQgY2FuIGJlIHJldHVybmVkIGlmIGFuIGV4cHJlc3Npb24gZXhpc3RzIGluIHRoZSB2YWx1ZSkuIFRleHQgbm9kZXMgc2hvdWxkIG9ubHlcbiAgICogcHJvdmlkZSB0aGUgdmFsdWUgKGluIHBsYWNlIG9mIHRoZSBuYW1lKSBhbmQgd2lsbCByZXR1cm4gdGhlIGRlZmF1bHQgaWYgbm8gYmluZGVycyBtYXRjaC5cbiAgICovXG4gIGZpbmRCaW5kZXI6IGZ1bmN0aW9uKHR5cGUsIG5hbWUsIHZhbHVlKSB7XG4gICAgaWYgKHR5cGUgPT09ICd0ZXh0JyAmJiB2YWx1ZSA9PSBudWxsKSB7XG4gICAgICB2YWx1ZSA9IG5hbWU7XG4gICAgICBuYW1lID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgYmluZGVyID0gdGhpcy5nZXRCaW5kZXIodHlwZSwgbmFtZSksIGJpbmRlcnMgPSB0aGlzLmJpbmRlcnNbdHlwZV07XG5cbiAgICBpZiAoIWJpbmRlcikge1xuICAgICAgdmFyIHRvTWF0Y2ggPSAodHlwZSA9PT0gJ3RleHQnKSA/IHZhbHVlIDogbmFtZTtcbiAgICAgIGJpbmRlcnMuX3dpbGRjYXJkcy5zb21lKGZ1bmN0aW9uKHdpbGRjYXJkQmluZGVyKSB7XG4gICAgICAgIGlmICh0b01hdGNoLm1hdGNoKHdpbGRjYXJkQmluZGVyLmV4cHIpKSB7XG4gICAgICAgICAgYmluZGVyID0gd2lsZGNhcmRCaW5kZXI7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChiaW5kZXIgJiYgdHlwZSA9PT0gJ2F0dHJpYnV0ZScgJiYgYmluZGVyLm9ubHlXaGVuQm91bmQgJiYgIXRoaXMuaXNCb3VuZCh0eXBlLCB2YWx1ZSkpIHtcbiAgICAgIC8vIGRvbid0IHVzZSB0aGUgYHZhbHVlYCBiaW5kZXIgaWYgdGhlcmUgaXMgbm8gZXhwcmVzc2lvbiBpbiB0aGUgYXR0cmlidXRlIHZhbHVlIChlLmcuIGB2YWx1ZT1cInNvbWUgdGV4dFwiYClcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAobmFtZSA9PT0gdGhpcy5hbmltYXRlQXR0cmlidXRlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCFiaW5kZXIgJiYgdmFsdWUgJiYgKHR5cGUgPT09ICd0ZXh0JyB8fCB0aGlzLmlzQm91bmQodHlwZSwgdmFsdWUpKSkge1xuICAgICAgLy8gVGVzdCBpZiB0aGUgYXR0cmlidXRlIHZhbHVlIGlzIGJvdW5kIChlLmcuIGBocmVmPVwiL3Bvc3RzL3t7IHBvc3QuaWQgfX1cImApXG4gICAgICBiaW5kZXIgPSB0aGlzLmdldEJpbmRlcih0eXBlLCAnX19kZWZhdWx0X18nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYmluZGVyO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIEEgRm9ybWF0dGVyIGlzIHN0b3JlZCB0byBwcm9jZXNzIHRoZSB2YWx1ZSBvZiBhbiBleHByZXNzaW9uLiBUaGlzIGFsdGVycyB0aGUgdmFsdWUgb2Ygd2hhdCBjb21lcyBpbiB3aXRoIGEgZnVuY3Rpb25cbiAgICogdGhhdCByZXR1cm5zIGEgbmV3IHZhbHVlLiBGb3JtYXR0ZXJzIGFyZSBhZGRlZCBieSB1c2luZyBhIHNpbmdsZSBwaXBlIGNoYXJhY3RlciAoYHxgKSBmb2xsb3dlZCBieSB0aGUgbmFtZSBvZiB0aGVcbiAgICogZm9ybWF0dGVyLiBNdWx0aXBsZSBmb3JtYXR0ZXJzIGNhbiBiZSB1c2VkIGJ5IGNoYWluaW5nIHBpcGVzIHdpdGggZm9ybWF0dGVyIG5hbWVzLiBGb3JtYXR0ZXJzIG1heSBhbHNvIGhhdmVcbiAgICogYXJndW1lbnRzIHBhc3NlZCB0byB0aGVtIGJ5IHVzaW5nIHRoZSBjb2xvbiB0byBzZXBhcmF0ZSBhcmd1bWVudHMgZnJvbSB0aGUgZm9ybWF0dGVyIG5hbWUuIFRoZSBzaWduYXR1cmUgb2YgYVxuICAgKiBmb3JtYXR0ZXIgc2hvdWxkIGJlIGBmdW5jdGlvbih2YWx1ZSwgYXJncy4uLilgIHdoZXJlIGFyZ3MgYXJlIGV4dHJhIHBhcmFtZXRlcnMgcGFzc2VkIGludG8gdGhlIGZvcm1hdHRlciBhZnRlclxuICAgKiBjb2xvbnMuXG4gICAqXG4gICAqICpFeGFtcGxlOipcbiAgICogYGBganNcbiAgICogcmVnaXN0cnkucmVnaXN0ZXJGb3JtYXR0ZXIoJ3VwcGVyY2FzZScsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAqICAgaWYgKHR5cGVvZiB2YWx1ZSAhPSAnc3RyaW5nJykgcmV0dXJuICcnXG4gICAqICAgcmV0dXJuIHZhbHVlLnRvVXBwZXJjYXNlKClcbiAgICogfSlcbiAgICpcbiAgICogcmVnaXN0cnkucmVnaXN0ZXJGb3JtYXR0ZXIoJ3JlcGxhY2UnLCBmdW5jdGlvbih2YWx1ZSwgcmVwbGFjZSwgd2l0aCkge1xuICAgKiAgIGlmICh0eXBlb2YgdmFsdWUgIT0gJ3N0cmluZycpIHJldHVybiAnJ1xuICAgKiAgIHJldHVybiB2YWx1ZS5yZXBsYWNlKHJlcGxhY2UsIHdpdGgpXG4gICAqIH0pXG4gICAqIGBgYGh0bWxcbiAgICogPGgxIGJpbmQtdGV4dD1cInRpdGxlIHwgdXBwZXJjYXNlIHwgcmVwbGFjZTonTEVUVEVSJzonTlVNQkVSJ1wiPjwvaDE+XG4gICAqIGBgYFxuICAgKiAqUmVzdWx0OipcbiAgICogYGBgaHRtbFxuICAgKiA8aDE+R0VUVElORyBUTyBLTk9XIEFMTCBBQk9VVCBUSEUgTlVNQkVSIEE8L2gxPlxuICAgKiBgYGBcbiAgICogVE9ETzogb2xkIGRvY3MsIHJld3JpdGUsIHRoZXJlIGlzIGFuIGV4dHJhIGFyZ3VtZW50IG5hbWVkIGBzZXR0ZXJgIHdoaWNoIHdpbGwgYmUgdHJ1ZSB3aGVuIHRoZSBleHByZXNzaW9uIGlzIGJlaW5nIFwic2V0XCIgaW5zdGVhZCBvZiBcImdldFwiXG4gICAqIEEgYHZhbHVlRm9ybWF0dGVyYCBpcyBsaWtlIGEgZm9ybWF0dGVyIGJ1dCB1c2VkIHNwZWNpZmljYWxseSB3aXRoIHRoZSBgdmFsdWVgIGJpbmRpbmcgc2luY2UgaXQgaXMgYSB0d28td2F5IGJpbmRpbmcuIFdoZW5cbiAgICogdGhlIHZhbHVlIG9mIHRoZSBlbGVtZW50IGlzIGNoYW5nZWQgYSBgdmFsdWVGb3JtYXR0ZXJgIGNhbiBhZGp1c3QgdGhlIHZhbHVlIGZyb20gYSBzdHJpbmcgdG8gdGhlIGNvcnJlY3QgdmFsdWUgdHlwZSBmb3JcbiAgICogdGhlIGNvbnRyb2xsZXIgZXhwcmVzc2lvbi4gVGhlIHNpZ25hdHVyZSBmb3IgYSBgdmFsdWVGb3JtYXR0ZXJgIGluY2x1ZGVzIHRoZSBjdXJyZW50IHZhbHVlIG9mIHRoZSBleHByZXNzaW9uXG4gICAqIGJlZm9yZSB0aGUgb3B0aW9uYWwgYXJndW1lbnRzIChpZiBhbnkpLiBUaGlzIGFsbG93cyBkYXRlcyB0byBiZSBhZGp1c3RlZCBhbmQgcG9zc2libGV5IG90aGVyIHVzZXMuXG4gICAqXG4gICAqICpFeGFtcGxlOipcbiAgICogYGBganNcbiAgICogcmVnaXN0cnkucmVnaXN0ZXJGb3JtYXR0ZXIoJ251bWVyaWMnLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgKiAgIC8vIHZhbHVlIGNvbWluZyBmcm9tIHRoZSBjb250cm9sbGVyIGV4cHJlc3Npb24sIHRvIGJlIHNldCBvbiB0aGUgZWxlbWVudFxuICAgKiAgIGlmICh2YWx1ZSA9PSBudWxsIHx8IGlzTmFOKHZhbHVlKSkgcmV0dXJuICcnXG4gICAqICAgcmV0dXJuIHZhbHVlXG4gICAqIH0pXG4gICAqXG4gICAqIHJlZ2lzdHJ5LnJlZ2lzdGVyRm9ybWF0dGVyKCdkYXRlLWhvdXInLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgKiAgIC8vIHZhbHVlIGNvbWluZyBmcm9tIHRoZSBjb250cm9sbGVyIGV4cHJlc3Npb24sIHRvIGJlIHNldCBvbiB0aGUgZWxlbWVudFxuICAgKiAgIGlmICggIShjdXJyZW50VmFsdWUgaW5zdGFuY2VvZiBEYXRlKSApIHJldHVybiAnJ1xuICAgKiAgIHZhciBob3VycyA9IHZhbHVlLmdldEhvdXJzKClcbiAgICogICBpZiAoaG91cnMgPj0gMTIpIGhvdXJzIC09IDEyXG4gICAqICAgaWYgKGhvdXJzID09IDApIGhvdXJzID0gMTJcbiAgICogICByZXR1cm4gaG91cnNcbiAgICogfSlcbiAgICogYGBgaHRtbFxuICAgKiA8bGFiZWw+TnVtYmVyIEF0dGVuZGluZzo8L2xhYmVsPlxuICAgKiA8aW5wdXQgc2l6ZT1cIjRcIiBiaW5kLXZhbHVlPVwiZXZlbnQuYXR0ZW5kZWVDb3VudCB8IG51bWVyaWNcIj5cbiAgICogPGxhYmVsPlRpbWU6PC9sYWJlbD5cbiAgICogPGlucHV0IHNpemU9XCIyXCIgYmluZC12YWx1ZT1cImV2ZW50LmRhdGUgfCBkYXRlLWhvdXJcIj4gOlxuICAgKiA8aW5wdXQgc2l6ZT1cIjJcIiBiaW5kLXZhbHVlPVwiZXZlbnQuZGF0ZSB8IGRhdGUtbWludXRlXCI+XG4gICAqIDxzZWxlY3QgYmluZC12YWx1ZT1cImV2ZW50LmRhdGUgfCBkYXRlLWFtcG1cIj5cbiAgICogICA8b3B0aW9uPkFNPC9vcHRpb24+XG4gICAqICAgPG9wdGlvbj5QTTwvb3B0aW9uPlxuICAgKiA8L3NlbGVjdD5cbiAgICogYGBgXG4gICAqL1xuICByZWdpc3RlckZvcm1hdHRlcjogZnVuY3Rpb24gKG5hbWUsIGZvcm1hdHRlcikge1xuICAgIHRoaXMuZm9ybWF0dGVyc1tuYW1lXSA9IGZvcm1hdHRlcjtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBVbnJlZ2lzdGVycyBhIGZvcm1hdHRlci5cbiAgICovXG4gIHVucmVnaXN0ZXJGb3JtYXR0ZXI6IGZ1bmN0aW9uIChuYW1lLCBmb3JtYXR0ZXIpIHtcbiAgICBkZWxldGUgdGhpcy5mb3JtYXR0ZXJzW25hbWVdO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIEdldHMgYSByZWdpc3RlcmVkIGZvcm1hdHRlci5cbiAgICovXG4gIGdldEZvcm1hdHRlcjogZnVuY3Rpb24gKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5mb3JtYXR0ZXJzW25hbWVdO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIEFuIEFuaW1hdGlvbiBpcyBzdG9yZWQgdG8gaGFuZGxlIGFuaW1hdGlvbnMuIEEgcmVnaXN0ZXJlZCBhbmltYXRpb24gaXMgYW4gb2JqZWN0IChvciBjbGFzcyB3aGljaCBpbnN0YW50aWF0ZXMgaW50b1xuICAgKiBhbiBvYmplY3QpIHdpdGggdGhlIG1ldGhvZHM6XG4gICAqICAgKiBgd2lsbEFuaW1hdGVJbihlbGVtZW50KWBcbiAgICogICAqIGBhbmltYXRlSW4oZWxlbWVudCwgY2FsbGJhY2spYFxuICAgKiAgICogYGRpZEFuaW1hdGVJbihlbGVtZW50KWBcbiAgICogICAqIGB3aWxsQW5pbWF0ZU91dChlbGVtZW50KWBcbiAgICogICAqIGBhbmltYXRlT3V0KGVsZW1lbnQsIGNhbGxiYWNrKWBcbiAgICogICAqIGBkaWRBbmltYXRlT3V0KGVsZW1lbnQpYFxuICAgKlxuICAgKiBBbmltYXRpb24gaXMgaW5jbHVkZWQgd2l0aCBiaW5kZXJzIHdoaWNoIGFyZSByZWdpc3RlcmVkIHdpdGggdGhlIGBhbmltYXRlZGAgcHJvcGVydHkgc2V0IHRvIGB0cnVlYCAoc3VjaCBhcyBgaWZgXG4gICAqIGFuZCBgcmVwZWF0YCkuIEFuaW1hdGlvbnMgYWxsb3cgZWxlbWVudHMgdG8gZmFkZSBpbiwgZmFkZSBvdXQsIHNsaWRlIGRvd24sIGNvbGxhcHNlLCBtb3ZlIGZyb20gb25lIGxvY2F0aW9uIGluIGFcbiAgICogbGlzdCB0byBhbm90aGVyLCBhbmQgbW9yZS5cbiAgICpcbiAgICogVG8gdXNlIGFuaW1hdGlvbiBhZGQgYW4gYXR0cmlidXRlIG5hbWVkIGBhbmltYXRlYCBvbnRvIGFuIGVsZW1lbnQgd2l0aCBhIHN1cHBvcnRlZCBiaW5kZXIuXG4gICAqXG4gICAqICMjIyBDU1MgQW5pbWF0aW9uc1xuICAgKlxuICAgKiBJZiB0aGUgYGFuaW1hdGVgIGF0dHJpYnV0ZSBkb2VzIG5vdCBoYXZlIGEgdmFsdWUgb3IgdGhlIHZhbHVlIGlzIGEgY2xhc3MgbmFtZSAoZS5nLiBgYW5pbWF0ZT1cIi5teS1mYWRlXCJgKSB0aGVuXG4gICAqIGZyYWdtZW50cyB3aWxsIHVzZSBhIENTUyB0cmFuc2l0aW9uL2FuaW1hdGlvbi4gQ2xhc3NlcyB3aWxsIGJlIGFkZGVkIGFuZCByZW1vdmVkIHRvIHRyaWdnZXIgdGhlIGFuaW1hdGlvbi5cbiAgICpcbiAgICogICAqIGAud2lsbC1hbmltYXRlLWluYCBpcyBhZGRlZCByaWdodCBhZnRlciBhbiBlbGVtZW50IGlzIGluc2VydGVkIGludG8gdGhlIERPTS4gVGhpcyBjYW4gYmUgdXNlZCB0byBzZXQgdGhlXG4gICAqICAgICBvcGFjaXR5IHRvIGAwLjBgIGZvciBleGFtcGxlLiBJdCBpcyB0aGVuIHJlbW92ZWQgb24gdGhlIG5leHQgYW5pbWF0aW9uIGZyYW1lLlxuICAgKiAgICogYC5hbmltYXRlLWluYCBpcyB3aGVuIGAud2lsbC1hbmltYXRlLWluYCBpcyByZW1vdmVkLiBJdCBjYW4gYmUgdXNlZCB0byBzZXQgb3BhY2l0eSB0byBgMS4wYCBmb3IgZXhhbXBsZS4gVGhlXG4gICAqICAgICBgYW5pbWF0aW9uYCBzdHlsZSBjYW4gYmUgc2V0IG9uIHRoaXMgY2xhc3MgaWYgdXNpbmcgaXQuIFRoZSBgdHJhbnNpdGlvbmAgc3R5bGUgY2FuIGJlIHNldCBoZXJlLiBOb3RlIHRoYXRcbiAgICogICAgIGFsdGhvdWdoIHRoZSBgYW5pbWF0ZWAgYXR0cmlidXRlIGlzIHBsYWNlZCBvbiBhbiBlbGVtZW50IHdpdGggdGhlIGByZXBlYXRgIGJpbmRlciwgdGhlc2UgY2xhc3NlcyBhcmUgYWRkZWQgdG9cbiAgICogICAgIGl0cyBjaGlsZHJlbiBhcyB0aGV5IGdldCBhZGRlZCBhbmQgcmVtb3ZlZC5cbiAgICogICAqIGAud2lsbC1hbmltYXRlLW91dGAgaXMgYWRkZWQgYmVmb3JlIGFuIGVsZW1lbnQgaXMgcmVtb3ZlZCBmcm9tIHRoZSBET00uIFRoaXMgY2FuIGJlIHVzZWQgdG8gc2V0IHRoZSBvcGFjaXR5IHRvXG4gICAqICAgICBgMWAgZm9yIGV4YW1wbGUuIEl0IGlzIHRoZW4gcmVtb3ZlZCBvbiB0aGUgbmV4dCBhbmltYXRpb24gZnJhbWUuXG4gICAqICAgKiBgLmFuaW1hdGUtb3V0YCBpcyBhZGRlZCB3aGVuIGAud2lsbC1hbmltYXRlLW91dGAgaXMgcmVtb3ZlZC4gSXQgY2FuIGJlIHVzZWQgdG8gc2V0IG9wYWNpdHkgdG8gYDAuMGAgZm9yXG4gICAqICAgICBleGFtcGxlLiBUaGUgYGFuaW1hdGlvbmAgc3R5bGUgY2FuIGJlIHNldCBvbiB0aGlzIGNsYXNzIGlmIHVzaW5nIGl0LiBUaGUgYHRyYW5zaXRpb25gIHN0eWxlIGNhbiBiZSBzZXQgaGVyZSBvclxuICAgKiAgICAgb24gYW5vdGhlciBzZWxlY3RvciB0aGF0IG1hdGNoZXMgdGhlIGVsZW1lbnQuIE5vdGUgdGhhdCBhbHRob3VnaCB0aGUgYGFuaW1hdGVgIGF0dHJpYnV0ZSBpcyBwbGFjZWQgb24gYW5cbiAgICogICAgIGVsZW1lbnQgd2l0aCB0aGUgYHJlcGVhdGAgYmluZGVyLCB0aGVzZSBjbGFzc2VzIGFyZSBhZGRlZCB0byBpdHMgY2hpbGRyZW4gYXMgdGhleSBnZXQgYWRkZWQgYW5kIHJlbW92ZWQuXG4gICAqXG4gICAqIElmIHRoZSBgYW5pbWF0ZWAgYXR0cmlidXRlIGlzIHNldCB0byBhIGNsYXNzIG5hbWUgKGUuZy4gYGFuaW1hdGU9XCIubXktZmFkZVwiYCkgdGhlbiB0aGF0IGNsYXNzIG5hbWUgd2lsbCBiZSBhZGRlZCBhc1xuICAgKiBhIGNsYXNzIHRvIHRoZSBlbGVtZW50IGR1cmluZyBhbmltYXRpb24uIFRoaXMgYWxsb3dzIHlvdSB0byB1c2UgYC5teS1mYWRlLndpbGwtYW5pbWF0ZS1pbmAsIGAubXktZmFkZS5hbmltYXRlLWluYCxcbiAgICogZXRjLiBpbiB5b3VyIHN0eWxlc2hlZXRzIHRvIHVzZSB0aGUgc2FtZSBhbmltYXRpb24gdGhyb3VnaG91dCB5b3VyIGFwcGxpY2F0aW9uLlxuICAgKlxuICAgKiAjIyMgSmF2YVNjcmlwdCBBbmltYXRpb25zXG4gICAqXG4gICAqIElmIHlvdSBuZWVkIGdyZWF0ZXIgY29udHJvbCBvdmVyIHlvdXIgYW5pbWF0aW9ucyBKYXZhU2NyaXB0IG1heSBiZSB1c2VkLiBJdCBpcyByZWNvbW1lbmRlZCB0aGF0IENTUyBzdHlsZXMgc3RpbGwgYmVcbiAgICogdXNlZCBieSBoYXZpbmcgeW91ciBjb2RlIHNldCB0aGVtIG1hbnVhbGx5LiBUaGlzIGFsbG93cyB0aGUgYW5pbWF0aW9uIHRvIHRha2UgYWR2YW50YWdlIG9mIHRoZSBicm93c2VyXG4gICAqIG9wdGltaXphdGlvbnMgc3VjaCBhcyBoYXJkd2FyZSBhY2NlbGVyYXRpb24uIFRoaXMgaXMgbm90IGEgcmVxdWlyZW1lbnQuXG4gICAqXG4gICAqIEluIG9yZGVyIHRvIHVzZSBKYXZhU2NyaXB0IGFuIG9iamVjdCBzaG91bGQgYmUgcGFzc2VkIGludG8gdGhlIGBhbmltYXRpb25gIGF0dHJpYnV0ZSB1c2luZyBhbiBleHByZXNzaW9uLiBUaGlzXG4gICAqIG9iamVjdCBzaG91bGQgaGF2ZSBtZXRob2RzIHRoYXQgYWxsb3cgSmF2YVNjcmlwdCBhbmltYXRpb24gaGFuZGxpbmcuIEZvciBleGFtcGxlLCBpZiB5b3UgYXJlIGJvdW5kIHRvIGEgY29udGV4dFxuICAgKiB3aXRoIGFuIG9iamVjdCBuYW1lZCBgY3VzdG9tRmFkZWAgd2l0aCBhbmltYXRpb24gbWV0aG9kcywgeW91ciBlbGVtZW50IHNob3VsZCBoYXZlIGBhdHRyaWJ1dGU9XCJ7e2N1c3RvbUZhZGV9fVwiYC5cbiAgICogVGhlIGZvbGxvd2luZyBpcyBhIGxpc3Qgb2YgdGhlIG1ldGhvZHMgeW91IG1heSBpbXBsZW1lbnQuXG4gICAqXG4gICAqICAgKiBgd2lsbEFuaW1hdGVJbihlbGVtZW50KWAgd2lsbCBiZSBjYWxsZWQgYWZ0ZXIgYW4gZWxlbWVudCBoYXMgYmVlbiBpbnNlcnRlZCBpbnRvIHRoZSBET00uIFVzZSBpdCB0byBzZXQgaW5pdGlhbFxuICAgKiAgICAgQ1NTIHByb3BlcnRpZXMgYmVmb3JlIGBhbmltYXRlSW5gIGlzIGNhbGxlZCB0byBzZXQgdGhlIGZpbmFsIHByb3BlcnRpZXMuIFRoaXMgbWV0aG9kIGlzIG9wdGlvbmFsLlxuICAgKiAgICogYGFuaW1hdGVJbihlbGVtZW50LCBjYWxsYmFjaylgIHdpbGwgYmUgY2FsbGVkIHNob3J0bHkgYWZ0ZXIgYHdpbGxBbmltYXRlSW5gIGlmIGl0IHdhcyBkZWZpbmVkLiBVc2UgaXQgdG8gc2V0XG4gICAqICAgICBmaW5hbCBDU1MgcHJvcGVydGllcy5cbiAgICogICAqIGBhbmltYXRlT3V0KGVsZW1lbnQsIGRvbmUpYCB3aWxsIGJlIGNhbGxlZCBiZWZvcmUgYW4gZWxlbWVudCBpcyB0byBiZSByZW1vdmVkIGZyb20gdGhlIERPTS4gYGRvbmVgIG11c3QgYmVcbiAgICogICAgIGNhbGxlZCB3aGVuIHRoZSBhbmltYXRpb24gaXMgY29tcGxldGUgaW4gb3JkZXIgZm9yIHRoZSBiaW5kZXIgdG8gZmluaXNoIHJlbW92aW5nIHRoZSBlbGVtZW50LiAqKlJlbWVtYmVyKiogdG9cbiAgICogICAgIGNsZWFuIHVwIGJ5IHJlbW92aW5nIGFueSBzdHlsZXMgdGhhdCB3ZXJlIGFkZGVkIGJlZm9yZSBjYWxsaW5nIGBkb25lKClgIHNvIHRoZSBlbGVtZW50IGNhbiBiZSByZXVzZWQgd2l0aG91dFxuICAgKiAgICAgc2lkZS1lZmZlY3RzLlxuICAgKlxuICAgKiBUaGUgYGVsZW1lbnRgIHBhc3NlZCBpbiB3aWxsIGJlIHBvbHlmaWxsZWQgZm9yIHdpdGggdGhlIGBhbmltYXRlYCBtZXRob2QgdXNpbmdcbiAgICogaHR0cHM6Ly9naXRodWIuY29tL3dlYi1hbmltYXRpb25zL3dlYi1hbmltYXRpb25zLWpzLlxuICAgKlxuICAgKiAjIyMgUmVnaXN0ZXJlZCBBbmltYXRpb25zXG4gICAqXG4gICAqIEFuaW1hdGlvbnMgbWF5IGJlIHJlZ2lzdGVyZWQgYW5kIHVzZWQgdGhyb3VnaG91dCB5b3VyIGFwcGxpY2F0aW9uLiBUbyB1c2UgYSByZWdpc3RlcmVkIGFuaW1hdGlvbiB1c2UgaXRzIG5hbWUgaW5cbiAgICogdGhlIGBhbmltYXRlYCBhdHRyaWJ1dGUgKGUuZy4gYGFuaW1hdGU9XCJmYWRlXCJgKS4gTm90ZSB0aGUgb25seSBkaWZmZXJlbmNlIGJldHdlZW4gYSByZWdpc3RlcmVkIGFuaW1hdGlvbiBhbmQgYVxuICAgKiBjbGFzcyByZWdpc3RyYXRpb24gaXMgY2xhc3MgcmVnaXN0cmF0aW9ucyBhcmUgcHJlZml4ZWQgd2l0aCBhIGRvdCAoYC5gKS4gUmVnaXN0ZXJlZCBhbmltYXRpb25zIGFyZSBhbHdheXNcbiAgICogSmF2YVNjcmlwdCBhbmltYXRpb25zLiBUbyByZWdpc3RlciBhbiBhbmltYXRpb24gdXNlIGBmcmFnbWVudHMucmVnaXN0ZXJBbmltYXRpb24obmFtZSwgYW5pbWF0aW9uT2JqZWN0KWAuXG4gICAqXG4gICAqIFRoZSBBbmltYXRpb24gbW9kdWxlIGNvbWVzIHdpdGggc2V2ZXJhbCBjb21tb24gYW5pbWF0aW9ucyByZWdpc3RlcmVkIGJ5IGRlZmF1bHQuIFRoZSBkZWZhdWx0cyB1c2UgQ1NTIHN0eWxlcyB0b1xuICAgKiB3b3JrIGNvcnJlY3RseSwgdXNpbmcgYGVsZW1lbnQuYW5pbWF0ZWAuXG4gICAqXG4gICAqICAgKiBgZmFkZWAgd2lsbCBmYWRlIGFuIGVsZW1lbnQgaW4gYW5kIG91dCBvdmVyIDMwMCBtaWxsaXNlY29uZHMuXG4gICAqICAgKiBgc2xpZGVgIHdpbGwgc2xpZGUgYW4gZWxlbWVudCBkb3duIHdoZW4gaXQgaXMgYWRkZWQgYW5kIHNsaWRlIGl0IHVwIHdoZW4gaXQgaXMgcmVtb3ZlZC5cbiAgICogICAqIGBzbGlkZS1tb3ZlYCB3aWxsIG1vdmUgYW4gZWxlbWVudCBmcm9tIGl0cyBvbGQgbG9jYXRpb24gdG8gaXRzIG5ldyBsb2NhdGlvbiBpbiBhIHJlcGVhdGVkIGxpc3QuXG4gICAqXG4gICAqIERvIHlvdSBoYXZlIGFub3RoZXIgY29tbW9uIGFuaW1hdGlvbiB5b3UgdGhpbmsgc2hvdWxkIGJlIGluY2x1ZGVkIGJ5IGRlZmF1bHQ/IFN1Ym1pdCBhIHB1bGwgcmVxdWVzdCFcbiAgICovXG4gIHJlZ2lzdGVyQW5pbWF0aW9uOiBmdW5jdGlvbihuYW1lLCBhbmltYXRpb25PYmplY3QpIHtcbiAgICB0aGlzLmFuaW1hdGlvbnNbbmFtZV0gPSBhbmltYXRpb25PYmplY3Q7XG4gIH0sXG5cblxuICAvKipcbiAgICogVW5yZWdpc3RlcnMgYW4gYW5pbWF0aW9uLlxuICAgKi9cbiAgdW5yZWdpc3RlckFuaW1hdGlvbjogZnVuY3Rpb24obmFtZSkge1xuICAgIGRlbGV0ZSB0aGlzLmFuaW1hdGlvbnNbbmFtZV07XG4gIH0sXG5cblxuICAvKipcbiAgICogR2V0cyBhIHJlZ2lzdGVyZWQgYW5pbWF0aW9uLlxuICAgKi9cbiAgZ2V0QW5pbWF0aW9uOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuYW5pbWF0aW9uc1tuYW1lXTtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBQcmVwYXJlIGFuIGVsZW1lbnQgdG8gYmUgZWFzaWVyIGFuaW1hdGFibGUgKGFkZGluZyBhIHNpbXBsZSBgYW5pbWF0ZWAgcG9seWZpbGwgaWYgbmVlZGVkKVxuICAgKi9cbiAgbWFrZUVsZW1lbnRBbmltYXRhYmxlOiBhbmltYXRpb24ubWFrZUVsZW1lbnRBbmltYXRhYmxlLFxuXG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIGRlbGltaXRlcnMgdGhhdCBkZWZpbmUgYW4gZXhwcmVzc2lvbi4gRGVmYXVsdCBpcyBge3tgIGFuZCBgfX1gIGJ1dCB0aGlzIG1heSBiZSBvdmVycmlkZGVuLiBJZiBlbXB0eVxuICAgKiBzdHJpbmdzIGFyZSBwYXNzZWQgaW4gKGZvciB0eXBlIFwiYXR0cmlidXRlXCIgb25seSkgdGhlbiBubyBkZWxpbWl0ZXJzIGFyZSByZXF1aXJlZCBmb3IgbWF0Y2hpbmcgYXR0cmlidXRlcywgYnV0IHRoZVxuICAgKiBkZWZhdWx0IGF0dHJpYnV0ZSBtYXRjaGVyIHdpbGwgbm90IGFwcGx5IHRvIHRoZSByZXN0IG9mIHRoZSBhdHRyaWJ1dGVzLlxuICAgKi9cbiAgc2V0RXhwcmVzc2lvbkRlbGltaXRlcnM6IGZ1bmN0aW9uKHR5cGUsIHByZSwgcG9zdCkge1xuICAgIGlmICh0eXBlICE9PSAnYXR0cmlidXRlJyAmJiB0eXBlICE9PSAndGV4dCcpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0V4cHJlc3Npb24gZGVsaW1pdGVycyBtdXN0IGJlIG9mIHR5cGUgXCJhdHRyaWJ1dGVcIiBvciBcInRleHRcIicpO1xuICAgIH1cblxuICAgIHRoaXMuYmluZGVyc1t0eXBlXS5fZXhwciA9IG5ldyBSZWdFeHAoZXNjYXBlUmVnRXhwKHByZSkgKyAnKC4qPyknICsgZXNjYXBlUmVnRXhwKHBvc3QpLCAnZycpO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIFRlc3RzIHdoZXRoZXIgYSB2YWx1ZSBoYXMgYW4gZXhwcmVzc2lvbiBpbiBpdC4gU29tZXRoaW5nIGxpa2UgYC91c2VyL3t7dXNlci5pZH19YC5cbiAgICovXG4gIGlzQm91bmQ6IGZ1bmN0aW9uKHR5cGUsIHZhbHVlKSB7XG4gICAgaWYgKHR5cGUgIT09ICdhdHRyaWJ1dGUnICYmIHR5cGUgIT09ICd0ZXh0Jykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignaXNCb3VuZCBtdXN0IHByb3ZpZGUgdHlwZSBcImF0dHJpYnV0ZVwiIG9yIFwidGV4dFwiJyk7XG4gICAgfVxuICAgIHZhciBleHByID0gdGhpcy5iaW5kZXJzW3R5cGVdLl9leHByO1xuICAgIHJldHVybiBCb29sZWFuKGV4cHIgJiYgdmFsdWUgJiYgdmFsdWUubWF0Y2goZXhwcikpO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIFRoZSBzb3J0IGZ1bmN0aW9uIHRvIHNvcnQgYmluZGVycyBjb3JyZWN0bHlcbiAgICovXG4gIGJpbmRpbmdTb3J0OiBmdW5jdGlvbihhLCBiKSB7XG4gICAgcmV0dXJuIGIucHJvdG90eXBlLnByaW9yaXR5IC0gYS5wcm90b3R5cGUucHJpb3JpdHk7XG4gIH0sXG5cblxuICAvKipcbiAgICogQ29udmVydHMgYW4gaW52ZXJ0ZWQgZXhwcmVzc2lvbiBmcm9tIGAvdXNlci97e3VzZXIuaWR9fWAgdG8gYFwiL3VzZXIvXCIgKyB1c2VyLmlkYFxuICAgKi9cbiAgY29kaWZ5RXhwcmVzc2lvbjogZnVuY3Rpb24odHlwZSwgdGV4dCkge1xuICAgIGlmICh0eXBlICE9PSAnYXR0cmlidXRlJyAmJiB0eXBlICE9PSAndGV4dCcpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2NvZGlmeUV4cHJlc3Npb24gbXVzdCB1c2UgdHlwZSBcImF0dHJpYnV0ZVwiIG9yIFwidGV4dFwiJyk7XG4gICAgfVxuXG4gICAgdmFyIGV4cHIgPSB0aGlzLmJpbmRlcnNbdHlwZV0uX2V4cHI7XG4gICAgdmFyIG1hdGNoID0gdGV4dC5tYXRjaChleHByKTtcblxuICAgIGlmICghbWF0Y2gpIHtcbiAgICAgIHJldHVybiAnXCInICsgdGV4dC5yZXBsYWNlKC9cIi9nLCAnXFxcXFwiJykgKyAnXCInO1xuICAgIH0gZWxzZSBpZiAobWF0Y2gubGVuZ3RoID09PSAxICYmIG1hdGNoWzBdID09PSB0ZXh0KSB7XG4gICAgICByZXR1cm4gdGV4dC5yZXBsYWNlKGV4cHIsICckMScpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgbmV3VGV4dCA9ICdcIicsIGxhc3RJbmRleCA9IDA7XG4gICAgICB3aGlsZSAobWF0Y2ggPSBleHByLmV4ZWModGV4dCkpIHtcbiAgICAgICAgdmFyIHN0ciA9IHRleHQuc2xpY2UobGFzdEluZGV4LCBleHByLmxhc3RJbmRleCAtIG1hdGNoWzBdLmxlbmd0aCk7XG4gICAgICAgIG5ld1RleHQgKz0gc3RyLnJlcGxhY2UoL1wiL2csICdcXFxcXCInKTtcbiAgICAgICAgbmV3VGV4dCArPSAnXCIgKyAoJyArIG1hdGNoWzFdICsgJyB8fCBcIlwiKSArIFwiJztcbiAgICAgICAgbGFzdEluZGV4ID0gZXhwci5sYXN0SW5kZXg7XG4gICAgICB9XG4gICAgICBuZXdUZXh0ICs9IHRleHQuc2xpY2UobGFzdEluZGV4KS5yZXBsYWNlKC9cIi9nLCAnXFxcXFwiJykgKyAnXCInO1xuICAgICAgcmV0dXJuIG5ld1RleHQucmVwbGFjZSgvXlwiXCIgXFwrIHwgXCJcIiBcXCsgfCBcXCsgXCJcIiQvZywgJycpO1xuICAgIH1cbiAgfVxuXG59O1xuXG4vLyBUYWtlcyBhIHN0cmluZyBsaWtlIFwiKFxcKilcIiBvciBcIm9uLVxcKlwiIGFuZCBjb252ZXJ0cyBpdCBpbnRvIGEgcmVndWxhciBleHByZXNzaW9uLlxuZnVuY3Rpb24gZXNjYXBlUmVnRXhwKHRleHQpIHtcbiAgcmV0dXJuIHRleHQucmVwbGFjZSgvWy1bXFxde30oKSorPy4sXFxcXF4kfCNcXHNdL2csIFwiXFxcXCQmXCIpO1xufVxuIiwiLypcbkNvcHlyaWdodCAoYykgMjAxNSBKYWNvYiBXcmlnaHQgPGphY3dyaWdodEBnbWFpbC5jb20+XG5cblBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbm9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbmluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbnRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbmNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcblxuVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbmFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuXG5USEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG5JTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbkZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbk9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cblRIRSBTT0ZUV0FSRS5cbiovXG4vLyAjIERpZmZcbi8vID4gQmFzZWQgb24gd29yayBmcm9tIEdvb2dsZSdzIG9ic2VydmUtanMgcG9seWZpbGw6IGh0dHBzOi8vZ2l0aHViLmNvbS9Qb2x5bWVyL29ic2VydmUtanNcblxuLy8gQSBuYW1lc3BhY2UgdG8gc3RvcmUgdGhlIGZ1bmN0aW9ucyBvblxudmFyIGRpZmYgPSBleHBvcnRzO1xuXG4oZnVuY3Rpb24oKSB7XG5cbiAgZGlmZi5jbG9uZSA9IGNsb25lO1xuICBkaWZmLnZhbHVlcyA9IGRpZmZWYWx1ZXM7XG4gIGRpZmYuYmFzaWMgPSBkaWZmQmFzaWM7XG4gIGRpZmYub2JqZWN0cyA9IGRpZmZPYmplY3RzO1xuICBkaWZmLmFycmF5cyA9IGRpZmZBcnJheXM7XG5cblxuICAvLyBBIGNoYW5nZSByZWNvcmQgZm9yIHRoZSBvYmplY3QgY2hhbmdlc1xuICBmdW5jdGlvbiBDaGFuZ2VSZWNvcmQob2JqZWN0LCB0eXBlLCBuYW1lLCBvbGRWYWx1ZSkge1xuICAgIHRoaXMub2JqZWN0ID0gb2JqZWN0O1xuICAgIHRoaXMudHlwZSA9IHR5cGU7XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICB0aGlzLm9sZFZhbHVlID0gb2xkVmFsdWU7XG4gIH1cblxuICAvLyBBIHNwbGljZSByZWNvcmQgZm9yIHRoZSBhcnJheSBjaGFuZ2VzXG4gIGZ1bmN0aW9uIFNwbGljZShpbmRleCwgcmVtb3ZlZCwgYWRkZWRDb3VudCkge1xuICAgIHRoaXMuaW5kZXggPSBpbmRleDtcbiAgICB0aGlzLnJlbW92ZWQgPSByZW1vdmVkO1xuICAgIHRoaXMuYWRkZWRDb3VudCA9IGFkZGVkQ291bnQ7XG4gIH1cblxuXG4gIC8vIENyZWF0ZXMgYSBjbG9uZSBvciBjb3B5IG9mIGFuIGFycmF5IG9yIG9iamVjdCAob3Igc2ltcGx5IHJldHVybnMgYSBzdHJpbmcvbnVtYmVyL2Jvb2xlYW4gd2hpY2ggYXJlIGltbXV0YWJsZSlcbiAgLy8gRG9lcyBub3QgcHJvdmlkZSBkZWVwIGNvcGllcy5cbiAgZnVuY3Rpb24gY2xvbmUodmFsdWUsIGRlZXApIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgIGlmIChkZWVwKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5tYXAoZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gY2xvbmUodmFsdWUsIGRlZXApO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5zbGljZSgpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgaWYgKHZhbHVlLnZhbHVlT2YoKSAhPT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIG5ldyB2YWx1ZS5jb25zdHJ1Y3Rvcih2YWx1ZS52YWx1ZU9mKCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGNvcHkgPSB7fTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHZhbHVlKSB7XG4gICAgICAgICAgdmFyIG9ialZhbHVlID0gdmFsdWVba2V5XTtcbiAgICAgICAgICBpZiAoZGVlcCkge1xuICAgICAgICAgICAgb2JqVmFsdWUgPSBjbG9uZShvYmpWYWx1ZSwgZGVlcCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvcHlba2V5XSA9IG9ialZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjb3B5O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICB9XG5cblxuICAvLyBEaWZmcyB0d28gdmFsdWVzLCByZXR1cm5pbmcgYSB0cnV0aHkgdmFsdWUgaWYgdGhlcmUgYXJlIGNoYW5nZXMgb3IgYGZhbHNlYCBpZiB0aGVyZSBhcmUgbm8gY2hhbmdlcy4gSWYgdGhlIHR3b1xuICAvLyB2YWx1ZXMgYXJlIGJvdGggYXJyYXlzIG9yIGJvdGggb2JqZWN0cywgYW4gYXJyYXkgb2YgY2hhbmdlcyAoc3BsaWNlcyBvciBjaGFuZ2UgcmVjb3JkcykgYmV0d2VlbiB0aGUgdHdvIHdpbGwgYmVcbiAgLy8gcmV0dXJuZWQuIE90aGVyd2lzZSAgYHRydWVgIHdpbGwgYmUgcmV0dXJuZWQuXG4gIGZ1bmN0aW9uIGRpZmZWYWx1ZXModmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpICYmIEFycmF5LmlzQXJyYXkob2xkVmFsdWUpKSB7XG4gICAgICAvLyBJZiBhbiBhcnJheSBoYXMgY2hhbmdlZCBjYWxjdWxhdGUgdGhlIHNwbGljZXNcbiAgICAgIHZhciBzcGxpY2VzID0gZGlmZkFycmF5cyh2YWx1ZSwgb2xkVmFsdWUpO1xuICAgICAgcmV0dXJuIHNwbGljZXMubGVuZ3RoID8gc3BsaWNlcyA6IGZhbHNlO1xuICAgIH0gZWxzZSBpZiAodmFsdWUgJiYgb2xkVmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB0eXBlb2Ygb2xkVmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAvLyBJZiBhbiBvYmplY3QgaGFzIGNoYW5nZWQgY2FsY3VsYXRlIHRoZSBjaG5hZ2VzIGFuZCBjYWxsIHRoZSBjYWxsYmFja1xuICAgICAgLy8gQWxsb3cgZGF0ZXMgYW5kIE51bWJlci9TdHJpbmcgb2JqZWN0cyB0byBiZSBjb21wYXJlZFxuICAgICAgdmFyIHZhbHVlVmFsdWUgPSB2YWx1ZS52YWx1ZU9mKCk7XG4gICAgICB2YXIgb2xkVmFsdWVWYWx1ZSA9IG9sZFZhbHVlLnZhbHVlT2YoKTtcblxuICAgICAgLy8gQWxsb3cgZGF0ZXMgYW5kIE51bWJlci9TdHJpbmcgb2JqZWN0cyB0byBiZSBjb21wYXJlZFxuICAgICAgaWYgKHR5cGVvZiB2YWx1ZVZhbHVlICE9PSAnb2JqZWN0JyAmJiB0eXBlb2Ygb2xkVmFsdWVWYWx1ZSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlVmFsdWUgIT09IG9sZFZhbHVlVmFsdWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgY2hhbmdlUmVjb3JkcyA9IGRpZmZPYmplY3RzKHZhbHVlLCBvbGRWYWx1ZSk7XG4gICAgICAgIHJldHVybiBjaGFuZ2VSZWNvcmRzLmxlbmd0aCA/IGNoYW5nZVJlY29yZHMgOiBmYWxzZTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWYgYSB2YWx1ZSBoYXMgY2hhbmdlZCBjYWxsIHRoZSBjYWxsYmFja1xuICAgICAgcmV0dXJuIGRpZmZCYXNpYyh2YWx1ZSwgb2xkVmFsdWUpO1xuICAgIH1cbiAgfVxuXG5cbiAgLy8gRGlmZnMgdHdvIGJhc2ljIHR5cGVzLCByZXR1cm5pbmcgdHJ1ZSBpZiBjaGFuZ2VkIG9yIGZhbHNlIGlmIG5vdFxuICBmdW5jdGlvbiBkaWZmQmFzaWModmFsdWUsIG9sZFZhbHVlKSB7XG4gICBpZiAodmFsdWUgJiYgb2xkVmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB0eXBlb2Ygb2xkVmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAvLyBBbGxvdyBkYXRlcyBhbmQgTnVtYmVyL1N0cmluZyBvYmplY3RzIHRvIGJlIGNvbXBhcmVkXG4gICAgICB2YXIgdmFsdWVWYWx1ZSA9IHZhbHVlLnZhbHVlT2YoKTtcbiAgICAgIHZhciBvbGRWYWx1ZVZhbHVlID0gb2xkVmFsdWUudmFsdWVPZigpO1xuXG4gICAgICAvLyBBbGxvdyBkYXRlcyBhbmQgTnVtYmVyL1N0cmluZyBvYmplY3RzIHRvIGJlIGNvbXBhcmVkXG4gICAgICBpZiAodHlwZW9mIHZhbHVlVmFsdWUgIT09ICdvYmplY3QnICYmIHR5cGVvZiBvbGRWYWx1ZVZhbHVlICE9PSAnb2JqZWN0Jykge1xuICAgICAgICByZXR1cm4gZGlmZkJhc2ljKHZhbHVlVmFsdWUsIG9sZFZhbHVlVmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIElmIGEgdmFsdWUgaGFzIGNoYW5nZWQgY2FsbCB0aGUgY2FsbGJhY2tcbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyAmJiB0eXBlb2Ygb2xkVmFsdWUgPT09ICdudW1iZXInICYmIGlzTmFOKHZhbHVlKSAmJiBpc05hTihvbGRWYWx1ZSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHZhbHVlICE9PSBvbGRWYWx1ZTtcbiAgICB9XG4gIH1cblxuXG4gIC8vIERpZmZzIHR3byBvYmplY3RzIHJldHVybmluZyBhbiBhcnJheSBvZiBjaGFuZ2UgcmVjb3Jkcy4gVGhlIGNoYW5nZSByZWNvcmQgbG9va3MgbGlrZTpcbiAgLy8gYGBgamF2YXNjcmlwdFxuICAvLyB7XG4gIC8vICAgb2JqZWN0OiBvYmplY3QsXG4gIC8vICAgdHlwZTogJ2RlbGV0ZWR8dXBkYXRlZHxuZXcnLFxuICAvLyAgIG5hbWU6ICdwcm9wZXJ0eU5hbWUnLFxuICAvLyAgIG9sZFZhbHVlOiBvbGRWYWx1ZVxuICAvLyB9XG4gIC8vIGBgYFxuICBmdW5jdGlvbiBkaWZmT2JqZWN0cyhvYmplY3QsIG9sZE9iamVjdCkge1xuICAgIHZhciBjaGFuZ2VSZWNvcmRzID0gW107XG4gICAgdmFyIHByb3AsIG9sZFZhbHVlLCB2YWx1ZTtcblxuICAgIC8vIEdvZXMgdGhyb3VnaCB0aGUgb2xkIG9iamVjdCAoc2hvdWxkIGJlIGEgY2xvbmUpIGFuZCBsb29rIGZvciB0aGluZ3MgdGhhdCBhcmUgbm93IGdvbmUgb3IgY2hhbmdlZFxuICAgIGZvciAocHJvcCBpbiBvbGRPYmplY3QpIHtcbiAgICAgIG9sZFZhbHVlID0gb2xkT2JqZWN0W3Byb3BdO1xuICAgICAgdmFsdWUgPSBvYmplY3RbcHJvcF07XG5cbiAgICAgIC8vIEFsbG93IGZvciB0aGUgY2FzZSBvZiBvYmoucHJvcCA9IHVuZGVmaW5lZCAod2hpY2ggaXMgYSBuZXcgcHJvcGVydHksIGV2ZW4gaWYgaXQgaXMgdW5kZWZpbmVkKVxuICAgICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQgJiYgIWRpZmZCYXNpYyh2YWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiB0aGUgcHJvcGVydHkgaXMgZ29uZSBpdCB3YXMgcmVtb3ZlZFxuICAgICAgaWYgKCEgKHByb3AgaW4gb2JqZWN0KSkge1xuICAgICAgICBjaGFuZ2VSZWNvcmRzLnB1c2gobmV3IENoYW5nZVJlY29yZChvYmplY3QsICdkZWxldGVkJywgcHJvcCwgb2xkVmFsdWUpKTtcbiAgICAgIH0gZWxzZSBpZiAoZGlmZkJhc2ljKHZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgY2hhbmdlUmVjb3Jkcy5wdXNoKG5ldyBDaGFuZ2VSZWNvcmQob2JqZWN0LCAndXBkYXRlZCcsIHByb3AsIG9sZFZhbHVlKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gR29lcyB0aHJvdWdoIHRoZSBvbGQgb2JqZWN0IGFuZCBsb29rcyBmb3IgdGhpbmdzIHRoYXQgYXJlIG5ld1xuICAgIGZvciAocHJvcCBpbiBvYmplY3QpIHtcbiAgICAgIHZhbHVlID0gb2JqZWN0W3Byb3BdO1xuICAgICAgaWYgKCEgKHByb3AgaW4gb2xkT2JqZWN0KSkge1xuICAgICAgICBjaGFuZ2VSZWNvcmRzLnB1c2gobmV3IENoYW5nZVJlY29yZChvYmplY3QsICduZXcnLCBwcm9wKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkob2JqZWN0KSAmJiBvYmplY3QubGVuZ3RoICE9PSBvbGRPYmplY3QubGVuZ3RoKSB7XG4gICAgICBjaGFuZ2VSZWNvcmRzLnB1c2gobmV3IENoYW5nZVJlY29yZChvYmplY3QsICd1cGRhdGVkJywgJ2xlbmd0aCcsIG9sZE9iamVjdC5sZW5ndGgpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY2hhbmdlUmVjb3JkcztcbiAgfVxuXG5cblxuXG5cbiAgRURJVF9MRUFWRSA9IDBcbiAgRURJVF9VUERBVEUgPSAxXG4gIEVESVRfQUREID0gMlxuICBFRElUX0RFTEVURSA9IDNcblxuXG4gIC8vIERpZmZzIHR3byBhcnJheXMgcmV0dXJuaW5nIGFuIGFycmF5IG9mIHNwbGljZXMuIEEgc3BsaWNlIG9iamVjdCBsb29rcyBsaWtlOlxuICAvLyBgYGBqYXZhc2NyaXB0XG4gIC8vIHtcbiAgLy8gICBpbmRleDogMyxcbiAgLy8gICByZW1vdmVkOiBbaXRlbSwgaXRlbV0sXG4gIC8vICAgYWRkZWRDb3VudDogMFxuICAvLyB9XG4gIC8vIGBgYFxuICBmdW5jdGlvbiBkaWZmQXJyYXlzKHZhbHVlLCBvbGRWYWx1ZSkge1xuICAgIHZhciBjdXJyZW50U3RhcnQgPSAwO1xuICAgIHZhciBjdXJyZW50RW5kID0gdmFsdWUubGVuZ3RoO1xuICAgIHZhciBvbGRTdGFydCA9IDA7XG4gICAgdmFyIG9sZEVuZCA9IG9sZFZhbHVlLmxlbmd0aDtcblxuICAgIHZhciBtaW5MZW5ndGggPSBNYXRoLm1pbihjdXJyZW50RW5kLCBvbGRFbmQpO1xuICAgIHZhciBwcmVmaXhDb3VudCA9IHNoYXJlZFByZWZpeCh2YWx1ZSwgb2xkVmFsdWUsIG1pbkxlbmd0aCk7XG4gICAgdmFyIHN1ZmZpeENvdW50ID0gc2hhcmVkU3VmZml4KHZhbHVlLCBvbGRWYWx1ZSwgbWluTGVuZ3RoIC0gcHJlZml4Q291bnQpO1xuXG4gICAgY3VycmVudFN0YXJ0ICs9IHByZWZpeENvdW50O1xuICAgIG9sZFN0YXJ0ICs9IHByZWZpeENvdW50O1xuICAgIGN1cnJlbnRFbmQgLT0gc3VmZml4Q291bnQ7XG4gICAgb2xkRW5kIC09IHN1ZmZpeENvdW50O1xuXG4gICAgaWYgKGN1cnJlbnRFbmQgLSBjdXJyZW50U3RhcnQgPT09IDAgJiYgb2xkRW5kIC0gb2xkU3RhcnQgPT09IDApIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICAvLyBpZiBub3RoaW5nIHdhcyBhZGRlZCwgb25seSByZW1vdmVkIGZyb20gb25lIHNwb3RcbiAgICBpZiAoY3VycmVudFN0YXJ0ID09PSBjdXJyZW50RW5kKSB7XG4gICAgICByZXR1cm4gWyBuZXcgU3BsaWNlKGN1cnJlbnRTdGFydCwgb2xkVmFsdWUuc2xpY2Uob2xkU3RhcnQsIG9sZEVuZCksIDApIF07XG4gICAgfVxuXG4gICAgLy8gaWYgbm90aGluZyB3YXMgcmVtb3ZlZCwgb25seSBhZGRlZCB0byBvbmUgc3BvdFxuICAgIGlmIChvbGRTdGFydCA9PT0gb2xkRW5kKSB7XG4gICAgICByZXR1cm4gWyBuZXcgU3BsaWNlKGN1cnJlbnRTdGFydCwgW10sIGN1cnJlbnRFbmQgLSBjdXJyZW50U3RhcnQpIF07XG4gICAgfVxuXG4gICAgLy8gYSBtaXh0dXJlIG9mIGFkZHMgYW5kIHJlbW92ZXNcbiAgICB2YXIgZGlzdGFuY2VzID0gY2FsY0VkaXREaXN0YW5jZXModmFsdWUsIGN1cnJlbnRTdGFydCwgY3VycmVudEVuZCwgb2xkVmFsdWUsIG9sZFN0YXJ0LCBvbGRFbmQpO1xuICAgIHZhciBvcHMgPSBzcGxpY2VPcGVyYXRpb25zRnJvbUVkaXREaXN0YW5jZXMoZGlzdGFuY2VzKTtcblxuICAgIHZhciBzcGxpY2UgPSBudWxsO1xuICAgIHZhciBzcGxpY2VzID0gW107XG4gICAgdmFyIGluZGV4ID0gY3VycmVudFN0YXJ0O1xuICAgIHZhciBvbGRJbmRleCA9IG9sZFN0YXJ0O1xuXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBvcHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICB2YXIgb3AgPSBvcHNbaV07XG4gICAgICBpZiAob3AgPT09IEVESVRfTEVBVkUpIHtcbiAgICAgICAgaWYgKHNwbGljZSkge1xuICAgICAgICAgIHNwbGljZXMucHVzaChzcGxpY2UpO1xuICAgICAgICAgIHNwbGljZSA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBpbmRleCsrO1xuICAgICAgICBvbGRJbmRleCsrO1xuICAgICAgfSBlbHNlIGlmIChvcCA9PT0gRURJVF9VUERBVEUpIHtcbiAgICAgICAgaWYgKCFzcGxpY2UpIHtcbiAgICAgICAgICBzcGxpY2UgPSBuZXcgU3BsaWNlKGluZGV4LCBbXSwgMCk7XG4gICAgICAgIH1cblxuICAgICAgICBzcGxpY2UuYWRkZWRDb3VudCsrO1xuICAgICAgICBpbmRleCsrO1xuXG4gICAgICAgIHNwbGljZS5yZW1vdmVkLnB1c2gob2xkVmFsdWVbb2xkSW5kZXhdKTtcbiAgICAgICAgb2xkSW5kZXgrKztcbiAgICAgIH0gZWxzZSBpZiAob3AgPT09IEVESVRfQUREKSB7XG4gICAgICAgIGlmICghc3BsaWNlKSB7XG4gICAgICAgICAgc3BsaWNlID0gbmV3IFNwbGljZShpbmRleCwgW10sIDApO1xuICAgICAgICB9XG5cbiAgICAgICAgc3BsaWNlLmFkZGVkQ291bnQrKztcbiAgICAgICAgaW5kZXgrKztcbiAgICAgIH0gZWxzZSBpZiAob3AgPT09IEVESVRfREVMRVRFKSB7XG4gICAgICAgIGlmICghc3BsaWNlKSB7XG4gICAgICAgICAgc3BsaWNlID0gbmV3IFNwbGljZShpbmRleCwgW10sIDApO1xuICAgICAgICB9XG5cbiAgICAgICAgc3BsaWNlLnJlbW92ZWQucHVzaChvbGRWYWx1ZVtvbGRJbmRleF0pO1xuICAgICAgICBvbGRJbmRleCsrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzcGxpY2UpIHtcbiAgICAgIHNwbGljZXMucHVzaChzcGxpY2UpO1xuICAgIH1cblxuICAgIHJldHVybiBzcGxpY2VzO1xuICB9XG5cblxuXG5cbiAgLy8gZmluZCB0aGUgbnVtYmVyIG9mIGl0ZW1zIGF0IHRoZSBiZWdpbm5pbmcgdGhhdCBhcmUgdGhlIHNhbWVcbiAgZnVuY3Rpb24gc2hhcmVkUHJlZml4KGN1cnJlbnQsIG9sZCwgc2VhcmNoTGVuZ3RoKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZWFyY2hMZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGRpZmZCYXNpYyhjdXJyZW50W2ldLCBvbGRbaV0pKSB7XG4gICAgICAgIHJldHVybiBpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc2VhcmNoTGVuZ3RoO1xuICB9XG5cblxuICAvLyBmaW5kIHRoZSBudW1iZXIgb2YgaXRlbXMgYXQgdGhlIGVuZCB0aGF0IGFyZSB0aGUgc2FtZVxuICBmdW5jdGlvbiBzaGFyZWRTdWZmaXgoY3VycmVudCwgb2xkLCBzZWFyY2hMZW5ndGgpIHtcbiAgICB2YXIgaW5kZXgxID0gY3VycmVudC5sZW5ndGg7XG4gICAgdmFyIGluZGV4MiA9IG9sZC5sZW5ndGg7XG4gICAgdmFyIGNvdW50ID0gMDtcbiAgICB3aGlsZSAoY291bnQgPCBzZWFyY2hMZW5ndGggJiYgIWRpZmZCYXNpYyhjdXJyZW50Wy0taW5kZXgxXSwgb2xkWy0taW5kZXgyXSkpIHtcbiAgICAgIGNvdW50Kys7XG4gICAgfVxuICAgIHJldHVybiBjb3VudDtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gc3BsaWNlT3BlcmF0aW9uc0Zyb21FZGl0RGlzdGFuY2VzKGRpc3RhbmNlcykge1xuICAgIHZhciBpID0gZGlzdGFuY2VzLmxlbmd0aCAtIDE7XG4gICAgdmFyIGogPSBkaXN0YW5jZXNbMF0ubGVuZ3RoIC0gMTtcbiAgICB2YXIgY3VycmVudCA9IGRpc3RhbmNlc1tpXVtqXTtcbiAgICB2YXIgZWRpdHMgPSBbXTtcbiAgICB3aGlsZSAoaSA+IDAgfHwgaiA+IDApIHtcbiAgICAgIGlmIChpID09PSAwKSB7XG4gICAgICAgIGVkaXRzLnB1c2goRURJVF9BREQpO1xuICAgICAgICBqLS07XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoaiA9PT0gMCkge1xuICAgICAgICBlZGl0cy5wdXNoKEVESVRfREVMRVRFKTtcbiAgICAgICAgaS0tO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgdmFyIG5vcnRoV2VzdCA9IGRpc3RhbmNlc1tpIC0gMV1baiAtIDFdO1xuICAgICAgdmFyIHdlc3QgPSBkaXN0YW5jZXNbaSAtIDFdW2pdO1xuICAgICAgdmFyIG5vcnRoID0gZGlzdGFuY2VzW2ldW2ogLSAxXTtcblxuICAgICAgaWYgKHdlc3QgPCBub3J0aCkge1xuICAgICAgICBtaW4gPSB3ZXN0IDwgbm9ydGhXZXN0ID8gd2VzdCA6IG5vcnRoV2VzdDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1pbiA9IG5vcnRoIDwgbm9ydGhXZXN0ID8gbm9ydGggOiBub3J0aFdlc3Q7XG4gICAgICB9XG5cbiAgICAgIGlmIChtaW4gPT09IG5vcnRoV2VzdCkge1xuICAgICAgICBpZiAobm9ydGhXZXN0ID09PSBjdXJyZW50KSB7XG4gICAgICAgICAgZWRpdHMucHVzaChFRElUX0xFQVZFKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBlZGl0cy5wdXNoKEVESVRfVVBEQVRFKTtcbiAgICAgICAgICBjdXJyZW50ID0gbm9ydGhXZXN0O1xuICAgICAgICB9XG4gICAgICAgIGktLTtcbiAgICAgICAgai0tO1xuICAgICAgfSBlbHNlIGlmIChtaW4gPT09IHdlc3QpIHtcbiAgICAgICAgZWRpdHMucHVzaChFRElUX0RFTEVURSk7XG4gICAgICAgIGktLTtcbiAgICAgICAgY3VycmVudCA9IHdlc3Q7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlZGl0cy5wdXNoKEVESVRfQUREKTtcbiAgICAgICAgai0tO1xuICAgICAgICBjdXJyZW50ID0gbm9ydGg7XG4gICAgICB9XG4gICAgfVxuICAgIGVkaXRzLnJldmVyc2UoKTtcbiAgICByZXR1cm4gZWRpdHM7XG4gIH1cblxuXG4gIGZ1bmN0aW9uIGNhbGNFZGl0RGlzdGFuY2VzKGN1cnJlbnQsIGN1cnJlbnRTdGFydCwgY3VycmVudEVuZCwgb2xkLCBvbGRTdGFydCwgb2xkRW5kKSB7XG4gICAgLy8gXCJEZWxldGlvblwiIGNvbHVtbnNcbiAgICB2YXIgcm93Q291bnQgPSBvbGRFbmQgLSBvbGRTdGFydCArIDE7XG4gICAgdmFyIGNvbHVtbkNvdW50ID0gY3VycmVudEVuZCAtIGN1cnJlbnRTdGFydCArIDE7XG4gICAgdmFyIGRpc3RhbmNlcyA9IG5ldyBBcnJheShyb3dDb3VudCk7XG4gICAgdmFyIGksIGo7XG5cbiAgICAvLyBcIkFkZGl0aW9uXCIgcm93cy4gSW5pdGlhbGl6ZSBudWxsIGNvbHVtbi5cbiAgICBmb3IgKGkgPSAwOyBpIDwgcm93Q291bnQ7IGkrKykge1xuICAgICAgZGlzdGFuY2VzW2ldID0gbmV3IEFycmF5KGNvbHVtbkNvdW50KTtcbiAgICAgIGRpc3RhbmNlc1tpXVswXSA9IGk7XG4gICAgfVxuXG4gICAgLy8gSW5pdGlhbGl6ZSBudWxsIHJvd1xuICAgIGZvciAoaiA9IDA7IGogPCBjb2x1bW5Db3VudDsgaisrKSB7XG4gICAgICBkaXN0YW5jZXNbMF1bal0gPSBqO1xuICAgIH1cblxuICAgIGZvciAoaSA9IDE7IGkgPCByb3dDb3VudDsgaSsrKSB7XG4gICAgICBmb3IgKGogPSAxOyBqIDwgY29sdW1uQ291bnQ7IGorKykge1xuICAgICAgICBpZiAoIWRpZmZCYXNpYyhjdXJyZW50W2N1cnJlbnRTdGFydCArIGogLSAxXSwgb2xkW29sZFN0YXJ0ICsgaSAtIDFdKSkge1xuICAgICAgICAgIGRpc3RhbmNlc1tpXVtqXSA9IGRpc3RhbmNlc1tpIC0gMV1baiAtIDFdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciBub3J0aCA9IGRpc3RhbmNlc1tpIC0gMV1bal0gKyAxO1xuICAgICAgICAgIHZhciB3ZXN0ID0gZGlzdGFuY2VzW2ldW2ogLSAxXSArIDE7XG4gICAgICAgICAgZGlzdGFuY2VzW2ldW2pdID0gbm9ydGggPCB3ZXN0ID8gbm9ydGggOiB3ZXN0O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRpc3RhbmNlcztcbiAgfVxufSkoKTtcbiIsIi8vICMgQ2hpcCBFeHByZXNzaW9uXG5cbi8vIFBhcnNlcyBhIHN0cmluZyBvZiBKYXZhU2NyaXB0IGludG8gYSBmdW5jdGlvbiB3aGljaCBjYW4gYmUgYm91bmQgdG8gYSBzY29wZS5cbi8vXG4vLyBBbGxvd3MgdW5kZWZpbmVkIG9yIG51bGwgdmFsdWVzIHRvIHJldHVybiB1bmRlZmluZWQgcmF0aGVyIHRoYW4gdGhyb3dpbmdcbi8vIGVycm9ycywgYWxsb3dzIGZvciBmb3JtYXR0ZXJzIG9uIGRhdGEsIGFuZCBwcm92aWRlcyBkZXRhaWxlZCBlcnJvciByZXBvcnRpbmcuXG5cbi8vIFRoZSBleHByZXNzaW9uIG9iamVjdCB3aXRoIGl0cyBleHByZXNzaW9uIGNhY2hlLlxudmFyIGV4cHJlc3Npb24gPSBleHBvcnRzO1xuZXhwcmVzc2lvbi5jYWNoZSA9IHt9O1xuZXhwcmVzc2lvbi5nbG9iYWxzID0gWyd0cnVlJywgJ2ZhbHNlJywgJ251bGwnLCAndW5kZWZpbmVkJywgJ3dpbmRvdycsICd0aGlzJ107XG5leHByZXNzaW9uLmdldCA9IGdldEV4cHJlc3Npb247XG5leHByZXNzaW9uLmdldFNldHRlciA9IGdldFNldHRlcjtcbmV4cHJlc3Npb24uYmluZCA9IGJpbmRFeHByZXNzaW9uO1xuXG5cbi8vIENyZWF0ZXMgYSBmdW5jdGlvbiBmcm9tIHRoZSBnaXZlbiBleHByZXNzaW9uLiBBbiBgb3B0aW9uc2Agb2JqZWN0IG1heSBiZVxuLy8gcHJvdmlkZWQgd2l0aCB0aGUgZm9sbG93aW5nIG9wdGlvbnM6XG4vLyAqIGBhcmdzYCBpcyBhbiBhcnJheSBvZiBzdHJpbmdzIHdoaWNoIHdpbGwgYmUgdGhlIGZ1bmN0aW9uJ3MgYXJndW1lbnQgbmFtZXNcbi8vICogYGdsb2JhbHNgIGlzIGFuIGFycmF5IG9mIHN0cmluZ3Mgd2hpY2ggZGVmaW5lIGdsb2JhbHMgYXZhaWxhYmxlIHRvIHRoZVxuLy8gZnVuY3Rpb24gKHRoZXNlIHdpbGwgbm90IGJlIHByZWZpeGVkIHdpdGggYHRoaXMuYCkuIGAndHJ1ZSdgLCBgJ2ZhbHNlJ2AsXG4vLyBgJ251bGwnYCwgYW5kIGAnd2luZG93J2AgYXJlIGluY2x1ZGVkIGJ5IGRlZmF1bHQuXG4vL1xuLy8gVGhpcyBmdW5jdGlvbiB3aWxsIGJlIGNhY2hlZCBzbyBzdWJzZXF1ZW50IGNhbGxzIHdpdGggdGhlIHNhbWUgZXhwcmVzc2lvbiB3aWxsXG4vLyByZXR1cm4gdGhlIHNhbWUgZnVuY3Rpb24uIEUuZy4gdGhlIGV4cHJlc3Npb24gXCJuYW1lXCIgd2lsbCBhbHdheXMgcmV0dXJuIGFcbi8vIHNpbmdsZSBmdW5jdGlvbiB3aXRoIHRoZSBib2R5IGByZXR1cm4gdGhpcy5uYW1lYC5cbmZ1bmN0aW9uIGdldEV4cHJlc3Npb24oZXhwciwgb3B0aW9ucykge1xuICBpZiAoIW9wdGlvbnMpIG9wdGlvbnMgPSB7fTtcbiAgaWYgKCFvcHRpb25zLmFyZ3MpIG9wdGlvbnMuYXJncyA9IFtdO1xuICB2YXIgY2FjaGVLZXkgPSBleHByICsgJ3wnICsgb3B0aW9ucy5hcmdzLmpvaW4oJywnKTtcbiAgLy8gUmV0dXJucyB0aGUgY2FjaGVkIGZ1bmN0aW9uIGZvciB0aGlzIGV4cHJlc3Npb24gaWYgaXQgZXhpc3RzLlxuICB2YXIgZnVuYyA9IGV4cHJlc3Npb24uY2FjaGVbY2FjaGVLZXldO1xuICBpZiAoZnVuYykge1xuICAgIHJldHVybiBmdW5jO1xuICB9XG5cbiAgb3B0aW9ucy5hcmdzLnVuc2hpZnQoJ19mb3JtYXR0ZXJzXycpO1xuXG4gIC8vIFByZWZpeCBhbGwgcHJvcGVydHkgbG9va3VwcyB3aXRoIHRoZSBgdGhpc2Aga2V5d29yZC4gSWdub3JlcyBrZXl3b3Jkc1xuICAvLyAod2luZG93LCB0cnVlLCBmYWxzZSkgYW5kIGV4dHJhIGFyZ3NcbiAgdmFyIGJvZHkgPSBwYXJzZUV4cHJlc3Npb24oZXhwciwgb3B0aW9ucyk7XG5cbiAgdHJ5IHtcbiAgICBmdW5jID0gZXhwcmVzc2lvbi5jYWNoZVtjYWNoZUtleV0gPSBGdW5jdGlvbi5hcHBseShudWxsLCBvcHRpb25zLmFyZ3MuY29uY2F0KGJvZHkpKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGlmIChvcHRpb25zLmlnbm9yZUVycm9ycykgcmV0dXJuO1xuICAgIC8vIFRocm93cyBhbiBlcnJvciBpZiB0aGUgZXhwcmVzc2lvbiB3YXMgbm90IHZhbGlkIEphdmFTY3JpcHRcbiAgICBjb25zb2xlLmVycm9yKCdCYWQgZXhwcmVzc2lvbjpcXG5gJyArIGV4cHIgKyAnYFxcbicgKyAnQ29tcGlsZWQgZXhwcmVzc2lvbjpcXG4nICsgYm9keSk7XG4gICAgdGhyb3cgbmV3IEVycm9yKGUubWVzc2FnZSk7XG4gIH1cbiAgcmV0dXJuIGZ1bmM7XG59XG5cblxuLy8gQ3JlYXRlcyBhIHNldHRlciBmdW5jdGlvbiBmcm9tIHRoZSBnaXZlbiBleHByZXNzaW9uLlxuZnVuY3Rpb24gZ2V0U2V0dGVyKGV4cHIsIG9wdGlvbnMpIHtcbiAgaWYgKCFvcHRpb25zKSBvcHRpb25zID0ge307XG4gIG9wdGlvbnMuYXJncyA9IFsndmFsdWUnXTtcbiAgZXhwciA9IGV4cHIucmVwbGFjZSgvKFxccypcXHx8JCkvLCAnID0gdmFsdWUkMScpO1xuICByZXR1cm4gZ2V0RXhwcmVzc2lvbihleHByLCBvcHRpb25zKTtcbn1cblxuXG5cbi8vIENvbXBpbGVzIGFuIGV4cHJlc3Npb24gYW5kIGJpbmRzIGl0IGluIHRoZSBnaXZlbiBzY29wZS4gVGhpcyBhbGxvd3MgaXQgdG8gYmVcbi8vIGNhbGxlZCBmcm9tIGFueXdoZXJlIChlLmcuIGV2ZW50IGxpc3RlbmVycykgd2hpbGUgcmV0YWluaW5nIHRoZSBzY29wZS5cbmZ1bmN0aW9uIGJpbmRFeHByZXNzaW9uKGV4cHIsIHNjb3BlLCBvcHRpb25zKSB7XG4gIHJldHVybiBnZXRFeHByZXNzaW9uKGV4cHIsIG9wdGlvbnMpLmJpbmQoc2NvcGUpO1xufVxuXG4vLyBmaW5kcyBhbGwgcXVvdGVkIHN0cmluZ3NcbnZhciBxdW90ZUV4cHIgPSAvKFsnXCJcXC9dKShcXFxcXFwxfFteXFwxXSkqP1xcMS9nO1xuXG4vLyBmaW5kcyBhbGwgZW1wdHkgcXVvdGVkIHN0cmluZ3NcbnZhciBlbXB0eVF1b3RlRXhwciA9IC8oWydcIlxcL10pXFwxL2c7XG5cbi8vIGZpbmRzIHBpcGVzIHRoYXQgYXJlbid0IE9ScyAoYCB8IGAgbm90IGAgfHwgYCkgZm9yIGZvcm1hdHRlcnNcbnZhciBwaXBlRXhwciA9IC9cXHwoXFx8KT8vZztcblxuLy8gZmluZHMgdGhlIHBhcnRzIG9mIGEgZm9ybWF0dGVyIChuYW1lIGFuZCBhcmdzKVxudmFyIGZvcm1hdHRlckV4cHIgPSAvXihbXlxcKF0rKSg/OlxcKCguKilcXCkpPyQvO1xuXG4vLyBmaW5kcyBhcmd1bWVudCBzZXBhcmF0b3JzIGZvciBmb3JtYXR0ZXJzIChgYXJnMTphcmcyYClcbnZhciBhcmdTZXBhcmF0b3IgPSAvXFxzKixcXHMqL2c7XG5cbi8vIG1hdGNoZXMgcHJvcGVydHkgY2hhaW5zIChlLmcuIGBuYW1lYCwgYHVzZXIubmFtZWAsIGFuZCBgdXNlci5mdWxsTmFtZSgpLmNhcGl0YWxpemUoKWApXG52YXIgcHJvcEV4cHIgPSAvKChcXHt8LHxcXC4pP1xccyopKFthLXokX1xcJF0oPzpbYS16X1xcJDAtOVxcLi1dfFxcW1snXCJcXGRdK1xcXSkqKShcXHMqKDp8XFwofFxcWyk/KS9naTtcblxuLy8gbGlua3MgaW4gYSBwcm9wZXJ0eSBjaGFpblxudmFyIGNoYWluTGlua3MgPSAvXFwufFxcWy9nO1xuXG4vLyB0aGUgcHJvcGVydHkgbmFtZSBwYXJ0IG9mIGxpbmtzXG52YXIgY2hhaW5MaW5rID0gL1xcLnxcXFt8XFwoLztcblxuLy8gZGV0ZXJtaW5lcyB3aGV0aGVyIGFuIGV4cHJlc3Npb24gaXMgYSBzZXR0ZXIgb3IgZ2V0dGVyIChgbmFtZWAgdnNcbi8vIGBuYW1lID0gJ2JvYidgKVxudmFyIHNldHRlckV4cHIgPSAvXFxzPVxccy87XG5cbnZhciBpZ25vcmUgPSBudWxsO1xudmFyIHN0cmluZ3MgPSBbXTtcbnZhciByZWZlcmVuY2VDb3VudCA9IDA7XG52YXIgY3VycmVudFJlZmVyZW5jZSA9IDA7XG52YXIgY3VycmVudEluZGV4ID0gMDtcbnZhciBmaW5pc2hlZENoYWluID0gZmFsc2U7XG52YXIgY29udGludWF0aW9uID0gZmFsc2U7XG5cbi8vIEFkZHMgYHRoaXMuYCB0byB0aGUgYmVnaW5uaW5nIG9mIGVhY2ggdmFsaWQgcHJvcGVydHkgaW4gYW4gZXhwcmVzc2lvbixcbi8vIHByb2Nlc3NlcyBmb3JtYXR0ZXJzLCBhbmQgcHJvdmlkZXMgbnVsbC10ZXJtaW5hdGlvbiBpbiBwcm9wZXJ0eSBjaGFpbnNcbmZ1bmN0aW9uIHBhcnNlRXhwcmVzc2lvbihleHByLCBvcHRpb25zKSB7XG4gIGluaXRQYXJzZShleHByLCBvcHRpb25zKTtcbiAgZXhwciA9IHB1bGxPdXRTdHJpbmdzKGV4cHIpO1xuICBleHByID0gcGFyc2VGb3JtYXR0ZXJzKGV4cHIpO1xuICBleHByID0gcGFyc2VFeHByKGV4cHIpO1xuICBleHByID0gJ3JldHVybiAnICsgZXhwcjtcbiAgZXhwciA9IHB1dEluU3RyaW5ncyhleHByKTtcbiAgZXhwciA9IGFkZFJlZmVyZW5jZXMoZXhwcik7XG4gIHJldHVybiBleHByO1xufVxuXG5cbmZ1bmN0aW9uIGluaXRQYXJzZShleHByLCBvcHRpb25zKSB7XG4gIHJlZmVyZW5jZUNvdW50ID0gY3VycmVudFJlZmVyZW5jZSA9IDA7XG4gIC8vIElnbm9yZXMga2V5d29yZHMgYW5kIHByb3ZpZGVkIGFyZ3VtZW50IG5hbWVzXG4gIGlnbm9yZSA9IGV4cHJlc3Npb24uZ2xvYmFscy5jb25jYXQob3B0aW9ucy5nbG9iYWxzIHx8IFtdLCBvcHRpb25zLmFyZ3MgfHwgW10pO1xuICBzdHJpbmdzLmxlbmd0aCA9IDA7XG59XG5cblxuLy8gQWRkcyBwbGFjZWhvbGRlcnMgZm9yIHN0cmluZ3Mgc28gd2UgY2FuIHByb2Nlc3MgdGhlIHJlc3Qgd2l0aG91dCB0aGVpciBjb250ZW50XG4vLyBtZXNzaW5nIHVzIHVwLlxuZnVuY3Rpb24gcHVsbE91dFN0cmluZ3MoZXhwcikge1xuICByZXR1cm4gZXhwci5yZXBsYWNlKHF1b3RlRXhwciwgZnVuY3Rpb24oc3RyLCBxdW90ZSkge1xuICAgIHN0cmluZ3MucHVzaChzdHIpO1xuICAgIHJldHVybiBxdW90ZSArIHF1b3RlOyAvLyBwbGFjZWhvbGRlciBmb3IgdGhlIHN0cmluZ1xuICB9KTtcbn1cblxuXG4vLyBSZXBsYWNlcyBzdHJpbmcgcGxhY2Vob2xkZXJzLlxuZnVuY3Rpb24gcHV0SW5TdHJpbmdzKGV4cHIpIHtcbiAgcmV0dXJuIGV4cHIucmVwbGFjZShlbXB0eVF1b3RlRXhwciwgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHN0cmluZ3Muc2hpZnQoKTtcbiAgfSk7XG59XG5cblxuLy8gUHJlcGVuZHMgcmVmZXJlbmNlIHZhcmlhYmxlIGRlZmluaXRpb25zXG5mdW5jdGlvbiBhZGRSZWZlcmVuY2VzKGV4cHIpIHtcbiAgaWYgKHJlZmVyZW5jZUNvdW50KSB7XG4gICAgdmFyIHJlZnMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8PSByZWZlcmVuY2VDb3VudDsgaSsrKSB7XG4gICAgICByZWZzLnB1c2goJ19yZWYnICsgaSk7XG4gICAgfVxuICAgIGV4cHIgPSAndmFyICcgKyByZWZzLmpvaW4oJywgJykgKyAnO1xcbicgKyBleHByO1xuICB9XG4gIHJldHVybiBleHByO1xufVxuXG5cbmZ1bmN0aW9uIHBhcnNlRm9ybWF0dGVycyhleHByKSB7XG4gIC8vIFJlbW92ZXMgZm9ybWF0dGVycyBmcm9tIGV4cHJlc3Npb24gc3RyaW5nXG4gIGV4cHIgPSBleHByLnJlcGxhY2UocGlwZUV4cHIsIGZ1bmN0aW9uKG1hdGNoLCBvckluZGljYXRvcikge1xuICAgIGlmIChvckluZGljYXRvcikgcmV0dXJuIG1hdGNoO1xuICAgIHJldHVybiAnQEBAJztcbiAgfSk7XG5cbiAgZm9ybWF0dGVycyA9IGV4cHIuc3BsaXQoL1xccypAQEBcXHMqLyk7XG4gIGV4cHIgPSBmb3JtYXR0ZXJzLnNoaWZ0KCk7XG4gIGlmICghZm9ybWF0dGVycy5sZW5ndGgpIHJldHVybiBleHByO1xuXG4gIC8vIFByb2Nlc3NlcyB0aGUgZm9ybWF0dGVyc1xuICAvLyBJZiB0aGUgZXhwcmVzc2lvbiBpcyBhIHNldHRlciB0aGUgdmFsdWUgd2lsbCBiZSBydW4gdGhyb3VnaCB0aGUgZm9ybWF0dGVyc1xuICB2YXIgc2V0dGVyID0gJyc7XG4gIHZhbHVlID0gZXhwcjtcblxuICBpZiAoc2V0dGVyRXhwci50ZXN0KGV4cHIpKSB7XG4gICAgdmFyIHBhcnRzID0gZXhwci5zcGxpdChzZXR0ZXJFeHByKTtcbiAgICBzZXR0ZXIgPSBwYXJ0c1swXSArICcgPSAnO1xuICAgIHZhbHVlID0gcGFydHNbMV07XG4gIH1cblxuICBmb3JtYXR0ZXJzLmZvckVhY2goZnVuY3Rpb24oZm9ybWF0dGVyKSB7XG4gICAgdmFyIG1hdGNoID0gZm9ybWF0dGVyLnRyaW0oKS5tYXRjaChmb3JtYXR0ZXJFeHByKTtcbiAgICBpZiAoIW1hdGNoKSB0aHJvdyBuZXcgRXJyb3IoJ0Zvcm1hdHRlciBpcyBpbnZhbGlkOiAnICsgZm9ybWF0dGVyKTtcbiAgICB2YXIgZm9ybWF0dGVyTmFtZSA9IG1hdGNoWzFdO1xuICAgIHZhciBhcmdzID0gbWF0Y2hbMl0gPyBtYXRjaFsyXS5zcGxpdChhcmdTZXBhcmF0b3IpIDogW107XG4gICAgYXJncy51bnNoaWZ0KHZhbHVlKTtcbiAgICBpZiAoc2V0dGVyKSBhcmdzLnB1c2godHJ1ZSk7XG4gICAgdmFsdWUgPSAnX2Zvcm1hdHRlcnNfLicgKyBmb3JtYXR0ZXJOYW1lICsgJy5jYWxsKHRoaXMsICcgKyBhcmdzLmpvaW4oJywgJykgKyAnKSc7XG4gIH0pO1xuXG4gIHJldHVybiBzZXR0ZXIgKyB2YWx1ZTtcbn1cblxuXG5mdW5jdGlvbiBwYXJzZUV4cHIoZXhwcikge1xuICBpZiAoc2V0dGVyRXhwci50ZXN0KGV4cHIpKSB7XG4gICAgdmFyIHBhcnRzID0gZXhwci5zcGxpdCgnID0gJyk7XG4gICAgdmFyIHNldHRlciA9IHBhcnRzWzBdO1xuICAgIHZhciB2YWx1ZSA9IHBhcnRzWzFdO1xuICAgIHZhciBuZWdhdGUgPSAnJztcbiAgICBpZiAoc2V0dGVyLmNoYXJBdCgwKSA9PT0gJyEnKSB7XG4gICAgICBuZWdhdGUgPSAnISc7XG4gICAgICBzZXR0ZXIgPSBzZXR0ZXIuc2xpY2UoMSk7XG4gICAgfVxuICAgIHNldHRlciA9IHBhcnNlUHJvcGVydHlDaGFpbnMoc2V0dGVyKS5yZXBsYWNlKC9eXFwofFxcKSQvZywgJycpICsgJyA9ICc7XG4gICAgdmFsdWUgPSBwYXJzZVByb3BlcnR5Q2hhaW5zKHZhbHVlKTtcbiAgICByZXR1cm4gc2V0dGVyICsgbmVnYXRlICsgdmFsdWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHBhcnNlUHJvcGVydHlDaGFpbnMoZXhwcik7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBwYXJzZVByb3BlcnR5Q2hhaW5zKGV4cHIpIHtcbiAgdmFyIGphdmFzY3JpcHQgPSAnJywganM7XG4gIC8vIGFsbG93IHJlY3Vyc2lvbiBpbnRvIGZ1bmN0aW9uIGFyZ3MgYnkgcmVzZXR0aW5nIHByb3BFeHByXG4gIHZhciBwcmV2aW91c0luZGV4ZXMgPSBbY3VycmVudEluZGV4LCBwcm9wRXhwci5sYXN0SW5kZXhdO1xuICBjdXJyZW50SW5kZXggPSAwO1xuICBwcm9wRXhwci5sYXN0SW5kZXggPSAwO1xuICB3aGlsZSAoKGpzID0gbmV4dENoYWluKGV4cHIpKSAhPT0gZmFsc2UpIHtcbiAgICBqYXZhc2NyaXB0ICs9IGpzO1xuICB9XG4gIGN1cnJlbnRJbmRleCA9IHByZXZpb3VzSW5kZXhlc1swXTtcbiAgcHJvcEV4cHIubGFzdEluZGV4ID0gcHJldmlvdXNJbmRleGVzWzFdO1xuICByZXR1cm4gamF2YXNjcmlwdDtcbn1cblxuXG5mdW5jdGlvbiBuZXh0Q2hhaW4oZXhwcikge1xuICBpZiAoZmluaXNoZWRDaGFpbikge1xuICAgIHJldHVybiAoZmluaXNoZWRDaGFpbiA9IGZhbHNlKTtcbiAgfVxuICB2YXIgbWF0Y2ggPSBwcm9wRXhwci5leGVjKGV4cHIpO1xuICBpZiAoIW1hdGNoKSB7XG4gICAgZmluaXNoZWRDaGFpbiA9IHRydWUgLy8gbWFrZSBzdXJlIG5leHQgY2FsbCB3ZSByZXR1cm4gZmFsc2VcbiAgICByZXR1cm4gZXhwci5zbGljZShjdXJyZW50SW5kZXgpO1xuICB9XG5cbiAgLy8gYHByZWZpeGAgaXMgYG9iakluZGljYXRvcmAgd2l0aCB0aGUgd2hpdGVzcGFjZSB0aGF0IG1heSBjb21lIGFmdGVyIGl0LlxuICB2YXIgcHJlZml4ID0gbWF0Y2hbMV07XG5cbiAgLy8gYG9iakluZGljYXRvcmAgaXMgYHtgIG9yIGAsYCBhbmQgbGV0J3MgdXMga25vdyB0aGlzIGlzIGFuIG9iamVjdCBwcm9wZXJ0eVxuICAvLyBuYW1lIChlLmcuIHByb3AgaW4gYHtwcm9wOmZhbHNlfWApLlxuICB2YXIgb2JqSW5kaWNhdG9yID0gbWF0Y2hbMl07XG5cbiAgLy8gYHByb3BDaGFpbmAgaXMgdGhlIGNoYWluIG9mIHByb3BlcnRpZXMgbWF0Y2hlZCAoZS5nLiBgdGhpcy51c2VyLmVtYWlsYCkuXG4gIHZhciBwcm9wQ2hhaW4gPSBtYXRjaFszXTtcblxuICAvLyBgcG9zdGZpeGAgaXMgdGhlIGBjb2xvbk9yUGFyZW5gIHdpdGggd2hpdGVzcGFjZSBiZWZvcmUgaXQuXG4gIHZhciBwb3N0Zml4ID0gbWF0Y2hbNF07XG5cbiAgLy8gYGNvbG9uT3JQYXJlbmAgbWF0Y2hlcyB0aGUgY29sb24gKDopIGFmdGVyIHRoZSBwcm9wZXJ0eSAoaWYgaXQgaXMgYW4gb2JqZWN0KVxuICAvLyBvciBwYXJlbnRoZXNpcyBpZiBpdCBpcyBhIGZ1bmN0aW9uLiBXZSB1c2UgYGNvbG9uT3JQYXJlbmAgYW5kIGBvYmpJbmRpY2F0b3JgXG4gIC8vIHRvIGtub3cgaWYgaXQgaXMgYW4gb2JqZWN0LlxuICB2YXIgY29sb25PclBhcmVuID0gbWF0Y2hbNV07XG5cbiAgbWF0Y2ggPSBtYXRjaFswXTtcblxuICB2YXIgc2tpcHBlZCA9IGV4cHIuc2xpY2UoY3VycmVudEluZGV4LCBwcm9wRXhwci5sYXN0SW5kZXggLSBtYXRjaC5sZW5ndGgpO1xuICBjdXJyZW50SW5kZXggPSBwcm9wRXhwci5sYXN0SW5kZXg7XG5cbiAgLy8gc2tpcHMgb2JqZWN0IGtleXMgZS5nLiB0ZXN0IGluIGB7dGVzdDp0cnVlfWAuXG4gIGlmIChvYmpJbmRpY2F0b3IgJiYgY29sb25PclBhcmVuID09PSAnOicpIHtcbiAgICByZXR1cm4gc2tpcHBlZCArIG1hdGNoO1xuICB9XG5cbiAgcmV0dXJuIHNraXBwZWQgKyBwYXJzZUNoYWluKHByZWZpeCwgcHJvcENoYWluLCBwb3N0Zml4LCBjb2xvbk9yUGFyZW4sIGV4cHIpO1xufVxuXG5cbmZ1bmN0aW9uIHNwbGl0TGlua3MoY2hhaW4pIHtcbiAgdmFyIGluZGV4ID0gMDtcbiAgdmFyIHBhcnRzID0gW107XG4gIHZhciBtYXRjaDtcbiAgd2hpbGUgKG1hdGNoID0gY2hhaW5MaW5rcy5leGVjKGNoYWluKSkge1xuICAgIGlmIChjaGFpbkxpbmtzLmxhc3RJbmRleCA9PT0gMSkgY29udGludWU7XG4gICAgcGFydHMucHVzaChjaGFpbi5zbGljZShpbmRleCwgY2hhaW5MaW5rcy5sYXN0SW5kZXggLSAxKSk7XG4gICAgaW5kZXggPSBjaGFpbkxpbmtzLmxhc3RJbmRleCAtIDE7XG4gIH1cbiAgcGFydHMucHVzaChjaGFpbi5zbGljZShpbmRleCkpO1xuICByZXR1cm4gcGFydHM7XG59XG5cblxuZnVuY3Rpb24gYWRkVGhpcyhjaGFpbikge1xuICBpZiAoaWdub3JlLmluZGV4T2YoY2hhaW4uc3BsaXQoY2hhaW5MaW5rKS5zaGlmdCgpKSA9PT0gLTEpIHtcbiAgICByZXR1cm4gJ3RoaXMuJyArIGNoYWluO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBjaGFpbjtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIHBhcnNlQ2hhaW4ocHJlZml4LCBwcm9wQ2hhaW4sIHBvc3RmaXgsIHBhcmVuLCBleHByKSB7XG4gIC8vIGNvbnRpbnVhdGlvbnMgYWZ0ZXIgYSBmdW5jdGlvbiAoZS5nLiBgZ2V0VXNlcigxMikuZmlyc3ROYW1lYCkuXG4gIGNvbnRpbnVhdGlvbiA9IHByZWZpeCA9PT0gJy4nO1xuICBpZiAoY29udGludWF0aW9uKSB7XG4gICAgcHJvcENoYWluID0gJy4nICsgcHJvcENoYWluO1xuICAgIHByZWZpeCA9ICcnO1xuICB9XG5cbiAgdmFyIGxpbmtzID0gc3BsaXRMaW5rcyhwcm9wQ2hhaW4pO1xuICB2YXIgbmV3Q2hhaW4gPSAnJztcblxuICBpZiAobGlua3MubGVuZ3RoID09PSAxICYmICFjb250aW51YXRpb24gJiYgIXBhcmVuKSB7XG4gICAgbGluayA9IGxpbmtzWzBdO1xuICAgIG5ld0NoYWluID0gYWRkVGhpcyhsaW5rKTtcbiAgfSBlbHNlIHtcbiAgICBpZiAoIWNvbnRpbnVhdGlvbikge1xuICAgICAgbmV3Q2hhaW4gPSAnKCc7XG4gICAgfVxuXG4gICAgbGlua3MuZm9yRWFjaChmdW5jdGlvbihsaW5rLCBpbmRleCkge1xuICAgICAgaWYgKGluZGV4ICE9PSBsaW5rcy5sZW5ndGggLSAxKSB7XG4gICAgICAgIG5ld0NoYWluICs9IHBhcnNlUGFydChsaW5rLCBpbmRleCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoIXBhcmVuc1twYXJlbl0pIHtcbiAgICAgICAgICBuZXdDaGFpbiArPSAnX3JlZicgKyBjdXJyZW50UmVmZXJlbmNlICsgbGluayArICcpJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwb3N0Zml4ID0gcG9zdGZpeC5yZXBsYWNlKHBhcmVuLCAnJyk7XG4gICAgICAgICAgbmV3Q2hhaW4gKz0gcGFyc2VGdW5jdGlvbihsaW5rLCBpbmRleCwgZXhwcik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBwcmVmaXggKyBuZXdDaGFpbiArIHBvc3RmaXg7XG59XG5cblxudmFyIHBhcmVucyA9IHtcbiAgJygnOiAnKScsXG4gICdbJzogJ10nXG59O1xuXG4vLyBIYW5kbGVzIGEgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGluIGl0cyBjb3JyZWN0IHNjb3BlXG4vLyBGaW5kcyB0aGUgZW5kIG9mIHRoZSBmdW5jdGlvbiBhbmQgcHJvY2Vzc2VzIHRoZSBhcmd1bWVudHNcbmZ1bmN0aW9uIHBhcnNlRnVuY3Rpb24obGluaywgaW5kZXgsIGV4cHIpIHtcbiAgdmFyIGNhbGwgPSBnZXRGdW5jdGlvbkNhbGwoZXhwcik7XG4gIGxpbmsgKz0gY2FsbC5zbGljZSgwLCAxKSArICd+fmluc2lkZVBhcmVuc35+JyArIGNhbGwuc2xpY2UoLTEpO1xuICB2YXIgaW5zaWRlUGFyZW5zID0gY2FsbC5zbGljZSgxLCAtMSk7XG5cbiAgaWYgKGV4cHIuY2hhckF0KHByb3BFeHByLmxhc3RJbmRleCkgPT09ICcuJykge1xuICAgIGxpbmsgPSBwYXJzZVBhcnQobGluaywgaW5kZXgpXG4gIH0gZWxzZSBpZiAoaW5kZXggPT09IDApIHtcbiAgICBsaW5rID0gcGFyc2VQYXJ0KGxpbmssIGluZGV4KTtcbiAgICBsaW5rICs9ICdfcmVmJyArIGN1cnJlbnRSZWZlcmVuY2UgKyAnKSc7XG4gIH0gZWxzZSB7XG4gICAgbGluayA9ICdfcmVmJyArIGN1cnJlbnRSZWZlcmVuY2UgKyBsaW5rICsgJyknO1xuICB9XG5cbiAgdmFyIHJlZiA9IGN1cnJlbnRSZWZlcmVuY2U7XG4gIGxpbmsgPSBsaW5rLnJlcGxhY2UoJ35+aW5zaWRlUGFyZW5zfn4nLCBwYXJzZVByb3BlcnR5Q2hhaW5zKGluc2lkZVBhcmVucykpO1xuICBjdXJyZW50UmVmZXJlbmNlID0gcmVmO1xuICByZXR1cm4gbGluaztcbn1cblxuXG4vLyByZXR1cm5zIHRoZSBjYWxsIHBhcnQgb2YgYSBmdW5jdGlvbiAoZS5nLiBgdGVzdCgxMjMpYCB3b3VsZCByZXR1cm4gYCgxMjMpYClcbmZ1bmN0aW9uIGdldEZ1bmN0aW9uQ2FsbChleHByKSB7XG4gIHZhciBzdGFydEluZGV4ID0gcHJvcEV4cHIubGFzdEluZGV4O1xuICB2YXIgb3BlbiA9IGV4cHIuY2hhckF0KHN0YXJ0SW5kZXggLSAxKTtcbiAgdmFyIGNsb3NlID0gcGFyZW5zW29wZW5dO1xuICB2YXIgZW5kSW5kZXggPSBzdGFydEluZGV4IC0gMTtcbiAgdmFyIHBhcmVuQ291bnQgPSAxO1xuICB3aGlsZSAoZW5kSW5kZXgrKyA8IGV4cHIubGVuZ3RoKSB7XG4gICAgdmFyIGNoID0gZXhwci5jaGFyQXQoZW5kSW5kZXgpO1xuICAgIGlmIChjaCA9PT0gb3BlbikgcGFyZW5Db3VudCsrO1xuICAgIGVsc2UgaWYgKGNoID09PSBjbG9zZSkgcGFyZW5Db3VudC0tO1xuICAgIGlmIChwYXJlbkNvdW50ID09PSAwKSBicmVhaztcbiAgfVxuICBjdXJyZW50SW5kZXggPSBwcm9wRXhwci5sYXN0SW5kZXggPSBlbmRJbmRleCArIDE7XG4gIHJldHVybiBvcGVuICsgZXhwci5zbGljZShzdGFydEluZGV4LCBlbmRJbmRleCkgKyBjbG9zZTtcbn1cblxuXG5cbmZ1bmN0aW9uIHBhcnNlUGFydChwYXJ0LCBpbmRleCkge1xuICAvLyBpZiB0aGUgZmlyc3RcbiAgaWYgKGluZGV4ID09PSAwICYmICFjb250aW51YXRpb24pIHtcbiAgICBpZiAoaWdub3JlLmluZGV4T2YocGFydC5zcGxpdCgvXFwufFxcKHxcXFsvKS5zaGlmdCgpKSA9PT0gLTEpIHtcbiAgICAgIHBhcnQgPSAndGhpcy4nICsgcGFydDtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcGFydCA9ICdfcmVmJyArIGN1cnJlbnRSZWZlcmVuY2UgKyBwYXJ0O1xuICB9XG5cbiAgY3VycmVudFJlZmVyZW5jZSA9ICsrcmVmZXJlbmNlQ291bnQ7XG4gIHZhciByZWYgPSAnX3JlZicgKyBjdXJyZW50UmVmZXJlbmNlO1xuICByZXR1cm4gJygnICsgcmVmICsgJyA9ICcgKyBwYXJ0ICsgJykgPT0gbnVsbCA/IHVuZGVmaW5lZCA6ICc7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSByZXF1aXJlKCcuL29ic2VydmVyJyk7XG5leHBvcnRzLmV4cHJlc3Npb24gPSByZXF1aXJlKCcuL2V4cHJlc3Npb24nKTtcbmV4cG9ydHMuZXhwcmVzc2lvbi5kaWZmID0gcmVxdWlyZSgnLi9kaWZmJyk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IE9ic2VydmVyO1xudmFyIGV4cHJlc3Npb24gPSByZXF1aXJlKCcuL2V4cHJlc3Npb24nKTtcbnZhciBkaWZmID0gcmVxdWlyZSgnLi9kaWZmJyk7XG52YXIgcmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCBzZXRUaW1lb3V0O1xudmFyIGNhbmNlbEFuaW1hdGlvbkZyYW1lID0gd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lIHx8IGNsZWFyVGltZW91dDtcblxuLy8gIyBPYnNlcnZlclxuXG4vLyBEZWZpbmVzIGFuIG9ic2VydmVyIGNsYXNzIHdoaWNoIHJlcHJlc2VudHMgYW4gZXhwcmVzc2lvbi4gV2hlbmV2ZXIgdGhhdCBleHByZXNzaW9uIHJldHVybnMgYSBuZXcgdmFsdWUgdGhlIGBjYWxsYmFja2Bcbi8vIGlzIGNhbGxlZCB3aXRoIHRoZSB2YWx1ZS5cbi8vXG4vLyBJZiB0aGUgb2xkIGFuZCBuZXcgdmFsdWVzIHdlcmUgZWl0aGVyIGFuIGFycmF5IG9yIGFuIG9iamVjdCwgdGhlIGBjYWxsYmFja2AgYWxzb1xuLy8gcmVjZWl2ZXMgYW4gYXJyYXkgb2Ygc3BsaWNlcyAoZm9yIGFuIGFycmF5KSwgb3IgYW4gYXJyYXkgb2YgY2hhbmdlIG9iamVjdHMgKGZvciBhbiBvYmplY3QpIHdoaWNoIGFyZSB0aGUgc2FtZVxuLy8gZm9ybWF0IHRoYXQgYEFycmF5Lm9ic2VydmVgIGFuZCBgT2JqZWN0Lm9ic2VydmVgIHJldHVybiA8aHR0cDovL3dpa2kuZWNtYXNjcmlwdC5vcmcvZG9rdS5waHA/aWQ9aGFybW9ueTpvYnNlcnZlPi5cbmZ1bmN0aW9uIE9ic2VydmVyKGV4cHIsIGNhbGxiYWNrLCBjYWxsYmFja0NvbnRleHQpIHtcbiAgaWYgKHR5cGVvZiBleHByID09PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhpcy5nZXR0ZXIgPSBleHByO1xuICAgIHRoaXMuc2V0dGVyID0gZXhwcjtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmdldHRlciA9IGV4cHJlc3Npb24uZ2V0KGV4cHIpO1xuICB9XG4gIHRoaXMuZXhwciA9IGV4cHI7XG4gIHRoaXMuY2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgdGhpcy5jYWxsYmFja0NvbnRleHQgPSBjYWxsYmFja0NvbnRleHQ7XG4gIHRoaXMuc2tpcCA9IGZhbHNlO1xuICB0aGlzLmZvcmNlVXBkYXRlTmV4dFN5bmMgPSBmYWxzZTtcbiAgdGhpcy5jb250ZXh0ID0gbnVsbDtcbiAgdGhpcy5vbGRWYWx1ZSA9IHVuZGVmaW5lZDtcbn1cblxuT2JzZXJ2ZXIucHJvdG90eXBlID0ge1xuXG4gIC8vIEJpbmRzIHRoaXMgZXhwcmVzc2lvbiB0byBhIGdpdmVuIGNvbnRleHRcbiAgYmluZDogZnVuY3Rpb24oY29udGV4dCwgc2tpcFVwZGF0ZSkge1xuICAgIHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG4gICAgaWYgKHRoaXMuY2FsbGJhY2spIHtcbiAgICAgIE9ic2VydmVyLmFkZCh0aGlzLCBza2lwVXBkYXRlKTtcbiAgICB9XG4gIH0sXG5cbiAgLy8gVW5iaW5kcyB0aGlzIGV4cHJlc3Npb25cbiAgdW5iaW5kOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmNvbnRleHQgPSBudWxsO1xuICAgIE9ic2VydmVyLnJlbW92ZSh0aGlzKTtcbiAgfSxcblxuICAvLyBSZXR1cm5zIHRoZSBjdXJyZW50IHZhbHVlIG9mIHRoaXMgb2JzZXJ2ZXJcbiAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5jb250ZXh0KSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXR0ZXIuY2FsbCh0aGlzLmNvbnRleHQsIE9ic2VydmVyLmZvcm1hdHRlcnMpO1xuICAgIH1cbiAgfSxcblxuICAvLyBTZXRzIHRoZSB2YWx1ZSBvZiB0aGlzIGV4cHJlc3Npb25cbiAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmICghdGhpcy5jb250ZXh0KSByZXR1cm47XG4gICAgaWYgKHRoaXMuc2V0dGVyID09PSBmYWxzZSkgcmV0dXJuO1xuICAgIGlmICghdGhpcy5zZXR0ZXIpIHtcbiAgICAgIHRoaXMuc2V0dGVyID0gdHlwZW9mIHRoaXMuZXhwciA9PT0gJ3N0cmluZydcbiAgICAgICAgPyBleHByZXNzaW9uLmdldFNldHRlcih0aGlzLmV4cHIsIHsgaWdub3JlRXJyb3JzOiB0cnVlIH0pIHx8IGZhbHNlXG4gICAgICAgIDogZmFsc2U7XG4gICAgICBpZiAoIXRoaXMuc2V0dGVyKSByZXR1cm47XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIHZhciByZXN1bHQgPSB0aGlzLnNldHRlci5jYWxsKHRoaXMuY29udGV4dCwgT2JzZXJ2ZXIuZm9ybWF0dGVycywgdmFsdWUpO1xuICAgIH0gY2F0Y2goZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuc3luYygpO1xuICAgIE9ic2VydmVyLnN5bmMoKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9LFxuXG5cbiAgLy8gSW5zdHJ1Y3RzIHRoaXMgb2JzZXJ2ZXIgdG8gbm90IGNhbGwgaXRzIGBjYWxsYmFja2Agb24gdGhlIG5leHQgc3luYywgd2hldGhlciB0aGUgdmFsdWUgaGFzIGNoYW5nZWQgb3Igbm90XG4gIHNraXBOZXh0U3luYzogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5za2lwID0gdHJ1ZTtcbiAgfSxcblxuXG4gIC8vIFN5bmNzIHRoaXMgb2JzZXJ2ZXIgbm93LCBjYWxsaW5nIHRoZSBjYWxsYmFjayBpbW1lZGlhdGVseSBpZiB0aGVyZSBoYXZlIGJlZW4gY2hhbmdlc1xuICBzeW5jOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdmFsdWUgPSB0aGlzLmdldCgpO1xuXG4gICAgLy8gRG9uJ3QgY2FsbCB0aGUgY2FsbGJhY2sgaWYgYHNraXBOZXh0U3luY2Agd2FzIGNhbGxlZCBvbiB0aGUgb2JzZXJ2ZXJcbiAgICBpZiAodGhpcy5za2lwIHx8ICF0aGlzLmNhbGxiYWNrKSB7XG4gICAgICB0aGlzLnNraXAgPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWYgYW4gYXJyYXkgaGFzIGNoYW5nZWQgY2FsY3VsYXRlIHRoZSBzcGxpY2VzIGFuZCBjYWxsIHRoZSBjYWxsYmFjay4gVGhpc1xuICAgICAgdmFyIGNoYW5nZWQgPSBkaWZmLnZhbHVlcyh2YWx1ZSwgdGhpcy5vbGRWYWx1ZSk7XG4gICAgICBpZiAoIWNoYW5nZWQgJiYgIXRoaXMuZm9yY2VVcGRhdGVOZXh0U3luYykgcmV0dXJuO1xuICAgICAgdGhpcy5mb3JjZVVwZGF0ZU5leHRTeW5jID0gZmFsc2U7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShjaGFuZ2VkKSkge1xuICAgICAgICB0aGlzLmNhbGxiYWNrLmNhbGwodGhpcy5jYWxsYmFja0NvbnRleHQsIHZhbHVlLCB0aGlzLm9sZFZhbHVlLCBjaGFuZ2VkKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5jYWxsYmFjay5jYWxsKHRoaXMuY2FsbGJhY2tDb250ZXh0LCB2YWx1ZSwgdGhpcy5vbGRWYWx1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gU3RvcmUgYW4gaW1tdXRhYmxlIHZlcnNpb24gb2YgdGhlIHZhbHVlLCBhbGxvd2luZyBmb3IgYXJyYXlzIGFuZCBvYmplY3RzIHRvIGNoYW5nZSBpbnN0YW5jZSBidXQgbm90IGNvbnRlbnQgYW5kXG4gICAgLy8gc3RpbGwgcmVmcmFpbiBmcm9tIGRpc3BhdGNoaW5nIGNhbGxiYWNrcyAoZS5nLiB3aGVuIHVzaW5nIGFuIG9iamVjdCBpbiBiaW5kLWNsYXNzIG9yIHdoZW4gdXNpbmcgYXJyYXkgZm9ybWF0dGVyc1xuICAgIC8vIGluIGJpbmQtZWFjaClcbiAgICB0aGlzLm9sZFZhbHVlID0gZGlmZi5jbG9uZSh2YWx1ZSk7XG4gIH1cbn07XG5cblxuLy8gQW4gYXJyYXkgb2YgYWxsIG9ic2VydmVycywgY29uc2lkZXJlZCAqcHJpdmF0ZSpcbk9ic2VydmVyLm9ic2VydmVycyA9IFtdO1xuXG4vLyBBbiBhcnJheSBvZiBjYWxsYmFja3MgdG8gcnVuIGFmdGVyIHRoZSBuZXh0IHN5bmMsIGNvbnNpZGVyZWQgKnByaXZhdGUqXG5PYnNlcnZlci5jYWxsYmFja3MgPSBbXTtcbk9ic2VydmVyLmxpc3RlbmVycyA9IFtdO1xuXG4vLyBBZGRzIGEgbmV3IG9ic2VydmVyIHRvIGJlIHN5bmNlZCB3aXRoIGNoYW5nZXMuIElmIGBza2lwVXBkYXRlYCBpcyB0cnVlIHRoZW4gdGhlIGNhbGxiYWNrIHdpbGwgb25seSBiZSBjYWxsZWQgd2hlbiBhXG4vLyBjaGFuZ2UgaXMgbWFkZSwgbm90IGluaXRpYWxseS5cbk9ic2VydmVyLmFkZCA9IGZ1bmN0aW9uKG9ic2VydmVyLCBza2lwVXBkYXRlKSB7XG4gIHRoaXMub2JzZXJ2ZXJzLnB1c2gob2JzZXJ2ZXIpO1xuICBpZiAoIXNraXBVcGRhdGUpIG9ic2VydmVyLnN5bmMoKTtcbn07XG5cbi8vIFJlbW92ZXMgYW4gb2JzZXJ2ZXIsIHN0b3BwaW5nIGl0IGZyb20gYmVpbmcgcnVuXG5PYnNlcnZlci5yZW1vdmUgPSBmdW5jdGlvbihvYnNlcnZlcikge1xuICB2YXIgaW5kZXggPSB0aGlzLm9ic2VydmVycy5pbmRleE9mKG9ic2VydmVyKTtcbiAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgIHRoaXMub2JzZXJ2ZXJzLnNwbGljZShpbmRleCwgMSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59O1xuXG4vLyAqcHJpdmF0ZSogcHJvcGVydGllcyB1c2VkIGluIHRoZSBzeW5jIGN5Y2xlXG5PYnNlcnZlci5zeW5jaW5nID0gZmFsc2U7XG5PYnNlcnZlci5yZXJ1biA9IGZhbHNlO1xuT2JzZXJ2ZXIuY3ljbGVzID0gMDtcbk9ic2VydmVyLm1heCA9IDEwO1xuT2JzZXJ2ZXIudGltZW91dCA9IG51bGw7XG5PYnNlcnZlci5zeW5jUGVuZGluZyA9IG51bGw7XG5cbi8vIFNjaGVkdWxlcyBhbiBvYnNlcnZlciBzeW5jIGN5Y2xlIHdoaWNoIGNoZWNrcyBhbGwgdGhlIG9ic2VydmVycyB0byBzZWUgaWYgdGhleSd2ZSBjaGFuZ2VkLlxuT2JzZXJ2ZXIuc3luYyA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gIGlmIChPYnNlcnZlci5zeW5jUGVuZGluZykgcmV0dXJuIGZhbHNlO1xuICBPYnNlcnZlci5zeW5jUGVuZGluZyA9IHJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbigpIHtcbiAgICBPYnNlcnZlci5zeW5jTm93KGNhbGxiYWNrKTtcbiAgfSk7XG4gIHJldHVybiB0cnVlO1xufTtcblxuLy8gUnVucyB0aGUgb2JzZXJ2ZXIgc3luYyBjeWNsZSB3aGljaCBjaGVja3MgYWxsIHRoZSBvYnNlcnZlcnMgdG8gc2VlIGlmIHRoZXkndmUgY2hhbmdlZC5cbk9ic2VydmVyLnN5bmNOb3cgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICBpZiAodHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgT2JzZXJ2ZXIuYWZ0ZXJTeW5jKGNhbGxiYWNrKTtcbiAgfVxuXG4gIGNhbmNlbEFuaW1hdGlvbkZyYW1lKE9ic2VydmVyLnN5bmNQZW5kaW5nKTtcbiAgT2JzZXJ2ZXIuc3luY1BlbmRpbmcgPSBudWxsO1xuXG4gIGlmIChPYnNlcnZlci5zeW5jaW5nKSB7XG4gICAgT2JzZXJ2ZXIucmVydW4gPSB0cnVlO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIE9ic2VydmVyLnN5bmNpbmcgPSB0cnVlO1xuICBPYnNlcnZlci5yZXJ1biA9IHRydWU7XG4gIE9ic2VydmVyLmN5Y2xlcyA9IDA7XG5cbiAgLy8gQWxsb3cgY2FsbGJhY2tzIHRvIHJ1biB0aGUgc3luYyBjeWNsZSBhZ2FpbiBpbW1lZGlhdGVseSwgYnV0IHN0b3AgYXQgYE9ic2VydmVyLm1heGAgKGRlZmF1bHQgMTApIGN5Y2xlcyB0byB3ZSBkb24ndFxuICAvLyBydW4gaW5maW5pdGUgbG9vcHNcbiAgd2hpbGUgKE9ic2VydmVyLnJlcnVuKSB7XG4gICAgaWYgKCsrT2JzZXJ2ZXIuY3ljbGVzID09PSBPYnNlcnZlci5tYXgpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW5maW5pdGUgb2JzZXJ2ZXIgc3luY2luZywgYW4gb2JzZXJ2ZXIgaXMgY2FsbGluZyBPYnNlcnZlci5zeW5jKCkgdG9vIG1hbnkgdGltZXMnKTtcbiAgICB9XG4gICAgT2JzZXJ2ZXIucmVydW4gPSBmYWxzZTtcbiAgICAvLyB0aGUgb2JzZXJ2ZXIgYXJyYXkgbWF5IGluY3JlYXNlIG9yIGRlY3JlYXNlIGluIHNpemUgKHJlbWFpbmluZyBvYnNlcnZlcnMpIGR1cmluZyB0aGUgc3luY1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgT2JzZXJ2ZXIub2JzZXJ2ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBPYnNlcnZlci5vYnNlcnZlcnNbaV0uc3luYygpO1xuICAgIH1cbiAgfVxuXG4gIHdoaWxlIChPYnNlcnZlci5jYWxsYmFja3MubGVuZ3RoKSB7XG4gICAgT2JzZXJ2ZXIuY2FsbGJhY2tzLnNoaWZ0KCkoKTtcbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gT2JzZXJ2ZXIubGlzdGVuZXJzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHZhciBsaXN0ZW5lciA9IE9ic2VydmVyLmxpc3RlbmVyc1tpXTtcbiAgICBsaXN0ZW5lcigpO1xuICB9XG5cbiAgT2JzZXJ2ZXIuc3luY2luZyA9IGZhbHNlO1xuICBPYnNlcnZlci5jeWNsZXMgPSAwO1xuICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8vIEFmdGVyIHRoZSBuZXh0IHN5bmMgKG9yIHRoZSBjdXJyZW50IGlmIGluIHRoZSBtaWRkbGUgb2Ygb25lKSwgcnVuIHRoZSBwcm92aWRlZCBjYWxsYmFja1xuT2JzZXJ2ZXIuYWZ0ZXJTeW5jID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgaWYgKHR5cGVvZiBjYWxsYmFjayAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2NhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICB9XG4gIE9ic2VydmVyLmNhbGxiYWNrcy5wdXNoKGNhbGxiYWNrKTtcbn07XG5cbk9ic2VydmVyLm9uU3luYyA9IGZ1bmN0aW9uKGxpc3RlbmVyKSB7XG4gIGlmICh0eXBlb2YgbGlzdGVuZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgfVxuICBPYnNlcnZlci5saXN0ZW5lcnMucHVzaChsaXN0ZW5lcik7XG59O1xuXG5PYnNlcnZlci5yZW1vdmVPblN5bmMgPSBmdW5jdGlvbihsaXN0ZW5lcikge1xuICBpZiAodHlwZW9mIGxpc3RlbmVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gIH1cbiAgdmFyIGluZGV4ID0gT2JzZXJ2ZXIubGlzdGVuZXJzLmluZGV4T2YobGlzdGVuZXIpO1xuICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgT2JzZXJ2ZXIubGlzdGVuZXJzLnNwbGljZShpbmRleCwgMSkucG9wKCk7XG4gIH1cbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlZ2lzdGVyRGVmYXVsdHM7XG5cbi8qKlxuICogIyBEZWZhdWx0IEJpbmRlcnNcbiAqIFJlZ2lzdGVycyBkZWZhdWx0IGJpbmRlcnMgd2l0aCBhIGZyYWdtZW50cyBvYmplY3QuXG4gKi9cbmZ1bmN0aW9uIHJlZ2lzdGVyRGVmYXVsdHMoZnJhZ21lbnRzKSB7XG5cbiAgLyoqXG4gICAqIEZhZGUgaW4gYW5kIG91dFxuICAgKi9cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQW5pbWF0aW9uKCdmYWRlJywge1xuICAgIG9wdGlvbnM6IHtcbiAgICAgIGR1cmF0aW9uOiAzMDAsXG4gICAgICBlYXNpbmc6ICdlYXNlLWluLW91dCdcbiAgICB9LFxuICAgIGFuaW1hdGVJbjogZnVuY3Rpb24oZWxlbWVudCwgZG9uZSkge1xuICAgICAgZWxlbWVudC5hbmltYXRlKFtcbiAgICAgICAgeyBvcGFjaXR5OiAnMCcgfSxcbiAgICAgICAgeyBvcGFjaXR5OiAnMScgfVxuICAgICAgXSwgdGhpcy5vcHRpb25zKS5vbmZpbmlzaCA9IGRvbmU7XG4gICAgfSxcbiAgICBhbmltYXRlT3V0OiBmdW5jdGlvbihlbGVtZW50LCBkb25lKSB7XG4gICAgICBlbGVtZW50LmFuaW1hdGUoW1xuICAgICAgICB7IG9wYWNpdHk6ICcxJyB9LFxuICAgICAgICB7IG9wYWNpdHk6ICcwJyB9XG4gICAgICBdLCB0aGlzLm9wdGlvbnMpLm9uZmluaXNoID0gZG9uZTtcbiAgICB9XG4gIH0pO1xuXG4gIHZhciBzbGlkZXMgPSB7XG4gICAgc2xpZGU6ICdoZWlnaHQnLFxuICAgIHNsaWRldjogJ2hlaWdodCcsXG4gICAgc2xpZGVoOiAnd2lkdGgnXG4gIH07XG5cbiAgdmFyIGFuaW1hdGluZyA9IG5ldyBNYXAoKTtcblxuICBmdW5jdGlvbiBvYmooa2V5LCB2YWx1ZSkge1xuICAgIHZhciBvYmogPSB7fTtcbiAgICBvYmpba2V5XSA9IHZhbHVlO1xuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICAvKipcbiAgICogU2xpZGUgZG93biBhbmQgdXAsIGxlZnQgYW5kIHJpZ2h0XG4gICAqL1xuICBPYmplY3Qua2V5cyhzbGlkZXMpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBwcm9wZXJ0eSA9IHNsaWRlc1tuYW1lXTtcblxuICAgIGZyYWdtZW50cy5yZWdpc3RlckFuaW1hdGlvbihuYW1lLCB7XG4gICAgICBvcHRpb25zOiB7XG4gICAgICAgIGR1cmF0aW9uOiAzMDAsXG4gICAgICAgIGVhc2luZzogJ2Vhc2UtaW4tb3V0J1xuICAgICAgfSxcbiAgICAgIGFuaW1hdGVJbjogZnVuY3Rpb24oZWxlbWVudCwgZG9uZSkge1xuICAgICAgICB2YXIgdmFsdWUgPSBlbGVtZW50LmdldENvbXB1dGVkQ1NTKHByb3BlcnR5KTtcbiAgICAgICAgaWYgKCF2YWx1ZSB8fCB2YWx1ZSA9PT0gJzBweCcpIHtcbiAgICAgICAgICByZXR1cm4gZG9uZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZWxlbWVudC5zdHlsZS5vdmVyZmxvdyA9ICdoaWRkZW4nO1xuICAgICAgICBlbGVtZW50LmFuaW1hdGUoW1xuICAgICAgICAgIG9iaihwcm9wZXJ0eSwgJzBweCcpLFxuICAgICAgICAgIG9iaihwcm9wZXJ0eSwgdmFsdWUpXG4gICAgICAgIF0sIHRoaXMub3B0aW9ucykub25maW5pc2ggPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBlbGVtZW50LnN0eWxlLm92ZXJmbG93ID0gJyc7XG4gICAgICAgICAgZG9uZSgpO1xuICAgICAgICB9O1xuICAgICAgfSxcbiAgICAgIGFuaW1hdGVPdXQ6IGZ1bmN0aW9uKGVsZW1lbnQsIGRvbmUpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gZWxlbWVudC5nZXRDb21wdXRlZENTUyhwcm9wZXJ0eSk7XG4gICAgICAgIGlmICghdmFsdWUgfHwgdmFsdWUgPT09ICcwcHgnKSB7XG4gICAgICAgICAgcmV0dXJuIGRvbmUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGVsZW1lbnQuc3R5bGUub3ZlcmZsb3cgPSAnaGlkZGVuJztcbiAgICAgICAgZWxlbWVudC5hbmltYXRlKFtcbiAgICAgICAgICBvYmoocHJvcGVydHksIHZhbHVlKSxcbiAgICAgICAgICBvYmoocHJvcGVydHksICcwcHgnKVxuICAgICAgICBdLCB0aGlzLm9wdGlvbnMpLm9uZmluaXNoID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgZWxlbWVudC5zdHlsZS5vdmVyZmxvdyA9ICcnO1xuICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9KTtcblxuXG4gICAgLyoqXG4gICAgICogTW92ZSBpdGVtcyB1cCBhbmQgZG93biBpbiBhIGxpc3QsIHNsaWRlIGRvd24gYW5kIHVwXG4gICAgICovXG4gICAgZnJhZ21lbnRzLnJlZ2lzdGVyQW5pbWF0aW9uKG5hbWUgKyAnLW1vdmUnLCB7XG4gICAgICBvcHRpb25zOiB7XG4gICAgICAgIGR1cmF0aW9uOiAzMDAsXG4gICAgICAgIGVhc2luZzogJ2Vhc2UtaW4tb3V0J1xuICAgICAgfSxcblxuICAgICAgYW5pbWF0ZUluOiBmdW5jdGlvbihlbGVtZW50LCBkb25lKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGVsZW1lbnQuZ2V0Q29tcHV0ZWRDU1MocHJvcGVydHkpO1xuICAgICAgICBpZiAoIXZhbHVlIHx8IHZhbHVlID09PSAnMHB4Jykge1xuICAgICAgICAgIHJldHVybiBkb25lKCk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgaXRlbSA9IGVsZW1lbnQudmlldyAmJiBlbGVtZW50LnZpZXcuX3JlcGVhdEl0ZW1fO1xuICAgICAgICBpZiAoaXRlbSkge1xuICAgICAgICAgIGFuaW1hdGluZy5zZXQoaXRlbSwgZWxlbWVudCk7XG4gICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGFuaW1hdGluZy5kZWxldGUoaXRlbSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEbyB0aGUgc2xpZGVcbiAgICAgICAgZWxlbWVudC5zdHlsZS5vdmVyZmxvdyA9ICdoaWRkZW4nO1xuICAgICAgICBlbGVtZW50LmFuaW1hdGUoW1xuICAgICAgICAgIG9iaihwcm9wZXJ0eSwgJzBweCcpLFxuICAgICAgICAgIG9iaihwcm9wZXJ0eSwgdmFsdWUpXG4gICAgICAgIF0sIHRoaXMub3B0aW9ucykub25maW5pc2ggPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBlbGVtZW50LnN0eWxlLm92ZXJmbG93ID0gJyc7XG4gICAgICAgICAgZG9uZSgpO1xuICAgICAgICB9O1xuICAgICAgfSxcblxuICAgICAgYW5pbWF0ZU91dDogZnVuY3Rpb24oZWxlbWVudCwgZG9uZSkge1xuICAgICAgICB2YXIgdmFsdWUgPSBlbGVtZW50LmdldENvbXB1dGVkQ1NTKHByb3BlcnR5KTtcbiAgICAgICAgaWYgKCF2YWx1ZSB8fCB2YWx1ZSA9PT0gJzBweCcpIHtcbiAgICAgICAgICByZXR1cm4gZG9uZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGl0ZW0gPSBlbGVtZW50LnZpZXcgJiYgZWxlbWVudC52aWV3Ll9yZXBlYXRJdGVtXztcbiAgICAgICAgaWYgKGl0ZW0pIHtcbiAgICAgICAgICB2YXIgbmV3RWxlbWVudCA9IGFuaW1hdGluZy5nZXQoaXRlbSk7XG4gICAgICAgICAgaWYgKG5ld0VsZW1lbnQgJiYgbmV3RWxlbWVudC5wYXJlbnROb2RlID09PSBlbGVtZW50LnBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgIC8vIFRoaXMgaXRlbSBpcyBiZWluZyByZW1vdmVkIGluIG9uZSBwbGFjZSBhbmQgYWRkZWQgaW50byBhbm90aGVyLiBNYWtlIGl0IGxvb2sgbGlrZSBpdHMgbW92aW5nIGJ5IG1ha2luZyBib3RoXG4gICAgICAgICAgICAvLyBlbGVtZW50cyBub3QgdmlzaWJsZSBhbmQgaGF2aW5nIGEgY2xvbmUgbW92ZSBhYm92ZSB0aGUgaXRlbXMgdG8gdGhlIG5ldyBsb2NhdGlvbi5cbiAgICAgICAgICAgIGVsZW1lbnQgPSB0aGlzLmFuaW1hdGVNb3ZlKGVsZW1lbnQsIG5ld0VsZW1lbnQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERvIHRoZSBzbGlkZVxuICAgICAgICBlbGVtZW50LnN0eWxlLm92ZXJmbG93ID0gJ2hpZGRlbic7XG4gICAgICAgIGVsZW1lbnQuYW5pbWF0ZShbXG4gICAgICAgICAgb2JqKHByb3BlcnR5LCB2YWx1ZSksXG4gICAgICAgICAgb2JqKHByb3BlcnR5LCAnMHB4JylcbiAgICAgICAgXSwgdGhpcy5vcHRpb25zKS5vbmZpbmlzaCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGVsZW1lbnQuc3R5bGUub3ZlcmZsb3cgPSAnJztcbiAgICAgICAgICBkb25lKCk7XG4gICAgICAgIH07XG4gICAgICB9LFxuXG4gICAgICBhbmltYXRlTW92ZTogZnVuY3Rpb24ob2xkRWxlbWVudCwgbmV3RWxlbWVudCkge1xuICAgICAgICB2YXIgcGxhY2Vob2xkZXJFbGVtZW50O1xuICAgICAgICB2YXIgcGFyZW50ID0gbmV3RWxlbWVudC5wYXJlbnROb2RlO1xuICAgICAgICBpZiAoIXBhcmVudC5fX3NsaWRlTW92ZUhhbmRsZWQpIHtcbiAgICAgICAgICBwYXJlbnQuX19zbGlkZU1vdmVIYW5kbGVkID0gdHJ1ZTtcbiAgICAgICAgICBpZiAod2luZG93LmdldENvbXB1dGVkU3R5bGUocGFyZW50KS5wb3NpdGlvbiA9PT0gJ3N0YXRpYycpIHtcbiAgICAgICAgICAgIHBhcmVudC5zdHlsZS5wb3NpdGlvbiA9ICdyZWxhdGl2ZSc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG9yaWdTdHlsZSA9IG9sZEVsZW1lbnQuZ2V0QXR0cmlidXRlKCdzdHlsZScpO1xuICAgICAgICB2YXIgc3R5bGUgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShvbGRFbGVtZW50KTtcbiAgICAgICAgdmFyIG1hcmdpbk9mZnNldExlZnQgPSAtcGFyc2VJbnQoc3R5bGUubWFyZ2luTGVmdCk7XG4gICAgICAgIHZhciBtYXJnaW5PZmZzZXRUb3AgPSAtcGFyc2VJbnQoc3R5bGUubWFyZ2luVG9wKTtcbiAgICAgICAgdmFyIG9sZExlZnQgPSBvbGRFbGVtZW50Lm9mZnNldExlZnQ7XG4gICAgICAgIHZhciBvbGRUb3AgPSBvbGRFbGVtZW50Lm9mZnNldFRvcDtcblxuICAgICAgICBwbGFjZWhvbGRlckVsZW1lbnQgPSBmcmFnbWVudHMubWFrZUVsZW1lbnRBbmltYXRhYmxlKG9sZEVsZW1lbnQuY2xvbmVOb2RlKHRydWUpKTtcbiAgICAgICAgcGxhY2Vob2xkZXJFbGVtZW50LnN0eWxlLndpZHRoID0gb2xkRWxlbWVudC5zdHlsZS53aWR0aCA9IHN0eWxlLndpZHRoO1xuICAgICAgICBwbGFjZWhvbGRlckVsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gb2xkRWxlbWVudC5zdHlsZS5oZWlnaHQgPSBzdHlsZS5oZWlnaHQ7XG4gICAgICAgIHBsYWNlaG9sZGVyRWxlbWVudC5zdHlsZS5vcGFjaXR5ID0gJzAnO1xuXG4gICAgICAgIG9sZEVsZW1lbnQuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuICAgICAgICBvbGRFbGVtZW50LnN0eWxlLnpJbmRleCA9IDEwMDA7XG4gICAgICAgIHBhcmVudC5pbnNlcnRCZWZvcmUocGxhY2Vob2xkZXJFbGVtZW50LCBvbGRFbGVtZW50KTtcbiAgICAgICAgbmV3RWxlbWVudC5zdHlsZS5vcGFjaXR5ID0gJzAnO1xuXG4gICAgICAgIG9sZEVsZW1lbnQuYW5pbWF0ZShbXG4gICAgICAgICAgeyB0b3A6IG9sZFRvcCArIG1hcmdpbk9mZnNldFRvcCArICdweCcsIGxlZnQ6IG9sZExlZnQgKyBtYXJnaW5PZmZzZXRMZWZ0ICsgJ3B4JyB9LFxuICAgICAgICAgIHsgdG9wOiBuZXdFbGVtZW50Lm9mZnNldFRvcCArIG1hcmdpbk9mZnNldFRvcCArICdweCcsIGxlZnQ6IG5ld0VsZW1lbnQub2Zmc2V0TGVmdCArIG1hcmdpbk9mZnNldExlZnQgKyAncHgnIH1cbiAgICAgICAgXSwgdGhpcy5vcHRpb25zKS5vbmZpbmlzaCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHBsYWNlaG9sZGVyRWxlbWVudC5yZW1vdmUoKTtcbiAgICAgICAgICBvcmlnU3R5bGUgPyBvbGRFbGVtZW50LnNldEF0dHJpYnV0ZSgnc3R5bGUnLCBvcmlnU3R5bGUpIDogb2xkRWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUoJ3N0eWxlJyk7XG4gICAgICAgICAgbmV3RWxlbWVudC5zdHlsZS5vcGFjaXR5ID0gJyc7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIHBsYWNlaG9sZGVyRWxlbWVudDtcbiAgICAgIH1cbiAgICB9KTtcblxuICB9KTtcblxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSByZWdpc3RlckRlZmF1bHRzO1xudmFyIGRpZmYgPSByZXF1aXJlKCcuLi9vYnNlcnZlci9kaWZmJyk7XG5cbi8qKlxuICogIyBEZWZhdWx0IEJpbmRlcnNcbiAqIFJlZ2lzdGVycyBkZWZhdWx0IGJpbmRlcnMgd2l0aCBhIGZyYWdtZW50cyBvYmplY3QuXG4gKi9cbmZ1bmN0aW9uIHJlZ2lzdGVyRGVmYXVsdHMoZnJhZ21lbnRzKSB7XG5cbiAgLyoqXG4gICAqIFByaW50cyBvdXQgdGhlIHZhbHVlIG9mIHRoZSBleHByZXNzaW9uIHRvIHRoZSBjb25zb2xlLlxuICAgKi9cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdkZWJ1ZycsIHtcbiAgICBwcmlvcml0eTogNjAsXG4gICAgdXBkYXRlZDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGNvbnNvbGUuaW5mbygnRGVidWc6JywgdGhpcy5leHByZXNzaW9uLCAnPScsIHZhbHVlKTtcbiAgICB9XG4gIH0pO1xuXG5cbiAgLyoqXG4gICAqICMjIHRleHRcbiAgICogQWRkcyBhIGJpbmRlciB0byBkaXNwbGF5IGVzY2FwZWQgdGV4dCBpbnNpZGUgYW4gZWxlbWVudC4gVGhpcyBjYW4gYmUgZG9uZSB3aXRoIGJpbmRpbmcgZGlyZWN0bHkgaW4gdGV4dCBub2RlcyBidXRcbiAgICogdXNpbmcgdGhlIGF0dHJpYnV0ZSBiaW5kZXIgcHJldmVudHMgYSBmbGFzaCBvZiB1bnN0eWxlZCBjb250ZW50IG9uIHRoZSBtYWluIHBhZ2UuXG4gICAqXG4gICAqICoqRXhhbXBsZToqKlxuICAgKiBgYGBodG1sXG4gICAqIDxoMSB0ZXh0PVwie3twb3N0LnRpdGxlfX1cIj5VbnRpdGxlZDwvaDE+XG4gICAqIDxkaXYgaHRtbD1cInt7cG9zdC5ib2R5IHwgbWFya2Rvd259fVwiPjwvZGl2PlxuICAgKiBgYGBcbiAgICogKlJlc3VsdDoqXG4gICAqIGBgYGh0bWxcbiAgICogPGgxPkxpdHRsZSBSZWQ8L2gxPlxuICAgKiA8ZGl2PlxuICAgKiAgIDxwPkxpdHRsZSBSZWQgUmlkaW5nIEhvb2QgaXMgYSBzdG9yeSBhYm91dCBhIGxpdHRsZSBnaXJsLjwvcD5cbiAgICogICA8cD5cbiAgICogICAgIE1vcmUgaW5mbyBjYW4gYmUgZm91bmQgb25cbiAgICogICAgIDxhIGhyZWY9XCJodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0xpdHRsZV9SZWRfUmlkaW5nX0hvb2RcIj5XaWtpcGVkaWE8L2E+XG4gICAqICAgPC9wPlxuICAgKiA8L2Rpdj5cbiAgICogYGBgXG4gICAqL1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ3RleHQnLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHRoaXMuZWxlbWVudC50ZXh0Q29udGVudCA9ICh2YWx1ZSA9PSBudWxsID8gJycgOiB2YWx1ZSk7XG4gIH0pO1xuXG5cbiAgLyoqXG4gICAqICMjIGh0bWxcbiAgICogQWRkcyBhIGJpbmRlciB0byBkaXNwbGF5IHVuZXNjYXBlZCBIVE1MIGluc2lkZSBhbiBlbGVtZW50LiBCZSBzdXJlIGl0J3MgdHJ1c3RlZCEgVGhpcyBzaG91bGQgYmUgdXNlZCB3aXRoIGZpbHRlcnNcbiAgICogd2hpY2ggY3JlYXRlIEhUTUwgZnJvbSBzb21ldGhpbmcgc2FmZS5cbiAgICpcbiAgICogKipFeGFtcGxlOioqXG4gICAqIGBgYGh0bWxcbiAgICogPGgxPnt7cG9zdC50aXRsZX19PC9oMT5cbiAgICogPGRpdiBodG1sPVwie3twb3N0LmJvZHkgfCBtYXJrZG93bn19XCI+PC9kaXY+XG4gICAqIGBgYFxuICAgKiAqUmVzdWx0OipcbiAgICogYGBgaHRtbFxuICAgKiA8aDE+TGl0dGxlIFJlZDwvaDE+XG4gICAqIDxkaXY+XG4gICAqICAgPHA+TGl0dGxlIFJlZCBSaWRpbmcgSG9vZCBpcyBhIHN0b3J5IGFib3V0IGEgbGl0dGxlIGdpcmwuPC9wPlxuICAgKiAgIDxwPlxuICAgKiAgICAgTW9yZSBpbmZvIGNhbiBiZSBmb3VuZCBvblxuICAgKiAgICAgPGEgaHJlZj1cImh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvTGl0dGxlX1JlZF9SaWRpbmdfSG9vZFwiPldpa2lwZWRpYTwvYT5cbiAgICogICA8L3A+XG4gICAqIDwvZGl2PlxuICAgKiBgYGBcbiAgICovXG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnaHRtbCcsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgdGhpcy5lbGVtZW50LmlubmVySFRNTCA9ICh2YWx1ZSA9PSBudWxsID8gJycgOiB2YWx1ZSk7XG4gIH0pO1xuXG5cblxuICAvKipcbiAgICogIyMgY2xhc3MtW2NsYXNzTmFtZV1cbiAgICogQWRkcyBhIGJpbmRlciB0byBhZGQgY2xhc3NlcyB0byBhbiBlbGVtZW50IGRlcGVuZGVudCBvbiB3aGV0aGVyIHRoZSBleHByZXNzaW9uIGlzIHRydWUgb3IgZmFsc2UuXG4gICAqXG4gICAqICoqRXhhbXBsZToqKlxuICAgKiBgYGBodG1sXG4gICAqIDxkaXYgY2xhc3M9XCJ1c2VyLWl0ZW1cIiBjbGFzcy1zZWxlY3RlZC11c2VyPVwie3tzZWxlY3RlZCA9PT0gdXNlcn19XCI+XG4gICAqICAgPGJ1dHRvbiBjbGFzcz1cImJ0biBwcmltYXJ5XCIgY2xhc3MtaGlnaGxpZ2h0PVwie3tyZWFkeX19XCI+PC9idXR0b24+XG4gICAqIDwvZGl2PlxuICAgKiBgYGBcbiAgICogKlJlc3VsdCBpZiBgc2VsZWN0ZWRgIGVxdWFscyB0aGUgYHVzZXJgIGFuZCBgcmVhZHlgIGlzIGB0cnVlYDoqXG4gICAqIGBgYGh0bWxcbiAgICogPGRpdiBjbGFzcz1cInVzZXItaXRlbSBzZWxlY3RlZC11c2VyXCI+XG4gICAqICAgPGJ1dHRvbiBjbGFzcz1cImJ0biBwcmltYXJ5IGhpZ2hsaWdodFwiPjwvYnV0dG9uPlxuICAgKiA8L2Rpdj5cbiAgICogYGBgXG4gICAqL1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ2NsYXNzLSonLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSkge1xuICAgICAgdGhpcy5lbGVtZW50LmNsYXNzTGlzdC5hZGQodGhpcy5tYXRjaCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKHRoaXMubWF0Y2gpO1xuICAgIH1cbiAgfSk7XG5cblxuXG4gIC8qKlxuICAgKiAjIyB2YWx1ZVxuICAgKiBBZGRzIGEgYmluZGVyIHdoaWNoIHNldHMgdGhlIHZhbHVlIG9mIGFuIEhUTUwgZm9ybSBlbGVtZW50LiBUaGlzIGJpbmRlciBhbHNvIHVwZGF0ZXMgdGhlIGRhdGEgYXMgaXQgaXMgY2hhbmdlZCBpblxuICAgKiB0aGUgZm9ybSBlbGVtZW50LCBwcm92aWRpbmcgdHdvIHdheSBiaW5kaW5nLlxuICAgKlxuICAgKiAqKkV4YW1wbGU6KipcbiAgICogYGBgaHRtbFxuICAgKiA8bGFiZWw+Rmlyc3QgTmFtZTwvbGFiZWw+XG4gICAqIDxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCJmaXJzdE5hbWVcIiB2YWx1ZT1cInVzZXIuZmlyc3ROYW1lXCI+XG4gICAqXG4gICAqIDxsYWJlbD5MYXN0IE5hbWU8L2xhYmVsPlxuICAgKiA8aW5wdXQgdHlwZT1cInRleHRcIiBuYW1lPVwibGFzdE5hbWVcIiB2YWx1ZT1cInVzZXIubGFzdE5hbWVcIj5cbiAgICogYGBgXG4gICAqICpSZXN1bHQ6KlxuICAgKiBgYGBodG1sXG4gICAqIDxsYWJlbD5GaXJzdCBOYW1lPC9sYWJlbD5cbiAgICogPGlucHV0IHR5cGU9XCJ0ZXh0XCIgbmFtZT1cImZpcnN0TmFtZVwiIHZhbHVlPVwiSmFjb2JcIj5cbiAgICpcbiAgICogPGxhYmVsPkxhc3QgTmFtZTwvbGFiZWw+XG4gICAqIDxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCJsYXN0TmFtZVwiIHZhbHVlPVwiV3JpZ2h0XCI+XG4gICAqIGBgYFxuICAgKiBBbmQgd2hlbiB0aGUgdXNlciBjaGFuZ2VzIHRoZSB0ZXh0IGluIHRoZSBmaXJzdCBpbnB1dCB0byBcIkphY1wiLCBgdXNlci5maXJzdE5hbWVgIHdpbGwgYmUgdXBkYXRlZCBpbW1lZGlhdGVseSB3aXRoXG4gICAqIHRoZSB2YWx1ZSBvZiBgJ0phYydgLlxuICAgKi9cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCd2YWx1ZScsIHtcbiAgICBvbmx5V2hlbkJvdW5kOiB0cnVlLFxuICAgIGV2ZW50c0F0dHJOYW1lOiAndmFsdWUtZXZlbnRzJyxcbiAgICBmaWVsZEF0dHJOYW1lOiAndmFsdWUtZmllbGQnLFxuICAgIGRlZmF1bHRFdmVudHM6IFsgJ2NoYW5nZScgXSxcblxuICAgIGNvbXBpbGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBuYW1lID0gdGhpcy5lbGVtZW50LnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgIHZhciB0eXBlID0gdGhpcy5lbGVtZW50LnR5cGU7XG4gICAgICB0aGlzLm1ldGhvZHMgPSBpbnB1dE1ldGhvZHNbdHlwZV0gfHwgaW5wdXRNZXRob2RzW25hbWVdO1xuXG4gICAgICBpZiAoIXRoaXMubWV0aG9kcykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLmVsZW1lbnQuaGFzQXR0cmlidXRlKHRoaXMuZXZlbnRzQXR0ck5hbWUpKSB7XG4gICAgICAgIHRoaXMuZXZlbnRzID0gdGhpcy5lbGVtZW50LmdldEF0dHJpYnV0ZSh0aGlzLmV2ZW50c0F0dHJOYW1lKS5zcGxpdCgnICcpO1xuICAgICAgICB0aGlzLmVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKHRoaXMuZXZlbnRzQXR0ck5hbWUpO1xuICAgICAgfSBlbHNlIGlmIChuYW1lICE9PSAnb3B0aW9uJykge1xuICAgICAgICB0aGlzLmV2ZW50cyA9IHRoaXMuZGVmYXVsdEV2ZW50cztcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuZWxlbWVudC5oYXNBdHRyaWJ1dGUodGhpcy5maWVsZEF0dHJOYW1lKSkge1xuICAgICAgICB0aGlzLnZhbHVlRmllbGQgPSB0aGlzLmVsZW1lbnQuZ2V0QXR0cmlidXRlKHRoaXMuZmllbGRBdHRyTmFtZSk7XG4gICAgICAgIHRoaXMuZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUodGhpcy5maWVsZEF0dHJOYW1lKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGUgPT09ICdvcHRpb24nKSB7XG4gICAgICAgIHRoaXMudmFsdWVGaWVsZCA9IHRoaXMuZWxlbWVudC5wYXJlbnROb2RlLnZhbHVlRmllbGQ7XG4gICAgICB9XG4gICAgfSxcblxuICAgIGNyZWF0ZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCF0aGlzLmV2ZW50cykgcmV0dXJuOyAvLyBub3RoaW5nIGZvciA8b3B0aW9uPiBoZXJlXG4gICAgICB2YXIgZWxlbWVudCA9IHRoaXMuZWxlbWVudDtcbiAgICAgIHZhciBvYnNlcnZlciA9IHRoaXMub2JzZXJ2ZXI7XG4gICAgICB2YXIgaW5wdXQgPSB0aGlzLm1ldGhvZHM7XG4gICAgICB2YXIgdmFsdWVGaWVsZCA9IHRoaXMudmFsdWVGaWVsZDtcblxuICAgICAgLy8gVGhlIDItd2F5IGJpbmRpbmcgcGFydCBpcyBzZXR0aW5nIHZhbHVlcyBvbiBjZXJ0YWluIGV2ZW50c1xuICAgICAgZnVuY3Rpb24gb25DaGFuZ2UoKSB7XG4gICAgICAgIGlmIChpbnB1dC5nZXQuY2FsbChlbGVtZW50LCB2YWx1ZUZpZWxkKSAhPT0gb2JzZXJ2ZXIub2xkVmFsdWUgJiYgIWVsZW1lbnQucmVhZE9ubHkpIHtcbiAgICAgICAgICBvYnNlcnZlci5zZXQoaW5wdXQuZ2V0LmNhbGwoZWxlbWVudCwgdmFsdWVGaWVsZCkpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChlbGVtZW50LnR5cGUgPT09ICd0ZXh0Jykge1xuICAgICAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgIGlmIChldmVudC5rZXlDb2RlID09PSAxMykgb25DaGFuZ2UoKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuZXZlbnRzLmZvckVhY2goZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBvbkNoYW5nZSk7XG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgdXBkYXRlZDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGlmICh0aGlzLm1ldGhvZHMuZ2V0LmNhbGwodGhpcy5lbGVtZW50LCB0aGlzLnZhbHVlRmllbGQpICE9IHZhbHVlKSB7XG4gICAgICAgIHRoaXMubWV0aG9kcy5zZXQuY2FsbCh0aGlzLmVsZW1lbnQsIHZhbHVlLCB0aGlzLnZhbHVlRmllbGQpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgLyoqXG4gICAqIEhhbmRsZSB0aGUgZGlmZmVyZW50IGZvcm0gdHlwZXNcbiAgICovXG4gIHZhciBkZWZhdWx0SW5wdXRNZXRob2QgPSB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMudmFsdWU7IH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyB0aGlzLnZhbHVlID0gKHZhbHVlID09IG51bGwpID8gJycgOiB2YWx1ZTsgfVxuICB9O1xuXG4gIHZhciBpbnB1dE1ldGhvZHMgPSB7XG4gICAgY2hlY2tib3g6IHtcbiAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmNoZWNrZWQ7IH0sXG4gICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IHRoaXMuY2hlY2tlZCA9ICEhdmFsdWU7IH1cbiAgICB9LFxuXG4gICAgZmlsZToge1xuICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuZmlsZXMgJiYgdGhpcy5maWxlc1swXTsgfSxcbiAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHt9XG4gICAgfSxcblxuICAgIHNlbGVjdDoge1xuICAgICAgZ2V0OiBmdW5jdGlvbih2YWx1ZUZpZWxkKSB7XG4gICAgICAgIGlmICh2YWx1ZUZpZWxkKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMub3B0aW9uc1t0aGlzLnNlbGVjdGVkSW5kZXhdLnZhbHVlT2JqZWN0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiB0aGlzLnZhbHVlO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSwgdmFsdWVGaWVsZCkge1xuICAgICAgICBpZiAodmFsdWUgJiYgdmFsdWVGaWVsZCkge1xuICAgICAgICAgIHRoaXMudmFsdWVPYmplY3QgPSB2YWx1ZTtcbiAgICAgICAgICB0aGlzLnZhbHVlID0gdmFsdWVbdmFsdWVGaWVsZF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy52YWx1ZSA9ICh2YWx1ZSA9PSBudWxsKSA/ICcnIDogdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuXG4gICAgb3B0aW9uOiB7XG4gICAgICBnZXQ6IGZ1bmN0aW9uKHZhbHVlRmllbGQpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlRmllbGQgPyB0aGlzLnZhbHVlT2JqZWN0W3ZhbHVlRmllbGRdIDogdGhpcy52YWx1ZTtcbiAgICAgIH0sXG4gICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlLCB2YWx1ZUZpZWxkKSB7XG4gICAgICAgIGlmICh2YWx1ZSAmJiB2YWx1ZUZpZWxkKSB7XG4gICAgICAgICAgdGhpcy52YWx1ZU9iamVjdCA9IHZhbHVlO1xuICAgICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZVt2YWx1ZUZpZWxkXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnZhbHVlID0gKHZhbHVlID09IG51bGwpID8gJycgOiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG5cbiAgICBpbnB1dDogZGVmYXVsdElucHV0TWV0aG9kLFxuXG4gICAgdGV4dGFyZWE6IGRlZmF1bHRJbnB1dE1ldGhvZFxuICB9O1xuXG5cbiAgLyoqXG4gICAqICMjIG9uLVtldmVudF1cbiAgICogQWRkcyBhIGJpbmRlciBmb3IgZWFjaCBldmVudCBuYW1lIGluIHRoZSBhcnJheS4gV2hlbiB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkIHRoZSBleHByZXNzaW9uIHdpbGwgYmUgcnVuLlxuICAgKlxuICAgKiAqKkV4YW1wbGUgRXZlbnRzOioqXG4gICAqXG4gICAqICogb24tY2xpY2tcbiAgICogKiBvbi1kYmxjbGlja1xuICAgKiAqIG9uLXN1Ym1pdFxuICAgKiAqIG9uLWNoYW5nZVxuICAgKiAqIG9uLWZvY3VzXG4gICAqICogb24tYmx1clxuICAgKlxuICAgKiAqKkV4YW1wbGU6KipcbiAgICogYGBgaHRtbFxuICAgKiA8Zm9ybSBvbi1zdWJtaXQ9XCJ7e3NhdmVVc2VyKCl9fVwiPlxuICAgKiAgIDxpbnB1dCBuYW1lPVwiZmlyc3ROYW1lXCIgdmFsdWU9XCJKYWNvYlwiPlxuICAgKiAgIDxidXR0b24+U2F2ZTwvYnV0dG9uPlxuICAgKiA8L2Zvcm0+XG4gICAqIGBgYFxuICAgKiAqUmVzdWx0IChldmVudHMgZG9uJ3QgYWZmZWN0IHRoZSBIVE1MKToqXG4gICAqIGBgYGh0bWxcbiAgICogPGZvcm0+XG4gICAqICAgPGlucHV0IG5hbWU9XCJmaXJzdE5hbWVcIiB2YWx1ZT1cIkphY29iXCI+XG4gICAqICAgPGJ1dHRvbj5TYXZlPC9idXR0b24+XG4gICAqIDwvZm9ybT5cbiAgICogYGBgXG4gICAqL1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ29uLSonLCB7XG4gICAgY3JlYXRlZDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZXZlbnROYW1lID0gdGhpcy5tYXRjaDtcbiAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICB0aGlzLmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIGlmICghdGhpcy5oYXNBdHRyaWJ1dGUoJ2Rpc2FibGVkJykgJiYgX3RoaXMuY29udGV4dCkge1xuICAgICAgICAgIC8vIFNldCB0aGUgZXZlbnQgb24gdGhlIGNvbnRleHQgc28gaXQgbWF5IGJlIHVzZWQgaW4gdGhlIGV4cHJlc3Npb24gd2hlbiB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAgICAgIHZhciBwcmlvckV2ZW50ID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihfdGhpcy5jb250ZXh0LCAnZXZlbnQnKTtcbiAgICAgICAgICB2YXIgcHJpb3JFbGVtZW50ID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihfdGhpcy5jb250ZXh0LCAnZWxlbWVudCcpO1xuICAgICAgICAgIF90aGlzLmNvbnRleHQuZXZlbnQgPSBldmVudDtcbiAgICAgICAgICBfdGhpcy5jb250ZXh0LmVsZW1lbnQgPSBfdGhpcy5lbGVtZW50O1xuXG4gICAgICAgICAgLy8gTGV0IGFuIG9uLVtldmVudF0gbWFrZSB0aGUgZnVuY3Rpb24gY2FsbCB3aXRoIGl0cyBvd24gYXJndW1lbnRzXG4gICAgICAgICAgdmFyIGxpc3RlbmVyID0gX3RoaXMub2JzZXJ2ZXIuZ2V0KCk7XG5cbiAgICAgICAgICAvLyBPciBqdXN0IHJldHVybiBhIGZ1bmN0aW9uIHdoaWNoIHdpbGwgYmUgY2FsbGVkIHdpdGggdGhlIGV2ZW50IG9iamVjdFxuICAgICAgICAgIGlmICh0eXBlb2YgbGlzdGVuZXIgPT09ICdmdW5jdGlvbicpIGxpc3RlbmVyLmNhbGwoX3RoaXMuY29udGV4dCwgZXZlbnQpO1xuXG4gICAgICAgICAgLy8gUmVzZXQgdGhlIGNvbnRleHQgdG8gaXRzIHByaW9yIHN0YXRlXG4gICAgICAgICAgaWYgKHByaW9yRXZlbnQpIHtcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShfdGhpcy5jb250ZXh0LCAnZXZlbnQnLCBwcmlvckV2ZW50KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZGVsZXRlIF90aGlzLmNvbnRleHQuZXZlbnQ7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHByaW9yRWxlbWVudCkge1xuICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KF90aGlzLmNvbnRleHQsICdlbGVtZW50JywgcHJpb3JFbGVtZW50KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZGVsZXRlIF90aGlzLmNvbnRleHQuZWxlbWVudDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG5cblxuICAvKipcbiAgICogIyMgb24tW2tleSBldmVudF1cbiAgICogQWRkcyBhIGJpbmRlciB3aGljaCBpcyB0cmlnZ2VyZWQgd2hlbiB0aGUga2V5ZG93biBldmVudCdzIGBrZXlDb2RlYCBwcm9wZXJ0eSBtYXRjaGVzLiBJZiB0aGUgbmFtZSBpbmNsdWRlcyBjdHJsXG4gICAqIHRoZW4gaXQgd2lsbCBvbmx5IGZpcmUgd2hlbiB0aGUga2V5IHBsdXMgdGhlIGN0cmxLZXkgb3IgbWV0YUtleSBpcyBwcmVzc2VkLlxuICAgKlxuICAgKiAqKktleSBFdmVudHM6KipcbiAgICpcbiAgICogKiBvbi1lbnRlclxuICAgKiAqIG9uLWN0cmwtZW50ZXJcbiAgICogKiBvbi1lc2NcbiAgICpcbiAgICogKipFeGFtcGxlOioqXG4gICAqIGBgYGh0bWxcbiAgICogPGlucHV0IG9uLWVudGVyPVwie3tzYXZlKCl9fVwiIG9uLWVzYz1cInt7Y2FuY2VsKCl9fVwiPlxuICAgKiBgYGBcbiAgICogKlJlc3VsdDoqXG4gICAqIGBgYGh0bWxcbiAgICogPGlucHV0PlxuICAgKiBgYGBcbiAgICovXG4gIHZhciBrZXlDb2RlcyA9IHsgZW50ZXI6IDEzLCBlc2M6IDI3LCAnY3RybC1lbnRlcic6IDEzIH07XG5cbiAgT2JqZWN0LmtleXMoa2V5Q29kZXMpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBrZXlDb2RlID0ga2V5Q29kZXNbbmFtZV07XG5cbiAgICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ29uLScgKyBuYW1lLCB7XG4gICAgICBjcmVhdGVkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHVzZUN0cmxLZXkgPSBuYW1lLmluZGV4T2YoJ2N0cmwtJykgPT09IDA7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIHRoaXMuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICBpZiAodXNlQ3RybEtleSAmJiAhKGV2ZW50LmN0cmxLZXkgfHwgZXZlbnQubWV0YUtleSkgfHwgIV90aGlzLmNvbnRleHQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoZXZlbnQua2V5Q29kZSAhPT0ga2V5Q29kZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICBpZiAoIXRoaXMuaGFzQXR0cmlidXRlKCdkaXNhYmxlZCcpKSB7XG4gICAgICAgICAgICAvLyBTZXQgdGhlIGV2ZW50IG9uIHRoZSBjb250ZXh0IHNvIGl0IG1heSBiZSB1c2VkIGluIHRoZSBleHByZXNzaW9uIHdoZW4gdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgICAgICAgIHZhciBwcmlvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IoX3RoaXMuY29udGV4dCwgJ2V2ZW50Jyk7XG4gICAgICAgICAgICBfdGhpcy5jb250ZXh0LmV2ZW50ID0gZXZlbnQ7XG5cbiAgICAgICAgICAgIC8vIExldCBhbiBvbi1bZXZlbnRdIG1ha2UgdGhlIGZ1bmN0aW9uIGNhbGwgd2l0aCBpdHMgb3duIGFyZ3VtZW50c1xuICAgICAgICAgICAgdmFyIGxpc3RlbmVyID0gX3RoaXMub2JzZXJ2ZXIuZ2V0KCk7XG5cbiAgICAgICAgICAgIC8vIE9yIGp1c3QgcmV0dXJuIGEgZnVuY3Rpb24gd2hpY2ggd2lsbCBiZSBjYWxsZWQgd2l0aCB0aGUgZXZlbnQgb2JqZWN0XG4gICAgICAgICAgICBpZiAodHlwZW9mIGxpc3RlbmVyID09PSAnZnVuY3Rpb24nKSBsaXN0ZW5lci5jYWxsKF90aGlzLmNvbnRleHQsIGV2ZW50KTtcblxuICAgICAgICAgICAgLy8gUmVzZXQgdGhlIGNvbnRleHQgdG8gaXRzIHByaW9yIHN0YXRlXG4gICAgICAgICAgICBpZiAocHJpb3IpIHtcbiAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KF90aGlzLmNvbnRleHQsIGV2ZW50LCBwcmlvcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBkZWxldGUgX3RoaXMuY29udGV4dC5ldmVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pXG4gIH0pO1xuXG5cbiAgLyoqXG4gICAqICMjIFthdHRyaWJ1dGVdJFxuICAgKiBBZGRzIGEgYmluZGVyIHRvIHNldCB0aGUgYXR0cmlidXRlIG9mIGVsZW1lbnQgdG8gdGhlIHZhbHVlIG9mIHRoZSBleHByZXNzaW9uLiBVc2UgdGhpcyB3aGVuIHlvdSBkb24ndCB3YW50IGFuXG4gICAqIGA8aW1nPmAgdG8gdHJ5IGFuZCBsb2FkIGl0cyBgc3JjYCBiZWZvcmUgYmVpbmcgZXZhbHVhdGVkLiBUaGlzIGlzIG9ubHkgbmVlZGVkIG9uIHRoZSBpbmRleC5odG1sIHBhZ2UgYXMgdGVtcGxhdGVcbiAgICogd2lsbCBiZSBwcm9jZXNzZWQgYmVmb3JlIGJlaW5nIGluc2VydGVkIGludG8gdGhlIERPTS4gR2VuZXJhbGx5IHlvdSBjYW4ganVzdCB1c2UgYGF0dHI9XCJ7e2V4cHJ9fVwiYC5cbiAgICpcbiAgICogKipFeGFtcGxlIEF0dHJpYnV0ZXM6KipcbiAgICpcbiAgICogKipFeGFtcGxlOioqXG4gICAqIGBgYGh0bWxcbiAgICogPGltZyBzcmMkPVwie3t1c2VyLmF2YXRhclVybH19XCI+XG4gICAqIGBgYFxuICAgKiAqUmVzdWx0OipcbiAgICogYGBgaHRtbFxuICAgKiA8aW1nIHNyYz1cImh0dHA6Ly9jZG4uZXhhbXBsZS5jb20vYXZhdGFycy9qYWN3cmlnaHQtc21hbGwucG5nXCI+XG4gICAqIGBgYFxuICAgKi9cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCcqJCcsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgdmFyIGF0dHJOYW1lID0gdGhpcy5tYXRjaDtcbiAgICBpZiAoIXZhbHVlKSB7XG4gICAgICB0aGlzLmVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKGF0dHJOYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZShhdHRyTmFtZSwgdmFsdWUpO1xuICAgIH1cbiAgfSk7XG5cblxuICAvKipcbiAgICogIyMgW2F0dHJpYnV0ZV0/XG4gICAqIEFkZHMgYSBiaW5kZXIgdG8gdG9nZ2xlIGFuIGF0dHJpYnV0ZSBvbiBvciBvZmYgaWYgdGhlIGV4cHJlc3Npb24gaXMgdHJ1dGh5IG9yIGZhbHNleS4gVXNlIGZvciBhdHRyaWJ1dGVzIHdpdGhvdXRcbiAgICogdmFsdWVzIHN1Y2ggYXMgYHNlbGVjdGVkYCwgYGRpc2FibGVkYCwgb3IgYHJlYWRvbmx5YC4gYGNoZWNrZWQ/YCB3aWxsIHVzZSAyLXdheSBkYXRhYmluZGluZy5cbiAgICpcbiAgICogKipFeGFtcGxlOioqXG4gICAqIGBgYGh0bWxcbiAgICogPGxhYmVsPklzIEFkbWluaXN0cmF0b3I8L2xhYmVsPlxuICAgKiA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgY2hlY2tlZD89XCJ7e3VzZXIuaXNBZG1pbn19XCI+XG4gICAqIDxidXR0b24gZGlzYWJsZWQ/PVwie3tpc1Byb2Nlc3Npbmd9fVwiPlN1Ym1pdDwvYnV0dG9uPlxuICAgKiBgYGBcbiAgICogKlJlc3VsdCBpZiBgaXNQcm9jZXNzaW5nYCBpcyBgdHJ1ZWAgYW5kIGB1c2VyLmlzQWRtaW5gIGlzIGZhbHNlOipcbiAgICogYGBgaHRtbFxuICAgKiA8bGFiZWw+SXMgQWRtaW5pc3RyYXRvcjwvbGFiZWw+XG4gICAqIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIj5cbiAgICogPGJ1dHRvbiBkaXNhYmxlZD5TdWJtaXQ8L2J1dHRvbj5cbiAgICogYGBgXG4gICAqL1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJyo/JywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICB2YXIgYXR0ck5hbWUgPSB0aGlzLm1hdGNoO1xuICAgIGlmICghdmFsdWUpIHtcbiAgICAgIHRoaXMuZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUoYXR0ck5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmVsZW1lbnQuc2V0QXR0cmlidXRlKGF0dHJOYW1lLCAnJyk7XG4gICAgfVxuICB9KTtcblxuXG4gIC8qKlxuICAgKiBBZGQgYSBjbG9uZSBvZiB0aGUgYHZhbHVlYCBiaW5kZXIgZm9yIGBjaGVja2VkP2Agc28gY2hlY2tib3hlcyBjYW4gaGF2ZSB0d28td2F5IGJpbmRpbmcgdXNpbmcgYGNoZWNrZWQ/YC5cbiAgICovXG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnY2hlY2tlZD8nLCBmcmFnbWVudHMuZ2V0QXR0cmlidXRlQmluZGVyKCd2YWx1ZScpKTtcblxuXG5cbiAgLyoqXG4gICAqICMjIGlmLCB1bmxlc3MsIGVsc2UtaWYsIGVsc2UtdW5sZXNzLCBlbHNlXG4gICAqIEFkZHMgYSBiaW5kZXIgdG8gc2hvdyBvciBoaWRlIHRoZSBlbGVtZW50IGlmIHRoZSB2YWx1ZSBpcyB0cnV0aHkgb3IgZmFsc2V5LiBBY3R1YWxseSByZW1vdmVzIHRoZSBlbGVtZW50IGZyb20gdGhlXG4gICAqIERPTSB3aGVuIGhpZGRlbiwgcmVwbGFjaW5nIGl0IHdpdGggYSBub24tdmlzaWJsZSBwbGFjZWhvbGRlciBhbmQgbm90IG5lZWRsZXNzbHkgZXhlY3V0aW5nIGJpbmRpbmdzIGluc2lkZS5cbiAgICpcbiAgICogKipFeGFtcGxlOioqXG4gICAqIGBgYGh0bWxcbiAgICogPHVsIGNsYXNzPVwiaGVhZGVyLWxpbmtzXCI+XG4gICAqICAgPGxpIGlmPVwidXNlclwiPjxhIGhyZWY9XCIvYWNjb3VudFwiPk15IEFjY291bnQ8L2E+PC9saT5cbiAgICogICA8bGkgdW5sZXNzPVwidXNlclwiPjxhIGhyZWY9XCIvbG9naW5cIj5TaWduIEluPC9hPjwvbGk+XG4gICAqICAgPGxpIGVsc2U+PGEgaHJlZj1cIi9sb2dvdXRcIj5TaWduIE91dDwvYT48L2xpPlxuICAgKiA8L3VsPlxuICAgKiBgYGBcbiAgICogKlJlc3VsdCBpZiBgdXNlcmAgaXMgbnVsbDoqXG4gICAqIGBgYGh0bWxcbiAgICogPHVsIGNsYXNzPVwiaGVhZGVyLWxpbmtzXCI+XG4gICAqICAgPGxpPjxhIGhyZWY9XCIvbG9naW5cIj5TaWduIEluPC9hPjwvbGk+XG4gICAqIDwvdWw+XG4gICAqIGBgYFxuICAgKi9cbiAgdmFyIElmQmluZGluZyA9IGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnaWYnLCB7XG4gICAgYW5pbWF0ZWQ6IHRydWUsXG4gICAgcHJpb3JpdHk6IDUwLFxuICAgIHVubGVzc0F0dHJOYW1lOiAndW5sZXNzJyxcbiAgICBlbHNlSWZBdHRyTmFtZTogJ2Vsc2UtaWYnLFxuICAgIGVsc2VVbmxlc3NBdHRyTmFtZTogJ2Vsc2UtdW5sZXNzJyxcbiAgICBlbHNlQXR0ck5hbWU6ICdlbHNlJyxcblxuICAgIGNvbXBpbGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBlbGVtZW50ID0gdGhpcy5lbGVtZW50O1xuICAgICAgdmFyIGV4cHJlc3Npb25zID0gWyB3cmFwSWZFeHAodGhpcy5leHByZXNzaW9uLCB0aGlzLm5hbWUgPT09IHRoaXMudW5sZXNzQXR0ck5hbWUpIF07XG4gICAgICB2YXIgcGxhY2Vob2xkZXIgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgICB2YXIgbm9kZSA9IGVsZW1lbnQubmV4dEVsZW1lbnRTaWJsaW5nO1xuICAgICAgdGhpcy5lbGVtZW50ID0gcGxhY2Vob2xkZXI7XG4gICAgICBlbGVtZW50LnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKHBsYWNlaG9sZGVyLCBlbGVtZW50KTtcblxuICAgICAgLy8gU3RvcmVzIGEgdGVtcGxhdGUgZm9yIGFsbCB0aGUgZWxlbWVudHMgdGhhdCBjYW4gZ28gaW50byB0aGlzIHNwb3RcbiAgICAgIHRoaXMudGVtcGxhdGVzID0gWyBmcmFnbWVudHMuY3JlYXRlVGVtcGxhdGUoZWxlbWVudCkgXTtcblxuICAgICAgLy8gUHVsbCBvdXQgYW55IG90aGVyIGVsZW1lbnRzIHRoYXQgYXJlIGNoYWluZWQgd2l0aCB0aGlzIG9uZVxuICAgICAgd2hpbGUgKG5vZGUpIHtcbiAgICAgICAgdmFyIG5leHQgPSBub2RlLm5leHRFbGVtZW50U2libGluZztcbiAgICAgICAgdmFyIGV4cHJlc3Npb247XG4gICAgICAgIGlmIChub2RlLmhhc0F0dHJpYnV0ZSh0aGlzLmVsc2VJZkF0dHJOYW1lKSkge1xuICAgICAgICAgIGV4cHJlc3Npb24gPSBmcmFnbWVudHMuY29kaWZ5RXhwcmVzc2lvbignYXR0cmlidXRlJywgbm9kZS5nZXRBdHRyaWJ1dGUodGhpcy5lbHNlSWZBdHRyTmFtZSkpO1xuICAgICAgICAgIGV4cHJlc3Npb25zLnB1c2god3JhcElmRXhwKGV4cHJlc3Npb24sIGZhbHNlKSk7XG4gICAgICAgICAgbm9kZS5yZW1vdmVBdHRyaWJ1dGUodGhpcy5lbHNlSWZBdHRyTmFtZSk7XG4gICAgICAgIH0gZWxzZSBpZiAobm9kZS5oYXNBdHRyaWJ1dGUodGhpcy5lbHNlVW5sZXNzQXR0ck5hbWUpKSB7XG4gICAgICAgICAgZXhwcmVzc2lvbiA9IGZyYWdtZW50cy5jb2RpZnlFeHByZXNzaW9uKCdhdHRyaWJ1dGUnLCBub2RlLmdldEF0dHJpYnV0ZSh0aGlzLmVsc2VVbmxlc3NBdHRyTmFtZSkpO1xuICAgICAgICAgIGV4cHJlc3Npb25zLnB1c2god3JhcElmRXhwKGV4cHJlc3Npb24sIHRydWUpKTtcbiAgICAgICAgICBub2RlLnJlbW92ZUF0dHJpYnV0ZSh0aGlzLmVsc2VVbmxlc3NBdHRyTmFtZSk7XG4gICAgICAgIH0gZWxzZSBpZiAobm9kZS5oYXNBdHRyaWJ1dGUodGhpcy5lbHNlQXR0ck5hbWUpKSB7XG4gICAgICAgICAgbm9kZS5yZW1vdmVBdHRyaWJ1dGUodGhpcy5lbHNlQXR0ck5hbWUpO1xuICAgICAgICAgIG5leHQgPSBudWxsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgbm9kZS5yZW1vdmUoKTtcbiAgICAgICAgdGhpcy50ZW1wbGF0ZXMucHVzaChmcmFnbWVudHMuY3JlYXRlVGVtcGxhdGUobm9kZSkpO1xuICAgICAgICBub2RlID0gbmV4dDtcbiAgICAgIH1cblxuICAgICAgLy8gQW4gZXhwcmVzc2lvbiB0aGF0IHdpbGwgcmV0dXJuIGFuIGluZGV4LiBTb21ldGhpbmcgbGlrZSB0aGlzIGBleHByID8gMCA6IGV4cHIyID8gMSA6IGV4cHIzID8gMiA6IDNgLiBUaGlzIHdpbGxcbiAgICAgIC8vIGJlIHVzZWQgdG8ga25vdyB3aGljaCBzZWN0aW9uIHRvIHNob3cgaW4gdGhlIGlmL2Vsc2UtaWYvZWxzZSBncm91cGluZy5cbiAgICAgIHRoaXMuZXhwcmVzc2lvbiA9IGV4cHJlc3Npb25zLm1hcChmdW5jdGlvbihleHByLCBpbmRleCkge1xuICAgICAgICByZXR1cm4gZXhwciArICcgPyAnICsgaW5kZXggKyAnIDogJztcbiAgICAgIH0pLmpvaW4oJycpICsgZXhwcmVzc2lvbnMubGVuZ3RoO1xuICAgIH0sXG5cbiAgICB1cGRhdGVkOiBmdW5jdGlvbihpbmRleCkge1xuICAgICAgLy8gRm9yIHBlcmZvcm1hbmNlIHByb3ZpZGUgYW4gYWx0ZXJuYXRlIGNvZGUgcGF0aCBmb3IgYW5pbWF0aW9uXG4gICAgICBpZiAodGhpcy5hbmltYXRlICYmIHRoaXMuY29udGV4dCkge1xuICAgICAgICB0aGlzLnVwZGF0ZWRBbmltYXRlZChpbmRleCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnVwZGF0ZWRSZWd1bGFyKGluZGV4KTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgYWRkOiBmdW5jdGlvbih2aWV3KSB7XG4gICAgICB0aGlzLmVsZW1lbnQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodmlldywgdGhpcy5lbGVtZW50Lm5leHRTaWJsaW5nKTtcbiAgICB9LFxuXG4gICAgLy8gRG9lc24ndCBkbyBtdWNoLCBidXQgYWxsb3dzIHN1Yi1jbGFzc2VzIHRvIGFsdGVyIHRoZSBmdW5jdGlvbmFsaXR5LlxuICAgIHJlbW92ZTogZnVuY3Rpb24odmlldykge1xuICAgICAgdmlldy5kaXNwb3NlKCk7XG4gICAgfSxcblxuICAgIHVwZGF0ZWRSZWd1bGFyOiBmdW5jdGlvbihpbmRleCkge1xuICAgICAgaWYgKHRoaXMuc2hvd2luZykge1xuICAgICAgICB0aGlzLnJlbW92ZSh0aGlzLnNob3dpbmcpO1xuICAgICAgICB0aGlzLnNob3dpbmcgPSBudWxsO1xuICAgICAgfVxuICAgICAgdmFyIHRlbXBsYXRlID0gdGhpcy50ZW1wbGF0ZXNbaW5kZXhdO1xuICAgICAgaWYgKHRlbXBsYXRlKSB7XG4gICAgICAgIHRoaXMuc2hvd2luZyA9IHRlbXBsYXRlLmNyZWF0ZVZpZXcoKTtcbiAgICAgICAgdGhpcy5zaG93aW5nLmJpbmQodGhpcy5jb250ZXh0KTtcbiAgICAgICAgdGhpcy5hZGQodGhpcy5zaG93aW5nKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgdXBkYXRlZEFuaW1hdGVkOiBmdW5jdGlvbihpbmRleCkge1xuICAgICAgdGhpcy5sYXN0VmFsdWUgPSBpbmRleDtcbiAgICAgIGlmICh0aGlzLmFuaW1hdGluZykge1xuICAgICAgICAvLyBPYnNvbGV0ZWQsIHdpbGwgY2hhbmdlIGFmdGVyIGFuaW1hdGlvbiBpcyBmaW5pc2hlZC5cbiAgICAgICAgdGhpcy5zaG93aW5nLnVuYmluZCgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLnNob3dpbmcpIHtcbiAgICAgICAgdGhpcy5hbmltYXRpbmcgPSB0cnVlO1xuICAgICAgICB0aGlzLnNob3dpbmcudW5iaW5kKCk7XG4gICAgICAgIHRoaXMuYW5pbWF0ZU91dCh0aGlzLnNob3dpbmcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHRoaXMuYW5pbWF0aW5nID0gZmFsc2U7XG5cbiAgICAgICAgICBpZiAodGhpcy5zaG93aW5nKSB7XG4gICAgICAgICAgICAvLyBNYWtlIHN1cmUgdGhpcyB3YXNuJ3QgdW5ib3VuZCB3aGlsZSB3ZSB3ZXJlIGFuaW1hdGluZyAoZS5nLiBieSBhIHBhcmVudCBgaWZgIHRoYXQgZG9lc24ndCBhbmltYXRlKVxuICAgICAgICAgICAgdGhpcy5yZW1vdmUodGhpcy5zaG93aW5nKTtcbiAgICAgICAgICAgIHRoaXMuc2hvd2luZyA9IG51bGw7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHRoaXMuY29udGV4dCkge1xuICAgICAgICAgICAgLy8gZmluaXNoIGJ5IGFuaW1hdGluZyB0aGUgbmV3IGVsZW1lbnQgaW4gKGlmIGFueSksIHVubGVzcyBubyBsb25nZXIgYm91bmRcbiAgICAgICAgICAgIHRoaXMudXBkYXRlZEFuaW1hdGVkKHRoaXMubGFzdFZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHZhciB0ZW1wbGF0ZSA9IHRoaXMudGVtcGxhdGVzW2luZGV4XTtcbiAgICAgIGlmICh0ZW1wbGF0ZSkge1xuICAgICAgICB0aGlzLnNob3dpbmcgPSB0ZW1wbGF0ZS5jcmVhdGVWaWV3KCk7XG4gICAgICAgIHRoaXMuc2hvd2luZy5iaW5kKHRoaXMuY29udGV4dCk7XG4gICAgICAgIHRoaXMuYWRkKHRoaXMuc2hvd2luZyk7XG4gICAgICAgIHRoaXMuYW5pbWF0aW5nID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5hbmltYXRlSW4odGhpcy5zaG93aW5nLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICB0aGlzLmFuaW1hdGluZyA9IGZhbHNlO1xuICAgICAgICAgIC8vIGlmIHRoZSB2YWx1ZSBjaGFuZ2VkIHdoaWxlIHRoaXMgd2FzIGFuaW1hdGluZyBydW4gaXQgYWdhaW5cbiAgICAgICAgICBpZiAodGhpcy5sYXN0VmFsdWUgIT09IGluZGV4KSB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZWRBbmltYXRlZCh0aGlzLmxhc3RWYWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgdW5ib3VuZDogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAodGhpcy5zaG93aW5nKSB7XG4gICAgICAgIHRoaXMuc2hvd2luZy51bmJpbmQoKTtcbiAgICAgIH1cbiAgICAgIHRoaXMubGFzdFZhbHVlID0gbnVsbDtcbiAgICAgIHRoaXMuYW5pbWF0aW5nID0gZmFsc2U7XG4gICAgfVxuICB9KTtcblxuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ3VubGVzcycsIElmQmluZGluZyk7XG5cbiAgZnVuY3Rpb24gd3JhcElmRXhwKGV4cHIsIGlzVW5sZXNzKSB7XG4gICAgcmV0dXJuIChpc1VubGVzcyA/ICchJyA6ICcnKSArIGV4cHI7XG4gIH1cblxuXG4gIC8qKlxuICAgKiAjIyByZXBlYXRcbiAgICogQWRkcyBhIGJpbmRlciB0byBkdXBsaWNhdGUgYW4gZWxlbWVudCBmb3IgZWFjaCBpdGVtIGluIGFuIGFycmF5LiBUaGUgZXhwcmVzc2lvbiBtYXkgYmUgb2YgdGhlIGZvcm1hdCBgZXB4cmAgb3JcbiAgICogYGl0ZW1OYW1lIGluIGV4cHJgIHdoZXJlIGBpdGVtTmFtZWAgaXMgdGhlIG5hbWUgZWFjaCBpdGVtIGluc2lkZSB0aGUgYXJyYXkgd2lsbCBiZSByZWZlcmVuY2VkIGJ5IHdpdGhpbiBiaW5kaW5nc1xuICAgKiBpbnNpZGUgdGhlIGVsZW1lbnQuXG4gICAqXG4gICAqICoqRXhhbXBsZToqKlxuICAgKiBgYGBodG1sXG4gICAqIDxkaXYgZWFjaD1cInt7cG9zdCBpbiBwb3N0c319XCIgY2xhc3MtZmVhdHVyZWQ9XCJ7e3Bvc3QuaXNGZWF0dXJlZH19XCI+XG4gICAqICAgPGgxPnt7cG9zdC50aXRsZX19PC9oMT5cbiAgICogICA8ZGl2IGh0bWw9XCJ7e3Bvc3QuYm9keSB8IG1hcmtkb3dufX1cIj48L2Rpdj5cbiAgICogPC9kaXY+XG4gICAqIGBgYFxuICAgKiAqUmVzdWx0IGlmIHRoZXJlIGFyZSAyIHBvc3RzIGFuZCB0aGUgZmlyc3Qgb25lIGlzIGZlYXR1cmVkOipcbiAgICogYGBgaHRtbFxuICAgKiA8ZGl2IGNsYXNzPVwiZmVhdHVyZWRcIj5cbiAgICogICA8aDE+TGl0dGxlIFJlZDwvaDE+XG4gICAqICAgPGRpdj5cbiAgICogICAgIDxwPkxpdHRsZSBSZWQgUmlkaW5nIEhvb2QgaXMgYSBzdG9yeSBhYm91dCBhIGxpdHRsZSBnaXJsLjwvcD5cbiAgICogICAgIDxwPlxuICAgKiAgICAgICBNb3JlIGluZm8gY2FuIGJlIGZvdW5kIG9uXG4gICAqICAgICAgIDxhIGhyZWY9XCJodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0xpdHRsZV9SZWRfUmlkaW5nX0hvb2RcIj5XaWtpcGVkaWE8L2E+XG4gICAqICAgICA8L3A+XG4gICAqICAgPC9kaXY+XG4gICAqIDwvZGl2PlxuICAgKiA8ZGl2PlxuICAgKiAgIDxoMT5CaWcgQmx1ZTwvaDE+XG4gICAqICAgPGRpdj5cbiAgICogICAgIDxwPlNvbWUgdGhvdWdodHMgb24gdGhlIE5ldyBZb3JrIEdpYW50cy48L3A+XG4gICAqICAgICA8cD5cbiAgICogICAgICAgTW9yZSBpbmZvIGNhbiBiZSBmb3VuZCBvblxuICAgKiAgICAgICA8YSBocmVmPVwiaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9OZXdfWW9ya19HaWFudHNcIj5XaWtpcGVkaWE8L2E+XG4gICAqICAgICA8L3A+XG4gICAqICAgPC9kaXY+XG4gICAqIDwvZGl2PlxuICAgKiBgYGBcbiAgICovXG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgncmVwZWF0Jywge1xuICAgIGFuaW1hdGVkOiB0cnVlLFxuICAgIHByaW9yaXR5OiAxMDAsXG5cbiAgICBjb21waWxlZDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcGFyZW50ID0gdGhpcy5lbGVtZW50LnBhcmVudE5vZGU7XG4gICAgICB2YXIgcGxhY2Vob2xkZXIgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKHBsYWNlaG9sZGVyLCB0aGlzLmVsZW1lbnQpO1xuICAgICAgdGhpcy50ZW1wbGF0ZSA9IGZyYWdtZW50cy5jcmVhdGVUZW1wbGF0ZSh0aGlzLmVsZW1lbnQpO1xuICAgICAgdGhpcy5lbGVtZW50ID0gcGxhY2Vob2xkZXI7XG5cbiAgICAgIHZhciBwYXJ0cyA9IHRoaXMuZXhwcmVzc2lvbi5zcGxpdCgvXFxzK2luXFxzKy8pO1xuICAgICAgdGhpcy5leHByZXNzaW9uID0gcGFydHMucG9wKCk7XG4gICAgICB2YXIga2V5ID0gcGFydHMucG9wKCk7XG4gICAgICBpZiAoa2V5KSB7XG4gICAgICAgIHBhcnRzID0ga2V5LnNwbGl0KC9cXHMqLFxccyovKTtcbiAgICAgICAgdGhpcy52YWx1ZU5hbWUgPSBwYXJ0cy5wb3AoKTtcbiAgICAgICAgdGhpcy5rZXlOYW1lID0gcGFydHMucG9wKCk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIGNyZWF0ZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy52aWV3cyA9IFtdO1xuICAgICAgdGhpcy5vYnNlcnZlci5nZXRDaGFuZ2VSZWNvcmRzID0gdHJ1ZTtcbiAgICB9LFxuXG4gICAgcmVtb3ZlVmlldzogZnVuY3Rpb24odmlldykge1xuICAgICAgdmlldy5kaXNwb3NlKCk7XG4gICAgICB2aWV3Ll9yZXBlYXRJdGVtXyA9IG51bGw7XG4gICAgfSxcblxuICAgIHVwZGF0ZWQ6IGZ1bmN0aW9uKHZhbHVlLCBvbGRWYWx1ZSwgY2hhbmdlcykge1xuICAgICAgaWYgKCFjaGFuZ2VzIHx8ICF0aGlzLmNvbnRleHQpIHtcbiAgICAgICAgdGhpcy5wb3B1bGF0ZSh2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodGhpcy5hbmltYXRlKSB7XG4gICAgICAgICAgdGhpcy51cGRhdGVDaGFuZ2VzQW5pbWF0ZWQodmFsdWUsIGNoYW5nZXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMudXBkYXRlQ2hhbmdlcyh2YWx1ZSwgY2hhbmdlcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLy8gTWV0aG9kIGZvciBjcmVhdGluZyBhbmQgc2V0dGluZyB1cCBuZXcgdmlld3MgZm9yIG91ciBsaXN0XG4gICAgY3JlYXRlVmlldzogZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuICAgICAgdmFyIHZpZXcgPSB0aGlzLnRlbXBsYXRlLmNyZWF0ZVZpZXcoKTtcbiAgICAgIHZhciBjb250ZXh0ID0gdmFsdWU7XG4gICAgICBpZiAodGhpcy52YWx1ZU5hbWUpIHtcbiAgICAgICAgY29udGV4dCA9IE9iamVjdC5jcmVhdGUodGhpcy5jb250ZXh0KTtcbiAgICAgICAgaWYgKHRoaXMua2V5TmFtZSkgY29udGV4dFt0aGlzLmtleU5hbWVdID0ga2V5O1xuICAgICAgICBjb250ZXh0W3RoaXMudmFsdWVOYW1lXSA9IHZhbHVlO1xuICAgICAgICBjb250ZXh0Ll9vcmlnQ29udGV4dF8gPSB0aGlzLmNvbnRleHQuaGFzT3duUHJvcGVydHkoJ19vcmlnQ29udGV4dF8nKVxuICAgICAgICAgID8gdGhpcy5jb250ZXh0Ll9vcmlnQ29udGV4dF9cbiAgICAgICAgICA6IHRoaXMuY29udGV4dDtcbiAgICAgIH1cbiAgICAgIHZpZXcuYmluZChjb250ZXh0KTtcbiAgICAgIHZpZXcuX3JlcGVhdEl0ZW1fID0gdmFsdWU7XG4gICAgICByZXR1cm4gdmlldztcbiAgICB9LFxuXG4gICAgcG9wdWxhdGU6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBpZiAodGhpcy5hbmltYXRpbmcpIHtcbiAgICAgICAgdGhpcy52YWx1ZVdoaWxlQW5pbWF0aW5nID0gdmFsdWU7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMudmlld3MubGVuZ3RoKSB7XG4gICAgICAgIHRoaXMudmlld3MuZm9yRWFjaCh0aGlzLnJlbW92ZVZpZXcpO1xuICAgICAgICB0aGlzLnZpZXdzLmxlbmd0aCA9IDA7XG4gICAgICB9XG5cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGgpIHtcbiAgICAgICAgdmFyIGZyYWcgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG5cbiAgICAgICAgdmFsdWUuZm9yRWFjaChmdW5jdGlvbihpdGVtLCBpbmRleCkge1xuICAgICAgICAgIHZhciB2aWV3ID0gdGhpcy5jcmVhdGVWaWV3KGluZGV4LCBpdGVtKTtcbiAgICAgICAgICB0aGlzLnZpZXdzLnB1c2godmlldyk7XG4gICAgICAgICAgZnJhZy5hcHBlbmRDaGlsZCh2aWV3KTtcbiAgICAgICAgfSwgdGhpcyk7XG5cbiAgICAgICAgdGhpcy5lbGVtZW50LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGZyYWcsIHRoaXMuZWxlbWVudC5uZXh0U2libGluZyk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRoaXMgdW4tYW5pbWF0ZWQgdmVyc2lvbiByZW1vdmVzIGFsbCByZW1vdmVkIHZpZXdzIGZpcnN0IHNvIHRoZXkgY2FuIGJlIHJldHVybmVkIHRvIHRoZSBwb29sIGFuZCB0aGVuIGFkZHMgbmV3XG4gICAgICogdmlld3MgYmFjayBpbi4gVGhpcyBpcyB0aGUgbW9zdCBvcHRpbWFsIG1ldGhvZCB3aGVuIG5vdCBhbmltYXRpbmcuXG4gICAgICovXG4gICAgdXBkYXRlQ2hhbmdlczogZnVuY3Rpb24odmFsdWUsIGNoYW5nZXMpIHtcbiAgICAgIC8vIFJlbW92ZSBldmVyeXRoaW5nIGZpcnN0LCB0aGVuIGFkZCBhZ2FpbiwgYWxsb3dpbmcgZm9yIGVsZW1lbnQgcmV1c2UgZnJvbSB0aGUgcG9vbFxuICAgICAgdmFyIGFkZGVkQ291bnQgPSAwO1xuXG4gICAgICBjaGFuZ2VzLmZvckVhY2goZnVuY3Rpb24oc3BsaWNlKSB7XG4gICAgICAgIGFkZGVkQ291bnQgKz0gc3BsaWNlLmFkZGVkQ291bnQ7XG4gICAgICAgIGlmICghc3BsaWNlLnJlbW92ZWQubGVuZ3RoKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciByZW1vdmVkID0gdGhpcy52aWV3cy5zcGxpY2Uoc3BsaWNlLmluZGV4IC0gYWRkZWRDb3VudCwgc3BsaWNlLnJlbW92ZWQubGVuZ3RoKTtcbiAgICAgICAgcmVtb3ZlZC5mb3JFYWNoKHRoaXMucmVtb3ZlVmlldyk7XG4gICAgICB9LCB0aGlzKTtcblxuICAgICAgLy8gQWRkIHRoZSBuZXcvbW92ZWQgdmlld3NcbiAgICAgIGNoYW5nZXMuZm9yRWFjaChmdW5jdGlvbihzcGxpY2UpIHtcbiAgICAgICAgaWYgKCFzcGxpY2UuYWRkZWRDb3VudCkgcmV0dXJuO1xuICAgICAgICB2YXIgYWRkZWRWaWV3cyA9IFtdO1xuICAgICAgICB2YXIgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgICAgIHZhciBpbmRleCA9IHNwbGljZS5pbmRleDtcbiAgICAgICAgdmFyIGVuZEluZGV4ID0gaW5kZXggKyBzcGxpY2UuYWRkZWRDb3VudDtcblxuICAgICAgICBmb3IgKHZhciBpID0gaW5kZXg7IGkgPCBlbmRJbmRleDsgaSsrKSB7XG4gICAgICAgICAgdmFyIGl0ZW0gPSB2YWx1ZVtpXTtcbiAgICAgICAgICB2aWV3ID0gdGhpcy5jcmVhdGVWaWV3KGksIGl0ZW0pO1xuICAgICAgICAgIGFkZGVkVmlld3MucHVzaCh2aWV3KTtcbiAgICAgICAgICBmcmFnbWVudC5hcHBlbmRDaGlsZCh2aWV3KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnZpZXdzLnNwbGljZS5hcHBseSh0aGlzLnZpZXdzLCBbIGluZGV4LCAwIF0uY29uY2F0KGFkZGVkVmlld3MpKTtcbiAgICAgICAgdmFyIHByZXZpb3VzVmlldyA9IHRoaXMudmlld3NbaW5kZXggLSAxXTtcbiAgICAgICAgdmFyIG5leHRTaWJsaW5nID0gcHJldmlvdXNWaWV3ID8gcHJldmlvdXNWaWV3Lmxhc3RWaWV3Tm9kZS5uZXh0U2libGluZyA6IHRoaXMuZWxlbWVudC5uZXh0U2libGluZztcbiAgICAgICAgdGhpcy5lbGVtZW50LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGZyYWdtZW50LCBuZXh0U2libGluZyk7XG4gICAgICB9LCB0aGlzKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVGhpcyBhbmltYXRlZCB2ZXJzaW9uIG11c3QgYW5pbWF0ZSByZW1vdmVkIG5vZGVzIG91dCB3aGlsZSBhZGRlZCBub2RlcyBhcmUgYW5pbWF0aW5nIGluIG1ha2luZyBpdCBsZXNzIG9wdGltYWxcbiAgICAgKiAoYnV0IGNvb2wgbG9va2luZykuIEl0IGFsc28gaGFuZGxlcyBcIm1vdmVcIiBhbmltYXRpb25zIGZvciBub2RlcyB3aGljaCBhcmUgbW92aW5nIHBsYWNlIHdpdGhpbiB0aGUgbGlzdC5cbiAgICAgKi9cbiAgICB1cGRhdGVDaGFuZ2VzQW5pbWF0ZWQ6IGZ1bmN0aW9uKHZhbHVlLCBjaGFuZ2VzKSB7XG4gICAgICBpZiAodGhpcy5hbmltYXRpbmcpIHtcbiAgICAgICAgdGhpcy52YWx1ZVdoaWxlQW5pbWF0aW5nID0gdmFsdWU7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciBhbmltYXRpbmdWYWx1ZSA9IHZhbHVlLnNsaWNlKCk7XG4gICAgICB2YXIgYWxsQWRkZWQgPSBbXTtcbiAgICAgIHZhciBhbGxSZW1vdmVkID0gW107XG4gICAgICB0aGlzLmFuaW1hdGluZyA9IHRydWU7XG5cbiAgICAgIC8vIFJ1biB1cGRhdGVzIHdoaWNoIG9jY3VyZWQgd2hpbGUgdGhpcyB3YXMgYW5pbWF0aW5nLlxuICAgICAgZnVuY3Rpb24gd2hlbkRvbmUoKSB7XG4gICAgICAgIC8vIFRoZSBsYXN0IGFuaW1hdGlvbiBmaW5pc2hlZCB3aWxsIHJ1biB0aGlzXG4gICAgICAgIGlmICgtLXdoZW5Eb25lLmNvdW50ICE9PSAwKSByZXR1cm47XG5cbiAgICAgICAgYWxsUmVtb3ZlZC5mb3JFYWNoKHRoaXMucmVtb3ZlVmlldyk7XG5cbiAgICAgICAgdGhpcy5hbmltYXRpbmcgPSBmYWxzZTtcbiAgICAgICAgaWYgKHRoaXMudmFsdWVXaGlsZUFuaW1hdGluZykge1xuICAgICAgICAgIHZhciBjaGFuZ2VzID0gZGlmZi5hcnJheXModGhpcy52YWx1ZVdoaWxlQW5pbWF0aW5nLCBhbmltYXRpbmdWYWx1ZSk7XG4gICAgICAgICAgdGhpcy51cGRhdGVDaGFuZ2VzQW5pbWF0ZWQodGhpcy52YWx1ZVdoaWxlQW5pbWF0aW5nLCBjaGFuZ2VzKTtcbiAgICAgICAgICB0aGlzLnZhbHVlV2hpbGVBbmltYXRpbmcgPSBudWxsO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB3aGVuRG9uZS5jb3VudCA9IDA7XG5cbiAgICAgIGNoYW5nZXMuZm9yRWFjaChmdW5jdGlvbihzcGxpY2UpIHtcbiAgICAgICAgdmFyIGFkZGVkVmlld3MgPSBbXTtcbiAgICAgICAgdmFyIGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgICAgICB2YXIgaW5kZXggPSBzcGxpY2UuaW5kZXg7XG4gICAgICAgIHZhciBlbmRJbmRleCA9IGluZGV4ICsgc3BsaWNlLmFkZGVkQ291bnQ7XG4gICAgICAgIHZhciByZW1vdmVkQ291bnQgPSBzcGxpY2UucmVtb3ZlZC5sZW5ndGg7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IGluZGV4OyBpIDwgZW5kSW5kZXg7IGkrKykge1xuICAgICAgICAgIHZhciBpdGVtID0gdmFsdWVbaV07XG4gICAgICAgICAgdmFyIHZpZXcgPSB0aGlzLmNyZWF0ZVZpZXcoaSwgaXRlbSk7XG4gICAgICAgICAgYWRkZWRWaWV3cy5wdXNoKHZpZXcpO1xuICAgICAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKHZpZXcpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHJlbW92ZWRWaWV3cyA9IHRoaXMudmlld3Muc3BsaWNlLmFwcGx5KHRoaXMudmlld3MsIFsgaW5kZXgsIHJlbW92ZWRDb3VudCBdLmNvbmNhdChhZGRlZFZpZXdzKSk7XG4gICAgICAgIHZhciBwcmV2aW91c1ZpZXcgPSB0aGlzLnZpZXdzW2luZGV4IC0gMV07XG4gICAgICAgIHZhciBuZXh0U2libGluZyA9IHByZXZpb3VzVmlldyA/IHByZXZpb3VzVmlldy5sYXN0Vmlld05vZGUubmV4dFNpYmxpbmcgOiB0aGlzLmVsZW1lbnQubmV4dFNpYmxpbmc7XG4gICAgICAgIHRoaXMuZWxlbWVudC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShmcmFnbWVudCwgbmV4dFNpYmxpbmcpO1xuXG4gICAgICAgIGFsbEFkZGVkID0gYWxsQWRkZWQuY29uY2F0KGFkZGVkVmlld3MpO1xuICAgICAgICBhbGxSZW1vdmVkID0gYWxsUmVtb3ZlZC5jb25jYXQocmVtb3ZlZFZpZXdzKTtcbiAgICAgIH0sIHRoaXMpO1xuXG5cbiAgICAgIGFsbEFkZGVkLmZvckVhY2goZnVuY3Rpb24odmlldykge1xuICAgICAgICB3aGVuRG9uZS5jb3VudCsrO1xuICAgICAgICB0aGlzLmFuaW1hdGVJbih2aWV3LCB3aGVuRG9uZSk7XG4gICAgICB9LCB0aGlzKTtcblxuICAgICAgYWxsUmVtb3ZlZC5mb3JFYWNoKGZ1bmN0aW9uKHZpZXcpIHtcbiAgICAgICAgd2hlbkRvbmUuY291bnQrKztcbiAgICAgICAgdmlldy51bmJpbmQoKTtcbiAgICAgICAgdGhpcy5hbmltYXRlT3V0KHZpZXcsIHdoZW5Eb25lKTtcbiAgICAgIH0sIHRoaXMpO1xuICAgIH0sXG5cbiAgICB1bmJvdW5kOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMudmlld3MuZm9yRWFjaChmdW5jdGlvbih2aWV3KSB7XG4gICAgICAgIHZpZXcudW5iaW5kKCk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMudmFsdWVXaGlsZUFuaW1hdGluZyA9IG51bGw7XG4gICAgICB0aGlzLmFuaW1hdGluZyA9IGZhbHNlO1xuICAgIH1cbiAgfSk7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlZ2lzdGVyRGVmYXVsdHM7XG5cblxuLyoqXG4gKiAjIERlZmF1bHQgRm9ybWF0dGVyc1xuICogUmVnaXN0ZXJzIGRlZmF1bHQgZm9ybWF0dGVycyB3aXRoIGEgZnJhZ21lbnRzIG9iamVjdC5cbiAqL1xuZnVuY3Rpb24gcmVnaXN0ZXJEZWZhdWx0cyhmcmFnbWVudHMpIHtcblxuICAvKipcbiAgICpcbiAgICovXG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcigndG9rZW5MaXN0JywgZnVuY3Rpb24odmFsdWUpIHtcblxuICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgcmV0dXJuIHZhbHVlLmpvaW4oJyAnKTtcbiAgICB9XG5cbiAgICBpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgdmFyIGNsYXNzZXMgPSBbXTtcbiAgICAgIE9iamVjdC5rZXlzKHZhbHVlKS5mb3JFYWNoKGZ1bmN0aW9uKGNsYXNzTmFtZSkge1xuICAgICAgICBpZiAodmFsdWVbY2xhc3NOYW1lXSkge1xuICAgICAgICAgIGNsYXNzZXMucHVzaChjbGFzc05hbWUpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBjbGFzc2VzLmpvaW4oJyAnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdmFsdWUgfHwgJyc7XG4gIH0pO1xuXG5cbiAgLyoqXG4gICAqIHYgVE9ETyB2XG4gICAqL1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ3N0eWxlcycsIGZ1bmN0aW9uKHZhbHVlKSB7XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiB2YWx1ZS5qb2luKCcgJyk7XG4gICAgfVxuXG4gICAgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHZhciBjbGFzc2VzID0gW107XG4gICAgICBPYmplY3Qua2V5cyh2YWx1ZSkuZm9yRWFjaChmdW5jdGlvbihjbGFzc05hbWUpIHtcbiAgICAgICAgaWYgKHZhbHVlW2NsYXNzTmFtZV0pIHtcbiAgICAgICAgICBjbGFzc2VzLnB1c2goY2xhc3NOYW1lKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gY2xhc3Nlcy5qb2luKCcgJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbHVlIHx8ICcnO1xuICB9KTtcblxuXG4gIC8qKlxuICAgKiAjIyBmaWx0ZXJcbiAgICogRmlsdGVycyBhbiBhcnJheSBieSB0aGUgZ2l2ZW4gZmlsdGVyIGZ1bmN0aW9uKHMpLCBtYXkgcHJvdmlkZSBhIGZ1bmN0aW9uLCBhblxuICAgKiBhcnJheSwgb3IgYW4gb2JqZWN0IHdpdGggZmlsdGVyaW5nIGZ1bmN0aW9uc1xuICAgKi9cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCdmaWx0ZXInLCBmdW5jdGlvbih2YWx1ZSwgZmlsdGVyRnVuYykge1xuICAgIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9IGVsc2UgaWYgKCFmaWx0ZXJGdW5jKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBmaWx0ZXJGdW5jID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB2YWx1ZSA9IHZhbHVlLmZpbHRlcihmaWx0ZXJGdW5jLCB0aGlzKTtcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoZmlsdGVyRnVuYykpIHtcbiAgICAgIGZpbHRlckZ1bmMuZm9yRWFjaChmdW5jdGlvbihmdW5jKSB7XG4gICAgICAgIHZhbHVlID0gdmFsdWUuZmlsdGVyKGZ1bmMsIHRoaXMpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZmlsdGVyRnVuYyA9PT0gJ29iamVjdCcpIHtcbiAgICAgIE9iamVjdC5rZXlzKGZpbHRlckZ1bmMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhciBmdW5jID0gZmlsdGVyRnVuY1trZXldO1xuICAgICAgICBpZiAodHlwZW9mIGZ1bmMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICB2YWx1ZSA9IHZhbHVlLmZpbHRlcihmdW5jLCB0aGlzKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZTtcbiAgfSk7XG5cblxuICAvKipcbiAgICogIyMgbWFwXG4gICAqIEFkZHMgYSBmb3JtYXR0ZXIgdG8gbWFwIGFuIGFycmF5IG9yIHZhbHVlIGJ5IHRoZSBnaXZlbiBtYXBwaW5nIGZ1bmN0aW9uXG4gICAqL1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ21hcCcsIGZ1bmN0aW9uKHZhbHVlLCBtYXBGdW5jKSB7XG4gICAgaWYgKHZhbHVlID09IG51bGwgfHwgdHlwZW9mIG1hcEZ1bmMgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICByZXR1cm4gdmFsdWUubWFwKG1hcEZ1bmMsIHRoaXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbWFwRnVuYy5jYWxsKHRoaXMsIHZhbHVlKTtcbiAgICB9XG4gIH0pO1xuXG5cbiAgLyoqXG4gICAqICMjIHJlZHVjZVxuICAgKiBBZGRzIGEgZm9ybWF0dGVyIHRvIHJlZHVjZSBhbiBhcnJheSBvciB2YWx1ZSBieSB0aGUgZ2l2ZW4gcmVkdWNlIGZ1bmN0aW9uXG4gICAqL1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ3JlZHVjZScsIGZ1bmN0aW9uKHZhbHVlLCByZWR1Y2VGdW5jLCBpbml0aWFsVmFsdWUpIHtcbiAgICBpZiAodmFsdWUgPT0gbnVsbCB8fCB0eXBlb2YgbWFwRnVuYyAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAzKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5yZWR1Y2UocmVkdWNlRnVuYywgaW5pdGlhbFZhbHVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5yZWR1Y2UocmVkdWNlRnVuYyk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAzKSB7XG4gICAgICByZXR1cm4gcmVkdWNlRnVuYyhpbml0aWFsVmFsdWUsIHZhbHVlKTtcbiAgICB9XG4gIH0pO1xuXG5cbiAgLyoqXG4gICAqICMjIHJlZHVjZVxuICAgKiBBZGRzIGEgZm9ybWF0dGVyIHRvIHJlZHVjZSBhbiBhcnJheSBvciB2YWx1ZSBieSB0aGUgZ2l2ZW4gcmVkdWNlIGZ1bmN0aW9uXG4gICAqL1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ3NsaWNlJywgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBlbmRJbmRleCkge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgcmV0dXJuIHZhbHVlLnNsaWNlKGluZGV4LCBlbmRJbmRleCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gIH0pO1xuXG5cbiAgLyoqXG4gICAqICMjIGRhdGVcbiAgICogQWRkcyBhIGZvcm1hdHRlciB0byBmb3JtYXQgZGF0ZXMgYW5kIHN0cmluZ3NcbiAgICovXG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcignZGF0ZScsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgaWYgKCF2YWx1ZSkge1xuICAgICAgcmV0dXJuICcnO1xuICAgIH1cblxuICAgIGlmICghKHZhbHVlIGluc3RhbmNlb2YgRGF0ZSkpIHtcbiAgICAgIHZhbHVlID0gbmV3IERhdGUodmFsdWUpO1xuICAgIH1cblxuICAgIGlmIChpc05hTih2YWx1ZS5nZXRUaW1lKCkpKSB7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbHVlLnRvTG9jYWxlU3RyaW5nKCk7XG4gIH0pO1xuXG5cbiAgLyoqXG4gICAqICMjIGxvZ1xuICAgKiBBZGRzIGEgZm9ybWF0dGVyIHRvIGxvZyB0aGUgdmFsdWUgb2YgdGhlIGV4cHJlc3Npb24sIHVzZWZ1bCBmb3IgZGVidWdnaW5nXG4gICAqL1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ2xvZycsIGZ1bmN0aW9uKHZhbHVlLCBwcmVmaXgpIHtcbiAgICBpZiAocHJlZml4ID09IG51bGwpIHByZWZpeCA9ICdMb2c6JztcbiAgICBjb25zb2xlLmxvZyhwcmVmaXgsIHZhbHVlKTtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH0pO1xuXG5cbiAgLyoqXG4gICAqICMjIGxpbWl0XG4gICAqIEFkZHMgYSBmb3JtYXR0ZXIgdG8gbGltaXQgdGhlIGxlbmd0aCBvZiBhbiBhcnJheSBvciBzdHJpbmdcbiAgICovXG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcignbGltaXQnLCBmdW5jdGlvbih2YWx1ZSwgbGltaXQpIHtcbiAgICBpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlLnNsaWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBpZiAobGltaXQgPCAwKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5zbGljZShsaW1pdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YWx1ZS5zbGljZSgwLCBsaW1pdCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gIH0pO1xuXG5cbiAgLyoqXG4gICAqICMjIHNvcnRcbiAgICogU29ydHMgYW4gYXJyYXkgZ2l2ZW4gYSBmaWVsZCBuYW1lIG9yIHNvcnQgZnVuY3Rpb24sIGFuZCBhIGRpcmVjdGlvblxuICAgKi9cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCdzb3J0JywgZnVuY3Rpb24odmFsdWUsIHNvcnRGdW5jLCBkaXIpIHtcbiAgICBpZiAoIXNvcnRGdW5jIHx8ICFBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICBkaXIgPSAoZGlyID09PSAnZGVzYycpID8gLTEgOiAxO1xuICAgIGlmICh0eXBlb2Ygc29ydEZ1bmMgPT09ICdzdHJpbmcnKSB7XG4gICAgICB2YXIgcGFydHMgPSBzb3J0RnVuYy5zcGxpdCgnOicpO1xuICAgICAgdmFyIHByb3AgPSBwYXJ0c1swXTtcbiAgICAgIHZhciBkaXIyID0gcGFydHNbMV07XG4gICAgICBkaXIyID0gKGRpcjIgPT09ICdkZXNjJykgPyAtMSA6IDE7XG4gICAgICBkaXIgPSBkaXIgfHwgZGlyMjtcbiAgICAgIHZhciBzb3J0RnVuYyA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgaWYgKGFbcHJvcF0gPiBiW3Byb3BdKSByZXR1cm4gZGlyO1xuICAgICAgICBpZiAoYVtwcm9wXSA8IGJbcHJvcF0pIHJldHVybiAtZGlyO1xuICAgICAgICByZXR1cm4gMDtcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChkaXIgPT09IC0xKSB7XG4gICAgICB2YXIgb3JpZ0Z1bmMgPSBzb3J0RnVuYztcbiAgICAgIHNvcnRGdW5jID0gZnVuY3Rpb24oYSwgYikgeyByZXR1cm4gLW9yaWdGdW5jKGEsIGIpOyB9O1xuICAgIH1cblxuICAgIHJldHVybiB2YWx1ZS5zbGljZSgpLnNvcnQoc29ydEZ1bmMpO1xuICB9KTtcblxuXG4gIC8qKlxuICAgKiAjIyBhZGRRdWVyeVxuICAgKiBUYWtlcyB0aGUgaW5wdXQgVVJMIGFuZCBhZGRzIChvciByZXBsYWNlcykgdGhlIGZpZWxkIGluIHRoZSBxdWVyeVxuICAgKi9cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCdhZGRRdWVyeScsIGZ1bmN0aW9uKHZhbHVlLCBxdWVyeUZpZWxkLCBxdWVyeVZhbHVlKSB7XG4gICAgdmFyIHVybCA9IHZhbHVlIHx8IGxvY2F0aW9uLmhyZWY7XG4gICAgdmFyIHBhcnRzID0gdXJsLnNwbGl0KCc/Jyk7XG4gICAgdXJsID0gcGFydHNbMF07XG4gICAgdmFyIHF1ZXJ5ID0gcGFydHNbMV07XG4gICAgdmFyIGFkZGVkUXVlcnkgPSAnJztcbiAgICBpZiAocXVlcnlWYWx1ZSAhPSBudWxsKSB7XG4gICAgICBhZGRlZFF1ZXJ5ID0gcXVlcnlGaWVsZCArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudChxdWVyeVZhbHVlKTtcbiAgICB9XG5cbiAgICBpZiAocXVlcnkpIHtcbiAgICAgIHZhciBleHByID0gbmV3IFJlZ0V4cCgnXFxcXGInICsgcXVlcnlGaWVsZCArICc9W14mXSonKTtcbiAgICAgIGlmIChleHByLnRlc3QocXVlcnkpKSB7XG4gICAgICAgIHF1ZXJ5ID0gcXVlcnkucmVwbGFjZShleHByLCBhZGRlZFF1ZXJ5KTtcbiAgICAgIH0gZWxzZSBpZiAoYWRkZWRRdWVyeSkge1xuICAgICAgICBxdWVyeSArPSAnJicgKyBhZGRlZFF1ZXJ5O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBxdWVyeSA9IGFkZGVkUXVlcnk7XG4gICAgfVxuICAgIGlmIChxdWVyeSkge1xuICAgICAgdXJsICs9ICc/JyArIHF1ZXJ5O1xuICAgIH1cbiAgICByZXR1cm4gdXJsO1xuICB9KTtcblxuXG4gIHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICBmdW5jdGlvbiBlc2NhcGVIVE1MKHZhbHVlLCBzZXR0ZXIpIHtcbiAgICBpZiAoc2V0dGVyKSB7XG4gICAgICBkaXYuaW5uZXJIVE1MID0gdmFsdWU7XG4gICAgICByZXR1cm4gZGl2LnRleHRDb250ZW50O1xuICAgIH0gZWxzZSB7XG4gICAgICBkaXYudGV4dENvbnRlbnQgPSB2YWx1ZSB8fCAnJztcbiAgICAgIHJldHVybiBkaXYuaW5uZXJIVE1MO1xuICAgIH1cbiAgfVxuXG5cbiAgLyoqXG4gICAqICMjIGVzY2FwZVxuICAgKiBIVE1MIGVzY2FwZXMgY29udGVudC4gRm9yIHVzZSB3aXRoIG90aGVyIEhUTUwtYWRkaW5nIGZvcm1hdHRlcnMgc3VjaCBhcyBhdXRvbGluay5cbiAgICpcbiAgICogKipFeGFtcGxlOioqXG4gICAqIGBgYHhtbFxuICAgKiA8ZGl2IGJpbmQtaHRtbD1cInR3ZWV0LmNvbnRlbnQgfCBlc2NhcGUgfCBhdXRvbGluazp0cnVlXCI+PC9kaXY+XG4gICAqIGBgYFxuICAgKiAqUmVzdWx0OipcbiAgICogYGBgeG1sXG4gICAqIDxkaXY+Q2hlY2sgb3V0IDxhIGhyZWY9XCJodHRwczovL2dpdGh1Yi5jb20vY2hpcC1qcy9cIiB0YXJnZXQ9XCJfYmxhbmtcIj5odHRwczovL2dpdGh1Yi5jb20vY2hpcC1qcy88L2E+ITwvZGl2PlxuICAgKiBgYGBcbiAgICovXG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcignZXNjYXBlJywgZXNjYXBlSFRNTCk7XG5cblxuICAvKipcbiAgICogIyMgcFxuICAgKiBIVE1MIGVzY2FwZXMgY29udGVudCB3cmFwcGluZyBwYXJhZ3JhcGhzIGluIDxwPiB0YWdzLlxuICAgKlxuICAgKiAqKkV4YW1wbGU6KipcbiAgICogYGBgeG1sXG4gICAqIDxkaXYgYmluZC1odG1sPVwidHdlZXQuY29udGVudCB8IHAgfCBhdXRvbGluazp0cnVlXCI+PC9kaXY+XG4gICAqIGBgYFxuICAgKiAqUmVzdWx0OipcbiAgICogYGBgeG1sXG4gICAqIDxkaXY+PHA+Q2hlY2sgb3V0IDxhIGhyZWY9XCJodHRwczovL2dpdGh1Yi5jb20vY2hpcC1qcy9cIiB0YXJnZXQ9XCJfYmxhbmtcIj5odHRwczovL2dpdGh1Yi5jb20vY2hpcC1qcy88L2E+ITwvcD5cbiAgICogPHA+SXQncyBncmVhdDwvcD48L2Rpdj5cbiAgICogYGBgXG4gICAqL1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ3AnLCBmdW5jdGlvbih2YWx1ZSwgc2V0dGVyKSB7XG4gICAgaWYgKHNldHRlcikge1xuICAgICAgcmV0dXJuIGVzY2FwZUhUTUwodmFsdWUsIHNldHRlcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBsaW5lcyA9ICh2YWx1ZSB8fCAnJykuc3BsaXQoL1xccj9cXG4vKTtcbiAgICAgIHZhciBlc2NhcGVkID0gbGluZXMubWFwKGZ1bmN0aW9uKGxpbmUpIHsgcmV0dXJuIGVzY2FwZUhUTUwobGluZSkgfHwgJzxicj4nOyB9KTtcbiAgICAgIHJldHVybiAnPHA+JyArIGVzY2FwZWQuam9pbignPC9wPlxcbjxwPicpICsgJzwvcD4nO1xuICAgIH1cbiAgfSk7XG5cblxuICAvKipcbiAgICogIyMgYnJcbiAgICogSFRNTCBlc2NhcGVzIGNvbnRlbnQgYWRkaW5nIDxicj4gdGFncyBpbiBwbGFjZSBvZiBuZXdsaW5lcyBjaGFyYWN0ZXJzLlxuICAgKlxuICAgKiAqKkV4YW1wbGU6KipcbiAgICogYGBgeG1sXG4gICAqIDxkaXYgYmluZC1odG1sPVwidHdlZXQuY29udGVudCB8IGJyIHwgYXV0b2xpbms6dHJ1ZVwiPjwvZGl2PlxuICAgKiBgYGBcbiAgICogKlJlc3VsdDoqXG4gICAqIGBgYHhtbFxuICAgKiA8ZGl2PkNoZWNrIG91dCA8YSBocmVmPVwiaHR0cHM6Ly9naXRodWIuY29tL2NoaXAtanMvXCIgdGFyZ2V0PVwiX2JsYW5rXCI+aHR0cHM6Ly9naXRodWIuY29tL2NoaXAtanMvPC9hPiE8YnI+XG4gICAqIEl0J3MgZ3JlYXQ8L2Rpdj5cbiAgICogYGBgXG4gICAqL1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ2JyJywgZnVuY3Rpb24odmFsdWUsIHNldHRlcikge1xuICAgIGlmIChzZXR0ZXIpIHtcbiAgICAgIHJldHVybiBlc2NhcGVIVE1MKHZhbHVlLCBzZXR0ZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgbGluZXMgPSAodmFsdWUgfHwgJycpLnNwbGl0KC9cXHI/XFxuLyk7XG4gICAgICByZXR1cm4gbGluZXMubWFwKGVzY2FwZUhUTUwpLmpvaW4oJzxicj5cXG4nKTtcbiAgICB9XG4gIH0pO1xuXG5cbiAgLyoqXG4gICAqICMjIG5ld2xpbmVcbiAgICogSFRNTCBlc2NhcGVzIGNvbnRlbnQgYWRkaW5nIDxwPiB0YWdzIGF0IGRvdWJsZSBuZXdsaW5lcyBhbmQgPGJyPiB0YWdzIGluIHBsYWNlIG9mIHNpbmdsZSBuZXdsaW5lIGNoYXJhY3RlcnMuXG4gICAqXG4gICAqICoqRXhhbXBsZToqKlxuICAgKiBgYGB4bWxcbiAgICogPGRpdiBiaW5kLWh0bWw9XCJ0d2VldC5jb250ZW50IHwgbmV3bGluZSB8IGF1dG9saW5rOnRydWVcIj48L2Rpdj5cbiAgICogYGBgXG4gICAqICpSZXN1bHQ6KlxuICAgKiBgYGB4bWxcbiAgICogPGRpdj48cD5DaGVjayBvdXQgPGEgaHJlZj1cImh0dHBzOi8vZ2l0aHViLmNvbS9jaGlwLWpzL1wiIHRhcmdldD1cIl9ibGFua1wiPmh0dHBzOi8vZ2l0aHViLmNvbS9jaGlwLWpzLzwvYT4hPGJyPlxuICAgKiBJdCdzIGdyZWF0PC9wPjwvZGl2PlxuICAgKiBgYGBcbiAgICovXG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcignbmV3bGluZScsIGZ1bmN0aW9uKHZhbHVlLCBzZXR0ZXIpIHtcbiAgICBpZiAoc2V0dGVyKSB7XG4gICAgICByZXR1cm4gZXNjYXBlSFRNTCh2YWx1ZSwgc2V0dGVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHBhcmFncmFwaHMgPSAodmFsdWUgfHwgJycpLnNwbGl0KC9cXHI/XFxuXFxzKlxccj9cXG4vKTtcbiAgICAgIHZhciBlc2NhcGVkID0gcGFyYWdyYXBocy5tYXAoZnVuY3Rpb24ocGFyYWdyYXBoKSB7XG4gICAgICAgIHZhciBsaW5lcyA9IHBhcmFncmFwaC5zcGxpdCgvXFxyP1xcbi8pO1xuICAgICAgICByZXR1cm4gbGluZXMubWFwKGVzY2FwZUhUTUwpLmpvaW4oJzxicj5cXG4nKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuICc8cD4nICsgZXNjYXBlZC5qb2luKCc8L3A+XFxuXFxuPHA+JykgKyAnPC9wPic7XG4gICAgfVxuICB9KTtcblxuXG5cbiAgdmFyIHVybEV4cCA9IC8oXnxcXHN8XFwoKSgoPzpodHRwcz98ZnRwKTpcXC9cXC9bXFwtQS1aMC05K1xcdTAwMjZAI1xcLyU/PSgpfl98ITosLjtdKltcXC1BLVowLTkrXFx1MDAyNkAjXFwvJT1+KF98XSkvZ2k7XG4gIC8qKlxuICAgKiAjIyBhdXRvbGlua1xuICAgKiBBZGRzIGF1dG9tYXRpYyBsaW5rcyB0byBlc2NhcGVkIGNvbnRlbnQgKGJlIHN1cmUgdG8gZXNjYXBlIHVzZXIgY29udGVudCkuIENhbiBiZSB1c2VkIG9uIGV4aXN0aW5nIEhUTUwgY29udGVudCBhcyBpdFxuICAgKiB3aWxsIHNraXAgVVJMcyB3aXRoaW4gSFRNTCB0YWdzLiBQYXNzaW5nIHRydWUgaW4gdGhlIHNlY29uZCBwYXJhbWV0ZXIgd2lsbCBzZXQgdGhlIHRhcmdldCB0byBgX2JsYW5rYC5cbiAgICpcbiAgICogKipFeGFtcGxlOioqXG4gICAqIGBgYHhtbFxuICAgKiA8ZGl2IGJpbmQtaHRtbD1cInR3ZWV0LmNvbnRlbnQgfCBlc2NhcGUgfCBhdXRvbGluazp0cnVlXCI+PC9kaXY+XG4gICAqIGBgYFxuICAgKiAqUmVzdWx0OipcbiAgICogYGBgeG1sXG4gICAqIDxkaXY+Q2hlY2sgb3V0IDxhIGhyZWY9XCJodHRwczovL2dpdGh1Yi5jb20vY2hpcC1qcy9cIiB0YXJnZXQ9XCJfYmxhbmtcIj5odHRwczovL2dpdGh1Yi5jb20vY2hpcC1qcy88L2E+ITwvZGl2PlxuICAgKiBgYGBcbiAgICovXG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcignYXV0b2xpbmsnLCBmdW5jdGlvbih2YWx1ZSwgdGFyZ2V0KSB7XG4gICAgdGFyZ2V0ID0gKHRhcmdldCkgPyAnIHRhcmdldD1cIl9ibGFua1wiJyA6ICcnO1xuXG4gICAgcmV0dXJuICgnJyArIHZhbHVlKS5yZXBsYWNlKC88W14+XSs+fFtePF0rL2csIGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgICBpZiAobWF0Y2guY2hhckF0KDApID09PSAnPCcpIHtcbiAgICAgICAgcmV0dXJuIG1hdGNoO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG1hdGNoLnJlcGxhY2UodXJsRXhwLCAnJDE8YSBocmVmPVwiJDJcIicgKyB0YXJnZXQgKyAnPiQyPC9hPicpO1xuICAgIH0pO1xuICB9KTtcblxuXG4gIC8qKlxuICAgKlxuICAgKi9cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCdpbnQnLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHZhbHVlID0gcGFyc2VJbnQodmFsdWUpO1xuICAgIHJldHVybiBpc05hTih2YWx1ZSkgPyBudWxsIDogdmFsdWU7XG4gIH0pO1xuXG5cbiAgLyoqXG4gICAqXG4gICAqL1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ2Zsb2F0JywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICB2YWx1ZSA9IHBhcnNlRmxvYXQodmFsdWUpO1xuICAgIHJldHVybiBpc05hTih2YWx1ZSkgPyBudWxsIDogdmFsdWU7XG4gIH0pO1xuXG5cbiAgLyoqXG4gICAqXG4gICAqL1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ2Jvb2wnLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZSAmJiB2YWx1ZSAhPT0gJzAnICYmIHZhbHVlICE9PSAnZmFsc2UnO1xuICB9KTtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gVGVtcGxhdGU7XG52YXIgVmlldyA9IHJlcXVpcmUoJy4vdmlldycpO1xudmFyIGV4dGVuZCA9IHJlcXVpcmUoJy4vdXRpbC9leHRlbmQnKTtcblxuXG4vKipcbiAqICMjIFRlbXBsYXRlXG4gKiBUYWtlcyBhbiBIVE1MIHN0cmluZywgYW4gZWxlbWVudCwgYW4gYXJyYXkgb2YgZWxlbWVudHMsIG9yIGEgZG9jdW1lbnQgZnJhZ21lbnQsIGFuZCBjb21waWxlcyBpdCBpbnRvIGEgdGVtcGxhdGUuXG4gKiBJbnN0YW5jZXMgbWF5IHRoZW4gYmUgY3JlYXRlZCBhbmQgYm91bmQgdG8gYSBnaXZlbiBjb250ZXh0LlxuICogQHBhcmFtIHtTdHJpbmd8Tm9kZUxpc3R8SFRNTENvbGxlY3Rpb258SFRNTFRlbXBsYXRlRWxlbWVudHxIVE1MU2NyaXB0RWxlbWVudHxOb2RlfSBodG1sIEEgVGVtcGxhdGUgY2FuIGJlIGNyZWF0ZWRcbiAqIGZyb20gbWFueSBkaWZmZXJlbnQgdHlwZXMgb2Ygb2JqZWN0cy4gQW55IG9mIHRoZXNlIHdpbGwgYmUgY29udmVydGVkIGludG8gYSBkb2N1bWVudCBmcmFnbWVudCBmb3IgdGhlIHRlbXBsYXRlIHRvXG4gKiBjbG9uZS4gTm9kZXMgYW5kIGVsZW1lbnRzIHBhc3NlZCBpbiB3aWxsIGJlIHJlbW92ZWQgZnJvbSB0aGUgRE9NLlxuICovXG5mdW5jdGlvbiBUZW1wbGF0ZSgpIHtcbiAgdGhpcy5wb29sID0gW107XG59XG5cblxuVGVtcGxhdGUucHJvdG90eXBlID0ge1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IHZpZXcgY2xvbmVkIGZyb20gdGhpcyB0ZW1wbGF0ZS5cbiAgICovXG4gIGNyZWF0ZVZpZXc6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLnBvb2wubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gdGhpcy5wb29sLnBvcCgpO1xuICAgIH1cblxuICAgIHJldHVybiBleHRlbmQubWFrZShWaWV3LCBkb2N1bWVudC5pbXBvcnROb2RlKHRoaXMsIHRydWUpLCB0aGlzKTtcbiAgfSxcblxuICByZXR1cm5WaWV3OiBmdW5jdGlvbih2aWV3KSB7XG4gICAgaWYgKHRoaXMucG9vbC5pbmRleE9mKHZpZXcpID09PSAtMSkge1xuICAgICAgdGhpcy5wb29sLnB1c2godmlldyk7XG4gICAgfVxuICB9XG59O1xuIiwiLy8gSGVscGVyIG1ldGhvZHMgZm9yIGFuaW1hdGlvblxuZXhwb3J0cy5tYWtlRWxlbWVudEFuaW1hdGFibGUgPSBtYWtlRWxlbWVudEFuaW1hdGFibGU7XG5leHBvcnRzLmdldENvbXB1dGVkQ1NTID0gZ2V0Q29tcHV0ZWRDU1M7XG5leHBvcnRzLmFuaW1hdGVFbGVtZW50ID0gYW5pbWF0ZUVsZW1lbnQ7XG5cbmZ1bmN0aW9uIG1ha2VFbGVtZW50QW5pbWF0YWJsZShlbGVtZW50KSB7XG4gIC8vIEFkZCBwb2x5ZmlsbCBqdXN0IG9uIHRoaXMgZWxlbWVudFxuICBpZiAoIWVsZW1lbnQuYW5pbWF0ZSkge1xuICAgIGVsZW1lbnQuYW5pbWF0ZSA9IGFuaW1hdGVFbGVtZW50O1xuICB9XG5cbiAgLy8gTm90IGEgcG9seWZpbGwgYnV0IGEgaGVscGVyXG4gIGlmICghZWxlbWVudC5nZXRDb21wdXRlZENTUykge1xuICAgIGVsZW1lbnQuZ2V0Q29tcHV0ZWRDU1MgPSBnZXRDb21wdXRlZENTUztcbiAgfVxuXG4gIHJldHVybiBlbGVtZW50O1xufVxuXG4vKipcbiAqIEdldCB0aGUgY29tcHV0ZWQgc3R5bGUgb24gYW4gZWxlbWVudC5cbiAqL1xuZnVuY3Rpb24gZ2V0Q29tcHV0ZWRDU1Moc3R5bGVOYW1lKSB7XG4gIGlmICh0aGlzLm93bmVyRG9jdW1lbnQuZGVmYXVsdFZpZXcub3BlbmVyKSB7XG4gICAgcmV0dXJuIHRoaXMub3duZXJEb2N1bWVudC5kZWZhdWx0Vmlldy5nZXRDb21wdXRlZFN0eWxlKHRoaXMpW3N0eWxlTmFtZV07XG4gIH1cbiAgcmV0dXJuIHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHRoaXMpW3N0eWxlTmFtZV07XG59XG5cbi8qKlxuICogVmVyeSBiYXNpYyBwb2x5ZmlsbCBmb3IgRWxlbWVudC5hbmltYXRlIGlmIGl0IGRvZXNuJ3QgZXhpc3QuIElmIGl0IGRvZXMsIHVzZSB0aGUgbmF0aXZlLlxuICogVGhpcyBvbmx5IHN1cHBvcnRzIHR3byBjc3Mgc3RhdGVzLiBJdCB3aWxsIG92ZXJ3cml0ZSBleGlzdGluZyBzdHlsZXMuIEl0IGRvZXNuJ3QgcmV0dXJuIGFuIGFuaW1hdGlvbiBwbGF5IGNvbnRyb2wuIEl0XG4gKiBvbmx5IHN1cHBvcnRzIGR1cmF0aW9uLCBkZWxheSwgYW5kIGVhc2luZy4gUmV0dXJucyBhbiBvYmplY3Qgd2l0aCBhIHByb3BlcnR5IG9uZmluaXNoLlxuICovXG5mdW5jdGlvbiBhbmltYXRlRWxlbWVudChjc3MsIG9wdGlvbnMpIHtcbiAgaWYgKCFBcnJheS5pc0FycmF5KGNzcykgfHwgY3NzLmxlbmd0aCAhPT0gMikge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2FuaW1hdGUgcG9seWZpbGwgcmVxdWlyZXMgYW4gYXJyYXkgZm9yIGNzcyB3aXRoIGFuIGluaXRpYWwgYW5kIGZpbmFsIHN0YXRlJyk7XG4gIH1cblxuICBpZiAoIW9wdGlvbnMgfHwgIW9wdGlvbnMuaGFzT3duUHJvcGVydHkoJ2R1cmF0aW9uJykpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdhbmltYXRlIHBvbHlmaWxsIHJlcXVpcmVzIG9wdGlvbnMgd2l0aCBhIGR1cmF0aW9uJyk7XG4gIH1cblxuICB2YXIgZHVyYXRpb24gPSBvcHRpb25zLmR1cmF0aW9uIHx8IDA7XG4gIHZhciBkZWxheSA9IG9wdGlvbnMuZGVsYXkgfHwgMDtcbiAgdmFyIGVhc2luZyA9IG9wdGlvbnMuZWFzaW5nO1xuICB2YXIgaW5pdGlhbENzcyA9IGNzc1swXTtcbiAgdmFyIGZpbmFsQ3NzID0gY3NzWzFdO1xuICB2YXIgYWxsQ3NzID0ge307XG4gIHZhciBwbGF5YmFjayA9IHsgb25maW5pc2g6IG51bGwgfTtcblxuICBPYmplY3Qua2V5cyhpbml0aWFsQ3NzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIGFsbENzc1trZXldID0gdHJ1ZTtcbiAgICBlbGVtZW50LnN0eWxlW2tleV0gPSBpbml0aWFsQ3NzW2tleV07XG4gIH0pO1xuXG4gIC8vIHRyaWdnZXIgcmVmbG93XG4gIGVsZW1lbnQub2Zmc2V0V2lkdGg7XG5cbiAgdmFyIHRyYW5zaXRpb25PcHRpb25zID0gJyAnICsgZHVyYXRpb24gKyAnbXMnO1xuICBpZiAoZWFzaW5nKSB7XG4gICAgdHJhbnNpdGlvbk9wdGlvbnMgKz0gJyAnICsgZWFzaW5nO1xuICB9XG4gIGlmIChkZWxheSkge1xuICAgIHRyYW5zaXRpb25PcHRpb25zICs9ICcgJyArIGRlbGF5ICsgJ21zJztcbiAgfVxuXG4gIGVsZW1lbnQuc3R5bGUudHJhbnNpdGlvbiA9IE9iamVjdC5rZXlzKGZpbmFsQ3NzKS5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgcmV0dXJuIGtleSArIHRyYW5zaXRpb25PcHRpb25zXG4gIH0pLmpvaW4oJywgJyk7XG5cbiAgT2JqZWN0LmtleXMoZmluYWxDc3MpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgYWxsQ3NzW2tleV0gPSB0cnVlO1xuICAgIGVsZW1lbnQuc3R5bGVba2V5XSA9IGZpbmFsQ3NzW2tleV07XG4gIH0pO1xuXG4gIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgT2JqZWN0LmtleXMoYWxsQ3NzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgZWxlbWVudC5zdHlsZVtrZXldID0gJyc7XG4gICAgfSk7XG5cbiAgICBpZiAocGxheWJhY2sub25maW5pc2gpIHtcbiAgICAgIHBsYXliYWNrLm9uZmluaXNoKCk7XG4gICAgfVxuICB9LCBkdXJhdGlvbiArIGRlbGF5KTtcblxuICByZXR1cm4gcGxheWJhY2s7XG59XG4iLCJ2YXIgZ2xvYmFsID0gKGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcyB9KSgpO1xudmFyIHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xubW9kdWxlLmV4cG9ydHMgPSBleHRlbmQ7XG5leHRlbmQubWFrZSA9IG1ha2U7XG5cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IHByb3RvdHlwZSBmb3IgdGhlIGdpdmVuIGNvbnRydWN0b3IgYW5kIHNldHMgYW4gYGV4dGVuZGAgbWV0aG9kIG9uIGl0LiBJZiBgZXh0ZW5kYCBpcyBjYWxsZWQgZnJvbSBhXG4gKiBpdCB3aWxsIGV4dGVuZCB0aGF0IGNsYXNzLlxuICovXG5mdW5jdGlvbiBleHRlbmQoY29uc3RydWN0b3IsIHByb3RvdHlwZSkge1xuICB2YXIgc3VwZXJDbGFzcyA9IHRoaXMgPT09IGdsb2JhbCA/IE9iamVjdCA6IHRoaXM7XG4gIGlmICh0eXBlb2YgY29uc3RydWN0b3IgIT09ICdmdW5jdGlvbicgJiYgIXByb3RvdHlwZSkge1xuICAgIHByb3RvdHlwZSA9IGNvbnN0cnVjdG9yO1xuICAgIGNvbnN0cnVjdG9yID0gZnVuY3Rpb24oKSB7XG4gICAgICBzdXBlckNsYXNzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfVxuICBjb25zdHJ1Y3Rvci5leHRlbmQgPSBleHRlbmQ7XG4gIHZhciBkZXNjcmlwdG9ycyA9IGdldFByb3RvdHlwZURlc2NyaXB0b3JzKGNvbnN0cnVjdG9yLCBwcm90b3R5cGUpO1xuICBjb25zdHJ1Y3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ2xhc3MucHJvdG90eXBlLCBkZXNjcmlwdG9ycyk7XG4gIHJldHVybiBjb25zdHJ1Y3Rvcjtcbn1cblxuXG4vKipcbiAqIE1ha2VzIGEgbmF0aXZlIG9iamVjdCBwcmV0ZW5kIHRvIGJlIGEgY2xhc3MgKGUuZy4gYWRkcyBtZXRob2RzIHRvIGEgRG9jdW1lbnRGcmFnbWVudCBhbmQgY2FsbHMgdGhlIGNvbnN0cnVjdG9yKS5cbiAqL1xuZnVuY3Rpb24gbWFrZShjb25zdHJ1Y3Rvciwgb2JqZWN0KSB7XG4gIGlmICh0eXBlb2YgY29uc3RydWN0b3IgIT09ICdmdW5jdGlvbicgfHwgdHlwZW9mIG9iamVjdCAhPT0gJ29iamVjdCcpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdtYWtlIG11c3QgYWNjZXB0IGEgZnVuY3Rpb24gY29uc3RydWN0b3IgYW5kIGFuIG9iamVjdCcpO1xuICB9XG4gIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICB2YXIgcHJvdG8gPSBjb25zdHJ1Y3Rvci5wcm90b3R5cGU7XG4gIGZvciAodmFyIGtleSBpbiBwcm90bykge1xuICAgIG9iamVjdFtrZXldID0gcHJvdG9ba2V5XTtcbiAgfVxuICBjb25zdHJ1Y3Rvci5hcHBseShvYmplY3QsIGFyZ3MpO1xuICByZXR1cm4gb2JqZWN0O1xufVxuXG5cbmZ1bmN0aW9uIGdldFByb3RvdHlwZURlc2NyaXB0b3JzKGNvbnN0cnVjdG9yLCBwcm90b3R5cGUpIHtcbiAgdmFyIGRlc2NyaXB0b3JzID0ge1xuICAgIGNvbnN0cnVjdG9yOiB7IHdyaXRhYmxlOiB0cnVlLCBjb25maWd1cmFibGU6IHRydWUsIHZhbHVlOiBjb25zdHJ1Y3RvciB9XG4gIH07XG5cbiAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMocHJvdG90eXBlKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IocHJvdG90eXBlLCBuYW1lKTtcbiAgICBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBmYWxzZTtcbiAgICBkZXNjcmlwdG9yc1tuYW1lXSA9IGRlc2NyaXB0b3I7XG4gIH0pO1xuICByZXR1cm4gZGVzY3JpcHRvcnM7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHRvRnJhZ21lbnQ7XG5cbi8vIENvbnZlcnQgc3R1ZmYgaW50byBkb2N1bWVudCBmcmFnbWVudHMuIFN0dWZmIGNhbiBiZTpcbi8vICogQSBzdHJpbmcgb2YgSFRNTCB0ZXh0XG4vLyAqIEFuIGVsZW1lbnQgb3IgdGV4dCBub2RlXG4vLyAqIEEgTm9kZUxpc3Qgb3IgSFRNTENvbGxlY3Rpb24gKGUuZy4gYGVsZW1lbnQuY2hpbGROb2Rlc2Agb3IgYGVsZW1lbnQuY2hpbGRyZW5gKVxuLy8gKiBBIGpRdWVyeSBvYmplY3Rcbi8vICogQSBzY3JpcHQgZWxlbWVudCB3aXRoIGEgYHR5cGVgIGF0dHJpYnV0ZSBvZiBgXCJ0ZXh0LypcImAgKGUuZy4gYDxzY3JpcHQgdHlwZT1cInRleHQvaHRtbFwiPk15IHRlbXBsYXRlIGNvZGUhPC9zY3JpcHQ+YClcbi8vICogQSB0ZW1wbGF0ZSBlbGVtZW50IChlLmcuIGA8dGVtcGxhdGU+TXkgdGVtcGxhdGUgY29kZSE8L3RlbXBsYXRlPmApXG5mdW5jdGlvbiB0b0ZyYWdtZW50KGh0bWwpIHtcbiAgaWYgKGh0bWwgaW5zdGFuY2VvZiBEb2N1bWVudEZyYWdtZW50KSB7XG4gICAgcmV0dXJuIGh0bWw7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGh0bWwgPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIHN0cmluZ1RvRnJhZ21lbnQoaHRtbCk7XG4gIH0gZWxzZSBpZiAoaHRtbCBpbnN0YW5jZW9mIE5vZGUpIHtcbiAgICByZXR1cm4gbm9kZVRvRnJhZ21lbnQoaHRtbCk7XG4gIH0gZWxzZSBpZiAoJ2xlbmd0aCcgaW4gaHRtbCkge1xuICAgIHJldHVybiBsaXN0VG9GcmFnbWVudChodG1sKTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbnN1cHBvcnRlZCBUZW1wbGF0ZSBUeXBlOiBDYW5ub3QgY29udmVydCBgJyArIGh0bWwgKyAnYCBpbnRvIGEgZG9jdW1lbnQgZnJhZ21lbnQuJyk7XG4gIH1cbn1cblxuLy8gQ29udmVydHMgYW4gSFRNTCBub2RlIGludG8gYSBkb2N1bWVudCBmcmFnbWVudC4gSWYgaXQgaXMgYSA8dGVtcGxhdGU+IG5vZGUgaXRzIGNvbnRlbnRzIHdpbGwgYmUgdXNlZC4gSWYgaXQgaXMgYVxuLy8gPHNjcmlwdD4gbm9kZSBpdHMgc3RyaW5nLWJhc2VkIGNvbnRlbnRzIHdpbGwgYmUgY29udmVydGVkIHRvIEhUTUwgZmlyc3QsIHRoZW4gdXNlZC4gT3RoZXJ3aXNlIGEgY2xvbmUgb2YgdGhlIG5vZGVcbi8vIGl0c2VsZiB3aWxsIGJlIHVzZWQuXG5mdW5jdGlvbiBub2RlVG9GcmFnbWVudChub2RlKSB7XG4gIGlmIChub2RlLmNvbnRlbnQgaW5zdGFuY2VvZiBEb2N1bWVudEZyYWdtZW50KSB7XG4gICAgcmV0dXJuIG5vZGUuY29udGVudDtcbiAgfSBlbHNlIGlmIChub2RlLnRhZ05hbWUgPT09ICdTQ1JJUFQnKSB7XG4gICAgcmV0dXJuIHN0cmluZ1RvRnJhZ21lbnQobm9kZS5pbm5lckhUTUwpO1xuICB9IGVsc2Uge1xuICAgIHZhciBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICBpZiAobm9kZS50YWdOYW1lID09PSAnVEVNUExBVEUnKSB7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbCA9IG5vZGUuY2hpbGROb2Rlcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQobm9kZS5jaGlsZE5vZGVzW2ldKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQobm9kZSk7XG4gICAgfVxuICAgIHJldHVybiBmcmFnbWVudDtcbiAgfVxufVxuXG4vLyBDb252ZXJ0cyBhbiBIVE1MQ29sbGVjdGlvbiwgTm9kZUxpc3QsIGpRdWVyeSBvYmplY3QsIG9yIGFycmF5IGludG8gYSBkb2N1bWVudCBmcmFnbWVudC5cbmZ1bmN0aW9uIGxpc3RUb0ZyYWdtZW50KGxpc3QpIHtcbiAgdmFyIGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IGxpc3QubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgLy8gVXNlIHRvRnJhZ21lbnQgc2luY2UgdGhpcyBtYXkgYmUgYW4gYXJyYXkgb2YgdGV4dCwgYSBqUXVlcnkgb2JqZWN0IG9mIGA8dGVtcGxhdGU+YHMsIGV0Yy5cbiAgICBmcmFnbWVudC5hcHBlbmRDaGlsZCh0b0ZyYWdtZW50KGxpc3RbaV0pKTtcbiAgICBpZiAobCA9PT0gbGlzdC5sZW5ndGggKyAxKSB7XG4gICAgICAvLyBhZGp1c3QgZm9yIE5vZGVMaXN0cyB3aGljaCBhcmUgbGl2ZSwgdGhleSBzaHJpbmsgYXMgd2UgcHVsbCBub2RlcyBvdXQgb2YgdGhlIERPTVxuICAgICAgaS0tO1xuICAgICAgbC0tO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZnJhZ21lbnQ7XG59XG5cbi8vIENvbnZlcnRzIGEgc3RyaW5nIG9mIEhUTUwgdGV4dCBpbnRvIGEgZG9jdW1lbnQgZnJhZ21lbnQuXG5mdW5jdGlvbiBzdHJpbmdUb0ZyYWdtZW50KHN0cmluZykge1xuICB2YXIgdGVtcGxhdGVFbGVtZW50O1xuICB0ZW1wbGF0ZUVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZW1wbGF0ZScpO1xuICB0ZW1wbGF0ZUVsZW1lbnQuaW5uZXJIVE1MID0gc3RyaW5nO1xuICByZXR1cm4gdGVtcGxhdGVFbGVtZW50LmNvbnRlbnQ7XG59XG5cbi8vIElmIEhUTUwgVGVtcGxhdGVzIGFyZSBub3QgYXZhaWxhYmxlIChlLmcuIGluIElFKSB0aGVuIHVzZSBhbiBvbGRlciBtZXRob2QgdG8gd29yayB3aXRoIGNlcnRhaW4gZWxlbWVudHMuXG5pZiAoIWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RlbXBsYXRlJykuY29udGVudCBpbnN0YW5jZW9mIERvY3VtZW50RnJhZ21lbnQpIHtcbiAgc3RyaW5nVG9GcmFnbWVudCA9IChmdW5jdGlvbigpIHtcbiAgICB2YXIgdGFnRXhwID0gLzwoW1xcdzotXSspLztcblxuICAgIC8vIENvcGllZCBmcm9tIGpRdWVyeSAoaHR0cHM6Ly9naXRodWIuY29tL2pxdWVyeS9qcXVlcnkvYmxvYi9tYXN0ZXIvTElDRU5TRS50eHQpXG4gICAgdmFyIHdyYXBNYXAgPSB7XG4gICAgICBvcHRpb246IFsgMSwgJzxzZWxlY3QgbXVsdGlwbGU9XCJtdWx0aXBsZVwiPicsICc8L3NlbGVjdD4nIF0sXG4gICAgICBsZWdlbmQ6IFsgMSwgJzxmaWVsZHNldD4nLCAnPC9maWVsZHNldD4nIF0sXG4gICAgICB0aGVhZDogWyAxLCAnPHRhYmxlPicsICc8L3RhYmxlPicgXSxcbiAgICAgIHRyOiBbIDIsICc8dGFibGU+PHRib2R5PicsICc8L3Rib2R5PjwvdGFibGU+JyBdLFxuICAgICAgdGQ6IFsgMywgJzx0YWJsZT48dGJvZHk+PHRyPicsICc8L3RyPjwvdGJvZHk+PC90YWJsZT4nIF0sXG4gICAgICBjb2w6IFsgMiwgJzx0YWJsZT48dGJvZHk+PC90Ym9keT48Y29sZ3JvdXA+JywgJzwvY29sZ3JvdXA+PC90YWJsZT4nIF0sXG4gICAgICBhcmVhOiBbIDEsICc8bWFwPicsICc8L21hcD4nIF0sXG4gICAgICBfZGVmYXVsdDogWyAwLCAnJywgJycgXVxuICAgIH07XG4gICAgd3JhcE1hcC5vcHRncm91cCA9IHdyYXBNYXAub3B0aW9uO1xuICAgIHdyYXBNYXAudGJvZHkgPSB3cmFwTWFwLnRmb290ID0gd3JhcE1hcC5jb2xncm91cCA9IHdyYXBNYXAuY2FwdGlvbiA9IHdyYXBNYXAudGhlYWQ7XG4gICAgd3JhcE1hcC50aCA9IHdyYXBNYXAudGQ7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gc3RyaW5nVG9GcmFnbWVudChzdHJpbmcpIHtcbiAgICAgIHZhciB0YWcgPSBzdHJpbmcubWF0Y2godGFnRXhwKTtcbiAgICAgIHZhciBwYXJ0cyA9IHdyYXBNYXBbdGFnXSB8fCB3cmFwTWFwLl9kZWZhdWx0O1xuICAgICAgdmFyIGRlcHRoID0gcGFydHNbMF07XG4gICAgICB2YXIgcHJlZml4ID0gcGFydHNbMV07XG4gICAgICB2YXIgcG9zdGZpeCA9IHBhcnRzWzJdO1xuICAgICAgdmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgZGl2LmlubmVySFRNTCA9IHByZWZpeCArIHN0cmluZyArIHBvc3RmaXg7XG4gICAgICB3aGlsZSAoZGVwdGgtLSkge1xuICAgICAgICBkaXYgPSBkaXYubGFzdENoaWxkO1xuICAgICAgfVxuICAgICAgdmFyIGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgICAgd2hpbGUgKGRpdi5maXJzdENoaWxkKSB7XG4gICAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKGRpdi5maXJzdENoaWxkKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmcmFnbWVudDtcbiAgICB9O1xuICB9KSgpO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBWaWV3O1xuXG5cbi8qKlxuICogIyMgVmlld1xuICogQSBEb2N1bWVudEZyYWdtZW50IHdpdGggYmluZGluZ3MuXG4gKi9cbmZ1bmN0aW9uIFZpZXcodGVtcGxhdGUpIHtcbiAgdGhpcy50ZW1wbGF0ZSA9IHRlbXBsYXRlO1xuICB0aGlzLmJpbmRpbmdzID0gdGhpcy50ZW1wbGF0ZS5iaW5kaW5ncy5tYXAoZnVuY3Rpb24oYmluZGluZykge1xuICAgIHJldHVybiBiaW5kaW5nLmNsb25lRm9yVmlldyh0aGlzKTtcbiAgfSwgdGhpcyk7XG4gIHRoaXMuZmlyc3RWaWV3Tm9kZSA9IHRoaXMuZmlyc3RDaGlsZDtcbiAgdGhpcy5sYXN0Vmlld05vZGUgPSB0aGlzLmxhc3RDaGlsZDtcbiAgaWYgKHRoaXMuZmlyc3RWaWV3Tm9kZSkge1xuICAgIHRoaXMuZmlyc3RWaWV3Tm9kZS52aWV3ID0gdGhpcztcbiAgICB0aGlzLmxhc3RWaWV3Tm9kZS52aWV3ID0gdGhpcztcbiAgfVxufVxuXG5cblZpZXcucHJvdG90eXBlID0ge1xuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGEgdmlldyBmcm9tIHRoZSBET00uIEEgdmlldyBpcyBhIERvY3VtZW50RnJhZ21lbnQsIHNvIGByZW1vdmUoKWAgcmV0dXJucyBhbGwgaXRzIG5vZGVzIHRvIGl0c2VsZi5cbiAgICovXG4gIHJlbW92ZTogZnVuY3Rpb24oKSB7XG4gICAgdmFyIG5vZGUgPSB0aGlzLmZpcnN0Vmlld05vZGU7XG4gICAgdmFyIG5leHQ7XG5cbiAgICBpZiAobm9kZS5wYXJlbnROb2RlICE9PSB0aGlzKSB7XG4gICAgICAvLyBSZW1vdmUgYWxsIHRoZSBub2RlcyBhbmQgcHV0IHRoZW0gYmFjayBpbnRvIHRoaXMgZnJhZ21lbnRcbiAgICAgIHdoaWxlIChub2RlKSB7XG4gICAgICAgIG5leHQgPSAobm9kZSA9PT0gdGhpcy5sYXN0Vmlld05vZGUpID8gbnVsbCA6IG5vZGUubmV4dFNpYmxpbmc7XG4gICAgICAgIHRoaXMuYXBwZW5kQ2hpbGQobm9kZSk7XG4gICAgICAgIG5vZGUgPSBuZXh0O1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgYSB2aWV3IChpZiBub3QgYWxyZWFkeSByZW1vdmVkKSBhbmQgYWRkcyB0aGUgdmlldyB0byBpdHMgdGVtcGxhdGUncyBwb29sLlxuICAgKi9cbiAgZGlzcG9zZTogZnVuY3Rpb24oKSB7XG4gICAgLy8gTWFrZSBzdXJlIHRoZSB2aWV3IGlzIHJlbW92ZWQgZnJvbSB0aGUgRE9NXG4gICAgdGhpcy5iaW5kaW5ncy5mb3JFYWNoKGZ1bmN0aW9uKGJpbmRpbmcpIHtcbiAgICAgIGJpbmRpbmcuZGlzcG9zZSgpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5yZW1vdmUoKTtcbiAgICBpZiAodGhpcy50ZW1wbGF0ZSkge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5yZXR1cm5WaWV3KHRoaXMpO1xuICAgIH1cbiAgfSxcblxuXG4gIC8qKlxuICAgKiBCaW5kcyBhIHZpZXcgdG8gYSBnaXZlbiBjb250ZXh0LlxuICAgKi9cbiAgYmluZDogZnVuY3Rpb24oY29udGV4dCkge1xuICAgIHRoaXMuYmluZGluZ3MuZm9yRWFjaChmdW5jdGlvbihiaW5kaW5nKSB7XG4gICAgICBiaW5kaW5nLmJpbmQoY29udGV4dCk7XG4gICAgfSk7XG4gIH0sXG5cblxuICAvKipcbiAgICogVW5iaW5kcyBhIHZpZXcgZnJvbSBhbnkgY29udGV4dC5cbiAgICovXG4gIHVuYmluZDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5iaW5kaW5ncy5mb3JFYWNoKGZ1bmN0aW9uKGJpbmRpbmcpIHtcbiAgICAgIGJpbmRpbmcudW5iaW5kKCk7XG4gICAgfSk7XG4gIH1cbn07XG4iXX0=
