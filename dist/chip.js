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
      if (this.contentTemplate) {
        this.content = this.contentTemplate.createView();
      }

      if (definition.template) {
        this.view = definition.template.createView();
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
      this.element.style[this.styleName] = (value == null) ? '' : value + this.unit;
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9idWlsdC1pbnMvYW5pbWF0aW9ucy9mYWRlLmpzIiwiLi4vYnVpbHQtaW5zL2FuaW1hdGlvbnMvaW5kZXguanMiLCIuLi9idWlsdC1pbnMvYW5pbWF0aW9ucy9zbGlkZS1ob3Jpem9udGFsLmpzIiwiLi4vYnVpbHQtaW5zL2FuaW1hdGlvbnMvc2xpZGUtbW92ZS1ob3Jpem9udGFsLmpzIiwiLi4vYnVpbHQtaW5zL2FuaW1hdGlvbnMvc2xpZGUtbW92ZS5qcyIsIi4uL2J1aWx0LWlucy9hbmltYXRpb25zL3NsaWRlLmpzIiwiLi4vYnVpbHQtaW5zL2JpbmRlcnMvYXR0cmlidXRlLW5hbWVzLmpzIiwiLi4vYnVpbHQtaW5zL2JpbmRlcnMvYXV0b2ZvY3VzLmpzIiwiLi4vYnVpbHQtaW5zL2JpbmRlcnMvYXV0b3NlbGVjdC5qcyIsIi4uL2J1aWx0LWlucy9iaW5kZXJzL2NsYXNzZXMuanMiLCIuLi9idWlsdC1pbnMvYmluZGVycy9jb21wb25lbnQuanMiLCIuLi9idWlsdC1pbnMvYmluZGVycy9ldmVudHMuanMiLCIuLi9idWlsdC1pbnMvYmluZGVycy9odG1sLmpzIiwiLi4vYnVpbHQtaW5zL2JpbmRlcnMvaWYuanMiLCIuLi9idWlsdC1pbnMvYmluZGVycy9rZXktZXZlbnRzLmpzIiwiLi4vYnVpbHQtaW5zL2JpbmRlcnMvbG9nLmpzIiwiLi4vYnVpbHQtaW5zL2JpbmRlcnMvcHJvcGVydGllcy0yLXdheS5qcyIsIi4uL2J1aWx0LWlucy9iaW5kZXJzL3Byb3BlcnRpZXMuanMiLCIuLi9idWlsdC1pbnMvYmluZGVycy9yZWYuanMiLCIuLi9idWlsdC1pbnMvYmluZGVycy9yZXBlYXQuanMiLCIuLi9idWlsdC1pbnMvYmluZGVycy9zaG93LmpzIiwiLi4vYnVpbHQtaW5zL2JpbmRlcnMvc3R5bGVzLmpzIiwiLi4vYnVpbHQtaW5zL2JpbmRlcnMvdGV4dC5qcyIsIi4uL2J1aWx0LWlucy9iaW5kZXJzL3ZhbHVlLmpzIiwiLi4vYnVpbHQtaW5zL2Zvcm1hdHRlcnMvYWRkLXF1ZXJ5LmpzIiwiLi4vYnVpbHQtaW5zL2Zvcm1hdHRlcnMvYXV0b2xpbmsuanMiLCIuLi9idWlsdC1pbnMvZm9ybWF0dGVycy9ib29sLmpzIiwiLi4vYnVpbHQtaW5zL2Zvcm1hdHRlcnMvYnIuanMiLCIuLi9idWlsdC1pbnMvZm9ybWF0dGVycy9kYXRlLXRpbWUuanMiLCIuLi9idWlsdC1pbnMvZm9ybWF0dGVycy9kYXRlLmpzIiwiLi4vYnVpbHQtaW5zL2Zvcm1hdHRlcnMvZXNjYXBlLmpzIiwiLi4vYnVpbHQtaW5zL2Zvcm1hdHRlcnMvZmlsdGVyLmpzIiwiLi4vYnVpbHQtaW5zL2Zvcm1hdHRlcnMvZmxvYXQuanMiLCIuLi9idWlsdC1pbnMvZm9ybWF0dGVycy9mb3JtYXQuanMiLCIuLi9idWlsdC1pbnMvZm9ybWF0dGVycy9pbmRleC5qcyIsIi4uL2J1aWx0LWlucy9mb3JtYXR0ZXJzL2ludC5qcyIsIi4uL2J1aWx0LWlucy9mb3JtYXR0ZXJzL2pzb24uanMiLCIuLi9idWlsdC1pbnMvZm9ybWF0dGVycy9saW1pdC5qcyIsIi4uL2J1aWx0LWlucy9mb3JtYXR0ZXJzL2xvZy5qcyIsIi4uL2J1aWx0LWlucy9mb3JtYXR0ZXJzL2xvd2VyLmpzIiwiLi4vYnVpbHQtaW5zL2Zvcm1hdHRlcnMvbWFwLmpzIiwiLi4vYnVpbHQtaW5zL2Zvcm1hdHRlcnMvbmV3bGluZS5qcyIsIi4uL2J1aWx0LWlucy9mb3JtYXR0ZXJzL3AuanMiLCIuLi9idWlsdC1pbnMvZm9ybWF0dGVycy9yZWR1Y2UuanMiLCIuLi9idWlsdC1pbnMvZm9ybWF0dGVycy9zbGljZS5qcyIsIi4uL2J1aWx0LWlucy9mb3JtYXR0ZXJzL3NvcnQuanMiLCIuLi9idWlsdC1pbnMvZm9ybWF0dGVycy90aW1lLmpzIiwiLi4vYnVpbHQtaW5zL2Zvcm1hdHRlcnMvdXBwZXIuanMiLCIuLi9idWlsdC1pbnMvbm9kZV9tb2R1bGVzL2RpZmZlcmVuY2VzLWpzL2luZGV4LmpzIiwiLi4vYnVpbHQtaW5zL25vZGVfbW9kdWxlcy9kaWZmZXJlbmNlcy1qcy9zcmMvZGlmZi5qcyIsIi4uL2NoaXAtdXRpbHMvY2xhc3MuanMiLCIuLi9jaGlwLXV0aWxzL2V2ZW50LXRhcmdldC5qcyIsImluZGV4LmpzIiwic3JjL2FwcC5qcyIsInNyYy9iaW5kZXJzL3JvdXRlLmpzIiwic3JjL2NoaXAuanMiLCJzcmMvZnJhZ21lbnRzLmpzIiwic3JjL21peGlucy9kZWZhdWx0LmpzIiwiLi4vZGlmZmVyZW5jZXMtanMvc3JjL2RpZmYuanMiLCIuLi9leHByZXNzaW9ucy1qcy9pbmRleC5qcyIsIi4uL2V4cHJlc3Npb25zLWpzL3NyYy9leHByZXNzaW9ucy5qcyIsIi4uL2V4cHJlc3Npb25zLWpzL3NyYy9mb3JtYXR0ZXJzLmpzIiwiLi4vZXhwcmVzc2lvbnMtanMvc3JjL3Byb3BlcnR5LWNoYWlucy5qcyIsIi4uL2V4cHJlc3Npb25zLWpzL3NyYy9zdHJpbmdzLmpzIiwiLi4vZnJhZ21lbnRzLWpzL2luZGV4LmpzIiwiLi4vZnJhZ21lbnRzLWpzL25vZGVfbW9kdWxlcy9jaGlwLXV0aWxzL2NsYXNzLmpzIiwiLi4vZnJhZ21lbnRzLWpzL3NyYy9hbmltYXRlZEJpbmRpbmcuanMiLCIuLi9mcmFnbWVudHMtanMvc3JjL2JpbmRpbmcuanMiLCIuLi9mcmFnbWVudHMtanMvc3JjL2NvbXBpbGUuanMiLCIuLi9mcmFnbWVudHMtanMvc3JjL2ZyYWdtZW50cy5qcyIsIi4uL2ZyYWdtZW50cy1qcy9zcmMvdGVtcGxhdGUuanMiLCIuLi9mcmFnbWVudHMtanMvc3JjL3V0aWwvYW5pbWF0aW9uLmpzIiwiLi4vZnJhZ21lbnRzLWpzL3NyYy91dGlsL3BvbHlmaWxscy5qcyIsIi4uL2ZyYWdtZW50cy1qcy9zcmMvdXRpbC90b0ZyYWdtZW50LmpzIiwiLi4vZnJhZ21lbnRzLWpzL3NyYy92aWV3LmpzIiwiLi4vb2JzZXJ2YXRpb25zLWpzL2luZGV4LmpzIiwiLi4vb2JzZXJ2YXRpb25zLWpzL3NyYy9vYnNlcnZhdGlvbnMuanMiLCIuLi9vYnNlcnZhdGlvbnMtanMvc3JjL29ic2VydmVyLmpzIiwiLi4vcm91dGVzLWpzL2luZGV4LmpzIiwiLi4vcm91dGVzLWpzL3NyYy9oYXNoLWxvY2F0aW9uLmpzIiwiLi4vcm91dGVzLWpzL3NyYy9sb2NhdGlvbi5qcyIsIi4uL3JvdXRlcy1qcy9zcmMvcHVzaC1sb2NhdGlvbi5qcyIsIi4uL3JvdXRlcy1qcy9zcmMvcm91dGUuanMiLCIuLi9yb3V0ZXMtanMvc3JjL3JvdXRlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxWUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDekZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwWkE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2VUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25QQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5bUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNuS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBGYWRlIGluIGFuZCBvdXRcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gIGlmICghb3B0aW9ucykgb3B0aW9ucyA9IHt9O1xuICBpZiAoIW9wdGlvbnMuZHVyYXRpb24pIG9wdGlvbnMuZHVyYXRpb24gPSAyNTA7XG4gIGlmICghb3B0aW9ucy5lYXNpbmcpIG9wdGlvbnMuZWFzaW5nID0gJ2Vhc2UtaW4tb3V0JztcblxuICByZXR1cm4ge1xuICAgIG9wdGlvbnM6IG9wdGlvbnMsXG4gICAgYW5pbWF0ZUluOiBmdW5jdGlvbihlbGVtZW50LCBkb25lKSB7XG4gICAgICBlbGVtZW50LmFuaW1hdGUoW1xuICAgICAgICB7IG9wYWNpdHk6ICcwJyB9LFxuICAgICAgICB7IG9wYWNpdHk6ICcxJyB9XG4gICAgICBdLCB0aGlzLm9wdGlvbnMpLm9uZmluaXNoID0gZG9uZTtcbiAgICB9LFxuICAgIGFuaW1hdGVPdXQ6IGZ1bmN0aW9uKGVsZW1lbnQsIGRvbmUpIHtcbiAgICAgIGVsZW1lbnQuYW5pbWF0ZShbXG4gICAgICAgIHsgb3BhY2l0eTogJzEnIH0sXG4gICAgICAgIHsgb3BhY2l0eTogJzAnIH1cbiAgICAgIF0sIHRoaXMub3B0aW9ucykub25maW5pc2ggPSBkb25lO1xuICAgIH1cbiAgfTtcbn07XG4iLCIvKipcbiAqIEFkZHMgYWxsIGJ1aWx0LWluIGFuaW1hdGlvbnMgd2l0aCBkZWZhdWx0IG5hbWVzXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZnJhZ21lbnRzKSB7XG4gIGlmICghZnJhZ21lbnRzIHx8IHR5cGVvZiBmcmFnbWVudHMucmVnaXN0ZXJBbmltYXRpb24gIT09ICdmdW5jdGlvbicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdmb3JtYXR0ZXJzIHJlcXVpcmVzIGFuIGluc3RhbmNlIG9mIGZyYWdtZW50cyB0byByZWdpc3RlciB3aXRoJyk7XG4gIH1cblxuICBmcmFnbWVudHMucmVnaXN0ZXJBbmltYXRpb24oJ2ZhZGUnLCByZXF1aXJlKCcuL2ZhZGUnKSgpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQW5pbWF0aW9uKCdzbGlkZScsIHJlcXVpcmUoJy4vc2xpZGUnKSgpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQW5pbWF0aW9uKCdzbGlkZS1oJywgcmVxdWlyZSgnLi9zbGlkZS1ob3Jpem9udGFsJykoKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckFuaW1hdGlvbignc2xpZGUtbW92ZScsIHJlcXVpcmUoJy4vc2xpZGUtbW92ZScpKGZyYWdtZW50cykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJBbmltYXRpb24oJ3NsaWRlLW1vdmUtaCcsIHJlcXVpcmUoJy4vc2xpZGUtbW92ZS1ob3Jpem9udGFsJykoZnJhZ21lbnRzKSk7XG59O1xuIiwiLyoqXG4gKiBTbGlkZSBsZWZ0IGFuZCByaWdodFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgaWYgKCFvcHRpb25zKSBvcHRpb25zID0ge307XG4gIGlmICghb3B0aW9ucy5wcm9wZXJ0eSkgb3B0aW9ucy5wcm9wZXJ0eSA9ICd3aWR0aCc7XG4gIHJldHVybiByZXF1aXJlKCcuL3NsaWRlJykob3B0aW9ucyk7XG59O1xuIiwiLyoqXG4gKiBNb3ZlIGl0ZW1zIGxlZnQgYW5kIHJpZ2h0IGluIGEgbGlzdFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGZyYWdtZW50cywgb3B0aW9ucykge1xuICBpZiAoIW9wdGlvbnMpIG9wdGlvbnMgPSB7fTtcbiAgaWYgKCFvcHRpb25zLnByb3BlcnR5KSBvcHRpb25zLnByb3BlcnR5ID0gJ3dpZHRoJztcbiAgcmV0dXJuIHJlcXVpcmUoJy4vc2xpZGUtbW92ZScpKGZyYWdtZW50cywgb3B0aW9ucyk7XG59O1xuIiwidmFyIHNsaWRlQW5pbWF0aW9uID0gcmVxdWlyZSgnLi9zbGlkZScpO1xudmFyIGFuaW1hdGluZyA9IG5ldyBNYXAoKTtcblxuLyoqXG4gKiBNb3ZlIGl0ZW1zIHVwIGFuZCBkb3duIGluIGEgbGlzdFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGZyYWdtZW50cywgb3B0aW9ucykge1xuICBpZiAoIW9wdGlvbnMpIG9wdGlvbnMgPSB7fTtcbiAgaWYgKCFvcHRpb25zLmR1cmF0aW9uKSBvcHRpb25zLmR1cmF0aW9uID0gMjUwO1xuICBpZiAoIW9wdGlvbnMuZWFzaW5nKSBvcHRpb25zLmVhc2luZyA9ICdlYXNlLWluLW91dCc7XG4gIGlmICghb3B0aW9ucy5wcm9wZXJ0eSkgb3B0aW9ucy5wcm9wZXJ0eSA9ICdoZWlnaHQnO1xuXG4gIHJldHVybiB7XG4gICAgb3B0aW9uczogb3B0aW9ucyxcblxuICAgIGFuaW1hdGVJbjogZnVuY3Rpb24oZWxlbWVudCwgZG9uZSkge1xuICAgICAgdmFyIHZhbHVlID0gZWxlbWVudC5nZXRDb21wdXRlZENTUyhvcHRpb25zLnByb3BlcnR5KTtcbiAgICAgIGlmICghdmFsdWUgfHwgdmFsdWUgPT09ICcwcHgnKSB7XG4gICAgICAgIHJldHVybiBkb25lKCk7XG4gICAgICB9XG5cbiAgICAgIHZhciBpdGVtID0gZWxlbWVudC52aWV3ICYmIGVsZW1lbnQudmlldy5fcmVwZWF0SXRlbV87XG4gICAgICBpZiAoaXRlbSkge1xuICAgICAgICBhbmltYXRpbmcuc2V0KGl0ZW0sIGVsZW1lbnQpO1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGFuaW1hdGluZy5kZWxldGUoaXRlbSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBEbyB0aGUgc2xpZGVcbiAgICAgIGVsZW1lbnQuc3R5bGUub3ZlcmZsb3cgPSAnaGlkZGVuJztcbiAgICAgIGVsZW1lbnQuYW5pbWF0ZShbXG4gICAgICAgIGtleVZhbHVlUGFpcihvcHRpb25zLnByb3BlcnR5LCAnMHB4JyksXG4gICAgICAgIGtleVZhbHVlUGFpcihvcHRpb25zLnByb3BlcnR5LCB2YWx1ZSlcbiAgICAgIF0sIHRoaXMub3B0aW9ucykub25maW5pc2ggPSBmdW5jdGlvbigpIHtcbiAgICAgICAgZWxlbWVudC5zdHlsZS5vdmVyZmxvdyA9ICcnO1xuICAgICAgICBkb25lKCk7XG4gICAgICB9O1xuICAgIH0sXG5cbiAgICBhbmltYXRlT3V0OiBmdW5jdGlvbihlbGVtZW50LCBkb25lKSB7XG4gICAgICB2YXIgdmFsdWUgPSBlbGVtZW50LmdldENvbXB1dGVkQ1NTKG9wdGlvbnMucHJvcGVydHkpO1xuICAgICAgaWYgKCF2YWx1ZSB8fCB2YWx1ZSA9PT0gJzBweCcpIHtcbiAgICAgICAgcmV0dXJuIGRvbmUoKTtcbiAgICAgIH1cblxuICAgICAgdmFyIGl0ZW0gPSBlbGVtZW50LnZpZXcgJiYgZWxlbWVudC52aWV3Ll9yZXBlYXRJdGVtXztcbiAgICAgIGlmIChpdGVtKSB7XG4gICAgICAgIHZhciBuZXdFbGVtZW50ID0gYW5pbWF0aW5nLmdldChpdGVtKTtcbiAgICAgICAgaWYgKG5ld0VsZW1lbnQgJiYgbmV3RWxlbWVudC5wYXJlbnROb2RlID09PSBlbGVtZW50LnBhcmVudE5vZGUpIHtcbiAgICAgICAgICAvLyBUaGlzIGl0ZW0gaXMgYmVpbmcgcmVtb3ZlZCBpbiBvbmUgcGxhY2UgYW5kIGFkZGVkIGludG8gYW5vdGhlci4gTWFrZSBpdCBsb29rIGxpa2UgaXRzIG1vdmluZyBieSBtYWtpbmcgYm90aFxuICAgICAgICAgIC8vIGVsZW1lbnRzIG5vdCB2aXNpYmxlIGFuZCBoYXZpbmcgYSBjbG9uZSBtb3ZlIGFib3ZlIHRoZSBpdGVtcyB0byB0aGUgbmV3IGxvY2F0aW9uLlxuICAgICAgICAgIGVsZW1lbnQgPSB0aGlzLmFuaW1hdGVNb3ZlKGVsZW1lbnQsIG5ld0VsZW1lbnQpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIERvIHRoZSBzbGlkZVxuICAgICAgZWxlbWVudC5zdHlsZS5vdmVyZmxvdyA9ICdoaWRkZW4nO1xuICAgICAgZWxlbWVudC5hbmltYXRlKFtcbiAgICAgICAga2V5VmFsdWVQYWlyKG9wdGlvbnMucHJvcGVydHksIHZhbHVlKSxcbiAgICAgICAga2V5VmFsdWVQYWlyKG9wdGlvbnMucHJvcGVydHksICcwcHgnKVxuICAgICAgXSwgdGhpcy5vcHRpb25zKS5vbmZpbmlzaCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBlbGVtZW50LnN0eWxlLm92ZXJmbG93ID0gJyc7XG4gICAgICAgIGRvbmUoKTtcbiAgICAgIH07XG4gICAgfSxcblxuICAgIGFuaW1hdGVNb3ZlOiBmdW5jdGlvbihvbGRFbGVtZW50LCBuZXdFbGVtZW50KSB7XG4gICAgICB2YXIgcGxhY2Vob2xkZXJFbGVtZW50O1xuICAgICAgdmFyIHBhcmVudCA9IG5ld0VsZW1lbnQucGFyZW50Tm9kZTtcbiAgICAgIGlmICghcGFyZW50Ll9fc2xpZGVNb3ZlSGFuZGxlZCkge1xuICAgICAgICBwYXJlbnQuX19zbGlkZU1vdmVIYW5kbGVkID0gdHJ1ZTtcbiAgICAgICAgaWYgKHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHBhcmVudCkucG9zaXRpb24gPT09ICdzdGF0aWMnKSB7XG4gICAgICAgICAgcGFyZW50LnN0eWxlLnBvc2l0aW9uID0gJ3JlbGF0aXZlJztcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB2YXIgb3JpZ1N0eWxlID0gb2xkRWxlbWVudC5nZXRBdHRyaWJ1dGUoJ3N0eWxlJyk7XG4gICAgICB2YXIgc3R5bGUgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShvbGRFbGVtZW50KTtcbiAgICAgIHZhciBtYXJnaW5PZmZzZXRMZWZ0ID0gLXBhcnNlSW50KHN0eWxlLm1hcmdpbkxlZnQpO1xuICAgICAgdmFyIG1hcmdpbk9mZnNldFRvcCA9IC1wYXJzZUludChzdHlsZS5tYXJnaW5Ub3ApO1xuICAgICAgdmFyIG9sZExlZnQgPSBvbGRFbGVtZW50Lm9mZnNldExlZnQ7XG4gICAgICB2YXIgb2xkVG9wID0gb2xkRWxlbWVudC5vZmZzZXRUb3A7XG5cbiAgICAgIHBsYWNlaG9sZGVyRWxlbWVudCA9IGZyYWdtZW50cy5tYWtlRWxlbWVudEFuaW1hdGFibGUob2xkRWxlbWVudC5jbG9uZU5vZGUodHJ1ZSkpO1xuICAgICAgcGxhY2Vob2xkZXJFbGVtZW50LnN0eWxlLndpZHRoID0gb2xkRWxlbWVudC5zdHlsZS53aWR0aCA9IHN0eWxlLndpZHRoO1xuICAgICAgcGxhY2Vob2xkZXJFbGVtZW50LnN0eWxlLmhlaWdodCA9IG9sZEVsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gc3R5bGUuaGVpZ2h0O1xuICAgICAgcGxhY2Vob2xkZXJFbGVtZW50LnN0eWxlLm9wYWNpdHkgPSAnMCc7XG5cbiAgICAgIG9sZEVsZW1lbnQuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuICAgICAgb2xkRWxlbWVudC5zdHlsZS56SW5kZXggPSAxMDAwO1xuICAgICAgcGFyZW50Lmluc2VydEJlZm9yZShwbGFjZWhvbGRlckVsZW1lbnQsIG9sZEVsZW1lbnQpO1xuICAgICAgbmV3RWxlbWVudC5zdHlsZS5vcGFjaXR5ID0gJzAnO1xuXG4gICAgICBvbGRFbGVtZW50LmFuaW1hdGUoW1xuICAgICAgICB7IHRvcDogb2xkVG9wICsgbWFyZ2luT2Zmc2V0VG9wICsgJ3B4JywgbGVmdDogb2xkTGVmdCArIG1hcmdpbk9mZnNldExlZnQgKyAncHgnIH0sXG4gICAgICAgIHsgdG9wOiBuZXdFbGVtZW50Lm9mZnNldFRvcCArIG1hcmdpbk9mZnNldFRvcCArICdweCcsIGxlZnQ6IG5ld0VsZW1lbnQub2Zmc2V0TGVmdCArIG1hcmdpbk9mZnNldExlZnQgKyAncHgnIH1cbiAgICAgIF0sIHRoaXMub3B0aW9ucykub25maW5pc2ggPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcGxhY2Vob2xkZXJFbGVtZW50LnJlbW92ZSgpO1xuICAgICAgICBvcmlnU3R5bGUgPyBvbGRFbGVtZW50LnNldEF0dHJpYnV0ZSgnc3R5bGUnLCBvcmlnU3R5bGUpIDogb2xkRWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUoJ3N0eWxlJyk7XG4gICAgICAgIG5ld0VsZW1lbnQuc3R5bGUub3BhY2l0eSA9ICcnO1xuICAgICAgfTtcblxuICAgICAgcmV0dXJuIHBsYWNlaG9sZGVyRWxlbWVudDtcbiAgICB9XG4gIH07XG59O1xuXG5mdW5jdGlvbiBrZXlWYWx1ZVBhaXIoa2V5LCB2YWx1ZSkge1xuICB2YXIgb2JqID0ge307XG4gIG9ialtrZXldID0gdmFsdWU7XG4gIHJldHVybiBvYmo7XG59XG4iLCIvKipcbiAqIFNsaWRlIGRvd24gYW5kIHVwXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICBpZiAoIW9wdGlvbnMpIG9wdGlvbnMgPSB7fTtcbiAgaWYgKCFvcHRpb25zLmR1cmF0aW9uKSBvcHRpb25zLmR1cmF0aW9uID0gMjUwO1xuICBpZiAoIW9wdGlvbnMuZWFzaW5nKSBvcHRpb25zLmVhc2luZyA9ICdlYXNlLWluLW91dCc7XG4gIGlmICghb3B0aW9ucy5wcm9wZXJ0eSkgb3B0aW9ucy5wcm9wZXJ0eSA9ICdoZWlnaHQnO1xuXG4gIHJldHVybiB7XG4gICAgb3B0aW9uczogb3B0aW9ucyxcblxuICAgIGFuaW1hdGVJbjogZnVuY3Rpb24oZWxlbWVudCwgZG9uZSkge1xuICAgICAgdmFyIHZhbHVlID0gZWxlbWVudC5nZXRDb21wdXRlZENTUyh0aGlzLm9wdGlvbnMucHJvcGVydHkpO1xuICAgICAgaWYgKCF2YWx1ZSB8fCB2YWx1ZSA9PT0gJzBweCcpIHtcbiAgICAgICAgcmV0dXJuIGRvbmUoKTtcbiAgICAgIH1cblxuICAgICAgZWxlbWVudC5zdHlsZS5vdmVyZmxvdyA9ICdoaWRkZW4nO1xuICAgICAgZWxlbWVudC5hbmltYXRlKFtcbiAgICAgICAga2V5VmFsdWVQYWlyKHRoaXMub3B0aW9ucy5wcm9wZXJ0eSwgJzBweCcpLFxuICAgICAgICBrZXlWYWx1ZVBhaXIodGhpcy5vcHRpb25zLnByb3BlcnR5LCB2YWx1ZSlcbiAgICAgIF0sIHRoaXMub3B0aW9ucykub25maW5pc2ggPSBmdW5jdGlvbigpIHtcbiAgICAgICAgZWxlbWVudC5zdHlsZS5vdmVyZmxvdyA9ICcnO1xuICAgICAgICBkb25lKCk7XG4gICAgICB9O1xuICAgIH0sXG5cbiAgICBhbmltYXRlT3V0OiBmdW5jdGlvbihlbGVtZW50LCBkb25lKSB7XG4gICAgICB2YXIgdmFsdWUgPSBlbGVtZW50LmdldENvbXB1dGVkQ1NTKHRoaXMub3B0aW9ucy5wcm9wZXJ0eSk7XG4gICAgICBpZiAoIXZhbHVlIHx8IHZhbHVlID09PSAnMHB4Jykge1xuICAgICAgICByZXR1cm4gZG9uZSgpO1xuICAgICAgfVxuXG4gICAgICBlbGVtZW50LnN0eWxlLm92ZXJmbG93ID0gJ2hpZGRlbic7XG4gICAgICBlbGVtZW50LmFuaW1hdGUoW1xuICAgICAgICBrZXlWYWx1ZVBhaXIodGhpcy5vcHRpb25zLnByb3BlcnR5LCB2YWx1ZSksXG4gICAgICAgIGtleVZhbHVlUGFpcih0aGlzLm9wdGlvbnMucHJvcGVydHksICcwcHgnKVxuICAgICAgXSwgdGhpcy5vcHRpb25zKS5vbmZpbmlzaCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBlbGVtZW50LnN0eWxlLm92ZXJmbG93ID0gJyc7XG4gICAgICAgIGRvbmUoKTtcbiAgICAgIH07XG4gICAgfVxuICB9O1xufTtcblxuZnVuY3Rpb24ga2V5VmFsdWVQYWlyKGtleSwgdmFsdWUpIHtcbiAgdmFyIG9iaiA9IHt9O1xuICBvYmpba2V5XSA9IHZhbHVlO1xuICByZXR1cm4gb2JqO1xufVxuIiwiLyoqXG4gKiBBIGJpbmRlciB0aGF0IHRvZ2dsZXMgYW4gYXR0cmlidXRlIG9uIG9yIG9mZiBpZiB0aGUgZXhwcmVzc2lvbiBpcyB0cnV0aHkgb3IgZmFsc2V5LiBVc2UgZm9yIGF0dHJpYnV0ZXMgd2l0aG91dFxuICogdmFsdWVzIHN1Y2ggYXMgYHNlbGVjdGVkYCwgYGRpc2FibGVkYCwgb3IgYHJlYWRvbmx5YC5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzcGVjaWZpY0F0dHJOYW1lKSB7XG4gIHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHZhciBhdHRyTmFtZSA9IHNwZWNpZmljQXR0ck5hbWUgfHwgdGhpcy5tYXRjaDtcbiAgICBpZiAoIXZhbHVlKSB7XG4gICAgICB0aGlzLmVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKGF0dHJOYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZShhdHRyTmFtZSwgJycpO1xuICAgIH1cbiAgfTtcbn07XG4iLCIvKipcbiAqIEEgYmluZGVyIHRoYXQgYXV0b21hdGljYWxseSBmb2N1c2VzIHRoZSBpbnB1dCB3aGVuIGl0IGlzIGRpc3BsYXllZCBvbiBzY3JlZW4uXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB7XG5cbiAgICBib3VuZDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZWxlbWVudCA9IHRoaXMuZWxlbWVudDtcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIGVsZW1lbnQuZm9jdXMoKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICB9O1xufTtcbiIsIi8qKlxuICogQXV0b21hdGljYWxseSBzZWxlY3RzIHRoZSBjb250ZW50cyBvZiBhbiBpbnB1dCB3aGVuIGl0IHJlY2VpdmVzIGZvY3VzLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4ge1xuXG4gICAgY3JlYXRlZDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZm9jdXNlZCwgbW91c2VFdmVudDtcblxuICAgICAgdGhpcy5lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBVc2UgbWF0Y2hlcyBzaW5jZSBkb2N1bWVudC5hY3RpdmVFbGVtZW50IGRvZXNuJ3Qgd29yayB3ZWxsIHdpdGggd2ViIGNvbXBvbmVudHMgKGZ1dHVyZSBjb21wYXQpXG4gICAgICAgIGZvY3VzZWQgPSB0aGlzLm1hdGNoZXMoJzpmb2N1cycpO1xuICAgICAgICBtb3VzZUV2ZW50ID0gdHJ1ZTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignZm9jdXMnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKCFtb3VzZUV2ZW50KSB7XG4gICAgICAgICAgdGhpcy5zZWxlY3QoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICghZm9jdXNlZCkge1xuICAgICAgICAgIHRoaXMuc2VsZWN0KCk7XG4gICAgICAgIH1cbiAgICAgICAgbW91c2VFdmVudCA9IGZhbHNlO1xuICAgICAgfSk7XG4gICAgfVxuXG4gIH07XG59O1xuIiwiLyoqXG4gKiBBIGJpbmRlciB0aGF0IGFkZHMgY2xhc3NlcyB0byBhbiBlbGVtZW50IGRlcGVuZGVudCBvbiB3aGV0aGVyIHRoZSBleHByZXNzaW9uIGlzIHRydWUgb3IgZmFsc2UuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSkge1xuICAgICAgdGhpcy5lbGVtZW50LmNsYXNzTGlzdC5hZGQodGhpcy5tYXRjaCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKHRoaXMubWF0Y2gpO1xuICAgIH1cbiAgfTtcbn07XG4iLCJ2YXIgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG5cbi8qKlxuICogQW4gZWxlbWVudCBiaW5kZXIgdGhhdCBiaW5kcyB0aGUgdGVtcGxhdGUgb24gdGhlIGRlZmluaXRpb24gdG8gZmlsbCB0aGUgY29udGVudHMgb2YgdGhlIGVsZW1lbnQgdGhhdCBtYXRjaGVzLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGRlZmluaXRpb24pIHtcbiAgdmFyIGRlZmluaXRpb25zID0gc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuXG4gIGlmICghZGVmaW5pdGlvbikge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ011c3QgcHJvdmlkZSBhIGRlZmluaXRpb24gb2JqZWN0IHRvIGRlZmluZSB0aGUgY3VzdG9tIGNvbXBvbmVudCcpO1xuICB9XG5cbiAgLy8gVGhlIGxhc3QgZGVmaW5pdGlvbiBpcyB0aGUgbW9zdCBpbXBvcnRhbnQsIGFueSBvdGhlcnMgYXJlIG1peGluc1xuICBkZWZpbml0aW9uID0gZGVmaW5pdGlvbnNbZGVmaW5pdGlvbnMubGVuZ3RoIC0gMV07XG5cbiAgcmV0dXJuIHtcblxuICAgIGNvbXBpbGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIGlmIChkZWZpbml0aW9uLnRlbXBsYXRlICYmICFkZWZpbml0aW9uLnRlbXBsYXRlLnBvb2wgJiYgIWRlZmluaXRpb24uX2NvbXBpbGluZykge1xuICAgICAgICAvLyBTZXQgdGhpcyBiZWZvcmUgY29tcGlsaW5nIHNvIHdlIGRvbid0IGdldCBpbnRvIGluZmluaXRlIGxvb3BzIGlmIHRoZXJlIGlzIHRlbXBsYXRlIHJlY3Vyc2lvblxuICAgICAgICBkZWZpbml0aW9uLl9jb21waWxpbmcgPSB0cnVlO1xuICAgICAgICBkZWZpbml0aW9uLnRlbXBsYXRlID0gdGhpcy5mcmFnbWVudHMuY3JlYXRlVGVtcGxhdGUoZGVmaW5pdGlvbi50ZW1wbGF0ZSk7XG4gICAgICAgIGRlbGV0ZSBkZWZpbml0aW9uLl9jb21waWxpbmc7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLmVsZW1lbnQuY2hpbGROb2Rlcy5sZW5ndGgpIHtcbiAgICAgICAgLy8gVXNlIHRoZSBjb250ZW50cyBvZiB0aGlzIGNvbXBvbmVudCB0byBiZSBpbnNlcnRlZCB3aXRoaW4gaXRcbiAgICAgICAgdGhpcy5jb250ZW50VGVtcGxhdGUgPSB0aGlzLmZyYWdtZW50cy5jcmVhdGVUZW1wbGF0ZSh0aGlzLmVsZW1lbnQuY2hpbGROb2Rlcyk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIGNyZWF0ZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHRoaXMuY29udGVudFRlbXBsYXRlKSB7XG4gICAgICAgIHRoaXMuY29udGVudCA9IHRoaXMuY29udGVudFRlbXBsYXRlLmNyZWF0ZVZpZXcoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGRlZmluaXRpb24udGVtcGxhdGUpIHtcbiAgICAgICAgdGhpcy52aWV3ID0gZGVmaW5pdGlvbi50ZW1wbGF0ZS5jcmVhdGVWaWV3KCk7XG4gICAgICAgIHRoaXMuZWxlbWVudC5hcHBlbmRDaGlsZCh0aGlzLnZpZXcpO1xuICAgICAgICBpZiAodGhpcy5jb250ZW50KSB7XG4gICAgICAgICAgdGhpcy5fY29tcG9uZW50Q29udGVudCA9IHRoaXMuY29udGVudDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh0aGlzLmNvbnRlbnQpIHtcbiAgICAgICAgdGhpcy5lbGVtZW50LmFwcGVuZENoaWxkKHRoaXMuY29udGVudCk7XG4gICAgICB9XG5cbiAgICAgIGRlZmluaXRpb25zLmZvckVhY2goZnVuY3Rpb24oZGVmaW5pdGlvbikge1xuICAgICAgICBPYmplY3Qua2V5cyhkZWZpbml0aW9uKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgIHRoaXMuZWxlbWVudFtrZXldID0gZGVmaW5pdGlvbltrZXldO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICAgIH0sIHRoaXMpO1xuXG4gICAgICAvLyBEb24ndCBjYWxsIGNyZWF0ZWQgdW50aWwgYWZ0ZXIgYWxsIGRlZmluaXRpb25zIGhhdmUgYmVlbiBjb3BpZWQgb3ZlclxuICAgICAgZGVmaW5pdGlvbnMuZm9yRWFjaChmdW5jdGlvbihkZWZpbml0aW9uKSB7XG4gICAgICAgIGlmICh0eXBlb2YgZGVmaW5pdGlvbi5jcmVhdGVkID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgZGVmaW5pdGlvbi5jcmVhdGVkLmNhbGwodGhpcy5lbGVtZW50KTtcbiAgICAgICAgfVxuICAgICAgfSwgdGhpcyk7XG4gICAgfSxcblxuICAgIGJvdW5kOiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh0aGlzLnZpZXcpIHRoaXMudmlldy5iaW5kKHRoaXMuZWxlbWVudCk7XG4gICAgICBpZiAodGhpcy5jb250ZW50KSB0aGlzLmNvbnRlbnQuYmluZCh0aGlzLmNvbnRleHQpO1xuXG4gICAgICBkZWZpbml0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uKGRlZmluaXRpb24pIHtcbiAgICAgICAgaWYgKHR5cGVvZiBkZWZpbml0aW9uLmF0dGFjaGVkID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgZGVmaW5pdGlvbi5hdHRhY2hlZC5jYWxsKHRoaXMuZWxlbWVudCk7XG4gICAgICAgICAgdGhpcy5mcmFnbWVudHMuc3luYygpO1xuICAgICAgICB9XG4gICAgICB9LCB0aGlzKTtcbiAgICB9LFxuXG4gICAgdW5ib3VuZDogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAodGhpcy5jb250ZW50KSB0aGlzLmNvbnRlbnQudW5iaW5kKCk7XG4gICAgICBpZiAodGhpcy52aWV3KSB0aGlzLnZpZXcudW5iaW5kKCk7XG5cbiAgICAgIGRlZmluaXRpb25zLmZvckVhY2goZnVuY3Rpb24oZGVmaW5pdGlvbikge1xuICAgICAgICBpZiAodHlwZW9mIGRlZmluaXRpb24uZGV0YWNoZWQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBkZWZpbml0aW9uLmRldGFjaGVkLmNhbGwodGhpcy5lbGVtZW50KTtcbiAgICAgICAgfVxuICAgICAgfSwgdGhpcyk7XG4gICAgfVxuICB9O1xufTtcbiIsIi8qKlxuICogQSBiaW5kZXIgZm9yIGFkZGluZyBldmVudCBsaXN0ZW5lcnMuIFdoZW4gdGhlIGV2ZW50IGlzIHRyaWdnZXJlZCB0aGUgZXhwcmVzc2lvbiB3aWxsIGJlIGV4ZWN1dGVkLiBUaGUgcHJvcGVydGllc1xuICogYGV2ZW50YCAodGhlIGV2ZW50IG9iamVjdCkgYW5kIGBlbGVtZW50YCAodGhlIGVsZW1lbnQgdGhlIGJpbmRlciBpcyBvbikgd2lsbCBiZSBhdmFpbGFibGUgdG8gdGhlIGV4cHJlc3Npb24uXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc3BlY2lmaWNFdmVudE5hbWUpIHtcbiAgcmV0dXJuIHtcbiAgICBjcmVhdGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBldmVudE5hbWUgPSBzcGVjaWZpY0V2ZW50TmFtZSB8fCB0aGlzLm1hdGNoO1xuICAgICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICAgdGhpcy5lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICBpZiAoX3RoaXMuc2hvdWxkU2tpcChldmVudCkpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgdGhlIGV2ZW50IG9uIHRoZSBjb250ZXh0IHNvIGl0IG1heSBiZSB1c2VkIGluIHRoZSBleHByZXNzaW9uIHdoZW4gdGhlIGV2ZW50IGlzIHRyaWdnZXJlZC5cbiAgICAgICAgdmFyIHByaW9yRXZlbnQgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKF90aGlzLmNvbnRleHQsICdldmVudCcpO1xuICAgICAgICB2YXIgcHJpb3JFbGVtZW50ID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihfdGhpcy5jb250ZXh0LCAnZWxlbWVudCcpO1xuICAgICAgICBfdGhpcy5zZXRFdmVudChldmVudCwgcHJpb3JFdmVudCwgcHJpb3JFbGVtZW50KTtcblxuICAgICAgICAvLyBMZXQgYW4gZXZlbnQgYmluZGVyIG1ha2UgdGhlIGZ1bmN0aW9uIGNhbGwgd2l0aCBpdHMgb3duIGFyZ3VtZW50c1xuICAgICAgICBfdGhpcy5vYnNlcnZlci5nZXQoKTtcblxuICAgICAgICAvLyBSZXNldCB0aGUgY29udGV4dCB0byBpdHMgcHJpb3Igc3RhdGVcbiAgICAgICAgX3RoaXMuY2xlYXJFdmVudCgpO1xuICAgICAgfSk7XG4gICAgfSxcblxuICAgIHNob3VsZFNraXA6IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICByZXR1cm4gIXRoaXMuY29udGV4dCB8fCBldmVudC5jdXJyZW50VGFyZ2V0Lmhhc0F0dHJpYnV0ZSgnZGlzYWJsZWQnKTtcbiAgICB9LFxuXG4gICAgdW5ib3VuZDogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmNsZWFyRXZlbnQoKTtcbiAgICB9LFxuXG4gICAgc2V0RXZlbnQ6IGZ1bmN0aW9uKGV2ZW50LCBwcmlvckV2ZW50RGVzY3JpcHRvciwgcHJpb3JFbGVtZW50RGVzY3JpcHRvcikge1xuICAgICAgaWYgKCF0aGlzLmNvbnRleHQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGhpcy5ldmVudCA9IGV2ZW50O1xuICAgICAgdGhpcy5wcmlvckV2ZW50RGVzY3JpcHRvciA9IHByaW9yRXZlbnREZXNjcmlwdG9yO1xuICAgICAgdGhpcy5wcmlvckVsZW1lbnREZXNjcmlwdG9yID0gcHJpb3JFbGVtZW50RGVzY3JpcHRvcjtcbiAgICAgIHRoaXMubGFzdENvbnRleHQgPSB0aGlzLmNvbnRleHQ7XG5cbiAgICAgIHRoaXMuY29udGV4dC5ldmVudCA9IGV2ZW50O1xuICAgICAgdGhpcy5jb250ZXh0LmVsZW1lbnQgPSB0aGlzLmVsZW1lbnQ7XG4gICAgfSxcblxuICAgIGNsZWFyRXZlbnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCF0aGlzLmV2ZW50KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciBjb250ZXh0ID0gdGhpcy5sYXN0Q29udGV4dDtcblxuICAgICAgaWYgKHRoaXMucHJpb3JFdmVudERlc2NyaXB0b3IpIHtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGNvbnRleHQsICdldmVudCcsIHRoaXMucHJpb3JFdmVudERlc2NyaXB0b3IpO1xuICAgICAgICB0aGlzLnByaW9yRXZlbnREZXNjcmlwdG9yID0gbnVsbDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRlbGV0ZSBjb250ZXh0LmV2ZW50O1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5wcmlvckVsZW1lbnREZXNjcmlwdG9yKSB7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShjb250ZXh0LCAnZWxlbWVudCcsIHRoaXMucHJpb3JFbGVtZW50RGVzY3JpcHRvcik7XG4gICAgICAgIHRoaXMucHJpb3JFbGVtZW50RGVzY3JpcHRvciA9IG51bGw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZWxldGUgY29udGV4dC5lbGVtZW50O1xuICAgICAgfVxuXG4gICAgICB0aGlzLmV2ZW50ID0gbnVsbDtcbiAgICAgIHRoaXMubGFzdENvbnRleHQgPSBudWxsO1xuICAgIH1cbiAgfTtcbn07XG4iLCIvKipcbiAqIEEgYmluZGVyIHRoYXQgZGlzcGxheXMgdW5lc2NhcGVkIEhUTUwgaW5zaWRlIGFuIGVsZW1lbnQuIEJlIHN1cmUgaXQncyB0cnVzdGVkISBUaGlzIHNob3VsZCBiZSB1c2VkIHdpdGggZm9ybWF0dGVyc1xuICogd2hpY2ggY3JlYXRlIEhUTUwgZnJvbSBzb21ldGhpbmcgc2FmZS5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgdGhpcy5lbGVtZW50LmlubmVySFRNTCA9ICh2YWx1ZSA9PSBudWxsID8gJycgOiB2YWx1ZSk7XG4gIH07XG59O1xuIiwiLyoqXG4gKiBpZiwgdW5sZXNzLCBlbHNlLWlmLCBlbHNlLXVubGVzcywgZWxzZVxuICogQSBiaW5kZXIgaW5pdCBmdW5jdGlvbiB0aGF0IGNyZWF0ZXMgYSBiaW5kZXIgdGhhdCBzaG93cyBvciBoaWRlcyB0aGUgZWxlbWVudCBpZiB0aGUgdmFsdWUgaXMgdHJ1dGh5IG9yIGZhbHNleS5cbiAqIEFjdHVhbGx5IHJlbW92ZXMgdGhlIGVsZW1lbnQgZnJvbSB0aGUgRE9NIHdoZW4gaGlkZGVuLCByZXBsYWNpbmcgaXQgd2l0aCBhIG5vbi12aXNpYmxlIHBsYWNlaG9sZGVyIGFuZCBub3QgbmVlZGxlc3NseVxuICogZXhlY3V0aW5nIGJpbmRpbmdzIGluc2lkZS4gUGFzcyBpbiB0aGUgY29uZmlndXJhdGlvbiB2YWx1ZXMgZm9yIHRoZSBjb3JyZXNwb25kaW5nIHBhcnRuZXIgYXR0cmlidXRlcyBmb3IgdW5sZXNzIGFuZFxuICogZWxzZSwgZXRjLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGVsc2VJZkF0dHJOYW1lLCBlbHNlQXR0ck5hbWUsIHVubGVzc0F0dHJOYW1lLCBlbHNlVW5sZXNzQXR0ck5hbWUpIHtcbiAgcmV0dXJuIHtcbiAgICBhbmltYXRlZDogdHJ1ZSxcbiAgICBwcmlvcml0eTogMTUwLFxuXG4gICAgY29tcGlsZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGVsZW1lbnQgPSB0aGlzLmVsZW1lbnQ7XG4gICAgICB2YXIgZXhwcmVzc2lvbnMgPSBbIHdyYXBJZkV4cCh0aGlzLmV4cHJlc3Npb24sIHRoaXMubmFtZSA9PT0gdW5sZXNzQXR0ck5hbWUpIF07XG4gICAgICB2YXIgcGxhY2Vob2xkZXIgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgICB2YXIgbm9kZSA9IGVsZW1lbnQubmV4dEVsZW1lbnRTaWJsaW5nO1xuICAgICAgdGhpcy5lbGVtZW50ID0gcGxhY2Vob2xkZXI7XG4gICAgICBlbGVtZW50LnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKHBsYWNlaG9sZGVyLCBlbGVtZW50KTtcblxuICAgICAgLy8gU3RvcmVzIGEgdGVtcGxhdGUgZm9yIGFsbCB0aGUgZWxlbWVudHMgdGhhdCBjYW4gZ28gaW50byB0aGlzIHNwb3RcbiAgICAgIHRoaXMudGVtcGxhdGVzID0gWyB0aGlzLmZyYWdtZW50cy5jcmVhdGVUZW1wbGF0ZShlbGVtZW50KSBdO1xuXG4gICAgICAvLyBQdWxsIG91dCBhbnkgb3RoZXIgZWxlbWVudHMgdGhhdCBhcmUgY2hhaW5lZCB3aXRoIHRoaXMgb25lXG4gICAgICB3aGlsZSAobm9kZSkge1xuICAgICAgICB2YXIgbmV4dCA9IG5vZGUubmV4dEVsZW1lbnRTaWJsaW5nO1xuICAgICAgICB2YXIgZXhwcmVzc2lvbjtcbiAgICAgICAgaWYgKG5vZGUuaGFzQXR0cmlidXRlKGVsc2VJZkF0dHJOYW1lKSkge1xuICAgICAgICAgIGV4cHJlc3Npb24gPSB0aGlzLmZyYWdtZW50cy5jb2RpZnlFeHByZXNzaW9uKCdhdHRyaWJ1dGUnLCBub2RlLmdldEF0dHJpYnV0ZShlbHNlSWZBdHRyTmFtZSkpO1xuICAgICAgICAgIGV4cHJlc3Npb25zLnB1c2god3JhcElmRXhwKGV4cHJlc3Npb24sIGZhbHNlKSk7XG4gICAgICAgICAgbm9kZS5yZW1vdmVBdHRyaWJ1dGUoZWxzZUlmQXR0ck5hbWUpO1xuICAgICAgICB9IGVsc2UgaWYgKG5vZGUuaGFzQXR0cmlidXRlKGVsc2VVbmxlc3NBdHRyTmFtZSkpIHtcbiAgICAgICAgICBleHByZXNzaW9uID0gdGhpcy5mcmFnbWVudHMuY29kaWZ5RXhwcmVzc2lvbignYXR0cmlidXRlJywgbm9kZS5nZXRBdHRyaWJ1dGUoZWxzZVVubGVzc0F0dHJOYW1lKSk7XG4gICAgICAgICAgZXhwcmVzc2lvbnMucHVzaCh3cmFwSWZFeHAoZXhwcmVzc2lvbiwgdHJ1ZSkpO1xuICAgICAgICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKGVsc2VVbmxlc3NBdHRyTmFtZSk7XG4gICAgICAgIH0gZWxzZSBpZiAobm9kZS5oYXNBdHRyaWJ1dGUoZWxzZUF0dHJOYW1lKSkge1xuICAgICAgICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKGVsc2VBdHRyTmFtZSk7XG4gICAgICAgICAgbmV4dCA9IG51bGw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBub2RlLnJlbW92ZSgpO1xuICAgICAgICB0aGlzLnRlbXBsYXRlcy5wdXNoKHRoaXMuZnJhZ21lbnRzLmNyZWF0ZVRlbXBsYXRlKG5vZGUpKTtcbiAgICAgICAgbm9kZSA9IG5leHQ7XG4gICAgICB9XG5cbiAgICAgIC8vIEFuIGV4cHJlc3Npb24gdGhhdCB3aWxsIHJldHVybiBhbiBpbmRleC4gU29tZXRoaW5nIGxpa2UgdGhpcyBgZXhwciA/IDAgOiBleHByMiA/IDEgOiBleHByMyA/IDIgOiAzYC4gVGhpcyB3aWxsXG4gICAgICAvLyBiZSB1c2VkIHRvIGtub3cgd2hpY2ggc2VjdGlvbiB0byBzaG93IGluIHRoZSBpZi9lbHNlLWlmL2Vsc2UgZ3JvdXBpbmcuXG4gICAgICB0aGlzLmV4cHJlc3Npb24gPSBleHByZXNzaW9ucy5tYXAoZnVuY3Rpb24oZXhwciwgaW5kZXgpIHtcbiAgICAgICAgcmV0dXJuIGV4cHIgKyAnID8gJyArIGluZGV4ICsgJyA6ICc7XG4gICAgICB9KS5qb2luKCcnKSArIGV4cHJlc3Npb25zLmxlbmd0aDtcbiAgICB9LFxuXG4gICAgdXBkYXRlZDogZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgIC8vIEZvciBwZXJmb3JtYW5jZSBwcm92aWRlIGFuIGFsdGVybmF0ZSBjb2RlIHBhdGggZm9yIGFuaW1hdGlvblxuICAgICAgaWYgKHRoaXMuYW5pbWF0ZSAmJiB0aGlzLmNvbnRleHQgJiYgIXRoaXMuZmlyc3RVcGRhdGUpIHtcbiAgICAgICAgdGhpcy51cGRhdGVkQW5pbWF0ZWQoaW5kZXgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy51cGRhdGVkUmVndWxhcihpbmRleCk7XG4gICAgICB9XG4gICAgICB0aGlzLmZpcnN0VXBkYXRlID0gZmFsc2U7XG4gICAgfSxcblxuICAgIGFkZDogZnVuY3Rpb24odmlldykge1xuICAgICAgdGhpcy5lbGVtZW50LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHZpZXcsIHRoaXMuZWxlbWVudC5uZXh0U2libGluZyk7XG4gICAgfSxcblxuICAgIC8vIERvZXNuJ3QgZG8gbXVjaCwgYnV0IGFsbG93cyBzdWItY2xhc3NlcyB0byBhbHRlciB0aGUgZnVuY3Rpb25hbGl0eS5cbiAgICByZW1vdmU6IGZ1bmN0aW9uKHZpZXcpIHtcbiAgICAgIHZpZXcuZGlzcG9zZSgpO1xuICAgIH0sXG5cbiAgICB1cGRhdGVkUmVndWxhcjogZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgIGlmICh0aGlzLnNob3dpbmcpIHtcbiAgICAgICAgdGhpcy5yZW1vdmUodGhpcy5zaG93aW5nKTtcbiAgICAgICAgdGhpcy5zaG93aW5nID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIHZhciB0ZW1wbGF0ZSA9IHRoaXMudGVtcGxhdGVzW2luZGV4XTtcbiAgICAgIGlmICh0ZW1wbGF0ZSkge1xuICAgICAgICB0aGlzLnNob3dpbmcgPSB0ZW1wbGF0ZS5jcmVhdGVWaWV3KCk7XG4gICAgICAgIHRoaXMuc2hvd2luZy5iaW5kKHRoaXMuY29udGV4dCk7XG4gICAgICAgIHRoaXMuYWRkKHRoaXMuc2hvd2luZyk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIHVwZGF0ZWRBbmltYXRlZDogZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgIHRoaXMubGFzdFZhbHVlID0gaW5kZXg7XG4gICAgICBpZiAodGhpcy5hbmltYXRpbmcpIHtcbiAgICAgICAgLy8gT2Jzb2xldGVkLCB3aWxsIGNoYW5nZSBhZnRlciBhbmltYXRpb24gaXMgZmluaXNoZWQuXG4gICAgICAgIHRoaXMuc2hvd2luZy51bmJpbmQoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5zaG93aW5nKSB7XG4gICAgICAgIHRoaXMuYW5pbWF0aW5nID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5zaG93aW5nLnVuYmluZCgpO1xuICAgICAgICB0aGlzLmFuaW1hdGVPdXQodGhpcy5zaG93aW5nLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICB0aGlzLmFuaW1hdGluZyA9IGZhbHNlO1xuXG4gICAgICAgICAgaWYgKHRoaXMuc2hvd2luZykge1xuICAgICAgICAgICAgLy8gTWFrZSBzdXJlIHRoaXMgd2Fzbid0IHVuYm91bmQgd2hpbGUgd2Ugd2VyZSBhbmltYXRpbmcgKGUuZy4gYnkgYSBwYXJlbnQgYGlmYCB0aGF0IGRvZXNuJ3QgYW5pbWF0ZSlcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlKHRoaXMuc2hvd2luZyk7XG4gICAgICAgICAgICB0aGlzLnNob3dpbmcgPSBudWxsO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICh0aGlzLmNvbnRleHQpIHtcbiAgICAgICAgICAgIC8vIGZpbmlzaCBieSBhbmltYXRpbmcgdGhlIG5ldyBlbGVtZW50IGluIChpZiBhbnkpLCB1bmxlc3Mgbm8gbG9uZ2VyIGJvdW5kXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZWRBbmltYXRlZCh0aGlzLmxhc3RWYWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgdGVtcGxhdGUgPSB0aGlzLnRlbXBsYXRlc1tpbmRleF07XG4gICAgICBpZiAodGVtcGxhdGUpIHtcbiAgICAgICAgdGhpcy5zaG93aW5nID0gdGVtcGxhdGUuY3JlYXRlVmlldygpO1xuICAgICAgICB0aGlzLnNob3dpbmcuYmluZCh0aGlzLmNvbnRleHQpO1xuICAgICAgICB0aGlzLmFkZCh0aGlzLnNob3dpbmcpO1xuICAgICAgICB0aGlzLmFuaW1hdGluZyA9IHRydWU7XG4gICAgICAgIHRoaXMuYW5pbWF0ZUluKHRoaXMuc2hvd2luZywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdGhpcy5hbmltYXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAvLyBpZiB0aGUgdmFsdWUgY2hhbmdlZCB3aGlsZSB0aGlzIHdhcyBhbmltYXRpbmcgcnVuIGl0IGFnYWluXG4gICAgICAgICAgaWYgKHRoaXMubGFzdFZhbHVlICE9PSBpbmRleCkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVkQW5pbWF0ZWQodGhpcy5sYXN0VmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIGJvdW5kOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuZmlyc3RVcGRhdGUgPSB0cnVlO1xuICAgIH0sXG5cbiAgICB1bmJvdW5kOiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh0aGlzLnNob3dpbmcpIHtcbiAgICAgICAgdGhpcy5zaG93aW5nLnVuYmluZCgpO1xuICAgICAgfVxuICAgICAgdGhpcy5sYXN0VmFsdWUgPSBudWxsO1xuICAgICAgdGhpcy5hbmltYXRpbmcgPSBmYWxzZTtcbiAgICB9XG4gIH07XG59O1xuXG5mdW5jdGlvbiB3cmFwSWZFeHAoZXhwciwgaXNVbmxlc3MpIHtcbiAgaWYgKGlzVW5sZXNzKSB7XG4gICAgcmV0dXJuICchKCcgKyBleHByICsgJyknO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBleHByO1xuICB9XG59XG4iLCJ2YXIga2V5cyA9IHtcbiAgYmFja3NwYWNlOiA4LFxuICB0YWI6IDksXG4gIGVudGVyOiAxMyxcbiAgcmV0dXJuOiAxMyxcbiAgZXNjOiAyNyxcbiAgZXNjYXBlOiAyNyxcbiAgc3BhY2U6IDMyLFxuICBsZWZ0OiAzNyxcbiAgdXA6IDM4LFxuICByaWdodDogMzksXG4gIGRvd246IDQwLFxuICBkZWw6IDQ2LFxuICBkZWxldGU6IDQ2XG59O1xuXG4vKipcbiAqIEFkZHMgYSBiaW5kZXIgd2hpY2ggaXMgdHJpZ2dlcmVkIHdoZW4gYSBrZXlib2FyZCBldmVudCdzIGBrZXlDb2RlYCBwcm9wZXJ0eSBtYXRjaGVzIGZvciB0aGUgYWJvdmUgbGlzdCBvZiBrZXlzLiBJZlxuICogbW9yZSByb2J1c3Qgc2hvcnRjdXRzIGFyZSByZXF1aXJlZCB1c2UgdGhlIHNob3J0Y3V0IGJpbmRlci5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzcGVjaWZpY0tleU5hbWUsIHNwZWNpZmljRXZlbnROYW1lKSB7XG4gIHZhciBldmVudEJpbmRlciA9IHJlcXVpcmUoJy4vZXZlbnRzJykoc3BlY2lmaWNFdmVudE5hbWUpO1xuXG4gIHJldHVybiB7XG4gICAgY29tcGlsZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gU3BsaXQgb24gbm9uLWNoYXIgKGUuZy4ga2V5ZG93bjo6ZW50ZXIgb3Iga2V5dXAuZXNjIHRvIGhhbmRsZSB2YXJpb3VzIHN0eWxlcylcbiAgICAgIHZhciBwYXJ0cyA9IChzcGVjaWZpY0tleU5hbWUgfHwgdGhpcy5tYXRjaCkuc3BsaXQoL1teYS16XSsvKTtcbiAgICAgIGlmICh0aGlzLmVsZW1lbnQuaGFzT3duUHJvcGVydHkoJ29uJyArIHBhcnRzWzBdKSkge1xuICAgICAgICB0aGlzLm1hdGNoID0gcGFydHMuc2hpZnQoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubWF0Y2ggPSAna2V5ZG93bic7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuY3RybEtleSA9IHBhcnRzWzBdID09PSAnY3RybCc7XG5cbiAgICAgIGlmICh0aGlzLmN0cmxLZXkpIHtcbiAgICAgICAgdGhpcy5rZXlDb2RlID0ga2V5c1twYXJ0c1sxXV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmtleUNvZGUgPSBrZXlzW3BhcnRzWzBdXTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgc2hvdWxkU2tpcDogZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgIGlmICh0aGlzLmtleUNvZGUpIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50QmluZGVyLnNob3VsZFNraXAuY2FsbCh0aGlzLCBldmVudCkgfHxcbiAgICAgICAgICB0aGlzLmN0cmxLZXkgIT09IChldmVudC5jdHJsS2V5IHx8IGV2ZW50Lm1ldGFLZXkpIHx8XG4gICAgICAgICAgdGhpcy5rZXlDb2RlICE9PSBldmVudC5rZXlDb2RlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50QmluZGVyLnNob3VsZFNraXAuY2FsbCh0aGlzLCBldmVudCk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIGNyZWF0ZWQ6IGV2ZW50QmluZGVyLmNyZWF0ZWQsXG4gICAgdW5ib3VuZDogZXZlbnRCaW5kZXIudW5ib3VuZCxcbiAgICBzZXRFdmVudDogZXZlbnRCaW5kZXIuc2V0RXZlbnQsXG4gICAgY2xlYXJFdmVudDogZXZlbnRCaW5kZXIuY2xlYXJFdmVudFxuICB9O1xufTtcbiIsIi8qKlxuICogQSBiaW5kZXIgdGhhdCBwcmludHMgb3V0IHRoZSB2YWx1ZSBvZiB0aGUgZXhwcmVzc2lvbiB0byB0aGUgY29uc29sZS5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHtcbiAgICBwcmlvcml0eTogNjAsXG4gICAgY3JlYXRlZDogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAodGhpcy5vYnNlcnZlcikge1xuICAgICAgICB0aGlzLm9ic2VydmVyLmdldENoYW5nZVJlY29yZHMgPSB0cnVlO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICB1cGRhdGVkOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgLyplc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG4gICAgICBjb25zb2xlLmxvZygnJWNEZWJ1ZzogJWMnICsgdGhpcy5leHByZXNzaW9uLCAnY29sb3I6Ymx1ZTtmb250LXdlaWdodDpib2xkJywgJ2NvbG9yOiNERjgxMzgnLCAnPScsIHZhbHVlKTtcbiAgICAgIC8qZXNsaW50LWVuYWJsZSAqL1xuICAgIH1cbiAgfTtcbn07XG4iLCIvKipcbiAqIEEgYmluZGVyIHRoYXQgc2V0cyB0aGUgcHJvcGVydHkgb2YgYW4gZWxlbWVudCB0byB0aGUgdmFsdWUgb2YgdGhlIGV4cHJlc3Npb24gaW4gYSAyLXdheSBiaW5kaW5nLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHNwZWNpZmljUHJvcGVydHlOYW1lKSB7XG4gIHJldHVybiB7XG4gICAgcHJpb3JpdHk6IDEwLFxuXG4gICAgY3JlYXRlZDogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLnR3b1dheU9ic2VydmVyID0gdGhpcy5vYnNlcnZlKHNwZWNpZmljUHJvcGVydHlOYW1lIHx8IHRoaXMuY2FtZWxDYXNlLCB0aGlzLnNlbmRVcGRhdGUsIHRoaXMpO1xuICAgIH0sXG5cbiAgICAvLyBCaW5kIHRoaXMgdG8gdGhlIGdpdmVuIGNvbnRleHQgb2JqZWN0XG4gICAgYm91bmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy50d29XYXlPYnNlcnZlci5iaW5kKHRoaXMuZWxlbWVudCk7XG4gICAgfSxcblxuICAgIHVuYm91bmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy50d29XYXlPYnNlcnZlci51bmJpbmQoKTtcbiAgICB9LFxuXG4gICAgc2VuZFVwZGF0ZTogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGlmICghdGhpcy5za2lwU2VuZCkge1xuICAgICAgICB0aGlzLm9ic2VydmVyLnNldCh2YWx1ZSk7XG4gICAgICAgIHRoaXMuc2tpcFNlbmQgPSB0cnVlO1xuICAgICAgICB0aGlzLmZyYWdtZW50cy5hZnRlclN5bmMoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdGhpcy5za2lwU2VuZCA9IGZhbHNlO1xuICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICB1cGRhdGVkOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgaWYgKCF0aGlzLnNraXBTZW5kICYmIHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5lbGVtZW50W3NwZWNpZmljUHJvcGVydHlOYW1lIHx8IHRoaXMuY2FtZWxDYXNlXSA9IHZhbHVlO1xuICAgICAgICB0aGlzLnNraXBTZW5kID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5mcmFnbWVudHMuYWZ0ZXJTeW5jKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHRoaXMuc2tpcFNlbmQgPSBmYWxzZTtcbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG59O1xuIiwiLyoqXG4gKiBBIGJpbmRlciB0aGF0IHNldHMgdGhlIHByb3BlcnR5IG9mIGFuIGVsZW1lbnQgdG8gdGhlIHZhbHVlIG9mIHRoZSBleHByZXNzaW9uLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHNwZWNpZmljUHJvcGVydHlOYW1lKSB7XG4gIHJldHVybiB7XG4gICAgcHJpb3JpdHk6IDEwLFxuXG4gICAgdXBkYXRlZDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHRoaXMuZWxlbWVudFtzcGVjaWZpY1Byb3BlcnR5TmFtZSB8fCB0aGlzLmNhbWVsQ2FzZV0gPSB2YWx1ZTtcbiAgICB9XG4gIH07XG59O1xuIiwiLyoqXG4gKiBBIGJpbmRlciB0aGF0IHNldHMgYSByZWZlcmVuY2UgdG8gdGhlIGVsZW1lbnQgd2hlbiBpdCBpcyBib3VuZC5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB7XG4gICAgYm91bmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5jb250ZXh0W3RoaXMubWF0Y2ggfHwgdGhpcy5leHByZXNzaW9uXSA9IHRoaXMuZWxlbWVudDtcbiAgICB9LFxuXG4gICAgdW5ib3VuZDogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmNvbnRleHRbdGhpcy5tYXRjaCB8fCB0aGlzLmV4cHJlc3Npb25dID0gbnVsbDtcbiAgICB9XG4gIH07XG59O1xuIiwidmFyIGRpZmYgPSByZXF1aXJlKCdkaWZmZXJlbmNlcy1qcycpO1xuXG4vKipcbiAqIEEgYmluZGVyIHRoYXQgZHVwbGljYXRlIGFuIGVsZW1lbnQgZm9yIGVhY2ggaXRlbSBpbiBhbiBhcnJheS4gVGhlIGV4cHJlc3Npb24gbWF5IGJlIG9mIHRoZSBmb3JtYXQgYGVweHJgIG9yXG4gKiBgaXRlbU5hbWUgaW4gZXhwcmAgd2hlcmUgYGl0ZW1OYW1lYCBpcyB0aGUgbmFtZSBlYWNoIGl0ZW0gaW5zaWRlIHRoZSBhcnJheSB3aWxsIGJlIHJlZmVyZW5jZWQgYnkgd2l0aGluIGJpbmRpbmdzXG4gKiBpbnNpZGUgdGhlIGVsZW1lbnQuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB7XG4gICAgYW5pbWF0ZWQ6IHRydWUsXG4gICAgcHJpb3JpdHk6IDEwMCxcblxuICAgIGNvbXBpbGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBwYXJlbnQgPSB0aGlzLmVsZW1lbnQucGFyZW50Tm9kZTtcbiAgICAgIHZhciBwbGFjZWhvbGRlciA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgICAgIHBhcmVudC5pbnNlcnRCZWZvcmUocGxhY2Vob2xkZXIsIHRoaXMuZWxlbWVudCk7XG4gICAgICB0aGlzLnRlbXBsYXRlID0gdGhpcy5mcmFnbWVudHMuY3JlYXRlVGVtcGxhdGUodGhpcy5lbGVtZW50KTtcbiAgICAgIHRoaXMuZWxlbWVudCA9IHBsYWNlaG9sZGVyO1xuXG4gICAgICB2YXIgcGFydHMgPSB0aGlzLmV4cHJlc3Npb24uc3BsaXQoL1xccytpblxccyt8XFxzK29mXFxzKy8pO1xuICAgICAgdGhpcy5leHByZXNzaW9uID0gcGFydHMucG9wKCk7XG4gICAgICB2YXIga2V5ID0gcGFydHMucG9wKCk7XG4gICAgICBpZiAoa2V5KSB7XG4gICAgICAgIHBhcnRzID0ga2V5LnNwbGl0KC9cXHMqLFxccyovKTtcbiAgICAgICAgdGhpcy52YWx1ZU5hbWUgPSBwYXJ0cy5wb3AoKTtcbiAgICAgICAgdGhpcy5rZXlOYW1lID0gcGFydHMucG9wKCk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIGNyZWF0ZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy52aWV3cyA9IFtdO1xuICAgICAgdGhpcy5vYnNlcnZlci5nZXRDaGFuZ2VSZWNvcmRzID0gdHJ1ZTtcbiAgICB9LFxuXG4gICAgcmVtb3ZlVmlldzogZnVuY3Rpb24odmlldykge1xuICAgICAgdmlldy5kaXNwb3NlKCk7XG4gICAgICB2aWV3Ll9yZXBlYXRJdGVtXyA9IG51bGw7XG4gICAgfSxcblxuICAgIHVwZGF0ZWQ6IGZ1bmN0aW9uKHZhbHVlLCBvbGRWYWx1ZSwgY2hhbmdlcykge1xuICAgICAgaWYgKCFjaGFuZ2VzIHx8ICF0aGlzLmNvbnRleHQpIHtcbiAgICAgICAgdGhpcy5wb3B1bGF0ZSh2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodGhpcy5hbmltYXRlKSB7XG4gICAgICAgICAgdGhpcy51cGRhdGVDaGFuZ2VzQW5pbWF0ZWQodmFsdWUsIGNoYW5nZXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMudXBkYXRlQ2hhbmdlcyh2YWx1ZSwgY2hhbmdlcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLy8gTWV0aG9kIGZvciBjcmVhdGluZyBhbmQgc2V0dGluZyB1cCBuZXcgdmlld3MgZm9yIG91ciBsaXN0XG4gICAgY3JlYXRlVmlldzogZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuICAgICAgdmFyIHZpZXcgPSB0aGlzLnRlbXBsYXRlLmNyZWF0ZVZpZXcoKTtcbiAgICAgIHZhciBjb250ZXh0ID0gdmFsdWU7XG4gICAgICBpZiAodGhpcy52YWx1ZU5hbWUpIHtcbiAgICAgICAgY29udGV4dCA9IE9iamVjdC5jcmVhdGUodGhpcy5jb250ZXh0KTtcbiAgICAgICAgaWYgKHRoaXMua2V5TmFtZSkgY29udGV4dFt0aGlzLmtleU5hbWVdID0ga2V5O1xuICAgICAgICBjb250ZXh0W3RoaXMudmFsdWVOYW1lXSA9IHZhbHVlO1xuICAgICAgICBjb250ZXh0Ll9vcmlnQ29udGV4dF8gPSB0aGlzLmNvbnRleHQuaGFzT3duUHJvcGVydHkoJ19vcmlnQ29udGV4dF8nKVxuICAgICAgICAgID8gdGhpcy5jb250ZXh0Ll9vcmlnQ29udGV4dF9cbiAgICAgICAgICA6IHRoaXMuY29udGV4dDtcbiAgICAgIH1cbiAgICAgIHZpZXcuYmluZChjb250ZXh0KTtcbiAgICAgIHZpZXcuX3JlcGVhdEl0ZW1fID0gdmFsdWU7XG4gICAgICByZXR1cm4gdmlldztcbiAgICB9LFxuXG4gICAgcG9wdWxhdGU6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBpZiAodGhpcy5hbmltYXRpbmcpIHtcbiAgICAgICAgdGhpcy52YWx1ZVdoaWxlQW5pbWF0aW5nID0gdmFsdWU7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMudmlld3MubGVuZ3RoKSB7XG4gICAgICAgIHRoaXMudmlld3MuZm9yRWFjaCh0aGlzLnJlbW92ZVZpZXcpO1xuICAgICAgICB0aGlzLnZpZXdzLmxlbmd0aCA9IDA7XG4gICAgICB9XG5cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGgpIHtcbiAgICAgICAgdmFyIGZyYWcgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG5cbiAgICAgICAgdmFsdWUuZm9yRWFjaChmdW5jdGlvbihpdGVtLCBpbmRleCkge1xuICAgICAgICAgIHZhciB2aWV3ID0gdGhpcy5jcmVhdGVWaWV3KGluZGV4LCBpdGVtKTtcbiAgICAgICAgICB0aGlzLnZpZXdzLnB1c2godmlldyk7XG4gICAgICAgICAgZnJhZy5hcHBlbmRDaGlsZCh2aWV3KTtcbiAgICAgICAgfSwgdGhpcyk7XG5cbiAgICAgICAgdGhpcy5lbGVtZW50LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGZyYWcsIHRoaXMuZWxlbWVudC5uZXh0U2libGluZyk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRoaXMgdW4tYW5pbWF0ZWQgdmVyc2lvbiByZW1vdmVzIGFsbCByZW1vdmVkIHZpZXdzIGZpcnN0IHNvIHRoZXkgY2FuIGJlIHJldHVybmVkIHRvIHRoZSBwb29sIGFuZCB0aGVuIGFkZHMgbmV3XG4gICAgICogdmlld3MgYmFjayBpbi4gVGhpcyBpcyB0aGUgbW9zdCBvcHRpbWFsIG1ldGhvZCB3aGVuIG5vdCBhbmltYXRpbmcuXG4gICAgICovXG4gICAgdXBkYXRlQ2hhbmdlczogZnVuY3Rpb24odmFsdWUsIGNoYW5nZXMpIHtcbiAgICAgIC8vIFJlbW92ZSBldmVyeXRoaW5nIGZpcnN0LCB0aGVuIGFkZCBhZ2FpbiwgYWxsb3dpbmcgZm9yIGVsZW1lbnQgcmV1c2UgZnJvbSB0aGUgcG9vbFxuICAgICAgdmFyIGFkZGVkQ291bnQgPSAwO1xuXG4gICAgICBjaGFuZ2VzLmZvckVhY2goZnVuY3Rpb24oc3BsaWNlKSB7XG4gICAgICAgIGFkZGVkQ291bnQgKz0gc3BsaWNlLmFkZGVkQ291bnQ7XG4gICAgICAgIGlmICghc3BsaWNlLnJlbW92ZWQubGVuZ3RoKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciByZW1vdmVkID0gdGhpcy52aWV3cy5zcGxpY2Uoc3BsaWNlLmluZGV4IC0gYWRkZWRDb3VudCwgc3BsaWNlLnJlbW92ZWQubGVuZ3RoKTtcbiAgICAgICAgcmVtb3ZlZC5mb3JFYWNoKHRoaXMucmVtb3ZlVmlldyk7XG4gICAgICB9LCB0aGlzKTtcblxuICAgICAgLy8gQWRkIHRoZSBuZXcvbW92ZWQgdmlld3NcbiAgICAgIGNoYW5nZXMuZm9yRWFjaChmdW5jdGlvbihzcGxpY2UpIHtcbiAgICAgICAgaWYgKCFzcGxpY2UuYWRkZWRDb3VudCkgcmV0dXJuO1xuICAgICAgICB2YXIgYWRkZWRWaWV3cyA9IFtdO1xuICAgICAgICB2YXIgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgICAgIHZhciBpbmRleCA9IHNwbGljZS5pbmRleDtcbiAgICAgICAgdmFyIGVuZEluZGV4ID0gaW5kZXggKyBzcGxpY2UuYWRkZWRDb3VudDtcblxuICAgICAgICBmb3IgKHZhciBpID0gaW5kZXg7IGkgPCBlbmRJbmRleDsgaSsrKSB7XG4gICAgICAgICAgdmFyIGl0ZW0gPSB2YWx1ZVtpXTtcbiAgICAgICAgICB2YXIgdmlldyA9IHRoaXMuY3JlYXRlVmlldyhpLCBpdGVtKTtcbiAgICAgICAgICBhZGRlZFZpZXdzLnB1c2godmlldyk7XG4gICAgICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQodmlldyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy52aWV3cy5zcGxpY2UuYXBwbHkodGhpcy52aWV3cywgWyBpbmRleCwgMCBdLmNvbmNhdChhZGRlZFZpZXdzKSk7XG4gICAgICAgIHZhciBwcmV2aW91c1ZpZXcgPSB0aGlzLnZpZXdzW2luZGV4IC0gMV07XG4gICAgICAgIHZhciBuZXh0U2libGluZyA9IHByZXZpb3VzVmlldyA/IHByZXZpb3VzVmlldy5sYXN0Vmlld05vZGUubmV4dFNpYmxpbmcgOiB0aGlzLmVsZW1lbnQubmV4dFNpYmxpbmc7XG4gICAgICAgIHRoaXMuZWxlbWVudC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShmcmFnbWVudCwgbmV4dFNpYmxpbmcpO1xuICAgICAgfSwgdGhpcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRoaXMgYW5pbWF0ZWQgdmVyc2lvbiBtdXN0IGFuaW1hdGUgcmVtb3ZlZCBub2RlcyBvdXQgd2hpbGUgYWRkZWQgbm9kZXMgYXJlIGFuaW1hdGluZyBpbiBtYWtpbmcgaXQgbGVzcyBvcHRpbWFsXG4gICAgICogKGJ1dCBjb29sIGxvb2tpbmcpLiBJdCBhbHNvIGhhbmRsZXMgXCJtb3ZlXCIgYW5pbWF0aW9ucyBmb3Igbm9kZXMgd2hpY2ggYXJlIG1vdmluZyBwbGFjZSB3aXRoaW4gdGhlIGxpc3QuXG4gICAgICovXG4gICAgdXBkYXRlQ2hhbmdlc0FuaW1hdGVkOiBmdW5jdGlvbih2YWx1ZSwgY2hhbmdlcykge1xuICAgICAgaWYgKHRoaXMuYW5pbWF0aW5nKSB7XG4gICAgICAgIHRoaXMudmFsdWVXaGlsZUFuaW1hdGluZyA9IHZhbHVlO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIgYW5pbWF0aW5nVmFsdWUgPSB2YWx1ZS5zbGljZSgpO1xuICAgICAgdmFyIGFsbEFkZGVkID0gW107XG4gICAgICB2YXIgYWxsUmVtb3ZlZCA9IFtdO1xuICAgICAgdGhpcy5hbmltYXRpbmcgPSB0cnVlO1xuXG4gICAgICAvLyBSdW4gdXBkYXRlcyB3aGljaCBvY2N1cmVkIHdoaWxlIHRoaXMgd2FzIGFuaW1hdGluZy5cbiAgICAgIGZ1bmN0aW9uIHdoZW5Eb25lKCkge1xuICAgICAgICAvLyBUaGUgbGFzdCBhbmltYXRpb24gZmluaXNoZWQgd2lsbCBydW4gdGhpc1xuICAgICAgICBpZiAoLS13aGVuRG9uZS5jb3VudCAhPT0gMCkgcmV0dXJuO1xuXG4gICAgICAgIGFsbFJlbW92ZWQuZm9yRWFjaCh0aGlzLnJlbW92ZVZpZXcpO1xuXG4gICAgICAgIHRoaXMuYW5pbWF0aW5nID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLnZhbHVlV2hpbGVBbmltYXRpbmcpIHtcbiAgICAgICAgICB2YXIgY2hhbmdlcyA9IGRpZmYuYXJyYXlzKHRoaXMudmFsdWVXaGlsZUFuaW1hdGluZywgYW5pbWF0aW5nVmFsdWUpO1xuICAgICAgICAgIHRoaXMudXBkYXRlQ2hhbmdlc0FuaW1hdGVkKHRoaXMudmFsdWVXaGlsZUFuaW1hdGluZywgY2hhbmdlcyk7XG4gICAgICAgICAgdGhpcy52YWx1ZVdoaWxlQW5pbWF0aW5nID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgd2hlbkRvbmUuY291bnQgPSAwO1xuXG4gICAgICBjaGFuZ2VzLmZvckVhY2goZnVuY3Rpb24oc3BsaWNlKSB7XG4gICAgICAgIHZhciBhZGRlZFZpZXdzID0gW107XG4gICAgICAgIHZhciBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICAgICAgdmFyIGluZGV4ID0gc3BsaWNlLmluZGV4O1xuICAgICAgICB2YXIgZW5kSW5kZXggPSBpbmRleCArIHNwbGljZS5hZGRlZENvdW50O1xuICAgICAgICB2YXIgcmVtb3ZlZENvdW50ID0gc3BsaWNlLnJlbW92ZWQubGVuZ3RoO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSBpbmRleDsgaSA8IGVuZEluZGV4OyBpKyspIHtcbiAgICAgICAgICB2YXIgaXRlbSA9IHZhbHVlW2ldO1xuICAgICAgICAgIHZhciB2aWV3ID0gdGhpcy5jcmVhdGVWaWV3KGksIGl0ZW0pO1xuICAgICAgICAgIGFkZGVkVmlld3MucHVzaCh2aWV3KTtcbiAgICAgICAgICBmcmFnbWVudC5hcHBlbmRDaGlsZCh2aWV3KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciByZW1vdmVkVmlld3MgPSB0aGlzLnZpZXdzLnNwbGljZS5hcHBseSh0aGlzLnZpZXdzLCBbIGluZGV4LCByZW1vdmVkQ291bnQgXS5jb25jYXQoYWRkZWRWaWV3cykpO1xuICAgICAgICB2YXIgcHJldmlvdXNWaWV3ID0gdGhpcy52aWV3c1tpbmRleCAtIDFdO1xuICAgICAgICB2YXIgbmV4dFNpYmxpbmcgPSBwcmV2aW91c1ZpZXcgPyBwcmV2aW91c1ZpZXcubGFzdFZpZXdOb2RlLm5leHRTaWJsaW5nIDogdGhpcy5lbGVtZW50Lm5leHRTaWJsaW5nO1xuICAgICAgICB0aGlzLmVsZW1lbnQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoZnJhZ21lbnQsIG5leHRTaWJsaW5nKTtcblxuICAgICAgICBhbGxBZGRlZCA9IGFsbEFkZGVkLmNvbmNhdChhZGRlZFZpZXdzKTtcbiAgICAgICAgYWxsUmVtb3ZlZCA9IGFsbFJlbW92ZWQuY29uY2F0KHJlbW92ZWRWaWV3cyk7XG4gICAgICB9LCB0aGlzKTtcblxuXG4gICAgICBhbGxBZGRlZC5mb3JFYWNoKGZ1bmN0aW9uKHZpZXcpIHtcbiAgICAgICAgd2hlbkRvbmUuY291bnQrKztcbiAgICAgICAgdGhpcy5hbmltYXRlSW4odmlldywgd2hlbkRvbmUpO1xuICAgICAgfSwgdGhpcyk7XG5cbiAgICAgIGFsbFJlbW92ZWQuZm9yRWFjaChmdW5jdGlvbih2aWV3KSB7XG4gICAgICAgIHdoZW5Eb25lLmNvdW50Kys7XG4gICAgICAgIHZpZXcudW5iaW5kKCk7XG4gICAgICAgIHRoaXMuYW5pbWF0ZU91dCh2aWV3LCB3aGVuRG9uZSk7XG4gICAgICB9LCB0aGlzKTtcbiAgICB9LFxuXG4gICAgdW5ib3VuZDogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLnZpZXdzLmZvckVhY2goZnVuY3Rpb24odmlldykge1xuICAgICAgICB2aWV3LnVuYmluZCgpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLnZhbHVlV2hpbGVBbmltYXRpbmcgPSBudWxsO1xuICAgICAgdGhpcy5hbmltYXRpbmcgPSBmYWxzZTtcbiAgICB9XG4gIH07XG59O1xuIiwiLyoqXG4gKiBTaG93cy9oaWRlcyBhbiBlbGVtZW50IGNvbmRpdGlvbmFsbHkuIGBpZmAgc2hvdWxkIGJlIHVzZWQgaW4gbW9zdCBjYXNlcyBhcyBpdCByZW1vdmVzIHRoZSBlbGVtZW50IGNvbXBsZXRlbHkgYW5kIGlzXG4gKiBtb3JlIGVmZmVjaWVudCBzaW5jZSBiaW5kaW5ncyB3aXRoaW4gdGhlIGBpZmAgYXJlIG5vdCBhY3RpdmUgd2hpbGUgaXQgaXMgaGlkZGVuLiBVc2UgYHNob3dgIGZvciB3aGVuIHRoZSBlbGVtZW50XG4gKiBtdXN0IHJlbWFpbiBpbi1ET00gb3IgYmluZGluZ3Mgd2l0aGluIGl0IG11c3QgY29udGludWUgdG8gYmUgcHJvY2Vzc2VkIHdoaWxlIGl0IGlzIGhpZGRlbi4gWW91IHNob3VsZCBkZWZhdWx0IHRvXG4gKiB1c2luZyBgaWZgLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGlzSGlkZSkge1xuICB2YXIgaXNTaG93ID0gIWlzSGlkZTtcbiAgcmV0dXJuIHtcbiAgICBhbmltYXRlZDogdHJ1ZSxcblxuICAgIHVwZGF0ZWQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAvLyBGb3IgcGVyZm9ybWFuY2UgcHJvdmlkZSBhbiBhbHRlcm5hdGUgY29kZSBwYXRoIGZvciBhbmltYXRpb25cbiAgICAgIGlmICh0aGlzLmFuaW1hdGUgJiYgdGhpcy5jb250ZXh0ICYmICF0aGlzLmZpcnN0VXBkYXRlKSB7XG4gICAgICAgIHRoaXMudXBkYXRlZEFuaW1hdGVkKHZhbHVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMudXBkYXRlZFJlZ3VsYXIodmFsdWUpO1xuICAgICAgfVxuICAgICAgdGhpcy5maXJzdFVwZGF0ZSA9IGZhbHNlO1xuICAgIH0sXG5cbiAgICB1cGRhdGVkUmVndWxhcjogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICB0aGlzLmVsZW1lbnQuc3R5bGUuZGlzcGxheSA9ICcnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5lbGVtZW50LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgICB9XG4gICAgfSxcblxuICAgIHVwZGF0ZWRBbmltYXRlZDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHRoaXMubGFzdFZhbHVlID0gdmFsdWU7XG4gICAgICBpZiAodGhpcy5hbmltYXRpbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmFuaW1hdGluZyA9IHRydWU7XG4gICAgICBmdW5jdGlvbiBvbkZpbmlzaCgpIHtcbiAgICAgICAgdGhpcy5hbmltYXRpbmcgPSBmYWxzZTtcbiAgICAgICAgaWYgKHRoaXMubGFzdFZhbHVlICE9PSB2YWx1ZSkge1xuICAgICAgICAgIHRoaXMudXBkYXRlZEFuaW1hdGVkKHRoaXMubGFzdFZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBpZiBpc1Nob3cgaXMgdHJ1dGh5IGFuZCB2YWx1ZSBpcyB0cnV0aHlcbiAgICAgIGlmICghIXZhbHVlID09PSAhIWlzU2hvdykge1xuICAgICAgICB0aGlzLmVsZW1lbnQuc3R5bGUuZGlzcGxheSA9ICcnO1xuICAgICAgICB0aGlzLmFuaW1hdGVJbih0aGlzLmVsZW1lbnQsIG9uRmluaXNoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuYW5pbWF0ZU91dCh0aGlzLmVsZW1lbnQsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHRoaXMuZWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICAgIG9uRmluaXNoLmNhbGwodGhpcyk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBib3VuZDogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmZpcnN0VXBkYXRlID0gdHJ1ZTtcbiAgICB9LFxuXG4gICAgdW5ib3VuZDogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmVsZW1lbnQuc3R5bGUuZGlzcGxheSA9ICcnO1xuICAgICAgdGhpcy5sYXN0VmFsdWUgPSBudWxsO1xuICAgICAgdGhpcy5hbmltYXRpbmcgPSBmYWxzZTtcbiAgICB9XG4gIH07XG59O1xuIiwidmFyIHVuaXRzID0ge1xuICAnJSc6IHRydWUsXG4gICdlbSc6IHRydWUsXG4gICdweCc6IHRydWUsXG4gICdwdCc6IHRydWVcbn07XG5cbi8qKlxuICogQSBiaW5kZXIgdGhhdCBhZGRzIHN0eWxlcyB0byBhbiBlbGVtZW50LlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHNwZWNpZmljU3R5bGVOYW1lLCBzcGVjaWZpY1VuaXQpIHtcbiAgcmV0dXJuIHtcbiAgICBjb21waWxlZDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgc3R5bGVOYW1lID0gc3BlY2lmaWNTdHlsZU5hbWUgfHwgdGhpcy5tYXRjaDtcbiAgICAgIHZhciB1bml0O1xuXG4gICAgICBpZiAoc3BlY2lmaWNVbml0KSB7XG4gICAgICAgIHVuaXQgPSBzcGVjaWZpY1VuaXQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgcGFydHMgPSBzdHlsZU5hbWUuc3BsaXQoL1teYS16XS9pKTtcbiAgICAgICAgaWYgKHVuaXRzLmhhc093blByb3BlcnR5KHBhcnRzW3BhcnRzLmxlbmd0aCAtIDFdKSkge1xuICAgICAgICAgIHVuaXQgPSBwYXJ0cy5wb3AoKTtcbiAgICAgICAgICBzdHlsZU5hbWUgPSBwYXJ0cy5qb2luKCctJyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy51bml0ID0gdW5pdCB8fCAnJztcblxuICAgICAgdGhpcy5zdHlsZU5hbWUgPSBzdHlsZU5hbWUucmVwbGFjZSgvLSsoXFx3KS9nLCBmdW5jdGlvbihfLCBjaGFyKSB7XG4gICAgICAgIHJldHVybiBjaGFyLnRvVXBwZXJDYXNlKCk7XG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgdXBkYXRlZDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHRoaXMuZWxlbWVudC5zdHlsZVt0aGlzLnN0eWxlTmFtZV0gPSAodmFsdWUgPT0gbnVsbCkgPyAnJyA6IHZhbHVlICsgdGhpcy51bml0O1xuICAgIH1cbiAgfTtcbn07XG4iLCIvKipcbiAqICMjIHRleHRcbiAqIEEgYmluZGVyIHRoYXQgZGlzcGxheXMgZXNjYXBlZCB0ZXh0IGluc2lkZSBhbiBlbGVtZW50LiBUaGlzIGNhbiBiZSBkb25lIHdpdGggYmluZGluZyBkaXJlY3RseSBpbiB0ZXh0IG5vZGVzIGJ1dFxuICogdXNpbmcgdGhlIGF0dHJpYnV0ZSBiaW5kZXIgcHJldmVudHMgYSBmbGFzaCBvZiB1bnN0eWxlZCBjb250ZW50IG9uIHRoZSBtYWluIHBhZ2UuXG4gKlxuICogKipFeGFtcGxlOioqXG4gKiBgYGBodG1sXG4gKiA8aDEgdGV4dD1cInt7cG9zdC50aXRsZX19XCI+VW50aXRsZWQ8L2gxPlxuICogPGRpdiBodG1sPVwie3twb3N0LmJvZHkgfCBtYXJrZG93bn19XCI+PC9kaXY+XG4gKiBgYGBcbiAqICpSZXN1bHQ6KlxuICogYGBgaHRtbFxuICogPGgxPkxpdHRsZSBSZWQ8L2gxPlxuICogPGRpdj5cbiAqICAgPHA+TGl0dGxlIFJlZCBSaWRpbmcgSG9vZCBpcyBhIHN0b3J5IGFib3V0IGEgbGl0dGxlIGdpcmwuPC9wPlxuICogICA8cD5cbiAqICAgICBNb3JlIGluZm8gY2FuIGJlIGZvdW5kIG9uXG4gKiAgICAgPGEgaHJlZj1cImh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvTGl0dGxlX1JlZF9SaWRpbmdfSG9vZFwiPldpa2lwZWRpYTwvYT5cbiAqICAgPC9wPlxuICogPC9kaXY+XG4gKiBgYGBcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgdGhpcy5lbGVtZW50LnRleHRDb250ZW50ID0gKHZhbHVlID09IG51bGwpID8gJycgOiB2YWx1ZTtcbiAgfTtcbn07XG4iLCJ2YXIgaW5wdXRNZXRob2RzLCBkZWZhdWx0SW5wdXRNZXRob2Q7XG5cbi8qKlxuICogQSBiaW5kZXIgdGhhdCBzZXRzIHRoZSB2YWx1ZSBvZiBhbiBIVE1MIGZvcm0gZWxlbWVudC4gVGhpcyBiaW5kZXIgYWxzbyB1cGRhdGVzIHRoZSBkYXRhIGFzIGl0IGlzIGNoYW5nZWQgaW5cbiAqIHRoZSBmb3JtIGVsZW1lbnQsIHByb3ZpZGluZyB0d28gd2F5IGJpbmRpbmcuIENhbiB1c2UgZm9yIFwiY2hlY2tlZFwiIGFzIHdlbGwuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZXZlbnRzQXR0ck5hbWUsIGZpZWxkQXR0ck5hbWUpIHtcbiAgcmV0dXJuIHtcbiAgICBvbmx5V2hlbkJvdW5kOiB0cnVlLFxuICAgIGRlZmF1bHRFdmVudHM6IFsgJ2NoYW5nZScgXSxcblxuICAgIGNvbXBpbGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBuYW1lID0gdGhpcy5lbGVtZW50LnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgIHZhciB0eXBlID0gdGhpcy5lbGVtZW50LnR5cGU7XG4gICAgICB0aGlzLm1ldGhvZHMgPSBpbnB1dE1ldGhvZHNbdHlwZV0gfHwgaW5wdXRNZXRob2RzW25hbWVdO1xuXG4gICAgICBpZiAoIXRoaXMubWV0aG9kcykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIGlmIChldmVudHNBdHRyTmFtZSAmJiB0aGlzLmVsZW1lbnQuaGFzQXR0cmlidXRlKGV2ZW50c0F0dHJOYW1lKSkge1xuICAgICAgICB0aGlzLmV2ZW50cyA9IHRoaXMuZWxlbWVudC5nZXRBdHRyaWJ1dGUoZXZlbnRzQXR0ck5hbWUpLnNwbGl0KCcgJyk7XG4gICAgICAgIHRoaXMuZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUoZXZlbnRzQXR0ck5hbWUpO1xuICAgICAgfSBlbHNlIGlmIChuYW1lICE9PSAnb3B0aW9uJykge1xuICAgICAgICB0aGlzLmV2ZW50cyA9IHRoaXMuZGVmYXVsdEV2ZW50cztcbiAgICAgIH1cblxuICAgICAgaWYgKGZpZWxkQXR0ck5hbWUgJiYgdGhpcy5lbGVtZW50Lmhhc0F0dHJpYnV0ZShmaWVsZEF0dHJOYW1lKSkge1xuICAgICAgICB0aGlzLnZhbHVlRmllbGQgPSB0aGlzLmVsZW1lbnQuZ2V0QXR0cmlidXRlKGZpZWxkQXR0ck5hbWUpO1xuICAgICAgICB0aGlzLmVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKGZpZWxkQXR0ck5hbWUpO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZSA9PT0gJ29wdGlvbicpIHtcbiAgICAgICAgdGhpcy52YWx1ZUZpZWxkID0gdGhpcy5lbGVtZW50LnBhcmVudE5vZGUudmFsdWVGaWVsZDtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgY3JlYXRlZDogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoIXRoaXMuZXZlbnRzKSByZXR1cm47IC8vIG5vdGhpbmcgZm9yIDxvcHRpb24+IGhlcmVcbiAgICAgIHZhciBlbGVtZW50ID0gdGhpcy5lbGVtZW50O1xuICAgICAgdmFyIG9ic2VydmVyID0gdGhpcy5vYnNlcnZlcjtcbiAgICAgIHZhciBpbnB1dCA9IHRoaXMubWV0aG9kcztcbiAgICAgIHZhciB2YWx1ZUZpZWxkID0gdGhpcy52YWx1ZUZpZWxkO1xuXG4gICAgICAvLyBUaGUgMi13YXkgYmluZGluZyBwYXJ0IGlzIHNldHRpbmcgdmFsdWVzIG9uIGNlcnRhaW4gZXZlbnRzXG4gICAgICBmdW5jdGlvbiBvbkNoYW5nZSgpIHtcbiAgICAgICAgaWYgKGlucHV0LmdldC5jYWxsKGVsZW1lbnQsIHZhbHVlRmllbGQpICE9PSBvYnNlcnZlci5vbGRWYWx1ZSAmJiAhZWxlbWVudC5yZWFkT25seSkge1xuICAgICAgICAgIG9ic2VydmVyLnNldChpbnB1dC5nZXQuY2FsbChlbGVtZW50LCB2YWx1ZUZpZWxkKSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGVsZW1lbnQudHlwZSA9PT0gJ3RleHQnKSB7XG4gICAgICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDEzKSBvbkNoYW5nZSgpO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5ldmVudHMuZm9yRWFjaChmdW5jdGlvbihldmVudCkge1xuICAgICAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIG9uQ2hhbmdlKTtcbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICB1cGRhdGVkOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgaWYgKHRoaXMubWV0aG9kcy5nZXQuY2FsbCh0aGlzLmVsZW1lbnQsIHRoaXMudmFsdWVGaWVsZCkgIT0gdmFsdWUpIHtcbiAgICAgICAgdGhpcy5tZXRob2RzLnNldC5jYWxsKHRoaXMuZWxlbWVudCwgdmFsdWUsIHRoaXMudmFsdWVGaWVsZCk7XG4gICAgICB9XG4gICAgfVxuICB9O1xufTtcblxuXG4vKipcbiAqIEhhbmRsZSB0aGUgZGlmZmVyZW50IGZvcm0gdHlwZXNcbiAqL1xuZGVmYXVsdElucHV0TWV0aG9kID0ge1xuICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy52YWx1ZTsgfSxcbiAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyB0aGlzLnZhbHVlID0gKHZhbHVlID09IG51bGwpID8gJycgOiB2YWx1ZTsgfVxufTtcblxuXG5pbnB1dE1ldGhvZHMgPSB7XG4gIGNoZWNrYm94OiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuY2hlY2tlZDsgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IHRoaXMuY2hlY2tlZCA9ICEhdmFsdWU7IH1cbiAgfSxcblxuICBmaWxlOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuZmlsZXMgJiYgdGhpcy5maWxlc1swXTsgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKCkge31cbiAgfSxcblxuICBzZWxlY3Q6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKHZhbHVlRmllbGQpIHtcbiAgICAgIGlmICh2YWx1ZUZpZWxkKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9wdGlvbnNbdGhpcy5zZWxlY3RlZEluZGV4XS52YWx1ZU9iamVjdDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0aGlzLnZhbHVlO1xuICAgICAgfVxuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSwgdmFsdWVGaWVsZCkge1xuICAgICAgaWYgKHZhbHVlICYmIHZhbHVlRmllbGQpIHtcbiAgICAgICAgdGhpcy52YWx1ZU9iamVjdCA9IHZhbHVlO1xuICAgICAgICB0aGlzLnZhbHVlID0gdmFsdWVbdmFsdWVGaWVsZF07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnZhbHVlID0gKHZhbHVlID09IG51bGwpID8gJycgOiB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgb3B0aW9uOiB7XG4gICAgZ2V0OiBmdW5jdGlvbih2YWx1ZUZpZWxkKSB7XG4gICAgICByZXR1cm4gdmFsdWVGaWVsZCA/IHRoaXMudmFsdWVPYmplY3RbdmFsdWVGaWVsZF0gOiB0aGlzLnZhbHVlO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSwgdmFsdWVGaWVsZCkge1xuICAgICAgaWYgKHZhbHVlICYmIHZhbHVlRmllbGQpIHtcbiAgICAgICAgdGhpcy52YWx1ZU9iamVjdCA9IHZhbHVlO1xuICAgICAgICB0aGlzLnZhbHVlID0gdmFsdWVbdmFsdWVGaWVsZF07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnZhbHVlID0gKHZhbHVlID09IG51bGwpID8gJycgOiB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgaW5wdXQ6IGRlZmF1bHRJbnB1dE1ldGhvZCxcblxuICB0ZXh0YXJlYTogZGVmYXVsdElucHV0TWV0aG9kXG59O1xuXG4iLCIvKipcbiAqIFRha2VzIHRoZSBpbnB1dCBVUkwgYW5kIGFkZHMgKG9yIHJlcGxhY2VzKSB0aGUgZmllbGQgaW4gdGhlIHF1ZXJ5LlxuICogRS5nLiAnaHR0cDovL2V4YW1wbGUuY29tP3VzZXI9ZGVmYXVsdCZyZXNvdXJjZT1mb28nIHwgYWRkUXVlcnkoJ3VzZXInLCB1c2VybmFtZSlcbiAqIFdpbGwgcmVwbGFjZSB1c2VyPWRlZmF1bHQgd2l0aCB1c2VyPXt1c2VybmFtZX0gd2hlcmUge3VzZXJuYW1lfSBpcyB0aGUgdmFsdWUgb2YgdXNlcm5hbWUuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odmFsdWUsIHF1ZXJ5RmllbGQsIHF1ZXJ5VmFsdWUpIHtcbiAgdmFyIHVybCA9IHZhbHVlIHx8IGxvY2F0aW9uLmhyZWY7XG4gIHZhciBwYXJ0cyA9IHVybC5zcGxpdCgnPycpO1xuICB1cmwgPSBwYXJ0c1swXTtcbiAgdmFyIHF1ZXJ5ID0gcGFydHNbMV07XG4gIHZhciBhZGRlZFF1ZXJ5ID0gJyc7XG4gIGlmIChxdWVyeVZhbHVlICE9IG51bGwpIHtcbiAgICBhZGRlZFF1ZXJ5ID0gcXVlcnlGaWVsZCArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudChxdWVyeVZhbHVlKTtcbiAgfVxuXG4gIGlmIChxdWVyeSkge1xuICAgIHZhciBleHByID0gbmV3IFJlZ0V4cCgnXFxcXGInICsgcXVlcnlGaWVsZCArICc9W14mXSonKTtcbiAgICBpZiAoZXhwci50ZXN0KHF1ZXJ5KSkge1xuICAgICAgcXVlcnkgPSBxdWVyeS5yZXBsYWNlKGV4cHIsIGFkZGVkUXVlcnkpO1xuICAgIH0gZWxzZSBpZiAoYWRkZWRRdWVyeSkge1xuICAgICAgcXVlcnkgKz0gJyYnICsgYWRkZWRRdWVyeTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcXVlcnkgPSBhZGRlZFF1ZXJ5O1xuICB9XG4gIGlmIChxdWVyeSkge1xuICAgIHVybCArPSAnPycgKyBxdWVyeTtcbiAgfVxuICByZXR1cm4gdXJsO1xufTtcbiIsInZhciB1cmxFeHAgPSAvKF58XFxzfFxcKCkoKD86aHR0cHM/fGZ0cCk6XFwvXFwvW1xcLUEtWjAtOStcXHUwMDI2QCNcXC8lPz0oKX5ffCE6LC47XSpbXFwtQS1aMC05K1xcdTAwMjZAI1xcLyU9fihffF0pL2dpO1xudmFyIHd3d0V4cCA9IC8oXnxbXlxcL10pKHd3d1xcLltcXFNdK1xcLlxcd3syLH0oXFxifCQpKS9naW07XG4vKipcbiAqIEFkZHMgYXV0b21hdGljIGxpbmtzIHRvIGVzY2FwZWQgY29udGVudCAoYmUgc3VyZSB0byBlc2NhcGUgdXNlciBjb250ZW50KS4gQ2FuIGJlIHVzZWQgb24gZXhpc3RpbmcgSFRNTCBjb250ZW50IGFzIGl0XG4gKiB3aWxsIHNraXAgVVJMcyB3aXRoaW4gSFRNTCB0YWdzLiBQYXNzaW5nIGEgdmFsdWUgaW4gdGhlIHNlY29uZCBwYXJhbWV0ZXIgd2lsbCBzZXQgdGhlIHRhcmdldCB0byB0aGF0IHZhbHVlIG9yXG4gKiBgX2JsYW5rYCBpZiB0aGUgdmFsdWUgaXMgYHRydWVgLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHZhbHVlLCB0YXJnZXQpIHtcbiAgdmFyIHRhcmdldFN0cmluZyA9ICcnO1xuICBpZiAodHlwZW9mIHRhcmdldCA9PT0gJ3N0cmluZycpIHtcbiAgICB0YXJnZXRTdHJpbmcgPSAnIHRhcmdldD1cIicgKyB0YXJnZXQgKyAnXCInO1xuICB9IGVsc2UgaWYgKHRhcmdldCkge1xuICAgIHRhcmdldFN0cmluZyA9ICcgdGFyZ2V0PVwiX2JsYW5rXCInO1xuICB9XG5cbiAgcmV0dXJuICgnJyArIHZhbHVlKS5yZXBsYWNlKC88W14+XSs+fFtePF0rL2csIGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgaWYgKG1hdGNoLmNoYXJBdCgwKSA9PT0gJzwnKSB7XG4gICAgICByZXR1cm4gbWF0Y2g7XG4gICAgfVxuICAgIHZhciByZXBsYWNlZFRleHQgPSBtYXRjaC5yZXBsYWNlKHVybEV4cCwgJyQxPGEgaHJlZj1cIiQyXCInICsgdGFyZ2V0U3RyaW5nICsgJz4kMjwvYT4nKTtcbiAgICByZXR1cm4gcmVwbGFjZWRUZXh0LnJlcGxhY2Uod3d3RXhwLCAnJDE8YSBocmVmPVwiaHR0cDovLyQyXCInICsgdGFyZ2V0U3RyaW5nICsgJz4kMjwvYT4nKTtcbiAgfSk7XG59O1xuIiwiLyoqXG4gKiBGb3JtYXRzIHRoZSB2YWx1ZSBpbnRvIGEgYm9vbGVhbi5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgJiYgdmFsdWUgIT09ICcwJyAmJiB2YWx1ZSAhPT0gJ2ZhbHNlJztcbn07XG4iLCJ2YXIgZXNjYXBlSFRNTCA9IHJlcXVpcmUoJy4vZXNjYXBlJyk7XG5cbi8qKlxuICogSFRNTCBlc2NhcGVzIGNvbnRlbnQgYWRkaW5nIDxicj4gdGFncyBpbiBwbGFjZSBvZiBuZXdsaW5lcyBjaGFyYWN0ZXJzLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHZhbHVlLCBzZXR0ZXIpIHtcbiAgaWYgKHNldHRlcikge1xuICAgIHJldHVybiBlc2NhcGVIVE1MKHZhbHVlLCBzZXR0ZXIpO1xuICB9IGVsc2Uge1xuICAgIHZhciBsaW5lcyA9ICh2YWx1ZSB8fCAnJykuc3BsaXQoL1xccj9cXG4vKTtcbiAgICByZXR1cm4gbGluZXMubWFwKGVzY2FwZUhUTUwpLmpvaW4oJzxicj5cXG4nKTtcbiAgfVxufTtcbiIsIi8qKlxuICogQWRkcyBhIGZvcm1hdHRlciB0byBmb3JtYXQgZGF0ZXMgYW5kIHN0cmluZ3Mgc2ltcGxpc3RpY2FsbHlcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih2YWx1ZSkge1xuICBpZiAoIXZhbHVlKSB7XG4gICAgcmV0dXJuICcnO1xuICB9XG5cbiAgaWYgKCEodmFsdWUgaW5zdGFuY2VvZiBEYXRlKSkge1xuICAgIHZhbHVlID0gbmV3IERhdGUodmFsdWUpO1xuICB9XG5cbiAgaWYgKGlzTmFOKHZhbHVlLmdldFRpbWUoKSkpIHtcbiAgICByZXR1cm4gJyc7XG4gIH1cblxuICByZXR1cm4gdmFsdWUudG9Mb2NhbGVTdHJpbmcoKTtcbn07XG4iLCIvKipcbiAqIEFkZHMgYSBmb3JtYXR0ZXIgdG8gZm9ybWF0IGRhdGVzIGFuZCBzdHJpbmdzIHNpbXBsaXN0aWNhbGx5XG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgaWYgKCF2YWx1ZSkge1xuICAgIHJldHVybiAnJztcbiAgfVxuXG4gIGlmICghKHZhbHVlIGluc3RhbmNlb2YgRGF0ZSkpIHtcbiAgICB2YWx1ZSA9IG5ldyBEYXRlKHZhbHVlKTtcbiAgfVxuXG4gIGlmIChpc05hTih2YWx1ZS5nZXRUaW1lKCkpKSB7XG4gICAgcmV0dXJuICcnO1xuICB9XG5cbiAgcmV0dXJuIHZhbHVlLnRvTG9jYWxlRGF0ZVN0cmluZygpO1xufTtcbiIsInZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblxuLyoqXG4gKiBIVE1MIGVzY2FwZXMgY29udGVudC4gRm9yIHVzZSB3aXRoIG90aGVyIEhUTUwtYWRkaW5nIGZvcm1hdHRlcnMgc3VjaCBhcyBhdXRvbGluay5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAodmFsdWUsIHNldHRlcikge1xuICBpZiAoc2V0dGVyKSB7XG4gICAgZGl2LmlubmVySFRNTCA9IHZhbHVlO1xuICAgIHJldHVybiBkaXYudGV4dENvbnRlbnQ7XG4gIH0gZWxzZSB7XG4gICAgZGl2LnRleHRDb250ZW50ID0gdmFsdWUgfHwgJyc7XG4gICAgcmV0dXJuIGRpdi5pbm5lckhUTUw7XG4gIH1cbn07XG4iLCIvKipcbiAqIEZpbHRlcnMgYW4gYXJyYXkgYnkgdGhlIGdpdmVuIGZpbHRlciBmdW5jdGlvbihzKSwgbWF5IHByb3ZpZGUgYSBmdW5jdGlvbiBvciBhbiBhcnJheSBvciBhbiBvYmplY3Qgd2l0aCBmaWx0ZXJpbmdcbiAqIGZ1bmN0aW9ucy5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih2YWx1ZSwgZmlsdGVyRnVuYykge1xuICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9IGVsc2UgaWYgKCFmaWx0ZXJGdW5jKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBmaWx0ZXJGdW5jID09PSAnZnVuY3Rpb24nKSB7XG4gICAgdmFsdWUgPSB2YWx1ZS5maWx0ZXIoZmlsdGVyRnVuYywgdGhpcyk7XG4gIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShmaWx0ZXJGdW5jKSkge1xuICAgIGZpbHRlckZ1bmMuZm9yRWFjaChmdW5jdGlvbihmdW5jKSB7XG4gICAgICB2YWx1ZSA9IHZhbHVlLmZpbHRlcihmdW5jLCB0aGlzKTtcbiAgICB9KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZmlsdGVyRnVuYyA9PT0gJ29iamVjdCcpIHtcbiAgICBPYmplY3Qua2V5cyhmaWx0ZXJGdW5jKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgdmFyIGZ1bmMgPSBmaWx0ZXJGdW5jW2tleV07XG4gICAgICBpZiAodHlwZW9mIGZ1bmMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdmFsdWUgPSB2YWx1ZS5maWx0ZXIoZnVuYywgdGhpcyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufTtcbiIsIi8qKlxuICogRm9ybWF0cyB0aGUgdmFsdWUgaW50byBhIGZsb2F0IG9yIG51bGwuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgdmFsdWUgPSBwYXJzZUZsb2F0KHZhbHVlKTtcbiAgcmV0dXJuIGlzTmFOKHZhbHVlKSA/IG51bGwgOiB2YWx1ZTtcbn07XG4iLCIvKipcbiAqIEZvcm1hdHMgdGhlIHZhbHVlIHNvbWV0aGluZyByZXR1cm5lZCBieSBhIGZvcm1hdHRpbmcgZnVuY3Rpb24gcGFzc2VkLiBVc2UgZm9yIGN1c3RvbSBvciBvbmUtb2ZmIGZvcm1hdHMuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odmFsdWUsIGZvcm1hdHRlciwgaXNTZXR0ZXIpIHtcbiAgcmV0dXJuIGZvcm1hdHRlcih2YWx1ZSwgaXNTZXR0ZXIpO1xufTtcbiIsIi8qKlxuICogQWRkcyBhbGwgYnVpbHQtaW4gZm9ybWF0dGVycyB3aXRoIGRlZmF1bHQgbmFtZXNcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihmcmFnbWVudHMpIHtcbiAgaWYgKCFmcmFnbWVudHMgfHwgdHlwZW9mIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2Zvcm1hdHRlcnMgcmVxdWlyZXMgYW4gaW5zdGFuY2Ugb2YgZnJhZ21lbnRzIHRvIHJlZ2lzdGVyIHdpdGgnKTtcbiAgfVxuXG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcignYWRkUXVlcnknLCByZXF1aXJlKCcuL2FkZC1xdWVyeScpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCdhdXRvbGluaycsIHJlcXVpcmUoJy4vYXV0b2xpbmsnKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcignYm9vbCcsIHJlcXVpcmUoJy4vYm9vbCcpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCdicicsIHJlcXVpcmUoJy4vYnInKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcignZGF0ZVRpbWUnLCByZXF1aXJlKCcuL2RhdGUtdGltZScpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCdkYXRlJywgcmVxdWlyZSgnLi9kYXRlJykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ2VzY2FwZScsIHJlcXVpcmUoJy4vZXNjYXBlJykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ2ZpbHRlcicsIHJlcXVpcmUoJy4vZmlsdGVyJykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ2Zsb2F0JywgcmVxdWlyZSgnLi9mbG9hdCcpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCdmb3JtYXQnLCByZXF1aXJlKCcuL2Zvcm1hdCcpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCdpbnQnLCByZXF1aXJlKCcuL2ludCcpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCdqc29uJywgcmVxdWlyZSgnLi9qc29uJykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ2xpbWl0JywgcmVxdWlyZSgnLi9saW1pdCcpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCdsb2cnLCByZXF1aXJlKCcuL2xvZycpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCdsb3dlcicsIHJlcXVpcmUoJy4vbG93ZXInKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcignbWFwJywgcmVxdWlyZSgnLi9tYXAnKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcignbmV3bGluZScsIHJlcXVpcmUoJy4vbmV3bGluZScpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCdwJywgcmVxdWlyZSgnLi9wJykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ3JlZHVjZScsIHJlcXVpcmUoJy4vcmVkdWNlJykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ3NsaWNlJywgcmVxdWlyZSgnLi9zbGljZScpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCdzb3J0JywgcmVxdWlyZSgnLi9zb3J0JykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ3RpbWUnLCByZXF1aXJlKCcuL3RpbWUnKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcigndXBwZXInLCByZXF1aXJlKCcuL3VwcGVyJykpO1xufTtcbiIsIi8qKlxuICogRm9ybWF0cyB0aGUgdmFsdWUgaW50byBhbiBpbnRlZ2VyIG9yIG51bGwuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgdmFsdWUgPSBwYXJzZUludCh2YWx1ZSk7XG4gIHJldHVybiBpc05hTih2YWx1ZSkgPyBudWxsIDogdmFsdWU7XG59O1xuIiwiLyoqXG4gKiBGb3JtYXRzIHRoZSB2YWx1ZSBpbnRvIEpTT04uXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odmFsdWUsIGlzU2V0dGVyKSB7XG4gIGlmIChpc1NldHRlcikge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gSlNPTi5wYXJzZSh2YWx1ZSk7XG4gICAgfSBjYXRjaChlcnIpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHZhbHVlKTtcbiAgICB9IGNhdGNoKGVycikge1xuICAgICAgcmV0dXJuIGVyci50b1N0cmluZygpO1xuICAgIH1cbiAgfVxufTtcbiIsIi8qKlxuICogQWRkcyBhIGZvcm1hdHRlciB0byBsaW1pdCB0aGUgbGVuZ3RoIG9mIGFuIGFycmF5IG9yIHN0cmluZ1xuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHZhbHVlLCBsaW1pdCkge1xuICBpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlLnNsaWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgaWYgKGxpbWl0IDwgMCkge1xuICAgICAgcmV0dXJuIHZhbHVlLnNsaWNlKGxpbWl0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsdWUuc2xpY2UoMCwgbGltaXQpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbn07XG4iLCIvKipcbiAqIEFkZHMgYSBmb3JtYXR0ZXIgdG8gbG9nIHRoZSB2YWx1ZSBvZiB0aGUgZXhwcmVzc2lvbiwgdXNlZnVsIGZvciBkZWJ1Z2dpbmdcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih2YWx1ZSwgcHJlZml4KSB7XG4gIGlmIChwcmVmaXggPT0gbnVsbCkgcHJlZml4ID0gJ0xvZzonO1xuICAvKmVzbGludC1kaXNhYmxlIG5vLWNvbnNvbGUgKi9cbiAgY29uc29sZS5sb2coJyVjJyArIHByZWZpeCwgJ2NvbG9yOmJsdWU7Zm9udC13ZWlnaHQ6Ym9sZCcsIHZhbHVlKTtcbiAgLyplc2xpbnQtZW5hYmxlICovXG4gIHJldHVybiB2YWx1ZTtcbn07XG4iLCIvKipcbiAqIEZvcm1hdHMgdGhlIHZhbHVlIGludG8gbG93ZXIgY2FzZS5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyA/IHZhbHVlLnRvTG93ZXJDYXNlKCkgOiB2YWx1ZTtcbn07XG4iLCIvKipcbiAqIEFkZHMgYSBmb3JtYXR0ZXIgdG8gbWFwIGFuIGFycmF5IG9yIHZhbHVlIGJ5IHRoZSBnaXZlbiBtYXBwaW5nIGZ1bmN0aW9uXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odmFsdWUsIG1hcEZ1bmMpIHtcbiAgaWYgKHZhbHVlID09IG51bGwgfHwgdHlwZW9mIG1hcEZ1bmMgIT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbiAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgcmV0dXJuIHZhbHVlLm1hcChtYXBGdW5jLCB0aGlzKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbWFwRnVuYy5jYWxsKHRoaXMsIHZhbHVlKTtcbiAgfVxufTtcbiIsInZhciBlc2NhcGVIVE1MID0gcmVxdWlyZSgnLi9lc2NhcGUnKTtcblxuLyoqXG4gKiBIVE1MIGVzY2FwZXMgY29udGVudCBhZGRpbmcgPHA+IHRhZ3MgYXQgZG91YmxlIG5ld2xpbmVzIGFuZCA8YnI+IHRhZ3MgaW4gcGxhY2Ugb2Ygc2luZ2xlIG5ld2xpbmUgY2hhcmFjdGVycy5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih2YWx1ZSwgc2V0dGVyKSB7XG4gIGlmIChzZXR0ZXIpIHtcbiAgICByZXR1cm4gZXNjYXBlSFRNTCh2YWx1ZSwgc2V0dGVyKTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgcGFyYWdyYXBocyA9ICh2YWx1ZSB8fCAnJykuc3BsaXQoL1xccj9cXG5cXHMqXFxyP1xcbi8pO1xuICAgIHZhciBlc2NhcGVkID0gcGFyYWdyYXBocy5tYXAoZnVuY3Rpb24ocGFyYWdyYXBoKSB7XG4gICAgICB2YXIgbGluZXMgPSBwYXJhZ3JhcGguc3BsaXQoL1xccj9cXG4vKTtcbiAgICAgIHJldHVybiBsaW5lcy5tYXAoZXNjYXBlSFRNTCkuam9pbignPGJyPlxcbicpO1xuICAgIH0pO1xuICAgIHJldHVybiAnPHA+JyArIGVzY2FwZWQuam9pbignPC9wPlxcblxcbjxwPicpICsgJzwvcD4nO1xuICB9XG59O1xuIiwidmFyIGVzY2FwZUhUTUwgPSByZXF1aXJlKCcuL2VzY2FwZScpO1xuXG4vKipcbiAqIEhUTUwgZXNjYXBlcyBjb250ZW50IHdyYXBwaW5nIGxpbmVzIGludG8gcGFyYWdyYXBocyAoaW4gPHA+IHRhZ3MpLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHZhbHVlLCBzZXR0ZXIpIHtcbiAgaWYgKHNldHRlcikge1xuICAgIHJldHVybiBlc2NhcGVIVE1MKHZhbHVlLCBzZXR0ZXIpO1xuICB9IGVsc2Uge1xuICAgIHZhciBsaW5lcyA9ICh2YWx1ZSB8fCAnJykuc3BsaXQoL1xccj9cXG4vKTtcbiAgICB2YXIgZXNjYXBlZCA9IGxpbmVzLm1hcChmdW5jdGlvbihsaW5lKSB7IHJldHVybiBlc2NhcGVIVE1MKGxpbmUpIHx8ICc8YnI+JzsgfSk7XG4gICAgcmV0dXJuICc8cD4nICsgZXNjYXBlZC5qb2luKCc8L3A+XFxuPHA+JykgKyAnPC9wPic7XG4gIH1cbn07XG4iLCIvKipcbiAqIEFkZHMgYSBmb3JtYXR0ZXIgdG8gcmVkdWNlIGFuIGFycmF5IG9yIHZhbHVlIGJ5IHRoZSBnaXZlbiByZWR1Y2UgZnVuY3Rpb25cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih2YWx1ZSwgcmVkdWNlRnVuYywgaW5pdGlhbFZhbHVlKSB7XG4gIGlmICh2YWx1ZSA9PSBudWxsIHx8IHR5cGVvZiBtYXBGdW5jICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG4gIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAzKSB7XG4gICAgICByZXR1cm4gdmFsdWUucmVkdWNlKHJlZHVjZUZ1bmMsIGluaXRpYWxWYWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB2YWx1ZS5yZWR1Y2UocmVkdWNlRnVuYyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDMpIHtcbiAgICByZXR1cm4gcmVkdWNlRnVuYyhpbml0aWFsVmFsdWUsIHZhbHVlKTtcbiAgfVxufTtcbiIsIi8qKlxuICogQWRkcyBhIGZvcm1hdHRlciB0byByZWR1Y2UgYW4gYXJyYXkgb3IgdmFsdWUgYnkgdGhlIGdpdmVuIHJlZHVjZSBmdW5jdGlvblxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgZW5kSW5kZXgpIHtcbiAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgcmV0dXJuIHZhbHVlLnNsaWNlKGluZGV4LCBlbmRJbmRleCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG59O1xuIiwiLyoqXG4gKiBTb3J0cyBhbiBhcnJheSBnaXZlbiBhIGZpZWxkIG5hbWUgb3Igc29ydCBmdW5jdGlvbiwgYW5kIGEgZGlyZWN0aW9uXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odmFsdWUsIHNvcnRGdW5jLCBkaXIpIHtcbiAgaWYgKCFzb3J0RnVuYyB8fCAhQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbiAgZGlyID0gKGRpciA9PT0gJ2Rlc2MnKSA/IC0xIDogMTtcbiAgaWYgKHR5cGVvZiBzb3J0RnVuYyA9PT0gJ3N0cmluZycpIHtcbiAgICB2YXIgcGFydHMgPSBzb3J0RnVuYy5zcGxpdCgnOicpO1xuICAgIHZhciBwcm9wID0gcGFydHNbMF07XG4gICAgdmFyIGRpcjIgPSBwYXJ0c1sxXTtcbiAgICBkaXIyID0gKGRpcjIgPT09ICdkZXNjJykgPyAtMSA6IDE7XG4gICAgZGlyID0gZGlyIHx8IGRpcjI7XG4gICAgc29ydEZ1bmMgPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgICBpZiAoYVtwcm9wXSA+IGJbcHJvcF0pIHJldHVybiBkaXI7XG4gICAgICBpZiAoYVtwcm9wXSA8IGJbcHJvcF0pIHJldHVybiAtZGlyO1xuICAgICAgcmV0dXJuIDA7XG4gICAgfTtcbiAgfSBlbHNlIGlmIChkaXIgPT09IC0xKSB7XG4gICAgdmFyIG9yaWdGdW5jID0gc29ydEZ1bmM7XG4gICAgc29ydEZ1bmMgPSBmdW5jdGlvbihhLCBiKSB7IHJldHVybiAtb3JpZ0Z1bmMoYSwgYik7IH07XG4gIH1cblxuICByZXR1cm4gdmFsdWUuc2xpY2UoKS5zb3J0KHNvcnRGdW5jLmJpbmQodGhpcykpO1xufTtcbiIsIi8qKlxuICogQWRkcyBhIGZvcm1hdHRlciB0byBmb3JtYXQgZGF0ZXMgYW5kIHN0cmluZ3Mgc2ltcGxpc3RpY2FsbHlcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih2YWx1ZSkge1xuICBpZiAoIXZhbHVlKSB7XG4gICAgcmV0dXJuICcnO1xuICB9XG5cbiAgaWYgKCEodmFsdWUgaW5zdGFuY2VvZiBEYXRlKSkge1xuICAgIHZhbHVlID0gbmV3IERhdGUodmFsdWUpO1xuICB9XG5cbiAgaWYgKGlzTmFOKHZhbHVlLmdldFRpbWUoKSkpIHtcbiAgICByZXR1cm4gJyc7XG4gIH1cblxuICByZXR1cm4gdmFsdWUudG9Mb2NhbGVUaW1lU3RyaW5nKCk7XG59O1xuIiwiLyoqXG4gKiBGb3JtYXRzIHRoZSB2YWx1ZSBpbnRvIHVwcGVyIGNhc2UuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgPyB2YWx1ZS50b1VwcGVyQ2FzZSgpIDogdmFsdWU7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL3NyYy9kaWZmJyk7XG4iLCIvKlxuQ29weXJpZ2h0IChjKSAyMDE1IEphY29iIFdyaWdodCA8amFjd3JpZ2h0QGdtYWlsLmNvbT5cblxuUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxub2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xudG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG5mdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuXG5UaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG5cblRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbklNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG5BVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG5MSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuVEhFIFNPRlRXQVJFLlxuKi9cbi8vICMgRGlmZlxuLy8gPiBCYXNlZCBvbiB3b3JrIGZyb20gR29vZ2xlJ3Mgb2JzZXJ2ZS1qcyBwb2x5ZmlsbDogaHR0cHM6Ly9naXRodWIuY29tL1BvbHltZXIvb2JzZXJ2ZS1qc1xuXG4vLyBBIG5hbWVzcGFjZSB0byBzdG9yZSB0aGUgZnVuY3Rpb25zIG9uXG52YXIgZGlmZiA9IGV4cG9ydHM7XG5cbihmdW5jdGlvbigpIHtcblxuICBkaWZmLmNsb25lID0gY2xvbmU7XG4gIGRpZmYudmFsdWVzID0gZGlmZlZhbHVlcztcbiAgZGlmZi5iYXNpYyA9IGRpZmZCYXNpYztcbiAgZGlmZi5vYmplY3RzID0gZGlmZk9iamVjdHM7XG4gIGRpZmYuYXJyYXlzID0gZGlmZkFycmF5cztcblxuXG4gIC8vIEEgY2hhbmdlIHJlY29yZCBmb3IgdGhlIG9iamVjdCBjaGFuZ2VzXG4gIGZ1bmN0aW9uIENoYW5nZVJlY29yZChvYmplY3QsIHR5cGUsIG5hbWUsIG9sZFZhbHVlKSB7XG4gICAgdGhpcy5vYmplY3QgPSBvYmplY3Q7XG4gICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHRoaXMub2xkVmFsdWUgPSBvbGRWYWx1ZTtcbiAgfVxuXG4gIC8vIEEgc3BsaWNlIHJlY29yZCBmb3IgdGhlIGFycmF5IGNoYW5nZXNcbiAgZnVuY3Rpb24gU3BsaWNlKGluZGV4LCByZW1vdmVkLCBhZGRlZENvdW50KSB7XG4gICAgdGhpcy5pbmRleCA9IGluZGV4O1xuICAgIHRoaXMucmVtb3ZlZCA9IHJlbW92ZWQ7XG4gICAgdGhpcy5hZGRlZENvdW50ID0gYWRkZWRDb3VudDtcbiAgfVxuXG5cbiAgLy8gQ3JlYXRlcyBhIGNsb25lIG9yIGNvcHkgb2YgYW4gYXJyYXkgb3Igb2JqZWN0IChvciBzaW1wbHkgcmV0dXJucyBhIHN0cmluZy9udW1iZXIvYm9vbGVhbiB3aGljaCBhcmUgaW1tdXRhYmxlKVxuICAvLyBEb2VzIG5vdCBwcm92aWRlIGRlZXAgY29waWVzLlxuICBmdW5jdGlvbiBjbG9uZSh2YWx1ZSwgZGVlcCkge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgaWYgKGRlZXApIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLm1hcChmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBjbG9uZSh2YWx1ZSwgZGVlcCk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLnNsaWNlKCk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICBpZiAodmFsdWUudmFsdWVPZigpICE9PSB2YWx1ZSkge1xuICAgICAgICByZXR1cm4gbmV3IHZhbHVlLmNvbnN0cnVjdG9yKHZhbHVlLnZhbHVlT2YoKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgY29weSA9IHt9O1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmFsdWUpIHtcbiAgICAgICAgICB2YXIgb2JqVmFsdWUgPSB2YWx1ZVtrZXldO1xuICAgICAgICAgIGlmIChkZWVwKSB7XG4gICAgICAgICAgICBvYmpWYWx1ZSA9IGNsb25lKG9ialZhbHVlLCBkZWVwKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29weVtrZXldID0gb2JqVmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvcHk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gIH1cblxuXG4gIC8vIERpZmZzIHR3byB2YWx1ZXMsIHJldHVybmluZyBhIHRydXRoeSB2YWx1ZSBpZiB0aGVyZSBhcmUgY2hhbmdlcyBvciBgZmFsc2VgIGlmIHRoZXJlIGFyZSBubyBjaGFuZ2VzLiBJZiB0aGUgdHdvXG4gIC8vIHZhbHVlcyBhcmUgYm90aCBhcnJheXMgb3IgYm90aCBvYmplY3RzLCBhbiBhcnJheSBvZiBjaGFuZ2VzIChzcGxpY2VzIG9yIGNoYW5nZSByZWNvcmRzKSBiZXR3ZWVuIHRoZSB0d28gd2lsbCBiZVxuICAvLyByZXR1cm5lZC4gT3RoZXJ3aXNlICBgdHJ1ZWAgd2lsbCBiZSByZXR1cm5lZC5cbiAgZnVuY3Rpb24gZGlmZlZhbHVlcyh2YWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAvLyBTaG9ydGN1dCBvdXQgZm9yIHZhbHVlcyB0aGF0IGFyZSBleGFjdGx5IGVxdWFsXG4gICAgaWYgKHZhbHVlID09PSBvbGRWYWx1ZSkgcmV0dXJuIGZhbHNlO1xuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpICYmIEFycmF5LmlzQXJyYXkob2xkVmFsdWUpKSB7XG4gICAgICAvLyBJZiBhbiBhcnJheSBoYXMgY2hhbmdlZCBjYWxjdWxhdGUgdGhlIHNwbGljZXNcbiAgICAgIHZhciBzcGxpY2VzID0gZGlmZkFycmF5cyh2YWx1ZSwgb2xkVmFsdWUpO1xuICAgICAgcmV0dXJuIHNwbGljZXMubGVuZ3RoID8gc3BsaWNlcyA6IGZhbHNlO1xuICAgIH0gZWxzZSBpZiAodmFsdWUgJiYgb2xkVmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB0eXBlb2Ygb2xkVmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAvLyBJZiBhbiBvYmplY3QgaGFzIGNoYW5nZWQgY2FsY3VsYXRlIHRoZSBjaG5hZ2VzIGFuZCBjYWxsIHRoZSBjYWxsYmFja1xuICAgICAgLy8gQWxsb3cgZGF0ZXMgYW5kIE51bWJlci9TdHJpbmcgb2JqZWN0cyB0byBiZSBjb21wYXJlZFxuICAgICAgdmFyIHZhbHVlVmFsdWUgPSB2YWx1ZS52YWx1ZU9mKCk7XG4gICAgICB2YXIgb2xkVmFsdWVWYWx1ZSA9IG9sZFZhbHVlLnZhbHVlT2YoKTtcblxuICAgICAgLy8gQWxsb3cgZGF0ZXMgYW5kIE51bWJlci9TdHJpbmcgb2JqZWN0cyB0byBiZSBjb21wYXJlZFxuICAgICAgaWYgKHR5cGVvZiB2YWx1ZVZhbHVlICE9PSAnb2JqZWN0JyAmJiB0eXBlb2Ygb2xkVmFsdWVWYWx1ZSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlVmFsdWUgIT09IG9sZFZhbHVlVmFsdWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgY2hhbmdlUmVjb3JkcyA9IGRpZmZPYmplY3RzKHZhbHVlLCBvbGRWYWx1ZSk7XG4gICAgICAgIHJldHVybiBjaGFuZ2VSZWNvcmRzLmxlbmd0aCA/IGNoYW5nZVJlY29yZHMgOiBmYWxzZTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWYgYSB2YWx1ZSBoYXMgY2hhbmdlZCBjYWxsIHRoZSBjYWxsYmFja1xuICAgICAgcmV0dXJuIGRpZmZCYXNpYyh2YWx1ZSwgb2xkVmFsdWUpO1xuICAgIH1cbiAgfVxuXG5cbiAgLy8gRGlmZnMgdHdvIGJhc2ljIHR5cGVzLCByZXR1cm5pbmcgdHJ1ZSBpZiBjaGFuZ2VkIG9yIGZhbHNlIGlmIG5vdFxuICBmdW5jdGlvbiBkaWZmQmFzaWModmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgaWYgKHZhbHVlICYmIG9sZFZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG9sZFZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgLy8gQWxsb3cgZGF0ZXMgYW5kIE51bWJlci9TdHJpbmcgb2JqZWN0cyB0byBiZSBjb21wYXJlZFxuICAgICAgdmFyIHZhbHVlVmFsdWUgPSB2YWx1ZS52YWx1ZU9mKCk7XG4gICAgICB2YXIgb2xkVmFsdWVWYWx1ZSA9IG9sZFZhbHVlLnZhbHVlT2YoKTtcblxuICAgICAgLy8gQWxsb3cgZGF0ZXMgYW5kIE51bWJlci9TdHJpbmcgb2JqZWN0cyB0byBiZSBjb21wYXJlZFxuICAgICAgaWYgKHR5cGVvZiB2YWx1ZVZhbHVlICE9PSAnb2JqZWN0JyAmJiB0eXBlb2Ygb2xkVmFsdWVWYWx1ZSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgcmV0dXJuIGRpZmZCYXNpYyh2YWx1ZVZhbHVlLCBvbGRWYWx1ZVZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBJZiBhIHZhbHVlIGhhcyBjaGFuZ2VkIGNhbGwgdGhlIGNhbGxiYWNrXG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicgJiYgdHlwZW9mIG9sZFZhbHVlID09PSAnbnVtYmVyJyAmJiBpc05hTih2YWx1ZSkgJiYgaXNOYU4ob2xkVmFsdWUpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB2YWx1ZSAhPT0gb2xkVmFsdWU7XG4gICAgfVxuICB9XG5cblxuICAvLyBEaWZmcyB0d28gb2JqZWN0cyByZXR1cm5pbmcgYW4gYXJyYXkgb2YgY2hhbmdlIHJlY29yZHMuIFRoZSBjaGFuZ2UgcmVjb3JkIGxvb2tzIGxpa2U6XG4gIC8vIGBgYGphdmFzY3JpcHRcbiAgLy8ge1xuICAvLyAgIG9iamVjdDogb2JqZWN0LFxuICAvLyAgIHR5cGU6ICdkZWxldGVkfHVwZGF0ZWR8bmV3JyxcbiAgLy8gICBuYW1lOiAncHJvcGVydHlOYW1lJyxcbiAgLy8gICBvbGRWYWx1ZTogb2xkVmFsdWVcbiAgLy8gfVxuICAvLyBgYGBcbiAgZnVuY3Rpb24gZGlmZk9iamVjdHMob2JqZWN0LCBvbGRPYmplY3QpIHtcbiAgICB2YXIgY2hhbmdlUmVjb3JkcyA9IFtdO1xuICAgIHZhciBwcm9wLCBvbGRWYWx1ZSwgdmFsdWU7XG5cbiAgICAvLyBHb2VzIHRocm91Z2ggdGhlIG9sZCBvYmplY3QgKHNob3VsZCBiZSBhIGNsb25lKSBhbmQgbG9vayBmb3IgdGhpbmdzIHRoYXQgYXJlIG5vdyBnb25lIG9yIGNoYW5nZWRcbiAgICBmb3IgKHByb3AgaW4gb2xkT2JqZWN0KSB7XG4gICAgICBvbGRWYWx1ZSA9IG9sZE9iamVjdFtwcm9wXTtcbiAgICAgIHZhbHVlID0gb2JqZWN0W3Byb3BdO1xuXG4gICAgICAvLyBBbGxvdyBmb3IgdGhlIGNhc2Ugb2Ygb2JqLnByb3AgPSB1bmRlZmluZWQgKHdoaWNoIGlzIGEgbmV3IHByb3BlcnR5LCBldmVuIGlmIGl0IGlzIHVuZGVmaW5lZClcbiAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmICFkaWZmQmFzaWModmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgLy8gSWYgdGhlIHByb3BlcnR5IGlzIGdvbmUgaXQgd2FzIHJlbW92ZWRcbiAgICAgIGlmICghIChwcm9wIGluIG9iamVjdCkpIHtcbiAgICAgICAgY2hhbmdlUmVjb3Jkcy5wdXNoKG5ldyBDaGFuZ2VSZWNvcmQob2JqZWN0LCAnZGVsZXRlZCcsIHByb3AsIG9sZFZhbHVlKSk7XG4gICAgICB9IGVsc2UgaWYgKGRpZmZCYXNpYyh2YWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgIGNoYW5nZVJlY29yZHMucHVzaChuZXcgQ2hhbmdlUmVjb3JkKG9iamVjdCwgJ3VwZGF0ZWQnLCBwcm9wLCBvbGRWYWx1ZSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEdvZXMgdGhyb3VnaCB0aGUgb2xkIG9iamVjdCBhbmQgbG9va3MgZm9yIHRoaW5ncyB0aGF0IGFyZSBuZXdcbiAgICBmb3IgKHByb3AgaW4gb2JqZWN0KSB7XG4gICAgICB2YWx1ZSA9IG9iamVjdFtwcm9wXTtcbiAgICAgIGlmICghIChwcm9wIGluIG9sZE9iamVjdCkpIHtcbiAgICAgICAgY2hhbmdlUmVjb3Jkcy5wdXNoKG5ldyBDaGFuZ2VSZWNvcmQob2JqZWN0LCAnbmV3JywgcHJvcCkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChBcnJheS5pc0FycmF5KG9iamVjdCkgJiYgb2JqZWN0Lmxlbmd0aCAhPT0gb2xkT2JqZWN0Lmxlbmd0aCkge1xuICAgICAgY2hhbmdlUmVjb3Jkcy5wdXNoKG5ldyBDaGFuZ2VSZWNvcmQob2JqZWN0LCAndXBkYXRlZCcsICdsZW5ndGgnLCBvbGRPYmplY3QubGVuZ3RoKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNoYW5nZVJlY29yZHM7XG4gIH1cblxuXG5cblxuXG4gIHZhciBFRElUX0xFQVZFID0gMDtcbiAgdmFyIEVESVRfVVBEQVRFID0gMTtcbiAgdmFyIEVESVRfQUREID0gMjtcbiAgdmFyIEVESVRfREVMRVRFID0gMztcblxuXG4gIC8vIERpZmZzIHR3byBhcnJheXMgcmV0dXJuaW5nIGFuIGFycmF5IG9mIHNwbGljZXMuIEEgc3BsaWNlIG9iamVjdCBsb29rcyBsaWtlOlxuICAvLyBgYGBqYXZhc2NyaXB0XG4gIC8vIHtcbiAgLy8gICBpbmRleDogMyxcbiAgLy8gICByZW1vdmVkOiBbaXRlbSwgaXRlbV0sXG4gIC8vICAgYWRkZWRDb3VudDogMFxuICAvLyB9XG4gIC8vIGBgYFxuICBmdW5jdGlvbiBkaWZmQXJyYXlzKHZhbHVlLCBvbGRWYWx1ZSkge1xuICAgIHZhciBjdXJyZW50U3RhcnQgPSAwO1xuICAgIHZhciBjdXJyZW50RW5kID0gdmFsdWUubGVuZ3RoO1xuICAgIHZhciBvbGRTdGFydCA9IDA7XG4gICAgdmFyIG9sZEVuZCA9IG9sZFZhbHVlLmxlbmd0aDtcblxuICAgIHZhciBtaW5MZW5ndGggPSBNYXRoLm1pbihjdXJyZW50RW5kLCBvbGRFbmQpO1xuICAgIHZhciBwcmVmaXhDb3VudCA9IHNoYXJlZFByZWZpeCh2YWx1ZSwgb2xkVmFsdWUsIG1pbkxlbmd0aCk7XG4gICAgdmFyIHN1ZmZpeENvdW50ID0gc2hhcmVkU3VmZml4KHZhbHVlLCBvbGRWYWx1ZSwgbWluTGVuZ3RoIC0gcHJlZml4Q291bnQpO1xuXG4gICAgY3VycmVudFN0YXJ0ICs9IHByZWZpeENvdW50O1xuICAgIG9sZFN0YXJ0ICs9IHByZWZpeENvdW50O1xuICAgIGN1cnJlbnRFbmQgLT0gc3VmZml4Q291bnQ7XG4gICAgb2xkRW5kIC09IHN1ZmZpeENvdW50O1xuXG4gICAgaWYgKGN1cnJlbnRFbmQgLSBjdXJyZW50U3RhcnQgPT09IDAgJiYgb2xkRW5kIC0gb2xkU3RhcnQgPT09IDApIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICAvLyBpZiBub3RoaW5nIHdhcyBhZGRlZCwgb25seSByZW1vdmVkIGZyb20gb25lIHNwb3RcbiAgICBpZiAoY3VycmVudFN0YXJ0ID09PSBjdXJyZW50RW5kKSB7XG4gICAgICByZXR1cm4gWyBuZXcgU3BsaWNlKGN1cnJlbnRTdGFydCwgb2xkVmFsdWUuc2xpY2Uob2xkU3RhcnQsIG9sZEVuZCksIDApIF07XG4gICAgfVxuXG4gICAgLy8gaWYgbm90aGluZyB3YXMgcmVtb3ZlZCwgb25seSBhZGRlZCB0byBvbmUgc3BvdFxuICAgIGlmIChvbGRTdGFydCA9PT0gb2xkRW5kKSB7XG4gICAgICByZXR1cm4gWyBuZXcgU3BsaWNlKGN1cnJlbnRTdGFydCwgW10sIGN1cnJlbnRFbmQgLSBjdXJyZW50U3RhcnQpIF07XG4gICAgfVxuXG4gICAgLy8gYSBtaXh0dXJlIG9mIGFkZHMgYW5kIHJlbW92ZXNcbiAgICB2YXIgZGlzdGFuY2VzID0gY2FsY0VkaXREaXN0YW5jZXModmFsdWUsIGN1cnJlbnRTdGFydCwgY3VycmVudEVuZCwgb2xkVmFsdWUsIG9sZFN0YXJ0LCBvbGRFbmQpO1xuICAgIHZhciBvcHMgPSBzcGxpY2VPcGVyYXRpb25zRnJvbUVkaXREaXN0YW5jZXMoZGlzdGFuY2VzKTtcblxuICAgIHZhciBzcGxpY2UgPSBudWxsO1xuICAgIHZhciBzcGxpY2VzID0gW107XG4gICAgdmFyIGluZGV4ID0gY3VycmVudFN0YXJ0O1xuICAgIHZhciBvbGRJbmRleCA9IG9sZFN0YXJ0O1xuXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBvcHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICB2YXIgb3AgPSBvcHNbaV07XG4gICAgICBpZiAob3AgPT09IEVESVRfTEVBVkUpIHtcbiAgICAgICAgaWYgKHNwbGljZSkge1xuICAgICAgICAgIHNwbGljZXMucHVzaChzcGxpY2UpO1xuICAgICAgICAgIHNwbGljZSA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBpbmRleCsrO1xuICAgICAgICBvbGRJbmRleCsrO1xuICAgICAgfSBlbHNlIGlmIChvcCA9PT0gRURJVF9VUERBVEUpIHtcbiAgICAgICAgaWYgKCFzcGxpY2UpIHtcbiAgICAgICAgICBzcGxpY2UgPSBuZXcgU3BsaWNlKGluZGV4LCBbXSwgMCk7XG4gICAgICAgIH1cblxuICAgICAgICBzcGxpY2UuYWRkZWRDb3VudCsrO1xuICAgICAgICBpbmRleCsrO1xuXG4gICAgICAgIHNwbGljZS5yZW1vdmVkLnB1c2gob2xkVmFsdWVbb2xkSW5kZXhdKTtcbiAgICAgICAgb2xkSW5kZXgrKztcbiAgICAgIH0gZWxzZSBpZiAob3AgPT09IEVESVRfQUREKSB7XG4gICAgICAgIGlmICghc3BsaWNlKSB7XG4gICAgICAgICAgc3BsaWNlID0gbmV3IFNwbGljZShpbmRleCwgW10sIDApO1xuICAgICAgICB9XG5cbiAgICAgICAgc3BsaWNlLmFkZGVkQ291bnQrKztcbiAgICAgICAgaW5kZXgrKztcbiAgICAgIH0gZWxzZSBpZiAob3AgPT09IEVESVRfREVMRVRFKSB7XG4gICAgICAgIGlmICghc3BsaWNlKSB7XG4gICAgICAgICAgc3BsaWNlID0gbmV3IFNwbGljZShpbmRleCwgW10sIDApO1xuICAgICAgICB9XG5cbiAgICAgICAgc3BsaWNlLnJlbW92ZWQucHVzaChvbGRWYWx1ZVtvbGRJbmRleF0pO1xuICAgICAgICBvbGRJbmRleCsrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzcGxpY2UpIHtcbiAgICAgIHNwbGljZXMucHVzaChzcGxpY2UpO1xuICAgIH1cblxuICAgIHJldHVybiBzcGxpY2VzO1xuICB9XG5cblxuXG5cbiAgLy8gZmluZCB0aGUgbnVtYmVyIG9mIGl0ZW1zIGF0IHRoZSBiZWdpbm5pbmcgdGhhdCBhcmUgdGhlIHNhbWVcbiAgZnVuY3Rpb24gc2hhcmVkUHJlZml4KGN1cnJlbnQsIG9sZCwgc2VhcmNoTGVuZ3RoKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZWFyY2hMZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGRpZmZCYXNpYyhjdXJyZW50W2ldLCBvbGRbaV0pKSB7XG4gICAgICAgIHJldHVybiBpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc2VhcmNoTGVuZ3RoO1xuICB9XG5cblxuICAvLyBmaW5kIHRoZSBudW1iZXIgb2YgaXRlbXMgYXQgdGhlIGVuZCB0aGF0IGFyZSB0aGUgc2FtZVxuICBmdW5jdGlvbiBzaGFyZWRTdWZmaXgoY3VycmVudCwgb2xkLCBzZWFyY2hMZW5ndGgpIHtcbiAgICB2YXIgaW5kZXgxID0gY3VycmVudC5sZW5ndGg7XG4gICAgdmFyIGluZGV4MiA9IG9sZC5sZW5ndGg7XG4gICAgdmFyIGNvdW50ID0gMDtcbiAgICB3aGlsZSAoY291bnQgPCBzZWFyY2hMZW5ndGggJiYgIWRpZmZCYXNpYyhjdXJyZW50Wy0taW5kZXgxXSwgb2xkWy0taW5kZXgyXSkpIHtcbiAgICAgIGNvdW50Kys7XG4gICAgfVxuICAgIHJldHVybiBjb3VudDtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gc3BsaWNlT3BlcmF0aW9uc0Zyb21FZGl0RGlzdGFuY2VzKGRpc3RhbmNlcykge1xuICAgIHZhciBpID0gZGlzdGFuY2VzLmxlbmd0aCAtIDE7XG4gICAgdmFyIGogPSBkaXN0YW5jZXNbMF0ubGVuZ3RoIC0gMTtcbiAgICB2YXIgY3VycmVudCA9IGRpc3RhbmNlc1tpXVtqXTtcbiAgICB2YXIgZWRpdHMgPSBbXTtcbiAgICB3aGlsZSAoaSA+IDAgfHwgaiA+IDApIHtcbiAgICAgIGlmIChpID09PSAwKSB7XG4gICAgICAgIGVkaXRzLnB1c2goRURJVF9BREQpO1xuICAgICAgICBqLS07XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoaiA9PT0gMCkge1xuICAgICAgICBlZGl0cy5wdXNoKEVESVRfREVMRVRFKTtcbiAgICAgICAgaS0tO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgdmFyIG5vcnRoV2VzdCA9IGRpc3RhbmNlc1tpIC0gMV1baiAtIDFdO1xuICAgICAgdmFyIHdlc3QgPSBkaXN0YW5jZXNbaSAtIDFdW2pdO1xuICAgICAgdmFyIG5vcnRoID0gZGlzdGFuY2VzW2ldW2ogLSAxXTtcbiAgICAgIHZhciBtaW47XG5cbiAgICAgIGlmICh3ZXN0IDwgbm9ydGgpIHtcbiAgICAgICAgbWluID0gd2VzdCA8IG5vcnRoV2VzdCA/IHdlc3QgOiBub3J0aFdlc3Q7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtaW4gPSBub3J0aCA8IG5vcnRoV2VzdCA/IG5vcnRoIDogbm9ydGhXZXN0O1xuICAgICAgfVxuXG4gICAgICBpZiAobWluID09PSBub3J0aFdlc3QpIHtcbiAgICAgICAgaWYgKG5vcnRoV2VzdCA9PT0gY3VycmVudCkge1xuICAgICAgICAgIGVkaXRzLnB1c2goRURJVF9MRUFWRSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZWRpdHMucHVzaChFRElUX1VQREFURSk7XG4gICAgICAgICAgY3VycmVudCA9IG5vcnRoV2VzdDtcbiAgICAgICAgfVxuICAgICAgICBpLS07XG4gICAgICAgIGotLTtcbiAgICAgIH0gZWxzZSBpZiAobWluID09PSB3ZXN0KSB7XG4gICAgICAgIGVkaXRzLnB1c2goRURJVF9ERUxFVEUpO1xuICAgICAgICBpLS07XG4gICAgICAgIGN1cnJlbnQgPSB3ZXN0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZWRpdHMucHVzaChFRElUX0FERCk7XG4gICAgICAgIGotLTtcbiAgICAgICAgY3VycmVudCA9IG5vcnRoO1xuICAgICAgfVxuICAgIH1cbiAgICBlZGl0cy5yZXZlcnNlKCk7XG4gICAgcmV0dXJuIGVkaXRzO1xuICB9XG5cblxuICBmdW5jdGlvbiBjYWxjRWRpdERpc3RhbmNlcyhjdXJyZW50LCBjdXJyZW50U3RhcnQsIGN1cnJlbnRFbmQsIG9sZCwgb2xkU3RhcnQsIG9sZEVuZCkge1xuICAgIC8vIFwiRGVsZXRpb25cIiBjb2x1bW5zXG4gICAgdmFyIHJvd0NvdW50ID0gb2xkRW5kIC0gb2xkU3RhcnQgKyAxO1xuICAgIHZhciBjb2x1bW5Db3VudCA9IGN1cnJlbnRFbmQgLSBjdXJyZW50U3RhcnQgKyAxO1xuICAgIHZhciBkaXN0YW5jZXMgPSBuZXcgQXJyYXkocm93Q291bnQpO1xuICAgIHZhciBpLCBqO1xuXG4gICAgLy8gXCJBZGRpdGlvblwiIHJvd3MuIEluaXRpYWxpemUgbnVsbCBjb2x1bW4uXG4gICAgZm9yIChpID0gMDsgaSA8IHJvd0NvdW50OyBpKyspIHtcbiAgICAgIGRpc3RhbmNlc1tpXSA9IG5ldyBBcnJheShjb2x1bW5Db3VudCk7XG4gICAgICBkaXN0YW5jZXNbaV1bMF0gPSBpO1xuICAgIH1cblxuICAgIC8vIEluaXRpYWxpemUgbnVsbCByb3dcbiAgICBmb3IgKGogPSAwOyBqIDwgY29sdW1uQ291bnQ7IGorKykge1xuICAgICAgZGlzdGFuY2VzWzBdW2pdID0gajtcbiAgICB9XG5cbiAgICBmb3IgKGkgPSAxOyBpIDwgcm93Q291bnQ7IGkrKykge1xuICAgICAgZm9yIChqID0gMTsgaiA8IGNvbHVtbkNvdW50OyBqKyspIHtcbiAgICAgICAgaWYgKCFkaWZmQmFzaWMoY3VycmVudFtjdXJyZW50U3RhcnQgKyBqIC0gMV0sIG9sZFtvbGRTdGFydCArIGkgLSAxXSkpIHtcbiAgICAgICAgICBkaXN0YW5jZXNbaV1bal0gPSBkaXN0YW5jZXNbaSAtIDFdW2ogLSAxXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YXIgbm9ydGggPSBkaXN0YW5jZXNbaSAtIDFdW2pdICsgMTtcbiAgICAgICAgICB2YXIgd2VzdCA9IGRpc3RhbmNlc1tpXVtqIC0gMV0gKyAxO1xuICAgICAgICAgIGRpc3RhbmNlc1tpXVtqXSA9IG5vcnRoIDwgd2VzdCA/IG5vcnRoIDogd2VzdDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBkaXN0YW5jZXM7XG4gIH1cbn0pKCk7XG4iLCJ2YXIgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG5cbi8qKlxuICogU2ltcGxpZmllcyBleHRlbmRpbmcgY2xhc3NlcyBhbmQgcHJvdmlkZXMgc3RhdGljIGluaGVyaXRhbmNlLiBDbGFzc2VzIHRoYXQgbmVlZCB0byBiZSBleHRlbmRhYmxlIHNob3VsZFxuICogZXh0ZW5kIENsYXNzIHdoaWNoIHdpbGwgZ2l2ZSB0aGVtIHRoZSBgZXh0ZW5kYCBzdGF0aWMgZnVuY3Rpb24gZm9yIHRoZWlyIHN1YmNsYXNzZXMgdG8gdXNlLiBJbiBhZGRpdGlvbiB0b1xuICogYSBwcm90b3R5cGUsIG1peGlucyBtYXkgYmUgYWRkZWQgYXMgd2VsbC4gRXhhbXBsZTpcbiAqXG4gKiBmdW5jdGlvbiBNeUNsYXNzKGFyZzEsIGFyZzIpIHtcbiAqICAgU3VwZXJDbGFzcy5jYWxsKHRoaXMsIGFyZzEpO1xuICogICB0aGlzLmFyZzIgPSBhcmcyO1xuICogfVxuICogU3VwZXJDbGFzcy5leHRlbmQoTXlDbGFzcywgbWl4aW4xLCBBbm90aGVyQ2xhc3MsIHtcbiAqICAgZm9vOiBmdW5jdGlvbigpIHtcbiAqICAgICB0aGlzLl9iYXIrKztcbiAqICAgfSxcbiAqICAgZ2V0IGJhcigpIHtcbiAqICAgICByZXR1cm4gdGhpcy5fYmFyO1xuICogICB9XG4gKiB9KTtcbiAqXG4gKiBJbiBhZGRpdGlvbiB0byBleHRlbmRpbmcgdGhlIHN1cGVyY2xhc3MsIHN0YXRpYyBtZXRob2RzIGFuZCBwcm9wZXJ0aWVzIHdpbGwgYmUgY29waWVkIG9udG8gdGhlIHN1YmNsYXNzIGZvclxuICogc3RhdGljIGluaGVyaXRhbmNlLiBUaGlzIGFsbG93cyB0aGUgZXh0ZW5kIGZ1bmN0aW9uIHRvIGJlIGNvcGllZCB0byB0aGUgc3ViY2xhc3Mgc28gdGhhdCBpdCBtYXkgYmVcbiAqIHN1YmNsYXNzZWQgYXMgd2VsbC4gQWRkaXRpb25hbGx5LCBzdGF0aWMgcHJvcGVydGllcyBtYXkgYmUgYWRkZWQgYnkgZGVmaW5pbmcgdGhlbSBvbiBhIHNwZWNpYWwgcHJvdG90eXBlXG4gKiBwcm9wZXJ0eSBgc3RhdGljYCBtYWtpbmcgdGhlIGNvZGUgbW9yZSByZWFkYWJsZS5cbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBUaGUgc3ViY2xhc3MgY29uc3RydWN0b3IuXG4gKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbmFsXSBaZXJvIG9yIG1vcmUgbWl4aW5zLiBUaGV5IGNhbiBiZSBvYmplY3RzIG9yIGNsYXNzZXMgKGZ1bmN0aW9ucykuXG4gKiBAcGFyYW0ge29iamVjdH0gVGhlIHByb3RvdHlwZSBvZiB0aGUgc3ViY2xhc3MuXG4gKi9cbmZ1bmN0aW9uIENsYXNzKCkge31cbkNsYXNzLmV4dGVuZCA9IGV4dGVuZDtcbkNsYXNzLm1ha2VJbnN0YW5jZU9mID0gbWFrZUluc3RhbmNlT2Y7XG5tb2R1bGUuZXhwb3J0cyA9IENsYXNzO1xuXG5mdW5jdGlvbiBleHRlbmQoU3ViY2xhc3MgLyogWywgcHJvdG90eXBlIFsscHJvdG90eXBlXV0gKi8pIHtcbiAgdmFyIHByb3RvdHlwZXMsIFN1cGVyQ2xhc3MgPSB0aGlzO1xuXG4gIC8vIFN1cHBvcnQgbm8gY29uc3RydWN0b3JcbiAgaWYgKHR5cGVvZiBTdWJjbGFzcyAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHByb3RvdHlwZXMgPSBzbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgU3ViY2xhc3MgPSBmdW5jdGlvbigpIHtcbiAgICAgIFN1cGVyQ2xhc3MuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHByb3RvdHlwZXMgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gIH1cblxuICBleHRlbmRTdGF0aWNzKHRoaXMsIFN1YmNsYXNzKTtcblxuICBwcm90b3R5cGVzLmZvckVhY2goZnVuY3Rpb24ocHJvdG8pIHtcbiAgICBpZiAodHlwZW9mIHByb3RvID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBleHRlbmRTdGF0aWNzKHByb3RvLCBTdWJjbGFzcyk7XG4gICAgfSBlbHNlIGlmIChwcm90by5oYXNPd25Qcm9wZXJ0eSgnc3RhdGljJykpIHtcbiAgICAgIGV4dGVuZFN0YXRpY3MocHJvdG8uc3RhdGljLCBTdWJjbGFzcyk7XG4gICAgfVxuICB9KTtcblxuICB2YXIgZGVzY3JpcHRvcnMgPSBnZXREZXNjcmlwdG9ycyhwcm90b3R5cGVzKTtcbiAgZGVzY3JpcHRvcnMuY29uc3RydWN0b3IgPSB7IHdyaXRhYmxlOiB0cnVlLCBjb25maWd1cmFibGU6IHRydWUsIHZhbHVlOiBTdWJjbGFzcyB9O1xuICBkZXNjcmlwdG9ycy5zdXBlciA9IHsgY29uZmlndXJhYmxlOiB0cnVlLCB2YWx1ZTogU3VwZXJDbGFzcy5wcm90b3R5cGUgfTtcbiAgU3ViY2xhc3MucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSh0aGlzLnByb3RvdHlwZSwgZGVzY3JpcHRvcnMpO1xuICBpZiAodHlwZW9mIFN1cGVyQ2xhc3Mub25FeHRlbmQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAvLyBBbGxvdyBmb3IgY3VzdG9taXppbmcgdGhlIGRlZmluaXRpb25zIG9mIHlvdXIgY2hpbGQgY2xhc3Nlc1xuICAgIFN1cGVyQ2xhc3Mub25FeHRlbmQoU3ViY2xhc3MsIHByb3RvdHlwZXMpO1xuICB9XG4gIHJldHVybiBTdWJjbGFzcztcbn1cblxuLy8gR2V0IGRlc2NyaXB0b3JzIChhbGxvd3MgZm9yIGdldHRlcnMgYW5kIHNldHRlcnMpIGFuZCBzZXRzIGZ1bmN0aW9ucyB0byBiZSBub24tZW51bWVyYWJsZVxuZnVuY3Rpb24gZ2V0RGVzY3JpcHRvcnMob2JqZWN0cykge1xuICB2YXIgZGVzY3JpcHRvcnMgPSB7fTtcblxuICBvYmplY3RzLmZvckVhY2goZnVuY3Rpb24ob2JqZWN0KSB7XG4gICAgaWYgKHR5cGVvZiBvYmplY3QgPT09ICdmdW5jdGlvbicpIG9iamVjdCA9IG9iamVjdC5wcm90b3R5cGU7XG5cbiAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvYmplY3QpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgaWYgKG5hbWUgPT09ICdzdGF0aWMnKSByZXR1cm47XG5cbiAgICAgIHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmplY3QsIG5hbWUpO1xuXG4gICAgICBpZiAodHlwZW9mIGRlc2NyaXB0b3IudmFsdWUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgZGVzY3JpcHRvci5lbnVtZXJhYmxlID0gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIGRlc2NyaXB0b3JzW25hbWVdID0gZGVzY3JpcHRvcjtcbiAgICB9KTtcbiAgfSk7XG4gIHJldHVybiBkZXNjcmlwdG9ycztcbn1cblxuLy8gQ29waWVzIHN0YXRpYyBtZXRob2RzIG92ZXIgZm9yIHN0YXRpYyBpbmhlcml0YW5jZVxuZnVuY3Rpb24gZXh0ZW5kU3RhdGljcyhDbGFzcywgU3ViY2xhc3MpIHtcblxuICAvLyBzdGF0aWMgbWV0aG9kIGluaGVyaXRhbmNlIChpbmNsdWRpbmcgYGV4dGVuZGApXG4gIE9iamVjdC5rZXlzKENsYXNzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihDbGFzcywga2V5KTtcbiAgICBpZiAoIWRlc2NyaXB0b3IuY29uZmlndXJhYmxlKSByZXR1cm47XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoU3ViY2xhc3MsIGtleSwgZGVzY3JpcHRvcik7XG4gIH0pO1xufVxuXG5cbi8qKlxuICogTWFrZXMgYSBuYXRpdmUgb2JqZWN0IHByZXRlbmQgdG8gYmUgYW4gaW5zdGFuY2Ugb2YgY2xhc3MgKGUuZy4gYWRkcyBtZXRob2RzIHRvIGEgRG9jdW1lbnRGcmFnbWVudCB0aGVuIGNhbGxzIHRoZVxuICogY29uc3RydWN0b3IpLlxuICovXG5mdW5jdGlvbiBtYWtlSW5zdGFuY2VPZihvYmplY3QpIHtcbiAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKG9iamVjdCwgZ2V0RGVzY3JpcHRvcnMoW3RoaXMucHJvdG90eXBlXSkpO1xuICB0aGlzLmFwcGx5KG9iamVjdCwgYXJncyk7XG4gIHJldHVybiBvYmplY3Q7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IEV2ZW50VGFyZ2V0O1xudmFyIENsYXNzID0gcmVxdWlyZSgnLi9jbGFzcycpO1xuXG4vKipcbiAqIEEgYnJvd3Nlci1iYXNlZCBldmVudCBlbWl0dGVyIHRoYXQgdGFrZXMgYWR2YW50YWdlIG9mIHRoZSBidWlsdC1pbiBDKysgZXZlbnRpbmcgdGhlIGJyb3dzZXIgcHJvdmlkZXMsIGdpdmluZyBhXG4gKiBjb25zaXN0ZW50IGV2ZW50aW5nIG1lY2hhbmlzbSBldmVyeXdoZXJlIGluIHlvdXIgZnJvbnQtZW5kIGFwcC5cbiAqL1xuZnVuY3Rpb24gRXZlbnRUYXJnZXQoKSB7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnX19ldmVudF9ub2RlJywgeyB2YWx1ZTogZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpIH0pO1xufVxuXG5cbkNsYXNzLmV4dGVuZChFdmVudFRhcmdldCwge1xuICAvLyBBZGQgZXZlbnQgbGlzdGVuZXJcbiAgYWRkRXZlbnRMaXN0ZW5lcjogZnVuY3Rpb24gYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcikge1xuICAgIHRoaXMuX19ldmVudF9ub2RlLmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgbGlzdGVuZXIpO1xuICB9LFxuXG4gIG9uOiBmdW5jdGlvbiBvbih0eXBlLCBsaXN0ZW5lcikge1xuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcik7XG4gIH0sXG5cbiAgLy8gUmVtb3ZlcyBldmVudCBsaXN0ZW5lclxuICByZW1vdmVFdmVudExpc3RlbmVyOiBmdW5jdGlvbiByZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyKSB7XG4gICAgdGhpcy5fX2V2ZW50X25vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcik7XG4gICAgaWYgKGxpc3RlbmVyICYmIGxpc3RlbmVyLl9fZXZlbnRfb25lKSB7XG4gICAgICB0aGlzLl9fZXZlbnRfbm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyLl9fZXZlbnRfb25lKTtcbiAgICB9XG4gIH0sXG5cbiAgb2ZmOiBmdW5jdGlvbiBvZmYodHlwZSwgbGlzdGVuZXIpIHtcbiAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgbGlzdGVuZXIpO1xuICB9LFxuXG4gIC8vIEFkZCBldmVudCBsaXN0ZW5lciB0byBvbmx5IGdldCBjYWxsZWQgb25jZSwgcmV0dXJucyB3cmFwcGVkIG1ldGhvZCBmb3IgcmVtb3ZpbmcgaWYgbmVlZGVkXG4gIG9uZTogZnVuY3Rpb24gb25lKHR5cGUsIGxpc3RlbmVyKSB7XG4gICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJykgcmV0dXJuO1xuXG4gICAgaWYgKCFsaXN0ZW5lci5fX2V2ZW50X29uZSkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGxpc3RlbmVyLCAnX19ldmVudF9vbmUnLCB7IHZhbHVlOiBmdW5jdGlvbihldmVudCkge1xuICAgICAgICBzZWxmLnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgbGlzdGVuZXIuX19ldmVudF9vbmUpO1xuICAgICAgICBsaXN0ZW5lci5jYWxsKHNlbGYsIGV2ZW50KTtcbiAgICAgIH19KTtcbiAgICB9XG5cbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgbGlzdGVuZXIuX19ldmVudF9vbmUpO1xuICB9LFxuXG4gIC8vIERpc3BhdGNoIGV2ZW50IGFuZCB0cmlnZ2VyIGxpc3RlbmVyc1xuICBkaXNwYXRjaEV2ZW50OiBmdW5jdGlvbiBkaXNwYXRjaEV2ZW50KGV2ZW50KSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGV2ZW50LCAndGFyZ2V0JywgeyB2YWx1ZTogdGhpcyB9KTtcbiAgICByZXR1cm4gdGhpcy5fX2V2ZW50X25vZGUuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gIH1cbn0pO1xuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL3NyYy9jaGlwJyk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IEFwcDtcbnZhciBjb21wb25lbnRCaW5kaW5nID0gcmVxdWlyZSgnZnJhZ21lbnRzLWJ1aWx0LWlucy9iaW5kZXJzL2NvbXBvbmVudCcpO1xudmFyIExvY2F0aW9uID0gcmVxdWlyZSgncm91dGVzLWpzJykuTG9jYXRpb247XG52YXIgRXZlbnRUYXJnZXQgPSByZXF1aXJlKCdjaGlwLXV0aWxzL2V2ZW50LXRhcmdldCcpO1xudmFyIGNyZWF0ZUZyYWdtZW50cyA9IHJlcXVpcmUoJy4vZnJhZ21lbnRzJyk7XG52YXIgZGVmYXVsdE1peGluID0gcmVxdWlyZSgnLi9taXhpbnMvZGVmYXVsdCcpO1xudmFyIHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xuXG4vLyAjIENoaXAgQXBwXG5cbi8vIEFuIEFwcCByZXByZXNlbnRzIGFuIGFwcCBvciBtb2R1bGUgdGhhdCBjYW4gaGF2ZSByb3V0ZXMsIGNvbnRyb2xsZXJzLCBhbmQgdGVtcGxhdGVzIGRlZmluZWQuXG5mdW5jdGlvbiBBcHAob3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgRXZlbnRUYXJnZXQuY2FsbCh0aGlzKTtcbiAgdGhpcy5mcmFnbWVudHMgPSBjcmVhdGVGcmFnbWVudHMoKTtcbiAgdGhpcy5mcmFnbWVudHMuYXBwID0gdGhpcztcbiAgdGhpcy5sb2NhdGlvbiA9IExvY2F0aW9uLmNyZWF0ZShvcHRpb25zKTtcbiAgdGhpcy5kZWZhdWx0TWl4aW4gPSBkZWZhdWx0TWl4aW4odGhpcyk7XG4gIHRoaXMuX2xpc3RlbmluZyA9IGZhbHNlO1xuXG4gIHRoaXMucm9vdEVsZW1lbnQgPSBvcHRpb25zLnJvb3RFbGVtZW50IHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgdGhpcy5zeW5jID0gdGhpcy5mcmFnbWVudHMuc3luYztcbiAgdGhpcy5zeW5jTm93ID0gdGhpcy5mcmFnbWVudHMuc3luY05vdztcbiAgdGhpcy5hZnRlclN5bmMgPSB0aGlzLmZyYWdtZW50cy5hZnRlclN5bmM7XG4gIHRoaXMub25TeW5jID0gdGhpcy5mcmFnbWVudHMub25TeW5jO1xuICB0aGlzLm9mZlN5bmMgPSB0aGlzLmZyYWdtZW50cy5vZmZTeW5jO1xuICB0aGlzLmxvY2F0aW9uLm9uKCdjaGFuZ2UnLCB0aGlzLnN5bmMpO1xufVxuXG5FdmVudFRhcmdldC5leHRlbmQoQXBwLCB7XG5cbiAgaW5pdDogZnVuY3Rpb24ocm9vdCkge1xuICAgIGlmICh0aGlzLmluaXRlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChkb2N1bWVudC5yZWFkeVN0YXRlID09PSAnbG9hZGluZycpIHtcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCB0aGlzLmluaXQuYmluZCh0aGlzLCByb290KSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5pbml0ZWQgPSB0cnVlXG4gICAgaWYgKHJvb3QpIHtcbiAgICAgIHRoaXMucm9vdEVsZW1lbnQgPSByb290O1xuICAgIH1cblxuICAgIHRoaXMuZnJhZ21lbnRzLmJpbmRFbGVtZW50KHRoaXMucm9vdEVsZW1lbnQsIHRoaXMpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG5cbiAgLy8gQ29tcG9uZW50c1xuICAvLyAtLS0tLS0tLS0tXG5cbiAgLy8gUmVnaXN0ZXJzIGEgbmV3IGNvbXBvbmVudCBieSBuYW1lIHdpdGggdGhlIGdpdmVuIGRlZmluaXRpb24uIHByb3ZpZGVkIGBjb250ZW50YCBzdHJpbmcuIElmIG5vIGBjb250ZW50YCBpcyBnaXZlblxuICAvLyB0aGVuIHJldHVybnMgYSBuZXcgaW5zdGFuY2Ugb2YgYSBkZWZpbmVkIHRlbXBsYXRlLiBUaGlzIGluc3RhbmNlIGlzIGEgZG9jdW1lbnQgZnJhZ21lbnQuXG4gIGNvbXBvbmVudDogZnVuY3Rpb24obmFtZSwgZGVmaW5pdGlvbikge1xuICAgIHZhciBkZWZpbml0aW9ucyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICBkZWZpbml0aW9ucy51bnNoaWZ0KHRoaXMuZGVmYXVsdE1peGluKTtcbiAgICB0aGlzLmZyYWdtZW50cy5yZWdpc3RlckVsZW1lbnQobmFtZSwgY29tcG9uZW50QmluZGluZy5hcHBseShudWxsLCBkZWZpbml0aW9ucykpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG5cbiAgLy8gUmVkaXJlY3RzIHRvIHRoZSBwcm92aWRlZCBVUkxcbiAgcmVkaXJlY3Q6IGZ1bmN0aW9uKHVybCkge1xuICAgIHJldHVybiB0aGlzLmxvY2F0aW9uLnVybCA9IHVybDtcbiAgfSxcblxuXG4gIGdldCBsaXN0ZW5pbmcoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2xpc3RlbmluZztcbiAgfSxcblxuICAvLyBMaXN0ZW4gdG8gVVJMIGNoYW5nZXNcbiAgbGlzdGVuOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgYXBwID0gdGhpcztcbiAgICB0aGlzLl9saXN0ZW5pbmcgPSB0cnVlO1xuXG4gICAgaWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgPT09ICdsb2FkaW5nJykge1xuICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIHRoaXMubGlzdGVuLmJpbmQodGhpcykpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLy8gQWRkIGhhbmRsZXIgZm9yIHdoZW4gdGhlIHJvdXRlIGNoYW5nZXNcbiAgICB0aGlzLl9sb2NhdGlvbkNoYW5nZUhhbmRsZXIgPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgYXBwLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCd1cmxDaGFuZ2UnLCB7IGRldGFpbDogZXZlbnQuZGV0YWlsIH0pKTtcbiAgICB9O1xuXG4gICAgLy8gQWRkIGhhbmRsZXIgZm9yIGNsaWNraW5nIGxpbmtzXG4gICAgdGhpcy5fY2xpY2tIYW5kbGVyID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgIHZhciBhbmNob3I7XG4gICAgICBpZiAoICEoYW5jaG9yID0gZXZlbnQudGFyZ2V0LmNsb3Nlc3QoJ2FbaHJlZl0nKSkgKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKGV2ZW50LmRlZmF1bHRQcmV2ZW50ZWQpIHtcbiAgICAgICAgLy8gaWYgc29tZXRoaW5nIGVsc2UgYWxyZWFkeSBoYW5kbGVkIHRoaXMsIHdlIHdvbid0XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIGxpbmtIb3N0ID0gYW5jaG9yLmhvc3QucmVwbGFjZSgvOjgwJHw6NDQzJC8sICcnKTtcbiAgICAgIHZhciB1cmwgPSBhbmNob3IuZ2V0QXR0cmlidXRlKCdocmVmJykucmVwbGFjZSgvXiMvLCAnJyk7XG5cbiAgICAgIGlmIChsaW5rSG9zdCAmJiBsaW5rSG9zdCAhPT0gbG9jYXRpb24uaG9zdCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChldmVudC5tZXRhS2V5IHx8IGV2ZW50LmN0cmxLZXkgfHwgYW5jaG9yLmhhc0F0dHJpYnV0ZSgndGFyZ2V0JykpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgaWYgKGFuY2hvci5ocmVmID09PSBsb2NhdGlvbi5ocmVmICsgJyMnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKCFhbmNob3IuZGlzYWJsZWQpIHtcbiAgICAgICAgYXBwLnJlZGlyZWN0KHVybCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMubG9jYXRpb24ub24oJ2NoYW5nZScsIHRoaXMuX2xvY2F0aW9uQ2hhbmdlSGFuZGxlcik7XG4gICAgdGhpcy5yb290RWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuX2NsaWNrSGFuZGxlcik7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgndXJsQ2hhbmdlJywgeyBkZXRhaWw6IHsgdXJsOiB0aGlzLmxvY2F0aW9uLnVybCB9fSkpO1xuICB9LFxuXG4gIC8vIFN0b3AgbGlzdGVuaW5nXG4gIHN0b3A6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMubG9jYXRpb24ub2ZmKCdjaGFuZ2UnLCB0aGlzLl9sb2NhdGlvbkNoYW5nZUhhbmRsZXIpO1xuICAgIHRoaXMucm9vdEVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLl9jbGlja0hhbmRsZXIpO1xuICB9XG5cbn0pOyIsInZhciBSb3V0ZSA9IHJlcXVpcmUoJ3JvdXRlcy1qcycpLlJvdXRlO1xudmFyIElmQmluZGVyID0gcmVxdWlyZSgnZnJhZ21lbnRzLWJ1aWx0LWlucy9iaW5kZXJzL2lmJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gIHZhciBpZkJpbmRlciA9IElmQmluZGVyKCk7XG5cbiAgaWZCaW5kZXIuY29tcGlsZWQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmFwcCA9IHRoaXMuZnJhZ21lbnRzLmFwcDtcbiAgICB0aGlzLnJvdXRlcyA9IFtdO1xuICAgIHRoaXMudGVtcGxhdGVzID0gW107XG4gICAgdGhpcy5leHByZXNzaW9uID0gJyc7XG5cbiAgICAvLyBlYWNoIGNoaWxkIHdpdGggYSBbcGF0aF0gYXR0cmlidXRlIHdpbGwgZGlzcGxheSBvbmx5IHdoZW4gaXRzIHBhdGggbWF0Y2hlcyB0aGUgVVJMXG4gICAgd2hpbGUgKHRoaXMuZWxlbWVudC5maXJzdENoaWxkKSB7XG4gICAgICB2YXIgY2hpbGQgPSB0aGlzLmVsZW1lbnQuZmlyc3RDaGlsZDtcbiAgICAgIHRoaXMuZWxlbWVudC5yZW1vdmVDaGlsZChjaGlsZCk7XG5cbiAgICAgIGlmIChjaGlsZC5ub2RlVHlwZSAhPT0gTm9kZS5FTEVNRU5UX05PREUpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChjaGlsZC5oYXNBdHRyaWJ1dGUoJ1twYXRoXScpKSB7XG4gICAgICAgIHZhciBwYXRoID0gY2hpbGQuZ2V0QXR0cmlidXRlKCdbcGF0aF0nKTtcbiAgICAgICAgY2hpbGQucmVtb3ZlQXR0cmlidXRlKCdbcGF0aF0nKTtcbiAgICAgICAgdGhpcy5yb3V0ZXMucHVzaChuZXcgUm91dGUocGF0aCArICcqJykpO1xuICAgICAgICB0aGlzLnRlbXBsYXRlcy5wdXNoKHRoaXMuZnJhZ21lbnRzLmNyZWF0ZVRlbXBsYXRlKGNoaWxkKSk7XG4gICAgICB9IGVsc2UgaWYgKGNoaWxkLmhhc0F0dHJpYnV0ZSgnW25vcm91dGVdJykpIHtcbiAgICAgICAgY2hpbGQucmVtb3ZlQXR0cmlidXRlKCdbbm9yb3V0ZV0nKTtcbiAgICAgICAgdGhpcy50ZW1wbGF0ZXNbMF0gPSB0aGlzLmZyYWdtZW50cy5jcmVhdGVUZW1wbGF0ZShjaGlsZCk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIGlmQmluZGVyLmFkZCA9IGZ1bmN0aW9uKHZpZXcpIHtcbiAgICB0aGlzLmVsZW1lbnQuYXBwZW5kQ2hpbGQodmlldyk7XG4gIH07XG5cbiAgaWZCaW5kZXIuY3JlYXRlZCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMub25VcmxDaGFuZ2UgPSB0aGlzLm9uVXJsQ2hhbmdlLmJpbmQodGhpcyk7XG4gIH07XG5cbiAgdmFyIGJvdW5kID0gaWZCaW5kZXIuYm91bmQ7XG4gIGlmQmluZGVyLmJvdW5kID0gZnVuY3Rpb24oKSB7XG4gICAgYm91bmQuY2FsbCh0aGlzKTtcbiAgICB2YXIgbm9kZSA9IHRoaXMuZWxlbWVudC5wYXJlbnROb2RlO1xuICAgIHdoaWxlIChub2RlICYmIG5vZGUubWF0Y2hlZFJvdXRlUGF0aCkge1xuICAgICAgbm9kZSA9IG5vZGUucGFyZW50Tm9kZTtcbiAgICB9XG4gICAgdGhpcy5iYXNlVVJJID0gbm9kZS5tYXRjaGVkUm91dGVQYXRoIHx8ICcnO1xuICAgIHRoaXMuYXBwLm9uKCd1cmxDaGFuZ2UnLCB0aGlzLm9uVXJsQ2hhbmdlKTtcbiAgICBpZiAodGhpcy5hcHAubGlzdGVuaW5nKSB7XG4gICAgICB0aGlzLm9uVXJsQ2hhbmdlKCk7XG4gICAgfVxuICB9O1xuXG4gIGlmQmluZGVyLm9uVXJsQ2hhbmdlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHVybCA9IHRoaXMuYXBwLmxvY2F0aW9uLnVybDtcbiAgICB2YXIgbmV3SW5kZXg7XG5cbiAgICBpZiAodXJsLmluZGV4T2YodGhpcy5iYXNlVVJJKSA9PT0gMCkge1xuICAgICAgdXJsID0gdXJsLnJlcGxhY2UodGhpcy5iYXNlVVJJLCAnJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIG5vIHJvdXRlcyBzaG91bGQgbWF0Y2ggdGhpcyB1cmwgc2luY2UgaXQgaXNuJ3Qgd2l0aGluIG91ciBzdWJwYXRoXG4gICAgICB1cmwgPSBudWxsO1xuICAgIH1cblxuICAgIGlmICh1cmwgIT09IG51bGwpIHtcbiAgICAgIHRoaXMucm91dGVzLnNvbWUoZnVuY3Rpb24ocm91dGUsIGluZGV4KSB7XG4gICAgICAgIGlmIChyb3V0ZS5tYXRjaCh1cmwpKSB7XG4gICAgICAgICAgdmFyIGFmdGVyTGVuZ3RoID0gcm91dGUucGFyYW1zWycqJ10ubGVuZ3RoO1xuICAgICAgICAgIHRoaXMubWF0Y2hlZFJvdXRlUGF0aCA9IGFmdGVyTGVuZ3RoID8gdXJsLnNsaWNlKDAsIC1hZnRlckxlbmd0aCkgOiB1cmw7XG4gICAgICAgICAgdGhpcy5jb250ZXh0LnBhcmFtcyA9IHJvdXRlLnBhcmFtcztcbiAgICAgICAgICBuZXdJbmRleCA9IGluZGV4O1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICB9LCB0aGlzKTtcbiAgICB9XG5cbiAgICBpZiAobmV3SW5kZXggIT09IHRoaXMuY3VycmVudEluZGV4KSB7XG4gICAgICB0aGlzLmN1cnJlbnRJbmRleCA9IG5ld0luZGV4O1xuICAgICAgdGhpcy51cGRhdGVkKHRoaXMuY3VycmVudEluZGV4KTtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIGlmQmluZGVyO1xufTtcbiIsInZhciBBcHAgPSByZXF1aXJlKCcuL2FwcCcpO1xuXG4vLyAjIENoaXBcblxuLy8gPiBDaGlwLmpzIDIuMC4wXG4vL1xuLy8gPiAoYykgMjAxMyBKYWNvYiBXcmlnaHQsIFRlYW1TbmFwXG4vLyBDaGlwIG1heSBiZSBmcmVlbHkgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxuLy8gRm9yIGFsbCBkZXRhaWxzIGFuZCBkb2N1bWVudGF0aW9uOlxuLy8gPGh0dHBzOi8vZ2l0aHViLmNvbS90ZWFtc25hcC9jaGlwLz5cblxuLy8gQ29udGVudHNcbi8vIC0tLS0tLS0tXG4vLyAqIFtjaGlwXShjaGlwLmh0bWwpIHRoZSBuYW1lc3BhY2UsIGNyZWF0ZXMgYXBwcywgYW5kIHJlZ2lzdGVycyBiaW5kaW5ncyBhbmQgZmlsdGVyc1xuLy8gKiBbQXBwXShhcHAuaHRtbCkgcmVwcmVzZW50cyBhbiBhcHAgdGhhdCBjYW4gaGF2ZSByb3V0ZXMsIGNvbnRyb2xsZXJzLCBhbmQgdGVtcGxhdGVzIGRlZmluZWRcbi8vICogW0NvbnRyb2xsZXJdKGNvbnRyb2xsZXIuaHRtbCkgaXMgdXNlZCBpbiB0aGUgYmluZGluZyB0byBhdHRhY2ggZGF0YSBhbmQgcnVuIGFjdGlvbnNcbi8vICogW1JvdXRlcl0ocm91dGVyLmh0bWwpIGlzIHVzZWQgZm9yIGhhbmRsaW5nIFVSTCByb3VudGluZ1xuLy8gKiBbRGVmYXVsdCBiaW5kZXJzXShiaW5kZXJzLmh0bWwpIHJlZ2lzdGVycyB0aGUgZGVmYXVsdCBiaW5kZXJzIGNoaXAgcHJvdmlkZXNcblxuLy8gQ3JlYXRlIENoaXAgQXBwXG4vLyAtLS0tLS0tLS0tLS0tXG4vLyBDcmVhdGVzIGEgbmV3IGNoaXAgYXBwXG5tb2R1bGUuZXhwb3J0cyA9IGNoaXA7XG5cbmZ1bmN0aW9uIGNoaXAob3B0aW9ucykge1xuICB2YXIgYXBwID0gbmV3IEFwcChvcHRpb25zKTtcbiAgYXBwLmluaXQoKTtcbiAgcmV0dXJuIGFwcDtcbn1cblxuY2hpcC5BcHAgPSBBcHA7XG4iLCJ2YXIgY3JlYXRlRnJhZ21lbnRzID0gcmVxdWlyZSgnZnJhZ21lbnRzLWpzJykuY3JlYXRlO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuXG4gIHZhciBmcmFnbWVudHMgPSBjcmVhdGVGcmFnbWVudHMoKTtcblxuICAvLyBDb25maWd1cmVcbiAgZnJhZ21lbnRzLnNldEV4cHJlc3Npb25EZWxpbWl0ZXJzKCdhdHRyaWJ1dGUnLCAne3snLCAnfX0nLCB0cnVlKTtcbiAgZnJhZ21lbnRzLmFuaW1hdGVBdHRyaWJ1dGUgPSAnW2FuaW1hdGVdJztcbiAgcmVxdWlyZSgnZnJhZ21lbnRzLWJ1aWx0LWlucy9hbmltYXRpb25zJykoZnJhZ21lbnRzKTtcbiAgcmVxdWlyZSgnZnJhZ21lbnRzLWJ1aWx0LWlucy9mb3JtYXR0ZXJzJykoZnJhZ21lbnRzKTtcblxuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJyhrZXlkb3duOiopJywgcmVxdWlyZSgnZnJhZ21lbnRzLWJ1aWx0LWlucy9iaW5kZXJzL2tleS1ldmVudHMnKShudWxsLCAna2V5ZG93bicpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCcoa2V5dXA6KiknLCByZXF1aXJlKCdmcmFnbWVudHMtYnVpbHQtaW5zL2JpbmRlcnMva2V5LWV2ZW50cycpKG51bGwsICdrZXl1cCcpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCcoKiknLCByZXF1aXJlKCdmcmFnbWVudHMtYnVpbHQtaW5zL2JpbmRlcnMvZXZlbnRzJykoKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgneyp9JywgcmVxdWlyZSgnZnJhZ21lbnRzLWJ1aWx0LWlucy9iaW5kZXJzL3Byb3BlcnRpZXMnKSgpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCd7eyp9fScsIHJlcXVpcmUoJ2ZyYWdtZW50cy1idWlsdC1pbnMvYmluZGVycy9wcm9wZXJ0aWVzLTItd2F5JykoKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnKj8nLCByZXF1aXJlKCdmcmFnbWVudHMtYnVpbHQtaW5zL2JpbmRlcnMvYXR0cmlidXRlLW5hbWVzJykoKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnW3Nob3ddJywgcmVxdWlyZSgnZnJhZ21lbnRzLWJ1aWx0LWlucy9iaW5kZXJzL3Nob3cnKShmYWxzZSkpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ1toaWRlXScsIHJlcXVpcmUoJ2ZyYWdtZW50cy1idWlsdC1pbnMvYmluZGVycy9zaG93JykodHJ1ZSkpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ1tmb3JdJywgcmVxdWlyZSgnZnJhZ21lbnRzLWJ1aWx0LWlucy9iaW5kZXJzL3JlcGVhdCcpKCkpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJyMqJywgcmVxdWlyZSgnZnJhZ21lbnRzLWJ1aWx0LWlucy9iaW5kZXJzL3JlZicpKCkpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ1t0ZXh0XScsIHJlcXVpcmUoJ2ZyYWdtZW50cy1idWlsdC1pbnMvYmluZGVycy90ZXh0JykoKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnW2h0bWxdJywgcmVxdWlyZSgnZnJhZ21lbnRzLWJ1aWx0LWlucy9iaW5kZXJzL2h0bWwnKSgpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdbc3JjXScsIHJlcXVpcmUoJ2ZyYWdtZW50cy1idWlsdC1pbnMvYmluZGVycy9wcm9wZXJ0aWVzJykoJ3NyYycpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdbbG9nXScsIHJlcXVpcmUoJ2ZyYWdtZW50cy1idWlsdC1pbnMvYmluZGVycy9sb2cnKSgpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdbLipdJywgcmVxdWlyZSgnZnJhZ21lbnRzLWJ1aWx0LWlucy9iaW5kZXJzL2NsYXNzZXMnKSgpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdbc3R5bGUuKl0nLCByZXF1aXJlKCdmcmFnbWVudHMtYnVpbHQtaW5zL2JpbmRlcnMvc3R5bGVzJykoKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnW2F1dG9mb2N1c10nLCByZXF1aXJlKCdmcmFnbWVudHMtYnVpbHQtaW5zL2JpbmRlcnMvYXV0b2ZvY3VzJykoKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnW2F1dG9zZWxlY3RdJywgcmVxdWlyZSgnZnJhZ21lbnRzLWJ1aWx0LWlucy9iaW5kZXJzL2F1dG9zZWxlY3QnKSgpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdbdmFsdWVdJywgcmVxdWlyZSgnZnJhZ21lbnRzLWJ1aWx0LWlucy9iaW5kZXJzL3ZhbHVlJykoXG4gICAgJ1t2YWx1ZS1ldmVudHNdJyxcbiAgICAnW3ZhbHVlLWZpZWxkXSdcbiAgKSk7XG5cbiAgdmFyIElmQmluZGluZyA9IHJlcXVpcmUoJ2ZyYWdtZW50cy1idWlsdC1pbnMvYmluZGVycy9pZicpKCdbZWxzZS1pZl0nLCAnW2Vsc2VdJywgJ1t1bmxlc3NdJywgJ1t1bmxlc3MtaWZdJyk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnW2lmXScsIElmQmluZGluZyk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnW3VubGVzc10nLCBJZkJpbmRpbmcpO1xuXG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnW3JvdXRlXScsIHJlcXVpcmUoJy4vYmluZGVycy9yb3V0ZScpKCkpO1xuXG4gIHJldHVybiBmcmFnbWVudHM7XG59O1xuIiwiXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFwcCkge1xuXG4gIHJldHVybiB7XG5cbiAgICBhcHA6IGFwcCxcbiAgICBzeW5jOiBhcHAuc3luYyxcbiAgICBzeW5jTm93OiBhcHAuc3luY05vdyxcbiAgICBhZnRlclN5bmM6IGFwcC5hZnRlclN5bmMsXG4gICAgb25TeW5jOiBhcHAub25TeW5jLFxuICAgIG9mZlN5bmM6IGFwcC5vZmZTeW5jLFxuXG4gICAgY3JlYXRlZDogZnVuY3Rpb24oKSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XG4gICAgICAgIF9vYnNlcnZlcnM6IHsgY29uZmlndXJhYmxlOiB0cnVlLCB2YWx1ZTogW10gfSxcbiAgICAgICAgX2xpc3RlbmVyczogeyBjb25maWd1cmFibGU6IHRydWUsIHZhbHVlOiBbXSB9LFxuICAgICAgICBfYXR0YWNoZWQ6IHsgY29uZmlndXJhYmxlOiB0cnVlLCB2YWx1ZTogZmFsc2UgfSxcbiAgICAgIH0pO1xuICAgIH0sXG5cblxuICAgIGF0dGFjaGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuX2F0dGFjaGVkID0gdHJ1ZTtcbiAgICAgIHRoaXMuX29ic2VydmVycy5mb3JFYWNoKGZ1bmN0aW9uKG9ic2VydmVyKSB7XG4gICAgICAgIG9ic2VydmVyLmJpbmQodGhpcyk7XG4gICAgICB9LCB0aGlzKTtcblxuICAgICAgdGhpcy5fbGlzdGVuZXJzLmZvckVhY2goZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICBpdGVtLnRhcmdldC5hZGRFdmVudExpc3RlbmVyKGl0ZW0uZXZlbnROYW1lLCBpdGVtLmxpc3RlbmVyKTtcbiAgICAgIH0pO1xuICAgIH0sXG5cblxuICAgIGRldGFjaGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuX2F0dGFjaGVkID0gZmFsc2U7XG4gICAgICB0aGlzLl9vYnNlcnZlcnMuZm9yRWFjaChmdW5jdGlvbihvYnNlcnZlcikge1xuICAgICAgICBvYnNlcnZlci51bmJpbmQoKTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLl9saXN0ZW5lcnMuZm9yRWFjaChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIGl0ZW0udGFyZ2V0LnJlbW92ZUV2ZW50TGlzdGVuZXIoaXRlbS5ldmVudE5hbWUsIGl0ZW0ubGlzdGVuZXIpO1xuICAgICAgfSk7XG4gICAgfSxcblxuXG4gICAgb2JzZXJ2ZTogZnVuY3Rpb24oZXhwciwgY2FsbGJhY2spIHtcbiAgICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgICB9XG5cbiAgICAgIHZhciBvYnNlcnZlciA9IGFwcC5vYnNlcnZlKGV4cHIsIGNhbGxiYWNrLCB0aGlzKTtcbiAgICAgIHRoaXMuX29ic2VydmVycy5wdXNoKG9ic2VydmVyKTtcbiAgICAgIGlmICh0aGlzLl9hdHRhY2hlZCkge1xuICAgICAgICAvLyBJZiBub3QgYXR0YWNoZWQgd2lsbCBiaW5kIG9uIGF0dGFjaG1lbnRcbiAgICAgICAgb2JzZXJ2ZXIuYmluZCh0aGlzKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvYnNlcnZlcjtcbiAgICB9LFxuXG5cbiAgICBsaXN0ZW46IGZ1bmN0aW9uKHRhcmdldCwgZXZlbnROYW1lLCBsaXN0ZW5lciwgY29udGV4dCkge1xuICAgICAgaWYgKHR5cGVvZiB0YXJnZXQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGNvbnRleHQgPSBsaXN0ZW5lcjtcbiAgICAgICAgbGlzdGVuZXIgPSBldmVudE5hbWU7XG4gICAgICAgIGV2ZW50TmFtZSA9IHRhcmdldDtcbiAgICAgICAgdGFyZ2V0ID0gdGhpcztcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgIH1cblxuICAgICAgbGlzdGVuZXIgPSBsaXN0ZW5lci5iaW5kKGNvbnRleHQgfHwgdGhpcyk7XG5cbiAgICAgIHZhciBsaXN0ZW5lckRhdGEgPSB7XG4gICAgICAgIHRhcmdldDogdGFyZ2V0LFxuICAgICAgICBldmVudE5hbWU6IGV2ZW50TmFtZSxcbiAgICAgICAgbGlzdGVuZXI6IGxpc3RlbmVyXG4gICAgICB9O1xuXG4gICAgICB0aGlzLl9saXN0ZW5lcnMucHVzaChsaXN0ZW5lckRhdGEpO1xuXG4gICAgICBpZiAodGhpcy5fYXR0YWNoZWQpIHtcbiAgICAgICAgLy8gSWYgbm90IGF0dGFjaGVkIHdpbGwgYWRkIG9uIGF0dGFjaG1lbnRcbiAgICAgICAgdGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBsaXN0ZW5lcik7XG4gICAgICB9XG4gICAgfSxcbiAgfTtcbn07XG4iLCIvKlxuQ29weXJpZ2h0IChjKSAyMDE1IEphY29iIFdyaWdodCA8amFjd3JpZ2h0QGdtYWlsLmNvbT5cblxuUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxub2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xudG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG5mdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuXG5UaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG5cblRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbklNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG5BVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG5MSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuVEhFIFNPRlRXQVJFLlxuKi9cbi8vICMgRGlmZlxuLy8gPiBCYXNlZCBvbiB3b3JrIGZyb20gR29vZ2xlJ3Mgb2JzZXJ2ZS1qcyBwb2x5ZmlsbDogaHR0cHM6Ly9naXRodWIuY29tL1BvbHltZXIvb2JzZXJ2ZS1qc1xuXG4vLyBBIG5hbWVzcGFjZSB0byBzdG9yZSB0aGUgZnVuY3Rpb25zIG9uXG52YXIgZGlmZiA9IGV4cG9ydHM7XG5cbihmdW5jdGlvbigpIHtcblxuICBkaWZmLmNsb25lID0gY2xvbmU7XG4gIGRpZmYudmFsdWVzID0gZGlmZlZhbHVlcztcbiAgZGlmZi5iYXNpYyA9IGRpZmZCYXNpYztcbiAgZGlmZi5vYmplY3RzID0gZGlmZk9iamVjdHM7XG4gIGRpZmYuYXJyYXlzID0gZGlmZkFycmF5cztcblxuXG4gIC8vIEEgY2hhbmdlIHJlY29yZCBmb3IgdGhlIG9iamVjdCBjaGFuZ2VzXG4gIGZ1bmN0aW9uIENoYW5nZVJlY29yZChvYmplY3QsIHR5cGUsIG5hbWUsIG9sZFZhbHVlKSB7XG4gICAgdGhpcy5vYmplY3QgPSBvYmplY3Q7XG4gICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHRoaXMub2xkVmFsdWUgPSBvbGRWYWx1ZTtcbiAgfVxuXG4gIC8vIEEgc3BsaWNlIHJlY29yZCBmb3IgdGhlIGFycmF5IGNoYW5nZXNcbiAgZnVuY3Rpb24gU3BsaWNlKG9iamVjdCwgaW5kZXgsIHJlbW92ZWQsIGFkZGVkQ291bnQpIHtcbiAgICBDaGFuZ2VSZWNvcmQuY2FsbCh0aGlzLCBvYmplY3QsICdzcGxpY2UnLCBTdHJpbmcoaW5kZXgpKTtcbiAgICB0aGlzLmluZGV4ID0gaW5kZXg7XG4gICAgdGhpcy5yZW1vdmVkID0gcmVtb3ZlZDtcbiAgICB0aGlzLmFkZGVkQ291bnQgPSBhZGRlZENvdW50O1xuICB9XG5cbiAgU3BsaWNlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoQ2hhbmdlUmVjb3JkLnByb3RvdHlwZSk7XG5cblxuICAvLyBDcmVhdGVzIGEgY2xvbmUgb3IgY29weSBvZiBhbiBhcnJheSBvciBvYmplY3QgKG9yIHNpbXBseSByZXR1cm5zIGEgc3RyaW5nL251bWJlci9ib29sZWFuIHdoaWNoIGFyZSBpbW11dGFibGUpXG4gIC8vIERvZXMgbm90IHByb3ZpZGUgZGVlcCBjb3BpZXMuXG4gIGZ1bmN0aW9uIGNsb25lKHZhbHVlLCBkZWVwKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICBpZiAoZGVlcCkge1xuICAgICAgICByZXR1cm4gdmFsdWUubWFwKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGNsb25lKHZhbHVlLCBkZWVwKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdmFsdWUuc2xpY2UoKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGlmICh2YWx1ZS52YWx1ZU9mKCkgIT09IHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBuZXcgdmFsdWUuY29uc3RydWN0b3IodmFsdWUudmFsdWVPZigpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBjb3B5ID0ge307XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB2YWx1ZSkge1xuICAgICAgICAgIHZhciBvYmpWYWx1ZSA9IHZhbHVlW2tleV07XG4gICAgICAgICAgaWYgKGRlZXApIHtcbiAgICAgICAgICAgIG9ialZhbHVlID0gY2xvbmUob2JqVmFsdWUsIGRlZXApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb3B5W2tleV0gPSBvYmpWYWx1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY29weTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgfVxuXG5cbiAgLy8gRGlmZnMgdHdvIHZhbHVlcywgcmV0dXJuaW5nIGEgdHJ1dGh5IHZhbHVlIGlmIHRoZXJlIGFyZSBjaGFuZ2VzIG9yIGBmYWxzZWAgaWYgdGhlcmUgYXJlIG5vIGNoYW5nZXMuIElmIHRoZSB0d29cbiAgLy8gdmFsdWVzIGFyZSBib3RoIGFycmF5cyBvciBib3RoIG9iamVjdHMsIGFuIGFycmF5IG9mIGNoYW5nZXMgKHNwbGljZXMgb3IgY2hhbmdlIHJlY29yZHMpIGJldHdlZW4gdGhlIHR3byB3aWxsIGJlXG4gIC8vIHJldHVybmVkLiBPdGhlcndpc2UgIGB0cnVlYCB3aWxsIGJlIHJldHVybmVkLlxuICBmdW5jdGlvbiBkaWZmVmFsdWVzKHZhbHVlLCBvbGRWYWx1ZSkge1xuICAgIC8vIFNob3J0Y3V0IG91dCBmb3IgdmFsdWVzIHRoYXQgYXJlIGV4YWN0bHkgZXF1YWxcbiAgICBpZiAodmFsdWUgPT09IG9sZFZhbHVlKSByZXR1cm4gZmFsc2U7XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkgJiYgQXJyYXkuaXNBcnJheShvbGRWYWx1ZSkpIHtcbiAgICAgIC8vIElmIGFuIGFycmF5IGhhcyBjaGFuZ2VkIGNhbGN1bGF0ZSB0aGUgc3BsaWNlc1xuICAgICAgdmFyIHNwbGljZXMgPSBkaWZmQXJyYXlzKHZhbHVlLCBvbGRWYWx1ZSk7XG4gICAgICByZXR1cm4gc3BsaWNlcy5sZW5ndGggPyBzcGxpY2VzIDogZmFsc2U7XG4gICAgfSBlbHNlIGlmICh2YWx1ZSAmJiBvbGRWYWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHR5cGVvZiBvbGRWYWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIC8vIElmIGFuIG9iamVjdCBoYXMgY2hhbmdlZCBjYWxjdWxhdGUgdGhlIGNobmFnZXMgYW5kIGNhbGwgdGhlIGNhbGxiYWNrXG4gICAgICAvLyBBbGxvdyBkYXRlcyBhbmQgTnVtYmVyL1N0cmluZyBvYmplY3RzIHRvIGJlIGNvbXBhcmVkXG4gICAgICB2YXIgdmFsdWVWYWx1ZSA9IHZhbHVlLnZhbHVlT2YoKTtcbiAgICAgIHZhciBvbGRWYWx1ZVZhbHVlID0gb2xkVmFsdWUudmFsdWVPZigpO1xuXG4gICAgICAvLyBBbGxvdyBkYXRlcyBhbmQgTnVtYmVyL1N0cmluZyBvYmplY3RzIHRvIGJlIGNvbXBhcmVkXG4gICAgICBpZiAodHlwZW9mIHZhbHVlVmFsdWUgIT09ICdvYmplY3QnICYmIHR5cGVvZiBvbGRWYWx1ZVZhbHVlICE9PSAnb2JqZWN0Jykge1xuICAgICAgICByZXR1cm4gdmFsdWVWYWx1ZSAhPT0gb2xkVmFsdWVWYWx1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBjaGFuZ2VSZWNvcmRzID0gZGlmZk9iamVjdHModmFsdWUsIG9sZFZhbHVlKTtcbiAgICAgICAgcmV0dXJuIGNoYW5nZVJlY29yZHMubGVuZ3RoID8gY2hhbmdlUmVjb3JkcyA6IGZhbHNlO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiBhIHZhbHVlIGhhcyBjaGFuZ2VkIGNhbGwgdGhlIGNhbGxiYWNrXG4gICAgICByZXR1cm4gZGlmZkJhc2ljKHZhbHVlLCBvbGRWYWx1ZSk7XG4gICAgfVxuICB9XG5cblxuICAvLyBEaWZmcyB0d28gYmFzaWMgdHlwZXMsIHJldHVybmluZyB0cnVlIGlmIGNoYW5nZWQgb3IgZmFsc2UgaWYgbm90XG4gIGZ1bmN0aW9uIGRpZmZCYXNpYyh2YWx1ZSwgb2xkVmFsdWUpIHtcbiAgICBpZiAodmFsdWUgJiYgb2xkVmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB0eXBlb2Ygb2xkVmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAvLyBBbGxvdyBkYXRlcyBhbmQgTnVtYmVyL1N0cmluZyBvYmplY3RzIHRvIGJlIGNvbXBhcmVkXG4gICAgICB2YXIgdmFsdWVWYWx1ZSA9IHZhbHVlLnZhbHVlT2YoKTtcbiAgICAgIHZhciBvbGRWYWx1ZVZhbHVlID0gb2xkVmFsdWUudmFsdWVPZigpO1xuXG4gICAgICAvLyBBbGxvdyBkYXRlcyBhbmQgTnVtYmVyL1N0cmluZyBvYmplY3RzIHRvIGJlIGNvbXBhcmVkXG4gICAgICBpZiAodHlwZW9mIHZhbHVlVmFsdWUgIT09ICdvYmplY3QnICYmIHR5cGVvZiBvbGRWYWx1ZVZhbHVlICE9PSAnb2JqZWN0Jykge1xuICAgICAgICByZXR1cm4gZGlmZkJhc2ljKHZhbHVlVmFsdWUsIG9sZFZhbHVlVmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIElmIGEgdmFsdWUgaGFzIGNoYW5nZWQgY2FsbCB0aGUgY2FsbGJhY2tcbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyAmJiB0eXBlb2Ygb2xkVmFsdWUgPT09ICdudW1iZXInICYmIGlzTmFOKHZhbHVlKSAmJiBpc05hTihvbGRWYWx1ZSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHZhbHVlICE9PSBvbGRWYWx1ZTtcbiAgICB9XG4gIH1cblxuXG4gIC8vIERpZmZzIHR3byBvYmplY3RzIHJldHVybmluZyBhbiBhcnJheSBvZiBjaGFuZ2UgcmVjb3Jkcy4gVGhlIGNoYW5nZSByZWNvcmQgbG9va3MgbGlrZTpcbiAgLy8gYGBgamF2YXNjcmlwdFxuICAvLyB7XG4gIC8vICAgb2JqZWN0OiBvYmplY3QsXG4gIC8vICAgdHlwZTogJ2RlbGV0ZWR8dXBkYXRlZHxuZXcnLFxuICAvLyAgIG5hbWU6ICdwcm9wZXJ0eU5hbWUnLFxuICAvLyAgIG9sZFZhbHVlOiBvbGRWYWx1ZVxuICAvLyB9XG4gIC8vIGBgYFxuICBmdW5jdGlvbiBkaWZmT2JqZWN0cyh2YWx1ZSwgb2xkVmFsdWUpIHtcbiAgICBpZiAoICEodmFsdWUgJiYgb2xkVmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB0eXBlb2Ygb2xkVmFsdWUgPT09ICdvYmplY3QnKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQm90aCB2YWx1ZXMgZm9yIGRpZmYub2JqZWN0IG11c3QgYmUgb2JqZWN0cycpO1xuICAgIH1cbiAgICB2YXIgY2hhbmdlUmVjb3JkcyA9IFtdO1xuICAgIHZhciBwcm9wLCBwcm9wT2xkVmFsdWUsIHByb3BWYWx1ZTtcblxuICAgIC8vIEdvZXMgdGhyb3VnaCB0aGUgb2xkIG9iamVjdCAoc2hvdWxkIGJlIGEgY2xvbmUpIGFuZCBsb29rIGZvciB0aGluZ3MgdGhhdCBhcmUgbm93IGdvbmUgb3IgY2hhbmdlZFxuICAgIGZvciAocHJvcCBpbiBvbGRWYWx1ZSkge1xuICAgICAgcHJvcE9sZFZhbHVlID0gb2xkVmFsdWVbcHJvcF07XG4gICAgICBwcm9wVmFsdWUgPSB2YWx1ZVtwcm9wXTtcblxuICAgICAgLy8gQWxsb3cgZm9yIHRoZSBjYXNlIG9mIG9iai5wcm9wID0gdW5kZWZpbmVkICh3aGljaCBpcyBhIG5ldyBwcm9wZXJ0eSwgZXZlbiBpZiBpdCBpcyB1bmRlZmluZWQpXG4gICAgICBpZiAocHJvcFZhbHVlICE9PSB1bmRlZmluZWQgJiYgIWRpZmZCYXNpYyhwcm9wVmFsdWUsIHByb3BPbGRWYWx1ZSkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHRoZSBwcm9wZXJ0eSBpcyBnb25lIGl0IHdhcyByZW1vdmVkXG4gICAgICBpZiAoISAocHJvcCBpbiB2YWx1ZSkpIHtcbiAgICAgICAgY2hhbmdlUmVjb3Jkcy5wdXNoKG5ldyBDaGFuZ2VSZWNvcmQodmFsdWUsICdkZWxldGUnLCBwcm9wLCBwcm9wT2xkVmFsdWUpKTtcbiAgICAgIH0gZWxzZSBpZiAoZGlmZkJhc2ljKHByb3BWYWx1ZSwgcHJvcE9sZFZhbHVlKSkge1xuICAgICAgICBjaGFuZ2VSZWNvcmRzLnB1c2gobmV3IENoYW5nZVJlY29yZCh2YWx1ZSwgJ3VwZGF0ZScsIHByb3AsIHByb3BPbGRWYWx1ZSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEdvZXMgdGhyb3VnaCB0aGUgb2xkIG9iamVjdCBhbmQgbG9va3MgZm9yIHRoaW5ncyB0aGF0IGFyZSBuZXdcbiAgICBmb3IgKHByb3AgaW4gdmFsdWUpIHtcbiAgICAgIHByb3BWYWx1ZSA9IHZhbHVlW3Byb3BdO1xuICAgICAgaWYgKCEgKHByb3AgaW4gb2xkVmFsdWUpKSB7XG4gICAgICAgIGNoYW5nZVJlY29yZHMucHVzaChuZXcgQ2hhbmdlUmVjb3JkKHZhbHVlLCAnYWRkJywgcHJvcCkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggIT09IG9sZFZhbHVlLmxlbmd0aCkge1xuICAgICAgY2hhbmdlUmVjb3Jkcy5wdXNoKG5ldyBDaGFuZ2VSZWNvcmQodmFsdWUsICd1cGRhdGUnLCAnbGVuZ3RoJywgb2xkVmFsdWUubGVuZ3RoKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNoYW5nZVJlY29yZHM7XG4gIH1cblxuXG5cblxuXG4gIHZhciBFRElUX0xFQVZFID0gMDtcbiAgdmFyIEVESVRfVVBEQVRFID0gMTtcbiAgdmFyIEVESVRfQUREID0gMjtcbiAgdmFyIEVESVRfREVMRVRFID0gMztcblxuXG4gIC8vIERpZmZzIHR3byBhcnJheXMgcmV0dXJuaW5nIGFuIGFycmF5IG9mIHNwbGljZXMuIEEgc3BsaWNlIG9iamVjdCBsb29rcyBsaWtlOlxuICAvLyBgYGBqYXZhc2NyaXB0XG4gIC8vIHtcbiAgLy8gICBpbmRleDogMyxcbiAgLy8gICByZW1vdmVkOiBbaXRlbSwgaXRlbV0sXG4gIC8vICAgYWRkZWRDb3VudDogMFxuICAvLyB9XG4gIC8vIGBgYFxuICBmdW5jdGlvbiBkaWZmQXJyYXlzKHZhbHVlLCBvbGRWYWx1ZSkge1xuICAgIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkgfHwgIUFycmF5LmlzQXJyYXkob2xkVmFsdWUpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCb3RoIHZhbHVlcyBmb3IgZGlmZi5hcnJheSBtdXN0IGJlIGFycmF5cycpO1xuICAgIH1cblxuICAgIHZhciBjdXJyZW50U3RhcnQgPSAwO1xuICAgIHZhciBjdXJyZW50RW5kID0gdmFsdWUubGVuZ3RoO1xuICAgIHZhciBvbGRTdGFydCA9IDA7XG4gICAgdmFyIG9sZEVuZCA9IG9sZFZhbHVlLmxlbmd0aDtcblxuICAgIHZhciBtaW5MZW5ndGggPSBNYXRoLm1pbihjdXJyZW50RW5kLCBvbGRFbmQpO1xuICAgIHZhciBwcmVmaXhDb3VudCA9IHNoYXJlZFByZWZpeCh2YWx1ZSwgb2xkVmFsdWUsIG1pbkxlbmd0aCk7XG4gICAgdmFyIHN1ZmZpeENvdW50ID0gc2hhcmVkU3VmZml4KHZhbHVlLCBvbGRWYWx1ZSwgbWluTGVuZ3RoIC0gcHJlZml4Q291bnQpO1xuXG4gICAgY3VycmVudFN0YXJ0ICs9IHByZWZpeENvdW50O1xuICAgIG9sZFN0YXJ0ICs9IHByZWZpeENvdW50O1xuICAgIGN1cnJlbnRFbmQgLT0gc3VmZml4Q291bnQ7XG4gICAgb2xkRW5kIC09IHN1ZmZpeENvdW50O1xuXG4gICAgaWYgKGN1cnJlbnRFbmQgLSBjdXJyZW50U3RhcnQgPT09IDAgJiYgb2xkRW5kIC0gb2xkU3RhcnQgPT09IDApIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICAvLyBpZiBub3RoaW5nIHdhcyBhZGRlZCwgb25seSByZW1vdmVkIGZyb20gb25lIHNwb3RcbiAgICBpZiAoY3VycmVudFN0YXJ0ID09PSBjdXJyZW50RW5kKSB7XG4gICAgICByZXR1cm4gWyBuZXcgU3BsaWNlKHZhbHVlLCBjdXJyZW50U3RhcnQsIG9sZFZhbHVlLnNsaWNlKG9sZFN0YXJ0LCBvbGRFbmQpLCAwKSBdO1xuICAgIH1cblxuICAgIC8vIGlmIG5vdGhpbmcgd2FzIHJlbW92ZWQsIG9ubHkgYWRkZWQgdG8gb25lIHNwb3RcbiAgICBpZiAob2xkU3RhcnQgPT09IG9sZEVuZCkge1xuICAgICAgcmV0dXJuIFsgbmV3IFNwbGljZSh2YWx1ZSwgY3VycmVudFN0YXJ0LCBbXSwgY3VycmVudEVuZCAtIGN1cnJlbnRTdGFydCkgXTtcbiAgICB9XG5cbiAgICAvLyBhIG1peHR1cmUgb2YgYWRkcyBhbmQgcmVtb3Zlc1xuICAgIHZhciBkaXN0YW5jZXMgPSBjYWxjRWRpdERpc3RhbmNlcyh2YWx1ZSwgY3VycmVudFN0YXJ0LCBjdXJyZW50RW5kLCBvbGRWYWx1ZSwgb2xkU3RhcnQsIG9sZEVuZCk7XG4gICAgdmFyIG9wcyA9IHNwbGljZU9wZXJhdGlvbnNGcm9tRWRpdERpc3RhbmNlcyhkaXN0YW5jZXMpO1xuXG4gICAgdmFyIHNwbGljZSA9IG51bGw7XG4gICAgdmFyIHNwbGljZXMgPSBbXTtcbiAgICB2YXIgaW5kZXggPSBjdXJyZW50U3RhcnQ7XG4gICAgdmFyIG9sZEluZGV4ID0gb2xkU3RhcnQ7XG5cbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IG9wcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIHZhciBvcCA9IG9wc1tpXTtcbiAgICAgIGlmIChvcCA9PT0gRURJVF9MRUFWRSkge1xuICAgICAgICBpZiAoc3BsaWNlKSB7XG4gICAgICAgICAgc3BsaWNlcy5wdXNoKHNwbGljZSk7XG4gICAgICAgICAgc3BsaWNlID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGluZGV4Kys7XG4gICAgICAgIG9sZEluZGV4Kys7XG4gICAgICB9IGVsc2UgaWYgKG9wID09PSBFRElUX1VQREFURSkge1xuICAgICAgICBpZiAoIXNwbGljZSkge1xuICAgICAgICAgIHNwbGljZSA9IG5ldyBTcGxpY2UodmFsdWUsIGluZGV4LCBbXSwgMCk7XG4gICAgICAgIH1cblxuICAgICAgICBzcGxpY2UuYWRkZWRDb3VudCsrO1xuICAgICAgICBpbmRleCsrO1xuXG4gICAgICAgIHNwbGljZS5yZW1vdmVkLnB1c2gob2xkVmFsdWVbb2xkSW5kZXhdKTtcbiAgICAgICAgb2xkSW5kZXgrKztcbiAgICAgIH0gZWxzZSBpZiAob3AgPT09IEVESVRfQUREKSB7XG4gICAgICAgIGlmICghc3BsaWNlKSB7XG4gICAgICAgICAgc3BsaWNlID0gbmV3IFNwbGljZSh2YWx1ZSwgaW5kZXgsIFtdLCAwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNwbGljZS5hZGRlZENvdW50Kys7XG4gICAgICAgIGluZGV4Kys7XG4gICAgICB9IGVsc2UgaWYgKG9wID09PSBFRElUX0RFTEVURSkge1xuICAgICAgICBpZiAoIXNwbGljZSkge1xuICAgICAgICAgIHNwbGljZSA9IG5ldyBTcGxpY2UodmFsdWUsIGluZGV4LCBbXSwgMCk7XG4gICAgICAgIH1cblxuICAgICAgICBzcGxpY2UucmVtb3ZlZC5wdXNoKG9sZFZhbHVlW29sZEluZGV4XSk7XG4gICAgICAgIG9sZEluZGV4Kys7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHNwbGljZSkge1xuICAgICAgc3BsaWNlcy5wdXNoKHNwbGljZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNwbGljZXM7XG4gIH1cblxuXG5cblxuICAvLyBmaW5kIHRoZSBudW1iZXIgb2YgaXRlbXMgYXQgdGhlIGJlZ2lubmluZyB0aGF0IGFyZSB0aGUgc2FtZVxuICBmdW5jdGlvbiBzaGFyZWRQcmVmaXgoY3VycmVudCwgb2xkLCBzZWFyY2hMZW5ndGgpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNlYXJjaExlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoZGlmZkJhc2ljKGN1cnJlbnRbaV0sIG9sZFtpXSkpIHtcbiAgICAgICAgcmV0dXJuIGk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzZWFyY2hMZW5ndGg7XG4gIH1cblxuXG4gIC8vIGZpbmQgdGhlIG51bWJlciBvZiBpdGVtcyBhdCB0aGUgZW5kIHRoYXQgYXJlIHRoZSBzYW1lXG4gIGZ1bmN0aW9uIHNoYXJlZFN1ZmZpeChjdXJyZW50LCBvbGQsIHNlYXJjaExlbmd0aCkge1xuICAgIHZhciBpbmRleDEgPSBjdXJyZW50Lmxlbmd0aDtcbiAgICB2YXIgaW5kZXgyID0gb2xkLmxlbmd0aDtcbiAgICB2YXIgY291bnQgPSAwO1xuICAgIHdoaWxlIChjb3VudCA8IHNlYXJjaExlbmd0aCAmJiAhZGlmZkJhc2ljKGN1cnJlbnRbLS1pbmRleDFdLCBvbGRbLS1pbmRleDJdKSkge1xuICAgICAgY291bnQrKztcbiAgICB9XG4gICAgcmV0dXJuIGNvdW50O1xuICB9XG5cblxuICBmdW5jdGlvbiBzcGxpY2VPcGVyYXRpb25zRnJvbUVkaXREaXN0YW5jZXMoZGlzdGFuY2VzKSB7XG4gICAgdmFyIGkgPSBkaXN0YW5jZXMubGVuZ3RoIC0gMTtcbiAgICB2YXIgaiA9IGRpc3RhbmNlc1swXS5sZW5ndGggLSAxO1xuICAgIHZhciBjdXJyZW50ID0gZGlzdGFuY2VzW2ldW2pdO1xuICAgIHZhciBlZGl0cyA9IFtdO1xuICAgIHdoaWxlIChpID4gMCB8fCBqID4gMCkge1xuICAgICAgaWYgKGkgPT09IDApIHtcbiAgICAgICAgZWRpdHMucHVzaChFRElUX0FERCk7XG4gICAgICAgIGotLTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChqID09PSAwKSB7XG4gICAgICAgIGVkaXRzLnB1c2goRURJVF9ERUxFVEUpO1xuICAgICAgICBpLS07XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICB2YXIgbm9ydGhXZXN0ID0gZGlzdGFuY2VzW2kgLSAxXVtqIC0gMV07XG4gICAgICB2YXIgd2VzdCA9IGRpc3RhbmNlc1tpIC0gMV1bal07XG4gICAgICB2YXIgbm9ydGggPSBkaXN0YW5jZXNbaV1baiAtIDFdO1xuICAgICAgdmFyIG1pbjtcblxuICAgICAgaWYgKHdlc3QgPCBub3J0aCkge1xuICAgICAgICBtaW4gPSB3ZXN0IDwgbm9ydGhXZXN0ID8gd2VzdCA6IG5vcnRoV2VzdDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1pbiA9IG5vcnRoIDwgbm9ydGhXZXN0ID8gbm9ydGggOiBub3J0aFdlc3Q7XG4gICAgICB9XG5cbiAgICAgIGlmIChtaW4gPT09IG5vcnRoV2VzdCkge1xuICAgICAgICBpZiAobm9ydGhXZXN0ID09PSBjdXJyZW50KSB7XG4gICAgICAgICAgZWRpdHMucHVzaChFRElUX0xFQVZFKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBlZGl0cy5wdXNoKEVESVRfVVBEQVRFKTtcbiAgICAgICAgICBjdXJyZW50ID0gbm9ydGhXZXN0O1xuICAgICAgICB9XG4gICAgICAgIGktLTtcbiAgICAgICAgai0tO1xuICAgICAgfSBlbHNlIGlmIChtaW4gPT09IHdlc3QpIHtcbiAgICAgICAgZWRpdHMucHVzaChFRElUX0RFTEVURSk7XG4gICAgICAgIGktLTtcbiAgICAgICAgY3VycmVudCA9IHdlc3Q7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlZGl0cy5wdXNoKEVESVRfQUREKTtcbiAgICAgICAgai0tO1xuICAgICAgICBjdXJyZW50ID0gbm9ydGg7XG4gICAgICB9XG4gICAgfVxuICAgIGVkaXRzLnJldmVyc2UoKTtcbiAgICByZXR1cm4gZWRpdHM7XG4gIH1cblxuXG4gIGZ1bmN0aW9uIGNhbGNFZGl0RGlzdGFuY2VzKGN1cnJlbnQsIGN1cnJlbnRTdGFydCwgY3VycmVudEVuZCwgb2xkLCBvbGRTdGFydCwgb2xkRW5kKSB7XG4gICAgLy8gXCJEZWxldGlvblwiIGNvbHVtbnNcbiAgICB2YXIgcm93Q291bnQgPSBvbGRFbmQgLSBvbGRTdGFydCArIDE7XG4gICAgdmFyIGNvbHVtbkNvdW50ID0gY3VycmVudEVuZCAtIGN1cnJlbnRTdGFydCArIDE7XG4gICAgdmFyIGRpc3RhbmNlcyA9IG5ldyBBcnJheShyb3dDb3VudCk7XG4gICAgdmFyIGksIGo7XG5cbiAgICAvLyBcIkFkZGl0aW9uXCIgcm93cy4gSW5pdGlhbGl6ZSBudWxsIGNvbHVtbi5cbiAgICBmb3IgKGkgPSAwOyBpIDwgcm93Q291bnQ7IGkrKykge1xuICAgICAgZGlzdGFuY2VzW2ldID0gbmV3IEFycmF5KGNvbHVtbkNvdW50KTtcbiAgICAgIGRpc3RhbmNlc1tpXVswXSA9IGk7XG4gICAgfVxuXG4gICAgLy8gSW5pdGlhbGl6ZSBudWxsIHJvd1xuICAgIGZvciAoaiA9IDA7IGogPCBjb2x1bW5Db3VudDsgaisrKSB7XG4gICAgICBkaXN0YW5jZXNbMF1bal0gPSBqO1xuICAgIH1cblxuICAgIGZvciAoaSA9IDE7IGkgPCByb3dDb3VudDsgaSsrKSB7XG4gICAgICBmb3IgKGogPSAxOyBqIDwgY29sdW1uQ291bnQ7IGorKykge1xuICAgICAgICBpZiAoIWRpZmZCYXNpYyhjdXJyZW50W2N1cnJlbnRTdGFydCArIGogLSAxXSwgb2xkW29sZFN0YXJ0ICsgaSAtIDFdKSkge1xuICAgICAgICAgIGRpc3RhbmNlc1tpXVtqXSA9IGRpc3RhbmNlc1tpIC0gMV1baiAtIDFdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciBub3J0aCA9IGRpc3RhbmNlc1tpIC0gMV1bal0gKyAxO1xuICAgICAgICAgIHZhciB3ZXN0ID0gZGlzdGFuY2VzW2ldW2ogLSAxXSArIDE7XG4gICAgICAgICAgZGlzdGFuY2VzW2ldW2pdID0gbm9ydGggPCB3ZXN0ID8gbm9ydGggOiB3ZXN0O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRpc3RhbmNlcztcbiAgfVxufSkoKTtcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9zcmMvZXhwcmVzc2lvbnMnKTtcbiIsInZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcbnZhciBzdHJpbmdzID0gcmVxdWlyZSgnLi9zdHJpbmdzJyk7XG52YXIgZm9ybWF0dGVyUGFyc2VyID0gcmVxdWlyZSgnLi9mb3JtYXR0ZXJzJyk7XG52YXIgcHJvcGVydHlDaGFpbnMgPSByZXF1aXJlKCcuL3Byb3BlcnR5LWNoYWlucycpO1xudmFyIHZhbHVlUHJvcGVydHkgPSAnX3ZhbHVlXyc7XG52YXIgY2FjaGUgPSB7fTtcblxuZXhwb3J0cy5nbG9iYWxzID0ge307XG5cblxuZXhwb3J0cy5wYXJzZSA9IGZ1bmN0aW9uKGV4cHIsIGdsb2JhbHMsIGZvcm1hdHRlcnMsIGV4dHJhQXJncykge1xuICBpZiAoIUFycmF5LmlzQXJyYXkoZXh0cmFBcmdzKSkgZXh0cmFBcmdzID0gW107XG4gIHZhciBjYWNoZUtleSA9IGV4cHIgKyAnfCcgKyBleHRyYUFyZ3Muam9pbignLCcpO1xuICAvLyBSZXR1cm5zIHRoZSBjYWNoZWQgZnVuY3Rpb24gZm9yIHRoaXMgZXhwcmVzc2lvbiBpZiBpdCBleGlzdHMuXG4gIHZhciBmdW5jID0gY2FjaGVbY2FjaGVLZXldO1xuICBpZiAoZnVuYykge1xuICAgIHJldHVybiBmdW5jO1xuICB9XG5cbiAgdmFyIG9yaWdpbmFsID0gZXhwcjtcbiAgdmFyIGlzU2V0dGVyID0gKGV4dHJhQXJnc1swXSA9PT0gdmFsdWVQcm9wZXJ0eSk7XG5cbiAgZXhwciA9IHN0cmluZ3MucHVsbE91dFN0cmluZ3MoZXhwcik7XG4gIGV4cHIgPSBmb3JtYXR0ZXJQYXJzZXIucGFyc2VGb3JtYXR0ZXJzKGV4cHIpO1xuICBleHByID0gcHJvcGVydHlDaGFpbnMucGFyc2VFeHByZXNzaW9uKGV4cHIsIGdldFZhcmlhYmxlcyhnbG9iYWxzLCBleHRyYUFyZ3MpKTtcbiAgaWYgKCFpc1NldHRlcikge1xuICAgIHZhciBsaW5lcyA9IGV4cHIuc3BsaXQoJ1xcbicpO1xuICAgIGxpbmVzW2xpbmVzLmxlbmd0aCAtIDFdID0gJ3JldHVybiAnICsgbGluZXNbbGluZXMubGVuZ3RoIC0gMV07XG4gICAgZXhwciA9IGxpbmVzLmpvaW4oJ1xcbicpO1xuICB9XG4gIGV4cHIgPSBzdHJpbmdzLnB1dEluU3RyaW5ncyhleHByKTtcbiAgZnVuYyA9IGNvbXBpbGVFeHByZXNzaW9uKG9yaWdpbmFsLCBleHByLCBnbG9iYWxzLCBmb3JtYXR0ZXJzLCBleHRyYUFyZ3MpO1xuICBmdW5jLmV4cHIgPSBleHByO1xuICBjYWNoZVtjYWNoZUtleV0gPSBmdW5jO1xuICByZXR1cm4gZnVuYztcbn07XG5cblxuZXhwb3J0cy5wYXJzZVNldHRlciA9IGZ1bmN0aW9uKGV4cHIsIGdsb2JhbHMsIGZvcm1hdHRlcnMsIGV4dHJhQXJncykge1xuICBpZiAoIUFycmF5LmlzQXJyYXkoZXh0cmFBcmdzKSkgZXh0cmFBcmdzID0gW107XG5cbiAgLy8gQWRkIF92YWx1ZV8gYXMgdGhlIGZpcnN0IGV4dHJhIGFyZ3VtZW50XG4gIGV4dHJhQXJncy51bnNoaWZ0KHZhbHVlUHJvcGVydHkpO1xuICBpZiAoZXhwci5jaGFyQXQoMCkgPT09ICchJykge1xuICAgIC8vIEFsbG93ICchcHJvcCcgdG8gYmVjb21lICdwcm9wID0gIXZhbHVlJ1xuICAgIGV4cHIgPSBleHByLnNsaWNlKDEpLnJlcGxhY2UoLyhcXHMqXFx8fCQpLywgJyA9ICFfdmFsdWVfJDEnKTtcbiAgfSBlbHNlIHtcbiAgICBleHByID0gZXhwci5yZXBsYWNlKC8oXFxzKlxcfHwkKS8sICcgPSBfdmFsdWVfJDEnKTtcbiAgfVxuXG4gIHJldHVybiBleHBvcnRzLnBhcnNlKGV4cHIsIGdsb2JhbHMsIGZvcm1hdHRlcnMsIGV4dHJhQXJncyk7XG59O1xuXG5cbmZ1bmN0aW9uIGdldFZhcmlhYmxlcyhnbG9iYWxzLCBleHRyYUFyZ3MpIHtcbiAgdmFyIHZhcmlhYmxlcyA9IHt9O1xuXG4gIE9iamVjdC5rZXlzKGV4cG9ydHMuZ2xvYmFscykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICB2YXJpYWJsZXNba2V5XSA9IGV4cG9ydHMuZ2xvYmFsc1trZXldO1xuICB9KTtcblxuICBpZiAoZ2xvYmFscykge1xuICAgIE9iamVjdC5rZXlzKGdsb2JhbHMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICB2YXJpYWJsZXNba2V5XSA9IGdsb2JhbHNba2V5XTtcbiAgICB9KTtcbiAgfVxuXG4gIGV4dHJhQXJncy5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIHZhcmlhYmxlc1trZXldID0gbnVsbDtcbiAgfSk7XG5cbiAgcmV0dXJuIHZhcmlhYmxlcztcbn1cblxuXG5cbmZ1bmN0aW9uIGNvbXBpbGVFeHByZXNzaW9uKG9yaWdpbmFsLCBleHByLCBnbG9iYWxzLCBmb3JtYXR0ZXJzLCBleHRyYUFyZ3MpIHtcbiAgdmFyIGZ1bmMsIGFyZ3MgPSBbJ19nbG9iYWxzXycsICdfZm9ybWF0dGVyc18nXS5jb25jYXQoZXh0cmFBcmdzKS5jb25jYXQoZXhwcik7XG5cbiAgdHJ5IHtcbiAgICBmdW5jID0gRnVuY3Rpb24uYXBwbHkobnVsbCwgYXJncyk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICAvLyBUaHJvd3MgYW4gZXJyb3IgaWYgdGhlIGV4cHJlc3Npb24gd2FzIG5vdCB2YWxpZCBKYXZhU2NyaXB0XG4gICAgdGhyb3cgbmV3IEVycm9yKCdCYWQgZXhwcmVzc2lvbjogJyArIG9yaWdpbmFsICsgJ1xcbicgKyAnQ29tcGlsZWQgZXhwcmVzc2lvbjpcXG4nICsgZXhwciArICdcXG4nICsgZS5tZXNzYWdlKTtcbiAgfVxuXG4gIHJldHVybiBiaW5kQXJndW1lbnRzKGZ1bmMsIGdsb2JhbHMsIGZvcm1hdHRlcnMpO1xufVxuXG5cbi8vIGEgY3VzdG9tIFwiYmluZFwiIGZ1bmN0aW9uIHRvIGJpbmQgYXJndW1lbnRzIHRvIGEgZnVuY3Rpb24gd2l0aG91dCBiaW5kaW5nIHRoZSBjb250ZXh0XG5mdW5jdGlvbiBiaW5kQXJndW1lbnRzKGZ1bmMpIHtcbiAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZnVuYy5hcHBseSh0aGlzLCBhcmdzLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgfVxufVxuIiwiXG4vLyBmaW5kcyBwaXBlcyB0aGF0IGFyZSBub3QgT1JzIChpLmUuIGAgfCBgIG5vdCBgIHx8IGApIGZvciBmb3JtYXR0ZXJzXG52YXIgcGlwZVJlZ2V4ID0gL1xcfChcXHwpPy9nO1xuXG4vLyBBIHN0cmluZyB0aGF0IHdvdWxkIG5vdCBhcHBlYXIgaW4gdmFsaWQgSmF2YVNjcmlwdFxudmFyIHBsYWNlaG9sZGVyID0gJ0BAQCc7XG52YXIgcGxhY2Vob2xkZXJSZWdleCA9IG5ldyBSZWdFeHAoJ1xcXFxzKicgKyBwbGFjZWhvbGRlciArICdcXFxccyonKTtcblxuLy8gZGV0ZXJtaW5lcyB3aGV0aGVyIGFuIGV4cHJlc3Npb24gaXMgYSBzZXR0ZXIgb3IgZ2V0dGVyIChgbmFtZWAgdnMgYG5hbWUgPSAnYm9iJ2ApXG52YXIgc2V0dGVyUmVnZXggPSAvXFxzPVxccy87XG5cbi8vIGZpbmRzIHRoZSBwYXJ0cyBvZiBhIGZvcm1hdHRlciwgbmFtZSBhbmQgYXJncyAoZS5nLiBgZm9vKGJhcilgKVxudmFyIGZvcm1hdHRlclJlZ2V4ID0gL14oW15cXChdKykoPzpcXCgoLiopXFwpKT8kLztcblxuLy8gZmluZHMgYXJndW1lbnQgc2VwYXJhdG9ycyBmb3IgZm9ybWF0dGVycyAoYGFyZzEsIGFyZzJgKVxudmFyIGFyZ1NlcGFyYXRvciA9IC9cXHMqLFxccyovZztcblxuXG4vKipcbiAqIEZpbmRzIHRoZSBmb3JtYXR0ZXJzIHdpdGhpbiBhbiBleHByZXNzaW9uIGFuZCBjb252ZXJ0cyB0aGVtIHRvIHRoZSBjb3JyZWN0IEphdmFTY3JpcHQgZXF1aXZhbGVudC5cbiAqL1xuZXhwb3J0cy5wYXJzZUZvcm1hdHRlcnMgPSBmdW5jdGlvbihleHByKSB7XG4gIC8vIENvbnZlcnRzIGBuYW1lIHwgdXBwZXIgfCBmb28oYmFyKWAgaW50byBgbmFtZSBAQEAgdXBwZXIgQEBAIGZvbyhiYXIpYFxuICBleHByID0gZXhwci5yZXBsYWNlKHBpcGVSZWdleCwgZnVuY3Rpb24obWF0Y2gsIG9ySW5kaWNhdG9yKSB7XG4gICAgaWYgKG9ySW5kaWNhdG9yKSByZXR1cm4gbWF0Y2g7XG4gICAgcmV0dXJuIHBsYWNlaG9sZGVyO1xuICB9KTtcblxuICAvLyBzcGxpdHMgdGhlIHN0cmluZyBieSBcIkBAQFwiLCBwdWxscyBvZiB0aGUgZmlyc3QgYXMgdGhlIGV4cHIsIHRoZSByZW1haW5pbmcgYXJlIGZvcm1hdHRlcnNcbiAgZm9ybWF0dGVycyA9IGV4cHIuc3BsaXQocGxhY2Vob2xkZXJSZWdleCk7XG4gIGV4cHIgPSBmb3JtYXR0ZXJzLnNoaWZ0KCk7XG4gIGlmICghZm9ybWF0dGVycy5sZW5ndGgpIHJldHVybiBleHByO1xuXG4gIC8vIFByb2Nlc3NlcyB0aGUgZm9ybWF0dGVyc1xuICAvLyBJZiB0aGUgZXhwcmVzc2lvbiBpcyBhIHNldHRlciB0aGUgdmFsdWUgd2lsbCBiZSBydW4gdGhyb3VnaCB0aGUgZm9ybWF0dGVyc1xuICB2YXIgc2V0dGVyID0gJyc7XG4gIHZhciB2YWx1ZSA9IGV4cHI7XG5cbiAgaWYgKHNldHRlclJlZ2V4LnRlc3QoZXhwcikpIHtcbiAgICB2YXIgcGFydHMgPSBleHByLnNwbGl0KHNldHRlclJlZ2V4KTtcbiAgICBzZXR0ZXIgPSBwYXJ0c1swXSArICcgPSAnO1xuICAgIHZhbHVlID0gcGFydHNbMV07XG4gIH1cblxuICAvLyBQcm9jZXNzZXMgdGhlIGZvcm1hdHRlcnNcbiAgZm9ybWF0dGVycy5mb3JFYWNoKGZ1bmN0aW9uKGZvcm1hdHRlcikge1xuICAgIHZhciBtYXRjaCA9IGZvcm1hdHRlci50cmltKCkubWF0Y2goZm9ybWF0dGVyUmVnZXgpO1xuXG4gICAgaWYgKCFtYXRjaCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdGb3JtYXR0ZXIgaXMgaW52YWxpZDogJyArIGZvcm1hdHRlcik7XG4gICAgfVxuXG4gICAgdmFyIGZvcm1hdHRlck5hbWUgPSBtYXRjaFsxXTtcbiAgICB2YXIgYXJncyA9IG1hdGNoWzJdID8gbWF0Y2hbMl0uc3BsaXQoYXJnU2VwYXJhdG9yKSA6IFtdO1xuXG4gICAgLy8gQWRkIHRoZSBwcmV2aW91cyB2YWx1ZSBhcyB0aGUgZmlyc3QgYXJndW1lbnRcbiAgICBhcmdzLnVuc2hpZnQodmFsdWUpO1xuXG4gICAgLy8gSWYgdGhpcyBpcyBhIHNldHRlciBleHByLCBiZSBzdXJlIHRvIGFkZCB0aGUgYGlzU2V0dGVyYCBmbGFnIGF0IHRoZSBlbmQgb2YgdGhlIGZvcm1hdHRlcidzIGFyZ3VtZW50c1xuICAgIGlmIChzZXR0ZXIpIHtcbiAgICAgIGFyZ3MucHVzaCh0cnVlKTtcbiAgICB9XG5cbiAgICAvLyBTZXQgdGhlIHZhbHVlIHRvIGJlY29tZSB0aGUgcmVzdWx0IG9mIHRoaXMgZm9ybWF0dGVyLCBzbyB0aGUgbmV4dCBmb3JtYXR0ZXIgY2FuIHdyYXAgaXQuXG4gICAgLy8gQ2FsbCBmb3JtYXR0ZXJzIGluIHRoZSBjdXJyZW50IGNvbnRleHQuXG4gICAgdmFsdWUgPSAnX2Zvcm1hdHRlcnNfLicgKyBmb3JtYXR0ZXJOYW1lICsgJy5jYWxsKHRoaXMsICcgKyBhcmdzLmpvaW4oJywgJykgKyAnKSc7XG4gIH0pO1xuXG4gIHJldHVybiBzZXR0ZXIgKyB2YWx1ZTtcbn07XG4iLCJ2YXIgcmVmZXJlbmNlQ291bnQgPSAwO1xudmFyIGN1cnJlbnRSZWZlcmVuY2UgPSAwO1xudmFyIGN1cnJlbnRJbmRleCA9IDA7XG52YXIgZmluaXNoZWRDaGFpbiA9IGZhbHNlO1xudmFyIGNvbnRpbnVhdGlvbiA9IGZhbHNlO1xudmFyIGdsb2JhbHMgPSBudWxsO1xudmFyIGRlZmF1bHRHbG9iYWxzID0ge1xuICByZXR1cm46IG51bGwsXG4gIHRydWU6IG51bGwsXG4gIGZhbHNlOiBudWxsLFxuICB1bmRlZmluZWQ6IG51bGwsXG4gIG51bGw6IG51bGwsXG4gIHRoaXM6IG51bGwsXG4gIHdpbmRvdzogbnVsbCxcbiAgTWF0aDogbnVsbCxcbiAgcGFyc2VJbnQ6IG51bGwsXG4gIHBhcnNlRmxvYXQ6IG51bGwsXG4gIGlzTmFOOiBudWxsLFxuICBBcnJheTogbnVsbCxcbiAgdHlwZW9mOiBudWxsLFxuICBfZ2xvYmFsc186IG51bGwsXG4gIF9mb3JtYXR0ZXJzXzogbnVsbCxcbiAgX3ZhbHVlXzogbnVsbCxcbn07XG5cblxuLy8gbWF0Y2hlcyBwcm9wZXJ0eSBjaGFpbnMgKGUuZy4gYG5hbWVgLCBgdXNlci5uYW1lYCwgYW5kIGB1c2VyLmZ1bGxOYW1lKCkuY2FwaXRhbGl6ZSgpYClcbnZhciBwcm9wZXJ0eVJlZ2V4ID0gLygoXFx7fCx8XFwuKT9cXHMqKShbYS16JF9cXCRdKD86W2Etel9cXCQwLTlcXC4tXXxcXFtbJ1wiXFxkXStcXF0pKikoXFxzKig6fFxcKHxcXFspPykvZ2k7XG4vKipcbiAqIEJyb2tlbiBkb3duXG4gKlxuICogKChcXHt8LHxcXC4pP1xccyopXG4gKiBwcmVmaXg6IG1hdGNoZXMgb24gb2JqZWN0IGxpdGVyYWxzIHNvIHdlIGNhbiBza2lwIChpbiBgeyBmb286IGJhciB9YCBcImZvb1wiIGlzIG5vdCBhIHByb3BlcnR5KS4gQWxzbyBwaWNrcyB1cCBvblxuICogdW5maW5pc2hlZCBjaGFpbnMgdGhhdCBoYWQgZnVuY3Rpb24gY2FsbHMgb3IgYnJhY2tldHMgd2UgY291bGRuJ3QgZmluaXNoIHN1Y2ggYXMgdGhlIGRvdCBpbiBgLnRlc3RgIGFmdGVyIHRoZSBjaGFpblxuICogYGZvby5iYXIoKS50ZXN0YC5cbiAqXG4gKiAoW2EteiRfXFwkXSg/OlthLXpfXFwkMC05XFwuLV18XFxbWydcIlxcZF0rXFxdKSopXG4gKiBwcm9wZXJ0eSBjaGFpbjogbWF0Y2hlcyBwcm9wZXJ0eSBjaGFpbnMgc3VjaCBhcyB0aGUgZm9sbG93aW5nIChzdHJpbmdzJyBjb250ZW50cyBhcmUgcmVtb3ZlZCBhdCB0aGlzIHN0ZXApXG4gKiAgIGBmb28sIGZvby5iYXIsIGZvby5iYXJbMF0sIGZvby5iYXJbMF0udGVzdCwgZm9vLmJhclsnJ10udGVzdGBcbiAqICAgRG9lcyBub3QgbWF0Y2ggdGhyb3VnaCBmdW5jdGlvbnMgY2FsbHMgb3IgdGhyb3VnaCBicmFja2V0cyB3aGljaCBjb250YWluIHZhcmlhYmxlcy5cbiAqICAgYGZvby5iYXIoKS50ZXN0LCBmb28uYmFyW3Byb3BdLnRlc3RgXG4gKiAgIEluIHRoZXNlIGNhc2VzIGl0IHdvdWxkIG9ubHkgbWF0Y2ggYGZvby5iYXJgLCBgLnRlc3RgLCBhbmQgYHByb3BgXG4gKlxuICogKFxccyooOnxcXCh8XFxbKT8pXG4gKiBwb3N0Zml4OiBtYXRjaGVzIHRyYWlsaW5nIGNoYXJhY3RlcnMgdG8gZGV0ZXJtaW5lIGlmIHRoaXMgaXMgYW4gb2JqZWN0IHByb3BlcnR5IG9yIGEgZnVuY3Rpb24gY2FsbCBldGMuIFdpbGwgbWF0Y2hcbiAqIHRoZSBjb2xvbiBhZnRlciBcImZvb1wiIGluIGB7IGZvbzogJ2JhcicgfWAsIHRoZSBmaXJzdCBwYXJlbnRoZXNpcyBpbiBgb2JqLmZvbyhiYXIpYCwgdGhlIHRoZSBmaXJzdCBicmFja2V0IGluXG4gKiBgZm9vW2Jhcl1gLlxuICovXG5cbi8vIGxpbmtzIGluIGEgcHJvcGVydHkgY2hhaW5cbnZhciBjaGFpbkxpbmtzUmVnZXggPSAvXFwufFxcWy9nO1xuXG4vLyB0aGUgcHJvcGVydHkgbmFtZSBwYXJ0IG9mIGxpbmtzXG52YXIgY2hhaW5MaW5rUmVnZXggPSAvXFwufFxcW3xcXCgvO1xuXG52YXIgYW5kUmVnZXggPSAvIGFuZCAvZztcbnZhciBvclJlZ2V4ID0gLyBvciAvZztcblxuXG5leHBvcnRzLnBhcnNlRXhwcmVzc2lvbiA9IGZ1bmN0aW9uKGV4cHIsIF9nbG9iYWxzKSB7XG4gIC8vIFJlc2V0IGFsbCB2YWx1ZXNcbiAgcmVmZXJlbmNlQ291bnQgPSAwO1xuICBjdXJyZW50UmVmZXJlbmNlID0gMDtcbiAgY3VycmVudEluZGV4ID0gMDtcbiAgZmluaXNoZWRDaGFpbiA9IGZhbHNlO1xuICBjb250aW51YXRpb24gPSBmYWxzZTtcbiAgZ2xvYmFscyA9IF9nbG9iYWxzO1xuXG4gIGV4cHIgPSByZXBsYWNlQW5kc0FuZE9ycyhleHByKTtcbiAgaWYgKGV4cHIuaW5kZXhPZignID0gJykgIT09IC0xKSB7XG4gICAgdmFyIHBhcnRzID0gZXhwci5zcGxpdCgnID0gJyk7XG4gICAgdmFyIHNldHRlciA9IHBhcnRzWzBdO1xuICAgIHZhciB2YWx1ZSA9IHBhcnRzWzFdO1xuICAgIHNldHRlciA9IHBhcnNlUHJvcGVydHlDaGFpbnMoc2V0dGVyKS5yZXBsYWNlKC9eXFwofFxcKSQvZywgJycpO1xuICAgIHZhbHVlID0gcGFyc2VQcm9wZXJ0eUNoYWlucyh2YWx1ZSk7XG4gICAgZXhwciA9IHNldHRlciArICcgPSAnICsgdmFsdWU7XG4gIH0gZWxzZSB7XG4gICAgZXhwciA9IHBhcnNlUHJvcGVydHlDaGFpbnMoZXhwcik7XG4gIH1cbiAgZXhwciA9IGFkZFJlZmVyZW5jZXMoZXhwcilcblxuICAvLyBSZXNldCBhZnRlciBwYXJzZSBpcyBkb25lXG4gIGdsb2JhbHMgPSBudWxsO1xuXG4gIHJldHVybiBleHByO1xufTtcblxuXG4vKipcbiAqIEZpbmRzIGFuZCBwYXJzZXMgdGhlIHByb3BlcnR5IGNoYWlucyBpbiBhbiBleHByZXNzaW9uLlxuICovXG5mdW5jdGlvbiBwYXJzZVByb3BlcnR5Q2hhaW5zKGV4cHIpIHtcbiAgdmFyIHBhcnNlZEV4cHIgPSAnJywgY2hhaW47XG5cbiAgLy8gYWxsb3cgcmVjdXJzaW9uIChlLmcuIGludG8gZnVuY3Rpb24gYXJncykgYnkgcmVzZXR0aW5nIHByb3BlcnR5UmVnZXhcbiAgLy8gVGhpcyBpcyBtb3JlIGVmZmljaWVudCB0aGFuIGNyZWF0aW5nIGEgbmV3IHJlZ2V4IGZvciBlYWNoIGNoYWluLCBJIGFzc3VtZVxuICB2YXIgcHJldkN1cnJlbnRJbmRleCA9IGN1cnJlbnRJbmRleDtcbiAgdmFyIHByZXZMYXN0SW5kZXggPSBwcm9wZXJ0eVJlZ2V4Lmxhc3RJbmRleDtcblxuICBjdXJyZW50SW5kZXggPSAwO1xuICBwcm9wZXJ0eVJlZ2V4Lmxhc3RJbmRleCA9IDA7XG4gIHdoaWxlICgoY2hhaW4gPSBuZXh0Q2hhaW4oZXhwcikpICE9PSBmYWxzZSkge1xuICAgIHBhcnNlZEV4cHIgKz0gY2hhaW47XG4gIH1cblxuICAvLyBSZXNldCBpbmRleGVzXG4gIGN1cnJlbnRJbmRleCA9IHByZXZDdXJyZW50SW5kZXg7XG4gIHByb3BlcnR5UmVnZXgubGFzdEluZGV4ID0gcHJldkxhc3RJbmRleDtcbiAgcmV0dXJuIHBhcnNlZEV4cHI7XG59O1xuXG5cbmZ1bmN0aW9uIG5leHRDaGFpbihleHByKSB7XG4gIGlmIChmaW5pc2hlZENoYWluKSB7XG4gICAgcmV0dXJuIChmaW5pc2hlZENoYWluID0gZmFsc2UpO1xuICB9XG4gIHZhciBtYXRjaCA9IHByb3BlcnR5UmVnZXguZXhlYyhleHByKTtcbiAgaWYgKCFtYXRjaCkge1xuICAgIGZpbmlzaGVkQ2hhaW4gPSB0cnVlIC8vIG1ha2Ugc3VyZSBuZXh0IGNhbGwgd2UgcmV0dXJuIGZhbHNlXG4gICAgcmV0dXJuIGV4cHIuc2xpY2UoY3VycmVudEluZGV4KTtcbiAgfVxuXG4gIC8vIGBwcmVmaXhgIGlzIGBvYmpJbmRpY2F0b3JgIHdpdGggdGhlIHdoaXRlc3BhY2UgdGhhdCBtYXkgY29tZSBhZnRlciBpdC5cbiAgdmFyIHByZWZpeCA9IG1hdGNoWzFdO1xuXG4gIC8vIGBvYmpJbmRpY2F0b3JgIGlzIGB7YCBvciBgLGAgYW5kIGxldCdzIHVzIGtub3cgdGhpcyBpcyBhbiBvYmplY3QgcHJvcGVydHlcbiAgLy8gbmFtZSAoZS5nLiBwcm9wIGluIGB7cHJvcDpmYWxzZX1gKS5cbiAgdmFyIG9iakluZGljYXRvciA9IG1hdGNoWzJdO1xuXG4gIC8vIGBwcm9wQ2hhaW5gIGlzIHRoZSBjaGFpbiBvZiBwcm9wZXJ0aWVzIG1hdGNoZWQgKGUuZy4gYHRoaXMudXNlci5lbWFpbGApLlxuICB2YXIgcHJvcENoYWluID0gbWF0Y2hbM107XG5cbiAgLy8gYHBvc3RmaXhgIGlzIHRoZSBgY29sb25PclBhcmVuYCB3aXRoIHdoaXRlc3BhY2UgYmVmb3JlIGl0LlxuICB2YXIgcG9zdGZpeCA9IG1hdGNoWzRdO1xuXG4gIC8vIGBjb2xvbk9yUGFyZW5gIG1hdGNoZXMgdGhlIGNvbG9uICg6KSBhZnRlciB0aGUgcHJvcGVydHkgKGlmIGl0IGlzIGFuIG9iamVjdClcbiAgLy8gb3IgcGFyZW50aGVzaXMgaWYgaXQgaXMgYSBmdW5jdGlvbi4gV2UgdXNlIGBjb2xvbk9yUGFyZW5gIGFuZCBgb2JqSW5kaWNhdG9yYFxuICAvLyB0byBrbm93IGlmIGl0IGlzIGFuIG9iamVjdC5cbiAgdmFyIGNvbG9uT3JQYXJlbiA9IG1hdGNoWzVdO1xuXG4gIG1hdGNoID0gbWF0Y2hbMF07XG5cbiAgdmFyIHNraXBwZWQgPSBleHByLnNsaWNlKGN1cnJlbnRJbmRleCwgcHJvcGVydHlSZWdleC5sYXN0SW5kZXggLSBtYXRjaC5sZW5ndGgpO1xuICBjdXJyZW50SW5kZXggPSBwcm9wZXJ0eVJlZ2V4Lmxhc3RJbmRleDtcblxuICAvLyBza2lwcyBvYmplY3Qga2V5cyBlLmcuIHRlc3QgaW4gYHt0ZXN0OnRydWV9YC5cbiAgaWYgKG9iakluZGljYXRvciAmJiBjb2xvbk9yUGFyZW4gPT09ICc6Jykge1xuICAgIHJldHVybiBza2lwcGVkICsgbWF0Y2g7XG4gIH1cblxuICByZXR1cm4gc2tpcHBlZCArIHBhcnNlQ2hhaW4ocHJlZml4LCBwcm9wQ2hhaW4sIHBvc3RmaXgsIGNvbG9uT3JQYXJlbiwgZXhwcik7XG59XG5cblxuZnVuY3Rpb24gcGFyc2VDaGFpbihwcmVmaXgsIHByb3BDaGFpbiwgcG9zdGZpeCwgcGFyZW4sIGV4cHIpIHtcbiAgLy8gY29udGludWF0aW9ucyBhZnRlciBhIGZ1bmN0aW9uIChlLmcuIGBnZXRVc2VyKDEyKS5maXJzdE5hbWVgKS5cbiAgY29udGludWF0aW9uID0gcHJlZml4ID09PSAnLic7XG4gIGlmIChjb250aW51YXRpb24pIHtcbiAgICBwcm9wQ2hhaW4gPSAnLicgKyBwcm9wQ2hhaW47XG4gICAgcHJlZml4ID0gJyc7XG4gIH1cblxuICB2YXIgbGlua3MgPSBzcGxpdExpbmtzKHByb3BDaGFpbik7XG4gIHZhciBuZXdDaGFpbiA9ICcnO1xuXG4gIGlmIChsaW5rcy5sZW5ndGggPT09IDEgJiYgIWNvbnRpbnVhdGlvbiAmJiAhcGFyZW4pIHtcbiAgICBsaW5rID0gbGlua3NbMF07XG4gICAgbmV3Q2hhaW4gPSBhZGRUaGlzT3JHbG9iYWwobGluayk7XG4gIH0gZWxzZSB7XG4gICAgaWYgKCFjb250aW51YXRpb24pIHtcbiAgICAgIG5ld0NoYWluID0gJygnO1xuICAgIH1cblxuICAgIGxpbmtzLmZvckVhY2goZnVuY3Rpb24obGluaywgaW5kZXgpIHtcbiAgICAgIGlmIChpbmRleCAhPT0gbGlua3MubGVuZ3RoIC0gMSkge1xuICAgICAgICBuZXdDaGFpbiArPSBwYXJzZVBhcnQobGluaywgaW5kZXgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCFwYXJlbnNbcGFyZW5dKSB7XG4gICAgICAgICAgbmV3Q2hhaW4gKz0gJ19yZWYnICsgY3VycmVudFJlZmVyZW5jZSArIGxpbms7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKGNvbnRpbnVhdGlvbiAmJiBpbmRleCA9PT0gMCkge1xuICAgICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgICB9XG4gICAgICAgICAgcG9zdGZpeCA9IHBvc3RmaXgucmVwbGFjZShwYXJlbiwgJycpO1xuICAgICAgICAgIG5ld0NoYWluICs9IHBhcmVuID09PSAnKCcgPyBwYXJzZUZ1bmN0aW9uKGxpbmssIGluZGV4LCBleHByKSA6IHBhcnNlQnJhY2tldHMobGluaywgaW5kZXgsIGV4cHIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAoZXhwci5jaGFyQXQocHJvcGVydHlSZWdleC5sYXN0SW5kZXgpICE9PSAnLicpIHtcbiAgICAgIG5ld0NoYWluICs9ICcpJztcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcHJlZml4ICsgbmV3Q2hhaW4gKyBwb3N0Zml4O1xufVxuXG5cbmZ1bmN0aW9uIHNwbGl0TGlua3MoY2hhaW4pIHtcbiAgdmFyIGluZGV4ID0gMDtcbiAgdmFyIHBhcnRzID0gW107XG4gIHZhciBtYXRjaDtcbiAgd2hpbGUgKG1hdGNoID0gY2hhaW5MaW5rc1JlZ2V4LmV4ZWMoY2hhaW4pKSB7XG4gICAgaWYgKGNoYWluTGlua3NSZWdleC5sYXN0SW5kZXggPT09IDEpIGNvbnRpbnVlO1xuICAgIHBhcnRzLnB1c2goY2hhaW4uc2xpY2UoaW5kZXgsIGNoYWluTGlua3NSZWdleC5sYXN0SW5kZXggLSAxKSk7XG4gICAgaW5kZXggPSBjaGFpbkxpbmtzUmVnZXgubGFzdEluZGV4IC0gMTtcbiAgfVxuICBwYXJ0cy5wdXNoKGNoYWluLnNsaWNlKGluZGV4KSk7XG4gIHJldHVybiBwYXJ0cztcbn1cblxuXG5mdW5jdGlvbiBhZGRUaGlzT3JHbG9iYWwoY2hhaW4pIHtcbiAgdmFyIHByb3AgPSBjaGFpbi5zcGxpdChjaGFpbkxpbmtSZWdleCkuc2hpZnQoKTtcbiAgaWYgKGdsb2JhbHMuaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICByZXR1cm4gZ2xvYmFsc1twcm9wXSA9PT0gbnVsbCA/IGNoYWluIDogJ19nbG9iYWxzXy4nICsgY2hhaW47XG4gIH0gZWxzZSBpZiAoZGVmYXVsdEdsb2JhbHMuaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICByZXR1cm4gY2hhaW47XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuICd0aGlzLicgKyBjaGFpbjtcbiAgfVxufVxuXG5cbnZhciBwYXJlbnMgPSB7XG4gICcoJzogJyknLFxuICAnWyc6ICddJ1xufTtcblxuLy8gSGFuZGxlcyBhIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBpbiBpdHMgY29ycmVjdCBzY29wZVxuLy8gRmluZHMgdGhlIGVuZCBvZiB0aGUgZnVuY3Rpb24gYW5kIHByb2Nlc3NlcyB0aGUgYXJndW1lbnRzXG5mdW5jdGlvbiBwYXJzZUZ1bmN0aW9uKGxpbmssIGluZGV4LCBleHByKSB7XG4gIHZhciBjYWxsID0gZ2V0RnVuY3Rpb25DYWxsKGV4cHIpO1xuXG4gIC8vIEFsd2F5cyBjYWxsIGZ1bmN0aW9ucyBpbiB0aGUgc2NvcGUgb2YgdGhlIG9iamVjdCB0aGV5J3JlIGEgbWVtYmVyIG9mXG4gIGlmIChpbmRleCA9PT0gMCkge1xuICAgIGxpbmsgPSBhZGRUaGlzT3JHbG9iYWwobGluayk7XG4gIH0gZWxzZSB7XG4gICAgbGluayA9ICdfcmVmJyArIGN1cnJlbnRSZWZlcmVuY2UgKyBsaW5rO1xuICB9XG5cbiAgdmFyIGNhbGxlZExpbmsgPSBsaW5rICsgJyh+fmluc2lkZVBhcmVuc35+KSc7XG4gIGlmIChleHByLmNoYXJBdChwcm9wZXJ0eVJlZ2V4Lmxhc3RJbmRleCkgPT09ICcuJykge1xuICAgIGNhbGxlZExpbmsgPSBwYXJzZVBhcnQoY2FsbGVkTGluaywgaW5kZXgpXG4gIH1cblxuICBsaW5rID0gJ3R5cGVvZiAnICsgbGluayArICcgIT09IFxcJ2Z1bmN0aW9uXFwnID8gdm9pZCAwIDogJyArIGNhbGxlZExpbms7XG4gIHZhciBpbnNpZGVQYXJlbnMgPSBjYWxsLnNsaWNlKDEsIC0xKTtcblxuICB2YXIgcmVmID0gY3VycmVudFJlZmVyZW5jZTtcbiAgbGluayA9IGxpbmsucmVwbGFjZSgnfn5pbnNpZGVQYXJlbnN+ficsIHBhcnNlUHJvcGVydHlDaGFpbnMoaW5zaWRlUGFyZW5zKSk7XG4gIGN1cnJlbnRSZWZlcmVuY2UgPSByZWY7XG4gIHJldHVybiBsaW5rO1xufVxuXG4vLyBIYW5kbGVzIGEgYnJhY2tldGVkIGV4cHJlc3Npb24gdG8gYmUgcGFyc2VkXG5mdW5jdGlvbiBwYXJzZUJyYWNrZXRzKGxpbmssIGluZGV4LCBleHByKSB7XG4gIHZhciBjYWxsID0gZ2V0RnVuY3Rpb25DYWxsKGV4cHIpO1xuICB2YXIgaW5zaWRlQnJhY2tldHMgPSBjYWxsLnNsaWNlKDEsIC0xKTtcbiAgdmFyIGV2YWxlZExpbmsgPSBwYXJzZVBhcnQobGluaywgaW5kZXgpO1xuICBpbmRleCArPSAxO1xuICBsaW5rID0gJ1t+fmluc2lkZUJyYWNrZXRzfn5dJztcblxuICBpZiAoZXhwci5jaGFyQXQocHJvcGVydHlSZWdleC5sYXN0SW5kZXgpID09PSAnLicpIHtcbiAgICBsaW5rID0gcGFyc2VQYXJ0KGxpbmssIGluZGV4KTtcbiAgfSBlbHNlIHtcbiAgICBsaW5rID0gJ19yZWYnICsgY3VycmVudFJlZmVyZW5jZSArIGxpbms7XG4gIH1cblxuICBsaW5rID0gZXZhbGVkTGluayArIGxpbms7XG5cbiAgdmFyIHJlZiA9IGN1cnJlbnRSZWZlcmVuY2U7XG4gIGxpbmsgPSBsaW5rLnJlcGxhY2UoJ35+aW5zaWRlQnJhY2tldHN+ficsIHBhcnNlUHJvcGVydHlDaGFpbnMoaW5zaWRlQnJhY2tldHMpKTtcbiAgY3VycmVudFJlZmVyZW5jZSA9IHJlZjtcbiAgcmV0dXJuIGxpbms7XG59XG5cblxuLy8gcmV0dXJucyB0aGUgY2FsbCBwYXJ0IG9mIGEgZnVuY3Rpb24gKGUuZy4gYHRlc3QoMTIzKWAgd291bGQgcmV0dXJuIGAoMTIzKWApXG5mdW5jdGlvbiBnZXRGdW5jdGlvbkNhbGwoZXhwcikge1xuICB2YXIgc3RhcnRJbmRleCA9IHByb3BlcnR5UmVnZXgubGFzdEluZGV4O1xuICB2YXIgb3BlbiA9IGV4cHIuY2hhckF0KHN0YXJ0SW5kZXggLSAxKTtcbiAgdmFyIGNsb3NlID0gcGFyZW5zW29wZW5dO1xuICB2YXIgZW5kSW5kZXggPSBzdGFydEluZGV4IC0gMTtcbiAgdmFyIHBhcmVuQ291bnQgPSAxO1xuICB3aGlsZSAoZW5kSW5kZXgrKyA8IGV4cHIubGVuZ3RoKSB7XG4gICAgdmFyIGNoID0gZXhwci5jaGFyQXQoZW5kSW5kZXgpO1xuICAgIGlmIChjaCA9PT0gb3BlbikgcGFyZW5Db3VudCsrO1xuICAgIGVsc2UgaWYgKGNoID09PSBjbG9zZSkgcGFyZW5Db3VudC0tO1xuICAgIGlmIChwYXJlbkNvdW50ID09PSAwKSBicmVhaztcbiAgfVxuICBjdXJyZW50SW5kZXggPSBwcm9wZXJ0eVJlZ2V4Lmxhc3RJbmRleCA9IGVuZEluZGV4ICsgMTtcbiAgcmV0dXJuIG9wZW4gKyBleHByLnNsaWNlKHN0YXJ0SW5kZXgsIGVuZEluZGV4KSArIGNsb3NlO1xufVxuXG5cblxuZnVuY3Rpb24gcGFyc2VQYXJ0KHBhcnQsIGluZGV4KSB7XG4gIC8vIGlmIHRoZSBmaXJzdFxuICBpZiAoaW5kZXggPT09IDAgJiYgIWNvbnRpbnVhdGlvbikge1xuICAgIHBhcnQgPSBhZGRUaGlzT3JHbG9iYWwocGFydCk7XG4gIH0gZWxzZSB7XG4gICAgcGFydCA9ICdfcmVmJyArIGN1cnJlbnRSZWZlcmVuY2UgKyBwYXJ0O1xuICB9XG5cbiAgY3VycmVudFJlZmVyZW5jZSA9ICsrcmVmZXJlbmNlQ291bnQ7XG4gIHZhciByZWYgPSAnX3JlZicgKyBjdXJyZW50UmVmZXJlbmNlO1xuICByZXR1cm4gJygnICsgcmVmICsgJyA9ICcgKyBwYXJ0ICsgJykgPT0gbnVsbCA/IHZvaWQgMCA6ICc7XG59XG5cblxuZnVuY3Rpb24gcmVwbGFjZUFuZHNBbmRPcnMoZXhwcikge1xuICByZXR1cm4gZXhwci5yZXBsYWNlKGFuZFJlZ2V4LCAnICYmICcpLnJlcGxhY2Uob3JSZWdleCwgJyB8fCAnKTtcbn1cblxuXG4vLyBQcmVwZW5kcyByZWZlcmVuY2UgdmFyaWFibGUgZGVmaW5pdGlvbnNcbmZ1bmN0aW9uIGFkZFJlZmVyZW5jZXMoZXhwcikge1xuICBpZiAocmVmZXJlbmNlQ291bnQpIHtcbiAgICB2YXIgcmVmcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAxOyBpIDw9IHJlZmVyZW5jZUNvdW50OyBpKyspIHtcbiAgICAgIHJlZnMucHVzaCgnX3JlZicgKyBpKTtcbiAgICB9XG4gICAgZXhwciA9ICd2YXIgJyArIHJlZnMuam9pbignLCAnKSArICc7XFxuJyArIGV4cHI7XG4gIH1cbiAgcmV0dXJuIGV4cHI7XG59XG4iLCIvLyBmaW5kcyBhbGwgcXVvdGVkIHN0cmluZ3NcbnZhciBxdW90ZVJlZ2V4ID0gLyhbJ1wiXFwvXSkoXFxcXFxcMXxbXlxcMV0pKj9cXDEvZztcblxuLy8gZmluZHMgYWxsIGVtcHR5IHF1b3RlZCBzdHJpbmdzXG52YXIgZW1wdHlRdW90ZUV4cHIgPSAvKFsnXCJcXC9dKVxcMS9nO1xuXG52YXIgc3RyaW5ncyA9IG51bGw7XG5cblxuLyoqXG4gKiBSZW1vdmUgc3RyaW5ncyBmcm9tIGFuIGV4cHJlc3Npb24gZm9yIGVhc2llciBwYXJzaW5nLiBSZXR1cm5zIGEgbGlzdCBvZiB0aGUgc3RyaW5ncyB0byBhZGQgYmFjayBpbiBsYXRlci5cbiAqIFRoaXMgbWV0aG9kIGFjdHVhbGx5IGxlYXZlcyB0aGUgc3RyaW5nIHF1b3RlIG1hcmtzIGJ1dCBlbXB0aWVzIHRoZW0gb2YgdGhlaXIgY29udGVudHMuIFRoZW4gd2hlbiByZXBsYWNpbmcgdGhlbSBhZnRlclxuICogcGFyc2luZyB0aGUgY29udGVudHMganVzdCBnZXQgcHV0IGJhY2sgaW50byB0aGVpciBxdW90ZXMgbWFya3MuXG4gKi9cbmV4cG9ydHMucHVsbE91dFN0cmluZ3MgPSBmdW5jdGlvbihleHByKSB7XG4gIGlmIChzdHJpbmdzKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwdXRJblN0cmluZ3MgbXVzdCBiZSBjYWxsZWQgYWZ0ZXIgcHVsbE91dFN0cmluZ3MuJyk7XG4gIH1cblxuICBzdHJpbmdzID0gW107XG5cbiAgcmV0dXJuIGV4cHIucmVwbGFjZShxdW90ZVJlZ2V4LCBmdW5jdGlvbihzdHIsIHF1b3RlKSB7XG4gICAgc3RyaW5ncy5wdXNoKHN0cik7XG4gICAgcmV0dXJuIHF1b3RlICsgcXVvdGU7IC8vIHBsYWNlaG9sZGVyIGZvciB0aGUgc3RyaW5nXG4gIH0pO1xufTtcblxuXG4vKipcbiAqIFJlcGxhY2UgdGhlIHN0cmluZ3MgcHJldmlvdXNseSBwdWxsZWQgb3V0IGFmdGVyIHBhcnNpbmcgaXMgZmluaXNoZWQuXG4gKi9cbmV4cG9ydHMucHV0SW5TdHJpbmdzID0gZnVuY3Rpb24oZXhwcikge1xuICBpZiAoIXN0cmluZ3MpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3B1bGxPdXRTdHJpbmdzIG11c3QgYmUgY2FsbGVkIGJlZm9yZSBwdXRJblN0cmluZ3MuJyk7XG4gIH1cblxuICBleHByID0gZXhwci5yZXBsYWNlKGVtcHR5UXVvdGVFeHByLCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gc3RyaW5ncy5zaGlmdCgpO1xuICB9KTtcblxuICBzdHJpbmdzID0gbnVsbDtcblxuICByZXR1cm4gZXhwcjtcbn07XG4iLCJ2YXIgRnJhZ21lbnRzID0gcmVxdWlyZSgnLi9zcmMvZnJhZ21lbnRzJyk7XG52YXIgT2JzZXJ2YXRpb25zID0gcmVxdWlyZSgnb2JzZXJ2YXRpb25zLWpzJyk7XG5cbmZ1bmN0aW9uIGNyZWF0ZSgpIHtcbiAgdmFyIG9ic2VydmF0aW9ucyA9IE9ic2VydmF0aW9ucy5jcmVhdGUoKTtcbiAgdmFyIGZyYWdtZW50cyA9IG5ldyBGcmFnbWVudHMob2JzZXJ2YXRpb25zKTtcbiAgZnJhZ21lbnRzLnN5bmMgPSBvYnNlcnZhdGlvbnMuc3luYy5iaW5kKG9ic2VydmF0aW9ucyk7XG4gIGZyYWdtZW50cy5zeW5jTm93ID0gb2JzZXJ2YXRpb25zLnN5bmNOb3cuYmluZChvYnNlcnZhdGlvbnMpO1xuICBmcmFnbWVudHMuYWZ0ZXJTeW5jID0gb2JzZXJ2YXRpb25zLmFmdGVyU3luYy5iaW5kKG9ic2VydmF0aW9ucyk7XG4gIGZyYWdtZW50cy5vblN5bmMgPSBvYnNlcnZhdGlvbnMub25TeW5jLmJpbmQob2JzZXJ2YXRpb25zKTtcbiAgZnJhZ21lbnRzLm9mZlN5bmMgPSBvYnNlcnZhdGlvbnMub2ZmU3luYy5iaW5kKG9ic2VydmF0aW9ucyk7XG4gIHJldHVybiBmcmFnbWVudHM7XG59XG5cbi8vIENyZWF0ZSBhbiBpbnN0YW5jZSBvZiBmcmFnbWVudHMgd2l0aCB0aGUgZGVmYXVsdCBvYnNlcnZlclxubW9kdWxlLmV4cG9ydHMgPSBjcmVhdGUoKTtcbm1vZHVsZS5leHBvcnRzLmNyZWF0ZSA9IGNyZWF0ZTtcbiIsInZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcblxuLyoqXG4gKiBTaW1wbGlmaWVzIGV4dGVuZGluZyBjbGFzc2VzIGFuZCBwcm92aWRlcyBzdGF0aWMgaW5oZXJpdGFuY2UuIENsYXNzZXMgdGhhdCBuZWVkIHRvIGJlIGV4dGVuZGFibGUgc2hvdWxkXG4gKiBleHRlbmQgQ2xhc3Mgd2hpY2ggd2lsbCBnaXZlIHRoZW0gdGhlIGBleHRlbmRgIHN0YXRpYyBmdW5jdGlvbiBmb3IgdGhlaXIgc3ViY2xhc3NlcyB0byB1c2UuIEluIGFkZGl0aW9uIHRvXG4gKiBhIHByb3RvdHlwZSwgbWl4aW5zIG1heSBiZSBhZGRlZCBhcyB3ZWxsLiBFeGFtcGxlOlxuICpcbiAqIGZ1bmN0aW9uIE15Q2xhc3MoYXJnMSwgYXJnMikge1xuICogICBTdXBlckNsYXNzLmNhbGwodGhpcywgYXJnMSk7XG4gKiAgIHRoaXMuYXJnMiA9IGFyZzI7XG4gKiB9XG4gKiBTdXBlckNsYXNzLmV4dGVuZChNeUNsYXNzLCBtaXhpbjEsIEFub3RoZXJDbGFzcywge1xuICogICBmb286IGZ1bmN0aW9uKCkge1xuICogICAgIHRoaXMuX2JhcisrO1xuICogICB9LFxuICogICBnZXQgYmFyKCkge1xuICogICAgIHJldHVybiB0aGlzLl9iYXI7XG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIEluIGFkZGl0aW9uIHRvIGV4dGVuZGluZyB0aGUgc3VwZXJjbGFzcywgc3RhdGljIG1ldGhvZHMgYW5kIHByb3BlcnRpZXMgd2lsbCBiZSBjb3BpZWQgb250byB0aGUgc3ViY2xhc3MgZm9yXG4gKiBzdGF0aWMgaW5oZXJpdGFuY2UuIFRoaXMgYWxsb3dzIHRoZSBleHRlbmQgZnVuY3Rpb24gdG8gYmUgY29waWVkIHRvIHRoZSBzdWJjbGFzcyBzbyB0aGF0IGl0IG1heSBiZVxuICogc3ViY2xhc3NlZCBhcyB3ZWxsLiBBZGRpdGlvbmFsbHksIHN0YXRpYyBwcm9wZXJ0aWVzIG1heSBiZSBhZGRlZCBieSBkZWZpbmluZyB0aGVtIG9uIGEgc3BlY2lhbCBwcm90b3R5cGVcbiAqIHByb3BlcnR5IGBzdGF0aWNgIG1ha2luZyB0aGUgY29kZSBtb3JlIHJlYWRhYmxlLlxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IFRoZSBzdWJjbGFzcyBjb25zdHJ1Y3Rvci5cbiAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9uYWxdIFplcm8gb3IgbW9yZSBtaXhpbnMuIFRoZXkgY2FuIGJlIG9iamVjdHMgb3IgY2xhc3NlcyAoZnVuY3Rpb25zKS5cbiAqIEBwYXJhbSB7b2JqZWN0fSBUaGUgcHJvdG90eXBlIG9mIHRoZSBzdWJjbGFzcy5cbiAqL1xuZnVuY3Rpb24gQ2xhc3MoKSB7fVxuQ2xhc3MuZXh0ZW5kID0gZXh0ZW5kO1xuQ2xhc3MubWFrZUluc3RhbmNlT2YgPSBtYWtlSW5zdGFuY2VPZjtcbm1vZHVsZS5leHBvcnRzID0gQ2xhc3M7XG5cbmZ1bmN0aW9uIGV4dGVuZChTdWJjbGFzcyAvKiBbLCBwcm90b3R5cGUgWyxwcm90b3R5cGVdXSAqLykge1xuICB2YXIgcHJvdG90eXBlcztcblxuICAvLyBTdXBwb3J0IG5vIGNvbnN0cnVjdG9yXG4gIGlmICh0eXBlb2YgU3ViY2xhc3MgIT09ICdmdW5jdGlvbicpIHtcbiAgICBwcm90b3R5cGVzID0gc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgIHZhciBTdXBlckNsYXNzID0gdGhpcztcbiAgICBTdWJjbGFzcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgU3VwZXJDbGFzcy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgcHJvdG90eXBlcyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgfVxuXG4gIGV4dGVuZFN0YXRpY3ModGhpcywgU3ViY2xhc3MpO1xuXG4gIHByb3RvdHlwZXMuZm9yRWFjaChmdW5jdGlvbihwcm90bykge1xuICAgIGlmICh0eXBlb2YgcHJvdG8gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGV4dGVuZFN0YXRpY3MocHJvdG8sIFN1YmNsYXNzKTtcbiAgICB9IGVsc2UgaWYgKHByb3RvLmhhc093blByb3BlcnR5KCdzdGF0aWMnKSkge1xuICAgICAgZXh0ZW5kU3RhdGljcyhwcm90by5zdGF0aWMsIFN1YmNsYXNzKTtcbiAgICB9XG4gIH0pO1xuXG4gIHZhciBkZXNjcmlwdG9ycyA9IGdldERlc2NyaXB0b3JzKHByb3RvdHlwZXMpO1xuICBkZXNjcmlwdG9ycy5jb25zdHJ1Y3RvciA9IHsgd3JpdGFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSwgdmFsdWU6IFN1YmNsYXNzIH07XG4gIFN1YmNsYXNzLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUodGhpcy5wcm90b3R5cGUsIGRlc2NyaXB0b3JzKTtcbiAgcmV0dXJuIFN1YmNsYXNzO1xufVxuXG4vLyBHZXQgZGVzY3JpcHRvcnMgKGFsbG93cyBmb3IgZ2V0dGVycyBhbmQgc2V0dGVycykgYW5kIHNldHMgZnVuY3Rpb25zIHRvIGJlIG5vbi1lbnVtZXJhYmxlXG5mdW5jdGlvbiBnZXREZXNjcmlwdG9ycyhvYmplY3RzKSB7XG4gIHZhciBkZXNjcmlwdG9ycyA9IHt9O1xuXG4gIG9iamVjdHMuZm9yRWFjaChmdW5jdGlvbihvYmplY3QpIHtcbiAgICBpZiAodHlwZW9mIG9iamVjdCA9PT0gJ2Z1bmN0aW9uJykgb2JqZWN0ID0gb2JqZWN0LnByb3RvdHlwZTtcblxuICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKG9iamVjdCkuZm9yRWFjaChmdW5jdGlvbihuYW1lKSB7XG4gICAgICBpZiAobmFtZSA9PT0gJ3N0YXRpYycpIHJldHVybjtcblxuICAgICAgdmFyIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iamVjdCwgbmFtZSk7XG5cbiAgICAgIGlmICh0eXBlb2YgZGVzY3JpcHRvci52YWx1ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBkZXNjcmlwdG9yLmVudW1lcmFibGUgPSBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgZGVzY3JpcHRvcnNbbmFtZV0gPSBkZXNjcmlwdG9yO1xuICAgIH0pO1xuICB9KTtcbiAgcmV0dXJuIGRlc2NyaXB0b3JzO1xufVxuXG4vLyBDb3BpZXMgc3RhdGljIG1ldGhvZHMgb3ZlciBmb3Igc3RhdGljIGluaGVyaXRhbmNlXG5mdW5jdGlvbiBleHRlbmRTdGF0aWNzKENsYXNzLCBTdWJjbGFzcykge1xuXG4gIC8vIHN0YXRpYyBtZXRob2QgaW5oZXJpdGFuY2UgKGluY2x1ZGluZyBgZXh0ZW5kYClcbiAgT2JqZWN0LmtleXMoQ2xhc3MpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgdmFyIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKENsYXNzLCBrZXkpO1xuICAgIGlmICghZGVzY3JpcHRvci5jb25maWd1cmFibGUpIHJldHVybjtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShTdWJjbGFzcywga2V5LCBkZXNjcmlwdG9yKTtcbiAgfSk7XG59XG5cblxuLyoqXG4gKiBNYWtlcyBhIG5hdGl2ZSBvYmplY3QgcHJldGVuZCB0byBiZSBhbiBpbnN0YW5jZSBvZiBjbGFzcyAoZS5nLiBhZGRzIG1ldGhvZHMgdG8gYSBEb2N1bWVudEZyYWdtZW50IHRoZW4gY2FsbHMgdGhlXG4gKiBjb25zdHJ1Y3RvcikuXG4gKi9cbmZ1bmN0aW9uIG1ha2VJbnN0YW5jZU9mKG9iamVjdCkge1xuICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMob2JqZWN0LCBnZXREZXNjcmlwdG9ycyhbdGhpcy5wcm90b3R5cGVdKSk7XG4gIHRoaXMuYXBwbHkob2JqZWN0LCBhcmdzKTtcbiAgcmV0dXJuIG9iamVjdDtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gQW5pbWF0ZWRCaW5kaW5nO1xudmFyIGFuaW1hdGlvbiA9IHJlcXVpcmUoJy4vdXRpbC9hbmltYXRpb24nKTtcbnZhciBCaW5kaW5nID0gcmVxdWlyZSgnLi9iaW5kaW5nJyk7XG52YXIgX3N1cGVyID0gQmluZGluZy5wcm90b3R5cGU7XG5cbi8qKlxuICogQmluZGluZ3Mgd2hpY2ggZXh0ZW5kIEFuaW1hdGVkQmluZGluZyBoYXZlIHRoZSBhYmlsaXR5IHRvIGFuaW1hdGUgZWxlbWVudHMgdGhhdCBhcmUgYWRkZWQgdG8gdGhlIERPTSBhbmQgcmVtb3ZlZCBmcm9tXG4gKiB0aGUgRE9NLiBUaGlzIGFsbG93cyBtZW51cyB0byBzbGlkZSBvcGVuIGFuZCBjbG9zZWQsIGVsZW1lbnRzIHRvIGZhZGUgaW4gb3IgZHJvcCBkb3duLCBhbmQgcmVwZWF0ZWQgaXRlbXMgdG8gYXBwZWFyXG4gKiB0byBtb3ZlIChpZiB5b3UgZ2V0IGNyZWF0aXZlIGVub3VnaCkuXG4gKlxuICogVGhlIGZvbGxvd2luZyA1IG1ldGhvZHMgYXJlIGhlbHBlciBET00gbWV0aG9kcyB0aGF0IGFsbG93IHJlZ2lzdGVyZWQgYmluZGluZ3MgdG8gd29yayB3aXRoIENTUyB0cmFuc2l0aW9ucyBmb3JcbiAqIGFuaW1hdGluZyBlbGVtZW50cy4gSWYgYW4gZWxlbWVudCBoYXMgdGhlIGBhbmltYXRlYCBhdHRyaWJ1dGUgb3IgYSBtYXRjaGluZyBKYXZhU2NyaXB0IG1ldGhvZCwgdGhlc2UgaGVscGVyIG1ldGhvZHNcbiAqIHdpbGwgc2V0IGEgY2xhc3Mgb24gdGhlIG5vZGUgdG8gdHJpZ2dlciB0aGUgYW5pbWF0aW9uIGFuZC9vciBjYWxsIHRoZSBKYXZhU2NyaXB0IG1ldGhvZHMgdG8gaGFuZGxlIGl0LlxuICpcbiAqIEFuIGFuaW1hdGlvbiBtYXkgYmUgZWl0aGVyIGEgQ1NTIHRyYW5zaXRpb24sIGEgQ1NTIGFuaW1hdGlvbiwgb3IgYSBzZXQgb2YgSmF2YVNjcmlwdCBtZXRob2RzIHRoYXQgd2lsbCBiZSBjYWxsZWQuXG4gKlxuICogSWYgdXNpbmcgQ1NTLCBjbGFzc2VzIGFyZSBhZGRlZCBhbmQgcmVtb3ZlZCBmcm9tIHRoZSBlbGVtZW50LiBXaGVuIGFuIGVsZW1lbnQgaXMgaW5zZXJ0ZWQgaXQgd2lsbCByZWNlaXZlIHRoZSBgd2lsbC1cbiAqIGFuaW1hdGUtaW5gIGNsYXNzIGJlZm9yZSBiZWluZyBhZGRlZCB0byB0aGUgRE9NLCB0aGVuIGl0IHdpbGwgcmVjZWl2ZSB0aGUgYGFuaW1hdGUtaW5gIGNsYXNzIGltbWVkaWF0ZWx5IGFmdGVyIGJlaW5nXG4gKiBhZGRlZCB0byB0aGUgRE9NLCB0aGVuIGJvdGggY2xhc2VzIHdpbGwgYmUgcmVtb3ZlZCBhZnRlciB0aGUgYW5pbWF0aW9uIGlzIGNvbXBsZXRlLiBXaGVuIGFuIGVsZW1lbnQgaXMgYmVpbmcgcmVtb3ZlZFxuICogZnJvbSB0aGUgRE9NIGl0IHdpbGwgcmVjZWl2ZSB0aGUgYHdpbGwtYW5pbWF0ZS1vdXRgIGFuZCBgYW5pbWF0ZS1vdXRgIGNsYXNzZXMsIHRoZW4gdGhlIGNsYXNzZXMgd2lsbCBiZSByZW1vdmVkIG9uY2VcbiAqIHRoZSBhbmltYXRpb24gaXMgY29tcGxldGUuXG4gKlxuICogSWYgdXNpbmcgSmF2YVNjcmlwdCwgbWV0aG9kcyBtdXN0IGJlIGRlZmluZWQgIHRvIGFuaW1hdGUgdGhlIGVsZW1lbnQgdGhlcmUgYXJlIDMgc3VwcG9ydGVkIG1ldGhvZHMgd2hpY2ggY2FuIGJcbiAqXG4gKiBUT0RPIGNhY2hlIGJ5IGNsYXNzLW5hbWUgKEFuZ3VsYXIpPyBPbmx5IHN1cHBvcnQgamF2YXNjcmlwdC1zdHlsZSAoRW1iZXIpPyBBZGQgYSBgd2lsbC1hbmltYXRlLWluYCBhbmRcbiAqIGBkaWQtYW5pbWF0ZS1pbmAgZXRjLj9cbiAqIElGIGhhcyBhbnkgY2xhc3NlcywgYWRkIHRoZSBgd2lsbC1hbmltYXRlLWlufG91dGAgYW5kIGdldCBjb21wdXRlZCBkdXJhdGlvbi4gSWYgbm9uZSwgcmV0dXJuLiBDYWNoZS5cbiAqIFJVTEUgaXMgdXNlIHVuaXF1ZSBjbGFzcyB0byBkZWZpbmUgYW4gYW5pbWF0aW9uLiBPciBhdHRyaWJ1dGUgYGFuaW1hdGU9XCJmYWRlXCJgIHdpbGwgYWRkIHRoZSBjbGFzcz9cbiAqIGAuZmFkZS53aWxsLWFuaW1hdGUtaW5gLCBgLmZhZGUuYW5pbWF0ZS1pbmAsIGAuZmFkZS53aWxsLWFuaW1hdGUtb3V0YCwgYC5mYWRlLmFuaW1hdGUtb3V0YFxuICpcbiAqIEV2ZW50cyB3aWxsIGJlIHRyaWdnZXJlZCBvbiB0aGUgZWxlbWVudHMgbmFtZWQgdGhlIHNhbWUgYXMgdGhlIGNsYXNzIG5hbWVzIChlLmcuIGBhbmltYXRlLWluYCkgd2hpY2ggbWF5IGJlIGxpc3RlbmVkXG4gKiB0byBpbiBvcmRlciB0byBjYW5jZWwgYW4gYW5pbWF0aW9uIG9yIHJlc3BvbmQgdG8gaXQuXG4gKlxuICogSWYgdGhlIG5vZGUgaGFzIG1ldGhvZHMgYGFuaW1hdGVJbihkb25lKWAsIGBhbmltYXRlT3V0KGRvbmUpYCwgYGFuaW1hdGVNb3ZlSW4oZG9uZSlgLCBvciBgYW5pbWF0ZU1vdmVPdXQoZG9uZSlgXG4gKiBkZWZpbmVkIG9uIHRoZW0gdGhlbiB0aGUgaGVscGVycyB3aWxsIGFsbG93IGFuIGFuaW1hdGlvbiBpbiBKYXZhU2NyaXB0IHRvIGJlIHJ1biBhbmQgd2FpdCBmb3IgdGhlIGBkb25lYCBmdW5jdGlvbiB0b1xuICogYmUgY2FsbGVkIHRvIGtub3cgd2hlbiB0aGUgYW5pbWF0aW9uIGlzIGNvbXBsZXRlLlxuICpcbiAqIEJlIHN1cmUgdG8gYWN0dWFsbHkgaGF2ZSBhbiBhbmltYXRpb24gZGVmaW5lZCBmb3IgZWxlbWVudHMgd2l0aCB0aGUgYGFuaW1hdGVgIGNsYXNzL2F0dHJpYnV0ZSBiZWNhdXNlIHRoZSBoZWxwZXJzIHVzZVxuICogdGhlIGB0cmFuc2l0aW9uZW5kYCBhbmQgYGFuaW1hdGlvbmVuZGAgZXZlbnRzIHRvIGtub3cgd2hlbiB0aGUgYW5pbWF0aW9uIGlzIGZpbmlzaGVkLCBhbmQgaWYgdGhlcmUgaXMgbm8gYW5pbWF0aW9uXG4gKiB0aGVzZSBldmVudHMgd2lsbCBuZXZlciBiZSB0cmlnZ2VyZWQgYW5kIHRoZSBvcGVyYXRpb24gd2lsbCBuZXZlciBjb21wbGV0ZS5cbiAqL1xuZnVuY3Rpb24gQW5pbWF0ZWRCaW5kaW5nKHByb3BlcnRpZXMpIHtcbiAgdmFyIGVsZW1lbnQgPSBwcm9wZXJ0aWVzLm5vZGU7XG4gIHZhciBhbmltYXRlID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUocHJvcGVydGllcy5mcmFnbWVudHMuYW5pbWF0ZUF0dHJpYnV0ZSk7XG4gIHZhciBmcmFnbWVudHMgPSBwcm9wZXJ0aWVzLmZyYWdtZW50cztcblxuICBpZiAoYW5pbWF0ZSAhPT0gbnVsbCkge1xuICAgIGlmIChlbGVtZW50Lm5vZGVOYW1lID09PSAnVEVNUExBVEUnIHx8IGVsZW1lbnQubm9kZU5hbWUgPT09ICdTQ1JJUFQnKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBhbmltYXRlIG11bHRpcGxlIG5vZGVzIGluIGEgdGVtcGxhdGUgb3Igc2NyaXB0LiBSZW1vdmUgdGhlIFthbmltYXRlXSBhdHRyaWJ1dGUuJyk7XG4gICAgfVxuXG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIC8vIEFsbG93IG11bHRpcGxlIGJpbmRpbmdzIHRvIGFuaW1hdGUgYnkgbm90IHJlbW92aW5nIHVudGlsIHRoZXkgaGF2ZSBhbGwgYmVlbiBjcmVhdGVkXG4gICAgICBlbGVtZW50LnJlbW92ZUF0dHJpYnV0ZShwcm9wZXJ0aWVzLmZyYWdtZW50cy5hbmltYXRlQXR0cmlidXRlKTtcbiAgICB9KTtcblxuICAgIHRoaXMuYW5pbWF0ZSA9IHRydWU7XG5cbiAgICBpZiAoZnJhZ21lbnRzLmlzQm91bmQoJ2F0dHJpYnV0ZScsIGFuaW1hdGUpKSB7XG4gICAgICAvLyBqYXZhc2NyaXB0IGFuaW1hdGlvblxuICAgICAgdGhpcy5hbmltYXRlRXhwcmVzc2lvbiA9IGZyYWdtZW50cy5jb2RpZnlFeHByZXNzaW9uKCdhdHRyaWJ1dGUnLCBhbmltYXRlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGFuaW1hdGVbMF0gPT09ICcuJykge1xuICAgICAgICAvLyBjbGFzcyBhbmltYXRpb25cbiAgICAgICAgdGhpcy5hbmltYXRlQ2xhc3NOYW1lID0gYW5pbWF0ZS5zbGljZSgxKTtcbiAgICAgIH0gZWxzZSBpZiAoYW5pbWF0ZSkge1xuICAgICAgICAvLyByZWdpc3RlcmVkIGFuaW1hdGlvblxuICAgICAgICB2YXIgYW5pbWF0ZU9iamVjdCA9IGZyYWdtZW50cy5nZXRBbmltYXRpb24oYW5pbWF0ZSk7XG4gICAgICAgIGlmICh0eXBlb2YgYW5pbWF0ZU9iamVjdCA9PT0gJ2Z1bmN0aW9uJykgYW5pbWF0ZU9iamVjdCA9IG5ldyBhbmltYXRlT2JqZWN0KHRoaXMpO1xuICAgICAgICB0aGlzLmFuaW1hdGVPYmplY3QgPSBhbmltYXRlT2JqZWN0O1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIEJpbmRpbmcuY2FsbCh0aGlzLCBwcm9wZXJ0aWVzKTtcbn1cblxuXG5CaW5kaW5nLmV4dGVuZChBbmltYXRlZEJpbmRpbmcsIHtcbiAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgX3N1cGVyLmluaXQuY2FsbCh0aGlzKTtcblxuICAgIGlmICh0aGlzLmFuaW1hdGVFeHByZXNzaW9uKSB7XG4gICAgICB0aGlzLmFuaW1hdGVPYnNlcnZlciA9IG5ldyB0aGlzLk9ic2VydmVyKHRoaXMuYW5pbWF0ZUV4cHJlc3Npb24sIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuYW5pbWF0ZU9iamVjdCA9IHZhbHVlO1xuICAgICAgfSwgdGhpcyk7XG4gICAgfVxuICB9LFxuXG4gIGJpbmQ6IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgICBpZiAodGhpcy5jb250ZXh0ID09IGNvbnRleHQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgX3N1cGVyLmJpbmQuY2FsbCh0aGlzLCBjb250ZXh0KTtcblxuICAgIGlmICh0aGlzLmFuaW1hdGVPYnNlcnZlcikge1xuICAgICAgdGhpcy5hbmltYXRlT2JzZXJ2ZXIuYmluZChjb250ZXh0KTtcbiAgICB9XG4gIH0sXG5cbiAgdW5iaW5kOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5jb250ZXh0ID09PSBudWxsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIF9zdXBlci51bmJpbmQuY2FsbCh0aGlzKTtcblxuICAgIGlmICh0aGlzLmFuaW1hdGVPYnNlcnZlcikge1xuICAgICAgdGhpcy5hbmltYXRlT2JzZXJ2ZXIudW5iaW5kKCk7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBIZWxwZXIgbWV0aG9kIHRvIHJlbW92ZSBhIG5vZGUgZnJvbSB0aGUgRE9NLCBhbGxvd2luZyBmb3IgYW5pbWF0aW9ucyB0byBvY2N1ci4gYGNhbGxiYWNrYCB3aWxsIGJlIGNhbGxlZCB3aGVuXG4gICAqIGZpbmlzaGVkLlxuICAgKi9cbiAgYW5pbWF0ZU91dDogZnVuY3Rpb24obm9kZSwgY2FsbGJhY2spIHtcbiAgICBpZiAobm9kZS5maXJzdFZpZXdOb2RlKSBub2RlID0gbm9kZS5maXJzdFZpZXdOb2RlO1xuXG4gICAgdGhpcy5hbmltYXRlTm9kZSgnb3V0Jywgbm9kZSwgZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrLmNhbGwodGhpcyk7XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEhlbHBlciBtZXRob2QgdG8gaW5zZXJ0IGEgbm9kZSBpbiB0aGUgRE9NIGJlZm9yZSBhbm90aGVyIG5vZGUsIGFsbG93aW5nIGZvciBhbmltYXRpb25zIHRvIG9jY3VyLiBgY2FsbGJhY2tgIHdpbGxcbiAgICogYmUgY2FsbGVkIHdoZW4gZmluaXNoZWQuIElmIGBiZWZvcmVgIGlzIG5vdCBwcm92aWRlZCB0aGVuIHRoZSBhbmltYXRpb24gd2lsbCBiZSBydW4gd2l0aG91dCBpbnNlcnRpbmcgdGhlIG5vZGUuXG4gICAqL1xuICBhbmltYXRlSW46IGZ1bmN0aW9uKG5vZGUsIGNhbGxiYWNrKSB7XG4gICAgaWYgKG5vZGUuZmlyc3RWaWV3Tm9kZSkgbm9kZSA9IG5vZGUuZmlyc3RWaWV3Tm9kZTtcbiAgICB0aGlzLmFuaW1hdGVOb2RlKCdpbicsIG5vZGUsIGNhbGxiYWNrLCB0aGlzKTtcbiAgfSxcblxuICAvKipcbiAgICogQWxsb3cgYW4gZWxlbWVudCB0byB1c2UgQ1NTMyB0cmFuc2l0aW9ucyBvciBhbmltYXRpb25zIHRvIGFuaW1hdGUgaW4gb3Igb3V0IG9mIHRoZSBwYWdlLlxuICAgKi9cbiAgYW5pbWF0ZU5vZGU6IGZ1bmN0aW9uKGRpcmVjdGlvbiwgbm9kZSwgY2FsbGJhY2spIHtcbiAgICB2YXIgYW5pbWF0ZU9iamVjdCwgY2xhc3NOYW1lLCBjbGFzc0FuaW1hdGVOYW1lLCBjbGFzc1dpbGxOYW1lLFxuICAgICAgICBtZXRob2RBbmltYXRlTmFtZSwgbWV0aG9kV2lsbE5hbWUsIG1ldGhvZERpZE5hbWUsIGRpciwgX3RoaXMgPSB0aGlzO1xuXG4gICAgaWYgKHRoaXMuYW5pbWF0ZU9iamVjdCAmJiB0eXBlb2YgdGhpcy5hbmltYXRlT2JqZWN0ID09PSAnb2JqZWN0Jykge1xuICAgICAgYW5pbWF0ZU9iamVjdCA9IHRoaXMuYW5pbWF0ZU9iamVjdDtcbiAgICB9IGVsc2UgaWYgKHRoaXMuYW5pbWF0ZUNsYXNzTmFtZSkge1xuICAgICAgY2xhc3NOYW1lID0gdGhpcy5hbmltYXRlQ2xhc3NOYW1lO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHRoaXMuYW5pbWF0ZU9iamVjdCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGNsYXNzTmFtZSA9IHRoaXMuYW5pbWF0ZU9iamVjdDtcbiAgICB9XG5cbiAgICBjbGFzc0FuaW1hdGVOYW1lID0gJ2FuaW1hdGUtJyArIGRpcmVjdGlvbjtcbiAgICBjbGFzc1dpbGxOYW1lID0gJ3dpbGwtYW5pbWF0ZS0nICsgZGlyZWN0aW9uO1xuICAgIGRpciA9IGRpcmVjdGlvbiA9PT0gJ2luJyA/ICdJbicgOiAnT3V0JztcbiAgICBtZXRob2RBbmltYXRlTmFtZSA9ICdhbmltYXRlJyArIGRpcjtcbiAgICBtZXRob2RXaWxsTmFtZSA9ICd3aWxsQW5pbWF0ZScgKyBkaXI7XG4gICAgbWV0aG9kRGlkTmFtZSA9ICdkaWRBbmltYXRlJyArIGRpcjtcblxuICAgIGlmIChjbGFzc05hbWUpIG5vZGUuY2xhc3NMaXN0LmFkZChjbGFzc05hbWUpO1xuICAgIG5vZGUuY2xhc3NMaXN0LmFkZChjbGFzc1dpbGxOYW1lKTtcblxuICAgIGlmIChhbmltYXRlT2JqZWN0KSB7XG4gICAgICBhbmltYXRpb24ubWFrZUVsZW1lbnRBbmltYXRhYmxlKG5vZGUpO1xuICAgICAgaWYgKGFuaW1hdGVPYmplY3RbbWV0aG9kV2lsbE5hbWVdKSB7XG4gICAgICAgIGFuaW1hdGVPYmplY3RbbWV0aG9kV2lsbE5hbWVdKG5vZGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHRyaWdnZXIgcmVmbG93XG4gICAgbm9kZS5vZmZzZXRXaWR0aCA9IG5vZGUub2Zmc2V0V2lkdGg7XG5cbiAgICBub2RlLmNsYXNzTGlzdC5hZGQoY2xhc3NBbmltYXRlTmFtZSk7XG4gICAgbm9kZS5jbGFzc0xpc3QucmVtb3ZlKGNsYXNzV2lsbE5hbWUpO1xuXG4gICAgdmFyIHdoZW5Eb25lID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoYW5pbWF0ZU9iamVjdCAmJiBhbmltYXRlT2JqZWN0W21ldGhvZERpZE5hbWVdKSBhbmltYXRlT2JqZWN0W21ldGhvZERpZE5hbWVdKG5vZGUpO1xuICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjay5jYWxsKF90aGlzKTtcbiAgICAgIG5vZGUuY2xhc3NMaXN0LnJlbW92ZShjbGFzc0FuaW1hdGVOYW1lKTtcbiAgICAgIGlmIChjbGFzc05hbWUpIG5vZGUuY2xhc3NMaXN0LnJlbW92ZShjbGFzc05hbWUpO1xuICAgIH07XG5cbiAgICBpZiAoYW5pbWF0ZU9iamVjdCAmJiBhbmltYXRlT2JqZWN0W21ldGhvZEFuaW1hdGVOYW1lXSkge1xuICAgICAgYW5pbWF0ZU9iamVjdFttZXRob2RBbmltYXRlTmFtZV0obm9kZSwgd2hlbkRvbmUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgZHVyYXRpb24gPSBnZXREdXJhdGlvbi5jYWxsKHRoaXMsIG5vZGUsIGRpcmVjdGlvbik7XG4gICAgICBpZiAoZHVyYXRpb24pIHtcbiAgICAgICAgb25BbmltYXRpb25FbmQobm9kZSwgZHVyYXRpb24sIHdoZW5Eb25lKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHdoZW5Eb25lKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG59KTtcblxuXG52YXIgdHJhbnNpdGlvbkR1cmF0aW9uTmFtZSA9ICd0cmFuc2l0aW9uRHVyYXRpb24nO1xudmFyIHRyYW5zaXRpb25EZWxheU5hbWUgPSAndHJhbnNpdGlvbkRlbGF5JztcbnZhciBhbmltYXRpb25EdXJhdGlvbk5hbWUgPSAnYW5pbWF0aW9uRHVyYXRpb24nO1xudmFyIGFuaW1hdGlvbkRlbGF5TmFtZSA9ICdhbmltYXRpb25EZWxheSc7XG52YXIgdHJhbnNpdGlvbkV2ZW50TmFtZSA9ICd0cmFuc2l0aW9uZW5kJztcbnZhciBhbmltYXRpb25FdmVudE5hbWUgPSAnYW5pbWF0aW9uZW5kJztcbnZhciBzdHlsZSA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZTtcblxuWyd3ZWJraXQnLCAnbW96JywgJ21zJywgJ28nXS5mb3JFYWNoKGZ1bmN0aW9uKHByZWZpeCkge1xuICBpZiAoc3R5bGUudHJhbnNpdGlvbkR1cmF0aW9uID09PSB1bmRlZmluZWQgJiYgc3R5bGVbcHJlZml4ICsgJ1RyYW5zaXRpb25EdXJhdGlvbiddKSB7XG4gICAgdHJhbnNpdGlvbkR1cmF0aW9uTmFtZSA9IHByZWZpeCArICdUcmFuc2l0aW9uRHVyYXRpb24nO1xuICAgIHRyYW5zaXRpb25EZWxheU5hbWUgPSBwcmVmaXggKyAnVHJhbnNpdGlvbkRlbGF5JztcbiAgICB0cmFuc2l0aW9uRXZlbnROYW1lID0gcHJlZml4ICsgJ3RyYW5zaXRpb25lbmQnO1xuICB9XG5cbiAgaWYgKHN0eWxlLmFuaW1hdGlvbkR1cmF0aW9uID09PSB1bmRlZmluZWQgJiYgc3R5bGVbcHJlZml4ICsgJ0FuaW1hdGlvbkR1cmF0aW9uJ10pIHtcbiAgICBhbmltYXRpb25EdXJhdGlvbk5hbWUgPSBwcmVmaXggKyAnQW5pbWF0aW9uRHVyYXRpb24nO1xuICAgIGFuaW1hdGlvbkRlbGF5TmFtZSA9IHByZWZpeCArICdBbmltYXRpb25EZWxheSc7XG4gICAgYW5pbWF0aW9uRXZlbnROYW1lID0gcHJlZml4ICsgJ2FuaW1hdGlvbmVuZCc7XG4gIH1cbn0pO1xuXG5cbmZ1bmN0aW9uIGdldER1cmF0aW9uKG5vZGUsIGRpcmVjdGlvbikge1xuICB2YXIgbWlsbGlzZWNvbmRzID0gdGhpcy5jbG9uZWRGcm9tWydfX2FuaW1hdGlvbkR1cmF0aW9uJyArIGRpcmVjdGlvbl07XG4gIGlmICghbWlsbGlzZWNvbmRzKSB7XG4gICAgLy8gUmVjYWxjIGlmIG5vZGUgd2FzIG91dCBvZiBET00gYmVmb3JlIGFuZCBoYWQgMCBkdXJhdGlvbiwgYXNzdW1lIHRoZXJlIGlzIGFsd2F5cyBTT01FIGR1cmF0aW9uLlxuICAgIHZhciBzdHlsZXMgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShub2RlKTtcbiAgICB2YXIgc2Vjb25kcyA9IE1hdGgubWF4KHBhcnNlRmxvYXQoc3R5bGVzW3RyYW5zaXRpb25EdXJhdGlvbk5hbWVdIHx8IDApICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlRmxvYXQoc3R5bGVzW3RyYW5zaXRpb25EZWxheU5hbWVdIHx8IDApLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VGbG9hdChzdHlsZXNbYW5pbWF0aW9uRHVyYXRpb25OYW1lXSB8fCAwKSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJzZUZsb2F0KHN0eWxlc1thbmltYXRpb25EZWxheU5hbWVdIHx8IDApKTtcbiAgICBtaWxsaXNlY29uZHMgPSBzZWNvbmRzICogMTAwMCB8fCAwO1xuICAgIHRoaXMuY2xvbmVkRnJvbS5fX2FuaW1hdGlvbkR1cmF0aW9uX18gPSBtaWxsaXNlY29uZHM7XG4gIH1cbiAgcmV0dXJuIG1pbGxpc2Vjb25kcztcbn1cblxuXG5mdW5jdGlvbiBvbkFuaW1hdGlvbkVuZChub2RlLCBkdXJhdGlvbiwgY2FsbGJhY2spIHtcbiAgdmFyIG9uRW5kID0gZnVuY3Rpb24oKSB7XG4gICAgbm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKHRyYW5zaXRpb25FdmVudE5hbWUsIG9uRW5kKTtcbiAgICBub2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIoYW5pbWF0aW9uRXZlbnROYW1lLCBvbkVuZCk7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgIGNhbGxiYWNrKCk7XG4gIH07XG5cbiAgLy8gY29udGluZ2VuY3kgcGxhblxuICB2YXIgdGltZW91dCA9IHNldFRpbWVvdXQob25FbmQsIGR1cmF0aW9uICsgMTApO1xuXG4gIG5vZGUuYWRkRXZlbnRMaXN0ZW5lcih0cmFuc2l0aW9uRXZlbnROYW1lLCBvbkVuZCk7XG4gIG5vZGUuYWRkRXZlbnRMaXN0ZW5lcihhbmltYXRpb25FdmVudE5hbWUsIG9uRW5kKTtcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IEJpbmRpbmc7XG52YXIgQ2xhc3MgPSByZXF1aXJlKCdjaGlwLXV0aWxzL2NsYXNzJyk7XG5cbi8qKlxuICogQSBiaW5kaW5nIGlzIGEgbGluayBiZXR3ZWVuIGFuIGVsZW1lbnQgYW5kIHNvbWUgZGF0YS4gU3ViY2xhc3NlcyBvZiBCaW5kaW5nIGNhbGxlZCBiaW5kZXJzIGRlZmluZSB3aGF0IGEgYmluZGluZyBkb2VzXG4gKiB3aXRoIHRoYXQgbGluay4gSW5zdGFuY2VzIG9mIHRoZXNlIGJpbmRlcnMgYXJlIGNyZWF0ZWQgYXMgYmluZGluZ3Mgb24gdGVtcGxhdGVzLiBXaGVuIGEgdmlldyBpcyBzdGFtcGVkIG91dCBmcm9tIHRoZVxuICogdGVtcGxhdGUgdGhlIGJpbmRpbmcgaXMgXCJjbG9uZWRcIiAoaXQgaXMgYWN0dWFsbHkgZXh0ZW5kZWQgZm9yIHBlcmZvcm1hbmNlKSBhbmQgdGhlIGBlbGVtZW50YC9gbm9kZWAgcHJvcGVydHkgaXNcbiAqIHVwZGF0ZWQgdG8gdGhlIG1hdGNoaW5nIGVsZW1lbnQgaW4gdGhlIHZpZXcuXG4gKlxuICogIyMjIFByb3BlcnRpZXNcbiAqICAqIGVsZW1lbnQ6IFRoZSBlbGVtZW50IChvciB0ZXh0IG5vZGUpIHRoaXMgYmluZGluZyBpcyBib3VuZCB0b1xuICogICogbm9kZTogQWxpYXMgb2YgZWxlbWVudCwgc2luY2UgYmluZGluZ3MgbWF5IGFwcGx5IHRvIHRleHQgbm9kZXMgdGhpcyBpcyBtb3JlIGFjY3VyYXRlXG4gKiAgKiBuYW1lOiBUaGUgYXR0cmlidXRlIG9yIGVsZW1lbnQgbmFtZSAoZG9lcyBub3QgYXBwbHkgdG8gbWF0Y2hlZCB0ZXh0IG5vZGVzKVxuICogICogbWF0Y2g6IFRoZSBtYXRjaGVkIHBhcnQgb2YgdGhlIG5hbWUgZm9yIHdpbGRjYXJkIGF0dHJpYnV0ZXMgKGUuZy4gYG9uLSpgIG1hdGNoaW5nIGFnYWluc3QgYG9uLWNsaWNrYCB3b3VsZCBoYXZlIGFcbiAqICAgIG1hdGNoIHByb3BlcnR5IGVxdWFsbGluZyBgY2xpY2tgKS4gVXNlIGB0aGlzLmNhbWVsQ2FzZWAgdG8gZ2V0IHRoZSBtYXRjaCBwcm9lcnR5IGNhbWVsQ2FzZWQuXG4gKiAgKiBleHByZXNzaW9uOiBUaGUgZXhwcmVzc2lvbiB0aGlzIGJpbmRpbmcgd2lsbCB1c2UgZm9yIGl0cyB1cGRhdGVzIChkb2VzIG5vdCBhcHBseSB0byBtYXRjaGVkIGVsZW1lbnRzKVxuICogICogY29udGV4dDogVGhlIGNvbnRleHQgdGhlIGV4cmVzc2lvbiBvcGVyYXRlcyB3aXRoaW4gd2hlbiBib3VuZFxuICovXG5mdW5jdGlvbiBCaW5kaW5nKHByb3BlcnRpZXMpIHtcbiAgaWYgKCFwcm9wZXJ0aWVzLm5vZGUgfHwgIXByb3BlcnRpZXMudmlldykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0EgYmluZGluZyBtdXN0IHJlY2VpdmUgYSBub2RlIGFuZCBhIHZpZXcnKTtcbiAgfVxuXG4gIC8vIGVsZW1lbnQgYW5kIG5vZGUgYXJlIGFsaWFzZXNcbiAgdGhpcy5fZWxlbWVudFBhdGggPSBpbml0Tm9kZVBhdGgocHJvcGVydGllcy5ub2RlLCBwcm9wZXJ0aWVzLnZpZXcpO1xuICB0aGlzLm5vZGUgPSBwcm9wZXJ0aWVzLm5vZGU7XG4gIHRoaXMuZWxlbWVudCA9IHByb3BlcnRpZXMubm9kZTtcbiAgdGhpcy5uYW1lID0gcHJvcGVydGllcy5uYW1lO1xuICB0aGlzLm1hdGNoID0gcHJvcGVydGllcy5tYXRjaDtcbiAgdGhpcy5leHByZXNzaW9uID0gcHJvcGVydGllcy5leHByZXNzaW9uO1xuICB0aGlzLmZyYWdtZW50cyA9IHByb3BlcnRpZXMuZnJhZ21lbnRzO1xuICB0aGlzLmNvbnRleHQgPSBudWxsO1xufVxuXG5DbGFzcy5leHRlbmQoQmluZGluZywge1xuICAvKipcbiAgICogRGVmYXVsdCBwcmlvcml0eSBiaW5kZXJzIG1heSBvdmVycmlkZS5cbiAgICovXG4gIHByaW9yaXR5OiAwLFxuXG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYSBjbG9uZWQgYmluZGluZy4gVGhpcyBoYXBwZW5zIGFmdGVyIGEgY29tcGlsZWQgYmluZGluZyBvbiBhIHRlbXBsYXRlIGlzIGNsb25lZCBmb3IgYSB2aWV3LlxuICAgKi9cbiAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuZXhwcmVzc2lvbikge1xuICAgICAgLy8gQW4gb2JzZXJ2ZXIgdG8gb2JzZXJ2ZSB2YWx1ZSBjaGFuZ2VzIHRvIHRoZSBleHByZXNzaW9uIHdpdGhpbiBhIGNvbnRleHRcbiAgICAgIHRoaXMub2JzZXJ2ZXIgPSB0aGlzLm9ic2VydmUodGhpcy5leHByZXNzaW9uLCB0aGlzLnVwZGF0ZWQpO1xuICAgIH1cbiAgICB0aGlzLmNyZWF0ZWQoKTtcbiAgfSxcblxuICAvKipcbiAgICogQ2xvbmUgdGhpcyBiaW5kaW5nIGZvciBhIHZpZXcuIFRoZSBlbGVtZW50L25vZGUgd2lsbCBiZSB1cGRhdGVkIGFuZCB0aGUgYmluZGluZyB3aWxsIGJlIGluaXRlZC5cbiAgICovXG4gIGNsb25lRm9yVmlldzogZnVuY3Rpb24odmlldykge1xuICAgIGlmICghdmlldykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQSBiaW5kaW5nIG11c3QgY2xvbmUgYWdhaW5zdCBhIHZpZXcnKTtcbiAgICB9XG5cbiAgICB2YXIgbm9kZSA9IHZpZXc7XG4gICAgdGhpcy5fZWxlbWVudFBhdGguZm9yRWFjaChmdW5jdGlvbihpbmRleCkge1xuICAgICAgbm9kZSA9IG5vZGUuY2hpbGROb2Rlc1tpbmRleF07XG4gICAgfSk7XG5cbiAgICB2YXIgYmluZGluZyA9IE9iamVjdC5jcmVhdGUodGhpcyk7XG4gICAgYmluZGluZy5jbG9uZWRGcm9tID0gdGhpcztcbiAgICBiaW5kaW5nLmVsZW1lbnQgPSBub2RlO1xuICAgIGJpbmRpbmcubm9kZSA9IG5vZGU7XG4gICAgYmluZGluZy5pbml0KCk7XG4gICAgcmV0dXJuIGJpbmRpbmc7XG4gIH0sXG5cblxuICAvLyBCaW5kIHRoaXMgdG8gdGhlIGdpdmVuIGNvbnRleHQgb2JqZWN0XG4gIGJpbmQ6IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgICBpZiAodGhpcy5jb250ZXh0ID09IGNvbnRleHQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICAgIGlmICh0aGlzLm9ic2VydmVyKSB0aGlzLm9ic2VydmVyLmNvbnRleHQgPSBjb250ZXh0O1xuICAgIHRoaXMuYm91bmQoKTtcblxuICAgIGlmICh0aGlzLm9ic2VydmVyKSB7XG4gICAgICBpZiAodGhpcy51cGRhdGVkICE9PSBCaW5kaW5nLnByb3RvdHlwZS51cGRhdGVkKSB7XG4gICAgICAgIHRoaXMub2JzZXJ2ZXIuZm9yY2VVcGRhdGVOZXh0U3luYyA9IHRydWU7XG4gICAgICAgIHRoaXMub2JzZXJ2ZXIuYmluZChjb250ZXh0KTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cblxuICAvLyBVbmJpbmQgdGhpcyBmcm9tIGl0cyBjb250ZXh0XG4gIHVuYmluZDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuY29udGV4dCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9ic2VydmVyKSB0aGlzLm9ic2VydmVyLnVuYmluZCgpO1xuICAgIHRoaXMudW5ib3VuZCgpO1xuICAgIHRoaXMuY29udGV4dCA9IG51bGw7XG4gIH0sXG5cblxuICAvLyBDbGVhbnMgdXAgYmluZGluZyBjb21wbGV0ZWx5XG4gIGRpc3Bvc2U6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudW5iaW5kKCk7XG4gICAgaWYgKHRoaXMub2JzZXJ2ZXIpIHtcbiAgICAgIC8vIFRoaXMgd2lsbCBjbGVhciBpdCBvdXQsIG51bGxpZnlpbmcgYW55IGRhdGEgc3RvcmVkXG4gICAgICB0aGlzLm9ic2VydmVyLnN5bmMoKTtcbiAgICB9XG4gICAgdGhpcy5kaXNwb3NlZCgpO1xuICB9LFxuXG5cbiAgLy8gVGhlIGZ1bmN0aW9uIHRvIHJ1biB3aGVuIHRoZSBiaW5kaW5nJ3MgZWxlbWVudCBpcyBjb21waWxlZCB3aXRoaW4gYSB0ZW1wbGF0ZVxuICBjb21waWxlZDogZnVuY3Rpb24oKSB7fSxcblxuICAvLyBUaGUgZnVuY3Rpb24gdG8gcnVuIHdoZW4gdGhlIGJpbmRpbmcncyBlbGVtZW50IGlzIGNyZWF0ZWRcbiAgY3JlYXRlZDogZnVuY3Rpb24oKSB7fSxcblxuICAvLyBUaGUgZnVuY3Rpb24gdG8gcnVuIHdoZW4gdGhlIGV4cHJlc3Npb24ncyB2YWx1ZSBjaGFuZ2VzXG4gIHVwZGF0ZWQ6IGZ1bmN0aW9uKCkge30sXG5cbiAgLy8gVGhlIGZ1bmN0aW9uIHRvIHJ1biB3aGVuIHRoZSBiaW5kaW5nIGlzIGJvdW5kXG4gIGJvdW5kOiBmdW5jdGlvbigpIHt9LFxuXG4gIC8vIFRoZSBmdW5jdGlvbiB0byBydW4gd2hlbiB0aGUgYmluZGluZyBpcyB1bmJvdW5kXG4gIHVuYm91bmQ6IGZ1bmN0aW9uKCkge30sXG5cbiAgLy8gVGhlIGZ1bmN0aW9uIHRvIHJ1biB3aGVuIHRoZSBiaW5kaW5nIGlzIGRpc3Bvc2VkXG4gIGRpc3Bvc2VkOiBmdW5jdGlvbigpIHt9LFxuXG4gIC8vIEhlbHBlciBtZXRob2RzXG5cbiAgZ2V0IGNhbWVsQ2FzZSgpIHtcbiAgICByZXR1cm4gKHRoaXMubWF0Y2ggfHwgdGhpcy5uYW1lIHx8ICcnKS5yZXBsYWNlKC8tKyhcXHcpL2csIGZ1bmN0aW9uKF8sIGNoYXIpIHtcbiAgICAgIHJldHVybiBjaGFyLnRvVXBwZXJDYXNlKCk7XG4gICAgfSk7XG4gIH0sXG5cbiAgb2JzZXJ2ZTogZnVuY3Rpb24oZXhwcmVzc2lvbiwgY2FsbGJhY2ssIGNhbGxiYWNrQ29udGV4dCkge1xuICAgIHJldHVybiB0aGlzLm9ic2VydmF0aW9ucy5jcmVhdGVPYnNlcnZlcihleHByZXNzaW9uLCBjYWxsYmFjaywgY2FsbGJhY2tDb250ZXh0IHx8IHRoaXMpO1xuICB9XG59KTtcblxuXG5cblxudmFyIGluZGV4T2YgPSBBcnJheS5wcm90b3R5cGUuaW5kZXhPZjtcblxuLy8gQ3JlYXRlcyBhbiBhcnJheSBvZiBpbmRleGVzIHRvIGhlbHAgZmluZCB0aGUgc2FtZSBlbGVtZW50IHdpdGhpbiBhIGNsb25lZCB2aWV3XG5mdW5jdGlvbiBpbml0Tm9kZVBhdGgobm9kZSwgdmlldykge1xuICB2YXIgcGF0aCA9IFtdO1xuICB3aGlsZSAobm9kZSAhPT0gdmlldykge1xuICAgIHZhciBwYXJlbnQgPSBub2RlLnBhcmVudE5vZGU7XG4gICAgcGF0aC51bnNoaWZ0KGluZGV4T2YuY2FsbChwYXJlbnQuY2hpbGROb2Rlcywgbm9kZSkpO1xuICAgIG5vZGUgPSBwYXJlbnQ7XG4gIH1cbiAgcmV0dXJuIHBhdGg7XG59XG4iLCJ2YXIgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG5tb2R1bGUuZXhwb3J0cyA9IGNvbXBpbGU7XG5cblxuLy8gV2Fsa3MgdGhlIHRlbXBsYXRlIERPTSByZXBsYWNpbmcgYW55IGJpbmRpbmdzIGFuZCBjYWNoaW5nIGJpbmRpbmdzIG9udG8gdGhlIHRlbXBsYXRlIG9iamVjdC5cbmZ1bmN0aW9uIGNvbXBpbGUoZnJhZ21lbnRzLCB0ZW1wbGF0ZSkge1xuICB2YXIgd2Fsa2VyID0gZG9jdW1lbnQuY3JlYXRlVHJlZVdhbGtlcih0ZW1wbGF0ZSwgTm9kZUZpbHRlci5TSE9XX0VMRU1FTlQgfCBOb2RlRmlsdGVyLlNIT1dfVEVYVCk7XG4gIHZhciBiaW5kaW5ncyA9IFtdLCBjdXJyZW50Tm9kZSwgcGFyZW50Tm9kZSwgcHJldmlvdXNOb2RlO1xuXG4gIC8vIFJlc2V0IGZpcnN0IG5vZGUgdG8gZW5zdXJlIGl0IGlzbid0IGEgZnJhZ21lbnRcbiAgd2Fsa2VyLm5leHROb2RlKCk7XG4gIHdhbGtlci5wcmV2aW91c05vZGUoKTtcblxuICAvLyBmaW5kIGJpbmRpbmdzIGZvciBlYWNoIG5vZGVcbiAgZG8ge1xuICAgIGN1cnJlbnROb2RlID0gd2Fsa2VyLmN1cnJlbnROb2RlO1xuICAgIHBhcmVudE5vZGUgPSBjdXJyZW50Tm9kZS5wYXJlbnROb2RlO1xuICAgIGJpbmRpbmdzLnB1c2guYXBwbHkoYmluZGluZ3MsIGdldEJpbmRpbmdzRm9yTm9kZShmcmFnbWVudHMsIGN1cnJlbnROb2RlLCB0ZW1wbGF0ZSkpO1xuXG4gICAgaWYgKGN1cnJlbnROb2RlLnBhcmVudE5vZGUgIT09IHBhcmVudE5vZGUpIHtcbiAgICAgIC8vIGN1cnJlbnROb2RlIHdhcyByZW1vdmVkIGFuZCBtYWRlIGEgdGVtcGxhdGVcbiAgICAgIHdhbGtlci5jdXJyZW50Tm9kZSA9IHByZXZpb3VzTm9kZSB8fCB3YWxrZXIucm9vdDtcbiAgICB9IGVsc2Uge1xuICAgICAgcHJldmlvdXNOb2RlID0gY3VycmVudE5vZGU7XG4gICAgfVxuICB9IHdoaWxlICh3YWxrZXIubmV4dE5vZGUoKSk7XG5cbiAgcmV0dXJuIGJpbmRpbmdzO1xufVxuXG5cblxuLy8gRmluZCBhbGwgdGhlIGJpbmRpbmdzIG9uIGEgZ2l2ZW4gbm9kZSAodGV4dCBub2RlcyB3aWxsIG9ubHkgZXZlciBoYXZlIG9uZSBiaW5kaW5nKS5cbmZ1bmN0aW9uIGdldEJpbmRpbmdzRm9yTm9kZShmcmFnbWVudHMsIG5vZGUsIHZpZXcpIHtcbiAgdmFyIGJpbmRpbmdzID0gW107XG4gIHZhciBCaW5kZXIsIGJpbmRpbmcsIGV4cHIsIGJvdW5kLCBtYXRjaCwgYXR0ciwgaSwgbDtcblxuICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gTm9kZS5URVhUX05PREUpIHtcbiAgICBzcGxpdFRleHROb2RlKGZyYWdtZW50cywgbm9kZSk7XG5cbiAgICAvLyBGaW5kIGFueSBiaW5kaW5nIGZvciB0aGUgdGV4dCBub2RlXG4gICAgaWYgKGZyYWdtZW50cy5pc0JvdW5kKCd0ZXh0Jywgbm9kZS5ub2RlVmFsdWUpKSB7XG4gICAgICBleHByID0gZnJhZ21lbnRzLmNvZGlmeUV4cHJlc3Npb24oJ3RleHQnLCBub2RlLm5vZGVWYWx1ZSk7XG4gICAgICBub2RlLm5vZGVWYWx1ZSA9ICcnO1xuICAgICAgQmluZGVyID0gZnJhZ21lbnRzLmZpbmRCaW5kZXIoJ3RleHQnLCBleHByKTtcbiAgICAgIGJpbmRpbmcgPSBuZXcgQmluZGVyKHsgbm9kZTogbm9kZSwgdmlldzogdmlldywgZXhwcmVzc2lvbjogZXhwciwgZnJhZ21lbnRzOiBmcmFnbWVudHMgfSk7XG4gICAgICBpZiAoYmluZGluZy5jb21waWxlZCgpICE9PSBmYWxzZSkge1xuICAgICAgICBiaW5kaW5ncy5wdXNoKGJpbmRpbmcpO1xuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyBJZiB0aGUgZWxlbWVudCBpcyByZW1vdmVkIGZyb20gdGhlIERPTSwgc3RvcC4gQ2hlY2sgYnkgbG9va2luZyBhdCBpdHMgcGFyZW50Tm9kZVxuICAgIHZhciBwYXJlbnQgPSBub2RlLnBhcmVudE5vZGU7XG4gICAgdmFyIERlZmF1bHRCaW5kZXIgPSBmcmFnbWVudHMuZ2V0QXR0cmlidXRlQmluZGVyKCdfX2RlZmF1bHRfXycpO1xuICAgIGJvdW5kID0gW107XG5cbiAgICAvLyBGaW5kIGFueSBiaW5kaW5nIGZvciB0aGUgZWxlbWVudFxuICAgIEJpbmRlciA9IGZyYWdtZW50cy5maW5kQmluZGVyKCdlbGVtZW50Jywgbm9kZS50YWdOYW1lLnRvTG93ZXJDYXNlKCkpO1xuICAgIGlmIChCaW5kZXIpIHtcbiAgICAgIGJvdW5kLnB1c2goWyBCaW5kZXIgXSk7XG4gICAgfVxuXG4gICAgLy8gRmluZCBhbmQgYWRkIGFueSBhdHRyaWJ1dGUgYmluZGluZ3Mgb24gYW4gZWxlbWVudC4gVGhlc2UgY2FuIGJlIGF0dHJpYnV0ZXMgd2hvc2UgbmFtZSBtYXRjaGVzIGEgYmluZGluZywgb3JcbiAgICAvLyB0aGV5IGNhbiBiZSBhdHRyaWJ1dGVzIHdoaWNoIGhhdmUgYSBiaW5kaW5nIGluIHRoZSB2YWx1ZSBzdWNoIGFzIGBocmVmPVwiL3Bvc3Qve3sgcG9zdC5pZCB9fVwiYC5cbiAgICB2YXIgYXR0cmlidXRlcyA9IHNsaWNlLmNhbGwobm9kZS5hdHRyaWJ1dGVzKTtcbiAgICBmb3IgKGkgPSAwLCBsID0gYXR0cmlidXRlcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIGF0dHIgPSBhdHRyaWJ1dGVzW2ldO1xuICAgICAgQmluZGVyID0gZnJhZ21lbnRzLmZpbmRCaW5kZXIoJ2F0dHJpYnV0ZScsIGF0dHIubmFtZSwgYXR0ci52YWx1ZSk7XG4gICAgICBpZiAoQmluZGVyKSB7XG4gICAgICAgIGJvdW5kLnB1c2goWyBCaW5kZXIsIGF0dHIgXSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gTWFrZSBzdXJlIHRvIGNyZWF0ZSBhbmQgcHJvY2VzcyB0aGVtIGluIHRoZSBjb3JyZWN0IHByaW9yaXR5IG9yZGVyIHNvIGlmIGEgYmluZGluZyBjcmVhdGUgYSB0ZW1wbGF0ZSBmcm9tIHRoZVxuICAgIC8vIG5vZGUgaXQgZG9lc24ndCBwcm9jZXNzIHRoZSBvdGhlcnMuXG4gICAgYm91bmQuc29ydChzb3J0QmluZGluZ3MpO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IGJvdW5kLmxlbmd0aDsgaSsrKSB7XG4gICAgICBCaW5kZXIgPSBib3VuZFtpXVswXTtcbiAgICAgIGF0dHIgPSBib3VuZFtpXVsxXTtcblxuICAgICAgaWYgKGF0dHIpIHtcbiAgICAgICAgaWYgKCFub2RlLmhhc0F0dHJpYnV0ZShhdHRyLm5hbWUpKSB7XG4gICAgICAgICAgLy8gSWYgdGhpcyB3YXMgcmVtb3ZlZCBhbHJlYWR5IGJ5IGFub3RoZXIgYmluZGluZywgZG9uJ3QgcHJvY2Vzcy5cbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbmFtZSA9IGF0dHIubmFtZTtcbiAgICAgICAgdmFyIHZhbHVlID0gYXR0ci52YWx1ZTtcbiAgICAgICAgaWYgKEJpbmRlci5leHByKSB7XG4gICAgICAgICAgbWF0Y2ggPSBuYW1lLm1hdGNoKEJpbmRlci5leHByKTtcbiAgICAgICAgICBpZiAobWF0Y2gpIG1hdGNoID0gbWF0Y2hbMV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbWF0Y2ggPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBub2RlLnJlbW92ZUF0dHJpYnV0ZShhdHRyLm5hbWUpO1xuICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAvLyBpZiB0aGUgYXR0cmlidXRlIHdhcyBhbHJlYWR5IHJlbW92ZWQgZG9uJ3Qgd29ycnlcbiAgICAgICAgICB9XG5cbiAgICAgICAgYmluZGluZyA9IG5ldyBCaW5kZXIoe1xuICAgICAgICAgIG5vZGU6IG5vZGUsXG4gICAgICAgICAgdmlldzogdmlldyxcbiAgICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICAgIG1hdGNoOiBtYXRjaCxcbiAgICAgICAgICBleHByZXNzaW9uOiB2YWx1ZSA/IGZyYWdtZW50cy5jb2RpZnlFeHByZXNzaW9uKCdhdHRyaWJ1dGUnLCB2YWx1ZSwgQmluZGVyICE9PSBEZWZhdWx0QmluZGVyKSA6IG51bGwsXG4gICAgICAgICAgZnJhZ21lbnRzOiBmcmFnbWVudHNcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBiaW5kaW5nID0gbmV3IEJpbmRlcih7IG5vZGU6IG5vZGUsIHZpZXc6IHZpZXcsIGZyYWdtZW50czogZnJhZ21lbnRzIH0pO1xuICAgICAgfVxuXG4gICAgICBpZiAoYmluZGluZy5jb21waWxlZCgpICE9PSBmYWxzZSkge1xuICAgICAgICBiaW5kaW5ncy5wdXNoKGJpbmRpbmcpO1xuICAgICAgfSBlbHNlIGlmIChhdHRyICYmIEJpbmRlciAhPT0gRGVmYXVsdEJpbmRlciAmJiBmcmFnbWVudHMuaXNCb3VuZCgnYXR0cmlidXRlJywgdmFsdWUpKSB7XG4gICAgICAgIC8vIFJldmVydCB0byBkZWZhdWx0IGlmIHRoaXMgYmluZGluZyBkb2Vzbid0IHRha2VcbiAgICAgICAgYm91bmQucHVzaChbIERlZmF1bHRCaW5kZXIsIGF0dHIgXSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChub2RlLnBhcmVudE5vZGUgIT09IHBhcmVudCkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gYmluZGluZ3M7XG59XG5cblxuLy8gU3BsaXRzIHRleHQgbm9kZXMgd2l0aCBleHByZXNzaW9ucyBpbiB0aGVtIHNvIHRoZXkgY2FuIGJlIGJvdW5kIGluZGl2aWR1YWxseSwgaGFzIHBhcmVudE5vZGUgcGFzc2VkIGluIHNpbmNlIGl0IG1heVxuLy8gYmUgYSBkb2N1bWVudCBmcmFnbWVudCB3aGljaCBhcHBlYXJzIGFzIG51bGwgb24gbm9kZS5wYXJlbnROb2RlLlxuZnVuY3Rpb24gc3BsaXRUZXh0Tm9kZShmcmFnbWVudHMsIG5vZGUpIHtcbiAgaWYgKCFub2RlLnByb2Nlc3NlZCkge1xuICAgIG5vZGUucHJvY2Vzc2VkID0gdHJ1ZTtcbiAgICB2YXIgcmVnZXggPSBmcmFnbWVudHMuYmluZGVycy50ZXh0Ll9leHByO1xuICAgIHZhciBjb250ZW50ID0gbm9kZS5ub2RlVmFsdWU7XG4gICAgaWYgKGNvbnRlbnQubWF0Y2gocmVnZXgpKSB7XG4gICAgICB2YXIgbWF0Y2gsIGxhc3RJbmRleCA9IDAsIHBhcnRzID0gW10sIGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgICAgd2hpbGUgKChtYXRjaCA9IHJlZ2V4LmV4ZWMoY29udGVudCkpKSB7XG4gICAgICAgIHBhcnRzLnB1c2goY29udGVudC5zbGljZShsYXN0SW5kZXgsIHJlZ2V4Lmxhc3RJbmRleCAtIG1hdGNoWzBdLmxlbmd0aCkpO1xuICAgICAgICBwYXJ0cy5wdXNoKG1hdGNoWzBdKTtcbiAgICAgICAgbGFzdEluZGV4ID0gcmVnZXgubGFzdEluZGV4O1xuICAgICAgfVxuICAgICAgcGFydHMucHVzaChjb250ZW50LnNsaWNlKGxhc3RJbmRleCkpO1xuICAgICAgcGFydHMgPSBwYXJ0cy5maWx0ZXIobm90RW1wdHkpO1xuXG4gICAgICBub2RlLm5vZGVWYWx1ZSA9IHBhcnRzWzBdO1xuICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgbmV3VGV4dE5vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShwYXJ0c1tpXSk7XG4gICAgICAgIG5ld1RleHROb2RlLnByb2Nlc3NlZCA9IHRydWU7XG4gICAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKG5ld1RleHROb2RlKTtcbiAgICAgIH1cbiAgICAgIG5vZGUucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoZnJhZ21lbnQsIG5vZGUubmV4dFNpYmxpbmcpO1xuICAgIH1cbiAgfVxufVxuXG5cbmZ1bmN0aW9uIHNvcnRCaW5kaW5ncyhhLCBiKSB7XG4gIHJldHVybiBiWzBdLnByb3RvdHlwZS5wcmlvcml0eSAtIGFbMF0ucHJvdG90eXBlLnByaW9yaXR5O1xufVxuXG5mdW5jdGlvbiBub3RFbXB0eSh2YWx1ZSkge1xuICByZXR1cm4gQm9vbGVhbih2YWx1ZSk7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IEZyYWdtZW50cztcbnJlcXVpcmUoJy4vdXRpbC9wb2x5ZmlsbHMnKTtcbnZhciBDbGFzcyA9IHJlcXVpcmUoJ2NoaXAtdXRpbHMvY2xhc3MnKTtcbnZhciB0b0ZyYWdtZW50ID0gcmVxdWlyZSgnLi91dGlsL3RvRnJhZ21lbnQnKTtcbnZhciBhbmltYXRpb24gPSByZXF1aXJlKCcuL3V0aWwvYW5pbWF0aW9uJyk7XG52YXIgVGVtcGxhdGUgPSByZXF1aXJlKCcuL3RlbXBsYXRlJyk7XG52YXIgVmlldyA9IHJlcXVpcmUoJy4vdmlldycpO1xudmFyIEJpbmRpbmcgPSByZXF1aXJlKCcuL2JpbmRpbmcnKTtcbnZhciBBbmltYXRlZEJpbmRpbmcgPSByZXF1aXJlKCcuL2FuaW1hdGVkQmluZGluZycpO1xudmFyIGNvbXBpbGUgPSByZXF1aXJlKCcuL2NvbXBpbGUnKTtcbnZhciBoYXNXaWxkY2FyZEV4cHIgPSAvKF58W15cXFxcXSlcXCovO1xudmFyIGVzY2FwZWRXaWxkY2FyZEV4cHIgPSAvKF58W15cXFxcXSlcXFxcXFwqLztcblxuLyoqXG4gKiBBIEZyYWdtZW50cyBvYmplY3Qgc2VydmVzIGFzIGEgcmVnaXN0cnkgZm9yIGJpbmRlcnMgYW5kIGZvcm1hdHRlcnNcbiAqIEBwYXJhbSB7T2JzZXJ2YXRpb25zfSBvYnNlcnZhdGlvbnMgQW4gaW5zdGFuY2Ugb2YgT2JzZXJ2YXRpb25zIGZvciB0cmFja2luZyBjaGFuZ2VzIHRvIHRoZSBkYXRhXG4gKi9cbmZ1bmN0aW9uIEZyYWdtZW50cyhvYnNlcnZhdGlvbnMpIHtcbiAgaWYgKCFvYnNlcnZhdGlvbnMpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdNdXN0IHByb3ZpZGUgYW4gb2JzZXJ2YXRpb25zIGluc3RhbmNlIHRvIEZyYWdtZW50cy4nKTtcbiAgfVxuXG4gIHRoaXMub2JzZXJ2YXRpb25zID0gb2JzZXJ2YXRpb25zO1xuICB0aGlzLmdsb2JhbHMgPSBvYnNlcnZhdGlvbnMuZ2xvYmFscztcbiAgdGhpcy5mb3JtYXR0ZXJzID0gb2JzZXJ2YXRpb25zLmZvcm1hdHRlcnM7XG4gIHRoaXMuYW5pbWF0aW9ucyA9IHt9O1xuICB0aGlzLmFuaW1hdGVBdHRyaWJ1dGUgPSAnYW5pbWF0ZSc7XG5cbiAgdGhpcy5iaW5kZXJzID0ge1xuICAgIGVsZW1lbnQ6IHsgX3dpbGRjYXJkczogW10gfSxcbiAgICBhdHRyaWJ1dGU6IHsgX3dpbGRjYXJkczogW10sIF9leHByOiAve3tcXHMqKC4qPylcXHMqfX0vZywgX2RlbGltaXRlcnNPbmx5SW5EZWZhdWx0OiBmYWxzZSB9LFxuICAgIHRleHQ6IHsgX3dpbGRjYXJkczogW10sIF9leHByOiAve3tcXHMqKC4qPylcXHMqfX0vZyB9XG4gIH07XG5cbiAgLy8gVGV4dCBiaW5kZXIgZm9yIHRleHQgbm9kZXMgd2l0aCBleHByZXNzaW9ucyBpbiB0aGVtXG4gIHRoaXMucmVnaXN0ZXJUZXh0KCdfX2RlZmF1bHRfXycsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgdGhpcy5lbGVtZW50LnRleHRDb250ZW50ID0gKHZhbHVlICE9IG51bGwpID8gdmFsdWUgOiAnJztcbiAgfSk7XG5cbiAgLy8gQ2F0Y2hhbGwgYXR0cmlidXRlIGJpbmRlciBmb3IgcmVndWxhciBhdHRyaWJ1dGVzIHdpdGggZXhwcmVzc2lvbnMgaW4gdGhlbVxuICB0aGlzLnJlZ2lzdGVyQXR0cmlidXRlKCdfX2RlZmF1bHRfXycsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlICE9IG51bGwpIHtcbiAgICAgIHRoaXMuZWxlbWVudC5zZXRBdHRyaWJ1dGUodGhpcy5uYW1lLCB2YWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUodGhpcy5uYW1lKTtcbiAgICB9XG4gIH0pO1xufVxuXG5DbGFzcy5leHRlbmQoRnJhZ21lbnRzLCB7XG5cbiAgLyoqXG4gICAqIFRha2VzIGFuIEhUTUwgc3RyaW5nLCBhbiBlbGVtZW50LCBhbiBhcnJheSBvZiBlbGVtZW50cywgb3IgYSBkb2N1bWVudCBmcmFnbWVudCwgYW5kIGNvbXBpbGVzIGl0IGludG8gYSB0ZW1wbGF0ZS5cbiAgICogSW5zdGFuY2VzIG1heSB0aGVuIGJlIGNyZWF0ZWQgYW5kIGJvdW5kIHRvIGEgZ2l2ZW4gY29udGV4dC5cbiAgICogQHBhcmFtIHtTdHJpbmd8Tm9kZUxpc3R8SFRNTENvbGxlY3Rpb258SFRNTFRlbXBsYXRlRWxlbWVudHxIVE1MU2NyaXB0RWxlbWVudHxOb2RlfSBodG1sIEEgVGVtcGxhdGUgY2FuIGJlIGNyZWF0ZWRcbiAgICogZnJvbSBtYW55IGRpZmZlcmVudCB0eXBlcyBvZiBvYmplY3RzLiBBbnkgb2YgdGhlc2Ugd2lsbCBiZSBjb252ZXJ0ZWQgaW50byBhIGRvY3VtZW50IGZyYWdtZW50IGZvciB0aGUgdGVtcGxhdGUgdG9cbiAgICogY2xvbmUuIE5vZGVzIGFuZCBlbGVtZW50cyBwYXNzZWQgaW4gd2lsbCBiZSByZW1vdmVkIGZyb20gdGhlIERPTS5cbiAgICovXG4gIGNyZWF0ZVRlbXBsYXRlOiBmdW5jdGlvbihodG1sKSB7XG4gICAgdmFyIGZyYWdtZW50ID0gdG9GcmFnbWVudChodG1sKTtcbiAgICBpZiAoZnJhZ21lbnQuY2hpbGROb2Rlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGNyZWF0ZSBhIHRlbXBsYXRlIGZyb20gJyArIGh0bWwpO1xuICAgIH1cbiAgICB2YXIgdGVtcGxhdGUgPSBUZW1wbGF0ZS5tYWtlSW5zdGFuY2VPZihmcmFnbWVudCk7XG4gICAgdGVtcGxhdGUuYmluZGluZ3MgPSBjb21waWxlKHRoaXMsIHRlbXBsYXRlKTtcbiAgICByZXR1cm4gdGVtcGxhdGU7XG4gIH0sXG5cblxuICAvKipcbiAgICogQ29tcGlsZXMgYmluZGluZ3Mgb24gYW4gZWxlbWVudC5cbiAgICovXG4gIGNvbXBpbGVFbGVtZW50OiBmdW5jdGlvbihlbGVtZW50KSB7XG4gICAgaWYgKCFlbGVtZW50LmJpbmRpbmdzKSB7XG4gICAgICBlbGVtZW50LmJpbmRpbmdzID0gY29tcGlsZSh0aGlzLCBlbGVtZW50KTtcbiAgICAgIFZpZXcubWFrZUluc3RhbmNlT2YoZWxlbWVudCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGVsZW1lbnQ7XG4gIH0sXG5cblxuICAvKipcbiAgICogQ29tcGlsZXMgYW5kIGJpbmRzIGFuIGVsZW1lbnQgd2hpY2ggd2FzIG5vdCBjcmVhdGVkIGZyb20gYSB0ZW1wbGF0ZS4gTW9zdGx5IG9ubHkgdXNlZCBmb3IgYmluZGluZyB0aGUgZG9jdW1lbnQnc1xuICAgKiBodG1sIGVsZW1lbnQuXG4gICAqL1xuICBiaW5kRWxlbWVudDogZnVuY3Rpb24oZWxlbWVudCwgY29udGV4dCkge1xuICAgIHRoaXMuY29tcGlsZUVsZW1lbnQoZWxlbWVudCk7XG5cbiAgICBpZiAoY29udGV4dCkge1xuICAgICAgZWxlbWVudC5iaW5kKGNvbnRleHQpO1xuICAgIH1cblxuICAgIHJldHVybiBlbGVtZW50O1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIE9ic2VydmVzIGFuIGV4cHJlc3Npb24gd2l0aGluIGEgZ2l2ZW4gY29udGV4dCwgY2FsbGluZyB0aGUgY2FsbGJhY2sgd2hlbiBpdCBjaGFuZ2VzIGFuZCByZXR1cm5pbmcgdGhlIG9ic2VydmVyLlxuICAgKi9cbiAgb2JzZXJ2ZTogZnVuY3Rpb24oY29udGV4dCwgZXhwciwgY2FsbGJhY2ssIGNhbGxiYWNrQ29udGV4dCkge1xuICAgIGlmICh0eXBlb2YgY29udGV4dCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGNhbGxiYWNrQ29udGV4dCA9IGNhbGxiYWNrO1xuICAgICAgY2FsbGJhY2sgPSBleHByO1xuICAgICAgZXhwciA9IGNvbnRleHQ7XG4gICAgICBjb250ZXh0ID0gbnVsbDtcbiAgICB9XG4gICAgdmFyIG9ic2VydmVyID0gdGhpcy5vYnNlcnZhdGlvbnMuY3JlYXRlT2JzZXJ2ZXIoZXhwciwgY2FsbGJhY2ssIGNhbGxiYWNrQ29udGV4dCk7XG4gICAgaWYgKGNvbnRleHQpIHtcbiAgICAgIG9ic2VydmVyLmJpbmQoY29udGV4dCwgdHJ1ZSk7XG4gICAgfVxuICAgIHJldHVybiBvYnNlcnZlcjtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBSZWdpc3RlcnMgYSBiaW5kZXIgZm9yIGEgZ2l2ZW4gdHlwZSBhbmQgbmFtZS4gQSBiaW5kZXIgaXMgYSBzdWJjbGFzcyBvZiBCaW5kaW5nIGFuZCBpcyB1c2VkIHRvIGNyZWF0ZSBiaW5kaW5ncyBvblxuICAgKiBhbiBlbGVtZW50IG9yIHRleHQgbm9kZSB3aG9zZSB0YWcgbmFtZSwgYXR0cmlidXRlIG5hbWUsIG9yIGV4cHJlc3Npb24gY29udGVudHMgbWF0Y2ggdGhpcyBiaW5kZXIncyBuYW1lL2V4cHJlc3Npb24uXG4gICAqXG4gICAqICMjIyBQYXJhbWV0ZXJzXG4gICAqXG4gICAqICAqIGB0eXBlYDogdGhlcmUgYXJlIHRocmVlIHR5cGVzIG9mIGJpbmRlcnM6IGVsZW1lbnQsIGF0dHJpYnV0ZSwgb3IgdGV4dC4gVGhlc2UgY29ycmVzcG9uZCB0byBtYXRjaGluZyBhZ2FpbnN0IGFuXG4gICAqICAgIGVsZW1lbnQncyB0YWcgbmFtZSwgYW4gZWxlbWVudCB3aXRoIHRoZSBnaXZlbiBhdHRyaWJ1dGUgbmFtZSwgb3IgYSB0ZXh0IG5vZGUgdGhhdCBtYXRjaGVzIHRoZSBwcm92aWRlZFxuICAgKiAgICBleHByZXNzaW9uLlxuICAgKlxuICAgKiAgKiBgbmFtZWA6IHRvIG1hdGNoLCBhIGJpbmRlciBuZWVkcyB0aGUgbmFtZSBvZiBhbiBlbGVtZW50IG9yIGF0dHJpYnV0ZSwgb3IgYSByZWd1bGFyIGV4cHJlc3Npb24gdGhhdCBtYXRjaGVzIGFcbiAgICogICAgZ2l2ZW4gdGV4dCBub2RlLiBOYW1lcyBmb3IgZWxlbWVudHMgYW5kIGF0dHJpYnV0ZXMgY2FuIGJlIHJlZ3VsYXIgZXhwcmVzc2lvbnMgYXMgd2VsbCwgb3IgdGhleSBtYXkgYmUgd2lsZGNhcmRcbiAgICogICAgbmFtZXMgYnkgdXNpbmcgYW4gYXN0ZXJpc2suXG4gICAqXG4gICAqICAqIGBkZWZpbml0aW9uYDogYSBiaW5kZXIgaXMgYSBzdWJjbGFzcyBvZiBCaW5kaW5nIHdoaWNoIG92ZXJyaWRlcyBrZXkgbWV0aG9kcywgYGNvbXBpbGVkYCwgYGNyZWF0ZWRgLCBgdXBkYXRlZGAsXG4gICAqICAgIGBib3VuZGAsIGFuZCBgdW5ib3VuZGAuIFRoZSBkZWZpbml0aW9uIG1heSBiZSBhbiBhY3R1YWwgc3ViY2xhc3Mgb2YgQmluZGluZyBvciBpdCBtYXkgYmUgYW4gb2JqZWN0IHdoaWNoIHdpbGwgYmVcbiAgICogICAgdXNlZCBmb3IgdGhlIHByb3RvdHlwZSBvZiB0aGUgbmV3bHkgY3JlYXRlZCBzdWJjbGFzcy4gRm9yIG1hbnkgYmluZGluZ3Mgb25seSB0aGUgYHVwZGF0ZWRgIG1ldGhvZCBpcyBvdmVycmlkZGVuLFxuICAgKiAgICBzbyBieSBqdXN0IHBhc3NpbmcgaW4gYSBmdW5jdGlvbiBmb3IgYGRlZmluaXRpb25gIHRoZSBiaW5kZXIgd2lsbCBiZSBjcmVhdGVkIHdpdGggdGhhdCBhcyBpdHMgYHVwZGF0ZWRgIG1ldGhvZC5cbiAgICpcbiAgICogIyMjIEV4cGxhaW5hdGlvbiBvZiBwcm9wZXJ0aWVzIGFuZCBtZXRob2RzXG4gICAqXG4gICAqICAgKiBgcHJpb3JpdHlgIG1heSBiZSBkZWZpbmVkIGFzIG51bWJlciB0byBpbnN0cnVjdCBzb21lIGJpbmRlcnMgdG8gYmUgcHJvY2Vzc2VkIGJlZm9yZSBvdGhlcnMuIEJpbmRlcnMgd2l0aFxuICAgKiAgIGhpZ2hlciBwcmlvcml0eSBhcmUgcHJvY2Vzc2VkIGZpcnN0LlxuICAgKlxuICAgKiAgICogYGFuaW1hdGVkYCBjYW4gYmUgc2V0IHRvIGB0cnVlYCB0byBleHRlbmQgdGhlIEFuaW1hdGVkQmluZGluZyBjbGFzcyB3aGljaCBwcm92aWRlcyBzdXBwb3J0IGZvciBhbmltYXRpb24gd2hlblxuICAgKiAgIGluc2VydGluZ2FuZCByZW1vdmluZyBub2RlcyBmcm9tIHRoZSBET00uIFRoZSBgYW5pbWF0ZWRgIHByb3BlcnR5IG9ubHkgKmFsbG93cyogYW5pbWF0aW9uIGJ1dCB0aGUgZWxlbWVudCBtdXN0XG4gICAqICAgaGF2ZSB0aGUgYGFuaW1hdGVgIGF0dHJpYnV0ZSB0byB1c2UgYW5pbWF0aW9uLiBBIGJpbmRpbmcgd2lsbCBoYXZlIHRoZSBgYW5pbWF0ZWAgcHJvcGVydHkgc2V0IHRvIHRydWUgd2hlbiBpdCBpc1xuICAgKiAgIHRvIGJlIGFuaW1hdGVkLiBCaW5kZXJzIHNob3VsZCBoYXZlIGZhc3QgcGF0aHMgZm9yIHdoZW4gYW5pbWF0aW9uIGlzIG5vdCB1c2VkIHJhdGhlciB0aGFuIGFzc3VtaW5nIGFuaW1hdGlvbiB3aWxsXG4gICAqICAgYmUgdXNlZC5cbiAgICpcbiAgICogQmluZGVyc1xuICAgKlxuICAgKiBBIGJpbmRlciBjYW4gaGF2ZSA1IG1ldGhvZHMgd2hpY2ggd2lsbCBiZSBjYWxsZWQgYXQgdmFyaW91cyBwb2ludHMgaW4gYSBiaW5kaW5nJ3MgbGlmZWN5Y2xlLiBNYW55IGJpbmRlcnMgd2lsbFxuICAgKiBvbmx5IHVzZSB0aGUgYHVwZGF0ZWQodmFsdWUpYCBtZXRob2QsIHNvIGNhbGxpbmcgcmVnaXN0ZXIgd2l0aCBhIGZ1bmN0aW9uIGluc3RlYWQgb2YgYW4gb2JqZWN0IGFzIGl0cyB0aGlyZFxuICAgKiBwYXJhbWV0ZXIgaXMgYSBzaG9ydGN1dCB0byBjcmVhdGluZyBhIGJpbmRlciB3aXRoIGp1c3QgYW4gYHVwZGF0ZWAgbWV0aG9kLlxuICAgKlxuICAgKiBMaXN0ZWQgaW4gb3JkZXIgb2Ygd2hlbiB0aGV5IG9jY3VyIGluIGEgYmluZGluZydzIGxpZmVjeWNsZTpcbiAgICpcbiAgICogICAqIGBjb21waWxlZChvcHRpb25zKWAgaXMgY2FsbGVkIHdoZW4gZmlyc3QgY3JlYXRpbmcgYSBiaW5kaW5nIGR1cmluZyB0aGUgdGVtcGxhdGUgY29tcGlsYXRpb24gcHJvY2VzcyBhbmQgcmVjZWl2ZXNcbiAgICogdGhlIGBvcHRpb25zYCBvYmplY3QgdGhhdCB3aWxsIGJlIHBhc3NlZCBpbnRvIGBuZXcgQmluZGluZyhvcHRpb25zKWAuIFRoaXMgY2FuIGJlIHVzZWQgZm9yIGNyZWF0aW5nIHRlbXBsYXRlcyxcbiAgICogbW9kaWZ5aW5nIHRoZSBET00gKG9ubHkgc3Vic2VxdWVudCBET00gdGhhdCBoYXNuJ3QgYWxyZWFkeSBiZWVuIHByb2Nlc3NlZCkgYW5kIG90aGVyIHRoaW5ncyB0aGF0IHNob3VsZCBiZVxuICAgKiBhcHBsaWVkIGF0IGNvbXBpbGUgdGltZSBhbmQgbm90IGR1cGxpY2F0ZWQgZm9yIGVhY2ggdmlldyBjcmVhdGVkLlxuICAgKlxuICAgKiAgICogYGNyZWF0ZWQoKWAgaXMgY2FsbGVkIG9uIHRoZSBiaW5kaW5nIHdoZW4gYSBuZXcgdmlldyBpcyBjcmVhdGVkLiBUaGlzIGNhbiBiZSB1c2VkIHRvIGFkZCBldmVudCBsaXN0ZW5lcnMgb24gdGhlXG4gICAqIGVsZW1lbnQgb3IgZG8gb3RoZXIgdGhpbmdzIHRoYXQgd2lsbCBwZXJzaXN0ZSB3aXRoIHRoZSB2aWV3IHRocm91Z2ggaXRzIG1hbnkgdXNlcy4gVmlld3MgbWF5IGdldCByZXVzZWQgc28gZG9uJ3RcbiAgICogZG8gYW55dGhpbmcgaGVyZSB0byB0aWUgaXQgdG8gYSBnaXZlbiBjb250ZXh0LlxuICAgKlxuICAgKiAgICogYGF0dGFjaGVkKClgIGlzIGNhbGxlZCBvbiB0aGUgYmluZGluZyB3aGVuIHRoZSB2aWV3IGlzIGJvdW5kIHRvIGEgZ2l2ZW4gY29udGV4dCBhbmQgaW5zZXJ0ZWQgaW50byB0aGUgRE9NLiBUaGlzXG4gICAqIGNhbiBiZSB1c2VkIHRvIGhhbmRsZSBjb250ZXh0LXNwZWNpZmljIGFjdGlvbnMsIGFkZCBsaXN0ZW5lcnMgdG8gdGhlIHdpbmRvdyBvciBkb2N1bWVudCAodG8gYmUgcmVtb3ZlZCBpblxuICAgKiBgZGV0YWNoZWRgISksIGV0Yy5cbiAgICpcbiAgICogICAqIGB1cGRhdGVkKHZhbHVlLCBvbGRWYWx1ZSwgY2hhbmdlUmVjb3JkcylgIGlzIGNhbGxlZCBvbiB0aGUgYmluZGluZyB3aGVuZXZlciB0aGUgdmFsdWUgb2YgdGhlIGV4cHJlc3Npb24gd2l0aGluXG4gICAqIHRoZSBhdHRyaWJ1dGUgY2hhbmdlcy4gRm9yIGV4YW1wbGUsIGBiaW5kLXRleHQ9XCJ7e3VzZXJuYW1lfX1cImAgd2lsbCB0cmlnZ2VyIGB1cGRhdGVkYCB3aXRoIHRoZSB2YWx1ZSBvZiB1c2VybmFtZVxuICAgKiB3aGVuZXZlciBpdCBjaGFuZ2VzIG9uIHRoZSBnaXZlbiBjb250ZXh0LiBXaGVuIHRoZSB2aWV3IGlzIHJlbW92ZWQgYHVwZGF0ZWRgIHdpbGwgYmUgdHJpZ2dlcmVkIHdpdGggYSB2YWx1ZSBvZlxuICAgKiBgdW5kZWZpbmVkYCBpZiB0aGUgdmFsdWUgd2FzIG5vdCBhbHJlYWR5IGB1bmRlZmluZWRgLCBnaXZpbmcgYSBjaGFuY2UgdG8gXCJyZXNldFwiIHRvIGFuIGVtcHR5IHN0YXRlLlxuICAgKlxuICAgKiAgICogYGRldGFjaGVkKClgIGlzIGNhbGxlZCBvbiB0aGUgYmluZGluZyB3aGVuIHRoZSB2aWV3IGlzIHVuYm91bmQgdG8gYSBnaXZlbiBjb250ZXh0IGFuZCByZW1vdmVkIGZyb20gdGhlIERPTS4gVGhpc1xuICAgKiBjYW4gYmUgdXNlZCB0byBjbGVhbiB1cCBhbnl0aGluZyBkb25lIGluIGBhdHRhY2hlZCgpYCBvciBpbiBgdXBkYXRlZCgpYCBiZWZvcmUgYmVpbmcgcmVtb3ZlZC5cbiAgICpcbiAgICogRWxlbWVudCBhbmQgYXR0cmlidXRlIGJpbmRlcnMgd2lsbCBhcHBseSB3aGVuZXZlciB0aGUgdGFnIG5hbWUgb3IgYXR0cmlidXRlIG5hbWUgaXMgbWF0Y2hlZC4gSW4gdGhlIGNhc2Ugb2ZcbiAgICogYXR0cmlidXRlIGJpbmRlcnMgaWYgeW91IG9ubHkgd2FudCBpdCB0byBtYXRjaCB3aGVuIGV4cHJlc3Npb25zIGFyZSB1c2VkIHdpdGhpbiB0aGUgYXR0cmlidXRlLCBhZGQgYG9ubHlXaGVuQm91bmRgXG4gICAqIHRvIHRoZSBkZWZpbml0aW9uLiBPdGhlcndpc2UgdGhlIGJpbmRlciB3aWxsIG1hdGNoIGFuZCB0aGUgdmFsdWUgb2YgdGhlIGV4cHJlc3Npb24gd2lsbCBzaW1wbHkgYmUgYSBzdHJpbmcgdGhhdFxuICAgKiBvbmx5IGNhbGxzIHVwZGF0ZWQgb25jZSBzaW5jZSBpdCB3aWxsIG5vdCBjaGFuZ2UuXG4gICAqXG4gICAqIE5vdGUsIGF0dHJpYnV0ZXMgd2hpY2ggbWF0Y2ggYSBiaW5kZXIgYXJlIHJlbW92ZWQgZHVyaW5nIGNvbXBpbGUuIFRoZXkgYXJlIGNvbnNpZGVyZWQgdG8gYmUgYmluZGluZyBkZWZpbml0aW9ucyBhbmRcbiAgICogbm90IHBhcnQgb2YgdGhlIGVsZW1lbnQuIEJpbmRpbmdzIG1heSBzZXQgdGhlIGF0dHJpYnV0ZSB3aGljaCBzZXJ2ZWQgYXMgdGhlaXIgZGVmaW5pdGlvbiBpZiBkZXNpcmVkLlxuICAgKlxuICAgKiAjIyMgRGVmYXVsdHNcbiAgICpcbiAgICogVGhlcmUgYXJlIGRlZmF1bHQgYmluZGVycyBmb3IgYXR0cmlidXRlIGFuZCB0ZXh0IG5vZGVzIHdoaWNoIGFwcGx5IHdoZW4gbm8gb3RoZXIgYmluZGVycyBtYXRjaC4gVGhleSBvbmx5IGFwcGx5IHRvXG4gICAqIGF0dHJpYnV0ZXMgYW5kIHRleHQgbm9kZXMgd2l0aCBleHByZXNzaW9ucyBpbiB0aGVtIChlLmcuIGB7e2Zvb319YCkuIFRoZSBkZWZhdWx0IGlzIHRvIHNldCB0aGUgYXR0cmlidXRlIG9yIHRleHRcbiAgICogbm9kZSdzIHZhbHVlIHRvIHRoZSByZXN1bHQgb2YgdGhlIGV4cHJlc3Npb24uIElmIHlvdSB3YW50ZWQgdG8gb3ZlcnJpZGUgdGhpcyBkZWZhdWx0IHlvdSBtYXkgcmVnaXN0ZXIgYSBiaW5kZXIgd2l0aFxuICAgKiB0aGUgbmFtZSBgXCJfX2RlZmF1bHRfX1wiYC5cbiAgICpcbiAgICogKipFeGFtcGxlOioqIFRoaXMgYmluZGluZyBoYW5kbGVyIGFkZHMgcGlyYXRlaXplZCB0ZXh0IHRvIGFuIGVsZW1lbnQuXG4gICAqIGBgYGphdmFzY3JpcHRcbiAgICogcmVnaXN0cnkucmVnaXN0ZXJBdHRyaWJ1dGUoJ215LXBpcmF0ZScsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAqICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICogICAgIHZhbHVlID0gJyc7XG4gICAqICAgfSBlbHNlIHtcbiAgICogICAgIHZhbHVlID0gdmFsdWVcbiAgICogICAgICAgLnJlcGxhY2UoL1xcQmluZ1xcYi9nLCBcImluJ1wiKVxuICAgKiAgICAgICAucmVwbGFjZSgvXFxidG9cXGIvZywgXCJ0J1wiKVxuICAgKiAgICAgICAucmVwbGFjZSgvXFxieW91XFxiLywgJ3llJylcbiAgICogICAgICAgKyAnIEFycnJyISc7XG4gICAqICAgfVxuICAgKiAgIHRoaXMuZWxlbWVudC50ZXh0Q29udGVudCA9IHZhbHVlO1xuICAgKiB9KTtcbiAgICogYGBgXG4gICAqXG4gICAqIGBgYGh0bWxcbiAgICogPHAgbXktcGlyYXRlPVwie3twb3N0LmJvZHl9fVwiPlRoaXMgdGV4dCB3aWxsIGJlIHJlcGxhY2VkLjwvcD5cbiAgICogYGBgXG4gICAqL1xuICByZWdpc3RlckVsZW1lbnQ6IGZ1bmN0aW9uKG5hbWUsIGRlZmluaXRpb24pIHtcbiAgICByZXR1cm4gdGhpcy5yZWdpc3RlckJpbmRlcignZWxlbWVudCcsIG5hbWUsIGRlZmluaXRpb24pO1xuICB9LFxuICByZWdpc3RlckF0dHJpYnV0ZTogZnVuY3Rpb24obmFtZSwgZGVmaW5pdGlvbikge1xuICAgIHJldHVybiB0aGlzLnJlZ2lzdGVyQmluZGVyKCdhdHRyaWJ1dGUnLCBuYW1lLCBkZWZpbml0aW9uKTtcbiAgfSxcbiAgcmVnaXN0ZXJUZXh0OiBmdW5jdGlvbihuYW1lLCBkZWZpbml0aW9uKSB7XG4gICAgcmV0dXJuIHRoaXMucmVnaXN0ZXJCaW5kZXIoJ3RleHQnLCBuYW1lLCBkZWZpbml0aW9uKTtcbiAgfSxcbiAgcmVnaXN0ZXJCaW5kZXI6IGZ1bmN0aW9uKHR5cGUsIG5hbWUsIGRlZmluaXRpb24pIHtcbiAgICBpZiAoIWRlZmluaXRpb24pIHRocm93IG5ldyBUeXBlRXJyb3IoJ011c3QgcHJvdmlkZSBhIGRlZmluaXRpb24gd2hlbiByZWdpc3RlcmluZyBhIGJpbmRlcicpO1xuICAgIHZhciBiaW5kZXJzID0gdGhpcy5iaW5kZXJzW3R5cGVdO1xuICAgIHZhciBzdXBlckNsYXNzID0gZGVmaW5pdGlvbi5hbmltYXRlZCA/IEFuaW1hdGVkQmluZGluZyA6IEJpbmRpbmc7XG5cbiAgICBpZiAoIWJpbmRlcnMpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2B0eXBlYCBtdXN0IGJlIG9uZSBvZiAnICsgT2JqZWN0LmtleXModGhpcy5iaW5kZXJzKS5qb2luKCcsICcpKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGRlZmluaXRpb24gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGlmIChkZWZpbml0aW9uLnByb3RvdHlwZSBpbnN0YW5jZW9mIEJpbmRpbmcpIHtcbiAgICAgICAgc3VwZXJDbGFzcyA9IGRlZmluaXRpb247XG4gICAgICAgIGRlZmluaXRpb24gPSB7fTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRlZmluaXRpb24gPSB7IHVwZGF0ZWQ6IGRlZmluaXRpb24gfTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobmFtZSA9PT0gJ19fZGVmYXVsdF9fJyAmJiAhZGVmaW5pdGlvbi5oYXNPd25Qcm9wZXJ0eSgncHJpb3JpdHknKSkge1xuICAgICAgZGVmaW5pdGlvbi5wcmlvcml0eSA9IC0xMDA7XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIGEgc3ViY2xhc3Mgb2YgQmluZGluZyAob3IgYW5vdGhlciBiaW5kZXIpIHdpdGggdGhlIGRlZmluaXRpb25cbiAgICBmdW5jdGlvbiBCaW5kZXIoKSB7XG4gICAgICBzdXBlckNsYXNzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIGRlZmluaXRpb24ub2JzZXJ2YXRpb25zID0gdGhpcy5vYnNlcnZhdGlvbnM7XG4gICAgc3VwZXJDbGFzcy5leHRlbmQoQmluZGVyLCBkZWZpbml0aW9uKTtcblxuICAgIHZhciBleHByO1xuICAgIGlmIChuYW1lIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICBleHByID0gbmFtZTtcbiAgICB9IGVsc2UgaWYgKGhhc1dpbGRjYXJkRXhwci50ZXN0KG5hbWUpKSB7XG4gICAgICBleHByID0gbmV3IFJlZ0V4cCgnXicgKyBlc2NhcGVSZWdFeHAobmFtZSkucmVwbGFjZShlc2NhcGVkV2lsZGNhcmRFeHByLCAnJDEoLiopJykgKyAnJCcpO1xuICAgIH1cblxuICAgIGlmIChleHByKSB7XG4gICAgICBCaW5kZXIuZXhwciA9IGV4cHI7XG4gICAgICBiaW5kZXJzLl93aWxkY2FyZHMucHVzaChCaW5kZXIpO1xuICAgICAgYmluZGVycy5fd2lsZGNhcmRzLnNvcnQodGhpcy5iaW5kaW5nU29ydCk7XG4gICAgfVxuXG4gICAgQmluZGVyLm5hbWUgPSAnJyArIG5hbWU7XG4gICAgYmluZGVyc1tuYW1lXSA9IEJpbmRlcjtcbiAgICByZXR1cm4gQmluZGVyO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgYSBiaW5kZXIgdGhhdCB3YXMgYWRkZWQgd2l0aCBgcmVnaXN0ZXIoKWAuIElmIGFuIFJlZ0V4cCB3YXMgdXNlZCBpbiByZWdpc3RlciBmb3IgdGhlIG5hbWUgaXQgbXVzdCBiZSB1c2VkXG4gICAqIHRvIHVucmVnaXN0ZXIsIGJ1dCBpdCBkb2VzIG5vdCBuZWVkIHRvIGJlIHRoZSBzYW1lIGluc3RhbmNlLlxuICAgKi9cbiAgdW5yZWdpc3RlckVsZW1lbnQ6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy51bnJlZ2lzdGVyQmluZGVyKCdlbGVtZW50JywgbmFtZSk7XG4gIH0sXG4gIHVucmVnaXN0ZXJBdHRyaWJ1dGU6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy51bnJlZ2lzdGVyQmluZGVyKCdhdHRyaWJ1dGUnLCBuYW1lKTtcbiAgfSxcbiAgdW5yZWdpc3RlclRleHQ6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy51bnJlZ2lzdGVyQmluZGVyKCd0ZXh0JywgbmFtZSk7XG4gIH0sXG4gIHVucmVnaXN0ZXJCaW5kZXI6IGZ1bmN0aW9uKHR5cGUsIG5hbWUpIHtcbiAgICB2YXIgYmluZGVyID0gdGhpcy5nZXRCaW5kZXIodHlwZSwgbmFtZSksIGJpbmRlcnMgPSB0aGlzLmJpbmRlcnNbdHlwZV07XG4gICAgaWYgKCFiaW5kZXIpIHJldHVybjtcbiAgICBpZiAoYmluZGVyLmV4cHIpIHtcbiAgICAgIHZhciBpbmRleCA9IGJpbmRlcnMuX3dpbGRjYXJkcy5pbmRleE9mKGJpbmRlcik7XG4gICAgICBpZiAoaW5kZXggPj0gMCkgYmluZGVycy5fd2lsZGNhcmRzLnNwbGljZShpbmRleCwgMSk7XG4gICAgfVxuICAgIGRlbGV0ZSBiaW5kZXJzW25hbWVdO1xuICAgIHJldHVybiBiaW5kZXI7XG4gIH0sXG5cblxuICAvKipcbiAgICogUmV0dXJucyBhIGJpbmRlciB0aGF0IHdhcyBhZGRlZCB3aXRoIGByZWdpc3RlcigpYCBieSB0eXBlIGFuZCBuYW1lLlxuICAgKi9cbiAgZ2V0RWxlbWVudEJpbmRlcjogZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLmdldEJpbmRlcignZWxlbWVudCcsIG5hbWUpO1xuICB9LFxuICBnZXRBdHRyaWJ1dGVCaW5kZXI6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRCaW5kZXIoJ2F0dHJpYnV0ZScsIG5hbWUpO1xuICB9LFxuICBnZXRUZXh0QmluZGVyOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QmluZGVyKCd0ZXh0JywgbmFtZSk7XG4gIH0sXG4gIGdldEJpbmRlcjogZnVuY3Rpb24odHlwZSwgbmFtZSkge1xuICAgIHZhciBiaW5kZXJzID0gdGhpcy5iaW5kZXJzW3R5cGVdO1xuXG4gICAgaWYgKCFiaW5kZXJzKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdgdHlwZWAgbXVzdCBiZSBvbmUgb2YgJyArIE9iamVjdC5rZXlzKHRoaXMuYmluZGVycykuam9pbignLCAnKSk7XG4gICAgfVxuXG4gICAgaWYgKG5hbWUgJiYgYmluZGVycy5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgcmV0dXJuIGJpbmRlcnNbbmFtZV07XG4gICAgfVxuICB9LFxuXG5cbiAgLyoqXG4gICAqIEZpbmQgYSBtYXRjaGluZyBiaW5kZXIgZm9yIHRoZSBnaXZlbiB0eXBlLiBFbGVtZW50cyBzaG91bGQgb25seSBwcm92aWRlIG5hbWUuIEF0dHJpYnV0ZXMgc2hvdWxkIHByb3ZpZGUgdGhlIG5hbWVcbiAgICogYW5kIHZhbHVlICh2YWx1ZSBzbyB0aGUgZGVmYXVsdCBjYW4gYmUgcmV0dXJuZWQgaWYgYW4gZXhwcmVzc2lvbiBleGlzdHMgaW4gdGhlIHZhbHVlKS4gVGV4dCBub2RlcyBzaG91bGQgb25seVxuICAgKiBwcm92aWRlIHRoZSB2YWx1ZSAoaW4gcGxhY2Ugb2YgdGhlIG5hbWUpIGFuZCB3aWxsIHJldHVybiB0aGUgZGVmYXVsdCBpZiBubyBiaW5kZXJzIG1hdGNoLlxuICAgKi9cbiAgZmluZEJpbmRlcjogZnVuY3Rpb24odHlwZSwgbmFtZSwgdmFsdWUpIHtcbiAgICBpZiAodHlwZSA9PT0gJ3RleHQnICYmIHZhbHVlID09IG51bGwpIHtcbiAgICAgIHZhbHVlID0gbmFtZTtcbiAgICAgIG5hbWUgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgaWYgKG5hbWUgPT09IHRoaXMuYW5pbWF0ZUF0dHJpYnV0ZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBiaW5kZXIgPSB0aGlzLmdldEJpbmRlcih0eXBlLCBuYW1lKSwgYmluZGVycyA9IHRoaXMuYmluZGVyc1t0eXBlXTtcblxuICAgIGlmICghYmluZGVyKSB7XG4gICAgICB2YXIgdG9NYXRjaCA9ICh0eXBlID09PSAndGV4dCcpID8gdmFsdWUgOiBuYW1lO1xuICAgICAgYmluZGVycy5fd2lsZGNhcmRzLnNvbWUoZnVuY3Rpb24od2lsZGNhcmRCaW5kZXIpIHtcbiAgICAgICAgaWYgKHRvTWF0Y2gubWF0Y2god2lsZGNhcmRCaW5kZXIuZXhwcikpIHtcbiAgICAgICAgICBiaW5kZXIgPSB3aWxkY2FyZEJpbmRlcjtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gZG9uJ3QgdXNlIGUuZy4gdGhlIGB2YWx1ZWAgYmluZGVyIGlmIHRoZXJlIGlzIG5vIGV4cHJlc3Npb24gaW4gdGhlIGF0dHJpYnV0ZSB2YWx1ZSAoZS5nLiBgdmFsdWU9XCJzb21lIHRleHRcImApXG4gICAgaWYgKGJpbmRlciAmJlxuICAgICAgICB0eXBlID09PSAnYXR0cmlidXRlJyAmJlxuICAgICAgICBiaW5kZXIucHJvdG90eXBlLm9ubHlXaGVuQm91bmQgJiZcbiAgICAgICAgIXRoaXMuYmluZGVyc1t0eXBlXS5fZGVsaW1pdGVyc09ubHlJbkRlZmF1bHQgJiZcbiAgICAgICAgIXRoaXMuaXNCb3VuZCh0eXBlLCB2YWx1ZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBUZXN0IGlmIHRoZSBhdHRyaWJ1dGUgdmFsdWUgaXMgYm91bmQgKGUuZy4gYGhyZWY9XCIvcG9zdHMve3sgcG9zdC5pZCB9fVwiYClcbiAgICBpZiAoIWJpbmRlciAmJiB2YWx1ZSAmJiAodHlwZSA9PT0gJ3RleHQnIHx8IHRoaXMuaXNCb3VuZCh0eXBlLCB2YWx1ZSkpKSB7XG4gICAgICBiaW5kZXIgPSB0aGlzLmdldEJpbmRlcih0eXBlLCAnX19kZWZhdWx0X18nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYmluZGVyO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIEEgRm9ybWF0dGVyIGlzIHN0b3JlZCB0byBwcm9jZXNzIHRoZSB2YWx1ZSBvZiBhbiBleHByZXNzaW9uLiBUaGlzIGFsdGVycyB0aGUgdmFsdWUgb2Ygd2hhdCBjb21lcyBpbiB3aXRoIGEgZnVuY3Rpb25cbiAgICogdGhhdCByZXR1cm5zIGEgbmV3IHZhbHVlLiBGb3JtYXR0ZXJzIGFyZSBhZGRlZCBieSB1c2luZyBhIHNpbmdsZSBwaXBlIGNoYXJhY3RlciAoYHxgKSBmb2xsb3dlZCBieSB0aGUgbmFtZSBvZiB0aGVcbiAgICogZm9ybWF0dGVyLiBNdWx0aXBsZSBmb3JtYXR0ZXJzIGNhbiBiZSB1c2VkIGJ5IGNoYWluaW5nIHBpcGVzIHdpdGggZm9ybWF0dGVyIG5hbWVzLiBGb3JtYXR0ZXJzIG1heSBhbHNvIGhhdmVcbiAgICogYXJndW1lbnRzIHBhc3NlZCB0byB0aGVtIGJ5IHVzaW5nIHRoZSBjb2xvbiB0byBzZXBhcmF0ZSBhcmd1bWVudHMgZnJvbSB0aGUgZm9ybWF0dGVyIG5hbWUuIFRoZSBzaWduYXR1cmUgb2YgYVxuICAgKiBmb3JtYXR0ZXIgc2hvdWxkIGJlIGBmdW5jdGlvbih2YWx1ZSwgYXJncy4uLilgIHdoZXJlIGFyZ3MgYXJlIGV4dHJhIHBhcmFtZXRlcnMgcGFzc2VkIGludG8gdGhlIGZvcm1hdHRlciBhZnRlclxuICAgKiBjb2xvbnMuXG4gICAqXG4gICAqICpFeGFtcGxlOipcbiAgICogYGBganNcbiAgICogcmVnaXN0cnkucmVnaXN0ZXJGb3JtYXR0ZXIoJ3VwcGVyY2FzZScsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAqICAgaWYgKHR5cGVvZiB2YWx1ZSAhPSAnc3RyaW5nJykgcmV0dXJuICcnXG4gICAqICAgcmV0dXJuIHZhbHVlLnRvVXBwZXJjYXNlKClcbiAgICogfSlcbiAgICpcbiAgICogcmVnaXN0cnkucmVnaXN0ZXJGb3JtYXR0ZXIoJ3JlcGxhY2UnLCBmdW5jdGlvbih2YWx1ZSwgcmVwbGFjZSwgd2l0aCkge1xuICAgKiAgIGlmICh0eXBlb2YgdmFsdWUgIT0gJ3N0cmluZycpIHJldHVybiAnJ1xuICAgKiAgIHJldHVybiB2YWx1ZS5yZXBsYWNlKHJlcGxhY2UsIHdpdGgpXG4gICAqIH0pXG4gICAqIGBgYGh0bWxcbiAgICogPGgxIGJpbmQtdGV4dD1cInRpdGxlIHwgdXBwZXJjYXNlIHwgcmVwbGFjZTonTEVUVEVSJzonTlVNQkVSJ1wiPjwvaDE+XG4gICAqIGBgYFxuICAgKiAqUmVzdWx0OipcbiAgICogYGBgaHRtbFxuICAgKiA8aDE+R0VUVElORyBUTyBLTk9XIEFMTCBBQk9VVCBUSEUgTlVNQkVSIEE8L2gxPlxuICAgKiBgYGBcbiAgICogVE9ETzogb2xkIGRvY3MsIHJld3JpdGUsIHRoZXJlIGlzIGFuIGV4dHJhIGFyZ3VtZW50IG5hbWVkIGBzZXR0ZXJgIHdoaWNoIHdpbGwgYmUgdHJ1ZSB3aGVuIHRoZSBleHByZXNzaW9uIGlzIGJlaW5nIFwic2V0XCIgaW5zdGVhZCBvZiBcImdldFwiXG4gICAqIEEgYHZhbHVlRm9ybWF0dGVyYCBpcyBsaWtlIGEgZm9ybWF0dGVyIGJ1dCB1c2VkIHNwZWNpZmljYWxseSB3aXRoIHRoZSBgdmFsdWVgIGJpbmRpbmcgc2luY2UgaXQgaXMgYSB0d28td2F5IGJpbmRpbmcuIFdoZW5cbiAgICogdGhlIHZhbHVlIG9mIHRoZSBlbGVtZW50IGlzIGNoYW5nZWQgYSBgdmFsdWVGb3JtYXR0ZXJgIGNhbiBhZGp1c3QgdGhlIHZhbHVlIGZyb20gYSBzdHJpbmcgdG8gdGhlIGNvcnJlY3QgdmFsdWUgdHlwZSBmb3JcbiAgICogdGhlIGNvbnRyb2xsZXIgZXhwcmVzc2lvbi4gVGhlIHNpZ25hdHVyZSBmb3IgYSBgdmFsdWVGb3JtYXR0ZXJgIGluY2x1ZGVzIHRoZSBjdXJyZW50IHZhbHVlIG9mIHRoZSBleHByZXNzaW9uXG4gICAqIGJlZm9yZSB0aGUgb3B0aW9uYWwgYXJndW1lbnRzIChpZiBhbnkpLiBUaGlzIGFsbG93cyBkYXRlcyB0byBiZSBhZGp1c3RlZCBhbmQgcG9zc2libGV5IG90aGVyIHVzZXMuXG4gICAqXG4gICAqICpFeGFtcGxlOipcbiAgICogYGBganNcbiAgICogcmVnaXN0cnkucmVnaXN0ZXJGb3JtYXR0ZXIoJ251bWVyaWMnLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgKiAgIC8vIHZhbHVlIGNvbWluZyBmcm9tIHRoZSBjb250cm9sbGVyIGV4cHJlc3Npb24sIHRvIGJlIHNldCBvbiB0aGUgZWxlbWVudFxuICAgKiAgIGlmICh2YWx1ZSA9PSBudWxsIHx8IGlzTmFOKHZhbHVlKSkgcmV0dXJuICcnXG4gICAqICAgcmV0dXJuIHZhbHVlXG4gICAqIH0pXG4gICAqXG4gICAqIHJlZ2lzdHJ5LnJlZ2lzdGVyRm9ybWF0dGVyKCdkYXRlLWhvdXInLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgKiAgIC8vIHZhbHVlIGNvbWluZyBmcm9tIHRoZSBjb250cm9sbGVyIGV4cHJlc3Npb24sIHRvIGJlIHNldCBvbiB0aGUgZWxlbWVudFxuICAgKiAgIGlmICggIShjdXJyZW50VmFsdWUgaW5zdGFuY2VvZiBEYXRlKSApIHJldHVybiAnJ1xuICAgKiAgIHZhciBob3VycyA9IHZhbHVlLmdldEhvdXJzKClcbiAgICogICBpZiAoaG91cnMgPj0gMTIpIGhvdXJzIC09IDEyXG4gICAqICAgaWYgKGhvdXJzID09IDApIGhvdXJzID0gMTJcbiAgICogICByZXR1cm4gaG91cnNcbiAgICogfSlcbiAgICogYGBgaHRtbFxuICAgKiA8bGFiZWw+TnVtYmVyIEF0dGVuZGluZzo8L2xhYmVsPlxuICAgKiA8aW5wdXQgc2l6ZT1cIjRcIiBiaW5kLXZhbHVlPVwiZXZlbnQuYXR0ZW5kZWVDb3VudCB8IG51bWVyaWNcIj5cbiAgICogPGxhYmVsPlRpbWU6PC9sYWJlbD5cbiAgICogPGlucHV0IHNpemU9XCIyXCIgYmluZC12YWx1ZT1cImV2ZW50LmRhdGUgfCBkYXRlLWhvdXJcIj4gOlxuICAgKiA8aW5wdXQgc2l6ZT1cIjJcIiBiaW5kLXZhbHVlPVwiZXZlbnQuZGF0ZSB8IGRhdGUtbWludXRlXCI+XG4gICAqIDxzZWxlY3QgYmluZC12YWx1ZT1cImV2ZW50LmRhdGUgfCBkYXRlLWFtcG1cIj5cbiAgICogICA8b3B0aW9uPkFNPC9vcHRpb24+XG4gICAqICAgPG9wdGlvbj5QTTwvb3B0aW9uPlxuICAgKiA8L3NlbGVjdD5cbiAgICogYGBgXG4gICAqL1xuICByZWdpc3RlckZvcm1hdHRlcjogZnVuY3Rpb24gKG5hbWUsIGZvcm1hdHRlcikge1xuICAgIHRoaXMuZm9ybWF0dGVyc1tuYW1lXSA9IGZvcm1hdHRlcjtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBVbnJlZ2lzdGVycyBhIGZvcm1hdHRlci5cbiAgICovXG4gIHVucmVnaXN0ZXJGb3JtYXR0ZXI6IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgZGVsZXRlIHRoaXMuZm9ybWF0dGVyc1tuYW1lXTtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBHZXRzIGEgcmVnaXN0ZXJlZCBmb3JtYXR0ZXIuXG4gICAqL1xuICBnZXRGb3JtYXR0ZXI6IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuZm9ybWF0dGVyc1tuYW1lXTtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBBbiBBbmltYXRpb24gaXMgc3RvcmVkIHRvIGhhbmRsZSBhbmltYXRpb25zLiBBIHJlZ2lzdGVyZWQgYW5pbWF0aW9uIGlzIGFuIG9iamVjdCAob3IgY2xhc3Mgd2hpY2ggaW5zdGFudGlhdGVzIGludG9cbiAgICogYW4gb2JqZWN0KSB3aXRoIHRoZSBtZXRob2RzOlxuICAgKiAgICogYHdpbGxBbmltYXRlSW4oZWxlbWVudClgXG4gICAqICAgKiBgYW5pbWF0ZUluKGVsZW1lbnQsIGNhbGxiYWNrKWBcbiAgICogICAqIGBkaWRBbmltYXRlSW4oZWxlbWVudClgXG4gICAqICAgKiBgd2lsbEFuaW1hdGVPdXQoZWxlbWVudClgXG4gICAqICAgKiBgYW5pbWF0ZU91dChlbGVtZW50LCBjYWxsYmFjaylgXG4gICAqICAgKiBgZGlkQW5pbWF0ZU91dChlbGVtZW50KWBcbiAgICpcbiAgICogQW5pbWF0aW9uIGlzIGluY2x1ZGVkIHdpdGggYmluZGVycyB3aGljaCBhcmUgcmVnaXN0ZXJlZCB3aXRoIHRoZSBgYW5pbWF0ZWRgIHByb3BlcnR5IHNldCB0byBgdHJ1ZWAgKHN1Y2ggYXMgYGlmYFxuICAgKiBhbmQgYHJlcGVhdGApLiBBbmltYXRpb25zIGFsbG93IGVsZW1lbnRzIHRvIGZhZGUgaW4sIGZhZGUgb3V0LCBzbGlkZSBkb3duLCBjb2xsYXBzZSwgbW92ZSBmcm9tIG9uZSBsb2NhdGlvbiBpbiBhXG4gICAqIGxpc3QgdG8gYW5vdGhlciwgYW5kIG1vcmUuXG4gICAqXG4gICAqIFRvIHVzZSBhbmltYXRpb24gYWRkIGFuIGF0dHJpYnV0ZSBuYW1lZCBgYW5pbWF0ZWAgb250byBhbiBlbGVtZW50IHdpdGggYSBzdXBwb3J0ZWQgYmluZGVyLlxuICAgKlxuICAgKiAjIyMgQ1NTIEFuaW1hdGlvbnNcbiAgICpcbiAgICogSWYgdGhlIGBhbmltYXRlYCBhdHRyaWJ1dGUgZG9lcyBub3QgaGF2ZSBhIHZhbHVlIG9yIHRoZSB2YWx1ZSBpcyBhIGNsYXNzIG5hbWUgKGUuZy4gYGFuaW1hdGU9XCIubXktZmFkZVwiYCkgdGhlblxuICAgKiBmcmFnbWVudHMgd2lsbCB1c2UgYSBDU1MgdHJhbnNpdGlvbi9hbmltYXRpb24uIENsYXNzZXMgd2lsbCBiZSBhZGRlZCBhbmQgcmVtb3ZlZCB0byB0cmlnZ2VyIHRoZSBhbmltYXRpb24uXG4gICAqXG4gICAqICAgKiBgLndpbGwtYW5pbWF0ZS1pbmAgaXMgYWRkZWQgcmlnaHQgYWZ0ZXIgYW4gZWxlbWVudCBpcyBpbnNlcnRlZCBpbnRvIHRoZSBET00uIFRoaXMgY2FuIGJlIHVzZWQgdG8gc2V0IHRoZVxuICAgKiAgICAgb3BhY2l0eSB0byBgMC4wYCBmb3IgZXhhbXBsZS4gSXQgaXMgdGhlbiByZW1vdmVkIG9uIHRoZSBuZXh0IGFuaW1hdGlvbiBmcmFtZS5cbiAgICogICAqIGAuYW5pbWF0ZS1pbmAgaXMgd2hlbiBgLndpbGwtYW5pbWF0ZS1pbmAgaXMgcmVtb3ZlZC4gSXQgY2FuIGJlIHVzZWQgdG8gc2V0IG9wYWNpdHkgdG8gYDEuMGAgZm9yIGV4YW1wbGUuIFRoZVxuICAgKiAgICAgYGFuaW1hdGlvbmAgc3R5bGUgY2FuIGJlIHNldCBvbiB0aGlzIGNsYXNzIGlmIHVzaW5nIGl0LiBUaGUgYHRyYW5zaXRpb25gIHN0eWxlIGNhbiBiZSBzZXQgaGVyZS4gTm90ZSB0aGF0XG4gICAqICAgICBhbHRob3VnaCB0aGUgYGFuaW1hdGVgIGF0dHJpYnV0ZSBpcyBwbGFjZWQgb24gYW4gZWxlbWVudCB3aXRoIHRoZSBgcmVwZWF0YCBiaW5kZXIsIHRoZXNlIGNsYXNzZXMgYXJlIGFkZGVkIHRvXG4gICAqICAgICBpdHMgY2hpbGRyZW4gYXMgdGhleSBnZXQgYWRkZWQgYW5kIHJlbW92ZWQuXG4gICAqICAgKiBgLndpbGwtYW5pbWF0ZS1vdXRgIGlzIGFkZGVkIGJlZm9yZSBhbiBlbGVtZW50IGlzIHJlbW92ZWQgZnJvbSB0aGUgRE9NLiBUaGlzIGNhbiBiZSB1c2VkIHRvIHNldCB0aGUgb3BhY2l0eSB0b1xuICAgKiAgICAgYDFgIGZvciBleGFtcGxlLiBJdCBpcyB0aGVuIHJlbW92ZWQgb24gdGhlIG5leHQgYW5pbWF0aW9uIGZyYW1lLlxuICAgKiAgICogYC5hbmltYXRlLW91dGAgaXMgYWRkZWQgd2hlbiBgLndpbGwtYW5pbWF0ZS1vdXRgIGlzIHJlbW92ZWQuIEl0IGNhbiBiZSB1c2VkIHRvIHNldCBvcGFjaXR5IHRvIGAwLjBgIGZvclxuICAgKiAgICAgZXhhbXBsZS4gVGhlIGBhbmltYXRpb25gIHN0eWxlIGNhbiBiZSBzZXQgb24gdGhpcyBjbGFzcyBpZiB1c2luZyBpdC4gVGhlIGB0cmFuc2l0aW9uYCBzdHlsZSBjYW4gYmUgc2V0IGhlcmUgb3JcbiAgICogICAgIG9uIGFub3RoZXIgc2VsZWN0b3IgdGhhdCBtYXRjaGVzIHRoZSBlbGVtZW50LiBOb3RlIHRoYXQgYWx0aG91Z2ggdGhlIGBhbmltYXRlYCBhdHRyaWJ1dGUgaXMgcGxhY2VkIG9uIGFuXG4gICAqICAgICBlbGVtZW50IHdpdGggdGhlIGByZXBlYXRgIGJpbmRlciwgdGhlc2UgY2xhc3NlcyBhcmUgYWRkZWQgdG8gaXRzIGNoaWxkcmVuIGFzIHRoZXkgZ2V0IGFkZGVkIGFuZCByZW1vdmVkLlxuICAgKlxuICAgKiBJZiB0aGUgYGFuaW1hdGVgIGF0dHJpYnV0ZSBpcyBzZXQgdG8gYSBjbGFzcyBuYW1lIChlLmcuIGBhbmltYXRlPVwiLm15LWZhZGVcImApIHRoZW4gdGhhdCBjbGFzcyBuYW1lIHdpbGwgYmUgYWRkZWQgYXNcbiAgICogYSBjbGFzcyB0byB0aGUgZWxlbWVudCBkdXJpbmcgYW5pbWF0aW9uLiBUaGlzIGFsbG93cyB5b3UgdG8gdXNlIGAubXktZmFkZS53aWxsLWFuaW1hdGUtaW5gLCBgLm15LWZhZGUuYW5pbWF0ZS1pbmAsXG4gICAqIGV0Yy4gaW4geW91ciBzdHlsZXNoZWV0cyB0byB1c2UgdGhlIHNhbWUgYW5pbWF0aW9uIHRocm91Z2hvdXQgeW91ciBhcHBsaWNhdGlvbi5cbiAgICpcbiAgICogIyMjIEphdmFTY3JpcHQgQW5pbWF0aW9uc1xuICAgKlxuICAgKiBJZiB5b3UgbmVlZCBncmVhdGVyIGNvbnRyb2wgb3ZlciB5b3VyIGFuaW1hdGlvbnMgSmF2YVNjcmlwdCBtYXkgYmUgdXNlZC4gSXQgaXMgcmVjb21tZW5kZWQgdGhhdCBDU1Mgc3R5bGVzIHN0aWxsIGJlXG4gICAqIHVzZWQgYnkgaGF2aW5nIHlvdXIgY29kZSBzZXQgdGhlbSBtYW51YWxseS4gVGhpcyBhbGxvd3MgdGhlIGFuaW1hdGlvbiB0byB0YWtlIGFkdmFudGFnZSBvZiB0aGUgYnJvd3NlclxuICAgKiBvcHRpbWl6YXRpb25zIHN1Y2ggYXMgaGFyZHdhcmUgYWNjZWxlcmF0aW9uLiBUaGlzIGlzIG5vdCBhIHJlcXVpcmVtZW50LlxuICAgKlxuICAgKiBJbiBvcmRlciB0byB1c2UgSmF2YVNjcmlwdCBhbiBvYmplY3Qgc2hvdWxkIGJlIHBhc3NlZCBpbnRvIHRoZSBgYW5pbWF0aW9uYCBhdHRyaWJ1dGUgdXNpbmcgYW4gZXhwcmVzc2lvbi4gVGhpc1xuICAgKiBvYmplY3Qgc2hvdWxkIGhhdmUgbWV0aG9kcyB0aGF0IGFsbG93IEphdmFTY3JpcHQgYW5pbWF0aW9uIGhhbmRsaW5nLiBGb3IgZXhhbXBsZSwgaWYgeW91IGFyZSBib3VuZCB0byBhIGNvbnRleHRcbiAgICogd2l0aCBhbiBvYmplY3QgbmFtZWQgYGN1c3RvbUZhZGVgIHdpdGggYW5pbWF0aW9uIG1ldGhvZHMsIHlvdXIgZWxlbWVudCBzaG91bGQgaGF2ZSBgYXR0cmlidXRlPVwie3tjdXN0b21GYWRlfX1cImAuXG4gICAqIFRoZSBmb2xsb3dpbmcgaXMgYSBsaXN0IG9mIHRoZSBtZXRob2RzIHlvdSBtYXkgaW1wbGVtZW50LlxuICAgKlxuICAgKiAgICogYHdpbGxBbmltYXRlSW4oZWxlbWVudClgIHdpbGwgYmUgY2FsbGVkIGFmdGVyIGFuIGVsZW1lbnQgaGFzIGJlZW4gaW5zZXJ0ZWQgaW50byB0aGUgRE9NLiBVc2UgaXQgdG8gc2V0IGluaXRpYWxcbiAgICogICAgIENTUyBwcm9wZXJ0aWVzIGJlZm9yZSBgYW5pbWF0ZUluYCBpcyBjYWxsZWQgdG8gc2V0IHRoZSBmaW5hbCBwcm9wZXJ0aWVzLiBUaGlzIG1ldGhvZCBpcyBvcHRpb25hbC5cbiAgICogICAqIGBhbmltYXRlSW4oZWxlbWVudCwgY2FsbGJhY2spYCB3aWxsIGJlIGNhbGxlZCBzaG9ydGx5IGFmdGVyIGB3aWxsQW5pbWF0ZUluYCBpZiBpdCB3YXMgZGVmaW5lZC4gVXNlIGl0IHRvIHNldFxuICAgKiAgICAgZmluYWwgQ1NTIHByb3BlcnRpZXMuXG4gICAqICAgKiBgYW5pbWF0ZU91dChlbGVtZW50LCBkb25lKWAgd2lsbCBiZSBjYWxsZWQgYmVmb3JlIGFuIGVsZW1lbnQgaXMgdG8gYmUgcmVtb3ZlZCBmcm9tIHRoZSBET00uIGBkb25lYCBtdXN0IGJlXG4gICAqICAgICBjYWxsZWQgd2hlbiB0aGUgYW5pbWF0aW9uIGlzIGNvbXBsZXRlIGluIG9yZGVyIGZvciB0aGUgYmluZGVyIHRvIGZpbmlzaCByZW1vdmluZyB0aGUgZWxlbWVudC4gKipSZW1lbWJlcioqIHRvXG4gICAqICAgICBjbGVhbiB1cCBieSByZW1vdmluZyBhbnkgc3R5bGVzIHRoYXQgd2VyZSBhZGRlZCBiZWZvcmUgY2FsbGluZyBgZG9uZSgpYCBzbyB0aGUgZWxlbWVudCBjYW4gYmUgcmV1c2VkIHdpdGhvdXRcbiAgICogICAgIHNpZGUtZWZmZWN0cy5cbiAgICpcbiAgICogVGhlIGBlbGVtZW50YCBwYXNzZWQgaW4gd2lsbCBiZSBwb2x5ZmlsbGVkIGZvciB3aXRoIHRoZSBgYW5pbWF0ZWAgbWV0aG9kIHVzaW5nXG4gICAqIGh0dHBzOi8vZ2l0aHViLmNvbS93ZWItYW5pbWF0aW9ucy93ZWItYW5pbWF0aW9ucy1qcy5cbiAgICpcbiAgICogIyMjIFJlZ2lzdGVyZWQgQW5pbWF0aW9uc1xuICAgKlxuICAgKiBBbmltYXRpb25zIG1heSBiZSByZWdpc3RlcmVkIGFuZCB1c2VkIHRocm91Z2hvdXQgeW91ciBhcHBsaWNhdGlvbi4gVG8gdXNlIGEgcmVnaXN0ZXJlZCBhbmltYXRpb24gdXNlIGl0cyBuYW1lIGluXG4gICAqIHRoZSBgYW5pbWF0ZWAgYXR0cmlidXRlIChlLmcuIGBhbmltYXRlPVwiZmFkZVwiYCkuIE5vdGUgdGhlIG9ubHkgZGlmZmVyZW5jZSBiZXR3ZWVuIGEgcmVnaXN0ZXJlZCBhbmltYXRpb24gYW5kIGFcbiAgICogY2xhc3MgcmVnaXN0cmF0aW9uIGlzIGNsYXNzIHJlZ2lzdHJhdGlvbnMgYXJlIHByZWZpeGVkIHdpdGggYSBkb3QgKGAuYCkuIFJlZ2lzdGVyZWQgYW5pbWF0aW9ucyBhcmUgYWx3YXlzXG4gICAqIEphdmFTY3JpcHQgYW5pbWF0aW9ucy4gVG8gcmVnaXN0ZXIgYW4gYW5pbWF0aW9uIHVzZSBgZnJhZ21lbnRzLnJlZ2lzdGVyQW5pbWF0aW9uKG5hbWUsIGFuaW1hdGlvbk9iamVjdClgLlxuICAgKlxuICAgKiBUaGUgQW5pbWF0aW9uIG1vZHVsZSBjb21lcyB3aXRoIHNldmVyYWwgY29tbW9uIGFuaW1hdGlvbnMgcmVnaXN0ZXJlZCBieSBkZWZhdWx0LiBUaGUgZGVmYXVsdHMgdXNlIENTUyBzdHlsZXMgdG9cbiAgICogd29yayBjb3JyZWN0bHksIHVzaW5nIGBlbGVtZW50LmFuaW1hdGVgLlxuICAgKlxuICAgKiAgICogYGZhZGVgIHdpbGwgZmFkZSBhbiBlbGVtZW50IGluIGFuZCBvdXQgb3ZlciAzMDAgbWlsbGlzZWNvbmRzLlxuICAgKiAgICogYHNsaWRlYCB3aWxsIHNsaWRlIGFuIGVsZW1lbnQgZG93biB3aGVuIGl0IGlzIGFkZGVkIGFuZCBzbGlkZSBpdCB1cCB3aGVuIGl0IGlzIHJlbW92ZWQuXG4gICAqICAgKiBgc2xpZGUtbW92ZWAgd2lsbCBtb3ZlIGFuIGVsZW1lbnQgZnJvbSBpdHMgb2xkIGxvY2F0aW9uIHRvIGl0cyBuZXcgbG9jYXRpb24gaW4gYSByZXBlYXRlZCBsaXN0LlxuICAgKlxuICAgKiBEbyB5b3UgaGF2ZSBhbm90aGVyIGNvbW1vbiBhbmltYXRpb24geW91IHRoaW5rIHNob3VsZCBiZSBpbmNsdWRlZCBieSBkZWZhdWx0PyBTdWJtaXQgYSBwdWxsIHJlcXVlc3QhXG4gICAqL1xuICByZWdpc3RlckFuaW1hdGlvbjogZnVuY3Rpb24obmFtZSwgYW5pbWF0aW9uT2JqZWN0KSB7XG4gICAgdGhpcy5hbmltYXRpb25zW25hbWVdID0gYW5pbWF0aW9uT2JqZWN0O1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIFVucmVnaXN0ZXJzIGFuIGFuaW1hdGlvbi5cbiAgICovXG4gIHVucmVnaXN0ZXJBbmltYXRpb246IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBkZWxldGUgdGhpcy5hbmltYXRpb25zW25hbWVdO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIEdldHMgYSByZWdpc3RlcmVkIGFuaW1hdGlvbi5cbiAgICovXG4gIGdldEFuaW1hdGlvbjogZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLmFuaW1hdGlvbnNbbmFtZV07XG4gIH0sXG5cblxuICAvKipcbiAgICogUHJlcGFyZSBhbiBlbGVtZW50IHRvIGJlIGVhc2llciBhbmltYXRhYmxlIChhZGRpbmcgYSBzaW1wbGUgYGFuaW1hdGVgIHBvbHlmaWxsIGlmIG5lZWRlZClcbiAgICovXG4gIG1ha2VFbGVtZW50QW5pbWF0YWJsZTogYW5pbWF0aW9uLm1ha2VFbGVtZW50QW5pbWF0YWJsZSxcblxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBkZWxpbWl0ZXJzIHRoYXQgZGVmaW5lIGFuIGV4cHJlc3Npb24uIERlZmF1bHQgaXMgYHt7YCBhbmQgYH19YCBidXQgdGhpcyBtYXkgYmUgb3ZlcnJpZGRlbi4gSWYgZW1wdHlcbiAgICogc3RyaW5ncyBhcmUgcGFzc2VkIGluIChmb3IgdHlwZSBcImF0dHJpYnV0ZVwiIG9ubHkpIHRoZW4gbm8gZGVsaW1pdGVycyBhcmUgcmVxdWlyZWQgZm9yIG1hdGNoaW5nIGF0dHJpYnV0ZXMsIGJ1dCB0aGVcbiAgICogZGVmYXVsdCBhdHRyaWJ1dGUgbWF0Y2hlciB3aWxsIG5vdCBhcHBseSB0byB0aGUgcmVzdCBvZiB0aGUgYXR0cmlidXRlcy4gVE9ETyBzdXBwb3J0IGRpZmZlcmVudCBkZWxpbWl0ZXJzIGZvciB0aGVcbiAgICogZGVmYXVsdCBhdHRyaWJ1dGVzIHZzIHJlZ2lzdGVyZWQgb25lcyAoaS5lLiBhbGxvdyByZWd1bGFyIGF0dHJpYnV0ZXMgdG8gdXNlIHt7fX0gd2hlbiBib3VuZCBvbmVzIGRvIG5vdCBuZWVkIHRoZW0pXG4gICAqL1xuICBzZXRFeHByZXNzaW9uRGVsaW1pdGVyczogZnVuY3Rpb24odHlwZSwgcHJlLCBwb3N0LCBvbmx5SW5EZWZhdWx0KSB7XG4gICAgaWYgKHR5cGUgIT09ICdhdHRyaWJ1dGUnICYmIHR5cGUgIT09ICd0ZXh0Jykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRXhwcmVzc2lvbiBkZWxpbWl0ZXJzIG11c3QgYmUgb2YgdHlwZSBcImF0dHJpYnV0ZVwiIG9yIFwidGV4dFwiJyk7XG4gICAgfVxuXG4gICAgdGhpcy5iaW5kZXJzW3R5cGVdLl9leHByID0gbmV3IFJlZ0V4cChlc2NhcGVSZWdFeHAocHJlKSArICcoLio/KScgKyBlc2NhcGVSZWdFeHAocG9zdCksICdnJyk7XG4gICAgaWYgKHR5cGUgPT09ICdhdHRyaWJ1dGUnKSB7XG4gICAgICB0aGlzLmJpbmRlcnNbdHlwZV0uX2RlbGltaXRlcnNPbmx5SW5EZWZhdWx0ID0gISFvbmx5SW5EZWZhdWx0O1xuICAgIH1cbiAgfSxcblxuXG4gIC8qKlxuICAgKiBUZXN0cyB3aGV0aGVyIGEgdmFsdWUgaGFzIGFuIGV4cHJlc3Npb24gaW4gaXQuIFNvbWV0aGluZyBsaWtlIGAvdXNlci97e3VzZXIuaWR9fWAuXG4gICAqL1xuICBpc0JvdW5kOiBmdW5jdGlvbih0eXBlLCB2YWx1ZSkge1xuICAgIGlmICh0eXBlICE9PSAnYXR0cmlidXRlJyAmJiB0eXBlICE9PSAndGV4dCcpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2lzQm91bmQgbXVzdCBwcm92aWRlIHR5cGUgXCJhdHRyaWJ1dGVcIiBvciBcInRleHRcIicpO1xuICAgIH1cbiAgICB2YXIgZXhwciA9IHRoaXMuYmluZGVyc1t0eXBlXS5fZXhwcjtcbiAgICByZXR1cm4gQm9vbGVhbihleHByICYmIHZhbHVlICYmIHZhbHVlLm1hdGNoKGV4cHIpKTtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBUaGUgc29ydCBmdW5jdGlvbiB0byBzb3J0IGJpbmRlcnMgY29ycmVjdGx5XG4gICAqL1xuICBiaW5kaW5nU29ydDogZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBiLnByb3RvdHlwZS5wcmlvcml0eSAtIGEucHJvdG90eXBlLnByaW9yaXR5O1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIENvbnZlcnRzIGFuIGludmVydGVkIGV4cHJlc3Npb24gZnJvbSBgL3VzZXIve3t1c2VyLmlkfX1gIHRvIGBcIi91c2VyL1wiICsgdXNlci5pZGBcbiAgICovXG4gIGNvZGlmeUV4cHJlc3Npb246IGZ1bmN0aW9uKHR5cGUsIHRleHQsIG5vdERlZmF1bHQpIHtcbiAgICBpZiAodHlwZSAhPT0gJ2F0dHJpYnV0ZScgJiYgdHlwZSAhPT0gJ3RleHQnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdjb2RpZnlFeHByZXNzaW9uIG11c3QgdXNlIHR5cGUgXCJhdHRyaWJ1dGVcIiBvciBcInRleHRcIicpO1xuICAgIH1cblxuICAgIGlmIChub3REZWZhdWx0ICYmIHRoaXMuYmluZGVyc1t0eXBlXS5fZGVsaW1pdGVyc09ubHlJbkRlZmF1bHQpIHtcbiAgICAgIHJldHVybiB0ZXh0O1xuICAgIH1cblxuICAgIHZhciBleHByID0gdGhpcy5iaW5kZXJzW3R5cGVdLl9leHByO1xuICAgIHZhciBtYXRjaCA9IHRleHQubWF0Y2goZXhwcik7XG5cbiAgICBpZiAoIW1hdGNoKSB7XG4gICAgICByZXR1cm4gJ1wiJyArIHRleHQucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpICsgJ1wiJztcbiAgICB9IGVsc2UgaWYgKG1hdGNoLmxlbmd0aCA9PT0gMSAmJiBtYXRjaFswXSA9PT0gdGV4dCkge1xuICAgICAgcmV0dXJuIHRleHQucmVwbGFjZShleHByLCAnJDEnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIG5ld1RleHQgPSAnXCInLCBsYXN0SW5kZXggPSAwO1xuICAgICAgd2hpbGUgKChtYXRjaCA9IGV4cHIuZXhlYyh0ZXh0KSkpIHtcbiAgICAgICAgdmFyIHN0ciA9IHRleHQuc2xpY2UobGFzdEluZGV4LCBleHByLmxhc3RJbmRleCAtIG1hdGNoWzBdLmxlbmd0aCk7XG4gICAgICAgIG5ld1RleHQgKz0gc3RyLnJlcGxhY2UoL1wiL2csICdcXFxcXCInKTtcbiAgICAgICAgbmV3VGV4dCArPSAnXCIgKyAoJyArIG1hdGNoWzFdICsgJyB8fCBcIlwiKSArIFwiJztcbiAgICAgICAgbGFzdEluZGV4ID0gZXhwci5sYXN0SW5kZXg7XG4gICAgICB9XG4gICAgICBuZXdUZXh0ICs9IHRleHQuc2xpY2UobGFzdEluZGV4KS5yZXBsYWNlKC9cIi9nLCAnXFxcXFwiJykgKyAnXCInO1xuICAgICAgcmV0dXJuIG5ld1RleHQucmVwbGFjZSgvXlwiXCIgXFwrIHwgXCJcIiBcXCsgfCBcXCsgXCJcIiQvZywgJycpO1xuICAgIH1cbiAgfVxuXG59KTtcblxuLy8gVGFrZXMgYSBzdHJpbmcgbGlrZSBcIihcXCopXCIgb3IgXCJvbi1cXCpcIiBhbmQgY29udmVydHMgaXQgaW50byBhIHJlZ3VsYXIgZXhwcmVzc2lvbi5cbmZ1bmN0aW9uIGVzY2FwZVJlZ0V4cCh0ZXh0KSB7XG4gIHJldHVybiB0ZXh0LnJlcGxhY2UoL1stW1xcXXt9KCkqKz8uLFxcXFxeJHwjXFxzXS9nLCAnXFxcXCQmJyk7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFRlbXBsYXRlO1xudmFyIFZpZXcgPSByZXF1aXJlKCcuL3ZpZXcnKTtcbnZhciBDbGFzcyA9IHJlcXVpcmUoJ2NoaXAtdXRpbHMvY2xhc3MnKTtcblxuXG4vKipcbiAqICMjIFRlbXBsYXRlXG4gKiBUYWtlcyBhbiBIVE1MIHN0cmluZywgYW4gZWxlbWVudCwgYW4gYXJyYXkgb2YgZWxlbWVudHMsIG9yIGEgZG9jdW1lbnQgZnJhZ21lbnQsIGFuZCBjb21waWxlcyBpdCBpbnRvIGEgdGVtcGxhdGUuXG4gKiBJbnN0YW5jZXMgbWF5IHRoZW4gYmUgY3JlYXRlZCBhbmQgYm91bmQgdG8gYSBnaXZlbiBjb250ZXh0LlxuICogQHBhcmFtIHtTdHJpbmd8Tm9kZUxpc3R8SFRNTENvbGxlY3Rpb258SFRNTFRlbXBsYXRlRWxlbWVudHxIVE1MU2NyaXB0RWxlbWVudHxOb2RlfSBodG1sIEEgVGVtcGxhdGUgY2FuIGJlIGNyZWF0ZWRcbiAqIGZyb20gbWFueSBkaWZmZXJlbnQgdHlwZXMgb2Ygb2JqZWN0cy4gQW55IG9mIHRoZXNlIHdpbGwgYmUgY29udmVydGVkIGludG8gYSBkb2N1bWVudCBmcmFnbWVudCBmb3IgdGhlIHRlbXBsYXRlIHRvXG4gKiBjbG9uZS4gTm9kZXMgYW5kIGVsZW1lbnRzIHBhc3NlZCBpbiB3aWxsIGJlIHJlbW92ZWQgZnJvbSB0aGUgRE9NLlxuICovXG5mdW5jdGlvbiBUZW1wbGF0ZSgpIHtcbiAgdGhpcy5wb29sID0gW107XG59XG5cblxuQ2xhc3MuZXh0ZW5kKFRlbXBsYXRlLCB7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgdmlldyBjbG9uZWQgZnJvbSB0aGlzIHRlbXBsYXRlLlxuICAgKi9cbiAgY3JlYXRlVmlldzogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMucG9vbC5sZW5ndGgpIHtcbiAgICAgIHJldHVybiB0aGlzLnBvb2wucG9wKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIFZpZXcubWFrZUluc3RhbmNlT2YoZG9jdW1lbnQuaW1wb3J0Tm9kZSh0aGlzLCB0cnVlKSwgdGhpcyk7XG4gIH0sXG5cbiAgcmV0dXJuVmlldzogZnVuY3Rpb24odmlldykge1xuICAgIGlmICh0aGlzLnBvb2wuaW5kZXhPZih2aWV3KSA9PT0gLTEpIHtcbiAgICAgIHRoaXMucG9vbC5wdXNoKHZpZXcpO1xuICAgIH1cbiAgfVxufSk7XG4iLCIvLyBIZWxwZXIgbWV0aG9kcyBmb3IgYW5pbWF0aW9uXG5leHBvcnRzLm1ha2VFbGVtZW50QW5pbWF0YWJsZSA9IG1ha2VFbGVtZW50QW5pbWF0YWJsZTtcbmV4cG9ydHMuZ2V0Q29tcHV0ZWRDU1MgPSBnZXRDb21wdXRlZENTUztcbmV4cG9ydHMuYW5pbWF0ZUVsZW1lbnQgPSBhbmltYXRlRWxlbWVudDtcblxuZnVuY3Rpb24gbWFrZUVsZW1lbnRBbmltYXRhYmxlKGVsZW1lbnQpIHtcbiAgLy8gQWRkIHBvbHlmaWxsIGp1c3Qgb24gdGhpcyBlbGVtZW50XG4gIGlmICghZWxlbWVudC5hbmltYXRlKSB7XG4gICAgZWxlbWVudC5hbmltYXRlID0gYW5pbWF0ZUVsZW1lbnQ7XG4gIH1cblxuICAvLyBOb3QgYSBwb2x5ZmlsbCBidXQgYSBoZWxwZXJcbiAgaWYgKCFlbGVtZW50LmdldENvbXB1dGVkQ1NTKSB7XG4gICAgZWxlbWVudC5nZXRDb21wdXRlZENTUyA9IGdldENvbXB1dGVkQ1NTO1xuICB9XG5cbiAgcmV0dXJuIGVsZW1lbnQ7XG59XG5cbi8qKlxuICogR2V0IHRoZSBjb21wdXRlZCBzdHlsZSBvbiBhbiBlbGVtZW50LlxuICovXG5mdW5jdGlvbiBnZXRDb21wdXRlZENTUyhzdHlsZU5hbWUpIHtcbiAgaWYgKHRoaXMub3duZXJEb2N1bWVudC5kZWZhdWx0Vmlldy5vcGVuZXIpIHtcbiAgICByZXR1cm4gdGhpcy5vd25lckRvY3VtZW50LmRlZmF1bHRWaWV3LmdldENvbXB1dGVkU3R5bGUodGhpcylbc3R5bGVOYW1lXTtcbiAgfVxuICByZXR1cm4gd2luZG93LmdldENvbXB1dGVkU3R5bGUodGhpcylbc3R5bGVOYW1lXTtcbn1cblxuLyoqXG4gKiBWZXJ5IGJhc2ljIHBvbHlmaWxsIGZvciBFbGVtZW50LmFuaW1hdGUgaWYgaXQgZG9lc24ndCBleGlzdC4gSWYgaXQgZG9lcywgdXNlIHRoZSBuYXRpdmUuXG4gKiBUaGlzIG9ubHkgc3VwcG9ydHMgdHdvIGNzcyBzdGF0ZXMuIEl0IHdpbGwgb3ZlcndyaXRlIGV4aXN0aW5nIHN0eWxlcy4gSXQgZG9lc24ndCByZXR1cm4gYW4gYW5pbWF0aW9uIHBsYXkgY29udHJvbC4gSXRcbiAqIG9ubHkgc3VwcG9ydHMgZHVyYXRpb24sIGRlbGF5LCBhbmQgZWFzaW5nLiBSZXR1cm5zIGFuIG9iamVjdCB3aXRoIGEgcHJvcGVydHkgb25maW5pc2guXG4gKi9cbmZ1bmN0aW9uIGFuaW1hdGVFbGVtZW50KGNzcywgb3B0aW9ucykge1xuICBpZiAoIUFycmF5LmlzQXJyYXkoY3NzKSB8fCBjc3MubGVuZ3RoICE9PSAyKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYW5pbWF0ZSBwb2x5ZmlsbCByZXF1aXJlcyBhbiBhcnJheSBmb3IgY3NzIHdpdGggYW4gaW5pdGlhbCBhbmQgZmluYWwgc3RhdGUnKTtcbiAgfVxuXG4gIGlmICghb3B0aW9ucyB8fCAhb3B0aW9ucy5oYXNPd25Qcm9wZXJ0eSgnZHVyYXRpb24nKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2FuaW1hdGUgcG9seWZpbGwgcmVxdWlyZXMgb3B0aW9ucyB3aXRoIGEgZHVyYXRpb24nKTtcbiAgfVxuXG4gIHZhciBlbGVtZW50ID0gdGhpcztcbiAgdmFyIGR1cmF0aW9uID0gb3B0aW9ucy5kdXJhdGlvbiB8fCAwO1xuICB2YXIgZGVsYXkgPSBvcHRpb25zLmRlbGF5IHx8IDA7XG4gIHZhciBlYXNpbmcgPSBvcHRpb25zLmVhc2luZztcbiAgdmFyIGluaXRpYWxDc3MgPSBjc3NbMF07XG4gIHZhciBmaW5hbENzcyA9IGNzc1sxXTtcbiAgdmFyIGFsbENzcyA9IHt9O1xuICB2YXIgcGxheWJhY2sgPSB7IG9uZmluaXNoOiBudWxsIH07XG5cbiAgT2JqZWN0LmtleXMoaW5pdGlhbENzcykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICBhbGxDc3Nba2V5XSA9IHRydWU7XG4gICAgZWxlbWVudC5zdHlsZVtrZXldID0gaW5pdGlhbENzc1trZXldO1xuICB9KTtcblxuICAvLyB0cmlnZ2VyIHJlZmxvd1xuICBlbGVtZW50Lm9mZnNldFdpZHRoO1xuXG4gIHZhciB0cmFuc2l0aW9uT3B0aW9ucyA9ICcgJyArIGR1cmF0aW9uICsgJ21zJztcbiAgaWYgKGVhc2luZykge1xuICAgIHRyYW5zaXRpb25PcHRpb25zICs9ICcgJyArIGVhc2luZztcbiAgfVxuICBpZiAoZGVsYXkpIHtcbiAgICB0cmFuc2l0aW9uT3B0aW9ucyArPSAnICcgKyBkZWxheSArICdtcyc7XG4gIH1cblxuICBlbGVtZW50LnN0eWxlLnRyYW5zaXRpb24gPSBPYmplY3Qua2V5cyhmaW5hbENzcykubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgIHJldHVybiBrZXkgKyB0cmFuc2l0aW9uT3B0aW9ucztcbiAgfSkuam9pbignLCAnKTtcblxuICBPYmplY3Qua2V5cyhmaW5hbENzcykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICBhbGxDc3Nba2V5XSA9IHRydWU7XG4gICAgZWxlbWVudC5zdHlsZVtrZXldID0gZmluYWxDc3Nba2V5XTtcbiAgfSk7XG5cbiAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICBPYmplY3Qua2V5cyhhbGxDc3MpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICBlbGVtZW50LnN0eWxlW2tleV0gPSAnJztcbiAgICB9KTtcblxuICAgIGlmIChwbGF5YmFjay5vbmZpbmlzaCkge1xuICAgICAgcGxheWJhY2sub25maW5pc2goKTtcbiAgICB9XG4gIH0sIGR1cmF0aW9uICsgZGVsYXkpO1xuXG4gIHJldHVybiBwbGF5YmFjaztcbn1cbiIsIlxuXG5cbi8vIFBvbHlmaWxsIG1hdGNoZXNcbmlmICghRWxlbWVudC5wcm90b3R5cGUubWF0Y2hlcykge1xuICBFbGVtZW50LnByb3RvdHlwZS5tYXRjaGVzID1cbiAgICBFbGVtZW50LnByb3RvdHlwZS5tYXRjaGVzU2VsZWN0b3IgfHxcbiAgICBFbGVtZW50LnByb3RvdHlwZS53ZWJraXRNYXRjaGVzU2VsZWN0b3IgfHxcbiAgICBFbGVtZW50LnByb3RvdHlwZS5tb3pNYXRjaGVzU2VsZWN0b3IgfHxcbiAgICBFbGVtZW50LnByb3RvdHlwZS5tc01hdGNoZXNTZWxlY3RvciB8fFxuICAgIEVsZW1lbnQucHJvdG90eXBlLm9NYXRjaGVzU2VsZWN0b3I7XG59XG5cbi8vIFBvbHlmaWxsIGNsb3Nlc3RcbmlmICghRWxlbWVudC5wcm90b3R5cGUuY2xvc2VzdCkge1xuICBFbGVtZW50LnByb3RvdHlwZS5jbG9zZXN0ID0gZnVuY3Rpb24gY2xvc2VzdChzZWxlY3Rvcikge1xuICAgIHZhciBlbGVtZW50ID0gdGhpcztcbiAgICBkbyB7XG4gICAgICBpZiAoZWxlbWVudC5tYXRjaGVzKHNlbGVjdG9yKSkge1xuICAgICAgICByZXR1cm4gZWxlbWVudDtcbiAgICAgIH1cbiAgICB9IHdoaWxlICgoZWxlbWVudCA9IGVsZW1lbnQucGFyZW50Tm9kZSkgJiYgZWxlbWVudC5ub2RlVHlwZSA9PT0gTm9kZS5FTEVNRU5UX05PREUpO1xuICAgIHJldHVybiBudWxsO1xuICB9O1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSB0b0ZyYWdtZW50O1xuXG4vLyBDb252ZXJ0IHN0dWZmIGludG8gZG9jdW1lbnQgZnJhZ21lbnRzLiBTdHVmZiBjYW4gYmU6XG4vLyAqIEEgc3RyaW5nIG9mIEhUTUwgdGV4dFxuLy8gKiBBbiBlbGVtZW50IG9yIHRleHQgbm9kZVxuLy8gKiBBIE5vZGVMaXN0IG9yIEhUTUxDb2xsZWN0aW9uIChlLmcuIGBlbGVtZW50LmNoaWxkTm9kZXNgIG9yIGBlbGVtZW50LmNoaWxkcmVuYClcbi8vICogQSBqUXVlcnkgb2JqZWN0XG4vLyAqIEEgc2NyaXB0IGVsZW1lbnQgd2l0aCBhIGB0eXBlYCBhdHRyaWJ1dGUgb2YgYFwidGV4dC8qXCJgIChlLmcuIGA8c2NyaXB0IHR5cGU9XCJ0ZXh0L2h0bWxcIj5NeSB0ZW1wbGF0ZSBjb2RlITwvc2NyaXB0PmApXG4vLyAqIEEgdGVtcGxhdGUgZWxlbWVudCAoZS5nLiBgPHRlbXBsYXRlPk15IHRlbXBsYXRlIGNvZGUhPC90ZW1wbGF0ZT5gKVxuZnVuY3Rpb24gdG9GcmFnbWVudChodG1sKSB7XG4gIGlmIChodG1sIGluc3RhbmNlb2YgRG9jdW1lbnRGcmFnbWVudCkge1xuICAgIHJldHVybiBodG1sO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBodG1sID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBzdHJpbmdUb0ZyYWdtZW50KGh0bWwpO1xuICB9IGVsc2UgaWYgKGh0bWwgaW5zdGFuY2VvZiBOb2RlKSB7XG4gICAgcmV0dXJuIG5vZGVUb0ZyYWdtZW50KGh0bWwpO1xuICB9IGVsc2UgaWYgKCdsZW5ndGgnIGluIGh0bWwpIHtcbiAgICByZXR1cm4gbGlzdFRvRnJhZ21lbnQoaHRtbCk7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5zdXBwb3J0ZWQgVGVtcGxhdGUgVHlwZTogQ2Fubm90IGNvbnZlcnQgYCcgKyBodG1sICsgJ2AgaW50byBhIGRvY3VtZW50IGZyYWdtZW50LicpO1xuICB9XG59XG5cbi8vIENvbnZlcnRzIGFuIEhUTUwgbm9kZSBpbnRvIGEgZG9jdW1lbnQgZnJhZ21lbnQuIElmIGl0IGlzIGEgPHRlbXBsYXRlPiBub2RlIGl0cyBjb250ZW50cyB3aWxsIGJlIHVzZWQuIElmIGl0IGlzIGFcbi8vIDxzY3JpcHQ+IG5vZGUgaXRzIHN0cmluZy1iYXNlZCBjb250ZW50cyB3aWxsIGJlIGNvbnZlcnRlZCB0byBIVE1MIGZpcnN0LCB0aGVuIHVzZWQuIE90aGVyd2lzZSBhIGNsb25lIG9mIHRoZSBub2RlXG4vLyBpdHNlbGYgd2lsbCBiZSB1c2VkLlxuZnVuY3Rpb24gbm9kZVRvRnJhZ21lbnQobm9kZSkge1xuICBpZiAobm9kZS5jb250ZW50IGluc3RhbmNlb2YgRG9jdW1lbnRGcmFnbWVudCkge1xuICAgIHJldHVybiBub2RlLmNvbnRlbnQ7XG4gIH0gZWxzZSBpZiAobm9kZS50YWdOYW1lID09PSAnU0NSSVBUJykge1xuICAgIHJldHVybiBzdHJpbmdUb0ZyYWdtZW50KG5vZGUuaW5uZXJIVE1MKTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgaWYgKG5vZGUudGFnTmFtZSA9PT0gJ1RFTVBMQVRFJykge1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBub2RlLmNoaWxkTm9kZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKG5vZGUuY2hpbGROb2Rlc1tpXSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKG5vZGUpO1xuICAgIH1cbiAgICByZXR1cm4gZnJhZ21lbnQ7XG4gIH1cbn1cblxuLy8gQ29udmVydHMgYW4gSFRNTENvbGxlY3Rpb24sIE5vZGVMaXN0LCBqUXVlcnkgb2JqZWN0LCBvciBhcnJheSBpbnRvIGEgZG9jdW1lbnQgZnJhZ21lbnQuXG5mdW5jdGlvbiBsaXN0VG9GcmFnbWVudChsaXN0KSB7XG4gIHZhciBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBsaXN0Lmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIC8vIFVzZSB0b0ZyYWdtZW50IHNpbmNlIHRoaXMgbWF5IGJlIGFuIGFycmF5IG9mIHRleHQsIGEgalF1ZXJ5IG9iamVjdCBvZiBgPHRlbXBsYXRlPmBzLCBldGMuXG4gICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQodG9GcmFnbWVudChsaXN0W2ldKSk7XG4gICAgaWYgKGwgPT09IGxpc3QubGVuZ3RoICsgMSkge1xuICAgICAgLy8gYWRqdXN0IGZvciBOb2RlTGlzdHMgd2hpY2ggYXJlIGxpdmUsIHRoZXkgc2hyaW5rIGFzIHdlIHB1bGwgbm9kZXMgb3V0IG9mIHRoZSBET01cbiAgICAgIGktLTtcbiAgICAgIGwtLTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZyYWdtZW50O1xufVxuXG4vLyBDb252ZXJ0cyBhIHN0cmluZyBvZiBIVE1MIHRleHQgaW50byBhIGRvY3VtZW50IGZyYWdtZW50LlxudmFyIHN0cmluZ1RvRnJhZ21lbnQgPSBmdW5jdGlvbihzdHJpbmcpIHtcbiAgaWYgKCFzdHJpbmcpIHtcbiAgICB2YXIgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpKTtcbiAgICByZXR1cm4gZnJhZ21lbnQ7XG4gIH1cbiAgdmFyIHRlbXBsYXRlRWxlbWVudDtcbiAgdGVtcGxhdGVFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGVtcGxhdGUnKTtcbiAgdGVtcGxhdGVFbGVtZW50LmlubmVySFRNTCA9IHN0cmluZztcbiAgcmV0dXJuIHRlbXBsYXRlRWxlbWVudC5jb250ZW50O1xufTtcblxuLy8gSWYgSFRNTCBUZW1wbGF0ZXMgYXJlIG5vdCBhdmFpbGFibGUgKGUuZy4gaW4gSUUpIHRoZW4gdXNlIGFuIG9sZGVyIG1ldGhvZCB0byB3b3JrIHdpdGggY2VydGFpbiBlbGVtZW50cy5cbmlmICghZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGVtcGxhdGUnKS5jb250ZW50IGluc3RhbmNlb2YgRG9jdW1lbnRGcmFnbWVudCkge1xuICBzdHJpbmdUb0ZyYWdtZW50ID0gKGZ1bmN0aW9uKCkge1xuICAgIHZhciB0YWdFeHAgPSAvPChbXFx3Oi1dKykvO1xuXG4gICAgLy8gQ29waWVkIGZyb20galF1ZXJ5IChodHRwczovL2dpdGh1Yi5jb20vanF1ZXJ5L2pxdWVyeS9ibG9iL21hc3Rlci9MSUNFTlNFLnR4dClcbiAgICB2YXIgd3JhcE1hcCA9IHtcbiAgICAgIG9wdGlvbjogWyAxLCAnPHNlbGVjdCBtdWx0aXBsZT1cIm11bHRpcGxlXCI+JywgJzwvc2VsZWN0PicgXSxcbiAgICAgIGxlZ2VuZDogWyAxLCAnPGZpZWxkc2V0PicsICc8L2ZpZWxkc2V0PicgXSxcbiAgICAgIHRoZWFkOiBbIDEsICc8dGFibGU+JywgJzwvdGFibGU+JyBdLFxuICAgICAgdHI6IFsgMiwgJzx0YWJsZT48dGJvZHk+JywgJzwvdGJvZHk+PC90YWJsZT4nIF0sXG4gICAgICB0ZDogWyAzLCAnPHRhYmxlPjx0Ym9keT48dHI+JywgJzwvdHI+PC90Ym9keT48L3RhYmxlPicgXSxcbiAgICAgIGNvbDogWyAyLCAnPHRhYmxlPjx0Ym9keT48L3Rib2R5Pjxjb2xncm91cD4nLCAnPC9jb2xncm91cD48L3RhYmxlPicgXSxcbiAgICAgIGFyZWE6IFsgMSwgJzxtYXA+JywgJzwvbWFwPicgXSxcbiAgICAgIF9kZWZhdWx0OiBbIDAsICcnLCAnJyBdXG4gICAgfTtcbiAgICB3cmFwTWFwLm9wdGdyb3VwID0gd3JhcE1hcC5vcHRpb247XG4gICAgd3JhcE1hcC50Ym9keSA9IHdyYXBNYXAudGZvb3QgPSB3cmFwTWFwLmNvbGdyb3VwID0gd3JhcE1hcC5jYXB0aW9uID0gd3JhcE1hcC50aGVhZDtcbiAgICB3cmFwTWFwLnRoID0gd3JhcE1hcC50ZDtcblxuICAgIHJldHVybiBmdW5jdGlvbiBzdHJpbmdUb0ZyYWdtZW50KHN0cmluZykge1xuICAgICAgdmFyIGZyYWdtZW50O1xuICAgICAgaWYgKCFzdHJpbmcpIHtcbiAgICAgICAgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKSk7XG4gICAgICAgIHJldHVybiBmcmFnbWVudDtcbiAgICAgIH1cbiAgICAgIHZhciB0YWcgPSBzdHJpbmcubWF0Y2godGFnRXhwKTtcbiAgICAgIHZhciBwYXJ0cyA9IHdyYXBNYXBbdGFnXSB8fCB3cmFwTWFwLl9kZWZhdWx0O1xuICAgICAgdmFyIGRlcHRoID0gcGFydHNbMF07XG4gICAgICB2YXIgcHJlZml4ID0gcGFydHNbMV07XG4gICAgICB2YXIgcG9zdGZpeCA9IHBhcnRzWzJdO1xuICAgICAgdmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgZGl2LmlubmVySFRNTCA9IHByZWZpeCArIHN0cmluZyArIHBvc3RmaXg7XG4gICAgICB3aGlsZSAoZGVwdGgtLSkge1xuICAgICAgICBkaXYgPSBkaXYubGFzdENoaWxkO1xuICAgICAgfVxuICAgICAgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgICB3aGlsZSAoZGl2LmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQoZGl2LmZpcnN0Q2hpbGQpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZyYWdtZW50O1xuICAgIH07XG4gIH0pKCk7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFZpZXc7XG52YXIgQ2xhc3MgPSByZXF1aXJlKCdjaGlwLXV0aWxzL2NsYXNzJyk7XG5cblxuLyoqXG4gKiAjIyBWaWV3XG4gKiBBIERvY3VtZW50RnJhZ21lbnQgd2l0aCBiaW5kaW5ncy5cbiAqL1xuZnVuY3Rpb24gVmlldyh0ZW1wbGF0ZSkge1xuICBpZiAodGVtcGxhdGUpIHtcbiAgICB0aGlzLnRlbXBsYXRlID0gdGVtcGxhdGU7XG4gICAgdGhpcy5iaW5kaW5ncyA9IHRoaXMudGVtcGxhdGUuYmluZGluZ3MubWFwKGZ1bmN0aW9uKGJpbmRpbmcpIHtcbiAgICAgIHJldHVybiBiaW5kaW5nLmNsb25lRm9yVmlldyh0aGlzKTtcbiAgICB9LCB0aGlzKTtcbiAgfSBlbHNlIGlmICh0aGlzLmJpbmRpbmdzKSB7XG4gICAgdGhpcy5iaW5kaW5ncy5mb3JFYWNoKGZ1bmN0aW9uKGJpbmRpbmcpIHtcbiAgICAgIGJpbmRpbmcuaW5pdCgpO1xuICAgIH0pO1xuICB9XG5cbiAgdGhpcy5maXJzdFZpZXdOb2RlID0gdGhpcy5maXJzdENoaWxkO1xuICB0aGlzLmxhc3RWaWV3Tm9kZSA9IHRoaXMubGFzdENoaWxkO1xuICBpZiAodGhpcy5maXJzdFZpZXdOb2RlKSB7XG4gICAgdGhpcy5maXJzdFZpZXdOb2RlLnZpZXcgPSB0aGlzO1xuICAgIHRoaXMubGFzdFZpZXdOb2RlLnZpZXcgPSB0aGlzO1xuICB9XG59XG5cblxuQ2xhc3MuZXh0ZW5kKFZpZXcsIHtcblxuICAvKipcbiAgICogUmVtb3ZlcyBhIHZpZXcgZnJvbSB0aGUgRE9NLiBBIHZpZXcgaXMgYSBEb2N1bWVudEZyYWdtZW50LCBzbyBgcmVtb3ZlKClgIHJldHVybnMgYWxsIGl0cyBub2RlcyB0byBpdHNlbGYuXG4gICAqL1xuICByZW1vdmU6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBub2RlID0gdGhpcy5maXJzdFZpZXdOb2RlO1xuICAgIHZhciBuZXh0O1xuXG4gICAgaWYgKG5vZGUucGFyZW50Tm9kZSAhPT0gdGhpcykge1xuICAgICAgLy8gUmVtb3ZlIGFsbCB0aGUgbm9kZXMgYW5kIHB1dCB0aGVtIGJhY2sgaW50byB0aGlzIGZyYWdtZW50XG4gICAgICB3aGlsZSAobm9kZSkge1xuICAgICAgICBuZXh0ID0gKG5vZGUgPT09IHRoaXMubGFzdFZpZXdOb2RlKSA/IG51bGwgOiBub2RlLm5leHRTaWJsaW5nO1xuICAgICAgICB0aGlzLmFwcGVuZENoaWxkKG5vZGUpO1xuICAgICAgICBub2RlID0gbmV4dDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGEgdmlldyAoaWYgbm90IGFscmVhZHkgcmVtb3ZlZCkgYW5kIGFkZHMgdGhlIHZpZXcgdG8gaXRzIHRlbXBsYXRlJ3MgcG9vbC5cbiAgICovXG4gIGRpc3Bvc2U6IGZ1bmN0aW9uKCkge1xuICAgIC8vIE1ha2Ugc3VyZSB0aGUgdmlldyBpcyByZW1vdmVkIGZyb20gdGhlIERPTVxuICAgIHRoaXMuYmluZGluZ3MuZm9yRWFjaChmdW5jdGlvbihiaW5kaW5nKSB7XG4gICAgICBiaW5kaW5nLmRpc3Bvc2UoKTtcbiAgICB9KTtcblxuICAgIHRoaXMucmVtb3ZlKCk7XG4gICAgaWYgKHRoaXMudGVtcGxhdGUpIHtcbiAgICAgIHRoaXMudGVtcGxhdGUucmV0dXJuVmlldyh0aGlzKTtcbiAgICB9XG4gIH0sXG5cblxuICAvKipcbiAgICogQmluZHMgYSB2aWV3IHRvIGEgZ2l2ZW4gY29udGV4dC5cbiAgICovXG4gIGJpbmQ6IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgICB0aGlzLmJpbmRpbmdzLmZvckVhY2goZnVuY3Rpb24oYmluZGluZykge1xuICAgICAgYmluZGluZy5iaW5kKGNvbnRleHQpO1xuICAgIH0pO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIFVuYmluZHMgYSB2aWV3IGZyb20gYW55IGNvbnRleHQuXG4gICAqL1xuICB1bmJpbmQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuYmluZGluZ3MuZm9yRWFjaChmdW5jdGlvbihiaW5kaW5nKSB7XG4gICAgICBiaW5kaW5nLnVuYmluZCgpO1xuICAgIH0pO1xuICB9XG59KTtcbiIsIlxuZXhwb3J0cy5PYnNlcnZhdGlvbnMgPSByZXF1aXJlKCcuL3NyYy9vYnNlcnZhdGlvbnMnKTtcbmV4cG9ydHMuT2JzZXJ2ZXIgPSByZXF1aXJlKCcuL3NyYy9vYnNlcnZlcicpO1xuZXhwb3J0cy5jcmVhdGUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIG5ldyBleHBvcnRzLk9ic2VydmF0aW9ucygpO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gT2JzZXJ2YXRpb25zO1xudmFyIENsYXNzID0gcmVxdWlyZSgnY2hpcC11dGlscy9jbGFzcycpO1xudmFyIE9ic2VydmVyID0gcmVxdWlyZSgnLi9vYnNlcnZlcicpO1xudmFyIHJlcXVlc3RBbmltYXRpb25GcmFtZSA9IGdsb2JhbC5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgc2V0VGltZW91dDtcbnZhciBjYW5jZWxBbmltYXRpb25GcmFtZSA9IGdsb2JhbC5jYW5jZWxBbmltYXRpb25GcmFtZSB8fCBjbGVhclRpbWVvdXQ7XG5cblxuZnVuY3Rpb24gT2JzZXJ2YXRpb25zKCkge1xuICB0aGlzLmdsb2JhbHMgPSB7fTtcbiAgdGhpcy5mb3JtYXR0ZXJzID0ge307XG4gIHRoaXMub2JzZXJ2ZXJzID0gW107XG4gIHRoaXMuY2FsbGJhY2tzID0gW107XG4gIHRoaXMubGlzdGVuZXJzID0gW107XG4gIHRoaXMuc3luY2luZyA9IGZhbHNlO1xuICB0aGlzLmNhbGxiYWNrc1J1bm5pbmcgPSBmYWxzZTtcbiAgdGhpcy5yZXJ1biA9IGZhbHNlO1xuICB0aGlzLmN5Y2xlcyA9IDA7XG4gIHRoaXMubWF4Q3ljbGVzID0gMTA7XG4gIHRoaXMudGltZW91dCA9IG51bGw7XG4gIHRoaXMucGVuZGluZ1N5bmMgPSBudWxsO1xuICB0aGlzLnN5bmNOb3cgPSB0aGlzLnN5bmNOb3cuYmluZCh0aGlzKTtcbn1cblxuXG5DbGFzcy5leHRlbmQoT2JzZXJ2YXRpb25zLCB7XG5cbiAgLy8gQ3JlYXRlcyBhIG5ldyBvYnNlcnZlciBhdHRhY2hlZCB0byB0aGlzIG9ic2VydmF0aW9ucyBvYmplY3QuIFdoZW4gdGhlIG9ic2VydmVyIGlzIGJvdW5kIHRvIGEgY29udGV4dCBpdCB3aWxsIGJlIGFkZGVkXG4gIC8vIHRvIHRoaXMgYG9ic2VydmF0aW9uc2AgYW5kIHN5bmNlZCB3aGVuIHRoaXMgYG9ic2VydmF0aW9ucy5zeW5jYCBpcyBjYWxsZWQuXG4gIGNyZWF0ZU9ic2VydmVyOiBmdW5jdGlvbihleHByLCBjYWxsYmFjaywgY2FsbGJhY2tDb250ZXh0KSB7XG4gICAgcmV0dXJuIG5ldyBPYnNlcnZlcih0aGlzLCBleHByLCBjYWxsYmFjaywgY2FsbGJhY2tDb250ZXh0KTtcbiAgfSxcblxuXG4gIC8vIFNjaGVkdWxlcyBhbiBvYnNlcnZlciBzeW5jIGN5Y2xlIHdoaWNoIGNoZWNrcyBhbGwgdGhlIG9ic2VydmVycyB0byBzZWUgaWYgdGhleSd2ZSBjaGFuZ2VkLlxuICBzeW5jOiBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuYWZ0ZXJTeW5jKGNhbGxiYWNrKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5wZW5kaW5nU3luYykge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHRoaXMucGVuZGluZ1N5bmMgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy5zeW5jTm93KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcblxuXG4gIC8vIFJ1bnMgdGhlIG9ic2VydmVyIHN5bmMgY3ljbGUgd2hpY2ggY2hlY2tzIGFsbCB0aGUgb2JzZXJ2ZXJzIHRvIHNlZSBpZiB0aGV5J3ZlIGNoYW5nZWQuXG4gIHN5bmNOb3c6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5hZnRlclN5bmMoY2FsbGJhY2spO1xuICAgIH1cblxuICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lKHRoaXMucGVuZGluZ1N5bmMpO1xuICAgIHRoaXMucGVuZGluZ1N5bmMgPSBudWxsO1xuXG4gICAgaWYgKHRoaXMuc3luY2luZykge1xuICAgICAgdGhpcy5yZXJ1biA9IHRydWU7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdGhpcy5ydW5TeW5jKCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0sXG5cblxuICBydW5TeW5jOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN5bmNpbmcgPSB0cnVlO1xuICAgIHRoaXMucmVydW4gPSB0cnVlO1xuICAgIHRoaXMuY3ljbGVzID0gMDtcblxuICAgIHZhciBpLCBsO1xuXG4gICAgLy8gQWxsb3cgY2FsbGJhY2tzIHRvIHJ1biB0aGUgc3luYyBjeWNsZSBhZ2FpbiBpbW1lZGlhdGVseSwgYnV0IHN0b3AgYXQgYG1heEN5bGVzYCAoZGVmYXVsdCAxMCkgY3ljbGVzIHNvIHdlIGRvbid0XG4gICAgLy8gcnVuIGluZmluaXRlIGxvb3BzXG4gICAgd2hpbGUgKHRoaXMucmVydW4pIHtcbiAgICAgIGlmICgrK3RoaXMuY3ljbGVzID09PSB0aGlzLm1heEN5Y2xlcykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0luZmluaXRlIG9ic2VydmVyIHN5bmNpbmcsIGFuIG9ic2VydmVyIGlzIGNhbGxpbmcgT2JzZXJ2ZXIuc3luYygpIHRvbyBtYW55IHRpbWVzJyk7XG4gICAgICB9XG4gICAgICB0aGlzLnJlcnVuID0gZmFsc2U7XG4gICAgICAvLyB0aGUgb2JzZXJ2ZXIgYXJyYXkgbWF5IGluY3JlYXNlIG9yIGRlY3JlYXNlIGluIHNpemUgKHJlbWFpbmluZyBvYnNlcnZlcnMpIGR1cmluZyB0aGUgc3luY1xuICAgICAgZm9yIChpID0gMDsgaSA8IHRoaXMub2JzZXJ2ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRoaXMub2JzZXJ2ZXJzW2ldLnN5bmMoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmNhbGxiYWNrc1J1bm5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGNhbGxiYWNrcyA9IHRoaXMuY2FsbGJhY2tzO1xuICAgIHRoaXMuY2FsbGJhY2tzID0gW107XG4gICAgd2hpbGUgKGNhbGxiYWNrcy5sZW5ndGgpIHtcbiAgICAgIGNhbGxiYWNrcy5zaGlmdCgpKCk7XG4gICAgfVxuXG4gICAgZm9yIChpID0gMCwgbCA9IHRoaXMubGlzdGVuZXJzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgdmFyIGxpc3RlbmVyID0gdGhpcy5saXN0ZW5lcnNbaV07XG4gICAgICBsaXN0ZW5lcigpO1xuICAgIH1cblxuICAgIHRoaXMuY2FsbGJhY2tzUnVubmluZyA9IGZhbHNlO1xuICAgIHRoaXMuc3luY2luZyA9IGZhbHNlO1xuICAgIHRoaXMuY3ljbGVzID0gMDtcbiAgfSxcblxuXG4gIC8vIEFmdGVyIHRoZSBuZXh0IHN5bmMgKG9yIHRoZSBjdXJyZW50IGlmIGluIHRoZSBtaWRkbGUgb2Ygb25lKSwgcnVuIHRoZSBwcm92aWRlZCBjYWxsYmFja1xuICBhZnRlclN5bmM6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgaWYgKHR5cGVvZiBjYWxsYmFjayAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY2FsbGJhY2tzUnVubmluZykge1xuICAgICAgdGhpcy5zeW5jKCk7XG4gICAgfVxuXG4gICAgdGhpcy5jYWxsYmFja3MucHVzaChjYWxsYmFjayk7XG4gIH0sXG5cblxuICBvblN5bmM6IGZ1bmN0aW9uKGxpc3RlbmVyKSB7XG4gICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgfVxuXG4gICAgdGhpcy5saXN0ZW5lcnMucHVzaChsaXN0ZW5lcik7XG4gIH0sXG5cblxuICBvZmZTeW5jOiBmdW5jdGlvbihsaXN0ZW5lcikge1xuICAgIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgIH1cblxuICAgIHZhciBpbmRleCA9IHRoaXMubGlzdGVuZXJzLmluZGV4T2YobGlzdGVuZXIpO1xuICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgIHRoaXMubGlzdGVuZXJzLnNwbGljZShpbmRleCwgMSkucG9wKCk7XG4gICAgfVxuICB9LFxuXG5cbiAgLy8gQWRkcyBhIG5ldyBvYnNlcnZlciB0byBiZSBzeW5jZWQgd2l0aCBjaGFuZ2VzLiBJZiBgc2tpcFVwZGF0ZWAgaXMgdHJ1ZSB0aGVuIHRoZSBjYWxsYmFjayB3aWxsIG9ubHkgYmUgY2FsbGVkIHdoZW4gYVxuICAvLyBjaGFuZ2UgaXMgbWFkZSwgbm90IGluaXRpYWxseS5cbiAgYWRkOiBmdW5jdGlvbihvYnNlcnZlciwgc2tpcFVwZGF0ZSkge1xuICAgIHRoaXMub2JzZXJ2ZXJzLnB1c2gob2JzZXJ2ZXIpO1xuICAgIGlmICghc2tpcFVwZGF0ZSkge1xuICAgICAgb2JzZXJ2ZXIuZm9yY2VVcGRhdGVOZXh0U3luYyA9IHRydWU7XG4gICAgICBvYnNlcnZlci5zeW5jKCk7XG4gICAgfVxuICB9LFxuXG5cbiAgLy8gUmVtb3ZlcyBhbiBvYnNlcnZlciwgc3RvcHBpbmcgaXQgZnJvbSBiZWluZyBydW5cbiAgcmVtb3ZlOiBmdW5jdGlvbihvYnNlcnZlcikge1xuICAgIHZhciBpbmRleCA9IHRoaXMub2JzZXJ2ZXJzLmluZGV4T2Yob2JzZXJ2ZXIpO1xuICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgIHRoaXMub2JzZXJ2ZXJzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfSxcbn0pO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBPYnNlcnZlcjtcbnZhciBDbGFzcyA9IHJlcXVpcmUoJ2NoaXAtdXRpbHMvY2xhc3MnKTtcbnZhciBleHByZXNzaW9ucyA9IHJlcXVpcmUoJ2V4cHJlc3Npb25zLWpzJyk7XG52YXIgZGlmZiA9IHJlcXVpcmUoJ2RpZmZlcmVuY2VzLWpzJyk7XG5cbi8vICMgT2JzZXJ2ZXJcblxuLy8gRGVmaW5lcyBhbiBvYnNlcnZlciBjbGFzcyB3aGljaCByZXByZXNlbnRzIGFuIGV4cHJlc3Npb24uIFdoZW5ldmVyIHRoYXQgZXhwcmVzc2lvbiByZXR1cm5zIGEgbmV3IHZhbHVlIHRoZSBgY2FsbGJhY2tgXG4vLyBpcyBjYWxsZWQgd2l0aCB0aGUgdmFsdWUuXG4vL1xuLy8gSWYgdGhlIG9sZCBhbmQgbmV3IHZhbHVlcyB3ZXJlIGVpdGhlciBhbiBhcnJheSBvciBhbiBvYmplY3QsIHRoZSBgY2FsbGJhY2tgIGFsc29cbi8vIHJlY2VpdmVzIGFuIGFycmF5IG9mIHNwbGljZXMgKGZvciBhbiBhcnJheSksIG9yIGFuIGFycmF5IG9mIGNoYW5nZSBvYmplY3RzIChmb3IgYW4gb2JqZWN0KSB3aGljaCBhcmUgdGhlIHNhbWVcbi8vIGZvcm1hdCB0aGF0IGBBcnJheS5vYnNlcnZlYCBhbmQgYE9iamVjdC5vYnNlcnZlYCByZXR1cm5cbi8vIDxodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9PYmplY3Qvb2JzZXJ2ZT4uXG5mdW5jdGlvbiBPYnNlcnZlcihvYnNlcnZhdGlvbnMsIGV4cHIsIGNhbGxiYWNrLCBjYWxsYmFja0NvbnRleHQpIHtcbiAgaWYgKHR5cGVvZiBleHByID09PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhpcy5nZXR0ZXIgPSBleHByO1xuICAgIHRoaXMuc2V0dGVyID0gZXhwcjtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmdldHRlciA9IGV4cHJlc3Npb25zLnBhcnNlKGV4cHIsIG9ic2VydmF0aW9ucy5nbG9iYWxzLCBvYnNlcnZhdGlvbnMuZm9ybWF0dGVycyk7XG4gIH1cbiAgdGhpcy5vYnNlcnZhdGlvbnMgPSBvYnNlcnZhdGlvbnM7XG4gIHRoaXMuZXhwciA9IGV4cHI7XG4gIHRoaXMuY2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgdGhpcy5jYWxsYmFja0NvbnRleHQgPSBjYWxsYmFja0NvbnRleHQ7XG4gIHRoaXMuc2tpcCA9IGZhbHNlO1xuICB0aGlzLmZvcmNlVXBkYXRlTmV4dFN5bmMgPSBmYWxzZTtcbiAgdGhpcy5jb250ZXh0ID0gbnVsbDtcbiAgdGhpcy5vbGRWYWx1ZSA9IHVuZGVmaW5lZDtcbn1cblxuQ2xhc3MuZXh0ZW5kKE9ic2VydmVyLCB7XG5cbiAgLy8gQmluZHMgdGhpcyBleHByZXNzaW9uIHRvIGEgZ2l2ZW4gY29udGV4dFxuICBiaW5kOiBmdW5jdGlvbihjb250ZXh0LCBza2lwVXBkYXRlKSB7XG4gICAgdGhpcy5jb250ZXh0ID0gY29udGV4dDtcbiAgICBpZiAodGhpcy5jYWxsYmFjaykge1xuICAgICAgdGhpcy5vYnNlcnZhdGlvbnMuYWRkKHRoaXMsIHNraXBVcGRhdGUpO1xuICAgIH1cbiAgfSxcblxuICAvLyBVbmJpbmRzIHRoaXMgZXhwcmVzc2lvblxuICB1bmJpbmQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMub2JzZXJ2YXRpb25zLnJlbW92ZSh0aGlzKTtcbiAgICB0aGlzLmNvbnRleHQgPSBudWxsO1xuICB9LFxuXG4gIC8vIENsb3NlcyB0aGUgb2JzZXJ2ZXIsIGNsZWFuaW5nIHVwIGFueSBwb3NzaWJsZSBtZW1vcnktbGVha3NcbiAgY2xvc2U6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudW5iaW5kKCk7XG4gICAgdGhpcy5jYWxsYmFjayA9IG51bGw7XG4gICAgdGhpcy5jYWxsYmFja0NvbnRleHQgPSBudWxsO1xuICB9LFxuXG4gIC8vIFJldHVybnMgdGhlIGN1cnJlbnQgdmFsdWUgb2YgdGhpcyBvYnNlcnZlclxuICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLmNvbnRleHQpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldHRlci5jYWxsKHRoaXMuY29udGV4dCk7XG4gICAgfVxuICB9LFxuXG4gIC8vIFNldHMgdGhlIHZhbHVlIG9mIHRoaXMgZXhwcmVzc2lvblxuICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgaWYgKCF0aGlzLmNvbnRleHQpIHJldHVybjtcbiAgICBpZiAodGhpcy5zZXR0ZXIgPT09IGZhbHNlKSByZXR1cm47XG4gICAgaWYgKCF0aGlzLnNldHRlcikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgdGhpcy5zZXR0ZXIgPSB0eXBlb2YgdGhpcy5leHByID09PSAnc3RyaW5nJ1xuICAgICAgICAgID8gZXhwcmVzc2lvbnMucGFyc2VTZXR0ZXIodGhpcy5leHByLCB0aGlzLm9ic2VydmF0aW9ucy5nbG9iYWxzLCB0aGlzLm9ic2VydmF0aW9ucy5mb3JtYXR0ZXJzKVxuICAgICAgICAgIDogZmFsc2U7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHRoaXMuc2V0dGVyID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoIXRoaXMuc2V0dGVyKSByZXR1cm47XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIHZhciByZXN1bHQgPSB0aGlzLnNldHRlci5jYWxsKHRoaXMuY29udGV4dCwgdmFsdWUpO1xuICAgIH0gY2F0Y2goZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFdlIGNhbid0IGV4cGVjdCBjb2RlIGluIGZyYWdtZW50cyBvdXRzaWRlIE9ic2VydmVyIHRvIGJlIGF3YXJlIG9mIFwic3luY1wiIHNpbmNlIG9ic2VydmVyIGNhbiBiZSByZXBsYWNlZCBieSBvdGhlclxuICAgIC8vIHR5cGVzIChlLmcuIG9uZSB3aXRob3V0IGEgYHN5bmMoKWAgbWV0aG9kLCBzdWNoIGFzIG9uZSB0aGF0IHVzZXMgYE9iamVjdC5vYnNlcnZlYCkgaW4gb3RoZXIgc3lzdGVtcy5cbiAgICB0aGlzLnN5bmMoKTtcbiAgICB0aGlzLm9ic2VydmF0aW9ucy5zeW5jKCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSxcblxuXG4gIC8vIEluc3RydWN0cyB0aGlzIG9ic2VydmVyIHRvIG5vdCBjYWxsIGl0cyBgY2FsbGJhY2tgIG9uIHRoZSBuZXh0IHN5bmMsIHdoZXRoZXIgdGhlIHZhbHVlIGhhcyBjaGFuZ2VkIG9yIG5vdFxuICBza2lwTmV4dFN5bmM6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2tpcCA9IHRydWU7XG4gIH0sXG5cblxuICAvLyBTeW5jcyB0aGlzIG9ic2VydmVyIG5vdywgY2FsbGluZyB0aGUgY2FsbGJhY2sgaW1tZWRpYXRlbHkgaWYgdGhlcmUgaGF2ZSBiZWVuIGNoYW5nZXNcbiAgc3luYzogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHZhbHVlID0gdGhpcy5nZXQoKTtcblxuICAgIC8vIERvbid0IGNhbGwgdGhlIGNhbGxiYWNrIGlmIGBza2lwTmV4dFN5bmNgIHdhcyBjYWxsZWQgb24gdGhlIG9ic2VydmVyXG4gICAgaWYgKHRoaXMuc2tpcCB8fCAhdGhpcy5jYWxsYmFjaykge1xuICAgICAgdGhpcy5za2lwID0gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElmIGFuIGFycmF5IGhhcyBjaGFuZ2VkIGNhbGN1bGF0ZSB0aGUgc3BsaWNlcyBhbmQgY2FsbCB0aGUgY2FsbGJhY2suIFRoaXNcbiAgICAgIHZhciBjaGFuZ2VkID0gZGlmZi52YWx1ZXModmFsdWUsIHRoaXMub2xkVmFsdWUpO1xuICAgICAgaWYgKCFjaGFuZ2VkICYmICF0aGlzLmZvcmNlVXBkYXRlTmV4dFN5bmMpIHJldHVybjtcbiAgICAgIHRoaXMuZm9yY2VVcGRhdGVOZXh0U3luYyA9IGZhbHNlO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoY2hhbmdlZCkpIHtcbiAgICAgICAgdGhpcy5jYWxsYmFjay5jYWxsKHRoaXMuY2FsbGJhY2tDb250ZXh0LCB2YWx1ZSwgdGhpcy5vbGRWYWx1ZSwgY2hhbmdlZCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmNhbGxiYWNrLmNhbGwodGhpcy5jYWxsYmFja0NvbnRleHQsIHZhbHVlLCB0aGlzLm9sZFZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5nZXRDaGFuZ2VSZWNvcmRzKSB7XG4gICAgICAvLyBTdG9yZSBhbiBpbW11dGFibGUgdmVyc2lvbiBvZiB0aGUgdmFsdWUsIGFsbG93aW5nIGZvciBhcnJheXMgYW5kIG9iamVjdHMgdG8gY2hhbmdlIGluc3RhbmNlIGJ1dCBub3QgY29udGVudCBhbmRcbiAgICAgIC8vIHN0aWxsIHJlZnJhaW4gZnJvbSBkaXNwYXRjaGluZyBjYWxsYmFja3MgKGUuZy4gd2hlbiB1c2luZyBhbiBvYmplY3QgaW4gYmluZC1jbGFzcyBvciB3aGVuIHVzaW5nIGFycmF5IGZvcm1hdHRlcnNcbiAgICAgIC8vIGluIGJpbmQtZWFjaClcbiAgICAgIHRoaXMub2xkVmFsdWUgPSBkaWZmLmNsb25lKHZhbHVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5vbGRWYWx1ZSA9IHZhbHVlO1xuICAgIH1cbiAgfVxufSk7XG4iLCJcbmV4cG9ydHMuUm91dGVyID0gcmVxdWlyZSgnLi9zcmMvcm91dGVyJyk7XG5leHBvcnRzLlJvdXRlID0gcmVxdWlyZSgnLi9zcmMvcm91dGUnKTtcbmV4cG9ydHMuTG9jYXRpb24gPSByZXF1aXJlKCcuL3NyYy9sb2NhdGlvbicpO1xuZXhwb3J0cy5IYXNoTG9jYXRpb24gPSByZXF1aXJlKCcuL3NyYy9oYXNoLWxvY2F0aW9uJyk7XG5leHBvcnRzLlB1c2hMb2NhdGlvbiA9IHJlcXVpcmUoJy4vc3JjL3B1c2gtbG9jYXRpb24nKTtcbmV4cG9ydHMuY3JlYXRlID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICByZXR1cm4gbmV3IGV4cG9ydHMuUm91dGVyKG9wdGlvbnMpO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gSGFzaExvY2F0aW9uO1xudmFyIExvY2F0aW9uID0gcmVxdWlyZSgnLi9sb2NhdGlvbicpO1xuXG5cbi8vIExvY2F0aW9uIGltcGxlbWVudGF0aW9uIGZvciB1c2luZyB0aGUgVVJMIGhhc2hcbmZ1bmN0aW9uIEhhc2hMb2NhdGlvbigpIHtcbiAgTG9jYXRpb24uY2FsbCh0aGlzKTtcbn1cblxuTG9jYXRpb24uZXh0ZW5kKEhhc2hMb2NhdGlvbiwge1xuICBoaXN0b3J5RXZlbnROYW1lOiAnaGFzaGNoYW5nZScsXG5cbiAgZ2V0IHVybCgpIHtcbiAgICByZXR1cm4gbG9jYXRpb24uaGFzaC5yZXBsYWNlKC9eI1xcLz8vLCAnLycpIHx8ICcvJztcbiAgfSxcblxuICBzZXQgdXJsKHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlLmNoYXJBdCgwKSA9PT0gJy4nIHx8IHZhbHVlLnNwbGl0KCcvLycpLmxlbmd0aCA+IDEpIHtcbiAgICAgIHZhbHVlID0gdGhpcy5nZXRSZWxhdGl2ZVVybCh2YWx1ZSk7XG4gICAgfVxuXG4gICAgbG9jYXRpb24uaGFzaCA9ICh2YWx1ZSA9PT0gJy8nID8gJycgOiAnIycgKyB2YWx1ZSk7XG4gIH1cblxufSk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IExvY2F0aW9uO1xudmFyIEV2ZW50VGFyZ2V0ID0gcmVxdWlyZSgnY2hpcC11dGlscy9ldmVudC10YXJnZXQnKTtcbnZhciBkb2MgPSBkb2N1bWVudC5pbXBsZW1lbnRhdGlvbi5jcmVhdGVIVE1MRG9jdW1lbnQoJycpO1xudmFyIGJhc2UgPSBkb2MuY3JlYXRlRWxlbWVudCgnYmFzZScpO1xudmFyIGFuY2hvciA9IGRvYy5jcmVhdGVFbGVtZW50KCdhJyk7XG52YXIgYmFzZXMgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnYmFzZScpO1xudmFyIGJhc2VVUkkgPSBiYXNlc1swXSA/IGJhc2VzWzBdLmhyZWYgOiBsb2NhdGlvbi5wcm90b2NvbCArICcvLycgKyBsb2NhdGlvbi5ob3N0ICsgJy8nO1xudmFyIFB1c2hMb2NhdGlvbiwgcHVzaExvY2F0aW9uO1xudmFyIEhhc2hMb2NhdGlvbiwgaGFzaExvY2F0aW9uO1xuZG9jLmJvZHkuYXBwZW5kQ2hpbGQoYmFzZSk7XG5kb2MuYm9keS5hcHBlbmRDaGlsZChhbmNob3IpO1xuXG5cbmZ1bmN0aW9uIExvY2F0aW9uKCkge1xuICBFdmVudFRhcmdldC5jYWxsKHRoaXMpO1xuICB0aGlzLl9oYW5kbGVDaGFuZ2UgPSB0aGlzLl9oYW5kbGVDaGFuZ2UuYmluZCh0aGlzKTtcbiAgdGhpcy5iYXNlVVJJID0gYmFzZVVSSS5yZXBsYWNlKC9cXC8kLywgJycpO1xuICB0aGlzLmN1cnJlbnRVcmwgPSB0aGlzLnVybDtcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIodGhpcy5oaXN0b3J5RXZlbnROYW1lLCB0aGlzLl9oYW5kbGVDaGFuZ2UpO1xufVxuXG5FdmVudFRhcmdldC5leHRlbmQoTG9jYXRpb24sIHtcbiAgc3RhdGljOiB7XG4gICAgY3JlYXRlOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICBpZiAob3B0aW9ucy51c2UgPT09ICdoYXNoJyB8fCAhUHVzaExvY2F0aW9uLnN1cHBvcnRlZCkge1xuICAgICAgICByZXR1cm4gaGFzaExvY2F0aW9uIHx8IChoYXNoTG9jYXRpb24gPSBuZXcgSGFzaExvY2F0aW9uKCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHB1c2hMb2NhdGlvbiB8fCAocHVzaExvY2F0aW9uID0gbmV3IFB1c2hMb2NhdGlvbigpKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgZ2V0IHN1cHBvcnRlZCgpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfSxcblxuICBoaXN0b3J5RXZlbnROYW1lOiAnJyxcbiAgYmFzZTogYmFzZSxcbiAgYW5jaG9yOiBhbmNob3IsXG5cbiAgZ2V0UmVsYXRpdmVVcmw6IGZ1bmN0aW9uKHVybCkge1xuICAgIGJhc2UuaHJlZiA9IHRoaXMuYmFzZVVSSSArIHRoaXMuY3VycmVudFVybDtcbiAgICBhbmNob3IuaHJlZiA9IHVybDtcbiAgICB1cmwgPSBhbmNob3IucGF0aG5hbWUgKyBhbmNob3Iuc2VhcmNoO1xuICAgIC8vIEZpeCBJRSdzIG1pc3Npbmcgc2xhc2ggcHJlZml4XG4gICAgcmV0dXJuICh1cmxbMF0gPT09ICcvJykgPyB1cmwgOiAnLycgKyB1cmw7XG4gIH0sXG5cbiAgZ2V0UGF0aDogZnVuY3Rpb24odXJsKSB7XG4gICAgYmFzZS5ocmVmID0gdGhpcy5iYXNlVVJJICsgdGhpcy5jdXJyZW50VXJsO1xuICAgIGFuY2hvci5ocmVmID0gdXJsO1xuICAgIHZhciBwYXRoID0gYW5jaG9yLnBhdGhuYW1lO1xuICAgIC8vIEZpeCBJRSdzIG1pc3Npbmcgc2xhc2ggcHJlZml4XG4gICAgcmV0dXJuIChwYXRoWzBdID09PSAnLycpID8gcGF0aCA6ICcvJyArIHBhdGg7XG4gIH0sXG5cbiAgZ2V0IHVybCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0Fic3RyYWN0IG1ldGhvZC4gT3ZlcnJpZGUnKTtcbiAgfSxcblxuICBzZXQgdXJsKHZhbHVlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdBYnN0cmFjdCBtZXRob2QuIE92ZXJyaWRlJyk7XG4gIH0sXG5cbiAgX2NoYW5nZVRvOiBmdW5jdGlvbih1cmwpIHtcbiAgICB0aGlzLmN1cnJlbnRVcmwgPSB1cmw7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnY2hhbmdlJywgeyBkZXRhaWw6IHsgdXJsOiB1cmwgfX0pKTtcbiAgfSxcblxuICBfaGFuZGxlQ2hhbmdlOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdXJsID0gdGhpcy51cmw7XG4gICAgaWYgKHRoaXMuY3VycmVudFVybCAhPT0gdXJsKSB7XG4gICAgICB0aGlzLl9jaGFuZ2VUbyh1cmwpO1xuICAgIH1cbiAgfVxufSk7XG5cblB1c2hMb2NhdGlvbiA9IHJlcXVpcmUoJy4vcHVzaC1sb2NhdGlvbicpO1xuSGFzaExvY2F0aW9uID0gcmVxdWlyZSgnLi9oYXNoLWxvY2F0aW9uJyk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFB1c2hMb2NhdGlvbjtcbnZhciBMb2NhdGlvbiA9IHJlcXVpcmUoJy4vbG9jYXRpb24nKTtcbnZhciB1cmlQYXJ0cyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcblxuLy8gTG9jYXRpb24gaW1wbGVtZW50YXRpb24gZm9yIHVzaW5nIHB1c2hTdGF0ZVxuZnVuY3Rpb24gUHVzaExvY2F0aW9uKCkge1xuICBMb2NhdGlvbi5jYWxsKHRoaXMpO1xufVxuXG5Mb2NhdGlvbi5leHRlbmQoUHVzaExvY2F0aW9uLCB7XG4gIHN0YXRpYzoge1xuICAgIGdldCBzdXBwb3J0ZWQoKSB7XG4gICAgICByZXR1cm4gd2luZG93Lmhpc3RvcnkgJiYgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlICYmIHRydWU7XG4gICAgfVxuICB9LFxuXG4gIGhpc3RvcnlFdmVudE5hbWU6ICdwb3BzdGF0ZScsXG5cbiAgZ2V0IHVybCgpIHtcbiAgICByZXR1cm4gbG9jYXRpb24uaHJlZi5yZXBsYWNlKHRoaXMuYmFzZVVSSSwgJycpLnNwbGl0KCcjJykuc2hpZnQoKTtcbiAgfSxcblxuICBzZXQgdXJsKHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlLmNoYXJBdCgwKSA9PT0gJy4nIHx8IHZhbHVlLnNwbGl0KCcvLycpLmxlbmd0aCA+IDEpIHtcbiAgICAgIHZhbHVlID0gdGhpcy5nZXRSZWxhdGl2ZVVybCh2YWx1ZSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY3VycmVudFVybCAhPT0gdmFsdWUpIHtcbiAgICAgIGhpc3RvcnkucHVzaFN0YXRlKHt9LCAnJywgdmFsdWUpO1xuICAgICAgLy8gTWFudWFsbHkgY2hhbmdlIHNpbmNlIG5vIGV2ZW50IGlzIGRpc3BhdGNoZWQgd2hlbiB1c2luZyBwdXNoU3RhdGUvcmVwbGFjZVN0YXRlXG4gICAgICB0aGlzLl9jaGFuZ2VUbyh2YWx1ZSk7XG4gICAgfVxuICB9XG59KTtcbiIsIm1vZHVsZS5leHBvcnRzID0gUm91dGU7XG52YXIgQ2xhc3MgPSByZXF1aXJlKCdjaGlwLXV0aWxzL2NsYXNzJyk7XG5cbi8vIERlZmluZXMgYSBjZW50cmFsIHJvdXRpbmcgb2JqZWN0IHdoaWNoIGhhbmRsZXMgYWxsIFVSTCBjaGFuZ2VzIGFuZCByb3V0ZXMuXG5mdW5jdGlvbiBSb3V0ZShwYXRoLCBjYWxsYmFjaykge1xuICB0aGlzLnBhdGggPSBwYXRoO1xuICB0aGlzLmNhbGxiYWNrID0gY2FsbGJhY2s7XG4gIHRoaXMua2V5cyA9IFtdO1xuICB0aGlzLmV4cHIgPSBwYXJzZVBhdGgocGF0aCwgdGhpcy5rZXlzKTtcbiAgdGhpcy5oYW5kbGUgPSB0aGlzLmhhbmRsZS5iaW5kKHRoaXMpO1xufVxuXG5cbi8vIERldGVybWluZXMgd2hldGhlciByb3V0ZSBtYXRjaGVzIHBhdGhcbkNsYXNzLmV4dGVuZChSb3V0ZSwge1xuXG4gIG1hdGNoOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgaWYgKHRoaXMuZXhwci50ZXN0KHBhdGgpKSB7XG4gICAgICAvLyBjYWNoZSB0aGlzIG9uIG1hdGNoIHNvIHdlIGRvbid0IHJlY2FsY3VsYXRlIG11bHRpcGxlIHRpbWVzXG4gICAgICB0aGlzLnBhcmFtcyA9IHRoaXMuZ2V0UGFyYW1zKHBhdGgpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH0sXG5cbiAgZ2V0UGFyYW1zOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgdmFyIHBhcmFtcyA9IHt9O1xuICAgIHZhciBtYXRjaCA9IHRoaXMuZXhwci5leGVjKHBhdGgpO1xuICAgIGlmICghbWF0Y2gpIHtcbiAgICAgIHJldHVybiBwYXJhbXM7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBtYXRjaC5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGtleSA9IHRoaXMua2V5c1tpIC0gMV0gfHwgJyonO1xuICAgICAgdmFyIHZhbHVlID0gbWF0Y2hbaV07XG4gICAgICBwYXJhbXNba2V5XSA9IGRlY29kZVVSSUNvbXBvbmVudCh2YWx1ZSB8fCAnJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHBhcmFtcztcbiAgfSxcblxuICBoYW5kbGU6IGZ1bmN0aW9uKHJlcSwgZG9uZSkge1xuICAgIHJlcS5wYXJhbXMgPSB0aGlzLnBhcmFtcyB8fCB0aGlzLmdldFBhcmFtcyhyZXEucGF0aCk7XG4gICAgdGhpcy5jYWxsYmFjayhyZXEsIGRvbmUpO1xuICB9XG59KTtcblxuXG4vLyBOb3JtYWxpemVzIHRoZSBnaXZlbiBwYXRoIHN0cmluZywgcmV0dXJuaW5nIGEgcmVndWxhciBleHByZXNzaW9uLlxuLy9cbi8vIEFuIGVtcHR5IGFycmF5IHNob3VsZCBiZSBwYXNzZWQsIHdoaWNoIHdpbGwgY29udGFpbiB0aGUgcGxhY2Vob2xkZXIga2V5IG5hbWVzLiBGb3IgZXhhbXBsZSBgXCIvdXNlci86aWRcImAgd2lsbCB0aGVuXG4vLyBjb250YWluIGBbXCJpZFwiXWAuXG5mdW5jdGlvbiBwYXJzZVBhdGgocGF0aCwga2V5cykge1xuICBpZiAocGF0aCBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgIHJldHVybiBwYXRoO1xuICB9XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkocGF0aCkpIHtcbiAgICBwYXRoID0gJygnICsgcGF0aC5qb2luKCd8JykgKyAnKSc7XG4gIH1cblxuICBwYXRoID0gcGF0aFxuICAgIC5jb25jYXQoJy8/JylcbiAgICAucmVwbGFjZSgvXFwvXFwoL2csICcoPzovJylcbiAgICAucmVwbGFjZSgvKFxcLyk/KFxcLik/OihcXHcrKSg/OihcXCguKj9cXCkpKT8oXFw/KT8oXFwqKT8vZywgZnVuY3Rpb24oXywgc2xhc2gsIGZvcm1hdCwga2V5LCBjYXB0dXJlLCBvcHRpb25hbCwgc3Rhcikge1xuICAgICAga2V5cy5wdXNoKGtleSk7XG4gICAgICBzbGFzaCA9IHNsYXNoIHx8ICcnO1xuICAgICAgdmFyIGV4cHIgPSAnJztcbiAgICAgIGlmICghb3B0aW9uYWwpIGV4cHIgKz0gc2xhc2g7XG4gICAgICBleHByICs9ICcoPzonO1xuICAgICAgaWYgKG9wdGlvbmFsKSBleHByICs9IHNsYXNoO1xuICAgICAgZXhwciArPSBmb3JtYXQgfHwgJyc7XG4gICAgICBleHByICs9IGNhcHR1cmUgfHwgKGZvcm1hdCAmJiAnKFteLy5dKz8pJyB8fCAnKFteL10rPyknKSArICcpJztcbiAgICAgIGV4cHIgKz0gb3B0aW9uYWwgfHwgJyc7XG4gICAgICBpZiAoc3RhcikgZXhwciArPSAnKC8qKT8nO1xuICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfSlcbiAgICAucmVwbGFjZSgvKFtcXC8uXSkvZywgJ1xcXFwkMScpXG4gICAgLnJlcGxhY2UoL1xcKFxcXFxcXC9cXCpcXCkvZywgJygvLiopJykgLy8gcmVwbGFjZSB0aGUgKFxcLyopPyB3aXRoIChcXC8uKik/XG4gICAgLnJlcGxhY2UoL1xcKig/IVxcKSkvZywgJyguKiknKTsgLy8gYW55IG90aGVyICogdG8gKC4qKVxuICByZXR1cm4gbmV3IFJlZ0V4cCgnXicgKyBwYXRoICsgJyQnLCAnaScpO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBSb3V0ZXI7XG52YXIgUm91dGUgPSByZXF1aXJlKCcuL3JvdXRlJyk7XG52YXIgRXZlbnRUYXJnZXQgPSByZXF1aXJlKCdjaGlwLXV0aWxzL2V2ZW50LXRhcmdldCcpO1xudmFyIExvY2F0aW9uID0gcmVxdWlyZSgnLi9sb2NhdGlvbicpO1xuXG5cbi8vIFdvcmsgaW5zcGlyZWQgYnkgYW5kIGluIHNvbWUgY2FzZXMgYmFzZWQgb2ZmIG9mIHdvcmsgZG9uZSBmb3IgRXhwcmVzcy5qcyAoaHR0cHM6Ly9naXRodWIuY29tL3Zpc2lvbm1lZGlhL2V4cHJlc3MpXG4vLyBFdmVudHM6IGVycm9yLCBjaGFuZ2VcbmZ1bmN0aW9uIFJvdXRlcihvcHRpb25zKSB7XG4gIEV2ZW50VGFyZ2V0LmNhbGwodGhpcyk7XG4gIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHRoaXMucm91dGVzID0gW107XG4gIHRoaXMucGFyYW1zID0ge307XG4gIHRoaXMucGFyYW1zRXhwID0ge307XG4gIHRoaXMucm91dGVzLmJ5UGF0aCA9IHt9O1xuICB0aGlzLmxvY2F0aW9uID0gTG9jYXRpb24uY3JlYXRlKHRoaXMub3B0aW9ucyk7XG4gIHRoaXMub25VcmxDaGFuZ2UgPSB0aGlzLm9uVXJsQ2hhbmdlLmJpbmQodGhpcyk7XG59XG5cblxuRXZlbnRUYXJnZXQuZXh0ZW5kKFJvdXRlciwge1xuXG4gIC8vIFJlZ2lzdGVycyBhIGBjYWxsYmFja2AgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdoZW4gdGhlIGdpdmVuIHBhcmFtIGBuYW1lYCBpcyBtYXRjaGVkIGluIGEgVVJMXG4gIHBhcmFtOiBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaykge1xuICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICh0aGlzLnBhcmFtc1tuYW1lXSB8fCAodGhpcy5wYXJhbXNbbmFtZV0gPSBbXSkpLnB1c2goY2FsbGJhY2spO1xuICAgIH0gZWxzZSBpZiAoY2FsbGJhY2sgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgIHRoaXMucGFyYW1zRXhwW25hbWVdID0gY2FsbGJhY2s7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3BhcmFtIG11c3QgaGF2ZSBhIGNhbGxiYWNrIG9mIHR5cGUgXCJmdW5jdGlvblwiIG9yIFJlZ0V4cC4gR290ICcgKyBjYWxsYmFjayArICcuJyk7XG4gICAgfVxuICB9LFxuXG5cbiAgLy8gUmVnaXN0ZXJzIGEgYGNhbGxiYWNrYCBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2hlbiB0aGUgZ2l2ZW4gcGF0aCBtYXRjaGVzIGEgVVJMLiBUaGUgY2FsbGJhY2sgcmVjZWl2ZXMgdHdvXG4gIC8vIGFyZ3VtZW50cywgYHJlcWAsIGFuZCBgbmV4dGAsIHdoZXJlIGByZXFgIHJlcHJlc2VudHMgdGhlIHJlcXVlc3QgYW5kIGhhcyB0aGUgcHJvcGVydGllcywgYHVybGAsIGBwYXRoYCwgYHBhcmFtc2BcbiAgLy8gYW5kIGBxdWVyeWAuIGByZXEucGFyYW1zYCBpcyBhbiBvYmplY3Qgd2l0aCB0aGUgcGFyYW1ldGVycyBmcm9tIHRoZSBwYXRoIChlLmcuIC86dXNlcm5hbWUvKiB3b3VsZCBtYWtlIGEgcGFyYW1zXG4gIC8vIG9iamVjdCB3aXRoIHR3byBwcm9wZXJ0aWVzLCBgdXNlcm5hbWVgIGFuZCBgKmApLiBgcmVxLnF1ZXJ5YCBpcyBhbiBvYmplY3Qgd2l0aCBrZXktdmFsdWUgcGFpcnMgZnJvbSB0aGUgcXVlcnlcbiAgLy8gcG9ydGlvbiBvZiB0aGUgVVJMLlxuICByb3V0ZTogZnVuY3Rpb24ocGF0aCwgY2FsbGJhY2spIHtcbiAgICBpZiAodHlwZW9mIGNhbGxiYWNrICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdyb3V0ZSBtdXN0IGhhdmUgYSBjYWxsYmFjayBvZiB0eXBlIFwiZnVuY3Rpb25cIi4gR290ICcgKyBjYWxsYmFjayArICcuJyk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJyAmJiBwYXRoWzBdICE9PSAnLycpIHtcbiAgICAgIHBhdGggPSAnLycgKyBwYXRoO1xuICAgIH1cbiAgICB0aGlzLnJvdXRlcy5wdXNoKG5ldyBSb3V0ZShwYXRoLCBjYWxsYmFjaykpO1xuICB9LFxuXG5cbiAgcmVtb3ZlUm91dGU6IGZ1bmN0aW9uKHBhdGgsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMucm91dGVzLnNvbWUoZnVuY3Rpb24ocm91dGUsIGluZGV4KSB7XG4gICAgICBpZiAocm91dGUucGF0aCA9PT0gcGF0aCAmJiByb3V0ZS5jYWxsYmFjayA9PT0gY2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5yb3V0ZXMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cblxuICByZWRpcmVjdDogZnVuY3Rpb24odXJsKSB7XG4gICAgdmFyIG5vdEZvdW5kID0gZmFsc2U7XG4gICAgZnVuY3Rpb24gZXJySGFuZGxlcihldmVudCkge1xuICAgICAgbm90Rm91bmQgPSAoZXZlbnQuZGV0YWlsID09PSAnbm90Rm91bmQnKTtcbiAgICB9XG4gICAgdGhpcy5vbignZXJyb3InLCBlcnJIYW5kbGVyKTtcblxuICAgIHRoaXMubG9jYXRpb24udXJsID0gdXJsO1xuXG4gICAgdGhpcy5vZmYoJ2Vycm9yJywgZXJySGFuZGxlcik7XG4gICAgcmV0dXJuICFub3RGb3VuZDtcbiAgfSxcblxuXG4gIGxpc3RlbjogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5sb2NhdGlvbi5vbignY2hhbmdlJywgdGhpcy5vblVybENoYW5nZSk7XG4gIH0sXG5cblxuICBzdG9wOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmxvY2F0aW9uLm9mZignY2hhbmdlJywgdGhpcy5vblVybENoYW5nZSk7XG4gIH0sXG5cblxuICBnZXRSb3V0ZXNNYXRjaGluZ1BhdGg6IGZ1bmN0aW9uKHVybCkge1xuICAgIGlmICh1cmwgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICB2YXIgcGF0aCA9IHRoaXMubG9jYXRpb24uZ2V0UGF0aCh1cmwpO1xuICAgIHZhciBwYXJhbXNFeHAgPSB0aGlzLnBhcmFtc0V4cDtcblxuICAgIHJldHVybiB0aGlzLnJvdXRlcy5maWx0ZXIoZnVuY3Rpb24ocm91dGUpIHtcbiAgICAgIGlmICghcm91dGUubWF0Y2gocGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICB2YXIgcGFyYW1zID0gcm91dGUuZ2V0UGFyYW1zKHBhdGgpO1xuICAgICAgcmV0dXJuIHJvdXRlLmtleXMuZXZlcnkoZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHBhcmFtc1trZXldO1xuICAgICAgICByZXR1cm4gIXBhcmFtc0V4cC5oYXNPd25Qcm9wZXJ0eShrZXkpIHx8ICh2YWx1ZSAmJiBwYXJhbXNFeHBba2V5XS50ZXN0KHZhbHVlKSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSxcblxuXG4gIG9uVXJsQ2hhbmdlOiBmdW5jdGlvbihldmVudCkge1xuICAgIHZhciB1cmxQYXJ0cyA9IGV2ZW50LmRldGFpbC51cmwuc3BsaXQoJz8nKTtcbiAgICB2YXIgcGF0aCA9IHVybFBhcnRzLnNoaWZ0KCk7XG4gICAgdmFyIHF1ZXJ5ID0gdXJsUGFydHMuam9pbignPycpO1xuICAgIHZhciByZXEgPSB7IHVybDogZXZlbnQuZGV0YWlsLnVybCwgcGF0aDogcGF0aCwgcXVlcnk6IHBhcnNlUXVlcnkocXVlcnkpIH07XG4gICAgdmFyIHBhcmFtc0NhbGxlZCA9IHt9O1xuXG4gICAgdmFyIGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KCdjaGFuZ2luZycsIHsgZGV0YWlsOiByZXEsIGNhbmNlbGFibGU6IHRydWUgfSk7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICBpZiAoZXZlbnQuZGVmYXVsdFByZXZlbnRlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2NoYW5nZScsIHsgZGV0YWlsOiByZXEgfSkpO1xuICAgIHZhciByb3V0ZXMgPSB0aGlzLmdldFJvdXRlc01hdGNoaW5nUGF0aChwYXRoKTtcbiAgICB2YXIgY2FsbGJhY2tzID0gW107XG4gICAgdmFyIGhhbmRsZWRQYXJhbXMgPSB7fTtcbiAgICB2YXIgcm91dGVyID0gdGhpcztcblxuICAgIC8vIEFkZCBhbGwgdGhlIGNhbGxiYWNrcyBmb3IgdGhpcyBVUkwgKGFsbCBtYXRjaGluZyByb3V0ZXMgYW5kIHRoZSBwYXJhbXMgdGhleSdyZSBkZXBlbmRlbnQgb24pXG4gICAgcm91dGVzLmZvckVhY2goZnVuY3Rpb24ocm91dGUpIHtcbiAgICAgIC8vIEFkZCBwYXJhbSBjYWxsYmFja3Mgd2hlbiB0aGV5IGV4aXN0XG4gICAgICByb3V0ZS5rZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIGlmIChyb3V0ZXIucGFyYW1zLmhhc093blByb3BlcnR5KGtleSkgJiYgIWhhbmRsZWRQYXJhbXMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIGhhbmRsZWRQYXJhbXNba2V5XSA9IHRydWU7XG4gICAgICAgICAgdmFyIHZhbHVlID0gcm91dGUucGFyYW1zW2tleV07XG4gICAgICAgICAgcm91dGVyLnBhcmFtc1trZXldLmZvckVhY2goZnVuY3Rpb24ocGFyYW1DYWxsYmFjaykge1xuICAgICAgICAgICAgY2FsbGJhY2tzLnB1c2goZnVuY3Rpb24ocmVxLCBuZXh0KSB7XG4gICAgICAgICAgICAgIHBhcmFtQ2FsbGJhY2socmVxLCBuZXh0LCB2YWx1ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIC8vIEFkZCByb3V0ZSBjYWxsYmFja1xuICAgICAgY2FsbGJhY2tzLnB1c2gocm91dGUuaGFuZGxlKTtcbiAgICB9LCB0aGlzKTtcblxuICAgIC8vIENhbGxzIGVhY2ggY2FsbGJhY2sgb25lIGJ5IG9uZSB1bnRpbCBlaXRoZXIgdGhlcmUgaXMgYW4gZXJyb3Igb3Igd2UgY2FsbCBhbGwgb2YgdGhlbS5cbiAgICB2YXIgbmV4dCA9IGZ1bmN0aW9uKGVycikge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICByb3V0ZXIuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2Vycm9yJywgeyBkZXRhaWw6IGVyciB9KSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKCFjYWxsYmFja3MubGVuZ3RoKSByZXR1cm4gbmV4dCgnbm90Rm91bmQnKTtcbiAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2tzLnNoaWZ0KCk7XG4gICAgICBjYWxsYmFjayhyZXEsIG5leHQpO1xuICAgIH07XG5cbiAgICAvLyBTdGFydCBydW5uaW5nIHRoZSBjYWxsYmFja3MsIG9uZSBieSBvbmVcbiAgICBuZXh0KCk7XG4gIH1cblxufSk7XG5cblxuLy8gUGFyc2VzIGEgbG9jYXRpb24uc2VhcmNoIHN0cmluZyBpbnRvIGFuIG9iamVjdCB3aXRoIGtleS12YWx1ZSBwYWlycy5cbmZ1bmN0aW9uIHBhcnNlUXVlcnkoc2VhcmNoKSB7XG4gIHZhciBxdWVyeSA9IHt9O1xuICBpZiAoc2VhcmNoID09PSAnJykge1xuICAgIHJldHVybiBxdWVyeTtcbiAgfVxuXG4gIHNlYXJjaC5yZXBsYWNlKC9eXFw/LywgJycpLnNwbGl0KCcmJykuZm9yRWFjaChmdW5jdGlvbihrZXlWYWx1ZSkge1xuICAgIHZhciBwYXJ0cyA9IGtleVZhbHVlLnNwbGl0KCc9Jyk7XG4gICAgdmFyIGtleSA9IHBhcnRzWzBdO1xuICAgIHZhciB2YWx1ZSA9IHBhcnRzWzFdO1xuICAgIHF1ZXJ5W2RlY29kZVVSSUNvbXBvbmVudChrZXkpXSA9IGRlY29kZVVSSUNvbXBvbmVudCh2YWx1ZSk7XG4gIH0pO1xuXG4gIHJldHVybiBxdWVyeTtcbn1cbiJdfQ==
