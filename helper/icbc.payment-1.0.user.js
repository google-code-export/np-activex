// ==UserScript==
// @namespace npactivex.code.google.com
// @name ICBC工行 Chrome U盾支付助手
// @description ICBC工行U盾ActiveX控件激活补丁
// @match https://b2c.icbc.com.cn/servlet/ICBCINBSReqServlet
// ==/UserScript==

console.log('ICBC ActiveX Helper running');
var objs = document.querySelectorAll('object');
for (var i = 0; i < objs.length; ++i) {
  if (getComputedStyle(objs[i]).display == 'none')
    objs[i].style.display = 'block';
}
