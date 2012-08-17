// Copyright (c) 2012 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

var config;

function loadConfig(_resp) {
  config = _resp;
  $(document).ready(init);
}

function openPopup() {
  var url = chrome.extension.getURL('popup.html?tabid=' + config.tabId);
  var windowConfig = 'height=380,width=560,toolbar=no,menubar=no,' +
      'scrollbars=no,resizable=no,location=no,status=no';
  window.open(url, 'popup', windowConfig);
  dismiss();
}

function blockSite() {
  chrome.extension.sendRequest(
      {command: 'BlockSite', site: config.sitePattern});
  dismiss();
}

function dismiss() {
  chrome.extension.sendRequest({command: 'DismissNotification'});
}

function init() {
  $('#enable').click(openPopup);
  $('#close').click(dismiss);
  $('#block').click(blockSite);
  $('#close').text(config.closeMsg);
  $('#enable').text(config.enableMsg);
  $('#info').text(config.message);
  $('#block').text(config.blockMsg);
}

chrome.extension.sendRequest({command: 'GetNotification'}, loadConfig);
