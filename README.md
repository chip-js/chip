chip
====

Chip.js is a lightweight framework that manages the state and behavior of data in the browser. It's claim to fame
is a simple and unpolluted API with few - and mature - dependencies.

## How To Use Chip

Chip's magic starts by binding a controller representing a JavaScript object to the page. This Controller
object maps directly to a Chip Model which is a representation of the actual domain data.  The models in Chip
represent the singular objects in the domain, leaving it to a second controller object to build and manage the 
collections. The functionality provided by these controllers and models manifests itself in the HTML by attaching
to a set of pre-defined (or custom) DOM attributes that dictate how the results of that expression will affect the DOM.


## Chip Controllers

Chip's controllers manage the state of the models and are where the heart of the functionality of a Chip object
is stored. The Chip controllers are responsbile for informing the view of updates for both an individual model's state
as well as bubbling up state for parts of the view interested in data about the collection.

## Chip Models

Chip's models are responsbile for loading and storing the data from the remote data store (in this context remote means
'separate from the application' and can include servers in a far away land or the local storage in the browser).

## Chip Routes

Chip's routing system maps URL's to controllers and, by default, sets up the controller in the default state.

## Chip in the HTML

Chip's API in the HTML document is really where the rubber meets the road for a Chip app. All functionality in the Chip
application is made available to the user by attaching functionality to attribute tags in the HTML document. At a high level
these attributes can be used for a few things:

1. Presenting data. For example, attaching a controller method (`controller.filteredTodos`) to a `data-repeat` attribute will present that HTML
element for each instance returned from that controller method. Individual data can also be inserted into the dom using
the `data-bind` attribute and passing in computed data.
2. Embedding Action. Attaching an expression to the `data-onchange` attribute will bind that element (and it's data)
to the corresponding expression. 
3. Presenting State. For example, HTML classes can be added to or removed from an element based on the state of an
object.

