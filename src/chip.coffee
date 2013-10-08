((global) ->
	
	chip =
		templates: {}
		controllers: {}
		
		# override to get a jQuery element the way your app needs
		getTemplate: (name) ->
			$ chip.templates[name]
		
		# override to get a controller object the way you want
		getController: (name, options) ->
			if !chip.controllers.hasOwnProperty(name)
				throw 'Controller "' + name + '" does not exist'
			return new (chip.controllers[name])(options)
		
		controller: (name, definition = {}) ->
			class controller
				constructor: (data = {}) ->
					this.name = name
					this.parent = data.parent
					this.model = data.model
					this.element = data.element
			
			for own key, value of definition
				controller::[key] = value
			
			chip.controllers[name] = controller
			
		
		runRoute: (name, parents) ->
			# depth
			selector = ['[data-route]']
			selector.push '[data-route]' for path in parents
			selector = selector.join(' ') # .downy-route .downy-route .downy-route
			container = $(selector)
			
			controller = container.data('controller')
			controller?.teardown?()
			
			controller = chip.getController(name)
			template = chip.getTemplate(name)
			container.data('controller', controller).html(template).bindTo(controller)
			controller?.setup?()
			syncView()
		
		
		route: (path, name, subroutes) ->
			if typeof name is 'function'
				subroutes = name
			
			if typeof name isnt 'string'
				# if name isn't provided take /foo/bar and name it fooBar
				name = path.replace(/^\//, '').replace(/\/\w/, (match) -> match.slice(1).toUpperCase())
			
			chip.route.parents = [] unless chip.route.parents
			parents = chip.route.parents.slice() # unmutable copy
			path = parents.join('') + path if parents.length # sub-route support
			
			Path.map(path).to -> chip.runRoute(name, parents)
			
			if subroutes
				chip.route.parents.push path
				subroutes chip.route
				chip.route.parents.pop()
		
		listen: ->
			Path.history.listen()
			if Path.history.supported
				$('body').on 'click', 'a[href]', (event) ->
					event.preventDefault()
					Path.history.pushState {}, "", $(this).attr("href")
	
	
	if typeof define is 'function' && define.amd
		define 'chip', chip
	else if typeof exports is 'object' and typeof module is 'object'
		global.chip = chip
		module.exports = chip
	else
		global.chip = chip
)(this)