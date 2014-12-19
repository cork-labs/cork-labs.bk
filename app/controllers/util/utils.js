var fs = require('fs');
var when = require('when');
var nodefn = require('when/node');

var promiseStat = nodefn.lift(fs.lstat);
var promiseReaddir = nodefn.lift(fs.readdir);

/**
 * @param {array} data
 * @param {function} map
 * @returns {array}
 */
var map = function (data, map) {
    if ('object' !== typeof data) {
        throw 'Invalid arguments for utils.map, Argument #1 should be an object. Is: "' + (typeof data) + '".';
    }
    if ('function' !== typeof map) {
        throw 'Invalid arguments for utils.map. Argument #2 should be a function. Is: "' + (typeof data) + '".';
    }
    var ret = [];
    var length = data.length;
    for (var ix = 0; ix < length; ix++) {
        ret.push(map(data[ix]));
    }
    return ret;
};

/**
 * @param {string} dirName
 * @param {string} dirPattern optional regexp to match directories
 * @param {string} filePattern optional regexp to match files
 * @returns {object} promise
 */
var dirTree = function (dirName, dirPattern, filePattern) {
    return promiseReaddir(dirName).then(function (dirList) {
        var files = [];
        var promises = [];
        dirList.map(function (fileName) {
            promises.push(promiseStat(dirName + '/' + fileName).then(function (stat) {
                var node = {
                    name: fileName
                };
                if (stat.isDirectory() && (!dirPattern || node.name.match(dirPattern))) {
                    node.type = 'dir';
                    files.push(node);
                    return dirTree(dirName + '/' + fileName, dirPattern, filePattern).then(function (children) {
                        node.children = children;
                    });
                }
                else if (stat.isFile() && (!filePattern || node.name.match(filePattern))) {
                    node.type = 'file';
                    return files.push(node);
                }
            }));
        });
        return when.all(promises).then(function () {
            return files;
        });
    });
};

module.exports = {
    map: map,
    dirTree: dirTree
};
