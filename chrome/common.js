// Copyright (c) 2012 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

var responseCommands = new Object();

responseCommands.Configuration = function(request, tab, sendResponse) {
  sendResponse(setting.getPageConfig(request.href));
}

function startListener() {
  chrome.extension.onRequest.addListener
    (function(request, sender, sendResponse) {
      if (!sender.tab) {
        // Must call from some tab.
        console.error("Illegal call");
        return;
      }

      var resp = responseCommands[request.command];
      if (resp) {
        resp(request, sender.tab, sendResponse);
      } else {
        console.error("Unknown command " + request.command);
      }
    });
}

(function (){
  var tabStatus = {};
  var greenIcon = chrome.extension.getURL('icon16.png');
  var grayIcon = chrome.extension.getURL('icon16-gray.png');
  var errorIcon = chrome.extension.getURL('icon16-error.png');
  responseCommands.ResetPageIcon = function(request, tab, sendResponse) {
    delete tabStatus[tab.id];
    chrome.pageAction.hide(tab.id);
  };
  responseCommands.DetectControl = function(request, tab, sendResponse) {
    chrome.pageAction.show(tab.id);
    if (!tabStatus[tab.id]) {
      tabStatus[tab.id] = {count: 0, actived: 0, error: 0};
    } 
    var status = tabStatus[tab.id];
    if (request.actived) {
      ++status.actived;
    }
    ++status.count;
    var title = "";
    // TODO: error counting
    if (status.error != 0) {
      chrome.pageAction.setIcon({
        tabId: tab.id,
        path: errorIcon
      });
      title = $$('page_action_error');
    } else if (status.count != status.actived) {
      // Disabled..
      chrome.pageAction.setIcon({
        tabId: tab.id,
        path: grayIcon
      });
      title = $$('page_action_disabled');
    } else {
      // OK
      chrome.pageAction.setIcon({
        tabId: tab.id,
        path: greenIcon
      });
      title = $$('page_action_ok');
    }
    chrome.pageAction.setTitle({
      tabId: tab.id,
      title: title
    });
  }
}());
