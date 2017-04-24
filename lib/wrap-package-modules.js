'use strict';

var gulp = require('gulp');
var path = require('path');
var readJsonSync = require('read-json-sync');
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

function cachedReadJsonSync(filePath) {
	this.cache = this.cache || {};

	return this.cache[filePath] = this.cache[filePath] || readJsonSync(filePath);
}

function gulpWrapPackageModule() {
	return through.obj(function(file, enc, callback) {
    if (file.isNull()) {
      return callback(null, file);
    }

		var pkgDir = getFilePackageDir(file.path);
		var pkgJson = readJsonSync(pkgDir + '/package.json');
		var absFilePath = path.resolve(file.path);
		var moduleName = pkgJson.name + '@' + pkgJson.version + '/' + 
			absFilePath.substring(pkgDir.length+1);			
		
		// TODO: dependencies should be obtained parsing require's of the module
		var dependencies = [];
			
		var regex = /require\(([^\)]*)\)/gm;
		var str = String(file.contents);
		var match;
		while ((match = regex.exec(str)) !== null) {
			var dependency = match[1];
			
			dependency = dependency.trim();
			dependency = dependency.replace(/"/g, '\'');
			
		  dependencies.push(dependency);
		}
		
		dependencies = dependencies.join(', ');
		if (dependencies.length > 0) {
			dependencies = ', ' + dependencies;
		}
		
		var header = 'Liferay.Loader.define(\'' + moduleName + '\', [\'module\', \'require\'' + 
			dependencies + '], function (module, require) {\n\n';
			
		var footer = '\n});';

    if (file.isStream()) {
      this.emit(
				'error', new PluginError(PLUGIN_NAME, 'Streams not supported!'));
    
		} else if (file.isBuffer()) {
			file.contents = new Buffer(header + file.contents + footer);
    }

		return callback(null, file);
  });	
}

function wrapPackageModules() {
	var srcFiles = 'build/resources/main/META-INF/resources/node_modules/**/*.js';
	var outputDir = 'build/resources/main/META-INF/resources/node_modules';
	
	return gulp.src(srcFiles)
					.pipe(gulpWrapPackageModule())
	        .pipe(gulp.dest(outputDir));
}

module.exports = wrapPackageModules;
