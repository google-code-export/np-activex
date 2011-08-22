// Copyright (c) 2010 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

var controlLogFName="__npactivex_log";
var controlLogEvent="__npactivex_log_event__";

function onControlLog(event) {
  var data = JSON.parse(event.data);
  data.logid = logid;
  data.command = "controlLog";
  chrome.extension.sendRequest(data, function(){});
}

function setLogId(id) {
  if (logid < 0) {
    logid = id;
  }
}

function waitAndLog(text) {
  if (!config || logid == -1) {
    setTimeout(function(){waitAndLog(text)}, 200);
  } else {
    if (!config.logEnabled)
      return;
    if (logid == -2)
      logid = -1;
    chrome.extension.sendRequest(
        {command:"log", content:text, url: location.href, logid:logid},
        setLogId);
  }
}

function log(text) {
  waitAndLog(text);
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

var config = null;
var logid = -2;
var pendingObjects = [];
function init(response) {
  config = new ActiveXConfig(response);
  if (config.isUrlMatched(location.href)) {
    // Inject this script makes site use new ActiveXObject to create objects
    // without any restriction, for trusted sites only.
    injectScript(chrome.extension.getURL("ie_script_declaration.js"));
  }
  if (config.logEnabled) {
    // injectScript(chrome.extension.getURL("inject_log.js"));
    window.addEventListener(controlLogEvent, onControlLog, false);
  }
  for (var i = 0; i < pendingObjects.length; ++i) {
    process(pendingObjects[i]);
  }
  delete pendingObjects;
}

chrome.extension.sendRequest(
    {command:"Configuration", url:location.href}, init);

window.addEventListener("beforeload", onBeforeLoading, true);
