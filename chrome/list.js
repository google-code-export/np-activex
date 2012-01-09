/*
 prop = {
   header,        // String
   property,      // String
   events,        // 
   type,          // checkbox, select, input.type, button
   extra          // depend on type
 }
 */

function List(props, main, items, misc) {
  this.props = props;
  this.main = main;
  this.items = items;
  this.selectedLine = -1;
  this.misc = misc;
  $(main).addClass('list');
}

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
      this.contents = $('<div class="listitems"></div>');
      contents.scroll(function() {
        headergroup.css('left', -(contents.scrollLeft()) + 'px');
      });
      $(main).append(headergroup).append(contents);
      load();
    }
  },
  updatePropDisplay : function(line, item, prop) {
    var name = prop.property;
    obj = $('[property=' + name + ']', line);
    var ctrl = obj[0].listdata;
    ctrl.value = item[name];
  },
  updateLine: function(line) {
    var item = this.getBindedItem(line);
    if (item == null) {
      return;
    }
    for (var i = 0; i < this.props.length; ++i) {
      this.updatePropDisplay(line, item, this.props[i]);
    }
  },
  createLine: function() {
    with (this) {
      var line = $('<div></div>').addClass('itemline');
      bindItem(line, -1);
      var inner = $('<div>');
      line.append(inner);
      // create input boxes
      for (var i = 0; i < props.length; ++i) {
        var prop = props[i];
        var ctrl = $('<div></div>').attr('property', prop.property)
        .addClass('listvalue').attr('tabindex', -1);

        var valueobj = new List.types[prop.type](ctrl, prop.extra);

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
      var list = this;
      line.bind('updating', function() {
        $(list).trigger('updating');
      });
      line.bind('updated', function() {
        $(list).trigger('updated');
      });
      return line;
    }
  },
  load: function() {
    this.contents.empty();
    for (var i = 0; i < this.items.length; ++i) {
      var item = this.items[i];
      var line = this.createLine();
      this.bindItem(line, i);
      this.updateLine(line);
      this.contents.append(line);
    }
  },
  bindItem: function(line, id) {
    line[0].itemid = id;
  },
  getBindedId: function(line) {
    return line[0].itemid;
  },
  getBindedItem: function(line) {
    if (line[0].itemid < 0) {
      return null;
    }
    return this.items[line[0].itemid];
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
    this.selectLine(line);
    setTimeout(function() {
      if (!line[0].contains(document.activeElement)) {
        $('.valinput', line).first().focus();
      }
    }, 50);
  },
  finishEdit: function(line) {
    var list = this;
    setTimeout(function() {
      with(list) {
        if (line[0].contains(document.activeElement)) {
          return;
        }
        var newval = getLineNewValue(line);
        var id = getBindedId(line);
        if (isValid(line)) {
          var val;
          if (id >= 0) {
            val = getBindedItem(line);
          } else if (misc.create) {
            val = misc.create();
          } else {
            val = {};
          }
          if (id >= 0) {
            line.trigger('updating');
          }
          if (misc.patch) {
            misc.patch(val, newval);
          } else {
            for (var p in newval) {
              val[p] = newval[p];
            }
          }

          if (id < 0) {
            items.push(val);
            line.removeClass('newline');
            bindItem(line, items.length - 1);
            $(this).trigger('add', val);
          }
          line.trigger('updated');
        }
        cancelEdit(line);
      }
    }, 50);
  },
  cancelEdit: function(line) {
    line.removeClass('editing');
    line.removeClass('error');
    this.updateLine(line);
  },
  addNewItemLine: function() {
    with(this) {
      var line = createLine().addClass('newline');
      if (misc.create) {
        this.emptyVal = misc.create();
      } else {
        this.emptyVal = {};
      }
      bindItem(line, -1);
      contents.append(line);
    }
  },
  isValid: function(line) {
    if (this.misc.validate) {
      var orig = this.getBindedItem(line);
      var obj = this.getLineNewValue(line);
      return valid = this.misc.validate(orig, obj);
    }
    return true;
  },
  validate: function(line) {
    if (this.isValid(line)) {
      line.removeClass('error');
    } else {
      line.addClass('error');
    }
  },
  swap: function(a, b, keepSelect) {
    var items = this.items;
    var len = items.length;
    if (a == b || a < 0 || b < 0 || a >= len || b >= len) {
      return;
    }
    var tmp = items[a];
    items[a] = items[b];
    items[b] = tmp;
    var lines = $('.itemline', this.main);
    this.updateLine(this.getLine(a));
    this.updateLine(this.getLine(b));
    if (keepSelect) {
      if (this.selectedLine == a) {
        this.selectLine(b);
      } else if (this.selectedLine == b) {
        this.selectLine(a);
      }
    }
  },
  getLine: function(id) {
    if (id < 0 || id >= this.items.length) {
      return null;
    }
    var lines = $('.itemline', this.main);
    return lines.slice(id, id + 1);
  },
  remove: function(id) {
    if (id < 0 || id >= this.items.length) {
      return;
    }
    $(this).trigger('updating');
    this.getLine(id).trigger('removing');
    var len = this.items.length;
    for (var i = id; i < len - 1; ++i) {
      this.swap(i, i + 1, false);
    }
    this.getLine(len - 1).remove();

    this.items.pop();
    if (id != len - 1) {
      this.selectLine(id);
    } else {
      this.selectLine(-1);
    }
    $(this).trigger('updated');
  },
  selectLine: function(id) {
    var line = id;
    if (typeof id == "number") {
      line = this.getLine(id);
    } else {
      id = this.getBindedId(line);
    }
    console.log('select ' + id);
    
    if (this.selectedLine == id) {
      return;
    }

    var oldline = this.getLine(this.selectedLine);
    if (oldline) {
      this.cancelEdit(oldline);
      oldline.removeClass('selected');
      oldline.trigger('deselect');
      this.selectedLine = -1;
    }

    if (line != null) {
      line.addClass('selected');
      line.trigger('select');
    }
    $(this).trigger('select');
    this.selectedLine = id;
  }
};
