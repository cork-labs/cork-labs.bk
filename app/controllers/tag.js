
var response = require('./util/responses');

// -- util functions


// -- controller

var TagCtrl = function (config, Tag) {
    var self = this;


    // -- param middlewares

    self.prepare = {};

    /**
     * loads a tag by id
     *
     * @expects req.params.tagId
     * @populates req.tag
     */
    self.prepare.loadTagById = function (req, res, next) {
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

    self.validate = {};


    // -- authorization middlewares

    self.authorize = {};


    // -- route controllers

    self.handle = {};

    /**
     * POST /tag
     *
     * saves a new tag
     */
    self.handle.create = function (req, res) {

        var tag = new Tag(req.body);
        console.log('this.create', tag);
        tag.save(function (err) {
            if (err) {
                console.log(err);
                return response.error(res, err);
            }
            return response.created(res, tag.asObject());
        });
    };

    /**
     * PUT /tag/:id
     *
     * saves an existing tag
     *
     * @expects req.tag
     */
    self.handle.update = function (req, res) {

        req.tag.update(req.body);
        req.tag.save(function (err) {
            if (err) {
                return response.error(res, err);
            }
            return response.data(res, req.tag.asObject());
        });
    };

    /**
     * GET /tag
     *
     * list tags
     */
    self.handle.list = function (req, res) {
        var options = {};

        Tag.list(options, function (err, tags) {
            if (err) {
                return response.error(res, err);
            }
            Tag.count().exec(function (err, count) {
                tags = tags.map(function (tag) {
                    return tag.asObject();
                });
                return response.data(res, tags, response.getCollectionMeta(count));
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
    self.handle.search = function (req, res) {
        var terms = req.body.terms;

        Tag.search(terms, function (err, tags) {
            if (err) {
                return response.error(res, err);
            }
            Tag.count().exec(function (err, count) {
                tags = tags.map(function (tag) {
                    return tag.asObject();
                });
                return response.data(res, tags, response.getCollectionMeta(count));
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
    self.handle.get = function (req, res) {
        return response.data(res, req.tag.asObject());
    };

};


module.exports = TagCtrl;
