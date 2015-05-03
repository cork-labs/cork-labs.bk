
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
    var self = this;


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
        var remote = project.getAssetUrl('repo');
        var tmpPath = path.join('/tmp', project.id, uuid.v4());
        var repo = new GitRepo(remote, tmpPath, tag);
        return repo.clone(function (err) {
            if (err) {
                console.log('### project.buildProject - repo.clone', [project._id, tag, shellCmd], 'Error:', err);
                return cb(err);
            }
            else {
                var options = {
                    cwd: tmpPath
                };
                return cp.exec(shellCmd, options, function (err) {
                    console.log('### project.buildProject - cp.exec', [project._id, tag, shellCmd], 'Error:', err);
                    if (err) {
                        return cb(err);
                    }
                    console.log('<', tmpPath)
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
        console.log('### project.buildProject - publish.mkdir', [project._id, buildPath, storePath, tag]);
        return mkdirp(projectPath, 0755, function (err) {
            if (err) {
                console.log('### project.buildProject - publish.mkdir', [project._id, buildPath, storePath, tag], 'Error:', err);
                return response.error(res, {});
            }
            var destination = path.join(projectPath, tag);
            console.log('### project.buildProject - publish.deleteBuild', [project._id, destination]);
            return deletePublishBuild(destination, function (err) {
                if (err) {
                    console.log('### project.buildProject - publish.deleteBuild', [project._id, destination], 'Error:', err);
                    return cb(err);
                }
                console.log('### project.buildProject - publish.rename', [project._id, buildPath, destination]);
                return fs.rename(buildPath, destination, function (err) {
                    if (err) {
                        console.log('### project.buildProject - publish.rename', [project._id, buildPath, destination], 'Error:', err);
                        return cb(err);
                    }
                    return cb(null, destination);
                });
            });
        });
    }


    // -- param middlewares

    self.prepare = {};

    /**
     * loads a project by id
     *
     * @expects req.params.projectId
     * @populates req.project
     */
    self.prepare.loadProjectById = function (req, res, next) {
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

    self.validate = {};


    // -- authorization middlewares

    self.authorize = {};


    // -- route controllers

    self.handle = {};

    /**
     * POST /project
     *
     * saves a new project
     */
    self.handle.create = function (req, res) {

        var project = new Project();
        return project.update(req.body, function (newTags, removedTags) {

            project._id = req.body.id;
            project.status = 'published';

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

            return project.save(function (err) {
                if (err) {
                    return response.error(res, err);
                }
                return response.created(res, project.asObject());
            });
        });
    };

    /**
     * PUT /project/:id
     *
     * saves an existing project
     *
     * @expects req.project
     */
    self.handle.update = function (req, res) {

        return req.project.update(req.body, function (newTags, removedTags) {
            return req.project.save(function (err) {
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
                return response.data(res, req.project.asObject());
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
    self.handle.list = function (req, res) {
        var page = (req.param('page') > 0 ? req.param('page') : 1) - 1;
        var limit = req.param('limit') > 0 ? req.param('limit') : 30;
        var options = {
            perPage: limit,
            page: page
        };

        return Project.list(options, function (err, projects) {
            if (err) {
                return response.error(res, err);
            }
            return Project.count().exec(function (err, count) {
                projects = projects.map(function (project) {
                    return project.asObject();
                });
                return response.data(res, projects, response.getCollectionPagedMeta(page, limit, count));
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

    self.handle.search = function (req, res) {
        var offset = req.body.offset > 0 ? req.body.offset : 0;
        var limit = req.body.limit > 0 ? req.body.limit : DEFAULT_PAGE_SIZE;
        var options = {
            terms: req.body.terms,
            tags: req.body.tags,
            offset: offset,
            limit: limit
        };
        return Project.search(options, function (err, projects) {
            if (err) {
                return response.error(res, err);
            }
            return Project.count().exec(function (err, count) {
                projects = projects.map(function (project) {
                    return project.asObject();
                });
                return response.data(res, projects, response.getCollectionContinuousMeta(offset, limit, count));
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
    self.handle.get = function (req, res) {
        return response.data(res, req.project.asObject());
    };

    /**
     * GET /project/:id/versions
     *
     * exposes only the project versions as required by ng-docs apps
     *
     * @expects req.project
     */
    self.handle.getProjectVersions = function (req, res) {
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
    self.handle.buildVersion = function (req, res) {
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
                return response.error(res, err);
            }

            // https://github.com/expressjs/timeout
            //if (!req.timedout) {

            // copy project to http server public
            var storePath = config.models.project.storePath;
            // @todo magic string, should come from config
            var buildPath = path.join(tmpPath, 'build');
            console.log('### project.buildProject - publish', [req.project._id, buildPath, storePath, req.body.tag]);
            return publishProjectBuild(req.project, buildPath, storePath, req.body.tag, function (err) {
                if (err) {
                    console.log('### project.buildProject - publish', [req.project._id, buildPath, storePath, req.body.tag], 'Error:', err);
                    return response.error(res, err);
                }
                return response.noContent(res);
            });
            //}
        });
    };

    /**
     * POST /project/:id/current-version
     *
     * @expects req.project
     * @expects req.body.tag
     */
    self.handle.setCurrentVersion = function (req, res) {
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

        var source = path.join(config.models.project.storePath, req.project.id, 'current');
        var destination = path.join(config.models.project.storePath, req.project.id, req.body.tag);

        // remove symlink
        return unlinkCurrentVersion(source, function (err) {
            if (err) {
                return response.error(res, err);
            }

            // create new symlink
            return linkCurrentVersion(destination, source, function (err) {
                if (err) {
                    return response.error(res, err);
                }

                // update project
                req.project.currentVersionTag = req.body.tag;
                return req.project.save(function (err) {
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
