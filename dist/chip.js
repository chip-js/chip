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
 * Adds all built-in animations with default names
 */
module.exports = function(fragments) {
  if (!fragments || typeof fragments.registerAnimation !== 'function') {
    throw new TypeError('formatters requires an instance of fragments to register with');
  }

  fragments.registerAnimation('fade', require('./fade')());
  fragments.registerAnimation('slide', require('./slide')());
  fragments.registerAnimation('slide-h', require('./slide-horizontal')());
  fragments.registerAnimation('slide-move', require('./slide-move')(fragments));
  fragments.registerAnimation('slide-move-h', require('./slide-move-horizontal')(fragments));
  fragments.registerAnimation('slide-fade', require('./slide-fade')());
  fragments.registerAnimation('slide-fade-h', require('./slide-fade-horizontal')());
};

},{"./fade":1,"./slide":8,"./slide-fade":4,"./slide-fade-horizontal":3,"./slide-horizontal":5,"./slide-move":7,"./slide-move-horizontal":6}],3:[function(require,module,exports){
/**
 * Slide left and right
 */
module.exports = function(options) {
  if (!options) options = {};
  if (!options.property) options.property = 'width';
  return require('./slide-fade')(options);
};

},{"./slide-fade":4}],4:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){
/**
 * Slide left and right
 */
module.exports = function(options) {
  if (!options) options = {};
  if (!options.property) options.property = 'width';
  return require('./slide')(options);
};

},{"./slide":8}],6:[function(require,module,exports){
/**
 * Move items left and right in a list
 */
module.exports = function(fragments, options) {
  if (!options) options = {};
  if (!options.property) options.property = 'width';
  return require('./slide-move')(fragments, options);
};

},{"./slide-move":7}],7:[function(require,module,exports){
var slideAnimation = require('./slide');
var animating = new Map();

/**
 * Move items up and down in a list
 */
module.exports = function(fragments, options) {
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
          element = this.animateMove(element, newElement);
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
  };
};

},{"./slide":8}],8:[function(require,module,exports){
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

},{}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
/**
 * A binder that automatically focuses the input when it is displayed on screen.
 */
module.exports = function() {
  return {

    bound: function() {
      var element = this.element;
      setTimeout(function() {
        element.focus();
      });
    }

  };
};

},{}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
/**
 * A binder that ensures anything bound to the class attribute won't overrite the classes binder. Should always be bound
 * to "class".
 */
module.exports = function() {
  return {
    onlyWhenBound: true,

    updated: function(value) {
      var classList = this.element.classList;

      if (this.classes) {
        this.classes.forEach(function(className) {
          if (className) {
            classList.remove(className);
          }
        });
      }

      if (value) {
        this.classes = value.split(/\s+/);
        this.classes.forEach(function(className) {
          if (className) {
            classList.add(className);
          }
        });
      }

    }
  };
};

},{}],13:[function(require,module,exports){
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

},{}],14:[function(require,module,exports){
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

    bound: function() {
      var template = this.context._componentContent || this.defaultContent;
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
  };
};

},{}],15:[function(require,module,exports){
var slice = Array.prototype.slice;

/**
 * An element binder that binds the template on the definition to fill the contents of the element that matches.
 */
module.exports = function(definition) {
  var definitions = slice.call(arguments);

  if (!definition) {
    throw new TypeError('Must provide a definition object to define the custom component');
  }

  // The last definition is the most important, any others are mixins
  definition = definitions[definitions.length - 1];

  return {

    compiled: function() {
      if (definition.template && !definition.template.pool && !definition._compiling) {
        // Set this before compiling so we don't get into infinite loops if there is template recursion
        definition._compiling = true;
        definition.template = this.fragments.createTemplate(definition.template);
        delete definition._compiling;
      }

      if (this.element.childNodes.length) {
        // Use the contents of this component to be inserted within it
        this.contentTemplate = this.fragments.createTemplate(this.element.childNodes);
      }
    },

    created: function() {
      if (definition.template) {
        this.view = definition.template.createView();
        this.element.appendChild(this.view);
        if (this.contentTemplate) {
          this.element._componentContent = this.contentTemplate;
        }
      } else if (this.contentTemplate) {
        this.content = this.contentTemplate.createView();
        this.element.appendChild(this.content);
      }

      definitions.forEach(function(definition) {
        Object.keys(definition).forEach(function(key) {
          this.element[key] = definition[key];
        }, this);
      }, this);

      // Don't call created until after all definitions have been copied over
      definitions.forEach(function(definition) {
        if (typeof definition.created === 'function') {
          definition.created.call(this.element);
        }
      }, this);
    },

    bound: function() {
      this.element._parentContext = this.context;
      if (this.view) this.view.bind(this.element);
      if (this.content) this.content.bind(this.context);

      definitions.forEach(function(definition) {
        if (typeof definition.attached === 'function') {
          definition.attached.call(this.element);
          this.fragments.sync();
        }
      }, this);
    },

    unbound: function() {
      if (this.content) this.content.unbind();
      if (this.view) this.view.unbind();

      definitions.forEach(function(definition) {
        if (typeof definition.detached === 'function') {
          definition.detached.call(this.element);
        }
      }, this);
    }
  };
};

},{}],16:[function(require,module,exports){
/**
 * A binder for adding event listeners. When the event is triggered the expression will be executed. The properties
 * `event` (the event object) and `element` (the element the binder is on) will be available to the expression.
 */
module.exports = function(specificEventName) {
  return {
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

      this.context.event = event;
      this.context.element = this.element;
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
          expression = this.fragments.codifyExpression('attribute', node.getAttribute(elseIfAttrName));
          expressions.push(wrapIfExp(expression, false));
          node.removeAttribute(elseIfAttrName);
        } else if (node.hasAttribute(elseUnlessAttrName)) {
          expression = this.fragments.codifyExpression('attribute', node.getAttribute(elseUnlessAttrName));
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
        this.add(this.showing);
        this.showing.bind(this.context);
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
        this.showing.bind(this.context);
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
 * A binder that sets the property of an element to the value of the expression in a 2-way binding.
 */
module.exports = function(specificPropertyName) {
  return {
    priority: 10,

    created: function() {
      this.twoWayObserver = this.observe(specificPropertyName || this.camelCase, this.sendUpdate, this);
    },

    // Bind this to the given context object
    bound: function() {
      this.twoWayObserver.bind(this.element);
    },

    unbound: function() {
      this.twoWayObserver.unbind();
    },

    sendUpdate: function(value) {
      if (!this.skipSend) {
        this.observer.set(value);
        this.skipSend = true;
        this.fragments.afterSync(function() {
          this.skipSend = false;
        }.bind(this));
      }
    },

    updated: function(value) {
      if (!this.skipSend && value !== undefined) {
        this.element[specificPropertyName || this.camelCase] = value;
        this.skipSend = true;
        this.fragments.afterSync(function() {
          this.skipSend = false;
        }.bind(this));
      }
    }
  };
};

},{}],22:[function(require,module,exports){
/**
 * A binder that sets the property of an element to the value of the expression.
 */
module.exports = function(specificPropertyName) {
  return {
    priority: 10,

    updated: function(value) {
      this.element[specificPropertyName || this.camelCase] = value;
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
module.exports = function() {
  return {
    animated: true,
    priority: 100,

    compiled: function() {
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
          var view = this.createView(i, item);
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

        if (this.animating) {
          allRemoved.forEach(this.removeView);
          this.animating = false;
          if (this.valueWhileAnimating) {
            var changes = diff.arrays(this.valueWhileAnimating, animatingValue);
            this.updateChangesAnimated(this.valueWhileAnimating, changes);
            this.valueWhileAnimating = null;
          }
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
        view._repeatItem_ = null;
      });
      this.valueWhileAnimating = null;
      this.animating = false;
    }
  };
};

},{"differences-js":53}],25:[function(require,module,exports){
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

},{}],31:[function(require,module,exports){
/**
 * Formats the value into a boolean.
 */
module.exports = function(value) {
  return value && value !== '0' && value !== 'false';
};

},{}],32:[function(require,module,exports){
var escapeHTML = require('./escape');

/**
 * HTML escapes content adding <br> tags in place of newlines characters.
 */
module.exports = function(value, setter) {
  if (setter) {
    return escapeHTML(value, setter);
  } else {
    var lines = (value || '').split(/\r?\n/);
    return lines.map(escapeHTML).join('<br>\n');
  }
};

},{"./escape":35}],33:[function(require,module,exports){
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

  return value.toLocaleDateString();
};

},{}],35:[function(require,module,exports){
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

},{}],36:[function(require,module,exports){
/**
 * Filters an array by the given filter function(s), may provide a function or an array or an object with filtering
 * functions.
 */
module.exports = function(value, filterFunc) {
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
};

},{}],37:[function(require,module,exports){
/**
 * Formats the value into a float or null.
 */
module.exports = function(value) {
  value = parseFloat(value);
  return isNaN(value) ? null : value;
};

},{}],38:[function(require,module,exports){
/**
 * Formats the value something returned by a formatting function passed. Use for custom or one-off formats.
 */
module.exports = function(value, formatter, isSetter) {
  return formatter(value, isSetter);
};

},{}],39:[function(require,module,exports){
/**
 * Adds all built-in formatters with default names
 */
module.exports = function(fragments) {
  if (!fragments || typeof fragments.registerFormatter !== 'function') {
    throw new TypeError('formatters requires an instance of fragments to register with');
  }

  fragments.registerFormatter('addQuery', require('./add-query'));
  fragments.registerFormatter('autolink', require('./autolink'));
  fragments.registerFormatter('bool', require('./bool'));
  fragments.registerFormatter('br', require('./br'));
  fragments.registerFormatter('dateTime', require('./date-time'));
  fragments.registerFormatter('date', require('./date'));
  fragments.registerFormatter('escape', require('./escape'));
  fragments.registerFormatter('filter', require('./filter'));
  fragments.registerFormatter('float', require('./float'));
  fragments.registerFormatter('format', require('./format'));
  fragments.registerFormatter('int', require('./int'));
  fragments.registerFormatter('json', require('./json'));
  fragments.registerFormatter('limit', require('./limit'));
  fragments.registerFormatter('log', require('./log'));
  fragments.registerFormatter('lower', require('./lower'));
  fragments.registerFormatter('map', require('./map'));
  fragments.registerFormatter('newline', require('./newline'));
  fragments.registerFormatter('p', require('./p'));
  fragments.registerFormatter('reduce', require('./reduce'));
  fragments.registerFormatter('slice', require('./slice'));
  fragments.registerFormatter('sort', require('./sort'));
  fragments.registerFormatter('time', require('./time'));
  fragments.registerFormatter('upper', require('./upper'));
};

},{"./add-query":29,"./autolink":30,"./bool":31,"./br":32,"./date":34,"./date-time":33,"./escape":35,"./filter":36,"./float":37,"./format":38,"./int":40,"./json":41,"./limit":42,"./log":43,"./lower":44,"./map":45,"./newline":46,"./p":47,"./reduce":48,"./slice":49,"./sort":50,"./time":51,"./upper":52}],40:[function(require,module,exports){
/**
 * Formats the value into an integer or null.
 */
module.exports = function(value) {
  value = parseInt(value);
  return isNaN(value) ? null : value;
};

},{}],41:[function(require,module,exports){
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

},{}],42:[function(require,module,exports){
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

},{}],43:[function(require,module,exports){
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

},{}],44:[function(require,module,exports){
/**
 * Formats the value into lower case.
 */
module.exports = function(value) {
  return typeof value === 'string' ? value.toLowerCase() : value;
};

},{}],45:[function(require,module,exports){
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

},{}],46:[function(require,module,exports){
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

},{"./escape":35}],47:[function(require,module,exports){
var escapeHTML = require('./escape');

/**
 * HTML escapes content wrapping lines into paragraphs (in <p> tags).
 */
module.exports = function(value, setter) {
  if (setter) {
    return escapeHTML(value, setter);
  } else {
    var lines = (value || '').split(/\r?\n/);
    var escaped = lines.map(function(line) { return escapeHTML(line) || '<br>'; });
    return '<p>' + escaped.join('</p>\n<p>') + '</p>';
  }
};

},{"./escape":35}],48:[function(require,module,exports){
/**
 * Adds a formatter to reduce an array or value by the given reduce function
 */
module.exports = function(value, reduceFunc, initialValue) {
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
};

},{}],49:[function(require,module,exports){
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

},{}],50:[function(require,module,exports){
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

},{}],51:[function(require,module,exports){
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

},{}],52:[function(require,module,exports){
/**
 * Formats the value into upper case.
 */
module.exports = function(value) {
  return typeof value === 'string' ? value.toUpperCase() : value;
};

},{}],53:[function(require,module,exports){
module.exports = require('./src/diff');

},{"./src/diff":54}],54:[function(require,module,exports){
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

},{}],55:[function(require,module,exports){
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

},{}],56:[function(require,module,exports){
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

},{"./class":55}],57:[function(require,module,exports){
module.exports = require('./src/chip');

},{"./src/chip":60}],58:[function(require,module,exports){
module.exports = App;
var componentBinding = require('fragments-built-ins/binders/component');
var Location = require('routes-js').Location;
var EventTarget = require('chip-utils/event-target');
var createFragments = require('./fragments');
var defaultMixin = require('./mixins/default');
var slice = Array.prototype.slice;

// # Chip App

// An App represents an app or module that can have routes, controllers, and templates defined.
function App(options) {
  options = options || {};
  EventTarget.call(this);
  this.fragments = createFragments();
  this.fragments.app = this;
  this.location = Location.create(options);
  this.defaultMixin = defaultMixin(this);
  this._listening = false;

  this.rootElement = options.rootElement || document.documentElement;
  this.sync = this.fragments.sync;
  this.syncNow = this.fragments.syncNow;
  this.afterSync = this.fragments.afterSync;
  this.onSync = this.fragments.onSync;
  this.offSync = this.fragments.offSync;
  this.location.on('change', this.sync);
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
    return this;
  },


  // Components
  // ----------

  // Registers a new component by name with the given definition. provided `content` string. If no `content` is given
  // then returns a new instance of a defined template. This instance is a document fragment.
  component: function(name, definition) {
    var definitions = slice.call(arguments, 1);
    definitions.unshift(this.defaultMixin);
    this.fragments.registerElement(name, componentBinding.apply(null, definitions));
    return this;
  },


  // Redirects to the provided URL
  redirect: function(url) {
    return this.location.url = url;
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
      app.dispatchEvent(new CustomEvent('urlChange', { detail: event.detail }));
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
    this.dispatchEvent(new CustomEvent('urlChange', { detail: { url: this.location.url }}));
  },

  // Stop listening
  stop: function() {
    this.location.off('change', this._locationChangeHandler);
    this.rootElement.removeEventListener('click', this._clickHandler);
  }

});
},{"./fragments":61,"./mixins/default":62,"chip-utils/event-target":56,"fragments-built-ins/binders/component":15,"routes-js":84}],59:[function(require,module,exports){
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
    this.element.appendChild(view);
  };

  ifBinder.created = function() {
    this.onUrlChange = this.onUrlChange.bind(this);
  };


  ifBinder.bound = function() {
    bound.call(this);
    var node = this.element.parentNode;
    while (node && !node.matchedRoutePath) {
      node = node.parentNode;
    }
    this.baseURI = node && node.matchedRoutePath || '';
    console.log(this.element, 'baseURI', this.baseURI);
    this.app.on('urlChange', this.onUrlChange);
    if (this.app.listening) {
      this.onUrlChange();
    }
  };

  ifBinder.unbound = function() {
    unbound.call(this);
    this.currentIndex = undefined;
    this.app.off('urlChange', this.onUrlChange);
  };

  ifBinder.onUrlChange = function() {
    var fullUrl = this.app.location.url;
    var localUrl = null;
    var newIndex = this.routes.length;

    if (fullUrl.indexOf(this.baseURI) === 0) {
      localUrl = fullUrl.replace(this.baseURI, '');
    }

    if (localUrl !== null) {
      this.routes.some(function(route, index) {
        if (route.match(localUrl)) {
          if (route.params.hasOwnProperty('*') && route.params['*']) {
            var afterLength = route.params['*'].length;
            this.element.matchedRoutePath = this.baseURI + localUrl.slice(0, -afterLength);
          } else {
            this.element.matchedRoutePath = fullUrl;
          }
          console.log(this.element, 'matched', this.element.matchedRoutePath);
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

},{"fragments-built-ins/binders/if":18,"routes-js":84}],60:[function(require,module,exports){
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

},{"./app":58,"chip-utils/class":55,"chip-utils/event-target":56,"routes-js":84}],61:[function(require,module,exports){
var createFragments = require('fragments-js').create;

module.exports = function() {

  var fragments = createFragments();

  // Configure
  fragments.setExpressionDelimiters('attribute', '{{', '}}', true);
  fragments.animateAttribute = '[animate]';
  require('fragments-built-ins/animations')(fragments);
  require('fragments-built-ins/formatters')(fragments);

  fragments.registerAttribute('(keydown.*)', require('fragments-built-ins/binders/key-events')(null, 'keydown'));
  fragments.registerAttribute('(keyup.*)', require('fragments-built-ins/binders/key-events')(null, 'keyup'));
  fragments.registerAttribute('(enter)', require('fragments-built-ins/binders/key-events')('enter'));
  fragments.registerAttribute('(esc)', require('fragments-built-ins/binders/key-events')('esc'));
  fragments.registerAttribute('(*)', require('fragments-built-ins/binders/events')());
  fragments.registerAttribute('{*}', require('fragments-built-ins/binders/properties')());
  fragments.registerAttribute('{{*}}', require('fragments-built-ins/binders/properties-2-way')());
  fragments.registerAttribute('*?', require('fragments-built-ins/binders/attribute-names')());
  fragments.registerAttribute('[content]', require('fragments-built-ins/binders/component-content')());
  fragments.registerAttribute('[show]', require('fragments-built-ins/binders/show')(false));
  fragments.registerAttribute('[hide]', require('fragments-built-ins/binders/show')(true));
  fragments.registerAttribute('[for]', require('fragments-built-ins/binders/repeat')());
  fragments.registerAttribute('#*', require('fragments-built-ins/binders/ref')());
  fragments.registerAttribute('[text]', require('fragments-built-ins/binders/text')());
  fragments.registerAttribute('[html]', require('fragments-built-ins/binders/html')());
  fragments.registerAttribute('[src]', require('fragments-built-ins/binders/properties')('src'));
  fragments.registerAttribute('[log]', require('fragments-built-ins/binders/log')());
  fragments.registerAttribute('[class]', require('fragments-built-ins/binders/class')());
  fragments.registerAttribute('[.*]', require('fragments-built-ins/binders/classes')());
  fragments.registerAttribute('[style.*]', require('fragments-built-ins/binders/styles')());
  fragments.registerAttribute('[autofocus]', require('fragments-built-ins/binders/autofocus')());
  fragments.registerAttribute('[autoselect]', require('fragments-built-ins/binders/autoselect')());
  fragments.registerAttribute('[value]', require('fragments-built-ins/binders/value')(
    '[value-events]',
    '[value-field]'
  ));

  var IfBinding = require('fragments-built-ins/binders/if')('[else-if]', '[else]', '[unless]', '[unless-if]');
  fragments.registerAttribute('[if]', IfBinding);
  fragments.registerAttribute('[unless]', IfBinding);

  fragments.registerAttribute('[route]', require('./binders/route')());

  return fragments;
};

},{"./binders/route":59,"fragments-built-ins/animations":2,"fragments-built-ins/binders/attribute-names":9,"fragments-built-ins/binders/autofocus":10,"fragments-built-ins/binders/autoselect":11,"fragments-built-ins/binders/class":12,"fragments-built-ins/binders/classes":13,"fragments-built-ins/binders/component-content":14,"fragments-built-ins/binders/events":16,"fragments-built-ins/binders/html":17,"fragments-built-ins/binders/if":18,"fragments-built-ins/binders/key-events":19,"fragments-built-ins/binders/log":20,"fragments-built-ins/binders/properties":22,"fragments-built-ins/binders/properties-2-way":21,"fragments-built-ins/binders/ref":23,"fragments-built-ins/binders/repeat":24,"fragments-built-ins/binders/show":25,"fragments-built-ins/binders/styles":26,"fragments-built-ins/binders/text":27,"fragments-built-ins/binders/value":28,"fragments-built-ins/formatters":39,"fragments-js":70}],62:[function(require,module,exports){

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
        _attached: { configurable: true, value: false },
      });
    },


    attached: function() {
      this._attached = true;
      this._observers.forEach(function(observer) {
        observer.bind(this);
      }, this);

      this._listeners.forEach(function(item) {
        item.target.addEventListener(item.eventName, item.listener);
      });
    },


    detached: function() {
      this._attached = false;
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
      if (this._attached) {
        // If not attached will bind on attachment
        observer.bind(this);
      }
      return observer;
    },


    listen: function(target, eventName, listener, context) {
      if (typeof target === 'string') {
        context = listener;
        listener = eventName;
        eventName = target;
        target = this;
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

      if (this._attached) {
        // If not attached will add on attachment
        target.addEventListener(eventName, listener);
      }
    },
  };
};

},{}],63:[function(require,module,exports){
arguments[4][53][0].apply(exports,arguments)
},{"./src/diff":64,"dup":53}],64:[function(require,module,exports){
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

},{}],65:[function(require,module,exports){
module.exports = require('./src/expressions');

},{"./src/expressions":66}],66:[function(require,module,exports){
var slice = Array.prototype.slice;
var strings = require('./strings');
var formatterParser = require('./formatters');
var propertyChains = require('./property-chains');
var valueProperty = '_value_';
var cache = {};

exports.globals = {};


exports.parse = function(expr, globals, formatters, extraArgs) {
  if (!Array.isArray(extraArgs)) extraArgs = [];
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
  if (!Array.isArray(extraArgs)) extraArgs = [];

  // Add _value_ as the first extra argument
  extraArgs.unshift(valueProperty);
  if (expr.charAt(0) === '!') {
    // Allow '!prop' to become 'prop = !value'
    expr = expr.slice(1).replace(/(\s*\||$)/, ' = !_value_$1');
  } else {
    expr = expr.replace(/(\s*\||$)/, ' = _value_$1');
  }

  return exports.parse(expr, globals, formatters, extraArgs);
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

},{"./formatters":67,"./property-chains":68,"./strings":69}],67:[function(require,module,exports){

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

},{}],68:[function(require,module,exports){
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

  if (links.length === 1 && !continuation && !paren) {
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
  if (expr.charAt(propertyRegex.lastIndex) === '.') {
    calledLink = parsePart(calledLink, index)
  }

  link = 'typeof ' + link + ' !== \'function\' ? void 0 : ' + calledLink;
  var insideParens = call.slice(1, -1);

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

},{}],69:[function(require,module,exports){
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

},{}],70:[function(require,module,exports){
var Fragments = require('./src/fragments');
var Observations = require('observations-js');

function create() {
  var observations = Observations.create();
  var fragments = new Fragments(observations);
  fragments.sync = observations.sync.bind(observations);
  fragments.syncNow = observations.syncNow.bind(observations);
  fragments.afterSync = observations.afterSync.bind(observations);
  fragments.onSync = observations.onSync.bind(observations);
  fragments.offSync = observations.offSync.bind(observations);
  return fragments;
}

// Create an instance of fragments with the default observer
module.exports = create();
module.exports.create = create;

},{"./src/fragments":75,"observations-js":81}],71:[function(require,module,exports){
arguments[4][55][0].apply(exports,arguments)
},{"dup":55}],72:[function(require,module,exports){
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
},{"./binding":73,"./util/animation":77}],73:[function(require,module,exports){
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
    if (this.expression) {
      // An observer to observe value changes to the expression within a context
      this.observer = this.observe(this.expression, this.updated);
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
    if (this.observer) this.observer.context = context;
    this.bound();

    if (this.observer) {
      if (this.updated !== Binding.prototype.updated) {
        this.observer.forceUpdateNextSync = true;
        this.observer.bind(context);
      }
    }
  },


  // Unbind this from its context
  unbind: function() {
    if (this.context === null) {
      return;
    }

    if (this.observer) this.observer.unbind();
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
    return this.observations.createObserver(expression, callback, callbackContext || this);
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

},{"chip-utils/class":71}],74:[function(require,module,exports){
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
        if (Binder.expr) {
          match = name.match(Binder.expr);
          if (match) match = match[1];
        } else {
          match = null;
        }

        try {
          node.removeAttribute(attr.name);
        } catch(e) {
          // if the attribute was already removed don't worry
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

},{}],75:[function(require,module,exports){
module.exports = Fragments;
require('./util/polyfills');
var Class = require('chip-utils/class');
var toFragment = require('./util/toFragment');
var animation = require('./util/animation');
var Template = require('./template');
var View = require('./view');
var Binding = require('./binding');
var AnimatedBinding = require('./animatedBinding');
var compile = require('./compile');
var hasWildcardExpr = /(^|[^\\])\*/;
var escapedWildcardExpr = /(^|[^\\])\\\*/;

/**
 * A Fragments object serves as a registry for binders and formatters
 * @param {Observations} observations An instance of Observations for tracking changes to the data
 */
function Fragments(observations) {
  if (!observations) {
    throw new TypeError('Must provide an observations instance to Fragments.');
  }

  this.observations = observations;
  this.globals = observations.globals;
  this.formatters = observations.formatters;
  this.animations = {};
  this.animateAttribute = 'animate';

  this.binders = {
    element: { _wildcards: [] },
    attribute: { _wildcards: [], _expr: /{{\s*(.*?)\s*}}/g, _delimitersOnlyInDefault: false },
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
}

Class.extend(Fragments, {

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
      throw new Error('Cannot create a template from ' + html + ' because it is empty.');
    }
    var template = Template.makeInstanceOf(fragment);
    template.bindings = compile(this, template);
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

    // Create a subclass of Binding (or another binder) with the definition
    function Binder() {
      superClass.apply(this, arguments);
    }
    definition.observations = this.observations;
    superClass.extend(Binder, definition);

    var expr;
    if (name instanceof RegExp) {
      expr = name;
    } else if (hasWildcardExpr.test(name)) {
      expr = new RegExp('^' + escapeRegExp(name).replace(escapedWildcardExpr, '$1(.*)') + '$');
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

    if (name === this.animateAttribute) {
      return;
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

},{"./animatedBinding":72,"./binding":73,"./compile":74,"./template":76,"./util/animation":77,"./util/polyfills":78,"./util/toFragment":79,"./view":80,"chip-utils/class":71}],76:[function(require,module,exports){
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

},{"./view":80,"chip-utils/class":71}],77:[function(require,module,exports){
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

  var element = this;
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

},{}],78:[function(require,module,exports){



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

},{}],79:[function(require,module,exports){
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

},{}],80:[function(require,module,exports){
module.exports = View;
var Class = require('chip-utils/class');


/**
 * ## View
 * A DocumentFragment with bindings.
 */
function View(template) {
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
});

},{"chip-utils/class":71}],81:[function(require,module,exports){

exports.Observations = require('./src/observations');
exports.Observer = require('./src/observer');
exports.create = function() {
  return new exports.Observations();
};

},{"./src/observations":82,"./src/observer":83}],82:[function(require,module,exports){
(function (global){
module.exports = Observations;
var Class = require('chip-utils/class');
var Observer = require('./observer');
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
}


Class.extend(Observations, {

  // Creates a new observer attached to this observations object. When the observer is bound to a context it will be added
  // to this `observations` and synced when this `observations.sync` is called.
  createObserver: function(expr, callback, callbackContext) {
    return new Observer(this, expr, callback, callbackContext);
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

},{"./observer":83,"chip-utils/class":55}],83:[function(require,module,exports){
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
function Observer(observations, expr, callback, callbackContext) {
  if (typeof expr === 'function') {
    this.getter = expr;
    this.setter = expr;
  } else {
    this.getter = expressions.parse(expr, observations.globals, observations.formatters);
  }
  this.observations = observations;
  this.expr = expr;
  this.callback = callback;
  this.callbackContext = callbackContext;
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
        this.setter = typeof this.expr === 'string'
          ? expressions.parseSetter(this.expr, this.observations.globals, this.observations.formatters)
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
      // If an array has changed calculate the splices and call the callback. This
      var changed = diff.values(value, this.oldValue);
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

},{"chip-utils/class":55,"differences-js":63,"expressions-js":65}],84:[function(require,module,exports){

exports.Router = require('./src/router');
exports.Route = require('./src/route');
exports.Location = require('./src/location');
exports.HashLocation = require('./src/hash-location');
exports.PushLocation = require('./src/push-location');
exports.create = function(options) {
  return new exports.Router(options);
};

},{"./src/hash-location":87,"./src/location":88,"./src/push-location":89,"./src/route":90,"./src/router":91}],85:[function(require,module,exports){
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

},{}],86:[function(require,module,exports){
arguments[4][56][0].apply(exports,arguments)
},{"./class":85,"dup":56}],87:[function(require,module,exports){
module.exports = HashLocation;
var Location = require('./location');


// Location implementation for using the URL hash
function HashLocation() {
  Location.call(this);
}

Location.extend(HashLocation, {
  historyEventName: 'hashchange',

  get url() {
    return location.hash.replace(/^#\/?/, '/') || '/';
  },

  set url(value) {
    if (value.charAt(0) === '.' || value.split('//').length > 1) {
      value = this.getRelativeUrl(value);
    }

    location.hash = (value === '/' ? '' : '#' + value);
  }

});

},{"./location":88}],88:[function(require,module,exports){
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

  get url() {
    throw new Error('Abstract method. Override');
  },

  set url(value) {
    throw new Error('Abstract method. Override');
  },

  _changeTo: function(url) {
    this.currentUrl = url;
    this.dispatchEvent(new CustomEvent('change', { detail: { url: url }}));
  },

  _handleChange: function() {
    var url = this.url;
    if (this.currentUrl !== url) {
      this._changeTo(url);
    }
  }
});

PushLocation = require('./push-location');
HashLocation = require('./hash-location');

},{"./hash-location":87,"./push-location":89,"chip-utils/event-target":86}],89:[function(require,module,exports){
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

  get url() {
    return location.href.replace(this.baseURI, '').split('#').shift();
  },

  set url(value) {
    if (value.charAt(0) === '.' || value.split('//').length > 1) {
      value = this.getRelativeUrl(value);
    }

    if (this.currentUrl !== value) {
      history.pushState({}, '', value);
      // Manually change since no event is dispatched when using pushState/replaceState
      this._changeTo(value);
    }
  }
});

},{"./location":88}],90:[function(require,module,exports){
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

},{"chip-utils/class":85}],91:[function(require,module,exports){
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
    var urlParts = event.detail.url.split('?');
    var path = urlParts.shift();
    var query = urlParts.join('?');
    var req = { url: event.detail.url, path: path, query: parseQuery(query) };
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

},{"./location":88,"./route":90,"chip-utils/event-target":86}]},{},[57])(57)
});
//# sourceMappingURL=chip.js.map
