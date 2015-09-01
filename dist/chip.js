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

},{"./binders":3,"./controller":5,"./events":6,"./router":7,"fragments-js":8}],3:[function(require,module,exports){
module.exports = registerBinders;
var compile = require('fragments-js/src/compile');
var forEach = Array.prototype.forEach;

function registerBinders(app) {
  var fragments = app.fragments;
  var pageLoadedEventQueued = false;

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
      this.isIframe = this.element.nodeName === 'IFRAME';
      if (this.isIframe && this.element.src) {
        this.element.removeAttribute('src');
      }

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

      if (this.isIframe) {
        setTimeout(function() {
          var doc = this.element.contentDocument;
          var head = doc.querySelector('head');

          forEach.call(document.querySelectorAll('link[rel="stylesheet"][href], style'), function(style) {
            head.appendChild(style.cloneNode(true));
          });

          // Add reset for common styles on body
          var style = doc.createElement('style');
          style.innerHTML = 'body { background: none transparent; width: auto; min-width: 0; margin: 0; padding: 0; }';
          head.appendChild(style);
        }.bind(this));
      }

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
        if (this.isIframe) {
          this.element.contentDocument.body.appendChild(this.showing);
        } else {
          this.element.appendChild(this.showing);
        }
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
        if (this.isIframe) {
          this.body.appendChild(this.showing);
        } else {
          this.element.appendChild(this.showing);
        }
        this.container.bind(this.controller);
        this.showing.bind(this.controller);
        this.context.sync();

        if (!pageLoadedEventQueued) {
          pageLoadedEventQueued = true;
          this.context.afterSync(function() {
            pageLoadedEventQueued = false;
            app.dispatchEvent(new CustomEvent('pageLoaded', { detail: app.path }));
          });
        }

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
  fragments.registerAttribute('[autofocus]', fragments.unregisterAttribute('autofocus'));
  fragments.registerAttribute('[autoselect]', fragments.unregisterAttribute('autoselect'));

  var ValueBinder = fragments.registerAttribute('[value]', fragments.unregisterAttribute('value'));
  ValueBinder.prototype.eventsAttrName = '[value-events]';
  ValueBinder.prototype.fieldAttrName = '[value-field]';

  fragments.registerAttribute('(*)', fragments.unregisterAttribute('on-*'));
  fragments.registerAttribute('(enter)', fragments.unregisterAttribute('on-enter'));
  fragments.registerAttribute('(ctrl-enter)', fragments.unregisterAttribute('on-ctrl-enter'));
  fragments.registerAttribute('(esc)', fragments.unregisterAttribute('on-esc'));
  fragments.registerAttribute('(escape)', fragments.getAttributeBinder('(esc)'));

  var AttrBinder = fragments.unregisterAttribute('*$');
  AttrBinder.prototype.priority = -1;
  fragments.registerAttribute('[*]', AttrBinder);
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
Controller.prototype.watch = function(expr, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
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
      this.watch(expr, options, callback);
    }, this);

    if (!options.skipInitial) {
      callback();
    }

    return observers;
  } else {
    var observer = new Observer(expr, callback, this);
    observer.getChangeRecords = options.getChangeRecords;
    observer.bind(this, options.skipInitial);

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
      if (!node.hasAttribute(attr.name)) {
        // If this was removed already by another binding, don't process.
        continue;
      }
      var name = attr.name;
      var value = attr.value;
      if (Binder.expr) {
        match = name.match(Binder.expr);
        if (match) match = match[1];
      } else {
        match = null;
      }

      try {
        node.removeAttribute(attr.name);
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
require('./util/polyfills');
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

    if (name === '__default__' && !definition.hasOwnProperty('priority')) {
      definition.priority = -100;
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

},{"./animatedBinding":9,"./binding":10,"./compile":11,"./registered/animations":17,"./registered/binders":18,"./registered/formatters":19,"./template":20,"./util/animation":21,"./util/extend":22,"./util/polyfills":23,"./util/toFragment":24,"./view":25}],13:[function(require,module,exports){
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
    // Shortcut out for values that are exactly equal
    if (value === oldValue) return false;

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

    if (this.getChangeRecords) {
      // Store an immutable version of the value, allowing for arrays and objects to change instance but not content and
      // still refrain from dispatching callbacks (e.g. when using an object in bind-class or when using array formatters
      // in bind-each)
      this.oldValue = diff.clone(value);
    } else {
      this.oldValue = value;
    }
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
   * Automatically focuses the input when it is displayed on screen.
   */
  fragments.registerAttribute('autofocus', {
    bound: function() {
      var element = this.element;
      setTimeout(function() {
        element.focus();
      });
    }
  });


  /**
   * Automatically selects the contents of an input when it receives focus.
   */
  fragments.registerAttribute('autoselect', {
    created: function() {
      var focused, mouseEvent;

      this.element.addEventListener('mousedown', function() {
        // Use matches since document.activeElement doesn't work well with web components (future compat)
        focused = this.matches(':focus');
        mouseEvent = true;
      });

      this.element.addEventListener('focus', function() {
        if (!mouseEvent) {
          this.select();
        }
      });

      this.element.addEventListener('mouseup', function() {
        if (!focused) {
          this.select();
        }
        mouseEvent = false;
      });
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
    if (isUnless) {
      return '!(' + expr + ')';
    } else {
      return expr;
    }
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

},{"./util/extend":22,"./view":25}],21:[function(require,module,exports){
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

},{}],24:[function(require,module,exports){
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
  if (!string) {
    var fragment = document.createDocumentFragment();
    fragment.appendChild(document.createTextNode(''));
    return fragment;
  }
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
      if (!string) {
        var fragment = document.createDocumentFragment();
        fragment.appendChild(document.createTextNode(''));
        return fragment;
      }
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

},{}],25:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsInNyYy9hcHAuanMiLCJzcmMvYmluZGVycy5qcyIsInNyYy9jaGlwLmpzIiwic3JjL2NvbnRyb2xsZXIuanMiLCJzcmMvZXZlbnRzLmpzIiwic3JjL3JvdXRlci5qcyIsIi4uL2ZyYWdtZW50cy1qcy9pbmRleC5qcyIsIi4uL2ZyYWdtZW50cy1qcy9zcmMvYW5pbWF0ZWRCaW5kaW5nLmpzIiwiLi4vZnJhZ21lbnRzLWpzL3NyYy9iaW5kaW5nLmpzIiwiLi4vZnJhZ21lbnRzLWpzL3NyYy9jb21waWxlLmpzIiwiLi4vZnJhZ21lbnRzLWpzL3NyYy9mcmFnbWVudHMuanMiLCIuLi9mcmFnbWVudHMtanMvc3JjL29ic2VydmVyL2RpZmYuanMiLCIuLi9mcmFnbWVudHMtanMvc3JjL29ic2VydmVyL2V4cHJlc3Npb24uanMiLCIuLi9mcmFnbWVudHMtanMvc3JjL29ic2VydmVyL2luZGV4LmpzIiwiLi4vZnJhZ21lbnRzLWpzL3NyYy9vYnNlcnZlci9vYnNlcnZlci5qcyIsIi4uL2ZyYWdtZW50cy1qcy9zcmMvcmVnaXN0ZXJlZC9hbmltYXRpb25zLmpzIiwiLi4vZnJhZ21lbnRzLWpzL3NyYy9yZWdpc3RlcmVkL2JpbmRlcnMuanMiLCIuLi9mcmFnbWVudHMtanMvc3JjL3JlZ2lzdGVyZWQvZm9ybWF0dGVycy5qcyIsIi4uL2ZyYWdtZW50cy1qcy9zcmMvdGVtcGxhdGUuanMiLCIuLi9mcmFnbWVudHMtanMvc3JjL3V0aWwvYW5pbWF0aW9uLmpzIiwiLi4vZnJhZ21lbnRzLWpzL3NyYy91dGlsL2V4dGVuZC5qcyIsIi4uL2ZyYWdtZW50cy1qcy9zcmMvdXRpbC9wb2x5ZmlsbHMuanMiLCIuLi9mcmFnbWVudHMtanMvc3JjL3V0aWwvdG9GcmFnbWVudC5qcyIsIi4uL2ZyYWdtZW50cy1qcy9zcmMvdmlldy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1VkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbGxCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6WUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hZQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOTJCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDalpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9zcmMvY2hpcCcpO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBBcHA7XG52YXIgUm91dGVyID0gcmVxdWlyZSgnLi9yb3V0ZXInKTtcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCcuL2V2ZW50cycpO1xudmFyIGNyZWF0ZUZyYWdtZW50cyA9IHJlcXVpcmUoJ2ZyYWdtZW50cy1qcycpLmNyZWF0ZTtcbnZhciBDb250cm9sbGVyID0gcmVxdWlyZSgnLi9jb250cm9sbGVyJyk7XG52YXIgZm9yRWFjaCA9IEFycmF5LnByb3RvdHlwZS5mb3JFYWNoO1xudmFyIHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xuXG4vLyAjIENoaXAgQXBwXG5cbi8vIEFuIEFwcCByZXByZXNlbnRzIGFuIGFwcCBvciBtb2R1bGUgdGhhdCBjYW4gaGF2ZSByb3V0ZXMsIGNvbnRyb2xsZXJzLCBhbmQgdGVtcGxhdGVzIGRlZmluZWQuXG5mdW5jdGlvbiBBcHAobmFtZSkge1xuICBDb250cm9sbGVyLmNhbGwodGhpcyk7XG4gIEV2ZW50RW1pdHRlci5jYWxsKHRoaXMpO1xuICB0aGlzLmZyYWdtZW50cyA9IGNyZWF0ZUZyYWdtZW50cygpO1xuICB0aGlzLmFwcCA9IHRoaXM7XG4gIHRoaXMubmFtZSA9IG5hbWU7XG4gIHRoaXMuY29udHJvbGxlcnMgPSB7fTtcbiAgdGhpcy50ZW1wbGF0ZXMgPSB7fTtcbiAgdGhpcy5yb3V0ZXIgPSBuZXcgUm91dGVyKCk7XG4gIHRoaXMucm91dGVQYXRoID0gW107XG4gIHRoaXMucm9vdEVsZW1lbnQgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gIHRoaXMuc3luYyA9IHRoaXMuc3luYy5iaW5kKHRoaXMpO1xuICB0aGlzLnJvdXRlci5vbignZXJyb3InLCBmdW5jdGlvbihldmVudCkge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ3JvdXRlRXJyb3InLCB7IGRldGFpbDogZXZlbnQuZGV0YWlsIH0pKTtcbiAgfSwgdGhpcyk7XG5cbiAgcmVxdWlyZSgnLi9iaW5kZXJzJykodGhpcyk7XG59XG5cbkFwcC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKENvbnRyb2xsZXIucHJvdG90eXBlKTtcbkFwcC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBBcHA7XG5cblxuLy8gSW5pdGlhbGl6ZXMgdGVtcGxhdGVzIGFuZCBjb250cm9sbGVycyBmcm9tIHRoZSBlbnRpcmUgcGFnZSBvciB0aGUgYHJvb3RgIGVsZW1lbnQgaWYgcHJvdmlkZWQuXG5BcHAucHJvdG90eXBlLmluaXRBcHAgPSBmdW5jdGlvbihyb290KSB7XG4gIGlmICh0aGlzLmNvbnN0cnVjdG9yICE9PSBBcHApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2luaXRBcHAgbXVzdCBiZSBjYWxsZWQgZnJvbSB0aGUgYXBwIGluc3RhbmNlLCBub3QgYSBjb250cm9sbGVyJyk7XG4gIH1cblxuICBpZiAoZG9jdW1lbnQucmVhZHlTdGF0ZSA9PT0gJ2xvYWRpbmcnKSB7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIHRoaXMuaW5pdEFwcC5iaW5kKHRoaXMsIHJvb3QpKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAodGhpcy5pbml0ZWQpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB0aGlzLmluaXRlZCA9IHRydWVcbiAgaWYgKHJvb3QpIHtcbiAgICB0aGlzLnJvb3RFbGVtZW50ID0gcm9vdDtcbiAgfVxuXG4gIGZvckVhY2guY2FsbCh0aGlzLnJvb3RFbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ3NjcmlwdFt0eXBlPVwidGV4dC9odG1sXCJdLCB0ZW1wbGF0ZScpLCBmdW5jdGlvbihzY3JpcHQpIHtcbiAgICB2YXIgbmFtZSA9IHNjcmlwdC5nZXRBdHRyaWJ1dGUoJ25hbWUnKSB8fCBzY3JpcHQuaWQ7XG4gICAgaWYgKG5hbWUpIHtcbiAgICAgIHRoaXMudGVtcGxhdGUobmFtZSwgc2NyaXB0KTtcbiAgICAgIHNjcmlwdC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHNjcmlwdCk7XG4gICAgfVxuICB9LCB0aGlzKTtcblxuICB0aGlzLmFwcENvbnRyb2xsZXIgPSB0aGlzLmNyZWF0ZUNvbnRyb2xsZXIoeyBlbGVtZW50OiB0aGlzLnJvb3RFbGVtZW50LCBuYW1lOiAnYXBwbGljYXRpb24nIH0pO1xufTtcblxuXG4vLyBUZW1wbGF0ZXNcbi8vIC0tLS0tLS0tLVxuXG4vLyBSZWdpc3RlcnMgYSBuZXcgdGVtcGxhdGUgYnkgbmFtZSB3aXRoIHRoZSBwcm92aWRlZCBgY29udGVudGAgc3RyaW5nLiBJZiBubyBgY29udGVudGAgaXMgZ2l2ZW4gdGhlbiByZXR1cm5zIGEgbmV3XG4vLyBpbnN0YW5jZSBvZiBhIGRlZmluZWQgdGVtcGxhdGUuIFRoaXMgaW5zdGFuY2UgaXMgYSBkb2N1bWVudCBmcmFnbWVudC5cbkFwcC5wcm90b3R5cGUudGVtcGxhdGUgPSBmdW5jdGlvbihuYW1lLCBjb250ZW50KSB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgIHRoaXMudGVtcGxhdGVzW25hbWVdID0gdGhpcy5mcmFnbWVudHMuY3JlYXRlVGVtcGxhdGUoY29udGVudCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHRoaXMudGVtcGxhdGVzW25hbWVdO1xuICB9XG59O1xuXG5cbkFwcC5wcm90b3R5cGUuY29tcG9uZW50ID0gZnVuY3Rpb24oZWxlbWVudE5hbWUsIHRlbXBsYXRlTmFtZSkge1xuICB2YXIgYXBwID0gdGhpcztcbiAgdmFyIGZyYWdtZW50cyA9IHRoaXMuZnJhZ21lbnRzO1xuXG4gIGZyYWdtZW50cy5yZWdpc3RlckVsZW1lbnQoZWxlbWVudE5hbWUsIHtcbiAgICBwcmlvcml0eTogMjAwLFxuXG4gICAgY29tcGlsZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHRoaXMuZWxlbWVudC5jaGlsZE5vZGVzLmxlbmd0aCkge1xuICAgICAgICAvLyBTYXZlIHRoZSBjb250ZW50cyBvZiB0aGlzIGNvbXBvbmVudCB0byBpbnNlcnQgd2l0aGluXG4gICAgICAgIHRoaXMuY29udGVudCA9IGZyYWdtZW50cy5jcmVhdGVUZW1wbGF0ZSh0aGlzLmVsZW1lbnQuY2hpbGROb2Rlcyk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIGNyZWF0ZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy52aWV3ID0gYXBwLnRlbXBsYXRlKHRlbXBsYXRlTmFtZSkuY3JlYXRlVmlldygpO1xuICAgICAgdGhpcy5lbGVtZW50LmFwcGVuZENoaWxkKHRoaXMudmlldyk7XG4gICAgfSxcblxuICAgIGJvdW5kOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuY29udGV4dC5fcGFydGlhbENvbnRlbnQgPSB0aGlzLmNvbnRlbnQ7XG4gICAgICB0aGlzLmxhc3RDb250ZXh0ID0gdGhpcy5jb250ZXh0O1xuICAgICAgdGhpcy52aWV3LmJpbmQodGhpcy5jb250ZXh0KTtcbiAgICB9LFxuXG4gICAgdW5ib3VuZDogZnVuY3Rpb24oKSB7XG4gICAgICBkZWxldGUgdGhpcy5sYXN0Q29udGV4dC5fcGFydGlhbENvbnRlbnQ7XG4gICAgICB0aGlzLmxhc3RDb250ZXh0ID0gbnVsbDtcbiAgICAgIHRoaXMudmlldy51bmJpbmQoKTtcbiAgICB9XG5cbiAgfSk7XG5cbn07XG5cblxuLy8gQ29udHJvbGxlcnNcbi8vIC0tLS0tLS0tLVxuXG4vLyBEZWZpbmVzIGEgY29udHJvbGxlciBpbml0aWFsaXphdGlvbiBmdW5jdGlvbi4gUmVnaXN0ZXJzIHRoZSBgaW5pdEZ1bmN0aW9uYCBmdW5jdGlvbiB3aXRoIGBuYW1lYC4gVGhlIGZ1bmN0aW9uIHdpbGxcbi8vIGJlIGNhbGxlZCB3aXRoIGFuIGluc3RhbmNlIG9mIGEgY29udHJvbGxlciBhcyBpdHMgb25seSBwYXJhbWV0ZXIgZXZlcnkgdGltZSBhIGNvbnRyb2xsZXIgaXMgY3JlYXRlZCB3aXRoIHRoYXRcbi8vIG5hbWUuXG4vL1xuLy8gSWYgbm8gYGluaXRGdW5jdGlvbmAgaXMgcHJvdmlkZWQsIHJldHVybnMgdGhlIGBpbml0RnVuY3Rpb25gIHByZXZpb3VzbHkgcmVnaXN0ZXJlZCBvciBpZiBub25lIGhhcyBiZWVuIHJlZ2lzdGVyZWRcbi8vIGEgZnVuY3Rpb24gb24gdGhlIGdsb2JhbCBzY29wZSB3aXRoIHRoZSBuYW1lIGBuYW1lICsgJ0NvbnRyb2xsZXInYCAoZS5nLiBgZnVuY3Rpb24gYmxvZ0NvbnRyb2xsZXIoKXt9YCkuXG4vL1xuLy8gKipFeGFtcGxlOioqXG4vL2BgYGphdmFzY3JpcHRcbi8vIGFwcC5jb250cm9sbGVyKCdob21lJywgZnVuY3Rpb24oY29udHJvbGxlcikge1xuLy8gICAvLyBkbyBzb21ldGhpbmcgYXMgc29vbiBhcyBpdCBpcyBpbnN0YW50aWF0ZWRcbi8vICAgTXlBcHBBUEkubG9hZFVzZXIoZnVuY3Rpb24oZXJyLCB1c2VyKSB7XG4vLyAgICAgY29udHJvbGxlci51c2VyID0gdXNlclxuLy8gICAgIGNvbnRyb2xsZXIuc3luYygpXG4vLyAgIH0pXG4vL1xuLy8gICAvLyBwcm92aWRlIGEgZnVuY3Rpb24gZm9yIHRoZSB2aWV3IHRvIGNhbGwuIEUuZy4gPGJ1dHRvbiBvbi1jbGljaz1cImxvZ291dFwiPkxvZ291dDwvYnV0dG9uPlxuLy8gICBjb250cm9sbGVyLmxvZ291dCA9IGZ1bmN0aW9uKCkge1xuLy8gICAgIE15QXBwQVBJLmxvZ291dChmdW5jdGlvbihlcnIpIHtcbi8vICAgICAgIGNvbnRyb2xsZXIudXNlciA9IG51bGxcbi8vICAgICAgIGNvbnRyb2xsZXIuc3luYygpXG4vLyAgICAgfSlcbi8vICAgfVxuLy8gfSlcbi8vIGBgYFxuQXBwLnByb3RvdHlwZS5jb250cm9sbGVyID0gZnVuY3Rpb24obmFtZSwgaW5pdEZ1bmN0aW9uKSB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgIHRoaXMuY29udHJvbGxlcnNbbmFtZV0gPSBpbml0RnVuY3Rpb247XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHRoaXMuY29udHJvbGxlcnNbbmFtZV0gfHxcbiAgICAgICh0eXBlb2Ygd2luZG93W25hbWUgKyAnQ29udHJvbGxlciddID09PSAnZnVuY3Rpb24nID8gd2luZG93W25hbWUgKyAnQ29udHJvbGxlciddIDogbnVsbCk7XG4gIH1cbn07XG5cblxuLy8gQ3JlYXRlcyBhIG5ldyBjb250cm9sbGVyLiBTZXRzIGBvcHRpb25zLnBhcmVudGAgYXMgdGhlIHBhcmVudCBjb250cm9sbGVyIHRvIHRoaXMgb25lLiBTZXRzIGBvcHRpb25zLnByb3BlcnRpZXNgXG4vLyBwcm9wZXJ0aWVzIG9udG8gdGhlIGNvbnRyb2xsZXIgYmVmb3JlIGJpbmRpbmcgYW5kIGluaXRpYWxpemF0aW9uLiBCaW5kcyBgb3B0aW9ucy5lbGVtZW50YCB0byB0aGUgY29udHJvbGxlciB3aGljaFxuLy8gdXBkYXRlcyBIVE1MIGFzIGRhdGEgdXBkYXRlcy4gSW5pdGlhbGl6ZXMgdGhlIG5ldyBjb250cm9sbGVyIHdpdGggdGhlIGBvcHRpb25zLm5hbWVgIGZ1bmN0aW9uIHNldCBpblxuLy8gYGFwcC5jb250cm9sbGVyKClgLiBTZXRzIHRoZSBuZXcgY29udHJvbGxlciBhcyBhIHBhc3N0aHJvdWdoIGNvbnRyb2xsZXIgaWYgYG9wdGlvbnMucGFzc3Rocm91Z2hgIGlzIHRydWUuXG5BcHAucHJvdG90eXBlLmNyZWF0ZUNvbnRyb2xsZXIgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gIGlmICghb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSB7fTtcbiAgfVxuXG4gIHZhciBjb250cm9sbGVyO1xuICB2YXIgcGFyZW50ID0gb3B0aW9ucy5wYXJlbnQgfHwgdGhpcztcblxuICAvLyBJZiBgb3B0aW9ucy5wYXJlbnRgIGlzIHByb3ZpZGVkLCB0aGUgbmV3IGNvbnRyb2xsZXIgd2lsbCBleHRlbmQgaXQuIEFueSBkYXRhIG9yIG1ldGhvZHMgb24gdGhlIHBhcmVudCBjb250cm9sbGVyXG4gIC8vIHdpbGwgYmUgYXZhaWxhYmxlIHRvIHRoZSBjaGlsZCB1bmxlc3Mgb3ZlcndyaXR0ZW4gYnkgdGhlIGNoaWxkLiBUaGlzIHVzZXMgdGhlIHByb3RvdHlwZSBjaGFpbiwgdGh1cyBvdmVyd3JpdGluZyBhXG4gIC8vIHByb3BlcnR5IG9ubHkgc2V0cyBpdCBvbiB0aGUgY2hpbGQgYW5kIGRvZXMgbm90IGNoYW5nZSB0aGUgcGFyZW50LiBUaGUgY2hpbGQgY2Fubm90IHNldCBkYXRhIG9uIHRoZSBwYXJlbnQsIG9ubHlcbiAgLy8gcmVhZCBpdCBvciBjYWxsIG1ldGhvZHMgb24gaXQuXG4gIGNvbnRyb2xsZXIgPSBPYmplY3QuY3JlYXRlKHBhcmVudCk7XG4gIGNvbnRyb2xsZXIuX3BhcmVudCA9IHBhcmVudDtcbiAgQ29udHJvbGxlci5jYWxsKGNvbnRyb2xsZXIpO1xuICBwYXJlbnQuX2NoaWxkcmVuLnB1c2goY29udHJvbGxlcik7XG5cbiAgLy8gSWYgYHByb3BlcnRpZXNgIGlzIHByb3ZpZGVkLCBhbGwgcHJvcGVydGllcyBmcm9tIHRoYXQgb2JqZWN0IHdpbGwgYmUgY29waWVkIG92ZXIgdG8gdGhlIGNvbnRyb2xsZXIgYmVmb3JlIGl0IGlzXG4gIC8vIGluaXRpYWxpemVkIGJ5IGl0cyBkZWZpbml0aW9uIG9yIGJvdW5kIHRvIGl0cyBlbGVtZW50LlxuICBpZiAob3B0aW9ucy5wcm9wZXJ0aWVzKSB7XG4gICAgT2JqZWN0LmtleXMob3B0aW9ucy5wcm9wZXJ0aWVzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgY29udHJvbGxlcltrZXldID0gb3B0aW9ucy5wcm9wZXJ0aWVzW2tleV07XG4gICAgfSk7XG4gIH1cblxuICBpZiAob3B0aW9ucy5lbGVtZW50KSB7XG4gICAgLy8gQ2xlYW4gdXAgb2xkIGNvbnRyb2xsZXIgaWYgb25lIGV4aXN0c1xuICAgIGlmIChvcHRpb25zLmVsZW1lbnQuY29udHJvbGxlcikge1xuICAgICAgb3B0aW9ucy5lbGVtZW50LnVuYmluZCgpO1xuICAgICAgb3B0aW9ucy5lbGVtZW50LmNvbnRyb2xsZXIuY2xvc2VDb250cm9sbGVyKCk7XG4gICAgfVxuXG4gICAgLy8gQXNzaWduIGVsZW1lbnRcbiAgICBjb250cm9sbGVyLmVsZW1lbnQgPSBvcHRpb25zLmVsZW1lbnQ7XG4gICAgY29udHJvbGxlci5lbGVtZW50LmNvbnRyb2xsZXIgPSBjb250cm9sbGVyO1xuICB9XG5cbiAgLy8gSWYgYG5hbWVgIGlzIHN1cHBsaWVkIHRoZSBjb250cm9sbGVyIGRlZmluaXRpb24gYnkgdGhhdCBuYW1lIHdpbGwgYmUgcnVuIHRvIGluaXRpYWxpemUgdGhpcyBjb250cm9sbGVyIGJlZm9yZSB0aGVcbiAgLy8gYmluZGluZ3MgYXJlIHNldCB1cC5cbiAgaWYgKG9wdGlvbnMubmFtZSkge1xuICAgIHZhciBpbml0RnVuY3Rpb24gPSB0aGlzLmNvbnRyb2xsZXIob3B0aW9ucy5uYW1lKTtcbiAgICBpZiAoaW5pdEZ1bmN0aW9uKSB7XG4gICAgICBpbml0RnVuY3Rpb24oY29udHJvbGxlcik7XG4gICAgfVxuICB9XG5cbiAgLy8gQmluZHMgdGhlIGVsZW1lbnQgdG8gdGhlIG5ldyBjb250cm9sbGVyXG4gIGlmIChvcHRpb25zLmVsZW1lbnQpIHtcbiAgICB0aGlzLmZyYWdtZW50cy5iaW5kRWxlbWVudChvcHRpb25zLmVsZW1lbnQsIGNvbnRyb2xsZXIpO1xuICB9XG5cbiAgcmV0dXJuIGNvbnRyb2xsZXI7XG59O1xuXG4vLyBTeW5jcyB0aGUgb2JzZXJ2ZXJzIHRvIHByb3BvZ2F0ZSBjaGFuZ2VzIHRvIHRoZSBIVE1MLCBjYWxsIGNhbGxiYWNrIGFmdGVyXG5BcHAucHJvdG90eXBlLnN5bmMgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICB0aGlzLmZyYWdtZW50cy5zeW5jKGNhbGxiYWNrKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbi8vIFJvdXRpbmdcbi8vIC0tLS0tLVxuXG4vLyBSZWdpc3RlcnMgYSBgY2FsbGJhY2tgIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aGVuIHRoZSBnaXZlbiBwYXJhbSBgbmFtZWAgaXMgbWF0Y2hlZCBpbiBhIFVSTFxuQXBwLnByb3RvdHlwZS5wYXJhbSA9IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrKSB7XG4gIGlmICh0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICB2YXIgb3JpZ0NhbGxiYWNrID0gY2FsbGJhY2ssIGFwcCA9IHRoaXM7XG5cbiAgICAvLyBTZXQgdGhlIHBhcmFtcyBhbmQgcXVlcnkgb250byB0aGUgYXBwIGJlZm9yZSBydW5uaW5nIHRoZSBjYWxsYmFja1xuICAgIGNhbGxiYWNrID0gZnVuY3Rpb24ocmVxLCBuZXh0KSB7XG4gICAgICBhcHAucGFyYW1zID0gcmVxLnBhcmFtcztcbiAgICAgIGFwcC5xdWVyeSA9IHJlcS5xdWVyeVxuICAgICAgb3JpZ0NhbGxiYWNrKGFwcC5hcHBDb250cm9sbGVyLCBuZXh0KTtcbiAgICB9O1xuICB9XG5cbiAgdGhpcy5yb3V0ZXIucGFyYW0obmFtZSwgY2FsbGJhY2spO1xuICByZXR1cm4gdGhpcztcbn07XG5cblxuLy8gQ3JlYXRlIGEgcm91dGUgdG8gYmUgcnVuIHdoZW4gdGhlIGdpdmVuIFVSTCBgcGF0aGAgaXMgaGl0IGluIHRoZSBicm93c2VyIFVSTC4gVGhlIHJvdXRlIGBuYW1lYCBpcyB1c2VkIHRvIGxvYWQgdGhlXG4vLyB0ZW1wbGF0ZSBhbmQgY29udHJvbGxlciBieSB0aGUgc2FtZSBuYW1lLiBUaGlzIHRlbXBsYXRlIHdpbGwgYmUgcGxhY2VkIGluIHRoZSBmaXJzdCBlbGVtZW50IG9uIHBhZ2Ugd2l0aCBhXG4vLyBgYmluZC1yb3V0ZWAgYXR0cmlidXRlLlxuQXBwLnByb3RvdHlwZS5yb3V0ZSA9IGZ1bmN0aW9uKHBhdGgsIGhhbmRsZXIsIHN1YnJvdXRlcywgcnVuQmVmb3JlKSB7XG4gIHZhciBhcHAgPSB0aGlzLmFwcDtcbiAgdmFyIGNhbGxiYWNrO1xuXG4gIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gJ2Z1bmN0aW9uJyAmJiBoYW5kbGVyLnRvU3RyaW5nKCkubWF0Y2goL1xcKHJvdXRlXFwpLykpIHtcbiAgICBzdWJyb3V0ZXMgPSBoYW5kbGVyO1xuICAgIGhhbmRsZXIgPSBudWxsO1xuICB9XG5cbiAgaWYgKCFoYW5kbGVyKSB7XG4gICAgaGFuZGxlciA9IHBhdGgucmVwbGFjZSgvXlxcLy8sICcnKTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIC8vIFN1YnJvdXRlcyBub3Qgc3VwcG9ydGVkIHdpdGggY2FsbGJhY2tzLCBvbmx5IHdpdGggc3RyaW5nIGhhbmRsZXJzLlxuICAgIGNhbGxiYWNrID0gaGFuZGxlcjtcblxuICB9IGVsc2UgaWYgKHR5cGVvZiBoYW5kbGVyID09PSAnc3RyaW5nJykge1xuICAgIHZhciBwYXJ0cyA9IHBhdGguc3BsaXQoJy8nKTtcbiAgICB2YXIgbGVuZ3RoID0gcGFydHNbcGFydHMubGVuZ3RoIC0gMV0gPT09ICcqJyA/IEluZmluaXR5IDogcGFydHMubGVuZ3RoO1xuXG4gICAgLy8gSWYgdGhlIGhhbmRsZXIgaXMgYSBzdHJpbmcgbG9hZCB0aGUgY29udHJvbGxlci90ZW1wbGF0ZSBieSB0aGF0IG5hbWUuXG4gICAgdmFyIG5hbWUgPSBoYW5kbGVyO1xuICAgIGNhbGxiYWNrID0gZnVuY3Rpb24ocmVxLCBuZXh0KSB7XG4gICAgICAvLyBSdW4gYSBwcmV2aW91cyByb3V0ZSBmaXJzdCBhbmQgYWxsb3cgaXQgdG8gdGhlbiBydW4gdGhpcyBvbmUgYWdhaW4gYWZ0ZXJcbiAgICAgIGlmIChydW5CZWZvcmUpIHtcbiAgICAgICAgcnVuQmVmb3JlKHJlcSwgY2FsbGJhY2spO1xuICAgICAgfVxuICAgICAgdmFyIG1hdGNoaW5nUGF0aCA9IHJlcS5wYXRoLnNwbGl0KCcvJykuc2xpY2UoMCwgbGVuZ3RoKS5qb2luKCcvJyk7XG4gICAgICBhcHAucm91dGVQYXRoLnB1c2goeyBuYW1lOiBuYW1lLCBwYXRoOiBtYXRjaGluZ1BhdGggfSk7XG4gICAgICBhcHAuc3luYygpO1xuICAgIH07XG5cbiAgICAvLyBBZGRzIHRoZSBzdWJyb3V0ZXMgYW5kIG9ubHkgY2FsbHMgdGhpcyBjYWxsYmFjayBiZWZvcmUgdGhleSBnZXQgY2FsbGVkIHdoZW4gdGhleSBtYXRjaC5cbiAgICBpZiAoc3Vicm91dGVzKSB7XG4gICAgICBzdWJyb3V0ZXMoZnVuY3Rpb24oc3VicGF0aCwgaGFuZGxlciwgc3Vicm91dGVzKSB7XG4gICAgICAgIGlmIChzdWJwYXRoID09PSAnLycpIHtcbiAgICAgICAgICBzdWJwYXRoID0gJyc7XG4gICAgICAgIH1cbiAgICAgICAgYXBwLnJvdXRlKHBhdGggKyBzdWJwYXRoLCBoYW5kbGVyLCBzdWJyb3V0ZXMsIGNhbGxiYWNrKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3JvdXRlIGhhbmRsZXIgbXVzdCBiZSBhIHN0cmluZyBwYXRoIG9yIGEgZnVuY3Rpb24nKTtcbiAgfVxuXG5cbiAgdGhpcy5yb3V0ZXIucm91dGUocGF0aCwgZnVuY3Rpb24ocmVxLCBuZXh0KSB7XG4gICAgdmFyIGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KCdyb3V0ZUNoYW5naW5nJywgeyBjYW5jZWxhYmxlOiB0cnVlIH0pO1xuICAgIGFwcC5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcblxuICAgIGlmICghZXZlbnQuZGVmYXVsdFByZXZlbnRlZCkge1xuICAgICAgYXBwLnBhcmFtcyA9IHJlcS5wYXJhbXM7XG4gICAgICBhcHAucXVlcnkgPSByZXEucXVlcnk7XG4gICAgICBpZiAoYXBwLnBhdGggPT09IHJlcS5wYXRoKSB7XG4gICAgICAgIHJlcS5pc1NhbWVQYXRoID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGFwcC5wYXRoID0gcmVxLnBhdGg7XG4gICAgICBhcHAuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ3JvdXRlQ2hhbmdlJywgeyBkZXRhaWw6IHJlcSB9KSk7XG4gICAgICBhcHAucm91dGVQYXRoLmxlbmd0aCA9IDA7XG4gICAgICBjYWxsYmFjayhhcHAuYXBwQ29udHJvbGxlciwgbmV4dCk7XG4gICAgICBhcHAuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ3JvdXRlQ2hhbmdlZCcsIHsgZGV0YWlsOiByZXEgfSkpO1xuICAgIH1cbiAgfSk7XG5cbn07XG5cblxuLy8gUmVkaXJlY3RzIHRvIHRoZSBwcm92aWRlZCBVUkxcbkFwcC5wcm90b3R5cGUucmVkaXJlY3QgPSBmdW5jdGlvbih1cmwsIHJlcGxhY2UpIHtcbiAgdGhpcy5yb3V0ZXIucmVkaXJlY3QodXJsLCByZXBsYWNlKTtcbn07XG5cblxuQXBwLnByb3RvdHlwZS5oYXNNYXRjaGluZ1JvdXRlcyA9IGZ1bmN0aW9uKHVybCkge1xuICB0aGlzLnJvdXRlci5nZXRSb3V0ZXNNYXRjaGluZ1BhdGgodGhpcy5yb3V0ZXIuZ2V0VXJsUGFydHModXJsKS5wYXRoKS5sZW5ndGggPiAwO1xufTtcblxuXG4vLyBMaXN0ZW4gdG8gVVJMIGNoYW5nZXNcbkFwcC5wcm90b3R5cGUubGlzdGVuID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICBpZiAoIW9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0ge307XG4gIH1cblxuICBpZiAoZG9jdW1lbnQucmVhZHlTdGF0ZSA9PT0gJ2xvYWRpbmcnKSB7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIHRoaXMubGlzdGVuLmJpbmQodGhpcywgb3B0aW9ucykpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gU3RvcCBsaXN0ZW5pbmcgaWYgcmVxdWVzdGVkXG4gIGlmIChvcHRpb25zLnN0b3ApIHtcbiAgICBpZiAodGhpcy5fcm91dGVIYW5kbGVyKSB7XG4gICAgICB0aGlzLnJvdXRlci5vZmYoJ2NoYW5nZScsIHRoaXMuX3JvdXRlSGFuZGxlcik7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2NsaWNrSGFuZGxlcikge1xuICAgICAgdGhpcy5yb290RWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuX2NsaWNrSGFuZGxlcik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucm91dGVyLmxpc3RlbihvcHRpb25zKTtcbiAgfVxuXG4gIC8vIFN0YXJ0IGxpc3RlbmluZ1xuICB2YXIgYXBwID0gdGhpcztcblxuICAvLyBBZGQgaGFuZGxlciBmb3Igd2hlbiB0aGUgcm91dGUgY2hhbmdlc1xuICB0aGlzLl9yb3V0ZUhhbmRsZXIgPSBmdW5jdGlvbihldmVudCwgcGF0aCkge1xuICAgIGFwcC5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgndXJsQ2hhbmdlJywgeyBkZXRhaWw6IHBhdGggfSkpO1xuICB9O1xuXG4gIC8vIEFkZCBoYW5kbGVyIGZvciBjbGlja2luZyBsaW5rc1xuICB0aGlzLl9jbGlja0hhbmRsZXIgPSBmdW5jdGlvbihldmVudCkge1xuICAgIHZhciBhbmNob3I7XG4gICAgaWYgKCAhKGFuY2hvciA9IGV2ZW50LnRhcmdldC5jbG9zZXN0KCdhW2hyZWZdJykpICkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChldmVudC5kZWZhdWx0UHJldmVudGVkKSB7XG4gICAgICAvLyBpZiBzb21ldGhpbmcgZWxzZSBhbHJlYWR5IGhhbmRsZWQgdGhpcywgd2Ugd29uJ3RcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgbGlua0hvc3QgPSBhbmNob3IuaG9zdC5yZXBsYWNlKC86ODAkfDo0NDMkLywgJycpO1xuICAgIHZhciB1cmwgPSBhbmNob3IuZ2V0QXR0cmlidXRlKCdocmVmJykucmVwbGFjZSgvXiMvLCAnJyk7XG5cbiAgICBpZiAobGlua0hvc3QgJiYgbGlua0hvc3QgIT09IGxvY2F0aW9uLmhvc3QpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoZXZlbnQubWV0YUtleSB8fCBldmVudC5jdHJsS2V5IHx8IGFuY2hvci5nZXRBdHRyaWJ1dGUoJ3RhcmdldCcpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuZG9udEhhbmRsZTQwNHMgJiYgIWFwcC5oYXNNYXRjaGluZ1JvdXRlcyh1cmwpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBpZiAoYW5jaG9yLmhyZWYgPT09IGxvY2F0aW9uLmhyZWYgKyAnIycpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIWFuY2hvci5kaXNhYmxlZCkge1xuICAgICAgYXBwLnJlZGlyZWN0KHVybCk7XG4gICAgfVxuICB9O1xuXG4gIHRoaXMucm91dGVyLm9uKCdjaGFuZ2UnLCB0aGlzLl9yb3V0ZUhhbmRsZXIpO1xuICB0aGlzLnJvb3RFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5fY2xpY2tIYW5kbGVyKTtcbiAgdGhpcy5yb3V0ZXIubGlzdGVuKG9wdGlvbnMpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVnaXN0ZXJCaW5kZXJzO1xudmFyIGNvbXBpbGUgPSByZXF1aXJlKCdmcmFnbWVudHMtanMvc3JjL2NvbXBpbGUnKTtcbnZhciBmb3JFYWNoID0gQXJyYXkucHJvdG90eXBlLmZvckVhY2g7XG5cbmZ1bmN0aW9uIHJlZ2lzdGVyQmluZGVycyhhcHApIHtcbiAgdmFyIGZyYWdtZW50cyA9IGFwcC5mcmFnbWVudHM7XG4gIHZhciBwYWdlTG9hZGVkRXZlbnRRdWV1ZWQgPSBmYWxzZTtcblxuICBmcmFnbWVudHMuYW5pbWF0ZUF0dHJpYnV0ZSA9ICdbYW5pbWF0ZV0nO1xuXG4gIC8vICMjIGJpbmQtcGFydGlhbFxuICAvLyBBZGRzIGEgaGFuZGxlciB0byBzZXQgdGhlIGNvbnRlbnRzIG9mIHRoZSBlbGVtZW50IHdpdGggdGhlIHRlbXBsYXRlIGFuZCBjb250cm9sbGVyIGJ5IHRoYXQgbmFtZS4gVGhlIGV4cHJlc3Npb24gbWF5XG4gIC8vIGJlIGp1c3QgdGhlIG5hbWUgb2YgdGhlIHRlbXBsYXRlL2NvbnRyb2xsZXIsIG9yIGl0IG1heSBiZSBvZiB0aGUgZm9ybWF0IGBwYXJ0aWFsTmFtZWAuIFVzZSB0aGUgbG9jYWwtKiBiaW5kaW5nXG4gIC8vIHRvIHBhc3MgZGF0YSBpbnRvIGEgcGFydGlhbC5cblxuICAvLyAqKkV4YW1wbGU6KipcbiAgLy8gYGBgaHRtbFxuICAvLyA8ZGl2IFtwYXJ0aWFsXT1cInVzZXJJbmZvXCIge3VzZXJ9PVwie3tnZXRVc2VyKCl9fVwiIFtjbGFzc109XCJ7eyB7IGFkbWluaXN0cmF0b3I6IHVzZXIuaXNBZG1pbiB9IH19XCI+PC9kaXY+XG4gIC8vXG4gIC8vIDxzY3JpcHQgbmFtZT1cInVzZXJJbmZvXCIgdHlwZT1cInRleHQvaHRtbFwiPlxuICAvLyAgIDxzdHJvbmc+e3sgdXNlci5uYW1lIH19PC9zdHJvbmc+XG4gIC8vIDwvc2NyaXB0PlxuICAvLyBgYGBcbiAgLy8gKlJlc3VsdDoqXG4gIC8vIGBgYGh0bWxcbiAgLy8gPGRpdiBjbGFzcz1cImFkbWluaXN0cmF0b3JcIj5cbiAgLy8gICA8c3Bhbj5KYWNvYjwvc3Bhbj5cbiAgLy8gPC9kaXY+XG4gIC8vIGBgYFxuICB2YXIgUGFydGlhbEJpbmRlciA9IGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnW3BhcnRpYWxdJywge1xuICAgIGFuaW1hdGVkOiB0cnVlLFxuICAgIHByaW9yaXR5OiA0MCxcblxuICAgIGNvbXBpbGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuaXNJZnJhbWUgPSB0aGlzLmVsZW1lbnQubm9kZU5hbWUgPT09ICdJRlJBTUUnO1xuICAgICAgaWYgKHRoaXMuaXNJZnJhbWUgJiYgdGhpcy5lbGVtZW50LnNyYykge1xuICAgICAgICB0aGlzLmVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKCdzcmMnKTtcbiAgICAgIH1cblxuICAgICAgdmFyIHBhcmVudCA9IHRoaXMuZWxlbWVudC5wYXJlbnROb2RlO1xuICAgICAgdmFyIHBsYWNlaG9sZGVyID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICAgICAgcGFyZW50Lmluc2VydEJlZm9yZShwbGFjZWhvbGRlciwgdGhpcy5lbGVtZW50KTtcblxuICAgICAgaWYgKHRoaXMuZWxlbWVudC5jaGlsZE5vZGVzLmxlbmd0aCkge1xuICAgICAgICAvLyBVc2UgdGhlIGNvbnRlbnRzIG9mIHRoaXMgcGFydGlhbCBhcyB0aGUgZGVmYXVsdCB3aGVuIG5vIHJvdXRlIG1hdGNoZXMgb3IgYWxsb3cgdG8gYmUgaW5zZXJ0ZWRcbiAgICAgICAgLy8gd2l0aGluXG4gICAgICAgIHRoaXMuY29udGVudCA9IGZyYWdtZW50cy5jcmVhdGVUZW1wbGF0ZSh0aGlzLmVsZW1lbnQuY2hpbGROb2Rlcyk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMudGVtcGxhdGUgPSBmcmFnbWVudHMuY3JlYXRlVGVtcGxhdGUodGhpcy5lbGVtZW50KTtcbiAgICAgIHRoaXMuZWxlbWVudCA9IHBsYWNlaG9sZGVyO1xuICAgIH0sXG5cbiAgICBjcmVhdGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBwbGFjZWhvbGRlciA9IHRoaXMuZWxlbWVudDtcbiAgICAgIHRoaXMuY29udGFpbmVyID0gdGhpcy50ZW1wbGF0ZS5jcmVhdGVWaWV3KCk7XG5cbiAgICAgIGlmICh0aGlzLmlzSWZyYW1lKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIGRvYyA9IHRoaXMuZWxlbWVudC5jb250ZW50RG9jdW1lbnQ7XG4gICAgICAgICAgdmFyIGhlYWQgPSBkb2MucXVlcnlTZWxlY3RvcignaGVhZCcpO1xuXG4gICAgICAgICAgZm9yRWFjaC5jYWxsKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2xpbmtbcmVsPVwic3R5bGVzaGVldFwiXVtocmVmXSwgc3R5bGUnKSwgZnVuY3Rpb24oc3R5bGUpIHtcbiAgICAgICAgICAgIGhlYWQuYXBwZW5kQ2hpbGQoc3R5bGUuY2xvbmVOb2RlKHRydWUpKTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIC8vIEFkZCByZXNldCBmb3IgY29tbW9uIHN0eWxlcyBvbiBib2R5XG4gICAgICAgICAgdmFyIHN0eWxlID0gZG9jLmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG4gICAgICAgICAgc3R5bGUuaW5uZXJIVE1MID0gJ2JvZHkgeyBiYWNrZ3JvdW5kOiBub25lIHRyYW5zcGFyZW50OyB3aWR0aDogYXV0bzsgbWluLXdpZHRoOiAwOyBtYXJnaW46IDA7IHBhZGRpbmc6IDA7IH0nO1xuICAgICAgICAgIGhlYWQuYXBwZW5kQ2hpbGQoc3R5bGUpO1xuICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgfVxuXG4gICAgICBwbGFjZWhvbGRlci5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLmNvbnRhaW5lciwgcGxhY2Vob2xkZXIubmV4dFNpYmxpbmcpO1xuICAgICAgdGhpcy5lbGVtZW50ID0gcGxhY2Vob2xkZXIubmV4dFNpYmxpbmc7XG4gICAgICBwbGFjZWhvbGRlci5yZW1vdmUoKTtcbiAgICB9LFxuXG4gICAgYm91bmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5jb250ZXh0Ll9wYXJ0aWFsQ29udGVudCA9IHRoaXMuY29udGVudDtcbiAgICAgIHRoaXMubGFzdENvbnRleHQgPSB0aGlzLmNvbnRleHQ7XG4gICAgfSxcblxuICAgIHVuYm91bmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgZGVsZXRlIHRoaXMubGFzdENvbnRleHQuX3BhcnRpYWxDb250ZW50O1xuICAgICAgdGhpcy5sYXN0Q29udGV4dCA9IG51bGw7XG4gICAgfSxcblxuICAgIGdldE5hbWU6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfSxcblxuICAgIHVwZGF0ZWQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBpZiAodGhpcy5hbmltYXRlICYmIHRoaXMuY29udGV4dCkge1xuICAgICAgICB0aGlzLnVwZGF0ZWRBbmltYXRlZCh2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnVwZGF0ZWRSZWd1bGFyKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgdXBkYXRlZFJlZ3VsYXI6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBpZiAodGhpcy5zaG93aW5nKSB7XG4gICAgICAgIHRoaXMuc2hvd2luZy5kaXNwb3NlKCk7XG4gICAgICAgIHRoaXMuY29udGFpbmVyLnVuYmluZCgpO1xuICAgICAgICB0aGlzLmNvbnRyb2xsZXIuY2xvc2VDb250cm9sbGVyKCk7XG4gICAgICAgIHRoaXMuc2hvd2luZyA9IG51bGw7XG4gICAgICAgIHRoaXMuY29udHJvbGxlciA9IG51bGw7XG4gICAgICB9XG5cbiAgICAgIHZhciBuYW1lID0gdGhpcy5nZXROYW1lKHZhbHVlKTtcbiAgICAgIHZhciB0ZW1wbGF0ZSA9IGFwcC50ZW1wbGF0ZShuYW1lKTtcblxuICAgICAgaWYgKHRlbXBsYXRlKSB7XG4gICAgICAgIHRoaXMuY29udHJvbGxlciA9IHRoaXMuY29udGV4dC5jcmVhdGVDb250cm9sbGVyKHsgZWxlbWVudDogdGhpcy5lbGVtZW50LCBuYW1lOiBuYW1lIH0pO1xuICAgICAgICB0aGlzLnNob3dpbmcgPSB0ZW1wbGF0ZS5jcmVhdGVWaWV3KCk7XG4gICAgICAgIGlmICh0aGlzLmlzSWZyYW1lKSB7XG4gICAgICAgICAgdGhpcy5lbGVtZW50LmNvbnRlbnREb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRoaXMuc2hvd2luZyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5lbGVtZW50LmFwcGVuZENoaWxkKHRoaXMuc2hvd2luZyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jb250YWluZXIuYmluZCh0aGlzLmNvbnRyb2xsZXIpO1xuICAgICAgICB0aGlzLnNob3dpbmcuYmluZCh0aGlzLmNvbnRyb2xsZXIpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICB1cGRhdGVkQW5pbWF0ZWQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICB0aGlzLmxhc3RWYWx1ZSA9IHZhbHVlO1xuICAgICAgaWYgKHRoaXMuYW5pbWF0aW5nKSB7XG4gICAgICAgIC8vIE9ic29sZXRlZCwgd2lsbCBjaGFuZ2UgYWZ0ZXIgYW5pbWF0aW9uIGlzIGZpbmlzaGVkLlxuICAgICAgICB0aGlzLnNob3dpbmcudW5iaW5kKCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuc2hvd2luZykge1xuICAgICAgICB0aGlzLmFuaW1hdGluZyA9IHRydWU7XG4gICAgICAgIHRoaXMuc2hvd2luZy51bmJpbmQoKTtcbiAgICAgICAgdGhpcy5hbmltYXRlT3V0KHRoaXMuY29udGFpbmVyLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICB0aGlzLmFuaW1hdGluZyA9IGZhbHNlO1xuXG4gICAgICAgICAgaWYgKHRoaXMuc2hvd2luZykge1xuICAgICAgICAgICAgdGhpcy5zaG93aW5nLmRpc3Bvc2UoKTtcbiAgICAgICAgICAgIHRoaXMuY29udGFpbmVyLnVuYmluZCgpO1xuICAgICAgICAgICAgdGhpcy5jb250cm9sbGVyLmNsb3NlQ29udHJvbGxlcigpO1xuICAgICAgICAgICAgdGhpcy5zaG93aW5nID0gbnVsbDtcbiAgICAgICAgICAgIHRoaXMuY29udHJvbGxlciA9IG51bGw7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHRoaXMuY29udGV4dCkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVkQW5pbWF0ZWQodGhpcy5sYXN0VmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIG5hbWUgPSB0aGlzLmdldE5hbWUodmFsdWUpO1xuICAgICAgdmFyIHRlbXBsYXRlID0gYXBwLnRlbXBsYXRlKG5hbWUpO1xuXG4gICAgICBpZiAodGVtcGxhdGUpIHtcbiAgICAgICAgdGhpcy5jb250cm9sbGVyID0gdGhpcy5jb250ZXh0LmNyZWF0ZUNvbnRyb2xsZXIoeyBlbGVtZW50OiB0aGlzLmVsZW1lbnQsIG5hbWU6IG5hbWUgfSk7XG4gICAgICAgIHRoaXMuc2hvd2luZyA9IHRlbXBsYXRlLmNyZWF0ZVZpZXcoKTtcbiAgICAgICAgaWYgKHRoaXMuaXNJZnJhbWUpIHtcbiAgICAgICAgICB0aGlzLmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5zaG93aW5nKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLmVsZW1lbnQuYXBwZW5kQ2hpbGQodGhpcy5zaG93aW5nKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmNvbnRhaW5lci5iaW5kKHRoaXMuY29udHJvbGxlcik7XG4gICAgICAgIHRoaXMuc2hvd2luZy5iaW5kKHRoaXMuY29udHJvbGxlcik7XG4gICAgICAgIHRoaXMuY29udGV4dC5zeW5jKCk7XG5cbiAgICAgICAgaWYgKCFwYWdlTG9hZGVkRXZlbnRRdWV1ZWQpIHtcbiAgICAgICAgICBwYWdlTG9hZGVkRXZlbnRRdWV1ZWQgPSB0cnVlO1xuICAgICAgICAgIHRoaXMuY29udGV4dC5hZnRlclN5bmMoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBwYWdlTG9hZGVkRXZlbnRRdWV1ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIGFwcC5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgncGFnZUxvYWRlZCcsIHsgZGV0YWlsOiBhcHAucGF0aCB9KSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmFuaW1hdGluZyA9IHRydWU7XG4gICAgICAgIHRoaXMuYW5pbWF0ZUluKHRoaXMuY29udGFpbmVyLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICB0aGlzLmFuaW1hdGluZyA9IGZhbHNlO1xuICAgICAgICAgIC8vIGlmIHRoZSB2YWx1ZSBjaGFuZ2VkIHdoaWxlIHRoaXMgd2FzIGFuaW1hdGluZyBydW4gaXQgYWdhaW5cbiAgICAgICAgICBpZiAodGhpcy5sYXN0VmFsdWUgIT09IHZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZWRBbmltYXRlZCh0aGlzLmxhc3RWYWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgdW5ib3VuZDogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAodGhpcy5zaG93aW5nKSB7XG4gICAgICAgIHRoaXMuc2hvd2luZy51bmJpbmQoKTtcbiAgICAgIH1cbiAgICAgIHRoaXMubGFzdFZhbHVlID0gbnVsbDtcbiAgICAgIHRoaXMuYW5pbWF0aW5nID0gZmFsc2U7XG4gICAgfVxuICB9KTtcblxuXG4gIHZhciBCaW5kaW5nID0gcmVxdWlyZSgnZnJhZ21lbnRzLWpzL3NyYy9iaW5kaW5nJyk7XG4gIHZhciBfc3VwZXIgPSBCaW5kaW5nLnByb3RvdHlwZTtcblxuICAvLyAjIyB7Kn1cbiAgLy8gWW91IG1heSBwYXNzIGRhdGEgaW50byBbcGFydGlhbF0gb3IgW3JlcGVhdF0gdXNpbmcgdGhpcyB3aWxkY2FyZCBiaW5kaW5nLiBUaGUgYXR0cmlidXRlIG5hbWUgcG9ydGlvbiB3aXRoaW4gdGhlXG4gIC8vIGJyYWNrdGVzIHdpbGwgYmUgY29udmVydGVkIHRvIGNhbWVsQ2FzZSBhbmQgdGhlIHZhbHVlIHdpbGwgYmUgc2V0IGxvY2FsbHkuIEV4YW1wbGVzOlxuICAvLyBge2xpbmt9PVwie3t1c2VyLmFkZHJlc3NVcmx9fVwiYCB3aWxsIHBhc3MgdGhlIHZhbHVlIG9mIGB1c2VyLmFkZHJlc3NVcmxgIGludG8gdGhlIHBhcnRpYWwgYXMgYGxpbmtgLlxuICAvLyBge3Bvc3QtYm9keX09XCJ7e3VzZXIuZGVzY3JpcHRpb259fVwiYCB3aWxsIHBhc3MgdGhlIHZhbHVlIG9mIGB1c2VyLmRlc2NyaXB0aW9uYCBpbnRvIHRoZSBwYXJ0aWFsIGFzIGBwb3N0Qm9keWAuXG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgneyp9Jywge1xuICAgIGNyZWF0ZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy50d29XYXlPYnNlcnZlciA9IHRoaXMub2JzZXJ2ZSh0aGlzLmNhbWVsQ2FzZSwgdGhpcy5zZW5kVXBkYXRlLCB0aGlzKTtcbiAgICB9LFxuICAgIC8vIEJpbmQgdGhpcyB0byB0aGUgZ2l2ZW4gY29udGV4dCBvYmplY3RcbiAgICBiaW5kOiBmdW5jdGlvbihjb250ZXh0KSB7XG4gICAgICBpZiAodGhpcy5jaGlsZENvbnRleHQgPT0gY29udGV4dCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIEJpbmQgYWdhaW5zdCB0aGUgcGFyZW50IGNvbnRleHRcbiAgICAgIHRoaXMuY2hpbGRDb250ZXh0ID0gY29udGV4dDtcbiAgICAgIF9zdXBlci5iaW5kLmNhbGwodGhpcywgY29udGV4dC5fcGFyZW50KTtcbiAgICAgIHRoaXMudHdvV2F5T2JzZXJ2ZXIuYmluZChjb250ZXh0LCB0cnVlKTtcbiAgICB9LFxuICAgIHVuYm91bmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy50d29XYXlPYnNlcnZlci51bmJpbmQoKTtcbiAgICB9LFxuICAgIHNlbmRVcGRhdGU6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBpZiAoIXRoaXMuc2tpcFNlbmQpIHtcbiAgICAgICAgdGhpcy5vYnNlcnZlci5zZXQodmFsdWUpO1xuICAgICAgICB0aGlzLnNraXBTZW5kID0gdHJ1ZTtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICBfdGhpcy5za2lwU2VuZCA9IGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHVwZGF0ZWQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBpZiAoIXRoaXMuc2tpcFNlbmQgJiYgdmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLmNoaWxkQ29udGV4dFt0aGlzLmNhbWVsQ2FzZV0gPSB2YWx1ZTtcbiAgICAgICAgdGhpcy5za2lwU2VuZCA9IHRydWU7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgX3RoaXMuc2tpcFNlbmQgPSBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuXG4gIC8vICMjIGJpbmQtY29udGVudFxuICAvLyBBbGxvd3MgYW4gZWxlbWVudCB3aXRoIGEgYFtwYXJ0aWFsXWAgYXR0cmlidXRlIHRvIGluY2x1ZGUgSFRNTCB3aXRoaW4gaXQgdGhhdCBtYXkgYmUgaW5zZXJ0ZWQgc29tZXdoZXJlXG4gIC8vIGluc2lkZSB0aGUgcGFydGlhbCdzIHRlbXBsYXRlLlxuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ1tjb250ZW50XScsIHtcbiAgICBwcmlvcml0eTogNDAsXG4gICAgY29tcGlsZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHRoaXMuZWxlbWVudC5jaGlsZE5vZGVzLmxlbmd0aCkge1xuICAgICAgICB0aGlzLmRlZmF1bHRDb250ZW50ID0gZnJhZ21lbnRzLmNyZWF0ZVRlbXBsYXRlKHRoaXMuZWxlbWVudC5jaGlsZE5vZGVzKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGJvdW5kOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciB0ZW1wbGF0ZSA9IHRoaXMuY29udGV4dC5fcGFydGlhbENvbnRlbnQgfHwgdGhpcy5kZWZhdWx0Q29udGVudDtcbiAgICAgIGlmICh0ZW1wbGF0ZSkge1xuICAgICAgICB0aGlzLmNvbnRlbnQgPSB0ZW1wbGF0ZS5jcmVhdGVWaWV3KCk7XG4gICAgICAgIHRoaXMuZWxlbWVudC5hcHBlbmRDaGlsZCh0aGlzLmNvbnRlbnQpO1xuICAgICAgICB0aGlzLmNvbnRlbnQuYmluZCh0aGlzLmNvbnRleHQpO1xuICAgICAgfVxuICAgIH0sXG4gICAgdW5ib3VuZDogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAodGhpcy5jb250ZW50KSB7XG4gICAgICAgIHRoaXMuY29udGVudC5kaXNwb3NlKCk7XG4gICAgICAgIHRoaXMuY29udGVudCA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuXG5cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdbcm91dGVdJywgUGFydGlhbEJpbmRlci5leHRlbmQoe1xuICAgIGNvbXBpbGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIFBhcnRpYWxCaW5kZXIucHJvdG90eXBlLmNvbXBpbGVkLmNhbGwodGhpcyk7XG4gICAgICB0aGlzLmV4cHJlc3Npb24gPSAncm91dGVQYXRoW3JvdXRlRGVwdGhdJztcbiAgICB9LFxuXG4gICAgYmluZDogZnVuY3Rpb24oY29udGV4dCkge1xuICAgICAgLy8gRGVsZXRlIGFueSBkZXB0aCBleGlzdGluZyBvbiB0aGUgY29udHJvbGxlciBhbmQgc2V0IGl0cyBkZXB0aCB0byAxIG1vcmUgdGhhbiBpdHMgcGFyZW50IGNvbnRyb2xsZXJzLlxuICAgICAgZGVsZXRlIGNvbnRleHQucm91dGVEZXB0aDtcbiAgICAgIGNvbnRleHQucm91dGVEZXB0aCA9IGNvbnRleHQucm91dGVEZXB0aCA9PSBudWxsID8gMCA6IGNvbnRleHQucm91dGVEZXB0aCArIDE7XG4gICAgICByZXR1cm4gUGFydGlhbEJpbmRlci5wcm90b3R5cGUuYmluZC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH0sXG5cbiAgICBnZXROYW1lOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlID8gdmFsdWUubmFtZSA6IHVuZGVmaW5lZDtcbiAgICB9XG4gIH0pKTtcblxuXG5cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdbY29udHJvbGxlcl0nLCB7XG4gICAgcHJpb3JpdHk6IDMwLFxuXG4gICAgY29tcGlsZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5iaW5kaW5ncyA9IGNvbXBpbGUoZnJhZ21lbnRzLCB0aGlzLmVsZW1lbnQpO1xuICAgIH0sXG5cbiAgICBjcmVhdGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuYmluZGluZ3MgPSB0aGlzLmJpbmRpbmdzLm1hcChmdW5jdGlvbihiaW5kaW5nKSB7XG4gICAgICAgIHJldHVybiBiaW5kaW5nLmNsb25lRm9yVmlldyh0aGlzLmVsZW1lbnQpO1xuICAgICAgfSwgdGhpcyk7XG4gICAgfSxcblxuICAgIGJvdW5kOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBjb250ZXh0ID0gdGhpcy5jb250ZXh0LmNyZWF0ZUNvbnRyb2xsZXIoeyBlbGVtZW50OiB0aGlzLmVsZW1lbnQsIG5hbWU6IHRoaXMub2JzZXJ2ZXIuZ2V0KCkgfSk7XG4gICAgICB0aGlzLmNoaWxkQ29udGV4dCA9IGNvbnRleHQ7XG4gICAgICB0aGlzLmJpbmRpbmdzLmZvckVhY2goZnVuY3Rpb24oYmluZGluZykge1xuICAgICAgICBiaW5kaW5nLmJpbmQoY29udGV4dCk7XG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgdW5ib3VuZDogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmJpbmRpbmdzLmZvckVhY2goZnVuY3Rpb24oYmluZGluZykge1xuICAgICAgICBiaW5kaW5nLnVuYmluZCgpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLmNoaWxkQ29udGV4dC5jbG9zZUNvbnRyb2xsZXIoKTtcbiAgICAgIHRoaXMuY2hpbGRDb250ZXh0ID0gbnVsbDtcbiAgICB9LFxuXG4gICAgZGlzcG9zZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5iaW5kaW5ncy5mb3JFYWNoKGZ1bmN0aW9uKGJpbmRpbmcpIHtcbiAgICAgICAgYmluZGluZy5kaXNwb3NlKCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuXG5cblxuXG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnW2RlYnVnXScsIGZyYWdtZW50cy51bnJlZ2lzdGVyQXR0cmlidXRlKCdkZWJ1ZycpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdbdGV4dF0nLCBmcmFnbWVudHMudW5yZWdpc3RlckF0dHJpYnV0ZSgndGV4dCcpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdbaHRtbF0nLCBmcmFnbWVudHMudW5yZWdpc3RlckF0dHJpYnV0ZSgnaHRtbCcpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdbY2xhc3M6Kl0nLCBmcmFnbWVudHMudW5yZWdpc3RlckF0dHJpYnV0ZSgnY2xhc3MtKicpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdbYXV0b2ZvY3VzXScsIGZyYWdtZW50cy51bnJlZ2lzdGVyQXR0cmlidXRlKCdhdXRvZm9jdXMnKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnW2F1dG9zZWxlY3RdJywgZnJhZ21lbnRzLnVucmVnaXN0ZXJBdHRyaWJ1dGUoJ2F1dG9zZWxlY3QnKSk7XG5cbiAgdmFyIFZhbHVlQmluZGVyID0gZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdbdmFsdWVdJywgZnJhZ21lbnRzLnVucmVnaXN0ZXJBdHRyaWJ1dGUoJ3ZhbHVlJykpO1xuICBWYWx1ZUJpbmRlci5wcm90b3R5cGUuZXZlbnRzQXR0ck5hbWUgPSAnW3ZhbHVlLWV2ZW50c10nO1xuICBWYWx1ZUJpbmRlci5wcm90b3R5cGUuZmllbGRBdHRyTmFtZSA9ICdbdmFsdWUtZmllbGRdJztcblxuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJygqKScsIGZyYWdtZW50cy51bnJlZ2lzdGVyQXR0cmlidXRlKCdvbi0qJykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJyhlbnRlciknLCBmcmFnbWVudHMudW5yZWdpc3RlckF0dHJpYnV0ZSgnb24tZW50ZXInKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnKGN0cmwtZW50ZXIpJywgZnJhZ21lbnRzLnVucmVnaXN0ZXJBdHRyaWJ1dGUoJ29uLWN0cmwtZW50ZXInKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnKGVzYyknLCBmcmFnbWVudHMudW5yZWdpc3RlckF0dHJpYnV0ZSgnb24tZXNjJykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJyhlc2NhcGUpJywgZnJhZ21lbnRzLmdldEF0dHJpYnV0ZUJpbmRlcignKGVzYyknKSk7XG5cbiAgdmFyIEF0dHJCaW5kZXIgPSBmcmFnbWVudHMudW5yZWdpc3RlckF0dHJpYnV0ZSgnKiQnKTtcbiAgQXR0ckJpbmRlci5wcm90b3R5cGUucHJpb3JpdHkgPSAtMTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdbKl0nLCBBdHRyQmluZGVyKTtcbiAgLypcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCcqPycsIGZyYWdtZW50cy51bnJlZ2lzdGVyQXR0cmlidXRlKCcqPycpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdjaGVja2VkPycsIGZyYWdtZW50cy5nZXRBdHRyaWJ1dGVCaW5kZXIoJ3ZhbHVlJykpO1xuICAqL1xuXG4gIHZhciBJZkJpbmRpbmcgPSBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ1tpZl0nLCBmcmFnbWVudHMuZ2V0QXR0cmlidXRlQmluZGVyKCdpZicpKTtcbiAgSWZCaW5kaW5nLnByb3RvdHlwZS51bmxlc3NBdHRyTmFtZSA9ICdbdW5sZXNzXSc7XG4gIElmQmluZGluZy5wcm90b3R5cGUuZWxzZUlmQXR0ck5hbWUgPSAnW2Vsc2UtaWZdJztcbiAgSWZCaW5kaW5nLnByb3RvdHlwZS5lbHNlVW5sZXNzQXR0ck5hbWUgPSAnW2Vsc2UtdW5sZXNzXSc7XG4gIElmQmluZGluZy5wcm90b3R5cGUuZWxzZUF0dHJOYW1lID0gJ1tlbHNlXSc7XG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnW3VubGVzc10nLCBJZkJpbmRpbmcpO1xuXG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnW3JlcGVhdF0nLCBmcmFnbWVudHMuZ2V0QXR0cmlidXRlQmluZGVyKCdyZXBlYXQnKSk7XG59XG4iLCJ2YXIgQXBwID0gcmVxdWlyZSgnLi9hcHAnKTtcblxuLy8gIyBDaGlwXG5cbi8vID4gQ2hpcC5qcyAyLjAuMFxuLy9cbi8vID4gKGMpIDIwMTMgSmFjb2IgV3JpZ2h0LCBUZWFtU25hcFxuLy8gQ2hpcCBtYXkgYmUgZnJlZWx5IGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cbi8vIEZvciBhbGwgZGV0YWlscyBhbmQgZG9jdW1lbnRhdGlvbjpcbi8vIDxodHRwczovL2dpdGh1Yi5jb20vdGVhbXNuYXAvY2hpcC8+XG5cbi8vIENvbnRlbnRzXG4vLyAtLS0tLS0tLVxuLy8gKiBbY2hpcF0oY2hpcC5odG1sKSB0aGUgbmFtZXNwYWNlLCBjcmVhdGVzIGFwcHMsIGFuZCByZWdpc3RlcnMgYmluZGluZ3MgYW5kIGZpbHRlcnNcbi8vICogW0FwcF0oYXBwLmh0bWwpIHJlcHJlc2VudHMgYW4gYXBwIHRoYXQgY2FuIGhhdmUgcm91dGVzLCBjb250cm9sbGVycywgYW5kIHRlbXBsYXRlcyBkZWZpbmVkXG4vLyAqIFtDb250cm9sbGVyXShjb250cm9sbGVyLmh0bWwpIGlzIHVzZWQgaW4gdGhlIGJpbmRpbmcgdG8gYXR0YWNoIGRhdGEgYW5kIHJ1biBhY3Rpb25zXG4vLyAqIFtSb3V0ZXJdKHJvdXRlci5odG1sKSBpcyB1c2VkIGZvciBoYW5kbGluZyBVUkwgcm91bnRpbmdcbi8vICogW0RlZmF1bHQgYmluZGVyc10oYmluZGVycy5odG1sKSByZWdpc3RlcnMgdGhlIGRlZmF1bHQgYmluZGVycyBjaGlwIHByb3ZpZGVzXG5cbi8vIENyZWF0ZSBDaGlwIEFwcFxuLy8gLS0tLS0tLS0tLS0tLVxuLy8gQ3JlYXRlcyBhIG5ldyBjaGlwIGFwcFxubW9kdWxlLmV4cG9ydHMgPSBjaGlwO1xuXG5mdW5jdGlvbiBjaGlwKG5hbWUsIHJvb3QpIHtcbiAgdmFyIGFwcCA9IG5ldyBBcHAobmFtZSk7XG4gIGFwcC5pbml0QXBwKHJvb3QpO1xuICByZXR1cm4gYXBwO1xufVxuXG5jaGlwLkFwcCA9IEFwcDtcbmNoaXAuRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnLi9ldmVudHMnKTtcbmNoaXAuQ29udHJvbGxlciA9IHJlcXVpcmUoJy4vY29udHJvbGxlcicpO1xuY2hpcC5Sb3V0ZXIgPSByZXF1aXJlKCcuL3JvdXRlcicpO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBDb250cm9sbGVyO1xudmFyIE9ic2VydmVyID0gcmVxdWlyZSgnZnJhZ21lbnRzLWpzL3NyYy9vYnNlcnZlcicpO1xudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJy4vZXZlbnRzJyk7XG5cbi8vICMgQ2hpcCBDb250cm9sbGVyXG5cbi8vIEEgQ29udHJvbGxlciBpcyB0aGUgb2JqZWN0IHRvIHdoaWNoIEhUTUwgZWxlbWVudHMgYXJlIGJvdW5kLlxuZnVuY3Rpb24gQ29udHJvbGxlcigpIHtcbiAgLy8gRWFjaCBjb250cm9sbGVyIG5lZWRzIHVuaXF1ZSBpbnN0YW5jZXMgb2YgdGhlc2UgcHJvcGVydGllcy4gSWYgd2UgZG9uJ3Qgc2V0IHRoZW0gaGVyZSB0aGV5IHdpbGwgYmUgaW5oZXJpdGVkIGZyb21cbiAgLy8gdGhlIHByb3RvdHlwZSBjaGFpbiBhbmQgY2F1c2UgaXNzdWVzLlxuICB0aGlzLl9vYnNlcnZlcnMgPSBbXTtcbiAgdGhpcy5fY2hpbGRyZW4gPSBbXTtcbiAgdGhpcy5fc3luY0xpc3RlbmVycyA9IFtdO1xuICB0aGlzLl9jbG9zZWQgPSBmYWxzZTtcbn1cblxuQ29udHJvbGxlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEV2ZW50RW1pdHRlci5wcm90b3R5cGUpO1xuQ29udHJvbGxlci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBDb250cm9sbGVyO1xuXG5cbi8vIFdhdGNoZXMgYW4gZXhwcmVzc2lvbiBmb3IgY2hhbmdlcy4gQ2FsbHMgdGhlIGBjYWxsYmFja2AgaW1tZWRpYXRlbHkgd2l0aCB0aGUgaW5pdGlhbCB2YWx1ZSBhbmQgdGhlbiBldmVyeSB0aW1lIHRoZVxuLy8gdmFsdWUgaW4gdGhlIGV4cHJlc3Npb24gY2hhbmdlcy4gQW4gZXhwcmVzc2lvbiBjYW4gYmUgYXMgc2ltcGxlIGFzIGBuYW1lYCBvciBhcyBjb21wbGV4IGFzIGB1c2VyLmZpcnN0TmFtZSArICcgJyArXG4vLyB1c2VyLmxhc3ROYW1lICsgJyAtICcgKyB1c2VyLmdldFBvc3RmaXgoKWBcbkNvbnRyb2xsZXIucHJvdG90eXBlLndhdGNoID0gZnVuY3Rpb24oZXhwciwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgIG9wdGlvbnMgPSB7fTtcbiAgfVxuXG4gIGlmIChBcnJheS5pc0FycmF5KGV4cHIpKSB7XG4gICAgdmFyIG9yaWdDYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgIHZhciBjYWxsZWRUaGlzUm91bmQgPSBmYWxzZTtcblxuICAgIC8vIHdpdGggbXVsdGlwbGUgb2JzZXJ2ZXJzLCBvbmx5IGNhbGwgdGhlIG9yaWdpbmFsIGNhbGxiYWNrIG9uY2Ugb24gY2hhbmdlc1xuICAgIGNhbGxiYWNrID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoY2FsbGVkVGhpc1JvdW5kKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY2FsbGVkVGhpc1JvdW5kID0gdHJ1ZTtcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIGNhbGxlZFRoaXNSb3VuZCA9IGZhbHNlO1xuICAgICAgfSk7XG5cbiAgICAgIHZhciB2YWx1ZXMgPSBvYnNlcnZlcnMubWFwKGZ1bmN0aW9uKG9ic2VydmVyKSB7XG4gICAgICAgIHJldHVybiBvYnNlcnZlci5nZXQoKTtcbiAgICAgIH0pO1xuICAgICAgb3JpZ0NhbGxiYWNrLmFwcGx5KG51bGwsIHZhbHVlcyk7XG4gICAgfTtcblxuXG4gICAgdmFyIG9ic2VydmVycyA9IGV4cHIubWFwKGZ1bmN0aW9uKGV4cHIpIHtcbiAgICAgIHRoaXMud2F0Y2goZXhwciwgb3B0aW9ucywgY2FsbGJhY2spO1xuICAgIH0sIHRoaXMpO1xuXG4gICAgaWYgKCFvcHRpb25zLnNraXBJbml0aWFsKSB7XG4gICAgICBjYWxsYmFjaygpO1xuICAgIH1cblxuICAgIHJldHVybiBvYnNlcnZlcnM7XG4gIH0gZWxzZSB7XG4gICAgdmFyIG9ic2VydmVyID0gbmV3IE9ic2VydmVyKGV4cHIsIGNhbGxiYWNrLCB0aGlzKTtcbiAgICBvYnNlcnZlci5nZXRDaGFuZ2VSZWNvcmRzID0gb3B0aW9ucy5nZXRDaGFuZ2VSZWNvcmRzO1xuICAgIG9ic2VydmVyLmJpbmQodGhpcywgb3B0aW9ucy5za2lwSW5pdGlhbCk7XG5cbiAgICAvLyBTdG9yZSB0aGUgb2JzZXJ2ZXJzIHdpdGggdGhlIGNvbnRyb2xsZXIgc28gd2hlbiBpdCBpcyBjbG9zZWQgd2UgY2FuIGNsZWFuIHVwIGFsbCBvYnNlcnZlcnMgYXMgd2VsbFxuICAgIHRoaXMuX29ic2VydmVycy5wdXNoKG9ic2VydmVyKTtcbiAgICByZXR1cm4gb2JzZXJ2ZXI7XG4gIH1cbn1cblxuLy8gU3RvcCB3YXRjaGluZyBhbiBleHByZXNzaW9uIGZvciBjaGFuZ2VzLlxuQ29udHJvbGxlci5wcm90b3R5cGUudW53YXRjaCA9IGZ1bmN0aW9uKGV4cHIsIGNhbGxiYWNrKSB7XG4gIHJldHVybiB0aGlzLl9vYnNlcnZlcnMuc29tZShmdW5jdGlvbihvYnNlcnZlciwgaW5kZXgpIHtcbiAgICBpZiAob2JzZXJ2ZXIuZXhwciA9PT0gZXhwciAmJiBvYnNlcnZlci5jYWxsYmFjayA9PT0gY2FsbGJhY2spIHtcbiAgICAgIE9ic2VydmVyLnJlbW92ZShvYnNlcnZlcik7XG4gICAgICB0aGlzLl9vYnNlcnZlcnMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfSwgdGhpcyk7XG59O1xuXG4vLyBFdmFsdWF0ZXMgYW4gZXhwcmVzc2lvbiBpbW1lZGlhdGVseSwgcmV0dXJuaW5nIHRoZSByZXN1bHRcbkNvbnRyb2xsZXIucHJvdG90eXBlLmV2YWwgPSBmdW5jdGlvbihleHByLCBhcmdzKSB7XG4gIGlmIChhcmdzKSB7XG4gICAgb3B0aW9ucyA9IHsgYXJnczogT2JqZWN0LmtleXMoYXJncykgfTtcbiAgICB2YWx1ZXMgPSBvcHRpb25zLmFyZ3MubWFwKGZ1bmN0aW9uKGtleSkgeyByZXR1cm4gYXJnc1trZXldOyB9KTtcbiAgfVxuICByZXR1cm4gT2JzZXJ2ZXIuZXhwcmVzc2lvbi5nZXQoZXhwciwgb3B0aW9ucykuYXBwbHkodGhpcywgdmFsdWVzKTtcbn07XG5cblxuLy8gRXZhbHVhdGVzIGFuIGV4cHJlc3Npb24gaW1tZWRpYXRlbHkgYXMgYSBzZXR0ZXIsIHNldHRpbmcgYHZhbHVlYCB0byB0aGUgZXhwcmVzc2lvbiBydW5uaW5nIHRocm91Z2ggZmlsdGVycy5cbkNvbnRyb2xsZXIucHJvdG90eXBlLmV2YWxTZXR0ZXIgPSBmdW5jdGlvbihleHByLCB2YWx1ZSkge1xuICB2YXIgY29udGV4dCA9IHRoaXMuaGFzT3duUHJvcGVydHkoJ19vcmlnQ29udGV4dF8nKSA/IHRoaXMuX29yaWdDb250ZXh0XyA6IHRoaXM7XG4gIGV4cHJlc3Npb24uZ2V0U2V0dGVyKGV4cHIpLmNhbGwoY29udGV4dCwgdmFsdWUpO1xufTtcblxuXG4vLyBDbG9uZXMgdGhlIG9iamVjdCBhdCB0aGUgZ2l2ZW4gcHJvcGVydHkgbmFtZSBmb3IgcHJvY2Vzc2luZyBmb3Jtc1xuQ29udHJvbGxlci5wcm90b3R5cGUuY2xvbmVWYWx1ZSA9IGZ1bmN0aW9uKHByb3BlcnR5KSB7XG4gIE9ic2VydmVyLmV4cHJlc3Npb24uZGlmZi5jbG9uZSh0aGlzW3Byb3BlcnR5XSk7XG59O1xuXG5cbi8vIFJlbW92ZXMgYW5kIGNsb3NlcyBhbGwgb2JzZXJ2ZXJzIGZvciBnYXJiYWdlLWNvbGxlY3Rpb25cbkNvbnRyb2xsZXIucHJvdG90eXBlLmNsb3NlQ29udHJvbGxlciA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5fY2xvc2VkKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdGhpcy5fY2xvc2VkID0gdHJ1ZTtcblxuICB0aGlzLl9jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgY2hpbGQuX3BhcmVudCA9IG51bGw7XG4gICAgY2hpbGQuY2xvc2VDb250cm9sbGVyKCk7XG4gIH0pO1xuXG4gIGlmICh0aGlzLl9wYXJlbnQpIHtcbiAgICB2YXIgaW5kZXggPSB0aGlzLl9wYXJlbnQuX2NoaWxkcmVuLmluZGV4T2YodGhpcyk7XG4gICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgdGhpcy5fcGFyZW50Ll9jaGlsZHJlbi5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH1cbiAgICB0aGlzLl9wYXJlbnQgPSBudWxsXG4gIH1cblxuICBpZiAodGhpcy5oYXNPd25Qcm9wZXJ0eSgnYmVmb3JlQ2xvc2UnKSkge1xuICAgIHRoaXMuYmVmb3JlQ2xvc2UoKTtcbiAgfVxuXG4gIHRoaXMuX3N5bmNMaXN0ZW5lcnMuZm9yRWFjaChmdW5jdGlvbihsaXN0ZW5lcikge1xuICAgIE9ic2VydmVyLnJlbW92ZU9uU3luYyhsaXN0ZW5lcik7XG4gIH0pO1xuICB0aGlzLl9zeW5jTGlzdGVuZXJzLmxlbmd0aCA9IDA7XG5cbiAgdGhpcy5fb2JzZXJ2ZXJzLmZvckVhY2goZnVuY3Rpb24ob2JzZXJ2ZXIpIHtcbiAgICBPYnNlcnZlci5yZW1vdmUob2JzZXJ2ZXIpO1xuICB9KTtcbiAgdGhpcy5fb2JzZXJ2ZXJzLmxlbmd0aCA9IDA7XG5cbiAgaWYgKHRoaXMuaGFzT3duUHJvcGVydHkoJ29uQ2xvc2UnKSkge1xuICAgIHRoaXMub25DbG9zZSgpO1xuICB9XG59O1xuXG5cbi8vIFN5bmNzIHRoZSBvYnNlcnZlcnMgdG8gcHJvcG9nYXRlIGNoYW5nZXMgdG8gdGhlIEhUTUwsIGNhbGwgY2FsbGJhY2sgYWZ0ZXJcbkNvbnRyb2xsZXIucHJvdG90eXBlLnN5bmMgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICBPYnNlcnZlci5zeW5jKGNhbGxiYWNrKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbi8vIFJ1bnMgdGhlIHN5bmMgb24gdGhlIG5leHQgdGljaywgY2FsbCBjYWxsYmFjayBhZnRlclxuQ29udHJvbGxlci5wcm90b3R5cGUuc3luY0xhdGVyID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgT2JzZXJ2ZXIuc3luY0xhdGVyKGNhbGxiYWNrKVxuICByZXR1cm4gdGhpcztcbn07XG5cblxuLy8gU3luY3MgdGhlIG9ic2VydmVycyB0byBwcm9wb2dhdGUgY2hhbmdlcyB0byB0aGUgSFRNTCBmb3IgdGhpcyBjb250cm9sbGVyIG9ubHlcbkNvbnRyb2xsZXIucHJvdG90eXBlLnN5bmNUaGlzID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuX29ic2VydmVycy5mb3JFYWNoKGZ1bmN0aW9uKG9ic2VydmVyKSB7XG4gICAgb2JzZXJ2ZXIuc3luYygpO1xuICB9KTtcbiAgdGhpcy5fY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihjaGlsZCkge1xuICAgIGNoaWxkLnN5bmNUaGlzKCk7XG4gIH0pO1xuICByZXR1cm4gdGhpcztcbn07XG5cblxuLy8gY2FsbCBjYWxsYmFjayBhZnRlciB0aGUgY3VycmVudCBzeW5jXG5Db250cm9sbGVyLnByb3RvdHlwZS5hZnRlclN5bmMgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICBPYnNlcnZlci5hZnRlclN5bmMoY2FsbGJhY2spO1xuICByZXR1cm4gdGhpcztcbn07XG5cblxuLy8gUnVucyB0aGUgbGlzdGVuZXIgb24gZXZlcnkgc3luYywgc3RvcHMgb25jZSB0aGUgY29udHJvbGxlciBpcyBjbG9zZWRcbkNvbnRyb2xsZXIucHJvdG90eXBlLm9uU3luYyA9IGZ1bmN0aW9uKGxpc3RlbmVyKSB7XG4gIHRoaXMuX3N5bmNMaXN0ZW5lcnMucHVzaChsaXN0ZW5lcik7XG4gIE9ic2VydmVyLm9uU3luYyhsaXN0ZW5lcik7XG4gIHJldHVybiB0aGlzO1xufVxuXG5cbi8vIFJlbW92ZXMgYSBzeW5jIGxpc3RlbmVyXG5Db250cm9sbGVyLnByb3RvdHlwZS5yZW1vdmVPblN5bmMgPSBmdW5jdGlvbihsaXN0ZW5lcikge1xuICB2YXIgaW5kZXggPSB0aGlzLl9zeW5jTGlzdGVuZXJzLmluZGV4T2YobGlzdGVuZXIpO1xuICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgdGhpcy5fc3luY0xpc3RlbmVycy5zcGxpY2UoaW5kZXgsIDEpO1xuICB9XG4gIE9ic2VydmVyLnJlbW92ZU9uU3luYyhsaXN0ZW5lcik7XG4gIHJldHVybiB0aGlzO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBBIHNpbXBsZSBldmVudCBlbWl0dGVyIHRvIHByb3ZpZGUgYW4gZXZlbnRpbmcgc3lzdGVtLlxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKGVtaXR0ZXIpIHtcbiAgaWYgKHRoaXMgaW5zdGFuY2VvZiBFdmVudEVtaXR0ZXIpIHtcbiAgICBlbWl0dGVyID0gdGhpcztcbiAgfVxuXG4gIHZhciBub2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuXG4gIC8vIEFkZCBldmVudCBsaXN0ZW5lclxuICBlbWl0dGVyLm9uID0gZW1pdHRlci5hZGRFdmVudExpc3RlbmVyID0gbm9kZS5hZGRFdmVudExpc3RlbmVyLmJpbmQobm9kZSk7XG5cbiAgLy8gUmVtb3ZlcyBldmVudCBsaXN0ZW5lclxuICBlbWl0dGVyLm9mZiA9IGVtaXR0ZXIucmVtb3ZlRXZlbnRMaXN0ZW5lciA9IG5vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lci5iaW5kKG5vZGUpO1xuXG4gIC8vIEFkZCBldmVudCBsaXN0ZW5lciB0byBvbmx5IGdldCBjYWxsZWQgb25jZSwgcmV0dXJucyB3cmFwcGVkIG1ldGhvZCBmb3IgcmVtb3ZpbmcgaWYgbmVlZGVkXG4gIGVtaXR0ZXIub25lID0gZnVuY3Rpb24gb25lKHR5cGUsIGxpc3RlbmVyKSB7XG4gICAgZnVuY3Rpb24gb25lKGV2ZW50KSB7XG4gICAgICBlbWl0dGVyLm9mZih0eXBlLCBvbmUpO1xuICAgICAgaWYgKHR5cGVvZiBsaXN0ZW5lciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBsaXN0ZW5lci5jYWxsKGV2ZW50KTtcbiAgICAgIH1cbiAgICB9XG4gICAgZW1pdHRlci5vbih0eXBlLCBvbmUpO1xuICAgIHJldHVybiBvbmU7XG4gIH1cblxuICAvLyBEaXNwYXRjaCBldmVudCBhbmQgdHJpZ2dlciBsaXN0ZW5lcnNcbiAgZW1pdHRlci5kaXNwYXRjaEV2ZW50ID0gZnVuY3Rpb24gZGlzcGF0Y2hFdmVudChldmVudCkge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShldmVudCwgJ3RhcmdldCcsIHsgdmFsdWU6IGVtaXR0ZXIgfSk7XG4gICAgcmV0dXJuIG5vZGUuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gUm91dGVyO1xuUm91dGVyLlJvdXRlID0gUm91dGU7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnLi9ldmVudHMnKTtcblxuLy8gIyBDaGlwIFJvdXRpbmdcblxuLy8gV29yayBpbnNwaXJlZCBieSBhbmQgaW4gc29tZSBjYXNlcyBiYXNlZCBvZmYgb2Ygd29yayBkb25lIGZvciBFeHByZXNzLmpzIChodHRwczovL2dpdGh1Yi5jb20vdmlzaW9ubWVkaWEvZXhwcmVzcylcbi8vIEV2ZW50czogZXJyb3IsIGNoYW5nZVxuZnVuY3Rpb24gUm91dGVyKCkge1xuICBFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcbiAgdGhpcy5yb3V0ZXMgPSBbXTtcbiAgdGhpcy5wYXJhbXMgPSB7fTtcbiAgdGhpcy5wYXJhbXNFeHAgPSB7fTtcbiAgdGhpcy5wcmVmaXggPSAnJztcbn1cblxuUm91dGVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnRFbWl0dGVyLnByb3RvdHlwZSk7XG5cblxuLy8gUmVnaXN0ZXJzIGEgYGNhbGxiYWNrYCBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2hlbiB0aGUgZ2l2ZW4gcGFyYW0gYG5hbWVgIGlzIG1hdGNoZWQgaW4gYSBVUkxcblJvdXRlci5wcm90b3R5cGUucGFyYW0gPSBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaykge1xuICBpZiAodHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgKHRoaXMucGFyYW1zW25hbWVdIHx8ICh0aGlzLnBhcmFtc1tuYW1lXSA9IFtdKSkucHVzaChjYWxsYmFjayk7XG4gIH0gZWxzZSBpZiAoY2FsbGJhY2sgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICB0aGlzLnBhcmFtc0V4cFtuYW1lXSA9IGNhbGxiYWNrO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3BhcmFtIG11c3QgaGF2ZSBhIGNhbGxiYWNrIG9mIHR5cGUgXCJmdW5jdGlvblwiIG9yIFJlZ0V4cC4gR290ICcgKyBjYWxsYmFjayArICcuJyk7XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbi8vIFJlZ2lzdGVycyBhIGBjYWxsYmFja2AgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdoZW4gdGhlIGdpdmVuIHBhdGggbWF0Y2hlcyBhIFVSTC4gVGhlIGNhbGxiYWNrIHJlY2VpdmVzIHR3b1xuLy8gYXJndW1lbnRzLCBgcmVxYCwgYW5kIGBuZXh0YCwgd2hlcmUgYHJlcWAgcmVwcmVzZW50cyB0aGUgcmVxdWVzdCBhbmQgaGFzIHRoZSBwcm9wZXJ0aWVzLCBgdXJsYCwgYHBhdGhgLCBgcGFyYW1zYFxuLy8gYW5kIGBxdWVyeWAuIGByZXEucGFyYW1zYCBpcyBhbiBvYmplY3Qgd2l0aCB0aGUgcGFyYW1ldGVycyBmcm9tIHRoZSBwYXRoIChlLmcuIC86dXNlcm5hbWUvKiB3b3VsZCBtYWtlIGEgcGFyYW1zXG4vLyBvYmplY3Qgd2l0aCB0d28gcHJvcGVydGllcywgYHVzZXJuYW1lYCBhbmQgYCpgKS4gYHJlcS5xdWVyeWAgaXMgYW4gb2JqZWN0IHdpdGgga2V5LXZhbHVlIHBhaXJzIGZyb20gdGhlIHF1ZXJ5XG4vLyBwb3J0aW9uIG9mIHRoZSBVUkwuXG5Sb3V0ZXIucHJvdG90eXBlLnJvdXRlID0gZnVuY3Rpb24ocGF0aCwgY2FsbGJhY2spIHtcbiAgaWYgKHR5cGVvZiBjYWxsYmFjayAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3JvdXRlIG11c3QgaGF2ZSBhIGNhbGxiYWNrIG9mIHR5cGUgXCJmdW5jdGlvblwiLiBHb3QgJyArIGNhbGxiYWNrICsgJy4nKTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgcGF0aCA9PT0gJ3N0cmluZycpIHtcbiAgICBwYXRoID0gJy8nICsgcGF0aDtcbiAgICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXC97Mix9L2csICcvJyk7XG4gIH1cbiAgdGhpcy5yb3V0ZXMucHVzaChuZXcgUm91dGUocGF0aCwgY2FsbGJhY2spKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5cblJvdXRlci5wcm90b3R5cGUucmVkaXJlY3QgPSBmdW5jdGlvbih1cmwsIHJlcGxhY2UpIHtcbiAgaWYgKHVybC5jaGFyQXQoMCkgPT09ICcuJyB8fCB1cmwuc3BsaXQoJy8vJykubGVuZ3RoID4gMSkge1xuICAgIHZhciBwYXRoUGFydHMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gICAgcGF0aFBhcnRzLmhyZWYgPSB1cmw7XG4gICAgdXJsID0gcGF0aG5hbWUocGF0aFBhcnRzKSArIHBhdGhQYXJ0cy5zZWFyY2g7XG4gIH0gZWxzZSB7XG4gICAgdXJsID0gdGhpcy5wcmVmaXggKyB1cmw7XG4gIH1cblxuICBpZiAodGhpcy5jdXJyZW50VXJsID09PSB1cmwpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBSZWRpcmVjdHMgaWYgdGhlIHVybCBpc24ndCBhdCB0aGlzIHBhZ2UuXG4gIGlmICghdGhpcy5oYXNoT25seSAmJiB0aGlzLnJvb3QgJiYgdXJsLmluZGV4T2YodGhpcy5yb290KSAhPT0gMCkge1xuICAgIGxvY2F0aW9uLmhyZWYgPSB1cmw7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmFyIG5vdEZvdW5kID0gZmFsc2U7XG4gIGZ1bmN0aW9uIGVyckhhbmRsZXIoZXZlbnQpIHtcbiAgICBpZiAoZXZlbnQuZGV0YWlsID09PSAnbm90Rm91bmQnKSB7XG4gICAgICBub3RGb3VuZCA9IHRydWU7XG4gICAgfVxuICB9XG4gIHRoaXMub24oJ2Vycm9yJywgZXJySGFuZGxlcik7XG5cbiAgaWYgKHRoaXMudXNlUHVzaFN0YXRlKSB7XG4gICAgaWYgKHJlcGxhY2UpIHtcbiAgICAgIGhpc3RvcnkucmVwbGFjZVN0YXRlKHt9LCAnJywgdXJsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaGlzdG9yeS5wdXNoU3RhdGUoe30sICcnLCB1cmwpO1xuICAgIH1cbiAgICB0aGlzLmN1cnJlbnRVcmwgPSB1cmw7XG4gICAgdGhpcy5kaXNwYXRjaCh1cmwpO1xuICB9IGVsc2Uge1xuICAgIGlmICghdGhpcy5oYXNoT25seSkge1xuICAgICAgdXJsID0gdXJsLnJlcGxhY2UodGhpcy5yb290LCAnJyk7XG4gICAgICBpZiAodXJsLmNoYXJBdCgwKSAhPT0gJy8nKSB7XG4gICAgICAgIHVybCA9ICcvJyArIHVybDtcbiAgICAgIH1cbiAgICB9XG4gICAgbG9jYXRpb24uaGFzaCA9ICh1cmwgPT09ICcvJyA/ICcnIDogJyMnICsgdXJsKTtcbiAgfVxuXG4gIHRoaXMub2ZmKCdlcnJvcicsIGVyckhhbmRsZXIpO1xuICByZXR1cm4gIW5vdEZvdW5kO1xufTtcblxuXG5Sb3V0ZXIucHJvdG90eXBlLmxpc3RlbiA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgaWYgKCFvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IHt9O1xuICB9XG4gIGlmIChvcHRpb25zLnN0b3ApIHtcbiAgICBpZiAodGhpcy5faGFuZGxlQ2hhbmdlKSB7XG4gICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCB0aGlzLl9oYW5kbGVDaGFuZ2UpO1xuICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2hhc2hDaGFuZ2UnLCB0aGlzLl9oYW5kbGVDaGFuZ2UpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGlmIChvcHRpb25zLnJvb3QgIT0gbnVsbCkgdGhpcy5yb290ID0gb3B0aW9ucy5yb290O1xuICBpZiAob3B0aW9ucy5wcmVmaXggIT0gbnVsbCkgdGhpcy5wcmVmaXggPSBvcHRpb25zLnByZWZpeDtcbiAgaWYgKG9wdGlvbnMuaGFzaE9ubHkgIT0gbnVsbCkgdGhpcy5oYXNoT25seSA9IG9wdGlvbnMuaGFzaE9ubHk7XG4gIHRoaXMudXNlUHVzaFN0YXRlID0gIXRoaXMuaGFzaE9ubHkgJiYgd2luZG93Lmhpc3RvcnkgJiYgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlICYmIHRydWU7XG4gIGlmICh0aGlzLnJvb3QgPT0gbnVsbCAmJiAhdGhpcy51c2VQdXNoU3RhdGUpIHRoaXMuaGFzaE9ubHkgPSB0cnVlO1xuICBpZiAodGhpcy5oYXNPbmx5KSB0aGlzLnByZWZpeCA9ICcnO1xuICB2YXIgZXZlbnROYW1lLCBnZXRVcmw7XG5cbiAgdGhpcy5faGFuZGxlQ2hhbmdlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHVybCA9IGdldFVybCgpO1xuICAgIGlmICh0aGlzLmN1cnJlbnRVcmwgPT09IHVybCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmN1cnJlbnRVcmwgPSB1cmw7XG4gICAgdGhpcy5kaXNwYXRjaCh1cmwpO1xuICB9LmJpbmQodGhpcyk7XG5cblxuICBpZiAodGhpcy51c2VQdXNoU3RhdGUpIHtcbiAgICAvLyBGaXggdGhlIFVSTCBpZiBsaW5rZWQgd2l0aCBhIGhhc2hcbiAgICBpZiAobG9jYXRpb24uaGFzaCkge1xuICAgICAgdXJsID0gbG9jYXRpb24ucGF0aG5hbWUucmVwbGFjZSgvXFwvJC8sICcnKSArIGxvY2F0aW9uLmhhc2gucmVwbGFjZSgvXiM/XFwvPy8sICcvJyk7XG4gICAgICBoaXN0b3J5LnJlcGxhY2VTdGF0ZSh7fSwgJycsIHVybCk7XG4gICAgfVxuXG4gICAgZXZlbnROYW1lID0gJ3BvcHN0YXRlJztcbiAgICBnZXRVcmwgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBsb2NhdGlvbi5wYXRobmFtZSArIGxvY2F0aW9uLnNlYXJjaDtcbiAgICB9O1xuICB9IGVsc2Uge1xuXG4gICAgZXZlbnROYW1lID0gJ2hhc2hjaGFuZ2UnO1xuICAgIGdldFVybCA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGxvY2F0aW9uLmhhc2gucmVwbGFjZSgvXiNcXC8/LywgJy8nKSB8fCAnLyc7XG4gICAgfTtcbiAgfVxuXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgdGhpcy5faGFuZGxlQ2hhbmdlKTtcblxuICB0aGlzLl9oYW5kbGVDaGFuZ2UoKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbnZhciB1cmxQYXJ0cyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcblxuUm91dGVyLnByb3RvdHlwZS5nZXRVcmxQYXJ0cyA9IGZ1bmN0aW9uKHVybCkge1xuICB1cmxQYXJ0cy5ocmVmID0gdXJsO1xuICB2YXIgcGF0aCA9IHBhdGhuYW1lKHVybFBhcnRzKTtcbiAgaWYgKHBhdGguaW5kZXhPZih0aGlzLnByZWZpeCkgIT09IDApIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBwYXRoID0gcGF0aC5yZXBsYWNlKHRoaXMucHJlZml4LCAnJyk7XG4gIGlmIChwYXRoLmNoYXJBdCgwKSAhPT0gJy8nKSB7XG4gICAgcGF0aCA9ICcvJyArIHBhdGg7XG4gIH1cbiAgcmV0dXJuIHsgcGF0aDogcGF0aCwgcXVlcnk6IHVybFBhcnRzLnNlYXJjaCB9O1xufTtcblxuXG5Sb3V0ZXIucHJvdG90eXBlLmdldFJvdXRlc01hdGNoaW5nUGF0aCA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgaWYgKHBhdGggPT0gbnVsbCkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuICB2YXIgcGFyYW1zRXhwID0gdGhpcy5wYXJhbXNFeHA7XG5cbiAgcmV0dXJuIHRoaXMucm91dGVzLmZpbHRlcihmdW5jdGlvbihyb3V0ZSkge1xuICAgIGlmICghcm91dGUubWF0Y2gocGF0aCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gT2JqZWN0LmtleXMocm91dGUucGFyYW1zKS5ldmVyeShmdW5jdGlvbihrZXkpIHtcbiAgICAgIHZhciB2YWx1ZSA9IHJvdXRlLnBhcmFtc1trZXldO1xuICAgICAgcmV0dXJuICFwYXJhbXNFeHAuaGFzT3duUHJvcGVydHkoa2V5KSB8fCBwYXJhbXNFeHBba2V5XS50ZXh0KHZhbHVlKTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG5cblxuLy8gRGlzcGF0Y2hlcyBhbGwgY2FsbGJhY2tzIHdoaWNoIG1hdGNoIHRoZSBgdXJsYC4gYHVybGAgc2hvdWxkIGJlIHRoZSBmdWxsIHBhdGhuYW1lIG9mIHRoZSBsb2NhdGlvbiBhbmQgc2hvdWxkIG5vdFxuLy8gYmUgdXNlZCBieSB5b3VyIGFwcGxpY2F0aW9uLiBVc2UgYHJlZGlyZWN0KClgIGluc3RlYWQuXG5Sb3V0ZXIucHJvdG90eXBlLmRpc3BhdGNoID0gZnVuY3Rpb24odXJsKSB7XG4gIHZhciB1cmxQYXJ0cyA9IHRoaXMuZ2V0VXJsUGFydHModXJsKTtcbiAgaWYgKCF1cmxQYXJ0cykge1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgcGF0aCA9IHVybFBhcnRzLnBhdGg7XG4gIHZhciByZXEgPSB7IHVybDogdXJsLCBwYXRoOiBwYXRoLCBxdWVyeTogcGFyc2VRdWVyeSh1cmxQYXJ0cy5xdWVyeSkgfTtcbiAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnY2hhbmdlJywgeyBkZXRhaWw6IHBhdGggfSkpO1xuXG4gIHZhciByb3V0ZXMgPSB0aGlzLmdldFJvdXRlc01hdGNoaW5nUGF0aChwYXRoKTtcbiAgdmFyIGNhbGxiYWNrcyA9IFtdO1xuICB2YXIgcGFyYW1zID0gdGhpcy5wYXJhbXM7XG5cbiAgLy8gQWRkIGFsbCB0aGUgY2FsbGJhY2tzIGZvciB0aGlzIFVSTCAoYWxsIG1hdGNoaW5nIHJvdXRlcyBhbmQgdGhlIHBhcmFtcyB0aGV5J3JlIGRlcGVuZGVudCBvbilcbiAgcm91dGVzLmZvckVhY2goZnVuY3Rpb24ocm91dGUpIHtcbiAgICAvLyBzZXQgdGhlIHBhcmFtcyBvbiB0aGUgcmVxIG9iamVjdCBmaXJzdFxuICAgIGNhbGxiYWNrcy5wdXNoKGZ1bmN0aW9uKHJlcSwgbmV4dCkge1xuICAgICAgcmVxLnBhcmFtcyA9IHJvdXRlLnBhcmFtcztcbiAgICAgIG5leHQoKTtcbiAgICB9KTtcblxuICAgIE9iamVjdC5rZXlzKHJvdXRlLnBhcmFtcykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgIHZhciBwYXJhbUNhbGxiYWNrcyA9IHRoaXMucGFyYW1zW2tleV07XG4gICAgICBpZiAocGFyYW1DYWxsYmFja3MpIHtcbiAgICAgICAgY2FsbGJhY2tzLnB1c2guYXBwbHkoY2FsbGJhY2tzLCBwYXJhbUNhbGxiYWNrcyk7XG4gICAgICB9XG4gICAgfSwgdGhpcyk7XG5cbiAgICBjYWxsYmFja3MucHVzaChyb3V0ZS5jYWxsYmFjayk7XG4gIH0sIHRoaXMpO1xuXG4gIC8vIENhbGxzIGVhY2ggY2FsbGJhY2sgb25lIGJ5IG9uZSB1bnRpbCBlaXRoZXIgdGhlcmUgaXMgYW4gZXJyb3Igb3Igd2UgY2FsbCBhbGwgb2YgdGhlbS5cbiAgdmFyIG5leHQgPSBmdW5jdGlvbihlcnIpIHtcbiAgICBpZiAoZXJyKSB7XG4gICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdlcnJvcicsIHsgZGV0YWlsOiBlcnIgfSkpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghY2FsbGJhY2tzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIG5leHQoJ25vdEZvdW5kJyk7XG4gICAgfVxuXG4gICAgY2FsbGJhY2sgPSBjYWxsYmFja3Muc2hpZnQoKTtcbiAgICBjYWxsYmFjayhyZXEsIG5leHQpO1xuICB9LmJpbmQodGhpcyk7XG5cbiAgLy8gU3RhcnQgcnVubmluZyB0aGUgY2FsbGJhY2tzLCBvbmUgYnkgb25lXG4gIGlmIChjYWxsYmFja3MubGVuZ3RoID09PSAwKSB7XG4gICAgbmV4dCgnbm90Rm91bmQnKTtcbiAgfSBlbHNlIHtcbiAgICBuZXh0KCk7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cblxuLy8gRGVmaW5lcyBhIGNlbnRyYWwgcm91dGluZyBvYmplY3Qgd2hpY2ggaGFuZGxlcyBhbGwgVVJMIGNoYW5nZXMgYW5kIHJvdXRlcy5cbmZ1bmN0aW9uIFJvdXRlKHBhdGgsIGNhbGxiYWNrKSB7XG4gIHRoaXMucGF0aCA9IHBhdGg7XG4gIHRoaXMuY2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgdGhpcy5rZXlzID0gW107XG4gIHRoaXMuZXhwciA9IHBhcnNlUGF0aChwYXRoLCB0aGlzLmtleXMpO1xufVxuXG5cbi8vIERldGVybWluZXMgd2hldGhlciByb3V0ZSBtYXRjaGVzIHBhdGhcblJvdXRlLnByb3RvdHlwZS5tYXRjaCA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIG1hdGNoID0gdGhpcy5leHByLmV4ZWMocGF0aCk7XG4gIGlmICghbWF0Y2gpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgdGhpcy5wYXJhbXMgPSB7fTtcblxuICBmb3IgKHZhciBpID0gMTsgaSA8IG1hdGNoLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGtleSA9IHRoaXMua2V5c1tpIC0gMV07XG4gICAgdmFyIHZhbHVlID0gbWF0Y2hbaV07XG5cbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgdmFsdWUgPSBkZWNvZGVVUklDb21wb25lbnQodmFsdWUpO1xuICAgIH1cblxuICAgIGlmICgha2V5KSB7XG4gICAgICBrZXkgPSAnKic7XG4gICAgfVxuXG4gICAgdGhpcy5wYXJhbXNba2V5XSA9IHZhbHVlO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5cbi8vIE5vcm1hbGl6ZXMgdGhlIGdpdmVuIHBhdGggc3RyaW5nLCByZXR1cm5pbmcgYSByZWd1bGFyIGV4cHJlc3Npb24uXG4vL1xuLy8gQW4gZW1wdHkgYXJyYXkgc2hvdWxkIGJlIHBhc3NlZCwgd2hpY2ggd2lsbCBjb250YWluIHRoZSBwbGFjZWhvbGRlciBrZXkgbmFtZXMuIEZvciBleGFtcGxlIGBcIi91c2VyLzppZFwiYCB3aWxsIHRoZW5cbi8vIGNvbnRhaW4gYFtcImlkXCJdYC5cbmZ1bmN0aW9uIHBhcnNlUGF0aChwYXRoLCBrZXlzKSB7XG4gIGlmIChwYXRoIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgcmV0dXJuIHBhdGg7XG4gIH1cblxuICBpZiAoQXJyYXkuaXNBcnJheShwYXRoKSkge1xuICAgIHBhdGggPSAnKCcgKyBwYXRoLmpvaW4oJ3wnKSArICcpJztcbiAgfVxuXG4gIHBhdGggPSBwYXRoXG4gICAgLmNvbmNhdCgnLz8nKVxuICAgIC5yZXBsYWNlKC9cXC9cXCgvZywgJyg/Oi8nKVxuICAgIC5yZXBsYWNlKC8oXFwvKT8oXFwuKT86KFxcdyspKD86KFxcKC4qP1xcKSkpPyhcXD8pPyhcXCopPy9nLCBmdW5jdGlvbihfLCBzbGFzaCwgZm9ybWF0LCBrZXksIGNhcHR1cmUsIG9wdGlvbmFsLCBzdGFyKSB7XG4gICAgICBrZXlzLnB1c2goa2V5KTtcbiAgICAgIHNsYXNoID0gc2xhc2ggfHwgJyc7XG4gICAgICB2YXIgZXhwciA9ICcnO1xuICAgICAgaWYgKCFvcHRpb25hbCkgZXhwciArPSBzbGFzaDtcbiAgICAgIGV4cHIgKz0gJyg/Oic7XG4gICAgICBpZiAob3B0aW9uYWwpIGV4cHIgKz0gc2xhc2g7XG4gICAgICBleHByICs9IGZvcm1hdCB8fCAnJztcbiAgICAgIGV4cHIgKz0gY2FwdHVyZSB8fCAoZm9ybWF0ICYmICcoW14vLl0rPyknIHx8ICcoW14vXSs/KScpICsgJyknO1xuICAgICAgZXhwciArPSBvcHRpb25hbCB8fCAnJztcbiAgICAgIGlmIChzdGFyKSBleHByICs9ICcoLyopPyc7XG4gICAgICByZXR1cm4gZXhwcjtcbiAgICB9KVxuICAgIC5yZXBsYWNlKC8oW1xcLy5dKS9nLCAnXFxcXCQxJylcbiAgICAucmVwbGFjZSgvXFwqL2csICcoLiopJyk7XG4gIHJldHVybiBuZXcgUmVnRXhwKCdeJyArIHBhdGggKyAnJCcsICdpJyk7XG59XG5cblxuLy8gUGFyc2VzIGEgbG9jYXRpb24uc2VhcmNoIHN0cmluZyBpbnRvIGFuIG9iamVjdCB3aXRoIGtleS12YWx1ZSBwYWlycy5cbmZ1bmN0aW9uIHBhcnNlUXVlcnkoc2VhcmNoKSB7XG4gIHZhciBxdWVyeSA9IHt9O1xuICBpZiAoc2VhcmNoID09PSAnJykge1xuICAgIHJldHVybiBxdWVyeTtcbiAgfVxuXG4gIHNlYXJjaC5yZXBsYWNlKC9eXFw/LywgJycpLnNwbGl0KCcmJykuZm9yRWFjaChmdW5jdGlvbihrZXlWYWx1ZSkge1xuICAgIHZhciBwYXJ0cyA9IGtleVZhbHVlLnNwbGl0KCc9Jyk7XG4gICAgdmFyIGtleSA9IHBhcnRzWzBdO1xuICAgIHZhciB2YWx1ZSA9IHBhcnRzWzFdO1xuICAgIHF1ZXJ5W2RlY29kZVVSSUNvbXBvbmVudChrZXkpXSA9IGRlY29kZVVSSUNvbXBvbmVudCh2YWx1ZSk7XG4gIH0pO1xuXG4gIHJldHVybiBxdWVyeTtcbn1cblxuLy8gRml4IElFJ3MgbWlzc2luZyBzbGFzaCBwcmVmaXhcbmZ1bmN0aW9uIHBhdGhuYW1lKGFuY2hvcikge1xuICB2YXIgcGF0aCA9IGFuY2hvci5wYXRobmFtZTtcbiAgaWYgKHBhdGguY2hhckF0KDApICE9PSAnLycpIHtcbiAgICBwYXRoID0gJy8nICsgcGF0aDtcbiAgfVxuICByZXR1cm4gcGF0aDtcbn1cbiIsInZhciBGcmFnbWVudHMgPSByZXF1aXJlKCcuL3NyYy9mcmFnbWVudHMnKTtcbnZhciBPYnNlcnZlciA9IHJlcXVpcmUoJy4vc3JjL29ic2VydmVyJyk7XG5cbmZ1bmN0aW9uIGNyZWF0ZSgpIHtcbiAgdmFyIGZyYWdtZW50cyA9IG5ldyBGcmFnbWVudHMoT2JzZXJ2ZXIpO1xuICBmcmFnbWVudHMuZXhwcmVzc2lvbiA9IE9ic2VydmVyLmV4cHJlc3Npb247XG4gIGZyYWdtZW50cy5zeW5jID0gT2JzZXJ2ZXIuc3luYztcbiAgcmV0dXJuIGZyYWdtZW50cztcbn1cblxuLy8gQ3JlYXRlIGFuIGluc3RhbmNlIG9mIGZyYWdtZW50cyB3aXRoIHRoZSBkZWZhdWx0IG9ic2VydmVyXG5tb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZSgpO1xubW9kdWxlLmV4cG9ydHMuY3JlYXRlID0gY3JlYXRlO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBBbmltYXRlZEJpbmRpbmc7XG52YXIgYW5pbWF0aW9uID0gcmVxdWlyZSgnLi91dGlsL2FuaW1hdGlvbicpO1xudmFyIEJpbmRpbmcgPSByZXF1aXJlKCcuL2JpbmRpbmcnKTtcbnZhciBfc3VwZXIgPSBCaW5kaW5nLnByb3RvdHlwZTtcblxuLyoqXG4gKiBCaW5kaW5ncyB3aGljaCBleHRlbmQgQW5pbWF0ZWRCaW5kaW5nIGhhdmUgdGhlIGFiaWxpdHkgdG8gYW5pbWF0ZSBlbGVtZW50cyB0aGF0IGFyZSBhZGRlZCB0byB0aGUgRE9NIGFuZCByZW1vdmVkIGZyb21cbiAqIHRoZSBET00uIFRoaXMgYWxsb3dzIG1lbnVzIHRvIHNsaWRlIG9wZW4gYW5kIGNsb3NlZCwgZWxlbWVudHMgdG8gZmFkZSBpbiBvciBkcm9wIGRvd24sIGFuZCByZXBlYXRlZCBpdGVtcyB0byBhcHBlYXJcbiAqIHRvIG1vdmUgKGlmIHlvdSBnZXQgY3JlYXRpdmUgZW5vdWdoKS5cbiAqXG4gKiBUaGUgZm9sbG93aW5nIDUgbWV0aG9kcyBhcmUgaGVscGVyIERPTSBtZXRob2RzIHRoYXQgYWxsb3cgcmVnaXN0ZXJlZCBiaW5kaW5ncyB0byB3b3JrIHdpdGggQ1NTIHRyYW5zaXRpb25zIGZvclxuICogYW5pbWF0aW5nIGVsZW1lbnRzLiBJZiBhbiBlbGVtZW50IGhhcyB0aGUgYGFuaW1hdGVgIGF0dHJpYnV0ZSBvciBhIG1hdGNoaW5nIEphdmFTY3JpcHQgbWV0aG9kLCB0aGVzZSBoZWxwZXIgbWV0aG9kc1xuICogd2lsbCBzZXQgYSBjbGFzcyBvbiB0aGUgbm9kZSB0byB0cmlnZ2VyIHRoZSBhbmltYXRpb24gYW5kL29yIGNhbGwgdGhlIEphdmFTY3JpcHQgbWV0aG9kcyB0byBoYW5kbGUgaXQuXG4gKlxuICogQW4gYW5pbWF0aW9uIG1heSBiZSBlaXRoZXIgYSBDU1MgdHJhbnNpdGlvbiwgYSBDU1MgYW5pbWF0aW9uLCBvciBhIHNldCBvZiBKYXZhU2NyaXB0IG1ldGhvZHMgdGhhdCB3aWxsIGJlIGNhbGxlZC5cbiAqXG4gKiBJZiB1c2luZyBDU1MsIGNsYXNzZXMgYXJlIGFkZGVkIGFuZCByZW1vdmVkIGZyb20gdGhlIGVsZW1lbnQuIFdoZW4gYW4gZWxlbWVudCBpcyBpbnNlcnRlZCBpdCB3aWxsIHJlY2VpdmUgdGhlIGB3aWxsLVxuICogYW5pbWF0ZS1pbmAgY2xhc3MgYmVmb3JlIGJlaW5nIGFkZGVkIHRvIHRoZSBET00sIHRoZW4gaXQgd2lsbCByZWNlaXZlIHRoZSBgYW5pbWF0ZS1pbmAgY2xhc3MgaW1tZWRpYXRlbHkgYWZ0ZXIgYmVpbmdcbiAqIGFkZGVkIHRvIHRoZSBET00sIHRoZW4gYm90aCBjbGFzZXMgd2lsbCBiZSByZW1vdmVkIGFmdGVyIHRoZSBhbmltYXRpb24gaXMgY29tcGxldGUuIFdoZW4gYW4gZWxlbWVudCBpcyBiZWluZyByZW1vdmVkXG4gKiBmcm9tIHRoZSBET00gaXQgd2lsbCByZWNlaXZlIHRoZSBgd2lsbC1hbmltYXRlLW91dGAgYW5kIGBhbmltYXRlLW91dGAgY2xhc3NlcywgdGhlbiB0aGUgY2xhc3NlcyB3aWxsIGJlIHJlbW92ZWQgb25jZVxuICogdGhlIGFuaW1hdGlvbiBpcyBjb21wbGV0ZS5cbiAqXG4gKiBJZiB1c2luZyBKYXZhU2NyaXB0LCBtZXRob2RzIG11c3QgYmUgZGVmaW5lZCAgdG8gYW5pbWF0ZSB0aGUgZWxlbWVudCB0aGVyZSBhcmUgMyBzdXBwb3J0ZWQgbWV0aG9kcyB3aGljaCBjYW4gYlxuICpcbiAqIFRPRE8gY2FjaGUgYnkgY2xhc3MtbmFtZSAoQW5ndWxhcik/IE9ubHkgc3VwcG9ydCBqYXZhc2NyaXB0LXN0eWxlIChFbWJlcik/IEFkZCBhIGB3aWxsLWFuaW1hdGUtaW5gIGFuZFxuICogYGRpZC1hbmltYXRlLWluYCBldGMuP1xuICogSUYgaGFzIGFueSBjbGFzc2VzLCBhZGQgdGhlIGB3aWxsLWFuaW1hdGUtaW58b3V0YCBhbmQgZ2V0IGNvbXB1dGVkIGR1cmF0aW9uLiBJZiBub25lLCByZXR1cm4uIENhY2hlLlxuICogUlVMRSBpcyB1c2UgdW5pcXVlIGNsYXNzIHRvIGRlZmluZSBhbiBhbmltYXRpb24uIE9yIGF0dHJpYnV0ZSBgYW5pbWF0ZT1cImZhZGVcImAgd2lsbCBhZGQgdGhlIGNsYXNzP1xuICogYC5mYWRlLndpbGwtYW5pbWF0ZS1pbmAsIGAuZmFkZS5hbmltYXRlLWluYCwgYC5mYWRlLndpbGwtYW5pbWF0ZS1vdXRgLCBgLmZhZGUuYW5pbWF0ZS1vdXRgXG4gKlxuICogRXZlbnRzIHdpbGwgYmUgdHJpZ2dlcmVkIG9uIHRoZSBlbGVtZW50cyBuYW1lZCB0aGUgc2FtZSBhcyB0aGUgY2xhc3MgbmFtZXMgKGUuZy4gYGFuaW1hdGUtaW5gKSB3aGljaCBtYXkgYmUgbGlzdGVuZWRcbiAqIHRvIGluIG9yZGVyIHRvIGNhbmNlbCBhbiBhbmltYXRpb24gb3IgcmVzcG9uZCB0byBpdC5cbiAqXG4gKiBJZiB0aGUgbm9kZSBoYXMgbWV0aG9kcyBgYW5pbWF0ZUluKGRvbmUpYCwgYGFuaW1hdGVPdXQoZG9uZSlgLCBgYW5pbWF0ZU1vdmVJbihkb25lKWAsIG9yIGBhbmltYXRlTW92ZU91dChkb25lKWBcbiAqIGRlZmluZWQgb24gdGhlbSB0aGVuIHRoZSBoZWxwZXJzIHdpbGwgYWxsb3cgYW4gYW5pbWF0aW9uIGluIEphdmFTY3JpcHQgdG8gYmUgcnVuIGFuZCB3YWl0IGZvciB0aGUgYGRvbmVgIGZ1bmN0aW9uIHRvXG4gKiBiZSBjYWxsZWQgdG8ga25vdyB3aGVuIHRoZSBhbmltYXRpb24gaXMgY29tcGxldGUuXG4gKlxuICogQmUgc3VyZSB0byBhY3R1YWxseSBoYXZlIGFuIGFuaW1hdGlvbiBkZWZpbmVkIGZvciBlbGVtZW50cyB3aXRoIHRoZSBgYW5pbWF0ZWAgY2xhc3MvYXR0cmlidXRlIGJlY2F1c2UgdGhlIGhlbHBlcnMgdXNlXG4gKiB0aGUgYHRyYW5zaXRpb25lbmRgIGFuZCBgYW5pbWF0aW9uZW5kYCBldmVudHMgdG8ga25vdyB3aGVuIHRoZSBhbmltYXRpb24gaXMgZmluaXNoZWQsIGFuZCBpZiB0aGVyZSBpcyBubyBhbmltYXRpb25cbiAqIHRoZXNlIGV2ZW50cyB3aWxsIG5ldmVyIGJlIHRyaWdnZXJlZCBhbmQgdGhlIG9wZXJhdGlvbiB3aWxsIG5ldmVyIGNvbXBsZXRlLlxuICovXG5mdW5jdGlvbiBBbmltYXRlZEJpbmRpbmcocHJvcGVydGllcykge1xuICB2YXIgZWxlbWVudCA9IHByb3BlcnRpZXMubm9kZTtcbiAgdmFyIGFuaW1hdGUgPSBlbGVtZW50LmdldEF0dHJpYnV0ZShwcm9wZXJ0aWVzLmZyYWdtZW50cy5hbmltYXRlQXR0cmlidXRlKTtcbiAgdmFyIGZyYWdtZW50cyA9IHByb3BlcnRpZXMuZnJhZ21lbnRzO1xuXG4gIGlmIChhbmltYXRlICE9PSBudWxsKSB7XG4gICAgaWYgKGVsZW1lbnQubm9kZU5hbWUgPT09ICdURU1QTEFURScgfHwgZWxlbWVudC5ub2RlTmFtZSA9PT0gJ1NDUklQVCcpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGFuaW1hdGUgbXVsdGlwbGUgbm9kZXMgaW4gYSB0ZW1wbGF0ZSBvciBzY3JpcHQuIFJlbW92ZSB0aGUgW2FuaW1hdGVdIGF0dHJpYnV0ZS4nKTtcbiAgICB9XG5cbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgLy8gQWxsb3cgbXVsdGlwbGUgYmluZGluZ3MgdG8gYW5pbWF0ZSBieSBub3QgcmVtb3ZpbmcgdW50aWwgdGhleSBoYXZlIGFsbCBiZWVuIGNyZWF0ZWRcbiAgICAgIGVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKHByb3BlcnRpZXMuZnJhZ21lbnRzLmFuaW1hdGVBdHRyaWJ1dGUpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5hbmltYXRlID0gdHJ1ZTtcblxuICAgIGlmIChmcmFnbWVudHMuaXNCb3VuZCgnYXR0cmlidXRlJywgYW5pbWF0ZSkpIHtcbiAgICAgIC8vIGphdmFzY3JpcHQgYW5pbWF0aW9uXG4gICAgICB0aGlzLmFuaW1hdGVFeHByZXNzaW9uID0gZnJhZ21lbnRzLmNvZGlmeUV4cHJlc3Npb24oJ2F0dHJpYnV0ZScsIGFuaW1hdGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoYW5pbWF0ZVswXSA9PT0gJy4nKSB7XG4gICAgICAgIC8vIGNsYXNzIGFuaW1hdGlvblxuICAgICAgICB0aGlzLmFuaW1hdGVDbGFzc05hbWUgPSBhbmltYXRlLnNsaWNlKDEpO1xuICAgICAgfSBlbHNlIGlmIChhbmltYXRlKSB7XG4gICAgICAgIC8vIHJlZ2lzdGVyZWQgYW5pbWF0aW9uXG4gICAgICAgIHZhciBhbmltYXRlT2JqZWN0ID0gZnJhZ21lbnRzLmdldEFuaW1hdGlvbihhbmltYXRlKTtcbiAgICAgICAgaWYgKHR5cGVvZiBhbmltYXRlT2JqZWN0ID09PSAnZnVuY3Rpb24nKSBhbmltYXRlT2JqZWN0ID0gbmV3IGFuaW1hdGVPYmplY3QodGhpcyk7XG4gICAgICAgIHRoaXMuYW5pbWF0ZU9iamVjdCA9IGFuaW1hdGVPYmplY3Q7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgQmluZGluZy5jYWxsKHRoaXMsIHByb3BlcnRpZXMpO1xufVxuXG5cbkJpbmRpbmcuZXh0ZW5kKEFuaW1hdGVkQmluZGluZywge1xuICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICBfc3VwZXIuaW5pdC5jYWxsKHRoaXMpO1xuXG4gICAgaWYgKHRoaXMuYW5pbWF0ZUV4cHJlc3Npb24pIHtcbiAgICAgIHRoaXMuYW5pbWF0ZU9ic2VydmVyID0gbmV3IHRoaXMuT2JzZXJ2ZXIodGhpcy5hbmltYXRlRXhwcmVzc2lvbiwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhpcy5hbmltYXRlT2JqZWN0ID0gdmFsdWU7XG4gICAgICB9LCB0aGlzKTtcbiAgICB9XG4gIH0sXG5cbiAgYmluZDogZnVuY3Rpb24oY29udGV4dCkge1xuICAgIGlmICh0aGlzLmNvbnRleHQgPT0gY29udGV4dCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBfc3VwZXIuYmluZC5jYWxsKHRoaXMsIGNvbnRleHQpO1xuXG4gICAgaWYgKHRoaXMuYW5pbWF0ZU9ic2VydmVyKSB7XG4gICAgICB0aGlzLmFuaW1hdGVPYnNlcnZlci5iaW5kKGNvbnRleHQpO1xuICAgIH1cbiAgfSxcblxuICB1bmJpbmQ6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLmNvbnRleHQgPT09IG51bGwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgX3N1cGVyLnVuYmluZC5jYWxsKHRoaXMpO1xuXG4gICAgaWYgKHRoaXMuYW5pbWF0ZU9ic2VydmVyKSB7XG4gICAgICB0aGlzLmFuaW1hdGVPYnNlcnZlci51bmJpbmQoKTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEhlbHBlciBtZXRob2QgdG8gcmVtb3ZlIGEgbm9kZSBmcm9tIHRoZSBET00sIGFsbG93aW5nIGZvciBhbmltYXRpb25zIHRvIG9jY3VyLiBgY2FsbGJhY2tgIHdpbGwgYmUgY2FsbGVkIHdoZW5cbiAgICogZmluaXNoZWQuXG4gICAqL1xuICBhbmltYXRlT3V0OiBmdW5jdGlvbihub2RlLCBjYWxsYmFjaykge1xuICAgIGlmIChub2RlLmZpcnN0Vmlld05vZGUpIG5vZGUgPSBub2RlLmZpcnN0Vmlld05vZGU7XG5cbiAgICB0aGlzLmFuaW1hdGVOb2RlKCdvdXQnLCBub2RlLCBmdW5jdGlvbigpIHtcbiAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2suY2FsbCh0aGlzKTtcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogSGVscGVyIG1ldGhvZCB0byBpbnNlcnQgYSBub2RlIGluIHRoZSBET00gYmVmb3JlIGFub3RoZXIgbm9kZSwgYWxsb3dpbmcgZm9yIGFuaW1hdGlvbnMgdG8gb2NjdXIuIGBjYWxsYmFja2Agd2lsbFxuICAgKiBiZSBjYWxsZWQgd2hlbiBmaW5pc2hlZC4gSWYgYGJlZm9yZWAgaXMgbm90IHByb3ZpZGVkIHRoZW4gdGhlIGFuaW1hdGlvbiB3aWxsIGJlIHJ1biB3aXRob3V0IGluc2VydGluZyB0aGUgbm9kZS5cbiAgICovXG4gIGFuaW1hdGVJbjogZnVuY3Rpb24obm9kZSwgY2FsbGJhY2spIHtcbiAgICBpZiAobm9kZS5maXJzdFZpZXdOb2RlKSBub2RlID0gbm9kZS5maXJzdFZpZXdOb2RlO1xuICAgIHRoaXMuYW5pbWF0ZU5vZGUoJ2luJywgbm9kZSwgY2FsbGJhY2ssIHRoaXMpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBbGxvdyBhbiBlbGVtZW50IHRvIHVzZSBDU1MzIHRyYW5zaXRpb25zIG9yIGFuaW1hdGlvbnMgdG8gYW5pbWF0ZSBpbiBvciBvdXQgb2YgdGhlIHBhZ2UuXG4gICAqL1xuICBhbmltYXRlTm9kZTogZnVuY3Rpb24oZGlyZWN0aW9uLCBub2RlLCBjYWxsYmFjaykge1xuICAgIHZhciBhbmltYXRlT2JqZWN0LCBjbGFzc05hbWUsIG5hbWUsIHdpbGxOYW1lLCBkaWROYW1lLCBfdGhpcyA9IHRoaXM7XG5cbiAgICBpZiAodGhpcy5hbmltYXRlT2JqZWN0ICYmIHR5cGVvZiB0aGlzLmFuaW1hdGVPYmplY3QgPT09ICdvYmplY3QnKSB7XG4gICAgICBhbmltYXRlT2JqZWN0ID0gdGhpcy5hbmltYXRlT2JqZWN0O1xuICAgIH0gZWxzZSBpZiAodGhpcy5hbmltYXRlQ2xhc3NOYW1lKSB7XG4gICAgICBjbGFzc05hbWUgPSB0aGlzLmFuaW1hdGVDbGFzc05hbWU7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdGhpcy5hbmltYXRlT2JqZWN0ID09PSAnc3RyaW5nJykge1xuICAgICAgY2xhc3NOYW1lID0gdGhpcy5hbmltYXRlT2JqZWN0O1xuICAgIH1cblxuICAgIGlmIChhbmltYXRlT2JqZWN0KSB7XG4gICAgICB2YXIgZGlyID0gZGlyZWN0aW9uID09PSAnaW4nID8gJ0luJyA6ICdPdXQnO1xuICAgICAgbmFtZSA9ICdhbmltYXRlJyArIGRpcjtcbiAgICAgIHdpbGxOYW1lID0gJ3dpbGxBbmltYXRlJyArIGRpcjtcbiAgICAgIGRpZE5hbWUgPSAnZGlkQW5pbWF0ZScgKyBkaXI7XG5cbiAgICAgIGFuaW1hdGlvbi5tYWtlRWxlbWVudEFuaW1hdGFibGUobm9kZSk7XG5cbiAgICAgIGlmIChhbmltYXRlT2JqZWN0W3dpbGxOYW1lXSkge1xuICAgICAgICBhbmltYXRlT2JqZWN0W3dpbGxOYW1lXShub2RlKTtcbiAgICAgICAgLy8gdHJpZ2dlciByZWZsb3dcbiAgICAgICAgbm9kZS5vZmZzZXRXaWR0aCA9IG5vZGUub2Zmc2V0V2lkdGg7XG4gICAgICB9XG5cbiAgICAgIGlmIChhbmltYXRlT2JqZWN0W25hbWVdKSB7XG4gICAgICAgIGFuaW1hdGVPYmplY3RbbmFtZV0obm9kZSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKGFuaW1hdGVPYmplY3RbZGlkTmFtZV0pIGFuaW1hdGVPYmplY3RbZGlkTmFtZV0obm9kZSk7XG4gICAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjay5jYWxsKF90aGlzKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG5hbWUgPSAnYW5pbWF0ZS0nICsgZGlyZWN0aW9uO1xuICAgICAgd2lsbE5hbWUgPSAnd2lsbC1hbmltYXRlLScgKyBkaXJlY3Rpb247XG4gICAgICBpZiAoY2xhc3NOYW1lKSBub2RlLmNsYXNzTGlzdC5hZGQoY2xhc3NOYW1lKTtcblxuICAgICAgaWYgKGRpcmVjdGlvbiA9PT0gJ2luJykge1xuICAgICAgICB2YXIgbmV4dCA9IG5vZGUubmV4dFNpYmxpbmcsIHBhcmVudCA9IG5vZGUucGFyZW50Tm9kZTtcbiAgICAgICAgcGFyZW50LnJlbW92ZUNoaWxkKG5vZGUpO1xuICAgICAgICBub2RlLmNsYXNzTGlzdC5hZGQod2lsbE5hbWUpO1xuICAgICAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKG5vZGUsIG5leHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gdHJpZ2dlciByZWZsb3dcbiAgICAgICAgbm9kZS5vZmZzZXRXaWR0aCA9IG5vZGUub2Zmc2V0V2lkdGg7XG4gICAgICB9XG5cbiAgICAgIG5vZGUuY2xhc3NMaXN0LnJlbW92ZSh3aWxsTmFtZSk7XG4gICAgICBub2RlLmNsYXNzTGlzdC5hZGQobmFtZSk7XG5cbiAgICAgIHZhciBkdXJhdGlvbiA9IGdldER1cmF0aW9uLmNhbGwodGhpcywgbm9kZSwgZGlyZWN0aW9uKTtcbiAgICAgIGZ1bmN0aW9uIHdoZW5Eb25lKCkge1xuICAgICAgICBub2RlLmNsYXNzTGlzdC5yZW1vdmUobmFtZSk7XG4gICAgICAgIGlmIChjbGFzc05hbWUpIG5vZGUuY2xhc3NMaXN0LnJlbW92ZShjbGFzc05hbWUpO1xuICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrLmNhbGwoX3RoaXMpO1xuICAgICAgfVxuXG4gICAgICBpZiAoZHVyYXRpb24pIHtcbiAgICAgICAgc2V0VGltZW91dCh3aGVuRG9uZSwgZHVyYXRpb24pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgd2hlbkRvbmUoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn0pO1xuXG5cbnZhciB0cmFuc2l0aW9uRHVyYXRpb25OYW1lID0gJ3RyYW5zaXRpb25EdXJhdGlvbic7XG52YXIgdHJhbnNpdGlvbkRlbGF5TmFtZSA9ICd0cmFuc2l0aW9uRGVsYXknO1xudmFyIGFuaW1hdGlvbkR1cmF0aW9uTmFtZSA9ICdhbmltYXRpb25EdXJhdGlvbic7XG52YXIgYW5pbWF0aW9uRGVsYXlOYW1lID0gJ2FuaW1hdGlvbkRlbGF5JztcbnZhciBzdHlsZSA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZTtcbmlmIChzdHlsZS50cmFuc2l0aW9uRHVyYXRpb24gPT09IHVuZGVmaW5lZCAmJiBzdHlsZS53ZWJraXRUcmFuc2l0aW9uRHVyYXRpb24gIT09IHVuZGVmaW5lZCkge1xuICB0cmFuc2l0aW9uRHVyYXRpb25OYW1lID0gJ3dlYmtpdFRyYW5zaXRpb25EdXJhdGlvbic7XG4gIHRyYW5zaXRpb25EZWxheU5hbWUgPSAnd2Via2l0VHJhbnNpdGlvbkRlbGF5Jztcbn1cbmlmIChzdHlsZS5hbmltYXRpb25EdXJhdGlvbiA9PT0gdW5kZWZpbmVkICYmIHN0eWxlLndlYmtpdEFuaW1hdGlvbkR1cmF0aW9uICE9PSB1bmRlZmluZWQpIHtcbiAgYW5pbWF0aW9uRHVyYXRpb25OYW1lID0gJ3dlYmtpdEFuaW1hdGlvbkR1cmF0aW9uJztcbiAgYW5pbWF0aW9uRGVsYXlOYW1lID0gJ3dlYmtpdEFuaW1hdGlvbkRlbGF5Jztcbn1cblxuXG5mdW5jdGlvbiBnZXREdXJhdGlvbihub2RlLCBkaXJlY3Rpb24pIHtcbiAgdmFyIG1pbGxpc2Vjb25kcyA9IHRoaXMuY2xvbmVkRnJvbVsnX19hbmltYXRpb25EdXJhdGlvbicgKyBkaXJlY3Rpb25dO1xuICBpZiAoIW1pbGxpc2Vjb25kcykge1xuICAgIC8vIFJlY2FsYyBpZiBub2RlIHdhcyBvdXQgb2YgRE9NIGJlZm9yZSBhbmQgaGFkIDAgZHVyYXRpb24sIGFzc3VtZSB0aGVyZSBpcyBhbHdheXMgU09NRSBkdXJhdGlvbi5cbiAgICB2YXIgc3R5bGVzID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUobm9kZSk7XG4gICAgdmFyIHNlY29uZHMgPSBNYXRoLm1heChwYXJzZUZsb2F0KHN0eWxlc1t0cmFuc2l0aW9uRHVyYXRpb25OYW1lXSB8fCAwKSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJzZUZsb2F0KHN0eWxlc1t0cmFuc2l0aW9uRGVsYXlOYW1lXSB8fCAwKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlRmxvYXQoc3R5bGVzW2FuaW1hdGlvbkR1cmF0aW9uTmFtZV0gfHwgMCkgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VGbG9hdChzdHlsZXNbYW5pbWF0aW9uRGVsYXlOYW1lXSB8fCAwKSk7XG4gICAgbWlsbGlzZWNvbmRzID0gc2Vjb25kcyAqIDEwMDAgfHwgMDtcbiAgICB0aGlzLmNsb25lZEZyb20uX19hbmltYXRpb25EdXJhdGlvbl9fID0gbWlsbGlzZWNvbmRzO1xuICB9XG4gIHJldHVybiBtaWxsaXNlY29uZHM7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IEJpbmRpbmc7XG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnLi91dGlsL2V4dGVuZCcpO1xuXG4vKipcbiAqIEEgYmluZGluZyBpcyBhIGxpbmsgYmV0d2VlbiBhbiBlbGVtZW50IGFuZCBzb21lIGRhdGEuIFN1YmNsYXNzZXMgb2YgQmluZGluZyBjYWxsZWQgYmluZGVycyBkZWZpbmUgd2hhdCBhIGJpbmRpbmcgZG9lc1xuICogd2l0aCB0aGF0IGxpbmsuIEluc3RhbmNlcyBvZiB0aGVzZSBiaW5kZXJzIGFyZSBjcmVhdGVkIGFzIGJpbmRpbmdzIG9uIHRlbXBsYXRlcy4gV2hlbiBhIHZpZXcgaXMgc3RhbXBlZCBvdXQgZnJvbSB0aGVcbiAqIHRlbXBsYXRlIHRoZSBiaW5kaW5nIGlzIFwiY2xvbmVkXCIgKGl0IGlzIGFjdHVhbGx5IGV4dGVuZGVkIGZvciBwZXJmb3JtYW5jZSkgYW5kIHRoZSBgZWxlbWVudGAvYG5vZGVgIHByb3BlcnR5IGlzXG4gKiB1cGRhdGVkIHRvIHRoZSBtYXRjaGluZyBlbGVtZW50IGluIHRoZSB2aWV3LlxuICpcbiAqICMjIyBQcm9wZXJ0aWVzXG4gKiAgKiBlbGVtZW50OiBUaGUgZWxlbWVudCAob3IgdGV4dCBub2RlKSB0aGlzIGJpbmRpbmcgaXMgYm91bmQgdG9cbiAqICAqIG5vZGU6IEFsaWFzIG9mIGVsZW1lbnQsIHNpbmNlIGJpbmRpbmdzIG1heSBhcHBseSB0byB0ZXh0IG5vZGVzIHRoaXMgaXMgbW9yZSBhY2N1cmF0ZVxuICogICogbmFtZTogVGhlIGF0dHJpYnV0ZSBvciBlbGVtZW50IG5hbWUgKGRvZXMgbm90IGFwcGx5IHRvIG1hdGNoZWQgdGV4dCBub2RlcylcbiAqICAqIG1hdGNoOiBUaGUgbWF0Y2hlZCBwYXJ0IG9mIHRoZSBuYW1lIGZvciB3aWxkY2FyZCBhdHRyaWJ1dGVzIChlLmcuIGBvbi0qYCBtYXRjaGluZyBhZ2FpbnN0IGBvbi1jbGlja2Agd291bGQgaGF2ZSBhXG4gKiAgICBtYXRjaCBwcm9wZXJ0eSBlcXVhbGxpbmcgYGNsaWNrYCkuIFVzZSBgdGhpcy5jYW1lbENhc2VgIHRvIGdldCB0aGUgbWF0Y2ggcHJvZXJ0eSBjYW1lbENhc2VkLlxuICogICogZXhwcmVzc2lvbjogVGhlIGV4cHJlc3Npb24gdGhpcyBiaW5kaW5nIHdpbGwgdXNlIGZvciBpdHMgdXBkYXRlcyAoZG9lcyBub3QgYXBwbHkgdG8gbWF0Y2hlZCBlbGVtZW50cylcbiAqICAqIGNvbnRleHQ6IFRoZSBjb250ZXh0IHRoZSBleHJlc3Npb24gb3BlcmF0ZXMgd2l0aGluIHdoZW4gYm91bmRcbiAqL1xuZnVuY3Rpb24gQmluZGluZyhwcm9wZXJ0aWVzKSB7XG4gIGlmICghcHJvcGVydGllcy5ub2RlIHx8ICFwcm9wZXJ0aWVzLnZpZXcpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBIGJpbmRpbmcgbXVzdCByZWNlaXZlIGEgbm9kZSBhbmQgYSB2aWV3Jyk7XG4gIH1cblxuICAvLyBlbGVtZW50IGFuZCBub2RlIGFyZSBhbGlhc2VzXG4gIHRoaXMuX2VsZW1lbnRQYXRoID0gaW5pdE5vZGVQYXRoKHByb3BlcnRpZXMubm9kZSwgcHJvcGVydGllcy52aWV3KTtcbiAgdGhpcy5ub2RlID0gcHJvcGVydGllcy5ub2RlO1xuICB0aGlzLmVsZW1lbnQgPSBwcm9wZXJ0aWVzLm5vZGU7XG4gIHRoaXMubmFtZSA9IHByb3BlcnRpZXMubmFtZTtcbiAgdGhpcy5tYXRjaCA9IHByb3BlcnRpZXMubWF0Y2g7XG4gIHRoaXMuZXhwcmVzc2lvbiA9IHByb3BlcnRpZXMuZXhwcmVzc2lvbjtcbiAgdGhpcy5mcmFnbWVudHMgPSBwcm9wZXJ0aWVzLmZyYWdtZW50cztcbiAgdGhpcy5jb250ZXh0ID0gbnVsbDtcbn1cblxuZXh0ZW5kKEJpbmRpbmcsIHtcbiAgLyoqXG4gICAqIERlZmF1bHQgcHJpb3JpdHkgYmluZGVycyBtYXkgb3ZlcnJpZGUuXG4gICAqL1xuICBwcmlvcml0eTogMCxcblxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGEgY2xvbmVkIGJpbmRpbmcuIFRoaXMgaGFwcGVucyBhZnRlciBhIGNvbXBpbGVkIGJpbmRpbmcgb24gYSB0ZW1wbGF0ZSBpcyBjbG9uZWQgZm9yIGEgdmlldy5cbiAgICovXG4gIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLmV4cHJlc3Npb24pIHtcbiAgICAgIC8vIEFuIG9ic2VydmVyIHRvIG9ic2VydmUgdmFsdWUgY2hhbmdlcyB0byB0aGUgZXhwcmVzc2lvbiB3aXRoaW4gYSBjb250ZXh0XG4gICAgICB0aGlzLm9ic2VydmVyID0gbmV3IHRoaXMuT2JzZXJ2ZXIodGhpcy5leHByZXNzaW9uLCB0aGlzLnVwZGF0ZWQsIHRoaXMpO1xuICAgIH1cbiAgICB0aGlzLmNyZWF0ZWQoKTtcbiAgfSxcblxuICAvKipcbiAgICogQ2xvbmUgdGhpcyBiaW5kaW5nIGZvciBhIHZpZXcuIFRoZSBlbGVtZW50L25vZGUgd2lsbCBiZSB1cGRhdGVkIGFuZCB0aGUgYmluZGluZyB3aWxsIGJlIGluaXRlZC5cbiAgICovXG4gIGNsb25lRm9yVmlldzogZnVuY3Rpb24odmlldykge1xuICAgIGlmICghdmlldykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQSBiaW5kaW5nIG11c3QgY2xvbmUgYWdhaW5zdCBhIHZpZXcnKTtcbiAgICB9XG5cbiAgICB2YXIgbm9kZSA9IHZpZXc7XG4gICAgdGhpcy5fZWxlbWVudFBhdGguZm9yRWFjaChmdW5jdGlvbihpbmRleCkge1xuICAgICAgbm9kZSA9IG5vZGUuY2hpbGROb2Rlc1tpbmRleF07XG4gICAgfSk7XG5cbiAgICB2YXIgYmluZGluZyA9IE9iamVjdC5jcmVhdGUodGhpcyk7XG4gICAgYmluZGluZy5jbG9uZWRGcm9tID0gdGhpcztcbiAgICBiaW5kaW5nLmVsZW1lbnQgPSBub2RlO1xuICAgIGJpbmRpbmcubm9kZSA9IG5vZGU7XG4gICAgYmluZGluZy5pbml0KCk7XG4gICAgcmV0dXJuIGJpbmRpbmc7XG4gIH0sXG5cblxuICAvLyBCaW5kIHRoaXMgdG8gdGhlIGdpdmVuIGNvbnRleHQgb2JqZWN0XG4gIGJpbmQ6IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgICBpZiAodGhpcy5jb250ZXh0ID09IGNvbnRleHQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICAgIGlmICh0aGlzLm9ic2VydmVyKSB7XG4gICAgICBpZiAodGhpcy51cGRhdGVkICE9PSBCaW5kaW5nLnByb3RvdHlwZS51cGRhdGVkKSB7XG4gICAgICAgIHRoaXMub2JzZXJ2ZXIuZm9yY2VVcGRhdGVOZXh0U3luYyA9IHRydWU7XG4gICAgICAgIHRoaXMub2JzZXJ2ZXIuYmluZChjb250ZXh0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHNldCB0aGUgY29udGV4dCBidXQgZG9uJ3QgYWN0dWFsbHkgYmluZCBpdCBzaW5jZSBgdXBkYXRlZGAgaXMgYSBuby1vcFxuICAgICAgICB0aGlzLm9ic2VydmVyLmNvbnRleHQgPSBjb250ZXh0O1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmJvdW5kKCk7XG4gIH0sXG5cblxuICAvLyBVbmJpbmQgdGhpcyBmcm9tIGl0cyBjb250ZXh0XG4gIHVuYmluZDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuY29udGV4dCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuY29udGV4dCA9IG51bGw7XG4gICAgaWYgKHRoaXMub2JzZXJ2ZXIpIHRoaXMub2JzZXJ2ZXIudW5iaW5kKCk7XG4gICAgdGhpcy51bmJvdW5kKCk7XG4gIH0sXG5cblxuICAvLyBDbGVhbnMgdXAgYmluZGluZyBjb21wbGV0ZWx5XG4gIGRpc3Bvc2U6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudW5iaW5kKCk7XG4gICAgaWYgKHRoaXMub2JzZXJ2ZXIpIHtcbiAgICAgIC8vIFRoaXMgd2lsbCBjbGVhciBpdCBvdXQsIG51bGxpZnlpbmcgYW55IGRhdGEgc3RvcmVkXG4gICAgICB0aGlzLm9ic2VydmVyLnN5bmMoKTtcbiAgICB9XG4gICAgdGhpcy5kaXNwb3NlZCgpO1xuICB9LFxuXG5cbiAgLy8gVGhlIGZ1bmN0aW9uIHRvIHJ1biB3aGVuIHRoZSBiaW5kaW5nJ3MgZWxlbWVudCBpcyBjb21waWxlZCB3aXRoaW4gYSB0ZW1wbGF0ZVxuICBjb21waWxlZDogZnVuY3Rpb24oKSB7fSxcblxuICAvLyBUaGUgZnVuY3Rpb24gdG8gcnVuIHdoZW4gdGhlIGJpbmRpbmcncyBlbGVtZW50IGlzIGNyZWF0ZWRcbiAgY3JlYXRlZDogZnVuY3Rpb24oKSB7fSxcblxuICAvLyBUaGUgZnVuY3Rpb24gdG8gcnVuIHdoZW4gdGhlIGV4cHJlc3Npb24ncyB2YWx1ZSBjaGFuZ2VzXG4gIHVwZGF0ZWQ6IGZ1bmN0aW9uKCkge30sXG5cbiAgLy8gVGhlIGZ1bmN0aW9uIHRvIHJ1biB3aGVuIHRoZSBiaW5kaW5nIGlzIGJvdW5kXG4gIGJvdW5kOiBmdW5jdGlvbigpIHt9LFxuXG4gIC8vIFRoZSBmdW5jdGlvbiB0byBydW4gd2hlbiB0aGUgYmluZGluZyBpcyB1bmJvdW5kXG4gIHVuYm91bmQ6IGZ1bmN0aW9uKCkge30sXG5cbiAgLy8gVGhlIGZ1bmN0aW9uIHRvIHJ1biB3aGVuIHRoZSBiaW5kaW5nIGlzIGRpc3Bvc2VkXG4gIGRpc3Bvc2VkOiBmdW5jdGlvbigpIHt9LFxuXG4gIC8vIEhlbHBlciBtZXRob2RzXG5cbiAgZ2V0IGNhbWVsQ2FzZSgpIHtcbiAgICByZXR1cm4gKHRoaXMubWF0Y2ggfHwgdGhpcy5uYW1lIHx8ICcnKS5yZXBsYWNlKC8tKyhcXHcpL2csIGZ1bmN0aW9uKF8sIGNoYXIpIHtcbiAgICAgIHJldHVybiBjaGFyLnRvVXBwZXJDYXNlKCk7XG4gICAgfSk7XG4gIH0sXG5cbiAgb2JzZXJ2ZTogZnVuY3Rpb24oZXhwcmVzc2lvbiwgY2FsbGJhY2ssIGNhbGxiYWNrQ29udGV4dCkge1xuICAgIHJldHVybiBuZXcgdGhpcy5PYnNlcnZlcihleHByZXNzaW9uLCBjYWxsYmFjaywgY2FsbGJhY2tDb250ZXh0IHx8IHRoaXMpO1xuICB9XG59KTtcblxuXG5cblxudmFyIGluZGV4T2YgPSBBcnJheS5wcm90b3R5cGUuaW5kZXhPZjtcblxuLy8gQ3JlYXRlcyBhbiBhcnJheSBvZiBpbmRleGVzIHRvIGhlbHAgZmluZCB0aGUgc2FtZSBlbGVtZW50IHdpdGhpbiBhIGNsb25lZCB2aWV3XG5mdW5jdGlvbiBpbml0Tm9kZVBhdGgobm9kZSwgdmlldykge1xuICB2YXIgcGF0aCA9IFtdO1xuICB3aGlsZSAobm9kZSAhPT0gdmlldykge1xuICAgIHZhciBwYXJlbnQgPSBub2RlLnBhcmVudE5vZGU7XG4gICAgcGF0aC51bnNoaWZ0KGluZGV4T2YuY2FsbChwYXJlbnQuY2hpbGROb2Rlcywgbm9kZSkpO1xuICAgIG5vZGUgPSBwYXJlbnQ7XG4gIH1cbiAgcmV0dXJuIHBhdGg7XG59XG4iLCJ2YXIgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG5tb2R1bGUuZXhwb3J0cyA9IGNvbXBpbGU7XG5cblxuLy8gV2Fsa3MgdGhlIHRlbXBsYXRlIERPTSByZXBsYWNpbmcgYW55IGJpbmRpbmdzIGFuZCBjYWNoaW5nIGJpbmRpbmdzIG9udG8gdGhlIHRlbXBsYXRlIG9iamVjdC5cbmZ1bmN0aW9uIGNvbXBpbGUoZnJhZ21lbnRzLCB0ZW1wbGF0ZSkge1xuICB2YXIgd2Fsa2VyID0gZG9jdW1lbnQuY3JlYXRlVHJlZVdhbGtlcih0ZW1wbGF0ZSwgTm9kZUZpbHRlci5TSE9XX0VMRU1FTlQgfCBOb2RlRmlsdGVyLlNIT1dfVEVYVCk7XG4gIHZhciBiaW5kaW5ncyA9IFtdLCBjdXJyZW50Tm9kZSwgcGFyZW50Tm9kZSwgcHJldmlvdXNOb2RlO1xuXG4gIC8vIFJlc2V0IGZpcnN0IG5vZGUgdG8gZW5zdXJlIGl0IGlzbid0IGEgZnJhZ21lbnRcbiAgd2Fsa2VyLm5leHROb2RlKCk7XG4gIHdhbGtlci5wcmV2aW91c05vZGUoKTtcblxuICAvLyBmaW5kIGJpbmRpbmdzIGZvciBlYWNoIG5vZGVcbiAgZG8ge1xuICAgIGN1cnJlbnROb2RlID0gd2Fsa2VyLmN1cnJlbnROb2RlO1xuICAgIHBhcmVudE5vZGUgPSBjdXJyZW50Tm9kZS5wYXJlbnROb2RlO1xuICAgIGJpbmRpbmdzLnB1c2guYXBwbHkoYmluZGluZ3MsIGdldEJpbmRpbmdzRm9yTm9kZShmcmFnbWVudHMsIGN1cnJlbnROb2RlLCB0ZW1wbGF0ZSkpO1xuXG4gICAgaWYgKGN1cnJlbnROb2RlLnBhcmVudE5vZGUgIT09IHBhcmVudE5vZGUpIHtcbiAgICAgIC8vIGN1cnJlbnROb2RlIHdhcyByZW1vdmVkIGFuZCBtYWRlIGEgdGVtcGxhdGVcbiAgICAgIHdhbGtlci5jdXJyZW50Tm9kZSA9IHByZXZpb3VzTm9kZSB8fCB3YWxrZXIucm9vdDtcbiAgICB9IGVsc2Uge1xuICAgICAgcHJldmlvdXNOb2RlID0gY3VycmVudE5vZGU7XG4gICAgfVxuICB9IHdoaWxlICh3YWxrZXIubmV4dE5vZGUoKSk7XG5cbiAgcmV0dXJuIGJpbmRpbmdzO1xufVxuXG5cblxuLy8gRmluZCBhbGwgdGhlIGJpbmRpbmdzIG9uIGEgZ2l2ZW4gbm9kZSAodGV4dCBub2RlcyB3aWxsIG9ubHkgZXZlciBoYXZlIG9uZSBiaW5kaW5nKS5cbmZ1bmN0aW9uIGdldEJpbmRpbmdzRm9yTm9kZShmcmFnbWVudHMsIG5vZGUsIHZpZXcpIHtcbiAgdmFyIGJpbmRpbmdzID0gW107XG4gIHZhciBCaW5kZXIsIGJpbmRpbmcsIGV4cHIsIGJvdW5kLCBtYXRjaCwgYXR0ciwgaTtcblxuICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gTm9kZS5URVhUX05PREUpIHtcbiAgICBzcGxpdFRleHROb2RlKGZyYWdtZW50cywgbm9kZSk7XG5cbiAgICAvLyBGaW5kIGFueSBiaW5kaW5nIGZvciB0aGUgdGV4dCBub2RlXG4gICAgaWYgKGZyYWdtZW50cy5pc0JvdW5kKCd0ZXh0Jywgbm9kZS5ub2RlVmFsdWUpKSB7XG4gICAgICBleHByID0gZnJhZ21lbnRzLmNvZGlmeUV4cHJlc3Npb24oJ3RleHQnLCBub2RlLm5vZGVWYWx1ZSk7XG4gICAgICBub2RlLm5vZGVWYWx1ZSA9ICcnO1xuICAgICAgQmluZGVyID0gZnJhZ21lbnRzLmZpbmRCaW5kZXIoJ3RleHQnLCBleHByKTtcbiAgICAgIGJpbmRpbmcgPSBuZXcgQmluZGVyKHsgbm9kZTogbm9kZSwgdmlldzogdmlldywgZXhwcmVzc2lvbjogZXhwciwgZnJhZ21lbnRzOiBmcmFnbWVudHMgfSk7XG4gICAgICBpZiAoYmluZGluZy5jb21waWxlZCgpICE9PSBmYWxzZSkge1xuICAgICAgICBiaW5kaW5ncy5wdXNoKGJpbmRpbmcpO1xuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyBJZiB0aGUgZWxlbWVudCBpcyByZW1vdmVkIGZyb20gdGhlIERPTSwgc3RvcC4gQ2hlY2sgYnkgbG9va2luZyBhdCBpdHMgcGFyZW50Tm9kZVxuICAgIHZhciBwYXJlbnQgPSBub2RlLnBhcmVudE5vZGU7XG4gICAgdmFyIERlZmF1bHRCaW5kZXIgPSBmcmFnbWVudHMuZ2V0QXR0cmlidXRlQmluZGVyKCdfX2RlZmF1bHRfXycpO1xuXG4gICAgLy8gRmluZCBhbnkgYmluZGluZyBmb3IgdGhlIGVsZW1lbnRcbiAgICBCaW5kZXIgPSBmcmFnbWVudHMuZmluZEJpbmRlcignZWxlbWVudCcsIG5vZGUudGFnTmFtZS50b0xvd2VyQ2FzZSgpKTtcbiAgICBpZiAoQmluZGVyKSB7XG4gICAgICBiaW5kaW5nID0gbmV3IEJpbmRlcih7IG5vZGU6IG5vZGUsIHZpZXc6IHZpZXcsIGZyYWdtZW50czogZnJhZ21lbnRzIH0pO1xuICAgICAgaWYgKGJpbmRpbmcuY29tcGlsZWQoKSAhPT0gZmFsc2UpIHtcbiAgICAgICAgYmluZGluZ3MucHVzaChiaW5kaW5nKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBJZiByZW1vdmVkLCBtYWRlIGEgdGVtcGxhdGUsIGRvbid0IGNvbnRpbnVlIHByb2Nlc3NpbmdcbiAgICBpZiAobm9kZS5wYXJlbnROb2RlICE9PSBwYXJlbnQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBGaW5kIGFuZCBhZGQgYW55IGF0dHJpYnV0ZSBiaW5kaW5ncyBvbiBhbiBlbGVtZW50LiBUaGVzZSBjYW4gYmUgYXR0cmlidXRlcyB3aG9zZSBuYW1lIG1hdGNoZXMgYSBiaW5kaW5nLCBvclxuICAgIC8vIHRoZXkgY2FuIGJlIGF0dHJpYnV0ZXMgd2hpY2ggaGF2ZSBhIGJpbmRpbmcgaW4gdGhlIHZhbHVlIHN1Y2ggYXMgYGhyZWY9XCIvcG9zdC97eyBwb3N0LmlkIH19XCJgLlxuICAgIHZhciBib3VuZCA9IFtdO1xuICAgIHZhciBhdHRyaWJ1dGVzID0gc2xpY2UuY2FsbChub2RlLmF0dHJpYnV0ZXMpO1xuICAgIGZvciAoaSA9IDAsIGwgPSBhdHRyaWJ1dGVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgdmFyIGF0dHIgPSBhdHRyaWJ1dGVzW2ldO1xuICAgICAgdmFyIEJpbmRlciA9IGZyYWdtZW50cy5maW5kQmluZGVyKCdhdHRyaWJ1dGUnLCBhdHRyLm5hbWUsIGF0dHIudmFsdWUpO1xuICAgICAgaWYgKEJpbmRlcikge1xuICAgICAgICBib3VuZC5wdXNoKFsgQmluZGVyLCBhdHRyIF0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE1ha2Ugc3VyZSB0byBjcmVhdGUgYW5kIHByb2Nlc3MgdGhlbSBpbiB0aGUgY29ycmVjdCBwcmlvcml0eSBvcmRlciBzbyBpZiBhIGJpbmRpbmcgY3JlYXRlIGEgdGVtcGxhdGUgZnJvbSB0aGVcbiAgICAvLyBub2RlIGl0IGRvZXNuJ3QgcHJvY2VzcyB0aGUgb3RoZXJzLlxuICAgIGJvdW5kLnNvcnQoc29ydEF0dHJpYnV0ZXMpO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IGJvdW5kLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgQmluZGVyID0gYm91bmRbaV1bMF07XG4gICAgICB2YXIgYXR0ciA9IGJvdW5kW2ldWzFdO1xuICAgICAgaWYgKCFub2RlLmhhc0F0dHJpYnV0ZShhdHRyLm5hbWUpKSB7XG4gICAgICAgIC8vIElmIHRoaXMgd2FzIHJlbW92ZWQgYWxyZWFkeSBieSBhbm90aGVyIGJpbmRpbmcsIGRvbid0IHByb2Nlc3MuXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgdmFyIG5hbWUgPSBhdHRyLm5hbWU7XG4gICAgICB2YXIgdmFsdWUgPSBhdHRyLnZhbHVlO1xuICAgICAgaWYgKEJpbmRlci5leHByKSB7XG4gICAgICAgIG1hdGNoID0gbmFtZS5tYXRjaChCaW5kZXIuZXhwcik7XG4gICAgICAgIGlmIChtYXRjaCkgbWF0Y2ggPSBtYXRjaFsxXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1hdGNoID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgdHJ5IHtcbiAgICAgICAgbm9kZS5yZW1vdmVBdHRyaWJ1dGUoYXR0ci5uYW1lKTtcbiAgICAgIH0gY2F0Y2goZSkge31cblxuICAgICAgYmluZGluZyA9IG5ldyBCaW5kZXIoe1xuICAgICAgICBub2RlOiBub2RlLFxuICAgICAgICB2aWV3OiB2aWV3LFxuICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICBtYXRjaDogbWF0Y2gsXG4gICAgICAgIGV4cHJlc3Npb246IHZhbHVlID8gZnJhZ21lbnRzLmNvZGlmeUV4cHJlc3Npb24oJ2F0dHJpYnV0ZScsIHZhbHVlKSA6IG51bGwsXG4gICAgICAgIGZyYWdtZW50czogZnJhZ21lbnRzXG4gICAgICB9KTtcblxuICAgICAgaWYgKGJpbmRpbmcuY29tcGlsZWQoKSAhPT0gZmFsc2UpIHtcbiAgICAgICAgYmluZGluZ3MucHVzaChiaW5kaW5nKTtcbiAgICAgIH0gZWxzZSBpZiAoQmluZGVyICE9PSBEZWZhdWx0QmluZGVyICYmIGZyYWdtZW50cy5pc0JvdW5kKCdhdHRyaWJ1dGUnLCB2YWx1ZSkpIHtcbiAgICAgICAgLy8gUmV2ZXJ0IHRvIGRlZmF1bHQgaWYgdGhpcyBiaW5kaW5nIGRvZXNuJ3QgdGFrZVxuICAgICAgICBib3VuZC5wdXNoKFsgRGVmYXVsdEJpbmRlciwgYXR0ciBdKTtcbiAgICAgIH1cblxuICAgICAgaWYgKG5vZGUucGFyZW50Tm9kZSAhPT0gcGFyZW50KSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBiaW5kaW5ncztcbn1cblxuXG4vLyBTcGxpdHMgdGV4dCBub2RlcyB3aXRoIGV4cHJlc3Npb25zIGluIHRoZW0gc28gdGhleSBjYW4gYmUgYm91bmQgaW5kaXZpZHVhbGx5LCBoYXMgcGFyZW50Tm9kZSBwYXNzZWQgaW4gc2luY2UgaXQgbWF5XG4vLyBiZSBhIGRvY3VtZW50IGZyYWdtZW50IHdoaWNoIGFwcGVhcnMgYXMgbnVsbCBvbiBub2RlLnBhcmVudE5vZGUuXG5mdW5jdGlvbiBzcGxpdFRleHROb2RlKGZyYWdtZW50cywgbm9kZSkge1xuICBpZiAoIW5vZGUucHJvY2Vzc2VkKSB7XG4gICAgbm9kZS5wcm9jZXNzZWQgPSB0cnVlO1xuICAgIHZhciByZWdleCA9IGZyYWdtZW50cy5iaW5kZXJzLnRleHQuX2V4cHI7XG4gICAgdmFyIGNvbnRlbnQgPSBub2RlLm5vZGVWYWx1ZTtcbiAgICBpZiAoY29udGVudC5tYXRjaChyZWdleCkpIHtcbiAgICAgIHZhciBtYXRjaCwgbGFzdEluZGV4ID0gMCwgcGFydHMgPSBbXSwgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgICB3aGlsZSAobWF0Y2ggPSByZWdleC5leGVjKGNvbnRlbnQpKSB7XG4gICAgICAgIHBhcnRzLnB1c2goY29udGVudC5zbGljZShsYXN0SW5kZXgsIHJlZ2V4Lmxhc3RJbmRleCAtIG1hdGNoWzBdLmxlbmd0aCkpO1xuICAgICAgICBwYXJ0cy5wdXNoKG1hdGNoWzBdKTtcbiAgICAgICAgbGFzdEluZGV4ID0gcmVnZXgubGFzdEluZGV4O1xuICAgICAgfVxuICAgICAgcGFydHMucHVzaChjb250ZW50LnNsaWNlKGxhc3RJbmRleCkpO1xuICAgICAgcGFydHMgPSBwYXJ0cy5maWx0ZXIobm90RW1wdHkpO1xuXG4gICAgICBub2RlLm5vZGVWYWx1ZSA9IHBhcnRzWzBdO1xuICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgbmV3VGV4dE5vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShwYXJ0c1tpXSk7XG4gICAgICAgIG5ld1RleHROb2RlLnByb2Nlc3NlZCA9IHRydWU7XG4gICAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKG5ld1RleHROb2RlKTtcbiAgICAgIH1cbiAgICAgIG5vZGUucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoZnJhZ21lbnQsIG5vZGUubmV4dFNpYmxpbmcpO1xuICAgIH1cbiAgfVxufVxuXG5cbmZ1bmN0aW9uIHNvcnRBdHRyaWJ1dGVzKGEsIGIpIHtcbiAgcmV0dXJuIGJbMF0ucHJvdG90eXBlLnByaW9yaXR5IC0gYVswXS5wcm90b3R5cGUucHJpb3JpdHk7XG59XG5cbmZ1bmN0aW9uIG5vdEVtcHR5KHZhbHVlKSB7XG4gIHJldHVybiBCb29sZWFuKHZhbHVlKTtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gRnJhZ21lbnRzO1xucmVxdWlyZSgnLi91dGlsL3BvbHlmaWxscycpO1xudmFyIGV4dGVuZCA9IHJlcXVpcmUoJy4vdXRpbC9leHRlbmQnKTtcbnZhciB0b0ZyYWdtZW50ID0gcmVxdWlyZSgnLi91dGlsL3RvRnJhZ21lbnQnKTtcbnZhciBhbmltYXRpb24gPSByZXF1aXJlKCcuL3V0aWwvYW5pbWF0aW9uJyk7XG52YXIgVGVtcGxhdGUgPSByZXF1aXJlKCcuL3RlbXBsYXRlJyk7XG52YXIgVmlldyA9IHJlcXVpcmUoJy4vdmlldycpO1xudmFyIEJpbmRpbmcgPSByZXF1aXJlKCcuL2JpbmRpbmcnKTtcbnZhciBBbmltYXRlZEJpbmRpbmcgPSByZXF1aXJlKCcuL2FuaW1hdGVkQmluZGluZycpO1xudmFyIGNvbXBpbGUgPSByZXF1aXJlKCcuL2NvbXBpbGUnKTtcbnZhciByZWdpc3RlckRlZmF1bHRCaW5kZXJzID0gcmVxdWlyZSgnLi9yZWdpc3RlcmVkL2JpbmRlcnMnKTtcbnZhciByZWdpc3RlckRlZmF1bHRGb3JtYXR0ZXJzID0gcmVxdWlyZSgnLi9yZWdpc3RlcmVkL2Zvcm1hdHRlcnMnKTtcbnZhciByZWdpc3RlckRlZmF1bHRBbmltYXRpb25zID0gcmVxdWlyZSgnLi9yZWdpc3RlcmVkL2FuaW1hdGlvbnMnKTtcblxuLyoqXG4gKiBBIEZyYWdtZW50cyBvYmplY3Qgc2VydmVzIGFzIGEgcmVnaXN0cnkgZm9yIGJpbmRlcnMgYW5kIGZvcm1hdHRlcnNcbiAqIEBwYXJhbSB7W3R5cGVdfSBPYnNlcnZlckNsYXNzIFtkZXNjcmlwdGlvbl1cbiAqL1xuZnVuY3Rpb24gRnJhZ21lbnRzKE9ic2VydmVyQ2xhc3MpIHtcbiAgaWYgKCFPYnNlcnZlckNsYXNzKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignTXVzdCBwcm92aWRlIGFuIE9ic2VydmVyIGNsYXNzIHRvIEZyYWdtZW50cy4nKTtcbiAgfVxuXG4gIHRoaXMuT2JzZXJ2ZXIgPSBPYnNlcnZlckNsYXNzO1xuICB0aGlzLmZvcm1hdHRlcnMgPSBPYnNlcnZlckNsYXNzLmZvcm1hdHRlcnMgPSB7fTtcbiAgdGhpcy5hbmltYXRpb25zID0ge307XG4gIHRoaXMuYW5pbWF0ZUF0dHJpYnV0ZSA9ICdhbmltYXRlJztcblxuICB0aGlzLmJpbmRlcnMgPSB7XG4gICAgZWxlbWVudDogeyBfd2lsZGNhcmRzOiBbXSB9LFxuICAgIGF0dHJpYnV0ZTogeyBfd2lsZGNhcmRzOiBbXSwgX2V4cHI6IC97e1xccyooLio/KVxccyp9fS9nIH0sXG4gICAgdGV4dDogeyBfd2lsZGNhcmRzOiBbXSwgX2V4cHI6IC97e1xccyooLio/KVxccyp9fS9nIH1cbiAgfTtcblxuICAvLyBUZXh0IGJpbmRlciBmb3IgdGV4dCBub2RlcyB3aXRoIGV4cHJlc3Npb25zIGluIHRoZW1cbiAgdGhpcy5yZWdpc3RlclRleHQoJ19fZGVmYXVsdF9fJywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICB0aGlzLmVsZW1lbnQudGV4dENvbnRlbnQgPSAodmFsdWUgIT0gbnVsbCkgPyB2YWx1ZSA6ICcnO1xuICB9KTtcblxuICAvLyBDYXRjaGFsbCBhdHRyaWJ1dGUgYmluZGVyIGZvciByZWd1bGFyIGF0dHJpYnV0ZXMgd2l0aCBleHByZXNzaW9ucyBpbiB0aGVtXG4gIHRoaXMucmVnaXN0ZXJBdHRyaWJ1dGUoJ19fZGVmYXVsdF9fJywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAodmFsdWUgIT0gbnVsbCkge1xuICAgICAgdGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZSh0aGlzLm5hbWUsIHZhbHVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5lbGVtZW50LnJlbW92ZUF0dHJpYnV0ZSh0aGlzLm5hbWUpO1xuICAgIH1cbiAgfSk7XG5cbiAgcmVnaXN0ZXJEZWZhdWx0QmluZGVycyh0aGlzKTtcbiAgcmVnaXN0ZXJEZWZhdWx0Rm9ybWF0dGVycyh0aGlzKTtcbiAgcmVnaXN0ZXJEZWZhdWx0QW5pbWF0aW9ucyh0aGlzKTtcbn1cblxuRnJhZ21lbnRzLnByb3RvdHlwZSA9IHtcblxuICAvKipcbiAgICogVGFrZXMgYW4gSFRNTCBzdHJpbmcsIGFuIGVsZW1lbnQsIGFuIGFycmF5IG9mIGVsZW1lbnRzLCBvciBhIGRvY3VtZW50IGZyYWdtZW50LCBhbmQgY29tcGlsZXMgaXQgaW50byBhIHRlbXBsYXRlLlxuICAgKiBJbnN0YW5jZXMgbWF5IHRoZW4gYmUgY3JlYXRlZCBhbmQgYm91bmQgdG8gYSBnaXZlbiBjb250ZXh0LlxuICAgKiBAcGFyYW0ge1N0cmluZ3xOb2RlTGlzdHxIVE1MQ29sbGVjdGlvbnxIVE1MVGVtcGxhdGVFbGVtZW50fEhUTUxTY3JpcHRFbGVtZW50fE5vZGV9IGh0bWwgQSBUZW1wbGF0ZSBjYW4gYmUgY3JlYXRlZFxuICAgKiBmcm9tIG1hbnkgZGlmZmVyZW50IHR5cGVzIG9mIG9iamVjdHMuIEFueSBvZiB0aGVzZSB3aWxsIGJlIGNvbnZlcnRlZCBpbnRvIGEgZG9jdW1lbnQgZnJhZ21lbnQgZm9yIHRoZSB0ZW1wbGF0ZSB0b1xuICAgKiBjbG9uZS4gTm9kZXMgYW5kIGVsZW1lbnRzIHBhc3NlZCBpbiB3aWxsIGJlIHJlbW92ZWQgZnJvbSB0aGUgRE9NLlxuICAgKi9cbiAgY3JlYXRlVGVtcGxhdGU6IGZ1bmN0aW9uKGh0bWwpIHtcbiAgICB2YXIgZnJhZ21lbnQgPSB0b0ZyYWdtZW50KGh0bWwpO1xuICAgIGlmIChmcmFnbWVudC5jaGlsZE5vZGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgY3JlYXRlIGEgdGVtcGxhdGUgZnJvbSAnICsgaHRtbCk7XG4gICAgfVxuICAgIHZhciB0ZW1wbGF0ZSA9IGV4dGVuZC5tYWtlKFRlbXBsYXRlLCBmcmFnbWVudCk7XG4gICAgdGVtcGxhdGUuYmluZGluZ3MgPSBjb21waWxlKHRoaXMsIHRlbXBsYXRlKTtcbiAgICByZXR1cm4gdGVtcGxhdGU7XG4gIH0sXG5cblxuICAvKipcbiAgICogQ29tcGlsZXMgYmluZGluZ3Mgb24gYW4gZWxlbWVudC5cbiAgICovXG4gIGNvbXBpbGVFbGVtZW50OiBmdW5jdGlvbihlbGVtZW50KSB7XG4gICAgaWYgKCFlbGVtZW50LmJpbmRpbmdzKSB7XG4gICAgICBlbGVtZW50LmJpbmRpbmdzID0gY29tcGlsZSh0aGlzLCBlbGVtZW50KTtcbiAgICAgIGV4dGVuZC5tYWtlKFZpZXcsIGVsZW1lbnQsIGVsZW1lbnQpO1xuICAgIH1cblxuICAgIHJldHVybiBlbGVtZW50O1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIENvbXBpbGVzIGFuZCBiaW5kcyBhbiBlbGVtZW50IHdoaWNoIHdhcyBub3QgY3JlYXRlZCBmcm9tIGEgdGVtcGxhdGUuIE1vc3RseSBvbmx5IHVzZWQgZm9yIGJpbmRpbmcgdGhlIGRvY3VtZW50J3NcbiAgICogaHRtbCBlbGVtZW50LlxuICAgKi9cbiAgYmluZEVsZW1lbnQ6IGZ1bmN0aW9uKGVsZW1lbnQsIGNvbnRleHQpIHtcbiAgICB0aGlzLmNvbXBpbGVFbGVtZW50KGVsZW1lbnQpO1xuXG4gICAgaWYgKGNvbnRleHQpIHtcbiAgICAgIGVsZW1lbnQuYmluZChjb250ZXh0KTtcbiAgICB9XG5cbiAgICByZXR1cm4gZWxlbWVudDtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBSZWdpc3RlcnMgYSBiaW5kZXIgZm9yIGEgZ2l2ZW4gdHlwZSBhbmQgbmFtZS4gQSBiaW5kZXIgaXMgYSBzdWJjbGFzcyBvZiBCaW5kaW5nIGFuZCBpcyB1c2VkIHRvIGNyZWF0ZSBiaW5kaW5ncyBvblxuICAgKiBhbiBlbGVtZW50IG9yIHRleHQgbm9kZSB3aG9zZSB0YWcgbmFtZSwgYXR0cmlidXRlIG5hbWUsIG9yIGV4cHJlc3Npb24gY29udGVudHMgbWF0Y2ggdGhpcyBiaW5kZXIncyBuYW1lL2V4cHJlc3Npb24uXG4gICAqXG4gICAqICMjIyBQYXJhbWV0ZXJzXG4gICAqXG4gICAqICAqIGB0eXBlYDogdGhlcmUgYXJlIHRocmVlIHR5cGVzIG9mIGJpbmRlcnM6IGVsZW1lbnQsIGF0dHJpYnV0ZSwgb3IgdGV4dC4gVGhlc2UgY29ycmVzcG9uZCB0byBtYXRjaGluZyBhZ2FpbnN0IGFuXG4gICAqICAgIGVsZW1lbnQncyB0YWcgbmFtZSwgYW4gZWxlbWVudCB3aXRoIHRoZSBnaXZlbiBhdHRyaWJ1dGUgbmFtZSwgb3IgYSB0ZXh0IG5vZGUgdGhhdCBtYXRjaGVzIHRoZSBwcm92aWRlZFxuICAgKiAgICBleHByZXNzaW9uLlxuICAgKlxuICAgKiAgKiBgbmFtZWA6IHRvIG1hdGNoLCBhIGJpbmRlciBuZWVkcyB0aGUgbmFtZSBvZiBhbiBlbGVtZW50IG9yIGF0dHJpYnV0ZSwgb3IgYSByZWd1bGFyIGV4cHJlc3Npb24gdGhhdCBtYXRjaGVzIGFcbiAgICogICAgZ2l2ZW4gdGV4dCBub2RlLiBOYW1lcyBmb3IgZWxlbWVudHMgYW5kIGF0dHJpYnV0ZXMgY2FuIGJlIHJlZ3VsYXIgZXhwcmVzc2lvbnMgYXMgd2VsbCwgb3IgdGhleSBtYXkgYmUgd2lsZGNhcmRcbiAgICogICAgbmFtZXMgYnkgdXNpbmcgYW4gYXN0ZXJpc2suXG4gICAqXG4gICAqICAqIGBkZWZpbml0aW9uYDogYSBiaW5kZXIgaXMgYSBzdWJjbGFzcyBvZiBCaW5kaW5nIHdoaWNoIG92ZXJyaWRlcyBrZXkgbWV0aG9kcywgYGNvbXBpbGVkYCwgYGNyZWF0ZWRgLCBgdXBkYXRlZGAsXG4gICAqICAgIGBib3VuZGAsIGFuZCBgdW5ib3VuZGAuIFRoZSBkZWZpbml0aW9uIG1heSBiZSBhbiBhY3R1YWwgc3ViY2xhc3Mgb2YgQmluZGluZyBvciBpdCBtYXkgYmUgYW4gb2JqZWN0IHdoaWNoIHdpbGwgYmVcbiAgICogICAgdXNlZCBmb3IgdGhlIHByb3RvdHlwZSBvZiB0aGUgbmV3bHkgY3JlYXRlZCBzdWJjbGFzcy4gRm9yIG1hbnkgYmluZGluZ3Mgb25seSB0aGUgYHVwZGF0ZWRgIG1ldGhvZCBpcyBvdmVycmlkZGVuLFxuICAgKiAgICBzbyBieSBqdXN0IHBhc3NpbmcgaW4gYSBmdW5jdGlvbiBmb3IgYGRlZmluaXRpb25gIHRoZSBiaW5kZXIgd2lsbCBiZSBjcmVhdGVkIHdpdGggdGhhdCBhcyBpdHMgYHVwZGF0ZWRgIG1ldGhvZC5cbiAgICpcbiAgICogIyMjIEV4cGxhaW5hdGlvbiBvZiBwcm9wZXJ0aWVzIGFuZCBtZXRob2RzXG4gICAqXG4gICAqICAgKiBgcHJpb3JpdHlgIG1heSBiZSBkZWZpbmVkIGFzIG51bWJlciB0byBpbnN0cnVjdCBzb21lIGJpbmRlcnMgdG8gYmUgcHJvY2Vzc2VkIGJlZm9yZSBvdGhlcnMuIEJpbmRlcnMgd2l0aFxuICAgKiAgIGhpZ2hlciBwcmlvcml0eSBhcmUgcHJvY2Vzc2VkIGZpcnN0LlxuICAgKlxuICAgKiAgICogYGFuaW1hdGVkYCBjYW4gYmUgc2V0IHRvIGB0cnVlYCB0byBleHRlbmQgdGhlIEFuaW1hdGVkQmluZGluZyBjbGFzcyB3aGljaCBwcm92aWRlcyBzdXBwb3J0IGZvciBhbmltYXRpb24gd2hlblxuICAgKiAgIGluc2VydGluZ2FuZCByZW1vdmluZyBub2RlcyBmcm9tIHRoZSBET00uIFRoZSBgYW5pbWF0ZWRgIHByb3BlcnR5IG9ubHkgKmFsbG93cyogYW5pbWF0aW9uIGJ1dCB0aGUgZWxlbWVudCBtdXN0XG4gICAqICAgaGF2ZSB0aGUgYGFuaW1hdGVgIGF0dHJpYnV0ZSB0byB1c2UgYW5pbWF0aW9uLiBBIGJpbmRpbmcgd2lsbCBoYXZlIHRoZSBgYW5pbWF0ZWAgcHJvcGVydHkgc2V0IHRvIHRydWUgd2hlbiBpdCBpc1xuICAgKiAgIHRvIGJlIGFuaW1hdGVkLiBCaW5kZXJzIHNob3VsZCBoYXZlIGZhc3QgcGF0aHMgZm9yIHdoZW4gYW5pbWF0aW9uIGlzIG5vdCB1c2VkIHJhdGhlciB0aGFuIGFzc3VtaW5nIGFuaW1hdGlvbiB3aWxsXG4gICAqICAgYmUgdXNlZC5cbiAgICpcbiAgICogQmluZGVyc1xuICAgKlxuICAgKiBBIGJpbmRlciBjYW4gaGF2ZSA1IG1ldGhvZHMgd2hpY2ggd2lsbCBiZSBjYWxsZWQgYXQgdmFyaW91cyBwb2ludHMgaW4gYSBiaW5kaW5nJ3MgbGlmZWN5Y2xlLiBNYW55IGJpbmRlcnMgd2lsbFxuICAgKiBvbmx5IHVzZSB0aGUgYHVwZGF0ZWQodmFsdWUpYCBtZXRob2QsIHNvIGNhbGxpbmcgcmVnaXN0ZXIgd2l0aCBhIGZ1bmN0aW9uIGluc3RlYWQgb2YgYW4gb2JqZWN0IGFzIGl0cyB0aGlyZFxuICAgKiBwYXJhbWV0ZXIgaXMgYSBzaG9ydGN1dCB0byBjcmVhdGluZyBhIGJpbmRlciB3aXRoIGp1c3QgYW4gYHVwZGF0ZWAgbWV0aG9kLlxuICAgKlxuICAgKiBMaXN0ZWQgaW4gb3JkZXIgb2Ygd2hlbiB0aGV5IG9jY3VyIGluIGEgYmluZGluZydzIGxpZmVjeWNsZTpcbiAgICpcbiAgICogICAqIGBjb21waWxlZChvcHRpb25zKWAgaXMgY2FsbGVkIHdoZW4gZmlyc3QgY3JlYXRpbmcgYSBiaW5kaW5nIGR1cmluZyB0aGUgdGVtcGxhdGUgY29tcGlsYXRpb24gcHJvY2VzcyBhbmQgcmVjZWl2ZXNcbiAgICogdGhlIGBvcHRpb25zYCBvYmplY3QgdGhhdCB3aWxsIGJlIHBhc3NlZCBpbnRvIGBuZXcgQmluZGluZyhvcHRpb25zKWAuIFRoaXMgY2FuIGJlIHVzZWQgZm9yIGNyZWF0aW5nIHRlbXBsYXRlcyxcbiAgICogbW9kaWZ5aW5nIHRoZSBET00gKG9ubHkgc3Vic2VxdWVudCBET00gdGhhdCBoYXNuJ3QgYWxyZWFkeSBiZWVuIHByb2Nlc3NlZCkgYW5kIG90aGVyIHRoaW5ncyB0aGF0IHNob3VsZCBiZVxuICAgKiBhcHBsaWVkIGF0IGNvbXBpbGUgdGltZSBhbmQgbm90IGR1cGxpY2F0ZWQgZm9yIGVhY2ggdmlldyBjcmVhdGVkLlxuICAgKlxuICAgKiAgICogYGNyZWF0ZWQoKWAgaXMgY2FsbGVkIG9uIHRoZSBiaW5kaW5nIHdoZW4gYSBuZXcgdmlldyBpcyBjcmVhdGVkLiBUaGlzIGNhbiBiZSB1c2VkIHRvIGFkZCBldmVudCBsaXN0ZW5lcnMgb24gdGhlXG4gICAqIGVsZW1lbnQgb3IgZG8gb3RoZXIgdGhpbmdzIHRoYXQgd2lsbCBwZXJzaXN0ZSB3aXRoIHRoZSB2aWV3IHRocm91Z2ggaXRzIG1hbnkgdXNlcy4gVmlld3MgbWF5IGdldCByZXVzZWQgc28gZG9uJ3RcbiAgICogZG8gYW55dGhpbmcgaGVyZSB0byB0aWUgaXQgdG8gYSBnaXZlbiBjb250ZXh0LlxuICAgKlxuICAgKiAgICogYGF0dGFjaGVkKClgIGlzIGNhbGxlZCBvbiB0aGUgYmluZGluZyB3aGVuIHRoZSB2aWV3IGlzIGJvdW5kIHRvIGEgZ2l2ZW4gY29udGV4dCBhbmQgaW5zZXJ0ZWQgaW50byB0aGUgRE9NLiBUaGlzXG4gICAqIGNhbiBiZSB1c2VkIHRvIGhhbmRsZSBjb250ZXh0LXNwZWNpZmljIGFjdGlvbnMsIGFkZCBsaXN0ZW5lcnMgdG8gdGhlIHdpbmRvdyBvciBkb2N1bWVudCAodG8gYmUgcmVtb3ZlZCBpblxuICAgKiBgZGV0YWNoZWRgISksIGV0Yy5cbiAgICpcbiAgICogICAqIGB1cGRhdGVkKHZhbHVlLCBvbGRWYWx1ZSwgY2hhbmdlUmVjb3JkcylgIGlzIGNhbGxlZCBvbiB0aGUgYmluZGluZyB3aGVuZXZlciB0aGUgdmFsdWUgb2YgdGhlIGV4cHJlc3Npb24gd2l0aGluXG4gICAqIHRoZSBhdHRyaWJ1dGUgY2hhbmdlcy4gRm9yIGV4YW1wbGUsIGBiaW5kLXRleHQ9XCJ7e3VzZXJuYW1lfX1cImAgd2lsbCB0cmlnZ2VyIGB1cGRhdGVkYCB3aXRoIHRoZSB2YWx1ZSBvZiB1c2VybmFtZVxuICAgKiB3aGVuZXZlciBpdCBjaGFuZ2VzIG9uIHRoZSBnaXZlbiBjb250ZXh0LiBXaGVuIHRoZSB2aWV3IGlzIHJlbW92ZWQgYHVwZGF0ZWRgIHdpbGwgYmUgdHJpZ2dlcmVkIHdpdGggYSB2YWx1ZSBvZlxuICAgKiBgdW5kZWZpbmVkYCBpZiB0aGUgdmFsdWUgd2FzIG5vdCBhbHJlYWR5IGB1bmRlZmluZWRgLCBnaXZpbmcgYSBjaGFuY2UgdG8gXCJyZXNldFwiIHRvIGFuIGVtcHR5IHN0YXRlLlxuICAgKlxuICAgKiAgICogYGRldGFjaGVkKClgIGlzIGNhbGxlZCBvbiB0aGUgYmluZGluZyB3aGVuIHRoZSB2aWV3IGlzIHVuYm91bmQgdG8gYSBnaXZlbiBjb250ZXh0IGFuZCByZW1vdmVkIGZyb20gdGhlIERPTS4gVGhpc1xuICAgKiBjYW4gYmUgdXNlZCB0byBjbGVhbiB1cCBhbnl0aGluZyBkb25lIGluIGBhdHRhY2hlZCgpYCBvciBpbiBgdXBkYXRlZCgpYCBiZWZvcmUgYmVpbmcgcmVtb3ZlZC5cbiAgICpcbiAgICogRWxlbWVudCBhbmQgYXR0cmlidXRlIGJpbmRlcnMgd2lsbCBhcHBseSB3aGVuZXZlciB0aGUgdGFnIG5hbWUgb3IgYXR0cmlidXRlIG5hbWUgaXMgbWF0Y2hlZC4gSW4gdGhlIGNhc2Ugb2ZcbiAgICogYXR0cmlidXRlIGJpbmRlcnMgaWYgeW91IG9ubHkgd2FudCBpdCB0byBtYXRjaCB3aGVuIGV4cHJlc3Npb25zIGFyZSB1c2VkIHdpdGhpbiB0aGUgYXR0cmlidXRlLCBhZGQgYG9ubHlXaGVuQm91bmRgXG4gICAqIHRvIHRoZSBkZWZpbml0aW9uLiBPdGhlcndpc2UgdGhlIGJpbmRlciB3aWxsIG1hdGNoIGFuZCB0aGUgdmFsdWUgb2YgdGhlIGV4cHJlc3Npb24gd2lsbCBzaW1wbHkgYmUgYSBzdHJpbmcgdGhhdFxuICAgKiBvbmx5IGNhbGxzIHVwZGF0ZWQgb25jZSBzaW5jZSBpdCB3aWxsIG5vdCBjaGFuZ2UuXG4gICAqXG4gICAqIE5vdGUsIGF0dHJpYnV0ZXMgd2hpY2ggbWF0Y2ggYSBiaW5kZXIgYXJlIHJlbW92ZWQgZHVyaW5nIGNvbXBpbGUuIFRoZXkgYXJlIGNvbnNpZGVyZWQgdG8gYmUgYmluZGluZyBkZWZpbml0aW9ucyBhbmRcbiAgICogbm90IHBhcnQgb2YgdGhlIGVsZW1lbnQuIEJpbmRpbmdzIG1heSBzZXQgdGhlIGF0dHJpYnV0ZSB3aGljaCBzZXJ2ZWQgYXMgdGhlaXIgZGVmaW5pdGlvbiBpZiBkZXNpcmVkLlxuICAgKlxuICAgKiAjIyMgRGVmYXVsdHNcbiAgICpcbiAgICogVGhlcmUgYXJlIGRlZmF1bHQgYmluZGVycyBmb3IgYXR0cmlidXRlIGFuZCB0ZXh0IG5vZGVzIHdoaWNoIGFwcGx5IHdoZW4gbm8gb3RoZXIgYmluZGVycyBtYXRjaC4gVGhleSBvbmx5IGFwcGx5IHRvXG4gICAqIGF0dHJpYnV0ZXMgYW5kIHRleHQgbm9kZXMgd2l0aCBleHByZXNzaW9ucyBpbiB0aGVtIChlLmcuIGB7e2Zvb319YCkuIFRoZSBkZWZhdWx0IGlzIHRvIHNldCB0aGUgYXR0cmlidXRlIG9yIHRleHRcbiAgICogbm9kZSdzIHZhbHVlIHRvIHRoZSByZXN1bHQgb2YgdGhlIGV4cHJlc3Npb24uIElmIHlvdSB3YW50ZWQgdG8gb3ZlcnJpZGUgdGhpcyBkZWZhdWx0IHlvdSBtYXkgcmVnaXN0ZXIgYSBiaW5kZXIgd2l0aFxuICAgKiB0aGUgbmFtZSBgXCJfX2RlZmF1bHRfX1wiYC5cbiAgICpcbiAgICogKipFeGFtcGxlOioqIFRoaXMgYmluZGluZyBoYW5kbGVyIGFkZHMgcGlyYXRlaXplZCB0ZXh0IHRvIGFuIGVsZW1lbnQuXG4gICAqIGBgYGphdmFzY3JpcHRcbiAgICogcmVnaXN0cnkucmVnaXN0ZXJBdHRyaWJ1dGUoJ215LXBpcmF0ZScsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAqICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICogICAgIHZhbHVlID0gJyc7XG4gICAqICAgfSBlbHNlIHtcbiAgICogICAgIHZhbHVlID0gdmFsdWVcbiAgICogICAgICAgLnJlcGxhY2UoL1xcQmluZ1xcYi9nLCBcImluJ1wiKVxuICAgKiAgICAgICAucmVwbGFjZSgvXFxidG9cXGIvZywgXCJ0J1wiKVxuICAgKiAgICAgICAucmVwbGFjZSgvXFxieW91XFxiLywgJ3llJylcbiAgICogICAgICAgKyAnIEFycnJyISc7XG4gICAqICAgfVxuICAgKiAgIHRoaXMuZWxlbWVudC50ZXh0Q29udGVudCA9IHZhbHVlO1xuICAgKiB9KTtcbiAgICogYGBgXG4gICAqXG4gICAqIGBgYGh0bWxcbiAgICogPHAgbXktcGlyYXRlPVwie3twb3N0LmJvZHl9fVwiPlRoaXMgdGV4dCB3aWxsIGJlIHJlcGxhY2VkLjwvcD5cbiAgICogYGBgXG4gICAqL1xuICByZWdpc3RlckVsZW1lbnQ6IGZ1bmN0aW9uKG5hbWUsIGRlZmluaXRpb24pIHtcbiAgICByZXR1cm4gdGhpcy5yZWdpc3RlckJpbmRlcignZWxlbWVudCcsIG5hbWUsIGRlZmluaXRpb24pO1xuICB9LFxuICByZWdpc3RlckF0dHJpYnV0ZTogZnVuY3Rpb24obmFtZSwgZGVmaW5pdGlvbikge1xuICAgIHJldHVybiB0aGlzLnJlZ2lzdGVyQmluZGVyKCdhdHRyaWJ1dGUnLCBuYW1lLCBkZWZpbml0aW9uKTtcbiAgfSxcbiAgcmVnaXN0ZXJUZXh0OiBmdW5jdGlvbihuYW1lLCBkZWZpbml0aW9uKSB7XG4gICAgcmV0dXJuIHRoaXMucmVnaXN0ZXJCaW5kZXIoJ3RleHQnLCBuYW1lLCBkZWZpbml0aW9uKTtcbiAgfSxcbiAgcmVnaXN0ZXJCaW5kZXI6IGZ1bmN0aW9uKHR5cGUsIG5hbWUsIGRlZmluaXRpb24pIHtcbiAgICB2YXIgYmluZGVyLCBiaW5kZXJzID0gdGhpcy5iaW5kZXJzW3R5cGVdXG4gICAgdmFyIHN1cGVyQ2xhc3MgPSBkZWZpbml0aW9uLmFuaW1hdGVkID8gQW5pbWF0ZWRCaW5kaW5nIDogQmluZGluZztcblxuICAgIGlmICghYmluZGVycykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYHR5cGVgIG11c3QgYmUgb25lIG9mICcgKyBPYmplY3Qua2V5cyh0aGlzLmJpbmRlcnMpLmpvaW4oJywgJykpO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgZGVmaW5pdGlvbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgaWYgKGRlZmluaXRpb24ucHJvdG90eXBlIGluc3RhbmNlb2YgQmluZGluZykge1xuICAgICAgICBzdXBlckNsYXNzID0gZGVmaW5pdGlvbjtcbiAgICAgICAgZGVmaW5pdGlvbiA9IHt9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVmaW5pdGlvbiA9IHsgdXBkYXRlZDogZGVmaW5pdGlvbiB9O1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChuYW1lID09PSAnX19kZWZhdWx0X18nICYmICFkZWZpbml0aW9uLmhhc093blByb3BlcnR5KCdwcmlvcml0eScpKSB7XG4gICAgICBkZWZpbml0aW9uLnByaW9yaXR5ID0gLTEwMDtcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgYSBzdWJjbGFzcyBvZiBCaW5kaW5nIChvciBhbm90aGVyIGJpbmRlcikgd2l0aCB0aGUgZGVmaW5pdGlvblxuICAgIGZ1bmN0aW9uIEJpbmRlcigpIHtcbiAgICAgIHN1cGVyQ2xhc3MuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgZGVmaW5pdGlvbi5PYnNlcnZlciA9IHRoaXMuT2JzZXJ2ZXI7XG4gICAgc3VwZXJDbGFzcy5leHRlbmQoQmluZGVyLCBkZWZpbml0aW9uKTtcblxuICAgIHZhciBleHByO1xuICAgIGlmIChuYW1lIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICBleHByID0gbmFtZTtcbiAgICB9IGVsc2UgaWYgKG5hbWUuaW5kZXhPZignKicpID49IDApIHtcbiAgICAgIGV4cHIgPSBuZXcgUmVnRXhwKCdeJyArIGVzY2FwZVJlZ0V4cChuYW1lKS5yZXBsYWNlKCdcXFxcKicsICcoLiopJykgKyAnJCcpO1xuICAgIH1cblxuICAgIGlmIChleHByKSB7XG4gICAgICBCaW5kZXIuZXhwciA9IGV4cHI7XG4gICAgICBiaW5kZXJzLl93aWxkY2FyZHMucHVzaChCaW5kZXIpO1xuICAgICAgYmluZGVycy5fd2lsZGNhcmRzLnNvcnQodGhpcy5iaW5kaW5nU29ydCk7XG4gICAgfVxuXG4gICAgQmluZGVyLm5hbWUgPSAnJyArIG5hbWU7XG4gICAgYmluZGVyc1tuYW1lXSA9IEJpbmRlcjtcbiAgICByZXR1cm4gQmluZGVyO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgYSBiaW5kZXIgdGhhdCB3YXMgYWRkZWQgd2l0aCBgcmVnaXN0ZXIoKWAuIElmIGFuIFJlZ0V4cCB3YXMgdXNlZCBpbiByZWdpc3RlciBmb3IgdGhlIG5hbWUgaXQgbXVzdCBiZSB1c2VkXG4gICAqIHRvIHVucmVnaXN0ZXIsIGJ1dCBpdCBkb2VzIG5vdCBuZWVkIHRvIGJlIHRoZSBzYW1lIGluc3RhbmNlLlxuICAgKi9cbiAgdW5yZWdpc3RlckVsZW1lbnQ6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy51bnJlZ2lzdGVyQmluZGVyKCdlbGVtZW50JywgbmFtZSk7XG4gIH0sXG4gIHVucmVnaXN0ZXJBdHRyaWJ1dGU6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy51bnJlZ2lzdGVyQmluZGVyKCdhdHRyaWJ1dGUnLCBuYW1lKTtcbiAgfSxcbiAgdW5yZWdpc3RlclRleHQ6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy51bnJlZ2lzdGVyQmluZGVyKCd0ZXh0JywgbmFtZSk7XG4gIH0sXG4gIHVucmVnaXN0ZXJCaW5kZXI6IGZ1bmN0aW9uKHR5cGUsIG5hbWUpIHtcbiAgICB2YXIgYmluZGVyID0gdGhpcy5nZXRCaW5kZXIodHlwZSwgbmFtZSksIGJpbmRlcnMgPSB0aGlzLmJpbmRlcnNbdHlwZV07XG4gICAgaWYgKCFiaW5kZXIpIHJldHVybjtcbiAgICBpZiAoYmluZGVyLmV4cHIpIHtcbiAgICAgIHZhciBpbmRleCA9IGJpbmRlcnMuX3dpbGRjYXJkcy5pbmRleE9mKGJpbmRlcik7XG4gICAgICBpZiAoaW5kZXggPj0gMCkgYmluZGVycy5fd2lsZGNhcmRzLnNwbGljZShpbmRleCwgMSk7XG4gICAgfVxuICAgIGRlbGV0ZSBiaW5kZXJzW25hbWVdO1xuICAgIHJldHVybiBiaW5kZXI7XG4gIH0sXG5cblxuICAvKipcbiAgICogUmV0dXJucyBhIGJpbmRlciB0aGF0IHdhcyBhZGRlZCB3aXRoIGByZWdpc3RlcigpYCBieSB0eXBlIGFuZCBuYW1lLlxuICAgKi9cbiAgZ2V0RWxlbWVudEJpbmRlcjogZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLmdldEJpbmRlcignZWxlbWVudCcsIG5hbWUpO1xuICB9LFxuICBnZXRBdHRyaWJ1dGVCaW5kZXI6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRCaW5kZXIoJ2F0dHJpYnV0ZScsIG5hbWUpO1xuICB9LFxuICBnZXRUZXh0QmluZGVyOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QmluZGVyKCd0ZXh0JywgbmFtZSk7XG4gIH0sXG4gIGdldEJpbmRlcjogZnVuY3Rpb24odHlwZSwgbmFtZSkge1xuICAgIHZhciBiaW5kZXJzID0gdGhpcy5iaW5kZXJzW3R5cGVdO1xuXG4gICAgaWYgKCFiaW5kZXJzKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdgdHlwZWAgbXVzdCBiZSBvbmUgb2YgJyArIE9iamVjdC5rZXlzKHRoaXMuYmluZGVycykuam9pbignLCAnKSk7XG4gICAgfVxuXG4gICAgaWYgKG5hbWUgJiYgYmluZGVycy5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgcmV0dXJuIGJpbmRlcnNbbmFtZV07XG4gICAgfVxuICB9LFxuXG5cbiAgLyoqXG4gICAqIEZpbmQgYSBtYXRjaGluZyBiaW5kZXIgZm9yIHRoZSBnaXZlbiB0eXBlLiBFbGVtZW50cyBzaG91bGQgb25seSBwcm92aWRlIG5hbWUuIEF0dHJpYnV0ZXMgc2hvdWxkIHByb3ZpZGUgdGhlIG5hbWVcbiAgICogYW5kIHZhbHVlICh2YWx1ZSBzbyB0aGUgZGVmYXVsdCBjYW4gYmUgcmV0dXJuZWQgaWYgYW4gZXhwcmVzc2lvbiBleGlzdHMgaW4gdGhlIHZhbHVlKS4gVGV4dCBub2RlcyBzaG91bGQgb25seVxuICAgKiBwcm92aWRlIHRoZSB2YWx1ZSAoaW4gcGxhY2Ugb2YgdGhlIG5hbWUpIGFuZCB3aWxsIHJldHVybiB0aGUgZGVmYXVsdCBpZiBubyBiaW5kZXJzIG1hdGNoLlxuICAgKi9cbiAgZmluZEJpbmRlcjogZnVuY3Rpb24odHlwZSwgbmFtZSwgdmFsdWUpIHtcbiAgICBpZiAodHlwZSA9PT0gJ3RleHQnICYmIHZhbHVlID09IG51bGwpIHtcbiAgICAgIHZhbHVlID0gbmFtZTtcbiAgICAgIG5hbWUgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBiaW5kZXIgPSB0aGlzLmdldEJpbmRlcih0eXBlLCBuYW1lKSwgYmluZGVycyA9IHRoaXMuYmluZGVyc1t0eXBlXTtcblxuICAgIGlmICghYmluZGVyKSB7XG4gICAgICB2YXIgdG9NYXRjaCA9ICh0eXBlID09PSAndGV4dCcpID8gdmFsdWUgOiBuYW1lO1xuICAgICAgYmluZGVycy5fd2lsZGNhcmRzLnNvbWUoZnVuY3Rpb24od2lsZGNhcmRCaW5kZXIpIHtcbiAgICAgICAgaWYgKHRvTWF0Y2gubWF0Y2god2lsZGNhcmRCaW5kZXIuZXhwcikpIHtcbiAgICAgICAgICBiaW5kZXIgPSB3aWxkY2FyZEJpbmRlcjtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKGJpbmRlciAmJiB0eXBlID09PSAnYXR0cmlidXRlJyAmJiBiaW5kZXIub25seVdoZW5Cb3VuZCAmJiAhdGhpcy5pc0JvdW5kKHR5cGUsIHZhbHVlKSkge1xuICAgICAgLy8gZG9uJ3QgdXNlIHRoZSBgdmFsdWVgIGJpbmRlciBpZiB0aGVyZSBpcyBubyBleHByZXNzaW9uIGluIHRoZSBhdHRyaWJ1dGUgdmFsdWUgKGUuZy4gYHZhbHVlPVwic29tZSB0ZXh0XCJgKVxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChuYW1lID09PSB0aGlzLmFuaW1hdGVBdHRyaWJ1dGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIWJpbmRlciAmJiB2YWx1ZSAmJiAodHlwZSA9PT0gJ3RleHQnIHx8IHRoaXMuaXNCb3VuZCh0eXBlLCB2YWx1ZSkpKSB7XG4gICAgICAvLyBUZXN0IGlmIHRoZSBhdHRyaWJ1dGUgdmFsdWUgaXMgYm91bmQgKGUuZy4gYGhyZWY9XCIvcG9zdHMve3sgcG9zdC5pZCB9fVwiYClcbiAgICAgIGJpbmRlciA9IHRoaXMuZ2V0QmluZGVyKHR5cGUsICdfX2RlZmF1bHRfXycpO1xuICAgIH1cblxuICAgIHJldHVybiBiaW5kZXI7XG4gIH0sXG5cblxuICAvKipcbiAgICogQSBGb3JtYXR0ZXIgaXMgc3RvcmVkIHRvIHByb2Nlc3MgdGhlIHZhbHVlIG9mIGFuIGV4cHJlc3Npb24uIFRoaXMgYWx0ZXJzIHRoZSB2YWx1ZSBvZiB3aGF0IGNvbWVzIGluIHdpdGggYSBmdW5jdGlvblxuICAgKiB0aGF0IHJldHVybnMgYSBuZXcgdmFsdWUuIEZvcm1hdHRlcnMgYXJlIGFkZGVkIGJ5IHVzaW5nIGEgc2luZ2xlIHBpcGUgY2hhcmFjdGVyIChgfGApIGZvbGxvd2VkIGJ5IHRoZSBuYW1lIG9mIHRoZVxuICAgKiBmb3JtYXR0ZXIuIE11bHRpcGxlIGZvcm1hdHRlcnMgY2FuIGJlIHVzZWQgYnkgY2hhaW5pbmcgcGlwZXMgd2l0aCBmb3JtYXR0ZXIgbmFtZXMuIEZvcm1hdHRlcnMgbWF5IGFsc28gaGF2ZVxuICAgKiBhcmd1bWVudHMgcGFzc2VkIHRvIHRoZW0gYnkgdXNpbmcgdGhlIGNvbG9uIHRvIHNlcGFyYXRlIGFyZ3VtZW50cyBmcm9tIHRoZSBmb3JtYXR0ZXIgbmFtZS4gVGhlIHNpZ25hdHVyZSBvZiBhXG4gICAqIGZvcm1hdHRlciBzaG91bGQgYmUgYGZ1bmN0aW9uKHZhbHVlLCBhcmdzLi4uKWAgd2hlcmUgYXJncyBhcmUgZXh0cmEgcGFyYW1ldGVycyBwYXNzZWQgaW50byB0aGUgZm9ybWF0dGVyIGFmdGVyXG4gICAqIGNvbG9ucy5cbiAgICpcbiAgICogKkV4YW1wbGU6KlxuICAgKiBgYGBqc1xuICAgKiByZWdpc3RyeS5yZWdpc3RlckZvcm1hdHRlcigndXBwZXJjYXNlJywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICogICBpZiAodHlwZW9mIHZhbHVlICE9ICdzdHJpbmcnKSByZXR1cm4gJydcbiAgICogICByZXR1cm4gdmFsdWUudG9VcHBlcmNhc2UoKVxuICAgKiB9KVxuICAgKlxuICAgKiByZWdpc3RyeS5yZWdpc3RlckZvcm1hdHRlcigncmVwbGFjZScsIGZ1bmN0aW9uKHZhbHVlLCByZXBsYWNlLCB3aXRoKSB7XG4gICAqICAgaWYgKHR5cGVvZiB2YWx1ZSAhPSAnc3RyaW5nJykgcmV0dXJuICcnXG4gICAqICAgcmV0dXJuIHZhbHVlLnJlcGxhY2UocmVwbGFjZSwgd2l0aClcbiAgICogfSlcbiAgICogYGBgaHRtbFxuICAgKiA8aDEgYmluZC10ZXh0PVwidGl0bGUgfCB1cHBlcmNhc2UgfCByZXBsYWNlOidMRVRURVInOidOVU1CRVInXCI+PC9oMT5cbiAgICogYGBgXG4gICAqICpSZXN1bHQ6KlxuICAgKiBgYGBodG1sXG4gICAqIDxoMT5HRVRUSU5HIFRPIEtOT1cgQUxMIEFCT1VUIFRIRSBOVU1CRVIgQTwvaDE+XG4gICAqIGBgYFxuICAgKiBUT0RPOiBvbGQgZG9jcywgcmV3cml0ZSwgdGhlcmUgaXMgYW4gZXh0cmEgYXJndW1lbnQgbmFtZWQgYHNldHRlcmAgd2hpY2ggd2lsbCBiZSB0cnVlIHdoZW4gdGhlIGV4cHJlc3Npb24gaXMgYmVpbmcgXCJzZXRcIiBpbnN0ZWFkIG9mIFwiZ2V0XCJcbiAgICogQSBgdmFsdWVGb3JtYXR0ZXJgIGlzIGxpa2UgYSBmb3JtYXR0ZXIgYnV0IHVzZWQgc3BlY2lmaWNhbGx5IHdpdGggdGhlIGB2YWx1ZWAgYmluZGluZyBzaW5jZSBpdCBpcyBhIHR3by13YXkgYmluZGluZy4gV2hlblxuICAgKiB0aGUgdmFsdWUgb2YgdGhlIGVsZW1lbnQgaXMgY2hhbmdlZCBhIGB2YWx1ZUZvcm1hdHRlcmAgY2FuIGFkanVzdCB0aGUgdmFsdWUgZnJvbSBhIHN0cmluZyB0byB0aGUgY29ycmVjdCB2YWx1ZSB0eXBlIGZvclxuICAgKiB0aGUgY29udHJvbGxlciBleHByZXNzaW9uLiBUaGUgc2lnbmF0dXJlIGZvciBhIGB2YWx1ZUZvcm1hdHRlcmAgaW5jbHVkZXMgdGhlIGN1cnJlbnQgdmFsdWUgb2YgdGhlIGV4cHJlc3Npb25cbiAgICogYmVmb3JlIHRoZSBvcHRpb25hbCBhcmd1bWVudHMgKGlmIGFueSkuIFRoaXMgYWxsb3dzIGRhdGVzIHRvIGJlIGFkanVzdGVkIGFuZCBwb3NzaWJsZXkgb3RoZXIgdXNlcy5cbiAgICpcbiAgICogKkV4YW1wbGU6KlxuICAgKiBgYGBqc1xuICAgKiByZWdpc3RyeS5yZWdpc3RlckZvcm1hdHRlcignbnVtZXJpYycsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAqICAgLy8gdmFsdWUgY29taW5nIGZyb20gdGhlIGNvbnRyb2xsZXIgZXhwcmVzc2lvbiwgdG8gYmUgc2V0IG9uIHRoZSBlbGVtZW50XG4gICAqICAgaWYgKHZhbHVlID09IG51bGwgfHwgaXNOYU4odmFsdWUpKSByZXR1cm4gJydcbiAgICogICByZXR1cm4gdmFsdWVcbiAgICogfSlcbiAgICpcbiAgICogcmVnaXN0cnkucmVnaXN0ZXJGb3JtYXR0ZXIoJ2RhdGUtaG91cicsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAqICAgLy8gdmFsdWUgY29taW5nIGZyb20gdGhlIGNvbnRyb2xsZXIgZXhwcmVzc2lvbiwgdG8gYmUgc2V0IG9uIHRoZSBlbGVtZW50XG4gICAqICAgaWYgKCAhKGN1cnJlbnRWYWx1ZSBpbnN0YW5jZW9mIERhdGUpICkgcmV0dXJuICcnXG4gICAqICAgdmFyIGhvdXJzID0gdmFsdWUuZ2V0SG91cnMoKVxuICAgKiAgIGlmIChob3VycyA+PSAxMikgaG91cnMgLT0gMTJcbiAgICogICBpZiAoaG91cnMgPT0gMCkgaG91cnMgPSAxMlxuICAgKiAgIHJldHVybiBob3Vyc1xuICAgKiB9KVxuICAgKiBgYGBodG1sXG4gICAqIDxsYWJlbD5OdW1iZXIgQXR0ZW5kaW5nOjwvbGFiZWw+XG4gICAqIDxpbnB1dCBzaXplPVwiNFwiIGJpbmQtdmFsdWU9XCJldmVudC5hdHRlbmRlZUNvdW50IHwgbnVtZXJpY1wiPlxuICAgKiA8bGFiZWw+VGltZTo8L2xhYmVsPlxuICAgKiA8aW5wdXQgc2l6ZT1cIjJcIiBiaW5kLXZhbHVlPVwiZXZlbnQuZGF0ZSB8IGRhdGUtaG91clwiPiA6XG4gICAqIDxpbnB1dCBzaXplPVwiMlwiIGJpbmQtdmFsdWU9XCJldmVudC5kYXRlIHwgZGF0ZS1taW51dGVcIj5cbiAgICogPHNlbGVjdCBiaW5kLXZhbHVlPVwiZXZlbnQuZGF0ZSB8IGRhdGUtYW1wbVwiPlxuICAgKiAgIDxvcHRpb24+QU08L29wdGlvbj5cbiAgICogICA8b3B0aW9uPlBNPC9vcHRpb24+XG4gICAqIDwvc2VsZWN0PlxuICAgKiBgYGBcbiAgICovXG4gIHJlZ2lzdGVyRm9ybWF0dGVyOiBmdW5jdGlvbiAobmFtZSwgZm9ybWF0dGVyKSB7XG4gICAgdGhpcy5mb3JtYXR0ZXJzW25hbWVdID0gZm9ybWF0dGVyO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIFVucmVnaXN0ZXJzIGEgZm9ybWF0dGVyLlxuICAgKi9cbiAgdW5yZWdpc3RlckZvcm1hdHRlcjogZnVuY3Rpb24gKG5hbWUsIGZvcm1hdHRlcikge1xuICAgIGRlbGV0ZSB0aGlzLmZvcm1hdHRlcnNbbmFtZV07XG4gIH0sXG5cblxuICAvKipcbiAgICogR2V0cyBhIHJlZ2lzdGVyZWQgZm9ybWF0dGVyLlxuICAgKi9cbiAgZ2V0Rm9ybWF0dGVyOiBmdW5jdGlvbiAobmFtZSkge1xuICAgIHJldHVybiB0aGlzLmZvcm1hdHRlcnNbbmFtZV07XG4gIH0sXG5cblxuICAvKipcbiAgICogQW4gQW5pbWF0aW9uIGlzIHN0b3JlZCB0byBoYW5kbGUgYW5pbWF0aW9ucy4gQSByZWdpc3RlcmVkIGFuaW1hdGlvbiBpcyBhbiBvYmplY3QgKG9yIGNsYXNzIHdoaWNoIGluc3RhbnRpYXRlcyBpbnRvXG4gICAqIGFuIG9iamVjdCkgd2l0aCB0aGUgbWV0aG9kczpcbiAgICogICAqIGB3aWxsQW5pbWF0ZUluKGVsZW1lbnQpYFxuICAgKiAgICogYGFuaW1hdGVJbihlbGVtZW50LCBjYWxsYmFjaylgXG4gICAqICAgKiBgZGlkQW5pbWF0ZUluKGVsZW1lbnQpYFxuICAgKiAgICogYHdpbGxBbmltYXRlT3V0KGVsZW1lbnQpYFxuICAgKiAgICogYGFuaW1hdGVPdXQoZWxlbWVudCwgY2FsbGJhY2spYFxuICAgKiAgICogYGRpZEFuaW1hdGVPdXQoZWxlbWVudClgXG4gICAqXG4gICAqIEFuaW1hdGlvbiBpcyBpbmNsdWRlZCB3aXRoIGJpbmRlcnMgd2hpY2ggYXJlIHJlZ2lzdGVyZWQgd2l0aCB0aGUgYGFuaW1hdGVkYCBwcm9wZXJ0eSBzZXQgdG8gYHRydWVgIChzdWNoIGFzIGBpZmBcbiAgICogYW5kIGByZXBlYXRgKS4gQW5pbWF0aW9ucyBhbGxvdyBlbGVtZW50cyB0byBmYWRlIGluLCBmYWRlIG91dCwgc2xpZGUgZG93biwgY29sbGFwc2UsIG1vdmUgZnJvbSBvbmUgbG9jYXRpb24gaW4gYVxuICAgKiBsaXN0IHRvIGFub3RoZXIsIGFuZCBtb3JlLlxuICAgKlxuICAgKiBUbyB1c2UgYW5pbWF0aW9uIGFkZCBhbiBhdHRyaWJ1dGUgbmFtZWQgYGFuaW1hdGVgIG9udG8gYW4gZWxlbWVudCB3aXRoIGEgc3VwcG9ydGVkIGJpbmRlci5cbiAgICpcbiAgICogIyMjIENTUyBBbmltYXRpb25zXG4gICAqXG4gICAqIElmIHRoZSBgYW5pbWF0ZWAgYXR0cmlidXRlIGRvZXMgbm90IGhhdmUgYSB2YWx1ZSBvciB0aGUgdmFsdWUgaXMgYSBjbGFzcyBuYW1lIChlLmcuIGBhbmltYXRlPVwiLm15LWZhZGVcImApIHRoZW5cbiAgICogZnJhZ21lbnRzIHdpbGwgdXNlIGEgQ1NTIHRyYW5zaXRpb24vYW5pbWF0aW9uLiBDbGFzc2VzIHdpbGwgYmUgYWRkZWQgYW5kIHJlbW92ZWQgdG8gdHJpZ2dlciB0aGUgYW5pbWF0aW9uLlxuICAgKlxuICAgKiAgICogYC53aWxsLWFuaW1hdGUtaW5gIGlzIGFkZGVkIHJpZ2h0IGFmdGVyIGFuIGVsZW1lbnQgaXMgaW5zZXJ0ZWQgaW50byB0aGUgRE9NLiBUaGlzIGNhbiBiZSB1c2VkIHRvIHNldCB0aGVcbiAgICogICAgIG9wYWNpdHkgdG8gYDAuMGAgZm9yIGV4YW1wbGUuIEl0IGlzIHRoZW4gcmVtb3ZlZCBvbiB0aGUgbmV4dCBhbmltYXRpb24gZnJhbWUuXG4gICAqICAgKiBgLmFuaW1hdGUtaW5gIGlzIHdoZW4gYC53aWxsLWFuaW1hdGUtaW5gIGlzIHJlbW92ZWQuIEl0IGNhbiBiZSB1c2VkIHRvIHNldCBvcGFjaXR5IHRvIGAxLjBgIGZvciBleGFtcGxlLiBUaGVcbiAgICogICAgIGBhbmltYXRpb25gIHN0eWxlIGNhbiBiZSBzZXQgb24gdGhpcyBjbGFzcyBpZiB1c2luZyBpdC4gVGhlIGB0cmFuc2l0aW9uYCBzdHlsZSBjYW4gYmUgc2V0IGhlcmUuIE5vdGUgdGhhdFxuICAgKiAgICAgYWx0aG91Z2ggdGhlIGBhbmltYXRlYCBhdHRyaWJ1dGUgaXMgcGxhY2VkIG9uIGFuIGVsZW1lbnQgd2l0aCB0aGUgYHJlcGVhdGAgYmluZGVyLCB0aGVzZSBjbGFzc2VzIGFyZSBhZGRlZCB0b1xuICAgKiAgICAgaXRzIGNoaWxkcmVuIGFzIHRoZXkgZ2V0IGFkZGVkIGFuZCByZW1vdmVkLlxuICAgKiAgICogYC53aWxsLWFuaW1hdGUtb3V0YCBpcyBhZGRlZCBiZWZvcmUgYW4gZWxlbWVudCBpcyByZW1vdmVkIGZyb20gdGhlIERPTS4gVGhpcyBjYW4gYmUgdXNlZCB0byBzZXQgdGhlIG9wYWNpdHkgdG9cbiAgICogICAgIGAxYCBmb3IgZXhhbXBsZS4gSXQgaXMgdGhlbiByZW1vdmVkIG9uIHRoZSBuZXh0IGFuaW1hdGlvbiBmcmFtZS5cbiAgICogICAqIGAuYW5pbWF0ZS1vdXRgIGlzIGFkZGVkIHdoZW4gYC53aWxsLWFuaW1hdGUtb3V0YCBpcyByZW1vdmVkLiBJdCBjYW4gYmUgdXNlZCB0byBzZXQgb3BhY2l0eSB0byBgMC4wYCBmb3JcbiAgICogICAgIGV4YW1wbGUuIFRoZSBgYW5pbWF0aW9uYCBzdHlsZSBjYW4gYmUgc2V0IG9uIHRoaXMgY2xhc3MgaWYgdXNpbmcgaXQuIFRoZSBgdHJhbnNpdGlvbmAgc3R5bGUgY2FuIGJlIHNldCBoZXJlIG9yXG4gICAqICAgICBvbiBhbm90aGVyIHNlbGVjdG9yIHRoYXQgbWF0Y2hlcyB0aGUgZWxlbWVudC4gTm90ZSB0aGF0IGFsdGhvdWdoIHRoZSBgYW5pbWF0ZWAgYXR0cmlidXRlIGlzIHBsYWNlZCBvbiBhblxuICAgKiAgICAgZWxlbWVudCB3aXRoIHRoZSBgcmVwZWF0YCBiaW5kZXIsIHRoZXNlIGNsYXNzZXMgYXJlIGFkZGVkIHRvIGl0cyBjaGlsZHJlbiBhcyB0aGV5IGdldCBhZGRlZCBhbmQgcmVtb3ZlZC5cbiAgICpcbiAgICogSWYgdGhlIGBhbmltYXRlYCBhdHRyaWJ1dGUgaXMgc2V0IHRvIGEgY2xhc3MgbmFtZSAoZS5nLiBgYW5pbWF0ZT1cIi5teS1mYWRlXCJgKSB0aGVuIHRoYXQgY2xhc3MgbmFtZSB3aWxsIGJlIGFkZGVkIGFzXG4gICAqIGEgY2xhc3MgdG8gdGhlIGVsZW1lbnQgZHVyaW5nIGFuaW1hdGlvbi4gVGhpcyBhbGxvd3MgeW91IHRvIHVzZSBgLm15LWZhZGUud2lsbC1hbmltYXRlLWluYCwgYC5teS1mYWRlLmFuaW1hdGUtaW5gLFxuICAgKiBldGMuIGluIHlvdXIgc3R5bGVzaGVldHMgdG8gdXNlIHRoZSBzYW1lIGFuaW1hdGlvbiB0aHJvdWdob3V0IHlvdXIgYXBwbGljYXRpb24uXG4gICAqXG4gICAqICMjIyBKYXZhU2NyaXB0IEFuaW1hdGlvbnNcbiAgICpcbiAgICogSWYgeW91IG5lZWQgZ3JlYXRlciBjb250cm9sIG92ZXIgeW91ciBhbmltYXRpb25zIEphdmFTY3JpcHQgbWF5IGJlIHVzZWQuIEl0IGlzIHJlY29tbWVuZGVkIHRoYXQgQ1NTIHN0eWxlcyBzdGlsbCBiZVxuICAgKiB1c2VkIGJ5IGhhdmluZyB5b3VyIGNvZGUgc2V0IHRoZW0gbWFudWFsbHkuIFRoaXMgYWxsb3dzIHRoZSBhbmltYXRpb24gdG8gdGFrZSBhZHZhbnRhZ2Ugb2YgdGhlIGJyb3dzZXJcbiAgICogb3B0aW1pemF0aW9ucyBzdWNoIGFzIGhhcmR3YXJlIGFjY2VsZXJhdGlvbi4gVGhpcyBpcyBub3QgYSByZXF1aXJlbWVudC5cbiAgICpcbiAgICogSW4gb3JkZXIgdG8gdXNlIEphdmFTY3JpcHQgYW4gb2JqZWN0IHNob3VsZCBiZSBwYXNzZWQgaW50byB0aGUgYGFuaW1hdGlvbmAgYXR0cmlidXRlIHVzaW5nIGFuIGV4cHJlc3Npb24uIFRoaXNcbiAgICogb2JqZWN0IHNob3VsZCBoYXZlIG1ldGhvZHMgdGhhdCBhbGxvdyBKYXZhU2NyaXB0IGFuaW1hdGlvbiBoYW5kbGluZy4gRm9yIGV4YW1wbGUsIGlmIHlvdSBhcmUgYm91bmQgdG8gYSBjb250ZXh0XG4gICAqIHdpdGggYW4gb2JqZWN0IG5hbWVkIGBjdXN0b21GYWRlYCB3aXRoIGFuaW1hdGlvbiBtZXRob2RzLCB5b3VyIGVsZW1lbnQgc2hvdWxkIGhhdmUgYGF0dHJpYnV0ZT1cInt7Y3VzdG9tRmFkZX19XCJgLlxuICAgKiBUaGUgZm9sbG93aW5nIGlzIGEgbGlzdCBvZiB0aGUgbWV0aG9kcyB5b3UgbWF5IGltcGxlbWVudC5cbiAgICpcbiAgICogICAqIGB3aWxsQW5pbWF0ZUluKGVsZW1lbnQpYCB3aWxsIGJlIGNhbGxlZCBhZnRlciBhbiBlbGVtZW50IGhhcyBiZWVuIGluc2VydGVkIGludG8gdGhlIERPTS4gVXNlIGl0IHRvIHNldCBpbml0aWFsXG4gICAqICAgICBDU1MgcHJvcGVydGllcyBiZWZvcmUgYGFuaW1hdGVJbmAgaXMgY2FsbGVkIHRvIHNldCB0aGUgZmluYWwgcHJvcGVydGllcy4gVGhpcyBtZXRob2QgaXMgb3B0aW9uYWwuXG4gICAqICAgKiBgYW5pbWF0ZUluKGVsZW1lbnQsIGNhbGxiYWNrKWAgd2lsbCBiZSBjYWxsZWQgc2hvcnRseSBhZnRlciBgd2lsbEFuaW1hdGVJbmAgaWYgaXQgd2FzIGRlZmluZWQuIFVzZSBpdCB0byBzZXRcbiAgICogICAgIGZpbmFsIENTUyBwcm9wZXJ0aWVzLlxuICAgKiAgICogYGFuaW1hdGVPdXQoZWxlbWVudCwgZG9uZSlgIHdpbGwgYmUgY2FsbGVkIGJlZm9yZSBhbiBlbGVtZW50IGlzIHRvIGJlIHJlbW92ZWQgZnJvbSB0aGUgRE9NLiBgZG9uZWAgbXVzdCBiZVxuICAgKiAgICAgY2FsbGVkIHdoZW4gdGhlIGFuaW1hdGlvbiBpcyBjb21wbGV0ZSBpbiBvcmRlciBmb3IgdGhlIGJpbmRlciB0byBmaW5pc2ggcmVtb3ZpbmcgdGhlIGVsZW1lbnQuICoqUmVtZW1iZXIqKiB0b1xuICAgKiAgICAgY2xlYW4gdXAgYnkgcmVtb3ZpbmcgYW55IHN0eWxlcyB0aGF0IHdlcmUgYWRkZWQgYmVmb3JlIGNhbGxpbmcgYGRvbmUoKWAgc28gdGhlIGVsZW1lbnQgY2FuIGJlIHJldXNlZCB3aXRob3V0XG4gICAqICAgICBzaWRlLWVmZmVjdHMuXG4gICAqXG4gICAqIFRoZSBgZWxlbWVudGAgcGFzc2VkIGluIHdpbGwgYmUgcG9seWZpbGxlZCBmb3Igd2l0aCB0aGUgYGFuaW1hdGVgIG1ldGhvZCB1c2luZ1xuICAgKiBodHRwczovL2dpdGh1Yi5jb20vd2ViLWFuaW1hdGlvbnMvd2ViLWFuaW1hdGlvbnMtanMuXG4gICAqXG4gICAqICMjIyBSZWdpc3RlcmVkIEFuaW1hdGlvbnNcbiAgICpcbiAgICogQW5pbWF0aW9ucyBtYXkgYmUgcmVnaXN0ZXJlZCBhbmQgdXNlZCB0aHJvdWdob3V0IHlvdXIgYXBwbGljYXRpb24uIFRvIHVzZSBhIHJlZ2lzdGVyZWQgYW5pbWF0aW9uIHVzZSBpdHMgbmFtZSBpblxuICAgKiB0aGUgYGFuaW1hdGVgIGF0dHJpYnV0ZSAoZS5nLiBgYW5pbWF0ZT1cImZhZGVcImApLiBOb3RlIHRoZSBvbmx5IGRpZmZlcmVuY2UgYmV0d2VlbiBhIHJlZ2lzdGVyZWQgYW5pbWF0aW9uIGFuZCBhXG4gICAqIGNsYXNzIHJlZ2lzdHJhdGlvbiBpcyBjbGFzcyByZWdpc3RyYXRpb25zIGFyZSBwcmVmaXhlZCB3aXRoIGEgZG90IChgLmApLiBSZWdpc3RlcmVkIGFuaW1hdGlvbnMgYXJlIGFsd2F5c1xuICAgKiBKYXZhU2NyaXB0IGFuaW1hdGlvbnMuIFRvIHJlZ2lzdGVyIGFuIGFuaW1hdGlvbiB1c2UgYGZyYWdtZW50cy5yZWdpc3RlckFuaW1hdGlvbihuYW1lLCBhbmltYXRpb25PYmplY3QpYC5cbiAgICpcbiAgICogVGhlIEFuaW1hdGlvbiBtb2R1bGUgY29tZXMgd2l0aCBzZXZlcmFsIGNvbW1vbiBhbmltYXRpb25zIHJlZ2lzdGVyZWQgYnkgZGVmYXVsdC4gVGhlIGRlZmF1bHRzIHVzZSBDU1Mgc3R5bGVzIHRvXG4gICAqIHdvcmsgY29ycmVjdGx5LCB1c2luZyBgZWxlbWVudC5hbmltYXRlYC5cbiAgICpcbiAgICogICAqIGBmYWRlYCB3aWxsIGZhZGUgYW4gZWxlbWVudCBpbiBhbmQgb3V0IG92ZXIgMzAwIG1pbGxpc2Vjb25kcy5cbiAgICogICAqIGBzbGlkZWAgd2lsbCBzbGlkZSBhbiBlbGVtZW50IGRvd24gd2hlbiBpdCBpcyBhZGRlZCBhbmQgc2xpZGUgaXQgdXAgd2hlbiBpdCBpcyByZW1vdmVkLlxuICAgKiAgICogYHNsaWRlLW1vdmVgIHdpbGwgbW92ZSBhbiBlbGVtZW50IGZyb20gaXRzIG9sZCBsb2NhdGlvbiB0byBpdHMgbmV3IGxvY2F0aW9uIGluIGEgcmVwZWF0ZWQgbGlzdC5cbiAgICpcbiAgICogRG8geW91IGhhdmUgYW5vdGhlciBjb21tb24gYW5pbWF0aW9uIHlvdSB0aGluayBzaG91bGQgYmUgaW5jbHVkZWQgYnkgZGVmYXVsdD8gU3VibWl0IGEgcHVsbCByZXF1ZXN0IVxuICAgKi9cbiAgcmVnaXN0ZXJBbmltYXRpb246IGZ1bmN0aW9uKG5hbWUsIGFuaW1hdGlvbk9iamVjdCkge1xuICAgIHRoaXMuYW5pbWF0aW9uc1tuYW1lXSA9IGFuaW1hdGlvbk9iamVjdDtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBVbnJlZ2lzdGVycyBhbiBhbmltYXRpb24uXG4gICAqL1xuICB1bnJlZ2lzdGVyQW5pbWF0aW9uOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgZGVsZXRlIHRoaXMuYW5pbWF0aW9uc1tuYW1lXTtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBHZXRzIGEgcmVnaXN0ZXJlZCBhbmltYXRpb24uXG4gICAqL1xuICBnZXRBbmltYXRpb246IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5hbmltYXRpb25zW25hbWVdO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIFByZXBhcmUgYW4gZWxlbWVudCB0byBiZSBlYXNpZXIgYW5pbWF0YWJsZSAoYWRkaW5nIGEgc2ltcGxlIGBhbmltYXRlYCBwb2x5ZmlsbCBpZiBuZWVkZWQpXG4gICAqL1xuICBtYWtlRWxlbWVudEFuaW1hdGFibGU6IGFuaW1hdGlvbi5tYWtlRWxlbWVudEFuaW1hdGFibGUsXG5cblxuICAvKipcbiAgICogU2V0cyB0aGUgZGVsaW1pdGVycyB0aGF0IGRlZmluZSBhbiBleHByZXNzaW9uLiBEZWZhdWx0IGlzIGB7e2AgYW5kIGB9fWAgYnV0IHRoaXMgbWF5IGJlIG92ZXJyaWRkZW4uIElmIGVtcHR5XG4gICAqIHN0cmluZ3MgYXJlIHBhc3NlZCBpbiAoZm9yIHR5cGUgXCJhdHRyaWJ1dGVcIiBvbmx5KSB0aGVuIG5vIGRlbGltaXRlcnMgYXJlIHJlcXVpcmVkIGZvciBtYXRjaGluZyBhdHRyaWJ1dGVzLCBidXQgdGhlXG4gICAqIGRlZmF1bHQgYXR0cmlidXRlIG1hdGNoZXIgd2lsbCBub3QgYXBwbHkgdG8gdGhlIHJlc3Qgb2YgdGhlIGF0dHJpYnV0ZXMuXG4gICAqL1xuICBzZXRFeHByZXNzaW9uRGVsaW1pdGVyczogZnVuY3Rpb24odHlwZSwgcHJlLCBwb3N0KSB7XG4gICAgaWYgKHR5cGUgIT09ICdhdHRyaWJ1dGUnICYmIHR5cGUgIT09ICd0ZXh0Jykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRXhwcmVzc2lvbiBkZWxpbWl0ZXJzIG11c3QgYmUgb2YgdHlwZSBcImF0dHJpYnV0ZVwiIG9yIFwidGV4dFwiJyk7XG4gICAgfVxuXG4gICAgdGhpcy5iaW5kZXJzW3R5cGVdLl9leHByID0gbmV3IFJlZ0V4cChlc2NhcGVSZWdFeHAocHJlKSArICcoLio/KScgKyBlc2NhcGVSZWdFeHAocG9zdCksICdnJyk7XG4gIH0sXG5cblxuICAvKipcbiAgICogVGVzdHMgd2hldGhlciBhIHZhbHVlIGhhcyBhbiBleHByZXNzaW9uIGluIGl0LiBTb21ldGhpbmcgbGlrZSBgL3VzZXIve3t1c2VyLmlkfX1gLlxuICAgKi9cbiAgaXNCb3VuZDogZnVuY3Rpb24odHlwZSwgdmFsdWUpIHtcbiAgICBpZiAodHlwZSAhPT0gJ2F0dHJpYnV0ZScgJiYgdHlwZSAhPT0gJ3RleHQnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdpc0JvdW5kIG11c3QgcHJvdmlkZSB0eXBlIFwiYXR0cmlidXRlXCIgb3IgXCJ0ZXh0XCInKTtcbiAgICB9XG4gICAgdmFyIGV4cHIgPSB0aGlzLmJpbmRlcnNbdHlwZV0uX2V4cHI7XG4gICAgcmV0dXJuIEJvb2xlYW4oZXhwciAmJiB2YWx1ZSAmJiB2YWx1ZS5tYXRjaChleHByKSk7XG4gIH0sXG5cblxuICAvKipcbiAgICogVGhlIHNvcnQgZnVuY3Rpb24gdG8gc29ydCBiaW5kZXJzIGNvcnJlY3RseVxuICAgKi9cbiAgYmluZGluZ1NvcnQ6IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICByZXR1cm4gYi5wcm90b3R5cGUucHJpb3JpdHkgLSBhLnByb3RvdHlwZS5wcmlvcml0eTtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBDb252ZXJ0cyBhbiBpbnZlcnRlZCBleHByZXNzaW9uIGZyb20gYC91c2VyL3t7dXNlci5pZH19YCB0byBgXCIvdXNlci9cIiArIHVzZXIuaWRgXG4gICAqL1xuICBjb2RpZnlFeHByZXNzaW9uOiBmdW5jdGlvbih0eXBlLCB0ZXh0KSB7XG4gICAgaWYgKHR5cGUgIT09ICdhdHRyaWJ1dGUnICYmIHR5cGUgIT09ICd0ZXh0Jykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignY29kaWZ5RXhwcmVzc2lvbiBtdXN0IHVzZSB0eXBlIFwiYXR0cmlidXRlXCIgb3IgXCJ0ZXh0XCInKTtcbiAgICB9XG5cbiAgICB2YXIgZXhwciA9IHRoaXMuYmluZGVyc1t0eXBlXS5fZXhwcjtcbiAgICB2YXIgbWF0Y2ggPSB0ZXh0Lm1hdGNoKGV4cHIpO1xuXG4gICAgaWYgKCFtYXRjaCkge1xuICAgICAgcmV0dXJuICdcIicgKyB0ZXh0LnJlcGxhY2UoL1wiL2csICdcXFxcXCInKSArICdcIic7XG4gICAgfSBlbHNlIGlmIChtYXRjaC5sZW5ndGggPT09IDEgJiYgbWF0Y2hbMF0gPT09IHRleHQpIHtcbiAgICAgIHJldHVybiB0ZXh0LnJlcGxhY2UoZXhwciwgJyQxJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBuZXdUZXh0ID0gJ1wiJywgbGFzdEluZGV4ID0gMDtcbiAgICAgIHdoaWxlIChtYXRjaCA9IGV4cHIuZXhlYyh0ZXh0KSkge1xuICAgICAgICB2YXIgc3RyID0gdGV4dC5zbGljZShsYXN0SW5kZXgsIGV4cHIubGFzdEluZGV4IC0gbWF0Y2hbMF0ubGVuZ3RoKTtcbiAgICAgICAgbmV3VGV4dCArPSBzdHIucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpO1xuICAgICAgICBuZXdUZXh0ICs9ICdcIiArICgnICsgbWF0Y2hbMV0gKyAnIHx8IFwiXCIpICsgXCInO1xuICAgICAgICBsYXN0SW5kZXggPSBleHByLmxhc3RJbmRleDtcbiAgICAgIH1cbiAgICAgIG5ld1RleHQgKz0gdGV4dC5zbGljZShsYXN0SW5kZXgpLnJlcGxhY2UoL1wiL2csICdcXFxcXCInKSArICdcIic7XG4gICAgICByZXR1cm4gbmV3VGV4dC5yZXBsYWNlKC9eXCJcIiBcXCsgfCBcIlwiIFxcKyB8IFxcKyBcIlwiJC9nLCAnJyk7XG4gICAgfVxuICB9XG5cbn07XG5cbi8vIFRha2VzIGEgc3RyaW5nIGxpa2UgXCIoXFwqKVwiIG9yIFwib24tXFwqXCIgYW5kIGNvbnZlcnRzIGl0IGludG8gYSByZWd1bGFyIGV4cHJlc3Npb24uXG5mdW5jdGlvbiBlc2NhcGVSZWdFeHAodGV4dCkge1xuICByZXR1cm4gdGV4dC5yZXBsYWNlKC9bLVtcXF17fSgpKis/LixcXFxcXiR8I1xcc10vZywgXCJcXFxcJCZcIik7XG59XG4iLCIvKlxuQ29weXJpZ2h0IChjKSAyMDE1IEphY29iIFdyaWdodCA8amFjd3JpZ2h0QGdtYWlsLmNvbT5cblxuUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxub2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xudG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG5mdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuXG5UaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG5cblRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbklNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG5BVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG5MSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuVEhFIFNPRlRXQVJFLlxuKi9cbi8vICMgRGlmZlxuLy8gPiBCYXNlZCBvbiB3b3JrIGZyb20gR29vZ2xlJ3Mgb2JzZXJ2ZS1qcyBwb2x5ZmlsbDogaHR0cHM6Ly9naXRodWIuY29tL1BvbHltZXIvb2JzZXJ2ZS1qc1xuXG4vLyBBIG5hbWVzcGFjZSB0byBzdG9yZSB0aGUgZnVuY3Rpb25zIG9uXG52YXIgZGlmZiA9IGV4cG9ydHM7XG5cbihmdW5jdGlvbigpIHtcblxuICBkaWZmLmNsb25lID0gY2xvbmU7XG4gIGRpZmYudmFsdWVzID0gZGlmZlZhbHVlcztcbiAgZGlmZi5iYXNpYyA9IGRpZmZCYXNpYztcbiAgZGlmZi5vYmplY3RzID0gZGlmZk9iamVjdHM7XG4gIGRpZmYuYXJyYXlzID0gZGlmZkFycmF5cztcblxuXG4gIC8vIEEgY2hhbmdlIHJlY29yZCBmb3IgdGhlIG9iamVjdCBjaGFuZ2VzXG4gIGZ1bmN0aW9uIENoYW5nZVJlY29yZChvYmplY3QsIHR5cGUsIG5hbWUsIG9sZFZhbHVlKSB7XG4gICAgdGhpcy5vYmplY3QgPSBvYmplY3Q7XG4gICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHRoaXMub2xkVmFsdWUgPSBvbGRWYWx1ZTtcbiAgfVxuXG4gIC8vIEEgc3BsaWNlIHJlY29yZCBmb3IgdGhlIGFycmF5IGNoYW5nZXNcbiAgZnVuY3Rpb24gU3BsaWNlKGluZGV4LCByZW1vdmVkLCBhZGRlZENvdW50KSB7XG4gICAgdGhpcy5pbmRleCA9IGluZGV4O1xuICAgIHRoaXMucmVtb3ZlZCA9IHJlbW92ZWQ7XG4gICAgdGhpcy5hZGRlZENvdW50ID0gYWRkZWRDb3VudDtcbiAgfVxuXG5cbiAgLy8gQ3JlYXRlcyBhIGNsb25lIG9yIGNvcHkgb2YgYW4gYXJyYXkgb3Igb2JqZWN0IChvciBzaW1wbHkgcmV0dXJucyBhIHN0cmluZy9udW1iZXIvYm9vbGVhbiB3aGljaCBhcmUgaW1tdXRhYmxlKVxuICAvLyBEb2VzIG5vdCBwcm92aWRlIGRlZXAgY29waWVzLlxuICBmdW5jdGlvbiBjbG9uZSh2YWx1ZSwgZGVlcCkge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgaWYgKGRlZXApIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLm1hcChmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBjbG9uZSh2YWx1ZSwgZGVlcCk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLnNsaWNlKCk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICBpZiAodmFsdWUudmFsdWVPZigpICE9PSB2YWx1ZSkge1xuICAgICAgICByZXR1cm4gbmV3IHZhbHVlLmNvbnN0cnVjdG9yKHZhbHVlLnZhbHVlT2YoKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgY29weSA9IHt9O1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmFsdWUpIHtcbiAgICAgICAgICB2YXIgb2JqVmFsdWUgPSB2YWx1ZVtrZXldO1xuICAgICAgICAgIGlmIChkZWVwKSB7XG4gICAgICAgICAgICBvYmpWYWx1ZSA9IGNsb25lKG9ialZhbHVlLCBkZWVwKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29weVtrZXldID0gb2JqVmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvcHk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gIH1cblxuXG4gIC8vIERpZmZzIHR3byB2YWx1ZXMsIHJldHVybmluZyBhIHRydXRoeSB2YWx1ZSBpZiB0aGVyZSBhcmUgY2hhbmdlcyBvciBgZmFsc2VgIGlmIHRoZXJlIGFyZSBubyBjaGFuZ2VzLiBJZiB0aGUgdHdvXG4gIC8vIHZhbHVlcyBhcmUgYm90aCBhcnJheXMgb3IgYm90aCBvYmplY3RzLCBhbiBhcnJheSBvZiBjaGFuZ2VzIChzcGxpY2VzIG9yIGNoYW5nZSByZWNvcmRzKSBiZXR3ZWVuIHRoZSB0d28gd2lsbCBiZVxuICAvLyByZXR1cm5lZC4gT3RoZXJ3aXNlICBgdHJ1ZWAgd2lsbCBiZSByZXR1cm5lZC5cbiAgZnVuY3Rpb24gZGlmZlZhbHVlcyh2YWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAvLyBTaG9ydGN1dCBvdXQgZm9yIHZhbHVlcyB0aGF0IGFyZSBleGFjdGx5IGVxdWFsXG4gICAgaWYgKHZhbHVlID09PSBvbGRWYWx1ZSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpICYmIEFycmF5LmlzQXJyYXkob2xkVmFsdWUpKSB7XG4gICAgICAvLyBJZiBhbiBhcnJheSBoYXMgY2hhbmdlZCBjYWxjdWxhdGUgdGhlIHNwbGljZXNcbiAgICAgIHZhciBzcGxpY2VzID0gZGlmZkFycmF5cyh2YWx1ZSwgb2xkVmFsdWUpO1xuICAgICAgcmV0dXJuIHNwbGljZXMubGVuZ3RoID8gc3BsaWNlcyA6IGZhbHNlO1xuICAgIH0gZWxzZSBpZiAodmFsdWUgJiYgb2xkVmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB0eXBlb2Ygb2xkVmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAvLyBJZiBhbiBvYmplY3QgaGFzIGNoYW5nZWQgY2FsY3VsYXRlIHRoZSBjaG5hZ2VzIGFuZCBjYWxsIHRoZSBjYWxsYmFja1xuICAgICAgLy8gQWxsb3cgZGF0ZXMgYW5kIE51bWJlci9TdHJpbmcgb2JqZWN0cyB0byBiZSBjb21wYXJlZFxuICAgICAgdmFyIHZhbHVlVmFsdWUgPSB2YWx1ZS52YWx1ZU9mKCk7XG4gICAgICB2YXIgb2xkVmFsdWVWYWx1ZSA9IG9sZFZhbHVlLnZhbHVlT2YoKTtcblxuICAgICAgLy8gQWxsb3cgZGF0ZXMgYW5kIE51bWJlci9TdHJpbmcgb2JqZWN0cyB0byBiZSBjb21wYXJlZFxuICAgICAgaWYgKHR5cGVvZiB2YWx1ZVZhbHVlICE9PSAnb2JqZWN0JyAmJiB0eXBlb2Ygb2xkVmFsdWVWYWx1ZSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlVmFsdWUgIT09IG9sZFZhbHVlVmFsdWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgY2hhbmdlUmVjb3JkcyA9IGRpZmZPYmplY3RzKHZhbHVlLCBvbGRWYWx1ZSk7XG4gICAgICAgIHJldHVybiBjaGFuZ2VSZWNvcmRzLmxlbmd0aCA/IGNoYW5nZVJlY29yZHMgOiBmYWxzZTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWYgYSB2YWx1ZSBoYXMgY2hhbmdlZCBjYWxsIHRoZSBjYWxsYmFja1xuICAgICAgcmV0dXJuIGRpZmZCYXNpYyh2YWx1ZSwgb2xkVmFsdWUpO1xuICAgIH1cbiAgfVxuXG5cbiAgLy8gRGlmZnMgdHdvIGJhc2ljIHR5cGVzLCByZXR1cm5pbmcgdHJ1ZSBpZiBjaGFuZ2VkIG9yIGZhbHNlIGlmIG5vdFxuICBmdW5jdGlvbiBkaWZmQmFzaWModmFsdWUsIG9sZFZhbHVlKSB7XG4gICBpZiAodmFsdWUgJiYgb2xkVmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB0eXBlb2Ygb2xkVmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAvLyBBbGxvdyBkYXRlcyBhbmQgTnVtYmVyL1N0cmluZyBvYmplY3RzIHRvIGJlIGNvbXBhcmVkXG4gICAgICB2YXIgdmFsdWVWYWx1ZSA9IHZhbHVlLnZhbHVlT2YoKTtcbiAgICAgIHZhciBvbGRWYWx1ZVZhbHVlID0gb2xkVmFsdWUudmFsdWVPZigpO1xuXG4gICAgICAvLyBBbGxvdyBkYXRlcyBhbmQgTnVtYmVyL1N0cmluZyBvYmplY3RzIHRvIGJlIGNvbXBhcmVkXG4gICAgICBpZiAodHlwZW9mIHZhbHVlVmFsdWUgIT09ICdvYmplY3QnICYmIHR5cGVvZiBvbGRWYWx1ZVZhbHVlICE9PSAnb2JqZWN0Jykge1xuICAgICAgICByZXR1cm4gZGlmZkJhc2ljKHZhbHVlVmFsdWUsIG9sZFZhbHVlVmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIElmIGEgdmFsdWUgaGFzIGNoYW5nZWQgY2FsbCB0aGUgY2FsbGJhY2tcbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyAmJiB0eXBlb2Ygb2xkVmFsdWUgPT09ICdudW1iZXInICYmIGlzTmFOKHZhbHVlKSAmJiBpc05hTihvbGRWYWx1ZSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHZhbHVlICE9PSBvbGRWYWx1ZTtcbiAgICB9XG4gIH1cblxuXG4gIC8vIERpZmZzIHR3byBvYmplY3RzIHJldHVybmluZyBhbiBhcnJheSBvZiBjaGFuZ2UgcmVjb3Jkcy4gVGhlIGNoYW5nZSByZWNvcmQgbG9va3MgbGlrZTpcbiAgLy8gYGBgamF2YXNjcmlwdFxuICAvLyB7XG4gIC8vICAgb2JqZWN0OiBvYmplY3QsXG4gIC8vICAgdHlwZTogJ2RlbGV0ZWR8dXBkYXRlZHxuZXcnLFxuICAvLyAgIG5hbWU6ICdwcm9wZXJ0eU5hbWUnLFxuICAvLyAgIG9sZFZhbHVlOiBvbGRWYWx1ZVxuICAvLyB9XG4gIC8vIGBgYFxuICBmdW5jdGlvbiBkaWZmT2JqZWN0cyhvYmplY3QsIG9sZE9iamVjdCkge1xuICAgIHZhciBjaGFuZ2VSZWNvcmRzID0gW107XG4gICAgdmFyIHByb3AsIG9sZFZhbHVlLCB2YWx1ZTtcblxuICAgIC8vIEdvZXMgdGhyb3VnaCB0aGUgb2xkIG9iamVjdCAoc2hvdWxkIGJlIGEgY2xvbmUpIGFuZCBsb29rIGZvciB0aGluZ3MgdGhhdCBhcmUgbm93IGdvbmUgb3IgY2hhbmdlZFxuICAgIGZvciAocHJvcCBpbiBvbGRPYmplY3QpIHtcbiAgICAgIG9sZFZhbHVlID0gb2xkT2JqZWN0W3Byb3BdO1xuICAgICAgdmFsdWUgPSBvYmplY3RbcHJvcF07XG5cbiAgICAgIC8vIEFsbG93IGZvciB0aGUgY2FzZSBvZiBvYmoucHJvcCA9IHVuZGVmaW5lZCAod2hpY2ggaXMgYSBuZXcgcHJvcGVydHksIGV2ZW4gaWYgaXQgaXMgdW5kZWZpbmVkKVxuICAgICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQgJiYgIWRpZmZCYXNpYyh2YWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiB0aGUgcHJvcGVydHkgaXMgZ29uZSBpdCB3YXMgcmVtb3ZlZFxuICAgICAgaWYgKCEgKHByb3AgaW4gb2JqZWN0KSkge1xuICAgICAgICBjaGFuZ2VSZWNvcmRzLnB1c2gobmV3IENoYW5nZVJlY29yZChvYmplY3QsICdkZWxldGVkJywgcHJvcCwgb2xkVmFsdWUpKTtcbiAgICAgIH0gZWxzZSBpZiAoZGlmZkJhc2ljKHZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgY2hhbmdlUmVjb3Jkcy5wdXNoKG5ldyBDaGFuZ2VSZWNvcmQob2JqZWN0LCAndXBkYXRlZCcsIHByb3AsIG9sZFZhbHVlKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gR29lcyB0aHJvdWdoIHRoZSBvbGQgb2JqZWN0IGFuZCBsb29rcyBmb3IgdGhpbmdzIHRoYXQgYXJlIG5ld1xuICAgIGZvciAocHJvcCBpbiBvYmplY3QpIHtcbiAgICAgIHZhbHVlID0gb2JqZWN0W3Byb3BdO1xuICAgICAgaWYgKCEgKHByb3AgaW4gb2xkT2JqZWN0KSkge1xuICAgICAgICBjaGFuZ2VSZWNvcmRzLnB1c2gobmV3IENoYW5nZVJlY29yZChvYmplY3QsICduZXcnLCBwcm9wKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkob2JqZWN0KSAmJiBvYmplY3QubGVuZ3RoICE9PSBvbGRPYmplY3QubGVuZ3RoKSB7XG4gICAgICBjaGFuZ2VSZWNvcmRzLnB1c2gobmV3IENoYW5nZVJlY29yZChvYmplY3QsICd1cGRhdGVkJywgJ2xlbmd0aCcsIG9sZE9iamVjdC5sZW5ndGgpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY2hhbmdlUmVjb3JkcztcbiAgfVxuXG5cblxuXG5cbiAgRURJVF9MRUFWRSA9IDBcbiAgRURJVF9VUERBVEUgPSAxXG4gIEVESVRfQUREID0gMlxuICBFRElUX0RFTEVURSA9IDNcblxuXG4gIC8vIERpZmZzIHR3byBhcnJheXMgcmV0dXJuaW5nIGFuIGFycmF5IG9mIHNwbGljZXMuIEEgc3BsaWNlIG9iamVjdCBsb29rcyBsaWtlOlxuICAvLyBgYGBqYXZhc2NyaXB0XG4gIC8vIHtcbiAgLy8gICBpbmRleDogMyxcbiAgLy8gICByZW1vdmVkOiBbaXRlbSwgaXRlbV0sXG4gIC8vICAgYWRkZWRDb3VudDogMFxuICAvLyB9XG4gIC8vIGBgYFxuICBmdW5jdGlvbiBkaWZmQXJyYXlzKHZhbHVlLCBvbGRWYWx1ZSkge1xuICAgIHZhciBjdXJyZW50U3RhcnQgPSAwO1xuICAgIHZhciBjdXJyZW50RW5kID0gdmFsdWUubGVuZ3RoO1xuICAgIHZhciBvbGRTdGFydCA9IDA7XG4gICAgdmFyIG9sZEVuZCA9IG9sZFZhbHVlLmxlbmd0aDtcblxuICAgIHZhciBtaW5MZW5ndGggPSBNYXRoLm1pbihjdXJyZW50RW5kLCBvbGRFbmQpO1xuICAgIHZhciBwcmVmaXhDb3VudCA9IHNoYXJlZFByZWZpeCh2YWx1ZSwgb2xkVmFsdWUsIG1pbkxlbmd0aCk7XG4gICAgdmFyIHN1ZmZpeENvdW50ID0gc2hhcmVkU3VmZml4KHZhbHVlLCBvbGRWYWx1ZSwgbWluTGVuZ3RoIC0gcHJlZml4Q291bnQpO1xuXG4gICAgY3VycmVudFN0YXJ0ICs9IHByZWZpeENvdW50O1xuICAgIG9sZFN0YXJ0ICs9IHByZWZpeENvdW50O1xuICAgIGN1cnJlbnRFbmQgLT0gc3VmZml4Q291bnQ7XG4gICAgb2xkRW5kIC09IHN1ZmZpeENvdW50O1xuXG4gICAgaWYgKGN1cnJlbnRFbmQgLSBjdXJyZW50U3RhcnQgPT09IDAgJiYgb2xkRW5kIC0gb2xkU3RhcnQgPT09IDApIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICAvLyBpZiBub3RoaW5nIHdhcyBhZGRlZCwgb25seSByZW1vdmVkIGZyb20gb25lIHNwb3RcbiAgICBpZiAoY3VycmVudFN0YXJ0ID09PSBjdXJyZW50RW5kKSB7XG4gICAgICByZXR1cm4gWyBuZXcgU3BsaWNlKGN1cnJlbnRTdGFydCwgb2xkVmFsdWUuc2xpY2Uob2xkU3RhcnQsIG9sZEVuZCksIDApIF07XG4gICAgfVxuXG4gICAgLy8gaWYgbm90aGluZyB3YXMgcmVtb3ZlZCwgb25seSBhZGRlZCB0byBvbmUgc3BvdFxuICAgIGlmIChvbGRTdGFydCA9PT0gb2xkRW5kKSB7XG4gICAgICByZXR1cm4gWyBuZXcgU3BsaWNlKGN1cnJlbnRTdGFydCwgW10sIGN1cnJlbnRFbmQgLSBjdXJyZW50U3RhcnQpIF07XG4gICAgfVxuXG4gICAgLy8gYSBtaXh0dXJlIG9mIGFkZHMgYW5kIHJlbW92ZXNcbiAgICB2YXIgZGlzdGFuY2VzID0gY2FsY0VkaXREaXN0YW5jZXModmFsdWUsIGN1cnJlbnRTdGFydCwgY3VycmVudEVuZCwgb2xkVmFsdWUsIG9sZFN0YXJ0LCBvbGRFbmQpO1xuICAgIHZhciBvcHMgPSBzcGxpY2VPcGVyYXRpb25zRnJvbUVkaXREaXN0YW5jZXMoZGlzdGFuY2VzKTtcblxuICAgIHZhciBzcGxpY2UgPSBudWxsO1xuICAgIHZhciBzcGxpY2VzID0gW107XG4gICAgdmFyIGluZGV4ID0gY3VycmVudFN0YXJ0O1xuICAgIHZhciBvbGRJbmRleCA9IG9sZFN0YXJ0O1xuXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBvcHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICB2YXIgb3AgPSBvcHNbaV07XG4gICAgICBpZiAob3AgPT09IEVESVRfTEVBVkUpIHtcbiAgICAgICAgaWYgKHNwbGljZSkge1xuICAgICAgICAgIHNwbGljZXMucHVzaChzcGxpY2UpO1xuICAgICAgICAgIHNwbGljZSA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBpbmRleCsrO1xuICAgICAgICBvbGRJbmRleCsrO1xuICAgICAgfSBlbHNlIGlmIChvcCA9PT0gRURJVF9VUERBVEUpIHtcbiAgICAgICAgaWYgKCFzcGxpY2UpIHtcbiAgICAgICAgICBzcGxpY2UgPSBuZXcgU3BsaWNlKGluZGV4LCBbXSwgMCk7XG4gICAgICAgIH1cblxuICAgICAgICBzcGxpY2UuYWRkZWRDb3VudCsrO1xuICAgICAgICBpbmRleCsrO1xuXG4gICAgICAgIHNwbGljZS5yZW1vdmVkLnB1c2gob2xkVmFsdWVbb2xkSW5kZXhdKTtcbiAgICAgICAgb2xkSW5kZXgrKztcbiAgICAgIH0gZWxzZSBpZiAob3AgPT09IEVESVRfQUREKSB7XG4gICAgICAgIGlmICghc3BsaWNlKSB7XG4gICAgICAgICAgc3BsaWNlID0gbmV3IFNwbGljZShpbmRleCwgW10sIDApO1xuICAgICAgICB9XG5cbiAgICAgICAgc3BsaWNlLmFkZGVkQ291bnQrKztcbiAgICAgICAgaW5kZXgrKztcbiAgICAgIH0gZWxzZSBpZiAob3AgPT09IEVESVRfREVMRVRFKSB7XG4gICAgICAgIGlmICghc3BsaWNlKSB7XG4gICAgICAgICAgc3BsaWNlID0gbmV3IFNwbGljZShpbmRleCwgW10sIDApO1xuICAgICAgICB9XG5cbiAgICAgICAgc3BsaWNlLnJlbW92ZWQucHVzaChvbGRWYWx1ZVtvbGRJbmRleF0pO1xuICAgICAgICBvbGRJbmRleCsrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzcGxpY2UpIHtcbiAgICAgIHNwbGljZXMucHVzaChzcGxpY2UpO1xuICAgIH1cblxuICAgIHJldHVybiBzcGxpY2VzO1xuICB9XG5cblxuXG5cbiAgLy8gZmluZCB0aGUgbnVtYmVyIG9mIGl0ZW1zIGF0IHRoZSBiZWdpbm5pbmcgdGhhdCBhcmUgdGhlIHNhbWVcbiAgZnVuY3Rpb24gc2hhcmVkUHJlZml4KGN1cnJlbnQsIG9sZCwgc2VhcmNoTGVuZ3RoKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZWFyY2hMZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGRpZmZCYXNpYyhjdXJyZW50W2ldLCBvbGRbaV0pKSB7XG4gICAgICAgIHJldHVybiBpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc2VhcmNoTGVuZ3RoO1xuICB9XG5cblxuICAvLyBmaW5kIHRoZSBudW1iZXIgb2YgaXRlbXMgYXQgdGhlIGVuZCB0aGF0IGFyZSB0aGUgc2FtZVxuICBmdW5jdGlvbiBzaGFyZWRTdWZmaXgoY3VycmVudCwgb2xkLCBzZWFyY2hMZW5ndGgpIHtcbiAgICB2YXIgaW5kZXgxID0gY3VycmVudC5sZW5ndGg7XG4gICAgdmFyIGluZGV4MiA9IG9sZC5sZW5ndGg7XG4gICAgdmFyIGNvdW50ID0gMDtcbiAgICB3aGlsZSAoY291bnQgPCBzZWFyY2hMZW5ndGggJiYgIWRpZmZCYXNpYyhjdXJyZW50Wy0taW5kZXgxXSwgb2xkWy0taW5kZXgyXSkpIHtcbiAgICAgIGNvdW50Kys7XG4gICAgfVxuICAgIHJldHVybiBjb3VudDtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gc3BsaWNlT3BlcmF0aW9uc0Zyb21FZGl0RGlzdGFuY2VzKGRpc3RhbmNlcykge1xuICAgIHZhciBpID0gZGlzdGFuY2VzLmxlbmd0aCAtIDE7XG4gICAgdmFyIGogPSBkaXN0YW5jZXNbMF0ubGVuZ3RoIC0gMTtcbiAgICB2YXIgY3VycmVudCA9IGRpc3RhbmNlc1tpXVtqXTtcbiAgICB2YXIgZWRpdHMgPSBbXTtcbiAgICB3aGlsZSAoaSA+IDAgfHwgaiA+IDApIHtcbiAgICAgIGlmIChpID09PSAwKSB7XG4gICAgICAgIGVkaXRzLnB1c2goRURJVF9BREQpO1xuICAgICAgICBqLS07XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoaiA9PT0gMCkge1xuICAgICAgICBlZGl0cy5wdXNoKEVESVRfREVMRVRFKTtcbiAgICAgICAgaS0tO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgdmFyIG5vcnRoV2VzdCA9IGRpc3RhbmNlc1tpIC0gMV1baiAtIDFdO1xuICAgICAgdmFyIHdlc3QgPSBkaXN0YW5jZXNbaSAtIDFdW2pdO1xuICAgICAgdmFyIG5vcnRoID0gZGlzdGFuY2VzW2ldW2ogLSAxXTtcblxuICAgICAgaWYgKHdlc3QgPCBub3J0aCkge1xuICAgICAgICBtaW4gPSB3ZXN0IDwgbm9ydGhXZXN0ID8gd2VzdCA6IG5vcnRoV2VzdDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1pbiA9IG5vcnRoIDwgbm9ydGhXZXN0ID8gbm9ydGggOiBub3J0aFdlc3Q7XG4gICAgICB9XG5cbiAgICAgIGlmIChtaW4gPT09IG5vcnRoV2VzdCkge1xuICAgICAgICBpZiAobm9ydGhXZXN0ID09PSBjdXJyZW50KSB7XG4gICAgICAgICAgZWRpdHMucHVzaChFRElUX0xFQVZFKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBlZGl0cy5wdXNoKEVESVRfVVBEQVRFKTtcbiAgICAgICAgICBjdXJyZW50ID0gbm9ydGhXZXN0O1xuICAgICAgICB9XG4gICAgICAgIGktLTtcbiAgICAgICAgai0tO1xuICAgICAgfSBlbHNlIGlmIChtaW4gPT09IHdlc3QpIHtcbiAgICAgICAgZWRpdHMucHVzaChFRElUX0RFTEVURSk7XG4gICAgICAgIGktLTtcbiAgICAgICAgY3VycmVudCA9IHdlc3Q7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlZGl0cy5wdXNoKEVESVRfQUREKTtcbiAgICAgICAgai0tO1xuICAgICAgICBjdXJyZW50ID0gbm9ydGg7XG4gICAgICB9XG4gICAgfVxuICAgIGVkaXRzLnJldmVyc2UoKTtcbiAgICByZXR1cm4gZWRpdHM7XG4gIH1cblxuXG4gIGZ1bmN0aW9uIGNhbGNFZGl0RGlzdGFuY2VzKGN1cnJlbnQsIGN1cnJlbnRTdGFydCwgY3VycmVudEVuZCwgb2xkLCBvbGRTdGFydCwgb2xkRW5kKSB7XG4gICAgLy8gXCJEZWxldGlvblwiIGNvbHVtbnNcbiAgICB2YXIgcm93Q291bnQgPSBvbGRFbmQgLSBvbGRTdGFydCArIDE7XG4gICAgdmFyIGNvbHVtbkNvdW50ID0gY3VycmVudEVuZCAtIGN1cnJlbnRTdGFydCArIDE7XG4gICAgdmFyIGRpc3RhbmNlcyA9IG5ldyBBcnJheShyb3dDb3VudCk7XG4gICAgdmFyIGksIGo7XG5cbiAgICAvLyBcIkFkZGl0aW9uXCIgcm93cy4gSW5pdGlhbGl6ZSBudWxsIGNvbHVtbi5cbiAgICBmb3IgKGkgPSAwOyBpIDwgcm93Q291bnQ7IGkrKykge1xuICAgICAgZGlzdGFuY2VzW2ldID0gbmV3IEFycmF5KGNvbHVtbkNvdW50KTtcbiAgICAgIGRpc3RhbmNlc1tpXVswXSA9IGk7XG4gICAgfVxuXG4gICAgLy8gSW5pdGlhbGl6ZSBudWxsIHJvd1xuICAgIGZvciAoaiA9IDA7IGogPCBjb2x1bW5Db3VudDsgaisrKSB7XG4gICAgICBkaXN0YW5jZXNbMF1bal0gPSBqO1xuICAgIH1cblxuICAgIGZvciAoaSA9IDE7IGkgPCByb3dDb3VudDsgaSsrKSB7XG4gICAgICBmb3IgKGogPSAxOyBqIDwgY29sdW1uQ291bnQ7IGorKykge1xuICAgICAgICBpZiAoIWRpZmZCYXNpYyhjdXJyZW50W2N1cnJlbnRTdGFydCArIGogLSAxXSwgb2xkW29sZFN0YXJ0ICsgaSAtIDFdKSkge1xuICAgICAgICAgIGRpc3RhbmNlc1tpXVtqXSA9IGRpc3RhbmNlc1tpIC0gMV1baiAtIDFdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciBub3J0aCA9IGRpc3RhbmNlc1tpIC0gMV1bal0gKyAxO1xuICAgICAgICAgIHZhciB3ZXN0ID0gZGlzdGFuY2VzW2ldW2ogLSAxXSArIDE7XG4gICAgICAgICAgZGlzdGFuY2VzW2ldW2pdID0gbm9ydGggPCB3ZXN0ID8gbm9ydGggOiB3ZXN0O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRpc3RhbmNlcztcbiAgfVxufSkoKTtcbiIsIi8vICMgQ2hpcCBFeHByZXNzaW9uXG5cbi8vIFBhcnNlcyBhIHN0cmluZyBvZiBKYXZhU2NyaXB0IGludG8gYSBmdW5jdGlvbiB3aGljaCBjYW4gYmUgYm91bmQgdG8gYSBzY29wZS5cbi8vXG4vLyBBbGxvd3MgdW5kZWZpbmVkIG9yIG51bGwgdmFsdWVzIHRvIHJldHVybiB1bmRlZmluZWQgcmF0aGVyIHRoYW4gdGhyb3dpbmdcbi8vIGVycm9ycywgYWxsb3dzIGZvciBmb3JtYXR0ZXJzIG9uIGRhdGEsIGFuZCBwcm92aWRlcyBkZXRhaWxlZCBlcnJvciByZXBvcnRpbmcuXG5cbi8vIFRoZSBleHByZXNzaW9uIG9iamVjdCB3aXRoIGl0cyBleHByZXNzaW9uIGNhY2hlLlxudmFyIGV4cHJlc3Npb24gPSBleHBvcnRzO1xuZXhwcmVzc2lvbi5jYWNoZSA9IHt9O1xuZXhwcmVzc2lvbi5nbG9iYWxzID0gWyd0cnVlJywgJ2ZhbHNlJywgJ251bGwnLCAndW5kZWZpbmVkJywgJ3dpbmRvdycsICd0aGlzJ107XG5leHByZXNzaW9uLmdldCA9IGdldEV4cHJlc3Npb247XG5leHByZXNzaW9uLmdldFNldHRlciA9IGdldFNldHRlcjtcbmV4cHJlc3Npb24uYmluZCA9IGJpbmRFeHByZXNzaW9uO1xuXG5cbi8vIENyZWF0ZXMgYSBmdW5jdGlvbiBmcm9tIHRoZSBnaXZlbiBleHByZXNzaW9uLiBBbiBgb3B0aW9uc2Agb2JqZWN0IG1heSBiZVxuLy8gcHJvdmlkZWQgd2l0aCB0aGUgZm9sbG93aW5nIG9wdGlvbnM6XG4vLyAqIGBhcmdzYCBpcyBhbiBhcnJheSBvZiBzdHJpbmdzIHdoaWNoIHdpbGwgYmUgdGhlIGZ1bmN0aW9uJ3MgYXJndW1lbnQgbmFtZXNcbi8vICogYGdsb2JhbHNgIGlzIGFuIGFycmF5IG9mIHN0cmluZ3Mgd2hpY2ggZGVmaW5lIGdsb2JhbHMgYXZhaWxhYmxlIHRvIHRoZVxuLy8gZnVuY3Rpb24gKHRoZXNlIHdpbGwgbm90IGJlIHByZWZpeGVkIHdpdGggYHRoaXMuYCkuIGAndHJ1ZSdgLCBgJ2ZhbHNlJ2AsXG4vLyBgJ251bGwnYCwgYW5kIGAnd2luZG93J2AgYXJlIGluY2x1ZGVkIGJ5IGRlZmF1bHQuXG4vL1xuLy8gVGhpcyBmdW5jdGlvbiB3aWxsIGJlIGNhY2hlZCBzbyBzdWJzZXF1ZW50IGNhbGxzIHdpdGggdGhlIHNhbWUgZXhwcmVzc2lvbiB3aWxsXG4vLyByZXR1cm4gdGhlIHNhbWUgZnVuY3Rpb24uIEUuZy4gdGhlIGV4cHJlc3Npb24gXCJuYW1lXCIgd2lsbCBhbHdheXMgcmV0dXJuIGFcbi8vIHNpbmdsZSBmdW5jdGlvbiB3aXRoIHRoZSBib2R5IGByZXR1cm4gdGhpcy5uYW1lYC5cbmZ1bmN0aW9uIGdldEV4cHJlc3Npb24oZXhwciwgb3B0aW9ucykge1xuICBpZiAoIW9wdGlvbnMpIG9wdGlvbnMgPSB7fTtcbiAgaWYgKCFvcHRpb25zLmFyZ3MpIG9wdGlvbnMuYXJncyA9IFtdO1xuICB2YXIgY2FjaGVLZXkgPSBleHByICsgJ3wnICsgb3B0aW9ucy5hcmdzLmpvaW4oJywnKTtcbiAgLy8gUmV0dXJucyB0aGUgY2FjaGVkIGZ1bmN0aW9uIGZvciB0aGlzIGV4cHJlc3Npb24gaWYgaXQgZXhpc3RzLlxuICB2YXIgZnVuYyA9IGV4cHJlc3Npb24uY2FjaGVbY2FjaGVLZXldO1xuICBpZiAoZnVuYykge1xuICAgIHJldHVybiBmdW5jO1xuICB9XG5cbiAgb3B0aW9ucy5hcmdzLnVuc2hpZnQoJ19mb3JtYXR0ZXJzXycpO1xuXG4gIC8vIFByZWZpeCBhbGwgcHJvcGVydHkgbG9va3VwcyB3aXRoIHRoZSBgdGhpc2Aga2V5d29yZC4gSWdub3JlcyBrZXl3b3Jkc1xuICAvLyAod2luZG93LCB0cnVlLCBmYWxzZSkgYW5kIGV4dHJhIGFyZ3NcbiAgdmFyIGJvZHkgPSBwYXJzZUV4cHJlc3Npb24oZXhwciwgb3B0aW9ucyk7XG5cbiAgdHJ5IHtcbiAgICBmdW5jID0gZXhwcmVzc2lvbi5jYWNoZVtjYWNoZUtleV0gPSBGdW5jdGlvbi5hcHBseShudWxsLCBvcHRpb25zLmFyZ3MuY29uY2F0KGJvZHkpKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGlmIChvcHRpb25zLmlnbm9yZUVycm9ycykgcmV0dXJuO1xuICAgIC8vIFRocm93cyBhbiBlcnJvciBpZiB0aGUgZXhwcmVzc2lvbiB3YXMgbm90IHZhbGlkIEphdmFTY3JpcHRcbiAgICBjb25zb2xlLmVycm9yKCdCYWQgZXhwcmVzc2lvbjpcXG5gJyArIGV4cHIgKyAnYFxcbicgKyAnQ29tcGlsZWQgZXhwcmVzc2lvbjpcXG4nICsgYm9keSk7XG4gICAgdGhyb3cgbmV3IEVycm9yKGUubWVzc2FnZSk7XG4gIH1cbiAgcmV0dXJuIGZ1bmM7XG59XG5cblxuLy8gQ3JlYXRlcyBhIHNldHRlciBmdW5jdGlvbiBmcm9tIHRoZSBnaXZlbiBleHByZXNzaW9uLlxuZnVuY3Rpb24gZ2V0U2V0dGVyKGV4cHIsIG9wdGlvbnMpIHtcbiAgaWYgKCFvcHRpb25zKSBvcHRpb25zID0ge307XG4gIG9wdGlvbnMuYXJncyA9IFsndmFsdWUnXTtcbiAgZXhwciA9IGV4cHIucmVwbGFjZSgvKFxccypcXHx8JCkvLCAnID0gdmFsdWUkMScpO1xuICByZXR1cm4gZ2V0RXhwcmVzc2lvbihleHByLCBvcHRpb25zKTtcbn1cblxuXG5cbi8vIENvbXBpbGVzIGFuIGV4cHJlc3Npb24gYW5kIGJpbmRzIGl0IGluIHRoZSBnaXZlbiBzY29wZS4gVGhpcyBhbGxvd3MgaXQgdG8gYmVcbi8vIGNhbGxlZCBmcm9tIGFueXdoZXJlIChlLmcuIGV2ZW50IGxpc3RlbmVycykgd2hpbGUgcmV0YWluaW5nIHRoZSBzY29wZS5cbmZ1bmN0aW9uIGJpbmRFeHByZXNzaW9uKGV4cHIsIHNjb3BlLCBvcHRpb25zKSB7XG4gIHJldHVybiBnZXRFeHByZXNzaW9uKGV4cHIsIG9wdGlvbnMpLmJpbmQoc2NvcGUpO1xufVxuXG4vLyBmaW5kcyBhbGwgcXVvdGVkIHN0cmluZ3NcbnZhciBxdW90ZUV4cHIgPSAvKFsnXCJcXC9dKShcXFxcXFwxfFteXFwxXSkqP1xcMS9nO1xuXG4vLyBmaW5kcyBhbGwgZW1wdHkgcXVvdGVkIHN0cmluZ3NcbnZhciBlbXB0eVF1b3RlRXhwciA9IC8oWydcIlxcL10pXFwxL2c7XG5cbi8vIGZpbmRzIHBpcGVzIHRoYXQgYXJlbid0IE9ScyAoYCB8IGAgbm90IGAgfHwgYCkgZm9yIGZvcm1hdHRlcnNcbnZhciBwaXBlRXhwciA9IC9cXHwoXFx8KT8vZztcblxuLy8gZmluZHMgdGhlIHBhcnRzIG9mIGEgZm9ybWF0dGVyIChuYW1lIGFuZCBhcmdzKVxudmFyIGZvcm1hdHRlckV4cHIgPSAvXihbXlxcKF0rKSg/OlxcKCguKilcXCkpPyQvO1xuXG4vLyBmaW5kcyBhcmd1bWVudCBzZXBhcmF0b3JzIGZvciBmb3JtYXR0ZXJzIChgYXJnMTphcmcyYClcbnZhciBhcmdTZXBhcmF0b3IgPSAvXFxzKixcXHMqL2c7XG5cbi8vIG1hdGNoZXMgcHJvcGVydHkgY2hhaW5zIChlLmcuIGBuYW1lYCwgYHVzZXIubmFtZWAsIGFuZCBgdXNlci5mdWxsTmFtZSgpLmNhcGl0YWxpemUoKWApXG52YXIgcHJvcEV4cHIgPSAvKChcXHt8LHxcXC4pP1xccyopKFthLXokX1xcJF0oPzpbYS16X1xcJDAtOVxcLi1dfFxcW1snXCJcXGRdK1xcXSkqKShcXHMqKDp8XFwofFxcWyk/KS9naTtcblxuLy8gbGlua3MgaW4gYSBwcm9wZXJ0eSBjaGFpblxudmFyIGNoYWluTGlua3MgPSAvXFwufFxcWy9nO1xuXG4vLyB0aGUgcHJvcGVydHkgbmFtZSBwYXJ0IG9mIGxpbmtzXG52YXIgY2hhaW5MaW5rID0gL1xcLnxcXFt8XFwoLztcblxuLy8gZGV0ZXJtaW5lcyB3aGV0aGVyIGFuIGV4cHJlc3Npb24gaXMgYSBzZXR0ZXIgb3IgZ2V0dGVyIChgbmFtZWAgdnNcbi8vIGBuYW1lID0gJ2JvYidgKVxudmFyIHNldHRlckV4cHIgPSAvXFxzPVxccy87XG5cbnZhciBpZ25vcmUgPSBudWxsO1xudmFyIHN0cmluZ3MgPSBbXTtcbnZhciByZWZlcmVuY2VDb3VudCA9IDA7XG52YXIgY3VycmVudFJlZmVyZW5jZSA9IDA7XG52YXIgY3VycmVudEluZGV4ID0gMDtcbnZhciBmaW5pc2hlZENoYWluID0gZmFsc2U7XG52YXIgY29udGludWF0aW9uID0gZmFsc2U7XG5cbi8vIEFkZHMgYHRoaXMuYCB0byB0aGUgYmVnaW5uaW5nIG9mIGVhY2ggdmFsaWQgcHJvcGVydHkgaW4gYW4gZXhwcmVzc2lvbixcbi8vIHByb2Nlc3NlcyBmb3JtYXR0ZXJzLCBhbmQgcHJvdmlkZXMgbnVsbC10ZXJtaW5hdGlvbiBpbiBwcm9wZXJ0eSBjaGFpbnNcbmZ1bmN0aW9uIHBhcnNlRXhwcmVzc2lvbihleHByLCBvcHRpb25zKSB7XG4gIGluaXRQYXJzZShleHByLCBvcHRpb25zKTtcbiAgZXhwciA9IHB1bGxPdXRTdHJpbmdzKGV4cHIpO1xuICBleHByID0gcGFyc2VGb3JtYXR0ZXJzKGV4cHIpO1xuICBleHByID0gcGFyc2VFeHByKGV4cHIpO1xuICBleHByID0gJ3JldHVybiAnICsgZXhwcjtcbiAgZXhwciA9IHB1dEluU3RyaW5ncyhleHByKTtcbiAgZXhwciA9IGFkZFJlZmVyZW5jZXMoZXhwcik7XG4gIHJldHVybiBleHByO1xufVxuXG5cbmZ1bmN0aW9uIGluaXRQYXJzZShleHByLCBvcHRpb25zKSB7XG4gIHJlZmVyZW5jZUNvdW50ID0gY3VycmVudFJlZmVyZW5jZSA9IDA7XG4gIC8vIElnbm9yZXMga2V5d29yZHMgYW5kIHByb3ZpZGVkIGFyZ3VtZW50IG5hbWVzXG4gIGlnbm9yZSA9IGV4cHJlc3Npb24uZ2xvYmFscy5jb25jYXQob3B0aW9ucy5nbG9iYWxzIHx8IFtdLCBvcHRpb25zLmFyZ3MgfHwgW10pO1xuICBzdHJpbmdzLmxlbmd0aCA9IDA7XG59XG5cblxuLy8gQWRkcyBwbGFjZWhvbGRlcnMgZm9yIHN0cmluZ3Mgc28gd2UgY2FuIHByb2Nlc3MgdGhlIHJlc3Qgd2l0aG91dCB0aGVpciBjb250ZW50XG4vLyBtZXNzaW5nIHVzIHVwLlxuZnVuY3Rpb24gcHVsbE91dFN0cmluZ3MoZXhwcikge1xuICByZXR1cm4gZXhwci5yZXBsYWNlKHF1b3RlRXhwciwgZnVuY3Rpb24oc3RyLCBxdW90ZSkge1xuICAgIHN0cmluZ3MucHVzaChzdHIpO1xuICAgIHJldHVybiBxdW90ZSArIHF1b3RlOyAvLyBwbGFjZWhvbGRlciBmb3IgdGhlIHN0cmluZ1xuICB9KTtcbn1cblxuXG4vLyBSZXBsYWNlcyBzdHJpbmcgcGxhY2Vob2xkZXJzLlxuZnVuY3Rpb24gcHV0SW5TdHJpbmdzKGV4cHIpIHtcbiAgcmV0dXJuIGV4cHIucmVwbGFjZShlbXB0eVF1b3RlRXhwciwgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHN0cmluZ3Muc2hpZnQoKTtcbiAgfSk7XG59XG5cblxuLy8gUHJlcGVuZHMgcmVmZXJlbmNlIHZhcmlhYmxlIGRlZmluaXRpb25zXG5mdW5jdGlvbiBhZGRSZWZlcmVuY2VzKGV4cHIpIHtcbiAgaWYgKHJlZmVyZW5jZUNvdW50KSB7XG4gICAgdmFyIHJlZnMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8PSByZWZlcmVuY2VDb3VudDsgaSsrKSB7XG4gICAgICByZWZzLnB1c2goJ19yZWYnICsgaSk7XG4gICAgfVxuICAgIGV4cHIgPSAndmFyICcgKyByZWZzLmpvaW4oJywgJykgKyAnO1xcbicgKyBleHByO1xuICB9XG4gIHJldHVybiBleHByO1xufVxuXG5cbmZ1bmN0aW9uIHBhcnNlRm9ybWF0dGVycyhleHByKSB7XG4gIC8vIFJlbW92ZXMgZm9ybWF0dGVycyBmcm9tIGV4cHJlc3Npb24gc3RyaW5nXG4gIGV4cHIgPSBleHByLnJlcGxhY2UocGlwZUV4cHIsIGZ1bmN0aW9uKG1hdGNoLCBvckluZGljYXRvcikge1xuICAgIGlmIChvckluZGljYXRvcikgcmV0dXJuIG1hdGNoO1xuICAgIHJldHVybiAnQEBAJztcbiAgfSk7XG5cbiAgZm9ybWF0dGVycyA9IGV4cHIuc3BsaXQoL1xccypAQEBcXHMqLyk7XG4gIGV4cHIgPSBmb3JtYXR0ZXJzLnNoaWZ0KCk7XG4gIGlmICghZm9ybWF0dGVycy5sZW5ndGgpIHJldHVybiBleHByO1xuXG4gIC8vIFByb2Nlc3NlcyB0aGUgZm9ybWF0dGVyc1xuICAvLyBJZiB0aGUgZXhwcmVzc2lvbiBpcyBhIHNldHRlciB0aGUgdmFsdWUgd2lsbCBiZSBydW4gdGhyb3VnaCB0aGUgZm9ybWF0dGVyc1xuICB2YXIgc2V0dGVyID0gJyc7XG4gIHZhbHVlID0gZXhwcjtcblxuICBpZiAoc2V0dGVyRXhwci50ZXN0KGV4cHIpKSB7XG4gICAgdmFyIHBhcnRzID0gZXhwci5zcGxpdChzZXR0ZXJFeHByKTtcbiAgICBzZXR0ZXIgPSBwYXJ0c1swXSArICcgPSAnO1xuICAgIHZhbHVlID0gcGFydHNbMV07XG4gIH1cblxuICBmb3JtYXR0ZXJzLmZvckVhY2goZnVuY3Rpb24oZm9ybWF0dGVyKSB7XG4gICAgdmFyIG1hdGNoID0gZm9ybWF0dGVyLnRyaW0oKS5tYXRjaChmb3JtYXR0ZXJFeHByKTtcbiAgICBpZiAoIW1hdGNoKSB0aHJvdyBuZXcgRXJyb3IoJ0Zvcm1hdHRlciBpcyBpbnZhbGlkOiAnICsgZm9ybWF0dGVyKTtcbiAgICB2YXIgZm9ybWF0dGVyTmFtZSA9IG1hdGNoWzFdO1xuICAgIHZhciBhcmdzID0gbWF0Y2hbMl0gPyBtYXRjaFsyXS5zcGxpdChhcmdTZXBhcmF0b3IpIDogW107XG4gICAgYXJncy51bnNoaWZ0KHZhbHVlKTtcbiAgICBpZiAoc2V0dGVyKSBhcmdzLnB1c2godHJ1ZSk7XG4gICAgdmFsdWUgPSAnX2Zvcm1hdHRlcnNfLicgKyBmb3JtYXR0ZXJOYW1lICsgJy5jYWxsKHRoaXMsICcgKyBhcmdzLmpvaW4oJywgJykgKyAnKSc7XG4gIH0pO1xuXG4gIHJldHVybiBzZXR0ZXIgKyB2YWx1ZTtcbn1cblxuXG5mdW5jdGlvbiBwYXJzZUV4cHIoZXhwcikge1xuICBpZiAoc2V0dGVyRXhwci50ZXN0KGV4cHIpKSB7XG4gICAgdmFyIHBhcnRzID0gZXhwci5zcGxpdCgnID0gJyk7XG4gICAgdmFyIHNldHRlciA9IHBhcnRzWzBdO1xuICAgIHZhciB2YWx1ZSA9IHBhcnRzWzFdO1xuICAgIHZhciBuZWdhdGUgPSAnJztcbiAgICBpZiAoc2V0dGVyLmNoYXJBdCgwKSA9PT0gJyEnKSB7XG4gICAgICBuZWdhdGUgPSAnISc7XG4gICAgICBzZXR0ZXIgPSBzZXR0ZXIuc2xpY2UoMSk7XG4gICAgfVxuICAgIHNldHRlciA9IHBhcnNlUHJvcGVydHlDaGFpbnMoc2V0dGVyKS5yZXBsYWNlKC9eXFwofFxcKSQvZywgJycpICsgJyA9ICc7XG4gICAgdmFsdWUgPSBwYXJzZVByb3BlcnR5Q2hhaW5zKHZhbHVlKTtcbiAgICByZXR1cm4gc2V0dGVyICsgbmVnYXRlICsgdmFsdWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHBhcnNlUHJvcGVydHlDaGFpbnMoZXhwcik7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBwYXJzZVByb3BlcnR5Q2hhaW5zKGV4cHIpIHtcbiAgdmFyIGphdmFzY3JpcHQgPSAnJywganM7XG4gIC8vIGFsbG93IHJlY3Vyc2lvbiBpbnRvIGZ1bmN0aW9uIGFyZ3MgYnkgcmVzZXR0aW5nIHByb3BFeHByXG4gIHZhciBwcmV2aW91c0luZGV4ZXMgPSBbY3VycmVudEluZGV4LCBwcm9wRXhwci5sYXN0SW5kZXhdO1xuICBjdXJyZW50SW5kZXggPSAwO1xuICBwcm9wRXhwci5sYXN0SW5kZXggPSAwO1xuICB3aGlsZSAoKGpzID0gbmV4dENoYWluKGV4cHIpKSAhPT0gZmFsc2UpIHtcbiAgICBqYXZhc2NyaXB0ICs9IGpzO1xuICB9XG4gIGN1cnJlbnRJbmRleCA9IHByZXZpb3VzSW5kZXhlc1swXTtcbiAgcHJvcEV4cHIubGFzdEluZGV4ID0gcHJldmlvdXNJbmRleGVzWzFdO1xuICByZXR1cm4gamF2YXNjcmlwdDtcbn1cblxuXG5mdW5jdGlvbiBuZXh0Q2hhaW4oZXhwcikge1xuICBpZiAoZmluaXNoZWRDaGFpbikge1xuICAgIHJldHVybiAoZmluaXNoZWRDaGFpbiA9IGZhbHNlKTtcbiAgfVxuICB2YXIgbWF0Y2ggPSBwcm9wRXhwci5leGVjKGV4cHIpO1xuICBpZiAoIW1hdGNoKSB7XG4gICAgZmluaXNoZWRDaGFpbiA9IHRydWUgLy8gbWFrZSBzdXJlIG5leHQgY2FsbCB3ZSByZXR1cm4gZmFsc2VcbiAgICByZXR1cm4gZXhwci5zbGljZShjdXJyZW50SW5kZXgpO1xuICB9XG5cbiAgLy8gYHByZWZpeGAgaXMgYG9iakluZGljYXRvcmAgd2l0aCB0aGUgd2hpdGVzcGFjZSB0aGF0IG1heSBjb21lIGFmdGVyIGl0LlxuICB2YXIgcHJlZml4ID0gbWF0Y2hbMV07XG5cbiAgLy8gYG9iakluZGljYXRvcmAgaXMgYHtgIG9yIGAsYCBhbmQgbGV0J3MgdXMga25vdyB0aGlzIGlzIGFuIG9iamVjdCBwcm9wZXJ0eVxuICAvLyBuYW1lIChlLmcuIHByb3AgaW4gYHtwcm9wOmZhbHNlfWApLlxuICB2YXIgb2JqSW5kaWNhdG9yID0gbWF0Y2hbMl07XG5cbiAgLy8gYHByb3BDaGFpbmAgaXMgdGhlIGNoYWluIG9mIHByb3BlcnRpZXMgbWF0Y2hlZCAoZS5nLiBgdGhpcy51c2VyLmVtYWlsYCkuXG4gIHZhciBwcm9wQ2hhaW4gPSBtYXRjaFszXTtcblxuICAvLyBgcG9zdGZpeGAgaXMgdGhlIGBjb2xvbk9yUGFyZW5gIHdpdGggd2hpdGVzcGFjZSBiZWZvcmUgaXQuXG4gIHZhciBwb3N0Zml4ID0gbWF0Y2hbNF07XG5cbiAgLy8gYGNvbG9uT3JQYXJlbmAgbWF0Y2hlcyB0aGUgY29sb24gKDopIGFmdGVyIHRoZSBwcm9wZXJ0eSAoaWYgaXQgaXMgYW4gb2JqZWN0KVxuICAvLyBvciBwYXJlbnRoZXNpcyBpZiBpdCBpcyBhIGZ1bmN0aW9uLiBXZSB1c2UgYGNvbG9uT3JQYXJlbmAgYW5kIGBvYmpJbmRpY2F0b3JgXG4gIC8vIHRvIGtub3cgaWYgaXQgaXMgYW4gb2JqZWN0LlxuICB2YXIgY29sb25PclBhcmVuID0gbWF0Y2hbNV07XG5cbiAgbWF0Y2ggPSBtYXRjaFswXTtcblxuICB2YXIgc2tpcHBlZCA9IGV4cHIuc2xpY2UoY3VycmVudEluZGV4LCBwcm9wRXhwci5sYXN0SW5kZXggLSBtYXRjaC5sZW5ndGgpO1xuICBjdXJyZW50SW5kZXggPSBwcm9wRXhwci5sYXN0SW5kZXg7XG5cbiAgLy8gc2tpcHMgb2JqZWN0IGtleXMgZS5nLiB0ZXN0IGluIGB7dGVzdDp0cnVlfWAuXG4gIGlmIChvYmpJbmRpY2F0b3IgJiYgY29sb25PclBhcmVuID09PSAnOicpIHtcbiAgICByZXR1cm4gc2tpcHBlZCArIG1hdGNoO1xuICB9XG5cbiAgcmV0dXJuIHNraXBwZWQgKyBwYXJzZUNoYWluKHByZWZpeCwgcHJvcENoYWluLCBwb3N0Zml4LCBjb2xvbk9yUGFyZW4sIGV4cHIpO1xufVxuXG5cbmZ1bmN0aW9uIHNwbGl0TGlua3MoY2hhaW4pIHtcbiAgdmFyIGluZGV4ID0gMDtcbiAgdmFyIHBhcnRzID0gW107XG4gIHZhciBtYXRjaDtcbiAgd2hpbGUgKG1hdGNoID0gY2hhaW5MaW5rcy5leGVjKGNoYWluKSkge1xuICAgIGlmIChjaGFpbkxpbmtzLmxhc3RJbmRleCA9PT0gMSkgY29udGludWU7XG4gICAgcGFydHMucHVzaChjaGFpbi5zbGljZShpbmRleCwgY2hhaW5MaW5rcy5sYXN0SW5kZXggLSAxKSk7XG4gICAgaW5kZXggPSBjaGFpbkxpbmtzLmxhc3RJbmRleCAtIDE7XG4gIH1cbiAgcGFydHMucHVzaChjaGFpbi5zbGljZShpbmRleCkpO1xuICByZXR1cm4gcGFydHM7XG59XG5cblxuZnVuY3Rpb24gYWRkVGhpcyhjaGFpbikge1xuICBpZiAoaWdub3JlLmluZGV4T2YoY2hhaW4uc3BsaXQoY2hhaW5MaW5rKS5zaGlmdCgpKSA9PT0gLTEpIHtcbiAgICByZXR1cm4gJ3RoaXMuJyArIGNoYWluO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBjaGFpbjtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIHBhcnNlQ2hhaW4ocHJlZml4LCBwcm9wQ2hhaW4sIHBvc3RmaXgsIHBhcmVuLCBleHByKSB7XG4gIC8vIGNvbnRpbnVhdGlvbnMgYWZ0ZXIgYSBmdW5jdGlvbiAoZS5nLiBgZ2V0VXNlcigxMikuZmlyc3ROYW1lYCkuXG4gIGNvbnRpbnVhdGlvbiA9IHByZWZpeCA9PT0gJy4nO1xuICBpZiAoY29udGludWF0aW9uKSB7XG4gICAgcHJvcENoYWluID0gJy4nICsgcHJvcENoYWluO1xuICAgIHByZWZpeCA9ICcnO1xuICB9XG5cbiAgdmFyIGxpbmtzID0gc3BsaXRMaW5rcyhwcm9wQ2hhaW4pO1xuICB2YXIgbmV3Q2hhaW4gPSAnJztcblxuICBpZiAobGlua3MubGVuZ3RoID09PSAxICYmICFjb250aW51YXRpb24gJiYgIXBhcmVuKSB7XG4gICAgbGluayA9IGxpbmtzWzBdO1xuICAgIG5ld0NoYWluID0gYWRkVGhpcyhsaW5rKTtcbiAgfSBlbHNlIHtcbiAgICBpZiAoIWNvbnRpbnVhdGlvbikge1xuICAgICAgbmV3Q2hhaW4gPSAnKCc7XG4gICAgfVxuXG4gICAgbGlua3MuZm9yRWFjaChmdW5jdGlvbihsaW5rLCBpbmRleCkge1xuICAgICAgaWYgKGluZGV4ICE9PSBsaW5rcy5sZW5ndGggLSAxKSB7XG4gICAgICAgIG5ld0NoYWluICs9IHBhcnNlUGFydChsaW5rLCBpbmRleCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoIXBhcmVuc1twYXJlbl0pIHtcbiAgICAgICAgICBuZXdDaGFpbiArPSAnX3JlZicgKyBjdXJyZW50UmVmZXJlbmNlICsgbGluayArICcpJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwb3N0Zml4ID0gcG9zdGZpeC5yZXBsYWNlKHBhcmVuLCAnJyk7XG4gICAgICAgICAgbmV3Q2hhaW4gKz0gcGFyc2VGdW5jdGlvbihsaW5rLCBpbmRleCwgZXhwcik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBwcmVmaXggKyBuZXdDaGFpbiArIHBvc3RmaXg7XG59XG5cblxudmFyIHBhcmVucyA9IHtcbiAgJygnOiAnKScsXG4gICdbJzogJ10nXG59O1xuXG4vLyBIYW5kbGVzIGEgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGluIGl0cyBjb3JyZWN0IHNjb3BlXG4vLyBGaW5kcyB0aGUgZW5kIG9mIHRoZSBmdW5jdGlvbiBhbmQgcHJvY2Vzc2VzIHRoZSBhcmd1bWVudHNcbmZ1bmN0aW9uIHBhcnNlRnVuY3Rpb24obGluaywgaW5kZXgsIGV4cHIpIHtcbiAgdmFyIGNhbGwgPSBnZXRGdW5jdGlvbkNhbGwoZXhwcik7XG4gIGxpbmsgKz0gY2FsbC5zbGljZSgwLCAxKSArICd+fmluc2lkZVBhcmVuc35+JyArIGNhbGwuc2xpY2UoLTEpO1xuICB2YXIgaW5zaWRlUGFyZW5zID0gY2FsbC5zbGljZSgxLCAtMSk7XG5cbiAgaWYgKGV4cHIuY2hhckF0KHByb3BFeHByLmxhc3RJbmRleCkgPT09ICcuJykge1xuICAgIGxpbmsgPSBwYXJzZVBhcnQobGluaywgaW5kZXgpXG4gIH0gZWxzZSBpZiAoaW5kZXggPT09IDApIHtcbiAgICBsaW5rID0gcGFyc2VQYXJ0KGxpbmssIGluZGV4KTtcbiAgICBsaW5rICs9ICdfcmVmJyArIGN1cnJlbnRSZWZlcmVuY2UgKyAnKSc7XG4gIH0gZWxzZSB7XG4gICAgbGluayA9ICdfcmVmJyArIGN1cnJlbnRSZWZlcmVuY2UgKyBsaW5rICsgJyknO1xuICB9XG5cbiAgdmFyIHJlZiA9IGN1cnJlbnRSZWZlcmVuY2U7XG4gIGxpbmsgPSBsaW5rLnJlcGxhY2UoJ35+aW5zaWRlUGFyZW5zfn4nLCBwYXJzZVByb3BlcnR5Q2hhaW5zKGluc2lkZVBhcmVucykpO1xuICBjdXJyZW50UmVmZXJlbmNlID0gcmVmO1xuICByZXR1cm4gbGluaztcbn1cblxuXG4vLyByZXR1cm5zIHRoZSBjYWxsIHBhcnQgb2YgYSBmdW5jdGlvbiAoZS5nLiBgdGVzdCgxMjMpYCB3b3VsZCByZXR1cm4gYCgxMjMpYClcbmZ1bmN0aW9uIGdldEZ1bmN0aW9uQ2FsbChleHByKSB7XG4gIHZhciBzdGFydEluZGV4ID0gcHJvcEV4cHIubGFzdEluZGV4O1xuICB2YXIgb3BlbiA9IGV4cHIuY2hhckF0KHN0YXJ0SW5kZXggLSAxKTtcbiAgdmFyIGNsb3NlID0gcGFyZW5zW29wZW5dO1xuICB2YXIgZW5kSW5kZXggPSBzdGFydEluZGV4IC0gMTtcbiAgdmFyIHBhcmVuQ291bnQgPSAxO1xuICB3aGlsZSAoZW5kSW5kZXgrKyA8IGV4cHIubGVuZ3RoKSB7XG4gICAgdmFyIGNoID0gZXhwci5jaGFyQXQoZW5kSW5kZXgpO1xuICAgIGlmIChjaCA9PT0gb3BlbikgcGFyZW5Db3VudCsrO1xuICAgIGVsc2UgaWYgKGNoID09PSBjbG9zZSkgcGFyZW5Db3VudC0tO1xuICAgIGlmIChwYXJlbkNvdW50ID09PSAwKSBicmVhaztcbiAgfVxuICBjdXJyZW50SW5kZXggPSBwcm9wRXhwci5sYXN0SW5kZXggPSBlbmRJbmRleCArIDE7XG4gIHJldHVybiBvcGVuICsgZXhwci5zbGljZShzdGFydEluZGV4LCBlbmRJbmRleCkgKyBjbG9zZTtcbn1cblxuXG5cbmZ1bmN0aW9uIHBhcnNlUGFydChwYXJ0LCBpbmRleCkge1xuICAvLyBpZiB0aGUgZmlyc3RcbiAgaWYgKGluZGV4ID09PSAwICYmICFjb250aW51YXRpb24pIHtcbiAgICBpZiAoaWdub3JlLmluZGV4T2YocGFydC5zcGxpdCgvXFwufFxcKHxcXFsvKS5zaGlmdCgpKSA9PT0gLTEpIHtcbiAgICAgIHBhcnQgPSAndGhpcy4nICsgcGFydDtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcGFydCA9ICdfcmVmJyArIGN1cnJlbnRSZWZlcmVuY2UgKyBwYXJ0O1xuICB9XG5cbiAgY3VycmVudFJlZmVyZW5jZSA9ICsrcmVmZXJlbmNlQ291bnQ7XG4gIHZhciByZWYgPSAnX3JlZicgKyBjdXJyZW50UmVmZXJlbmNlO1xuICByZXR1cm4gJygnICsgcmVmICsgJyA9ICcgKyBwYXJ0ICsgJykgPT0gbnVsbCA/IHVuZGVmaW5lZCA6ICc7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSByZXF1aXJlKCcuL29ic2VydmVyJyk7XG5leHBvcnRzLmV4cHJlc3Npb24gPSByZXF1aXJlKCcuL2V4cHJlc3Npb24nKTtcbmV4cG9ydHMuZXhwcmVzc2lvbi5kaWZmID0gcmVxdWlyZSgnLi9kaWZmJyk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IE9ic2VydmVyO1xudmFyIGV4cHJlc3Npb24gPSByZXF1aXJlKCcuL2V4cHJlc3Npb24nKTtcbnZhciBkaWZmID0gcmVxdWlyZSgnLi9kaWZmJyk7XG52YXIgcmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCBzZXRUaW1lb3V0O1xudmFyIGNhbmNlbEFuaW1hdGlvbkZyYW1lID0gd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lIHx8IGNsZWFyVGltZW91dDtcblxuLy8gIyBPYnNlcnZlclxuXG4vLyBEZWZpbmVzIGFuIG9ic2VydmVyIGNsYXNzIHdoaWNoIHJlcHJlc2VudHMgYW4gZXhwcmVzc2lvbi4gV2hlbmV2ZXIgdGhhdCBleHByZXNzaW9uIHJldHVybnMgYSBuZXcgdmFsdWUgdGhlIGBjYWxsYmFja2Bcbi8vIGlzIGNhbGxlZCB3aXRoIHRoZSB2YWx1ZS5cbi8vXG4vLyBJZiB0aGUgb2xkIGFuZCBuZXcgdmFsdWVzIHdlcmUgZWl0aGVyIGFuIGFycmF5IG9yIGFuIG9iamVjdCwgdGhlIGBjYWxsYmFja2AgYWxzb1xuLy8gcmVjZWl2ZXMgYW4gYXJyYXkgb2Ygc3BsaWNlcyAoZm9yIGFuIGFycmF5KSwgb3IgYW4gYXJyYXkgb2YgY2hhbmdlIG9iamVjdHMgKGZvciBhbiBvYmplY3QpIHdoaWNoIGFyZSB0aGUgc2FtZVxuLy8gZm9ybWF0IHRoYXQgYEFycmF5Lm9ic2VydmVgIGFuZCBgT2JqZWN0Lm9ic2VydmVgIHJldHVybiA8aHR0cDovL3dpa2kuZWNtYXNjcmlwdC5vcmcvZG9rdS5waHA/aWQ9aGFybW9ueTpvYnNlcnZlPi5cbmZ1bmN0aW9uIE9ic2VydmVyKGV4cHIsIGNhbGxiYWNrLCBjYWxsYmFja0NvbnRleHQpIHtcbiAgaWYgKHR5cGVvZiBleHByID09PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhpcy5nZXR0ZXIgPSBleHByO1xuICAgIHRoaXMuc2V0dGVyID0gZXhwcjtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmdldHRlciA9IGV4cHJlc3Npb24uZ2V0KGV4cHIpO1xuICB9XG4gIHRoaXMuZXhwciA9IGV4cHI7XG4gIHRoaXMuY2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgdGhpcy5jYWxsYmFja0NvbnRleHQgPSBjYWxsYmFja0NvbnRleHQ7XG4gIHRoaXMuc2tpcCA9IGZhbHNlO1xuICB0aGlzLmZvcmNlVXBkYXRlTmV4dFN5bmMgPSBmYWxzZTtcbiAgdGhpcy5jb250ZXh0ID0gbnVsbDtcbiAgdGhpcy5vbGRWYWx1ZSA9IHVuZGVmaW5lZDtcbn1cblxuT2JzZXJ2ZXIucHJvdG90eXBlID0ge1xuXG4gIC8vIEJpbmRzIHRoaXMgZXhwcmVzc2lvbiB0byBhIGdpdmVuIGNvbnRleHRcbiAgYmluZDogZnVuY3Rpb24oY29udGV4dCwgc2tpcFVwZGF0ZSkge1xuICAgIHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG4gICAgaWYgKHRoaXMuY2FsbGJhY2spIHtcbiAgICAgIE9ic2VydmVyLmFkZCh0aGlzLCBza2lwVXBkYXRlKTtcbiAgICB9XG4gIH0sXG5cbiAgLy8gVW5iaW5kcyB0aGlzIGV4cHJlc3Npb25cbiAgdW5iaW5kOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmNvbnRleHQgPSBudWxsO1xuICAgIE9ic2VydmVyLnJlbW92ZSh0aGlzKTtcbiAgfSxcblxuICAvLyBSZXR1cm5zIHRoZSBjdXJyZW50IHZhbHVlIG9mIHRoaXMgb2JzZXJ2ZXJcbiAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5jb250ZXh0KSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXR0ZXIuY2FsbCh0aGlzLmNvbnRleHQsIE9ic2VydmVyLmZvcm1hdHRlcnMpO1xuICAgIH1cbiAgfSxcblxuICAvLyBTZXRzIHRoZSB2YWx1ZSBvZiB0aGlzIGV4cHJlc3Npb25cbiAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmICghdGhpcy5jb250ZXh0KSByZXR1cm47XG4gICAgaWYgKHRoaXMuc2V0dGVyID09PSBmYWxzZSkgcmV0dXJuO1xuICAgIGlmICghdGhpcy5zZXR0ZXIpIHtcbiAgICAgIHRoaXMuc2V0dGVyID0gdHlwZW9mIHRoaXMuZXhwciA9PT0gJ3N0cmluZydcbiAgICAgICAgPyBleHByZXNzaW9uLmdldFNldHRlcih0aGlzLmV4cHIsIHsgaWdub3JlRXJyb3JzOiB0cnVlIH0pIHx8IGZhbHNlXG4gICAgICAgIDogZmFsc2U7XG4gICAgICBpZiAoIXRoaXMuc2V0dGVyKSByZXR1cm47XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIHZhciByZXN1bHQgPSB0aGlzLnNldHRlci5jYWxsKHRoaXMuY29udGV4dCwgT2JzZXJ2ZXIuZm9ybWF0dGVycywgdmFsdWUpO1xuICAgIH0gY2F0Y2goZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuc3luYygpO1xuICAgIE9ic2VydmVyLnN5bmMoKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9LFxuXG5cbiAgLy8gSW5zdHJ1Y3RzIHRoaXMgb2JzZXJ2ZXIgdG8gbm90IGNhbGwgaXRzIGBjYWxsYmFja2Agb24gdGhlIG5leHQgc3luYywgd2hldGhlciB0aGUgdmFsdWUgaGFzIGNoYW5nZWQgb3Igbm90XG4gIHNraXBOZXh0U3luYzogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5za2lwID0gdHJ1ZTtcbiAgfSxcblxuXG4gIC8vIFN5bmNzIHRoaXMgb2JzZXJ2ZXIgbm93LCBjYWxsaW5nIHRoZSBjYWxsYmFjayBpbW1lZGlhdGVseSBpZiB0aGVyZSBoYXZlIGJlZW4gY2hhbmdlc1xuICBzeW5jOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdmFsdWUgPSB0aGlzLmdldCgpO1xuXG4gICAgLy8gRG9uJ3QgY2FsbCB0aGUgY2FsbGJhY2sgaWYgYHNraXBOZXh0U3luY2Agd2FzIGNhbGxlZCBvbiB0aGUgb2JzZXJ2ZXJcbiAgICBpZiAodGhpcy5za2lwIHx8ICF0aGlzLmNhbGxiYWNrKSB7XG4gICAgICB0aGlzLnNraXAgPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWYgYW4gYXJyYXkgaGFzIGNoYW5nZWQgY2FsY3VsYXRlIHRoZSBzcGxpY2VzIGFuZCBjYWxsIHRoZSBjYWxsYmFjay4gVGhpc1xuICAgICAgdmFyIGNoYW5nZWQgPSBkaWZmLnZhbHVlcyh2YWx1ZSwgdGhpcy5vbGRWYWx1ZSk7XG4gICAgICBpZiAoIWNoYW5nZWQgJiYgIXRoaXMuZm9yY2VVcGRhdGVOZXh0U3luYykgcmV0dXJuO1xuICAgICAgdGhpcy5mb3JjZVVwZGF0ZU5leHRTeW5jID0gZmFsc2U7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShjaGFuZ2VkKSkge1xuICAgICAgICB0aGlzLmNhbGxiYWNrLmNhbGwodGhpcy5jYWxsYmFja0NvbnRleHQsIHZhbHVlLCB0aGlzLm9sZFZhbHVlLCBjaGFuZ2VkKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5jYWxsYmFjay5jYWxsKHRoaXMuY2FsbGJhY2tDb250ZXh0LCB2YWx1ZSwgdGhpcy5vbGRWYWx1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZ2V0Q2hhbmdlUmVjb3Jkcykge1xuICAgICAgLy8gU3RvcmUgYW4gaW1tdXRhYmxlIHZlcnNpb24gb2YgdGhlIHZhbHVlLCBhbGxvd2luZyBmb3IgYXJyYXlzIGFuZCBvYmplY3RzIHRvIGNoYW5nZSBpbnN0YW5jZSBidXQgbm90IGNvbnRlbnQgYW5kXG4gICAgICAvLyBzdGlsbCByZWZyYWluIGZyb20gZGlzcGF0Y2hpbmcgY2FsbGJhY2tzIChlLmcuIHdoZW4gdXNpbmcgYW4gb2JqZWN0IGluIGJpbmQtY2xhc3Mgb3Igd2hlbiB1c2luZyBhcnJheSBmb3JtYXR0ZXJzXG4gICAgICAvLyBpbiBiaW5kLWVhY2gpXG4gICAgICB0aGlzLm9sZFZhbHVlID0gZGlmZi5jbG9uZSh2YWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub2xkVmFsdWUgPSB2YWx1ZTtcbiAgICB9XG4gIH1cbn07XG5cblxuLy8gQW4gYXJyYXkgb2YgYWxsIG9ic2VydmVycywgY29uc2lkZXJlZCAqcHJpdmF0ZSpcbk9ic2VydmVyLm9ic2VydmVycyA9IFtdO1xuXG4vLyBBbiBhcnJheSBvZiBjYWxsYmFja3MgdG8gcnVuIGFmdGVyIHRoZSBuZXh0IHN5bmMsIGNvbnNpZGVyZWQgKnByaXZhdGUqXG5PYnNlcnZlci5jYWxsYmFja3MgPSBbXTtcbk9ic2VydmVyLmxpc3RlbmVycyA9IFtdO1xuXG4vLyBBZGRzIGEgbmV3IG9ic2VydmVyIHRvIGJlIHN5bmNlZCB3aXRoIGNoYW5nZXMuIElmIGBza2lwVXBkYXRlYCBpcyB0cnVlIHRoZW4gdGhlIGNhbGxiYWNrIHdpbGwgb25seSBiZSBjYWxsZWQgd2hlbiBhXG4vLyBjaGFuZ2UgaXMgbWFkZSwgbm90IGluaXRpYWxseS5cbk9ic2VydmVyLmFkZCA9IGZ1bmN0aW9uKG9ic2VydmVyLCBza2lwVXBkYXRlKSB7XG4gIHRoaXMub2JzZXJ2ZXJzLnB1c2gob2JzZXJ2ZXIpO1xuICBpZiAoIXNraXBVcGRhdGUpIG9ic2VydmVyLnN5bmMoKTtcbn07XG5cbi8vIFJlbW92ZXMgYW4gb2JzZXJ2ZXIsIHN0b3BwaW5nIGl0IGZyb20gYmVpbmcgcnVuXG5PYnNlcnZlci5yZW1vdmUgPSBmdW5jdGlvbihvYnNlcnZlcikge1xuICB2YXIgaW5kZXggPSB0aGlzLm9ic2VydmVycy5pbmRleE9mKG9ic2VydmVyKTtcbiAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgIHRoaXMub2JzZXJ2ZXJzLnNwbGljZShpbmRleCwgMSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59O1xuXG4vLyAqcHJpdmF0ZSogcHJvcGVydGllcyB1c2VkIGluIHRoZSBzeW5jIGN5Y2xlXG5PYnNlcnZlci5zeW5jaW5nID0gZmFsc2U7XG5PYnNlcnZlci5yZXJ1biA9IGZhbHNlO1xuT2JzZXJ2ZXIuY3ljbGVzID0gMDtcbk9ic2VydmVyLm1heCA9IDEwO1xuT2JzZXJ2ZXIudGltZW91dCA9IG51bGw7XG5PYnNlcnZlci5zeW5jUGVuZGluZyA9IG51bGw7XG5cbi8vIFNjaGVkdWxlcyBhbiBvYnNlcnZlciBzeW5jIGN5Y2xlIHdoaWNoIGNoZWNrcyBhbGwgdGhlIG9ic2VydmVycyB0byBzZWUgaWYgdGhleSd2ZSBjaGFuZ2VkLlxuT2JzZXJ2ZXIuc3luYyA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gIGlmIChPYnNlcnZlci5zeW5jUGVuZGluZykgcmV0dXJuIGZhbHNlO1xuICBPYnNlcnZlci5zeW5jUGVuZGluZyA9IHJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbigpIHtcbiAgICBPYnNlcnZlci5zeW5jTm93KGNhbGxiYWNrKTtcbiAgfSk7XG4gIHJldHVybiB0cnVlO1xufTtcblxuLy8gUnVucyB0aGUgb2JzZXJ2ZXIgc3luYyBjeWNsZSB3aGljaCBjaGVja3MgYWxsIHRoZSBvYnNlcnZlcnMgdG8gc2VlIGlmIHRoZXkndmUgY2hhbmdlZC5cbk9ic2VydmVyLnN5bmNOb3cgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICBpZiAodHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgT2JzZXJ2ZXIuYWZ0ZXJTeW5jKGNhbGxiYWNrKTtcbiAgfVxuXG4gIGNhbmNlbEFuaW1hdGlvbkZyYW1lKE9ic2VydmVyLnN5bmNQZW5kaW5nKTtcbiAgT2JzZXJ2ZXIuc3luY1BlbmRpbmcgPSBudWxsO1xuXG4gIGlmIChPYnNlcnZlci5zeW5jaW5nKSB7XG4gICAgT2JzZXJ2ZXIucmVydW4gPSB0cnVlO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIE9ic2VydmVyLnN5bmNpbmcgPSB0cnVlO1xuICBPYnNlcnZlci5yZXJ1biA9IHRydWU7XG4gIE9ic2VydmVyLmN5Y2xlcyA9IDA7XG5cbiAgLy8gQWxsb3cgY2FsbGJhY2tzIHRvIHJ1biB0aGUgc3luYyBjeWNsZSBhZ2FpbiBpbW1lZGlhdGVseSwgYnV0IHN0b3AgYXQgYE9ic2VydmVyLm1heGAgKGRlZmF1bHQgMTApIGN5Y2xlcyB0byB3ZSBkb24ndFxuICAvLyBydW4gaW5maW5pdGUgbG9vcHNcbiAgd2hpbGUgKE9ic2VydmVyLnJlcnVuKSB7XG4gICAgaWYgKCsrT2JzZXJ2ZXIuY3ljbGVzID09PSBPYnNlcnZlci5tYXgpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW5maW5pdGUgb2JzZXJ2ZXIgc3luY2luZywgYW4gb2JzZXJ2ZXIgaXMgY2FsbGluZyBPYnNlcnZlci5zeW5jKCkgdG9vIG1hbnkgdGltZXMnKTtcbiAgICB9XG4gICAgT2JzZXJ2ZXIucmVydW4gPSBmYWxzZTtcbiAgICAvLyB0aGUgb2JzZXJ2ZXIgYXJyYXkgbWF5IGluY3JlYXNlIG9yIGRlY3JlYXNlIGluIHNpemUgKHJlbWFpbmluZyBvYnNlcnZlcnMpIGR1cmluZyB0aGUgc3luY1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgT2JzZXJ2ZXIub2JzZXJ2ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBPYnNlcnZlci5vYnNlcnZlcnNbaV0uc3luYygpO1xuICAgIH1cbiAgfVxuXG4gIHdoaWxlIChPYnNlcnZlci5jYWxsYmFja3MubGVuZ3RoKSB7XG4gICAgT2JzZXJ2ZXIuY2FsbGJhY2tzLnNoaWZ0KCkoKTtcbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gT2JzZXJ2ZXIubGlzdGVuZXJzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHZhciBsaXN0ZW5lciA9IE9ic2VydmVyLmxpc3RlbmVyc1tpXTtcbiAgICBsaXN0ZW5lcigpO1xuICB9XG5cbiAgT2JzZXJ2ZXIuc3luY2luZyA9IGZhbHNlO1xuICBPYnNlcnZlci5jeWNsZXMgPSAwO1xuICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8vIEFmdGVyIHRoZSBuZXh0IHN5bmMgKG9yIHRoZSBjdXJyZW50IGlmIGluIHRoZSBtaWRkbGUgb2Ygb25lKSwgcnVuIHRoZSBwcm92aWRlZCBjYWxsYmFja1xuT2JzZXJ2ZXIuYWZ0ZXJTeW5jID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgaWYgKHR5cGVvZiBjYWxsYmFjayAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2NhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICB9XG4gIE9ic2VydmVyLmNhbGxiYWNrcy5wdXNoKGNhbGxiYWNrKTtcbn07XG5cbk9ic2VydmVyLm9uU3luYyA9IGZ1bmN0aW9uKGxpc3RlbmVyKSB7XG4gIGlmICh0eXBlb2YgbGlzdGVuZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgfVxuICBPYnNlcnZlci5saXN0ZW5lcnMucHVzaChsaXN0ZW5lcik7XG59O1xuXG5PYnNlcnZlci5yZW1vdmVPblN5bmMgPSBmdW5jdGlvbihsaXN0ZW5lcikge1xuICBpZiAodHlwZW9mIGxpc3RlbmVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gIH1cbiAgdmFyIGluZGV4ID0gT2JzZXJ2ZXIubGlzdGVuZXJzLmluZGV4T2YobGlzdGVuZXIpO1xuICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgT2JzZXJ2ZXIubGlzdGVuZXJzLnNwbGljZShpbmRleCwgMSkucG9wKCk7XG4gIH1cbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlZ2lzdGVyRGVmYXVsdHM7XG5cbi8qKlxuICogIyBEZWZhdWx0IEJpbmRlcnNcbiAqIFJlZ2lzdGVycyBkZWZhdWx0IGJpbmRlcnMgd2l0aCBhIGZyYWdtZW50cyBvYmplY3QuXG4gKi9cbmZ1bmN0aW9uIHJlZ2lzdGVyRGVmYXVsdHMoZnJhZ21lbnRzKSB7XG5cbiAgLyoqXG4gICAqIEZhZGUgaW4gYW5kIG91dFxuICAgKi9cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQW5pbWF0aW9uKCdmYWRlJywge1xuICAgIG9wdGlvbnM6IHtcbiAgICAgIGR1cmF0aW9uOiAzMDAsXG4gICAgICBlYXNpbmc6ICdlYXNlLWluLW91dCdcbiAgICB9LFxuICAgIGFuaW1hdGVJbjogZnVuY3Rpb24oZWxlbWVudCwgZG9uZSkge1xuICAgICAgZWxlbWVudC5hbmltYXRlKFtcbiAgICAgICAgeyBvcGFjaXR5OiAnMCcgfSxcbiAgICAgICAgeyBvcGFjaXR5OiAnMScgfVxuICAgICAgXSwgdGhpcy5vcHRpb25zKS5vbmZpbmlzaCA9IGRvbmU7XG4gICAgfSxcbiAgICBhbmltYXRlT3V0OiBmdW5jdGlvbihlbGVtZW50LCBkb25lKSB7XG4gICAgICBlbGVtZW50LmFuaW1hdGUoW1xuICAgICAgICB7IG9wYWNpdHk6ICcxJyB9LFxuICAgICAgICB7IG9wYWNpdHk6ICcwJyB9XG4gICAgICBdLCB0aGlzLm9wdGlvbnMpLm9uZmluaXNoID0gZG9uZTtcbiAgICB9XG4gIH0pO1xuXG4gIHZhciBzbGlkZXMgPSB7XG4gICAgc2xpZGU6ICdoZWlnaHQnLFxuICAgIHNsaWRldjogJ2hlaWdodCcsXG4gICAgc2xpZGVoOiAnd2lkdGgnXG4gIH07XG5cbiAgdmFyIGFuaW1hdGluZyA9IG5ldyBNYXAoKTtcblxuICBmdW5jdGlvbiBvYmooa2V5LCB2YWx1ZSkge1xuICAgIHZhciBvYmogPSB7fTtcbiAgICBvYmpba2V5XSA9IHZhbHVlO1xuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICAvKipcbiAgICogU2xpZGUgZG93biBhbmQgdXAsIGxlZnQgYW5kIHJpZ2h0XG4gICAqL1xuICBPYmplY3Qua2V5cyhzbGlkZXMpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBwcm9wZXJ0eSA9IHNsaWRlc1tuYW1lXTtcblxuICAgIGZyYWdtZW50cy5yZWdpc3RlckFuaW1hdGlvbihuYW1lLCB7XG4gICAgICBvcHRpb25zOiB7XG4gICAgICAgIGR1cmF0aW9uOiAzMDAsXG4gICAgICAgIGVhc2luZzogJ2Vhc2UtaW4tb3V0J1xuICAgICAgfSxcbiAgICAgIGFuaW1hdGVJbjogZnVuY3Rpb24oZWxlbWVudCwgZG9uZSkge1xuICAgICAgICB2YXIgdmFsdWUgPSBlbGVtZW50LmdldENvbXB1dGVkQ1NTKHByb3BlcnR5KTtcbiAgICAgICAgaWYgKCF2YWx1ZSB8fCB2YWx1ZSA9PT0gJzBweCcpIHtcbiAgICAgICAgICByZXR1cm4gZG9uZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZWxlbWVudC5zdHlsZS5vdmVyZmxvdyA9ICdoaWRkZW4nO1xuICAgICAgICBlbGVtZW50LmFuaW1hdGUoW1xuICAgICAgICAgIG9iaihwcm9wZXJ0eSwgJzBweCcpLFxuICAgICAgICAgIG9iaihwcm9wZXJ0eSwgdmFsdWUpXG4gICAgICAgIF0sIHRoaXMub3B0aW9ucykub25maW5pc2ggPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBlbGVtZW50LnN0eWxlLm92ZXJmbG93ID0gJyc7XG4gICAgICAgICAgZG9uZSgpO1xuICAgICAgICB9O1xuICAgICAgfSxcbiAgICAgIGFuaW1hdGVPdXQ6IGZ1bmN0aW9uKGVsZW1lbnQsIGRvbmUpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gZWxlbWVudC5nZXRDb21wdXRlZENTUyhwcm9wZXJ0eSk7XG4gICAgICAgIGlmICghdmFsdWUgfHwgdmFsdWUgPT09ICcwcHgnKSB7XG4gICAgICAgICAgcmV0dXJuIGRvbmUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGVsZW1lbnQuc3R5bGUub3ZlcmZsb3cgPSAnaGlkZGVuJztcbiAgICAgICAgZWxlbWVudC5hbmltYXRlKFtcbiAgICAgICAgICBvYmoocHJvcGVydHksIHZhbHVlKSxcbiAgICAgICAgICBvYmoocHJvcGVydHksICcwcHgnKVxuICAgICAgICBdLCB0aGlzLm9wdGlvbnMpLm9uZmluaXNoID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgZWxlbWVudC5zdHlsZS5vdmVyZmxvdyA9ICcnO1xuICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9KTtcblxuXG4gICAgLyoqXG4gICAgICogTW92ZSBpdGVtcyB1cCBhbmQgZG93biBpbiBhIGxpc3QsIHNsaWRlIGRvd24gYW5kIHVwXG4gICAgICovXG4gICAgZnJhZ21lbnRzLnJlZ2lzdGVyQW5pbWF0aW9uKG5hbWUgKyAnLW1vdmUnLCB7XG4gICAgICBvcHRpb25zOiB7XG4gICAgICAgIGR1cmF0aW9uOiAzMDAsXG4gICAgICAgIGVhc2luZzogJ2Vhc2UtaW4tb3V0J1xuICAgICAgfSxcblxuICAgICAgYW5pbWF0ZUluOiBmdW5jdGlvbihlbGVtZW50LCBkb25lKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGVsZW1lbnQuZ2V0Q29tcHV0ZWRDU1MocHJvcGVydHkpO1xuICAgICAgICBpZiAoIXZhbHVlIHx8IHZhbHVlID09PSAnMHB4Jykge1xuICAgICAgICAgIHJldHVybiBkb25lKCk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgaXRlbSA9IGVsZW1lbnQudmlldyAmJiBlbGVtZW50LnZpZXcuX3JlcGVhdEl0ZW1fO1xuICAgICAgICBpZiAoaXRlbSkge1xuICAgICAgICAgIGFuaW1hdGluZy5zZXQoaXRlbSwgZWxlbWVudCk7XG4gICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGFuaW1hdGluZy5kZWxldGUoaXRlbSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEbyB0aGUgc2xpZGVcbiAgICAgICAgZWxlbWVudC5zdHlsZS5vdmVyZmxvdyA9ICdoaWRkZW4nO1xuICAgICAgICBlbGVtZW50LmFuaW1hdGUoW1xuICAgICAgICAgIG9iaihwcm9wZXJ0eSwgJzBweCcpLFxuICAgICAgICAgIG9iaihwcm9wZXJ0eSwgdmFsdWUpXG4gICAgICAgIF0sIHRoaXMub3B0aW9ucykub25maW5pc2ggPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBlbGVtZW50LnN0eWxlLm92ZXJmbG93ID0gJyc7XG4gICAgICAgICAgZG9uZSgpO1xuICAgICAgICB9O1xuICAgICAgfSxcblxuICAgICAgYW5pbWF0ZU91dDogZnVuY3Rpb24oZWxlbWVudCwgZG9uZSkge1xuICAgICAgICB2YXIgdmFsdWUgPSBlbGVtZW50LmdldENvbXB1dGVkQ1NTKHByb3BlcnR5KTtcbiAgICAgICAgaWYgKCF2YWx1ZSB8fCB2YWx1ZSA9PT0gJzBweCcpIHtcbiAgICAgICAgICByZXR1cm4gZG9uZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGl0ZW0gPSBlbGVtZW50LnZpZXcgJiYgZWxlbWVudC52aWV3Ll9yZXBlYXRJdGVtXztcbiAgICAgICAgaWYgKGl0ZW0pIHtcbiAgICAgICAgICB2YXIgbmV3RWxlbWVudCA9IGFuaW1hdGluZy5nZXQoaXRlbSk7XG4gICAgICAgICAgaWYgKG5ld0VsZW1lbnQgJiYgbmV3RWxlbWVudC5wYXJlbnROb2RlID09PSBlbGVtZW50LnBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgIC8vIFRoaXMgaXRlbSBpcyBiZWluZyByZW1vdmVkIGluIG9uZSBwbGFjZSBhbmQgYWRkZWQgaW50byBhbm90aGVyLiBNYWtlIGl0IGxvb2sgbGlrZSBpdHMgbW92aW5nIGJ5IG1ha2luZyBib3RoXG4gICAgICAgICAgICAvLyBlbGVtZW50cyBub3QgdmlzaWJsZSBhbmQgaGF2aW5nIGEgY2xvbmUgbW92ZSBhYm92ZSB0aGUgaXRlbXMgdG8gdGhlIG5ldyBsb2NhdGlvbi5cbiAgICAgICAgICAgIGVsZW1lbnQgPSB0aGlzLmFuaW1hdGVNb3ZlKGVsZW1lbnQsIG5ld0VsZW1lbnQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERvIHRoZSBzbGlkZVxuICAgICAgICBlbGVtZW50LnN0eWxlLm92ZXJmbG93ID0gJ2hpZGRlbic7XG4gICAgICAgIGVsZW1lbnQuYW5pbWF0ZShbXG4gICAgICAgICAgb2JqKHByb3BlcnR5LCB2YWx1ZSksXG4gICAgICAgICAgb2JqKHByb3BlcnR5LCAnMHB4JylcbiAgICAgICAgXSwgdGhpcy5vcHRpb25zKS5vbmZpbmlzaCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGVsZW1lbnQuc3R5bGUub3ZlcmZsb3cgPSAnJztcbiAgICAgICAgICBkb25lKCk7XG4gICAgICAgIH07XG4gICAgICB9LFxuXG4gICAgICBhbmltYXRlTW92ZTogZnVuY3Rpb24ob2xkRWxlbWVudCwgbmV3RWxlbWVudCkge1xuICAgICAgICB2YXIgcGxhY2Vob2xkZXJFbGVtZW50O1xuICAgICAgICB2YXIgcGFyZW50ID0gbmV3RWxlbWVudC5wYXJlbnROb2RlO1xuICAgICAgICBpZiAoIXBhcmVudC5fX3NsaWRlTW92ZUhhbmRsZWQpIHtcbiAgICAgICAgICBwYXJlbnQuX19zbGlkZU1vdmVIYW5kbGVkID0gdHJ1ZTtcbiAgICAgICAgICBpZiAod2luZG93LmdldENvbXB1dGVkU3R5bGUocGFyZW50KS5wb3NpdGlvbiA9PT0gJ3N0YXRpYycpIHtcbiAgICAgICAgICAgIHBhcmVudC5zdHlsZS5wb3NpdGlvbiA9ICdyZWxhdGl2ZSc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG9yaWdTdHlsZSA9IG9sZEVsZW1lbnQuZ2V0QXR0cmlidXRlKCdzdHlsZScpO1xuICAgICAgICB2YXIgc3R5bGUgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShvbGRFbGVtZW50KTtcbiAgICAgICAgdmFyIG1hcmdpbk9mZnNldExlZnQgPSAtcGFyc2VJbnQoc3R5bGUubWFyZ2luTGVmdCk7XG4gICAgICAgIHZhciBtYXJnaW5PZmZzZXRUb3AgPSAtcGFyc2VJbnQoc3R5bGUubWFyZ2luVG9wKTtcbiAgICAgICAgdmFyIG9sZExlZnQgPSBvbGRFbGVtZW50Lm9mZnNldExlZnQ7XG4gICAgICAgIHZhciBvbGRUb3AgPSBvbGRFbGVtZW50Lm9mZnNldFRvcDtcblxuICAgICAgICBwbGFjZWhvbGRlckVsZW1lbnQgPSBmcmFnbWVudHMubWFrZUVsZW1lbnRBbmltYXRhYmxlKG9sZEVsZW1lbnQuY2xvbmVOb2RlKHRydWUpKTtcbiAgICAgICAgcGxhY2Vob2xkZXJFbGVtZW50LnN0eWxlLndpZHRoID0gb2xkRWxlbWVudC5zdHlsZS53aWR0aCA9IHN0eWxlLndpZHRoO1xuICAgICAgICBwbGFjZWhvbGRlckVsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gb2xkRWxlbWVudC5zdHlsZS5oZWlnaHQgPSBzdHlsZS5oZWlnaHQ7XG4gICAgICAgIHBsYWNlaG9sZGVyRWxlbWVudC5zdHlsZS5vcGFjaXR5ID0gJzAnO1xuXG4gICAgICAgIG9sZEVsZW1lbnQuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuICAgICAgICBvbGRFbGVtZW50LnN0eWxlLnpJbmRleCA9IDEwMDA7XG4gICAgICAgIHBhcmVudC5pbnNlcnRCZWZvcmUocGxhY2Vob2xkZXJFbGVtZW50LCBvbGRFbGVtZW50KTtcbiAgICAgICAgbmV3RWxlbWVudC5zdHlsZS5vcGFjaXR5ID0gJzAnO1xuXG4gICAgICAgIG9sZEVsZW1lbnQuYW5pbWF0ZShbXG4gICAgICAgICAgeyB0b3A6IG9sZFRvcCArIG1hcmdpbk9mZnNldFRvcCArICdweCcsIGxlZnQ6IG9sZExlZnQgKyBtYXJnaW5PZmZzZXRMZWZ0ICsgJ3B4JyB9LFxuICAgICAgICAgIHsgdG9wOiBuZXdFbGVtZW50Lm9mZnNldFRvcCArIG1hcmdpbk9mZnNldFRvcCArICdweCcsIGxlZnQ6IG5ld0VsZW1lbnQub2Zmc2V0TGVmdCArIG1hcmdpbk9mZnNldExlZnQgKyAncHgnIH1cbiAgICAgICAgXSwgdGhpcy5vcHRpb25zKS5vbmZpbmlzaCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHBsYWNlaG9sZGVyRWxlbWVudC5yZW1vdmUoKTtcbiAgICAgICAgICBvcmlnU3R5bGUgPyBvbGRFbGVtZW50LnNldEF0dHJpYnV0ZSgnc3R5bGUnLCBvcmlnU3R5bGUpIDogb2xkRWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUoJ3N0eWxlJyk7XG4gICAgICAgICAgbmV3RWxlbWVudC5zdHlsZS5vcGFjaXR5ID0gJyc7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIHBsYWNlaG9sZGVyRWxlbWVudDtcbiAgICAgIH1cbiAgICB9KTtcblxuICB9KTtcblxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSByZWdpc3RlckRlZmF1bHRzO1xudmFyIGRpZmYgPSByZXF1aXJlKCcuLi9vYnNlcnZlci9kaWZmJyk7XG5cbi8qKlxuICogIyBEZWZhdWx0IEJpbmRlcnNcbiAqIFJlZ2lzdGVycyBkZWZhdWx0IGJpbmRlcnMgd2l0aCBhIGZyYWdtZW50cyBvYmplY3QuXG4gKi9cbmZ1bmN0aW9uIHJlZ2lzdGVyRGVmYXVsdHMoZnJhZ21lbnRzKSB7XG5cbiAgLyoqXG4gICAqIFByaW50cyBvdXQgdGhlIHZhbHVlIG9mIHRoZSBleHByZXNzaW9uIHRvIHRoZSBjb25zb2xlLlxuICAgKi9cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdkZWJ1ZycsIHtcbiAgICBwcmlvcml0eTogNjAsXG4gICAgdXBkYXRlZDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGNvbnNvbGUuaW5mbygnRGVidWc6JywgdGhpcy5leHByZXNzaW9uLCAnPScsIHZhbHVlKTtcbiAgICB9XG4gIH0pO1xuXG5cbiAgLyoqXG4gICAqICMjIHRleHRcbiAgICogQWRkcyBhIGJpbmRlciB0byBkaXNwbGF5IGVzY2FwZWQgdGV4dCBpbnNpZGUgYW4gZWxlbWVudC4gVGhpcyBjYW4gYmUgZG9uZSB3aXRoIGJpbmRpbmcgZGlyZWN0bHkgaW4gdGV4dCBub2RlcyBidXRcbiAgICogdXNpbmcgdGhlIGF0dHJpYnV0ZSBiaW5kZXIgcHJldmVudHMgYSBmbGFzaCBvZiB1bnN0eWxlZCBjb250ZW50IG9uIHRoZSBtYWluIHBhZ2UuXG4gICAqXG4gICAqICoqRXhhbXBsZToqKlxuICAgKiBgYGBodG1sXG4gICAqIDxoMSB0ZXh0PVwie3twb3N0LnRpdGxlfX1cIj5VbnRpdGxlZDwvaDE+XG4gICAqIDxkaXYgaHRtbD1cInt7cG9zdC5ib2R5IHwgbWFya2Rvd259fVwiPjwvZGl2PlxuICAgKiBgYGBcbiAgICogKlJlc3VsdDoqXG4gICAqIGBgYGh0bWxcbiAgICogPGgxPkxpdHRsZSBSZWQ8L2gxPlxuICAgKiA8ZGl2PlxuICAgKiAgIDxwPkxpdHRsZSBSZWQgUmlkaW5nIEhvb2QgaXMgYSBzdG9yeSBhYm91dCBhIGxpdHRsZSBnaXJsLjwvcD5cbiAgICogICA8cD5cbiAgICogICAgIE1vcmUgaW5mbyBjYW4gYmUgZm91bmQgb25cbiAgICogICAgIDxhIGhyZWY9XCJodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0xpdHRsZV9SZWRfUmlkaW5nX0hvb2RcIj5XaWtpcGVkaWE8L2E+XG4gICAqICAgPC9wPlxuICAgKiA8L2Rpdj5cbiAgICogYGBgXG4gICAqL1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ3RleHQnLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHRoaXMuZWxlbWVudC50ZXh0Q29udGVudCA9ICh2YWx1ZSA9PSBudWxsID8gJycgOiB2YWx1ZSk7XG4gIH0pO1xuXG5cbiAgLyoqXG4gICAqICMjIGh0bWxcbiAgICogQWRkcyBhIGJpbmRlciB0byBkaXNwbGF5IHVuZXNjYXBlZCBIVE1MIGluc2lkZSBhbiBlbGVtZW50LiBCZSBzdXJlIGl0J3MgdHJ1c3RlZCEgVGhpcyBzaG91bGQgYmUgdXNlZCB3aXRoIGZpbHRlcnNcbiAgICogd2hpY2ggY3JlYXRlIEhUTUwgZnJvbSBzb21ldGhpbmcgc2FmZS5cbiAgICpcbiAgICogKipFeGFtcGxlOioqXG4gICAqIGBgYGh0bWxcbiAgICogPGgxPnt7cG9zdC50aXRsZX19PC9oMT5cbiAgICogPGRpdiBodG1sPVwie3twb3N0LmJvZHkgfCBtYXJrZG93bn19XCI+PC9kaXY+XG4gICAqIGBgYFxuICAgKiAqUmVzdWx0OipcbiAgICogYGBgaHRtbFxuICAgKiA8aDE+TGl0dGxlIFJlZDwvaDE+XG4gICAqIDxkaXY+XG4gICAqICAgPHA+TGl0dGxlIFJlZCBSaWRpbmcgSG9vZCBpcyBhIHN0b3J5IGFib3V0IGEgbGl0dGxlIGdpcmwuPC9wPlxuICAgKiAgIDxwPlxuICAgKiAgICAgTW9yZSBpbmZvIGNhbiBiZSBmb3VuZCBvblxuICAgKiAgICAgPGEgaHJlZj1cImh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvTGl0dGxlX1JlZF9SaWRpbmdfSG9vZFwiPldpa2lwZWRpYTwvYT5cbiAgICogICA8L3A+XG4gICAqIDwvZGl2PlxuICAgKiBgYGBcbiAgICovXG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnaHRtbCcsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgdGhpcy5lbGVtZW50LmlubmVySFRNTCA9ICh2YWx1ZSA9PSBudWxsID8gJycgOiB2YWx1ZSk7XG4gIH0pO1xuXG5cblxuICAvKipcbiAgICogIyMgY2xhc3MtW2NsYXNzTmFtZV1cbiAgICogQWRkcyBhIGJpbmRlciB0byBhZGQgY2xhc3NlcyB0byBhbiBlbGVtZW50IGRlcGVuZGVudCBvbiB3aGV0aGVyIHRoZSBleHByZXNzaW9uIGlzIHRydWUgb3IgZmFsc2UuXG4gICAqXG4gICAqICoqRXhhbXBsZToqKlxuICAgKiBgYGBodG1sXG4gICAqIDxkaXYgY2xhc3M9XCJ1c2VyLWl0ZW1cIiBjbGFzcy1zZWxlY3RlZC11c2VyPVwie3tzZWxlY3RlZCA9PT0gdXNlcn19XCI+XG4gICAqICAgPGJ1dHRvbiBjbGFzcz1cImJ0biBwcmltYXJ5XCIgY2xhc3MtaGlnaGxpZ2h0PVwie3tyZWFkeX19XCI+PC9idXR0b24+XG4gICAqIDwvZGl2PlxuICAgKiBgYGBcbiAgICogKlJlc3VsdCBpZiBgc2VsZWN0ZWRgIGVxdWFscyB0aGUgYHVzZXJgIGFuZCBgcmVhZHlgIGlzIGB0cnVlYDoqXG4gICAqIGBgYGh0bWxcbiAgICogPGRpdiBjbGFzcz1cInVzZXItaXRlbSBzZWxlY3RlZC11c2VyXCI+XG4gICAqICAgPGJ1dHRvbiBjbGFzcz1cImJ0biBwcmltYXJ5IGhpZ2hsaWdodFwiPjwvYnV0dG9uPlxuICAgKiA8L2Rpdj5cbiAgICogYGBgXG4gICAqL1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ2NsYXNzLSonLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSkge1xuICAgICAgdGhpcy5lbGVtZW50LmNsYXNzTGlzdC5hZGQodGhpcy5tYXRjaCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKHRoaXMubWF0Y2gpO1xuICAgIH1cbiAgfSk7XG5cblxuICAvKipcbiAgICogQXV0b21hdGljYWxseSBmb2N1c2VzIHRoZSBpbnB1dCB3aGVuIGl0IGlzIGRpc3BsYXllZCBvbiBzY3JlZW4uXG4gICAqL1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ2F1dG9mb2N1cycsIHtcbiAgICBib3VuZDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZWxlbWVudCA9IHRoaXMuZWxlbWVudDtcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIGVsZW1lbnQuZm9jdXMoKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG5cblxuICAvKipcbiAgICogQXV0b21hdGljYWxseSBzZWxlY3RzIHRoZSBjb250ZW50cyBvZiBhbiBpbnB1dCB3aGVuIGl0IHJlY2VpdmVzIGZvY3VzLlxuICAgKi9cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdhdXRvc2VsZWN0Jywge1xuICAgIGNyZWF0ZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGZvY3VzZWQsIG1vdXNlRXZlbnQ7XG5cbiAgICAgIHRoaXMuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gVXNlIG1hdGNoZXMgc2luY2UgZG9jdW1lbnQuYWN0aXZlRWxlbWVudCBkb2Vzbid0IHdvcmsgd2VsbCB3aXRoIHdlYiBjb21wb25lbnRzIChmdXR1cmUgY29tcGF0KVxuICAgICAgICBmb2N1c2VkID0gdGhpcy5tYXRjaGVzKCc6Zm9jdXMnKTtcbiAgICAgICAgbW91c2VFdmVudCA9IHRydWU7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2ZvY3VzJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICghbW91c2VFdmVudCkge1xuICAgICAgICAgIHRoaXMuc2VsZWN0KCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoIWZvY3VzZWQpIHtcbiAgICAgICAgICB0aGlzLnNlbGVjdCgpO1xuICAgICAgICB9XG4gICAgICAgIG1vdXNlRXZlbnQgPSBmYWxzZTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG5cblxuXG4gIC8qKlxuICAgKiAjIyB2YWx1ZVxuICAgKiBBZGRzIGEgYmluZGVyIHdoaWNoIHNldHMgdGhlIHZhbHVlIG9mIGFuIEhUTUwgZm9ybSBlbGVtZW50LiBUaGlzIGJpbmRlciBhbHNvIHVwZGF0ZXMgdGhlIGRhdGEgYXMgaXQgaXMgY2hhbmdlZCBpblxuICAgKiB0aGUgZm9ybSBlbGVtZW50LCBwcm92aWRpbmcgdHdvIHdheSBiaW5kaW5nLlxuICAgKlxuICAgKiAqKkV4YW1wbGU6KipcbiAgICogYGBgaHRtbFxuICAgKiA8bGFiZWw+Rmlyc3QgTmFtZTwvbGFiZWw+XG4gICAqIDxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCJmaXJzdE5hbWVcIiB2YWx1ZT1cInVzZXIuZmlyc3ROYW1lXCI+XG4gICAqXG4gICAqIDxsYWJlbD5MYXN0IE5hbWU8L2xhYmVsPlxuICAgKiA8aW5wdXQgdHlwZT1cInRleHRcIiBuYW1lPVwibGFzdE5hbWVcIiB2YWx1ZT1cInVzZXIubGFzdE5hbWVcIj5cbiAgICogYGBgXG4gICAqICpSZXN1bHQ6KlxuICAgKiBgYGBodG1sXG4gICAqIDxsYWJlbD5GaXJzdCBOYW1lPC9sYWJlbD5cbiAgICogPGlucHV0IHR5cGU9XCJ0ZXh0XCIgbmFtZT1cImZpcnN0TmFtZVwiIHZhbHVlPVwiSmFjb2JcIj5cbiAgICpcbiAgICogPGxhYmVsPkxhc3QgTmFtZTwvbGFiZWw+XG4gICAqIDxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCJsYXN0TmFtZVwiIHZhbHVlPVwiV3JpZ2h0XCI+XG4gICAqIGBgYFxuICAgKiBBbmQgd2hlbiB0aGUgdXNlciBjaGFuZ2VzIHRoZSB0ZXh0IGluIHRoZSBmaXJzdCBpbnB1dCB0byBcIkphY1wiLCBgdXNlci5maXJzdE5hbWVgIHdpbGwgYmUgdXBkYXRlZCBpbW1lZGlhdGVseSB3aXRoXG4gICAqIHRoZSB2YWx1ZSBvZiBgJ0phYydgLlxuICAgKi9cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCd2YWx1ZScsIHtcbiAgICBvbmx5V2hlbkJvdW5kOiB0cnVlLFxuICAgIGV2ZW50c0F0dHJOYW1lOiAndmFsdWUtZXZlbnRzJyxcbiAgICBmaWVsZEF0dHJOYW1lOiAndmFsdWUtZmllbGQnLFxuICAgIGRlZmF1bHRFdmVudHM6IFsgJ2NoYW5nZScgXSxcblxuICAgIGNvbXBpbGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBuYW1lID0gdGhpcy5lbGVtZW50LnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgIHZhciB0eXBlID0gdGhpcy5lbGVtZW50LnR5cGU7XG4gICAgICB0aGlzLm1ldGhvZHMgPSBpbnB1dE1ldGhvZHNbdHlwZV0gfHwgaW5wdXRNZXRob2RzW25hbWVdO1xuXG4gICAgICBpZiAoIXRoaXMubWV0aG9kcykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLmVsZW1lbnQuaGFzQXR0cmlidXRlKHRoaXMuZXZlbnRzQXR0ck5hbWUpKSB7XG4gICAgICAgIHRoaXMuZXZlbnRzID0gdGhpcy5lbGVtZW50LmdldEF0dHJpYnV0ZSh0aGlzLmV2ZW50c0F0dHJOYW1lKS5zcGxpdCgnICcpO1xuICAgICAgICB0aGlzLmVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKHRoaXMuZXZlbnRzQXR0ck5hbWUpO1xuICAgICAgfSBlbHNlIGlmIChuYW1lICE9PSAnb3B0aW9uJykge1xuICAgICAgICB0aGlzLmV2ZW50cyA9IHRoaXMuZGVmYXVsdEV2ZW50cztcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuZWxlbWVudC5oYXNBdHRyaWJ1dGUodGhpcy5maWVsZEF0dHJOYW1lKSkge1xuICAgICAgICB0aGlzLnZhbHVlRmllbGQgPSB0aGlzLmVsZW1lbnQuZ2V0QXR0cmlidXRlKHRoaXMuZmllbGRBdHRyTmFtZSk7XG4gICAgICAgIHRoaXMuZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUodGhpcy5maWVsZEF0dHJOYW1lKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGUgPT09ICdvcHRpb24nKSB7XG4gICAgICAgIHRoaXMudmFsdWVGaWVsZCA9IHRoaXMuZWxlbWVudC5wYXJlbnROb2RlLnZhbHVlRmllbGQ7XG4gICAgICB9XG4gICAgfSxcblxuICAgIGNyZWF0ZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCF0aGlzLmV2ZW50cykgcmV0dXJuOyAvLyBub3RoaW5nIGZvciA8b3B0aW9uPiBoZXJlXG4gICAgICB2YXIgZWxlbWVudCA9IHRoaXMuZWxlbWVudDtcbiAgICAgIHZhciBvYnNlcnZlciA9IHRoaXMub2JzZXJ2ZXI7XG4gICAgICB2YXIgaW5wdXQgPSB0aGlzLm1ldGhvZHM7XG4gICAgICB2YXIgdmFsdWVGaWVsZCA9IHRoaXMudmFsdWVGaWVsZDtcblxuICAgICAgLy8gVGhlIDItd2F5IGJpbmRpbmcgcGFydCBpcyBzZXR0aW5nIHZhbHVlcyBvbiBjZXJ0YWluIGV2ZW50c1xuICAgICAgZnVuY3Rpb24gb25DaGFuZ2UoKSB7XG4gICAgICAgIGlmIChpbnB1dC5nZXQuY2FsbChlbGVtZW50LCB2YWx1ZUZpZWxkKSAhPT0gb2JzZXJ2ZXIub2xkVmFsdWUgJiYgIWVsZW1lbnQucmVhZE9ubHkpIHtcbiAgICAgICAgICBvYnNlcnZlci5zZXQoaW5wdXQuZ2V0LmNhbGwoZWxlbWVudCwgdmFsdWVGaWVsZCkpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChlbGVtZW50LnR5cGUgPT09ICd0ZXh0Jykge1xuICAgICAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgIGlmIChldmVudC5rZXlDb2RlID09PSAxMykgb25DaGFuZ2UoKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuZXZlbnRzLmZvckVhY2goZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBvbkNoYW5nZSk7XG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgdXBkYXRlZDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGlmICh0aGlzLm1ldGhvZHMuZ2V0LmNhbGwodGhpcy5lbGVtZW50LCB0aGlzLnZhbHVlRmllbGQpICE9IHZhbHVlKSB7XG4gICAgICAgIHRoaXMubWV0aG9kcy5zZXQuY2FsbCh0aGlzLmVsZW1lbnQsIHZhbHVlLCB0aGlzLnZhbHVlRmllbGQpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgLyoqXG4gICAqIEhhbmRsZSB0aGUgZGlmZmVyZW50IGZvcm0gdHlwZXNcbiAgICovXG4gIHZhciBkZWZhdWx0SW5wdXRNZXRob2QgPSB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMudmFsdWU7IH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyB0aGlzLnZhbHVlID0gKHZhbHVlID09IG51bGwpID8gJycgOiB2YWx1ZTsgfVxuICB9O1xuXG4gIHZhciBpbnB1dE1ldGhvZHMgPSB7XG4gICAgY2hlY2tib3g6IHtcbiAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmNoZWNrZWQ7IH0sXG4gICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IHRoaXMuY2hlY2tlZCA9ICEhdmFsdWU7IH1cbiAgICB9LFxuXG4gICAgZmlsZToge1xuICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuZmlsZXMgJiYgdGhpcy5maWxlc1swXTsgfSxcbiAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHt9XG4gICAgfSxcblxuICAgIHNlbGVjdDoge1xuICAgICAgZ2V0OiBmdW5jdGlvbih2YWx1ZUZpZWxkKSB7XG4gICAgICAgIGlmICh2YWx1ZUZpZWxkKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMub3B0aW9uc1t0aGlzLnNlbGVjdGVkSW5kZXhdLnZhbHVlT2JqZWN0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiB0aGlzLnZhbHVlO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSwgdmFsdWVGaWVsZCkge1xuICAgICAgICBpZiAodmFsdWUgJiYgdmFsdWVGaWVsZCkge1xuICAgICAgICAgIHRoaXMudmFsdWVPYmplY3QgPSB2YWx1ZTtcbiAgICAgICAgICB0aGlzLnZhbHVlID0gdmFsdWVbdmFsdWVGaWVsZF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy52YWx1ZSA9ICh2YWx1ZSA9PSBudWxsKSA/ICcnIDogdmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuXG4gICAgb3B0aW9uOiB7XG4gICAgICBnZXQ6IGZ1bmN0aW9uKHZhbHVlRmllbGQpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlRmllbGQgPyB0aGlzLnZhbHVlT2JqZWN0W3ZhbHVlRmllbGRdIDogdGhpcy52YWx1ZTtcbiAgICAgIH0sXG4gICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlLCB2YWx1ZUZpZWxkKSB7XG4gICAgICAgIGlmICh2YWx1ZSAmJiB2YWx1ZUZpZWxkKSB7XG4gICAgICAgICAgdGhpcy52YWx1ZU9iamVjdCA9IHZhbHVlO1xuICAgICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZVt2YWx1ZUZpZWxkXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnZhbHVlID0gKHZhbHVlID09IG51bGwpID8gJycgOiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG5cbiAgICBpbnB1dDogZGVmYXVsdElucHV0TWV0aG9kLFxuXG4gICAgdGV4dGFyZWE6IGRlZmF1bHRJbnB1dE1ldGhvZFxuICB9O1xuXG5cbiAgLyoqXG4gICAqICMjIG9uLVtldmVudF1cbiAgICogQWRkcyBhIGJpbmRlciBmb3IgZWFjaCBldmVudCBuYW1lIGluIHRoZSBhcnJheS4gV2hlbiB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkIHRoZSBleHByZXNzaW9uIHdpbGwgYmUgcnVuLlxuICAgKlxuICAgKiAqKkV4YW1wbGUgRXZlbnRzOioqXG4gICAqXG4gICAqICogb24tY2xpY2tcbiAgICogKiBvbi1kYmxjbGlja1xuICAgKiAqIG9uLXN1Ym1pdFxuICAgKiAqIG9uLWNoYW5nZVxuICAgKiAqIG9uLWZvY3VzXG4gICAqICogb24tYmx1clxuICAgKlxuICAgKiAqKkV4YW1wbGU6KipcbiAgICogYGBgaHRtbFxuICAgKiA8Zm9ybSBvbi1zdWJtaXQ9XCJ7e3NhdmVVc2VyKCl9fVwiPlxuICAgKiAgIDxpbnB1dCBuYW1lPVwiZmlyc3ROYW1lXCIgdmFsdWU9XCJKYWNvYlwiPlxuICAgKiAgIDxidXR0b24+U2F2ZTwvYnV0dG9uPlxuICAgKiA8L2Zvcm0+XG4gICAqIGBgYFxuICAgKiAqUmVzdWx0IChldmVudHMgZG9uJ3QgYWZmZWN0IHRoZSBIVE1MKToqXG4gICAqIGBgYGh0bWxcbiAgICogPGZvcm0+XG4gICAqICAgPGlucHV0IG5hbWU9XCJmaXJzdE5hbWVcIiB2YWx1ZT1cIkphY29iXCI+XG4gICAqICAgPGJ1dHRvbj5TYXZlPC9idXR0b24+XG4gICAqIDwvZm9ybT5cbiAgICogYGBgXG4gICAqL1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ29uLSonLCB7XG4gICAgY3JlYXRlZDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZXZlbnROYW1lID0gdGhpcy5tYXRjaDtcbiAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICB0aGlzLmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIGlmICghdGhpcy5oYXNBdHRyaWJ1dGUoJ2Rpc2FibGVkJykgJiYgX3RoaXMuY29udGV4dCkge1xuICAgICAgICAgIC8vIFNldCB0aGUgZXZlbnQgb24gdGhlIGNvbnRleHQgc28gaXQgbWF5IGJlIHVzZWQgaW4gdGhlIGV4cHJlc3Npb24gd2hlbiB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkLlxuICAgICAgICAgIHZhciBwcmlvckV2ZW50ID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihfdGhpcy5jb250ZXh0LCAnZXZlbnQnKTtcbiAgICAgICAgICB2YXIgcHJpb3JFbGVtZW50ID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihfdGhpcy5jb250ZXh0LCAnZWxlbWVudCcpO1xuICAgICAgICAgIF90aGlzLmNvbnRleHQuZXZlbnQgPSBldmVudDtcbiAgICAgICAgICBfdGhpcy5jb250ZXh0LmVsZW1lbnQgPSBfdGhpcy5lbGVtZW50O1xuXG4gICAgICAgICAgLy8gTGV0IGFuIG9uLVtldmVudF0gbWFrZSB0aGUgZnVuY3Rpb24gY2FsbCB3aXRoIGl0cyBvd24gYXJndW1lbnRzXG4gICAgICAgICAgdmFyIGxpc3RlbmVyID0gX3RoaXMub2JzZXJ2ZXIuZ2V0KCk7XG5cbiAgICAgICAgICAvLyBPciBqdXN0IHJldHVybiBhIGZ1bmN0aW9uIHdoaWNoIHdpbGwgYmUgY2FsbGVkIHdpdGggdGhlIGV2ZW50IG9iamVjdFxuICAgICAgICAgIGlmICh0eXBlb2YgbGlzdGVuZXIgPT09ICdmdW5jdGlvbicpIGxpc3RlbmVyLmNhbGwoX3RoaXMuY29udGV4dCwgZXZlbnQpO1xuXG4gICAgICAgICAgLy8gUmVzZXQgdGhlIGNvbnRleHQgdG8gaXRzIHByaW9yIHN0YXRlXG4gICAgICAgICAgaWYgKHByaW9yRXZlbnQpIHtcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShfdGhpcy5jb250ZXh0LCAnZXZlbnQnLCBwcmlvckV2ZW50KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZGVsZXRlIF90aGlzLmNvbnRleHQuZXZlbnQ7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHByaW9yRWxlbWVudCkge1xuICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KF90aGlzLmNvbnRleHQsICdlbGVtZW50JywgcHJpb3JFbGVtZW50KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZGVsZXRlIF90aGlzLmNvbnRleHQuZWxlbWVudDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG5cblxuICAvKipcbiAgICogIyMgb24tW2tleSBldmVudF1cbiAgICogQWRkcyBhIGJpbmRlciB3aGljaCBpcyB0cmlnZ2VyZWQgd2hlbiB0aGUga2V5ZG93biBldmVudCdzIGBrZXlDb2RlYCBwcm9wZXJ0eSBtYXRjaGVzLiBJZiB0aGUgbmFtZSBpbmNsdWRlcyBjdHJsXG4gICAqIHRoZW4gaXQgd2lsbCBvbmx5IGZpcmUgd2hlbiB0aGUga2V5IHBsdXMgdGhlIGN0cmxLZXkgb3IgbWV0YUtleSBpcyBwcmVzc2VkLlxuICAgKlxuICAgKiAqKktleSBFdmVudHM6KipcbiAgICpcbiAgICogKiBvbi1lbnRlclxuICAgKiAqIG9uLWN0cmwtZW50ZXJcbiAgICogKiBvbi1lc2NcbiAgICpcbiAgICogKipFeGFtcGxlOioqXG4gICAqIGBgYGh0bWxcbiAgICogPGlucHV0IG9uLWVudGVyPVwie3tzYXZlKCl9fVwiIG9uLWVzYz1cInt7Y2FuY2VsKCl9fVwiPlxuICAgKiBgYGBcbiAgICogKlJlc3VsdDoqXG4gICAqIGBgYGh0bWxcbiAgICogPGlucHV0PlxuICAgKiBgYGBcbiAgICovXG4gIHZhciBrZXlDb2RlcyA9IHsgZW50ZXI6IDEzLCBlc2M6IDI3LCAnY3RybC1lbnRlcic6IDEzIH07XG5cbiAgT2JqZWN0LmtleXMoa2V5Q29kZXMpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBrZXlDb2RlID0ga2V5Q29kZXNbbmFtZV07XG5cbiAgICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ29uLScgKyBuYW1lLCB7XG4gICAgICBjcmVhdGVkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHVzZUN0cmxLZXkgPSBuYW1lLmluZGV4T2YoJ2N0cmwtJykgPT09IDA7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIHRoaXMuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICBpZiAodXNlQ3RybEtleSAmJiAhKGV2ZW50LmN0cmxLZXkgfHwgZXZlbnQubWV0YUtleSkgfHwgIV90aGlzLmNvbnRleHQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoZXZlbnQua2V5Q29kZSAhPT0ga2V5Q29kZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICBpZiAoIXRoaXMuaGFzQXR0cmlidXRlKCdkaXNhYmxlZCcpKSB7XG4gICAgICAgICAgICAvLyBTZXQgdGhlIGV2ZW50IG9uIHRoZSBjb250ZXh0IHNvIGl0IG1heSBiZSB1c2VkIGluIHRoZSBleHByZXNzaW9uIHdoZW4gdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgICAgICAgIHZhciBwcmlvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IoX3RoaXMuY29udGV4dCwgJ2V2ZW50Jyk7XG4gICAgICAgICAgICBfdGhpcy5jb250ZXh0LmV2ZW50ID0gZXZlbnQ7XG5cbiAgICAgICAgICAgIC8vIExldCBhbiBvbi1bZXZlbnRdIG1ha2UgdGhlIGZ1bmN0aW9uIGNhbGwgd2l0aCBpdHMgb3duIGFyZ3VtZW50c1xuICAgICAgICAgICAgdmFyIGxpc3RlbmVyID0gX3RoaXMub2JzZXJ2ZXIuZ2V0KCk7XG5cbiAgICAgICAgICAgIC8vIE9yIGp1c3QgcmV0dXJuIGEgZnVuY3Rpb24gd2hpY2ggd2lsbCBiZSBjYWxsZWQgd2l0aCB0aGUgZXZlbnQgb2JqZWN0XG4gICAgICAgICAgICBpZiAodHlwZW9mIGxpc3RlbmVyID09PSAnZnVuY3Rpb24nKSBsaXN0ZW5lci5jYWxsKF90aGlzLmNvbnRleHQsIGV2ZW50KTtcblxuICAgICAgICAgICAgLy8gUmVzZXQgdGhlIGNvbnRleHQgdG8gaXRzIHByaW9yIHN0YXRlXG4gICAgICAgICAgICBpZiAocHJpb3IpIHtcbiAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KF90aGlzLmNvbnRleHQsIGV2ZW50LCBwcmlvcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBkZWxldGUgX3RoaXMuY29udGV4dC5ldmVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pXG4gIH0pO1xuXG5cbiAgLyoqXG4gICAqICMjIFthdHRyaWJ1dGVdJFxuICAgKiBBZGRzIGEgYmluZGVyIHRvIHNldCB0aGUgYXR0cmlidXRlIG9mIGVsZW1lbnQgdG8gdGhlIHZhbHVlIG9mIHRoZSBleHByZXNzaW9uLiBVc2UgdGhpcyB3aGVuIHlvdSBkb24ndCB3YW50IGFuXG4gICAqIGA8aW1nPmAgdG8gdHJ5IGFuZCBsb2FkIGl0cyBgc3JjYCBiZWZvcmUgYmVpbmcgZXZhbHVhdGVkLiBUaGlzIGlzIG9ubHkgbmVlZGVkIG9uIHRoZSBpbmRleC5odG1sIHBhZ2UgYXMgdGVtcGxhdGVcbiAgICogd2lsbCBiZSBwcm9jZXNzZWQgYmVmb3JlIGJlaW5nIGluc2VydGVkIGludG8gdGhlIERPTS4gR2VuZXJhbGx5IHlvdSBjYW4ganVzdCB1c2UgYGF0dHI9XCJ7e2V4cHJ9fVwiYC5cbiAgICpcbiAgICogKipFeGFtcGxlIEF0dHJpYnV0ZXM6KipcbiAgICpcbiAgICogKipFeGFtcGxlOioqXG4gICAqIGBgYGh0bWxcbiAgICogPGltZyBzcmMkPVwie3t1c2VyLmF2YXRhclVybH19XCI+XG4gICAqIGBgYFxuICAgKiAqUmVzdWx0OipcbiAgICogYGBgaHRtbFxuICAgKiA8aW1nIHNyYz1cImh0dHA6Ly9jZG4uZXhhbXBsZS5jb20vYXZhdGFycy9qYWN3cmlnaHQtc21hbGwucG5nXCI+XG4gICAqIGBgYFxuICAgKi9cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCcqJCcsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgdmFyIGF0dHJOYW1lID0gdGhpcy5tYXRjaDtcbiAgICBpZiAoIXZhbHVlKSB7XG4gICAgICB0aGlzLmVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKGF0dHJOYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZShhdHRyTmFtZSwgdmFsdWUpO1xuICAgIH1cbiAgfSk7XG5cblxuICAvKipcbiAgICogIyMgW2F0dHJpYnV0ZV0/XG4gICAqIEFkZHMgYSBiaW5kZXIgdG8gdG9nZ2xlIGFuIGF0dHJpYnV0ZSBvbiBvciBvZmYgaWYgdGhlIGV4cHJlc3Npb24gaXMgdHJ1dGh5IG9yIGZhbHNleS4gVXNlIGZvciBhdHRyaWJ1dGVzIHdpdGhvdXRcbiAgICogdmFsdWVzIHN1Y2ggYXMgYHNlbGVjdGVkYCwgYGRpc2FibGVkYCwgb3IgYHJlYWRvbmx5YC4gYGNoZWNrZWQ/YCB3aWxsIHVzZSAyLXdheSBkYXRhYmluZGluZy5cbiAgICpcbiAgICogKipFeGFtcGxlOioqXG4gICAqIGBgYGh0bWxcbiAgICogPGxhYmVsPklzIEFkbWluaXN0cmF0b3I8L2xhYmVsPlxuICAgKiA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgY2hlY2tlZD89XCJ7e3VzZXIuaXNBZG1pbn19XCI+XG4gICAqIDxidXR0b24gZGlzYWJsZWQ/PVwie3tpc1Byb2Nlc3Npbmd9fVwiPlN1Ym1pdDwvYnV0dG9uPlxuICAgKiBgYGBcbiAgICogKlJlc3VsdCBpZiBgaXNQcm9jZXNzaW5nYCBpcyBgdHJ1ZWAgYW5kIGB1c2VyLmlzQWRtaW5gIGlzIGZhbHNlOipcbiAgICogYGBgaHRtbFxuICAgKiA8bGFiZWw+SXMgQWRtaW5pc3RyYXRvcjwvbGFiZWw+XG4gICAqIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIj5cbiAgICogPGJ1dHRvbiBkaXNhYmxlZD5TdWJtaXQ8L2J1dHRvbj5cbiAgICogYGBgXG4gICAqL1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJyo/JywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICB2YXIgYXR0ck5hbWUgPSB0aGlzLm1hdGNoO1xuICAgIGlmICghdmFsdWUpIHtcbiAgICAgIHRoaXMuZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUoYXR0ck5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmVsZW1lbnQuc2V0QXR0cmlidXRlKGF0dHJOYW1lLCAnJyk7XG4gICAgfVxuICB9KTtcblxuXG4gIC8qKlxuICAgKiBBZGQgYSBjbG9uZSBvZiB0aGUgYHZhbHVlYCBiaW5kZXIgZm9yIGBjaGVja2VkP2Agc28gY2hlY2tib3hlcyBjYW4gaGF2ZSB0d28td2F5IGJpbmRpbmcgdXNpbmcgYGNoZWNrZWQ/YC5cbiAgICovXG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnY2hlY2tlZD8nLCBmcmFnbWVudHMuZ2V0QXR0cmlidXRlQmluZGVyKCd2YWx1ZScpKTtcblxuXG5cbiAgLyoqXG4gICAqICMjIGlmLCB1bmxlc3MsIGVsc2UtaWYsIGVsc2UtdW5sZXNzLCBlbHNlXG4gICAqIEFkZHMgYSBiaW5kZXIgdG8gc2hvdyBvciBoaWRlIHRoZSBlbGVtZW50IGlmIHRoZSB2YWx1ZSBpcyB0cnV0aHkgb3IgZmFsc2V5LiBBY3R1YWxseSByZW1vdmVzIHRoZSBlbGVtZW50IGZyb20gdGhlXG4gICAqIERPTSB3aGVuIGhpZGRlbiwgcmVwbGFjaW5nIGl0IHdpdGggYSBub24tdmlzaWJsZSBwbGFjZWhvbGRlciBhbmQgbm90IG5lZWRsZXNzbHkgZXhlY3V0aW5nIGJpbmRpbmdzIGluc2lkZS5cbiAgICpcbiAgICogKipFeGFtcGxlOioqXG4gICAqIGBgYGh0bWxcbiAgICogPHVsIGNsYXNzPVwiaGVhZGVyLWxpbmtzXCI+XG4gICAqICAgPGxpIGlmPVwidXNlclwiPjxhIGhyZWY9XCIvYWNjb3VudFwiPk15IEFjY291bnQ8L2E+PC9saT5cbiAgICogICA8bGkgdW5sZXNzPVwidXNlclwiPjxhIGhyZWY9XCIvbG9naW5cIj5TaWduIEluPC9hPjwvbGk+XG4gICAqICAgPGxpIGVsc2U+PGEgaHJlZj1cIi9sb2dvdXRcIj5TaWduIE91dDwvYT48L2xpPlxuICAgKiA8L3VsPlxuICAgKiBgYGBcbiAgICogKlJlc3VsdCBpZiBgdXNlcmAgaXMgbnVsbDoqXG4gICAqIGBgYGh0bWxcbiAgICogPHVsIGNsYXNzPVwiaGVhZGVyLWxpbmtzXCI+XG4gICAqICAgPGxpPjxhIGhyZWY9XCIvbG9naW5cIj5TaWduIEluPC9hPjwvbGk+XG4gICAqIDwvdWw+XG4gICAqIGBgYFxuICAgKi9cbiAgdmFyIElmQmluZGluZyA9IGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnaWYnLCB7XG4gICAgYW5pbWF0ZWQ6IHRydWUsXG4gICAgcHJpb3JpdHk6IDUwLFxuICAgIHVubGVzc0F0dHJOYW1lOiAndW5sZXNzJyxcbiAgICBlbHNlSWZBdHRyTmFtZTogJ2Vsc2UtaWYnLFxuICAgIGVsc2VVbmxlc3NBdHRyTmFtZTogJ2Vsc2UtdW5sZXNzJyxcbiAgICBlbHNlQXR0ck5hbWU6ICdlbHNlJyxcblxuICAgIGNvbXBpbGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBlbGVtZW50ID0gdGhpcy5lbGVtZW50O1xuICAgICAgdmFyIGV4cHJlc3Npb25zID0gWyB3cmFwSWZFeHAodGhpcy5leHByZXNzaW9uLCB0aGlzLm5hbWUgPT09IHRoaXMudW5sZXNzQXR0ck5hbWUpIF07XG4gICAgICB2YXIgcGxhY2Vob2xkZXIgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgICB2YXIgbm9kZSA9IGVsZW1lbnQubmV4dEVsZW1lbnRTaWJsaW5nO1xuICAgICAgdGhpcy5lbGVtZW50ID0gcGxhY2Vob2xkZXI7XG4gICAgICBlbGVtZW50LnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKHBsYWNlaG9sZGVyLCBlbGVtZW50KTtcblxuICAgICAgLy8gU3RvcmVzIGEgdGVtcGxhdGUgZm9yIGFsbCB0aGUgZWxlbWVudHMgdGhhdCBjYW4gZ28gaW50byB0aGlzIHNwb3RcbiAgICAgIHRoaXMudGVtcGxhdGVzID0gWyBmcmFnbWVudHMuY3JlYXRlVGVtcGxhdGUoZWxlbWVudCkgXTtcblxuICAgICAgLy8gUHVsbCBvdXQgYW55IG90aGVyIGVsZW1lbnRzIHRoYXQgYXJlIGNoYWluZWQgd2l0aCB0aGlzIG9uZVxuICAgICAgd2hpbGUgKG5vZGUpIHtcbiAgICAgICAgdmFyIG5leHQgPSBub2RlLm5leHRFbGVtZW50U2libGluZztcbiAgICAgICAgdmFyIGV4cHJlc3Npb247XG4gICAgICAgIGlmIChub2RlLmhhc0F0dHJpYnV0ZSh0aGlzLmVsc2VJZkF0dHJOYW1lKSkge1xuICAgICAgICAgIGV4cHJlc3Npb24gPSBmcmFnbWVudHMuY29kaWZ5RXhwcmVzc2lvbignYXR0cmlidXRlJywgbm9kZS5nZXRBdHRyaWJ1dGUodGhpcy5lbHNlSWZBdHRyTmFtZSkpO1xuICAgICAgICAgIGV4cHJlc3Npb25zLnB1c2god3JhcElmRXhwKGV4cHJlc3Npb24sIGZhbHNlKSk7XG4gICAgICAgICAgbm9kZS5yZW1vdmVBdHRyaWJ1dGUodGhpcy5lbHNlSWZBdHRyTmFtZSk7XG4gICAgICAgIH0gZWxzZSBpZiAobm9kZS5oYXNBdHRyaWJ1dGUodGhpcy5lbHNlVW5sZXNzQXR0ck5hbWUpKSB7XG4gICAgICAgICAgZXhwcmVzc2lvbiA9IGZyYWdtZW50cy5jb2RpZnlFeHByZXNzaW9uKCdhdHRyaWJ1dGUnLCBub2RlLmdldEF0dHJpYnV0ZSh0aGlzLmVsc2VVbmxlc3NBdHRyTmFtZSkpO1xuICAgICAgICAgIGV4cHJlc3Npb25zLnB1c2god3JhcElmRXhwKGV4cHJlc3Npb24sIHRydWUpKTtcbiAgICAgICAgICBub2RlLnJlbW92ZUF0dHJpYnV0ZSh0aGlzLmVsc2VVbmxlc3NBdHRyTmFtZSk7XG4gICAgICAgIH0gZWxzZSBpZiAobm9kZS5oYXNBdHRyaWJ1dGUodGhpcy5lbHNlQXR0ck5hbWUpKSB7XG4gICAgICAgICAgbm9kZS5yZW1vdmVBdHRyaWJ1dGUodGhpcy5lbHNlQXR0ck5hbWUpO1xuICAgICAgICAgIG5leHQgPSBudWxsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgbm9kZS5yZW1vdmUoKTtcbiAgICAgICAgdGhpcy50ZW1wbGF0ZXMucHVzaChmcmFnbWVudHMuY3JlYXRlVGVtcGxhdGUobm9kZSkpO1xuICAgICAgICBub2RlID0gbmV4dDtcbiAgICAgIH1cblxuICAgICAgLy8gQW4gZXhwcmVzc2lvbiB0aGF0IHdpbGwgcmV0dXJuIGFuIGluZGV4LiBTb21ldGhpbmcgbGlrZSB0aGlzIGBleHByID8gMCA6IGV4cHIyID8gMSA6IGV4cHIzID8gMiA6IDNgLiBUaGlzIHdpbGxcbiAgICAgIC8vIGJlIHVzZWQgdG8ga25vdyB3aGljaCBzZWN0aW9uIHRvIHNob3cgaW4gdGhlIGlmL2Vsc2UtaWYvZWxzZSBncm91cGluZy5cbiAgICAgIHRoaXMuZXhwcmVzc2lvbiA9IGV4cHJlc3Npb25zLm1hcChmdW5jdGlvbihleHByLCBpbmRleCkge1xuICAgICAgICByZXR1cm4gZXhwciArICcgPyAnICsgaW5kZXggKyAnIDogJztcbiAgICAgIH0pLmpvaW4oJycpICsgZXhwcmVzc2lvbnMubGVuZ3RoO1xuICAgIH0sXG5cbiAgICB1cGRhdGVkOiBmdW5jdGlvbihpbmRleCkge1xuICAgICAgLy8gRm9yIHBlcmZvcm1hbmNlIHByb3ZpZGUgYW4gYWx0ZXJuYXRlIGNvZGUgcGF0aCBmb3IgYW5pbWF0aW9uXG4gICAgICBpZiAodGhpcy5hbmltYXRlICYmIHRoaXMuY29udGV4dCkge1xuICAgICAgICB0aGlzLnVwZGF0ZWRBbmltYXRlZChpbmRleCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnVwZGF0ZWRSZWd1bGFyKGluZGV4KTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgYWRkOiBmdW5jdGlvbih2aWV3KSB7XG4gICAgICB0aGlzLmVsZW1lbnQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodmlldywgdGhpcy5lbGVtZW50Lm5leHRTaWJsaW5nKTtcbiAgICB9LFxuXG4gICAgLy8gRG9lc24ndCBkbyBtdWNoLCBidXQgYWxsb3dzIHN1Yi1jbGFzc2VzIHRvIGFsdGVyIHRoZSBmdW5jdGlvbmFsaXR5LlxuICAgIHJlbW92ZTogZnVuY3Rpb24odmlldykge1xuICAgICAgdmlldy5kaXNwb3NlKCk7XG4gICAgfSxcblxuICAgIHVwZGF0ZWRSZWd1bGFyOiBmdW5jdGlvbihpbmRleCkge1xuICAgICAgaWYgKHRoaXMuc2hvd2luZykge1xuICAgICAgICB0aGlzLnJlbW92ZSh0aGlzLnNob3dpbmcpO1xuICAgICAgICB0aGlzLnNob3dpbmcgPSBudWxsO1xuICAgICAgfVxuICAgICAgdmFyIHRlbXBsYXRlID0gdGhpcy50ZW1wbGF0ZXNbaW5kZXhdO1xuICAgICAgaWYgKHRlbXBsYXRlKSB7XG4gICAgICAgIHRoaXMuc2hvd2luZyA9IHRlbXBsYXRlLmNyZWF0ZVZpZXcoKTtcbiAgICAgICAgdGhpcy5zaG93aW5nLmJpbmQodGhpcy5jb250ZXh0KTtcbiAgICAgICAgdGhpcy5hZGQodGhpcy5zaG93aW5nKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgdXBkYXRlZEFuaW1hdGVkOiBmdW5jdGlvbihpbmRleCkge1xuICAgICAgdGhpcy5sYXN0VmFsdWUgPSBpbmRleDtcbiAgICAgIGlmICh0aGlzLmFuaW1hdGluZykge1xuICAgICAgICAvLyBPYnNvbGV0ZWQsIHdpbGwgY2hhbmdlIGFmdGVyIGFuaW1hdGlvbiBpcyBmaW5pc2hlZC5cbiAgICAgICAgdGhpcy5zaG93aW5nLnVuYmluZCgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLnNob3dpbmcpIHtcbiAgICAgICAgdGhpcy5hbmltYXRpbmcgPSB0cnVlO1xuICAgICAgICB0aGlzLnNob3dpbmcudW5iaW5kKCk7XG4gICAgICAgIHRoaXMuYW5pbWF0ZU91dCh0aGlzLnNob3dpbmcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHRoaXMuYW5pbWF0aW5nID0gZmFsc2U7XG5cbiAgICAgICAgICBpZiAodGhpcy5zaG93aW5nKSB7XG4gICAgICAgICAgICAvLyBNYWtlIHN1cmUgdGhpcyB3YXNuJ3QgdW5ib3VuZCB3aGlsZSB3ZSB3ZXJlIGFuaW1hdGluZyAoZS5nLiBieSBhIHBhcmVudCBgaWZgIHRoYXQgZG9lc24ndCBhbmltYXRlKVxuICAgICAgICAgICAgdGhpcy5yZW1vdmUodGhpcy5zaG93aW5nKTtcbiAgICAgICAgICAgIHRoaXMuc2hvd2luZyA9IG51bGw7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHRoaXMuY29udGV4dCkge1xuICAgICAgICAgICAgLy8gZmluaXNoIGJ5IGFuaW1hdGluZyB0aGUgbmV3IGVsZW1lbnQgaW4gKGlmIGFueSksIHVubGVzcyBubyBsb25nZXIgYm91bmRcbiAgICAgICAgICAgIHRoaXMudXBkYXRlZEFuaW1hdGVkKHRoaXMubGFzdFZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHZhciB0ZW1wbGF0ZSA9IHRoaXMudGVtcGxhdGVzW2luZGV4XTtcbiAgICAgIGlmICh0ZW1wbGF0ZSkge1xuICAgICAgICB0aGlzLnNob3dpbmcgPSB0ZW1wbGF0ZS5jcmVhdGVWaWV3KCk7XG4gICAgICAgIHRoaXMuc2hvd2luZy5iaW5kKHRoaXMuY29udGV4dCk7XG4gICAgICAgIHRoaXMuYWRkKHRoaXMuc2hvd2luZyk7XG4gICAgICAgIHRoaXMuYW5pbWF0aW5nID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5hbmltYXRlSW4odGhpcy5zaG93aW5nLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICB0aGlzLmFuaW1hdGluZyA9IGZhbHNlO1xuICAgICAgICAgIC8vIGlmIHRoZSB2YWx1ZSBjaGFuZ2VkIHdoaWxlIHRoaXMgd2FzIGFuaW1hdGluZyBydW4gaXQgYWdhaW5cbiAgICAgICAgICBpZiAodGhpcy5sYXN0VmFsdWUgIT09IGluZGV4KSB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZWRBbmltYXRlZCh0aGlzLmxhc3RWYWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgdW5ib3VuZDogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAodGhpcy5zaG93aW5nKSB7XG4gICAgICAgIHRoaXMuc2hvd2luZy51bmJpbmQoKTtcbiAgICAgIH1cbiAgICAgIHRoaXMubGFzdFZhbHVlID0gbnVsbDtcbiAgICAgIHRoaXMuYW5pbWF0aW5nID0gZmFsc2U7XG4gICAgfVxuICB9KTtcblxuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ3VubGVzcycsIElmQmluZGluZyk7XG5cbiAgZnVuY3Rpb24gd3JhcElmRXhwKGV4cHIsIGlzVW5sZXNzKSB7XG4gICAgaWYgKGlzVW5sZXNzKSB7XG4gICAgICByZXR1cm4gJyEoJyArIGV4cHIgKyAnKSc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBleHByO1xuICAgIH1cbiAgfVxuXG5cbiAgLyoqXG4gICAqICMjIHJlcGVhdFxuICAgKiBBZGRzIGEgYmluZGVyIHRvIGR1cGxpY2F0ZSBhbiBlbGVtZW50IGZvciBlYWNoIGl0ZW0gaW4gYW4gYXJyYXkuIFRoZSBleHByZXNzaW9uIG1heSBiZSBvZiB0aGUgZm9ybWF0IGBlcHhyYCBvclxuICAgKiBgaXRlbU5hbWUgaW4gZXhwcmAgd2hlcmUgYGl0ZW1OYW1lYCBpcyB0aGUgbmFtZSBlYWNoIGl0ZW0gaW5zaWRlIHRoZSBhcnJheSB3aWxsIGJlIHJlZmVyZW5jZWQgYnkgd2l0aGluIGJpbmRpbmdzXG4gICAqIGluc2lkZSB0aGUgZWxlbWVudC5cbiAgICpcbiAgICogKipFeGFtcGxlOioqXG4gICAqIGBgYGh0bWxcbiAgICogPGRpdiBlYWNoPVwie3twb3N0IGluIHBvc3RzfX1cIiBjbGFzcy1mZWF0dXJlZD1cInt7cG9zdC5pc0ZlYXR1cmVkfX1cIj5cbiAgICogICA8aDE+e3twb3N0LnRpdGxlfX08L2gxPlxuICAgKiAgIDxkaXYgaHRtbD1cInt7cG9zdC5ib2R5IHwgbWFya2Rvd259fVwiPjwvZGl2PlxuICAgKiA8L2Rpdj5cbiAgICogYGBgXG4gICAqICpSZXN1bHQgaWYgdGhlcmUgYXJlIDIgcG9zdHMgYW5kIHRoZSBmaXJzdCBvbmUgaXMgZmVhdHVyZWQ6KlxuICAgKiBgYGBodG1sXG4gICAqIDxkaXYgY2xhc3M9XCJmZWF0dXJlZFwiPlxuICAgKiAgIDxoMT5MaXR0bGUgUmVkPC9oMT5cbiAgICogICA8ZGl2PlxuICAgKiAgICAgPHA+TGl0dGxlIFJlZCBSaWRpbmcgSG9vZCBpcyBhIHN0b3J5IGFib3V0IGEgbGl0dGxlIGdpcmwuPC9wPlxuICAgKiAgICAgPHA+XG4gICAqICAgICAgIE1vcmUgaW5mbyBjYW4gYmUgZm91bmQgb25cbiAgICogICAgICAgPGEgaHJlZj1cImh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvTGl0dGxlX1JlZF9SaWRpbmdfSG9vZFwiPldpa2lwZWRpYTwvYT5cbiAgICogICAgIDwvcD5cbiAgICogICA8L2Rpdj5cbiAgICogPC9kaXY+XG4gICAqIDxkaXY+XG4gICAqICAgPGgxPkJpZyBCbHVlPC9oMT5cbiAgICogICA8ZGl2PlxuICAgKiAgICAgPHA+U29tZSB0aG91Z2h0cyBvbiB0aGUgTmV3IFlvcmsgR2lhbnRzLjwvcD5cbiAgICogICAgIDxwPlxuICAgKiAgICAgICBNb3JlIGluZm8gY2FuIGJlIGZvdW5kIG9uXG4gICAqICAgICAgIDxhIGhyZWY9XCJodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL05ld19Zb3JrX0dpYW50c1wiPldpa2lwZWRpYTwvYT5cbiAgICogICAgIDwvcD5cbiAgICogICA8L2Rpdj5cbiAgICogPC9kaXY+XG4gICAqIGBgYFxuICAgKi9cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdyZXBlYXQnLCB7XG4gICAgYW5pbWF0ZWQ6IHRydWUsXG4gICAgcHJpb3JpdHk6IDEwMCxcblxuICAgIGNvbXBpbGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBwYXJlbnQgPSB0aGlzLmVsZW1lbnQucGFyZW50Tm9kZTtcbiAgICAgIHZhciBwbGFjZWhvbGRlciA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgICAgIHBhcmVudC5pbnNlcnRCZWZvcmUocGxhY2Vob2xkZXIsIHRoaXMuZWxlbWVudCk7XG4gICAgICB0aGlzLnRlbXBsYXRlID0gZnJhZ21lbnRzLmNyZWF0ZVRlbXBsYXRlKHRoaXMuZWxlbWVudCk7XG4gICAgICB0aGlzLmVsZW1lbnQgPSBwbGFjZWhvbGRlcjtcblxuICAgICAgdmFyIHBhcnRzID0gdGhpcy5leHByZXNzaW9uLnNwbGl0KC9cXHMraW5cXHMrLyk7XG4gICAgICB0aGlzLmV4cHJlc3Npb24gPSBwYXJ0cy5wb3AoKTtcbiAgICAgIHZhciBrZXkgPSBwYXJ0cy5wb3AoKTtcbiAgICAgIGlmIChrZXkpIHtcbiAgICAgICAgcGFydHMgPSBrZXkuc3BsaXQoL1xccyosXFxzKi8pO1xuICAgICAgICB0aGlzLnZhbHVlTmFtZSA9IHBhcnRzLnBvcCgpO1xuICAgICAgICB0aGlzLmtleU5hbWUgPSBwYXJ0cy5wb3AoKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgY3JlYXRlZDogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLnZpZXdzID0gW107XG4gICAgICB0aGlzLm9ic2VydmVyLmdldENoYW5nZVJlY29yZHMgPSB0cnVlO1xuICAgIH0sXG5cbiAgICByZW1vdmVWaWV3OiBmdW5jdGlvbih2aWV3KSB7XG4gICAgICB2aWV3LmRpc3Bvc2UoKTtcbiAgICAgIHZpZXcuX3JlcGVhdEl0ZW1fID0gbnVsbDtcbiAgICB9LFxuXG4gICAgdXBkYXRlZDogZnVuY3Rpb24odmFsdWUsIG9sZFZhbHVlLCBjaGFuZ2VzKSB7XG4gICAgICBpZiAoIWNoYW5nZXMgfHwgIXRoaXMuY29udGV4dCkge1xuICAgICAgICB0aGlzLnBvcHVsYXRlKHZhbHVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICh0aGlzLmFuaW1hdGUpIHtcbiAgICAgICAgICB0aGlzLnVwZGF0ZUNoYW5nZXNBbmltYXRlZCh2YWx1ZSwgY2hhbmdlcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy51cGRhdGVDaGFuZ2VzKHZhbHVlLCBjaGFuZ2VzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG5cbiAgICAvLyBNZXRob2QgZm9yIGNyZWF0aW5nIGFuZCBzZXR0aW5nIHVwIG5ldyB2aWV3cyBmb3Igb3VyIGxpc3RcbiAgICBjcmVhdGVWaWV3OiBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgICB2YXIgdmlldyA9IHRoaXMudGVtcGxhdGUuY3JlYXRlVmlldygpO1xuICAgICAgdmFyIGNvbnRleHQgPSB2YWx1ZTtcbiAgICAgIGlmICh0aGlzLnZhbHVlTmFtZSkge1xuICAgICAgICBjb250ZXh0ID0gT2JqZWN0LmNyZWF0ZSh0aGlzLmNvbnRleHQpO1xuICAgICAgICBpZiAodGhpcy5rZXlOYW1lKSBjb250ZXh0W3RoaXMua2V5TmFtZV0gPSBrZXk7XG4gICAgICAgIGNvbnRleHRbdGhpcy52YWx1ZU5hbWVdID0gdmFsdWU7XG4gICAgICAgIGNvbnRleHQuX29yaWdDb250ZXh0XyA9IHRoaXMuY29udGV4dC5oYXNPd25Qcm9wZXJ0eSgnX29yaWdDb250ZXh0XycpXG4gICAgICAgICAgPyB0aGlzLmNvbnRleHQuX29yaWdDb250ZXh0X1xuICAgICAgICAgIDogdGhpcy5jb250ZXh0O1xuICAgICAgfVxuICAgICAgdmlldy5iaW5kKGNvbnRleHQpO1xuICAgICAgdmlldy5fcmVwZWF0SXRlbV8gPSB2YWx1ZTtcbiAgICAgIHJldHVybiB2aWV3O1xuICAgIH0sXG5cbiAgICBwb3B1bGF0ZTogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGlmICh0aGlzLmFuaW1hdGluZykge1xuICAgICAgICB0aGlzLnZhbHVlV2hpbGVBbmltYXRpbmcgPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy52aWV3cy5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy52aWV3cy5mb3JFYWNoKHRoaXMucmVtb3ZlVmlldyk7XG4gICAgICAgIHRoaXMudmlld3MubGVuZ3RoID0gMDtcbiAgICAgIH1cblxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpICYmIHZhbHVlLmxlbmd0aCkge1xuICAgICAgICB2YXIgZnJhZyA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcblxuICAgICAgICB2YWx1ZS5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0sIGluZGV4KSB7XG4gICAgICAgICAgdmFyIHZpZXcgPSB0aGlzLmNyZWF0ZVZpZXcoaW5kZXgsIGl0ZW0pO1xuICAgICAgICAgIHRoaXMudmlld3MucHVzaCh2aWV3KTtcbiAgICAgICAgICBmcmFnLmFwcGVuZENoaWxkKHZpZXcpO1xuICAgICAgICB9LCB0aGlzKTtcblxuICAgICAgICB0aGlzLmVsZW1lbnQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoZnJhZywgdGhpcy5lbGVtZW50Lm5leHRTaWJsaW5nKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVGhpcyB1bi1hbmltYXRlZCB2ZXJzaW9uIHJlbW92ZXMgYWxsIHJlbW92ZWQgdmlld3MgZmlyc3Qgc28gdGhleSBjYW4gYmUgcmV0dXJuZWQgdG8gdGhlIHBvb2wgYW5kIHRoZW4gYWRkcyBuZXdcbiAgICAgKiB2aWV3cyBiYWNrIGluLiBUaGlzIGlzIHRoZSBtb3N0IG9wdGltYWwgbWV0aG9kIHdoZW4gbm90IGFuaW1hdGluZy5cbiAgICAgKi9cbiAgICB1cGRhdGVDaGFuZ2VzOiBmdW5jdGlvbih2YWx1ZSwgY2hhbmdlcykge1xuICAgICAgLy8gUmVtb3ZlIGV2ZXJ5dGhpbmcgZmlyc3QsIHRoZW4gYWRkIGFnYWluLCBhbGxvd2luZyBmb3IgZWxlbWVudCByZXVzZSBmcm9tIHRoZSBwb29sXG4gICAgICB2YXIgYWRkZWRDb3VudCA9IDA7XG5cbiAgICAgIGNoYW5nZXMuZm9yRWFjaChmdW5jdGlvbihzcGxpY2UpIHtcbiAgICAgICAgYWRkZWRDb3VudCArPSBzcGxpY2UuYWRkZWRDb3VudDtcbiAgICAgICAgaWYgKCFzcGxpY2UucmVtb3ZlZC5sZW5ndGgpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJlbW92ZWQgPSB0aGlzLnZpZXdzLnNwbGljZShzcGxpY2UuaW5kZXggLSBhZGRlZENvdW50LCBzcGxpY2UucmVtb3ZlZC5sZW5ndGgpO1xuICAgICAgICByZW1vdmVkLmZvckVhY2godGhpcy5yZW1vdmVWaWV3KTtcbiAgICAgIH0sIHRoaXMpO1xuXG4gICAgICAvLyBBZGQgdGhlIG5ldy9tb3ZlZCB2aWV3c1xuICAgICAgY2hhbmdlcy5mb3JFYWNoKGZ1bmN0aW9uKHNwbGljZSkge1xuICAgICAgICBpZiAoIXNwbGljZS5hZGRlZENvdW50KSByZXR1cm47XG4gICAgICAgIHZhciBhZGRlZFZpZXdzID0gW107XG4gICAgICAgIHZhciBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICAgICAgdmFyIGluZGV4ID0gc3BsaWNlLmluZGV4O1xuICAgICAgICB2YXIgZW5kSW5kZXggPSBpbmRleCArIHNwbGljZS5hZGRlZENvdW50O1xuXG4gICAgICAgIGZvciAodmFyIGkgPSBpbmRleDsgaSA8IGVuZEluZGV4OyBpKyspIHtcbiAgICAgICAgICB2YXIgaXRlbSA9IHZhbHVlW2ldO1xuICAgICAgICAgIHZpZXcgPSB0aGlzLmNyZWF0ZVZpZXcoaSwgaXRlbSk7XG4gICAgICAgICAgYWRkZWRWaWV3cy5wdXNoKHZpZXcpO1xuICAgICAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKHZpZXcpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudmlld3Muc3BsaWNlLmFwcGx5KHRoaXMudmlld3MsIFsgaW5kZXgsIDAgXS5jb25jYXQoYWRkZWRWaWV3cykpO1xuICAgICAgICB2YXIgcHJldmlvdXNWaWV3ID0gdGhpcy52aWV3c1tpbmRleCAtIDFdO1xuICAgICAgICB2YXIgbmV4dFNpYmxpbmcgPSBwcmV2aW91c1ZpZXcgPyBwcmV2aW91c1ZpZXcubGFzdFZpZXdOb2RlLm5leHRTaWJsaW5nIDogdGhpcy5lbGVtZW50Lm5leHRTaWJsaW5nO1xuICAgICAgICB0aGlzLmVsZW1lbnQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoZnJhZ21lbnQsIG5leHRTaWJsaW5nKTtcbiAgICAgIH0sIHRoaXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUaGlzIGFuaW1hdGVkIHZlcnNpb24gbXVzdCBhbmltYXRlIHJlbW92ZWQgbm9kZXMgb3V0IHdoaWxlIGFkZGVkIG5vZGVzIGFyZSBhbmltYXRpbmcgaW4gbWFraW5nIGl0IGxlc3Mgb3B0aW1hbFxuICAgICAqIChidXQgY29vbCBsb29raW5nKS4gSXQgYWxzbyBoYW5kbGVzIFwibW92ZVwiIGFuaW1hdGlvbnMgZm9yIG5vZGVzIHdoaWNoIGFyZSBtb3ZpbmcgcGxhY2Ugd2l0aGluIHRoZSBsaXN0LlxuICAgICAqL1xuICAgIHVwZGF0ZUNoYW5nZXNBbmltYXRlZDogZnVuY3Rpb24odmFsdWUsIGNoYW5nZXMpIHtcbiAgICAgIGlmICh0aGlzLmFuaW1hdGluZykge1xuICAgICAgICB0aGlzLnZhbHVlV2hpbGVBbmltYXRpbmcgPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIGFuaW1hdGluZ1ZhbHVlID0gdmFsdWUuc2xpY2UoKTtcbiAgICAgIHZhciBhbGxBZGRlZCA9IFtdO1xuICAgICAgdmFyIGFsbFJlbW92ZWQgPSBbXTtcbiAgICAgIHRoaXMuYW5pbWF0aW5nID0gdHJ1ZTtcblxuICAgICAgLy8gUnVuIHVwZGF0ZXMgd2hpY2ggb2NjdXJlZCB3aGlsZSB0aGlzIHdhcyBhbmltYXRpbmcuXG4gICAgICBmdW5jdGlvbiB3aGVuRG9uZSgpIHtcbiAgICAgICAgLy8gVGhlIGxhc3QgYW5pbWF0aW9uIGZpbmlzaGVkIHdpbGwgcnVuIHRoaXNcbiAgICAgICAgaWYgKC0td2hlbkRvbmUuY291bnQgIT09IDApIHJldHVybjtcblxuICAgICAgICBhbGxSZW1vdmVkLmZvckVhY2godGhpcy5yZW1vdmVWaWV3KTtcblxuICAgICAgICB0aGlzLmFuaW1hdGluZyA9IGZhbHNlO1xuICAgICAgICBpZiAodGhpcy52YWx1ZVdoaWxlQW5pbWF0aW5nKSB7XG4gICAgICAgICAgdmFyIGNoYW5nZXMgPSBkaWZmLmFycmF5cyh0aGlzLnZhbHVlV2hpbGVBbmltYXRpbmcsIGFuaW1hdGluZ1ZhbHVlKTtcbiAgICAgICAgICB0aGlzLnVwZGF0ZUNoYW5nZXNBbmltYXRlZCh0aGlzLnZhbHVlV2hpbGVBbmltYXRpbmcsIGNoYW5nZXMpO1xuICAgICAgICAgIHRoaXMudmFsdWVXaGlsZUFuaW1hdGluZyA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHdoZW5Eb25lLmNvdW50ID0gMDtcblxuICAgICAgY2hhbmdlcy5mb3JFYWNoKGZ1bmN0aW9uKHNwbGljZSkge1xuICAgICAgICB2YXIgYWRkZWRWaWV3cyA9IFtdO1xuICAgICAgICB2YXIgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgICAgIHZhciBpbmRleCA9IHNwbGljZS5pbmRleDtcbiAgICAgICAgdmFyIGVuZEluZGV4ID0gaW5kZXggKyBzcGxpY2UuYWRkZWRDb3VudDtcbiAgICAgICAgdmFyIHJlbW92ZWRDb3VudCA9IHNwbGljZS5yZW1vdmVkLmxlbmd0aDtcblxuICAgICAgICBmb3IgKHZhciBpID0gaW5kZXg7IGkgPCBlbmRJbmRleDsgaSsrKSB7XG4gICAgICAgICAgdmFyIGl0ZW0gPSB2YWx1ZVtpXTtcbiAgICAgICAgICB2YXIgdmlldyA9IHRoaXMuY3JlYXRlVmlldyhpLCBpdGVtKTtcbiAgICAgICAgICBhZGRlZFZpZXdzLnB1c2godmlldyk7XG4gICAgICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQodmlldyk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcmVtb3ZlZFZpZXdzID0gdGhpcy52aWV3cy5zcGxpY2UuYXBwbHkodGhpcy52aWV3cywgWyBpbmRleCwgcmVtb3ZlZENvdW50IF0uY29uY2F0KGFkZGVkVmlld3MpKTtcbiAgICAgICAgdmFyIHByZXZpb3VzVmlldyA9IHRoaXMudmlld3NbaW5kZXggLSAxXTtcbiAgICAgICAgdmFyIG5leHRTaWJsaW5nID0gcHJldmlvdXNWaWV3ID8gcHJldmlvdXNWaWV3Lmxhc3RWaWV3Tm9kZS5uZXh0U2libGluZyA6IHRoaXMuZWxlbWVudC5uZXh0U2libGluZztcbiAgICAgICAgdGhpcy5lbGVtZW50LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGZyYWdtZW50LCBuZXh0U2libGluZyk7XG5cbiAgICAgICAgYWxsQWRkZWQgPSBhbGxBZGRlZC5jb25jYXQoYWRkZWRWaWV3cyk7XG4gICAgICAgIGFsbFJlbW92ZWQgPSBhbGxSZW1vdmVkLmNvbmNhdChyZW1vdmVkVmlld3MpO1xuICAgICAgfSwgdGhpcyk7XG5cblxuICAgICAgYWxsQWRkZWQuZm9yRWFjaChmdW5jdGlvbih2aWV3KSB7XG4gICAgICAgIHdoZW5Eb25lLmNvdW50Kys7XG4gICAgICAgIHRoaXMuYW5pbWF0ZUluKHZpZXcsIHdoZW5Eb25lKTtcbiAgICAgIH0sIHRoaXMpO1xuXG4gICAgICBhbGxSZW1vdmVkLmZvckVhY2goZnVuY3Rpb24odmlldykge1xuICAgICAgICB3aGVuRG9uZS5jb3VudCsrO1xuICAgICAgICB2aWV3LnVuYmluZCgpO1xuICAgICAgICB0aGlzLmFuaW1hdGVPdXQodmlldywgd2hlbkRvbmUpO1xuICAgICAgfSwgdGhpcyk7XG4gICAgfSxcblxuICAgIHVuYm91bmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy52aWV3cy5mb3JFYWNoKGZ1bmN0aW9uKHZpZXcpIHtcbiAgICAgICAgdmlldy51bmJpbmQoKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy52YWx1ZVdoaWxlQW5pbWF0aW5nID0gbnVsbDtcbiAgICAgIHRoaXMuYW5pbWF0aW5nID0gZmFsc2U7XG4gICAgfVxuICB9KTtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gcmVnaXN0ZXJEZWZhdWx0cztcblxuXG4vKipcbiAqICMgRGVmYXVsdCBGb3JtYXR0ZXJzXG4gKiBSZWdpc3RlcnMgZGVmYXVsdCBmb3JtYXR0ZXJzIHdpdGggYSBmcmFnbWVudHMgb2JqZWN0LlxuICovXG5mdW5jdGlvbiByZWdpc3RlckRlZmF1bHRzKGZyYWdtZW50cykge1xuXG4gIC8qKlxuICAgKlxuICAgKi9cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCd0b2tlbkxpc3QnLCBmdW5jdGlvbih2YWx1ZSkge1xuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICByZXR1cm4gdmFsdWUuam9pbignICcpO1xuICAgIH1cblxuICAgIGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICB2YXIgY2xhc3NlcyA9IFtdO1xuICAgICAgT2JqZWN0LmtleXModmFsdWUpLmZvckVhY2goZnVuY3Rpb24oY2xhc3NOYW1lKSB7XG4gICAgICAgIGlmICh2YWx1ZVtjbGFzc05hbWVdKSB7XG4gICAgICAgICAgY2xhc3Nlcy5wdXNoKGNsYXNzTmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGNsYXNzZXMuam9pbignICcpO1xuICAgIH1cblxuICAgIHJldHVybiB2YWx1ZSB8fCAnJztcbiAgfSk7XG5cblxuICAvKipcbiAgICogdiBUT0RPIHZcbiAgICovXG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcignc3R5bGVzJywgZnVuY3Rpb24odmFsdWUpIHtcblxuICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgcmV0dXJuIHZhbHVlLmpvaW4oJyAnKTtcbiAgICB9XG5cbiAgICBpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgdmFyIGNsYXNzZXMgPSBbXTtcbiAgICAgIE9iamVjdC5rZXlzKHZhbHVlKS5mb3JFYWNoKGZ1bmN0aW9uKGNsYXNzTmFtZSkge1xuICAgICAgICBpZiAodmFsdWVbY2xhc3NOYW1lXSkge1xuICAgICAgICAgIGNsYXNzZXMucHVzaChjbGFzc05hbWUpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBjbGFzc2VzLmpvaW4oJyAnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdmFsdWUgfHwgJyc7XG4gIH0pO1xuXG5cbiAgLyoqXG4gICAqICMjIGZpbHRlclxuICAgKiBGaWx0ZXJzIGFuIGFycmF5IGJ5IHRoZSBnaXZlbiBmaWx0ZXIgZnVuY3Rpb24ocyksIG1heSBwcm92aWRlIGEgZnVuY3Rpb24sIGFuXG4gICAqIGFycmF5LCBvciBhbiBvYmplY3Qgd2l0aCBmaWx0ZXJpbmcgZnVuY3Rpb25zXG4gICAqL1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ2ZpbHRlcicsIGZ1bmN0aW9uKHZhbHVlLCBmaWx0ZXJGdW5jKSB7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH0gZWxzZSBpZiAoIWZpbHRlckZ1bmMpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGZpbHRlckZ1bmMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHZhbHVlID0gdmFsdWUuZmlsdGVyKGZpbHRlckZ1bmMsIHRoaXMpO1xuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShmaWx0ZXJGdW5jKSkge1xuICAgICAgZmlsdGVyRnVuYy5mb3JFYWNoKGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICAgICAgdmFsdWUgPSB2YWx1ZS5maWx0ZXIoZnVuYywgdGhpcyk7XG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBmaWx0ZXJGdW5jID09PSAnb2JqZWN0Jykge1xuICAgICAgT2JqZWN0LmtleXMoZmlsdGVyRnVuYykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgdmFyIGZ1bmMgPSBmaWx0ZXJGdW5jW2tleV07XG4gICAgICAgIGlmICh0eXBlb2YgZnVuYyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIHZhbHVlID0gdmFsdWUuZmlsdGVyKGZ1bmMsIHRoaXMpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9KTtcblxuXG4gIC8qKlxuICAgKiAjIyBtYXBcbiAgICogQWRkcyBhIGZvcm1hdHRlciB0byBtYXAgYW4gYXJyYXkgb3IgdmFsdWUgYnkgdGhlIGdpdmVuIG1hcHBpbmcgZnVuY3Rpb25cbiAgICovXG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcignbWFwJywgZnVuY3Rpb24odmFsdWUsIG1hcEZ1bmMpIHtcbiAgICBpZiAodmFsdWUgPT0gbnVsbCB8fCB0eXBlb2YgbWFwRnVuYyAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiB2YWx1ZS5tYXAobWFwRnVuYywgdGhpcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBtYXBGdW5jLmNhbGwodGhpcywgdmFsdWUpO1xuICAgIH1cbiAgfSk7XG5cblxuICAvKipcbiAgICogIyMgcmVkdWNlXG4gICAqIEFkZHMgYSBmb3JtYXR0ZXIgdG8gcmVkdWNlIGFuIGFycmF5IG9yIHZhbHVlIGJ5IHRoZSBnaXZlbiByZWR1Y2UgZnVuY3Rpb25cbiAgICovXG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcigncmVkdWNlJywgZnVuY3Rpb24odmFsdWUsIHJlZHVjZUZ1bmMsIGluaXRpYWxWYWx1ZSkge1xuICAgIGlmICh2YWx1ZSA9PSBudWxsIHx8IHR5cGVvZiBtYXBGdW5jICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDMpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLnJlZHVjZShyZWR1Y2VGdW5jLCBpbml0aWFsVmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLnJlZHVjZShyZWR1Y2VGdW5jKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDMpIHtcbiAgICAgIHJldHVybiByZWR1Y2VGdW5jKGluaXRpYWxWYWx1ZSwgdmFsdWUpO1xuICAgIH1cbiAgfSk7XG5cblxuICAvKipcbiAgICogIyMgcmVkdWNlXG4gICAqIEFkZHMgYSBmb3JtYXR0ZXIgdG8gcmVkdWNlIGFuIGFycmF5IG9yIHZhbHVlIGJ5IHRoZSBnaXZlbiByZWR1Y2UgZnVuY3Rpb25cbiAgICovXG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcignc2xpY2UnLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGVuZEluZGV4KSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICByZXR1cm4gdmFsdWUuc2xpY2UoaW5kZXgsIGVuZEluZGV4KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgfSk7XG5cblxuICAvKipcbiAgICogIyMgZGF0ZVxuICAgKiBBZGRzIGEgZm9ybWF0dGVyIHRvIGZvcm1hdCBkYXRlcyBhbmQgc3RyaW5nc1xuICAgKi9cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCdkYXRlJywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAoIXZhbHVlKSB7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfVxuXG4gICAgaWYgKCEodmFsdWUgaW5zdGFuY2VvZiBEYXRlKSkge1xuICAgICAgdmFsdWUgPSBuZXcgRGF0ZSh2YWx1ZSk7XG4gICAgfVxuXG4gICAgaWYgKGlzTmFOKHZhbHVlLmdldFRpbWUoKSkpIHtcbiAgICAgIHJldHVybiAnJztcbiAgICB9XG5cbiAgICByZXR1cm4gdmFsdWUudG9Mb2NhbGVTdHJpbmcoKTtcbiAgfSk7XG5cblxuICAvKipcbiAgICogIyMgbG9nXG4gICAqIEFkZHMgYSBmb3JtYXR0ZXIgdG8gbG9nIHRoZSB2YWx1ZSBvZiB0aGUgZXhwcmVzc2lvbiwgdXNlZnVsIGZvciBkZWJ1Z2dpbmdcbiAgICovXG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcignbG9nJywgZnVuY3Rpb24odmFsdWUsIHByZWZpeCkge1xuICAgIGlmIChwcmVmaXggPT0gbnVsbCkgcHJlZml4ID0gJ0xvZzonO1xuICAgIGNvbnNvbGUubG9nKHByZWZpeCwgdmFsdWUpO1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfSk7XG5cblxuICAvKipcbiAgICogIyMgbGltaXRcbiAgICogQWRkcyBhIGZvcm1hdHRlciB0byBsaW1pdCB0aGUgbGVuZ3RoIG9mIGFuIGFycmF5IG9yIHN0cmluZ1xuICAgKi9cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCdsaW1pdCcsIGZ1bmN0aW9uKHZhbHVlLCBsaW1pdCkge1xuICAgIGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUuc2xpY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGlmIChsaW1pdCA8IDApIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLnNsaWNlKGxpbWl0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhbHVlLnNsaWNlKDAsIGxpbWl0KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgfSk7XG5cblxuICAvKipcbiAgICogIyMgc29ydFxuICAgKiBTb3J0cyBhbiBhcnJheSBnaXZlbiBhIGZpZWxkIG5hbWUgb3Igc29ydCBmdW5jdGlvbiwgYW5kIGEgZGlyZWN0aW9uXG4gICAqL1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ3NvcnQnLCBmdW5jdGlvbih2YWx1ZSwgc29ydEZ1bmMsIGRpcikge1xuICAgIGlmICghc29ydEZ1bmMgfHwgIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIGRpciA9IChkaXIgPT09ICdkZXNjJykgPyAtMSA6IDE7XG4gICAgaWYgKHR5cGVvZiBzb3J0RnVuYyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHZhciBwYXJ0cyA9IHNvcnRGdW5jLnNwbGl0KCc6Jyk7XG4gICAgICB2YXIgcHJvcCA9IHBhcnRzWzBdO1xuICAgICAgdmFyIGRpcjIgPSBwYXJ0c1sxXTtcbiAgICAgIGRpcjIgPSAoZGlyMiA9PT0gJ2Rlc2MnKSA/IC0xIDogMTtcbiAgICAgIGRpciA9IGRpciB8fCBkaXIyO1xuICAgICAgdmFyIHNvcnRGdW5jID0gZnVuY3Rpb24oYSwgYikge1xuICAgICAgICBpZiAoYVtwcm9wXSA+IGJbcHJvcF0pIHJldHVybiBkaXI7XG4gICAgICAgIGlmIChhW3Byb3BdIDwgYltwcm9wXSkgcmV0dXJuIC1kaXI7XG4gICAgICAgIHJldHVybiAwO1xuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKGRpciA9PT0gLTEpIHtcbiAgICAgIHZhciBvcmlnRnVuYyA9IHNvcnRGdW5jO1xuICAgICAgc29ydEZ1bmMgPSBmdW5jdGlvbihhLCBiKSB7IHJldHVybiAtb3JpZ0Z1bmMoYSwgYik7IH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbHVlLnNsaWNlKCkuc29ydChzb3J0RnVuYyk7XG4gIH0pO1xuXG5cbiAgLyoqXG4gICAqICMjIGFkZFF1ZXJ5XG4gICAqIFRha2VzIHRoZSBpbnB1dCBVUkwgYW5kIGFkZHMgKG9yIHJlcGxhY2VzKSB0aGUgZmllbGQgaW4gdGhlIHF1ZXJ5XG4gICAqL1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ2FkZFF1ZXJ5JywgZnVuY3Rpb24odmFsdWUsIHF1ZXJ5RmllbGQsIHF1ZXJ5VmFsdWUpIHtcbiAgICB2YXIgdXJsID0gdmFsdWUgfHwgbG9jYXRpb24uaHJlZjtcbiAgICB2YXIgcGFydHMgPSB1cmwuc3BsaXQoJz8nKTtcbiAgICB1cmwgPSBwYXJ0c1swXTtcbiAgICB2YXIgcXVlcnkgPSBwYXJ0c1sxXTtcbiAgICB2YXIgYWRkZWRRdWVyeSA9ICcnO1xuICAgIGlmIChxdWVyeVZhbHVlICE9IG51bGwpIHtcbiAgICAgIGFkZGVkUXVlcnkgPSBxdWVyeUZpZWxkICsgJz0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHF1ZXJ5VmFsdWUpO1xuICAgIH1cblxuICAgIGlmIChxdWVyeSkge1xuICAgICAgdmFyIGV4cHIgPSBuZXcgUmVnRXhwKCdcXFxcYicgKyBxdWVyeUZpZWxkICsgJz1bXiZdKicpO1xuICAgICAgaWYgKGV4cHIudGVzdChxdWVyeSkpIHtcbiAgICAgICAgcXVlcnkgPSBxdWVyeS5yZXBsYWNlKGV4cHIsIGFkZGVkUXVlcnkpO1xuICAgICAgfSBlbHNlIGlmIChhZGRlZFF1ZXJ5KSB7XG4gICAgICAgIHF1ZXJ5ICs9ICcmJyArIGFkZGVkUXVlcnk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHF1ZXJ5ID0gYWRkZWRRdWVyeTtcbiAgICB9XG4gICAgaWYgKHF1ZXJ5KSB7XG4gICAgICB1cmwgKz0gJz8nICsgcXVlcnk7XG4gICAgfVxuICAgIHJldHVybiB1cmw7XG4gIH0pO1xuXG5cbiAgdmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gIGZ1bmN0aW9uIGVzY2FwZUhUTUwodmFsdWUsIHNldHRlcikge1xuICAgIGlmIChzZXR0ZXIpIHtcbiAgICAgIGRpdi5pbm5lckhUTUwgPSB2YWx1ZTtcbiAgICAgIHJldHVybiBkaXYudGV4dENvbnRlbnQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRpdi50ZXh0Q29udGVudCA9IHZhbHVlIHx8ICcnO1xuICAgICAgcmV0dXJuIGRpdi5pbm5lckhUTUw7XG4gICAgfVxuICB9XG5cblxuICAvKipcbiAgICogIyMgZXNjYXBlXG4gICAqIEhUTUwgZXNjYXBlcyBjb250ZW50LiBGb3IgdXNlIHdpdGggb3RoZXIgSFRNTC1hZGRpbmcgZm9ybWF0dGVycyBzdWNoIGFzIGF1dG9saW5rLlxuICAgKlxuICAgKiAqKkV4YW1wbGU6KipcbiAgICogYGBgeG1sXG4gICAqIDxkaXYgYmluZC1odG1sPVwidHdlZXQuY29udGVudCB8IGVzY2FwZSB8IGF1dG9saW5rOnRydWVcIj48L2Rpdj5cbiAgICogYGBgXG4gICAqICpSZXN1bHQ6KlxuICAgKiBgYGB4bWxcbiAgICogPGRpdj5DaGVjayBvdXQgPGEgaHJlZj1cImh0dHBzOi8vZ2l0aHViLmNvbS9jaGlwLWpzL1wiIHRhcmdldD1cIl9ibGFua1wiPmh0dHBzOi8vZ2l0aHViLmNvbS9jaGlwLWpzLzwvYT4hPC9kaXY+XG4gICAqIGBgYFxuICAgKi9cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCdlc2NhcGUnLCBlc2NhcGVIVE1MKTtcblxuXG4gIC8qKlxuICAgKiAjIyBwXG4gICAqIEhUTUwgZXNjYXBlcyBjb250ZW50IHdyYXBwaW5nIHBhcmFncmFwaHMgaW4gPHA+IHRhZ3MuXG4gICAqXG4gICAqICoqRXhhbXBsZToqKlxuICAgKiBgYGB4bWxcbiAgICogPGRpdiBiaW5kLWh0bWw9XCJ0d2VldC5jb250ZW50IHwgcCB8IGF1dG9saW5rOnRydWVcIj48L2Rpdj5cbiAgICogYGBgXG4gICAqICpSZXN1bHQ6KlxuICAgKiBgYGB4bWxcbiAgICogPGRpdj48cD5DaGVjayBvdXQgPGEgaHJlZj1cImh0dHBzOi8vZ2l0aHViLmNvbS9jaGlwLWpzL1wiIHRhcmdldD1cIl9ibGFua1wiPmh0dHBzOi8vZ2l0aHViLmNvbS9jaGlwLWpzLzwvYT4hPC9wPlxuICAgKiA8cD5JdCdzIGdyZWF0PC9wPjwvZGl2PlxuICAgKiBgYGBcbiAgICovXG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcigncCcsIGZ1bmN0aW9uKHZhbHVlLCBzZXR0ZXIpIHtcbiAgICBpZiAoc2V0dGVyKSB7XG4gICAgICByZXR1cm4gZXNjYXBlSFRNTCh2YWx1ZSwgc2V0dGVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGxpbmVzID0gKHZhbHVlIHx8ICcnKS5zcGxpdCgvXFxyP1xcbi8pO1xuICAgICAgdmFyIGVzY2FwZWQgPSBsaW5lcy5tYXAoZnVuY3Rpb24obGluZSkgeyByZXR1cm4gZXNjYXBlSFRNTChsaW5lKSB8fCAnPGJyPic7IH0pO1xuICAgICAgcmV0dXJuICc8cD4nICsgZXNjYXBlZC5qb2luKCc8L3A+XFxuPHA+JykgKyAnPC9wPic7XG4gICAgfVxuICB9KTtcblxuXG4gIC8qKlxuICAgKiAjIyBiclxuICAgKiBIVE1MIGVzY2FwZXMgY29udGVudCBhZGRpbmcgPGJyPiB0YWdzIGluIHBsYWNlIG9mIG5ld2xpbmVzIGNoYXJhY3RlcnMuXG4gICAqXG4gICAqICoqRXhhbXBsZToqKlxuICAgKiBgYGB4bWxcbiAgICogPGRpdiBiaW5kLWh0bWw9XCJ0d2VldC5jb250ZW50IHwgYnIgfCBhdXRvbGluazp0cnVlXCI+PC9kaXY+XG4gICAqIGBgYFxuICAgKiAqUmVzdWx0OipcbiAgICogYGBgeG1sXG4gICAqIDxkaXY+Q2hlY2sgb3V0IDxhIGhyZWY9XCJodHRwczovL2dpdGh1Yi5jb20vY2hpcC1qcy9cIiB0YXJnZXQ9XCJfYmxhbmtcIj5odHRwczovL2dpdGh1Yi5jb20vY2hpcC1qcy88L2E+ITxicj5cbiAgICogSXQncyBncmVhdDwvZGl2PlxuICAgKiBgYGBcbiAgICovXG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcignYnInLCBmdW5jdGlvbih2YWx1ZSwgc2V0dGVyKSB7XG4gICAgaWYgKHNldHRlcikge1xuICAgICAgcmV0dXJuIGVzY2FwZUhUTUwodmFsdWUsIHNldHRlcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBsaW5lcyA9ICh2YWx1ZSB8fCAnJykuc3BsaXQoL1xccj9cXG4vKTtcbiAgICAgIHJldHVybiBsaW5lcy5tYXAoZXNjYXBlSFRNTCkuam9pbignPGJyPlxcbicpO1xuICAgIH1cbiAgfSk7XG5cblxuICAvKipcbiAgICogIyMgbmV3bGluZVxuICAgKiBIVE1MIGVzY2FwZXMgY29udGVudCBhZGRpbmcgPHA+IHRhZ3MgYXQgZG91YmxlIG5ld2xpbmVzIGFuZCA8YnI+IHRhZ3MgaW4gcGxhY2Ugb2Ygc2luZ2xlIG5ld2xpbmUgY2hhcmFjdGVycy5cbiAgICpcbiAgICogKipFeGFtcGxlOioqXG4gICAqIGBgYHhtbFxuICAgKiA8ZGl2IGJpbmQtaHRtbD1cInR3ZWV0LmNvbnRlbnQgfCBuZXdsaW5lIHwgYXV0b2xpbms6dHJ1ZVwiPjwvZGl2PlxuICAgKiBgYGBcbiAgICogKlJlc3VsdDoqXG4gICAqIGBgYHhtbFxuICAgKiA8ZGl2PjxwPkNoZWNrIG91dCA8YSBocmVmPVwiaHR0cHM6Ly9naXRodWIuY29tL2NoaXAtanMvXCIgdGFyZ2V0PVwiX2JsYW5rXCI+aHR0cHM6Ly9naXRodWIuY29tL2NoaXAtanMvPC9hPiE8YnI+XG4gICAqIEl0J3MgZ3JlYXQ8L3A+PC9kaXY+XG4gICAqIGBgYFxuICAgKi9cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCduZXdsaW5lJywgZnVuY3Rpb24odmFsdWUsIHNldHRlcikge1xuICAgIGlmIChzZXR0ZXIpIHtcbiAgICAgIHJldHVybiBlc2NhcGVIVE1MKHZhbHVlLCBzZXR0ZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgcGFyYWdyYXBocyA9ICh2YWx1ZSB8fCAnJykuc3BsaXQoL1xccj9cXG5cXHMqXFxyP1xcbi8pO1xuICAgICAgdmFyIGVzY2FwZWQgPSBwYXJhZ3JhcGhzLm1hcChmdW5jdGlvbihwYXJhZ3JhcGgpIHtcbiAgICAgICAgdmFyIGxpbmVzID0gcGFyYWdyYXBoLnNwbGl0KC9cXHI/XFxuLyk7XG4gICAgICAgIHJldHVybiBsaW5lcy5tYXAoZXNjYXBlSFRNTCkuam9pbignPGJyPlxcbicpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gJzxwPicgKyBlc2NhcGVkLmpvaW4oJzwvcD5cXG5cXG48cD4nKSArICc8L3A+JztcbiAgICB9XG4gIH0pO1xuXG5cblxuICB2YXIgdXJsRXhwID0gLyhefFxcc3xcXCgpKCg/Omh0dHBzP3xmdHApOlxcL1xcL1tcXC1BLVowLTkrXFx1MDAyNkAjXFwvJT89KCl+X3whOiwuO10qW1xcLUEtWjAtOStcXHUwMDI2QCNcXC8lPX4oX3xdKS9naTtcbiAgLyoqXG4gICAqICMjIGF1dG9saW5rXG4gICAqIEFkZHMgYXV0b21hdGljIGxpbmtzIHRvIGVzY2FwZWQgY29udGVudCAoYmUgc3VyZSB0byBlc2NhcGUgdXNlciBjb250ZW50KS4gQ2FuIGJlIHVzZWQgb24gZXhpc3RpbmcgSFRNTCBjb250ZW50IGFzIGl0XG4gICAqIHdpbGwgc2tpcCBVUkxzIHdpdGhpbiBIVE1MIHRhZ3MuIFBhc3NpbmcgdHJ1ZSBpbiB0aGUgc2Vjb25kIHBhcmFtZXRlciB3aWxsIHNldCB0aGUgdGFyZ2V0IHRvIGBfYmxhbmtgLlxuICAgKlxuICAgKiAqKkV4YW1wbGU6KipcbiAgICogYGBgeG1sXG4gICAqIDxkaXYgYmluZC1odG1sPVwidHdlZXQuY29udGVudCB8IGVzY2FwZSB8IGF1dG9saW5rOnRydWVcIj48L2Rpdj5cbiAgICogYGBgXG4gICAqICpSZXN1bHQ6KlxuICAgKiBgYGB4bWxcbiAgICogPGRpdj5DaGVjayBvdXQgPGEgaHJlZj1cImh0dHBzOi8vZ2l0aHViLmNvbS9jaGlwLWpzL1wiIHRhcmdldD1cIl9ibGFua1wiPmh0dHBzOi8vZ2l0aHViLmNvbS9jaGlwLWpzLzwvYT4hPC9kaXY+XG4gICAqIGBgYFxuICAgKi9cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCdhdXRvbGluaycsIGZ1bmN0aW9uKHZhbHVlLCB0YXJnZXQpIHtcbiAgICB0YXJnZXQgPSAodGFyZ2V0KSA/ICcgdGFyZ2V0PVwiX2JsYW5rXCInIDogJyc7XG5cbiAgICByZXR1cm4gKCcnICsgdmFsdWUpLnJlcGxhY2UoLzxbXj5dKz58W148XSsvZywgZnVuY3Rpb24obWF0Y2gpIHtcbiAgICAgIGlmIChtYXRjaC5jaGFyQXQoMCkgPT09ICc8Jykge1xuICAgICAgICByZXR1cm4gbWF0Y2g7XG4gICAgICB9XG4gICAgICByZXR1cm4gbWF0Y2gucmVwbGFjZSh1cmxFeHAsICckMTxhIGhyZWY9XCIkMlwiJyArIHRhcmdldCArICc+JDI8L2E+Jyk7XG4gICAgfSk7XG4gIH0pO1xuXG5cbiAgLyoqXG4gICAqXG4gICAqL1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ2ludCcsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgdmFsdWUgPSBwYXJzZUludCh2YWx1ZSk7XG4gICAgcmV0dXJuIGlzTmFOKHZhbHVlKSA/IG51bGwgOiB2YWx1ZTtcbiAgfSk7XG5cblxuICAvKipcbiAgICpcbiAgICovXG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcignZmxvYXQnLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHZhbHVlID0gcGFyc2VGbG9hdCh2YWx1ZSk7XG4gICAgcmV0dXJuIGlzTmFOKHZhbHVlKSA/IG51bGwgOiB2YWx1ZTtcbiAgfSk7XG5cblxuICAvKipcbiAgICpcbiAgICovXG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcignYm9vbCcsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlICYmIHZhbHVlICE9PSAnMCcgJiYgdmFsdWUgIT09ICdmYWxzZSc7XG4gIH0pO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBUZW1wbGF0ZTtcbnZhciBWaWV3ID0gcmVxdWlyZSgnLi92aWV3Jyk7XG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnLi91dGlsL2V4dGVuZCcpO1xuXG5cbi8qKlxuICogIyMgVGVtcGxhdGVcbiAqIFRha2VzIGFuIEhUTUwgc3RyaW5nLCBhbiBlbGVtZW50LCBhbiBhcnJheSBvZiBlbGVtZW50cywgb3IgYSBkb2N1bWVudCBmcmFnbWVudCwgYW5kIGNvbXBpbGVzIGl0IGludG8gYSB0ZW1wbGF0ZS5cbiAqIEluc3RhbmNlcyBtYXkgdGhlbiBiZSBjcmVhdGVkIGFuZCBib3VuZCB0byBhIGdpdmVuIGNvbnRleHQuXG4gKiBAcGFyYW0ge1N0cmluZ3xOb2RlTGlzdHxIVE1MQ29sbGVjdGlvbnxIVE1MVGVtcGxhdGVFbGVtZW50fEhUTUxTY3JpcHRFbGVtZW50fE5vZGV9IGh0bWwgQSBUZW1wbGF0ZSBjYW4gYmUgY3JlYXRlZFxuICogZnJvbSBtYW55IGRpZmZlcmVudCB0eXBlcyBvZiBvYmplY3RzLiBBbnkgb2YgdGhlc2Ugd2lsbCBiZSBjb252ZXJ0ZWQgaW50byBhIGRvY3VtZW50IGZyYWdtZW50IGZvciB0aGUgdGVtcGxhdGUgdG9cbiAqIGNsb25lLiBOb2RlcyBhbmQgZWxlbWVudHMgcGFzc2VkIGluIHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoZSBET00uXG4gKi9cbmZ1bmN0aW9uIFRlbXBsYXRlKCkge1xuICB0aGlzLnBvb2wgPSBbXTtcbn1cblxuXG5UZW1wbGF0ZS5wcm90b3R5cGUgPSB7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgdmlldyBjbG9uZWQgZnJvbSB0aGlzIHRlbXBsYXRlLlxuICAgKi9cbiAgY3JlYXRlVmlldzogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMucG9vbC5sZW5ndGgpIHtcbiAgICAgIHJldHVybiB0aGlzLnBvb2wucG9wKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGV4dGVuZC5tYWtlKFZpZXcsIGRvY3VtZW50LmltcG9ydE5vZGUodGhpcywgdHJ1ZSksIHRoaXMpO1xuICB9LFxuXG4gIHJldHVyblZpZXc6IGZ1bmN0aW9uKHZpZXcpIHtcbiAgICBpZiAodGhpcy5wb29sLmluZGV4T2YodmlldykgPT09IC0xKSB7XG4gICAgICB0aGlzLnBvb2wucHVzaCh2aWV3KTtcbiAgICB9XG4gIH1cbn07XG4iLCIvLyBIZWxwZXIgbWV0aG9kcyBmb3IgYW5pbWF0aW9uXG5leHBvcnRzLm1ha2VFbGVtZW50QW5pbWF0YWJsZSA9IG1ha2VFbGVtZW50QW5pbWF0YWJsZTtcbmV4cG9ydHMuZ2V0Q29tcHV0ZWRDU1MgPSBnZXRDb21wdXRlZENTUztcbmV4cG9ydHMuYW5pbWF0ZUVsZW1lbnQgPSBhbmltYXRlRWxlbWVudDtcblxuZnVuY3Rpb24gbWFrZUVsZW1lbnRBbmltYXRhYmxlKGVsZW1lbnQpIHtcbiAgLy8gQWRkIHBvbHlmaWxsIGp1c3Qgb24gdGhpcyBlbGVtZW50XG4gIGlmICghZWxlbWVudC5hbmltYXRlKSB7XG4gICAgZWxlbWVudC5hbmltYXRlID0gYW5pbWF0ZUVsZW1lbnQ7XG4gIH1cblxuICAvLyBOb3QgYSBwb2x5ZmlsbCBidXQgYSBoZWxwZXJcbiAgaWYgKCFlbGVtZW50LmdldENvbXB1dGVkQ1NTKSB7XG4gICAgZWxlbWVudC5nZXRDb21wdXRlZENTUyA9IGdldENvbXB1dGVkQ1NTO1xuICB9XG5cbiAgcmV0dXJuIGVsZW1lbnQ7XG59XG5cbi8qKlxuICogR2V0IHRoZSBjb21wdXRlZCBzdHlsZSBvbiBhbiBlbGVtZW50LlxuICovXG5mdW5jdGlvbiBnZXRDb21wdXRlZENTUyhzdHlsZU5hbWUpIHtcbiAgaWYgKHRoaXMub3duZXJEb2N1bWVudC5kZWZhdWx0Vmlldy5vcGVuZXIpIHtcbiAgICByZXR1cm4gdGhpcy5vd25lckRvY3VtZW50LmRlZmF1bHRWaWV3LmdldENvbXB1dGVkU3R5bGUodGhpcylbc3R5bGVOYW1lXTtcbiAgfVxuICByZXR1cm4gd2luZG93LmdldENvbXB1dGVkU3R5bGUodGhpcylbc3R5bGVOYW1lXTtcbn1cblxuLyoqXG4gKiBWZXJ5IGJhc2ljIHBvbHlmaWxsIGZvciBFbGVtZW50LmFuaW1hdGUgaWYgaXQgZG9lc24ndCBleGlzdC4gSWYgaXQgZG9lcywgdXNlIHRoZSBuYXRpdmUuXG4gKiBUaGlzIG9ubHkgc3VwcG9ydHMgdHdvIGNzcyBzdGF0ZXMuIEl0IHdpbGwgb3ZlcndyaXRlIGV4aXN0aW5nIHN0eWxlcy4gSXQgZG9lc24ndCByZXR1cm4gYW4gYW5pbWF0aW9uIHBsYXkgY29udHJvbC4gSXRcbiAqIG9ubHkgc3VwcG9ydHMgZHVyYXRpb24sIGRlbGF5LCBhbmQgZWFzaW5nLiBSZXR1cm5zIGFuIG9iamVjdCB3aXRoIGEgcHJvcGVydHkgb25maW5pc2guXG4gKi9cbmZ1bmN0aW9uIGFuaW1hdGVFbGVtZW50KGNzcywgb3B0aW9ucykge1xuICBpZiAoIUFycmF5LmlzQXJyYXkoY3NzKSB8fCBjc3MubGVuZ3RoICE9PSAyKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYW5pbWF0ZSBwb2x5ZmlsbCByZXF1aXJlcyBhbiBhcnJheSBmb3IgY3NzIHdpdGggYW4gaW5pdGlhbCBhbmQgZmluYWwgc3RhdGUnKTtcbiAgfVxuXG4gIGlmICghb3B0aW9ucyB8fCAhb3B0aW9ucy5oYXNPd25Qcm9wZXJ0eSgnZHVyYXRpb24nKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2FuaW1hdGUgcG9seWZpbGwgcmVxdWlyZXMgb3B0aW9ucyB3aXRoIGEgZHVyYXRpb24nKTtcbiAgfVxuXG4gIHZhciBkdXJhdGlvbiA9IG9wdGlvbnMuZHVyYXRpb24gfHwgMDtcbiAgdmFyIGRlbGF5ID0gb3B0aW9ucy5kZWxheSB8fCAwO1xuICB2YXIgZWFzaW5nID0gb3B0aW9ucy5lYXNpbmc7XG4gIHZhciBpbml0aWFsQ3NzID0gY3NzWzBdO1xuICB2YXIgZmluYWxDc3MgPSBjc3NbMV07XG4gIHZhciBhbGxDc3MgPSB7fTtcbiAgdmFyIHBsYXliYWNrID0geyBvbmZpbmlzaDogbnVsbCB9O1xuXG4gIE9iamVjdC5rZXlzKGluaXRpYWxDc3MpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgYWxsQ3NzW2tleV0gPSB0cnVlO1xuICAgIGVsZW1lbnQuc3R5bGVba2V5XSA9IGluaXRpYWxDc3Nba2V5XTtcbiAgfSk7XG5cbiAgLy8gdHJpZ2dlciByZWZsb3dcbiAgZWxlbWVudC5vZmZzZXRXaWR0aDtcblxuICB2YXIgdHJhbnNpdGlvbk9wdGlvbnMgPSAnICcgKyBkdXJhdGlvbiArICdtcyc7XG4gIGlmIChlYXNpbmcpIHtcbiAgICB0cmFuc2l0aW9uT3B0aW9ucyArPSAnICcgKyBlYXNpbmc7XG4gIH1cbiAgaWYgKGRlbGF5KSB7XG4gICAgdHJhbnNpdGlvbk9wdGlvbnMgKz0gJyAnICsgZGVsYXkgKyAnbXMnO1xuICB9XG5cbiAgZWxlbWVudC5zdHlsZS50cmFuc2l0aW9uID0gT2JqZWN0LmtleXMoZmluYWxDc3MpLm1hcChmdW5jdGlvbihrZXkpIHtcbiAgICByZXR1cm4ga2V5ICsgdHJhbnNpdGlvbk9wdGlvbnNcbiAgfSkuam9pbignLCAnKTtcblxuICBPYmplY3Qua2V5cyhmaW5hbENzcykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICBhbGxDc3Nba2V5XSA9IHRydWU7XG4gICAgZWxlbWVudC5zdHlsZVtrZXldID0gZmluYWxDc3Nba2V5XTtcbiAgfSk7XG5cbiAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICBPYmplY3Qua2V5cyhhbGxDc3MpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICBlbGVtZW50LnN0eWxlW2tleV0gPSAnJztcbiAgICB9KTtcblxuICAgIGlmIChwbGF5YmFjay5vbmZpbmlzaCkge1xuICAgICAgcGxheWJhY2sub25maW5pc2goKTtcbiAgICB9XG4gIH0sIGR1cmF0aW9uICsgZGVsYXkpO1xuXG4gIHJldHVybiBwbGF5YmFjaztcbn1cbiIsInZhciBnbG9iYWwgPSAoZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzIH0pKCk7XG52YXIgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG5tb2R1bGUuZXhwb3J0cyA9IGV4dGVuZDtcbmV4dGVuZC5tYWtlID0gbWFrZTtcblxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgcHJvdG90eXBlIGZvciB0aGUgZ2l2ZW4gY29udHJ1Y3RvciBhbmQgc2V0cyBhbiBgZXh0ZW5kYCBtZXRob2Qgb24gaXQuIElmIGBleHRlbmRgIGlzIGNhbGxlZCBmcm9tIGFcbiAqIGl0IHdpbGwgZXh0ZW5kIHRoYXQgY2xhc3MuXG4gKi9cbmZ1bmN0aW9uIGV4dGVuZChjb25zdHJ1Y3RvciwgcHJvdG90eXBlKSB7XG4gIHZhciBzdXBlckNsYXNzID0gdGhpcyA9PT0gZ2xvYmFsID8gT2JqZWN0IDogdGhpcztcbiAgaWYgKHR5cGVvZiBjb25zdHJ1Y3RvciAhPT0gJ2Z1bmN0aW9uJyAmJiAhcHJvdG90eXBlKSB7XG4gICAgcHJvdG90eXBlID0gY29uc3RydWN0b3I7XG4gICAgY29uc3RydWN0b3IgPSBmdW5jdGlvbigpIHtcbiAgICAgIHN1cGVyQ2xhc3MuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9XG4gIGNvbnN0cnVjdG9yLmV4dGVuZCA9IGV4dGVuZDtcbiAgdmFyIGRlc2NyaXB0b3JzID0gZ2V0UHJvdG90eXBlRGVzY3JpcHRvcnMoY29uc3RydWN0b3IsIHByb3RvdHlwZSk7XG4gIGNvbnN0cnVjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDbGFzcy5wcm90b3R5cGUsIGRlc2NyaXB0b3JzKTtcbiAgcmV0dXJuIGNvbnN0cnVjdG9yO1xufVxuXG5cbi8qKlxuICogTWFrZXMgYSBuYXRpdmUgb2JqZWN0IHByZXRlbmQgdG8gYmUgYSBjbGFzcyAoZS5nLiBhZGRzIG1ldGhvZHMgdG8gYSBEb2N1bWVudEZyYWdtZW50IGFuZCBjYWxscyB0aGUgY29uc3RydWN0b3IpLlxuICovXG5mdW5jdGlvbiBtYWtlKGNvbnN0cnVjdG9yLCBvYmplY3QpIHtcbiAgaWYgKHR5cGVvZiBjb25zdHJ1Y3RvciAhPT0gJ2Z1bmN0aW9uJyB8fCB0eXBlb2Ygb2JqZWN0ICE9PSAnb2JqZWN0Jykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ21ha2UgbXVzdCBhY2NlcHQgYSBmdW5jdGlvbiBjb25zdHJ1Y3RvciBhbmQgYW4gb2JqZWN0Jyk7XG4gIH1cbiAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gIHZhciBwcm90byA9IGNvbnN0cnVjdG9yLnByb3RvdHlwZTtcbiAgZm9yICh2YXIga2V5IGluIHByb3RvKSB7XG4gICAgb2JqZWN0W2tleV0gPSBwcm90b1trZXldO1xuICB9XG4gIGNvbnN0cnVjdG9yLmFwcGx5KG9iamVjdCwgYXJncyk7XG4gIHJldHVybiBvYmplY3Q7XG59XG5cblxuZnVuY3Rpb24gZ2V0UHJvdG90eXBlRGVzY3JpcHRvcnMoY29uc3RydWN0b3IsIHByb3RvdHlwZSkge1xuICB2YXIgZGVzY3JpcHRvcnMgPSB7XG4gICAgY29uc3RydWN0b3I6IHsgd3JpdGFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSwgdmFsdWU6IGNvbnN0cnVjdG9yIH1cbiAgfTtcblxuICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhwcm90b3R5cGUpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihwcm90b3R5cGUsIG5hbWUpO1xuICAgIGRlc2NyaXB0b3IuZW51bWVyYWJsZSA9IGZhbHNlO1xuICAgIGRlc2NyaXB0b3JzW25hbWVdID0gZGVzY3JpcHRvcjtcbiAgfSk7XG4gIHJldHVybiBkZXNjcmlwdG9ycztcbn1cbiIsIlxuXG5cbi8vIFBvbHlmaWxsIG1hdGNoZXNcbmlmICghRWxlbWVudC5wcm90b3R5cGUubWF0Y2hlcykge1xuICBFbGVtZW50LnByb3RvdHlwZS5tYXRjaGVzID1cbiAgICBFbGVtZW50LnByb3RvdHlwZS5tYXRjaGVzU2VsZWN0b3IgfHxcbiAgICBFbGVtZW50LnByb3RvdHlwZS53ZWJraXRNYXRjaGVzU2VsZWN0b3IgfHxcbiAgICBFbGVtZW50LnByb3RvdHlwZS5tb3pNYXRjaGVzU2VsZWN0b3IgfHxcbiAgICBFbGVtZW50LnByb3RvdHlwZS5tc01hdGNoZXNTZWxlY3RvciB8fFxuICAgIEVsZW1lbnQucHJvdG90eXBlLm9NYXRjaGVzU2VsZWN0b3I7XG59XG5cbi8vIFBvbHlmaWxsIGNsb3Nlc3RcbmlmICghRWxlbWVudC5wcm90b3R5cGUuY2xvc2VzdCkge1xuICBFbGVtZW50LnByb3RvdHlwZS5jbG9zZXN0ID0gZnVuY3Rpb24gY2xvc2VzdChzZWxlY3Rvcikge1xuICAgIHZhciBlbGVtZW50ID0gdGhpcztcbiAgICBkbyB7XG4gICAgICBpZiAoZWxlbWVudC5tYXRjaGVzKHNlbGVjdG9yKSkge1xuICAgICAgICByZXR1cm4gZWxlbWVudDtcbiAgICAgIH1cbiAgICB9IHdoaWxlICgoZWxlbWVudCA9IGVsZW1lbnQucGFyZW50Tm9kZSkgJiYgZWxlbWVudC5ub2RlVHlwZSA9PT0gTm9kZS5FTEVNRU5UX05PREUpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHRvRnJhZ21lbnQ7XG5cbi8vIENvbnZlcnQgc3R1ZmYgaW50byBkb2N1bWVudCBmcmFnbWVudHMuIFN0dWZmIGNhbiBiZTpcbi8vICogQSBzdHJpbmcgb2YgSFRNTCB0ZXh0XG4vLyAqIEFuIGVsZW1lbnQgb3IgdGV4dCBub2RlXG4vLyAqIEEgTm9kZUxpc3Qgb3IgSFRNTENvbGxlY3Rpb24gKGUuZy4gYGVsZW1lbnQuY2hpbGROb2Rlc2Agb3IgYGVsZW1lbnQuY2hpbGRyZW5gKVxuLy8gKiBBIGpRdWVyeSBvYmplY3Rcbi8vICogQSBzY3JpcHQgZWxlbWVudCB3aXRoIGEgYHR5cGVgIGF0dHJpYnV0ZSBvZiBgXCJ0ZXh0LypcImAgKGUuZy4gYDxzY3JpcHQgdHlwZT1cInRleHQvaHRtbFwiPk15IHRlbXBsYXRlIGNvZGUhPC9zY3JpcHQ+YClcbi8vICogQSB0ZW1wbGF0ZSBlbGVtZW50IChlLmcuIGA8dGVtcGxhdGU+TXkgdGVtcGxhdGUgY29kZSE8L3RlbXBsYXRlPmApXG5mdW5jdGlvbiB0b0ZyYWdtZW50KGh0bWwpIHtcbiAgaWYgKGh0bWwgaW5zdGFuY2VvZiBEb2N1bWVudEZyYWdtZW50KSB7XG4gICAgcmV0dXJuIGh0bWw7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGh0bWwgPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIHN0cmluZ1RvRnJhZ21lbnQoaHRtbCk7XG4gIH0gZWxzZSBpZiAoaHRtbCBpbnN0YW5jZW9mIE5vZGUpIHtcbiAgICByZXR1cm4gbm9kZVRvRnJhZ21lbnQoaHRtbCk7XG4gIH0gZWxzZSBpZiAoJ2xlbmd0aCcgaW4gaHRtbCkge1xuICAgIHJldHVybiBsaXN0VG9GcmFnbWVudChodG1sKTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbnN1cHBvcnRlZCBUZW1wbGF0ZSBUeXBlOiBDYW5ub3QgY29udmVydCBgJyArIGh0bWwgKyAnYCBpbnRvIGEgZG9jdW1lbnQgZnJhZ21lbnQuJyk7XG4gIH1cbn1cblxuLy8gQ29udmVydHMgYW4gSFRNTCBub2RlIGludG8gYSBkb2N1bWVudCBmcmFnbWVudC4gSWYgaXQgaXMgYSA8dGVtcGxhdGU+IG5vZGUgaXRzIGNvbnRlbnRzIHdpbGwgYmUgdXNlZC4gSWYgaXQgaXMgYVxuLy8gPHNjcmlwdD4gbm9kZSBpdHMgc3RyaW5nLWJhc2VkIGNvbnRlbnRzIHdpbGwgYmUgY29udmVydGVkIHRvIEhUTUwgZmlyc3QsIHRoZW4gdXNlZC4gT3RoZXJ3aXNlIGEgY2xvbmUgb2YgdGhlIG5vZGVcbi8vIGl0c2VsZiB3aWxsIGJlIHVzZWQuXG5mdW5jdGlvbiBub2RlVG9GcmFnbWVudChub2RlKSB7XG4gIGlmIChub2RlLmNvbnRlbnQgaW5zdGFuY2VvZiBEb2N1bWVudEZyYWdtZW50KSB7XG4gICAgcmV0dXJuIG5vZGUuY29udGVudDtcbiAgfSBlbHNlIGlmIChub2RlLnRhZ05hbWUgPT09ICdTQ1JJUFQnKSB7XG4gICAgcmV0dXJuIHN0cmluZ1RvRnJhZ21lbnQobm9kZS5pbm5lckhUTUwpO1xuICB9IGVsc2Uge1xuICAgIHZhciBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICBpZiAobm9kZS50YWdOYW1lID09PSAnVEVNUExBVEUnKSB7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbCA9IG5vZGUuY2hpbGROb2Rlcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQobm9kZS5jaGlsZE5vZGVzW2ldKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQobm9kZSk7XG4gICAgfVxuICAgIHJldHVybiBmcmFnbWVudDtcbiAgfVxufVxuXG4vLyBDb252ZXJ0cyBhbiBIVE1MQ29sbGVjdGlvbiwgTm9kZUxpc3QsIGpRdWVyeSBvYmplY3QsIG9yIGFycmF5IGludG8gYSBkb2N1bWVudCBmcmFnbWVudC5cbmZ1bmN0aW9uIGxpc3RUb0ZyYWdtZW50KGxpc3QpIHtcbiAgdmFyIGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IGxpc3QubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgLy8gVXNlIHRvRnJhZ21lbnQgc2luY2UgdGhpcyBtYXkgYmUgYW4gYXJyYXkgb2YgdGV4dCwgYSBqUXVlcnkgb2JqZWN0IG9mIGA8dGVtcGxhdGU+YHMsIGV0Yy5cbiAgICBmcmFnbWVudC5hcHBlbmRDaGlsZCh0b0ZyYWdtZW50KGxpc3RbaV0pKTtcbiAgICBpZiAobCA9PT0gbGlzdC5sZW5ndGggKyAxKSB7XG4gICAgICAvLyBhZGp1c3QgZm9yIE5vZGVMaXN0cyB3aGljaCBhcmUgbGl2ZSwgdGhleSBzaHJpbmsgYXMgd2UgcHVsbCBub2RlcyBvdXQgb2YgdGhlIERPTVxuICAgICAgaS0tO1xuICAgICAgbC0tO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZnJhZ21lbnQ7XG59XG5cbi8vIENvbnZlcnRzIGEgc3RyaW5nIG9mIEhUTUwgdGV4dCBpbnRvIGEgZG9jdW1lbnQgZnJhZ21lbnQuXG5mdW5jdGlvbiBzdHJpbmdUb0ZyYWdtZW50KHN0cmluZykge1xuICBpZiAoIXN0cmluZykge1xuICAgIHZhciBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICBmcmFnbWVudC5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJykpO1xuICAgIHJldHVybiBmcmFnbWVudDtcbiAgfVxuICB2YXIgdGVtcGxhdGVFbGVtZW50O1xuICB0ZW1wbGF0ZUVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZW1wbGF0ZScpO1xuICB0ZW1wbGF0ZUVsZW1lbnQuaW5uZXJIVE1MID0gc3RyaW5nO1xuICByZXR1cm4gdGVtcGxhdGVFbGVtZW50LmNvbnRlbnQ7XG59XG5cbi8vIElmIEhUTUwgVGVtcGxhdGVzIGFyZSBub3QgYXZhaWxhYmxlIChlLmcuIGluIElFKSB0aGVuIHVzZSBhbiBvbGRlciBtZXRob2QgdG8gd29yayB3aXRoIGNlcnRhaW4gZWxlbWVudHMuXG5pZiAoIWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RlbXBsYXRlJykuY29udGVudCBpbnN0YW5jZW9mIERvY3VtZW50RnJhZ21lbnQpIHtcbiAgc3RyaW5nVG9GcmFnbWVudCA9IChmdW5jdGlvbigpIHtcbiAgICB2YXIgdGFnRXhwID0gLzwoW1xcdzotXSspLztcblxuICAgIC8vIENvcGllZCBmcm9tIGpRdWVyeSAoaHR0cHM6Ly9naXRodWIuY29tL2pxdWVyeS9qcXVlcnkvYmxvYi9tYXN0ZXIvTElDRU5TRS50eHQpXG4gICAgdmFyIHdyYXBNYXAgPSB7XG4gICAgICBvcHRpb246IFsgMSwgJzxzZWxlY3QgbXVsdGlwbGU9XCJtdWx0aXBsZVwiPicsICc8L3NlbGVjdD4nIF0sXG4gICAgICBsZWdlbmQ6IFsgMSwgJzxmaWVsZHNldD4nLCAnPC9maWVsZHNldD4nIF0sXG4gICAgICB0aGVhZDogWyAxLCAnPHRhYmxlPicsICc8L3RhYmxlPicgXSxcbiAgICAgIHRyOiBbIDIsICc8dGFibGU+PHRib2R5PicsICc8L3Rib2R5PjwvdGFibGU+JyBdLFxuICAgICAgdGQ6IFsgMywgJzx0YWJsZT48dGJvZHk+PHRyPicsICc8L3RyPjwvdGJvZHk+PC90YWJsZT4nIF0sXG4gICAgICBjb2w6IFsgMiwgJzx0YWJsZT48dGJvZHk+PC90Ym9keT48Y29sZ3JvdXA+JywgJzwvY29sZ3JvdXA+PC90YWJsZT4nIF0sXG4gICAgICBhcmVhOiBbIDEsICc8bWFwPicsICc8L21hcD4nIF0sXG4gICAgICBfZGVmYXVsdDogWyAwLCAnJywgJycgXVxuICAgIH07XG4gICAgd3JhcE1hcC5vcHRncm91cCA9IHdyYXBNYXAub3B0aW9uO1xuICAgIHdyYXBNYXAudGJvZHkgPSB3cmFwTWFwLnRmb290ID0gd3JhcE1hcC5jb2xncm91cCA9IHdyYXBNYXAuY2FwdGlvbiA9IHdyYXBNYXAudGhlYWQ7XG4gICAgd3JhcE1hcC50aCA9IHdyYXBNYXAudGQ7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gc3RyaW5nVG9GcmFnbWVudChzdHJpbmcpIHtcbiAgICAgIGlmICghc3RyaW5nKSB7XG4gICAgICAgIHZhciBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpKTtcbiAgICAgICAgcmV0dXJuIGZyYWdtZW50O1xuICAgICAgfVxuICAgICAgdmFyIHRhZyA9IHN0cmluZy5tYXRjaCh0YWdFeHApO1xuICAgICAgdmFyIHBhcnRzID0gd3JhcE1hcFt0YWddIHx8IHdyYXBNYXAuX2RlZmF1bHQ7XG4gICAgICB2YXIgZGVwdGggPSBwYXJ0c1swXTtcbiAgICAgIHZhciBwcmVmaXggPSBwYXJ0c1sxXTtcbiAgICAgIHZhciBwb3N0Zml4ID0gcGFydHNbMl07XG4gICAgICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICBkaXYuaW5uZXJIVE1MID0gcHJlZml4ICsgc3RyaW5nICsgcG9zdGZpeDtcbiAgICAgIHdoaWxlIChkZXB0aC0tKSB7XG4gICAgICAgIGRpdiA9IGRpdi5sYXN0Q2hpbGQ7XG4gICAgICB9XG4gICAgICB2YXIgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgICB3aGlsZSAoZGl2LmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQoZGl2LmZpcnN0Q2hpbGQpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZyYWdtZW50O1xuICAgIH07XG4gIH0pKCk7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFZpZXc7XG5cblxuLyoqXG4gKiAjIyBWaWV3XG4gKiBBIERvY3VtZW50RnJhZ21lbnQgd2l0aCBiaW5kaW5ncy5cbiAqL1xuZnVuY3Rpb24gVmlldyh0ZW1wbGF0ZSkge1xuICB0aGlzLnRlbXBsYXRlID0gdGVtcGxhdGU7XG4gIHRoaXMuYmluZGluZ3MgPSB0aGlzLnRlbXBsYXRlLmJpbmRpbmdzLm1hcChmdW5jdGlvbihiaW5kaW5nKSB7XG4gICAgcmV0dXJuIGJpbmRpbmcuY2xvbmVGb3JWaWV3KHRoaXMpO1xuICB9LCB0aGlzKTtcbiAgdGhpcy5maXJzdFZpZXdOb2RlID0gdGhpcy5maXJzdENoaWxkO1xuICB0aGlzLmxhc3RWaWV3Tm9kZSA9IHRoaXMubGFzdENoaWxkO1xuICBpZiAodGhpcy5maXJzdFZpZXdOb2RlKSB7XG4gICAgdGhpcy5maXJzdFZpZXdOb2RlLnZpZXcgPSB0aGlzO1xuICAgIHRoaXMubGFzdFZpZXdOb2RlLnZpZXcgPSB0aGlzO1xuICB9XG59XG5cblxuVmlldy5wcm90b3R5cGUgPSB7XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgYSB2aWV3IGZyb20gdGhlIERPTS4gQSB2aWV3IGlzIGEgRG9jdW1lbnRGcmFnbWVudCwgc28gYHJlbW92ZSgpYCByZXR1cm5zIGFsbCBpdHMgbm9kZXMgdG8gaXRzZWxmLlxuICAgKi9cbiAgcmVtb3ZlOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgbm9kZSA9IHRoaXMuZmlyc3RWaWV3Tm9kZTtcbiAgICB2YXIgbmV4dDtcblxuICAgIGlmIChub2RlLnBhcmVudE5vZGUgIT09IHRoaXMpIHtcbiAgICAgIC8vIFJlbW92ZSBhbGwgdGhlIG5vZGVzIGFuZCBwdXQgdGhlbSBiYWNrIGludG8gdGhpcyBmcmFnbWVudFxuICAgICAgd2hpbGUgKG5vZGUpIHtcbiAgICAgICAgbmV4dCA9IChub2RlID09PSB0aGlzLmxhc3RWaWV3Tm9kZSkgPyBudWxsIDogbm9kZS5uZXh0U2libGluZztcbiAgICAgICAgdGhpcy5hcHBlbmRDaGlsZChub2RlKTtcbiAgICAgICAgbm9kZSA9IG5leHQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cblxuICAvKipcbiAgICogUmVtb3ZlcyBhIHZpZXcgKGlmIG5vdCBhbHJlYWR5IHJlbW92ZWQpIGFuZCBhZGRzIHRoZSB2aWV3IHRvIGl0cyB0ZW1wbGF0ZSdzIHBvb2wuXG4gICAqL1xuICBkaXNwb3NlOiBmdW5jdGlvbigpIHtcbiAgICAvLyBNYWtlIHN1cmUgdGhlIHZpZXcgaXMgcmVtb3ZlZCBmcm9tIHRoZSBET01cbiAgICB0aGlzLmJpbmRpbmdzLmZvckVhY2goZnVuY3Rpb24oYmluZGluZykge1xuICAgICAgYmluZGluZy5kaXNwb3NlKCk7XG4gICAgfSk7XG5cbiAgICB0aGlzLnJlbW92ZSgpO1xuICAgIGlmICh0aGlzLnRlbXBsYXRlKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLnJldHVyblZpZXcodGhpcyk7XG4gICAgfVxuICB9LFxuXG5cbiAgLyoqXG4gICAqIEJpbmRzIGEgdmlldyB0byBhIGdpdmVuIGNvbnRleHQuXG4gICAqL1xuICBiaW5kOiBmdW5jdGlvbihjb250ZXh0KSB7XG4gICAgdGhpcy5iaW5kaW5ncy5mb3JFYWNoKGZ1bmN0aW9uKGJpbmRpbmcpIHtcbiAgICAgIGJpbmRpbmcuYmluZChjb250ZXh0KTtcbiAgICB9KTtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBVbmJpbmRzIGEgdmlldyBmcm9tIGFueSBjb250ZXh0LlxuICAgKi9cbiAgdW5iaW5kOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmJpbmRpbmdzLmZvckVhY2goZnVuY3Rpb24oYmluZGluZykge1xuICAgICAgYmluZGluZy51bmJpbmQoKTtcbiAgICB9KTtcbiAgfVxufTtcbiJdfQ==
