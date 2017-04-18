'use strict';

var gulp = require('gulp');
var gulpIgnore = require('gulp-ignore');
var rs = require('replacestream');
var path = require('path');
var readJsonSync = require('read-json-sync');
var mergeStream = require('merge-stream');
var through = require('through2');

function getFilePackageDir(filePath) {
	var child = filePath;
	var parent = path.dirname(child);

	while (!parent.endsWith('/node_modules')) {
		child = parent;
		parent = path.dirname(parent);
	}
	
	return child;
}

var readJsonSyncCache = {}
function cachedReadJsonSync(filePath) {
	var pkgJson = readJsonSyncCache[filePath];
	
	if (pkgJson === undefined) {
		readJsonSyncCache[filePath] = readJsonSync(filePath);
	}
	
	return pkgJson;
}

function gulpNameProjectModule() {
	var pkgDir = path.resolve('./build/resources/main/META-INF/resources');
	var pkgJson = readJsonSync(pkgDir + '/package.json');
	var search = 'define(';

	return through.obj(
		function(file, enc, callback) {
      if (file.isNull()) {
        return callback(null, file);
      }

			var absFilePath = path.resolve(file.path);
			var moduleName = pkgJson.name + '@' + pkgJson.version + '/' + 
				absFilePath.substring(pkgDir.length+1);			
			var replacement = 'define(\'' + moduleName + '\', ';

      if (file.isStream()) {
        file.contents = file.contents.pipe(rs(search, replacement));

      } else if (file.isBuffer()) {
        var chunks = String(file.contents).split(search);
        file.contents = new Buffer(chunks.join(replacement));

      }

      return callback(null, file);
    }
  );
}

function gulpWrapPackageModule() {
	return through.obj(
    function(file, enc, callback) {
      if (file.isNull()) {
        return callback(null, file);
      }

			var pkgDir = getFilePackageDir(file.path);
			var pkgJson = readJsonSync(pkgDir + '/package.json');
			var absFilePath = path.resolve(file.path);
			var moduleName = pkgJson.name + '@' + pkgJson.version + '/' + 
				absFilePath.substring(pkgDir.length+1);			
			
			var dependencies = Object.keys(pkgJson.dependencies).map(
				function(dependency) {
					return ' , \'' + dependency + '\'';
				});
			
			var header = 'define(\'' + moduleName + '\', [\'module\', \'require\'' + 
				dependencies + '], function (module, require) {\n\n';
				
			var footer = '\n});';

      if (file.isStream()) {
        this.emit(
					'error', new PluginError(PLUGIN_NAME, 'Streams not supported!'));
      
			} else if (file.isBuffer()) {
				file.contents = new Buffer(header + file.contents + footer);
      }

			return callback(null, file);
    }
  );	
}

function nameTranspiledProject() {
	var srcFiles = 'build/resources/main/META-INF/resources/**/*.js';
	var outputDir = 'build/resources/main/META-INF/resources';

	return gulp.src(srcFiles)
					.pipe(gulpIgnore('node_modules/**/*'))
	        .pipe(gulpNameProjectModule())
	        .pipe(gulp.dest(outputDir));
}

function nameTranspiledPackages() {
	var srcFiles = 'build/resources/main/META-INF/resources/node_modules/**/*.js';
	var outputDir = 'build/resources/main/META-INF/resources/node_modules';
	
	return gulp.src(srcFiles)
					.pipe(gulpWrapPackageModule())
	        .pipe(gulp.dest(outputDir));
}

module.exports = function() {
	return mergeStream(
		nameTranspiledProject(), 
		nameTranspiledPackages()
	);
}
