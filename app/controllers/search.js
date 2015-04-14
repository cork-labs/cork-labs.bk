
var response = require('./util/responses');
var utils = require('./util/utils');

var _ = require('lodash');

var DEFAULT_PAGE_SIZE = 20;

// -- util functions

/**
 * @param {object} model
 * @returns {object}
 */
function map(model) {
    var properties = ['name', 'description', 'tags'];
    var property;
    var assets = ['repo', 'docs', 'coverage', 'demo', 'travis'];
    var asset;
    var ix;

    var ret = {
        id: model._id,
        assets: {},
        versions: [],
    };

    for (ix = 0; ix < properties.length; ix++) {
        property = properties[ix];
        ret[property] = _.clone(model[property]);
    }

    for (ix = 0; ix < assets.length; ix++) {
        asset = assets[ix];
        ret.assets[asset] = {
            enabled: model.hasAsset(asset),
            url:  model.getAssetUrl(asset)
        }
    }

    for (ix = 0; ix < model.versions.length; ix++) {
        ret.versions.push({
            version: model.versions[ix].version,
            docsUrl: model.getAssetVersionUrl('docs', model.versions[ix].version),
            coverageUrl: model.getAssetVersionUrl('coverage', model.versions[ix].version),
            date: model.versions[ix].date
        });
    }

    return ret;
};


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
                return response.collectionContinuous(res, utils.map(projects, map), offset, limit, count);
            });
        });
    };
};


module.exports = SearchCtrl;
