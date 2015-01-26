module.exports = function(config) {

    var mongoose = require('mongoose');

    var projectConfig = {
        basePath: config.project.storePath,
        baseUrl: config.project.baseUrl
    };

    require('./models/project.js')(projectConfig);

    return {
        Project: mongoose.model('Project')
    };
};
