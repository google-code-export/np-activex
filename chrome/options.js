// Copyright (c) 2012 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

var background = chrome.extension.getBackgroundPage();
var setting = background.setting;
var updateSession = background.updateSession;

function toggleRule(e) {
  var line = e.data.line;
  var index = line.attr('row');
  var item = setting.order[index];
  if (item.position == 'default') {
    if (item.status == 'enabled') { 
      item.status = 'disabled';
      trackDisable(item.identifier);
    } else if (item.status == 'disabled') {
      item.status = 'enabled';
      trackEnable(item.identifier);
    }
  }
  line.blur();
  e.data.list.finishEdit(line);
  e.data.list.updateLine(line);
  save();
}

var settingProps = [ {
  header: "",
  property: "status",
  type: 'button',
  caption: "",
  events: {
    command: toggleRule,
    update: setStatus,
    createNew: setStatusNew
  }
}, {
  header: $$("title"),
  property: "title",
  type: "input"
}, {
  header: $$("mode"),
  property: "type",
  type: "select",
  option: "static",
  options: [
    {value: "wild", text: $$("WildChar")},
    {value: "regex", text: $$("RegEx")},
    {value: "clsid", text: $$("CLSID")}
  ]
}, {
  header: $$("pattern"),
  property: "value",
  type: "input"
}, {
  header: $$("user_agent"),
  property: "userAgent",
  type: "select",
  option: "static",
  options: [
    {value: "", text: "Chrome"},
    {value: "ie9", text: "MSIE9"},
    {value: "ie8", text: "MSIE8"},
    {value: "ie7", text: "MSIE7"},
    {value: "ff7win", text: "Firefox 7"},
    {value: "ip5", text: "iPhone"},
    {value: "ipad5", text: "iPad"}
  ]
}, {
  header: $$("helper_script"),
  property: "script",
  type: "input"
}
];

var table;

var dirty = false;
function save() {
  dirty = true;
}

function doSave() {
  if (dirty) {
    dirty = false;
    setting.update();
  }
}

function setReadonly(e) {
  var line = e.data.line;
  var id = line.attr('row');
  if (id < 0) {
    return;
  }
  var order = setting.order[id];
  var divs = $('.listvalue', line);
  if (order.position != 'custom') {
    divs.addClass('readonly');
  } else {
    divs.removeClass('readonly');
  }
}

$(window).blur(doSave);

function refresh() {
  table.refresh();
}
// Main setting
$(document).ready(function() {
  table = new List({
    props: settingProps, 
    main: $('#tbSetting'), 
    lineEvents: {
      update: setReadonly
    },
    getItems: function() {
      return setting.order;
    },
    getItemProp: function(i, prop) {
      if (prop in setting.order[i]) {
        return setting.order[i][prop];
      }
      return setting.getItem(setting.order[i])[prop];
    },
    setItemProp: function(i, prop, value) {
      if (prop in setting.order[i]) {
        setting.order[i][prop] = value;
      } else {
        setting.getItem(setting.order[i])[prop] = value;
      }
    },
    defaultValue: setting.createRule(),
    count: function() {
      return setting.order.length;
    },
    insert: function(id, newItem) {
      setting.addCustomRule(newItem);
      this.move(setting.order.length - 1, id);
    },
    remove: function(id) {
      if (setting.order[id].position != 'custom') {
        return true;
      }
      var identifier = setting.order[id].identifier;
      delete setting.rules[identifier];
      setting.order.splice(id, 1);
    },
    validate: function(id, rule) {
      return setting.validateRule(rule);
    }
  });

  $(table).bind('updated', save);
  $('#addRule').bind('click', function() {
    table.editNewLine();
  });
  $(table).bind('select', function() {
    var line = table.selectedLine;
    if (line < 0) {
      $('#moveUp').attr('disabled', 'disabled');
      $('#moveDown').attr('disabled', 'disabled');
      $('#deleteRule').attr('disabled', 'disabled');
    } else {
      if (line != 0) {
        $('#moveUp').removeAttr('disabled');
      } else {
        $('#moveUp').attr('disabled', 'disabled');
      }
      if (line != setting.order.length - 1) {
        $('#moveDown').removeAttr('disabled');
      } else {
        $('#moveDown').attr('disabled', 'disabled');
      }
      if (setting.order[line].position != 'custom') {
        $('#deleteRule').attr('disabled', 'disabled');
      } else {
        $('#deleteRule').removeAttr('disabled');
      }
    }
  });
  $('#moveUp').click(function() {
    var line = table.selectedLine;
    table.move(line, line - 1, true);
  });
  $('#moveDown').click(function() {
    var line = table.selectedLine;
    table.move(line, line + 1, true);
  });
  $('#deleteRule').click(function() {
    var line = table.selectedLine;
    table.remove(line);
  });
  table.init();
  updateSession.bind('update', refresh);
  updateSession.bind('updating', showUpdatingState);
  updateSession.bind('progress', showUpdatingState);
  updateSession.bind('complete', showUpdatingState);
});

window.onbeforeunload = function() {
  updateSession.unbind('update', refresh);
  updateSession.unbind('updating', showUpdatingState);
  updateSession.unbind('progress', showUpdatingState);
  updateSession.unbind('complete', showUpdatingState);
}

function setStatusNew(e) {
  with (e.data) {
    s = 'Custom';
    color = '#33f';
    $('button', line).text(s).css('background-color', color);
  }
}

function setStatus(e) {
  with (e.data) {
    var id = line.attr('row');
    var order = setting.order[id];
    var rule = setting.getItem(order);
    var s, color;
    if (order.status == 'enabled') {
      s = $$('Enabled');
      color = '#0A0';
    } else if (order.status == 'disabled') {
      s = $$('Disabled');
      color = 'indianred';
    } else {
      s = $$('Custom');
      color = '#33f';
    }
    $('button', line).text(s).css('background-color', color);
  }
}

function showTime(time) {
  var never = 'Never'
  if (time == 0) {
    return never;
  }
  var delta = Date.now() - time;
  if (delta < 0) {
    return never;
  }
  function getDelta(delta) {
    var sec = delta / 1000;
    if (sec < 60) {
      return [sec, 'second'];
    }
    var minute = sec / 60;
    if (minute < 60) {
      return [minute, 'minute'];
    }
    var hour = minute / 60;
    if (hour < 60) {
      return [hour, 'hour'];
    }
    var day = hour / 24;
    return [day, 'day'];
  }
  var disp = getDelta(delta);
  var v1 = Math.floor(disp[0]); 
  return  v1 + ' ' + disp[1] + (v1 != 1 ? 's' : '') + " ago";
}

function showUpdatingState(e) {
  if (updateSession.status == 'stop') {
    $('#lastUpdate').text(showTime(setting.misc.lastUpdate));
  } else {
    $('#lastUpdate').text($$("update_progress") + updateSession.finish + '/' + updateSession.total);
  }
}

$(document).ready(function() {
  showUpdatingState({});
  $('#doUpdate').click(function() {
    setting.updateConfig(updateSession);
    trackManualUpdate();
  });

  $('#log_enable').change(function(e) {
    setting.misc.logEnabled = e.target.checked;
    save();
  })[0].checked = setting.misc.logEnabled;

  $('#tracking').change(function(e) {
    setting.misc.tracking = e.target.checked;
    save();
  })[0].checked = setting.misc.tracking;
});

$(document).ready(function() {
  var help = 'http://code.google.com/p/np-activex/wiki/ExtensionHelp?wl=';
  help = help + $$('wikicode');
  $('.help').each(function() {
    this.href = help;
  });
});

$(window).load(function() {
  if (background.firstUpgrade) {
    background.firstUpgrade = false;
    alert($$("upgrade_show"));
  }
  $('#follow').html('<iframe width="136" height="24" frameborder="0" allowtransparency="true" marginwidth="0" marginheight="0" scrolling="no" border="0" src="http://widget.weibo.com/relationship/followbutton.php?language=zh_cn&width=136&height=24&uid=2356524070&style=2&btn=red&dpc=1"></iframe>');
});

