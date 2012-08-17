// Copyright (c) 2012 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

function ObjectWithEvent() {
  this._events = {};
}

ObjectWithEvent.prototype = {
  bind: function(name, func) {
    if (!Array.isArray(this._events[name])) {
      this._events[name] = [];
    }
    this._events[name].push(func);
  },
  unbind: function(name, func) {
    if (!Array.isArray(this._events[name])) {
      return;
    }
    for (var i = 0; i < this._events[name].length; ++i) {
      if (this._events[name][i] == func) {
        this._events[name].splice(i, 1);
        break;
      }
    }
  },
  trigger: function(name, argument) {
    if (this._events[name]) {
      var handlers = this._events[name];
      for (var i = 0; i < handlers.length; ++i) {
        handlers[i].apply(this, argument);
      }
    }
  }
};

