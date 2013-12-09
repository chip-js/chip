# # Chip Binding

# A Binding instance is created for each binding attribute in the DOM. Mostly the Binding class is used as a static
# place to register new bind handlers.
class Binding
	constructor: (@name, @expr) ->
	
	
	# The attribute prefix for all binding attributes. This is the default and may be changed.
	@prefix: 'data-'
	@handlers: []
	
	
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
	# Binding.addHandler('pirate', function(element, expr, controller) {
	#   controller.watch(expr, function(value) {
	#     value = (value+'' || '')
	#       .replace(/\Bing\b/g, "in'")
	#       .replace(/\bto\b/g, "t'")
	#       .replace(/\byou\b/, 'ye')
	#       + ' arrrr!'
	#     element.text(value)
	#   }
	# }
	# ```
	# 
	# ```xml
	# <p data-pirate="post.body">This text will be replaced.</p>
	# ```
	@addHandler: (name, priority, handler) ->
		if typeof priority is 'function'
			handler = priority
			priority = 0
		
		entry =
			name: name
			priority: priority
			handler: handler
		@handlers[name] = entry
		@handlers.push entry
		
		@handlers.sort (a, b) -> b.priority - a.priority
	
	
	# Shortcut, adds a handler that executes the expression when the named event is dispatched.
	#
	# **Example:** Handles the click event.
	#```javascript
	# Binding.addEventHandler('click')
	# ```
	# 
	# ```xml
	# <button data-click="window.alert('hello!')">Say Hello</button>
	#```
	@addEventHandler: (eventName) ->
		@addHandler eventName, (element, expr, controller) ->
			element.on eventName, (event) ->
				event.preventDefault()
				controller.eval expr
	
	
	# Shortcut, adds a handler that responds when the given key is pressed, e.g. `Binding.addEventHandler('esc', 27)`.
	@addKeyEventHandler: (name, keyCode, ctrlKey) ->
		@addHandler name, (element, expr, controller) ->
			element.on 'keydown', (event) ->
				return if ctrlKey? and (event.ctrlKey isnt ctrlKey and event.metaKey isnt ctrlKey)
				return unless event.keyCode is keyCode
				event.preventDefault()
				controller.eval expr
	
	
	# Shortcut, adds a handler to set the named attribute to the value of the expression.
	# 
	# **Example**
	# ```javascript
	# Binding.addAttributeHandler('href')
	# ```
	# allows
	# ```xml
	# <a data-href="'/profile/' + person.id">My Profile</a>
	# ```
	# which would result in
	# ```xml
	# <a href="/profile/368">My Profile</a>
	# ```
	@addAttributeHandler: (name) ->
		@addHandler name, (element, expr, controller) ->
			controller.watch expr, (value) ->
				if value?
					element.attr name, value
				else
					element.removeAttr name
	
	
	# Shortcut, adds a handler to toggle an attribute on or off if the value of the expression is truthy or false,
	# e.g. `Binding.addAttributeToggleHandler('checked')`.
	@addAttributeToggleHandler: (name) ->
		@addHandler name, (element, expr, controller) ->
			controller.watch expr, (value) ->
				element.prop name, value or false
	
	
	# Processes the bindings for the given jQuery element and all of its children.
	@process: (element, controller) ->
		controller = Controller.create(element) unless controller
		
		node = element.get(0)
		parentNode = node.parentNode
		
		# Finds binding attributes and sorts by priority.
		attribs = Array::slice.call(node.attributes)
		attribs = attribs.filter (attr) =>
			attr.name.indexOf(@prefix) is 0 and @handlers[attr.name.replace(@prefix, '')]
		
		attribs = attribs.map (attr) =>
			entry = @handlers[attr.name.replace(@prefix, '')]
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
		for child in node.children
			@process $(child), controller
	


# Sets up the binding handlers for this jQuery element and all of its descendants
jQuery.fn.bindTo = (controller) ->
	Binding.process(this, controller)


# Set up for AMD.
this.Binding = Binding
if typeof define is 'function' && define.amd
	define 'chip/binding', -> Binding
else if typeof exports is 'object' and typeof module is 'object'
	chip.Binding = Binding