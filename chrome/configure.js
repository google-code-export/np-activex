// Copyright (c) 2010 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

function ActiveXConfig(settings)
{
  settings.__proto__ = ActiveXConfig.prototype;
  if (settings.version != 3)
    settings.convertVersion();
  settings.loadCache();
  return settings;
}

/* 
 Rule: {
   title,       // description
   type,        // Can be "wild", "regex", "clsid"
   value,       // pattern, correspond to type
   enabled,     // Enable page objects
   scriptItems, //
   scriptFile,  // script to inject
   hint,        // some message to display when created
   supported,   // Whether this extension support this site now
   serverid     // Used to identify rule when updated
 }
 ActiveXConfig: {
   version:     // version
   rules:       // array of Rule
   lastupdate:  // last timestamp of updating
   logEnabled:  // log
   verbose:     // verbose level of logging
   // In returned values only
   pageRule:    // If page is matched.
   clsidRules:  // If not matched or disabled. CLSID rules
 }
 */

clsidPattern = /[^0-9A-F][0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}[^0-9A-F]/;

var defaultSetting = {
  version: 3,
  rules: [],
  lastupdate: -1,
  logEnabled: false,
  verbose: 3
};

ActiveXConfig.prototype = {
  convertVersion: function() {
    this.version = 3;
    this.update();
  },

  // Only used for user-scripts
  shouldEnable: function(object) {
    if (this.pageRule && this.pageRule.enabled) {
      return true;
    }
    var clsidRule = this.getFirstMatchedRule(object, this.clsidRules);
    if (clsidRule) {
      return clsidRule.enabled;
    } else {
      return false;
    }
  },

  parseMiscSetting: function(setting) {
    return {};
  },
  getPageConfig: function(href) {
    var ret = {};
    ret.pageSide = true;
    ret.version = this.version;
    ret.verbose = this.verbose;
    ret.logEnabled = this.logEnabled;
    ret.pageRule = this.getFirstMatchedRule({href:href});
    if (!ret.pageRule) {
      ret.clsidRules = this.clsidRules;
    }
    return ret;
  },

  getFirstMatchedRule: function(object, rules) {
    if (!rules) {
      rules = this.rules;
    }
    for (var i = 0; i < rules.length; ++i) {
      if (this.isRuleMatched(rules[i], object, this.pageSide ? -1 : i)) {
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
    if ((rule.type == "wild" || rule.type == "regex" ) && id >= 0) {
      if (object.href && this.cache.regex[id].test(object.href)) {
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

  update: function() {
    if (this.pageSide) {
      return;
    }
    this.loadCache();
    this.save();
  },

  loadCache: function() {
    if (this.pageSide) {
      return;
    }
    this.cache = {
      regex: [],
      clsidRules: [],
      userAgentRules: []
    }
    for (var i = 0; i < this.rules.length; ++i) {
      if (this.rules[i].type == 'clsid') {
        this.clsidRules.push(this.rules[i]);
      } else if (this.rules[i].type == 'wild') {
        this.cache.regex[i] =
        this.convertUrlWildCharToRegex(this.rules[i].value);
      } else if (this.rules[i].type == 'regex') {
        this.cache.regex[i] = new RegExp(this.rules[i].value, 'i');
      }

      if (this.rules[i].userAgent != 'chrome') {
        this.cache.userAgentRules.push(this.rules[i]);
      }
    }
  },

  save: function() {
    if (location.protocol == "chrome-extension:") {
      // Don't include cache in localStorage.
      var cache = this.cache;
      delete this.cache;
      localStorage.setting2 = JSON.stringify(this);
      this.cache = cache;
    }
  }
  
}

function loadLocalSetting() {
  var setting = null;
  if (localStorage.setting2) {
    setting = JSON.parse(localStorage.setting2);
    return new ActiveXConfig(setting);
  } else {
    return new ActiveXConfig(defaultSetting);
  }
}

