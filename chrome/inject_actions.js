// Copyright (c) 2010 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.
var mime_type = "application/x-itst-activex";
var ACTIVEX_ID_SUFFIX = "__activex__real__";
// Because of Chrome's bug, both setter and getter can't set for HTMLObject.
// But it works for div. Wrap the object as div.
function executeScriptInClient(command) {
  var manager = getManager();
  if (manager.object) {
    manager.executeScript(command);
  }
  else {
    var codediv = document.createElement("button");
    codediv.setAttribute("style", "display:hidden");
    codediv.setAttribute("onclick", command);
    document.body.appendChild(codediv);
    codediv.click();
    log("executed command in client: " + command);
    document.body.removeChild(codediv);
  }
}

function checkForm(p, id) {
  if (!id)
    return;
  eval(id).object;
  var parent = p;
  while (parent != null) {
    if (parent.nodeName.toLowerCase() == "form") {
      command = parent.name
        + "." + id + " = " + id;
      console.log(command);
      executeScriptInClient(command);
    }
    parent = parent.parentElement;
  }
}

getManager = function() {
  var manager = document.createElement("embed");
  manager.type = "application/activex-manager";
  manager.style.width = "0px";
  manager.style.height = "0px";
  manager.id = "__activex_manager_IIID_";
  return function() {
    if (document.body == null)
      document.body = document.createElement("body");
    if (document.body.contains(manager))
      return manager;
    document.body.insertBefore(manager, document.body.firstChild);
    log("Manager object inserted");
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

function isObjectActived(obj) {
  if (typeof obj.object == 'object')
    return true;
  var p = obj;
  while (p != null) {
    if (getComputedStyle(p)['display'].toLowerCase() == 'none')
      return false;
    p = p.parentElement;
  }
  return true;
}

var replaceobj_enable = true;
function replaceobj(obj, p) {
  if (obj.id == "") {
    // The script object won't be used.
    return obj;
  }

  if (isObjectActived(obj)) {
    // This approach is applied to hidden objects only in case of
    // unexpted problems.
    return obj;
  }

  console.log('Replace object ' + obj.id);
  // Make obj parmanent valid, and obj2 is the window reference.
  var obj2 = obj.cloneNode();

  var newid = obj.id + ACTIVEX_ID_SUFFIX;
  obj.id = newid;

  obj2.setAttribute('style', "width:0px; height:0px; display:block");
  obj2.removeAttribute('height');
  obj2.removeAttribute('width');
  obj2.removeAttribute('class');
  obj2.setAttribute('noWindow', 'true');

  obj.setAttribute('origid', obj2.id);

  var placeholder = document.createElement('div');
  placeholder.style.display="none";

  document.body.appendChild(obj2);
  return obj2;
  /*
  p.insertBefore(placeholder, obj);
  p.removeChild(obj);
  obj.type = mime_type;
  document.body.insertBefore(obj, document.body.firstChild);

  console.log(obj.object);

  p.insertBefore(obj2, placeholder);
  p.removeChild(placeholder);
  obj2.type = mime_type;

  return obj2;
  */
}

function enableobj(obj) {
  // Create a manager object, so the object count is always positive.
  // It can avoid the deletion of the scriptable object.
  getManager();

  var command = "";
  if (obj.id) {
    command = "document.all." + obj.id + '.classid = "'
      + obj.getAttribute("classid") + '"';
    console.log(command);
  }
  // We can't use classid directly because it confuses the browser.
  obj.setAttribute("clsid", getClsid(obj));
  obj.removeAttribute("classid");
  checkForm(obj, obj.id);
  // We have to insert it in the front.
  obj.outerHTML = '<object type="' + mime_type + '"' + obj.outerHTML.substr(7);
  if (replaceobj_enable) {
    var id = obj.id;
    var p = obj.parentElement;
    var obj2 = replaceobj(obj, p);
  }
  else {
    obj.type = mime_type;
  }
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

function reenable(obj) {
  if (obj.type != "application/x-itst-activex")
    return;
  if (obj.object)
    return;
  var p = obj;
  while (p != null) {
    p.disp_orig = p.style.display;
    p.style.display = "block";
    p = p.parentElement;
  }
  // Make sure obj is loaded.
  obj.xxxxxtestxxxx__;
  p = obj;
  while (p != null) {
    p.style.display = p.disp_orig;
    delete p.disp_orig;
    p = p.parentElement;
  }
}

function process(obj) {
  if (obj.type != "" || !obj.hasAttribute("classid"))
    return;
  if (obj.activex_processed == 2)
    return;
  if (config == null) {
    if (obj.activex_processed != 1 ) {
      obj.activex_processed = 1;
      console.log('Pending object' + obj.id);
      // Delay the process of this object.
      // Hope config will be load soon.
      pendingObjects.push(obj);
      return;
    } else {
      return;
    }
  }
  obj.activex_processed = 2;
  if (pageEnabled === undefined)
    pageEnabled = config.isUrlMatched(location.href);
  var clsid = getClsid(obj);

  if (pageEnabled || config.isClsidTrusted(clsid)) {
    var new_obj = obj; 
    var p = obj.parentElement;
    var origid = obj.id;
    enableobj(obj);
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
    process(obj);
  }
}
document.addEventListener('DOMContentLoaded', replaceDocument, false);
