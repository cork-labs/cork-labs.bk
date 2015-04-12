module.exports = function(config) {

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;
    var crypto = require('crypto');
    var moment = require('moment');


    // @todo configure
    var TOKEN_TTL_ACTIVATION = 0; // forever
    var TOKEN_TTL_RECOVER = 2 * 60 * 60; // 2 hours
    var TOKEN_TTL_CONSUMED = 30 * 60; // 30 minutes

    /**
     * constants - STATUS
     */
    var STATUS = {
        preregistration: 'pre-registration',
        preactivation: 'pre-activation',
        activation: 'activation',
        active: 'active'
    };

    /**
     * constants - STATUS transitions
     */
    var STATUSES_ACTIVATION = [STATUS.preregistration, STATUS.preactivation, STATUS.activation];
    var STATUSES_PREACTIVATION = [STATUS.preactivation, STATUS.activation];
    var STATUSES_NOPASSWORD = STATUSES_ACTIVATION;
    var STATUSES_NONAME = STATUSES_ACTIVATION;
    var STATUSES_RECOVER = [STATUS.preactivation, STATUS.activation, STATUS.active];

    /**
     * constants - token
     */
    var TOKEN_BYTES = 64;

    /**
     * constants - encryption
     */
    var SALT_BYTES = 64;

    /**
     * constants - validation
     */
    var NAME_MINLENGTH = 3;
    var NAME_MAXLENGTH = 50;

    /**
     * constants - ROLE
     */
    var ROLE = {
        admin: 'admin',
        user: 'user'
    };

    /**
     * constants - PROVIDER
     */
    var PROVIDER = {
        local: 'local',
        github: 'github',
        google: 'google',
        twitter: 'twitter'
    };

    /**
     * constants - ACCOUNT
     */
    var ACCOUNT = {
        free: 'free',
        subscription: 'subscription',
        premium: 'premium'
    };

    /**
     * utils - encrypt password
     *
     * @param {String} salt
     * @param {String} plaintext
     * @return {String}
     */
    function encryptPassword(salt, plaintext) {
        if (!plaintext) {
            return '';
        }
        var encrypted;
        try {
            encrypted = crypto.createHmac('sha1', salt).update(plaintext).digest('hex');
            return encrypted;
        }
        catch (err) {
            return '';
        }
    };

    /**
     * utils - generate token
     * @return {String}
     */
    function generateToken() {
        return crypto.randomBytes(TOKEN_BYTES).toString('base64');
    };

    /**
     * check if plain text password + salt encrypt to the stored hashed password
     *
     * @param {String} salt
     * @param {String} plainText
     * @param {String} hashed_password
     * @return {Boolean}
     */
    function authenticate(salt, plainText, hashed_password) {
        return encryptPassword(salt, plainText) === hashed_password;
    };

    /**
     * Make salt
     *
     * @return {String}
     */
    function makeSalt() {
        return crypto.randomBytes(SALT_BYTES).toString('base64');
    };

    /**
     * schema
     */
    var User;
    var UserSchema = new Schema({
        status: {
            type: String,
            enum: {
                values: [STATUS.preregistration, STATUS.preactivation, STATUS.activation, STATUS.active],
                message: 'invalid'
            }
        },
        role: {
           type: String,
           enum: {
               values: [ROLE.admin, ROLE.user],
               message: 'invalid'
           }
        },
        provider: {
            type: String,
            enum: {
                values: [PROVIDER.local, PROVIDER.github, PROVIDER.google, PROVIDER.twitter],
                message: 'invalid'
            }
        },
        account: {
            type: String,
            enum: {
                values: [ACCOUNT.free, ACCOUNT.subscription, ACCOUNT.premium],
                message: 'invalid'
            }
        },
        name: {
            type: String,
            trim: true,
            default: ''
        },
        email: {
            type: String,
            trim: true,
            unique: true,
            default: ''
        },
        pictureURL: {
            type: String,
            trim: true,
            default: '/assets/images/profile-pic.jpg'
        },
        hashed_password: {
            type: String,
            default: ''
        },
        salt: {
            type: String,
            default: ''
        },
        token: {
            value: {
                type: String,
                default: null
            },
            date: {
                type: Date,
                default: null
            },
            ttl: {
                type: Number,
                default: null
            },
            consumedDate: {
                type: Date,
                default: null
            }
        },
        providers: {
            github: {
                state: {},
                data: {
                    user: {},
                    repos: {}
                }
            },
            twitter: {
                state: {},
                data: {}
            },
            google: {
                state: {},
                data: {}
            }
        },
        createdDate: {
            type: Date,
            default: Date.now
        },
        activatedDate: {
            type: Date,
            default: null
        }
    });

    /**
     * virtuals / password
     */
    UserSchema.virtual('password')
        .set(function (password) {
            this._password = password;
            this.salt = makeSalt();
            this.hashed_password = encryptPassword(this.salt, password);
        })
        .get(function () {
            return this._password;
        });

    /**
     * validation / status / required
     */
    UserSchema.path('status').required(true, 'required');

    /**
     * validation / role / required
     */
    UserSchema.path('role').required(true, 'required');

    /**
     * validation / provider / required
     */
    UserSchema.path('provider').required(true, 'error.detail.required');

    /**
     * validation / name / required (only if user is signing up with credentials)
     */
    UserSchema.path('name').validate(function (name) {
        if (STATUSES_NONAME.indexOf(this.status) !== -1 || this.isOauth()) {
            return true;
        }
        return name.length;
    }, 'required');

    /**
     * validation / name / minlength (only if user is signing up with credentials)
     */
    UserSchema.path('name').validate(function (name) {
        if (STATUSES_NONAME.indexOf(this.status) !== -1 || this.isOauth()) {
            return true;
        }
        return name.length >= NAME_MINLENGTH;
    }, 'minlength');


    /**
     * validation / name / maxlength (only if user is signing up with credentials)
     */
    UserSchema.path('name').validate(function (name) {
        if (STATUSES_NONAME.indexOf(this.status) !== -1 || this.isOauth()) {
            return true;
        }
        return name.length <= NAME_MAXLENGTH;
    }, 'maxlength');

    /**
     * validation / email / required (only if user is signing up with credentials)
     */
    UserSchema.path('email').validate(function (email) {
        if (this.isOauth()) {
            return true;
        }
        return email.length;
    }, 'required');

    /**
     * validation / email / unique
     */
    UserSchema.path('email').validate(function (email, fn) {
        //console.log('### model.user.validate.email', email, this.isNew, this.isModified('email'));
        // Check only when it is a new user or when email field is modified
        if (this.isNew || this.isModified('email')) {
            User.find({ email: email }).exec(function (err, users) {
                fn(!err && users.length === 0);
            });
        }
        else {
            fn(true);
        }
    }, 'notunique');

    /**
     * validation / hashed_password / required (only if user is signing up with credentials)
     */
    UserSchema.path('hashed_password').validate(function (hashed_password) {
        if (STATUSES_NOPASSWORD.indexOf(this.status) !== -1 || this.isOauth()) {
            return true;
        }
        return hashed_password.length;
    }, 'required');


    /**
     * methods
     */
    UserSchema.methods = {

        /**
         * @returns {boolean} if token is expired
         */
        isTokenExpired: function () {
            var expires = this.getTokenExpiresDate();
            if (!this.token.date) {
                return true;
            }
            if (expires) {
                return (expires.diff(moment()) < 0);
            }
            return false;
        },

        /**
         * @returns {object} moment of token expiration
         */
        getTokenExpiresDate: function () {
            if (this.token.consumedDate) {
                return moment(this.token.consumedDate).add(moment.duration({'seconds' : TOKEN_TTL_CONSUMED}));
            }
            if (this.token.date && this.token.ttl) {
                return moment(this.token.date).add(moment.duration({'seconds' : this.token.ttl}));
            }
            return null;
        },

        /**
         * resets token properties
         */
        clearToken: function () {
            this.token.value = null;
            this.token.date = null;
            this.token.ttl = null;
            this.token.consumedDate = null;
        },

        /**
         * validation is not required if using OAuth
         * @returns {boolean} if provider is local
         */
        isOauth: function () {
            return (this.provider !== PROVIDER.local);
        },

        /**
         * lists user providers
         * @returns {array}
         */
         getProviders: function () {
            var ret = [];
            var providers = PROVIDER;
            for (var key in providers) {
                var provider = providers[key];
                if ('object' === typeof this.providers[provider]) {
                    ret.push(provider);
                }
            }
            return ret;
         },

        /**
         * checks if a certain provider exists
         * @param {string} provider
         * @returns {boolean}
         */
         hasProvider: function (provider) {
            return this.providers && ('object' === typeof this.providers[provider]) && (null !== this.providers[provider]);
         },

        /**
         * checks if a certain provider has a state
         * @param {string} provider
         * @returns {boolean}
         */
         hasProviderState: function (provider) {
            return this.hasProvider(provider) && ('object' === typeof this.providers[provider].state) && (null !== this.providers[provider].state);
         },

        /**
         * returns the access token for a certain provider, if set
         * @param {string} provider
         * @returns {string|null}
         */
        getProviderToken: function (provider) {
            if (this.hasProviderState(provider)) {
                return this.providers[provider].state.accessToken;
            }
        },

        /**
         * returns the access token for a certain provider, if set
         * @param {string} provider
         * @returns {string|null}
         */
        getProviderScope: function (provider) {
            if (this.hasProviderState(provider)) {
                return this.providers[provider].state.acceptedScope;
            }
        },

        /**
         * returns the date of the access token for a certain provider, if set
         * @param {string} provider
         * @returns {Date|null}
         */
        getProviderDate: function (provider) {
            if (this.hasProviderState(provider)) {
                return this.providers[provider].state.createdDate;
            }
        },

        /**
         * returns the date of the access token for a certain provider, if set
         * @param {string} provider
         * @returns {Date|null}
         */
        hasRepoAccess: function (provider) {
            var scope = this.getProviderScope(PROVIDER.github);
            var scopes = scope ? scope.split(',') : [];
            return scopes.indexOf('public_repo') !== -1 || scopes.indexOf('repo') !== -1;
        },

        /**
         * checks if a certain provider has a stored data
         * @param {string} provider
         * @param {string} attribute (optional)
         * @returns {string|null}
         */
        hasProviderData: function (provider, attribute) {
            var hasData = this.hasProvider(provider) && ('object' === typeof this.providers[provider].data) && (null !== this.providers[provider].data);
            if (attribute) {
                return ('undefined' !== typeof this.providers[provider].data[attribute] && null !== this.providers[provider].data[attribute]);
            }
            return hasData;
        },

        /**
         * returns the stored data for a certain provider, if set
         * @param {string} provider
         * @param {string} attribute (optional)
         * @returns {object|null}
         */
        getProviderData: function (provider, attribute) {
            if (this.hasProviderData(provider)) {
                return attribute ? this.providers[provider].data[attribute] : this.providers[provider].data;
            }
        },

        /**
         * stores arbitrary data for a provider under a given attribute
         * @param {string} provider
         * @param {string} attribute
         * @param {mixed} value
         * @returns {object|null}
         */
        setProviderData: function (provider, attribute, value) {
            if (!this.hasProvider(provider)) {
                this.providers[provider] = {
                    data: {}
                };
            }
            if (!this.hasProviderData(provider)) {
                this.providers[provider].data = {};
            }
            this.providers[provider].data[attribute] = value;
        }
    };

    /**
     * static methods
     */
    UserSchema.statics = {

        /**
         * @constant STATUS
         */
        STATUS: STATUS,

        /**
         * @constant ROLE
         */
        ROLE: ROLE,

        /**
         * @constant PROVIDER
         */
        PROVIDER: PROVIDER,

        /**
         * @constant ACCOUNT
         */
        ACCOUNT: ACCOUNT,

        /**
         * creates a pre-registration user
         *
         * @param {string} email
         * @returns {object} New instance of User
         */
         newPreRegistration: function (email) {
            var user = new User({
                status: STATUS.preregistration,
                role: ROLE.user,
                provider: PROVIDER.local,
                account: ACCOUNT.free,
                email: email
            });
            return user;
         },

        /**
         * find by email and local auth provider, match password
         *
         * @param {string} email
         * @param {string} password
         * @param {function(err, data)} cb
         */
        loginLocal: function (email, password, cb) {
            //console.log('### model.user.loginLocal', 'email:', email);
            return this.findOne({email: email, provider: PROVIDER.local})
                .exec(function (err, user) {
                    if (err) {
                        console.log('### model.user.loginLocal "' + email + '" ERROR:', err, err.stack);
                        return cb(err);
                    }
                    if (!user) {
                        return cb();
                    }
                    if (authenticate(user.salt, password, user.hashed_password)) {
                        return cb(null, user);
                    }
                    return cb();
                });
        },

        /**
         * find user by token
         *
         * @param {string} token
         * @param {function(err, data)} cb
         */
        findByToken: function (token, cb) {
            //console.log('### model.user.findByToken', 'token:', token);
            if (token.length < TOKEN_BYTES) {
                var err = [{
                    property: 'token',
                    message: 'invalid'
                }];
                return cb(err);
            }
            return this.findOne({'token.value': token})
                .exec(cb);
        },

        /**
         * find user by email
         *
         * @param {string} email
         * @param {function(err, data)} cb
         */
        findByEmail: function (email, cb) {
            //console.log('### model.user.findByEmail', 'email:', email);
            return this.findOne({'email': email})
                .exec(cb);
        },

        /**
         * find by oauth token
         *
         * @param {string} provider
         * @param {string} token
         * @param {function(err, data)} cb
         */
        findByOauthToken: function (provider, token, cb) {
            //console.log('### model.user.findByOauthToken', 'provider:', provider, 'token:', token);
            // @todo validate provider
            var criteria = {}
            criteria['providers.' + provider + '.token'] = token
            return this.findOne(criteria)
                .exec(cb);
        },

        /**
         * find user by id
         *
         * @param {ObjectId} id
         * @param {function(err, data)} cb
         */
        findById: function (id, cb) {
            return this.findOne({_id: id})
                .exec(cb);
        },

        /**
         * request activation of a pre-registered user
         *
         * @param {ObjectId} user
         * @param {function(err, data)} cb
         */
        requestActivation: function (user, cb) {
            if (STATUSES_ACTIVATION.indexOf(user.status) === -1) {
                var err = [{
                    property: 'status',
                    message: 'mismatch'
                }];
                return cb(err);
            }
            user.status = STATUS.preactivation;
            user.token.value = generateToken();
            user.token.date = Date.now();
            user.token.ttl = TOKEN_TTL_ACTIVATION;
            user.token.consumedDate = null;
            return user.save(cb);
        },

        /**
         * pre activate a user, changes state, consumes the token
         *
         * @todo trigger offline jobs
         *
         * @param {ObjectId} user
         * @param {function(err, data)} cb
         */
        preActivate: function (user, cb) {
            if (STATUSES_PREACTIVATION.indexOf(user.status) === -1) {
                var err = [{
                    property: 'status',
                    message: 'mismatch'
                }];
                return cb(err);
            }
            if (user.status === STATUS.activation && user.isTokenExpired()) {
                var err = [{
                    property: 'token',
                    message: 'expired'
                }];
                return cb(err);
            }
            if (user.status === STATUS.preactivation) {
                user.status = STATUS.activation;
                user.token.consumedDate = Date.now();
                user.save(cb);
            }
            return cb();
        },

        /**
         * activate a user with local credentials
         *
         * @param {ObjectId} user
         * @param {string} password
         * @param {string} name
         * @param {function(err, data)} cb
         */
        activateLocal: function (user, password, name, cb) {
            if (user.status !== STATUS.activation) {
                var err = [{
                    property: 'status',
                    message: 'mismatch'
                }];
                return cb(err);
            }
            if (user.isTokenExpired()) {
                var err = [{
                    property: 'token',
                    message: 'expired'
                }];
                return cb(user);
            }
            user.password = password;
            user.name = name;
            user.status = STATUS.active;
            user.activatedDate = Date.now();
            user.clearToken();
            return user.save(cb);
        },

        /**
         * request recovery of an existing account
         *
         * @param {ObjectId} user
         * @param {function(err, data)} cb
         */
        requestRecovery: function (user, cb) {
            if (STATUSES_RECOVER.indexOf(user.status) === -1) {
                var err = [{
                    property: 'status',
                    message: 'mismatch'
                }];
                return cb(err);
            }
            user.token.value = generateToken();
            user.token.date = Date.now();
            user.token.ttl = TOKEN_TTL_RECOVER;
            user.token.consumedDate = null;
            return user.save(cb);
        },

        /**
         * pre reset account, consumes the token
         *
         * @param {ObjectId} user
         * @param {function(err, data)} cb
         */
        preReset: function (user, cb) {
            if (user.status !== STATUS.active) {
                var err = [{
                    property: 'status',
                    message: 'mismatch'
                }];
                return cb(err);
            }
            if (user.isTokenExpired()) {
                var err = [{
                    property: 'token',
                    message: 'expired'
                }];
                return cb(err);
            }
            if (user.token.consumedDate === null) {
                user.token.consumedDate = Date.now();
                return user.save(cb);
            }
            return cb();
        },

        /**
         * reset local credentials
         *
         * @param {ObjectId} user
         * @param {string} password
         * @param {function(err, data)} cb
         */
        resetLocal: function (user, password, cb) {
            if (user.status !== STATUS.active) {
                var err = [{
                    property: 'status',
                    message: 'mismatch'
                }];
                return cb(err);
            }
            if (user.isTokenExpired()) {
                var err = [{
                    property: 'token',
                    message: 'expired'
                }];
                return cb(user);
            }
            user.password = password;
            //user.clearToken();
            return user.save(cb);
        },

        /**
         * store/update oauth state (including authorization_token) for a provider
         *
         * @param {Object} user
         * @param {object} oauthState
         * @param {function(err, data)} cb
         */
        updateProviderState: function (user, oauthState, cb) {
            // @todo validate provider
            if (user.status !== STATUS.active) {
                var err = [{
                    property: 'status',
                    message: 'mismatch'
                }];
                return cb(err);
            }
            // initialise providers
            if (!user.providers) {
                user.providers = {};
            }
            // initialise this provider
            if (!user.providers[oauthState.provider]) {
                user.providers[oauthState.provider] = {};
            }
            // update the state
            user.providers[oauthState.provider].state = oauthState;
            return user.save(cb);
        },

        /**
         * set token for a provider
         *
         * @param {Object} user
         * @param {object} oauthState
         * @param {function(err, data)} cb
         */
        updateProviderData: function (user, provider, attribute, value, cb) {
            // @todo validate provider
            if (user.status !== STATUS.active) {
                var err = [{
                    property: 'status',
                    message: 'mismatch'
                }];
                return cb(err);
            }
            // initialise providers
            if (!user.providers) {
                user.providers = {};
            }
            // initialise this provider
            if (!user.providers[provider]) {
                user.providers[provider] = {};
            }
            // initialise this provider data
            if (!user.providers[provider].data) {
                user.providers[provider].data = {};
            }
            // update the data attribute
            user.providers[provider].data[attribute] = value;
            //console.log('provider', provider, 'attribute', attribute, ' > ', user.providers[provider].data);
            return user.save(cb);
        },

        /**
         * list users
         *
         * @param {Object} options
         * @param {function(err, data)} cb
         */
        list: function (options, cb) {
            var criteria = options.criteria || {};
            var page = options.page || 0;
            var pageSize = options.perPage;
            var offset = page * pageSize;

            return this.find(criteria)
                .sort({'createdDate': -1})
                .limit(pageSize)
                .skip(offset)
                .exec(cb);
        }

    };

    User = mongoose.model('User', UserSchema);

    return User;
};
