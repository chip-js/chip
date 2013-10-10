(function( window ) {
//	'use strict';

	// TODO provide URL hash support
	
	// Your starting point. Enjoy the ride!
	var todosController = chip.getController('todos');
	$('body').bindTo(todosController);
	todosController.setup();
	

})( window );