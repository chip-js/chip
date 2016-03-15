var Route = require('routes-js').Route;
var IfBinder = require('fragments-built-ins/binders/if');

module.exports = function() {
  var ifBinder = IfBinder();
  var bound = ifBinder.bound;
  var unbound = ifBinder.unbound;

  ifBinder.compiled = function() {
    var noRoute;
    this.app = this.fragments.app;
    this.routes = [];
    this.templates = [];
    this.expression = '';

    // each child with a [path] attribute will display only when its path matches the URL
    while (this.element.firstChild) {
      var child = this.element.firstChild;
      this.element.removeChild(child);

      if (child.nodeType !== Node.ELEMENT_NODE) {
        continue;
      }

      if (child.hasAttribute('[path]')) {
        var path = child.getAttribute('[path]');
        child.removeAttribute('[path]');
        this.routes.push(new Route(path));
        this.templates.push(this.fragments.createTemplate(child));
      } else if (child.hasAttribute('[noroute]')) {
        child.removeAttribute('[noroute]');
        noRoute = this.fragments.createTemplate(child);
      }
    }

    if (noRoute) {
      this.templates.push(noRoute);
    }
  };

  ifBinder.add = function(view) {
    view.bind(this.context);
    this.element.appendChild(view);
  };

  ifBinder.created = function() {
    this.onUrlChange = this.onUrlChange.bind(this);
  };


  ifBinder.bound = function() {
    bound.call(this);

    // Wait until everything is put in the DOM
    this.fragments.afterSync(function() {
      var node = this.element.parentNode;
      while (node && !node.matchedRoutePath) {
        node = node.parentNode;
      }
      this.baseURI = node && node.matchedRoutePath || '';

      this.app.on('urlChange', this.onUrlChange);
      if (this.app.listening) {
        this.onUrlChange();
      }

    }.bind(this));
  };

  ifBinder.unbound = function() {
    unbound.call(this);
    this.currentIndex = undefined;
    this.app.off('urlChange', this.onUrlChange);
  };

  ifBinder.onUrlChange = function() {
    if (this.element.baseURI === null) {
      // element.baseURI is null if it isn't in the DOM yet
      // If this is just getting inserted into the DOM wait for this.baseURI to be set
      setTimeout(function() {
        if (!this.context) return;
        this.checkForChange();
      }.bind(this));
    } else {
      this.checkForChange();
    }
  };

  ifBinder.checkForChange = function() {
    var fullUrl = this.app.path;
    var localUrl = null;
    var newIndex = this.routes.length;

    if (fullUrl.indexOf(this.baseURI) === 0) {
      localUrl = fullUrl.replace(this.baseURI, '');
    }

    if (localUrl !== null) {

      var matched = this.routes.some(function(route, index) {
        if (route.match(localUrl)) {
          if (route.params.hasOwnProperty('*') && route.params['*']) {
            var afterLength = route.params['*'].length;
            this.element.matchedRoutePath = this.baseURI + localUrl.slice(0, -afterLength);
          } else {
            this.element.matchedRoutePath = fullUrl;
          }
          var params = this.context.params = route.params;
          var query = this.app.query;
          Object.keys(query).forEach(function(key) {
            if (!params.hasOwnProperty(key)) {
              params[key] = query[key];
            }
          });

          newIndex = index;
          return true;
        }
      }, this);

      if (matched) {
        this.element.dispatchEvent(new Event('routed'));
      }

    }

    if (newIndex !== this.currentIndex) {
      this.currentIndex = newIndex;
      this.updated(this.currentIndex);
    }
  };

  return ifBinder;
};
