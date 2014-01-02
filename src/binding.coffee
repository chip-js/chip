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
	# <p data-pirate="post.body">This text will be replaced.</p>
	# ```
	@addBinding: (name, priority, handler) ->
		if typeof priority is 'function'
			handler = priority
			priority = 0
		
		entry =
			name: name
			priority: priority
			handler: handler
		@bindings[name] = entry
		@bindings.push entry
		
		@bindings.sort (a, b) -> b.priority - a.priority
	
	
	# Removes a binding handler that was added with `addBinding()`.
	# 
	# **Example:**
	# ```javascript
	# Binding.removeBinding('pirate')
	# ```
	# 
	# ```xml
	# <p data-pirate="post.body">This text will be replaced.</p>
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
	# <button data-click="window.alert('hello!')">Say Hello</button>
	#```
	@addEventBinding: (eventName) ->
		@addBinding eventName, (element, expr, controller) ->
			element.on eventName, (event) ->
				event.preventDefault()
				controller.eval expr
	
	
	# Shortcut, adds a handler that responds when the given key is pressed, e.g. `Binding.addEventBinding('esc', 27)`.
	@addKeyEventBinding: (name, keyCode, ctrlKey) ->
		@addBinding name, (element, expr, controller) ->
			element.on 'keydown', (event) ->
				return if ctrlKey? and (event.ctrlKey isnt ctrlKey and event.metaKey isnt ctrlKey)
				return unless event.keyCode is keyCode
				event.preventDefault()
				controller.eval expr
	
	
	# Shortcut, adds a handler to set the named attribute to the value of the expression.
	# 
	# **Example**
	# ```javascript
	# Binding.addAttributeBinding('href')
	# ```
	# allows
	# ```xml
	# <a data-href="'/profile/' + person.id">My Profile</a>
	# ```
	# which would result in
	# ```xml
	# <a href="/profile/368">My Profile</a>
	# ```
	@addAttributeBinding: (name) ->
		@addBinding name, (element, expr, controller) ->
			controller.watch expr, (value) ->
				if value?
					element.attr name, value
					element.trigger name + 'Changed'
				else
					element.removeAttr name
	
	
	# Shortcut, adds a handler to toggle an attribute on or off if the value of the expression is truthy or false,
	# e.g. `Binding.addAttributeToggleBinding('checked')`.
	@addAttributeToggleBinding: (name) ->
		@addBinding name, (element, expr, controller) ->
			controller.watch expr, (value) ->
				element.prop name, value or false
	
	
	# Processes the bindings for the given jQuery element and all of its children.
	@process: (element, controller) ->
		unless controller instanceof Controller
			throw new Error 'A Controller is required to bind a jQuery element.'
		
		node = element.get(0)
		parentNode = node.parentNode
		prefix = controller.app.bindingPrefix
		
		# Finds binding attributes and sorts by priority.
		attribs = $(node.attributes).toArray().filter (attr) =>
			attr.name.indexOf(prefix) is 0 and
				@bindings[attr.name.replace(prefix, '')] and
				attr.value isnt undefined # Fix for IE7
		
		attribs = attribs.map (attr) =>
			entry = @bindings[attr.name.replace(prefix, '')]
			name: attr.name
			value: attr.value
			priority: entry.priority
			handler: entry.handler
		
		attribs = attribs.sort (a, b) ->
			b.priority - a.priority
		
		# Go through each binding attribute from first to last.
		while attribs.length
			attr = attribs.shift()
			
			# Don't re-process if it has been removed. Could happen if one handler uses another and removes it.
			continue unless node.hasAttribute attr.name
			
			# Remove the binding handlers so they only get processed once. This simplifies our code, but it also
			# makes the DOM cleaner.
			node.removeAttribute(attr.name)
			
			# Calls the handler function allowing the handler to set up the binding.
			newController = attr.handler element, attr.value, controller
			
			# Stops processing if the element was removed from the DOM. data-if and data-repeat for example.
			return if node.parentNode isnt parentNode
			
			# Sets controller to new controller if a new controller has been defined by a handler.
			if newController instanceof Controller
				controller = newController
		
		# Processes the children of this element after the element has been processed.
		element.children().each (index, child) =>
			@process $(child), controller
	


# Sets up the binding handlers for this jQuery element and all of its descendants
jQuery.fn.bindTo = (controller) ->
	if this.length isnt 0
		Binding.process(this, controller)


chip.Binding = Binding
