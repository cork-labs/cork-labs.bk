
var response = require('./util/responses');
var utils = require('./util/utils');

var _ = require('lodash');

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
     */
    this.search = function (req, res) {
        var options = {
            terms: req.body.terms,
            tags: req.body.tags
        };
        Project.search(options, function (err, projects) {
            if (err) {
                return response.error(res, err);
            }
            Project.count().exec(function (err, count) {
                return response.models(res, utils.map(projects, map), page, limit, count);
            });
        });
    };
};


module.exports = SearchCtrl;
