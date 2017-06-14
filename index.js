'use strict';

function attach(gulp, options) {
	options = options || {};
	var task = options.task || 'default';
	var taskPrefix = options.taskPrefix || 'lr:';
	var workflowName = options.workflow || 'isomorphic';

	// Define available tasks
	var taskNames = {
		copyPackageJson: 'copy-package-json',
		copyPackages: 'copy-packages',
		nameProjectModules: 'name-project-modules',
		normalizeRequires: 'normalize-requires',
		replaceBrowserMains: 'replace-browser-mains',
		replaceBrowserModules: 'replace-browser-modules',
		rewriteBrowserRequires: 'rewrite-browser-requires',
		shimNodeGlobals: 'shim-node-globals',
		shimNodeModules: 'shim-node-modules',
		transpileProject: 'transpile-project',
		wrapPackageModules: 'wrap-package-modules',
	};

	// Define workflows
	var workflows = {
		browser: {
			// Project
			copyPackageJson: [],
			transpileProject: [],
			nameProjectModules: ['copyPackageJson', 'transpileProject'],
			// Packages
			copyPackages: [],
			replaceBrowserMains: ['copyPackages'],
			replaceBrowserModules: ['replaceBrowserMains'],
			normalizeRequires: ['replaceBrowserModules'],
			rewriteBrowserRequires: ['normalizeRequires'],
			wrapPackageModules: ['rewriteBrowserRequires'],
		},
		server: {
			// Project
			copyPackageJson: [],
			transpileProject: [],
			nameProjectModules: ['copyPackageJson', 'transpileProject'],
			// Packages
			copyPackages: [],
			replaceBrowserMains: ['copyPackages'],
			replaceBrowserModules: ['replaceBrowserMains'],
			normalizeRequires: ['copyPackages'],
			rewriteBrowserRequires: ['normalizeRequires'],
			shimNodeGlobals: ['rewriteBrowserRequires'],
			shimNodeModules: ['shimNodeGlobals'],
			wrapPackageModules: ['shimNodeModules'],
		},
	};

	// Apply selected workflow
	if (workflowName) {
		var workflow = workflows[workflowName];
		var taskIds = Object.keys(workflow);

		taskIds.forEach(taskId => {
			var taskName = taskNames[taskId];

			gulp.task(
				taskPrefix + taskName,
				workflow[taskId].map(taskId => taskPrefix + taskNames[taskId]),
				() => require('./lib/' + taskName + '.js')(options)
			);
		});

		gulp.task(
			taskPrefix + 'build',
			taskIds.map(taskId => taskPrefix + taskNames[taskId])
		);

		if (task) {
			gulp.task(task, [taskPrefix + 'build']);
		}
	} else {
		taskIds.forEach(taskId => {
			gulp.task(taskNames[taskId], [], () =>
				require('./lib/' + taskNames[taskId] + '.js')(options)
			);
		});
	}
}

module.exports = {
	attach: attach,
};
