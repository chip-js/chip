# # Chip App

# An App represents an app or module that can have routes, controllers, and templates defined. It may be mounted to
# another app allowing for modules. An App is created automatically if none are created explicitly.
class App
  
  # Creates a new app
  constructor: (appName) ->
    @name = appName
    @controllers = {}
    @templates = {}
    @router = new Router()
    @rootElement = $('html')
    @translations = {}
    @_emitter = makeEventEmitter(this)
    @router.on 'error', (event, err) => @trigger 'routeError', [err]
  
  
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
    
    while (element = @rootElement.find("[bind-controller]:first")).length
      name = element.attr "bind-controller"
      element.removeAttr "bind-controller"
      @createController element: element, name: name, parent: @rootController

    @rootController
  
  
  # Templates
  # ---------
  
  # Registers a new template by name with the provided `content` string. If no `content` is given then returns a new
  # instance of a defined template. This instance is a jQuery element.
  template: (name, content) ->
    if arguments.length > 1
      @templates[name] = content
      this
    else
      unless @templates.hasOwnProperty name
        throw 'Template "' + name + '" does not exist'
      $ @templates[name].trim()
  
  
  # Translations
  # ------------
  
  # Provides translation strings for the app. Set `merge` to `true` if you want to add translations rather than
  # replacing all of them with new ones.
  translate: (translations, merge) ->
    unless merge
      # Don't delete this object since controllers reference it.
      for key, value of @translations
        delete @translations[key]
    
    for key, value of translations
      @translations[key] = value
    
    @trigger 'translationChange', [@translations]
  
  
  # Controllers
  # ---------
  
  # Defines a controller initialization function. Registers the `initFunction` function with `name`. The function will
  # be called with an instance of a controller as its only parameter every time a controller is created with that
  # name.
  # 
  # If no `initFunction` is provided, returns the `initFunction` previously registered or if none has been registered
  # a function on the global scope with the name `name + 'Controller'` (e.g. `function blogController(){}`).
  # 
  # **Example:**
  #```javascript
  # app.controller('home', function(controller) {
  #   // do something as soon as it is instantiated
  #   MyAppAPI.loadUser(function(err, user) {
  #     controller.user = user
  #     controller.sync()
  #   })
  #
  #   // provide a function for the view to call. E.g. <button on-click="logout">Logout</button>
  #   controller.logout = function() {
  #     MyAppAPI.logout(function(err) {
  #       controller.user = null
  #       controller.sync()
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
      options.parent._children.push controller
      if options.passthrough
        controller.passthrough options.parent.passthrough()
    else
      controller = new Controller()
      makeEventEmitter(controller, @_emitter) # this will emit the same events as app, and visa-versa
      
      # Sets instance of app on this controller as a top-level controller
      controller.app = this
      controller.translations = @translations
      controller._filters = Filter.filters
    
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
      # Clean up old controller if one exists
      if (old = options.element.data 'controller')
        options.element.off 'remove.controller'
        old.closeController()
      
      # Assign element and add cleanup when the element is removed.
      options.element.one 'remove.controller', -> controller.closeController()
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
  # `bind-route` attribute.
  route: (path, handler, subroutes) ->
    handleRoute = (path, handler, subroutes, depth, before) =>
      if typeof handler is 'function' and handler.toString().match(/\(route\)/)
        subroutes = handler
        handler = null
      
      handler = path.replace /^\//, '' unless handler
      
      if typeof handler is 'string'
        name = handler
        callback = (req, next) =>
          if before and not req.calledBefore
            req.calledBefore = true
            before(req, callback)
            return
          @rootController.params = req.params
          @rootController.query = req.query
          selector = []
          selector.push("[bind-route]") for i in [0..depth]
          container = @rootElement.find selector.join(' ') + ':first'
          isExistingRoute = @rootController.route
          unless req.isSamePath?
            req.isSamePath = req.path is @rootController.path # handle query-string changes
          if container.length
            showNextPage = =>
              container.attr("bind-route", name)
              @rootController.route = name
              @rootController.path = req.path
              @trigger 'routeChange', [name]
              if req.isSamePath
                container.animateIn()
              else
                if container.willAnimate()
                  placholder = $('<!--container-->').insertBefore(container)
                  container.detach()
                  setTimeout ->
                    placholder.after(container).remove()
                    container.animateIn()
                container.html @template(name)
                parentController = container.parent().controller() or @rootController
                @createController element: container, parent: parentController, name: name
              @rootController.sync()
              window.scrollTo(0, 0)
              next(req, next) if subroutes
            
            if isExistingRoute
              container.animateOut(req.isSamePath, showNextPage)
            else
              showNextPage()
        
        # Adds the subroutes and only calls this callback before they get called when they match.
        if typeof subroutes is 'function'
          subroutes (subpath, handler, subroutes) =>
            subpath = '' if subpath is '/'
            handleRoute path + subpath, handler, subroutes, depth + 1, callback
          return
        
      else if typeof handler is 'function'
        # Subroutes not supported with callbacks, only with string handlers.
        callback = (req, next) =>
          @rootController.params = req.params
          @rootController.query = req.query
          handler @rootController, next
      else
        throw new Error('route handler must be a string path or a function')
      
      # Adds the callback to the route (unless subroutes existed).
      @router.route path, callback
    
    handleRoute(path, handler, subroutes, 0)
    this
  
  
  redirect: (url, replace = false) ->
    @router.redirect(url, replace)
  
  
  hasMatchingRoutes: (url) ->
    @router.getRoutesMatchingPath(url).length > 0
  
  
  # Mounts an app to a URL prefix.
  mount: (path, app) ->
    
  
  # Listen to URL changes
  listen: (options = {}) ->
    $ =>
      if options.stop
        @router.off 'change', @_routeHandler if @_routeHandler
        @rootElement.off 'click', @_clickHandler if @_clickHandler
        return @router.listen options
      
      app = this
      @_routeHandler = (event, path) =>
        @trigger 'urlChange', [path]
      
      @_clickHandler = (event) ->
        return unless (anchor = $(event.target).closest('a[href]').get(0))
        return if event.isDefaultPrevented() # if something else already handled this, we won't
        linkHost = anchor.host.replace(/:80$|:443$/, '')
        url = $(anchor).attr('href').replace(/^#/, '')
        return if (linkHost and linkHost isnt location.host)
        return if event.metaKey or event.ctrlKey or $(event.target).attr('target')
        return if options.dontHandle404s and not app.hasMatchingRoutes(url)
        event.preventDefault()
        return if anchor.href is location.href + '#'
        unless $(anchor).attr('disabled')
          app.redirect url
      
      @router.on 'change', @_routeHandler
      @rootElement.on 'click', @_clickHandler
      @router.listen options
    this


chip.App = App
