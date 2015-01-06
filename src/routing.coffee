# # Chip Routing
# Work inspired by and in some cases based off of work done for Express.js (https://github.com/visionmedia/express)
class Router
  
  # Events: error, change
  constructor: ->
    @routes = []
    @params = {}
    @paramsExp = {}
    @prefix = ''
    makeEventEmitter this
  
  
  # Registers a `callback` function to be called when the given param `name` is matched in a URL
  param: (name, callback) ->
    unless typeof callback is 'function' or callback instanceof RegExp
      throw new Error 'param must have a callback of type "function" or RegExp. Got ' + callback + '.'
    if typeof callback is 'function'
      (@params[name] or @params[name] = []).push(callback)
    else
      @paramsExp[name] = callback
    this
    
  
  # Registers a `callback` function to be called when the given path matches a URL. The callback receives two
  # arguments, `req`, and `next`, where `req` represents the request and has the properties, `url`, `path`, `params`
  # and `query`. `req.params` is an object with the parameters from the path (e.g. /:username/* would make a params
  # object with two properties, `username` and `*`). `req.query` is an object with key-value pairs from the query
  # portion of the URL.
  route: (path, callback) ->
    unless typeof callback is 'function'
      throw new Error 'route must have a callback of type "function". Got ' + callback + '.'
    
    if typeof path is 'string'
      path = '/' + path
      path = path.replace /\/{2,}/g, '/'
    @routes.push new Route path, callback
    this
  
  
  redirect: (url, replace = false) ->
    if url.charAt(0) is '.' or url.split('//').length > 1
      pathParts = document.createElement('a')
      pathParts.href = url
      url = pathname(pathParts) + pathParts.search
    else
      url = @prefix + url
    
    return if @currentUrl is url
    
    # Redirects if the url isn't at this page.
    if not @hashOnly and @root and url.indexOf(@root) isnt 0
      location.href = url
      return
    
    notFound = false
    @on 'error', (errHandler = (err) ->
      notFound = true if err is 'notFound'
    )
    
    if @usePushState
      if replace
        history.replaceState {}, '', url
      else
        history.pushState {}, '', url
      @currentUrl = url
      @dispatch url
    else
      if not @hashOnly
        url = url.replace @root, ''
        url = '/' + url if url.charAt(0) isnt '/'
      location.hash = if url is '/' then '' else '#' + url
    
    @off 'error', errHandler
    return not notFound
  
  
  listen: (options = {}) ->
    if options.stop
      $(window).off 'popstate hashChange', @_handleChange if @_handleChange
      return this
    
    @root = options.root if options.root?
    @prefix = options.prefix if options.prefix?
    @hashOnly = options.hashOnly if options.hashOnly?
    @usePushState = not @hashOnly and window.history?.pushState?
    @hashOnly = true if not @root? and not @usePushState
    @prefix = '' if @hashOnly
    getUrl = null
    
    @_handleChange = =>
      url = getUrl()
      return if @currentUrl is url
      @currentUrl = url
      @dispatch url
    
    if @usePushState
      # Fix the URL if linked with a hash
      if location.hash
        url = location.pathname.replace(/\/$/, '') + location.hash.replace /^#?\/?/, '/'
        history.replaceState({}, '', url)
      
      getUrl = -> location.pathname + location.search
      $(window).on 'popstate', @_handleChange
    else
      getUrl = =>
        if location.hash
          location.hash.replace(/^#\/?/, '/')
        else
          location.pathname + location.search
      $(window).on 'hashchange', @_handleChange
    
    @_handleChange()
    this


  getUrlParts: (url) ->
    urlParts = document.createElement('a')
    urlParts.href = url
    path = pathname(urlParts)
    return null if path.indexOf(@prefix) isnt 0
    path = path.replace @prefix, ''
    path = '/' + path if path.charAt(0) isnt '/'
    path: path, query: urlParts.search


  getRoutesMatchingPath: (path) ->
    return [] unless path?
    @routes.filter (route) =>
      return false unless route.match(path)
      for key, value of route.params
        continue unless @paramsExp[key]
        return false unless @paramsExp[key].test value
      return true

  
  
  # Dispatches all callbacks which match the `url`. `url` should be the full pathname of the location and should not
  # be used by your application. Use `redirect()` instead.
  dispatch: (url) ->
    urlParts = @getUrlParts(url)
    return unless urlParts
    path = urlParts.path
    req = url: url, path: path, query: parseQuery(urlParts.query)
    @trigger 'change', [path]

    routes = @getRoutesMatchingPath(path)
    callbacks = []
    
    routes.forEach (route) =>
      # set the params on the req object first
      callbacks.push (req, next) ->
        req.params = route.params
        next()
      
      for key, value of route.params
        continue unless @params[key]
        callbacks.push @params[key]...
      
      callbacks.push route.callback
    
    # Calls each callback one by one until either there is an error or we call all of them.
    next = (err) =>
      return @trigger('error', [err]) if err
      return next('notFound') if callbacks.length is 0
      callback = callbacks.shift()
      callback(req, next)
    
    if callbacks.length is 0
      next('notFound')
    else
      next()
    this
        

chip.Router = Router


# Defines a central routing object which handles all URL changes and routes.
class Route
  
  constructor: (path, callback) ->
    @path = path
    @callback = callback
    @keys = []
    @expr = parsePath path, @keys
  
  
  # Determines whether route matches path
  match: (path) ->
    return false unless (match = @expr.exec path)
    @params = {}
    
    for value, i in match
      continue if i is 0
      key = @keys[i - 1]
      value = decodeURIComponent(value) if typeof value is 'string'
      key = '*' unless key
      @params[key] = value
      
    true
  

chip.Route = Route


# Normalizes the given path string, returning a regular expression.
# 
# An empty array should be passed, which will contain the placeholder key names. For example `"/user/:id"` will then
# contain `["id"]`.
parsePath = (path, keys) ->
  return path if path instanceof RegExp
  path = '(' + path.join('|') + ')' if Array.isArray path
  
  path = path
    .concat('/?')
    .replace(/\/\(/g, '(?:/')
    .replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?(\*)?/g, (_, slash, format, key, capture, optional, star) ->
      keys.push key
      slash = slash or ''
      expr = ''
      expr += slash unless optional
      expr += '(?:'
      expr += slash if optional
      expr += format or ''
      expr += capture or (format and '([^/.]+?)' or '([^/]+?)') + ')'
      expr += optional or ''
      expr += '(/*)?' if star
      expr
    )
    .replace(/([\/.])/g, '\\$1')
    .replace(/\*/g, '(.*)')
  return new RegExp('^' + path + '$', 'i')


# Parses a location.search string into an object with key-value pairs.
parseQuery = (search) ->
  query = {}
  return query if search is ''
  
  search.replace(/^\?/, '').split('&').forEach (keyValue) ->
    [key, value] = keyValue.split('=')
    query[decodeURIComponent(key)] = decodeURIComponent(value)
  
  query

# Fix IE's missing slash prefix
pathname = (anchor) ->
  path = anchor.pathname
  path = '/' + path unless path.charAt(0) is '/'
  path