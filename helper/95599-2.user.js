// ==UserScript==
// @namespace http://code.google.com/p/np-activex
// @name 95599 Agricultural Bank of China Assist
// @description 95599 Agricultural Bank of China Assist. Make it able to input password on login.
// @match https://easyabc.95599.cn/*
// ==/UserScript==

var maps = document.getElementsByTagName("map");
for (var i = 0; i < maps.length; ++i) {
  if (maps[i].name == "")
    maps[i].name = maps[i].id;
}