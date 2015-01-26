var commandLine = require('node-commandline').CommandLine;
var async = require('async');


// -- shell arguments

var args;
var shell = new commandLine('setup');

try {
    args = shell.parse.apply(shell, process.argv);
}
catch (e) {
    console.error(e);
    console.error(shell.toString());
    process.exit(1);
}


// -- bootstrap;

var bootstrap = require('../bootstrap').boot();
var models = bootstrap.models;


// -- tasks

var steps = [

    /**
     * empty collections
     */
    function (next) {
        async.parallel([
            function (next) {
                console.log('empty collection: "Project"');
                models.Project.collection.remove(next);
            }
        ], next);
    },

    /**
     * create project
     */
    function (next) {
        async.parallel([
            function (next) {
                console.log('create project: "Cork Labs Bot"');
                models.Project.create('cork-labs.bot.bk', 'published', 'Cork Labs Bot', '/servers/andre/az/cork-store/cork-labs.bot.bk', 'git@github.com:cork-labs/cork-labs.bot.bk.git', next);
            }
        ], next);
    }

];

async.series(steps, function (err) {
    if (err) {
        console.log('ERROR!', err);
        process.exit(1);
    }
    else {
        console.log('OK!');
        process.exit();
    }
});
