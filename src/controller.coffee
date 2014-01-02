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
		if typeof expr is 'function'
			getter = expr
		else
			getter = Controller.createBoundFunction(this, expr)
		# Store the observers with the controller so when it is closed we can clean up all observers as well
		observer = Observer.add getter, skipTriggerImmediately, callback
		observer.expr = expr
		@_observers.push observer
		observer
	
	# Evaluates an expression immediately, returning the result
	eval: (expr) ->
		Controller.createFunction(expr).call(this)
	
	# Evaluates an expression immediately as a setter, setting `value` to the expression running through filters.
	evalSetter: (expr, value) ->
		return @passthrough().evalSetter(expr, value) if @passthrough()
		expr = expr.replace(/(\s*\||$)/, ' = value$1')
		Controller.createFunction(expr, ['value']).call(this, value)
	
	
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
	
	
	# Redirects to the provided URL
	redirect: (url) ->
		@app.redirect(url)
		this
	
	
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
		this
	
	
	# Syncs just the observers for this controller immediately
	syncNow: ->
		for observer in @_observers
			observer.sync()
		this
	
	
	runFilter: (value, filterName, args...) ->
		Filter.runFilter(filterName, value, args...)
	
	
	passthrough: (value) ->
		if arguments.length
			@_passthrough = value
		else
			if @hasOwnProperty('_passthrough') then @_passthrough else null
	
	
	# The keywords which will *not* get `this.` prepended to inside an expression. All other valid variable names will
	# have `this.` added to them. `this` is the controller instance when the expression is run. Add additional keywords
	# to this array if there are global variables you wish to use in expressions. E.g. `$` or `jQuery`
	@keywords: ['this', 'window', '$', 'true', 'false']
	
	@filters: {}
	@exprCache: {}
	
	# *private:* Creates a function from the given expression, allowing for extra arguments. This function will be
	# cached so subsequent calls with the same expression will return the previous function. E.g. the expression "name"
	# will always return a single function with the body `return this.name`.
	@createFunction: (expr, extraArgNames = []) ->
		# Returns the cached function for this expression if it exists.
		func = @exprCache[expr]
		return func if func
		
		# Prefix all property lookups with the `this` keyword. Ignores keywords (window, true, false) and extra args 
		normalizedExpr = normalizeExpression expr, extraArgNames
		
		try
			# We can safely (until getters/setters are common) add a try/catch around expression that don't use
			# functions. Those that do use functions need the error to occur so developers can debug their code.
			# Caches the function for later
			func = @exprCache[expr] = Function(extraArgNames..., normalizedExpr)
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
			return if passthrough and controller.passthrough() then controller.passthrough() else controller
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
pipeExpr = /\|(\|)?/g
argSeparator = /\s*:\s*/g
setterExpr = /\s=\s/


# Adds `this.` to the beginning of each valid property in an expression and processes filters
normalizeExpression = (expr, extraArgNames) ->
	orig = expr
	options =
		references: 0
		ignore: Controller.keywords.concat(extraArgNames) # Ignores keywords and provided argument names
	
	# Adds placeholders for strings so we can process the rest without their content messing us up.
	strings = []
	expr = expr.replace quoteExpr, (str, quote) ->
		strings.push str
		return quote + quote # placeholder for the string
	
	
	# Removes filters from expression string
	expr = expr.replace pipeExpr, (match, orIndicator) ->
		if orIndicator
			return match
		return '@@@'
	
	filters = expr.split /\s*@@@\s*/
	expr = filters.shift()
	
	# Processes the filters
	if filters.length
		if setterExpr.test(expr)
			[ setter, value ] = expr.split(' = ')
			setter = processProperties(setter, options).replace(/^\(|\)$/g, '') + ' = '
			value = processProperties(value, options)
		else
			setter = ''
			value = processProperties(expr, options)
		
		strIndex = expr.match(quoteExpr)?.length or 0
		filters.forEach (filter) ->
			args = filter.split(argSeparator)
			strings.splice strIndex++, 0, "'" + args[0] + "'"
			strIndex += filter.match(quoteExpr)?.length or 0
			args[0] = "''"
			args = args.map (arg) ->
				processProperties arg, options
			value = "this.runFilter(#{value},#{args.join(',')})"
		
		expr = setter + value
	else
		if setterExpr.test(expr)
			[ setter, value ] = expr.split(' = ')
			setter = processProperties(setter, options).replace(/^\(|\)$/g, '') + ' = '
			value = processProperties(value, options)
			expr = setter + value
		else
			expr = processProperties(expr, options)
	
	expr = 'return ' + expr
	
	# Replaces string placeholders.
	expr = expr.replace emptyQuoteExpr, ->
		return strings.shift()
	
	# Prepends reference variable definitions
	if options.references
		refs = []
		for i in [1..options.references]
			refs.push '_ref' + i
		expr = 'var ' + refs.join(', ') + ';\n' + expr
		
	expr



processProperties = (expr, options = {}) ->
	options.references = 0 unless options.references
	options.ignore = [] unless options.ignore
	propExpr = /((\{|,|\.)?\s*)([a-z$_\$][a-z_\$0-9\.-]*)(\s*(:|\()?)/gi
	currentIndex = 0
	newExpr = ''
	
	# Adds the "this." prefix onto properties found in the expression and modifies to handle null exceptions.
	processProperty = (match, prefix, objIndicator, propChain, postfix, colonOrParen) ->
		index = propExpr.lastIndex - match.length
		# `objIndicator` is `{` or `,` and let's us know this is an object property name (e.g. prop in `{prop:false}`).
		# `prefix` is `objIndicator` with the whitespace that may come after it.
		# `propChain` is the chain of properties matched (e.g. `this.user.email`).
		# `colonOrParen` matches the colon (:) after the property (if it is an object) or parenthesis if it is a
		# function. We use `colonOrParen` and `objIndicator` to know if it is an object.
		# `postfix` is the `colonOrParen` with whitespace before it.
		
		# skips object keys e.g. test in `{test:true}` and keywords e.g. true in `{test:true}`.
		if objIndicator and colonOrParen is ':' or options.ignore.indexOf(propChain.split(/\.|\(/).shift()) isnt -1
			return match
		
		# continuations after a function (e.g. `getUser(12).firstName`).
		continuation = prefix is '.'
		if continuation
			prefix = ''
		
		parts = propChain.split('.')
		newChain = ''
		
		if parts.length is 1 and not continuation
			newChain = 'this.' + parts[0]
		else
			newChain += '(' unless continuation
			
			parts.forEach (part, partIndex) ->
				# if the last
				if partIndex is parts.length - 1
					if colonOrParen is '('
						# Handles a function to be called in its correct scope
						# Finds the end of the function and processes the arguments
						parenCount = 1
						startIndex = propExpr.lastIndex
						endIndex = startIndex - 1
						while endIndex++ < expr.length
							switch expr[endIndex]
								when '(' then parenCount++
								when ')' then parenCount--
							break if parenCount is 0
						
						propExpr.lastIndex = endIndex + 1
						innards = processProperties expr.slice(startIndex, endIndex), options
						part += '(' + innards + ')'
						postfix = ''
						if expr[endIndex + 1] is '.'
							newChain += processPart(options, part, partIndex, continuation)
							return
					newChain += "_ref#{options.references}.#{part})"
					return
				else
					newChain += processPart(options, part, partIndex, continuation)
		
		return prefix + newChain + postfix
	
	
	while (matchArgs = propExpr.exec expr)
		index = propExpr.lastIndex - matchArgs[0].length
		newExpr += expr.slice(currentIndex, index) + processProperty matchArgs...
		currentIndex = propExpr.lastIndex
	newExpr += expr.slice(currentIndex)
	
	newExpr



processPart = (options, part, index, continuation) ->
	# if the first
	if index is 0 and not continuation
		part = "this.#{part}"
	else
		part = "_ref#{options.references}.#{part}"
	
	ref = "_ref#{++options.references}"
	"(#{ref} = #{part}) == null ? undefined : "


chip.Controller = Controller
