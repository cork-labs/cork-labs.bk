var cors = require('../app/controllers/middlewares/cors');

/**
 * Register routes in express application
 *
 * @param {object} config Configuration data.
 * @param {object} ctrls  controller instances
 */
var Router = function (config, ctrls) {

    /**
     * @param {object} app Instance of Express application.
     */
    this.addRoutes = function(exp) {

        // -- auth

        exp.route('/auth/login')
            .post(ctrls.auth.authorize.isAnonymous)
            .post(ctrls.auth.login);

        exp.route('/auth/heartbeat')
            .get(ctrls.auth.heartbeat);

        exp.route('/auth/me')
            .get(ctrls.auth.authorize.isAuthenticated)
            .get(ctrls.auth.me);

        exp.route('/auth/logout')
            .post(ctrls.auth.logout);

        exp.route('/oauth/github/callback/workspace')
            .get(ctrls.oauth.setupCallbackHandler)
            .get(ctrls.oauth.loadOauthStateForGitHub)
            .get(ctrls.oauth.gitHubCallback)
            .get(ctrls.oauth.loadUserByAccessToken)
            .get(ctrls.oauth.checkOauthUnique)
            .get(ctrls.user.loadSessionUser) // only loads if loadUserByAccessToken() didn't find the session user
            .get(ctrls.oauth.updateUserToken) // only updates if user authorization_token not same current oauth state token
            .get(ctrls.user.updateGitHubProfile); // only updates if user doesn't have github.data.user


        // -- search

        exp.route('/search')
            .post(ctrls.search.search);

        // -- project

        exp.route('/tag')
            .get(ctrls.tag.list);

        exp.route('/tag/search')
            .post(ctrls.tag.search);

        exp.route('/tag/:tagId')
            .get(cors.all)
            .get(ctrls.tag.loadTagById)
            .get(ctrls.tag.get);

        exp.route('/tag')
            .post(ctrls.tag.create);

        exp.route('/tag/:tagId')
            .put(ctrls.tag.loadTagById)
            .put(ctrls.tag.update);

        // -- project

        exp.route('/project')
            .get(ctrls.project.list);

        // exp.route('/project')
        //     .post(ctrls.project.create);

        exp.route('/project/:projectId')
            .get(cors.all)
            .get(ctrls.project.loadProjectById)
            .get(ctrls.project.get);

        exp.route('/project/:projectId/versions')
            .get(cors.all)
            .get(ctrls.project.loadProjectById)
            .get(ctrls.project.getProjectVersions);

        exp.route('/project')
            .post(ctrls.project.create);

        exp.route('/project/:projectId')
            .put(ctrls.project.loadProjectById)
            .put(ctrls.project.update);

        exp.route('/project/search')
            .post(ctrls.project.search);

        // exp.route('/project/:projectId')
        //     .delete(ctrls.project.loadProjectById)
        //     .delete(ctrls.project.remove);

    }

};

module.exports = Router;
