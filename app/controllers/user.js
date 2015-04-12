
// -- util functions

/**
 * @param {object} model
 * @returns {object}
 */
function map(model) {
    var ret = {
        id: model.id,
        status: model.status,
        role: model.role,
        name: model.name,
        email: model.email,
        createdDate: model.createdDate,
        activatedDate: model.activatedDate
    };
    return ret;
};

/**
 * @todo repeated in controller/auth
 * @param {object} model
 * @returns {object}
 */
function mapMe(model) {
    var ret = {
        id: model._id,
        status: model.status,
        role: model.role,
        provider: model.provider,
        account: model.account,
        name: model.name,
        email: model.email,
        createdDate: model.createdDate,
        activatedDate: model.activatedDate,
        providers: {}
    };

    var providers = model.getProviders();
    for (var ix = 0; ix < providers.length; ix++) {
        var provider = providers[ix];
        if (model.hasProviderState(provider)) {
            ret.providers[provider] = {
                scope: model.getProviderScope(provider),
                date: model.getProviderDate(provider),
                data: model.getProviderData(provider)
            }
        }
    }

    return ret;
};

// -- controller

var UserCtrl = function (config, User, github) {


    // -- param middlewares

    /**
     * loads a user by id
     *
     * @expects req.params.userId
     * @populates req.user
     */
    this.loadUserById = function(req, res, next) {
        var id = req.param('userId');
        User.findById(id, function (err, user) {
            if (err) {
                console.log('### controller.user.loadUserById "' + id + '" ERROR:', err, err.stack);
                return response.error(res, err);
            }
            if (!user) {
                return response.notFound(res);
            }
            req.user = user;
            return next();
        });
    };

    /**
     * loads the session user (if user not loaded yet)
     *
     * @expects req.user will use it if populated
     * @expects req.session.user as a fallback
     * @populates req.user
     */
    this.loadSessionUser = function (req, res, next) {
        // we already had it loading
        if (req.user) {
            return next();
        }
        // we didn't have it yet, let's load the current user
        User.findById(req.session.user._id, function(err, user) {
            if (err) {
                console.log('### controller.user.loadSessionUser "' + req.session.user._id + '" ERROR:', err, err.stack);
                return next('load.user');
            }
            if (!user) {
                return next('load.user');
            }
            // populates it if we need to do extra operations with the object
            req.user = user;
            return next();
        });
    };


    // -- route controllers

    /**
     * updates current user profile data if needed
     *
     * @expects req.oauthState
     * @expects req.user
     * @populates req.user
     */
    this.updateGitHubProfile = function (req, res, next) {
        // skip if user has stored user data before
        if (req.user.hasProviderData(User.PROVIDER.github, 'user')) {
            return next();
        }
        // load me from github API
        var token = req.user.getProviderToken(User.PROVIDER.github);
        github.getMe(token, function (err, me) {
            if (err) {
                console.log('### controller.user.updateGitHubProfile getMe "' + req.user.email + '" ERROR:', err, err.stack);
                return next('github.me');
            }
            // and save it
            User.updateProviderData(req.user, User.PROVIDER.github, 'user', me, function (err) {
                if (err) {
                    console.log('### controller.user.loadSessionUser updateProviderData "' + req.user.email + '" ERROR:', err, err.stack);
                    return next('save.user');
                }
                return next();
            });
        });
    };


    // -- route controllers

    /**
     *  list users
     *
     * @expects req.param.page
     * @expects req.param.limit
     */
    this.list = function (req, res) {
        var page = (req.param('page') > 0 ? req.param('page') : 1) - 1;
        var limit = req.param('limit') > 0 ? req.param('limit') : 30;
        var options = {
            perPage: limit,
            page: page
        };

        User.list(options, function (err, users) {
            if (err) {
                console.log('### controller.user.list ERROR:', err, err.stack);
                return response.error(res, err);
            }
            User.count().exec(function (err, count) {
                return response.models(res, utils.map(users, map), page, limit, count);
            });
        });
    };

    /**
     * load one user by id
     *
     * @expects req.user
     */
    this.getUser = function (req, res) {
        return response.model(res, map(req.user));
    };

    /**
     * update a user
     *
     * @expects req.user
     */
    this.update = function (req, res) {

    };

    /**
     * request activation for a pre-registered user
     *
     * @expects req.user
     * @todo send email
     */
    this.requestActivation = function (req, res) {
        //console.log('### controller.user.requestActivation', 'req.user', req.user);
        User.requestActivation(req.user, function (err) {
            if (err) {
                console.log('### controller.user.requestActivation "' + req.user.email + '" ERROR:', err, err.stack);
                return response.error(res, err);
            }
            return response.noContent(res);
        });
    };

    /**
     * retrieves the user list of repositories, persists this in provider.github.data
     *
     * @expects req.user
     */
    this.refreshRepositories = function (req, res) {
        var token = req.user.getProviderToken(User.PROVIDER.github);
        var gitHubUser = req.user.getProviderData(User.PROVIDER.github, 'user');
        github.getUserRepos(token, gitHubUser.login, function (err, repos) {
            if (err && err.code === 401) {
                return response.unauthorized(res);
            }
            if (err) {
                console.log('### controller.user.refreshRepositories getUserRepos "' + req.user.email + '" ERROR:', err, err.stack);
                return response.error(res, err);
            }
            var data = {
                date: Date.now(),
                items: repos
            };
            User.updateProviderData(req.user, User.PROVIDER.github, 'repos', data, function (err) {
                if (err) {
                    console.log('### controller.user.refreshRepositories updateProviderData "' + req.user.email + '" ERROR:', err, err.stack);
                    return response.error(res, err);
                }
                return response.model(res, mapMe(req.user));
            });
        });
    };

    /**
     * retrieves the branches of a repository
     *
     * @expects req.user
     * @expects req.query.repo
     */
    this.getRepoBranches = function (req, res) {
        var token = req.user.getProviderToken(User.PROVIDER.github);
        var gitHubUser = req.user.getProviderData(User.PROVIDER.github, 'user');
        var repoFullName = req.query.repo;
        var repo = repoFullName.split('/')[1];
        if (!repo) {
            var err = [{
                property: 'repo',
                message: 'required'
            }];
            return response.error(res, err);
        }
        github.getRepoBranches(token, gitHubUser.login, repo, function (err, branches) {
            if (err) {
                console.log('### controller.user.getRepoBranches "' + req.user.email + '" ERROR:', err, err.stack);
                return response.error(res, err);
            }
            var data = branches;
            return response.model(res, branches);
        });
    };

    /**
     * delete a user
     *
     * @expects req.user
     */
    this.remove = function (req, res, id) {
        req.user.remove(function (err){

        });
    };


    // -- authorization middlewares

    this.authorize = {};

    /**
     * is self
     *
     * @expects req.user
     * @expects req.session.user
     */
    this.authorize.isSelf = function (req, res, next) {
        if (req.session.user.id !== req.user.id) {
            return response.unauthorized(res);
        }
        return next();
    };

    /**
     * has linked github account, has ahtorize_token
     *
     * @expects req.user
     */
    this.authorize.hasRepoAccess = function (req, res, next) {
        if (!req.user.hasRepoAccess()) {
            return response.unauthorized(res);
        }
        return next();
    };

}

module.exports = UserCtrl;
