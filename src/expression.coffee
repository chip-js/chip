# # Chip Expression

# Parses a string of JavaScript into a function which can be bound to a scope.
# 
# Allows undefined or null values to return undefined rather than throwing
# errors, allows for filters on data, and provides detailed error reporting.

# The expression object with its expression cache.
expression = {
  cache: {}
  globals: ['true', 'false', 'window', 'this']
}

# Tests whether an expression is inverted. An inverted expression will look like
# `/user/{{user.id}}` instead of `'/user/' + user.id`
expression.isInverted = (expr) ->
  expr.match(invertedExpr) and true

# Reverts an inverted expression from `/user/{{user.id}}` to `"/user/" + user.id`
expression.revert = (expr) ->
  expr = '"' + expr.replace(invertedExpr, (match, expr) -> '" + ' + expr + ' + "') + '"'
  expr.replace(/^"" \+ | \+ ""$/g, '')


# Creates a function from the given expression. An `options` object may be
# provided with the following options:
# * `args` is an array of strings which will be the function's argument names
# * `globals` is an array of strings which define globals available to the
# function (these will not be prefixed with `this.`). `'true'`, `'false'` and,
# `'null'`, and `'window'` are included by default.
#
# This function will be cached so subsequent calls with the same expression will
# return the same function. E.g. the expression "name" will always return a
# single function with the body `return this.name`.
# 
# The function's scope expects an object named `_filters` on it to provide the
# filters that the expressions may use.
expression.get = (expr, options = {}) ->
  args = options.args or []
  cacheKey = expr + '|' + args.join(',')
  # Returns the cached function for this expression if it exists.
  func = expression.cache[cacheKey]
  return func if func

  # Prefix all property lookups with the `this` keyword. Ignores keywords
  # (window, true, false) and extra args 
  body = expression.parse expr, options
  
  try
    func = expression.cache[cacheKey] = Function(args..., body)
  catch e
    # Throws an error if the expression was not valid JavaScript
    if console
      console.error 'Bad expression:\n`' + expr + '`\n' +
                    'Compiled expression:\n' + body
    throw new Error e.message
  func

  
  
# Compiles an expression and binds it in the given scope. This allows it to be
# called from anywhere (e.g. event listeners) while retaining the scope.
expression.bind = (expr, scope, options) ->
  expression.get(expr, options).bind(scope)

# determines whether an expression is inverted
invertedExpr = /{{(.*)}}/g

# finds all quoted strings
quoteExpr = /(['"\/])(\\\1|[^\1])*?\1/g

# finds all empty quoted strings
emptyQuoteExpr = /(['"\/])\1/g

# finds pipes that aren't ORs (` | ` not ` || `) for filters
pipeExpr = /\|(\|)?/g

# finds argument separators for filters (`arg1:arg2`)
argSeparator = /\s*:\s*/g

# matches property chains (e.g. `name`, `user.name`, and `user.fullName().capitalize()`)
propExpr = /((\{|,|\.)?\s*)([a-z$_\$](?:[a-z_\$0-9\.-]|\[['"\d]+\])*)(\s*(:|\(|\[)?)/gi

# links in a property chain
chainLinks = /\.|\[/g

# the property name part of links
chainLink = /\.|\[|\(/

# determines whether an expression is a setter or getter (`name` vs
# `name = 'bob'`)
setterExpr = /\s=\s/

ignore = null
strings = []
referenceCount = 0
currentReference = 0
currentIndex = 0
finishedChain = false
continuation = false

# Adds `this.` to the beginning of each valid property in an expression,
# processes filters, and provides null-termination in property chains
expression.parse = (expr, options) ->
  initParse expr, options
  expr = pullOutStrings expr
  expr = parseFilters expr
  expr = parseExpr expr
  expr = 'return ' + expr
  expr = putInStrings expr
  expr = addReferences expr
  expr


initParse = (expr, options) ->
  referenceCount = currentReference = 0
  # Ignores keywords and provided argument names
  ignore = expression.globals.concat(options?.globals or [], options?.args or [])
  strings.length = 0


# Adds placeholders for strings so we can process the rest without their content
# messing us up.
pullOutStrings = (expr) ->
  javascript = expr.replace quoteExpr, (str, quote) ->
    strings.push str
    return quote + quote # placeholder for the string


# Replaces string placeholders.
putInStrings = (expr) ->
  expr = expr.replace emptyQuoteExpr, ->
    return strings.shift()


# Prepends reference variable definitions
addReferences = (expr) ->
  if referenceCount
    refs = []
    for i in [1..referenceCount]
      refs.push '_ref' + i
    expr = 'var ' + refs.join(', ') + ';\n' + expr
  expr


parseFilters = (expr) ->
  # Removes filters from expression string
  expr = expr.replace pipeExpr, (match, orIndicator) ->
    return match if orIndicator
    return '@@@'

  filters = expr.split /\s*@@@\s*/
  expr = filters.shift()
  return expr unless filters.length

  # Processes the filters
  # If the expression is a setter the value will be run through the filters
  if setterExpr.test(expr)
    [ setter, value ] = expr.split setterExpr
    setter += ' = '
  else
    setter = ''
    value = expr

  filters.forEach (filter) ->
    args = filter.split(argSeparator)
    filterName = args.shift()
    args.unshift(value)
    args.push(true) if setter
    value = "_filters.#{filterName}.call(this, #{args.join(', ')})"
  
  setter + value


parseExpr = (expr) ->
  if setterExpr.test(expr)
    [ setter, value ] = expr.split ' = '
    setter = parsePropertyChains(setter).replace(/^\(|\)$/g, '') + ' = '
    value = parsePropertyChains value
    setter + value
  else
    parsePropertyChains expr


parsePropertyChains = (expr) ->
  javascript = ''
  # allow recursion into function args by resetting propExpr
  previousIndexes = [currentIndex, propExpr.lastIndex]
  currentIndex = 0
  propExpr.lastIndex = 0
  javascript += js while (js = nextChain expr) isnt false
  propExpr.lastIndex = previousIndexes.pop()
  currentIndex = previousIndexes.pop()
  javascript


nextChain = (expr) ->
  return (finishedChain = false) if finishedChain
  match = propExpr.exec expr
  unless match
    finishedChain = true # make sure next call we return false
    return expr.slice currentIndex

  # `objIndicator` is `{` or `,` and let's us know this is an object property
  # name (e.g. prop in `{prop:false}`).
  # `prefix` is `objIndicator` with the whitespace that may come after it.
  # `propChain` is the chain of properties matched (e.g. `this.user.email`).
  # `colonOrParen` matches the colon (:) after the property (if it is an object)
  # or parenthesis if it is a function. We use `colonOrParen` and `objIndicator`
  # to know if it is an object.
  # `postfix` is the `colonOrParen` with whitespace before it.
  [match, prefix, objIndicator, propChain, postfix, colonOrParen] = match
  skipped = expr.slice currentIndex, propExpr.lastIndex - match.length
  currentIndex = propExpr.lastIndex
  
  # skips object keys e.g. test in `{test:true}`.
  return skipped + match if objIndicator and colonOrParen is ':'

  skipped + parseChain(prefix, propChain, postfix, colonOrParen, expr)


splitLinks = (chain) ->
  index = 0
  parts = []
  while (match = chainLinks.exec chain)
    continue if chainLinks.lastIndex is 1
    parts.push chain.slice(index, chainLinks.lastIndex - 1)
    index = chainLinks.lastIndex - 1
  parts.push chain.slice(index)
  parts


addThis = (chain) ->
  if ignore.indexOf(chain.split(chainLink).shift()) is -1
    "this.#{chain}"
  else
    chain


parseChain = (prefix, propChain, postfix, paren, expr) ->
  # continuations after a function (e.g. `getUser(12).firstName`).
  continuation = prefix is '.'
  if continuation
    propChain = '.' + propChain
    prefix = ''

  links = splitLinks propChain
  newChain = ''

  if links.length is 1 and not continuation and not paren
    link = links[0]
    newChain = addThis(link)
  else
    newChain = '(' unless continuation

    links.forEach (link, index) ->
      if index isnt links.length - 1
        newChain += parsePart(link, index)
      else
        unless parens[paren]
          newChain += "_ref#{currentReference}#{link})"
        else
          postfix = postfix.replace(paren, '')
          newChain += parseFunction link, index, expr
      return
  
  return prefix + newChain + postfix


parens =
  '(': ')'
  '[': ']'

# Handles a function to be called in its correct scope
# Finds the end of the function and processes the arguments
parseFunction = (link, index, expr) ->
  call = getFunctionCall(expr)
  link += call.slice(0, 1) + '~~insideParens~~' + call.slice(-1)
  insideParens = call.slice 1, -1
  
  if expr.charAt(propExpr.lastIndex) is '.'
    link = parsePart(link, index)
  else if index is 0
    link = parsePart(link, index)
    link += "_ref#{currentReference})"
  else
    link = "_ref#{currentReference}#{link})"
  
  ref = currentReference
  link = link.replace '~~insideParens~~', parsePropertyChains(insideParens)
  currentReference = ref
  link


# returns the call part of a function (e.g. `test(123)` would return `(123)`)
getFunctionCall = (expr) ->
  startIndex = propExpr.lastIndex
  open = expr.charAt startIndex - 1
  close = parens[open]
  endIndex = startIndex - 1
  parenCount = 1
  while endIndex++ < expr.length
    switch expr.charAt endIndex
      when open then parenCount++
      when close then parenCount--
    break if parenCount is 0
  currentIndex = propExpr.lastIndex = endIndex + 1
  open + expr.slice(startIndex, endIndex) + close



parsePart = (part, index) ->
  # if the first
  if index is 0 and not continuation
    if ignore.indexOf(part.split(/\.|\(|\[/).shift()) is -1
      part = "this.#{part}"
    else
      part = "#{part}"
  else
    part = "_ref#{currentReference}#{part}"
  
  currentReference = ++referenceCount
  ref = "_ref#{currentReference}"
  "(#{ref} = #{part}) == null ? undefined : "

chip.expression = expression
