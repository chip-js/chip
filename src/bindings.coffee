# # Default Binding Handlers


Binding.addHandler 'debug', (element, expr, controller) ->
	controller.watch expr, (value) ->
		console.info 'Debug:', expr, '=', value


# ## data-text
# Adds a handler to display text inside an element.
#
# **Example:**
# ```xml
# <h1 data-text="post.title">Title</h1>
# <div class="info">
#   Written by
#   <span data-text="post.author.name">author</span>
#   on
#   <span data-text="post.date.toLocaleDateString()">date</span>.
# </div>
# ```
# *Result:*
# ```xml
# <h1>Little Red</h1>
# <div class="info">
#   Written by
#   <span>Jacob Wright</span>
#   on
#   <span>10/16/2013</span>.
# </div>
# ```
Binding.addHandler 'text', (element, expr, controller) ->
	controller.watch expr, (value) ->
		element.text(if value? then value else '')


# ## data-html
# Adds a handler to display unescaped HTML inside an element. Be sure it's trusted!
#
# **Example:**
# ```xml
# <h1 data-text="post.title">Title</h1>
# <div data-html="post.body"></div>
# ```
# *Result:*
# ```xml
# <h1>Little Red</h1>
# <div>
#   <p>Little Red Riding Hood is a story about a little girl.</p>
#   <p>
#     More info can be found on
#     <a href="http://en.wikipedia.org/wiki/Little_Red_Riding_Hood">Wikipedia</a>
#   </p>
# </div>
# ```
Binding.addHandler 'html', (element, expr, controller) ->
	controller.watch expr, (value) ->
		element.html(if value? then value else '')


# ## data-class
# Adds a handler to add classes to an element. If the value of the expression is a string, that string will be set as the
# class attribute. If the value is an array of strings, those will be set as the element classes. These two methods
# overwrite any existing classes. If the value is an object, each property of that object will be toggled on or off in
# the class list depending on whether the value of the property is truthy or falsey.
# 
# **Example:**
# ```xml
# <div data-class="theClasses">
#   <button class="btn primary" data-class="{highlight:ready}"></button>
# </div>
# ```
# *Result if `theClases` equals "red blue" and `ready` is `true`:*
# ```xml
# <div class="red blue">
#   <button class="btn primary highlight"></button>
# </div>
# ```
Binding.addHandler 'class', (element, expr, controller) ->
	controller.watch expr, (value) ->
		if Array.isArray(value)
			value = value.join(' ')
		
		if typeof value is 'string'
			element.attr('class', value)
		else if value and typeof value is 'object'
			for own className, toggle of value
				if toggle
					element.addClass(className)
				else
					element.removeClass(className)


# ## data-active
# Adds a handler to add the class "active" to an element if the expression is truthy, or if no expression is
# provided it adds the "active" class if the element or it's first anchor child's href matches the URL in the browser.
#
# **Example:**
# ```xml
# <button class="btn btn-primary" data-active="formValid">Submit</button>
# 
# <ul class="header-links">
#   <li data-active><a href="/posts">My Blog</a></li>
#   <li data-active><a href="/account">My Account</a></li>
#   <li data-active><a href="/profile">Profile</a></li>
# </ul>
# ```
# *Result if `formValid` is `true` and the browser is at "http://www.example.com/account":*
# ```xml
# <button class="btn btn-primary active">Submit</button>
# 
# <ul class="header-links">
#   <li><a href="/posts">My Blog</a></li>
#   <li class="active"><a href="/account">My Account</a></li>
#   <li><a href="/profile">Profile</a></li>
# </ul>
# ```
Binding.addHandler 'active', (element, expr, controller) ->
	if expr
		controller.watch expr, (value) ->
			if value
				element.addClass('active')
			else
				element.removeClass('active')
	else
		refresh = ->
			if link.length and link.get(0).href is location.href
				element.addClass('active')
			else
				element.removeClass('active')
		
		link = element
			.filter('a[href],a[data-href]')
			.add(element.find('a[href],a[data-href]'))
			.first()
		if link.attr('data-href')
			link.on 'hrefChanged', refresh
		$(document).on 'urlChange', refresh
		element.on 'elementRemove', -> $(document).off 'urlChange', refresh
		refresh()

Path.onchange = ->
	$(document).trigger('urlChange')


# ## data-value
# Adds a handler which sets the value of an HTML form element. This handler also updates the data as it is changed in
# the form element, providing two way binding.
#
# **Example:**
# ```xml
# <label>First Name</label>
# <input type="text" name="firstName" data-value="user.firstName">
#
# <label>Last Name</label>
# <input type="text" name="lastName" data-value="user.lastName">
# ```
# *Result:*
# ```xml
# <label>First Name</label>
# <input type="text" name="firstName" value="Jacob">
#
# <label>Last Name</label>
# <input type="text" name="lastName" value="Wright">
# ```
# And when the user changes the text in the first input to "Jac", `user.firstName` will be updated immediately with the
# value of `'Jac'`.
Binding.addHandler 'value', (element, expr, controller) ->
	getValue =
		if element.attr('type') is 'checkbox'
			-> element.prop('checked')
		else
			-> element.val()
	
	setValue =
		if element.attr('type') is 'checkbox'
			(value) -> element.prop('checked', value)
		else
			(value) -> element.val(value)
	
	observer = controller.watch expr, (value) ->
		if getValue() isnt value
			setValue value
	
	# Cannot set the value for filtered expressions since filters only convert data one-way
	return if controller.exprHasFilter(expr)
	
	setterController = controller.passthrough or controller
	setter = setterController.getBoundEval expr + ' = value', 'value'
	
	# Sets initial element value. For SELECT elements allows child option element values to be set first.
	if element.filter('select').length
		setTimeout ->
			setValue controller.eval expr
			setter getValue()
	else
		setter getValue()
	
	element.on 'keydown keyup change', -> # TODO set up the listeners which will update the value, not just for text inputs
		if getValue() isnt observer.oldValue
			setter getValue()
			observer.skipNextSync() # don't update this observer, user changed it
			controller.syncView() # update other expressions looking at this data


# ## data-[event]
# Adds a handler for each event name in the array. When the event is triggered the expression will be run.
# 
# **Events:**
# 
# * data-click
# * data-dblclick
# * data-submit
# * data-change
# * data-focus
# * data-blur
#
# **Example:**
# ```xml
# <form data-submit="saveUser()">
#   <input name="firstName" value="Jacob">
#   <button>Save</button>
# </form>
# ```
# *Result (events don't affect the HTML):*
# ```xml
# <form>
#   <input name="firstName" value="Jacob">
#   <button>Save</button>
# </form>
# ```
[ 'click', 'dblclick', 'submit', 'change', 'focus', 'blur' ]
	.forEach (name) ->
		Binding.addEventHandler(name)

# ## data-[key event]
# Adds a handler which is triggered when the keydown event's `keyCode` property matches.
# 
# **Key Events:**
# 
# * data-enter
# * data-esc
#
# **Example:**
# ```xml
# <input data-enter="window.alert(element.val())">
# ```
# *Result:*
# ```xml
# <input>
# ```
keyCodes = { enter: 13, esc: 27 }
for own name, keyCode of keyCodes
	Binding.addKeyEventHandler(name, keyCode)

# ## data-[control key event]
# Adds a handler which is triggered when the keydown event's `keyCode` property matches and the ctrlKey or metaKey is
# pressed.
# 
# **Key Events:**
# 
# * data-ctrl-enter
#
# **Example:**
# ```xml
# <input data-ctrl-enter="window.alert(element.val())">
# ```
# *Result:*
# ```xml
# <input>
# ```
Binding.addKeyEventHandler('ctrl-enter', keyCodes.enter, true)

# ## data-[attribute]
# Adds a handler to set the attribute of element to the value of the expression.
# 
# **Attributes:**
# 
# * data-href
# * data-src
# * data-id
#
# **Example:**
# ```xml
# <img data-src="user.avatarUrl">
# ```
# *Result:*
# ```xml
# <img src="http://cdn.example.com/avatars/jacwright-small.png">
# ```
attribs = [ 'href', 'src', 'id' ]
for name in attribs
	Binding.addAttributeHandler(name)

# ## data-[toggle attribute]
# Adds a handler to toggle an attribute on or off if the expression is truthy or falsey.
# 
# **Attributes:**
# 
# * data-checked
# * data-disabled
#
# **Example:**
# ```xml
# <label>Is Administrator</label>
# <input type="checkbox" data-checked="user.isAdmin">
# <button data-disabled="isProcessing">Submit</button>
# ```
# *Result if `isProcessing` is `true` and `user.isAdmin` is false:*
# ```xml
# <label>Is Administrator</label>
# <input type="checkbox">
# <button disabled>Submit</button>
# ```
[ 'checked', 'disabled' ].forEach (name) ->
	Binding.addAttributeToggleHandler(name)

# ## data-if
# Adds a handler to show or hide the element if the value is truthy or falsey. Actually removes the element from the DOM
# when hidden, replacing it with a non-visible placeholder and not needlessly executing bindings inside.
#
# **Example:**
# ```xml
# <ul class="header-links">
#   <li data-if="user"><a href="/account">My Account</a></li>
#   <li data-if="user"><a href="/logout">Sign Out</a></li>
#   <li data-if="!user"><a href="/login">Sign In</a></li>
# </ul>
# ```
# *Result if `user` is null:*
# ```xml
# <ul class="header-links">
#   <li style="display:none"><a href="/account">My Account</a></li>
#   <li style="display:none"><a href="/logout">Sign Out</a></li>
#   <li><a href="/login">Sign In</a></li>
# </ul>
# ```
Binding.addHandler 'if', 50, (element, expr, controller) ->
	template = element # use a placeholder for the element and the element as a template
	placeholder = $('<script type="text/if-placeholder"><!--' + expr + '--></script>').replaceAll(template)
	controllerName = element.attr('data-controller')
	element.removeAttr('data-controller')
	
	controller.watch expr, (value) ->
		if value
			if placeholder.parent().length
				element = template.clone()
				Controller.create element, controller, controllerName, passthrough: true
				placeholder.replaceWith(element)
		else
			unless placeholder.parent().length
				element.replaceWith(placeholder)


# ## data-repeat
# Adds a handler to duplicate an element for each item in an array. Creates a new controller for each item, optionally
# running the controller definition if `data-controller` is set on the element after `data-repeat`. The expression must
# be of the format `itemName in arrayName` where `itemName` is the name each item inside the array will be referenced
# by inside the element. `arrayName` is any expression, e.g. `post in user.getPosts()`.
#
# **Example:**
# ```xml
# <div data-repeat="post in posts" data-class="{featured:post.isFeatured}">
#   <h1 data-text="post.title">Title</h1>
#   <div data-html="post.body"></div>
# </div>
# ```
# *Result if there are 2 posts and the first one is featured:*
# ```xml
# <div class="featured">
#   <h1>Little Red</h1>
#   <div>
#     <p>Little Red Riding Hood is a story about a little girl.</p>
#     <p>
#       More info can be found on
#       <a href="http://en.wikipedia.org/wiki/Little_Red_Riding_Hood">Wikipedia</a>
#     </p>
#   </div>
# </div>
# <div>
#   <h1>Big Blue</h1>
#   <div>
#     <p>Some thoughts on the New York Giants.</p>
#     <p>
#       More info can be found on
#       <a href="http://en.wikipedia.org/wiki/New_York_Giants">Wikipedia</a>
#     </p>
#   </div>
# </div>
# ```
Binding.addHandler 'repeat', 100, (element, expr, controller) ->
	orig = expr
	[ itemName, expr ] = expr.split /\s+in\s+/
	unless itemName and expr
		throw 'Invalid data-repeat "'
		+ orig
		+ '". Requires the format "todo in todos"'
		+ ' or "key, prop in todos".' 
	
	controllerName = element.attr('data-controller')
	element.removeAttr('data-controller')
	[ itemName, propName ] = itemName.split /\s*,\s*/
	
	template = element # use a placeholder for the element and the element as a template
	placeholder = $('<script type="text/repeat-placeholder"><!--' + expr + '--></script>').replaceAll(template)
	elements = $()
	extend = {}
	value = null
			
	createElement = (item) ->
		newElement = template.clone()
		unless Array.isArray(value)
			extend[propName] = item if propName
			extend[itemName] = value[item]
		else
			extend[itemName] = item
		Controller.create newElement, controller, controllerName, extend
		newElement.get(0)
	
	controller.watch expr, (newValue, oldValue, splices) ->
		value = newValue
		
		if not splices # first time setup (or changing from/to an array value)
			if elements.length
				elements.eq(0).replaceWith(placeholder)
				elements.remove()
				elements = $()
			
			if newValue and not Array.isArray(newValue) and typeof newValue is 'object'
				newValue = Object.keys newValue
			
			if Array.isArray(value) and value.length
				value.forEach (item) ->
					elements.push createElement item
				placeholder.after(elements).remove()
		
		else if Array.isArray(value) or (value and typeof value is 'object')
			unless Array.isArray(value)
				splices = equality.array Object.keys(value, oldValue)
			
			splices.forEach (splice) ->
				args = [splice.index, splice.removed.length]
				
				newElements = []
				addIndex = splice.index
				while (addIndex < splice.index + splice.addedCount)
					item = value[addIndex]
					newElements.push createElement item
					addIndex++
				
				removedElements = $ elements.splice.apply(elements, args.concat(newElements))
				
				if removedElements.length
					if elements.length - newElements.length is 0 # removing all existing elements
						removedElements.eq(0).replaceWith(placeholder)
					removedElements.remove()
				
				if newElements.length
					if splice.index is 0
						if placeholder.parent().length
							placeholder.after(newElements).remove()
						else
							elements.eq(newElements.length).before(newElements)
					else
						elements.eq(splice.index - 1).after(newElements)


# ## data-partial
# Adds a handler to set the contents of the element with the template and controller by that name. The expression may
# be just the name of the template/controller, or it may be of the format `expr as itemName with partialName` where
# `expr` is an expression who's value will be set to `itemName` on the conroller in the partial. Note: any binding
# attributes which appear after `data-partial` will have the new value available if using the special format.
#
# **Example:**
# ```xml
# <!--<div data-partial="userInfo"></div>-->
# <div data-partial="getUser() as user with userInfo" data-class="{administrator:user.isAdmin}"></div>
# 
# <script name="userInfo" type="text/html">
#   <span data-text="user.name"></span>
# </script>
# ```
# *Result:*
# ```xml
# <!--<div data-partial="userInfo"></div>-->
# <div class="administrator">
#   <span>Jacob</span>
# </div>
# ```
Binding.addHandler 'partial', 50, (element, expr, controller) ->
	parts = expr.split /\s+as\s+\s+with\s+/
	nameExpr = parts.pop()
	[ itemExpr, itemName ] = parts
	childController = null
	extend = {}
	
	if itemExpr and itemName
		controller.watch itemExpr, true, (value) ->
			childController[itemName] = value
	
	controller.watch nameExpr, (name) ->
		return unless name?
		if itemExpr and itemName
			extend[itemName] = controller.eval itemExpr
		element.html chip.getTemplate(name)
		childController = Controller.create element, controller, name, extend


# ## data-controller
# Adds a handler to create a new controller for this element and its descendants. The value of the attribute is the
# controller definition name which will be run if provided. Use this when you want to sandbox controller values (such
# as a form) or provide functionality provided by that controller to the element.
#
# **Example:**
# ```xml
# <form data-controller="userForm" data-submit="saveUser()">
# </form>
# ```
# *Result if `formValid` is `true` and the browser is at "http://www.example.com/account":*
# ```xml
# <form>
# </form>
# ```
Binding.addHandler 'controller', 30, (element, controllerName, controller) ->
	Controller.create(element, controller, controllerName)
