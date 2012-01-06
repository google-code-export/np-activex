// Copyright (c) 2010 eagleonhill(qiuc12@gmail.com). All rights reserved.
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

function log(message) {
  if (config == null || config.getLogEnabled()) {
    console.log(message);
    logs.push(message);
  }
}

function injectScript(filename) {
  var scriptobj = document.createElement("script");
  var req = new XMLHttpRequest();
  req.open("GET", filename, false);
  req.send();
  scriptobj.innerHTML = req.responseText;
  document.documentElement.insertBefore(
      scriptobj, document.documentElement.firstChild);
}

var pendingObjects = [];
function init(response) {
  config = new ActiveXConfig(response);
  if (config.isUrlMatched(location.href)) {
    // Inject this script makes site use new ActiveXObject to create objects
    // without any restriction, for trusted sites only.
    injectScript(chrome.extension.getURL("ie_script_declaration.js"));
  }
  if (config.getLogEnabled()) {
    // injectScript(chrome.extension.getURL("inject_log.js"));
    window.addEventListener(controlLogEvent, onControlLog, false);
  } else {
    logs = [];
  }
  for (var i = 0; i < pendingObjects.length; ++i) {
    process(pendingObjects[i]);
  }
  delete pendingObjects;
}

chrome.extension.sendRequest(
    {command:"Configuration", url:location.href}, init);

window.addEventListener("beforeload", onBeforeLoading, true);
