var setting = loadLocalSetting();
var updateSession = new UpdateSession();
setting.cache.listener = updateSession;

updateSession.bind('success', function() {
  setting.misc.lastUpdate = Date.now();
});

updateSession.bind('complete', function() {
  setting.update();
  console.log('Update completed');
});

startListener();
registerRequestListener();

// If you want to build your own copy with a different id, please keep the
// tracking enabled.
var default_id = "lgllffgicojgllpmdbemgglaponefajn";
var debug = chrome.i18n.getMessage("@@extension_id") != default_id;
if (debug && firstRun) {
  if (confirm("Debugging mode. Disable tracking?")) {
    setting.misc.tracking = false;
  }
}
window.setTimeout(function() {
  setting.updateConfig(updateSession);
  if (firstRun || firstUpgrade) {
    open('donate.html');
  }
}, 1000);
