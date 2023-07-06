const { app, BrowserWindow } = require('electron');
const electrify = require('@megatroncupcakes/meteor-electrify')(__dirname);
const path = require('path');

let window;

app.on('ready', function() {

  const projectJson = require(path.resolve(__dirname, 'package.json'));
  // splash screen if defined
  let splash;
  let splashStart;
  if(projectJson && projectJson.electronPackager && projectJson.electronPackager.splashScreen){      
    const splashPath = !/\.electrify$/m.test(__dirname) ? 
      path.join(__dirname, 'app', 'programs', 'web.browser', 'app', path.basename(projectJson.electronPackager.splashScreen.file)) :
      path.join(__dirname, '..', projectJson.electronPackager.splashScreen.file);
    
    const splashWindowConfig = projectJson.electronPackager.splashScreen.windowConfiguration ? 
      projectJson.electronPackager.splashScreen.windowConfiguration : 
      {width: 810, height: 610, transparent: true, frame: false, alwaysOnTop: true};

    splash = new BrowserWindow(splashWindowConfig);
    splashStart = new Date();
    splash.loadURL(`file://${splashPath}`);
  }

  // electrify start
  electrify.start(function(meteor_root_url, pkg_json_path, app_is_packaged) {
    
    // creates a new electron window
    window = new BrowserWindow({
      width: 800, height: 600,
      webPreferences: { // settings for electron v4, please check if you use another version of electron
        nodeIntegration: false,
        nodeIntegrationInWorker: false,
        contextIsolation: true,
        webSecurity: false, // meteor app is insecure because of local http address
      },
      frame: false,
      show: (projectJson.electronPackager && projectJson.electronPackager.splashScreen) ? false : true
    });

    window.on('closed', function () {
      window = undefined;
    });

    // open up meteor root url
    window.loadURL(meteor_root_url);

    window.once('ready-to-show', () => {
      let splashTimeout = 0;
      if(splashStart){
        const splashDiff = new Date() - splashStart;
        if(splashDiff < 5000) splashTimeout = 5000 - splashDiff;        
      }
      setTimeout(() => {
        if(splash) splash.destroy();
        window.show();
      }, splashTimeout);
    });
  });
});

app.on('window-all-closed', function () {
  app.quit();
});

app.on('will-quit', function terminate_and_quit(event) {

  // if electrify is up, cancel exiting with `preventDefault`,
  // so we can terminate electrify gracefully without leaving child
  // processes hanging in background
  if(electrify.isup() && event) {

    // holds electron termination
    event.preventDefault();

    // gracefully stops electrify 
    electrify.stop(function(){

      // and then finally quit app
      app.quit();
    });
  }
});


// Defining Methods on the Electron side
//
// electrify.methods({
//   'method.name': function(name, done) {
//     // do things... and call done(err, arg1, ..., argN)
//     done(null);
//   }
// });
//
// =============================================================================
// Created methods can be called seamlessly with help of the
// meteor-electrify-client package from your Meteor's
// client and server code, using:
// 
//    Electrify.call('methodname', [..args..], callback);
// 
// ATTENTION:
//    From meteor, you can only call these methods after electrify is fully
//    started, use the Electrify.startup() convenience method for this
//
// Electrify.startup(function(){
//   Electrify.call(...);
// });
// 
// =============================================================================

electrify.methods({
  'app.quit': function(){
    electrify.stop(function(){
      app.quit();
    });    
  }
});