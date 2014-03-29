# # Chip Compare
# > Based on work from Google's observe-js polyfill: https://github.com/Polymer/observe-js

# A namespace to store the functions on
compare = {}

(->
  # Creates a clone or copy of an array or object (or simply returns a string/number/boolean which are immutable)
  # Does not provide deep copies.
  compare.clone = (value, deep) ->
    if Array.isArray(value)
      if deep
        return value.map (value) -> compare.clone value, deep
      else
        return value.slice()
    else if value and typeof value is 'object'
      if value.valueOf() isnt value
        return new value.constructor value.valueOf()
      else
        copy = {}
        for key, objValue of value
          objValue = compare.clone objValue, deep if deep
          copy[key] = objValue
        return copy
    else
      value
  
  
  # Diffs two values, returning a truthy value if there are changes or `false` if there are no changes. If the two
  # values are both arrays or both objects, an array of changes (splices or change records) between the two will be
  # returned. Otherwise  `true` will be returned.
  compare.values = (value, oldValue) ->
    # If an array has changed calculate the splices
    if Array.isArray(value) and Array.isArray(oldValue)
      splices = compare.arrays value, oldValue
      return if splices.length then splices else false
    # If an object has changed calculate the chnages and call the callback
    else if value and oldValue and typeof value is 'object' and typeof oldValue is 'object'
      # Allow dates and Number/String objects to be compared
      valueValue = value.valueOf()
      oldValueValue = oldValue.valueOf()
      
      # Allow dates and Number/String objects to be compared
      if valueValue isnt value and oldValueValue isnt oldValue
        return valueValue isnt oldValueValue
      else
        changeRecords = compare.objects value, oldValue
        return if changeRecords.length then changeRecords else false
    # If a value has changed call the callback
    else
      return value isnt oldValue
  
  
  # Diffs two objects returning an array of change records. The change record looks like:
  # ```javascript
  # {
  #   object: object,
  #   type: 'deleted|updated|new',
  #   name: 'propertyName',
  #   oldValue: oldValue
  # }
  # ```
  compare.objects = (object, oldObject) ->
    changeRecords = []
  
    # Goes through the old object (should be a clone) and look for things that are now gone or changed
    for prop, oldValue of oldObject
      newValue = object[prop]
      
      # Allow for the case of obj.prop = undefined (which is a new property, even if it is undefined)
      continue if newValue isnt undefined and newValue is oldValue
          
      # If the property is gone it was removed
      unless `(prop in object)`
        changeRecords.push newChange object, 'deleted', prop, oldValue
        continue
      
      if newValue isnt oldValue
        changeRecords.push newChange object, 'updated', prop, oldValue
    
    # Goes through the old object and looks for things that are new
    for prop, newValue of object
      continue if `prop in oldObject`
      
      changeRecords.push newChange object, 'new', prop
    
    if Array.isArray(object) and object.length isnt oldObject.length
      changeRecords.push newChange object, 'updated', 'length', oldObject.length
    
    changeRecords
  
  
  # Creates a change record for the object changes
  newChange = (object, type, name, oldValue) ->
    object: object
    type: type
    name: name
    oldValue: oldValue
  
  
  
  
  
  EDIT_LEAVE = 0
  EDIT_UPDATE = 1
  EDIT_ADD = 2
  EDIT_DELETE = 3
  
  
  # Diffs two arrays returning an array of splices. A splice object looks like:
  # ```javascript
  # {
  #   index: 3,
  #   removed: [item, item],
  #   addedCount: 0
  # }
  # ```
  compare.arrays = (value, oldValue) ->
    currentStart = 0
    currentEnd = value.length
    oldStart = 0
    oldEnd = oldValue.length
    
    minLength = Math.min(currentEnd, oldEnd)
    prefixCount = sharedPrefix(value, oldValue, minLength)
    suffixCount = sharedSuffix(value, oldValue, minLength - prefixCount)
    
    currentStart += prefixCount
    oldStart += prefixCount
    currentEnd -= suffixCount
    oldEnd -= suffixCount
    
    if currentEnd - currentStart is 0 and oldEnd - oldStart is 0
      return []
    
    # if nothing was added, only removed from one spot
    if currentStart is currentEnd
      return [ newSplice(currentStart, oldValue.slice(oldStart, oldEnd), 0) ]
    
    # if nothing was removed, only added to one spot
    if oldStart is oldEnd
      return [ newSplice(currentStart, [], currentEnd - currentStart) ]
    
    # a mixture of adds and removes
    distances = calcEditDistances(value, currentStart, currentEnd, oldValue, oldStart, oldEnd)
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
        
        splice.removed.push oldValue[oldIndex]
        oldIndex++
      else if op is EDIT_ADD
        splice = newSplice(index, [], 0) unless splice
        
        splice.addedCount++
        index++
      else if op is EDIT_DELETE
        splice = newSplice(index, [], 0) unless splice
        
        splice.removed.push oldValue[oldIndex]
        oldIndex++
    
    splices.push(splice) if splice
    splices
  
  
  
  # find the number of items at the beginning that are the same
  sharedPrefix = (current, old, searchLength) ->
    for i in [0...searchLength]
      return i unless current[i] is old[i]
    return searchLength
  
  
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
    
).call(this)

chip.compare = compare
