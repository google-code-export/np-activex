// Copyright (c) 2010 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

var logger_MaxLogs = 1000;
function Logger() {
  this.reset();
  if (responseCommands) {
    if (!responseCommands.log) {
      responseCommands.log = function(request, tab) {
        var id = request.logid;
        if (id <= 0 || !id) {
          id = logger.getNextId();
        }
        logger.logPage(id, request.url, request.content);
        return id;
      }
      responseCommands.controlLog = function(request, tab) {
        var id = request.logid;
        logger.logControl(
            id, request.objId, request.file, request.line, request.message);
        return id;
      }
    }
  }
}

with (Logger) {
  Logger.prototype.reset = function() {
    this.logs = document.implementation.createDocument("", "", null);
    this.root = this.logs.createElement("ROOT");
    this.logs.appendChild(this.root);
    this.subarray = new Array();

    this.setting = this.logs.createElement("SETTING");
    this.root.appendChild(this.setting);

    this.system = this.logs.createElement("LOGENTRY");
    this.system.setAttribute("id", "System");
    this.root.appendChild(this.system);

    // Log between startId to currentId.
    this.startId = 0;
    this.currentId = 0;
  }

  Logger.prototype.getNextId = function() {
    return ++this.currentId;
  }

  Logger.prototype.removeOldEntry = function() {
    var oldEntry = subarray.shift();
    var id = oldEntry.getAttribute("id");
    if (id != "")
      delete this.logs[id];
    this.startId = oldEntry.tabid;
  }

  Logger.prototype.getLogEntry = function(id, callback) {
    var entry = this.logs[id];
    if (!entry) {
      entry = this.logs.createElement("LOGENTRY");
      entry.setAttribute("id", id);
      this.logs[id] = entry;
      if (callback) 
        callback(entry);
      this.root.appendChild(entry);
    }
    return entry;
  }

  Logger.prototype.logPage = function(tabid, url, text) {
    if (tabid < this.startId) {
      // Moved out of the index
      return;
    }
    var log = this;
    var entry = this.getLogEntry("tab" + tabid, function(entry) {
      entry.setAttribute("url", url);
      entry.setAttribute("type", "Page");
      entry.tabid = tabid;
      // Remove the first tab.
      if (log.subarray.length == logger_MaxLogs) {
        removeOldEntry();
      }
      log.subarray.push(entry);
    });
    this.logEntry(entry, text).setAttribute("type", "content-script");
  }

  Logger.prototype.logEntry = function(entry, text) {
    var date = new Date();
    var l = this.logs.createElement("LOGITEM");
    l.appendChild(this.logs.createTextNode(text));
    l.setAttribute("date", date.toDateString());
    l.setAttribute("time", date.toLocaleTimeString());
    entry.appendChild(l);
    return l;
  }

  Logger.prototype.LoadSystemSettings = function() {
    while (this.setting.firstChild)
      this.setting.removeChild(this.setting.firstChild);
    var settingString = 
      JSON.stringify(chrome.extension.getBackgroundPage().setting.toSeriable());
    var node = this.logs.createTextNode(settingString);
    this.setting.appendChild(node);
    node = this.logs.createElement("Navigator");
    node.setAttribute("userAgent", navigator.userAgent);
    node.setAttribute("platform", navigator.platform);
    this.setting.appendChild(node);
  }

  Logger.prototype.getLog = function() {
    this.LoadSystemSettings();
    return this.logs;
  }

  Logger.prototype.getLogString = function() {
    var log = this.getLog();
    var ser = new XMLSerializer();
    return ser.serializeToString(log);
  }

  Logger.prototype.logControl = function(id, objid, file, line, message) {
    if (id < this.startId)
      return;
    var entry = this.getLogEntry("tab" + id, function(){});
    var log = this.logEntry(entry, message);
    log.setAttribute("type", "control");
    log.setAttribute("objid", objid);
    log.setAttribute("file", file);
    log.setAttribute("line", line);
  }
  
  Logger.prototype.clear = function() {
    this.reset();
  }
}

function log(text) {
  if (settings.logEnabled && logger)
    logger.logEntry(system, text);
}
