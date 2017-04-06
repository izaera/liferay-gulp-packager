'use strict';

var gulp = require('gulp');
var gulpIgnore = require('gulp-ignore');
var Transform = require('readable-stream/transform');
var rs = require('replacestream');
var path = require('path');
var readJsonSync = require('read-json-sync');
var mergeStream = require('merge-stream');

function gulpNameModule(getFilePackageDir) {
	var search = 'define(';

	return new Transform({
    objectMode: true,
    transform: function(file, enc, callback) {
      if (file.isNull()) {
        return callback(null, file);
      }

			var pkgDir = getFilePackageDir(file.path);
			var pkgJson = readJsonSync(pkgDir + '/package.json');
			var absFilePath = path.resolve(file.path);
			var moduleName = pkgJson.name + '@' + pkgJson.version + '/' + absFilePath.substring(pkgDir.length+1);			
			var replacement = 'define(\'pkg:' + moduleName + '\', ';

      if (file.isStream()) {
        file.contents = file.contents.pipe(rs(search, replacement));
        return callback(null, file);
      }

      if (file.isBuffer()) {
        if (search instanceof RegExp) {
          file.contents = new Buffer(String(file.contents).replace(search, replacement));
        }
        else {
          var chunks = String(file.contents).split(search);

          var result;
          if (typeof replacement === 'function') {
            // Start with the first chunk already in the result
            // Replacements will be added thereafter
            // This is done to avoid checking the value of i in the loop
            result = [ chunks[0] ];

            // The replacement function should be called once for each match
            for (var i = 1; i < chunks.length; i++) {
              // Add the replacement value
              result.push(replacement(search));

              // Add the next chunk
              result.push(chunks[i]);
            }

            result = result.join('');
          }
          else {
            result = chunks.join(replacement);
          }

          file.contents = new Buffer(result);
        }
        return callback(null, file);
      }

      callback(null, file);
    }
  });
}

function gulpNameProjectModule() {
	return gulpNameModule(function(filePath) {
		return path.resolve('./build/resources/main/META-INF/resources');
	});
}

function gulpNamePackageModule() {
	return gulpNameModule(function(filePath) {
		var dir = path.dirname(filePath);
		
		while (!path.dirname(dir) === 'node_modules') {
			dir = path.dirname(dir);
		}
		
		return dir;
	});
}

function nameTranspiledProject() {
	var srcFiles = 'build/resources/main/META-INF/resources/**/*.js';
	var outputDir = 'build/resources/main/META-INF/resources';

	return gulp.src(srcFiles)
					.pipe(gulpIgnore('node_modules/**/*'))
	        .pipe(gulpNameProjectModule())
	        .pipe(gulp.dest(outputDir));
					
	return gulp.src('');
}

function nameTranspiledPackages() {
	var srcFiles = 'build/resources/main/META-INF/resources/node_modules/**/*.js';
	var outputDir = 'build/resources/main/META-INF/resources/node_modules';
	
	return gulp.src(srcFiles)
	        .pipe(gulpNamePackageModule())
	        .pipe(gulp.dest(outputDir));
}

module.exports = function() {
	return mergeStream(
		nameTranspiledProject(), 
		nameTranspiledPackages()
	);
}
