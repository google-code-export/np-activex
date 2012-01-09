var setting = chrome.extension.getBackgroundPage().setting;

function validateRule(old, rule) {
  return setting.validateRule(rule);
}

function removeElement(e) {
  var id = e.data.list.getBindedId(e.data.line);
  if (id >= 0) {
    e.data.list.remove(id);
  }
}

var settingProps = [ {
  header: "",
  property: "dodelete",
  type: "button",
  events: {
    command: removeElement
  }
}, {
  header: "Name",
  property: "title",
  type: "input"
}, {
  header: "Mode",
  property: "type",
  type: "select",
  extra: {
    option: "static",
    options: [
      {value: "wild", text: "WildChar"},
      {value: "regex", text: "RegEx"},
      {value: "clsid", text: "CLSID"}
    ]
  }
}, {
  header: "Pattern",
  property: "value",
  type: "input"
}, {
  header: "Enabled",
  property: "enabled",
  type: "checkbox"
}, {
  header: "UserAgent",
  property: "userAgent",
  type: "select",
  extra: {
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
  }
}, {
  header: "Script settings",
  property: "scriptSetting",
  type: "input"
}, {
  header: "Helper Script",
  property: "script",
  type: "input"
}
];

var table;

var misc = {
  validate: validateRule,
};

function save() {
  console.log('update & save');
  setting.update();
}

$(document).ready(function() {
  table = new List(settingProps, $('#tbSetting'), setting.rules, misc);
  table.init();
  $(table).bind('updated', save);
});

