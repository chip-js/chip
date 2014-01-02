
describe('makeEventEmitter', function() {
	var obj
	
	beforeEach(function() {
		obj = {}
		chip.makeEventEmitter(obj)
	})
	
	it('should provide event functions on an object', function() {
		expect(obj).to.have.a.property('trigger')
		expect(obj.trigger).to.be.a('function')
		expect(obj.on).to.be.a('function')
		expect(obj.one).to.be.a('function')
		expect(obj.off).to.be.a('function')
	})
	
	it('should trigger added events', function() {
		var triggered = false
		obj.on('test', function() {
			triggered = true
		})
		
		obj.trigger('test')
		
		expect(triggered).to.be.true
	})
	
	it('should not trigger removed events', function() {
		var triggered = false
		function listener() {
			triggered = true
		}
		obj.on('test', listener)
		obj.off('test', listener)
		obj.trigger('test')
		
		expect(triggered).to.be.false
	})
	
	it('should not trigger removed event types', function() {
		var triggered = false
		obj.on('test', function() {
			triggered = true
		})
		
		obj.off('test')
		obj.trigger('test')
		
		expect(triggered).to.be.false
	})
	
	it('should trigger `one` only once', function() {
		var count = 0
		obj.one('test', function() {
			count++
		})
		
		obj.trigger('test')
		obj.trigger('test')
		obj.trigger('test')
		
		expect(count).to.equal(1)
	})
})

