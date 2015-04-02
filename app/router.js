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

        // exp.route('/project/:projectId')
        //     .post(ctrls.project.loadProjectById)
        //     .post(ctrls.project.update);

        // exp.route('/project/:projectId')
        //     .delete(ctrls.project.loadProjectById)
        //     .delete(ctrls.project.remove);

    }

};

module.exports = Router;
