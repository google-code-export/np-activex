// Copyright (c) 2012 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

var tabId = parseInt(location.href.replace(/.*tabid=([0-9]*).*/, '$1'));
if (isNaN(tabId)) {
  alert('Invalid tab id');
}

var backgroundPage = chrome.extension.getBackgroundPage();

var tabInfo = backgroundPage.tabStatus[tabId];
var setting = backgroundPage.setting;
if (!tabInfo) {
  alert('Cannot get tab tabInfo');
}

$(document).ready(function() {
  $('.status').hide();
  $('#submitissue').hide();
  if (tabInfo.urldetect) {
    $('#status_urldetect').show();
  } else if (!tabInfo.count) {
    // Shouldn't have this popup
  } else if (tabInfo.error) {
    $('#status_error').show();
  } else if (tabInfo.count != tabInfo.actived) {
    $('#status_disabled').show();
  } else {
    $('#status_ok').show();
    $('#submitissue').show();
  }
});

$(document).ready(function() {
  $('#issue_view').hide();
  if (tabInfo.error != 0) {
    var errorid = tabInfo.issueId;
    var issue = setting.issues[errorid];
    $('#issue_content').text(issue.description);
    var url = issue.url;
    if (!url) {
      var issueUrl = "http://code.google.com/p/np-activex/issues/detail?id=";
      url = issueUrl + issue.issueId;
    }
    $('#issue_track').click(function() {
      chrome.tabs.create({url:url});
      window.close();
    });
    $('#issue_view').show();
  }
});

function refresh() {
  alert($$('refresh_needed'));
  window.close();
}

function showEnableBtns() {
  var list = $('#enable_btns');
  list.hide();
  if (tabInfo.urldetect || tabInfo.count > tabInfo.actived) {
    list.show();
    var info = {actived: true};
    for (var i = 0; i < tabInfo.frames && info.actived; ++i) {
      for (var j = 0; j < tabInfo.objs[i].length && info.actived; ++j) {
        info = tabInfo.objs[i][j];
      }
    }
    if (info.actived) {
      return;
    }
    var rule = setting.getFirstMatchedRule(info, setting.defaultRules);
    if (rule) {
      var button = $('<button>').addClass('defaultRule');
      button.text($$('enable_default_rule', rule.title));
      button.click(function() {
        setting.activeRule(rule);
        refresh();
      });
      list.append(button);
    } else {
      var site = info.href.replace(/[^:]*:\/\/([^\/]*).*/, '$1');
      var sitepattern = info.href.replace(/([^:]*:\/\/[^\/]*).*/, '$1/*');

      var btn1 = $('<button>').addClass('customRule').
      text($$('add_rule_site', site)).click(function() {
        var rule = setting.createRule();
        rule.type = 'wild';
        rule.value = sitepattern;
        setting.addCustomRule(rule, 'popup');
        refresh();
      });

      var clsid = info.clsid;
      var btn2 = $('<button>').addClass('customRule').
      text($$('add_rule_clsid')).click(function() {
        var rule = setting.createRule();
        rule.type = 'clsid';
        rule.value = clsid;
        setting.addCustomRule(rule, 'popup');
        refresh();
      });
      list.append(btn1).append(btn2);
    }
  }
}

$(document).ready(function() {
  $('#submitissue').click(function() {
    tabInfo.tracking = true;
    alert($$('issue_submitting_desp'));
    window.close();
  });
});

$(document).ready(showEnableBtns);

$(window).load(function() {
  $('#share').load('share.html');
});
