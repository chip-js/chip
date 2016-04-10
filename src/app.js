module.exports = App;
var componentBinding = require('fragments-built-ins/binders/component');
var Component = require('fragments-built-ins/binders/component-definition');
var Location = require('routes-js').Location;
var EventTarget = require('chip-utils/event-target');
var fragments = require('fragments-js');
var defaultOptions = require('./default-options')
var defaultMixin = require('./mixins/default');
var slice = Array.prototype.slice;

// # Chip App

// An App represents an app or module that can have routes, controllers, and templates defined.
function App(options) {
  options = Object.assign({}, defaultOptions, options);
  options.binders = Object.assign({}, defaultOptions.binders, options.binders);
  options.formatters = Object.assign({}, defaultOptions.formatters, options.formatters);
  options.animations = Object.assign({}, defaultOptions.animations, options.animations);
  options.components = Object.assign({}, defaultOptions.components, options.components);

  EventTarget.call(this);
  this.fragments = fragments.create(options);
  this.components = {};
  this.fragments.app = this;
  this.location = Location.create(options);
  this.defaultMixin = defaultMixin(this);
  this._listening = false;
  this.useCustomElements = options.useCustomElements;

  this.rootElement = options.rootElement || document.documentElement;
  this.sync = this.fragments.sync;
  this.syncNow = this.fragments.syncNow;
  this.afterSync = this.fragments.afterSync;
  this.onSync = this.fragments.onSync;
  this.offSync = this.fragments.offSync;
  this.observations = this.fragments.observations;
  this.computed = this.observations.computed;
  this.observe = this.fragments.observe.bind(this.fragments);
  this.location.on('change', this.sync);

  this.fragments.setExpressionDelimiters('attribute', '{{', '}}', !options.curliesInAttributes);
  this.fragments.animateAttribute = options.animateAttribute;

  Object.keys(options.components).forEach(function(name) {
    this.component(name, options.components[name]);
  }, this);
}

EventTarget.extend(App, {

  init: function(root) {
    if (this.inited) {
      return;
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', this.init.bind(this, root));
      return;
    }

    this.inited = true
    if (root) {
      this.rootElement = root;
    }

    this.fragments.bindElement(this.rootElement, this);
    this.rootElement.attached();
    return this;
  },


  // Components
  // ----------

  // Registers a new component by name with the given definition. provided `content` string. If no `content` is given
  // then returns a new instance of a defined template. This instance is a document fragment.
  component: function(name, definition) {
    if (arguments.length === 1) {
      return this.components[name];
    }

    var ComponentClass;
    if (definition.prototype instanceof Component) {
      ComponentClass = definition;
    } else {
      var definitions = slice.call(arguments, 1);
      definitions.unshift(this.defaultMixin);
      ComponentClass = Component.extend.apply(Component, definitions);
    }

    ComponentClass.prototype.name = name;
    this.components[name] = ComponentClass;
    this.fragments.registerElement(name, componentBinding(ComponentClass));
    return this;
  },


  // Register an attribute binder with this application.
  binder: function(name, binder) {
    if (arguments.length === 1) {
      return this.fragments.getAttributeBinder(name);
    } else {
      return this.fragments.registerAttribute(name, binder);
    }
  },


  // Register a formatter with this application
  formatter: function(name, formatter) {
    if (arguments.length === 1) {
      return this.fragments.getFormatter(name);
    } else {
      return this.fragments.registerFormatter(name, formatter);
    }
  },


  // Register an animation with this application
  animation: function(name, animation) {
    if (arguments.length === 1) {
      return this.fragments.getAnimation(name);
    } else {
      return this.fragments.registerAnimation(name, animation);
    }
  },


  // Redirects to the provided URL
  redirect: function(url, replace) {
    return this.location.redirect(url, replace);
  },


  get listening() {
    return this._listening;
  },

  // Listen to URL changes
  listen: function() {
    var app = this;
    this._listening = true;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', this.listen.bind(this));
      return this;
    }

    // Add handler for when the route changes
    this._locationChangeHandler = function(event) {
      app.url = event.detail.url;
      app.path = event.detail.path;
      app.query = event.detail.query;
      app.dispatchEvent(new CustomEvent('urlChange', { detail: event.detail }));
    };

    // Add handler for clicking links
    this._clickHandler = function(event) {
      var anchor;
      if ( !(anchor = event.target.closest('a[href]')) ) {
        return;
      }

      if (event.defaultPrevented ||
        location.protocol !== anchor.protocol ||
        location.host !== anchor.host.replace(/:80$|:443$/, ''))
      {
        // if something else already handled this, we won't
        // if it is for another protocol or domain, we won't
        return;
      }

      var url = anchor.getAttribute('href').replace(/^#/, '');

      if (event.metaKey || event.ctrlKey || anchor.hasAttribute('target')) {
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

    this.location.on('change', this._locationChangeHandler);
    this.rootElement.addEventListener('click', this._clickHandler);
    this.url = this.location.url;
    this.path = this.location.path;
    this.query = this.location.query;
    this.dispatchEvent(new CustomEvent('urlChange', { detail: {
      url: this.url,
      path: this.path,
      query: this.query
    }}));
  },

  // Stop listening
  stop: function() {
    this.location.off('change', this._locationChangeHandler);
    this.rootElement.removeEventListener('click', this._clickHandler);
  }

});

if (typeof Object.assign !== 'function') {
  (function () {
    Object.assign = function (target) {
      'use strict';
      if (target === undefined || target === null) {
        throw new TypeError('Cannot convert undefined or null to object');
      }

      var output = Object(target);
      for (var index = 1; index < arguments.length; index++) {
        var source = arguments[index];
        if (source !== undefined && source !== null) {
          for (var nextKey in source) {
            if (source.hasOwnProperty(nextKey)) {
              output[nextKey] = source[nextKey];
            }
          }
        }
      }
      return output;
    };
  })();
}
