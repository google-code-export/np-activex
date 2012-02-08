// Copyright (c) 2012 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

/* 
Rule: {
  identifier:     an unique identifier
  title:          description
  type:           Can be "wild", "regex", "clsid"
  value:          pattern, correspond to type
  userAgent:      the useragent value. See var "agents" for options.
  script:         script to inject. Separated by spaces
}

Order: {
  status:         enabled / disabled / custom
  position:       default / custom
  identifier:     identifier of rule
}

Issue: {
  type:           Can be "wild", "regex", "clsid"
  value:          pattern, correspond to type
  description:    The description of this issue
  issueId:        Issue ID on issue tracking page
  url:            optional, support page for issue tracking. 
                  Use code.google.com if omitted.
}

ServerSide: 
ActiveXConfig: {
  version:        version
  rules:          object of user-defined rules, propertied by identifiers
  defaultRules:   ojbect of default rules
  scripts:        mapping of workaround scripts, by identifiers. metadatas
  localScripts:   metadatas of local scripts.
  order:          the order of rules
  cache:          to accerlerate processing
  issues:         The bugs/unsuppoted sites that we have accepted.
  misc:{          
    lastUpdate:   last timestamp of updating
    logEnabled:   log
    verbose:      verbose level of logging
  }
}                 

PageSide: 
ActiveXConfig: {
  pageSide:       Flag of pageside.
  pageScript:     Helper script to execute on context of page
  extScript:      Helper script to execute on context of extension
  pageRule:       If page is matched.
  clsidRules:     If page is not matched or disabled. valid CLSID rules
  logEnabled:     log
  verbose:        verbose level of logging
}                 
 */

function ActiveXConfig(input)
{
  var settings;
  if (input === undefined) {
    var defaultSetting = {
      version: 3,
      rules: {},
      defaultRules: {},
      scripts: {},
      localScripts: {},
      order: [],
      notify: [],
      issues: [],
      misc: {
        lastUpdate: 0,
        logEnabled: false,
        verbose: 3
      }
    };
    input = defaultSetting;
  } 

  if (input.version == '3') {
    settings = input;
    settings.__proto__ = ActiveXConfig.prototype;
  } else {
    settings = ActiveXConfig.convertVersion(input);
  }
  settings.updateCache();
  return settings;
}

var settingKey = 'setting';
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

ActiveXConfig.convertVersion = function(setting) {
  if (setting.version == 3) {
    return setting;
  } else if (setting.version == 2) {
    function parsePattern(pattern) {
      pattern = pattern.trim();
      var title = pattern.match(/###(.*)/);
      if (title != null) {
        return {
          pattern: pattern.match(/(.*)###/)[1].trim(),
          title: title[1].trim()
        }
      } else {
        return {
          pattern: pattern,
          title: "Rule"
        }
      }
    }

    var ret = new ActiveXConfig();

    if (setting.logEnabled) {
      ret.misc.logEnabled = true;
    }
    var urls = setting.url_plain.split('\n');
    for (var i = 0; i < urls.length; ++i) {
      var rule = ret.createRule();

      var pattern = parsePattern(urls[i]);
      rule.title = pattern.title;
      var url = pattern.pattern;
      
      if (url.substr(0, 2) == 'r/') {
        rule.type == 'regex';
        rule.value = url.substr(2);
      } else {
        rule.type == 'wild';
        rule.value = url;
      }
      ret.addCustomRule(rule);
    }
    var clsids = setting.trust_clsids.split('\n');
    for (var i = 0; i < clsids.length; ++i) {
      var rule = ret.createRule();
      rule.type = 'clsid';
      var pattern = parsePattern(clsids[i]);
      rule.title = pattern.title;
      rule.value = pattern.pattern;
      ret.addCustomRule(rule);
    }
    return ret;
  }
}

ActiveXConfig.prototype = {
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

  createRule: function() {
    return {
      title: "Rule",
      type: "wild",
      value: "",
      userAgent: "",
      scriptItems: "",
    };
  },
  addCustomRule: function(newItem) {
    if (!this.validateRule(newItem)) {
      return;
    }
    var identifier = this.createIdentifier();
    newItem.identifier = identifier;
    this.rules[identifier] = newItem;
    this.order.push({
      status: 'custom',
      position: 'custom',
      identifier: identifier
    });
  },

  getPageConfig: function(href) {
    var ret = {};
    ret.pageSide = true;
    ret.version = this.version;
    ret.verbose = this.misc.verbose;
    ret.logEnabled = this.misc.logEnabled;
    ret.pageRule = this.getFirstMatchedRule({href:href});
    if (!ret.pageRule) {
      ret.clsidRules = this.cache.clsidRules;
    } else {
      var script = this.getScripts(ret.pageRule.script);
      ret.pageScript = script.page;
      ret.extScript = script.extension;
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

  getMatchedIssue: function(filter) {
    for (var i in this.issues) {
      if (this.isRuleMatched(this.issues[i], filter)) {
        return this.issues[i];
      }
    }
  },

  validateRule: function(rule) {
    var ret = true;
    try {
      if (rule.type == 'wild') {
        ret &= this.convertUrlWildCharToRegex(rule.value) != null;
      } else if (rule.type == 'regex') {
        ret &= rule.value != '';
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
        regex = this.convertUrlWildCharToRegex(rule.value);
      } else if (rule.type == 'regex') {
        regex = new RegExp('^' + rule.value + '$', 'i');
      }

      if (object.href && regex.test(object.href)) {
        return true;
      }
    } else if (rule.type == "clsid") {
      if (object.clsid) {
        var v1 = clsidPattern.exec(rule.value.toUpperCase());
        var v2 = clsidPattern.exec(object.clsid.toUpperCase());
        if (v1 && v1[0] == v2[0]) {
          return true;
        }
      }
    }
    return false;
  },

  getScripts: function(script) {
    var ret = {
      page: "",
      extension: ""
    };
    if (!script) {
      return ret;
    }
    var items = script.split(' ');
    for (var i = 0; i < items.length; ++i) {
      var name = items[i];
      var val = '// ';
      val += items[i] + '\n';
      val += this.getScriptContent(name);
      val += '\n\n';
      ret[this.scripts[name].context] += val;
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
      function escapeRegex(str, star) {
        if (!star) star = '*';
        var escapeChars = /([\.\\\/\?\{\}\+\[\]])/g;
        return str.replace(escapeChars, "\\$1").replace('*', star);
      }

      wild = wild.toLowerCase();
      if (wild == "<all_urls>") {
        wild = "*://*/*";
      }
      var pattern = /^(.*?):\/\/(\*?[^\/\*]*)\/(.*)$/i;
      // pattern: [all, scheme, host, page]
      var parts = pattern.exec(wild);
      if (parts == null) {
        return null;
      }
      var scheme = parts[1];
      var host = parts[2];
      var page = parts[3];
      
      var regex = '^' + escapeRegex(scheme, '[^:]*') + ':\\/\\/';
      regex += escapeRegex(host, '[^\\/]*') + '/';
      regex += escapeRegex(page, '.*');
      return new RegExp(regex, 'i');
    } catch (e) {
      return null;
    }
  },

  update: function(item, original) {
    if (this.pageSide) {
      return;
    }
    if (item == 'defaultRules') {
      for (var i in this.defaultRules) {
        if (!(i in original)) {
          this.addDefaultRule(i);
        }
      }
    }
    this.updateCache(item);
    if (updater) {
      updater.trigger('setting');
    }
    this.save();
  },
  addDefaultRule: function(id) {
    var rule = this.defaultRules[id];
    console.log("Add new default rule: ", rule);
    var custom = null;
    if (rule.type == 'clsid') {
      for (var i in this.rules) {
        var info = {href: "not-a-URL-/", clsid: rule.value};
        if (this.isRuleMatched(this.rules[i], info, -1)) {
          custom = this.rules[i];
          break;
        }
      }
    } else if (rule.keyword && rule.testUrl) {
      // Try to find matching custom rule
      for (var i in this.rules) {
        if (this.isRuleMatched(this.rules[i], {href: rule.testUrl}, -1)) {
          if (this.rules[i].value.toLowerCase().indexOf(rule.keyword) != -1) {
            custom = this.rules[i];
            break;
          }
        }
      }
    }
    var newStatus = 'disabled';
    if (custom) {
      console.log('Convert custom rule', custom, ' to default', rule);
      // Found a custom rule which is similiar to this default rule.
      newStatus = 'enabled';
      // Remove old one
      delete this.rules[custom.identifier];
      for (var i = 0; i < this.order.length; ++i) {
        if (this.order[i].identifier == custom.identifier) {
          this.order.splice(i, 1);
        }
      }
    }
    this.order.push({
      position: 'default',
      status: newStatus,
      identifier: id
    });
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
          this.cache.clsidRules.push(rule);
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
    var base =  'custom_' + Date.now() + "_" + this.order.length + "_";
    var ret;
    do {
      ret = base + Math.round(Math.random() * 65536);
    } while (this.getItem(ret));
    return ret;
  },

  getItem: function(item) {
    var identifier = item;
    if (typeof identifier != 'string') {
      identifier = item.identifier;
    }
    if (identifier in this.rules) {
      return this.rules[identifier];
    } else {
      return this.defaultRules[identifier];
    }
  }

}

function loadLocalSetting() {
  var setting = undefined;
  if (localStorage[settingKey]) {
    try{ 
      setting = JSON.parse(localStorage[settingKey]);
    } catch (e){
      setting = undefined;
    }
  }

  return new ActiveXConfig(setting);
}

function clearSetting() {
  localStorage.removeItem(settingKey);
  setting = loadLocalSetting();
}
