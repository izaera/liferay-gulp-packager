'use strict';

var gulp = require('gulp');
var babel = require('gulp-babel');
var sourcemaps = require('gulp-sourcemaps');
var babelPluginModules = require('babel-plugin-transform-es2015-modules-amd');

function transpileProject() {
	var srcFiles = 'src/main/resources/META-INF/resources/**/*.es.js';
	var outputDir = 'build/resources/main/META-INF/resources';
	
	// https://github.com/metal/metal-tools-build-amd/blob/master/lib/pipelines/buildAmd.js#L26
	var options = {
		compact: false,
    plugins: [babelPluginModules],
    presets: ['es2015', 'react']
	};

	return gulp.src(srcFiles)
					.pipe(sourcemaps.init())
	        .pipe(babel(options))
					.pipe(sourcemaps.write('.'))
	        .pipe(gulp.dest(outputDir));
}

module.exports = transpileProject;
