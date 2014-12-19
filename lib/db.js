var mongoose = require('mongoose');
var extend = require('node.extend');


// -- config

/**
 * @var {object} configuration
 */
var config = {
    connection: 'mongodb://hostname/dbname'
};


// -- globals

var killed;
var db;


// -- public API

/**
 * configure
 *
 * @param {object} cfg
 */
var configure = function (cfg) {
    extend(true, config, cfg);
};


/**
 * connects to db
 */
var connect = function () {
    var options = { server: { socketOptions: { keepAlive: 1 } } };
    db = mongoose.connect(config.connection, options);
    return db;
};

/**
 * disconnects from db
 */
var disconnect = function () {
    killed = true;
    db.disconnect();
};

/**
 * logs errors
 */
mongoose.connection.on('error', function (err) {
    console.log('### db connection error', err, err.stack);
})

/**
 * reconnects when closed
 */
mongoose.connection.on('disconnected', function () {
    if (!killed) {
        connect();
    }
})

/**
 * export
 */
module.exports = {
    configure: configure,
    connect: connect,
    disconnect: disconnect
}