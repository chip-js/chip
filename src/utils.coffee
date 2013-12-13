
makeEventEmitter = (object) ->
	if object.trigger
		throw new Error('Object has already become an event emitter')
	eventEmitter = $({})
	object.on = eventEmitter.on.bind(eventEmitter)
	object.one = eventEmitter.one.bind(eventEmitter)
	object.off = eventEmitter.off.bind(eventEmitter)
	object.trigger = eventEmitter.trigger.bind(eventEmitter)
