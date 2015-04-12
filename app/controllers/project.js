
var response = require('./util/responses');
var utils = require('./util/utils');

var _ = require('lodash');

// -- util functions

/**
 * @param {object} model
 * @returns {object}
 */
function map(model) {
    var properties = ['name', 'description', 'tags'];
    var property;
    var assets = ['repo', 'docs', 'coverage', 'demo', 'travis'];
    var asset;
    var ix;

    var ret = {
        id: model._id,
        assets: {},
        versions: [],
    };

    for (ix = 0; ix < properties.length; ix++) {
        property = properties[ix];
        ret[property] = _.clone(model[property]);
    }

    for (ix = 0; ix < assets.length; ix++) {
        asset = assets[ix];
        ret.assets[asset] = {
            enabled: model.hasAsset(asset),
            url:  model.getAssetUrl(asset)
        }
    }

    for (ix = 0; ix < model.versions.length; ix++) {
        ret.versions.push({
            version: model.versions[ix].version,
            docsUrl: model.getAssetVersionUrl('docs', model.versions[ix].version),
            coverageUrl: model.getAssetVersionUrl('coverage', model.versions[ix].version),
            date: model.versions[ix].date
        });
    }

    return ret;
};


// -- controller

var ProjectCtrl = function (config, Project, Tag) {

    // -- param middlewares

    /**
     * loads a project by id
     *
     * @expects req.params.projectId
     * @populates req.project
     */
    this.loadProjectById = function (req, res, next) {
        var id = req.param('projectId');
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
     * POST /project
     *
     * saves a new project
     */
    this.create = function (req, res) {

        var project = new Project(req.body);
        project.save(function (err) {
            if (err) {
                return response.error(res, err);
            }
            return response.created(res, map(project));
        });
    };

    /**
     * PUT /project/:id
     *
     * saves an existing project
     *
     * @expects req.project
     */
    this.update = function (req, res) {

        req.project.update(req.body, function (newTags, removedTags) {
            req.project.save(function (err) {
                if (err) {
                    return response.error(res, err);
                }
                // update tags (result is ignored)
                newTags.forEach(function (tag) {
                    Tag.incProjectCount(tag.id, function (res, err) {
                        console.log('incProject on tag', tag.id, res, err);
                    });
                });
                removedTags.forEach(function (tag) {
                    Tag.decProjectCount(tag.id, function (res, err){
                        console.log('decProject on tag', tag.id, res, err);
                    });
                });
                return response.model(res, map(req.project));
            });
        });
    };

    /**
     * GET /project
     *
     * list projects
     *
     * @expects req.param.page
     * @expects req.param.limit
     */
    this.list = function (req, res) {
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
     * POST /search
     *
     * search projects by name (@todo later, and search by tags)
     *
     * @expects req.body.terms
     * @expects req.body.tags
     */
    this.search = function (req, res) {
        var options = {
            terms: req.param('terms')
        };
        Project.search(options, function (err, projects) {
            if (err) {
                return response.error(res, err);
            }
            Project.count().exec(function (err, count) {
                return response.models(res, utils.map(projects, map), page, limit, count);
            });
        });
    };

    /**
     * GET /project/:id
     *
     * load one project by id
     *
     * @expects req.project
     */
    this.get = function (req, res) {
        return response.model(res, map(req.project));
    };


    /**
     * GET /project/:id/versions
     *
     * exposes only the project versions
     *
     * @expects req.project
     */
    this.getProjectVersions = function (req, res) {
        var version;
        var data = [];
        for (var ix = 0; ix < req.project.versions.length; ix++) {
            version = req.project.versions[ix].version;
            data.unshift({
                version: version,
                url: req.project.getAssetVersionUrl('docs', version)
            });
        }
        return response.data(res, data);
    };

    // -- authorization middlewares

};


module.exports = ProjectCtrl;
