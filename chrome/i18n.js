// Copyright (c) 2010 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

function loadI18n() {
  document.title = chrome.i18n.getMessage("option_title")
    var spans = document.getElementsByTagName("span");
  for (var i = 0; i < spans.length; ++i) {
    var obj = spans[i];
    if (!obj.hasAttribute("i18n"))
      continue;
    obj.innerText = chrome.i18n.getMessage(obj.getAttribute("i18n"));
  }
}
window.addEventListener("load", loadI18n, false);
