// Copyright (c) 2010 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

/* 
Rule: {
  title,          description
  type,           Can be "wild", "regex", "clsid"
  value,          pattern, correspond to type
  script,         script to inject. Separated by ' '
  hint,           some message to display when created
  supported       Whether this extension support this site now
}
Order: {
  status:           enabled / disabled / intersted / ignore / custom
  position:       default / custom
  identifier:     index
}
ServerSide: 
ActiveXConfig: {
  version:        version
  rules:          object of user-defined rules, propertied by identifiers
  defaultRules:   ojbect of default rules
  scripts:        mapping of workaround scripts, by identifiers. metadatas
  localScripts:   contents of scripts.
  order:          the order of rules
  notify:         array, notify user when it's available.
  cache:          to accerlerate processing
  misc:{          
    lastUpdate:   last timestamp of updating
    logEnabled:   log
    verbose:      verbose level of logging
  }
}                 
PageSide: 
ActiveXConfig: {
  pageSide:       Flag of pageside.
  script:         Helper script to execute
  pageRule:       If page is matched.
  clsidRules:     If page is not matched or disabled. valid CLSID rules
  logEnabled:     log
  verbose:        verbose level of logging
}                 
 */

function ActiveXConfig(settings)
{
  settings.__proto__ = ActiveXConfig.prototype;
  if (settings.version != 3)
    settings.convertVersion();
  settings.updateCache();
  return settings;
}

var settingKey = 'setting2';
var scriptPrefix = 'script_';

clsidPattern = /[^0-9A-F][0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}[^0-9A-F]/;

var agents = {
  ie9: "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)",
  ie8: "Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0)",
  ie7: "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)",
  ff7win: "Mozilla/5.0 (Windows NT 6.1; Intel Mac OS X 10.6; rv:7.0.1) Gecko/20100101 Firefox/7.0.1", 
  ff7mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.6; rv:7.0.1) Gecko/20100101 Firefox/7.0.1",
  ip5: "Mozilla/5.0 (iPhone; CPU iPhone OS 5_0 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9A334 Safari/7534.48.3",
  ipad5: "Mozilla/5.0 (iPad; CPU OS 5_0 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9A334 Safari/7534.48.3"
};

var defaultSetting = {
  version: 3,
  rules: {},
  defaultRules: {},
  scripts: {},
  localScripts: {},
  order: [],
  notify: [],
  misc: {
    lastUpdate: 0,
    logEnabled: false,
    verbose: 3
  }
};

ActiveXConfig.prototype = {
  convertVersion: function() {
    this.version = 3;
    this.update();
  },

  // Only used for user-scripts
  shouldEnable: function(object) {
    if (this.pageRule) {
      return true;
    }
    var clsidRule = this.getFirstMatchedRule(object, this.clsidRules);
    if (clsidRule) {
      return true;
    } else {
      return false;
    }
  },

  parseMiscSetting: function(setting) {
    return {};
  },

  createRule: function() {
    return {
      title: "Rule",
      type: "wild",
      value: "",
      userAgent: "",
      scriptItems: "",
    };
  },
  getPageConfig: function(href) {
    var ret = {};
    ret.pageSide = true;
    ret.version = this.version;
    ret.verbose = this.misc.verbose;
    ret.logEnabled = this.misc.logEnabled;
    ret.pageRule = this.getFirstMatchedRule({href:href});
    if (!ret.pageRule) {
      ret.clsidRules = this.clsidRules;
    } else {
      ret.script = this.getScripts(ret.pageRule.script);
    }
    return ret;
  },

  getFirstMatchedRule: function(object, rules) {
    var useCache = false;
    if (!rules) {
      rules = this.cache.validRules;
      useCache = true;
    }
    for (var i = 0; i < rules.length; ++i) {
      if (this.isRuleMatched(rules[i], object, useCache ? i : -1)) {
        return rules[i];
      }
    }
    return null;
  },

  validateRule: function(rule) {
    var ret = true;
    try {
      if (rule.type == 'wild') {
        ret &= this.convertUrlWildCharToRegex(rule.value) != null;
      } else if (rule.type == 'regex') {
        var r = new RegExp(rule.value, 'i');
      } else if (rule.type == 'clsid') {
        var v = rule.value.toUpperCase();
        if (!clsidPattern.test(v) || v.length > 55)
          ret = false;
      }
    } catch (e) {
      ret = false;
    }
    return ret;
  },

  isRuleMatched: function(rule, object, id) {
    if (rule.type == "wild" || rule.type == "regex" ) {
      var regex;
      if (id >= 0) {
        regex = this.cache.regex[id];
      } else if (rule.type == 'wild') {
        regex = this.convertUrlWildCharToRegex(this.rules[i].value);
      } else if (rule.type == 'regex') {
        regex = new RegExp('^' + this.rules[i].value + '$', 'i');
      }

      if (object.href && regex.test(object.href)) {
        return true;
      }
    } else if (rule.type == "clsid") {
      if (object.clsid) {
        var v1 = clsidPattern.match(rule.value.toUpperCase())[0];
        var v2 = clsidPattern.match(object.clsid.toUpperCase())[0];
        if (v1 == v2 && v1) {
          return true;
        }
      }
    }
    return false;
  },

  getScripts: function(script) {
    if (!script) {
      return "";
    }
    var items = script.split(' ');
    var ret = "";
    for (var i = 0; i < items.length; ++i) {
      ret += '// ' + items[i] + '\n';
      ret += this.getScriptContent(items[i]);
      ret += '\n\n';
    }
    return ret;
  },

  getScriptContent: function(scriptid) {
    this.updateScript(scriptid, false);
    var local = this.localScripts[scriptid];

    if (!local) {
      // The script not found.
      return "";
    }

    var id = scriptPrefix + scriptid;
    return localStorage[id];
  },

  updateAllScripts: function() {
    console.log('updateAllScripts');
    for (var i = 0; i < this.order.length; ++i) {
      var rule = this.getItem(this.order[i]);
      var script = rule.script;
      if (!script) {
        return "";
      }
      var items = script.split(' ');
      for (var i = 0; i < items.length; ++i) {
        this.updateScript(items[i], true);
      }
    }
  },

  updateScript: function(id, async) {
    var remote = this.scripts[id];
    var local = this.localScripts[id];
    if (!remote || remote.updating) {
      return;
    }
    if (local && local.version >= remote.version) {
      return;
    }

    if (!updater) {
      // Should run update from background
      throw "No updater";
    }

    remote.updating = true;

    updater.updateFile({
      url: remote.url,
      async: async,
      complete: function() {
        delete remote.updating;
      },
      context: this,
      success: function(nv, status, xhr) {
        delete remote.updating;
        localStorage[scriptPrefix + id] = nv;
        this.localScripts[id] = remote;
        this.save();
      },
      // Don't evaluate this.
      dataType: "text"
    });

  },

  convertUrlWildCharToRegex: function(wild) {
    try {
      // Remove comment and trim.
      wild = wild.toLowerCase().replace(/\s*###.*$/, "").trim();
      if (wild == "<all_urls>")
        wild = "*://*/*";
      var schemePos = wild.indexOf("://");
      if (schemePos == -1) return null;
      var scheme = wild.substr(0, schemePos);
      if (scheme == "*") scheme = "https?";
      if (scheme != "http" && scheme != "https" && scheme != "https?")
        return null;

      var hostPos = wild.indexOf("/", schemePos + 3);
      if (hostPos == -1) return null;
      var host = wild.substring(schemePos + 3, hostPos);
      if (host.indexOf('*', 1) != -1)
        return null;
      host = host.replace("*", "[^\/]*").replace(/\./g, "\\.");
      var left = wild.substring(hostPos + 1).
        replace(/([\.\\\/\?\{\}])/g, "\\$1").replace("*", "\.*");
      var regex = "^" + scheme + ":\\/\\/" + host + "\\/" + left + "$";
      return new RegExp(regex, 'i');
    } catch (e) {
      return null;
    }
  },

  update: function(item, original) {
    if (this.pageSide) {
      return;
    }
    if (updater) {
      updater.trigger('setting');
    }
    if (item == 'defaultRules') {
      for (var i in this.defaultRules) {
        if (!(i in original)) {
          this.order.push({
            position: 'default',
            status: 'disabled',
            identifier: i
          });
          console.log("Add new default rule: " + i);
        }
      }
    }
    this.updateCache(item);
    this.save();
  },

  updateCache: function(item) {
    if (this.pageSide) {
      return;
    }
    this.cache = {
      validRules: [],
      regex: [],
      clsidRules: [],
      userAgentRules: []
    }
    for (var i = 0; i < this.order.length; ++i) {
      if (this.order[i].status == 'custom' || this.order[i].status == 'enabled') {
        var rule = this.getItem(this.order[i]);
        var cacheId = this.cache.validRules.push(rule) - 1;

        if (rule.type == 'clsid') {
          this.clsidRules.push(rule);
        } else if (rule.type == 'wild') {
          this.cache.regex[cacheId] =
          this.convertUrlWildCharToRegex(rule.value);
        } else if (rule.type == 'regex') {
          this.cache.regex[cacheId] = new RegExp('^' + rule.value + '$', 'i');
        }

        if (rule.userAgent != '') {
          this.cache.userAgentRules.push(rule);
        }

      }
    }
  },

  save: function() {
    if (location.protocol == "chrome-extension:") {
      // Don't include cache in localStorage.
      var cache = this.cache;
      delete this.cache;
      localStorage[settingKey] = JSON.stringify(this);
      this.cache = cache;
    }
  },

  createIdentifier: function() {
    return Date.now() + "_" + Math.round(Math.random() * 65536);
  },

  getItem: function(orderItem) {
    if (orderItem.position == 'custom') {
      return this.rules[orderItem.identifier];
    } else {
      return this.defaultRules[orderItem.identifier];
    }
  }

}

function loadLocalSetting() {
  var setting = null;
  if (localStorage[settingKey]) {
    try{ 
      setting = JSON.parse(localStorage[settingKey]);
    } catch (e){}
  }
  if (setting == null) {
    setting = JSON.parse(JSON.stringify(defaultSetting));
  }

  return new ActiveXConfig(setting);
}

function clearSetting() {
  localStorage.removeItem(settingKey);
  setting = loadLocalSetting();
}
