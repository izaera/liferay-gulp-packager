'use strict';

var fs = require('fs');
var gulp = require('gulp');
var path = require('path');
var readJsonSync = require('read-json-sync');

var ast = require('./util/ast');
var util = require('./util/util');

var srcFiles = 'build/resources/main/META-INF/resources/node_modules/**/*.js';
var outputDir = 'build/resources/main/META-INF/resources/node_modules';

function getReplacements(file, browserModules) {
	try {
		var replacements = [];

		ast.visitRequires(file, function(node, parent, argument) {
			var moduleName = argument.value;

			if (!browserModules.hasOwnProperty(moduleName)) {
				if (!browserModules.hasOwnProperty(moduleName + '.js')) {
					return;
				}
			}

			var browserModuleName =
				browserModules[moduleName] || browserModules[moduleName + '.js'];

			if (browserModuleName.endsWith('.js')) {
				browserModuleName = browserModuleName.substring(
					0,
					browserModuleName.length - 3
				);
			}

			if (browserModuleName == false) {
				replacements.push({
					start: parent.range[0],
					end: parent.range[1],
					from: argument.raw,
					to: '{}',
				});
			} else {
				replacements.push({
					start: argument.range[0],
					end: argument.range[1],
					from: argument.raw,
					to: "'" + browserModuleName + "'",
				});
			}
		});

		return replacements;
	} catch (err) {
		return [];
	}
}

function gulpRewriteBrowserRequires(debug) {
	return util.transform(function(file) {
		var pkgJson = util.getPackageJson(file);

		if (!pkgJson.browser || typeof pkgJson.browser == 'string') {
			return;
		}

		var replacements = getReplacements(file, pkgJson.browser);

		if (replacements.length > 0) {
			if (debug) {
				console.log(
					'Rewriting',
					replacements.length,
					'browser requires in:',
					file.path.substring(process.cwd().length)
				);
				console.log(replacements);
			}

			ast.replace(file, replacements);
		}
	});
}

function rewriteBrowserRequires(options) {
	var debug = options.debug || false;

	return gulp
		.src(srcFiles)
		.pipe(gulpRewriteBrowserRequires(debug))
		.pipe(gulp.dest(outputDir));
}

module.exports = rewriteBrowserRequires;