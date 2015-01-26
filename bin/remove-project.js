var commandLine = require('node-commandline').CommandLine;
var async = require('async');


// -- shell arguments

var args;
var shell = new commandLine('remove-project');
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

    function (next) {
        console.log('Remove project:', args.id);
        models.Project.remove(args.id, next);
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
