// Copyright (c) 2010 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

var $$ = chrome.i18n.getMessage;
function loadI18n() {
  var spans = document.querySelectorAll('[i18n]');
  for (var i = 0; i < spans.length; ++i) {
    var obj = spans[i];
    v = $$(obj.getAttribute("i18n"));
    if (v == "")
      v = obj.getAttribute('i18n');
    if (obj.tagName == 'INPUT') {
      obj.value = v;
    } else {
      obj.innerText = v;
    }
  }
  document.removeEventListener("DOMContentLoaded", loadI18n, false);
}
document.addEventListener("DOMContentLoaded", loadI18n, false);
