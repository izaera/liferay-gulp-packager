'use strict';

var gulp = require('gulp');
var gulpIgnore = require('gulp-ignore');
var babel = require('gulp-babel');
var sourcemaps = require('gulp-sourcemaps');
var babelPluginModules = require('babel-plugin-transform-es2015-modules-amd');

function transpilePackages() {
	// https://github.com/metal/metal-tools-build-amd/blob/master/lib/pipelines/buildAmd.js#L26
	var options = {
		compact: false,
    plugins: [babelPluginModules],
		presets: ['es2015', 'react']
	};

	var srcFiles = './build/resources/main/META-INF/resources/node_modules/**/*.js';
	var outputDir = './build/resources/main/META-INF/resources/node_modules';

	return gulp.src(srcFiles)
		.pipe(sourcemaps.init())
		.pipe(babel(options))
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest(outputDir));
}

module.exports = transpilePackages;
