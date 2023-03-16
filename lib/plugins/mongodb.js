var fs     = require('fs');
var os = require('os');
var join   = require('path').join;
var spawn  = require('child_process').spawn;
var spawnSync = require('child_process').spawnSync;
var shell  = require('shelljs');
var semver = require('semver');
const camel = require('to-camel-case');

module.exports = function($, logger){
  return new MongoDB($, logger);
};

function MongoDB($, logger) {
  this.$   = $;

  this.name = 'mongodb';
  this.app_mongo_path  = join(this.$.env.app.bin, 'mongo');
  this.app_mongod_path = this.app_mongo_path + 'd';

  // the env object properties is sent to meteor during initialization,
  // through process.env
  this.env = {};

  this.log = logger($, 'electrify:plugins:' + this.name);

  if(this.$.env.os.is_windows){
    this.app_mongo_path  += '.exe';
    this.app_mongod_path += '.exe';
  }
}

MongoDB.prototype.acquire = function(done){
  if((!fs.existsSync(this.app_mongo_path) || this.$.env.plugins.aquiringVersionMissmatch) && fs.existsSync(this.$.env.meteor.mongo)) {
    this.log.info('acquiring mongo');
    shell.cp(this.$.env.meteor.mongo, this.$.env.app.bin);
  } else
    this.log.info('mongo already acquired, moving on');

  if(!fs.existsSync(this.app_mongod_path) || this.$.env.plugins.aquiringVersionMissmatch) {
    this.log.info('acquiring mongod');
    shell.cp(this.$.env.meteor.mongod, this.$.env.app.bin);
    var versionResult = spawnSync(this.$.env.meteor.mongod, ['--version']);
    var regexResult = /^db version v(\d+\.\d+\.\d+)$/gm.exec(versionResult.stdout.toString());
    if (regexResult && regexResult[1]) {
      this.$.env.plugins.binVersions.mongod = regexResult[1];
    }
  } else
    this.log.info('mongod already acquired, moving on');

  done();
};

MongoDB.prototype.start = function(done) {
  if (this.$.env.app.config.mongo) {
    if (typeof this.$.env.app.config.mongo === 'object' && this.$.env.app.config.mongo.MONGO_URL) {
      this.log.info('Use external MONGO_URL');
      this.env.MONGO_URL = this.$.env.app.config.mongo.MONGO_URL;
      if (this.$.env.app.config.mongo.MONGO_OPLOG_URL) {
        this.env.MONGO_OPLOG_URL = this.$.env.app.config.mongo.MONGO_OPLOG_URL;
      }
      return setTimeout(done, 1);
    }

    if (typeof this.$.env.app.config.mongo === 'string') {
      this.log.info('Use external MONGO_URL');
      require(join(this.$.env.app.root, this.$.env.app.config.mongo))(this.env, this.$.env.config, done);
      return;
    }
  }

  // in development mode, when app is not inside elctron, mongodb is just not
  // needed, since meteor itself is already running its own mongodb
  if(!this.$.env.app.is_packaged) {
    this.log.info('app not packaged, skipping start');
    return setTimeout(done, 1);
  }

  this.log.info('starting mongo...');

  var self = this;

  this.$.freeport(null, function(port){

    // mounts mongodb data dir based on user's config

    // when `preserve_db` option is set to true, store db in user's data dir
    if (self.$.env.app.config.preserve_db){
      const appName = camel(require(join(`${process.cwd()}`, 'bin', 'resources', 'app', 'package.json')).name);
      self.dbdir = join(os.homedir(), `.${appName}`, 'data');
    } else {
      // otherwise store db in `/resources` folder
      self.dbdir = join(self.$.env.app.root, 'db');
    }

    // assemble other data
    self.lockfile = join(self.dbdir, 'mongod.lock');
    self.port     = port;

    // certify the the dir exists before using it
    shell.mkdir('-p', self.dbdir);

    // force removes the mongod.lock file - even it may look foolish, it's the
    // only way since mongod never shutdown under windows
    shell.rm('-f', self.lockfile);

    // removed 'smallfiles' mongod arg as it's no longer recognized
    var mongodArgs = [
        '--dbpath'    , self.dbdir,
        '--port'      , self.port,
        '--bind_ip'   , '127.0.0.1'
    ];
    // set storage engine for 32-bit windows mongod that does not support wiredTiger
    if (self.$.env.os.is_windows &&
      semver.gte(self.$.env.plugins.binVersions.mongod, '3.2.0') &&
      semver.lte(self.$.env.plugins.binVersions.mongod, '3.4.0')
    ) {
      mongodArgs.push('--storageEngine', 'mmapv1');
    }
    self.log.debug('mongod cmd: ' + self.app_mongod_path + ' ' + mongodArgs.join(' '));
    self.process = spawn(self.app_mongod_path, mongodArgs);

    var started = false;
    self.process.stdout.on('data', function(data){
      // mimics inherit
      console.log(data.toString());

      // ignore case when checking that mongo started
      if(!started && /waiting for connections/.test(data.toString().toLowerCase())){
        self.log.info('mongo started');
        self.env.MONGO_URL = 'mongodb://' + self.$.env.app.hostname + ':'+ self.port + '/meteor';
        started = true;
        done();
      }
    });

    self.process.stderr.pipe(process.stderr);
  });
};

MongoDB.prototype.stop = function(){
  if(this.process) {
    this.log.debug('Stop mongod process');
    this.$._kill(this.process);
  }
};
