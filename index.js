'use strict';

var copyPackageJson = require('./lib/copy-package-json.js');
var transpileProject = require('./lib/transpile-project.js');
var nameProjectModules = require('./lib/name-project-modules.js');
var copyPackages = require('./lib/copy-packages.js');
var shimServerModules = require('./lib/shim-server-modules.js');
var shimGlobals = require('./lib/shim-globals.js');
var wrapPackageModules = require('./lib/wrap-package-modules.js');

function attach(gulp, options) {
	options = options || {};
	var task = options.task || 'default';

	gulp.task('lr:copyPackageJson', function() {
		return copyPackageJson(options);
	});
	gulp.task('lr:transpileProject', ['lr:copyPackageJson'], function() {
		return transpileProject(options);
	});
	gulp.task('lr:nameProjectModules', ['lr:transpileProject'], function() {
		return nameProjectModules(options);
	});
	gulp.task('lr:copyPackages', function() {
		return copyPackages(options);
	});
	gulp.task('lr:shimServerModules', ['lr:copyPackages'], function() {
		return shimServerModules(options);
	});
	gulp.task('lr:shimGlobals', ['lr:shimServerModules'], function() {
		return shimGlobals(options);
	});
	gulp.task('lr:wrapPackageModules', ['lr:shimGlobals'], function() {
		return wrapPackageModules(options);
	});

	gulp.task('lr:all', [
		'lr:copyPackageJson',
		'lr:transpileProject',
		'lr:nameProjectModules',
		'lr:copyPackages',
		'lr:shimServerModules',
		'lr:shimGlobals',
		'lr:wrapPackageModules',
	]);

	gulp.task(task, ['lr:all']);
}

module.exports = {
	attach: attach,
};
