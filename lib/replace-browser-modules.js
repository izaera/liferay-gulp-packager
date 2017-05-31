'use strict';

var fs = require('fs');
var gulp = require('gulp');
var path = require('path');
var readJsonSync = require('read-json-sync');

var util = require('./util/util');

var srcFiles =
	'build/resources/main/META-INF/resources/node_modules/**/package.json';

function gulpReplaceBrowserModules(debug) {
	return util.transform(function(file) {
		var pkgDir = path.dirname(file.path);
		var pkgJson = readJsonSync(file.path);

		if (!pkgJson.browser || typeof pkgJson.browser == 'string') {
			return;
		}

		var browser = pkgJson.browser;

		Object.keys(browser).forEach(function(from) {
			var to = browser[from];

			if (to == false) {
				return;
			}

			var src = pkgDir + '/' + to;
			var dest = pkgDir + '/' + from;

			try {
				fs.writeFileSync(
					dest,
					'/* Module replaced with ' +
						to +
						' by liferay-gulp-packager */\n' +
						fs.readFileSync(src)
				);

				if (debug) {
					console.log('Replacing module', from, 'with browser module', to);
				}
			} catch (err) {}
		});
	});
}

function replaceBrowserModules(options) {
	var debug = options.debug || false;

	return gulp.src(srcFiles).pipe(gulpReplaceBrowserModules(debug));
}

module.exports = replaceBrowserModules;
