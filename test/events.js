
describe('EventEmitter', function() {
	var obj

	beforeEach(function() {
		obj = {}
		chip.EventEmitter(obj)
	})

	it('should provide event functions on an object', function() {
		expect(obj).to.have.a.property('dispatchEvent')
		expect(obj.dispatchEvent).to.be.a('function')
		expect(obj.on).to.be.a('function')
		expect(obj.one).to.be.a('function')
		expect(obj.off).to.be.a('function')
	})

	it('should dispatch added events', function() {
		var dispatched = false
		var target = null;
		obj.on('test', function(event) {
			dispatched = true
			target = event.target
		})

		obj.dispatchEvent(new CustomEvent('test'));

		expect(dispatched).to.be.true
		expect(target).to.equal(obj)
	})

	it('should not dispatch removed events', function() {
		var dispatched = false
		function listener() {
			dispatched = true
		}
		obj.on('test', listener)
		obj.off('test', listener)
		obj.dispatchEvent(new CustomEvent('test'));

		expect(dispatched).to.be.false
	})

	it('should dispatch `one` only once', function() {
		var count = 0
		obj.one('test', function() {
			count++
		})

		obj.dispatchEvent(new CustomEvent('test'));
		obj.dispatchEvent(new CustomEvent('test'));
		obj.dispatchEvent(new CustomEvent('test'));

		expect(count).to.equal(1)
	})
})

