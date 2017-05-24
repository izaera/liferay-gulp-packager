'use strict';

var gulp = require('gulp');
var through = require('through2');
var esprima = require('esprima');
var builtinModules = require('builtin-modules/static');
var gulpUtil = require('gulp-util');
var path = require('path');
var resolveModule = require('resolve');
var readJsonSync = require('read-json-sync');
var fs = require('fs');

var srcFiles = 'build/resources/main/META-INF/resources/node_modules/**/*.js';
var outputDir = 'build/resources/main/META-INF/resources/node_modules';

// The following list is taken from
// https://github.com/substack/node-browserify/blob/master/lib/builtins.js
// Another related resource is https://github.com/sindresorhus/builtin-modules
var builtInServerPackageShims = {
	assert: 'assert',
	buffer: 'buffer',
	console: 'console-browserify',
	constants: 'constants-browserify',
	crypto: 'crypto-browserify',
	domain: 'domain-browser',
	events: 'events',
	http: 'stream-http',
	https: 'https-browserify',
	os: 'os-browserify/browser',
	path: 'path-browserify',
	process: 'process/browser',
	punycode: 'punycode',
	querystring: 'querystring-es3',
	stream: 'stream-browserify',
	string_decoder: 'string_decoder',
	timers: 'timers-browserify',
	tty: 'tty-browserify',
	url: 'url',
	util: 'util/util',
	vm: 'vm-browserify',
	zlib: 'browserify-zlib',
};

// Global module variables to store all missing shims and modules
var missingServerPackageShims = {};
var missingModules = {};

function reportMissingServerPackageShims() {
	if (Object.keys(missingServerPackageShims).length == 0) {
		return;
	}

	console.log(
		'\nWARNING: The following packages have no valid shim configured.\n'
	);

	Object.keys(missingServerPackageShims).forEach(function(pkg) {
		console.log('           · ' + pkg);
	});

	console.log(
		'\n         Please provide valid/empty shims in the\n' +
			'         options.serverPackageShims object passed to the call to \n' +
			'         liferayGulpPackager.attach() in gulpfile.js.\n'
	);
}

function reportMissingModules() {
	if (Object.keys(missingModules).length == 0) {
		return;
	}

	console.log(
		"\nWARNING: The following modules were not found in the project's " +
			'dependency tree.\n'
	);

	Object.keys(missingModules).forEach(function(pkg) {
		console.log(
			'           · ' +
				pkg +
				" (shim for '" +
				missingModules[pkg] +
				"' package)"
		);
	});

	console.log(
		'\n         Please add them to the package.json file running the command:\n'
	);

	console.log(
		'           npm install --save ' +
			Object.keys(missingModules).map(getPackageName).join(' ') +
			'\n'
	);
}

function getPackageName(module) {
	var i = module.indexOf('/');

	if (i == -1) {
		return module;
	} else {
		return module.substring(0, i);
	}
}

function getPackageDir(moduleFile) {
	var packageDir = path.dirname(moduleFile);

	while (!path.dirname(packageDir).endsWith('node_modules')) {
		packageDir = path.dirname(packageDir);
	}

	return packageDir;
}

function gulpShimServerModules(debug, serverPackageShims) {
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
				var substitutions = [];

				var ast = esprima.parse(
					source,
					{ range: true, tolerant: true },
					function(node) {
						if (node.type == 'CallExpression') {
							if (node.callee.type == 'Identifier') {
								if (node.callee.name == 'require') {
									var argument = node.arguments[0];

									if (argument.type == 'Literal') {
										var module = argument.value;
										var pkg = getPackageName(module);
										var replacementPkg = serverPackageShims[pkg];

										// Skip ignored shims
										if (replacementPkg === undefined || replacementPkg == '') {
											return;
										}

										// Skip and store unshimmed packages for further reporting
										if (replacementPkg == null) {
											missingServerPackageShims[pkg] = null;
											return;
										}

										// Calculate substitution
										var replacementModule;

										if (module == pkg) {
											replacementModule = replacementPkg;
										} else {
											replacementModule = module.replace(
												pkg + '/',
												replacementPkg + '/'
											);
										}

										// Store missing packages for further error reporting
										try {
											var pkgDir = getPackageDir(file.path);

											resolveModule.sync(replacementModule, {
												basedir: pkgDir,
											});

											var pkgJson = readJsonSync(pkgDir + '/package.json');

											var outputPkgDir =
												outputDir +
												'/' +
												packageJson.name +
												'@' +
												packageJson.version;

											// We may find the package in node_modules but it may
											// have not been copied to build dir, in that case we
											// should warn (we just need to get package's name and
											// version and look for it under build dir.)
											if (!fs.statSync(path).isDirectory()) {
												throw new Error();
											}

											// this is actually causing the example to fail because
											// readable-stream@2.2.9 uses string_decoder but the
											// copy packages task is not copying string_decoder
											// because it is a builtin package and thus
											// readable-stream does not depend on it
										} catch (err) {
											missingModules[replacementPkg] = pkg;
										}

										substitutions.push({
											from: argument.range[0],
											to: argument.range[1],
											pkg: pkg,
											module: module,
											replacementPkg: replacementPkg,
											replacementModule: replacementModule,
										});
									}
								}
							}
						}
					}
				);

				if (substitutions.length > 0) {
					var offsetCorrection = 0;

					if (debug) {
						console.log(
							'Shimming',
							substitutions.length,
							'server modules in:',
							file.path.substring(process.cwd().length)
						);
					}

					substitutions.forEach(function(substitution) {
						source =
							source.slice(0, substitution.from + offsetCorrection) +
							"'" +
							substitution.replacementModule +
							"'" +
							source.slice(substitution.to + offsetCorrection);

						// Account for changes in file offset due to replacement
						offsetCorrection +=
							substitution.replacementModule.length -
							substitution.module.length;
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

function shimServerModules(options) {
	var debug = options.debug || false;
	var serverPackageShims = options.serverPackageShims || {};

	// Add missing built-in supported modules
	Object.keys(builtInServerPackageShims).forEach(function(
		builtInShimmedServerPackage
	) {
		if (serverPackageShims[builtInShimmedServerPackage] === undefined) {
			serverPackageShims[builtInShimmedServerPackage] =
				builtInServerPackageShims[builtInShimmedServerPackage];
		}
	});

	// Mark missing Node.js built-in modules as not shimmed
	builtinModules.forEach(function(builtinModule) {
		if (serverPackageShims[builtinModule] === undefined) {
			serverPackageShims[builtinModule] = null;
		}
	});

	return gulp
		.src(srcFiles)
		.pipe(gulpShimServerModules(debug, serverPackageShims))
		.pipe(gulp.dest(outputDir))
		.on('end', reportMissingServerPackageShims)
		.on('end', reportMissingModules);
}

module.exports = shimServerModules;
