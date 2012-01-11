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


//var server = "http://settings.np-activex.googlecode.com/hg/";
var server="http://localhost:5454/setting/";

var serverConfig = {
  setting: [
  ],
  scripts: [
  ],
  timestamp: {
    setting: -1,
    scripts: -1
  },
  lastUpdate: 0
};

// Update per 5 hours.
var interval = 1000 * 3600 * 5;

function UpdateSession() {
  var val = $({});
  val.total = 1;
  val.finished = 0;
  val.error = 0;
  val.__proto__ = UpdateSession.prototype;
  val.updateToken = undefined;
  return val;
}

UpdateSession.prototype = {
  __proto__: $({}).__proto__,

  start: function() {
    this.update();
  },

  onUpdateError: function(xhr, msg, thrown) {
    ++this.error;
    updater.trigger('error', [xhr, msg, thrown]);
    this.updateProgress();
  },

  progress: function() {
    ++this.finished;
    this.updateProgress();
  },

  updateProgress: function() {
    with(this) {
      if (error + finished == total) {
        updater.trigger('complete', [finished, total]);
      } else {
        updater.trigger('progress', [finished, total, error]);
      }
    }
  },

  updateFile: function(file, callback, type) {
    var a = this;
    ++a.total;
    $.ajax({
      url: file,
      ifModified: true,
      success: function(nv, status, xhr) {
        if (callback && status == 'success') {
          callback(file, nv);
        }
        a.progress();
      },
      dataType: type,
      error: function() {a.onUpdateError()}
    })
  },

  reset: function() {
    this.finished = this.total = this.error = 0;
  },

  update: function() {
    with(this) {
      if (updateToken) {
        clearTimeout(updateToken);
        updateToken = undefined;
      }
      doUpdate();
      updateToken = setTimeout(update, interval);
    }
  },

  doUpdate: function() {
    with(this) {
      reset();
      trigger('updating');
      updateFile(server + 'setting.json', function(file, nv) {
        trigger('itemupdated', ['setting', nv]);
      });
      updateFile(server + 'scripts.json', function(file, nv) {
        trigger('itemupdated', ['scripts', nv]);
      });
    }
  }
}

UpdateSession.prototype.__defineGetter__('status', function() {
  if (this.finished + this.error == this.total) {
    return "stop";
  } else {
    return "updating";
  }
});

updater = new UpdateSession();

updater.bind('success', function() {
    setting.misc.lastUpdate = Date.now();
});

updater.bind('complete', function(e, finished, total) {
  if (finished == total) {
    updater.trigger('success');
  }
});

updater.bind('updating', function() {
  console.log('updating');
});

updater.bind('itemupdated', function(e, item, nv) {
  console.log('itemUpdated ' + item);
  if (item == 'setting') {
    var old = setting.defaultRules;
    setting.defaultRules = nv;
    setting.update('defaultRules', old);
  } else if (item == 'script') {
    var old = setting.scripts;
    setting.scripts = nv;
    setting.update('scripts', old);
  }
});

