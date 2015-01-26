module.exports = function(config) {

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;


    /**
     * constants - STATUS
     */
    var STATUS = {
        draft: 'draft',
        published: 'published',
        deleted: 'deleted'
    };

    /**
     * schema
     */
    var Project;
    var ProjectSchema = new Schema({

        _id: {
            type: String,
            trim: true
        },
        status: {
            type: String,
            enum: {
                values: [STATUS.draft, STATUS.published, STATUS.deleted],
                message: 'invalid'
            }
        },
        name: {
            type: String,
            trim: true
        },
        path: {
            type: String,
            ref: 'User'
        },
        repo: {
            type: String,
            ref: 'User'
        },
        versions: [
            {
                version: {
                    type: String,
                    trim: true
                },
                pkg: {
                    type: String,
                    trim: true
                },
                docsUrl: {
                    type: String,
                    trim: true
                },
                coverageUrl: {
                    type: String,
                    trim: true
                },
                date: {
                    type: Date,
                    default: Date.now
                }
            }
        ],
        createdDate: {
            type: Date,
            default: Date.now
        }
    });


    /**
     * validation / status / required
     */
    ProjectSchema.path('status').required(true, 'required');

    /**
     * validation / name / required
     */
    ProjectSchema.path('name').required(true, 'required');

    /**
     * validation / repo / required owner
     */
    ProjectSchema.path('repo').required(true, 'required');

    /**
     * methods
     */
    ProjectSchema.methods = {

        getPath: function () {
            if (this.path) {
                return this.path;
            }
            else {
                return config.basePath + '/' + this._id;
            }
        },

        getVersionDocsUrl: function (version) {
            for (var ix = 0; ix < this.versions.length; ix++) {
                if (this.versions[ix].version === version) {
                    if (this.versions[ix].docsUrl) {
                        return this.versions[ix].docsUrl;
                    }
                    else {
                        return config.baseUrl + '/' + this._id + '/' + version + '/docs';
                    }
                }
            }
        },

        getVersionCoverageUrl: function (version) {
            for (var ix = 0; ix < this.versions.length; ix++) {
                if (this.versions[ix].version === version) {
                    if (this.versions[ix].coverageUrl) {
                        return this.versions[ix].coverageUrl;
                    }
                    else {
                        return config.baseUrl + '/' + this._id + '/' + version + '/coverage';
                    }
                }
            }
        },

        getVersionIndex: function (version) {
            for (var ix = 0; ix < this.versions.length; ix++) {
                if (this.versions[ix].version === version) {
                    return ix;
                }
            }
            return -1;
        }
    };


    /**
     * static methods
     */
    ProjectSchema.statics = {

        /**
         * @constant STATUS
         */
        STATUS: STATUS,

        /**
         * creates a project
         *
         * @param {string} status
         * @param {string} name
         * @param {string} repo
         * @param {string} path
         * @param {function} cb
         */
         create: function (id, status, name, repo, path, cb) {
            var project = new Project({
                _id: id,
                status: status,
                name: name,
                repo: repo,
                path: path
            });
            project.save(cb);
        },

        /**
         * find project by id
         *
         * @param {ObjectId} id
         * @param {function(err, data)} cb
         */
        findById: function (id, cb) {
            return this.findOne({ _id : id })
                .exec(cb);
        },

        /**
         * list projects
         *
         * @param {Object} options
         * @param {function(err, data)} cb
         */
        list: function (options, cb) {
            var defaultCriteria = {
                status: STATUS.published
            };
            var criteria = options.criteria || defaultCriteria;
            var page = options.page || 0;
            var pageSize = options.perPage;
            var offset = page * pageSize;

            return this.find(criteria)
                .sort({'name': 1})
                .limit(pageSize)
                .skip(offset)
                .exec(cb);
        },

        /**
         * adds a version to the project
         *
         * @param {string} projectId
         * @param {string} version
         * @param {string} docsUrl
         * @param {string} coverageUrl
         * @param {function} cb
         */
        addVersion: function (id, version, docsUrl, coverageUrl, cb) {
            this.findById(id, function (err, project) {
                if (err) {
                    return cb(err);
                }
                if (!project) {
                    return cb('Project "' + id + '" not found.');
                }
                var index = project.getVersionIndex(version);
                if (index !== -1) {
                    return cb('Project "' + id + '" already has a version "' + version + '".');
                }
                project.versions.push({
                    version: version,
                    docsUrl: docsUrl,
                    coverageUrl: coverageUrl
                });
                return project.save(cb);
            });
        },

        /**
         * deletes a version from the project
         *
         * @param {string} projectId
         * @param {string} version
         * @param {function} cb
         */
        deleteVersion: function (id, version, cb) {
            this.findById(id, function (err, project) {
                if (err) {
                    return cb(err);
                }
                if (!project) {
                    return cb('Project "' + id + '" not found.');
                }
                var index = project.getVersionIndex(version);
                if (index === -1) {
                    return cb('Project "' + id + '" does not have a version "' + version + '".');
                }
                project.versions.splice(index, 1);
                return project.save(cb);
            });
        },

        /**
         * completely deletes a project
         *
         * @param {string} projectId
         * @param {function} cb
         */
        remove: function (id, cb) {
            this.findById(id, function (err, project) {
                if (err) {
                    return cb(err);
                }
                if (!project) {
                    return cb('Project "' + id + '" not found.');
                }
                return project.remove(cb);
            });
        }

    };

    Project = mongoose.model('Project', ProjectSchema);
};
