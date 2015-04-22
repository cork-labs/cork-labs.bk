/**
 * @param {string|array|object} err A string with the error name, an array of short validation errors, or an object with a mongoose validation error
 * @param {object|string} detailsOrMessage
 * @return (object)
 */
function normalizeError(err, detailsOrMessage) {
    var error = {
        name: 'error.internal',
    };
    if ('object' === typeof detailsOrMessage) {
        error.details = detailsOrMessage;
    }
    else if ('string' === typeof detailsOrMessage) {
        error.message = detailsOrMessage;
    }

    console.log('ERROR', error);

    /**
     * string errors
     */
    if ('string' === typeof err) {
        error.name = err;
    }

    // array errors (short validation errors)
    //
    // [
    //     {
    //         property: 'token',
    //         message: 'invalid'
    //     }
    // ]
    //
    else if ('object' === typeof err && err.hasOwnProperty('length')) {
        error.name = 'error.validation';
        error.msg = error.message;
        for (var ix = 0; ix < err.length; ix++) {
            if (err[ix].hasOwnProperty('property')) {
                error.details[err[ix].property] = err[ix].message;
            }
        }
    }

    // mongoose validation error OR previously normalized errors
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
    else if ('object' === typeof err && (err.hasOwnProperty('name') || err.hasOwnProperty('message') || err.hasOwnProperty('errors'))) {
        // do not override message
        // it might be a previously normalized message
        // or it might have been set via "detailsOrMessage" argument
        error.message = error.message || err.message;
        // mongoose error
        if (err.name === 'ValidationError') {
            error.name = 'error.validation';
        }
        // other errors, make sure it's lowercased
        else if ('string' === typeof err.name && err.name.length) {
            error.name = err.name.toLowerCase();
        }
        // translate error
        if (err.hasOwnProperty('errors')) {
            for (var key in err.errors) {
                if ('string' === typeof err.errors[key]) {
                    error.details[key] = err.errors[key];
                }
                else if ('object' === typeof err.errors[key] && err.errors[key].hasOwnProperty('message')) {
                    error.details[key] = err.errors[key].message;
                }
            }
        }
    }

    return error;
};

var response = {

    // -- meta helpers

    getCollectionMeta: function (total) {
        var meta = {
            pagination: {
                total: total
            }
        };
        return meta;
    },

    getCollectionPagedMeta: function (page, limit, total) {
        var meta = {
            pagination: {
                page: page + 1,
                limit: limit,
                total: total
            }
        };
        return meta;
    },

    getCollectionContinuousMeta: function (offset, limit, total) {
        var meta = {
            pagination: {
                offset: offset,
                limit: limit,
                total: total
            }
        };
        return meta;
    },


    // -- expose

    getNormalizedError: normalizeError,

    // -- responses

    data: function (res, model, meta) {
        var payload = {
            data: model
        };
        if (meta) {
            payload.meta = meta;
        }
        res.json(200, payload);
    },

    created: function (res, data) {
        if (data) {
            var payload = {
                data: data
            };
            res.json(201, payload);
        }
        else {
            res.status(201);
            res.send();
        }
    },

    accepted: function (res, data) {
        if (data) {
            var payload = {
                data: data
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

    error: function (res, err, code, details) {
        var payload = {
            error: normalizeError(err, details)
        };
        if (!code) {
            code = (payload.error.message === 'error.validation') ? 422 : 500;
        }
        res.json(code, payload);
    },

    redirect: function(res, target) {
        res.redirect(target);
    },
}

module.exports = response;
