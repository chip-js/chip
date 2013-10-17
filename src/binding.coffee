# # Chip Binding

# A Binding instance is created for each binding attribute in the DOM. Mostly the Binding class is used as a static
# place to register new bind handlers.
class Binding
	constructor: (@name, @expr) ->
	
	
	# The attribute prefix for all binding attributes. This is the default and may be changed.
	@prefix: 'data-'
	@blockHandlers: {}
	@handlers: {}
	
	
	# Adds a binding handler that will be run for each attribute whose name matches `@prefix + name`. The `handler` is
	# a function that receives three arguments: the jQuery element the attribute was on, the value of the attribute
	# (usually an expression), and the controller for this area of the page.
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
	@addHandler: (name, handler) ->
		@handlers[name] = handler
	
	
	# Adds a handler which is expected to create a new controller for its children. When the bindings are processed
	# these are handled first, allowing them to recurse into their HTML with new controllers. They can do that by
	# using `element.bindTo(newChildController)`.
	@addBlockHandler: (name, handler) ->
		@blockHandlers[name] = handler
	
	
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
	@addKeyEventHandler: (name, keyCode) ->
		@addHandler name, (element, expr, controller) ->
			element.on 'keydown', (event) ->
				if event.keyCode is keyCode
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
		
		# Create a new controller if none is provided.
		controller = Controller.create(element) unless controller
		prefixExp = new RegExp '^' + Binding.prefix
		
		# Processes an individual element, handling all of the binding attributes (of one type) at once.
		processElement = (element) ->
			node = element.get(0)
			handler = null
			
			# Converts to an array to keep the set from adjusting when attributes are deleted, and filters out
			# non-binding attributes.
			attribs = Array::slice.call(node.attributes).filter (attr) ->
				prefixExp.test(attr.name) and handlers[attr.name.replace(prefixExp, '')]
			
			# Go through each binding attribute from first to last.
			while attribs.length
				attr = attribs.shift()
				
				# Don't re-process if it has been removed. Could happen if one handler uses another and removes it.
				continue unless node.hasAttribute attr.name
				handler = handlers[attr.name.replace(prefixExp, '')]
				expr = attr.value
				
				# Remove the binding handlers so they only get processed once. This simplifies our code, but it also
				# makes the DOM cleaner.
				node.removeAttribute(attr.name)
				
				# Calls the handler function allowing the handler to set up the binding.
				handler element, expr, controller
		
		# Processes block handlers first in order for recursion to allow the correct controller to be used.
		handlers = @blockHandlers
		selector = '[' + @prefix + Object.keys(handlers).join('],[' + @prefix) + ']'
		
		# Handle them one at a time since they may be descendants of each other.
		while (block = element.find(selector)).length
			processElement block.first()
		
		# Processes the rest of the handlers
		handlers = @handlers
		selector = '[' + @prefix + Object.keys(handlers).join('],[' + @prefix) + ']'
		boundElements = element.filter(selector).add(element.find(selector))
		
		# Handle these in one go. No need to recheck since recursion shouldn't be happening.
		boundElements.each -> processElement jQuery this


# Sets up the binding handlers for this jQuery element and all of its descendants
jQuery.fn.bindTo = (controller) ->
	Binding.process(this, controller)


# Set up for AMD.
this.Binding = Binding
if typeof define is 'function' && define.amd
	define 'chip/binding', -> Binding
else if typeof exports is 'object' and typeof module is 'object'
	chip.Binding = Binding