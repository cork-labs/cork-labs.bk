var cors = require('../app/controllers/middlewares/cors');

/**
 * Register routes in express application
 *
 * @param {object} config Configuration data.
 */
var Router = function (config, projectCtrl) {

    /**
     * @param {object} app Instance of Express application.
     */
    this.addRoutes = function(exp) {

        // -- project

        exp.route('/project')
            .get(projectCtrl.list);

        // exp.route('/project')
        //     .post(projectCtrl.create);

        exp.route('/project/:projectId')
            .get(cors.all)
            .get(projectCtrl.loadProjectById)
            .get(projectCtrl.get);

        exp.route('/project/:projectId/versions')
            .get(cors.all)
            .get(projectCtrl.loadProjectById)
            .get(projectCtrl.getProjectVersions);

        // exp.route('/project/:projectId')
        //     .post(projectCtrl.loadProjectById)
        //     .post(projectCtrl.update);

        // exp.route('/project/:projectId')
        //     .delete(projectCtrl.loadProjectById)
        //     .delete(projectCtrl.remove);

    }

};

module.exports = Router;
