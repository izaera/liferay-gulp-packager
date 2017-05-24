'use strict';

var gulp = require('gulp');

var srcFile = './package.json';
var outputDir = 'build/resources/main/META-INF/resources';

function copyPackageJson() {
	return gulp.src(srcFile).pipe(gulp.dest(outputDir));
}

module.exports = copyPackageJson;
