// Generated by BangleApps/bin/firmwaremaker.js
require('Storage').write(".bootcde","E.setFlags({pretokenise:1});\nvar startapp;\ntry {\n  startapp = require('Storage').readJSON('+start');\n} catch (e) {}\nif (startapp) {\n  eval(require(\"Storage\").read(startapp.src));\n} else {\n  setWatch(function displayMenu() {\n    Bangle.setLCDOffset(0); // remove notifications\n    Bangle.setLCDMode(\"direct\");\n    g.clear();\n    // attempt to remove any currently-running code\n    clearInterval();\n    clearWatch();\n    Bangle.removeAllListeners();\n    NRF.removeAllListeners();\n    Bluetooth.removeAllListeners();\n    E.removeAllListeners();\n    delete GB;\n    delete WIDGETS;\n    delete WIDGETPOS;\n    delete drawWidgets;\n    var s = require(\"Storage\");\n    var apps = s.list().filter(a=>a[0]=='+').map(app=>{\n      try { return s.readJSON(app); }\n      catch (e) { return {name:\"DEAD: \"+app.substr(1)} }\n    }).filter(app=>app.type==\"app\" || app.type==\"clock\" || !app.type);\n    apps.sort((a,b)=>{\n      var n=(0|a.sortorder)-(0|b.sortorder);\n      if (n) return n; // do sortorder first\n      if (a.name<b.name) return -1;\n      if (a.name>b.name) return 1;\n      return 0;\n    });\n    var selected = 0;\n    var menuScroll = 0;\n    var menuShowing = false;\n\n    function drawMenu() {\n      g.setFont(\"6x8\",2);\n      g.setFontAlign(-1,0);\n      var n = 3;\n      if (selected>=n+menuScroll) menuScroll = 1+selected-n;\n      if (selected<menuScroll) menuScroll = selected;\n      if (menuScroll) g.fillPoly([120,0,100,20,140,20]);\n      else g.clearRect(100,0,140,20);\n      if (apps.length>n+menuScroll) g.fillPoly([120,239,100,219,140,219]);\n      else g.clearRect(100,219,140,239);\n      for (var i=0;i<n;i++) {\n        var app = apps[i+menuScroll];\n        if (!app) break;\n        var y = 24+i*64;\n        if (i+menuScroll==selected) {\n          g.setColor(0.3,0.3,0.3);\n          g.fillRect(0,y,239,y+63);\n          g.setColor(1,1,1);\n          g.drawRect(0,y,239,y+63);\n        } else\n          g.clearRect(0,y,239,y+63);\n        g.drawString(app.name,64,y+32);\n        var icon=undefined;\n        if (app.icon) icon = s.read(app.icon);\n        if (icon) try {g.drawImage(icon,8,y+8);} catch(e){}\n      }\n    }\n    drawMenu();\n    setWatch(function() {\n      if (selected>0) {\n        selected--;\n        drawMenu();\n      }\n    }, BTN1, {repeat:true});\n    setWatch(function() {\n      if (selected+1<apps.length) {\n        selected++;\n        drawMenu();\n      }\n    }, BTN3, {repeat:true});\n    setWatch(function() { // run\n      if (!apps[selected].src) return;\n      clearWatch();\n      g.clear(1);\n      g.setFont(\"6x8\",2);\n      g.setFontAlign(0,0);\n      g.drawString(\"Loading...\",120,120);\n      // if clock, just set the default setting and restart\n      if (apps[selected].type==\"clock\") {\n        try {\n          var settings = require(\"Storage\").readJSON('setting.json');\n          settings.clock = apps[selected].id;\n          require(\"Storage\").write('setting.json',settings);\n        } catch (e) { }\n        load();\n      } else {\n        // load like this so we ensure we've cleared out our RAM\n        setTimeout(process.memory,10); // force GC\n        setTimeout('eval(require(\"Storage\").read(\"'+apps[selected].src+'\"));',20);\n      }\n    }, BTN2, {repeat:true,edge:\"falling\"});\n  }, BTN2, {repeat:false,edge:\"falling\"}); // menu on middle button\n\n  var WIDGETPOS={tl:32,tr:g.getWidth()-32,bl:32,br:g.getWidth()-32};\n  var WIDGETS={};\n  function drawWidgets() { for (var w of WIDGETS) w.draw(); }\n  var settings;\n  try {\n    settings = require(\"Storage\").readJSON('setting.json');\n  } catch (e) {\n    settings = {}\n  }\n  // load widgets\n  require(\"Storage\").list().filter(a=>a[0]=='=').forEach(widget=>eval(require(\"Storage\").read(widget)));\n  setTimeout(drawWidgets,100);\n  // load clock if specified\n  var clockApp = settings.clock;\n  if (clockApp) clockApp = require(\"Storage\").read(clockApp)\n  if (!clockApp) {\n    var clockApps = require(\"Storage\").list().filter(a=>a[0]=='+').map(app=>{\n      try { return require(\"Storage\").readJSON(app); }\n      catch (e) {}\n    }).filter(app=>app.type==\"clock\").sort((a, b) => a.sortorder - b.sortorder);\n    if (clockApps && clockApps.length > 0)\n      clockApp = require(\"Storage\").read(clockApps[0].src);\n    delete clockApps;\n  }\n  if (clockApp) eval(clockApp);\n  else E.showMessage(\"No Clock Found\");\n  delete clockApp;\n}\n");
require('Storage').write("+mclock",{"name":"Morphing Clock","type":"clock","icon":"*mclock","src":"-mclock","sortorder":-10,"version":"0.01","files":"+mclock,-mclock,*mclock"});
require('Storage').write("-mclock","(function(){ // make our own scope so this is GC'd when intervals are cleared\n// Offscreen buffer\nvar buf = Graphics.createArrayBuffer(240,86,1,{msb:true});\nfunction flip() {\n  g.setColor(1,1,1);\n  g.drawImage({width:buf.getWidth(),height:buf.getHeight(),buffer:buf.buffer},0,50);\n}\n// The last time that we displayed\nvar lastTime = \"     \";\n// If animating, this is the interval's id\nvar animInterval;\n\n/* Get array of lines from digit d to d+1.\n n is the amount (0..1)\n maxFive is true is this digit only counts 0..5 */\nconst DIGITS = {\n\" \":n=>[],\n\"0\":n=>[\n[n,0,1,0],\n[1,0,1,1],\n[1,1,1,2],\n[n,2,1,2],\n[n,1,n,2],\n[n,0,n,1]],\n\"1\":n=>[\n[1-n,0,1,0],\n[1,0,1,1],\n[1-n,1,1,1],\n[1-n,1,1-n,2],\n[1-n,2,1,2]],\n\"2\":n=>[\n[0,0,1,0],\n[1,0,1,1],\n[0,1,1,1],\n[0,1+n,0,2],\n[1,2-n,1,2],\n[0,2,1,2]],\n\"3\":n=>[\n[0,0,1-n,0],\n[0,0,0,n],\n[1,0,1,1],\n[0,1,1,1],\n[1,1,1,2],\n[n,2,1,2]],\n\"4\":n=>[\n[0,0,0,1],\n[1,0,1-n,0],\n[1,0,1,1-n],\n[0,1,1,1],\n[1,1,1,2],\n[1-n,2,1,2]],\n\"5\": (n,maxFive)=>maxFive ? [ // 5 -> 0\n[0,0,0,1],\n[0,0,1,0],\n[n,1,1,1],\n[1,1,1,2],\n[0,2,1,2],\n[0,2,0,2],\n[1,1-n,1,1],\n[0,1,0,1+n]] : [ // 5 -> 6\n[0,0,0,1],\n[0,0,1,0],\n[0,1,1,1],\n[1,1,1,2],\n[0,2,1,2],\n[0,2-n,0,2]],\n\"6\":n=>[\n[0,0,0,1-n],\n[0,0,1,0],\n[n,1,1,1],\n[1,1-n,1,1],\n[1,1,1,2],\n[n,2,1,2],\n[0,1-n,0,2-2*n]],\n\"7\":n=>[\n[0,0,0,n],\n[0,0,1,0],\n[1,0,1,1],\n[1-n,1,1,1],\n[1,1,1,2],\n[1-n,2,1,2],\n[1-n,1,1-n,2]],\n\"8\":n=>[\n[0,0,0,1],\n[0,0,1,0],\n[1,0,1,1],\n[0,1,1,1],\n[1,1,1,2],\n[0,2,1,2],\n[0,1,0,2-n]],\n\"9\":n=>[\n[0,0,0,1],\n[0,0,1,0],\n[1,0,1,1],\n[0,1,1-n,1],\n[0,1,0,1+n],\n[1,1,1,2],\n[0,2,1,2]],\n\":\":n=>[\n[0.4,0.4,0.6,0.4],\n[0.6,0.4,0.6,0.6],\n[0.6,0.6,0.4,0.6],\n[0.4,0.4,0.4,0.6],\n[0.4,1.4,0.6,1.4],\n[0.6,1.4,0.6,1.6],\n[0.6,1.6,0.4,1.6],\n[0.4,1.4,0.4,1.6]]\n};\n\n/* Draw a transition between lastText and thisText.\n 'n' is the amount - 0..1 */\nfunction draw(lastText,thisText,n) {\n  buf.clear();\n  var x = 1;  // x offset\n  const p = 2; // padding around digits\n  var y = p; // y offset\n  const s = 34; // character size\n  for (var i=0;i<lastText.length;i++) {\n    var lastCh = lastText[i];\n    var thisCh = thisText[i];\n    if (thisCh==\":\") x-=4;\n    var ch, chn = n;\n    if (lastCh!==undefined &&\n        (thisCh-1==lastCh ||\n         (thisCh==0 && lastCh==5) ||\n         (thisCh==0 && lastCh==9)))\n      ch = lastCh;\n    else {\n      ch = thisCh;\n      chn = 0;\n    }\n    var l = DIGITS[ch](chn,lastCh==5 && thisCh==0);\n    l.forEach(c=>{\n      if (c[0]!=c[2]) // horiz\n        buf.fillRect(x+c[0]*s,y+c[1]*s-p,x+c[2]*s,y+c[3]*s+p);\n      else if (c[1]!=c[3]) // vert\n        buf.fillRect(x+c[0]*s-p,y+c[1]*s,x+c[2]*s+p,y+c[3]*s);\n    });\n    if (thisCh==\":\") x-=4;\n    x+=s+p+7;\n  }\n  y += 2*s;\n  var d = new Date();\n  buf.setFont(\"6x8\");\n  buf.setFontAlign(-1,-1);\n  buf.drawString((\"0\"+d.getSeconds()).substr(-2), x, y-8);\n  // date\n  buf.setFontAlign(0,-1);\n  var date = d.toString().substr(0,15);\n  buf.drawString(date, buf.getWidth()/2, y+8);\n  flip();\n}\n\n/* Show the current time, and animate if needed */\nfunction showTime() {\n  if (!Bangle.isLCDOn()) return;\n  if (animInterval) return; // in animation - quit\n  var d = new Date();\n  var t = (\" \"+d.getHours()).substr(-2)+\":\"+\n          (\"0\"+d.getMinutes()).substr(-2);\n  var l = lastTime;\n  // same - don't animate\n  if (t==l) {\n    draw(t,l,0);\n    return;\n  }\n  var n = 0;\n  animInterval = setInterval(function() {\n    n += 1/10;\n    if (n>=1) {\n      n=1;\n      clearInterval(animInterval);\n      animInterval=0;\n    }\n    draw(l,t,n);\n  }, 20);\n  lastTime = t;\n}\n\nBangle.on('lcdPower',function(on) {\n  if (on) {\n    showTime();\n    drawWidgets();\n  }\n});\n\ng.clear();\n// Update time once a second\nsetInterval(showTime, 1000);\nshowTime();\n})();\n");
require('Storage').write("*mclock",require("heatshrink").decompress(atob("mEwghC/AE8IxAAEwAWVDB4WIDBwWJAAIWPmf//8zDBpFDwYVBAAc4JJYWJDAoXKn4SC+EPAgXzC5JGCx4qDC4n//BIIEIRCEC4v/GBBdHC4xhCIw5dDC5BhCJAgXCRQoXGJAQXEUhAXHJAyNGC5KRCC7p2FC5B4CC5kggQXOBwvyBQMvSA4XL+EIwCoIC8ZHCgYXNO44LBBIiPPCAIwFC5DXGAAMwGAjvPGA4XIwYXHGALBDnAXFhCQHGAaOFwAXGPA4bFC4xIMIxIXDJBJGEC4xICSJCNEIwowEMJBdCFwwXEMJBdCC5BICDA4WDIw4wEAAMzCoMzBAgWIDAwAGCxRJEAAxFJDBgWNDBAWPAH4AYA==")));
require('Storage').write("+setting",{"name":"Settings","type":"app","icon":"*settings","src":"-settings","version":"0.01","files":"+setting,-setting,=setting,setting.json,*setting"});
require('Storage').write("-setting","Bangle.setLCDPower(1);\nBangle.setLCDTimeout(0);\n\ng.clear();\nconst storage = require('Storage');\nlet settings;\n\nfunction debug(msg, arg) {\n  if (settings.debug)\n    console.log(msg, arg);\n}\n\nfunction updateSettings() {\n  debug('updating settings', settings);\n  //storage.erase('setting.json'); // - not needed, just causes extra writes if settings were the same\n  storage.write('setting.json', settings);\n}\n\nfunction resetSettings() {\n  settings = {\n    ble: true,\n    dev: true,\n    timeout: 10,\n    vibrate: true,\n    beep: true,\n    timezone: 0,\n    HID : false,\n    HIDGestures: false,\n    debug: false,\n    clock: null\n  };\n  setLCDTimeout(settings.timeout);\n  updateSettings();\n}\n\ntry {\n  settings = storage.readJSON('setting.json');\n} catch (e) {}\nif (!settings) resetSettings();\n\nconst boolFormat = (v) => v ? \"On\" : \"Off\";\n\nfunction showMainMenu() {\n  const mainmenu = {\n    '': { 'title': 'Settings' },\n    'BLE': {\n      value: settings.ble,\n      format: boolFormat,\n      onchange: () => {\n        settings.ble = !settings.ble;\n        updateSettings();\n      }\n    },\n    'Programmable': {\n      value: settings.dev,\n      format: boolFormat,\n      onchange: () => {\n        settings.dev = !settings.dev;\n        updateSettings();\n      }\n    },\n    'LCD Timeout': {\n      value: settings.timeout,\n      min: 0,\n      max: 60,\n      step: 5,\n      onchange: v => {\n        settings.timeout = 0 | v;\n        updateSettings();\n        Bangle.setLCDTimeout(settings.timeout);\n      }\n    },\n    'Beep': {\n      value: settings.beep,\n      format: boolFormat,\n      onchange: () => {\n        settings.beep = !settings.beep;\n        updateSettings();\n        if (settings.beep) {\n          Bangle.beep(1);\n        }\n      }\n    },\n    'Vibration': {\n      value: settings.vibrate,\n      format: boolFormat,\n      onchange: () => {\n        settings.vibrate = !settings.vibrate;\n        updateSettings();\n        if (settings.vibrate) {\n          VIBRATE.write(1);\n          setTimeout(()=>VIBRATE.write(0), 10);\n        }\n      }\n    },\n    'Select Clock': showClockMenu,\n    'Time Zone': {\n      value: settings.timezone,\n      min: -11,\n      max: 12,\n      step: 1,\n      onchange: v => {\n        settings.timezone = 0 | v;\n        updateSettings();\n      }\n    },\n    'HID': {\n      value: settings.HID,\n      format: boolFormat,\n      onchange: () => {\n        settings.HID = !settings.HID;\n        updateSettings();\n      }\n    },\n    'HID Gestures': {\n      value: settings.HIDGestures,\n      format: boolFormat,\n      onchange: () => {\n        settings.HIDGestures = !settings.HIDGestures;\n        updateSettings();\n      }\n    },\n    'Debug': {\n      value: settings.debug,\n      format: boolFormat,\n      onchange: () => {\n        settings.debug = !settings.debug;\n        updateSettings();\n      }\n    },\n    'Set Time': showSetTimeMenu,\n    'Make Connectable': makeConnectable,\n    'Reset Settings': showResetMenu,\n    'Turn Off': Bangle.off,\n    '< Back': load\n  };\n  return Bangle.menu(mainmenu);\n}\n\nfunction showResetMenu() {\n  const resetmenu = {\n    '': { 'title': 'Reset' },\n    '< Back': showMainMenu,\n    'Reset Settings': () => {\n      E.showPrompt('Reset Settings?').then((v) => {\n        if (v) {\n          E.showMessage('Resetting');\n          resetSettings();\n        }\n        setTimeout(showMainMenu, 50);\n      });\n    },\n    // this is include for debugging. remove for production\n    /*'Erase': () => {\n      storage.erase('=setting');\n      storage.erase('-setting');\n      storage.erase('setting.json');\n      storage.erase('*setting');\n      storage.erase('+setting');\n      E.reboot();\n    }*/\n  };\n  return Bangle.menu(resetmenu);\n}\n\nfunction makeConnectable() {\n  try { NRF.wake(); } catch(e) {}\n  Bluetooth.setConsole(1);\n  var name=\"Bangle.js \"+NRF.getAddress().substr(-5).replace(\":\",\"\");\n  E.showPrompt(name+\"\\nStay Connectable?\",{title:\"Connectable\"}).then(r=>{\n    if (settings.ble!=r) {\n      settings.ble = r;\n      updateSettings();\n    }\n    if (!r) try { NRF.sleep(); } catch(e) {}\n    showMainMenu();\n  });\n}\nfunction showClockMenu() {\n  var clockApps = require(\"Storage\").list().filter(a=>a[0]=='+').map(app=>{\n    try { return require(\"Storage\").readJSON(app); }\n    catch (e) {}\n  }).filter(app=>app.type==\"clock\").sort((a, b) => a.sortorder - b.sortorder);\n  const clockMenu = {\n    '': {\n      'title': 'Select Clock',\n    },\n    '< Back': showMainMenu,\n  };\n  clockApps.forEach((app,index) => {\n    var label = app.name;\n    if ((!settings.clock && index === 0) || (settings.clock === app.src)) {\n      label = \"* \"+label;\n    }\n    clockMenu[label] = () => {\n      if (settings.clock !== app.src) {\n        settings.clock = app.src;\n        updateSettings();\n        showMainMenu();\n      }\n    };\n  });\n  if (clockApps.length === 0) {\n     clockMenu[\"No Clocks Found\"] = () => {};\n  }\n  return Bangle.menu(clockMenu);\n}\n\n\n\nfunction showSetTimeMenu() {\n  d = new Date();\n  const timemenu = {\n    '': {\n      'title': 'Set Time',\n      'predraw': function() {\n        d = new Date();\n        timemenu.Hour.value = d.getHours();\n        timemenu.Minute.value = d.getMinutes();\n        timemenu.Second.value = d.getSeconds();\n        timemenu.Date.value = d.getDate();\n        timemenu.Month.value = d.getMonth() + 1;\n        timemenu.Year.value = d.getFullYear();\n      }\n    },\n    '< Back': showMainMenu,\n    'Hour': {\n      value: d.getHours(),\n      min: 0,\n      max: 23,\n      step: 1,\n      onchange: v => {\n        d = new Date();\n        d.setHours(v);\n        setTime(d.getTime()/1000);\n      }\n    },\n    'Minute': {\n      value: d.getMinutes(),\n      min: 0,\n      max: 59,\n      step: 1,\n      onchange: v => {\n        d = new Date();\n        d.setMinutes(v);\n        setTime(d.getTime()/1000);\n      }\n    },\n    'Second': {\n      value: d.getSeconds(),\n      min: 0,\n      max: 59,\n      step: 1,\n      onchange: v => {\n        d = new Date();\n        d.setSeconds(v);\n        setTime(d.getTime()/1000);\n      }\n    },\n    'Date': {\n      value: d.getDate(),\n      min: 1,\n      max: 31,\n      step: 1,\n      onchange: v => {\n        d = new Date();\n        d.setDate(v);\n        setTime(d.getTime()/1000);\n      }\n    },\n    'Month': {\n      value: d.getMonth() + 1,\n      min: 1,\n      max: 12,\n      step: 1,\n      onchange: v => {\n        d = new Date();\n        d.setMonth(v - 1);\n        setTime(d.getTime()/1000);\n      }\n    },\n    'Year': {\n      value: d.getFullYear(),\n      min: 2019,\n      max: 2100,\n      step: 1,\n      onchange: v => {\n        d = new Date();\n        d.setFullYear(v);\n        setTime(d.getTime()/1000);\n      }\n    }\n  };\n  return Bangle.menu(timemenu);\n}\n\nshowMainMenu();\n");
require('Storage').write("=setting","Bangle.HID = E.toUint8Array(atob(\"BQEJBqEBhQIFBxngKecVACUBdQGVCIEClQF1CIEBlQV1AQUIGQEpBZEClQF1A5EBlQZ1CBUAJXMFBxkAKXOBAAkFFQAm/wB1CJUCsQLABQwJAaEBhQEVACUBdQGVAQm1gQIJtoECCbeBAgm4gQIJzYECCeKBAgnpgQIJ6oECwA==\"));\n\n(function() {\n  var s = require('Storage').readJSON('setting.json');\n  var adv = { uart: true };\n  if (s.ble) {\n    if (s.dev)\n      Bluetooth.setConsole(true);\n    else\n      Terminal.setConsole(true);\n    if (s.HID) {\n      adv.hid = Bangle.HID;\n    } else\n      delete Bangle.HID;\n  }\n  NRF.setServices({}, adv);\n  // we just reset, so BLE should be on\n  try { // disable advertising if BLE should be off\n    if (!s.ble) NRF.sleep();\n    else  NRF.wake();\n  } catch(e) {}\n  if (!s.vibrate) Bangle.buzz=Promise.resolve;\n  if (!s.beep) Bangle.beep=Promise.resolve;\n  Bangle.setLCDTimeout(s.timeout);\n  if (!s.timeout) Bangle.setLCDPower(1);\n  E.setTimeZone(s.timezone);\n})()\n");
require('Storage').write("setting.json",{
  ble: true,          // Bluetooth enabled by default
  dev: true,          // Espruino IDE enabled by default
  timeout: 10,         // Default LCD timeout in seconds
  vibrate: true,       // Vibration enabled by default. App must support
  beep: true,          // Beep enabled by default. App must support
  timezone: 0,         // Set the timezone for the device
  HID : false,         // BLE HID mode, off by default
  HIDGestures: false,
  debug: false,        // Debug mode disabled by default. App must support
});
require('Storage').write("*setting",require("heatshrink").decompress(atob("mEwghC/AFEiAAgX/C/4SFkADBgQXFBIgECAAYSCkAWGBIoXGyQTHABBZLkUhiMRiQXLIQwVBAAZlIC44tCAAYxGIxIWFGA4XIFwwwHXBAWHGAwXHFxAwGPAYXTX44XDiAJBgIXGyDAHFAYKDMAq+EGAgXNCwwX/C453XU6IWHa6ZFCC6JJCC4hgEAAoOEC5AwIFwhgEBAgwIBoqmGGBIuFVAgXFGAwLFYAoLFGIYtFeA4MGABMpC4pICkBMGBIpGFC4SuIBIoWFAAxZLC/4X/AFQ")));
require('Storage').write("+astroid",{"name":"Asteroids!","type":"app","icon":"*astroid","src":"-astroid","version":"0.01","files":"+astroid,-astroid,*astroid"});
require('Storage').write("-astroid","Bangle.setLCDMode(\"doublebuffered\");\n\nvar W = g.getWidth();\nvar H = g.getHeight();\ng.setFontAlign(0,-1);\nvar BTNL = BTN4;\nvar BTNR = BTN5;\nvar BTNU = BTN1;\nvar BTNA = BTN2;\n\nfunction newAst(x,y) {\n  var a = {\n    x:x,y:y,\n    vx:Math.random()-0.5,\n    vy:Math.random()-0.5,\n    rad:3+Math.random()*5\n  };\n  return a;\n}\n\nvar running = true;\nvar ship = {};\nvar ammo = [];\nvar ast = [];\nvar score = 0;\nvar level = 4;\nvar timeSinceFired = 0;\nvar lastFrame;\n\nfunction gameStop() {\n  running = false;\n  g.clear();\n  g.drawString(\"Game Over!\",120,(H-6)/2);\n  g.flip();\n}\n\nfunction addAsteroids() {\n  for (var i=0;i<level;i++) {\n    var d,x,y;\n    do {\n      x = Math.random()*W; y = Math.random()*H;\n      var dx = x-ship.x, dy = y-ship.y;\n      d = Math.sqrt(dx*dx+dy*dy);\n    } while (d<10);\n    ast.push(newAst(x,y));\n  }\n}\n\nfunction gameStart() {\n  ammo = [];\n  ast = [];\n  score = 0;\n  level = 4;\n  ship = { x:W/2,y:H/2,r:0,v:0 };\n  timeSinceFired = 0;\n  addAsteroids();\n  running = true;\n}\n\n\nfunction onFrame() {\n  var t = getTime();\n  var d = (lastFrame===undefined)?0:(t-lastFrame)*20;\n  lastFrame = t;\n\n  if (!running) {\n    if (BTNA.read()) gameStart();\n    return;\n  }\n\n  if (BTNL.read()) ship.r-=0.1*d;\n  if (BTNR.read()) ship.r+=0.1*d;\n  ship.v *= Math.pow(0.9,d);\n  if (BTNU.read()) ship.v+=0.2*d;\n  ship.x += Math.cos(ship.r)*ship.v*d;\n  ship.y += Math.sin(ship.r)*ship.v*d;\n  if (ship.x<0) ship.x+=W;\n  if (ship.y<0) ship.y+=H;\n  if (ship.x>=W) ship.x-=W;\n  if (ship.y>=H) ship.y-=H;\n  timeSinceFired+=d;\n  if (BTNA.read() && timeSinceFired>4) { // fire!\n    Bangle.beep(10);\n    timeSinceFired = 0;\n    ammo.push({\n      x:ship.x+Math.cos(ship.r)*4,\n      y:ship.y+Math.sin(ship.r)*4,\n      vx:Math.cos(ship.r)*3,\n      vy:Math.sin(ship.r)*3,\n    });\n  }\n\n  g.clear();\n\n  g.drawString(score,120,0);\n  var rs = Math.PI*0.8;\n  g.drawPoly([\n    ship.x+Math.cos(ship.r)*4, ship.y+Math.sin(ship.r)*4,\n    ship.x+Math.cos(ship.r+rs)*3, ship.y+Math.sin(ship.r+rs)*3,\n    ship.x+Math.cos(ship.r-rs)*3, ship.y+Math.sin(ship.r-rs)*3,\n  ],true);\n  var na = [];\n  ammo.forEach(function(a) {\n    a.x += a.vx*d;\n    a.y += a.vy*d;\n    g.fillRect(a.x-1, a.y, a.x+1, a.y);\n    g.fillRect(a.x, a.y-1, a.x, a.y+1);\n    var hit = false;\n    ast.forEach(function(b) {\n      var dx = a.x-b.x;\n      var dy = a.y-b.y;\n      var d = Math.sqrt(dx*dx+dy*dy);\n      if (d<b.rad) {\n        hit=true;\n        b.hit=true;\n        score++;\n      }\n    });\n    if (!hit && a.x>=0 && a.y>=0 && a.x<W && a.y<H)\n      na.push(a);\n  });\n  ammo=na;\n  na = [];\n  var crashed = false;\n  ast.forEach(function(a) {\n    a.x += a.vx*d;\n    a.y += a.vy*d;\n    g.drawCircle(a.x, a.y, a.rad);\n    if (a.x<0) a.x+=W;\n    if (a.y<0) a.y+=H;\n    if (a.x>=W) a.x-=W;\n    if (a.y>=H) a.y-=H;\n    if (!a.hit) {\n      na.push(a);\n    } else if (a.rad>4) {\n      Bangle.buzz(100);\n      a.hit = false;\n      var vx = 1*(Math.random()-0.5);\n      var vy = 1*(Math.random()-0.5);\n      a.rad/=2;\n      na.push({\n        x:a.x,\n        y:a.y,\n        vx:a.vx-vx,\n        vy:a.vy-vy,\n        rad:a.rad,\n      });\n      a.vx += vx;\n      a.vy += vy;\n      na.push(a);\n    }\n\n    var dx = a.x-ship.x;\n    var dy = a.y-ship.y;\n    var d = Math.sqrt(dx*dx+dy*dy);\n    if (d < a.rad) crashed = true;\n  });\n  ast=na;\n  if (!ast.length) {\n    level++;\n    addAsteroids();\n  }\n  g.flip();\n  if (crashed) {\n    Bangle.buzz(500);\n    gameStop();\n  }\n}\n\ngameStart();\nsetInterval(onFrame, 50);\n");
require('Storage').write("*astroid",require("heatshrink").decompress(atob("mEwghC/ADkN6APN7oDGC64AWDRw9DIIgXVLh/eAYQtEFxsN7oqCCQQDBC5oOBC4IDHFxgmBAY4uvGJQuMC5IuLhpdWMBQuMSBQuMF5IubhqHDFyIfGX5giFkWQGYa/KEQcCkQACmA6KFwwWDkUgNJJVGFwgABFwoXGBYIuGC4jrL8AuBmczJAgLBRhAXCFwQXGRhIXGkUjI4i/CapReHC4KEEC6a/KC48jmQXCfQoXNX44XJawx3CX5gXHXwQuJcYYXHFxaaEhIXEFxiyFGIeQFxqEIFxy0HhwuOFAgAFCxowDAAguODA4WRAH4ADA==")));
require('Storage').write("+gpstime",{"name":"GPS Time","type":"app","icon":"*gpstime","src":"-gpstime","version":"0.01","files":"+gpstime,-gpstime,*gpstime"});
require('Storage').write("-gpstime","var img = require(\"heatshrink\").decompress(atob(\"mEwghC/AH8A1QWVhWq0AuVAAIuVAAIwT1WinQwTFwMzmQwTCYMjlUqGCIuBlWi0UzC6JdBIoMjC4UDmAuOkYXBPAWgmczLp2ilUiVAUDC4IwLFwIUBLoJ2BFwQwM1WjCgJ1DFwQwLFwJ1B0SQCkQWDGBQXBCgK9BDgKQBAAgwJOwUzRgIDBC54wCkZdGPBwACRgguDBIIwLFxEJBQIwLFxGaBYQwKFxQwLgAWGmQuBcAQwJC48ifYYwJgUidgsyC4L7DGBIXBdohnBCgL7BcYIXIGAqMCIoL7DL5IwERgIUBLoL7BO5QXBGAK7DkWiOxQXGFwOjFoUyFxZhDgBdCCgJ1CCxYxCgBABkcqOwIuNGAQXC0S9BLpgAFXoIwBmYuPAAYwCLp4wHFyYwDFyYwDFygwCCyoA/AFQA=\"));\n\nBangle.setLCDPower(1);\nBangle.setLCDTimeout(0);\n\ng.clear();\n\n\n\nvar fix;\nBangle.on('GPS',function(f) {\n  fix = f;\n  g.setFont(\"6x8\",2);\n  g.setFontAlign(0,0);\n  g.clearRect(90,30,239,90);\n  if (fix.fix) {\n    g.drawString(\"GPS\",170,40);\n    g.drawString(\"Acquired\",170,60);\n  } else {\n    g.drawString(\"Waiting for\",170,40);\n    g.drawString(\"GPS Fix\",170,60);\n  }\n  g.setFont(\"6x8\");\n  g.drawString(fix.satellites+\" satellites\",170,80);\n  \n  g.clearRect(0,100,239,239);\n  var t = fix.time.toString().split(\" \");/*\n [\n  \"Sun\",\n  \"Nov\",\n  \"10\",\n  \"2019\",\n  \"15:55:35\",\n  \"GMT+0100\"\n ]\n  */\n  //g.setFont(\"6x8\",2);\n  //g.drawString(t[0],120,110); // day\n  g.setFont(\"6x8\",3);\n  g.drawString(t[1]+\" \"+t[2],120,135); // date\n  g.setFont(\"6x8\",2);\n  g.drawString(t[3],120,160); // year\n  g.setFont(\"6x8\",3);\n  g.drawString(t[4],120,185); // time\n  // timezone\n  var tz = (new Date()).getTimezoneOffset()/60;\n  if (tz==0) tz=\"UTC\";\n  else if (tz>0) tz=\"UTC+\"+tz;\n  else tz=\"UTC\"+tz;\n  g.setFont(\"6x8\",2);\n  g.drawString(tz,120,210); // gmt\n  g.setFontAlign(0,0,3);\n  g.drawString(\"Set\",230,120);\n  g.setFontAlign(0,0);\n});\n\nsetInterval(function() {\n  g.drawImage(img,48,48,{scale:1.5,rotate:Math.sin(getTime()*2)/2});\n},100);\nsetWatch(function() {\n  setTime(fix.time.getTime()/1000);\n}, BTN2, {repeat:true});\n\nBangle.setGPSPower(1)\n");
require('Storage').write("*gpstime",require("heatshrink").decompress(atob("mEwghC/AH8A1QWVhWq0AuVAAIuVAAIwT1WinQwTFwMzmQwTCYMjlUqGCIuBlWi0UzC6JdBIoMjC4UDmAuOkYXBPAWgmczLp2ilUiVAUDC4IwLFwIUBLoJ2BFwQwM1WjCgJ1DFwQwLFwJ1B0SQCkQWDGBQXBCgK9BDgKQBAAgwJOwUzRgIDBC54wCkZdGPBwACRgguDBIIwLFxEJBQIwLFxGaBYQwKFxQwLgAWGmQuBcAQwJC48ifYYwJgUidgsyC4L7DGBIXBdohnBCgL7BcYIXIGAqMCIoL7DL5IwERgIUBLoL7BO5QXBGAK7DkWiOxQXGFwOjFoUyFxZhDgBdCCgJ1CCxYxCgBABkcqOwIuNGAQXC0S9BLpgAFXoIwBmYuPAAYwCLp4wHFyYwDFyYwDFygwCCyoA/AFQA=")));
require('Storage').write("+compass",{"name":"Compass","type":"app","icon":"*compass","src":"-compass","version":"0.01","files":"+compass,-compass,*compass"});
require('Storage').write("-compass","g.clear();\ng.setColor(0,0.5,1);\ng.fillCircle(120,130,80,80);\ng.setColor(0,0,0);\ng.fillCircle(120,130,70,70);\n\nfunction arrow(r,c) {\n  r=r*Math.PI/180;\n  var p = Math.PI/2;\n  g.setColor(c);\n  g.fillPoly([\n    120+60*Math.sin(r), 130-60*Math.cos(r),\n    120+10*Math.sin(r+p), 130-10*Math.cos(r+p),\n    120+10*Math.sin(r+-p), 130-10*Math.cos(r-p),\n    ]);\n}\n\nvar oldHeading = 0;\nBangle.on('mag', function(m) {\n  if (!Bangle.isLCDOn()) return;\n  g.setFont(\"6x8\",3);\n  g.setColor(0);\n  g.fillRect(70,0,170,24);\n  g.setColor(0xffff);\n  g.setFontAlign(0,0);\n  g.drawString(isNaN(m.heading)?\"---\":Math.round(m.heading),120,12);\n  g.setColor(0,0,0);\n  arrow(oldHeading,0);\n  arrow(oldHeading+180,0);\n  arrow(m.heading,0xF800);\n  arrow(m.heading+180,0x001F);\n  oldHeading = m.heading;\n});\nBangle.setCompassPower(1);\n");
require('Storage').write("*compass",require("heatshrink").decompress(atob("mEwghC/AE8IxAAEwAWVDB4WIDBwWJAAIWOwcz///mc4DBhFDwYVBAAYYDJJAWJDAoXKCw//+YXJIwWPCQk/Aof4JBAuHC4v/GBBdHC4nzMIZGHCAIOBC4vz75hDJAgXCCgS9CC4fdAYQXGIwsyCAPyl//nvdVQoXFRofzkYXCCwJGBSIgXFQ4kymcykfdIwZgDC5XzkUyCwJGDC6FNCwPTC5i9FmQXCMgLZFC48zLgMilUv/vdkUjBII9BC6HSC55HD1WiklDNIgXIBok61QYBkSBFC5kqCwMjC6RGB1RcCR4gXIx4MC+Wqkfyl70BEQf4C4+DIwYqBC4XzGAc4C4sISAfz0QDCFgUzRwmAC4wQB+QTCC4f/AYJeCC4hIEPQi9FIwwXDbIzVHC4xICSIYXGRoRGFGAgqFXgouGC4iqDLo4XIJAQYHCwZGHGAgYBXQUzCwYuIDAwAHCxRJEAAxFJDBgWNDBAWPAH4AYA=")));
require('Storage').write("+sbt",{"name":"bluetooth","type":"widget","src":"=sbt","version":"0.01","files":"+sbt,=sbt"});
require('Storage').write("=sbt","(function(){\nvar img_bt = E.toArrayBuffer(atob(\"CxQBBgDgFgJgR4jZMawfAcA4D4NYybEYIwTAsBwDAA==\"));\nvar xpos = WIDGETPOS.tr-24;\nWIDGETPOS.tr-=24;\n\nfunction draw() {\n  var x = xpos, y = 0;\n  if (NRF.getSecurityStatus().connected)\n    g.setColor(0,0.5,1);\n  else\n    g.setColor(0.3,0.3,0.3);\n  g.drawImage(img_bt,10+x,2+y);\n  g.setColor(1,1,1);\n}\nfunction changed() {\n  draw();\n  g.flip();\n}\nNRF.on('connected',changed);\nNRF.on('disconnected',changed);\nWIDGETS[\"bluetooth\"]={draw:draw};\n})()\n");
require('Storage').write("+sbat",{"name":"Battery Level","type":"widget","src":"=sbat","version":"0.01","files":"+sbat,=sbat"});
require('Storage').write("=sbat","(function(){\nvar img_charge = E.toArrayBuffer(atob(\"DhgBHOBzgc4HOP////////////////////3/4HgB4AeAHgB4AeAHgB4AeAHg\"));\nvar CHARGING = 0x07E0;\nvar xpos = WIDGETPOS.tr-64;\nWIDGETPOS.tr-=68;\n\nfunction draw() {\n  var s = 63;\n  var x = xpos, y = 0;\n  g.clearRect(x,y,x+s,y+23);\n  if (Bangle.isCharging()) {\n    g.setColor(CHARGING).drawImage(img_charge,x,y);\n    x+=16;\n    s-=16;\n  }\n  g.setColor(1,1,1);\n  g.fillRect(x,y+2,x+s-4,y+21);\n  g.clearRect(x+2,y+4,x+s-6,y+19);\n  g.fillRect(x+s-3,y+10,x+s,y+14);\n  g.setColor(CHARGING).fillRect(x+4,y+6,x+4+E.getBattery()*(s-12)/100,y+17);\n  g.setColor(1,1,1);\n}\nBangle.on('charging',function(charging) { draw(); g.flip(); if(charging)Bangle.buzz(); });\nWIDGETS[\"battery\"]={draw:draw};\n})()\n");
