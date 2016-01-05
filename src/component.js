var Class = require('chip-utils/class');


function Component() {

}

Class.extend(Component, {
  static: {
    onExtend: function(Subclass, prototypes) {
      Object.defineProperty(Subclass, 'prototypes', { value: prototypes });
    }
  },

  created: function() {

  },

  attached: function() {

  },

  detached: function() {

  },

  on: function(type, listener) {
    this.addEventListener(type, listener);
  },

  off: function(type, listener) {
    this.removeEventListener(type, listener);
    if (listener && listener.__event_one) {
      this.removeEventListener(type, listener.__event_one);
    }
  },

  // Add event listener to only get called once, returns wrapped method for removing if needed
  one: function(type, listener) {
    if (typeof listener !== 'function') return;

    if (!listener.__event_one) {
      var self = this;
      Object.defineProperty(listener, '__event_one', { value: function(event) {
        self.removeEventListener(type, listener.__event_one);
        listener.call(self, event);
      }});
    }

    this.addEventListener(type, listener.__event_one);
  }

});


Component.getBinder = function(app) {
  var ComponentClass = this, template;
  if (ComponentClass.prototype.template) {
    template = this.fragments.createTemplate(ComponentClass.prototype.template);
  }

  // Returns a binder for this component class. Subclasses of Component will inherit this.
  return {
    compiled: function() {
      if (this.element.childNodes.length) {
        // Use the contents of this component to be inserted within it
        this.contentTemplate = this.fragments.createTemplate(this.element.childNodes);
      }
    },

    created: function() {
      if (this.contentTemplate) {
        this.content = this.contentTemplate.createView();
      }

      if (template) {
        this.view = template.createView();
        this.element.appendChild(this.view);
        if (this.content) {
          this._componentContent = this.content;
        }
      } else if (this.content) {
        this.element.appendChild(this.content);
      }

      this.element.app = app;
      ComponentClass.makeInstanceOf(this.element);

      // Call created on all mixins
      ComponentClass.prototypes.forEach(function(prototype) {
        if (typeof prototype.created === 'function') {
          prototype.created.call(this.element);
        }
      }, this);
    },

    bound: function() {
      if (this.view) this.view.bind(this.element);
      if (this.content) this.content.bind(this.context);

      // Call attached on all mixins
      ComponentClass.prototypes.forEach(function(prototype) {
        if (typeof prototype.attached === 'function') {
          prototype.attached.call(this.element);
        }
      }, this);
    },

    unbound: function() {
      if (this.content) this.content.unbind();
      if (this.view) this.view.unbind();

      // Call detached on all mixins
      ComponentClass.prototypes.forEach(function(prototype) {
        if (typeof prototype.detached === 'function') {
          prototype.detached.call(this.element);
        }
      }, this);
    }
  };
};
