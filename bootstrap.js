
var fs = require('fs');
var _ = require('lodash');

var env = process.env.NODE_ENV || 'development';

module.exports = {

    isBoot: false,

    db: null,

    models: null,

    config: null,

    boot: function () {

        if (this.isBoot) {
            throw new Error('Double bootstrap.');
        }

        var config = JSON.parse(fs.readFileSync('./config/config.json'));
        this.config = _.merge(config, JSON.parse(fs.readFileSync('./config/config.' + env + '.json')));

        this.isBoot = true;

        this.db = require('./lib/db.js');
        this.db.configure(config.db);
        this.models = require('./app/models.js')(config);
        this.db.connect();

        return this;
    }
};
