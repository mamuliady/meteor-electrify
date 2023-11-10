var path     = require('path');
var shell    = require('shelljs');
const pathRemainder = ['node_modules', '@megatroncupcakes', 'meteor-electrify'];

module.exports = function (app) {
    shell.config.execPath = app.is_packaged ? path.join(app.bin, 'node') : shell.which('node').toString();
    const packagePath = app.is_packaged ?
        path.join(app.root, ...pathRemainder) :
        path.join(app.root, ...pathRemainder);    
    return packagePath;
}