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

var notifyBar = null;
var pageDOMLoaded = false;
var needNotifyBar = false;

function showNotifyBar(request) {
  if (notifyBar) {
    return;
  }
  if (!pageDOMLoaded) {
    needNotifyBar = true;
    return;
  }
  notifyBar = {};
  log('Create notification bar');
  var barurl = chrome.extension.getURL('notifybar.html');
  if (document.body.tagName == 'BODY') {
    var iframe = document.createElement('iframe');
    iframe.frameBorder=0;
    iframe.src = barurl;
    iframe.height = "35px";
    iframe.width = "100%";
    iframe.style.top = "0px";
    iframe.style.left = "0px";
    iframe.style.zIndex = '2000';
    iframe.style.position = 'fixed';
    notifyBar.iframe = iframe;
    document.body.insertBefore(iframe, document.body.firstChild);

    var placeHolder = document.createElement('div');
    placeHolder.style.height = iframe.height;
    placeHolder.style.zIndex = '1999';
    placeHolder.style.borderWidth = '0px';
    placeHolder.style.borderStyle = 'solid';
    placeHolder.style.borderBottomWidth = '1px';
    document.body.insertBefore(placeHolder, document.body.firstChild);
    notifyBar.placeHolder = placeHolder;
  } else if (document.body.tagName == 'FRAMESET') {
    // We can't do this..
    return;
  }
}

function dismissNotifyBar() {
  if (!notifyBar || !notifyBar.iframe) {
    return;
  }
  notifyBar.iframe.parentNode.removeChild(notifyBar.iframe);
  notifyBar.placeHolder.parentNode.removeChild(notifyBar.placeHolder);
}

chrome.extension.onRequest.addListener(
  function(request, sender, sendResponse) {
  if (self == top && request.command == 'NotifyUser') {
    showNotifyBar(request);
    sendResponse({});
  } else if (self == top && request.command == 'DismissNotificationPage') {
    dismissNotifyBar();
    sendResponse({});
  }
});

chrome.extension.sendRequest(
  {command:"Configuration", href:location.href, top: self == top}, loadConfig);

window.addEventListener("beforeload", onBeforeLoading, true);
//window.addEventListener('error', onError, true);
