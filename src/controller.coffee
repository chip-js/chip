# # Chip Controller

# A Controller is the object to which HTML elements are bound.
class Controller
	
	constructor: ->
		# Creates the observer array so child controllers don't inherit this from parents 
		@_observers = []
	
	# Watches an expression for changes. Calls the `callback` immediately with the initial value and then every time
	# the value in the expression changes. An expression can be as simple as `name` or as complex as
	# `user.firstName + ' ' + user.lastName + ' - ' + user.getPostfix()`
	watch: (expr, skipTriggerImmediately, callback) ->
		getter = Controller.createBoundFunction(this, expr)
		# Store the observers with the controller so when it is closed we can clean up all observers as well
		observer = Observer.add getter, skipTriggerImmediately, callback
		observer.expr = expr
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
	
	
	# Determines whether an expression has a filter defined. This allows bindings to skip setters when a filter exists.
	exprHasFilter: (expr) ->
		hasFilter(expr)
	
	
	# Redirects to the provided URL
	redirect: (url) ->
		chip.redirect(url)
	
	
	# Clones the object at the given property name for processing forms
	cloneValue: (property) ->
		Observer.immutable @[property]
	
	
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
		if typeof later is 'function'
			setTimeout later
	
	
	# Syncs just the observers for this controller immediately
	syncNow: ->
		for observer in @_observers
			observer.sync()
	
	
	runFilter: (value, filterName, args...) ->
		Filter.runFilter(filterName, value, args...)
	
	
	# The keywords which will *not* get `this.` prepended to inside an expression. All other valid variable names will
	# have `this.` added to them. `this` is the controller instance when the expression is run. Add additional keywords
	# to this array if there are global variables you wish to use in expressions. E.g. `$` or `jQuery`
	@keywords: ['this', 'window', '$', 'true', 'false']
	
	@filters: {}
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
				functionBody = "try{return #{normalizedExpr}}catch(e){throw new Error(" +
					"'Error processing binding expression `#{expr.replace(/'/g, "\\'")}` ' + e)}"
			# Caches the function for later
			func = @exprCache[normalizedExpr] = Function(extraArgNames..., functionBody)
		catch e
			# Throws an error if the expression was not valid JavaScript
			throw new Error e.message + ' in observer binding:\n`' + expr + '`\n' +
			'Compiled binding:\n' + functionBody
		func
	
	
	# *private:* Creates a function and binds it to the given controller so it may be called from anywhere
	# (e.g. provided to observers).
	@createBoundFunction: (controller, expr, extraArgNames) ->
		func = Controller.createFunction(expr, extraArgNames)
		func.bind(controller)


# jQuery plugin to get the controller for the given element
$.fn.controller = (passthrough) ->
	element = this
	while element.length
		controller = element.data('controller')
		if controller
			return if passthrough and controller.passthrough then controller.passthrough else controller
		element = element.parent()
	null


# Provides the 'elementRemove' event to be dispatched when an element is removed from the DOM and cleaned up. Gets
# called when an element with the event 'elementRemove', is removed from the DOM. Manually call the listener.
$.event.special.elementRemove =
	remove: (event) ->
		event.handler()



# Searches out possible properties or finds the beginning of strings (which we skip)
varExpr = /[a-z$_\$][a-z_\$0-9\.-]*\s*:?|'|"/gi
quoteExpr = /(['"])(\\\1|[^\1])*?\1/g
emptyQuoteExpr = /(['"])\1/g
propExpr = /((\{|,)?\s*)([a-z$_\$][a-z_\$0-9\.-]*)(\s*(:)?)/gi
pipeExpr = /\|(\|)?/g
argSeparator = /\s*:\s*/g


# Adds `this.` to the beginning of each valid property in an expression and processes filters
normalizeExpression = (expr, extraArgNames) ->
	# Ignores keywords and provided argument names
	ignore = Controller.keywords.concat(extraArgNames)
	
	# Adds placeholders for strings so we can process the rest without their content messing us up.
	strings = []
	expr = expr.replace quoteExpr, (str, quote) ->
		strings.push str
		return quote + quote # placeholder for the string
	
	
	# Processes the filters
	expr = expr.replace pipeExpr, (match, orIndicator) ->
		if orIndicator
			return match
		return '@@@'
	
	filters = expr.split /\s*@@@\s*/
	expr = filters.shift()
	if filters.length
		strIndex = expr.match(quoteExpr)?.length or 0
		filters.forEach (filter) ->
			args = filter.split(argSeparator)
			strings.splice strIndex++, 0, "'" + args[0] + "'"
			strIndex += filter.match(quoteExpr)?.length or 0
			args[0] = "''"
			expr = "runFilter(#{expr},#{args.join(',')})"
		
	
	# Adds the "this." prefix onto properties found in the expression
	expr = expr.replace propExpr, (match, prefix, objIndicator, propChain, postfix, colon, index, str) ->
		if objIndicator and colon or str[index + prefix.length - 1] is '.'
			return match # skips object keys e.g. test in {test:true}
		
		if ignore.indexOf(propChain.split(/\.|\(/).shift()) isnt -1
			return match # skips keywords e.g. true in {test:true}
		
		return prefix + 'this.' + propChain + postfix
	
	
	# Replaces string placeholders.
	expr = expr.replace emptyQuoteExpr, ->
		return strings.shift()
#	console.log expr
	expr

# Determines if an expression has a filter (a single pipe)
hasFilter = (expr) ->
	expr = expr.replace pipeExpr, (match, orIndicator) ->
		if orIndicator
			return match
		return '@@@'
	expr.indexOf('@@@') isnt -1


chip.Controller = Controller
