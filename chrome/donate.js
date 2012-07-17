if (chrome.extension.getBackgroundPage().firstRun) {
  document.getElementById('hint').style.display = '';
  chrome.extension.getBackgroundPage().firstRun = false;
}
$(document).ready(function() {
  $('#share').load('share.html');
});
