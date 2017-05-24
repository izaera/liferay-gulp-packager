'use strict';

var gulp = require('gulp');
var gulpIgnore = require('gulp-ignore');
var rs = require('replacestream');
var path = require('path');
var readJsonSync = require('read-json-sync');
var through = require('through2');

var srcDir = 'build/resources/main/META-INF/resources';
var srcFiles = srcDir + '/**/*.js';
var outputDir = 'build/resources/main/META-INF/resources';

function gulpNameProjectModule(debug) {
	var pkgDir = path.resolve(srcDir);
	var pkgJson = readJsonSync(pkgDir + '/package.json');
	var search = 'define(';

	return through.obj(function(file, enc, callback) {
		if (file.isNull()) {
			return callback(null, file);
		}

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

		if (debug) {
			console.log('Naming project module:', moduleName);
		}

		var replacement = "Liferay.Loader.define('" + moduleName + "', ";

		if (file.isStream()) {
			file.contents = file.contents.pipe(rs(search, replacement));
		} else if (file.isBuffer()) {
			var chunks = String(file.contents).split(search);
			file.contents = new Buffer(chunks.join(replacement));
		}

		return callback(null, file);
	});
}

function nameProjectModules(options) {
	var debug = options.debug || false;

	return gulp
		.src(srcFiles)
		.pipe(gulpIgnore('node_modules/**/*'))
		.pipe(gulpNameProjectModule(debug))
		.pipe(gulp.dest(outputDir));
}

module.exports = nameProjectModules;
