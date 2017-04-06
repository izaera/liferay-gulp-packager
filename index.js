'use strict';

var copyPackageJson = require('./lib/copy-package-json.js');
var copyPackages = require('./lib/copy-packages.js');
var transpileProject = require('./lib/transpile-project.js');
var transpilePackages = require('./lib/transpile-packages.js');

function attach(gulp, options) {
	options = options || {};
	var task = options.task || 'default';
	
	gulp.task('lr:copyPackageJson', function(){return copyPackageJson(options)});
	gulp.task('lr:copyPackages', function(){return copyPackages(options)});
	gulp.task('lr:transpileProject', function(){return transpileProject(options)});
	gulp.task('lr:transpilePackages', ['lr:copyPackageJson', 'lr:copyPackages'], function(){return transpilePackages(options)});

	gulp.task(
		'lr:all', 
		[
			'lr:copyPackageJson', 
			'lr:copyPackages', 
			'lr:transpileProject', 
			'lr:transpilePackages'
		]
	);

	gulp.task(task, ['lr:all']);
}

module.exports = {
	attach: attach
}