var commandLine = require('node-commandline').CommandLine;
var async = require('async');


// -- shell arguments

var args;
var shell = new commandLine('add-project-version');
shell.addArgument('id', {type: 'string', required: true});
shell.addArgument('version', {type: 'string', required: true});
shell.addArgument('docsUrl', {type: 'string', required: false});
shell.addArgument('coverageUrl', {type: 'string', required: false});

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
        console.log('Add project version:', args.id, args.version, args.docsUrl, args.coverageUrl);
        models.Project.addVersion(args.id, args.version, args.docsUrl, args.coverageUrl, next);
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
