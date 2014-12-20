var mongoose = require('mongoose');
var response = require('./util/responses');
var utils = require('./util/utils');

var env = process.env.NODE_ENV || 'development';
var config = require('../../config/config')[env];


// -- models
var Project = mongoose.model('Project');


// -- util functions

/**
 * @param {object} model
 * @returns {object}
 */
function map(model) {
    var ret = {
        id: model._id,
        name: model.name,
        repo: model.repo,
        versions: []
    };
    for (var ix = 0; ix < model.versions.length; ix++) {
        ret.versions.push({
            version: model.versions[ix].version,
            docsUrl: model.versions[ix].docsUrl,
            date: model.versions[ix].date
        });
    }
    return ret;
};

// -- param middlewares

/**
 * loads a project by id
 *
 * @expects req.params.projectId
 * @populates req.project
 */
var loadProjectById = function (req, res, next) {
    var id = req.params.projectId;
    Project.findById(id, function (err, project) {
        if (err) {
            return response.error(res, err);
        }
        if (!project) {
            return response.notFound(res);
        }
        req.project = project;
        return next();
    });
};


// -- validation middlewares


// -- route controllers

/**
 * list projects
 *
 * @expects req.param.page
 * @expects req.param.limit
 */
var list = function (req, res) {
    var page = (req.param('page') > 0 ? req.param('page') : 1) - 1;
    var limit = req.param('limit') > 0 ? req.param('limit') : 30;
    var options = {
        perPage: limit,
        page: page
    };

    Project.list(options, function (err, projects) {
        if (err) {
            return response.error(res, err);
        }
        Project.count().exec(function (err, count) {
            return response.models(res, utils.map(projects, map), page, limit, count);
        });
    });
};

/**
 * load one project by id
 *
 * @expects req.project
 */
var get = function (req, res){
    return response.model(res, map(req.project));
};

/**
 * exposes only the project versions
 *
 * @expects req.project
 */
var getProjectVersions = function (req, res){
    data = [];
    for (var ix = 0; ix < req.project.versions.length; ix++) {
        data.unshift({
            version: req.project.versions[ix].version,
            url: req.project.versions[ix].docsUrl
        });
    }
    return response.data(res, data);
};


// -- authorization middlewares


/**
 * export module statics
 */
module.exports = {

    // param middlewares
    loadProjectById: loadProjectById,

    // route controllers
    list: list,
    get: get,
    getProjectVersions: getProjectVersions,
};
