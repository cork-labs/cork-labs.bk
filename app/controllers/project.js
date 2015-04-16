
var response = require('./util/responses');
var GitRepo = require('../../lib/gitrepo.js').GitRepo;

var fs = require('fs');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var path = require('path');
var cp = require('child_process');
var uuid = require('node-uuid');

var DEFAULT_PAGE_SIZE = 20;

// -- util functions


// -- controller

var ProjectCtrl = function (config, Project, Tag) {

    // -- private

    function unlinkCurrentVersion(source, cb) {
        if (fs.existsSync(source)) {
            fs.unlink(source, cb);
        }
        else {
            cb();
        }
    }


    function linkCurrentVersion(source, destination, cb) {
        fs.symlink(source, destination, 'dir', cb);
    }

    function buildProject(project, tag, shellCmd, cb) {
        var remote = project.repo;
        var tmpPath = path.join('/tmp', project.id, uuid.v4());
        var repo = new GitRepo(remote, tmpPath, tag);
        return repo.clone(function (err) {
            if (err) {
                return cb(err);
            }
            else {
                var options = {
                    cwd: tmpPath
                };
                return cp.exec(shellCmd, options, function (err) {
                    if (err) {
                        return cb(err);
                    }
                    return cb(null, tmpPath);
                });
            }
        });
    }

    function deletePublishBuild(destination, cb) {
        if (fs.existsSync(destination)) {
            rimraf(destination, cb);
        }
        else {
            cb();
        }
    }

    function publishProjectBuild(project, buildPath, storePath, tag, cb) {
        var projectPath = path.join(storePath, project.id);
        return mkdirp(projectPath, 0755, function (err) {
            if (err) {
                return response.error(res, {});
            }
            var destination = path.join(projectPath, tag);
            return deletePublishBuild(destination, function (err) {
                if (err) {
                    return cb(err);
                }
                return fs.rename(buildPath, destination, function (err) {
                    if (err) {
                        return cb(err);
                    }
                    return cb(null, destination);
                });
            });
        });
    }
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
        var error;

        if (!req.body.tag) {
            error = [{property: 'tag', message: 'missing'}];
            return response.error(res, error);
        }
        else if (!Project.isValidVersionTag(req.body.tag)) {
            error = [{property: 'tag', message: 'invalid'}];
            return response.error(res, error);
        }
        else if (req.project.getVersionIndex(req.body.tag) === -1) {
            error = [{property: 'tag', message: 'unknown'}];
            return response.error(res, error);
        }

        // @todo magic string, should come from project config or "jarvis.json" manifest file in checkout
        var buildCmd = './jarvis.sh';

        // build project into tmp dir
        return buildProject(req.project, req.body.tag, buildCmd, function (err, tmpPath) {
            if (err) {
                return response.error(res, {});
            }

            // https://github.com/expressjs/timeout
            if (!req.timedout) {

                // copy project to http server public
                var storePath = config.project.storePath;
                // @todo magic string, should come from config
                var buildPath = path.join(tmpPath, 'build');
                return publishProjectBuild(req.project, buildPath, storePath, req.body.tag, function (err) {
                    if (err) {
                        return response.error(res, {});
                    }
                    return response.noContent(res);
                });
            }
        });
    };

    /**
     * POST /project/:id/current-version
     *
     * @expects req.project
     * @expects req.body.tag
     */
    this.setCurrentVersion = function (req, res) {
        var error;

        if (!req.body.tag) {
            error = [{property: 'tag', message: 'missing'}];
            return response.error(res, error);
        }
        else if (!Project.isValidVersionTag(req.body.tag)) {
            error = [{property: 'tag', message: 'invalid'}];
            return response.error(res, error);
        }
        else if (req.project.getVersionIndex(req.body.tag) === -1) {
            error = [{property: 'tag', message: 'unknown'}];
            return response.error(res, error);
        }

        var source = path.join(config.project.storePath, req.project.id, 'current');
        var destination = path.join(config.project.storePath, req.project.id, req.body.tag);

        // remove symlink
        unlinkCurrentVersion(source, function (err) {
            if (err) {
                return response.error(res, err);
            }

            // create new symlink
            linkCurrentVersion(destination, source, function (err) {
                if (err) {
                    return response.error(res, err);
                }

                // update project
                req.project.currentVersionTag = req.body.tag;
                req.project.save(function (err) {
                    if (err) {
                        return response.error(res, err);
                    }
                    return response.noContent(res);
                });
            });
        });
    };

    // -- authorization middlewares

};


module.exports = ProjectCtrl;
