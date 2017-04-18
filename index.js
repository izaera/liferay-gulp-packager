'use strict';

var copyPackageJson = require('./lib/copy-package-json.js');
var copyPackages = require('./lib/copy-packages.js');
var transpileProject = require('./lib/transpile-project.js');
// var transpilePackages = require('./lib/transpile-packages.js');
// var nameTranspiledModules = require('./lib/name-transpiled-modules.js');
var wrapModules = require('./lib/wrap-modules.js');

function attach(gulp, options) {
	options = options || {};
	var task = options.task || 'default';
	
	gulp.task('lr:copyPackageJson', function(){return copyPackageJson(options)});
	gulp.task('lr:copyPackages', function(){return copyPackages(options)});
	gulp.task('lr:transpileProject', ['lr:copyPackageJson'], function(){return transpileProject(options)});
	// gulp.task('lr:transpilePackages', ['lr:copyPackageJson', 'lr:copyPackages'], function(){return transpilePackages(options)});
	// gulp.task('lr:nameTranspiledModules', ['lr:transpileProject', 'lr:transpilePackages'], function(){return nameTranspiledModules(options)});
	gulp.task('lr:wrapModules', ['lr:copyPackageJson', 'lr:copyPackages'], function(){return wrapModules(options)});

	gulp.task(
		'lr:all', 
		[
			'lr:copyPackageJson', 
			'lr:copyPackages', 
			'lr:transpileProject', 
			// 'lr:transpilePackages',
			// 'lr:nameTranspiledModules',
			'lr:wrapModules', 
		]
	);

	gulp.task(task, ['lr:all']);
}

module.exports = {
	attach: attach
}