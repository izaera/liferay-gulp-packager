'use strict';

var fs = require('fs');
var gulp = require('gulp');
var readJsonSync = require('read-json-sync');

var util = require('./util/util');

var srcFiles =
	'build/resources/main/META-INF/resources/node_modules/**/package.json';

function gulpRewriteBrowserMains(debug) {
	return util.transform(function(file) {
		var pkgJson = readJsonSync(file.path);

		if (!pkgJson.browser || typeof pkgJson.browser != 'string') {
			return;
		}

		if (debug) {
			console.log(
				'Rewriting "main" entry of',
				file.path.substring(process.cwd().length),
				'to:',
				pkgJson.browser
			);
		}

		pkgJson.main = pkgJson.browser;

		fs.writeFileSync(file.path, JSON.stringify(pkgJson, null, 2));
	});
}

function rewriteBrowserMains(options) {
	var debug = options.debug || false;

	return gulp.src(srcFiles).pipe(gulpRewriteBrowserMains(debug));
}

module.exports = rewriteBrowserMains;
