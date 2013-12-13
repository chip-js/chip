# # Default Filters

# ## filter
# Adds a filter to filter an array by the given filter function
chip.filter 'filter', (value, filterFunc) ->
	return [] unless Array.isArray value
	return value unless filterFunc
	value.filter(filterFunc)


# ## date
# Adds a filter to format dates and strings
chip.filter 'date', (value) ->
	return '' unless value
	unless value instanceof Date
		value = new Date(value)
	return '' if isNaN value.getTime()
	value.toLocaleString()


# ## log
# Adds a filter to log the value of the expression, useful for debugging
chip.filter 'log', (value, prefix = 'Log') ->
	console.log prefix + ':', value
	return value


# ## limit
# Adds a filter to limit the length of an array or string
chip.filter 'limit', (value, limit) ->
	if value and typeof value.slice is 'function'
		if limit < 0
			value.slice limit
		else
			value.slice 0, limit
	else
		value


# ## sort
# Adds a filter to sort an array
chip.filter 'sort', (value, sortFunc) ->
	if Array.isArray value
		value.slice().sort(sortFunc)
	else
		value
