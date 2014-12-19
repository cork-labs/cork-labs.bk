var express = require('express');
var db = require('./lib/db.js');


// -- main

var env = process.env.NODE_ENV || 'development';
var config = require('./config/config')[env];

// configure and connect db
db.configure(config.db);
require('./app/models.js');
db.connect();

// load routes
var routes = require('./app/routes');
var App = require('./app/app');
var express = express();

// start app
app = new App(express, config, routes);
app.start(process.env.PORT || 3000);

// expose app
exports = module.exports = app;
