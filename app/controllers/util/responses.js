/**
 * @param {object} err
 * @return (object)
 */
function normalizeError(err) {
    var payload = {
        error: {
            message: 'error.internal',
            details: {}
        }
    };

    // array errors (short validation errors)
    //
    // [
    //     {
    //         property: 'token',
    //         message: 'invalid'
    //     }
    // ]
    //
    if ('object' === typeof err && err.hasOwnProperty('length')) {
        payload.error.message = 'error.validation';
        for (var ix = 0; ix < err.length; ix++) {
            if (err[ix].hasOwnProperty('property')) {
                payload.error.details[err[ix].property] = err[ix].message;
            }
            if (err[ix].hasOwnProperty('data')) {
                payload.error.data = err[ix].data;
            }
        }
    }
    // mongoose validation error
    //
    // {
    //     message: ...
    //     name: 'ValidationError',
    //     errors: {
    //         email: {
    //             path: '.email.'
    //             message: 'foo bar'
    //         }
    //     }
    // }
    //
    //
    else if ('object' === typeof err && (err.hasOwnProperty('name') || err.hasOwnProperty('errors'))) {
        if (err.name === 'ValidationError') {
            payload.error.message = 'error.validation';
        }
        if (err.hasOwnProperty('errors')) {
            for (var key in err.errors) {
                if ('object' === typeof err.errors[key] && err.errors[key].hasOwnProperty('message')) {
                    payload.error.details[key] = err.errors[key].message;
                }
            }
        }
        else {
            console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
            console.log('ERROR', err);
            console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
        }
    }

    return payload;
};

var response = {

    data: function (res, data) {
        res.json(200, data);
    },

    model: function (res, model, meta) {
        var payload = {
            data: model
        };
        if (meta) {
            payload.meta = meta;
        }
        res.json(200, payload);
    },

    collection: function (res, models, total) {
        var payload = {
            data: models
        }
        if (arguments.length > 2) {
            payload.meta = {
                pagination: {
                    total: total
                }
            };
        }
        res.json(200, payload);
    },

    collectionPaged: function (res, models, page, limit, total) {
        var payload = {
            data: models
        }
        if (arguments.length > 2) {
            payload.meta = {
                pagination: {
                    page: page + 1,
                    limit: limit,
                    total: total
                }
            };
        }
        res.json(200, payload);
    },

    collectionContinuous: function (res, models, offset, limit, total) {
        var payload = {
            data: models
        }
        if (arguments.length > 2) {
            payload.meta = {
                pagination: {
                    offset: offset,
                    limit: limit,
                    total: total
                }
            };
        }
        res.json(200, payload);
    },

    created: function (res, model) {
        if (model) {
            var payload = {
                data: model
            };
            res.json(201, payload);
        }
        else {
            res.status(201);
            res.send();
        }
    },

    accepted: function (res, model) {
        if (model) {
            var payload = {
                data: model
            };
            res.json(202, payload);
        }
        else {
            res.status(202);
            res.send();
        }
    },

    noContent: function (res) {
        res.status(204);
        res.send();
    },

    unauthorized: function (res) {
        res.status(401);
        res.send();
    },

    notFound: function (res) {
        var payload = {
            error: {
                message: 'not.found',
                details: {}
            }
        };
        res.json(404, payload);
    },

    timeout: function (res, err) {
        var payload = {
            error: {
                message: err || 'error.timeout'
            }
        };
        res.json(503, payload);
    },

    error: function (res, err) {
        var payload = normalizeError(err);
        if (payload.error.message === 'error.internal') {
            res.json(500, payload);
        }
        else {
            res.json(422, payload);
        }
    },

    internalError: function (res, err) {
        var payload;
        if ('object' === typeof err) {
            payload = normalizeError(err);
        }
        else {
            payload = {
                error: {
                    message: 'error.internal',
                    details: {}
                }
            };
        }
        res.json(500, payload);
    },

    redirect: function(res, target) {
        res.redirect(target);
    }

}

module.exports = response;
