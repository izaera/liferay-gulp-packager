'use strict';

var decomment = require('decomment');
var gulp = require('gulp');
var path = require('path');
var readJsonSync = require('read-json-sync');

var ast = require('./util/ast');
var util = require('./util/util');

var srcFiles = 'build/resources/main/META-INF/resources/node_modules/**/*.js';
var outputDir = 'build/resources/main/META-INF/resources/node_modules';

function sanitize(jsCode) {
	jsCode = jsCode.replace(/^#!.*$/gm, ''); // remove shebang
	jsCode = decomment(jsCode);
	return jsCode;
}

function gulpWrapPackageModule(debug) {
	return util.transform(function(file) {
		var pkgDir = util.getPackageDir(file);
		var pkgJson = util.getPackageJson(file);
		var absFilePath = path.resolve(file.path);
		var moduleName =
			pkgJson.name +
			'@' +
			pkgJson.version +
			'/' +
			absFilePath.substring(pkgDir.length + 1);

		if (moduleName.endsWith('.js')) {
			moduleName = moduleName.substring(0, moduleName.length - 3);
		}

		var str;
		try {
			str = sanitize(String(file.contents));
		} catch (e) {
			throw new Error('Error sanitizing file ' + file.path + ': ' + e);
		}

		var dependencies = [];
		var regex = /require\(([^\)]*)\)/gm;
		var match;
		while ((match = regex.exec(str)) !== null) {
			var dependency = match[1];

			// Remove whitespace
			dependency = dependency.trim();

			// Change double quotes to single
			dependency = dependency.replace(/"/g, "'");

			// Ignore non-literal requires
			if (!dependency.startsWith("'") || !dependency.endsWith("'")) {
				continue;
			}

			// Remove trailing / in module names
			if (dependency[dependency.length - 2] == '/') {
				dependency = dependency.substring(0, dependency.length - 2) + "'";
			}

			dependencies.push(dependency);
		}

		dependencies = dependencies.join(', ');
		if (dependencies.length > 0) {
			dependencies = ', ' + dependencies;
		}

		var header =
			"Liferay.Loader.define('" +
			moduleName +
			"', ['module', 'require'" +
			dependencies +
			'], function (module, require) {\n\n';

		var footer = '\n});';

		if (debug) {
			console.log(
				'Wrapping package module:',
				moduleName,
				'[' + dependencies.replace(/^, /, '') + ']'
			);
		}

		file.contents = new Buffer(header + file.contents + footer);
	});
}

function wrapPackageModules(options) {
	var debug = options.debug || false;

	return gulp
		.src(srcFiles)
		.pipe(gulpWrapPackageModule(debug))
		.pipe(gulp.dest(outputDir));
}

module.exports = wrapPackageModules;
