var express = require('express');
var expCompress = require('compression');
var expLogger = require('morgan');
var expBodyParser = require('body-parser');
var expCookieParser = require('cookie-parser');
var expSession = require('express-session');
var mongoStore = require('connect-mongo')(expSession);

var winston = require('winston');

var pkg = require('../package.json');
var domain = require('domain');
var env = process.env.NODE_ENV || 'development';
var response = require('./controllers/util/responses');


var App  = function(exp, config, router) {

    exp.set('showStackError', true);

    // should be placed before express.static
    exp.use(expCompress({
        filter: function (req, res) {
           return /json|text|javascript|css/.test(res.getHeader('Content-Type'))
        },
        level: 9
    }));

    // Logging
    var logFormat;
    switch (env) {
        case 'test':
        case 'development':
            logFormat = 'dev';
            break;
        case 'production':
            logFormat = 'default';
            break;
    }
    if (logFormat) {
        exp.use(expLogger(logFormat));
    }

    // https://github.com/expressjs/domain-middleware
    exp.use(function(req, res, next) {
        var requestDomain = domain.create();
        requestDomain.add(req);
        requestDomain.add(res);
        requestDomain.on('error', next);
        requestDomain.run(next);
    });

    exp.use(expCookieParser());
    exp.use(expBodyParser());
    exp.use(function (req, res, next) {
        if (env === 'development') {
            console.log('---------------------------');
            console.log('  ' + req.method + ' ' + req.path);
            console.log('  params:', req.params);
            console.log('  body', typeof req.body, req.body);
            console.log('---------------------------');
            next();
        }
        else if (env === 'production') {
            // @todo production log
        }
    });

    // expose package.json to views
    exp.use(function (req, res, next) {
        res.locals.pkg = pkg;
        next();
    });

    // express/mongo session storage
    exp.use(expSession({
        secret: pkg.name,
        store: new mongoStore({
            url: config.db.connection,
            collection : 'sessions'
        })
    }));

    // Bootstrap routes
    router.addRoutes(exp);

    // global error handler
    exp.use(function (err, req, res, next) {

        var normalized = response.getNormalizedError(err);
        console.log('!@£$ ERROR: ' + (err.name || normalized.message));
        console.error(normalized);
        if(err.stack) {
            console.error(err.stack);
        }
        if (req.errorRedirectUrl) {
            var msg = normalized.message;
            var redirectUrl = req.errorRedirectUrl + '?msg=' + msg;
            // return response.redirect(res, redirectUrl);
            return response.error(res, normalized);
        }
        else if (err.name === 'ServiceUnavailableError') {
            return response.timeout(res);
        }
        else {
            return response.error(res, normalized);
        }
    })

    // assume 404 since no middleware responded
    exp.use(function (req, res, next) {
        return response.notFound(res);
    });

    exp.locals.pretty = true;

    this.start = function (port) {
        // Start the app by listening on <port>
        exp.listen(port);
        console.log('Express app started on port ' + port);
    };

}

module.exports = App;
