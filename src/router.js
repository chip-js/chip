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
