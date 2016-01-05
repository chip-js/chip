module.exports = App;
var componentBinding = require('fragments-built-ins/binders/component');
var routes = require('routes-js');
var EventTarget = require('chip-utils/event-target');
var createFragments = require('./fragments');
var slice = Array.prototype.slice;

// # Chip App

// An App represents an app or module that can have routes, controllers, and templates defined.
function App(options) {
  options = options || {};
  EventTarget.call(this);
  this.fragments = createFragments();
  this.router = routes.create(options);
  this.components = {};

  this.rootElement = options.rootElement || document.documentElement;
  this.sync = this.fragments.sync;
  this.syncNow = this.fragments.syncNow;
  this.afterSync = this.fragments.afterSync;
  this.onSync = this.fragments.onSync;
  this.offSync = this.fragments.offSync;
  this.router.on('error', function(event) {
    this.dispatchEvent(new CustomEvent('routeError', { detail: event.detail }));
  }, this);
}

EventTarget.extend(App, {

  initApp: function(root) {
    if (this.inited) {
      return;
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', this.initApp.bind(this, root));
      return;
    }

    this.inited = true
    if (root) {
      this.rootElement = root;
    }

    this.fragments.bindElement(this.rootElement, this);
    return this;
  },


  // Components
  // ----------

  // Registers a new component by name with the given definition. provided `content` string. If no `content` is given
  // then returns a new instance of a defined template. This instance is a document fragment.
  registerComponent: function(name, ComponentClass) {
    this.fragments.registerElement(name, ComponentClass.getBinder(this));
    this.components[name] = ComponentClass;
    return this;
  },

  createComponent: function(name) {
    var component = this.components[name];
    if (typeof component !== 'function') {
      throw new TypeError('a component has not been registered by the name "' + name + '"');
    }
  },


  // Routing
  // ------

  // When the given URL `path` is hit in the browser URL the `component` will be loaded into the available [route]. The
  // route `name` is used to load the template and controller by the same name. This template will be placed in the
  // first element on page with a `bind-route` attribute.
  route: function(path, component, subroutes, runBefore) {
    var app = this.app;
    var callback;

    if (typeof path !== 'string' || path.charAt(0) !== '/') {
      throw new TypeError('route path must be a string-based path e.g. "/" or "/foo/:bar"');
    }

    if (typeof component !== 'string') {
      throw new TypeError('route component must be the name of a registered component');
    }



    if (typeof handler === 'string') {
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

  },


  // Redirects to the provided URL
  redirect: function(url) {
    return this.router.redirect(url);
  },


  // Listen to URL changes
  listen: function(options) {
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
  }

});