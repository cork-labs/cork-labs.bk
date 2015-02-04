var request = require('request');
var querystring = require('querystring');

var GitHubApi = require("github");


var Github = function (cfg) {

    var config = cfg;

    function encodeStateId(id) {
        return new Buffer(state._id + '%%' + config.salt).toString('base64');
    }

    function decodeStateId(id) {
        var decode = new Buffer(id, 'base64');
        decode = decode.replare(/%%.*/, '');
        return decode;
    }

    // -- public

    /**
     * Extracts the value of the state param from the OAuth callback
     *
     * @param {object} req Express request object
     * - expects req.query.state
     *
     * @returns {string}
     */
    this.extractCallbackStateId = function (req) {
        return stateId = decodeStateId(req.query.state);
    };

    /**
     * Extracts the value of the code param from the OAuth callback
     *
     * @param {object} req Express request object
     * - expectes req.quqyer.code
     *
     * @returns {string}
     */
    this.extracyCallbackCode = function (req) {
        return req.query.code;
    };


    this.extractUserIdFromUserObj = function (user) {
        return user.id;
    };

    this.getOauthURL = function (oauthState) {
        var url = 'https://github.com/login/oauth/authorize';

        url += '?client_id=' + config.clientId;
        url += '&redirect_uri=' + oauthState.redirectURI;
        url += '&scope=' + oauthState.requestedScope || cfg.defaultScope;
        url += '&state=' + encodeStateId(oauthState._id);

        return url;
    }

    /**
     * Excehanges the code for an access token
     *
     * @param {object} oauthState Contains the redirectURI used to acquire the code.
     * @param {string} code       The temporary code returned by the provider.
     * @param {function(err, token)} cb
     */
    var getAccessToken = function (oauthState, code, cb) {
        var data = {
            'client_id': config.clientId,
            'client_secret': config.clientSecret,
            'code': code,
            'redirect_uri': oauthState.redirectURI,
        };
        var options = {
            url: 'https://github.com/login/oauth/access_token',
            method: 'POST',
            form: data
        };

        request(options, function (err, response, body) {
            if (err) {
                return cb('oauth.fail');
            }
            var data = querystring.parse(body);
            if (!data.access_token) {
                return cb('oauth.error.' + data.error);
            }
            var ret = {
                accessToken: data.access_token
            }
            return cb(null, ret);
        });
    };


    // -- API

    /**
     * @param {string} accessToken
     * @param {function(err, token)} cb
     */
    var getMe = function (accessToken, cb) {

        var github = new GitHubApi({
            version: "3.0.0"
        });
        github.authenticate({
            type: "oauth",
            token: accessToken
        });
        var options = {};
        github.user.get(options, function (err, res) {
            if (err) {
                return cb(err);
            }
            return cb(null, res);
        });
    };

    /**
     * @param {string} accessToken
     * @param {object} user
     * @param {function(err, token)} cb
     */
    var getUserRepos = function (accessToken, user, cb) {

        var github = new GitHubApi({
            version: "3.0.0"
        });
        github.authenticate({
            type: "oauth",
            token: accessToken
        });
        var options = {
            user: user,
            per_page: 100
        };
        github.repos.getAll(options, function (err, res) {
            if (err) {
                return cb(err);
            }
            var repos = []
            var length = res.length;
            for (var ix = 0; ix < length; ix++) {
                var repo = res[ix];
                repos.push({
                    owner: repo.owner.login,
                    description: repo.description,
                    name: repo.full_name,
                    prv: repo.private
                });
            }
            return cb(null, repos);
        });
    };


    /**
     * @param {string} accessToken
     * @param {object} user
     * @param {string} repo
     * @param {function(err, token)} cb
     */
    var getRepoBranches = function (accessToken, user, repo, cb) {

        var github = new GitHubApi({
            version: "3.0.0"
        });
        github.authenticate({
            type: "oauth",
            token: accessToken
        });
        var options = {
            user: user,
            repo: repo,
            per_page: 100
        };
        github.repos.getBranches(options, function (err, res) {
            if (err) {
                return cb(err);
            }
            var branches = []
            var length = res.length;
            for (var ix = 0; ix < length; ix++) {
                var branch = res[ix];
                branches.push({
                    name: branch.name,
                    sha: branch.commit.sha,
                    url: branch.commit.url
                });
            }
            return cb(null, branches);
        });
    };


    /**
     * @param {string} accessToken
     * @param {string} repo
     * @param {object} key
     * @param {function} db
     */
    var addDeployKey = function (accessToken, repo, key, cb) {

        var parts = repo.split('/');
        var user = parts[0];
        var name = parts[1];

        var github = new GitHubApi({
            version: "3.0.0"
        });
        github.authenticate({
            type: "oauth",
            token: accessToken
        });
        var options = {
            user: user,
            repo: name,
            title: key.getName(),
            key: key.pub
        };
        github.repos.createKey(options, function (err, res) {
            // ignore "key is already in use" errors
            try {
                err = JSON.parse(err);
            }
            catch (e) {};
            if (err && err.errors && err.errors[0]) {
                if (err.errors[0].field == 'key' && err.errors[0].message == 'key is already in use') {
                    return cb(null);
                }
            }
            else if (err) {
                return cb(err);
            }
            return cb(null);
        });
    };
};

module.exports = Github;
