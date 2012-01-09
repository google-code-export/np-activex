// Copyright (c) 2010 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

(function (setting, userAgent) {
  function declareActiveXObject() {
    var hiddenDivId = "__hiddendiv_activex";
    window.__proto__.ActiveXObject = function(progid) {
      progid = progid.trim();
      if (progid == 'Msxml2.XMLHTTP' || progid == 'Microsoft.XMLHTTP')
      return new XMLHttpRequest();
      var hiddenDiv = document.getElementById(hiddenDivId);
      if (!hiddenDiv) {
        if (!document.body) document.body=document.createElement("body");
        hiddenDiv = document.createElement("div");
        hiddenDiv.id = hiddenDivId;
        hiddenDiv.setAttribute("style", "display:hidden; width:0px; height:0px");
        document.body.insertBefore(hiddenDiv, document.body.firstChild)
      }
      var obj = document.createElement("object");
      obj.setAttribute("type", "application/x-itst-activex");
      obj.setAttribute("progid", progid);
      obj.setAttribute("style", "display:hidden; width:0px; height:0px");
      hiddenDiv.appendChild(obj);
      return obj.object
    }
    //console.log("ActiveXObject declared");
  }

  function declareEventAsIE(node) {
    if (!node.attachEvent) {
      node.attachEvent = function(event, operation) {
        if (event.substr(0, 2) == "on") {
          this.addEventListener(event.substr(2), operation, false)
        }
      }
    }
    if (!node.detachEvent) {
      node.detachEvent = function(event, operation) {
        if (event.substr(0, 2) == "on") {
          this.removeEventListener(event.substr(2), operation, false)
        }
      }
    }
  }

  function declarePopup(node) {
    var createPopup = function() {
      var SetElementStyles = function( element, styleDict ) {
        var style = element.style ;
        for ( var styleName in styleDict )style[ styleName ] =
        styleDict[ styleName ] ;
      }
      var eDiv = document.createElement( 'div' );
      SetElementStyles( eDiv, { 'position': 'absolute', 'top': '0px',
      'left': '0px', 'width': '0px', 'height': '0px', 'zIndex':
      1000, 'display' : 'none', 'overflow' : 'hidden' } ) ;

      eDiv.body = eDiv ;
      eDiv.write = function(string){eDiv.innerHTML += string;}
      var opened = false ;
      var setOpened = function( b ) {
        opened = b;
      }
      var getOpened = function() {
        return opened ;
      }
      var getCoordinates = function( oElement ) {
        var coordinates = {x:0,y:0} ;
        while( oElement ) {
          coordinates.x += oElement.offsetLeft ;
          coordinates.y += oElement.offsetTop ;
          oElement = oElement.offsetParent ;
        }
        return coordinates ;
      }

      var hide = function() {
        SetElementStyles(eDiv, {
          'top': 0 + 'px',
          'left': 0 + 'px',
          'width': 0 + 'px',
          'height': 0 + 'px',
          'display': 'none'
        });
        eDiv.innerHTML = '';
        this.isShow = false;
      }
      var show = function(iX, iY, iWidth, iHeight, oElement) {
        if (!getOpened()) {
          document.body.appendChild(eDiv);
          setOpened(true);
        };
        this.htmlTxt = eDiv.innerHTML;
        if (this.isShow) {
          this.hide();
        };
        eDiv.innerHTML = this.htmlTxt;
        var coordinates = getCoordinates(oElement);
        eDiv.style.top = (iX + coordinates.x) + 'px';
        eDiv.style.left = (iY + coordinates.y) + 'px';
        eDiv.style.width = iWidth + 'px';
        eDiv.style.height = iHeight + 'px';
        eDiv.style.display = 'block';
        this.isShow = true;
      }

      return {
        htmlTxt: '',
        document: eDiv,
        isOpen: getOpened(),
        isShow: false,
        hide: hide,
        show: show
      }
    }

    if (!node.createPopup) {
      node.createPopup =  createPopup;
    }
  }

  function declareCreateElement(doc, allowActiveX) {
    doc.createElement = function(orig) {
      return function(name) {
        if (name.trim()[0] == '<') {
          // We assume the name is correct.
          document.head.innerHTML += name;
          var obj = document.head.lastChild;
          document.head.removeChild(obj);
          return obj;
        } else {
          var val = orig.call(this, name);
          if (name == "object" && allowActiveX) {
            val.setAttribute("type", "application/x-itst-activex");
          }
          return val;
        }
      }
    }(doc.createElement);
  }

  function declareClsid(proto) {
    proto.__defineGetter__("classid", function() {
      var clsid = this.getAttribute("clsid");
      if (clsid == null) {
        return "";
      }
      return "CLSID:" + clsid.substring(1, clsid.length - 1);
    })
    proto.__defineSetter__("classid", function(value) {
      this.setAttribute("type", "application/x-itst-activex");
      var pos = value.indexOf(":");
      this.setAttribute("clsid", "{" + value.substring(pos + 1) + "}");
      var oldstyle = this.style.display;
      this.style.display = "none";
      this.style.display = oldstyle;
    })
  }
  
  var options = {
    dynamic: true,
    IEEvent: true,
    popup: true,
    clsid: false,
    createElement: true,
    createObject: true // Todo: Change this to false.
  };

  var deltas = setting.split(' ');
  for (var i = 0; i < deltas.length; ++i) {
    var s = deltas[i];
    var nv = true;
    if (s[0] == '!') {
      nv = false;
      s = s.substr(1);
    }
    if (s == 'all') {
      for (var e in options) {
        options[e] = nv;
      }
    } else {
      options[s] = nv;
    }
  }

  var agents = {
    ie9: "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)",
    ie8: "Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0)",
    ie7: "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)",
    ff7win: "Mozilla/5.0 (Windows NT 6.1; Intel Mac OS X 10.6; rv:7.0.1) Gecko/20100101 Firefox/7.0.1", 
    ff7mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.6; rv:7.0.1) Gecko/20100101 Firefox/7.0.1",
    ip5: "Mozilla/5.0 (iPhone; CPU iPhone OS 5_0 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9A334 Safari/7534.48.3",
    ipad5: "Mozilla/5.0 (iPad; CPU OS 5_0 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9A334 Safari/7534.48.3"
  };

  if (options.dynamic) {
    declareActiveXObject();
  }
  if (options.IEEvent) {
    declareEventAsIE(window.Node.prototype);
    declareEventAsIE(window.__proto__);
  }
  if (options.popup) {
    declarePopup(window.__proto__);
  }
  if (options.clsid) {
    declareClsid(HTMLObjectElement.prototype);
  }
  if (options.createElement) {
    declareCreateElement(HTMLDocument.prototype, options.createObject);
  }
  if (userAgent in agents) {
    var agent = agents[userAgent];

    delete navigator.userAgent;
    navigator.userAgent = agent;

    delete navigator.appVersion;
    navigator.appVersion = agent.substr(agent.indexOf('/') + 1);

    if (userAgent.indexOf('ie') >= 0) {
      delete navigator.appName;
      navigator.appName = "Microsoft Internet Explorer";
    }
  }
})
