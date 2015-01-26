var commandLine = require('node-commandline').CommandLine;
var async = require('async');


// -- shell arguments

var args;
var shell = new commandLine('delete-project-version');
shell.addArgument('id', {type: 'string', required: true});
shell.addArgument('version', {type: 'string', required: true});

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

    function (next) {
        console.log('add version to project:', args.id, args.version);
        models.Project.deleteVersion(args.id, args.version, next);
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
