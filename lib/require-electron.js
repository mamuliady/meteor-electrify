var spawnSync = require('child_process').spawnSync;
var path = require('path');

function requireElectron(file) {
  var packageName = 'electron';
  if (file) {
    packageName = path.join(packageName, file);
  }
  try {
    return require(packageName);
  } catch (e) {
    // not found locally
  }
  var cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

  var npmResult = spawnSync(cmd, ['root', '-g'], { timeout: 20000 });
  var globalNodePath = npmResult.stdout.toString().trim();
  var globalPackage = path.join(globalNodePath, packageName);
  try {
    return require(globalPackage);
  } catch (e) {
    console.error(
      'Package ' + packageName + ' not found locally or globally in ' + globalNodePath + '\n\n',
      'If you installed meteor-electrify globally you should install electron also globally with "npm i -g electron".\n',
      'If you are using meteor-electrify as devDependency you should install electron with "npm i --save-dev electron".'
    );
    process.exit(1);
  }
}

module.exports = requireElectron;