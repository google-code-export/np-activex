// Copyright (c) 2012 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

/*
 prop = {
   header,        // String
   property,      // String
   events,        // 
   type,          // checkbox, select, input.type, button
   extra          // depend on type
 }
 */

function List(config) {
  this.config = config;
  this.props = config.props;
  this.main = config.main;
  this.selectedLine = -2;
  this.lines = [];

  if (!config.getItems) {
    config.getItems = function() {
      return config.items;
    }
  }
  if (!config.getItemProp) {
    config.getItemProp = function(id, prop) {
      return config.getItem(id)[prop];
    }
  }
  if (!config.setItemProp) {
    config.setItemProp = function(id, prop, value) {
      config.getItem(id)[prop] = value;
    }
  }
  if (!config.getItem) {
    config.getItem = function(id) {
      return config.getItems()[id];
    }
  }
  if (!config.move) {
    config.move = function(a, b) {
      if (a != b && a >= 0 && b >= 0 && a < this.count() && b < this.count()) {
        var list = config.getItems();
        var tmp = list[a];
        // remove a
        list.splice(a, 1);
        // insert b
        list.splice(b, 0, tmp);
      }
    }
  };
  if (!config.insert) {
    config.insert = function(id, newItem) {
      config.getItems().splice(id, 0, newItem);
    }
  }
  if (!config.remove) {
    config.remove = function(a) {
      config.move(a, config.count() - 1);
      config.getItems().pop();
    }
  }
  if (!config.validate) {
    config.validate = function() {return true;};
  }
  if (!config.count) {
    config.count = function() {
      return config.getItems().length;
    }
  }
  if (!config.patch) {
    config.patch = function(id, newVal) {
      for (var name in newVal) {
        config.setItemProp(id, name, newVal[name]);
      }
    }
  }
  if (!config.defaultValue) {
    config.defaultValue = {};
  }

  config.main.addClass('list');
}

List.ids = {
  noline: -1,
};

List.types = {};

List.prototype = {
  init: function() {
    with (this) {
      if (this.inited) {
        return;
      }
      this.inited = true;
      this.headergroup = $('<div class="headers"></div>');
      for (var i = 0; i < props.length; ++i) {
        var header = $('<div class="header"></div>').
        attr('property', props[i].property).html(props[i].header);
        headergroup.append(header);
      }
      this.scrolls = $('<div>').addClass('listscroll');
      this.contents = $('<div class="listitems"></div>').appendTo(scrolls);
      scrolls.scroll(function() {
        headergroup.css('left', -(scrolls.scrollLeft()) + 'px');
      });
      contents.click(function(e) {
        if (e.target == contents[0]) {
          selectLine(List.ids.noline);
        }
      });
      $(main).append(headergroup).append(scrolls);
      var height = this.main.height() - this.headergroup.outerHeight();
      this.scrolls.height(height);
      load();
      selectLine(List.ids.noline);
    }
  },
  editNewLine: function() {
    this.startEdit(this.lines[this.lines.length - 1]);
  },
  updatePropDisplay : function(line, prop) {
    var name = prop.property;
    obj = $('[property=' + name + ']', line);
    var ctrl = obj[0].listdata;
    var id = Number(line.attr('row'));
    if (id == this.config.count()) {
      var value = this.config.defaultValue[name];
      if (value) {
        ctrl.value = value;
      }
      obj.trigger('createNew');
    } else {
      ctrl.value = this.config.getItemProp(id, name);
      obj.trigger('update');
    }
  },
  updateLine: function(line) {
    for (var i = 0; i < this.props.length; ++i) {
      this.updatePropDisplay(line, this.props[i]);
    }
    if (Number(line.attr('row')) < this.config.count()) {
      line.trigger('update');
    } else {
      line.addClass('newline');
    }
  },
  createLine: function() {
    with (this) {
      var line = $('<div></div>').addClass('itemline');
      var inner = $('<div>');
      line.append(inner);
      // create input boxes
      for (var i = 0; i < props.length; ++i) {
        var prop = props[i];
        var ctrl = $('<div></div>').attr('property', prop.property)
        .addClass('listvalue').attr('tabindex', -1);

        var valueobj = new List.types[prop.type](ctrl, prop);

        var data = {list: this, line: line, prop: prop};
        for (var e in prop.events)  {
          ctrl.bind(e, data, prop.events[e]);
        }
        ctrl.bind('change', function(e) {
          validate(line);
          return true;
        });
        ctrl.bind('keyup', function(e) {
          if (e.keyCode == 27) {
            cancelEdit(line);
          }
        });
        ctrl.trigger('create');
        inner.append(ctrl);
      }
      // Event listeners
      line.click(function(e) {
        startEdit(line);
      });
      line.focusin(function(e) {
        startEdit(line);
      });
      line.focusout(function(e) {
        finishEdit(line);
      });
      for (var e in this.config.lineEvents) {
        line.bind(e, {list: this, line: line}, this.config.lineEvents[e]);
      }
      var list = this;
      line.bind('updating', function() {
        $(list).trigger('updating');
      });
      line.bind('updated', function() {
        $(list).trigger('updated');
      });

      this.bindId(line, this.lines.length);
      this.lines.push(line);
      line.appendTo(this.contents);

      return line;
    }
  },
  refresh: function(lines) {
    var all = false;
    if (lines === undefined) {
      all = true;
      lines = [];
    }
    for (var i = this.lines.length; i <= this.config.count(); ++i) {
      var line = this.createLine();
      lines.push(i);
    }
    while (this.lines.length > this.config.count() + 1) {
      this.lines.pop().remove();
    }

    $('.newline', this.contents).removeClass('newline');
    this.lines[this.lines.length - 1].addClass('newline');

    if (all) {
      for (var i = 0; i < this.lines.length; ++i) {
        this.updateLine(this.lines[i]);
      }
    } else {
      for (var i = 0; i < lines.length; ++i) {
        this.updateLine(this.lines[lines[i]]);
      }
    }
  },
  load: function() {
    this.contents.empty();
    this.lines = [];
    this.refresh();
  },
  bindId: function(line, id) {
    line.attr('row', id);
  },
  getLineNewValue: function(line) {
    var ret = {};
    for (var i = 0; i < this.props.length; ++i) {
      this.getPropValue(line, ret, this.props[i]);
    }
    return ret;
  },
  getPropValue: function(line, item, prop) {
    var name = prop.property;
    obj = $('[property=' + name + ']', line);
    var ctrl = obj[0].listdata;
    var value = ctrl.value;
    if (value !== undefined) {
      item[name] = value;
    }
    return value;
  },
  startEdit: function(line) {
    if (line.hasClass('editing')) {
      return;
    }
    line.addClass('editing');
    this.showLine(line);
    this.selectLine(line);
    var list = this;
    setTimeout(function() {
      if (!line[0].contains(document.activeElement)) {
        $('.valinput', line).first().focus();
      }
      list.validate(line);
    }, 50);
  },
  finishEdit: function(line) {
    var list = this;
    function doFinishEdit() {
      with(list) {
        if (line[0].contains(document.activeElement)) {
          return;
        }
        var valid = isValid(line);
        if (valid) {
          var id = Number(line.attr('row'));
          var newval = getLineNewValue(line);

          if (line.hasClass('newline')) {
            $(list).trigger('updating');
            if(!config.insert(id, newval)) {
              line.removeClass('newline');
              list.selectLine(line);
              $(list).trigger('add', id);
              addNewLine();
            }
          } else {
            line.trigger('updating');
            config.patch(id, newval);
          }

          line.trigger('updated');
        }
        cancelEdit(line);
      }
    };
    setTimeout(doFinishEdit, 50);
  },

  cancelEdit: function(line) {
    line.removeClass('editing');
    line.removeClass('error');
    var id = Number(line.attr('row'));
    if (id == this.config.count() && this.selectedLine == id) {
      this.selectedLine = List.ids.noline;
    }
    this.updateLine(line);
  },

  addNewLine: function() {
    with(this) {
      var line = $('.newline', contents);
      if (!line.length) {
        line = createLine().addClass('newline');
      }
      return line;
    }
  },
  isValid: function(line) {
    var id = Number(line.attr('row'));
    var obj = this.getLineNewValue(line);
    return valid = this.config.validate(id, obj);
  },
  validate: function(line) {
    if (this.isValid(line)) {
      line.removeClass('error');
    } else {
      line.addClass('error');
    }
  },
  move: function(a, b, keepSelect) {
    var len = this.config.count();
    if (a == b || a < 0 || b < 0 || a >= len || b >= len) {
      return;
    }
    this.config.move(a, b);
    for (var i = Math.min(a, b); i <= Math.max(a, b); ++i) {
      this.updateLine(this.getLine(i));
    }
    if (keepSelect) {
      if (this.selectedLine == a) {
        this.selectLine(b);
      } else if (this.selectedLine == b) {
        this.selectLine(a);
      }
    }
  },
  getLine: function(id) {
    if (id < 0 || id >= this.lines.length) {
      return null;
    }
    return this.lines[id];
  },
  remove: function(id) {
    id = Number(id);
    if (id < 0 || id >= this.config.count()) {
      return;
    }
    $(this).trigger('updating');

    var len = this.lines.length;
    this.getLine(id).trigger('removing');
    if (this.config.remove(id)) {
      return;
    }
    this.getLine(len - 1).remove();
    this.lines.pop();

    for (var i = id; i < len - 1; ++i) {
      this.updateLine(this.getLine(i));
    }

    if (id >= len - 2) {
      this.selectLine(id);
    } else {
      this.selectLine(List.ids.noline);
    }
    $(this).trigger('updated');
  },
  selectLine: function(id) {
    var line = id;
    if (typeof id == "number") {
      line = this.getLine(id);
    } else {
      id = Number(line.attr('row'));
    }

    // Can't select the new line.
    if (line && line.hasClass('newline')) {
      line = null;
      id = List.ids.noline;
    }
    if (this.selectedLine == id) {
      return;
    }

    var oldline = this.getLine(this.selectedLine);
    if (oldline) {
      this.cancelEdit(oldline);
      oldline.removeClass('selected');
      oldline.trigger('deselect');
      this.selectedLine = List.ids.noline;
    }

    this.selectedLine = id;
    if (line != null) {
      line.addClass('selected');
      line.trigger('select');
      this.showLine(line);
    }
    $(this).trigger('select');
  },
  showLine: function(line) {
    var showtop = this.scrolls.scrollTop();
    var showbottom = showtop + this.scrolls.height();

    var top = line.offset().top - this.contents.offset().top;

    // Include the scroll bar
    var bottom = top + line.height() + 20;

    if (top < showtop) {
      // show at top
      this.scrolls.scrollTop(top);
    } else if (bottom > showbottom) {
      // show at bottom
      this.scrolls.scrollTop(Math.max(0, bottom - this.scrolls.height()));
    }
  }
};
