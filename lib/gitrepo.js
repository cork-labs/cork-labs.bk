var async = require('async');
var when = require('when');
var extend = require('node.extend');
var fs = require('fs');
var path = require('path');
var rimraf = require('rimraf');
var git = require('gift');


/**
 * gift wrapper constructor
 *
 * @param {string} remove
 * @param {string} path
 * @param {string} branch
 */
function GitRepo(remote, path, branch) {

    /**
     * @var {object} gift repo instance
     */
    var gift = git(path);
    var branch = branch;
    var backupBranch;
    var error;

    var logError = function (method, error, stderr) {
        console.log('### gitrepo.' + method + '() [' + remote + ',' + path + ',' + branch + '] ERROR:', error, ' stderr:', stderr);
    };

    var clone = function (cb) {
        // remove directory
        return rimraf(path, function () {
            return git.clone(remote, path, function (err, repo) {
                // replace gift instance
                gift = git(path);
                if (err) {
                    logError('clone', err);
                    return cb(err);
                }
                else if (branch) {
                    return checkout(cb);
                }
                else {
                    cb();
                }
            });
        });
    };

    /**
     * reads config
     *
     * @param {function} cb
     */
    var config = function (cb) {
        return gift.config(function (err, config, stderr) {
            if (err) {
                logError('config', err, stderr);
            }
            return cb(err, config);
        });
    };

    /**
     * reads status
     *
     * @param {function} cb
     */
    var status = function (cb) {
        return gift.status(function (err, status, stderr) {
            if (err) {
                logError('status', err, stderr);
            }
            return cb(err, status);
        });
    };

    /**
     * reads commits
     *
     * @param {string} branch
     * @param {integer} limit
     * @param {function} cb
     */
    var commits = function (branch, limit, cb) {
        return gift.commits(branch, limit, function (err, commits, stderr) {
            if (err) {
                logError('commits [' + branch + ',' + limit + ']', err, stderr);
            }
            return cb(err, commits);
        });
    };

    /**
     * reads diff
     *
     * @param {string} branch
     * @param {function} cb
     */
    var diff = function (branch, cb) {
        var items = [];
        var item;
        var ix;
        return gift.diff(commitA, commitB, function (err, diff) {
            if (err) {
                logError('diff [' + branch + ']', err, stderr);
                return cb(err);
            }
            else {
                for (ix = 0; ix < diff.length; ix++) {
                    item = {
                        a_path: diff[ix].a_path,
                        b_path: diff[ix].b_path,
                        new_file: diff[ix].new_file,
                        renamed_file: diff[ix].renamed_file,
                        deleted_file: diff[ix].deleted_file,
                        diff: diff[ix].diff
                    };
                    items.push(item);
                }
                return cb(null, items);
            }
        });
    };

    /**
     * reads current diff
     *
     * @param {function} cb
     */
    var currentDiff = function (cb) {
        var items = [];
        var item;
        var ix;
        var lines;
        var line;
        var nextLine;
        var diffHeaderRegexp = /^diff --git a\/(.*) b\/(.*)$/;
        var diffStartRegexp = /^@@[\s\-,+0-9]+@@$/;
        var matches;
        var mode;
        return gift.git('diff', {}, [], function (err, stdout, stderr) {
            if (err) {
                logError('currentDiff', err, stderr);
                return cb(err);
            }
            else {
                lines = stdout.split('\n');
                for (ix = 0; ix < lines.length; ix++) {
                    line = lines[ix]
                    nextLine = lines[ix + 1];
                    matches = line.match(diffHeaderRegexp);
                    if (matches) {
                        item = {
                            a_path: matches[1],
                            b_path: matches[2],
                            new_file:  false,
                            renamed_file: false,
                            deleted_file: false
                        };
                        items.push(item);
                        continue;
                    }
                    if (line.match(diffStartRegexp)) {
                        if (item && 'undefined' === typeof item.diff) {
                            item.diff = '';
                        }
                    }
                    if (item && 'undefined' !== typeof item.diff) {
                        item.diff += line + '\n';
                    }
                }
                return cb(null, items);
            }
        });
    };

    /**
     * checkout this branch
     *
     * @param {function} cb
     */
    var checkout = function (cb) {
        return gift.checkout(branch, function (err, stdout, stderr) {
            if (err) {
                logError('checkout', err, stderr);
            }
            return cb(err);
        });
    };


    /**
     * reset --hard
     *
     * @param {function} cb
     */
    var resetHard = function (cb) {
        return gift.git('reset', {}, ['--hard'], function (err, stdout, stderr) {
            if (err) {
                logError('resetHard', err, stderr);
            }
            return cb(err);
        });
    };


    function addFile(name) {
        return function (next) {
            return gift.git('add [' + name + ']', {}, [name], function (err, stdout, stderr) {
                if (err) {
                    logError('addFile', err, stderr);
                }
                return next(err);
            });
        };
    }

    function deleteFile(name) {
        return function (next) {
            return gift.git('rm', {}, ['-f ' + name], function (err, stdout, stderr) {
                if (err) {
                    logError('deleteFile [' + name + ']', err, stderr);
                }
                return next(err);
            });
        };
    }

    /**
     * add files to stage
     *
     * @param {array} files
     * @param {function} cb
     */
    var add = function (files, cb) {
        var series = [];

        if (!files) {
            cb('no files to add/remove');
        }
        gift.status(function (err, status, stderr) {
            if (err) {
                logError('add [' + files.join(',') + ']', err, stderr);
                return cb(err);
            }
            else {
                for (var ix = 0; ix < files.length; ix ++) {
                    if (!status.files.hasOwnProperty(files[ix])) {
                        return cb('file not in repository status: "' + files[ix] + '".');
                    }
                    if (status.files[files[ix]].type === 'D') {
                        series.push(deleteFile(files[ix]));
                    }
                    else {
                        series.push(addFile(files[ix]));
                    }
                }

                return async.series(series, cb);
            }
        });
    };

    /**
     * commit
     *
     * @param {string} message
     * @param {function} cb
     */
    var commit = function (message, cb) {
        return gift.commit(message, function (err, stdout, stderr) {
            if (err) {
                logError('commit', err, stderr);
            }
            return cb(err);
        });
    };

    /**
     * pull
     *
     * @param {function} cb
     */
    var pull = function (cb) {
        return gift.git('pull', {}, [], function (err, stdout, stderr) {
            if (err) {
                logError('pull', err, stderr);
            }
            return cb(err);
        });
    };

    /**
     * push
     *
     * @param {function} cb
     */
    var push = function (cb) {
        return gift.git('push', {}, [], function (err, stdout, stderr) {
            if (err) {
                logError('push', err, stderr);
            }
            return cb(err);
        });
    };

    /**
     * stash, pull, push, stash pop
     *
     * @param {function} cb
     */
    var sync = function (cb) {
        return gift.sync(function (err, stdout, stderr) {
            if (err) {
                logError('sync', err, stderr);
            }
            return cb(err);
        });
    };

    this.clone = clone;
    this.config = config;
    this.status = status;
    this.commits = commits;
    this.diff = diff;
    this.currentDiff = currentDiff;
    this.checkout = checkout;
    this.resetHard = resetHard;
    this.add = add;
    this.commit = commit;
    this.pull = pull;
    this.push = push;
    this.sync = sync;
}


module.exports = {

    GitRepo: GitRepo
}