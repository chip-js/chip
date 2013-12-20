# # Chip App

# An App represents an app or module that can have routes, controllers, and templates defined. It may be mounted to
# another app allowing for modules. An App is created automatically if none are created explicitly.
class App
	
	# Creates a new app
	constructor: (appName) ->
		@name = appName
		@bindingPrefix = 'data-'
		@controllers = {}
		@templates = {}
		@router = new Router()
		@rootElement = $('html')
	
	
	# Initializes templates and controllers from the entire page or the `root` element if provided.
	init: (root) ->
		return @rootController if @inited
		@inited = true
		@rootElement = root if root
		@rootController = @createController element: @rootElement, name: 'application'
		app = this
		
		@rootElement.find('script[type="text/html"]').each ->
			$this = $(this)
			name = $this.attr('name') or $this.attr('id')
			if name
				app.template name, $this.html()
				$this.remove()
		
		while (element = @rootElement.find('[data-controller]:first')).length
			name = element.attr 'data-controller'
			element.removeAttr 'data-controller'
			@createController element: element, name: name, parent: @rootController

		@rootController
	
	
	# Templates
	# ---------
	
	# Defines a new template by name with the provided `content` string. If no `content` is given then returns a new
	# instance of a defined template. This instance is a jQuery element.
	template: (name, content) ->
		if arguments.length > 1
			@templates[name] = content
			this
		else
			unless @templates.hasOwnProperty name
				throw 'Template "' + name + '" does not exist'
			$ @templates[name].trim()
	
	
	# Controllers
	# ---------
	
	# Defines a new controller with the provided initialization function. Registers the `initFunction` function to with
	# `name` and the function will be called with the new controller as its only parameter every time one is
	# instantiated with that name.
	# 
	# Gets a controller by name if no `initFunction` is provided. Returns the `initFunction` previously registered or a
	# function on the global scope with the name `name + 'Controller'` (e.g. `function blogController(){}`).
	# 
	# **Example:**
	#```javascript
	# app.controller('home', function(controller) {
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
	controller: (name, initFunction) ->
		if arguments.length > 1
			@controllers[name] = initFunction
			this
		else
			@controllers[name] or window[name + 'Controller']
	
	
	# Creates a new controller. Sets `options.parent` as the parent controller to this one. Sets `options.properties`
	# properties onto the controller before binding and initialization. Binds `options.element` to the controller which
	# updates HTML as data updates. Initializes the new controller with the `options.name` function set in
	# `app.controller()`. Sets the new controller as a passthrough controller if `options.passthrough` is true.
	createController: (options = {}) ->
		# If `options.parent` is provided, the new controller will extend it. Any data or methods on the parent
		# controller will be available to the child unless overwritten by the child. This uses the prototype chain, thus
		# overwriting a property only sets it on the child and does not change the parent. The child cannot set data on
		# the parent, only read it or call methods on it.
		if options.parent instanceof Controller
			NewController = -> Controller.call(this)
			NewController.prototype = options.parent if options.parent
			controller = new NewController()
			controller.parent = options.parent
			if options.passthrough
				if options.parent.passthrough()
					controller.passthrough options.parent.passthrough()
				else
					controller.passthrough options.parent
		else
			controller = new Controller()
			makeEventEmitter(controller)
			
			# Sets instance of app on this controller as a top-level controller
			controller.app = this
		
		# If `extend` is provided, all properties from that object will be copied over to the controller before it is
		# initialized by its definition or bound to its element.
		if options.properties
			controller[key] = value for own key, value of options.properties
		
		# Creates a function on the controller to create child controllers
		controller.child = (options = {}) =>
			options.parent = controller
			@createController(options)
		
		# Creates a function on the controller to get template instances
		controller.template = (name) =>
			@template(name)
		
		if options.element
			# Assign element and add cleanup when the element is removed.
			options.element.on 'elementRemove', -> controller.closeController()
			controller.element = options.element
			options.element.data 'controller', controller
		
		# If `name` is supplied the controller definition by that name will be run to initialize this controller
		# before the bindings are set up.
		@controller(options.name)?(controller) if options.name
		
		# Binds the element to the new controller and then return it.
		if options.element
			options.element.bindTo controller
		
		controller
	
	
	# Routing
	# ------
	
	# Registers a `callback` function to be called when the given param `name` is matched in a URL
	param: (name, callback) ->
		wrappedCallback = (req, next) =>
			@rootController.params = req.params
			@rootController.query = req.query
			callback @rootController, next
		@router.param name, wrappedCallback
		this
	
	# Create a route to be run when the given URL `path` is hit in the browser URL. The route `name` is used to load the
	# template and controller by the same name. This template will be placed in the first element on page with a
	# `data-route` attribute.
	route: (path, handler) ->
		handler = path.replace /^\//, '' unless handler
		if typeof handler is 'string'
			name = handler
			callback = (req, next) =>
				@rootController.params = req.params
				@rootController.query = req.query
				
				container = @rootElement.find('[data-route]:first')
				container.html(@template(name))
				controller = @createController element: container, parent: @rootController, name: name
				controller.syncView()
		else
			callback = (req, next) =>
				@rootController.params = req.params
				@rootController.query = req.query
				handler @rootController, next
			
		@router.route path, callback
		this
	
	
	redirect: (url) ->
		@router.redirect(url)
	
	
	# Mounts an app to a URL prefix.
	mount: (path, app) ->
		
	
	# Listen to URL changes
	listen: (options) ->
		$ =>
			@router.on 'change', (event, path) =>
				@rootController.trigger 'urlChange', path
			
			router = @router
			@rootElement.on 'click', 'a[href]', (event) ->
				return if event.isDefaultPrevented() # if something else already handled this, we won't
				return if this.host isnt location.host or this.href is location.href + '#'
				event.preventDefault()
				event.stopPropagation()
				router.redirect $(this).attr("href")

			@router.listen options


chip.App = App
