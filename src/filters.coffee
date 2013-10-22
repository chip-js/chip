# # Default Filters

# ## filter
# Adds a filter to filter an array by the given filter function
Controller.filters.filter = (controller, value, filterFunc) ->
	return [] unless Array.isArray value
	return value unless filterFunc
	value.filter(filterFunc)


# ## date
# Adds a filter to format dates and strings
Controller.filters.date = (controller, value) ->
	return '' unless value
	unless value instanceof Date
		value = new Date(value)
	return '' if isNaN value.getTime()
	value.toLocaleString()


# ## log
# Adds a filter to log the value of the expression, useful for debugging
Controller.filters.log = (controller, value, prefix = 'Log') ->
	console.log prefix + ':', value
	return value


# ## limit
# Adds a filter to limit the length of an array or string
Controller.filters.limit = (controller, value, limit) ->
	if value and typeof value.slice is 'function'
		if limit < 0
			value.slice limit
		else
			value.slice 0, limit
	else
		value


# ## sort
# Adds a filter to sort an array
Controller.filters.sort = (controller, value, sortFunc) ->
	if Array.isArray value
		value.slice().sort(sortFunc)
	else
		value
