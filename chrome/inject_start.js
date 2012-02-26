// Copyright (c) 2012 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

var controlLogFName="__npactivex_log";
var controlLogEvent="__npactivex_log_event__";

var config = null;
var port = null;

var logs = [];

var scriptConfig = {
  none2block: false,
  formid: false,
  documentid: false
};
function onControlLog(event) {
  var message = event.data;
  log(message);
}

window.addEventListener(controlLogEvent, onControlLog, false);

function connect() {
  if (port) {
    return;
  }
  port = chrome.extension.connect();
  for (var i = 0; i < logs.length; ++i) {
    port.postMessage({command: 'Log', message: logs[i]});
  }
  if (port && config) {
    logs = undefined;
  }
}

function log(message) {
  var time = (new Date()).toLocaleTimeString();
  message = time + ' ' + message;
  if (config && config.logEnabled) {
    console.log(message);
  }

  if (port) {
    port.postMessage({command: 'Log', message: message});
  }
  if (!config || !port) {
    logs.push(message);
  }
}

log('PageURL: ' + location.href);

var pendingObjects = [];
function init(response) {
  config = new ActiveXConfig(response);

  if (config.logEnabled) {
    for (var i = 0; i < logs.length; ++i) {
      console.log(logs[i]);
    }
  }

  eval(config.extScript);
  executeScript(config.pageScript);

  setUserAgent();

  log('Page rule:' + JSON.stringify(config.pageRule));
  for (var i = 0; i < pendingObjects.length; ++i) {
    pendingObjects[i].activex_process = false;
    process(pendingObjects[i]);
    cacheConfig();
  }
  delete pendingObjects;
}

function cacheConfig() {
  sessionStorage.activex_config_cache = JSON.stringify(config);
}

function loadConfig(response) {
  if (config) {
    config = new ActiveXConfig(response);
    var cache = sessionStorage.activex_config_cache;
    if (cache) {
      cacheConfig();
    }
  } else {
    init(response);
  }
  if (config.pageRule) {
    cacheConfig();
  }
}

function loadSessionConfig() {
  var cache = sessionStorage.activex_config_cache;
  if (cache) {
    log('Loading config from session cache');
    init(JSON.parse(cache));
  }
}

loadSessionConfig();

chrome.extension.sendRequest(
  {command:"Configuration", href:location.href}, loadConfig);

window.addEventListener("beforeload", onBeforeLoading, true);
