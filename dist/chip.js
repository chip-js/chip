(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.chip = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Fade in and out
 */
module.exports = function(options) {
  if (!options) options = {};
  if (!options.duration) options.duration = 250;
  if (!options.easing) options.easing = 'ease-in-out';

  return {
    options: options,
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
  };
};

},{}],2:[function(require,module,exports){
/**
 * Slide left and right
 */
module.exports = function(options) {
  if (!options) options = {};
  if (!options.property) options.property = 'width';
  return require('./slide-fade')(options);
};

},{"./slide-fade":3}],3:[function(require,module,exports){
/**
 * Slide down and up and fade in and out
 */
module.exports = function(options) {
  if (!options) options = {};
  if (!options.duration) options.duration = 250;
  if (!options.easing) options.easing = 'ease-in-out';
  if (!options.property) options.property = 'height';

  return {
    options: options,

    animateIn: function(element, done) {
      var value = element.getComputedCSS(this.options.property);
      if (!value || value === '0px') {
        return done();
      }

      var before = { opacity: '0' };
      var after = { opacity: '1' };

      before[this.options.property] = '0px';
      after[this.options.property] = value;

      element.style.overflow = 'hidden';
      element.animate([
        before,
        after
      ], this.options).onfinish = function() {
        element.style.overflow = '';
        done();
      };
    },

    animateOut: function(element, done) {
      var value = element.getComputedCSS(this.options.property);
      if (!value || value === '0px') {
        return done();
      }

      var before = { opacity: '1' };
      var after = { opacity: '0' };
      before[this.options.property] = value;
      after[this.options.property] = '0px';

      element.style.overflow = 'hidden';
      element.animate([
        before,
        after
      ], this.options).onfinish = function() {
        element.style.overflow = '';
        done();
      };
    }
  };
};

},{}],4:[function(require,module,exports){
/**
 * Slide left and right
 */
module.exports = function(options) {
  if (!options) options = {};
  if (!options.property) options.property = 'width';
  return require('./slide')(options);
};

},{"./slide":7}],5:[function(require,module,exports){
/**
 * Move items left and right in a list
 */
module.exports = function(options) {
  if (!options) options = {};
  if (!options.property) options.property = 'width';
  return require('./slide-move')(options);
};

},{"./slide-move":6}],6:[function(require,module,exports){
var slideAnimation = require('./slide');
var animating = new Map();

/**
 * Move items up and down in a list
 */
module.exports = function(options) {
  if (!options) options = {};
  if (!options.duration) options.duration = 250;
  if (!options.easing) options.easing = 'ease-in-out';
  if (!options.property) options.property = 'height';

  return {
    options: options,

    animateIn: function(element, done) {
      var value = element.getComputedCSS(options.property);
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

      var before = {};
      var after = {};
      before[this.options.property] = '0px';
      after[this.options.property] = value;

      // Do the slide
      element.style.overflow = 'hidden';
      element.animate([
        before,
        after
      ], this.options).onfinish = function() {
        element.style.overflow = '';
        done();
      };
    },

    animateOut: function(element, done) {
      var value = element.getComputedCSS(options.property);
      if (!value || value === '0px') {
        return done();
      }

      var item = element.view && element.view._repeatItem_;
      if (item) {
        var newElement = animating.get(item);
        if (newElement && newElement.parentNode === element.parentNode) {
          // This item is being removed in one place and added into another. Make it look like its moving by making both
          // elements not visible and having a clone move above the items to the new location.
          this.animateMove(element, newElement);
        }
      }

      var before = {};
      var after = {};
      before[this.options.property] = value;
      after[this.options.property] = '0px';

      // Do the slide
      element.style.overflow = 'hidden';
      element.animate([
        before,
        after
      ], this.options).onfinish = function() {
        element.style.overflow = '';
        done();
      };
    },

    animateMove: function(oldElement, newElement) {
      var moveElement, options = this.options;
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
      moveElement = this.fragments.makeElementAnimatable(oldElement.cloneNode(true));
      var savePositionElem = document.createTextNode('');
      parent.replaceChild(savePositionElem, oldElement);

      // Ensure all the moves have been processed
      Promise.resolve().then(function() {
        var newLeft = newElement.offsetLeft;
        var newTop = newElement.offsetTop;

        // Again, ensure all the new positions have been set before adding things back in
        Promise.resolve().then(function() {
          parent.replaceChild(oldElement, savePositionElem);
          oldElement.style.opacity = '0';
          newElement.style.opacity = '0';

          moveElement.style.width = style.width;
          moveElement.style.height = style.height;
          moveElement.style.position = 'absolute';
          moveElement.classList.remove('animate-out');
          moveElement.classList.add('animate-move');
          // Put at the end so it appears on top as it moves (when other elements have position: relative)
          parent.appendChild(moveElement);

          moveElement.animate([
            { top: oldTop + marginOffsetTop + 'px', left: oldLeft + marginOffsetLeft + 'px' },
            { top: newTop + marginOffsetTop + 'px', left: newLeft + marginOffsetLeft + 'px' }
          ], options).onfinish = function() {
            moveElement.remove();
            oldElement.style.opacity = '';
            newElement.style.opacity = '';
          };
        });
      });
    }
  };
};

},{"./slide":7}],7:[function(require,module,exports){
/**
 * Slide down and up
 */
module.exports = function(options) {
  if (!options) options = {};
  if (!options.duration) options.duration = 250;
  if (!options.easing) options.easing = 'ease-in-out';
  if (!options.property) options.property = 'height';

  return {
    options: options,

    animateIn: function(element, done) {
      var value = element.getComputedCSS(this.options.property);
      if (!value || value === '0px') {
        return done();
      }

      var before = {};
      var after = {};
      before[this.options.property] = '0px';
      after[this.options.property] = value;

      element.style.overflow = 'hidden';
      element.animate([
        before,
        after
      ], this.options).onfinish = function() {
        element.style.overflow = '';
        done();
      };
    },

    animateOut: function(element, done) {
      var value = element.getComputedCSS(this.options.property);
      if (!value || value === '0px') {
        return done();
      }

      var before = {};
      var after = {};
      before[this.options.property] = value;
      after[this.options.property] = '0px';

      element.style.overflow = 'hidden';
      element.animate([
        before,
        after
      ], this.options).onfinish = function() {
        element.style.overflow = '';
        done();
      };
    }
  };
};

},{}],8:[function(require,module,exports){
/**
 * A binder that toggles an attribute on or off if the expression is truthy or falsey. Use for attributes without
 * values such as `selected`, `disabled`, or `readonly`.
 */
module.exports = function(specificAttrName) {
  return function(value) {
    var attrName = specificAttrName || this.match;
    if (!value) {
      this.element.removeAttribute(attrName);
    } else {
      this.element.setAttribute(attrName, '');
    }
  };
};

},{}],9:[function(require,module,exports){
/**
 * A binder that automatically focuses the input when it is displayed on screen.
 */
module.exports = function() {
  return {

    attached: function() {
      if (!this.expression || this.observer.get()) {
        this.element.focus();
      }
    }

  };
};

},{}],10:[function(require,module,exports){
/**
 * Automatically selects the contents of an input when it receives focus.
 */
module.exports = function() {
  return {

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

  };
};

},{}],11:[function(require,module,exports){
/**
 * A binder that ensures anything bound to the class attribute won't overrite the classes binder. Should always be bound
 * to "class".
 */
module.exports = function() {
  return {
    onlyWhenBound: true,

    updated: function(value) {
      var classList = this.element.classList;
      var classes = {};

      if (value) {
        if (typeof value === 'string') {
          value.split(/\s+/).forEach(function(className) {
            if (className) classes[className] = true;
          });
        } else if (typeof value === 'object') {
          Object.keys(value).forEach(function(className) {
            if (value[className]) classes[className] = true;
          });
        }
      }

      if (this.classes) {
        Object.keys(this.classes).forEach(function(className) {
          if (!classes[className]) classList.remove(className);
        });
      }

      Object.keys(classes).forEach(function(className) {
        classList.add(className);
      });

      this.classes = classes;
    }
  };
};

},{}],12:[function(require,module,exports){
/**
 * A binder that adds classes to an element dependent on whether the expression is true or false.
 */
module.exports = function() {
  return function(value) {
    if (value) {
      this.element.classList.add(this.match);
    } else {
      this.element.classList.remove(this.match);
    }
  };
};

},{}],13:[function(require,module,exports){
/**
 * An element binder that gets filled with the contents put inside a component.
 */
module.exports = function() {
  return {

    compiled: function() {
      if (this.element.childNodes.length) {
        this.defaultContent = this.fragments.createTemplate(this.element.childNodes);
      }
    },

    attached: function() {
      if (this.content) this.content.attached();
    },

    detached: function() {
      if (this.content) this.content.detached();
    },

    bound: function() {
      var template = this.context._componentContent || this.defaultContent;
      if (template) {
        this.content = template.createView();
        this.content.bind(this.context);
        this.element.appendChild(this.content);
        this.content.attached();
      }
    },

    unbound: function() {
      if (this.content) {
        this.content.dispose();
        this.content = null;
      }
    }
  };
};

},{}],14:[function(require,module,exports){
module.exports = Component;
var Class = require('chip-utils/class');
var lifecycle = [ 'created', 'bound', 'attached', 'unbound', 'detached' ];


function Component(element, contentTemplate, unwrap) {
  this.element = element;

  if (this.template) {
    this._view = this.template.createView();
    if (contentTemplate) {
      this._componentContent = contentTemplate;
    }
  } else if (contentTemplate) {
    this._view = contentTemplate.createView();
  }

  if (this._view) {
    if (unwrap) {
      this.element.parentNode.insertBefore(this._view, this.element.nextSibling);
    } else {
      this.element.appendChild(this._view);
    }
  }

  this.created();
}

Component.isComponent = true;

Component.onExtend = function(Class, mixins) {
  Class.prototype.mixins = Class.prototype.mixins.concat(mixins);

  // They will get called via mixins, don't let them override the original methods. To truely override you can define
  // them after using Class.extend on a component.
  lifecycle.forEach(function(method) {
    delete Class.prototype[method];
  });
};

Class.extend(Component, {
  mixins: [],

  get view() {
    return this._view;
  },

  created: function() {
    callOnMixins(this, this.mixins, 'created', arguments);
  },

  bound: function() {
    callOnMixins(this, this.mixins, 'bound', arguments);
    if (this._view) {
      this._view.bind(this.template ? this : this.element._parentContext);
    }
  },

  attached: function() {
    callOnMixins(this, this.mixins, 'attached', arguments);
    if (this._view) {
      this._view.attached();
    }
  },

  unbound: function() {
    callOnMixins(this, this.mixins, 'unbound', arguments);
    if (this._view) {
      this._view.unbind();
    }
  },

  detached: function() {
    callOnMixins(this, this.mixins, 'detached', arguments);
    if (this._view) {
      this._view.detached();
    }
  }

});


// Calls the method by name on any mixins that have it defined
function callOnMixins(context, mixins, name, args) {
  mixins.forEach(function(mixin) {
    if (typeof mixin[name] === 'function') mixin[name].apply(context, args);
  });
}

},{"chip-utils/class":57}],15:[function(require,module,exports){
var Component = require('./component-definition');
var slice = Array.prototype.slice;

/**
 * An element binder that binds the template on the definition to fill the contents of the element that matches. Can be
 * used as an attribute binder as well.
 */
module.exports = function(ComponentClass, unwrapAttribute) {
  var componentLoader;

  if (typeof ComponentClass !== 'function') {
    throw new TypeError('Invalid component, requires a subclass of Component or a function which will return such.');
  }

  if (!ComponentClass.isComponent) {
    componentLoader = ComponentClass;
    ComponentClass = undefined;
  }

  return {

    compiled: function() {
      if (unwrapAttribute && this.element.getAttribute(unwrapAttribute) !== null) {
        var parent = this.element.parentNode;
        var placeholder = document.createTextNode('');
        parent.insertBefore(placeholder, this.element);
        parent.removeChild(this.element);
        this.element = placeholder;
        this.unwrapped = true;
      } else {
        this.unwrapped = false;
      }

      this.ComponentClass = ComponentClass;

      this.compileTemplate();

      var empty = !this.element.childNodes.length ||
                  (this.element.childNodes.length === 1 &&
                   this.element.firstChild.nodeType === Node.TEXT_NODE &&
                   !this.element.firstChild.textContent.trim()
                  );
      if (!empty) {
        // Use the contents of this component to be inserted within it
        this.contentTemplate = this.fragments.createTemplate(this.element.childNodes);
      }
    },

    created: function() {
      this.element.component = null;
    },

    updated: function(ComponentClass) {
      this.unbound();
      if (this.view && this.view._attached) {
        this.detached();
      }
      this.unmake();

      if (typeof ComponentClass === 'string' && componentLoader) {
        ComponentClass = componentLoader.call(this, ComponentClass);
      }

      this.ComponentClass = ComponentClass;

      this.make();
      this.bound();
      if (this.view && this.view._attached) {
        this.attached();
      }
    },

    bound: function() {
      // Set for the component-content binder to use
      this.element._parentContext = this.context;

      if (!this.component) {
        // If not already a component, make it
        this.make();
      }

      if (this.component) {
        this.component.bound();
      }
    },

    unbound: function() {
      if (this.component) {
        this.component.unbound();
      }
      if (this.view && !this.view._attached) {
        // If removed and unbound, unmake it
        this.unmake();
      }
    },

    attached: function() {
      if (this.component) {
        this.component.attached();
      }
    },

    detached: function() {
      if (this.component) {
        this.component.detached();
      }
      if (!this.context) {
        // If removed and unbound, unmake it
        this.unmake();
      }
    },

    compileTemplate: function() {
      if (!this.ComponentClass) {
        return;
      }

      var proto = this.ComponentClass.prototype;
      if (proto.template && !proto.template.compiled && !proto._compiling) {
        proto._compiling = true;
        proto.template = this.fragments.createTemplate(proto.template);
        delete proto._compiling;
      }
    },

    make: function() {
      if (!this.ComponentClass) {
        return;
      }

      this.compileTemplate();

      this.component = new this.ComponentClass(this.element, this.contentTemplate, this.unwrapped);
      this.element.component = this.component;
      this.element.dispatchEvent(new Event('componentized'));

      var properties = this.element._properties;
      if (properties) {
        Object.keys(properties).forEach(function(key) {
          this.component[key] = properties[key];
        }, this);
      }
    },

    unmake: function() {
      if (!this.component) {
        return;
      }

      if (this.component.view) {
        this.component.view.dispose();
      }
      this.component.element = null;
      this.element.component = null;
      this.component = null;
    }

  };
};

},{"./component-definition":14}],16:[function(require,module,exports){
var functionCallExp = /(^|[^\.\]a-z$_\$])([a-z$_\$][a-z_\$0-9-]*)\s*\(\s*(\S)/ig;

/**
 * A binder for adding event listeners. When the event is triggered the expression will be executed. The properties
 * `event` (the event object) and `element` (the element the binder is on) will be available to the expression.
 */
module.exports = function(specificEventName) {
  return {
    compiled: function() {
      this.expression = this.expression.replace(functionCallExp, function(_, before, functionName, closingParen) {
        var after = closingParen === ')' ? closingParen : ', ' + closingParen;
        return before + functionName + '.call(_origContext_ || this' + after;
      });
    },

    created: function() {
      var eventName = specificEventName || this.match;
      var _this = this;

      this.element.addEventListener(eventName, function(event) {
        if (_this.shouldSkip(event)) {
          return;
        }

        // Set the event on the context so it may be used in the expression when the event is triggered.
        var priorEvent = Object.getOwnPropertyDescriptor(_this.context, 'event');
        var priorElement = Object.getOwnPropertyDescriptor(_this.context, 'element');
        _this.setEvent(event, priorEvent, priorElement);

        // Let an event binder make the function call with its own arguments
        _this.observer.get();

        // Reset the context to its prior state
        _this.clearEvent();
      });
    },

    shouldSkip: function(event) {
      return !this.context || event.currentTarget.hasAttribute('disabled');
    },

    unbound: function() {
      this.clearEvent();
    },

    setEvent: function(event, priorEventDescriptor, priorElementDescriptor) {
      if (!this.context) {
        return;
      }
      this.event = event;
      this.priorEventDescriptor = priorEventDescriptor;
      this.priorElementDescriptor = priorElementDescriptor;
      this.lastContext = this.context;

      // DEPRECATE
      this.context.event = event;
      this.context.element = this.element;
      // END DEPRECATE

      this.context.$event = event;
      this.context.$element = this.element;
    },

    clearEvent: function() {
      if (!this.event) {
        return;
      }
      var context = this.lastContext;

      if (this.priorEventDescriptor) {
        Object.defineProperty(context, 'event', this.priorEventDescriptor);
        this.priorEventDescriptor = null;
      } else {
        delete context.event;
      }

      if (this.priorElementDescriptor) {
        Object.defineProperty(context, 'element', this.priorElementDescriptor);
        this.priorElementDescriptor = null;
      } else {
        delete context.element;
      }

      delete context.$event;
      delete context.$element;
      this.event = null;
      this.lastContext = null;
    }
  };
};

},{}],17:[function(require,module,exports){
/**
 * A binder that displays unescaped HTML inside an element. Be sure it's trusted! This should be used with formatters
 * which create HTML from something safe.
 */
module.exports = function() {
  return function(value) {
    this.element.innerHTML = (value == null ? '' : value);
  };
};

},{}],18:[function(require,module,exports){
/**
 * if, unless, else-if, else-unless, else
 * A binder init function that creates a binder that shows or hides the element if the value is truthy or falsey.
 * Actually removes the element from the DOM when hidden, replacing it with a non-visible placeholder and not needlessly
 * executing bindings inside. Pass in the configuration values for the corresponding partner attributes for unless and
 * else, etc.
 */
module.exports = function(elseIfAttrName, elseAttrName, unlessAttrName, elseUnlessAttrName) {
  return {
    animated: true,
    priority: 150,

    compiled: function() {
      var element = this.element;
      var expressions = [ wrapIfExp(this.expression, this.name === unlessAttrName) ];
      var placeholder = document.createTextNode('');
      var node = element.nextElementSibling;
      this.element = placeholder;
      element.parentNode.replaceChild(placeholder, element);

      // Stores a template for all the elements that can go into this spot
      this.templates = [ this.fragments.createTemplate(element) ];

      // Pull out any other elements that are chained with this one
      while (node) {
        var next = node.nextElementSibling;
        var expression;
        if (node.hasAttribute(elseIfAttrName)) {
          expression = this.fragments.codifyExpression('attribute', node.getAttribute(elseIfAttrName), true);
          expressions.push(wrapIfExp(expression, false));
          node.removeAttribute(elseIfAttrName);
        } else if (node.hasAttribute(elseUnlessAttrName)) {
          expression = this.fragments.codifyExpression('attribute', node.getAttribute(elseUnlessAttrName), true);
          expressions.push(wrapIfExp(expression, true));
          node.removeAttribute(elseUnlessAttrName);
        } else if (node.hasAttribute(elseAttrName)) {
          node.removeAttribute(elseAttrName);
          next = null;
        } else {
          break;
        }

        node.remove();
        this.templates.push(this.fragments.createTemplate(node));
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
      if (this.animate && this.context && !this.firstUpdate) {
        this.updatedAnimated(index);
      } else {
        this.updatedRegular(index);
      }
      this.firstUpdate = false;
    },

    attached: function() {
      if (this.showing) {
        this.showing.attached();
      }
    },

    detached: function() {
      if (this.showing) {
        this.showing.detached();
      }
    },

    add: function(view) {
      view.bind(this.context);
      this.element.parentNode.insertBefore(view, this.element.nextSibling);
      view.attached();
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
          if (this.animating) {
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
          }
        });
        return;
      }

      var template = this.templates[index];
      if (template) {
        this.showing = template.createView();
        this.add(this.showing);
        this.animating = true;
        this.animateIn(this.showing, function() {
          if (this.animating) {
            this.animating = false;
            // if the value changed while this was animating run it again
            if (this.lastValue !== index) {
              this.updatedAnimated(this.lastValue);
            }
          }
        });
      }
    },

    bound: function() {
      this.firstUpdate = true;
    },

    unbound: function() {
      if (this.showing) {
        this.showing.unbind();
      }
      this.lastValue = null;
      this.animating = false;
    }
  };
};

function wrapIfExp(expr, isUnless) {
  if (isUnless) {
    return '!(' + expr + ')';
  } else {
    return expr;
  }
}

},{}],19:[function(require,module,exports){
var keys = {
  backspace: 8,
  tab: 9,
  enter: 13,
  return: 13,
  esc: 27,
  escape: 27,
  space: 32,
  left: 37,
  up: 38,
  right: 39,
  down: 40,
  del: 46,
  delete: 46
};

/**
 * Adds a binder which is triggered when a keyboard event's `keyCode` property matches for the above list of keys. If
 * more robust shortcuts are required use the shortcut binder.
 */
module.exports = function(specificKeyName, specificEventName) {
  var eventBinder = require('./events')(specificEventName);

  return {
    compiled: function() {
      // Split on non-char (e.g. keydown::enter or keyup.esc to handle various styles)
      var parts = (specificKeyName || this.match).split(/[^a-z]+/);
      if (this.element.hasOwnProperty('on' + parts[0])) {
        this.match = parts.shift();
      } else {
        this.match = 'keydown';
      }

      this.ctrlKey = parts[0] === 'ctrl';

      if (this.ctrlKey) {
        this.keyCode = keys[parts[1]];
      } else {
        this.keyCode = keys[parts[0]];
      }
    },

    shouldSkip: function(event) {
      if (this.keyCode) {
        return eventBinder.shouldSkip.call(this, event) ||
          this.ctrlKey !== (event.ctrlKey || event.metaKey) ||
          this.keyCode !== event.keyCode;
      } else {
        return eventBinder.shouldSkip.call(this, event);
      }
    },

    created: eventBinder.created,
    unbound: eventBinder.unbound,
    setEvent: eventBinder.setEvent,
    clearEvent: eventBinder.clearEvent
  };
};

},{"./events":16}],20:[function(require,module,exports){
/**
 * A binder that prints out the value of the expression to the console.
 */
module.exports = function() {
  return {
    priority: 60,
    created: function() {
      if (this.observer) {
        this.observer.getChangeRecords = true;
      }
    },

    updated: function(value) {
      /*eslint-disable no-console */
      console.log('%cDebug: %c' + this.expression, 'color:blue;font-weight:bold', 'color:#DF8138', '=', value);
      /*eslint-enable */
    }
  };
};

},{}],21:[function(require,module,exports){
/**
 * A binder that sets the property of an element to the value of the expression.
 */
module.exports = function(specificPropertyName) {
  return {
    priority: 10,

    created: function() {
      this.propertyName = specificPropertyName || this.camelCase;
    },

    updated: function(value) {

      if (this.element.hasOwnProperty('component')) {
        var properties = this.element._properties || (this.element._properties = {});
        properties[this.propertyName] = value;

        if (this.context && this.element.component) {
          // Don't unset properties on components getting ready to be disposed of
          this.element.component[this.propertyName] = value;
        }
      } else if (this.context) {
        this.context[this.propertyName] = value;
      }
    }
  };
};

},{}],22:[function(require,module,exports){
/**
 * A binder for radio buttons specifically
 */
module.exports = function(valueName) {
  return {
    onlyWhenBound: true,
    priority: 10,

    compiled: function() {
      var element = this.element;

      if (valueName && valueName !== 'value' && element.hasAttribute(valueName)) {
        this.valueExpr = this.fragments.codifyExpression('attribute', element.getAttribute(valueName), true);
        element.removeAttribute(valueName);
      } else if (element.hasAttribute('value')) {
        this.valueExpr = this.fragments.codifyExpression('attribute', element.getAttribute('value'), false);
      } else {
        return false;
      }

      element.setAttribute('name', this.expression);
    },

    created: function() {
      this.element.addEventListener('change', function(event) {
        if (this.element.checked) {
          this.observer.set(this.get(this.valueExpr));
        }
      }.bind(this));
    },

    updated: function(value) {
      this.element.checked = (value == this.get(this.valueExpr));
    }
  };
};


},{}],23:[function(require,module,exports){
/**
 * A binder that sets a reference to the element when it is bound.
 */
module.exports = function () {
  return {
    bound: function() {
      this.context[this.camelCase || this.expression] = this.element;
    },

    unbound: function() {
      this.context[this.camelCase || this.expression] = null;
    }
  };
};

},{}],24:[function(require,module,exports){
var diff = require('differences-js');

/**
 * A binder that duplicate an element for each item in an array. The expression may be of the format `epxr` or
 * `itemName in expr` where `itemName` is the name each item inside the array will be referenced by within bindings
 * inside the element.
 */
module.exports = function(compareByAttribute) {
  return {
    animated: true,
    priority: 100,

    compiled: function() {
      if (this.element.hasAttribute(compareByAttribute)) {
        this.compareBy = this.fragments.codifyExpression('attribute', this.element.getAttribute(compareByAttribute), true);
        this.element.removeAttribute(compareByAttribute);
      }
      var parent = this.element.parentNode;
      var placeholder = document.createTextNode('');
      parent.insertBefore(placeholder, this.element);
      this.template = this.fragments.createTemplate(this.element);
      this.element = placeholder;


      var parts = this.expression.split(/\s+in\s+|\s+of\s+/);
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
      this.observer.compareBy = this.compareBy;
      this.observer.compareByName = this.valueName;
      this.observer.compareByIndex = this.keyName;
    },

    attached: function() {
      this.views.forEach(function(view) {
        view.attached();
      });
    },

    detached: function() {
      this.views.forEach(function(view) {
        view.detached();
      });
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
          this.updateViewContexts(value);
        }
      }
    },

    updateViewContexts: function(value) {
      // Keep the items updated as the array changes
      if (this.valueName) {
        this.views.forEach(function(view, i) {
          if (view.context) {
            if (this.keyName) view.context[this.keyName] = i;
            view.context[this.valueName] = value[i];
          }
        }, this);
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
        if (this.view.inDOM) this.attached();
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
        if (splice.removed.length) {
          var removed = this.views.splice(splice.index - addedCount, splice.removed.length);
          removed.forEach(this.removeView);
        }
        addedCount += splice.addedCount;
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
          var view = this.createView(i, item);
          addedViews.push(view);
          fragment.appendChild(view);
        }
        this.views.splice.apply(this.views, [ index, 0 ].concat(addedViews));
        var previousView = this.views[index - 1];
        var nextSibling = previousView ? previousView.lastViewNode.nextSibling : this.element.nextSibling;
        this.element.parentNode.insertBefore(fragment, nextSibling);
        if (this.view.inDOM) this.attached();
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
      var doneCount = 0;
      this.animating = true;

      // Run updates which occured while this was animating.
      var whenDone = function() {
        // The last animation finished will run this
        if (--doneCount !== 0) return;

        allRemoved.forEach(this.removeView);

        if (this.animating) {
          this.animating = false;
          if (this.valueWhileAnimating) {
            var changes = diff.arrays(this.valueWhileAnimating, animatingValue);
            if (changes.length) {
              var value = this.valueWhileAnimating;
              this.valueWhileAnimating = null;
              this.updateChangesAnimated(value, changes);
            }
          }
        }
      };

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
        if (this.view.inDOM) this.attached();

        allAdded = allAdded.concat(addedViews);
        allRemoved = allRemoved.concat(removedViews);
      }, this);


      allAdded.forEach(function(view) {
        doneCount++;
        this.animateIn(view, whenDone);
      }, this);

      allRemoved.forEach(function(view) {
        doneCount++;
        view.unbind();
        this.animateOut(view, whenDone);
      }, this);

      this.updateViewContexts(value);
    },

    unbound: function() {
      this.views.forEach(function(view) {
        view.unbind();
        view._repeatItem_ = null;
      });
      this.valueWhileAnimating = null;
      this.animating = false;
    }
  };
};

},{"differences-js":66}],25:[function(require,module,exports){
/**
 * Shows/hides an element conditionally. `if` should be used in most cases as it removes the element completely and is
 * more effecient since bindings within the `if` are not active while it is hidden. Use `show` for when the element
 * must remain in-DOM or bindings within it must continue to be processed while it is hidden. You should default to
 * using `if`.
 */
module.exports = function(isHide) {
  var isShow = !isHide;
  return {
    animated: true,

    updated: function(value) {
      // For performance provide an alternate code path for animation
      if (this.animate && this.context && !this.firstUpdate) {
        this.updatedAnimated(value);
      } else {
        this.updatedRegular(value);
      }
      this.firstUpdate = false;
    },

    updatedRegular: function(value) {
      if (value) {
        this.element.style.display = '';
      } else {
        this.element.style.display = 'none';
      }
    },

    updatedAnimated: function(value) {
      this.lastValue = value;
      if (this.animating) {
        return;
      }

      this.animating = true;
      function onFinish() {
        // If this.animating is false then the element was unbound during the animation
        if (this.animating) {
          this.animating = false;
          if (this.lastValue !== value) {
            this.updatedAnimated(this.lastValue);
          }
        }
      }

      // if isShow is truthy and value is truthy
      if (!!value === !!isShow) {
        this.element.style.display = '';
        this.animateIn(this.element, onFinish);
      } else {
        this.animateOut(this.element, function() {
          this.element.style.display = 'none';
          onFinish.call(this);
        });
      }
    },

    bound: function() {
      this.firstUpdate = true;
    },

    unbound: function() {
      this.element.style.display = '';
      this.lastValue = null;
      this.animating = false;
    }
  };
};

},{}],26:[function(require,module,exports){
var units = {
  '%': true,
  'em': true,
  'px': true,
  'pt': true
};

/**
 * A binder that adds styles to an element.
 */
module.exports = function(specificStyleName, specificUnit) {
  return {
    compiled: function() {
      var styleName = specificStyleName || this.match;
      var unit;

      if (specificUnit) {
        unit = specificUnit;
      } else {
        var parts = styleName.split(/[^a-z]/i);
        if (units.hasOwnProperty(parts[parts.length - 1])) {
          unit = parts.pop();
          styleName = parts.join('-');
        }
      }

      this.unit = unit || '';

      this.styleName = styleName.replace(/-+(\w)/g, function(_, char) {
        return char.toUpperCase();
      });
    },

    updated: function(value) {
      this.element.style[this.styleName] = (value == null) ? '' : value + this.unit;
    }
  };
};

},{}],27:[function(require,module,exports){
/**
 * ## text
 * A binder that displays escaped text inside an element. This can be done with binding directly in text nodes but
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
module.exports = function() {
  return function(value) {
    this.element.textContent = (value == null) ? '' : value;
  };
};

},{}],28:[function(require,module,exports){
var inputMethods, defaultInputMethod;

/**
 * A binder that sets the value of an HTML form element. This binder also updates the data as it is changed in
 * the form element, providing two way binding. Can use for "checked" as well.
 */
module.exports = function(eventsAttrName, fieldAttrName) {
  return {
    onlyWhenBound: true,
    defaultEvents: [ 'change' ],

    compiled: function() {
      var name = this.element.tagName.toLowerCase();
      var type = this.element.type;
      this.methods = inputMethods[type] || inputMethods[name];

      if (!this.methods) {
        return false;
      }

      if (eventsAttrName && this.element.hasAttribute(eventsAttrName)) {
        this.events = this.element.getAttribute(eventsAttrName).split(' ');
        this.element.removeAttribute(eventsAttrName);
      } else if (name !== 'option') {
        this.events = this.defaultEvents;
      }

      if (fieldAttrName && this.element.hasAttribute(fieldAttrName)) {
        this.valueField = this.element.getAttribute(fieldAttrName);
        this.element.removeAttribute(fieldAttrName);
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
  };
};


/**
 * Handle the different form types
 */
defaultInputMethod = {
  get: function() { return this.value; },
  set: function(value) { this.value = (value == null) ? '' : value; }
};


inputMethods = {
  checkbox: {
    get: function() { return this.checked; },
    set: function(value) { this.checked = !!value; }
  },

  file: {
    get: function() { return this.files && this.files[0]; },
    set: function() {}
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


},{}],29:[function(require,module,exports){
/**
 * Takes the input URL and adds (or replaces) the field in the query.
 * E.g. 'http://example.com?user=default&resource=foo' | addQuery('user', username)
 * Will replace user=default with user={username} where {username} is the value of username.
 */
module.exports = function(value, queryField, queryValue) {
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
};

},{}],30:[function(require,module,exports){
/**
 * Returns the item from an array at the given index
 */
module.exports = function(value, index) {
  if (Array.isArray(value)) {
    return value[index];
  } else {
    return value;
  }
};

},{}],31:[function(require,module,exports){
var urlExp = /(^|\s|\()((?:https?|ftp):\/\/[\-A-Z0-9+\u0026@#\/%?=()~_|!:,.;]*[\-A-Z0-9+\u0026@#\/%=~(_|])/gi;
var wwwExp = /(^|[^\/])(www\.[\S]+\.\w{2,}(\b|$))/gim;
/**
 * Adds automatic links to escaped content (be sure to escape user content). Can be used on existing HTML content as it
 * will skip URLs within HTML tags. Passing a value in the second parameter will set the target to that value or
 * `_blank` if the value is `true`.
 */
module.exports = function(value, target) {
  var targetString = '';
  if (typeof target === 'string') {
    targetString = ' target="' + target + '"';
  } else if (target) {
    targetString = ' target="_blank"';
  }

  return ('' + value).replace(/<[^>]+>|[^<]+/g, function(match) {
    if (match.charAt(0) === '<') {
      return match;
    }
    var replacedText = match.replace(urlExp, '$1<a href="$2"' + targetString + '>$2</a>');
    return replacedText.replace(wwwExp, '$1<a href="http://$2"' + targetString + '>$2</a>');
  });
};

},{}],32:[function(require,module,exports){
/**
 * Formats the value into a boolean.
 */
module.exports = function(value) {
  return value && value !== '0' && value !== 'false';
};

},{}],33:[function(require,module,exports){
/**
 * Adds <br> tags in place of newlines characters.
 */
module.exports = function(value, setter) {
  if (setter) {
    return value.replace(/<br>\r?\n?/g, '\n');
  } else {
    var lines = (value || '').split(/\r?\n/);
    return lines.join('<br>\n');
  }
};

},{}],34:[function(require,module,exports){
/**
 * Adds a formatter to format dates and strings simplistically
 */
module.exports = function(value) {
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
};

},{}],35:[function(require,module,exports){
/**
 * Adds a formatter to format dates and strings simplistically
 */
module.exports = function(value) {
  if (!value) {
    return '';
  }

  if (!(value instanceof Date)) {
    value = new Date(value);
  }

  if (isNaN(value.getTime())) {
    return '';
  }

  return value.toLocaleDateString();
};

},{}],36:[function(require,module,exports){
var div = document.createElement('div');

/**
 * HTML escapes content. For use with other HTML-adding formatters such as autolink.
 */
module.exports = function (value, setter) {
  if (setter) {
    div.innerHTML = value;
    return div.textContent;
  } else {
    div.textContent = value || '';
    return div.innerHTML;
  }
};

},{}],37:[function(require,module,exports){
/**
 * Filters an array by the given filter function(s), may provide a function or an array or an object with filtering
 * functions.
 */
module.exports = function(value, filterFunc, testValue) {
  if (!Array.isArray(value)) {
    return [];
  } else if (!filterFunc) {
    return value;
  }

  if (typeof filterFunc === 'string' && arguments.length > 2) {
    var key = filterFunc;
    filterFunc = function(item) {
      return item && item[key] === testValue;
    };
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
};

},{}],38:[function(require,module,exports){
/**
 * Returns the first item from an array
 */
module.exports = function(value) {
  if (Array.isArray(value)) {
    return value[0];
  } else {
    return value;
  }
};

},{}],39:[function(require,module,exports){
/**
 * Formats the value into a float or null.
 */
module.exports = function(value) {
  value = parseFloat(value);
  return isNaN(value) ? null : value;
};

},{}],40:[function(require,module,exports){
/**
 * Formats the value something returned by a formatting function passed. Use for custom or one-off formats.
 */
module.exports = function(value, formatter, isSetter) {
  return formatter.call(this, value, isSetter);
};

},{}],41:[function(require,module,exports){
/**
 * Formats the value into an integer or null.
 */
module.exports = function(value) {
  value = parseInt(value);
  return isNaN(value) ? null : value;
};

},{}],42:[function(require,module,exports){
/**
 * Formats the value into JSON.
 */
module.exports = function(value, isSetter) {
  if (isSetter) {
    try {
      return JSON.parse(value);
    } catch(err) {
      return null;
    }
  } else {
    try {
      return JSON.stringify(value);
    } catch(err) {
      return err.toString();
    }
  }
};

},{}],43:[function(require,module,exports){
/**
 * Returns the keys of an object as an array
 */
module.exports = function(value) {
  return value == null ? [] : Object.keys(value);
};

},{}],44:[function(require,module,exports){
/**
 * Returns the last item from an array
 */
module.exports = function(value) {
  if (Array.isArray(value)) {
    return value[value.length - 1];
  } else {
    return value;
  }
};

},{}],45:[function(require,module,exports){
/**
 * Adds a formatter to limit the length of an array or string
 */
module.exports = function(value, limit) {
  if (value && typeof value.slice === 'function') {
    if (limit < 0) {
      return value.slice(limit);
    } else {
      value.slice(0, limit);
    }
  } else {
    return value;
  }
};

},{}],46:[function(require,module,exports){
/**
 * Adds a formatter to log the value of the expression, useful for debugging
 */
module.exports = function(value, prefix) {
  if (prefix == null) prefix = 'Log:';
  /*eslint-disable no-console */
  console.log('%c' + prefix, 'color:blue;font-weight:bold', value);
  /*eslint-enable */
  return value;
};

},{}],47:[function(require,module,exports){
/**
 * Formats the value into lower case.
 */
module.exports = function(value) {
  return typeof value === 'string' ? value.toLowerCase() : value;
};

},{}],48:[function(require,module,exports){
/**
 * Adds a formatter to map an array or value by the given mapping function
 */
module.exports = function(value, mapFunc) {
  if (value == null || typeof mapFunc !== 'function') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(mapFunc, this);
  } else {
    return mapFunc.call(this, value);
  }
};

},{}],49:[function(require,module,exports){
var escapeHTML = require('./escape');

/**
 * HTML escapes content adding <p> tags at double newlines and <br> tags in place of single newline characters.
 */
module.exports = function(value, setter) {
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
};

},{"./escape":36}],50:[function(require,module,exports){
/**
 * Wraps lines into paragraphs (in <p> tags).
 */
module.exports = function(value, setter) {
  if (setter) {
    return value.replace(/<p>\n?<\/p>/g, '\n').replace(/<p>|<\/p>/g, '');
  } else {
    var lines = (value || '').split(/\r?\n/)
                // empty paragraphs will collapse if they don't have any content, insert a br
                .map(function(line) { return line || '<br>'; });
    return '<p>' + lines.join('</p>\n<p>') + '</p>';
  }
};

},{}],51:[function(require,module,exports){
/**
 * Adds a formatter to reduce an array or value by the given reduce function
 */
module.exports = function(value, reduceFunc, initialValue) {
  if (value == null || typeof reduceFunc !== 'function') {
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
};

},{}],52:[function(require,module,exports){
/**
 * Adds a formatter to reverse an array
 */
module.exports = function(value) {
  if (Array.isArray(value)) {
    return value.slice().reverse();
  } else {
    return value;
  }
};

},{}],53:[function(require,module,exports){
/**
 * Adds a formatter to reduce an array or value by the given reduce function
 */
module.exports = function(value, index, endIndex) {
  if (Array.isArray(value)) {
    return value.slice(index, endIndex);
  } else {
    return value;
  }
};

},{}],54:[function(require,module,exports){
/**
 * Sorts an array given a field name or sort function, and a direction
 */
module.exports = function(value, sortFunc, dir) {
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
    sortFunc = function(a, b) {
      if (a[prop] > b[prop]) return dir;
      if (a[prop] < b[prop]) return -dir;
      return 0;
    };
  } else if (dir === -1) {
    var origFunc = sortFunc;
    sortFunc = function(a, b) { return -origFunc(a, b); };
  }

  return value.slice().sort(sortFunc.bind(this));
};

},{}],55:[function(require,module,exports){
/**
 * Adds a formatter to format dates and strings simplistically
 */
module.exports = function(value) {
  if (!value) {
    return '';
  }

  if (!(value instanceof Date)) {
    value = new Date(value);
  }

  if (isNaN(value.getTime())) {
    return '';
  }

  return value.toLocaleTimeString();
};

},{}],56:[function(require,module,exports){
/**
 * Formats the value into upper case.
 */
module.exports = function(value) {
  return typeof value === 'string' ? value.toUpperCase() : value;
};

},{}],57:[function(require,module,exports){
var slice = Array.prototype.slice;

/**
 * Simplifies extending classes and provides static inheritance. Classes that need to be extendable should
 * extend Class which will give them the `extend` static function for their subclasses to use. In addition to
 * a prototype, mixins may be added as well. Example:
 *
 * function MyClass(arg1, arg2) {
 *   SuperClass.call(this, arg1);
 *   this.arg2 = arg2;
 * }
 * SuperClass.extend(MyClass, mixin1, AnotherClass, {
 *   foo: function() {
 *     this._bar++;
 *   },
 *   get bar() {
 *     return this._bar;
 *   }
 * });
 *
 * In addition to extending the superclass, static methods and properties will be copied onto the subclass for
 * static inheritance. This allows the extend function to be copied to the subclass so that it may be
 * subclassed as well. Additionally, static properties may be added by defining them on a special prototype
 * property `static` making the code more readable.
 *
 * @param {function} The subclass constructor.
 * @param {object} [optional] Zero or more mixins. They can be objects or classes (functions).
 * @param {object} The prototype of the subclass.
 */
function Class() {}
Class.extend = extend;
Class.makeInstanceOf = makeInstanceOf;
module.exports = Class;

function extend(Subclass /* [, prototype [,prototype]] */) {
  var prototypes, SuperClass = this;

  // Support no constructor
  if (typeof Subclass !== 'function') {
    prototypes = slice.call(arguments);
    Subclass = function() {
      SuperClass.apply(this, arguments);
    };
  } else {
    prototypes = slice.call(arguments, 1);
  }

  if (Object.setPrototypeOf) {
    Object.setPrototypeOf(Subclass, this);
  } else {
    Subclass.__proto__ = this;
  }

  prototypes.forEach(function(proto) {
    if (typeof proto === 'function') {
      addStatics(proto, Subclass);
    } else if (proto.hasOwnProperty('static')) {
      addStatics(proto.static, Subclass);
    }
  });

  var descriptors = getDescriptors(prototypes);
  descriptors.constructor = { writable: true, configurable: true, value: Subclass };
  descriptors.super = { configurable: true, value: SuperClass.prototype };
  Subclass.prototype = Object.create(this.prototype, descriptors);
  if (typeof SuperClass.onExtend === 'function') {
    // Allow for customizing the definitions of your child classes
    SuperClass.onExtend(Subclass, prototypes);
  }
  return Subclass;
}

// Get descriptors (allows for getters and setters) and sets functions to be non-enumerable
function getDescriptors(objects) {
  var descriptors = {};

  objects.forEach(function(object) {
    if (typeof object === 'function') object = object.prototype;

    Object.getOwnPropertyNames(object).forEach(function(name) {
      if (name === 'static') return;

      var descriptor = Object.getOwnPropertyDescriptor(object, name);

      if (typeof descriptor.value === 'function') {
        descriptor.enumerable = false;
      }

      descriptors[name] = descriptor;
    });
  });
  return descriptors;
}

// Copies static methods over for static inheritance
function addStatics(statics, Subclass) {

  // static method inheritance (including `extend`)
  Object.keys(statics).forEach(function(key) {
    var descriptor = Object.getOwnPropertyDescriptor(statics, key);
    if (!descriptor.configurable) return;

    Object.defineProperty(Subclass, key, descriptor);
  });
}


/**
 * Makes a native object pretend to be an instance of class (e.g. adds methods to a DocumentFragment then calls the
 * constructor).
 */
function makeInstanceOf(object) {
  var args = slice.call(arguments, 1);
  Object.defineProperties(object, getDescriptors([this.prototype]));
  this.apply(object, args);
  return object;
}

},{}],58:[function(require,module,exports){
module.exports = require('./src/chip');

},{"./src/chip":63}],59:[function(require,module,exports){
arguments[4][57][0].apply(exports,arguments)
},{"dup":57}],60:[function(require,module,exports){
module.exports = EventTarget;
var Class = require('./class');

/**
 * A browser-based event emitter that takes advantage of the built-in C++ eventing the browser provides, giving a
 * consistent eventing mechanism everywhere in your front-end app.
 */
function EventTarget() {
  Object.defineProperty(this, '__event_node', { value: document.createDocumentFragment() });
}


Class.extend(EventTarget, {
  // Add event listener
  addEventListener: function addEventListener(type, listener) {
    this.__event_node.addEventListener(type, listener);
  },

  on: function on(type, listener) {
    this.addEventListener(type, listener);
  },

  // Removes event listener
  removeEventListener: function removeEventListener(type, listener) {
    this.__event_node.removeEventListener(type, listener);
    if (listener && listener.__event_one) {
      this.__event_node.removeEventListener(type, listener.__event_one);
    }
  },

  off: function off(type, listener) {
    this.removeEventListener(type, listener);
  },

  // Add event listener to only get called once, returns wrapped method for removing if needed
  one: function one(type, listener) {
    if (typeof listener !== 'function') return;

    if (!listener.__event_one) {
      var self = this;
      Object.defineProperty(listener, '__event_one', { value: function(event) {
        self.removeEventListener(type, listener.__event_one);
        listener.call(self, event);
      }});
    }

    this.addEventListener(type, listener.__event_one);
  },

  // Dispatch event and trigger listeners
  dispatchEvent: function dispatchEvent(event) {
    Object.defineProperty(event, 'target', { value: this });
    return this.__event_node.dispatchEvent(event);
  }
});

},{"./class":59}],61:[function(require,module,exports){
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

},{"./default-options":64,"./mixins/default":65,"chip-utils/event-target":60,"fragments-built-ins/binders/component":15,"fragments-built-ins/binders/component-definition":14,"fragments-js":73,"routes-js":92}],62:[function(require,module,exports){
var Route = require('routes-js').Route;
var IfBinder = require('fragments-built-ins/binders/if');

module.exports = function() {
  var routeBinder = IfBinder();
  var attached = routeBinder.attached;
  var unbound = routeBinder.unbound;
  var detached = routeBinder.detached;
  routeBinder.priority = 10,

  routeBinder.compiled = function() {
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

  routeBinder.add = function(view) {
    view.bind(this.context);
    this.element.appendChild(view);
    this.attached();
  };

  routeBinder.created = function() {
    this.onUrlChange = this.onUrlChange.bind(this);
  };


  routeBinder.attached = function() {
    attached.call(this);

    var node = this.element.parentNode;
    while (node && !node.matchedRoutePath) {
      node = node.parentNode;
    }
    this.baseURI = node && node.matchedRoutePath || '';

    this.app.on('urlChange', this.onUrlChange);
    if (this.app.listening) {
      this.onUrlChange();
    }
  };

  routeBinder.detached = function() {
    detached.call(this);
    this.currentIndex = undefined;
    this.app.off('urlChange', this.onUrlChange);
  };

  routeBinder.unbound = function() {
    unbound.call(this);
    delete this.context.params;
  };

  routeBinder.onUrlChange = function() {
    if (!this.context) {
      return;
    }

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

  routeBinder.checkForChange = function() {
    var fullUrl = this.app.path;
    var localUrl = null;
    var newIndex = this.routes.length;
    var matched;
    delete this.context.params;

    if (fullUrl.indexOf(this.baseURI) === 0) {
      localUrl = fullUrl.replace(this.baseURI, '');
    }

    if (localUrl !== null) {

      matched = this.routes.some(function(route, index) {
        if (route.match(localUrl)) {
          if (route.params.hasOwnProperty('*') && route.params['*']) {
            var afterLength = route.params['*'].length;
            this.element.matchedRoutePath = this.baseURI + localUrl.slice(0, -afterLength);
          } else {
            this.element.matchedRoutePath = fullUrl;
          }
          var params = this.context.params = Object.create(route.params);
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
    }

    if (matched || newIndex !== this.currentIndex) {
      this.element.dispatchEvent(new Event('routed'));
    }

    if (newIndex !== this.currentIndex) {
      this.currentIndex = newIndex;
      this.updated(this.currentIndex);
    }
  };

  return routeBinder;
};

},{"fragments-built-ins/binders/if":18,"routes-js":92}],63:[function(require,module,exports){
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

function chip(options) {
  var app = new App(options);
  app.init();
  return app;
}

chip.App = App;
chip.Class = require('chip-utils/class');
chip.EventTarget = require('chip-utils/event-target');
chip.routes = require('routes-js');

},{"./app":61,"chip-utils/class":59,"chip-utils/event-target":60,"routes-js":92}],64:[function(require,module,exports){

module.exports = {
  curliesInAttributes: false,
  animateAttribute: '[animate]',

  binders: {
    '(keydown.*)': require('fragments-built-ins/binders/key-events')(null, 'keydown'),
    '(keyup.*)': require('fragments-built-ins/binders/key-events')(null, 'keyup'),
    '(enter)': require('fragments-built-ins/binders/key-events')('enter'),
    '(esc)': require('fragments-built-ins/binders/key-events')('esc'),
    '(*)': require('fragments-built-ins/binders/events')(),
    '{*}': require('fragments-built-ins/binders/properties')(),
    '*?': require('fragments-built-ins/binders/attribute-names')(),
    '[content]': require('fragments-built-ins/binders/component-content')(),
    '[show]': require('fragments-built-ins/binders/show')(false),
    '[hide]': require('fragments-built-ins/binders/show')(true),
    '[for]': require('fragments-built-ins/binders/repeat')('[by]'),
    '#*': require('fragments-built-ins/binders/ref')(),
    '[text]': require('fragments-built-ins/binders/text')(),
    '[html]': require('fragments-built-ins/binders/html')(),
    '[src]': require('fragments-built-ins/binders/properties')('src'),
    '[log]': require('fragments-built-ins/binders/log')(),
    '[class]': require('fragments-built-ins/binders/class')(),
    '[.*]': require('fragments-built-ins/binders/classes')(),
    '[style.*]': require('fragments-built-ins/binders/styles')(),
    '[autofocus]': require('fragments-built-ins/binders/autofocus')(),
    '[autoselect]': require('fragments-built-ins/binders/autoselect')(),
    '[name]': require('fragments-built-ins/binders/radio')('[value]'),
    '[value]': require('fragments-built-ins/binders/value')(
      '[value-events]',
      '[value-field]'
    ),
    '[component]': require('fragments-built-ins/binders/component')(function(componentName) {
      return this.fragments.app.component(componentName);
    }, '[unwrap]'),
    '[if]': require('fragments-built-ins/binders/if')('[else-if]', '[else]', '[unless]', '[unless-if]'),
    '[unless]': require('fragments-built-ins/binders/if')('[else-if]', '[else]', '[unless]', '[unless-if]'),
    '[route]': require('./binders/route')()
  },

  formatters: {
    addQuery: require('fragments-built-ins/formatters/add-query'),
    at: require('fragments-built-ins/formatters/at'),
    autolink: require('fragments-built-ins/formatters/autolink'),
    bool: require('fragments-built-ins/formatters/bool'),
    br: require('fragments-built-ins/formatters/br'),
    dateTime: require('fragments-built-ins/formatters/date-time'),
    date: require('fragments-built-ins/formatters/date'),
    escape: require('fragments-built-ins/formatters/escape'),
    filter: require('fragments-built-ins/formatters/filter'),
    first: require('fragments-built-ins/formatters/first'),
    float: require('fragments-built-ins/formatters/float'),
    format: require('fragments-built-ins/formatters/format'),
    int: require('fragments-built-ins/formatters/int'),
    json: require('fragments-built-ins/formatters/json'),
    keys: require('fragments-built-ins/formatters/keys'),
    last: require('fragments-built-ins/formatters/last'),
    limit: require('fragments-built-ins/formatters/limit'),
    log: require('fragments-built-ins/formatters/log'),
    lower: require('fragments-built-ins/formatters/lower'),
    map: require('fragments-built-ins/formatters/map'),
    newline: require('fragments-built-ins/formatters/newline'),
    p: require('fragments-built-ins/formatters/p'),
    reduce: require('fragments-built-ins/formatters/reduce'),
    reverse: require('fragments-built-ins/formatters/reverse'),
    slice: require('fragments-built-ins/formatters/slice'),
    sort: require('fragments-built-ins/formatters/sort'),
    time: require('fragments-built-ins/formatters/time'),
    upper: require('fragments-built-ins/formatters/upper')
  },

  animations: {
    'fade': require('fragments-built-ins/animations/fade')(),
    'slide': require('fragments-built-ins/animations/slide')(),
    'slide-h': require('fragments-built-ins/animations/slide-horizontal')(),
    'slide-move': require('fragments-built-ins/animations/slide-move')(),
    'slide-move-h': require('fragments-built-ins/animations/slide-move-horizontal')(),
    'slide-fade': require('fragments-built-ins/animations/slide-fade')(),
    'slide-fade-h': require('fragments-built-ins/animations/slide-fade-horizontal')()
  }

};

},{"./binders/route":62,"fragments-built-ins/animations/fade":1,"fragments-built-ins/animations/slide":7,"fragments-built-ins/animations/slide-fade":3,"fragments-built-ins/animations/slide-fade-horizontal":2,"fragments-built-ins/animations/slide-horizontal":4,"fragments-built-ins/animations/slide-move":6,"fragments-built-ins/animations/slide-move-horizontal":5,"fragments-built-ins/binders/attribute-names":8,"fragments-built-ins/binders/autofocus":9,"fragments-built-ins/binders/autoselect":10,"fragments-built-ins/binders/class":11,"fragments-built-ins/binders/classes":12,"fragments-built-ins/binders/component":15,"fragments-built-ins/binders/component-content":13,"fragments-built-ins/binders/events":16,"fragments-built-ins/binders/html":17,"fragments-built-ins/binders/if":18,"fragments-built-ins/binders/key-events":19,"fragments-built-ins/binders/log":20,"fragments-built-ins/binders/properties":21,"fragments-built-ins/binders/radio":22,"fragments-built-ins/binders/ref":23,"fragments-built-ins/binders/repeat":24,"fragments-built-ins/binders/show":25,"fragments-built-ins/binders/styles":26,"fragments-built-ins/binders/text":27,"fragments-built-ins/binders/value":28,"fragments-built-ins/formatters/add-query":29,"fragments-built-ins/formatters/at":30,"fragments-built-ins/formatters/autolink":31,"fragments-built-ins/formatters/bool":32,"fragments-built-ins/formatters/br":33,"fragments-built-ins/formatters/date":35,"fragments-built-ins/formatters/date-time":34,"fragments-built-ins/formatters/escape":36,"fragments-built-ins/formatters/filter":37,"fragments-built-ins/formatters/first":38,"fragments-built-ins/formatters/float":39,"fragments-built-ins/formatters/format":40,"fragments-built-ins/formatters/int":41,"fragments-built-ins/formatters/json":42,"fragments-built-ins/formatters/keys":43,"fragments-built-ins/formatters/last":44,"fragments-built-ins/formatters/limit":45,"fragments-built-ins/formatters/log":46,"fragments-built-ins/formatters/lower":47,"fragments-built-ins/formatters/map":48,"fragments-built-ins/formatters/newline":49,"fragments-built-ins/formatters/p":50,"fragments-built-ins/formatters/reduce":51,"fragments-built-ins/formatters/reverse":52,"fragments-built-ins/formatters/slice":53,"fragments-built-ins/formatters/sort":54,"fragments-built-ins/formatters/time":55,"fragments-built-ins/formatters/upper":56}],65:[function(require,module,exports){

module.exports = function(app) {

  return {

    app: app,
    sync: app.sync,
    syncNow: app.syncNow,
    afterSync: app.afterSync,
    onSync: app.onSync,
    offSync: app.offSync,

    created: function() {
      Object.defineProperties(this, {
        _observers: { configurable: true, value: [] },
        _listeners: { configurable: true, value: [] },
        _bound: { configurable: true, value: false },
      });

      this.mixins.forEach(function(mixin) {

        if (mixin.computed) {
          app.computed.extend(this, mixin.computed, false);
        }

        if (mixin.listeners) {
          Object.keys(mixin.listeners).forEach(function(eventName) {
            var listener = mixin.listeners[eventName];
            if (typeof listener === 'string') {
              listener = mixin[listener];
            }
            this.listen(this.element, eventName, listener, this);
          }, this);
        }
      }, this);
    },


    bound: function() {
      this._bound = true;

      if (this.computedObservers) {
        this.computedObservers.enable();
      }

      this._observers.forEach(function(observer) {
        observer.bind(this);
      }, this);

      this._listeners.forEach(function(item) {
        item.target.addEventListener(item.eventName, item.listener);
      });
    },


    unbound: function() {
      this._bound = false;

      if (this.computedObservers) {
        this.computedObservers.disable();
      }

      this._observers.forEach(function(observer) {
        observer.unbind();
      });

      this._listeners.forEach(function(item) {
        item.target.removeEventListener(item.eventName, item.listener);
      });
    },


    observe: function(expr, callback) {
      if (typeof callback !== 'function') {
        throw new TypeError('callback must be a function');
      }

      var observer = app.observe(expr, callback, this);
      this._observers.push(observer);
      if (this._bound) {
        // If not bound will bind on attachment
        observer.bind(this);
      }
      return observer;
    },


    listen: function(target, eventName, listener, context) {
      if (typeof target === 'string') {
        context = listener;
        listener = eventName;
        eventName = target;
        target = this.element;
      }

      if (typeof listener !== 'function') {
        throw new TypeError('listener must be a function');
      }

      listener = listener.bind(context || this);

      var listenerData = {
        target: target,
        eventName: eventName,
        listener: listener
      };

      this._listeners.push(listenerData);

      if (this._bound) {
        // If not bound will add on attachment
        target.addEventListener(eventName, listener);
      }
    },

    get: function(expression) {
      return app.observations.get(this, expression);
    },

    set: function(expression, value) {
      return app.observations.set(this, expression, value);
    }
  };
};

},{}],66:[function(require,module,exports){
module.exports = require('./src/diff');

},{"./src/diff":67}],67:[function(require,module,exports){
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
  function Splice(object, index, removed, addedCount) {
    ChangeRecord.call(this, object, 'splice', String(index));
    this.index = index;
    this.removed = removed;
    this.addedCount = addedCount;
  }

  Splice.prototype = Object.create(ChangeRecord.prototype);


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
  function diffObjects(value, oldValue) {
    if ( !(value && oldValue && typeof value === 'object' && typeof oldValue === 'object')) {
      throw new TypeError('Both values for diff.object must be objects');
    }
    var changeRecords = [];
    var prop, propOldValue, propValue;

    // Goes through the old object (should be a clone) and look for things that are now gone or changed
    for (prop in oldValue) {
      propOldValue = oldValue[prop];
      propValue = value[prop];

      // Allow for the case of obj.prop = undefined (which is a new property, even if it is undefined)
      if (propValue !== undefined && !diffBasic(propValue, propOldValue)) {
        continue;
      }

      // If the property is gone it was removed
      if (! (prop in value)) {
        changeRecords.push(new ChangeRecord(value, 'delete', prop, propOldValue));
      } else if (diffBasic(propValue, propOldValue)) {
        changeRecords.push(new ChangeRecord(value, 'update', prop, propOldValue));
      }
    }

    // Goes through the old object and looks for things that are new
    for (prop in value) {
      propValue = value[prop];
      if (! (prop in oldValue)) {
        changeRecords.push(new ChangeRecord(value, 'add', prop));
      }
    }

    if (Array.isArray(value) && value.length !== oldValue.length) {
      changeRecords.push(new ChangeRecord(value, 'update', 'length', oldValue.length));
    }

    return changeRecords;
  }





  var EDIT_LEAVE = 0;
  var EDIT_UPDATE = 1;
  var EDIT_ADD = 2;
  var EDIT_DELETE = 3;


  // Diffs two arrays returning an array of splices. A splice object looks like:
  // ```javascript
  // {
  //   index: 3,
  //   removed: [item, item],
  //   addedCount: 0
  // }
  // ```
  function diffArrays(value, oldValue) {
    if (!Array.isArray(value) || !Array.isArray(oldValue)) {
      throw new TypeError('Both values for diff.array must be arrays');
    }

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
      return [ new Splice(value, currentStart, oldValue.slice(oldStart, oldEnd), 0) ];
    }

    // if nothing was removed, only added to one spot
    if (oldStart === oldEnd) {
      return [ new Splice(value, currentStart, [], currentEnd - currentStart) ];
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
          splice = new Splice(value, index, [], 0);
        }

        splice.addedCount++;
        index++;

        splice.removed.push(oldValue[oldIndex]);
        oldIndex++;
      } else if (op === EDIT_ADD) {
        if (!splice) {
          splice = new Splice(value, index, [], 0);
        }

        splice.addedCount++;
        index++;
      } else if (op === EDIT_DELETE) {
        if (!splice) {
          splice = new Splice(value, index, [], 0);
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
      var min;

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

},{}],68:[function(require,module,exports){
module.exports = require('./src/expressions');

},{"./src/expressions":69}],69:[function(require,module,exports){
var slice = Array.prototype.slice;
var strings = require('./strings');
var formatterParser = require('./formatters');
var propertyChains = require('./property-chains');
var valueProperty = '_value_';
var cache = {};

exports.globals = {};


exports.parse = function(expr, globals, formatters) {
  if (typeof expr !== 'string') {
    throw new TypeError('Invalid expr, must be type String');
  }
  var extraArgs = slice.call(arguments, 3);
  var cacheKey = expr + '|' + extraArgs.join(',');
  // Returns the cached function for this expression if it exists.
  var func = cache[cacheKey];
  if (func) {
    return func;
  }

  var original = expr;
  var isSetter = (extraArgs[0] === valueProperty);

  expr = strings.pullOutStrings(expr);
  expr = formatterParser.parseFormatters(expr);
  expr = propertyChains.parseExpression(expr, getVariables(globals, extraArgs));
  if (!isSetter) {
    var lines = expr.split('\n');
    lines[lines.length - 1] = 'return ' + lines[lines.length - 1];
    expr = lines.join('\n');
  }
  expr = strings.putInStrings(expr);
  func = compileExpression(original, expr, globals, formatters, extraArgs);
  func.expr = expr;
  cache[cacheKey] = func;
  return func;
};


exports.parseSetter = function(expr, globals, formatters, extraArgs) {
  var extraArgs = slice.call(arguments, 3);

  if (expr.charAt(0) === '!') {
    // Allow '!prop' to become 'prop = !value'
    expr = expr.slice(1).replace(/(\s*\||$)/, ' = !_value_$1');
  } else {
    expr = expr.replace(/(\s*\||$)/, ' = _value_$1');
  }

  // Add _value_ as the first extra argument
  return exports.parse.apply(exports, [expr, globals, formatters, valueProperty].concat(extraArgs));
};


function getVariables(globals, extraArgs) {
  var variables = {};

  Object.keys(exports.globals).forEach(function(key) {
    variables[key] = exports.globals[key];
  });

  if (globals) {
    Object.keys(globals).forEach(function(key) {
      variables[key] = globals[key];
    });
  }

  extraArgs.forEach(function(key) {
    variables[key] = null;
  });

  return variables;
}



function compileExpression(original, expr, globals, formatters, extraArgs) {
  var func, args = ['_globals_', '_formatters_'].concat(extraArgs).concat(expr);

  try {
    func = Function.apply(null, args);
  } catch (e) {
    // Throws an error if the expression was not valid JavaScript
    throw new Error('Bad expression: ' + original + '\n' + 'Compiled expression:\n' + expr + '\n' + e.message);
  }

  return bindArguments(func, globals, formatters);
}


// a custom "bind" function to bind arguments to a function without binding the context
function bindArguments(func) {
  var args = slice.call(arguments, 1);
  return function() {
    return func.apply(this, args.concat(slice.call(arguments)));
  }
}

},{"./formatters":70,"./property-chains":71,"./strings":72}],70:[function(require,module,exports){

// finds pipes that are not ORs (i.e. ` | ` not ` || `) for formatters
var pipeRegex = /\|(\|)?/g;

// A string that would not appear in valid JavaScript
var placeholder = '@@@';
var placeholderRegex = new RegExp('\\s*' + placeholder + '\\s*');

// determines whether an expression is a setter or getter (`name` vs `name = 'bob'`)
var setterRegex = /\s=\s/;

// finds the parts of a formatter, name and args (e.g. `foo(bar)`)
var formatterRegex = /^([^\(]+)(?:\((.*)\))?$/;

// finds argument separators for formatters (`arg1, arg2`)
var argSeparator = /\s*,\s*/g;


/**
 * Finds the formatters within an expression and converts them to the correct JavaScript equivalent.
 */
exports.parseFormatters = function(expr) {
  // Converts `name | upper | foo(bar)` into `name @@@ upper @@@ foo(bar)`
  expr = expr.replace(pipeRegex, function(match, orIndicator) {
    if (orIndicator) return match;
    return placeholder;
  });

  // splits the string by "@@@", pulls of the first as the expr, the remaining are formatters
  formatters = expr.split(placeholderRegex);
  expr = formatters.shift();
  if (!formatters.length) return expr;

  // Processes the formatters
  // If the expression is a setter the value will be run through the formatters
  var setter = '';
  var value = expr;

  if (setterRegex.test(expr)) {
    var parts = expr.split(setterRegex);
    setter = parts[0] + ' = ';
    value = parts[1];
  }

  // Processes the formatters
  formatters.forEach(function(formatter) {
    var match = formatter.trim().match(formatterRegex);

    if (!match) {
      throw new Error('Formatter is invalid: ' + formatter);
    }

    var formatterName = match[1];
    var args = match[2] ? match[2].split(argSeparator) : [];

    // Add the previous value as the first argument
    args.unshift(value);

    // If this is a setter expr, be sure to add the `isSetter` flag at the end of the formatter's arguments
    if (setter) {
      args.push(true);
    }

    // Set the value to become the result of this formatter, so the next formatter can wrap it.
    // Call formatters in the current context.
    value = '_formatters_.' + formatterName + '.call(this, ' + args.join(', ') + ')';
  });

  return setter + value;
};

},{}],71:[function(require,module,exports){
var referenceCount = 0;
var currentReference = 0;
var currentIndex = 0;
var finishedChain = false;
var continuation = false;
var globals = null;
var defaultGlobals = {
  return: null,
  true: null,
  false: null,
  undefined: null,
  null: null,
  this: null,
  window: null,
  Math: null,
  parseInt: null,
  parseFloat: null,
  isNaN: null,
  Array: null,
  typeof: null,
  _globals_: null,
  _formatters_: null,
  _value_: null,
};


// matches property chains (e.g. `name`, `user.name`, and `user.fullName().capitalize()`)
var propertyRegex = /((\{|,|\.)?\s*)([a-z$_\$](?:[a-z_\$0-9\.-]|\[['"\d]+\])*)(\s*(:|\(|\[)?)/gi;
/**
 * Broken down
 *
 * ((\{|,|\.)?\s*)
 * prefix: matches on object literals so we can skip (in `{ foo: bar }` "foo" is not a property). Also picks up on
 * unfinished chains that had function calls or brackets we couldn't finish such as the dot in `.test` after the chain
 * `foo.bar().test`.
 *
 * ([a-z$_\$](?:[a-z_\$0-9\.-]|\[['"\d]+\])*)
 * property chain: matches property chains such as the following (strings' contents are removed at this step)
 *   `foo, foo.bar, foo.bar[0], foo.bar[0].test, foo.bar[''].test`
 *   Does not match through functions calls or through brackets which contain variables.
 *   `foo.bar().test, foo.bar[prop].test`
 *   In these cases it would only match `foo.bar`, `.test`, and `prop`
 *
 * (\s*(:|\(|\[)?)
 * postfix: matches trailing characters to determine if this is an object property or a function call etc. Will match
 * the colon after "foo" in `{ foo: 'bar' }`, the first parenthesis in `obj.foo(bar)`, the the first bracket in
 * `foo[bar]`.
 */

// links in a property chain
var chainLinksRegex = /\.|\[/g;

// the property name part of links
var chainLinkRegex = /\.|\[|\(/;

var andRegex = / and /g;
var orRegex = / or /g;


exports.parseExpression = function(expr, _globals) {
  // Reset all values
  referenceCount = 0;
  currentReference = 0;
  currentIndex = 0;
  finishedChain = false;
  continuation = false;
  globals = _globals;

  expr = replaceAndsAndOrs(expr);
  if (expr.indexOf(' = ') !== -1) {
    var parts = expr.split(' = ');
    var setter = parts[0];
    var value = parts[1];
    setter = parsePropertyChains(setter).replace(/^\(|\)$/g, '');
    value = parsePropertyChains(value);
    expr = setter + ' = ' + value;
  } else {
    expr = parsePropertyChains(expr);
  }
  expr = addReferences(expr)

  // Reset after parse is done
  globals = null;

  return expr;
};


/**
 * Finds and parses the property chains in an expression.
 */
function parsePropertyChains(expr) {
  var parsedExpr = '', chain;

  // allow recursion (e.g. into function args) by resetting propertyRegex
  // This is more efficient than creating a new regex for each chain, I assume
  var prevCurrentIndex = currentIndex;
  var prevLastIndex = propertyRegex.lastIndex;

  currentIndex = 0;
  propertyRegex.lastIndex = 0;
  while ((chain = nextChain(expr)) !== false) {
    parsedExpr += chain;
  }

  // Reset indexes
  currentIndex = prevCurrentIndex;
  propertyRegex.lastIndex = prevLastIndex;
  return parsedExpr;
};


function nextChain(expr) {
  if (finishedChain) {
    return (finishedChain = false);
  }
  var match = propertyRegex.exec(expr);
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

  var skipped = expr.slice(currentIndex, propertyRegex.lastIndex - match.length);
  currentIndex = propertyRegex.lastIndex;

  // skips object keys e.g. test in `{test:true}`.
  if (objIndicator && colonOrParen === ':') {
    return skipped + match;
  }

  return skipped + parseChain(prefix, propChain, postfix, colonOrParen, expr);
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

  if (links.length === 1 && !continuation && !parens[paren]) {
    link = links[0];
    newChain = addThisOrGlobal(link);
  } else {
    if (!continuation) {
      newChain = '(';
    }

    links.forEach(function(link, index) {
      if (index !== links.length - 1) {
        newChain += parsePart(link, index);
      } else {
        if (!parens[paren]) {
          newChain += '_ref' + currentReference + link;
        } else {
          if (continuation && index === 0) {
            index++;
          }
          postfix = postfix.replace(paren, '');
          newChain += paren === '(' ? parseFunction(link, index, expr) : parseBrackets(link, index, expr);
        }
      }
    });

    if (expr.charAt(propertyRegex.lastIndex) !== '.') {
      newChain += ')';
    }
  }

  return prefix + newChain + postfix;
}


function splitLinks(chain) {
  var index = 0;
  var parts = [];
  var match;
  while (match = chainLinksRegex.exec(chain)) {
    if (chainLinksRegex.lastIndex === 1) continue;
    parts.push(chain.slice(index, chainLinksRegex.lastIndex - 1));
    index = chainLinksRegex.lastIndex - 1;
  }
  parts.push(chain.slice(index));
  return parts;
}


function addThisOrGlobal(chain) {
  var prop = chain.split(chainLinkRegex).shift();
  if (globals.hasOwnProperty(prop)) {
    return globals[prop] === null ? chain : '_globals_.' + chain;
  } else if (defaultGlobals.hasOwnProperty(prop)) {
    return chain;
  } else {
    return 'this.' + chain;
  }
}


var parens = {
  '(': ')',
  '[': ']'
};

// Handles a function to be called in its correct scope
// Finds the end of the function and processes the arguments
function parseFunction(link, index, expr) {
  var call = getFunctionCall(expr);

  // Always call functions in the scope of the object they're a member of
  if (index === 0) {
    link = addThisOrGlobal(link);
  } else {
    link = '_ref' + currentReference + link;
  }

  var calledLink = link + '(~~insideParens~~)';

  link = 'typeof ' + link + ' !== \'function\' ? void 0 : ' + calledLink;
  var insideParens = call.slice(1, -1);

  if (expr.charAt(propertyRegex.lastIndex) === '.') {
    currentReference = ++referenceCount;
    var ref = '_ref' + currentReference;
    link = '(' + ref + ' = (' + link + ')) == null ? void 0 : ';
  }

  var ref = currentReference;
  link = link.replace('~~insideParens~~', parsePropertyChains(insideParens));
  currentReference = ref;
  return link;
}

// Handles a bracketed expression to be parsed
function parseBrackets(link, index, expr) {
  var call = getFunctionCall(expr);
  var insideBrackets = call.slice(1, -1);
  var evaledLink = parsePart(link, index);
  index += 1;
  link = '[~~insideBrackets~~]';

  if (expr.charAt(propertyRegex.lastIndex) === '.') {
    link = parsePart(link, index);
  } else {
    link = '_ref' + currentReference + link;
  }

  link = evaledLink + link;

  var ref = currentReference;
  link = link.replace('~~insideBrackets~~', parsePropertyChains(insideBrackets));
  currentReference = ref;
  return link;
}


// returns the call part of a function (e.g. `test(123)` would return `(123)`)
function getFunctionCall(expr) {
  var startIndex = propertyRegex.lastIndex;
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
  currentIndex = propertyRegex.lastIndex = endIndex + 1;
  return open + expr.slice(startIndex, endIndex) + close;
}



function parsePart(part, index) {
  // if the first
  if (index === 0 && !continuation) {
    part = addThisOrGlobal(part);
  } else {
    part = '_ref' + currentReference + part;
  }

  currentReference = ++referenceCount;
  var ref = '_ref' + currentReference;
  return '(' + ref + ' = ' + part + ') == null ? void 0 : ';
}


function replaceAndsAndOrs(expr) {
  return expr.replace(andRegex, ' && ').replace(orRegex, ' || ');
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

},{}],72:[function(require,module,exports){
// finds all quoted strings
var quoteRegex = /(['"\/])(\\\1|[^\1])*?\1/g;

// finds all empty quoted strings
var emptyQuoteExpr = /(['"\/])\1/g;

var strings = null;


/**
 * Remove strings from an expression for easier parsing. Returns a list of the strings to add back in later.
 * This method actually leaves the string quote marks but empties them of their contents. Then when replacing them after
 * parsing the contents just get put back into their quotes marks.
 */
exports.pullOutStrings = function(expr) {
  if (strings) {
    throw new Error('putInStrings must be called after pullOutStrings.');
  }

  strings = [];

  return expr.replace(quoteRegex, function(str, quote) {
    strings.push(str);
    return quote + quote; // placeholder for the string
  });
};


/**
 * Replace the strings previously pulled out after parsing is finished.
 */
exports.putInStrings = function(expr) {
  if (!strings) {
    throw new Error('pullOutStrings must be called before putInStrings.');
  }

  expr = expr.replace(emptyQuoteExpr, function() {
    return strings.shift();
  });

  strings = null;

  return expr;
};

},{}],73:[function(require,module,exports){
var Fragments = require('./src/fragments');
var Observations = require('observations-js');

function create(options) {
  options = options || {};
  var observations = Observations.create();
  options.observations = observations;
  var fragments = new Fragments(options);
  fragments.sync = observations.sync.bind(observations);
  fragments.syncNow = observations.syncNow.bind(observations);
  fragments.afterSync = observations.afterSync.bind(observations);
  fragments.onSync = observations.onSync.bind(observations);
  fragments.offSync = observations.offSync.bind(observations);
  return fragments;
}

// Create an instance of fragments with the default observer
exports.create = create;

},{"./src/fragments":77,"observations-js":83}],74:[function(require,module,exports){
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
    var animateObject, className, classAnimateName, classWillName,
        methodAnimateName, methodWillName, methodDidName, dir, _this = this;

    if (this.animateObject && typeof this.animateObject === 'object') {
      animateObject = this.animateObject;
      animateObject.fragments = this.fragments;
    } else if (this.animateClassName) {
      className = this.animateClassName;
    } else if (typeof this.animateObject === 'string') {
      className = this.animateObject;
    }

    classAnimateName = 'animate-' + direction;
    classWillName = 'will-animate-' + direction;
    dir = direction === 'in' ? 'In' : 'Out';
    methodAnimateName = 'animate' + dir;
    methodWillName = 'willAnimate' + dir;
    methodDidName = 'didAnimate' + dir;

    if (className) node.classList.add(className);
    node.classList.add(classWillName);

    if (animateObject) {
      animation.makeElementAnimatable(node);
      if (animateObject[methodWillName]) {
        animateObject[methodWillName](node);
      }
    }

    // trigger reflow
    node.offsetWidth = node.offsetWidth;

    node.classList.add(classAnimateName);
    node.classList.remove(classWillName);
    node.dispatchEvent(new Event('animatestart'));

    var whenDone = function() {
      if (animateObject && animateObject[methodDidName]) animateObject[methodDidName](node);
      if (callback) callback.call(_this);
      node.classList.remove(classAnimateName);
      if (className) node.classList.remove(className);
      node.dispatchEvent(new Event('animateend'));
    };

    if (animateObject && animateObject[methodAnimateName]) {
      animateObject[methodAnimateName](node, whenDone);
    } else {
      var duration = getDuration.call(this, node, direction);
      if (duration) {
        onAnimationEnd(node, duration, whenDone);
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
var transitionEventName = 'transitionend';
var animationEventName = 'animationend';
var style = document.documentElement.style;

['webkit', 'moz', 'ms', 'o'].forEach(function(prefix) {
  if (style.transitionDuration === undefined && style[prefix + 'TransitionDuration']) {
    transitionDurationName = prefix + 'TransitionDuration';
    transitionDelayName = prefix + 'TransitionDelay';
    transitionEventName = prefix + 'transitionend';
  }

  if (style.animationDuration === undefined && style[prefix + 'AnimationDuration']) {
    animationDurationName = prefix + 'AnimationDuration';
    animationDelayName = prefix + 'AnimationDelay';
    animationEventName = prefix + 'animationend';
  }
});


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


function onAnimationEnd(node, duration, callback) {
  var onEnd = function() {
    node.removeEventListener(transitionEventName, onEnd);
    node.removeEventListener(animationEventName, onEnd);
    clearTimeout(timeout);
    callback();
  };

  // contingency plan
  var timeout = setTimeout(onEnd, duration + 10);

  node.addEventListener(transitionEventName, onEnd);
  node.addEventListener(animationEventName, onEnd);
}
},{"./binding":75,"./util/animation":79}],75:[function(require,module,exports){
module.exports = Binding;
var Class = require('chip-utils/class');

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
  this.observations = this.fragments.observations;
  this.context = null;
}

Class.extend(Binding, {
  /**
   * Default priority binders may override.
   */
  priority: 0,


  /**
   * Initialize a cloned binding. This happens after a compiled binding on a template is cloned for a view.
   */
  init: function() {
    Object.defineProperties(this, {
      _observers: { configurable: true, value: [] },
      _listeners: { configurable: true, value: [] }
    });
    if (this.expression) {
      // An observer to observe value changes to the expression within a context
      this.observer = this.observations.createObserver(this.expression, this.updated, this);
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
    binding.view = view;
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
    if (this.observer) this.observer.context = context;
    this.bound();

    if (this.observer && this.updated !== Binding.prototype.updated) {
      this.observer.bind(context);
    }

    this._observers.forEach(function(observer) {
      observer.bind(context);
    });

    this._listeners.forEach(function(item) {
      item.target.addEventListener(item.eventName, item.listener);
    });
  },


  // Unbind this from its context
  unbind: function() {
    if (this.context === null) {
      return;
    }

    if (this.observer) this.observer.unbind();

    this._observers.forEach(function(observer) {
      observer.unbind();
    });

    this._listeners.forEach(function(item) {
      item.target.removeEventListener(item.eventName, item.listener);
    });

    this.unbound();
    this.context = null;
  },


  // Cleans up binding completely
  dispose: function() {
    this.unbind();
    if (this.observer) {
      // This will clear it out, nullifying any data stored
      this.observer.sync();
    }
    this._observers.forEach(function(observer) {
      observer.sync();
    });
    this.disposed();
  },

  sync: function() {
    if (this.context && this.observer && this.updated !== Binding.prototype.updated) {
      this.observer.sync();
    }
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

  // The function to run when the binding is attached to the DOM
  attached: function() {},

  // The function to run when the binding is removed from the DOM
  detached: function() {},

  // The function to run when the binding is disposed
  disposed: function() {},

  // Helper methods

  get camelCase() {
    return (this.match || this.name || '').replace(/-+(\w)/g, function(_, char) {
      return char.toUpperCase();
    });
  },

  observe: function(expression, callback, callbackContext) {
    if (typeof callback !== 'function') {
      throw new TypeError('callback must be a function');
    }

    var observer = this.observations.createObserver(expression, callback, callbackContext || this);
    this._observers.push(observer);
    if (this.context) {
      // If not bound will bind on attachment
      observer.bind(this.context);
    }
    return observer;
  },

  listen: function(target, eventName, listener, context) {
    if (typeof target === 'string') {
      context = listener;
      listener = eventName;
      eventName = target;
      target = this.element;
    }

    if (typeof listener !== 'function') {
      throw new TypeError('listener must be a function');
    }

    listener = listener.bind(context || this);

    var listenerData = {
      target: target,
      eventName: eventName,
      listener: listener
    };

    this._listeners.push(listenerData);

    if (this.context) {
      // If not bound will add on attachment
      target.addEventListener(eventName, listener);
    }
  },

  get: function(expression) {
    return this.observations.get(this.context, expression);
  },

  set: function(expression, value) {
    return this.observations.set(this.context, expression, value);
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

},{"chip-utils/class":57}],76:[function(require,module,exports){
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
  var Binder, binding, expr, bound, match, attr, i, l;

  if (node.nodeType === Node.TEXT_NODE) {
    splitTextNode(fragments, node);

    // Find any binding for the text node
    if (fragments.isBound('text', node.nodeValue)) {
      expr = fragments.codifyExpression('text', node.nodeValue);
      node.nodeValue = '';
      Binder = fragments.findBinder('text', expr);
      if (Binder.expression) {
        // the expression is the wildcard inside a text binder
        expr = expr.match(Binder.expression)[1];
      }
      binding = new Binder({ node: node, view: view, expression: expr, fragments: fragments });
      if (binding.compiled() !== false) {
        bindings.push(binding);
      }
    }
  } else {
    // If the element is removed from the DOM, stop. Check by looking at its parentNode
    var parent = node.parentNode;
    var DefaultBinder = fragments.getAttributeBinder('__default__');
    bound = [];

    // Find any binding for the element
    Binder = fragments.findBinder('element', node.tagName.toLowerCase());
    if (Binder) {
      bound.push([ Binder ]);
    }

    // Find and add any attribute bindings on an element. These can be attributes whose name matches a binding, or
    // they can be attributes which have a binding in the value such as `href="/post/{{ post.id }}"`.
    var attributes = slice.call(node.attributes);
    for (i = 0, l = attributes.length; i < l; i++) {
      attr = attributes[i];
      Binder = fragments.findBinder('attribute', attr.name, attr.value);
      if (Binder) {
        bound.push([ Binder, attr ]);
      }
    }

    // Make sure to create and process them in the correct priority order so if a binding create a template from the
    // node it doesn't process the others.
    bound.sort(sortBindings);

    for (i = 0; i < bound.length; i++) {
      Binder = bound[i][0];
      attr = bound[i][1];

      if (attr) {
        if (!node.hasAttribute(attr.name)) {
          // If this was removed already by another binding, don't process.
          continue;
        }
        var name = attr.name;
        var value = attr.value;
        if (Binder.expression) {
          match = name.match(Binder.expression);
          if (match) match = match[1];
        } else {
          match = null;
        }

        if (attr && node.hasAttribute(attr.name)) {
          node.removeAttribute(attr.name);
        }

        binding = new Binder({
          node: node,
          view: view,
          name: name,
          match: match,
          expression: value ? fragments.codifyExpression('attribute', value, Binder !== DefaultBinder) : null,
          fragments: fragments
        });
      } else {
        binding = new Binder({ node: node, view: view, fragments: fragments });
      }

      if (binding.compiled() !== false) {
        bindings.push(binding);
      } else if (attr && Binder !== DefaultBinder && fragments.isBound('attribute', value)) {
        // Revert to default if this binding doesn't take
        bound.push([ DefaultBinder, attr ]);
      } else if (attr) {
        node.setAttributeNode(attr);
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
      while ((match = regex.exec(content))) {
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


function sortBindings(a, b) {
  return b[0].prototype.priority - a[0].prototype.priority;
}

function notEmpty(value) {
  return Boolean(value);
}

},{}],77:[function(require,module,exports){
module.exports = Fragments;
require('./util/polyfills');
var Class = require('chip-utils/class');
var toFragment = require('./util/toFragment');
var animation = require('./util/animation');
var Template = require('./template');
var View = require('./view');
var Binding = require('./binding');
var AnimatedBinding = require('./animated-binding');
var compile = require('./compile');
var hasWildcardExpr = /(^|[^\\])\*/;
var escapedWildcardExpr = /(^|[^\\])\\\*/;

/**
 * A Fragments object serves as a registry for binders and formatters
 * @param {Observations} observations An instance of Observations for tracking changes to the data
 */
function Fragments(options) {
  if (!options || !options.observations) {
    throw new TypeError('Must provide an observations instance to Fragments in options.');
  }

  this.compiling = false;
  this.observations = options.observations;
  this.globals = options.observations.globals;
  this.formatters = options.observations.formatters;
  this.animations = {};
  this.animateAttribute = 'animate';

  this.binders = {
    element: { _wildcards: [] },
    attribute: { _wildcards: [], _expr: /{{\s*(.*?)\s*}}(?!})/g, _delimitersOnlyInDefault: false },
    text: { _wildcards: [], _expr: /{{\s*(.*?)\s*}}(?!})/g }
  };

  // Text binder for text nodes with expressions in them
  this.registerText('__default__', function(value) {
    this.element.textContent = (value != null) ? value : '';
  });

  // Text binder for text nodes with expressions in them to be converted to HTML
  this.registerText('{*}', function(value) {
    if (this.view) {
      this.view.remove();
      this.view = null;
    }

    if (typeof value === 'string' && value) {
      this.view = View.makeInstanceOf(toFragment(value));
      this.element.parentNode.insertBefore(this.view, this.element.nextSibling);
    }
  });

  // Catchall attribute binder for regular attributes with expressions in them
  this.registerAttribute('__default__', function(value) {
    if (value != null) {
      this.element.setAttribute(this.name, value);
    } else {
      this.element.removeAttribute(this.name);
    }
  });

  this.addOptions(options);
}

Class.extend(Fragments, {

  addOptions: function(options) {
    if (options) {
      processOption(options.binders, this, 'registerAttribute');
      processOption(options.formatters, this, 'registerFormatter');
      processOption(options.animations, this, 'registerAnimation');
    }
  },

  /**
   * Takes an HTML string, an element, an array of elements, or a document fragment, and compiles it into a template.
   * Instances may then be created and bound to a given context.
   * @param {String|NodeList|HTMLCollection|HTMLTemplateElement|HTMLScriptElement|Node} html A Template can be created
   * from many different types of objects. Any of these will be converted into a document fragment for the template to
   * clone. Nodes and elements passed in will be removed from the DOM.
   */
  createTemplate: function(html) {
    if (!html) {
      throw new TypeError('Invalid html, cannot create a template from: ' + html);
    }
    var fragment = toFragment(html);
    if (fragment.childNodes.length === 0) {
      throw new Error('Cannot create a template from ' + html + ' because it is empty.');
    }
    var template = Template.makeInstanceOf(fragment);
    this.compileTemplate(template);
    return template;
  },


  /**
   * Takes a template instance and pre-compiles it
   * @param  {Template} template A template
   * @return {Template} The template
   */
  compileTemplate: function(template) {
    if (template && !template.compiled) {
      // Set compiling flag on fragments, but don't turn it false until the outermost template is done
      var lastCompilingValue = this.compiling;
      this.compiling = true;
      // Set this before compiling so we don't get into infinite loops if there is template recursion
      template.compiled = true;
      template.bindings = compile(this, template);
      this.compiling = lastCompilingValue;
    }
    return template;
  },


  /**
   * Compiles bindings on an element.
   */
  compileElement: function(element) {
    if (!element.bindings) {
      element.bindings = compile(this, element);
      View.makeInstanceOf(element);
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
   * Observes an expression within a given context, calling the callback when it changes and returning the observer.
   */
  observe: function(context, expr, callback, callbackContext) {
    if (typeof context === 'string') {
      callbackContext = callback;
      callback = expr;
      expr = context;
      context = null;
    }
    var observer = this.observations.createObserver(expr, callback, callbackContext);
    if (context) {
      observer.bind(context, true);
    }
    return observer;
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
    if (!definition) throw new TypeError('Must provide a definition when registering a binder');
    var binders = this.binders[type];
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

    if (binders[name]) {
      this.unregisterBinder(type, name);
    }

    // Create a subclass of Binding (or another binder) with the definition
    function Binder() {
      superClass.apply(this, arguments);
    }
    superClass.extend(Binder, definition);

    var expr;
    if (name instanceof RegExp) {
      expr = name;
    } else if (hasWildcardExpr.test(name)) {
      expr = new RegExp('^' + escapeRegExp(name).replace(escapedWildcardExpr, '$1(.*)') + '$');
    }

    if (expr) {
      Binder.expression = expr;
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
    if (binder.expression) {
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

    if (name === this.animateAttribute) {
      return;
    }

    var binder = this.getBinder(type, name), binders = this.binders[type];

    if (!binder) {
      var toMatch = (type === 'text') ? value : name;
      binders._wildcards.some(function(wildcardBinder) {
        if (toMatch.match(wildcardBinder.expression)) {
          binder = wildcardBinder;
          return true;
        }
      });
    }

    // don't use e.g. the `value` binder if there is no expression in the attribute value (e.g. `value="some text"`)
    if (binder &&
        type === 'attribute' &&
        binder.prototype.onlyWhenBound &&
        !this.binders[type]._delimitersOnlyInDefault &&
        !this.isBound(type, value)) {
      return;
    }

    // Test if the attribute value is bound (e.g. `href="/posts/{{ post.id }}"`)
    if (!binder && value && (type === 'text' || this.isBound(type, value))) {
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
  unregisterFormatter: function (name) {
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
   * default attribute matcher will not apply to the rest of the attributes. TODO support different delimiters for the
   * default attributes vs registered ones (i.e. allow regular attributes to use {{}} when bound ones do not need them)
   */
  setExpressionDelimiters: function(type, pre, post, onlyInDefault) {
    if (type !== 'attribute' && type !== 'text') {
      throw new TypeError('Expression delimiters must be of type "attribute" or "text"');
    }

    this.binders[type]._expr = new RegExp(escapeRegExp(pre) + '(.*?)' + escapeRegExp(post), 'g');
    if (type === 'attribute') {
      this.binders[type]._delimitersOnlyInDefault = !!onlyInDefault;
    }
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
  codifyExpression: function(type, text, notDefault) {
    if (type !== 'attribute' && type !== 'text') {
      throw new TypeError('codifyExpression must use type "attribute" or "text"');
    }

    if (notDefault && this.binders[type]._delimitersOnlyInDefault) {
      return text;
    }

    var expr = this.binders[type]._expr;
    var match = text.match(expr);

    if (!match) {
      return '"' + text.replace(/"/g, '\\"') + '"';
    } else if (match.length === 1 && match[0] === text) {
      return text.replace(expr, '$1');
    } else {
      var newText = '"', lastIndex = 0;
      while ((match = expr.exec(text))) {
        var str = text.slice(lastIndex, expr.lastIndex - match[0].length);
        newText += str.replace(/"/g, '\\"');
        newText += '" + (' + match[1] + ' || "") + "';
        lastIndex = expr.lastIndex;
      }
      newText += text.slice(lastIndex).replace(/"/g, '\\"') + '"';
      return newText.replace(/^"" \+ | "" \+ | \+ ""$/g, '');
    }
  }

});

// Takes a string like "(\*)" or "on-\*" and converts it into a regular expression.
function escapeRegExp(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

function processOption(obj, fragments, methodName) {
  if (obj) {
    Object.keys(obj).forEach(function(name) {
      fragments[methodName](name, obj[name]);
    });
  }
}
},{"./animated-binding":74,"./binding":75,"./compile":76,"./template":78,"./util/animation":79,"./util/polyfills":80,"./util/toFragment":81,"./view":82,"chip-utils/class":57}],78:[function(require,module,exports){
module.exports = Template;
var View = require('./view');
var Class = require('chip-utils/class');


/**
 * ## Template
 * Takes an HTML string, an element, an array of elements, or a document fragment, and compiles it into a template.
 * Instances may then be created and bound to a given context.
 * @param {String|NodeList|HTMLCollection|HTMLTemplateElement|HTMLScriptElement|Node} html A Template can be created
 * from many different types of objects. Any of these will be converted into a document fragment for the template to
 * clone. Nodes and elements passed in will be removed from the DOM.
 */
function Template() {
  this.compiled = false;
  this.pool = [];
}


Class.extend(Template, {

  /**
   * Creates a new view cloned from this template.
   */
  createView: function() {
    if (this.pool.length) {
      return this.pool.pop();
    }

    return View.makeInstanceOf(document.importNode(this, true), this);
  },

  returnView: function(view) {
    if (this.pool.indexOf(view) === -1) {
      this.pool.push(view);
    }
  }
});

},{"./view":82,"chip-utils/class":57}],79:[function(require,module,exports){
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
  var playback = { onfinish: null };

  if (!Array.isArray(css) || css.length !== 2 || !options || !options.hasOwnProperty('duration')) {
    Promise.resolve().then(function() {
      if (playback.onfinish) {
        playback.onfinish();
      }
    });
    return playback;
  }

  var element = this;
  var duration = options.duration || 0;
  var delay = options.delay || 0;
  var easing = options.easing;
  var initialCss = css[0];
  var finalCss = css[1];
  var allCss = {};

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
    return key + transitionOptions;
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

},{}],80:[function(require,module,exports){



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
  };
}

},{}],81:[function(require,module,exports){
module.exports = toFragment;

// Convert stuff into document fragments. Stuff can be:
// * A string of HTML text
// * An element or text node
// * A NodeList or HTMLCollection (e.g. `element.childNodes` or `element.children`)
// * A jQuery object
// * A script element with a `type` attribute of `"text/*"` (e.g. `<script type="text/html">My template code!</script>`)
// * A template element (e.g. `<template>My template code!</template>`)
function toFragment(html) {
  if (typeof html === 'function') {
    html = html();
  }

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
var stringToFragment = function(string) {
  if (!string) {
    var fragment = document.createDocumentFragment();
    fragment.appendChild(document.createTextNode(''));
    return fragment;
  }
  var templateElement;
  templateElement = document.createElement('template');
  templateElement.innerHTML = string;
  return templateElement.content;
};

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
      var fragment;
      if (!string) {
        fragment = document.createDocumentFragment();
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
      fragment = document.createDocumentFragment();
      while (div.firstChild) {
        fragment.appendChild(div.firstChild);
      }
      return fragment;
    };
  })();
}

},{}],82:[function(require,module,exports){
module.exports = View;
var Class = require('chip-utils/class');


/**
 * ## View
 * A DocumentFragment with bindings.
 */
function View(template) {
  this.context = null;
  if (template) {
    this.template = template;
    this.bindings = this.template.bindings.map(function(binding) {
      return binding.cloneForView(this);
    }, this);
  } else if (this.bindings) {
    this.bindings.forEach(function(binding) {
      binding.init();
    });
  }

  this.firstViewNode = this.firstChild;
  this.lastViewNode = this.lastChild;
  if (this.firstViewNode) {
    this.firstViewNode.view = this;
    this.lastViewNode.view = this;
  }
}


Class.extend(View, {

  get inDOM() {
    var parent = this.firstViewNode;
    while (parent && parent !== document) {
      parent = parent.parentNode || parent.host;
    }
    return parent === document;
  },

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

    this.detached();
  },


  /**
   * Removes a view (if not already removed) and adds the view to its template's pool.
   */
  dispose: function() {
    // Make sure the view is removed from the DOM
    this.bindings.forEach(function(binding) {
      binding.dispose();
    });
    this.context = null;

    this.remove();
    if (this.template) {
      this.template.returnView(this);
    }
  },


  /**
   * Binds a view to a given context.
   */
  bind: function(context) {
    this.context = context;
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
    this.context = null;
  },


  /**
   * Triggers the attached callback on the binders, call immediately after adding to the DOM
   */
  attached: function() {
    if (!this._attached && this.inDOM) {
      this._attached = true;
      this.bindings.forEach(function(binding) {
        binding.attached();
      });
    }
  },


  /**
   * Triggers the detached callback on the binders, call immediately after removing from the DOM
   */
  detached: function() {
    if (this._attached && !this.inDOM) {
      this._attached = false;
      this.bindings.forEach(function(binding) {
        binding.detached();
      });
    }
  },


  /**
   * Synchronizes this view against its context
   */
  sync: function() {
    if (this.context === null) return;
    this.bindings.forEach(function(binding) {
      binding.sync();
    });
  }
});

},{"chip-utils/class":57}],83:[function(require,module,exports){

exports.Observations = require('./src/observations');
exports.Observer = require('./src/observer');
exports.create = function() {
  return new exports.Observations();
};

},{"./src/observations":90,"./src/observer":91}],84:[function(require,module,exports){
module.exports = AsyncProperty;
var ComputedProperty = require('./computed-property');

/**
 * Calls the async expression and assigns the results to the object's property when the `whenExpression` changes value
 * to anything other than a falsey value such as undefined. The return value of the async expression should be a
 * Promise.
 * @param {String} whenExpression The conditional expression use to determine when to call the `asyncExpression`
 * @param {String} asyncExpression The expression which will be executed when the `when` value changes and the result of
 * the returned promise is set on the object.
 */
function AsyncProperty(whenExpression, asyncExpression) {
  if (!asyncExpression) {
    asyncExpression = whenExpression;
    whenExpression = 'true';
  }

  this.whenExpression = whenExpression;
  this.asyncExpression = asyncExpression;
}


ComputedProperty.extend(AsyncProperty, {

  addTo: function(observations, computedObject, propertyName) {
    if (!this.runAsyncMethod) {
      this.runAsyncMethod = observations.getExpression(this.asyncExpression);
    }

    return observations.createObserver(this.whenExpression, function(value) {
      if (value) {
        var promise = this.runAsyncMethod.call(computedObject);
        if (promise && promise.then) {
          promise.then(function(value) {
            computedObject[propertyName] = value;
            observations.sync();
          }, function(err) {
            computedObject[propertyName] = undefined;
            observations.sync();
          });
        } else {
          computedObject[propertyName] = promise;
        }
      } else {
        computedObject[propertyName] = undefined;
      }
    }, this);
  }
});

},{"./computed-property":85}],85:[function(require,module,exports){
module.exports = ComputedProperty;
var Class = require('chip-utils/class');


/**
 * An object which will be replaced by its computed value
 */
function ComputedProperty() {}

Class.extend(ComputedProperty, {

  get isComputedProperty() {
    return true;
  },

  /**
   * Add a computed property to a computed object
   * @param {Object} computedObject The object which this property is being added to
   * @param {String} propertyName The name of the property on the object that will be set
   * @return {Observer} An observer which can be bound to the computed object
   */
  addTo: function(computedObject, propertyName) {
    throw new Error('Abstract function is not implemented');
  },

  watch: function(observations, expression, obj, property) {
    if (typeof expression === 'string') {
      // This is a computed expression
      return observations.createObserver(expression, function(value) {
        if (value === undefined) {
          delete obj[property];
        } else {
          obj[property] = value;
        }
      });
    } else if (expression.isComputedProperty) {
      // Add ComputedProperty's observer to the observers and bind if enabled
      return expression.addTo(observations, obj, property);
    }
  }
});

},{"chip-utils/class":57}],86:[function(require,module,exports){
module.exports = ExprProperty;
var ComputedProperty = require('./computed-property');

/**
 * Assigns the result of the `thenExpression` to the object's property when the `ifExpression` is true.
 * @param {String} ifExpression The conditional expression use to determine when to call the `thenExpression`
 * @param {String|ComputedProperty} thenExpression The expression which will be executed when `if` is truthy and the
 *                                                 result set on the object. May also nest computed properties.
 */
function ExprProperty(expression) {
  this.expression = expression;
}


ComputedProperty.extend(ExprProperty, {

  addTo: function(observations, computedObject, propertyName) {
    return this.watch(observations, this.expression, computedObject, propertyName);
  }
});

},{"./computed-property":85}],87:[function(require,module,exports){
module.exports = IfProperty;
var ComputedProperty = require('./computed-property');

/**
 * Assigns the result of the `thenExpression` to the object's property when the `ifExpression` is true.
 * @param {String} ifExpression The conditional expression use to determine when to call the `thenExpression`
 * @param {String|ComputedProperty} thenExpression The expression which will be executed when `if` is truthy and the
 *                                                 result set on the object. May also nest computed properties.
 */
function IfProperty(ifExpression, thenExpression) {
  this.ifExpression = ifExpression;
  this.thenExpression = thenExpression;
}


ComputedProperty.extend(IfProperty, {

  addTo: function(observations, computedObject, propertyName) {
    var observer = this.watch(observations, this.thenExpression, computedObject, propertyName);

    return observations.createObserver(this.ifExpression, function(value) {
      if (value && !observer.context) {
        observer.bind(computedObject);
      } else if (!value && observer.context) {
        observer.unbind();
        observer.sync();
      }
    });
  }
});

},{"./computed-property":85}],88:[function(require,module,exports){
module.exports = MapProperty;
var ComputedProperty = require('./computed-property');

/**
 * Creates an object hash with the key being the value of the `key` property of each item in `sourceExpression` and the
 * value being the result of `expression`. `key` is optional, defaulting to "id" when not provided. `sourceExpression`
 * can resolve to an array or an object hash.
 * @param {Array|Object} sourceExpression An array or object whose members will be added to the map.
 * @param {String} keyExpression The name of the property to key against as values are added to the map.
 * @param {String} resultExpression [Optional] The expression evaluated against the array/object member whose value is
 *                                  added to the map. If not provided, the member will be added.
 * @return {Object} The object map of key=>value
 */
function MapProperty(sourceExpression, keyExpression, resultExpression, removeExpression) {
  this.sourceExpression = sourceExpression;
  this.keyExpression = keyExpression;
  this.resultExpression = resultExpression;
  this.removeExpression = removeExpression;
}


ComputedProperty.extend(MapProperty, {

  addTo: function(observations, computedObject, propertyName) {
    var map = {};
    var observers = {};
    computedObject[propertyName] = map;
    var add = this.addItem.bind(this, observations, computedObject, map, observers);
    var remove = this.removeItem.bind(this, observations, computedObject, map, observers);
    return observations.observeMembers(this.sourceExpression, add, remove, this);
  },

  addItem: function(observations, computedObject, map, observers, item) {
    if (!this.getKey) {
      this.getKey = observations.getExpression(this.keyExpression);
    }

    var key = item && this.getKey.call(item);
    if (!key) {
      return;
    }

    if (key in observers) {
      this.removeObserver(observers, key);
    }

    if (this.resultExpression) {
      var observer = this.watch(observations, this.resultExpression, map, key);
      if (!observer) {
        throw new TypeError('Invalid resultExpression for computed.map');
      }

      var proxy = Object.create(item);
      proxy.$$ = computedObject;
      observer.bind(proxy);
      observers[key] = observer;
    } else {
      map[key] = item;
    }
  },

  removeItem: function(observations, computedObject, map, observers, item) {
    var key = item && this.getKey.call(item);
    if (key) {
      this.removeObserver(observers, key);
      if (this.removeExpression) {
        observations.get(computedObject, this.removeExpression);
      }
      delete map[key];
    }
  },

  removeObserver: function(observers, key) {
    var observer = observers[key];
    if (observer) {
      observer.unbind();
      delete observers[key];
    }
  }
});

},{"./computed-property":85}],89:[function(require,module,exports){
var ComputedProperty = require('./computed-properties/computed-property');
var ExprProperty = require('./computed-properties/expr');
var MapProperty = require('./computed-properties/map');
var IfProperty = require('./computed-properties/if');
var AsyncProperty = require('./computed-properties/async');


exports.create = function(observations) {

  /**
   * Create an object whose properties are dynamically updated with the values of the mapped expressions. An expression
   * can be a simple JavaScript expression with formatters (see https://github.com/chip-js/expressions-js) or it can be
   * a URL for watching the REST APIs. The object will have an array named `computedObservers` which contain all the
   * observers created to watch the properties. The `computedObservers` array has two additional methods, `enable` and
   * `disable` which will turn the binding on/off. When disabled the properties are reset to undefined.
   * @param {Object} map A hash of computed properties, expressions or URLs, that will be set and updated on the object
   * @param {Object} options Options for this computed object:
   *   * enabled {Boolean} Whether to enable this computed object. Default is true.
   * @return {Object} An object which will contain all the values of the computed properties
   */
  function computed(map, options) {
    return computed.extend({}, map, options);
  }


  /**
   * Extends an existing object with the values of the computed properties in the map.
   * @param {Object} obj The object to extend, will create, update, and delete properties from the object as they change
   * @param {Object} map A hash of computed properties that will be mapped onto the object
   * @param {Object} options Options for this computed object:
   *   * enabled {Boolean} Whether to enable this computed object. Default is true.
   * @return {Object} Returns the object passed in
   */
  computed.extend = function(obj, map, options) {
    ensureObservers(obj, options);

    Object.keys(map).forEach(function(property) {
      var expression = map[property];
      var observer;

      if (typeof expression === 'string') {
        // This is a computed expression
        observer = observations.createObserver(expression, function(value) {
          obj[property] = value;
        });
      } else if (expression && expression.isComputedProperty) {
        // Add ComputedProperty's observer to the observers and bind if enabled
        observer = expression.addTo(observations, obj, property);
      } else {
        obj[property] = expression;
      }

      if (observer) {
        obj.computedObservers.push(observer);
        if (obj.computedObservers.enabled) {
          observer.bind(obj);
        }
      }
    });

    return obj;
  };


  /**
   * Assigns the result of the expression to the computed object's property.
   * @param {String} expression The string expression
   * @return {ComputedProperty}
   */
  computed.expr = function(expression) {
    return new ExprProperty(expression);
  };


  /**
   * Creates an object hash with the key being the value of the `key` property of each item in `sourceExpression` and the
   * value being the result of `expression`. `key` is optional, defaulting to "id" when not provided. `sourceExpression`
   * can resolve to an array or an object hash.
   * @param {Array|Object} sourceExpression An array or object whose members will be added to the map.
   * @param {String} keyName [Optional] The name of the property to key against as values are added to the map. Defaults
   *                         to "id"
   * @param {String} expression The expression evaluated against the array/object member whose value is added to the map.
   * @return {ComputedProperty}
   */
  computed.map = function(sourceExpression, keyName, resultExpression, removeExpression) {
    return new MapProperty(sourceExpression, keyName, resultExpression, removeExpression);
  };


  /**
   * Assigns the result of the `thenExpression` to the object's property when the `ifExpression` is true.
   * @param {String} ifExpression The conditional expression use to determine when to call the `thenExpression`
   * @param {String} thenExpression The expression which will be executed when `if` is truthy and the result set on the
   * object.
   * @return {ComputedProperty}
   */
  computed.if = function(ifExpression, thenExpression) {
    return new IfProperty(ifExpression, thenExpression);
  };


  /**
   * Calls the async expression and assigns the results to the object's property when the `whenExpression` changes value
   * to anything other than a falsey value such as undefined. The return value of the async expression should be a
   * Promise.
   * @param {String} whenExpression The conditional expression use to determine when to call the `asyncExpression`
   * @param {String} asyncExpression The expression which will be executed when the `when` value changes and the result of
   * the returned promise is set on the object.
   * @return {ComputedProperty}
   */
  computed.async = function(whenExpression, asyncExpression) {
    return new AsyncProperty(whenExpression, asyncExpression);
  };


  // Make the ComputedProperty class available for extension
  computed.ComputedProperty = ComputedProperty;

  return computed;
};


/**
 * Ensures the observers array exists on an object, creating it if not and adding disable/enable functions to enable and
 * disable observing.
 * @param {Object} obj The object which ought to have an observers array on it
 * @param {Object} options Options for this computed object:
 *   * enabled {Boolean} Whether to enable this computed object. Default is true.
 * @return {Object} The `obj` that was passed in
 */
function ensureObservers(obj, options) {
  if (!obj.computedObservers) {
    Object.defineProperty(obj, 'computedObservers', { value: [] });
    obj.computedObservers.enabled = (!options || options.enabled !== false);

    // Restarts observing changes
    obj.computedObservers.enable = function() {
      if (!this.enabled) {
        this.enabled = true;
        this.forEach(function(observer) {
          observer.bind(obj);
        });
      }
    };

    // Stops observing changes and resets all computed properties to undefined
    obj.computedObservers.disable = function() {
      if (this.enabled) {
        this.enabled = false;
        this.forEach(function(observer) {
          observer.unbind();
          observer.sync();
        });
      }
    };
  }
  return obj;
}

},{"./computed-properties/async":84,"./computed-properties/computed-property":85,"./computed-properties/expr":86,"./computed-properties/if":87,"./computed-properties/map":88}],90:[function(require,module,exports){
(function (global){
module.exports = Observations;
var Class = require('chip-utils/class');
var Observer = require('./observer');
var computed = require('./computed');
var expressions = require('expressions-js');
var requestAnimationFrame = global.requestAnimationFrame || setTimeout;
var cancelAnimationFrame = global.cancelAnimationFrame || clearTimeout;


function Observations() {
  this.globals = {};
  this.formatters = {};
  this.observers = [];
  this.callbacks = [];
  this.listeners = [];
  this.syncing = false;
  this.callbacksRunning = false;
  this.rerun = false;
  this.cycles = 0;
  this.maxCycles = 10;
  this.timeout = null;
  this.pendingSync = null;
  this.syncNow = this.syncNow.bind(this);
  this.computed = computed.create(this);
  this.expressions = expressions;
}


Class.extend(Observations, {

  /**
   * Observes any changes to the result of the expression on the context object and calls the callback.
   */
  observe: function(context, expression, callback, callbackContext) {
    var observer = this.createObserver(expression, callback, callbackContext);
    observer.bind(context);
    return observer;
  },

  /**
   * Creates a new observer attached to this observations object. When the observer is bound to a context it will be
   * added to this `observations` and synced when this `observations.sync` is called.
   */
  createObserver: function(expression, callback, callbackContext) {
    return new Observer(this, expression, callback, callbackContext);
  },

  /**
   * Observe an expression and trigger `onAdd` and `onRemove` whenever a member is added/removed from the array or object.
   * @param {Function} onAdd The function which will be called when a member is added to the source
   * @param {Function} onRemove The function which will be called when a member is removed from the source
   * @return {Observer} The observer for observing the source. Bind against a source object.
   */
  observeMembers: function(expression, onAdd, onRemove, callbackContext) {
    if (!onAdd) onAdd = function(){};
    if (!onRemove) onRemove = function(){};

    var observer = this.createObserver(expression, function(source, oldValue, changes) {
      if (changes) {
        changes.forEach(function(change) {
          if (change.removed) {
            change.removed.forEach(onRemove, callbackContext);
            source.slice(change.index, change.index + change.addedCount).forEach(onAdd, callbackContext);
          } else if (change.type === 'add') {
            onAdd.call(callbackContext, source[change.name]);
          } else if (change.type === 'update') {
            onRemove.call(callbackContext, change.oldValue);
            onAdd.call(callbackContext, source[change.name]);
          } else if (change.type === 'delete') {
            onRemove.call(callbackContext, change.oldValue);
          }
        });
      } else if (Array.isArray(source)) {
        source.forEach(onAdd, callbackContext);
      } else if (source && typeof source === 'object') {
        Object.keys(source).forEach(function(key) {
          onAdd.call(callbackContext, source[key]);
        });
      } else if (Array.isArray(oldValue)) {
        oldValue.forEach(onRemove, callbackContext);
      } else if (oldValue && typeof oldValue === 'object') {
        // If undefined (or something that isn't an array/object) remove the observers
        Object.keys(oldValue).forEach(function(key) {
          onRemove.call(callbackContext, oldValue[key]);
        });
      }
    });

    observer.getChangeRecords = true;
    return observer;
  },


  /**
   * Parses an expression into a function using the globals and formatters objects associated with this instance of
   * observations.
   * @param {String} expression The expression string to parse into a function
   * @param {Object} options Additional options to pass to the parser.
   *                        `{ isSetter: true }` will make this expression a setter that accepts a value.
   *                        `{ extraArgs: [ 'argName' ]` will make extra arguments to pass in to the function.
   * @return {Function} A function that may be called to execute the expression (call it against a context using=
   * `func.call(context)` in order to get the data from the context correct)
   */
  getExpression: function(expression, options) {
    if (options && options.isSetter) {
      return expressions.parseSetter(expression, this.globals, this.formatters, options.extraArgs);
    } else if (options && options.extraArgs) {
      var allArgs = [expression, this.globals, this.formatters].concat(options.extraArgs);
      return expressions.parse.apply(expressions, allArgs);
    } else {
      return expressions.parse(expression, this.globals, this.formatters);
    }
  },


  /**
   * Gets the value of an expression from the given context object
   * @param {Object} context The context object the expression will be evaluated against
   * @param {String} expression The expression to evaluate
   * @return {mixed} The result of the expression against the context
   */
  get: function(context, expression) {
    return this.getExpression(expression).call(context);
  },


  /**
   * Sets the value on the expression in the given context object
   * @param {Object} context The context object the expression will be evaluated against
   * @param {String} expression The expression to set a value with
   * @param {mixed} value The value to set on the expression
   * @return {mixed} The result of the expression against the context
   */
  set: function(source, expression, value) {
    return this.getExpression(expression, { isSetter: true }).call(source, value);
  },


  // Schedules an observer sync cycle which checks all the observers to see if they've changed.
  sync: function(callback) {
    if (typeof callback === 'function') {
      this.afterSync(callback);
    }

    if (this.pendingSync) {
      return false;
    }

    this.pendingSync = requestAnimationFrame(this.syncNow);
    return true;
  },


  // Runs the observer sync cycle which checks all the observers to see if they've changed.
  syncNow: function(callback) {
    if (typeof callback === 'function') {
      this.afterSync(callback);
    }

    cancelAnimationFrame(this.pendingSync);
    this.pendingSync = null;

    if (this.syncing) {
      this.rerun = true;
      return false;
    }

    this.runSync();
    return true;
  },


  runSync: function() {
    this.syncing = true;
    this.rerun = true;
    this.cycles = 0;

    var i, l;

    // Allow callbacks to run the sync cycle again immediately, but stop at `maxCyles` (default 10) cycles so we don't
    // run infinite loops
    while (this.rerun) {
      if (++this.cycles === this.maxCycles) {
        throw new Error('Infinite observer syncing, an observer is calling Observer.sync() too many times');
      }
      this.rerun = false;
      // the observer array may increase or decrease in size (remaining observers) during the sync
      for (i = 0; i < this.observers.length; i++) {
        this.observers[i].sync();
      }
    }

    this.callbacksRunning = true;

    var callbacks = this.callbacks;
    this.callbacks = [];
    while (callbacks.length) {
      callbacks.shift()();
    }

    for (i = 0, l = this.listeners.length; i < l; i++) {
      var listener = this.listeners[i];
      listener();
    }

    this.callbacksRunning = false;
    this.syncing = false;
    this.cycles = 0;
  },


  // After the next sync (or the current if in the middle of one), run the provided callback
  afterSync: function(callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('callback must be a function');
    }

    if (this.callbacksRunning) {
      this.sync();
    }

    this.callbacks.push(callback);
  },


  onSync: function(listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('listener must be a function');
    }

    this.listeners.push(listener);
  },


  offSync: function(listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('listener must be a function');
    }

    var index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1).pop();
    }
  },


  // Adds a new observer to be synced with changes. If `skipUpdate` is true then the callback will only be called when a
  // change is made, not initially.
  add: function(observer, skipUpdate) {
    this.observers.push(observer);
    if (!skipUpdate) {
      observer.forceUpdateNextSync = true;
      observer.sync();
    }
  },


  // Removes an observer, stopping it from being run
  remove: function(observer) {
    var index = this.observers.indexOf(observer);
    if (index !== -1) {
      this.observers.splice(index, 1);
      return true;
    } else {
      return false;
    }
  },
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./computed":89,"./observer":91,"chip-utils/class":57,"expressions-js":68}],91:[function(require,module,exports){
module.exports = Observer;
var Class = require('chip-utils/class');
var expressions = require('expressions-js');
var diff = require('differences-js');

// # Observer

// Defines an observer class which represents an expression. Whenever that expression returns a new value the `callback`
// is called with the value.
//
// If the old and new values were either an array or an object, the `callback` also
// receives an array of splices (for an array), or an array of change objects (for an object) which are the same
// format that `Array.observe` and `Object.observe` return
// <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/observe>.
function Observer(observations, expression, callback, callbackContext) {
  if (typeof expression === 'function') {
    this.getter = expression;
    this.setter = expression;
  } else {
    this.getter = expressions.parse(expression, observations.globals, observations.formatters);
  }
  this.observations = observations;
  this.expression = expression;
  this.callback = callback;
  this.callbackContext = callbackContext;
  this.getChangeRecords = false;
  this.skip = false;
  this.forceUpdateNextSync = false;
  this.context = null;
  this.oldValue = undefined;
}

Class.extend(Observer, {

  // Binds this expression to a given context
  bind: function(context, skipUpdate) {
    this.context = context;
    if (this.callback) {
      this.observations.add(this, skipUpdate);
    }
  },

  // Unbinds this expression
  unbind: function() {
    this.observations.remove(this);
    this.context = null;
  },

  // Closes the observer, cleaning up any possible memory-leaks
  close: function() {
    this.unbind();
    this.callback = null;
    this.callbackContext = null;
  },

  // Returns the current value of this observer
  get: function() {
    if (this.context) {
      return this.getter.call(this.context);
    }
  },

  // Sets the value of this expression
  set: function(value) {
    if (!this.context) return;
    if (this.setter === false) return;
    if (!this.setter) {
      try {
        this.setter = typeof this.expression === 'string'
          ? expressions.parseSetter(this.expression, this.observations.globals, this.observations.formatters)
          : false;
      } catch (e) {
        this.setter = false;
      }
      if (!this.setter) return;
    }

    try {
      var result = this.setter.call(this.context, value);
    } catch(e) {
      return;
    }

    // We can't expect code in fragments outside Observer to be aware of "sync" since observer can be replaced by other
    // types (e.g. one without a `sync()` method, such as one that uses `Object.observe`) in other systems.
    this.sync();
    this.observations.sync();
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
      var change;
      var useCompareBy = this.getChangeRecords &&
                         this.compareBy &&
                         Array.isArray(value) &&
                         Array.isArray(this.oldValue);

      if (useCompareBy) {
        var compareExpression = this.compareBy;
        var name = this.compareByName;
        var index = this.compareByIndex || '__index__';
        var ctx = this.context;
        var globals = this.observations.globals;
        var formatters = this.observations.formatters;
        var oldValue = this.oldValue;
        if (!name) {
          name = '__item__';
          // Turn "id" into "__item__.id"
          compareExpression = name + '.' + compareExpression;
        }

        var getCompareValue = expressions.parse(compareExpression, globals, formatters, name, index);
        changed = diff.values(value.map(getCompareValue, ctx), oldValue.map(getCompareValue, ctx));
      } else if (this.getChangeRecords) {
        changed = diff.values(value, this.oldValue);
      } else {
        changed = diff.basic(value, this.oldValue);
      }


      // If an array has changed calculate the splices and call the callback.
      if (!changed && !this.forceUpdateNextSync) return;
      this.forceUpdateNextSync = false;
      if (Array.isArray(changed)) {
        this.callback.call(this.callbackContext, value, this.oldValue, changed);
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
});

function mapToProperty(property) {
  return function(item) {
    return item && item[property];
  }
}

},{"chip-utils/class":57,"differences-js":66,"expressions-js":68}],92:[function(require,module,exports){

exports.Router = require('./src/router');
exports.Route = require('./src/route');
exports.Location = require('./src/location');
exports.HashLocation = require('./src/hash-location');
exports.PushLocation = require('./src/push-location');
exports.create = function(options) {
  return new exports.Router(options);
};

},{"./src/hash-location":95,"./src/location":96,"./src/push-location":97,"./src/route":98,"./src/router":99}],93:[function(require,module,exports){
var slice = Array.prototype.slice;

/**
 * Simplifies extending classes and provides static inheritance. Classes that need to be extendable should
 * extend Class which will give them the `extend` static function for their subclasses to use. In addition to
 * a prototype, mixins may be added as well. Example:
 *
 * function MyClass(arg1, arg2) {
 *   SuperClass.call(this, arg1);
 *   this.arg2 = arg2;
 * }
 * SuperClass.extend(MyClass, mixin1, AnotherClass, {
 *   foo: function() {
 *     this._bar++;
 *   },
 *   get bar() {
 *     return this._bar;
 *   }
 * });
 *
 * In addition to extending the superclass, static methods and properties will be copied onto the subclass for
 * static inheritance. This allows the extend function to be copied to the subclass so that it may be
 * subclassed as well. Additionally, static properties may be added by defining them on a special prototype
 * property `static` making the code more readable.
 *
 * @param {function} The subclass constructor.
 * @param {object} [optional] Zero or more mixins. They can be objects or classes (functions).
 * @param {object} The prototype of the subclass.
 */
function Class() {}
Class.extend = extend;
Class.makeInstanceOf = makeInstanceOf;
module.exports = Class;

function extend(Subclass /* [, prototype [,prototype]] */) {
  var prototypes;

  // Support no constructor
  if (typeof Subclass !== 'function') {
    prototypes = slice.call(arguments);
    var SuperClass = this;
    Subclass = function() {
      SuperClass.apply(this, arguments);
    };
  } else {
    prototypes = slice.call(arguments, 1);
  }

  extendStatics(this, Subclass);

  prototypes.forEach(function(proto) {
    if (typeof proto === 'function') {
      extendStatics(proto, Subclass);
    } else if (proto.hasOwnProperty('static')) {
      extendStatics(proto.static, Subclass);
    }
  });

  var descriptors = getDescriptors(prototypes);
  descriptors.constructor = { writable: true, configurable: true, value: Subclass };
  Subclass.prototype = Object.create(this.prototype, descriptors);
  return Subclass;
}

// Get descriptors (allows for getters and setters) and sets functions to be non-enumerable
function getDescriptors(objects) {
  var descriptors = {};

  objects.forEach(function(object) {
    if (typeof object === 'function') object = object.prototype;

    Object.getOwnPropertyNames(object).forEach(function(name) {
      if (name === 'static') return;

      var descriptor = Object.getOwnPropertyDescriptor(object, name);

      if (typeof descriptor.value === 'function') {
        descriptor.enumerable = false;
      }

      descriptors[name] = descriptor;
    });
  });
  return descriptors;
}

// Copies static methods over for static inheritance
function extendStatics(Class, Subclass) {

  // static method inheritance (including `extend`)
  Object.keys(Class).forEach(function(key) {
    var descriptor = Object.getOwnPropertyDescriptor(Class, key);
    if (!descriptor.configurable) return;

    Object.defineProperty(Subclass, key, descriptor);
  });
}


/**
 * Makes a native object pretend to be an instance of class (e.g. adds methods to a DocumentFragment then calls the
 * constructor).
 */
function makeInstanceOf(object) {
  var args = slice.call(arguments, 1);
  Object.defineProperties(object, getDescriptors([this.prototype]));
  this.apply(object, args);
  return object;
}

},{}],94:[function(require,module,exports){
arguments[4][60][0].apply(exports,arguments)
},{"./class":93,"dup":60}],95:[function(require,module,exports){
module.exports = HashLocation;
var Location = require('./location');


// Location implementation for using the URL hash
function HashLocation() {
  Location.call(this);
}

Location.extend(HashLocation, {
  historyEventName: 'hashchange',

  redirect: function(value, replace) {
    if (replace && window.history && window.history.replaceState) {
      if (value.charAt(0) !== '/' || value.split('//').length > 1) {
        value = this.getRelativeUrl(value);
      }
      history.replaceState({}, '', '#' + value);
      this._changeTo(value);
    } else {
      this.url = value;
    }
  },

  get url() {
    return location.hash.replace(/^#\/?/, '/') || '/';
  },

  set url(value) {
    if (value.charAt(0) !== '/' || value.split('//').length > 1) {
      value = this.getRelativeUrl(value);
    }

    location.hash = (value === '/' ? '' : '#' + value);
  }

});

},{"./location":96}],96:[function(require,module,exports){
module.exports = Location;
var EventTarget = require('chip-utils/event-target');
var doc = document.implementation.createHTMLDocument('');
var base = doc.createElement('base');
var anchor = doc.createElement('a');
var bases = document.getElementsByTagName('base');
var baseURI = bases[0] ? bases[0].href : location.protocol + '//' + location.host + '/';
var PushLocation, pushLocation;
var HashLocation, hashLocation;
doc.body.appendChild(base);
doc.body.appendChild(anchor);


function Location() {
  EventTarget.call(this);
  this._handleChange = this._handleChange.bind(this);
  this.baseURI = baseURI.replace(/\/$/, '');
  this.currentUrl = this.url;
  window.addEventListener(this.historyEventName, this._handleChange);
}

EventTarget.extend(Location, {
  static: {
    create: function(options) {
      if (options.use === 'hash' || !PushLocation.supported) {
        return hashLocation || (hashLocation = new HashLocation());
      } else {
        return pushLocation || (pushLocation = new PushLocation());
      }
    },

    get supported() {
      return true;
    }
  },

  historyEventName: '',
  base: base,
  anchor: anchor,

  getRelativeUrl: function(url) {
    base.href = this.baseURI + this.currentUrl;
    anchor.href = url;
    url = anchor.pathname + anchor.search;
    // Fix IE's missing slash prefix
    return (url[0] === '/') ? url : '/' + url;
  },

  getPath: function(url) {
    base.href = this.baseURI + this.currentUrl;
    anchor.href = url;
    var path = anchor.pathname;
    // Fix IE's missing slash prefix
    return (path[0] === '/') ? path : '/' + path;
  },

  redirect: function(url, replace) {
    this.url = url;
  },

  get url() {
    throw new Error('Abstract method. Override');
  },

  set url(value) {
    throw new Error('Abstract method. Override');
  },

  get path() {
    return this.currentUrl.split('?').shift();
  },

  get query() {
    return parseQuery(this.currentUrl.split('?').slice(1).join('?'));
  },

  _changeTo: function(url) {
    this.currentUrl = url;
    this.dispatchEvent(new CustomEvent('change', { detail: {
      url: url,
      path: this.path,
      query: this.query
    }}));
  },

  _handleChange: function() {
    var url = this.url;
    if (this.currentUrl !== url) {
      this._changeTo(url);
    }
  }
});


// Parses a location.search string into an object with key-value pairs.
function parseQuery(search) {
  var query = {};

  search.replace(/^\?/, '').split('&').filter(Boolean).forEach(function(keyValue) {
    var parts = keyValue.split('=');
    var key = parts[0];
    var value = parts[1];
    query[decodeURIComponent(key)] = decodeURIComponent(value);
  });

  return query;
}

PushLocation = require('./push-location');
HashLocation = require('./hash-location');

},{"./hash-location":95,"./push-location":97,"chip-utils/event-target":94}],97:[function(require,module,exports){
module.exports = PushLocation;
var Location = require('./location');
var uriParts = document.createElement('a');

// Location implementation for using pushState
function PushLocation() {
  Location.call(this);
}

Location.extend(PushLocation, {
  static: {
    get supported() {
      return window.history && window.history.pushState && true;
    }
  },

  historyEventName: 'popstate',

  redirect: function(value, replace) {
    if (value.charAt(0) !== '/' || value.split('//').length > 1) {
      value = this.getRelativeUrl(value);
    }

    if (this.currentUrl !== value) {
      replace ? history.replaceState({}, '', value) : history.pushState({}, '', value);
      // Manually change since no event is dispatched when using pushState/replaceState
      this._changeTo(value);
    }
  },

  get url() {
    return location.href.replace(this.baseURI, '').split('#').shift();
  },

  set url(value) {
    this.redirect(value);
  }
});

},{"./location":96}],98:[function(require,module,exports){
module.exports = Route;
var Class = require('chip-utils/class');

// Defines a central routing object which handles all URL changes and routes.
function Route(path, callback) {
  this.path = path;
  this.callback = callback;
  this.keys = [];
  this.expr = parsePath(path, this.keys);
  this.handle = this.handle.bind(this);
}


// Determines whether route matches path
Class.extend(Route, {

  match: function(path) {
    if (this.expr.test(path)) {
      // cache this on match so we don't recalculate multiple times
      this.params = this.getParams(path);
      return true;
    } else {
      return false;
    }
  },

  getParams: function(path) {
    var params = {};
    var match = this.expr.exec(path);
    if (!match) {
      return params;
    }

    for (var i = 1; i < match.length; i++) {
      var key = this.keys[i - 1] || '*';
      var value = match[i];
      params[key] = decodeURIComponent(value || '');
    }

    return params;
  },

  handle: function(req, done) {
    req.params = this.params || this.getParams(req.path);
    this.callback(req, done);
  }
});


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
    .replace(/\(\\\/\*\)/g, '(/.*)') // replace the (\/*)? with (\/.*)?
    .replace(/\*(?!\))/g, '(.*)'); // any other * to (.*)
  return new RegExp('^' + path + '$', 'i');
}

},{"chip-utils/class":93}],99:[function(require,module,exports){
module.exports = Router;
var Route = require('./route');
var EventTarget = require('chip-utils/event-target');
var Location = require('./location');


// Work inspired by and in some cases based off of work done for Express.js (https://github.com/visionmedia/express)
// Events: error, change
function Router(options) {
  EventTarget.call(this);
  this.options = options || {};
  this.routes = [];
  this.params = {};
  this.paramsExp = {};
  this.routes.byPath = {};
  this.location = Location.create(this.options);
  this.onUrlChange = this.onUrlChange.bind(this);
}


EventTarget.extend(Router, {

  // Registers a `callback` function to be called when the given param `name` is matched in a URL
  param: function(name, callback) {
    if (typeof callback === 'function') {
      (this.params[name] || (this.params[name] = [])).push(callback);
    } else if (callback instanceof RegExp) {
      this.paramsExp[name] = callback;
    } else {
      throw new TypeError('param must have a callback of type "function" or RegExp. Got ' + callback + '.');
    }
  },


  // Registers a `callback` function to be called when the given path matches a URL. The callback receives two
  // arguments, `req`, and `next`, where `req` represents the request and has the properties, `url`, `path`, `params`
  // and `query`. `req.params` is an object with the parameters from the path (e.g. /:username/* would make a params
  // object with two properties, `username` and `*`). `req.query` is an object with key-value pairs from the query
  // portion of the URL.
  route: function(path, callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('route must have a callback of type "function". Got ' + callback + '.');
    }

    if (typeof path === 'string' && path[0] !== '/') {
      path = '/' + path;
    }
    this.routes.push(new Route(path, callback));
  },


  removeRoute: function(path, callback) {
    return this.routes.some(function(route, index) {
      if (route.path === path && route.callback === callback) {
        this.routes.splice(index, 1);
        return true;
      }
    });
  },


  redirect: function(url) {
    var notFound = false;
    function errHandler(event) {
      notFound = (event.detail === 'notFound');
    }
    this.on('error', errHandler);

    this.location.url = url;

    this.off('error', errHandler);
    return !notFound;
  },


  listen: function() {
    this.location.on('change', this.onUrlChange);
  },


  stop: function() {
    this.location.off('change', this.onUrlChange);
  },


  getRoutesMatchingPath: function(url) {
    if (url == null) {
      return [];
    }
    var path = this.location.getPath(url);
    var paramsExp = this.paramsExp;

    return this.routes.filter(function(route) {
      if (!route.match(path)) {
        return false;
      }

      var params = route.getParams(path);
      return route.keys.every(function(key) {
        var value = params[key];
        return !paramsExp.hasOwnProperty(key) || (value && paramsExp[key].test(value));
      });
    });
  },


  onUrlChange: function(event) {
    var req = event.detail;
    var path = req.path;
    var paramsCalled = {};

    var event = new CustomEvent('changing', { detail: req, cancelable: true });
    this.dispatchEvent(event);
    if (event.defaultPrevented) {
      return;
    }

    this.dispatchEvent(new CustomEvent('change', { detail: req }));
    var routes = this.getRoutesMatchingPath(path);
    var callbacks = [];
    var handledParams = {};
    var router = this;

    // Add all the callbacks for this URL (all matching routes and the params they're dependent on)
    routes.forEach(function(route) {
      // Add param callbacks when they exist
      route.keys.forEach(function(key) {
        if (router.params.hasOwnProperty(key) && !handledParams.hasOwnProperty(key)) {
          handledParams[key] = true;
          var value = route.params[key];
          router.params[key].forEach(function(paramCallback) {
            callbacks.push(function(req, next) {
              paramCallback(req, next, value);
            });
          });
        }
      });

      // Add route callback
      callbacks.push(route.handle);
    }, this);

    // Calls each callback one by one until either there is an error or we call all of them.
    var next = function(err) {
      if (err) {
        router.dispatchEvent(new CustomEvent('error', { detail: err }));
        return;
      }

      if (!callbacks.length) return next('notFound');
      callback = callbacks.shift();
      callback(req, next);
    };

    // Start running the callbacks, one by one
    next();
  }

});

},{"./location":96,"./route":98,"chip-utils/event-target":94}]},{},[58])(58)
});
//# sourceMappingURL=chip.js.map
