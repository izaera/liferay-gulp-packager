'use strict';

var fs = require('fs');
var gulp = require('gulp');
var path = require('path');
var readJsonSync = require('read-json-sync');

var ast = require('./util/ast');
var util = require('./util/util');

var srcFiles = 'build/resources/main/META-INF/resources/node_modules/**/*.js';
var outputDir = 'build/resources/main/META-INF/resources/node_modules';

function getReplacements(file) {
	try {
		var replacements = [];

		ast.visitRequires(file, function(node, parent, argument) {
			var moduleName = argument.value;

			if (moduleName.endsWith('.js')) {
				moduleName = moduleName.substring(0, moduleName.length - 3);
			}

			if (moduleName.endsWith('/')) {
				moduleName = moduleName.substring(0, moduleName.length - 1);
			}

			if (moduleName != argument.value) {
				replacements.push({
					start: argument.range[0],
					end: argument.range[1],
					from: argument.raw,
					to: "'" + moduleName + "'",
				});
			}
		});

		return replacements;
	} catch (err) {
		return [];
	}
}

function gulpNormalizeRequires(debug) {
	return util.transform(function(file) {
		var replacements = getReplacements(file);

		if (replacements.length > 0) {
			if (debug) {
				console.log(
					'Normalizing',
					replacements.length,
					'requires in:',
					file.path.substring(process.cwd().length)
				);
				console.log(replacements);
			}

			ast.replace(file, replacements);
		}
	});
}

function normalizeRequires(options) {
	var debug = options.debug || false;

	return gulp
		.src(srcFiles)
		.pipe(gulpNormalizeRequires(debug))
		.pipe(gulp.dest(outputDir));
}

module.exports = normalizeRequires;
