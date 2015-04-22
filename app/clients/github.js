var request = require('request');
var querystring = require('querystring');

var GitHubApi = require('github');


var Github = function (config) {

    function encodeStateId(id) {
        return new Buffer(id + '%%' + config.salt).toString('base64');
    }

    function decodeStateId(id) {
        var decode = new Buffer(id, 'base64');
        decode = decode.toString().replace(/%%.*/, '');
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
    this.extractCallbackCode = function (req) {
        return req.query.code;
    };

    /**
     * The user is sent back here with a code after visiting the provider.
     *
     * @param {string} appendPath An optional path to append to the configured redirect url.
     * @returns {string} url
     */
    this.getCallbackUrl = function (appendPath) {
        return config.callbackUrl + (appendPath || '');
    };

    /**
     * User is sent to this Url at the provider service.
     *
     * @param {object} oauthState The object id is used as the auth state.
     * @param {string} callbackUrl The user is sent back here with a code after visiting the provider.
     * @returns {string} url
     */
    this.getOAuthUrl = function (oauthState, callbackUrl) {

        var url = 'https://github.com/login/oauth/authorize';

        url += '?client_id=' + config.clientId;
        url += '&redirect_uri=' + callbackUrl;
        url += '&scope=' + (oauthState.metadata.requestedScope || config.defaultScope);
        url += '&state=' + encodeStateId(oauthState._id);

        return url;
    };

    /**
     * Users can review and revoke their application authorizations from the settings screen within GitHub.
     *
     * @returns {string} url
     */
    this.getReviewUrl = function () {
        return 'https://github.com/settings/connections/applications/' + config.clientId;
    };

    /**
     * Exchanges the code for an access token
     *
     * @param {object} oauthState Contains the "code" and "redirectURI" used to acquire the access token.
     * @param {function(err, token)} cb
     */
    this.getAccessToken = function (oauthState, code, cb) {
        var data = {
            client_id: config.clientId,
            client_secret: config.clientSecret,
            redirect_uri: oauthState.metadata.callbackUrl,
            code: code
        };
        var options = {
            url: 'https://github.com/login/oauth/access_token',
            method: 'POST',
            form: data
        };

        console.log(data, options);

        return request(options, function (err, response, body) {
            if (err) {
                return cb('github.get-access-token.error.request');
            }
            var data = querystring.parse(body);

            if (!data.access_token) {
                return cb('github.get-access-token.provider-error.' + data.error);
            }
            var ret = {
                accessToken: data.access_token,
                acceptedScope: data.scope
            }
            return cb(null, ret);
        });
    };

    // -- API

    /**
     * @param {string} accessToken
     * @param {function(err, token)} cb
     */
    this.getUser = function (accessToken, cb) {

        var github = new GitHubApi({
            version: '3.0.0'
        });
        github.authenticate({
            type: 'oauth',
            token: accessToken
        });
        var options = {};
        return github.user.get(options, function (err, res) {
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
    this.getUserRepos = function (accessToken, user, cb) {

        var github = new GitHubApi({
            version: '3.0.0'
        });
        github.authenticate({
            type: 'oauth',
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
    this.getRepoBranches = function (accessToken, user, repo, cb) {

        var github = new GitHubApi({
            version: '3.0.0'
        });
        github.authenticate({
            type: 'oauth',
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
    this.addDeployKey = function (accessToken, repo, key, cb) {

        var parts = repo.split('/');
        var user = parts[0];
        var name = parts[1];

        var github = new GitHubApi({
            version: '3.0.0'
        });
        github.authenticate({
            type: 'oauth',
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
