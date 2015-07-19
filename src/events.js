module.exports = EventEmitter;

// A simple event emitter to provide an eventing system.
function EventEmitter(emitter) {
  if (this instanceof EventEmitter) {
    emitter = this;
  }

  var node = document.createTextNode('');

  // Add event listener
  emitter.on = emitter.addEventListener = node.addEventListener.bind(node);

  // Removes event listener
  emitter.off = emitter.removeEventListener = node.removeEventListener.bind(node);

  // Add event listener to only get called once, returns wrapped method for removing if needed
  emitter.one = function one(type, listener) {
    function one(event) {
      emitter.off(type, one);
      if (typeof listener === 'function') {
        listener.call(event);
      }
    }
    emitter.on(type, one);
    return one;
  }

  // Dispatch event and trigger listeners
  emitter.dispatchEvent = function dispatchEvent(event) {
    Object.defineProperty(event, 'target', { value: emitter });
    return node.dispatchEvent(event);
  }
}
