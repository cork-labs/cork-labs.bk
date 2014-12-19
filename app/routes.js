/**
 * Controllers
 */
var project = require('../app/controllers/project');
var cors = require('../app/controllers/middlewares/cors');

/**
 * @param {object} app    Instance of Express app.
 * @param {object} config Configuration data.
 */
var addRoutes = function (app, config) {

    // -- project

    app.route('/project')
        .get(project.list);

    // app.route('/project')
    //     .post(project.create);

    app.route('/project/:projectId')
        .get(cors.all)
        .get(project.loadProjectById)
        .get(project.get);

    app.route('/project/:projectId/versions')
        .get(cors.all)
        .get(project.loadProjectById)
        .get(project.getProjectVersions);

    // app.route('/project/:projectId')
    //     .post(project.loadProjectById)
    //     .post(project.update);

    // app.route('/project/:projectId')
    //     .delete(project.loadProjectById)
    //     .delete(project.remove);

};

/**
 * Expose routes
 */
module.exports = {

    addRoutes: addRoutes

};
