module.exports = function(config) {

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;

    var _ = require('lodash');


    /**
     * constants - STATUS
     */
    var STATUS = {
        draft: 'draft',
        published: 'published',
        deleted: 'deleted'
    };

    var FIELDS = ['name', 'description', 'repo'];

    var DEFAULT_PAGE_SIZE = 20;

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
        description: {
            type: String,
            trim: true
        },
        path: {
            type: String,
            trim: true
        },
        assets: {
            repo: {
                enabled: {
                    type: Boolean,
                    default: true
                },
                url: {
                    type: String,
                    trim: true
                }
            },
            docs: {
                enabled: {
                    type: Boolean,
                    default: true
                },
                url: {
                    type: String,
                    trim: true
                }
            },
            demo: {
                enabled: {
                    type: Boolean,
                    default: true
                },
                url: {
                    type: String,
                    trim: true
                }
            },
            coverage: {
                enabled: {
                    type: Boolean,
                    default: true
                },
                url: {
                    type: String,
                    trim: true
                }
            },
            travis: {
                enabled: {
                    type: Boolean,
                    default: true
                },
                url: {
                    type: String,
                    trim: true
                }
            },
        },
        tags: [{
            type: Schema.ObjectId,
            ref: 'Tag'
        }],
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
     * methods
     */
    ProjectSchema.methods = {

        update: function (data, cb) {
            var key;
            for (key in data) {
                if (FIELDS.indexOf(key) !== -1) {
                    this[key] = data[key];
                }
            }

            var asset;
            var enabled;
            var url;
            for (asset in data.assets) {
                enabled = !!data.assets[asset].enabled;
                url = data.assets[asset].url;
                url = (enabled && !this.isDefaultAssetUrl(url, asset)) ? url : null;
                this.assets[asset] = {
                    enabled: enabled,
                    url: url
                }
            }

            var newTags = [];
            var removedTags;
            var originalTags;
            var ix;
            var tag;
            var newTag;
            var tagIx;
            if (data.tags) {
                originalTags = _.clone(this.tags);
                for (ix = 0; ix < data.tags.length; ix++) {
                    tag = data.tags[ix];
                    // this is a new tag
                    if (!this.hasTagId(tag.id)) {
                        newTag = {
                            id: tag.id,
                            name: tag.name
                        };
                        newTags.push(newTag);
                        this.tags.push(tag.id);
                    }
                    // this is a known tag
                    else {
                        // remove this tag from the list of original tags
                        originalTags = originalTags.filter(function (originalTag) {
                            return originalTag.id !== tag.id
                        });
                    }
                }
                // original tags that were not found
                removedTags = originalTags;
                for (ix = 0; ix < removedTags.length; ix++) {
                    tagIx = this.getTagIndex(removedTags[ix].id);
                    if (tagIx !== -1) {
                        this.tags.splice(tagIx, 1);
                    }
                }
            }
            else {
                removedTags = [];
            }
            cb(newTags, removedTags);
        },

        getPath: function () {
            if (this.path) {
                return this.path;
            }
            else {
                return config.basePath + '/' + this._id;
            }
        },

        getVersionIndex: function (version) {
            if (!version) {
                return this.versions.length ? this.versions.length - 1 : -1;
            }
            for (var ix = 0; ix < this.versions.length; ix++) {
                if (this.versions[ix].version === version) {
                    return ix;
                }
            }
            return -1;
        },

        hasAsset: function (asset) {
            return this.assets && this.assets[asset] && !!this.assets[asset].enabled;
        },

        interpolateAssetUrl: function(asset, version) {
            switch (asset) {
                case 'repo':
                    return 'https://github.com/' + config.githubUser + '/' + this.id;
                case 'travis':
                    return 'https://travis-ci.org/' + config.travisUser + '/' + this.id;
                case 'demo':
                    return config.baseUrl + '/' + this._id + '/' + version + '/docs/#/demos';
                default:
                    return config.baseUrl + '/' + this._id + '/' + version + '/' + asset;
            }
        },

        isDefaultAssetUrl: function (url, asset) {
            return url === this.interpolateAssetUrl(asset, 'current');
        },

        getAssetUrl: function (asset) {
            if (this.hasAsset(asset)) {
                return this.assets[asset].url || this.interpolateAssetUrl(asset, 'current');
            }
        },

        getAssetVersionUrl: function (asset, version) {
            var path = asset;
            var urlProperty = asset + 'Url';

            // for a specific version
            var ix = version ? this.getVersionIndex(version) : -1;
            if (ix !== -1) {
                if (this.versions[ix][urlProperty]) {
                    return this.versions[ix][urlProperty];
                }
                else if (this.hasAsset(asset)) {
                    if (ix === this.versions.length - 1) {
                        version = 'current';
                    }
                    return this.interpolateAssetUrl(asset, version);
                }
            }
        },

        getTagIndex: function (tagId) {
            for (var ix = 0; ix < this.tags.length; ix++) {
                if (this.tags[ix].id === tagId) {
                    return ix;
                }
            }
            return -1;
        },

        hasTagId: function (tagId) {
            return this.getTagIndex(tagId) !== -1;
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
            return project.save(cb);
        },

        /**
         * find project by id
         *
         * @param {ObjectId} id
         * @param {function(err, data)} cb
         */
        findById: function (id, cb) {
            return this.findOne({ _id : id })
                .populate('tags')
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
            var criteria = _.merge(defaultCriteria, options.criteria);
            var page = options.page;
            var pageSize = options.perPage || DEFAULT_PAGE_SIZE;
            var offset = page * pageSize;

            return this.find(criteria)
                .populate('tags')
                .sort({'name': 1})
                .limit(pageSize)
                .skip(offset)
                .exec(cb);
        },

        /**
         * serach projects
         *
         * @param {Object} options
         * @param {function(err, data)} cb
         */
        search: function (options, cb) {
            var criteria = {};
            var offset = options.offset || 0
            var pageSize = options.pageSize || DEFAULT_PAGE_SIZE;
            var offset = options.offset;
            var tags;
            var ix;
            if (options.terms) {
                criteria['$or'] = [
                    {name: new RegExp(options.terms)},
                    {description: new RegExp(options.terms)}
                ];
            }
            if (options.tags && options.tags.length) {
                tags = [];
                criteria['tags'] = {$all : [] };
                for (ix = 0; ix < options.tags.length; ix ++) {
                    criteria['tags']['$all'].push(options.tags[ix].id);
                }
            }

            console.log('criteria', criteria);

            return this.find(criteria)
                .populate('tags')
                .sort({'name': 1})
                .limit(pageSize)
                .skip(offset)
                .exec(function (err, projects) {
                    console.log(projects);
                    cb(err, projects);
                });
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

    return Project;
};
