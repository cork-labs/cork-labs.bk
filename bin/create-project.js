var commandLine = require('node-commandline').CommandLine;
var async = require('async');


// -- shell arguments

var args;
var shell = new commandLine('create-project');
shell.addArgument('id', {type: 'string', required: true});
shell.addArgument('name', {type: 'string', required: true});
shell.addArgument('repo', {type: 'string', required: true});
shell.addArgument('path', {type: 'string', required: false});

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
        console.log('Create project:', args.id, args.status, args.name, args.repo, args.path);
        models.Project.create(args.id, args.status, args.name, args.repo, args.path, next);
    }

];

async.series(steps, function (err) {
    if (err) {
        console.error('ERROR!', err);
        process.exit(1);
    }
    else {
        console.log('OK!');
        process.exit();
    }
});
