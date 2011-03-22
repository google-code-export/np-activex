// Copyright (c) 2010 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

function executeScriptInClient(command) {
  var codediv = document.createElement("button");
  codediv.setAttribute("style", "display:hidden");
  codediv.setAttribute("onclick", command);
  document.body.appendChild(codediv);
  codediv.click();
  log("executed command in client: " + command);
  document.body.removeChild(codediv);
}

function checkForm(new_obj) {
  var parent = new_obj.parentNode;
  while (parent && parent.nodeType == 1) {
    if (parent.nodeName.toLowerCase() == "form") {
      command = "document.all." + parent.name + "." + new_obj.id + " = document.all." + new_obj.id;
      executeScriptInClient(command);
    }
    parent = parent.parentNode;
  }
}

getManager = function() {
  var manager = document.createElement("embed");
  manager.type = "application/activex-manager";
  manager.style.width = "0px";
  manager.style.height = "0px";
  manager.id = "__activex_manager_IIID_"

    return function() {

      if (document.body == null)
        document.body = document.createElement("body");
      if (document.body.contains(manager))
        return manager;
      log("Manager object inserted");
      document.body.insertBefore(manager, document.body.firstChild);
      return manager;
    }
}();

function createReplaceObj(obj) {
  // Traverse through attributes

  var new_obj = document.createElement("embed");

  new_obj.setAttribute("type", "application/x-itst-activex");
  for (var attri = 0; attri < obj.attributes.length; ++attri) {
    var attr = obj.attributes[attri];
    if (attr.name == "classid") {
      var clsid = attr.value;
      var compos = clsid.indexOf(":");
      if (clsid.substring(0, compos).toLowerCase() != "clsid") break;
      clsid = clsid.substring(compos + 1);
      new_obj.setAttribute("clsid", "{" + clsid + "}");

    } else if (attr.name.substr(0, 2) == "on") {
      new_obj.setAttribute("" + attr.name, attr.value);
    } else if (attr.name == "codebase") {
      var codebase = attr.value;
      var reg = new RegExp("^[a-z]+://.*");
      if (reg.exec(attr.value) == null) codebase = location.origin + codebase;
      new_obj.setAttribute("codeBaseUrl", codebase);
    } else {
      new_obj.setAttribute(attr.name, attr.value);
    }

  } // for attrubites
  //  new_obj.innerHTML = obj.innerHTML;
  new_obj.original_obj = obj;
  if (!new_obj.hasAttribute("clsid")) {
    return null;
  }
  return new_obj;
}

var pageEnabled = undefined;
var hostElement = null;
function enableobj(obj) {
  // We can't use classid directly because it confuses the browser.
  obj.setAttribute("clsid", getClsid(obj));
  obj.removeAttribute("classid");
  // Append a "type" attribute seems not work.
  // Use <object> so obj doesn't need reconstruction.
  obj.outerHTML = '<object type="application/x-itst-activex" '
    + obj.outerHTML.substring(8);
  log("Enable object, id: " + obj.id + " clsid: " + getClsid(obj));
}

function getClsid(obj) {
  if (obj.hasAttribute("clsid"))
    return obj.getAttribute("clsid");
  var clsid = obj.getAttribute("classid");
  var compos = clsid.indexOf(":");
  if (clsid.substring(0, compos).toLowerCase() != "clsid")
    return;
  clsid = clsid.substring(compos + 1);
  return "{" + clsid + "}";
}

function process(obj) {
  if (obj.type != "" || !obj.hasAttribute("classid"))
    return;
  if (config == null) {
    // Delay the process of this object.
    // Hope config will be load soon.
    pendingObjects.push(obj);
    return;
  }
  if (pageEnabled === undefined)
    pageEnabled = config.isUrlMatched(location.href);
  var clsid = getClsid(obj);

  if (pageEnabled || config.isClsidTrusted(clsid)) {
    var new_obj = obj; 
    enableobj(obj);
    if (obj.id != "") {
      checkForm(new_obj);
    }
  }
}

function replaceDocument() {
  log("detect all objects on page");
  var s = document.getElementsByTagName("object");
  for (var i = 0; i < s.length; ++i) {
    process(s[i]);
  }
};

function onBeforeLoading(event) {
  var obj = event.target;
  if (obj.nodeName == "OBJECT") {
    if (obj.activex_process === undefined) {
      obj.activex_process = true;
      process(obj);
    }
  }
}
