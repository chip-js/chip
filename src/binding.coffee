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
  # Binding.addBinding('my-pirate', function(element, expr, controller) {
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
  # <p my-pirate="post.body">This text will be replaced.</p>
  # ```
  @addBinding: (name, options, handler) ->
    if typeof options is 'function'
      handler = options
      options = {}
    else unless options
      options = {}

    entry =
      name: options.name or name
      priority: options.priority or 0
      keepAttribute: options.keepAttribute
      handler: handler
    @bindings[name] = entry
    @bindings.push entry
    
    @bindings.sort bindingSort
    entry
  

  # Returns a binding object that was added with `addBinding()`.
  @getBinding: (name) ->
    @bindings[name] if @bindings.hasOwnProperty(name)

  
  # Removes a binding handler that was added with `addBinding()`.
  # 
  # **Example:**
  # ```javascript
  # Binding.removeBinding('pirate')
  # ```
  # 
  # ```xml
  # <p my-pirate="post.body">This text will not be replaced.</p>
  # ```
  @removeBinding: (name) ->
    entry = @getBinding(name)
    return unless entry
    delete @bindings[name]
    @bindings.splice @bindings.indexOf(entry), 1
  
  
  # Shortcut, adds a handler that executes the expression when the named event is dispatched.
  #
  # **Example:** Handles the click event.
  #```javascript
  # Binding.addEventBinding('on-click')
  # ```
  # 
  # ```xml
  # <button on-click="window.alert('hello!')">Say Hello</button>
  #```
  @addEventBinding: (name, options) ->
    eventName = name.split('-').slice(1).join('-')
    @addBinding name, options, (element, attr, controller) ->
      expr = attr.value
      element.on eventName, (event) ->
        event.preventDefault()
        unless element.attr('disabled')
          controller.thisElement = element
          controller.eval expr
          delete controller.thisElement
  
  
  # Shortcut, adds a handler that responds when the given key is pressed, e.g. `Binding.addEventBinding('on-esc', 27)`.
  @addKeyEventBinding: (name, keyCode, ctrlKey, options) ->
    @addBinding name, options, (element, attr, controller) ->
      expr = attr.value
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
  # Binding.addAttributeBinding('attr-href')
  # ```
  # allows
  # ```xml
  # <a attr-href="'/profile/' + person.id">My Profile</a>
  # ```
  # which would result in
  # ```xml
  # <a href="/profile/368">My Profile</a>
  # ```
  @addAttributeBinding: (name, options) ->
    attrName = name.split('-').slice(1).join('-')
    @addBinding name, options, (element, attr, controller) ->
      expr = attr.value
      controller.watch expr, (value) ->
        if value?
          element.attr attrName, value
          element.trigger attrName + 'Changed'
        else
          element.removeAttr attrName
  
  
  # Shortcut, adds a handler to toggle an attribute on or off if the value of the expression is truthy or false,
  # e.g. `Binding.addAttributeToggleBinding('attr-checked')`.
  @addAttributeToggleBinding: (name, options) ->
    attrName = name.split('-').slice(1).join('-')
    @addBinding name, options, (element, attr, controller) ->
      expr = attr.value
      controller.watch expr, (value) ->
        element.prop attrName, value and true or false
  
  
  # Processes the bindings for the given jQuery element and all of its children.
  @process: (element, controller) ->
    unless controller instanceof Controller
      throw new Error 'A Controller is required to bind a jQuery element.'
    

    slice = Array::slice
    walker = new Walker element.get(0)
    processed = []
    walker.onElementDone = (node) ->
      if processed.length and processed[processed.length - 1].get(0) is node
        processed.pop().triggerHandler('processed')

    while node = walker.next()
      element = $ node if node isnt walker.root
      parentNode = node.parentNode
      
      # Finds binding attributes and sorts by priority.
      attributes = slice.call(node.attributes)
        .map(getBoundAttributes)
        .filter(filterAttributes)
        .sort(sortAttributes)

      processed.push element if attributes.length
      
      # Go through each binding attribute from first to last.
      while attributes.length
        attribute = attributes.shift()
        binding = attribute.binding
        
        # Remove the binding handlers so they only get processed once. This simplifies code and also
        # makes the DOM cleaner.
        unless binding.keepAttribute
          element.removeAttr(attribute.name)
        
        # Calls the handler function allowing the handler to set up the binding.
        if binding.name.slice(-2) is '-*'
          # Wildcard bindings get the camelcased name
          attribute.match = attribute.name.replace(binding.name.slice(0, -1), '')
          attribute.camel = attribute.match
            .replace /[-_]+(\w)/g, (_, char) -> char.toUpperCase()

        result = binding.handler element, attribute, controller
        
        # Stops processing of this element (and its children will be skipped) if the element was removed from the DOM.
        # This is used for bind-if and bind-each etc.
        if node.parentNode isnt parentNode
          processed.pop()
          break
        
        # If the binding returns false it signifies a new controller has taken over
        if result is false
          walker.skip()
          processed.pop()
          break

    element


getBoundAttributes = (attr) ->
  # If a binding is registered for the exact name or for prefix-* use that
  binding = Binding.getBinding(attr.name)
  unless binding
    parts = attr.name.split('-')
    while parts.length > 1
      parts.pop()
      break if (binding = Binding.getBinding(parts.join('-') + '-*'))
  unless binding
    if expression.isInverted attr.value
      binding = Binding.getBinding('attr-*')
  # Cache in an object since attr.value will empty once it is removed
  if binding
    binding: binding, name: attr.name, value: attr.value

filterAttributes = (binding) -> binding
sortAttributes = (a, b) -> b.binding.priority - a.binding.priority
bindingSort = (a, b) -> b.priority - a.priority


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
    if @current is null
      @current = @root
    else
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

