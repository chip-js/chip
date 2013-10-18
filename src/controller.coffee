# # Chip Controller

# A Controller is the object to which HTML elements are bound.
class Controller
	
	# Watches an expression for changes. Calls the `callback` immediately with the initial value and then every time
	# the value in the expression changes. An expression can be as simple as `name` or as complex as
	# `user.firstName + ' ' + user.lastName + ' - ' + user.getPostfix()`
	watch: (expr, skipTriggerImmediately, callback) ->
		getter = Controller.createBoundFunction(this, expr)
		# Store the observers with the controller so when it is closed we can clean up all observers as well
		@_observers = [] unless @hasOwnProperty('_observers')
		observer = Observer.add getter, skipTriggerImmediately, callback
		@_observers.push observer
		observer
	
	
	# Evaluates an expression immediately, returning the result
	eval: (expr) ->
		Controller.createFunction(expr).call(this)
	
	
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
		Controller.createBoundFunction(this, expr, extraArgNames)
	
	
	# Removes and closes all observers for garbage-collection 
	closeController: ->
		if @_observers
			for observer in @_observers
				observer.close()
			@_observers.length = 0
		return
	
	
	# Syncs the observers to propogate changes to the HTML
	syncView: (later) ->
		Observer.sync(later)
	
	
	# Syncs just the observers for this controller immediately
	syncNow: ->
		for observer in @_observers
			observer.sync()
	
	
	# The keywords which will *not* get `this.` prepended to inside an expression. All other valid variable names will
	# have `this.` added to them. `this` is the controller instance when the expression is run. Add additional keywords
	# to this array if there are global variables you wish to use in expressions. E.g. `$` or `jQuery`
	@keywords = ['this', 'window', 'true', 'false']
	
	
	# Static *private* property, holds "controller definitions" which are functions that get called to initialize
	# a new controller
	@definitions = {}
	
	
	# Define a new controller with the provided function. This function will be called with a new controller every time
	# one is instantiated.
	#
	# **Example:**
	#```javascript
	# Controller.define('home', function(controller) {
	#   // do something as soon as it is instantiated
	#   MyAppAPI.loadUser(function(err, user) {
	#     controller.user = user
	#     controller.syncView()
	#   })
	#
	#   // provide a function for the view to call. E.g. <button data-click="logout">Logout</button>
	#   controller.logout = function() {
	#     MyAppAPI.logout(function(err) {
	#       controller.user = null
	#       controller.syncView()
	#     })
	#   }
	# })
	# ```
	@define: (name, defineFunction) ->
		@definitions[name] = defineFunction
	
	
	# Get a definition by name. They can be registered with Controller.define or be functions in the global scope ending
	# with "Controller", e.g. `function homeController(controller){...}` would be returned for
	# `Controller.getDefinition('home')`.
	@getDefinition: (name) ->
		def = @definitions[name]
		return def if def
		def = window[name + 'Controller']
		return def if typeof def is 'function'
	
	
	# Creates a new controller and binds it to the element. This sets up the bindings which update the HTML when data on
	# the controller changes.
	@create: (element, parentController, name, extend) ->
		if typeof parentController is 'string'
			extend = name
			name = parentController
			parentController = undefined
		
		# If `parentController` is provided, the new controller will extend it. Any data or methods on the parent
		# controller will be available to the child unless overwritten by the child. This uses the prototype chain, thus
		# overwriting a property only sets it on the child and does not change the parent. The child cannot set data on
		# the parent, only read it or call methods on it.
		if parentController
			NewController = ->
			NewController.prototype = parentController if parentController
			controller = new NewController()
		else
			controller = new Controller()
		
		# If `extend` is provided, all properties from that object will be copied over to the controller before it is
		# initialized by its definition or bound to its element.
		if extend
			controller[key] = value for own key, value of extend
		
		# Sets up the new controller
		@setup element, controller, name
		
	
	
	# Sets up a new controller. Allows for a non-controller object to be made into a controller without a parent.
	@setup: (element, controller, name) ->
		unless controller instanceof Controller
			for key, value of Controller::
				controller[key] = value
		
		# Assign element and add cleanup when the element is removed.
		element.on 'elementRemove', -> controller.closeController()
		controller.element = element
		element.data 'controller', controller
		
		# If `name` is supplied the controller definition by that name will be run to initialize this controller
		# before the bindings are set up.
		@getDefinition(name)?(controller) if name
		
		# Bind the element to the new controller and then return it.
		element.bindTo controller
		controller
		
	

	@exprCache: {}
	
	# *private:* Creates a function from the given expression, allowing for extra arguments. This function will be cached
	# so subsequent calls with the same expression will return the previous function. E.g. the expression "name" will
	# always return a single function with the body `return this.name`.
	@createFunction: (expr, extraArgNames = []) ->
		# Prefix all property lookups with the `this` keyword. Ignores keywords (window, true, false) and extra args 
		normalizedExpr = normalizeExpression expr, extraArgNames
		
		# Returns the cached function for this expression if it exists.
		func = @exprCache[normalizedExpr]
		return func if func
		
		try
			# We can safely (until getters/setters are common) add a try/catch around expression that don't use
			# functions. Those that do use functions need the error to occur so developers can debug their code.
			if normalizedExpr.indexOf('(') is -1
				functionBody = "try{return #{normalizedExpr}}catch(e){}"
			else
				functionBody = "try{return #{normalizedExpr}}catch(e){throw" +
					" 'Error processing binding expression `#{expr.replace(/'/g, "\\'")}` ' + e}"
			
			# Caches the function for later
			func = @exprCache[normalizedExpr] = Function(extraArgNames..., functionBody)
		catch e
			# Throws an error if the expression was not valid JavaScript
			throw 'Error evaluating code for observer binding: `' + expr + '` with error: ' + e.message
		func
	
	
	# *private:* Creates a function and binds it to the given controller so it may be called from anywhere
	# (e.g. provided to observers).
	@createBoundFunction: (controller, expr, extraArgNames) ->
		func = Controller.createFunction(expr, extraArgNames)
		func.bind(controller)




# Provides the 'elementRemove' event to be dispatched when an element is removed from the DOM and cleaned up. Gets
# called when an element with the event 'elementRemove', is removed from the DOM. Manually call the listener.
$.event.special.elementRemove =
	remove: (event) ->
		event.handler()



# Searches out possible properties or finds the beginning of strings (which we skip)
varExpr = /[a-z$_\$][a-z_\$0-9\.-]*\s*:?|'|"/gi

# Adds `this.` to the beginning of each valid property in an expression
normalizeExpression = (expr, extraArgNames) ->
	# Ignores keywords and provided argument names
	ignore = Controller.keywords.concat(extraArgNames)
	rewritten = ''
	index = 0
	
	# Goes through each possible property
	while (match = varExpr.exec(expr))
		if match
			match = match[0]
			rewritten += expr.slice(index, varExpr.lastIndex - match.length)
			
			if match is "'" or match is '"'
				index = varExpr.lastIndex
				# Skips to the end of the string, we don't want to match properties within a string
				while index < expr.length
					index = expr.indexOf(match, index) + 1
					if index is 0
						index = expr.length
					
					# Skips escaped quotes (e.g. 'That\'s right!')
					if expr[index - 2] isnt '\\'
						rewritten += expr.slice(varExpr.lastIndex - 1, index)
						break
				varExpr.lastIndex = index
			# Skip portions of a chained expression like func().chain()
			else if expr[varExpr.lastIndex - match.length - 1] is '.'
				rewritten += match
				index = varExpr.lastIndex
			else
				# Skip property names like { propertyName: something } and keywords
				if match.slice(-1) isnt ':' and ignore.indexOf(match.split(/\.|\(/).shift()) is -1
					rewritten += 'this.'
				rewritten += match
				index = varExpr.lastIndex
	rewritten += expr.slice(index)
	rewritten


# Set up for AMD.
this.Controller = Controller
if typeof define is 'function' && define.amd
	define 'chip/controller', -> Controller
else if typeof exports is 'object' and typeof module is 'object'
	chip.Controller = Controller
