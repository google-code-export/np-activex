// Copyright (c) 2010 eagleonhill(qiuc12@gmail.com). All rights reserved.
// Use of this source code is governed by a Mozilla-1.1 license that can be
// found in the LICENSE file.

function __declareActiveXObject() {
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
function __declareEventAsIE(node) {
  if (!node.attachEvent) {
    node.attachEvent = function(event, operation) {
      if (event.substr(0, 2) == "on") this.addEventListener(event.substr(2), operation, false)
    }
  }
  if (!node.detachEvent) {
    node.detachEvent = function(event, operation) {
      if (event.substr(0, 2) == "on") this.removeEventListener(event.substr(2), operation, false)
    }
  }
 // console.log("at/detach events declared");
}
function __declareFakePopup(node) {

  var __createPopup = function() {
    var SetElementStyles = function( element, styleDict ) {
      var style = element.style ;
      for ( var styleName in styleDict )style[ styleName ] =
        styleDict[ styleName ] ;
    }
    var eDiv = document.createElement( 'div' );
    SetElementStyles( eDiv, { 'position': 'absolute', 'top': 0 + 'px',
      'left': 0 + 'px', 'width': 0 + 'px', 'height': 0 + 'px', 'zIndex':
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

    return {htmlTxt : '', document : eDiv, isOpen : getOpened(),
      isShow : false, hide : function() { SetElementStyles( eDiv, { 'top': 0
        + 'px', 'left': 0 + 'px', 'width': 0 + 'px', 'height': 0 + 'px',
      'display' : 'none' } ) ; eDiv.innerHTML = '' ; this.isShow = false ;
      }, show : function( iX, iY, iWidth, iHeight, oElement ) { if
        (!getOpened()) { document.body.appendChild( eDiv ) ; setOpened( true )
          ; } ; this.htmlTxt = eDiv.innerHTML ; if (this.isShow) { this.hide() ;
          } ; eDiv.innerHTML = this.htmlTxt ; var coordinates = getCoordinates (
              oElement ) ; eDiv.style.top = ( iX + coordinates.x ) + 'px' ;
        eDiv.style.left = ( iY + coordinates.y ) + 'px' ; eDiv.style.width =
          iWidth + 'px' ; eDiv.style.height = iHeight + 'px' ;
        eDiv.style.display = 'block' ; this.isShow = true ; } }
  }

  if (!node.createPopup) {
    node.createPopup = function() {return __createPopup();};
  }
  //console.log("createPopup Faked");
}
function __overloadCreateElement(doc) {
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
        if (name == "object") {
          val.setAttribute("type", "application/x-itst-activex");
        }
        return val;
      }
    }
  }(doc.createElement);
}

function __declareClsid(proto) {
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

function __declareIEUserAgent() {
  delete navigator.appName;
  navigator.appName='Microsoft Internet Explorer';

  delete navigator.appVersion;
  navigator.appVersion = '5.0 (compatible; MSIE 9.0; Windows NT 6.1; Win64; x64; Trident/5.0; .NET CLR 3.5.30729; .NET CLR 3.0.30729; .NET CLR 2.0.50727; Media Center PC 6.0)';

  delete navigator.userAgent;
  navigator.userAgent = 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Win64; x64; Trident/5.0; .NET CLR 3.5.30729; .NET CLR 3.0.30729; .NET CLR 2.0.50727; Media Center PC 6.0)'
}

function __initIEScription() {
  __declareActiveXObject();
  __declareEventAsIE(window.Node.prototype);
  __declareEventAsIE(window.__proto__);
  __declareFakePopup(window.__proto__);
  __declareClsid(HTMLObjectElement.prototype);
  __overloadCreateElement(HTMLDocument.prototype);
  __declareIEUserAgent();
}

__initIEScription();
