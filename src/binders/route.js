var Route = require('routes-js').Route;
var IfBinder = require('fragments-built-ins/binders/if');

module.exports = function() {
  var ifBinder = IfBinder();

  ifBinder.compiled = function() {
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
        this.routes.push(new Route(path + '*'));
        this.templates.push(this.fragments.createTemplate(child));
      } else if (child.hasAttribute('[noroute]')) {
        child.removeAttribute('[noroute]');
        this.templates[0] = this.fragments.createTemplate(child);
      }
    }
  };

  ifBinder.add = function(view) {
    this.element.appendChild(view);
  };

  ifBinder.created = function() {
    this.onUrlChange = this.onUrlChange.bind(this);
  };

  var bound = ifBinder.bound;
  ifBinder.bound = function() {
    bound.call(this);
    var node = this.element.parentNode;
    while (node && node.matchedRoutePath) {
      node = node.parentNode;
    }
    this.baseURI = node.matchedRoutePath || '';
    this.app.on('urlChange', this.onUrlChange);
    if (this.app.listening) {
      this.onUrlChange();
    }
  };

  ifBinder.onUrlChange = function() {
    var url = this.app.location.url;
    var newIndex;

    if (url.indexOf(this.baseURI) === 0) {
      url = url.replace(this.baseURI, '');
    } else {
      // no routes should match this url since it isn't within our subpath
      url = null;
    }

    if (url !== null) {
      this.routes.some(function(route, index) {
        if (route.match(url)) {
          var afterLength = route.params['*'].length;
          this.matchedRoutePath = afterLength ? url.slice(0, -afterLength) : url;
          this.context.params = route.params;
          newIndex = index;
          return true;
        }
      }, this);
    }

    if (newIndex !== this.currentIndex) {
      this.currentIndex = newIndex;
      this.updated(this.currentIndex);
    }
  };

  return ifBinder;
};
