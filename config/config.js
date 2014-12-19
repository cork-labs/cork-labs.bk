var path = require('path');
var rootPath = path.normalize(__dirname + '/..');
module.exports = {
    development: {
        app: {
            name: 'Cork-Labs.Bot [dev]',
            url: 'http://bot.cork-labs.local.org:3001/'
        },
        db: {
            connection: 'mongodb://localhost/cork_labs_bot_dev'
        }
    },
    test: {
        app: {
            name: 'Cork-Labs.Bot [test]',
            url: 'http://bot.cork-labs.local.org:3001/'
        },
        db: {
            connection: 'mongodb://localhost/cork_labs_bot_test'
        }
    },
    production: {
        app: {
            name: 'Cork-Labs.Bot',
            url: 'http://bot.cork-labs.org:3001/'
        },
        db: {
            connection: 'mongodb://localhost/cork_labs_bot'
        }
    }
};
