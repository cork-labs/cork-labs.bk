
var response = require('./util/responses');

var DEFAULT_PAGE_SIZE = 20;


// -- util functions


// -- controller

var SearchCtrl = function (config, Project, Tag) {


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
};


module.exports = SearchCtrl;
