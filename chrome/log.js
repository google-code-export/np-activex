// Copyright (c) 2012 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

var backgroundPage = chrome.extension.getBackgroundPage();

var defaultTabId = parseInt(location.href.replace(/.*tabid=([0-9]*).*/, '$1'));

function insertTabInfo(tab) {
  if (isNaN(defaultTabId)) {
    defaultTabId = tab.id;
  }
  if (uls[tab.id]) {
    return;
  }

  var ul = $('<ul>').appendTo($('#logs_items'));
  uls[tab.id] = ul;

  var title = tab.title;
  if (!title) {
    title = "Tab " + tab.id;
  }

  $('<a>').attr('href', '#')
  .attr('tabid', tab.id)
  .text(title)
  .click(function(e) {
    loadTabInfo(parseInt($(e.target).attr('tabid')));
  }).appendTo(ul);
}

var uls = {};
$(document).ready(function() {
  chrome.tabs.query({}, function(tabs) {
    for (var i = 0; i < tabs.length; ++i) {
      var protocol = tabs[i].url.replace(/(^[^:]*).*/, '$1');
      if (protocol != 'http' && protocol != 'https' && protocol != 'file') {
        continue;
      }
      insertTabInfo(tabs[i]);
    }

    for (var i in backgroundPage.tabStatus) {
      insertTabInfo({id: i});
    }
    
    $('#tracking').change(function() {
      var tabStatus = backgroundPage.tabStatus[currentTab];
      if (tabStatus) {
        tabStatus.tracking = tracking.checked;
      }
    });
    loadTabInfo(defaultTabId);
  });
});

var currentTab = -1;
function loadTabInfo(tabId) {
  if (tabId != currentTab) {
    if (currentTab != -1) {
      uls[currentTab].removeClass('selected');
    }
    currentTab = tabId;
    uls[tabId].addClass('selected');
    var s = backgroundPage.generateLogFile(tabId);
    $("#text").val(s);

    tracking.checked = backgroundPage.tabStatus[tabId].tracking;
  }
}
