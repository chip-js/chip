
describe('Binding', function() {
	var Binding = chip.Binding
	
	
	it('should allow a new binding to be added', function() {
		Binding.addBinding('foo', function() {})
		expect(Binding.bindings).to.have.property('foo')
	})
	
	
	it('should allow a binding to be removed', function() {
		Binding.removeBinding('foo')
		expect(Binding.bindings).to.not.have.property('foo')
	})
	
	
	it('should call a binding handler when an element is processed', function() {
		var value, app = chip.app()
		
		Binding.addBinding('attr-foo', function(element, attr, controller) {
			value = 'the attr value'
		})
		
		app.init()
		Binding.process($('<div attr-foo="the attr value"></div>'), app.rootController)
		expect(value).to.equal('the attr value')
	})
	
})