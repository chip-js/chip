# # Chip Filter

# A Filter is stored to process the value of an expression in `controller.watch` (and thus most bindings which use
# `controller.watch`). This alters the value of what comes in with a function that returns a new value. Filters are
# added by using a single pipe character (`|`) followed by the name of the filter. Multiple filters can be used by
# chaining pipes with filter names. Filters may also have arguments passed to them by using the colon to separate
# arguments from the filter name. The signature of a filter should be `function (controller, value, args...)` where
# args are extra parameters passed into the filter after colons.
# 
# *Example:*
# ```js
# chip.filter('uppercase', function(controller, value) {
#   if (typeof value != 'string') return ''
#   return value.toUppercase()
# })
# 
# chip.filter('replace', function(controller, value, replace, with) {
#   if (typeof value != 'string') return ''
#   return value.replace(replace, with)
# })
# ```xml
# <h1 bind-text="title | uppercase | replace:'LETTER':'NUMBER'"></h1>
# ```
# *Result:*
# ```xml
# <h1>GETTING TO KNOW ALL ABOUT THE NUMBER A</h1>
# ```
# 
# A `valueFilter` is like a filter but used specifically with the `value` binding since it is a two-way binding. When
# the value of the element is changed a `valueFilter` can adjust the value from a string to the correct value type for
# the controller expression. The signature for a `valueFilter` includes the current value of the expression
# before the optional arguments (if any). This allows dates to be adjusted and possibley other uses.
# 
# *Example:*
# ```js
# chip.filter('numeric', function(controller, value) {
#   // value coming from the controller expression, to be set on the element
#   if (value == null || isNaN(value)) return ''
#   return value
# })
# 
# chip.filter('date-hour', function(controller, value) {
#   // value coming from the controller expression, to be set on the element
#   if ( !(currentValue instanceof Date) ) return ''
#   var hours = value.getHours()
#   if (hours >= 12) hours -= 12
#   if (hours == 0) hours = 12
#   return hours
# })
# ```xml
# <label>Number Attending:</label>
# <input size="4" bind-value="event.attendeeCount | numeric">
# <label>Time:</label>
# <input size="2" bind-value="event.date | date-hour"> :
# <input size="2" bind-value="event.date | date-minute">
# <select bind-value="event.date | date-ampm">
#   <option>AM</option>
#   <option>PM</option>
# </select>
# ```
class Filter
  constructor: (@name, @filter) ->
  
  @filters: {}
  
  @addFilter: (name, filter) ->
    @filters[name] = filter if filter?
    this
  
  
  @getFilter: (name) ->
    @filters[name]
