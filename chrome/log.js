var tabId = parseInt(location.href.replace(/.*tabid=([0-9]*).*/, '$1'));
if (isNaN(tabId)) {
  alert('Invalid tab id');
}

var backgroundPage = chrome.extension.getBackgroundPage();
$(document).ready(function() {
var s = backgroundPage.generateLogFile(tabId);
$("#text").val(s);
});
