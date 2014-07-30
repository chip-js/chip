# # Chip Observer

# Defines an observer class which represents a bound `getter` function. Whenever that `getter` returns a new value the
# `callback` is called with the value.
# 
# If the old and new values were either an array or an object, the `callback` also
# receives an array of splices (for an array), or an array of change objects (for an object) which are the same
# format that `Array.observe` and `Object.observe` return <http://wiki.ecmascript.org/doku.php?id=harmony:observe>.
class Observer
  
  # An Observer should never be created with its constructor. Only through `Observer.add()`.
  constructor: (@getter, @callback, @oldValue) ->
  
  
  # Instructs this observer to not call its `callback` on the next sync, whether the value has changed or not
  skipNextSync: ->
    @skip = true
  
  
  # Syncs this observer now, calling the callback immediately if there have been changes
  sync: ->
    value = @getter()
    
    # Don't call the callback if `skipNextSync` was called on the observer
    if @skip
      delete @skip
    # If an array has changed calculate the splices and call the callback. This 
    else
      changed = diff.values value, @oldValue
      return unless changed
      if Array.isArray changed
        @callback(value, @oldValue, changed)
      else
        @callback(value, @oldValue)
    
    # Store an immutable version of the value, allowing for arrays and objects to change instance but not
    # content and still refrain from dispatching callbacks (e.g. when using an object in bind-class or when
    # using array filters in bind-each)
    @oldValue = diff.clone value
  
  
  # Closes the observer, stopping it from being run and allowing it to be garbage-collected
  close: ->
    Observer.remove this
  
  
  # An array of all observers, considered *private* 
  @observers: []

  # An array of callbacks to run after the next sync, considered *private* 
  @callbacks: []
  @listeners: []
  
  # Adds a new observer to be notified of changes. `getter` is a function which returns a value. `callback` is called
  # whenever `getter` returns a new value. `callback` is called with that value and perhaps splices or change records.
  # If `skipTriggerImmediately` is true then the callback will only be called when a change is made, not initially.
  #
  # **Example:**
  # ```javascript
  # var obj = {firstName: 'Jacob', lastName: 'Wright'}
  # var getter = function() {
  #   return this.firstName + ' ' + this.lastName
  # }.bind(obj)
  # 
  # Observer.add(getter, function(value) {
  #   $('#user-name').text(value)
  # })
  @add: (getter, skipTriggerImmediately, callback) ->
    if typeof skipTriggerImmediately is 'function'
      callback = skipTriggerImmediately
      skipTriggerImmediately = false
    
    value = getter()
    observer = new Observer getter, callback, diff.clone(value)
    @observers.push observer
    callback(value) unless skipTriggerImmediately
    observer
  
  # Removes an observer, stopping it from being run and allowing it to be garbage-collected
  @remove: (observer) ->
    index = @observers.indexOf(observer)
    if index isnt -1
      @observers.splice(index, 1)
      true
    else
      false
  
  # *private* properties used in the sync cycle
  @syncing: false
  @rerun: false
  @cycles: 0
  @max: 10
  @timeout: null
  
  # Runs the observer sync cycle which checks all the observers to see if they've changed. Pass in true for
  # `synchronous` to run the syncronization immediately rather than on the next code cycle.
  @sync: (callback) ->
    @afterSync(callback) if typeof callback is 'function'
    
    if @syncing
      @rerun = true
      return false
    
    @syncing = true
    @rerun = true
    @cycles = 0
    
    # Allow callbacks to run the sync cycle again immediately, but stop at `@max` (default 10) cycles to we don't
    # run infinite loops
    while @rerun
      throw 'Infinite observer syncing, an observer is calling Observer.sync() too many times' if ++@cycles is @max
      @rerun = false
      # because the observer array may increase or decrease in size during the sync we need to drop down to JavaScript
      `for (var i = 0; i < this.observers.length; i++) {
        this.observers[i].sync()
      }`
    
    @callbacks.shift()() while @callbacks.length
    listener() for listener in @listeners

    @syncing = false
    @cycles = 0
    return true

  @syncLater: (callback) ->
    unless @timeout
      @timeout = setTimeout =>
        @timeout = null
        @sync(callback)
      return true
    else
      return false

  # After the next sync (or the current if in the middle of one), run the provided callback
  @afterSync: (callback) ->
    throw new TypeError('callback must be a function') unless typeof callback is 'function'
    @callbacks.push callback

  @onSync: (listener) ->
    throw new TypeError('listener must be a function') unless typeof listener is 'function'
    @listeners.push listener

  @removeOnSync: (listener) ->
    throw new TypeError('listener must be a function') unless typeof listener is 'function'
    index = @listeners.indexOf listener
    @listeners.splice(index, 1).pop() unless index is -1


chip.Observer = Observer
