
var response = require('./util/responses');
var utils = require('./util/utils');


// -- util functions


// -- controller

var OAuthCtrl = function (config, OauthState, User, Github) {

    // -- param middlewares

    /**
     * loads oauth state by token
     *
     * @expects req.oauth see setupCallbackHandler()
     * @populates req.oauthState
     */
    this.loadOauthStateForGitHub = function (req, res, next) {
        //console.log('### controller.oauth.loadOauthStateForGitHub - query:', req.query);

        switch (req.oauth.provider) {
            case 'github':
                stateId = github.getCallbackStateId(req);
        }

        OauthState.findById(stateId, function (err, oauthState) {
            if (err) {
                console.log('### controller.oauth.loadOauthStateForGitHub "' + stateId + '" ERROR:', err, err.stack);
                return next('state.error');
             }
            if (!oauthState) {
                return next('state.invalid');
            }
            req.oauthState = oauthState;
            return next();
        });
    };

    /**
     * loads user according to req.oauthState.provider and req.oauthState.accessToken
     *
     * @expects req.oauthState.provider
     * @expects req.oauthState.accessToken
     * @populates req.user
     */
    this.loadUserByAccessToken = function (req, res, next) {
        //console.log('### controller.oauth.loadUserByAccessToken');

        User.findByOauthToken(req.oauthState.provider, req.oauthState.accessToken, function(err, user) {
            if (err) {
                console.log('### controller.oauth.loadUserByAccessToken "' + req.oauthState.provider + ':' + req.oauthState.accessToken + '" ERROR:', err, err.stack);
                return next('load.user');
            }
            req.user = user;
            return next();
        });
    };

    /**
     * makes sure that any user that matched the accessToken is the current session user
     *
     * @expects req.session.user.id
     * @expects req.user
     */
    this.checkOauthUnique = function (req, res, next) {
        //console.log('### controller.oauth.checkOauthUnique', 'req.user:', req.user);
        //console.log('### controller.oauth.checkOauthUnique', 'req.session.user:', req.session.user);

        if (req.user && req.user.id !== req.session.user.id) {
            return next('not.unique');
        }
        return next();
    };

    // -- validation middlewares

    // -- other middlewares

    /**
     * updates current user token with the provided one
     * only updates if user authorization_token not same current oauth state token
     *
     * @expects req.oauthState
     * @expects req.user
     */
    this.updateUserToken = function (req, res, next) {
        //console.log('### controller.oauth.updateUserToken', 'req.user', req.user, 'req.oauthState', req.oauthState);

        // we already had the token
        if (req.user.getProviderToken(User.PROVIDER.github) === req.oauthState.accessToken) {
            return next();
        }

        // stores/updates the oath state
        User.updateProviderState(req.user, req.oauthState, function (err) {
            if (err) {
                console.log('### controller.oauth.updateUserToken "' + req.oauthState._id + '" ERROR:', err, err.stack);
                return next('save.oauthState');
            }
            return next();
        });
    };


    // -- route controllers

    /**
     * returns oauth redirection URI
     *
     * @expects req.oauthState
     */
    this.gitHubRedirect = function (req, res) {
        //console.log('### controller.oauth.gitHubRedirect - oauthState:', req.oauthState);

        var data = {
            authURL: github.getOauthURL(req.oauthState.redirectURI, req.oauthState.id)
        }

        return response.model(res, data);
    };

    /**
     * github callback
     *
     * @expects req.query[paramToken] see clients/github getCallbackStateId
     * @expects req.query[paramCode] see clients/github getCallbackStateId
     * @expects req.oauthState
     * @populates req.oauthState.error
     * @populates req.oauthState.acessToken
     * @populates req.oauthState.acceptedScope
     */
    this.gitHubCallback = function (req, res, next) {
        //console.log('### controller.oauth.gitHubCallback - oauthState:', req.oauthState);
        //console.log('### controller.oauth.gitHubCallback - query:', req.query);

        var code = github.getCallbackCode(req);

        github.getAccessToken(req.oauthState.redirectURI, code, function (err, data) {
            if (err) {
                req.oauthState.error = 'Error: ' + err;
                req.oauthState.save(function () {
                    console.log('### controller.oauth.gitHubCallback "' + req.oauthState._id + '" ERROR:', err, err.stack);
                    return next('oauth.error.' + err);
                });
            }
            else {
                req.oauthState.accessToken = data.access_token;
                req.oauthState.acceptedScope = data.scope;
                req.oauthState.save(function (err) {
                    if (err) {
                        return next('state.update');
                    }
                    return next();
                })
            }
        });
    };

    /**
     * @expects req.oauthState
     * @expects req.user (if the token matched an existing user)
     */
    this.gitHubSignIn = function (req, res, next) {

        if (req.oauthState.type !== OauthState.TYPE.activation) {

        }
    };

    // -- authorization middlewares

    // -- error handling middleware

    /**
     * configures error handler for a callback
     *
     * @populates req.oauth
     */
    this.setupCallbackHandler = function (req, res, next) {
        var parts = req.path.split('/');
        req.oauth = {
            provider: parts[2],
            type: parts[5]
        };
        return next();
    };

};

module.exports = OAuthCtrl;
