chip.controller('todos', {
//	sourceTodos: [],
//	todos: [],
//	done: [],
//	undone: [],
//	editing: false,
	
	setup: function() {
		var _self = this;
		Todo.load(function(err, todos) {
			_self.sourceTodos = todos;
			_self.todos = _self.sourceTodos.liveCopy();
			_self.done = _self.sourceTodos.liveCopy().applyFilter(_self.getDoneFilter(true));
			_self.undone = _self.sourceTodos.liveCopy().applyFilter(_self.getDoneFilter(false));
			syncView();
		})
	},
	
	getDoneFilter: function(done) {
		return function(todo) {
			return todo.done == done;
		}
	},
	
	createTodo: function() {
		var description = $('#new-todo').val().trim()
		$('#new-todo').val('')
		if (!description) return;
		var todo = new Todo({ description: description });
		todo.save(syncView);
	},
	
	toggleAll: function() {
		var done = $('#toggle-all').prop('checked');
		this.todos.forEach(function(todo) {
			todo.done = done;
		});
		this.todos.refresh();
		Todo.store();
		syncView();
	},
	
	unfilter: function() {
		$('#filters a.selected').removeClass('selected');
		$('#filters a').eq(0).addClass('selected');
		this.todos.removeFilter();
		syncView();
	},
	
	filter: function(done) {
		$('#filters a.selected').removeClass('selected');
		$('#filters a').eq(done ? 2 : 1).addClass('selected');
		this.todos.applyFilter(this.getDoneFilter(done));
		syncView();
	},
	
	clearCompleted: function() {
		this.sourceTodos.removeBy(function(todo) {
			return !todo.done;
		});
		this.todos.refresh();
		Todo.store();
		syncView();
	}
	
});
