if (chrome.extension.getBackgroundPage().firstRun) {
  chrome.extension.getBackgroundPage().firstRun = false;
}
$(document).ready(function() {
  $('#share').load('share.html');
});
