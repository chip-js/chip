# # Chip Binding

# A Binding instance is created for each binding attribute in the DOM. Mostly the Binding class is used as a static
# place to register new bind handlers.
class Filter
	constructor: (@name, @filter) ->
	
	
	@filters: {}
	
	@addFilter: (name, filter) ->
		@filters[name] = new Filter name, filter
		this
	
	
	@runFilter: (name, value, args...) ->
		filter = @filters[name]?.filter or window[name]
		if filter
			return filter(value, args...)
		else
			console.error "Filter `#{filterName}` has not been defined."
			return value
	