// ==UserScript==
// @namespace qiuc12-chrome-adapt
// @name 95599 Agricultural Bank of China Assist
// @description 95599 Agricultural Bank of China Assist. Make it able to input password on login.
// @match https://easyabc.95599.cn/commbank/netBank/zh_CN/CommLogin.aspx
// @match https://easyabc.95599.cn/SlfRegPer/netBank/zh_CN/entrance/logon.aspx
// ==/UserScript==

var maps = document.getElementsByTagName("map");
for (var i = 0; i < maps.length; ++i) {
  if (maps[i].name == "")
    maps[i].name = maps[i].id;
}