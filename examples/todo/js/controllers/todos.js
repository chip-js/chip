app.controller('todos', function(controller) {

	controller.todos = [];
	controller.newDescription = '';
	controller.allDone = false;
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
	controller.filter = controller.filters.none;

	Todo.load(function(err, todos) {
		controller.todos = todos;
		controller.sync();
	});

	controller.on('routeChanged', function() {
		controller.focusEntry();
	});

	controller.focusEntry = function() {
		controller.element.querySelector('#new-todo').focus();
	};

	controller.createTodo = function() {
		var description = controller.newDescription.trim();
		controller.newDescription = '';
		if (!description) {
			controller.sync();
			return;
		}

		var todo = new Todo({ description: description });
		controller.todos.unshift(todo);
		todo.save(controller.sync);
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
		controller.focusEntry();
		controller.sync();
	};

	controller.setFilter = function(name) {
		controller.filterName = name;
		controller.sync();
	};

	controller.clearCompleted = function() {
		for (var i = 0; i < controller.todos.length; i++) {
			if (controller.todos[i].done) {
				controller.todos.splice(i--, 1);
			}
		}
		Todo.store();
		controller.focusEntry();
		controller.sync();
	};

	app.route('/', function(req, next) {
		controller.filter = controller.filters.none
		controller.sync()
	})

	app.route('/active', function(req, next) {
		controller.filter = controller.filters.undone
		controller.sync()
	})

	app.route('/completed', function(req, next) {
		controller.filter = controller.filters.done
		controller.sync()
	})

});
