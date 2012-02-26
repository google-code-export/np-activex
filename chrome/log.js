// Copyright (c) 2012 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

var tabId = parseInt(location.href.replace(/.*tabid=([0-9]*).*/, '$1'));
if (isNaN(tabId)) {
  alert('Invalid tab id');
}

var backgroundPage = chrome.extension.getBackgroundPage();
$(document).ready(function() {
  var s = backgroundPage.generateLogFile(tabId);
  $("#text").val(s);
});
