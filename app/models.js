var mongoose = require('mongoose');

var Project = require('./models/project.js');

module.exports = {
    Project: mongoose.model('Project')
};
