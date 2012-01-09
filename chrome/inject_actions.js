// Copyright (c) 2010 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

function executeScriptInClient(command) {
  var codediv = document.createElement("button");
  codediv.setAttribute("style", "display:hidden");
  codediv.setAttribute("onclick", command);
  document.body.appendChild(codediv);
  codediv.click();
  document.body.removeChild(codediv);
}

// Allow form.id access
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

var hostElement = null;
function enableobj(obj) {
  var command = "";
  // We can't use classid directly because it confuses the browser.
  obj.setAttribute("clsid", getClsid(obj));
  obj.removeAttribute("classid");
  // Append a "type" attribute seems not work.
  // Use <object> so obj doesn't need reconstruction.
  obj.outerHTML = '<object type="application/x-itst-activex" '
    + obj.outerHTML.substring(8);
    
  // Allow access by document.id
  if (obj.id) {
    command = "delete document." + obj.id + "\n";
    command += "document." + obj.id + '=' + obj.id;
    executeScriptInClient(command);
  }

  log("Enable object, id: " + obj.id + " clsid: " + getClsid(obj));
  // executeScriptInClient(command);
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
  if (obj.activex_process)
    return;
  if (obj.type != "" || !obj.hasAttribute("classid"))
    return;

  obj.activex_process = true;

  if (config == null) {
    // Delay the process of this object.
    // Hope config will be load soon.
    log('Pending object ', obj.id);
    pendingObjects.push(obj);
    return;
  }
  var clsid = getClsid(obj);

  if (config.shouldEnable({href: location.href, clsid:clsid})) {
    var new_obj = obj; 
    enableobj(obj);
    if (obj.id != "") {
      checkForm(new_obj);
    }
  }
}

function replaceDocument() {
  var s = document.getElementsByTagName("object");
  log("found " + s.length + " object(s) on page " + location.href);
  for (var i = 0; i < s.length; ++i) {
    process(s[i]);
  }
};

function onBeforeLoading(event) {
  var obj = event.target;
  if (obj.nodeName == "OBJECT") {
    log("BeforeLoading " + obj.id);
    process(obj);
  }
}

function injectIEScripts() {
  if (!config.pageRule) {
    return;
  }
  var option = config.pageRule.scriptSetting.toLowerCase();
  if (option.split(' ').indexOf("!all") == -1 
  && config.pageRule.userAgent != "chrome") {
    log("IE Script: " + option + " UserAgent: " + config.pageRule.userAgent);
    var scriptFile = chrome.extension.getURL('ie_script_declaration.js');
    var scriptobj = document.createElement("script");
    var req = new XMLHttpRequest();
    req.open("GET", scriptFile, false);
    req.send();

    scriptobj.innerHTML = req.responseText;
    scriptobj.innerHTML +=
    "('" + option + "', '" + config.pageRule.userAgent + "')";

    document.documentElement.insertBefore(
      scriptobj, document.documentElement.firstChild);
    scriptobj.parentElement.removeChild(scriptobj);
  }
}

