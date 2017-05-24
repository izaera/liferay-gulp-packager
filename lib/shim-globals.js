'use strict';

var gulp = require('gulp');
var through = require('through2');
var esprima = require('esprima');

var srcDir = 'build/resources/main/META-INF/resources';
var srcFiles = srcDir + '/node_modules/**/*.js';
var outputDir = 'build/resources/main/META-INF/resources/node_modules';

var builtInShimmedGlobals = {
	process: "var process = require('process');",
	Buffer: "var buffer = require('buffer');",
	global: 'var global = window;',
	__filename: function(file) {
		var filename = file.path.substring(
			process.cwd().length + srcDir.length + 1
		);
		return "var __filename = '" + filename + "';";
	},
	__dirname: function(file) {
		var dirname = file.path.substring(process.cwd().length + srcDir.length + 1);
		dirname = dirname.substring(0, dirname.lastIndexOf('/'));
		return "var __dirname = '" + dirname + "';";
	},
	toString: null,
};

function gulpShimGlobals(debug, shimmedGlobals) {
	return through.obj(function(file, enc, callback) {
		if (file.isNull()) {
			return callback(null, file);
		}

		if (file.isStream()) {
			this.emit(
				'error',
				new PluginError(PLUGIN_NAME, 'Streams not supported!')
			);
		} else if (file.isBuffer()) {
			var source = String(file.contents);

			try {
				var inVariableDeclaration = false;
				var injections = {};

				var ast = esprima.parse(
					source,
					{ range: true, tolerant: true },
					function(node) {
						switch (node.type) {
							case 'VariableDeclaration':
								inVariableDeclaration = true;
								break;

							case 'Identifier':
								if (!inVariableDeclaration) {
									var injection = shimmedGlobals[node.name];

									if (typeof injection == 'function') {
										injection = injection(file);
									}

									if (injection) {
										injections[injection] = injection;
									}
								}

								inVariableDeclaration = false;
								break;
						}
					}
				);

				injections = Object.keys(injections);

				if (injections.length > 0) {
					source = '\n' + source;

					if (debug) {
						console.log(
							'Shimming',
							injections.length,
							'globals in:',
							file.path.substring(process.cwd().length)
						);
					}

					injections.forEach(function(injection) {
						source = injection + '\n' + source;
					});
				}
			} catch (err) {
				// console.log('Oops! in ' + file.path, err);
			}

			file.contents = new Buffer(source);
		}

		return callback(null, file);
	});
}

function shimGlobals(options) {
	var debug = options.debug || false;
	var shimmedGlobals = options.shimmedGlobals || {};

	// Add missing built-in supported globals
	Object.keys(builtInShimmedGlobals).forEach(function(builtInGlobal) {
		shimmedGlobals[builtInGlobal] = builtInShimmedGlobals[builtInGlobal];
	});

	return gulp
		.src(srcFiles)
		.pipe(gulpShimGlobals(debug, shimmedGlobals))
		.pipe(gulp.dest(outputDir));
}

module.exports = shimGlobals;
