'use strict';

// TODO: maybe split this into two tasks: one for code and other for package.json

var fs = require('fs');
var gulp = require('gulp');
var readJsonSync = require('read-json-sync');

var ast = require('./util/ast');
var util = require('./util/util');

var srcFiles = 'build/resources/main/META-INF/resources/node_modules/**/*.js';
var outputDir = 'build/resources/main/META-INF/resources/node_modules';

// List of built-in Node.js v7.10.0 modules.
//
// Get the full list from https://nodejs.org/docs/latest/api/index.html
// Or alternatively: https://github.com/sindresorhus/builtin-modules
// A good place to look for shims is:
// https://github.com/substack/node-browserify/blob/master/lib/builtins.js
var defaultNodeModules = {
	assert: ['liferay-node-assert', '1.0.0'],
	buffer: ['liferay-node-buffer', '1.0.0'],
	child_process: ['liferay-node-child_process', '1.0.0'],
	cluster: ['liferay-node-cluster', '1.0.0'],
	console: ['liferay-node-console', '1.0.0'],
	constants: ['liferay-node-constants', '1.0.0'],
	crypto: ['liferay-node-crypto', '1.0.0'],
	dgram: ['liferay-node-dgram', '1.0.0'],
	dns: ['liferay-node-dns', '1.0.0'],
	domain: ['liferay-node-domain', '1.0.0'],
	events: ['liferay-node-events', '1.0.0'],
	fs: ['liferay-node-fs', '1.0.0'],
	http: ['liferay-node-http', '1.0.0'],
	https: ['liferay-node-https', '1.0.0'],
	module: ['liferay-node-module', '1.0.0'],
	net: ['liferay-node-net', '1.0.0'],
	os: ['liferay-node-os', '1.0.0'],
	path: ['liferay-node-path', '1.0.0'],
	process: ['liferay-node-process', '1.0.0'],
	punycode: ['liferay-node-punycode', '1.0.0'],
	querystring: ['liferay-node-querystring', '1.0.0'],
	readline: ['liferay-node-readline', '1.0.0'],
	repl: ['liferay-node-repl', '1.0.0'],
	stream: ['liferay-node-stream', '1.0.0'],
	string_decoder: ['liferay-node-string_decoder', '1.0.0'],
	timers: ['liferay-node-timers', '1.0.0'],
	tls: ['liferay-node-tls', '1.0.0'],
	tty: ['liferay-node-tty', '1.0.0'],
	url: ['liferay-node-url', '1.0.0'],
	util: ['liferay-node-util', '1.0.0'],
	v8: ['liferay-node-v8', '1.0.0'],
	vm: ['liferay-node-vm', '1.0.0'],
	zlib: ['liferay-node-zlib', '1.0.0'],
};

function getReplacements(file, nodeModules, pkgJsonPatches) {
	try {
		var replacements = [];

		var pkgJsonPath = util.getPackageJsonPath(file);
		var patches = pkgJsonPatches[pkgJsonPath];
		if (!patches) {
			pkgJsonPatches[pkgJsonPath] = patches = {};
		}

		ast.visitRequires(file, function(node, parent, argument) {
			var moduleName = argument.value;
			var shimName = nodeModules[moduleName];
			var shimVersion = '1.0.0';

			if (Array.isArray(shimName)) {
				shimVersion = shimName[1];
				shimName = shimName[0];
			}

			if (nodeModules.hasOwnProperty(moduleName) && shimName) {
				replacements.push({
					start: argument.range[0],
					end: argument.range[1],
					from: argument.raw,
					to: "'" + shimName + "'",
					version: shimVersion,
				});

				patches[shimName] = shimVersion;
			}
		});

		return replacements;
	} catch (err) {
		return [];
	}
}

/**
 * @param pkgJsonPatches Array output parameter containing all package.json
 * 				files to patch
 */
function gulpShimNodeModules(debug, nodeModules, pkgJsonPatches) {
	return util.transform(function(file) {
		var replacements = getReplacements(file, nodeModules, pkgJsonPatches);

		if (replacements.length > 0) {
			if (debug) {
				console.log(
					'Shimming',
					replacements.length,
					'Node.js modules in:',
					file.path.substring(process.cwd().length)
				);
				console.log(replacements);
			}

			ast.replace(file, replacements);
		}
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
