// Copyright (c) 2012 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

var USE_RECORD_GAP = 3 * 60 * 1000; // 3 minutes

var _gaq = window._gaq || [];

_gaq.push(['_setAccount', 'UA-28870762-4']);
_gaq.push(['_trackPageview', location.href.replace(/\?.*$/, "")]);

function initGAS() {
  var background = chrome.extension.getBackgroundPage();
  var setting = setting || background.setting || {};
  if (!debug && setting.misc.tracking) {
    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = 'https://ssl.google-analytics.com/ga.js';
      var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(ga, s);
  } else if (!debug) {
    // dummy it. Non-debug && non-track
    _gaq.push = function() {};
  }
}

window.addEventListener('load', initGas, false);

var useHistory = {};
var issueHistory = {};

function trackCheckSpan(history, item) {
  var last = history[item];
  if (last && Date.now() - last < USE_RECORD_GAP) {
    return false;
  }
  history[item] = Date.now();
  return true;
}

function trackIssue(issue) {
  if (!trackCheckSpan(issueHistory, issue.identifier)) {
    return;
  }
  _gaq.push(['_trackEvent', 'usage', 'error', '' + issue.identifier]);
}

function trackVersion(version) {
  _gaq.push(['_trackEvent', 'option', 'version', version]);
}

function serializeRule(rule) {
  return rule.type[0] + ' ' + rule.value;
}

function trackUse(identifier) {
  if (!trackCheckSpan(useHistory, identifier)) {
    return;
  }
  if (identifier.substr(0, 7) == 'custom_') {
    var setting = setting || background.setting || {};
    var rule = setting.getItem(identifier);
    _gaq.push(['_trackEvent', 'usage', 'use-custom', serializeRule(rule)]);
  } else {
    _gaq.push(['_trackEvent', 'usage', 'use', identifier]);
  }
}

var urlHistory = {}
function trackNotUse(url) {
  if (!trackCheckSpan(urlHistory, url)) {
    return;
  }
  _gaq.push(['_trackEvent', 'usage', 'notuse', url]);
}

function trackDisable(identifier) {
  _gaq.push(['_trackEvent', 'option', 'disable', identifier]);
}

function trackAutoEnable(identifier) {
  _gaq.push(['_trackEvent', 'option', 'autoenable', identifier]);
}

function trackEnable(identifier) {
  _gaq.push(['_trackEvent', 'option', 'enable', identifier]);
}

function trackAddCustomRule(rule, auto) {
  var cmd = 'add';
  if (auto) {
    cmd = 'add-' + auto;
  }
  _gaq.push(['_trackEvent', 'option', cmd, serializeRule(rule)]);
}

function trackManualUpdate() {
  _gaq.push(['_trackEvent', 'update', 'manual']);
}

function trackUpdateFile(url) {
  _gaq.push(['_trackEvent', 'update', 'file', url]);
}
