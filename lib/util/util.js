'use strict';

var fs = require('fs');
var path = require('path');
var readJsonSync = require('read-json-sync');
var through = require('through2');

var pkgJsonCache = {};

function getPackageJsonPath(file) {
	var dir = path.dirname(file.path);

	while (true) {
		try {
			fs.statSync(dir + '/package.json');
			break;
		} catch (err) {}

		dir = path.dirname(dir);

		if (dir == '/') {
			throw new Error('Cannot find package.json for file: ' + file.path);
		}
	}

	return dir + '/package.json';
}

function getPackageJson(file, ignoreCache = false) {
	var path = getPackageJsonPath(file);

	var pkgJson = pkgJsonCache[path];

	if (pkgJson == null || ignoreCache) {
		pkgJsonCache[path] = pkgJson = readJsonSync(path);
	}

	return pkgJson;
}

function transform(transformer) {
	return through.obj(function(file, enc, callback) {
		if (file.isNull()) {
			return callback(null, file);
		}

		if (file.isStream()) {
			return callback(
				new PluginError(PLUGIN_NAME, 'Streams not supported!'),
				file
			);
		}

		transformer(file);

		return callback(null, file);
	});
}

module.exports = {
	getPackageJsonPath: getPackageJsonPath,
	getPackageJson: getPackageJson,
	transform: transform,
};
