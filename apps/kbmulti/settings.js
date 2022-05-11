(function(back) {
    function settings() {
      var settings = require('Storage').readJSON("kbmulti.settings.json", true) || {};
      if (settings.firstLaunch===undefined) { settings.firstLaunch = true; }
      if (settings.charTimeout===undefined) { settings.charTimeout = 500; }
      return settings;
    }
      
    function updateSetting(setting, value) {
      var settings = require('Storage').readJSON("kbmulti.settings.json", true) || {};
      settings[setting] = value;
      require('Storage').writeJSON("kbmulti.settings.json", settings);
    }
    
    var mainmenu = {
      "" : { "title" : /*LANG*/"Multitap keyboard" },
      "< Back" : back,
      /*LANG*/'Character selection timeout [ms]': {
        value: settings().charTimeout,
        min: 200, max: 1500, step : 50,
        format: v => v,
        onchange: v => updateSetting("charTimeout", v),
      },
      /*LANG*/'Show help on first launch': {
        value: !!settings().firstLaunch,
        format: v => v?"Yes":"No",
        onchange: v =>  updateSetting("firstLaunch", v)
      }
    };
    E.showMenu(mainmenu);
  })