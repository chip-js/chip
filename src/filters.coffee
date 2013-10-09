Array::refresh = -> # noop for non-filtered/sorted arrays


Array::removeBy = (filter) ->
	removed = []
	i = @length
	while i--
		value = @[i]
		if filter(value, i, this) is false
			removed.unshift @splice(i, 1)
	removed



Array::liveCopy = ->
	source = this
	copy = source.slice()
	modifySourceArray source
	modifyCopyArray copy
	source._liveCopies.push(copy)
	copy.refresh = ->
		source.refresh()
		this
	copy._source = source
	copy



Array::closeCopies = ->
	restoreSourceArray(this)



modifySourceArray = (source) ->
	return if source._liveCopies # already modified
	
	source._liveCopies = []
	
	source.refresh = ->
		@_liveCopies.forEach (copy) =>
			tmp = this
			tmp = @filter(copy._filter) if copy._filter
			tmp = @slice() if copy._sort and not copy._filter
			tmp.sort(copy._sort) if copy._sort
			
			# set the correct items into this array in the correct order
			tmp.forEach (item, index) ->
				copy[index] = item
			
			# remove anything extra at the end
			copy.length = tmp.length
		this
	
	source.push = (items...) ->
		Array::push.apply this, items
		@refresh()
	
	source.unshift = (items...) ->
		Array::push.apply this, items
		@refresh()
	
	source.pop = ->
		item = Array::pop.call(this)
		@refresh()
		item
	
	source.shift = ->
		item = Array::shift.call(this)
		@refresh()
		item
	
	source.splice = (index, count, items...) ->
		removed = Array::splice.call(this, index, count, items...)
		@refresh()
		removed



restoreSourceArray = (source) ->
	return unless source._liveCopies
	
	source._liveCopies.forEach (copy) ->
		delete copy._source
		delete copy.refresh
	delete source._liveCopies
	delete source.push
	delete source.unshift
	delete source.pop
	delete source.shift
	delete source.splice



modifyCopyArray = (copy) ->
	copy.applyFilter = (filter) ->
		@_filter = filter
		@refresh()
	
	copy.removeFilter = ->
		return unless @_filter
		delete @_filter
		@refresh()


	copy.applySort = (sort) ->
		@_sort = sort
		@refresh()


	copy.removeSort = ->
		return unless @_sort
		delete @_sort
		@refresh()
	
	
	copy.close = ->
		source = copy._source
		return unless source
		delete copy._source
		delete copy.refresh
		copies = source._liveCopies
		index = copies.indexOf(copy)
		return if index is -1
		copies.splice(index, 1)
		restoreArray(source) if copies.length is 0
		this

		