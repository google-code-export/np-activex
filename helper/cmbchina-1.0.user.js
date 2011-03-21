// ==UserScript==
// @namespace qiuc12-chrome-adapt
// @name 95599 CMBChina Bank Assist
// @description 95599 CMBChina Assist. Make it able to input password on login.
// @match https://netpay.cmbchina.com/*
// ==/UserScript==

function executeScriptInClient(command) {
    var codediv = document.createElement("button");
    codediv.setAttribute("style", "display:hidden");
    codediv.setAttribute("onclick", command);
    document.body.appendChild(codediv);
    codediv.click();
    document.body.removeChild(codediv);
}

executeScriptInClient("ShowPayPage=function(orig){return function(par){orig(par);InitControls();console.log('a')}}(ShowPayPage);CallbackCheckClient=function(){}");
