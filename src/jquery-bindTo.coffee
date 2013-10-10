(($) ->
	window.syncView = observers.sync
	
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
			elements = $()
					
			createElement = (model) ->
				element = template.clone()
				if controllerName
					controller = chip.getController(controllerName, parent: options.controller, element: element, model: model)
				else
					controller = options.controller
				
				element.bindTo(controller, model)
				controller.setup?() if controllerName
				element.get(0)
			
			
			# refresh the matching of an array completely
			bindExpression options, (value, splices) ->
				if not splices
					# remove existing elements
					elements.remove()
					elements = $()
					
					
					# if the value isn't null and is an array
					if Array.isArray value
						value.forEach (item) ->
							elements.push createElement(item)
						options.element.after(elements)
				
				else
					
					splices.forEach (splice) ->
						# create splice argument array
						args = [splice.index, splice.removed.length]
						
						# create elements for new items
						newElements = []
						addIndex = splice.index
						while (addIndex < splice.index + splice.addedCount)
							item = value[addIndex]
							newElements.push createElement(item)
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
			
			expr = options.expr
			options.expr += ' = value'
			setter = createBoundExpr(options)
			options.expr = expr
			options.element.on 'keyup', ->
				console.log options.element.val()
				setter options.element.val()
		
		
		on: (options) ->
			[eventName] = options.args()
			options.element.on eventName, (event) ->
				event.preventDefault()
				evaluate(options)
	
	
	events = [ 'click', 'dblclick', 'submit', 'change', 'focus', 'blur' ]
	keyCodes = { enter: 13, esc: 27 }
	toggles = [ 'checked', 'disabled' ]
	attribs = [ 'href', 'src' ]
	
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
	
	
	toggles.forEach (attr) ->
		bindTo.handlers[attr] = (options) ->
			bindExpression options, (value) ->
				options.element.prop(attr, value)
	
	
	attribs.forEach (attr) ->
		bindTo.handlers[attr] = (options) ->
			bindExpression options, (value) ->
				if value?
					options.element.attr(attr, value)
				else
					options.element.removeAttr(attr)
	
	
	
	Path.onchange = ->
		$(document).trigger('urlchange')
	
	
	# method to put on options to get the arguments out of an expression (the items before colons) 
	optionArgs = ->
		args = this.expr.split /\s*:\s*/
		this.expr = args.pop()
		args
	
	
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
		wrapper = (value, changes) ->
			options.element.trigger('boundUpdate')
			callback value, changes
		
		observer = observers.add createBoundExpr(options), true, wrapper
		onRemove options.element, -> observer.close()
		return observer
	
	
	
	exprCache = {}
	getterFunction = (expr) ->
		func = exprCache[expr]
		return func if func
		try
			if expr.indexOf('(') is -1
				functionBody = "try{return #{expr}}catch(e){}"
			else
				functionBody = "return #{expr}"
			func = exprCache[expr] = Function('controller', 'model', 'element', 'value', functionBody)
		catch e
			throw 'Error evaluating code for binding: "' + expr + '" with error: ' + e.message
		func
	
	
	
	# evaluate an expression
	createBoundExpr = (options) ->
		func = getterFunction(options.expr)
		func.bind(options.model or options.controller, options.controller, options.model, options.element)
	
	
	# evaluate an expression
	evaluate = (options) ->
		func = getterFunction(options.expr)
		
		# allow "this" to be the model first, or controller second
		func.call(options.model or options.controller, options.controller, options.model, options.element)

)(jQuery)