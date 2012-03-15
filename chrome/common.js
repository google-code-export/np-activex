// Copyright (c) 2012 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

var tabStatus = {};
var version;
var default_id = "lgllffgicojgllpmdbemgglaponefajn";
var debug = chrome.i18n.getMessage("@@extension_id") != default_id;
var firstRun = false;
var firstUpgrade = false;

var blackList = [
  /^https?:\/\/[^\/]*\.taobao\.com\/.*/i,
  /^https?:\/\/[^\/]*\.alipay\.com\/.*/i
];

var MAX_LOG = 400;

(function getVersion() {
  $.ajax('manifest.json', {
    success: function (v){
      v = JSON.parse(v);
      version = v.version;
      trackVersion(version);
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
        var config = setting.getPageConfig(request.href);
        sendResponse(config);
        if (request.top) {
          resetTabStatus(sender.tab.id);
          var dummy = {href: request.href, clsid: 'NULL', urldetect: true};
          if (!config.pageRule &&
              setting.getFirstMatchedRule(
                dummy, setting.defaultRules)) {
            detectControl(dummy, sender.tab.id, 0);
          }
        }
      } else if (request.command == 'GetNotification') {
        getNotification(request, sender, sendResponse);
      } else if (request.command == 'DismissNotification') {
        chrome.tabs.sendRequest(
          sender.tab.id, {command:'DismissNotification'});
        sendResponse({});
      } else if (request.command = "BlockSite") {
        setting.blocked.push({type:"wild", value:request.site});
        setting.update();
      } else {
        sendResponse({});
      }
    }
  );
}

var blocked = {};
function notifyUser(request, tabId) {
  var s = tabStatus[tabId];
  if (s.notify && (s.urldetect || s.count > s.actived)) {
    console.log("Notify the user on tab ", tabId);
    chrome.tabs.sendRequest(tabId, {command: "NotifyUser", tabid: tabId}, null);
  }
}

var greenIcon = chrome.extension.getURL('icon16.png');
var grayIcon = chrome.extension.getURL('icon16-gray.png');
var errorIcon = chrome.extension.getURL('icon16-error.png');
var responseCommands = {};

function resetTabStatus(tabId) {
  tabStatus[tabId] = {
    count: 0,
    actived: 0,
    error: 0,
    urldetect: 0,
    notify: true,
    issueId: null,
    logs: {"0":[]},
    objs: {"0":[]},
    frames: 1,
    tracking: false
  };
}

function initPort(port) {
  var tabId = port.sender.tab.id;
  if (!(tabId in tabStatus)) {
    resetTabStatus(tabId);
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
  if (tabStatus[tabId]) {
    tabStatus[tabId].removed = true;

    var TIMEOUT = 1000 * 60 * 5;
    // clean up after 5 mins.
    window.setTimeout(function() {
      delete tabStatus[tabId];
    }, TIMEOUT);
  }
});

function countTabObject(status, info, delta) {
  for (var i = 0; i < blackList.length; ++i) {
    if (info.href.match(blackList[i])) {
      return;
    }
  }
  if (setting.getFirstMatchedRule(info, setting.blocked)) {
    status.notify = false;
  }
  if (info.urldetect) {
    status.urldetect += delta;
    // That's not a object.
    return;
  }
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
  if (tabStatus[tabId].removed) {
    return;
  }

  var status = tabStatus[tabId];
  var title = "";
  var iconPath = greenIcon;
  if (!status.count && !status.urldetect) {
    chrome.pageAction.hide(tabId);
    return;
  } else {
    chrome.pageAction.show(tabId);
  }

  if (status.urldetect) {
    // Matched some rule.
    iconPath = grayIcon;
    title = $$('status_urldetect');
  } else if (status.count == 0) {
    // Do nothing..
  } else if (status.error != 0) {
    // Error
    iconPath = errorIcon;
    title = $$('status_error');
  } else if (status.count != status.actived) {
    // Disabled..
    iconPath = grayIcon;
    title = $$('status_disabled');
  } else {
    // OK
    iconPath = greenIcon;
    title = $$('status_ok');
  }
  chrome.pageAction.setIcon({
    tabId: tabId,
    path: iconPath
  });
  chrome.pageAction.setTitle({
    tabId: tabId,
    title: title
  });
  chrome.pageAction.setPopup({
    tabId: tabId,
    popup: 'popup.html?tabid=' + tabId
  });
}

function detectControl(request, tabId, frameId) {
  var status = tabStatus[tabId];
  if (frameId != 0 && status.objs[0].length) {
    // Remove the item to identify the page.
    countTabObject(status, status.objs[0][0], -1);
    status.objs[0] = [];
  }
  status.objs[frameId].push(request);

  countTabObject(status, request, 1);
  showTabStatus(tabId);
  notifyUser(request, tabId);
}

responseCommands.DetectControl = detectControl;

responseCommands.Log = function(request, tabId, frameId) {
  var logs = tabStatus[tabId].logs[frameId];
  if (logs.length < MAX_LOG) {
    logs.push(request.message);
  } else if (logs.length == MAX_LOG) {
    logs.push('More logs clipped');
  }
}

function generateLogFile(tabId) {
  var status = tabStatus[tabId];
  if (!status) {
    return 'No logs for tab ' + tabId;
  }
  var ret = '---------- Start of log --------------\n';
  ret += 'UserAgent: ' + navigator.userAgent + '\n';
  ret += 'Extension version: ' + version + '\n';
  ret += '\n';
  for (var i = 0; i < status.frames; ++i) {
    if (status.objs[i].length == 0 && status.logs[i].length == 0) {
      continue;
    }
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
  ret += '\n---------------- End of log ---------------\n';
  ret += stringHash(ret);
  return ret;
}

function getNotification(request, sender, sendResponse) {
  var tabid = sender.tab.id;
  chrome.tabs.get(tabid, function(tab) {
    var config = {};
    config.tabId = tab.id;
    config.site = tab.url.replace(/[^:]*:\/\/([^\/]*).*/, '$1');
    config.sitePattern = tab.url.replace(/([^:]*:\/\/[^\/]*).*/, '$1/*');
    if (tabStatus[tabid].urldetect) {
      config.message = $$('status_urldetect');
    } else {
      config.message = $$('status_disabled');
    }
    config.closeMsg = $$('bar_close');
    config.enableMsg = $$('bar_enable');
    config.blockMsg = $$('bar_block', config.site);
    sendResponse(config);
  });
}
