var App = require('./app');

// # Chip

// > Chip.js 2.0.0
//
// > (c) 2013 Jacob Wright, TeamSnap
// Chip may be freely distributed under the MIT license.
// For all details and documentation:
// <https://github.com/teamsnap/chip/>

// Contents
// --------
// * [chip](chip.html) the namespace, creates apps, and registers bindings and filters
// * [App](app.html) represents an app that can have routes, controllers, and templates defined
// * [Controller](controller.html) is used in the binding to attach data and run actions
// * [Router](router.html) is used for handling URL rounting
// * [Default binders](binders.html) registers the default binders chip provides

// Create Chip App
// -------------
// Creates a new chip app
module.exports = chip;

function chip(options) {
  var app = new App(options);
  app.initApp();
  return app;
}

chip.App = App;
chip.EventEmitter = require('./events');
chip.Router = require('./router');
