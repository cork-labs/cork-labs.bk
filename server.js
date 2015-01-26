var express = require('express');

var bootstrap = require('./bootstrap').boot();
var config = bootstrap.config;
var models = bootstrap.models;

// load routes
var Router = require('./app/router');
var App = require('./app/app');
var express = express();

// controllers
var ProjectCtrl = require('./app/controllers/project');
var projectCtrl = new ProjectCtrl(config, models.Project);

// start app
app = new App(express, config, new Router(config, projectCtrl));
app.start(process.env.PORT || config.server.port || 3000);

// expose app
exports = module.exports = app;
