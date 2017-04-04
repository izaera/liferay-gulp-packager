'use strict';

var gulp = require('gulp');
var readPackageJson = require('read-package-json');
var resolveModule = require('resolve');
var path = require('path');
var gulpIgnore = require('gulp-ignore');
var Promise = require('bluebird');

function getPackageDependencies(basedir) {
	return new Promise(function(resolve, reject) {
		readPackageJson(basedir + '/package.json', false, function (err, data) {
			if (err) {
				reject(err);
			} else {
				var promises = [];

				Object.keys(data.dependencies).forEach(function(dependency) { 
					var dependencyDir = getDependencyDir(basedir, dependency)
					
					promises.push(getPackageDependencies(dependencyDir));
				});
				
				var pkgs = {};
				
				var pkgId = data.name + '@' + data.version;

				pkgs[pkgId] = {
					id: pkgId,
					name: data.name,
					version: data.version,
					dir: basedir
				};

				Promise.all(promises).then(
					function(dependencyPkgs) {
						dependencyPkgs.forEach(function(dependencyPkg) {
							Object.keys(dependencyPkg).forEach(function(pkgId) {								
								pkgs[pkgId] = dependencyPkg[pkgId];
							});
						});

						resolve(pkgs);
					},
					function(err) {reject(err)}
				);
			}		 
		});
	});
}

function getDependencyDir(packageDir, dependency) {
	var moduleFile = resolveModule.sync(dependency, { basedir: packageDir });
	
	var dependencyDir = path.dirname(moduleFile);
	
	while (!path.dirname(dependencyDir).endsWith('node_modules')) {
		dependencyDir = path.dirname(dependencyDir);
	}
	
	return dependencyDir;
}

/*
 * Options:
 * 		flatDependencies
 */
function packageNpm(options) {
	options = options || {};
	var flatDependencies = options.flatDependencies || true;
	
	return getPackageDependencies('.').then(
		function(pkgs) {
			// TODO: Object.values not supported in older nodes
			Object.values(pkgs).forEach(function(pkg) {
				var srcFiles = pkg.dir + '/**/*';
				var outputDir = 
					flatDependencies 
					? './build/resources/main/META-INF/resources/node_modules/' + pkg.id
					: './build/resources/main/META-INF/resources/' + path.relative('.', pkg.dir)
				
				if (srcFiles === './**/*') {
					return;
				}
				
				var gs = gulp.src(srcFiles);
				
				if (flatDependencies) {
					gs = gs.pipe(gulpIgnore.exclude('node_modules'))
									.pipe(gulpIgnore.exclude('node_modules/**/*'));
				}

				gs.pipe(gulp.dest(outputDir));
			});
		}, 
		function(err) {console.log(err)}
	);
}

module.exports = packageNpm;
