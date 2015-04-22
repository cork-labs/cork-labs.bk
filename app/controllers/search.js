
var response = require('./util/responses');

var DEFAULT_PAGE_SIZE = 20;


// -- util functions


// -- controller

var SearchCtrl = function (config, Project, Tag) {
    var self = this;


    // -- param middlewares

    self.prepare = {};


    // -- validation middlewares

    self.validate = {};


    // -- authorization middlewares

    self.authorize = {};


    // -- route controllers

    self.handle = {};


    /**
     * POST /search
     *
     * search projects by name (@todo later, and search across content)
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
        Project.search(options, function (err, projects) {
            if (err) {
                return response.error(res, err);
            }
            Project.count().exec(function (err, count) {
                projects = projects.map(function (project) {
                    return project.asObject();
                });
                return response.data(res, projects, response.getCollectionContinuousMeta(offset, limit, count));
            });
        });
    };
};


module.exports = SearchCtrl;
