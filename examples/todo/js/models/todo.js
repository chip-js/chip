function Todo(data) {
	this.description = 'Do nothing';
	this.priority    = 0;
    this.done = false;
	
	for (var i in data) {
		if (data.hasOwnProperty(i)) {
			this[i] = data[i];
		}
	}
}

// in absence of a database we'll store all todos in an array
Todo.todos = [];

// load the todos from localStorage (or a database)
Todo.load = function(callback) {
	var json = localStorage.getItem('todos');
	
	if (json) {
		try {
			var todos = JSON.parse(json) || [];
			Todo.todos = todos.map(function(todo) {
				return new Todo(todo);
			});
		} catch(e) {
			callback(e);
			return;
		}
	}
	
	if (callback) callback(null, Todo.todos);
}

Todo.store = function(callback) {
	var json = JSON.stringify(Todo.todos);
	localStorage.setItem('todos', json);
	if (callback) callback(null);
}

Todo.prototype.save = function(callback) {
	if (Todo.todos.indexOf(this) == -1) {
		Todo.todos.push(this);
	}
	
	Todo.store(callback);
}
