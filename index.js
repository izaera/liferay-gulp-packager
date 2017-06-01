'use strict';

var copyPackageJson = require('./lib/copy-package-json.js');
var transpileProject = require('./lib/transpile-project.js');
var nameProjectModules = require('./lib/name-project-modules.js');
var copyPackages = require('./lib/copy-packages.js');
var replaceBrowserMains = require('./lib/replace-browser-mains.js'); // iso
var replaceBrowserModules = require('./lib/replace-browser-modules.js'); // iso
var normalizeRequires = require('./lib/normalize-requires.js');
var rewriteBrowserRequires = require('./lib/rewrite-browser-requires.js'); // iso
var shimNodeGlobals = require('./lib/shim-node-globals.js'); // iso
var shimNodeModules = require('./lib/shim-node-modules.js'); // iso
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
	gulp.task('lr:replaceBrowserMains', ['lr:copyPackages'], function() {
		return replaceBrowserMains(options);
	});
	gulp.task('lr:replaceBrowserModules', ['lr:replaceBrowserMains'], function() {
		return replaceBrowserModules(options);
	});
	gulp.task('lr:normalizeRequires', ['lr:replaceBrowserModules'], function() {
		return normalizeRequires(options);
	});
	gulp.task('lr:rewriteBrowserRequires', ['lr:normalizeRequires'], function() {
		return rewriteBrowserRequires(options);
	});
	gulp.task('lr:shimNodeGlobals', ['lr:rewriteBrowserRequires'], function() {
		return shimNodeGlobals(options);
	});
	gulp.task('lr:shimNodeModules', ['lr:shimNodeGlobals'], function() {
		return shimNodeModules(options);
	});
	gulp.task('lr:wrapPackageModules', ['lr:shimNodeModules'], function() {
		return wrapPackageModules(options);
	});

	gulp.task('lr:all', [
		'lr:copyPackageJson',
		'lr:transpileProject',
		'lr:nameProjectModules',
		'lr:copyPackages',
		'lr:replaceBrowserMains',
		'lr:replaceBrowserModules',
		'lr:normalizeRequires',
		'lr:rewriteBrowserRequires',
		'lr:shimNodeGlobals',
		'lr:shimNodeModules',
		'lr:wrapPackageModules',
	]);

	if (task) {
		gulp.task(task, ['lr:all']);
	}
}

module.exports = {
	attach: attach,
};
