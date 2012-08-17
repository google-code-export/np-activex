// Copyright (c) 2012 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

var FLASH_CLSID = '{d27cdb6e-ae6d-11cf-96b8-444553540000}';
var typeId = "application/x-itst-activex";
var updating = false;

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
      var desp = obj.id + ' at level ' + level;
      if (scriptConfig.none2block) {
        parent.style.display = 'block';
        parent.style.height = '0px';
        parent.style.width = '0px';
        log('Remove display:none for ' + desp);
      } else {
        log('Warning: Detected display:none for ' + desp);
      }
    }
    parent = parent.parentNode;
    ++level;
  }
}

function getLinkDest(url) {
  if (typeof url != 'string') {
    return url;
  }
  url = url.trim();
  if (/^https?:\/\/.*/.exec(url)) {
    return url;
  }
  if (url[0] == '/') {
    if (url[1] == '/') {
      return location.protocol + url;
    } else {
      return location.origin + url;
    }
  }
  return location.href.replace(/\/[^\/]*$/, '/' + url);
}

var hostElement = null;
function enableobj(obj) {
  updating = true;
  // We can't use classid directly because it confuses the browser.
  obj.setAttribute("clsid", getClsid(obj));
  obj.removeAttribute("classid");
  checkParents(obj);

  var newObj = obj.cloneNode(true);
  newObj.type = typeId;
  // Remove all script nodes. They're executed.
  var scripts = newObj.getElementsByTagName('script');
  for (var i = 0; i < scripts.length; ++i) {
    scripts[i].parentNode.removeChild(scripts[i]);
  }
  // Set codebase to full path.
  var codebase = newObj.getAttribute('codebase');
  if (codebase && codebase != '') {
    newObj.setAttribute('codebase', getLinkDest(codebase));
  }

  newObj.activex_process = true;
  obj.parentNode.insertBefore(newObj, obj);
  obj.parentNode.removeChild(obj);
  obj = newObj;

  if (obj.id) {
    var command = '';
    if (obj.form && scriptConfig.formid) {
      var form = obj.form.name;
      command += "document.all." + form + "." + obj.id;
      command + " = document.all." + obj.id + ';\n';
      log('Set form[obj.id]: form: ' + form + ', object: ' + obj.id)
    }

    // Allow access by document.obj.id
    if (obj.id && scriptConfig.documentid) {
      command += "delete document." + obj.id + ";\n";
      command += "document." + obj.id + '=' + obj.id + ';\n';
    }
    if (command) {
      executeScript(command);
    }
  }

  log("Enabled object, id: " + obj.id + " clsid: " + getClsid(obj));
  updating = false;
  return obj;
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

  if (onBeforeLoading.caller == enableobj ||
      onBeforeLoading.caller == process ||
      onBeforeLoading.caller == checkParents) {
    log("Nested onBeforeLoading " + obj.id);
    return;
  }

  if (obj.type == typeId) {
    if (!config || !config.pageRule) {
      // hack??? Deactive this object.
      log("Deactive unexpected object " + obj.outerHTML);
      return true;
    }
    log("Found objects created by client scripts");
    notify({
      href: location.href,
      clsid: clsid, 
      actived: true,
      rule: config.pageRule.identifier
    });
    obj.activex_process = true;
    return;
  }

  if ((obj.type != "" && obj.type != "application/x-oleobject") || !obj.hasAttribute("classid"))
    return;
  if (getClsid(obj).toLowerCase() == FLASH_CLSID) {
    return;
  }

  if (config == null) {
    // Delay the process of this object.
    // Hope config will be load soon.
    log('Pending object ', obj.id);
    pendingObjects.push(obj);
    return;
  }

  obj.activex_process = true;

  connect();
  var clsid = getClsid(obj);

  var rule = config.shouldEnable({href: location.href, clsid:clsid});
  if (rule) {
    obj = enableobj(obj);
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

function replaceSubElements(obj) {
  var s = obj.querySelectorAll('object[classid]');
  if (obj.tagName == 'OBJECT' && obj.hasAttribute('classid')) {
    s.push(obj);
  }
  for (var i = 0; i < s.length; ++i) {
    process(s[i]);
  }
};

function onBeforeLoading(event) {
  var obj = event.target;
  if (obj.nodeName == "OBJECT") {
    log("BeforeLoading " + obj.id);
    if (process(obj)) {
      event.preventDefault();
    }
  }
}

function onError(event) {
  var message = 'Error: ';
  message += event.message;
  message += ' at ';
  message += event.filename;
  message += ':';
  message += event.lineno;
  log(message);
  return false;
}

function setUserAgent() {
  if (!config.pageRule) {
    return;
  }

  var agent = getUserAgent(config.pageRule.userAgent);
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

function onSubtreeModified(e) {
  if (updating) {
    return;
  }
  if (e.nodeType == e.TEXT_NODE) {
    return;
  }
  replaceSubElements(e.srcElement);
}
