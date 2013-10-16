Controller.define('todos', function(controller) {
	
	controller.todos = [];
	controller.newDescription = '';
	controller.allDone = false;
	controller.filterName = 'none';
	controller.filters = {
		none: function() {
			return true;
		},
		done: function(todo) {
			return todo.done;
		},
		undone: function(todo) {
			return !todo.done;
		}
	};
	
	Todo.load(function(err, todos) {
		controller.todos = todos;
		controller.syncView();
	});
	
	controller.createTodo = function() {
		var description = controller.newDescription.trim();
		controller.newDescription = '';
		if (!description) {
			controller.syncView();
			return;
		}
		
		var todo = new Todo({ description: description });
		controller.todos.unshift(todo);
		todo.save(controller.syncView);
	};
	
	controller.toggleAll = function() {
		// if any are not done, toggle them all to done, otherwise toggle them all to undone
		var allDone = controller.todos.some(function(todo) {
			return !todo.done;
		});
		controller.todos.forEach(function(todo) {
			todo.done = allDone;
		});
		Todo.store();
		controller.syncView();
	};
	
	controller.setFilter = function(name) {
		controller.filterName = name;
		controller.syncView();
	};
	
	controller.clearCompleted = function() {
		for (var i = 0; i < controller.todos.length; i++) {
			if (controller.todos[i].done) {
				controller.todos.splice(i--, 1);
			}
		}
		Todo.store();
		controller.syncView();
	};
	
});
