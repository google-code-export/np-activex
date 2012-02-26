// Copyright (c) 2012 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

var FLASH_CLSID = '{d27cdb6e-ae6d-11cf-96b8-444553540000}';
var typeId = "application/x-itst-activex";

function executeScript(script) {
  var scriptobj = document.createElement("script");
  scriptobj.innerHTML = script;

  var element = document.head || document.body ||
  document.documentElement || document;
  element.insertBefore(scriptobj, element.firstChild);
  element.removeChild(scriptobj);
}

function checkParents(obj) {
  var parent = obj;
  var level = 0;
  while (parent && parent.nodeType == 1) {
    if (getComputedStyle(parent).display == 'none') {
      var desp = obj.id + ' at level' + level;
      if (scriptConfig.none2block) {
        parent.style.display = 'block';
        parent.style.height = '0px';
        parent.style.width = '0px';
        log('Remove display:none for ' + desp);
      } else {
        log('Warning: Detected display:none for ' + desp);
      }
    }
    if (scriptConfig.formid && obj.id != "" &&
        parent.nodeName.toLowerCase() == "form") {
      var command = "document.all." + parent.name + "." + obj.id + " = document.all." + obj.id;
      log('Set form[id]: form: ' + parent.name + ', object: ' + obj.id)
      executeScript(command);
    }
    parent = parent.parentNode;
    ++level;
  }
}

var hostElement = null;
function enableobj(obj) {
  var oldDisplay = obj.style.display;
  obj.style.display = 'none';
  // We can't use classid directly because it confuses the browser.
  obj.setAttribute("clsid", getClsid(obj));
  obj.removeAttribute("classid");
  obj.type = typeId;
  obj.style.display = oldDisplay;

  // Allow access by document.id
  if (obj.id && scriptConfig.documentid) {
    var command = "delete document." + obj.id + "\n";
    command += "document." + obj.id + '=' + obj.id;
    executeScript(command);
  }

  log("Enabled object, id: " + obj.id + " clsid: " + getClsid(obj));
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
  connect();
  data.command = 'DetectControl';
  port.postMessage(data);
}

function process(obj) {
  if (obj.activex_process)
    return;

  if (obj.type == typeId) {
    notify({
      href: location.href,
      clsid: clsid, 
      actived: true,
      rule: 'Direct'
    });
    obj.activex_process = true;
    return;
  }

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
  connect();
  var clsid = getClsid(obj);

  var rule = config.shouldEnable({href: location.href, clsid:clsid});
  if (rule) {
    enableobj(obj);
    checkParents(obj);
    notify({
      href: location.href,
      clsid: clsid, 
      actived: true,
      rule: rule.identifier
    });
  } else {
    notify({href: location.href, clsid: clsid, actived: false});
  }
}

function replaceDocument() {
  var s = document.getElementsByTagName("object");
  log("found " + s.length + " object(s) on page");
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

