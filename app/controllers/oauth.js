
var response = require('./util/responses');


// -- util functions


// -- controller

var OAuthCtrl = function (config, providers, OAuthState, User) {
    var self = this;


    // -- param middlewares

    self.prepare = {};

    /**
     * in case the request ends in an error, app.js redirects to app
     *
     * @populates req.errorRedirect
     */
    self.prepare.setupErrorRedirect = function (req, res, next) {

        req.errorRedirectUrl = config.app.url;

        return next();
    };

    /**
     * configures oauth callback context
     *
     * @expects path in the form /oauth/<provider>/<mode>[/<type>]
     * @expects req.params.provider
     * @populates req.oauthContext
     */
    self.prepare.setContext = function (req, res, next) {
        // ['', 'oauth', 'github', 'sign-in'] OR ['', 'oauth', 'github', 'callback', 'sign-in']
        var parts = req.path.split('/');

        // validate provider
        if (!providers.hasOwnProperty(req.params.provider)) {
            return response.notFound(res);
        }

        req.provider = providers[req.params.provider];
        req.oauthContext = {};
        req.oauthContext.isCallback = parts[3] === 'callback';
        req.oauthContext.flags = req.oauthContext.isCallback ? parts.slice(4) : parts.slice(3);

        if (req.oauthContext.isCallback) {
            req.oauthContext.code = req.provider.extractCallbackCode(req);
        }

        return next();
    };

    /**
     * creates an oauthState
     *
     * @expects req.provider
     * @expects req.params.provider
     * @expects req.oauthContext
     * @populates req.oauthState
     */
    self.prepare.createOAuthState = function (req, res, next) {
        console.log('### controller.oauth.prepare.createOAuthState - query:', req.query);

        return OAuthState.create(req.params.provider, req.oauthContext, function (err, oauthState) {
            if (err) {
                return next(response.getNormalizedError('oauth.error.create-state'));
            }
            req.oauthState = oauthState;
            return next();
        });
    };

    /**
     * loads oauth state by token
     *
     * @expects req.provider
     * @expects req.params.provider
     * @expects req.oauthContext
     * @populates req.oauthState
     */
    self.prepare.loadOAuthState = function (req, res, next) {
        console.log('### controller.oauth.prepare.loadOAuthState - query:', req.query);

        var stateId = req.provider.extractCallbackStateId(req);

        return OAuthState.findById(stateId, function (err, oauthState) {
            if (err) {
                return next(response.getNormalizedError('oauth.error.load-state'));
            }
            if (!oauthState) {
                return next(response.getNormalizedError('oauth.error.load-state', 'invalid state'));
            }
            req.oauthState = oauthState;
            return next();
        });
    };

    /**
     * loads user with a certain provider/accessToken
     *
     * @expects req.provider
     * @expects req.params.provider (requires "accessToken" to be populated)
     * @expects req.oauthState
     * @populates req.user
     */
    self.prepare.loadUserByAccessToken = function (req, res, next) {
        console.log('### controller.oauth.prepare.loadUserByAccessToken');

        return User.findByOauthToken(req.params.provider, req.oauthState.accessToken, function(err, user) {
            if (err) {
                console.log('### controller.oauth.prepare.loadUserByAccessToken "' + req.params.provider + ':' + req.oauthState.accessToken + '" ERROR [findByOauthToken]:', err, err.stack);
                return next(response.getNormalizedError('oauth.error.load-user'));
            }
            req.user = user;
            return next();
        });
    };

    /**
     * update oauth state with access token
     *
     * @expects req.provider
     * @expects req.oauthState (populates "accessToken" and "acceptedScope" OR "error")
     */
    self.prepare.updateOAuthState = function (req, res, next) {
        console.log('### controller.oauth.prepare.updateOAuthState - oauthState:', req.oauthState);

        return req.provider.getAccessToken(req.oauthState, req.oauthContext.code, function (err, data) {
            if (err) {
                req.oauthState.error = 'Error: ' + err;
                return req.oauthState.save(function () {
                    console.log('### controller.oauth.prepare.updateOAuthState "' + req.oauthState._id + '" ERROR [getAccessToken]:', err, err.stack);
                    console.log('ERROR', response.getNormalizedError('oauth.error.update-state', err));
                    return next(response.getNormalizedError('oauth.error.update-state', err));
                });
            }
            req.oauthState.accessToken = data.accessToken;
            req.oauthState.acceptedScope = data.acceptedScope;
            req.oauthState.save(function (err) {
                if (err) {
                    return next(response.getNormalizedError('oauth.error.update-state', 'save'));
                }
                return next();
            })
        });
    };

    /**
     * updates current user token with the provided one
     * only updates if the user authorization_token is not same current oauth state token
     *
     * @expects req.params.provider
     * @expects req.oauthState
     * @expects req.user
     */
    // self.prepare.updateUserToken = function (req, res, next) {
    //     //console.log('### controller.oauth.prepare.updateUserToken', 'req.user', req.user, 'req.oauthState', req.oauthState);

    //     // we already had the token
    //     if (req.user.getProviderToken(req.params.provider) === req.oauthState.accessToken) {
    //         return next();
    //     }

    //     // stores/updates the oath state
    //     return User.updateProviderState(req.user, req.oauthState, function (err) {
    //         if (err) {
    //             console.log('### controller.oauth.prepare.updateUserToken "' + req.oauthState._id + '" ERROR [updateProviderState]:', err, err.stack);
    //             return next(response.getNormalizedError('oauth.error.update-token'));
    //         }
    //         return next();
    //     });
    // };


    // -- validation middlewares

    self.validate = {};


    // -- authorization middlewares

    self.authorize = {};


    // -- route controllers

    self.handle = {};

    /**
     * GET /oauth/:provider/sign-in
     *
     * returns AUuth provider redirection URI for sign-in
     *
     * @expects req.oauthState
     */
    self.handle.getSignInUrl = function (req, res) {

        var callbackUrl = req.provider.getCallbackUrl('/sign-in');
        var redirectUrl = req.provider.getOAuthUrl(req.oauthState, callbackUrl);

        req.oauthState.metadata.callbackUrl = callbackUrl;

        req.oauthState.save(function (err) {
            if (err) {
                return next(response.getNormalizedError('oauth.error.get-sign-in-url', 'save-state'));
            }
            var data = {
                url: redirectUrl
            }
            return response.data(res, data);
        })

    };

    /**
     * GET /oauth/:provider/callback/sign-in
     *
     * handles OAuth provider callback for sign-in
     * - invokes the provider "user" API
     * - looks for this provider user in the User collection
     *   - if user is not found, creates one
     * - sets the session user
     * - responds with a "sign-up" flag allowing the client to act accordingly in case it is a new user
     *
     * @expects req.oauthState with "accessToken"
     */
    self.handle.callbackSignIn = function (req, res, next) {
        console.log('### controller.oauth.handle.callbackSignIn - oauthState:', req.oauthState);

        return req.provider.getUser(req.oauthState.accessToken, function(err, providerUser) {
            if (err) {
                console.log('### controller.oauth.handle.callbackSignIn "' + req.params.provider + ':' + req.oauthState.accessToken + '" ERROR [getUser]:', err, err.stack);
                return next(response.getNormalizedError('oauth.error.callback-sign-in', 'provider.get-user'));
            }
            return User.findByProviderId(req.params.provider, providerUser.id, function(err, user) {
                if (err) {
                    console.log('### controller.oauth.handle.callbackSignIn "' + req.params.provider + ':' + req.oauthState.accessToken + '" ERROR [findByProviderId]:', err, err.stack);
                    return next(response.getNormalizedError('oauth.error.callback-sign-in', 'user.find-by-provider-id'));
                }
                if (user) {
                    req.session.user = user;
                    return response.redirect(res, config.app.url);
                }
                return User.createFromProvider(req.params.provider, providerUser, req.oauthState, function (err, user) {
                    if (err) {
                        console.log('### controller.oauth.handle.callbackSignIn "' + req.params.provider + ':' + req.oauthState.accessToken + '" ERROR: [createFromProvider]', err, err.stack);
                        return next(response.getNormalizedError('oauth.error.callback-sign-in', 'user.create-from-provider'));
                    }
                    req.session.user = user;
                    return response.redirect(res, config.app.url);
                });
            });
        });
    };

    /**
     * @expects req.oauthState
     * @expects req.user (if the token matched an existing user)
     */
    self.handle.gitHubSignIn = function (req, res, next) {

        if (req.oauthState.type !== OAuthState.TYPE.activation) {

        }
    };

};

module.exports = OAuthCtrl;
