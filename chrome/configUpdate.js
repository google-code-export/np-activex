// Copyright (c) 2012 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

// Updater events:
//   error
//   updating
//   complete
//   success
//   itemupdated
//   progress
// properties:
//   status
//   lastUpdate

// Can be used for debugging.
var defaultServer = "http://settings.np-activex.googlecode.com/hg/";
var server=localStorage.updateServer || defaultServer;

function ObjectWithEvent() {
  this._events = {};
};

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

function UpdateSession() {
  ObjectWithEvent.call(this);
  this.jqXHRs = [];
  this.reset();
}

UpdateSession.prototype = {
  __proto__: ObjectWithEvent.prototype,

  updateProgress: function() {
    with(this) {
      if (finished == total) {
        if (error == 0) {
          this.trigger('success');
        }
        this.trigger('complete');
        // Clear the requests.
        this.jqXHRs = [];
      } else {
        this.trigger('progress');
      }
    }
  },

  updateFile: function(request) {
    ++this.total;
    var session = this;
    var jqXHR = UpdateSession.updateFile(request)
    .fail(function(xhr, msg, thrown) {
      ++session.error;
      session.trigger('error', [xhr, msg, thrown]);
      session.updateProgress();
    }).always(function() {
      ++session.finished;
      session.updateProgress();
    });
    this.jqXHRs.push(jqXHR);
  },

  reset: function() {
    this.finished = this.total = this.error = 0;
    if (this.updateToken) {
      clearTimeout(this.updateToken);
      this.updateToken = undefined;
    }
    for (var i = 0; i < this.jqXHRs.length; ++i) {
      this.jqXHRs[i].abort();
    }
    this.jqXHRs = [];
  },

  startUpdate: function() {
    this.reset();
    this.trigger('updating');
  }
};

UpdateSession.prototype.__defineGetter__('status', function() {
  if (this.finished == this.total) {
    return "stop";
  } else {
    return "updating";
  }
});

UpdateSession.setUpdateInterval= function(callback, session, interval) {
  session.bind('complete', function() {
    session.updateToken = setTimeout(callback, interval);
  });
  callback();
};

UpdateSession.updateFile = function(request) {
  if (request.url.match(/^.*:\/\//) == null) {
    request.url = server + request.url;
  }

  trackUpdateFile(request.url);

  return $.ajax(request);
};
