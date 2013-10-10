chip.controller('todo', {
	element: null,
	todo: null,
	editing: false,
	description: '',
	
	setup: function() {
		this.todo = this.model;
	},
	
	editTodo: function() {
		this.editing = true;
		this.description = this.todo.description;
		syncView();
		this.element.find('.edit').focus()
	},
	
	cancelEditing: function() {
		this.editing = false;
		syncView();
	},
	
	saveTodo: function() {
		this.description = this.description.trim()
		
		if (this.description) {
			this.todo.description = this.description;
			this.todo.save();
		}
		this.editing = false;
		syncView();
	},
	
	toggleDone: function() {
		this.todo.done = !this.todo.done;
		this.todo.save();
		syncView();
	},
	
	removeTodo: function() {
		var index = Todo.todos.indexOf(this.todo);
		Todo.todos.splice(index, 1);
		Todo.store();
		syncView();
	}
	
});
