(($) ->
	window.syncView = observers.sync
	
	# given an object, bind all bindable attributes to the data (e.g. <span data-bind="name">any text</span> will replace
	# the contents of the span with the value of model.name. Whenever model.name is updated, the elements will update
	# accordingly. Note: For browsers who do not support Object.observe yet please call "syncView()" after changes to the model
	# to update the html
	bindTo = $.fn.bindTo = (data) ->
		element = this
		unless data
			data = this: {}
		
		unless data.hasOwnProperty 'this'
			data = this: data
		
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
					binding element, expr, data
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
		repeat: (element, expr, data) ->
			# template, expr, model, controller
			[ itemName, expr ] = expr.split /\s+in\s+/
			controllerName = element.attr('data-controller')
			element.removeAttr('data-controller')
			parent = data.this or data
			
			template = element
			element = $('<script type="text/repeat-placeholder"><!--data-repeat="' + expr + '"--></script>').replaceAll(template)
			elements = $()
					
			createElement = (model) ->
				newElement = template.clone()
				if controllerName
					controller = chip.getController(controllerName, parent: parent, element: newElement, model: model)
				else
					controller = options.controller
				
				itemData = { this: controller }
				itemData[itemName] = model
				newElement.bindTo itemData
				controller.setup?() if controllerName
				newElement.get(0)
			
			
			# refresh the matching of an array completely
			bindExpression element, expr, data, (value, splices) ->
				if not splices
					# remove existing elements
					elements.remove()
					elements = $()
					
					
					# if the value isn't null and is an array
					if Array.isArray value
						value.forEach (item) ->
							elements.push createElement(item)
						element.after(elements)
				
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
							element.after(newElements)
						else
							elements.eq(splice.index - 1).after(newElements)
		
		# replace the HTML in the element with the page from the given expression and bind to the model in the second argument if any 
		partial: (element, expr, data) ->
			bindExpression element, expr, data, (value) ->
				element.html(value)
			
	
	
	bindTo.handlers =
		if: (element, expr, data) ->
			bindExpression element, expr, data, (value) ->
				if value
					element.show()
				else
					element.hide()
		
		
		bind: (element, expr, data) ->
			bindExpression element, expr, data, (value) ->
				element.text(if value? then value else '')
		
		
		'bind-html': (element, expr, data) ->
			bindExpression element, expr, data, (value) ->
				element.html(if value? then value else '')
		
		
		active: (element, expr, data) ->
			if expr
				bindExpression element, expr, data, (value) ->
					if value
						element.addClass('active')
					else
						element.removeClass('active')
			else
				# look at the href of this or a child element and set the active class depending on the current URL
				refresh = ->
					if link.length and link.get(0).href is location.href
						element.addClass('active')
					else
						element.removeClass('active')
				
				link = element.filter('[href],[data-attr^="href:"]').add(element.children('[href],[data-attr^="href:"]')).first()
				link.on 'boundUpdate', refresh
				$(document).on 'urlchange', refresh
				onRemove element, -> $(document).off 'urlchange', refresh
				refresh()
		
		
		class: (element, expr, data) ->
			bindExpression element, expr, data, (value) ->
				if Array.isArray(value)
					value = value.join(' ')
				
				if typeof value is 'string'
					element.attr('class', value)
				else if value and typeof value is 'object'
					for className, toggle of value
						if toggle
							element.addClass(className)
						else
							element.removeClass(className)
		
		
		value: (element, expr, data) ->
			bindExpression element, expr, data, (value) ->
				element.val(value)
			
			setter = createBoundExpr(expr + ' = value', data, ['value'])
			setter element.val()
			element.on 'keyup', ->
				setter element.val()
				syncView()
	
	
	events = [ 'click', 'dblclick', 'submit', 'change', 'focus', 'blur' ]
	keyCodes = { enter: 13, esc: 27 }
	toggles = [ 'checked', 'disabled' ]
	attribs = [ 'href', 'src' ]
	
	events.forEach (eventName) ->
		bindTo.handlers['on' + eventName] = (element, expr, data) ->
			element.on eventName, (event) ->
				event.preventDefault()
				evaluate(expr, data)
	
	
	Object.keys(keyCodes).forEach (name) ->
		keyCode = keyCodes[name]
		bindTo.handlers['on' + name] = (element, expr, data) ->
			element.on 'keydown', (event) ->
				if event.keyCode is keyCode
					event.preventDefault()
					# TODO create cached bound function?
					evaluate(expr, data)
	
	
	toggles.forEach (attr) ->
		bindTo.handlers[attr] = (element, expr, data) ->
			bindExpression element, expr, data, (value) ->
				element.prop(attr, value)
	
	
	attribs.forEach (attr) ->
		bindTo.handlers[attr] = (element, expr, data) ->
			bindExpression element, expr, data, (value) ->
				if value?
					element.attr(attr, value)
				else
					element.removeAttr(attr)
	
	
	
	Path.onchange = ->
		$(document).trigger('urlchange')
	
	
	# closes an observer when an element is officially "removed" from the DOM by jQuery
	onRemove = (element, cb) ->
		element.on 'removeObserver', cb
	
	
	# works with addCleanup to trigger the removeObserver event when the element is removed from the DOM
	# this is a work-around since jQuery has no "remove" event and will not work with Zepto
	$.event.special.removeObserver =
		remove: (event) ->
			# gets called when an element with the event 'removeObserver', is removed from the DOM. Manually call the listner
			event.handler()
	
	
	varExpr = /[a-z$_\$][a-z_\$0-9\.-]*\s*:?|'|"/gi
	
	# add "this." to the beginning of each variable
	normalizeExpression = (expr, argNames) ->
		argNames = argNames.concat ['this', 'window', 'true', 'false']
		rewritten = ''
		index = 0
		while (match = varExpr.exec(expr))
			if match
				match = match[0]
				# add the non-match characters to our rewritten expr
				rewritten += expr.slice(index, varExpr.lastIndex - match.length)
				
				if match is "'" or match is '"'
					# skip the string
					index = expr.indexOf(match, varExpr.lastIndex) + 1
					rewritten += expr.slice(varExpr.lastIndex - 1, index)
					varExpr.lastIndex = index
				else if expr[varExpr.lastIndex - match.length - 1] is '.' # handle cases like func().chain()
					rewritten += match
					index = varExpr.lastIndex
				else
					if match.slice(-1) isnt ':' and argNames.indexOf(match.split('.').shift()) is -1
						rewritten += 'this.'
					rewritten += match
					index = varExpr.lastIndex
		rewritten += expr.slice(index)
		rewritten
		
	
	
	
	
	# binds a callback to a path, allowing for the "this" keyword, triggering the callback immediately, and removing the
	# binding automatically for garbage collection when the DOM node is removed
	bindExpression = (element, expr, data, callback) ->
		wrapper = (value, changes) ->
			element.trigger('boundUpdate')
			callback value, changes
		
		observer = observers.add createBoundExpr(expr, data), true, wrapper
		onRemove element, -> observer.close()
		return observer
	
	
	notThis = (name) -> name isnt 'this'
	getDataArgNames = (data) -> Object.keys(data).filter(notThis).sort() 
	getDataArgs = (data) -> Object.keys(data).filter(notThis).sort().map (key) -> data[key]
	
	
	exprCache = {}
	createFunction = (expr, data, extras) ->
		argNames = getDataArgNames data
		argNames = argNames.concat(extras) if extras
		expr = normalizeExpression expr, argNames
		func = exprCache[expr]
		return func if func
		try
			if expr.indexOf('(') is -1
				functionBody = "try{return #{expr}}catch(e){}"
			else
				functionBody = "return #{expr}"
			func = exprCache[expr] = Function(argNames..., functionBody)
		catch e
			throw 'Error evaluating code for binding: "' + expr + '" with error: ' + e.message
		func
	
	
	# evaluate an expression
	createBoundExpr = (expr, data, extras) ->
		func = createFunction(expr, data, extras)
		args = getDataArgs(data)
		func.bind(data.this, args...)
	
	
	# evaluate an expression
	evaluate = (expr, data) ->
		func = createFunction(expr, data)
		args = getDataArgs(data)
		
		# allow "this" to be the model first, or controller second
		func.apply(data.this, args)

)(jQuery)