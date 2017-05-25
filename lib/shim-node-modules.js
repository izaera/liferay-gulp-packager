'use strict';

var gulp = require('gulp');
var through = require('through2');
var esprima = require('esprima');
var traverse = require('estraverse').traverse;

var srcFiles = 'build/resources/main/META-INF/resources/node_modules/**/*.js';
var outputDir = 'build/resources/main/META-INF/resources/node_modules';

// List of built-in Node.js v7.10.0 modules.
//
// Get the full list from https://nodejs.org/docs/latest/api/index.html
// Or alternatively: https://github.com/sindresorhus/builtin-modules
// A good place to look for shims is:
// https://github.com/substack/node-browserify/blob/master/lib/builtins.js
var defaultNodeModules = {
	assert: 'liferay-node-assert', //'assert',
	buffer: 'liferay-node-buffer', //'buffer',
	child_process: 'liferay-node-child_process', //'',
	cluster: 'liferay-node-cluster', //'',
	console: 'liferay-node-console', //'console-browserify',
	constants: 'liferay-node-constants', //'constants-browserify',
	crypto: 'liferay-node-crypto', //'crypto-browserify',
	dgram: 'liferay-node-dgram', //'',
	dns: 'liferay-node-dns', //'',
	domain: 'liferay-node-domain', //'domain-browser',
	events: 'liferay-node-events', //'events',
	fs: 'liferay-node-fs', //'',
	http: 'liferay-node-http', //'stream-http',
	https: 'liferay-node-https', //'https-browserify',
	module: 'liferay-node-module', //'',
	net: 'liferay-node-net', //'',
	os: 'liferay-node-os', //'os-browserify/browser.js',
	path: 'liferay-node-path', //'path-browserify',
	process: 'liferay-node-process', //'process/browser',
	punycode: 'liferay-node-punycode', //'punycode',
	querystring: 'liferay-node-querystring', //'querystring-es3',
	readline: 'liferay-node-readline', //'',
	repl: 'liferay-node-repl', //'',
	stream: 'liferay-node-stream', //'stream-browserify',
	string_decoder: 'liferay-node-string_decoder', //'string_decoder',
	timers: 'liferay-node-timers', //'timers-browserify',
	tls: 'liferay-node-tls', //'',
	tty: 'liferay-node-tty', //'tty-browserify',
	url: 'liferay-node-url', //'url',
	util: 'liferay-node-util', //'util/util.js',
	v8: 'liferay-node-v8', //'',
	vm: 'liferay-node-vm', //'vm-browserify',
	zlib: 'liferay-node-zlib', //'browserify-zlib',
};

function getShims(file, nodeModules) {
	try {
		var source = String(file.contents);
		var shims = [];

		var ast = esprima.parse(source, { range: true, tolerant: true });

		traverse(ast, {
			enter: function(node, parent) {
				if (
					parent &&
					parent.type == 'CallExpression' &&
					node.type == 'Identifier' &&
					node.name == 'require'
				) {
					var argument = parent.arguments[0];

					if (argument.type == 'Literal') {
						var shimModule = nodeModules[argument.value];

						if (shimModule) {
							shims.push({
								start: argument.range[0],
								end: argument.range[1],
								from: argument.value,
								to: shimModule,
							});
						}
					}
				}
			},
		});

		return shims;
	} catch (err) {
		return [];
	}
}

function gulpShimNodeModules(debug, nodeModules) {
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

		var shims = getShims(file, nodeModules);

		if (shims.length > 0) {
			if (debug) {
				console.log(
					'Shimming',
					shims.length,
					'Node.js modules in:',
					file.path.substring(process.cwd().length)
				);
			}

			var source = String(file.contents);
			var offsetCorrection = 0;

			shims.forEach(function(shim) {
				source =
					source.slice(0, shim.start + offsetCorrection) +
					"'" +
					shim.to +
					"'" +
					source.slice(shim.end + offsetCorrection);

				// Account for changes in file offset due to replacement
				offsetCorrection += shim.to.length - shim.from.length;
			});

			file.contents = new Buffer(source);
		}

		return callback(null, file);
	});
}

function shimNodeModules(options) {
	var debug = options.debug || false;
	var nodeModules = options.nodeModules || {};

	// Add missing Node.js modules
	Object.keys(defaultNodeModules).forEach(function(defaultNodeModule) {
		nodeModules[defaultNodeModule] = defaultNodeModules[defaultNodeModule];
	});

	return gulp
		.src(srcFiles)
		.pipe(gulpShimNodeModules(debug, nodeModules))
		.pipe(gulp.dest(outputDir));
}

module.exports = shimNodeModules;
