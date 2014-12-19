var commandLine = require('node-commandline').CommandLine;
var async = require('async');
var db = require('../lib/db.js');


// -- shell arguments

var args;
var shell = new commandLine('create-project');
shell.addArgument('id', {type: 'string', required: true});
shell.addArgument('name', {type: 'string', required: true});
shell.addArgument('path', {type: 'string', required: true});

try {
    args = shell.parse.apply(shell, process.argv);
}
catch (e) {
    console.error(e);
    console.error(shell.toString());
    process.exit(1);
}

// -- main

var env = process.env.NODE_ENV || 'development';
var config = require('../config/config')[env];

// configure and connect db
db.configure(config.db);
var models = require('../app/models.js');
db.connect();


// -- tasks

var steps = [

    function (next) {
        console.log('Create project:', args.id, args.status, args.name, args.path, args.repo);
        models.Project.create(args.id, args.status, args.name, args.path, args.repo, next);
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
