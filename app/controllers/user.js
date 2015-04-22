
// -- util functions


// -- controller

var UserCtrl = function (config, User, github) {
    var self = this;


    // -- param middlewares

    self.prepare = {};

    /**
     * loads a user by id
     *
     * @expects req.params.userId
     * @populates req.user
     */
    self.prepare.loadUserById = function(req, res, next) {
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
    self.prepare.loadSessionUser = function (req, res, next) {
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


    // -- validation middlewares

    self.validate = {};


    // -- authorization middlewares

    self.authorize = {};

    /**
     * is self
     *
     * @expects req.user
     * @expects req.session.user
     */
    self.authorize.isSelf = function (req, res, next) {
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
    self.authorize.hasRepoAccess = function (req, res, next) {
        if (!req.user.hasRepoAccess()) {
            return response.unauthorized(res);
        }
        return next();
    };


    // -- route controllers

    self.handle = {};

    /**
     *  list users
     *
     * @expects req.param.page
     * @expects req.param.limit
     */
    self.handle.list = function (req, res) {
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
                users = users.map(function (user) {
                    return user.asObject();
                });
                return response.data(res, users, response.getCollectionPagedMeta(page, limit, count));
            });
        });
    };

    /**
     * load one user by id
     *
     * @expects req.user
     */
    self.handle.getUser = function (req, res) {
        return response.data(res, map(req.user));
    };

    /**
     * update a user
     *
     * @expects req.user
     */
    self.handle.update = function (req, res) {

    };

    /**
     * delete a user
     *
     * @expects req.user
     */
    self.handle.remove = function (req, res, id) {
        req.user.remove(function (err){

        });
    };

}

module.exports = UserCtrl;
