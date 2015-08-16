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
