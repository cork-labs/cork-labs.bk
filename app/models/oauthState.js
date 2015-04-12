module.exports = function(config) {

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;


    // -- models

    var User = mongoose.model('User');


    /**
     * constants - TYPE
     */
    var TYPE = {
        //signin: 'signin',
        activation: 'activation',
        workspace: 'workspace'
    };

    /**
     * schema
     */
    var OAuthState;
    var OAuthStateSchema = new Schema({

        type: {
            type: String,
            enum: {
                values: [/*TYPE.signin, */TYPE.activation, TYPE.workspace],
                message: 'invalid'
            }
        },
        provider: {
            type: String,
            enum: {
                values: [User.PROVIDER.github],
                message: 'invalid'
            }
        },
        redirectURI: {
            type: String
        },
        requestedScope: {
            type: String
        },
        user: {
            type: Schema.ObjectId,
            ref: 'User'
        },
        details: {
        },
        createdDate: {
            type: Date,
            default: Date.now
        },
        error: {
            type: String
        },
        accessToken: {
            type: String
        },
        acceptedScope: {
            type: String
        }
    });

    /**
     * validation / type / required
     */
    OAuthStateSchema.path('type').required(true, 'required');

    /**
     * validation / provider / required
     */
    OAuthStateSchema.path('provider').required(true, 'required');

    /**
     * validation / redirectURI / required
     */
    OAuthStateSchema.path('redirectURI').required(true, 'required');

    /**
     * validation / user / required
     */
    OAuthStateSchema.path('user').required(true, 'required');


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
         * @constant TYPE
         */
        TYPE: TYPE,

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
         * @param {string} redirectURI
         * @param {object} user
         * @param {string} provider
         */
        activateAccount: function (redirectURI, user, provider) {
            var oAuthState = new OAuthState({
                type: TYPE.activation,
                provider: provider,
                redirectURI: redirectURI,
                user: user._id
            });
            oAuthState.save();
            return oAuthState;
        },

        /**
         * creates a github oauth flow to link workspace to repos
         *
         * @param {string} redirectURI
         * @param {object} user
         * @param {object} workspace
         */
        authorizeWorkspace: function (redirectURI, user, workspace) {
            var oAuthState = new OAuthState({
                type: TYPE.workspace,
                provider: User.PROVIDER.github,
                redirectURI: redirectURI,
                requestedScope: 'public_repo',
                user: user._id,
                details: {
                    workspace: workspace._id,
                }
            });
            oAuthState.save();
            return oAuthState;
        }

    };

    OAuthState = mongoose.model('OAuthState', OAuthStateSchema);

    return OAuthState;
};
