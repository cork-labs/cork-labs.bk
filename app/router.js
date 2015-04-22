var cors = require('../app/controllers/middlewares/cors');
var timeout = require('connect-timeout');
var response = require('./controllers/util/responses');

/**
 * Register routes in express application
 *
 * @param {object} config Configuration data.
 * @param {object} ctrls  controller instances
 */
var Router = function (config, ctrls) {

    /**
     * middleware to
     *
     * see: https://github.com/expressjs/timeout
     */
    function haltOnTimedout(req, res, next){
        if (req.timedout) {
            return response.timeout(res);
        }
        return next();
    }

    /**
     * @param {object} app Instance of Express application.
     */
    this.addRoutes = function(exp) {

        // -- auth

        exp.route('/auth/sign-in')
            .post(ctrls.auth.authorize.isAnonymous)
            .post(ctrls.auth.handle.signIn);

        exp.route('/auth/heartbeat')
            .get(ctrls.auth.handle.heartbeat);

        exp.route('/auth/me')
            .get(ctrls.auth.handle.me);

        exp.route('/auth/sign-out')
            .post(ctrls.auth.handle.signOut);

        // -- oauth

        exp.route('/oauth/:provider/sign-in')
            .post(ctrls.auth.authorize.isAnonymous)
            .post(ctrls.oauth.prepare.setContext)
            .post(ctrls.oauth.prepare.createOAuthState)
            .post(ctrls.oauth.handle.getSignInUrl);

        exp.route('/oauth/:provider/callback/sign-in')
            .get(ctrls.oauth.prepare.setupErrorRedirect)
            .get(ctrls.auth.authorize.isAnonymous)
            .get(ctrls.oauth.prepare.setContext)
            .get(ctrls.oauth.prepare.loadOAuthState)
            .get(ctrls.oauth.prepare.updateOAuthState)
            .get(ctrls.oauth.prepare.loadUserByAccessToken)
            .get(ctrls.oauth.handle.callbackSignIn);

        // -- search

        exp.route('/search')
            .post(ctrls.search.handle.search);

        // -- project

        exp.route('/tag')
            .get(ctrls.tag.handle.list);

        exp.route('/tag/search')
            .post(ctrls.tag.handle.search);

        exp.route('/tag/:tagId')
            .get(cors.all)
            .get(ctrls.tag.prepare.loadTagById)
            .get(ctrls.tag.handle.get);

        exp.route('/tag')
            .post(ctrls.tag.handle.create);

        exp.route('/tag/:tagId')
            .put(ctrls.tag.prepare.loadTagById)
            .put(ctrls.tag.handle.update);

        // -- project

        exp.route('/project')
            .get(ctrls.project.handle.list);

        // exp.route('/project')
        //     .post(ctrls.project.handle.create);

        exp.route('/project/:projectId')
            .get(cors.all)
            .get(ctrls.project.prepare.loadProjectById)
            .get(ctrls.project.handle.get);

        exp.route('/project/:projectId/versions')
            .get(cors.all)
            .get(ctrls.project.prepare.loadProjectById)
            .get(ctrls.project.handle.getProjectVersions);

        exp.route('/project')
            .post(ctrls.project.handle.create);

        exp.route('/project/search')
            .post(ctrls.project.handle.search);

        exp.route('/project/:projectId/build')
            .post(ctrls.project.prepare.loadProjectById)
            .post(timeout(1200000))
            .post(ctrls.project.handle.buildVersion);

        exp.route('/project/:projectId/current-version')
            .post(ctrls.project.prepare.loadProjectById)
            .post(ctrls.project.handle.setCurrentVersion);

        exp.route('/project/:projectId')
            .put(ctrls.project.prepare.loadProjectById)
            .put(ctrls.project.handle.update);

        // exp.route('/project/:projectId')
        //     .delete(ctrls.project.prepare.loadProjectById)
        //     .delete(ctrls.project.handle.remove);

    }

};

module.exports = Router;
