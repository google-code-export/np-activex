// Copyright (c) 2012 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

var controlLogFName="__npactivex_log";
var controlLogEvent="__npactivex_log_event__";

var config = null;

var logs = [];
function onControlLog(event) {
  var message = event.data;
  log(message);
}

window.addEventListener(controlLogEvent, onControlLog, false);

function log(message) {
  if (config == null || config.logEnabled) {
    if (config != null) {
      console.log(message);
    }
    logs.push(message);
  }
}

var pendingObjects = [];
function init(response) {
  config = new ActiveXConfig(response);

  eval(config.extScript);
  executeScript(config.pageScript);

  setUserAgent();

  if (config.logEnabled) {
    for (var i = 0; i < logs.length; ++i) {
      console.log(logs[i]);
    }
  } else {
    logs = [];
  }
  log('pagerule:' + JSON.stringify(config.pageRule));
  for (var i = 0; i < pendingObjects.length; ++i) {
    process(pendingObjects[i]);
  }
  delete pendingObjects;
}

chrome.extension.sendRequest(
    {command:"Configuration", href:location.href}, init);

window.addEventListener("beforeload", onBeforeLoading, true);
