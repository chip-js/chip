app.controller('todo', function(controller) {
	
	controller.editing = false;
	controller.editDescription = '';
	
	controller.editTodo = function() {
		controller.editing = true;
		controller.editDescription = controller.todo.description;
		controller.sync();
		controller.element.find('.edit').focus();
	};
	
	controller.cancelEditing = function() {
		controller.editing = false;
		controller.sync();
	};
	
	controller.saveTodo = function() {
		controller.editDescription = controller.editDescription.trim()
		
		if (controller.editDescription) {
			controller.todo.description = controller.editDescription;
			controller.todo.save();
		}
		controller.editing = false;
		controller.sync();
	};
	
	controller.toggleDone = function() {
		controller.todo.done = !controller.todo.done;
		controller.todo.save();
		controller.sync();
	};
	
	controller.removeTodo = function() {
		var index = Todo.todos.indexOf(controller.todo);
		Todo.todos.splice(index, 1);
		Todo.store();
		controller.sync();
	};
	
});
