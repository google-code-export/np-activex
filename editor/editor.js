// Copyright (c) 2012 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

var rules = [];
var scripts = [];

var dirty = false;

function setScriptAutoComplete(e) {
  var last = /[^\s]*$/;

  var obj = $('input', e.target);
  $(obj).bind("keydown", function(event) {
    if (event.keyCode === $.ui.keyCode.TAB &&
    $(this).data("autocomplete").menu.active) {
      event.preventDefault();
    }
  })
  .autocomplete({
    minLength: 0,
    source: function(request, response) {
      // delegate back to autocomplete, but extract the last term
      response($.ui.autocomplete.filter(
        scriptItems, last.exec(request.term)[0]));
    },
    focus: function() {
      // prevent value inserted on focus
      return false;
    },
    select: function(event, ui) {
      this.value = this.value.replace(last, ui.item.value);
      return false;
    }
  });
}

var ruleProps = [ {
  header: "Identifier",
  property: "identifier",
  type: "input"
}, {
  header: "Name",
  property: "title",
  type: "input"
}, {
  header: "Mode",
  property: "type",
  type: "select",
  option: "static",
  options: [
    {value: "wild", text: "WildChar"},
    {value: "regex", text: "RegEx"},
    {value: "clsid", text: "CLSID"}
  ]
}, {
  header: "Pattern",
  property: "value",
  type: "input"
}, {
  header: "Keyword",
  property: "keyword",
  type: "input"
}, {
  header: "testURL",
  property: "testUrl",
  type: "input"
}, {
  header: "UserAgent",
  property: "userAgent",
  type: "select",
  option: "static",
  options: [
    {value: "", text: "Chrome"},
    {value: "ie9", text: "MSIE9"},
    {value: "ie8", text: "MSIE8"},
    {value: "ie7", text: "MSIE7"},
    {value: "ff7win", text: "Firefox 7 Windows"},
    {value: "ff7mac", text: "Firefox 7 Mac"},
    {value: "ip5", text: "iPhone"},
    {value: "ipad5", text: "iPad"}
  ]
}, {
  header: "Helper Script",
  property: "script",
  type: "input",
  events: {
    create: setScriptAutoComplete
  }
}];

var currentScript = -1;
function showScript(id) {
  var url = '../' + scripts[id].url;
  currentScript = id;
  $(scriptEditor).text('Loading.....');
  $(scriptEditor).load(url, undefined, function(value) {
    origScript = value;
  });
  $('#scriptDialog').dialog('open');
}

function saveToFile(file, value) {
  $.ajax('upload.php', {
    type: "POST",
    data: {
      file: file,
      data: value
    }
  });
}

var origScript;
function saveScript(id) {
  var value = $('#scriptEditor').val();
  if (value == origScript) {
    return;
  }
  var file = '../' + scripts[id].url;
  ++scripts[id].version;
  scriptList.updateLine(scriptList.getLine(id));
  saveToFile(file, value);
  dirty = true;
}

var scriptProps = [{
  property: "identifier",
  header: "Identifier",
  type: "input"
}, {
  property: "url",
  header: "URL",
  type: "input"
}, {
  property: "version",
  header: "Version",
  type: "input"
}, {
  property: "context",
  header: "Context",
  type: "select",
  option: "static",
  options: [
    {value: "page", text: "Page"},
    {value: "extension", text: "Extension"}
  ]
}, {
  property: "show",
  header: "Show",
  type: "button",
  events: {
    create: function(e) {
      $('button', this).text('Show');
    },
    command: function(e) {
      showScript(e.data.list.getLineId(e.data.line), true);
    }
  }
}];

// The JSON formatter is from http://joncom.be/code/javascript-json-formatter/
function FormatJSON(oData, sIndent) {
  function RealTypeOf(v) {
    if (typeof(v) == "object") {
      if (v === null) return "null";
      if (v.constructor == Array) return "array";
      if (v.constructor == Date) return "date";
      if (v.constructor == RegExp) return "regex";
      return "object";
    }
    return typeof(v);
  }
  if (arguments.length < 2) {
    var sIndent = "";
  }
  var sIndentStyle = "  ";
  var sDataType = RealTypeOf(oData);

  // open object
  if (sDataType == "array") {
    if (oData.length == 0) {
      return "[]";
    }
    var sHTML = "[";
  } else {
    var iCount = 0;
    $.each(oData, function() {
      iCount++;
      return;
    });
    if (iCount == 0) { // object is empty
      return "{}";
    }
    var sHTML = "{";
  }

  // loop through items
  var iCount = 0;
  $.each(oData, function(sKey, vValue) {
    if (iCount > 0) {
      sHTML += ",";
    }
    if (sDataType == "array") {
      sHTML += ("\n" + sIndent + sIndentStyle);
    } else {
      sHTML += ("\n" + sIndent + sIndentStyle + "\"" + sKey + "\"" + ": ");
    }

    // display relevant data type
    switch (RealTypeOf(vValue)) {
      case "array":
      case "object":
      sHTML += FormatJSON(vValue, (sIndent + sIndentStyle));
      break;
      case "boolean":
      case "number":
      sHTML += vValue.toString();
      break;
      case "null":
      sHTML += "null";
      break;
      case "string":
      sHTML += ("\"" + vValue + "\"");
      break;
      default:
      sHTML += JSON.stringify(vValue);
    }

    // loop
    iCount++;
  });

  // close object
  if (sDataType == "array") {
    sHTML += ("\n" + sIndent + "]");
  } else {
    sHTML += ("\n" + sIndent + "}");
  }

  // return
  return sHTML;
}

function loadRules(value) {
  rules = [];
  for (var i in value) {
    rules.push(value[i]);
  }
  ruleList.refresh();
  freezeIdentifier(ruleList);
}

function loadScripts(value) {
  scripts = [];
  for (var i in value) {
    scripts.push(value[i]);
  }
  scriptList.refresh();
  freezeIdentifier(scriptList);
  updateScriptItems();
}

function serialize(list) {
  var obj = {};
  for (var i = 0; i < list.length; ++i) {
    obj[list[i].identifier] = list[i];
  }
  return FormatJSON(obj);
}

function save() {
  saveToFile('../setting.json', serialize(rules));
  saveToFile('../scripts.json', serialize(scripts));
  dirty= false;
  freezeIdentifier(ruleList);
  freezeIdentifier(scriptList);
}

function reload() {
  $.ajax('../setting.json', {
    success: loadRules
  });
  $.ajax('../scripts.json', {
    success: loadScripts
  });
  dirty = false;
}

function freezeIdentifier(list) {
  $('.itemline:not(.newline) div[property=identifier]', list.contents)
  .addClass('readonly');
}

var scriptList, ruleList;

var scriptItems = [];

function updateScriptItems() {
  scriptItems = [];
  for (var i = 0; i < scripts.length; ++i) {
    scriptItems.push(scripts[i].identifier);
  }
}

$(document).ready(function() {
  scriptList = new List({
    props: scriptProps,
    main: $('#scriptTable'),
    getItems: function() {return scripts;}
  });
  $(scriptList).bind('updated', function() {
    dirty = true;
    updateScriptItems();
  });
  scriptList.init();

  ruleList = new List({
    props: ruleProps,
    main: $('#ruleTable'),
    getItems: function() {return rules;}
  });
  ruleList.init();
  $(ruleList).bind('updated', function() {
    dirty = true;
  });

  reload();

  window.onbeforeunload=function() {
    if (dirty) {
      return 'Page not saved. Continue?';
    }
  }

  $('#addRule').click(function() {
    ruleList.startEdit(ruleList.newLine);
  }).button();
  $('#addScript').click(function() {
    scriptList.startEdit(scriptList.newLine);
  }).button();
  $('#deleteRule').click(function() {
    ruleList.remove(ruleList.selectedLine);
  }).button();
  $('#deleteScript').click(function() {
    scriptList.remove(scriptList.selectedLine);
  }).button();

  $('.doSave').each(function() {
    $(this).click(save).button();
  });

  $('#tabs').tabs();
  $('#scriptDialog').dialog({
    modal: true,
    autoOpen: false,
    height: 500,
    width: 700,
    buttons: {
      "Save": function() {
        saveScript(currentScript);
        $(this).dialog('close');
      },
      "Cancel": function() {
        $(this).dialog('close');
      }
    }
  });
  $.ajaxSetup({
    cache: false
  });
});

