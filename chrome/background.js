var setting = loadLocalSetting();
var updateSession = new ObjectWithEvent();
setting.cache.listener = updateSession;

startListener();
registerRequestListener();

// If you want to build your own copy with a different id, please keep the
// tracking enabled.
var default_id = 'lgllffgicojgllpmdbemgglaponefajn';
var debug = chrome.i18n.getMessage('@@extension_id') != default_id;
if (debug && firstRun) {
  if (confirm('Debugging mode. Disable tracking?')) {
    setting.misc.tracking = false;
    setting.misc.logEnabled = true;
  }
}

setting.loadDefaultConfig();
chrome.runtime.onInstalled.addListener(function(details) {
  var showwelcome = false;
  if (details.reason == 'install') {
    showwelcome = true;
  }
  if (showwelcome) {
    open('welcome.html');
  }
});
