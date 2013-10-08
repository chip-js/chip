chip.controller('todos', {
	todos: [],
	filteredTodos: [],
	editing: false,
	done: 0,
	
	setup: function() {
		var _self = this;
		Todo.load(function(err, todos) {
			_self.todos = _self.filteredTodos = todos;
			_self.updateDone();
			syncView();
		})
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
		this.updateDone();
		Todo.store();
		syncView();
	},
	
	updateDone: function() {
		this.done = this.todos.filter(function(todo) {
			return todo.done;
		}).length;
	},
	
	unfilter: function() {
		$('#filters a.selected').removeClass('selected');
		$('#filters a').eq(0).addClass('selected');
		this.filteredTodos = this.todos;
		syncView();
	},
	
	filter: function(done) {
		$('#filters a.selected').removeClass('selected');
		$('#filters a').eq(done ? 2 : 1).addClass('selected');
		this.filteredTodos = this.todos.filter(function(todo) {
			return todo.done == done;
		});
		syncView();
	},
	
	clearCompleted: function() {
		Todo.todos = this.todos = this.todos.filter(function(todo) {
			return !todo.done;
		});
		Todo.store();
		this.updateDone();
		this.unfilter();
	}
	
});
