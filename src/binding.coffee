# # Chip Binding

# A Binding instance is created for each binding attribute in the DOM. Mostly the Binding class is used as a static
# place to register new bind handlers.
class Binding
  constructor: (@name, @expr) ->
  
  @bindings: []
  
  
  # Adds a binding handler that will be run for each attribute whose name matches `@prefix + name`. The `handler` is
  # a function that receives three arguments: the jQuery element the attribute was on, the value of the attribute
  # (usually an expression), and the controller for this area of the page.
  # 
  # If the handler removes the element from its parent (to store as a template for cloning into repeats or ifs) then
  # processing will stop on the element and its children immediately. This allows you to recurse into the element
  # with new controllers by using `element.bindTo(newChildController)`.
  # 
  # If a new controller is returned from the handler this controller will be used for the remaining handlers and the
  # children of the element.
  # 
  # The `priority` argument is optional and allows handlers with higher priority to be run before those with lower
  # priority. The default is `0`.
  # 
  # **Example:** This binding handler adds pirateized text to an element.
  # ```javascript
  # Binding.addBinding('pirate', function(element, expr, controller) {
  #   controller.watch(expr, function(value) {
  #     value = (value+'' || '')
  #       .replace(/\Bing\b/g, "in'")
  #       .replace(/\bto\b/g, "t'")
  #       .replace(/\byou\b/, 'ye')
  #       + ' arrrr!'
  #     element.text(value)
  #   }
  # })
  # ```
  # 
  # ```xml
  # <p chip-pirate="post.body">This text will be replaced.</p>
  # ```
  @addBinding: (name, priority, handler) ->
    if typeof priority is 'function'
      handler = priority
      priority = 0
    
    priority = priority or 0

    entry =
      name: name
      priority: priority
      handler: handler
    @bindings[name] = entry
    @bindings.push entry
    
    @bindings.sort (a, b) -> b.priority - a.priority
    entry
  
  
  # Removes a binding handler that was added with `addBinding()`.
  # 
  # **Example:**
  # ```javascript
  # Binding.removeBinding('pirate')
  # ```
  # 
  # ```xml
  # <p chip-pirate="post.body">This text will be replaced.</p>
  # ```
  @removeBinding: (name) ->
    entry = @bindings[name]
    return unless entry
    delete @bindings[name]
    @bindings.splice @bindings.indexOf(entry), 1
  
  
  # Shortcut, adds a handler that executes the expression when the named event is dispatched.
  #
  # **Example:** Handles the click event.
  #```javascript
  # Binding.addEventBinding('click')
  # ```
  # 
  # ```xml
  # <button chip-click="window.alert('hello!')">Say Hello</button>
  #```
  @addEventBinding: (eventName, priority) ->
    @addBinding eventName, priority, (element, expr, controller) ->
      element.on eventName, (event) ->
        event.preventDefault()
        unless element.attr('disabled')
          controller.thisElement = element
          controller.eval expr
          delete controller.thisElement
  
  
  # Shortcut, adds a handler that responds when the given key is pressed, e.g. `Binding.addEventBinding('esc', 27)`.
  @addKeyEventBinding: (name, keyCode, ctrlKey, priority) ->
    @addBinding name, priority, (element, expr, controller) ->
      element.on 'keydown', (event) ->
        return if ctrlKey? and (event.ctrlKey isnt ctrlKey and event.metaKey isnt ctrlKey)
        return unless event.keyCode is keyCode
        event.preventDefault()
        unless element.attr('disabled')
          controller.thisElement = element
          controller.eval expr
          delete controller.thisElement
  
  
  # Shortcut, adds a handler to set the named attribute to the value of the expression.
  # 
  # **Example**
  # ```javascript
  # Binding.addAttributeBinding('href')
  # ```
  # allows
  # ```xml
  # <a chip-href="'/profile/' + person.id">My Profile</a>
  # ```
  # which would result in
  # ```xml
  # <a href="/profile/368">My Profile</a>
  # ```
  @addAttributeBinding: (name, priority) ->
    @addBinding name, priority, (element, expr, controller) ->
      controller.watch expr, (value) ->
        if value?
          element.attr name, value
          element.trigger name + 'Changed'
        else
          element.removeAttr name
  
  
  # Shortcut, adds a handler to toggle an attribute on or off if the value of the expression is truthy or false,
  # e.g. `Binding.addAttributeToggleBinding('checked')`.
  @addAttributeToggleBinding: (name, priority) ->
    @addBinding name, priority, (element, expr, controller) ->
      controller.watch expr, (value) ->
        element.attr name, value and true or false
  
  
  # Processes the bindings for the given jQuery element and all of its children.
  @process: (element, controller) ->
    unless controller instanceof Controller
      throw new Error 'A Controller is required to bind a jQuery element.'
    

    prefix = controller.app.bindingPrefix
    slice = Array::slice
    walker = new Walker element.get(0)
    processed = []
    walker.onElementDone = (node) ->
      if processed.length and processed[processed.length - 1].get(0) is node
        processed.pop().trigger('processed')

    while node = walker.next()
      element = $ node
      parentNode = node.parentNode
      
      # Finds binding attributes and sorts by priority.
      attribs = slice.call(node.attributes).filter (attr) =>
        name = attr.name.replace(prefix, '')
        attr.name.indexOf(prefix) is 0 and
        ( @bindings[name] or prefix ) and
        attr.value isnt undefined # Fix for IE7
      
      attribs = attribs.map (attr) =>
        bindingName = attr.name.replace(prefix, '')
        console.log bindingName, 'missing' unless @bindings[bindingName]
        entry = @bindings[bindingName] or @addAttributeBinding(bindingName, -1)
        name: attr.name
        value: attr.value
        priority: entry.priority
        handler: entry.handler
        keepAttribute: entry.keepAttribute
      
      attribs = attribs.sort (a, b) ->
        b.priority - a.priority

      processed.push element if attribs.length
      
      # Go through each binding attribute from first to last.
      while attribs.length
        attr = attribs.shift()
        
        # Remove the binding handlers so they only get processed once. This simplifies code and also
        # makes the DOM cleaner.
        unless attr.keepAttribute
          element.removeAttr(attr.name)
        
        # Calls the handler function allowing the handler to set up the binding.
        attr.handler element, attr.value, controller
        
        # Stops processing of this element (and its children will be skipped) if the element was removed from the DOM.
        # This is used for chip-if and chip-each etc.
        if node.parentNode isnt parentNode
          processed.pop()
          break

    element
    


# Sets up the binding handlers for this jQuery element and all of its descendants
jQuery.fn.bindTo = (controller) ->
  if this.length isnt 0
    Binding.process(this, controller)


chip.Binding = Binding




class Walker
  constructor: (@root) ->
    @current = null

  # A callback to do additional things when a node and it's children are done
  onElementDone: ->
    
  # Get the next element and process it
  next: ->
    return @current = @root if @current is null
    @current = @placeholder if @current isnt @root and @current.parentNode is null
    @current = @traverse @current
    # Save a placeholder for when a node is removed from the DOM so we can continue walking
    if @current
      @placeholder =
        parentNode: @current.parentNode
        nextElementSibling: @current.nextElementSibling
    else
      @placeholder = null
      @onElementDone @root
    @current

  traverse: (node) ->
    if node.nodeType
      child = node.firstElementChild
      return child if child

    while (node isnt null)
      @onElementDone node if node.nodeType
      return null if node is @root
      sibling = node.nextElementSibling
      return sibling if sibling
      node = node.parentNode
    node

  # Skip over the current element (don't walk its children) on next call to next()
  skip: ->
    @current = @placeholder

