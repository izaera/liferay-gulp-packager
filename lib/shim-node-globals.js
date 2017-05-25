'use strict';

var gulp = require('gulp');
var through = require('through2');
var esprima = require('esprima');
var traverse = require('estraverse').traverse;

var srcDir = 'build/resources/main/META-INF/resources';
var srcFiles = srcDir + '/node_modules/**/*.js';
var outputDir = 'build/resources/main/META-INF/resources/node_modules';

// List of built-in Node.js v7.10.0 globals.
//
// Get the full list from https://nodejs.org/docs/latest/api/globals.html
var defaultNodeGlobals = {
	Buffer: "var Buffer = require('buffer');",
	__dirname: function(file) {
		var dirname = file.path.substring(process.cwd().length + srcDir.length + 1);
		dirname = dirname.substring(0, dirname.lastIndexOf('/'));
		return "var __dirname = '" + dirname + "';";
	},
	__filename: function(file) {
		var filename = file.path.substring(
			process.cwd().length + srcDir.length + 1
		);
		return "var __filename = '" + filename + "';";
	},
	clearImmediate: "require('setimmediate');",
	//clearInterval: already provided by the browser
	//clearTimeout: already provided by the browser
	//console: already provided by the browser
	exports: 'var exports = module.exports;',
	global: 'var global = window;',
	process: "var process = require('process');",
	setImmediate: "require('setimmediate');",
	//setInterval: already provided by the browser
	//setTimeout: already provided by the browser
};

function getShims(file, nodeGlobals) {
	try {
		var source = String(file.contents);
		var shims = {};

		var ast = esprima.parse(source, { range: true, tolerant: true });

		traverse(ast, {
			enter: function(node, parent) {
				var capture = false;

				if (node.type == 'Identifier') {
					switch (parent.type) {
						case 'MemberExpression':
							capture = parent.object === node;
							break;

						case 'VariableDeclarator':
							capture = parent.id !== node;
							break;

						default:
							capture = true;
							break;
					}
				}

				if (capture && nodeGlobals.hasOwnProperty(node.name)) {
					var shim = nodeGlobals[node.name];

					if (typeof shim == 'function') {
						shim = shim(file);
					}

					shims[shim] = shim;
				}
			},
		});

		return Object.keys(shims);
	} catch (err) {
		return [];
	}
}

function gulpShimNodeGlobals(debug, nodeGlobals) {
	return through.obj(function(file, enc, callback) {
		if (file.isNull()) {
			return callback(null, file);
		}

		if (file.isStream()) {
			return callback(
				new PluginError(PLUGIN_NAME, 'Streams not supported!'),
				file
			);
		}

		var shims = getShims(file, nodeGlobals);

		if (shims.length > 0) {
			if (debug) {
				console.log(
					'Shimming',
					shims.length,
					'Node.js globals in:',
					file.path.substring(process.cwd().length)
				);
			}

			var source = '\n' + String(file.contents);

			shims.forEach(function(shim) {
				source = shim + '\n' + source;
			});

			file.contents = new Buffer(source);
		}

		return callback(null, file);
	});
}

function shimNodeGlobals(options) {
	var debug = options.debug || false;
	var nodeGlobals = options.nodeGlobals || {};

	// Add missing Node.js globals
	Object.keys(defaultNodeGlobals).forEach(function(defaultNodeGlobal) {
		nodeGlobals[defaultNodeGlobal] = defaultNodeGlobals[defaultNodeGlobal];
	});

	return gulp
		.src(srcFiles)
		.pipe(gulpShimNodeGlobals(debug, nodeGlobals))
		.pipe(gulp.dest(outputDir));
}

module.exports = shimNodeGlobals;
