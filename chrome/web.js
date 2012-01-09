// Copyright (c) 2010 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

// Permission for experimental not given.
var handler = (chrome.experimental.webRequest || chrome.webRequest);

var agents = {
  ie9: "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)",
  ie8: "Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0)",
  ie7: "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)",
  ff7win: "Mozilla/5.0 (Windows NT 6.1; Intel Mac OS X 10.6; rv:7.0.1) Gecko/20100101 Firefox/7.0.1", 
  ff7mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.6; rv:7.0.1) Gecko/20100101 Firefox/7.0.1",
  ip5: "Mozilla/5.0 (iPhone; CPU iPhone OS 5_0 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9A334 Safari/7534.48.3",
  ipad5: "Mozilla/5.0 (iPad; CPU OS 5_0 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9A334 Safari/7534.48.3"
};

function onBeforeSendHeaders(details) {
  var rule = setting.getFirstMatchedRule(
    {href: details.url}, setting.cache.userAgent);

  if (!rule || rule.userAgent == "chrome") {
    return {};
  }
  for (var i = 0; i < details.requestHeaders.length; ++i) {
    if (details.requestHeaders[i].name == 'User-Agent') {
      details.requestHeaders[i].value = agents[rule.userAgent];
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
