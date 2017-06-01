'use strict';

var fs = require('fs');
var gulp = require('gulp');
var path = require('path');
var readJsonSync = require('read-json-sync');

var util = require('./util/util');

var srcFiles =
	'build/resources/main/META-INF/resources/node_modules/**/package.json';

function gulpReplaceBrowserMains(debug) {
	return util.transform(function(file) {
		var pkgDir = path.dirname(file.path);
		var pkgJson = readJsonSync(file.path);

		if (!pkgJson.browser || typeof pkgJson.browser != 'string') {
			return;
		}

		var src = pkgDir + '/' + pkgJson.browser;
		var dest = pkgDir + '/' + pkgJson.main;

		try {
			fs.writeFileSync(
				dest,
				'/* Module replaced with ' +
					pkgJson.browser +
					' by liferay-gulp-packager */\n' +
					fs.readFileSync(src)
			);

			if (debug) {
				console.log(
					'Replacing "main" module of',
					file.path.substring(process.cwd().length),
					'with browser module',
					pkgJson.browser
				);
			}
		} catch (err) {}
	});
}

function replaceBrowserMains(options) {
	var debug = options.debug || false;

	return gulp.src(srcFiles).pipe(gulpReplaceBrowserMains(debug));
}

module.exports = replaceBrowserMains;
