'use strict';

var babel = require('gulp-babel');
var babelPluginTransformEs2015ModulesAmd = require('babel-plugin-transform-es2015-modules-amd');
var babelPresetEs2015 = require('babel-preset-es2015');
var babelPresetReact = require('babel-preset-react');
var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');

var srcFiles = 'src/main/resources/META-INF/resources/**/*.es.js';
var outputDir = 'build/resources/main/META-INF/resources';
var babelOptions = {
	compact: false,
};

function transpileProject(options) {
	var plugins = [babelPluginTransformEs2015ModulesAmd];
	plugins = plugins.concat(babelPresetEs2015.plugins);
	plugins = plugins.concat(babelPresetReact.plugins);
	babelOptions.plugins = plugins;

	return gulp
		.src(srcFiles)
		.pipe(sourcemaps.init())
		.pipe(babel(babelOptions))
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest(outputDir));
}

module.exports = transpileProject;
