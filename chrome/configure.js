// Copyright (c) 2010 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

function ActiveXConfig(settings)
{
  convertVersion(settings);
  this.internalSetting = settings;
  this.url_matches = expandMatches(settings.url_plain);
}

SettingVersion = 2;

with (ActiveXConfig) {
  this.currentVersion = 2;
  this.convertVersion = function(orig) {
    if (typeof orig.version != "number") {
      orig.version = 0;
    }
    if (orig.version == SettingVersion) {
      return;
    }
    if (typeof orig.url_plain != "string")
      orig.url_plain = "";
    if (typeof orig.trust_clsids != "string")
      orig.trust_clsids = "";
    if (typeof orig.logEnabled != "boolean")
      orig.logEnabled = false;
    orig.version = 2;
  }

  this.getDefaultSetting = function() {
    var setting = new Object();
    setting.version = 0;
    convertVersion(setting);
    return setting;
  }

  this.convertUrlWildCharToRegex = function(wild)
  {
    try {
      function escapeRegex(str, star) {
        if (!star) star = '*';
        str = str.replace('\\', '/');
        var escapeChars = /([\.\\\/\?\{\}\+\[\]])/g;
        return str.replace(escapeChars, "\\$1").replace('*', star);
      }

      wild = wild.toLowerCase().replace(/###.*$/, '').trim();
      if (wild.substr(0, 2) == 'r/') {
        return new RegExp(wild.substr(2), 'i');
      }
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
  }

  expandMatches = function(urls) {
    var list = urls.split('\n');
    var list_regex = [];
    for (var i = 0; i < list.length; ++i) {
      if (list[i] != "") {
        var regex = convertUrlWildCharToRegex(list[i]);
        if (regex != null) 
          list_regex.push(regex);
      }
    }
    return list_regex;
  }

  prototype.toSeriable = function() {
    return JSON.parse(JSON.stringify(this.internalSetting));
  }

  prototype.getUrlPlain = function() {
    return this.internalSetting.url_plain;
  }

  prototype.getUrlMatches =function() {
    return this.url_matches;
  }

  prototype.setUrlMatches = function(urls) {
    this.internalSetting.url_plain = urls;
    this.url_matches = expandMatches(urls);
    this.save();
  }

  prototype.getTrustedClsids = function() {
    return this.internalSetting.trust_clsids;
  }
  
  prototype.setLogEnabled = function(value) {
    this.internalSetting.logEnabled = value;
  }
  
  prototype.getLogEnabled = function() {
    return this.internalSetting.logEnabled;
  }

  prototype.setTrustedClsids = function(clsid) {
    this.internalSetting.trust_clsids = clsid;
    this.save();
  }

  prototype.save = function() {
    if (location.protocol == "chrome-extension:") {
      var obj = this.toSeriable();
      localStorage.setting = JSON.stringify(obj);
    }
  }

  prototype.isUrlMatched = function(url) {
    var list = this.getUrlMatches();
    url = url.toLowerCase();
    for (var i = 0; i < list.length; ++i) {
      if (list[i].test(url)) return true;
    }
    return false;
  }

  prototype.isClsidTrusted = function(clsid) {
    var clsidpattern = this.getTrustedClsids().replace(
        /###.*/g, "").toUpperCase();
    return clsidpattern.indexOf(clsid.toUpperCase()) != -1;
  }
}

function loadLocalSetting() {
  var setting = null;
  if (localStorage.setting) {
    setting = JSON.parse(localStorage.setting);
  } else {
    return new ActiveXConfig(getDefaultSetting());
  }
  return new ActiveXConfig(setting);
}

