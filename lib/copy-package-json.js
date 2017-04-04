'use strict';

var gulp = require('gulp');

function copyPackageJson() {
	return gulp.src('./package.json')
		.pipe(gulp.dest('build/resources/main/META-INF/resources'));
}

module.exports = copyPackageJson;