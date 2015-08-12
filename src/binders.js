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
