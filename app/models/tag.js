module.exports = function(config) {

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;
    var _ = require('lodash');

    /**
     * constants - fields returned transparently on instance.asObject()
     */
    var AS_OBJECT_PROPERTIES = ['name', 'description', 'projectCount'];

    /**
     * schema
     */
    var Tag;
    var TagSchema = new Schema({

        name: {
            type: String,
            trim: true
        },
        description: {
            type: String,
            trim: true
        },
        projectCount: {
            type: Number,
            default: 0
        },
        createdDate: {
            type: Date,
            default: Date.now
        }
    });


    /**
     * validation / name / required
     */
    TagSchema.path('name').required(true, 'required');


    /**
     * methods
     */
    TagSchema.methods = {

        update: function (data) {
            for (var key in data) {
                if (FIELDS.indexOf(key) !== -1) {
                    this[key] = data[key];
                }
            }
        },

        /**
         * increments the tag project count
         *
         * @param {string} id
         */
        incProjectCount: function (id) {
            this.projectCount++;
        },

        /**
         * decrements the tag project count
         *
         * @param {string} id
         */
        decProjectCount: function (id) {
            if (this.projectCount) {
                this.projectCount--;
            }
        },

        /**
         * @returns {object}
         */
        asObject: function () {
            var ix;
            var property;

            var ret = {
                id: this._id
            };

            for (ix = 0; ix < AS_OBJECT_PROPERTIES.length; ix++) {
                property = AS_OBJECT_PROPERTIES[ix];
                ret[property] = _.clone(this[property]);
            }

            return ret;
        }
    };


    /**
     * static methods
     */
    TagSchema.statics = {

        /**
         * creates a tag
         *
         * @param {string} name
         * @param {string} description
         * @param {function} cb
         */
        create: function (name, description, cb) {
            var tag = new Tag({
                name: name,
                description: description,
            });
            return tag.save(cb);
        },

        /**
         * find tag by id
         *
         * @param {ObjectId} id
         * @param {function(err, data)} cb
         */
        findById: function (id, cb) {
            return this.findOne({ _id : id })
                .exec(cb);
        },

        /**
         * list tags
         *
         * @param {Object} options
         * @param {function(err, data)} cb
         */
        list: function (options, cb) {
            var defaultCriteria = {
                projectCount: {$gt: 1}
            };
            var criteria = options.criteria || defaultCriteria;

            return this.find(criteria)
                .sort({'projectCount': -1})
                .exec(cb);
        },

        /**
         * search tags
         *
         * @param {Object} terms
         * @param {function(err, data)} cb
         */
        search: function (terms, cb) {
            var defaultCriteria = {
                projectCount: {$gt: 1}
            };
            var criteria = {
                name: new RegExp('^' + terms)
            };

            return this.find(criteria)
                .sort({'name': 1})
                .exec(cb);
        },

        /**
         * increments the tag project count
         *
         * @param {string} tagId
         * @param {function} cb
         */
        incProjectCount: function (id, cb) {
            this.findById(id, function (err, tag) {
                if (err) {
                    return cb(err);
                }
                if (!tag) {
                    return cb('Tag "' + id + '" not found.');
                }
                tag.incProjectCount();
                return tag.save(cb);
            });
        },

        /**
         * decrements the tag project count
         *
         * @param {string} tagId
         * @param {function} cb
         */
        decProjectCount: function (id, cb) {
            this.findById(id, function (err, tag) {
                if (err) {
                    return cb(err);
                }
                if (!tag) {
                    return cb('Tag "' + id + '" not found.');
                }
                tag.decProjectCount();
                return tag.save(cb);
            });
        },

        /**
         * completely deletes a tag
         *
         * @param {string} tagId
         * @param {function} cb
         */
        remove: function (id, cb) {
            this.findById(id, function (err, tag) {
                if (err) {
                    return cb(err);
                }
                if (!tag) {
                    return cb('Tag "' + id + '" not found.');
                }
                return tag.remove(cb);
            });
        }
    };

    Tag = mongoose.model('Tag', TagSchema);

    return Tag;
};
