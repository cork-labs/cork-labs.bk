var commandLine = require('node-commandline').CommandLine;
var async = require('async');


// -- shell arguments

var args;
var shell = new commandLine('make-admin');
shell.addArgument('id', {type: 'string', required: true});

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
     * make admin
     */
    function (next) {
        async.parallel([
            function (next) {
                console.log('make admin: "' + args.id + '"');
                models.User.findById(args.id, function (err, user) {
                    if (err) { 
                        next(err); 
                    }
                    else {
                        user.roles.push('admin');
                        user.save(next);
                    }
                });
            }
        ], next);
    },
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

