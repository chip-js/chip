# # Default Bindings


chip.binding 'debug', 200, (element, expr, controller) ->
  controller.watch expr, (value) ->
    console?.info 'Debug:', expr, '=', value


# ## chip-route
# Placeholder for routing and others
chip.binding('route', ->).keepAttribute = true


# ## chip-text
# Adds a handler to display text inside an element.
#
# **Example:**
# ```xml
# <h1 chip-text="post.title">Title</h1>
# <div class="info">
#   Written by
#   <span chip-text="post.author.name">author</span>
#   on
#   <span chip-text="post.date.toLocaleDateString()">date</span>.
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
chip.binding 'text', (element, expr, controller) ->
  controller.watch expr, (value) ->
    element.text(if value? then value else '')


# ## chip-html
# Adds a handler to display unescaped HTML inside an element. Be sure it's trusted!
#
# **Example:**
# ```xml
# <h1 chip-text="post.title">Title</h1>
# <div chip-html="post.body"></div>
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
chip.binding 'html', (element, expr, controller) ->
  controller.watch expr, (value) ->
    element.html(if value? then value else '')


# ## chip-trim
# Adds a handler to trim whitespace text nodes inside an element.
#
# **Example:**
# ```xml
# <div chip-trim class="info">
#   <span chip-text="post.author.name">author</span>
#   <span chip-text="post.date.toLocaleDateString()">date</span>
# </div>
# ```
# *Result:*
# ```xml
# <div class="info"><span>Jacob Wright</span><span>10/16/2013</span></div>
# ```
chip.binding 'trim', (element, expr, controller) ->
  node = element.get(0).firstChild
  while node
    next = node.nextSibling
    if node.nodeType is Node.TEXT_NODE
      if node.nodeValue.match /^\s*$/
        node.parentNode.removeChild node
      else
        node.textContent = node.textContent.trim()
    node = next


# ## chip-translate
# Adds a handler to translate the text inside an element.
#
# **Example:**
# ```xml
# <h1 chip-translate>Welcome <span chip-text="name"></span>!</h1>
# ```
# *Initial Result:*
# ```xml
# <h1>Welcome <span>Jacob</span>!</h1>
# ```
# *Result after changing the translations with*
# ```
# app.translate({"Welcome %{0}!":"Sup %{0} Yo!"})
# ```
# ```xml
# <h1>Sup <span>Jacob</span> Yo!</h1>
# ```
chip.binding 'translate', (element, expr, controller) ->
  nodes = element.get(0).childNodes
  text = ''
  placeholders = []
  for node, i in nodes
    if node.nodeType is 3
      # Don't include whitespace at the beginning and end of the translated string
      unless node.nodeValue.trim() is '' and (i is 0 or i is nodes.length - 1)
        text += node.nodeValue
    else if node.nodeType is 1
      text += '%{' + placeholders.length + '}'
      placeholders.push node
  
  refresh = ->
    translation = controller.translations[text] or text
    exp = /%{(\d+)}/g
    nodes = []
    lastIndex = 0
    while (match = exp.exec translation)
      startIndex = exp.lastIndex - match[0].length
      if lastIndex isnt startIndex
        nodes.push document.createTextNode translation.slice lastIndex, startIndex
      nodes.push placeholders[match[1]]
      lastIndex = exp.lastIndex
    
    if lastIndex isnt translation.length
      nodes.push document.createTextNode translation.slice lastIndex
    
    element.html nodes
  
  element.on 'remove', -> controller.off 'translationChange', refresh
  controller.on 'translationChange', refresh
  
  # don't process if no translation is loaded
  if controller.translations[text]
    refresh()


# ## chip-class
# Adds a handler to add classes to an element. If the value of the expression is a string, that string will be set as the
# class attribute. If the value is an array of strings, those will be set as the element classes. These two methods
# overwrite any existing classes. If the value is an object, each property of that object will be toggled on or off in
# the class list depending on whether the value of the property is truthy or falsey.
# 
# **Example:**
# ```xml
# <div chip-class="theClasses">
#   <button class="btn primary" chip-class="{highlight:ready}"></button>
# </div>
# ```
# *Result if `theClases` equals "red blue" and `ready` is `true`:*
# ```xml
# <div class="red blue">
#   <button class="btn primary highlight"></button>
# </div>
# ```
chip.binding 'class', (element, expr, controller) ->
  prevClasses = (element.attr('class') or '').split(/\s+/)
  prevClasses.pop() if prevClasses[0] is ''

  controller.watch expr, (value) ->
    if Array.isArray(value)
      value = value.join(' ')
    
    if typeof value is 'string'
      element.attr 'class', value.split(/\s+/).concat(prevClasses).join(' ')
    else if value and typeof value is 'object'
      for own className, toggle of value
        if toggle
          element.addClass(className)
        else
          element.removeClass(className)


# ## chip-active
# Adds a handler to add the class "active" to an element if the expression is truthy, or if no expression is
# provided it adds the "active" class if the element or it's first anchor child's href matches the URL in the browser.
#
# **Example:**
# ```xml
# <button class="btn btn-primary" chip-active="formValid">Submit</button>
# 
# <ul class="header-links">
#   <li chip-active><a href="/posts">My Blog</a></li>
#   <li chip-active><a href="/account">My Account</a></li>
#   <li chip-active><a href="/profile">Profile</a></li>
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
chip.binding 'active', (element, expr, controller) ->
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
      .filter('a')
      .add(element.find('a'))
      .first()
    link.on 'hrefChanged', refresh
    controller.on 'urlChange', refresh
    element.on 'remove', -> controller.off 'urlChange', refresh
    refresh()


# ## chip-active-section
# The same as active except that the active class is added for any URL which starts with the link (marks active for the
# whole section.
chip.binding 'active-section', (element, expr, controller) ->
  refresh = ->
    if link.length and location.href.indexOf(link.get(0).href) is 0
      element.addClass('active')
    else
      element.removeClass('active')
  
  link = element
    .filter('a')
    .add(element.find('a'))
    .first()
  link.on 'hrefChanged', refresh
  controller.on 'urlChange', refresh
  element.on 'remove', -> controller.off 'urlChange', refresh
  refresh()


# ## chip-value
# Adds a handler which sets the value of an HTML form element. This handler also updates the data as it is changed in
# the form element, providing two way binding.
#
# **Example:**
# ```xml
# <label>First Name</label>
# <input type="text" name="firstName" chip-value="user.firstName">
#
# <label>Last Name</label>
# <input type="text" name="lastName" chip-value="user.lastName">
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
chip.binding 'value', (element, expr, controller) ->
  prefix = controller.app.bindingPrefix
  watchExpr = expr
  if element.is('select')
    fieldExpr = element.attr(prefix + 'value-field')
    element.removeAttr(prefix + 'value-field')
    selectValueField = if fieldExpr then controller.eval(fieldExpr) else null
    chip.lastSelectValueField = selectValueField
  
  if element.is('option') and chip.lastSelectValueField
    selectValueField = chip.lastSelectValueField
    watchExpr += '.' + selectValueField

  # Handles input (checkboxes, radios), select, textarea, option
  getValue =
    if element.attr('type') is 'checkbox' # Handles checkboxes
      -> element.prop('checked')
    else if element.is(':not(input,select,textarea,option)') # Handles a group of radio inputs
      -> element.find('input:radio:checked').val()
    else if selectValueField and element.is('select')
      (realValue) ->
        if realValue
          $(element.get(0).options[element.get(0).selectedIndex]).data('value')
        else
          element.val()
    else # Handles other form inputs
      -> element.val()
  
  setValue =
    if element.attr('type') is 'checkbox'
      (value) -> element.prop('checked', value)
    else if element.is(':not(input,select,textarea,option)') # Handles a group of radio inputs
      (value) ->
        element.find('input:radio:checked').prop('checked', false) # in case the value isn't found in radios
        element.find('input:radio[value="' + value + '"]').prop('checked', true)
    else
      (value) ->
        strValue = selectValueField and value[selectValueField] or value
        strValue = '' + strValue if strValue?
        element.val(strValue)
        element.data('value', value) if selectValueField
  
  observer = controller.watch watchExpr, (value) ->
    if `getValue() != value` # Allows for string/number equality
      setValue controller.eval expr
  
  # Skips setting values on option elements since the user cannot change these with user input
  return if element.is 'option'
  
  # Sets initial element value. For SELECT elements allows child option element values to be set first.
  if element.is('select')
    controller.afterSync ->
      setValue controller.eval expr
      unless element.is('[readonly]')
        controller.evalSetter expr, getValue(true)
  else unless element.is('[readonly]')
    controller.evalSetter expr, getValue()
  
  events = element.attr(prefix + 'value-events') or 'change'
  element.removeAttr(prefix + 'value-events')
  if element.is ':text'
    element.on 'keydown', (event) ->
      if event.keyCode is 13
        element.trigger 'change'
  
  element.on events, ->
    if getValue() isnt observer.oldValue and not element.is('[readonly]')
      controller.evalSetter expr, getValue(true)
      observer.skipNextSync() # don't update this observer, user changed it
      controller.sync() # update other expressions looking at this data



# ## chip-[event]
# Adds a handler for each event name in the array. When the event is triggered the expression will be run.
# 
# **Events:**
# 
# * chip-click
# * chip-dblclick
# * chip-submit
# * chip-change
# * chip-focus
# * chip-blur
#
# **Example:**
# ```xml
# <form chip-submit="saveUser()">
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
[ 'click', 'dblclick', 'submit', 'change', 'focus', 'blur', 'keydown', 'keyup', 'paste' ]
  .forEach (name) ->
    chip.eventBinding(name)

# ## chip-[key event]
# Adds a handler which is triggered when the keydown event's `keyCode` property matches.
# 
# **Key Events:**
# 
# * chip-enter
# * chip-esc
#
# **Example:**
# ```xml
# <input chip-enter="window.alert(element.val())">
# ```
# *Result:*
# ```xml
# <input>
# ```
keyCodes = { enter: 13, esc: 27 }
for own name, keyCode of keyCodes
  chip.keyEventBinding(name, keyCode)

# ## chip-[control key event]
# Adds a handler which is triggered when the keydown event's `keyCode` property matches and the ctrlKey or metaKey is
# pressed.
# 
# **Key Events:**
# 
# * chip-ctrl-enter
#
# **Example:**
# ```xml
# <input chip-ctrl-enter="window.alert(element.val())">
# ```
# *Result:*
# ```xml
# <input>
# ```
chip.keyEventBinding('ctrl-enter', keyCodes.enter, true)

# ## chip-[attribute]
# Adds a handler to set the attribute of element to the value of the expression.
# 
# **Attributes:**
# 
# * chip-href
# * chip-src
# * chip-id
#
# **Example:**
# ```xml
# <img chip-src="user.avatarUrl">
# ```
# *Result:*
# ```xml
# <img src="http://cdn.example.com/avatars/jacwright-small.png">
# ```
attribs = [ 'href', 'src', 'id' ]
for name in attribs
  chip.attributeBinding(name)

# ## chip-[toggle attribute]
# Adds a handler to toggle an attribute on or off if the expression is truthy or falsey.
# 
# **Attributes:**
# 
# * chip-checked
# * chip-disabled
#
# **Example:**
# ```xml
# <label>Is Administrator</label>
# <input type="checkbox" chip-checked="user.isAdmin">
# <button chip-disabled="isProcessing">Submit</button>
# ```
# *Result if `isProcessing` is `true` and `user.isAdmin` is false:*
# ```xml
# <label>Is Administrator</label>
# <input type="checkbox">
# <button disabled>Submit</button>
# ```
[ 'checked', 'disabled' ].forEach (name) ->
  chip.attributeToggleBinding(name)


# ## animateIn/animateOut
# Adds a jquery plugin to allow an element to use CSS3 transitions or animations to animate in or out of the page. This
# is used with chip-if, chip-each, etc. to show and hide elements.
$.fn.animateIn = (callback) ->
  if @parent().length
    placeholder = $('<!---->')
    @before(placeholder)
    @detach()
  
  @addClass 'animate-in'
  
  if placeholder
    placeholder.after(this)
    placeholder.remove()
  
  setTimeout =>
    @removeClass 'animate-in'
    if callback
      if @willAnimate()
        @one 'webkittransitionend transitionend webkitanimationend animationend', -> callback()
      else
        callback()
  return this

$.fn.animateOut = (dontRemove, callback) ->
  if typeof dontRemove is 'function'
    callback = dontRemove
    dontRemove = false
  
  @triggerHandler 'remove' unless dontRemove
  duration = @cssDuration('transition') or @cssDuration('animation')
  if duration
    @addClass 'animate-out'
    done = =>
      clearTimeout timeout
      @off 'webkittransitionend transitionend webkitanimationend animationend', done
      @removeClass 'animate-out'
      if callback then callback() else @remove()
    
    @one 'webkittransitionend transitionend webkitanimationend animationend', done
    # backup to ensure it "finishes"
    timeout = setTimeout done, duration + 100
  else
    if callback then callback() else unless dontRemove then @remove()
  
  return this

$.fn.cssDuration = (property) ->
  time = @css(property + '-duration') or @css('-webkit-' + property + '-duration')
  millis = parseFloat time
  millis *= 1000 if /\ds/.test time
  millis or 0

$.fn.willAnimate = ->
  (@cssDuration 'transition' or @cssDuration 'animation') and true

# ## chip-if
# Adds a handler to show or hide the element if the value is truthy or falsey. Actually removes the element from the DOM
# when hidden, replacing it with a non-visible placeholder and not needlessly executing bindings inside.
#
# **Example:**
# ```xml
# <ul class="header-links">
#   <li chip-if="user"><a href="/account">My Account</a></li>
#   <li chip-if="user"><a href="/logout">Sign Out</a></li>
#   <li chip-if="!user"><a href="/login">Sign In</a></li>
# </ul>
# ```
# *Result if `user` is null:*
# ```xml
# <ul class="header-links">
#   <!--chip-if="user"-->
#   <!--chip-if="user"-->
#   <li><a href="/login">Sign In</a></li>
# </ul>
# ```
chip.binding 'if', 50, (element, expr, controller) ->
  prefix = controller.app.bindingPrefix
  template = element # use a placeholder for the element and the element as a template
  placeholder = $("<!--#{prefix}if=\"#{expr}\"-->").replaceAll(template)
  controllerName = element.attr(prefix + 'controller')
  element.removeAttr(prefix + 'controller')
  
  controller.watch expr, (value) ->
    if value
      if placeholder.parent().length
        element = template.clone().animateIn()
        controller.child element: element, name: controllerName, passthrough: true
        placeholder.replaceWith(element)
    else
      unless placeholder.parent().length
        element.before placeholder
        element.animateOut()

# ## chip-unless
# Adds a handler to show or hide the element if the value is truthy or falsey. Actually removes the element from the DOM
# when hidden, replacing it with a non-visible placeholder and not needlessly executing bindings inside.
#
# **Example:**
# ```xml
# <ul class="header-links">
#   <li chip-if="user"><a href="/account">My Account</a></li>
#   <li chip-if="user"><a href="/logout">Sign Out</a></li>
#   <li chip-unless="user"><a href="/login">Sign In</a></li>
# </ul>
# ```
# *Result if `user` is null:*
# ```xml
# <ul class="header-links">
#   <!--chip-if="user"-->
#   <!--chip-if="user"-->
#   <li><a href="/login">Sign In</a></li>
# </ul>
# ```
chip.binding 'unless', 50, (element, expr, controller) ->
  prefix = controller.app.bindingPrefix
  template = element # use a placeholder for the element and the element as a template
  placeholder = $("<!--#{prefix}unless=\"#{expr}\"-->").replaceAll(template)
  controllerName = element.attr(prefix + 'controller')
  element.removeAttr(prefix + 'controller')
  
  controller.watch expr, (value) ->
    unless value
      if placeholder.parent().length
        element = template.clone().animateIn()
        controller.child element: element, name: controllerName, passthrough: true
        placeholder.replaceWith(element)
    else
      unless placeholder.parent().length
        element.before placeholder
        element.animateOut()


# ## chip-each
# Adds a handler to duplicate an element for each item in an array. Creates a new controller for each item, optionally
# running the controller definition if `chip-controller` is set on the element after `chip-each`. The expression must
# be of the format `itemName in arrayName` where `itemName` is the name each item inside the array will be referenced
# by inside the element. `arrayName` is any expression, e.g. `post in user.getPosts()`.
#
# **Example:**
# ```xml
# <div chip-each="post in posts" chip-class="{featured:post.isFeatured}">
#   <h1 chip-text="post.title">Title</h1>
#   <div chip-html="post.body"></div>
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
chip.binding 'each', 100, (element, expr, controller) ->
  prefix = controller.app.bindingPrefix
  orig = expr
  [ itemName, expr ] = expr.split /\s+in\s+/
  unless itemName and expr
    throw "Invalid #{prefix}each=\"" +
      orig +
      '". Requires the format "item in list"' +
      ' or "key, propery in object".'
  
  controllerName = element.attr(prefix + 'controller')
  element.removeAttr(prefix + 'controller')
  [ itemName, propName ] = itemName.split /\s*,\s*/
  
  template = element # use a placeholder for the element and the element as a template
  placeholder = $("<!--#{prefix}each=\"#{expr}\"-->").replaceAll(template)
  elements = $()
  properties = {}
  value = null
      
  createElement = (item, index) ->
    newElement = template.clone()
    unless Array.isArray(value)
      properties[propName] = item if propName
      properties[itemName] = value[item]
    else
      properties[itemName] = item
      properties.index = index
    controller.child element: newElement, name: controllerName, properties: properties
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
        value.forEach (item, index) ->
          elements.push createElement item, index
        placeholder.after(elements).remove()
    
    else if Array.isArray(value) or (value and typeof value is 'object')
      unless Array.isArray(value)
        splices = compare.arrays Object.keys(value), Object.keys(oldValue)
      
      hasNew = 0
      splices.forEach (splice) -> hasNew += splice.addedCount

      splices.forEach (splice) ->
        args = [splice.index, splice.removed.length]
        
        newElements = []
        addIndex = splice.index
        while (addIndex < splice.index + splice.addedCount)
          item = value[addIndex]
          newElements.push createElement item, addIndex
          addIndex++
        
        removedElements = $ elements.splice.apply(elements, args.concat(newElements))
        
        if removedElements.length
          if elements.length - newElements.length is 0 # removing all existing elements
            removedElements.eq(0).before(placeholder)
          if hasNew
            removedElements.remove()
          else
            removedElements.animateOut()
        
        if newElements.length
          $(newElements).animateIn()
          if splice.index is 0
            if placeholder.parent().length
              placeholder.after(newElements).remove()
            else
              elements.eq(newElements.length).before(newElements)
          else
            elements.eq(splice.index - 1).after(newElements)


# ## chip-partial
# Adds a handler to set the contents of the element with the template and controller by that name. The expression may
# be just the name of the template/controller, or it may be of the format `expr as itemName with partialName` where
# `expr` is an expression who's value will be set to `itemName` on the conroller in the partial. Note: any binding
# attributes which appear after `chip-partial` will have the new value available if using the special format.
#
# **Example:**
# ```xml
# <!--<div chip-partial="userInfo"></div>-->
# <div chip-partial="getUser() as user with userInfo" chip-class="{administrator:user.isAdmin}"></div>
# 
# <script name="userInfo" type="text/html">
#   <span chip-text="user.name"></span>
# </script>
# ```
# *Result:*
# ```xml
# <!--<div chip-partial="userInfo"></div>-->
# <div class="administrator">
#   <span>Jacob</span>
# </div>
# ```
chip.binding 'partial', 50, (element, expr, controller) ->
  parts = expr.split /\s+as\s+|\s+with\s+/
  nameExpr = parts.pop()
  [ itemExpr, itemName ] = parts
  childController = null
  properties = {}
  
  if itemExpr and itemName
    controller.watch itemExpr, true, (value) ->
      childController[itemName] = value
  
  controller.watch nameExpr, (name) ->
    return unless name?
    element.animateOut ->
      element.html controller.template(name)
      if itemExpr and itemName
        properties[itemName] = controller.eval itemExpr
      element.animateIn()
      childController = controller.child element: element, name: name, properties: properties


# ## chip-controller
# Adds a handler to create a new controller for this element and its descendants. The value of the attribute is the
# controller definition name which will be run if provided. Use this when you want to sandbox controller values (such
# as a form) or provide functionality provided by that controller to the element.
#
# **Example:**
# ```xml
# <form chip-controller="userForm" chip-submit="saveUser()">
# </form>
# ```
# *Result if `formValid` is `true` and the browser is at "http://www.example.com/account":*
# ```xml
# <form>
# </form>
# ```
chip.binding 'controller', 30, (element, controllerName, controller) ->
  controller.child element: element, name: controllerName
