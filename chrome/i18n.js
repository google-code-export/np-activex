// Copyright (c) 2010 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

function loadI18n() {
  document.title = chrome.i18n.getMessage("option_title")
  var spans = document.querySelectorAll('[i18n]');
  for (var i = 0; i < spans.length; ++i) {
    var obj = spans[i];
    v = chrome.i18n.getMessage(obj.getAttribute("i18n"));
    if (v == "")
      v = obj.getAttribute('i18n');
    if (obj.tagName == 'INPUT') {
      obj.value = v;
    } else {
      obj.innerText = v;
    }
  }
}
window.addEventListener("load", loadI18n, false);
