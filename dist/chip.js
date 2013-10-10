// Copyright 2012 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
(function(global) {
  'use strict';

  function detectObjectObserve() {
    if (typeof Object.observe !== 'function' ||
        typeof Array.observe !== 'function') {
      return false;
    }

    var gotSplice = false;
    function callback(records) {
      if (records[0].type === 'splice' && records[1].type === 'splice')
        gotSplice = true;
    }

    var test = [0];
    Array.observe(test, callback);
    test[1] = 1;
    test.length = 0;
    Object.deliverChangeRecords(callback);
    return gotSplice;
  }

  var hasObserve = detectObjectObserve();

  function detectEval() {
    // don't test for eval if document has CSP securityPolicy object and we can see that
    // eval is not supported. This avoids an error message in console even when the exception
    // is caught
    if (global.document &&
        'securityPolicy' in global.document &&
        !global.document.securityPolicy.allowsEval) {
      return false;
    }

    try {
      var f = new Function('', 'return true;');
      return f();
    } catch (ex) {
      return false;
    }
  }

  var hasEval = detectEval();

  function isIndex(s) {
    return +s === s >>> 0;
  }

  function toNumber(s) {
    return +s;
  }

  function isObject(obj) {
    return obj === Object(obj);
  }

  var numberIsNaN = global.Number.isNaN || function isNaN(value) {
    return typeof value === 'number' && global.isNaN(value);
  }

  function areSameValue(left, right) {
    if (left === right)
      return left !== 0 || 1 / left === 1 / right;
    if (numberIsNaN(left) && numberIsNaN(right))
      return true;

    return left !== left && right !== right;
  }

  var createObject = ('__proto__' in {}) ?
    function(obj) { return obj; } :
    function(obj) {
      var proto = obj.__proto__;
      if (!proto)
        return obj;
      var newObject = Object.create(proto);
      Object.getOwnPropertyNames(obj).forEach(function(name) {
        Object.defineProperty(newObject, name,
                             Object.getOwnPropertyDescriptor(obj, name));
      });
      return newObject;
    };

  var identStart = '[\$_a-zA-Z]';
  var identPart = '[\$_a-zA-Z0-9]';
  var ident = identStart + '+' + identPart + '*';
  var elementIndex = '(?:[0-9]|[1-9]+[0-9]+)';
  var identOrElementIndex = '(?:' + ident + '|' + elementIndex + ')';
  var path = '(?:' + identOrElementIndex + ')(?:\\s*\\.\\s*' + identOrElementIndex + ')*';
  var pathRegExp = new RegExp('^' + path + '$');

  function isPathValid(s) {
    if (typeof s != 'string')
      return false;
    s = s.trim();

    if (s == '')
      return true;

    if (s[0] == '.')
      return false;

    return pathRegExp.test(s);
  }

  var constructorIsPrivate = {};

  function Path(s, privateToken) {
    if (privateToken !== constructorIsPrivate)
      throw Error('Use Path.get to retrieve path objects');

    if (s.trim() == '')
      return this;

    if (isIndex(s)) {
      this.push(s);
      return this;
    }

    s.split(/\s*\.\s*/).filter(function(part) {
      return part;
    }).forEach(function(part) {
      this.push(part);
    }, this);

    if (hasEval && !hasObserve && this.length) {
      this.getValueFrom = this.compiledGetValueFromFn();
    }
  }

  // TODO(rafaelw): Make simple LRU cache
  var pathCache = {};

  function getPath(pathString) {
    if (pathString instanceof Path)
      return pathString;

    if (pathString == null)
      pathString = '';

    if (typeof pathString !== 'string')
      pathString = String(pathString);

    var path = pathCache[pathString];
    if (path)
      return path;
    if (!isPathValid(pathString))
      return invalidPath;
    var path = new Path(pathString, constructorIsPrivate);
    pathCache[pathString] = path;
    return path;
  }

  Path.get = getPath;

  Path.prototype = createObject({
    __proto__: [],
    valid: true,

    toString: function() {
      return this.join('.');
    },

    getValueFrom: function(obj, observedSet) {
      for (var i = 0; i < this.length; i++) {
        if (obj == null)
          return;
        if (observedSet)
          observedSet.observe(obj);
        obj = obj[this[i]];
      }
      return obj;
    },

    compiledGetValueFromFn: function() {
      var accessors = this.map(function(ident) {
        return isIndex(ident) ? '["' + ident + '"]' : '.' + ident;
      });

      var str = '';
      var pathString = 'obj';
      str += 'if (obj != null';
      var i = 0;
      for (; i < (this.length - 1); i++) {
        var ident = this[i];
        pathString += accessors[i];
        str += ' &&\n     ' + pathString + ' != null';
      }
      str += ')\n';

      pathString += accessors[i];

      str += '  return ' + pathString + ';\nelse\n  return undefined;';
      return new Function('obj', str);
    },

    setValueFrom: function(obj, value) {
      if (!this.length)
        return false;

      for (var i = 0; i < this.length - 1; i++) {
        if (!isObject(obj))
          return false;
        obj = obj[this[i]];
      }

      if (!isObject(obj))
        return false;

      obj[this[i]] = value;
      return true;
    }
  });

  var invalidPath = new Path('', constructorIsPrivate);
  invalidPath.valid = false;
  invalidPath.getValueFrom = invalidPath.setValueFrom = function() {};

  var MAX_DIRTY_CHECK_CYCLES = 1000;

  function dirtyCheck(observer) {
    var cycles = 0;
    while (cycles < MAX_DIRTY_CHECK_CYCLES && observer.check()) {
      observer.report();
      cycles++;
    }
    if (global.testingExposeCycleCount)
      global.dirtyCheckCycleCount = cycles;
  }

  function objectIsEmpty(object) {
    for (var prop in object)
      return false;
    return true;
  }

  function diffIsEmpty(diff) {
    return objectIsEmpty(diff.added) &&
           objectIsEmpty(diff.removed) &&
           objectIsEmpty(diff.changed);
  }

  function diffObjectFromOldObject(object, oldObject) {
    var added = {};
    var removed = {};
    var changed = {};
    var oldObjectHas = {};

    for (var prop in oldObject) {
      var newValue = object[prop];

      if (newValue !== undefined && newValue === oldObject[prop])
        continue;

      if (!(prop in object)) {
        removed[prop] = undefined;
        continue;
      }

      if (newValue !== oldObject[prop])
        changed[prop] = newValue;
    }

    for (var prop in object) {
      if (prop in oldObject)
        continue;

      added[prop] = object[prop];
    }

    if (Array.isArray(object) && object.length !== oldObject.length)
      changed.length = object.length;

    return {
      added: added,
      removed: removed,
      changed: changed
    };
  }

  function copyObject(object, opt_copy) {
    var copy = opt_copy || (Array.isArray(object) ? [] : {});
    for (var prop in object) {
      copy[prop] = object[prop];
    };
    if (Array.isArray(object))
      copy.length = object.length;
    return copy;
  }

  function Observer(object, callback, target, token) {
    this.closed = false;
    this.object = object;
    this.callback = callback;
    // TODO(rafaelw): Hold this.target weakly when WeakRef is available.
    this.target = target;
    this.token = token;
    this.reporting = true;
    if (hasObserve) {
      var self = this;
      this.boundInternalCallback = function(records) {
        self.internalCallback(records);
      };
    }

    addToAll(this);
  }

  Observer.prototype = {
    internalCallback: function(records) {
      if (this.closed)
        return;
      if (this.reporting && this.check(records)) {
        this.report();
        if (this.testingResults)
          this.testingResults.anyChanged = true;
      }
    },

    close: function() {
      if (this.closed)
        return;
      if (this.object && typeof this.object.close === 'function')
        this.object.close();

      this.disconnect();
      this.object = undefined;
      this.closed = true;
    },

    deliver: function(testingResults) {
      if (this.closed)
        return;
      if (hasObserve) {
        this.testingResults = testingResults;
        Object.deliverChangeRecords(this.boundInternalCallback);
        this.testingResults = undefined;
      } else {
        dirtyCheck(this);
      }
    },

    report: function() {
      if (!this.reporting)
        return;

      this.sync(false);
      if (this.callback) {
        this.reportArgs.push(this.token);
        this.invokeCallback(this.reportArgs);
      }
      this.reportArgs = undefined;
    },

    invokeCallback: function(args) {
      try {
        this.callback.apply(this.target, args);
      } catch (ex) {
        Observer._errorThrownDuringCallback = true;
        console.error('Exception caught during observer callback: ' + (ex.stack || ex));
      }
    },

    reset: function() {
      if (this.closed)
        return;

      if (hasObserve) {
        this.reporting = false;
        Object.deliverChangeRecords(this.boundInternalCallback);
        this.reporting = true;
      }

      this.sync(true);
    }
  }

  var collectObservers = !hasObserve || global.forceCollectObservers;
  var allObservers;
  Observer._allObserversCount = 0;

  if (collectObservers) {
    allObservers = [];
  }

  function addToAll(observer) {
    if (!collectObservers)
      return;

    allObservers.push(observer);
    Observer._allObserversCount++;
  }

  var runningMicrotaskCheckpoint = false;

  var hasDebugForceFullDelivery = typeof Object.deliverAllChangeRecords == 'function';

  global.Platform = global.Platform || {};

  global.Platform.performMicrotaskCheckpoint = function() {
    if (runningMicrotaskCheckpoint)
      return;

    if (hasDebugForceFullDelivery) {
      Object.deliverAllChangeRecords();
      return;
    }

    if (!collectObservers)
      return;

    runningMicrotaskCheckpoint = true;

    var cycles = 0;
    var results = {};

    do {
      cycles++;
      var toCheck = allObservers;
      allObservers = [];
      results.anyChanged = false;

      for (var i = 0; i < toCheck.length; i++) {
        var observer = toCheck[i];
        if (observer.closed)
          continue;

        if (hasObserve) {
          observer.deliver(results);
        } else if (observer.check()) {
          results.anyChanged = true;
          observer.report();
        }

        allObservers.push(observer);
      }
    } while (cycles < MAX_DIRTY_CHECK_CYCLES && results.anyChanged);

    if (global.testingExposeCycleCount)
      global.dirtyCheckCycleCount = cycles;

    Observer._allObserversCount = allObservers.length;
    runningMicrotaskCheckpoint = false;
  };

  if (collectObservers) {
    global.Platform.clearObservers = function() {
      allObservers = [];
    };
  }

  function ObjectObserver(object, callback, target, token) {
    Observer.call(this, object, callback, target, token);
    this.connect();
    this.sync(true);
  }

  ObjectObserver.prototype = createObject({
    __proto__: Observer.prototype,

    connect: function() {
      if (hasObserve)
        Object.observe(this.object, this.boundInternalCallback);
    },

    sync: function(hard) {
      if (!hasObserve)
        this.oldObject = copyObject(this.object);
    },

    check: function(changeRecords) {
      var diff;
      var oldValues;
      if (hasObserve) {
        if (!changeRecords)
          return false;

        oldValues = {};
        diff = diffObjectFromChangeRecords(this.object, changeRecords,
                                           oldValues);
      } else {
        oldValues = this.oldObject;
        diff = diffObjectFromOldObject(this.object, this.oldObject);
      }

      if (diffIsEmpty(diff))
        return false;

      this.reportArgs =
          [diff.added || {}, diff.removed || {}, diff.changed || {}];
      this.reportArgs.push(function(property) {
        return oldValues[property];
      });

      return true;
    },

    disconnect: function() {
      if (!hasObserve)
        this.oldObject = undefined;
      else if (this.object)
        Object.unobserve(this.object, this.boundInternalCallback);
    }
  });

  function ArrayObserver(array, callback, target, token) {
    if (!Array.isArray(array))
      throw Error('Provided object is not an Array');
    ObjectObserver.call(this, array, callback, target, token);
  }

  ArrayObserver.prototype = createObject({
    __proto__: ObjectObserver.prototype,

    connect: function() {
      if (hasObserve)
        Array.observe(this.object, this.boundInternalCallback);
    },

    sync: function() {
      if (!hasObserve)
        this.oldObject = this.object.slice();
    },

    check: function(changeRecords) {
      var splices;
      if (hasObserve) {
        if (!changeRecords)
          return false;
        splices = projectArraySplices(this.object, changeRecords);
      } else {
        splices = calcSplices(this.object, 0, this.object.length,
                              this.oldObject, 0, this.oldObject.length);
      }

      if (!splices || !splices.length)
        return false;

      this.reportArgs = [splices];
      return true;
    }
  });

  ArrayObserver.applySplices = function(previous, current, splices) {
    splices.forEach(function(splice) {
      var spliceArgs = [splice.index, splice.removed.length];
      var addIndex = splice.index;
      while (addIndex < splice.index + splice.addedCount) {
        spliceArgs.push(current[addIndex]);
        addIndex++;
      }

      Array.prototype.splice.apply(previous, spliceArgs);
    });
  };

  function ObservedSet(callback) {
    this.arr = [];
    this.callback = callback;
    this.isObserved = true;
  }

  var objProto = Object.getPrototypeOf({});
  var arrayProto = Object.getPrototypeOf([]);
  ObservedSet.prototype = {
    reset: function() {
      this.isObserved = !this.isObserved;
    },

    observe: function(obj) {
      if (!isObject(obj) || obj === objProto || obj === arrayProto)
        return;
      var i = this.arr.indexOf(obj);
      if (i >= 0 && this.arr[i+1] === this.isObserved)
        return;

      if (i < 0) {
        i = this.arr.length;
        this.arr[i] = obj;
        Object.observe(obj, this.callback);
      }

      this.arr[i+1] = this.isObserved;
      this.observe(Object.getPrototypeOf(obj));
    },

    cleanup: function() {
      var i = 0, j = 0;
      var isObserved = this.isObserved;
      while(j < this.arr.length) {
        var obj = this.arr[j];
        if (this.arr[j + 1] == isObserved) {
          if (i < j) {
            this.arr[i] = obj;
            this.arr[i + 1] = isObserved;
          }
          i += 2;
        } else {
          Object.unobserve(obj, this.callback);
        }
        j += 2;
      }

      this.arr.length = i;
    }
  };

  function PathObserver(object, path, callback, target, token, valueFn,
                        setValueFn) {
    var path = path instanceof Path ? path : getPath(path);
    if (!path || !path.length || !isObject(object)) {
      this.value_ = path ? path.getValueFrom(object) : undefined;
      this.value = valueFn ? valueFn(this.value_) : this.value_;
      this.closed = true;
      return;
    }

    Observer.call(this, object, callback, target, token);
    this.valueFn = valueFn;
    this.setValueFn = setValueFn;
    this.path = path;

    this.connect();
    this.sync(true);
  }

  PathObserver.prototype = createObject({
    __proto__: Observer.prototype,

    connect: function() {
      if (hasObserve)
        this.observedSet = new ObservedSet(this.boundInternalCallback);
    },

    disconnect: function() {
      this.value = undefined;
      this.value_ = undefined;
      if (this.observedSet) {
        this.observedSet.reset();
        this.observedSet.cleanup();
        this.observedSet = undefined;
      }
    },

    check: function() {
      // Note: Extracting this to a member function for use here and below
      // regresses dirty-checking path perf by about 25% =-(.
      if (this.observedSet)
        this.observedSet.reset();

      this.value_ = this.path.getValueFrom(this.object, this.observedSet);

      if (this.observedSet)
        this.observedSet.cleanup();

      if (areSameValue(this.value_, this.oldValue_))
        return false;

      this.value = this.valueFn ? this.valueFn(this.value_) : this.value_;
      this.reportArgs = [this.value, this.oldValue];
      return true;
    },

    sync: function(hard) {
      if (hard) {
        if (this.observedSet)
          this.observedSet.reset();

        this.value_ = this.path.getValueFrom(this.object, this.observedSet);
        this.value = this.valueFn ? this.valueFn(this.value_) : this.value_;

        if (this.observedSet)
          this.observedSet.cleanup();
      }

      this.oldValue_ = this.value_;
      this.oldValue = this.value;
    },

    setValue: function(newValue) {
      if (!this.path)
        return;
      if (typeof this.setValueFn === 'function')
        newValue = this.setValueFn(newValue);
      this.path.setValueFrom(this.object, newValue);
    }
  });

  function CompoundPathObserver(callback, target, token, valueFn) {
    Observer.call(this, undefined, callback, target, token);
    this.valueFn = valueFn;

    this.observed = [];
    this.values = [];
    this.value = undefined;
    this.oldValue = undefined;
    this.oldValues = undefined;
    this.changeFlags = undefined;
    this.started = false;
  }

  CompoundPathObserver.prototype = createObject({
    __proto__: PathObserver.prototype,

    addPath: function(object, path) {
      if (this.started)
        throw Error('Cannot add more paths once started.');

      var path = path instanceof Path ? path : getPath(path);
      var value = path ? path.getValueFrom(object) : undefined;

      this.observed.push(object, path);
      this.values.push(value);
    },

    start: function() {
      this.connect();
      this.sync(true);
    },

    getValues: function() {
      if (this.observedSet)
        this.observedSet.reset();

      var anyChanged = false;
      for (var i = 0; i < this.observed.length; i = i+2) {
        var path = this.observed[i+1];
        if (!path)
          continue;
        var object = this.observed[i];
        var value = path.getValueFrom(object, this.observedSet);
        var oldValue = this.values[i/2];
        if (!areSameValue(value, oldValue)) {
          if (!anyChanged && !this.valueFn) {
            this.oldValues = this.oldValues || [];
            this.changeFlags = this.changeFlags || [];
            for (var j = 0; j < this.values.length; j++) {
              this.oldValues[j] = this.values[j];
              this.changeFlags[j] = false;
            }
          }

          if (!this.valueFn)
            this.changeFlags[i/2] = true;

          this.values[i/2] = value;
          anyChanged = true;
        }
      }

      if (this.observedSet)
        this.observedSet.cleanup();

      return anyChanged;
    },

    check: function() {
      if (!this.getValues())
        return;

      if (this.valueFn) {
        this.value = this.valueFn(this.values);

        if (areSameValue(this.value, this.oldValue))
          return false;

        this.reportArgs = [this.value, this.oldValue];
      } else {
        this.reportArgs = [this.values, this.oldValues, this.changeFlags];
      }

      return true;
    },

    sync: function(hard) {
      if (hard) {
        this.getValues();
        if (this.valueFn)
          this.value = this.valueFn(this.values);
      }

      if (this.valueFn)
        this.oldValue = this.value;
    },

    close: function() {
      if (this.observed) {
        for (var i = 0; i < this.observed.length; i = i + 2) {
          var object = this.observed[i];
          if (object && typeof object.close === 'function')
            object.close();
        }
        this.observed = undefined;
        this.values = undefined;
      }

      Observer.prototype.close.call(this);
    }
  });

  var knownRecordTypes = {
    'new': true,
    'updated': true,
    'deleted': true
  };

  function notifyFunction(object, name) {
    if (typeof Object.observe !== 'function')
      return;

    var notifier = Object.getNotifier(object);
    return function(type, oldValue) {
      var changeRecord = {
        object: object,
        type: type,
        name: name
      };
      if (arguments.length === 2)
        changeRecord.oldValue = oldValue;
      notifier.notify(changeRecord);
    }
  }

  // TODO(rafaelw): It should be possible for the Object.observe case to have
  // every PathObserver used by defineProperty share a single Object.observe
  // callback, and thus get() can simply call observer.deliver() and any changes
  // to any dependent value will be observed.
  PathObserver.defineProperty = function(object, name, descriptor) {
    // TODO(rafaelw): Validate errors
    var obj = descriptor.object;
    var path = getPath(descriptor.path);
    var notify = notifyFunction(object, name);

    var observer = new PathObserver(obj, descriptor.path,
        function(newValue, oldValue) {
          if (notify)
            notify('updated', oldValue);
        }
    );

    Object.defineProperty(object, name, {
      get: function() {
        return path.getValueFrom(obj);
      },
      set: function(newValue) {
        path.setValueFrom(obj, newValue);
      },
      configurable: true
    });

    return {
      close: function() {
        var oldValue = path.getValueFrom(obj);
        if (notify)
          observer.deliver();
        observer.close();
        Object.defineProperty(object, name, {
          value: oldValue,
          writable: true,
          configurable: true
        });
      }
    };
  }

  function diffObjectFromChangeRecords(object, changeRecords, oldValues) {
    var added = {};
    var removed = {};

    for (var i = 0; i < changeRecords.length; i++) {
      var record = changeRecords[i];
      if (!knownRecordTypes[record.type]) {
        console.error('Unknown changeRecord type: ' + record.type);
        console.error(record);
        continue;
      }

      if (!(record.name in oldValues))
        oldValues[record.name] = record.oldValue;

      if (record.type == 'updated')
        continue;

      if (record.type == 'new') {
        if (record.name in removed)
          delete removed[record.name];
        else
          added[record.name] = true;

        continue;
      }

      // type = 'deleted'
      if (record.name in added) {
        delete added[record.name];
        delete oldValues[record.name];
      } else {
        removed[record.name] = true;
      }
    }

    for (var prop in added)
      added[prop] = object[prop];

    for (var prop in removed)
      removed[prop] = undefined;

    var changed = {};
    for (var prop in oldValues) {
      if (prop in added || prop in removed)
        continue;

      var newValue = object[prop];
      if (oldValues[prop] !== newValue)
        changed[prop] = newValue;
    }

    return {
      added: added,
      removed: removed,
      changed: changed
    };
  }

  function newSplice(index, removed, addedCount) {
    return {
      index: index,
      removed: removed,
      addedCount: addedCount
    };
  }

  var EDIT_LEAVE = 0;
  var EDIT_UPDATE = 1;
  var EDIT_ADD = 2;
  var EDIT_DELETE = 3;

  function ArraySplice() {}

  ArraySplice.prototype = {

    // Note: This function is *based* on the computation of the Levenshtein
    // "edit" distance. The one change is that "updates" are treated as two
    // edits - not one. With Array splices, an update is really a delete
    // followed by an add. By retaining this, we optimize for "keeping" the
    // maximum array items in the original array. For example:
    //
    //   'xxxx123' -> '123yyyy'
    //
    // With 1-edit updates, the shortest path would be just to update all seven
    // characters. With 2-edit updates, we delete 4, leave 3, and add 4. This
    // leaves the substring '123' intact.
    calcEditDistances: function(current, currentStart, currentEnd,
                                old, oldStart, oldEnd) {
      // "Deletion" columns
      var rowCount = oldEnd - oldStart + 1;
      var columnCount = currentEnd - currentStart + 1;
      var distances = new Array(rowCount);

      // "Addition" rows. Initialize null column.
      for (var i = 0; i < rowCount; i++) {
        distances[i] = new Array(columnCount);
        distances[i][0] = i;
      }

      // Initialize null row
      for (var j = 0; j < columnCount; j++)
        distances[0][j] = j;

      for (var i = 1; i < rowCount; i++) {
        for (var j = 1; j < columnCount; j++) {
          if (this.equals(current[currentStart + j - 1], old[oldStart + i - 1]))
            distances[i][j] = distances[i - 1][j - 1];
          else {
            var north = distances[i - 1][j] + 1;
            var west = distances[i][j - 1] + 1;
            distances[i][j] = north < west ? north : west;
          }
        }
      }

      return distances;
    },

    // This starts at the final weight, and walks "backward" by finding
    // the minimum previous weight recursively until the origin of the weight
    // matrix.
    spliceOperationsFromEditDistances: function(distances) {
      var i = distances.length - 1;
      var j = distances[0].length - 1;
      var current = distances[i][j];
      var edits = [];
      while (i > 0 || j > 0) {
        if (i == 0) {
          edits.push(EDIT_ADD);
          j--;
          continue;
        }
        if (j == 0) {
          edits.push(EDIT_DELETE);
          i--;
          continue;
        }
        var northWest = distances[i - 1][j - 1];
        var west = distances[i - 1][j];
        var north = distances[i][j - 1];

        var min;
        if (west < north)
          min = west < northWest ? west : northWest;
        else
          min = north < northWest ? north : northWest;

        if (min == northWest) {
          if (northWest == current) {
            edits.push(EDIT_LEAVE);
          } else {
            edits.push(EDIT_UPDATE);
            current = northWest;
          }
          i--;
          j--;
        } else if (min == west) {
          edits.push(EDIT_DELETE);
          i--;
          current = west;
        } else {
          edits.push(EDIT_ADD);
          j--;
          current = north;
        }
      }

      edits.reverse();
      return edits;
    },

    /**
     * Splice Projection functions:
     *
     * A splice map is a representation of how a previous array of items
     * was transformed into a new array of items. Conceptually it is a list of
     * tuples of
     *
     *   <index, removed, addedCount>
     *
     * which are kept in ascending index order of. The tuple represents that at
     * the |index|, |removed| sequence of items were removed, and counting forward
     * from |index|, |addedCount| items were added.
     */

    /**
     * Lacking individual splice mutation information, the minimal set of
     * splices can be synthesized given the previous state and final state of an
     * array. The basic approach is to calculate the edit distance matrix and
     * choose the shortest path through it.
     *
     * Complexity: O(l * p)
     *   l: The length of the current array
     *   p: The length of the old array
     */
    calcSplices: function(current, currentStart, currentEnd,
                          old, oldStart, oldEnd) {
      var prefixCount = 0;
      var suffixCount = 0;

      var minLength = Math.min(currentEnd - currentStart, oldEnd - oldStart);
      if (currentStart == 0 && oldStart == 0)
        prefixCount = this.sharedPrefix(current, old, minLength);

      if (currentEnd == current.length && oldEnd == old.length)
        suffixCount = this.sharedSuffix(current, old, minLength - prefixCount);

      currentStart += prefixCount;
      oldStart += prefixCount;
      currentEnd -= suffixCount;
      oldEnd -= suffixCount;

      if (currentEnd - currentStart == 0 && oldEnd - oldStart == 0)
        return [];

      if (currentStart == currentEnd) {
        var splice = newSplice(currentStart, [], 0);
        while (oldStart < oldEnd)
          splice.removed.push(old[oldStart++]);

        return [ splice ];
      } else if (oldStart == oldEnd)
        return [ newSplice(currentStart, [], currentEnd - currentStart) ];

      var ops = this.spliceOperationsFromEditDistances(
          this.calcEditDistances(current, currentStart, currentEnd,
                                 old, oldStart, oldEnd));

      var splice = undefined;
      var splices = [];
      var index = currentStart;
      var oldIndex = oldStart;
      for (var i = 0; i < ops.length; i++) {
        switch(ops[i]) {
          case EDIT_LEAVE:
            if (splice) {
              splices.push(splice);
              splice = undefined;
            }

            index++;
            oldIndex++;
            break;
          case EDIT_UPDATE:
            if (!splice)
              splice = newSplice(index, [], 0);

            splice.addedCount++;
            index++;

            splice.removed.push(old[oldIndex]);
            oldIndex++;
            break;
          case EDIT_ADD:
            if (!splice)
              splice = newSplice(index, [], 0);

            splice.addedCount++;
            index++;
            break;
          case EDIT_DELETE:
            if (!splice)
              splice = newSplice(index, [], 0);

            splice.removed.push(old[oldIndex]);
            oldIndex++;
            break;
        }
      }

      if (splice) {
        splices.push(splice);
      }
      return splices;
    },

    sharedPrefix: function(current, old, searchLength) {
      for (var i = 0; i < searchLength; i++)
        if (!this.equals(current[i], old[i]))
          return i;
      return searchLength;
    },

    sharedSuffix: function(current, old, searchLength) {
      var index1 = current.length;
      var index2 = old.length;
      var count = 0;
      while (count < searchLength && this.equals(current[--index1], old[--index2]))
        count++;

      return count;
    },

    calculateSplices: function(current, previous) {
      return this.calcSplices(current, 0, current.length, previous, 0,
                              previous.length);
    },

    equals: function(currentValue, previousValue) {
      return currentValue === previousValue;
    }
  };

  var arraySplice = new ArraySplice();

  function calcSplices(current, currentStart, currentEnd,
                       old, oldStart, oldEnd) {
    return arraySplice.calcSplices(current, currentStart, currentEnd,
                                   old, oldStart, oldEnd);
  }

  function intersect(start1, end1, start2, end2) {
    // Disjoint
    if (end1 < start2 || end2 < start1)
      return -1;

    // Adjacent
    if (end1 == start2 || end2 == start1)
      return 0;

    // Non-zero intersect, span1 first
    if (start1 < start2) {
      if (end1 < end2)
        return end1 - start2; // Overlap
      else
        return end2 - start2; // Contained
    } else {
      // Non-zero intersect, span2 first
      if (end2 < end1)
        return end2 - start1; // Overlap
      else
        return end1 - start1; // Contained
    }
  }

  function mergeSplice(splices, index, removed, addedCount) {

    var splice = newSplice(index, removed, addedCount);

    var inserted = false;
    var insertionOffset = 0;

    for (var i = 0; i < splices.length; i++) {
      var current = splices[i];
      current.index += insertionOffset;

      if (inserted)
        continue;

      var intersectCount = intersect(splice.index,
                                     splice.index + splice.removed.length,
                                     current.index,
                                     current.index + current.addedCount);

      if (intersectCount >= 0) {
        // Merge the two splices

        splices.splice(i, 1);
        i--;

        insertionOffset -= current.addedCount - current.removed.length;

        splice.addedCount += current.addedCount - intersectCount;
        var deleteCount = splice.removed.length +
                          current.removed.length - intersectCount;

        if (!splice.addedCount && !deleteCount) {
          // merged splice is a noop. discard.
          inserted = true;
        } else {
          var removed = current.removed;

          if (splice.index < current.index) {
            // some prefix of splice.removed is prepended to current.removed.
            var prepend = splice.removed.slice(0, current.index - splice.index);
            Array.prototype.push.apply(prepend, removed);
            removed = prepend;
          }

          if (splice.index + splice.removed.length > current.index + current.addedCount) {
            // some suffix of splice.removed is appended to current.removed.
            var append = splice.removed.slice(current.index + current.addedCount - splice.index);
            Array.prototype.push.apply(removed, append);
          }

          splice.removed = removed;
          if (current.index < splice.index) {
            splice.index = current.index;
          }
        }
      } else if (splice.index < current.index) {
        // Insert splice here.

        inserted = true;

        splices.splice(i, 0, splice);
        i++;

        var offset = splice.addedCount - splice.removed.length
        current.index += offset;
        insertionOffset += offset;
      }
    }

    if (!inserted)
      splices.push(splice);
  }

  function createInitialSplices(array, changeRecords) {
    var splices = [];

    for (var i = 0; i < changeRecords.length; i++) {
      var record = changeRecords[i];
      switch(record.type) {
        case 'splice':
          mergeSplice(splices, record.index, record.removed.slice(), record.addedCount);
          break;
        case 'new':
        case 'updated':
        case 'deleted':
          if (!isIndex(record.name))
            continue;
          var index = toNumber(record.name);
          if (index < 0)
            continue;
          mergeSplice(splices, index, [record.oldValue], 1);
          break;
        default:
          console.error('Unexpected record type: ' + JSON.stringify(record));
          break;
      }
    }

    return splices;
  }

  function projectArraySplices(array, changeRecords) {
    var splices = [];

    createInitialSplices(array, changeRecords).forEach(function(splice) {
      if (splice.addedCount == 1 && splice.removed.length == 1) {
        if (splice.removed[0] !== array[splice.index])
          splices.push(splice);

        return
      };

      splices = splices.concat(calcSplices(array, splice.index, splice.index + splice.addedCount,
                                           splice.removed, 0, splice.removed.length));
    });

    return splices;
  }

  global.Observer = Observer;
  global.Observer.hasObjectObserve = hasObserve;
  global.ArrayObserver = ArrayObserver;
  global.ArrayObserver.calculateSplices = function(current, previous) {
    return arraySplice.calculateSplices(current, previous);
  };

  global.ArraySplice = ArraySplice;
  global.ObjectObserver = ObjectObserver;
  global.PathObserver = PathObserver;
  global.CompoundPathObserver = CompoundPathObserver;
  global.Path = Path;
})(typeof global !== 'undefined' && global ? global : this);

var Path = {
    'version': "0.8.4",
    'map': function (path) {
        if (Path.routes.defined.hasOwnProperty(path)) {
            return Path.routes.defined[path];
        } else {
            return new Path.core.route(path);
        }
    },
    'root': function (path) {
        Path.routes.root = path;
    },
    'rescue': function (fn) {
        Path.routes.rescue = fn;
    },
    'history': {
        'initial':{}, // Empty container for "Initial Popstate" checking variables.
        'pushState': function(state, title, path){
            if(Path.history.supported){
                history.pushState(state, title, path);
                Path.dispatch(path);
            } else {
                if(Path.history.fallback){
                    window.location.hash = "#" + path;
                }
            }
        },
        'popState': function(event){
            var initialPop = !Path.history.initial.popped && location.href == Path.history.initial.URL;
            Path.history.initial.popped = true;
            if(initialPop) return;
            Path.dispatch(document.location.pathname);
        },
        'listen': function(fallback){
            Path.history.supported = !!(window.history && window.history.pushState);
            Path.history.fallback  = fallback;

            if(Path.history.supported){
                Path.history.initial.popped = ('state' in window.history), Path.history.initial.URL = location.href;
                window.onpopstate = Path.history.popState;
            } else {
                if(Path.history.fallback){
                    for(route in Path.routes.defined){
                        if(route.charAt(0) != "#"){
                          Path.routes.defined["#"+route] = Path.routes.defined[route];
                          Path.routes.defined["#"+route].path = "#"+route;
                        }
                    }
                    Path.listen();
                }
            }
        }
    },
    'match': function (path, parameterize) {
        var params = {}, route = null, possible_routes, slice, i, j, compare;
        for (route in Path.routes.defined) {
            if (route !== null && route !== undefined) {
                route = Path.routes.defined[route];
                possible_routes = route.partition();
                for (j = 0; j < possible_routes.length; j++) {
                    slice = possible_routes[j];
                    compare = path;
                    if (slice.search(/:/) > 0) {
                        for (i = 0; i < slice.split("/").length; i++) {
                            if ((i < compare.split("/").length) && (slice.split("/")[i].charAt(0) === ":")) {
                                params[slice.split('/')[i].replace(/:/, '')] = compare.split("/")[i];
                                compare = compare.replace(compare.split("/")[i], slice.split("/")[i]);
                            }
                        }
                    }
                    if (slice === compare) {
                        if (parameterize) {
                            route.params = params;
                        }
                        return route;
                    }
                }
            }
        }
        return null;
    },
    'dispatch': function (passed_route) {
        var previous_route, matched_route;
        if (Path.routes.current !== passed_route) {
            Path.routes.previous = Path.routes.current;
            Path.routes.current = passed_route;
            matched_route = Path.match(passed_route, true);

            if (Path.routes.previous) {
                previous_route = Path.match(Path.routes.previous);
                if (previous_route !== null && previous_route.do_exit !== null) {
                    previous_route.do_exit();
                }
            }

            if (matched_route !== null) {
                matched_route.run();
	            
		        // TODO add event listeners, come up with a better way to do this
		        if (Path.onchange) {
			        Path.onchange(previous_route, matched_route);
		        }
                return true;
            } else {
                if (Path.routes.rescue !== null) {
                    Path.routes.rescue();
                }
	            if (Path.onchange) {
                    Path.onchange(previous_route, matched_route);
                }
            }
        }
    },
    'listen': function () {
        var fn = function(){ Path.dispatch(location.hash); }

        if (location.hash === "") {
            if (Path.routes.root !== null) {
                location.hash = Path.routes.root;
            }
        }

        // The 'document.documentMode' checks below ensure that PathJS fires the right events
        // even in IE "Quirks Mode".
        if ("onhashchange" in window && (!document.documentMode || document.documentMode >= 8)) {
            window.onhashchange = fn;
        } else {
            setInterval(fn, 50);
        }

        if(location.hash !== "") {
            Path.dispatch(location.hash);
        }
    },
    'core': {
        'route': function (path) {
            this.path = path;
            this.action = null;
            this.do_enter = [];
            this.do_exit = null;
            this.params = {};
            Path.routes.defined[path] = this;
        }
    },
    'routes': {
        'current': null,
        'root': null,
        'rescue': null,
        'previous': null,
        'defined': {}
    }
};
Path.core.route.prototype = {
    'to': function (fn) {
        this.action = fn;
        return this;
    },
    'enter': function (fns) {
        if (fns instanceof Array) {
            this.do_enter = this.do_enter.concat(fns);
        } else {
            this.do_enter.push(fns);
        }
        return this;
    },
    'exit': function (fn) {
        this.do_exit = fn;
        return this;
    },
    'partition': function () {
        var parts = [], options = [], re = /\(([^}]+?)\)/g, text, i;
        while (text = re.exec(this.path)) {
            parts.push(text[1]);
        }
        options.push(this.path.split("(")[0]);
        for (i = 0; i < parts.length; i++) {
            options.push(options[options.length - 1] + parts[i]);
        }
        return options;
    },
    'run': function () {
        var halt_execution = false, i, result, previous;

        if (Path.routes.defined[this.path].hasOwnProperty("do_enter")) {
            if (Path.routes.defined[this.path].do_enter.length > 0) {
                for (i = 0; i < Path.routes.defined[this.path].do_enter.length; i++) {
                    result = Path.routes.defined[this.path].do_enter[i].apply(this, null);
                    if (result === false) {
                        halt_execution = true;
                        break;
                    }
                }
            }
        }
        if (!halt_execution) {
            Path.routes.defined[this.path].action();
        }
    }
};

(function(global) {
  var EDIT_ADD, EDIT_DELETE, EDIT_LEAVE, EDIT_UPDATE, calcEditDistances, calcSplices, copyObject, copyValue, diffObjects, newChange, newSplice, observers, sharedPrefix, sharedSuffix, spliceOperationsFromEditDistances;
  observers = [];
  global.observers = observers;
  setTimeout(function() {
    observers.calcSplices = calcSplices;
    return observers.diffObjects = diffObjects;
  });
  observers.add = function(expr, triggerNow, callback) {
    var observer, value;
    if (typeof triggerNow === 'function') {
      callback = triggerNow;
      triggerNow = false;
    }
    value = expr();
    observer = {
      expr: expr,
      callback: callback,
      oldValue: copyValue(value),
      close: function() {
        return observers.remove(observer);
      }
    };
    observers.push(observer);
    if (triggerNow) {
      callback(value);
    }
    return observer;
  };
  observers.remove = function(observer) {
    var index;
    index = observers.indexOf(observer);
    if (index) {
      return observers.splice(index, 1);
    }
  };
  observers.sync = function() {
    return observers.forEach(function(observer) {
      var changeRecords, splices, value;
      value = observer.expr();
      if (Array.isArray(value) && Array.isArray(observer.oldValue)) {
        splices = calcSplices(value, observer.oldValue);
        if (splices.length) {
          observer.callback(value, splices);
        }
      } else if (value && observer.oldValue && typeof value === 'object' && typeof observer.oldValue === 'object') {
        changeRecords = diffObjects(value, observer.oldValue);
        if (changeRecords.length) {
          observer.callback(value, changeRecords);
        }
      } else if (value !== observer.oldValue) {
        observer.callback(value);
      } else {
        return;
      }
      observer.oldValue = copyValue(value);
    });
  };
  copyValue = function(value) {
    if (Array.isArray(value)) {
      return value.slice();
    } else if (value && typeof value === 'object') {
      return copyObject(value);
    } else {
      return value;
    }
  };
  diffObjects = function(object, oldObject) {
    var changeRecords, newValue, oldValue, prop;
    changeRecords = [];
    for (prop in oldObject) {
      oldValue = oldObject[prop];
      newValue = object[prop];
      if (newValue !== void 0 && newValue === oldValue) {
        continue;
      }
      if (!(prop in object)) {
        changeRecords.push(newChange(object, 'deleted', prop, oldValue));
        continue;
      }
      if (newValue !== oldValue) {
        changeRecords.push(newChange(object, 'updated', prop, oldValue));
      }
    }
    for (prop in object) {
      newValue = object[prop];
      if (prop in oldObject) {
        continue;
      }
      changeRecords.push(newChange(object, 'new', prop));
    }
    if (Array.isArray(object) && object.length !== oldObject.length) {
      changeRecords.push(newChange(object, 'updated', 'length', oldObject.length));
    }
    return changeRecords;
  };
  newChange = function(object, type, name, oldValue) {
    return {
      object: object,
      type: type,
      name: name,
      oldValue: oldValue
    };
  };
  copyObject = function(object) {
    var copy, key, value;
    copy = Array.isArray(object) ? [] : {};
    for (key in copy) {
      value = copy[key];
      copy[key] = value;
    }
    if (Array.isArray(object)) {
      copy.length = object.length;
    }
    return copy;
  };
  EDIT_LEAVE = 0;
  EDIT_UPDATE = 1;
  EDIT_ADD = 2;
  EDIT_DELETE = 3;
  calcSplices = function(current, old) {
    var currentEnd, currentStart, distances, index, minLength, oldEnd, oldIndex, oldStart, op, ops, prefixCount, splice, splices, suffixCount, _i, _len;
    currentStart = 0;
    currentEnd = current.length;
    oldStart = 0;
    oldEnd = old.length;
    minLength = Math.min(currentEnd, oldEnd);
    prefixCount = sharedPrefix(current, old, minLength);
    suffixCount = sharedSuffix(current, old, minLength - prefixCount);
    currentStart += prefixCount;
    oldStart += prefixCount;
    currentEnd -= suffixCount;
    oldEnd -= suffixCount;
    if (currentEnd - currentStart === 0 && oldEnd - oldStart === 0) {
      return [];
    }
    if (currentStart === currentEnd) {
      return [newSplice(currentStart, old.slice(oldStart, oldEnd), 0)];
    }
    if (oldStart === oldEnd) {
      return [newSplice(currentStart, [], currentEnd - currentStart)];
    }
    distances = calcEditDistances(current, currentStart, currentEnd, old, oldStart, oldEnd);
    ops = spliceOperationsFromEditDistances(distances);
    splice = void 0;
    splices = [];
    index = currentStart;
    oldIndex = oldStart;
    for (_i = 0, _len = ops.length; _i < _len; _i++) {
      op = ops[_i];
      if (op === EDIT_LEAVE) {
        if (splice) {
          splices.push(splice);
          splice = void 0;
        }
        index++;
        oldIndex++;
      } else if (op === EDIT_UPDATE) {
        if (!splice) {
          splice = newSplice(index, [], 0);
        }
        splice.addedCount++;
        index++;
        splice.removed.push(old[oldIndex]);
        oldIndex++;
      } else if (op === EDIT_ADD) {
        if (!splice) {
          splice = newSplice(index, [], 0);
        }
        splice.addedCount++;
        index++;
      } else if (op === EDIT_DELETE) {
        if (!splice) {
          splice = newSplice(index, [], 0);
        }
        splice.removed.push(old[oldIndex]);
        oldIndex++;
      }
    }
    if (splice) {
      splices.push(splice);
    }
    return splices;
  };
  sharedPrefix = function(current, old, searchLength) {
    var i, _i;
    for (i = _i = 0; 0 <= searchLength ? _i < searchLength : _i > searchLength; i = 0 <= searchLength ? ++_i : --_i) {
      if (current[i] !== old[i]) {
        return i;
      }
    }
    return length;
  };
  sharedSuffix = function(current, old, searchLength) {
    var count, index1, index2;
    index1 = current.length;
    index2 = old.length;
    count = 0;
    while (count < searchLength && current[--index1] === old[--index2]) {
      count++;
    }
    return count;
  };
  newSplice = function(index, removed, addedCount) {
    return {
      index: index,
      removed: removed,
      addedCount: addedCount
    };
  };
  spliceOperationsFromEditDistances = function(distances) {
    var current, edits, i, j, min, north, northWest, west;
    i = distances.length - 1;
    j = distances[0].length - 1;
    current = distances[i][j];
    edits = [];
    while (i > 0 || j > 0) {
      if (i === 0) {
        edits.push(EDIT_ADD);
        j--;
        continue;
      }
      if (j === 0) {
        edits.push(EDIT_DELETE);
        i--;
        continue;
      }
      northWest = distances[i - 1][j - 1];
      west = distances[i - 1][j];
      north = distances[i][j - 1];
      if (west < north) {
        min = west < northWest ? west : northWest;
      } else {
        min = north < northWest ? north : northWest;
      }
      if (min === northWest) {
        if (northWest === current) {
          edits.push(EDIT_LEAVE);
        } else {
          edits.push(EDIT_UPDATE);
          current = northWest;
        }
        i--;
        j--;
      } else if (min === west) {
        edits.push(EDIT_DELETE);
        i--;
        current = west;
      } else {
        edits.push(EDIT_ADD);
        j--;
        current = north;
      }
    }
    edits.reverse();
    return edits;
  };
  return calcEditDistances = function(current, currentStart, currentEnd, old, oldStart, oldEnd) {
    var columnCount, distances, i, j, north, rowCount, west, _i, _j, _k, _l;
    rowCount = oldEnd - oldStart + 1;
    columnCount = currentEnd - currentStart + 1;
    distances = new Array(rowCount);
    for (i = _i = 0; 0 <= rowCount ? _i < rowCount : _i > rowCount; i = 0 <= rowCount ? ++_i : --_i) {
      distances[i] = new Array(columnCount);
      distances[i][0] = i;
    }
    for (j = _j = 0; 0 <= columnCount ? _j < columnCount : _j > columnCount; j = 0 <= columnCount ? ++_j : --_j) {
      distances[0][j] = j;
    }
    for (i = _k = 1; 1 <= rowCount ? _k < rowCount : _k > rowCount; i = 1 <= rowCount ? ++_k : --_k) {
      for (j = _l = 1; 1 <= columnCount ? _l < columnCount : _l > columnCount; j = 1 <= columnCount ? ++_l : --_l) {
        if (current[currentStart + j - 1] === old[oldStart + i - 1]) {
          distances[i][j] = distances[i - 1][j - 1];
        } else {
          north = distances[i - 1][j] + 1;
          west = distances[i][j - 1] + 1;
          distances[i][j] = north < west ? north : west;
        }
      }
    }
    return distances;
  };
})(this);

var modifyCopyArray, modifySourceArray, restoreSourceArray,
  __slice = [].slice;

Array.prototype.refresh = function() {};

Array.prototype.removeBy = function(filter) {
  var i, removed, value;
  removed = [];
  i = this.length;
  while (i--) {
    value = this[i];
    if (filter(value, i, this) === false) {
      removed.unshift(this.splice(i, 1));
    }
  }
  return removed;
};

Array.prototype.liveCopy = function() {
  var copy, source;
  source = this;
  copy = source.slice();
  modifySourceArray(source);
  modifyCopyArray(copy);
  source._liveCopies.push(copy);
  copy.refresh = function() {
    source.refresh();
    return this;
  };
  copy._source = source;
  return copy;
};

Array.prototype.closeCopies = function() {
  return restoreSourceArray(this);
};

modifySourceArray = function(source) {
  if (source._liveCopies) {
    return;
  }
  source._liveCopies = [];
  source.refresh = function() {
    var _this = this;
    this._liveCopies.forEach(function(copy) {
      var tmp;
      tmp = _this;
      if (copy._filter) {
        tmp = _this.filter(copy._filter);
      }
      if (copy._sort && !copy._filter) {
        tmp = _this.slice();
      }
      if (copy._sort) {
        tmp.sort(copy._sort);
      }
      tmp.forEach(function(item, index) {
        return copy[index] = item;
      });
      return copy.length = tmp.length;
    });
    return this;
  };
  source.push = function() {
    var items;
    items = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    Array.prototype.push.apply(this, items);
    return this.refresh();
  };
  source.unshift = function() {
    var items;
    items = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    Array.prototype.push.apply(this, items);
    return this.refresh();
  };
  source.pop = function() {
    var item;
    item = Array.prototype.pop.call(this);
    this.refresh();
    return item;
  };
  source.shift = function() {
    var item;
    item = Array.prototype.shift.call(this);
    this.refresh();
    return item;
  };
  return source.splice = function() {
    var count, index, items, removed, _ref;
    index = arguments[0], count = arguments[1], items = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
    removed = (_ref = Array.prototype.splice).call.apply(_ref, [this, index, count].concat(__slice.call(items)));
    this.refresh();
    return removed;
  };
};

restoreSourceArray = function(source) {
  if (!source._liveCopies) {
    return;
  }
  source._liveCopies.forEach(function(copy) {
    delete copy._source;
    return delete copy.refresh;
  });
  delete source._liveCopies;
  delete source.push;
  delete source.unshift;
  delete source.pop;
  delete source.shift;
  return delete source.splice;
};

modifyCopyArray = function(copy) {
  copy.applyFilter = function(filter) {
    this._filter = filter;
    return this.refresh();
  };
  copy.removeFilter = function() {
    if (!this._filter) {
      return;
    }
    delete this._filter;
    return this.refresh();
  };
  copy.applySort = function(sort) {
    this._sort = sort;
    return this.refresh();
  };
  copy.removeSort = function() {
    if (!this._sort) {
      return;
    }
    delete this._sort;
    return this.refresh();
  };
  return copy.close = function() {
    var copies, index, source;
    source = copy._source;
    if (!source) {
      return;
    }
    delete copy._source;
    delete copy.refresh;
    copies = source._liveCopies;
    index = copies.indexOf(copy);
    if (index === -1) {
      return;
    }
    copies.splice(index, 1);
    if (copies.length === 0) {
      restoreArray(source);
    }
    return this;
  };
};

var __slice = [].slice;

(function($) {
  var attribs, bindExpression, bindTo, createBoundExpr, createFunction, evaluate, events, exprCache, getDataArgNames, getDataArgs, keyCodes, normalizeExpression, notThis, onRemove, toggles, varExpr;
  window.syncView = observers.sync;
  bindTo = $.fn.bindTo = function(data) {
    var bindings, block, blocksSelector, element, handleBinding, selector;
    element = this;
    if (!data) {
      data = {
        "this": {}
      };
    }
    if (!data.hasOwnProperty('this')) {
      data = {
        "this": data
      };
    }
    handleBinding = function(element, handlers) {
      var attr, attributes, binding, expr, _i, _len;
      attributes = Array.prototype.slice.call(element.get(0).attributes);
      for (_i = 0, _len = attributes.length; _i < _len; _i++) {
        attr = attributes[_i];
        if (attr.name.split('-').shift() !== 'data') {
          continue;
        }
        binding = handlers[attr.name.replace('data-', '')];
        if (binding) {
          expr = attr.value;
          element.removeAttr(attr.name);
          binding(element, expr, data);
        }
      }
    };
    blocksSelector = '[data-' + Object.keys(bindTo.blockHandlers).join('],[data-') + ']';
    while ((block = element.find(blocksSelector)).length) {
      handleBinding(block.first(), bindTo.blockHandlers);
    }
    selector = '[data-' + Object.keys(bindTo.handlers).join('],[data-') + ']';
    bindings = element.filter(selector).add(element.find(selector));
    bindings.each(function() {
      return handleBinding($(this), bindTo.handlers);
    });
    return element;
  };
  bindTo.blockHandlers = {
    repeat: function(element, expr, data) {
      var controllerName, createElement, elements, itemName, parent, template, _ref;
      _ref = expr.split(/\s+in\s+/), itemName = _ref[0], expr = _ref[1];
      controllerName = element.attr('data-controller');
      element.removeAttr('data-controller');
      parent = data["this"] || data;
      template = element;
      element = $('<script type="text/repeat-placeholder"><!--data-repeat="' + expr + '"--></script>').replaceAll(template);
      elements = $();
      createElement = function(model) {
        var controller, itemData, newElement;
        newElement = template.clone();
        if (controllerName) {
          controller = chip.getController(controllerName, {
            parent: parent,
            element: newElement,
            model: model
          });
        } else {
          controller = options.controller;
        }
        itemData = {
          "this": controller
        };
        itemData[itemName] = model;
        newElement.bindTo(itemData);
        if (controllerName) {
          if (typeof controller.setup === "function") {
            controller.setup();
          }
        }
        return newElement.get(0);
      };
      return bindExpression(element, expr, data, function(value, splices) {
        if (!splices) {
          elements.remove();
          elements = $();
          if (Array.isArray(value)) {
            value.forEach(function(item) {
              return elements.push(createElement(item));
            });
            return element.after(elements);
          }
        } else {
          return splices.forEach(function(splice) {
            var addIndex, args, item, newElements, removedElements;
            args = [splice.index, splice.removed.length];
            newElements = [];
            addIndex = splice.index;
            while (addIndex < splice.index + splice.addedCount) {
              item = value[addIndex];
              newElements.push(createElement(item));
              addIndex++;
            }
            removedElements = elements.splice.apply(elements, args.concat(newElements));
            $(removedElements).remove();
            if (splice.index === 0) {
              return element.after(newElements);
            } else {
              return elements.eq(splice.index - 1).after(newElements);
            }
          });
        }
      });
    },
    partial: function(element, expr, data) {
      return bindExpression(element, expr, data, function(value) {
        return element.html(value);
      });
    }
  };
  bindTo.handlers = {
    "if": function(element, expr, data) {
      return bindExpression(element, expr, data, function(value) {
        if (value) {
          return element.show();
        } else {
          return element.hide();
        }
      });
    },
    bind: function(element, expr, data) {
      return bindExpression(element, expr, data, function(value) {
        return element.text(value != null ? value : '');
      });
    },
    'bind-html': function(element, expr, data) {
      return bindExpression(element, expr, data, function(value) {
        return element.html(value != null ? value : '');
      });
    },
    active: function(element, expr, data) {
      var link, refresh;
      if (expr) {
        return bindExpression(element, expr, data, function(value) {
          if (value) {
            return element.addClass('active');
          } else {
            return element.removeClass('active');
          }
        });
      } else {
        refresh = function() {
          if (link.length && link.get(0).href === location.href) {
            return element.addClass('active');
          } else {
            return element.removeClass('active');
          }
        };
        link = element.filter('[href],[data-attr^="href:"]').add(element.children('[href],[data-attr^="href:"]')).first();
        link.on('boundUpdate', refresh);
        $(document).on('urlchange', refresh);
        onRemove(element, function() {
          return $(document).off('urlchange', refresh);
        });
        return refresh();
      }
    },
    "class": function(element, expr, data) {
      return bindExpression(element, expr, data, function(value) {
        var className, toggle, _results;
        if (Array.isArray(value)) {
          value = value.join(' ');
        }
        if (typeof value === 'string') {
          return element.attr('class', value);
        } else if (value && typeof value === 'object') {
          _results = [];
          for (className in value) {
            toggle = value[className];
            if (toggle) {
              _results.push(element.addClass(className));
            } else {
              _results.push(element.removeClass(className));
            }
          }
          return _results;
        }
      });
    },
    value: function(element, expr, data) {
      var setter;
      bindExpression(element, expr, data, function(value) {
        return element.val(value);
      });
      setter = createBoundExpr(expr + ' = value', data, ['value']);
      setter(element.val());
      return element.on('keyup', function() {
        setter(element.val());
        return syncView();
      });
    }
  };
  events = ['click', 'dblclick', 'submit', 'change', 'focus', 'blur'];
  keyCodes = {
    enter: 13,
    esc: 27
  };
  toggles = ['checked', 'disabled'];
  attribs = ['href', 'src'];
  events.forEach(function(eventName) {
    return bindTo.handlers['on' + eventName] = function(element, expr, data) {
      return element.on(eventName, function(event) {
        event.preventDefault();
        return evaluate(expr, data);
      });
    };
  });
  Object.keys(keyCodes).forEach(function(name) {
    var keyCode;
    keyCode = keyCodes[name];
    return bindTo.handlers['on' + name] = function(element, expr, data) {
      return element.on('keydown', function(event) {
        if (event.keyCode === keyCode) {
          event.preventDefault();
          return evaluate(expr, data);
        }
      });
    };
  });
  toggles.forEach(function(attr) {
    return bindTo.handlers[attr] = function(element, expr, data) {
      return bindExpression(element, expr, data, function(value) {
        return element.prop(attr, value);
      });
    };
  });
  attribs.forEach(function(attr) {
    return bindTo.handlers[attr] = function(element, expr, data) {
      return bindExpression(element, expr, data, function(value) {
        if (value != null) {
          return element.attr(attr, value);
        } else {
          return element.removeAttr(attr);
        }
      });
    };
  });
  Path.onchange = function() {
    return $(document).trigger('urlchange');
  };
  onRemove = function(element, cb) {
    return element.on('removeObserver', cb);
  };
  $.event.special.removeObserver = {
    remove: function(event) {
      return event.handler();
    }
  };
  varExpr = /[a-z$_\$][a-z_\$0-9\.-]*\s*:?|'|"/gi;
  normalizeExpression = function(expr, argNames) {
    var index, match, rewritten;
    argNames = argNames.concat(['this', 'window', 'true', 'false']);
    rewritten = '';
    index = 0;
    while ((match = varExpr.exec(expr))) {
      if (match) {
        match = match[0];
        rewritten += expr.slice(index, varExpr.lastIndex - match.length);
        if (match === "'" || match === '"') {
          index = expr.indexOf(match, varExpr.lastIndex) + 1;
          rewritten += expr.slice(varExpr.lastIndex - 1, index);
          varExpr.lastIndex = index;
        } else if (expr[varExpr.lastIndex - match.length - 1] === '.') {
          rewritten += match;
          index = varExpr.lastIndex;
        } else {
          if (match.slice(-1) !== ':' && argNames.indexOf(match.split('.').shift()) === -1) {
            rewritten += 'this.';
          }
          rewritten += match;
          index = varExpr.lastIndex;
        }
      }
    }
    rewritten += expr.slice(index);
    return rewritten;
  };
  bindExpression = function(element, expr, data, callback) {
    var observer, wrapper;
    wrapper = function(value, changes) {
      element.trigger('boundUpdate');
      return callback(value, changes);
    };
    observer = observers.add(createBoundExpr(expr, data), true, wrapper);
    onRemove(element, function() {
      return observer.close();
    });
    return observer;
  };
  notThis = function(name) {
    return name !== 'this';
  };
  getDataArgNames = function(data) {
    return Object.keys(data).filter(notThis).sort();
  };
  getDataArgs = function(data) {
    return Object.keys(data).filter(notThis).sort().map(function(key) {
      return data[key];
    });
  };
  exprCache = {};
  createFunction = function(expr, data, extras) {
    var argNames, e, func, functionBody;
    argNames = getDataArgNames(data);
    if (extras) {
      argNames = argNames.concat(extras);
    }
    expr = normalizeExpression(expr, argNames);
    func = exprCache[expr];
    if (func) {
      return func;
    }
    try {
      if (expr.indexOf('(') === -1) {
        functionBody = "try{return " + expr + "}catch(e){}";
      } else {
        functionBody = "return " + expr;
      }
      func = exprCache[expr] = Function.apply(null, __slice.call(argNames).concat([functionBody]));
    } catch (_error) {
      e = _error;
      throw 'Error evaluating code for binding: "' + expr + '" with error: ' + e.message;
    }
    return func;
  };
  createBoundExpr = function(expr, data, extras) {
    var args, func;
    func = createFunction(expr, data, extras);
    args = getDataArgs(data);
    return func.bind.apply(func, [data["this"]].concat(__slice.call(args)));
  };
  return evaluate = function(expr, data) {
    var args, func;
    func = createFunction(expr, data);
    args = getDataArgs(data);
    return func.apply(data["this"], args);
  };
})(jQuery);

var __hasProp = {}.hasOwnProperty;

(function(global) {
  var chip;
  chip = {
    templates: {},
    controllers: {},
    getTemplate: function(name) {
      return $(chip.templates[name]);
    },
    getController: function(name, options) {
      if (!chip.controllers.hasOwnProperty(name)) {
        throw 'Controller "' + name + '" does not exist';
      }
      return new chip.controllers[name](options);
    },
    controller: function(name, definition) {
      var controller, key, value;
      if (definition == null) {
        definition = {};
      }
      controller = (function() {
        function controller(data) {
          if (data == null) {
            data = {};
          }
          this.name = name;
          this.parent = data.parent;
          this.model = data.model;
          this.element = data.element;
        }

        return controller;

      })();
      for (key in definition) {
        if (!__hasProp.call(definition, key)) continue;
        value = definition[key];
        controller.prototype[key] = value;
      }
      return chip.controllers[name] = controller;
    },
    runRoute: function(name, parents) {
      var container, controller, path, selector, template, _i, _len;
      selector = ['[data-route]'];
      for (_i = 0, _len = parents.length; _i < _len; _i++) {
        path = parents[_i];
        selector.push('[data-route]');
      }
      selector = selector.join(' ');
      container = $(selector);
      controller = container.data('controller');
      if (controller != null) {
        if (typeof controller.teardown === "function") {
          controller.teardown();
        }
      }
      controller = chip.getController(name);
      template = chip.getTemplate(name);
      container.data('controller', controller).html(template).bindTo(controller);
      if (controller != null) {
        if (typeof controller.setup === "function") {
          controller.setup();
        }
      }
      return syncView();
    },
    route: function(path, name, subroutes) {
      var parents;
      if (typeof name === 'function') {
        subroutes = name;
      }
      if (typeof name !== 'string') {
        name = path.replace(/^\//, '').replace(/\/\w/, function(match) {
          return match.slice(1).toUpperCase();
        });
      }
      if (!chip.route.parents) {
        chip.route.parents = [];
      }
      parents = chip.route.parents.slice();
      if (parents.length) {
        path = parents.join('') + path;
      }
      Path.map(path).to(function() {
        return chip.runRoute(name, parents);
      });
      if (subroutes) {
        chip.route.parents.push(path);
        subroutes(chip.route);
        return chip.route.parents.pop();
      }
    },
    listen: function() {
      Path.history.listen();
      if (Path.history.supported) {
        return $('body').on('click', 'a[href]', function(event) {
          event.preventDefault();
          return Path.history.pushState({}, "", $(this).attr("href"));
        });
      }
    }
  };
  if (typeof define === 'function' && define.amd) {
    return define('chip', chip);
  } else if (typeof exports === 'object' && typeof module === 'object') {
    global.chip = chip;
    return module.exports = chip;
  } else {
    return global.chip = chip;
  }
})(this);
