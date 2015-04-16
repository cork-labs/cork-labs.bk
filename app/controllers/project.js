
var response = require('./util/responses');
var utils = require('./util/utils');

var DEFAULT_PAGE_SIZE = 20;

// -- util functions


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

            console.log(project);

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
            return response.created(res, project.asObject());
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
                        console.log('tag: ' + tag.name, ' project count++');
                    });
                });
                removedTags.forEach(function (tag) {
                    Tag.decProjectCount(tag.id, function (res, err){
                        console.log('tag: ' + tag.name, ' project count--');
                    });
                });
                return response.model(res, req.project.asObject());
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
                projects = projects.map(function (project) {
                    return project.asObject();
                });
                return response.collectionPaged(res, projects, page, limit, count);
            });
        });
    };

    /**
     * POST /projects/search
     *
     * search projects by name (@todo later, and search by tags)
     *
     * @expects req.body.terms
     * @expects req.body.tags
     * @expects req.body.offset
     * @expects req.body.limit
     */

    this.search = function (req, res) {
        var offset = req.body.offset > 0 ? req.body.offset : 0;
        var limit = req.body.limit > 0 ? req.body.limit : DEFAULT_PAGE_SIZE;
        var options = {
            terms: req.body.terms,
            tags: req.body.tags,
            offset: offset,
            limit: limit
        };
        Project.search(options, function (err, projects) {
            if (err) {
                return response.error(res, err);
            }
            Project.count().exec(function (err, count) {
                projects = projects.map(function (project) {
                    return project.asObject();
                });
                return response.collectionContinuous(res, projects, offset, limit, count);
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
        return response.model(res, req.project.asObject());
    };

    /**
     * GET /project/:id/versions
     *
     * exposes only the project versions as required by ng-docs apps
     *
     * @expects req.project
     */
    this.getProjectVersions = function (req, res) {
        var version;
        var data = [];
        for (var ix = 0; ix < req.project.versions.length; ix++) {
            version = req.project.versions[ix];
            tag = version.tag;
            data.unshift({
                tag: tag,
                version: tag, // @todo deprecate: compatibility with ng-docs version selector request
                date: version.date,
                url: req.project.getAssetVersionUrl('docs', tag),
                isCurrent: req.project.isCurrentVersionTag(tag)
            });
        }
        return response.data(res, data);
    };

    /**
     * POST /project/:id/build
     *
     * @expects req.project
     * @expects req.body.tag
     */
    this.buildVersion = function (req, res) {
        var version;
        var data = [];
        console.log(req.body);
        return response.data(res, data);
    };

    /**
     * POST /project/:id/current-version
     *
     * @expects req.project
     * @expects req.body.tag
     */
    this.setCurrentVersion = function (req, res) {
        var version;
        var data = [];
        console.log(req.body);
        return response.data(res, data);
    };

    // -- authorization middlewares

};


module.exports = ProjectCtrl;
