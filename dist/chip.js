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
    var replacedText = match.replace(urlExp, '$1<a href="$2"' + target + '>$2</a>');
    return replacedText.replace(wwwExp, '$1<a href="http://$2"' + target + '>$2</a>');
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
  if (typeof SuperClass.onExtension === 'function') {
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


  // Listen to URL changes
  listen: function() {
    var app = this;

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
    this.routes = [];

    // Save index 0 for when no routes match
    this.templates = [ null ];
    this.expression = '';

    // each child with a [path] attribute will display only when its path matches the URL
    while (this.element.firstChild) {
      var child = this.element.firstChild;
      this.element.removeChild(child);

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
    this.baseURI = node.matchedRoutePath || this.app.location.baseURI;
    this.app.on('urlChange', this.onUrlChange);
    this.onUrlChange();
  };

  ifBinder.onUrlChange = function() {
    var url = this.app.location.url;
    var newIndex = 0;

    if (url.indexOf(this.baseURI) === 0) {
      url = url.replace(this.baseURI, '');
    } else {
      // no routes should match this url since it isn't within our subpath
      url = null;
    }

    if (url !== null) {
      this.routes.some(function(route, index) {
        if (route.match(url)) {
          this.matchedRoutePath = url.slice(0, -route.params['*'].length);
          console.log('matchedRoutePath:', this.matchedRoutePath);
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
    var animateObject, className, name, willName, didName, _this = this;

    if (this.animateObject && typeof this.animateObject === 'object') {
      animateObject = this.animateObject;
    } else if (this.animateClassName) {
      className = this.animateClassName;
    } else if (typeof this.animateObject === 'string') {
      className = this.animateObject;
    }

    if (animateObject) {
      var dir = direction === 'in' ? 'In' : 'Out';
      name = 'animate' + dir;
      willName = 'willAnimate' + dir;
      didName = 'didAnimate' + dir;

      animation.makeElementAnimatable(node);

      if (animateObject[willName]) {
        animateObject[willName](node);
        // trigger reflow
        node.offsetWidth = node.offsetWidth;
      }

      if (animateObject[name]) {
        animateObject[name](node, function() {
          if (animateObject[didName]) animateObject[didName](node);
          if (callback) callback.call(_this);
        });
      }
    } else {
      name = 'animate-' + direction;
      willName = 'will-animate-' + direction;
      if (className) node.classList.add(className);

      node.classList.add(willName);

      // trigger reflow
      node.offsetWidth = node.offsetWidth;

      node.classList.add(name);
      node.classList.remove(willName);

      var duration = getDuration.call(this, node, direction);
      var whenDone = function() {
        if (callback) callback.call(_this);
        node.classList.remove(name);
        if (className) node.classList.remove(className);
      };

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
        expression: value ? fragments.codifyExpression('attribute', value) : null,
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


function sortAttributes(a, b) {
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
  codifyExpression: function(type, text) {
    if (type !== 'attribute' && type !== 'text') {
      throw new TypeError('codifyExpression must use type "attribute" or "text"');
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
var baseURI = bases[0] ? bases[0].href : location.protocol + '//' + location.host;
var PushLocation, pushLocation;
var HashLocation, hashLocation;
doc.body.appendChild(base);
doc.body.appendChild(anchor);


function Location() {
  EventTarget.call(this);
  this._handleChange = this._handleChange.bind(this);
  this.baseURI = baseURI;
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
    base.href = baseURI + this.currentUrl;
    anchor.href = url;
    url = anchor.pathname + anchor.search;
    // Fix IE's missing slash prefix
    return (url[0] === '/') ? url : '/' + url;
  },

  getPath: function(url) {
    base.href = baseURI + this.currentUrl;
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9idWlsdC1pbnMvYW5pbWF0aW9ucy9mYWRlLmpzIiwiLi4vYnVpbHQtaW5zL2FuaW1hdGlvbnMvaW5kZXguanMiLCIuLi9idWlsdC1pbnMvYW5pbWF0aW9ucy9zbGlkZS1ob3Jpem9udGFsLmpzIiwiLi4vYnVpbHQtaW5zL2FuaW1hdGlvbnMvc2xpZGUtbW92ZS1ob3Jpem9udGFsLmpzIiwiLi4vYnVpbHQtaW5zL2FuaW1hdGlvbnMvc2xpZGUtbW92ZS5qcyIsIi4uL2J1aWx0LWlucy9hbmltYXRpb25zL3NsaWRlLmpzIiwiLi4vYnVpbHQtaW5zL2JpbmRlcnMvYXR0cmlidXRlLW5hbWVzLmpzIiwiLi4vYnVpbHQtaW5zL2JpbmRlcnMvYXV0b2ZvY3VzLmpzIiwiLi4vYnVpbHQtaW5zL2JpbmRlcnMvYXV0b3NlbGVjdC5qcyIsIi4uL2J1aWx0LWlucy9iaW5kZXJzL2NsYXNzZXMuanMiLCIuLi9idWlsdC1pbnMvYmluZGVycy9jb21wb25lbnQuanMiLCIuLi9idWlsdC1pbnMvYmluZGVycy9ldmVudHMuanMiLCIuLi9idWlsdC1pbnMvYmluZGVycy9odG1sLmpzIiwiLi4vYnVpbHQtaW5zL2JpbmRlcnMvaWYuanMiLCIuLi9idWlsdC1pbnMvYmluZGVycy9rZXktZXZlbnRzLmpzIiwiLi4vYnVpbHQtaW5zL2JpbmRlcnMvbG9nLmpzIiwiLi4vYnVpbHQtaW5zL2JpbmRlcnMvcHJvcGVydGllcy0yLXdheS5qcyIsIi4uL2J1aWx0LWlucy9iaW5kZXJzL3Byb3BlcnRpZXMuanMiLCIuLi9idWlsdC1pbnMvYmluZGVycy9yZWYuanMiLCIuLi9idWlsdC1pbnMvYmluZGVycy9yZXBlYXQuanMiLCIuLi9idWlsdC1pbnMvYmluZGVycy9zaG93LmpzIiwiLi4vYnVpbHQtaW5zL2JpbmRlcnMvc3R5bGVzLmpzIiwiLi4vYnVpbHQtaW5zL2JpbmRlcnMvdGV4dC5qcyIsIi4uL2J1aWx0LWlucy9iaW5kZXJzL3ZhbHVlLmpzIiwiLi4vYnVpbHQtaW5zL2Zvcm1hdHRlcnMvYWRkLXF1ZXJ5LmpzIiwiLi4vYnVpbHQtaW5zL2Zvcm1hdHRlcnMvYXV0b2xpbmsuanMiLCIuLi9idWlsdC1pbnMvZm9ybWF0dGVycy9ib29sLmpzIiwiLi4vYnVpbHQtaW5zL2Zvcm1hdHRlcnMvYnIuanMiLCIuLi9idWlsdC1pbnMvZm9ybWF0dGVycy9kYXRlLXRpbWUuanMiLCIuLi9idWlsdC1pbnMvZm9ybWF0dGVycy9kYXRlLmpzIiwiLi4vYnVpbHQtaW5zL2Zvcm1hdHRlcnMvZXNjYXBlLmpzIiwiLi4vYnVpbHQtaW5zL2Zvcm1hdHRlcnMvZmlsdGVyLmpzIiwiLi4vYnVpbHQtaW5zL2Zvcm1hdHRlcnMvZmxvYXQuanMiLCIuLi9idWlsdC1pbnMvZm9ybWF0dGVycy9mb3JtYXQuanMiLCIuLi9idWlsdC1pbnMvZm9ybWF0dGVycy9pbmRleC5qcyIsIi4uL2J1aWx0LWlucy9mb3JtYXR0ZXJzL2ludC5qcyIsIi4uL2J1aWx0LWlucy9mb3JtYXR0ZXJzL2pzb24uanMiLCIuLi9idWlsdC1pbnMvZm9ybWF0dGVycy9saW1pdC5qcyIsIi4uL2J1aWx0LWlucy9mb3JtYXR0ZXJzL2xvZy5qcyIsIi4uL2J1aWx0LWlucy9mb3JtYXR0ZXJzL2xvd2VyLmpzIiwiLi4vYnVpbHQtaW5zL2Zvcm1hdHRlcnMvbWFwLmpzIiwiLi4vYnVpbHQtaW5zL2Zvcm1hdHRlcnMvbmV3bGluZS5qcyIsIi4uL2J1aWx0LWlucy9mb3JtYXR0ZXJzL3AuanMiLCIuLi9idWlsdC1pbnMvZm9ybWF0dGVycy9yZWR1Y2UuanMiLCIuLi9idWlsdC1pbnMvZm9ybWF0dGVycy9zbGljZS5qcyIsIi4uL2J1aWx0LWlucy9mb3JtYXR0ZXJzL3NvcnQuanMiLCIuLi9idWlsdC1pbnMvZm9ybWF0dGVycy90aW1lLmpzIiwiLi4vYnVpbHQtaW5zL2Zvcm1hdHRlcnMvdXBwZXIuanMiLCIuLi9idWlsdC1pbnMvbm9kZV9tb2R1bGVzL2RpZmZlcmVuY2VzLWpzL2luZGV4LmpzIiwiLi4vYnVpbHQtaW5zL25vZGVfbW9kdWxlcy9kaWZmZXJlbmNlcy1qcy9zcmMvZGlmZi5qcyIsIi4uL2NoaXAtdXRpbHMvY2xhc3MuanMiLCIuLi9jaGlwLXV0aWxzL2V2ZW50LXRhcmdldC5qcyIsImluZGV4LmpzIiwic3JjL2FwcC5qcyIsInNyYy9iaW5kZXJzL3JvdXRlLmpzIiwic3JjL2NoaXAuanMiLCJzcmMvZnJhZ21lbnRzLmpzIiwic3JjL21peGlucy9kZWZhdWx0LmpzIiwiLi4vZGlmZmVyZW5jZXMtanMvc3JjL2RpZmYuanMiLCIuLi9leHByZXNzaW9ucy1qcy9pbmRleC5qcyIsIi4uL2V4cHJlc3Npb25zLWpzL3NyYy9leHByZXNzaW9ucy5qcyIsIi4uL2V4cHJlc3Npb25zLWpzL3NyYy9mb3JtYXR0ZXJzLmpzIiwiLi4vZXhwcmVzc2lvbnMtanMvc3JjL3Byb3BlcnR5LWNoYWlucy5qcyIsIi4uL2V4cHJlc3Npb25zLWpzL3NyYy9zdHJpbmdzLmpzIiwiLi4vZnJhZ21lbnRzLWpzL2luZGV4LmpzIiwiLi4vZnJhZ21lbnRzLWpzL25vZGVfbW9kdWxlcy9jaGlwLXV0aWxzL2NsYXNzLmpzIiwiLi4vZnJhZ21lbnRzLWpzL3NyYy9hbmltYXRlZEJpbmRpbmcuanMiLCIuLi9mcmFnbWVudHMtanMvc3JjL2JpbmRpbmcuanMiLCIuLi9mcmFnbWVudHMtanMvc3JjL2NvbXBpbGUuanMiLCIuLi9mcmFnbWVudHMtanMvc3JjL2ZyYWdtZW50cy5qcyIsIi4uL2ZyYWdtZW50cy1qcy9zcmMvdGVtcGxhdGUuanMiLCIuLi9mcmFnbWVudHMtanMvc3JjL3V0aWwvYW5pbWF0aW9uLmpzIiwiLi4vZnJhZ21lbnRzLWpzL3NyYy91dGlsL3BvbHlmaWxscy5qcyIsIi4uL2ZyYWdtZW50cy1qcy9zcmMvdXRpbC90b0ZyYWdtZW50LmpzIiwiLi4vZnJhZ21lbnRzLWpzL3NyYy92aWV3LmpzIiwiLi4vb2JzZXJ2YXRpb25zLWpzL2luZGV4LmpzIiwiLi4vb2JzZXJ2YXRpb25zLWpzL3NyYy9vYnNlcnZhdGlvbnMuanMiLCIuLi9vYnNlcnZhdGlvbnMtanMvc3JjL29ic2VydmVyLmpzIiwiLi4vcm91dGVzLWpzL2luZGV4LmpzIiwiLi4vcm91dGVzLWpzL3NyYy9oYXNoLWxvY2F0aW9uLmpzIiwiLi4vcm91dGVzLWpzL3NyYy9sb2NhdGlvbi5qcyIsIi4uL3JvdXRlcy1qcy9zcmMvcHVzaC1sb2NhdGlvbi5qcyIsIi4uL3JvdXRlcy1qcy9zcmMvcm91dGUuanMiLCIuLi9yb3V0ZXMtanMvc3JjL3JvdXRlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcFpBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdlVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxbUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNuS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBGYWRlIGluIGFuZCBvdXRcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gIGlmICghb3B0aW9ucykgb3B0aW9ucyA9IHt9O1xuICBpZiAoIW9wdGlvbnMuZHVyYXRpb24pIG9wdGlvbnMuZHVyYXRpb24gPSAyNTA7XG4gIGlmICghb3B0aW9ucy5lYXNpbmcpIG9wdGlvbnMuZWFzaW5nID0gJ2Vhc2UtaW4tb3V0JztcblxuICByZXR1cm4ge1xuICAgIG9wdGlvbnM6IG9wdGlvbnMsXG4gICAgYW5pbWF0ZUluOiBmdW5jdGlvbihlbGVtZW50LCBkb25lKSB7XG4gICAgICBlbGVtZW50LmFuaW1hdGUoW1xuICAgICAgICB7IG9wYWNpdHk6ICcwJyB9LFxuICAgICAgICB7IG9wYWNpdHk6ICcxJyB9XG4gICAgICBdLCB0aGlzLm9wdGlvbnMpLm9uZmluaXNoID0gZG9uZTtcbiAgICB9LFxuICAgIGFuaW1hdGVPdXQ6IGZ1bmN0aW9uKGVsZW1lbnQsIGRvbmUpIHtcbiAgICAgIGVsZW1lbnQuYW5pbWF0ZShbXG4gICAgICAgIHsgb3BhY2l0eTogJzEnIH0sXG4gICAgICAgIHsgb3BhY2l0eTogJzAnIH1cbiAgICAgIF0sIHRoaXMub3B0aW9ucykub25maW5pc2ggPSBkb25lO1xuICAgIH1cbiAgfTtcbn07XG4iLCIvKipcbiAqIEFkZHMgYWxsIGJ1aWx0LWluIGFuaW1hdGlvbnMgd2l0aCBkZWZhdWx0IG5hbWVzXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZnJhZ21lbnRzKSB7XG4gIGlmICghZnJhZ21lbnRzIHx8IHR5cGVvZiBmcmFnbWVudHMucmVnaXN0ZXJBbmltYXRpb24gIT09ICdmdW5jdGlvbicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdmb3JtYXR0ZXJzIHJlcXVpcmVzIGFuIGluc3RhbmNlIG9mIGZyYWdtZW50cyB0byByZWdpc3RlciB3aXRoJyk7XG4gIH1cblxuICBmcmFnbWVudHMucmVnaXN0ZXJBbmltYXRpb24oJ2ZhZGUnLCByZXF1aXJlKCcuL2ZhZGUnKSgpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQW5pbWF0aW9uKCdzbGlkZScsIHJlcXVpcmUoJy4vc2xpZGUnKSgpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQW5pbWF0aW9uKCdzbGlkZS1oJywgcmVxdWlyZSgnLi9zbGlkZS1ob3Jpem9udGFsJykoKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckFuaW1hdGlvbignc2xpZGUtbW92ZScsIHJlcXVpcmUoJy4vc2xpZGUtbW92ZScpKGZyYWdtZW50cykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJBbmltYXRpb24oJ3NsaWRlLW1vdmUtaCcsIHJlcXVpcmUoJy4vc2xpZGUtbW92ZS1ob3Jpem9udGFsJykoZnJhZ21lbnRzKSk7XG59O1xuIiwiLyoqXG4gKiBTbGlkZSBsZWZ0IGFuZCByaWdodFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgaWYgKCFvcHRpb25zKSBvcHRpb25zID0ge307XG4gIGlmICghb3B0aW9ucy5wcm9wZXJ0eSkgb3B0aW9ucy5wcm9wZXJ0eSA9ICd3aWR0aCc7XG4gIHJldHVybiByZXF1aXJlKCcuL3NsaWRlJykob3B0aW9ucyk7XG59O1xuIiwiLyoqXG4gKiBNb3ZlIGl0ZW1zIGxlZnQgYW5kIHJpZ2h0IGluIGEgbGlzdFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGZyYWdtZW50cywgb3B0aW9ucykge1xuICBpZiAoIW9wdGlvbnMpIG9wdGlvbnMgPSB7fTtcbiAgaWYgKCFvcHRpb25zLnByb3BlcnR5KSBvcHRpb25zLnByb3BlcnR5ID0gJ3dpZHRoJztcbiAgcmV0dXJuIHJlcXVpcmUoJy4vc2xpZGUtbW92ZScpKGZyYWdtZW50cywgb3B0aW9ucyk7XG59O1xuIiwidmFyIHNsaWRlQW5pbWF0aW9uID0gcmVxdWlyZSgnLi9zbGlkZScpO1xudmFyIGFuaW1hdGluZyA9IG5ldyBNYXAoKTtcblxuLyoqXG4gKiBNb3ZlIGl0ZW1zIHVwIGFuZCBkb3duIGluIGEgbGlzdFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGZyYWdtZW50cywgb3B0aW9ucykge1xuICBpZiAoIW9wdGlvbnMpIG9wdGlvbnMgPSB7fTtcbiAgaWYgKCFvcHRpb25zLmR1cmF0aW9uKSBvcHRpb25zLmR1cmF0aW9uID0gMjUwO1xuICBpZiAoIW9wdGlvbnMuZWFzaW5nKSBvcHRpb25zLmVhc2luZyA9ICdlYXNlLWluLW91dCc7XG4gIGlmICghb3B0aW9ucy5wcm9wZXJ0eSkgb3B0aW9ucy5wcm9wZXJ0eSA9ICdoZWlnaHQnO1xuXG4gIHJldHVybiB7XG4gICAgb3B0aW9uczogb3B0aW9ucyxcblxuICAgIGFuaW1hdGVJbjogZnVuY3Rpb24oZWxlbWVudCwgZG9uZSkge1xuICAgICAgdmFyIHZhbHVlID0gZWxlbWVudC5nZXRDb21wdXRlZENTUyhvcHRpb25zLnByb3BlcnR5KTtcbiAgICAgIGlmICghdmFsdWUgfHwgdmFsdWUgPT09ICcwcHgnKSB7XG4gICAgICAgIHJldHVybiBkb25lKCk7XG4gICAgICB9XG5cbiAgICAgIHZhciBpdGVtID0gZWxlbWVudC52aWV3ICYmIGVsZW1lbnQudmlldy5fcmVwZWF0SXRlbV87XG4gICAgICBpZiAoaXRlbSkge1xuICAgICAgICBhbmltYXRpbmcuc2V0KGl0ZW0sIGVsZW1lbnQpO1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGFuaW1hdGluZy5kZWxldGUoaXRlbSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBEbyB0aGUgc2xpZGVcbiAgICAgIGVsZW1lbnQuc3R5bGUub3ZlcmZsb3cgPSAnaGlkZGVuJztcbiAgICAgIGVsZW1lbnQuYW5pbWF0ZShbXG4gICAgICAgIGtleVZhbHVlUGFpcihvcHRpb25zLnByb3BlcnR5LCAnMHB4JyksXG4gICAgICAgIGtleVZhbHVlUGFpcihvcHRpb25zLnByb3BlcnR5LCB2YWx1ZSlcbiAgICAgIF0sIHRoaXMub3B0aW9ucykub25maW5pc2ggPSBmdW5jdGlvbigpIHtcbiAgICAgICAgZWxlbWVudC5zdHlsZS5vdmVyZmxvdyA9ICcnO1xuICAgICAgICBkb25lKCk7XG4gICAgICB9O1xuICAgIH0sXG5cbiAgICBhbmltYXRlT3V0OiBmdW5jdGlvbihlbGVtZW50LCBkb25lKSB7XG4gICAgICB2YXIgdmFsdWUgPSBlbGVtZW50LmdldENvbXB1dGVkQ1NTKG9wdGlvbnMucHJvcGVydHkpO1xuICAgICAgaWYgKCF2YWx1ZSB8fCB2YWx1ZSA9PT0gJzBweCcpIHtcbiAgICAgICAgcmV0dXJuIGRvbmUoKTtcbiAgICAgIH1cblxuICAgICAgdmFyIGl0ZW0gPSBlbGVtZW50LnZpZXcgJiYgZWxlbWVudC52aWV3Ll9yZXBlYXRJdGVtXztcbiAgICAgIGlmIChpdGVtKSB7XG4gICAgICAgIHZhciBuZXdFbGVtZW50ID0gYW5pbWF0aW5nLmdldChpdGVtKTtcbiAgICAgICAgaWYgKG5ld0VsZW1lbnQgJiYgbmV3RWxlbWVudC5wYXJlbnROb2RlID09PSBlbGVtZW50LnBhcmVudE5vZGUpIHtcbiAgICAgICAgICAvLyBUaGlzIGl0ZW0gaXMgYmVpbmcgcmVtb3ZlZCBpbiBvbmUgcGxhY2UgYW5kIGFkZGVkIGludG8gYW5vdGhlci4gTWFrZSBpdCBsb29rIGxpa2UgaXRzIG1vdmluZyBieSBtYWtpbmcgYm90aFxuICAgICAgICAgIC8vIGVsZW1lbnRzIG5vdCB2aXNpYmxlIGFuZCBoYXZpbmcgYSBjbG9uZSBtb3ZlIGFib3ZlIHRoZSBpdGVtcyB0byB0aGUgbmV3IGxvY2F0aW9uLlxuICAgICAgICAgIGVsZW1lbnQgPSB0aGlzLmFuaW1hdGVNb3ZlKGVsZW1lbnQsIG5ld0VsZW1lbnQpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIERvIHRoZSBzbGlkZVxuICAgICAgZWxlbWVudC5zdHlsZS5vdmVyZmxvdyA9ICdoaWRkZW4nO1xuICAgICAgZWxlbWVudC5hbmltYXRlKFtcbiAgICAgICAga2V5VmFsdWVQYWlyKG9wdGlvbnMucHJvcGVydHksIHZhbHVlKSxcbiAgICAgICAga2V5VmFsdWVQYWlyKG9wdGlvbnMucHJvcGVydHksICcwcHgnKVxuICAgICAgXSwgdGhpcy5vcHRpb25zKS5vbmZpbmlzaCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBlbGVtZW50LnN0eWxlLm92ZXJmbG93ID0gJyc7XG4gICAgICAgIGRvbmUoKTtcbiAgICAgIH07XG4gICAgfSxcblxuICAgIGFuaW1hdGVNb3ZlOiBmdW5jdGlvbihvbGRFbGVtZW50LCBuZXdFbGVtZW50KSB7XG4gICAgICB2YXIgcGxhY2Vob2xkZXJFbGVtZW50O1xuICAgICAgdmFyIHBhcmVudCA9IG5ld0VsZW1lbnQucGFyZW50Tm9kZTtcbiAgICAgIGlmICghcGFyZW50Ll9fc2xpZGVNb3ZlSGFuZGxlZCkge1xuICAgICAgICBwYXJlbnQuX19zbGlkZU1vdmVIYW5kbGVkID0gdHJ1ZTtcbiAgICAgICAgaWYgKHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHBhcmVudCkucG9zaXRpb24gPT09ICdzdGF0aWMnKSB7XG4gICAgICAgICAgcGFyZW50LnN0eWxlLnBvc2l0aW9uID0gJ3JlbGF0aXZlJztcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB2YXIgb3JpZ1N0eWxlID0gb2xkRWxlbWVudC5nZXRBdHRyaWJ1dGUoJ3N0eWxlJyk7XG4gICAgICB2YXIgc3R5bGUgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShvbGRFbGVtZW50KTtcbiAgICAgIHZhciBtYXJnaW5PZmZzZXRMZWZ0ID0gLXBhcnNlSW50KHN0eWxlLm1hcmdpbkxlZnQpO1xuICAgICAgdmFyIG1hcmdpbk9mZnNldFRvcCA9IC1wYXJzZUludChzdHlsZS5tYXJnaW5Ub3ApO1xuICAgICAgdmFyIG9sZExlZnQgPSBvbGRFbGVtZW50Lm9mZnNldExlZnQ7XG4gICAgICB2YXIgb2xkVG9wID0gb2xkRWxlbWVudC5vZmZzZXRUb3A7XG5cbiAgICAgIHBsYWNlaG9sZGVyRWxlbWVudCA9IGZyYWdtZW50cy5tYWtlRWxlbWVudEFuaW1hdGFibGUob2xkRWxlbWVudC5jbG9uZU5vZGUodHJ1ZSkpO1xuICAgICAgcGxhY2Vob2xkZXJFbGVtZW50LnN0eWxlLndpZHRoID0gb2xkRWxlbWVudC5zdHlsZS53aWR0aCA9IHN0eWxlLndpZHRoO1xuICAgICAgcGxhY2Vob2xkZXJFbGVtZW50LnN0eWxlLmhlaWdodCA9IG9sZEVsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gc3R5bGUuaGVpZ2h0O1xuICAgICAgcGxhY2Vob2xkZXJFbGVtZW50LnN0eWxlLm9wYWNpdHkgPSAnMCc7XG5cbiAgICAgIG9sZEVsZW1lbnQuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuICAgICAgb2xkRWxlbWVudC5zdHlsZS56SW5kZXggPSAxMDAwO1xuICAgICAgcGFyZW50Lmluc2VydEJlZm9yZShwbGFjZWhvbGRlckVsZW1lbnQsIG9sZEVsZW1lbnQpO1xuICAgICAgbmV3RWxlbWVudC5zdHlsZS5vcGFjaXR5ID0gJzAnO1xuXG4gICAgICBvbGRFbGVtZW50LmFuaW1hdGUoW1xuICAgICAgICB7IHRvcDogb2xkVG9wICsgbWFyZ2luT2Zmc2V0VG9wICsgJ3B4JywgbGVmdDogb2xkTGVmdCArIG1hcmdpbk9mZnNldExlZnQgKyAncHgnIH0sXG4gICAgICAgIHsgdG9wOiBuZXdFbGVtZW50Lm9mZnNldFRvcCArIG1hcmdpbk9mZnNldFRvcCArICdweCcsIGxlZnQ6IG5ld0VsZW1lbnQub2Zmc2V0TGVmdCArIG1hcmdpbk9mZnNldExlZnQgKyAncHgnIH1cbiAgICAgIF0sIHRoaXMub3B0aW9ucykub25maW5pc2ggPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcGxhY2Vob2xkZXJFbGVtZW50LnJlbW92ZSgpO1xuICAgICAgICBvcmlnU3R5bGUgPyBvbGRFbGVtZW50LnNldEF0dHJpYnV0ZSgnc3R5bGUnLCBvcmlnU3R5bGUpIDogb2xkRWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUoJ3N0eWxlJyk7XG4gICAgICAgIG5ld0VsZW1lbnQuc3R5bGUub3BhY2l0eSA9ICcnO1xuICAgICAgfTtcblxuICAgICAgcmV0dXJuIHBsYWNlaG9sZGVyRWxlbWVudDtcbiAgICB9XG4gIH07XG59O1xuXG5mdW5jdGlvbiBrZXlWYWx1ZVBhaXIoa2V5LCB2YWx1ZSkge1xuICB2YXIgb2JqID0ge307XG4gIG9ialtrZXldID0gdmFsdWU7XG4gIHJldHVybiBvYmo7XG59XG4iLCIvKipcbiAqIFNsaWRlIGRvd24gYW5kIHVwXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICBpZiAoIW9wdGlvbnMpIG9wdGlvbnMgPSB7fTtcbiAgaWYgKCFvcHRpb25zLmR1cmF0aW9uKSBvcHRpb25zLmR1cmF0aW9uID0gMjUwO1xuICBpZiAoIW9wdGlvbnMuZWFzaW5nKSBvcHRpb25zLmVhc2luZyA9ICdlYXNlLWluLW91dCc7XG4gIGlmICghb3B0aW9ucy5wcm9wZXJ0eSkgb3B0aW9ucy5wcm9wZXJ0eSA9ICdoZWlnaHQnO1xuXG4gIHJldHVybiB7XG4gICAgb3B0aW9uczogb3B0aW9ucyxcblxuICAgIGFuaW1hdGVJbjogZnVuY3Rpb24oZWxlbWVudCwgZG9uZSkge1xuICAgICAgdmFyIHZhbHVlID0gZWxlbWVudC5nZXRDb21wdXRlZENTUyh0aGlzLm9wdGlvbnMucHJvcGVydHkpO1xuICAgICAgaWYgKCF2YWx1ZSB8fCB2YWx1ZSA9PT0gJzBweCcpIHtcbiAgICAgICAgcmV0dXJuIGRvbmUoKTtcbiAgICAgIH1cblxuICAgICAgZWxlbWVudC5zdHlsZS5vdmVyZmxvdyA9ICdoaWRkZW4nO1xuICAgICAgZWxlbWVudC5hbmltYXRlKFtcbiAgICAgICAga2V5VmFsdWVQYWlyKHRoaXMub3B0aW9ucy5wcm9wZXJ0eSwgJzBweCcpLFxuICAgICAgICBrZXlWYWx1ZVBhaXIodGhpcy5vcHRpb25zLnByb3BlcnR5LCB2YWx1ZSlcbiAgICAgIF0sIHRoaXMub3B0aW9ucykub25maW5pc2ggPSBmdW5jdGlvbigpIHtcbiAgICAgICAgZWxlbWVudC5zdHlsZS5vdmVyZmxvdyA9ICcnO1xuICAgICAgICBkb25lKCk7XG4gICAgICB9O1xuICAgIH0sXG5cbiAgICBhbmltYXRlT3V0OiBmdW5jdGlvbihlbGVtZW50LCBkb25lKSB7XG4gICAgICB2YXIgdmFsdWUgPSBlbGVtZW50LmdldENvbXB1dGVkQ1NTKHRoaXMub3B0aW9ucy5wcm9wZXJ0eSk7XG4gICAgICBpZiAoIXZhbHVlIHx8IHZhbHVlID09PSAnMHB4Jykge1xuICAgICAgICByZXR1cm4gZG9uZSgpO1xuICAgICAgfVxuXG4gICAgICBlbGVtZW50LnN0eWxlLm92ZXJmbG93ID0gJ2hpZGRlbic7XG4gICAgICBlbGVtZW50LmFuaW1hdGUoW1xuICAgICAgICBrZXlWYWx1ZVBhaXIodGhpcy5vcHRpb25zLnByb3BlcnR5LCB2YWx1ZSksXG4gICAgICAgIGtleVZhbHVlUGFpcih0aGlzLm9wdGlvbnMucHJvcGVydHksICcwcHgnKVxuICAgICAgXSwgdGhpcy5vcHRpb25zKS5vbmZpbmlzaCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBlbGVtZW50LnN0eWxlLm92ZXJmbG93ID0gJyc7XG4gICAgICAgIGRvbmUoKTtcbiAgICAgIH07XG4gICAgfVxuICB9O1xufTtcblxuZnVuY3Rpb24ga2V5VmFsdWVQYWlyKGtleSwgdmFsdWUpIHtcbiAgdmFyIG9iaiA9IHt9O1xuICBvYmpba2V5XSA9IHZhbHVlO1xuICByZXR1cm4gb2JqO1xufVxuIiwiLyoqXG4gKiBBIGJpbmRlciB0aGF0IHRvZ2dsZXMgYW4gYXR0cmlidXRlIG9uIG9yIG9mZiBpZiB0aGUgZXhwcmVzc2lvbiBpcyB0cnV0aHkgb3IgZmFsc2V5LiBVc2UgZm9yIGF0dHJpYnV0ZXMgd2l0aG91dFxuICogdmFsdWVzIHN1Y2ggYXMgYHNlbGVjdGVkYCwgYGRpc2FibGVkYCwgb3IgYHJlYWRvbmx5YC5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzcGVjaWZpY0F0dHJOYW1lKSB7XG4gIHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHZhciBhdHRyTmFtZSA9IHNwZWNpZmljQXR0ck5hbWUgfHwgdGhpcy5tYXRjaDtcbiAgICBpZiAoIXZhbHVlKSB7XG4gICAgICB0aGlzLmVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKGF0dHJOYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5lbGVtZW50LnNldEF0dHJpYnV0ZShhdHRyTmFtZSwgJycpO1xuICAgIH1cbiAgfTtcbn07XG4iLCIvKipcbiAqIEEgYmluZGVyIHRoYXQgYXV0b21hdGljYWxseSBmb2N1c2VzIHRoZSBpbnB1dCB3aGVuIGl0IGlzIGRpc3BsYXllZCBvbiBzY3JlZW4uXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB7XG5cbiAgICBib3VuZDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZWxlbWVudCA9IHRoaXMuZWxlbWVudDtcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIGVsZW1lbnQuZm9jdXMoKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICB9O1xufTtcbiIsIi8qKlxuICogQXV0b21hdGljYWxseSBzZWxlY3RzIHRoZSBjb250ZW50cyBvZiBhbiBpbnB1dCB3aGVuIGl0IHJlY2VpdmVzIGZvY3VzLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4ge1xuXG4gICAgY3JlYXRlZDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZm9jdXNlZCwgbW91c2VFdmVudDtcblxuICAgICAgdGhpcy5lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBVc2UgbWF0Y2hlcyBzaW5jZSBkb2N1bWVudC5hY3RpdmVFbGVtZW50IGRvZXNuJ3Qgd29yayB3ZWxsIHdpdGggd2ViIGNvbXBvbmVudHMgKGZ1dHVyZSBjb21wYXQpXG4gICAgICAgIGZvY3VzZWQgPSB0aGlzLm1hdGNoZXMoJzpmb2N1cycpO1xuICAgICAgICBtb3VzZUV2ZW50ID0gdHJ1ZTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignZm9jdXMnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKCFtb3VzZUV2ZW50KSB7XG4gICAgICAgICAgdGhpcy5zZWxlY3QoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICghZm9jdXNlZCkge1xuICAgICAgICAgIHRoaXMuc2VsZWN0KCk7XG4gICAgICAgIH1cbiAgICAgICAgbW91c2VFdmVudCA9IGZhbHNlO1xuICAgICAgfSk7XG4gICAgfVxuXG4gIH07XG59O1xuIiwiLyoqXG4gKiBBIGJpbmRlciB0aGF0IGFkZHMgY2xhc3NlcyB0byBhbiBlbGVtZW50IGRlcGVuZGVudCBvbiB3aGV0aGVyIHRoZSBleHByZXNzaW9uIGlzIHRydWUgb3IgZmFsc2UuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSkge1xuICAgICAgdGhpcy5lbGVtZW50LmNsYXNzTGlzdC5hZGQodGhpcy5tYXRjaCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKHRoaXMubWF0Y2gpO1xuICAgIH1cbiAgfTtcbn07XG4iLCJ2YXIgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG5cbi8qKlxuICogQW4gZWxlbWVudCBiaW5kZXIgdGhhdCBiaW5kcyB0aGUgdGVtcGxhdGUgb24gdGhlIGRlZmluaXRpb24gdG8gZmlsbCB0aGUgY29udGVudHMgb2YgdGhlIGVsZW1lbnQgdGhhdCBtYXRjaGVzLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGRlZmluaXRpb24pIHtcbiAgdmFyIGRlZmluaXRpb25zID0gc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuXG4gIGlmICghZGVmaW5pdGlvbikge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ011c3QgcHJvdmlkZSBhIGRlZmluaXRpb24gb2JqZWN0IHRvIGRlZmluZSB0aGUgY3VzdG9tIGNvbXBvbmVudCcpO1xuICB9XG5cbiAgLy8gVGhlIGxhc3QgZGVmaW5pdGlvbiBpcyB0aGUgbW9zdCBpbXBvcnRhbnQsIGFueSBvdGhlcnMgYXJlIG1peGluc1xuICBkZWZpbml0aW9uID0gZGVmaW5pdGlvbnNbZGVmaW5pdGlvbnMubGVuZ3RoIC0gMV07XG5cbiAgcmV0dXJuIHtcblxuICAgIGNvbXBpbGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIGlmIChkZWZpbml0aW9uLnRlbXBsYXRlICYmICFkZWZpbml0aW9uLnRlbXBsYXRlLnBvb2wpIHtcbiAgICAgICAgZGVmaW5pdGlvbi50ZW1wbGF0ZSA9IHRoaXMuZnJhZ21lbnRzLmNyZWF0ZVRlbXBsYXRlKGRlZmluaXRpb24udGVtcGxhdGUpO1xuICAgICAgfVxuXG4gICAgICBpZiAoZGVmaW5pdGlvbi50ZW1wbGF0ZSkge1xuICAgICAgICB0aGlzLnRlbXBsYXRlID0gZGVmaW5pdGlvbi50ZW1wbGF0ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuZWxlbWVudC5jaGlsZE5vZGVzLmxlbmd0aCkge1xuICAgICAgICAvLyBVc2UgdGhlIGNvbnRlbnRzIG9mIHRoaXMgY29tcG9uZW50IHRvIGJlIGluc2VydGVkIHdpdGhpbiBpdFxuICAgICAgICB0aGlzLmNvbnRlbnRUZW1wbGF0ZSA9IHRoaXMuZnJhZ21lbnRzLmNyZWF0ZVRlbXBsYXRlKHRoaXMuZWxlbWVudC5jaGlsZE5vZGVzKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgY3JlYXRlZDogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAodGhpcy5jb250ZW50VGVtcGxhdGUpIHtcbiAgICAgICAgdGhpcy5jb250ZW50ID0gdGhpcy5jb250ZW50VGVtcGxhdGUuY3JlYXRlVmlldygpO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy50ZW1wbGF0ZSkge1xuICAgICAgICB0aGlzLnZpZXcgPSB0aGlzLnRlbXBsYXRlLmNyZWF0ZVZpZXcoKTtcbiAgICAgICAgdGhpcy5lbGVtZW50LmFwcGVuZENoaWxkKHRoaXMudmlldyk7XG4gICAgICAgIGlmICh0aGlzLmNvbnRlbnQpIHtcbiAgICAgICAgICB0aGlzLl9jb21wb25lbnRDb250ZW50ID0gdGhpcy5jb250ZW50O1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuY29udGVudCkge1xuICAgICAgICB0aGlzLmVsZW1lbnQuYXBwZW5kQ2hpbGQodGhpcy5jb250ZW50KTtcbiAgICAgIH1cblxuICAgICAgZGVmaW5pdGlvbnMuZm9yRWFjaChmdW5jdGlvbihkZWZpbml0aW9uKSB7XG4gICAgICAgIE9iamVjdC5rZXlzKGRlZmluaXRpb24pLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgICAgdGhpcy5lbGVtZW50W2tleV0gPSBkZWZpbml0aW9uW2tleV07XG4gICAgICAgIH0sIHRoaXMpO1xuICAgICAgfSwgdGhpcyk7XG5cbiAgICAgIC8vIERvbid0IGNhbGwgY3JlYXRlZCB1bnRpbCBhZnRlciBhbGwgZGVmaW5pdGlvbnMgaGF2ZSBiZWVuIGNvcGllZCBvdmVyXG4gICAgICBkZWZpbml0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uKGRlZmluaXRpb24pIHtcbiAgICAgICAgaWYgKHR5cGVvZiBkZWZpbml0aW9uLmNyZWF0ZWQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBkZWZpbml0aW9uLmNyZWF0ZWQuY2FsbCh0aGlzLmVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgICB9LCB0aGlzKTtcbiAgICB9LFxuXG4gICAgYm91bmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHRoaXMudmlldykgdGhpcy52aWV3LmJpbmQodGhpcy5lbGVtZW50KTtcbiAgICAgIGlmICh0aGlzLmNvbnRlbnQpIHRoaXMuY29udGVudC5iaW5kKHRoaXMuY29udGV4dCk7XG5cbiAgICAgIGRlZmluaXRpb25zLmZvckVhY2goZnVuY3Rpb24oZGVmaW5pdGlvbikge1xuICAgICAgICBpZiAodHlwZW9mIGRlZmluaXRpb24uYXR0YWNoZWQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBkZWZpbml0aW9uLmF0dGFjaGVkLmNhbGwodGhpcy5lbGVtZW50KTtcbiAgICAgICAgfVxuICAgICAgfSwgdGhpcyk7XG4gICAgfSxcblxuICAgIHVuYm91bmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHRoaXMuY29udGVudCkgdGhpcy5jb250ZW50LnVuYmluZCgpO1xuICAgICAgaWYgKHRoaXMudmlldykgdGhpcy52aWV3LnVuYmluZCgpO1xuXG4gICAgICBkZWZpbml0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uKGRlZmluaXRpb24pIHtcbiAgICAgICAgaWYgKHR5cGVvZiBkZWZpbml0aW9uLmRldGFjaGVkID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgZGVmaW5pdGlvbi5kZXRhY2hlZC5jYWxsKHRoaXMuZWxlbWVudCk7XG4gICAgICAgIH1cbiAgICAgIH0sIHRoaXMpO1xuICAgIH1cbiAgfTtcbn07XG4iLCIvKipcbiAqIEEgYmluZGVyIGZvciBhZGRpbmcgZXZlbnQgbGlzdGVuZXJzLiBXaGVuIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQgdGhlIGV4cHJlc3Npb24gd2lsbCBiZSBleGVjdXRlZC4gVGhlIHByb3BlcnRpZXNcbiAqIGBldmVudGAgKHRoZSBldmVudCBvYmplY3QpIGFuZCBgZWxlbWVudGAgKHRoZSBlbGVtZW50IHRoZSBiaW5kZXIgaXMgb24pIHdpbGwgYmUgYXZhaWxhYmxlIHRvIHRoZSBleHByZXNzaW9uLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHNwZWNpZmljRXZlbnROYW1lKSB7XG4gIHJldHVybiB7XG4gICAgY3JlYXRlZDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZXZlbnROYW1lID0gc3BlY2lmaWNFdmVudE5hbWUgfHwgdGhpcy5tYXRjaDtcbiAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAgIHRoaXMuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgaWYgKF90aGlzLnNob3VsZFNraXAoZXZlbnQpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IHRoZSBldmVudCBvbiB0aGUgY29udGV4dCBzbyBpdCBtYXkgYmUgdXNlZCBpbiB0aGUgZXhwcmVzc2lvbiB3aGVuIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQuXG4gICAgICAgIHZhciBwcmlvckV2ZW50ID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihfdGhpcy5jb250ZXh0LCAnZXZlbnQnKTtcbiAgICAgICAgdmFyIHByaW9yRWxlbWVudCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IoX3RoaXMuY29udGV4dCwgJ2VsZW1lbnQnKTtcbiAgICAgICAgX3RoaXMuc2V0RXZlbnQoZXZlbnQsIHByaW9yRXZlbnQsIHByaW9yRWxlbWVudCk7XG5cbiAgICAgICAgLy8gTGV0IGFuIGV2ZW50IGJpbmRlciBtYWtlIHRoZSBmdW5jdGlvbiBjYWxsIHdpdGggaXRzIG93biBhcmd1bWVudHNcbiAgICAgICAgX3RoaXMub2JzZXJ2ZXIuZ2V0KCk7XG5cbiAgICAgICAgLy8gUmVzZXQgdGhlIGNvbnRleHQgdG8gaXRzIHByaW9yIHN0YXRlXG4gICAgICAgIF90aGlzLmNsZWFyRXZlbnQoKTtcbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBzaG91bGRTa2lwOiBmdW5jdGlvbihldmVudCkge1xuICAgICAgcmV0dXJuICF0aGlzLmNvbnRleHQgfHwgZXZlbnQuY3VycmVudFRhcmdldC5oYXNBdHRyaWJ1dGUoJ2Rpc2FibGVkJyk7XG4gICAgfSxcblxuICAgIHVuYm91bmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5jbGVhckV2ZW50KCk7XG4gICAgfSxcblxuICAgIHNldEV2ZW50OiBmdW5jdGlvbihldmVudCwgcHJpb3JFdmVudERlc2NyaXB0b3IsIHByaW9yRWxlbWVudERlc2NyaXB0b3IpIHtcbiAgICAgIGlmICghdGhpcy5jb250ZXh0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMuZXZlbnQgPSBldmVudDtcbiAgICAgIHRoaXMucHJpb3JFdmVudERlc2NyaXB0b3IgPSBwcmlvckV2ZW50RGVzY3JpcHRvcjtcbiAgICAgIHRoaXMucHJpb3JFbGVtZW50RGVzY3JpcHRvciA9IHByaW9yRWxlbWVudERlc2NyaXB0b3I7XG4gICAgICB0aGlzLmxhc3RDb250ZXh0ID0gdGhpcy5jb250ZXh0O1xuXG4gICAgICB0aGlzLmNvbnRleHQuZXZlbnQgPSBldmVudDtcbiAgICAgIHRoaXMuY29udGV4dC5lbGVtZW50ID0gdGhpcy5lbGVtZW50O1xuICAgIH0sXG5cbiAgICBjbGVhckV2ZW50OiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICghdGhpcy5ldmVudCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIgY29udGV4dCA9IHRoaXMubGFzdENvbnRleHQ7XG5cbiAgICAgIGlmICh0aGlzLnByaW9yRXZlbnREZXNjcmlwdG9yKSB7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShjb250ZXh0LCAnZXZlbnQnLCB0aGlzLnByaW9yRXZlbnREZXNjcmlwdG9yKTtcbiAgICAgICAgdGhpcy5wcmlvckV2ZW50RGVzY3JpcHRvciA9IG51bGw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZWxldGUgY29udGV4dC5ldmVudDtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMucHJpb3JFbGVtZW50RGVzY3JpcHRvcikge1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoY29udGV4dCwgJ2VsZW1lbnQnLCB0aGlzLnByaW9yRWxlbWVudERlc2NyaXB0b3IpO1xuICAgICAgICB0aGlzLnByaW9yRWxlbWVudERlc2NyaXB0b3IgPSBudWxsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVsZXRlIGNvbnRleHQuZWxlbWVudDtcbiAgICAgIH1cblxuICAgICAgdGhpcy5ldmVudCA9IG51bGw7XG4gICAgICB0aGlzLmxhc3RDb250ZXh0ID0gbnVsbDtcbiAgICB9XG4gIH07XG59O1xuIiwiLyoqXG4gKiBBIGJpbmRlciB0aGF0IGRpc3BsYXlzIHVuZXNjYXBlZCBIVE1MIGluc2lkZSBhbiBlbGVtZW50LiBCZSBzdXJlIGl0J3MgdHJ1c3RlZCEgVGhpcyBzaG91bGQgYmUgdXNlZCB3aXRoIGZvcm1hdHRlcnNcbiAqIHdoaWNoIGNyZWF0ZSBIVE1MIGZyb20gc29tZXRoaW5nIHNhZmUuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHRoaXMuZWxlbWVudC5pbm5lckhUTUwgPSAodmFsdWUgPT0gbnVsbCA/ICcnIDogdmFsdWUpO1xuICB9O1xufTtcbiIsIi8qKlxuICogaWYsIHVubGVzcywgZWxzZS1pZiwgZWxzZS11bmxlc3MsIGVsc2VcbiAqIEEgYmluZGVyIGluaXQgZnVuY3Rpb24gdGhhdCBjcmVhdGVzIGEgYmluZGVyIHRoYXQgc2hvd3Mgb3IgaGlkZXMgdGhlIGVsZW1lbnQgaWYgdGhlIHZhbHVlIGlzIHRydXRoeSBvciBmYWxzZXkuXG4gKiBBY3R1YWxseSByZW1vdmVzIHRoZSBlbGVtZW50IGZyb20gdGhlIERPTSB3aGVuIGhpZGRlbiwgcmVwbGFjaW5nIGl0IHdpdGggYSBub24tdmlzaWJsZSBwbGFjZWhvbGRlciBhbmQgbm90IG5lZWRsZXNzbHlcbiAqIGV4ZWN1dGluZyBiaW5kaW5ncyBpbnNpZGUuIFBhc3MgaW4gdGhlIGNvbmZpZ3VyYXRpb24gdmFsdWVzIGZvciB0aGUgY29ycmVzcG9uZGluZyBwYXJ0bmVyIGF0dHJpYnV0ZXMgZm9yIHVubGVzcyBhbmRcbiAqIGVsc2UsIGV0Yy5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihlbHNlSWZBdHRyTmFtZSwgZWxzZUF0dHJOYW1lLCB1bmxlc3NBdHRyTmFtZSwgZWxzZVVubGVzc0F0dHJOYW1lKSB7XG4gIHJldHVybiB7XG4gICAgYW5pbWF0ZWQ6IHRydWUsXG4gICAgcHJpb3JpdHk6IDE1MCxcblxuICAgIGNvbXBpbGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBlbGVtZW50ID0gdGhpcy5lbGVtZW50O1xuICAgICAgdmFyIGV4cHJlc3Npb25zID0gWyB3cmFwSWZFeHAodGhpcy5leHByZXNzaW9uLCB0aGlzLm5hbWUgPT09IHVubGVzc0F0dHJOYW1lKSBdO1xuICAgICAgdmFyIHBsYWNlaG9sZGVyID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICAgICAgdmFyIG5vZGUgPSBlbGVtZW50Lm5leHRFbGVtZW50U2libGluZztcbiAgICAgIHRoaXMuZWxlbWVudCA9IHBsYWNlaG9sZGVyO1xuICAgICAgZWxlbWVudC5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChwbGFjZWhvbGRlciwgZWxlbWVudCk7XG5cbiAgICAgIC8vIFN0b3JlcyBhIHRlbXBsYXRlIGZvciBhbGwgdGhlIGVsZW1lbnRzIHRoYXQgY2FuIGdvIGludG8gdGhpcyBzcG90XG4gICAgICB0aGlzLnRlbXBsYXRlcyA9IFsgdGhpcy5mcmFnbWVudHMuY3JlYXRlVGVtcGxhdGUoZWxlbWVudCkgXTtcblxuICAgICAgLy8gUHVsbCBvdXQgYW55IG90aGVyIGVsZW1lbnRzIHRoYXQgYXJlIGNoYWluZWQgd2l0aCB0aGlzIG9uZVxuICAgICAgd2hpbGUgKG5vZGUpIHtcbiAgICAgICAgdmFyIG5leHQgPSBub2RlLm5leHRFbGVtZW50U2libGluZztcbiAgICAgICAgdmFyIGV4cHJlc3Npb247XG4gICAgICAgIGlmIChub2RlLmhhc0F0dHJpYnV0ZShlbHNlSWZBdHRyTmFtZSkpIHtcbiAgICAgICAgICBleHByZXNzaW9uID0gdGhpcy5mcmFnbWVudHMuY29kaWZ5RXhwcmVzc2lvbignYXR0cmlidXRlJywgbm9kZS5nZXRBdHRyaWJ1dGUoZWxzZUlmQXR0ck5hbWUpKTtcbiAgICAgICAgICBleHByZXNzaW9ucy5wdXNoKHdyYXBJZkV4cChleHByZXNzaW9uLCBmYWxzZSkpO1xuICAgICAgICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKGVsc2VJZkF0dHJOYW1lKTtcbiAgICAgICAgfSBlbHNlIGlmIChub2RlLmhhc0F0dHJpYnV0ZShlbHNlVW5sZXNzQXR0ck5hbWUpKSB7XG4gICAgICAgICAgZXhwcmVzc2lvbiA9IHRoaXMuZnJhZ21lbnRzLmNvZGlmeUV4cHJlc3Npb24oJ2F0dHJpYnV0ZScsIG5vZGUuZ2V0QXR0cmlidXRlKGVsc2VVbmxlc3NBdHRyTmFtZSkpO1xuICAgICAgICAgIGV4cHJlc3Npb25zLnB1c2god3JhcElmRXhwKGV4cHJlc3Npb24sIHRydWUpKTtcbiAgICAgICAgICBub2RlLnJlbW92ZUF0dHJpYnV0ZShlbHNlVW5sZXNzQXR0ck5hbWUpO1xuICAgICAgICB9IGVsc2UgaWYgKG5vZGUuaGFzQXR0cmlidXRlKGVsc2VBdHRyTmFtZSkpIHtcbiAgICAgICAgICBub2RlLnJlbW92ZUF0dHJpYnV0ZShlbHNlQXR0ck5hbWUpO1xuICAgICAgICAgIG5leHQgPSBudWxsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgbm9kZS5yZW1vdmUoKTtcbiAgICAgICAgdGhpcy50ZW1wbGF0ZXMucHVzaCh0aGlzLmZyYWdtZW50cy5jcmVhdGVUZW1wbGF0ZShub2RlKSk7XG4gICAgICAgIG5vZGUgPSBuZXh0O1xuICAgICAgfVxuXG4gICAgICAvLyBBbiBleHByZXNzaW9uIHRoYXQgd2lsbCByZXR1cm4gYW4gaW5kZXguIFNvbWV0aGluZyBsaWtlIHRoaXMgYGV4cHIgPyAwIDogZXhwcjIgPyAxIDogZXhwcjMgPyAyIDogM2AuIFRoaXMgd2lsbFxuICAgICAgLy8gYmUgdXNlZCB0byBrbm93IHdoaWNoIHNlY3Rpb24gdG8gc2hvdyBpbiB0aGUgaWYvZWxzZS1pZi9lbHNlIGdyb3VwaW5nLlxuICAgICAgdGhpcy5leHByZXNzaW9uID0gZXhwcmVzc2lvbnMubWFwKGZ1bmN0aW9uKGV4cHIsIGluZGV4KSB7XG4gICAgICAgIHJldHVybiBleHByICsgJyA/ICcgKyBpbmRleCArICcgOiAnO1xuICAgICAgfSkuam9pbignJykgKyBleHByZXNzaW9ucy5sZW5ndGg7XG4gICAgfSxcblxuICAgIHVwZGF0ZWQ6IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICAvLyBGb3IgcGVyZm9ybWFuY2UgcHJvdmlkZSBhbiBhbHRlcm5hdGUgY29kZSBwYXRoIGZvciBhbmltYXRpb25cbiAgICAgIGlmICh0aGlzLmFuaW1hdGUgJiYgdGhpcy5jb250ZXh0ICYmICF0aGlzLmZpcnN0VXBkYXRlKSB7XG4gICAgICAgIHRoaXMudXBkYXRlZEFuaW1hdGVkKGluZGV4KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMudXBkYXRlZFJlZ3VsYXIoaW5kZXgpO1xuICAgICAgfVxuICAgICAgdGhpcy5maXJzdFVwZGF0ZSA9IGZhbHNlO1xuICAgIH0sXG5cbiAgICBhZGQ6IGZ1bmN0aW9uKHZpZXcpIHtcbiAgICAgIHRoaXMuZWxlbWVudC5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh2aWV3LCB0aGlzLmVsZW1lbnQubmV4dFNpYmxpbmcpO1xuICAgIH0sXG5cbiAgICAvLyBEb2Vzbid0IGRvIG11Y2gsIGJ1dCBhbGxvd3Mgc3ViLWNsYXNzZXMgdG8gYWx0ZXIgdGhlIGZ1bmN0aW9uYWxpdHkuXG4gICAgcmVtb3ZlOiBmdW5jdGlvbih2aWV3KSB7XG4gICAgICB2aWV3LmRpc3Bvc2UoKTtcbiAgICB9LFxuXG4gICAgdXBkYXRlZFJlZ3VsYXI6IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICBpZiAodGhpcy5zaG93aW5nKSB7XG4gICAgICAgIHRoaXMucmVtb3ZlKHRoaXMuc2hvd2luZyk7XG4gICAgICAgIHRoaXMuc2hvd2luZyA9IG51bGw7XG4gICAgICB9XG4gICAgICB2YXIgdGVtcGxhdGUgPSB0aGlzLnRlbXBsYXRlc1tpbmRleF07XG4gICAgICBpZiAodGVtcGxhdGUpIHtcbiAgICAgICAgdGhpcy5zaG93aW5nID0gdGVtcGxhdGUuY3JlYXRlVmlldygpO1xuICAgICAgICB0aGlzLnNob3dpbmcuYmluZCh0aGlzLmNvbnRleHQpO1xuICAgICAgICB0aGlzLmFkZCh0aGlzLnNob3dpbmcpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICB1cGRhdGVkQW5pbWF0ZWQ6IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICB0aGlzLmxhc3RWYWx1ZSA9IGluZGV4O1xuICAgICAgaWYgKHRoaXMuYW5pbWF0aW5nKSB7XG4gICAgICAgIC8vIE9ic29sZXRlZCwgd2lsbCBjaGFuZ2UgYWZ0ZXIgYW5pbWF0aW9uIGlzIGZpbmlzaGVkLlxuICAgICAgICB0aGlzLnNob3dpbmcudW5iaW5kKCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuc2hvd2luZykge1xuICAgICAgICB0aGlzLmFuaW1hdGluZyA9IHRydWU7XG4gICAgICAgIHRoaXMuc2hvd2luZy51bmJpbmQoKTtcbiAgICAgICAgdGhpcy5hbmltYXRlT3V0KHRoaXMuc2hvd2luZywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdGhpcy5hbmltYXRpbmcgPSBmYWxzZTtcblxuICAgICAgICAgIGlmICh0aGlzLnNob3dpbmcpIHtcbiAgICAgICAgICAgIC8vIE1ha2Ugc3VyZSB0aGlzIHdhc24ndCB1bmJvdW5kIHdoaWxlIHdlIHdlcmUgYW5pbWF0aW5nIChlLmcuIGJ5IGEgcGFyZW50IGBpZmAgdGhhdCBkb2Vzbid0IGFuaW1hdGUpXG4gICAgICAgICAgICB0aGlzLnJlbW92ZSh0aGlzLnNob3dpbmcpO1xuICAgICAgICAgICAgdGhpcy5zaG93aW5nID0gbnVsbDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAodGhpcy5jb250ZXh0KSB7XG4gICAgICAgICAgICAvLyBmaW5pc2ggYnkgYW5pbWF0aW5nIHRoZSBuZXcgZWxlbWVudCBpbiAoaWYgYW55KSwgdW5sZXNzIG5vIGxvbmdlciBib3VuZFxuICAgICAgICAgICAgdGhpcy51cGRhdGVkQW5pbWF0ZWQodGhpcy5sYXN0VmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIHRlbXBsYXRlID0gdGhpcy50ZW1wbGF0ZXNbaW5kZXhdO1xuICAgICAgaWYgKHRlbXBsYXRlKSB7XG4gICAgICAgIHRoaXMuc2hvd2luZyA9IHRlbXBsYXRlLmNyZWF0ZVZpZXcoKTtcbiAgICAgICAgdGhpcy5zaG93aW5nLmJpbmQodGhpcy5jb250ZXh0KTtcbiAgICAgICAgdGhpcy5hZGQodGhpcy5zaG93aW5nKTtcbiAgICAgICAgdGhpcy5hbmltYXRpbmcgPSB0cnVlO1xuICAgICAgICB0aGlzLmFuaW1hdGVJbih0aGlzLnNob3dpbmcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHRoaXMuYW5pbWF0aW5nID0gZmFsc2U7XG4gICAgICAgICAgLy8gaWYgdGhlIHZhbHVlIGNoYW5nZWQgd2hpbGUgdGhpcyB3YXMgYW5pbWF0aW5nIHJ1biBpdCBhZ2FpblxuICAgICAgICAgIGlmICh0aGlzLmxhc3RWYWx1ZSAhPT0gaW5kZXgpIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlZEFuaW1hdGVkKHRoaXMubGFzdFZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBib3VuZDogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmZpcnN0VXBkYXRlID0gdHJ1ZTtcbiAgICB9LFxuXG4gICAgdW5ib3VuZDogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAodGhpcy5zaG93aW5nKSB7XG4gICAgICAgIHRoaXMuc2hvd2luZy51bmJpbmQoKTtcbiAgICAgIH1cbiAgICAgIHRoaXMubGFzdFZhbHVlID0gbnVsbDtcbiAgICAgIHRoaXMuYW5pbWF0aW5nID0gZmFsc2U7XG4gICAgfVxuICB9O1xufTtcblxuZnVuY3Rpb24gd3JhcElmRXhwKGV4cHIsIGlzVW5sZXNzKSB7XG4gIGlmIChpc1VubGVzcykge1xuICAgIHJldHVybiAnISgnICsgZXhwciArICcpJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZXhwcjtcbiAgfVxufVxuIiwidmFyIGtleXMgPSB7XG4gIGJhY2tzcGFjZTogOCxcbiAgdGFiOiA5LFxuICBlbnRlcjogMTMsXG4gIHJldHVybjogMTMsXG4gIGVzYzogMjcsXG4gIGVzY2FwZTogMjcsXG4gIHNwYWNlOiAzMixcbiAgbGVmdDogMzcsXG4gIHVwOiAzOCxcbiAgcmlnaHQ6IDM5LFxuICBkb3duOiA0MCxcbiAgZGVsOiA0NixcbiAgZGVsZXRlOiA0NlxufTtcblxuLyoqXG4gKiBBZGRzIGEgYmluZGVyIHdoaWNoIGlzIHRyaWdnZXJlZCB3aGVuIGEga2V5Ym9hcmQgZXZlbnQncyBga2V5Q29kZWAgcHJvcGVydHkgbWF0Y2hlcyBmb3IgdGhlIGFib3ZlIGxpc3Qgb2Yga2V5cy4gSWZcbiAqIG1vcmUgcm9idXN0IHNob3J0Y3V0cyBhcmUgcmVxdWlyZWQgdXNlIHRoZSBzaG9ydGN1dCBiaW5kZXIuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc3BlY2lmaWNLZXlOYW1lLCBzcGVjaWZpY0V2ZW50TmFtZSkge1xuICB2YXIgZXZlbnRCaW5kZXIgPSByZXF1aXJlKCcuL2V2ZW50cycpKHNwZWNpZmljRXZlbnROYW1lKTtcblxuICByZXR1cm4ge1xuICAgIGNvbXBpbGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIC8vIFNwbGl0IG9uIG5vbi1jaGFyIChlLmcuIGtleWRvd246OmVudGVyIG9yIGtleXVwLmVzYyB0byBoYW5kbGUgdmFyaW91cyBzdHlsZXMpXG4gICAgICB2YXIgcGFydHMgPSAoc3BlY2lmaWNLZXlOYW1lIHx8IHRoaXMubWF0Y2gpLnNwbGl0KC9bXmEtel0rLyk7XG4gICAgICBpZiAodGhpcy5lbGVtZW50Lmhhc093blByb3BlcnR5KCdvbicgKyBwYXJ0c1swXSkpIHtcbiAgICAgICAgdGhpcy5tYXRjaCA9IHBhcnRzLnNoaWZ0KCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLm1hdGNoID0gJ2tleWRvd24nO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmN0cmxLZXkgPSBwYXJ0c1swXSA9PT0gJ2N0cmwnO1xuXG4gICAgICBpZiAodGhpcy5jdHJsS2V5KSB7XG4gICAgICAgIHRoaXMua2V5Q29kZSA9IGtleXNbcGFydHNbMV1dO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5rZXlDb2RlID0ga2V5c1twYXJ0c1swXV07XG4gICAgICB9XG4gICAgfSxcblxuICAgIHNob3VsZFNraXA6IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICBpZiAodGhpcy5rZXlDb2RlKSB7XG4gICAgICAgIHJldHVybiBldmVudEJpbmRlci5zaG91bGRTa2lwLmNhbGwodGhpcywgZXZlbnQpIHx8XG4gICAgICAgICAgdGhpcy5jdHJsS2V5ICE9PSAoZXZlbnQuY3RybEtleSB8fCBldmVudC5tZXRhS2V5KSB8fFxuICAgICAgICAgIHRoaXMua2V5Q29kZSAhPT0gZXZlbnQua2V5Q29kZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBldmVudEJpbmRlci5zaG91bGRTa2lwLmNhbGwodGhpcywgZXZlbnQpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBjcmVhdGVkOiBldmVudEJpbmRlci5jcmVhdGVkLFxuICAgIHVuYm91bmQ6IGV2ZW50QmluZGVyLnVuYm91bmQsXG4gICAgc2V0RXZlbnQ6IGV2ZW50QmluZGVyLnNldEV2ZW50LFxuICAgIGNsZWFyRXZlbnQ6IGV2ZW50QmluZGVyLmNsZWFyRXZlbnRcbiAgfTtcbn07XG4iLCIvKipcbiAqIEEgYmluZGVyIHRoYXQgcHJpbnRzIG91dCB0aGUgdmFsdWUgb2YgdGhlIGV4cHJlc3Npb24gdG8gdGhlIGNvbnNvbGUuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB7XG4gICAgcHJpb3JpdHk6IDYwLFxuICAgIHVwZGF0ZWQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAvKmVzbGludC1kaXNhYmxlIG5vLWNvbnNvbGUgKi9cbiAgICAgIGNvbnNvbGUubG9nKCclY0RlYnVnOiAlYycgKyB0aGlzLmV4cHJlc3Npb24sICdjb2xvcjpibHVlO2ZvbnQtd2VpZ2h0OmJvbGQnLCAnY29sb3I6I0RGODEzOCcsICc9JywgdmFsdWUpO1xuICAgICAgLyplc2xpbnQtZW5hYmxlICovXG4gICAgfVxuICB9O1xufTtcbiIsIi8qKlxuICogQSBiaW5kZXIgdGhhdCBzZXRzIHRoZSBwcm9wZXJ0eSBvZiBhbiBlbGVtZW50IHRvIHRoZSB2YWx1ZSBvZiB0aGUgZXhwcmVzc2lvbiBpbiBhIDItd2F5IGJpbmRpbmcuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc3BlY2lmaWNQcm9wZXJ0eU5hbWUpIHtcbiAgcmV0dXJuIHtcblxuICAgIGNyZWF0ZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy50d29XYXlPYnNlcnZlciA9IHRoaXMub2JzZXJ2ZShzcGVjaWZpY1Byb3BlcnR5TmFtZSB8fCB0aGlzLmNhbWVsQ2FzZSwgdGhpcy5zZW5kVXBkYXRlLCB0aGlzKTtcbiAgICB9LFxuXG4gICAgLy8gQmluZCB0aGlzIHRvIHRoZSBnaXZlbiBjb250ZXh0IG9iamVjdFxuICAgIGJvdW5kOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMudHdvV2F5T2JzZXJ2ZXIuYmluZCh0aGlzLmVsZW1lbnQpO1xuICAgIH0sXG5cbiAgICB1bmJvdW5kOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMudHdvV2F5T2JzZXJ2ZXIudW5iaW5kKCk7XG4gICAgfSxcblxuICAgIHNlbmRVcGRhdGU6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBpZiAoIXRoaXMuc2tpcFNlbmQpIHtcbiAgICAgICAgdGhpcy5vYnNlcnZlci5zZXQodmFsdWUpO1xuICAgICAgICB0aGlzLnNraXBTZW5kID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5mcmFnbWVudHMuYWZ0ZXJTeW5jKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHRoaXMuc2tpcFNlbmQgPSBmYWxzZTtcbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgdXBkYXRlZDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGlmICghdGhpcy5za2lwU2VuZCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuZWxlbWVudFtzcGVjaWZpY1Byb3BlcnR5TmFtZSB8fCB0aGlzLmNhbWVsQ2FzZV0gPSB2YWx1ZTtcbiAgICAgICAgdGhpcy5za2lwU2VuZCA9IHRydWU7XG4gICAgICAgIHRoaXMuZnJhZ21lbnRzLmFmdGVyU3luYyhmdW5jdGlvbigpIHtcbiAgICAgICAgICB0aGlzLnNraXBTZW5kID0gZmFsc2U7XG4gICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICB9XG4gICAgfVxuICB9O1xufTtcbiIsIi8qKlxuICogQSBiaW5kZXIgdGhhdCBzZXRzIHRoZSBwcm9wZXJ0eSBvZiBhbiBlbGVtZW50IHRvIHRoZSB2YWx1ZSBvZiB0aGUgZXhwcmVzc2lvbi5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzcGVjaWZpY1Byb3BlcnR5TmFtZSkge1xuICByZXR1cm4ge1xuICAgIHVwZGF0ZWQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICB0aGlzLmVsZW1lbnRbc3BlY2lmaWNQcm9wZXJ0eU5hbWUgfHwgdGhpcy5jYW1lbENhc2VdID0gdmFsdWU7XG4gICAgfVxuICB9O1xufTtcbiIsIi8qKlxuICogQSBiaW5kZXIgdGhhdCBzZXRzIGEgcmVmZXJlbmNlIHRvIHRoZSBlbGVtZW50IHdoZW4gaXQgaXMgYm91bmQuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4ge1xuICAgIGJvdW5kOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuY29udGV4dFt0aGlzLm1hdGNoIHx8IHRoaXMuZXhwcmVzc2lvbl0gPSB0aGlzLmVsZW1lbnQ7XG4gICAgfSxcblxuICAgIHVuYm91bmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5jb250ZXh0W3RoaXMubWF0Y2ggfHwgdGhpcy5leHByZXNzaW9uXSA9IG51bGw7XG4gICAgfVxuICB9O1xufTtcbiIsInZhciBkaWZmID0gcmVxdWlyZSgnZGlmZmVyZW5jZXMtanMnKTtcblxuLyoqXG4gKiBBIGJpbmRlciB0aGF0IGR1cGxpY2F0ZSBhbiBlbGVtZW50IGZvciBlYWNoIGl0ZW0gaW4gYW4gYXJyYXkuIFRoZSBleHByZXNzaW9uIG1heSBiZSBvZiB0aGUgZm9ybWF0IGBlcHhyYCBvclxuICogYGl0ZW1OYW1lIGluIGV4cHJgIHdoZXJlIGBpdGVtTmFtZWAgaXMgdGhlIG5hbWUgZWFjaCBpdGVtIGluc2lkZSB0aGUgYXJyYXkgd2lsbCBiZSByZWZlcmVuY2VkIGJ5IHdpdGhpbiBiaW5kaW5nc1xuICogaW5zaWRlIHRoZSBlbGVtZW50LlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4ge1xuICAgIGFuaW1hdGVkOiB0cnVlLFxuICAgIHByaW9yaXR5OiAxMDAsXG5cbiAgICBjb21waWxlZDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcGFyZW50ID0gdGhpcy5lbGVtZW50LnBhcmVudE5vZGU7XG4gICAgICB2YXIgcGxhY2Vob2xkZXIgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKHBsYWNlaG9sZGVyLCB0aGlzLmVsZW1lbnQpO1xuICAgICAgdGhpcy50ZW1wbGF0ZSA9IHRoaXMuZnJhZ21lbnRzLmNyZWF0ZVRlbXBsYXRlKHRoaXMuZWxlbWVudCk7XG4gICAgICB0aGlzLmVsZW1lbnQgPSBwbGFjZWhvbGRlcjtcblxuICAgICAgdmFyIHBhcnRzID0gdGhpcy5leHByZXNzaW9uLnNwbGl0KC9cXHMraW5cXHMrfFxccytvZlxccysvKTtcbiAgICAgIHRoaXMuZXhwcmVzc2lvbiA9IHBhcnRzLnBvcCgpO1xuICAgICAgdmFyIGtleSA9IHBhcnRzLnBvcCgpO1xuICAgICAgaWYgKGtleSkge1xuICAgICAgICBwYXJ0cyA9IGtleS5zcGxpdCgvXFxzKixcXHMqLyk7XG4gICAgICAgIHRoaXMudmFsdWVOYW1lID0gcGFydHMucG9wKCk7XG4gICAgICAgIHRoaXMua2V5TmFtZSA9IHBhcnRzLnBvcCgpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBjcmVhdGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMudmlld3MgPSBbXTtcbiAgICAgIHRoaXMub2JzZXJ2ZXIuZ2V0Q2hhbmdlUmVjb3JkcyA9IHRydWU7XG4gICAgfSxcblxuICAgIHJlbW92ZVZpZXc6IGZ1bmN0aW9uKHZpZXcpIHtcbiAgICAgIHZpZXcuZGlzcG9zZSgpO1xuICAgICAgdmlldy5fcmVwZWF0SXRlbV8gPSBudWxsO1xuICAgIH0sXG5cbiAgICB1cGRhdGVkOiBmdW5jdGlvbih2YWx1ZSwgb2xkVmFsdWUsIGNoYW5nZXMpIHtcbiAgICAgIGlmICghY2hhbmdlcyB8fCAhdGhpcy5jb250ZXh0KSB7XG4gICAgICAgIHRoaXMucG9wdWxhdGUodmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHRoaXMuYW5pbWF0ZSkge1xuICAgICAgICAgIHRoaXMudXBkYXRlQ2hhbmdlc0FuaW1hdGVkKHZhbHVlLCBjaGFuZ2VzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnVwZGF0ZUNoYW5nZXModmFsdWUsIGNoYW5nZXMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcblxuICAgIC8vIE1ldGhvZCBmb3IgY3JlYXRpbmcgYW5kIHNldHRpbmcgdXAgbmV3IHZpZXdzIGZvciBvdXIgbGlzdFxuICAgIGNyZWF0ZVZpZXc6IGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcbiAgICAgIHZhciB2aWV3ID0gdGhpcy50ZW1wbGF0ZS5jcmVhdGVWaWV3KCk7XG4gICAgICB2YXIgY29udGV4dCA9IHZhbHVlO1xuICAgICAgaWYgKHRoaXMudmFsdWVOYW1lKSB7XG4gICAgICAgIGNvbnRleHQgPSBPYmplY3QuY3JlYXRlKHRoaXMuY29udGV4dCk7XG4gICAgICAgIGlmICh0aGlzLmtleU5hbWUpIGNvbnRleHRbdGhpcy5rZXlOYW1lXSA9IGtleTtcbiAgICAgICAgY29udGV4dFt0aGlzLnZhbHVlTmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgY29udGV4dC5fb3JpZ0NvbnRleHRfID0gdGhpcy5jb250ZXh0Lmhhc093blByb3BlcnR5KCdfb3JpZ0NvbnRleHRfJylcbiAgICAgICAgICA/IHRoaXMuY29udGV4dC5fb3JpZ0NvbnRleHRfXG4gICAgICAgICAgOiB0aGlzLmNvbnRleHQ7XG4gICAgICB9XG4gICAgICB2aWV3LmJpbmQoY29udGV4dCk7XG4gICAgICB2aWV3Ll9yZXBlYXRJdGVtXyA9IHZhbHVlO1xuICAgICAgcmV0dXJuIHZpZXc7XG4gICAgfSxcblxuICAgIHBvcHVsYXRlOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgaWYgKHRoaXMuYW5pbWF0aW5nKSB7XG4gICAgICAgIHRoaXMudmFsdWVXaGlsZUFuaW1hdGluZyA9IHZhbHVlO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLnZpZXdzLmxlbmd0aCkge1xuICAgICAgICB0aGlzLnZpZXdzLmZvckVhY2godGhpcy5yZW1vdmVWaWV3KTtcbiAgICAgICAgdGhpcy52aWV3cy5sZW5ndGggPSAwO1xuICAgICAgfVxuXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUubGVuZ3RoKSB7XG4gICAgICAgIHZhciBmcmFnID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuXG4gICAgICAgIHZhbHVlLmZvckVhY2goZnVuY3Rpb24oaXRlbSwgaW5kZXgpIHtcbiAgICAgICAgICB2YXIgdmlldyA9IHRoaXMuY3JlYXRlVmlldyhpbmRleCwgaXRlbSk7XG4gICAgICAgICAgdGhpcy52aWV3cy5wdXNoKHZpZXcpO1xuICAgICAgICAgIGZyYWcuYXBwZW5kQ2hpbGQodmlldyk7XG4gICAgICAgIH0sIHRoaXMpO1xuXG4gICAgICAgIHRoaXMuZWxlbWVudC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShmcmFnLCB0aGlzLmVsZW1lbnQubmV4dFNpYmxpbmcpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUaGlzIHVuLWFuaW1hdGVkIHZlcnNpb24gcmVtb3ZlcyBhbGwgcmVtb3ZlZCB2aWV3cyBmaXJzdCBzbyB0aGV5IGNhbiBiZSByZXR1cm5lZCB0byB0aGUgcG9vbCBhbmQgdGhlbiBhZGRzIG5ld1xuICAgICAqIHZpZXdzIGJhY2sgaW4uIFRoaXMgaXMgdGhlIG1vc3Qgb3B0aW1hbCBtZXRob2Qgd2hlbiBub3QgYW5pbWF0aW5nLlxuICAgICAqL1xuICAgIHVwZGF0ZUNoYW5nZXM6IGZ1bmN0aW9uKHZhbHVlLCBjaGFuZ2VzKSB7XG4gICAgICAvLyBSZW1vdmUgZXZlcnl0aGluZyBmaXJzdCwgdGhlbiBhZGQgYWdhaW4sIGFsbG93aW5nIGZvciBlbGVtZW50IHJldXNlIGZyb20gdGhlIHBvb2xcbiAgICAgIHZhciBhZGRlZENvdW50ID0gMDtcblxuICAgICAgY2hhbmdlcy5mb3JFYWNoKGZ1bmN0aW9uKHNwbGljZSkge1xuICAgICAgICBhZGRlZENvdW50ICs9IHNwbGljZS5hZGRlZENvdW50O1xuICAgICAgICBpZiAoIXNwbGljZS5yZW1vdmVkLmxlbmd0aCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcmVtb3ZlZCA9IHRoaXMudmlld3Muc3BsaWNlKHNwbGljZS5pbmRleCAtIGFkZGVkQ291bnQsIHNwbGljZS5yZW1vdmVkLmxlbmd0aCk7XG4gICAgICAgIHJlbW92ZWQuZm9yRWFjaCh0aGlzLnJlbW92ZVZpZXcpO1xuICAgICAgfSwgdGhpcyk7XG5cbiAgICAgIC8vIEFkZCB0aGUgbmV3L21vdmVkIHZpZXdzXG4gICAgICBjaGFuZ2VzLmZvckVhY2goZnVuY3Rpb24oc3BsaWNlKSB7XG4gICAgICAgIGlmICghc3BsaWNlLmFkZGVkQ291bnQpIHJldHVybjtcbiAgICAgICAgdmFyIGFkZGVkVmlld3MgPSBbXTtcbiAgICAgICAgdmFyIGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgICAgICB2YXIgaW5kZXggPSBzcGxpY2UuaW5kZXg7XG4gICAgICAgIHZhciBlbmRJbmRleCA9IGluZGV4ICsgc3BsaWNlLmFkZGVkQ291bnQ7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IGluZGV4OyBpIDwgZW5kSW5kZXg7IGkrKykge1xuICAgICAgICAgIHZhciBpdGVtID0gdmFsdWVbaV07XG4gICAgICAgICAgdmFyIHZpZXcgPSB0aGlzLmNyZWF0ZVZpZXcoaSwgaXRlbSk7XG4gICAgICAgICAgYWRkZWRWaWV3cy5wdXNoKHZpZXcpO1xuICAgICAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKHZpZXcpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudmlld3Muc3BsaWNlLmFwcGx5KHRoaXMudmlld3MsIFsgaW5kZXgsIDAgXS5jb25jYXQoYWRkZWRWaWV3cykpO1xuICAgICAgICB2YXIgcHJldmlvdXNWaWV3ID0gdGhpcy52aWV3c1tpbmRleCAtIDFdO1xuICAgICAgICB2YXIgbmV4dFNpYmxpbmcgPSBwcmV2aW91c1ZpZXcgPyBwcmV2aW91c1ZpZXcubGFzdFZpZXdOb2RlLm5leHRTaWJsaW5nIDogdGhpcy5lbGVtZW50Lm5leHRTaWJsaW5nO1xuICAgICAgICB0aGlzLmVsZW1lbnQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoZnJhZ21lbnQsIG5leHRTaWJsaW5nKTtcbiAgICAgIH0sIHRoaXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUaGlzIGFuaW1hdGVkIHZlcnNpb24gbXVzdCBhbmltYXRlIHJlbW92ZWQgbm9kZXMgb3V0IHdoaWxlIGFkZGVkIG5vZGVzIGFyZSBhbmltYXRpbmcgaW4gbWFraW5nIGl0IGxlc3Mgb3B0aW1hbFxuICAgICAqIChidXQgY29vbCBsb29raW5nKS4gSXQgYWxzbyBoYW5kbGVzIFwibW92ZVwiIGFuaW1hdGlvbnMgZm9yIG5vZGVzIHdoaWNoIGFyZSBtb3ZpbmcgcGxhY2Ugd2l0aGluIHRoZSBsaXN0LlxuICAgICAqL1xuICAgIHVwZGF0ZUNoYW5nZXNBbmltYXRlZDogZnVuY3Rpb24odmFsdWUsIGNoYW5nZXMpIHtcbiAgICAgIGlmICh0aGlzLmFuaW1hdGluZykge1xuICAgICAgICB0aGlzLnZhbHVlV2hpbGVBbmltYXRpbmcgPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdmFyIGFuaW1hdGluZ1ZhbHVlID0gdmFsdWUuc2xpY2UoKTtcbiAgICAgIHZhciBhbGxBZGRlZCA9IFtdO1xuICAgICAgdmFyIGFsbFJlbW92ZWQgPSBbXTtcbiAgICAgIHRoaXMuYW5pbWF0aW5nID0gdHJ1ZTtcblxuICAgICAgLy8gUnVuIHVwZGF0ZXMgd2hpY2ggb2NjdXJlZCB3aGlsZSB0aGlzIHdhcyBhbmltYXRpbmcuXG4gICAgICBmdW5jdGlvbiB3aGVuRG9uZSgpIHtcbiAgICAgICAgLy8gVGhlIGxhc3QgYW5pbWF0aW9uIGZpbmlzaGVkIHdpbGwgcnVuIHRoaXNcbiAgICAgICAgaWYgKC0td2hlbkRvbmUuY291bnQgIT09IDApIHJldHVybjtcblxuICAgICAgICBhbGxSZW1vdmVkLmZvckVhY2godGhpcy5yZW1vdmVWaWV3KTtcblxuICAgICAgICB0aGlzLmFuaW1hdGluZyA9IGZhbHNlO1xuICAgICAgICBpZiAodGhpcy52YWx1ZVdoaWxlQW5pbWF0aW5nKSB7XG4gICAgICAgICAgdmFyIGNoYW5nZXMgPSBkaWZmLmFycmF5cyh0aGlzLnZhbHVlV2hpbGVBbmltYXRpbmcsIGFuaW1hdGluZ1ZhbHVlKTtcbiAgICAgICAgICB0aGlzLnVwZGF0ZUNoYW5nZXNBbmltYXRlZCh0aGlzLnZhbHVlV2hpbGVBbmltYXRpbmcsIGNoYW5nZXMpO1xuICAgICAgICAgIHRoaXMudmFsdWVXaGlsZUFuaW1hdGluZyA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHdoZW5Eb25lLmNvdW50ID0gMDtcblxuICAgICAgY2hhbmdlcy5mb3JFYWNoKGZ1bmN0aW9uKHNwbGljZSkge1xuICAgICAgICB2YXIgYWRkZWRWaWV3cyA9IFtdO1xuICAgICAgICB2YXIgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgICAgIHZhciBpbmRleCA9IHNwbGljZS5pbmRleDtcbiAgICAgICAgdmFyIGVuZEluZGV4ID0gaW5kZXggKyBzcGxpY2UuYWRkZWRDb3VudDtcbiAgICAgICAgdmFyIHJlbW92ZWRDb3VudCA9IHNwbGljZS5yZW1vdmVkLmxlbmd0aDtcblxuICAgICAgICBmb3IgKHZhciBpID0gaW5kZXg7IGkgPCBlbmRJbmRleDsgaSsrKSB7XG4gICAgICAgICAgdmFyIGl0ZW0gPSB2YWx1ZVtpXTtcbiAgICAgICAgICB2YXIgdmlldyA9IHRoaXMuY3JlYXRlVmlldyhpLCBpdGVtKTtcbiAgICAgICAgICBhZGRlZFZpZXdzLnB1c2godmlldyk7XG4gICAgICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQodmlldyk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcmVtb3ZlZFZpZXdzID0gdGhpcy52aWV3cy5zcGxpY2UuYXBwbHkodGhpcy52aWV3cywgWyBpbmRleCwgcmVtb3ZlZENvdW50IF0uY29uY2F0KGFkZGVkVmlld3MpKTtcbiAgICAgICAgdmFyIHByZXZpb3VzVmlldyA9IHRoaXMudmlld3NbaW5kZXggLSAxXTtcbiAgICAgICAgdmFyIG5leHRTaWJsaW5nID0gcHJldmlvdXNWaWV3ID8gcHJldmlvdXNWaWV3Lmxhc3RWaWV3Tm9kZS5uZXh0U2libGluZyA6IHRoaXMuZWxlbWVudC5uZXh0U2libGluZztcbiAgICAgICAgdGhpcy5lbGVtZW50LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGZyYWdtZW50LCBuZXh0U2libGluZyk7XG5cbiAgICAgICAgYWxsQWRkZWQgPSBhbGxBZGRlZC5jb25jYXQoYWRkZWRWaWV3cyk7XG4gICAgICAgIGFsbFJlbW92ZWQgPSBhbGxSZW1vdmVkLmNvbmNhdChyZW1vdmVkVmlld3MpO1xuICAgICAgfSwgdGhpcyk7XG5cblxuICAgICAgYWxsQWRkZWQuZm9yRWFjaChmdW5jdGlvbih2aWV3KSB7XG4gICAgICAgIHdoZW5Eb25lLmNvdW50Kys7XG4gICAgICAgIHRoaXMuYW5pbWF0ZUluKHZpZXcsIHdoZW5Eb25lKTtcbiAgICAgIH0sIHRoaXMpO1xuXG4gICAgICBhbGxSZW1vdmVkLmZvckVhY2goZnVuY3Rpb24odmlldykge1xuICAgICAgICB3aGVuRG9uZS5jb3VudCsrO1xuICAgICAgICB2aWV3LnVuYmluZCgpO1xuICAgICAgICB0aGlzLmFuaW1hdGVPdXQodmlldywgd2hlbkRvbmUpO1xuICAgICAgfSwgdGhpcyk7XG4gICAgfSxcblxuICAgIHVuYm91bmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy52aWV3cy5mb3JFYWNoKGZ1bmN0aW9uKHZpZXcpIHtcbiAgICAgICAgdmlldy51bmJpbmQoKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy52YWx1ZVdoaWxlQW5pbWF0aW5nID0gbnVsbDtcbiAgICAgIHRoaXMuYW5pbWF0aW5nID0gZmFsc2U7XG4gICAgfVxuICB9O1xufTtcbiIsIi8qKlxuICogU2hvd3MvaGlkZXMgYW4gZWxlbWVudCBjb25kaXRpb25hbGx5LiBgaWZgIHNob3VsZCBiZSB1c2VkIGluIG1vc3QgY2FzZXMgYXMgaXQgcmVtb3ZlcyB0aGUgZWxlbWVudCBjb21wbGV0ZWx5IGFuZCBpc1xuICogbW9yZSBlZmZlY2llbnQgc2luY2UgYmluZGluZ3Mgd2l0aGluIHRoZSBgaWZgIGFyZSBub3QgYWN0aXZlIHdoaWxlIGl0IGlzIGhpZGRlbi4gVXNlIGBzaG93YCBmb3Igd2hlbiB0aGUgZWxlbWVudFxuICogbXVzdCByZW1haW4gaW4tRE9NIG9yIGJpbmRpbmdzIHdpdGhpbiBpdCBtdXN0IGNvbnRpbnVlIHRvIGJlIHByb2Nlc3NlZCB3aGlsZSBpdCBpcyBoaWRkZW4uIFlvdSBzaG91bGQgZGVmYXVsdCB0b1xuICogdXNpbmcgYGlmYC5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpc0hpZGUpIHtcbiAgdmFyIGlzU2hvdyA9ICFpc0hpZGU7XG4gIHJldHVybiB7XG4gICAgYW5pbWF0ZWQ6IHRydWUsXG5cbiAgICB1cGRhdGVkOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgLy8gRm9yIHBlcmZvcm1hbmNlIHByb3ZpZGUgYW4gYWx0ZXJuYXRlIGNvZGUgcGF0aCBmb3IgYW5pbWF0aW9uXG4gICAgICBpZiAodGhpcy5hbmltYXRlICYmIHRoaXMuY29udGV4dCAmJiAhdGhpcy5maXJzdFVwZGF0ZSkge1xuICAgICAgICB0aGlzLnVwZGF0ZWRBbmltYXRlZCh2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnVwZGF0ZWRSZWd1bGFyKHZhbHVlKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuZmlyc3RVcGRhdGUgPSBmYWxzZTtcbiAgICB9LFxuXG4gICAgdXBkYXRlZFJlZ3VsYXI6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgdGhpcy5lbGVtZW50LnN0eWxlLmRpc3BsYXkgPSAnJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICB1cGRhdGVkQW5pbWF0ZWQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICB0aGlzLmxhc3RWYWx1ZSA9IHZhbHVlO1xuICAgICAgaWYgKHRoaXMuYW5pbWF0aW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdGhpcy5hbmltYXRpbmcgPSB0cnVlO1xuICAgICAgZnVuY3Rpb24gb25GaW5pc2goKSB7XG4gICAgICAgIHRoaXMuYW5pbWF0aW5nID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLmxhc3RWYWx1ZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICB0aGlzLnVwZGF0ZWRBbmltYXRlZCh0aGlzLmxhc3RWYWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gaWYgaXNTaG93IGlzIHRydXRoeSBhbmQgdmFsdWUgaXMgdHJ1dGh5XG4gICAgICBpZiAoISF2YWx1ZSA9PT0gISFpc1Nob3cpIHtcbiAgICAgICAgdGhpcy5lbGVtZW50LnN0eWxlLmRpc3BsYXkgPSAnJztcbiAgICAgICAgdGhpcy5hbmltYXRlSW4odGhpcy5lbGVtZW50LCBvbkZpbmlzaCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmFuaW1hdGVPdXQodGhpcy5lbGVtZW50LCBmdW5jdGlvbigpIHtcbiAgICAgICAgICB0aGlzLmVsZW1lbnQuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgICAgICBvbkZpbmlzaC5jYWxsKHRoaXMpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgYm91bmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5maXJzdFVwZGF0ZSA9IHRydWU7XG4gICAgfSxcblxuICAgIHVuYm91bmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5lbGVtZW50LnN0eWxlLmRpc3BsYXkgPSAnJztcbiAgICAgIHRoaXMubGFzdFZhbHVlID0gbnVsbDtcbiAgICAgIHRoaXMuYW5pbWF0aW5nID0gZmFsc2U7XG4gICAgfVxuICB9O1xufTtcbiIsInZhciB1bml0cyA9IHtcbiAgJyUnOiB0cnVlLFxuICAnZW0nOiB0cnVlLFxuICAncHgnOiB0cnVlLFxuICAncHQnOiB0cnVlXG59O1xuXG4vKipcbiAqIEEgYmluZGVyIHRoYXQgYWRkcyBzdHlsZXMgdG8gYW4gZWxlbWVudC5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzcGVjaWZpY1N0eWxlTmFtZSwgc3BlY2lmaWNVbml0KSB7XG4gIHJldHVybiB7XG4gICAgY29tcGlsZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHN0eWxlTmFtZSA9IHNwZWNpZmljU3R5bGVOYW1lIHx8IHRoaXMubWF0Y2g7XG4gICAgICB2YXIgdW5pdDtcblxuICAgICAgaWYgKHNwZWNpZmljVW5pdCkge1xuICAgICAgICB1bml0ID0gc3BlY2lmaWNVbml0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHBhcnRzID0gc3R5bGVOYW1lLnNwbGl0KC9bXmEtel0vaSk7XG4gICAgICAgIGlmICh1bml0cy5oYXNPd25Qcm9wZXJ0eShwYXJ0c1twYXJ0cy5sZW5ndGggLSAxXSkpIHtcbiAgICAgICAgICB1bml0ID0gcGFydHMucG9wKCk7XG4gICAgICAgICAgc3R5bGVOYW1lID0gcGFydHMuam9pbignLScpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMudW5pdCA9IHVuaXQgfHwgJyc7XG5cbiAgICAgIHRoaXMuc3R5bGVOYW1lID0gc3R5bGVOYW1lLnJlcGxhY2UoLy0rKFxcdykvZywgZnVuY3Rpb24oXywgY2hhcikge1xuICAgICAgICByZXR1cm4gY2hhci50b1VwcGVyQ2FzZSgpO1xuICAgICAgfSk7XG4gICAgfSxcblxuICAgIHVwZGF0ZWQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICB0aGlzLmVsZW1lbnQuc3R5bGVzW3RoaXMuc3R5bGVOYW1lXSA9ICh2YWx1ZSA9PSBudWxsKSA/ICcnIDogdmFsdWUgKyB0aGlzLnVuaXQ7XG4gICAgfVxuICB9O1xufTtcbiIsIi8qKlxuICogIyMgdGV4dFxuICogQSBiaW5kZXIgdGhhdCBkaXNwbGF5cyBlc2NhcGVkIHRleHQgaW5zaWRlIGFuIGVsZW1lbnQuIFRoaXMgY2FuIGJlIGRvbmUgd2l0aCBiaW5kaW5nIGRpcmVjdGx5IGluIHRleHQgbm9kZXMgYnV0XG4gKiB1c2luZyB0aGUgYXR0cmlidXRlIGJpbmRlciBwcmV2ZW50cyBhIGZsYXNoIG9mIHVuc3R5bGVkIGNvbnRlbnQgb24gdGhlIG1haW4gcGFnZS5cbiAqXG4gKiAqKkV4YW1wbGU6KipcbiAqIGBgYGh0bWxcbiAqIDxoMSB0ZXh0PVwie3twb3N0LnRpdGxlfX1cIj5VbnRpdGxlZDwvaDE+XG4gKiA8ZGl2IGh0bWw9XCJ7e3Bvc3QuYm9keSB8IG1hcmtkb3dufX1cIj48L2Rpdj5cbiAqIGBgYFxuICogKlJlc3VsdDoqXG4gKiBgYGBodG1sXG4gKiA8aDE+TGl0dGxlIFJlZDwvaDE+XG4gKiA8ZGl2PlxuICogICA8cD5MaXR0bGUgUmVkIFJpZGluZyBIb29kIGlzIGEgc3RvcnkgYWJvdXQgYSBsaXR0bGUgZ2lybC48L3A+XG4gKiAgIDxwPlxuICogICAgIE1vcmUgaW5mbyBjYW4gYmUgZm91bmQgb25cbiAqICAgICA8YSBocmVmPVwiaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9MaXR0bGVfUmVkX1JpZGluZ19Ib29kXCI+V2lraXBlZGlhPC9hPlxuICogICA8L3A+XG4gKiA8L2Rpdj5cbiAqIGBgYFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcbiAgICB0aGlzLmVsZW1lbnQudGV4dENvbnRlbnQgPSAodmFsdWUgPT0gbnVsbCkgPyAnJyA6IHZhbHVlO1xuICB9O1xufTtcbiIsInZhciBpbnB1dE1ldGhvZHMsIGRlZmF1bHRJbnB1dE1ldGhvZDtcblxuLyoqXG4gKiBBIGJpbmRlciB0aGF0IHNldHMgdGhlIHZhbHVlIG9mIGFuIEhUTUwgZm9ybSBlbGVtZW50LiBUaGlzIGJpbmRlciBhbHNvIHVwZGF0ZXMgdGhlIGRhdGEgYXMgaXQgaXMgY2hhbmdlZCBpblxuICogdGhlIGZvcm0gZWxlbWVudCwgcHJvdmlkaW5nIHR3byB3YXkgYmluZGluZy4gQ2FuIHVzZSBmb3IgXCJjaGVja2VkXCIgYXMgd2VsbC5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihldmVudHNBdHRyTmFtZSwgZmllbGRBdHRyTmFtZSkge1xuICByZXR1cm4ge1xuICAgIG9ubHlXaGVuQm91bmQ6IHRydWUsXG4gICAgZGVmYXVsdEV2ZW50czogWyAnY2hhbmdlJyBdLFxuXG4gICAgY29tcGlsZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIG5hbWUgPSB0aGlzLmVsZW1lbnQudGFnTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgdmFyIHR5cGUgPSB0aGlzLmVsZW1lbnQudHlwZTtcbiAgICAgIHRoaXMubWV0aG9kcyA9IGlucHV0TWV0aG9kc1t0eXBlXSB8fCBpbnB1dE1ldGhvZHNbbmFtZV07XG5cbiAgICAgIGlmICghdGhpcy5tZXRob2RzKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGV2ZW50c0F0dHJOYW1lICYmIHRoaXMuZWxlbWVudC5oYXNBdHRyaWJ1dGUoZXZlbnRzQXR0ck5hbWUpKSB7XG4gICAgICAgIHRoaXMuZXZlbnRzID0gdGhpcy5lbGVtZW50LmdldEF0dHJpYnV0ZShldmVudHNBdHRyTmFtZSkuc3BsaXQoJyAnKTtcbiAgICAgICAgdGhpcy5lbGVtZW50LnJlbW92ZUF0dHJpYnV0ZShldmVudHNBdHRyTmFtZSk7XG4gICAgICB9IGVsc2UgaWYgKG5hbWUgIT09ICdvcHRpb24nKSB7XG4gICAgICAgIHRoaXMuZXZlbnRzID0gdGhpcy5kZWZhdWx0RXZlbnRzO1xuICAgICAgfVxuXG4gICAgICBpZiAoZmllbGRBdHRyTmFtZSAmJiB0aGlzLmVsZW1lbnQuaGFzQXR0cmlidXRlKGZpZWxkQXR0ck5hbWUpKSB7XG4gICAgICAgIHRoaXMudmFsdWVGaWVsZCA9IHRoaXMuZWxlbWVudC5nZXRBdHRyaWJ1dGUoZmllbGRBdHRyTmFtZSk7XG4gICAgICAgIHRoaXMuZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUoZmllbGRBdHRyTmFtZSk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlID09PSAnb3B0aW9uJykge1xuICAgICAgICB0aGlzLnZhbHVlRmllbGQgPSB0aGlzLmVsZW1lbnQucGFyZW50Tm9kZS52YWx1ZUZpZWxkO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBjcmVhdGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICghdGhpcy5ldmVudHMpIHJldHVybjsgLy8gbm90aGluZyBmb3IgPG9wdGlvbj4gaGVyZVxuICAgICAgdmFyIGVsZW1lbnQgPSB0aGlzLmVsZW1lbnQ7XG4gICAgICB2YXIgb2JzZXJ2ZXIgPSB0aGlzLm9ic2VydmVyO1xuICAgICAgdmFyIGlucHV0ID0gdGhpcy5tZXRob2RzO1xuICAgICAgdmFyIHZhbHVlRmllbGQgPSB0aGlzLnZhbHVlRmllbGQ7XG5cbiAgICAgIC8vIFRoZSAyLXdheSBiaW5kaW5nIHBhcnQgaXMgc2V0dGluZyB2YWx1ZXMgb24gY2VydGFpbiBldmVudHNcbiAgICAgIGZ1bmN0aW9uIG9uQ2hhbmdlKCkge1xuICAgICAgICBpZiAoaW5wdXQuZ2V0LmNhbGwoZWxlbWVudCwgdmFsdWVGaWVsZCkgIT09IG9ic2VydmVyLm9sZFZhbHVlICYmICFlbGVtZW50LnJlYWRPbmx5KSB7XG4gICAgICAgICAgb2JzZXJ2ZXIuc2V0KGlucHV0LmdldC5jYWxsKGVsZW1lbnQsIHZhbHVlRmllbGQpKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoZWxlbWVudC50eXBlID09PSAndGV4dCcpIHtcbiAgICAgICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMTMpIG9uQ2hhbmdlKCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmV2ZW50cy5mb3JFYWNoKGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgb25DaGFuZ2UpO1xuICAgICAgfSk7XG4gICAgfSxcblxuICAgIHVwZGF0ZWQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBpZiAodGhpcy5tZXRob2RzLmdldC5jYWxsKHRoaXMuZWxlbWVudCwgdGhpcy52YWx1ZUZpZWxkKSAhPSB2YWx1ZSkge1xuICAgICAgICB0aGlzLm1ldGhvZHMuc2V0LmNhbGwodGhpcy5lbGVtZW50LCB2YWx1ZSwgdGhpcy52YWx1ZUZpZWxkKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG59O1xuXG5cbi8qKlxuICogSGFuZGxlIHRoZSBkaWZmZXJlbnQgZm9ybSB0eXBlc1xuICovXG5kZWZhdWx0SW5wdXRNZXRob2QgPSB7XG4gIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnZhbHVlOyB9LFxuICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IHRoaXMudmFsdWUgPSAodmFsdWUgPT0gbnVsbCkgPyAnJyA6IHZhbHVlOyB9XG59O1xuXG5cbmlucHV0TWV0aG9kcyA9IHtcbiAgY2hlY2tib3g6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5jaGVja2VkOyB9LFxuICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgdGhpcy5jaGVja2VkID0gISF2YWx1ZTsgfVxuICB9LFxuXG4gIGZpbGU6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5maWxlcyAmJiB0aGlzLmZpbGVzWzBdOyB9LFxuICAgIHNldDogZnVuY3Rpb24oKSB7fVxuICB9LFxuXG4gIHNlbGVjdDoge1xuICAgIGdldDogZnVuY3Rpb24odmFsdWVGaWVsZCkge1xuICAgICAgaWYgKHZhbHVlRmllbGQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub3B0aW9uc1t0aGlzLnNlbGVjdGVkSW5kZXhdLnZhbHVlT2JqZWN0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudmFsdWU7XG4gICAgICB9XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlLCB2YWx1ZUZpZWxkKSB7XG4gICAgICBpZiAodmFsdWUgJiYgdmFsdWVGaWVsZCkge1xuICAgICAgICB0aGlzLnZhbHVlT2JqZWN0ID0gdmFsdWU7XG4gICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZVt2YWx1ZUZpZWxkXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMudmFsdWUgPSAodmFsdWUgPT0gbnVsbCkgPyAnJyA6IHZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBvcHRpb246IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKHZhbHVlRmllbGQpIHtcbiAgICAgIHJldHVybiB2YWx1ZUZpZWxkID8gdGhpcy52YWx1ZU9iamVjdFt2YWx1ZUZpZWxkXSA6IHRoaXMudmFsdWU7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlLCB2YWx1ZUZpZWxkKSB7XG4gICAgICBpZiAodmFsdWUgJiYgdmFsdWVGaWVsZCkge1xuICAgICAgICB0aGlzLnZhbHVlT2JqZWN0ID0gdmFsdWU7XG4gICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZVt2YWx1ZUZpZWxkXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMudmFsdWUgPSAodmFsdWUgPT0gbnVsbCkgPyAnJyA6IHZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBpbnB1dDogZGVmYXVsdElucHV0TWV0aG9kLFxuXG4gIHRleHRhcmVhOiBkZWZhdWx0SW5wdXRNZXRob2Rcbn07XG5cbiIsIi8qKlxuICogVGFrZXMgdGhlIGlucHV0IFVSTCBhbmQgYWRkcyAob3IgcmVwbGFjZXMpIHRoZSBmaWVsZCBpbiB0aGUgcXVlcnkuXG4gKiBFLmcuICdodHRwOi8vZXhhbXBsZS5jb20/dXNlcj1kZWZhdWx0JnJlc291cmNlPWZvbycgfCBhZGRRdWVyeSgndXNlcicsIHVzZXJuYW1lKVxuICogV2lsbCByZXBsYWNlIHVzZXI9ZGVmYXVsdCB3aXRoIHVzZXI9e3VzZXJuYW1lfSB3aGVyZSB7dXNlcm5hbWV9IGlzIHRoZSB2YWx1ZSBvZiB1c2VybmFtZS5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih2YWx1ZSwgcXVlcnlGaWVsZCwgcXVlcnlWYWx1ZSkge1xuICB2YXIgdXJsID0gdmFsdWUgfHwgbG9jYXRpb24uaHJlZjtcbiAgdmFyIHBhcnRzID0gdXJsLnNwbGl0KCc/Jyk7XG4gIHVybCA9IHBhcnRzWzBdO1xuICB2YXIgcXVlcnkgPSBwYXJ0c1sxXTtcbiAgdmFyIGFkZGVkUXVlcnkgPSAnJztcbiAgaWYgKHF1ZXJ5VmFsdWUgIT0gbnVsbCkge1xuICAgIGFkZGVkUXVlcnkgPSBxdWVyeUZpZWxkICsgJz0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHF1ZXJ5VmFsdWUpO1xuICB9XG5cbiAgaWYgKHF1ZXJ5KSB7XG4gICAgdmFyIGV4cHIgPSBuZXcgUmVnRXhwKCdcXFxcYicgKyBxdWVyeUZpZWxkICsgJz1bXiZdKicpO1xuICAgIGlmIChleHByLnRlc3QocXVlcnkpKSB7XG4gICAgICBxdWVyeSA9IHF1ZXJ5LnJlcGxhY2UoZXhwciwgYWRkZWRRdWVyeSk7XG4gICAgfSBlbHNlIGlmIChhZGRlZFF1ZXJ5KSB7XG4gICAgICBxdWVyeSArPSAnJicgKyBhZGRlZFF1ZXJ5O1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBxdWVyeSA9IGFkZGVkUXVlcnk7XG4gIH1cbiAgaWYgKHF1ZXJ5KSB7XG4gICAgdXJsICs9ICc/JyArIHF1ZXJ5O1xuICB9XG4gIHJldHVybiB1cmw7XG59O1xuIiwidmFyIHVybEV4cCA9IC8oXnxcXHN8XFwoKSgoPzpodHRwcz98ZnRwKTpcXC9cXC9bXFwtQS1aMC05K1xcdTAwMjZAI1xcLyU/PSgpfl98ITosLjtdKltcXC1BLVowLTkrXFx1MDAyNkAjXFwvJT1+KF98XSkvZ2k7XG52YXIgd3d3RXhwID0gLyhefFteXFwvXSkod3d3XFwuW1xcU10rXFwuXFx3ezIsfShcXGJ8JCkpL2dpbTtcbi8qKlxuICogQWRkcyBhdXRvbWF0aWMgbGlua3MgdG8gZXNjYXBlZCBjb250ZW50IChiZSBzdXJlIHRvIGVzY2FwZSB1c2VyIGNvbnRlbnQpLiBDYW4gYmUgdXNlZCBvbiBleGlzdGluZyBIVE1MIGNvbnRlbnQgYXMgaXRcbiAqIHdpbGwgc2tpcCBVUkxzIHdpdGhpbiBIVE1MIHRhZ3MuIFBhc3NpbmcgYSB2YWx1ZSBpbiB0aGUgc2Vjb25kIHBhcmFtZXRlciB3aWxsIHNldCB0aGUgdGFyZ2V0IHRvIHRoYXQgdmFsdWUgb3JcbiAqIGBfYmxhbmtgIGlmIHRoZSB2YWx1ZSBpcyBgdHJ1ZWAuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odmFsdWUsIHRhcmdldCkge1xuICB2YXIgdGFyZ2V0U3RyaW5nID0gJyc7XG4gIGlmICh0eXBlb2YgdGFyZ2V0ID09PSAnc3RyaW5nJykge1xuICAgIHRhcmdldFN0cmluZyA9ICcgdGFyZ2V0PVwiJyArIHRhcmdldCArICdcIic7XG4gIH0gZWxzZSBpZiAodGFyZ2V0KSB7XG4gICAgdGFyZ2V0U3RyaW5nID0gJyB0YXJnZXQ9XCJfYmxhbmtcIic7XG4gIH1cblxuICByZXR1cm4gKCcnICsgdmFsdWUpLnJlcGxhY2UoLzxbXj5dKz58W148XSsvZywgZnVuY3Rpb24obWF0Y2gpIHtcbiAgICBpZiAobWF0Y2guY2hhckF0KDApID09PSAnPCcpIHtcbiAgICAgIHJldHVybiBtYXRjaDtcbiAgICB9XG4gICAgdmFyIHJlcGxhY2VkVGV4dCA9IG1hdGNoLnJlcGxhY2UodXJsRXhwLCAnJDE8YSBocmVmPVwiJDJcIicgKyB0YXJnZXQgKyAnPiQyPC9hPicpO1xuICAgIHJldHVybiByZXBsYWNlZFRleHQucmVwbGFjZSh3d3dFeHAsICckMTxhIGhyZWY9XCJodHRwOi8vJDJcIicgKyB0YXJnZXQgKyAnPiQyPC9hPicpO1xuICB9KTtcbn07XG4iLCIvKipcbiAqIEZvcm1hdHMgdGhlIHZhbHVlIGludG8gYSBib29sZWFuLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSAmJiB2YWx1ZSAhPT0gJzAnICYmIHZhbHVlICE9PSAnZmFsc2UnO1xufTtcbiIsInZhciBlc2NhcGVIVE1MID0gcmVxdWlyZSgnLi9lc2NhcGUnKTtcblxuLyoqXG4gKiBIVE1MIGVzY2FwZXMgY29udGVudCBhZGRpbmcgPGJyPiB0YWdzIGluIHBsYWNlIG9mIG5ld2xpbmVzIGNoYXJhY3RlcnMuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odmFsdWUsIHNldHRlcikge1xuICBpZiAoc2V0dGVyKSB7XG4gICAgcmV0dXJuIGVzY2FwZUhUTUwodmFsdWUsIHNldHRlcik7XG4gIH0gZWxzZSB7XG4gICAgdmFyIGxpbmVzID0gKHZhbHVlIHx8ICcnKS5zcGxpdCgvXFxyP1xcbi8pO1xuICAgIHJldHVybiBsaW5lcy5tYXAoZXNjYXBlSFRNTCkuam9pbignPGJyPlxcbicpO1xuICB9XG59O1xuIiwiLyoqXG4gKiBBZGRzIGEgZm9ybWF0dGVyIHRvIGZvcm1hdCBkYXRlcyBhbmQgc3RyaW5ncyBzaW1wbGlzdGljYWxseVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGlmICghdmFsdWUpIHtcbiAgICByZXR1cm4gJyc7XG4gIH1cblxuICBpZiAoISh2YWx1ZSBpbnN0YW5jZW9mIERhdGUpKSB7XG4gICAgdmFsdWUgPSBuZXcgRGF0ZSh2YWx1ZSk7XG4gIH1cblxuICBpZiAoaXNOYU4odmFsdWUuZ2V0VGltZSgpKSkge1xuICAgIHJldHVybiAnJztcbiAgfVxuXG4gIHJldHVybiB2YWx1ZS50b0xvY2FsZVN0cmluZygpO1xufTtcbiIsIi8qKlxuICogQWRkcyBhIGZvcm1hdHRlciB0byBmb3JtYXQgZGF0ZXMgYW5kIHN0cmluZ3Mgc2ltcGxpc3RpY2FsbHlcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih2YWx1ZSkge1xuICBpZiAoIXZhbHVlKSB7XG4gICAgcmV0dXJuICcnO1xuICB9XG5cbiAgaWYgKCEodmFsdWUgaW5zdGFuY2VvZiBEYXRlKSkge1xuICAgIHZhbHVlID0gbmV3IERhdGUodmFsdWUpO1xuICB9XG5cbiAgaWYgKGlzTmFOKHZhbHVlLmdldFRpbWUoKSkpIHtcbiAgICByZXR1cm4gJyc7XG4gIH1cblxuICByZXR1cm4gdmFsdWUudG9Mb2NhbGVEYXRlU3RyaW5nKCk7XG59O1xuIiwidmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4vKipcbiAqIEhUTUwgZXNjYXBlcyBjb250ZW50LiBGb3IgdXNlIHdpdGggb3RoZXIgSFRNTC1hZGRpbmcgZm9ybWF0dGVycyBzdWNoIGFzIGF1dG9saW5rLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICh2YWx1ZSwgc2V0dGVyKSB7XG4gIGlmIChzZXR0ZXIpIHtcbiAgICBkaXYuaW5uZXJIVE1MID0gdmFsdWU7XG4gICAgcmV0dXJuIGRpdi50ZXh0Q29udGVudDtcbiAgfSBlbHNlIHtcbiAgICBkaXYudGV4dENvbnRlbnQgPSB2YWx1ZSB8fCAnJztcbiAgICByZXR1cm4gZGl2LmlubmVySFRNTDtcbiAgfVxufTtcbiIsIi8qKlxuICogRmlsdGVycyBhbiBhcnJheSBieSB0aGUgZ2l2ZW4gZmlsdGVyIGZ1bmN0aW9uKHMpLCBtYXkgcHJvdmlkZSBhIGZ1bmN0aW9uIG9yIGFuIGFycmF5IG9yIGFuIG9iamVjdCB3aXRoIGZpbHRlcmluZ1xuICogZnVuY3Rpb25zLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHZhbHVlLCBmaWx0ZXJGdW5jKSB7XG4gIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gW107XG4gIH0gZWxzZSBpZiAoIWZpbHRlckZ1bmMpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICBpZiAodHlwZW9mIGZpbHRlckZ1bmMgPT09ICdmdW5jdGlvbicpIHtcbiAgICB2YWx1ZSA9IHZhbHVlLmZpbHRlcihmaWx0ZXJGdW5jLCB0aGlzKTtcbiAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGZpbHRlckZ1bmMpKSB7XG4gICAgZmlsdGVyRnVuYy5mb3JFYWNoKGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICAgIHZhbHVlID0gdmFsdWUuZmlsdGVyKGZ1bmMsIHRoaXMpO1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBmaWx0ZXJGdW5jID09PSAnb2JqZWN0Jykge1xuICAgIE9iamVjdC5rZXlzKGZpbHRlckZ1bmMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICB2YXIgZnVuYyA9IGZpbHRlckZ1bmNba2V5XTtcbiAgICAgIGlmICh0eXBlb2YgZnVuYyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB2YWx1ZSA9IHZhbHVlLmZpbHRlcihmdW5jLCB0aGlzKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59O1xuIiwiLyoqXG4gKiBGb3JtYXRzIHRoZSB2YWx1ZSBpbnRvIGEgZmxvYXQgb3IgbnVsbC5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih2YWx1ZSkge1xuICB2YWx1ZSA9IHBhcnNlRmxvYXQodmFsdWUpO1xuICByZXR1cm4gaXNOYU4odmFsdWUpID8gbnVsbCA6IHZhbHVlO1xufTtcbiIsIi8qKlxuICogRm9ybWF0cyB0aGUgdmFsdWUgc29tZXRoaW5nIHJldHVybmVkIGJ5IGEgZm9ybWF0dGluZyBmdW5jdGlvbiBwYXNzZWQuIFVzZSBmb3IgY3VzdG9tIG9yIG9uZS1vZmYgZm9ybWF0cy5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih2YWx1ZSwgZm9ybWF0dGVyLCBpc1NldHRlcikge1xuICByZXR1cm4gZm9ybWF0dGVyKHZhbHVlLCBpc1NldHRlcik7XG59O1xuIiwiLyoqXG4gKiBBZGRzIGFsbCBidWlsdC1pbiBmb3JtYXR0ZXJzIHdpdGggZGVmYXVsdCBuYW1lc1xuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGZyYWdtZW50cykge1xuICBpZiAoIWZyYWdtZW50cyB8fCB0eXBlb2YgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignZm9ybWF0dGVycyByZXF1aXJlcyBhbiBpbnN0YW5jZSBvZiBmcmFnbWVudHMgdG8gcmVnaXN0ZXIgd2l0aCcpO1xuICB9XG5cbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCdhZGRRdWVyeScsIHJlcXVpcmUoJy4vYWRkLXF1ZXJ5JykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ2F1dG9saW5rJywgcmVxdWlyZSgnLi9hdXRvbGluaycpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCdib29sJywgcmVxdWlyZSgnLi9ib29sJykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ2JyJywgcmVxdWlyZSgnLi9icicpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCdkYXRlVGltZScsIHJlcXVpcmUoJy4vZGF0ZS10aW1lJykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ2RhdGUnLCByZXF1aXJlKCcuL2RhdGUnKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcignZXNjYXBlJywgcmVxdWlyZSgnLi9lc2NhcGUnKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcignZmlsdGVyJywgcmVxdWlyZSgnLi9maWx0ZXInKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcignZmxvYXQnLCByZXF1aXJlKCcuL2Zsb2F0JykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ2Zvcm1hdCcsIHJlcXVpcmUoJy4vZm9ybWF0JykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ2ludCcsIHJlcXVpcmUoJy4vaW50JykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ2pzb24nLCByZXF1aXJlKCcuL2pzb24nKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcignbGltaXQnLCByZXF1aXJlKCcuL2xpbWl0JykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ2xvZycsIHJlcXVpcmUoJy4vbG9nJykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ2xvd2VyJywgcmVxdWlyZSgnLi9sb3dlcicpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCdtYXAnLCByZXF1aXJlKCcuL21hcCcpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCduZXdsaW5lJywgcmVxdWlyZSgnLi9uZXdsaW5lJykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ3AnLCByZXF1aXJlKCcuL3AnKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcigncmVkdWNlJywgcmVxdWlyZSgnLi9yZWR1Y2UnKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcignc2xpY2UnLCByZXF1aXJlKCcuL3NsaWNlJykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJGb3JtYXR0ZXIoJ3NvcnQnLCByZXF1aXJlKCcuL3NvcnQnKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckZvcm1hdHRlcigndGltZScsIHJlcXVpcmUoJy4vdGltZScpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyRm9ybWF0dGVyKCd1cHBlcicsIHJlcXVpcmUoJy4vdXBwZXInKSk7XG59O1xuIiwiLyoqXG4gKiBGb3JtYXRzIHRoZSB2YWx1ZSBpbnRvIGFuIGludGVnZXIgb3IgbnVsbC5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih2YWx1ZSkge1xuICB2YWx1ZSA9IHBhcnNlSW50KHZhbHVlKTtcbiAgcmV0dXJuIGlzTmFOKHZhbHVlKSA/IG51bGwgOiB2YWx1ZTtcbn07XG4iLCIvKipcbiAqIEZvcm1hdHMgdGhlIHZhbHVlIGludG8gSlNPTi5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih2YWx1ZSwgaXNTZXR0ZXIpIHtcbiAgaWYgKGlzU2V0dGVyKSB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBKU09OLnBhcnNlKHZhbHVlKTtcbiAgICB9IGNhdGNoKGVycikge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodmFsdWUpO1xuICAgIH0gY2F0Y2goZXJyKSB7XG4gICAgICByZXR1cm4gZXJyLnRvU3RyaW5nKCk7XG4gICAgfVxuICB9XG59O1xuIiwiLyoqXG4gKiBBZGRzIGEgZm9ybWF0dGVyIHRvIGxpbWl0IHRoZSBsZW5ndGggb2YgYW4gYXJyYXkgb3Igc3RyaW5nXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odmFsdWUsIGxpbWl0KSB7XG4gIGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUuc2xpY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICBpZiAobGltaXQgPCAwKSB7XG4gICAgICByZXR1cm4gdmFsdWUuc2xpY2UobGltaXQpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZS5zbGljZSgwLCBsaW1pdCk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxufTtcbiIsIi8qKlxuICogQWRkcyBhIGZvcm1hdHRlciB0byBsb2cgdGhlIHZhbHVlIG9mIHRoZSBleHByZXNzaW9uLCB1c2VmdWwgZm9yIGRlYnVnZ2luZ1xuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHZhbHVlLCBwcmVmaXgpIHtcbiAgaWYgKHByZWZpeCA9PSBudWxsKSBwcmVmaXggPSAnTG9nOic7XG4gIC8qZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuICBjb25zb2xlLmxvZygnJWMnICsgcHJlZml4LCAnY29sb3I6Ymx1ZTtmb250LXdlaWdodDpib2xkJywgdmFsdWUpO1xuICAvKmVzbGludC1lbmFibGUgKi9cbiAgcmV0dXJuIHZhbHVlO1xufTtcbiIsIi8qKlxuICogRm9ybWF0cyB0aGUgdmFsdWUgaW50byBsb3dlciBjYXNlLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnID8gdmFsdWUudG9Mb3dlckNhc2UoKSA6IHZhbHVlO1xufTtcbiIsIi8qKlxuICogQWRkcyBhIGZvcm1hdHRlciB0byBtYXAgYW4gYXJyYXkgb3IgdmFsdWUgYnkgdGhlIGdpdmVuIG1hcHBpbmcgZnVuY3Rpb25cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih2YWx1ZSwgbWFwRnVuYykge1xuICBpZiAodmFsdWUgPT0gbnVsbCB8fCB0eXBlb2YgbWFwRnVuYyAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gdmFsdWUubWFwKG1hcEZ1bmMsIHRoaXMpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBtYXBGdW5jLmNhbGwodGhpcywgdmFsdWUpO1xuICB9XG59O1xuIiwidmFyIGVzY2FwZUhUTUwgPSByZXF1aXJlKCcuL2VzY2FwZScpO1xuXG4vKipcbiAqIEhUTUwgZXNjYXBlcyBjb250ZW50IGFkZGluZyA8cD4gdGFncyBhdCBkb3VibGUgbmV3bGluZXMgYW5kIDxicj4gdGFncyBpbiBwbGFjZSBvZiBzaW5nbGUgbmV3bGluZSBjaGFyYWN0ZXJzLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHZhbHVlLCBzZXR0ZXIpIHtcbiAgaWYgKHNldHRlcikge1xuICAgIHJldHVybiBlc2NhcGVIVE1MKHZhbHVlLCBzZXR0ZXIpO1xuICB9IGVsc2Uge1xuICAgIHZhciBwYXJhZ3JhcGhzID0gKHZhbHVlIHx8ICcnKS5zcGxpdCgvXFxyP1xcblxccypcXHI/XFxuLyk7XG4gICAgdmFyIGVzY2FwZWQgPSBwYXJhZ3JhcGhzLm1hcChmdW5jdGlvbihwYXJhZ3JhcGgpIHtcbiAgICAgIHZhciBsaW5lcyA9IHBhcmFncmFwaC5zcGxpdCgvXFxyP1xcbi8pO1xuICAgICAgcmV0dXJuIGxpbmVzLm1hcChlc2NhcGVIVE1MKS5qb2luKCc8YnI+XFxuJyk7XG4gICAgfSk7XG4gICAgcmV0dXJuICc8cD4nICsgZXNjYXBlZC5qb2luKCc8L3A+XFxuXFxuPHA+JykgKyAnPC9wPic7XG4gIH1cbn07XG4iLCJ2YXIgZXNjYXBlSFRNTCA9IHJlcXVpcmUoJy4vZXNjYXBlJyk7XG5cbi8qKlxuICogSFRNTCBlc2NhcGVzIGNvbnRlbnQgd3JhcHBpbmcgbGluZXMgaW50byBwYXJhZ3JhcGhzIChpbiA8cD4gdGFncykuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odmFsdWUsIHNldHRlcikge1xuICBpZiAoc2V0dGVyKSB7XG4gICAgcmV0dXJuIGVzY2FwZUhUTUwodmFsdWUsIHNldHRlcik7XG4gIH0gZWxzZSB7XG4gICAgdmFyIGxpbmVzID0gKHZhbHVlIHx8ICcnKS5zcGxpdCgvXFxyP1xcbi8pO1xuICAgIHZhciBlc2NhcGVkID0gbGluZXMubWFwKGZ1bmN0aW9uKGxpbmUpIHsgcmV0dXJuIGVzY2FwZUhUTUwobGluZSkgfHwgJzxicj4nOyB9KTtcbiAgICByZXR1cm4gJzxwPicgKyBlc2NhcGVkLmpvaW4oJzwvcD5cXG48cD4nKSArICc8L3A+JztcbiAgfVxufTtcbiIsIi8qKlxuICogQWRkcyBhIGZvcm1hdHRlciB0byByZWR1Y2UgYW4gYXJyYXkgb3IgdmFsdWUgYnkgdGhlIGdpdmVuIHJlZHVjZSBmdW5jdGlvblxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHZhbHVlLCByZWR1Y2VGdW5jLCBpbml0aWFsVmFsdWUpIHtcbiAgaWYgKHZhbHVlID09IG51bGwgfHwgdHlwZW9mIG1hcEZ1bmMgIT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbiAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDMpIHtcbiAgICAgIHJldHVybiB2YWx1ZS5yZWR1Y2UocmVkdWNlRnVuYywgaW5pdGlhbFZhbHVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHZhbHVlLnJlZHVjZShyZWR1Y2VGdW5jKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMykge1xuICAgIHJldHVybiByZWR1Y2VGdW5jKGluaXRpYWxWYWx1ZSwgdmFsdWUpO1xuICB9XG59O1xuIiwiLyoqXG4gKiBBZGRzIGEgZm9ybWF0dGVyIHRvIHJlZHVjZSBhbiBhcnJheSBvciB2YWx1ZSBieSB0aGUgZ2l2ZW4gcmVkdWNlIGZ1bmN0aW9uXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odmFsdWUsIGluZGV4LCBlbmRJbmRleCkge1xuICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gdmFsdWUuc2xpY2UoaW5kZXgsIGVuZEluZGV4KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbn07XG4iLCIvKipcbiAqIFNvcnRzIGFuIGFycmF5IGdpdmVuIGEgZmllbGQgbmFtZSBvciBzb3J0IGZ1bmN0aW9uLCBhbmQgYSBkaXJlY3Rpb25cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih2YWx1ZSwgc29ydEZ1bmMsIGRpcikge1xuICBpZiAoIXNvcnRGdW5jIHx8ICFBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuICBkaXIgPSAoZGlyID09PSAnZGVzYycpID8gLTEgOiAxO1xuICBpZiAodHlwZW9mIHNvcnRGdW5jID09PSAnc3RyaW5nJykge1xuICAgIHZhciBwYXJ0cyA9IHNvcnRGdW5jLnNwbGl0KCc6Jyk7XG4gICAgdmFyIHByb3AgPSBwYXJ0c1swXTtcbiAgICB2YXIgZGlyMiA9IHBhcnRzWzFdO1xuICAgIGRpcjIgPSAoZGlyMiA9PT0gJ2Rlc2MnKSA/IC0xIDogMTtcbiAgICBkaXIgPSBkaXIgfHwgZGlyMjtcbiAgICBzb3J0RnVuYyA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgIGlmIChhW3Byb3BdID4gYltwcm9wXSkgcmV0dXJuIGRpcjtcbiAgICAgIGlmIChhW3Byb3BdIDwgYltwcm9wXSkgcmV0dXJuIC1kaXI7XG4gICAgICByZXR1cm4gMDtcbiAgICB9O1xuICB9IGVsc2UgaWYgKGRpciA9PT0gLTEpIHtcbiAgICB2YXIgb3JpZ0Z1bmMgPSBzb3J0RnVuYztcbiAgICBzb3J0RnVuYyA9IGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIC1vcmlnRnVuYyhhLCBiKTsgfTtcbiAgfVxuXG4gIHJldHVybiB2YWx1ZS5zbGljZSgpLnNvcnQoc29ydEZ1bmMuYmluZCh0aGlzKSk7XG59O1xuIiwiLyoqXG4gKiBBZGRzIGEgZm9ybWF0dGVyIHRvIGZvcm1hdCBkYXRlcyBhbmQgc3RyaW5ncyBzaW1wbGlzdGljYWxseVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIGlmICghdmFsdWUpIHtcbiAgICByZXR1cm4gJyc7XG4gIH1cblxuICBpZiAoISh2YWx1ZSBpbnN0YW5jZW9mIERhdGUpKSB7XG4gICAgdmFsdWUgPSBuZXcgRGF0ZSh2YWx1ZSk7XG4gIH1cblxuICBpZiAoaXNOYU4odmFsdWUuZ2V0VGltZSgpKSkge1xuICAgIHJldHVybiAnJztcbiAgfVxuXG4gIHJldHVybiB2YWx1ZS50b0xvY2FsZVRpbWVTdHJpbmcoKTtcbn07XG4iLCIvKipcbiAqIEZvcm1hdHMgdGhlIHZhbHVlIGludG8gdXBwZXIgY2FzZS5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyA/IHZhbHVlLnRvVXBwZXJDYXNlKCkgOiB2YWx1ZTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vc3JjL2RpZmYnKTtcbiIsIi8qXG5Db3B5cmlnaHQgKGMpIDIwMTUgSmFjb2IgV3JpZ2h0IDxqYWN3cmlnaHRAZ21haWwuY29tPlxuXG5QZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG5vZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG5pbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG50byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG5jb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbmZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG5cblRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG5hbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cblxuVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG5GSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbkFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbkxJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG5PVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG5USEUgU09GVFdBUkUuXG4qL1xuLy8gIyBEaWZmXG4vLyA+IEJhc2VkIG9uIHdvcmsgZnJvbSBHb29nbGUncyBvYnNlcnZlLWpzIHBvbHlmaWxsOiBodHRwczovL2dpdGh1Yi5jb20vUG9seW1lci9vYnNlcnZlLWpzXG5cbi8vIEEgbmFtZXNwYWNlIHRvIHN0b3JlIHRoZSBmdW5jdGlvbnMgb25cbnZhciBkaWZmID0gZXhwb3J0cztcblxuKGZ1bmN0aW9uKCkge1xuXG4gIGRpZmYuY2xvbmUgPSBjbG9uZTtcbiAgZGlmZi52YWx1ZXMgPSBkaWZmVmFsdWVzO1xuICBkaWZmLmJhc2ljID0gZGlmZkJhc2ljO1xuICBkaWZmLm9iamVjdHMgPSBkaWZmT2JqZWN0cztcbiAgZGlmZi5hcnJheXMgPSBkaWZmQXJyYXlzO1xuXG5cbiAgLy8gQSBjaGFuZ2UgcmVjb3JkIGZvciB0aGUgb2JqZWN0IGNoYW5nZXNcbiAgZnVuY3Rpb24gQ2hhbmdlUmVjb3JkKG9iamVjdCwgdHlwZSwgbmFtZSwgb2xkVmFsdWUpIHtcbiAgICB0aGlzLm9iamVjdCA9IG9iamVjdDtcbiAgICB0aGlzLnR5cGUgPSB0eXBlO1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgdGhpcy5vbGRWYWx1ZSA9IG9sZFZhbHVlO1xuICB9XG5cbiAgLy8gQSBzcGxpY2UgcmVjb3JkIGZvciB0aGUgYXJyYXkgY2hhbmdlc1xuICBmdW5jdGlvbiBTcGxpY2UoaW5kZXgsIHJlbW92ZWQsIGFkZGVkQ291bnQpIHtcbiAgICB0aGlzLmluZGV4ID0gaW5kZXg7XG4gICAgdGhpcy5yZW1vdmVkID0gcmVtb3ZlZDtcbiAgICB0aGlzLmFkZGVkQ291bnQgPSBhZGRlZENvdW50O1xuICB9XG5cblxuICAvLyBDcmVhdGVzIGEgY2xvbmUgb3IgY29weSBvZiBhbiBhcnJheSBvciBvYmplY3QgKG9yIHNpbXBseSByZXR1cm5zIGEgc3RyaW5nL251bWJlci9ib29sZWFuIHdoaWNoIGFyZSBpbW11dGFibGUpXG4gIC8vIERvZXMgbm90IHByb3ZpZGUgZGVlcCBjb3BpZXMuXG4gIGZ1bmN0aW9uIGNsb25lKHZhbHVlLCBkZWVwKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICBpZiAoZGVlcCkge1xuICAgICAgICByZXR1cm4gdmFsdWUubWFwKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGNsb25lKHZhbHVlLCBkZWVwKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdmFsdWUuc2xpY2UoKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGlmICh2YWx1ZS52YWx1ZU9mKCkgIT09IHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBuZXcgdmFsdWUuY29uc3RydWN0b3IodmFsdWUudmFsdWVPZigpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBjb3B5ID0ge307XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB2YWx1ZSkge1xuICAgICAgICAgIHZhciBvYmpWYWx1ZSA9IHZhbHVlW2tleV07XG4gICAgICAgICAgaWYgKGRlZXApIHtcbiAgICAgICAgICAgIG9ialZhbHVlID0gY2xvbmUob2JqVmFsdWUsIGRlZXApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb3B5W2tleV0gPSBvYmpWYWx1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY29weTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgfVxuXG5cbiAgLy8gRGlmZnMgdHdvIHZhbHVlcywgcmV0dXJuaW5nIGEgdHJ1dGh5IHZhbHVlIGlmIHRoZXJlIGFyZSBjaGFuZ2VzIG9yIGBmYWxzZWAgaWYgdGhlcmUgYXJlIG5vIGNoYW5nZXMuIElmIHRoZSB0d29cbiAgLy8gdmFsdWVzIGFyZSBib3RoIGFycmF5cyBvciBib3RoIG9iamVjdHMsIGFuIGFycmF5IG9mIGNoYW5nZXMgKHNwbGljZXMgb3IgY2hhbmdlIHJlY29yZHMpIGJldHdlZW4gdGhlIHR3byB3aWxsIGJlXG4gIC8vIHJldHVybmVkLiBPdGhlcndpc2UgIGB0cnVlYCB3aWxsIGJlIHJldHVybmVkLlxuICBmdW5jdGlvbiBkaWZmVmFsdWVzKHZhbHVlLCBvbGRWYWx1ZSkge1xuICAgIC8vIFNob3J0Y3V0IG91dCBmb3IgdmFsdWVzIHRoYXQgYXJlIGV4YWN0bHkgZXF1YWxcbiAgICBpZiAodmFsdWUgPT09IG9sZFZhbHVlKSByZXR1cm4gZmFsc2U7XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkgJiYgQXJyYXkuaXNBcnJheShvbGRWYWx1ZSkpIHtcbiAgICAgIC8vIElmIGFuIGFycmF5IGhhcyBjaGFuZ2VkIGNhbGN1bGF0ZSB0aGUgc3BsaWNlc1xuICAgICAgdmFyIHNwbGljZXMgPSBkaWZmQXJyYXlzKHZhbHVlLCBvbGRWYWx1ZSk7XG4gICAgICByZXR1cm4gc3BsaWNlcy5sZW5ndGggPyBzcGxpY2VzIDogZmFsc2U7XG4gICAgfSBlbHNlIGlmICh2YWx1ZSAmJiBvbGRWYWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHR5cGVvZiBvbGRWYWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIC8vIElmIGFuIG9iamVjdCBoYXMgY2hhbmdlZCBjYWxjdWxhdGUgdGhlIGNobmFnZXMgYW5kIGNhbGwgdGhlIGNhbGxiYWNrXG4gICAgICAvLyBBbGxvdyBkYXRlcyBhbmQgTnVtYmVyL1N0cmluZyBvYmplY3RzIHRvIGJlIGNvbXBhcmVkXG4gICAgICB2YXIgdmFsdWVWYWx1ZSA9IHZhbHVlLnZhbHVlT2YoKTtcbiAgICAgIHZhciBvbGRWYWx1ZVZhbHVlID0gb2xkVmFsdWUudmFsdWVPZigpO1xuXG4gICAgICAvLyBBbGxvdyBkYXRlcyBhbmQgTnVtYmVyL1N0cmluZyBvYmplY3RzIHRvIGJlIGNvbXBhcmVkXG4gICAgICBpZiAodHlwZW9mIHZhbHVlVmFsdWUgIT09ICdvYmplY3QnICYmIHR5cGVvZiBvbGRWYWx1ZVZhbHVlICE9PSAnb2JqZWN0Jykge1xuICAgICAgICByZXR1cm4gdmFsdWVWYWx1ZSAhPT0gb2xkVmFsdWVWYWx1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBjaGFuZ2VSZWNvcmRzID0gZGlmZk9iamVjdHModmFsdWUsIG9sZFZhbHVlKTtcbiAgICAgICAgcmV0dXJuIGNoYW5nZVJlY29yZHMubGVuZ3RoID8gY2hhbmdlUmVjb3JkcyA6IGZhbHNlO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiBhIHZhbHVlIGhhcyBjaGFuZ2VkIGNhbGwgdGhlIGNhbGxiYWNrXG4gICAgICByZXR1cm4gZGlmZkJhc2ljKHZhbHVlLCBvbGRWYWx1ZSk7XG4gICAgfVxuICB9XG5cblxuICAvLyBEaWZmcyB0d28gYmFzaWMgdHlwZXMsIHJldHVybmluZyB0cnVlIGlmIGNoYW5nZWQgb3IgZmFsc2UgaWYgbm90XG4gIGZ1bmN0aW9uIGRpZmZCYXNpYyh2YWx1ZSwgb2xkVmFsdWUpIHtcbiAgICBpZiAodmFsdWUgJiYgb2xkVmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB0eXBlb2Ygb2xkVmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAvLyBBbGxvdyBkYXRlcyBhbmQgTnVtYmVyL1N0cmluZyBvYmplY3RzIHRvIGJlIGNvbXBhcmVkXG4gICAgICB2YXIgdmFsdWVWYWx1ZSA9IHZhbHVlLnZhbHVlT2YoKTtcbiAgICAgIHZhciBvbGRWYWx1ZVZhbHVlID0gb2xkVmFsdWUudmFsdWVPZigpO1xuXG4gICAgICAvLyBBbGxvdyBkYXRlcyBhbmQgTnVtYmVyL1N0cmluZyBvYmplY3RzIHRvIGJlIGNvbXBhcmVkXG4gICAgICBpZiAodHlwZW9mIHZhbHVlVmFsdWUgIT09ICdvYmplY3QnICYmIHR5cGVvZiBvbGRWYWx1ZVZhbHVlICE9PSAnb2JqZWN0Jykge1xuICAgICAgICByZXR1cm4gZGlmZkJhc2ljKHZhbHVlVmFsdWUsIG9sZFZhbHVlVmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIElmIGEgdmFsdWUgaGFzIGNoYW5nZWQgY2FsbCB0aGUgY2FsbGJhY2tcbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyAmJiB0eXBlb2Ygb2xkVmFsdWUgPT09ICdudW1iZXInICYmIGlzTmFOKHZhbHVlKSAmJiBpc05hTihvbGRWYWx1ZSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHZhbHVlICE9PSBvbGRWYWx1ZTtcbiAgICB9XG4gIH1cblxuXG4gIC8vIERpZmZzIHR3byBvYmplY3RzIHJldHVybmluZyBhbiBhcnJheSBvZiBjaGFuZ2UgcmVjb3Jkcy4gVGhlIGNoYW5nZSByZWNvcmQgbG9va3MgbGlrZTpcbiAgLy8gYGBgamF2YXNjcmlwdFxuICAvLyB7XG4gIC8vICAgb2JqZWN0OiBvYmplY3QsXG4gIC8vICAgdHlwZTogJ2RlbGV0ZWR8dXBkYXRlZHxuZXcnLFxuICAvLyAgIG5hbWU6ICdwcm9wZXJ0eU5hbWUnLFxuICAvLyAgIG9sZFZhbHVlOiBvbGRWYWx1ZVxuICAvLyB9XG4gIC8vIGBgYFxuICBmdW5jdGlvbiBkaWZmT2JqZWN0cyhvYmplY3QsIG9sZE9iamVjdCkge1xuICAgIHZhciBjaGFuZ2VSZWNvcmRzID0gW107XG4gICAgdmFyIHByb3AsIG9sZFZhbHVlLCB2YWx1ZTtcblxuICAgIC8vIEdvZXMgdGhyb3VnaCB0aGUgb2xkIG9iamVjdCAoc2hvdWxkIGJlIGEgY2xvbmUpIGFuZCBsb29rIGZvciB0aGluZ3MgdGhhdCBhcmUgbm93IGdvbmUgb3IgY2hhbmdlZFxuICAgIGZvciAocHJvcCBpbiBvbGRPYmplY3QpIHtcbiAgICAgIG9sZFZhbHVlID0gb2xkT2JqZWN0W3Byb3BdO1xuICAgICAgdmFsdWUgPSBvYmplY3RbcHJvcF07XG5cbiAgICAgIC8vIEFsbG93IGZvciB0aGUgY2FzZSBvZiBvYmoucHJvcCA9IHVuZGVmaW5lZCAod2hpY2ggaXMgYSBuZXcgcHJvcGVydHksIGV2ZW4gaWYgaXQgaXMgdW5kZWZpbmVkKVxuICAgICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQgJiYgIWRpZmZCYXNpYyh2YWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiB0aGUgcHJvcGVydHkgaXMgZ29uZSBpdCB3YXMgcmVtb3ZlZFxuICAgICAgaWYgKCEgKHByb3AgaW4gb2JqZWN0KSkge1xuICAgICAgICBjaGFuZ2VSZWNvcmRzLnB1c2gobmV3IENoYW5nZVJlY29yZChvYmplY3QsICdkZWxldGVkJywgcHJvcCwgb2xkVmFsdWUpKTtcbiAgICAgIH0gZWxzZSBpZiAoZGlmZkJhc2ljKHZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgY2hhbmdlUmVjb3Jkcy5wdXNoKG5ldyBDaGFuZ2VSZWNvcmQob2JqZWN0LCAndXBkYXRlZCcsIHByb3AsIG9sZFZhbHVlKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gR29lcyB0aHJvdWdoIHRoZSBvbGQgb2JqZWN0IGFuZCBsb29rcyBmb3IgdGhpbmdzIHRoYXQgYXJlIG5ld1xuICAgIGZvciAocHJvcCBpbiBvYmplY3QpIHtcbiAgICAgIHZhbHVlID0gb2JqZWN0W3Byb3BdO1xuICAgICAgaWYgKCEgKHByb3AgaW4gb2xkT2JqZWN0KSkge1xuICAgICAgICBjaGFuZ2VSZWNvcmRzLnB1c2gobmV3IENoYW5nZVJlY29yZChvYmplY3QsICduZXcnLCBwcm9wKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkob2JqZWN0KSAmJiBvYmplY3QubGVuZ3RoICE9PSBvbGRPYmplY3QubGVuZ3RoKSB7XG4gICAgICBjaGFuZ2VSZWNvcmRzLnB1c2gobmV3IENoYW5nZVJlY29yZChvYmplY3QsICd1cGRhdGVkJywgJ2xlbmd0aCcsIG9sZE9iamVjdC5sZW5ndGgpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY2hhbmdlUmVjb3JkcztcbiAgfVxuXG5cblxuXG5cbiAgdmFyIEVESVRfTEVBVkUgPSAwO1xuICB2YXIgRURJVF9VUERBVEUgPSAxO1xuICB2YXIgRURJVF9BREQgPSAyO1xuICB2YXIgRURJVF9ERUxFVEUgPSAzO1xuXG5cbiAgLy8gRGlmZnMgdHdvIGFycmF5cyByZXR1cm5pbmcgYW4gYXJyYXkgb2Ygc3BsaWNlcy4gQSBzcGxpY2Ugb2JqZWN0IGxvb2tzIGxpa2U6XG4gIC8vIGBgYGphdmFzY3JpcHRcbiAgLy8ge1xuICAvLyAgIGluZGV4OiAzLFxuICAvLyAgIHJlbW92ZWQ6IFtpdGVtLCBpdGVtXSxcbiAgLy8gICBhZGRlZENvdW50OiAwXG4gIC8vIH1cbiAgLy8gYGBgXG4gIGZ1bmN0aW9uIGRpZmZBcnJheXModmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgdmFyIGN1cnJlbnRTdGFydCA9IDA7XG4gICAgdmFyIGN1cnJlbnRFbmQgPSB2YWx1ZS5sZW5ndGg7XG4gICAgdmFyIG9sZFN0YXJ0ID0gMDtcbiAgICB2YXIgb2xkRW5kID0gb2xkVmFsdWUubGVuZ3RoO1xuXG4gICAgdmFyIG1pbkxlbmd0aCA9IE1hdGgubWluKGN1cnJlbnRFbmQsIG9sZEVuZCk7XG4gICAgdmFyIHByZWZpeENvdW50ID0gc2hhcmVkUHJlZml4KHZhbHVlLCBvbGRWYWx1ZSwgbWluTGVuZ3RoKTtcbiAgICB2YXIgc3VmZml4Q291bnQgPSBzaGFyZWRTdWZmaXgodmFsdWUsIG9sZFZhbHVlLCBtaW5MZW5ndGggLSBwcmVmaXhDb3VudCk7XG5cbiAgICBjdXJyZW50U3RhcnQgKz0gcHJlZml4Q291bnQ7XG4gICAgb2xkU3RhcnQgKz0gcHJlZml4Q291bnQ7XG4gICAgY3VycmVudEVuZCAtPSBzdWZmaXhDb3VudDtcbiAgICBvbGRFbmQgLT0gc3VmZml4Q291bnQ7XG5cbiAgICBpZiAoY3VycmVudEVuZCAtIGN1cnJlbnRTdGFydCA9PT0gMCAmJiBvbGRFbmQgLSBvbGRTdGFydCA9PT0gMCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIC8vIGlmIG5vdGhpbmcgd2FzIGFkZGVkLCBvbmx5IHJlbW92ZWQgZnJvbSBvbmUgc3BvdFxuICAgIGlmIChjdXJyZW50U3RhcnQgPT09IGN1cnJlbnRFbmQpIHtcbiAgICAgIHJldHVybiBbIG5ldyBTcGxpY2UoY3VycmVudFN0YXJ0LCBvbGRWYWx1ZS5zbGljZShvbGRTdGFydCwgb2xkRW5kKSwgMCkgXTtcbiAgICB9XG5cbiAgICAvLyBpZiBub3RoaW5nIHdhcyByZW1vdmVkLCBvbmx5IGFkZGVkIHRvIG9uZSBzcG90XG4gICAgaWYgKG9sZFN0YXJ0ID09PSBvbGRFbmQpIHtcbiAgICAgIHJldHVybiBbIG5ldyBTcGxpY2UoY3VycmVudFN0YXJ0LCBbXSwgY3VycmVudEVuZCAtIGN1cnJlbnRTdGFydCkgXTtcbiAgICB9XG5cbiAgICAvLyBhIG1peHR1cmUgb2YgYWRkcyBhbmQgcmVtb3Zlc1xuICAgIHZhciBkaXN0YW5jZXMgPSBjYWxjRWRpdERpc3RhbmNlcyh2YWx1ZSwgY3VycmVudFN0YXJ0LCBjdXJyZW50RW5kLCBvbGRWYWx1ZSwgb2xkU3RhcnQsIG9sZEVuZCk7XG4gICAgdmFyIG9wcyA9IHNwbGljZU9wZXJhdGlvbnNGcm9tRWRpdERpc3RhbmNlcyhkaXN0YW5jZXMpO1xuXG4gICAgdmFyIHNwbGljZSA9IG51bGw7XG4gICAgdmFyIHNwbGljZXMgPSBbXTtcbiAgICB2YXIgaW5kZXggPSBjdXJyZW50U3RhcnQ7XG4gICAgdmFyIG9sZEluZGV4ID0gb2xkU3RhcnQ7XG5cbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IG9wcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIHZhciBvcCA9IG9wc1tpXTtcbiAgICAgIGlmIChvcCA9PT0gRURJVF9MRUFWRSkge1xuICAgICAgICBpZiAoc3BsaWNlKSB7XG4gICAgICAgICAgc3BsaWNlcy5wdXNoKHNwbGljZSk7XG4gICAgICAgICAgc3BsaWNlID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGluZGV4Kys7XG4gICAgICAgIG9sZEluZGV4Kys7XG4gICAgICB9IGVsc2UgaWYgKG9wID09PSBFRElUX1VQREFURSkge1xuICAgICAgICBpZiAoIXNwbGljZSkge1xuICAgICAgICAgIHNwbGljZSA9IG5ldyBTcGxpY2UoaW5kZXgsIFtdLCAwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNwbGljZS5hZGRlZENvdW50Kys7XG4gICAgICAgIGluZGV4Kys7XG5cbiAgICAgICAgc3BsaWNlLnJlbW92ZWQucHVzaChvbGRWYWx1ZVtvbGRJbmRleF0pO1xuICAgICAgICBvbGRJbmRleCsrO1xuICAgICAgfSBlbHNlIGlmIChvcCA9PT0gRURJVF9BREQpIHtcbiAgICAgICAgaWYgKCFzcGxpY2UpIHtcbiAgICAgICAgICBzcGxpY2UgPSBuZXcgU3BsaWNlKGluZGV4LCBbXSwgMCk7XG4gICAgICAgIH1cblxuICAgICAgICBzcGxpY2UuYWRkZWRDb3VudCsrO1xuICAgICAgICBpbmRleCsrO1xuICAgICAgfSBlbHNlIGlmIChvcCA9PT0gRURJVF9ERUxFVEUpIHtcbiAgICAgICAgaWYgKCFzcGxpY2UpIHtcbiAgICAgICAgICBzcGxpY2UgPSBuZXcgU3BsaWNlKGluZGV4LCBbXSwgMCk7XG4gICAgICAgIH1cblxuICAgICAgICBzcGxpY2UucmVtb3ZlZC5wdXNoKG9sZFZhbHVlW29sZEluZGV4XSk7XG4gICAgICAgIG9sZEluZGV4Kys7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHNwbGljZSkge1xuICAgICAgc3BsaWNlcy5wdXNoKHNwbGljZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNwbGljZXM7XG4gIH1cblxuXG5cblxuICAvLyBmaW5kIHRoZSBudW1iZXIgb2YgaXRlbXMgYXQgdGhlIGJlZ2lubmluZyB0aGF0IGFyZSB0aGUgc2FtZVxuICBmdW5jdGlvbiBzaGFyZWRQcmVmaXgoY3VycmVudCwgb2xkLCBzZWFyY2hMZW5ndGgpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNlYXJjaExlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoZGlmZkJhc2ljKGN1cnJlbnRbaV0sIG9sZFtpXSkpIHtcbiAgICAgICAgcmV0dXJuIGk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzZWFyY2hMZW5ndGg7XG4gIH1cblxuXG4gIC8vIGZpbmQgdGhlIG51bWJlciBvZiBpdGVtcyBhdCB0aGUgZW5kIHRoYXQgYXJlIHRoZSBzYW1lXG4gIGZ1bmN0aW9uIHNoYXJlZFN1ZmZpeChjdXJyZW50LCBvbGQsIHNlYXJjaExlbmd0aCkge1xuICAgIHZhciBpbmRleDEgPSBjdXJyZW50Lmxlbmd0aDtcbiAgICB2YXIgaW5kZXgyID0gb2xkLmxlbmd0aDtcbiAgICB2YXIgY291bnQgPSAwO1xuICAgIHdoaWxlIChjb3VudCA8IHNlYXJjaExlbmd0aCAmJiAhZGlmZkJhc2ljKGN1cnJlbnRbLS1pbmRleDFdLCBvbGRbLS1pbmRleDJdKSkge1xuICAgICAgY291bnQrKztcbiAgICB9XG4gICAgcmV0dXJuIGNvdW50O1xuICB9XG5cblxuICBmdW5jdGlvbiBzcGxpY2VPcGVyYXRpb25zRnJvbUVkaXREaXN0YW5jZXMoZGlzdGFuY2VzKSB7XG4gICAgdmFyIGkgPSBkaXN0YW5jZXMubGVuZ3RoIC0gMTtcbiAgICB2YXIgaiA9IGRpc3RhbmNlc1swXS5sZW5ndGggLSAxO1xuICAgIHZhciBjdXJyZW50ID0gZGlzdGFuY2VzW2ldW2pdO1xuICAgIHZhciBlZGl0cyA9IFtdO1xuICAgIHdoaWxlIChpID4gMCB8fCBqID4gMCkge1xuICAgICAgaWYgKGkgPT09IDApIHtcbiAgICAgICAgZWRpdHMucHVzaChFRElUX0FERCk7XG4gICAgICAgIGotLTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChqID09PSAwKSB7XG4gICAgICAgIGVkaXRzLnB1c2goRURJVF9ERUxFVEUpO1xuICAgICAgICBpLS07XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICB2YXIgbm9ydGhXZXN0ID0gZGlzdGFuY2VzW2kgLSAxXVtqIC0gMV07XG4gICAgICB2YXIgd2VzdCA9IGRpc3RhbmNlc1tpIC0gMV1bal07XG4gICAgICB2YXIgbm9ydGggPSBkaXN0YW5jZXNbaV1baiAtIDFdO1xuICAgICAgdmFyIG1pbjtcblxuICAgICAgaWYgKHdlc3QgPCBub3J0aCkge1xuICAgICAgICBtaW4gPSB3ZXN0IDwgbm9ydGhXZXN0ID8gd2VzdCA6IG5vcnRoV2VzdDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1pbiA9IG5vcnRoIDwgbm9ydGhXZXN0ID8gbm9ydGggOiBub3J0aFdlc3Q7XG4gICAgICB9XG5cbiAgICAgIGlmIChtaW4gPT09IG5vcnRoV2VzdCkge1xuICAgICAgICBpZiAobm9ydGhXZXN0ID09PSBjdXJyZW50KSB7XG4gICAgICAgICAgZWRpdHMucHVzaChFRElUX0xFQVZFKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBlZGl0cy5wdXNoKEVESVRfVVBEQVRFKTtcbiAgICAgICAgICBjdXJyZW50ID0gbm9ydGhXZXN0O1xuICAgICAgICB9XG4gICAgICAgIGktLTtcbiAgICAgICAgai0tO1xuICAgICAgfSBlbHNlIGlmIChtaW4gPT09IHdlc3QpIHtcbiAgICAgICAgZWRpdHMucHVzaChFRElUX0RFTEVURSk7XG4gICAgICAgIGktLTtcbiAgICAgICAgY3VycmVudCA9IHdlc3Q7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlZGl0cy5wdXNoKEVESVRfQUREKTtcbiAgICAgICAgai0tO1xuICAgICAgICBjdXJyZW50ID0gbm9ydGg7XG4gICAgICB9XG4gICAgfVxuICAgIGVkaXRzLnJldmVyc2UoKTtcbiAgICByZXR1cm4gZWRpdHM7XG4gIH1cblxuXG4gIGZ1bmN0aW9uIGNhbGNFZGl0RGlzdGFuY2VzKGN1cnJlbnQsIGN1cnJlbnRTdGFydCwgY3VycmVudEVuZCwgb2xkLCBvbGRTdGFydCwgb2xkRW5kKSB7XG4gICAgLy8gXCJEZWxldGlvblwiIGNvbHVtbnNcbiAgICB2YXIgcm93Q291bnQgPSBvbGRFbmQgLSBvbGRTdGFydCArIDE7XG4gICAgdmFyIGNvbHVtbkNvdW50ID0gY3VycmVudEVuZCAtIGN1cnJlbnRTdGFydCArIDE7XG4gICAgdmFyIGRpc3RhbmNlcyA9IG5ldyBBcnJheShyb3dDb3VudCk7XG4gICAgdmFyIGksIGo7XG5cbiAgICAvLyBcIkFkZGl0aW9uXCIgcm93cy4gSW5pdGlhbGl6ZSBudWxsIGNvbHVtbi5cbiAgICBmb3IgKGkgPSAwOyBpIDwgcm93Q291bnQ7IGkrKykge1xuICAgICAgZGlzdGFuY2VzW2ldID0gbmV3IEFycmF5KGNvbHVtbkNvdW50KTtcbiAgICAgIGRpc3RhbmNlc1tpXVswXSA9IGk7XG4gICAgfVxuXG4gICAgLy8gSW5pdGlhbGl6ZSBudWxsIHJvd1xuICAgIGZvciAoaiA9IDA7IGogPCBjb2x1bW5Db3VudDsgaisrKSB7XG4gICAgICBkaXN0YW5jZXNbMF1bal0gPSBqO1xuICAgIH1cblxuICAgIGZvciAoaSA9IDE7IGkgPCByb3dDb3VudDsgaSsrKSB7XG4gICAgICBmb3IgKGogPSAxOyBqIDwgY29sdW1uQ291bnQ7IGorKykge1xuICAgICAgICBpZiAoIWRpZmZCYXNpYyhjdXJyZW50W2N1cnJlbnRTdGFydCArIGogLSAxXSwgb2xkW29sZFN0YXJ0ICsgaSAtIDFdKSkge1xuICAgICAgICAgIGRpc3RhbmNlc1tpXVtqXSA9IGRpc3RhbmNlc1tpIC0gMV1baiAtIDFdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciBub3J0aCA9IGRpc3RhbmNlc1tpIC0gMV1bal0gKyAxO1xuICAgICAgICAgIHZhciB3ZXN0ID0gZGlzdGFuY2VzW2ldW2ogLSAxXSArIDE7XG4gICAgICAgICAgZGlzdGFuY2VzW2ldW2pdID0gbm9ydGggPCB3ZXN0ID8gbm9ydGggOiB3ZXN0O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRpc3RhbmNlcztcbiAgfVxufSkoKTtcbiIsInZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcblxuLyoqXG4gKiBTaW1wbGlmaWVzIGV4dGVuZGluZyBjbGFzc2VzIGFuZCBwcm92aWRlcyBzdGF0aWMgaW5oZXJpdGFuY2UuIENsYXNzZXMgdGhhdCBuZWVkIHRvIGJlIGV4dGVuZGFibGUgc2hvdWxkXG4gKiBleHRlbmQgQ2xhc3Mgd2hpY2ggd2lsbCBnaXZlIHRoZW0gdGhlIGBleHRlbmRgIHN0YXRpYyBmdW5jdGlvbiBmb3IgdGhlaXIgc3ViY2xhc3NlcyB0byB1c2UuIEluIGFkZGl0aW9uIHRvXG4gKiBhIHByb3RvdHlwZSwgbWl4aW5zIG1heSBiZSBhZGRlZCBhcyB3ZWxsLiBFeGFtcGxlOlxuICpcbiAqIGZ1bmN0aW9uIE15Q2xhc3MoYXJnMSwgYXJnMikge1xuICogICBTdXBlckNsYXNzLmNhbGwodGhpcywgYXJnMSk7XG4gKiAgIHRoaXMuYXJnMiA9IGFyZzI7XG4gKiB9XG4gKiBTdXBlckNsYXNzLmV4dGVuZChNeUNsYXNzLCBtaXhpbjEsIEFub3RoZXJDbGFzcywge1xuICogICBmb286IGZ1bmN0aW9uKCkge1xuICogICAgIHRoaXMuX2JhcisrO1xuICogICB9LFxuICogICBnZXQgYmFyKCkge1xuICogICAgIHJldHVybiB0aGlzLl9iYXI7XG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIEluIGFkZGl0aW9uIHRvIGV4dGVuZGluZyB0aGUgc3VwZXJjbGFzcywgc3RhdGljIG1ldGhvZHMgYW5kIHByb3BlcnRpZXMgd2lsbCBiZSBjb3BpZWQgb250byB0aGUgc3ViY2xhc3MgZm9yXG4gKiBzdGF0aWMgaW5oZXJpdGFuY2UuIFRoaXMgYWxsb3dzIHRoZSBleHRlbmQgZnVuY3Rpb24gdG8gYmUgY29waWVkIHRvIHRoZSBzdWJjbGFzcyBzbyB0aGF0IGl0IG1heSBiZVxuICogc3ViY2xhc3NlZCBhcyB3ZWxsLiBBZGRpdGlvbmFsbHksIHN0YXRpYyBwcm9wZXJ0aWVzIG1heSBiZSBhZGRlZCBieSBkZWZpbmluZyB0aGVtIG9uIGEgc3BlY2lhbCBwcm90b3R5cGVcbiAqIHByb3BlcnR5IGBzdGF0aWNgIG1ha2luZyB0aGUgY29kZSBtb3JlIHJlYWRhYmxlLlxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IFRoZSBzdWJjbGFzcyBjb25zdHJ1Y3Rvci5cbiAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9uYWxdIFplcm8gb3IgbW9yZSBtaXhpbnMuIFRoZXkgY2FuIGJlIG9iamVjdHMgb3IgY2xhc3NlcyAoZnVuY3Rpb25zKS5cbiAqIEBwYXJhbSB7b2JqZWN0fSBUaGUgcHJvdG90eXBlIG9mIHRoZSBzdWJjbGFzcy5cbiAqL1xuZnVuY3Rpb24gQ2xhc3MoKSB7fVxuQ2xhc3MuZXh0ZW5kID0gZXh0ZW5kO1xuQ2xhc3MubWFrZUluc3RhbmNlT2YgPSBtYWtlSW5zdGFuY2VPZjtcbm1vZHVsZS5leHBvcnRzID0gQ2xhc3M7XG5cbmZ1bmN0aW9uIGV4dGVuZChTdWJjbGFzcyAvKiBbLCBwcm90b3R5cGUgWyxwcm90b3R5cGVdXSAqLykge1xuICB2YXIgcHJvdG90eXBlcywgU3VwZXJDbGFzcyA9IHRoaXM7XG5cbiAgLy8gU3VwcG9ydCBubyBjb25zdHJ1Y3RvclxuICBpZiAodHlwZW9mIFN1YmNsYXNzICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgcHJvdG90eXBlcyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICBTdWJjbGFzcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgU3VwZXJDbGFzcy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgcHJvdG90eXBlcyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgfVxuXG4gIGV4dGVuZFN0YXRpY3ModGhpcywgU3ViY2xhc3MpO1xuXG4gIHByb3RvdHlwZXMuZm9yRWFjaChmdW5jdGlvbihwcm90bykge1xuICAgIGlmICh0eXBlb2YgcHJvdG8gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGV4dGVuZFN0YXRpY3MocHJvdG8sIFN1YmNsYXNzKTtcbiAgICB9IGVsc2UgaWYgKHByb3RvLmhhc093blByb3BlcnR5KCdzdGF0aWMnKSkge1xuICAgICAgZXh0ZW5kU3RhdGljcyhwcm90by5zdGF0aWMsIFN1YmNsYXNzKTtcbiAgICB9XG4gIH0pO1xuXG4gIHZhciBkZXNjcmlwdG9ycyA9IGdldERlc2NyaXB0b3JzKHByb3RvdHlwZXMpO1xuICBkZXNjcmlwdG9ycy5jb25zdHJ1Y3RvciA9IHsgd3JpdGFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSwgdmFsdWU6IFN1YmNsYXNzIH07XG4gIFN1YmNsYXNzLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUodGhpcy5wcm90b3R5cGUsIGRlc2NyaXB0b3JzKTtcbiAgaWYgKHR5cGVvZiBTdXBlckNsYXNzLm9uRXh0ZW5zaW9uID09PSAnZnVuY3Rpb24nKSB7XG4gICAgLy8gQWxsb3cgZm9yIGN1c3RvbWl6aW5nIHRoZSBkZWZpbml0aW9ucyBvZiB5b3VyIGNoaWxkIGNsYXNzZXNcbiAgICBTdXBlckNsYXNzLm9uRXh0ZW5kKFN1YmNsYXNzLCBwcm90b3R5cGVzKTtcbiAgfVxuICByZXR1cm4gU3ViY2xhc3M7XG59XG5cbi8vIEdldCBkZXNjcmlwdG9ycyAoYWxsb3dzIGZvciBnZXR0ZXJzIGFuZCBzZXR0ZXJzKSBhbmQgc2V0cyBmdW5jdGlvbnMgdG8gYmUgbm9uLWVudW1lcmFibGVcbmZ1bmN0aW9uIGdldERlc2NyaXB0b3JzKG9iamVjdHMpIHtcbiAgdmFyIGRlc2NyaXB0b3JzID0ge307XG5cbiAgb2JqZWN0cy5mb3JFYWNoKGZ1bmN0aW9uKG9iamVjdCkge1xuICAgIGlmICh0eXBlb2Ygb2JqZWN0ID09PSAnZnVuY3Rpb24nKSBvYmplY3QgPSBvYmplY3QucHJvdG90eXBlO1xuXG4gICAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMob2JqZWN0KS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIGlmIChuYW1lID09PSAnc3RhdGljJykgcmV0dXJuO1xuXG4gICAgICB2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqZWN0LCBuYW1lKTtcblxuICAgICAgaWYgKHR5cGVvZiBkZXNjcmlwdG9yLnZhbHVlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGRlc2NyaXB0b3IuZW51bWVyYWJsZSA9IGZhbHNlO1xuICAgICAgfVxuXG4gICAgICBkZXNjcmlwdG9yc1tuYW1lXSA9IGRlc2NyaXB0b3I7XG4gICAgfSk7XG4gIH0pO1xuICByZXR1cm4gZGVzY3JpcHRvcnM7XG59XG5cbi8vIENvcGllcyBzdGF0aWMgbWV0aG9kcyBvdmVyIGZvciBzdGF0aWMgaW5oZXJpdGFuY2VcbmZ1bmN0aW9uIGV4dGVuZFN0YXRpY3MoQ2xhc3MsIFN1YmNsYXNzKSB7XG5cbiAgLy8gc3RhdGljIG1ldGhvZCBpbmhlcml0YW5jZSAoaW5jbHVkaW5nIGBleHRlbmRgKVxuICBPYmplY3Qua2V5cyhDbGFzcykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICB2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IoQ2xhc3MsIGtleSk7XG4gICAgaWYgKCFkZXNjcmlwdG9yLmNvbmZpZ3VyYWJsZSkgcmV0dXJuO1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFN1YmNsYXNzLCBrZXksIGRlc2NyaXB0b3IpO1xuICB9KTtcbn1cblxuXG4vKipcbiAqIE1ha2VzIGEgbmF0aXZlIG9iamVjdCBwcmV0ZW5kIHRvIGJlIGFuIGluc3RhbmNlIG9mIGNsYXNzIChlLmcuIGFkZHMgbWV0aG9kcyB0byBhIERvY3VtZW50RnJhZ21lbnQgdGhlbiBjYWxscyB0aGVcbiAqIGNvbnN0cnVjdG9yKS5cbiAqL1xuZnVuY3Rpb24gbWFrZUluc3RhbmNlT2Yob2JqZWN0KSB7XG4gIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhvYmplY3QsIGdldERlc2NyaXB0b3JzKFt0aGlzLnByb3RvdHlwZV0pKTtcbiAgdGhpcy5hcHBseShvYmplY3QsIGFyZ3MpO1xuICByZXR1cm4gb2JqZWN0O1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBFdmVudFRhcmdldDtcbnZhciBDbGFzcyA9IHJlcXVpcmUoJy4vY2xhc3MnKTtcblxuLyoqXG4gKiBBIGJyb3dzZXItYmFzZWQgZXZlbnQgZW1pdHRlciB0aGF0IHRha2VzIGFkdmFudGFnZSBvZiB0aGUgYnVpbHQtaW4gQysrIGV2ZW50aW5nIHRoZSBicm93c2VyIHByb3ZpZGVzLCBnaXZpbmcgYVxuICogY29uc2lzdGVudCBldmVudGluZyBtZWNoYW5pc20gZXZlcnl3aGVyZSBpbiB5b3VyIGZyb250LWVuZCBhcHAuXG4gKi9cbmZ1bmN0aW9uIEV2ZW50VGFyZ2V0KCkge1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ19fZXZlbnRfbm9kZScsIHsgdmFsdWU6IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKSB9KTtcbn1cblxuXG5DbGFzcy5leHRlbmQoRXZlbnRUYXJnZXQsIHtcbiAgLy8gQWRkIGV2ZW50IGxpc3RlbmVyXG4gIGFkZEV2ZW50TGlzdGVuZXI6IGZ1bmN0aW9uIGFkZEV2ZW50TGlzdGVuZXIodHlwZSwgbGlzdGVuZXIpIHtcbiAgICB0aGlzLl9fZXZlbnRfbm9kZS5hZGRFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyKTtcbiAgfSxcblxuICBvbjogZnVuY3Rpb24gb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgbGlzdGVuZXIpO1xuICB9LFxuXG4gIC8vIFJlbW92ZXMgZXZlbnQgbGlzdGVuZXJcbiAgcmVtb3ZlRXZlbnRMaXN0ZW5lcjogZnVuY3Rpb24gcmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcikge1xuICAgIHRoaXMuX19ldmVudF9ub2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgbGlzdGVuZXIpO1xuICAgIGlmIChsaXN0ZW5lciAmJiBsaXN0ZW5lci5fX2V2ZW50X29uZSkge1xuICAgICAgdGhpcy5fX2V2ZW50X25vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lci5fX2V2ZW50X29uZSk7XG4gICAgfVxuICB9LFxuXG4gIG9mZjogZnVuY3Rpb24gb2ZmKHR5cGUsIGxpc3RlbmVyKSB7XG4gICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyKTtcbiAgfSxcblxuICAvLyBBZGQgZXZlbnQgbGlzdGVuZXIgdG8gb25seSBnZXQgY2FsbGVkIG9uY2UsIHJldHVybnMgd3JhcHBlZCBtZXRob2QgZm9yIHJlbW92aW5nIGlmIG5lZWRlZFxuICBvbmU6IGZ1bmN0aW9uIG9uZSh0eXBlLCBsaXN0ZW5lcikge1xuICAgIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09ICdmdW5jdGlvbicpIHJldHVybjtcblxuICAgIGlmICghbGlzdGVuZXIuX19ldmVudF9vbmUpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShsaXN0ZW5lciwgJ19fZXZlbnRfb25lJywgeyB2YWx1ZTogZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgc2VsZi5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyLl9fZXZlbnRfb25lKTtcbiAgICAgICAgbGlzdGVuZXIuY2FsbChzZWxmLCBldmVudCk7XG4gICAgICB9fSk7XG4gICAgfVxuXG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyLl9fZXZlbnRfb25lKTtcbiAgfSxcblxuICAvLyBEaXNwYXRjaCBldmVudCBhbmQgdHJpZ2dlciBsaXN0ZW5lcnNcbiAgZGlzcGF0Y2hFdmVudDogZnVuY3Rpb24gZGlzcGF0Y2hFdmVudChldmVudCkge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShldmVudCwgJ3RhcmdldCcsIHsgdmFsdWU6IHRoaXMgfSk7XG4gICAgcmV0dXJuIHRoaXMuX19ldmVudF9ub2RlLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICB9XG59KTtcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9zcmMvY2hpcCcpO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBBcHA7XG52YXIgY29tcG9uZW50QmluZGluZyA9IHJlcXVpcmUoJ2ZyYWdtZW50cy1idWlsdC1pbnMvYmluZGVycy9jb21wb25lbnQnKTtcbnZhciBMb2NhdGlvbiA9IHJlcXVpcmUoJ3JvdXRlcy1qcycpLkxvY2F0aW9uO1xudmFyIEV2ZW50VGFyZ2V0ID0gcmVxdWlyZSgnY2hpcC11dGlscy9ldmVudC10YXJnZXQnKTtcbnZhciBjcmVhdGVGcmFnbWVudHMgPSByZXF1aXJlKCcuL2ZyYWdtZW50cycpO1xudmFyIGRlZmF1bHRNaXhpbiA9IHJlcXVpcmUoJy4vbWl4aW5zL2RlZmF1bHQnKTtcbnZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcblxuLy8gIyBDaGlwIEFwcFxuXG4vLyBBbiBBcHAgcmVwcmVzZW50cyBhbiBhcHAgb3IgbW9kdWxlIHRoYXQgY2FuIGhhdmUgcm91dGVzLCBjb250cm9sbGVycywgYW5kIHRlbXBsYXRlcyBkZWZpbmVkLlxuZnVuY3Rpb24gQXBwKG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIEV2ZW50VGFyZ2V0LmNhbGwodGhpcyk7XG4gIHRoaXMuZnJhZ21lbnRzID0gY3JlYXRlRnJhZ21lbnRzKCk7XG4gIHRoaXMuZnJhZ21lbnRzLmFwcCA9IHRoaXM7XG4gIHRoaXMubG9jYXRpb24gPSBMb2NhdGlvbi5jcmVhdGUob3B0aW9ucyk7XG4gIHRoaXMuZGVmYXVsdE1peGluID0gZGVmYXVsdE1peGluKHRoaXMpO1xuXG4gIHRoaXMucm9vdEVsZW1lbnQgPSBvcHRpb25zLnJvb3RFbGVtZW50IHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgdGhpcy5zeW5jID0gdGhpcy5mcmFnbWVudHMuc3luYztcbiAgdGhpcy5zeW5jTm93ID0gdGhpcy5mcmFnbWVudHMuc3luY05vdztcbiAgdGhpcy5hZnRlclN5bmMgPSB0aGlzLmZyYWdtZW50cy5hZnRlclN5bmM7XG4gIHRoaXMub25TeW5jID0gdGhpcy5mcmFnbWVudHMub25TeW5jO1xuICB0aGlzLm9mZlN5bmMgPSB0aGlzLmZyYWdtZW50cy5vZmZTeW5jO1xuICB0aGlzLmxvY2F0aW9uLm9uKCdjaGFuZ2UnLCB0aGlzLnN5bmMpO1xufVxuXG5FdmVudFRhcmdldC5leHRlbmQoQXBwLCB7XG5cbiAgaW5pdDogZnVuY3Rpb24ocm9vdCkge1xuICAgIGlmICh0aGlzLmluaXRlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChkb2N1bWVudC5yZWFkeVN0YXRlID09PSAnbG9hZGluZycpIHtcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCB0aGlzLmluaXQuYmluZCh0aGlzLCByb290KSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5pbml0ZWQgPSB0cnVlXG4gICAgaWYgKHJvb3QpIHtcbiAgICAgIHRoaXMucm9vdEVsZW1lbnQgPSByb290O1xuICAgIH1cblxuICAgIHRoaXMuZnJhZ21lbnRzLmJpbmRFbGVtZW50KHRoaXMucm9vdEVsZW1lbnQsIHRoaXMpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG5cbiAgLy8gQ29tcG9uZW50c1xuICAvLyAtLS0tLS0tLS0tXG5cbiAgLy8gUmVnaXN0ZXJzIGEgbmV3IGNvbXBvbmVudCBieSBuYW1lIHdpdGggdGhlIGdpdmVuIGRlZmluaXRpb24uIHByb3ZpZGVkIGBjb250ZW50YCBzdHJpbmcuIElmIG5vIGBjb250ZW50YCBpcyBnaXZlblxuICAvLyB0aGVuIHJldHVybnMgYSBuZXcgaW5zdGFuY2Ugb2YgYSBkZWZpbmVkIHRlbXBsYXRlLiBUaGlzIGluc3RhbmNlIGlzIGEgZG9jdW1lbnQgZnJhZ21lbnQuXG4gIGNvbXBvbmVudDogZnVuY3Rpb24obmFtZSwgZGVmaW5pdGlvbikge1xuICAgIHZhciBkZWZpbml0aW9ucyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICBkZWZpbml0aW9ucy51bnNoaWZ0KHRoaXMuZGVmYXVsdE1peGluKTtcbiAgICB0aGlzLmZyYWdtZW50cy5yZWdpc3RlckVsZW1lbnQobmFtZSwgY29tcG9uZW50QmluZGluZy5hcHBseShudWxsLCBkZWZpbml0aW9ucykpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG5cbiAgLy8gUmVkaXJlY3RzIHRvIHRoZSBwcm92aWRlZCBVUkxcbiAgcmVkaXJlY3Q6IGZ1bmN0aW9uKHVybCkge1xuICAgIHJldHVybiB0aGlzLmxvY2F0aW9uLnVybCA9IHVybDtcbiAgfSxcblxuXG4gIC8vIExpc3RlbiB0byBVUkwgY2hhbmdlc1xuICBsaXN0ZW46IGZ1bmN0aW9uKCkge1xuICAgIHZhciBhcHAgPSB0aGlzO1xuXG4gICAgaWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgPT09ICdsb2FkaW5nJykge1xuICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIHRoaXMubGlzdGVuLmJpbmQodGhpcykpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLy8gQWRkIGhhbmRsZXIgZm9yIHdoZW4gdGhlIHJvdXRlIGNoYW5nZXNcbiAgICB0aGlzLl9sb2NhdGlvbkNoYW5nZUhhbmRsZXIgPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgYXBwLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCd1cmxDaGFuZ2UnLCB7IGRldGFpbDogZXZlbnQuZGV0YWlsIH0pKTtcbiAgICB9O1xuXG4gICAgLy8gQWRkIGhhbmRsZXIgZm9yIGNsaWNraW5nIGxpbmtzXG4gICAgdGhpcy5fY2xpY2tIYW5kbGVyID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgIHZhciBhbmNob3I7XG4gICAgICBpZiAoICEoYW5jaG9yID0gZXZlbnQudGFyZ2V0LmNsb3Nlc3QoJ2FbaHJlZl0nKSkgKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKGV2ZW50LmRlZmF1bHRQcmV2ZW50ZWQpIHtcbiAgICAgICAgLy8gaWYgc29tZXRoaW5nIGVsc2UgYWxyZWFkeSBoYW5kbGVkIHRoaXMsIHdlIHdvbid0XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIGxpbmtIb3N0ID0gYW5jaG9yLmhvc3QucmVwbGFjZSgvOjgwJHw6NDQzJC8sICcnKTtcbiAgICAgIHZhciB1cmwgPSBhbmNob3IuZ2V0QXR0cmlidXRlKCdocmVmJykucmVwbGFjZSgvXiMvLCAnJyk7XG5cbiAgICAgIGlmIChsaW5rSG9zdCAmJiBsaW5rSG9zdCAhPT0gbG9jYXRpb24uaG9zdCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChldmVudC5tZXRhS2V5IHx8IGV2ZW50LmN0cmxLZXkgfHwgYW5jaG9yLmhhc0F0dHJpYnV0ZSgndGFyZ2V0JykpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgaWYgKGFuY2hvci5ocmVmID09PSBsb2NhdGlvbi5ocmVmICsgJyMnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKCFhbmNob3IuZGlzYWJsZWQpIHtcbiAgICAgICAgYXBwLnJlZGlyZWN0KHVybCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMubG9jYXRpb24ub24oJ2NoYW5nZScsIHRoaXMuX2xvY2F0aW9uQ2hhbmdlSGFuZGxlcik7XG4gICAgdGhpcy5yb290RWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuX2NsaWNrSGFuZGxlcik7XG4gIH0sXG5cbiAgLy8gU3RvcCBsaXN0ZW5pbmdcbiAgc3RvcDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5sb2NhdGlvbi5vZmYoJ2NoYW5nZScsIHRoaXMuX2xvY2F0aW9uQ2hhbmdlSGFuZGxlcik7XG4gICAgdGhpcy5yb290RWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuX2NsaWNrSGFuZGxlcik7XG4gIH1cblxufSk7IiwidmFyIFJvdXRlID0gcmVxdWlyZSgncm91dGVzLWpzJykuUm91dGU7XG52YXIgSWZCaW5kZXIgPSByZXF1aXJlKCdmcmFnbWVudHMtYnVpbHQtaW5zL2JpbmRlcnMvaWYnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGlmQmluZGVyID0gSWZCaW5kZXIoKTtcblxuICBpZkJpbmRlci5jb21waWxlZCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucm91dGVzID0gW107XG5cbiAgICAvLyBTYXZlIGluZGV4IDAgZm9yIHdoZW4gbm8gcm91dGVzIG1hdGNoXG4gICAgdGhpcy50ZW1wbGF0ZXMgPSBbIG51bGwgXTtcbiAgICB0aGlzLmV4cHJlc3Npb24gPSAnJztcblxuICAgIC8vIGVhY2ggY2hpbGQgd2l0aCBhIFtwYXRoXSBhdHRyaWJ1dGUgd2lsbCBkaXNwbGF5IG9ubHkgd2hlbiBpdHMgcGF0aCBtYXRjaGVzIHRoZSBVUkxcbiAgICB3aGlsZSAodGhpcy5lbGVtZW50LmZpcnN0Q2hpbGQpIHtcbiAgICAgIHZhciBjaGlsZCA9IHRoaXMuZWxlbWVudC5maXJzdENoaWxkO1xuICAgICAgdGhpcy5lbGVtZW50LnJlbW92ZUNoaWxkKGNoaWxkKTtcblxuICAgICAgaWYgKGNoaWxkLmhhc0F0dHJpYnV0ZSgnW3BhdGhdJykpIHtcbiAgICAgICAgdmFyIHBhdGggPSBjaGlsZC5nZXRBdHRyaWJ1dGUoJ1twYXRoXScpO1xuICAgICAgICBjaGlsZC5yZW1vdmVBdHRyaWJ1dGUoJ1twYXRoXScpO1xuICAgICAgICB0aGlzLnJvdXRlcy5wdXNoKG5ldyBSb3V0ZShwYXRoICsgJyonKSk7XG4gICAgICAgIHRoaXMudGVtcGxhdGVzLnB1c2godGhpcy5mcmFnbWVudHMuY3JlYXRlVGVtcGxhdGUoY2hpbGQpKTtcbiAgICAgIH0gZWxzZSBpZiAoY2hpbGQuaGFzQXR0cmlidXRlKCdbbm9yb3V0ZV0nKSkge1xuICAgICAgICBjaGlsZC5yZW1vdmVBdHRyaWJ1dGUoJ1tub3JvdXRlXScpO1xuICAgICAgICB0aGlzLnRlbXBsYXRlc1swXSA9IHRoaXMuZnJhZ21lbnRzLmNyZWF0ZVRlbXBsYXRlKGNoaWxkKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgaWZCaW5kZXIuYWRkID0gZnVuY3Rpb24odmlldykge1xuICAgIHRoaXMuZWxlbWVudC5hcHBlbmRDaGlsZCh2aWV3KTtcbiAgfTtcblxuICBpZkJpbmRlci5jcmVhdGVkID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5vblVybENoYW5nZSA9IHRoaXMub25VcmxDaGFuZ2UuYmluZCh0aGlzKTtcbiAgfTtcblxuICB2YXIgYm91bmQgPSBpZkJpbmRlci5ib3VuZDtcbiAgaWZCaW5kZXIuYm91bmQgPSBmdW5jdGlvbigpIHtcbiAgICBib3VuZC5jYWxsKHRoaXMpO1xuICAgIHZhciBub2RlID0gdGhpcy5lbGVtZW50LnBhcmVudE5vZGU7XG4gICAgd2hpbGUgKG5vZGUgJiYgbm9kZS5tYXRjaGVkUm91dGVQYXRoKSB7XG4gICAgICBub2RlID0gbm9kZS5wYXJlbnROb2RlO1xuICAgIH1cbiAgICB0aGlzLmJhc2VVUkkgPSBub2RlLm1hdGNoZWRSb3V0ZVBhdGggfHwgdGhpcy5hcHAubG9jYXRpb24uYmFzZVVSSTtcbiAgICB0aGlzLmFwcC5vbigndXJsQ2hhbmdlJywgdGhpcy5vblVybENoYW5nZSk7XG4gICAgdGhpcy5vblVybENoYW5nZSgpO1xuICB9O1xuXG4gIGlmQmluZGVyLm9uVXJsQ2hhbmdlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHVybCA9IHRoaXMuYXBwLmxvY2F0aW9uLnVybDtcbiAgICB2YXIgbmV3SW5kZXggPSAwO1xuXG4gICAgaWYgKHVybC5pbmRleE9mKHRoaXMuYmFzZVVSSSkgPT09IDApIHtcbiAgICAgIHVybCA9IHVybC5yZXBsYWNlKHRoaXMuYmFzZVVSSSwgJycpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBubyByb3V0ZXMgc2hvdWxkIG1hdGNoIHRoaXMgdXJsIHNpbmNlIGl0IGlzbid0IHdpdGhpbiBvdXIgc3VicGF0aFxuICAgICAgdXJsID0gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAodXJsICE9PSBudWxsKSB7XG4gICAgICB0aGlzLnJvdXRlcy5zb21lKGZ1bmN0aW9uKHJvdXRlLCBpbmRleCkge1xuICAgICAgICBpZiAocm91dGUubWF0Y2godXJsKSkge1xuICAgICAgICAgIHRoaXMubWF0Y2hlZFJvdXRlUGF0aCA9IHVybC5zbGljZSgwLCAtcm91dGUucGFyYW1zWycqJ10ubGVuZ3RoKTtcbiAgICAgICAgICBjb25zb2xlLmxvZygnbWF0Y2hlZFJvdXRlUGF0aDonLCB0aGlzLm1hdGNoZWRSb3V0ZVBhdGgpO1xuICAgICAgICAgIG5ld0luZGV4ID0gaW5kZXg7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0sIHRoaXMpO1xuICAgIH1cblxuICAgIGlmIChuZXdJbmRleCAhPT0gdGhpcy5jdXJyZW50SW5kZXgpIHtcbiAgICAgIHRoaXMuY3VycmVudEluZGV4ID0gbmV3SW5kZXg7XG4gICAgICB0aGlzLnVwZGF0ZWQodGhpcy5jdXJyZW50SW5kZXgpO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gaWZCaW5kZXI7XG59O1xuIiwidmFyIEFwcCA9IHJlcXVpcmUoJy4vYXBwJyk7XG5cbi8vICMgQ2hpcFxuXG4vLyA+IENoaXAuanMgMi4wLjBcbi8vXG4vLyA+IChjKSAyMDEzIEphY29iIFdyaWdodCwgVGVhbVNuYXBcbi8vIENoaXAgbWF5IGJlIGZyZWVseSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXG4vLyBGb3IgYWxsIGRldGFpbHMgYW5kIGRvY3VtZW50YXRpb246XG4vLyA8aHR0cHM6Ly9naXRodWIuY29tL3RlYW1zbmFwL2NoaXAvPlxuXG4vLyBDb250ZW50c1xuLy8gLS0tLS0tLS1cbi8vICogW2NoaXBdKGNoaXAuaHRtbCkgdGhlIG5hbWVzcGFjZSwgY3JlYXRlcyBhcHBzLCBhbmQgcmVnaXN0ZXJzIGJpbmRpbmdzIGFuZCBmaWx0ZXJzXG4vLyAqIFtBcHBdKGFwcC5odG1sKSByZXByZXNlbnRzIGFuIGFwcCB0aGF0IGNhbiBoYXZlIHJvdXRlcywgY29udHJvbGxlcnMsIGFuZCB0ZW1wbGF0ZXMgZGVmaW5lZFxuLy8gKiBbQ29udHJvbGxlcl0oY29udHJvbGxlci5odG1sKSBpcyB1c2VkIGluIHRoZSBiaW5kaW5nIHRvIGF0dGFjaCBkYXRhIGFuZCBydW4gYWN0aW9uc1xuLy8gKiBbUm91dGVyXShyb3V0ZXIuaHRtbCkgaXMgdXNlZCBmb3IgaGFuZGxpbmcgVVJMIHJvdW50aW5nXG4vLyAqIFtEZWZhdWx0IGJpbmRlcnNdKGJpbmRlcnMuaHRtbCkgcmVnaXN0ZXJzIHRoZSBkZWZhdWx0IGJpbmRlcnMgY2hpcCBwcm92aWRlc1xuXG4vLyBDcmVhdGUgQ2hpcCBBcHBcbi8vIC0tLS0tLS0tLS0tLS1cbi8vIENyZWF0ZXMgYSBuZXcgY2hpcCBhcHBcbm1vZHVsZS5leHBvcnRzID0gY2hpcDtcblxuZnVuY3Rpb24gY2hpcChvcHRpb25zKSB7XG4gIHZhciBhcHAgPSBuZXcgQXBwKG9wdGlvbnMpO1xuICBhcHAuaW5pdCgpO1xuICByZXR1cm4gYXBwO1xufVxuXG5jaGlwLkFwcCA9IEFwcDtcbiIsInZhciBjcmVhdGVGcmFnbWVudHMgPSByZXF1aXJlKCdmcmFnbWVudHMtanMnKS5jcmVhdGU7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG5cbiAgdmFyIGZyYWdtZW50cyA9IGNyZWF0ZUZyYWdtZW50cygpO1xuXG4gIC8vIENvbmZpZ3VyZVxuICBmcmFnbWVudHMuc2V0RXhwcmVzc2lvbkRlbGltaXRlcnMoJ2F0dHJpYnV0ZScsICd7eycsICd9fScsIHRydWUpO1xuICBmcmFnbWVudHMuYW5pbWF0ZUF0dHJpYnV0ZSA9ICdbYW5pbWF0ZV0nO1xuICByZXF1aXJlKCdmcmFnbWVudHMtYnVpbHQtaW5zL2FuaW1hdGlvbnMnKShmcmFnbWVudHMpO1xuICByZXF1aXJlKCdmcmFnbWVudHMtYnVpbHQtaW5zL2Zvcm1hdHRlcnMnKShmcmFnbWVudHMpO1xuXG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnKGtleWRvd246KiknLCByZXF1aXJlKCdmcmFnbWVudHMtYnVpbHQtaW5zL2JpbmRlcnMva2V5LWV2ZW50cycpKG51bGwsICdrZXlkb3duJykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJyhrZXl1cDoqKScsIHJlcXVpcmUoJ2ZyYWdtZW50cy1idWlsdC1pbnMvYmluZGVycy9rZXktZXZlbnRzJykobnVsbCwgJ2tleXVwJykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJygqKScsIHJlcXVpcmUoJ2ZyYWdtZW50cy1idWlsdC1pbnMvYmluZGVycy9ldmVudHMnKSgpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCd7Kn0nLCByZXF1aXJlKCdmcmFnbWVudHMtYnVpbHQtaW5zL2JpbmRlcnMvcHJvcGVydGllcycpKCkpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ3t7Kn19JywgcmVxdWlyZSgnZnJhZ21lbnRzLWJ1aWx0LWlucy9iaW5kZXJzL3Byb3BlcnRpZXMtMi13YXknKSgpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCcqPycsIHJlcXVpcmUoJ2ZyYWdtZW50cy1idWlsdC1pbnMvYmluZGVycy9hdHRyaWJ1dGUtbmFtZXMnKSgpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdbc2hvd10nLCByZXF1aXJlKCdmcmFnbWVudHMtYnVpbHQtaW5zL2JpbmRlcnMvc2hvdycpKGZhbHNlKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnW2hpZGVdJywgcmVxdWlyZSgnZnJhZ21lbnRzLWJ1aWx0LWlucy9iaW5kZXJzL3Nob3cnKSh0cnVlKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnW2Zvcl0nLCByZXF1aXJlKCdmcmFnbWVudHMtYnVpbHQtaW5zL2JpbmRlcnMvcmVwZWF0JykoKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnIyonLCByZXF1aXJlKCdmcmFnbWVudHMtYnVpbHQtaW5zL2JpbmRlcnMvcmVmJykoKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnW3RleHRdJywgcmVxdWlyZSgnZnJhZ21lbnRzLWJ1aWx0LWlucy9iaW5kZXJzL3RleHQnKSgpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdbaHRtbF0nLCByZXF1aXJlKCdmcmFnbWVudHMtYnVpbHQtaW5zL2JpbmRlcnMvaHRtbCcpKCkpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ1tzcmNdJywgcmVxdWlyZSgnZnJhZ21lbnRzLWJ1aWx0LWlucy9iaW5kZXJzL3Byb3BlcnRpZXMnKSgnc3JjJykpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ1tsb2ddJywgcmVxdWlyZSgnZnJhZ21lbnRzLWJ1aWx0LWlucy9iaW5kZXJzL2xvZycpKCkpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ1suKl0nLCByZXF1aXJlKCdmcmFnbWVudHMtYnVpbHQtaW5zL2JpbmRlcnMvY2xhc3NlcycpKCkpO1xuICBmcmFnbWVudHMucmVnaXN0ZXJBdHRyaWJ1dGUoJ1tzdHlsZXMuKl0nLCByZXF1aXJlKCdmcmFnbWVudHMtYnVpbHQtaW5zL2JpbmRlcnMvc3R5bGVzJykoKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnW2F1dG9mb2N1c10nLCByZXF1aXJlKCdmcmFnbWVudHMtYnVpbHQtaW5zL2JpbmRlcnMvYXV0b2ZvY3VzJykoKSk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnW2F1dG9zZWxlY3RdJywgcmVxdWlyZSgnZnJhZ21lbnRzLWJ1aWx0LWlucy9iaW5kZXJzL2F1dG9zZWxlY3QnKSgpKTtcbiAgZnJhZ21lbnRzLnJlZ2lzdGVyQXR0cmlidXRlKCdbdmFsdWVdJywgcmVxdWlyZSgnZnJhZ21lbnRzLWJ1aWx0LWlucy9iaW5kZXJzL3ZhbHVlJykoXG4gICAgJ1t2YWx1ZS1ldmVudHNdJyxcbiAgICAnW3ZhbHVlLWZpZWxkXSdcbiAgKSk7XG5cbiAgdmFyIElmQmluZGluZyA9IHJlcXVpcmUoJ2ZyYWdtZW50cy1idWlsdC1pbnMvYmluZGVycy9pZicpKCdbZWxzZS1pZl0nLCAnW2Vsc2VdJywgJ1t1bmxlc3NdJywgJ1t1bmxlc3MtaWZdJyk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnW2lmXScsIElmQmluZGluZyk7XG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnW3VubGVzc10nLCBJZkJpbmRpbmcpO1xuXG4gIGZyYWdtZW50cy5yZWdpc3RlckF0dHJpYnV0ZSgnW3JvdXRlXScsIHJlcXVpcmUoJy4vYmluZGVycy9yb3V0ZScpKCkpO1xuXG4gIHJldHVybiBmcmFnbWVudHM7XG59O1xuIiwiXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFwcCkge1xuXG4gIHJldHVybiB7XG5cbiAgICBhcHA6IGFwcCxcbiAgICBzeW5jOiBhcHAuc3luYyxcbiAgICBzeW5jTm93OiBhcHAuc3luY05vdyxcbiAgICBhZnRlclN5bmM6IGFwcC5hZnRlclN5bmMsXG4gICAgb25TeW5jOiBhcHAub25TeW5jLFxuICAgIG9mZlN5bmM6IGFwcC5vZmZTeW5jLFxuXG4gICAgY3JlYXRlZDogZnVuY3Rpb24oKSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7XG4gICAgICAgIF9vYnNlcnZlcnM6IHsgY29uZmlndXJhYmxlOiB0cnVlLCB2YWx1ZTogW10gfSxcbiAgICAgICAgX2xpc3RlbmVyczogeyBjb25maWd1cmFibGU6IHRydWUsIHZhbHVlOiBbXSB9LFxuICAgICAgICBfYXR0YWNoZWQ6IHsgY29uZmlndXJhYmxlOiB0cnVlLCB2YWx1ZTogZmFsc2UgfSxcbiAgICAgIH0pO1xuICAgIH0sXG5cblxuICAgIGF0dGFjaGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuX2F0dGFjaGVkID0gdHJ1ZTtcbiAgICAgIHRoaXMuX29ic2VydmVycy5mb3JFYWNoKGZ1bmN0aW9uKG9ic2VydmVyKSB7XG4gICAgICAgIG9ic2VydmVyLmJpbmQodGhpcyk7XG4gICAgICB9LCB0aGlzKTtcblxuICAgICAgdGhpcy5fbGlzdGVuZXJzLmZvckVhY2goZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICBpdGVtLnRhcmdldC5hZGRFdmVudExpc3RlbmVyKGl0ZW0uZXZlbnROYW1lLCBpdGVtLmxpc3RlbmVyKTtcbiAgICAgIH0pO1xuICAgIH0sXG5cblxuICAgIGRldGFjaGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuX2F0dGFjaGVkID0gZmFsc2U7XG4gICAgICB0aGlzLl9vYnNlcnZlcnMuZm9yRWFjaChmdW5jdGlvbihvYnNlcnZlcikge1xuICAgICAgICBvYnNlcnZlci51bmJpbmQoKTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLl9saXN0ZW5lcnMuZm9yRWFjaChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIGl0ZW0udGFyZ2V0LnJlbW92ZUV2ZW50TGlzdGVuZXIoaXRlbS5ldmVudE5hbWUsIGl0ZW0ubGlzdGVuZXIpO1xuICAgICAgfSk7XG4gICAgfSxcblxuXG4gICAgb2JzZXJ2ZTogZnVuY3Rpb24oZXhwciwgY2FsbGJhY2spIHtcbiAgICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgICB9XG5cbiAgICAgIHZhciBvYnNlcnZlciA9IGFwcC5vYnNlcnZlKGV4cHIsIGNhbGxiYWNrLCB0aGlzKTtcbiAgICAgIHRoaXMuX29ic2VydmVycy5wdXNoKG9ic2VydmVyKTtcbiAgICAgIGlmICh0aGlzLl9hdHRhY2hlZCkge1xuICAgICAgICAvLyBJZiBub3QgYXR0YWNoZWQgd2lsbCBiaW5kIG9uIGF0dGFjaG1lbnRcbiAgICAgICAgb2JzZXJ2ZXIuYmluZCh0aGlzKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvYnNlcnZlcjtcbiAgICB9LFxuXG5cbiAgICBsaXN0ZW46IGZ1bmN0aW9uKHRhcmdldCwgZXZlbnROYW1lLCBsaXN0ZW5lciwgY29udGV4dCkge1xuICAgICAgaWYgKHR5cGVvZiB0YXJnZXQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGNvbnRleHQgPSBsaXN0ZW5lcjtcbiAgICAgICAgbGlzdGVuZXIgPSBldmVudE5hbWU7XG4gICAgICAgIGV2ZW50TmFtZSA9IHRhcmdldDtcbiAgICAgICAgdGFyZ2V0ID0gdGhpcztcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgIH1cblxuICAgICAgbGlzdGVuZXIgPSBsaXN0ZW5lci5iaW5kKGNvbnRleHQgfHwgdGhpcyk7XG5cbiAgICAgIHZhciBsaXN0ZW5lckRhdGEgPSB7XG4gICAgICAgIHRhcmdldDogdGFyZ2V0LFxuICAgICAgICBldmVudE5hbWU6IGV2ZW50TmFtZSxcbiAgICAgICAgbGlzdGVuZXI6IGxpc3RlbmVyXG4gICAgICB9O1xuXG4gICAgICB0aGlzLl9saXN0ZW5lcnMucHVzaChsaXN0ZW5lckRhdGEpO1xuXG4gICAgICBpZiAodGhpcy5fYXR0YWNoZWQpIHtcbiAgICAgICAgLy8gSWYgbm90IGF0dGFjaGVkIHdpbGwgYWRkIG9uIGF0dGFjaG1lbnRcbiAgICAgICAgdGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBsaXN0ZW5lcik7XG4gICAgICB9XG4gICAgfSxcbiAgfTtcbn07XG4iLCIvKlxuQ29weXJpZ2h0IChjKSAyMDE1IEphY29iIFdyaWdodCA8amFjd3JpZ2h0QGdtYWlsLmNvbT5cblxuUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxub2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xudG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG5mdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuXG5UaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG5cblRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbklNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG5BVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG5MSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuVEhFIFNPRlRXQVJFLlxuKi9cbi8vICMgRGlmZlxuLy8gPiBCYXNlZCBvbiB3b3JrIGZyb20gR29vZ2xlJ3Mgb2JzZXJ2ZS1qcyBwb2x5ZmlsbDogaHR0cHM6Ly9naXRodWIuY29tL1BvbHltZXIvb2JzZXJ2ZS1qc1xuXG4vLyBBIG5hbWVzcGFjZSB0byBzdG9yZSB0aGUgZnVuY3Rpb25zIG9uXG52YXIgZGlmZiA9IGV4cG9ydHM7XG5cbihmdW5jdGlvbigpIHtcblxuICBkaWZmLmNsb25lID0gY2xvbmU7XG4gIGRpZmYudmFsdWVzID0gZGlmZlZhbHVlcztcbiAgZGlmZi5iYXNpYyA9IGRpZmZCYXNpYztcbiAgZGlmZi5vYmplY3RzID0gZGlmZk9iamVjdHM7XG4gIGRpZmYuYXJyYXlzID0gZGlmZkFycmF5cztcblxuXG4gIC8vIEEgY2hhbmdlIHJlY29yZCBmb3IgdGhlIG9iamVjdCBjaGFuZ2VzXG4gIGZ1bmN0aW9uIENoYW5nZVJlY29yZChvYmplY3QsIHR5cGUsIG5hbWUsIG9sZFZhbHVlKSB7XG4gICAgdGhpcy5vYmplY3QgPSBvYmplY3Q7XG4gICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHRoaXMub2xkVmFsdWUgPSBvbGRWYWx1ZTtcbiAgfVxuXG4gIC8vIEEgc3BsaWNlIHJlY29yZCBmb3IgdGhlIGFycmF5IGNoYW5nZXNcbiAgZnVuY3Rpb24gU3BsaWNlKG9iamVjdCwgaW5kZXgsIHJlbW92ZWQsIGFkZGVkQ291bnQpIHtcbiAgICBDaGFuZ2VSZWNvcmQuY2FsbCh0aGlzLCBvYmplY3QsICdzcGxpY2UnLCBTdHJpbmcoaW5kZXgpKTtcbiAgICB0aGlzLmluZGV4ID0gaW5kZXg7XG4gICAgdGhpcy5yZW1vdmVkID0gcmVtb3ZlZDtcbiAgICB0aGlzLmFkZGVkQ291bnQgPSBhZGRlZENvdW50O1xuICB9XG5cbiAgU3BsaWNlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoQ2hhbmdlUmVjb3JkLnByb3RvdHlwZSk7XG5cblxuICAvLyBDcmVhdGVzIGEgY2xvbmUgb3IgY29weSBvZiBhbiBhcnJheSBvciBvYmplY3QgKG9yIHNpbXBseSByZXR1cm5zIGEgc3RyaW5nL251bWJlci9ib29sZWFuIHdoaWNoIGFyZSBpbW11dGFibGUpXG4gIC8vIERvZXMgbm90IHByb3ZpZGUgZGVlcCBjb3BpZXMuXG4gIGZ1bmN0aW9uIGNsb25lKHZhbHVlLCBkZWVwKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICBpZiAoZGVlcCkge1xuICAgICAgICByZXR1cm4gdmFsdWUubWFwKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIGNsb25lKHZhbHVlLCBkZWVwKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdmFsdWUuc2xpY2UoKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGlmICh2YWx1ZS52YWx1ZU9mKCkgIT09IHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBuZXcgdmFsdWUuY29uc3RydWN0b3IodmFsdWUudmFsdWVPZigpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBjb3B5ID0ge307XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB2YWx1ZSkge1xuICAgICAgICAgIHZhciBvYmpWYWx1ZSA9IHZhbHVlW2tleV07XG4gICAgICAgICAgaWYgKGRlZXApIHtcbiAgICAgICAgICAgIG9ialZhbHVlID0gY2xvbmUob2JqVmFsdWUsIGRlZXApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb3B5W2tleV0gPSBvYmpWYWx1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY29weTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgfVxuXG5cbiAgLy8gRGlmZnMgdHdvIHZhbHVlcywgcmV0dXJuaW5nIGEgdHJ1dGh5IHZhbHVlIGlmIHRoZXJlIGFyZSBjaGFuZ2VzIG9yIGBmYWxzZWAgaWYgdGhlcmUgYXJlIG5vIGNoYW5nZXMuIElmIHRoZSB0d29cbiAgLy8gdmFsdWVzIGFyZSBib3RoIGFycmF5cyBvciBib3RoIG9iamVjdHMsIGFuIGFycmF5IG9mIGNoYW5nZXMgKHNwbGljZXMgb3IgY2hhbmdlIHJlY29yZHMpIGJldHdlZW4gdGhlIHR3byB3aWxsIGJlXG4gIC8vIHJldHVybmVkLiBPdGhlcndpc2UgIGB0cnVlYCB3aWxsIGJlIHJldHVybmVkLlxuICBmdW5jdGlvbiBkaWZmVmFsdWVzKHZhbHVlLCBvbGRWYWx1ZSkge1xuICAgIC8vIFNob3J0Y3V0IG91dCBmb3IgdmFsdWVzIHRoYXQgYXJlIGV4YWN0bHkgZXF1YWxcbiAgICBpZiAodmFsdWUgPT09IG9sZFZhbHVlKSByZXR1cm4gZmFsc2U7XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkgJiYgQXJyYXkuaXNBcnJheShvbGRWYWx1ZSkpIHtcbiAgICAgIC8vIElmIGFuIGFycmF5IGhhcyBjaGFuZ2VkIGNhbGN1bGF0ZSB0aGUgc3BsaWNlc1xuICAgICAgdmFyIHNwbGljZXMgPSBkaWZmQXJyYXlzKHZhbHVlLCBvbGRWYWx1ZSk7XG4gICAgICByZXR1cm4gc3BsaWNlcy5sZW5ndGggPyBzcGxpY2VzIDogZmFsc2U7XG4gICAgfSBlbHNlIGlmICh2YWx1ZSAmJiBvbGRWYWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHR5cGVvZiBvbGRWYWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIC8vIElmIGFuIG9iamVjdCBoYXMgY2hhbmdlZCBjYWxjdWxhdGUgdGhlIGNobmFnZXMgYW5kIGNhbGwgdGhlIGNhbGxiYWNrXG4gICAgICAvLyBBbGxvdyBkYXRlcyBhbmQgTnVtYmVyL1N0cmluZyBvYmplY3RzIHRvIGJlIGNvbXBhcmVkXG4gICAgICB2YXIgdmFsdWVWYWx1ZSA9IHZhbHVlLnZhbHVlT2YoKTtcbiAgICAgIHZhciBvbGRWYWx1ZVZhbHVlID0gb2xkVmFsdWUudmFsdWVPZigpO1xuXG4gICAgICAvLyBBbGxvdyBkYXRlcyBhbmQgTnVtYmVyL1N0cmluZyBvYmplY3RzIHRvIGJlIGNvbXBhcmVkXG4gICAgICBpZiAodHlwZW9mIHZhbHVlVmFsdWUgIT09ICdvYmplY3QnICYmIHR5cGVvZiBvbGRWYWx1ZVZhbHVlICE9PSAnb2JqZWN0Jykge1xuICAgICAgICByZXR1cm4gdmFsdWVWYWx1ZSAhPT0gb2xkVmFsdWVWYWx1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBjaGFuZ2VSZWNvcmRzID0gZGlmZk9iamVjdHModmFsdWUsIG9sZFZhbHVlKTtcbiAgICAgICAgcmV0dXJuIGNoYW5nZVJlY29yZHMubGVuZ3RoID8gY2hhbmdlUmVjb3JkcyA6IGZhbHNlO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiBhIHZhbHVlIGhhcyBjaGFuZ2VkIGNhbGwgdGhlIGNhbGxiYWNrXG4gICAgICByZXR1cm4gZGlmZkJhc2ljKHZhbHVlLCBvbGRWYWx1ZSk7XG4gICAgfVxuICB9XG5cblxuICAvLyBEaWZmcyB0d28gYmFzaWMgdHlwZXMsIHJldHVybmluZyB0cnVlIGlmIGNoYW5nZWQgb3IgZmFsc2UgaWYgbm90XG4gIGZ1bmN0aW9uIGRpZmZCYXNpYyh2YWx1ZSwgb2xkVmFsdWUpIHtcbiAgICBpZiAodmFsdWUgJiYgb2xkVmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB0eXBlb2Ygb2xkVmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAvLyBBbGxvdyBkYXRlcyBhbmQgTnVtYmVyL1N0cmluZyBvYmplY3RzIHRvIGJlIGNvbXBhcmVkXG4gICAgICB2YXIgdmFsdWVWYWx1ZSA9IHZhbHVlLnZhbHVlT2YoKTtcbiAgICAgIHZhciBvbGRWYWx1ZVZhbHVlID0gb2xkVmFsdWUudmFsdWVPZigpO1xuXG4gICAgICAvLyBBbGxvdyBkYXRlcyBhbmQgTnVtYmVyL1N0cmluZyBvYmplY3RzIHRvIGJlIGNvbXBhcmVkXG4gICAgICBpZiAodHlwZW9mIHZhbHVlVmFsdWUgIT09ICdvYmplY3QnICYmIHR5cGVvZiBvbGRWYWx1ZVZhbHVlICE9PSAnb2JqZWN0Jykge1xuICAgICAgICByZXR1cm4gZGlmZkJhc2ljKHZhbHVlVmFsdWUsIG9sZFZhbHVlVmFsdWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIElmIGEgdmFsdWUgaGFzIGNoYW5nZWQgY2FsbCB0aGUgY2FsbGJhY2tcbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyAmJiB0eXBlb2Ygb2xkVmFsdWUgPT09ICdudW1iZXInICYmIGlzTmFOKHZhbHVlKSAmJiBpc05hTihvbGRWYWx1ZSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHZhbHVlICE9PSBvbGRWYWx1ZTtcbiAgICB9XG4gIH1cblxuXG4gIC8vIERpZmZzIHR3byBvYmplY3RzIHJldHVybmluZyBhbiBhcnJheSBvZiBjaGFuZ2UgcmVjb3Jkcy4gVGhlIGNoYW5nZSByZWNvcmQgbG9va3MgbGlrZTpcbiAgLy8gYGBgamF2YXNjcmlwdFxuICAvLyB7XG4gIC8vICAgb2JqZWN0OiBvYmplY3QsXG4gIC8vICAgdHlwZTogJ2RlbGV0ZWR8dXBkYXRlZHxuZXcnLFxuICAvLyAgIG5hbWU6ICdwcm9wZXJ0eU5hbWUnLFxuICAvLyAgIG9sZFZhbHVlOiBvbGRWYWx1ZVxuICAvLyB9XG4gIC8vIGBgYFxuICBmdW5jdGlvbiBkaWZmT2JqZWN0cyh2YWx1ZSwgb2xkVmFsdWUpIHtcbiAgICBpZiAoICEodmFsdWUgJiYgb2xkVmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB0eXBlb2Ygb2xkVmFsdWUgPT09ICdvYmplY3QnKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQm90aCB2YWx1ZXMgZm9yIGRpZmYub2JqZWN0IG11c3QgYmUgb2JqZWN0cycpO1xuICAgIH1cbiAgICB2YXIgY2hhbmdlUmVjb3JkcyA9IFtdO1xuICAgIHZhciBwcm9wLCBwcm9wT2xkVmFsdWUsIHByb3BWYWx1ZTtcblxuICAgIC8vIEdvZXMgdGhyb3VnaCB0aGUgb2xkIG9iamVjdCAoc2hvdWxkIGJlIGEgY2xvbmUpIGFuZCBsb29rIGZvciB0aGluZ3MgdGhhdCBhcmUgbm93IGdvbmUgb3IgY2hhbmdlZFxuICAgIGZvciAocHJvcCBpbiBvbGRWYWx1ZSkge1xuICAgICAgcHJvcE9sZFZhbHVlID0gb2xkVmFsdWVbcHJvcF07XG4gICAgICBwcm9wVmFsdWUgPSB2YWx1ZVtwcm9wXTtcblxuICAgICAgLy8gQWxsb3cgZm9yIHRoZSBjYXNlIG9mIG9iai5wcm9wID0gdW5kZWZpbmVkICh3aGljaCBpcyBhIG5ldyBwcm9wZXJ0eSwgZXZlbiBpZiBpdCBpcyB1bmRlZmluZWQpXG4gICAgICBpZiAocHJvcFZhbHVlICE9PSB1bmRlZmluZWQgJiYgIWRpZmZCYXNpYyhwcm9wVmFsdWUsIHByb3BPbGRWYWx1ZSkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHRoZSBwcm9wZXJ0eSBpcyBnb25lIGl0IHdhcyByZW1vdmVkXG4gICAgICBpZiAoISAocHJvcCBpbiB2YWx1ZSkpIHtcbiAgICAgICAgY2hhbmdlUmVjb3Jkcy5wdXNoKG5ldyBDaGFuZ2VSZWNvcmQodmFsdWUsICdkZWxldGUnLCBwcm9wLCBwcm9wT2xkVmFsdWUpKTtcbiAgICAgIH0gZWxzZSBpZiAoZGlmZkJhc2ljKHByb3BWYWx1ZSwgcHJvcE9sZFZhbHVlKSkge1xuICAgICAgICBjaGFuZ2VSZWNvcmRzLnB1c2gobmV3IENoYW5nZVJlY29yZCh2YWx1ZSwgJ3VwZGF0ZScsIHByb3AsIHByb3BPbGRWYWx1ZSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEdvZXMgdGhyb3VnaCB0aGUgb2xkIG9iamVjdCBhbmQgbG9va3MgZm9yIHRoaW5ncyB0aGF0IGFyZSBuZXdcbiAgICBmb3IgKHByb3AgaW4gdmFsdWUpIHtcbiAgICAgIHByb3BWYWx1ZSA9IHZhbHVlW3Byb3BdO1xuICAgICAgaWYgKCEgKHByb3AgaW4gb2xkVmFsdWUpKSB7XG4gICAgICAgIGNoYW5nZVJlY29yZHMucHVzaChuZXcgQ2hhbmdlUmVjb3JkKHZhbHVlLCAnYWRkJywgcHJvcCkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggIT09IG9sZFZhbHVlLmxlbmd0aCkge1xuICAgICAgY2hhbmdlUmVjb3Jkcy5wdXNoKG5ldyBDaGFuZ2VSZWNvcmQodmFsdWUsICd1cGRhdGUnLCAnbGVuZ3RoJywgb2xkVmFsdWUubGVuZ3RoKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNoYW5nZVJlY29yZHM7XG4gIH1cblxuXG5cblxuXG4gIHZhciBFRElUX0xFQVZFID0gMDtcbiAgdmFyIEVESVRfVVBEQVRFID0gMTtcbiAgdmFyIEVESVRfQUREID0gMjtcbiAgdmFyIEVESVRfREVMRVRFID0gMztcblxuXG4gIC8vIERpZmZzIHR3byBhcnJheXMgcmV0dXJuaW5nIGFuIGFycmF5IG9mIHNwbGljZXMuIEEgc3BsaWNlIG9iamVjdCBsb29rcyBsaWtlOlxuICAvLyBgYGBqYXZhc2NyaXB0XG4gIC8vIHtcbiAgLy8gICBpbmRleDogMyxcbiAgLy8gICByZW1vdmVkOiBbaXRlbSwgaXRlbV0sXG4gIC8vICAgYWRkZWRDb3VudDogMFxuICAvLyB9XG4gIC8vIGBgYFxuICBmdW5jdGlvbiBkaWZmQXJyYXlzKHZhbHVlLCBvbGRWYWx1ZSkge1xuICAgIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkgfHwgIUFycmF5LmlzQXJyYXkob2xkVmFsdWUpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCb3RoIHZhbHVlcyBmb3IgZGlmZi5hcnJheSBtdXN0IGJlIGFycmF5cycpO1xuICAgIH1cblxuICAgIHZhciBjdXJyZW50U3RhcnQgPSAwO1xuICAgIHZhciBjdXJyZW50RW5kID0gdmFsdWUubGVuZ3RoO1xuICAgIHZhciBvbGRTdGFydCA9IDA7XG4gICAgdmFyIG9sZEVuZCA9IG9sZFZhbHVlLmxlbmd0aDtcblxuICAgIHZhciBtaW5MZW5ndGggPSBNYXRoLm1pbihjdXJyZW50RW5kLCBvbGRFbmQpO1xuICAgIHZhciBwcmVmaXhDb3VudCA9IHNoYXJlZFByZWZpeCh2YWx1ZSwgb2xkVmFsdWUsIG1pbkxlbmd0aCk7XG4gICAgdmFyIHN1ZmZpeENvdW50ID0gc2hhcmVkU3VmZml4KHZhbHVlLCBvbGRWYWx1ZSwgbWluTGVuZ3RoIC0gcHJlZml4Q291bnQpO1xuXG4gICAgY3VycmVudFN0YXJ0ICs9IHByZWZpeENvdW50O1xuICAgIG9sZFN0YXJ0ICs9IHByZWZpeENvdW50O1xuICAgIGN1cnJlbnRFbmQgLT0gc3VmZml4Q291bnQ7XG4gICAgb2xkRW5kIC09IHN1ZmZpeENvdW50O1xuXG4gICAgaWYgKGN1cnJlbnRFbmQgLSBjdXJyZW50U3RhcnQgPT09IDAgJiYgb2xkRW5kIC0gb2xkU3RhcnQgPT09IDApIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICAvLyBpZiBub3RoaW5nIHdhcyBhZGRlZCwgb25seSByZW1vdmVkIGZyb20gb25lIHNwb3RcbiAgICBpZiAoY3VycmVudFN0YXJ0ID09PSBjdXJyZW50RW5kKSB7XG4gICAgICByZXR1cm4gWyBuZXcgU3BsaWNlKHZhbHVlLCBjdXJyZW50U3RhcnQsIG9sZFZhbHVlLnNsaWNlKG9sZFN0YXJ0LCBvbGRFbmQpLCAwKSBdO1xuICAgIH1cblxuICAgIC8vIGlmIG5vdGhpbmcgd2FzIHJlbW92ZWQsIG9ubHkgYWRkZWQgdG8gb25lIHNwb3RcbiAgICBpZiAob2xkU3RhcnQgPT09IG9sZEVuZCkge1xuICAgICAgcmV0dXJuIFsgbmV3IFNwbGljZSh2YWx1ZSwgY3VycmVudFN0YXJ0LCBbXSwgY3VycmVudEVuZCAtIGN1cnJlbnRTdGFydCkgXTtcbiAgICB9XG5cbiAgICAvLyBhIG1peHR1cmUgb2YgYWRkcyBhbmQgcmVtb3Zlc1xuICAgIHZhciBkaXN0YW5jZXMgPSBjYWxjRWRpdERpc3RhbmNlcyh2YWx1ZSwgY3VycmVudFN0YXJ0LCBjdXJyZW50RW5kLCBvbGRWYWx1ZSwgb2xkU3RhcnQsIG9sZEVuZCk7XG4gICAgdmFyIG9wcyA9IHNwbGljZU9wZXJhdGlvbnNGcm9tRWRpdERpc3RhbmNlcyhkaXN0YW5jZXMpO1xuXG4gICAgdmFyIHNwbGljZSA9IG51bGw7XG4gICAgdmFyIHNwbGljZXMgPSBbXTtcbiAgICB2YXIgaW5kZXggPSBjdXJyZW50U3RhcnQ7XG4gICAgdmFyIG9sZEluZGV4ID0gb2xkU3RhcnQ7XG5cbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IG9wcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIHZhciBvcCA9IG9wc1tpXTtcbiAgICAgIGlmIChvcCA9PT0gRURJVF9MRUFWRSkge1xuICAgICAgICBpZiAoc3BsaWNlKSB7XG4gICAgICAgICAgc3BsaWNlcy5wdXNoKHNwbGljZSk7XG4gICAgICAgICAgc3BsaWNlID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGluZGV4Kys7XG4gICAgICAgIG9sZEluZGV4Kys7XG4gICAgICB9IGVsc2UgaWYgKG9wID09PSBFRElUX1VQREFURSkge1xuICAgICAgICBpZiAoIXNwbGljZSkge1xuICAgICAgICAgIHNwbGljZSA9IG5ldyBTcGxpY2UodmFsdWUsIGluZGV4LCBbXSwgMCk7XG4gICAgICAgIH1cblxuICAgICAgICBzcGxpY2UuYWRkZWRDb3VudCsrO1xuICAgICAgICBpbmRleCsrO1xuXG4gICAgICAgIHNwbGljZS5yZW1vdmVkLnB1c2gob2xkVmFsdWVbb2xkSW5kZXhdKTtcbiAgICAgICAgb2xkSW5kZXgrKztcbiAgICAgIH0gZWxzZSBpZiAob3AgPT09IEVESVRfQUREKSB7XG4gICAgICAgIGlmICghc3BsaWNlKSB7XG4gICAgICAgICAgc3BsaWNlID0gbmV3IFNwbGljZSh2YWx1ZSwgaW5kZXgsIFtdLCAwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNwbGljZS5hZGRlZENvdW50Kys7XG4gICAgICAgIGluZGV4Kys7XG4gICAgICB9IGVsc2UgaWYgKG9wID09PSBFRElUX0RFTEVURSkge1xuICAgICAgICBpZiAoIXNwbGljZSkge1xuICAgICAgICAgIHNwbGljZSA9IG5ldyBTcGxpY2UodmFsdWUsIGluZGV4LCBbXSwgMCk7XG4gICAgICAgIH1cblxuICAgICAgICBzcGxpY2UucmVtb3ZlZC5wdXNoKG9sZFZhbHVlW29sZEluZGV4XSk7XG4gICAgICAgIG9sZEluZGV4Kys7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHNwbGljZSkge1xuICAgICAgc3BsaWNlcy5wdXNoKHNwbGljZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNwbGljZXM7XG4gIH1cblxuXG5cblxuICAvLyBmaW5kIHRoZSBudW1iZXIgb2YgaXRlbXMgYXQgdGhlIGJlZ2lubmluZyB0aGF0IGFyZSB0aGUgc2FtZVxuICBmdW5jdGlvbiBzaGFyZWRQcmVmaXgoY3VycmVudCwgb2xkLCBzZWFyY2hMZW5ndGgpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNlYXJjaExlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoZGlmZkJhc2ljKGN1cnJlbnRbaV0sIG9sZFtpXSkpIHtcbiAgICAgICAgcmV0dXJuIGk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzZWFyY2hMZW5ndGg7XG4gIH1cblxuXG4gIC8vIGZpbmQgdGhlIG51bWJlciBvZiBpdGVtcyBhdCB0aGUgZW5kIHRoYXQgYXJlIHRoZSBzYW1lXG4gIGZ1bmN0aW9uIHNoYXJlZFN1ZmZpeChjdXJyZW50LCBvbGQsIHNlYXJjaExlbmd0aCkge1xuICAgIHZhciBpbmRleDEgPSBjdXJyZW50Lmxlbmd0aDtcbiAgICB2YXIgaW5kZXgyID0gb2xkLmxlbmd0aDtcbiAgICB2YXIgY291bnQgPSAwO1xuICAgIHdoaWxlIChjb3VudCA8IHNlYXJjaExlbmd0aCAmJiAhZGlmZkJhc2ljKGN1cnJlbnRbLS1pbmRleDFdLCBvbGRbLS1pbmRleDJdKSkge1xuICAgICAgY291bnQrKztcbiAgICB9XG4gICAgcmV0dXJuIGNvdW50O1xuICB9XG5cblxuICBmdW5jdGlvbiBzcGxpY2VPcGVyYXRpb25zRnJvbUVkaXREaXN0YW5jZXMoZGlzdGFuY2VzKSB7XG4gICAgdmFyIGkgPSBkaXN0YW5jZXMubGVuZ3RoIC0gMTtcbiAgICB2YXIgaiA9IGRpc3RhbmNlc1swXS5sZW5ndGggLSAxO1xuICAgIHZhciBjdXJyZW50ID0gZGlzdGFuY2VzW2ldW2pdO1xuICAgIHZhciBlZGl0cyA9IFtdO1xuICAgIHdoaWxlIChpID4gMCB8fCBqID4gMCkge1xuICAgICAgaWYgKGkgPT09IDApIHtcbiAgICAgICAgZWRpdHMucHVzaChFRElUX0FERCk7XG4gICAgICAgIGotLTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChqID09PSAwKSB7XG4gICAgICAgIGVkaXRzLnB1c2goRURJVF9ERUxFVEUpO1xuICAgICAgICBpLS07XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICB2YXIgbm9ydGhXZXN0ID0gZGlzdGFuY2VzW2kgLSAxXVtqIC0gMV07XG4gICAgICB2YXIgd2VzdCA9IGRpc3RhbmNlc1tpIC0gMV1bal07XG4gICAgICB2YXIgbm9ydGggPSBkaXN0YW5jZXNbaV1baiAtIDFdO1xuICAgICAgdmFyIG1pbjtcblxuICAgICAgaWYgKHdlc3QgPCBub3J0aCkge1xuICAgICAgICBtaW4gPSB3ZXN0IDwgbm9ydGhXZXN0ID8gd2VzdCA6IG5vcnRoV2VzdDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1pbiA9IG5vcnRoIDwgbm9ydGhXZXN0ID8gbm9ydGggOiBub3J0aFdlc3Q7XG4gICAgICB9XG5cbiAgICAgIGlmIChtaW4gPT09IG5vcnRoV2VzdCkge1xuICAgICAgICBpZiAobm9ydGhXZXN0ID09PSBjdXJyZW50KSB7XG4gICAgICAgICAgZWRpdHMucHVzaChFRElUX0xFQVZFKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBlZGl0cy5wdXNoKEVESVRfVVBEQVRFKTtcbiAgICAgICAgICBjdXJyZW50ID0gbm9ydGhXZXN0O1xuICAgICAgICB9XG4gICAgICAgIGktLTtcbiAgICAgICAgai0tO1xuICAgICAgfSBlbHNlIGlmIChtaW4gPT09IHdlc3QpIHtcbiAgICAgICAgZWRpdHMucHVzaChFRElUX0RFTEVURSk7XG4gICAgICAgIGktLTtcbiAgICAgICAgY3VycmVudCA9IHdlc3Q7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlZGl0cy5wdXNoKEVESVRfQUREKTtcbiAgICAgICAgai0tO1xuICAgICAgICBjdXJyZW50ID0gbm9ydGg7XG4gICAgICB9XG4gICAgfVxuICAgIGVkaXRzLnJldmVyc2UoKTtcbiAgICByZXR1cm4gZWRpdHM7XG4gIH1cblxuXG4gIGZ1bmN0aW9uIGNhbGNFZGl0RGlzdGFuY2VzKGN1cnJlbnQsIGN1cnJlbnRTdGFydCwgY3VycmVudEVuZCwgb2xkLCBvbGRTdGFydCwgb2xkRW5kKSB7XG4gICAgLy8gXCJEZWxldGlvblwiIGNvbHVtbnNcbiAgICB2YXIgcm93Q291bnQgPSBvbGRFbmQgLSBvbGRTdGFydCArIDE7XG4gICAgdmFyIGNvbHVtbkNvdW50ID0gY3VycmVudEVuZCAtIGN1cnJlbnRTdGFydCArIDE7XG4gICAgdmFyIGRpc3RhbmNlcyA9IG5ldyBBcnJheShyb3dDb3VudCk7XG4gICAgdmFyIGksIGo7XG5cbiAgICAvLyBcIkFkZGl0aW9uXCIgcm93cy4gSW5pdGlhbGl6ZSBudWxsIGNvbHVtbi5cbiAgICBmb3IgKGkgPSAwOyBpIDwgcm93Q291bnQ7IGkrKykge1xuICAgICAgZGlzdGFuY2VzW2ldID0gbmV3IEFycmF5KGNvbHVtbkNvdW50KTtcbiAgICAgIGRpc3RhbmNlc1tpXVswXSA9IGk7XG4gICAgfVxuXG4gICAgLy8gSW5pdGlhbGl6ZSBudWxsIHJvd1xuICAgIGZvciAoaiA9IDA7IGogPCBjb2x1bW5Db3VudDsgaisrKSB7XG4gICAgICBkaXN0YW5jZXNbMF1bal0gPSBqO1xuICAgIH1cblxuICAgIGZvciAoaSA9IDE7IGkgPCByb3dDb3VudDsgaSsrKSB7XG4gICAgICBmb3IgKGogPSAxOyBqIDwgY29sdW1uQ291bnQ7IGorKykge1xuICAgICAgICBpZiAoIWRpZmZCYXNpYyhjdXJyZW50W2N1cnJlbnRTdGFydCArIGogLSAxXSwgb2xkW29sZFN0YXJ0ICsgaSAtIDFdKSkge1xuICAgICAgICAgIGRpc3RhbmNlc1tpXVtqXSA9IGRpc3RhbmNlc1tpIC0gMV1baiAtIDFdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciBub3J0aCA9IGRpc3RhbmNlc1tpIC0gMV1bal0gKyAxO1xuICAgICAgICAgIHZhciB3ZXN0ID0gZGlzdGFuY2VzW2ldW2ogLSAxXSArIDE7XG4gICAgICAgICAgZGlzdGFuY2VzW2ldW2pdID0gbm9ydGggPCB3ZXN0ID8gbm9ydGggOiB3ZXN0O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRpc3RhbmNlcztcbiAgfVxufSkoKTtcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9zcmMvZXhwcmVzc2lvbnMnKTtcbiIsInZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcbnZhciBzdHJpbmdzID0gcmVxdWlyZSgnLi9zdHJpbmdzJyk7XG52YXIgZm9ybWF0dGVyUGFyc2VyID0gcmVxdWlyZSgnLi9mb3JtYXR0ZXJzJyk7XG52YXIgcHJvcGVydHlDaGFpbnMgPSByZXF1aXJlKCcuL3Byb3BlcnR5LWNoYWlucycpO1xudmFyIHZhbHVlUHJvcGVydHkgPSAnX3ZhbHVlXyc7XG52YXIgY2FjaGUgPSB7fTtcblxuZXhwb3J0cy5nbG9iYWxzID0ge307XG5cblxuZXhwb3J0cy5wYXJzZSA9IGZ1bmN0aW9uKGV4cHIsIGdsb2JhbHMsIGZvcm1hdHRlcnMsIGV4dHJhQXJncykge1xuICBpZiAoIUFycmF5LmlzQXJyYXkoZXh0cmFBcmdzKSkgZXh0cmFBcmdzID0gW107XG4gIHZhciBjYWNoZUtleSA9IGV4cHIgKyAnfCcgKyBleHRyYUFyZ3Muam9pbignLCcpO1xuICAvLyBSZXR1cm5zIHRoZSBjYWNoZWQgZnVuY3Rpb24gZm9yIHRoaXMgZXhwcmVzc2lvbiBpZiBpdCBleGlzdHMuXG4gIHZhciBmdW5jID0gY2FjaGVbY2FjaGVLZXldO1xuICBpZiAoZnVuYykge1xuICAgIHJldHVybiBmdW5jO1xuICB9XG5cbiAgdmFyIG9yaWdpbmFsID0gZXhwcjtcbiAgdmFyIGlzU2V0dGVyID0gKGV4dHJhQXJnc1swXSA9PT0gdmFsdWVQcm9wZXJ0eSk7XG4gIC8vIEFsbG93ICchcHJvcCcgdG8gYmVjb21lICdwcm9wID0gIXZhbHVlJ1xuICBpZiAoaXNTZXR0ZXIgJiYgZXhwci5jaGFyQXQoMCkgPT09ICchJykge1xuICAgIGV4cHIgPSBleHByLnNsaWNlKDEpO1xuICAgIHZhbHVlUHJvcGVydHkgPSAnIScgKyB2YWx1ZVByb3BlcnR5O1xuICB9XG5cbiAgZXhwciA9IHN0cmluZ3MucHVsbE91dFN0cmluZ3MoZXhwcik7XG4gIGV4cHIgPSBmb3JtYXR0ZXJQYXJzZXIucGFyc2VGb3JtYXR0ZXJzKGV4cHIpO1xuICBleHByID0gcHJvcGVydHlDaGFpbnMucGFyc2VFeHByZXNzaW9uKGV4cHIsIGdldFZhcmlhYmxlcyhnbG9iYWxzLCBleHRyYUFyZ3MpKTtcbiAgaWYgKCFpc1NldHRlcikge1xuICAgIHZhciBsaW5lcyA9IGV4cHIuc3BsaXQoJ1xcbicpO1xuICAgIGxpbmVzW2xpbmVzLmxlbmd0aCAtIDFdID0gJ3JldHVybiAnICsgbGluZXNbbGluZXMubGVuZ3RoIC0gMV07XG4gICAgZXhwciA9IGxpbmVzLmpvaW4oJ1xcbicpO1xuICB9XG4gIGV4cHIgPSBzdHJpbmdzLnB1dEluU3RyaW5ncyhleHByKTtcbiAgZnVuYyA9IGNvbXBpbGVFeHByZXNzaW9uKG9yaWdpbmFsLCBleHByLCBnbG9iYWxzLCBmb3JtYXR0ZXJzLCBleHRyYUFyZ3MpO1xuICBmdW5jLmV4cHIgPSBleHByO1xuICBjYWNoZVtjYWNoZUtleV0gPSBmdW5jO1xuICByZXR1cm4gZnVuYztcbn07XG5cblxuZXhwb3J0cy5wYXJzZVNldHRlciA9IGZ1bmN0aW9uKGV4cHIsIGdsb2JhbHMsIGZvcm1hdHRlcnMsIGV4dHJhQXJncykge1xuICBpZiAoIUFycmF5LmlzQXJyYXkoZXh0cmFBcmdzKSkgZXh0cmFBcmdzID0gW107XG5cbiAgLy8gQWRkIF92YWx1ZV8gYXMgdGhlIGZpcnN0IGV4dHJhIGFyZ3VtZW50XG4gIGV4dHJhQXJncy51bnNoaWZ0KHZhbHVlUHJvcGVydHkpO1xuICBleHByID0gZXhwci5yZXBsYWNlKC8oXFxzKlxcfHwkKS8sICcgPSBfdmFsdWVfJDEnKTtcblxuICByZXR1cm4gZXhwb3J0cy5wYXJzZShleHByLCBnbG9iYWxzLCBmb3JtYXR0ZXJzLCBleHRyYUFyZ3MpO1xufTtcblxuXG5mdW5jdGlvbiBnZXRWYXJpYWJsZXMoZ2xvYmFscywgZXh0cmFBcmdzKSB7XG4gIHZhciB2YXJpYWJsZXMgPSB7fTtcblxuICBPYmplY3Qua2V5cyhleHBvcnRzLmdsb2JhbHMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgdmFyaWFibGVzW2tleV0gPSBleHBvcnRzLmdsb2JhbHNba2V5XTtcbiAgfSk7XG5cbiAgaWYgKGdsb2JhbHMpIHtcbiAgICBPYmplY3Qua2V5cyhnbG9iYWxzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgdmFyaWFibGVzW2tleV0gPSBnbG9iYWxzW2tleV07XG4gICAgfSk7XG4gIH1cblxuICBleHRyYUFyZ3MuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICB2YXJpYWJsZXNba2V5XSA9IG51bGw7XG4gIH0pO1xuXG4gIHJldHVybiB2YXJpYWJsZXM7XG59XG5cblxuXG5mdW5jdGlvbiBjb21waWxlRXhwcmVzc2lvbihvcmlnaW5hbCwgZXhwciwgZ2xvYmFscywgZm9ybWF0dGVycywgZXh0cmFBcmdzKSB7XG4gIHZhciBmdW5jLCBhcmdzID0gWydfZ2xvYmFsc18nLCAnX2Zvcm1hdHRlcnNfJ10uY29uY2F0KGV4dHJhQXJncykuY29uY2F0KGV4cHIpO1xuXG4gIHRyeSB7XG4gICAgZnVuYyA9IEZ1bmN0aW9uLmFwcGx5KG51bGwsIGFyZ3MpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgLy8gVGhyb3dzIGFuIGVycm9yIGlmIHRoZSBleHByZXNzaW9uIHdhcyBub3QgdmFsaWQgSmF2YVNjcmlwdFxuICAgIHRocm93IG5ldyBFcnJvcignQmFkIGV4cHJlc3Npb246ICcgKyBvcmlnaW5hbCArICdcXG4nICsgJ0NvbXBpbGVkIGV4cHJlc3Npb246XFxuJyArIGV4cHIgKyAnXFxuJyArIGUubWVzc2FnZSk7XG4gIH1cblxuICByZXR1cm4gYmluZEFyZ3VtZW50cyhmdW5jLCBnbG9iYWxzLCBmb3JtYXR0ZXJzKTtcbn1cblxuXG4vLyBhIGN1c3RvbSBcImJpbmRcIiBmdW5jdGlvbiB0byBiaW5kIGFyZ3VtZW50cyB0byBhIGZ1bmN0aW9uIHdpdGhvdXQgYmluZGluZyB0aGUgY29udGV4dFxuZnVuY3Rpb24gYmluZEFyZ3VtZW50cyhmdW5jKSB7XG4gIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGZ1bmMuYXBwbHkodGhpcywgYXJncy5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG4gIH1cbn1cbiIsIlxuLy8gZmluZHMgcGlwZXMgdGhhdCBhcmUgbm90IE9ScyAoaS5lLiBgIHwgYCBub3QgYCB8fCBgKSBmb3IgZm9ybWF0dGVyc1xudmFyIHBpcGVSZWdleCA9IC9cXHwoXFx8KT8vZztcblxuLy8gQSBzdHJpbmcgdGhhdCB3b3VsZCBub3QgYXBwZWFyIGluIHZhbGlkIEphdmFTY3JpcHRcbnZhciBwbGFjZWhvbGRlciA9ICdAQEAnO1xudmFyIHBsYWNlaG9sZGVyUmVnZXggPSBuZXcgUmVnRXhwKCdcXFxccyonICsgcGxhY2Vob2xkZXIgKyAnXFxcXHMqJyk7XG5cbi8vIGRldGVybWluZXMgd2hldGhlciBhbiBleHByZXNzaW9uIGlzIGEgc2V0dGVyIG9yIGdldHRlciAoYG5hbWVgIHZzIGBuYW1lID0gJ2JvYidgKVxudmFyIHNldHRlclJlZ2V4ID0gL1xccz1cXHMvO1xuXG4vLyBmaW5kcyB0aGUgcGFydHMgb2YgYSBmb3JtYXR0ZXIsIG5hbWUgYW5kIGFyZ3MgKGUuZy4gYGZvbyhiYXIpYClcbnZhciBmb3JtYXR0ZXJSZWdleCA9IC9eKFteXFwoXSspKD86XFwoKC4qKVxcKSk/JC87XG5cbi8vIGZpbmRzIGFyZ3VtZW50IHNlcGFyYXRvcnMgZm9yIGZvcm1hdHRlcnMgKGBhcmcxLCBhcmcyYClcbnZhciBhcmdTZXBhcmF0b3IgPSAvXFxzKixcXHMqL2c7XG5cblxuLyoqXG4gKiBGaW5kcyB0aGUgZm9ybWF0dGVycyB3aXRoaW4gYW4gZXhwcmVzc2lvbiBhbmQgY29udmVydHMgdGhlbSB0byB0aGUgY29ycmVjdCBKYXZhU2NyaXB0IGVxdWl2YWxlbnQuXG4gKi9cbmV4cG9ydHMucGFyc2VGb3JtYXR0ZXJzID0gZnVuY3Rpb24oZXhwcikge1xuICAvLyBDb252ZXJ0cyBgbmFtZSB8IHVwcGVyIHwgZm9vKGJhcilgIGludG8gYG5hbWUgQEBAIHVwcGVyIEBAQCBmb28oYmFyKWBcbiAgZXhwciA9IGV4cHIucmVwbGFjZShwaXBlUmVnZXgsIGZ1bmN0aW9uKG1hdGNoLCBvckluZGljYXRvcikge1xuICAgIGlmIChvckluZGljYXRvcikgcmV0dXJuIG1hdGNoO1xuICAgIHJldHVybiBwbGFjZWhvbGRlcjtcbiAgfSk7XG5cbiAgLy8gc3BsaXRzIHRoZSBzdHJpbmcgYnkgXCJAQEBcIiwgcHVsbHMgb2YgdGhlIGZpcnN0IGFzIHRoZSBleHByLCB0aGUgcmVtYWluaW5nIGFyZSBmb3JtYXR0ZXJzXG4gIGZvcm1hdHRlcnMgPSBleHByLnNwbGl0KHBsYWNlaG9sZGVyUmVnZXgpO1xuICBleHByID0gZm9ybWF0dGVycy5zaGlmdCgpO1xuICBpZiAoIWZvcm1hdHRlcnMubGVuZ3RoKSByZXR1cm4gZXhwcjtcblxuICAvLyBQcm9jZXNzZXMgdGhlIGZvcm1hdHRlcnNcbiAgLy8gSWYgdGhlIGV4cHJlc3Npb24gaXMgYSBzZXR0ZXIgdGhlIHZhbHVlIHdpbGwgYmUgcnVuIHRocm91Z2ggdGhlIGZvcm1hdHRlcnNcbiAgdmFyIHNldHRlciA9ICcnO1xuICB2YXIgdmFsdWUgPSBleHByO1xuXG4gIGlmIChzZXR0ZXJSZWdleC50ZXN0KGV4cHIpKSB7XG4gICAgdmFyIHBhcnRzID0gZXhwci5zcGxpdChzZXR0ZXJSZWdleCk7XG4gICAgc2V0dGVyID0gcGFydHNbMF0gKyAnID0gJztcbiAgICB2YWx1ZSA9IHBhcnRzWzFdO1xuICB9XG5cbiAgLy8gUHJvY2Vzc2VzIHRoZSBmb3JtYXR0ZXJzXG4gIGZvcm1hdHRlcnMuZm9yRWFjaChmdW5jdGlvbihmb3JtYXR0ZXIpIHtcbiAgICB2YXIgbWF0Y2ggPSBmb3JtYXR0ZXIudHJpbSgpLm1hdGNoKGZvcm1hdHRlclJlZ2V4KTtcblxuICAgIGlmICghbWF0Y2gpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRm9ybWF0dGVyIGlzIGludmFsaWQ6ICcgKyBmb3JtYXR0ZXIpO1xuICAgIH1cblxuICAgIHZhciBmb3JtYXR0ZXJOYW1lID0gbWF0Y2hbMV07XG4gICAgdmFyIGFyZ3MgPSBtYXRjaFsyXSA/IG1hdGNoWzJdLnNwbGl0KGFyZ1NlcGFyYXRvcikgOiBbXTtcblxuICAgIC8vIEFkZCB0aGUgcHJldmlvdXMgdmFsdWUgYXMgdGhlIGZpcnN0IGFyZ3VtZW50XG4gICAgYXJncy51bnNoaWZ0KHZhbHVlKTtcblxuICAgIC8vIElmIHRoaXMgaXMgYSBzZXR0ZXIgZXhwciwgYmUgc3VyZSB0byBhZGQgdGhlIGBpc1NldHRlcmAgZmxhZyBhdCB0aGUgZW5kIG9mIHRoZSBmb3JtYXR0ZXIncyBhcmd1bWVudHNcbiAgICBpZiAoc2V0dGVyKSB7XG4gICAgICBhcmdzLnB1c2godHJ1ZSk7XG4gICAgfVxuXG4gICAgLy8gU2V0IHRoZSB2YWx1ZSB0byBiZWNvbWUgdGhlIHJlc3VsdCBvZiB0aGlzIGZvcm1hdHRlciwgc28gdGhlIG5leHQgZm9ybWF0dGVyIGNhbiB3cmFwIGl0LlxuICAgIC8vIENhbGwgZm9ybWF0dGVycyBpbiB0aGUgY3VycmVudCBjb250ZXh0LlxuICAgIHZhbHVlID0gJ19mb3JtYXR0ZXJzXy4nICsgZm9ybWF0dGVyTmFtZSArICcuY2FsbCh0aGlzLCAnICsgYXJncy5qb2luKCcsICcpICsgJyknO1xuICB9KTtcblxuICByZXR1cm4gc2V0dGVyICsgdmFsdWU7XG59O1xuIiwidmFyIHJlZmVyZW5jZUNvdW50ID0gMDtcbnZhciBjdXJyZW50UmVmZXJlbmNlID0gMDtcbnZhciBjdXJyZW50SW5kZXggPSAwO1xudmFyIGZpbmlzaGVkQ2hhaW4gPSBmYWxzZTtcbnZhciBjb250aW51YXRpb24gPSBmYWxzZTtcbnZhciBnbG9iYWxzID0gbnVsbDtcbnZhciBkZWZhdWx0R2xvYmFscyA9IHtcbiAgcmV0dXJuOiBudWxsLFxuICB0cnVlOiBudWxsLFxuICBmYWxzZTogbnVsbCxcbiAgdW5kZWZpbmVkOiBudWxsLFxuICBudWxsOiBudWxsLFxuICB0aGlzOiBudWxsLFxuICB3aW5kb3c6IG51bGwsXG4gIE1hdGg6IG51bGwsXG4gIHBhcnNlSW50OiBudWxsLFxuICBwYXJzZUZsb2F0OiBudWxsLFxuICBpc05hTjogbnVsbCxcbiAgQXJyYXk6IG51bGwsXG4gIHR5cGVvZjogbnVsbCxcbiAgX2dsb2JhbHNfOiBudWxsLFxuICBfZm9ybWF0dGVyc186IG51bGwsXG4gIF92YWx1ZV86IG51bGwsXG59O1xuXG5cbi8vIG1hdGNoZXMgcHJvcGVydHkgY2hhaW5zIChlLmcuIGBuYW1lYCwgYHVzZXIubmFtZWAsIGFuZCBgdXNlci5mdWxsTmFtZSgpLmNhcGl0YWxpemUoKWApXG52YXIgcHJvcGVydHlSZWdleCA9IC8oKFxce3wsfFxcLik/XFxzKikoW2EteiRfXFwkXSg/OlthLXpfXFwkMC05XFwuLV18XFxbWydcIlxcZF0rXFxdKSopKFxccyooOnxcXCh8XFxbKT8pL2dpO1xuLyoqXG4gKiBCcm9rZW4gZG93blxuICpcbiAqICgoXFx7fCx8XFwuKT9cXHMqKVxuICogcHJlZml4OiBtYXRjaGVzIG9uIG9iamVjdCBsaXRlcmFscyBzbyB3ZSBjYW4gc2tpcCAoaW4gYHsgZm9vOiBiYXIgfWAgXCJmb29cIiBpcyBub3QgYSBwcm9wZXJ0eSkuIEFsc28gcGlja3MgdXAgb25cbiAqIHVuZmluaXNoZWQgY2hhaW5zIHRoYXQgaGFkIGZ1bmN0aW9uIGNhbGxzIG9yIGJyYWNrZXRzIHdlIGNvdWxkbid0IGZpbmlzaCBzdWNoIGFzIHRoZSBkb3QgaW4gYC50ZXN0YCBhZnRlciB0aGUgY2hhaW5cbiAqIGBmb28uYmFyKCkudGVzdGAuXG4gKlxuICogKFthLXokX1xcJF0oPzpbYS16X1xcJDAtOVxcLi1dfFxcW1snXCJcXGRdK1xcXSkqKVxuICogcHJvcGVydHkgY2hhaW46IG1hdGNoZXMgcHJvcGVydHkgY2hhaW5zIHN1Y2ggYXMgdGhlIGZvbGxvd2luZyAoc3RyaW5ncycgY29udGVudHMgYXJlIHJlbW92ZWQgYXQgdGhpcyBzdGVwKVxuICogICBgZm9vLCBmb28uYmFyLCBmb28uYmFyWzBdLCBmb28uYmFyWzBdLnRlc3QsIGZvby5iYXJbJyddLnRlc3RgXG4gKiAgIERvZXMgbm90IG1hdGNoIHRocm91Z2ggZnVuY3Rpb25zIGNhbGxzIG9yIHRocm91Z2ggYnJhY2tldHMgd2hpY2ggY29udGFpbiB2YXJpYWJsZXMuXG4gKiAgIGBmb28uYmFyKCkudGVzdCwgZm9vLmJhcltwcm9wXS50ZXN0YFxuICogICBJbiB0aGVzZSBjYXNlcyBpdCB3b3VsZCBvbmx5IG1hdGNoIGBmb28uYmFyYCwgYC50ZXN0YCwgYW5kIGBwcm9wYFxuICpcbiAqIChcXHMqKDp8XFwofFxcWyk/KVxuICogcG9zdGZpeDogbWF0Y2hlcyB0cmFpbGluZyBjaGFyYWN0ZXJzIHRvIGRldGVybWluZSBpZiB0aGlzIGlzIGFuIG9iamVjdCBwcm9wZXJ0eSBvciBhIGZ1bmN0aW9uIGNhbGwgZXRjLiBXaWxsIG1hdGNoXG4gKiB0aGUgY29sb24gYWZ0ZXIgXCJmb29cIiBpbiBgeyBmb286ICdiYXInIH1gLCB0aGUgZmlyc3QgcGFyZW50aGVzaXMgaW4gYG9iai5mb28oYmFyKWAsIHRoZSB0aGUgZmlyc3QgYnJhY2tldCBpblxuICogYGZvb1tiYXJdYC5cbiAqL1xuXG4vLyBsaW5rcyBpbiBhIHByb3BlcnR5IGNoYWluXG52YXIgY2hhaW5MaW5rc1JlZ2V4ID0gL1xcLnxcXFsvZztcblxuLy8gdGhlIHByb3BlcnR5IG5hbWUgcGFydCBvZiBsaW5rc1xudmFyIGNoYWluTGlua1JlZ2V4ID0gL1xcLnxcXFt8XFwoLztcblxudmFyIGFuZFJlZ2V4ID0gLyBhbmQgL2c7XG52YXIgb3JSZWdleCA9IC8gb3IgL2c7XG5cblxuZXhwb3J0cy5wYXJzZUV4cHJlc3Npb24gPSBmdW5jdGlvbihleHByLCBfZ2xvYmFscykge1xuICAvLyBSZXNldCBhbGwgdmFsdWVzXG4gIHJlZmVyZW5jZUNvdW50ID0gMDtcbiAgY3VycmVudFJlZmVyZW5jZSA9IDA7XG4gIGN1cnJlbnRJbmRleCA9IDA7XG4gIGZpbmlzaGVkQ2hhaW4gPSBmYWxzZTtcbiAgY29udGludWF0aW9uID0gZmFsc2U7XG4gIGdsb2JhbHMgPSBfZ2xvYmFscztcblxuICBleHByID0gcmVwbGFjZUFuZHNBbmRPcnMoZXhwcik7XG4gIGlmIChleHByLmluZGV4T2YoJyA9ICcpICE9PSAtMSkge1xuICAgIHZhciBwYXJ0cyA9IGV4cHIuc3BsaXQoJyA9ICcpO1xuICAgIHZhciBzZXR0ZXIgPSBwYXJ0c1swXTtcbiAgICB2YXIgdmFsdWUgPSBwYXJ0c1sxXTtcbiAgICBzZXR0ZXIgPSBwYXJzZVByb3BlcnR5Q2hhaW5zKHNldHRlcikucmVwbGFjZSgvXlxcKHxcXCkkL2csICcnKTtcbiAgICB2YWx1ZSA9IHBhcnNlUHJvcGVydHlDaGFpbnModmFsdWUpO1xuICAgIGV4cHIgPSBzZXR0ZXIgKyAnID0gJyArIHZhbHVlO1xuICB9IGVsc2Uge1xuICAgIGV4cHIgPSBwYXJzZVByb3BlcnR5Q2hhaW5zKGV4cHIpO1xuICB9XG4gIGV4cHIgPSBhZGRSZWZlcmVuY2VzKGV4cHIpXG5cbiAgLy8gUmVzZXQgYWZ0ZXIgcGFyc2UgaXMgZG9uZVxuICBnbG9iYWxzID0gbnVsbDtcblxuICByZXR1cm4gZXhwcjtcbn07XG5cblxuLyoqXG4gKiBGaW5kcyBhbmQgcGFyc2VzIHRoZSBwcm9wZXJ0eSBjaGFpbnMgaW4gYW4gZXhwcmVzc2lvbi5cbiAqL1xuZnVuY3Rpb24gcGFyc2VQcm9wZXJ0eUNoYWlucyhleHByKSB7XG4gIHZhciBwYXJzZWRFeHByID0gJycsIGNoYWluO1xuXG4gIC8vIGFsbG93IHJlY3Vyc2lvbiAoZS5nLiBpbnRvIGZ1bmN0aW9uIGFyZ3MpIGJ5IHJlc2V0dGluZyBwcm9wZXJ0eVJlZ2V4XG4gIC8vIFRoaXMgaXMgbW9yZSBlZmZpY2llbnQgdGhhbiBjcmVhdGluZyBhIG5ldyByZWdleCBmb3IgZWFjaCBjaGFpbiwgSSBhc3N1bWVcbiAgdmFyIHByZXZDdXJyZW50SW5kZXggPSBjdXJyZW50SW5kZXg7XG4gIHZhciBwcmV2TGFzdEluZGV4ID0gcHJvcGVydHlSZWdleC5sYXN0SW5kZXg7XG5cbiAgY3VycmVudEluZGV4ID0gMDtcbiAgcHJvcGVydHlSZWdleC5sYXN0SW5kZXggPSAwO1xuICB3aGlsZSAoKGNoYWluID0gbmV4dENoYWluKGV4cHIpKSAhPT0gZmFsc2UpIHtcbiAgICBwYXJzZWRFeHByICs9IGNoYWluO1xuICB9XG5cbiAgLy8gUmVzZXQgaW5kZXhlc1xuICBjdXJyZW50SW5kZXggPSBwcmV2Q3VycmVudEluZGV4O1xuICBwcm9wZXJ0eVJlZ2V4Lmxhc3RJbmRleCA9IHByZXZMYXN0SW5kZXg7XG4gIHJldHVybiBwYXJzZWRFeHByO1xufTtcblxuXG5mdW5jdGlvbiBuZXh0Q2hhaW4oZXhwcikge1xuICBpZiAoZmluaXNoZWRDaGFpbikge1xuICAgIHJldHVybiAoZmluaXNoZWRDaGFpbiA9IGZhbHNlKTtcbiAgfVxuICB2YXIgbWF0Y2ggPSBwcm9wZXJ0eVJlZ2V4LmV4ZWMoZXhwcik7XG4gIGlmICghbWF0Y2gpIHtcbiAgICBmaW5pc2hlZENoYWluID0gdHJ1ZSAvLyBtYWtlIHN1cmUgbmV4dCBjYWxsIHdlIHJldHVybiBmYWxzZVxuICAgIHJldHVybiBleHByLnNsaWNlKGN1cnJlbnRJbmRleCk7XG4gIH1cblxuICAvLyBgcHJlZml4YCBpcyBgb2JqSW5kaWNhdG9yYCB3aXRoIHRoZSB3aGl0ZXNwYWNlIHRoYXQgbWF5IGNvbWUgYWZ0ZXIgaXQuXG4gIHZhciBwcmVmaXggPSBtYXRjaFsxXTtcblxuICAvLyBgb2JqSW5kaWNhdG9yYCBpcyBge2Agb3IgYCxgIGFuZCBsZXQncyB1cyBrbm93IHRoaXMgaXMgYW4gb2JqZWN0IHByb3BlcnR5XG4gIC8vIG5hbWUgKGUuZy4gcHJvcCBpbiBge3Byb3A6ZmFsc2V9YCkuXG4gIHZhciBvYmpJbmRpY2F0b3IgPSBtYXRjaFsyXTtcblxuICAvLyBgcHJvcENoYWluYCBpcyB0aGUgY2hhaW4gb2YgcHJvcGVydGllcyBtYXRjaGVkIChlLmcuIGB0aGlzLnVzZXIuZW1haWxgKS5cbiAgdmFyIHByb3BDaGFpbiA9IG1hdGNoWzNdO1xuXG4gIC8vIGBwb3N0Zml4YCBpcyB0aGUgYGNvbG9uT3JQYXJlbmAgd2l0aCB3aGl0ZXNwYWNlIGJlZm9yZSBpdC5cbiAgdmFyIHBvc3RmaXggPSBtYXRjaFs0XTtcblxuICAvLyBgY29sb25PclBhcmVuYCBtYXRjaGVzIHRoZSBjb2xvbiAoOikgYWZ0ZXIgdGhlIHByb3BlcnR5IChpZiBpdCBpcyBhbiBvYmplY3QpXG4gIC8vIG9yIHBhcmVudGhlc2lzIGlmIGl0IGlzIGEgZnVuY3Rpb24uIFdlIHVzZSBgY29sb25PclBhcmVuYCBhbmQgYG9iakluZGljYXRvcmBcbiAgLy8gdG8ga25vdyBpZiBpdCBpcyBhbiBvYmplY3QuXG4gIHZhciBjb2xvbk9yUGFyZW4gPSBtYXRjaFs1XTtcblxuICBtYXRjaCA9IG1hdGNoWzBdO1xuXG4gIHZhciBza2lwcGVkID0gZXhwci5zbGljZShjdXJyZW50SW5kZXgsIHByb3BlcnR5UmVnZXgubGFzdEluZGV4IC0gbWF0Y2gubGVuZ3RoKTtcbiAgY3VycmVudEluZGV4ID0gcHJvcGVydHlSZWdleC5sYXN0SW5kZXg7XG5cbiAgLy8gc2tpcHMgb2JqZWN0IGtleXMgZS5nLiB0ZXN0IGluIGB7dGVzdDp0cnVlfWAuXG4gIGlmIChvYmpJbmRpY2F0b3IgJiYgY29sb25PclBhcmVuID09PSAnOicpIHtcbiAgICByZXR1cm4gc2tpcHBlZCArIG1hdGNoO1xuICB9XG5cbiAgcmV0dXJuIHNraXBwZWQgKyBwYXJzZUNoYWluKHByZWZpeCwgcHJvcENoYWluLCBwb3N0Zml4LCBjb2xvbk9yUGFyZW4sIGV4cHIpO1xufVxuXG5cbmZ1bmN0aW9uIHBhcnNlQ2hhaW4ocHJlZml4LCBwcm9wQ2hhaW4sIHBvc3RmaXgsIHBhcmVuLCBleHByKSB7XG4gIC8vIGNvbnRpbnVhdGlvbnMgYWZ0ZXIgYSBmdW5jdGlvbiAoZS5nLiBgZ2V0VXNlcigxMikuZmlyc3ROYW1lYCkuXG4gIGNvbnRpbnVhdGlvbiA9IHByZWZpeCA9PT0gJy4nO1xuICBpZiAoY29udGludWF0aW9uKSB7XG4gICAgcHJvcENoYWluID0gJy4nICsgcHJvcENoYWluO1xuICAgIHByZWZpeCA9ICcnO1xuICB9XG5cbiAgdmFyIGxpbmtzID0gc3BsaXRMaW5rcyhwcm9wQ2hhaW4pO1xuICB2YXIgbmV3Q2hhaW4gPSAnJztcblxuICBpZiAobGlua3MubGVuZ3RoID09PSAxICYmICFjb250aW51YXRpb24gJiYgIXBhcmVuKSB7XG4gICAgbGluayA9IGxpbmtzWzBdO1xuICAgIG5ld0NoYWluID0gYWRkVGhpc09yR2xvYmFsKGxpbmspO1xuICB9IGVsc2Uge1xuICAgIGlmICghY29udGludWF0aW9uKSB7XG4gICAgICBuZXdDaGFpbiA9ICcoJztcbiAgICB9XG5cbiAgICBsaW5rcy5mb3JFYWNoKGZ1bmN0aW9uKGxpbmssIGluZGV4KSB7XG4gICAgICBpZiAoaW5kZXggIT09IGxpbmtzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgbmV3Q2hhaW4gKz0gcGFyc2VQYXJ0KGxpbmssIGluZGV4KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICghcGFyZW5zW3BhcmVuXSkge1xuICAgICAgICAgIG5ld0NoYWluICs9ICdfcmVmJyArIGN1cnJlbnRSZWZlcmVuY2UgKyBsaW5rO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChjb250aW51YXRpb24gJiYgaW5kZXggPT09IDApIHtcbiAgICAgICAgICAgIGluZGV4Kys7XG4gICAgICAgICAgfVxuICAgICAgICAgIHBvc3RmaXggPSBwb3N0Zml4LnJlcGxhY2UocGFyZW4sICcnKTtcbiAgICAgICAgICBuZXdDaGFpbiArPSBwYXJlbiA9PT0gJygnID8gcGFyc2VGdW5jdGlvbihsaW5rLCBpbmRleCwgZXhwcikgOiBwYXJzZUJyYWNrZXRzKGxpbmssIGluZGV4LCBleHByKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKGV4cHIuY2hhckF0KHByb3BlcnR5UmVnZXgubGFzdEluZGV4KSAhPT0gJy4nKSB7XG4gICAgICBuZXdDaGFpbiArPSAnKSc7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHByZWZpeCArIG5ld0NoYWluICsgcG9zdGZpeDtcbn1cblxuXG5mdW5jdGlvbiBzcGxpdExpbmtzKGNoYWluKSB7XG4gIHZhciBpbmRleCA9IDA7XG4gIHZhciBwYXJ0cyA9IFtdO1xuICB2YXIgbWF0Y2g7XG4gIHdoaWxlIChtYXRjaCA9IGNoYWluTGlua3NSZWdleC5leGVjKGNoYWluKSkge1xuICAgIGlmIChjaGFpbkxpbmtzUmVnZXgubGFzdEluZGV4ID09PSAxKSBjb250aW51ZTtcbiAgICBwYXJ0cy5wdXNoKGNoYWluLnNsaWNlKGluZGV4LCBjaGFpbkxpbmtzUmVnZXgubGFzdEluZGV4IC0gMSkpO1xuICAgIGluZGV4ID0gY2hhaW5MaW5rc1JlZ2V4Lmxhc3RJbmRleCAtIDE7XG4gIH1cbiAgcGFydHMucHVzaChjaGFpbi5zbGljZShpbmRleCkpO1xuICByZXR1cm4gcGFydHM7XG59XG5cblxuZnVuY3Rpb24gYWRkVGhpc09yR2xvYmFsKGNoYWluKSB7XG4gIHZhciBwcm9wID0gY2hhaW4uc3BsaXQoY2hhaW5MaW5rUmVnZXgpLnNoaWZ0KCk7XG4gIGlmIChnbG9iYWxzLmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgcmV0dXJuIGdsb2JhbHNbcHJvcF0gPT09IG51bGwgPyBjaGFpbiA6ICdfZ2xvYmFsc18uJyArIGNoYWluO1xuICB9IGVsc2UgaWYgKGRlZmF1bHRHbG9iYWxzLmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgcmV0dXJuIGNoYWluO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiAndGhpcy4nICsgY2hhaW47XG4gIH1cbn1cblxuXG52YXIgcGFyZW5zID0ge1xuICAnKCc6ICcpJyxcbiAgJ1snOiAnXSdcbn07XG5cbi8vIEhhbmRsZXMgYSBmdW5jdGlvbiB0byBiZSBjYWxsZWQgaW4gaXRzIGNvcnJlY3Qgc2NvcGVcbi8vIEZpbmRzIHRoZSBlbmQgb2YgdGhlIGZ1bmN0aW9uIGFuZCBwcm9jZXNzZXMgdGhlIGFyZ3VtZW50c1xuZnVuY3Rpb24gcGFyc2VGdW5jdGlvbihsaW5rLCBpbmRleCwgZXhwcikge1xuICB2YXIgY2FsbCA9IGdldEZ1bmN0aW9uQ2FsbChleHByKTtcblxuICAvLyBBbHdheXMgY2FsbCBmdW5jdGlvbnMgaW4gdGhlIHNjb3BlIG9mIHRoZSBvYmplY3QgdGhleSdyZSBhIG1lbWJlciBvZlxuICBpZiAoaW5kZXggPT09IDApIHtcbiAgICBsaW5rID0gYWRkVGhpc09yR2xvYmFsKGxpbmspO1xuICB9IGVsc2Uge1xuICAgIGxpbmsgPSAnX3JlZicgKyBjdXJyZW50UmVmZXJlbmNlICsgbGluaztcbiAgfVxuXG4gIHZhciBjYWxsZWRMaW5rID0gbGluayArICcofn5pbnNpZGVQYXJlbnN+fiknO1xuICBpZiAoZXhwci5jaGFyQXQocHJvcGVydHlSZWdleC5sYXN0SW5kZXgpID09PSAnLicpIHtcbiAgICBjYWxsZWRMaW5rID0gcGFyc2VQYXJ0KGNhbGxlZExpbmssIGluZGV4KVxuICB9XG5cbiAgbGluayA9ICd0eXBlb2YgJyArIGxpbmsgKyAnICE9PSBcXCdmdW5jdGlvblxcJyA/IHZvaWQgMCA6ICcgKyBjYWxsZWRMaW5rO1xuICB2YXIgaW5zaWRlUGFyZW5zID0gY2FsbC5zbGljZSgxLCAtMSk7XG5cbiAgdmFyIHJlZiA9IGN1cnJlbnRSZWZlcmVuY2U7XG4gIGxpbmsgPSBsaW5rLnJlcGxhY2UoJ35+aW5zaWRlUGFyZW5zfn4nLCBwYXJzZVByb3BlcnR5Q2hhaW5zKGluc2lkZVBhcmVucykpO1xuICBjdXJyZW50UmVmZXJlbmNlID0gcmVmO1xuICByZXR1cm4gbGluaztcbn1cblxuLy8gSGFuZGxlcyBhIGJyYWNrZXRlZCBleHByZXNzaW9uIHRvIGJlIHBhcnNlZFxuZnVuY3Rpb24gcGFyc2VCcmFja2V0cyhsaW5rLCBpbmRleCwgZXhwcikge1xuICB2YXIgY2FsbCA9IGdldEZ1bmN0aW9uQ2FsbChleHByKTtcbiAgdmFyIGluc2lkZUJyYWNrZXRzID0gY2FsbC5zbGljZSgxLCAtMSk7XG4gIHZhciBldmFsZWRMaW5rID0gcGFyc2VQYXJ0KGxpbmssIGluZGV4KTtcbiAgaW5kZXggKz0gMTtcbiAgbGluayA9ICdbfn5pbnNpZGVCcmFja2V0c35+XSc7XG5cbiAgaWYgKGV4cHIuY2hhckF0KHByb3BlcnR5UmVnZXgubGFzdEluZGV4KSA9PT0gJy4nKSB7XG4gICAgbGluayA9IHBhcnNlUGFydChsaW5rLCBpbmRleCk7XG4gIH0gZWxzZSB7XG4gICAgbGluayA9ICdfcmVmJyArIGN1cnJlbnRSZWZlcmVuY2UgKyBsaW5rO1xuICB9XG5cbiAgbGluayA9IGV2YWxlZExpbmsgKyBsaW5rO1xuXG4gIHZhciByZWYgPSBjdXJyZW50UmVmZXJlbmNlO1xuICBsaW5rID0gbGluay5yZXBsYWNlKCd+fmluc2lkZUJyYWNrZXRzfn4nLCBwYXJzZVByb3BlcnR5Q2hhaW5zKGluc2lkZUJyYWNrZXRzKSk7XG4gIGN1cnJlbnRSZWZlcmVuY2UgPSByZWY7XG4gIHJldHVybiBsaW5rO1xufVxuXG5cbi8vIHJldHVybnMgdGhlIGNhbGwgcGFydCBvZiBhIGZ1bmN0aW9uIChlLmcuIGB0ZXN0KDEyMylgIHdvdWxkIHJldHVybiBgKDEyMylgKVxuZnVuY3Rpb24gZ2V0RnVuY3Rpb25DYWxsKGV4cHIpIHtcbiAgdmFyIHN0YXJ0SW5kZXggPSBwcm9wZXJ0eVJlZ2V4Lmxhc3RJbmRleDtcbiAgdmFyIG9wZW4gPSBleHByLmNoYXJBdChzdGFydEluZGV4IC0gMSk7XG4gIHZhciBjbG9zZSA9IHBhcmVuc1tvcGVuXTtcbiAgdmFyIGVuZEluZGV4ID0gc3RhcnRJbmRleCAtIDE7XG4gIHZhciBwYXJlbkNvdW50ID0gMTtcbiAgd2hpbGUgKGVuZEluZGV4KysgPCBleHByLmxlbmd0aCkge1xuICAgIHZhciBjaCA9IGV4cHIuY2hhckF0KGVuZEluZGV4KTtcbiAgICBpZiAoY2ggPT09IG9wZW4pIHBhcmVuQ291bnQrKztcbiAgICBlbHNlIGlmIChjaCA9PT0gY2xvc2UpIHBhcmVuQ291bnQtLTtcbiAgICBpZiAocGFyZW5Db3VudCA9PT0gMCkgYnJlYWs7XG4gIH1cbiAgY3VycmVudEluZGV4ID0gcHJvcGVydHlSZWdleC5sYXN0SW5kZXggPSBlbmRJbmRleCArIDE7XG4gIHJldHVybiBvcGVuICsgZXhwci5zbGljZShzdGFydEluZGV4LCBlbmRJbmRleCkgKyBjbG9zZTtcbn1cblxuXG5cbmZ1bmN0aW9uIHBhcnNlUGFydChwYXJ0LCBpbmRleCkge1xuICAvLyBpZiB0aGUgZmlyc3RcbiAgaWYgKGluZGV4ID09PSAwICYmICFjb250aW51YXRpb24pIHtcbiAgICBwYXJ0ID0gYWRkVGhpc09yR2xvYmFsKHBhcnQpO1xuICB9IGVsc2Uge1xuICAgIHBhcnQgPSAnX3JlZicgKyBjdXJyZW50UmVmZXJlbmNlICsgcGFydDtcbiAgfVxuXG4gIGN1cnJlbnRSZWZlcmVuY2UgPSArK3JlZmVyZW5jZUNvdW50O1xuICB2YXIgcmVmID0gJ19yZWYnICsgY3VycmVudFJlZmVyZW5jZTtcbiAgcmV0dXJuICcoJyArIHJlZiArICcgPSAnICsgcGFydCArICcpID09IG51bGwgPyB2b2lkIDAgOiAnO1xufVxuXG5cbmZ1bmN0aW9uIHJlcGxhY2VBbmRzQW5kT3JzKGV4cHIpIHtcbiAgcmV0dXJuIGV4cHIucmVwbGFjZShhbmRSZWdleCwgJyAmJiAnKS5yZXBsYWNlKG9yUmVnZXgsICcgfHwgJyk7XG59XG5cblxuLy8gUHJlcGVuZHMgcmVmZXJlbmNlIHZhcmlhYmxlIGRlZmluaXRpb25zXG5mdW5jdGlvbiBhZGRSZWZlcmVuY2VzKGV4cHIpIHtcbiAgaWYgKHJlZmVyZW5jZUNvdW50KSB7XG4gICAgdmFyIHJlZnMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8PSByZWZlcmVuY2VDb3VudDsgaSsrKSB7XG4gICAgICByZWZzLnB1c2goJ19yZWYnICsgaSk7XG4gICAgfVxuICAgIGV4cHIgPSAndmFyICcgKyByZWZzLmpvaW4oJywgJykgKyAnO1xcbicgKyBleHByO1xuICB9XG4gIHJldHVybiBleHByO1xufVxuIiwiLy8gZmluZHMgYWxsIHF1b3RlZCBzdHJpbmdzXG52YXIgcXVvdGVSZWdleCA9IC8oWydcIlxcL10pKFxcXFxcXDF8W15cXDFdKSo/XFwxL2c7XG5cbi8vIGZpbmRzIGFsbCBlbXB0eSBxdW90ZWQgc3RyaW5nc1xudmFyIGVtcHR5UXVvdGVFeHByID0gLyhbJ1wiXFwvXSlcXDEvZztcblxudmFyIHN0cmluZ3MgPSBudWxsO1xuXG5cbi8qKlxuICogUmVtb3ZlIHN0cmluZ3MgZnJvbSBhbiBleHByZXNzaW9uIGZvciBlYXNpZXIgcGFyc2luZy4gUmV0dXJucyBhIGxpc3Qgb2YgdGhlIHN0cmluZ3MgdG8gYWRkIGJhY2sgaW4gbGF0ZXIuXG4gKiBUaGlzIG1ldGhvZCBhY3R1YWxseSBsZWF2ZXMgdGhlIHN0cmluZyBxdW90ZSBtYXJrcyBidXQgZW1wdGllcyB0aGVtIG9mIHRoZWlyIGNvbnRlbnRzLiBUaGVuIHdoZW4gcmVwbGFjaW5nIHRoZW0gYWZ0ZXJcbiAqIHBhcnNpbmcgdGhlIGNvbnRlbnRzIGp1c3QgZ2V0IHB1dCBiYWNrIGludG8gdGhlaXIgcXVvdGVzIG1hcmtzLlxuICovXG5leHBvcnRzLnB1bGxPdXRTdHJpbmdzID0gZnVuY3Rpb24oZXhwcikge1xuICBpZiAoc3RyaW5ncykge1xuICAgIHRocm93IG5ldyBFcnJvcigncHV0SW5TdHJpbmdzIG11c3QgYmUgY2FsbGVkIGFmdGVyIHB1bGxPdXRTdHJpbmdzLicpO1xuICB9XG5cbiAgc3RyaW5ncyA9IFtdO1xuXG4gIHJldHVybiBleHByLnJlcGxhY2UocXVvdGVSZWdleCwgZnVuY3Rpb24oc3RyLCBxdW90ZSkge1xuICAgIHN0cmluZ3MucHVzaChzdHIpO1xuICAgIHJldHVybiBxdW90ZSArIHF1b3RlOyAvLyBwbGFjZWhvbGRlciBmb3IgdGhlIHN0cmluZ1xuICB9KTtcbn07XG5cblxuLyoqXG4gKiBSZXBsYWNlIHRoZSBzdHJpbmdzIHByZXZpb3VzbHkgcHVsbGVkIG91dCBhZnRlciBwYXJzaW5nIGlzIGZpbmlzaGVkLlxuICovXG5leHBvcnRzLnB1dEluU3RyaW5ncyA9IGZ1bmN0aW9uKGV4cHIpIHtcbiAgaWYgKCFzdHJpbmdzKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwdWxsT3V0U3RyaW5ncyBtdXN0IGJlIGNhbGxlZCBiZWZvcmUgcHV0SW5TdHJpbmdzLicpO1xuICB9XG5cbiAgZXhwciA9IGV4cHIucmVwbGFjZShlbXB0eVF1b3RlRXhwciwgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHN0cmluZ3Muc2hpZnQoKTtcbiAgfSk7XG5cbiAgc3RyaW5ncyA9IG51bGw7XG5cbiAgcmV0dXJuIGV4cHI7XG59O1xuIiwidmFyIEZyYWdtZW50cyA9IHJlcXVpcmUoJy4vc3JjL2ZyYWdtZW50cycpO1xudmFyIE9ic2VydmF0aW9ucyA9IHJlcXVpcmUoJ29ic2VydmF0aW9ucy1qcycpO1xuXG5mdW5jdGlvbiBjcmVhdGUoKSB7XG4gIHZhciBvYnNlcnZhdGlvbnMgPSBPYnNlcnZhdGlvbnMuY3JlYXRlKCk7XG4gIHZhciBmcmFnbWVudHMgPSBuZXcgRnJhZ21lbnRzKG9ic2VydmF0aW9ucyk7XG4gIGZyYWdtZW50cy5zeW5jID0gb2JzZXJ2YXRpb25zLnN5bmMuYmluZChvYnNlcnZhdGlvbnMpO1xuICBmcmFnbWVudHMuc3luY05vdyA9IG9ic2VydmF0aW9ucy5zeW5jTm93LmJpbmQob2JzZXJ2YXRpb25zKTtcbiAgZnJhZ21lbnRzLmFmdGVyU3luYyA9IG9ic2VydmF0aW9ucy5hZnRlclN5bmMuYmluZChvYnNlcnZhdGlvbnMpO1xuICBmcmFnbWVudHMub25TeW5jID0gb2JzZXJ2YXRpb25zLm9uU3luYy5iaW5kKG9ic2VydmF0aW9ucyk7XG4gIGZyYWdtZW50cy5vZmZTeW5jID0gb2JzZXJ2YXRpb25zLm9mZlN5bmMuYmluZChvYnNlcnZhdGlvbnMpO1xuICByZXR1cm4gZnJhZ21lbnRzO1xufVxuXG4vLyBDcmVhdGUgYW4gaW5zdGFuY2Ugb2YgZnJhZ21lbnRzIHdpdGggdGhlIGRlZmF1bHQgb2JzZXJ2ZXJcbm1vZHVsZS5leHBvcnRzID0gY3JlYXRlKCk7XG5tb2R1bGUuZXhwb3J0cy5jcmVhdGUgPSBjcmVhdGU7XG4iLCJ2YXIgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG5cbi8qKlxuICogU2ltcGxpZmllcyBleHRlbmRpbmcgY2xhc3NlcyBhbmQgcHJvdmlkZXMgc3RhdGljIGluaGVyaXRhbmNlLiBDbGFzc2VzIHRoYXQgbmVlZCB0byBiZSBleHRlbmRhYmxlIHNob3VsZFxuICogZXh0ZW5kIENsYXNzIHdoaWNoIHdpbGwgZ2l2ZSB0aGVtIHRoZSBgZXh0ZW5kYCBzdGF0aWMgZnVuY3Rpb24gZm9yIHRoZWlyIHN1YmNsYXNzZXMgdG8gdXNlLiBJbiBhZGRpdGlvbiB0b1xuICogYSBwcm90b3R5cGUsIG1peGlucyBtYXkgYmUgYWRkZWQgYXMgd2VsbC4gRXhhbXBsZTpcbiAqXG4gKiBmdW5jdGlvbiBNeUNsYXNzKGFyZzEsIGFyZzIpIHtcbiAqICAgU3VwZXJDbGFzcy5jYWxsKHRoaXMsIGFyZzEpO1xuICogICB0aGlzLmFyZzIgPSBhcmcyO1xuICogfVxuICogU3VwZXJDbGFzcy5leHRlbmQoTXlDbGFzcywgbWl4aW4xLCBBbm90aGVyQ2xhc3MsIHtcbiAqICAgZm9vOiBmdW5jdGlvbigpIHtcbiAqICAgICB0aGlzLl9iYXIrKztcbiAqICAgfSxcbiAqICAgZ2V0IGJhcigpIHtcbiAqICAgICByZXR1cm4gdGhpcy5fYmFyO1xuICogICB9XG4gKiB9KTtcbiAqXG4gKiBJbiBhZGRpdGlvbiB0byBleHRlbmRpbmcgdGhlIHN1cGVyY2xhc3MsIHN0YXRpYyBtZXRob2RzIGFuZCBwcm9wZXJ0aWVzIHdpbGwgYmUgY29waWVkIG9udG8gdGhlIHN1YmNsYXNzIGZvclxuICogc3RhdGljIGluaGVyaXRhbmNlLiBUaGlzIGFsbG93cyB0aGUgZXh0ZW5kIGZ1bmN0aW9uIHRvIGJlIGNvcGllZCB0byB0aGUgc3ViY2xhc3Mgc28gdGhhdCBpdCBtYXkgYmVcbiAqIHN1YmNsYXNzZWQgYXMgd2VsbC4gQWRkaXRpb25hbGx5LCBzdGF0aWMgcHJvcGVydGllcyBtYXkgYmUgYWRkZWQgYnkgZGVmaW5pbmcgdGhlbSBvbiBhIHNwZWNpYWwgcHJvdG90eXBlXG4gKiBwcm9wZXJ0eSBgc3RhdGljYCBtYWtpbmcgdGhlIGNvZGUgbW9yZSByZWFkYWJsZS5cbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBUaGUgc3ViY2xhc3MgY29uc3RydWN0b3IuXG4gKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbmFsXSBaZXJvIG9yIG1vcmUgbWl4aW5zLiBUaGV5IGNhbiBiZSBvYmplY3RzIG9yIGNsYXNzZXMgKGZ1bmN0aW9ucykuXG4gKiBAcGFyYW0ge29iamVjdH0gVGhlIHByb3RvdHlwZSBvZiB0aGUgc3ViY2xhc3MuXG4gKi9cbmZ1bmN0aW9uIENsYXNzKCkge31cbkNsYXNzLmV4dGVuZCA9IGV4dGVuZDtcbkNsYXNzLm1ha2VJbnN0YW5jZU9mID0gbWFrZUluc3RhbmNlT2Y7XG5tb2R1bGUuZXhwb3J0cyA9IENsYXNzO1xuXG5mdW5jdGlvbiBleHRlbmQoU3ViY2xhc3MgLyogWywgcHJvdG90eXBlIFsscHJvdG90eXBlXV0gKi8pIHtcbiAgdmFyIHByb3RvdHlwZXM7XG5cbiAgLy8gU3VwcG9ydCBubyBjb25zdHJ1Y3RvclxuICBpZiAodHlwZW9mIFN1YmNsYXNzICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgcHJvdG90eXBlcyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICB2YXIgU3VwZXJDbGFzcyA9IHRoaXM7XG4gICAgU3ViY2xhc3MgPSBmdW5jdGlvbigpIHtcbiAgICAgIFN1cGVyQ2xhc3MuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHByb3RvdHlwZXMgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gIH1cblxuICBleHRlbmRTdGF0aWNzKHRoaXMsIFN1YmNsYXNzKTtcblxuICBwcm90b3R5cGVzLmZvckVhY2goZnVuY3Rpb24ocHJvdG8pIHtcbiAgICBpZiAodHlwZW9mIHByb3RvID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBleHRlbmRTdGF0aWNzKHByb3RvLCBTdWJjbGFzcyk7XG4gICAgfSBlbHNlIGlmIChwcm90by5oYXNPd25Qcm9wZXJ0eSgnc3RhdGljJykpIHtcbiAgICAgIGV4dGVuZFN0YXRpY3MocHJvdG8uc3RhdGljLCBTdWJjbGFzcyk7XG4gICAgfVxuICB9KTtcblxuICB2YXIgZGVzY3JpcHRvcnMgPSBnZXREZXNjcmlwdG9ycyhwcm90b3R5cGVzKTtcbiAgZGVzY3JpcHRvcnMuY29uc3RydWN0b3IgPSB7IHdyaXRhYmxlOiB0cnVlLCBjb25maWd1cmFibGU6IHRydWUsIHZhbHVlOiBTdWJjbGFzcyB9O1xuICBTdWJjbGFzcy5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHRoaXMucHJvdG90eXBlLCBkZXNjcmlwdG9ycyk7XG4gIHJldHVybiBTdWJjbGFzcztcbn1cblxuLy8gR2V0IGRlc2NyaXB0b3JzIChhbGxvd3MgZm9yIGdldHRlcnMgYW5kIHNldHRlcnMpIGFuZCBzZXRzIGZ1bmN0aW9ucyB0byBiZSBub24tZW51bWVyYWJsZVxuZnVuY3Rpb24gZ2V0RGVzY3JpcHRvcnMob2JqZWN0cykge1xuICB2YXIgZGVzY3JpcHRvcnMgPSB7fTtcblxuICBvYmplY3RzLmZvckVhY2goZnVuY3Rpb24ob2JqZWN0KSB7XG4gICAgaWYgKHR5cGVvZiBvYmplY3QgPT09ICdmdW5jdGlvbicpIG9iamVjdCA9IG9iamVjdC5wcm90b3R5cGU7XG5cbiAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhvYmplY3QpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgaWYgKG5hbWUgPT09ICdzdGF0aWMnKSByZXR1cm47XG5cbiAgICAgIHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmplY3QsIG5hbWUpO1xuXG4gICAgICBpZiAodHlwZW9mIGRlc2NyaXB0b3IudmFsdWUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgZGVzY3JpcHRvci5lbnVtZXJhYmxlID0gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIGRlc2NyaXB0b3JzW25hbWVdID0gZGVzY3JpcHRvcjtcbiAgICB9KTtcbiAgfSk7XG4gIHJldHVybiBkZXNjcmlwdG9ycztcbn1cblxuLy8gQ29waWVzIHN0YXRpYyBtZXRob2RzIG92ZXIgZm9yIHN0YXRpYyBpbmhlcml0YW5jZVxuZnVuY3Rpb24gZXh0ZW5kU3RhdGljcyhDbGFzcywgU3ViY2xhc3MpIHtcblxuICAvLyBzdGF0aWMgbWV0aG9kIGluaGVyaXRhbmNlIChpbmNsdWRpbmcgYGV4dGVuZGApXG4gIE9iamVjdC5rZXlzKENsYXNzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihDbGFzcywga2V5KTtcbiAgICBpZiAoIWRlc2NyaXB0b3IuY29uZmlndXJhYmxlKSByZXR1cm47XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoU3ViY2xhc3MsIGtleSwgZGVzY3JpcHRvcik7XG4gIH0pO1xufVxuXG5cbi8qKlxuICogTWFrZXMgYSBuYXRpdmUgb2JqZWN0IHByZXRlbmQgdG8gYmUgYW4gaW5zdGFuY2Ugb2YgY2xhc3MgKGUuZy4gYWRkcyBtZXRob2RzIHRvIGEgRG9jdW1lbnRGcmFnbWVudCB0aGVuIGNhbGxzIHRoZVxuICogY29uc3RydWN0b3IpLlxuICovXG5mdW5jdGlvbiBtYWtlSW5zdGFuY2VPZihvYmplY3QpIHtcbiAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKG9iamVjdCwgZ2V0RGVzY3JpcHRvcnMoW3RoaXMucHJvdG90eXBlXSkpO1xuICB0aGlzLmFwcGx5KG9iamVjdCwgYXJncyk7XG4gIHJldHVybiBvYmplY3Q7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IEFuaW1hdGVkQmluZGluZztcbnZhciBhbmltYXRpb24gPSByZXF1aXJlKCcuL3V0aWwvYW5pbWF0aW9uJyk7XG52YXIgQmluZGluZyA9IHJlcXVpcmUoJy4vYmluZGluZycpO1xudmFyIF9zdXBlciA9IEJpbmRpbmcucHJvdG90eXBlO1xuXG4vKipcbiAqIEJpbmRpbmdzIHdoaWNoIGV4dGVuZCBBbmltYXRlZEJpbmRpbmcgaGF2ZSB0aGUgYWJpbGl0eSB0byBhbmltYXRlIGVsZW1lbnRzIHRoYXQgYXJlIGFkZGVkIHRvIHRoZSBET00gYW5kIHJlbW92ZWQgZnJvbVxuICogdGhlIERPTS4gVGhpcyBhbGxvd3MgbWVudXMgdG8gc2xpZGUgb3BlbiBhbmQgY2xvc2VkLCBlbGVtZW50cyB0byBmYWRlIGluIG9yIGRyb3AgZG93biwgYW5kIHJlcGVhdGVkIGl0ZW1zIHRvIGFwcGVhclxuICogdG8gbW92ZSAoaWYgeW91IGdldCBjcmVhdGl2ZSBlbm91Z2gpLlxuICpcbiAqIFRoZSBmb2xsb3dpbmcgNSBtZXRob2RzIGFyZSBoZWxwZXIgRE9NIG1ldGhvZHMgdGhhdCBhbGxvdyByZWdpc3RlcmVkIGJpbmRpbmdzIHRvIHdvcmsgd2l0aCBDU1MgdHJhbnNpdGlvbnMgZm9yXG4gKiBhbmltYXRpbmcgZWxlbWVudHMuIElmIGFuIGVsZW1lbnQgaGFzIHRoZSBgYW5pbWF0ZWAgYXR0cmlidXRlIG9yIGEgbWF0Y2hpbmcgSmF2YVNjcmlwdCBtZXRob2QsIHRoZXNlIGhlbHBlciBtZXRob2RzXG4gKiB3aWxsIHNldCBhIGNsYXNzIG9uIHRoZSBub2RlIHRvIHRyaWdnZXIgdGhlIGFuaW1hdGlvbiBhbmQvb3IgY2FsbCB0aGUgSmF2YVNjcmlwdCBtZXRob2RzIHRvIGhhbmRsZSBpdC5cbiAqXG4gKiBBbiBhbmltYXRpb24gbWF5IGJlIGVpdGhlciBhIENTUyB0cmFuc2l0aW9uLCBhIENTUyBhbmltYXRpb24sIG9yIGEgc2V0IG9mIEphdmFTY3JpcHQgbWV0aG9kcyB0aGF0IHdpbGwgYmUgY2FsbGVkLlxuICpcbiAqIElmIHVzaW5nIENTUywgY2xhc3NlcyBhcmUgYWRkZWQgYW5kIHJlbW92ZWQgZnJvbSB0aGUgZWxlbWVudC4gV2hlbiBhbiBlbGVtZW50IGlzIGluc2VydGVkIGl0IHdpbGwgcmVjZWl2ZSB0aGUgYHdpbGwtXG4gKiBhbmltYXRlLWluYCBjbGFzcyBiZWZvcmUgYmVpbmcgYWRkZWQgdG8gdGhlIERPTSwgdGhlbiBpdCB3aWxsIHJlY2VpdmUgdGhlIGBhbmltYXRlLWluYCBjbGFzcyBpbW1lZGlhdGVseSBhZnRlciBiZWluZ1xuICogYWRkZWQgdG8gdGhlIERPTSwgdGhlbiBib3RoIGNsYXNlcyB3aWxsIGJlIHJlbW92ZWQgYWZ0ZXIgdGhlIGFuaW1hdGlvbiBpcyBjb21wbGV0ZS4gV2hlbiBhbiBlbGVtZW50IGlzIGJlaW5nIHJlbW92ZWRcbiAqIGZyb20gdGhlIERPTSBpdCB3aWxsIHJlY2VpdmUgdGhlIGB3aWxsLWFuaW1hdGUtb3V0YCBhbmQgYGFuaW1hdGUtb3V0YCBjbGFzc2VzLCB0aGVuIHRoZSBjbGFzc2VzIHdpbGwgYmUgcmVtb3ZlZCBvbmNlXG4gKiB0aGUgYW5pbWF0aW9uIGlzIGNvbXBsZXRlLlxuICpcbiAqIElmIHVzaW5nIEphdmFTY3JpcHQsIG1ldGhvZHMgbXVzdCBiZSBkZWZpbmVkICB0byBhbmltYXRlIHRoZSBlbGVtZW50IHRoZXJlIGFyZSAzIHN1cHBvcnRlZCBtZXRob2RzIHdoaWNoIGNhbiBiXG4gKlxuICogVE9ETyBjYWNoZSBieSBjbGFzcy1uYW1lIChBbmd1bGFyKT8gT25seSBzdXBwb3J0IGphdmFzY3JpcHQtc3R5bGUgKEVtYmVyKT8gQWRkIGEgYHdpbGwtYW5pbWF0ZS1pbmAgYW5kXG4gKiBgZGlkLWFuaW1hdGUtaW5gIGV0Yy4/XG4gKiBJRiBoYXMgYW55IGNsYXNzZXMsIGFkZCB0aGUgYHdpbGwtYW5pbWF0ZS1pbnxvdXRgIGFuZCBnZXQgY29tcHV0ZWQgZHVyYXRpb24uIElmIG5vbmUsIHJldHVybi4gQ2FjaGUuXG4gKiBSVUxFIGlzIHVzZSB1bmlxdWUgY2xhc3MgdG8gZGVmaW5lIGFuIGFuaW1hdGlvbi4gT3IgYXR0cmlidXRlIGBhbmltYXRlPVwiZmFkZVwiYCB3aWxsIGFkZCB0aGUgY2xhc3M/XG4gKiBgLmZhZGUud2lsbC1hbmltYXRlLWluYCwgYC5mYWRlLmFuaW1hdGUtaW5gLCBgLmZhZGUud2lsbC1hbmltYXRlLW91dGAsIGAuZmFkZS5hbmltYXRlLW91dGBcbiAqXG4gKiBFdmVudHMgd2lsbCBiZSB0cmlnZ2VyZWQgb24gdGhlIGVsZW1lbnRzIG5hbWVkIHRoZSBzYW1lIGFzIHRoZSBjbGFzcyBuYW1lcyAoZS5nLiBgYW5pbWF0ZS1pbmApIHdoaWNoIG1heSBiZSBsaXN0ZW5lZFxuICogdG8gaW4gb3JkZXIgdG8gY2FuY2VsIGFuIGFuaW1hdGlvbiBvciByZXNwb25kIHRvIGl0LlxuICpcbiAqIElmIHRoZSBub2RlIGhhcyBtZXRob2RzIGBhbmltYXRlSW4oZG9uZSlgLCBgYW5pbWF0ZU91dChkb25lKWAsIGBhbmltYXRlTW92ZUluKGRvbmUpYCwgb3IgYGFuaW1hdGVNb3ZlT3V0KGRvbmUpYFxuICogZGVmaW5lZCBvbiB0aGVtIHRoZW4gdGhlIGhlbHBlcnMgd2lsbCBhbGxvdyBhbiBhbmltYXRpb24gaW4gSmF2YVNjcmlwdCB0byBiZSBydW4gYW5kIHdhaXQgZm9yIHRoZSBgZG9uZWAgZnVuY3Rpb24gdG9cbiAqIGJlIGNhbGxlZCB0byBrbm93IHdoZW4gdGhlIGFuaW1hdGlvbiBpcyBjb21wbGV0ZS5cbiAqXG4gKiBCZSBzdXJlIHRvIGFjdHVhbGx5IGhhdmUgYW4gYW5pbWF0aW9uIGRlZmluZWQgZm9yIGVsZW1lbnRzIHdpdGggdGhlIGBhbmltYXRlYCBjbGFzcy9hdHRyaWJ1dGUgYmVjYXVzZSB0aGUgaGVscGVycyB1c2VcbiAqIHRoZSBgdHJhbnNpdGlvbmVuZGAgYW5kIGBhbmltYXRpb25lbmRgIGV2ZW50cyB0byBrbm93IHdoZW4gdGhlIGFuaW1hdGlvbiBpcyBmaW5pc2hlZCwgYW5kIGlmIHRoZXJlIGlzIG5vIGFuaW1hdGlvblxuICogdGhlc2UgZXZlbnRzIHdpbGwgbmV2ZXIgYmUgdHJpZ2dlcmVkIGFuZCB0aGUgb3BlcmF0aW9uIHdpbGwgbmV2ZXIgY29tcGxldGUuXG4gKi9cbmZ1bmN0aW9uIEFuaW1hdGVkQmluZGluZyhwcm9wZXJ0aWVzKSB7XG4gIHZhciBlbGVtZW50ID0gcHJvcGVydGllcy5ub2RlO1xuICB2YXIgYW5pbWF0ZSA9IGVsZW1lbnQuZ2V0QXR0cmlidXRlKHByb3BlcnRpZXMuZnJhZ21lbnRzLmFuaW1hdGVBdHRyaWJ1dGUpO1xuICB2YXIgZnJhZ21lbnRzID0gcHJvcGVydGllcy5mcmFnbWVudHM7XG5cbiAgaWYgKGFuaW1hdGUgIT09IG51bGwpIHtcbiAgICBpZiAoZWxlbWVudC5ub2RlTmFtZSA9PT0gJ1RFTVBMQVRFJyB8fCBlbGVtZW50Lm5vZGVOYW1lID09PSAnU0NSSVBUJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgYW5pbWF0ZSBtdWx0aXBsZSBub2RlcyBpbiBhIHRlbXBsYXRlIG9yIHNjcmlwdC4gUmVtb3ZlIHRoZSBbYW5pbWF0ZV0gYXR0cmlidXRlLicpO1xuICAgIH1cblxuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAvLyBBbGxvdyBtdWx0aXBsZSBiaW5kaW5ncyB0byBhbmltYXRlIGJ5IG5vdCByZW1vdmluZyB1bnRpbCB0aGV5IGhhdmUgYWxsIGJlZW4gY3JlYXRlZFxuICAgICAgZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUocHJvcGVydGllcy5mcmFnbWVudHMuYW5pbWF0ZUF0dHJpYnV0ZSk7XG4gICAgfSk7XG5cbiAgICB0aGlzLmFuaW1hdGUgPSB0cnVlO1xuXG4gICAgaWYgKGZyYWdtZW50cy5pc0JvdW5kKCdhdHRyaWJ1dGUnLCBhbmltYXRlKSkge1xuICAgICAgLy8gamF2YXNjcmlwdCBhbmltYXRpb25cbiAgICAgIHRoaXMuYW5pbWF0ZUV4cHJlc3Npb24gPSBmcmFnbWVudHMuY29kaWZ5RXhwcmVzc2lvbignYXR0cmlidXRlJywgYW5pbWF0ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChhbmltYXRlWzBdID09PSAnLicpIHtcbiAgICAgICAgLy8gY2xhc3MgYW5pbWF0aW9uXG4gICAgICAgIHRoaXMuYW5pbWF0ZUNsYXNzTmFtZSA9IGFuaW1hdGUuc2xpY2UoMSk7XG4gICAgICB9IGVsc2UgaWYgKGFuaW1hdGUpIHtcbiAgICAgICAgLy8gcmVnaXN0ZXJlZCBhbmltYXRpb25cbiAgICAgICAgdmFyIGFuaW1hdGVPYmplY3QgPSBmcmFnbWVudHMuZ2V0QW5pbWF0aW9uKGFuaW1hdGUpO1xuICAgICAgICBpZiAodHlwZW9mIGFuaW1hdGVPYmplY3QgPT09ICdmdW5jdGlvbicpIGFuaW1hdGVPYmplY3QgPSBuZXcgYW5pbWF0ZU9iamVjdCh0aGlzKTtcbiAgICAgICAgdGhpcy5hbmltYXRlT2JqZWN0ID0gYW5pbWF0ZU9iamVjdDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBCaW5kaW5nLmNhbGwodGhpcywgcHJvcGVydGllcyk7XG59XG5cblxuQmluZGluZy5leHRlbmQoQW5pbWF0ZWRCaW5kaW5nLCB7XG4gIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIF9zdXBlci5pbml0LmNhbGwodGhpcyk7XG5cbiAgICBpZiAodGhpcy5hbmltYXRlRXhwcmVzc2lvbikge1xuICAgICAgdGhpcy5hbmltYXRlT2JzZXJ2ZXIgPSBuZXcgdGhpcy5PYnNlcnZlcih0aGlzLmFuaW1hdGVFeHByZXNzaW9uLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGlzLmFuaW1hdGVPYmplY3QgPSB2YWx1ZTtcbiAgICAgIH0sIHRoaXMpO1xuICAgIH1cbiAgfSxcblxuICBiaW5kOiBmdW5jdGlvbihjb250ZXh0KSB7XG4gICAgaWYgKHRoaXMuY29udGV4dCA9PSBjb250ZXh0KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIF9zdXBlci5iaW5kLmNhbGwodGhpcywgY29udGV4dCk7XG5cbiAgICBpZiAodGhpcy5hbmltYXRlT2JzZXJ2ZXIpIHtcbiAgICAgIHRoaXMuYW5pbWF0ZU9ic2VydmVyLmJpbmQoY29udGV4dCk7XG4gICAgfVxuICB9LFxuXG4gIHVuYmluZDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuY29udGV4dCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBfc3VwZXIudW5iaW5kLmNhbGwodGhpcyk7XG5cbiAgICBpZiAodGhpcy5hbmltYXRlT2JzZXJ2ZXIpIHtcbiAgICAgIHRoaXMuYW5pbWF0ZU9ic2VydmVyLnVuYmluZCgpO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogSGVscGVyIG1ldGhvZCB0byByZW1vdmUgYSBub2RlIGZyb20gdGhlIERPTSwgYWxsb3dpbmcgZm9yIGFuaW1hdGlvbnMgdG8gb2NjdXIuIGBjYWxsYmFja2Agd2lsbCBiZSBjYWxsZWQgd2hlblxuICAgKiBmaW5pc2hlZC5cbiAgICovXG4gIGFuaW1hdGVPdXQ6IGZ1bmN0aW9uKG5vZGUsIGNhbGxiYWNrKSB7XG4gICAgaWYgKG5vZGUuZmlyc3RWaWV3Tm9kZSkgbm9kZSA9IG5vZGUuZmlyc3RWaWV3Tm9kZTtcblxuICAgIHRoaXMuYW5pbWF0ZU5vZGUoJ291dCcsIG5vZGUsIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjay5jYWxsKHRoaXMpO1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBIZWxwZXIgbWV0aG9kIHRvIGluc2VydCBhIG5vZGUgaW4gdGhlIERPTSBiZWZvcmUgYW5vdGhlciBub2RlLCBhbGxvd2luZyBmb3IgYW5pbWF0aW9ucyB0byBvY2N1ci4gYGNhbGxiYWNrYCB3aWxsXG4gICAqIGJlIGNhbGxlZCB3aGVuIGZpbmlzaGVkLiBJZiBgYmVmb3JlYCBpcyBub3QgcHJvdmlkZWQgdGhlbiB0aGUgYW5pbWF0aW9uIHdpbGwgYmUgcnVuIHdpdGhvdXQgaW5zZXJ0aW5nIHRoZSBub2RlLlxuICAgKi9cbiAgYW5pbWF0ZUluOiBmdW5jdGlvbihub2RlLCBjYWxsYmFjaykge1xuICAgIGlmIChub2RlLmZpcnN0Vmlld05vZGUpIG5vZGUgPSBub2RlLmZpcnN0Vmlld05vZGU7XG4gICAgdGhpcy5hbmltYXRlTm9kZSgnaW4nLCBub2RlLCBjYWxsYmFjaywgdGhpcyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFsbG93IGFuIGVsZW1lbnQgdG8gdXNlIENTUzMgdHJhbnNpdGlvbnMgb3IgYW5pbWF0aW9ucyB0byBhbmltYXRlIGluIG9yIG91dCBvZiB0aGUgcGFnZS5cbiAgICovXG4gIGFuaW1hdGVOb2RlOiBmdW5jdGlvbihkaXJlY3Rpb24sIG5vZGUsIGNhbGxiYWNrKSB7XG4gICAgdmFyIGFuaW1hdGVPYmplY3QsIGNsYXNzTmFtZSwgbmFtZSwgd2lsbE5hbWUsIGRpZE5hbWUsIF90aGlzID0gdGhpcztcblxuICAgIGlmICh0aGlzLmFuaW1hdGVPYmplY3QgJiYgdHlwZW9mIHRoaXMuYW5pbWF0ZU9iamVjdCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGFuaW1hdGVPYmplY3QgPSB0aGlzLmFuaW1hdGVPYmplY3Q7XG4gICAgfSBlbHNlIGlmICh0aGlzLmFuaW1hdGVDbGFzc05hbWUpIHtcbiAgICAgIGNsYXNzTmFtZSA9IHRoaXMuYW5pbWF0ZUNsYXNzTmFtZTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB0aGlzLmFuaW1hdGVPYmplY3QgPT09ICdzdHJpbmcnKSB7XG4gICAgICBjbGFzc05hbWUgPSB0aGlzLmFuaW1hdGVPYmplY3Q7XG4gICAgfVxuXG4gICAgaWYgKGFuaW1hdGVPYmplY3QpIHtcbiAgICAgIHZhciBkaXIgPSBkaXJlY3Rpb24gPT09ICdpbicgPyAnSW4nIDogJ091dCc7XG4gICAgICBuYW1lID0gJ2FuaW1hdGUnICsgZGlyO1xuICAgICAgd2lsbE5hbWUgPSAnd2lsbEFuaW1hdGUnICsgZGlyO1xuICAgICAgZGlkTmFtZSA9ICdkaWRBbmltYXRlJyArIGRpcjtcblxuICAgICAgYW5pbWF0aW9uLm1ha2VFbGVtZW50QW5pbWF0YWJsZShub2RlKTtcblxuICAgICAgaWYgKGFuaW1hdGVPYmplY3Rbd2lsbE5hbWVdKSB7XG4gICAgICAgIGFuaW1hdGVPYmplY3Rbd2lsbE5hbWVdKG5vZGUpO1xuICAgICAgICAvLyB0cmlnZ2VyIHJlZmxvd1xuICAgICAgICBub2RlLm9mZnNldFdpZHRoID0gbm9kZS5vZmZzZXRXaWR0aDtcbiAgICAgIH1cblxuICAgICAgaWYgKGFuaW1hdGVPYmplY3RbbmFtZV0pIHtcbiAgICAgICAgYW5pbWF0ZU9iamVjdFtuYW1lXShub2RlLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoYW5pbWF0ZU9iamVjdFtkaWROYW1lXSkgYW5pbWF0ZU9iamVjdFtkaWROYW1lXShub2RlKTtcbiAgICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrLmNhbGwoX3RoaXMpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbmFtZSA9ICdhbmltYXRlLScgKyBkaXJlY3Rpb247XG4gICAgICB3aWxsTmFtZSA9ICd3aWxsLWFuaW1hdGUtJyArIGRpcmVjdGlvbjtcbiAgICAgIGlmIChjbGFzc05hbWUpIG5vZGUuY2xhc3NMaXN0LmFkZChjbGFzc05hbWUpO1xuXG4gICAgICBub2RlLmNsYXNzTGlzdC5hZGQod2lsbE5hbWUpO1xuXG4gICAgICAvLyB0cmlnZ2VyIHJlZmxvd1xuICAgICAgbm9kZS5vZmZzZXRXaWR0aCA9IG5vZGUub2Zmc2V0V2lkdGg7XG5cbiAgICAgIG5vZGUuY2xhc3NMaXN0LmFkZChuYW1lKTtcbiAgICAgIG5vZGUuY2xhc3NMaXN0LnJlbW92ZSh3aWxsTmFtZSk7XG5cbiAgICAgIHZhciBkdXJhdGlvbiA9IGdldER1cmF0aW9uLmNhbGwodGhpcywgbm9kZSwgZGlyZWN0aW9uKTtcbiAgICAgIHZhciB3aGVuRG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrLmNhbGwoX3RoaXMpO1xuICAgICAgICBub2RlLmNsYXNzTGlzdC5yZW1vdmUobmFtZSk7XG4gICAgICAgIGlmIChjbGFzc05hbWUpIG5vZGUuY2xhc3NMaXN0LnJlbW92ZShjbGFzc05hbWUpO1xuICAgICAgfTtcblxuICAgICAgaWYgKGR1cmF0aW9uKSB7XG4gICAgICAgIG9uQW5pbWF0aW9uRW5kKG5vZGUsIGR1cmF0aW9uLCB3aGVuRG9uZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB3aGVuRG9uZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufSk7XG5cblxudmFyIHRyYW5zaXRpb25EdXJhdGlvbk5hbWUgPSAndHJhbnNpdGlvbkR1cmF0aW9uJztcbnZhciB0cmFuc2l0aW9uRGVsYXlOYW1lID0gJ3RyYW5zaXRpb25EZWxheSc7XG52YXIgYW5pbWF0aW9uRHVyYXRpb25OYW1lID0gJ2FuaW1hdGlvbkR1cmF0aW9uJztcbnZhciBhbmltYXRpb25EZWxheU5hbWUgPSAnYW5pbWF0aW9uRGVsYXknO1xudmFyIHRyYW5zaXRpb25FdmVudE5hbWUgPSAndHJhbnNpdGlvbmVuZCc7XG52YXIgYW5pbWF0aW9uRXZlbnROYW1lID0gJ2FuaW1hdGlvbmVuZCc7XG52YXIgc3R5bGUgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGU7XG5cblsnd2Via2l0JywgJ21veicsICdtcycsICdvJ10uZm9yRWFjaChmdW5jdGlvbihwcmVmaXgpIHtcbiAgaWYgKHN0eWxlLnRyYW5zaXRpb25EdXJhdGlvbiA9PT0gdW5kZWZpbmVkICYmIHN0eWxlW3ByZWZpeCArICdUcmFuc2l0aW9uRHVyYXRpb24nXSkge1xuICAgIHRyYW5zaXRpb25EdXJhdGlvbk5hbWUgPSBwcmVmaXggKyAnVHJhbnNpdGlvbkR1cmF0aW9uJztcbiAgICB0cmFuc2l0aW9uRGVsYXlOYW1lID0gcHJlZml4ICsgJ1RyYW5zaXRpb25EZWxheSc7XG4gICAgdHJhbnNpdGlvbkV2ZW50TmFtZSA9IHByZWZpeCArICd0cmFuc2l0aW9uZW5kJztcbiAgfVxuXG4gIGlmIChzdHlsZS5hbmltYXRpb25EdXJhdGlvbiA9PT0gdW5kZWZpbmVkICYmIHN0eWxlW3ByZWZpeCArICdBbmltYXRpb25EdXJhdGlvbiddKSB7XG4gICAgYW5pbWF0aW9uRHVyYXRpb25OYW1lID0gcHJlZml4ICsgJ0FuaW1hdGlvbkR1cmF0aW9uJztcbiAgICBhbmltYXRpb25EZWxheU5hbWUgPSBwcmVmaXggKyAnQW5pbWF0aW9uRGVsYXknO1xuICAgIGFuaW1hdGlvbkV2ZW50TmFtZSA9IHByZWZpeCArICdhbmltYXRpb25lbmQnO1xuICB9XG59KTtcblxuXG5mdW5jdGlvbiBnZXREdXJhdGlvbihub2RlLCBkaXJlY3Rpb24pIHtcbiAgdmFyIG1pbGxpc2Vjb25kcyA9IHRoaXMuY2xvbmVkRnJvbVsnX19hbmltYXRpb25EdXJhdGlvbicgKyBkaXJlY3Rpb25dO1xuICBpZiAoIW1pbGxpc2Vjb25kcykge1xuICAgIC8vIFJlY2FsYyBpZiBub2RlIHdhcyBvdXQgb2YgRE9NIGJlZm9yZSBhbmQgaGFkIDAgZHVyYXRpb24sIGFzc3VtZSB0aGVyZSBpcyBhbHdheXMgU09NRSBkdXJhdGlvbi5cbiAgICB2YXIgc3R5bGVzID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUobm9kZSk7XG4gICAgdmFyIHNlY29uZHMgPSBNYXRoLm1heChwYXJzZUZsb2F0KHN0eWxlc1t0cmFuc2l0aW9uRHVyYXRpb25OYW1lXSB8fCAwKSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJzZUZsb2F0KHN0eWxlc1t0cmFuc2l0aW9uRGVsYXlOYW1lXSB8fCAwKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlRmxvYXQoc3R5bGVzW2FuaW1hdGlvbkR1cmF0aW9uTmFtZV0gfHwgMCkgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VGbG9hdChzdHlsZXNbYW5pbWF0aW9uRGVsYXlOYW1lXSB8fCAwKSk7XG4gICAgbWlsbGlzZWNvbmRzID0gc2Vjb25kcyAqIDEwMDAgfHwgMDtcbiAgICB0aGlzLmNsb25lZEZyb20uX19hbmltYXRpb25EdXJhdGlvbl9fID0gbWlsbGlzZWNvbmRzO1xuICB9XG4gIHJldHVybiBtaWxsaXNlY29uZHM7XG59XG5cblxuZnVuY3Rpb24gb25BbmltYXRpb25FbmQobm9kZSwgZHVyYXRpb24sIGNhbGxiYWNrKSB7XG4gIHZhciBvbkVuZCA9IGZ1bmN0aW9uKCkge1xuICAgIG5vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcih0cmFuc2l0aW9uRXZlbnROYW1lLCBvbkVuZCk7XG4gICAgbm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKGFuaW1hdGlvbkV2ZW50TmFtZSwgb25FbmQpO1xuICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICBjYWxsYmFjaygpO1xuICB9O1xuXG4gIC8vIGNvbnRpbmdlbmN5IHBsYW5cbiAgdmFyIHRpbWVvdXQgPSBzZXRUaW1lb3V0KG9uRW5kLCBkdXJhdGlvbiArIDEwKTtcblxuICBub2RlLmFkZEV2ZW50TGlzdGVuZXIodHJhbnNpdGlvbkV2ZW50TmFtZSwgb25FbmQpO1xuICBub2RlLmFkZEV2ZW50TGlzdGVuZXIoYW5pbWF0aW9uRXZlbnROYW1lLCBvbkVuZCk7XG59IiwibW9kdWxlLmV4cG9ydHMgPSBCaW5kaW5nO1xudmFyIENsYXNzID0gcmVxdWlyZSgnY2hpcC11dGlscy9jbGFzcycpO1xuXG4vKipcbiAqIEEgYmluZGluZyBpcyBhIGxpbmsgYmV0d2VlbiBhbiBlbGVtZW50IGFuZCBzb21lIGRhdGEuIFN1YmNsYXNzZXMgb2YgQmluZGluZyBjYWxsZWQgYmluZGVycyBkZWZpbmUgd2hhdCBhIGJpbmRpbmcgZG9lc1xuICogd2l0aCB0aGF0IGxpbmsuIEluc3RhbmNlcyBvZiB0aGVzZSBiaW5kZXJzIGFyZSBjcmVhdGVkIGFzIGJpbmRpbmdzIG9uIHRlbXBsYXRlcy4gV2hlbiBhIHZpZXcgaXMgc3RhbXBlZCBvdXQgZnJvbSB0aGVcbiAqIHRlbXBsYXRlIHRoZSBiaW5kaW5nIGlzIFwiY2xvbmVkXCIgKGl0IGlzIGFjdHVhbGx5IGV4dGVuZGVkIGZvciBwZXJmb3JtYW5jZSkgYW5kIHRoZSBgZWxlbWVudGAvYG5vZGVgIHByb3BlcnR5IGlzXG4gKiB1cGRhdGVkIHRvIHRoZSBtYXRjaGluZyBlbGVtZW50IGluIHRoZSB2aWV3LlxuICpcbiAqICMjIyBQcm9wZXJ0aWVzXG4gKiAgKiBlbGVtZW50OiBUaGUgZWxlbWVudCAob3IgdGV4dCBub2RlKSB0aGlzIGJpbmRpbmcgaXMgYm91bmQgdG9cbiAqICAqIG5vZGU6IEFsaWFzIG9mIGVsZW1lbnQsIHNpbmNlIGJpbmRpbmdzIG1heSBhcHBseSB0byB0ZXh0IG5vZGVzIHRoaXMgaXMgbW9yZSBhY2N1cmF0ZVxuICogICogbmFtZTogVGhlIGF0dHJpYnV0ZSBvciBlbGVtZW50IG5hbWUgKGRvZXMgbm90IGFwcGx5IHRvIG1hdGNoZWQgdGV4dCBub2RlcylcbiAqICAqIG1hdGNoOiBUaGUgbWF0Y2hlZCBwYXJ0IG9mIHRoZSBuYW1lIGZvciB3aWxkY2FyZCBhdHRyaWJ1dGVzIChlLmcuIGBvbi0qYCBtYXRjaGluZyBhZ2FpbnN0IGBvbi1jbGlja2Agd291bGQgaGF2ZSBhXG4gKiAgICBtYXRjaCBwcm9wZXJ0eSBlcXVhbGxpbmcgYGNsaWNrYCkuIFVzZSBgdGhpcy5jYW1lbENhc2VgIHRvIGdldCB0aGUgbWF0Y2ggcHJvZXJ0eSBjYW1lbENhc2VkLlxuICogICogZXhwcmVzc2lvbjogVGhlIGV4cHJlc3Npb24gdGhpcyBiaW5kaW5nIHdpbGwgdXNlIGZvciBpdHMgdXBkYXRlcyAoZG9lcyBub3QgYXBwbHkgdG8gbWF0Y2hlZCBlbGVtZW50cylcbiAqICAqIGNvbnRleHQ6IFRoZSBjb250ZXh0IHRoZSBleHJlc3Npb24gb3BlcmF0ZXMgd2l0aGluIHdoZW4gYm91bmRcbiAqL1xuZnVuY3Rpb24gQmluZGluZyhwcm9wZXJ0aWVzKSB7XG4gIGlmICghcHJvcGVydGllcy5ub2RlIHx8ICFwcm9wZXJ0aWVzLnZpZXcpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBIGJpbmRpbmcgbXVzdCByZWNlaXZlIGEgbm9kZSBhbmQgYSB2aWV3Jyk7XG4gIH1cblxuICAvLyBlbGVtZW50IGFuZCBub2RlIGFyZSBhbGlhc2VzXG4gIHRoaXMuX2VsZW1lbnRQYXRoID0gaW5pdE5vZGVQYXRoKHByb3BlcnRpZXMubm9kZSwgcHJvcGVydGllcy52aWV3KTtcbiAgdGhpcy5ub2RlID0gcHJvcGVydGllcy5ub2RlO1xuICB0aGlzLmVsZW1lbnQgPSBwcm9wZXJ0aWVzLm5vZGU7XG4gIHRoaXMubmFtZSA9IHByb3BlcnRpZXMubmFtZTtcbiAgdGhpcy5tYXRjaCA9IHByb3BlcnRpZXMubWF0Y2g7XG4gIHRoaXMuZXhwcmVzc2lvbiA9IHByb3BlcnRpZXMuZXhwcmVzc2lvbjtcbiAgdGhpcy5mcmFnbWVudHMgPSBwcm9wZXJ0aWVzLmZyYWdtZW50cztcbiAgdGhpcy5jb250ZXh0ID0gbnVsbDtcbn1cblxuQ2xhc3MuZXh0ZW5kKEJpbmRpbmcsIHtcbiAgLyoqXG4gICAqIERlZmF1bHQgcHJpb3JpdHkgYmluZGVycyBtYXkgb3ZlcnJpZGUuXG4gICAqL1xuICBwcmlvcml0eTogMCxcblxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIGEgY2xvbmVkIGJpbmRpbmcuIFRoaXMgaGFwcGVucyBhZnRlciBhIGNvbXBpbGVkIGJpbmRpbmcgb24gYSB0ZW1wbGF0ZSBpcyBjbG9uZWQgZm9yIGEgdmlldy5cbiAgICovXG4gIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLmV4cHJlc3Npb24pIHtcbiAgICAgIC8vIEFuIG9ic2VydmVyIHRvIG9ic2VydmUgdmFsdWUgY2hhbmdlcyB0byB0aGUgZXhwcmVzc2lvbiB3aXRoaW4gYSBjb250ZXh0XG4gICAgICB0aGlzLm9ic2VydmVyID0gdGhpcy5vYnNlcnZlKHRoaXMuZXhwcmVzc2lvbiwgdGhpcy51cGRhdGVkKTtcbiAgICB9XG4gICAgdGhpcy5jcmVhdGVkKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENsb25lIHRoaXMgYmluZGluZyBmb3IgYSB2aWV3LiBUaGUgZWxlbWVudC9ub2RlIHdpbGwgYmUgdXBkYXRlZCBhbmQgdGhlIGJpbmRpbmcgd2lsbCBiZSBpbml0ZWQuXG4gICAqL1xuICBjbG9uZUZvclZpZXc6IGZ1bmN0aW9uKHZpZXcpIHtcbiAgICBpZiAoIXZpZXcpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0EgYmluZGluZyBtdXN0IGNsb25lIGFnYWluc3QgYSB2aWV3Jyk7XG4gICAgfVxuXG4gICAgdmFyIG5vZGUgPSB2aWV3O1xuICAgIHRoaXMuX2VsZW1lbnRQYXRoLmZvckVhY2goZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgIG5vZGUgPSBub2RlLmNoaWxkTm9kZXNbaW5kZXhdO1xuICAgIH0pO1xuXG4gICAgdmFyIGJpbmRpbmcgPSBPYmplY3QuY3JlYXRlKHRoaXMpO1xuICAgIGJpbmRpbmcuY2xvbmVkRnJvbSA9IHRoaXM7XG4gICAgYmluZGluZy5lbGVtZW50ID0gbm9kZTtcbiAgICBiaW5kaW5nLm5vZGUgPSBub2RlO1xuICAgIGJpbmRpbmcuaW5pdCgpO1xuICAgIHJldHVybiBiaW5kaW5nO1xuICB9LFxuXG5cbiAgLy8gQmluZCB0aGlzIHRvIHRoZSBnaXZlbiBjb250ZXh0IG9iamVjdFxuICBiaW5kOiBmdW5jdGlvbihjb250ZXh0KSB7XG4gICAgaWYgKHRoaXMuY29udGV4dCA9PSBjb250ZXh0KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5jb250ZXh0ID0gY29udGV4dDtcbiAgICBpZiAodGhpcy5vYnNlcnZlcikgdGhpcy5vYnNlcnZlci5jb250ZXh0ID0gY29udGV4dDtcbiAgICB0aGlzLmJvdW5kKCk7XG5cbiAgICBpZiAodGhpcy5vYnNlcnZlcikge1xuICAgICAgaWYgKHRoaXMudXBkYXRlZCAhPT0gQmluZGluZy5wcm90b3R5cGUudXBkYXRlZCkge1xuICAgICAgICB0aGlzLm9ic2VydmVyLmZvcmNlVXBkYXRlTmV4dFN5bmMgPSB0cnVlO1xuICAgICAgICB0aGlzLm9ic2VydmVyLmJpbmQoY29udGV4dCk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG5cbiAgLy8gVW5iaW5kIHRoaXMgZnJvbSBpdHMgY29udGV4dFxuICB1bmJpbmQ6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLmNvbnRleHQgPT09IG51bGwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vYnNlcnZlcikgdGhpcy5vYnNlcnZlci51bmJpbmQoKTtcbiAgICB0aGlzLnVuYm91bmQoKTtcbiAgICB0aGlzLmNvbnRleHQgPSBudWxsO1xuICB9LFxuXG5cbiAgLy8gQ2xlYW5zIHVwIGJpbmRpbmcgY29tcGxldGVseVxuICBkaXNwb3NlOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnVuYmluZCgpO1xuICAgIGlmICh0aGlzLm9ic2VydmVyKSB7XG4gICAgICAvLyBUaGlzIHdpbGwgY2xlYXIgaXQgb3V0LCBudWxsaWZ5aW5nIGFueSBkYXRhIHN0b3JlZFxuICAgICAgdGhpcy5vYnNlcnZlci5zeW5jKCk7XG4gICAgfVxuICAgIHRoaXMuZGlzcG9zZWQoKTtcbiAgfSxcblxuXG4gIC8vIFRoZSBmdW5jdGlvbiB0byBydW4gd2hlbiB0aGUgYmluZGluZydzIGVsZW1lbnQgaXMgY29tcGlsZWQgd2l0aGluIGEgdGVtcGxhdGVcbiAgY29tcGlsZWQ6IGZ1bmN0aW9uKCkge30sXG5cbiAgLy8gVGhlIGZ1bmN0aW9uIHRvIHJ1biB3aGVuIHRoZSBiaW5kaW5nJ3MgZWxlbWVudCBpcyBjcmVhdGVkXG4gIGNyZWF0ZWQ6IGZ1bmN0aW9uKCkge30sXG5cbiAgLy8gVGhlIGZ1bmN0aW9uIHRvIHJ1biB3aGVuIHRoZSBleHByZXNzaW9uJ3MgdmFsdWUgY2hhbmdlc1xuICB1cGRhdGVkOiBmdW5jdGlvbigpIHt9LFxuXG4gIC8vIFRoZSBmdW5jdGlvbiB0byBydW4gd2hlbiB0aGUgYmluZGluZyBpcyBib3VuZFxuICBib3VuZDogZnVuY3Rpb24oKSB7fSxcblxuICAvLyBUaGUgZnVuY3Rpb24gdG8gcnVuIHdoZW4gdGhlIGJpbmRpbmcgaXMgdW5ib3VuZFxuICB1bmJvdW5kOiBmdW5jdGlvbigpIHt9LFxuXG4gIC8vIFRoZSBmdW5jdGlvbiB0byBydW4gd2hlbiB0aGUgYmluZGluZyBpcyBkaXNwb3NlZFxuICBkaXNwb3NlZDogZnVuY3Rpb24oKSB7fSxcblxuICAvLyBIZWxwZXIgbWV0aG9kc1xuXG4gIGdldCBjYW1lbENhc2UoKSB7XG4gICAgcmV0dXJuICh0aGlzLm1hdGNoIHx8IHRoaXMubmFtZSB8fCAnJykucmVwbGFjZSgvLSsoXFx3KS9nLCBmdW5jdGlvbihfLCBjaGFyKSB7XG4gICAgICByZXR1cm4gY2hhci50b1VwcGVyQ2FzZSgpO1xuICAgIH0pO1xuICB9LFxuXG4gIG9ic2VydmU6IGZ1bmN0aW9uKGV4cHJlc3Npb24sIGNhbGxiYWNrLCBjYWxsYmFja0NvbnRleHQpIHtcbiAgICByZXR1cm4gdGhpcy5vYnNlcnZhdGlvbnMuY3JlYXRlT2JzZXJ2ZXIoZXhwcmVzc2lvbiwgY2FsbGJhY2ssIGNhbGxiYWNrQ29udGV4dCB8fCB0aGlzKTtcbiAgfVxufSk7XG5cblxuXG5cbnZhciBpbmRleE9mID0gQXJyYXkucHJvdG90eXBlLmluZGV4T2Y7XG5cbi8vIENyZWF0ZXMgYW4gYXJyYXkgb2YgaW5kZXhlcyB0byBoZWxwIGZpbmQgdGhlIHNhbWUgZWxlbWVudCB3aXRoaW4gYSBjbG9uZWQgdmlld1xuZnVuY3Rpb24gaW5pdE5vZGVQYXRoKG5vZGUsIHZpZXcpIHtcbiAgdmFyIHBhdGggPSBbXTtcbiAgd2hpbGUgKG5vZGUgIT09IHZpZXcpIHtcbiAgICB2YXIgcGFyZW50ID0gbm9kZS5wYXJlbnROb2RlO1xuICAgIHBhdGgudW5zaGlmdChpbmRleE9mLmNhbGwocGFyZW50LmNoaWxkTm9kZXMsIG5vZGUpKTtcbiAgICBub2RlID0gcGFyZW50O1xuICB9XG4gIHJldHVybiBwYXRoO1xufVxuIiwidmFyIHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xubW9kdWxlLmV4cG9ydHMgPSBjb21waWxlO1xuXG5cbi8vIFdhbGtzIHRoZSB0ZW1wbGF0ZSBET00gcmVwbGFjaW5nIGFueSBiaW5kaW5ncyBhbmQgY2FjaGluZyBiaW5kaW5ncyBvbnRvIHRoZSB0ZW1wbGF0ZSBvYmplY3QuXG5mdW5jdGlvbiBjb21waWxlKGZyYWdtZW50cywgdGVtcGxhdGUpIHtcbiAgdmFyIHdhbGtlciA9IGRvY3VtZW50LmNyZWF0ZVRyZWVXYWxrZXIodGVtcGxhdGUsIE5vZGVGaWx0ZXIuU0hPV19FTEVNRU5UIHwgTm9kZUZpbHRlci5TSE9XX1RFWFQpO1xuICB2YXIgYmluZGluZ3MgPSBbXSwgY3VycmVudE5vZGUsIHBhcmVudE5vZGUsIHByZXZpb3VzTm9kZTtcblxuICAvLyBSZXNldCBmaXJzdCBub2RlIHRvIGVuc3VyZSBpdCBpc24ndCBhIGZyYWdtZW50XG4gIHdhbGtlci5uZXh0Tm9kZSgpO1xuICB3YWxrZXIucHJldmlvdXNOb2RlKCk7XG5cbiAgLy8gZmluZCBiaW5kaW5ncyBmb3IgZWFjaCBub2RlXG4gIGRvIHtcbiAgICBjdXJyZW50Tm9kZSA9IHdhbGtlci5jdXJyZW50Tm9kZTtcbiAgICBwYXJlbnROb2RlID0gY3VycmVudE5vZGUucGFyZW50Tm9kZTtcbiAgICBiaW5kaW5ncy5wdXNoLmFwcGx5KGJpbmRpbmdzLCBnZXRCaW5kaW5nc0Zvck5vZGUoZnJhZ21lbnRzLCBjdXJyZW50Tm9kZSwgdGVtcGxhdGUpKTtcblxuICAgIGlmIChjdXJyZW50Tm9kZS5wYXJlbnROb2RlICE9PSBwYXJlbnROb2RlKSB7XG4gICAgICAvLyBjdXJyZW50Tm9kZSB3YXMgcmVtb3ZlZCBhbmQgbWFkZSBhIHRlbXBsYXRlXG4gICAgICB3YWxrZXIuY3VycmVudE5vZGUgPSBwcmV2aW91c05vZGUgfHwgd2Fsa2VyLnJvb3Q7XG4gICAgfSBlbHNlIHtcbiAgICAgIHByZXZpb3VzTm9kZSA9IGN1cnJlbnROb2RlO1xuICAgIH1cbiAgfSB3aGlsZSAod2Fsa2VyLm5leHROb2RlKCkpO1xuXG4gIHJldHVybiBiaW5kaW5ncztcbn1cblxuXG5cbi8vIEZpbmQgYWxsIHRoZSBiaW5kaW5ncyBvbiBhIGdpdmVuIG5vZGUgKHRleHQgbm9kZXMgd2lsbCBvbmx5IGV2ZXIgaGF2ZSBvbmUgYmluZGluZykuXG5mdW5jdGlvbiBnZXRCaW5kaW5nc0Zvck5vZGUoZnJhZ21lbnRzLCBub2RlLCB2aWV3KSB7XG4gIHZhciBiaW5kaW5ncyA9IFtdO1xuICB2YXIgQmluZGVyLCBiaW5kaW5nLCBleHByLCBib3VuZCwgbWF0Y2gsIGF0dHIsIGksIGw7XG5cbiAgaWYgKG5vZGUubm9kZVR5cGUgPT09IE5vZGUuVEVYVF9OT0RFKSB7XG4gICAgc3BsaXRUZXh0Tm9kZShmcmFnbWVudHMsIG5vZGUpO1xuXG4gICAgLy8gRmluZCBhbnkgYmluZGluZyBmb3IgdGhlIHRleHQgbm9kZVxuICAgIGlmIChmcmFnbWVudHMuaXNCb3VuZCgndGV4dCcsIG5vZGUubm9kZVZhbHVlKSkge1xuICAgICAgZXhwciA9IGZyYWdtZW50cy5jb2RpZnlFeHByZXNzaW9uKCd0ZXh0Jywgbm9kZS5ub2RlVmFsdWUpO1xuICAgICAgbm9kZS5ub2RlVmFsdWUgPSAnJztcbiAgICAgIEJpbmRlciA9IGZyYWdtZW50cy5maW5kQmluZGVyKCd0ZXh0JywgZXhwcik7XG4gICAgICBiaW5kaW5nID0gbmV3IEJpbmRlcih7IG5vZGU6IG5vZGUsIHZpZXc6IHZpZXcsIGV4cHJlc3Npb246IGV4cHIsIGZyYWdtZW50czogZnJhZ21lbnRzIH0pO1xuICAgICAgaWYgKGJpbmRpbmcuY29tcGlsZWQoKSAhPT0gZmFsc2UpIHtcbiAgICAgICAgYmluZGluZ3MucHVzaChiaW5kaW5nKTtcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gSWYgdGhlIGVsZW1lbnQgaXMgcmVtb3ZlZCBmcm9tIHRoZSBET00sIHN0b3AuIENoZWNrIGJ5IGxvb2tpbmcgYXQgaXRzIHBhcmVudE5vZGVcbiAgICB2YXIgcGFyZW50ID0gbm9kZS5wYXJlbnROb2RlO1xuICAgIHZhciBEZWZhdWx0QmluZGVyID0gZnJhZ21lbnRzLmdldEF0dHJpYnV0ZUJpbmRlcignX19kZWZhdWx0X18nKTtcblxuICAgIC8vIEZpbmQgYW55IGJpbmRpbmcgZm9yIHRoZSBlbGVtZW50XG4gICAgQmluZGVyID0gZnJhZ21lbnRzLmZpbmRCaW5kZXIoJ2VsZW1lbnQnLCBub2RlLnRhZ05hbWUudG9Mb3dlckNhc2UoKSk7XG4gICAgaWYgKEJpbmRlcikge1xuICAgICAgYmluZGluZyA9IG5ldyBCaW5kZXIoeyBub2RlOiBub2RlLCB2aWV3OiB2aWV3LCBmcmFnbWVudHM6IGZyYWdtZW50cyB9KTtcbiAgICAgIGlmIChiaW5kaW5nLmNvbXBpbGVkKCkgIT09IGZhbHNlKSB7XG4gICAgICAgIGJpbmRpbmdzLnB1c2goYmluZGluZyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gSWYgcmVtb3ZlZCwgbWFkZSBhIHRlbXBsYXRlLCBkb24ndCBjb250aW51ZSBwcm9jZXNzaW5nXG4gICAgaWYgKG5vZGUucGFyZW50Tm9kZSAhPT0gcGFyZW50KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gRmluZCBhbmQgYWRkIGFueSBhdHRyaWJ1dGUgYmluZGluZ3Mgb24gYW4gZWxlbWVudC4gVGhlc2UgY2FuIGJlIGF0dHJpYnV0ZXMgd2hvc2UgbmFtZSBtYXRjaGVzIGEgYmluZGluZywgb3JcbiAgICAvLyB0aGV5IGNhbiBiZSBhdHRyaWJ1dGVzIHdoaWNoIGhhdmUgYSBiaW5kaW5nIGluIHRoZSB2YWx1ZSBzdWNoIGFzIGBocmVmPVwiL3Bvc3Qve3sgcG9zdC5pZCB9fVwiYC5cbiAgICBib3VuZCA9IFtdO1xuICAgIHZhciBhdHRyaWJ1dGVzID0gc2xpY2UuY2FsbChub2RlLmF0dHJpYnV0ZXMpO1xuICAgIGZvciAoaSA9IDAsIGwgPSBhdHRyaWJ1dGVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgYXR0ciA9IGF0dHJpYnV0ZXNbaV07XG4gICAgICBCaW5kZXIgPSBmcmFnbWVudHMuZmluZEJpbmRlcignYXR0cmlidXRlJywgYXR0ci5uYW1lLCBhdHRyLnZhbHVlKTtcbiAgICAgIGlmIChCaW5kZXIpIHtcbiAgICAgICAgYm91bmQucHVzaChbIEJpbmRlciwgYXR0ciBdKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBNYWtlIHN1cmUgdG8gY3JlYXRlIGFuZCBwcm9jZXNzIHRoZW0gaW4gdGhlIGNvcnJlY3QgcHJpb3JpdHkgb3JkZXIgc28gaWYgYSBiaW5kaW5nIGNyZWF0ZSBhIHRlbXBsYXRlIGZyb20gdGhlXG4gICAgLy8gbm9kZSBpdCBkb2Vzbid0IHByb2Nlc3MgdGhlIG90aGVycy5cbiAgICBib3VuZC5zb3J0KHNvcnRBdHRyaWJ1dGVzKTtcblxuICAgIGZvciAoaSA9IDA7IGkgPCBib3VuZC5sZW5ndGg7IGkrKykge1xuICAgICAgQmluZGVyID0gYm91bmRbaV1bMF07XG4gICAgICBhdHRyID0gYm91bmRbaV1bMV07XG4gICAgICBpZiAoIW5vZGUuaGFzQXR0cmlidXRlKGF0dHIubmFtZSkpIHtcbiAgICAgICAgLy8gSWYgdGhpcyB3YXMgcmVtb3ZlZCBhbHJlYWR5IGJ5IGFub3RoZXIgYmluZGluZywgZG9uJ3QgcHJvY2Vzcy5cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICB2YXIgbmFtZSA9IGF0dHIubmFtZTtcbiAgICAgIHZhciB2YWx1ZSA9IGF0dHIudmFsdWU7XG4gICAgICBpZiAoQmluZGVyLmV4cHIpIHtcbiAgICAgICAgbWF0Y2ggPSBuYW1lLm1hdGNoKEJpbmRlci5leHByKTtcbiAgICAgICAgaWYgKG1hdGNoKSBtYXRjaCA9IG1hdGNoWzFdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbWF0Y2ggPSBudWxsO1xuICAgICAgfVxuXG4gICAgICB0cnkge1xuICAgICAgICBub2RlLnJlbW92ZUF0dHJpYnV0ZShhdHRyLm5hbWUpO1xuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgIC8vIGlmIHRoZSBhdHRyaWJ1dGUgd2FzIGFscmVhZHkgcmVtb3ZlZCBkb24ndCB3b3JyeVxuICAgICAgfVxuXG4gICAgICBiaW5kaW5nID0gbmV3IEJpbmRlcih7XG4gICAgICAgIG5vZGU6IG5vZGUsXG4gICAgICAgIHZpZXc6IHZpZXcsXG4gICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgIG1hdGNoOiBtYXRjaCxcbiAgICAgICAgZXhwcmVzc2lvbjogdmFsdWUgPyBmcmFnbWVudHMuY29kaWZ5RXhwcmVzc2lvbignYXR0cmlidXRlJywgdmFsdWUpIDogbnVsbCxcbiAgICAgICAgZnJhZ21lbnRzOiBmcmFnbWVudHNcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoYmluZGluZy5jb21waWxlZCgpICE9PSBmYWxzZSkge1xuICAgICAgICBiaW5kaW5ncy5wdXNoKGJpbmRpbmcpO1xuICAgICAgfSBlbHNlIGlmIChCaW5kZXIgIT09IERlZmF1bHRCaW5kZXIgJiYgZnJhZ21lbnRzLmlzQm91bmQoJ2F0dHJpYnV0ZScsIHZhbHVlKSkge1xuICAgICAgICAvLyBSZXZlcnQgdG8gZGVmYXVsdCBpZiB0aGlzIGJpbmRpbmcgZG9lc24ndCB0YWtlXG4gICAgICAgIGJvdW5kLnB1c2goWyBEZWZhdWx0QmluZGVyLCBhdHRyIF0pO1xuICAgICAgfVxuXG4gICAgICBpZiAobm9kZS5wYXJlbnROb2RlICE9PSBwYXJlbnQpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJpbmRpbmdzO1xufVxuXG5cbi8vIFNwbGl0cyB0ZXh0IG5vZGVzIHdpdGggZXhwcmVzc2lvbnMgaW4gdGhlbSBzbyB0aGV5IGNhbiBiZSBib3VuZCBpbmRpdmlkdWFsbHksIGhhcyBwYXJlbnROb2RlIHBhc3NlZCBpbiBzaW5jZSBpdCBtYXlcbi8vIGJlIGEgZG9jdW1lbnQgZnJhZ21lbnQgd2hpY2ggYXBwZWFycyBhcyBudWxsIG9uIG5vZGUucGFyZW50Tm9kZS5cbmZ1bmN0aW9uIHNwbGl0VGV4dE5vZGUoZnJhZ21lbnRzLCBub2RlKSB7XG4gIGlmICghbm9kZS5wcm9jZXNzZWQpIHtcbiAgICBub2RlLnByb2Nlc3NlZCA9IHRydWU7XG4gICAgdmFyIHJlZ2V4ID0gZnJhZ21lbnRzLmJpbmRlcnMudGV4dC5fZXhwcjtcbiAgICB2YXIgY29udGVudCA9IG5vZGUubm9kZVZhbHVlO1xuICAgIGlmIChjb250ZW50Lm1hdGNoKHJlZ2V4KSkge1xuICAgICAgdmFyIG1hdGNoLCBsYXN0SW5kZXggPSAwLCBwYXJ0cyA9IFtdLCBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICAgIHdoaWxlICgobWF0Y2ggPSByZWdleC5leGVjKGNvbnRlbnQpKSkge1xuICAgICAgICBwYXJ0cy5wdXNoKGNvbnRlbnQuc2xpY2UobGFzdEluZGV4LCByZWdleC5sYXN0SW5kZXggLSBtYXRjaFswXS5sZW5ndGgpKTtcbiAgICAgICAgcGFydHMucHVzaChtYXRjaFswXSk7XG4gICAgICAgIGxhc3RJbmRleCA9IHJlZ2V4Lmxhc3RJbmRleDtcbiAgICAgIH1cbiAgICAgIHBhcnRzLnB1c2goY29udGVudC5zbGljZShsYXN0SW5kZXgpKTtcbiAgICAgIHBhcnRzID0gcGFydHMuZmlsdGVyKG5vdEVtcHR5KTtcblxuICAgICAgbm9kZS5ub2RlVmFsdWUgPSBwYXJ0c1swXTtcbiAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgcGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIG5ld1RleHROb2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUocGFydHNbaV0pO1xuICAgICAgICBuZXdUZXh0Tm9kZS5wcm9jZXNzZWQgPSB0cnVlO1xuICAgICAgICBmcmFnbWVudC5hcHBlbmRDaGlsZChuZXdUZXh0Tm9kZSk7XG4gICAgICB9XG4gICAgICBub2RlLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGZyYWdtZW50LCBub2RlLm5leHRTaWJsaW5nKTtcbiAgICB9XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBzb3J0QXR0cmlidXRlcyhhLCBiKSB7XG4gIHJldHVybiBiWzBdLnByb3RvdHlwZS5wcmlvcml0eSAtIGFbMF0ucHJvdG90eXBlLnByaW9yaXR5O1xufVxuXG5mdW5jdGlvbiBub3RFbXB0eSh2YWx1ZSkge1xuICByZXR1cm4gQm9vbGVhbih2YWx1ZSk7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IEZyYWdtZW50cztcbnJlcXVpcmUoJy4vdXRpbC9wb2x5ZmlsbHMnKTtcbnZhciBDbGFzcyA9IHJlcXVpcmUoJ2NoaXAtdXRpbHMvY2xhc3MnKTtcbnZhciB0b0ZyYWdtZW50ID0gcmVxdWlyZSgnLi91dGlsL3RvRnJhZ21lbnQnKTtcbnZhciBhbmltYXRpb24gPSByZXF1aXJlKCcuL3V0aWwvYW5pbWF0aW9uJyk7XG52YXIgVGVtcGxhdGUgPSByZXF1aXJlKCcuL3RlbXBsYXRlJyk7XG52YXIgVmlldyA9IHJlcXVpcmUoJy4vdmlldycpO1xudmFyIEJpbmRpbmcgPSByZXF1aXJlKCcuL2JpbmRpbmcnKTtcbnZhciBBbmltYXRlZEJpbmRpbmcgPSByZXF1aXJlKCcuL2FuaW1hdGVkQmluZGluZycpO1xudmFyIGNvbXBpbGUgPSByZXF1aXJlKCcuL2NvbXBpbGUnKTtcbnZhciBoYXNXaWxkY2FyZEV4cHIgPSAvKF58W15cXFxcXSlcXCovO1xudmFyIGVzY2FwZWRXaWxkY2FyZEV4cHIgPSAvKF58W15cXFxcXSlcXFxcXFwqLztcblxuLyoqXG4gKiBBIEZyYWdtZW50cyBvYmplY3Qgc2VydmVzIGFzIGEgcmVnaXN0cnkgZm9yIGJpbmRlcnMgYW5kIGZvcm1hdHRlcnNcbiAqIEBwYXJhbSB7T2JzZXJ2YXRpb25zfSBvYnNlcnZhdGlvbnMgQW4gaW5zdGFuY2Ugb2YgT2JzZXJ2YXRpb25zIGZvciB0cmFja2luZyBjaGFuZ2VzIHRvIHRoZSBkYXRhXG4gKi9cbmZ1bmN0aW9uIEZyYWdtZW50cyhvYnNlcnZhdGlvbnMpIHtcbiAgaWYgKCFvYnNlcnZhdGlvbnMpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdNdXN0IHByb3ZpZGUgYW4gb2JzZXJ2YXRpb25zIGluc3RhbmNlIHRvIEZyYWdtZW50cy4nKTtcbiAgfVxuXG4gIHRoaXMub2JzZXJ2YXRpb25zID0gb2JzZXJ2YXRpb25zO1xuICB0aGlzLmdsb2JhbHMgPSBvYnNlcnZhdGlvbnMuZ2xvYmFscztcbiAgdGhpcy5mb3JtYXR0ZXJzID0gb2JzZXJ2YXRpb25zLmZvcm1hdHRlcnM7XG4gIHRoaXMuYW5pbWF0aW9ucyA9IHt9O1xuICB0aGlzLmFuaW1hdGVBdHRyaWJ1dGUgPSAnYW5pbWF0ZSc7XG5cbiAgdGhpcy5iaW5kZXJzID0ge1xuICAgIGVsZW1lbnQ6IHsgX3dpbGRjYXJkczogW10gfSxcbiAgICBhdHRyaWJ1dGU6IHsgX3dpbGRjYXJkczogW10sIF9leHByOiAve3tcXHMqKC4qPylcXHMqfX0vZywgX2RlbGltaXRlcnNPbmx5SW5EZWZhdWx0OiBmYWxzZSB9LFxuICAgIHRleHQ6IHsgX3dpbGRjYXJkczogW10sIF9leHByOiAve3tcXHMqKC4qPylcXHMqfX0vZyB9XG4gIH07XG5cbiAgLy8gVGV4dCBiaW5kZXIgZm9yIHRleHQgbm9kZXMgd2l0aCBleHByZXNzaW9ucyBpbiB0aGVtXG4gIHRoaXMucmVnaXN0ZXJUZXh0KCdfX2RlZmF1bHRfXycsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgdGhpcy5lbGVtZW50LnRleHRDb250ZW50ID0gKHZhbHVlICE9IG51bGwpID8gdmFsdWUgOiAnJztcbiAgfSk7XG5cbiAgLy8gQ2F0Y2hhbGwgYXR0cmlidXRlIGJpbmRlciBmb3IgcmVndWxhciBhdHRyaWJ1dGVzIHdpdGggZXhwcmVzc2lvbnMgaW4gdGhlbVxuICB0aGlzLnJlZ2lzdGVyQXR0cmlidXRlKCdfX2RlZmF1bHRfXycsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlICE9IG51bGwpIHtcbiAgICAgIHRoaXMuZWxlbWVudC5zZXRBdHRyaWJ1dGUodGhpcy5uYW1lLCB2YWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUodGhpcy5uYW1lKTtcbiAgICB9XG4gIH0pO1xufVxuXG5DbGFzcy5leHRlbmQoRnJhZ21lbnRzLCB7XG5cbiAgLyoqXG4gICAqIFRha2VzIGFuIEhUTUwgc3RyaW5nLCBhbiBlbGVtZW50LCBhbiBhcnJheSBvZiBlbGVtZW50cywgb3IgYSBkb2N1bWVudCBmcmFnbWVudCwgYW5kIGNvbXBpbGVzIGl0IGludG8gYSB0ZW1wbGF0ZS5cbiAgICogSW5zdGFuY2VzIG1heSB0aGVuIGJlIGNyZWF0ZWQgYW5kIGJvdW5kIHRvIGEgZ2l2ZW4gY29udGV4dC5cbiAgICogQHBhcmFtIHtTdHJpbmd8Tm9kZUxpc3R8SFRNTENvbGxlY3Rpb258SFRNTFRlbXBsYXRlRWxlbWVudHxIVE1MU2NyaXB0RWxlbWVudHxOb2RlfSBodG1sIEEgVGVtcGxhdGUgY2FuIGJlIGNyZWF0ZWRcbiAgICogZnJvbSBtYW55IGRpZmZlcmVudCB0eXBlcyBvZiBvYmplY3RzLiBBbnkgb2YgdGhlc2Ugd2lsbCBiZSBjb252ZXJ0ZWQgaW50byBhIGRvY3VtZW50IGZyYWdtZW50IGZvciB0aGUgdGVtcGxhdGUgdG9cbiAgICogY2xvbmUuIE5vZGVzIGFuZCBlbGVtZW50cyBwYXNzZWQgaW4gd2lsbCBiZSByZW1vdmVkIGZyb20gdGhlIERPTS5cbiAgICovXG4gIGNyZWF0ZVRlbXBsYXRlOiBmdW5jdGlvbihodG1sKSB7XG4gICAgdmFyIGZyYWdtZW50ID0gdG9GcmFnbWVudChodG1sKTtcbiAgICBpZiAoZnJhZ21lbnQuY2hpbGROb2Rlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGNyZWF0ZSBhIHRlbXBsYXRlIGZyb20gJyArIGh0bWwpO1xuICAgIH1cbiAgICB2YXIgdGVtcGxhdGUgPSBUZW1wbGF0ZS5tYWtlSW5zdGFuY2VPZihmcmFnbWVudCk7XG4gICAgdGVtcGxhdGUuYmluZGluZ3MgPSBjb21waWxlKHRoaXMsIHRlbXBsYXRlKTtcbiAgICByZXR1cm4gdGVtcGxhdGU7XG4gIH0sXG5cblxuICAvKipcbiAgICogQ29tcGlsZXMgYmluZGluZ3Mgb24gYW4gZWxlbWVudC5cbiAgICovXG4gIGNvbXBpbGVFbGVtZW50OiBmdW5jdGlvbihlbGVtZW50KSB7XG4gICAgaWYgKCFlbGVtZW50LmJpbmRpbmdzKSB7XG4gICAgICBlbGVtZW50LmJpbmRpbmdzID0gY29tcGlsZSh0aGlzLCBlbGVtZW50KTtcbiAgICAgIFZpZXcubWFrZUluc3RhbmNlT2YoZWxlbWVudCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGVsZW1lbnQ7XG4gIH0sXG5cblxuICAvKipcbiAgICogQ29tcGlsZXMgYW5kIGJpbmRzIGFuIGVsZW1lbnQgd2hpY2ggd2FzIG5vdCBjcmVhdGVkIGZyb20gYSB0ZW1wbGF0ZS4gTW9zdGx5IG9ubHkgdXNlZCBmb3IgYmluZGluZyB0aGUgZG9jdW1lbnQnc1xuICAgKiBodG1sIGVsZW1lbnQuXG4gICAqL1xuICBiaW5kRWxlbWVudDogZnVuY3Rpb24oZWxlbWVudCwgY29udGV4dCkge1xuICAgIHRoaXMuY29tcGlsZUVsZW1lbnQoZWxlbWVudCk7XG5cbiAgICBpZiAoY29udGV4dCkge1xuICAgICAgZWxlbWVudC5iaW5kKGNvbnRleHQpO1xuICAgIH1cblxuICAgIHJldHVybiBlbGVtZW50O1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIE9ic2VydmVzIGFuIGV4cHJlc3Npb24gd2l0aGluIGEgZ2l2ZW4gY29udGV4dCwgY2FsbGluZyB0aGUgY2FsbGJhY2sgd2hlbiBpdCBjaGFuZ2VzIGFuZCByZXR1cm5pbmcgdGhlIG9ic2VydmVyLlxuICAgKi9cbiAgb2JzZXJ2ZTogZnVuY3Rpb24oY29udGV4dCwgZXhwciwgY2FsbGJhY2ssIGNhbGxiYWNrQ29udGV4dCkge1xuICAgIGlmICh0eXBlb2YgY29udGV4dCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGNhbGxiYWNrQ29udGV4dCA9IGNhbGxiYWNrO1xuICAgICAgY2FsbGJhY2sgPSBleHByO1xuICAgICAgZXhwciA9IGNvbnRleHQ7XG4gICAgICBjb250ZXh0ID0gbnVsbDtcbiAgICB9XG4gICAgdmFyIG9ic2VydmVyID0gdGhpcy5vYnNlcnZhdGlvbnMuY3JlYXRlT2JzZXJ2ZXIoZXhwciwgY2FsbGJhY2ssIGNhbGxiYWNrQ29udGV4dCk7XG4gICAgaWYgKGNvbnRleHQpIHtcbiAgICAgIG9ic2VydmVyLmJpbmQoY29udGV4dCwgdHJ1ZSk7XG4gICAgfVxuICAgIHJldHVybiBvYnNlcnZlcjtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBSZWdpc3RlcnMgYSBiaW5kZXIgZm9yIGEgZ2l2ZW4gdHlwZSBhbmQgbmFtZS4gQSBiaW5kZXIgaXMgYSBzdWJjbGFzcyBvZiBCaW5kaW5nIGFuZCBpcyB1c2VkIHRvIGNyZWF0ZSBiaW5kaW5ncyBvblxuICAgKiBhbiBlbGVtZW50IG9yIHRleHQgbm9kZSB3aG9zZSB0YWcgbmFtZSwgYXR0cmlidXRlIG5hbWUsIG9yIGV4cHJlc3Npb24gY29udGVudHMgbWF0Y2ggdGhpcyBiaW5kZXIncyBuYW1lL2V4cHJlc3Npb24uXG4gICAqXG4gICAqICMjIyBQYXJhbWV0ZXJzXG4gICAqXG4gICAqICAqIGB0eXBlYDogdGhlcmUgYXJlIHRocmVlIHR5cGVzIG9mIGJpbmRlcnM6IGVsZW1lbnQsIGF0dHJpYnV0ZSwgb3IgdGV4dC4gVGhlc2UgY29ycmVzcG9uZCB0byBtYXRjaGluZyBhZ2FpbnN0IGFuXG4gICAqICAgIGVsZW1lbnQncyB0YWcgbmFtZSwgYW4gZWxlbWVudCB3aXRoIHRoZSBnaXZlbiBhdHRyaWJ1dGUgbmFtZSwgb3IgYSB0ZXh0IG5vZGUgdGhhdCBtYXRjaGVzIHRoZSBwcm92aWRlZFxuICAgKiAgICBleHByZXNzaW9uLlxuICAgKlxuICAgKiAgKiBgbmFtZWA6IHRvIG1hdGNoLCBhIGJpbmRlciBuZWVkcyB0aGUgbmFtZSBvZiBhbiBlbGVtZW50IG9yIGF0dHJpYnV0ZSwgb3IgYSByZWd1bGFyIGV4cHJlc3Npb24gdGhhdCBtYXRjaGVzIGFcbiAgICogICAgZ2l2ZW4gdGV4dCBub2RlLiBOYW1lcyBmb3IgZWxlbWVudHMgYW5kIGF0dHJpYnV0ZXMgY2FuIGJlIHJlZ3VsYXIgZXhwcmVzc2lvbnMgYXMgd2VsbCwgb3IgdGhleSBtYXkgYmUgd2lsZGNhcmRcbiAgICogICAgbmFtZXMgYnkgdXNpbmcgYW4gYXN0ZXJpc2suXG4gICAqXG4gICAqICAqIGBkZWZpbml0aW9uYDogYSBiaW5kZXIgaXMgYSBzdWJjbGFzcyBvZiBCaW5kaW5nIHdoaWNoIG92ZXJyaWRlcyBrZXkgbWV0aG9kcywgYGNvbXBpbGVkYCwgYGNyZWF0ZWRgLCBgdXBkYXRlZGAsXG4gICAqICAgIGBib3VuZGAsIGFuZCBgdW5ib3VuZGAuIFRoZSBkZWZpbml0aW9uIG1heSBiZSBhbiBhY3R1YWwgc3ViY2xhc3Mgb2YgQmluZGluZyBvciBpdCBtYXkgYmUgYW4gb2JqZWN0IHdoaWNoIHdpbGwgYmVcbiAgICogICAgdXNlZCBmb3IgdGhlIHByb3RvdHlwZSBvZiB0aGUgbmV3bHkgY3JlYXRlZCBzdWJjbGFzcy4gRm9yIG1hbnkgYmluZGluZ3Mgb25seSB0aGUgYHVwZGF0ZWRgIG1ldGhvZCBpcyBvdmVycmlkZGVuLFxuICAgKiAgICBzbyBieSBqdXN0IHBhc3NpbmcgaW4gYSBmdW5jdGlvbiBmb3IgYGRlZmluaXRpb25gIHRoZSBiaW5kZXIgd2lsbCBiZSBjcmVhdGVkIHdpdGggdGhhdCBhcyBpdHMgYHVwZGF0ZWRgIG1ldGhvZC5cbiAgICpcbiAgICogIyMjIEV4cGxhaW5hdGlvbiBvZiBwcm9wZXJ0aWVzIGFuZCBtZXRob2RzXG4gICAqXG4gICAqICAgKiBgcHJpb3JpdHlgIG1heSBiZSBkZWZpbmVkIGFzIG51bWJlciB0byBpbnN0cnVjdCBzb21lIGJpbmRlcnMgdG8gYmUgcHJvY2Vzc2VkIGJlZm9yZSBvdGhlcnMuIEJpbmRlcnMgd2l0aFxuICAgKiAgIGhpZ2hlciBwcmlvcml0eSBhcmUgcHJvY2Vzc2VkIGZpcnN0LlxuICAgKlxuICAgKiAgICogYGFuaW1hdGVkYCBjYW4gYmUgc2V0IHRvIGB0cnVlYCB0byBleHRlbmQgdGhlIEFuaW1hdGVkQmluZGluZyBjbGFzcyB3aGljaCBwcm92aWRlcyBzdXBwb3J0IGZvciBhbmltYXRpb24gd2hlblxuICAgKiAgIGluc2VydGluZ2FuZCByZW1vdmluZyBub2RlcyBmcm9tIHRoZSBET00uIFRoZSBgYW5pbWF0ZWRgIHByb3BlcnR5IG9ubHkgKmFsbG93cyogYW5pbWF0aW9uIGJ1dCB0aGUgZWxlbWVudCBtdXN0XG4gICAqICAgaGF2ZSB0aGUgYGFuaW1hdGVgIGF0dHJpYnV0ZSB0byB1c2UgYW5pbWF0aW9uLiBBIGJpbmRpbmcgd2lsbCBoYXZlIHRoZSBgYW5pbWF0ZWAgcHJvcGVydHkgc2V0IHRvIHRydWUgd2hlbiBpdCBpc1xuICAgKiAgIHRvIGJlIGFuaW1hdGVkLiBCaW5kZXJzIHNob3VsZCBoYXZlIGZhc3QgcGF0aHMgZm9yIHdoZW4gYW5pbWF0aW9uIGlzIG5vdCB1c2VkIHJhdGhlciB0aGFuIGFzc3VtaW5nIGFuaW1hdGlvbiB3aWxsXG4gICAqICAgYmUgdXNlZC5cbiAgICpcbiAgICogQmluZGVyc1xuICAgKlxuICAgKiBBIGJpbmRlciBjYW4gaGF2ZSA1IG1ldGhvZHMgd2hpY2ggd2lsbCBiZSBjYWxsZWQgYXQgdmFyaW91cyBwb2ludHMgaW4gYSBiaW5kaW5nJ3MgbGlmZWN5Y2xlLiBNYW55IGJpbmRlcnMgd2lsbFxuICAgKiBvbmx5IHVzZSB0aGUgYHVwZGF0ZWQodmFsdWUpYCBtZXRob2QsIHNvIGNhbGxpbmcgcmVnaXN0ZXIgd2l0aCBhIGZ1bmN0aW9uIGluc3RlYWQgb2YgYW4gb2JqZWN0IGFzIGl0cyB0aGlyZFxuICAgKiBwYXJhbWV0ZXIgaXMgYSBzaG9ydGN1dCB0byBjcmVhdGluZyBhIGJpbmRlciB3aXRoIGp1c3QgYW4gYHVwZGF0ZWAgbWV0aG9kLlxuICAgKlxuICAgKiBMaXN0ZWQgaW4gb3JkZXIgb2Ygd2hlbiB0aGV5IG9jY3VyIGluIGEgYmluZGluZydzIGxpZmVjeWNsZTpcbiAgICpcbiAgICogICAqIGBjb21waWxlZChvcHRpb25zKWAgaXMgY2FsbGVkIHdoZW4gZmlyc3QgY3JlYXRpbmcgYSBiaW5kaW5nIGR1cmluZyB0aGUgdGVtcGxhdGUgY29tcGlsYXRpb24gcHJvY2VzcyBhbmQgcmVjZWl2ZXNcbiAgICogdGhlIGBvcHRpb25zYCBvYmplY3QgdGhhdCB3aWxsIGJlIHBhc3NlZCBpbnRvIGBuZXcgQmluZGluZyhvcHRpb25zKWAuIFRoaXMgY2FuIGJlIHVzZWQgZm9yIGNyZWF0aW5nIHRlbXBsYXRlcyxcbiAgICogbW9kaWZ5aW5nIHRoZSBET00gKG9ubHkgc3Vic2VxdWVudCBET00gdGhhdCBoYXNuJ3QgYWxyZWFkeSBiZWVuIHByb2Nlc3NlZCkgYW5kIG90aGVyIHRoaW5ncyB0aGF0IHNob3VsZCBiZVxuICAgKiBhcHBsaWVkIGF0IGNvbXBpbGUgdGltZSBhbmQgbm90IGR1cGxpY2F0ZWQgZm9yIGVhY2ggdmlldyBjcmVhdGVkLlxuICAgKlxuICAgKiAgICogYGNyZWF0ZWQoKWAgaXMgY2FsbGVkIG9uIHRoZSBiaW5kaW5nIHdoZW4gYSBuZXcgdmlldyBpcyBjcmVhdGVkLiBUaGlzIGNhbiBiZSB1c2VkIHRvIGFkZCBldmVudCBsaXN0ZW5lcnMgb24gdGhlXG4gICAqIGVsZW1lbnQgb3IgZG8gb3RoZXIgdGhpbmdzIHRoYXQgd2lsbCBwZXJzaXN0ZSB3aXRoIHRoZSB2aWV3IHRocm91Z2ggaXRzIG1hbnkgdXNlcy4gVmlld3MgbWF5IGdldCByZXVzZWQgc28gZG9uJ3RcbiAgICogZG8gYW55dGhpbmcgaGVyZSB0byB0aWUgaXQgdG8gYSBnaXZlbiBjb250ZXh0LlxuICAgKlxuICAgKiAgICogYGF0dGFjaGVkKClgIGlzIGNhbGxlZCBvbiB0aGUgYmluZGluZyB3aGVuIHRoZSB2aWV3IGlzIGJvdW5kIHRvIGEgZ2l2ZW4gY29udGV4dCBhbmQgaW5zZXJ0ZWQgaW50byB0aGUgRE9NLiBUaGlzXG4gICAqIGNhbiBiZSB1c2VkIHRvIGhhbmRsZSBjb250ZXh0LXNwZWNpZmljIGFjdGlvbnMsIGFkZCBsaXN0ZW5lcnMgdG8gdGhlIHdpbmRvdyBvciBkb2N1bWVudCAodG8gYmUgcmVtb3ZlZCBpblxuICAgKiBgZGV0YWNoZWRgISksIGV0Yy5cbiAgICpcbiAgICogICAqIGB1cGRhdGVkKHZhbHVlLCBvbGRWYWx1ZSwgY2hhbmdlUmVjb3JkcylgIGlzIGNhbGxlZCBvbiB0aGUgYmluZGluZyB3aGVuZXZlciB0aGUgdmFsdWUgb2YgdGhlIGV4cHJlc3Npb24gd2l0aGluXG4gICAqIHRoZSBhdHRyaWJ1dGUgY2hhbmdlcy4gRm9yIGV4YW1wbGUsIGBiaW5kLXRleHQ9XCJ7e3VzZXJuYW1lfX1cImAgd2lsbCB0cmlnZ2VyIGB1cGRhdGVkYCB3aXRoIHRoZSB2YWx1ZSBvZiB1c2VybmFtZVxuICAgKiB3aGVuZXZlciBpdCBjaGFuZ2VzIG9uIHRoZSBnaXZlbiBjb250ZXh0LiBXaGVuIHRoZSB2aWV3IGlzIHJlbW92ZWQgYHVwZGF0ZWRgIHdpbGwgYmUgdHJpZ2dlcmVkIHdpdGggYSB2YWx1ZSBvZlxuICAgKiBgdW5kZWZpbmVkYCBpZiB0aGUgdmFsdWUgd2FzIG5vdCBhbHJlYWR5IGB1bmRlZmluZWRgLCBnaXZpbmcgYSBjaGFuY2UgdG8gXCJyZXNldFwiIHRvIGFuIGVtcHR5IHN0YXRlLlxuICAgKlxuICAgKiAgICogYGRldGFjaGVkKClgIGlzIGNhbGxlZCBvbiB0aGUgYmluZGluZyB3aGVuIHRoZSB2aWV3IGlzIHVuYm91bmQgdG8gYSBnaXZlbiBjb250ZXh0IGFuZCByZW1vdmVkIGZyb20gdGhlIERPTS4gVGhpc1xuICAgKiBjYW4gYmUgdXNlZCB0byBjbGVhbiB1cCBhbnl0aGluZyBkb25lIGluIGBhdHRhY2hlZCgpYCBvciBpbiBgdXBkYXRlZCgpYCBiZWZvcmUgYmVpbmcgcmVtb3ZlZC5cbiAgICpcbiAgICogRWxlbWVudCBhbmQgYXR0cmlidXRlIGJpbmRlcnMgd2lsbCBhcHBseSB3aGVuZXZlciB0aGUgdGFnIG5hbWUgb3IgYXR0cmlidXRlIG5hbWUgaXMgbWF0Y2hlZC4gSW4gdGhlIGNhc2Ugb2ZcbiAgICogYXR0cmlidXRlIGJpbmRlcnMgaWYgeW91IG9ubHkgd2FudCBpdCB0byBtYXRjaCB3aGVuIGV4cHJlc3Npb25zIGFyZSB1c2VkIHdpdGhpbiB0aGUgYXR0cmlidXRlLCBhZGQgYG9ubHlXaGVuQm91bmRgXG4gICAqIHRvIHRoZSBkZWZpbml0aW9uLiBPdGhlcndpc2UgdGhlIGJpbmRlciB3aWxsIG1hdGNoIGFuZCB0aGUgdmFsdWUgb2YgdGhlIGV4cHJlc3Npb24gd2lsbCBzaW1wbHkgYmUgYSBzdHJpbmcgdGhhdFxuICAgKiBvbmx5IGNhbGxzIHVwZGF0ZWQgb25jZSBzaW5jZSBpdCB3aWxsIG5vdCBjaGFuZ2UuXG4gICAqXG4gICAqIE5vdGUsIGF0dHJpYnV0ZXMgd2hpY2ggbWF0Y2ggYSBiaW5kZXIgYXJlIHJlbW92ZWQgZHVyaW5nIGNvbXBpbGUuIFRoZXkgYXJlIGNvbnNpZGVyZWQgdG8gYmUgYmluZGluZyBkZWZpbml0aW9ucyBhbmRcbiAgICogbm90IHBhcnQgb2YgdGhlIGVsZW1lbnQuIEJpbmRpbmdzIG1heSBzZXQgdGhlIGF0dHJpYnV0ZSB3aGljaCBzZXJ2ZWQgYXMgdGhlaXIgZGVmaW5pdGlvbiBpZiBkZXNpcmVkLlxuICAgKlxuICAgKiAjIyMgRGVmYXVsdHNcbiAgICpcbiAgICogVGhlcmUgYXJlIGRlZmF1bHQgYmluZGVycyBmb3IgYXR0cmlidXRlIGFuZCB0ZXh0IG5vZGVzIHdoaWNoIGFwcGx5IHdoZW4gbm8gb3RoZXIgYmluZGVycyBtYXRjaC4gVGhleSBvbmx5IGFwcGx5IHRvXG4gICAqIGF0dHJpYnV0ZXMgYW5kIHRleHQgbm9kZXMgd2l0aCBleHByZXNzaW9ucyBpbiB0aGVtIChlLmcuIGB7e2Zvb319YCkuIFRoZSBkZWZhdWx0IGlzIHRvIHNldCB0aGUgYXR0cmlidXRlIG9yIHRleHRcbiAgICogbm9kZSdzIHZhbHVlIHRvIHRoZSByZXN1bHQgb2YgdGhlIGV4cHJlc3Npb24uIElmIHlvdSB3YW50ZWQgdG8gb3ZlcnJpZGUgdGhpcyBkZWZhdWx0IHlvdSBtYXkgcmVnaXN0ZXIgYSBiaW5kZXIgd2l0aFxuICAgKiB0aGUgbmFtZSBgXCJfX2RlZmF1bHRfX1wiYC5cbiAgICpcbiAgICogKipFeGFtcGxlOioqIFRoaXMgYmluZGluZyBoYW5kbGVyIGFkZHMgcGlyYXRlaXplZCB0ZXh0IHRvIGFuIGVsZW1lbnQuXG4gICAqIGBgYGphdmFzY3JpcHRcbiAgICogcmVnaXN0cnkucmVnaXN0ZXJBdHRyaWJ1dGUoJ215LXBpcmF0ZScsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAqICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICogICAgIHZhbHVlID0gJyc7XG4gICAqICAgfSBlbHNlIHtcbiAgICogICAgIHZhbHVlID0gdmFsdWVcbiAgICogICAgICAgLnJlcGxhY2UoL1xcQmluZ1xcYi9nLCBcImluJ1wiKVxuICAgKiAgICAgICAucmVwbGFjZSgvXFxidG9cXGIvZywgXCJ0J1wiKVxuICAgKiAgICAgICAucmVwbGFjZSgvXFxieW91XFxiLywgJ3llJylcbiAgICogICAgICAgKyAnIEFycnJyISc7XG4gICAqICAgfVxuICAgKiAgIHRoaXMuZWxlbWVudC50ZXh0Q29udGVudCA9IHZhbHVlO1xuICAgKiB9KTtcbiAgICogYGBgXG4gICAqXG4gICAqIGBgYGh0bWxcbiAgICogPHAgbXktcGlyYXRlPVwie3twb3N0LmJvZHl9fVwiPlRoaXMgdGV4dCB3aWxsIGJlIHJlcGxhY2VkLjwvcD5cbiAgICogYGBgXG4gICAqL1xuICByZWdpc3RlckVsZW1lbnQ6IGZ1bmN0aW9uKG5hbWUsIGRlZmluaXRpb24pIHtcbiAgICByZXR1cm4gdGhpcy5yZWdpc3RlckJpbmRlcignZWxlbWVudCcsIG5hbWUsIGRlZmluaXRpb24pO1xuICB9LFxuICByZWdpc3RlckF0dHJpYnV0ZTogZnVuY3Rpb24obmFtZSwgZGVmaW5pdGlvbikge1xuICAgIHJldHVybiB0aGlzLnJlZ2lzdGVyQmluZGVyKCdhdHRyaWJ1dGUnLCBuYW1lLCBkZWZpbml0aW9uKTtcbiAgfSxcbiAgcmVnaXN0ZXJUZXh0OiBmdW5jdGlvbihuYW1lLCBkZWZpbml0aW9uKSB7XG4gICAgcmV0dXJuIHRoaXMucmVnaXN0ZXJCaW5kZXIoJ3RleHQnLCBuYW1lLCBkZWZpbml0aW9uKTtcbiAgfSxcbiAgcmVnaXN0ZXJCaW5kZXI6IGZ1bmN0aW9uKHR5cGUsIG5hbWUsIGRlZmluaXRpb24pIHtcbiAgICBpZiAoIWRlZmluaXRpb24pIHRocm93IG5ldyBUeXBlRXJyb3IoJ011c3QgcHJvdmlkZSBhIGRlZmluaXRpb24gd2hlbiByZWdpc3RlcmluZyBhIGJpbmRlcicpO1xuICAgIHZhciBiaW5kZXJzID0gdGhpcy5iaW5kZXJzW3R5cGVdO1xuICAgIHZhciBzdXBlckNsYXNzID0gZGVmaW5pdGlvbi5hbmltYXRlZCA/IEFuaW1hdGVkQmluZGluZyA6IEJpbmRpbmc7XG5cbiAgICBpZiAoIWJpbmRlcnMpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2B0eXBlYCBtdXN0IGJlIG9uZSBvZiAnICsgT2JqZWN0LmtleXModGhpcy5iaW5kZXJzKS5qb2luKCcsICcpKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGRlZmluaXRpb24gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGlmIChkZWZpbml0aW9uLnByb3RvdHlwZSBpbnN0YW5jZW9mIEJpbmRpbmcpIHtcbiAgICAgICAgc3VwZXJDbGFzcyA9IGRlZmluaXRpb247XG4gICAgICAgIGRlZmluaXRpb24gPSB7fTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRlZmluaXRpb24gPSB7IHVwZGF0ZWQ6IGRlZmluaXRpb24gfTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobmFtZSA9PT0gJ19fZGVmYXVsdF9fJyAmJiAhZGVmaW5pdGlvbi5oYXNPd25Qcm9wZXJ0eSgncHJpb3JpdHknKSkge1xuICAgICAgZGVmaW5pdGlvbi5wcmlvcml0eSA9IC0xMDA7XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIGEgc3ViY2xhc3Mgb2YgQmluZGluZyAob3IgYW5vdGhlciBiaW5kZXIpIHdpdGggdGhlIGRlZmluaXRpb25cbiAgICBmdW5jdGlvbiBCaW5kZXIoKSB7XG4gICAgICBzdXBlckNsYXNzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIGRlZmluaXRpb24ub2JzZXJ2YXRpb25zID0gdGhpcy5vYnNlcnZhdGlvbnM7XG4gICAgc3VwZXJDbGFzcy5leHRlbmQoQmluZGVyLCBkZWZpbml0aW9uKTtcblxuICAgIHZhciBleHByO1xuICAgIGlmIChuYW1lIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICBleHByID0gbmFtZTtcbiAgICB9IGVsc2UgaWYgKGhhc1dpbGRjYXJkRXhwci50ZXN0KG5hbWUpKSB7XG4gICAgICBleHByID0gbmV3IFJlZ0V4cCgnXicgKyBlc2NhcGVSZWdFeHAobmFtZSkucmVwbGFjZShlc2NhcGVkV2lsZGNhcmRFeHByLCAnJDEoLiopJykgKyAnJCcpO1xuICAgIH1cblxuICAgIGlmIChleHByKSB7XG4gICAgICBCaW5kZXIuZXhwciA9IGV4cHI7XG4gICAgICBiaW5kZXJzLl93aWxkY2FyZHMucHVzaChCaW5kZXIpO1xuICAgICAgYmluZGVycy5fd2lsZGNhcmRzLnNvcnQodGhpcy5iaW5kaW5nU29ydCk7XG4gICAgfVxuXG4gICAgQmluZGVyLm5hbWUgPSAnJyArIG5hbWU7XG4gICAgYmluZGVyc1tuYW1lXSA9IEJpbmRlcjtcbiAgICByZXR1cm4gQmluZGVyO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgYSBiaW5kZXIgdGhhdCB3YXMgYWRkZWQgd2l0aCBgcmVnaXN0ZXIoKWAuIElmIGFuIFJlZ0V4cCB3YXMgdXNlZCBpbiByZWdpc3RlciBmb3IgdGhlIG5hbWUgaXQgbXVzdCBiZSB1c2VkXG4gICAqIHRvIHVucmVnaXN0ZXIsIGJ1dCBpdCBkb2VzIG5vdCBuZWVkIHRvIGJlIHRoZSBzYW1lIGluc3RhbmNlLlxuICAgKi9cbiAgdW5yZWdpc3RlckVsZW1lbnQ6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy51bnJlZ2lzdGVyQmluZGVyKCdlbGVtZW50JywgbmFtZSk7XG4gIH0sXG4gIHVucmVnaXN0ZXJBdHRyaWJ1dGU6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy51bnJlZ2lzdGVyQmluZGVyKCdhdHRyaWJ1dGUnLCBuYW1lKTtcbiAgfSxcbiAgdW5yZWdpc3RlclRleHQ6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy51bnJlZ2lzdGVyQmluZGVyKCd0ZXh0JywgbmFtZSk7XG4gIH0sXG4gIHVucmVnaXN0ZXJCaW5kZXI6IGZ1bmN0aW9uKHR5cGUsIG5hbWUpIHtcbiAgICB2YXIgYmluZGVyID0gdGhpcy5nZXRCaW5kZXIodHlwZSwgbmFtZSksIGJpbmRlcnMgPSB0aGlzLmJpbmRlcnNbdHlwZV07XG4gICAgaWYgKCFiaW5kZXIpIHJldHVybjtcbiAgICBpZiAoYmluZGVyLmV4cHIpIHtcbiAgICAgIHZhciBpbmRleCA9IGJpbmRlcnMuX3dpbGRjYXJkcy5pbmRleE9mKGJpbmRlcik7XG4gICAgICBpZiAoaW5kZXggPj0gMCkgYmluZGVycy5fd2lsZGNhcmRzLnNwbGljZShpbmRleCwgMSk7XG4gICAgfVxuICAgIGRlbGV0ZSBiaW5kZXJzW25hbWVdO1xuICAgIHJldHVybiBiaW5kZXI7XG4gIH0sXG5cblxuICAvKipcbiAgICogUmV0dXJucyBhIGJpbmRlciB0aGF0IHdhcyBhZGRlZCB3aXRoIGByZWdpc3RlcigpYCBieSB0eXBlIGFuZCBuYW1lLlxuICAgKi9cbiAgZ2V0RWxlbWVudEJpbmRlcjogZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLmdldEJpbmRlcignZWxlbWVudCcsIG5hbWUpO1xuICB9LFxuICBnZXRBdHRyaWJ1dGVCaW5kZXI6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRCaW5kZXIoJ2F0dHJpYnV0ZScsIG5hbWUpO1xuICB9LFxuICBnZXRUZXh0QmluZGVyOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QmluZGVyKCd0ZXh0JywgbmFtZSk7XG4gIH0sXG4gIGdldEJpbmRlcjogZnVuY3Rpb24odHlwZSwgbmFtZSkge1xuICAgIHZhciBiaW5kZXJzID0gdGhpcy5iaW5kZXJzW3R5cGVdO1xuXG4gICAgaWYgKCFiaW5kZXJzKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdgdHlwZWAgbXVzdCBiZSBvbmUgb2YgJyArIE9iamVjdC5rZXlzKHRoaXMuYmluZGVycykuam9pbignLCAnKSk7XG4gICAgfVxuXG4gICAgaWYgKG5hbWUgJiYgYmluZGVycy5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgcmV0dXJuIGJpbmRlcnNbbmFtZV07XG4gICAgfVxuICB9LFxuXG5cbiAgLyoqXG4gICAqIEZpbmQgYSBtYXRjaGluZyBiaW5kZXIgZm9yIHRoZSBnaXZlbiB0eXBlLiBFbGVtZW50cyBzaG91bGQgb25seSBwcm92aWRlIG5hbWUuIEF0dHJpYnV0ZXMgc2hvdWxkIHByb3ZpZGUgdGhlIG5hbWVcbiAgICogYW5kIHZhbHVlICh2YWx1ZSBzbyB0aGUgZGVmYXVsdCBjYW4gYmUgcmV0dXJuZWQgaWYgYW4gZXhwcmVzc2lvbiBleGlzdHMgaW4gdGhlIHZhbHVlKS4gVGV4dCBub2RlcyBzaG91bGQgb25seVxuICAgKiBwcm92aWRlIHRoZSB2YWx1ZSAoaW4gcGxhY2Ugb2YgdGhlIG5hbWUpIGFuZCB3aWxsIHJldHVybiB0aGUgZGVmYXVsdCBpZiBubyBiaW5kZXJzIG1hdGNoLlxuICAgKi9cbiAgZmluZEJpbmRlcjogZnVuY3Rpb24odHlwZSwgbmFtZSwgdmFsdWUpIHtcbiAgICBpZiAodHlwZSA9PT0gJ3RleHQnICYmIHZhbHVlID09IG51bGwpIHtcbiAgICAgIHZhbHVlID0gbmFtZTtcbiAgICAgIG5hbWUgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgaWYgKG5hbWUgPT09IHRoaXMuYW5pbWF0ZUF0dHJpYnV0ZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBiaW5kZXIgPSB0aGlzLmdldEJpbmRlcih0eXBlLCBuYW1lKSwgYmluZGVycyA9IHRoaXMuYmluZGVyc1t0eXBlXTtcblxuICAgIGlmICghYmluZGVyKSB7XG4gICAgICB2YXIgdG9NYXRjaCA9ICh0eXBlID09PSAndGV4dCcpID8gdmFsdWUgOiBuYW1lO1xuICAgICAgYmluZGVycy5fd2lsZGNhcmRzLnNvbWUoZnVuY3Rpb24od2lsZGNhcmRCaW5kZXIpIHtcbiAgICAgICAgaWYgKHRvTWF0Y2gubWF0Y2god2lsZGNhcmRCaW5kZXIuZXhwcikpIHtcbiAgICAgICAgICBiaW5kZXIgPSB3aWxkY2FyZEJpbmRlcjtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gZG9uJ3QgdXNlIGUuZy4gdGhlIGB2YWx1ZWAgYmluZGVyIGlmIHRoZXJlIGlzIG5vIGV4cHJlc3Npb24gaW4gdGhlIGF0dHJpYnV0ZSB2YWx1ZSAoZS5nLiBgdmFsdWU9XCJzb21lIHRleHRcImApXG4gICAgaWYgKGJpbmRlciAmJlxuICAgICAgICB0eXBlID09PSAnYXR0cmlidXRlJyAmJlxuICAgICAgICBiaW5kZXIucHJvdG90eXBlLm9ubHlXaGVuQm91bmQgJiZcbiAgICAgICAgIXRoaXMuYmluZGVyc1t0eXBlXS5fZGVsaW1pdGVyc09ubHlJbkRlZmF1bHQgJiZcbiAgICAgICAgIXRoaXMuaXNCb3VuZCh0eXBlLCB2YWx1ZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBUZXN0IGlmIHRoZSBhdHRyaWJ1dGUgdmFsdWUgaXMgYm91bmQgKGUuZy4gYGhyZWY9XCIvcG9zdHMve3sgcG9zdC5pZCB9fVwiYClcbiAgICBpZiAoIWJpbmRlciAmJiB2YWx1ZSAmJiAodHlwZSA9PT0gJ3RleHQnIHx8IHRoaXMuaXNCb3VuZCh0eXBlLCB2YWx1ZSkpKSB7XG4gICAgICBiaW5kZXIgPSB0aGlzLmdldEJpbmRlcih0eXBlLCAnX19kZWZhdWx0X18nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYmluZGVyO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIEEgRm9ybWF0dGVyIGlzIHN0b3JlZCB0byBwcm9jZXNzIHRoZSB2YWx1ZSBvZiBhbiBleHByZXNzaW9uLiBUaGlzIGFsdGVycyB0aGUgdmFsdWUgb2Ygd2hhdCBjb21lcyBpbiB3aXRoIGEgZnVuY3Rpb25cbiAgICogdGhhdCByZXR1cm5zIGEgbmV3IHZhbHVlLiBGb3JtYXR0ZXJzIGFyZSBhZGRlZCBieSB1c2luZyBhIHNpbmdsZSBwaXBlIGNoYXJhY3RlciAoYHxgKSBmb2xsb3dlZCBieSB0aGUgbmFtZSBvZiB0aGVcbiAgICogZm9ybWF0dGVyLiBNdWx0aXBsZSBmb3JtYXR0ZXJzIGNhbiBiZSB1c2VkIGJ5IGNoYWluaW5nIHBpcGVzIHdpdGggZm9ybWF0dGVyIG5hbWVzLiBGb3JtYXR0ZXJzIG1heSBhbHNvIGhhdmVcbiAgICogYXJndW1lbnRzIHBhc3NlZCB0byB0aGVtIGJ5IHVzaW5nIHRoZSBjb2xvbiB0byBzZXBhcmF0ZSBhcmd1bWVudHMgZnJvbSB0aGUgZm9ybWF0dGVyIG5hbWUuIFRoZSBzaWduYXR1cmUgb2YgYVxuICAgKiBmb3JtYXR0ZXIgc2hvdWxkIGJlIGBmdW5jdGlvbih2YWx1ZSwgYXJncy4uLilgIHdoZXJlIGFyZ3MgYXJlIGV4dHJhIHBhcmFtZXRlcnMgcGFzc2VkIGludG8gdGhlIGZvcm1hdHRlciBhZnRlclxuICAgKiBjb2xvbnMuXG4gICAqXG4gICAqICpFeGFtcGxlOipcbiAgICogYGBganNcbiAgICogcmVnaXN0cnkucmVnaXN0ZXJGb3JtYXR0ZXIoJ3VwcGVyY2FzZScsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAqICAgaWYgKHR5cGVvZiB2YWx1ZSAhPSAnc3RyaW5nJykgcmV0dXJuICcnXG4gICAqICAgcmV0dXJuIHZhbHVlLnRvVXBwZXJjYXNlKClcbiAgICogfSlcbiAgICpcbiAgICogcmVnaXN0cnkucmVnaXN0ZXJGb3JtYXR0ZXIoJ3JlcGxhY2UnLCBmdW5jdGlvbih2YWx1ZSwgcmVwbGFjZSwgd2l0aCkge1xuICAgKiAgIGlmICh0eXBlb2YgdmFsdWUgIT0gJ3N0cmluZycpIHJldHVybiAnJ1xuICAgKiAgIHJldHVybiB2YWx1ZS5yZXBsYWNlKHJlcGxhY2UsIHdpdGgpXG4gICAqIH0pXG4gICAqIGBgYGh0bWxcbiAgICogPGgxIGJpbmQtdGV4dD1cInRpdGxlIHwgdXBwZXJjYXNlIHwgcmVwbGFjZTonTEVUVEVSJzonTlVNQkVSJ1wiPjwvaDE+XG4gICAqIGBgYFxuICAgKiAqUmVzdWx0OipcbiAgICogYGBgaHRtbFxuICAgKiA8aDE+R0VUVElORyBUTyBLTk9XIEFMTCBBQk9VVCBUSEUgTlVNQkVSIEE8L2gxPlxuICAgKiBgYGBcbiAgICogVE9ETzogb2xkIGRvY3MsIHJld3JpdGUsIHRoZXJlIGlzIGFuIGV4dHJhIGFyZ3VtZW50IG5hbWVkIGBzZXR0ZXJgIHdoaWNoIHdpbGwgYmUgdHJ1ZSB3aGVuIHRoZSBleHByZXNzaW9uIGlzIGJlaW5nIFwic2V0XCIgaW5zdGVhZCBvZiBcImdldFwiXG4gICAqIEEgYHZhbHVlRm9ybWF0dGVyYCBpcyBsaWtlIGEgZm9ybWF0dGVyIGJ1dCB1c2VkIHNwZWNpZmljYWxseSB3aXRoIHRoZSBgdmFsdWVgIGJpbmRpbmcgc2luY2UgaXQgaXMgYSB0d28td2F5IGJpbmRpbmcuIFdoZW5cbiAgICogdGhlIHZhbHVlIG9mIHRoZSBlbGVtZW50IGlzIGNoYW5nZWQgYSBgdmFsdWVGb3JtYXR0ZXJgIGNhbiBhZGp1c3QgdGhlIHZhbHVlIGZyb20gYSBzdHJpbmcgdG8gdGhlIGNvcnJlY3QgdmFsdWUgdHlwZSBmb3JcbiAgICogdGhlIGNvbnRyb2xsZXIgZXhwcmVzc2lvbi4gVGhlIHNpZ25hdHVyZSBmb3IgYSBgdmFsdWVGb3JtYXR0ZXJgIGluY2x1ZGVzIHRoZSBjdXJyZW50IHZhbHVlIG9mIHRoZSBleHByZXNzaW9uXG4gICAqIGJlZm9yZSB0aGUgb3B0aW9uYWwgYXJndW1lbnRzIChpZiBhbnkpLiBUaGlzIGFsbG93cyBkYXRlcyB0byBiZSBhZGp1c3RlZCBhbmQgcG9zc2libGV5IG90aGVyIHVzZXMuXG4gICAqXG4gICAqICpFeGFtcGxlOipcbiAgICogYGBganNcbiAgICogcmVnaXN0cnkucmVnaXN0ZXJGb3JtYXR0ZXIoJ251bWVyaWMnLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgKiAgIC8vIHZhbHVlIGNvbWluZyBmcm9tIHRoZSBjb250cm9sbGVyIGV4cHJlc3Npb24sIHRvIGJlIHNldCBvbiB0aGUgZWxlbWVudFxuICAgKiAgIGlmICh2YWx1ZSA9PSBudWxsIHx8IGlzTmFOKHZhbHVlKSkgcmV0dXJuICcnXG4gICAqICAgcmV0dXJuIHZhbHVlXG4gICAqIH0pXG4gICAqXG4gICAqIHJlZ2lzdHJ5LnJlZ2lzdGVyRm9ybWF0dGVyKCdkYXRlLWhvdXInLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgKiAgIC8vIHZhbHVlIGNvbWluZyBmcm9tIHRoZSBjb250cm9sbGVyIGV4cHJlc3Npb24sIHRvIGJlIHNldCBvbiB0aGUgZWxlbWVudFxuICAgKiAgIGlmICggIShjdXJyZW50VmFsdWUgaW5zdGFuY2VvZiBEYXRlKSApIHJldHVybiAnJ1xuICAgKiAgIHZhciBob3VycyA9IHZhbHVlLmdldEhvdXJzKClcbiAgICogICBpZiAoaG91cnMgPj0gMTIpIGhvdXJzIC09IDEyXG4gICAqICAgaWYgKGhvdXJzID09IDApIGhvdXJzID0gMTJcbiAgICogICByZXR1cm4gaG91cnNcbiAgICogfSlcbiAgICogYGBgaHRtbFxuICAgKiA8bGFiZWw+TnVtYmVyIEF0dGVuZGluZzo8L2xhYmVsPlxuICAgKiA8aW5wdXQgc2l6ZT1cIjRcIiBiaW5kLXZhbHVlPVwiZXZlbnQuYXR0ZW5kZWVDb3VudCB8IG51bWVyaWNcIj5cbiAgICogPGxhYmVsPlRpbWU6PC9sYWJlbD5cbiAgICogPGlucHV0IHNpemU9XCIyXCIgYmluZC12YWx1ZT1cImV2ZW50LmRhdGUgfCBkYXRlLWhvdXJcIj4gOlxuICAgKiA8aW5wdXQgc2l6ZT1cIjJcIiBiaW5kLXZhbHVlPVwiZXZlbnQuZGF0ZSB8IGRhdGUtbWludXRlXCI+XG4gICAqIDxzZWxlY3QgYmluZC12YWx1ZT1cImV2ZW50LmRhdGUgfCBkYXRlLWFtcG1cIj5cbiAgICogICA8b3B0aW9uPkFNPC9vcHRpb24+XG4gICAqICAgPG9wdGlvbj5QTTwvb3B0aW9uPlxuICAgKiA8L3NlbGVjdD5cbiAgICogYGBgXG4gICAqL1xuICByZWdpc3RlckZvcm1hdHRlcjogZnVuY3Rpb24gKG5hbWUsIGZvcm1hdHRlcikge1xuICAgIHRoaXMuZm9ybWF0dGVyc1tuYW1lXSA9IGZvcm1hdHRlcjtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBVbnJlZ2lzdGVycyBhIGZvcm1hdHRlci5cbiAgICovXG4gIHVucmVnaXN0ZXJGb3JtYXR0ZXI6IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgZGVsZXRlIHRoaXMuZm9ybWF0dGVyc1tuYW1lXTtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBHZXRzIGEgcmVnaXN0ZXJlZCBmb3JtYXR0ZXIuXG4gICAqL1xuICBnZXRGb3JtYXR0ZXI6IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuZm9ybWF0dGVyc1tuYW1lXTtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBBbiBBbmltYXRpb24gaXMgc3RvcmVkIHRvIGhhbmRsZSBhbmltYXRpb25zLiBBIHJlZ2lzdGVyZWQgYW5pbWF0aW9uIGlzIGFuIG9iamVjdCAob3IgY2xhc3Mgd2hpY2ggaW5zdGFudGlhdGVzIGludG9cbiAgICogYW4gb2JqZWN0KSB3aXRoIHRoZSBtZXRob2RzOlxuICAgKiAgICogYHdpbGxBbmltYXRlSW4oZWxlbWVudClgXG4gICAqICAgKiBgYW5pbWF0ZUluKGVsZW1lbnQsIGNhbGxiYWNrKWBcbiAgICogICAqIGBkaWRBbmltYXRlSW4oZWxlbWVudClgXG4gICAqICAgKiBgd2lsbEFuaW1hdGVPdXQoZWxlbWVudClgXG4gICAqICAgKiBgYW5pbWF0ZU91dChlbGVtZW50LCBjYWxsYmFjaylgXG4gICAqICAgKiBgZGlkQW5pbWF0ZU91dChlbGVtZW50KWBcbiAgICpcbiAgICogQW5pbWF0aW9uIGlzIGluY2x1ZGVkIHdpdGggYmluZGVycyB3aGljaCBhcmUgcmVnaXN0ZXJlZCB3aXRoIHRoZSBgYW5pbWF0ZWRgIHByb3BlcnR5IHNldCB0byBgdHJ1ZWAgKHN1Y2ggYXMgYGlmYFxuICAgKiBhbmQgYHJlcGVhdGApLiBBbmltYXRpb25zIGFsbG93IGVsZW1lbnRzIHRvIGZhZGUgaW4sIGZhZGUgb3V0LCBzbGlkZSBkb3duLCBjb2xsYXBzZSwgbW92ZSBmcm9tIG9uZSBsb2NhdGlvbiBpbiBhXG4gICAqIGxpc3QgdG8gYW5vdGhlciwgYW5kIG1vcmUuXG4gICAqXG4gICAqIFRvIHVzZSBhbmltYXRpb24gYWRkIGFuIGF0dHJpYnV0ZSBuYW1lZCBgYW5pbWF0ZWAgb250byBhbiBlbGVtZW50IHdpdGggYSBzdXBwb3J0ZWQgYmluZGVyLlxuICAgKlxuICAgKiAjIyMgQ1NTIEFuaW1hdGlvbnNcbiAgICpcbiAgICogSWYgdGhlIGBhbmltYXRlYCBhdHRyaWJ1dGUgZG9lcyBub3QgaGF2ZSBhIHZhbHVlIG9yIHRoZSB2YWx1ZSBpcyBhIGNsYXNzIG5hbWUgKGUuZy4gYGFuaW1hdGU9XCIubXktZmFkZVwiYCkgdGhlblxuICAgKiBmcmFnbWVudHMgd2lsbCB1c2UgYSBDU1MgdHJhbnNpdGlvbi9hbmltYXRpb24uIENsYXNzZXMgd2lsbCBiZSBhZGRlZCBhbmQgcmVtb3ZlZCB0byB0cmlnZ2VyIHRoZSBhbmltYXRpb24uXG4gICAqXG4gICAqICAgKiBgLndpbGwtYW5pbWF0ZS1pbmAgaXMgYWRkZWQgcmlnaHQgYWZ0ZXIgYW4gZWxlbWVudCBpcyBpbnNlcnRlZCBpbnRvIHRoZSBET00uIFRoaXMgY2FuIGJlIHVzZWQgdG8gc2V0IHRoZVxuICAgKiAgICAgb3BhY2l0eSB0byBgMC4wYCBmb3IgZXhhbXBsZS4gSXQgaXMgdGhlbiByZW1vdmVkIG9uIHRoZSBuZXh0IGFuaW1hdGlvbiBmcmFtZS5cbiAgICogICAqIGAuYW5pbWF0ZS1pbmAgaXMgd2hlbiBgLndpbGwtYW5pbWF0ZS1pbmAgaXMgcmVtb3ZlZC4gSXQgY2FuIGJlIHVzZWQgdG8gc2V0IG9wYWNpdHkgdG8gYDEuMGAgZm9yIGV4YW1wbGUuIFRoZVxuICAgKiAgICAgYGFuaW1hdGlvbmAgc3R5bGUgY2FuIGJlIHNldCBvbiB0aGlzIGNsYXNzIGlmIHVzaW5nIGl0LiBUaGUgYHRyYW5zaXRpb25gIHN0eWxlIGNhbiBiZSBzZXQgaGVyZS4gTm90ZSB0aGF0XG4gICAqICAgICBhbHRob3VnaCB0aGUgYGFuaW1hdGVgIGF0dHJpYnV0ZSBpcyBwbGFjZWQgb24gYW4gZWxlbWVudCB3aXRoIHRoZSBgcmVwZWF0YCBiaW5kZXIsIHRoZXNlIGNsYXNzZXMgYXJlIGFkZGVkIHRvXG4gICAqICAgICBpdHMgY2hpbGRyZW4gYXMgdGhleSBnZXQgYWRkZWQgYW5kIHJlbW92ZWQuXG4gICAqICAgKiBgLndpbGwtYW5pbWF0ZS1vdXRgIGlzIGFkZGVkIGJlZm9yZSBhbiBlbGVtZW50IGlzIHJlbW92ZWQgZnJvbSB0aGUgRE9NLiBUaGlzIGNhbiBiZSB1c2VkIHRvIHNldCB0aGUgb3BhY2l0eSB0b1xuICAgKiAgICAgYDFgIGZvciBleGFtcGxlLiBJdCBpcyB0aGVuIHJlbW92ZWQgb24gdGhlIG5leHQgYW5pbWF0aW9uIGZyYW1lLlxuICAgKiAgICogYC5hbmltYXRlLW91dGAgaXMgYWRkZWQgd2hlbiBgLndpbGwtYW5pbWF0ZS1vdXRgIGlzIHJlbW92ZWQuIEl0IGNhbiBiZSB1c2VkIHRvIHNldCBvcGFjaXR5IHRvIGAwLjBgIGZvclxuICAgKiAgICAgZXhhbXBsZS4gVGhlIGBhbmltYXRpb25gIHN0eWxlIGNhbiBiZSBzZXQgb24gdGhpcyBjbGFzcyBpZiB1c2luZyBpdC4gVGhlIGB0cmFuc2l0aW9uYCBzdHlsZSBjYW4gYmUgc2V0IGhlcmUgb3JcbiAgICogICAgIG9uIGFub3RoZXIgc2VsZWN0b3IgdGhhdCBtYXRjaGVzIHRoZSBlbGVtZW50LiBOb3RlIHRoYXQgYWx0aG91Z2ggdGhlIGBhbmltYXRlYCBhdHRyaWJ1dGUgaXMgcGxhY2VkIG9uIGFuXG4gICAqICAgICBlbGVtZW50IHdpdGggdGhlIGByZXBlYXRgIGJpbmRlciwgdGhlc2UgY2xhc3NlcyBhcmUgYWRkZWQgdG8gaXRzIGNoaWxkcmVuIGFzIHRoZXkgZ2V0IGFkZGVkIGFuZCByZW1vdmVkLlxuICAgKlxuICAgKiBJZiB0aGUgYGFuaW1hdGVgIGF0dHJpYnV0ZSBpcyBzZXQgdG8gYSBjbGFzcyBuYW1lIChlLmcuIGBhbmltYXRlPVwiLm15LWZhZGVcImApIHRoZW4gdGhhdCBjbGFzcyBuYW1lIHdpbGwgYmUgYWRkZWQgYXNcbiAgICogYSBjbGFzcyB0byB0aGUgZWxlbWVudCBkdXJpbmcgYW5pbWF0aW9uLiBUaGlzIGFsbG93cyB5b3UgdG8gdXNlIGAubXktZmFkZS53aWxsLWFuaW1hdGUtaW5gLCBgLm15LWZhZGUuYW5pbWF0ZS1pbmAsXG4gICAqIGV0Yy4gaW4geW91ciBzdHlsZXNoZWV0cyB0byB1c2UgdGhlIHNhbWUgYW5pbWF0aW9uIHRocm91Z2hvdXQgeW91ciBhcHBsaWNhdGlvbi5cbiAgICpcbiAgICogIyMjIEphdmFTY3JpcHQgQW5pbWF0aW9uc1xuICAgKlxuICAgKiBJZiB5b3UgbmVlZCBncmVhdGVyIGNvbnRyb2wgb3ZlciB5b3VyIGFuaW1hdGlvbnMgSmF2YVNjcmlwdCBtYXkgYmUgdXNlZC4gSXQgaXMgcmVjb21tZW5kZWQgdGhhdCBDU1Mgc3R5bGVzIHN0aWxsIGJlXG4gICAqIHVzZWQgYnkgaGF2aW5nIHlvdXIgY29kZSBzZXQgdGhlbSBtYW51YWxseS4gVGhpcyBhbGxvd3MgdGhlIGFuaW1hdGlvbiB0byB0YWtlIGFkdmFudGFnZSBvZiB0aGUgYnJvd3NlclxuICAgKiBvcHRpbWl6YXRpb25zIHN1Y2ggYXMgaGFyZHdhcmUgYWNjZWxlcmF0aW9uLiBUaGlzIGlzIG5vdCBhIHJlcXVpcmVtZW50LlxuICAgKlxuICAgKiBJbiBvcmRlciB0byB1c2UgSmF2YVNjcmlwdCBhbiBvYmplY3Qgc2hvdWxkIGJlIHBhc3NlZCBpbnRvIHRoZSBgYW5pbWF0aW9uYCBhdHRyaWJ1dGUgdXNpbmcgYW4gZXhwcmVzc2lvbi4gVGhpc1xuICAgKiBvYmplY3Qgc2hvdWxkIGhhdmUgbWV0aG9kcyB0aGF0IGFsbG93IEphdmFTY3JpcHQgYW5pbWF0aW9uIGhhbmRsaW5nLiBGb3IgZXhhbXBsZSwgaWYgeW91IGFyZSBib3VuZCB0byBhIGNvbnRleHRcbiAgICogd2l0aCBhbiBvYmplY3QgbmFtZWQgYGN1c3RvbUZhZGVgIHdpdGggYW5pbWF0aW9uIG1ldGhvZHMsIHlvdXIgZWxlbWVudCBzaG91bGQgaGF2ZSBgYXR0cmlidXRlPVwie3tjdXN0b21GYWRlfX1cImAuXG4gICAqIFRoZSBmb2xsb3dpbmcgaXMgYSBsaXN0IG9mIHRoZSBtZXRob2RzIHlvdSBtYXkgaW1wbGVtZW50LlxuICAgKlxuICAgKiAgICogYHdpbGxBbmltYXRlSW4oZWxlbWVudClgIHdpbGwgYmUgY2FsbGVkIGFmdGVyIGFuIGVsZW1lbnQgaGFzIGJlZW4gaW5zZXJ0ZWQgaW50byB0aGUgRE9NLiBVc2UgaXQgdG8gc2V0IGluaXRpYWxcbiAgICogICAgIENTUyBwcm9wZXJ0aWVzIGJlZm9yZSBgYW5pbWF0ZUluYCBpcyBjYWxsZWQgdG8gc2V0IHRoZSBmaW5hbCBwcm9wZXJ0aWVzLiBUaGlzIG1ldGhvZCBpcyBvcHRpb25hbC5cbiAgICogICAqIGBhbmltYXRlSW4oZWxlbWVudCwgY2FsbGJhY2spYCB3aWxsIGJlIGNhbGxlZCBzaG9ydGx5IGFmdGVyIGB3aWxsQW5pbWF0ZUluYCBpZiBpdCB3YXMgZGVmaW5lZC4gVXNlIGl0IHRvIHNldFxuICAgKiAgICAgZmluYWwgQ1NTIHByb3BlcnRpZXMuXG4gICAqICAgKiBgYW5pbWF0ZU91dChlbGVtZW50LCBkb25lKWAgd2lsbCBiZSBjYWxsZWQgYmVmb3JlIGFuIGVsZW1lbnQgaXMgdG8gYmUgcmVtb3ZlZCBmcm9tIHRoZSBET00uIGBkb25lYCBtdXN0IGJlXG4gICAqICAgICBjYWxsZWQgd2hlbiB0aGUgYW5pbWF0aW9uIGlzIGNvbXBsZXRlIGluIG9yZGVyIGZvciB0aGUgYmluZGVyIHRvIGZpbmlzaCByZW1vdmluZyB0aGUgZWxlbWVudC4gKipSZW1lbWJlcioqIHRvXG4gICAqICAgICBjbGVhbiB1cCBieSByZW1vdmluZyBhbnkgc3R5bGVzIHRoYXQgd2VyZSBhZGRlZCBiZWZvcmUgY2FsbGluZyBgZG9uZSgpYCBzbyB0aGUgZWxlbWVudCBjYW4gYmUgcmV1c2VkIHdpdGhvdXRcbiAgICogICAgIHNpZGUtZWZmZWN0cy5cbiAgICpcbiAgICogVGhlIGBlbGVtZW50YCBwYXNzZWQgaW4gd2lsbCBiZSBwb2x5ZmlsbGVkIGZvciB3aXRoIHRoZSBgYW5pbWF0ZWAgbWV0aG9kIHVzaW5nXG4gICAqIGh0dHBzOi8vZ2l0aHViLmNvbS93ZWItYW5pbWF0aW9ucy93ZWItYW5pbWF0aW9ucy1qcy5cbiAgICpcbiAgICogIyMjIFJlZ2lzdGVyZWQgQW5pbWF0aW9uc1xuICAgKlxuICAgKiBBbmltYXRpb25zIG1heSBiZSByZWdpc3RlcmVkIGFuZCB1c2VkIHRocm91Z2hvdXQgeW91ciBhcHBsaWNhdGlvbi4gVG8gdXNlIGEgcmVnaXN0ZXJlZCBhbmltYXRpb24gdXNlIGl0cyBuYW1lIGluXG4gICAqIHRoZSBgYW5pbWF0ZWAgYXR0cmlidXRlIChlLmcuIGBhbmltYXRlPVwiZmFkZVwiYCkuIE5vdGUgdGhlIG9ubHkgZGlmZmVyZW5jZSBiZXR3ZWVuIGEgcmVnaXN0ZXJlZCBhbmltYXRpb24gYW5kIGFcbiAgICogY2xhc3MgcmVnaXN0cmF0aW9uIGlzIGNsYXNzIHJlZ2lzdHJhdGlvbnMgYXJlIHByZWZpeGVkIHdpdGggYSBkb3QgKGAuYCkuIFJlZ2lzdGVyZWQgYW5pbWF0aW9ucyBhcmUgYWx3YXlzXG4gICAqIEphdmFTY3JpcHQgYW5pbWF0aW9ucy4gVG8gcmVnaXN0ZXIgYW4gYW5pbWF0aW9uIHVzZSBgZnJhZ21lbnRzLnJlZ2lzdGVyQW5pbWF0aW9uKG5hbWUsIGFuaW1hdGlvbk9iamVjdClgLlxuICAgKlxuICAgKiBUaGUgQW5pbWF0aW9uIG1vZHVsZSBjb21lcyB3aXRoIHNldmVyYWwgY29tbW9uIGFuaW1hdGlvbnMgcmVnaXN0ZXJlZCBieSBkZWZhdWx0LiBUaGUgZGVmYXVsdHMgdXNlIENTUyBzdHlsZXMgdG9cbiAgICogd29yayBjb3JyZWN0bHksIHVzaW5nIGBlbGVtZW50LmFuaW1hdGVgLlxuICAgKlxuICAgKiAgICogYGZhZGVgIHdpbGwgZmFkZSBhbiBlbGVtZW50IGluIGFuZCBvdXQgb3ZlciAzMDAgbWlsbGlzZWNvbmRzLlxuICAgKiAgICogYHNsaWRlYCB3aWxsIHNsaWRlIGFuIGVsZW1lbnQgZG93biB3aGVuIGl0IGlzIGFkZGVkIGFuZCBzbGlkZSBpdCB1cCB3aGVuIGl0IGlzIHJlbW92ZWQuXG4gICAqICAgKiBgc2xpZGUtbW92ZWAgd2lsbCBtb3ZlIGFuIGVsZW1lbnQgZnJvbSBpdHMgb2xkIGxvY2F0aW9uIHRvIGl0cyBuZXcgbG9jYXRpb24gaW4gYSByZXBlYXRlZCBsaXN0LlxuICAgKlxuICAgKiBEbyB5b3UgaGF2ZSBhbm90aGVyIGNvbW1vbiBhbmltYXRpb24geW91IHRoaW5rIHNob3VsZCBiZSBpbmNsdWRlZCBieSBkZWZhdWx0PyBTdWJtaXQgYSBwdWxsIHJlcXVlc3QhXG4gICAqL1xuICByZWdpc3RlckFuaW1hdGlvbjogZnVuY3Rpb24obmFtZSwgYW5pbWF0aW9uT2JqZWN0KSB7XG4gICAgdGhpcy5hbmltYXRpb25zW25hbWVdID0gYW5pbWF0aW9uT2JqZWN0O1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIFVucmVnaXN0ZXJzIGFuIGFuaW1hdGlvbi5cbiAgICovXG4gIHVucmVnaXN0ZXJBbmltYXRpb246IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBkZWxldGUgdGhpcy5hbmltYXRpb25zW25hbWVdO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIEdldHMgYSByZWdpc3RlcmVkIGFuaW1hdGlvbi5cbiAgICovXG4gIGdldEFuaW1hdGlvbjogZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLmFuaW1hdGlvbnNbbmFtZV07XG4gIH0sXG5cblxuICAvKipcbiAgICogUHJlcGFyZSBhbiBlbGVtZW50IHRvIGJlIGVhc2llciBhbmltYXRhYmxlIChhZGRpbmcgYSBzaW1wbGUgYGFuaW1hdGVgIHBvbHlmaWxsIGlmIG5lZWRlZClcbiAgICovXG4gIG1ha2VFbGVtZW50QW5pbWF0YWJsZTogYW5pbWF0aW9uLm1ha2VFbGVtZW50QW5pbWF0YWJsZSxcblxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBkZWxpbWl0ZXJzIHRoYXQgZGVmaW5lIGFuIGV4cHJlc3Npb24uIERlZmF1bHQgaXMgYHt7YCBhbmQgYH19YCBidXQgdGhpcyBtYXkgYmUgb3ZlcnJpZGRlbi4gSWYgZW1wdHlcbiAgICogc3RyaW5ncyBhcmUgcGFzc2VkIGluIChmb3IgdHlwZSBcImF0dHJpYnV0ZVwiIG9ubHkpIHRoZW4gbm8gZGVsaW1pdGVycyBhcmUgcmVxdWlyZWQgZm9yIG1hdGNoaW5nIGF0dHJpYnV0ZXMsIGJ1dCB0aGVcbiAgICogZGVmYXVsdCBhdHRyaWJ1dGUgbWF0Y2hlciB3aWxsIG5vdCBhcHBseSB0byB0aGUgcmVzdCBvZiB0aGUgYXR0cmlidXRlcy4gVE9ETyBzdXBwb3J0IGRpZmZlcmVudCBkZWxpbWl0ZXJzIGZvciB0aGVcbiAgICogZGVmYXVsdCBhdHRyaWJ1dGVzIHZzIHJlZ2lzdGVyZWQgb25lcyAoaS5lLiBhbGxvdyByZWd1bGFyIGF0dHJpYnV0ZXMgdG8gdXNlIHt7fX0gd2hlbiBib3VuZCBvbmVzIGRvIG5vdCBuZWVkIHRoZW0pXG4gICAqL1xuICBzZXRFeHByZXNzaW9uRGVsaW1pdGVyczogZnVuY3Rpb24odHlwZSwgcHJlLCBwb3N0LCBvbmx5SW5EZWZhdWx0KSB7XG4gICAgaWYgKHR5cGUgIT09ICdhdHRyaWJ1dGUnICYmIHR5cGUgIT09ICd0ZXh0Jykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRXhwcmVzc2lvbiBkZWxpbWl0ZXJzIG11c3QgYmUgb2YgdHlwZSBcImF0dHJpYnV0ZVwiIG9yIFwidGV4dFwiJyk7XG4gICAgfVxuXG4gICAgdGhpcy5iaW5kZXJzW3R5cGVdLl9leHByID0gbmV3IFJlZ0V4cChlc2NhcGVSZWdFeHAocHJlKSArICcoLio/KScgKyBlc2NhcGVSZWdFeHAocG9zdCksICdnJyk7XG4gICAgaWYgKHR5cGUgPT09ICdhdHRyaWJ1dGUnKSB7XG4gICAgICB0aGlzLmJpbmRlcnNbdHlwZV0uX2RlbGltaXRlcnNPbmx5SW5EZWZhdWx0ID0gISFvbmx5SW5EZWZhdWx0O1xuICAgIH1cbiAgfSxcblxuXG4gIC8qKlxuICAgKiBUZXN0cyB3aGV0aGVyIGEgdmFsdWUgaGFzIGFuIGV4cHJlc3Npb24gaW4gaXQuIFNvbWV0aGluZyBsaWtlIGAvdXNlci97e3VzZXIuaWR9fWAuXG4gICAqL1xuICBpc0JvdW5kOiBmdW5jdGlvbih0eXBlLCB2YWx1ZSkge1xuICAgIGlmICh0eXBlICE9PSAnYXR0cmlidXRlJyAmJiB0eXBlICE9PSAndGV4dCcpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2lzQm91bmQgbXVzdCBwcm92aWRlIHR5cGUgXCJhdHRyaWJ1dGVcIiBvciBcInRleHRcIicpO1xuICAgIH1cbiAgICB2YXIgZXhwciA9IHRoaXMuYmluZGVyc1t0eXBlXS5fZXhwcjtcbiAgICByZXR1cm4gQm9vbGVhbihleHByICYmIHZhbHVlICYmIHZhbHVlLm1hdGNoKGV4cHIpKTtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBUaGUgc29ydCBmdW5jdGlvbiB0byBzb3J0IGJpbmRlcnMgY29ycmVjdGx5XG4gICAqL1xuICBiaW5kaW5nU29ydDogZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBiLnByb3RvdHlwZS5wcmlvcml0eSAtIGEucHJvdG90eXBlLnByaW9yaXR5O1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIENvbnZlcnRzIGFuIGludmVydGVkIGV4cHJlc3Npb24gZnJvbSBgL3VzZXIve3t1c2VyLmlkfX1gIHRvIGBcIi91c2VyL1wiICsgdXNlci5pZGBcbiAgICovXG4gIGNvZGlmeUV4cHJlc3Npb246IGZ1bmN0aW9uKHR5cGUsIHRleHQpIHtcbiAgICBpZiAodHlwZSAhPT0gJ2F0dHJpYnV0ZScgJiYgdHlwZSAhPT0gJ3RleHQnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdjb2RpZnlFeHByZXNzaW9uIG11c3QgdXNlIHR5cGUgXCJhdHRyaWJ1dGVcIiBvciBcInRleHRcIicpO1xuICAgIH1cblxuICAgIHZhciBleHByID0gdGhpcy5iaW5kZXJzW3R5cGVdLl9leHByO1xuICAgIHZhciBtYXRjaCA9IHRleHQubWF0Y2goZXhwcik7XG5cbiAgICBpZiAoIW1hdGNoKSB7XG4gICAgICByZXR1cm4gJ1wiJyArIHRleHQucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpICsgJ1wiJztcbiAgICB9IGVsc2UgaWYgKG1hdGNoLmxlbmd0aCA9PT0gMSAmJiBtYXRjaFswXSA9PT0gdGV4dCkge1xuICAgICAgcmV0dXJuIHRleHQucmVwbGFjZShleHByLCAnJDEnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIG5ld1RleHQgPSAnXCInLCBsYXN0SW5kZXggPSAwO1xuICAgICAgd2hpbGUgKChtYXRjaCA9IGV4cHIuZXhlYyh0ZXh0KSkpIHtcbiAgICAgICAgdmFyIHN0ciA9IHRleHQuc2xpY2UobGFzdEluZGV4LCBleHByLmxhc3RJbmRleCAtIG1hdGNoWzBdLmxlbmd0aCk7XG4gICAgICAgIG5ld1RleHQgKz0gc3RyLnJlcGxhY2UoL1wiL2csICdcXFxcXCInKTtcbiAgICAgICAgbmV3VGV4dCArPSAnXCIgKyAoJyArIG1hdGNoWzFdICsgJyB8fCBcIlwiKSArIFwiJztcbiAgICAgICAgbGFzdEluZGV4ID0gZXhwci5sYXN0SW5kZXg7XG4gICAgICB9XG4gICAgICBuZXdUZXh0ICs9IHRleHQuc2xpY2UobGFzdEluZGV4KS5yZXBsYWNlKC9cIi9nLCAnXFxcXFwiJykgKyAnXCInO1xuICAgICAgcmV0dXJuIG5ld1RleHQucmVwbGFjZSgvXlwiXCIgXFwrIHwgXCJcIiBcXCsgfCBcXCsgXCJcIiQvZywgJycpO1xuICAgIH1cbiAgfVxuXG59KTtcblxuLy8gVGFrZXMgYSBzdHJpbmcgbGlrZSBcIihcXCopXCIgb3IgXCJvbi1cXCpcIiBhbmQgY29udmVydHMgaXQgaW50byBhIHJlZ3VsYXIgZXhwcmVzc2lvbi5cbmZ1bmN0aW9uIGVzY2FwZVJlZ0V4cCh0ZXh0KSB7XG4gIHJldHVybiB0ZXh0LnJlcGxhY2UoL1stW1xcXXt9KCkqKz8uLFxcXFxeJHwjXFxzXS9nLCAnXFxcXCQmJyk7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFRlbXBsYXRlO1xudmFyIFZpZXcgPSByZXF1aXJlKCcuL3ZpZXcnKTtcbnZhciBDbGFzcyA9IHJlcXVpcmUoJ2NoaXAtdXRpbHMvY2xhc3MnKTtcblxuXG4vKipcbiAqICMjIFRlbXBsYXRlXG4gKiBUYWtlcyBhbiBIVE1MIHN0cmluZywgYW4gZWxlbWVudCwgYW4gYXJyYXkgb2YgZWxlbWVudHMsIG9yIGEgZG9jdW1lbnQgZnJhZ21lbnQsIGFuZCBjb21waWxlcyBpdCBpbnRvIGEgdGVtcGxhdGUuXG4gKiBJbnN0YW5jZXMgbWF5IHRoZW4gYmUgY3JlYXRlZCBhbmQgYm91bmQgdG8gYSBnaXZlbiBjb250ZXh0LlxuICogQHBhcmFtIHtTdHJpbmd8Tm9kZUxpc3R8SFRNTENvbGxlY3Rpb258SFRNTFRlbXBsYXRlRWxlbWVudHxIVE1MU2NyaXB0RWxlbWVudHxOb2RlfSBodG1sIEEgVGVtcGxhdGUgY2FuIGJlIGNyZWF0ZWRcbiAqIGZyb20gbWFueSBkaWZmZXJlbnQgdHlwZXMgb2Ygb2JqZWN0cy4gQW55IG9mIHRoZXNlIHdpbGwgYmUgY29udmVydGVkIGludG8gYSBkb2N1bWVudCBmcmFnbWVudCBmb3IgdGhlIHRlbXBsYXRlIHRvXG4gKiBjbG9uZS4gTm9kZXMgYW5kIGVsZW1lbnRzIHBhc3NlZCBpbiB3aWxsIGJlIHJlbW92ZWQgZnJvbSB0aGUgRE9NLlxuICovXG5mdW5jdGlvbiBUZW1wbGF0ZSgpIHtcbiAgdGhpcy5wb29sID0gW107XG59XG5cblxuQ2xhc3MuZXh0ZW5kKFRlbXBsYXRlLCB7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgdmlldyBjbG9uZWQgZnJvbSB0aGlzIHRlbXBsYXRlLlxuICAgKi9cbiAgY3JlYXRlVmlldzogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMucG9vbC5sZW5ndGgpIHtcbiAgICAgIHJldHVybiB0aGlzLnBvb2wucG9wKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIFZpZXcubWFrZUluc3RhbmNlT2YoZG9jdW1lbnQuaW1wb3J0Tm9kZSh0aGlzLCB0cnVlKSwgdGhpcyk7XG4gIH0sXG5cbiAgcmV0dXJuVmlldzogZnVuY3Rpb24odmlldykge1xuICAgIGlmICh0aGlzLnBvb2wuaW5kZXhPZih2aWV3KSA9PT0gLTEpIHtcbiAgICAgIHRoaXMucG9vbC5wdXNoKHZpZXcpO1xuICAgIH1cbiAgfVxufSk7XG4iLCIvLyBIZWxwZXIgbWV0aG9kcyBmb3IgYW5pbWF0aW9uXG5leHBvcnRzLm1ha2VFbGVtZW50QW5pbWF0YWJsZSA9IG1ha2VFbGVtZW50QW5pbWF0YWJsZTtcbmV4cG9ydHMuZ2V0Q29tcHV0ZWRDU1MgPSBnZXRDb21wdXRlZENTUztcbmV4cG9ydHMuYW5pbWF0ZUVsZW1lbnQgPSBhbmltYXRlRWxlbWVudDtcblxuZnVuY3Rpb24gbWFrZUVsZW1lbnRBbmltYXRhYmxlKGVsZW1lbnQpIHtcbiAgLy8gQWRkIHBvbHlmaWxsIGp1c3Qgb24gdGhpcyBlbGVtZW50XG4gIGlmICghZWxlbWVudC5hbmltYXRlKSB7XG4gICAgZWxlbWVudC5hbmltYXRlID0gYW5pbWF0ZUVsZW1lbnQ7XG4gIH1cblxuICAvLyBOb3QgYSBwb2x5ZmlsbCBidXQgYSBoZWxwZXJcbiAgaWYgKCFlbGVtZW50LmdldENvbXB1dGVkQ1NTKSB7XG4gICAgZWxlbWVudC5nZXRDb21wdXRlZENTUyA9IGdldENvbXB1dGVkQ1NTO1xuICB9XG5cbiAgcmV0dXJuIGVsZW1lbnQ7XG59XG5cbi8qKlxuICogR2V0IHRoZSBjb21wdXRlZCBzdHlsZSBvbiBhbiBlbGVtZW50LlxuICovXG5mdW5jdGlvbiBnZXRDb21wdXRlZENTUyhzdHlsZU5hbWUpIHtcbiAgaWYgKHRoaXMub3duZXJEb2N1bWVudC5kZWZhdWx0Vmlldy5vcGVuZXIpIHtcbiAgICByZXR1cm4gdGhpcy5vd25lckRvY3VtZW50LmRlZmF1bHRWaWV3LmdldENvbXB1dGVkU3R5bGUodGhpcylbc3R5bGVOYW1lXTtcbiAgfVxuICByZXR1cm4gd2luZG93LmdldENvbXB1dGVkU3R5bGUodGhpcylbc3R5bGVOYW1lXTtcbn1cblxuLyoqXG4gKiBWZXJ5IGJhc2ljIHBvbHlmaWxsIGZvciBFbGVtZW50LmFuaW1hdGUgaWYgaXQgZG9lc24ndCBleGlzdC4gSWYgaXQgZG9lcywgdXNlIHRoZSBuYXRpdmUuXG4gKiBUaGlzIG9ubHkgc3VwcG9ydHMgdHdvIGNzcyBzdGF0ZXMuIEl0IHdpbGwgb3ZlcndyaXRlIGV4aXN0aW5nIHN0eWxlcy4gSXQgZG9lc24ndCByZXR1cm4gYW4gYW5pbWF0aW9uIHBsYXkgY29udHJvbC4gSXRcbiAqIG9ubHkgc3VwcG9ydHMgZHVyYXRpb24sIGRlbGF5LCBhbmQgZWFzaW5nLiBSZXR1cm5zIGFuIG9iamVjdCB3aXRoIGEgcHJvcGVydHkgb25maW5pc2guXG4gKi9cbmZ1bmN0aW9uIGFuaW1hdGVFbGVtZW50KGNzcywgb3B0aW9ucykge1xuICBpZiAoIUFycmF5LmlzQXJyYXkoY3NzKSB8fCBjc3MubGVuZ3RoICE9PSAyKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYW5pbWF0ZSBwb2x5ZmlsbCByZXF1aXJlcyBhbiBhcnJheSBmb3IgY3NzIHdpdGggYW4gaW5pdGlhbCBhbmQgZmluYWwgc3RhdGUnKTtcbiAgfVxuXG4gIGlmICghb3B0aW9ucyB8fCAhb3B0aW9ucy5oYXNPd25Qcm9wZXJ0eSgnZHVyYXRpb24nKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2FuaW1hdGUgcG9seWZpbGwgcmVxdWlyZXMgb3B0aW9ucyB3aXRoIGEgZHVyYXRpb24nKTtcbiAgfVxuXG4gIHZhciBlbGVtZW50ID0gdGhpcztcbiAgdmFyIGR1cmF0aW9uID0gb3B0aW9ucy5kdXJhdGlvbiB8fCAwO1xuICB2YXIgZGVsYXkgPSBvcHRpb25zLmRlbGF5IHx8IDA7XG4gIHZhciBlYXNpbmcgPSBvcHRpb25zLmVhc2luZztcbiAgdmFyIGluaXRpYWxDc3MgPSBjc3NbMF07XG4gIHZhciBmaW5hbENzcyA9IGNzc1sxXTtcbiAgdmFyIGFsbENzcyA9IHt9O1xuICB2YXIgcGxheWJhY2sgPSB7IG9uZmluaXNoOiBudWxsIH07XG5cbiAgT2JqZWN0LmtleXMoaW5pdGlhbENzcykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICBhbGxDc3Nba2V5XSA9IHRydWU7XG4gICAgZWxlbWVudC5zdHlsZVtrZXldID0gaW5pdGlhbENzc1trZXldO1xuICB9KTtcblxuICAvLyB0cmlnZ2VyIHJlZmxvd1xuICBlbGVtZW50Lm9mZnNldFdpZHRoO1xuXG4gIHZhciB0cmFuc2l0aW9uT3B0aW9ucyA9ICcgJyArIGR1cmF0aW9uICsgJ21zJztcbiAgaWYgKGVhc2luZykge1xuICAgIHRyYW5zaXRpb25PcHRpb25zICs9ICcgJyArIGVhc2luZztcbiAgfVxuICBpZiAoZGVsYXkpIHtcbiAgICB0cmFuc2l0aW9uT3B0aW9ucyArPSAnICcgKyBkZWxheSArICdtcyc7XG4gIH1cblxuICBlbGVtZW50LnN0eWxlLnRyYW5zaXRpb24gPSBPYmplY3Qua2V5cyhmaW5hbENzcykubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgIHJldHVybiBrZXkgKyB0cmFuc2l0aW9uT3B0aW9ucztcbiAgfSkuam9pbignLCAnKTtcblxuICBPYmplY3Qua2V5cyhmaW5hbENzcykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICBhbGxDc3Nba2V5XSA9IHRydWU7XG4gICAgZWxlbWVudC5zdHlsZVtrZXldID0gZmluYWxDc3Nba2V5XTtcbiAgfSk7XG5cbiAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICBPYmplY3Qua2V5cyhhbGxDc3MpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICBlbGVtZW50LnN0eWxlW2tleV0gPSAnJztcbiAgICB9KTtcblxuICAgIGlmIChwbGF5YmFjay5vbmZpbmlzaCkge1xuICAgICAgcGxheWJhY2sub25maW5pc2goKTtcbiAgICB9XG4gIH0sIGR1cmF0aW9uICsgZGVsYXkpO1xuXG4gIHJldHVybiBwbGF5YmFjaztcbn1cbiIsIlxuXG5cbi8vIFBvbHlmaWxsIG1hdGNoZXNcbmlmICghRWxlbWVudC5wcm90b3R5cGUubWF0Y2hlcykge1xuICBFbGVtZW50LnByb3RvdHlwZS5tYXRjaGVzID1cbiAgICBFbGVtZW50LnByb3RvdHlwZS5tYXRjaGVzU2VsZWN0b3IgfHxcbiAgICBFbGVtZW50LnByb3RvdHlwZS53ZWJraXRNYXRjaGVzU2VsZWN0b3IgfHxcbiAgICBFbGVtZW50LnByb3RvdHlwZS5tb3pNYXRjaGVzU2VsZWN0b3IgfHxcbiAgICBFbGVtZW50LnByb3RvdHlwZS5tc01hdGNoZXNTZWxlY3RvciB8fFxuICAgIEVsZW1lbnQucHJvdG90eXBlLm9NYXRjaGVzU2VsZWN0b3I7XG59XG5cbi8vIFBvbHlmaWxsIGNsb3Nlc3RcbmlmICghRWxlbWVudC5wcm90b3R5cGUuY2xvc2VzdCkge1xuICBFbGVtZW50LnByb3RvdHlwZS5jbG9zZXN0ID0gZnVuY3Rpb24gY2xvc2VzdChzZWxlY3Rvcikge1xuICAgIHZhciBlbGVtZW50ID0gdGhpcztcbiAgICBkbyB7XG4gICAgICBpZiAoZWxlbWVudC5tYXRjaGVzKHNlbGVjdG9yKSkge1xuICAgICAgICByZXR1cm4gZWxlbWVudDtcbiAgICAgIH1cbiAgICB9IHdoaWxlICgoZWxlbWVudCA9IGVsZW1lbnQucGFyZW50Tm9kZSkgJiYgZWxlbWVudC5ub2RlVHlwZSA9PT0gTm9kZS5FTEVNRU5UX05PREUpO1xuICAgIHJldHVybiBudWxsO1xuICB9O1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSB0b0ZyYWdtZW50O1xuXG4vLyBDb252ZXJ0IHN0dWZmIGludG8gZG9jdW1lbnQgZnJhZ21lbnRzLiBTdHVmZiBjYW4gYmU6XG4vLyAqIEEgc3RyaW5nIG9mIEhUTUwgdGV4dFxuLy8gKiBBbiBlbGVtZW50IG9yIHRleHQgbm9kZVxuLy8gKiBBIE5vZGVMaXN0IG9yIEhUTUxDb2xsZWN0aW9uIChlLmcuIGBlbGVtZW50LmNoaWxkTm9kZXNgIG9yIGBlbGVtZW50LmNoaWxkcmVuYClcbi8vICogQSBqUXVlcnkgb2JqZWN0XG4vLyAqIEEgc2NyaXB0IGVsZW1lbnQgd2l0aCBhIGB0eXBlYCBhdHRyaWJ1dGUgb2YgYFwidGV4dC8qXCJgIChlLmcuIGA8c2NyaXB0IHR5cGU9XCJ0ZXh0L2h0bWxcIj5NeSB0ZW1wbGF0ZSBjb2RlITwvc2NyaXB0PmApXG4vLyAqIEEgdGVtcGxhdGUgZWxlbWVudCAoZS5nLiBgPHRlbXBsYXRlPk15IHRlbXBsYXRlIGNvZGUhPC90ZW1wbGF0ZT5gKVxuZnVuY3Rpb24gdG9GcmFnbWVudChodG1sKSB7XG4gIGlmIChodG1sIGluc3RhbmNlb2YgRG9jdW1lbnRGcmFnbWVudCkge1xuICAgIHJldHVybiBodG1sO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBodG1sID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBzdHJpbmdUb0ZyYWdtZW50KGh0bWwpO1xuICB9IGVsc2UgaWYgKGh0bWwgaW5zdGFuY2VvZiBOb2RlKSB7XG4gICAgcmV0dXJuIG5vZGVUb0ZyYWdtZW50KGh0bWwpO1xuICB9IGVsc2UgaWYgKCdsZW5ndGgnIGluIGh0bWwpIHtcbiAgICByZXR1cm4gbGlzdFRvRnJhZ21lbnQoaHRtbCk7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5zdXBwb3J0ZWQgVGVtcGxhdGUgVHlwZTogQ2Fubm90IGNvbnZlcnQgYCcgKyBodG1sICsgJ2AgaW50byBhIGRvY3VtZW50IGZyYWdtZW50LicpO1xuICB9XG59XG5cbi8vIENvbnZlcnRzIGFuIEhUTUwgbm9kZSBpbnRvIGEgZG9jdW1lbnQgZnJhZ21lbnQuIElmIGl0IGlzIGEgPHRlbXBsYXRlPiBub2RlIGl0cyBjb250ZW50cyB3aWxsIGJlIHVzZWQuIElmIGl0IGlzIGFcbi8vIDxzY3JpcHQ+IG5vZGUgaXRzIHN0cmluZy1iYXNlZCBjb250ZW50cyB3aWxsIGJlIGNvbnZlcnRlZCB0byBIVE1MIGZpcnN0LCB0aGVuIHVzZWQuIE90aGVyd2lzZSBhIGNsb25lIG9mIHRoZSBub2RlXG4vLyBpdHNlbGYgd2lsbCBiZSB1c2VkLlxuZnVuY3Rpb24gbm9kZVRvRnJhZ21lbnQobm9kZSkge1xuICBpZiAobm9kZS5jb250ZW50IGluc3RhbmNlb2YgRG9jdW1lbnRGcmFnbWVudCkge1xuICAgIHJldHVybiBub2RlLmNvbnRlbnQ7XG4gIH0gZWxzZSBpZiAobm9kZS50YWdOYW1lID09PSAnU0NSSVBUJykge1xuICAgIHJldHVybiBzdHJpbmdUb0ZyYWdtZW50KG5vZGUuaW5uZXJIVE1MKTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgaWYgKG5vZGUudGFnTmFtZSA9PT0gJ1RFTVBMQVRFJykge1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBub2RlLmNoaWxkTm9kZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKG5vZGUuY2hpbGROb2Rlc1tpXSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKG5vZGUpO1xuICAgIH1cbiAgICByZXR1cm4gZnJhZ21lbnQ7XG4gIH1cbn1cblxuLy8gQ29udmVydHMgYW4gSFRNTENvbGxlY3Rpb24sIE5vZGVMaXN0LCBqUXVlcnkgb2JqZWN0LCBvciBhcnJheSBpbnRvIGEgZG9jdW1lbnQgZnJhZ21lbnQuXG5mdW5jdGlvbiBsaXN0VG9GcmFnbWVudChsaXN0KSB7XG4gIHZhciBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBsaXN0Lmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIC8vIFVzZSB0b0ZyYWdtZW50IHNpbmNlIHRoaXMgbWF5IGJlIGFuIGFycmF5IG9mIHRleHQsIGEgalF1ZXJ5IG9iamVjdCBvZiBgPHRlbXBsYXRlPmBzLCBldGMuXG4gICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQodG9GcmFnbWVudChsaXN0W2ldKSk7XG4gICAgaWYgKGwgPT09IGxpc3QubGVuZ3RoICsgMSkge1xuICAgICAgLy8gYWRqdXN0IGZvciBOb2RlTGlzdHMgd2hpY2ggYXJlIGxpdmUsIHRoZXkgc2hyaW5rIGFzIHdlIHB1bGwgbm9kZXMgb3V0IG9mIHRoZSBET01cbiAgICAgIGktLTtcbiAgICAgIGwtLTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZyYWdtZW50O1xufVxuXG4vLyBDb252ZXJ0cyBhIHN0cmluZyBvZiBIVE1MIHRleHQgaW50byBhIGRvY3VtZW50IGZyYWdtZW50LlxudmFyIHN0cmluZ1RvRnJhZ21lbnQgPSBmdW5jdGlvbihzdHJpbmcpIHtcbiAgaWYgKCFzdHJpbmcpIHtcbiAgICB2YXIgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpKTtcbiAgICByZXR1cm4gZnJhZ21lbnQ7XG4gIH1cbiAgdmFyIHRlbXBsYXRlRWxlbWVudDtcbiAgdGVtcGxhdGVFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGVtcGxhdGUnKTtcbiAgdGVtcGxhdGVFbGVtZW50LmlubmVySFRNTCA9IHN0cmluZztcbiAgcmV0dXJuIHRlbXBsYXRlRWxlbWVudC5jb250ZW50O1xufTtcblxuLy8gSWYgSFRNTCBUZW1wbGF0ZXMgYXJlIG5vdCBhdmFpbGFibGUgKGUuZy4gaW4gSUUpIHRoZW4gdXNlIGFuIG9sZGVyIG1ldGhvZCB0byB3b3JrIHdpdGggY2VydGFpbiBlbGVtZW50cy5cbmlmICghZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGVtcGxhdGUnKS5jb250ZW50IGluc3RhbmNlb2YgRG9jdW1lbnRGcmFnbWVudCkge1xuICBzdHJpbmdUb0ZyYWdtZW50ID0gKGZ1bmN0aW9uKCkge1xuICAgIHZhciB0YWdFeHAgPSAvPChbXFx3Oi1dKykvO1xuXG4gICAgLy8gQ29waWVkIGZyb20galF1ZXJ5IChodHRwczovL2dpdGh1Yi5jb20vanF1ZXJ5L2pxdWVyeS9ibG9iL21hc3Rlci9MSUNFTlNFLnR4dClcbiAgICB2YXIgd3JhcE1hcCA9IHtcbiAgICAgIG9wdGlvbjogWyAxLCAnPHNlbGVjdCBtdWx0aXBsZT1cIm11bHRpcGxlXCI+JywgJzwvc2VsZWN0PicgXSxcbiAgICAgIGxlZ2VuZDogWyAxLCAnPGZpZWxkc2V0PicsICc8L2ZpZWxkc2V0PicgXSxcbiAgICAgIHRoZWFkOiBbIDEsICc8dGFibGU+JywgJzwvdGFibGU+JyBdLFxuICAgICAgdHI6IFsgMiwgJzx0YWJsZT48dGJvZHk+JywgJzwvdGJvZHk+PC90YWJsZT4nIF0sXG4gICAgICB0ZDogWyAzLCAnPHRhYmxlPjx0Ym9keT48dHI+JywgJzwvdHI+PC90Ym9keT48L3RhYmxlPicgXSxcbiAgICAgIGNvbDogWyAyLCAnPHRhYmxlPjx0Ym9keT48L3Rib2R5Pjxjb2xncm91cD4nLCAnPC9jb2xncm91cD48L3RhYmxlPicgXSxcbiAgICAgIGFyZWE6IFsgMSwgJzxtYXA+JywgJzwvbWFwPicgXSxcbiAgICAgIF9kZWZhdWx0OiBbIDAsICcnLCAnJyBdXG4gICAgfTtcbiAgICB3cmFwTWFwLm9wdGdyb3VwID0gd3JhcE1hcC5vcHRpb247XG4gICAgd3JhcE1hcC50Ym9keSA9IHdyYXBNYXAudGZvb3QgPSB3cmFwTWFwLmNvbGdyb3VwID0gd3JhcE1hcC5jYXB0aW9uID0gd3JhcE1hcC50aGVhZDtcbiAgICB3cmFwTWFwLnRoID0gd3JhcE1hcC50ZDtcblxuICAgIHJldHVybiBmdW5jdGlvbiBzdHJpbmdUb0ZyYWdtZW50KHN0cmluZykge1xuICAgICAgdmFyIGZyYWdtZW50O1xuICAgICAgaWYgKCFzdHJpbmcpIHtcbiAgICAgICAgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKSk7XG4gICAgICAgIHJldHVybiBmcmFnbWVudDtcbiAgICAgIH1cbiAgICAgIHZhciB0YWcgPSBzdHJpbmcubWF0Y2godGFnRXhwKTtcbiAgICAgIHZhciBwYXJ0cyA9IHdyYXBNYXBbdGFnXSB8fCB3cmFwTWFwLl9kZWZhdWx0O1xuICAgICAgdmFyIGRlcHRoID0gcGFydHNbMF07XG4gICAgICB2YXIgcHJlZml4ID0gcGFydHNbMV07XG4gICAgICB2YXIgcG9zdGZpeCA9IHBhcnRzWzJdO1xuICAgICAgdmFyIGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgZGl2LmlubmVySFRNTCA9IHByZWZpeCArIHN0cmluZyArIHBvc3RmaXg7XG4gICAgICB3aGlsZSAoZGVwdGgtLSkge1xuICAgICAgICBkaXYgPSBkaXYubGFzdENoaWxkO1xuICAgICAgfVxuICAgICAgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG4gICAgICB3aGlsZSAoZGl2LmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQoZGl2LmZpcnN0Q2hpbGQpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZyYWdtZW50O1xuICAgIH07XG4gIH0pKCk7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFZpZXc7XG52YXIgQ2xhc3MgPSByZXF1aXJlKCdjaGlwLXV0aWxzL2NsYXNzJyk7XG5cblxuLyoqXG4gKiAjIyBWaWV3XG4gKiBBIERvY3VtZW50RnJhZ21lbnQgd2l0aCBiaW5kaW5ncy5cbiAqL1xuZnVuY3Rpb24gVmlldyh0ZW1wbGF0ZSkge1xuICBpZiAodGVtcGxhdGUpIHtcbiAgICB0aGlzLnRlbXBsYXRlID0gdGVtcGxhdGU7XG4gICAgdGhpcy5iaW5kaW5ncyA9IHRoaXMudGVtcGxhdGUuYmluZGluZ3MubWFwKGZ1bmN0aW9uKGJpbmRpbmcpIHtcbiAgICAgIHJldHVybiBiaW5kaW5nLmNsb25lRm9yVmlldyh0aGlzKTtcbiAgICB9LCB0aGlzKTtcbiAgfSBlbHNlIGlmICh0aGlzLmJpbmRpbmdzKSB7XG4gICAgdGhpcy5iaW5kaW5ncy5mb3JFYWNoKGZ1bmN0aW9uKGJpbmRpbmcpIHtcbiAgICAgIGJpbmRpbmcuaW5pdCgpO1xuICAgIH0pO1xuICB9XG5cbiAgdGhpcy5maXJzdFZpZXdOb2RlID0gdGhpcy5maXJzdENoaWxkO1xuICB0aGlzLmxhc3RWaWV3Tm9kZSA9IHRoaXMubGFzdENoaWxkO1xuICBpZiAodGhpcy5maXJzdFZpZXdOb2RlKSB7XG4gICAgdGhpcy5maXJzdFZpZXdOb2RlLnZpZXcgPSB0aGlzO1xuICAgIHRoaXMubGFzdFZpZXdOb2RlLnZpZXcgPSB0aGlzO1xuICB9XG59XG5cblxuQ2xhc3MuZXh0ZW5kKFZpZXcsIHtcblxuICAvKipcbiAgICogUmVtb3ZlcyBhIHZpZXcgZnJvbSB0aGUgRE9NLiBBIHZpZXcgaXMgYSBEb2N1bWVudEZyYWdtZW50LCBzbyBgcmVtb3ZlKClgIHJldHVybnMgYWxsIGl0cyBub2RlcyB0byBpdHNlbGYuXG4gICAqL1xuICByZW1vdmU6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBub2RlID0gdGhpcy5maXJzdFZpZXdOb2RlO1xuICAgIHZhciBuZXh0O1xuXG4gICAgaWYgKG5vZGUucGFyZW50Tm9kZSAhPT0gdGhpcykge1xuICAgICAgLy8gUmVtb3ZlIGFsbCB0aGUgbm9kZXMgYW5kIHB1dCB0aGVtIGJhY2sgaW50byB0aGlzIGZyYWdtZW50XG4gICAgICB3aGlsZSAobm9kZSkge1xuICAgICAgICBuZXh0ID0gKG5vZGUgPT09IHRoaXMubGFzdFZpZXdOb2RlKSA/IG51bGwgOiBub2RlLm5leHRTaWJsaW5nO1xuICAgICAgICB0aGlzLmFwcGVuZENoaWxkKG5vZGUpO1xuICAgICAgICBub2RlID0gbmV4dDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGEgdmlldyAoaWYgbm90IGFscmVhZHkgcmVtb3ZlZCkgYW5kIGFkZHMgdGhlIHZpZXcgdG8gaXRzIHRlbXBsYXRlJ3MgcG9vbC5cbiAgICovXG4gIGRpc3Bvc2U6IGZ1bmN0aW9uKCkge1xuICAgIC8vIE1ha2Ugc3VyZSB0aGUgdmlldyBpcyByZW1vdmVkIGZyb20gdGhlIERPTVxuICAgIHRoaXMuYmluZGluZ3MuZm9yRWFjaChmdW5jdGlvbihiaW5kaW5nKSB7XG4gICAgICBiaW5kaW5nLmRpc3Bvc2UoKTtcbiAgICB9KTtcblxuICAgIHRoaXMucmVtb3ZlKCk7XG4gICAgaWYgKHRoaXMudGVtcGxhdGUpIHtcbiAgICAgIHRoaXMudGVtcGxhdGUucmV0dXJuVmlldyh0aGlzKTtcbiAgICB9XG4gIH0sXG5cblxuICAvKipcbiAgICogQmluZHMgYSB2aWV3IHRvIGEgZ2l2ZW4gY29udGV4dC5cbiAgICovXG4gIGJpbmQ6IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgICB0aGlzLmJpbmRpbmdzLmZvckVhY2goZnVuY3Rpb24oYmluZGluZykge1xuICAgICAgYmluZGluZy5iaW5kKGNvbnRleHQpO1xuICAgIH0pO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIFVuYmluZHMgYSB2aWV3IGZyb20gYW55IGNvbnRleHQuXG4gICAqL1xuICB1bmJpbmQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuYmluZGluZ3MuZm9yRWFjaChmdW5jdGlvbihiaW5kaW5nKSB7XG4gICAgICBiaW5kaW5nLnVuYmluZCgpO1xuICAgIH0pO1xuICB9XG59KTtcbiIsIlxuZXhwb3J0cy5PYnNlcnZhdGlvbnMgPSByZXF1aXJlKCcuL3NyYy9vYnNlcnZhdGlvbnMnKTtcbmV4cG9ydHMuT2JzZXJ2ZXIgPSByZXF1aXJlKCcuL3NyYy9vYnNlcnZlcicpO1xuZXhwb3J0cy5jcmVhdGUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIG5ldyBleHBvcnRzLk9ic2VydmF0aW9ucygpO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gT2JzZXJ2YXRpb25zO1xudmFyIENsYXNzID0gcmVxdWlyZSgnY2hpcC11dGlscy9jbGFzcycpO1xudmFyIE9ic2VydmVyID0gcmVxdWlyZSgnLi9vYnNlcnZlcicpO1xudmFyIHJlcXVlc3RBbmltYXRpb25GcmFtZSA9IGdsb2JhbC5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgc2V0VGltZW91dDtcbnZhciBjYW5jZWxBbmltYXRpb25GcmFtZSA9IGdsb2JhbC5jYW5jZWxBbmltYXRpb25GcmFtZSB8fCBjbGVhclRpbWVvdXQ7XG5cblxuZnVuY3Rpb24gT2JzZXJ2YXRpb25zKCkge1xuICB0aGlzLmdsb2JhbHMgPSB7fTtcbiAgdGhpcy5mb3JtYXR0ZXJzID0ge307XG4gIHRoaXMub2JzZXJ2ZXJzID0gW107XG4gIHRoaXMuY2FsbGJhY2tzID0gW107XG4gIHRoaXMubGlzdGVuZXJzID0gW107XG4gIHRoaXMuc3luY2luZyA9IGZhbHNlO1xuICB0aGlzLmNhbGxiYWNrc1J1bm5pbmcgPSBmYWxzZTtcbiAgdGhpcy5yZXJ1biA9IGZhbHNlO1xuICB0aGlzLmN5Y2xlcyA9IDA7XG4gIHRoaXMubWF4Q3ljbGVzID0gMTA7XG4gIHRoaXMudGltZW91dCA9IG51bGw7XG4gIHRoaXMucGVuZGluZ1N5bmMgPSBudWxsO1xuICB0aGlzLnN5bmNOb3cgPSB0aGlzLnN5bmNOb3cuYmluZCh0aGlzKTtcbn1cblxuXG5DbGFzcy5leHRlbmQoT2JzZXJ2YXRpb25zLCB7XG5cbiAgLy8gQ3JlYXRlcyBhIG5ldyBvYnNlcnZlciBhdHRhY2hlZCB0byB0aGlzIG9ic2VydmF0aW9ucyBvYmplY3QuIFdoZW4gdGhlIG9ic2VydmVyIGlzIGJvdW5kIHRvIGEgY29udGV4dCBpdCB3aWxsIGJlIGFkZGVkXG4gIC8vIHRvIHRoaXMgYG9ic2VydmF0aW9uc2AgYW5kIHN5bmNlZCB3aGVuIHRoaXMgYG9ic2VydmF0aW9ucy5zeW5jYCBpcyBjYWxsZWQuXG4gIGNyZWF0ZU9ic2VydmVyOiBmdW5jdGlvbihleHByLCBjYWxsYmFjaywgY2FsbGJhY2tDb250ZXh0KSB7XG4gICAgcmV0dXJuIG5ldyBPYnNlcnZlcih0aGlzLCBleHByLCBjYWxsYmFjaywgY2FsbGJhY2tDb250ZXh0KTtcbiAgfSxcblxuXG4gIC8vIFNjaGVkdWxlcyBhbiBvYnNlcnZlciBzeW5jIGN5Y2xlIHdoaWNoIGNoZWNrcyBhbGwgdGhlIG9ic2VydmVycyB0byBzZWUgaWYgdGhleSd2ZSBjaGFuZ2VkLlxuICBzeW5jOiBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuYWZ0ZXJTeW5jKGNhbGxiYWNrKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5wZW5kaW5nU3luYykge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHRoaXMucGVuZGluZ1N5bmMgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy5zeW5jTm93KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcblxuXG4gIC8vIFJ1bnMgdGhlIG9ic2VydmVyIHN5bmMgY3ljbGUgd2hpY2ggY2hlY2tzIGFsbCB0aGUgb2JzZXJ2ZXJzIHRvIHNlZSBpZiB0aGV5J3ZlIGNoYW5nZWQuXG4gIHN5bmNOb3c6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5hZnRlclN5bmMoY2FsbGJhY2spO1xuICAgIH1cblxuICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lKHRoaXMucGVuZGluZ1N5bmMpO1xuICAgIHRoaXMucGVuZGluZ1N5bmMgPSBudWxsO1xuXG4gICAgaWYgKHRoaXMuc3luY2luZykge1xuICAgICAgdGhpcy5yZXJ1biA9IHRydWU7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdGhpcy5ydW5TeW5jKCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0sXG5cblxuICBydW5TeW5jOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN5bmNpbmcgPSB0cnVlO1xuICAgIHRoaXMucmVydW4gPSB0cnVlO1xuICAgIHRoaXMuY3ljbGVzID0gMDtcblxuICAgIHZhciBpLCBsO1xuXG4gICAgLy8gQWxsb3cgY2FsbGJhY2tzIHRvIHJ1biB0aGUgc3luYyBjeWNsZSBhZ2FpbiBpbW1lZGlhdGVseSwgYnV0IHN0b3AgYXQgYG1heEN5bGVzYCAoZGVmYXVsdCAxMCkgY3ljbGVzIHNvIHdlIGRvbid0XG4gICAgLy8gcnVuIGluZmluaXRlIGxvb3BzXG4gICAgd2hpbGUgKHRoaXMucmVydW4pIHtcbiAgICAgIGlmICgrK3RoaXMuY3ljbGVzID09PSB0aGlzLm1heEN5Y2xlcykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0luZmluaXRlIG9ic2VydmVyIHN5bmNpbmcsIGFuIG9ic2VydmVyIGlzIGNhbGxpbmcgT2JzZXJ2ZXIuc3luYygpIHRvbyBtYW55IHRpbWVzJyk7XG4gICAgICB9XG4gICAgICB0aGlzLnJlcnVuID0gZmFsc2U7XG4gICAgICAvLyB0aGUgb2JzZXJ2ZXIgYXJyYXkgbWF5IGluY3JlYXNlIG9yIGRlY3JlYXNlIGluIHNpemUgKHJlbWFpbmluZyBvYnNlcnZlcnMpIGR1cmluZyB0aGUgc3luY1xuICAgICAgZm9yIChpID0gMDsgaSA8IHRoaXMub2JzZXJ2ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRoaXMub2JzZXJ2ZXJzW2ldLnN5bmMoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmNhbGxiYWNrc1J1bm5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGNhbGxiYWNrcyA9IHRoaXMuY2FsbGJhY2tzO1xuICAgIHRoaXMuY2FsbGJhY2tzID0gW107XG4gICAgd2hpbGUgKGNhbGxiYWNrcy5sZW5ndGgpIHtcbiAgICAgIGNhbGxiYWNrcy5zaGlmdCgpKCk7XG4gICAgfVxuXG4gICAgZm9yIChpID0gMCwgbCA9IHRoaXMubGlzdGVuZXJzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgdmFyIGxpc3RlbmVyID0gdGhpcy5saXN0ZW5lcnNbaV07XG4gICAgICBsaXN0ZW5lcigpO1xuICAgIH1cblxuICAgIHRoaXMuY2FsbGJhY2tzUnVubmluZyA9IGZhbHNlO1xuICAgIHRoaXMuc3luY2luZyA9IGZhbHNlO1xuICAgIHRoaXMuY3ljbGVzID0gMDtcbiAgfSxcblxuXG4gIC8vIEFmdGVyIHRoZSBuZXh0IHN5bmMgKG9yIHRoZSBjdXJyZW50IGlmIGluIHRoZSBtaWRkbGUgb2Ygb25lKSwgcnVuIHRoZSBwcm92aWRlZCBjYWxsYmFja1xuICBhZnRlclN5bmM6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgaWYgKHR5cGVvZiBjYWxsYmFjayAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY2FsbGJhY2tzUnVubmluZykge1xuICAgICAgdGhpcy5zeW5jKCk7XG4gICAgfVxuXG4gICAgdGhpcy5jYWxsYmFja3MucHVzaChjYWxsYmFjayk7XG4gIH0sXG5cblxuICBvblN5bmM6IGZ1bmN0aW9uKGxpc3RlbmVyKSB7XG4gICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgfVxuXG4gICAgdGhpcy5saXN0ZW5lcnMucHVzaChsaXN0ZW5lcik7XG4gIH0sXG5cblxuICBvZmZTeW5jOiBmdW5jdGlvbihsaXN0ZW5lcikge1xuICAgIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgIH1cblxuICAgIHZhciBpbmRleCA9IHRoaXMubGlzdGVuZXJzLmluZGV4T2YobGlzdGVuZXIpO1xuICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgIHRoaXMubGlzdGVuZXJzLnNwbGljZShpbmRleCwgMSkucG9wKCk7XG4gICAgfVxuICB9LFxuXG5cbiAgLy8gQWRkcyBhIG5ldyBvYnNlcnZlciB0byBiZSBzeW5jZWQgd2l0aCBjaGFuZ2VzLiBJZiBgc2tpcFVwZGF0ZWAgaXMgdHJ1ZSB0aGVuIHRoZSBjYWxsYmFjayB3aWxsIG9ubHkgYmUgY2FsbGVkIHdoZW4gYVxuICAvLyBjaGFuZ2UgaXMgbWFkZSwgbm90IGluaXRpYWxseS5cbiAgYWRkOiBmdW5jdGlvbihvYnNlcnZlciwgc2tpcFVwZGF0ZSkge1xuICAgIHRoaXMub2JzZXJ2ZXJzLnB1c2gob2JzZXJ2ZXIpO1xuICAgIGlmICghc2tpcFVwZGF0ZSkge1xuICAgICAgb2JzZXJ2ZXIuZm9yY2VVcGRhdGVOZXh0U3luYyA9IHRydWU7XG4gICAgICBvYnNlcnZlci5zeW5jKCk7XG4gICAgfVxuICB9LFxuXG5cbiAgLy8gUmVtb3ZlcyBhbiBvYnNlcnZlciwgc3RvcHBpbmcgaXQgZnJvbSBiZWluZyBydW5cbiAgcmVtb3ZlOiBmdW5jdGlvbihvYnNlcnZlcikge1xuICAgIHZhciBpbmRleCA9IHRoaXMub2JzZXJ2ZXJzLmluZGV4T2Yob2JzZXJ2ZXIpO1xuICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgIHRoaXMub2JzZXJ2ZXJzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfSxcbn0pO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBPYnNlcnZlcjtcbnZhciBDbGFzcyA9IHJlcXVpcmUoJ2NoaXAtdXRpbHMvY2xhc3MnKTtcbnZhciBleHByZXNzaW9ucyA9IHJlcXVpcmUoJ2V4cHJlc3Npb25zLWpzJyk7XG52YXIgZGlmZiA9IHJlcXVpcmUoJ2RpZmZlcmVuY2VzLWpzJyk7XG5cbi8vICMgT2JzZXJ2ZXJcblxuLy8gRGVmaW5lcyBhbiBvYnNlcnZlciBjbGFzcyB3aGljaCByZXByZXNlbnRzIGFuIGV4cHJlc3Npb24uIFdoZW5ldmVyIHRoYXQgZXhwcmVzc2lvbiByZXR1cm5zIGEgbmV3IHZhbHVlIHRoZSBgY2FsbGJhY2tgXG4vLyBpcyBjYWxsZWQgd2l0aCB0aGUgdmFsdWUuXG4vL1xuLy8gSWYgdGhlIG9sZCBhbmQgbmV3IHZhbHVlcyB3ZXJlIGVpdGhlciBhbiBhcnJheSBvciBhbiBvYmplY3QsIHRoZSBgY2FsbGJhY2tgIGFsc29cbi8vIHJlY2VpdmVzIGFuIGFycmF5IG9mIHNwbGljZXMgKGZvciBhbiBhcnJheSksIG9yIGFuIGFycmF5IG9mIGNoYW5nZSBvYmplY3RzIChmb3IgYW4gb2JqZWN0KSB3aGljaCBhcmUgdGhlIHNhbWVcbi8vIGZvcm1hdCB0aGF0IGBBcnJheS5vYnNlcnZlYCBhbmQgYE9iamVjdC5vYnNlcnZlYCByZXR1cm5cbi8vIDxodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9PYmplY3Qvb2JzZXJ2ZT4uXG5mdW5jdGlvbiBPYnNlcnZlcihvYnNlcnZhdGlvbnMsIGV4cHIsIGNhbGxiYWNrLCBjYWxsYmFja0NvbnRleHQpIHtcbiAgaWYgKHR5cGVvZiBleHByID09PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhpcy5nZXR0ZXIgPSBleHByO1xuICAgIHRoaXMuc2V0dGVyID0gZXhwcjtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmdldHRlciA9IGV4cHJlc3Npb25zLnBhcnNlKGV4cHIsIG9ic2VydmF0aW9ucy5nbG9iYWxzLCBvYnNlcnZhdGlvbnMuZm9ybWF0dGVycyk7XG4gIH1cbiAgdGhpcy5vYnNlcnZhdGlvbnMgPSBvYnNlcnZhdGlvbnM7XG4gIHRoaXMuZXhwciA9IGV4cHI7XG4gIHRoaXMuY2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgdGhpcy5jYWxsYmFja0NvbnRleHQgPSBjYWxsYmFja0NvbnRleHQ7XG4gIHRoaXMuc2tpcCA9IGZhbHNlO1xuICB0aGlzLmZvcmNlVXBkYXRlTmV4dFN5bmMgPSBmYWxzZTtcbiAgdGhpcy5jb250ZXh0ID0gbnVsbDtcbiAgdGhpcy5vbGRWYWx1ZSA9IHVuZGVmaW5lZDtcbn1cblxuQ2xhc3MuZXh0ZW5kKE9ic2VydmVyLCB7XG5cbiAgLy8gQmluZHMgdGhpcyBleHByZXNzaW9uIHRvIGEgZ2l2ZW4gY29udGV4dFxuICBiaW5kOiBmdW5jdGlvbihjb250ZXh0LCBza2lwVXBkYXRlKSB7XG4gICAgdGhpcy5jb250ZXh0ID0gY29udGV4dDtcbiAgICBpZiAodGhpcy5jYWxsYmFjaykge1xuICAgICAgdGhpcy5vYnNlcnZhdGlvbnMuYWRkKHRoaXMsIHNraXBVcGRhdGUpO1xuICAgIH1cbiAgfSxcblxuICAvLyBVbmJpbmRzIHRoaXMgZXhwcmVzc2lvblxuICB1bmJpbmQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMub2JzZXJ2YXRpb25zLnJlbW92ZSh0aGlzKTtcbiAgICB0aGlzLmNvbnRleHQgPSBudWxsO1xuICB9LFxuXG4gIC8vIENsb3NlcyB0aGUgb2JzZXJ2ZXIsIGNsZWFuaW5nIHVwIGFueSBwb3NzaWJsZSBtZW1vcnktbGVha3NcbiAgY2xvc2U6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudW5iaW5kKCk7XG4gICAgdGhpcy5jYWxsYmFjayA9IG51bGw7XG4gICAgdGhpcy5jYWxsYmFja0NvbnRleHQgPSBudWxsO1xuICB9LFxuXG4gIC8vIFJldHVybnMgdGhlIGN1cnJlbnQgdmFsdWUgb2YgdGhpcyBvYnNlcnZlclxuICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLmNvbnRleHQpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldHRlci5jYWxsKHRoaXMuY29udGV4dCk7XG4gICAgfVxuICB9LFxuXG4gIC8vIFNldHMgdGhlIHZhbHVlIG9mIHRoaXMgZXhwcmVzc2lvblxuICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgaWYgKCF0aGlzLmNvbnRleHQpIHJldHVybjtcbiAgICBpZiAodGhpcy5zZXR0ZXIgPT09IGZhbHNlKSByZXR1cm47XG4gICAgaWYgKCF0aGlzLnNldHRlcikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgdGhpcy5zZXR0ZXIgPSB0eXBlb2YgdGhpcy5leHByID09PSAnc3RyaW5nJ1xuICAgICAgICAgID8gZXhwcmVzc2lvbnMucGFyc2VTZXR0ZXIodGhpcy5leHByLCB0aGlzLm9ic2VydmF0aW9ucy5nbG9iYWxzLCB0aGlzLm9ic2VydmF0aW9ucy5mb3JtYXR0ZXJzKVxuICAgICAgICAgIDogZmFsc2U7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHRoaXMuc2V0dGVyID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoIXRoaXMuc2V0dGVyKSByZXR1cm47XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIHZhciByZXN1bHQgPSB0aGlzLnNldHRlci5jYWxsKHRoaXMuY29udGV4dCwgdmFsdWUpO1xuICAgIH0gY2F0Y2goZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFdlIGNhbid0IGV4cGVjdCBjb2RlIGluIGZyYWdtZW50cyBvdXRzaWRlIE9ic2VydmVyIHRvIGJlIGF3YXJlIG9mIFwic3luY1wiIHNpbmNlIG9ic2VydmVyIGNhbiBiZSByZXBsYWNlZCBieSBvdGhlclxuICAgIC8vIHR5cGVzIChlLmcuIG9uZSB3aXRob3V0IGEgYHN5bmMoKWAgbWV0aG9kLCBzdWNoIGFzIG9uZSB0aGF0IHVzZXMgYE9iamVjdC5vYnNlcnZlYCkgaW4gb3RoZXIgc3lzdGVtcy5cbiAgICB0aGlzLnN5bmMoKTtcbiAgICB0aGlzLm9ic2VydmF0aW9ucy5zeW5jKCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSxcblxuXG4gIC8vIEluc3RydWN0cyB0aGlzIG9ic2VydmVyIHRvIG5vdCBjYWxsIGl0cyBgY2FsbGJhY2tgIG9uIHRoZSBuZXh0IHN5bmMsIHdoZXRoZXIgdGhlIHZhbHVlIGhhcyBjaGFuZ2VkIG9yIG5vdFxuICBza2lwTmV4dFN5bmM6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2tpcCA9IHRydWU7XG4gIH0sXG5cblxuICAvLyBTeW5jcyB0aGlzIG9ic2VydmVyIG5vdywgY2FsbGluZyB0aGUgY2FsbGJhY2sgaW1tZWRpYXRlbHkgaWYgdGhlcmUgaGF2ZSBiZWVuIGNoYW5nZXNcbiAgc3luYzogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHZhbHVlID0gdGhpcy5nZXQoKTtcblxuICAgIC8vIERvbid0IGNhbGwgdGhlIGNhbGxiYWNrIGlmIGBza2lwTmV4dFN5bmNgIHdhcyBjYWxsZWQgb24gdGhlIG9ic2VydmVyXG4gICAgaWYgKHRoaXMuc2tpcCB8fCAhdGhpcy5jYWxsYmFjaykge1xuICAgICAgdGhpcy5za2lwID0gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElmIGFuIGFycmF5IGhhcyBjaGFuZ2VkIGNhbGN1bGF0ZSB0aGUgc3BsaWNlcyBhbmQgY2FsbCB0aGUgY2FsbGJhY2suIFRoaXNcbiAgICAgIHZhciBjaGFuZ2VkID0gZGlmZi52YWx1ZXModmFsdWUsIHRoaXMub2xkVmFsdWUpO1xuICAgICAgaWYgKCFjaGFuZ2VkICYmICF0aGlzLmZvcmNlVXBkYXRlTmV4dFN5bmMpIHJldHVybjtcbiAgICAgIHRoaXMuZm9yY2VVcGRhdGVOZXh0U3luYyA9IGZhbHNlO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoY2hhbmdlZCkpIHtcbiAgICAgICAgdGhpcy5jYWxsYmFjay5jYWxsKHRoaXMuY2FsbGJhY2tDb250ZXh0LCB2YWx1ZSwgdGhpcy5vbGRWYWx1ZSwgY2hhbmdlZCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmNhbGxiYWNrLmNhbGwodGhpcy5jYWxsYmFja0NvbnRleHQsIHZhbHVlLCB0aGlzLm9sZFZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5nZXRDaGFuZ2VSZWNvcmRzKSB7XG4gICAgICAvLyBTdG9yZSBhbiBpbW11dGFibGUgdmVyc2lvbiBvZiB0aGUgdmFsdWUsIGFsbG93aW5nIGZvciBhcnJheXMgYW5kIG9iamVjdHMgdG8gY2hhbmdlIGluc3RhbmNlIGJ1dCBub3QgY29udGVudCBhbmRcbiAgICAgIC8vIHN0aWxsIHJlZnJhaW4gZnJvbSBkaXNwYXRjaGluZyBjYWxsYmFja3MgKGUuZy4gd2hlbiB1c2luZyBhbiBvYmplY3QgaW4gYmluZC1jbGFzcyBvciB3aGVuIHVzaW5nIGFycmF5IGZvcm1hdHRlcnNcbiAgICAgIC8vIGluIGJpbmQtZWFjaClcbiAgICAgIHRoaXMub2xkVmFsdWUgPSBkaWZmLmNsb25lKHZhbHVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5vbGRWYWx1ZSA9IHZhbHVlO1xuICAgIH1cbiAgfVxufSk7XG4iLCJcbmV4cG9ydHMuUm91dGVyID0gcmVxdWlyZSgnLi9zcmMvcm91dGVyJyk7XG5leHBvcnRzLlJvdXRlID0gcmVxdWlyZSgnLi9zcmMvcm91dGUnKTtcbmV4cG9ydHMuTG9jYXRpb24gPSByZXF1aXJlKCcuL3NyYy9sb2NhdGlvbicpO1xuZXhwb3J0cy5IYXNoTG9jYXRpb24gPSByZXF1aXJlKCcuL3NyYy9oYXNoLWxvY2F0aW9uJyk7XG5leHBvcnRzLlB1c2hMb2NhdGlvbiA9IHJlcXVpcmUoJy4vc3JjL3B1c2gtbG9jYXRpb24nKTtcbmV4cG9ydHMuY3JlYXRlID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICByZXR1cm4gbmV3IGV4cG9ydHMuUm91dGVyKG9wdGlvbnMpO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gSGFzaExvY2F0aW9uO1xudmFyIExvY2F0aW9uID0gcmVxdWlyZSgnLi9sb2NhdGlvbicpO1xuXG5cbi8vIExvY2F0aW9uIGltcGxlbWVudGF0aW9uIGZvciB1c2luZyB0aGUgVVJMIGhhc2hcbmZ1bmN0aW9uIEhhc2hMb2NhdGlvbigpIHtcbiAgTG9jYXRpb24uY2FsbCh0aGlzKTtcbn1cblxuTG9jYXRpb24uZXh0ZW5kKEhhc2hMb2NhdGlvbiwge1xuICBoaXN0b3J5RXZlbnROYW1lOiAnaGFzaGNoYW5nZScsXG5cbiAgZ2V0IHVybCgpIHtcbiAgICByZXR1cm4gbG9jYXRpb24uaGFzaC5yZXBsYWNlKC9eI1xcLz8vLCAnLycpIHx8ICcvJztcbiAgfSxcblxuICBzZXQgdXJsKHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlLmNoYXJBdCgwKSA9PT0gJy4nIHx8IHZhbHVlLnNwbGl0KCcvLycpLmxlbmd0aCA+IDEpIHtcbiAgICAgIHZhbHVlID0gdGhpcy5nZXRSZWxhdGl2ZVVybCh2YWx1ZSk7XG4gICAgfVxuXG4gICAgbG9jYXRpb24uaGFzaCA9ICh2YWx1ZSA9PT0gJy8nID8gJycgOiAnIycgKyB2YWx1ZSk7XG4gIH1cblxufSk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IExvY2F0aW9uO1xudmFyIEV2ZW50VGFyZ2V0ID0gcmVxdWlyZSgnY2hpcC11dGlscy9ldmVudC10YXJnZXQnKTtcbnZhciBkb2MgPSBkb2N1bWVudC5pbXBsZW1lbnRhdGlvbi5jcmVhdGVIVE1MRG9jdW1lbnQoJycpO1xudmFyIGJhc2UgPSBkb2MuY3JlYXRlRWxlbWVudCgnYmFzZScpO1xudmFyIGFuY2hvciA9IGRvYy5jcmVhdGVFbGVtZW50KCdhJyk7XG52YXIgYmFzZXMgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnYmFzZScpO1xudmFyIGJhc2VVUkkgPSBiYXNlc1swXSA/IGJhc2VzWzBdLmhyZWYgOiBsb2NhdGlvbi5wcm90b2NvbCArICcvLycgKyBsb2NhdGlvbi5ob3N0O1xudmFyIFB1c2hMb2NhdGlvbiwgcHVzaExvY2F0aW9uO1xudmFyIEhhc2hMb2NhdGlvbiwgaGFzaExvY2F0aW9uO1xuZG9jLmJvZHkuYXBwZW5kQ2hpbGQoYmFzZSk7XG5kb2MuYm9keS5hcHBlbmRDaGlsZChhbmNob3IpO1xuXG5cbmZ1bmN0aW9uIExvY2F0aW9uKCkge1xuICBFdmVudFRhcmdldC5jYWxsKHRoaXMpO1xuICB0aGlzLl9oYW5kbGVDaGFuZ2UgPSB0aGlzLl9oYW5kbGVDaGFuZ2UuYmluZCh0aGlzKTtcbiAgdGhpcy5iYXNlVVJJID0gYmFzZVVSSTtcbiAgdGhpcy5jdXJyZW50VXJsID0gdGhpcy51cmw7XG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKHRoaXMuaGlzdG9yeUV2ZW50TmFtZSwgdGhpcy5faGFuZGxlQ2hhbmdlKTtcbn1cblxuRXZlbnRUYXJnZXQuZXh0ZW5kKExvY2F0aW9uLCB7XG4gIHN0YXRpYzoge1xuICAgIGNyZWF0ZTogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgaWYgKG9wdGlvbnMudXNlID09PSAnaGFzaCcgfHwgIVB1c2hMb2NhdGlvbi5zdXBwb3J0ZWQpIHtcbiAgICAgICAgcmV0dXJuIGhhc2hMb2NhdGlvbiB8fCAoaGFzaExvY2F0aW9uID0gbmV3IEhhc2hMb2NhdGlvbigpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBwdXNoTG9jYXRpb24gfHwgKHB1c2hMb2NhdGlvbiA9IG5ldyBQdXNoTG9jYXRpb24oKSk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIGdldCBzdXBwb3J0ZWQoKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH0sXG5cbiAgaGlzdG9yeUV2ZW50TmFtZTogJycsXG4gIGJhc2U6IGJhc2UsXG4gIGFuY2hvcjogYW5jaG9yLFxuXG4gIGdldFJlbGF0aXZlVXJsOiBmdW5jdGlvbih1cmwpIHtcbiAgICBiYXNlLmhyZWYgPSBiYXNlVVJJICsgdGhpcy5jdXJyZW50VXJsO1xuICAgIGFuY2hvci5ocmVmID0gdXJsO1xuICAgIHVybCA9IGFuY2hvci5wYXRobmFtZSArIGFuY2hvci5zZWFyY2g7XG4gICAgLy8gRml4IElFJ3MgbWlzc2luZyBzbGFzaCBwcmVmaXhcbiAgICByZXR1cm4gKHVybFswXSA9PT0gJy8nKSA/IHVybCA6ICcvJyArIHVybDtcbiAgfSxcblxuICBnZXRQYXRoOiBmdW5jdGlvbih1cmwpIHtcbiAgICBiYXNlLmhyZWYgPSBiYXNlVVJJICsgdGhpcy5jdXJyZW50VXJsO1xuICAgIGFuY2hvci5ocmVmID0gdXJsO1xuICAgIHZhciBwYXRoID0gYW5jaG9yLnBhdGhuYW1lO1xuICAgIC8vIEZpeCBJRSdzIG1pc3Npbmcgc2xhc2ggcHJlZml4XG4gICAgcmV0dXJuIChwYXRoWzBdID09PSAnLycpID8gcGF0aCA6ICcvJyArIHBhdGg7XG4gIH0sXG5cbiAgZ2V0IHVybCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0Fic3RyYWN0IG1ldGhvZC4gT3ZlcnJpZGUnKTtcbiAgfSxcblxuICBzZXQgdXJsKHZhbHVlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdBYnN0cmFjdCBtZXRob2QuIE92ZXJyaWRlJyk7XG4gIH0sXG5cbiAgX2NoYW5nZVRvOiBmdW5jdGlvbih1cmwpIHtcbiAgICB0aGlzLmN1cnJlbnRVcmwgPSB1cmw7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnY2hhbmdlJywgeyBkZXRhaWw6IHsgdXJsOiB1cmwgfX0pKTtcbiAgfSxcblxuICBfaGFuZGxlQ2hhbmdlOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdXJsID0gdGhpcy51cmw7XG4gICAgaWYgKHRoaXMuY3VycmVudFVybCAhPT0gdXJsKSB7XG4gICAgICB0aGlzLl9jaGFuZ2VUbyh1cmwpO1xuICAgIH1cbiAgfVxufSk7XG5cblB1c2hMb2NhdGlvbiA9IHJlcXVpcmUoJy4vcHVzaC1sb2NhdGlvbicpO1xuSGFzaExvY2F0aW9uID0gcmVxdWlyZSgnLi9oYXNoLWxvY2F0aW9uJyk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFB1c2hMb2NhdGlvbjtcbnZhciBMb2NhdGlvbiA9IHJlcXVpcmUoJy4vbG9jYXRpb24nKTtcbnZhciB1cmlQYXJ0cyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcblxuLy8gTG9jYXRpb24gaW1wbGVtZW50YXRpb24gZm9yIHVzaW5nIHB1c2hTdGF0ZVxuZnVuY3Rpb24gUHVzaExvY2F0aW9uKCkge1xuICBMb2NhdGlvbi5jYWxsKHRoaXMpO1xufVxuXG5Mb2NhdGlvbi5leHRlbmQoUHVzaExvY2F0aW9uLCB7XG4gIHN0YXRpYzoge1xuICAgIGdldCBzdXBwb3J0ZWQoKSB7XG4gICAgICByZXR1cm4gd2luZG93Lmhpc3RvcnkgJiYgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlICYmIHRydWU7XG4gICAgfVxuICB9LFxuXG4gIGhpc3RvcnlFdmVudE5hbWU6ICdwb3BzdGF0ZScsXG5cbiAgZ2V0IHVybCgpIHtcbiAgICByZXR1cm4gbG9jYXRpb24uaHJlZi5yZXBsYWNlKHRoaXMuYmFzZVVSSSwgJycpLnNwbGl0KCcjJykuc2hpZnQoKTtcbiAgfSxcblxuICBzZXQgdXJsKHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlLmNoYXJBdCgwKSA9PT0gJy4nIHx8IHZhbHVlLnNwbGl0KCcvLycpLmxlbmd0aCA+IDEpIHtcbiAgICAgIHZhbHVlID0gdGhpcy5nZXRSZWxhdGl2ZVVybCh2YWx1ZSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY3VycmVudFVybCAhPT0gdmFsdWUpIHtcbiAgICAgIGhpc3RvcnkucHVzaFN0YXRlKHt9LCAnJywgdmFsdWUpO1xuICAgICAgLy8gTWFudWFsbHkgY2hhbmdlIHNpbmNlIG5vIGV2ZW50IGlzIGRpc3BhdGNoZWQgd2hlbiB1c2luZyBwdXNoU3RhdGUvcmVwbGFjZVN0YXRlXG4gICAgICB0aGlzLl9jaGFuZ2VUbyh2YWx1ZSk7XG4gICAgfVxuICB9XG59KTtcbiIsIm1vZHVsZS5leHBvcnRzID0gUm91dGU7XG52YXIgQ2xhc3MgPSByZXF1aXJlKCdjaGlwLXV0aWxzL2NsYXNzJyk7XG5cbi8vIERlZmluZXMgYSBjZW50cmFsIHJvdXRpbmcgb2JqZWN0IHdoaWNoIGhhbmRsZXMgYWxsIFVSTCBjaGFuZ2VzIGFuZCByb3V0ZXMuXG5mdW5jdGlvbiBSb3V0ZShwYXRoLCBjYWxsYmFjaykge1xuICB0aGlzLnBhdGggPSBwYXRoO1xuICB0aGlzLmNhbGxiYWNrID0gY2FsbGJhY2s7XG4gIHRoaXMua2V5cyA9IFtdO1xuICB0aGlzLmV4cHIgPSBwYXJzZVBhdGgocGF0aCwgdGhpcy5rZXlzKTtcbiAgdGhpcy5oYW5kbGUgPSB0aGlzLmhhbmRsZS5iaW5kKHRoaXMpO1xufVxuXG5cbi8vIERldGVybWluZXMgd2hldGhlciByb3V0ZSBtYXRjaGVzIHBhdGhcbkNsYXNzLmV4dGVuZChSb3V0ZSwge1xuXG4gIG1hdGNoOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgaWYgKHRoaXMuZXhwci50ZXN0KHBhdGgpKSB7XG4gICAgICAvLyBjYWNoZSB0aGlzIG9uIG1hdGNoIHNvIHdlIGRvbid0IHJlY2FsY3VsYXRlIG11bHRpcGxlIHRpbWVzXG4gICAgICB0aGlzLnBhcmFtcyA9IHRoaXMuZ2V0UGFyYW1zKHBhdGgpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH0sXG5cbiAgZ2V0UGFyYW1zOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgdmFyIHBhcmFtcyA9IHt9O1xuICAgIHZhciBtYXRjaCA9IHRoaXMuZXhwci5leGVjKHBhdGgpO1xuICAgIGlmICghbWF0Y2gpIHtcbiAgICAgIHJldHVybiBwYXJhbXM7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBtYXRjaC5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGtleSA9IHRoaXMua2V5c1tpIC0gMV0gfHwgJyonO1xuICAgICAgdmFyIHZhbHVlID0gbWF0Y2hbaV07XG4gICAgICBwYXJhbXNba2V5XSA9IGRlY29kZVVSSUNvbXBvbmVudCh2YWx1ZSB8fCAnJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHBhcmFtcztcbiAgfSxcblxuICBoYW5kbGU6IGZ1bmN0aW9uKHJlcSwgZG9uZSkge1xuICAgIHJlcS5wYXJhbXMgPSB0aGlzLnBhcmFtcyB8fCB0aGlzLmdldFBhcmFtcyhyZXEucGF0aCk7XG4gICAgdGhpcy5jYWxsYmFjayhyZXEsIGRvbmUpO1xuICB9XG59KTtcblxuXG4vLyBOb3JtYWxpemVzIHRoZSBnaXZlbiBwYXRoIHN0cmluZywgcmV0dXJuaW5nIGEgcmVndWxhciBleHByZXNzaW9uLlxuLy9cbi8vIEFuIGVtcHR5IGFycmF5IHNob3VsZCBiZSBwYXNzZWQsIHdoaWNoIHdpbGwgY29udGFpbiB0aGUgcGxhY2Vob2xkZXIga2V5IG5hbWVzLiBGb3IgZXhhbXBsZSBgXCIvdXNlci86aWRcImAgd2lsbCB0aGVuXG4vLyBjb250YWluIGBbXCJpZFwiXWAuXG5mdW5jdGlvbiBwYXJzZVBhdGgocGF0aCwga2V5cykge1xuICBpZiAocGF0aCBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgIHJldHVybiBwYXRoO1xuICB9XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkocGF0aCkpIHtcbiAgICBwYXRoID0gJygnICsgcGF0aC5qb2luKCd8JykgKyAnKSc7XG4gIH1cblxuICBwYXRoID0gcGF0aFxuICAgIC5jb25jYXQoJy8/JylcbiAgICAucmVwbGFjZSgvXFwvXFwoL2csICcoPzovJylcbiAgICAucmVwbGFjZSgvKFxcLyk/KFxcLik/OihcXHcrKSg/OihcXCguKj9cXCkpKT8oXFw/KT8oXFwqKT8vZywgZnVuY3Rpb24oXywgc2xhc2gsIGZvcm1hdCwga2V5LCBjYXB0dXJlLCBvcHRpb25hbCwgc3Rhcikge1xuICAgICAga2V5cy5wdXNoKGtleSk7XG4gICAgICBzbGFzaCA9IHNsYXNoIHx8ICcnO1xuICAgICAgdmFyIGV4cHIgPSAnJztcbiAgICAgIGlmICghb3B0aW9uYWwpIGV4cHIgKz0gc2xhc2g7XG4gICAgICBleHByICs9ICcoPzonO1xuICAgICAgaWYgKG9wdGlvbmFsKSBleHByICs9IHNsYXNoO1xuICAgICAgZXhwciArPSBmb3JtYXQgfHwgJyc7XG4gICAgICBleHByICs9IGNhcHR1cmUgfHwgKGZvcm1hdCAmJiAnKFteLy5dKz8pJyB8fCAnKFteL10rPyknKSArICcpJztcbiAgICAgIGV4cHIgKz0gb3B0aW9uYWwgfHwgJyc7XG4gICAgICBpZiAoc3RhcikgZXhwciArPSAnKC8qKT8nO1xuICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfSlcbiAgICAucmVwbGFjZSgvKFtcXC8uXSkvZywgJ1xcXFwkMScpXG4gICAgLnJlcGxhY2UoL1xcKFxcXFxcXC9cXCpcXCkvZywgJygvLiopJykgLy8gcmVwbGFjZSB0aGUgKFxcLyopPyB3aXRoIChcXC8uKik/XG4gICAgLnJlcGxhY2UoL1xcKig/IVxcKSkvZywgJyguKiknKTsgLy8gYW55IG90aGVyICogdG8gKC4qKVxuICByZXR1cm4gbmV3IFJlZ0V4cCgnXicgKyBwYXRoICsgJyQnLCAnaScpO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBSb3V0ZXI7XG52YXIgUm91dGUgPSByZXF1aXJlKCcuL3JvdXRlJyk7XG52YXIgRXZlbnRUYXJnZXQgPSByZXF1aXJlKCdjaGlwLXV0aWxzL2V2ZW50LXRhcmdldCcpO1xudmFyIExvY2F0aW9uID0gcmVxdWlyZSgnLi9sb2NhdGlvbicpO1xuXG5cbi8vIFdvcmsgaW5zcGlyZWQgYnkgYW5kIGluIHNvbWUgY2FzZXMgYmFzZWQgb2ZmIG9mIHdvcmsgZG9uZSBmb3IgRXhwcmVzcy5qcyAoaHR0cHM6Ly9naXRodWIuY29tL3Zpc2lvbm1lZGlhL2V4cHJlc3MpXG4vLyBFdmVudHM6IGVycm9yLCBjaGFuZ2VcbmZ1bmN0aW9uIFJvdXRlcihvcHRpb25zKSB7XG4gIEV2ZW50VGFyZ2V0LmNhbGwodGhpcyk7XG4gIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHRoaXMucm91dGVzID0gW107XG4gIHRoaXMucGFyYW1zID0ge307XG4gIHRoaXMucGFyYW1zRXhwID0ge307XG4gIHRoaXMucm91dGVzLmJ5UGF0aCA9IHt9O1xuICB0aGlzLmxvY2F0aW9uID0gTG9jYXRpb24uY3JlYXRlKHRoaXMub3B0aW9ucyk7XG4gIHRoaXMub25VcmxDaGFuZ2UgPSB0aGlzLm9uVXJsQ2hhbmdlLmJpbmQodGhpcyk7XG59XG5cblxuRXZlbnRUYXJnZXQuZXh0ZW5kKFJvdXRlciwge1xuXG4gIC8vIFJlZ2lzdGVycyBhIGBjYWxsYmFja2AgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdoZW4gdGhlIGdpdmVuIHBhcmFtIGBuYW1lYCBpcyBtYXRjaGVkIGluIGEgVVJMXG4gIHBhcmFtOiBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaykge1xuICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICh0aGlzLnBhcmFtc1tuYW1lXSB8fCAodGhpcy5wYXJhbXNbbmFtZV0gPSBbXSkpLnB1c2goY2FsbGJhY2spO1xuICAgIH0gZWxzZSBpZiAoY2FsbGJhY2sgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgIHRoaXMucGFyYW1zRXhwW25hbWVdID0gY2FsbGJhY2s7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3BhcmFtIG11c3QgaGF2ZSBhIGNhbGxiYWNrIG9mIHR5cGUgXCJmdW5jdGlvblwiIG9yIFJlZ0V4cC4gR290ICcgKyBjYWxsYmFjayArICcuJyk7XG4gICAgfVxuICB9LFxuXG5cbiAgLy8gUmVnaXN0ZXJzIGEgYGNhbGxiYWNrYCBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2hlbiB0aGUgZ2l2ZW4gcGF0aCBtYXRjaGVzIGEgVVJMLiBUaGUgY2FsbGJhY2sgcmVjZWl2ZXMgdHdvXG4gIC8vIGFyZ3VtZW50cywgYHJlcWAsIGFuZCBgbmV4dGAsIHdoZXJlIGByZXFgIHJlcHJlc2VudHMgdGhlIHJlcXVlc3QgYW5kIGhhcyB0aGUgcHJvcGVydGllcywgYHVybGAsIGBwYXRoYCwgYHBhcmFtc2BcbiAgLy8gYW5kIGBxdWVyeWAuIGByZXEucGFyYW1zYCBpcyBhbiBvYmplY3Qgd2l0aCB0aGUgcGFyYW1ldGVycyBmcm9tIHRoZSBwYXRoIChlLmcuIC86dXNlcm5hbWUvKiB3b3VsZCBtYWtlIGEgcGFyYW1zXG4gIC8vIG9iamVjdCB3aXRoIHR3byBwcm9wZXJ0aWVzLCBgdXNlcm5hbWVgIGFuZCBgKmApLiBgcmVxLnF1ZXJ5YCBpcyBhbiBvYmplY3Qgd2l0aCBrZXktdmFsdWUgcGFpcnMgZnJvbSB0aGUgcXVlcnlcbiAgLy8gcG9ydGlvbiBvZiB0aGUgVVJMLlxuICByb3V0ZTogZnVuY3Rpb24ocGF0aCwgY2FsbGJhY2spIHtcbiAgICBpZiAodHlwZW9mIGNhbGxiYWNrICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdyb3V0ZSBtdXN0IGhhdmUgYSBjYWxsYmFjayBvZiB0eXBlIFwiZnVuY3Rpb25cIi4gR290ICcgKyBjYWxsYmFjayArICcuJyk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJyAmJiBwYXRoWzBdICE9PSAnLycpIHtcbiAgICAgIHBhdGggPSAnLycgKyBwYXRoO1xuICAgIH1cbiAgICB0aGlzLnJvdXRlcy5wdXNoKG5ldyBSb3V0ZShwYXRoLCBjYWxsYmFjaykpO1xuICB9LFxuXG5cbiAgcmVtb3ZlUm91dGU6IGZ1bmN0aW9uKHBhdGgsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMucm91dGVzLnNvbWUoZnVuY3Rpb24ocm91dGUsIGluZGV4KSB7XG4gICAgICBpZiAocm91dGUucGF0aCA9PT0gcGF0aCAmJiByb3V0ZS5jYWxsYmFjayA9PT0gY2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5yb3V0ZXMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cblxuICByZWRpcmVjdDogZnVuY3Rpb24odXJsKSB7XG4gICAgdmFyIG5vdEZvdW5kID0gZmFsc2U7XG4gICAgZnVuY3Rpb24gZXJySGFuZGxlcihldmVudCkge1xuICAgICAgbm90Rm91bmQgPSAoZXZlbnQuZGV0YWlsID09PSAnbm90Rm91bmQnKTtcbiAgICB9XG4gICAgdGhpcy5vbignZXJyb3InLCBlcnJIYW5kbGVyKTtcblxuICAgIHRoaXMubG9jYXRpb24udXJsID0gdXJsO1xuXG4gICAgdGhpcy5vZmYoJ2Vycm9yJywgZXJySGFuZGxlcik7XG4gICAgcmV0dXJuICFub3RGb3VuZDtcbiAgfSxcblxuXG4gIGxpc3RlbjogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5sb2NhdGlvbi5vbignY2hhbmdlJywgdGhpcy5vblVybENoYW5nZSk7XG4gIH0sXG5cblxuICBzdG9wOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmxvY2F0aW9uLm9mZignY2hhbmdlJywgdGhpcy5vblVybENoYW5nZSk7XG4gIH0sXG5cblxuICBnZXRSb3V0ZXNNYXRjaGluZ1BhdGg6IGZ1bmN0aW9uKHVybCkge1xuICAgIGlmICh1cmwgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICB2YXIgcGF0aCA9IHRoaXMubG9jYXRpb24uZ2V0UGF0aCh1cmwpO1xuICAgIHZhciBwYXJhbXNFeHAgPSB0aGlzLnBhcmFtc0V4cDtcblxuICAgIHJldHVybiB0aGlzLnJvdXRlcy5maWx0ZXIoZnVuY3Rpb24ocm91dGUpIHtcbiAgICAgIGlmICghcm91dGUubWF0Y2gocGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICB2YXIgcGFyYW1zID0gcm91dGUuZ2V0UGFyYW1zKHBhdGgpO1xuICAgICAgcmV0dXJuIHJvdXRlLmtleXMuZXZlcnkoZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHBhcmFtc1trZXldO1xuICAgICAgICByZXR1cm4gIXBhcmFtc0V4cC5oYXNPd25Qcm9wZXJ0eShrZXkpIHx8ICh2YWx1ZSAmJiBwYXJhbXNFeHBba2V5XS50ZXN0KHZhbHVlKSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSxcblxuXG4gIG9uVXJsQ2hhbmdlOiBmdW5jdGlvbihldmVudCkge1xuICAgIHZhciB1cmxQYXJ0cyA9IGV2ZW50LmRldGFpbC51cmwuc3BsaXQoJz8nKTtcbiAgICB2YXIgcGF0aCA9IHVybFBhcnRzLnNoaWZ0KCk7XG4gICAgdmFyIHF1ZXJ5ID0gdXJsUGFydHMuam9pbignPycpO1xuICAgIHZhciByZXEgPSB7IHVybDogZXZlbnQuZGV0YWlsLnVybCwgcGF0aDogcGF0aCwgcXVlcnk6IHBhcnNlUXVlcnkocXVlcnkpIH07XG4gICAgdmFyIHBhcmFtc0NhbGxlZCA9IHt9O1xuXG4gICAgdmFyIGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KCdjaGFuZ2luZycsIHsgZGV0YWlsOiByZXEsIGNhbmNlbGFibGU6IHRydWUgfSk7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICBpZiAoZXZlbnQuZGVmYXVsdFByZXZlbnRlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2NoYW5nZScsIHsgZGV0YWlsOiByZXEgfSkpO1xuICAgIHZhciByb3V0ZXMgPSB0aGlzLmdldFJvdXRlc01hdGNoaW5nUGF0aChwYXRoKTtcbiAgICB2YXIgY2FsbGJhY2tzID0gW107XG4gICAgdmFyIGhhbmRsZWRQYXJhbXMgPSB7fTtcbiAgICB2YXIgcm91dGVyID0gdGhpcztcblxuICAgIC8vIEFkZCBhbGwgdGhlIGNhbGxiYWNrcyBmb3IgdGhpcyBVUkwgKGFsbCBtYXRjaGluZyByb3V0ZXMgYW5kIHRoZSBwYXJhbXMgdGhleSdyZSBkZXBlbmRlbnQgb24pXG4gICAgcm91dGVzLmZvckVhY2goZnVuY3Rpb24ocm91dGUpIHtcbiAgICAgIC8vIEFkZCBwYXJhbSBjYWxsYmFja3Mgd2hlbiB0aGV5IGV4aXN0XG4gICAgICByb3V0ZS5rZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIGlmIChyb3V0ZXIucGFyYW1zLmhhc093blByb3BlcnR5KGtleSkgJiYgIWhhbmRsZWRQYXJhbXMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIGhhbmRsZWRQYXJhbXNba2V5XSA9IHRydWU7XG4gICAgICAgICAgdmFyIHZhbHVlID0gcm91dGUucGFyYW1zW2tleV07XG4gICAgICAgICAgcm91dGVyLnBhcmFtc1trZXldLmZvckVhY2goZnVuY3Rpb24ocGFyYW1DYWxsYmFjaykge1xuICAgICAgICAgICAgY2FsbGJhY2tzLnB1c2goZnVuY3Rpb24ocmVxLCBuZXh0KSB7XG4gICAgICAgICAgICAgIHBhcmFtQ2FsbGJhY2socmVxLCBuZXh0LCB2YWx1ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIC8vIEFkZCByb3V0ZSBjYWxsYmFja1xuICAgICAgY2FsbGJhY2tzLnB1c2gocm91dGUuaGFuZGxlKTtcbiAgICB9LCB0aGlzKTtcblxuICAgIC8vIENhbGxzIGVhY2ggY2FsbGJhY2sgb25lIGJ5IG9uZSB1bnRpbCBlaXRoZXIgdGhlcmUgaXMgYW4gZXJyb3Igb3Igd2UgY2FsbCBhbGwgb2YgdGhlbS5cbiAgICB2YXIgbmV4dCA9IGZ1bmN0aW9uKGVycikge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICByb3V0ZXIuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2Vycm9yJywgeyBkZXRhaWw6IGVyciB9KSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKCFjYWxsYmFja3MubGVuZ3RoKSByZXR1cm4gbmV4dCgnbm90Rm91bmQnKTtcbiAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2tzLnNoaWZ0KCk7XG4gICAgICBjYWxsYmFjayhyZXEsIG5leHQpO1xuICAgIH07XG5cbiAgICAvLyBTdGFydCBydW5uaW5nIHRoZSBjYWxsYmFja3MsIG9uZSBieSBvbmVcbiAgICBuZXh0KCk7XG4gIH1cblxufSk7XG5cblxuLy8gUGFyc2VzIGEgbG9jYXRpb24uc2VhcmNoIHN0cmluZyBpbnRvIGFuIG9iamVjdCB3aXRoIGtleS12YWx1ZSBwYWlycy5cbmZ1bmN0aW9uIHBhcnNlUXVlcnkoc2VhcmNoKSB7XG4gIHZhciBxdWVyeSA9IHt9O1xuICBpZiAoc2VhcmNoID09PSAnJykge1xuICAgIHJldHVybiBxdWVyeTtcbiAgfVxuXG4gIHNlYXJjaC5yZXBsYWNlKC9eXFw/LywgJycpLnNwbGl0KCcmJykuZm9yRWFjaChmdW5jdGlvbihrZXlWYWx1ZSkge1xuICAgIHZhciBwYXJ0cyA9IGtleVZhbHVlLnNwbGl0KCc9Jyk7XG4gICAgdmFyIGtleSA9IHBhcnRzWzBdO1xuICAgIHZhciB2YWx1ZSA9IHBhcnRzWzFdO1xuICAgIHF1ZXJ5W2RlY29kZVVSSUNvbXBvbmVudChrZXkpXSA9IGRlY29kZVVSSUNvbXBvbmVudCh2YWx1ZSk7XG4gIH0pO1xuXG4gIHJldHVybiBxdWVyeTtcbn1cbiJdfQ==
