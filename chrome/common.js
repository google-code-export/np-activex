var responseCommands = new Object();

responseCommands.Configuration = function(request, tab) {
  return setting.toSeriable();
}

function startListener() {
  chrome.extension.onRequest.addListener
    (function(request, sender, sendResponse) {
      if (!sender.tab) {
        // Must call from some tab.
        console.error("Illegal call");
        return;
      }
      var resp = responseCommands[request.command];
      if (resp) {
        var response = resp(request, sender.tab);
        if (sendResponse) {
          sendResponse(response);
        }
      }
    });
}
