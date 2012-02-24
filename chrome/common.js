// Copyright (c) 2012 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

var tabStatus = {};
var version;

(function getVersion() {
  $.ajax('manifest.json', {
    success: function (v){
      v = JSON.parse(v);
      version = v.version;
    }
  });
})();

function startListener() {
  chrome.extension.onConnect.addListener(function(port) {
    if (!port.sender.tab) {
      console.error('Not connect from tab');
      return;
    }
    initPort(port);
  });
  chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse) {
      if (!sender.tab) {
        console.error('Request from non-tab');
      } else if (request.command == 'Configuration') {
        sendResponse(setting.getPageConfig(request.href));
      } else {
        sendResponse({});
      }
    }
  );
}

var greenIcon = chrome.extension.getURL('icon16.png');
var grayIcon = chrome.extension.getURL('icon16-gray.png');
var errorIcon = chrome.extension.getURL('icon16-error.png');
var responseCommands = {};

function initPort(port) {
  var tabId = port.sender.tab.id;
  if (!(tabId in tabStatus)) {
    tabStatus[tabId] = {
      count: 0,
      actived: 0,
      error: 0,
      issueId: null,
      logs: {},
      objs: {},
      frames: 0,
      tracking: false
    };
  }
  var status = tabStatus[tabId];
  var frameId = tabStatus[tabId].frames++;
  status.logs[frameId] = [];
  status.objs[frameId] = [];

  port.onMessage.addListener(function(request) {
    var resp = responseCommands[request.command];
    if (resp) {
      delete request.command;
      resp(request, tabId, frameId);
    } else {
      console.error("Unknown command " + request.command);
    }
  });
  port.onDisconnect.addListener(function() {
    for (var i = 0; i < status.objs[frameId].length; ++i) {
      countTabObject(status, status.objs[frameId][i], -1);
    }
    showTabStatus(tabId);
    if (status.tracking) {
      if (status.count == 0) {
        // Open the log page.
        window.open('log.html?tabid=' + tabId);
        status.tracking = false;
      }
    } else {
      // Clean up.
      status.logs[frameId] = [];
      status.objs[frameId] = [];
    }
  });
}

chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
  var TIMEOUT = 1000 * 60 * 5;
  // clean up after 5 mins.
  window.setTimeout(function() {
    delete tabStatus[tabId];
  }, TIMEOUT);
});

function countTabObject(status, info, delta) {
  if (info.actived) {
    status.actived += delta;
    if (delta > 0) {
      trackUse(info.rule);
    }
  } else if (delta > 0) {
    trackNotUse(info.href);
  }
  status.count += delta;
  var issue = setting.getMatchedIssue(info);
  if (issue) {
    status.error += delta;
    status.issueId = issue.identifier;
    if (delta > 0) {
      trackIssue(issue);
    }
  }
}

function showTabStatus(tabId) {
  try {
    var status = tabStatus[tabId];
    var title = "";
    if (status.count == 0) {
      chrome.pageAction.hide(tabId);
    } else {
      chrome.pageAction.show(tabId);
    }

    chrome.pageAction.setPopup({
      tabId: tabId,
      popup: 'popup.html?tabid=' + tabId
    });
    if (status.count == 0) {
      // Do nothing..
    } else if (status.error != 0) {
      chrome.pageAction.setIcon({
        tabId: tabId,
        path: errorIcon
      });
      title = $$('status_error');
    } else if (status.count != status.actived) {
      // Disabled..
      chrome.pageAction.setIcon({
        tabId: tabId,
        path: grayIcon
      });
      title = $$('status_disabled');
    } else {
      // OK
      chrome.pageAction.setIcon({
        tabId: tabId,
        path: greenIcon
      });
      title = $$('status_ok');
    }
    chrome.pageAction.setTitle({
      tabId: tabId,
      title: title
    });
  } catch (e) {
    // Tab is closed
  }
}

responseCommands.DetectControl = function(request, tabId, frameId) {
  var status = tabStatus[tabId];
  status.objs[frameId].push(request);

  countTabObject(status, request, 1);
  showTabStatus(tabId);
}

responseCommands.Log = function(request, tabId, frameId) {
  tabStatus[tabId].logs[frameId].push(request.message);
}

function generateLogFile(tabId) {
  var status = tabStatus[tabId];
  if (!status) {
    return '';
  }
  var ret = '';
  ret += 'UserAgent: ' + navigator.userAgent + '\n';
  ret += 'Extension version: ' + version + '\n';
  ret += '\n';
  for (var i = 0; i < status.frames; ++i) {
    if (i) {
      ret += '\n\n';
    }
    ret += '------------ Frame ' + (i + 1) + ' ------------------\n';
    ret += 'Objects:\n';
    for (var j = 0; j < status.objs[i].length; ++j) {
      ret += JSON.stringify(status.objs[i][j]) + '\n';
    }
    ret += '\n';
    ret += 'Log:\n';
    for (var j = 0; j < status.logs[i].length; ++j) {
      ret += status.logs[i][j] + '\n';
    }
  }
  return ret;
}
