# # Chip Controller

# A Controller is the object to which HTML elements are bound.
class Controller
  
  constructor: ->
    # Creates the observer array so child controllers don't inherit this from parents 
    @_observers = []
    @_children = []
    @_syncListeners = []
    @_closed = false
  
  # Watches an expression for changes. Calls the `callback` immediately with the initial value and then every time
  # the value in the expression changes. An expression can be as simple as `name` or as complex as
  # `user.firstName + ' ' + user.lastName + ' - ' + user.getPostfix()`
  watch: (expr, skipTriggerImmediately, callback) ->
    if Array.isArray(expr)
      if typeof skipTriggerImmediately is 'function'
        callback = skipTriggerImmediately
        skipTriggerImmediately = false

      origCallback = callback
      calledThisRound = false
      # with multiple observers, only call the original callback once on change
      callback = ->
        return if calledThisRound
        calledThisRound = true
        setTimeout -> calledThisRound = false
        values = observers.map (observer) -> observer.getter()
        origCallback values...

      observers = expr.map (expr) =>
        @watch(expr, true, callback)
      
      unless skipTriggerImmediately
        callback()
      
      return observers
    
    if typeof expr is 'function'
      getter = expr
    else
      getter = expression.bind(expr, this)
    
    # Store the observers with the controller so when it is closed we can clean up all observers as well
    observer = Observer.add getter, skipTriggerImmediately, callback
    observer.expr = expr
    @_observers.push observer
    observer
  
  # Stop watching an expression for changes.
  unwatch: (expr, callback) ->
    @_observers.some (observer, index) =>
      if observer.expr is expr and observer.callback is callback
        observer.close()
        @_observers.splice index, 1
        true
      else
        false
  
  # Evaluates an expression immediately, returning the result
  eval: (expr, args) ->
    if args
      options = args: Object.keys(args)
      values = options.args.map (key) -> args[key]
    expression.get(expr, options).apply(this, values)
  
  # Evaluates an expression immediately as a setter, setting `value` to the expression running through filters.
  evalSetter: (expr, value) ->
    return @passthrough().evalSetter(expr, value) if @passthrough() isnt this
    expr = expr.replace(/(\s*\||$)/, ' = value$1')
    expression.get(expr, args: ['value']).call(this, value)
  
  
  # Creates a bound function which can be called any time to evaluate the expession. `extraArgNames` can be provided
  # to provide for additional data to be passed into the returned function.
  #
  # **Example:**
  #```javascript
  # var expr = 'name = firstName + \' \' + lastName'
  # var setName = controller.getBoundEval(expr, 'firstName', 'lastName')
  # setName('Jacob', 'Wright')
  # console.log(controller.name) // equals "Jacob Wright"
  # ```
  getBoundEval: (expr, extraArgNames...) ->
    expression.bind(expr, this, args: extraArgNames)
  
  
  # Redirects to the provided URL
  redirect: (url, replace = false) ->
    @app.redirect(url, replace)
    this
  
  
  # Clones the object at the given property name for processing forms
  cloneValue: (property) ->
    diff.clone @[property]
  
  
  # Removes and closes all observers for garbage-collection 
  closeController: ->
    return if @_closed
    @_closed = true
    
    for child in @_children
      child.parent = null
      child.closeController()
    if @parent?._children
      @parent._children.remove this

    @beforeClose() if @hasOwnProperty('beforeClose')
    if @_syncListeners
      for listener in @_syncListeners
        Observer.removeOnSync listener
      delete @_syncListeners

    for observer in @_observers
      observer.close()
    @_observers.length = 0
    @onClose() if @hasOwnProperty('onClose')
    return
  
  
  # Syncs the observers to propogate changes to the HTML, call callback after
  sync: (callback) ->
    Observer.sync(callback)
    this
  
  
  # Runs the sync on the next tick, call callback after
  syncLater: (callback) ->
    Observer.syncLater(callback)
    this
  
  
  # Syncs the observers to propogate changes to the HTML for this controller only
  syncThis: ->
    @_observers.forEach (observer) ->
      observer.sync()
    @_children.forEach (child) ->
      child.syncThis()
    this

  
  # call callback after the current sync
  afterSync: (callback) ->
    Observer.afterSync callback
    this
  
  
  # Runs the listener on every sync, stops once the controller is closed
  onSync: (listener) ->
    @_syncListeners.push listener
    Observer.onSync(listener)
    this
  
  
  # Removes a sync listener
  removeOnSync: (listener) ->
    index = @_syncListeners.indexOf listener
    @_syncListeners.splice(index, 1) unless index is -1
    Observer.removeOnSync(listener)
    this
  
  
  passthrough: (value) ->
    if arguments.length
      @_passthrough = value
    else
      if @hasOwnProperty('_passthrough') then @_passthrough else this


# jQuery plugin to get the controller for the given element
$.fn.controller = (passthrough) ->
  element = this
  while element.length
    controller = element.data('controller')
    if controller
      return if passthrough then controller.passthrough() else controller
    element = element.parent()
  null


# Provides the 'remove' event to be dispatched when an element is removed from the DOM and cleaned up. Gets
# called when an element with the event 'remove', is removed from the DOM. Manually call the listener.
unless $.widget
  $.cleanData = ((orig) ->
    (elems) ->
      for elem in elems
        try
          $(elem).triggerHandler('remove')
        catch e
      orig elems
  )($.cleanData)


chip.Controller = Controller
