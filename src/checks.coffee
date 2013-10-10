

diffObjectFromOldObject = (object, oldObject) ->
	added = {}
	removed = {}
	changed = {}

	# go through old object and look for things that are gone from object or changed in object
	for prop, oldValue of oldObject
		newValue = object[prop]
		
		# if value is undefined in both, it could have been added or removed still
		continue if newValue isnt undefined and newValue is oldValue
        
		# if value is gone in object, it was removed
		unless `(prop in object)`
			removed[prop] = undefined
			continue
		
		if newValue isnt oldValue
			changed[prop] = newValue
	
	# go through old object and look for things that are gone from object or changed in object
	for prop, newValue of object
		continue if `prop in oldObject`
		
		added[prop] = newValue
		
	if Array.isArray(object) and object.length isnt oldObject.length
		changed.length = object.length
	
	added: added
	removed: removed
	changed: changed
