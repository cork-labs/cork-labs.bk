
var response = require('./util/responses');


// -- util functions


// -- controller

var AuthCtrl = function (config, User) {
    var self = this;


    // -- param middlewares

    self.prepare = {};

    /**
     * loads a user by token
     *
     * @expects req.body.token
     * @populates req.user
     * @todo validate
     */
    self.prepare.loadUserByToken = function (req, res, next) {
        var token = req.body.token;
        User.findByToken(token, function (err, user) {
            if (err) {
                console.log('### controller.auth.loadUserByToken "' + req.body.token + '" ERROR:', err, err.stack);
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
     * loads a user by email
     *
     * @expects req.body.email
     * @populates req.user
     * @todo validate
     */
    self.prepare.loadUserByEmail = function (req, res, next) {
        var email = req.body.email;
        User.findByEmail(email, function (err, user) {
            if (err) {
                console.log('### controller.auth.loadUserByEmail "' + req.body.email + '" ERROR:', err, err.stack);
                return response.error(res, err);
            }
            if (!user) {
                return response.notFound(res);
            }
            req.user = user;
            return next();
        });
    };


    // -- validation middlewares

    self.validate = {};


    // -- authorization middlewares

    self.authorize = {};

    /**
     * requires user to NOT be authenticated
     *
     * @expects NOT req.session.user
     */
    self.authorize.isAnonymous = function (req, res, next) {
        if (req.session.user) {
            console.log('$$$ authorize.isAnonymous', 'not anonymous');
            return response.unauthorized(res);
        }
        return next();
    };

    /**
     * requires user to be authenticated
     *
     * @expects req.session.user
     */
    self.authorize.isAuthenticated = function (req, res, next) {
        if (!req.session.user) {
            console.log('$$$ authorize.isAuthenticated', 'not authenticated');
            return response.unauthorized(res);
        }
        return next();
    };

    /**
     * requires user to have admin role
     *
     * @expects req.session.user
     */
    self.authorize.isAdmin = function (req, res, next) {
        if (!req.session.user) {
            console.log('$$$ authorize.isAdmin', 'not authenticated');
            return response.unauthorized(res);
        }
        if (req.session.user.role !== User.ROLE.admin) {
            console.log('$$$ authorize.isAdmin', 'not an admin');
            return response.unauthorized(res);
        }
        return next();
    };

    /**
     * requires user to have admin role
     *
     * @expects req.session.user
     */
    self.authorize.isSelfOrAdmin = function (req, res, next) {
        if (!req.session.user) {
            console.log('$$$ authorize.isSelfOrAdmin', 'not authenticated');
            return response.unauthorized(res);
        }
        if (req.session.user.role !== User.ROLE.admin && req.session.user !== req.user) {
            console.log('$$$ authorize.isSelfOrAdmin', 'not an admin AND not self');
            return response.unauthorized(res);
        }
        return next();
    };


    // -- route controllers

    self.handle = {};

    /**
     * pre-register user
     *
     * @expects req.body.email
     */
    self.handle.preRegister = function (req, res) {
        var user = User.newPreRegistration(req.body.email);
        user.save(function (err) {
            if (err) {
                console.log('### controller.auth.preRegister "' + req.body.email + '" ERROR:', err, err.stack);
                return response.error(res, err);
            }
            return response.created(res);
        });
    };

    /**
     * check if the user can be activated, consumes the token, changes state to preactivation
     *
     * @expects req.user
     */
    self.handle.preActivate = function (req, res) {
        User.preActivate(req.user, function (err) {
            if (err) {
                console.log('### controller.auth.preActivate "' + req.user.email + '" ERROR:', err, err.stack);
                return response.error(res, err);
            }
            var data = {
                'email': req.user.email,
                'expires': req.user.getTokenExpiresDate()
            };
            return response.data(res, data);
        });
    };

    /**
     * activates user account with local credentials, signs in
     *
     * @expects req.user
     * @expects req.body.password
     * @expects req.body.name
     * @todo validate
     */
    self.handle.activateLocal = function (req, res) {
        User.activateLocal(req.user, req.body.password, req.body.name, function (err) {
            if (err) {
                console.log('### controller.auth.activateLocal "' + req.user.email + '" ERROR:', err, err.stack);
                return response.error(res, err);
            }
            req.session.user = req.user;
            return response.created(res);
        });
    };

    /**
     * request an account recovery email
     *
     * @expects req.user
     */
    self.handle.requestRecovery = function (req, res) {
        User.requestRecovery(req.user, function (err) {
            if (err) {
                console.log('### controller.auth.requestRecovery "' + req.user.email + '" ERROR:', err, err.stack);
                return response.error(res, err);
            }
            return response.noContent(res);
        });
    };

    /**
     * check if the user can reset, consumes the token
     *
     * @expects req.user
     */
    self.handle.preReset = function (req, res) {
        User.preReset(req.user, function (err) {
            if (err) {
                console.log('### controller.auth.preReset "' + req.user.email + '" ERROR:', err, err.stack);
                return response.error(res, err);
            }
            var data = {
                'email': req.user.email,
                'expires': req.user.getTokenExpiresDate()
            };
            return response.data(res, data);
        });
    };

    /**
     * resets user account with local credentials, signs in
     *
     * @expects req.user
     * @expects req.body.password
     */
    self.handle.resetLocal = function (req, res) {
        User.resetLocal(req.user, req.body.password, function (err) {
            if (err) {
                console.log('### controller.auth.resetLocal "' + req.user.email + '" ERROR:', err, err.stack);
                return response.error(res, err);
            }
            req.session.user = req.user;
            return response.noContent(res);
        });
    };

    /**
     * session signIn - local credentials
     *
     * @expects req.body.email
     * @expects req.body.password
     */
    self.handle.signIn = function(req, res, next) {
        User.signInLocal(req.body.email, req.body.password, function (err, user) {
            if (err) {
                console.log('### controller.auth.signIn "' + req.body.email + '" ERROR:', err, err.stack);
                return response.error(res, err);
            }
            if (user) {
                req.session.user = user;
                return response.noContent(res);
            }
            return next();
        });
    };

    /**
     * session heartbeat
     *
     * @expects req.session.user
     */
    self.handle.heartbeat = function(req, res) {
        if (req.session.user) {
            return response.noContent(res);
        }
        return response.unauthorized(res);
    };

    /**
     * session user record
     *
     * @expects req.session.user
     */
    self.handle.me = function(req, res) {
        if (!req.session.user) {
            var anonymous = {
                name: 'stranger'
            };
            return response.data(res, anonymous);
        }
        return User.findById(req.session.user._id, function(err, user) {
            if (err) {
                console.log('### controller.auth.me "' + req.session.user.email + '" ERROR:', err, err.stack);
                return response.unauthorized(res);
            }
            if (!user) {
                return response.unauthorized(res);
            }
            return response.data(res, user.asPrivateObject());
        });
    };

    /**
     * session signOut
     *
     * @expects req.session.user
     */
    self.handle.signOut = function(req, res) {
        if (!req.session.user) {
            return response.noContent(res);
        }
        req.session.destroy(function (err) {
            if (err) {
                console.log('### controller.auth.signOut ERROR:', err, err.stack);
            }
            // @todo should be return response.noContent(res); but req.session.destroy() is causing headers to be sent
            // and is sending a 204 anyway
            return response.noContent(res);
        });
    };
}

module.exports = AuthCtrl;
