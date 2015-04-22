module.exports = function(config) {

    var mongoose = require('mongoose');

    var userConfig = {};
    var User = require('./models/user.js')(userConfig);

    var oauthStateConfig = {};
    var OAuthState = require('./models/oauthState.js')(oauthStateConfig);

    var tagConfig = {};
    var Tag = require('./models/tag.js')(tagConfig);

    var projectConfig = config.models.project;
    var Project = require('./models/project.js')(projectConfig);

    var models = {
        User: User,
        OAuthState: OAuthState,
        Tag: Tag,
        Project: Project,
    };

    return models;
};
