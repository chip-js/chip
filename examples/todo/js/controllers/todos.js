chip.controller('todos', {
	todos: [],
	done: function(todo) {
		return todo.done;
	},
	undone: function(todo) {
		return !todo.done;
	},
	currentFilter: function(todo) {
		return true;
	},
	
	setup: function() {
		var _self = this;
		Todo.load(function(err, todos) {
			_self.todos = todos;
			syncView();
		})
	},
	
	createTodo: function() {
		var description = $('#new-todo').val().trim();
		$('#new-todo').val('');
		if (!description) return;
		var todo = new Todo({ description: description });
		this.todos.unshift(todo);
		todo.save(syncView);
	},
	
	toggleAll: function() {
		var done = $('#toggle-all').prop('checked');
		this.todos.forEach(function(todo) {
			todo.done = done;
		});
		Todo.store();
		syncView();
	},
	
	unfilter: function() {
		$('#filters a.selected').removeClass('selected');
		$('#filters a').eq(0).addClass('selected');
		delete this.currentFilter
		syncView();
	},
	
	filter: function(done) {
		$('#filters a.selected').removeClass('selected');
		$('#filters a').eq(done ? 2 : 1).addClass('selected');
		this.currentFilter = done ? this.done : this.undone
		syncView();
	},
	
	clearCompleted: function() {
		for (var i = 0; i < this.todos.length; i++) {
			if (this.todos[i].done) {
				this.todos.splice(i--, 1);
			}
		}
		Todo.store();
		syncView();
	}
	
});
