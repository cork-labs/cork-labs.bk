module.exports = function(config) {

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;


    // -- models (not a good pattern, use DI instead)

    var User = mongoose.model('User');

    /**
     * schema
     */
    var OAuthState;
    var OAuthStateSchema = new Schema({

        provider: {
            type: String,
            trim: true
        },
        user: {
            type: Schema.ObjectId,
            ref: 'User'
        },
        metadata: {
            flags: [],
            redirectUrl: {
                type: String
            },
            requestedScope: {
                type: String
            },
        },
        accessToken: {
            type: String
        },
        acceptedScope: {
            type: String
        },
        createdDate: {
            type: Date,
            default: Date.now
        },
        error: {
            type: String
        },
    });

    /**
     * validation / provider / required
     */
    OAuthStateSchema.path('provider').required(true, 'required');


    /**
     * methods
     */
    OAuthStateSchema.methods = {

    };

    /**
     * static methods
     */
    OAuthStateSchema.statics = {

        /**
         * find state by id
         *
         * @param {ObjectId} id
         * @param {function(err, data)} cb
         */
        findById: function (id, cb) {
            this.findOne({ _id : id })
                .exec(cb);
        },

        /**
         * creates a user account activation oauth flow
         *
         * @param {string} provider
         * @param {object} metadata
         * @param {string} requestedScope
         * @param {object} metadata
         * @param {function(err, data)} cb
         */
        create: function (provider, metadata, cb) {
            var oAuthState = new OAuthState({
                provider: provider,
                metadata: metadata || {}
            });
            return oAuthState.save(function (err) {
                cb(err, oAuthState);
            });
        }
    };

    OAuthState = mongoose.model('OAuthState', OAuthStateSchema);

    return OAuthState;
};
