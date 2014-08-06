# # Default Bindings


chip.binding 'bind-debug', priority: 200, (element, attr, controller) ->
  expr = attr.value
  controller.watch expr, (value) ->
    console?.info 'Debug:', expr, '=', value


# ## bind-route
# Placeholder for routing and others
chip.binding 'bind-route', keepAttribute: true, ->


# ## bind-text
# Adds a handler to display text inside an element.
#
# **Example:**
# ```xml
# <h1 bind-text="post.title">Title</h1>
# <div class="info">
#   Written by
#   <span bind-text="post.author.name">author</span>
#   on
#   <span bind-text="post.date.toLocaleDateString()">date</span>.
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
chip.binding 'bind-text', (element, attr, controller) ->
  expr = attr.value
  controller.watch expr, (value) ->
    element.text(if value? then value else '')


# ## bind-html
# Adds a handler to display unescaped HTML inside an element. Be sure it's trusted!
#
# **Example:**
# ```xml
# <h1 bind-text="post.title">Title</h1>
# <div bind-html="post.body"></div>
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
chip.binding 'bind-html', (element, attr, controller) ->
  expr = attr.value
  controller.watch expr, (value) ->
    element.html(if value? then value else '')


# ## bind-trim
# Adds a handler to trim whitespace text nodes inside an element.
#
# **Example:**
# ```xml
# <div bind-trim class="info">
#   <span bind-text="post.author.name">author</span>
#   <span bind-text="post.date.toLocaleDateString()">date</span>
# </div>
# ```
# *Result:*
# ```xml
# <div class="info"><span>Jacob Wright</span><span>10/16/2013</span></div>
# ```
chip.binding 'bind-trim', (element, attr, controller) ->
  node = element.get(0).firstChild
  while node
    next = node.nextSibling
    if node.nodeType is Node.TEXT_NODE
      if node.nodeValue.match /^\s*$/
        node.parentNode.removeChild node
      else
        node.textContent = node.textContent.trim()
    node = next


# ## bind-translate
# Adds a handler to translate the text inside an element.
#
# **Example:**
# ```xml
# <h1 bind-translate>Welcome <span bind-text="name"></span>!</h1>
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
chip.binding 'bind-translate', (element, attr, controller) ->
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


# ## bind-class
# Adds a handler to add classes to an element. If the value of the expression is a string, that string will be set as the
# class attribute. If the value is an array of strings, those will be set as the element classes. These two methods
# overwrite any existing classes. If the value is an object, each property of that object will be toggled on or off in
# the class list depending on whether the value of the property is truthy or falsey.
# 
# **Example:**
# ```xml
# <div bind-class="theClasses">
#   <button class="btn primary" bind-class="{highlight:ready}"></button>
# </div>
# ```
# *Result if `theClases` equals "red blue" and `ready` is `true`:*
# ```xml
# <div class="red blue">
#   <button class="btn primary highlight"></button>
# </div>
# ```
chip.binding 'bind-class', (element, attr, controller) ->
  expr = attr.value
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


chip.binding 'bind-attr', (element, attr, controller) ->
  expr = attr.value
  controller.watch expr, (value, oldValue, changes) ->
    if changes
      # use the change records to remove deleted properties which won't show up
      changes.forEach (change) ->
        if change.type is 'deleted' or not value[change.name]?
          element.removeAttr change.name
          element.trigger change.name + 'Changed'
        else
          element.attr change.name, value[change.name]
          element.trigger change.name + 'Changed'
    else if value and typeof value is 'object'
      for own attrName, attrValue of value
        if attrValue?
          element.attr attrName, attrValue
          element.trigger attrName + 'Changed'
        else
          element.removeAttr attrName
          element.trigger attrName + 'Changed'


# ## bind-active
# Adds a handler to add the class "active" to an element if the expression is truthy, or if no expression is
# provided it adds the "active" class if the element or it's first anchor child's href matches the URL in the browser.
#
# **Example:**
# ```xml
# <button class="btn btn-primary" bind-active="formValid">Submit</button>
# 
# <ul class="header-links">
#   <li bind-active><a href="/posts">My Blog</a></li>
#   <li bind-active><a href="/account">My Account</a></li>
#   <li bind-active><a href="/profile">Profile</a></li>
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
chip.binding 'bind-active', (element, attr, controller) ->
  expr = attr.value
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


# ## bind-active-section
# The same as active except that the active class is added for any URL which starts with the link (marks active for the
# whole section.
chip.binding 'bind-active-section', (element, attr, controller) ->
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


# ## bind-change-action
# Runs the action provided after the ! whenever the value before the ! changes.
# This is for advanced use and a generic example doesn't fit.
chip.binding 'bind-change-action', (element, attr, controller) ->
  expr = attr.value
  [ expr, action ] = expr.split /\s*!\s*/
  controller.watch expr, (value) ->
    controller.thisElement = element
    controller.eval action
    delete controller.thisElement


chip.binding 'bind-show', (element, attr, controller) ->
  expr = attr.value
  controller.watch expr, (value) ->
    if value then element.show() else element.hide()


chip.binding 'bind-hide', (element, attr, controller) ->
  expr = attr.value
  controller.watch expr, (value) ->
    if value then element.hide() else element.show()


# ## bind-value
# Adds a handler which sets the value of an HTML form element. This handler also updates the data as it is changed in
# the form element, providing two way binding.
#
# **Example:**
# ```xml
# <label>First Name</label>
# <input type="text" name="firstName" bind-value="user.firstName">
#
# <label>Last Name</label>
# <input type="text" name="lastName" bind-value="user.lastName">
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
chip.binding 'bind-value', (element, attr, controller) ->
  expr = attr.value
  watchExpr = expr

  fieldExpr = element.attr('bind-value-field')
  element.removeAttr('bind-value-field')

  if element.is('select')
    selectValueField = if fieldExpr then controller.eval(fieldExpr) else null
    chip.lastSelectValueField = selectValueField
  
  if element.is('option') and fieldExpr or chip.lastSelectValueField
    if fieldExpr
      selectValueField = controller.eval(fieldExpr)
    else
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
        strValue = selectValueField and value?[selectValueField] or value
        strValue = '' + strValue if strValue?
        element.val(strValue)
        element.data('value', value) if selectValueField
  
  observer = controller.watch watchExpr, (value) ->
    if getValue() isnt '' + value # Allows for string/number equality
      setValue controller.eval expr
  
  # Skips setting values on option elements since the user cannot change these with user input
  return if element.is 'option'
  
  # Sets initial element value. For SELECT elements allows child option element values to be set first.
  if element.is('select')
    element.one 'processed', ->
      setValue controller.eval expr
      unless element.is('[readonly]')
        controller.evalSetter expr, getValue(true)
  else unless element.is('[readonly]')
    controller.evalSetter expr, getValue()
  
  events = element.attr('bind-value-events') or 'change'
  element.removeAttr('bind-value-events')
  if element.is ':text'
    element.on 'keydown', (event) ->
      if event.keyCode is 13
        element.trigger 'change'
  
  element.on events, ->
    if getValue() isnt observer.oldValue and not element.is('[readonly]')
      controller.evalSetter expr, getValue(true)
      observer.skipNextSync() # don't update this observer, user changed it
      controller.sync() # update other expressions looking at this data



# ## on-[event]
# Adds a handler for each event name in the array. When the event is triggered the expression will be run.
# 
# **Example Events:**
# 
# * on-click
# * on-dblclick
# * on-submit
# * on-change
# * on-focus
# * on-blur
#
# **Example:**
# ```xml
# <form on-submit="saveUser()">
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
chip.binding 'on-*', (element, attr, controller) ->
  eventName = attr.match
  expr = attr.value
  element.on eventName, (event) ->
    # prevent native events, let custom events use this mechanism
    if event.originalEvent
      event.preventDefault()
    unless element.attr('disabled')
      controller.eval expr, event: event, element: element


# ## on-[key event]
# Adds a handler which is triggered when the keydown event's `keyCode` property matches.
# 
# **Key Events:**
# 
# * on-enter
# * on-esc
#
# **Example:**
# ```xml
# <input on-enter="window.alert(element.val())">
# ```
# *Result:*
# ```xml
# <input>
# ```
keyCodes = { enter: 13, esc: 27 }
for own name, keyCode of keyCodes
  chip.keyEventBinding('on-' + name, keyCode)

# ## on-[control key event]
# Adds a handler which is triggered when the keydown event's `keyCode` property matches and the ctrlKey or metaKey is
# pressed.
# 
# **Key Events:**
# 
# * on-ctrl-enter
#
# **Example:**
# ```xml
# <input on-ctrl-enter="window.alert(element.val())">
# ```
# *Result:*
# ```xml
# <input>
# ```
chip.keyEventBinding('on-ctrl-enter', keyCodes.enter, true)

# ## attr-[attribute]
# Adds a handler to set the attribute of element to the value of the expression.
# 
# **Example Attributes:**
# 
# * attr-checked
# * attr-disabled
# * attr-multiple
# * attr-readonly
# * attr-selected
#
# **Example:**
# ```xml
# <img attr-src="user.avatarUrl">
# ```
# *Result:*
# ```xml
# <img src="http://cdn.example.com/avatars/jacwright-small.png">
# ```
chip.binding 'attr-*', (element, attr, controller) ->
  if attr.name isnt attr.match # e.g. attr-href="someUrl"
    attrName = attr.match
    expr = attr.value
  else # e.g. href="http://example.com{{someUrl}}"
    attrName = attr.name
    expr = expression.revert attr.value

  controller.watch expr, (value) ->
    if value?
      element.attr attrName, value
      element.trigger attrName + 'Changed'
    else
      element.removeAttr attrName

# ## attr-[toggle attribute]
# Adds a handler to toggle an attribute on or off if the expression is truthy or falsey.
# 
# **Attributes:**
# 
# * attr-checked
# * attr-disabled
# * attr-multiple
# * attr-readonly
# * attr-selected
#
# **Example:**
# ```xml
# <label>Is Administrator</label>
# <input type="checkbox" attr-checked="user.isAdmin">
# <button attr-disabled="isProcessing">Submit</button>
# ```
# *Result if `isProcessing` is `true` and `user.isAdmin` is false:*
# ```xml
# <label>Is Administrator</label>
# <input type="checkbox">
# <button disabled>Submit</button>
# ```
[ 'attr-checked', 'attr-disabled', 'attr-multiple', 'attr-readonly', 'attr-selected' ].forEach (name) ->
  chip.attributeToggleBinding(name)


# ## animateIn/animateOut
# Adds a jquery plugin to allow an element to use CSS3 transitions or animations to animate in or out of the page. This
# is used with bind-if, bind-each, etc. to show and hide elements.
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


chip.binding.prepareScope = prepareScope = (element, attr, controller) ->
  template = $ element # use a placeholder for the element and the element as a template
  placeholder = $("<!--#{attr.name}=\"#{attr.value}\"-->")
  if controller.element[0] is element[0]
    frag = document.createDocumentFragment()
    frag.appendChild placeholder[0]
    element[0] = frag
  else
    element.replaceWith placeholder
  controllerName = element.attr('bind-controller')
  element.removeAttr('bind-controller')
  template: template, placeholder: placeholder, controllerName: controllerName

chip.binding.swapPlaceholder = swapPlaceholder = (placeholder, element) ->
  # A simple placeholder.replaceWith(element) but that works with fragments
  placeholder[0].parentNode.replaceChild element[0], placeholder[0]


# ## bind-if
# Adds a handler to show or hide the element if the value is truthy or falsey. Actually removes the element from the DOM
# when hidden, replacing it with a non-visible placeholder and not needlessly executing bindings inside.
#
# **Example:**
# ```xml
# <ul class="header-links">
#   <li bind-if="user"><a href="/account">My Account</a></li>
#   <li bind-if="user"><a href="/logout">Sign Out</a></li>
#   <li bind-if="!user"><a href="/login">Sign In</a></li>
# </ul>
# ```
# *Result if `user` is null:*
# ```xml
# <ul class="header-links">
#   <!--bind-if="user"-->
#   <!--bind-if="user"-->
#   <li><a href="/login">Sign In</a></li>
# </ul>
# ```
chip.binding 'bind-if', priority: 50, (element, attr, controller) ->
  expr = attr.value
  { template, placeholder, controllerName } = prepareScope element, attr, controller
  
  controller.watch expr, (value) ->
    if value
      if placeholder[0].parentNode
        element = template.clone().animateIn()
        controller.child element: element, name: controllerName, passthrough: true
        swapPlaceholder placeholder, element
    else
      unless placeholder[0].parentNode
        element.before placeholder
        element.animateOut()
  return false

# ## bind-unless
# Adds a handler to show or hide the element if the value is truthy or falsey. Actually removes the element from the DOM
# when hidden, replacing it with a non-visible placeholder and not needlessly executing bindings inside.
#
# **Example:**
# ```xml
# <ul class="header-links">
#   <li bind-if="user"><a href="/account">My Account</a></li>
#   <li bind-if="user"><a href="/logout">Sign Out</a></li>
#   <li bind-unless="user"><a href="/login">Sign In</a></li>
# </ul>
# ```
# *Result if `user` is null:*
# ```xml
# <ul class="header-links">
#   <!--bind-if="user"-->
#   <!--bind-if="user"-->
#   <li><a href="/login">Sign In</a></li>
# </ul>
# ```
chip.binding 'bind-unless', priority: 50, (element, attr, controller) ->
  expr = attr.value
  { template, placeholder, controllerName } = prepareScope element, attr, controller
  
  controller.watch expr, (value) ->
    unless value
      if placeholder[0].parentNode
        element = template.clone().animateIn()
        controller.child element: element, name: controllerName, passthrough: true
        swapPlaceholder placeholder, element
    else
      unless placeholder[0].parentNode
        element.before placeholder
        element.animateOut()
  return false


# ## bind-each
# Adds a handler to duplicate an element for each item in an array. Creates a new controller for each item, optionally
# running the controller definition if `bind-controller` is set on the element after `bind-each`. The expression must
# be of the format `itemName in arrayName` where `itemName` is the name each item inside the array will be referenced
# by inside the element. `arrayName` is any expression, e.g. `post in user.getPosts()`.
#
# **Example:**
# ```xml
# <div bind-each="post in posts" bind-class="{featured:post.isFeatured}">
#   <h1 bind-text="post.title">Title</h1>
#   <div bind-html="post.body"></div>
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
chip.binding 'bind-each', priority: 100, (element, attr, controller) ->
  orig = expr = attr.value
  { template, placeholder, controllerName } = prepareScope element, attr, controller
  [ itemName, expr ] = expr.split /\s+in\s+/
  [ itemName, propName ] = itemName.split /\s*,\s*/
  unless itemName and expr
    throw "Invalid bind-each=\"" +
      orig +
      '". Requires the format "item in list"' +
      ' or "key, propery in object".'
  
  
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
        splices = diff.arrays Object.keys(value), Object.keys(oldValue)
      
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
  return false


# ## bind-partial
# Adds a handler to set the contents of the element with the template and controller by that name. The expression may
# be just the name of the template/controller, or it may be of the format `partialName`. Use the local-* binding
# to pass data into a partial.

# **Example:**
# ```xml
# <!--<div bind-partial="userInfo"></div>-->
# <div bind-partial="userInfo" local-user="getUser()" bind-class="{administrator:user.isAdmin}"></div>
# 
# <script name="userInfo" type="text/html">
#   <span bind-text="user.name"></span>
# </script>
# ```
# *Result:*
# ```xml
# <!--<div bind-partial="userInfo"></div>-->
# <div class="administrator">
#   <span>Jacob</span>
# </div>
# ```
chip.binding 'bind-partial', priority: 40, (element, attr, controller) ->
  expr = attr.value
  childController = null
  if element.children().length
    properties = _partialContent: element.children().remove()
  else
    properties = _partialContent: null
  
  if element.is('iframe')
      element.css
        border: 'none'
        background: 'none transparent'
        width: '100%'
  
  controller.watch expr, (name) ->
    if element.is('iframe')
      element.data('body')?.triggerHandler('remove')
      element.data('body')?.html('')
      element.removeData('body')
      return unless name

      setup = (body) ->
        body.siblings('head')
          .html($('link[rel="stylesheet"][href]').clone())
          .append '''<style>
body {
  background: none transparent;
  width: auto;
  min-width: 0;
  margin: 0;
  padding: 0;
}
</style>'''
        body.html controller.template(name)
        childController = controller.child element: body, name: name, properties: properties
        element.height body.outerHeight()
        element.data('body', body)

      try
        setup element.contents().find('body')
      catch e # cross domain issues
        element.one 'load', -> setup element.contents().find('body')
        element.attr 'src', 'about:blank'
    else
      element.animateOut ->
        element.html('')
        return unless name?
        element.html controller.template(name)
        element.animateIn()
        childController = controller.child element: element, name: name, properties: properties
  return false


# ## local-*
# You may pass data into bind-partial, bind-each, bind-if, or bind-controller using this wildcard
# binding by using attributes prefixed with `local-`. The attribute name portion that follows `local-`
# will be converted to camelCase and the value will be set locally. Examples:
# `local-link="user.addressUrl"` will pass the value of `user.addressUrl` into the partial as `link`.
# `local-post-body="user.description"` will pass the value of `user.description` into the partial as `postBody`.
chip.binding 'local-*', priority: 20, (element, attr, controller) ->
  expr = attr.value
  prop = attr.camel
  if expr
    controller.watch expr, (value) ->
      controller[prop] = value
    # make a two-way binding if it doesn't end in a method
    if expr.slice(-1) isnt ')'
      controller.watch prop, true, (value) ->
        # Set on the parent
        controller.parent.passthrough().evalSetter expr, value
  else
    controller[prop] = true


# ## bind-content
# Allows an element with a `bind-partial` attribute to include HTML within it that may be inserted somewhere
# inside the partial's template.
chip.binding 'bind-content', priority: 40, (element, attr, controller) ->
  # Allow a default if content wasn't provided by the partial
  if controller._partialContent
    element.html controller._partialContent


# ## bind-controller
# Adds a handler to create a new controller for this element and its descendants. The value of the attribute is the
# controller definition name which will be run if provided. Use this when you want to sandbox controller values (such
# as a form) or provide functionality provided by that controller to the element.
#
# **Example:**
# ```xml
# <form bind-controller="userForm" bind-submit="saveUser()">
# </form>
# ```
# *Result if `formValid` is `true` and the browser is at "http://www.example.com/account":*
# ```xml
# <form>
# </form>
# ```
chip.binding 'bind-controller', priority: 30, (element, attr, controller) ->
  controllerName = attr.value
  controller.child element: element, name: controllerName
  return false
