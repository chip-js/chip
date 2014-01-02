
describe('Observer', function() {
	var obj
	var Observer = chip.Observer
	
	function getter() {
		return obj.name
	}
	
	beforeEach(function() {
		Observer.observers = [] // reset all observers
		obj = { name: 'test', age: 100 }
	})
	
	
	it('should call the callback initially', function() {
		var called = 0
		Observer.add(getter, function(value) {
			called++
		})
		
		expect(called).to.equal(1)
	})
	
	
	it('should not call the callback initially when skip requested', function() {
		var called = 0
		Observer.add(getter, true, function(value) {
			called++
		})
		
		expect(called).to.equal(0)
	})
	
	
	it('should not call the callback if the value hasn\'t changed', function() {
		var called = 0
		Observer.add(getter, function(value) {
			called++
		})
		expect(called).to.equal(1)
		
		Observer.sync()
		expect(called).to.equal(1)
	})
	
	
	it('should call the callback if the value changed', function() {
		var called = 0
		Observer.add(getter, function(value) {
			called++
		})
		expect(called).to.equal(1)
		
		obj.name = 'test2'
		Observer.sync()
		expect(called).to.equal(2)
	})
	
	
	it('should not call the callback if another value changed', function() {
		var called = 0
		Observer.add(getter, function(value) {
			called++
		})
		expect(called).to.equal(1)
		
		obj.age = 50
		Observer.sync()
		expect(called).to.equal(1)
	})
	
	
	it('should not call the callback after it is closed/removed', function() {
		var called = 0
		var observer = Observer.add(getter, function(value) {
			called++
		})
		expect(called).to.equal(1)
		
		observer.close()
		obj.name = 'test2'
		Observer.sync()
		expect(called).to.equal(1)
	})
	
	
	it('should not call the callback if requested to skip the next sync', function() {
		var called = 0
		var observer = Observer.add(getter, function(value) {
			called++
		})
		expect(called).to.equal(1)
		
		observer.skipNextSync()
		obj.name = 'test2'
		
		Observer.sync()
		expect(called).to.equal(1)
		
		Observer.sync()
		expect(called).to.equal(1)
		
		obj.name = 'test3'
		Observer.sync()
		expect(called).to.equal(2)
	})
	
})