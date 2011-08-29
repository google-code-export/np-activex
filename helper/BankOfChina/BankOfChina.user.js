// ==UserScript==
// @namespace npactivex
// @name Bank of China ActiveX helper
// @description Work with npActiveX to enable Bank of China ActiveX controls.
// @match https://ebs.boc.cn/*
// @run-at document-start
// ==/UserScript==

var scripts = [
  "md5.js",
  "resources_zh_CN_CurCode.js",
  "common.js",
  "PageLimit.js",
  "FormCheck.js",
  "createElement.js",
  "calendar.js",
  "FormatMoneyShow.js",
  "FormatMoneyBase.js"
];

// All the files are decoded frem BOC site directly.
// Excepts: 
// Correct some scripts in calendar.js(defs of document.onXXX).
// We cannot gurantee the order of the elements loaded, resource and CurCode
// are combined in a single file.
var site = "https://np-activex.googlecode.com/hg/helper/BankOfChina/";

for (var i = 0; i < scripts.length; ++i) {
  var obj = document.createElement('script');
  obj.src = site + scripts[i];
  document.documentElement.appendChild(obj);
}
