(($) ->
	window.syncView = Platform.performMicrotaskCheckpoint
	
	# given an object, bind all bindable attributes to the data (e.g. <span data-bind="name">any text</span> will replace
	# the contents of the span with the value of model.name. Whenever model.name is updated, the elements will update
	# accordingly. Note: For browsers who do not support Object.observe yet please call "syncView()" after changes to the model
	# to update the html
	bindTo = $.fn.bindTo = (controller, model) ->
		element = this
		splits = /[^|]\|[^|]/g
		
		# handles the all the binding attributes on one element of one type (block vs non-block, e.g. data-repeat) 
		handleBinding = (element, handlers) ->
			# if we don't make it an array it will change contents when we remove attributes and cause errors
			attributes = Array::slice.call(element.get(0).attributes)
			for attr in attributes
				continue if attr.name.split('-').shift() isnt 'data'
				binding = handlers[attr.name.replace('data-', '')]
				if binding
					expr = attr.value
					# remove the attribute so we know binding has been processed
					element.removeAttr(attr.name)
					expressions = []
					index = 0
					while splits.exec(expr)
						expressions.push expr.slice(index, splits.lastIndex - 2)
						index = splits.lastIndex - 1
					expressions.push expr.slice(index)
					
					expressions.forEach (expr) ->
						binding
							element: element
							expr: expr
							controller: controller
							model: model
							args: optionArgs # method to get arguments
			return
		
		
		# first do blocks, one at a time, then we can do the rest all at once
		blocksSelector = '[data-' + Object.keys(bindTo.blockHandlers).join('],[data-') + ']'
		
		# find the first element with a block attribute and process each block, one at a time since they may be nested and
		# we don't want to double process them (blocks will use bindTo so are recursive)
		while (block = element.find(blocksSelector)).length
			handleBinding block.first(), bindTo.blockHandlers
		
		selector = '[data-' + Object.keys(bindTo.handlers).join('],[data-') + ']'
		
		# get all remaining bindings at once, and process them
		# if we just use "find" we won't process the element itself if it has bindable attributes on it
		bindings = element.filter(selector).add(element.find(selector))
		bindings.each ->
			handleBinding $(this), bindTo.handlers
		return element
	
	
	
	bindTo.blockHandlers =
		# repeat the html element for each item in the array given in the expression
		repeat: (options) ->
			# template, expr, model, controller
			controllerName = options.element.attr('data-controller')
			options.element.removeAttr('data-controller')
			
			template = options.element
			options.element = $('<script type="text/repeat-placeholder"><!--data-repeat="' + options.expr + '"--></script>').replaceAll(template)
			arrayObserver = null
			elements = $()
			
			# refresh the matching of an array completely
			bindExpression options, (value) ->
				# remove existing elements
				elements.remove()
				elements = $()
				if arrayObserver
					arrayObserver.close()
					arrayObserver = null
				
				# if the value isn't null and is an array
				if Array.isArray value
					value.forEach (item) ->
						element = template.clone()
						if controllerName
							controller = chip.getController(controllerName, parent: options.controller, element: element, model: item)
						else
							controller = options.controller
						
						elements.push element.bindTo(controller, item).get(0)
						if controllerName
							controller.setup?()
					options.element.after(elements)
					
					arrayObserver = bindToArray options.element, value, (splices) ->
						splices.forEach (splice) ->
							# create splice argument array
							args = [splice.index, splice.removed.length]
							
							# create elements for new items
							newElements = []
							addIndex = splice.index
							while (addIndex < splice.index + splice.addedCount)
								item = value[addIndex]
								newElements.push template.clone().bindTo(options.controller, item).get(0)
								addIndex++
							
							removedElements = elements.splice.apply(elements, args.concat(newElements))
							$(removedElements).remove()
							if splice.index is 0
								options.element.after(newElements)
							else
								elements.eq(splice.index - 1).after(newElements)
		
		# replace the HTML in the element with the page from the given expression and bind to the model in the second argument if any 
		partial: (options) ->
			bindExpression options, (value) ->
				options.element.html(value)
			
	
	
	bindTo.handlers =
		if: (options) ->
			bindExpression options, (value) ->
				if value
					options.element.show()
				else
					options.element.hide()
		
		
		bind: (options) ->
			bindExpression options, (value) -> options.element.text(if value? then value else '')
		
		
		'bind-html': (options) ->
			bindExpression options, (value) -> options.element.html(if value? then value else '')
		
		
		attr: (options) ->
			[attr] = options.args()
			bindExpression options, (value) ->
				options.element.attr(attr, value)
		
		
		active: (options) ->
			if options.expr
				bindExpression options, (value) ->
					if value
						options.element.addClass('active')
					else
						options.element.removeClass('active')
			else
				# look at the href of this or a child element and set the active class depending on the current URL
				refresh = ->
					if link.length and link.get(0).href is location.href
						options.element.addClass('active')
					else
						options.element.removeClass('active')
				
				link = options.element.filter('[href],[data-attr^="href:"]').add(options.element.children('[href],[data-attr^="href:"]')).first()
				link.on 'boundUpdate', refresh
				$(document).on 'urlchange', refresh
				onRemove options.element, -> $(document).off 'urlchange', refresh
				refresh()
		
		
		class: (options) ->
			[className] = options.args()
			bindExpression options, (value) ->
				if value
					options.element.addClass(className)
				else
					options.element.removeClass(className)
		
		
		value: (options) ->
			bindExpression options, (value) ->
				options.element.val(value)
		
		
		on: (options) ->
			[eventName] = options.args()
			options.element.on eventName, (event) ->
				event.preventDefault()
				evaluate(options)
	
	
	events = [ 'click', 'dblclick', 'submit', 'change', 'focus', 'blur' ]
	keyCodes = { enter: 13, esc: 27 }
	
	events.forEach (eventName) ->
		bindTo.handlers['on' + eventName] = (options) ->
			options.element.on eventName, (event) ->
				event.preventDefault()
				evaluate(options)
	
	
	Object.keys(keyCodes).forEach (name) ->
		keyCode = keyCodes[name]
		bindTo.handlers['on' + name] = (options) ->
			options.element.on 'keydown', (event) ->
				if event.keyCode is keyCode
					event.preventDefault()
					evaluate(options)
	
	
	Path.onchange = ->
		$(document).trigger('urlchange')
	
	
	# method to put on options to get the arguments out of an expression (the items before colons) 
	optionArgs = ->
		args = this.expr.split /\s*:\s*/
		this.expr = args.pop()
		args
	
	
	# find all the paths referenced in an expression
	getPaths = (expr) ->
		paths = []
		# get all the variables, including the first parenthesis after it if there is one to know if the last is a function
		matches = expr.match(/[\w\$][\w\$\d-\.]*\(?/g)
		return paths unless matches
		Array.prototype.forEach.call matches, (path) ->
			# remove the function since these are always on the prototype and don't change, even though the object might
			if path.slice(-1) is '('
				path = path.split('.').slice(0, -1).join('.')
			if path and path isnt 'this' and path isnt 'controller' and path isnt 'model' and path isnt 'element'
				paths.push path
		paths
	
	
	# closes an observer when an element is officially "removed" from the DOM by jQuery
	onRemove = (element, cb) ->
		element.on 'removeObserver', cb
	
	
	# works with addCleanup to trigger the removeObserver event when the element is removed from the DOM
	# this is a work-around since jQuery has no "remove" event and will not work with Zepto
	$.event.special.removeObserver =
		remove: (event) ->
			# gets called when an element with the event 'removeObserver', is removed from the DOM. Manually call the listner
			event.handler()
	
	
	# binds a callback to a path, allowing for the "this" keyword, triggering the callback immediately, and removing the
	# binding automatically for garbage collection when the DOM node is removed
	bindExpression = (options, callback) ->
#		expr = normalizeExpression expr
		wrapper = ->
			options.element.trigger('boundUpdate')
			callback evaluate options
		
		observers = []
		observers.close = ->
			@forEach (observer) -> observer.close()
		
		getPaths(options.expr).forEach (path) ->
			parts = path.split('.')
			root = parts.shift()
			path = parts.join('.')
			if root is 'controller' and options.controller
				observers.push new PathObserver(options.controller, path, wrapper)
			else if root is 'model' and options.model
				observers.push new PathObserver(options.model, path, wrapper)
			else if root is 'element' and options.element
				observers.push new PathObserver(options.element, path, wrapper)
		
		onRemove options.element, -> observers.close()
		wrapper()
		
		return observers
	
	
	# binds a callback to an Array, removing the binding automatically for garbage collection when the DOM node is removed
	bindToArray = (element, array, callback) ->
		observer = new ArrayObserver(array, callback)
		onRemove element, -> observer.close()
		observer
	
	
	exprCache = {}
	createFunc = (expr) ->
		# allow non-functions to be undefined with try/catch, but we don't want to catch errors in functions
		if expr.indexOf('(') is -1
			expr = "try{return #{expr}}catch(e){}"
		else
			expr = "return #{expr}"
	
	# evaluate an expression
	evaluate = (options) ->
		func = exprCache[options.expr]
		unless func
			try
				funcBody = createFunc(options.expr)
				func = exprCache[options.expr] = Function('controller', 'model', 'element', funcBody)
			catch e
				throw 'Error evaluating code for binding: "' + options.expr + '" with error: ' + e.message
		
		# allow "this" to be the model first, or controller second
		func.call(options.model or options.controller, options.controller, options.model, options.element)

)(jQuery)