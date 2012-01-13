// Copyright (c) 2012 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

// Permission for experimental not given.
var handler = chrome.webRequest;

function onBeforeSendHeaders(details) {
  var rule = setting.getFirstMatchedRule(
    {href: details.url}, setting.cache.userAgent);

  if (!rule || !(rule.userAgent in agents)) {
    return {};
  }
  for (var i = 0; i < details.requestHeaders.length; ++i) {
    if (details.requestHeaders[i].name == 'User-Agent') {
      details.requestHeaders[i].value = agents[rule.userAgent];
      break;
    }
  }
  console.log('update useragent ' + details.url);
  console.log(agents[rule.userAgent]);
  return {requestHeaders: details.requestHeaders};
}

function registerRequestListener() {
  if (!handler) {
    return;
  }
  var filters = {
    urls: ["<all_urls>"],
    types: ["main_frame", "sub_frame", "xmlhttprequest"]
  };
  try{ 
    handler.onBeforeSendHeaders.addListener(
    onBeforeSendHeaders, filters, ["requestHeaders", "blocking"]);
  } catch (e) {
    console.log('Your browser doesn\'t support webRequest');
  }
}
