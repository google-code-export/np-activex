$(document).ready(function() {
  var help = 'http://code.google.com/p/np-activex/wiki/ExtensionHelp?wl=';
  help = help + $$('wikicode');
  $('.help').each(function() {
    this.href = help;
  });
});

