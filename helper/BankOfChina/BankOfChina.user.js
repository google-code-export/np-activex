// ==UserScript==
// @namespace npactivex
// @name Bank of China ActiveX helper
// @description Work with npActiveX to enable Bank of China ActiveX controls.
// @match https://ebs.boc.cn/*
// @run-at document_start
// ==/UserScript==

var scripts = [
  "md5.js",
  "resources_zh_CN.js",
  "common.js",
  "PageLimit.js",
  "FormCheck.js",
  "createElement.js",
  "calendar.js",
  "CurCode.js",
  "FormatMoneyShow.js",
  "FormatMoneyBase.js"
];

// All the files are decoded frem BOC site directly. No modifications!!
var site = "https://np-activex.googlecode.com/hg/helper/BankOfChina/";

for (var i = 0; i < scripts.length; ++i) {
  var obj = document.createElement('script');
  obj.src = site + scripts[i];
  document.documentElement.appendChild(obj);
}
