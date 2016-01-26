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
};

},{"./fade":1,"./slide":6,"./slide-horizontal":3,"./slide-move":5,"./slide-move-horizontal":4}],3:[function(require,module,exports){
/**
 * Slide left and right
 */
module.exports = function(options) {
  if (!options) options = {};
  if (!options.property) options.property = 'width';
  return require('./slide')(options);
};

},{"./slide":6}],4:[function(require,module,exports){
/**
 * Move items left and right in a list
 */
module.exports = function(fragments, options) {
  if (!options) options = {};
  if (!options.property) options.property = 'width';
  return require('./slide-move')(fragments, options);
};

},{"./slide-move":5}],5:[function(require,module,exports){
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

      // Do the slide
      element.style.overflow = 'hidden';
      element.animate([
        keyValuePair(options.property, '0px'),
        keyValuePair(options.property, value)
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

      // Do the slide
      element.style.overflow = 'hidden';
      element.animate([
        keyValuePair(options.property, value),
        keyValuePair(options.property, '0px')
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

function keyValuePair(key, value) {
  var obj = {};
  obj[key] = value;
  return obj;
}

},{"./slide":6}],6:[function(require,module,exports){
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

      element.style.overflow = 'hidden';
      element.animate([
        keyValuePair(this.options.property, '0px'),
        keyValuePair(this.options.property, value)
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

      element.style.overflow = 'hidden';
      element.animate([
        keyValuePair(this.options.property, value),
        keyValuePair(this.options.property, '0px')
      ], this.options).onfinish = function() {
        element.style.overflow = '';
        done();
      };
    }
  };
};

function keyValuePair(key, value) {
  var obj = {};
  obj[key] = value;
  return obj;
}

},{}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
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

},{}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
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
      if (definition.template && !definition.template.pool) {
        definition.template = this.fragments.createTemplate(definition.template);
      }

      if (definition.template) {
        this.template = definition.template;
      }

      if (this.element.childNodes.length) {
        // Use the contents of this component to be inserted within it
        this.contentTemplate = this.fragments.createTemplate(this.element.childNodes);
      }
    },

    created: function() {
      if (this.contentTemplate) {
        this.content = this.contentTemplate.createView();
      }

      if (this.template) {
        this.view = this.template.createView();
        this.element.appendChild(this.view);
        if (this.content) {
          this._componentContent = this.content;
        }
      } else if (this.content) {
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
      if (this.view) this.view.bind(this.element);
      if (this.content) this.content.bind(this.context);

      definitions.forEach(function(definition) {
        if (typeof definition.attached === 'function') {
          definition.attached.call(this.element);
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

},{}],12:[function(require,module,exports){
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

},{}],13:[function(require,module,exports){
/**
 * A binder that displays unescaped HTML inside an element. Be sure it's trusted! This should be used with formatters
 * which create HTML from something safe.
 */
module.exports = function() {
  return function(value) {
    this.element.innerHTML = (value == null ? '' : value);
  };
};

},{}],14:[function(require,module,exports){
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
        this.showing.bind(this.context);
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
          this.animating = false;
          // if the value changed while this was animating run it again
          if (this.lastValue !== index) {
            this.updatedAnimated(this.lastValue);
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

},{}],15:[function(require,module,exports){
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

},{"./events":12}],16:[function(require,module,exports){
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

},{}],17:[function(require,module,exports){
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

},{}],18:[function(require,module,exports){
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

},{}],19:[function(require,module,exports){
/**
 * A binder that sets a reference to the element when it is bound.
 */
module.exports = function () {
  return {
    bound: function() {
      this.context[this.match || this.expression] = this.element;
    },

    unbound: function() {
      this.context[this.match || this.expression] = null;
    }
  };
};

},{}],20:[function(require,module,exports){
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

        allRemoved.forEach(this.removeView);

        this.animating = false;
        if (this.valueWhileAnimating) {
          var changes = diff.arrays(this.valueWhileAnimating, animatingValue);
          this.updateChangesAnimated(this.valueWhileAnimating, changes);
          this.valueWhileAnimating = null;
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
      });
      this.valueWhileAnimating = null;
      this.animating = false;
    }
  };
};

},{"differences-js":49}],21:[function(require,module,exports){
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
        this.animating = false;
        if (this.lastValue !== value) {
          this.updatedAnimated(this.lastValue);
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

},{}],22:[function(require,module,exports){
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
      this.element.styles[this.styleName] = (value == null) ? '' : value + this.unit;
    }
  };
};

},{}],23:[function(require,module,exports){
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

},{}],24:[function(require,module,exports){
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


},{}],25:[function(require,module,exports){
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

},{}],26:[function(require,module,exports){
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

},{}],27:[function(require,module,exports){
/**
 * Formats the value into a boolean.
 */
module.exports = function(value) {
  return value && value !== '0' && value !== 'false';
};

},{}],28:[function(require,module,exports){
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

},{"./escape":31}],29:[function(require,module,exports){
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

},{}],30:[function(require,module,exports){
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

},{}],31:[function(require,module,exports){
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

},{}],32:[function(require,module,exports){
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

},{}],33:[function(require,module,exports){
/**
 * Formats the value into a float or null.
 */
module.exports = function(value) {
  value = parseFloat(value);
  return isNaN(value) ? null : value;
};

},{}],34:[function(require,module,exports){
/**
 * Formats the value something returned by a formatting function passed. Use for custom or one-off formats.
 */
module.exports = function(value, formatter, isSetter) {
  return formatter(value, isSetter);
};

},{}],35:[function(require,module,exports){
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

},{"./add-query":25,"./autolink":26,"./bool":27,"./br":28,"./date":30,"./date-time":29,"./escape":31,"./filter":32,"./float":33,"./format":34,"./int":36,"./json":37,"./limit":38,"./log":39,"./lower":40,"./map":41,"./newline":42,"./p":43,"./reduce":44,"./slice":45,"./sort":46,"./time":47,"./upper":48}],36:[function(require,module,exports){
/**
 * Formats the value into an integer or null.
 */
module.exports = function(value) {
  value = parseInt(value);
  return isNaN(value) ? null : value;
};

},{}],37:[function(require,module,exports){
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

},{}],38:[function(require,module,exports){
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

},{}],39:[function(require,module,exports){
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

},{}],40:[function(require,module,exports){
/**
 * Formats the value into lower case.
 */
module.exports = function(value) {
  return typeof value === 'string' ? value.toLowerCase() : value;
};

},{}],41:[function(require,module,exports){
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

},{}],42:[function(require,module,exports){
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

},{"./escape":31}],43:[function(require,module,exports){
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

},{"./escape":31}],44:[function(require,module,exports){
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

},{}],45:[function(require,module,exports){
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

},{}],46:[function(require,module,exports){
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

},{}],47:[function(require,module,exports){
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

},{}],48:[function(require,module,exports){
/**
 * Formats the value into upper case.
 */
module.exports = function(value) {
  return typeof value === 'string' ? value.toUpperCase() : value;
};

},{}],49:[function(require,module,exports){
module.exports = require('./src/diff');

},{"./src/diff":50}],50:[function(require,module,exports){
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

},{}],51:[function(require,module,exports){
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

},{}],52:[function(require,module,exports){
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

},{"./class":51}],53:[function(require,module,exports){
module.exports = require('./src/chip');

},{"./src/chip":56}],54:[function(require,module,exports){
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
},{"./fragments":57,"./mixins/default":58,"chip-utils/event-target":52,"fragments-built-ins/binders/component":11,"routes-js":80}],55:[function(require,module,exports){
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

},{"fragments-built-ins/binders/if":14,"routes-js":80}],56:[function(require,module,exports){
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

},{"./app":54}],57:[function(require,module,exports){
var createFragments = require('fragments-js').create;

module.exports = function() {

  var fragments = createFragments();

  // Configure
  fragments.setExpressionDelimiters('attribute', '{{', '}}', true);
  fragments.animateAttribute = '[animate]';
  require('fragments-built-ins/animations')(fragments);
  require('fragments-built-ins/formatters')(fragments);

  fragments.registerAttribute('(keydown:*)', require('fragments-built-ins/binders/key-events')(null, 'keydown'));
  fragments.registerAttribute('(keyup:*)', require('fragments-built-ins/binders/key-events')(null, 'keyup'));
  fragments.registerAttribute('(*)', require('fragments-built-ins/binders/events')());
  fragments.registerAttribute('{*}', require('fragments-built-ins/binders/properties')());
  fragments.registerAttribute('{{*}}', require('fragments-built-ins/binders/properties-2-way')());
  fragments.registerAttribute('*?', require('fragments-built-ins/binders/attribute-names')());
  fragments.registerAttribute('[show]', require('fragments-built-ins/binders/show')(false));
  fragments.registerAttribute('[hide]', require('fragments-built-ins/binders/show')(true));
  fragments.registerAttribute('[for]', require('fragments-built-ins/binders/repeat')());
  fragments.registerAttribute('#*', require('fragments-built-ins/binders/ref')());
  fragments.registerAttribute('[text]', require('fragments-built-ins/binders/text')());
  fragments.registerAttribute('[html]', require('fragments-built-ins/binders/html')());
  fragments.registerAttribute('[src]', require('fragments-built-ins/binders/properties')('src'));
  fragments.registerAttribute('[log]', require('fragments-built-ins/binders/log')());
  fragments.registerAttribute('[.*]', require('fragments-built-ins/binders/classes')());
  fragments.registerAttribute('[styles.*]', require('fragments-built-ins/binders/styles')());
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

},{"./binders/route":55,"fragments-built-ins/animations":2,"fragments-built-ins/binders/attribute-names":7,"fragments-built-ins/binders/autofocus":8,"fragments-built-ins/binders/autoselect":9,"fragments-built-ins/binders/classes":10,"fragments-built-ins/binders/events":12,"fragments-built-ins/binders/html":13,"fragments-built-ins/binders/if":14,"fragments-built-ins/binders/key-events":15,"fragments-built-ins/binders/log":16,"fragments-built-ins/binders/properties":18,"fragments-built-ins/binders/properties-2-way":17,"fragments-built-ins/binders/ref":19,"fragments-built-ins/binders/repeat":20,"fragments-built-ins/binders/show":21,"fragments-built-ins/binders/styles":22,"fragments-built-ins/binders/text":23,"fragments-built-ins/binders/value":24,"fragments-built-ins/formatters":35,"fragments-js":66}],58:[function(require,module,exports){

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

},{}],59:[function(require,module,exports){
arguments[4][49][0].apply(exports,arguments)
},{"./src/diff":60,"dup":49}],60:[function(require,module,exports){
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

},{}],61:[function(require,module,exports){
module.exports = require('./src/expressions');

},{"./src/expressions":62}],62:[function(require,module,exports){
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
  // Allow '!prop' to become 'prop = !value'
  if (isSetter && expr.charAt(0) === '!') {
    expr = expr.slice(1);
    valueProperty = '!' + valueProperty;
  }

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
  expr = expr.replace(/(\s*\||$)/, ' = _value_$1');

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

},{"./formatters":63,"./property-chains":64,"./strings":65}],63:[function(require,module,exports){

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

},{}],64:[function(require,module,exports){
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

},{}],65:[function(require,module,exports){
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

},{}],66:[function(require,module,exports){
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

},{"./src/fragments":71,"observations-js":77}],67:[function(require,module,exports){
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

},{}],68:[function(require,module,exports){
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

    var whenDone = function() {
      if (animateObject && animateObject[methodDidName]) animateObject[methodDidName](node);
      if (callback) callback.call(_this);
      node.classList.remove(classAnimateName);
      if (className) node.classList.remove(className);
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
},{"./binding":69,"./util/animation":73}],69:[function(require,module,exports){
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

},{"chip-utils/class":67}],70:[function(require,module,exports){
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

    // Find any binding for the element
    Binder = fragments.findBinder('element', node.tagName.toLowerCase());
    if (Binder) {
      binding = new Binder({ node: node, view: view, fragments: fragments });
      if (binding.compiled() !== false) {
        bindings.push(binding);
      }
    }

    // If removed, made a template, don't continue processing
    if (node.parentNode !== parent) {
      return;
    }

    // Find and add any attribute bindings on an element. These can be attributes whose name matches a binding, or
    // they can be attributes which have a binding in the value such as `href="/post/{{ post.id }}"`.
    bound = [];
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
    bound.sort(sortAttributes);

    for (i = 0; i < bound.length; i++) {
      Binder = bound[i][0];
      attr = bound[i][1];
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

      if (binding.compiled() !== false) {
        bindings.push(binding);
      } else if (Binder !== DefaultBinder && fragments.isBound('attribute', value)) {
        // Revert to default if this binding doesn't take
        bound.push([ DefaultBinder, attr ]);
      }

      if (node.parentNode !== parent) {
        break;
      }
    }
  }

  return bindings.sort(sortBindings);
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
  return b.priority - a.priority;
}

function sortAttributes(a, b) {
  return sortBindings(b[0].prototype, a[0].prototype);
}

function notEmpty(value) {
  return Boolean(value);
}

},{}],71:[function(require,module,exports){
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
      throw new Error('Cannot create a template from ' + html);
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

},{"./animatedBinding":68,"./binding":69,"./compile":70,"./template":72,"./util/animation":73,"./util/polyfills":74,"./util/toFragment":75,"./view":76,"chip-utils/class":67}],72:[function(require,module,exports){
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

},{"./view":76,"chip-utils/class":67}],73:[function(require,module,exports){
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

},{}],74:[function(require,module,exports){



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

},{}],75:[function(require,module,exports){
module.exports = toFragment;

// Convert stuff into document fragments. Stuff can be:
// * A string of HTML text
// * An element or text node
// * A NodeList or HTMLCollection (e.g. `element.childNodes` or `element.children`)
// * A jQuery object
// * A script element with a `type` attribute of `"text/*"` (e.g. `<script type="text/html">My template code!</script>`)
// * A template element (e.g. `<template>My template code!</template>`)
function toFragment(html) {
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

},{}],76:[function(require,module,exports){
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

},{"chip-utils/class":67}],77:[function(require,module,exports){

exports.Observations = require('./src/observations');
exports.Observer = require('./src/observer');
exports.create = function() {
  return new exports.Observations();
};

},{"./src/observations":78,"./src/observer":79}],78:[function(require,module,exports){
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

},{"./observer":79,"chip-utils/class":51}],79:[function(require,module,exports){
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

},{"chip-utils/class":51,"differences-js":59,"expressions-js":61}],80:[function(require,module,exports){

exports.Router = require('./src/router');
exports.Route = require('./src/route');
exports.Location = require('./src/location');
exports.HashLocation = require('./src/hash-location');
exports.PushLocation = require('./src/push-location');
exports.create = function(options) {
  return new exports.Router(options);
};

},{"./src/hash-location":83,"./src/location":84,"./src/push-location":85,"./src/route":86,"./src/router":87}],81:[function(require,module,exports){
arguments[4][67][0].apply(exports,arguments)
},{"dup":67}],82:[function(require,module,exports){
arguments[4][52][0].apply(exports,arguments)
},{"./class":81,"dup":52}],83:[function(require,module,exports){
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

},{"./location":84}],84:[function(require,module,exports){
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

},{"./hash-location":83,"./push-location":85,"chip-utils/event-target":82}],85:[function(require,module,exports){
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

},{"./location":84}],86:[function(require,module,exports){
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

},{"chip-utils/class":81}],87:[function(require,module,exports){
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

},{"./location":84,"./route":86,"chip-utils/event-target":82}]},{},[53])(53)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9idWlsdC1pbnMvYW5pbWF0aW9ucy9mYWRlLmpzIiwiLi4vYnVpbHQtaW5zL2FuaW1hdGlvbnMvaW5kZXguanMiLCIuLi9idWlsdC1pbnMvYW5pbWF0aW9ucy9zbGlkZS1ob3Jpem9udGFsLmpzIiwiLi4vYnVpbHQtaW5zL2FuaW1hdGlvbnMvc2xpZGUtbW92ZS1ob3Jpem9udGFsLmpzIiwiLi4vYnVpbHQtaW5zL2FuaW1hdGlvbnMvc2xpZGUtbW92ZS5qcyIsIi4uL2J1aWx0LWlucy9hbmltYXRpb25zL3NsaWRlLmpzIiwiLi4vYnVpbHQtaW5zL2JpbmRlcnMvYXR0cmlidXRlLW5hbWVzLmpzIiwiLi4vYnVpbHQtaW5zL2JpbmRlcnMvYXV0b2ZvY3VzLmpzIiwiLi4vYnVpbHQtaW5zL2JpbmRlcnMvYXV0b3NlbGVjdC5qcyIsIi4uL2J1aWx0LWlucy9iaW5kZXJzL2NsYXNzZXMuanMiLCIuLi9idWlsdC1pbnMvYmluZGVycy9jb21wb25lbnQuanMiLCIuLi9idWlsdC1pbnMvYmluZGVycy9ldmVudHMuanMiLCIuLi9idWlsdC1pbnMvYmluZGVycy9odG1sLmpzIiwiLi4vYnVpbHQtaW5zL2JpbmRlcnMvaWYuanMiLCIuLi9idWlsdC1pbnMvYmluZGVycy9rZXktZXZlbnRzLmpzIiwiLi4vYnVpbHQtaW5zL2JpbmRlcnMvbG9nLmpzIiwiLi4vYnVpbHQtaW5zL2JpbmRlcnMvcHJvcGVydGllcy0yLXdheS5qcyIsIi4uL2J1aWx0LWlucy9iaW5kZXJzL3Byb3BlcnRpZXMuanMiLCIuLi9idWlsdC1pbnMvYmluZGVycy9yZWYuanMiLCIuLi9idWlsdC1pbnMvYmluZGVycy9yZXBlYXQuanMiLCIuLi9idWlsdC1pbnMvYmluZGVycy9zaG93LmpzIiwiLi4vYnVpbHQtaW5zL2JpbmRlcnMvc3R5bGVzLmpzIiwiLi4vYnVpbHQtaW5zL2JpbmRlcnMvdGV4dC5qcyIsIi4uL2J1aWx0LWlucy9iaW5kZXJzL3ZhbHVlLmpzIiwiLi4vYnVpbHQtaW5zL2Zvcm1hdHRlcnMvYWRkLXF1ZXJ5LmpzIiwiLi4vYnVpbHQtaW5zL2Zvcm1hdHRlcnMvYXV0b2xpbmsuanMiLCIuLi9idWlsdC1pbnMvZm9ybWF0dGVycy9ib29sLmpzIiwiLi4vYnVpbHQtaW5zL2Zvcm1hdHRlcnMvYnIuanMiLCIuLi9idWlsdC1pbnMvZm9ybWF0dGVycy9kYXRlLXRpbWUuanMiLCIuLi9idWlsdC1pbnMvZm9ybWF0dGVycy9kYXRlLmpzIiwiLi4vYnVpbHQtaW5zL2Zvcm1hdHRlcnMvZXNjYXBlLmpzIiwiLi4vYnVpbHQtaW5zL2Zvcm1hdHRlcnMvZmlsdGVyLmpzIiwiLi4vYnVpbHQtaW5zL2Zvcm1hdHRlcnMvZmxvYXQuanMiLCIuLi9idWlsdC1pbnMvZm9ybWF0dGVycy9mb3JtYXQuanMiLCIuLi9idWlsdC1pbnMvZm9ybWF0dGVycy9pbmRleC5qcyIsIi4uL2J1aWx0LWlucy9mb3JtYXR0ZXJzL2ludC5qcyIsIi4uL2J1aWx0LWlucy9mb3JtYXR0ZXJzL2pzb24uanMiLCIuLi9idWlsdC1pbnMvZm9ybWF0dGVycy9saW1pdC5qcyIsIi4uL2J1aWx0LWlucy9mb3JtYXR0ZXJzL2xvZy5qcyIsIi4uL2J1aWx0LWlucy9mb3JtYXR0ZXJzL2xvd2VyLmpzIiwiLi4vYnVpbHQtaW5zL2Zvcm1hdHRlcnMvbWFwLmpzIiwiLi4vYnVpbHQtaW5zL2Zvcm1hdHRlcnMvbmV3bGluZS5qcyIsIi4uL2J1aWx0LWlucy9mb3JtYXR0ZXJzL3AuanMiLCIuLi9idWlsdC1pbnMvZm9ybWF0dGVycy9yZWR1Y2UuanMiLCIuLi9idWlsdC1pbnMvZm9ybWF0dGVycy9zbGljZS5qcyIsIi4uL2J1aWx0LWlucy9mb3JtYXR0ZXJzL3NvcnQuanMiLCIuLi9idWlsdC1pbnMvZm9ybWF0dGVycy90aW1lLmpzIiwiLi4vYnVpbHQtaW5zL2Zvcm1hdHRlcnMvdXBwZXIuanMiLCIuLi9idWlsdC1pbnMvbm9kZV9tb2R1bGVzL2RpZmZlcmVuY2VzLWpzL2luZGV4LmpzIiwiLi4vYnVpbHQtaW5zL25vZGVfbW9kdWxlcy9kaWZmZXJlbmNlcy1qcy9zcmMvZGlmZi5qcyIsIi4uL2NoaXAtdXRpbHMvY2xhc3MuanMiLCIuLi9jaGlwLXV0aWxzL2V2ZW50LXRhcmdldC5qcyIsImluZGV4LmpzIiwic3JjL2FwcC5qcyIsInNyYy9iaW5kZXJzL3JvdXRlLmpzIiwic3JjL2NoaXAuanMiLCJzcmMvZnJhZ21lbnRzLmpzIiwic3JjL21peGlucy9kZWZhdWx0LmpzIiwiLi4vZGlmZmVyZW5jZXMtanMvc3JjL2RpZmYuanMiLCIuLi9leHByZXNzaW9ucy1qcy9pbmRleC5qcyIsIi4uL2V4cHJlc3Npb25zLWpzL3NyYy9leHByZXNzaW9ucy5qcyIsIi4uL2V4cHJlc3Npb25zLWpzL3NyYy9mb3JtYXR0ZXJzLmpzIiwiLi4vZXhwcmVzc2lvbnMtanMvc3JjL3Byb3BlcnR5LWNoYWlucy5qcyIsIi4uL2V4cHJlc3Npb25zLWpzL3NyYy9zdHJpbmdzLmpzIiwiLi4vZnJhZ21lbnRzLWpzL2luZGV4LmpzIiwiLi4vZnJhZ21lbnRzLWpzL25vZGVfbW9kdWxlcy9jaGlwLXV0aWxzL2NsYXNzLmpzIiwiLi4vZnJhZ21lbnRzLWpzL3NyYy9hbmltYXRlZEJpbmRpbmcuanMiLCIuLi9mcmFnbWVudHMtanMvc3JjL2JpbmRpbmcuanMiLCIuLi9mcmFnbWVudHMtanMvc3JjL2NvbXBpbGUuanMiLCIuLi9mcmFnbWVudHMtanMvc3JjL2ZyYWdtZW50cy5qcyIsIi4uL2ZyYWdtZW50cy1qcy9zcmMvdGVtcGxhdGUuanMiLCIuLi9mcmFnbWVudHMtanMvc3JjL3V0aWwvYW5pbWF0aW9uLmpzIiwiLi4vZnJhZ21lbnRzLWpzL3NyYy91dGlsL3BvbHlmaWxscy5qcyIsIi4uL2ZyYWdtZW50cy1qcy9zcmMvdXRpbC90b0ZyYWdtZW50LmpzIiwiLi4vZnJhZ21lbnRzLWpzL3NyYy92aWV3LmpzIiwiLi4vb2JzZXJ2YXRpb25zLWpzL2luZGV4LmpzIiwiLi4vb2JzZXJ2YXRpb25zLWpzL3NyYy9vYnNlcnZhdGlvbnMuanMiLCIuLi9vYnNlcnZhdGlvbnMtanMvc3JjL29ic2VydmVyLmpzIiwiLi4vcm91dGVzLWpzL2luZGV4LmpzIiwiLi4vcm91dGVzLWpzL3NyYy9oYXNoLWxvY2F0aW9uLmpzIiwiLi4vcm91dGVzLWpzL3NyYy9sb2NhdGlvbi5qcyIsIi4uL3JvdXRlcy1qcy9zcmMvcHVzaC1sb2NhdGlvbi5qcyIsIi4uL3JvdXRlcy1qcy9zcmMvcm91dGUuanMiLCIuLi9yb3V0ZXMtanMvc3JjL3JvdXRlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxWUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcFpBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdlVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5bUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNuS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBGYWRlIGluIGFuZCBvdXRcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gIGlmICghb3B0aW9ucykgb3B0aW9ucyA9IHt9O1xuICBpZiAoIW9wdGlvbnMuZHVyYXRpb24pIG9wdGlvbnMuZHVyYXRpb24gPSAyNTA7XG4gIGlmICghb3B0aW9ucy5lYXNpbmcpIG9wdGlvbnMuZWFzaW5nID0gJ2Vhc2UtaW4tb3V0JztcblxuICByZXR1cm4ge1xuICAgIG9wdGlvbnM6IG9wdGlvbnMsXG4gICAgYW5pbWF0ZUluOiBmdW5jdGlvbihlbGVtZW50LCBkb25lKSB7XG4gICAgICBlbGVtZW50LmFuaW1hdGUoW1xuICAgICAgICB7IG9wYWNpdHk6ICcwJyB9LFxuICAgICAgICB7IG9wYWNpdHk6ICcxJyB9XG4gICAgICBdLCB0aGlzLm9wdGlvbnMpLm9uZmluaXNoID0gZG9uZTtcbiAgICB9LFxuICAgIGFuaW1hdGVPdXQ6IGZ1bmN0aW9uKGVsZW1lbnQsIGRvbmUpIHtcbiAgICAgIGVsZW1lbnQuYW5pbWF0ZShbXG4gICAgICAgIHsgb3BhY2l0eTogJzEnIH0sXG4gICAgICAgIHsgb3BhY2l0eTogJzAnIH1cbiAgICAgIF0sIHRoaXMub3B0aW9ucykub25maW5pc2ggPSBkb25lO1xuICAgIH1cbiAgfTtcbn07XG4iLCIvKipcbiAqIEFkZHMgYWxsIGJ1aWx0LWluIGFuaW1hdGlvbnMgd2l0aCBkZWZhdWx0IG5hbWVzXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZnJhZ21lbnRzKSB7XG4gIGlmICghZnJhZ21lbnRzIHx8IHR5cGVvZiBmcmFnbWVudHMucmVnaXN0ZXJBbmltYXRpb24gIT09ICdmdW5jdGlvbicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdmb3JtYXR0ZXJzIHJlcXVpcmVzIGFuIGluc3RhbmNlIG9mIGZyYWdtZW50cyB0byByZWdpc3RlciB3aXRoJyk7XG4gIH1cblxuICBmcmFnbWVudHMucmVnaXN0ZXJBbmltYXRpb24oJ2ZhZGUnLCByZXF1aXJlKCcuL2ZhZGUnKSgpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQW5pbWF0aW9uKCdzbGlkZScsIHJlcXVpcmUoJy4vc2xpZGUnKSgpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQW5pbWF0aW9uKCdzbGlkZS1oJywgcmVxdWlyZSgnLi9zbGlkZS1ob3Jpem9udGFsJykoKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckFuaW1hdGlvbignc2xpZGUtbW92ZScsIHJlcXVpcmUoJy4vc2xpZGUtbW92ZScpKGZyYWdtZW50cykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJBbmltYXRpb24oJ3NsaWRlLW1vdmUtaCcsIHJlcXVpcmUoJy4vc2xpZGUtbW92ZS1ob3Jpem9udGFsJykoZnJhZ21lbnRzKSk7XG59O1xuIiwiLyoqXG4gKiBTbGlkZSBsZWZ0IGFuZCByaWdodFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgaWYgKCFvcHRpb25zKSBvcHRpb25zID0ge307XG4gIGlmICghb3B0aW9ucy5wcm9wZXJ0eSkgb3B0aW9ucy5wcm9wZXJ0eSA9ICd3aWR0aCc7XG4gIHJldHVybiByZXF1aXJlKCcuL3NsaWRlJykob3B0aW9ucyk7XG59O1xuIiwiLyoqXG4gKiBNb3ZlIGl0ZW1zIGxlZnQgYW5kIHJpZ2h0IGluIGEgbGlzdFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGZyYWdtZW50cywgb3B0aW9ucykge1xuICBpZiAoIW9wdGlvbnMpIG9wdGlvbnMgPSB7fTtcbiAgaWYgKCFvcHRpb25zLnByb3BlcnR5KSBvcHRpb25zLnByb3BlcnR5ID0gJ3dpZHRoJztcbiAgcmV0dXJuIHJlcXVpcmUoJy4vc2xpZGUtbW92ZScpKGZyYWdtZW50cywgb3B0aW9ucyk7XG59O1xuIiwidmFyIHNsaWRlQW5pbWF0aW9uID0gcmVxdWlyZSgnLi9zbGlkZScpO1xudmFyIGFuaW1hdGluZyA9IG5ldyBNYXAoKTtcblxuLyoqXG4gKiBNb3ZlIGl0ZW1zIHVwIGFuZCBkb3duIGluIGEgbGlzdFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGZyYWdtZW50cywgb3B0aW9ucykge1xuICBpZiAoIW9wdGlvbnMpIG9wdGlvbnMgPSB7fTtcbiAgaWYgKCFvcHRpb25zLmR1cmF0aW9uKSBvcHRpb25zLmR1cmF0aW9uID0gMjUwO1xuICBpZiAoIW9wdGlvbnMuZWFzaW5nKSBvcHRpb25zLmVhc2luZyA9ICdlYXNlLWluLW91dCc7XG4gIGlmICghb3B0aW9ucy5wcm9wZXJ0eSkgb3B0aW9ucy5wcm9wZXJ0eSA9ICdoZWlnaHQnO1xuXG4gIHJldHVybiB7XG4gICAgb3B0aW9uczogb3B0aW9ucyxcblxuICAgIGFuaW1hdGVJbjogZnVuY3Rpb24oZWxlbWVudCwgZG9uZSkge1xuICAgICAgdmFyIHZhbHVlID0gZWxlbWVudC5nZXRDb21wdXRlZENTUyhvcHRpb25zLnByb3BlcnR5KTtcbiAgICAgIGlmICghdmFsdWUgfHwgdmFsdWUgPT09ICcwcHgnKSB7XG4gICAgICAgIHJldHVybiBkb25lKCk7XG4gICAgICB9XG5cbiAgICAgIHZhciBpdGVtID0gZWxlbWVudC52aWV3ICYmIGVsZW1lbnQudmlldy5fcmVwZWF0SXRlbV87XG4gICAgICBpZiAoaXRlbSkge1xuICAgICAgICBhbmltYXRpbmcuc2V0KGl0ZW0sIGVsZW1lbnQpO1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGFuaW1hdGluZy5kZWxldGUoaXRlbSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBEbyB0aGUgc2xpZGVcbiAgICAgIGVsZW1lbnQuc3R5bGUub3ZlcmZsb3cgPSAnaGlkZGVuJztcbiAgICAgIGVsZW1lbnQuYW5pbWF0ZShbXG4gICAgICAgIGtleVZhbHVlUGFpcihvcHRpb25zLnByb3BlcnR5LCAnMHB4JyksXG4gICAgICAgIGtleVZhbHVlUGFpcihvcHRpb25zLnByb3BlcnR5LCB2YWx1ZSlcbiAgICAgIF0sIHRoaXMub3B0aW9ucykub25maW5pc2ggPSBmdW5jdGlvbigpIHtcbiAgICAgICAgZWxlbWVudC5zdHlsZS5vdmVyZmxvdyA9ICcnO1xuICAgICAgICBkb25lKCk7XG4gICAgICB9O1xuICAgIH0sXG5cbiAgICBhbmltYXRlT3V0OiBmdW5jdGlvbihlbGVtZW50LCBkb25lKSB7XG4gICAgICB2YXIgdmFsdWUgPSBlbGVtZW50LmdldENvbXB1dGVkQ1NTKG9wdGlvbnMucHJvcGVydHkpO1xuICAgICAgaWYgKCF2YWx1ZSB8fCB2YWx1ZSA9PT0gJzBweCcpIHtcbiAgICAgICAgcmV0dXJuIGRvbmUoKTtcbiAgICAgIH1cblxuICAgICAgdmFyIGl0ZW0gPSBlbGVtZW50LnZpZXcgJiYgZWxlbWVudC52aWV3Ll9yZXBlYXRJdGVtXztcbiAgICAgIGlmIChpdGVtKSB7XG4gICAgICAgIHZhciBuZXdFbGVtZW50ID0gYW5pbWF0aW5nLmdldChpdGVtKTtcbiAgICAgICAgaWYgKG5ld0VsZW1lbnQgJiYgbmV3RWxlbWVudC5wYXJlbnROb2RlID09PSBlbGVtZW50LnBhcmVudE5vZGUpIHtcbiAgICAgICAgICAvLyBUaGlzIGl0ZW0gaXMgYmVpbmcgcmVtb3ZlZCBpbiBvbmUgcGxhY2UgYW5kIGFkZGVkIGludG8gYW5vdGhlci4gTWFrZSBpdCBsb29rIGxpa2UgaXRzIG1vdmluZyBieSBtYWtpbmcgYm90aFxuICAgICAgICAgIC8vIGVsZW1lbnRzIG5vdCB2aXNpYmxlIGFuZCBoYXZpbmcgYSBjbG9uZSBtb3ZlIGFib3ZlIHRoZSBpdGVtcyB0byB0aGUgbmV3IGxvY2F0aW9uLlxuICAgICAgICAgIGVsZW1lbnQgPSB0aGlzLmFuaW1hdGVNb3ZlKGVsZW1lbnQsIG5ld0VsZW1lbnQpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIERvIHRoZSBzbGlkZVxuICAgICAgZWxlbWVudC5zdHlsZS5vdmVyZmxvdyA9ICdoaWRkZW4nO1xuICAgICAgZWxlbWVudC5hbmltYXRlKFtcbiAgICAgICAga2V5VmFsdWVQYWlyKG9wdGlvbnMucHJvcGVydHksIHZhbHVlKSxcbiAgICAgICAga2V5VmFsdWVQYWlyKG9wdGlvbnMucHJvcGVydHksICcwcHgnKVxuICAgICAgXSwgdGhpcy5vcHRpb25zKS5vbmZpbmlzaCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBlbGVtZW50LnN0eWxlLm92ZXJmbG93ID0gJyc7XG4gICAgICAgIGRvbmUoKTtcbiAgICAgIH07XG4gICAgfSxcblxuICAgIGFuaW1hdGVNb3ZlOiBmdW5jdGlvbihvbGRFbGVtZW50LCBuZXdFbGVtZW50KSB7XG4gICAgICB2YXIgcGxhY2Vob2xkZXJFbGVtZW50O1xuICAgICAgdmFyIHBhcmVudCA9IG5ld0VsZW1lbnQucGFyZW50Tm9kZTtcbiAgICAgIGlmICghcGFyZW50Ll9fc2xpZGVNb3ZlSGFuZGxlZCkge1xuICAgICAgICBwYXJlbnQuX19zbGlkZU1vdmVIYW5kbGVkID0gdHJ1ZTtcbiAgICAgICAgaWYgKHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHBhcmVudCkucG9zaXRpb24gPT09ICdzdGF0aWMnKSB7XG4gICAgICAgICAgcGFyZW50LnN0eWxlLnBvc2l0aW9uID0gJ3JlbGF0aXZlJztcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB2YXIgb3JpZ1N0eWxlID0gb2xkRWxlbWVudC5nZXRBdHRyaWJ1dGUoJ3N0eWxlJyk7XG4gICAgICB2YXIgc3R5bGUgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShvbGRFbGVtZW50KTtcbiAgICAgIHZhciBtYXJnaW5PZmZzZXRMZWZ0ID0gLXBhcnNlSW50KHN0eWxlLm1hcmdpbkxlZnQpO1xuICAgICAgdmFyIG1hcmdpbk9mZnNldFRvcCA9IC1wYXJzZUludChzdHlsZS5tYXJnaW5Ub3ApO1xuICAgICAgdmFyIG9sZExlZnQgPSBvbGRFbGVtZW50Lm9mZnNldExlZnQ7XG4gICAgICB2YXIgb2xkVG9wID0gb2xkRWxlbWVudC5vZmZzZXRUb3A7XG5cbiAgICAgIHBsYWNlaG9sZGVyRWxlbWVudCA9IGZyYWdtZW50cy5tYWtlRWxlbWVudEFuaW1hdGFibGUob2xkRWxlbWVudC5jbG9uZU5vZGUodHJ1ZSkpO1xuICAgICAgcGxhY2Vob2xkZXJFbGVtZW50LnN0eWxlLndpZHRoID0gb2xkRWxlbWVudC5zdHlsZS53aWR0aCA9IHN0eWxlLndpZHRoO1xuICAgICAgcGxhY2Vob2xkZXJFbGVtZW50LnN0eWxlLmhlaWdodCA9IG9sZEVsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gc3R5bGUuaGVpZ2h0O1xuICAgICAgcGxhY2Vob2xkZXJFbGVtZW50LnN0eWxlLm9wYWNpdHkgPSAnMCc7XG5cbiAgICAgIG9sZEVsZW1lbnQuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuICAgICAgb2xkRWxlbWVudC5zdHlsZS56SW5kZXggPSAxMDAwO1xuICAgICAgcGFyZW50Lmluc2VydEJlZm9yZShwbGFjZWhvbGRlckVsZW1lbnQsIG9sZEVsZW1lbnQpO1xuICAgICAgbmV3RWxlbWVudC5zdHlsZS5vcGFjaXR5ID0gJzAnO1xuXG4gICAgICBvbGRFbGVtZW50LmFuaW1hdGUoW1xuICAgICAgICB7IHRvcDogb2xkVG9wICsgbWFyZ2luT2Zmc2V0VG9wICsgJ3B4JywgbGVmdDogb2xkTGVmdCArIG1hcmdpbk9mZnNldExlZnQgKyAncHgnIH0sXG4gICAgICAgIHsgdG9wOiBuZXdFbGVtZW50Lm9mZnNldFRvcCArIG1hcmdpbk9mZnNldFRvcCArICdweCcsIGxlZnQ6IG5ld0VsZW1lbnQub2Zmc2V0TGVmdCArIG1hcmdpbk9mZnNldExlZnQgKyAncHgnIH1cbiAgICAgIF0sIHRoaXMub3B0aW9ucykub25maW5pc2ggPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcGxhY2Vob2xkZXJFbGVtZW50LnJlbW92ZSgpO1xuICAgICAgICBvcmlnU3R5bGUgPyBvbGRFbGVtZW50LnNldEF0dHJpYnV0ZSgnc3R5bGUnLCBvcmlnU3R5bGUpIDogb2xkRWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUoJ3N0eWxlJyk7XG4gICAgICAgIG5ld0VsZW1lbnQuc3R5bGUub3BhY2l0eSA9ICcnO1xuICAgICAgfTtcblxuICAgICAgcmV0dXJuIHBsYWNlaG9sZGVyRWxlbWVudDtcbiAgICB9XG4gIH07XG59O1xuXG5mdW5jdGlvbiBrZXlWYWx1ZVBhaXIoa2V5LCB2YWx1ZSkge1xuICB2YXIgb2JqID0ge307XG4gIG9ialtrZXldID0gdmFsdWU7XG4gIHJldHVybiBvYmo7XG59XG4iLCIvKipcbiAqIFNsaWRlIGRvd24gYW5kIHVwXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICBpZiAoIW9wdGlvbnMpIG9wdGlvbnMgPSB7fTtcbiAgaWYgKCFvcHRpb25zLmR1cmF0aW9uKSBvcHRpb25zLmR1cmF0aW9uID0gMjUwO1xuICBpZiAoIW9wdGlvbnMuZWFzaW5nKSBvcHRpb25zLmVhc2luZyA9ICdlYXNlLWluLW91dCc7XG4gIGlmICghb3B0aW9ucy5wcm9wZXJ0eSkgb3B0aW9ucy5wcm9wZXJ0eSA9ICdoZWlnaHQnO1xuXG4gIHJldHVybiB7XG4gICAgb3B0aW9uczogb3B0aW9ucyxcblxuICAgIGFuaW1hdGVJbjogZnVuY3Rpb24oZWxlbWVudCwgZG9uZSkge1xuICAgICAgdmFyIHZhbHVlID0gZWxlbWVudC5nZXRDb21wdXRlZENTUyh0aGlzLm9wdGlvbnMucHJvcGVydHkpO1xuICAgICAgaWYgKCF2YWx1ZSB8fCB2YWx1ZSA9PT0gJzBweCcpIHtcbiAgICAgICAgcmV0dXJuIGRvbmUoKTtcbiAgICAgIH1cblxuICAgICAgZWxlbWVudC5zdHlsZS5vdmVyZmxvdyA9ICdoaWRkZW4nO1xuICAgICAgZWxlbWVudC5hbmltYXRlKFtcbiAgICAgICAga2V5VmFsdWVQYWlyKHRoaXMub3B0aW9ucy5wcm9wZXJ0eSwgJzBweCcpLFxuICAgICAgICBrZXlWYWx1ZVBhaXIodGhpcy5vcHRpb25zLnByb3BlcnR5LCB2YWx1ZSlcbiAgICAgIF0sIHRoaXMub3B0aW9ucykub25maW5pc2ggPSBmdW5jdGlvbigpIHtcbiAgICAgICAgZWxlbWVudC5zdHlsZS5vdmVyZmxvdyA9ICcnO1xuICAgICAgICBkb25lKCk7XG4gICAgICB9O1xuICAgIH0sXG5cbiAgICBhbmltYXRlT3V0OiBmdW5jdGlvbihlbGVtZW50LCBkb25lKSB7XG4gICAgICB2YXIgdmFsdWUgPSBlbGVtZW50LmdldENvbXB1dGVkQ1NTKHRoaXMub3B0aW9ucy5wcm9wZXJ0eSk7XG4gICAgICBpZiAoIXZhbHVlIHx8IHZhbHVlID09PSAnMHB4Jykge1xuICAgICAgICByZXR1cm4gZG9uZSgpO1xuICAgICAgfVxuXG4gICAgICBlbGVtZW50LnN0eWxlLm92ZXJmbG93ID0gJ2hpZGRlbic7XG4gICAgICBlbGVtZW50LmFuaW1hdGUoW1xuICAgICAgICBrZXlWYWx1ZVBhaXIodGhpcy5vcHRpb25zLnByb3BlcnR5LCB2YWx1ZSksXG4gICAgICAgIGtleVZhbHVlUGFpcih0aGlzLm9wdGlvbnMucHJvcGVydHksICcwcHgnKVxuICAgICAgXSwgdGhpcy5vcHRpb25zKS5vbmZpbmlzaCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBlbGVtZW50LnN0eWxlLm92ZXJmbG93ID0gJyc7XG4gICAgICAgIGRvbmUoKTtcbiAgICAgIH07XG4gICAgfVxuICB9O1xufTtcblxuZnVuY3Rpb24ga2V5VmFsdWVQYWlyKGtleSwgdmFsdWUpIHtcbiAgdmFyIG9iaiA9IHt9O1xuICBvYmpba2V5XSA9IHZhbHVlO1xuICByZXR1cm4gb2JqO1xufVxuIiwiLyoqXG4gKiBBIGJpbmRlciB0aGF0IHRvZ2dsZXMgYW4gYXR0cmlidXRlIG9uIG9yIG9mZiBpZiB0aGUgZXhwcmVzc2lvbiBpcyB0cnV0aHkgb3IgZmFsc2V5LiBVc2UgZm9yIGF0dHJpYnV0ZXMgd2l0aG91dFxuICogdmFsdWVzIHN1Y2ggYXMgYHNlbGVjdGVkYCwgYGRpc2FibGVkYCwgb3IgYHJlYWRvbmx5YC5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzcGVjaWZpY0F0dHJOYW1lKSB7XG4gIHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHZhciBhdHRyTmFtZSA9IHNwZWNpZmljQXR0ck5hbWUgfHwgdGhpcy5tYXRjaDtcbiAgICBpZiAoIXZhbHVlKSB7XG4gICAgICB0aGlzLmVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKGF0dHJOYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZShhdHRyTmFtZSwgJycpO1xuICAgIH1cbiAgfTtcbn07XG4iLCIvKipcbiAqIEEgYmluZGVyIHRoYXQgYXV0b21hdGljYWxseSBmb2N1c2VzIHRoZSBpbnB1dCB3aGVuIGl0IGlzIGRpc3BsYXllZCBvbiBzY3JlZW4uXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB7XG5cbiAgICBib3VuZDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZWxlbWVudCA9IHRoaXMuZWxlbWVudDtcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIGVsZW1lbnQuZm9jdXMoKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICB9O1xufTtcbiIsIi8qKlxuICogQXV0b21hdGljYWxseSBzZWxlY3RzIHRoZSBjb250ZW50cyBvZiBhbiBpbnB1dCB3aGVuIGl0IHJlY2VpdmVzIGZvY3VzLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4ge1xuXG4gICAgY3JlYXRlZDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZm9jdXNlZCwgbW91c2VFdmVudDtcblxuICAgICAgdGhpcy5lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBVc2UgbWF0Y2hlcyBzaW5jZSBkb2N1bWVudC5hY3RpdmVFbGVtZW50IGRvZXNuJ3Qgd29yayB3ZWxsIHdpdGggd2ViIGNvbXBvbmVudHMgKGZ1dHVyZSBjb21wYXQpXG4gICAgICAgIGZvY3VzZWQgPSB0aGlzLm1hdGNoZXMoJzpmb2N1cycpO1xuICAgICAgICBtb3VzZUV2ZW50ID0gdHJ1ZTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignZm9jdXMnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKCFtb3VzZUV2ZW50KSB7XG4gICAgICAgICAgdGhpcy5zZWxlY3QoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICghZm9jdXNlZCkge1xuICAgICAgICAgIHRoaXMuc2VsZWN0KCk7XG4gICAgICAgIH1cbiAgICAgICAgbW91c2VFdmVudCA9IGZhbHNlO1xuICAgICAgfSk7XG4gICAgfVxuXG4gIH07XG59O1xuIiwiLyoqXG4gKiBBIGJpbmRlciB0aGF0IGFkZHMgY2xhc3NlcyB0byBhbiBlbGVtZW50IGRlcGVuZGVudCBvbiB3aGV0aGVyIHRoZSBleHByZXNzaW9uIGlzIHRydWUgb3IgZmFsc2UuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSkge1xuICAgICAgdGhpcy5lbGVtZW50LmNsYXNzTGlzdC5hZGQodGhpcy5tYXRjaCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKHRoaXMubWF0Y2gpO1xuICAgIH1cbiAgfTtcbn07XG4iLCJ2YXIgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG5cbi8qKlxuICogQW4gZWxlbWVudCBiaW5kZXIgdGhhdCBiaW5kcyB0aGUgdGVtcGxhdGUgb24gdGhlIGRlZmluaXRpb24gdG8gZmlsbCB0aGUgY29udGVudHMgb2YgdGhlIGVsZW1lbnQgdGhhdCBtYXRjaGVzLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGRlZmluaXRpb24pIHtcbiAgdmFyIGRlZmluaXRpb25zID0gc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuXG4gIGlmICghZGVmaW5pdGlvbikge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ011c3QgcHJvdmlkZSBhIGRlZmluaXRpb24gb2JqZWN0IHRvIGRlZmluZSB0aGUgY3VzdG9tIGNvbXBvbmVudCcpO1xuICB9XG5cbiAgLy8gVGhlIGxhc3QgZGVmaW5pdGlvbiBpcyB0aGUgbW9zdCBpbXBvcnRhbnQsIGFueSBvdGhlcnMgYXJlIG1peGluc1xuICBkZWZpbml0aW9uID0gZGVmaW5pdGlvbnNbZGVmaW5pdGlvbnMubGVuZ3RoIC0gMV07XG5cbiAgcmV0dXJuIHtcblxuICAgIGNvbXBpbGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIGlmIChkZWZpbml0aW9uLnRlbXBsYXRlICYmICFkZWZpbml0aW9uLnRlbXBsYXRlLnBvb2wpIHtcbiAgICAgICAgZGVmaW5pdGlvbi50ZW1wbGF0ZSA9IHRoaXMuZnJhZ21lbnRzLmNyZWF0ZVRlbXBsYXRlKGRlZmluaXRpb24udGVtcGxhdGUpO1xuICAgICAgfVxuXG4gICAgICBpZiAoZGVmaW5pdGlvbi50ZW1wbGF0ZSkge1xuICAgICAgICB0aGlzLnRlbXBsYXRlID0gZGVmaW5pdGlvbi50ZW1wbGF0ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuZWxlbWVudC5jaGlsZE5vZGVzLmxlbmd0aCkge1xuICAgICAgICAvLyBVc2UgdGhlIGNvbnRlbnRzIG9mIHRoaXMgY29tcG9uZW50IHRvIGJlIGluc2VydGVkIHdpdGhpbiBpdFxuICAgICAgICB0aGlzLmNvbnRlbnRUZW1wbGF0ZSA9IHRoaXMuZnJhZ21lbnRzLmNyZWF0ZVRlbXBsYXRlKHRoaXMuZWxlbWVudC5jaGlsZE5vZGVzKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgY3JlYXRlZDogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAodGhpcy5jb250ZW50VGVtcGxhdGUpIHtcbiAgICAgICAgdGhpcy5jb250ZW50ID0gdGhpcy5jb250ZW50VGVtcGxhdGUuY3JlYXRlVmlldygpO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy50ZW1wbGF0ZSkge1xuICAgICAgICB0aGlzLnZpZXcgPSB0aGlzLnRlbXBsYXRlLmNyZWF0ZVZpZXcoKTtcbiAgICAgICAgdGhpcy5lbGVtZW50LmFwcGVuZENoaWxkKHRoaXMudmlldyk7XG4gICAgICAgIGlmICh0aGlzLmNvbnRlbnQpIHtcbiAgICAgICAgICB0aGlzLl9jb21wb25lbnRDb250ZW50ID0gdGhpcy5jb250ZW50O1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuY29udGVudCkge1xuICAgICAgICB0aGlzLmVsZW1lbnQuYXBwZW5kQ2hpbGQodGhpcy5jb250ZW50KTtcbiAgICAgIH1cblxuICAgICAgZGVmaW5pdGlvbnMuZm9yRWFjaChmdW5jdGlvbihkZWZpbml0aW9uKSB7XG4gICAgICAgIE9iamVjdC5rZXlzKGRlZmluaXRpb24pLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgICAgdGhpcy5lbGVtZW50W2tleV0gPSBkZWZpbml0aW9uW2tleV07XG4gICAgICAgIH0sIHRoaXMpO1xuICAgICAgfSwgdGhpcyk7XG5cbiAgICAgIC8vIERvbid0IGNhbGwgY3JlYXRlZCB1bnRpbCBhZnRlciBhbGwgZGVmaW5pdGlvbnMgaGF2ZSBiZWVuIGNvcGllZCBvdmVyXG4gICAgICBkZWZpbml0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uKGRlZmluaXRpb24pIHtcbiAgICAgICAgaWYgKHR5cGVvZiBkZWZpbml0aW9uLmNyZWF0ZWQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBkZWZpbml0aW9uLmNyZWF0ZWQuY2FsbCh0aGlzLmVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgICB9LCB0aGlzKTtcbiAgICB9LFxuXG4gICAgYm91bmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHRoaXMudmlldykgdGhpcy52aWV3LmJpbmQodGhpcy5lbGVtZW50KTtcbiAgICAgIGlmICh0aGlzLmNvbnRlbnQpIHRoaXMuY29udGVudC5iaW5kKHRoaXMuY29udGV4dCk7XG5cbiAgICAgIGRlZmluaXRpb25zLmZvckVhY2goZnVuY3Rpb24oZGVmaW5pdGlvbikge1xuICAgICAgICBpZiAodHlwZW9mIGRlZmluaXRpb24uYXR0YWNoZWQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBkZWZpbml0aW9uLmF0dGFjaGVkLmNhbGwodGhpcy5lbGVtZW50KTtcbiAgICAgICAgfVxuICAgICAgfSwgdGhpcyk7XG4gICAgfSxcblxuICAgIHVuYm91bmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHRoaXMuY29udGVudCkgdGhpcy5jb250ZW50LnVuYmluZCgpO1xuICAgICAgaWYgKHRoaXMudmlldykgdGhpcy52aWV3LnVuYmluZCgpO1xuXG4gICAgICBkZWZpbml0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uKGRlZmluaXRpb24pIHtcbiAgICAgICAgaWYgKHR5cGVvZiBkZWZpbml0aW9uLmRldGFjaGVkID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgZGVmaW5pdGlvbi5kZXRhY2hlZC5jYWxsKHRoaXMuZWxlbWVudCk7XG4gICAgICAgIH1cbiAgICAgIH0sIHRoaXMpO1xuICAgIH1cbiAgfTtcbn07XG4iLCIvKipcbiAqIEEgYmluZGVyIGZvciBhZGRpbmcgZXZlbnQgbGlzdGVuZXJzLiBXaGVuIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQgdGhlIGV4cHJlc3Npb24gd2lsbCBiZSBleGVjdXRlZC4gVGhlIHByb3BlcnRpZXNcbiAqIGBldmVudGAgKHRoZSBldmVudCBvYmplY3QpIGFuZCBgZWxlbWVudGAgKHRoZSBlbGVtZW50IHRoZSBiaW5kZXIgaXMgb24pIHdpbGwgYmUgYXZhaWxhYmxlIHRvIHRoZSBleHByZXNzaW9uLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHNwZWNpZmljRXZlbnROYW1lKSB7XG4gIHJldHVybiB7XG4gICAgY3JlYXRlZDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZXZlbnROYW1lID0gc3BlY2lmaWNFdmVudE5hbWUgfHwgdGhpcy5tYXRjaDtcbiAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAgIHRoaXMuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgaWYgKF90aGlzLnNob3VsZFNraXAoZXZlbnQpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IHRoZSBldmVudCBvbiB0aGUgY29udGV4dCBzbyBpdCBtYXkgYmUgdXNlZCBpbiB0aGUgZXhwcmVzc2lvbiB3aGVuIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICAgIHZhciBwcmlvckV2ZW50ID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihfdGhpcy5jb250ZXh0LCAnZXZlbnQnKTtcbiAgICAgICAgdmFyIHByaW9yRWxlbWVudCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IoX3RoaXMuY29udGV4dCwgJ2VsZW1lbnQnKTtcbiAgICAgICAgX3RoaXMuc2V0RXZlbnQoZXZlbnQsIHByaW9yRXZlbnQsIHByaW9yRWxlbWVudCk7XG5cbiAgICAgICAgLy8gTGV0IGFuIGV2ZW50IGJpbmRlciBtYWtlIHRoZSBmdW5jdGlvbiBjYWxsIHdpdGggaXRzIG93biBhcmd1bWVudHNcbiAgICAgICAgX3RoaXMub2JzZXJ2ZXIuZ2V0KCk7XG5cbiAgICAgICAgLy8gUmVzZXQgdGhlIGNvbnRleHQgdG8gaXRzIHByaW9yIHN0YXRlXG4gICAgICAgIF90aGlzLmNsZWFyRXZlbnQoKTtcbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBzaG91bGRTa2lwOiBmdW5jdGlvbihldmVudCkge1xuICAgICAgcmV0dXJuICF0aGlzLmNvbnRleHQgfHwgZXZlbnQuY3VycmVudFRhcmdldC5oYXNBdHRyaWJ1dGUoJ2Rpc2FibGVkJyk7XG4gICAgfSxcblxuICAgIHVuYm91bmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5jbGVhckV2ZW50KCk7XG4gICAgfSxcblxuICAgIHNldEV2ZW50OiBmdW5jdGlvbihldmVudCwgcHJpb3JFdmVudERlc2NyaXB0b3IsIHByaW9yRWxlbWVudERlc2NyaXB0b3IpIHtcbiAgICAgIGlmICghdGhpcy5jb250ZXh0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMuZXZlbnQgPSBldmVudDtcbiAgICAgIHRoaXMucHJpb3JFdmVudERlc2NyaXB0b3IgPSBwcmlvckV2ZW50RGVzY3JpcHRvcjtcbiAgICAgIHRoaXMucHJpb3JFbGVtZW50RGVzY3JpcHRvciA9IHByaW9yRWxlbWVudERlc2NyaXB0b3I7XG4gICAgICB0aGlzLmxhc3RDb250ZXh0ID0gdGhpcy5jb250ZXh0O1xuXG4gICAgICB0aGlzLmNvbnRleHQuZXZlbnQgPSBldmVudDtcbiAgICAgIHRoaXMuY29udGV4dC5lbGVtZW50ID0gdGhpcy5lbGVtZW50O1xuICAgIH0sXG5cbiAgICBjbGVhckV2ZW50OiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICghdGhpcy5ldmVudCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIgY29udGV4dCA9IHRoaXMubGFzdENvbnRleHQ7XG5cbiAgICAgIGlmICh0aGlzLnByaW9yRXZlbnREZXNjcmlwdG9yKSB7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShjb250ZXh0LCAnZXZlbnQnLCB0aGlzLnByaW9yRXZlbnREZXNjcmlwdG9yKTtcbiAgICAgICAgdGhpcy5wcmlvckV2ZW50RGVzY3JpcHRvciA9IG51bGw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZWxldGUgY29udGV4dC5ldmVudDtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMucHJpb3JFbGVtZW50RGVzY3JpcHRvcikge1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoY29udGV4dCwgJ2VsZW1lbnQnLCB0aGlzLnByaW9yRWxlbWVudERlc2NyaXB0b3IpO1xuICAgICAgICB0aGlzLnByaW9yRWxlbWVudERlc2NyaXB0b3IgPSBudWxsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVsZXRlIGNvbnRleHQuZWxlbWVudDtcbiAgICAgIH1cblxuICAgICAgdGhpcy5ldmVudCA9IG51bGw7XG4gICAgICB0aGlzLmxhc3RDb250ZXh0ID0gbnVsbDtcbiAgICB9XG4gIH07XG59O1xuIiwiLyoqXG4gKiBBIGJpbmRlciB0aGF0IGRpc3BsYXlzIHVuZXNjYXBlZCBIVE1MIGluc2lkZSBhbiBlbGVtZW50LiBCZSBzdXJlIGl0J3MgdHJ1c3RlZCEgVGhpcyBzaG91bGQgYmUgdXNlZCB3aXRoIGZvcm1hdHRlcnNcbiAqIHdoaWNoIGNyZWF0ZSBIVE1MIGZyb20gc29tZXRoaW5nIHNhZmUuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHRoaXMuZWxlbWVudC5pbm5lckhUTUwgPSAodmFsdWUgPT0gbnVsbCA/ICcnIDogdmFsdWUpO1xuICB9O1xufTtcbiIsIi8qKlxuICogaWYsIHVubGVzcywgZWxzZS1pZiwgZWxzZS11bmxlc3MsIGVsc2VcbiAqIEEgYmluZGVyIGluaXQgZnVuY3Rpb24gdGhhdCBjcmVhdGVzIGEgYmluZGVyIHRoYXQgc2hvd3Mgb3IgaGlkZXMgdGhlIGVsZW1lbnQgaWYgdGhlIHZhbHVlIGlzIHRydXRoeSBvciBmYWxzZXkuXG4gKiBBY3R1YWxseSByZW1vdmVzIHRoZSBlbGVtZW50IGZyb20gdGhlIERPTSB3aGVuIGhpZGRlbiwgcmVwbGFjaW5nIGl0IHdpdGggYSBub24tdmlzaWJsZSBwbGFjZWhvbGRlciBhbmQgbm90IG5lZWRsZXNzbHlcbiAqIGV4ZWN1dGluZyBiaW5kaW5ncyBpbnNpZGUuIFBhc3MgaW4gdGhlIGNvbmZpZ3VyYXRpb24gdmFsdWVzIGZvciB0aGUgY29ycmVzcG9uZGluZyBwYXJ0bmVyIGF0dHJpYnV0ZXMgZm9yIHVubGVzcyBhbmRcbiAqIGVsc2UsIGV0Yy5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihlbHNlSWZBdHRyTmFtZSwgZWxzZUF0dHJOYW1lLCB1bmxlc3NBdHRyTmFtZSwgZWxzZVVubGVzc0F0dHJOYW1lKSB7XG4gIHJldHVybiB7XG4gICAgYW5pbWF0ZWQ6IHRydWUsXG4gICAgcHJpb3JpdHk6IDE1MCxcblxuICAgIGNvbXBpbGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBlbGVtZW50ID0gdGhpcy5lbGVtZW50O1xuICAgICAgdmFyIGV4cHJlc3Npb25zID0gWyB3cmFwSWZFeHAodGhpcy5leHByZXNzaW9uLCB0aGlzLm5hbWUgPT09IHVubGVzc0F0dHJOYW1lKSBdO1xuICAgICAgdmFyIHBsYWNlaG9sZGVyID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICAgICAgdmFyIG5vZGUgPSBlbGVtZW50Lm5leHRFbGVtZW50U2libGluZztcbiAgICAgIHRoaXMuZWxlbWVudCA9IHBsYWNlaG9sZGVyO1xuICAgICAgZWxlbWVudC5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChwbGFjZWhvbGRlciwgZWxlbWVudCk7XG5cbiAgICAgIC8vIFN0b3JlcyBhIHRlbXBsYXRlIGZvciBhbGwgdGhlIGVsZW1lbnRzIHRoYXQgY2FuIGdvIGludG8gdGhpcyBzcG90XG4gICAgICB0aGlzLnRlbXBsYXRlcyA9IFsgdGhpcy5mcmFnbWVudHMuY3JlYXRlVGVtcGxhdGUoZWxlbWVudCkgXTtcblxuICAgICAgLy8gUHVsbCBvdXQgYW55IG90aGVyIGVsZW1lbnRzIHRoYXQgYXJlIGNoYWluZWQgd2l0aCB0aGlzIG9uZVxuICAgICAgd2hpbGUgKG5vZGUpIHtcbiAgICAgICAgdmFyIG5leHQgPSBub2RlLm5leHRFbGVtZW50U2libGluZztcbiAgICAgICAgdmFyIGV4cHJlc3Npb247XG4gICAgICAgIGlmIChub2RlLmhhc0F0dHJpYnV0ZShlbHNlSWZBdHRyTmFtZSkpIHtcbiAgICAgICAgICBleHByZXNzaW9uID0gdGhpcy5mcmFnbWVudHMuY29kaWZ5RXhwcmVzc2lvbignYXR0cmlidXRlJywgbm9kZS5nZXRBdHRyaWJ1dGUoZWxzZUlmQXR0ck5hbWUpKTtcbiAgICAgICAgICBleHByZXNzaW9ucy5wdXNoKHdyYXBJZkV4cChleHByZXNzaW9uLCBmYWxzZSkpO1xuICAgICAgICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKGVsc2VJZkF0dHJOYW1lKTtcbiAgICAgICAgfSBlbHNlIGlmIChub2RlLmhhc0F0dHJpYnV0ZShlbHNlVW5sZXNzQXR0ck5hbWUpKSB7XG4gICAgICAgICAgZXhwcmVzc2lvbiA9IHRoaXMuZnJhZ21lbnRzLmNvZGlmeUV4cHJlc3Npb24oJ2F0dHJpYnV0ZScsIG5vZGUuZ2V0QXR0cmlidXRlKGVsc2VVbmxlc3NBdHRyTmFtZSkpO1xuICAgICAgICAgIGV4cHJlc3Npb25zLnB1c2god3JhcElmRXhwKGV4cHJlc3Npb24sIHRydWUpKTtcbiAgICAgICAgICBub2RlLnJlbW92ZUF0dHJpYnV0ZShlbHNlVW5sZXNzQXR0ck5hbWUpO1xuICAgICAgICB9IGVsc2UgaWYgKG5vZGUuaGFzQXR0cmlidXRlKGVsc2VBdHRyTmFtZSkpIHtcbiAgICAgICAgICBub2RlLnJlbW92ZUF0dHJpYnV0ZShlbHNlQXR0ck5hbWUpO1xuICAgICAgICAgIG5leHQgPSBudWxsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgbm9kZS5yZW1vdmUoKTtcbiAgICAgICAgdGhpcy50ZW1wbGF0ZXMucHVzaCh0aGlzLmZyYWdtZW50cy5jcmVhdGVUZW1wbGF0ZShub2RlKSk7XG4gICAgICAgIG5vZGUgPSBuZXh0O1xuICAgICAgfVxuXG4gICAgICAvLyBBbiBleHByZXNzaW9uIHRoYXQgd2lsbCByZXR1cm4gYW4gaW5kZXguIFNvbWV0aGluZyBsaWtlIHRoaXMgYGV4cHIgPyAwIDogZXhwcjIgPyAxIDogZXhwcjMgPyAyIDogM2AuIFRoaXMgd2lsbFxuICAgICAgLy8gYmUgdXNlZCB0byBrbm93IHdoaWNoIHNlY3Rpb24gdG8gc2hvdyBpbiB0aGUgaWYvZWxzZS1pZi9lbHNlIGdyb3VwaW5nLlxuICAgICAgdGhpcy5leHByZXNzaW9uID0gZXhwcmVzc2lvbnMubWFwKGZ1bmN0aW9uKGV4cHIsIGluZGV4KSB7XG4gICAgICAgIHJldHVybiBleHByICsgJyA/ICcgKyBpbmRleCArICcgOiAnO1xuICAgICAgfSkuam9pbignJykgKyBleHByZXNzaW9ucy5sZW5ndGg7XG4gICAgfSxcblxuICAgIHVwZGF0ZWQ6IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICAvLyBGb3IgcGVyZm9ybWFuY2UgcHJvdmlkZSBhbiBhbHRlcm5hdGUgY29kZSBwYXRoIGZvciBhbmltYXRpb25cbiAgICAgIGlmICh0aGlzLmFuaW1hdGUgJiYgdGhpcy5jb250ZXh0ICYmICF0aGlzLmZpcnN0VXBkYXRlKSB7XG4gICAgICAgIHRoaXMudXBkYXRlZEFuaW1hdGVkKGluZGV4KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMudXBkYXRlZFJlZ3VsYXIoaW5kZXgpO1xuICAgICAgfVxuICAgICAgdGhpcy5maXJzdFVwZGF0ZSA9IGZhbHNlO1xuICAgIH0sXG5cbiAgICBhZGQ6IGZ1bmN0aW9uKHZpZXcpIHtcbiAgICAgIHRoaXMuZWxlbWVudC5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh2aWV3LCB0aGlzLmVsZW1lbnQubmV4dFNpYmxpbmcpO1xuICAgIH0sXG5cbiAgICAvLyBEb2Vzbid0IGRvIG11Y2gsIGJ1dCBhbGxvd3Mgc3ViLWNsYXNzZXMgdG8gYWx0ZXIgdGhlIGZ1bmN0aW9uYWxpdHkuXG4gICAgcmVtb3ZlOiBmdW5jdGlvbih2aWV3KSB7XG4gICAgICB2aWV3LmRpc3Bvc2UoKTtcbiAgICB9LFxuXG4gICAgdXBkYXRlZFJlZ3VsYXI6IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICBpZiAodGhpcy5zaG93aW5nKSB7XG4gICAgICAgIHRoaXMucmVtb3ZlKHRoaXMuc2hvd2luZyk7XG4gICAgICAgIHRoaXMuc2hvd2luZyA9IG51bGw7XG4gICAgICB9XG4gICAgICB2YXIgdGVtcGxhdGUgPSB0aGlzLnRlbXBsYXRlc1tpbmRleF07XG4gICAgICBpZiAodGVtcGxhdGUpIHtcbiAgICAgICAgdGhpcy5zaG93aW5nID0gdGVtcGxhdGUuY3JlYXRlVmlldygpO1xuICAgICAgICB0aGlzLnNob3dpbmcuYmluZCh0aGlzLmNvbnRleHQpO1xuICAgICAgICB0aGlzLmFkZCh0aGlzLnNob3dpbmcpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICB1cGRhdGVkQW5pbWF0ZWQ6IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICB0aGlzLmxhc3RWYWx1ZSA9IGluZGV4O1xuICAgICAgaWYgKHRoaXMuYW5pbWF0aW5nKSB7XG4gICAgICAgIC8vIE9ic29sZXRlZCwgd2lsbCBjaGFuZ2UgYWZ0ZXIgYW5pbWF0aW9uIGlzIGZpbmlzaGVkLlxuICAgICAgICB0aGlzLnNob3dpbmcudW5iaW5kKCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuc2hvd2luZykge1xuICAgICAgICB0aGlzLmFuaW1hdGluZyA9IHRydWU7XG4gICAgICAgIHRoaXMuc2hvd2luZy51bmJpbmQoKTtcbiAgICAgICAgdGhpcy5hbmltYXRlT3V0KHRoaXMuc2hvd2luZywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdGhpcy5hbmltYXRpbmcgPSBmYWxzZTtcblxuICAgICAgICAgIGlmICh0aGlzLnNob3dpbmcpIHtcbiAgICAgICAgICAgIC8vIE1ha2Ugc3VyZSB0aGlzIHdhc24ndCB1bmJvdW5kIHdoaWxlIHdlIHdlcmUgYW5pbWF0aW5nIChlLmcuIGJ5IGEgcGFyZW50IGBpZmAgdGhhdCBkb2Vzbid0IGFuaW1hdGUpXG4gICAgICAgICAgICB0aGlzLnJlbW92ZSh0aGlzLnNob3dpbmcpO1xuICAgICAgICAgICAgdGhpcy5zaG93aW5nID0gbnVsbDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAodGhpcy5jb250ZXh0KSB7XG4gICAgICAgICAgICAvLyBmaW5pc2ggYnkgYW5pbWF0aW5nIHRoZSBuZXcgZWxlbWVudCBpbiAoaWYgYW55KSwgdW5sZXNzIG5vIGxvbmdlciBib3VuZFxuICAgICAgICAgICAgdGhpcy51cGRhdGVkQW5pbWF0ZWQodGhpcy5sYXN0VmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIHRlbXBsYXRlID0gdGhpcy50ZW1wbGF0ZXNbaW5kZXhdO1xuICAgICAgaWYgKHRlbXBsYXRlKSB7XG4gICAgICAgIHRoaXMuc2hvd2luZyA9IHRlbXBsYXRlLmNyZWF0ZVZpZXcoKTtcbiAgICAgICAgdGhpcy5zaG93aW5nLmJpbmQodGhpcy5jb250ZXh0KTtcbiAgICAgICAgdGhpcy5hZGQodGhpcy5zaG93aW5nKTtcbiAgICAgICAgdGhpcy5hbmltYXRpbmcgPSB0cnVlO1xuICAgICAgICB0aGlzLmFuaW1hdGVJbih0aGlzLnNob3dpbmcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHRoaXMuYW5pbWF0aW5nID0gZmFsc2U7XG4gICAgICAgICAgLy8gaWYgdGhlIHZhbHVlIGNoYW5nZWQgd2hpbGUgdGhpcyB3YXMgYW5pbWF0aW5nIHJ1biBpdCBhZ2FpblxuICAgICAgICAgIGlmICh0aGlzLmxhc3RWYWx1ZSAhPT0gaW5kZXgpIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlZEFuaW1hdGVkKHRoaXMubGFzdFZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBib3VuZDogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmZpcnN0VXBkYXRlID0gdHJ1ZTtcbiAgICB9LFxuXG4gICAgdW5ib3VuZDogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAodGhpcy5zaG93aW5nKSB7XG4gICAgICAgIHRoaXMuc2hvd2luZy51bmJpbmQoKTtcbiAgICAgIH1cbiAgICAgIHRoaXMubGFzdFZhbHVlID0gbnVsbDtcbiAgICAgIHRoaXMuYW5pbWF0aW5nID0gZmFsc2U7XG4gICAgfVxuICB9O1xufTtcblxuZnVuY3Rpb24gd3JhcElmRXhwKGV4cHIsIGlzVW5sZXNzKSB7XG4gIGlmIChpc1VubGVzcykge1xuICAgIHJldHVybiAnISgnICsgZXhwciArICcpJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZXhwcjtcbiAgfVxufVxuIiwidmFyIGtleXMgPSB7XG4gIGJhY2tzcGFjZTogOCxcbiAgdGFiOiA5LFxuICBlbnRlcjogMTMsXG4gIHJldHVybjogMTMsXG4gIGVzYzogMjcsXG4gIGVzY2FwZTogMjcsXG4gIHNwYWNlOiAzMixcbiAgbGVmdDogMzcsXG4gIHVwOiAzOCxcbiAgcmlnaHQ6IDM5LFxuICBkb3duOiA0MCxcbiAgZGVsOiA0NixcbiAgZGVsZXRlOiA0NlxufTtcblxuLyoqXG4gKiBBZGRzIGEgYmluZGVyIHdoaWNoIGlzIHRyaWdnZXJlZCB3aGVuIGEga2V5Ym9hcmQgZXZlbnQncyBga2V5Q29kZWAgcHJvcGVydHkgbWF0Y2hlcyBmb3IgdGhlIGFib3ZlIGxpc3Qgb2Yga2V5cy4gSWZcbiAqIG1vcmUgcm9idXN0IHNob3J0Y3V0cyBhcmUgcmVxdWlyZWQgdXNlIHRoZSBzaG9ydGN1dCBiaW5kZXIuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc3BlY2lmaWNLZXlOYW1lLCBzcGVjaWZpY0V2ZW50TmFtZSkge1xuICB2YXIgZXZlbnRCaW5kZXIgPSByZXF1aXJlKCcuL2V2ZW50cycpKHNwZWNpZmljRXZlbnROYW1lKTtcblxuICByZXR1cm4ge1xuICAgIGNvbXBpbGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIC8vIFNwbGl0IG9uIG5vbi1jaGFyIChlLmcuIGtleWRvd246OmVudGVyIG9yIGtleXVwLmVzYyB0byBoYW5kbGUgdmFyaW91cyBzdHlsZXMpXG4gICAgICB2YXIgcGFydHMgPSAoc3BlY2lmaWNLZXlOYW1lIHx8IHRoaXMubWF0Y2gpLnNwbGl0KC9bXmEtel0rLyk7XG4gICAgICBpZiAodGhpcy5lbGVtZW50Lmhhc093blByb3BlcnR5KCdvbicgKyBwYXJ0c1swXSkpIHtcbiAgICAgICAgdGhpcy5tYXRjaCA9IHBhcnRzLnNoaWZ0KCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLm1hdGNoID0gJ2tleWRvd24nO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmN0cmxLZXkgPSBwYXJ0c1swXSA9PT0gJ2N0cmwnO1xuXG4gICAgICBpZiAodGhpcy5jdHJsS2V5KSB7XG4gICAgICAgIHRoaXMua2V5Q29kZSA9IGtleXNbcGFydHNbMV1dO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5rZXlDb2RlID0ga2V5c1twYXJ0c1swXV07XG4gICAgICB9XG4gICAgfSxcblxuICAgIHNob3VsZFNraXA6IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICBpZiAodGhpcy5rZXlDb2RlKSB7XG4gICAgICAgIHJldHVybiBldmVudEJpbmRlci5zaG91bGRTa2lwLmNhbGwodGhpcywgZXZlbnQpIHx8XG4gICAgICAgICAgdGhpcy5jdHJsS2V5ICE9PSAoZXZlbnQuY3RybEtleSB8fCBldmVudC5tZXRhS2V5KSB8fFxuICAgICAgICAgIHRoaXMua2V5Q29kZSAhPT0gZXZlbnQua2V5Q29kZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBldmVudEJpbmRlci5zaG91bGRTa2lwLmNhbGwodGhpcywgZXZlbnQpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBjcmVhdGVkOiBldmVudEJpbmRlci5jcmVhdGVkLFxuICAgIHVuYm91bmQ6IGV2ZW50QmluZGVyLnVuYm91bmQsXG4gICAgc2V0RXZlbnQ6IGV2ZW50QmluZGVyLnNldEV2ZW50LFxuICAgIGNsZWFyRXZlbnQ6IGV2ZW50QmluZGVyLmNsZWFyRXZlbnRcbiAgfTtcbn07XG4iLCIvKipcbiAqIEEgYmluZGVyIHRoYXQgcHJpbnRzIG91dCB0aGUgdmFsdWUgb2YgdGhlIGV4cHJlc3Npb24gdG8gdGhlIGNvbnNvbGUuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB7XG4gICAgcHJpb3JpdHk6IDYwLFxuICAgIGNyZWF0ZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHRoaXMub2JzZXJ2ZXIpIHtcbiAgICAgICAgdGhpcy5vYnNlcnZlci5nZXRDaGFuZ2VSZWNvcmRzID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgdXBkYXRlZDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIC8qZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuICAgICAgY29uc29sZS5sb2coJyVjRGVidWc6ICVjJyArIHRoaXMuZXhwcmVzc2lvbiwgJ2NvbG9yOmJsdWU7Zm9udC13ZWlnaHQ6Ym9sZCcsICdjb2xvcjojREY4MTM4JywgJz0nLCB2YWx1ZSk7XG4gICAgICAvKmVzbGludC1lbmFibGUgKi9cbiAgICB9XG4gIH07XG59O1xuIiwiLyoqXG4gKiBBIGJpbmRlciB0aGF0IHNldHMgdGhlIHByb3BlcnR5IG9mIGFuIGVsZW1lbnQgdG8gdGhlIHZhbHVlIG9mIHRoZSBleHByZXNzaW9uIGluIGEgMi13YXkgYmluZGluZy5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzcGVjaWZpY1Byb3BlcnR5TmFtZSkge1xuICByZXR1cm4ge1xuICAgIHByaW9yaXR5OiAxMCxcblxuICAgIGNyZWF0ZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy50d29XYXlPYnNlcnZlciA9IHRoaXMub2JzZXJ2ZShzcGVjaWZpY1Byb3BlcnR5TmFtZSB8fCB0aGlzLmNhbWVsQ2FzZSwgdGhpcy5zZW5kVXBkYXRlLCB0aGlzKTtcbiAgICB9LFxuXG4gICAgLy8gQmluZCB0aGlzIHRvIHRoZSBnaXZlbiBjb250ZXh0IG9iamVjdFxuICAgIGJvdW5kOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMudHdvV2F5T2JzZXJ2ZXIuYmluZCh0aGlzLmVsZW1lbnQpO1xuICAgIH0sXG5cbiAgICB1bmJvdW5kOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMudHdvV2F5T2JzZXJ2ZXIudW5iaW5kKCk7XG4gICAgfSxcblxuICAgIHNlbmRVcGRhdGU6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBpZiAoIXRoaXMuc2tpcFNlbmQpIHtcbiAgICAgICAgdGhpcy5vYnNlcnZlci5zZXQodmFsdWUpO1xuICAgICAgICB0aGlzLnNraXBTZW5kID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5mcmFnbWVudHMuYWZ0ZXJTeW5jKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHRoaXMuc2tpcFNlbmQgPSBmYWxzZTtcbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgdXBkYXRlZDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGlmICghdGhpcy5za2lwU2VuZCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuZWxlbWVudFtzcGVjaWZpY1Byb3BlcnR5TmFtZSB8fCB0aGlzLmNhbWVsQ2FzZV0gPSB2YWx1ZTtcbiAgICAgICAgdGhpcy5za2lwU2VuZCA9IHRydWU7XG4gICAgICAgIHRoaXMuZnJhZ21lbnRzLmFmdGVyU3luYyhmdW5jdGlvbigpIHtcbiAgICAgICAgICB0aGlzLnNraXBTZW5kID0gZmFsc2U7XG4gICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICB9XG4gICAgfVxuICB9O1xufTtcbiIsIi8qKlxuICogQSBiaW5kZXIgdGhhdCBzZXRzIHRoZSBwcm9wZXJ0eSBvZiBhbiBlbGVtZW50IHRvIHRoZSB2YWx1ZSBvZiB0aGUgZXhwcmVzc2lvbi5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzcGVjaWZpY1Byb3BlcnR5TmFtZSkge1xuICByZXR1cm4ge1xuICAgIHByaW9yaXR5OiAxMCxcblxuICAgIHVwZGF0ZWQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICB0aGlzLmVsZW1lbnRbc3BlY2lmaWNQcm9wZXJ0eU5hbWUgfHwgdGhpcy5jYW1lbENhc2VdID0gdmFsdWU7XG4gICAgfVxuICB9O1xufTtcbiIsIi8qKlxuICogQSBiaW5kZXIgdGhhdCBzZXRzIGEgcmVmZXJlbmNlIHRvIHRoZSBlbGVtZW50IHdoZW4gaXQgaXMgYm91bmQuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4ge1xuICAgIGJvdW5kOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuY29udGV4dFt0aGlzLm1hdGNoIHx8IHRoaXMuZXhwcmVzc2lvbl0gPSB0aGlzLmVsZW1lbnQ7XG4gICAgfSxcblxuICAgIHVuYm91bmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5jb250ZXh0W3RoaXMubWF0Y2ggfHwgdGhpcy5leHByZXNzaW9uXSA9IG51bGw7XG4gICAgfVxuICB9O1xufTtcbiIsInZhciBkaWZmID0gcmVxdWlyZSgnZGlmZmVyZW5jZXMtanMnKTtcblxuLyoqXG4gKiBBIGJpbmRlciB0aGF0IGR1cGxpY2F0ZSBhbiBlbGVtZW50IGZvciBlYWNoIGl0ZW0gaW4gYW4gYXJyYXkuIFRoZSBleHByZXNzaW9uIG1heSBiZSBvZiB0aGUgZm9ybWF0IGBlcHhyYCBvclxuICogYGl0ZW1OYW1lIGluIGV4cHJgIHdoZXJlIGBpdGVtTmFtZWAgaXMgdGhlIG5hbWUgZWFjaCBpdGVtIGluc2lkZSB0aGUgYXJyYXkgd2lsbCBiZSByZWZlcmVuY2VkIGJ5IHdpdGhpbiBiaW5kaW5nc1xuICogaW5zaWRlIHRoZSBlbGVtZW50LlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4ge1xuICAgIGFuaW1hdGVkOiB0cnVlLFxuICAgIHByaW9yaXR5OiAxMDAsXG5cbiAgICBjb21waWxlZDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcGFyZW50ID0gdGhpcy5lbGVtZW50LnBhcmVudE5vZGU7XG4gICAgICB2YXIgcGxhY2Vob2xkZXIgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKHBsYWNlaG9sZGVyLCB0aGlzLmVsZW1lbnQpO1xuICAgICAgdGhpcy50ZW1wbGF0ZSA9IHRoaXMuZnJhZ21lbnRzLmNyZWF0ZVRlbXBsYXRlKHRoaXMuZWxlbWVudCk7XG4gICAgICB0aGlzLmVsZW1lbnQgPSBwbGFjZWhvbGRlcjtcblxuICAgICAgdmFyIHBhcnRzID0gdGhpcy5leHByZXNzaW9uLnNwbGl0KC9cXHMraW5cXHMrfFxccytvZlxccysvKTtcbiAgICAgIHRoaXMuZXhwcmVzc2lvbiA9IHBhcnRzLnBvcCgpO1xuICAgICAgdmFyIGtleSA9IHBhcnRzLnBvcCgpO1xuICAgICAgaWYgKGtleSkge1xuICAgICAgICBwYXJ0cyA9IGtleS5zcGxpdCgvXFxzKixcXHMqLyk7XG4gICAgICAgIHRoaXMudmFsdWVOYW1lID0gcGFydHMucG9wKCk7XG4gICAgICAgIHRoaXMua2V5TmFtZSA9IHBhcnRzLnBvcCgpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBjcmVhdGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMudmlld3MgPSBbXTtcbiAgICAgIHRoaXMub2JzZXJ2ZXIuZ2V0Q2hhbmdlUmVjb3JkcyA9IHRydWU7XG4gICAgfSxcblxuICAgIHJlbW92ZVZpZXc6IGZ1bmN0aW9uKHZpZXcpIHtcbiAgICAgIHZpZXcuZGlzcG9zZSgpO1xuICAgICAgdmlldy5fcmVwZWF0SXRlbV8gPSBudWxsO1xuICAgIH0sXG5cbiAgICB1cGRhdGVkOiBmdW5jdGlvbih2YWx1ZSwgb2xkVmFsdWUsIGNoYW5nZXMpIHtcbiAgICAgIGlmICghY2hhbmdlcyB8fCAhdGhpcy5jb250ZXh0KSB7XG4gICAgICAgIHRoaXMucG9wdWxhdGUodmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHRoaXMuYW5pbWF0ZSkge1xuICAgICAgICAgIHRoaXMudXBkYXRlQ2hhbmdlc0FuaW1hdGVkKHZhbHVlLCBjaGFuZ2VzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnVwZGF0ZUNoYW5nZXModmFsdWUsIGNoYW5nZXMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcblxuICAgIC8vIE1ldGhvZCBmb3IgY3JlYXRpbmcgYW5kIHNldHRpbmcgdXAgbmV3IHZpZXdzIGZvciBvdXIgbGlzdFxuICAgIGNyZWF0ZVZpZXc6IGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcbiAgICAgIHZhciB2aWV3ID0gdGhpcy50ZW1wbGF0ZS5jcmVhdGVWaWV3KCk7XG4gICAgICB2YXIgY29udGV4dCA9IHZhbHVlO1xuICAgICAgaWYgKHRoaXMudmFsdWVOYW1lKSB7XG4gICAgICAgIGNvbnRleHQgPSBPYmplY3QuY3JlYXRlKHRoaXMuY29udGV4dCk7XG4gICAgICAgIGlmICh0aGlzLmtleU5hbWUpIGNvbnRleHRbdGhpcy5rZXlOYW1lXSA9IGtleTtcbiAgICAgICAgY29udGV4dFt0aGlzLnZhbHVlTmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgY29udGV4dC5fb3JpZ0NvbnRleHRfID0gdGhpcy5jb250ZXh0Lmhhc093blByb3BlcnR5KCdfb3JpZ0NvbnRleHRfJylcbiAgICAgICAgICA/IHRoaXMuY29udGV4dC5fb3JpZ0NvbnRleHRfXG4gICAgICAgICAgOiB0aGlzLmNvbnRleHQ7XG4gICAgICB9XG4gICAgICB2aWV3LmJpbmQoY29udGV4dCk7XG4gICAgICB2aWV3Ll9yZXBlYXRJdGVtXyA9IHZhbHVlO1xuICAgICAgcmV0dXJuIHZpZXc7XG4gICAgfSxcblxuICAgIHBvcHVsYXRlOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgaWYgKHRoaXMuYW5pbWF0aW5nKSB7XG4gICAgICAgIHRoaXMudmFsdWVXaGlsZUFuaW1hdGluZyA9IHZhbHVlO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLnZpZXdzLmxlbmd0aCkge1xuICAgICAgICB0aGlzLnZpZXdzLmZvckVhY2godGhpcy5yZW1vdmVWaWV3KTtcbiAgICAgICAgdGhpcy52aWV3cy5sZW5ndGggPSAwO1xuICAgICAgfVxuXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUubGVuZ3RoKSB7XG4gICAgICAgIHZhciBmcmFnID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuXG4gICAgICAgIHZhbHVlLmZvckVhY2goZnVuY3Rpb24oaXRlbSwgaW5kZXgpIHtcbiAgICAgICAgICB2YXIgdmlldyA9IHRoaXMuY3JlYXRlVmlldyhpbmRleCwgaXRlbSk7XG4gICAgICAgICAgdGhpcy52aWV3cy5wdXNoKHZpZXcpO1xuICAgICAgICAgIGZyYWcuYXBwZW5kQ2hpbGQodmlldyk7XG4gICAgICAgIH0sIHRoaXMpO1xuXG4gICAgICAgIHRoaXMuZWxlbWVudC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShmcmFnLCB0aGlzLmVsZW1lbnQubmV4dFNpYmxpbmcpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUaGlzIHVuLWFuaW1hdGVkIHZlcnNpb24gcmVtb3ZlcyBhbGwgcmVtb3ZlZCB2aWV3cyBmaXJzdCBzbyB0aGV5IGNhbiBiZSByZXR1cm5lZCB0byB0aGUgcG9vbCBhbmQgdGhlbiBhZGRzIG5ld1xuICAgICAqIHZpZXdzIGJhY2sgaW4uIFRoaXMgaXMgdGhlIG1vc3Qgb3B0aW1hbCBtZXRob2Qgd2hlbiBub3QgYW5pbWF0aW5nLlxuICAgICAqL1xuICAgIHVwZGF0ZUNoYW5nZXM6IGZ1bmN0aW9uKHZhbHVlLCBjaGFuZ2VzKSB7XG4gICAgICAvLyBSZW1vdmUgZXZlcnl0aGluZyBmaXJzdCwgdGhlbiBhZGQgYWdhaW4sIGFsbG93aW5nIGZvciBlbGVtZW50IHJldXNlIGZyb20gdGhlIHBvb2xcbiAgICAgIHZhciBhZGRlZENvdW50ID0gMDtcblxuICAgICAgY2hhbmdlcy5mb3JFYWNoKGZ1bmN0aW9uKHNwbGljZSkge1xuICAgICAgICBhZGRlZENvdW50ICs9IHNwbGljZS5hZGRlZENvdW50O1xuICAgICAgICBpZiAoIXNwbGljZS5yZW1vdmVkLmxlbmd0aCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcmVtb3ZlZCA9IHRoaXMudmlld3Muc3BsaWNlKHNwbGljZS5pbmRleCAtIGFkZGVkQ291bnQsIHNwbGljZS5yZW1vdmVkLmxlbmd0aCk7XG4gICAgICAgIHJlbW92ZWQuZm9yRWFjaCh0aGlzLnJlbW92ZVZpZXcpO1xuICAgICAgfSwgdGhpcyk7XG5cbiAgICAgIC8vIEFkZCB0aGUgbmV3L21vdmVkIHZpZXdzXG4gICAgICBjaGFuZ2VzLmZvckVhY2goZnVuY3Rpb24oc3BsaWNlKSB7XG4gICAgICAgIGlmICghc3BsaWNlLmFkZGVkQ291bnQpIHJldHVybjtcbiAgICAgICAgdmFyIGFkZGVkVmlld3MgPSBbXTtcbiAgICAgICAgdmFyIGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgICAgICB2YXIgaW5kZXggPSBzcGxpY2UuaW5kZXg7XG4gICAgICAgIHZhciBlbmRJbmRleCA9IGluZGV4ICsgc3BsaWNlLmFkZGVkQ291bnQ7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IGluZGV4OyBpIDwgZW5kSW5kZXg7IGkrKykge1xuICAgICAgICAgIHZhciBpdGVtID0gdmFsdWVbaV07XG4gICAgICAgICAgdmFyIHZpZXcgPSB0aGlzLmNyZWF0ZVZpZXcoaSwgaXRlbSk7XG4gICAgICAgICAgYWRkZWRWaWV3cy5wdXNoKHZpZXcpO1xuICAgICAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKHZpZXcpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudmlld3Muc3BsaWNlLmFwcGx5KHRoaXMudmlld3MsIFsgaW5kZXgsIDAgXS5jb25jYXQoYWRkZWRWaWV3cykpO1xuICAgICAgICB2YXIgcHJldmlvdXNWaWV3ID0gdGhpcy52aWV3c1tpbmRleCAtIDFdO1xuICAgICAgICB2YXIgbmV4dFNpYmxpbmcgPSBwcmV2aW91c1ZpZXcgPyBwcmV2aW91c1ZpZXcubGFzdFZpZXdOb2RlLm5leHRTaWJsaW5nIDogdGhpcy5lbGVtZW50Lm5leHRTaWJsaW5nO1xuICAgICAgICB0aGlzLmVsZW1lbnQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoZnJhZ21lbnQsIG5leHRTaWJsaW5nKTtcbiAgICAgIH0sIHRoaXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUaGlzIGFuaW1hdGVkIHZlcnNpb24gbXVzdCBhbmltYXRlIHJlbW92ZWQgbm9kZXMgb3V0IHdoaWxlIGFkZGVkIG5vZGVzIGFyZSBhbmltYXRpbmcgaW4gbWFraW5nIGl0IGxlc3Mgb3B0aW1hbFxuICAgICAqIChidXQgY29vbCBsb29raW5nKS4gSXQgYWxzbyBoYW5kbGVzIFwibW92ZVwiIGFuaW1hdGlvbnMgZm9yIG5vZGVzIHdoaWNoIGFyZSBtb3ZpbmcgcGxhY2Ugd2l0aGluIHRoZSBsaXN0LlxuICAgICAqL1xuICAgIHVwZGF0ZUNoYW5nZXNBbmltYXRlZDogZnVuY3Rpb24odmFsdWUsIGNoYW5nZXMpIHtcbiAgICAgIGlmICh0aGlzLmFuaW1hdGluZykge1xuICAgICAgICB0aGlzLnZhbHVlV2hpbGVBbmltYXRpbmcgPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIGFuaW1hdGluZ1ZhbHVlID0gdmFsdWUuc2xpY2UoKTtcbiAgICAgIHZhciBhbGxBZGRlZCA9IFtdO1xuICAgICAgdmFyIGFsbFJlbW92ZWQgPSBbXTtcbiAgICAgIHRoaXMuYW5pbWF0aW5nID0gdHJ1ZTtcblxuICAgICAgLy8gUnVuIHVwZGF0ZXMgd2hpY2ggb2NjdXJlZCB3aGlsZSB0aGlzIHdhcyBhbmltYXRpbmcuXG4gICAgICBmdW5jdGlvbiB3aGVuRG9uZSgpIHtcbiAgICAgICAgLy8gVGhlIGxhc3QgYW5pbWF0aW9uIGZpbmlzaGVkIHdpbGwgcnVuIHRoaXNcbiAgICAgICAgaWYgKC0td2hlbkRvbmUuY291bnQgIT09IDApIHJldHVybjtcblxuICAgICAgICBhbGxSZW1vdmVkLmZvckVhY2godGhpcy5yZW1vdmVWaWV3KTtcblxuICAgICAgICB0aGlzLmFuaW1hdGluZyA9IGZhbHNlO1xuICAgICAgICBpZiAodGhpcy52YWx1ZVdoaWxlQW5pbWF0aW5nKSB7XG4gICAgICAgICAgdmFyIGNoYW5nZXMgPSBkaWZmLmFycmF5cyh0aGlzLnZhbHVlV2hpbGVBbmltYXRpbmcsIGFuaW1hdGluZ1ZhbHVlKTtcbiAgICAgICAgICB0aGlzLnVwZGF0ZUNoYW5nZXNBbmltYXRlZCh0aGlzLnZhbHVlV2hpbGVBbmltYXRpbmcsIGNoYW5nZXMpO1xuICAgICAgICAgIHRoaXMudmFsdWVXaGlsZUFuaW1hdGluZyA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHdoZW5Eb25lLmNvdW50ID0gMDtcblxuICAgICAgY2hhbmdlcy5mb3JFYWNoKGZ1bmN0aW9uKHNwbGljZSkge1xuICAgICAgICB2YXIgYWRkZWRWaWV3cyA9IFtdO1xuICAgICAgICB2YXIgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgICAgIHZhciBpbmRleCA9IHNwbGljZS5pbmRleDtcbiAgICAgICAgdmFyIGVuZEluZGV4ID0gaW5kZXggKyBzcGxpY2UuYWRkZWRDb3VudDtcbiAgICAgICAgdmFyIHJlbW92ZWRDb3VudCA9IHNwbGljZS5yZW1vdmVkLmxlbmd0aDtcblxuICAgICAgICBmb3IgKHZhciBpID0gaW5kZXg7IGkgPCBlbmRJbmRleDsgaSsrKSB7XG4gICAgICAgICAgdmFyIGl0ZW0gPSB2YWx1ZVtpXTtcbiAgICAgICAgICB2YXIgdmlldyA9IHRoaXMuY3JlYXRlVmlldyhpLCBpdGVtKTtcbiAgICAgICAgICBhZGRlZFZpZXdzLnB1c2godmlldyk7XG4gICAgICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQodmlldyk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcmVtb3ZlZFZpZXdzID0gdGhpcy52aWV3cy5zcGxpY2UuYXBwbHkodGhpcy52aWV3cywgWyBpbmRleCwgcmVtb3ZlZENvdW50IF0uY29uY2F0KGFkZGVkVmlld3MpKTtcbiAgICAgICAgdmFyIHByZXZpb3VzVmlldyA9IHRoaXMudmlld3NbaW5kZXggLSAxXTtcbiAgICAgICAgdmFyIG5leHRTaWJsaW5nID0gcHJldmlvdXNWaWV3ID8gcHJldmlvdXNWaWV3Lmxhc3RWaWV3Tm9kZS5uZXh0U2libGluZyA6IHRoaXMuZWxlbWVudC5uZXh0U2libGluZztcbiAgICAgICAgdGhpcy5lbGVtZW50LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGZyYWdtZW50LCBuZXh0U2libGluZyk7XG5cbiAgICAgICAgYWxsQWRkZWQgPSBhbGxBZGRlZC5jb25jYXQoYWRkZWRWaWV3cyk7XG4gICAgICAgIGFsbFJlbW92ZWQgPSBhbGxSZW1vdmVkLmNvbmNhdChyZW1vdmVkVmlld3MpO1xuICAgICAgfSwgdGhpcyk7XG5cblxuICAgICAgYWxsQWRkZWQuZm9yRWFjaChmdW5jdGlvbih2aWV3KSB7XG4gICAgICAgIHdoZW5Eb25lLmNvdW50Kys7XG4gICAgICAgIHRoaXMuYW5pbWF0ZUluKHZpZXcsIHdoZW5Eb25lKTtcbiAgICAgIH0sIHRoaXMpO1xuXG4gICAgICBhbGxSZW1vdmVkLmZvckVhY2goZnVuY3Rpb24odmlldykge1xuICAgICAgICB3aGVuRG9uZS5jb3VudCsrO1xuICAgICAgICB2aWV3LnVuYmluZCgpO1xuICAgICAgICB0aGlzLmFuaW1hdGVPdXQodmlldywgd2hlbkRvbmUpO1xuICAgICAgfSwgdGhpcyk7XG4gICAgfSxcblxuICAgIHVuYm91bmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy52aWV3cy5mb3JFYWNoKGZ1bmN0aW9uKHZpZXcpIHtcbiAgICAgICAgdmlldy51bmJpbmQoKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy52YWx1ZVdoaWxlQW5pbWF0aW5nID0gbnVsbDtcbiAgICAgIHRoaXMuYW5pbWF0aW5nID0gZmFsc2U7XG4gICAgfVxuICB9O1xufTtcbiIsIi8qKlxuICogU2hvd3MvaGlkZXMgYW4gZWxlbWVudCBjb25kaXRpb25hbGx5LiBgaWZgIHNob3VsZCBiZSB1c2VkIGluIG1vc3QgY2FzZXMgYXMgaXQgcmVtb3ZlcyB0aGUgZWxlbWVudCBjb21wbGV0ZWx5IGFuZCBpc1xuICogbW9yZSBlZmZlY2llbnQgc2luY2UgYmluZGluZ3Mgd2l0aGluIHRoZSBgaWZgIGFyZSBub3QgYWN0aXZlIHdoaWxlIGl0IGlzIGhpZGRlbi4gVXNlIGBzaG93YCBmb3Igd2hlbiB0aGUgZWxlbWVudFxuICogbXVzdCByZW1haW4gaW4tRE9NIG9yIGJpbmRpbmdzIHdpdGhpbiBpdCBtdXN0IGNvbnRpbnVlIHRvIGJlIHByb2Nlc3NlZCB3aGlsZSBpdCBpcyBoaWRkZW4uIFlvdSBzaG91bGQgZGVmYXVsdCB0b1xuICogdXNpbmcgYGlmYC5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpc0hpZGUpIHtcbiAgdmFyIGlzU2hvdyA9ICFpc0hpZGU7XG4gIHJldHVybiB7XG4gICAgYW5pbWF0ZWQ6IHRydWUsXG5cbiAgICB1cGRhdGVkOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgLy8gRm9yIHBlcmZvcm1hbmNlIHByb3ZpZGUgYW4gYWx0ZXJuYXRlIGNvZGUgcGF0aCBmb3IgYW5pbWF0aW9uXG4gICAgICBpZiAodGhpcy5hbmltYXRlICYmIHRoaXMuY29udGV4dCAmJiAhdGhpcy5maXJzdFVwZGF0ZSkge1xuICAgICAgICB0aGlzLnVwZGF0ZWRBbmltYXRlZCh2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnVwZGF0ZWRSZWd1bGFyKHZhbHVlKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuZmlyc3RVcGRhdGUgPSBmYWxzZTtcbiAgICB9LFxuXG4gICAgdXBkYXRlZFJlZ3VsYXI6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgdGhpcy5lbGVtZW50LnN0eWxlLmRpc3BsYXkgPSAnJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICB1cGRhdGVkQW5pbWF0ZWQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICB0aGlzLmxhc3RWYWx1ZSA9IHZhbHVlO1xuICAgICAgaWYgKHRoaXMuYW5pbWF0aW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdGhpcy5hbmltYXRpbmcgPSB0cnVlO1xuICAgICAgZnVuY3Rpb24gb25GaW5pc2goKSB7XG4gICAgICAgIHRoaXMuYW5pbWF0aW5nID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLmxhc3RWYWx1ZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICB0aGlzLnVwZGF0ZWRBbmltYXRlZCh0aGlzLmxhc3RWYWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gaWYgaXNTaG93IGlzIHRydXRoeSBhbmQgdmFsdWUgaXMgdHJ1dGh5XG4gICAgICBpZiAoISF2YWx1ZSA9PT0gISFpc1Nob3cpIHtcbiAgICAgICAgdGhpcy5lbGVtZW50LnN0eWxlLmRpc3BsYXkgPSAnJztcbiAgICAgICAgdGhpcy5hbmltYXRlSW4odGhpcy5lbGVtZW50LCBvbkZpbmlzaCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmFuaW1hdGVPdXQodGhpcy5lbGVtZW50LCBmdW5jdGlvbigpIHtcbiAgICAgICAgICB0aGlzLmVsZW1lbnQuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgICAgICBvbkZpbmlzaC5jYWxsKHRoaXMpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgYm91bmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5maXJzdFVwZGF0ZSA9IHRydWU7XG4gICAgfSxcblxuICAgIHVuYm91bmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5lbGVtZW50LnN0eWxlLmRpc3BsYXkgPSAnJztcbiAgICAgIHRoaXMubGFzdFZhbHVlID0gbnVsbDtcbiAgICAgIHRoaXMuYW5pbWF0aW5nID0gZmFsc2U7XG4gICAgfVxuICB9O1xufTtcbiIsInZhciB1bml0cyA9IHtcbiAgJyUnOiB0cnVlLFxuICAnZW0nOiB0cnVlLFxuICAncHgnOiB0cnVlLFxuICAncHQnOiB0cnVlXG59O1xuXG4vKipcbiAqIEEgYmluZGVyIHRoYXQgYWRkcyBzdHlsZXMgdG8gYW4gZWxlbWVudC5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzcGVjaWZpY1N0eWxlTmFtZSwgc3BlY2lmaWNVbml0KSB7XG4gIHJldHVybiB7XG4gICAgY29tcGlsZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHN0eWxlTmFtZSA9IHNwZWNpZmljU3R5bGVOYW1lIHx8IHRoaXMubWF0Y2g7XG4gICAgICB2YXIgdW5pdDtcblxuICAgICAgaWYgKHNwZWNpZmljVW5pdCkge1xuICAgICAgICB1bml0ID0gc3BlY2lmaWNVbml0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHBhcnRzID0gc3R5bGVOYW1lLnNwbGl0KC9bXmEtel0vaSk7XG4gICAgICAgIGlmICh1bml0cy5oYXNPd25Qcm9wZXJ0eShwYXJ0c1twYXJ0cy5sZW5ndGggLSAxXSkpIHtcbiAgICAgICAgICB1bml0ID0gcGFydHMucG9wKCk7XG4gICAgICAgICAgc3R5bGVOYW1lID0gcGFydHMuam9pbignLScpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMudW5pdCA9IHVuaXQgfHwgJyc7XG5cbiAgICAgIHRoaXMuc3R5bGVOYW1lID0gc3R5bGVOYW1lLnJlcGxhY2UoLy0rKFxcdykvZywgZnVuY3Rpb24oXywgY2hhcikge1xuICAgICAgICByZXR1cm4gY2hhci50b1VwcGVyQ2FzZSgpO1xuICAgICAgfSk7XG4gICAgfSxcblxuICAgIHVwZGF0ZWQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICB0aGlzLmVsZW1lbnQuc3R5bGVzW3RoaXMuc3R5bGVOYW1lXSA9ICh2YWx1ZSA9PSBudWxsKSA/ICcnIDogdmFsdWUgKyB0aGlzLnVuaXQ7XG4gICAgfVxuICB9O1xufTtcbiIsIi8qKlxuICogIyMgdGV4dFxuICogQSBiaW5kZXIgdGhhdCBkaXNwbGF5cyBlc2NhcGVkIHRleHQgaW5zaWRlIGFuIGVsZW1lbnQuIFRoaXMgY2FuIGJlIGRvbmUgd2l0aCBiaW5kaW5nIGRpcmVjdGx5IGluIHRleHQgbm9kZXMgYnV0XG4gKiB1c2luZyB0aGUgYXR0cmlidXRlIGJpbmRlciBwcmV2ZW50cyBhIGZsYXNoIG9mIHVuc3R5bGVkIGNvbnRlbnQgb24gdGhlIG1haW4gcGFnZS5cbiAqXG4gKiAqKkV4YW1wbGU6KipcbiAqIGBgYGh0bWxcbiAqIDxoMSB0ZXh0PVwie3twb3N0LnRpdGxlfX1cIj5VbnRpdGxlZDwvaDE+XG4gKiA8ZGl2IGh0bWw9XCJ7e3Bvc3QuYm9keSB8IG1hcmtkb3dufX1cIj48L2Rpdj5cbiAqIGBgYFxuICogKlJlc3VsdDoqXG4gKiBgYGBodG1sXG4gKiA8aDE+TGl0dGxlIFJlZDwvaDE+XG4gKiA8ZGl2PlxuICogICA8cD5MaXR0bGUgUmVkIFJpZGluZyBIb29kIGlzIGEgc3RvcnkgYWJvdXQgYSBsaXR0bGUgZ2lybC48L3A+XG4gKiAgIDxwPlxuICogICAgIE1vcmUgaW5mbyBjYW4gYmUgZm91bmQgb25cbiAqICAgICA8YSBocmVmPVwiaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9MaXR0bGVfUmVkX1JpZGluZ19Ib29kXCI+V2lraXBlZGlhPC9hPlxuICogICA8L3A+XG4gKiA8L2Rpdj5cbiAqIGBgYFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcbiAgICB0aGlzLmVsZW1lbnQudGV4dENvbnRlbnQgPSAodmFsdWUgPT0gbnVsbCkgPyAnJyA6IHZhbHVlO1xuICB9O1xufTtcbiIsInZhciBpbnB1dE1ldGhvZHMsIGRlZmF1bHRJbnB1dE1ldGhvZDtcblxuLyoqXG4gKiBBIGJpbmRlciB0aGF0IHNldHMgdGhlIHZhbHVlIG9mIGFuIEhUTUwgZm9ybSBlbGVtZW50LiBUaGlzIGJpbmRlciBhbHNvIHVwZGF0ZXMgdGhlIGRhdGEgYXMgaXQgaXMgY2hhbmdlZCBpblxuICogdGhlIGZvcm0gZWxlbWVudCwgcHJvdmlkaW5nIHR3byB3YXkgYmluZGluZy4gQ2FuIHVzZSBmb3IgXCJjaGVja2VkXCIgYXMgd2VsbC5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihldmVudHNBdHRyTmFtZSwgZmllbGRBdHRyTmFtZSkge1xuICByZXR1cm4ge1xuICAgIG9ubHlXaGVuQm91bmQ6IHRydWUsXG4gICAgZGVmYXVsdEV2ZW50czogWyAnY2hhbmdlJyBdLFxuXG4gICAgY29tcGlsZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIG5hbWUgPSB0aGlzLmVsZW1lbnQudGFnTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgdmFyIHR5cGUgPSB0aGlzLmVsZW1lbnQudHlwZTtcbiAgICAgIHRoaXMubWV0aG9kcyA9IGlucHV0TWV0aG9kc1t0eXBlXSB8fCBpbnB1dE1ldGhvZHNbbmFtZV07XG5cbiAgICAgIGlmICghdGhpcy5tZXRob2RzKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGV2ZW50c0F0dHJOYW1lICYmIHRoaXMuZWxlbWVudC5oYXNBdHRyaWJ1dGUoZXZlbnRzQXR0ck5hbWUpKSB7XG4gICAgICAgIHRoaXMuZXZlbnRzID0gdGhpcy5lbGVtZW50LmdldEF0dHJpYnV0ZShldmVudHNBdHRyTmFtZSkuc3BsaXQoJyAnKTtcbiAgICAgICAgdGhpcy5lbGVtZW50LnJlbW92ZUF0dHJpYnV0ZShldmVudHNBdHRyTmFtZSk7XG4gICAgICB9IGVsc2UgaWYgKG5hbWUgIT09ICdvcHRpb24nKSB7XG4gICAgICAgIHRoaXMuZXZlbnRzID0gdGhpcy5kZWZhdWx0RXZlbnRzO1xuICAgICAgfVxuXG4gICAgICBpZiAoZmllbGRBdHRyTmFtZSAmJiB0aGlzLmVsZW1lbnQuaGFzQXR0cmlidXRlKGZpZWxkQXR0ck5hbWUpKSB7XG4gICAgICAgIHRoaXMudmFsdWVGaWVsZCA9IHRoaXMuZWxlbWVudC5nZXRBdHRyaWJ1dGUoZmllbGRBdHRyTmFtZSk7XG4gICAgICAgIHRoaXMuZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUoZmllbGRBdHRyTmFtZSk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlID09PSAnb3B0aW9uJykge1xuICAgICAgICB0aGlzLnZhbHVlRmllbGQgPSB0aGlzLmVsZW1lbnQucGFyZW50Tm9kZS52YWx1ZUZpZWxkO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBjcmVhdGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICghdGhpcy5ldmVudHMpIHJldHVybjsgLy8gbm90aGluZyBmb3IgPG9wdGlvbj4gaGVyZVxuICAgICAgdmFyIGVsZW1lbnQgPSB0aGlzLmVsZW1lbnQ7XG4gICAgICB2YXIgb2JzZXJ2ZXIgPSB0aGlzLm9ic2VydmVyO1xuICAgICAgdmFyIGlucHV0ID0gdGhpcy5tZXRob2RzO1xuICAgICAgdmFyIHZhbHVlRmllbGQgPSB0aGlzLnZhbHVlRmllbGQ7XG5cbiAgICAgIC8vIFRoZSAyLXdheSBiaW5kaW5nIHBhcnQgaXMgc2V0dGluZyB2YWx1ZXMgb24gY2VydGFpbiBldmVudHNcbiAgICAgIGZ1bmN0aW9uIG9uQ2hhbmdlKCkge1xuICAgICAgICBpZiAoaW5wdXQuZ2V0LmNhbGwoZWxlbWVudCwgdmFsdWVGaWVsZCkgIT09IG9ic2VydmVyLm9sZFZhbHVlICYmICFlbGVtZW50LnJlYWRPbmx5KSB7XG4gICAgICAgICAgb2JzZXJ2ZXIuc2V0KGlucHV0LmdldC5jYWxsKGVsZW1lbnQsIHZhbHVlRmllbGQpKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoZWxlbWVudC50eXBlID09PSAndGV4dCcpIHtcbiAgICAgICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMTMpIG9uQ2hhbmdlKCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmV2ZW50cy5mb3JFYWNoKGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgb25DaGFuZ2UpO1xuICAgICAgfSk7XG4gICAgfSxcblxuICAgIHVwZGF0ZWQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBpZiAodGhpcy5tZXRob2RzLmdldC5jYWxsKHRoaXMuZWxlbWVudCwgdGhpcy52YWx1ZUZpZWxkKSAhPSB2YWx1ZSkge1xuICAgICAgICB0aGlzLm1ldGhvZHMuc2V0LmNhbGwodGhpcy5lbGVtZW50LCB2YWx1ZSwgdGhpcy52YWx1ZUZpZWxkKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG59O1xuXG5cbi8qKlxuICogSGFuZGxlIHRoZSBkaWZmZXJlbnQgZm9ybSB0eXBlc1xuICovXG5kZWZhdWx0SW5wdXRNZXRob2QgPSB7XG4gIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnZhbHVlOyB9LFxuICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IHRoaXMudmFsdWUgPSAodmFsdWUgPT0gbnVsbCkgPyAnJyA6IHZhbHVlOyB9XG59O1xuXG5cbmlucHV0TWV0aG9kcyA9IHtcbiAgY2hlY2tib3g6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5jaGVja2VkOyB9LFxuICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgdGhpcy5jaGVja2VkID0gISF2YWx1ZTsgfVxuICB9LFxuXG4gIGZpbGU6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5maWxlcyAmJiB0aGlzLmZpbGVzWzBdOyB9LFxuICAgIHNldDogZnVuY3Rpb24oKSB7fVxuICB9LFxuXG4gIHNlbGVjdDoge1xuICAgIGdldDogZnVuY3Rpb24odmFsdWVGaWVsZCkge1xuICAgICAgaWYgKHZhbHVlRmllbGQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub3B0aW9uc1t0aGlzLnNlbGVjdGVkSW5kZXhdLnZhbHVlT2JqZWN0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudmFsdWU7XG4gICAgICB9XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlLCB2YWx1ZUZpZWxkKSB7XG4gICAgICBpZiAodmFsdWUgJiYgdmFsdWVGaWVsZCkge1xuICAgICAgICB0aGlzLnZhbHVlT2JqZWN0ID0gdmFsdWU7XG4gICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZVt2YWx1ZUZpZWxkXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMudmFsdWUgPSAodmFsdWUgPT0gbnVsbCkgPyAnJyA6IHZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBvcHRpb246IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKHZhbHVlRmllbGQpIHtcbiAgICAgIHJldHVybiB2YWx1ZUZpZWxkID8gdGhpcy52YWx1ZU9iamVjdFt2YWx1ZUZpZWxkXSA6IHRoaXMudmFsdWU7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlLCB2YWx1ZUZpZWxkKSB7XG4gICAgICBpZiAodmFsdWUgJiYgdmFsdWVGaWVsZCkge1xuICAgICAgICB0aGlzLnZhbHVlT2JqZWN0ID0gdmFsdWU7XG4gICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZVt2YWx1ZUZpZWxkXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMudmFsdWUgPSAodmFsdWUgPT0gbnVsbCkgPyAnJyA6IHZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBpbnB1dDogZGVmYXVsdElucHV0TWV0aG9kLFxuXG4gIHRleHRhcmVhOiBkZWZhdWx0SW5wdXRNZXRob2Rcbn07XG5cbiIsIi8qKlxuICogVGFrZXMgdGhlIGlucHV0IFVSTCBhbmQgYWRkcyAob3IgcmVwbGFjZXMpIHRoZSBmaWVsZCBpbiB0aGUgcXVlcnkuXG4gKiBFLmcuICdodHRwOi8vZXhhbXBsZS5jb20/dXNlcj1kZWZhdWx0JnJlc291cmNlPWZvbycgfCBhZGRRdWVyeSgndXNlcicsIHVzZXJuYW1lKVxuICogV2lsbCByZXBsYWNlIHVzZXI9ZGVmYXVsdCB3aXRoIHVzZXI9e3VzZXJuYW1lfSB3aGVyZSB7dXNlcm5hbWV9IGlzIHRoZSB2YWx1ZSBvZiB1c2VybmFtZS5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih2YWx1ZSwgcXVlcnlGaWVsZCwgcXVlcnlWYWx1ZSkge1xuICB2YXIgdXJsID0gdmFsdWUgfHwgbG9jYXRpb24uaHJlZjtcbiAgdmFyIHBhcnRzID0gdXJsLnNwbGl0KCc/Jyk7XG4gIHVybCA9IHBhcnRzWzBdO1xuICB2YXIgcXVlcnkgPSBwYXJ0c1sxXTtcbiAgdmFyIGFkZGVkUXVlcnkgPSAnJztcbiAgaWYgKHF1ZXJ5VmFsdWUgIT0gbnVsbCkge1xuICAgIGFkZGVkUXVlcnkgPSBxdWVyeUZpZWxkICsgJz0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHF1ZXJ5VmFsdWUpO1xuICB9XG5cbiAgaWYgKHF1ZXJ5KSB7XG4gICAgdmFyIGV4cHIgPSBuZXcgUmVnRXhwKCdcXFxcYicgKyBxdWVyeUZpZWxkICsgJz1bXiZdKicpO1xuICAgIGlmIChleHByLnRlc3QocXVlcnkpKSB7XG4gICAgICBxdWVyeSA9IHF1ZXJ5LnJlcGxhY2UoZXhwciwgYWRkZWRRdWVyeSk7XG4gICAgfSBlbHNlIGlmIChhZGRlZFF1ZXJ5KSB7XG4gICAgICBxdWVyeSArPSAnJicgKyBhZGRlZFF1ZXJ5O1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBxdWVyeSA9IGFkZGVkUXVlcnk7XG4gIH1cbiAgaWYgKHF1ZXJ5KSB7XG4gICAgdXJsICs9ICc/JyArIHF1ZXJ5O1xuICB9XG4gIHJldHVybiB1cmw7XG59O1xuIiwidmFyIHVybEV4cCA9IC8oXnxcXHN8XFwoKSgoPzpodHRwcz98ZnRwKTpcXC9cXC9bXFwtQS1aMC05K1xcdTAwMjZAI1xcLyU/PSgpfl98ITosLjtdKltcXC1BLVowLTkrXFx1MDAyNkAjXFwvJT1+KF98XSkvZ2k7XG52YXIgd3d3RXhwID0gLyhefFteXFwvXSkod3d3XFwuW1xcU10rXFwuXFx3ezIsfShcXGJ8JCkpL2dpbTtcbi8qKlxuICogQWRkcyBhdXRvbWF0aWMgbGlua3MgdG8gZXNjYXBlZCBjb250ZW50IChiZSBzdXJlIHRvIGVzY2FwZSB1c2VyIGNvbnRlbnQpLiBDYW4gYmUgdXNlZCBvbiBleGlzdGluZyBIVE1MIGNvbnRlbnQgYXMgaXRcbiAqIHdpbGwgc2tpcCBVUkxzIHdpdGhpbiBIVE1MIHRhZ3MuIFBhc3NpbmcgYSB2YWx1ZSBpbiB0aGUgc2Vjb25kIHBhcmFtZXRlciB3aWxsIHNldCB0aGUgdGFyZ2V0IHRvIHRoYXQgdmFsdWUgb3JcbiAqIGBfYmxhbmtgIGlmIHRoZSB2YWx1ZSBpcyBgdHJ1ZWAuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odmFsdWUsIHRhcmdldCkge1xuICB2YXIgdGFyZ2V0U3RyaW5nID0gJyc7XG4gIGlmICh0eXBlb2YgdGFyZ2V0ID09PSAnc3RyaW5nJykge1xuICAgIHRhcmdldFN0cmluZyA9ICcgdGFyZ2V0PVwiJyArIHRhcmdldCArICdcIic7XG4gIH0gZWxzZSBpZiAodGFyZ2V0KSB7XG4gICAgdGFyZ2V0U3RyaW5nID0gJyB0YXJnZXQ9XCJfYmxhbmtcIic7XG4gIH1cblxuICByZXR1cm4gKCcnICsgdmFsdWUpLnJlcGxhY2UoLzxbXj5dKz58W148XSsvZywgZnVuY3Rpb24obWF0Y2gpIHtcbiAgICBpZiAobWF0Y2guY2hhckF0KDApID09PSAnPCcpIHtcbiAgICAgIHJldHVybiBtYXRjaDtcbiAgICB9XG4gICAgdmFyIHJlcGxhY2VkVGV4dCA9IG1hdGNoLnJlcGxhY2UodXJsRXhwLCAnJDE8YSBocmVmPVwiJDJcIicgKyB0YXJnZXRTdHJpbmcgKyAnPiQyPC9hPicpO1xuICAgIHJldHVybiByZXBsYWNlZFRleHQucmVwbGFjZSh3d3dFeHAsICckMTxhIGhyZWY9XCJodHRwOi8vJDJcIicgKyB0YXJnZXRTdHJpbmcgKyAnPiQyPC9hPicpO1xuICB9KTtcbn07XG4iLCIvKipcbiAqIEZvcm1hdHMgdGhlIHZhbHVlIGludG8gYSBib29sZWFuLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSAmJiB2YWx1ZSAhPT0gJzAnICYmIHZhbHVlICE9PSAnZmFsc2UnO1xufTtcbiIsInZhciBlc2NhcGVIVE1MID0gcmVxdWlyZSgnLi9lc2NhcGUnKTtcblxuLyoqXG4gKiBIVE1MIGVzY2FwZXMgY29udGVudCBhZGRpbmcgPGJyPiB0YWdzIGluIHBsYWNlIG9mIG5ld2xpbmVzIGNoYXJhY3RlcnMuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odmFsdWUsIHNldHRlcikge1xuICBpZiAoc2V0dGVyKSB7XG4gICAgcmV0dXJuIGVzY2FwZUhUTUwodmFsdWUsIHNldHRlcik7XG4gIH0gZWxzZSB7XG4gICAgdmFyIGxpbmVzID0gKHZhbHVlIHx8ICcnKS5zcGxpdCgvXFxyP1xcbi8pO1xuICAgIHJldHVybiBsaW5lcy5tYXAoZXNjYXBlSFRNTCkuam9pbignPGJyPlxcbicpO1xuICB9XG59O1xuIiwiLyoqXG4gKiBBZGRzIGEgZm9ybWF0dGVyIHRvIGZvcm1hdCBkYXRlcyBhbmQgc3RyaW5ncyBzaW1wbGlzdGljYWxseVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGlmICghdmFsdWUpIHtcbiAgICByZXR1cm4gJyc7XG4gIH1cblxuICBpZiAoISh2YWx1ZSBpbnN0YW5jZW9mIERhdGUpKSB7XG4gICAgdmFsdWUgPSBuZXcgRGF0ZSh2YWx1ZSk7XG4gIH1cblxuICBpZiAoaXNOYU4odmFsdWUuZ2V0VGltZSgpKSkge1xuICAgIHJldHVybiAnJztcbiAgfVxuXG4gIHJldHVybiB2YWx1ZS50b0xvY2FsZVN0cmluZygpO1xufTtcbiIsIi8qKlxuICogQWRkcyBhIGZvcm1hdHRlciB0byBmb3JtYXQgZGF0ZXMgYW5kIHN0cmluZ3Mgc2ltcGxpc3RpY2FsbHlcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih2YWx1ZSkge1xuICBpZiAoIXZhbHVlKSB7XG4gICAgcmV0dXJuICcnO1xuICB9XG5cbiAgaWYgKCEodmFsdWUgaW5zdGFuY2VvZiBEYXRlKSkge1xuICAgIHZhbHVlID0gbmV3IERhdGUodmFsdWUpO1xuICB9XG5cbiAgaWYgKGlzTmFOKHZhbHVlLmdldFRpbWUoKSkpIHtcbiAgICByZXR1cm4gJyc7XG4gIH1cblxuICByZXR1cm4gdmFsdWUudG9Mb2NhbGVEYXRlU3RyaW5nKCk7XG59O1xuIiwidmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4vKipcbiAqIEhUTUwgZXNjYXBlcyBjb250ZW50LiBGb3IgdXNlIHdpdGggb3RoZXIgSFRNTC1hZGRpbmcgZm9ybWF0dGVycyBzdWNoIGFzIGF1dG9saW5rLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICh2YWx1ZSwgc2V0dGVyKSB7XG4gIGlmIChzZXR0ZXIpIHtcbiAgICBkaXYuaW5uZXJIVE1MID0gdmFsdWU7XG4gICAgcmV0dXJuIGRpdi50ZXh0Q29udGVudDtcbiAgfSBlbHNlIHtcbiAgICBkaXYudGV4dENvbnRlbnQgPSB2YWx1ZSB8fCAnJztcbiAgICByZXR1cm4gZGl2LmlubmVySFRNTDtcbiAgfVxufTtcbiIsIi8qKlxuICogRmlsdGVycyBhbiBhcnJheSBieSB0aGUgZ2l2ZW4gZmlsdGVyIGZ1bmN0aW9uKHMpLCBtYXkgcHJvdmlkZSBhIGZ1bmN0aW9uIG9yIGFuIGFycmF5IG9yIGFuIG9iamVjdCB3aXRoIGZpbHRlcmluZ1xuICogZnVuY3Rpb25zLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHZhbHVlLCBmaWx0ZXJGdW5jKSB7XG4gIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gW107XG4gIH0gZWxzZSBpZiAoIWZpbHRlckZ1bmMpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICBpZiAodHlwZW9mIGZpbHRlckZ1bmMgPT09ICdmdW5jdGlvbicpIHtcbiAgICB2YWx1ZSA9IHZhbHVlLmZpbHRlcihmaWx0ZXJGdW5jLCB0aGlzKTtcbiAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGZpbHRlckZ1bmMpKSB7XG4gICAgZmlsdGVyRnVuYy5mb3JFYWNoKGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICAgIHZhbHVlID0gdmFsdWUuZmlsdGVyKGZ1bmMsIHRoaXMpO1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBmaWx0ZXJGdW5jID09PSAnb2JqZWN0Jykge1xuICAgIE9iamVjdC5rZXlzKGZpbHRlckZ1bmMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICB2YXIgZnVuYyA9IGZpbHRlckZ1bmNba2V5XTtcbiAgICAgIGlmICh0eXBlb2YgZnVuYyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB2YWx1ZSA9IHZhbHVlLmZpbHRlcihmdW5jLCB0aGlzKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59O1xuIiwiLyoqXG4gKiBGb3JtYXRzIHRoZSB2YWx1ZSBpbnRvIGEgZmxvYXQgb3IgbnVsbC5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih2YWx1ZSkge1xuICB2YWx1ZSA9IHBhcnNlRmxvYXQodmFsdWUpO1xuICByZXR1cm4gaXNOYU4odmFsdWUpID8gbnVsbCA6IHZhbHVlO1xufTtcbiIsIi8qKlxuICogRm9ybWF0cyB0aGUgdmFsdWUgc29tZXRoaW5nIHJldHVybmVkIGJ5IGEgZm9ybWF0dGluZyBmdW5jdGlvbiBwYXNzZWQuIFVzZSBmb3IgY3VzdG9tIG9yIG9uZS1vZmYgZm9ybWF0cy5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih2YWx1ZSwgZm9ybWF0dGVyLCBpc1NldHRlcikge1xuICByZXR1cm4gZm9ybWF0dGVyKHZhbHVlLCBpc1NldHRlcik7XG59O1xuIiwiLyoqXG4gKiBBZGRzIGFsbCBidWlsdC1pbiBmb3JtYXR0ZXJzIHdpdGggZGVmYXVsdCBuYW1lc1xuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGZyYWdtZW50cykge1xuICBpZiAoIWZyYWdtZW50cyB8fCB0eXBlb2YgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignZm9ybWF0dGVycyByZXF1aXJlcyBhbiBpbnN0YW5jZSBvZiBmcmFnbWVudHMgdG8gcmVnaXN0ZXIgd2l0aCcpO1xuICB9XG5cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCdhZGRRdWVyeScsIHJlcXVpcmUoJy4vYWRkLXF1ZXJ5JykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ2F1dG9saW5rJywgcmVxdWlyZSgnLi9hdXRvbGluaycpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCdib29sJywgcmVxdWlyZSgnLi9ib29sJykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ2JyJywgcmVxdWlyZSgnLi9icicpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCdkYXRlVGltZScsIHJlcXVpcmUoJy4vZGF0ZS10aW1lJykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ2RhdGUnLCByZXF1aXJlKCcuL2RhdGUnKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcignZXNjYXBlJywgcmVxdWlyZSgnLi9lc2NhcGUnKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcignZmlsdGVyJywgcmVxdWlyZSgnLi9maWx0ZXInKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcignZmxvYXQnLCByZXF1aXJlKCcuL2Zsb2F0JykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ2Zvcm1hdCcsIHJlcXVpcmUoJy4vZm9ybWF0JykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ2ludCcsIHJlcXVpcmUoJy4vaW50JykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ2pzb24nLCByZXF1aXJlKCcuL2pzb24nKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcignbGltaXQnLCByZXF1aXJlKCcuL2xpbWl0JykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ2xvZycsIHJlcXVpcmUoJy4vbG9nJykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ2xvd2VyJywgcmVxdWlyZSgnLi9sb3dlcicpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCdtYXAnLCByZXF1aXJlKCcuL21hcCcpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCduZXdsaW5lJywgcmVxdWlyZSgnLi9uZXdsaW5lJykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ3AnLCByZXF1aXJlKCcuL3AnKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcigncmVkdWNlJywgcmVxdWlyZSgnLi9yZWR1Y2UnKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcignc2xpY2UnLCByZXF1aXJlKCcuL3NsaWNlJykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ3NvcnQnLCByZXF1aXJlKCcuL3NvcnQnKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcigndGltZScsIHJlcXVpcmUoJy4vdGltZScpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCd1cHBlcicsIHJlcXVpcmUoJy4vdXBwZXInKSk7XG59O1xuIiwiLyoqXG4gKiBGb3JtYXRzIHRoZSB2YWx1ZSBpbnRvIGFuIGludGVnZXIgb3IgbnVsbC5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih2YWx1ZSkge1xuICB2YWx1ZSA9IHBhcnNlSW50KHZhbHVlKTtcbiAgcmV0dXJuIGlzTmFOKHZhbHVlKSA/IG51bGwgOiB2YWx1ZTtcbn07XG4iLCIvKipcbiAqIEZvcm1hdHMgdGhlIHZhbHVlIGludG8gSlNPTi5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih2YWx1ZSwgaXNTZXR0ZXIpIHtcbiAgaWYgKGlzU2V0dGVyKSB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBKU09OLnBhcnNlKHZhbHVlKTtcbiAgICB9IGNhdGNoKGVycikge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodmFsdWUpO1xuICAgIH0gY2F0Y2goZXJyKSB7XG4gICAgICByZXR1cm4gZXJyLnRvU3RyaW5nKCk7XG4gICAgfVxuICB9XG59O1xuIiwiLyoqXG4gKiBBZGRzIGEgZm9ybWF0dGVyIHRvIGxpbWl0IHRoZSBsZW5ndGggb2YgYW4gYXJyYXkgb3Igc3RyaW5nXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odmFsdWUsIGxpbWl0KSB7XG4gIGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUuc2xpY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICBpZiAobGltaXQgPCAwKSB7XG4gICAgICByZXR1cm4gdmFsdWUuc2xpY2UobGltaXQpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZS5zbGljZSgwLCBsaW1pdCk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxufTtcbiIsIi8qKlxuICogQWRkcyBhIGZvcm1hdHRlciB0byBsb2cgdGhlIHZhbHVlIG9mIHRoZSBleHByZXNzaW9uLCB1c2VmdWwgZm9yIGRlYnVnZ2luZ1xuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHZhbHVlLCBwcmVmaXgpIHtcbiAgaWYgKHByZWZpeCA9PSBudWxsKSBwcmVmaXggPSAnTG9nOic7XG4gIC8qZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuICBjb25zb2xlLmxvZygnJWMnICsgcHJlZml4LCAnY29sb3I6Ymx1ZTtmb250LXdlaWdodDpib2xkJywgdmFsdWUpO1xuICAvKmVzbGludC1lbmFibGUgKi9cbiAgcmV0dXJuIHZhbHVlO1xufTtcbiIsIi8qKlxuICogRm9ybWF0cyB0aGUgdmFsdWUgaW50byBsb3dlciBjYXNlLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnID8gdmFsdWUudG9Mb3dlckNhc2UoKSA6IHZhbHVlO1xufTtcbiIsIi8qKlxuICogQWRkcyBhIGZvcm1hdHRlciB0byBtYXAgYW4gYXJyYXkgb3IgdmFsdWUgYnkgdGhlIGdpdmVuIG1hcHBpbmcgZnVuY3Rpb25cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih2YWx1ZSwgbWFwRnVuYykge1xuICBpZiAodmFsdWUgPT0gbnVsbCB8fCB0eXBlb2YgbWFwRnVuYyAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gdmFsdWUubWFwKG1hcEZ1bmMsIHRoaXMpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBtYXBGdW5jLmNhbGwodGhpcywgdmFsdWUpO1xuICB9XG59O1xuIiwidmFyIGVzY2FwZUhUTUwgPSByZXF1aXJlKCcuL2VzY2FwZScpO1xuXG4vKipcbiAqIEhUTUwgZXNjYXBlcyBjb250ZW50IGFkZGluZyA8cD4gdGFncyBhdCBkb3VibGUgbmV3bGluZXMgYW5kIDxicj4gdGFncyBpbiBwbGFjZSBvZiBzaW5nbGUgbmV3bGluZSBjaGFyYWN0ZXJzLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHZhbHVlLCBzZXR0ZXIpIHtcbiAgaWYgKHNldHRlcikge1xuICAgIHJldHVybiBlc2NhcGVIVE1MKHZhbHVlLCBzZXR0ZXIpO1xuICB9IGVsc2Uge1xuICAgIHZhciBwYXJhZ3JhcGhzID0gKHZhbHVlIHx8ICcnKS5zcGxpdCgvXFxyP1xcblxccypcXHI/XFxuLyk7XG4gICAgdmFyIGVzY2FwZWQgPSBwYXJhZ3JhcGhzLm1hcChmdW5jdGlvbihwYXJhZ3JhcGgpIHtcbiAgICAgIHZhciBsaW5lcyA9IHBhcmFncmFwaC5zcGxpdCgvXFxyP1xcbi8pO1xuICAgICAgcmV0dXJuIGxpbmVzLm1hcChlc2NhcGVIVE1MKS5qb2luKCc8YnI+XFxuJyk7XG4gICAgfSk7XG4gICAgcmV0dXJuICc8cD4nICsgZXNjYXBlZC5qb2luKCc8L3A+XFxuXFxuPHA+JykgKyAnPC9wPic7XG4gIH1cbn07XG4iLCJ2YXIgZXNjYXBlSFRNTCA9IHJlcXVpcmUoJy4vZXNjYXBlJyk7XG5cbi8qKlxuICogSFRNTCBlc2NhcGVzIGNvbnRlbnQgd3JhcHBpbmcgbGluZXMgaW50byBwYXJhZ3JhcGhzIChpbiA8cD4gdGFncykuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odmFsdWUsIHNldHRlcikge1xuICBpZiAoc2V0dGVyKSB7XG4gICAgcmV0dXJuIGVzY2FwZUhUTUwodmFsdWUsIHNldHRlcik7XG4gIH0gZWxzZSB7XG4gICAgdmFyIGxpbmVzID0gKHZhbHVlIHx8ICcnKS5zcGxpdCgvXFxyP1xcbi8pO1xuICAgIHZhciBlc2NhcGVkID0gbGluZXMubWFwKGZ1bmN0aW9uKGxpbmUpIHsgcmV0dXJuIGVzY2FwZUhUTUwobGluZSkgfHwgJzxicj4nOyB9KTtcbiAgICByZXR1cm4gJzxwPicgKyBlc2NhcGVkLmpvaW4oJzwvcD5cXG48cD4nKSArICc8L3A+JztcbiAgfVxufTtcbiIsIi8qKlxuICogQWRkcyBhIGZvcm1hdHRlciB0byByZWR1Y2UgYW4gYXJyYXkgb3IgdmFsdWUgYnkgdGhlIGdpdmVuIHJlZHVjZSBmdW5jdGlvblxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHZhbHVlLCByZWR1Y2VGdW5jLCBpbml0aWFsVmFsdWUpIHtcbiAgaWYgKHZhbHVlID09IG51bGwgfHwgdHlwZW9mIG1hcEZ1bmMgIT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbiAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDMpIHtcbiAgICAgIHJldHVybiB2YWx1ZS5yZWR1Y2UocmVkdWNlRnVuYywgaW5pdGlhbFZhbHVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHZhbHVlLnJlZHVjZShyZWR1Y2VGdW5jKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMykge1xuICAgIHJldHVybiByZWR1Y2VGdW5jKGluaXRpYWxWYWx1ZSwgdmFsdWUpO1xuICB9XG59O1xuIiwiLyoqXG4gKiBBZGRzIGEgZm9ybWF0dGVyIHRvIHJlZHVjZSBhbiBhcnJheSBvciB2YWx1ZSBieSB0aGUgZ2l2ZW4gcmVkdWNlIGZ1bmN0aW9uXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odmFsdWUsIGluZGV4LCBlbmRJbmRleCkge1xuICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gdmFsdWUuc2xpY2UoaW5kZXgsIGVuZEluZGV4KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbn07XG4iLCIvKipcbiAqIFNvcnRzIGFuIGFycmF5IGdpdmVuIGEgZmllbGQgbmFtZSBvciBzb3J0IGZ1bmN0aW9uLCBhbmQgYSBkaXJlY3Rpb25cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih2YWx1ZSwgc29ydEZ1bmMsIGRpcikge1xuICBpZiAoIXNvcnRGdW5jIHx8ICFBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuICBkaXIgPSAoZGlyID09PSAnZGVzYycpID8gLTEgOiAxO1xuICBpZiAodHlwZW9mIHNvcnRGdW5jID09PSAnc3RyaW5nJykge1xuICAgIHZhciBwYXJ0cyA9IHNvcnRGdW5jLnNwbGl0KCc6Jyk7XG4gICAgdmFyIHByb3AgPSBwYXJ0c1swXTtcbiAgICB2YXIgZGlyMiA9IHBhcnRzWzFdO1xuICAgIGRpcjIgPSAoZGlyMiA9PT0gJ2Rlc2MnKSA/IC0xIDogMTtcbiAgICBkaXIgPSBkaXIgfHwgZGlyMjtcbiAgICBzb3J0RnVuYyA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgIGlmIChhW3Byb3BdID4gYltwcm9wXSkgcmV0dXJuIGRpcjtcbiAgICAgIGlmIChhW3Byb3BdIDwgYltwcm9wXSkgcmV0dXJuIC1kaXI7XG4gICAgICByZXR1cm4gMDtcbiAgICB9O1xuICB9IGVsc2UgaWYgKGRpciA9PT0gLTEpIHtcbiAgICB2YXIgb3JpZ0Z1bmMgPSBzb3J0RnVuYztcbiAgICBzb3J0RnVuYyA9IGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIC1vcmlnRnVuYyhhLCBiKTsgfTtcbiAgfVxuXG4gIHJldHVybiB2YWx1ZS5zbGljZSgpLnNvcnQoc29ydEZ1bmMuYmluZCh0aGlzKSk7XG59O1xuIiwiLyoqXG4gKiBBZGRzIGEgZm9ybWF0dGVyIHRvIGZvcm1hdCBkYXRlcyBhbmQgc3RyaW5ncyBzaW1wbGlzdGljYWxseVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGlmICghdmFsdWUpIHtcbiAgICByZXR1cm4gJyc7XG4gIH1cblxuICBpZiAoISh2YWx1ZSBpbnN0YW5jZW9mIERhdGUpKSB7XG4gICAgdmFsdWUgPSBuZXcgRGF0ZSh2YWx1ZSk7XG4gIH1cblxuICBpZiAoaXNOYU4odmFsdWUuZ2V0VGltZSgpKSkge1xuICAgIHJldHVybiAnJztcbiAgfVxuXG4gIHJldHVybiB2YWx1ZS50b0xvY2FsZVRpbWVTdHJpbmcoKTtcbn07XG4iLCIvKipcbiAqIEZvcm1hdHMgdGhlIHZhbHVlIGludG8gdXBwZXIgY2FzZS5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyA/IHZhbHVlLnRvVXBwZXJDYXNlKCkgOiB2YWx1ZTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vc3JjL2RpZmYnKTtcbiIsIi8qXG5Db3B5cmlnaHQgKGMpIDIwMTUgSmFjb2IgV3JpZ2h0IDxqYWN3cmlnaHRAZ21haWwuY29tPlxuXG5QZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG5vZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG5pbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG50byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG5jb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbmZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG5cblRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG5hbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cblxuVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG5GSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbkFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbkxJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG5PVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG5USEUgU09GVFdBUkUuXG4qL1xuLy8gIyBEaWZmXG4vLyA+IEJhc2VkIG9uIHdvcmsgZnJvbSBHb29nbGUncyBvYnNlcnZlLWpzIHBvbHlmaWxsOiBodHRwczovL2dpdGh1Yi5jb20vUG9seW1lci9vYnNlcnZlLWpzXG5cbi8vIEEgbmFtZXNwYWNlIHRvIHN0b3JlIHRoZSBmdW5jdGlvbnMgb25cbnZhciBkaWZmID0gZXhwb3J0cztcblxuKGZ1bmN0aW9uKCkge1xuXG4gIGRpZmYuY2xvbmUgPSBjbG9uZTtcbiAgZGlmZi52YWx1ZXMgPSBkaWZmVmFsdWVzO1xuICBkaWZmLmJhc2ljID0gZGlmZkJhc2ljO1xuICBkaWZmLm9iamVjdHMgPSBkaWZmT2JqZWN0cztcbiAgZGlmZi5hcnJheXMgPSBkaWZmQXJyYXlzO1xuXG5cbiAgLy8gQSBjaGFuZ2UgcmVjb3JkIGZvciB0aGUgb2JqZWN0IGNoYW5nZXNcbiAgZnVuY3Rpb24gQ2hhbmdlUmVjb3JkKG9iamVjdCwgdHlwZSwgbmFtZSwgb2xkVmFsdWUpIHtcbiAgICB0aGlzLm9iamVjdCA9IG9iamVjdDtcbiAgICB0aGlzLnR5cGUgPSB0eXBlO1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgdGhpcy5vbGRWYWx1ZSA9IG9sZFZhbHVlO1xuICB9XG5cbiAgLy8gQSBzcGxpY2UgcmVjb3JkIGZvciB0aGUgYXJyYXkgY2hhbmdlc1xuICBmdW5jdGlvbiBTcGxpY2UoaW5kZXgsIHJlbW92ZWQsIGFkZGVkQ291bnQpIHtcbiAgICB0aGlzLmluZGV4ID0gaW5kZXg7XG4gICAgdGhpcy5yZW1vdmVkID0gcmVtb3ZlZDtcbiAgICB0aGlzLmFkZGVkQ291bnQgPSBhZGRlZENvdW50O1xuICB9XG5cblxuICAvLyBDcmVhdGVzIGEgY2xvbmUgb3IgY29weSBvZiBhbiBhcnJheSBvciBvYmplY3QgKG9yIHNpbXBseSByZXR1cm5zIGEgc3RyaW5nL251bWJlci9ib29sZWFuIHdoaWNoIGFyZSBpbW11dGFibGUpXG4gIC8vIERvZXMgbm90IHByb3ZpZGUgZGVlcCBjb3BpZXMuXG4gIGZ1bmN0aW9uIGNsb25lKHZhbHVlLCBkZWVwKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICBpZiAoZGVlcCkge1xuICAgICAgICByZXR1cm4gdmFsdWUubWFwKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGNsb25lKHZhbHVlLCBkZWVwKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdmFsdWUuc2xpY2UoKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGlmICh2YWx1ZS52YWx1ZU9mKCkgIT09IHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBuZXcgdmFsdWUuY29uc3RydWN0b3IodmFsdWUudmFsdWVPZigpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBjb3B5ID0ge307XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB2YWx1ZSkge1xuICAgICAgICAgIHZhciBvYmpWYWx1ZSA9IHZhbHVlW2tleV07XG4gICAgICAgICAgaWYgKGRlZXApIHtcbiAgICAgICAgICAgIG9ialZhbHVlID0gY2xvbmUob2JqVmFsdWUsIGRlZXApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb3B5W2tleV0gPSBvYmpWYWx1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY29weTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgfVxuXG5cbiAgLy8gRGlmZnMgdHdvIHZhbHVlcywgcmV0dXJuaW5nIGEgdHJ1dGh5IHZhbHVlIGlmIHRoZXJlIGFyZSBjaGFuZ2VzIG9yIGBmYWxzZWAgaWYgdGhlcmUgYXJlIG5vIGNoYW5nZXMuIElmIHRoZSB0d29cbiAgLy8gdmFsdWVzIGFyZSBib3RoIGFycmF5cyBvciBib3RoIG9iamVjdHMsIGFuIGFycmF5IG9mIGNoYW5nZXMgKHNwbGljZXMgb3IgY2hhbmdlIHJlY29yZHMpIGJldHdlZW4gdGhlIHR3byB3aWxsIGJlXG4gIC8vIHJldHVybmVkLiBPdGhlcndpc2UgIGB0cnVlYCB3aWxsIGJlIHJldHVybmVkLlxuICBmdW5jdGlvbiBkaWZmVmFsdWVzKHZhbHVlLCBvbGRWYWx1ZSkge1xuICAgIC8vIFNob3J0Y3V0IG91dCBmb3IgdmFsdWVzIHRoYXQgYXJlIGV4YWN0bHkgZXF1YWxcbiAgICBpZiAodmFsdWUgPT09IG9sZFZhbHVlKSByZXR1cm4gZmFsc2U7XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkgJiYgQXJyYXkuaXNBcnJheShvbGRWYWx1ZSkpIHtcbiAgICAgIC8vIElmIGFuIGFycmF5IGhhcyBjaGFuZ2VkIGNhbGN1bGF0ZSB0aGUgc3BsaWNlc1xuICAgICAgdmFyIHNwbGljZXMgPSBkaWZmQXJyYXlzKHZhbHVlLCBvbGRWYWx1ZSk7XG4gICAgICByZXR1cm4gc3BsaWNlcy5sZW5ndGggPyBzcGxpY2VzIDogZmFsc2U7XG4gICAgfSBlbHNlIGlmICh2YWx1ZSAmJiBvbGRWYWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHR5cGVvZiBvbGRWYWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIC8vIElmIGFuIG9iamVjdCBoYXMgY2hhbmdlZCBjYWxjdWxhdGUgdGhlIGNobmFnZXMgYW5kIGNhbGwgdGhlIGNhbGxiYWNrXG4gICAgICAvLyBBbGxvdyBkYXRlcyBhbmQgTnVtYmVyL1N0cmluZyBvYmplY3RzIHRvIGJlIGNvbXBhcmVkXG4gICAgICB2YXIgdmFsdWVWYWx1ZSA9IHZhbHVlLnZhbHVlT2YoKTtcbiAgICAgIHZhciBvbGRWYWx1ZVZhbHVlID0gb2xkVmFsdWUudmFsdWVPZigpO1xuXG4gICAgICAvLyBBbGxvdyBkYXRlcyBhbmQgTnVtYmVyL1N0cmluZyBvYmplY3RzIHRvIGJlIGNvbXBhcmVkXG4gICAgICBpZiAodHlwZW9mIHZhbHVlVmFsdWUgIT09ICdvYmplY3QnICYmIHR5cGVvZiBvbGRWYWx1ZVZhbHVlICE9PSAnb2JqZWN0Jykge1xuICAgICAgICByZXR1cm4gdmFsdWVWYWx1ZSAhPT0gb2xkVmFsdWVWYWx1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBjaGFuZ2VSZWNvcmRzID0gZGlmZk9iamVjdHModmFsdWUsIG9sZFZhbHVlKTtcbiAgICAgICAgcmV0dXJuIGNoYW5nZVJlY29yZHMubGVuZ3RoID8gY2hhbmdlUmVjb3JkcyA6IGZhbHNlO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiBhIHZhbHVlIGhhcyBjaGFuZ2VkIGNhbGwgdGhlIGNhbGxiYWNrXG4gICAgICByZXR1cm4gZGlmZkJhc2ljKHZhbHVlLCBvbGRWYWx1ZSk7XG4gICAgfVxuICB9XG5cblxuICAvLyBEaWZmcyB0d28gYmFzaWMgdHlwZXMsIHJldHVybmluZyB0cnVlIGlmIGNoYW5nZWQgb3IgZmFsc2UgaWYgbm90XG4gIGZ1bmN0aW9uIGRpZmZCYXNpYyh2YWx1ZSwgb2xkVmFsdWUpIHtcbiAgICBpZiAodmFsdWUgJiYgb2xkVmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB0eXBlb2Ygb2xkVmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAvLyBBbGxvdyBkYXRlcyBhbmQgTnVtYmVyL1N0cmluZyBvYmplY3RzIHRvIGJlIGNvbXBhcmVkXG4gICAgICB2YXIgdmFsdWVWYWx1ZSA9IHZhbHVlLnZhbHVlT2YoKTtcbiAgICAgIHZhciBvbGRWYWx1ZVZhbHVlID0gb2xkVmFsdWUudmFsdWVPZigpO1xuXG4gICAgICAvLyBBbGxvdyBkYXRlcyBhbmQgTnVtYmVyL1N0cmluZyBvYmplY3RzIHRvIGJlIGNvbXBhcmVkXG4gICAgICBpZiAodHlwZW9mIHZhbHVlVmFsdWUgIT09ICdvYmplY3QnICYmIHR5cGVvZiBvbGRWYWx1ZVZhbHVlICE9PSAnb2JqZWN0Jykge1xuICAgICAgICByZXR1cm4gZGlmZkJhc2ljKHZhbHVlVmFsdWUsIG9sZFZhbHVlVmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIElmIGEgdmFsdWUgaGFzIGNoYW5nZWQgY2FsbCB0aGUgY2FsbGJhY2tcbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyAmJiB0eXBlb2Ygb2xkVmFsdWUgPT09ICdudW1iZXInICYmIGlzTmFOKHZhbHVlKSAmJiBpc05hTihvbGRWYWx1ZSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHZhbHVlICE9PSBvbGRWYWx1ZTtcbiAgICB9XG4gIH1cblxuXG4gIC8vIERpZmZzIHR3byBvYmplY3RzIHJldHVybmluZyBhbiBhcnJheSBvZiBjaGFuZ2UgcmVjb3Jkcy4gVGhlIGNoYW5nZSByZWNvcmQgbG9va3MgbGlrZTpcbiAgLy8gYGBgamF2YXNjcmlwdFxuICAvLyB7XG4gIC8vICAgb2JqZWN0OiBvYmplY3QsXG4gIC8vICAgdHlwZTogJ2RlbGV0ZWR8dXBkYXRlZHxuZXcnLFxuICAvLyAgIG5hbWU6ICdwcm9wZXJ0eU5hbWUnLFxuICAvLyAgIG9sZFZhbHVlOiBvbGRWYWx1ZVxuICAvLyB9XG4gIC8vIGBgYFxuICBmdW5jdGlvbiBkaWZmT2JqZWN0cyhvYmplY3QsIG9sZE9iamVjdCkge1xuICAgIHZhciBjaGFuZ2VSZWNvcmRzID0gW107XG4gICAgdmFyIHByb3AsIG9sZFZhbHVlLCB2YWx1ZTtcblxuICAgIC8vIEdvZXMgdGhyb3VnaCB0aGUgb2xkIG9iamVjdCAoc2hvdWxkIGJlIGEgY2xvbmUpIGFuZCBsb29rIGZvciB0aGluZ3MgdGhhdCBhcmUgbm93IGdvbmUgb3IgY2hhbmdlZFxuICAgIGZvciAocHJvcCBpbiBvbGRPYmplY3QpIHtcbiAgICAgIG9sZFZhbHVlID0gb2xkT2JqZWN0W3Byb3BdO1xuICAgICAgdmFsdWUgPSBvYmplY3RbcHJvcF07XG5cbiAgICAgIC8vIEFsbG93IGZvciB0aGUgY2FzZSBvZiBvYmoucHJvcCA9IHVuZGVmaW5lZCAod2hpY2ggaXMgYSBuZXcgcHJvcGVydHksIGV2ZW4gaWYgaXQgaXMgdW5kZWZpbmVkKVxuICAgICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQgJiYgIWRpZmZCYXNpYyh2YWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiB0aGUgcHJvcGVydHkgaXMgZ29uZSBpdCB3YXMgcmVtb3ZlZFxuICAgICAgaWYgKCEgKHByb3AgaW4gb2JqZWN0KSkge1xuICAgICAgICBjaGFuZ2VSZWNvcmRzLnB1c2gobmV3IENoYW5nZVJlY29yZChvYmplY3QsICdkZWxldGVkJywgcHJvcCwgb2xkVmFsdWUpKTtcbiAgICAgIH0gZWxzZSBpZiAoZGlmZkJhc2ljKHZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgY2hhbmdlUmVjb3Jkcy5wdXNoKG5ldyBDaGFuZ2VSZWNvcmQob2JqZWN0LCAndXBkYXRlZCcsIHByb3AsIG9sZFZhbHVlKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gR29lcyB0aHJvdWdoIHRoZSBvbGQgb2JqZWN0IGFuZCBsb29rcyBmb3IgdGhpbmdzIHRoYXQgYXJlIG5ld1xuICAgIGZvciAocHJvcCBpbiBvYmplY3QpIHtcbiAgICAgIHZhbHVlID0gb2JqZWN0W3Byb3BdO1xuICAgICAgaWYgKCEgKHByb3AgaW4gb2xkT2JqZWN0KSkge1xuICAgICAgICBjaGFuZ2VSZWNvcmRzLnB1c2gobmV3IENoYW5nZVJlY29yZChvYmplY3QsICduZXcnLCBwcm9wKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkob2JqZWN0KSAmJiBvYmplY3QubGVuZ3RoICE9PSBvbGRPYmplY3QubGVuZ3RoKSB7XG4gICAgICBjaGFuZ2VSZWNvcmRzLnB1c2gobmV3IENoYW5nZVJlY29yZChvYmplY3QsICd1cGRhdGVkJywgJ2xlbmd0aCcsIG9sZE9iamVjdC5sZW5ndGgpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY2hhbmdlUmVjb3JkcztcbiAgfVxuXG5cblxuXG5cbiAgdmFyIEVESVRfTEVBVkUgPSAwO1xuICB2YXIgRURJVF9VUERBVEUgPSAxO1xuICB2YXIgRURJVF9BREQgPSAyO1xuICB2YXIgRURJVF9ERUxFVEUgPSAzO1xuXG5cbiAgLy8gRGlmZnMgdHdvIGFycmF5cyByZXR1cm5pbmcgYW4gYXJyYXkgb2Ygc3BsaWNlcy4gQSBzcGxpY2Ugb2JqZWN0IGxvb2tzIGxpa2U6XG4gIC8vIGBgYGphdmFzY3JpcHRcbiAgLy8ge1xuICAvLyAgIGluZGV4OiAzLFxuICAvLyAgIHJlbW92ZWQ6IFtpdGVtLCBpdGVtXSxcbiAgLy8gICBhZGRlZENvdW50OiAwXG4gIC8vIH1cbiAgLy8gYGBgXG4gIGZ1bmN0aW9uIGRpZmZBcnJheXModmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgdmFyIGN1cnJlbnRTdGFydCA9IDA7XG4gICAgdmFyIGN1cnJlbnRFbmQgPSB2YWx1ZS5sZW5ndGg7XG4gICAgdmFyIG9sZFN0YXJ0ID0gMDtcbiAgICB2YXIgb2xkRW5kID0gb2xkVmFsdWUubGVuZ3RoO1xuXG4gICAgdmFyIG1pbkxlbmd0aCA9IE1hdGgubWluKGN1cnJlbnRFbmQsIG9sZEVuZCk7XG4gICAgdmFyIHByZWZpeENvdW50ID0gc2hhcmVkUHJlZml4KHZhbHVlLCBvbGRWYWx1ZSwgbWluTGVuZ3RoKTtcbiAgICB2YXIgc3VmZml4Q291bnQgPSBzaGFyZWRTdWZmaXgodmFsdWUsIG9sZFZhbHVlLCBtaW5MZW5ndGggLSBwcmVmaXhDb3VudCk7XG5cbiAgICBjdXJyZW50U3RhcnQgKz0gcHJlZml4Q291bnQ7XG4gICAgb2xkU3RhcnQgKz0gcHJlZml4Q291bnQ7XG4gICAgY3VycmVudEVuZCAtPSBzdWZmaXhDb3VudDtcbiAgICBvbGRFbmQgLT0gc3VmZml4Q291bnQ7XG5cbiAgICBpZiAoY3VycmVudEVuZCAtIGN1cnJlbnRTdGFydCA9PT0gMCAmJiBvbGRFbmQgLSBvbGRTdGFydCA9PT0gMCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIC8vIGlmIG5vdGhpbmcgd2FzIGFkZGVkLCBvbmx5IHJlbW92ZWQgZnJvbSBvbmUgc3BvdFxuICAgIGlmIChjdXJyZW50U3RhcnQgPT09IGN1cnJlbnRFbmQpIHtcbiAgICAgIHJldHVybiBbIG5ldyBTcGxpY2UoY3VycmVudFN0YXJ0LCBvbGRWYWx1ZS5zbGljZShvbGRTdGFydCwgb2xkRW5kKSwgMCkgXTtcbiAgICB9XG5cbiAgICAvLyBpZiBub3RoaW5nIHdhcyByZW1vdmVkLCBvbmx5IGFkZGVkIHRvIG9uZSBzcG90XG4gICAgaWYgKG9sZFN0YXJ0ID09PSBvbGRFbmQpIHtcbiAgICAgIHJldHVybiBbIG5ldyBTcGxpY2UoY3VycmVudFN0YXJ0LCBbXSwgY3VycmVudEVuZCAtIGN1cnJlbnRTdGFydCkgXTtcbiAgICB9XG5cbiAgICAvLyBhIG1peHR1cmUgb2YgYWRkcyBhbmQgcmVtb3Zlc1xuICAgIHZhciBkaXN0YW5jZXMgPSBjYWxjRWRpdERpc3RhbmNlcyh2YWx1ZSwgY3VycmVudFN0YXJ0LCBjdXJyZW50RW5kLCBvbGRWYWx1ZSwgb2xkU3RhcnQsIG9sZEVuZCk7XG4gICAgdmFyIG9wcyA9IHNwbGljZU9wZXJhdGlvbnNGcm9tRWRpdERpc3RhbmNlcyhkaXN0YW5jZXMpO1xuXG4gICAgdmFyIHNwbGljZSA9IG51bGw7XG4gICAgdmFyIHNwbGljZXMgPSBbXTtcbiAgICB2YXIgaW5kZXggPSBjdXJyZW50U3RhcnQ7XG4gICAgdmFyIG9sZEluZGV4ID0gb2xkU3RhcnQ7XG5cbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IG9wcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIHZhciBvcCA9IG9wc1tpXTtcbiAgICAgIGlmIChvcCA9PT0gRURJVF9MRUFWRSkge1xuICAgICAgICBpZiAoc3BsaWNlKSB7XG4gICAgICAgICAgc3BsaWNlcy5wdXNoKHNwbGljZSk7XG4gICAgICAgICAgc3BsaWNlID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGluZGV4Kys7XG4gICAgICAgIG9sZEluZGV4Kys7XG4gICAgICB9IGVsc2UgaWYgKG9wID09PSBFRElUX1VQREFURSkge1xuICAgICAgICBpZiAoIXNwbGljZSkge1xuICAgICAgICAgIHNwbGljZSA9IG5ldyBTcGxpY2UoaW5kZXgsIFtdLCAwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNwbGljZS5hZGRlZENvdW50Kys7XG4gICAgICAgIGluZGV4Kys7XG5cbiAgICAgICAgc3BsaWNlLnJlbW92ZWQucHVzaChvbGRWYWx1ZVtvbGRJbmRleF0pO1xuICAgICAgICBvbGRJbmRleCsrO1xuICAgICAgfSBlbHNlIGlmIChvcCA9PT0gRURJVF9BREQpIHtcbiAgICAgICAgaWYgKCFzcGxpY2UpIHtcbiAgICAgICAgICBzcGxpY2UgPSBuZXcgU3BsaWNlKGluZGV4LCBbXSwgMCk7XG4gICAgICAgIH1cblxuICAgICAgICBzcGxpY2UuYWRkZWRDb3VudCsrO1xuICAgICAgICBpbmRleCsrO1xuICAgICAgfSBlbHNlIGlmIChvcCA9PT0gRURJVF9ERUxFVEUpIHtcbiAgICAgICAgaWYgKCFzcGxpY2UpIHtcbiAgICAgICAgICBzcGxpY2UgPSBuZXcgU3BsaWNlKGluZGV4LCBbXSwgMCk7XG4gICAgICAgIH1cblxuICAgICAgICBzcGxpY2UucmVtb3ZlZC5wdXNoKG9sZFZhbHVlW29sZEluZGV4XSk7XG4gICAgICAgIG9sZEluZGV4Kys7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHNwbGljZSkge1xuICAgICAgc3BsaWNlcy5wdXNoKHNwbGljZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNwbGljZXM7XG4gIH1cblxuXG5cblxuICAvLyBmaW5kIHRoZSBudW1iZXIgb2YgaXRlbXMgYXQgdGhlIGJlZ2lubmluZyB0aGF0IGFyZSB0aGUgc2FtZVxuICBmdW5jdGlvbiBzaGFyZWRQcmVmaXgoY3VycmVudCwgb2xkLCBzZWFyY2hMZW5ndGgpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNlYXJjaExlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoZGlmZkJhc2ljKGN1cnJlbnRbaV0sIG9sZFtpXSkpIHtcbiAgICAgICAgcmV0dXJuIGk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzZWFyY2hMZW5ndGg7XG4gIH1cblxuXG4gIC8vIGZpbmQgdGhlIG51bWJlciBvZiBpdGVtcyBhdCB0aGUgZW5kIHRoYXQgYXJlIHRoZSBzYW1lXG4gIGZ1bmN0aW9uIHNoYXJlZFN1ZmZpeChjdXJyZW50LCBvbGQsIHNlYXJjaExlbmd0aCkge1xuICAgIHZhciBpbmRleDEgPSBjdXJyZW50Lmxlbmd0aDtcbiAgICB2YXIgaW5kZXgyID0gb2xkLmxlbmd0aDtcbiAgICB2YXIgY291bnQgPSAwO1xuICAgIHdoaWxlIChjb3VudCA8IHNlYXJjaExlbmd0aCAmJiAhZGlmZkJhc2ljKGN1cnJlbnRbLS1pbmRleDFdLCBvbGRbLS1pbmRleDJdKSkge1xuICAgICAgY291bnQrKztcbiAgICB9XG4gICAgcmV0dXJuIGNvdW50O1xuICB9XG5cblxuICBmdW5jdGlvbiBzcGxpY2VPcGVyYXRpb25zRnJvbUVkaXREaXN0YW5jZXMoZGlzdGFuY2VzKSB7XG4gICAgdmFyIGkgPSBkaXN0YW5jZXMubGVuZ3RoIC0gMTtcbiAgICB2YXIgaiA9IGRpc3RhbmNlc1swXS5sZW5ndGggLSAxO1xuICAgIHZhciBjdXJyZW50ID0gZGlzdGFuY2VzW2ldW2pdO1xuICAgIHZhciBlZGl0cyA9IFtdO1xuICAgIHdoaWxlIChpID4gMCB8fCBqID4gMCkge1xuICAgICAgaWYgKGkgPT09IDApIHtcbiAgICAgICAgZWRpdHMucHVzaChFRElUX0FERCk7XG4gICAgICAgIGotLTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChqID09PSAwKSB7XG4gICAgICAgIGVkaXRzLnB1c2goRURJVF9ERUxFVEUpO1xuICAgICAgICBpLS07XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICB2YXIgbm9ydGhXZXN0ID0gZGlzdGFuY2VzW2kgLSAxXVtqIC0gMV07XG4gICAgICB2YXIgd2VzdCA9IGRpc3RhbmNlc1tpIC0gMV1bal07XG4gICAgICB2YXIgbm9ydGggPSBkaXN0YW5jZXNbaV1baiAtIDFdO1xuICAgICAgdmFyIG1pbjtcblxuICAgICAgaWYgKHdlc3QgPCBub3J0aCkge1xuICAgICAgICBtaW4gPSB3ZXN0IDwgbm9ydGhXZXN0ID8gd2VzdCA6IG5vcnRoV2VzdDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1pbiA9IG5vcnRoIDwgbm9ydGhXZXN0ID8gbm9ydGggOiBub3J0aFdlc3Q7XG4gICAgICB9XG5cbiAgICAgIGlmIChtaW4gPT09IG5vcnRoV2VzdCkge1xuICAgICAgICBpZiAobm9ydGhXZXN0ID09PSBjdXJyZW50KSB7XG4gICAgICAgICAgZWRpdHMucHVzaChFRElUX0xFQVZFKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBlZGl0cy5wdXNoKEVESVRfVVBEQVRFKTtcbiAgICAgICAgICBjdXJyZW50ID0gbm9ydGhXZXN0O1xuICAgICAgICB9XG4gICAgICAgIGktLTtcbiAgICAgICAgai0tO1xuICAgICAgfSBlbHNlIGlmIChtaW4gPT09IHdlc3QpIHtcbiAgICAgICAgZWRpdHMucHVzaChFRElUX0RFTEVURSk7XG4gICAgICAgIGktLTtcbiAgICAgICAgY3VycmVudCA9IHdlc3Q7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlZGl0cy5wdXNoKEVESVRfQUREKTtcbiAgICAgICAgai0tO1xuICAgICAgICBjdXJyZW50ID0gbm9ydGg7XG4gICAgICB9XG4gICAgfVxuICAgIGVkaXRzLnJldmVyc2UoKTtcbiAgICByZXR1cm4gZWRpdHM7XG4gIH1cblxuXG4gIGZ1bmN0aW9uIGNhbGNFZGl0RGlzdGFuY2VzKGN1cnJlbnQsIGN1cnJlbnRTdGFydCwgY3VycmVudEVuZCwgb2xkLCBvbGRTdGFydCwgb2xkRW5kKSB7XG4gICAgLy8gXCJEZWxldGlvblwiIGNvbHVtbnNcbiAgICB2YXIgcm93Q291bnQgPSBvbGRFbmQgLSBvbGRTdGFydCArIDE7XG4gICAgdmFyIGNvbHVtbkNvdW50ID0gY3VycmVudEVuZCAtIGN1cnJlbnRTdGFydCArIDE7XG4gICAgdmFyIGRpc3RhbmNlcyA9IG5ldyBBcnJheShyb3dDb3VudCk7XG4gICAgdmFyIGksIGo7XG5cbiAgICAvLyBcIkFkZGl0aW9uXCIgcm93cy4gSW5pdGlhbGl6ZSBudWxsIGNvbHVtbi5cbiAgICBmb3IgKGkgPSAwOyBpIDwgcm93Q291bnQ7IGkrKykge1xuICAgICAgZGlzdGFuY2VzW2ldID0gbmV3IEFycmF5KGNvbHVtbkNvdW50KTtcbiAgICAgIGRpc3RhbmNlc1tpXVswXSA9IGk7XG4gICAgfVxuXG4gICAgLy8gSW5pdGlhbGl6ZSBudWxsIHJvd1xuICAgIGZvciAoaiA9IDA7IGogPCBjb2x1bW5Db3VudDsgaisrKSB7XG4gICAgICBkaXN0YW5jZXNbMF1bal0gPSBqO1xuICAgIH1cblxuICAgIGZvciAoaSA9IDE7IGkgPCByb3dDb3VudDsgaSsrKSB7XG4gICAgICBmb3IgKGogPSAxOyBqIDwgY29sdW1uQ291bnQ7IGorKykge1xuICAgICAgICBpZiAoIWRpZmZCYXNpYyhjdXJyZW50W2N1cnJlbnRTdGFydCArIGogLSAxXSwgb2xkW29sZFN0YXJ0ICsgaSAtIDFdKSkge1xuICAgICAgICAgIGRpc3RhbmNlc1tpXVtqXSA9IGRpc3RhbmNlc1tpIC0gMV1baiAtIDFdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciBub3J0aCA9IGRpc3RhbmNlc1tpIC0gMV1bal0gKyAxO1xuICAgICAgICAgIHZhciB3ZXN0ID0gZGlzdGFuY2VzW2ldW2ogLSAxXSArIDE7XG4gICAgICAgICAgZGlzdGFuY2VzW2ldW2pdID0gbm9ydGggPCB3ZXN0ID8gbm9ydGggOiB3ZXN0O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRpc3RhbmNlcztcbiAgfVxufSkoKTtcbiIsInZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcblxuLyoqXG4gKiBTaW1wbGlmaWVzIGV4dGVuZGluZyBjbGFzc2VzIGFuZCBwcm92aWRlcyBzdGF0aWMgaW5oZXJpdGFuY2UuIENsYXNzZXMgdGhhdCBuZWVkIHRvIGJlIGV4dGVuZGFibGUgc2hvdWxkXG4gKiBleHRlbmQgQ2xhc3Mgd2hpY2ggd2lsbCBnaXZlIHRoZW0gdGhlIGBleHRlbmRgIHN0YXRpYyBmdW5jdGlvbiBmb3IgdGhlaXIgc3ViY2xhc3NlcyB0byB1c2UuIEluIGFkZGl0aW9uIHRvXG4gKiBhIHByb3RvdHlwZSwgbWl4aW5zIG1heSBiZSBhZGRlZCBhcyB3ZWxsLiBFeGFtcGxlOlxuICpcbiAqIGZ1bmN0aW9uIE15Q2xhc3MoYXJnMSwgYXJnMikge1xuICogICBTdXBlckNsYXNzLmNhbGwodGhpcywgYXJnMSk7XG4gKiAgIHRoaXMuYXJnMiA9IGFyZzI7XG4gKiB9XG4gKiBTdXBlckNsYXNzLmV4dGVuZChNeUNsYXNzLCBtaXhpbjEsIEFub3RoZXJDbGFzcywge1xuICogICBmb286IGZ1bmN0aW9uKCkge1xuICogICAgIHRoaXMuX2JhcisrO1xuICogICB9LFxuICogICBnZXQgYmFyKCkge1xuICogICAgIHJldHVybiB0aGlzLl9iYXI7XG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIEluIGFkZGl0aW9uIHRvIGV4dGVuZGluZyB0aGUgc3VwZXJjbGFzcywgc3RhdGljIG1ldGhvZHMgYW5kIHByb3BlcnRpZXMgd2lsbCBiZSBjb3BpZWQgb250byB0aGUgc3ViY2xhc3MgZm9yXG4gKiBzdGF0aWMgaW5oZXJpdGFuY2UuIFRoaXMgYWxsb3dzIHRoZSBleHRlbmQgZnVuY3Rpb24gdG8gYmUgY29waWVkIHRvIHRoZSBzdWJjbGFzcyBzbyB0aGF0IGl0IG1heSBiZVxuICogc3ViY2xhc3NlZCBhcyB3ZWxsLiBBZGRpdGlvbmFsbHksIHN0YXRpYyBwcm9wZXJ0aWVzIG1heSBiZSBhZGRlZCBieSBkZWZpbmluZyB0aGVtIG9uIGEgc3BlY2lhbCBwcm90b3R5cGVcbiAqIHByb3BlcnR5IGBzdGF0aWNgIG1ha2luZyB0aGUgY29kZSBtb3JlIHJlYWRhYmxlLlxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IFRoZSBzdWJjbGFzcyBjb25zdHJ1Y3Rvci5cbiAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9uYWxdIFplcm8gb3IgbW9yZSBtaXhpbnMuIFRoZXkgY2FuIGJlIG9iamVjdHMgb3IgY2xhc3NlcyAoZnVuY3Rpb25zKS5cbiAqIEBwYXJhbSB7b2JqZWN0fSBUaGUgcHJvdG90eXBlIG9mIHRoZSBzdWJjbGFzcy5cbiAqL1xuZnVuY3Rpb24gQ2xhc3MoKSB7fVxuQ2xhc3MuZXh0ZW5kID0gZXh0ZW5kO1xuQ2xhc3MubWFrZUluc3RhbmNlT2YgPSBtYWtlSW5zdGFuY2VPZjtcbm1vZHVsZS5leHBvcnRzID0gQ2xhc3M7XG5cbmZ1bmN0aW9uIGV4dGVuZChTdWJjbGFzcyAvKiBbLCBwcm90b3R5cGUgWyxwcm90b3R5cGVdXSAqLykge1xuICB2YXIgcHJvdG90eXBlcywgU3VwZXJDbGFzcyA9IHRoaXM7XG5cbiAgLy8gU3VwcG9ydCBubyBjb25zdHJ1Y3RvclxuICBpZiAodHlwZW9mIFN1YmNsYXNzICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgcHJvdG90eXBlcyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICBTdWJjbGFzcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgU3VwZXJDbGFzcy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgcHJvdG90eXBlcyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgfVxuXG4gIGV4dGVuZFN0YXRpY3ModGhpcywgU3ViY2xhc3MpO1xuXG4gIHByb3RvdHlwZXMuZm9yRWFjaChmdW5jdGlvbihwcm90bykge1xuICAgIGlmICh0eXBlb2YgcHJvdG8gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGV4dGVuZFN0YXRpY3MocHJvdG8sIFN1YmNsYXNzKTtcbiAgICB9IGVsc2UgaWYgKHByb3RvLmhhc093blByb3BlcnR5KCdzdGF0aWMnKSkge1xuICAgICAgZXh0ZW5kU3RhdGljcyhwcm90by5zdGF0aWMsIFN1YmNsYXNzKTtcbiAgICB9XG4gIH0pO1xuXG4gIHZhciBkZXNjcmlwdG9ycyA9IGdldERlc2NyaXB0b3JzKHByb3RvdHlwZXMpO1xuICBkZXNjcmlwdG9ycy5jb25zdHJ1Y3RvciA9IHsgd3JpdGFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSwgdmFsdWU6IFN1YmNsYXNzIH07XG4gIFN1YmNsYXNzLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUodGhpcy5wcm90b3R5cGUsIGRlc2NyaXB0b3JzKTtcbiAgaWYgKHR5cGVvZiBTdXBlckNsYXNzLm9uRXh0ZW5kID09PSAnZnVuY3Rpb24nKSB7XG4gICAgLy8gQWxsb3cgZm9yIGN1c3RvbWl6aW5nIHRoZSBkZWZpbml0aW9ucyBvZiB5b3VyIGNoaWxkIGNsYXNzZXNcbiAgICBTdXBlckNsYXNzLm9uRXh0ZW5kKFN1YmNsYXNzLCBwcm90b3R5cGVzKTtcbiAgfVxuICByZXR1cm4gU3ViY2xhc3M7XG59XG5cbi8vIEdldCBkZXNjcmlwdG9ycyAoYWxsb3dzIGZvciBnZXR0ZXJzIGFuZCBzZXR0ZXJzKSBhbmQgc2V0cyBmdW5jdGlvbnMgdG8gYmUgbm9uLWVudW1lcmFibGVcbmZ1bmN0aW9uIGdldERlc2NyaXB0b3JzKG9iamVjdHMpIHtcbiAgdmFyIGRlc2NyaXB0b3JzID0ge307XG5cbiAgb2JqZWN0cy5mb3JFYWNoKGZ1bmN0aW9uKG9iamVjdCkge1xuICAgIGlmICh0eXBlb2Ygb2JqZWN0ID09PSAnZnVuY3Rpb24nKSBvYmplY3QgPSBvYmplY3QucHJvdG90eXBlO1xuXG4gICAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob2JqZWN0KS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIGlmIChuYW1lID09PSAnc3RhdGljJykgcmV0dXJuO1xuXG4gICAgICB2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqZWN0LCBuYW1lKTtcblxuICAgICAgaWYgKHR5cGVvZiBkZXNjcmlwdG9yLnZhbHVlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGRlc2NyaXB0b3IuZW51bWVyYWJsZSA9IGZhbHNlO1xuICAgICAgfVxuXG4gICAgICBkZXNjcmlwdG9yc1tuYW1lXSA9IGRlc2NyaXB0b3I7XG4gICAgfSk7XG4gIH0pO1xuICByZXR1cm4gZGVzY3JpcHRvcnM7XG59XG5cbi8vIENvcGllcyBzdGF0aWMgbWV0aG9kcyBvdmVyIGZvciBzdGF0aWMgaW5oZXJpdGFuY2VcbmZ1bmN0aW9uIGV4dGVuZFN0YXRpY3MoQ2xhc3MsIFN1YmNsYXNzKSB7XG5cbiAgLy8gc3RhdGljIG1ldGhvZCBpbmhlcml0YW5jZSAoaW5jbHVkaW5nIGBleHRlbmRgKVxuICBPYmplY3Qua2V5cyhDbGFzcykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICB2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IoQ2xhc3MsIGtleSk7XG4gICAgaWYgKCFkZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSkgcmV0dXJuO1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFN1YmNsYXNzLCBrZXksIGRlc2NyaXB0b3IpO1xuICB9KTtcbn1cblxuXG4vKipcbiAqIE1ha2VzIGEgbmF0aXZlIG9iamVjdCBwcmV0ZW5kIHRvIGJlIGFuIGluc3RhbmNlIG9mIGNsYXNzIChlLmcuIGFkZHMgbWV0aG9kcyB0byBhIERvY3VtZW50RnJhZ21lbnQgdGhlbiBjYWxscyB0aGVcbiAqIGNvbnN0cnVjdG9yKS5cbiAqL1xuZnVuY3Rpb24gbWFrZUluc3RhbmNlT2Yob2JqZWN0KSB7XG4gIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhvYmplY3QsIGdldERlc2NyaXB0b3JzKFt0aGlzLnByb3RvdHlwZV0pKTtcbiAgdGhpcy5hcHBseShvYmplY3QsIGFyZ3MpO1xuICByZXR1cm4gb2JqZWN0O1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBFdmVudFRhcmdldDtcbnZhciBDbGFzcyA9IHJlcXVpcmUoJy4vY2xhc3MnKTtcblxuLyoqXG4gKiBBIGJyb3dzZXItYmFzZWQgZXZlbnQgZW1pdHRlciB0aGF0IHRha2VzIGFkdmFudGFnZSBvZiB0aGUgYnVpbHQtaW4gQysrIGV2ZW50aW5nIHRoZSBicm93c2VyIHByb3ZpZGVzLCBnaXZpbmcgYVxuICogY29uc2lzdGVudCBldmVudGluZyBtZWNoYW5pc20gZXZlcnl3aGVyZSBpbiB5b3VyIGZyb250LWVuZCBhcHAuXG4gKi9cbmZ1bmN0aW9uIEV2ZW50VGFyZ2V0KCkge1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ19fZXZlbnRfbm9kZScsIHsgdmFsdWU6IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKSB9KTtcbn1cblxuXG5DbGFzcy5leHRlbmQoRXZlbnRUYXJnZXQsIHtcbiAgLy8gQWRkIGV2ZW50IGxpc3RlbmVyXG4gIGFkZEV2ZW50TGlzdGVuZXI6IGZ1bmN0aW9uIGFkZEV2ZW50TGlzdGVuZXIodHlwZSwgbGlzdGVuZXIpIHtcbiAgICB0aGlzLl9fZXZlbnRfbm9kZS5hZGRFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyKTtcbiAgfSxcblxuICBvbjogZnVuY3Rpb24gb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgbGlzdGVuZXIpO1xuICB9LFxuXG4gIC8vIFJlbW92ZXMgZXZlbnQgbGlzdGVuZXJcbiAgcmVtb3ZlRXZlbnRMaXN0ZW5lcjogZnVuY3Rpb24gcmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcikge1xuICAgIHRoaXMuX19ldmVudF9ub2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgbGlzdGVuZXIpO1xuICAgIGlmIChsaXN0ZW5lciAmJiBsaXN0ZW5lci5fX2V2ZW50X29uZSkge1xuICAgICAgdGhpcy5fX2V2ZW50X25vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lci5fX2V2ZW50X29uZSk7XG4gICAgfVxuICB9LFxuXG4gIG9mZjogZnVuY3Rpb24gb2ZmKHR5cGUsIGxpc3RlbmVyKSB7XG4gICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyKTtcbiAgfSxcblxuICAvLyBBZGQgZXZlbnQgbGlzdGVuZXIgdG8gb25seSBnZXQgY2FsbGVkIG9uY2UsIHJldHVybnMgd3JhcHBlZCBtZXRob2QgZm9yIHJlbW92aW5nIGlmIG5lZWRlZFxuICBvbmU6IGZ1bmN0aW9uIG9uZSh0eXBlLCBsaXN0ZW5lcikge1xuICAgIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09ICdmdW5jdGlvbicpIHJldHVybjtcblxuICAgIGlmICghbGlzdGVuZXIuX19ldmVudF9vbmUpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShsaXN0ZW5lciwgJ19fZXZlbnRfb25lJywgeyB2YWx1ZTogZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgc2VsZi5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyLl9fZXZlbnRfb25lKTtcbiAgICAgICAgbGlzdGVuZXIuY2FsbChzZWxmLCBldmVudCk7XG4gICAgICB9fSk7XG4gICAgfVxuXG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyLl9fZXZlbnRfb25lKTtcbiAgfSxcblxuICAvLyBEaXNwYXRjaCBldmVudCBhbmQgdHJpZ2dlciBsaXN0ZW5lcnNcbiAgZGlzcGF0Y2hFdmVudDogZnVuY3Rpb24gZGlzcGF0Y2hFdmVudChldmVudCkge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShldmVudCwgJ3RhcmdldCcsIHsgdmFsdWU6IHRoaXMgfSk7XG4gICAgcmV0dXJuIHRoaXMuX19ldmVudF9ub2RlLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICB9XG59KTtcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9zcmMvY2hpcCcpO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBBcHA7XG52YXIgY29tcG9uZW50QmluZGluZyA9IHJlcXVpcmUoJ2ZyYWdtZW50cy1idWlsdC1pbnMvYmluZGVycy9jb21wb25lbnQnKTtcbnZhciBMb2NhdGlvbiA9IHJlcXVpcmUoJ3JvdXRlcy1qcycpLkxvY2F0aW9uO1xudmFyIEV2ZW50VGFyZ2V0ID0gcmVxdWlyZSgnY2hpcC11dGlscy9ldmVudC10YXJnZXQnKTtcbnZhciBjcmVhdGVGcmFnbWVudHMgPSByZXF1aXJlKCcuL2ZyYWdtZW50cycpO1xudmFyIGRlZmF1bHRNaXhpbiA9IHJlcXVpcmUoJy4vbWl4aW5zL2RlZmF1bHQnKTtcbnZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcblxuLy8gIyBDaGlwIEFwcFxuXG4vLyBBbiBBcHAgcmVwcmVzZW50cyBhbiBhcHAgb3IgbW9kdWxlIHRoYXQgY2FuIGhhdmUgcm91dGVzLCBjb250cm9sbGVycywgYW5kIHRlbXBsYXRlcyBkZWZpbmVkLlxuZnVuY3Rpb24gQXBwKG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIEV2ZW50VGFyZ2V0LmNhbGwodGhpcyk7XG4gIHRoaXMuZnJhZ21lbnRzID0gY3JlYXRlRnJhZ21lbnRzKCk7XG4gIHRoaXMuZnJhZ21lbnRzLmFwcCA9IHRoaXM7XG4gIHRoaXMubG9jYXRpb24gPSBMb2NhdGlvbi5jcmVhdGUob3B0aW9ucyk7XG4gIHRoaXMuZGVmYXVsdE1peGluID0gZGVmYXVsdE1peGluKHRoaXMpO1xuICB0aGlzLl9saXN0ZW5pbmcgPSBmYWxzZTtcblxuICB0aGlzLnJvb3RFbGVtZW50ID0gb3B0aW9ucy5yb290RWxlbWVudCB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gIHRoaXMuc3luYyA9IHRoaXMuZnJhZ21lbnRzLnN5bmM7XG4gIHRoaXMuc3luY05vdyA9IHRoaXMuZnJhZ21lbnRzLnN5bmNOb3c7XG4gIHRoaXMuYWZ0ZXJTeW5jID0gdGhpcy5mcmFnbWVudHMuYWZ0ZXJTeW5jO1xuICB0aGlzLm9uU3luYyA9IHRoaXMuZnJhZ21lbnRzLm9uU3luYztcbiAgdGhpcy5vZmZTeW5jID0gdGhpcy5mcmFnbWVudHMub2ZmU3luYztcbiAgdGhpcy5sb2NhdGlvbi5vbignY2hhbmdlJywgdGhpcy5zeW5jKTtcbn1cblxuRXZlbnRUYXJnZXQuZXh0ZW5kKEFwcCwge1xuXG4gIGluaXQ6IGZ1bmN0aW9uKHJvb3QpIHtcbiAgICBpZiAodGhpcy5pbml0ZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoZG9jdW1lbnQucmVhZHlTdGF0ZSA9PT0gJ2xvYWRpbmcnKSB7XG4gICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgdGhpcy5pbml0LmJpbmQodGhpcywgcm9vdCkpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuaW5pdGVkID0gdHJ1ZVxuICAgIGlmIChyb290KSB7XG4gICAgICB0aGlzLnJvb3RFbGVtZW50ID0gcm9vdDtcbiAgICB9XG5cbiAgICB0aGlzLmZyYWdtZW50cy5iaW5kRWxlbWVudCh0aGlzLnJvb3RFbGVtZW50LCB0aGlzKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuXG4gIC8vIENvbXBvbmVudHNcbiAgLy8gLS0tLS0tLS0tLVxuXG4gIC8vIFJlZ2lzdGVycyBhIG5ldyBjb21wb25lbnQgYnkgbmFtZSB3aXRoIHRoZSBnaXZlbiBkZWZpbml0aW9uLiBwcm92aWRlZCBgY29udGVudGAgc3RyaW5nLiBJZiBubyBgY29udGVudGAgaXMgZ2l2ZW5cbiAgLy8gdGhlbiByZXR1cm5zIGEgbmV3IGluc3RhbmNlIG9mIGEgZGVmaW5lZCB0ZW1wbGF0ZS4gVGhpcyBpbnN0YW5jZSBpcyBhIGRvY3VtZW50IGZyYWdtZW50LlxuICBjb21wb25lbnQ6IGZ1bmN0aW9uKG5hbWUsIGRlZmluaXRpb24pIHtcbiAgICB2YXIgZGVmaW5pdGlvbnMgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgZGVmaW5pdGlvbnMudW5zaGlmdCh0aGlzLmRlZmF1bHRNaXhpbik7XG4gICAgdGhpcy5mcmFnbWVudHMucmVnaXN0ZXJFbGVtZW50KG5hbWUsIGNvbXBvbmVudEJpbmRpbmcuYXBwbHkobnVsbCwgZGVmaW5pdGlvbnMpKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuXG4gIC8vIFJlZGlyZWN0cyB0byB0aGUgcHJvdmlkZWQgVVJMXG4gIHJlZGlyZWN0OiBmdW5jdGlvbih1cmwpIHtcbiAgICByZXR1cm4gdGhpcy5sb2NhdGlvbi51cmwgPSB1cmw7XG4gIH0sXG5cblxuICBnZXQgbGlzdGVuaW5nKCkge1xuICAgIHJldHVybiB0aGlzLl9saXN0ZW5pbmc7XG4gIH0sXG5cbiAgLy8gTGlzdGVuIHRvIFVSTCBjaGFuZ2VzXG4gIGxpc3RlbjogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGFwcCA9IHRoaXM7XG4gICAgdGhpcy5fbGlzdGVuaW5nID0gdHJ1ZTtcblxuICAgIGlmIChkb2N1bWVudC5yZWFkeVN0YXRlID09PSAnbG9hZGluZycpIHtcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCB0aGlzLmxpc3Rlbi5iaW5kKHRoaXMpKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8vIEFkZCBoYW5kbGVyIGZvciB3aGVuIHRoZSByb3V0ZSBjaGFuZ2VzXG4gICAgdGhpcy5fbG9jYXRpb25DaGFuZ2VIYW5kbGVyID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgIGFwcC5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgndXJsQ2hhbmdlJywgeyBkZXRhaWw6IGV2ZW50LmRldGFpbCB9KSk7XG4gICAgfTtcblxuICAgIC8vIEFkZCBoYW5kbGVyIGZvciBjbGlja2luZyBsaW5rc1xuICAgIHRoaXMuX2NsaWNrSGFuZGxlciA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICB2YXIgYW5jaG9yO1xuICAgICAgaWYgKCAhKGFuY2hvciA9IGV2ZW50LnRhcmdldC5jbG9zZXN0KCdhW2hyZWZdJykpICkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChldmVudC5kZWZhdWx0UHJldmVudGVkKSB7XG4gICAgICAgIC8vIGlmIHNvbWV0aGluZyBlbHNlIGFscmVhZHkgaGFuZGxlZCB0aGlzLCB3ZSB3b24ndFxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHZhciBsaW5rSG9zdCA9IGFuY2hvci5ob3N0LnJlcGxhY2UoLzo4MCR8OjQ0MyQvLCAnJyk7XG4gICAgICB2YXIgdXJsID0gYW5jaG9yLmdldEF0dHJpYnV0ZSgnaHJlZicpLnJlcGxhY2UoL14jLywgJycpO1xuXG4gICAgICBpZiAobGlua0hvc3QgJiYgbGlua0hvc3QgIT09IGxvY2F0aW9uLmhvc3QpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoZXZlbnQubWV0YUtleSB8fCBldmVudC5jdHJsS2V5IHx8IGFuY2hvci5oYXNBdHRyaWJ1dGUoJ3RhcmdldCcpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGlmIChhbmNob3IuaHJlZiA9PT0gbG9jYXRpb24uaHJlZiArICcjJykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmICghYW5jaG9yLmRpc2FibGVkKSB7XG4gICAgICAgIGFwcC5yZWRpcmVjdCh1cmwpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLmxvY2F0aW9uLm9uKCdjaGFuZ2UnLCB0aGlzLl9sb2NhdGlvbkNoYW5nZUhhbmRsZXIpO1xuICAgIHRoaXMucm9vdEVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLl9jbGlja0hhbmRsZXIpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ3VybENoYW5nZScsIHsgZGV0YWlsOiB7IHVybDogdGhpcy5sb2NhdGlvbi51cmwgfX0pKTtcbiAgfSxcblxuICAvLyBTdG9wIGxpc3RlbmluZ1xuICBzdG9wOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmxvY2F0aW9uLm9mZignY2hhbmdlJywgdGhpcy5fbG9jYXRpb25DaGFuZ2VIYW5kbGVyKTtcbiAgICB0aGlzLnJvb3RFbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5fY2xpY2tIYW5kbGVyKTtcbiAgfVxuXG59KTsiLCJ2YXIgUm91dGUgPSByZXF1aXJlKCdyb3V0ZXMtanMnKS5Sb3V0ZTtcbnZhciBJZkJpbmRlciA9IHJlcXVpcmUoJ2ZyYWdtZW50cy1idWlsdC1pbnMvYmluZGVycy9pZicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgaWZCaW5kZXIgPSBJZkJpbmRlcigpO1xuXG4gIGlmQmluZGVyLmNvbXBpbGVkID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5hcHAgPSB0aGlzLmZyYWdtZW50cy5hcHA7XG4gICAgdGhpcy5yb3V0ZXMgPSBbXTtcbiAgICB0aGlzLnRlbXBsYXRlcyA9IFtdO1xuICAgIHRoaXMuZXhwcmVzc2lvbiA9ICcnO1xuXG4gICAgLy8gZWFjaCBjaGlsZCB3aXRoIGEgW3BhdGhdIGF0dHJpYnV0ZSB3aWxsIGRpc3BsYXkgb25seSB3aGVuIGl0cyBwYXRoIG1hdGNoZXMgdGhlIFVSTFxuICAgIHdoaWxlICh0aGlzLmVsZW1lbnQuZmlyc3RDaGlsZCkge1xuICAgICAgdmFyIGNoaWxkID0gdGhpcy5lbGVtZW50LmZpcnN0Q2hpbGQ7XG4gICAgICB0aGlzLmVsZW1lbnQucmVtb3ZlQ2hpbGQoY2hpbGQpO1xuXG4gICAgICBpZiAoY2hpbGQubm9kZVR5cGUgIT09IE5vZGUuRUxFTUVOVF9OT0RFKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoY2hpbGQuaGFzQXR0cmlidXRlKCdbcGF0aF0nKSkge1xuICAgICAgICB2YXIgcGF0aCA9IGNoaWxkLmdldEF0dHJpYnV0ZSgnW3BhdGhdJyk7XG4gICAgICAgIGNoaWxkLnJlbW92ZUF0dHJpYnV0ZSgnW3BhdGhdJyk7XG4gICAgICAgIHRoaXMucm91dGVzLnB1c2gobmV3IFJvdXRlKHBhdGggKyAnKicpKTtcbiAgICAgICAgdGhpcy50ZW1wbGF0ZXMucHVzaCh0aGlzLmZyYWdtZW50cy5jcmVhdGVUZW1wbGF0ZShjaGlsZCkpO1xuICAgICAgfSBlbHNlIGlmIChjaGlsZC5oYXNBdHRyaWJ1dGUoJ1tub3JvdXRlXScpKSB7XG4gICAgICAgIGNoaWxkLnJlbW92ZUF0dHJpYnV0ZSgnW25vcm91dGVdJyk7XG4gICAgICAgIHRoaXMudGVtcGxhdGVzWzBdID0gdGhpcy5mcmFnbWVudHMuY3JlYXRlVGVtcGxhdGUoY2hpbGQpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICBpZkJpbmRlci5hZGQgPSBmdW5jdGlvbih2aWV3KSB7XG4gICAgdGhpcy5lbGVtZW50LmFwcGVuZENoaWxkKHZpZXcpO1xuICB9O1xuXG4gIGlmQmluZGVyLmNyZWF0ZWQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLm9uVXJsQ2hhbmdlID0gdGhpcy5vblVybENoYW5nZS5iaW5kKHRoaXMpO1xuICB9O1xuXG4gIHZhciBib3VuZCA9IGlmQmluZGVyLmJvdW5kO1xuICBpZkJpbmRlci5ib3VuZCA9IGZ1bmN0aW9uKCkge1xuICAgIGJvdW5kLmNhbGwodGhpcyk7XG4gICAgdmFyIG5vZGUgPSB0aGlzLmVsZW1lbnQucGFyZW50Tm9kZTtcbiAgICB3aGlsZSAobm9kZSAmJiBub2RlLm1hdGNoZWRSb3V0ZVBhdGgpIHtcbiAgICAgIG5vZGUgPSBub2RlLnBhcmVudE5vZGU7XG4gICAgfVxuICAgIHRoaXMuYmFzZVVSSSA9IG5vZGUubWF0Y2hlZFJvdXRlUGF0aCB8fCAnJztcbiAgICB0aGlzLmFwcC5vbigndXJsQ2hhbmdlJywgdGhpcy5vblVybENoYW5nZSk7XG4gICAgaWYgKHRoaXMuYXBwLmxpc3RlbmluZykge1xuICAgICAgdGhpcy5vblVybENoYW5nZSgpO1xuICAgIH1cbiAgfTtcblxuICBpZkJpbmRlci5vblVybENoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB1cmwgPSB0aGlzLmFwcC5sb2NhdGlvbi51cmw7XG4gICAgdmFyIG5ld0luZGV4O1xuXG4gICAgaWYgKHVybC5pbmRleE9mKHRoaXMuYmFzZVVSSSkgPT09IDApIHtcbiAgICAgIHVybCA9IHVybC5yZXBsYWNlKHRoaXMuYmFzZVVSSSwgJycpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBubyByb3V0ZXMgc2hvdWxkIG1hdGNoIHRoaXMgdXJsIHNpbmNlIGl0IGlzbid0IHdpdGhpbiBvdXIgc3VicGF0aFxuICAgICAgdXJsID0gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAodXJsICE9PSBudWxsKSB7XG4gICAgICB0aGlzLnJvdXRlcy5zb21lKGZ1bmN0aW9uKHJvdXRlLCBpbmRleCkge1xuICAgICAgICBpZiAocm91dGUubWF0Y2godXJsKSkge1xuICAgICAgICAgIHZhciBhZnRlckxlbmd0aCA9IHJvdXRlLnBhcmFtc1snKiddLmxlbmd0aDtcbiAgICAgICAgICB0aGlzLm1hdGNoZWRSb3V0ZVBhdGggPSBhZnRlckxlbmd0aCA/IHVybC5zbGljZSgwLCAtYWZ0ZXJMZW5ndGgpIDogdXJsO1xuICAgICAgICAgIHRoaXMuY29udGV4dC5wYXJhbXMgPSByb3V0ZS5wYXJhbXM7XG4gICAgICAgICAgbmV3SW5kZXggPSBpbmRleDtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfSwgdGhpcyk7XG4gICAgfVxuXG4gICAgaWYgKG5ld0luZGV4ICE9PSB0aGlzLmN1cnJlbnRJbmRleCkge1xuICAgICAgdGhpcy5jdXJyZW50SW5kZXggPSBuZXdJbmRleDtcbiAgICAgIHRoaXMudXBkYXRlZCh0aGlzLmN1cnJlbnRJbmRleCk7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiBpZkJpbmRlcjtcbn07XG4iLCJ2YXIgQXBwID0gcmVxdWlyZSgnLi9hcHAnKTtcblxuLy8gIyBDaGlwXG5cbi8vID4gQ2hpcC5qcyAyLjAuMFxuLy9cbi8vID4gKGMpIDIwMTMgSmFjb2IgV3JpZ2h0LCBUZWFtU25hcFxuLy8gQ2hpcCBtYXkgYmUgZnJlZWx5IGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cbi8vIEZvciBhbGwgZGV0YWlscyBhbmQgZG9jdW1lbnRhdGlvbjpcbi8vIDxodHRwczovL2dpdGh1Yi5jb20vdGVhbXNuYXAvY2hpcC8+XG5cbi8vIENvbnRlbnRzXG4vLyAtLS0tLS0tLVxuLy8gKiBbY2hpcF0oY2hpcC5odG1sKSB0aGUgbmFtZXNwYWNlLCBjcmVhdGVzIGFwcHMsIGFuZCByZWdpc3RlcnMgYmluZGluZ3MgYW5kIGZpbHRlcnNcbi8vICogW0FwcF0oYXBwLmh0bWwpIHJlcHJlc2VudHMgYW4gYXBwIHRoYXQgY2FuIGhhdmUgcm91dGVzLCBjb250cm9sbGVycywgYW5kIHRlbXBsYXRlcyBkZWZpbmVkXG4vLyAqIFtDb250cm9sbGVyXShjb250cm9sbGVyLmh0bWwpIGlzIHVzZWQgaW4gdGhlIGJpbmRpbmcgdG8gYXR0YWNoIGRhdGEgYW5kIHJ1biBhY3Rpb25zXG4vLyAqIFtSb3V0ZXJdKHJvdXRlci5odG1sKSBpcyB1c2VkIGZvciBoYW5kbGluZyBVUkwgcm91bnRpbmdcbi8vICogW0RlZmF1bHQgYmluZGVyc10oYmluZGVycy5odG1sKSByZWdpc3RlcnMgdGhlIGRlZmF1bHQgYmluZGVycyBjaGlwIHByb3ZpZGVzXG5cbi8vIENyZWF0ZSBDaGlwIEFwcFxuLy8gLS0tLS0tLS0tLS0tLVxuLy8gQ3JlYXRlcyBhIG5ldyBjaGlwIGFwcFxubW9kdWxlLmV4cG9ydHMgPSBjaGlwO1xuXG5mdW5jdGlvbiBjaGlwKG9wdGlvbnMpIHtcbiAgdmFyIGFwcCA9IG5ldyBBcHAob3B0aW9ucyk7XG4gIGFwcC5pbml0KCk7XG4gIHJldHVybiBhcHA7XG59XG5cbmNoaXAuQXBwID0gQXBwO1xuIiwidmFyIGNyZWF0ZUZyYWdtZW50cyA9IHJlcXVpcmUoJ2ZyYWdtZW50cy1qcycpLmNyZWF0ZTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcblxuICB2YXIgZnJhZ21lbnRzID0gY3JlYXRlRnJhZ21lbnRzKCk7XG5cbiAgLy8gQ29uZmlndXJlXG4gIGZyYWdtZW50cy5zZXRFeHByZXNzaW9uRGVsaW1pdGVycygnYXR0cmlidXRlJywgJ3t7JywgJ319JywgdHJ1ZSk7XG4gIGZyYWdtZW50cy5hbmltYXRlQXR0cmlidXRlID0gJ1thbmltYXRlXSc7XG4gIHJlcXVpcmUoJ2ZyYWdtZW50cy1idWlsdC1pbnMvYW5pbWF0aW9ucycpKGZyYWdtZW50cyk7XG4gIHJlcXVpcmUoJ2ZyYWdtZW50cy1idWlsdC1pbnMvZm9ybWF0dGVycycpKGZyYWdtZW50cyk7XG5cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCcoa2V5ZG93bjoqKScsIHJlcXVpcmUoJ2ZyYWdtZW50cy1idWlsdC1pbnMvYmluZGVycy9rZXktZXZlbnRzJykobnVsbCwgJ2tleWRvd24nKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnKGtleXVwOiopJywgcmVxdWlyZSgnZnJhZ21lbnRzLWJ1aWx0LWlucy9iaW5kZXJzL2tleS1ldmVudHMnKShudWxsLCAna2V5dXAnKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnKCopJywgcmVxdWlyZSgnZnJhZ21lbnRzLWJ1aWx0LWlucy9iaW5kZXJzL2V2ZW50cycpKCkpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ3sqfScsIHJlcXVpcmUoJ2ZyYWdtZW50cy1idWlsdC1pbnMvYmluZGVycy9wcm9wZXJ0aWVzJykoKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgne3sqfX0nLCByZXF1aXJlKCdmcmFnbWVudHMtYnVpbHQtaW5zL2JpbmRlcnMvcHJvcGVydGllcy0yLXdheScpKCkpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJyo/JywgcmVxdWlyZSgnZnJhZ21lbnRzLWJ1aWx0LWlucy9iaW5kZXJzL2F0dHJpYnV0ZS1uYW1lcycpKCkpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ1tzaG93XScsIHJlcXVpcmUoJ2ZyYWdtZW50cy1idWlsdC1pbnMvYmluZGVycy9zaG93JykoZmFsc2UpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdbaGlkZV0nLCByZXF1aXJlKCdmcmFnbWVudHMtYnVpbHQtaW5zL2JpbmRlcnMvc2hvdycpKHRydWUpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdbZm9yXScsIHJlcXVpcmUoJ2ZyYWdtZW50cy1idWlsdC1pbnMvYmluZGVycy9yZXBlYXQnKSgpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCcjKicsIHJlcXVpcmUoJ2ZyYWdtZW50cy1idWlsdC1pbnMvYmluZGVycy9yZWYnKSgpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdbdGV4dF0nLCByZXF1aXJlKCdmcmFnbWVudHMtYnVpbHQtaW5zL2JpbmRlcnMvdGV4dCcpKCkpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ1todG1sXScsIHJlcXVpcmUoJ2ZyYWdtZW50cy1idWlsdC1pbnMvYmluZGVycy9odG1sJykoKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnW3NyY10nLCByZXF1aXJlKCdmcmFnbWVudHMtYnVpbHQtaW5zL2JpbmRlcnMvcHJvcGVydGllcycpKCdzcmMnKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnW2xvZ10nLCByZXF1aXJlKCdmcmFnbWVudHMtYnVpbHQtaW5zL2JpbmRlcnMvbG9nJykoKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnWy4qXScsIHJlcXVpcmUoJ2ZyYWdtZW50cy1idWlsdC1pbnMvYmluZGVycy9jbGFzc2VzJykoKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnW3N0eWxlcy4qXScsIHJlcXVpcmUoJ2ZyYWdtZW50cy1idWlsdC1pbnMvYmluZGVycy9zdHlsZXMnKSgpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdbYXV0b2ZvY3VzXScsIHJlcXVpcmUoJ2ZyYWdtZW50cy1idWlsdC1pbnMvYmluZGVycy9hdXRvZm9jdXMnKSgpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdbYXV0b3NlbGVjdF0nLCByZXF1aXJlKCdmcmFnbWVudHMtYnVpbHQtaW5zL2JpbmRlcnMvYXV0b3NlbGVjdCcpKCkpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ1t2YWx1ZV0nLCByZXF1aXJlKCdmcmFnbWVudHMtYnVpbHQtaW5zL2JpbmRlcnMvdmFsdWUnKShcbiAgICAnW3ZhbHVlLWV2ZW50c10nLFxuICAgICdbdmFsdWUtZmllbGRdJ1xuICApKTtcblxuICB2YXIgSWZCaW5kaW5nID0gcmVxdWlyZSgnZnJhZ21lbnRzLWJ1aWx0LWlucy9iaW5kZXJzL2lmJykoJ1tlbHNlLWlmXScsICdbZWxzZV0nLCAnW3VubGVzc10nLCAnW3VubGVzcy1pZl0nKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdbaWZdJywgSWZCaW5kaW5nKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdbdW5sZXNzXScsIElmQmluZGluZyk7XG5cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdbcm91dGVdJywgcmVxdWlyZSgnLi9iaW5kZXJzL3JvdXRlJykoKSk7XG5cbiAgcmV0dXJuIGZyYWdtZW50cztcbn07XG4iLCJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYXBwKSB7XG5cbiAgcmV0dXJuIHtcblxuICAgIGFwcDogYXBwLFxuICAgIHN5bmM6IGFwcC5zeW5jLFxuICAgIHN5bmNOb3c6IGFwcC5zeW5jTm93LFxuICAgIGFmdGVyU3luYzogYXBwLmFmdGVyU3luYyxcbiAgICBvblN5bmM6IGFwcC5vblN5bmMsXG4gICAgb2ZmU3luYzogYXBwLm9mZlN5bmMsXG5cbiAgICBjcmVhdGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtcbiAgICAgICAgX29ic2VydmVyczogeyBjb25maWd1cmFibGU6IHRydWUsIHZhbHVlOiBbXSB9LFxuICAgICAgICBfbGlzdGVuZXJzOiB7IGNvbmZpZ3VyYWJsZTogdHJ1ZSwgdmFsdWU6IFtdIH0sXG4gICAgICAgIF9hdHRhY2hlZDogeyBjb25maWd1cmFibGU6IHRydWUsIHZhbHVlOiBmYWxzZSB9LFxuICAgICAgfSk7XG4gICAgfSxcblxuXG4gICAgYXR0YWNoZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5fYXR0YWNoZWQgPSB0cnVlO1xuICAgICAgdGhpcy5fb2JzZXJ2ZXJzLmZvckVhY2goZnVuY3Rpb24ob2JzZXJ2ZXIpIHtcbiAgICAgICAgb2JzZXJ2ZXIuYmluZCh0aGlzKTtcbiAgICAgIH0sIHRoaXMpO1xuXG4gICAgICB0aGlzLl9saXN0ZW5lcnMuZm9yRWFjaChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIGl0ZW0udGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoaXRlbS5ldmVudE5hbWUsIGl0ZW0ubGlzdGVuZXIpO1xuICAgICAgfSk7XG4gICAgfSxcblxuXG4gICAgZGV0YWNoZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5fYXR0YWNoZWQgPSBmYWxzZTtcbiAgICAgIHRoaXMuX29ic2VydmVycy5mb3JFYWNoKGZ1bmN0aW9uKG9ic2VydmVyKSB7XG4gICAgICAgIG9ic2VydmVyLnVuYmluZCgpO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuX2xpc3RlbmVycy5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgaXRlbS50YXJnZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcihpdGVtLmV2ZW50TmFtZSwgaXRlbS5saXN0ZW5lcik7XG4gICAgICB9KTtcbiAgICB9LFxuXG5cbiAgICBvYnNlcnZlOiBmdW5jdGlvbihleHByLCBjYWxsYmFjaykge1xuICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjayAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgIH1cblxuICAgICAgdmFyIG9ic2VydmVyID0gYXBwLm9ic2VydmUoZXhwciwgY2FsbGJhY2ssIHRoaXMpO1xuICAgICAgdGhpcy5fb2JzZXJ2ZXJzLnB1c2gob2JzZXJ2ZXIpO1xuICAgICAgaWYgKHRoaXMuX2F0dGFjaGVkKSB7XG4gICAgICAgIC8vIElmIG5vdCBhdHRhY2hlZCB3aWxsIGJpbmQgb24gYXR0YWNobWVudFxuICAgICAgICBvYnNlcnZlci5iaW5kKHRoaXMpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG9ic2VydmVyO1xuICAgIH0sXG5cblxuICAgIGxpc3RlbjogZnVuY3Rpb24odGFyZ2V0LCBldmVudE5hbWUsIGxpc3RlbmVyLCBjb250ZXh0KSB7XG4gICAgICBpZiAodHlwZW9mIHRhcmdldCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgY29udGV4dCA9IGxpc3RlbmVyO1xuICAgICAgICBsaXN0ZW5lciA9IGV2ZW50TmFtZTtcbiAgICAgICAgZXZlbnROYW1lID0gdGFyZ2V0O1xuICAgICAgICB0YXJnZXQgPSB0aGlzO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgICAgfVxuXG4gICAgICBsaXN0ZW5lciA9IGxpc3RlbmVyLmJpbmQoY29udGV4dCB8fCB0aGlzKTtcblxuICAgICAgdmFyIGxpc3RlbmVyRGF0YSA9IHtcbiAgICAgICAgdGFyZ2V0OiB0YXJnZXQsXG4gICAgICAgIGV2ZW50TmFtZTogZXZlbnROYW1lLFxuICAgICAgICBsaXN0ZW5lcjogbGlzdGVuZXJcbiAgICAgIH07XG5cbiAgICAgIHRoaXMuX2xpc3RlbmVycy5wdXNoKGxpc3RlbmVyRGF0YSk7XG5cbiAgICAgIGlmICh0aGlzLl9hdHRhY2hlZCkge1xuICAgICAgICAvLyBJZiBub3QgYXR0YWNoZWQgd2lsbCBhZGQgb24gYXR0YWNobWVudFxuICAgICAgICB0YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGxpc3RlbmVyKTtcbiAgICAgIH1cbiAgICB9LFxuICB9O1xufTtcbiIsIi8qXG5Db3B5cmlnaHQgKGMpIDIwMTUgSmFjb2IgV3JpZ2h0IDxqYWN3cmlnaHRAZ21haWwuY29tPlxuXG5QZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG5vZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG5pbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG50byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG5jb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbmZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG5cblRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG5hbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cblxuVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG5GSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbkFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbkxJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG5PVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG5USEUgU09GVFdBUkUuXG4qL1xuLy8gIyBEaWZmXG4vLyA+IEJhc2VkIG9uIHdvcmsgZnJvbSBHb29nbGUncyBvYnNlcnZlLWpzIHBvbHlmaWxsOiBodHRwczovL2dpdGh1Yi5jb20vUG9seW1lci9vYnNlcnZlLWpzXG5cbi8vIEEgbmFtZXNwYWNlIHRvIHN0b3JlIHRoZSBmdW5jdGlvbnMgb25cbnZhciBkaWZmID0gZXhwb3J0cztcblxuKGZ1bmN0aW9uKCkge1xuXG4gIGRpZmYuY2xvbmUgPSBjbG9uZTtcbiAgZGlmZi52YWx1ZXMgPSBkaWZmVmFsdWVzO1xuICBkaWZmLmJhc2ljID0gZGlmZkJhc2ljO1xuICBkaWZmLm9iamVjdHMgPSBkaWZmT2JqZWN0cztcbiAgZGlmZi5hcnJheXMgPSBkaWZmQXJyYXlzO1xuXG5cbiAgLy8gQSBjaGFuZ2UgcmVjb3JkIGZvciB0aGUgb2JqZWN0IGNoYW5nZXNcbiAgZnVuY3Rpb24gQ2hhbmdlUmVjb3JkKG9iamVjdCwgdHlwZSwgbmFtZSwgb2xkVmFsdWUpIHtcbiAgICB0aGlzLm9iamVjdCA9IG9iamVjdDtcbiAgICB0aGlzLnR5cGUgPSB0eXBlO1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgdGhpcy5vbGRWYWx1ZSA9IG9sZFZhbHVlO1xuICB9XG5cbiAgLy8gQSBzcGxpY2UgcmVjb3JkIGZvciB0aGUgYXJyYXkgY2hhbmdlc1xuICBmdW5jdGlvbiBTcGxpY2Uob2JqZWN0LCBpbmRleCwgcmVtb3ZlZCwgYWRkZWRDb3VudCkge1xuICAgIENoYW5nZVJlY29yZC5jYWxsKHRoaXMsIG9iamVjdCwgJ3NwbGljZScsIFN0cmluZyhpbmRleCkpO1xuICAgIHRoaXMuaW5kZXggPSBpbmRleDtcbiAgICB0aGlzLnJlbW92ZWQgPSByZW1vdmVkO1xuICAgIHRoaXMuYWRkZWRDb3VudCA9IGFkZGVkQ291bnQ7XG4gIH1cblxuICBTcGxpY2UucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShDaGFuZ2VSZWNvcmQucHJvdG90eXBlKTtcblxuXG4gIC8vIENyZWF0ZXMgYSBjbG9uZSBvciBjb3B5IG9mIGFuIGFycmF5IG9yIG9iamVjdCAob3Igc2ltcGx5IHJldHVybnMgYSBzdHJpbmcvbnVtYmVyL2Jvb2xlYW4gd2hpY2ggYXJlIGltbXV0YWJsZSlcbiAgLy8gRG9lcyBub3QgcHJvdmlkZSBkZWVwIGNvcGllcy5cbiAgZnVuY3Rpb24gY2xvbmUodmFsdWUsIGRlZXApIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgIGlmIChkZWVwKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5tYXAoZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gY2xvbmUodmFsdWUsIGRlZXApO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5zbGljZSgpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgaWYgKHZhbHVlLnZhbHVlT2YoKSAhPT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIG5ldyB2YWx1ZS5jb25zdHJ1Y3Rvcih2YWx1ZS52YWx1ZU9mKCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGNvcHkgPSB7fTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHZhbHVlKSB7XG4gICAgICAgICAgdmFyIG9ialZhbHVlID0gdmFsdWVba2V5XTtcbiAgICAgICAgICBpZiAoZGVlcCkge1xuICAgICAgICAgICAgb2JqVmFsdWUgPSBjbG9uZShvYmpWYWx1ZSwgZGVlcCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvcHlba2V5XSA9IG9ialZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjb3B5O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICB9XG5cblxuICAvLyBEaWZmcyB0d28gdmFsdWVzLCByZXR1cm5pbmcgYSB0cnV0aHkgdmFsdWUgaWYgdGhlcmUgYXJlIGNoYW5nZXMgb3IgYGZhbHNlYCBpZiB0aGVyZSBhcmUgbm8gY2hhbmdlcy4gSWYgdGhlIHR3b1xuICAvLyB2YWx1ZXMgYXJlIGJvdGggYXJyYXlzIG9yIGJvdGggb2JqZWN0cywgYW4gYXJyYXkgb2YgY2hhbmdlcyAoc3BsaWNlcyBvciBjaGFuZ2UgcmVjb3JkcykgYmV0d2VlbiB0aGUgdHdvIHdpbGwgYmVcbiAgLy8gcmV0dXJuZWQuIE90aGVyd2lzZSAgYHRydWVgIHdpbGwgYmUgcmV0dXJuZWQuXG4gIGZ1bmN0aW9uIGRpZmZWYWx1ZXModmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgLy8gU2hvcnRjdXQgb3V0IGZvciB2YWx1ZXMgdGhhdCBhcmUgZXhhY3RseSBlcXVhbFxuICAgIGlmICh2YWx1ZSA9PT0gb2xkVmFsdWUpIHJldHVybiBmYWxzZTtcblxuICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSAmJiBBcnJheS5pc0FycmF5KG9sZFZhbHVlKSkge1xuICAgICAgLy8gSWYgYW4gYXJyYXkgaGFzIGNoYW5nZWQgY2FsY3VsYXRlIHRoZSBzcGxpY2VzXG4gICAgICB2YXIgc3BsaWNlcyA9IGRpZmZBcnJheXModmFsdWUsIG9sZFZhbHVlKTtcbiAgICAgIHJldHVybiBzcGxpY2VzLmxlbmd0aCA/IHNwbGljZXMgOiBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKHZhbHVlICYmIG9sZFZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG9sZFZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgLy8gSWYgYW4gb2JqZWN0IGhhcyBjaGFuZ2VkIGNhbGN1bGF0ZSB0aGUgY2huYWdlcyBhbmQgY2FsbCB0aGUgY2FsbGJhY2tcbiAgICAgIC8vIEFsbG93IGRhdGVzIGFuZCBOdW1iZXIvU3RyaW5nIG9iamVjdHMgdG8gYmUgY29tcGFyZWRcbiAgICAgIHZhciB2YWx1ZVZhbHVlID0gdmFsdWUudmFsdWVPZigpO1xuICAgICAgdmFyIG9sZFZhbHVlVmFsdWUgPSBvbGRWYWx1ZS52YWx1ZU9mKCk7XG5cbiAgICAgIC8vIEFsbG93IGRhdGVzIGFuZCBOdW1iZXIvU3RyaW5nIG9iamVjdHMgdG8gYmUgY29tcGFyZWRcbiAgICAgIGlmICh0eXBlb2YgdmFsdWVWYWx1ZSAhPT0gJ29iamVjdCcgJiYgdHlwZW9mIG9sZFZhbHVlVmFsdWUgIT09ICdvYmplY3QnKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZVZhbHVlICE9PSBvbGRWYWx1ZVZhbHVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGNoYW5nZVJlY29yZHMgPSBkaWZmT2JqZWN0cyh2YWx1ZSwgb2xkVmFsdWUpO1xuICAgICAgICByZXR1cm4gY2hhbmdlUmVjb3Jkcy5sZW5ndGggPyBjaGFuZ2VSZWNvcmRzIDogZmFsc2U7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElmIGEgdmFsdWUgaGFzIGNoYW5nZWQgY2FsbCB0aGUgY2FsbGJhY2tcbiAgICAgIHJldHVybiBkaWZmQmFzaWModmFsdWUsIG9sZFZhbHVlKTtcbiAgICB9XG4gIH1cblxuXG4gIC8vIERpZmZzIHR3byBiYXNpYyB0eXBlcywgcmV0dXJuaW5nIHRydWUgaWYgY2hhbmdlZCBvciBmYWxzZSBpZiBub3RcbiAgZnVuY3Rpb24gZGlmZkJhc2ljKHZhbHVlLCBvbGRWYWx1ZSkge1xuICAgIGlmICh2YWx1ZSAmJiBvbGRWYWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHR5cGVvZiBvbGRWYWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIC8vIEFsbG93IGRhdGVzIGFuZCBOdW1iZXIvU3RyaW5nIG9iamVjdHMgdG8gYmUgY29tcGFyZWRcbiAgICAgIHZhciB2YWx1ZVZhbHVlID0gdmFsdWUudmFsdWVPZigpO1xuICAgICAgdmFyIG9sZFZhbHVlVmFsdWUgPSBvbGRWYWx1ZS52YWx1ZU9mKCk7XG5cbiAgICAgIC8vIEFsbG93IGRhdGVzIGFuZCBOdW1iZXIvU3RyaW5nIG9iamVjdHMgdG8gYmUgY29tcGFyZWRcbiAgICAgIGlmICh0eXBlb2YgdmFsdWVWYWx1ZSAhPT0gJ29iamVjdCcgJiYgdHlwZW9mIG9sZFZhbHVlVmFsdWUgIT09ICdvYmplY3QnKSB7XG4gICAgICAgIHJldHVybiBkaWZmQmFzaWModmFsdWVWYWx1ZSwgb2xkVmFsdWVWYWx1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gSWYgYSB2YWx1ZSBoYXMgY2hhbmdlZCBjYWxsIHRoZSBjYWxsYmFja1xuICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInICYmIHR5cGVvZiBvbGRWYWx1ZSA9PT0gJ251bWJlcicgJiYgaXNOYU4odmFsdWUpICYmIGlzTmFOKG9sZFZhbHVlKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdmFsdWUgIT09IG9sZFZhbHVlO1xuICAgIH1cbiAgfVxuXG5cbiAgLy8gRGlmZnMgdHdvIG9iamVjdHMgcmV0dXJuaW5nIGFuIGFycmF5IG9mIGNoYW5nZSByZWNvcmRzLiBUaGUgY2hhbmdlIHJlY29yZCBsb29rcyBsaWtlOlxuICAvLyBgYGBqYXZhc2NyaXB0XG4gIC8vIHtcbiAgLy8gICBvYmplY3Q6IG9iamVjdCxcbiAgLy8gICB0eXBlOiAnZGVsZXRlZHx1cGRhdGVkfG5ldycsXG4gIC8vICAgbmFtZTogJ3Byb3BlcnR5TmFtZScsXG4gIC8vICAgb2xkVmFsdWU6IG9sZFZhbHVlXG4gIC8vIH1cbiAgLy8gYGBgXG4gIGZ1bmN0aW9uIGRpZmZPYmplY3RzKHZhbHVlLCBvbGRWYWx1ZSkge1xuICAgIGlmICggISh2YWx1ZSAmJiBvbGRWYWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHR5cGVvZiBvbGRWYWx1ZSA9PT0gJ29iamVjdCcpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCb3RoIHZhbHVlcyBmb3IgZGlmZi5vYmplY3QgbXVzdCBiZSBvYmplY3RzJyk7XG4gICAgfVxuICAgIHZhciBjaGFuZ2VSZWNvcmRzID0gW107XG4gICAgdmFyIHByb3AsIHByb3BPbGRWYWx1ZSwgcHJvcFZhbHVlO1xuXG4gICAgLy8gR29lcyB0aHJvdWdoIHRoZSBvbGQgb2JqZWN0IChzaG91bGQgYmUgYSBjbG9uZSkgYW5kIGxvb2sgZm9yIHRoaW5ncyB0aGF0IGFyZSBub3cgZ29uZSBvciBjaGFuZ2VkXG4gICAgZm9yIChwcm9wIGluIG9sZFZhbHVlKSB7XG4gICAgICBwcm9wT2xkVmFsdWUgPSBvbGRWYWx1ZVtwcm9wXTtcbiAgICAgIHByb3BWYWx1ZSA9IHZhbHVlW3Byb3BdO1xuXG4gICAgICAvLyBBbGxvdyBmb3IgdGhlIGNhc2Ugb2Ygb2JqLnByb3AgPSB1bmRlZmluZWQgKHdoaWNoIGlzIGEgbmV3IHByb3BlcnR5LCBldmVuIGlmIGl0IGlzIHVuZGVmaW5lZClcbiAgICAgIGlmIChwcm9wVmFsdWUgIT09IHVuZGVmaW5lZCAmJiAhZGlmZkJhc2ljKHByb3BWYWx1ZSwgcHJvcE9sZFZhbHVlKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgLy8gSWYgdGhlIHByb3BlcnR5IGlzIGdvbmUgaXQgd2FzIHJlbW92ZWRcbiAgICAgIGlmICghIChwcm9wIGluIHZhbHVlKSkge1xuICAgICAgICBjaGFuZ2VSZWNvcmRzLnB1c2gobmV3IENoYW5nZVJlY29yZCh2YWx1ZSwgJ2RlbGV0ZScsIHByb3AsIHByb3BPbGRWYWx1ZSkpO1xuICAgICAgfSBlbHNlIGlmIChkaWZmQmFzaWMocHJvcFZhbHVlLCBwcm9wT2xkVmFsdWUpKSB7XG4gICAgICAgIGNoYW5nZVJlY29yZHMucHVzaChuZXcgQ2hhbmdlUmVjb3JkKHZhbHVlLCAndXBkYXRlJywgcHJvcCwgcHJvcE9sZFZhbHVlKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gR29lcyB0aHJvdWdoIHRoZSBvbGQgb2JqZWN0IGFuZCBsb29rcyBmb3IgdGhpbmdzIHRoYXQgYXJlIG5ld1xuICAgIGZvciAocHJvcCBpbiB2YWx1ZSkge1xuICAgICAgcHJvcFZhbHVlID0gdmFsdWVbcHJvcF07XG4gICAgICBpZiAoISAocHJvcCBpbiBvbGRWYWx1ZSkpIHtcbiAgICAgICAgY2hhbmdlUmVjb3Jkcy5wdXNoKG5ldyBDaGFuZ2VSZWNvcmQodmFsdWUsICdhZGQnLCBwcm9wKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpICYmIHZhbHVlLmxlbmd0aCAhPT0gb2xkVmFsdWUubGVuZ3RoKSB7XG4gICAgICBjaGFuZ2VSZWNvcmRzLnB1c2gobmV3IENoYW5nZVJlY29yZCh2YWx1ZSwgJ3VwZGF0ZScsICdsZW5ndGgnLCBvbGRWYWx1ZS5sZW5ndGgpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY2hhbmdlUmVjb3JkcztcbiAgfVxuXG5cblxuXG5cbiAgdmFyIEVESVRfTEVBVkUgPSAwO1xuICB2YXIgRURJVF9VUERBVEUgPSAxO1xuICB2YXIgRURJVF9BREQgPSAyO1xuICB2YXIgRURJVF9ERUxFVEUgPSAzO1xuXG5cbiAgLy8gRGlmZnMgdHdvIGFycmF5cyByZXR1cm5pbmcgYW4gYXJyYXkgb2Ygc3BsaWNlcy4gQSBzcGxpY2Ugb2JqZWN0IGxvb2tzIGxpa2U6XG4gIC8vIGBgYGphdmFzY3JpcHRcbiAgLy8ge1xuICAvLyAgIGluZGV4OiAzLFxuICAvLyAgIHJlbW92ZWQ6IFtpdGVtLCBpdGVtXSxcbiAgLy8gICBhZGRlZENvdW50OiAwXG4gIC8vIH1cbiAgLy8gYGBgXG4gIGZ1bmN0aW9uIGRpZmZBcnJheXModmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlKSB8fCAhQXJyYXkuaXNBcnJheShvbGRWYWx1ZSkpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0JvdGggdmFsdWVzIGZvciBkaWZmLmFycmF5IG11c3QgYmUgYXJyYXlzJyk7XG4gICAgfVxuXG4gICAgdmFyIGN1cnJlbnRTdGFydCA9IDA7XG4gICAgdmFyIGN1cnJlbnRFbmQgPSB2YWx1ZS5sZW5ndGg7XG4gICAgdmFyIG9sZFN0YXJ0ID0gMDtcbiAgICB2YXIgb2xkRW5kID0gb2xkVmFsdWUubGVuZ3RoO1xuXG4gICAgdmFyIG1pbkxlbmd0aCA9IE1hdGgubWluKGN1cnJlbnRFbmQsIG9sZEVuZCk7XG4gICAgdmFyIHByZWZpeENvdW50ID0gc2hhcmVkUHJlZml4KHZhbHVlLCBvbGRWYWx1ZSwgbWluTGVuZ3RoKTtcbiAgICB2YXIgc3VmZml4Q291bnQgPSBzaGFyZWRTdWZmaXgodmFsdWUsIG9sZFZhbHVlLCBtaW5MZW5ndGggLSBwcmVmaXhDb3VudCk7XG5cbiAgICBjdXJyZW50U3RhcnQgKz0gcHJlZml4Q291bnQ7XG4gICAgb2xkU3RhcnQgKz0gcHJlZml4Q291bnQ7XG4gICAgY3VycmVudEVuZCAtPSBzdWZmaXhDb3VudDtcbiAgICBvbGRFbmQgLT0gc3VmZml4Q291bnQ7XG5cbiAgICBpZiAoY3VycmVudEVuZCAtIGN1cnJlbnRTdGFydCA9PT0gMCAmJiBvbGRFbmQgLSBvbGRTdGFydCA9PT0gMCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIC8vIGlmIG5vdGhpbmcgd2FzIGFkZGVkLCBvbmx5IHJlbW92ZWQgZnJvbSBvbmUgc3BvdFxuICAgIGlmIChjdXJyZW50U3RhcnQgPT09IGN1cnJlbnRFbmQpIHtcbiAgICAgIHJldHVybiBbIG5ldyBTcGxpY2UodmFsdWUsIGN1cnJlbnRTdGFydCwgb2xkVmFsdWUuc2xpY2Uob2xkU3RhcnQsIG9sZEVuZCksIDApIF07XG4gICAgfVxuXG4gICAgLy8gaWYgbm90aGluZyB3YXMgcmVtb3ZlZCwgb25seSBhZGRlZCB0byBvbmUgc3BvdFxuICAgIGlmIChvbGRTdGFydCA9PT0gb2xkRW5kKSB7XG4gICAgICByZXR1cm4gWyBuZXcgU3BsaWNlKHZhbHVlLCBjdXJyZW50U3RhcnQsIFtdLCBjdXJyZW50RW5kIC0gY3VycmVudFN0YXJ0KSBdO1xuICAgIH1cblxuICAgIC8vIGEgbWl4dHVyZSBvZiBhZGRzIGFuZCByZW1vdmVzXG4gICAgdmFyIGRpc3RhbmNlcyA9IGNhbGNFZGl0RGlzdGFuY2VzKHZhbHVlLCBjdXJyZW50U3RhcnQsIGN1cnJlbnRFbmQsIG9sZFZhbHVlLCBvbGRTdGFydCwgb2xkRW5kKTtcbiAgICB2YXIgb3BzID0gc3BsaWNlT3BlcmF0aW9uc0Zyb21FZGl0RGlzdGFuY2VzKGRpc3RhbmNlcyk7XG5cbiAgICB2YXIgc3BsaWNlID0gbnVsbDtcbiAgICB2YXIgc3BsaWNlcyA9IFtdO1xuICAgIHZhciBpbmRleCA9IGN1cnJlbnRTdGFydDtcbiAgICB2YXIgb2xkSW5kZXggPSBvbGRTdGFydDtcblxuICAgIGZvciAodmFyIGkgPSAwLCBsID0gb3BzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgdmFyIG9wID0gb3BzW2ldO1xuICAgICAgaWYgKG9wID09PSBFRElUX0xFQVZFKSB7XG4gICAgICAgIGlmIChzcGxpY2UpIHtcbiAgICAgICAgICBzcGxpY2VzLnB1c2goc3BsaWNlKTtcbiAgICAgICAgICBzcGxpY2UgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgaW5kZXgrKztcbiAgICAgICAgb2xkSW5kZXgrKztcbiAgICAgIH0gZWxzZSBpZiAob3AgPT09IEVESVRfVVBEQVRFKSB7XG4gICAgICAgIGlmICghc3BsaWNlKSB7XG4gICAgICAgICAgc3BsaWNlID0gbmV3IFNwbGljZSh2YWx1ZSwgaW5kZXgsIFtdLCAwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNwbGljZS5hZGRlZENvdW50Kys7XG4gICAgICAgIGluZGV4Kys7XG5cbiAgICAgICAgc3BsaWNlLnJlbW92ZWQucHVzaChvbGRWYWx1ZVtvbGRJbmRleF0pO1xuICAgICAgICBvbGRJbmRleCsrO1xuICAgICAgfSBlbHNlIGlmIChvcCA9PT0gRURJVF9BREQpIHtcbiAgICAgICAgaWYgKCFzcGxpY2UpIHtcbiAgICAgICAgICBzcGxpY2UgPSBuZXcgU3BsaWNlKHZhbHVlLCBpbmRleCwgW10sIDApO1xuICAgICAgICB9XG5cbiAgICAgICAgc3BsaWNlLmFkZGVkQ291bnQrKztcbiAgICAgICAgaW5kZXgrKztcbiAgICAgIH0gZWxzZSBpZiAob3AgPT09IEVESVRfREVMRVRFKSB7XG4gICAgICAgIGlmICghc3BsaWNlKSB7XG4gICAgICAgICAgc3BsaWNlID0gbmV3IFNwbGljZSh2YWx1ZSwgaW5kZXgsIFtdLCAwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNwbGljZS5yZW1vdmVkLnB1c2gob2xkVmFsdWVbb2xkSW5kZXhdKTtcbiAgICAgICAgb2xkSW5kZXgrKztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc3BsaWNlKSB7XG4gICAgICBzcGxpY2VzLnB1c2goc3BsaWNlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3BsaWNlcztcbiAgfVxuXG5cblxuXG4gIC8vIGZpbmQgdGhlIG51bWJlciBvZiBpdGVtcyBhdCB0aGUgYmVnaW5uaW5nIHRoYXQgYXJlIHRoZSBzYW1lXG4gIGZ1bmN0aW9uIHNoYXJlZFByZWZpeChjdXJyZW50LCBvbGQsIHNlYXJjaExlbmd0aCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2VhcmNoTGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChkaWZmQmFzaWMoY3VycmVudFtpXSwgb2xkW2ldKSkge1xuICAgICAgICByZXR1cm4gaTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHNlYXJjaExlbmd0aDtcbiAgfVxuXG5cbiAgLy8gZmluZCB0aGUgbnVtYmVyIG9mIGl0ZW1zIGF0IHRoZSBlbmQgdGhhdCBhcmUgdGhlIHNhbWVcbiAgZnVuY3Rpb24gc2hhcmVkU3VmZml4KGN1cnJlbnQsIG9sZCwgc2VhcmNoTGVuZ3RoKSB7XG4gICAgdmFyIGluZGV4MSA9IGN1cnJlbnQubGVuZ3RoO1xuICAgIHZhciBpbmRleDIgPSBvbGQubGVuZ3RoO1xuICAgIHZhciBjb3VudCA9IDA7XG4gICAgd2hpbGUgKGNvdW50IDwgc2VhcmNoTGVuZ3RoICYmICFkaWZmQmFzaWMoY3VycmVudFstLWluZGV4MV0sIG9sZFstLWluZGV4Ml0pKSB7XG4gICAgICBjb3VudCsrO1xuICAgIH1cbiAgICByZXR1cm4gY291bnQ7XG4gIH1cblxuXG4gIGZ1bmN0aW9uIHNwbGljZU9wZXJhdGlvbnNGcm9tRWRpdERpc3RhbmNlcyhkaXN0YW5jZXMpIHtcbiAgICB2YXIgaSA9IGRpc3RhbmNlcy5sZW5ndGggLSAxO1xuICAgIHZhciBqID0gZGlzdGFuY2VzWzBdLmxlbmd0aCAtIDE7XG4gICAgdmFyIGN1cnJlbnQgPSBkaXN0YW5jZXNbaV1bal07XG4gICAgdmFyIGVkaXRzID0gW107XG4gICAgd2hpbGUgKGkgPiAwIHx8IGogPiAwKSB7XG4gICAgICBpZiAoaSA9PT0gMCkge1xuICAgICAgICBlZGl0cy5wdXNoKEVESVRfQUREKTtcbiAgICAgICAgai0tO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGogPT09IDApIHtcbiAgICAgICAgZWRpdHMucHVzaChFRElUX0RFTEVURSk7XG4gICAgICAgIGktLTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIHZhciBub3J0aFdlc3QgPSBkaXN0YW5jZXNbaSAtIDFdW2ogLSAxXTtcbiAgICAgIHZhciB3ZXN0ID0gZGlzdGFuY2VzW2kgLSAxXVtqXTtcbiAgICAgIHZhciBub3J0aCA9IGRpc3RhbmNlc1tpXVtqIC0gMV07XG4gICAgICB2YXIgbWluO1xuXG4gICAgICBpZiAod2VzdCA8IG5vcnRoKSB7XG4gICAgICAgIG1pbiA9IHdlc3QgPCBub3J0aFdlc3QgPyB3ZXN0IDogbm9ydGhXZXN0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbWluID0gbm9ydGggPCBub3J0aFdlc3QgPyBub3J0aCA6IG5vcnRoV2VzdDtcbiAgICAgIH1cblxuICAgICAgaWYgKG1pbiA9PT0gbm9ydGhXZXN0KSB7XG4gICAgICAgIGlmIChub3J0aFdlc3QgPT09IGN1cnJlbnQpIHtcbiAgICAgICAgICBlZGl0cy5wdXNoKEVESVRfTEVBVkUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGVkaXRzLnB1c2goRURJVF9VUERBVEUpO1xuICAgICAgICAgIGN1cnJlbnQgPSBub3J0aFdlc3Q7XG4gICAgICAgIH1cbiAgICAgICAgaS0tO1xuICAgICAgICBqLS07XG4gICAgICB9IGVsc2UgaWYgKG1pbiA9PT0gd2VzdCkge1xuICAgICAgICBlZGl0cy5wdXNoKEVESVRfREVMRVRFKTtcbiAgICAgICAgaS0tO1xuICAgICAgICBjdXJyZW50ID0gd2VzdDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVkaXRzLnB1c2goRURJVF9BREQpO1xuICAgICAgICBqLS07XG4gICAgICAgIGN1cnJlbnQgPSBub3J0aDtcbiAgICAgIH1cbiAgICB9XG4gICAgZWRpdHMucmV2ZXJzZSgpO1xuICAgIHJldHVybiBlZGl0cztcbiAgfVxuXG5cbiAgZnVuY3Rpb24gY2FsY0VkaXREaXN0YW5jZXMoY3VycmVudCwgY3VycmVudFN0YXJ0LCBjdXJyZW50RW5kLCBvbGQsIG9sZFN0YXJ0LCBvbGRFbmQpIHtcbiAgICAvLyBcIkRlbGV0aW9uXCIgY29sdW1uc1xuICAgIHZhciByb3dDb3VudCA9IG9sZEVuZCAtIG9sZFN0YXJ0ICsgMTtcbiAgICB2YXIgY29sdW1uQ291bnQgPSBjdXJyZW50RW5kIC0gY3VycmVudFN0YXJ0ICsgMTtcbiAgICB2YXIgZGlzdGFuY2VzID0gbmV3IEFycmF5KHJvd0NvdW50KTtcbiAgICB2YXIgaSwgajtcblxuICAgIC8vIFwiQWRkaXRpb25cIiByb3dzLiBJbml0aWFsaXplIG51bGwgY29sdW1uLlxuICAgIGZvciAoaSA9IDA7IGkgPCByb3dDb3VudDsgaSsrKSB7XG4gICAgICBkaXN0YW5jZXNbaV0gPSBuZXcgQXJyYXkoY29sdW1uQ291bnQpO1xuICAgICAgZGlzdGFuY2VzW2ldWzBdID0gaTtcbiAgICB9XG5cbiAgICAvLyBJbml0aWFsaXplIG51bGwgcm93XG4gICAgZm9yIChqID0gMDsgaiA8IGNvbHVtbkNvdW50OyBqKyspIHtcbiAgICAgIGRpc3RhbmNlc1swXVtqXSA9IGo7XG4gICAgfVxuXG4gICAgZm9yIChpID0gMTsgaSA8IHJvd0NvdW50OyBpKyspIHtcbiAgICAgIGZvciAoaiA9IDE7IGogPCBjb2x1bW5Db3VudDsgaisrKSB7XG4gICAgICAgIGlmICghZGlmZkJhc2ljKGN1cnJlbnRbY3VycmVudFN0YXJ0ICsgaiAtIDFdLCBvbGRbb2xkU3RhcnQgKyBpIC0gMV0pKSB7XG4gICAgICAgICAgZGlzdGFuY2VzW2ldW2pdID0gZGlzdGFuY2VzW2kgLSAxXVtqIC0gMV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFyIG5vcnRoID0gZGlzdGFuY2VzW2kgLSAxXVtqXSArIDE7XG4gICAgICAgICAgdmFyIHdlc3QgPSBkaXN0YW5jZXNbaV1baiAtIDFdICsgMTtcbiAgICAgICAgICBkaXN0YW5jZXNbaV1bal0gPSBub3J0aCA8IHdlc3QgPyBub3J0aCA6IHdlc3Q7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZGlzdGFuY2VzO1xuICB9XG59KSgpO1xuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL3NyYy9leHByZXNzaW9ucycpO1xuIiwidmFyIHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xudmFyIHN0cmluZ3MgPSByZXF1aXJlKCcuL3N0cmluZ3MnKTtcbnZhciBmb3JtYXR0ZXJQYXJzZXIgPSByZXF1aXJlKCcuL2Zvcm1hdHRlcnMnKTtcbnZhciBwcm9wZXJ0eUNoYWlucyA9IHJlcXVpcmUoJy4vcHJvcGVydHktY2hhaW5zJyk7XG52YXIgdmFsdWVQcm9wZXJ0eSA9ICdfdmFsdWVfJztcbnZhciBjYWNoZSA9IHt9O1xuXG5leHBvcnRzLmdsb2JhbHMgPSB7fTtcblxuXG5leHBvcnRzLnBhcnNlID0gZnVuY3Rpb24oZXhwciwgZ2xvYmFscywgZm9ybWF0dGVycywgZXh0cmFBcmdzKSB7XG4gIGlmICghQXJyYXkuaXNBcnJheShleHRyYUFyZ3MpKSBleHRyYUFyZ3MgPSBbXTtcbiAgdmFyIGNhY2hlS2V5ID0gZXhwciArICd8JyArIGV4dHJhQXJncy5qb2luKCcsJyk7XG4gIC8vIFJldHVybnMgdGhlIGNhY2hlZCBmdW5jdGlvbiBmb3IgdGhpcyBleHByZXNzaW9uIGlmIGl0IGV4aXN0cy5cbiAgdmFyIGZ1bmMgPSBjYWNoZVtjYWNoZUtleV07XG4gIGlmIChmdW5jKSB7XG4gICAgcmV0dXJuIGZ1bmM7XG4gIH1cblxuICB2YXIgb3JpZ2luYWwgPSBleHByO1xuICB2YXIgaXNTZXR0ZXIgPSAoZXh0cmFBcmdzWzBdID09PSB2YWx1ZVByb3BlcnR5KTtcbiAgLy8gQWxsb3cgJyFwcm9wJyB0byBiZWNvbWUgJ3Byb3AgPSAhdmFsdWUnXG4gIGlmIChpc1NldHRlciAmJiBleHByLmNoYXJBdCgwKSA9PT0gJyEnKSB7XG4gICAgZXhwciA9IGV4cHIuc2xpY2UoMSk7XG4gICAgdmFsdWVQcm9wZXJ0eSA9ICchJyArIHZhbHVlUHJvcGVydHk7XG4gIH1cblxuICBleHByID0gc3RyaW5ncy5wdWxsT3V0U3RyaW5ncyhleHByKTtcbiAgZXhwciA9IGZvcm1hdHRlclBhcnNlci5wYXJzZUZvcm1hdHRlcnMoZXhwcik7XG4gIGV4cHIgPSBwcm9wZXJ0eUNoYWlucy5wYXJzZUV4cHJlc3Npb24oZXhwciwgZ2V0VmFyaWFibGVzKGdsb2JhbHMsIGV4dHJhQXJncykpO1xuICBpZiAoIWlzU2V0dGVyKSB7XG4gICAgdmFyIGxpbmVzID0gZXhwci5zcGxpdCgnXFxuJyk7XG4gICAgbGluZXNbbGluZXMubGVuZ3RoIC0gMV0gPSAncmV0dXJuICcgKyBsaW5lc1tsaW5lcy5sZW5ndGggLSAxXTtcbiAgICBleHByID0gbGluZXMuam9pbignXFxuJyk7XG4gIH1cbiAgZXhwciA9IHN0cmluZ3MucHV0SW5TdHJpbmdzKGV4cHIpO1xuICBmdW5jID0gY29tcGlsZUV4cHJlc3Npb24ob3JpZ2luYWwsIGV4cHIsIGdsb2JhbHMsIGZvcm1hdHRlcnMsIGV4dHJhQXJncyk7XG4gIGZ1bmMuZXhwciA9IGV4cHI7XG4gIGNhY2hlW2NhY2hlS2V5XSA9IGZ1bmM7XG4gIHJldHVybiBmdW5jO1xufTtcblxuXG5leHBvcnRzLnBhcnNlU2V0dGVyID0gZnVuY3Rpb24oZXhwciwgZ2xvYmFscywgZm9ybWF0dGVycywgZXh0cmFBcmdzKSB7XG4gIGlmICghQXJyYXkuaXNBcnJheShleHRyYUFyZ3MpKSBleHRyYUFyZ3MgPSBbXTtcblxuICAvLyBBZGQgX3ZhbHVlXyBhcyB0aGUgZmlyc3QgZXh0cmEgYXJndW1lbnRcbiAgZXh0cmFBcmdzLnVuc2hpZnQodmFsdWVQcm9wZXJ0eSk7XG4gIGV4cHIgPSBleHByLnJlcGxhY2UoLyhcXHMqXFx8fCQpLywgJyA9IF92YWx1ZV8kMScpO1xuXG4gIHJldHVybiBleHBvcnRzLnBhcnNlKGV4cHIsIGdsb2JhbHMsIGZvcm1hdHRlcnMsIGV4dHJhQXJncyk7XG59O1xuXG5cbmZ1bmN0aW9uIGdldFZhcmlhYmxlcyhnbG9iYWxzLCBleHRyYUFyZ3MpIHtcbiAgdmFyIHZhcmlhYmxlcyA9IHt9O1xuXG4gIE9iamVjdC5rZXlzKGV4cG9ydHMuZ2xvYmFscykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICB2YXJpYWJsZXNba2V5XSA9IGV4cG9ydHMuZ2xvYmFsc1trZXldO1xuICB9KTtcblxuICBpZiAoZ2xvYmFscykge1xuICAgIE9iamVjdC5rZXlzKGdsb2JhbHMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICB2YXJpYWJsZXNba2V5XSA9IGdsb2JhbHNba2V5XTtcbiAgICB9KTtcbiAgfVxuXG4gIGV4dHJhQXJncy5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIHZhcmlhYmxlc1trZXldID0gbnVsbDtcbiAgfSk7XG5cbiAgcmV0dXJuIHZhcmlhYmxlcztcbn1cblxuXG5cbmZ1bmN0aW9uIGNvbXBpbGVFeHByZXNzaW9uKG9yaWdpbmFsLCBleHByLCBnbG9iYWxzLCBmb3JtYXR0ZXJzLCBleHRyYUFyZ3MpIHtcbiAgdmFyIGZ1bmMsIGFyZ3MgPSBbJ19nbG9iYWxzXycsICdfZm9ybWF0dGVyc18nXS5jb25jYXQoZXh0cmFBcmdzKS5jb25jYXQoZXhwcik7XG5cbiAgdHJ5IHtcbiAgICBmdW5jID0gRnVuY3Rpb24uYXBwbHkobnVsbCwgYXJncyk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICAvLyBUaHJvd3MgYW4gZXJyb3IgaWYgdGhlIGV4cHJlc3Npb24gd2FzIG5vdCB2YWxpZCBKYXZhU2NyaXB0XG4gICAgdGhyb3cgbmV3IEVycm9yKCdCYWQgZXhwcmVzc2lvbjogJyArIG9yaWdpbmFsICsgJ1xcbicgKyAnQ29tcGlsZWQgZXhwcmVzc2lvbjpcXG4nICsgZXhwciArICdcXG4nICsgZS5tZXNzYWdlKTtcbiAgfVxuXG4gIHJldHVybiBiaW5kQXJndW1lbnRzKGZ1bmMsIGdsb2JhbHMsIGZvcm1hdHRlcnMpO1xufVxuXG5cbi8vIGEgY3VzdG9tIFwiYmluZFwiIGZ1bmN0aW9uIHRvIGJpbmQgYXJndW1lbnRzIHRvIGEgZnVuY3Rpb24gd2l0aG91dCBiaW5kaW5nIHRoZSBjb250ZXh0XG5mdW5jdGlvbiBiaW5kQXJndW1lbnRzKGZ1bmMpIHtcbiAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZnVuYy5hcHBseSh0aGlzLCBhcmdzLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgfVxufVxuIiwiXG4vLyBmaW5kcyBwaXBlcyB0aGF0IGFyZSBub3QgT1JzIChpLmUuIGAgfCBgIG5vdCBgIHx8IGApIGZvciBmb3JtYXR0ZXJzXG52YXIgcGlwZVJlZ2V4ID0gL1xcfChcXHwpPy9nO1xuXG4vLyBBIHN0cmluZyB0aGF0IHdvdWxkIG5vdCBhcHBlYXIgaW4gdmFsaWQgSmF2YVNjcmlwdFxudmFyIHBsYWNlaG9sZGVyID0gJ0BAQCc7XG52YXIgcGxhY2Vob2xkZXJSZWdleCA9IG5ldyBSZWdFeHAoJ1xcXFxzKicgKyBwbGFjZWhvbGRlciArICdcXFxccyonKTtcblxuLy8gZGV0ZXJtaW5lcyB3aGV0aGVyIGFuIGV4cHJlc3Npb24gaXMgYSBzZXR0ZXIgb3IgZ2V0dGVyIChgbmFtZWAgdnMgYG5hbWUgPSAnYm9iJ2ApXG52YXIgc2V0dGVyUmVnZXggPSAvXFxzPVxccy87XG5cbi8vIGZpbmRzIHRoZSBwYXJ0cyBvZiBhIGZvcm1hdHRlciwgbmFtZSBhbmQgYXJncyAoZS5nLiBgZm9vKGJhcilgKVxudmFyIGZvcm1hdHRlclJlZ2V4ID0gL14oW15cXChdKykoPzpcXCgoLiopXFwpKT8kLztcblxuLy8gZmluZHMgYXJndW1lbnQgc2VwYXJhdG9ycyBmb3IgZm9ybWF0dGVycyAoYGFyZzEsIGFyZzJgKVxudmFyIGFyZ1NlcGFyYXRvciA9IC9cXHMqLFxccyovZztcblxuXG4vKipcbiAqIEZpbmRzIHRoZSBmb3JtYXR0ZXJzIHdpdGhpbiBhbiBleHByZXNzaW9uIGFuZCBjb252ZXJ0cyB0aGVtIHRvIHRoZSBjb3JyZWN0IEphdmFTY3JpcHQgZXF1aXZhbGVudC5cbiAqL1xuZXhwb3J0cy5wYXJzZUZvcm1hdHRlcnMgPSBmdW5jdGlvbihleHByKSB7XG4gIC8vIENvbnZlcnRzIGBuYW1lIHwgdXBwZXIgfCBmb28oYmFyKWAgaW50byBgbmFtZSBAQEAgdXBwZXIgQEBAIGZvbyhiYXIpYFxuICBleHByID0gZXhwci5yZXBsYWNlKHBpcGVSZWdleCwgZnVuY3Rpb24obWF0Y2gsIG9ySW5kaWNhdG9yKSB7XG4gICAgaWYgKG9ySW5kaWNhdG9yKSByZXR1cm4gbWF0Y2g7XG4gICAgcmV0dXJuIHBsYWNlaG9sZGVyO1xuICB9KTtcblxuICAvLyBzcGxpdHMgdGhlIHN0cmluZyBieSBcIkBAQFwiLCBwdWxscyBvZiB0aGUgZmlyc3QgYXMgdGhlIGV4cHIsIHRoZSByZW1haW5pbmcgYXJlIGZvcm1hdHRlcnNcbiAgZm9ybWF0dGVycyA9IGV4cHIuc3BsaXQocGxhY2Vob2xkZXJSZWdleCk7XG4gIGV4cHIgPSBmb3JtYXR0ZXJzLnNoaWZ0KCk7XG4gIGlmICghZm9ybWF0dGVycy5sZW5ndGgpIHJldHVybiBleHByO1xuXG4gIC8vIFByb2Nlc3NlcyB0aGUgZm9ybWF0dGVyc1xuICAvLyBJZiB0aGUgZXhwcmVzc2lvbiBpcyBhIHNldHRlciB0aGUgdmFsdWUgd2lsbCBiZSBydW4gdGhyb3VnaCB0aGUgZm9ybWF0dGVyc1xuICB2YXIgc2V0dGVyID0gJyc7XG4gIHZhciB2YWx1ZSA9IGV4cHI7XG5cbiAgaWYgKHNldHRlclJlZ2V4LnRlc3QoZXhwcikpIHtcbiAgICB2YXIgcGFydHMgPSBleHByLnNwbGl0KHNldHRlclJlZ2V4KTtcbiAgICBzZXR0ZXIgPSBwYXJ0c1swXSArICcgPSAnO1xuICAgIHZhbHVlID0gcGFydHNbMV07XG4gIH1cblxuICAvLyBQcm9jZXNzZXMgdGhlIGZvcm1hdHRlcnNcbiAgZm9ybWF0dGVycy5mb3JFYWNoKGZ1bmN0aW9uKGZvcm1hdHRlcikge1xuICAgIHZhciBtYXRjaCA9IGZvcm1hdHRlci50cmltKCkubWF0Y2goZm9ybWF0dGVyUmVnZXgpO1xuXG4gICAgaWYgKCFtYXRjaCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdGb3JtYXR0ZXIgaXMgaW52YWxpZDogJyArIGZvcm1hdHRlcik7XG4gICAgfVxuXG4gICAgdmFyIGZvcm1hdHRlck5hbWUgPSBtYXRjaFsxXTtcbiAgICB2YXIgYXJncyA9IG1hdGNoWzJdID8gbWF0Y2hbMl0uc3BsaXQoYXJnU2VwYXJhdG9yKSA6IFtdO1xuXG4gICAgLy8gQWRkIHRoZSBwcmV2aW91cyB2YWx1ZSBhcyB0aGUgZmlyc3QgYXJndW1lbnRcbiAgICBhcmdzLnVuc2hpZnQodmFsdWUpO1xuXG4gICAgLy8gSWYgdGhpcyBpcyBhIHNldHRlciBleHByLCBiZSBzdXJlIHRvIGFkZCB0aGUgYGlzU2V0dGVyYCBmbGFnIGF0IHRoZSBlbmQgb2YgdGhlIGZvcm1hdHRlcidzIGFyZ3VtZW50c1xuICAgIGlmIChzZXR0ZXIpIHtcbiAgICAgIGFyZ3MucHVzaCh0cnVlKTtcbiAgICB9XG5cbiAgICAvLyBTZXQgdGhlIHZhbHVlIHRvIGJlY29tZSB0aGUgcmVzdWx0IG9mIHRoaXMgZm9ybWF0dGVyLCBzbyB0aGUgbmV4dCBmb3JtYXR0ZXIgY2FuIHdyYXAgaXQuXG4gICAgLy8gQ2FsbCBmb3JtYXR0ZXJzIGluIHRoZSBjdXJyZW50IGNvbnRleHQuXG4gICAgdmFsdWUgPSAnX2Zvcm1hdHRlcnNfLicgKyBmb3JtYXR0ZXJOYW1lICsgJy5jYWxsKHRoaXMsICcgKyBhcmdzLmpvaW4oJywgJykgKyAnKSc7XG4gIH0pO1xuXG4gIHJldHVybiBzZXR0ZXIgKyB2YWx1ZTtcbn07XG4iLCJ2YXIgcmVmZXJlbmNlQ291bnQgPSAwO1xudmFyIGN1cnJlbnRSZWZlcmVuY2UgPSAwO1xudmFyIGN1cnJlbnRJbmRleCA9IDA7XG52YXIgZmluaXNoZWRDaGFpbiA9IGZhbHNlO1xudmFyIGNvbnRpbnVhdGlvbiA9IGZhbHNlO1xudmFyIGdsb2JhbHMgPSBudWxsO1xudmFyIGRlZmF1bHRHbG9iYWxzID0ge1xuICByZXR1cm46IG51bGwsXG4gIHRydWU6IG51bGwsXG4gIGZhbHNlOiBudWxsLFxuICB1bmRlZmluZWQ6IG51bGwsXG4gIG51bGw6IG51bGwsXG4gIHRoaXM6IG51bGwsXG4gIHdpbmRvdzogbnVsbCxcbiAgTWF0aDogbnVsbCxcbiAgcGFyc2VJbnQ6IG51bGwsXG4gIHBhcnNlRmxvYXQ6IG51bGwsXG4gIGlzTmFOOiBudWxsLFxuICBBcnJheTogbnVsbCxcbiAgdHlwZW9mOiBudWxsLFxuICBfZ2xvYmFsc186IG51bGwsXG4gIF9mb3JtYXR0ZXJzXzogbnVsbCxcbiAgX3ZhbHVlXzogbnVsbCxcbn07XG5cblxuLy8gbWF0Y2hlcyBwcm9wZXJ0eSBjaGFpbnMgKGUuZy4gYG5hbWVgLCBgdXNlci5uYW1lYCwgYW5kIGB1c2VyLmZ1bGxOYW1lKCkuY2FwaXRhbGl6ZSgpYClcbnZhciBwcm9wZXJ0eVJlZ2V4ID0gLygoXFx7fCx8XFwuKT9cXHMqKShbYS16JF9cXCRdKD86W2Etel9cXCQwLTlcXC4tXXxcXFtbJ1wiXFxkXStcXF0pKikoXFxzKig6fFxcKHxcXFspPykvZ2k7XG4vKipcbiAqIEJyb2tlbiBkb3duXG4gKlxuICogKChcXHt8LHxcXC4pP1xccyopXG4gKiBwcmVmaXg6IG1hdGNoZXMgb24gb2JqZWN0IGxpdGVyYWxzIHNvIHdlIGNhbiBza2lwIChpbiBgeyBmb286IGJhciB9YCBcImZvb1wiIGlzIG5vdCBhIHByb3BlcnR5KS4gQWxzbyBwaWNrcyB1cCBvblxuICogdW5maW5pc2hlZCBjaGFpbnMgdGhhdCBoYWQgZnVuY3Rpb24gY2FsbHMgb3IgYnJhY2tldHMgd2UgY291bGRuJ3QgZmluaXNoIHN1Y2ggYXMgdGhlIGRvdCBpbiBgLnRlc3RgIGFmdGVyIHRoZSBjaGFpblxuICogYGZvby5iYXIoKS50ZXN0YC5cbiAqXG4gKiAoW2EteiRfXFwkXSg/OlthLXpfXFwkMC05XFwuLV18XFxbWydcIlxcZF0rXFxdKSopXG4gKiBwcm9wZXJ0eSBjaGFpbjogbWF0Y2hlcyBwcm9wZXJ0eSBjaGFpbnMgc3VjaCBhcyB0aGUgZm9sbG93aW5nIChzdHJpbmdzJyBjb250ZW50cyBhcmUgcmVtb3ZlZCBhdCB0aGlzIHN0ZXApXG4gKiAgIGBmb28sIGZvby5iYXIsIGZvby5iYXJbMF0sIGZvby5iYXJbMF0udGVzdCwgZm9vLmJhclsnJ10udGVzdGBcbiAqICAgRG9lcyBub3QgbWF0Y2ggdGhyb3VnaCBmdW5jdGlvbnMgY2FsbHMgb3IgdGhyb3VnaCBicmFja2V0cyB3aGljaCBjb250YWluIHZhcmlhYmxlcy5cbiAqICAgYGZvby5iYXIoKS50ZXN0LCBmb28uYmFyW3Byb3BdLnRlc3RgXG4gKiAgIEluIHRoZXNlIGNhc2VzIGl0IHdvdWxkIG9ubHkgbWF0Y2ggYGZvby5iYXJgLCBgLnRlc3RgLCBhbmQgYHByb3BgXG4gKlxuICogKFxccyooOnxcXCh8XFxbKT8pXG4gKiBwb3N0Zml4OiBtYXRjaGVzIHRyYWlsaW5nIGNoYXJhY3RlcnMgdG8gZGV0ZXJtaW5lIGlmIHRoaXMgaXMgYW4gb2JqZWN0IHByb3BlcnR5IG9yIGEgZnVuY3Rpb24gY2FsbCBldGMuIFdpbGwgbWF0Y2hcbiAqIHRoZSBjb2xvbiBhZnRlciBcImZvb1wiIGluIGB7IGZvbzogJ2JhcicgfWAsIHRoZSBmaXJzdCBwYXJlbnRoZXNpcyBpbiBgb2JqLmZvbyhiYXIpYCwgdGhlIHRoZSBmaXJzdCBicmFja2V0IGluXG4gKiBgZm9vW2Jhcl1gLlxuICovXG5cbi8vIGxpbmtzIGluIGEgcHJvcGVydHkgY2hhaW5cbnZhciBjaGFpbkxpbmtzUmVnZXggPSAvXFwufFxcWy9nO1xuXG4vLyB0aGUgcHJvcGVydHkgbmFtZSBwYXJ0IG9mIGxpbmtzXG52YXIgY2hhaW5MaW5rUmVnZXggPSAvXFwufFxcW3xcXCgvO1xuXG52YXIgYW5kUmVnZXggPSAvIGFuZCAvZztcbnZhciBvclJlZ2V4ID0gLyBvciAvZztcblxuXG5leHBvcnRzLnBhcnNlRXhwcmVzc2lvbiA9IGZ1bmN0aW9uKGV4cHIsIF9nbG9iYWxzKSB7XG4gIC8vIFJlc2V0IGFsbCB2YWx1ZXNcbiAgcmVmZXJlbmNlQ291bnQgPSAwO1xuICBjdXJyZW50UmVmZXJlbmNlID0gMDtcbiAgY3VycmVudEluZGV4ID0gMDtcbiAgZmluaXNoZWRDaGFpbiA9IGZhbHNlO1xuICBjb250aW51YXRpb24gPSBmYWxzZTtcbiAgZ2xvYmFscyA9IF9nbG9iYWxzO1xuXG4gIGV4cHIgPSByZXBsYWNlQW5kc0FuZE9ycyhleHByKTtcbiAgaWYgKGV4cHIuaW5kZXhPZignID0gJykgIT09IC0xKSB7XG4gICAgdmFyIHBhcnRzID0gZXhwci5zcGxpdCgnID0gJyk7XG4gICAgdmFyIHNldHRlciA9IHBhcnRzWzBdO1xuICAgIHZhciB2YWx1ZSA9IHBhcnRzWzFdO1xuICAgIHNldHRlciA9IHBhcnNlUHJvcGVydHlDaGFpbnMoc2V0dGVyKS5yZXBsYWNlKC9eXFwofFxcKSQvZywgJycpO1xuICAgIHZhbHVlID0gcGFyc2VQcm9wZXJ0eUNoYWlucyh2YWx1ZSk7XG4gICAgZXhwciA9IHNldHRlciArICcgPSAnICsgdmFsdWU7XG4gIH0gZWxzZSB7XG4gICAgZXhwciA9IHBhcnNlUHJvcGVydHlDaGFpbnMoZXhwcik7XG4gIH1cbiAgZXhwciA9IGFkZFJlZmVyZW5jZXMoZXhwcilcblxuICAvLyBSZXNldCBhZnRlciBwYXJzZSBpcyBkb25lXG4gIGdsb2JhbHMgPSBudWxsO1xuXG4gIHJldHVybiBleHByO1xufTtcblxuXG4vKipcbiAqIEZpbmRzIGFuZCBwYXJzZXMgdGhlIHByb3BlcnR5IGNoYWlucyBpbiBhbiBleHByZXNzaW9uLlxuICovXG5mdW5jdGlvbiBwYXJzZVByb3BlcnR5Q2hhaW5zKGV4cHIpIHtcbiAgdmFyIHBhcnNlZEV4cHIgPSAnJywgY2hhaW47XG5cbiAgLy8gYWxsb3cgcmVjdXJzaW9uIChlLmcuIGludG8gZnVuY3Rpb24gYXJncykgYnkgcmVzZXR0aW5nIHByb3BlcnR5UmVnZXhcbiAgLy8gVGhpcyBpcyBtb3JlIGVmZmljaWVudCB0aGFuIGNyZWF0aW5nIGEgbmV3IHJlZ2V4IGZvciBlYWNoIGNoYWluLCBJIGFzc3VtZVxuICB2YXIgcHJldkN1cnJlbnRJbmRleCA9IGN1cnJlbnRJbmRleDtcbiAgdmFyIHByZXZMYXN0SW5kZXggPSBwcm9wZXJ0eVJlZ2V4Lmxhc3RJbmRleDtcblxuICBjdXJyZW50SW5kZXggPSAwO1xuICBwcm9wZXJ0eVJlZ2V4Lmxhc3RJbmRleCA9IDA7XG4gIHdoaWxlICgoY2hhaW4gPSBuZXh0Q2hhaW4oZXhwcikpICE9PSBmYWxzZSkge1xuICAgIHBhcnNlZEV4cHIgKz0gY2hhaW47XG4gIH1cblxuICAvLyBSZXNldCBpbmRleGVzXG4gIGN1cnJlbnRJbmRleCA9IHByZXZDdXJyZW50SW5kZXg7XG4gIHByb3BlcnR5UmVnZXgubGFzdEluZGV4ID0gcHJldkxhc3RJbmRleDtcbiAgcmV0dXJuIHBhcnNlZEV4cHI7XG59O1xuXG5cbmZ1bmN0aW9uIG5leHRDaGFpbihleHByKSB7XG4gIGlmIChmaW5pc2hlZENoYWluKSB7XG4gICAgcmV0dXJuIChmaW5pc2hlZENoYWluID0gZmFsc2UpO1xuICB9XG4gIHZhciBtYXRjaCA9IHByb3BlcnR5UmVnZXguZXhlYyhleHByKTtcbiAgaWYgKCFtYXRjaCkge1xuICAgIGZpbmlzaGVkQ2hhaW4gPSB0cnVlIC8vIG1ha2Ugc3VyZSBuZXh0IGNhbGwgd2UgcmV0dXJuIGZhbHNlXG4gICAgcmV0dXJuIGV4cHIuc2xpY2UoY3VycmVudEluZGV4KTtcbiAgfVxuXG4gIC8vIGBwcmVmaXhgIGlzIGBvYmpJbmRpY2F0b3JgIHdpdGggdGhlIHdoaXRlc3BhY2UgdGhhdCBtYXkgY29tZSBhZnRlciBpdC5cbiAgdmFyIHByZWZpeCA9IG1hdGNoWzFdO1xuXG4gIC8vIGBvYmpJbmRpY2F0b3JgIGlzIGB7YCBvciBgLGAgYW5kIGxldCdzIHVzIGtub3cgdGhpcyBpcyBhbiBvYmplY3QgcHJvcGVydHlcbiAgLy8gbmFtZSAoZS5nLiBwcm9wIGluIGB7cHJvcDpmYWxzZX1gKS5cbiAgdmFyIG9iakluZGljYXRvciA9IG1hdGNoWzJdO1xuXG4gIC8vIGBwcm9wQ2hhaW5gIGlzIHRoZSBjaGFpbiBvZiBwcm9wZXJ0aWVzIG1hdGNoZWQgKGUuZy4gYHRoaXMudXNlci5lbWFpbGApLlxuICB2YXIgcHJvcENoYWluID0gbWF0Y2hbM107XG5cbiAgLy8gYHBvc3RmaXhgIGlzIHRoZSBgY29sb25PclBhcmVuYCB3aXRoIHdoaXRlc3BhY2UgYmVmb3JlIGl0LlxuICB2YXIgcG9zdGZpeCA9IG1hdGNoWzRdO1xuXG4gIC8vIGBjb2xvbk9yUGFyZW5gIG1hdGNoZXMgdGhlIGNvbG9uICg6KSBhZnRlciB0aGUgcHJvcGVydHkgKGlmIGl0IGlzIGFuIG9iamVjdClcbiAgLy8gb3IgcGFyZW50aGVzaXMgaWYgaXQgaXMgYSBmdW5jdGlvbi4gV2UgdXNlIGBjb2xvbk9yUGFyZW5gIGFuZCBgb2JqSW5kaWNhdG9yYFxuICAvLyB0byBrbm93IGlmIGl0IGlzIGFuIG9iamVjdC5cbiAgdmFyIGNvbG9uT3JQYXJlbiA9IG1hdGNoWzVdO1xuXG4gIG1hdGNoID0gbWF0Y2hbMF07XG5cbiAgdmFyIHNraXBwZWQgPSBleHByLnNsaWNlKGN1cnJlbnRJbmRleCwgcHJvcGVydHlSZWdleC5sYXN0SW5kZXggLSBtYXRjaC5sZW5ndGgpO1xuICBjdXJyZW50SW5kZXggPSBwcm9wZXJ0eVJlZ2V4Lmxhc3RJbmRleDtcblxuICAvLyBza2lwcyBvYmplY3Qga2V5cyBlLmcuIHRlc3QgaW4gYHt0ZXN0OnRydWV9YC5cbiAgaWYgKG9iakluZGljYXRvciAmJiBjb2xvbk9yUGFyZW4gPT09ICc6Jykge1xuICAgIHJldHVybiBza2lwcGVkICsgbWF0Y2g7XG4gIH1cblxuICByZXR1cm4gc2tpcHBlZCArIHBhcnNlQ2hhaW4ocHJlZml4LCBwcm9wQ2hhaW4sIHBvc3RmaXgsIGNvbG9uT3JQYXJlbiwgZXhwcik7XG59XG5cblxuZnVuY3Rpb24gcGFyc2VDaGFpbihwcmVmaXgsIHByb3BDaGFpbiwgcG9zdGZpeCwgcGFyZW4sIGV4cHIpIHtcbiAgLy8gY29udGludWF0aW9ucyBhZnRlciBhIGZ1bmN0aW9uIChlLmcuIGBnZXRVc2VyKDEyKS5maXJzdE5hbWVgKS5cbiAgY29udGludWF0aW9uID0gcHJlZml4ID09PSAnLic7XG4gIGlmIChjb250aW51YXRpb24pIHtcbiAgICBwcm9wQ2hhaW4gPSAnLicgKyBwcm9wQ2hhaW47XG4gICAgcHJlZml4ID0gJyc7XG4gIH1cblxuICB2YXIgbGlua3MgPSBzcGxpdExpbmtzKHByb3BDaGFpbik7XG4gIHZhciBuZXdDaGFpbiA9ICcnO1xuXG4gIGlmIChsaW5rcy5sZW5ndGggPT09IDEgJiYgIWNvbnRpbnVhdGlvbiAmJiAhcGFyZW4pIHtcbiAgICBsaW5rID0gbGlua3NbMF07XG4gICAgbmV3Q2hhaW4gPSBhZGRUaGlzT3JHbG9iYWwobGluayk7XG4gIH0gZWxzZSB7XG4gICAgaWYgKCFjb250aW51YXRpb24pIHtcbiAgICAgIG5ld0NoYWluID0gJygnO1xuICAgIH1cblxuICAgIGxpbmtzLmZvckVhY2goZnVuY3Rpb24obGluaywgaW5kZXgpIHtcbiAgICAgIGlmIChpbmRleCAhPT0gbGlua3MubGVuZ3RoIC0gMSkge1xuICAgICAgICBuZXdDaGFpbiArPSBwYXJzZVBhcnQobGluaywgaW5kZXgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCFwYXJlbnNbcGFyZW5dKSB7XG4gICAgICAgICAgbmV3Q2hhaW4gKz0gJ19yZWYnICsgY3VycmVudFJlZmVyZW5jZSArIGxpbms7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKGNvbnRpbnVhdGlvbiAmJiBpbmRleCA9PT0gMCkge1xuICAgICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgICB9XG4gICAgICAgICAgcG9zdGZpeCA9IHBvc3RmaXgucmVwbGFjZShwYXJlbiwgJycpO1xuICAgICAgICAgIG5ld0NoYWluICs9IHBhcmVuID09PSAnKCcgPyBwYXJzZUZ1bmN0aW9uKGxpbmssIGluZGV4LCBleHByKSA6IHBhcnNlQnJhY2tldHMobGluaywgaW5kZXgsIGV4cHIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAoZXhwci5jaGFyQXQocHJvcGVydHlSZWdleC5sYXN0SW5kZXgpICE9PSAnLicpIHtcbiAgICAgIG5ld0NoYWluICs9ICcpJztcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcHJlZml4ICsgbmV3Q2hhaW4gKyBwb3N0Zml4O1xufVxuXG5cbmZ1bmN0aW9uIHNwbGl0TGlua3MoY2hhaW4pIHtcbiAgdmFyIGluZGV4ID0gMDtcbiAgdmFyIHBhcnRzID0gW107XG4gIHZhciBtYXRjaDtcbiAgd2hpbGUgKG1hdGNoID0gY2hhaW5MaW5rc1JlZ2V4LmV4ZWMoY2hhaW4pKSB7XG4gICAgaWYgKGNoYWluTGlua3NSZWdleC5sYXN0SW5kZXggPT09IDEpIGNvbnRpbnVlO1xuICAgIHBhcnRzLnB1c2goY2hhaW4uc2xpY2UoaW5kZXgsIGNoYWluTGlua3NSZWdleC5sYXN0SW5kZXggLSAxKSk7XG4gICAgaW5kZXggPSBjaGFpbkxpbmtzUmVnZXgubGFzdEluZGV4IC0gMTtcbiAgfVxuICBwYXJ0cy5wdXNoKGNoYWluLnNsaWNlKGluZGV4KSk7XG4gIHJldHVybiBwYXJ0cztcbn1cblxuXG5mdW5jdGlvbiBhZGRUaGlzT3JHbG9iYWwoY2hhaW4pIHtcbiAgdmFyIHByb3AgPSBjaGFpbi5zcGxpdChjaGFpbkxpbmtSZWdleCkuc2hpZnQoKTtcbiAgaWYgKGdsb2JhbHMuaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICByZXR1cm4gZ2xvYmFsc1twcm9wXSA9PT0gbnVsbCA/IGNoYWluIDogJ19nbG9iYWxzXy4nICsgY2hhaW47XG4gIH0gZWxzZSBpZiAoZGVmYXVsdEdsb2JhbHMuaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICByZXR1cm4gY2hhaW47XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuICd0aGlzLicgKyBjaGFpbjtcbiAgfVxufVxuXG5cbnZhciBwYXJlbnMgPSB7XG4gICcoJzogJyknLFxuICAnWyc6ICddJ1xufTtcblxuLy8gSGFuZGxlcyBhIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBpbiBpdHMgY29ycmVjdCBzY29wZVxuLy8gRmluZHMgdGhlIGVuZCBvZiB0aGUgZnVuY3Rpb24gYW5kIHByb2Nlc3NlcyB0aGUgYXJndW1lbnRzXG5mdW5jdGlvbiBwYXJzZUZ1bmN0aW9uKGxpbmssIGluZGV4LCBleHByKSB7XG4gIHZhciBjYWxsID0gZ2V0RnVuY3Rpb25DYWxsKGV4cHIpO1xuXG4gIC8vIEFsd2F5cyBjYWxsIGZ1bmN0aW9ucyBpbiB0aGUgc2NvcGUgb2YgdGhlIG9iamVjdCB0aGV5J3JlIGEgbWVtYmVyIG9mXG4gIGlmIChpbmRleCA9PT0gMCkge1xuICAgIGxpbmsgPSBhZGRUaGlzT3JHbG9iYWwobGluayk7XG4gIH0gZWxzZSB7XG4gICAgbGluayA9ICdfcmVmJyArIGN1cnJlbnRSZWZlcmVuY2UgKyBsaW5rO1xuICB9XG5cbiAgdmFyIGNhbGxlZExpbmsgPSBsaW5rICsgJyh+fmluc2lkZVBhcmVuc35+KSc7XG4gIGlmIChleHByLmNoYXJBdChwcm9wZXJ0eVJlZ2V4Lmxhc3RJbmRleCkgPT09ICcuJykge1xuICAgIGNhbGxlZExpbmsgPSBwYXJzZVBhcnQoY2FsbGVkTGluaywgaW5kZXgpXG4gIH1cblxuICBsaW5rID0gJ3R5cGVvZiAnICsgbGluayArICcgIT09IFxcJ2Z1bmN0aW9uXFwnID8gdm9pZCAwIDogJyArIGNhbGxlZExpbms7XG4gIHZhciBpbnNpZGVQYXJlbnMgPSBjYWxsLnNsaWNlKDEsIC0xKTtcblxuICB2YXIgcmVmID0gY3VycmVudFJlZmVyZW5jZTtcbiAgbGluayA9IGxpbmsucmVwbGFjZSgnfn5pbnNpZGVQYXJlbnN+ficsIHBhcnNlUHJvcGVydHlDaGFpbnMoaW5zaWRlUGFyZW5zKSk7XG4gIGN1cnJlbnRSZWZlcmVuY2UgPSByZWY7XG4gIHJldHVybiBsaW5rO1xufVxuXG4vLyBIYW5kbGVzIGEgYnJhY2tldGVkIGV4cHJlc3Npb24gdG8gYmUgcGFyc2VkXG5mdW5jdGlvbiBwYXJzZUJyYWNrZXRzKGxpbmssIGluZGV4LCBleHByKSB7XG4gIHZhciBjYWxsID0gZ2V0RnVuY3Rpb25DYWxsKGV4cHIpO1xuICB2YXIgaW5zaWRlQnJhY2tldHMgPSBjYWxsLnNsaWNlKDEsIC0xKTtcbiAgdmFyIGV2YWxlZExpbmsgPSBwYXJzZVBhcnQobGluaywgaW5kZXgpO1xuICBpbmRleCArPSAxO1xuICBsaW5rID0gJ1t+fmluc2lkZUJyYWNrZXRzfn5dJztcblxuICBpZiAoZXhwci5jaGFyQXQocHJvcGVydHlSZWdleC5sYXN0SW5kZXgpID09PSAnLicpIHtcbiAgICBsaW5rID0gcGFyc2VQYXJ0KGxpbmssIGluZGV4KTtcbiAgfSBlbHNlIHtcbiAgICBsaW5rID0gJ19yZWYnICsgY3VycmVudFJlZmVyZW5jZSArIGxpbms7XG4gIH1cblxuICBsaW5rID0gZXZhbGVkTGluayArIGxpbms7XG5cbiAgdmFyIHJlZiA9IGN1cnJlbnRSZWZlcmVuY2U7XG4gIGxpbmsgPSBsaW5rLnJlcGxhY2UoJ35+aW5zaWRlQnJhY2tldHN+ficsIHBhcnNlUHJvcGVydHlDaGFpbnMoaW5zaWRlQnJhY2tldHMpKTtcbiAgY3VycmVudFJlZmVyZW5jZSA9IHJlZjtcbiAgcmV0dXJuIGxpbms7XG59XG5cblxuLy8gcmV0dXJucyB0aGUgY2FsbCBwYXJ0IG9mIGEgZnVuY3Rpb24gKGUuZy4gYHRlc3QoMTIzKWAgd291bGQgcmV0dXJuIGAoMTIzKWApXG5mdW5jdGlvbiBnZXRGdW5jdGlvbkNhbGwoZXhwcikge1xuICB2YXIgc3RhcnRJbmRleCA9IHByb3BlcnR5UmVnZXgubGFzdEluZGV4O1xuICB2YXIgb3BlbiA9IGV4cHIuY2hhckF0KHN0YXJ0SW5kZXggLSAxKTtcbiAgdmFyIGNsb3NlID0gcGFyZW5zW29wZW5dO1xuICB2YXIgZW5kSW5kZXggPSBzdGFydEluZGV4IC0gMTtcbiAgdmFyIHBhcmVuQ291bnQgPSAxO1xuICB3aGlsZSAoZW5kSW5kZXgrKyA8IGV4cHIubGVuZ3RoKSB7XG4gICAgdmFyIGNoID0gZXhwci5jaGFyQXQoZW5kSW5kZXgpO1xuICAgIGlmIChjaCA9PT0gb3BlbikgcGFyZW5Db3VudCsrO1xuICAgIGVsc2UgaWYgKGNoID09PSBjbG9zZSkgcGFyZW5Db3VudC0tO1xuICAgIGlmIChwYXJlbkNvdW50ID09PSAwKSBicmVhaztcbiAgfVxuICBjdXJyZW50SW5kZXggPSBwcm9wZXJ0eVJlZ2V4Lmxhc3RJbmRleCA9IGVuZEluZGV4ICsgMTtcbiAgcmV0dXJuIG9wZW4gKyBleHByLnNsaWNlKHN0YXJ0SW5kZXgsIGVuZEluZGV4KSArIGNsb3NlO1xufVxuXG5cblxuZnVuY3Rpb24gcGFyc2VQYXJ0KHBhcnQsIGluZGV4KSB7XG4gIC8vIGlmIHRoZSBmaXJzdFxuICBpZiAoaW5kZXggPT09IDAgJiYgIWNvbnRpbnVhdGlvbikge1xuICAgIHBhcnQgPSBhZGRUaGlzT3JHbG9iYWwocGFydCk7XG4gIH0gZWxzZSB7XG4gICAgcGFydCA9ICdfcmVmJyArIGN1cnJlbnRSZWZlcmVuY2UgKyBwYXJ0O1xuICB9XG5cbiAgY3VycmVudFJlZmVyZW5jZSA9ICsrcmVmZXJlbmNlQ291bnQ7XG4gIHZhciByZWYgPSAnX3JlZicgKyBjdXJyZW50UmVmZXJlbmNlO1xuICByZXR1cm4gJygnICsgcmVmICsgJyA9ICcgKyBwYXJ0ICsgJykgPT0gbnVsbCA/IHZvaWQgMCA6ICc7XG59XG5cblxuZnVuY3Rpb24gcmVwbGFjZUFuZHNBbmRPcnMoZXhwcikge1xuICByZXR1cm4gZXhwci5yZXBsYWNlKGFuZFJlZ2V4LCAnICYmICcpLnJlcGxhY2Uob3JSZWdleCwgJyB8fCAnKTtcbn1cblxuXG4vLyBQcmVwZW5kcyByZWZlcmVuY2UgdmFyaWFibGUgZGVmaW5pdGlvbnNcbmZ1bmN0aW9uIGFkZFJlZmVyZW5jZXMoZXhwcikge1xuICBpZiAocmVmZXJlbmNlQ291bnQpIHtcbiAgICB2YXIgcmVmcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAxOyBpIDw9IHJlZmVyZW5jZUNvdW50OyBpKyspIHtcbiAgICAgIHJlZnMucHVzaCgnX3JlZicgKyBpKTtcbiAgICB9XG4gICAgZXhwciA9ICd2YXIgJyArIHJlZnMuam9pbignLCAnKSArICc7XFxuJyArIGV4cHI7XG4gIH1cbiAgcmV0dXJuIGV4cHI7XG59XG4iLCIvLyBmaW5kcyBhbGwgcXVvdGVkIHN0cmluZ3NcbnZhciBxdW90ZVJlZ2V4ID0gLyhbJ1wiXFwvXSkoXFxcXFxcMXxbXlxcMV0pKj9cXDEvZztcblxuLy8gZmluZHMgYWxsIGVtcHR5IHF1b3RlZCBzdHJpbmdzXG52YXIgZW1wdHlRdW90ZUV4cHIgPSAvKFsnXCJcXC9dKVxcMS9nO1xuXG52YXIgc3RyaW5ncyA9IG51bGw7XG5cblxuLyoqXG4gKiBSZW1vdmUgc3RyaW5ncyBmcm9tIGFuIGV4cHJlc3Npb24gZm9yIGVhc2llciBwYXJzaW5nLiBSZXR1cm5zIGEgbGlzdCBvZiB0aGUgc3RyaW5ncyB0byBhZGQgYmFjayBpbiBsYXRlci5cbiAqIFRoaXMgbWV0aG9kIGFjdHVhbGx5IGxlYXZlcyB0aGUgc3RyaW5nIHF1b3RlIG1hcmtzIGJ1dCBlbXB0aWVzIHRoZW0gb2YgdGhlaXIgY29udGVudHMuIFRoZW4gd2hlbiByZXBsYWNpbmcgdGhlbSBhZnRlclxuICogcGFyc2luZyB0aGUgY29udGVudHMganVzdCBnZXQgcHV0IGJhY2sgaW50byB0aGVpciBxdW90ZXMgbWFya3MuXG4gKi9cbmV4cG9ydHMucHVsbE91dFN0cmluZ3MgPSBmdW5jdGlvbihleHByKSB7XG4gIGlmIChzdHJpbmdzKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwdXRJblN0cmluZ3MgbXVzdCBiZSBjYWxsZWQgYWZ0ZXIgcHVsbE91dFN0cmluZ3MuJyk7XG4gIH1cblxuICBzdHJpbmdzID0gW107XG5cbiAgcmV0dXJuIGV4cHIucmVwbGFjZShxdW90ZVJlZ2V4LCBmdW5jdGlvbihzdHIsIHF1b3RlKSB7XG4gICAgc3RyaW5ncy5wdXNoKHN0cik7XG4gICAgcmV0dXJuIHF1b3RlICsgcXVvdGU7IC8vIHBsYWNlaG9sZGVyIGZvciB0aGUgc3RyaW5nXG4gIH0pO1xufTtcblxuXG4vKipcbiAqIFJlcGxhY2UgdGhlIHN0cmluZ3MgcHJldmlvdXNseSBwdWxsZWQgb3V0IGFmdGVyIHBhcnNpbmcgaXMgZmluaXNoZWQuXG4gKi9cbmV4cG9ydHMucHV0SW5TdHJpbmdzID0gZnVuY3Rpb24oZXhwcikge1xuICBpZiAoIXN0cmluZ3MpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3B1bGxPdXRTdHJpbmdzIG11c3QgYmUgY2FsbGVkIGJlZm9yZSBwdXRJblN0cmluZ3MuJyk7XG4gIH1cblxuICBleHByID0gZXhwci5yZXBsYWNlKGVtcHR5UXVvdGVFeHByLCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gc3RyaW5ncy5zaGlmdCgpO1xuICB9KTtcblxuICBzdHJpbmdzID0gbnVsbDtcblxuICByZXR1cm4gZXhwcjtcbn07XG4iLCJ2YXIgRnJhZ21lbnRzID0gcmVxdWlyZSgnLi9zcmMvZnJhZ21lbnRzJyk7XG52YXIgT2JzZXJ2YXRpb25zID0gcmVxdWlyZSgnb2JzZXJ2YXRpb25zLWpzJyk7XG5cbmZ1bmN0aW9uIGNyZWF0ZSgpIHtcbiAgdmFyIG9ic2VydmF0aW9ucyA9IE9ic2VydmF0aW9ucy5jcmVhdGUoKTtcbiAgdmFyIGZyYWdtZW50cyA9IG5ldyBGcmFnbWVudHMob2JzZXJ2YXRpb25zKTtcbiAgZnJhZ21lbnRzLnN5bmMgPSBvYnNlcnZhdGlvbnMuc3luYy5iaW5kKG9ic2VydmF0aW9ucyk7XG4gIGZyYWdtZW50cy5zeW5jTm93ID0gb2JzZXJ2YXRpb25zLnN5bmNOb3cuYmluZChvYnNlcnZhdGlvbnMpO1xuICBmcmFnbWVudHMuYWZ0ZXJTeW5jID0gb2JzZXJ2YXRpb25zLmFmdGVyU3luYy5iaW5kKG9ic2VydmF0aW9ucyk7XG4gIGZyYWdtZW50cy5vblN5bmMgPSBvYnNlcnZhdGlvbnMub25TeW5jLmJpbmQob2JzZXJ2YXRpb25zKTtcbiAgZnJhZ21lbnRzLm9mZlN5bmMgPSBvYnNlcnZhdGlvbnMub2ZmU3luYy5iaW5kKG9ic2VydmF0aW9ucyk7XG4gIHJldHVybiBmcmFnbWVudHM7XG59XG5cbi8vIENyZWF0ZSBhbiBpbnN0YW5jZSBvZiBmcmFnbWVudHMgd2l0aCB0aGUgZGVmYXVsdCBvYnNlcnZlclxubW9kdWxlLmV4cG9ydHMgPSBjcmVhdGUoKTtcbm1vZHVsZS5leHBvcnRzLmNyZWF0ZSA9IGNyZWF0ZTtcbiIsInZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcblxuLyoqXG4gKiBTaW1wbGlmaWVzIGV4dGVuZGluZyBjbGFzc2VzIGFuZCBwcm92aWRlcyBzdGF0aWMgaW5oZXJpdGFuY2UuIENsYXNzZXMgdGhhdCBuZWVkIHRvIGJlIGV4dGVuZGFibGUgc2hvdWxkXG4gKiBleHRlbmQgQ2xhc3Mgd2hpY2ggd2lsbCBnaXZlIHRoZW0gdGhlIGBleHRlbmRgIHN0YXRpYyBmdW5jdGlvbiBmb3IgdGhlaXIgc3ViY2xhc3NlcyB0byB1c2UuIEluIGFkZGl0aW9uIHRvXG4gKiBhIHByb3RvdHlwZSwgbWl4aW5zIG1heSBiZSBhZGRlZCBhcyB3ZWxsLiBFeGFtcGxlOlxuICpcbiAqIGZ1bmN0aW9uIE15Q2xhc3MoYXJnMSwgYXJnMikge1xuICogICBTdXBlckNsYXNzLmNhbGwodGhpcywgYXJnMSk7XG4gKiAgIHRoaXMuYXJnMiA9IGFyZzI7XG4gKiB9XG4gKiBTdXBlckNsYXNzLmV4dGVuZChNeUNsYXNzLCBtaXhpbjEsIEFub3RoZXJDbGFzcywge1xuICogICBmb286IGZ1bmN0aW9uKCkge1xuICogICAgIHRoaXMuX2JhcisrO1xuICogICB9LFxuICogICBnZXQgYmFyKCkge1xuICogICAgIHJldHVybiB0aGlzLl9iYXI7XG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIEluIGFkZGl0aW9uIHRvIGV4dGVuZGluZyB0aGUgc3VwZXJjbGFzcywgc3RhdGljIG1ldGhvZHMgYW5kIHByb3BlcnRpZXMgd2lsbCBiZSBjb3BpZWQgb250byB0aGUgc3ViY2xhc3MgZm9yXG4gKiBzdGF0aWMgaW5oZXJpdGFuY2UuIFRoaXMgYWxsb3dzIHRoZSBleHRlbmQgZnVuY3Rpb24gdG8gYmUgY29waWVkIHRvIHRoZSBzdWJjbGFzcyBzbyB0aGF0IGl0IG1heSBiZVxuICogc3ViY2xhc3NlZCBhcyB3ZWxsLiBBZGRpdGlvbmFsbHksIHN0YXRpYyBwcm9wZXJ0aWVzIG1heSBiZSBhZGRlZCBieSBkZWZpbmluZyB0aGVtIG9uIGEgc3BlY2lhbCBwcm90b3R5cGVcbiAqIHByb3BlcnR5IGBzdGF0aWNgIG1ha2luZyB0aGUgY29kZSBtb3JlIHJlYWRhYmxlLlxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IFRoZSBzdWJjbGFzcyBjb25zdHJ1Y3Rvci5cbiAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9uYWxdIFplcm8gb3IgbW9yZSBtaXhpbnMuIFRoZXkgY2FuIGJlIG9iamVjdHMgb3IgY2xhc3NlcyAoZnVuY3Rpb25zKS5cbiAqIEBwYXJhbSB7b2JqZWN0fSBUaGUgcHJvdG90eXBlIG9mIHRoZSBzdWJjbGFzcy5cbiAqL1xuZnVuY3Rpb24gQ2xhc3MoKSB7fVxuQ2xhc3MuZXh0ZW5kID0gZXh0ZW5kO1xuQ2xhc3MubWFrZUluc3RhbmNlT2YgPSBtYWtlSW5zdGFuY2VPZjtcbm1vZHVsZS5leHBvcnRzID0gQ2xhc3M7XG5cbmZ1bmN0aW9uIGV4dGVuZChTdWJjbGFzcyAvKiBbLCBwcm90b3R5cGUgWyxwcm90b3R5cGVdXSAqLykge1xuICB2YXIgcHJvdG90eXBlcztcblxuICAvLyBTdXBwb3J0IG5vIGNvbnN0cnVjdG9yXG4gIGlmICh0eXBlb2YgU3ViY2xhc3MgIT09ICdmdW5jdGlvbicpIHtcbiAgICBwcm90b3R5cGVzID0gc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgIHZhciBTdXBlckNsYXNzID0gdGhpcztcbiAgICBTdWJjbGFzcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgU3VwZXJDbGFzcy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgcHJvdG90eXBlcyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgfVxuXG4gIGV4dGVuZFN0YXRpY3ModGhpcywgU3ViY2xhc3MpO1xuXG4gIHByb3RvdHlwZXMuZm9yRWFjaChmdW5jdGlvbihwcm90bykge1xuICAgIGlmICh0eXBlb2YgcHJvdG8gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGV4dGVuZFN0YXRpY3MocHJvdG8sIFN1YmNsYXNzKTtcbiAgICB9IGVsc2UgaWYgKHByb3RvLmhhc093blByb3BlcnR5KCdzdGF0aWMnKSkge1xuICAgICAgZXh0ZW5kU3RhdGljcyhwcm90by5zdGF0aWMsIFN1YmNsYXNzKTtcbiAgICB9XG4gIH0pO1xuXG4gIHZhciBkZXNjcmlwdG9ycyA9IGdldERlc2NyaXB0b3JzKHByb3RvdHlwZXMpO1xuICBkZXNjcmlwdG9ycy5jb25zdHJ1Y3RvciA9IHsgd3JpdGFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSwgdmFsdWU6IFN1YmNsYXNzIH07XG4gIFN1YmNsYXNzLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUodGhpcy5wcm90b3R5cGUsIGRlc2NyaXB0b3JzKTtcbiAgcmV0dXJuIFN1YmNsYXNzO1xufVxuXG4vLyBHZXQgZGVzY3JpcHRvcnMgKGFsbG93cyBmb3IgZ2V0dGVycyBhbmQgc2V0dGVycykgYW5kIHNldHMgZnVuY3Rpb25zIHRvIGJlIG5vbi1lbnVtZXJhYmxlXG5mdW5jdGlvbiBnZXREZXNjcmlwdG9ycyhvYmplY3RzKSB7XG4gIHZhciBkZXNjcmlwdG9ycyA9IHt9O1xuXG4gIG9iamVjdHMuZm9yRWFjaChmdW5jdGlvbihvYmplY3QpIHtcbiAgICBpZiAodHlwZW9mIG9iamVjdCA9PT0gJ2Z1bmN0aW9uJykgb2JqZWN0ID0gb2JqZWN0LnByb3RvdHlwZTtcblxuICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG9iamVjdCkuZm9yRWFjaChmdW5jdGlvbihuYW1lKSB7XG4gICAgICBpZiAobmFtZSA9PT0gJ3N0YXRpYycpIHJldHVybjtcblxuICAgICAgdmFyIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iamVjdCwgbmFtZSk7XG5cbiAgICAgIGlmICh0eXBlb2YgZGVzY3JpcHRvci52YWx1ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgZGVzY3JpcHRvcnNbbmFtZV0gPSBkZXNjcmlwdG9yO1xuICAgIH0pO1xuICB9KTtcbiAgcmV0dXJuIGRlc2NyaXB0b3JzO1xufVxuXG4vLyBDb3BpZXMgc3RhdGljIG1ldGhvZHMgb3ZlciBmb3Igc3RhdGljIGluaGVyaXRhbmNlXG5mdW5jdGlvbiBleHRlbmRTdGF0aWNzKENsYXNzLCBTdWJjbGFzcykge1xuXG4gIC8vIHN0YXRpYyBtZXRob2QgaW5oZXJpdGFuY2UgKGluY2x1ZGluZyBgZXh0ZW5kYClcbiAgT2JqZWN0LmtleXMoQ2xhc3MpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgdmFyIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKENsYXNzLCBrZXkpO1xuICAgIGlmICghZGVzY3JpcHRvci5jb25maWd1cmFibGUpIHJldHVybjtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShTdWJjbGFzcywga2V5LCBkZXNjcmlwdG9yKTtcbiAgfSk7XG59XG5cblxuLyoqXG4gKiBNYWtlcyBhIG5hdGl2ZSBvYmplY3QgcHJldGVuZCB0byBiZSBhbiBpbnN0YW5jZSBvZiBjbGFzcyAoZS5nLiBhZGRzIG1ldGhvZHMgdG8gYSBEb2N1bWVudEZyYWdtZW50IHRoZW4gY2FsbHMgdGhlXG4gKiBjb25zdHJ1Y3RvcikuXG4gKi9cbmZ1bmN0aW9uIG1ha2VJbnN0YW5jZU9mKG9iamVjdCkge1xuICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMob2JqZWN0LCBnZXREZXNjcmlwdG9ycyhbdGhpcy5wcm90b3R5cGVdKSk7XG4gIHRoaXMuYXBwbHkob2JqZWN0LCBhcmdzKTtcbiAgcmV0dXJuIG9iamVjdDtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gQW5pbWF0ZWRCaW5kaW5nO1xudmFyIGFuaW1hdGlvbiA9IHJlcXVpcmUoJy4vdXRpbC9hbmltYXRpb24nKTtcbnZhciBCaW5kaW5nID0gcmVxdWlyZSgnLi9iaW5kaW5nJyk7XG52YXIgX3N1cGVyID0gQmluZGluZy5wcm90b3R5cGU7XG5cbi8qKlxuICogQmluZGluZ3Mgd2hpY2ggZXh0ZW5kIEFuaW1hdGVkQmluZGluZyBoYXZlIHRoZSBhYmlsaXR5IHRvIGFuaW1hdGUgZWxlbWVudHMgdGhhdCBhcmUgYWRkZWQgdG8gdGhlIERPTSBhbmQgcmVtb3ZlZCBmcm9tXG4gKiB0aGUgRE9NLiBUaGlzIGFsbG93cyBtZW51cyB0byBzbGlkZSBvcGVuIGFuZCBjbG9zZWQsIGVsZW1lbnRzIHRvIGZhZGUgaW4gb3IgZHJvcCBkb3duLCBhbmQgcmVwZWF0ZWQgaXRlbXMgdG8gYXBwZWFyXG4gKiB0byBtb3ZlIChpZiB5b3UgZ2V0IGNyZWF0aXZlIGVub3VnaCkuXG4gKlxuICogVGhlIGZvbGxvd2luZyA1IG1ldGhvZHMgYXJlIGhlbHBlciBET00gbWV0aG9kcyB0aGF0IGFsbG93IHJlZ2lzdGVyZWQgYmluZGluZ3MgdG8gd29yayB3aXRoIENTUyB0cmFuc2l0aW9ucyBmb3JcbiAqIGFuaW1hdGluZyBlbGVtZW50cy4gSWYgYW4gZWxlbWVudCBoYXMgdGhlIGBhbmltYXRlYCBhdHRyaWJ1dGUgb3IgYSBtYXRjaGluZyBKYXZhU2NyaXB0IG1ldGhvZCwgdGhlc2UgaGVscGVyIG1ldGhvZHNcbiAqIHdpbGwgc2V0IGEgY2xhc3Mgb24gdGhlIG5vZGUgdG8gdHJpZ2dlciB0aGUgYW5pbWF0aW9uIGFuZC9vciBjYWxsIHRoZSBKYXZhU2NyaXB0IG1ldGhvZHMgdG8gaGFuZGxlIGl0LlxuICpcbiAqIEFuIGFuaW1hdGlvbiBtYXkgYmUgZWl0aGVyIGEgQ1NTIHRyYW5zaXRpb24sIGEgQ1NTIGFuaW1hdGlvbiwgb3IgYSBzZXQgb2YgSmF2YVNjcmlwdCBtZXRob2RzIHRoYXQgd2lsbCBiZSBjYWxsZWQuXG4gKlxuICogSWYgdXNpbmcgQ1NTLCBjbGFzc2VzIGFyZSBhZGRlZCBhbmQgcmVtb3ZlZCBmcm9tIHRoZSBlbGVtZW50LiBXaGVuIGFuIGVsZW1lbnQgaXMgaW5zZXJ0ZWQgaXQgd2lsbCByZWNlaXZlIHRoZSBgd2lsbC1cbiAqIGFuaW1hdGUtaW5gIGNsYXNzIGJlZm9yZSBiZWluZyBhZGRlZCB0byB0aGUgRE9NLCB0aGVuIGl0IHdpbGwgcmVjZWl2ZSB0aGUgYGFuaW1hdGUtaW5gIGNsYXNzIGltbWVkaWF0ZWx5IGFmdGVyIGJlaW5nXG4gKiBhZGRlZCB0byB0aGUgRE9NLCB0aGVuIGJvdGggY2xhc2VzIHdpbGwgYmUgcmVtb3ZlZCBhZnRlciB0aGUgYW5pbWF0aW9uIGlzIGNvbXBsZXRlLiBXaGVuIGFuIGVsZW1lbnQgaXMgYmVpbmcgcmVtb3ZlZFxuICogZnJvbSB0aGUgRE9NIGl0IHdpbGwgcmVjZWl2ZSB0aGUgYHdpbGwtYW5pbWF0ZS1vdXRgIGFuZCBgYW5pbWF0ZS1vdXRgIGNsYXNzZXMsIHRoZW4gdGhlIGNsYXNzZXMgd2lsbCBiZSByZW1vdmVkIG9uY2VcbiAqIHRoZSBhbmltYXRpb24gaXMgY29tcGxldGUuXG4gKlxuICogSWYgdXNpbmcgSmF2YVNjcmlwdCwgbWV0aG9kcyBtdXN0IGJlIGRlZmluZWQgIHRvIGFuaW1hdGUgdGhlIGVsZW1lbnQgdGhlcmUgYXJlIDMgc3VwcG9ydGVkIG1ldGhvZHMgd2hpY2ggY2FuIGJcbiAqXG4gKiBUT0RPIGNhY2hlIGJ5IGNsYXNzLW5hbWUgKEFuZ3VsYXIpPyBPbmx5IHN1cHBvcnQgamF2YXNjcmlwdC1zdHlsZSAoRW1iZXIpPyBBZGQgYSBgd2lsbC1hbmltYXRlLWluYCBhbmRcbiAqIGBkaWQtYW5pbWF0ZS1pbmAgZXRjLj9cbiAqIElGIGhhcyBhbnkgY2xhc3NlcywgYWRkIHRoZSBgd2lsbC1hbmltYXRlLWlufG91dGAgYW5kIGdldCBjb21wdXRlZCBkdXJhdGlvbi4gSWYgbm9uZSwgcmV0dXJuLiBDYWNoZS5cbiAqIFJVTEUgaXMgdXNlIHVuaXF1ZSBjbGFzcyB0byBkZWZpbmUgYW4gYW5pbWF0aW9uLiBPciBhdHRyaWJ1dGUgYGFuaW1hdGU9XCJmYWRlXCJgIHdpbGwgYWRkIHRoZSBjbGFzcz9cbiAqIGAuZmFkZS53aWxsLWFuaW1hdGUtaW5gLCBgLmZhZGUuYW5pbWF0ZS1pbmAsIGAuZmFkZS53aWxsLWFuaW1hdGUtb3V0YCwgYC5mYWRlLmFuaW1hdGUtb3V0YFxuICpcbiAqIEV2ZW50cyB3aWxsIGJlIHRyaWdnZXJlZCBvbiB0aGUgZWxlbWVudHMgbmFtZWQgdGhlIHNhbWUgYXMgdGhlIGNsYXNzIG5hbWVzIChlLmcuIGBhbmltYXRlLWluYCkgd2hpY2ggbWF5IGJlIGxpc3RlbmVkXG4gKiB0byBpbiBvcmRlciB0byBjYW5jZWwgYW4gYW5pbWF0aW9uIG9yIHJlc3BvbmQgdG8gaXQuXG4gKlxuICogSWYgdGhlIG5vZGUgaGFzIG1ldGhvZHMgYGFuaW1hdGVJbihkb25lKWAsIGBhbmltYXRlT3V0KGRvbmUpYCwgYGFuaW1hdGVNb3ZlSW4oZG9uZSlgLCBvciBgYW5pbWF0ZU1vdmVPdXQoZG9uZSlgXG4gKiBkZWZpbmVkIG9uIHRoZW0gdGhlbiB0aGUgaGVscGVycyB3aWxsIGFsbG93IGFuIGFuaW1hdGlvbiBpbiBKYXZhU2NyaXB0IHRvIGJlIHJ1biBhbmQgd2FpdCBmb3IgdGhlIGBkb25lYCBmdW5jdGlvbiB0b1xuICogYmUgY2FsbGVkIHRvIGtub3cgd2hlbiB0aGUgYW5pbWF0aW9uIGlzIGNvbXBsZXRlLlxuICpcbiAqIEJlIHN1cmUgdG8gYWN0dWFsbHkgaGF2ZSBhbiBhbmltYXRpb24gZGVmaW5lZCBmb3IgZWxlbWVudHMgd2l0aCB0aGUgYGFuaW1hdGVgIGNsYXNzL2F0dHJpYnV0ZSBiZWNhdXNlIHRoZSBoZWxwZXJzIHVzZVxuICogdGhlIGB0cmFuc2l0aW9uZW5kYCBhbmQgYGFuaW1hdGlvbmVuZGAgZXZlbnRzIHRvIGtub3cgd2hlbiB0aGUgYW5pbWF0aW9uIGlzIGZpbmlzaGVkLCBhbmQgaWYgdGhlcmUgaXMgbm8gYW5pbWF0aW9uXG4gKiB0aGVzZSBldmVudHMgd2lsbCBuZXZlciBiZSB0cmlnZ2VyZWQgYW5kIHRoZSBvcGVyYXRpb24gd2lsbCBuZXZlciBjb21wbGV0ZS5cbiAqL1xuZnVuY3Rpb24gQW5pbWF0ZWRCaW5kaW5nKHByb3BlcnRpZXMpIHtcbiAgdmFyIGVsZW1lbnQgPSBwcm9wZXJ0aWVzLm5vZGU7XG4gIHZhciBhbmltYXRlID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUocHJvcGVydGllcy5mcmFnbWVudHMuYW5pbWF0ZUF0dHJpYnV0ZSk7XG4gIHZhciBmcmFnbWVudHMgPSBwcm9wZXJ0aWVzLmZyYWdtZW50cztcblxuICBpZiAoYW5pbWF0ZSAhPT0gbnVsbCkge1xuICAgIGlmIChlbGVtZW50Lm5vZGVOYW1lID09PSAnVEVNUExBVEUnIHx8IGVsZW1lbnQubm9kZU5hbWUgPT09ICdTQ1JJUFQnKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBhbmltYXRlIG11bHRpcGxlIG5vZGVzIGluIGEgdGVtcGxhdGUgb3Igc2NyaXB0LiBSZW1vdmUgdGhlIFthbmltYXRlXSBhdHRyaWJ1dGUuJyk7XG4gICAgfVxuXG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIC8vIEFsbG93IG11bHRpcGxlIGJpbmRpbmdzIHRvIGFuaW1hdGUgYnkgbm90IHJlbW92aW5nIHVudGlsIHRoZXkgaGF2ZSBhbGwgYmVlbiBjcmVhdGVkXG4gICAgICBlbGVtZW50LnJlbW92ZUF0dHJpYnV0ZShwcm9wZXJ0aWVzLmZyYWdtZW50cy5hbmltYXRlQXR0cmlidXRlKTtcbiAgICB9KTtcblxuICAgIHRoaXMuYW5pbWF0ZSA9IHRydWU7XG5cbiAgICBpZiAoZnJhZ21lbnRzLmlzQm91bmQoJ2F0dHJpYnV0ZScsIGFuaW1hdGUpKSB7XG4gICAgICAvLyBqYXZhc2NyaXB0IGFuaW1hdGlvblxuICAgICAgdGhpcy5hbmltYXRlRXhwcmVzc2lvbiA9IGZyYWdtZW50cy5jb2RpZnlFeHByZXNzaW9uKCdhdHRyaWJ1dGUnLCBhbmltYXRlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGFuaW1hdGVbMF0gPT09ICcuJykge1xuICAgICAgICAvLyBjbGFzcyBhbmltYXRpb25cbiAgICAgICAgdGhpcy5hbmltYXRlQ2xhc3NOYW1lID0gYW5pbWF0ZS5zbGljZSgxKTtcbiAgICAgIH0gZWxzZSBpZiAoYW5pbWF0ZSkge1xuICAgICAgICAvLyByZWdpc3RlcmVkIGFuaW1hdGlvblxuICAgICAgICB2YXIgYW5pbWF0ZU9iamVjdCA9IGZyYWdtZW50cy5nZXRBbmltYXRpb24oYW5pbWF0ZSk7XG4gICAgICAgIGlmICh0eXBlb2YgYW5pbWF0ZU9iamVjdCA9PT0gJ2Z1bmN0aW9uJykgYW5pbWF0ZU9iamVjdCA9IG5ldyBhbmltYXRlT2JqZWN0KHRoaXMpO1xuICAgICAgICB0aGlzLmFuaW1hdGVPYmplY3QgPSBhbmltYXRlT2JqZWN0O1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIEJpbmRpbmcuY2FsbCh0aGlzLCBwcm9wZXJ0aWVzKTtcbn1cblxuXG5CaW5kaW5nLmV4dGVuZChBbmltYXRlZEJpbmRpbmcsIHtcbiAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgX3N1cGVyLmluaXQuY2FsbCh0aGlzKTtcblxuICAgIGlmICh0aGlzLmFuaW1hdGVFeHByZXNzaW9uKSB7XG4gICAgICB0aGlzLmFuaW1hdGVPYnNlcnZlciA9IG5ldyB0aGlzLk9ic2VydmVyKHRoaXMuYW5pbWF0ZUV4cHJlc3Npb24sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuYW5pbWF0ZU9iamVjdCA9IHZhbHVlO1xuICAgICAgfSwgdGhpcyk7XG4gICAgfVxuICB9LFxuXG4gIGJpbmQ6IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgICBpZiAodGhpcy5jb250ZXh0ID09IGNvbnRleHQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgX3N1cGVyLmJpbmQuY2FsbCh0aGlzLCBjb250ZXh0KTtcblxuICAgIGlmICh0aGlzLmFuaW1hdGVPYnNlcnZlcikge1xuICAgICAgdGhpcy5hbmltYXRlT2JzZXJ2ZXIuYmluZChjb250ZXh0KTtcbiAgICB9XG4gIH0sXG5cbiAgdW5iaW5kOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5jb250ZXh0ID09PSBudWxsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIF9zdXBlci51bmJpbmQuY2FsbCh0aGlzKTtcblxuICAgIGlmICh0aGlzLmFuaW1hdGVPYnNlcnZlcikge1xuICAgICAgdGhpcy5hbmltYXRlT2JzZXJ2ZXIudW5iaW5kKCk7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBIZWxwZXIgbWV0aG9kIHRvIHJlbW92ZSBhIG5vZGUgZnJvbSB0aGUgRE9NLCBhbGxvd2luZyBmb3IgYW5pbWF0aW9ucyB0byBvY2N1ci4gYGNhbGxiYWNrYCB3aWxsIGJlIGNhbGxlZCB3aGVuXG4gICAqIGZpbmlzaGVkLlxuICAgKi9cbiAgYW5pbWF0ZU91dDogZnVuY3Rpb24obm9kZSwgY2FsbGJhY2spIHtcbiAgICBpZiAobm9kZS5maXJzdFZpZXdOb2RlKSBub2RlID0gbm9kZS5maXJzdFZpZXdOb2RlO1xuXG4gICAgdGhpcy5hbmltYXRlTm9kZSgnb3V0Jywgbm9kZSwgZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrLmNhbGwodGhpcyk7XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEhlbHBlciBtZXRob2QgdG8gaW5zZXJ0IGEgbm9kZSBpbiB0aGUgRE9NIGJlZm9yZSBhbm90aGVyIG5vZGUsIGFsbG93aW5nIGZvciBhbmltYXRpb25zIHRvIG9jY3VyLiBgY2FsbGJhY2tgIHdpbGxcbiAgICogYmUgY2FsbGVkIHdoZW4gZmluaXNoZWQuIElmIGBiZWZvcmVgIGlzIG5vdCBwcm92aWRlZCB0aGVuIHRoZSBhbmltYXRpb24gd2lsbCBiZSBydW4gd2l0aG91dCBpbnNlcnRpbmcgdGhlIG5vZGUuXG4gICAqL1xuICBhbmltYXRlSW46IGZ1bmN0aW9uKG5vZGUsIGNhbGxiYWNrKSB7XG4gICAgaWYgKG5vZGUuZmlyc3RWaWV3Tm9kZSkgbm9kZSA9IG5vZGUuZmlyc3RWaWV3Tm9kZTtcbiAgICB0aGlzLmFuaW1hdGVOb2RlKCdpbicsIG5vZGUsIGNhbGxiYWNrLCB0aGlzKTtcbiAgfSxcblxuICAvKipcbiAgICogQWxsb3cgYW4gZWxlbWVudCB0byB1c2UgQ1NTMyB0cmFuc2l0aW9ucyBvciBhbmltYXRpb25zIHRvIGFuaW1hdGUgaW4gb3Igb3V0IG9mIHRoZSBwYWdlLlxuICAgKi9cbiAgYW5pbWF0ZU5vZGU6IGZ1bmN0aW9uKGRpcmVjdGlvbiwgbm9kZSwgY2FsbGJhY2spIHtcbiAgICB2YXIgYW5pbWF0ZU9iamVjdCwgY2xhc3NOYW1lLCBjbGFzc0FuaW1hdGVOYW1lLCBjbGFzc1dpbGxOYW1lLFxuICAgICAgICBtZXRob2RBbmltYXRlTmFtZSwgbWV0aG9kV2lsbE5hbWUsIG1ldGhvZERpZE5hbWUsIGRpciwgX3RoaXMgPSB0aGlzO1xuXG4gICAgaWYgKHRoaXMuYW5pbWF0ZU9iamVjdCAmJiB0eXBlb2YgdGhpcy5hbmltYXRlT2JqZWN0ID09PSAnb2JqZWN0Jykge1xuICAgICAgYW5pbWF0ZU9iamVjdCA9IHRoaXMuYW5pbWF0ZU9iamVjdDtcbiAgICB9IGVsc2UgaWYgKHRoaXMuYW5pbWF0ZUNsYXNzTmFtZSkge1xuICAgICAgY2xhc3NOYW1lID0gdGhpcy5hbmltYXRlQ2xhc3NOYW1lO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHRoaXMuYW5pbWF0ZU9iamVjdCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGNsYXNzTmFtZSA9IHRoaXMuYW5pbWF0ZU9iamVjdDtcbiAgICB9XG5cbiAgICBjbGFzc0FuaW1hdGVOYW1lID0gJ2FuaW1hdGUtJyArIGRpcmVjdGlvbjtcbiAgICBjbGFzc1dpbGxOYW1lID0gJ3dpbGwtYW5pbWF0ZS0nICsgZGlyZWN0aW9uO1xuICAgIGRpciA9IGRpcmVjdGlvbiA9PT0gJ2luJyA/ICdJbicgOiAnT3V0JztcbiAgICBtZXRob2RBbmltYXRlTmFtZSA9ICdhbmltYXRlJyArIGRpcjtcbiAgICBtZXRob2RXaWxsTmFtZSA9ICd3aWxsQW5pbWF0ZScgKyBkaXI7XG4gICAgbWV0aG9kRGlkTmFtZSA9ICdkaWRBbmltYXRlJyArIGRpcjtcblxuICAgIGlmIChjbGFzc05hbWUpIG5vZGUuY2xhc3NMaXN0LmFkZChjbGFzc05hbWUpO1xuICAgIG5vZGUuY2xhc3NMaXN0LmFkZChjbGFzc1dpbGxOYW1lKTtcblxuICAgIGlmIChhbmltYXRlT2JqZWN0KSB7XG4gICAgICBhbmltYXRpb24ubWFrZUVsZW1lbnRBbmltYXRhYmxlKG5vZGUpO1xuICAgICAgaWYgKGFuaW1hdGVPYmplY3RbbWV0aG9kV2lsbE5hbWVdKSB7XG4gICAgICAgIGFuaW1hdGVPYmplY3RbbWV0aG9kV2lsbE5hbWVdKG5vZGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHRyaWdnZXIgcmVmbG93XG4gICAgbm9kZS5vZmZzZXRXaWR0aCA9IG5vZGUub2Zmc2V0V2lkdGg7XG5cbiAgICBub2RlLmNsYXNzTGlzdC5hZGQoY2xhc3NBbmltYXRlTmFtZSk7XG4gICAgbm9kZS5jbGFzc0xpc3QucmVtb3ZlKGNsYXNzV2lsbE5hbWUpO1xuXG4gICAgdmFyIHdoZW5Eb25lID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoYW5pbWF0ZU9iamVjdCAmJiBhbmltYXRlT2JqZWN0W21ldGhvZERpZE5hbWVdKSBhbmltYXRlT2JqZWN0W21ldGhvZERpZE5hbWVdKG5vZGUpO1xuICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjay5jYWxsKF90aGlzKTtcbiAgICAgIG5vZGUuY2xhc3NMaXN0LnJlbW92ZShjbGFzc0FuaW1hdGVOYW1lKTtcbiAgICAgIGlmIChjbGFzc05hbWUpIG5vZGUuY2xhc3NMaXN0LnJlbW92ZShjbGFzc05hbWUpO1xuICAgIH07XG5cbiAgICBpZiAoYW5pbWF0ZU9iamVjdCAmJiBhbmltYXRlT2JqZWN0W21ldGhvZEFuaW1hdGVOYW1lXSkge1xuICAgICAgYW5pbWF0ZU9iamVjdFttZXRob2RBbmltYXRlTmFtZV0obm9kZSwgd2hlbkRvbmUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgZHVyYXRpb24gPSBnZXREdXJhdGlvbi5jYWxsKHRoaXMsIG5vZGUsIGRpcmVjdGlvbik7XG4gICAgICBpZiAoZHVyYXRpb24pIHtcbiAgICAgICAgb25BbmltYXRpb25FbmQobm9kZSwgZHVyYXRpb24sIHdoZW5Eb25lKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHdoZW5Eb25lKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG59KTtcblxuXG52YXIgdHJhbnNpdGlvbkR1cmF0aW9uTmFtZSA9ICd0cmFuc2l0aW9uRHVyYXRpb24nO1xudmFyIHRyYW5zaXRpb25EZWxheU5hbWUgPSAndHJhbnNpdGlvbkRlbGF5JztcbnZhciBhbmltYXRpb25EdXJhdGlvbk5hbWUgPSAnYW5pbWF0aW9uRHVyYXRpb24nO1xudmFyIGFuaW1hdGlvbkRlbGF5TmFtZSA9ICdhbmltYXRpb25EZWxheSc7XG52YXIgdHJhbnNpdGlvbkV2ZW50TmFtZSA9ICd0cmFuc2l0aW9uZW5kJztcbnZhciBhbmltYXRpb25FdmVudE5hbWUgPSAnYW5pbWF0aW9uZW5kJztcbnZhciBzdHlsZSA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZTtcblxuWyd3ZWJraXQnLCAnbW96JywgJ21zJywgJ28nXS5mb3JFYWNoKGZ1bmN0aW9uKHByZWZpeCkge1xuICBpZiAoc3R5bGUudHJhbnNpdGlvbkR1cmF0aW9uID09PSB1bmRlZmluZWQgJiYgc3R5bGVbcHJlZml4ICsgJ1RyYW5zaXRpb25EdXJhdGlvbiddKSB7XG4gICAgdHJhbnNpdGlvbkR1cmF0aW9uTmFtZSA9IHByZWZpeCArICdUcmFuc2l0aW9uRHVyYXRpb24nO1xuICAgIHRyYW5zaXRpb25EZWxheU5hbWUgPSBwcmVmaXggKyAnVHJhbnNpdGlvbkRlbGF5JztcbiAgICB0cmFuc2l0aW9uRXZlbnROYW1lID0gcHJlZml4ICsgJ3RyYW5zaXRpb25lbmQnO1xuICB9XG5cbiAgaWYgKHN0eWxlLmFuaW1hdGlvbkR1cmF0aW9uID09PSB1bmRlZmluZWQgJiYgc3R5bGVbcHJlZml4ICsgJ0FuaW1hdGlvbkR1cmF0aW9uJ10pIHtcbiAgICBhbmltYXRpb25EdXJhdGlvbk5hbWUgPSBwcmVmaXggKyAnQW5pbWF0aW9uRHVyYXRpb24nO1xuICAgIGFuaW1hdGlvbkRlbGF5TmFtZSA9IHByZWZpeCArICdBbmltYXRpb25EZWxheSc7XG4gICAgYW5pbWF0aW9uRXZlbnROYW1lID0gcHJlZml4ICsgJ2FuaW1hdGlvbmVuZCc7XG4gIH1cbn0pO1xuXG5cbmZ1bmN0aW9uIGdldER1cmF0aW9uKG5vZGUsIGRpcmVjdGlvbikge1xuICB2YXIgbWlsbGlzZWNvbmRzID0gdGhpcy5jbG9uZWRGcm9tWydfX2FuaW1hdGlvbkR1cmF0aW9uJyArIGRpcmVjdGlvbl07XG4gIGlmICghbWlsbGlzZWNvbmRzKSB7XG4gICAgLy8gUmVjYWxjIGlmIG5vZGUgd2FzIG91dCBvZiBET00gYmVmb3JlIGFuZCBoYWQgMCBkdXJhdGlvbiwgYXNzdW1lIHRoZXJlIGlzIGFsd2F5cyBTT01FIGR1cmF0aW9uLlxuICAgIHZhciBzdHlsZXMgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShub2RlKTtcbiAgICB2YXIgc2Vjb25kcyA9IE1hdGgubWF4KHBhcnNlRmxvYXQoc3R5bGVzW3RyYW5zaXRpb25EdXJhdGlvbk5hbWVdIHx8IDApICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlRmxvYXQoc3R5bGVzW3RyYW5zaXRpb25EZWxheU5hbWVdIHx8IDApLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VGbG9hdChzdHlsZXNbYW5pbWF0aW9uRHVyYXRpb25OYW1lXSB8fCAwKSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJzZUZsb2F0KHN0eWxlc1thbmltYXRpb25EZWxheU5hbWVdIHx8IDApKTtcbiAgICBtaWxsaXNlY29uZHMgPSBzZWNvbmRzICogMTAwMCB8fCAwO1xuICAgIHRoaXMuY2xvbmVkRnJvbS5fX2FuaW1hdGlvbkR1cmF0aW9uX18gPSBtaWxsaXNlY29uZHM7XG4gIH1cbiAgcmV0dXJuIG1pbGxpc2Vjb25kcztcbn1cblxuXG5mdW5jdGlvbiBvbkFuaW1hdGlvbkVuZChub2RlLCBkdXJhdGlvbiwgY2FsbGJhY2spIHtcbiAgdmFyIG9uRW5kID0gZnVuY3Rpb24oKSB7XG4gICAgbm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKHRyYW5zaXRpb25FdmVudE5hbWUsIG9uRW5kKTtcbiAgICBub2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIoYW5pbWF0aW9uRXZlbnROYW1lLCBvbkVuZCk7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgIGNhbGxiYWNrKCk7XG4gIH07XG5cbiAgLy8gY29udGluZ2VuY3kgcGxhblxuICB2YXIgdGltZW91dCA9IHNldFRpbWVvdXQob25FbmQsIGR1cmF0aW9uICsgMTApO1xuXG4gIG5vZGUuYWRkRXZlbnRMaXN0ZW5lcih0cmFuc2l0aW9uRXZlbnROYW1lLCBvbkVuZCk7XG4gIG5vZGUuYWRkRXZlbnRMaXN0ZW5lcihhbmltYXRpb25FdmVudE5hbWUsIG9uRW5kKTtcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IEJpbmRpbmc7XG52YXIgQ2xhc3MgPSByZXF1aXJlKCdjaGlwLXV0aWxzL2NsYXNzJyk7XG5cbi8qKlxuICogQSBiaW5kaW5nIGlzIGEgbGluayBiZXR3ZWVuIGFuIGVsZW1lbnQgYW5kIHNvbWUgZGF0YS4gU3ViY2xhc3NlcyBvZiBCaW5kaW5nIGNhbGxlZCBiaW5kZXJzIGRlZmluZSB3aGF0IGEgYmluZGluZyBkb2VzXG4gKiB3aXRoIHRoYXQgbGluay4gSW5zdGFuY2VzIG9mIHRoZXNlIGJpbmRlcnMgYXJlIGNyZWF0ZWQgYXMgYmluZGluZ3Mgb24gdGVtcGxhdGVzLiBXaGVuIGEgdmlldyBpcyBzdGFtcGVkIG91dCBmcm9tIHRoZVxuICogdGVtcGxhdGUgdGhlIGJpbmRpbmcgaXMgXCJjbG9uZWRcIiAoaXQgaXMgYWN0dWFsbHkgZXh0ZW5kZWQgZm9yIHBlcmZvcm1hbmNlKSBhbmQgdGhlIGBlbGVtZW50YC9gbm9kZWAgcHJvcGVydHkgaXNcbiAqIHVwZGF0ZWQgdG8gdGhlIG1hdGNoaW5nIGVsZW1lbnQgaW4gdGhlIHZpZXcuXG4gKlxuICogIyMjIFByb3BlcnRpZXNcbiAqICAqIGVsZW1lbnQ6IFRoZSBlbGVtZW50IChvciB0ZXh0IG5vZGUpIHRoaXMgYmluZGluZyBpcyBib3VuZCB0b1xuICogICogbm9kZTogQWxpYXMgb2YgZWxlbWVudCwgc2luY2UgYmluZGluZ3MgbWF5IGFwcGx5IHRvIHRleHQgbm9kZXMgdGhpcyBpcyBtb3JlIGFjY3VyYXRlXG4gKiAgKiBuYW1lOiBUaGUgYXR0cmlidXRlIG9yIGVsZW1lbnQgbmFtZSAoZG9lcyBub3QgYXBwbHkgdG8gbWF0Y2hlZCB0ZXh0IG5vZGVzKVxuICogICogbWF0Y2g6IFRoZSBtYXRjaGVkIHBhcnQgb2YgdGhlIG5hbWUgZm9yIHdpbGRjYXJkIGF0dHJpYnV0ZXMgKGUuZy4gYG9uLSpgIG1hdGNoaW5nIGFnYWluc3QgYG9uLWNsaWNrYCB3b3VsZCBoYXZlIGFcbiAqICAgIG1hdGNoIHByb3BlcnR5IGVxdWFsbGluZyBgY2xpY2tgKS4gVXNlIGB0aGlzLmNhbWVsQ2FzZWAgdG8gZ2V0IHRoZSBtYXRjaCBwcm9lcnR5IGNhbWVsQ2FzZWQuXG4gKiAgKiBleHByZXNzaW9uOiBUaGUgZXhwcmVzc2lvbiB0aGlzIGJpbmRpbmcgd2lsbCB1c2UgZm9yIGl0cyB1cGRhdGVzIChkb2VzIG5vdCBhcHBseSB0byBtYXRjaGVkIGVsZW1lbnRzKVxuICogICogY29udGV4dDogVGhlIGNvbnRleHQgdGhlIGV4cmVzc2lvbiBvcGVyYXRlcyB3aXRoaW4gd2hlbiBib3VuZFxuICovXG5mdW5jdGlvbiBCaW5kaW5nKHByb3BlcnRpZXMpIHtcbiAgaWYgKCFwcm9wZXJ0aWVzLm5vZGUgfHwgIXByb3BlcnRpZXMudmlldykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0EgYmluZGluZyBtdXN0IHJlY2VpdmUgYSBub2RlIGFuZCBhIHZpZXcnKTtcbiAgfVxuXG4gIC8vIGVsZW1lbnQgYW5kIG5vZGUgYXJlIGFsaWFzZXNcbiAgdGhpcy5fZWxlbWVudFBhdGggPSBpbml0Tm9kZVBhdGgocHJvcGVydGllcy5ub2RlLCBwcm9wZXJ0aWVzLnZpZXcpO1xuICB0aGlzLm5vZGUgPSBwcm9wZXJ0aWVzLm5vZGU7XG4gIHRoaXMuZWxlbWVudCA9IHByb3BlcnRpZXMubm9kZTtcbiAgdGhpcy5uYW1lID0gcHJvcGVydGllcy5uYW1lO1xuICB0aGlzLm1hdGNoID0gcHJvcGVydGllcy5tYXRjaDtcbiAgdGhpcy5leHByZXNzaW9uID0gcHJvcGVydGllcy5leHByZXNzaW9uO1xuICB0aGlzLmZyYWdtZW50cyA9IHByb3BlcnRpZXMuZnJhZ21lbnRzO1xuICB0aGlzLmNvbnRleHQgPSBudWxsO1xufVxuXG5DbGFzcy5leHRlbmQoQmluZGluZywge1xuICAvKipcbiAgICogRGVmYXVsdCBwcmlvcml0eSBiaW5kZXJzIG1heSBvdmVycmlkZS5cbiAgICovXG4gIHByaW9yaXR5OiAwLFxuXG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYSBjbG9uZWQgYmluZGluZy4gVGhpcyBoYXBwZW5zIGFmdGVyIGEgY29tcGlsZWQgYmluZGluZyBvbiBhIHRlbXBsYXRlIGlzIGNsb25lZCBmb3IgYSB2aWV3LlxuICAgKi9cbiAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuZXhwcmVzc2lvbikge1xuICAgICAgLy8gQW4gb2JzZXJ2ZXIgdG8gb2JzZXJ2ZSB2YWx1ZSBjaGFuZ2VzIHRvIHRoZSBleHByZXNzaW9uIHdpdGhpbiBhIGNvbnRleHRcbiAgICAgIHRoaXMub2JzZXJ2ZXIgPSB0aGlzLm9ic2VydmUodGhpcy5leHByZXNzaW9uLCB0aGlzLnVwZGF0ZWQpO1xuICAgIH1cbiAgICB0aGlzLmNyZWF0ZWQoKTtcbiAgfSxcblxuICAvKipcbiAgICogQ2xvbmUgdGhpcyBiaW5kaW5nIGZvciBhIHZpZXcuIFRoZSBlbGVtZW50L25vZGUgd2lsbCBiZSB1cGRhdGVkIGFuZCB0aGUgYmluZGluZyB3aWxsIGJlIGluaXRlZC5cbiAgICovXG4gIGNsb25lRm9yVmlldzogZnVuY3Rpb24odmlldykge1xuICAgIGlmICghdmlldykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQSBiaW5kaW5nIG11c3QgY2xvbmUgYWdhaW5zdCBhIHZpZXcnKTtcbiAgICB9XG5cbiAgICB2YXIgbm9kZSA9IHZpZXc7XG4gICAgdGhpcy5fZWxlbWVudFBhdGguZm9yRWFjaChmdW5jdGlvbihpbmRleCkge1xuICAgICAgbm9kZSA9IG5vZGUuY2hpbGROb2Rlc1tpbmRleF07XG4gICAgfSk7XG5cbiAgICB2YXIgYmluZGluZyA9IE9iamVjdC5jcmVhdGUodGhpcyk7XG4gICAgYmluZGluZy5jbG9uZWRGcm9tID0gdGhpcztcbiAgICBiaW5kaW5nLmVsZW1lbnQgPSBub2RlO1xuICAgIGJpbmRpbmcubm9kZSA9IG5vZGU7XG4gICAgYmluZGluZy5pbml0KCk7XG4gICAgcmV0dXJuIGJpbmRpbmc7XG4gIH0sXG5cblxuICAvLyBCaW5kIHRoaXMgdG8gdGhlIGdpdmVuIGNvbnRleHQgb2JqZWN0XG4gIGJpbmQ6IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgICBpZiAodGhpcy5jb250ZXh0ID09IGNvbnRleHQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICAgIGlmICh0aGlzLm9ic2VydmVyKSB0aGlzLm9ic2VydmVyLmNvbnRleHQgPSBjb250ZXh0O1xuICAgIHRoaXMuYm91bmQoKTtcblxuICAgIGlmICh0aGlzLm9ic2VydmVyKSB7XG4gICAgICBpZiAodGhpcy51cGRhdGVkICE9PSBCaW5kaW5nLnByb3RvdHlwZS51cGRhdGVkKSB7XG4gICAgICAgIHRoaXMub2JzZXJ2ZXIuZm9yY2VVcGRhdGVOZXh0U3luYyA9IHRydWU7XG4gICAgICAgIHRoaXMub2JzZXJ2ZXIuYmluZChjb250ZXh0KTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cblxuICAvLyBVbmJpbmQgdGhpcyBmcm9tIGl0cyBjb250ZXh0XG4gIHVuYmluZDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuY29udGV4dCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9ic2VydmVyKSB0aGlzLm9ic2VydmVyLnVuYmluZCgpO1xuICAgIHRoaXMudW5ib3VuZCgpO1xuICAgIHRoaXMuY29udGV4dCA9IG51bGw7XG4gIH0sXG5cblxuICAvLyBDbGVhbnMgdXAgYmluZGluZyBjb21wbGV0ZWx5XG4gIGRpc3Bvc2U6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudW5iaW5kKCk7XG4gICAgaWYgKHRoaXMub2JzZXJ2ZXIpIHtcbiAgICAgIC8vIFRoaXMgd2lsbCBjbGVhciBpdCBvdXQsIG51bGxpZnlpbmcgYW55IGRhdGEgc3RvcmVkXG4gICAgICB0aGlzLm9ic2VydmVyLnN5bmMoKTtcbiAgICB9XG4gICAgdGhpcy5kaXNwb3NlZCgpO1xuICB9LFxuXG5cbiAgLy8gVGhlIGZ1bmN0aW9uIHRvIHJ1biB3aGVuIHRoZSBiaW5kaW5nJ3MgZWxlbWVudCBpcyBjb21waWxlZCB3aXRoaW4gYSB0ZW1wbGF0ZVxuICBjb21waWxlZDogZnVuY3Rpb24oKSB7fSxcblxuICAvLyBUaGUgZnVuY3Rpb24gdG8gcnVuIHdoZW4gdGhlIGJpbmRpbmcncyBlbGVtZW50IGlzIGNyZWF0ZWRcbiAgY3JlYXRlZDogZnVuY3Rpb24oKSB7fSxcblxuICAvLyBUaGUgZnVuY3Rpb24gdG8gcnVuIHdoZW4gdGhlIGV4cHJlc3Npb24ncyB2YWx1ZSBjaGFuZ2VzXG4gIHVwZGF0ZWQ6IGZ1bmN0aW9uKCkge30sXG5cbiAgLy8gVGhlIGZ1bmN0aW9uIHRvIHJ1biB3aGVuIHRoZSBiaW5kaW5nIGlzIGJvdW5kXG4gIGJvdW5kOiBmdW5jdGlvbigpIHt9LFxuXG4gIC8vIFRoZSBmdW5jdGlvbiB0byBydW4gd2hlbiB0aGUgYmluZGluZyBpcyB1bmJvdW5kXG4gIHVuYm91bmQ6IGZ1bmN0aW9uKCkge30sXG5cbiAgLy8gVGhlIGZ1bmN0aW9uIHRvIHJ1biB3aGVuIHRoZSBiaW5kaW5nIGlzIGRpc3Bvc2VkXG4gIGRpc3Bvc2VkOiBmdW5jdGlvbigpIHt9LFxuXG4gIC8vIEhlbHBlciBtZXRob2RzXG5cbiAgZ2V0IGNhbWVsQ2FzZSgpIHtcbiAgICByZXR1cm4gKHRoaXMubWF0Y2ggfHwgdGhpcy5uYW1lIHx8ICcnKS5yZXBsYWNlKC8tKyhcXHcpL2csIGZ1bmN0aW9uKF8sIGNoYXIpIHtcbiAgICAgIHJldHVybiBjaGFyLnRvVXBwZXJDYXNlKCk7XG4gICAgfSk7XG4gIH0sXG5cbiAgb2JzZXJ2ZTogZnVuY3Rpb24oZXhwcmVzc2lvbiwgY2FsbGJhY2ssIGNhbGxiYWNrQ29udGV4dCkge1xuICAgIHJldHVybiB0aGlzLm9ic2VydmF0aW9ucy5jcmVhdGVPYnNlcnZlcihleHByZXNzaW9uLCBjYWxsYmFjaywgY2FsbGJhY2tDb250ZXh0IHx8IHRoaXMpO1xuICB9XG59KTtcblxuXG5cblxudmFyIGluZGV4T2YgPSBBcnJheS5wcm90b3R5cGUuaW5kZXhPZjtcblxuLy8gQ3JlYXRlcyBhbiBhcnJheSBvZiBpbmRleGVzIHRvIGhlbHAgZmluZCB0aGUgc2FtZSBlbGVtZW50IHdpdGhpbiBhIGNsb25lZCB2aWV3XG5mdW5jdGlvbiBpbml0Tm9kZVBhdGgobm9kZSwgdmlldykge1xuICB2YXIgcGF0aCA9IFtdO1xuICB3aGlsZSAobm9kZSAhPT0gdmlldykge1xuICAgIHZhciBwYXJlbnQgPSBub2RlLnBhcmVudE5vZGU7XG4gICAgcGF0aC51bnNoaWZ0KGluZGV4T2YuY2FsbChwYXJlbnQuY2hpbGROb2Rlcywgbm9kZSkpO1xuICAgIG5vZGUgPSBwYXJlbnQ7XG4gIH1cbiAgcmV0dXJuIHBhdGg7XG59XG4iLCJ2YXIgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG5tb2R1bGUuZXhwb3J0cyA9IGNvbXBpbGU7XG5cblxuLy8gV2Fsa3MgdGhlIHRlbXBsYXRlIERPTSByZXBsYWNpbmcgYW55IGJpbmRpbmdzIGFuZCBjYWNoaW5nIGJpbmRpbmdzIG9udG8gdGhlIHRlbXBsYXRlIG9iamVjdC5cbmZ1bmN0aW9uIGNvbXBpbGUoZnJhZ21lbnRzLCB0ZW1wbGF0ZSkge1xuICB2YXIgd2Fsa2VyID0gZG9jdW1lbnQuY3JlYXRlVHJlZVdhbGtlcih0ZW1wbGF0ZSwgTm9kZUZpbHRlci5TSE9XX0VMRU1FTlQgfCBOb2RlRmlsdGVyLlNIT1dfVEVYVCk7XG4gIHZhciBiaW5kaW5ncyA9IFtdLCBjdXJyZW50Tm9kZSwgcGFyZW50Tm9kZSwgcHJldmlvdXNOb2RlO1xuXG4gIC8vIFJlc2V0IGZpcnN0IG5vZGUgdG8gZW5zdXJlIGl0IGlzbid0IGEgZnJhZ21lbnRcbiAgd2Fsa2VyLm5leHROb2RlKCk7XG4gIHdhbGtlci5wcmV2aW91c05vZGUoKTtcblxuICAvLyBmaW5kIGJpbmRpbmdzIGZvciBlYWNoIG5vZGVcbiAgZG8ge1xuICAgIGN1cnJlbnROb2RlID0gd2Fsa2VyLmN1cnJlbnROb2RlO1xuICAgIHBhcmVudE5vZGUgPSBjdXJyZW50Tm9kZS5wYXJlbnROb2RlO1xuICAgIGJpbmRpbmdzLnB1c2guYXBwbHkoYmluZGluZ3MsIGdldEJpbmRpbmdzRm9yTm9kZShmcmFnbWVudHMsIGN1cnJlbnROb2RlLCB0ZW1wbGF0ZSkpO1xuXG4gICAgaWYgKGN1cnJlbnROb2RlLnBhcmVudE5vZGUgIT09IHBhcmVudE5vZGUpIHtcbiAgICAgIC8vIGN1cnJlbnROb2RlIHdhcyByZW1vdmVkIGFuZCBtYWRlIGEgdGVtcGxhdGVcbiAgICAgIHdhbGtlci5jdXJyZW50Tm9kZSA9IHByZXZpb3VzTm9kZSB8fCB3YWxrZXIucm9vdDtcbiAgICB9IGVsc2Uge1xuICAgICAgcHJldmlvdXNOb2RlID0gY3VycmVudE5vZGU7XG4gICAgfVxuICB9IHdoaWxlICh3YWxrZXIubmV4dE5vZGUoKSk7XG5cbiAgcmV0dXJuIGJpbmRpbmdzO1xufVxuXG5cblxuLy8gRmluZCBhbGwgdGhlIGJpbmRpbmdzIG9uIGEgZ2l2ZW4gbm9kZSAodGV4dCBub2RlcyB3aWxsIG9ubHkgZXZlciBoYXZlIG9uZSBiaW5kaW5nKS5cbmZ1bmN0aW9uIGdldEJpbmRpbmdzRm9yTm9kZShmcmFnbWVudHMsIG5vZGUsIHZpZXcpIHtcbiAgdmFyIGJpbmRpbmdzID0gW107XG4gIHZhciBCaW5kZXIsIGJpbmRpbmcsIGV4cHIsIGJvdW5kLCBtYXRjaCwgYXR0ciwgaSwgbDtcblxuICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gTm9kZS5URVhUX05PREUpIHtcbiAgICBzcGxpdFRleHROb2RlKGZyYWdtZW50cywgbm9kZSk7XG5cbiAgICAvLyBGaW5kIGFueSBiaW5kaW5nIGZvciB0aGUgdGV4dCBub2RlXG4gICAgaWYgKGZyYWdtZW50cy5pc0JvdW5kKCd0ZXh0Jywgbm9kZS5ub2RlVmFsdWUpKSB7XG4gICAgICBleHByID0gZnJhZ21lbnRzLmNvZGlmeUV4cHJlc3Npb24oJ3RleHQnLCBub2RlLm5vZGVWYWx1ZSk7XG4gICAgICBub2RlLm5vZGVWYWx1ZSA9ICcnO1xuICAgICAgQmluZGVyID0gZnJhZ21lbnRzLmZpbmRCaW5kZXIoJ3RleHQnLCBleHByKTtcbiAgICAgIGJpbmRpbmcgPSBuZXcgQmluZGVyKHsgbm9kZTogbm9kZSwgdmlldzogdmlldywgZXhwcmVzc2lvbjogZXhwciwgZnJhZ21lbnRzOiBmcmFnbWVudHMgfSk7XG4gICAgICBpZiAoYmluZGluZy5jb21waWxlZCgpICE9PSBmYWxzZSkge1xuICAgICAgICBiaW5kaW5ncy5wdXNoKGJpbmRpbmcpO1xuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyBJZiB0aGUgZWxlbWVudCBpcyByZW1vdmVkIGZyb20gdGhlIERPTSwgc3RvcC4gQ2hlY2sgYnkgbG9va2luZyBhdCBpdHMgcGFyZW50Tm9kZVxuICAgIHZhciBwYXJlbnQgPSBub2RlLnBhcmVudE5vZGU7XG4gICAgdmFyIERlZmF1bHRCaW5kZXIgPSBmcmFnbWVudHMuZ2V0QXR0cmlidXRlQmluZGVyKCdfX2RlZmF1bHRfXycpO1xuXG4gICAgLy8gRmluZCBhbnkgYmluZGluZyBmb3IgdGhlIGVsZW1lbnRcbiAgICBCaW5kZXIgPSBmcmFnbWVudHMuZmluZEJpbmRlcignZWxlbWVudCcsIG5vZGUudGFnTmFtZS50b0xvd2VyQ2FzZSgpKTtcbiAgICBpZiAoQmluZGVyKSB7XG4gICAgICBiaW5kaW5nID0gbmV3IEJpbmRlcih7IG5vZGU6IG5vZGUsIHZpZXc6IHZpZXcsIGZyYWdtZW50czogZnJhZ21lbnRzIH0pO1xuICAgICAgaWYgKGJpbmRpbmcuY29tcGlsZWQoKSAhPT0gZmFsc2UpIHtcbiAgICAgICAgYmluZGluZ3MucHVzaChiaW5kaW5nKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBJZiByZW1vdmVkLCBtYWRlIGEgdGVtcGxhdGUsIGRvbid0IGNvbnRpbnVlIHByb2Nlc3NpbmdcbiAgICBpZiAobm9kZS5wYXJlbnROb2RlICE9PSBwYXJlbnQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBGaW5kIGFuZCBhZGQgYW55IGF0dHJpYnV0ZSBiaW5kaW5ncyBvbiBhbiBlbGVtZW50LiBUaGVzZSBjYW4gYmUgYXR0cmlidXRlcyB3aG9zZSBuYW1lIG1hdGNoZXMgYSBiaW5kaW5nLCBvclxuICAgIC8vIHRoZXkgY2FuIGJlIGF0dHJpYnV0ZXMgd2hpY2ggaGF2ZSBhIGJpbmRpbmcgaW4gdGhlIHZhbHVlIHN1Y2ggYXMgYGhyZWY9XCIvcG9zdC97eyBwb3N0LmlkIH19XCJgLlxuICAgIGJvdW5kID0gW107XG4gICAgdmFyIGF0dHJpYnV0ZXMgPSBzbGljZS5jYWxsKG5vZGUuYXR0cmlidXRlcyk7XG4gICAgZm9yIChpID0gMCwgbCA9IGF0dHJpYnV0ZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBhdHRyID0gYXR0cmlidXRlc1tpXTtcbiAgICAgIEJpbmRlciA9IGZyYWdtZW50cy5maW5kQmluZGVyKCdhdHRyaWJ1dGUnLCBhdHRyLm5hbWUsIGF0dHIudmFsdWUpO1xuICAgICAgaWYgKEJpbmRlcikge1xuICAgICAgICBib3VuZC5wdXNoKFsgQmluZGVyLCBhdHRyIF0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE1ha2Ugc3VyZSB0byBjcmVhdGUgYW5kIHByb2Nlc3MgdGhlbSBpbiB0aGUgY29ycmVjdCBwcmlvcml0eSBvcmRlciBzbyBpZiBhIGJpbmRpbmcgY3JlYXRlIGEgdGVtcGxhdGUgZnJvbSB0aGVcbiAgICAvLyBub2RlIGl0IGRvZXNuJ3QgcHJvY2VzcyB0aGUgb3RoZXJzLlxuICAgIGJvdW5kLnNvcnQoc29ydEF0dHJpYnV0ZXMpO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IGJvdW5kLmxlbmd0aDsgaSsrKSB7XG4gICAgICBCaW5kZXIgPSBib3VuZFtpXVswXTtcbiAgICAgIGF0dHIgPSBib3VuZFtpXVsxXTtcbiAgICAgIGlmICghbm9kZS5oYXNBdHRyaWJ1dGUoYXR0ci5uYW1lKSkge1xuICAgICAgICAvLyBJZiB0aGlzIHdhcyByZW1vdmVkIGFscmVhZHkgYnkgYW5vdGhlciBiaW5kaW5nLCBkb24ndCBwcm9jZXNzLlxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHZhciBuYW1lID0gYXR0ci5uYW1lO1xuICAgICAgdmFyIHZhbHVlID0gYXR0ci52YWx1ZTtcbiAgICAgIGlmIChCaW5kZXIuZXhwcikge1xuICAgICAgICBtYXRjaCA9IG5hbWUubWF0Y2goQmluZGVyLmV4cHIpO1xuICAgICAgICBpZiAobWF0Y2gpIG1hdGNoID0gbWF0Y2hbMV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtYXRjaCA9IG51bGw7XG4gICAgICB9XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKGF0dHIubmFtZSk7XG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgLy8gaWYgdGhlIGF0dHJpYnV0ZSB3YXMgYWxyZWFkeSByZW1vdmVkIGRvbid0IHdvcnJ5XG4gICAgICB9XG5cbiAgICAgIGJpbmRpbmcgPSBuZXcgQmluZGVyKHtcbiAgICAgICAgbm9kZTogbm9kZSxcbiAgICAgICAgdmlldzogdmlldyxcbiAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgbWF0Y2g6IG1hdGNoLFxuICAgICAgICBleHByZXNzaW9uOiB2YWx1ZSA/IGZyYWdtZW50cy5jb2RpZnlFeHByZXNzaW9uKCdhdHRyaWJ1dGUnLCB2YWx1ZSwgQmluZGVyICE9PSBEZWZhdWx0QmluZGVyKSA6IG51bGwsXG4gICAgICAgIGZyYWdtZW50czogZnJhZ21lbnRzXG4gICAgICB9KTtcblxuICAgICAgaWYgKGJpbmRpbmcuY29tcGlsZWQoKSAhPT0gZmFsc2UpIHtcbiAgICAgICAgYmluZGluZ3MucHVzaChiaW5kaW5nKTtcbiAgICAgIH0gZWxzZSBpZiAoQmluZGVyICE9PSBEZWZhdWx0QmluZGVyICYmIGZyYWdtZW50cy5pc0JvdW5kKCdhdHRyaWJ1dGUnLCB2YWx1ZSkpIHtcbiAgICAgICAgLy8gUmV2ZXJ0IHRvIGRlZmF1bHQgaWYgdGhpcyBiaW5kaW5nIGRvZXNuJ3QgdGFrZVxuICAgICAgICBib3VuZC5wdXNoKFsgRGVmYXVsdEJpbmRlciwgYXR0ciBdKTtcbiAgICAgIH1cblxuICAgICAgaWYgKG5vZGUucGFyZW50Tm9kZSAhPT0gcGFyZW50KSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBiaW5kaW5ncy5zb3J0KHNvcnRCaW5kaW5ncyk7XG59XG5cblxuLy8gU3BsaXRzIHRleHQgbm9kZXMgd2l0aCBleHByZXNzaW9ucyBpbiB0aGVtIHNvIHRoZXkgY2FuIGJlIGJvdW5kIGluZGl2aWR1YWxseSwgaGFzIHBhcmVudE5vZGUgcGFzc2VkIGluIHNpbmNlIGl0IG1heVxuLy8gYmUgYSBkb2N1bWVudCBmcmFnbWVudCB3aGljaCBhcHBlYXJzIGFzIG51bGwgb24gbm9kZS5wYXJlbnROb2RlLlxuZnVuY3Rpb24gc3BsaXRUZXh0Tm9kZShmcmFnbWVudHMsIG5vZGUpIHtcbiAgaWYgKCFub2RlLnByb2Nlc3NlZCkge1xuICAgIG5vZGUucHJvY2Vzc2VkID0gdHJ1ZTtcbiAgICB2YXIgcmVnZXggPSBmcmFnbWVudHMuYmluZGVycy50ZXh0Ll9leHByO1xuICAgIHZhciBjb250ZW50ID0gbm9kZS5ub2RlVmFsdWU7XG4gICAgaWYgKGNvbnRlbnQubWF0Y2gocmVnZXgpKSB7XG4gICAgICB2YXIgbWF0Y2gsIGxhc3RJbmRleCA9IDAsIHBhcnRzID0gW10sIGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgICAgd2hpbGUgKChtYXRjaCA9IHJlZ2V4LmV4ZWMoY29udGVudCkpKSB7XG4gICAgICAgIHBhcnRzLnB1c2goY29udGVudC5zbGljZShsYXN0SW5kZXgsIHJlZ2V4Lmxhc3RJbmRleCAtIG1hdGNoWzBdLmxlbmd0aCkpO1xuICAgICAgICBwYXJ0cy5wdXNoKG1hdGNoWzBdKTtcbiAgICAgICAgbGFzdEluZGV4ID0gcmVnZXgubGFzdEluZGV4O1xuICAgICAgfVxuICAgICAgcGFydHMucHVzaChjb250ZW50LnNsaWNlKGxhc3RJbmRleCkpO1xuICAgICAgcGFydHMgPSBwYXJ0cy5maWx0ZXIobm90RW1wdHkpO1xuXG4gICAgICBub2RlLm5vZGVWYWx1ZSA9IHBhcnRzWzBdO1xuICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgbmV3VGV4dE5vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShwYXJ0c1tpXSk7XG4gICAgICAgIG5ld1RleHROb2RlLnByb2Nlc3NlZCA9IHRydWU7XG4gICAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKG5ld1RleHROb2RlKTtcbiAgICAgIH1cbiAgICAgIG5vZGUucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoZnJhZ21lbnQsIG5vZGUubmV4dFNpYmxpbmcpO1xuICAgIH1cbiAgfVxufVxuXG5cbmZ1bmN0aW9uIHNvcnRCaW5kaW5ncyhhLCBiKSB7XG4gIHJldHVybiBiLnByaW9yaXR5IC0gYS5wcmlvcml0eTtcbn1cblxuZnVuY3Rpb24gc29ydEF0dHJpYnV0ZXMoYSwgYikge1xuICByZXR1cm4gc29ydEJpbmRpbmdzKGJbMF0ucHJvdG90eXBlLCBhWzBdLnByb3RvdHlwZSk7XG59XG5cbmZ1bmN0aW9uIG5vdEVtcHR5KHZhbHVlKSB7XG4gIHJldHVybiBCb29sZWFuKHZhbHVlKTtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gRnJhZ21lbnRzO1xucmVxdWlyZSgnLi91dGlsL3BvbHlmaWxscycpO1xudmFyIENsYXNzID0gcmVxdWlyZSgnY2hpcC11dGlscy9jbGFzcycpO1xudmFyIHRvRnJhZ21lbnQgPSByZXF1aXJlKCcuL3V0aWwvdG9GcmFnbWVudCcpO1xudmFyIGFuaW1hdGlvbiA9IHJlcXVpcmUoJy4vdXRpbC9hbmltYXRpb24nKTtcbnZhciBUZW1wbGF0ZSA9IHJlcXVpcmUoJy4vdGVtcGxhdGUnKTtcbnZhciBWaWV3ID0gcmVxdWlyZSgnLi92aWV3Jyk7XG52YXIgQmluZGluZyA9IHJlcXVpcmUoJy4vYmluZGluZycpO1xudmFyIEFuaW1hdGVkQmluZGluZyA9IHJlcXVpcmUoJy4vYW5pbWF0ZWRCaW5kaW5nJyk7XG52YXIgY29tcGlsZSA9IHJlcXVpcmUoJy4vY29tcGlsZScpO1xudmFyIGhhc1dpbGRjYXJkRXhwciA9IC8oXnxbXlxcXFxdKVxcKi87XG52YXIgZXNjYXBlZFdpbGRjYXJkRXhwciA9IC8oXnxbXlxcXFxdKVxcXFxcXCovO1xuXG4vKipcbiAqIEEgRnJhZ21lbnRzIG9iamVjdCBzZXJ2ZXMgYXMgYSByZWdpc3RyeSBmb3IgYmluZGVycyBhbmQgZm9ybWF0dGVyc1xuICogQHBhcmFtIHtPYnNlcnZhdGlvbnN9IG9ic2VydmF0aW9ucyBBbiBpbnN0YW5jZSBvZiBPYnNlcnZhdGlvbnMgZm9yIHRyYWNraW5nIGNoYW5nZXMgdG8gdGhlIGRhdGFcbiAqL1xuZnVuY3Rpb24gRnJhZ21lbnRzKG9ic2VydmF0aW9ucykge1xuICBpZiAoIW9ic2VydmF0aW9ucykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ011c3QgcHJvdmlkZSBhbiBvYnNlcnZhdGlvbnMgaW5zdGFuY2UgdG8gRnJhZ21lbnRzLicpO1xuICB9XG5cbiAgdGhpcy5vYnNlcnZhdGlvbnMgPSBvYnNlcnZhdGlvbnM7XG4gIHRoaXMuZ2xvYmFscyA9IG9ic2VydmF0aW9ucy5nbG9iYWxzO1xuICB0aGlzLmZvcm1hdHRlcnMgPSBvYnNlcnZhdGlvbnMuZm9ybWF0dGVycztcbiAgdGhpcy5hbmltYXRpb25zID0ge307XG4gIHRoaXMuYW5pbWF0ZUF0dHJpYnV0ZSA9ICdhbmltYXRlJztcblxuICB0aGlzLmJpbmRlcnMgPSB7XG4gICAgZWxlbWVudDogeyBfd2lsZGNhcmRzOiBbXSB9LFxuICAgIGF0dHJpYnV0ZTogeyBfd2lsZGNhcmRzOiBbXSwgX2V4cHI6IC97e1xccyooLio/KVxccyp9fS9nLCBfZGVsaW1pdGVyc09ubHlJbkRlZmF1bHQ6IGZhbHNlIH0sXG4gICAgdGV4dDogeyBfd2lsZGNhcmRzOiBbXSwgX2V4cHI6IC97e1xccyooLio/KVxccyp9fS9nIH1cbiAgfTtcblxuICAvLyBUZXh0IGJpbmRlciBmb3IgdGV4dCBub2RlcyB3aXRoIGV4cHJlc3Npb25zIGluIHRoZW1cbiAgdGhpcy5yZWdpc3RlclRleHQoJ19fZGVmYXVsdF9fJywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICB0aGlzLmVsZW1lbnQudGV4dENvbnRlbnQgPSAodmFsdWUgIT0gbnVsbCkgPyB2YWx1ZSA6ICcnO1xuICB9KTtcblxuICAvLyBDYXRjaGFsbCBhdHRyaWJ1dGUgYmluZGVyIGZvciByZWd1bGFyIGF0dHJpYnV0ZXMgd2l0aCBleHByZXNzaW9ucyBpbiB0aGVtXG4gIHRoaXMucmVnaXN0ZXJBdHRyaWJ1dGUoJ19fZGVmYXVsdF9fJywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAodmFsdWUgIT0gbnVsbCkge1xuICAgICAgdGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZSh0aGlzLm5hbWUsIHZhbHVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5lbGVtZW50LnJlbW92ZUF0dHJpYnV0ZSh0aGlzLm5hbWUpO1xuICAgIH1cbiAgfSk7XG59XG5cbkNsYXNzLmV4dGVuZChGcmFnbWVudHMsIHtcblxuICAvKipcbiAgICogVGFrZXMgYW4gSFRNTCBzdHJpbmcsIGFuIGVsZW1lbnQsIGFuIGFycmF5IG9mIGVsZW1lbnRzLCBvciBhIGRvY3VtZW50IGZyYWdtZW50LCBhbmQgY29tcGlsZXMgaXQgaW50byBhIHRlbXBsYXRlLlxuICAgKiBJbnN0YW5jZXMgbWF5IHRoZW4gYmUgY3JlYXRlZCBhbmQgYm91bmQgdG8gYSBnaXZlbiBjb250ZXh0LlxuICAgKiBAcGFyYW0ge1N0cmluZ3xOb2RlTGlzdHxIVE1MQ29sbGVjdGlvbnxIVE1MVGVtcGxhdGVFbGVtZW50fEhUTUxTY3JpcHRFbGVtZW50fE5vZGV9IGh0bWwgQSBUZW1wbGF0ZSBjYW4gYmUgY3JlYXRlZFxuICAgKiBmcm9tIG1hbnkgZGlmZmVyZW50IHR5cGVzIG9mIG9iamVjdHMuIEFueSBvZiB0aGVzZSB3aWxsIGJlIGNvbnZlcnRlZCBpbnRvIGEgZG9jdW1lbnQgZnJhZ21lbnQgZm9yIHRoZSB0ZW1wbGF0ZSB0b1xuICAgKiBjbG9uZS4gTm9kZXMgYW5kIGVsZW1lbnRzIHBhc3NlZCBpbiB3aWxsIGJlIHJlbW92ZWQgZnJvbSB0aGUgRE9NLlxuICAgKi9cbiAgY3JlYXRlVGVtcGxhdGU6IGZ1bmN0aW9uKGh0bWwpIHtcbiAgICB2YXIgZnJhZ21lbnQgPSB0b0ZyYWdtZW50KGh0bWwpO1xuICAgIGlmIChmcmFnbWVudC5jaGlsZE5vZGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgY3JlYXRlIGEgdGVtcGxhdGUgZnJvbSAnICsgaHRtbCk7XG4gICAgfVxuICAgIHZhciB0ZW1wbGF0ZSA9IFRlbXBsYXRlLm1ha2VJbnN0YW5jZU9mKGZyYWdtZW50KTtcbiAgICB0ZW1wbGF0ZS5iaW5kaW5ncyA9IGNvbXBpbGUodGhpcywgdGVtcGxhdGUpO1xuICAgIHJldHVybiB0ZW1wbGF0ZTtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBDb21waWxlcyBiaW5kaW5ncyBvbiBhbiBlbGVtZW50LlxuICAgKi9cbiAgY29tcGlsZUVsZW1lbnQ6IGZ1bmN0aW9uKGVsZW1lbnQpIHtcbiAgICBpZiAoIWVsZW1lbnQuYmluZGluZ3MpIHtcbiAgICAgIGVsZW1lbnQuYmluZGluZ3MgPSBjb21waWxlKHRoaXMsIGVsZW1lbnQpO1xuICAgICAgVmlldy5tYWtlSW5zdGFuY2VPZihlbGVtZW50KTtcbiAgICB9XG5cbiAgICByZXR1cm4gZWxlbWVudDtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBDb21waWxlcyBhbmQgYmluZHMgYW4gZWxlbWVudCB3aGljaCB3YXMgbm90IGNyZWF0ZWQgZnJvbSBhIHRlbXBsYXRlLiBNb3N0bHkgb25seSB1c2VkIGZvciBiaW5kaW5nIHRoZSBkb2N1bWVudCdzXG4gICAqIGh0bWwgZWxlbWVudC5cbiAgICovXG4gIGJpbmRFbGVtZW50OiBmdW5jdGlvbihlbGVtZW50LCBjb250ZXh0KSB7XG4gICAgdGhpcy5jb21waWxlRWxlbWVudChlbGVtZW50KTtcblxuICAgIGlmIChjb250ZXh0KSB7XG4gICAgICBlbGVtZW50LmJpbmQoY29udGV4dCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGVsZW1lbnQ7XG4gIH0sXG5cblxuICAvKipcbiAgICogT2JzZXJ2ZXMgYW4gZXhwcmVzc2lvbiB3aXRoaW4gYSBnaXZlbiBjb250ZXh0LCBjYWxsaW5nIHRoZSBjYWxsYmFjayB3aGVuIGl0IGNoYW5nZXMgYW5kIHJldHVybmluZyB0aGUgb2JzZXJ2ZXIuXG4gICAqL1xuICBvYnNlcnZlOiBmdW5jdGlvbihjb250ZXh0LCBleHByLCBjYWxsYmFjaywgY2FsbGJhY2tDb250ZXh0KSB7XG4gICAgaWYgKHR5cGVvZiBjb250ZXh0ID09PSAnc3RyaW5nJykge1xuICAgICAgY2FsbGJhY2tDb250ZXh0ID0gY2FsbGJhY2s7XG4gICAgICBjYWxsYmFjayA9IGV4cHI7XG4gICAgICBleHByID0gY29udGV4dDtcbiAgICAgIGNvbnRleHQgPSBudWxsO1xuICAgIH1cbiAgICB2YXIgb2JzZXJ2ZXIgPSB0aGlzLm9ic2VydmF0aW9ucy5jcmVhdGVPYnNlcnZlcihleHByLCBjYWxsYmFjaywgY2FsbGJhY2tDb250ZXh0KTtcbiAgICBpZiAoY29udGV4dCkge1xuICAgICAgb2JzZXJ2ZXIuYmluZChjb250ZXh0LCB0cnVlKTtcbiAgICB9XG4gICAgcmV0dXJuIG9ic2VydmVyO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVycyBhIGJpbmRlciBmb3IgYSBnaXZlbiB0eXBlIGFuZCBuYW1lLiBBIGJpbmRlciBpcyBhIHN1YmNsYXNzIG9mIEJpbmRpbmcgYW5kIGlzIHVzZWQgdG8gY3JlYXRlIGJpbmRpbmdzIG9uXG4gICAqIGFuIGVsZW1lbnQgb3IgdGV4dCBub2RlIHdob3NlIHRhZyBuYW1lLCBhdHRyaWJ1dGUgbmFtZSwgb3IgZXhwcmVzc2lvbiBjb250ZW50cyBtYXRjaCB0aGlzIGJpbmRlcidzIG5hbWUvZXhwcmVzc2lvbi5cbiAgICpcbiAgICogIyMjIFBhcmFtZXRlcnNcbiAgICpcbiAgICogICogYHR5cGVgOiB0aGVyZSBhcmUgdGhyZWUgdHlwZXMgb2YgYmluZGVyczogZWxlbWVudCwgYXR0cmlidXRlLCBvciB0ZXh0LiBUaGVzZSBjb3JyZXNwb25kIHRvIG1hdGNoaW5nIGFnYWluc3QgYW5cbiAgICogICAgZWxlbWVudCdzIHRhZyBuYW1lLCBhbiBlbGVtZW50IHdpdGggdGhlIGdpdmVuIGF0dHJpYnV0ZSBuYW1lLCBvciBhIHRleHQgbm9kZSB0aGF0IG1hdGNoZXMgdGhlIHByb3ZpZGVkXG4gICAqICAgIGV4cHJlc3Npb24uXG4gICAqXG4gICAqICAqIGBuYW1lYDogdG8gbWF0Y2gsIGEgYmluZGVyIG5lZWRzIHRoZSBuYW1lIG9mIGFuIGVsZW1lbnQgb3IgYXR0cmlidXRlLCBvciBhIHJlZ3VsYXIgZXhwcmVzc2lvbiB0aGF0IG1hdGNoZXMgYVxuICAgKiAgICBnaXZlbiB0ZXh0IG5vZGUuIE5hbWVzIGZvciBlbGVtZW50cyBhbmQgYXR0cmlidXRlcyBjYW4gYmUgcmVndWxhciBleHByZXNzaW9ucyBhcyB3ZWxsLCBvciB0aGV5IG1heSBiZSB3aWxkY2FyZFxuICAgKiAgICBuYW1lcyBieSB1c2luZyBhbiBhc3Rlcmlzay5cbiAgICpcbiAgICogICogYGRlZmluaXRpb25gOiBhIGJpbmRlciBpcyBhIHN1YmNsYXNzIG9mIEJpbmRpbmcgd2hpY2ggb3ZlcnJpZGVzIGtleSBtZXRob2RzLCBgY29tcGlsZWRgLCBgY3JlYXRlZGAsIGB1cGRhdGVkYCxcbiAgICogICAgYGJvdW5kYCwgYW5kIGB1bmJvdW5kYC4gVGhlIGRlZmluaXRpb24gbWF5IGJlIGFuIGFjdHVhbCBzdWJjbGFzcyBvZiBCaW5kaW5nIG9yIGl0IG1heSBiZSBhbiBvYmplY3Qgd2hpY2ggd2lsbCBiZVxuICAgKiAgICB1c2VkIGZvciB0aGUgcHJvdG90eXBlIG9mIHRoZSBuZXdseSBjcmVhdGVkIHN1YmNsYXNzLiBGb3IgbWFueSBiaW5kaW5ncyBvbmx5IHRoZSBgdXBkYXRlZGAgbWV0aG9kIGlzIG92ZXJyaWRkZW4sXG4gICAqICAgIHNvIGJ5IGp1c3QgcGFzc2luZyBpbiBhIGZ1bmN0aW9uIGZvciBgZGVmaW5pdGlvbmAgdGhlIGJpbmRlciB3aWxsIGJlIGNyZWF0ZWQgd2l0aCB0aGF0IGFzIGl0cyBgdXBkYXRlZGAgbWV0aG9kLlxuICAgKlxuICAgKiAjIyMgRXhwbGFpbmF0aW9uIG9mIHByb3BlcnRpZXMgYW5kIG1ldGhvZHNcbiAgICpcbiAgICogICAqIGBwcmlvcml0eWAgbWF5IGJlIGRlZmluZWQgYXMgbnVtYmVyIHRvIGluc3RydWN0IHNvbWUgYmluZGVycyB0byBiZSBwcm9jZXNzZWQgYmVmb3JlIG90aGVycy4gQmluZGVycyB3aXRoXG4gICAqICAgaGlnaGVyIHByaW9yaXR5IGFyZSBwcm9jZXNzZWQgZmlyc3QuXG4gICAqXG4gICAqICAgKiBgYW5pbWF0ZWRgIGNhbiBiZSBzZXQgdG8gYHRydWVgIHRvIGV4dGVuZCB0aGUgQW5pbWF0ZWRCaW5kaW5nIGNsYXNzIHdoaWNoIHByb3ZpZGVzIHN1cHBvcnQgZm9yIGFuaW1hdGlvbiB3aGVuXG4gICAqICAgaW5zZXJ0aW5nYW5kIHJlbW92aW5nIG5vZGVzIGZyb20gdGhlIERPTS4gVGhlIGBhbmltYXRlZGAgcHJvcGVydHkgb25seSAqYWxsb3dzKiBhbmltYXRpb24gYnV0IHRoZSBlbGVtZW50IG11c3RcbiAgICogICBoYXZlIHRoZSBgYW5pbWF0ZWAgYXR0cmlidXRlIHRvIHVzZSBhbmltYXRpb24uIEEgYmluZGluZyB3aWxsIGhhdmUgdGhlIGBhbmltYXRlYCBwcm9wZXJ0eSBzZXQgdG8gdHJ1ZSB3aGVuIGl0IGlzXG4gICAqICAgdG8gYmUgYW5pbWF0ZWQuIEJpbmRlcnMgc2hvdWxkIGhhdmUgZmFzdCBwYXRocyBmb3Igd2hlbiBhbmltYXRpb24gaXMgbm90IHVzZWQgcmF0aGVyIHRoYW4gYXNzdW1pbmcgYW5pbWF0aW9uIHdpbGxcbiAgICogICBiZSB1c2VkLlxuICAgKlxuICAgKiBCaW5kZXJzXG4gICAqXG4gICAqIEEgYmluZGVyIGNhbiBoYXZlIDUgbWV0aG9kcyB3aGljaCB3aWxsIGJlIGNhbGxlZCBhdCB2YXJpb3VzIHBvaW50cyBpbiBhIGJpbmRpbmcncyBsaWZlY3ljbGUuIE1hbnkgYmluZGVycyB3aWxsXG4gICAqIG9ubHkgdXNlIHRoZSBgdXBkYXRlZCh2YWx1ZSlgIG1ldGhvZCwgc28gY2FsbGluZyByZWdpc3RlciB3aXRoIGEgZnVuY3Rpb24gaW5zdGVhZCBvZiBhbiBvYmplY3QgYXMgaXRzIHRoaXJkXG4gICAqIHBhcmFtZXRlciBpcyBhIHNob3J0Y3V0IHRvIGNyZWF0aW5nIGEgYmluZGVyIHdpdGgganVzdCBhbiBgdXBkYXRlYCBtZXRob2QuXG4gICAqXG4gICAqIExpc3RlZCBpbiBvcmRlciBvZiB3aGVuIHRoZXkgb2NjdXIgaW4gYSBiaW5kaW5nJ3MgbGlmZWN5Y2xlOlxuICAgKlxuICAgKiAgICogYGNvbXBpbGVkKG9wdGlvbnMpYCBpcyBjYWxsZWQgd2hlbiBmaXJzdCBjcmVhdGluZyBhIGJpbmRpbmcgZHVyaW5nIHRoZSB0ZW1wbGF0ZSBjb21waWxhdGlvbiBwcm9jZXNzIGFuZCByZWNlaXZlc1xuICAgKiB0aGUgYG9wdGlvbnNgIG9iamVjdCB0aGF0IHdpbGwgYmUgcGFzc2VkIGludG8gYG5ldyBCaW5kaW5nKG9wdGlvbnMpYC4gVGhpcyBjYW4gYmUgdXNlZCBmb3IgY3JlYXRpbmcgdGVtcGxhdGVzLFxuICAgKiBtb2RpZnlpbmcgdGhlIERPTSAob25seSBzdWJzZXF1ZW50IERPTSB0aGF0IGhhc24ndCBhbHJlYWR5IGJlZW4gcHJvY2Vzc2VkKSBhbmQgb3RoZXIgdGhpbmdzIHRoYXQgc2hvdWxkIGJlXG4gICAqIGFwcGxpZWQgYXQgY29tcGlsZSB0aW1lIGFuZCBub3QgZHVwbGljYXRlZCBmb3IgZWFjaCB2aWV3IGNyZWF0ZWQuXG4gICAqXG4gICAqICAgKiBgY3JlYXRlZCgpYCBpcyBjYWxsZWQgb24gdGhlIGJpbmRpbmcgd2hlbiBhIG5ldyB2aWV3IGlzIGNyZWF0ZWQuIFRoaXMgY2FuIGJlIHVzZWQgdG8gYWRkIGV2ZW50IGxpc3RlbmVycyBvbiB0aGVcbiAgICogZWxlbWVudCBvciBkbyBvdGhlciB0aGluZ3MgdGhhdCB3aWxsIHBlcnNpc3RlIHdpdGggdGhlIHZpZXcgdGhyb3VnaCBpdHMgbWFueSB1c2VzLiBWaWV3cyBtYXkgZ2V0IHJldXNlZCBzbyBkb24ndFxuICAgKiBkbyBhbnl0aGluZyBoZXJlIHRvIHRpZSBpdCB0byBhIGdpdmVuIGNvbnRleHQuXG4gICAqXG4gICAqICAgKiBgYXR0YWNoZWQoKWAgaXMgY2FsbGVkIG9uIHRoZSBiaW5kaW5nIHdoZW4gdGhlIHZpZXcgaXMgYm91bmQgdG8gYSBnaXZlbiBjb250ZXh0IGFuZCBpbnNlcnRlZCBpbnRvIHRoZSBET00uIFRoaXNcbiAgICogY2FuIGJlIHVzZWQgdG8gaGFuZGxlIGNvbnRleHQtc3BlY2lmaWMgYWN0aW9ucywgYWRkIGxpc3RlbmVycyB0byB0aGUgd2luZG93IG9yIGRvY3VtZW50ICh0byBiZSByZW1vdmVkIGluXG4gICAqIGBkZXRhY2hlZGAhKSwgZXRjLlxuICAgKlxuICAgKiAgICogYHVwZGF0ZWQodmFsdWUsIG9sZFZhbHVlLCBjaGFuZ2VSZWNvcmRzKWAgaXMgY2FsbGVkIG9uIHRoZSBiaW5kaW5nIHdoZW5ldmVyIHRoZSB2YWx1ZSBvZiB0aGUgZXhwcmVzc2lvbiB3aXRoaW5cbiAgICogdGhlIGF0dHJpYnV0ZSBjaGFuZ2VzLiBGb3IgZXhhbXBsZSwgYGJpbmQtdGV4dD1cInt7dXNlcm5hbWV9fVwiYCB3aWxsIHRyaWdnZXIgYHVwZGF0ZWRgIHdpdGggdGhlIHZhbHVlIG9mIHVzZXJuYW1lXG4gICAqIHdoZW5ldmVyIGl0IGNoYW5nZXMgb24gdGhlIGdpdmVuIGNvbnRleHQuIFdoZW4gdGhlIHZpZXcgaXMgcmVtb3ZlZCBgdXBkYXRlZGAgd2lsbCBiZSB0cmlnZ2VyZWQgd2l0aCBhIHZhbHVlIG9mXG4gICAqIGB1bmRlZmluZWRgIGlmIHRoZSB2YWx1ZSB3YXMgbm90IGFscmVhZHkgYHVuZGVmaW5lZGAsIGdpdmluZyBhIGNoYW5jZSB0byBcInJlc2V0XCIgdG8gYW4gZW1wdHkgc3RhdGUuXG4gICAqXG4gICAqICAgKiBgZGV0YWNoZWQoKWAgaXMgY2FsbGVkIG9uIHRoZSBiaW5kaW5nIHdoZW4gdGhlIHZpZXcgaXMgdW5ib3VuZCB0byBhIGdpdmVuIGNvbnRleHQgYW5kIHJlbW92ZWQgZnJvbSB0aGUgRE9NLiBUaGlzXG4gICAqIGNhbiBiZSB1c2VkIHRvIGNsZWFuIHVwIGFueXRoaW5nIGRvbmUgaW4gYGF0dGFjaGVkKClgIG9yIGluIGB1cGRhdGVkKClgIGJlZm9yZSBiZWluZyByZW1vdmVkLlxuICAgKlxuICAgKiBFbGVtZW50IGFuZCBhdHRyaWJ1dGUgYmluZGVycyB3aWxsIGFwcGx5IHdoZW5ldmVyIHRoZSB0YWcgbmFtZSBvciBhdHRyaWJ1dGUgbmFtZSBpcyBtYXRjaGVkLiBJbiB0aGUgY2FzZSBvZlxuICAgKiBhdHRyaWJ1dGUgYmluZGVycyBpZiB5b3Ugb25seSB3YW50IGl0IHRvIG1hdGNoIHdoZW4gZXhwcmVzc2lvbnMgYXJlIHVzZWQgd2l0aGluIHRoZSBhdHRyaWJ1dGUsIGFkZCBgb25seVdoZW5Cb3VuZGBcbiAgICogdG8gdGhlIGRlZmluaXRpb24uIE90aGVyd2lzZSB0aGUgYmluZGVyIHdpbGwgbWF0Y2ggYW5kIHRoZSB2YWx1ZSBvZiB0aGUgZXhwcmVzc2lvbiB3aWxsIHNpbXBseSBiZSBhIHN0cmluZyB0aGF0XG4gICAqIG9ubHkgY2FsbHMgdXBkYXRlZCBvbmNlIHNpbmNlIGl0IHdpbGwgbm90IGNoYW5nZS5cbiAgICpcbiAgICogTm90ZSwgYXR0cmlidXRlcyB3aGljaCBtYXRjaCBhIGJpbmRlciBhcmUgcmVtb3ZlZCBkdXJpbmcgY29tcGlsZS4gVGhleSBhcmUgY29uc2lkZXJlZCB0byBiZSBiaW5kaW5nIGRlZmluaXRpb25zIGFuZFxuICAgKiBub3QgcGFydCBvZiB0aGUgZWxlbWVudC4gQmluZGluZ3MgbWF5IHNldCB0aGUgYXR0cmlidXRlIHdoaWNoIHNlcnZlZCBhcyB0aGVpciBkZWZpbml0aW9uIGlmIGRlc2lyZWQuXG4gICAqXG4gICAqICMjIyBEZWZhdWx0c1xuICAgKlxuICAgKiBUaGVyZSBhcmUgZGVmYXVsdCBiaW5kZXJzIGZvciBhdHRyaWJ1dGUgYW5kIHRleHQgbm9kZXMgd2hpY2ggYXBwbHkgd2hlbiBubyBvdGhlciBiaW5kZXJzIG1hdGNoLiBUaGV5IG9ubHkgYXBwbHkgdG9cbiAgICogYXR0cmlidXRlcyBhbmQgdGV4dCBub2RlcyB3aXRoIGV4cHJlc3Npb25zIGluIHRoZW0gKGUuZy4gYHt7Zm9vfX1gKS4gVGhlIGRlZmF1bHQgaXMgdG8gc2V0IHRoZSBhdHRyaWJ1dGUgb3IgdGV4dFxuICAgKiBub2RlJ3MgdmFsdWUgdG8gdGhlIHJlc3VsdCBvZiB0aGUgZXhwcmVzc2lvbi4gSWYgeW91IHdhbnRlZCB0byBvdmVycmlkZSB0aGlzIGRlZmF1bHQgeW91IG1heSByZWdpc3RlciBhIGJpbmRlciB3aXRoXG4gICAqIHRoZSBuYW1lIGBcIl9fZGVmYXVsdF9fXCJgLlxuICAgKlxuICAgKiAqKkV4YW1wbGU6KiogVGhpcyBiaW5kaW5nIGhhbmRsZXIgYWRkcyBwaXJhdGVpemVkIHRleHQgdG8gYW4gZWxlbWVudC5cbiAgICogYGBgamF2YXNjcmlwdFxuICAgKiByZWdpc3RyeS5yZWdpc3RlckF0dHJpYnV0ZSgnbXktcGlyYXRlJywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICogICBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgKiAgICAgdmFsdWUgPSAnJztcbiAgICogICB9IGVsc2Uge1xuICAgKiAgICAgdmFsdWUgPSB2YWx1ZVxuICAgKiAgICAgICAucmVwbGFjZSgvXFxCaW5nXFxiL2csIFwiaW4nXCIpXG4gICAqICAgICAgIC5yZXBsYWNlKC9cXGJ0b1xcYi9nLCBcInQnXCIpXG4gICAqICAgICAgIC5yZXBsYWNlKC9cXGJ5b3VcXGIvLCAneWUnKVxuICAgKiAgICAgICArICcgQXJycnIhJztcbiAgICogICB9XG4gICAqICAgdGhpcy5lbGVtZW50LnRleHRDb250ZW50ID0gdmFsdWU7XG4gICAqIH0pO1xuICAgKiBgYGBcbiAgICpcbiAgICogYGBgaHRtbFxuICAgKiA8cCBteS1waXJhdGU9XCJ7e3Bvc3QuYm9keX19XCI+VGhpcyB0ZXh0IHdpbGwgYmUgcmVwbGFjZWQuPC9wPlxuICAgKiBgYGBcbiAgICovXG4gIHJlZ2lzdGVyRWxlbWVudDogZnVuY3Rpb24obmFtZSwgZGVmaW5pdGlvbikge1xuICAgIHJldHVybiB0aGlzLnJlZ2lzdGVyQmluZGVyKCdlbGVtZW50JywgbmFtZSwgZGVmaW5pdGlvbik7XG4gIH0sXG4gIHJlZ2lzdGVyQXR0cmlidXRlOiBmdW5jdGlvbihuYW1lLCBkZWZpbml0aW9uKSB7XG4gICAgcmV0dXJuIHRoaXMucmVnaXN0ZXJCaW5kZXIoJ2F0dHJpYnV0ZScsIG5hbWUsIGRlZmluaXRpb24pO1xuICB9LFxuICByZWdpc3RlclRleHQ6IGZ1bmN0aW9uKG5hbWUsIGRlZmluaXRpb24pIHtcbiAgICByZXR1cm4gdGhpcy5yZWdpc3RlckJpbmRlcigndGV4dCcsIG5hbWUsIGRlZmluaXRpb24pO1xuICB9LFxuICByZWdpc3RlckJpbmRlcjogZnVuY3Rpb24odHlwZSwgbmFtZSwgZGVmaW5pdGlvbikge1xuICAgIGlmICghZGVmaW5pdGlvbikgdGhyb3cgbmV3IFR5cGVFcnJvcignTXVzdCBwcm92aWRlIGEgZGVmaW5pdGlvbiB3aGVuIHJlZ2lzdGVyaW5nIGEgYmluZGVyJyk7XG4gICAgdmFyIGJpbmRlcnMgPSB0aGlzLmJpbmRlcnNbdHlwZV07XG4gICAgdmFyIHN1cGVyQ2xhc3MgPSBkZWZpbml0aW9uLmFuaW1hdGVkID8gQW5pbWF0ZWRCaW5kaW5nIDogQmluZGluZztcblxuICAgIGlmICghYmluZGVycykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYHR5cGVgIG11c3QgYmUgb25lIG9mICcgKyBPYmplY3Qua2V5cyh0aGlzLmJpbmRlcnMpLmpvaW4oJywgJykpO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgZGVmaW5pdGlvbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgaWYgKGRlZmluaXRpb24ucHJvdG90eXBlIGluc3RhbmNlb2YgQmluZGluZykge1xuICAgICAgICBzdXBlckNsYXNzID0gZGVmaW5pdGlvbjtcbiAgICAgICAgZGVmaW5pdGlvbiA9IHt9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVmaW5pdGlvbiA9IHsgdXBkYXRlZDogZGVmaW5pdGlvbiB9O1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChuYW1lID09PSAnX19kZWZhdWx0X18nICYmICFkZWZpbml0aW9uLmhhc093blByb3BlcnR5KCdwcmlvcml0eScpKSB7XG4gICAgICBkZWZpbml0aW9uLnByaW9yaXR5ID0gLTEwMDtcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgYSBzdWJjbGFzcyBvZiBCaW5kaW5nIChvciBhbm90aGVyIGJpbmRlcikgd2l0aCB0aGUgZGVmaW5pdGlvblxuICAgIGZ1bmN0aW9uIEJpbmRlcigpIHtcbiAgICAgIHN1cGVyQ2xhc3MuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgZGVmaW5pdGlvbi5vYnNlcnZhdGlvbnMgPSB0aGlzLm9ic2VydmF0aW9ucztcbiAgICBzdXBlckNsYXNzLmV4dGVuZChCaW5kZXIsIGRlZmluaXRpb24pO1xuXG4gICAgdmFyIGV4cHI7XG4gICAgaWYgKG5hbWUgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgIGV4cHIgPSBuYW1lO1xuICAgIH0gZWxzZSBpZiAoaGFzV2lsZGNhcmRFeHByLnRlc3QobmFtZSkpIHtcbiAgICAgIGV4cHIgPSBuZXcgUmVnRXhwKCdeJyArIGVzY2FwZVJlZ0V4cChuYW1lKS5yZXBsYWNlKGVzY2FwZWRXaWxkY2FyZEV4cHIsICckMSguKiknKSArICckJyk7XG4gICAgfVxuXG4gICAgaWYgKGV4cHIpIHtcbiAgICAgIEJpbmRlci5leHByID0gZXhwcjtcbiAgICAgIGJpbmRlcnMuX3dpbGRjYXJkcy5wdXNoKEJpbmRlcik7XG4gICAgICBiaW5kZXJzLl93aWxkY2FyZHMuc29ydCh0aGlzLmJpbmRpbmdTb3J0KTtcbiAgICB9XG5cbiAgICBCaW5kZXIubmFtZSA9ICcnICsgbmFtZTtcbiAgICBiaW5kZXJzW25hbWVdID0gQmluZGVyO1xuICAgIHJldHVybiBCaW5kZXI7XG4gIH0sXG5cblxuICAvKipcbiAgICogUmVtb3ZlcyBhIGJpbmRlciB0aGF0IHdhcyBhZGRlZCB3aXRoIGByZWdpc3RlcigpYC4gSWYgYW4gUmVnRXhwIHdhcyB1c2VkIGluIHJlZ2lzdGVyIGZvciB0aGUgbmFtZSBpdCBtdXN0IGJlIHVzZWRcbiAgICogdG8gdW5yZWdpc3RlciwgYnV0IGl0IGRvZXMgbm90IG5lZWQgdG8gYmUgdGhlIHNhbWUgaW5zdGFuY2UuXG4gICAqL1xuICB1bnJlZ2lzdGVyRWxlbWVudDogZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLnVucmVnaXN0ZXJCaW5kZXIoJ2VsZW1lbnQnLCBuYW1lKTtcbiAgfSxcbiAgdW5yZWdpc3RlckF0dHJpYnV0ZTogZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLnVucmVnaXN0ZXJCaW5kZXIoJ2F0dHJpYnV0ZScsIG5hbWUpO1xuICB9LFxuICB1bnJlZ2lzdGVyVGV4dDogZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLnVucmVnaXN0ZXJCaW5kZXIoJ3RleHQnLCBuYW1lKTtcbiAgfSxcbiAgdW5yZWdpc3RlckJpbmRlcjogZnVuY3Rpb24odHlwZSwgbmFtZSkge1xuICAgIHZhciBiaW5kZXIgPSB0aGlzLmdldEJpbmRlcih0eXBlLCBuYW1lKSwgYmluZGVycyA9IHRoaXMuYmluZGVyc1t0eXBlXTtcbiAgICBpZiAoIWJpbmRlcikgcmV0dXJuO1xuICAgIGlmIChiaW5kZXIuZXhwcikge1xuICAgICAgdmFyIGluZGV4ID0gYmluZGVycy5fd2lsZGNhcmRzLmluZGV4T2YoYmluZGVyKTtcbiAgICAgIGlmIChpbmRleCA+PSAwKSBiaW5kZXJzLl93aWxkY2FyZHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9XG4gICAgZGVsZXRlIGJpbmRlcnNbbmFtZV07XG4gICAgcmV0dXJuIGJpbmRlcjtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgYmluZGVyIHRoYXQgd2FzIGFkZGVkIHdpdGggYHJlZ2lzdGVyKClgIGJ5IHR5cGUgYW5kIG5hbWUuXG4gICAqL1xuICBnZXRFbGVtZW50QmluZGVyOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QmluZGVyKCdlbGVtZW50JywgbmFtZSk7XG4gIH0sXG4gIGdldEF0dHJpYnV0ZUJpbmRlcjogZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLmdldEJpbmRlcignYXR0cmlidXRlJywgbmFtZSk7XG4gIH0sXG4gIGdldFRleHRCaW5kZXI6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRCaW5kZXIoJ3RleHQnLCBuYW1lKTtcbiAgfSxcbiAgZ2V0QmluZGVyOiBmdW5jdGlvbih0eXBlLCBuYW1lKSB7XG4gICAgdmFyIGJpbmRlcnMgPSB0aGlzLmJpbmRlcnNbdHlwZV07XG5cbiAgICBpZiAoIWJpbmRlcnMpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2B0eXBlYCBtdXN0IGJlIG9uZSBvZiAnICsgT2JqZWN0LmtleXModGhpcy5iaW5kZXJzKS5qb2luKCcsICcpKTtcbiAgICB9XG5cbiAgICBpZiAobmFtZSAmJiBiaW5kZXJzLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICByZXR1cm4gYmluZGVyc1tuYW1lXTtcbiAgICB9XG4gIH0sXG5cblxuICAvKipcbiAgICogRmluZCBhIG1hdGNoaW5nIGJpbmRlciBmb3IgdGhlIGdpdmVuIHR5cGUuIEVsZW1lbnRzIHNob3VsZCBvbmx5IHByb3ZpZGUgbmFtZS4gQXR0cmlidXRlcyBzaG91bGQgcHJvdmlkZSB0aGUgbmFtZVxuICAgKiBhbmQgdmFsdWUgKHZhbHVlIHNvIHRoZSBkZWZhdWx0IGNhbiBiZSByZXR1cm5lZCBpZiBhbiBleHByZXNzaW9uIGV4aXN0cyBpbiB0aGUgdmFsdWUpLiBUZXh0IG5vZGVzIHNob3VsZCBvbmx5XG4gICAqIHByb3ZpZGUgdGhlIHZhbHVlIChpbiBwbGFjZSBvZiB0aGUgbmFtZSkgYW5kIHdpbGwgcmV0dXJuIHRoZSBkZWZhdWx0IGlmIG5vIGJpbmRlcnMgbWF0Y2guXG4gICAqL1xuICBmaW5kQmluZGVyOiBmdW5jdGlvbih0eXBlLCBuYW1lLCB2YWx1ZSkge1xuICAgIGlmICh0eXBlID09PSAndGV4dCcgJiYgdmFsdWUgPT0gbnVsbCkge1xuICAgICAgdmFsdWUgPSBuYW1lO1xuICAgICAgbmFtZSA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBpZiAobmFtZSA9PT0gdGhpcy5hbmltYXRlQXR0cmlidXRlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGJpbmRlciA9IHRoaXMuZ2V0QmluZGVyKHR5cGUsIG5hbWUpLCBiaW5kZXJzID0gdGhpcy5iaW5kZXJzW3R5cGVdO1xuXG4gICAgaWYgKCFiaW5kZXIpIHtcbiAgICAgIHZhciB0b01hdGNoID0gKHR5cGUgPT09ICd0ZXh0JykgPyB2YWx1ZSA6IG5hbWU7XG4gICAgICBiaW5kZXJzLl93aWxkY2FyZHMuc29tZShmdW5jdGlvbih3aWxkY2FyZEJpbmRlcikge1xuICAgICAgICBpZiAodG9NYXRjaC5tYXRjaCh3aWxkY2FyZEJpbmRlci5leHByKSkge1xuICAgICAgICAgIGJpbmRlciA9IHdpbGRjYXJkQmluZGVyO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBkb24ndCB1c2UgZS5nLiB0aGUgYHZhbHVlYCBiaW5kZXIgaWYgdGhlcmUgaXMgbm8gZXhwcmVzc2lvbiBpbiB0aGUgYXR0cmlidXRlIHZhbHVlIChlLmcuIGB2YWx1ZT1cInNvbWUgdGV4dFwiYClcbiAgICBpZiAoYmluZGVyICYmXG4gICAgICAgIHR5cGUgPT09ICdhdHRyaWJ1dGUnICYmXG4gICAgICAgIGJpbmRlci5wcm90b3R5cGUub25seVdoZW5Cb3VuZCAmJlxuICAgICAgICAhdGhpcy5iaW5kZXJzW3R5cGVdLl9kZWxpbWl0ZXJzT25seUluRGVmYXVsdCAmJlxuICAgICAgICAhdGhpcy5pc0JvdW5kKHR5cGUsIHZhbHVlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFRlc3QgaWYgdGhlIGF0dHJpYnV0ZSB2YWx1ZSBpcyBib3VuZCAoZS5nLiBgaHJlZj1cIi9wb3N0cy97eyBwb3N0LmlkIH19XCJgKVxuICAgIGlmICghYmluZGVyICYmIHZhbHVlICYmICh0eXBlID09PSAndGV4dCcgfHwgdGhpcy5pc0JvdW5kKHR5cGUsIHZhbHVlKSkpIHtcbiAgICAgIGJpbmRlciA9IHRoaXMuZ2V0QmluZGVyKHR5cGUsICdfX2RlZmF1bHRfXycpO1xuICAgIH1cblxuICAgIHJldHVybiBiaW5kZXI7XG4gIH0sXG5cblxuICAvKipcbiAgICogQSBGb3JtYXR0ZXIgaXMgc3RvcmVkIHRvIHByb2Nlc3MgdGhlIHZhbHVlIG9mIGFuIGV4cHJlc3Npb24uIFRoaXMgYWx0ZXJzIHRoZSB2YWx1ZSBvZiB3aGF0IGNvbWVzIGluIHdpdGggYSBmdW5jdGlvblxuICAgKiB0aGF0IHJldHVybnMgYSBuZXcgdmFsdWUuIEZvcm1hdHRlcnMgYXJlIGFkZGVkIGJ5IHVzaW5nIGEgc2luZ2xlIHBpcGUgY2hhcmFjdGVyIChgfGApIGZvbGxvd2VkIGJ5IHRoZSBuYW1lIG9mIHRoZVxuICAgKiBmb3JtYXR0ZXIuIE11bHRpcGxlIGZvcm1hdHRlcnMgY2FuIGJlIHVzZWQgYnkgY2hhaW5pbmcgcGlwZXMgd2l0aCBmb3JtYXR0ZXIgbmFtZXMuIEZvcm1hdHRlcnMgbWF5IGFsc28gaGF2ZVxuICAgKiBhcmd1bWVudHMgcGFzc2VkIHRvIHRoZW0gYnkgdXNpbmcgdGhlIGNvbG9uIHRvIHNlcGFyYXRlIGFyZ3VtZW50cyBmcm9tIHRoZSBmb3JtYXR0ZXIgbmFtZS4gVGhlIHNpZ25hdHVyZSBvZiBhXG4gICAqIGZvcm1hdHRlciBzaG91bGQgYmUgYGZ1bmN0aW9uKHZhbHVlLCBhcmdzLi4uKWAgd2hlcmUgYXJncyBhcmUgZXh0cmEgcGFyYW1ldGVycyBwYXNzZWQgaW50byB0aGUgZm9ybWF0dGVyIGFmdGVyXG4gICAqIGNvbG9ucy5cbiAgICpcbiAgICogKkV4YW1wbGU6KlxuICAgKiBgYGBqc1xuICAgKiByZWdpc3RyeS5yZWdpc3RlckZvcm1hdHRlcigndXBwZXJjYXNlJywgZnVuY3Rpb24odmFsdWUpIHtcbiAgICogICBpZiAodHlwZW9mIHZhbHVlICE9ICdzdHJpbmcnKSByZXR1cm4gJydcbiAgICogICByZXR1cm4gdmFsdWUudG9VcHBlcmNhc2UoKVxuICAgKiB9KVxuICAgKlxuICAgKiByZWdpc3RyeS5yZWdpc3RlckZvcm1hdHRlcigncmVwbGFjZScsIGZ1bmN0aW9uKHZhbHVlLCByZXBsYWNlLCB3aXRoKSB7XG4gICAqICAgaWYgKHR5cGVvZiB2YWx1ZSAhPSAnc3RyaW5nJykgcmV0dXJuICcnXG4gICAqICAgcmV0dXJuIHZhbHVlLnJlcGxhY2UocmVwbGFjZSwgd2l0aClcbiAgICogfSlcbiAgICogYGBgaHRtbFxuICAgKiA8aDEgYmluZC10ZXh0PVwidGl0bGUgfCB1cHBlcmNhc2UgfCByZXBsYWNlOidMRVRURVInOidOVU1CRVInXCI+PC9oMT5cbiAgICogYGBgXG4gICAqICpSZXN1bHQ6KlxuICAgKiBgYGBodG1sXG4gICAqIDxoMT5HRVRUSU5HIFRPIEtOT1cgQUxMIEFCT1VUIFRIRSBOVU1CRVIgQTwvaDE+XG4gICAqIGBgYFxuICAgKiBUT0RPOiBvbGQgZG9jcywgcmV3cml0ZSwgdGhlcmUgaXMgYW4gZXh0cmEgYXJndW1lbnQgbmFtZWQgYHNldHRlcmAgd2hpY2ggd2lsbCBiZSB0cnVlIHdoZW4gdGhlIGV4cHJlc3Npb24gaXMgYmVpbmcgXCJzZXRcIiBpbnN0ZWFkIG9mIFwiZ2V0XCJcbiAgICogQSBgdmFsdWVGb3JtYXR0ZXJgIGlzIGxpa2UgYSBmb3JtYXR0ZXIgYnV0IHVzZWQgc3BlY2lmaWNhbGx5IHdpdGggdGhlIGB2YWx1ZWAgYmluZGluZyBzaW5jZSBpdCBpcyBhIHR3by13YXkgYmluZGluZy4gV2hlblxuICAgKiB0aGUgdmFsdWUgb2YgdGhlIGVsZW1lbnQgaXMgY2hhbmdlZCBhIGB2YWx1ZUZvcm1hdHRlcmAgY2FuIGFkanVzdCB0aGUgdmFsdWUgZnJvbSBhIHN0cmluZyB0byB0aGUgY29ycmVjdCB2YWx1ZSB0eXBlIGZvclxuICAgKiB0aGUgY29udHJvbGxlciBleHByZXNzaW9uLiBUaGUgc2lnbmF0dXJlIGZvciBhIGB2YWx1ZUZvcm1hdHRlcmAgaW5jbHVkZXMgdGhlIGN1cnJlbnQgdmFsdWUgb2YgdGhlIGV4cHJlc3Npb25cbiAgICogYmVmb3JlIHRoZSBvcHRpb25hbCBhcmd1bWVudHMgKGlmIGFueSkuIFRoaXMgYWxsb3dzIGRhdGVzIHRvIGJlIGFkanVzdGVkIGFuZCBwb3NzaWJsZXkgb3RoZXIgdXNlcy5cbiAgICpcbiAgICogKkV4YW1wbGU6KlxuICAgKiBgYGBqc1xuICAgKiByZWdpc3RyeS5yZWdpc3RlckZvcm1hdHRlcignbnVtZXJpYycsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAqICAgLy8gdmFsdWUgY29taW5nIGZyb20gdGhlIGNvbnRyb2xsZXIgZXhwcmVzc2lvbiwgdG8gYmUgc2V0IG9uIHRoZSBlbGVtZW50XG4gICAqICAgaWYgKHZhbHVlID09IG51bGwgfHwgaXNOYU4odmFsdWUpKSByZXR1cm4gJydcbiAgICogICByZXR1cm4gdmFsdWVcbiAgICogfSlcbiAgICpcbiAgICogcmVnaXN0cnkucmVnaXN0ZXJGb3JtYXR0ZXIoJ2RhdGUtaG91cicsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAqICAgLy8gdmFsdWUgY29taW5nIGZyb20gdGhlIGNvbnRyb2xsZXIgZXhwcmVzc2lvbiwgdG8gYmUgc2V0IG9uIHRoZSBlbGVtZW50XG4gICAqICAgaWYgKCAhKGN1cnJlbnRWYWx1ZSBpbnN0YW5jZW9mIERhdGUpICkgcmV0dXJuICcnXG4gICAqICAgdmFyIGhvdXJzID0gdmFsdWUuZ2V0SG91cnMoKVxuICAgKiAgIGlmIChob3VycyA+PSAxMikgaG91cnMgLT0gMTJcbiAgICogICBpZiAoaG91cnMgPT0gMCkgaG91cnMgPSAxMlxuICAgKiAgIHJldHVybiBob3Vyc1xuICAgKiB9KVxuICAgKiBgYGBodG1sXG4gICAqIDxsYWJlbD5OdW1iZXIgQXR0ZW5kaW5nOjwvbGFiZWw+XG4gICAqIDxpbnB1dCBzaXplPVwiNFwiIGJpbmQtdmFsdWU9XCJldmVudC5hdHRlbmRlZUNvdW50IHwgbnVtZXJpY1wiPlxuICAgKiA8bGFiZWw+VGltZTo8L2xhYmVsPlxuICAgKiA8aW5wdXQgc2l6ZT1cIjJcIiBiaW5kLXZhbHVlPVwiZXZlbnQuZGF0ZSB8IGRhdGUtaG91clwiPiA6XG4gICAqIDxpbnB1dCBzaXplPVwiMlwiIGJpbmQtdmFsdWU9XCJldmVudC5kYXRlIHwgZGF0ZS1taW51dGVcIj5cbiAgICogPHNlbGVjdCBiaW5kLXZhbHVlPVwiZXZlbnQuZGF0ZSB8IGRhdGUtYW1wbVwiPlxuICAgKiAgIDxvcHRpb24+QU08L29wdGlvbj5cbiAgICogICA8b3B0aW9uPlBNPC9vcHRpb24+XG4gICAqIDwvc2VsZWN0PlxuICAgKiBgYGBcbiAgICovXG4gIHJlZ2lzdGVyRm9ybWF0dGVyOiBmdW5jdGlvbiAobmFtZSwgZm9ybWF0dGVyKSB7XG4gICAgdGhpcy5mb3JtYXR0ZXJzW25hbWVdID0gZm9ybWF0dGVyO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIFVucmVnaXN0ZXJzIGEgZm9ybWF0dGVyLlxuICAgKi9cbiAgdW5yZWdpc3RlckZvcm1hdHRlcjogZnVuY3Rpb24gKG5hbWUpIHtcbiAgICBkZWxldGUgdGhpcy5mb3JtYXR0ZXJzW25hbWVdO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIEdldHMgYSByZWdpc3RlcmVkIGZvcm1hdHRlci5cbiAgICovXG4gIGdldEZvcm1hdHRlcjogZnVuY3Rpb24gKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5mb3JtYXR0ZXJzW25hbWVdO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIEFuIEFuaW1hdGlvbiBpcyBzdG9yZWQgdG8gaGFuZGxlIGFuaW1hdGlvbnMuIEEgcmVnaXN0ZXJlZCBhbmltYXRpb24gaXMgYW4gb2JqZWN0IChvciBjbGFzcyB3aGljaCBpbnN0YW50aWF0ZXMgaW50b1xuICAgKiBhbiBvYmplY3QpIHdpdGggdGhlIG1ldGhvZHM6XG4gICAqICAgKiBgd2lsbEFuaW1hdGVJbihlbGVtZW50KWBcbiAgICogICAqIGBhbmltYXRlSW4oZWxlbWVudCwgY2FsbGJhY2spYFxuICAgKiAgICogYGRpZEFuaW1hdGVJbihlbGVtZW50KWBcbiAgICogICAqIGB3aWxsQW5pbWF0ZU91dChlbGVtZW50KWBcbiAgICogICAqIGBhbmltYXRlT3V0KGVsZW1lbnQsIGNhbGxiYWNrKWBcbiAgICogICAqIGBkaWRBbmltYXRlT3V0KGVsZW1lbnQpYFxuICAgKlxuICAgKiBBbmltYXRpb24gaXMgaW5jbHVkZWQgd2l0aCBiaW5kZXJzIHdoaWNoIGFyZSByZWdpc3RlcmVkIHdpdGggdGhlIGBhbmltYXRlZGAgcHJvcGVydHkgc2V0IHRvIGB0cnVlYCAoc3VjaCBhcyBgaWZgXG4gICAqIGFuZCBgcmVwZWF0YCkuIEFuaW1hdGlvbnMgYWxsb3cgZWxlbWVudHMgdG8gZmFkZSBpbiwgZmFkZSBvdXQsIHNsaWRlIGRvd24sIGNvbGxhcHNlLCBtb3ZlIGZyb20gb25lIGxvY2F0aW9uIGluIGFcbiAgICogbGlzdCB0byBhbm90aGVyLCBhbmQgbW9yZS5cbiAgICpcbiAgICogVG8gdXNlIGFuaW1hdGlvbiBhZGQgYW4gYXR0cmlidXRlIG5hbWVkIGBhbmltYXRlYCBvbnRvIGFuIGVsZW1lbnQgd2l0aCBhIHN1cHBvcnRlZCBiaW5kZXIuXG4gICAqXG4gICAqICMjIyBDU1MgQW5pbWF0aW9uc1xuICAgKlxuICAgKiBJZiB0aGUgYGFuaW1hdGVgIGF0dHJpYnV0ZSBkb2VzIG5vdCBoYXZlIGEgdmFsdWUgb3IgdGhlIHZhbHVlIGlzIGEgY2xhc3MgbmFtZSAoZS5nLiBgYW5pbWF0ZT1cIi5teS1mYWRlXCJgKSB0aGVuXG4gICAqIGZyYWdtZW50cyB3aWxsIHVzZSBhIENTUyB0cmFuc2l0aW9uL2FuaW1hdGlvbi4gQ2xhc3NlcyB3aWxsIGJlIGFkZGVkIGFuZCByZW1vdmVkIHRvIHRyaWdnZXIgdGhlIGFuaW1hdGlvbi5cbiAgICpcbiAgICogICAqIGAud2lsbC1hbmltYXRlLWluYCBpcyBhZGRlZCByaWdodCBhZnRlciBhbiBlbGVtZW50IGlzIGluc2VydGVkIGludG8gdGhlIERPTS4gVGhpcyBjYW4gYmUgdXNlZCB0byBzZXQgdGhlXG4gICAqICAgICBvcGFjaXR5IHRvIGAwLjBgIGZvciBleGFtcGxlLiBJdCBpcyB0aGVuIHJlbW92ZWQgb24gdGhlIG5leHQgYW5pbWF0aW9uIGZyYW1lLlxuICAgKiAgICogYC5hbmltYXRlLWluYCBpcyB3aGVuIGAud2lsbC1hbmltYXRlLWluYCBpcyByZW1vdmVkLiBJdCBjYW4gYmUgdXNlZCB0byBzZXQgb3BhY2l0eSB0byBgMS4wYCBmb3IgZXhhbXBsZS4gVGhlXG4gICAqICAgICBgYW5pbWF0aW9uYCBzdHlsZSBjYW4gYmUgc2V0IG9uIHRoaXMgY2xhc3MgaWYgdXNpbmcgaXQuIFRoZSBgdHJhbnNpdGlvbmAgc3R5bGUgY2FuIGJlIHNldCBoZXJlLiBOb3RlIHRoYXRcbiAgICogICAgIGFsdGhvdWdoIHRoZSBgYW5pbWF0ZWAgYXR0cmlidXRlIGlzIHBsYWNlZCBvbiBhbiBlbGVtZW50IHdpdGggdGhlIGByZXBlYXRgIGJpbmRlciwgdGhlc2UgY2xhc3NlcyBhcmUgYWRkZWQgdG9cbiAgICogICAgIGl0cyBjaGlsZHJlbiBhcyB0aGV5IGdldCBhZGRlZCBhbmQgcmVtb3ZlZC5cbiAgICogICAqIGAud2lsbC1hbmltYXRlLW91dGAgaXMgYWRkZWQgYmVmb3JlIGFuIGVsZW1lbnQgaXMgcmVtb3ZlZCBmcm9tIHRoZSBET00uIFRoaXMgY2FuIGJlIHVzZWQgdG8gc2V0IHRoZSBvcGFjaXR5IHRvXG4gICAqICAgICBgMWAgZm9yIGV4YW1wbGUuIEl0IGlzIHRoZW4gcmVtb3ZlZCBvbiB0aGUgbmV4dCBhbmltYXRpb24gZnJhbWUuXG4gICAqICAgKiBgLmFuaW1hdGUtb3V0YCBpcyBhZGRlZCB3aGVuIGAud2lsbC1hbmltYXRlLW91dGAgaXMgcmVtb3ZlZC4gSXQgY2FuIGJlIHVzZWQgdG8gc2V0IG9wYWNpdHkgdG8gYDAuMGAgZm9yXG4gICAqICAgICBleGFtcGxlLiBUaGUgYGFuaW1hdGlvbmAgc3R5bGUgY2FuIGJlIHNldCBvbiB0aGlzIGNsYXNzIGlmIHVzaW5nIGl0LiBUaGUgYHRyYW5zaXRpb25gIHN0eWxlIGNhbiBiZSBzZXQgaGVyZSBvclxuICAgKiAgICAgb24gYW5vdGhlciBzZWxlY3RvciB0aGF0IG1hdGNoZXMgdGhlIGVsZW1lbnQuIE5vdGUgdGhhdCBhbHRob3VnaCB0aGUgYGFuaW1hdGVgIGF0dHJpYnV0ZSBpcyBwbGFjZWQgb24gYW5cbiAgICogICAgIGVsZW1lbnQgd2l0aCB0aGUgYHJlcGVhdGAgYmluZGVyLCB0aGVzZSBjbGFzc2VzIGFyZSBhZGRlZCB0byBpdHMgY2hpbGRyZW4gYXMgdGhleSBnZXQgYWRkZWQgYW5kIHJlbW92ZWQuXG4gICAqXG4gICAqIElmIHRoZSBgYW5pbWF0ZWAgYXR0cmlidXRlIGlzIHNldCB0byBhIGNsYXNzIG5hbWUgKGUuZy4gYGFuaW1hdGU9XCIubXktZmFkZVwiYCkgdGhlbiB0aGF0IGNsYXNzIG5hbWUgd2lsbCBiZSBhZGRlZCBhc1xuICAgKiBhIGNsYXNzIHRvIHRoZSBlbGVtZW50IGR1cmluZyBhbmltYXRpb24uIFRoaXMgYWxsb3dzIHlvdSB0byB1c2UgYC5teS1mYWRlLndpbGwtYW5pbWF0ZS1pbmAsIGAubXktZmFkZS5hbmltYXRlLWluYCxcbiAgICogZXRjLiBpbiB5b3VyIHN0eWxlc2hlZXRzIHRvIHVzZSB0aGUgc2FtZSBhbmltYXRpb24gdGhyb3VnaG91dCB5b3VyIGFwcGxpY2F0aW9uLlxuICAgKlxuICAgKiAjIyMgSmF2YVNjcmlwdCBBbmltYXRpb25zXG4gICAqXG4gICAqIElmIHlvdSBuZWVkIGdyZWF0ZXIgY29udHJvbCBvdmVyIHlvdXIgYW5pbWF0aW9ucyBKYXZhU2NyaXB0IG1heSBiZSB1c2VkLiBJdCBpcyByZWNvbW1lbmRlZCB0aGF0IENTUyBzdHlsZXMgc3RpbGwgYmVcbiAgICogdXNlZCBieSBoYXZpbmcgeW91ciBjb2RlIHNldCB0aGVtIG1hbnVhbGx5LiBUaGlzIGFsbG93cyB0aGUgYW5pbWF0aW9uIHRvIHRha2UgYWR2YW50YWdlIG9mIHRoZSBicm93c2VyXG4gICAqIG9wdGltaXphdGlvbnMgc3VjaCBhcyBoYXJkd2FyZSBhY2NlbGVyYXRpb24uIFRoaXMgaXMgbm90IGEgcmVxdWlyZW1lbnQuXG4gICAqXG4gICAqIEluIG9yZGVyIHRvIHVzZSBKYXZhU2NyaXB0IGFuIG9iamVjdCBzaG91bGQgYmUgcGFzc2VkIGludG8gdGhlIGBhbmltYXRpb25gIGF0dHJpYnV0ZSB1c2luZyBhbiBleHByZXNzaW9uLiBUaGlzXG4gICAqIG9iamVjdCBzaG91bGQgaGF2ZSBtZXRob2RzIHRoYXQgYWxsb3cgSmF2YVNjcmlwdCBhbmltYXRpb24gaGFuZGxpbmcuIEZvciBleGFtcGxlLCBpZiB5b3UgYXJlIGJvdW5kIHRvIGEgY29udGV4dFxuICAgKiB3aXRoIGFuIG9iamVjdCBuYW1lZCBgY3VzdG9tRmFkZWAgd2l0aCBhbmltYXRpb24gbWV0aG9kcywgeW91ciBlbGVtZW50IHNob3VsZCBoYXZlIGBhdHRyaWJ1dGU9XCJ7e2N1c3RvbUZhZGV9fVwiYC5cbiAgICogVGhlIGZvbGxvd2luZyBpcyBhIGxpc3Qgb2YgdGhlIG1ldGhvZHMgeW91IG1heSBpbXBsZW1lbnQuXG4gICAqXG4gICAqICAgKiBgd2lsbEFuaW1hdGVJbihlbGVtZW50KWAgd2lsbCBiZSBjYWxsZWQgYWZ0ZXIgYW4gZWxlbWVudCBoYXMgYmVlbiBpbnNlcnRlZCBpbnRvIHRoZSBET00uIFVzZSBpdCB0byBzZXQgaW5pdGlhbFxuICAgKiAgICAgQ1NTIHByb3BlcnRpZXMgYmVmb3JlIGBhbmltYXRlSW5gIGlzIGNhbGxlZCB0byBzZXQgdGhlIGZpbmFsIHByb3BlcnRpZXMuIFRoaXMgbWV0aG9kIGlzIG9wdGlvbmFsLlxuICAgKiAgICogYGFuaW1hdGVJbihlbGVtZW50LCBjYWxsYmFjaylgIHdpbGwgYmUgY2FsbGVkIHNob3J0bHkgYWZ0ZXIgYHdpbGxBbmltYXRlSW5gIGlmIGl0IHdhcyBkZWZpbmVkLiBVc2UgaXQgdG8gc2V0XG4gICAqICAgICBmaW5hbCBDU1MgcHJvcGVydGllcy5cbiAgICogICAqIGBhbmltYXRlT3V0KGVsZW1lbnQsIGRvbmUpYCB3aWxsIGJlIGNhbGxlZCBiZWZvcmUgYW4gZWxlbWVudCBpcyB0byBiZSByZW1vdmVkIGZyb20gdGhlIERPTS4gYGRvbmVgIG11c3QgYmVcbiAgICogICAgIGNhbGxlZCB3aGVuIHRoZSBhbmltYXRpb24gaXMgY29tcGxldGUgaW4gb3JkZXIgZm9yIHRoZSBiaW5kZXIgdG8gZmluaXNoIHJlbW92aW5nIHRoZSBlbGVtZW50LiAqKlJlbWVtYmVyKiogdG9cbiAgICogICAgIGNsZWFuIHVwIGJ5IHJlbW92aW5nIGFueSBzdHlsZXMgdGhhdCB3ZXJlIGFkZGVkIGJlZm9yZSBjYWxsaW5nIGBkb25lKClgIHNvIHRoZSBlbGVtZW50IGNhbiBiZSByZXVzZWQgd2l0aG91dFxuICAgKiAgICAgc2lkZS1lZmZlY3RzLlxuICAgKlxuICAgKiBUaGUgYGVsZW1lbnRgIHBhc3NlZCBpbiB3aWxsIGJlIHBvbHlmaWxsZWQgZm9yIHdpdGggdGhlIGBhbmltYXRlYCBtZXRob2QgdXNpbmdcbiAgICogaHR0cHM6Ly9naXRodWIuY29tL3dlYi1hbmltYXRpb25zL3dlYi1hbmltYXRpb25zLWpzLlxuICAgKlxuICAgKiAjIyMgUmVnaXN0ZXJlZCBBbmltYXRpb25zXG4gICAqXG4gICAqIEFuaW1hdGlvbnMgbWF5IGJlIHJlZ2lzdGVyZWQgYW5kIHVzZWQgdGhyb3VnaG91dCB5b3VyIGFwcGxpY2F0aW9uLiBUbyB1c2UgYSByZWdpc3RlcmVkIGFuaW1hdGlvbiB1c2UgaXRzIG5hbWUgaW5cbiAgICogdGhlIGBhbmltYXRlYCBhdHRyaWJ1dGUgKGUuZy4gYGFuaW1hdGU9XCJmYWRlXCJgKS4gTm90ZSB0aGUgb25seSBkaWZmZXJlbmNlIGJldHdlZW4gYSByZWdpc3RlcmVkIGFuaW1hdGlvbiBhbmQgYVxuICAgKiBjbGFzcyByZWdpc3RyYXRpb24gaXMgY2xhc3MgcmVnaXN0cmF0aW9ucyBhcmUgcHJlZml4ZWQgd2l0aCBhIGRvdCAoYC5gKS4gUmVnaXN0ZXJlZCBhbmltYXRpb25zIGFyZSBhbHdheXNcbiAgICogSmF2YVNjcmlwdCBhbmltYXRpb25zLiBUbyByZWdpc3RlciBhbiBhbmltYXRpb24gdXNlIGBmcmFnbWVudHMucmVnaXN0ZXJBbmltYXRpb24obmFtZSwgYW5pbWF0aW9uT2JqZWN0KWAuXG4gICAqXG4gICAqIFRoZSBBbmltYXRpb24gbW9kdWxlIGNvbWVzIHdpdGggc2V2ZXJhbCBjb21tb24gYW5pbWF0aW9ucyByZWdpc3RlcmVkIGJ5IGRlZmF1bHQuIFRoZSBkZWZhdWx0cyB1c2UgQ1NTIHN0eWxlcyB0b1xuICAgKiB3b3JrIGNvcnJlY3RseSwgdXNpbmcgYGVsZW1lbnQuYW5pbWF0ZWAuXG4gICAqXG4gICAqICAgKiBgZmFkZWAgd2lsbCBmYWRlIGFuIGVsZW1lbnQgaW4gYW5kIG91dCBvdmVyIDMwMCBtaWxsaXNlY29uZHMuXG4gICAqICAgKiBgc2xpZGVgIHdpbGwgc2xpZGUgYW4gZWxlbWVudCBkb3duIHdoZW4gaXQgaXMgYWRkZWQgYW5kIHNsaWRlIGl0IHVwIHdoZW4gaXQgaXMgcmVtb3ZlZC5cbiAgICogICAqIGBzbGlkZS1tb3ZlYCB3aWxsIG1vdmUgYW4gZWxlbWVudCBmcm9tIGl0cyBvbGQgbG9jYXRpb24gdG8gaXRzIG5ldyBsb2NhdGlvbiBpbiBhIHJlcGVhdGVkIGxpc3QuXG4gICAqXG4gICAqIERvIHlvdSBoYXZlIGFub3RoZXIgY29tbW9uIGFuaW1hdGlvbiB5b3UgdGhpbmsgc2hvdWxkIGJlIGluY2x1ZGVkIGJ5IGRlZmF1bHQ/IFN1Ym1pdCBhIHB1bGwgcmVxdWVzdCFcbiAgICovXG4gIHJlZ2lzdGVyQW5pbWF0aW9uOiBmdW5jdGlvbihuYW1lLCBhbmltYXRpb25PYmplY3QpIHtcbiAgICB0aGlzLmFuaW1hdGlvbnNbbmFtZV0gPSBhbmltYXRpb25PYmplY3Q7XG4gIH0sXG5cblxuICAvKipcbiAgICogVW5yZWdpc3RlcnMgYW4gYW5pbWF0aW9uLlxuICAgKi9cbiAgdW5yZWdpc3RlckFuaW1hdGlvbjogZnVuY3Rpb24obmFtZSkge1xuICAgIGRlbGV0ZSB0aGlzLmFuaW1hdGlvbnNbbmFtZV07XG4gIH0sXG5cblxuICAvKipcbiAgICogR2V0cyBhIHJlZ2lzdGVyZWQgYW5pbWF0aW9uLlxuICAgKi9cbiAgZ2V0QW5pbWF0aW9uOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuYW5pbWF0aW9uc1tuYW1lXTtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBQcmVwYXJlIGFuIGVsZW1lbnQgdG8gYmUgZWFzaWVyIGFuaW1hdGFibGUgKGFkZGluZyBhIHNpbXBsZSBgYW5pbWF0ZWAgcG9seWZpbGwgaWYgbmVlZGVkKVxuICAgKi9cbiAgbWFrZUVsZW1lbnRBbmltYXRhYmxlOiBhbmltYXRpb24ubWFrZUVsZW1lbnRBbmltYXRhYmxlLFxuXG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIGRlbGltaXRlcnMgdGhhdCBkZWZpbmUgYW4gZXhwcmVzc2lvbi4gRGVmYXVsdCBpcyBge3tgIGFuZCBgfX1gIGJ1dCB0aGlzIG1heSBiZSBvdmVycmlkZGVuLiBJZiBlbXB0eVxuICAgKiBzdHJpbmdzIGFyZSBwYXNzZWQgaW4gKGZvciB0eXBlIFwiYXR0cmlidXRlXCIgb25seSkgdGhlbiBubyBkZWxpbWl0ZXJzIGFyZSByZXF1aXJlZCBmb3IgbWF0Y2hpbmcgYXR0cmlidXRlcywgYnV0IHRoZVxuICAgKiBkZWZhdWx0IGF0dHJpYnV0ZSBtYXRjaGVyIHdpbGwgbm90IGFwcGx5IHRvIHRoZSByZXN0IG9mIHRoZSBhdHRyaWJ1dGVzLiBUT0RPIHN1cHBvcnQgZGlmZmVyZW50IGRlbGltaXRlcnMgZm9yIHRoZVxuICAgKiBkZWZhdWx0IGF0dHJpYnV0ZXMgdnMgcmVnaXN0ZXJlZCBvbmVzIChpLmUuIGFsbG93IHJlZ3VsYXIgYXR0cmlidXRlcyB0byB1c2Uge3t9fSB3aGVuIGJvdW5kIG9uZXMgZG8gbm90IG5lZWQgdGhlbSlcbiAgICovXG4gIHNldEV4cHJlc3Npb25EZWxpbWl0ZXJzOiBmdW5jdGlvbih0eXBlLCBwcmUsIHBvc3QsIG9ubHlJbkRlZmF1bHQpIHtcbiAgICBpZiAodHlwZSAhPT0gJ2F0dHJpYnV0ZScgJiYgdHlwZSAhPT0gJ3RleHQnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdFeHByZXNzaW9uIGRlbGltaXRlcnMgbXVzdCBiZSBvZiB0eXBlIFwiYXR0cmlidXRlXCIgb3IgXCJ0ZXh0XCInKTtcbiAgICB9XG5cbiAgICB0aGlzLmJpbmRlcnNbdHlwZV0uX2V4cHIgPSBuZXcgUmVnRXhwKGVzY2FwZVJlZ0V4cChwcmUpICsgJyguKj8pJyArIGVzY2FwZVJlZ0V4cChwb3N0KSwgJ2cnKTtcbiAgICBpZiAodHlwZSA9PT0gJ2F0dHJpYnV0ZScpIHtcbiAgICAgIHRoaXMuYmluZGVyc1t0eXBlXS5fZGVsaW1pdGVyc09ubHlJbkRlZmF1bHQgPSAhIW9ubHlJbkRlZmF1bHQ7XG4gICAgfVxuICB9LFxuXG5cbiAgLyoqXG4gICAqIFRlc3RzIHdoZXRoZXIgYSB2YWx1ZSBoYXMgYW4gZXhwcmVzc2lvbiBpbiBpdC4gU29tZXRoaW5nIGxpa2UgYC91c2VyL3t7dXNlci5pZH19YC5cbiAgICovXG4gIGlzQm91bmQ6IGZ1bmN0aW9uKHR5cGUsIHZhbHVlKSB7XG4gICAgaWYgKHR5cGUgIT09ICdhdHRyaWJ1dGUnICYmIHR5cGUgIT09ICd0ZXh0Jykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignaXNCb3VuZCBtdXN0IHByb3ZpZGUgdHlwZSBcImF0dHJpYnV0ZVwiIG9yIFwidGV4dFwiJyk7XG4gICAgfVxuICAgIHZhciBleHByID0gdGhpcy5iaW5kZXJzW3R5cGVdLl9leHByO1xuICAgIHJldHVybiBCb29sZWFuKGV4cHIgJiYgdmFsdWUgJiYgdmFsdWUubWF0Y2goZXhwcikpO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIFRoZSBzb3J0IGZ1bmN0aW9uIHRvIHNvcnQgYmluZGVycyBjb3JyZWN0bHlcbiAgICovXG4gIGJpbmRpbmdTb3J0OiBmdW5jdGlvbihhLCBiKSB7XG4gICAgcmV0dXJuIGIucHJvdG90eXBlLnByaW9yaXR5IC0gYS5wcm90b3R5cGUucHJpb3JpdHk7XG4gIH0sXG5cblxuICAvKipcbiAgICogQ29udmVydHMgYW4gaW52ZXJ0ZWQgZXhwcmVzc2lvbiBmcm9tIGAvdXNlci97e3VzZXIuaWR9fWAgdG8gYFwiL3VzZXIvXCIgKyB1c2VyLmlkYFxuICAgKi9cbiAgY29kaWZ5RXhwcmVzc2lvbjogZnVuY3Rpb24odHlwZSwgdGV4dCwgbm90RGVmYXVsdCkge1xuICAgIGlmICh0eXBlICE9PSAnYXR0cmlidXRlJyAmJiB0eXBlICE9PSAndGV4dCcpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2NvZGlmeUV4cHJlc3Npb24gbXVzdCB1c2UgdHlwZSBcImF0dHJpYnV0ZVwiIG9yIFwidGV4dFwiJyk7XG4gICAgfVxuXG4gICAgaWYgKG5vdERlZmF1bHQgJiYgdGhpcy5iaW5kZXJzW3R5cGVdLl9kZWxpbWl0ZXJzT25seUluRGVmYXVsdCkge1xuICAgICAgcmV0dXJuIHRleHQ7XG4gICAgfVxuXG4gICAgdmFyIGV4cHIgPSB0aGlzLmJpbmRlcnNbdHlwZV0uX2V4cHI7XG4gICAgdmFyIG1hdGNoID0gdGV4dC5tYXRjaChleHByKTtcblxuICAgIGlmICghbWF0Y2gpIHtcbiAgICAgIHJldHVybiAnXCInICsgdGV4dC5yZXBsYWNlKC9cIi9nLCAnXFxcXFwiJykgKyAnXCInO1xuICAgIH0gZWxzZSBpZiAobWF0Y2gubGVuZ3RoID09PSAxICYmIG1hdGNoWzBdID09PSB0ZXh0KSB7XG4gICAgICByZXR1cm4gdGV4dC5yZXBsYWNlKGV4cHIsICckMScpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgbmV3VGV4dCA9ICdcIicsIGxhc3RJbmRleCA9IDA7XG4gICAgICB3aGlsZSAoKG1hdGNoID0gZXhwci5leGVjKHRleHQpKSkge1xuICAgICAgICB2YXIgc3RyID0gdGV4dC5zbGljZShsYXN0SW5kZXgsIGV4cHIubGFzdEluZGV4IC0gbWF0Y2hbMF0ubGVuZ3RoKTtcbiAgICAgICAgbmV3VGV4dCArPSBzdHIucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpO1xuICAgICAgICBuZXdUZXh0ICs9ICdcIiArICgnICsgbWF0Y2hbMV0gKyAnIHx8IFwiXCIpICsgXCInO1xuICAgICAgICBsYXN0SW5kZXggPSBleHByLmxhc3RJbmRleDtcbiAgICAgIH1cbiAgICAgIG5ld1RleHQgKz0gdGV4dC5zbGljZShsYXN0SW5kZXgpLnJlcGxhY2UoL1wiL2csICdcXFxcXCInKSArICdcIic7XG4gICAgICByZXR1cm4gbmV3VGV4dC5yZXBsYWNlKC9eXCJcIiBcXCsgfCBcIlwiIFxcKyB8IFxcKyBcIlwiJC9nLCAnJyk7XG4gICAgfVxuICB9XG5cbn0pO1xuXG4vLyBUYWtlcyBhIHN0cmluZyBsaWtlIFwiKFxcKilcIiBvciBcIm9uLVxcKlwiIGFuZCBjb252ZXJ0cyBpdCBpbnRvIGEgcmVndWxhciBleHByZXNzaW9uLlxuZnVuY3Rpb24gZXNjYXBlUmVnRXhwKHRleHQpIHtcbiAgcmV0dXJuIHRleHQucmVwbGFjZSgvWy1bXFxde30oKSorPy4sXFxcXF4kfCNcXHNdL2csICdcXFxcJCYnKTtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gVGVtcGxhdGU7XG52YXIgVmlldyA9IHJlcXVpcmUoJy4vdmlldycpO1xudmFyIENsYXNzID0gcmVxdWlyZSgnY2hpcC11dGlscy9jbGFzcycpO1xuXG5cbi8qKlxuICogIyMgVGVtcGxhdGVcbiAqIFRha2VzIGFuIEhUTUwgc3RyaW5nLCBhbiBlbGVtZW50LCBhbiBhcnJheSBvZiBlbGVtZW50cywgb3IgYSBkb2N1bWVudCBmcmFnbWVudCwgYW5kIGNvbXBpbGVzIGl0IGludG8gYSB0ZW1wbGF0ZS5cbiAqIEluc3RhbmNlcyBtYXkgdGhlbiBiZSBjcmVhdGVkIGFuZCBib3VuZCB0byBhIGdpdmVuIGNvbnRleHQuXG4gKiBAcGFyYW0ge1N0cmluZ3xOb2RlTGlzdHxIVE1MQ29sbGVjdGlvbnxIVE1MVGVtcGxhdGVFbGVtZW50fEhUTUxTY3JpcHRFbGVtZW50fE5vZGV9IGh0bWwgQSBUZW1wbGF0ZSBjYW4gYmUgY3JlYXRlZFxuICogZnJvbSBtYW55IGRpZmZlcmVudCB0eXBlcyBvZiBvYmplY3RzLiBBbnkgb2YgdGhlc2Ugd2lsbCBiZSBjb252ZXJ0ZWQgaW50byBhIGRvY3VtZW50IGZyYWdtZW50IGZvciB0aGUgdGVtcGxhdGUgdG9cbiAqIGNsb25lLiBOb2RlcyBhbmQgZWxlbWVudHMgcGFzc2VkIGluIHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoZSBET00uXG4gKi9cbmZ1bmN0aW9uIFRlbXBsYXRlKCkge1xuICB0aGlzLnBvb2wgPSBbXTtcbn1cblxuXG5DbGFzcy5leHRlbmQoVGVtcGxhdGUsIHtcblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyB2aWV3IGNsb25lZCBmcm9tIHRoaXMgdGVtcGxhdGUuXG4gICAqL1xuICBjcmVhdGVWaWV3OiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5wb29sLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHRoaXMucG9vbC5wb3AoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gVmlldy5tYWtlSW5zdGFuY2VPZihkb2N1bWVudC5pbXBvcnROb2RlKHRoaXMsIHRydWUpLCB0aGlzKTtcbiAgfSxcblxuICByZXR1cm5WaWV3OiBmdW5jdGlvbih2aWV3KSB7XG4gICAgaWYgKHRoaXMucG9vbC5pbmRleE9mKHZpZXcpID09PSAtMSkge1xuICAgICAgdGhpcy5wb29sLnB1c2godmlldyk7XG4gICAgfVxuICB9XG59KTtcbiIsIi8vIEhlbHBlciBtZXRob2RzIGZvciBhbmltYXRpb25cbmV4cG9ydHMubWFrZUVsZW1lbnRBbmltYXRhYmxlID0gbWFrZUVsZW1lbnRBbmltYXRhYmxlO1xuZXhwb3J0cy5nZXRDb21wdXRlZENTUyA9IGdldENvbXB1dGVkQ1NTO1xuZXhwb3J0cy5hbmltYXRlRWxlbWVudCA9IGFuaW1hdGVFbGVtZW50O1xuXG5mdW5jdGlvbiBtYWtlRWxlbWVudEFuaW1hdGFibGUoZWxlbWVudCkge1xuICAvLyBBZGQgcG9seWZpbGwganVzdCBvbiB0aGlzIGVsZW1lbnRcbiAgaWYgKCFlbGVtZW50LmFuaW1hdGUpIHtcbiAgICBlbGVtZW50LmFuaW1hdGUgPSBhbmltYXRlRWxlbWVudDtcbiAgfVxuXG4gIC8vIE5vdCBhIHBvbHlmaWxsIGJ1dCBhIGhlbHBlclxuICBpZiAoIWVsZW1lbnQuZ2V0Q29tcHV0ZWRDU1MpIHtcbiAgICBlbGVtZW50LmdldENvbXB1dGVkQ1NTID0gZ2V0Q29tcHV0ZWRDU1M7XG4gIH1cblxuICByZXR1cm4gZWxlbWVudDtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIGNvbXB1dGVkIHN0eWxlIG9uIGFuIGVsZW1lbnQuXG4gKi9cbmZ1bmN0aW9uIGdldENvbXB1dGVkQ1NTKHN0eWxlTmFtZSkge1xuICBpZiAodGhpcy5vd25lckRvY3VtZW50LmRlZmF1bHRWaWV3Lm9wZW5lcikge1xuICAgIHJldHVybiB0aGlzLm93bmVyRG9jdW1lbnQuZGVmYXVsdFZpZXcuZ2V0Q29tcHV0ZWRTdHlsZSh0aGlzKVtzdHlsZU5hbWVdO1xuICB9XG4gIHJldHVybiB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSh0aGlzKVtzdHlsZU5hbWVdO1xufVxuXG4vKipcbiAqIFZlcnkgYmFzaWMgcG9seWZpbGwgZm9yIEVsZW1lbnQuYW5pbWF0ZSBpZiBpdCBkb2Vzbid0IGV4aXN0LiBJZiBpdCBkb2VzLCB1c2UgdGhlIG5hdGl2ZS5cbiAqIFRoaXMgb25seSBzdXBwb3J0cyB0d28gY3NzIHN0YXRlcy4gSXQgd2lsbCBvdmVyd3JpdGUgZXhpc3Rpbmcgc3R5bGVzLiBJdCBkb2Vzbid0IHJldHVybiBhbiBhbmltYXRpb24gcGxheSBjb250cm9sLiBJdFxuICogb25seSBzdXBwb3J0cyBkdXJhdGlvbiwgZGVsYXksIGFuZCBlYXNpbmcuIFJldHVybnMgYW4gb2JqZWN0IHdpdGggYSBwcm9wZXJ0eSBvbmZpbmlzaC5cbiAqL1xuZnVuY3Rpb24gYW5pbWF0ZUVsZW1lbnQoY3NzLCBvcHRpb25zKSB7XG4gIGlmICghQXJyYXkuaXNBcnJheShjc3MpIHx8IGNzcy5sZW5ndGggIT09IDIpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdhbmltYXRlIHBvbHlmaWxsIHJlcXVpcmVzIGFuIGFycmF5IGZvciBjc3Mgd2l0aCBhbiBpbml0aWFsIGFuZCBmaW5hbCBzdGF0ZScpO1xuICB9XG5cbiAgaWYgKCFvcHRpb25zIHx8ICFvcHRpb25zLmhhc093blByb3BlcnR5KCdkdXJhdGlvbicpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYW5pbWF0ZSBwb2x5ZmlsbCByZXF1aXJlcyBvcHRpb25zIHdpdGggYSBkdXJhdGlvbicpO1xuICB9XG5cbiAgdmFyIGVsZW1lbnQgPSB0aGlzO1xuICB2YXIgZHVyYXRpb24gPSBvcHRpb25zLmR1cmF0aW9uIHx8IDA7XG4gIHZhciBkZWxheSA9IG9wdGlvbnMuZGVsYXkgfHwgMDtcbiAgdmFyIGVhc2luZyA9IG9wdGlvbnMuZWFzaW5nO1xuICB2YXIgaW5pdGlhbENzcyA9IGNzc1swXTtcbiAgdmFyIGZpbmFsQ3NzID0gY3NzWzFdO1xuICB2YXIgYWxsQ3NzID0ge307XG4gIHZhciBwbGF5YmFjayA9IHsgb25maW5pc2g6IG51bGwgfTtcblxuICBPYmplY3Qua2V5cyhpbml0aWFsQ3NzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIGFsbENzc1trZXldID0gdHJ1ZTtcbiAgICBlbGVtZW50LnN0eWxlW2tleV0gPSBpbml0aWFsQ3NzW2tleV07XG4gIH0pO1xuXG4gIC8vIHRyaWdnZXIgcmVmbG93XG4gIGVsZW1lbnQub2Zmc2V0V2lkdGg7XG5cbiAgdmFyIHRyYW5zaXRpb25PcHRpb25zID0gJyAnICsgZHVyYXRpb24gKyAnbXMnO1xuICBpZiAoZWFzaW5nKSB7XG4gICAgdHJhbnNpdGlvbk9wdGlvbnMgKz0gJyAnICsgZWFzaW5nO1xuICB9XG4gIGlmIChkZWxheSkge1xuICAgIHRyYW5zaXRpb25PcHRpb25zICs9ICcgJyArIGRlbGF5ICsgJ21zJztcbiAgfVxuXG4gIGVsZW1lbnQuc3R5bGUudHJhbnNpdGlvbiA9IE9iamVjdC5rZXlzKGZpbmFsQ3NzKS5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgcmV0dXJuIGtleSArIHRyYW5zaXRpb25PcHRpb25zO1xuICB9KS5qb2luKCcsICcpO1xuXG4gIE9iamVjdC5rZXlzKGZpbmFsQ3NzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIGFsbENzc1trZXldID0gdHJ1ZTtcbiAgICBlbGVtZW50LnN0eWxlW2tleV0gPSBmaW5hbENzc1trZXldO1xuICB9KTtcblxuICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgIE9iamVjdC5rZXlzKGFsbENzcykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgIGVsZW1lbnQuc3R5bGVba2V5XSA9ICcnO1xuICAgIH0pO1xuXG4gICAgaWYgKHBsYXliYWNrLm9uZmluaXNoKSB7XG4gICAgICBwbGF5YmFjay5vbmZpbmlzaCgpO1xuICAgIH1cbiAgfSwgZHVyYXRpb24gKyBkZWxheSk7XG5cbiAgcmV0dXJuIHBsYXliYWNrO1xufVxuIiwiXG5cblxuLy8gUG9seWZpbGwgbWF0Y2hlc1xuaWYgKCFFbGVtZW50LnByb3RvdHlwZS5tYXRjaGVzKSB7XG4gIEVsZW1lbnQucHJvdG90eXBlLm1hdGNoZXMgPVxuICAgIEVsZW1lbnQucHJvdG90eXBlLm1hdGNoZXNTZWxlY3RvciB8fFxuICAgIEVsZW1lbnQucHJvdG90eXBlLndlYmtpdE1hdGNoZXNTZWxlY3RvciB8fFxuICAgIEVsZW1lbnQucHJvdG90eXBlLm1vek1hdGNoZXNTZWxlY3RvciB8fFxuICAgIEVsZW1lbnQucHJvdG90eXBlLm1zTWF0Y2hlc1NlbGVjdG9yIHx8XG4gICAgRWxlbWVudC5wcm90b3R5cGUub01hdGNoZXNTZWxlY3Rvcjtcbn1cblxuLy8gUG9seWZpbGwgY2xvc2VzdFxuaWYgKCFFbGVtZW50LnByb3RvdHlwZS5jbG9zZXN0KSB7XG4gIEVsZW1lbnQucHJvdG90eXBlLmNsb3Nlc3QgPSBmdW5jdGlvbiBjbG9zZXN0KHNlbGVjdG9yKSB7XG4gICAgdmFyIGVsZW1lbnQgPSB0aGlzO1xuICAgIGRvIHtcbiAgICAgIGlmIChlbGVtZW50Lm1hdGNoZXMoc2VsZWN0b3IpKSB7XG4gICAgICAgIHJldHVybiBlbGVtZW50O1xuICAgICAgfVxuICAgIH0gd2hpbGUgKChlbGVtZW50ID0gZWxlbWVudC5wYXJlbnROb2RlKSAmJiBlbGVtZW50Lm5vZGVUeXBlID09PSBOb2RlLkVMRU1FTlRfTk9ERSk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH07XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHRvRnJhZ21lbnQ7XG5cbi8vIENvbnZlcnQgc3R1ZmYgaW50byBkb2N1bWVudCBmcmFnbWVudHMuIFN0dWZmIGNhbiBiZTpcbi8vICogQSBzdHJpbmcgb2YgSFRNTCB0ZXh0XG4vLyAqIEFuIGVsZW1lbnQgb3IgdGV4dCBub2RlXG4vLyAqIEEgTm9kZUxpc3Qgb3IgSFRNTENvbGxlY3Rpb24gKGUuZy4gYGVsZW1lbnQuY2hpbGROb2Rlc2Agb3IgYGVsZW1lbnQuY2hpbGRyZW5gKVxuLy8gKiBBIGpRdWVyeSBvYmplY3Rcbi8vICogQSBzY3JpcHQgZWxlbWVudCB3aXRoIGEgYHR5cGVgIGF0dHJpYnV0ZSBvZiBgXCJ0ZXh0LypcImAgKGUuZy4gYDxzY3JpcHQgdHlwZT1cInRleHQvaHRtbFwiPk15IHRlbXBsYXRlIGNvZGUhPC9zY3JpcHQ+YClcbi8vICogQSB0ZW1wbGF0ZSBlbGVtZW50IChlLmcuIGA8dGVtcGxhdGU+TXkgdGVtcGxhdGUgY29kZSE8L3RlbXBsYXRlPmApXG5mdW5jdGlvbiB0b0ZyYWdtZW50KGh0bWwpIHtcbiAgaWYgKGh0bWwgaW5zdGFuY2VvZiBEb2N1bWVudEZyYWdtZW50KSB7XG4gICAgcmV0dXJuIGh0bWw7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGh0bWwgPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIHN0cmluZ1RvRnJhZ21lbnQoaHRtbCk7XG4gIH0gZWxzZSBpZiAoaHRtbCBpbnN0YW5jZW9mIE5vZGUpIHtcbiAgICByZXR1cm4gbm9kZVRvRnJhZ21lbnQoaHRtbCk7XG4gIH0gZWxzZSBpZiAoJ2xlbmd0aCcgaW4gaHRtbCkge1xuICAgIHJldHVybiBsaXN0VG9GcmFnbWVudChodG1sKTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbnN1cHBvcnRlZCBUZW1wbGF0ZSBUeXBlOiBDYW5ub3QgY29udmVydCBgJyArIGh0bWwgKyAnYCBpbnRvIGEgZG9jdW1lbnQgZnJhZ21lbnQuJyk7XG4gIH1cbn1cblxuLy8gQ29udmVydHMgYW4gSFRNTCBub2RlIGludG8gYSBkb2N1bWVudCBmcmFnbWVudC4gSWYgaXQgaXMgYSA8dGVtcGxhdGU+IG5vZGUgaXRzIGNvbnRlbnRzIHdpbGwgYmUgdXNlZC4gSWYgaXQgaXMgYVxuLy8gPHNjcmlwdD4gbm9kZSBpdHMgc3RyaW5nLWJhc2VkIGNvbnRlbnRzIHdpbGwgYmUgY29udmVydGVkIHRvIEhUTUwgZmlyc3QsIHRoZW4gdXNlZC4gT3RoZXJ3aXNlIGEgY2xvbmUgb2YgdGhlIG5vZGVcbi8vIGl0c2VsZiB3aWxsIGJlIHVzZWQuXG5mdW5jdGlvbiBub2RlVG9GcmFnbWVudChub2RlKSB7XG4gIGlmIChub2RlLmNvbnRlbnQgaW5zdGFuY2VvZiBEb2N1bWVudEZyYWdtZW50KSB7XG4gICAgcmV0dXJuIG5vZGUuY29udGVudDtcbiAgfSBlbHNlIGlmIChub2RlLnRhZ05hbWUgPT09ICdTQ1JJUFQnKSB7XG4gICAgcmV0dXJuIHN0cmluZ1RvRnJhZ21lbnQobm9kZS5pbm5lckhUTUwpO1xuICB9IGVsc2Uge1xuICAgIHZhciBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICBpZiAobm9kZS50YWdOYW1lID09PSAnVEVNUExBVEUnKSB7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbCA9IG5vZGUuY2hpbGROb2Rlcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQobm9kZS5jaGlsZE5vZGVzW2ldKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQobm9kZSk7XG4gICAgfVxuICAgIHJldHVybiBmcmFnbWVudDtcbiAgfVxufVxuXG4vLyBDb252ZXJ0cyBhbiBIVE1MQ29sbGVjdGlvbiwgTm9kZUxpc3QsIGpRdWVyeSBvYmplY3QsIG9yIGFycmF5IGludG8gYSBkb2N1bWVudCBmcmFnbWVudC5cbmZ1bmN0aW9uIGxpc3RUb0ZyYWdtZW50KGxpc3QpIHtcbiAgdmFyIGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IGxpc3QubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgLy8gVXNlIHRvRnJhZ21lbnQgc2luY2UgdGhpcyBtYXkgYmUgYW4gYXJyYXkgb2YgdGV4dCwgYSBqUXVlcnkgb2JqZWN0IG9mIGA8dGVtcGxhdGU+YHMsIGV0Yy5cbiAgICBmcmFnbWVudC5hcHBlbmRDaGlsZCh0b0ZyYWdtZW50KGxpc3RbaV0pKTtcbiAgICBpZiAobCA9PT0gbGlzdC5sZW5ndGggKyAxKSB7XG4gICAgICAvLyBhZGp1c3QgZm9yIE5vZGVMaXN0cyB3aGljaCBhcmUgbGl2ZSwgdGhleSBzaHJpbmsgYXMgd2UgcHVsbCBub2RlcyBvdXQgb2YgdGhlIERPTVxuICAgICAgaS0tO1xuICAgICAgbC0tO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZnJhZ21lbnQ7XG59XG5cbi8vIENvbnZlcnRzIGEgc3RyaW5nIG9mIEhUTUwgdGV4dCBpbnRvIGEgZG9jdW1lbnQgZnJhZ21lbnQuXG52YXIgc3RyaW5nVG9GcmFnbWVudCA9IGZ1bmN0aW9uKHN0cmluZykge1xuICBpZiAoIXN0cmluZykge1xuICAgIHZhciBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICBmcmFnbWVudC5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJykpO1xuICAgIHJldHVybiBmcmFnbWVudDtcbiAgfVxuICB2YXIgdGVtcGxhdGVFbGVtZW50O1xuICB0ZW1wbGF0ZUVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZW1wbGF0ZScpO1xuICB0ZW1wbGF0ZUVsZW1lbnQuaW5uZXJIVE1MID0gc3RyaW5nO1xuICByZXR1cm4gdGVtcGxhdGVFbGVtZW50LmNvbnRlbnQ7XG59O1xuXG4vLyBJZiBIVE1MIFRlbXBsYXRlcyBhcmUgbm90IGF2YWlsYWJsZSAoZS5nLiBpbiBJRSkgdGhlbiB1c2UgYW4gb2xkZXIgbWV0aG9kIHRvIHdvcmsgd2l0aCBjZXJ0YWluIGVsZW1lbnRzLlxuaWYgKCFkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZW1wbGF0ZScpLmNvbnRlbnQgaW5zdGFuY2VvZiBEb2N1bWVudEZyYWdtZW50KSB7XG4gIHN0cmluZ1RvRnJhZ21lbnQgPSAoZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRhZ0V4cCA9IC88KFtcXHc6LV0rKS87XG5cbiAgICAvLyBDb3BpZWQgZnJvbSBqUXVlcnkgKGh0dHBzOi8vZ2l0aHViLmNvbS9qcXVlcnkvanF1ZXJ5L2Jsb2IvbWFzdGVyL0xJQ0VOU0UudHh0KVxuICAgIHZhciB3cmFwTWFwID0ge1xuICAgICAgb3B0aW9uOiBbIDEsICc8c2VsZWN0IG11bHRpcGxlPVwibXVsdGlwbGVcIj4nLCAnPC9zZWxlY3Q+JyBdLFxuICAgICAgbGVnZW5kOiBbIDEsICc8ZmllbGRzZXQ+JywgJzwvZmllbGRzZXQ+JyBdLFxuICAgICAgdGhlYWQ6IFsgMSwgJzx0YWJsZT4nLCAnPC90YWJsZT4nIF0sXG4gICAgICB0cjogWyAyLCAnPHRhYmxlPjx0Ym9keT4nLCAnPC90Ym9keT48L3RhYmxlPicgXSxcbiAgICAgIHRkOiBbIDMsICc8dGFibGU+PHRib2R5Pjx0cj4nLCAnPC90cj48L3Rib2R5PjwvdGFibGU+JyBdLFxuICAgICAgY29sOiBbIDIsICc8dGFibGU+PHRib2R5PjwvdGJvZHk+PGNvbGdyb3VwPicsICc8L2NvbGdyb3VwPjwvdGFibGU+JyBdLFxuICAgICAgYXJlYTogWyAxLCAnPG1hcD4nLCAnPC9tYXA+JyBdLFxuICAgICAgX2RlZmF1bHQ6IFsgMCwgJycsICcnIF1cbiAgICB9O1xuICAgIHdyYXBNYXAub3B0Z3JvdXAgPSB3cmFwTWFwLm9wdGlvbjtcbiAgICB3cmFwTWFwLnRib2R5ID0gd3JhcE1hcC50Zm9vdCA9IHdyYXBNYXAuY29sZ3JvdXAgPSB3cmFwTWFwLmNhcHRpb24gPSB3cmFwTWFwLnRoZWFkO1xuICAgIHdyYXBNYXAudGggPSB3cmFwTWFwLnRkO1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIHN0cmluZ1RvRnJhZ21lbnQoc3RyaW5nKSB7XG4gICAgICB2YXIgZnJhZ21lbnQ7XG4gICAgICBpZiAoIXN0cmluZykge1xuICAgICAgICBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpKTtcbiAgICAgICAgcmV0dXJuIGZyYWdtZW50O1xuICAgICAgfVxuICAgICAgdmFyIHRhZyA9IHN0cmluZy5tYXRjaCh0YWdFeHApO1xuICAgICAgdmFyIHBhcnRzID0gd3JhcE1hcFt0YWddIHx8IHdyYXBNYXAuX2RlZmF1bHQ7XG4gICAgICB2YXIgZGVwdGggPSBwYXJ0c1swXTtcbiAgICAgIHZhciBwcmVmaXggPSBwYXJ0c1sxXTtcbiAgICAgIHZhciBwb3N0Zml4ID0gcGFydHNbMl07XG4gICAgICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICBkaXYuaW5uZXJIVE1MID0gcHJlZml4ICsgc3RyaW5nICsgcG9zdGZpeDtcbiAgICAgIHdoaWxlIChkZXB0aC0tKSB7XG4gICAgICAgIGRpdiA9IGRpdi5sYXN0Q2hpbGQ7XG4gICAgICB9XG4gICAgICBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICAgIHdoaWxlIChkaXYuZmlyc3RDaGlsZCkge1xuICAgICAgICBmcmFnbWVudC5hcHBlbmRDaGlsZChkaXYuZmlyc3RDaGlsZCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZnJhZ21lbnQ7XG4gICAgfTtcbiAgfSkoKTtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gVmlldztcbnZhciBDbGFzcyA9IHJlcXVpcmUoJ2NoaXAtdXRpbHMvY2xhc3MnKTtcblxuXG4vKipcbiAqICMjIFZpZXdcbiAqIEEgRG9jdW1lbnRGcmFnbWVudCB3aXRoIGJpbmRpbmdzLlxuICovXG5mdW5jdGlvbiBWaWV3KHRlbXBsYXRlKSB7XG4gIGlmICh0ZW1wbGF0ZSkge1xuICAgIHRoaXMudGVtcGxhdGUgPSB0ZW1wbGF0ZTtcbiAgICB0aGlzLmJpbmRpbmdzID0gdGhpcy50ZW1wbGF0ZS5iaW5kaW5ncy5tYXAoZnVuY3Rpb24oYmluZGluZykge1xuICAgICAgcmV0dXJuIGJpbmRpbmcuY2xvbmVGb3JWaWV3KHRoaXMpO1xuICAgIH0sIHRoaXMpO1xuICB9IGVsc2UgaWYgKHRoaXMuYmluZGluZ3MpIHtcbiAgICB0aGlzLmJpbmRpbmdzLmZvckVhY2goZnVuY3Rpb24oYmluZGluZykge1xuICAgICAgYmluZGluZy5pbml0KCk7XG4gICAgfSk7XG4gIH1cblxuICB0aGlzLmZpcnN0Vmlld05vZGUgPSB0aGlzLmZpcnN0Q2hpbGQ7XG4gIHRoaXMubGFzdFZpZXdOb2RlID0gdGhpcy5sYXN0Q2hpbGQ7XG4gIGlmICh0aGlzLmZpcnN0Vmlld05vZGUpIHtcbiAgICB0aGlzLmZpcnN0Vmlld05vZGUudmlldyA9IHRoaXM7XG4gICAgdGhpcy5sYXN0Vmlld05vZGUudmlldyA9IHRoaXM7XG4gIH1cbn1cblxuXG5DbGFzcy5leHRlbmQoVmlldywge1xuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGEgdmlldyBmcm9tIHRoZSBET00uIEEgdmlldyBpcyBhIERvY3VtZW50RnJhZ21lbnQsIHNvIGByZW1vdmUoKWAgcmV0dXJucyBhbGwgaXRzIG5vZGVzIHRvIGl0c2VsZi5cbiAgICovXG4gIHJlbW92ZTogZnVuY3Rpb24oKSB7XG4gICAgdmFyIG5vZGUgPSB0aGlzLmZpcnN0Vmlld05vZGU7XG4gICAgdmFyIG5leHQ7XG5cbiAgICBpZiAobm9kZS5wYXJlbnROb2RlICE9PSB0aGlzKSB7XG4gICAgICAvLyBSZW1vdmUgYWxsIHRoZSBub2RlcyBhbmQgcHV0IHRoZW0gYmFjayBpbnRvIHRoaXMgZnJhZ21lbnRcbiAgICAgIHdoaWxlIChub2RlKSB7XG4gICAgICAgIG5leHQgPSAobm9kZSA9PT0gdGhpcy5sYXN0Vmlld05vZGUpID8gbnVsbCA6IG5vZGUubmV4dFNpYmxpbmc7XG4gICAgICAgIHRoaXMuYXBwZW5kQ2hpbGQobm9kZSk7XG4gICAgICAgIG5vZGUgPSBuZXh0O1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgYSB2aWV3IChpZiBub3QgYWxyZWFkeSByZW1vdmVkKSBhbmQgYWRkcyB0aGUgdmlldyB0byBpdHMgdGVtcGxhdGUncyBwb29sLlxuICAgKi9cbiAgZGlzcG9zZTogZnVuY3Rpb24oKSB7XG4gICAgLy8gTWFrZSBzdXJlIHRoZSB2aWV3IGlzIHJlbW92ZWQgZnJvbSB0aGUgRE9NXG4gICAgdGhpcy5iaW5kaW5ncy5mb3JFYWNoKGZ1bmN0aW9uKGJpbmRpbmcpIHtcbiAgICAgIGJpbmRpbmcuZGlzcG9zZSgpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5yZW1vdmUoKTtcbiAgICBpZiAodGhpcy50ZW1wbGF0ZSkge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5yZXR1cm5WaWV3KHRoaXMpO1xuICAgIH1cbiAgfSxcblxuXG4gIC8qKlxuICAgKiBCaW5kcyBhIHZpZXcgdG8gYSBnaXZlbiBjb250ZXh0LlxuICAgKi9cbiAgYmluZDogZnVuY3Rpb24oY29udGV4dCkge1xuICAgIHRoaXMuYmluZGluZ3MuZm9yRWFjaChmdW5jdGlvbihiaW5kaW5nKSB7XG4gICAgICBiaW5kaW5nLmJpbmQoY29udGV4dCk7XG4gICAgfSk7XG4gIH0sXG5cblxuICAvKipcbiAgICogVW5iaW5kcyBhIHZpZXcgZnJvbSBhbnkgY29udGV4dC5cbiAgICovXG4gIHVuYmluZDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5iaW5kaW5ncy5mb3JFYWNoKGZ1bmN0aW9uKGJpbmRpbmcpIHtcbiAgICAgIGJpbmRpbmcudW5iaW5kKCk7XG4gICAgfSk7XG4gIH1cbn0pO1xuIiwiXG5leHBvcnRzLk9ic2VydmF0aW9ucyA9IHJlcXVpcmUoJy4vc3JjL29ic2VydmF0aW9ucycpO1xuZXhwb3J0cy5PYnNlcnZlciA9IHJlcXVpcmUoJy4vc3JjL29ic2VydmVyJyk7XG5leHBvcnRzLmNyZWF0ZSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmV3IGV4cG9ydHMuT2JzZXJ2YXRpb25zKCk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBPYnNlcnZhdGlvbnM7XG52YXIgQ2xhc3MgPSByZXF1aXJlKCdjaGlwLXV0aWxzL2NsYXNzJyk7XG52YXIgT2JzZXJ2ZXIgPSByZXF1aXJlKCcuL29ic2VydmVyJyk7XG52YXIgcmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gZ2xvYmFsLnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCBzZXRUaW1lb3V0O1xudmFyIGNhbmNlbEFuaW1hdGlvbkZyYW1lID0gZ2xvYmFsLmNhbmNlbEFuaW1hdGlvbkZyYW1lIHx8IGNsZWFyVGltZW91dDtcblxuXG5mdW5jdGlvbiBPYnNlcnZhdGlvbnMoKSB7XG4gIHRoaXMuZ2xvYmFscyA9IHt9O1xuICB0aGlzLmZvcm1hdHRlcnMgPSB7fTtcbiAgdGhpcy5vYnNlcnZlcnMgPSBbXTtcbiAgdGhpcy5jYWxsYmFja3MgPSBbXTtcbiAgdGhpcy5saXN0ZW5lcnMgPSBbXTtcbiAgdGhpcy5zeW5jaW5nID0gZmFsc2U7XG4gIHRoaXMuY2FsbGJhY2tzUnVubmluZyA9IGZhbHNlO1xuICB0aGlzLnJlcnVuID0gZmFsc2U7XG4gIHRoaXMuY3ljbGVzID0gMDtcbiAgdGhpcy5tYXhDeWNsZXMgPSAxMDtcbiAgdGhpcy50aW1lb3V0ID0gbnVsbDtcbiAgdGhpcy5wZW5kaW5nU3luYyA9IG51bGw7XG4gIHRoaXMuc3luY05vdyA9IHRoaXMuc3luY05vdy5iaW5kKHRoaXMpO1xufVxuXG5cbkNsYXNzLmV4dGVuZChPYnNlcnZhdGlvbnMsIHtcblxuICAvLyBDcmVhdGVzIGEgbmV3IG9ic2VydmVyIGF0dGFjaGVkIHRvIHRoaXMgb2JzZXJ2YXRpb25zIG9iamVjdC4gV2hlbiB0aGUgb2JzZXJ2ZXIgaXMgYm91bmQgdG8gYSBjb250ZXh0IGl0IHdpbGwgYmUgYWRkZWRcbiAgLy8gdG8gdGhpcyBgb2JzZXJ2YXRpb25zYCBhbmQgc3luY2VkIHdoZW4gdGhpcyBgb2JzZXJ2YXRpb25zLnN5bmNgIGlzIGNhbGxlZC5cbiAgY3JlYXRlT2JzZXJ2ZXI6IGZ1bmN0aW9uKGV4cHIsIGNhbGxiYWNrLCBjYWxsYmFja0NvbnRleHQpIHtcbiAgICByZXR1cm4gbmV3IE9ic2VydmVyKHRoaXMsIGV4cHIsIGNhbGxiYWNrLCBjYWxsYmFja0NvbnRleHQpO1xuICB9LFxuXG5cbiAgLy8gU2NoZWR1bGVzIGFuIG9ic2VydmVyIHN5bmMgY3ljbGUgd2hpY2ggY2hlY2tzIGFsbCB0aGUgb2JzZXJ2ZXJzIHRvIHNlZSBpZiB0aGV5J3ZlIGNoYW5nZWQuXG4gIHN5bmM6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5hZnRlclN5bmMoY2FsbGJhY2spO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnBlbmRpbmdTeW5jKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdGhpcy5wZW5kaW5nU3luYyA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLnN5bmNOb3cpO1xuICAgIHJldHVybiB0cnVlO1xuICB9LFxuXG5cbiAgLy8gUnVucyB0aGUgb2JzZXJ2ZXIgc3luYyBjeWNsZSB3aGljaCBjaGVja3MgYWxsIHRoZSBvYnNlcnZlcnMgdG8gc2VlIGlmIHRoZXkndmUgY2hhbmdlZC5cbiAgc3luY05vdzogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICBpZiAodHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLmFmdGVyU3luYyhjYWxsYmFjayk7XG4gICAgfVxuXG4gICAgY2FuY2VsQW5pbWF0aW9uRnJhbWUodGhpcy5wZW5kaW5nU3luYyk7XG4gICAgdGhpcy5wZW5kaW5nU3luYyA9IG51bGw7XG5cbiAgICBpZiAodGhpcy5zeW5jaW5nKSB7XG4gICAgICB0aGlzLnJlcnVuID0gdHJ1ZTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB0aGlzLnJ1blN5bmMoKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcblxuXG4gIHJ1blN5bmM6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3luY2luZyA9IHRydWU7XG4gICAgdGhpcy5yZXJ1biA9IHRydWU7XG4gICAgdGhpcy5jeWNsZXMgPSAwO1xuXG4gICAgdmFyIGksIGw7XG5cbiAgICAvLyBBbGxvdyBjYWxsYmFja3MgdG8gcnVuIHRoZSBzeW5jIGN5Y2xlIGFnYWluIGltbWVkaWF0ZWx5LCBidXQgc3RvcCBhdCBgbWF4Q3lsZXNgIChkZWZhdWx0IDEwKSBjeWNsZXMgc28gd2UgZG9uJ3RcbiAgICAvLyBydW4gaW5maW5pdGUgbG9vcHNcbiAgICB3aGlsZSAodGhpcy5yZXJ1bikge1xuICAgICAgaWYgKCsrdGhpcy5jeWNsZXMgPT09IHRoaXMubWF4Q3ljbGVzKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW5maW5pdGUgb2JzZXJ2ZXIgc3luY2luZywgYW4gb2JzZXJ2ZXIgaXMgY2FsbGluZyBPYnNlcnZlci5zeW5jKCkgdG9vIG1hbnkgdGltZXMnKTtcbiAgICAgIH1cbiAgICAgIHRoaXMucmVydW4gPSBmYWxzZTtcbiAgICAgIC8vIHRoZSBvYnNlcnZlciBhcnJheSBtYXkgaW5jcmVhc2Ugb3IgZGVjcmVhc2UgaW4gc2l6ZSAocmVtYWluaW5nIG9ic2VydmVycykgZHVyaW5nIHRoZSBzeW5jXG4gICAgICBmb3IgKGkgPSAwOyBpIDwgdGhpcy5vYnNlcnZlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdGhpcy5vYnNlcnZlcnNbaV0uc3luYygpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuY2FsbGJhY2tzUnVubmluZyA9IHRydWU7XG5cbiAgICB2YXIgY2FsbGJhY2tzID0gdGhpcy5jYWxsYmFja3M7XG4gICAgdGhpcy5jYWxsYmFja3MgPSBbXTtcbiAgICB3aGlsZSAoY2FsbGJhY2tzLmxlbmd0aCkge1xuICAgICAgY2FsbGJhY2tzLnNoaWZ0KCkoKTtcbiAgICB9XG5cbiAgICBmb3IgKGkgPSAwLCBsID0gdGhpcy5saXN0ZW5lcnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICB2YXIgbGlzdGVuZXIgPSB0aGlzLmxpc3RlbmVyc1tpXTtcbiAgICAgIGxpc3RlbmVyKCk7XG4gICAgfVxuXG4gICAgdGhpcy5jYWxsYmFja3NSdW5uaW5nID0gZmFsc2U7XG4gICAgdGhpcy5zeW5jaW5nID0gZmFsc2U7XG4gICAgdGhpcy5jeWNsZXMgPSAwO1xuICB9LFxuXG5cbiAgLy8gQWZ0ZXIgdGhlIG5leHQgc3luYyAob3IgdGhlIGN1cnJlbnQgaWYgaW4gdGhlIG1pZGRsZSBvZiBvbmUpLCBydW4gdGhlIHByb3ZpZGVkIGNhbGxiYWNrXG4gIGFmdGVyU3luYzogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICBpZiAodHlwZW9mIGNhbGxiYWNrICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jYWxsYmFja3NSdW5uaW5nKSB7XG4gICAgICB0aGlzLnN5bmMoKTtcbiAgICB9XG5cbiAgICB0aGlzLmNhbGxiYWNrcy5wdXNoKGNhbGxiYWNrKTtcbiAgfSxcblxuXG4gIG9uU3luYzogZnVuY3Rpb24obGlzdGVuZXIpIHtcbiAgICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICB9XG5cbiAgICB0aGlzLmxpc3RlbmVycy5wdXNoKGxpc3RlbmVyKTtcbiAgfSxcblxuXG4gIG9mZlN5bmM6IGZ1bmN0aW9uKGxpc3RlbmVyKSB7XG4gICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgfVxuXG4gICAgdmFyIGluZGV4ID0gdGhpcy5saXN0ZW5lcnMuaW5kZXhPZihsaXN0ZW5lcik7XG4gICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgdGhpcy5saXN0ZW5lcnMuc3BsaWNlKGluZGV4LCAxKS5wb3AoKTtcbiAgICB9XG4gIH0sXG5cblxuICAvLyBBZGRzIGEgbmV3IG9ic2VydmVyIHRvIGJlIHN5bmNlZCB3aXRoIGNoYW5nZXMuIElmIGBza2lwVXBkYXRlYCBpcyB0cnVlIHRoZW4gdGhlIGNhbGxiYWNrIHdpbGwgb25seSBiZSBjYWxsZWQgd2hlbiBhXG4gIC8vIGNoYW5nZSBpcyBtYWRlLCBub3QgaW5pdGlhbGx5LlxuICBhZGQ6IGZ1bmN0aW9uKG9ic2VydmVyLCBza2lwVXBkYXRlKSB7XG4gICAgdGhpcy5vYnNlcnZlcnMucHVzaChvYnNlcnZlcik7XG4gICAgaWYgKCFza2lwVXBkYXRlKSB7XG4gICAgICBvYnNlcnZlci5mb3JjZVVwZGF0ZU5leHRTeW5jID0gdHJ1ZTtcbiAgICAgIG9ic2VydmVyLnN5bmMoKTtcbiAgICB9XG4gIH0sXG5cblxuICAvLyBSZW1vdmVzIGFuIG9ic2VydmVyLCBzdG9wcGluZyBpdCBmcm9tIGJlaW5nIHJ1blxuICByZW1vdmU6IGZ1bmN0aW9uKG9ic2VydmVyKSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5vYnNlcnZlcnMuaW5kZXhPZihvYnNlcnZlcik7XG4gICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgdGhpcy5vYnNlcnZlcnMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9LFxufSk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IE9ic2VydmVyO1xudmFyIENsYXNzID0gcmVxdWlyZSgnY2hpcC11dGlscy9jbGFzcycpO1xudmFyIGV4cHJlc3Npb25zID0gcmVxdWlyZSgnZXhwcmVzc2lvbnMtanMnKTtcbnZhciBkaWZmID0gcmVxdWlyZSgnZGlmZmVyZW5jZXMtanMnKTtcblxuLy8gIyBPYnNlcnZlclxuXG4vLyBEZWZpbmVzIGFuIG9ic2VydmVyIGNsYXNzIHdoaWNoIHJlcHJlc2VudHMgYW4gZXhwcmVzc2lvbi4gV2hlbmV2ZXIgdGhhdCBleHByZXNzaW9uIHJldHVybnMgYSBuZXcgdmFsdWUgdGhlIGBjYWxsYmFja2Bcbi8vIGlzIGNhbGxlZCB3aXRoIHRoZSB2YWx1ZS5cbi8vXG4vLyBJZiB0aGUgb2xkIGFuZCBuZXcgdmFsdWVzIHdlcmUgZWl0aGVyIGFuIGFycmF5IG9yIGFuIG9iamVjdCwgdGhlIGBjYWxsYmFja2AgYWxzb1xuLy8gcmVjZWl2ZXMgYW4gYXJyYXkgb2Ygc3BsaWNlcyAoZm9yIGFuIGFycmF5KSwgb3IgYW4gYXJyYXkgb2YgY2hhbmdlIG9iamVjdHMgKGZvciBhbiBvYmplY3QpIHdoaWNoIGFyZSB0aGUgc2FtZVxuLy8gZm9ybWF0IHRoYXQgYEFycmF5Lm9ic2VydmVgIGFuZCBgT2JqZWN0Lm9ic2VydmVgIHJldHVyblxuLy8gPGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL09iamVjdC9vYnNlcnZlPi5cbmZ1bmN0aW9uIE9ic2VydmVyKG9ic2VydmF0aW9ucywgZXhwciwgY2FsbGJhY2ssIGNhbGxiYWNrQ29udGV4dCkge1xuICBpZiAodHlwZW9mIGV4cHIgPT09ICdmdW5jdGlvbicpIHtcbiAgICB0aGlzLmdldHRlciA9IGV4cHI7XG4gICAgdGhpcy5zZXR0ZXIgPSBleHByO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuZ2V0dGVyID0gZXhwcmVzc2lvbnMucGFyc2UoZXhwciwgb2JzZXJ2YXRpb25zLmdsb2JhbHMsIG9ic2VydmF0aW9ucy5mb3JtYXR0ZXJzKTtcbiAgfVxuICB0aGlzLm9ic2VydmF0aW9ucyA9IG9ic2VydmF0aW9ucztcbiAgdGhpcy5leHByID0gZXhwcjtcbiAgdGhpcy5jYWxsYmFjayA9IGNhbGxiYWNrO1xuICB0aGlzLmNhbGxiYWNrQ29udGV4dCA9IGNhbGxiYWNrQ29udGV4dDtcbiAgdGhpcy5za2lwID0gZmFsc2U7XG4gIHRoaXMuZm9yY2VVcGRhdGVOZXh0U3luYyA9IGZhbHNlO1xuICB0aGlzLmNvbnRleHQgPSBudWxsO1xuICB0aGlzLm9sZFZhbHVlID0gdW5kZWZpbmVkO1xufVxuXG5DbGFzcy5leHRlbmQoT2JzZXJ2ZXIsIHtcblxuICAvLyBCaW5kcyB0aGlzIGV4cHJlc3Npb24gdG8gYSBnaXZlbiBjb250ZXh0XG4gIGJpbmQ6IGZ1bmN0aW9uKGNvbnRleHQsIHNraXBVcGRhdGUpIHtcbiAgICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICAgIGlmICh0aGlzLmNhbGxiYWNrKSB7XG4gICAgICB0aGlzLm9ic2VydmF0aW9ucy5hZGQodGhpcywgc2tpcFVwZGF0ZSk7XG4gICAgfVxuICB9LFxuXG4gIC8vIFVuYmluZHMgdGhpcyBleHByZXNzaW9uXG4gIHVuYmluZDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5vYnNlcnZhdGlvbnMucmVtb3ZlKHRoaXMpO1xuICAgIHRoaXMuY29udGV4dCA9IG51bGw7XG4gIH0sXG5cbiAgLy8gQ2xvc2VzIHRoZSBvYnNlcnZlciwgY2xlYW5pbmcgdXAgYW55IHBvc3NpYmxlIG1lbW9yeS1sZWFrc1xuICBjbG9zZTogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy51bmJpbmQoKTtcbiAgICB0aGlzLmNhbGxiYWNrID0gbnVsbDtcbiAgICB0aGlzLmNhbGxiYWNrQ29udGV4dCA9IG51bGw7XG4gIH0sXG5cbiAgLy8gUmV0dXJucyB0aGUgY3VycmVudCB2YWx1ZSBvZiB0aGlzIG9ic2VydmVyXG4gIGdldDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuY29udGV4dCkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0dGVyLmNhbGwodGhpcy5jb250ZXh0KTtcbiAgICB9XG4gIH0sXG5cbiAgLy8gU2V0cyB0aGUgdmFsdWUgb2YgdGhpcyBleHByZXNzaW9uXG4gIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAoIXRoaXMuY29udGV4dCkgcmV0dXJuO1xuICAgIGlmICh0aGlzLnNldHRlciA9PT0gZmFsc2UpIHJldHVybjtcbiAgICBpZiAoIXRoaXMuc2V0dGVyKSB7XG4gICAgICB0cnkge1xuICAgICAgICB0aGlzLnNldHRlciA9IHR5cGVvZiB0aGlzLmV4cHIgPT09ICdzdHJpbmcnXG4gICAgICAgICAgPyBleHByZXNzaW9ucy5wYXJzZVNldHRlcih0aGlzLmV4cHIsIHRoaXMub2JzZXJ2YXRpb25zLmdsb2JhbHMsIHRoaXMub2JzZXJ2YXRpb25zLmZvcm1hdHRlcnMpXG4gICAgICAgICAgOiBmYWxzZTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdGhpcy5zZXR0ZXIgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmICghdGhpcy5zZXR0ZXIpIHJldHVybjtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgdmFyIHJlc3VsdCA9IHRoaXMuc2V0dGVyLmNhbGwodGhpcy5jb250ZXh0LCB2YWx1ZSk7XG4gICAgfSBjYXRjaChlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gV2UgY2FuJ3QgZXhwZWN0IGNvZGUgaW4gZnJhZ21lbnRzIG91dHNpZGUgT2JzZXJ2ZXIgdG8gYmUgYXdhcmUgb2YgXCJzeW5jXCIgc2luY2Ugb2JzZXJ2ZXIgY2FuIGJlIHJlcGxhY2VkIGJ5IG90aGVyXG4gICAgLy8gdHlwZXMgKGUuZy4gb25lIHdpdGhvdXQgYSBgc3luYygpYCBtZXRob2QsIHN1Y2ggYXMgb25lIHRoYXQgdXNlcyBgT2JqZWN0Lm9ic2VydmVgKSBpbiBvdGhlciBzeXN0ZW1zLlxuICAgIHRoaXMuc3luYygpO1xuICAgIHRoaXMub2JzZXJ2YXRpb25zLnN5bmMoKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9LFxuXG5cbiAgLy8gSW5zdHJ1Y3RzIHRoaXMgb2JzZXJ2ZXIgdG8gbm90IGNhbGwgaXRzIGBjYWxsYmFja2Agb24gdGhlIG5leHQgc3luYywgd2hldGhlciB0aGUgdmFsdWUgaGFzIGNoYW5nZWQgb3Igbm90XG4gIHNraXBOZXh0U3luYzogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5za2lwID0gdHJ1ZTtcbiAgfSxcblxuXG4gIC8vIFN5bmNzIHRoaXMgb2JzZXJ2ZXIgbm93LCBjYWxsaW5nIHRoZSBjYWxsYmFjayBpbW1lZGlhdGVseSBpZiB0aGVyZSBoYXZlIGJlZW4gY2hhbmdlc1xuICBzeW5jOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdmFsdWUgPSB0aGlzLmdldCgpO1xuXG4gICAgLy8gRG9uJ3QgY2FsbCB0aGUgY2FsbGJhY2sgaWYgYHNraXBOZXh0U3luY2Agd2FzIGNhbGxlZCBvbiB0aGUgb2JzZXJ2ZXJcbiAgICBpZiAodGhpcy5za2lwIHx8ICF0aGlzLmNhbGxiYWNrKSB7XG4gICAgICB0aGlzLnNraXAgPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWYgYW4gYXJyYXkgaGFzIGNoYW5nZWQgY2FsY3VsYXRlIHRoZSBzcGxpY2VzIGFuZCBjYWxsIHRoZSBjYWxsYmFjay4gVGhpc1xuICAgICAgdmFyIGNoYW5nZWQgPSBkaWZmLnZhbHVlcyh2YWx1ZSwgdGhpcy5vbGRWYWx1ZSk7XG4gICAgICBpZiAoIWNoYW5nZWQgJiYgIXRoaXMuZm9yY2VVcGRhdGVOZXh0U3luYykgcmV0dXJuO1xuICAgICAgdGhpcy5mb3JjZVVwZGF0ZU5leHRTeW5jID0gZmFsc2U7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShjaGFuZ2VkKSkge1xuICAgICAgICB0aGlzLmNhbGxiYWNrLmNhbGwodGhpcy5jYWxsYmFja0NvbnRleHQsIHZhbHVlLCB0aGlzLm9sZFZhbHVlLCBjaGFuZ2VkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuY2FsbGJhY2suY2FsbCh0aGlzLmNhbGxiYWNrQ29udGV4dCwgdmFsdWUsIHRoaXMub2xkVmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLmdldENoYW5nZVJlY29yZHMpIHtcbiAgICAgIC8vIFN0b3JlIGFuIGltbXV0YWJsZSB2ZXJzaW9uIG9mIHRoZSB2YWx1ZSwgYWxsb3dpbmcgZm9yIGFycmF5cyBhbmQgb2JqZWN0cyB0byBjaGFuZ2UgaW5zdGFuY2UgYnV0IG5vdCBjb250ZW50IGFuZFxuICAgICAgLy8gc3RpbGwgcmVmcmFpbiBmcm9tIGRpc3BhdGNoaW5nIGNhbGxiYWNrcyAoZS5nLiB3aGVuIHVzaW5nIGFuIG9iamVjdCBpbiBiaW5kLWNsYXNzIG9yIHdoZW4gdXNpbmcgYXJyYXkgZm9ybWF0dGVyc1xuICAgICAgLy8gaW4gYmluZC1lYWNoKVxuICAgICAgdGhpcy5vbGRWYWx1ZSA9IGRpZmYuY2xvbmUodmFsdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm9sZFZhbHVlID0gdmFsdWU7XG4gICAgfVxuICB9XG59KTtcbiIsIlxuZXhwb3J0cy5Sb3V0ZXIgPSByZXF1aXJlKCcuL3NyYy9yb3V0ZXInKTtcbmV4cG9ydHMuUm91dGUgPSByZXF1aXJlKCcuL3NyYy9yb3V0ZScpO1xuZXhwb3J0cy5Mb2NhdGlvbiA9IHJlcXVpcmUoJy4vc3JjL2xvY2F0aW9uJyk7XG5leHBvcnRzLkhhc2hMb2NhdGlvbiA9IHJlcXVpcmUoJy4vc3JjL2hhc2gtbG9jYXRpb24nKTtcbmV4cG9ydHMuUHVzaExvY2F0aW9uID0gcmVxdWlyZSgnLi9zcmMvcHVzaC1sb2NhdGlvbicpO1xuZXhwb3J0cy5jcmVhdGUgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gIHJldHVybiBuZXcgZXhwb3J0cy5Sb3V0ZXIob3B0aW9ucyk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBIYXNoTG9jYXRpb247XG52YXIgTG9jYXRpb24gPSByZXF1aXJlKCcuL2xvY2F0aW9uJyk7XG5cblxuLy8gTG9jYXRpb24gaW1wbGVtZW50YXRpb24gZm9yIHVzaW5nIHRoZSBVUkwgaGFzaFxuZnVuY3Rpb24gSGFzaExvY2F0aW9uKCkge1xuICBMb2NhdGlvbi5jYWxsKHRoaXMpO1xufVxuXG5Mb2NhdGlvbi5leHRlbmQoSGFzaExvY2F0aW9uLCB7XG4gIGhpc3RvcnlFdmVudE5hbWU6ICdoYXNoY2hhbmdlJyxcblxuICBnZXQgdXJsKCkge1xuICAgIHJldHVybiBsb2NhdGlvbi5oYXNoLnJlcGxhY2UoL14jXFwvPy8sICcvJykgfHwgJy8nO1xuICB9LFxuXG4gIHNldCB1cmwodmFsdWUpIHtcbiAgICBpZiAodmFsdWUuY2hhckF0KDApID09PSAnLicgfHwgdmFsdWUuc3BsaXQoJy8vJykubGVuZ3RoID4gMSkge1xuICAgICAgdmFsdWUgPSB0aGlzLmdldFJlbGF0aXZlVXJsKHZhbHVlKTtcbiAgICB9XG5cbiAgICBsb2NhdGlvbi5oYXNoID0gKHZhbHVlID09PSAnLycgPyAnJyA6ICcjJyArIHZhbHVlKTtcbiAgfVxuXG59KTtcbiIsIm1vZHVsZS5leHBvcnRzID0gTG9jYXRpb247XG52YXIgRXZlbnRUYXJnZXQgPSByZXF1aXJlKCdjaGlwLXV0aWxzL2V2ZW50LXRhcmdldCcpO1xudmFyIGRvYyA9IGRvY3VtZW50LmltcGxlbWVudGF0aW9uLmNyZWF0ZUhUTUxEb2N1bWVudCgnJyk7XG52YXIgYmFzZSA9IGRvYy5jcmVhdGVFbGVtZW50KCdiYXNlJyk7XG52YXIgYW5jaG9yID0gZG9jLmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbnZhciBiYXNlcyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdiYXNlJyk7XG52YXIgYmFzZVVSSSA9IGJhc2VzWzBdID8gYmFzZXNbMF0uaHJlZiA6IGxvY2F0aW9uLnByb3RvY29sICsgJy8vJyArIGxvY2F0aW9uLmhvc3QgKyAnLyc7XG52YXIgUHVzaExvY2F0aW9uLCBwdXNoTG9jYXRpb247XG52YXIgSGFzaExvY2F0aW9uLCBoYXNoTG9jYXRpb247XG5kb2MuYm9keS5hcHBlbmRDaGlsZChiYXNlKTtcbmRvYy5ib2R5LmFwcGVuZENoaWxkKGFuY2hvcik7XG5cblxuZnVuY3Rpb24gTG9jYXRpb24oKSB7XG4gIEV2ZW50VGFyZ2V0LmNhbGwodGhpcyk7XG4gIHRoaXMuX2hhbmRsZUNoYW5nZSA9IHRoaXMuX2hhbmRsZUNoYW5nZS5iaW5kKHRoaXMpO1xuICB0aGlzLmJhc2VVUkkgPSBiYXNlVVJJLnJlcGxhY2UoL1xcLyQvLCAnJyk7XG4gIHRoaXMuY3VycmVudFVybCA9IHRoaXMudXJsO1xuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcih0aGlzLmhpc3RvcnlFdmVudE5hbWUsIHRoaXMuX2hhbmRsZUNoYW5nZSk7XG59XG5cbkV2ZW50VGFyZ2V0LmV4dGVuZChMb2NhdGlvbiwge1xuICBzdGF0aWM6IHtcbiAgICBjcmVhdGU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgIGlmIChvcHRpb25zLnVzZSA9PT0gJ2hhc2gnIHx8ICFQdXNoTG9jYXRpb24uc3VwcG9ydGVkKSB7XG4gICAgICAgIHJldHVybiBoYXNoTG9jYXRpb24gfHwgKGhhc2hMb2NhdGlvbiA9IG5ldyBIYXNoTG9jYXRpb24oKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gcHVzaExvY2F0aW9uIHx8IChwdXNoTG9jYXRpb24gPSBuZXcgUHVzaExvY2F0aW9uKCkpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBnZXQgc3VwcG9ydGVkKCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9LFxuXG4gIGhpc3RvcnlFdmVudE5hbWU6ICcnLFxuICBiYXNlOiBiYXNlLFxuICBhbmNob3I6IGFuY2hvcixcblxuICBnZXRSZWxhdGl2ZVVybDogZnVuY3Rpb24odXJsKSB7XG4gICAgYmFzZS5ocmVmID0gdGhpcy5iYXNlVVJJICsgdGhpcy5jdXJyZW50VXJsO1xuICAgIGFuY2hvci5ocmVmID0gdXJsO1xuICAgIHVybCA9IGFuY2hvci5wYXRobmFtZSArIGFuY2hvci5zZWFyY2g7XG4gICAgLy8gRml4IElFJ3MgbWlzc2luZyBzbGFzaCBwcmVmaXhcbiAgICByZXR1cm4gKHVybFswXSA9PT0gJy8nKSA/IHVybCA6ICcvJyArIHVybDtcbiAgfSxcblxuICBnZXRQYXRoOiBmdW5jdGlvbih1cmwpIHtcbiAgICBiYXNlLmhyZWYgPSB0aGlzLmJhc2VVUkkgKyB0aGlzLmN1cnJlbnRVcmw7XG4gICAgYW5jaG9yLmhyZWYgPSB1cmw7XG4gICAgdmFyIHBhdGggPSBhbmNob3IucGF0aG5hbWU7XG4gICAgLy8gRml4IElFJ3MgbWlzc2luZyBzbGFzaCBwcmVmaXhcbiAgICByZXR1cm4gKHBhdGhbMF0gPT09ICcvJykgPyBwYXRoIDogJy8nICsgcGF0aDtcbiAgfSxcblxuICBnZXQgdXJsKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignQWJzdHJhY3QgbWV0aG9kLiBPdmVycmlkZScpO1xuICB9LFxuXG4gIHNldCB1cmwodmFsdWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0Fic3RyYWN0IG1ldGhvZC4gT3ZlcnJpZGUnKTtcbiAgfSxcblxuICBfY2hhbmdlVG86IGZ1bmN0aW9uKHVybCkge1xuICAgIHRoaXMuY3VycmVudFVybCA9IHVybDtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdjaGFuZ2UnLCB7IGRldGFpbDogeyB1cmw6IHVybCB9fSkpO1xuICB9LFxuXG4gIF9oYW5kbGVDaGFuZ2U6IGZ1bmN0aW9uKCkge1xuICAgIHZhciB1cmwgPSB0aGlzLnVybDtcbiAgICBpZiAodGhpcy5jdXJyZW50VXJsICE9PSB1cmwpIHtcbiAgICAgIHRoaXMuX2NoYW5nZVRvKHVybCk7XG4gICAgfVxuICB9XG59KTtcblxuUHVzaExvY2F0aW9uID0gcmVxdWlyZSgnLi9wdXNoLWxvY2F0aW9uJyk7XG5IYXNoTG9jYXRpb24gPSByZXF1aXJlKCcuL2hhc2gtbG9jYXRpb24nKTtcbiIsIm1vZHVsZS5leHBvcnRzID0gUHVzaExvY2F0aW9uO1xudmFyIExvY2F0aW9uID0gcmVxdWlyZSgnLi9sb2NhdGlvbicpO1xudmFyIHVyaVBhcnRzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuXG4vLyBMb2NhdGlvbiBpbXBsZW1lbnRhdGlvbiBmb3IgdXNpbmcgcHVzaFN0YXRlXG5mdW5jdGlvbiBQdXNoTG9jYXRpb24oKSB7XG4gIExvY2F0aW9uLmNhbGwodGhpcyk7XG59XG5cbkxvY2F0aW9uLmV4dGVuZChQdXNoTG9jYXRpb24sIHtcbiAgc3RhdGljOiB7XG4gICAgZ2V0IHN1cHBvcnRlZCgpIHtcbiAgICAgIHJldHVybiB3aW5kb3cuaGlzdG9yeSAmJiB3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUgJiYgdHJ1ZTtcbiAgICB9XG4gIH0sXG5cbiAgaGlzdG9yeUV2ZW50TmFtZTogJ3BvcHN0YXRlJyxcblxuICBnZXQgdXJsKCkge1xuICAgIHJldHVybiBsb2NhdGlvbi5ocmVmLnJlcGxhY2UodGhpcy5iYXNlVVJJLCAnJykuc3BsaXQoJyMnKS5zaGlmdCgpO1xuICB9LFxuXG4gIHNldCB1cmwodmFsdWUpIHtcbiAgICBpZiAodmFsdWUuY2hhckF0KDApID09PSAnLicgfHwgdmFsdWUuc3BsaXQoJy8vJykubGVuZ3RoID4gMSkge1xuICAgICAgdmFsdWUgPSB0aGlzLmdldFJlbGF0aXZlVXJsKHZhbHVlKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jdXJyZW50VXJsICE9PSB2YWx1ZSkge1xuICAgICAgaGlzdG9yeS5wdXNoU3RhdGUoe30sICcnLCB2YWx1ZSk7XG4gICAgICAvLyBNYW51YWxseSBjaGFuZ2Ugc2luY2Ugbm8gZXZlbnQgaXMgZGlzcGF0Y2hlZCB3aGVuIHVzaW5nIHB1c2hTdGF0ZS9yZXBsYWNlU3RhdGVcbiAgICAgIHRoaXMuX2NoYW5nZVRvKHZhbHVlKTtcbiAgICB9XG4gIH1cbn0pO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBSb3V0ZTtcbnZhciBDbGFzcyA9IHJlcXVpcmUoJ2NoaXAtdXRpbHMvY2xhc3MnKTtcblxuLy8gRGVmaW5lcyBhIGNlbnRyYWwgcm91dGluZyBvYmplY3Qgd2hpY2ggaGFuZGxlcyBhbGwgVVJMIGNoYW5nZXMgYW5kIHJvdXRlcy5cbmZ1bmN0aW9uIFJvdXRlKHBhdGgsIGNhbGxiYWNrKSB7XG4gIHRoaXMucGF0aCA9IHBhdGg7XG4gIHRoaXMuY2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgdGhpcy5rZXlzID0gW107XG4gIHRoaXMuZXhwciA9IHBhcnNlUGF0aChwYXRoLCB0aGlzLmtleXMpO1xuICB0aGlzLmhhbmRsZSA9IHRoaXMuaGFuZGxlLmJpbmQodGhpcyk7XG59XG5cblxuLy8gRGV0ZXJtaW5lcyB3aGV0aGVyIHJvdXRlIG1hdGNoZXMgcGF0aFxuQ2xhc3MuZXh0ZW5kKFJvdXRlLCB7XG5cbiAgbWF0Y2g6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICBpZiAodGhpcy5leHByLnRlc3QocGF0aCkpIHtcbiAgICAgIC8vIGNhY2hlIHRoaXMgb24gbWF0Y2ggc28gd2UgZG9uJ3QgcmVjYWxjdWxhdGUgbXVsdGlwbGUgdGltZXNcbiAgICAgIHRoaXMucGFyYW1zID0gdGhpcy5nZXRQYXJhbXMocGF0aCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfSxcblxuICBnZXRQYXJhbXM6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICB2YXIgcGFyYW1zID0ge307XG4gICAgdmFyIG1hdGNoID0gdGhpcy5leHByLmV4ZWMocGF0aCk7XG4gICAgaWYgKCFtYXRjaCkge1xuICAgICAgcmV0dXJuIHBhcmFtcztcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IG1hdGNoLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIga2V5ID0gdGhpcy5rZXlzW2kgLSAxXSB8fCAnKic7XG4gICAgICB2YXIgdmFsdWUgPSBtYXRjaFtpXTtcbiAgICAgIHBhcmFtc1trZXldID0gZGVjb2RlVVJJQ29tcG9uZW50KHZhbHVlIHx8ICcnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcGFyYW1zO1xuICB9LFxuXG4gIGhhbmRsZTogZnVuY3Rpb24ocmVxLCBkb25lKSB7XG4gICAgcmVxLnBhcmFtcyA9IHRoaXMucGFyYW1zIHx8IHRoaXMuZ2V0UGFyYW1zKHJlcS5wYXRoKTtcbiAgICB0aGlzLmNhbGxiYWNrKHJlcSwgZG9uZSk7XG4gIH1cbn0pO1xuXG5cbi8vIE5vcm1hbGl6ZXMgdGhlIGdpdmVuIHBhdGggc3RyaW5nLCByZXR1cm5pbmcgYSByZWd1bGFyIGV4cHJlc3Npb24uXG4vL1xuLy8gQW4gZW1wdHkgYXJyYXkgc2hvdWxkIGJlIHBhc3NlZCwgd2hpY2ggd2lsbCBjb250YWluIHRoZSBwbGFjZWhvbGRlciBrZXkgbmFtZXMuIEZvciBleGFtcGxlIGBcIi91c2VyLzppZFwiYCB3aWxsIHRoZW5cbi8vIGNvbnRhaW4gYFtcImlkXCJdYC5cbmZ1bmN0aW9uIHBhcnNlUGF0aChwYXRoLCBrZXlzKSB7XG4gIGlmIChwYXRoIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgcmV0dXJuIHBhdGg7XG4gIH1cblxuICBpZiAoQXJyYXkuaXNBcnJheShwYXRoKSkge1xuICAgIHBhdGggPSAnKCcgKyBwYXRoLmpvaW4oJ3wnKSArICcpJztcbiAgfVxuXG4gIHBhdGggPSBwYXRoXG4gICAgLmNvbmNhdCgnLz8nKVxuICAgIC5yZXBsYWNlKC9cXC9cXCgvZywgJyg/Oi8nKVxuICAgIC5yZXBsYWNlKC8oXFwvKT8oXFwuKT86KFxcdyspKD86KFxcKC4qP1xcKSkpPyhcXD8pPyhcXCopPy9nLCBmdW5jdGlvbihfLCBzbGFzaCwgZm9ybWF0LCBrZXksIGNhcHR1cmUsIG9wdGlvbmFsLCBzdGFyKSB7XG4gICAgICBrZXlzLnB1c2goa2V5KTtcbiAgICAgIHNsYXNoID0gc2xhc2ggfHwgJyc7XG4gICAgICB2YXIgZXhwciA9ICcnO1xuICAgICAgaWYgKCFvcHRpb25hbCkgZXhwciArPSBzbGFzaDtcbiAgICAgIGV4cHIgKz0gJyg/Oic7XG4gICAgICBpZiAob3B0aW9uYWwpIGV4cHIgKz0gc2xhc2g7XG4gICAgICBleHByICs9IGZvcm1hdCB8fCAnJztcbiAgICAgIGV4cHIgKz0gY2FwdHVyZSB8fCAoZm9ybWF0ICYmICcoW14vLl0rPyknIHx8ICcoW14vXSs/KScpICsgJyknO1xuICAgICAgZXhwciArPSBvcHRpb25hbCB8fCAnJztcbiAgICAgIGlmIChzdGFyKSBleHByICs9ICcoLyopPyc7XG4gICAgICByZXR1cm4gZXhwcjtcbiAgICB9KVxuICAgIC5yZXBsYWNlKC8oW1xcLy5dKS9nLCAnXFxcXCQxJylcbiAgICAucmVwbGFjZSgvXFwoXFxcXFxcL1xcKlxcKS9nLCAnKC8uKiknKSAvLyByZXBsYWNlIHRoZSAoXFwvKik/IHdpdGggKFxcLy4qKT9cbiAgICAucmVwbGFjZSgvXFwqKD8hXFwpKS9nLCAnKC4qKScpOyAvLyBhbnkgb3RoZXIgKiB0byAoLiopXG4gIHJldHVybiBuZXcgUmVnRXhwKCdeJyArIHBhdGggKyAnJCcsICdpJyk7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFJvdXRlcjtcbnZhciBSb3V0ZSA9IHJlcXVpcmUoJy4vcm91dGUnKTtcbnZhciBFdmVudFRhcmdldCA9IHJlcXVpcmUoJ2NoaXAtdXRpbHMvZXZlbnQtdGFyZ2V0Jyk7XG52YXIgTG9jYXRpb24gPSByZXF1aXJlKCcuL2xvY2F0aW9uJyk7XG5cblxuLy8gV29yayBpbnNwaXJlZCBieSBhbmQgaW4gc29tZSBjYXNlcyBiYXNlZCBvZmYgb2Ygd29yayBkb25lIGZvciBFeHByZXNzLmpzIChodHRwczovL2dpdGh1Yi5jb20vdmlzaW9ubWVkaWEvZXhwcmVzcylcbi8vIEV2ZW50czogZXJyb3IsIGNoYW5nZVxuZnVuY3Rpb24gUm91dGVyKG9wdGlvbnMpIHtcbiAgRXZlbnRUYXJnZXQuY2FsbCh0aGlzKTtcbiAgdGhpcy5vcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgdGhpcy5yb3V0ZXMgPSBbXTtcbiAgdGhpcy5wYXJhbXMgPSB7fTtcbiAgdGhpcy5wYXJhbXNFeHAgPSB7fTtcbiAgdGhpcy5yb3V0ZXMuYnlQYXRoID0ge307XG4gIHRoaXMubG9jYXRpb24gPSBMb2NhdGlvbi5jcmVhdGUodGhpcy5vcHRpb25zKTtcbiAgdGhpcy5vblVybENoYW5nZSA9IHRoaXMub25VcmxDaGFuZ2UuYmluZCh0aGlzKTtcbn1cblxuXG5FdmVudFRhcmdldC5leHRlbmQoUm91dGVyLCB7XG5cbiAgLy8gUmVnaXN0ZXJzIGEgYGNhbGxiYWNrYCBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2hlbiB0aGUgZ2l2ZW4gcGFyYW0gYG5hbWVgIGlzIG1hdGNoZWQgaW4gYSBVUkxcbiAgcGFyYW06IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrKSB7XG4gICAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgKHRoaXMucGFyYW1zW25hbWVdIHx8ICh0aGlzLnBhcmFtc1tuYW1lXSA9IFtdKSkucHVzaChjYWxsYmFjayk7XG4gICAgfSBlbHNlIGlmIChjYWxsYmFjayBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgdGhpcy5wYXJhbXNFeHBbbmFtZV0gPSBjYWxsYmFjaztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcigncGFyYW0gbXVzdCBoYXZlIGEgY2FsbGJhY2sgb2YgdHlwZSBcImZ1bmN0aW9uXCIgb3IgUmVnRXhwLiBHb3QgJyArIGNhbGxiYWNrICsgJy4nKTtcbiAgICB9XG4gIH0sXG5cblxuICAvLyBSZWdpc3RlcnMgYSBgY2FsbGJhY2tgIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aGVuIHRoZSBnaXZlbiBwYXRoIG1hdGNoZXMgYSBVUkwuIFRoZSBjYWxsYmFjayByZWNlaXZlcyB0d29cbiAgLy8gYXJndW1lbnRzLCBgcmVxYCwgYW5kIGBuZXh0YCwgd2hlcmUgYHJlcWAgcmVwcmVzZW50cyB0aGUgcmVxdWVzdCBhbmQgaGFzIHRoZSBwcm9wZXJ0aWVzLCBgdXJsYCwgYHBhdGhgLCBgcGFyYW1zYFxuICAvLyBhbmQgYHF1ZXJ5YC4gYHJlcS5wYXJhbXNgIGlzIGFuIG9iamVjdCB3aXRoIHRoZSBwYXJhbWV0ZXJzIGZyb20gdGhlIHBhdGggKGUuZy4gLzp1c2VybmFtZS8qIHdvdWxkIG1ha2UgYSBwYXJhbXNcbiAgLy8gb2JqZWN0IHdpdGggdHdvIHByb3BlcnRpZXMsIGB1c2VybmFtZWAgYW5kIGAqYCkuIGByZXEucXVlcnlgIGlzIGFuIG9iamVjdCB3aXRoIGtleS12YWx1ZSBwYWlycyBmcm9tIHRoZSBxdWVyeVxuICAvLyBwb3J0aW9uIG9mIHRoZSBVUkwuXG4gIHJvdXRlOiBmdW5jdGlvbihwYXRoLCBjYWxsYmFjaykge1xuICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3JvdXRlIG11c3QgaGF2ZSBhIGNhbGxiYWNrIG9mIHR5cGUgXCJmdW5jdGlvblwiLiBHb3QgJyArIGNhbGxiYWNrICsgJy4nKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHBhdGggPT09ICdzdHJpbmcnICYmIHBhdGhbMF0gIT09ICcvJykge1xuICAgICAgcGF0aCA9ICcvJyArIHBhdGg7XG4gICAgfVxuICAgIHRoaXMucm91dGVzLnB1c2gobmV3IFJvdXRlKHBhdGgsIGNhbGxiYWNrKSk7XG4gIH0sXG5cblxuICByZW1vdmVSb3V0ZTogZnVuY3Rpb24ocGF0aCwgY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy5yb3V0ZXMuc29tZShmdW5jdGlvbihyb3V0ZSwgaW5kZXgpIHtcbiAgICAgIGlmIChyb3V0ZS5wYXRoID09PSBwYXRoICYmIHJvdXRlLmNhbGxiYWNrID09PSBjYWxsYmFjaykge1xuICAgICAgICB0aGlzLnJvdXRlcy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuXG4gIHJlZGlyZWN0OiBmdW5jdGlvbih1cmwpIHtcbiAgICB2YXIgbm90Rm91bmQgPSBmYWxzZTtcbiAgICBmdW5jdGlvbiBlcnJIYW5kbGVyKGV2ZW50KSB7XG4gICAgICBub3RGb3VuZCA9IChldmVudC5kZXRhaWwgPT09ICdub3RGb3VuZCcpO1xuICAgIH1cbiAgICB0aGlzLm9uKCdlcnJvcicsIGVyckhhbmRsZXIpO1xuXG4gICAgdGhpcy5sb2NhdGlvbi51cmwgPSB1cmw7XG5cbiAgICB0aGlzLm9mZignZXJyb3InLCBlcnJIYW5kbGVyKTtcbiAgICByZXR1cm4gIW5vdEZvdW5kO1xuICB9LFxuXG5cbiAgbGlzdGVuOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmxvY2F0aW9uLm9uKCdjaGFuZ2UnLCB0aGlzLm9uVXJsQ2hhbmdlKTtcbiAgfSxcblxuXG4gIHN0b3A6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMubG9jYXRpb24ub2ZmKCdjaGFuZ2UnLCB0aGlzLm9uVXJsQ2hhbmdlKTtcbiAgfSxcblxuXG4gIGdldFJvdXRlc01hdGNoaW5nUGF0aDogZnVuY3Rpb24odXJsKSB7XG4gICAgaWYgKHVybCA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIHZhciBwYXRoID0gdGhpcy5sb2NhdGlvbi5nZXRQYXRoKHVybCk7XG4gICAgdmFyIHBhcmFtc0V4cCA9IHRoaXMucGFyYW1zRXhwO1xuXG4gICAgcmV0dXJuIHRoaXMucm91dGVzLmZpbHRlcihmdW5jdGlvbihyb3V0ZSkge1xuICAgICAgaWYgKCFyb3V0ZS5tYXRjaChwYXRoKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIHZhciBwYXJhbXMgPSByb3V0ZS5nZXRQYXJhbXMocGF0aCk7XG4gICAgICByZXR1cm4gcm91dGUua2V5cy5ldmVyeShmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gcGFyYW1zW2tleV07XG4gICAgICAgIHJldHVybiAhcGFyYW1zRXhwLmhhc093blByb3BlcnR5KGtleSkgfHwgKHZhbHVlICYmIHBhcmFtc0V4cFtrZXldLnRlc3QodmFsdWUpKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuXG5cbiAgb25VcmxDaGFuZ2U6IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgdmFyIHVybFBhcnRzID0gZXZlbnQuZGV0YWlsLnVybC5zcGxpdCgnPycpO1xuICAgIHZhciBwYXRoID0gdXJsUGFydHMuc2hpZnQoKTtcbiAgICB2YXIgcXVlcnkgPSB1cmxQYXJ0cy5qb2luKCc/Jyk7XG4gICAgdmFyIHJlcSA9IHsgdXJsOiBldmVudC5kZXRhaWwudXJsLCBwYXRoOiBwYXRoLCBxdWVyeTogcGFyc2VRdWVyeShxdWVyeSkgfTtcbiAgICB2YXIgcGFyYW1zQ2FsbGVkID0ge307XG5cbiAgICB2YXIgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoJ2NoYW5naW5nJywgeyBkZXRhaWw6IHJlcSwgY2FuY2VsYWJsZTogdHJ1ZSB9KTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgIGlmIChldmVudC5kZWZhdWx0UHJldmVudGVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnY2hhbmdlJywgeyBkZXRhaWw6IHJlcSB9KSk7XG4gICAgdmFyIHJvdXRlcyA9IHRoaXMuZ2V0Um91dGVzTWF0Y2hpbmdQYXRoKHBhdGgpO1xuICAgIHZhciBjYWxsYmFja3MgPSBbXTtcbiAgICB2YXIgaGFuZGxlZFBhcmFtcyA9IHt9O1xuICAgIHZhciByb3V0ZXIgPSB0aGlzO1xuXG4gICAgLy8gQWRkIGFsbCB0aGUgY2FsbGJhY2tzIGZvciB0aGlzIFVSTCAoYWxsIG1hdGNoaW5nIHJvdXRlcyBhbmQgdGhlIHBhcmFtcyB0aGV5J3JlIGRlcGVuZGVudCBvbilcbiAgICByb3V0ZXMuZm9yRWFjaChmdW5jdGlvbihyb3V0ZSkge1xuICAgICAgLy8gQWRkIHBhcmFtIGNhbGxiYWNrcyB3aGVuIHRoZXkgZXhpc3RcbiAgICAgIHJvdXRlLmtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgaWYgKHJvdXRlci5wYXJhbXMuaGFzT3duUHJvcGVydHkoa2V5KSAmJiAhaGFuZGxlZFBhcmFtcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgaGFuZGxlZFBhcmFtc1trZXldID0gdHJ1ZTtcbiAgICAgICAgICB2YXIgdmFsdWUgPSByb3V0ZS5wYXJhbXNba2V5XTtcbiAgICAgICAgICByb3V0ZXIucGFyYW1zW2tleV0uZm9yRWFjaChmdW5jdGlvbihwYXJhbUNhbGxiYWNrKSB7XG4gICAgICAgICAgICBjYWxsYmFja3MucHVzaChmdW5jdGlvbihyZXEsIG5leHQpIHtcbiAgICAgICAgICAgICAgcGFyYW1DYWxsYmFjayhyZXEsIG5leHQsIHZhbHVlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgLy8gQWRkIHJvdXRlIGNhbGxiYWNrXG4gICAgICBjYWxsYmFja3MucHVzaChyb3V0ZS5oYW5kbGUpO1xuICAgIH0sIHRoaXMpO1xuXG4gICAgLy8gQ2FsbHMgZWFjaCBjYWxsYmFjayBvbmUgYnkgb25lIHVudGlsIGVpdGhlciB0aGVyZSBpcyBhbiBlcnJvciBvciB3ZSBjYWxsIGFsbCBvZiB0aGVtLlxuICAgIHZhciBuZXh0ID0gZnVuY3Rpb24oZXJyKSB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIHJvdXRlci5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnZXJyb3InLCB7IGRldGFpbDogZXJyIH0pKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWNhbGxiYWNrcy5sZW5ndGgpIHJldHVybiBuZXh0KCdub3RGb3VuZCcpO1xuICAgICAgY2FsbGJhY2sgPSBjYWxsYmFja3Muc2hpZnQoKTtcbiAgICAgIGNhbGxiYWNrKHJlcSwgbmV4dCk7XG4gICAgfTtcblxuICAgIC8vIFN0YXJ0IHJ1bm5pbmcgdGhlIGNhbGxiYWNrcywgb25lIGJ5IG9uZVxuICAgIG5leHQoKTtcbiAgfVxuXG59KTtcblxuXG4vLyBQYXJzZXMgYSBsb2NhdGlvbi5zZWFyY2ggc3RyaW5nIGludG8gYW4gb2JqZWN0IHdpdGgga2V5LXZhbHVlIHBhaXJzLlxuZnVuY3Rpb24gcGFyc2VRdWVyeShzZWFyY2gpIHtcbiAgdmFyIHF1ZXJ5ID0ge307XG4gIGlmIChzZWFyY2ggPT09ICcnKSB7XG4gICAgcmV0dXJuIHF1ZXJ5O1xuICB9XG5cbiAgc2VhcmNoLnJlcGxhY2UoL15cXD8vLCAnJykuc3BsaXQoJyYnKS5mb3JFYWNoKGZ1bmN0aW9uKGtleVZhbHVlKSB7XG4gICAgdmFyIHBhcnRzID0ga2V5VmFsdWUuc3BsaXQoJz0nKTtcbiAgICB2YXIga2V5ID0gcGFydHNbMF07XG4gICAgdmFyIHZhbHVlID0gcGFydHNbMV07XG4gICAgcXVlcnlbZGVjb2RlVVJJQ29tcG9uZW50KGtleSldID0gZGVjb2RlVVJJQ29tcG9uZW50KHZhbHVlKTtcbiAgfSk7XG5cbiAgcmV0dXJuIHF1ZXJ5O1xufVxuIl19
