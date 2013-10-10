((global)->
	
	observers = []
	global.observers = observers
	
	
	setTimeout ->
		observers.calcSplices = calcSplices
		observers.diffObjects = diffObjects
	
	
	observers.add = (expr, triggerNow, callback) ->
		if typeof triggerNow is 'function'
			callback = triggerNow
			triggerNow = false
		
		value = expr()
		observer =
			expr: expr
			callback: callback
			oldValue: copyValue value
			close: -> observers.remove observer
		observers.push observer
		callback(value) if triggerNow
		observer
	
	
	observers.remove = (observer) ->
		index = observers.indexOf(observer)
		observers.splice(index, 1) if index
	
	
	observers.sync = ->
		observers.forEach (observer) ->
			value = observer.expr()
			if Array.isArray(value) and Array.isArray(observer.oldValue)
				splices = calcSplices value, observer.oldValue
				observer.callback(value, splices) if splices.length
			else if value and observer.oldValue and typeof value is 'object' and typeof observer.oldValue is 'object'
				changeRecords = diffObjects value, observer.oldValue
				observer.callback(value, changeRecords) if changeRecords.length
			else if value isnt observer.oldValue
				observer.callback(value)
			else
				return
			observer.oldValue = copyValue value
			return
	
		
		
	
	copyValue = (value) ->
		if Array.isArray(value)
			value.slice()
		else if value and typeof value is 'object'
			copyObject(value)
		else
			value
		
	
	
	

	diffObjects = (object, oldObject) ->
		changeRecords = []
	
		# go through old object and look for things that are gone from object or changed in object
		for prop, oldValue of oldObject
			newValue = object[prop]
			
			# if value is undefined in both, it could have been added or removed still
			continue if newValue isnt undefined and newValue is oldValue
	        
			# if value is gone in object, it was removed
			unless `(prop in object)`
				changeRecords.push newChange object, 'deleted', prop, oldValue
				continue
			
			if newValue isnt oldValue
				changeRecords.push newChange object, 'updated', prop, oldValue
		
		# go through old object and look for things that are gone from object or changed in object
		for prop, newValue of object
			continue if `prop in oldObject`
			
			changeRecords.push newChange object, 'new', prop
			
		if Array.isArray(object) and object.length isnt oldObject.length
			changeRecords.push newChange object, 'updated', 'length', oldObject.length
		
		changeRecords
	
	
	
	newChange = (object, type, name, oldValue) ->
		object: object
		type: type
		name: name
		oldValue: oldValue
	
	

	copyObject = (object) ->
		copy = if Array.isArray(object) then [] else {}
		for key, value of copy
			copy[key] = value
		if Array.isArray(object)
			copy.length = object.length
		return copy
	
	
	
	
	
	
	EDIT_LEAVE = 0
	EDIT_UPDATE = 1
	EDIT_ADD = 2
	EDIT_DELETE = 3
	
	
	# find all array differences in terms of splice objects {}
	calcSplices = (current, old) ->
		currentStart = 0
		currentEnd = current.length
		oldStart = 0
		oldEnd = old.length
		
		minLength = Math.min(currentEnd, oldEnd)
		prefixCount = sharedPrefix(current, old, minLength)
		suffixCount = sharedSuffix(current, old, minLength - prefixCount)
		
		currentStart += prefixCount
		oldStart += prefixCount
		currentEnd -= suffixCount
		oldEnd -= suffixCount
		
		if currentEnd - currentStart is 0 and oldEnd - oldStart is 0
			return []
		
		# if nothing was added, only removed from one spot
		if currentStart is currentEnd
			return [ newSplice(currentStart, old.slice(oldStart, oldEnd), 0) ]
		
		# if nothing was removed, only added to one spot
		if oldStart is oldEnd
			return [ newSplice(currentStart, [], currentEnd - currentStart) ]
		
		# a mixture of adds and removes
		distances = calcEditDistances(current, currentStart, currentEnd, old, oldStart, oldEnd)
		ops = spliceOperationsFromEditDistances distances
		
		splice = undefined
		splices = []
		index = currentStart
		oldIndex = oldStart
		
		for op in ops
			if op is EDIT_LEAVE
				if splice
					splices.push splice
					splice = undefined
				
				index++
				oldIndex++
			else if op is EDIT_UPDATE
				splice = newSplice(index, [], 0) unless splice
				
				splice.addedCount++
				index++
				
				splice.removed.push old[oldIndex]
				oldIndex++
			else if op is EDIT_ADD
				splice = newSplice(index, [], 0) unless splice
				
				splice.addedCount++
				index++
			else if op is EDIT_DELETE
				splice = newSplice(index, [], 0) unless splice
				
				splice.removed.push old[oldIndex]
				oldIndex++
		
		splices.push(splice) if splice
		splices
	
	
	
	# find the number of items at the beginning that are the same
	sharedPrefix = (current, old, searchLength) ->
		for i in [0...searchLength]
			return i unless current[i] is old[i]
		return length
	
	
	# find the number of items at the end that are the same
	sharedSuffix = (current, old, searchLength) ->
		index1 = current.length
		index2 = old.length
		count = 0
		while count < searchLength and current[--index1] is old[--index2]
			count++
		count
	
	newSplice = (index, removed, addedCount) ->
		index: index
		removed: removed
		addedCount: addedCount
	
	
	spliceOperationsFromEditDistances = (distances) ->
		i = distances.length - 1
		j = distances[0].length - 1
		current = distances[i][j]
		edits = []
		while i > 0 or j > 0
			if i is 0
				edits.push EDIT_ADD
				j--
				continue
			
			if j is 0
				edits.push EDIT_DELETE
				i--
				continue
			
			northWest = distances[i - 1][j - 1]
			west = distances[i - 1][j]
			north = distances[i][j - 1]
			
			if west < north
				min = if west < northWest then west else northWest
			else
				min = if north < northWest then north else northWest
			
			if min is northWest
				if northWest is current
					edits.push EDIT_LEAVE
				else
					edits.push EDIT_UPDATE
					current = northWest
				i--
				j--
			else if min is west
				edits.push EDIT_DELETE
				i--
				current = west
			else
				edits.push EDIT_ADD
				j--
				current = north
		edits.reverse()
		edits
	
	
	calcEditDistances = (current, currentStart, currentEnd, old, oldStart, oldEnd) ->
		# "Deletion" columns
		rowCount = oldEnd - oldStart + 1
		columnCount = currentEnd - currentStart + 1
		distances = new Array(rowCount)
		
		# "Addition" rows. Initialize null column.
		for i in [0...rowCount]
			distances[i] = new Array(columnCount)
			distances[i][0] = i
		
		# Initialize null row
		for j in [0...columnCount]
			distances[0][j] = j
		
		for i in [1...rowCount]
			for j in [1...columnCount]
				if current[currentStart + j - 1] is old[oldStart + i - 1]
					distances[i][j] = distances[i - 1][j - 1]
				else
					north = distances[i - 1][j] + 1
					west = distances[i][j - 1] + 1
					distances[i][j] = if north < west then north else west
		
		distances

)(this)