var path     = require('path');
var shell    = require('shelljs');

module.exports = path.join(shell.exec('npm list -g | head -1', {silent:true}).stdout.trim(), 'node_modules', '@megatroncupcakes', 'meteor-electrify');