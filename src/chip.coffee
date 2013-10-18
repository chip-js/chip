# # Chip

# > Chip.js 1.1.0
#
# > (c) 2013 Jacob Wright, TeamSnap
# Chip may be freely distributed under the MIT license.
# For all details and documentation:
# <https://github.com/teamsnap/chip/>

# Contents
# --------
# * [chip](chip.html) contains the namespace, templating, and routing functions for chip
# * [Observer](observer.html) provides a system to globally reevaluate bound expressions and dispatch updates
# * [Controller](controller.html) is used in the binding to attach data and run actions
# * [Binding](binding.html) is the base of the binding system
# * [Default binding handlers](bindings.html) registers the default binding handlers chip provides
# * [equality](equality.html) is a utility for comparing the equality of objects and arrays

# Initial setup
# -------------
# The global namespace. Everything is added onto `chip`
chip = {}
this.chip = chip

# Set up for AMD
if typeof define is 'function' && define.amd
	define 'chip', chip
else if typeof exports is 'object' and typeof module is 'object'
	module.exports = chip


# Templates
# ---------
# Store the templates here by name. They should be strings of HTML markup.
chip.templates = {}

# Set up templates by looking for them in the HTML page, then initialize page
$ ->
	$('script[type="text/html"]').each ->
		$this = $(this)
		name = $this.attr('name') or $this.attr('id')
		if name
			chip.templates[name] = $this.html()
			$this.remove()
	
	while (element = $('[data-controller]:first')).length
		name = element.attr 'data-controller'
		element.removeAttr 'data-controller'
		Controller.create element, name

# Get a template by name. This method may be overriden to get a jQuery element the way your app needs by setting
# `chip.getTemplate = function...` where the function returns a jQuery element
chip.getTemplate = (name) ->
	unless chip.templates.hasOwnProperty name
		throw 'Template "' + name + '" does not exist'
	$ chip.templates[name].trim()


chip.createAppController = (controller) ->
	root = $ 'html'
	chip.appController = if controller
		Controller.setup(root, controller, 'application')
	else
		Controller.create(root, null, 'application')


# Routing
# ------
# Create a route to be run when the given URL `path` is hit in the browser URL. The route `name` is used to load the
# template and controller by the same name. This template will be placed in the first element on page with a
# `data-route` attribute.
chip.route = (path, name, subroutes) ->
	if typeof name is 'function'
		subroutes = name
	
	if typeof name isnt 'string'
		name = path.replace(/^\//, '').replace(/\/\w/, (match) -> match.slice(1).toUpperCase())
	
	chip.route.parents = [] unless chip.route.parents
	parents = chip.route.parents.slice() # unmutable copy
	path = parents.join('') + path if parents.length # sub-route support
	
	Path.map(path).to -> chip.runRoute(name, parents)
	
	# `subroutes` should be a function like `(route) ->` which allows routes to be defined
	# relative to the route above it. When these routes are matched, the template and controller with that name will be
	# loaded into the first element with the `data-route` attribute within the outer one.
	# 
	# **Example:**
	#```javascript 
	# chip.route('/', 'home')
	# chip.route('/todos', 'todos', function(route) {
	#   route('/:id', 'todo')
	# })
	# ```
	if subroutes
		chip.route.parents.push path
		subroutes chip.route
		chip.route.parents.pop()


# Run a route which was defined by `chip.route`.
chip.runRoute = (name, parents) ->
	selector = ['[data-route]']
	selector.push '[data-route]' for path in parents
	# **Example:** a 3rd level subroute selector would be
	# ```javascript
	# $('[data-route] [data-route] [data-route]')
	# ```
	selector = selector.join(' ')
	container = $(selector)
	
	controller = container.data('controller')
	controller?.teardown?()
	
	template = chip.getTemplate(name)
	container.data('controller', controller).html(template)
	
	# TODO allow for a root controllers above this
	controller = Controller.create container, chip.appController, name
	controller.syncView()



# Set up the listeners for path changes. Chip uses the Path.js library for routing.
chip.listen = ->
	Path.history.listen()
	if Path.history.supported
		# Set listeners on links to catch their clicks and use pushState instead
		$(document).on 'click', 'a[href]', (event) ->
			event.preventDefault()
			Path.history.pushState {}, "", $(this).attr("href")
