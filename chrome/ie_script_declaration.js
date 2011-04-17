// Copyright (c) 2010 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

function declareActiveXObject() {
  var hiddenDivId = "__hiddendiv_activex";
  window.__proto__.ActiveXObject = function(progid) {
    progid = progid.trim();
    if (progid == 'Msxml2.XMLHTTP' || progid == 'Microsoft.XMLHTTP')
      return new XMLHttpRequest();
    var hiddenDiv = document.getElementById(hiddenDivId);
    if (!hiddenDiv) {
      if (!document.body) document.body=document.createElement("body");
      hiddenDiv = document.createElement("div");
      hiddenDiv.id = hiddenDivId;
      hiddenDiv.setAttribute("style", "display:hidden; width:0px; height:0px");
      document.body.insertBefore(hiddenDiv, document.body.firstChild)
    }
    var obj = document.createElement("object");
    obj.setAttribute("type", "application/x-itst-activex");
    obj.setAttribute("progid", progid);
    obj.setAttribute("style", "display:hidden; width:0px; height:0px");
    hiddenDiv.appendChild(obj);
    return obj.object
  }
  //console.log("ActiveXObject declared");
}
function declareEventAsIE(node) {
  if (!node.attachEvent) {
    node.attachEvent = function(event, operation) {
      if (event.substr(0, 2) == "on") this.addEventListener(event.substr(2), operation, false)
    }
  }
  if (!node.detachEvent) {
    node.detachEvent = function(event, operation) {
      if (event.substr(0, 2) == "on") this.removeEventListener(event.substr(2), operation, false)
    }
  }
 // console.log("at/detach events declared");
}
function declareFakePopup(node) {
  if (!node.createPopup) {
    node.createPopup = function() {return null;};
  }

  //console.log("createPopup Faked");
}
function initIEScription() {
  declareActiveXObject();
  declareEventAsIE(window.Node.prototype);
  declareEventAsIE(window.__proto__);
  declareFakePopup(window.__proto__);
}
initIEScription();
