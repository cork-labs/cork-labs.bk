var express = require('express');

var bootstrap = require('./bootstrap').boot();
var config = bootstrap.config;
var models = bootstrap.models;

// load routes
var Router = require('./app/router');
var App = require('./app/app');
var express = express();

// controllers
var AuthCtrl = require('./app/controllers/auth');
var UserCtrl = require('./app/controllers/user');
var OAuthCtrl = require('./app/controllers/oauth');
var TagCtrl = require('./app/controllers/tag');
var ProjectCtrl = require('./app/controllers/project');
var SearchCtrl = require('./app/controllers/search');

// clients
var Github = require('./app/clients/github.js');
var github = new Github(config.clients.github);

var oauthProviders = {
    github: github
};

var controllers = {
    auth: new AuthCtrl(config, models.User),
    user: new UserCtrl(config, models.User, github),
    oauth: new OAuthCtrl(config, oauthProviders, models.OAuthState, models.User),
    tag: new TagCtrl(config, models.Tag),
    project: new ProjectCtrl(config, models.Project, models.Tag),
    search: new SearchCtrl(config, models.Project, models.Tag),
};

// start app
app = new App(express, config, new Router(config, controllers));
app.start(process.env.PORT || config.server.port || 3000);

// expose app
exports = module.exports = app;
