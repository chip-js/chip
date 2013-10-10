chip.controller('todo', {
	element: null,
	todo: null,
	editing: false,
	
	setup: function() {
		this.todo = this.model;
	},
	
	editTodo: function() {
		this.editing = true;
		syncView();
		this.element.find('.edit').focus()
	},
	
	cancelEditing: function() {
		this.editing = false;
		syncView();
	},
	
	saveTodo: function() {
		var description = this.element.find('.edit').val().trim();
		if (description) {
			this.todo.description = description;
			this.todo.save();
		}
		this.editing = false;
		syncView();
	},
	
	toggleDone: function() {
		this.todo.done = !this.todo.done;
		this.todo.save();
		this.parent.todos.refresh();
		syncView();
	},
	
	removeTodo: function() {
		var index = this.parent.sourceTodos.indexOf(this.todo);
		this.parent.sourceTodos.splice(index, 1);
		Todo.store();
		syncView();
	}
	
});
