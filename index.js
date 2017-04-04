'use strict';

var copyPackageJson = require('./lib/copy-package-json.js');
var packageNpm = require('./lib/package-npm.js');
var transpile = require('./lib/transpile.js');

function attach(gulp, options) {
	options = options || {};
	var task = options.task || 'default';
	
	gulp.task('lr:copy-package-json', function(){copyPackageJson(options)});
	gulp.task('lr:package-npm', function(){packageNpm(options)});
	gulp.task('lr:transpile', function(){transpile(options)});

	gulp.task('lr:all', ['lr:copy-package-json', 'lr:package-npm', 'lr:transpile']);

	gulp.task(task, ['lr:all']);
}

module.exports = {
	attach: attach
}