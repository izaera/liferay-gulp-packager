'use strict';

var gulp = require('gulp');
var resolveModule = require('resolve');
var readJsonSync = require('read-json-sync');
var path = require('path');
var gulpIgnore = require('gulp-ignore');
var mergeStream = require('merge-stream');

var outputDir = './build/resources/main/META-INF/resources';

/**
 * Recursively find the dependencies of a package living in a `basedir` and
 * return them as a hash of objects where key is the package id and values have
 * the following structure:
 *    {
 *      id: <package id>,     // a package id is a unique `name@version` string
 *      name: <package name>, // package name (without version, not unique)
 *      version: <package version>,
 *      dir: <package dir>
 *    }
 */
function getPackageDependencies(basedir) {
	var pkgs = {};

	var packageJson = readJsonSync(basedir + '/package.json');
	var pkgId = packageJson.name + '@' + packageJson.version;

	pkgs[pkgId] = {
		id: pkgId,
		name: packageJson.name,
		version: packageJson.version,
		dir: basedir,
	};

	var dependencies = packageJson.dependencies || [];

	var dependencyDirs = Object.keys(dependencies).map(function(dependency) {
		return resolveDependencyDir(basedir, dependency);
	});

	dependencyDirs = dependencyDirs.filter(dependencyDir => {
		return dependencyDir != null;
	});

	dependencyDirs.forEach(function(dependencyDir) {
		var depPkgs = getPackageDependencies(dependencyDir);

		Object.keys(depPkgs).forEach(function(pkgId) {
			pkgs[pkgId] = depPkgs[pkgId];
		});
	});

	return pkgs;
}

/**
 * Resolves a `dependency` from the context of a specific `packageDir` and
 * returns its directory
 */
function resolveDependencyDir(packageDir, dependency) {
	var moduleFile = resolveModule.sync(dependency, { basedir: packageDir });

	var dependencyDir = path.dirname(moduleFile);

	while (!path.dirname(dependencyDir).endsWith('node_modules')) {
		dependencyDir = path.dirname(dependencyDir);
	}

	return dependencyDir;
}

function mergeStreams(streams) {
	var merged = mergeStream(streams[0]);

	streams.slice(1).forEach(function(stream) {
		merged.add(stream);
	});

	return merged;
}

function copyPackages(options) {
	var debug = options.debug || false;
	var flatDependencies = options.flatDependencies || true;

	var pkgs = getPackageDependencies('.');

	var streams = Object.keys(pkgs).map(function(key) {
		var pkg = pkgs[key];

		if (debug) {
			var dir = pkg.dir.substring(process.cwd().length);
			if (dir == '') {
				dir = '/';
			}
			console.log('Copying package at:', dir);
		}

		if (pkg.dir === '.') {
			return gulp.src('');
		}

		var stream = gulp.src(pkg.dir + '/**/*');

		if (flatDependencies) {
			stream = stream
				.pipe(gulpIgnore.exclude('node_modules'))
				.pipe(gulpIgnore.exclude('node_modules/**/*'));

			stream = stream.pipe(gulp.dest(outputDir + '/node_modules/' + pkg.id));
		} else {
			stream = stream.pipe(
				gulp.dest(outputDir + '/' + path.relative('.', pkg.dir))
			);
		}

		return stream;
	});

	return mergeStreams(streams);
}

module.exports = copyPackages;
