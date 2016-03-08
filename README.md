Chip
====

Chip.js is a lightweight JavaScript framework that provides data binding to HTML like Angular.js and Ember.js. See the
full [annotated source](https://rawgithub.com/teamsnap/chip/master/docs/src/chip.html).

## Getting Started

Check out our [Getting Started](https://github.com/teamsnap/chip/wiki) guide.

### Examples

There are a couple of [example apps](https://github.com/teamsnap/chip/tree/master/examples) using Chip you can check
out.

See them in action:
* [Simple example](https://rawgithub.com/teamsnap/chip/master/examples/simple.html)
* [Todo example](https://rawgithub.com/teamsnap/chip/master/examples/todo/index.html).

## Introduction to Chip

Chip stands on the shoulders of giants, without being a giant itself. Chip's philosophy is to remain small and simple
while providing what we've come to love with Angular and Ember. Chip provides routing, controllers, and view/HTML
chip-binding. You can create your own model layer using jQuery.ajax. You can bring in your own HTML functionality with
jQuery plugins. In this way, Chip not only remains small, but understandable. The API is not complex. The documentation
can be read and understood in a day or two. The ramp-up time is very short. And your productivity and enjoyment is
increased because of simpler and smaller APIs that do just as much as the big guys.

## What others are saying

Dan Matthews:
> FWIW, Chip 2 is seriously excellent stuff. I'm thoroughly impressed. Reels like it felt when I went from KnockoutJS to
  Angular 1. Orders of magnitude better than what I was doing before.<br>
  The mixins along with the chainability of `attached`, `detached` and `created` is making my source so freaking clean.

## The pieces

***This is outdated documentation. Please ignore until we update it.***

A Chip application is made up of your model (provided by yourself), controllers, and the HTML. Other than that it only
provides routing.

### Model

Your model can be whatever you want. It should have ways of loading and saving data since the controllers will need to
do that. You can have each controller load the data when it initializes. Or you can keep the data in memory within your
model layer and just give controllers what they ask for. The important thing is to have a single source of truth. You
don't want the same object existing twice in your application so when one gets updated, the other doesn't. This can be
very confusing to the user and lead to bugs and problems.

The model should be like an API that your application uses to get its data and should contain the business logic.

### Controller

Your controllers asks the model to load new data. They store that data on themselves for the view to access. And they
provide functions for the view to call when a user interacts with the page. There is a top-level application controller,
a controller for each URL route a user goes to, a controller for each item in a repeated list, and you can set a
controller to manage any portion of your HTML document.

Controllers are linked in a parent-child relationship using the JavaScript prototype chain, with the main application
controller being at the top. This means that if `user` is set on the application controller, it will be available
(read-only) on every controller below it (which is all of them). If a descendant controller sets `user` it will have the
new value for itself and its child controllers, but the application controller will still have the original value and
all other controllers will still see it. This is the case with functions as well as objects. This is a very useful
feature, but it can be frustrating if you don't understand how it works. By the way, if you want a child controller to
set a value on the parent controller you'll have to provide a function on the parent that sets it and the child can call
that function.

### View/HTML

The view is just your HTML. The HTML document and your HTML templates contain no non-HTML markup. To fill your HTML
with data provided by your controller, you use HTML attributes prefixed with "bind-". Each of these attributes creates
a "binding" from the controller to the HTML. Chip registers "binding handlers" to handle the different types of binding
you may wish to use. There is a binding handler for displaying text, showing/hiding an element, or repeating an element
for each item in an array. Chip comes with a bunch of
[binding handlers](https://rawgithub.com/teamsnap/chip/master/docs/src/bindings.html), but you can create your own
easily using jQuery. Take a look at the provided binding handlers and check out the
[Binding documentation](https://rawgithub.com/teamsnap/chip/master/docs/src/binding.html) to see how easy it is.

### Routing

Routing is how you specify what HTML to show when the URL changes. You define routes with a URL and a name, and the
template and controller with the given name will be displayed within the element on your page that has the `bind-route`
attribute.

And that's all there is to Chip. It provides basic structure and helps with the boilerplate of keeping the view in sync
with the data.

## Chip in the HTML

Chip's API in the HTML document is really where the rubber meets the road for a Chip app. All functionality in the Chip
application is made available to the user by attaching functionality to attribute tags in the HTML document. At a high level
these attributes can be used for a few things:

1. **Presenting data**. For example, referencing an array on a controller (`controller.todos`) to a
`bind-each="todo in todos"` attribute will present that HTML element for each todo in the array. Individual data can
also be inserted into the DOM using the `bind-text` attribute as with `bind-text="todo.description"`.
2. **Embedding Action**. Setting an expression to the `bind-change` attribute will trigger the expression when the
element's change event fires.
3. **Presenting State**. For example, HTML classes can be added to or removed from an element based on the state of an
object.

## An Example

Let's say we wanted to extend the Todo MVC example and add a bit more functionality. Oh, I don't know - maybe a
priority indicator? Here is how we would accomplish that:

1. Declare the additional property in the model:

```javascript
function Todo(data) {
  this.description = 'Do nothing';
  this.done = false;
  this.priority = 0;

  for (var i in data) {
    if (data.hasOwnProperty(i)) {
      this[i] = data[i];
    }
  }
}
```
The declaration of this property informs the application that a ToDo has a priority that defaults to 0.

2. Include the additional property in the controller's actions.

```javascript
  controller.saveTodo = function() {
    var description = controller.editDescription.trim();
    var priority = parseInt(controller.priority);

    if (description) {
      controller.todo.description = controller.description;
      controller.todo.save();
    }
    if (!isNaN(priority) {
      controller.todo.priority = priority;
      controller.todo.save();
    }
    controller.editing = false;
    controller.sync();
  };
```
It's becoming easier to see here how the controller acts as a channel to pass the actions that occurred in the view
through to persisting the data to the model.

3. Include the additional property in the HTML.

```html
<input class="edit" bind-value="editDescription" on-esc="cancelEditing()" on-blur="cancelEditing()" on-enter="saveTodo()">
<input class="edit-priority" bind-value="priority" on-esc="cancelEditing()" on-blur="cancelEditing()" on-enter="saveTodo()">
```
Adding an input here is a good start and we can see that the `saveTodo` expression here should handle this new input well. Functionally speaking,
this should complete our feature addition, though the actual display and styling begs for a bit more work.

## Things I Overlooked

1. We used the `edit` class in the controller lookup. I wonder if we should have some kind of a style reference to separate display, state, and properties?
2. I overlooked the collection controller for creating a new todo - my bad. :)
3. I didn't originally intend to add this, but I think it would make sense to re-sort the todos based on the priority. Maybe something to bake into the example yet.
