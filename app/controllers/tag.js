
var response = require('./util/responses');
var utils = require('./util/utils');

// -- util functions

/**
 * @param {object} model
 * @returns {object}
 */
function map(model) {
    var ret = {
        id: model._id,
        name: model.name,
        description: model.description,
        projectCount: model.projectCount
    };
    return ret;
};


// -- controller

var TagCtrl = function (config, Tag) {

    // -- param middlewares

    /**
     * loads a tag by id
     *
     * @expects req.params.tagId
     * @populates req.tag
     */
    this.loadTagById = function (req, res, next) {
        var id = req.param('tagId');
        Tag.findById(id, function (err, tag) {
            if (err) {
                return response.error(res, err);
            }
            if (!tag) {
                return response.notFound(res);
            }
            req.tag = tag;
            return next();
        });
    };

    // -- validation middlewares


    // -- route controllers

    /**
     * POST /tag
     *
     * saves a new tag
     */
    this.create = function (req, res) {

        var tag = new Tag(req.body);
        console.log('this.create', tag);
        tag.save(function (err) {
            if (err) {
                console.log(err);
                return response.error(res, err);
            }
            return response.created(res, map(tag));
        });
    };

    /**
     * PUT /tag/:id
     *
     * saves an existing tag
     *
     * @expects req.tag
     */
    this.update = function (req, res) {

        req.tag.update(req.body);
        req.tag.save(function (err) {
            if (err) {
                return response.error(res, err);
            }
            return response.model(res, map(req.tag));
        });
    };

    /**
     * GET /tag
     *
     * list tags
     */
    this.list = function (req, res) {
        var options = {};

        Tag.list(options, function (err, tags) {
            if (err) {
                return response.error(res, err);
            }
            Tag.count().exec(function (err, count) {
                return response.collection(res, utils.map(tags, map), count);
            });
        });
    };

    /**
     * POST /tag/search
     *
     * search tags
     *
     * @expects req.body.terms
     */
    this.search = function (req, res) {
        var terms = req.body.terms;

        Tag.search(terms, function (err, tags) {
            if (err) {
                return response.error(res, err);
            }
            Tag.count().exec(function (err, count) {
                return response.collection(res, utils.map(tags, map), count);
            });
        });
    };

    /**
     * GET /tag/:id
     *
     * load one tag by id
     *
     * @expects req.tag
     */
    this.get = function (req, res) {
        return response.model(res, map(req.tag));
    };

    // -- authorization middlewares

};


module.exports = TagCtrl;
