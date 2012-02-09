// Copyright (c) 2012 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

var FLASH_CLSID = '{d27cdb6e-ae6d-11cf-96b8-444553540000}';

function executeScript(script) {
  var scriptobj = document.createElement("script");
  scriptobj.innerHTML = script;

  var element = document.head || document.body ||
  document.documentElement || document;
  element.insertBefore(scriptobj, element.firstChild);
  element.removeChild(scriptobj);
}

// Allow form.id access
function checkForm(new_obj) {
  var parent = new_obj.parentNode;
  while (parent && parent.nodeType == 1) {
    if (parent.nodeName.toLowerCase() == "form") {
      command = "document.all." + parent.name + "." + new_obj.id + " = document.all." + new_obj.id;
      executeScript(command);
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
    executeScript(command);
  }

  log("Enable object, id: " + obj.id + " clsid: " + getClsid(obj));
  // executeScript(command);
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

function notify(data) {
  data.command = 'DetectControl';
  chrome.extension.sendRequest(data);
}

function process(obj) {
  if (obj.activex_process)
    return;
  if (obj.type != "" || !obj.hasAttribute("classid"))
    return;
  if (getClsid(obj).toLowerCase() == FLASH_CLSID) {
    return;
  }

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
    notify({href: location.href, clsid: clsid, actived: true});
  } else {
    notify({href: location.href, clsid: clsid, actived: false});
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

function setUserAgent() {
  if (!config.pageRule) {
    return;
  }

  var agent = agents[config.pageRule.userAgent];
  if (agent && agent != '') {
    log("Set userAgent: " + config.pageRule.userAgent);

    var js = "(function(agent) {";
    js += "delete navigator.userAgent;";
    js += "navigator.userAgent = agent;";

    js += "delete navigator.appVersion;";
    js += "navigator.appVersion = agent.substr(agent.indexOf('/') + 1);";

    js += "if (agent.indexOf('MSIE') >= 0) {";
    js += "delete navigator.appName;";
    js += 'navigator.appName = "Microsoft Internet Explorer";}})("';
    js += agent;
    js += '")';
    executeScript(js);
  }
}

