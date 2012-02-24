var USE_RECORD_GAP = 3 * 60 * 1000; // 3 minutes
var background = chrome.extension.getBackgroundPage();

var _gaq = background._gaq || _gaq || [];

if (window == background) {
  _gaq.push(['_setAccount', 'UA-28870762-2']);
}
_gaq.push(['_trackPageview', location.href]);

function initGAS() {
  var setting = setting || background.setting || {};
  if (setting.misc.tracking) {
    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = 'https://ssl.google-analytics.com/ga.js';
      var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(ga, s);
  }
}

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

function trackEnable(identifier) {
  _gaq.push(['_trackEvent', 'option', 'enable', identifier]);
}

function trackAddCustomRule(rule) {
  _gaq.push(['_trackEvent', 'option', 'add', serializeRule(rule)]);
}
