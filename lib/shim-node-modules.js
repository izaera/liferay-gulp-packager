'use strict';

var gulp = require('gulp');
var through = require('through2');
var esprima = require('esprima');
var traverse = require('estraverse').traverse;
var path = require('path');
var fs = require('fs');
var readJsonSync = require('read-json-sync');

var srcFiles = 'build/resources/main/META-INF/resources/node_modules/**/*.js';
var outputDir = 'build/resources/main/META-INF/resources/node_modules';

// List of built-in Node.js v7.10.0 modules.
//
// Get the full list from https://nodejs.org/docs/latest/api/index.html
// Or alternatively: https://github.com/sindresorhus/builtin-modules
// A good place to look for shims is:
// https://github.com/substack/node-browserify/blob/master/lib/builtins.js
var defaultNodeModules = {
	assert: 'liferay-node-assert',
	buffer: 'liferay-node-buffer',
	child_process: 'liferay-node-child_process',
	cluster: 'liferay-node-cluster',
	console: 'liferay-node-console',
	constants: 'liferay-node-constants',
	crypto: 'liferay-node-crypto',
	dgram: 'liferay-node-dgram',
	dns: 'liferay-node-dns',
	domain: 'liferay-node-domain',
	events: 'liferay-node-events',
	fs: 'liferay-node-fs',
	http: 'liferay-node-http',
	https: 'liferay-node-https',
	module: 'liferay-node-module',
	net: 'liferay-node-net',
	os: 'liferay-node-os',
	path: 'liferay-node-path',
	process: 'liferay-node-process',
	punycode: 'liferay-node-punycode',
	querystring: 'liferay-node-querystring',
	readline: 'liferay-node-readline',
	repl: 'liferay-node-repl',
	stream: 'liferay-node-stream',
	string_decoder: 'liferay-node-string_decoder',
	timers: 'liferay-node-timers',
	tls: 'liferay-node-tls',
	tty: 'liferay-node-tty',
	url: 'liferay-node-url',
	util: 'liferay-node-util',
	v8: 'liferay-node-v8',
	vm: 'liferay-node-vm',
	zlib: 'liferay-node-zlib',
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

function getPackageJsonPath(file) {
	var dir = path.dirname(file.path);

	while (true) {
		try {
			fs.statSync(dir + '/package.json');
			break;
		} catch (err) {}

		dir = path.dirname(dir);

		if (dir == '/') {
			throw new Error('Cannot find package.json for file: ' + file.path);
		}
	}

	return dir + '/package.json';
}

/**
 * @param pkgJsonPatches Array output parameter containing all package.json
 * 				files to patch
 */
function gulpShimNodeModules(debug, nodeModules, pkgJsonPatches) {
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

			var pkgJsonPath = getPackageJsonPath(file);
			var patches = pkgJsonPatches[pkgJsonPath];
			if (!patches) {
				pkgJsonPatches[pkgJsonPath] = patches = {};
			}

			shims.forEach(function(shim) {
				patches[shim.to] = '1.0.0';
			});

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

function patchPackageJsons(debug, pkgJsonPatches) {
	Object.keys(pkgJsonPatches).forEach(function(path) {
		var dependencies = pkgJsonPatches[path];
		var pkgJson = readJsonSync(path);

		pkgJson.dependencies = pkgJson.dependencies || [];

		Object.keys(dependencies).forEach(function(pkg) {
			pkgJson.dependencies[pkg] = dependencies[pkg];
		});

		fs.writeFileSync(path, JSON.stringify(pkgJson, null, 2));
	});
}

function shimNodeModules(options) {
	var debug = options.debug || false;
	var nodeModules = options.nodeModules || {};

	// Add missing Node.js modules
	Object.keys(defaultNodeModules).forEach(function(defaultNodeModule) {
		if (!nodeModules.hasOwnProperty(defaultNodeModule)) {
			nodeModules[defaultNodeModule] = defaultNodeModules[defaultNodeModule];
		}
	});

	var pkgJsonPatches = [];

	return gulp
		.src(srcFiles)
		.pipe(gulpShimNodeModules(debug, nodeModules, pkgJsonPatches))
		.pipe(gulp.dest(outputDir))
		.on('end', function() {
			patchPackageJsons(debug, pkgJsonPatches);
		});
}

module.exports = shimNodeModules;
