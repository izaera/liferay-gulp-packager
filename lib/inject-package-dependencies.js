'use strict';

var fs = require('fs');
var gulp = require('gulp');
var path = require('path');
var readJsonSync = require('read-json-sync');

var util = require('./util/util');

var srcDir = 'build/resources/main/META-INF/resources/node_modules';
var srcFiles = srcDir + '/**/package.json';
var outDir = srcDir;

function gulpInjectPackageDependencies(debug, injectedPackageDependencies) {
	return util.transform(function(file) {
		var pkgJson = readJsonSync(file.path);
		var moduleId = pkgJson.name + '@' + pkgJson.version;
		var packageDependency = injectedPackageDependencies[moduleId];

		if (packageDependency) {
			pkgJson.dependencies = pkgJson.dependencies || {};

			Object.keys(packageDependency).forEach(pkgId => {
				pkgJson.dependencies[pkgId] = packageDependency[pkgId];
			});

			if (debug) {
				console.log('Injecting dependencies in module:', moduleId);
				console.log(packageDependency);
			}

			file.contents = new Buffer(JSON.stringify(pkgJson, null, 2));
		}
	});
}

function injectPackageDependencies(options) {
	var debug = options.debug || false;
	var injectedPackageDependencies = options.injectedPackageDependencies || {};

	return gulp
		.src(srcFiles)
		.pipe(gulpInjectPackageDependencies(debug, injectedPackageDependencies))
		.pipe(gulp.dest(outDir));
}

module.exports = injectPackageDependencies;
