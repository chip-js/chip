
describe('equality', function() {
	var equality = chip.equality
	
	describe('object', function() {
		
		it('should return no change records for identical objects', function() {
			var changes = equality.object({ name: 'test', age: 100 }, { name: 'test', age: 100 })
			expect(changes).to.be.empty
		})
		
		
		it('should return change records for additions', function() {
			var changes = equality.object({ name: 'test', age: 100, height: 6 }, { name: 'test', age: 100 })
			expect(changes.length).to.equal(1)
			
			var change = changes.pop()
			expect(change.type).to.equal('new')
			expect(change.name).to.equal('height')
			expect(change.oldValue).to.not.exist
		})
		
		
		it('should return change records for deletions', function() {
			var changes = equality.object({ name: 'test', age: 100 }, { name: 'test', age: 100, height: 6 })
			expect(changes.length).to.equal(1)
			
			var change = changes.pop()
			expect(change.type).to.equal('deleted')
			expect(change.name).to.equal('height')
			expect(change.oldValue).to.equal(6)
		})
		
		
		it('should return change records for updates', function() {
			var changes = equality.object({ name: 'test', age: 100 }, { name: 'test', age: 102 })
			expect(changes.length).to.equal(1)
			
			var change = changes.pop()
			expect(change.type).to.equal('updated')
			expect(change.name).to.equal('age')
			expect(change.oldValue).to.equal(102)
		})
		
		
		it('should return multiple change records for multiple changes', function() {
			var changes = equality.object({ name: 'testing', age: 100, height: 6 }, { name: 'test', age: 102, color: 'green' })
			expect(changes.length).to.equal(4)
		})
		
	})
	
	describe('array', function() {
		
		it('should return no splices for identical arrays', function() {
			var splices = equality.array([1, 2, 3], [1, 2, 3])
			expect(splices).to.be.empty
		})
		
		
		it('should return a splice for a pop', function() {
			var arr = [1, 2, 3]
			var newArr = arr.slice()
			newArr.pop()
			var splices = equality.array(newArr, arr)
			expect(splices.length).to.equal(1)
			
			var splice = splices.pop()
			expect(splice.index).to.equal(2)
			expect(splice.addedCount).to.equal(0)
			expect(splice.removed.length).to.equal(1)
			expect(splice.removed[0]).to.equal(3)
		})
		
		
		it('should return a splice for a shift', function() {
			var arr = [1, 2, 3]
			var newArr = arr.slice()
			newArr.shift()
			var splices = equality.array(newArr, arr)
			expect(splices.length).to.equal(1)
			
			var splice = splices.pop()
			expect(splice.index).to.equal(0)
			expect(splice.addedCount).to.equal(0)
			expect(splice.removed.length).to.equal(1)
			expect(splice.removed[0]).to.equal(1)
		})
		
		
		it('should return a splice for a splice', function() {
			var arr = [1, 2, 3]
			var newArr = arr.slice()
			newArr.splice(1, 1, 'test')
			var splices = equality.array(newArr, arr)
			expect(splices.length).to.equal(1)
			
			var splice = splices.pop()
			expect(splice.index).to.equal(1)
			expect(splice.addedCount).to.equal(1)
			expect(splice.removed.length).to.equal(1)
			expect(splice.removed[0]).to.equal(2)
		})
		
		
		it('should return a splice for a completely new array', function() {
			var arr = [1, 2, 3]
			var newArr = [4, 5, 6, 7, 8]
			var splices = equality.array(newArr, arr)
			expect(splices.length).to.equal(1)
			
			var splice = splices.pop()
			expect(splice.index).to.equal(0)
			expect(splice.addedCount).to.equal(5)
			expect(splice.removed.length).to.equal(3)
		})
		
		
		it('should return at least one splice for a sorted array of random numbers', function() {
			var arr = [
				Math.random(), Math.random(), Math.random(), Math.random(), Math.random(), Math.random(),
				Math.random(), Math.random(), Math.random(), Math.random(), Math.random(), Math.random(),
				Math.random(), Math.random(), Math.random(), Math.random(), Math.random(), Math.random()
			]
			var newArr = arr.slice()
			newArr.sort()
			var splices = equality.array(newArr, arr)
			expect(splices).to.not.be.empty
		})
	})
	
	
})