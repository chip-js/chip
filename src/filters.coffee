# # Default Filters

# ## filter
# Adds a filter to filter an array by the given filter function
chip.filter 'filter', (controller, value, filterFunc) ->
  return [] unless Array.isArray value
  return value unless filterFunc
  value.filter(filterFunc, controller)

# ## map
# Adds a filter to map an array or value by the given mapping function
chip.filter 'map', (controller, value, mapFunc) ->
  return value unless value? and mapFunc
  if Array.isArray value
    value.map(mapFunc, controller)
  else
    mapFunc.call(controller, value)

# ## reduce
# Adds a filter to reduce an array or value by the given reduce function
chip.filter 'reduce', (controller, value, reduceFunc, initialValue) ->
  return value unless value? and reduceFunc
  if Array.isArray value
    if arguments.length is 4 then value.reduce(reduceFunc, initialValue) else value.reduce(reduceFunc)
  else if arguments.length is 4
    reduceFunc(initialValue, value)

# ## reduce
# Adds a filter to reduce an array or value by the given reduce function
chip.filter 'slice', (controller, value, index, endIndex) ->
  if Array.isArray value
    value.slice(index, endIndex)
  else
    value


# ## date
# Adds a filter to format dates and strings
chip.filter 'date', (controller, value) ->
  return '' unless value
  unless value instanceof Date
    value = new Date(controller, value)
  return '' if isNaN value.getTime()
  value.toLocaleString()


# ## log
# Adds a filter to log the value of the expression, useful for debugging
chip.filter 'log', (controller, value, prefix = 'Log') ->
  console.log prefix + ':', value
  return value


# ## limit
# Adds a filter to limit the length of an array or string
chip.filter 'limit', (controller, value, limit) ->
  if value and typeof value.slice is 'function'
    if limit < 0
      value.slice limit
    else
      value.slice 0, limit
  else
    value


# ## sort
# Adds a filter to sort an array
chip.filter 'sort', (controller, value, sortFunc) ->
  return value unless sortFunc
  if typeof sortFunc is 'string'
    [prop,dir] = sortFunc.split(':')
    dir = if dir is 'desc' then -1 else 1
    sortFunc = (a, b) ->
      return dir if a[prop] > b[prop]
      return -dir if a[prop] < b[prop]
      return 0
  
  if Array.isArray value
    value.slice().sort(sortFunc)
  else
    value


# ## escape
# HTML escapes content. For use with other HTML-adding filters such as autolink.
#
# **Example:**
# ```xml
# <div chip-html="tweet.content | escape | autolink:true"></div>
# ```
# *Result:*
# ```xml
# <div>Check out <a href="https://github.com/teamsnap/chip" target="_blank">https://github.com/teamsnap/chip</a>!</div>
# ```
div = null
chip.filter 'escape', (controller, value) ->
  div = $('<div></div>') unless div
  div.text(controller, value or '').text()

# ## p
# HTML escapes content wrapping paragraphs in <p> tags.
#
# **Example:**
# ```xml
# <div chip-html="tweet.content | p | autolink:true"></div>
# ```
# *Result:*
# ```xml
# <div><p>Check out <a href="https://github.com/teamsnap/chip" target="_blank">https://github.com/teamsnap/chip</a>!</p>
# <p>It's great</p></div>
# ```
chip.filter 'p', (controller, value) ->
  div = $('<div></div>') unless div
  lines = (value or '').split(/\r?\n/)
  escaped = lines.map (line) -> div.text(line).text() or '<br>'
  '<p>' + escaped.join('</p><p>') + '</p>'


# ## br
# HTML escapes content adding <br> tags in place of newlines characters.
#
# **Example:**
# ```xml
# <div chip-html="tweet.content | br | autolink:true"></div>
# ```
# *Result:*
# ```xml
# <div>Check out <a href="https://github.com/teamsnap/chip" target="_blank">https://github.com/teamsnap/chip</a>!<br>
# It's great</div>
# ```
chip.filter 'br', (controller, value) ->
  div = $('<div></div>') unless div
  lines = (value or '').split(/\r?\n/)
  escaped = lines.map (line) -> div.text(line).text()
  escaped.join('<br>')


# ## newline
# HTML escapes content adding <p> tags at doulbe newlines and <br> tags in place of single newline characters.
#
# **Example:**
# ```xml
# <div chip-html="tweet.content | newline | autolink:true"></div>
# ```
# *Result:*
# ```xml
# <div><p>Check out <a href="https://github.com/teamsnap/chip" target="_blank">https://github.com/teamsnap/chip</a>!<br>
# It's great</p></div>
# ```
chip.filter 'newline', (controller, value) ->
  div = $('<div></div>') unless div
  paragraphs = (value or '').split(/\r?\n\s*\r?\n/)
  escaped = paragraphs.map (paragraph) ->
    lines = paragraph.split(/\r?\n/)
    escaped = lines.map (line) -> div.text(line).text()
    escaped.join('<br>')
  '<p>' + escaped.join('</p><p>') + '</p>'
  

# ## autolink
# Adds automatic links to escaped content (be sure to escape user content). Can be used on existing HTML content as it
# will skip URLs within HTML tags. Passing true in the second parameter will set the target to `_blank`.
#
# **Example:**
# ```xml
# <div chip-html="tweet.content | escape | autolink:true"></div>
# ```
# *Result:*
# ```xml
# <div>Check out <a href="https://github.com/teamsnap/chip" target="_blank">https://github.com/teamsnap/chip</a>!</div>
# ```
urlExp = /(^|\s|\()((?:https?|ftp):\/\/[\-A-Z0-9+\u0026@#\/%?=()~_|!:,.;]*[\-A-Z0-9+\u0026@#\/%=~(_|])/gi
chip.filter 'autolink', (controller, value, target) ->
  target = if target then ' target="_blank"' else ''
  ('' + value).replace /<[^>]+>|[^<]+/g, (match) ->
    return match if match.charAt(0) is '<'
    match.replace(urlExp, '$1<a href="$2"' + target + '>$2</a>')


chip.filter 'int', (controller, value) ->
  value = parseInt value
  if isNaN(value) then null else value
, (controller, value) ->
  value = parseInt value
  if isNaN(value) then null else value


chip.filter 'float', (controller, value) ->
  value = parseFloat value
  if isNaN(value) then null else value
, (controller, value) ->
  value = parseInt value
  if isNaN(value) then null else value
