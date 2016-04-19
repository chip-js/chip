
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
