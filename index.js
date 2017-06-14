'use strict';

function attach(gulp, options) {
	options = options || {};
	var task = options.task || 'default';
	var taskPrefix = options.taskPrefix || 'lr:';

	// Define available tasks
	var tasks = {
		// Project
		'copy-package-json': [],
		'transpile-project': [],
		'name-project-modules': ['copy-package-json', 'transpile-project'],
		// Packages
		'copy-packages': [],
		'inject-package-dependencies': ['copy-packages'],
		'replace-browser-mains': ['copy-packages'],
		'replace-browser-modules': ['copy-packages'],
		'normalize-requires': ['replace-browser-mains', 'replace-browser-modules'],
		'rewrite-browser-requires': ['normalize-requires'],
		'shim-node-globals': ['rewrite-browser-requires'],
		'shim-node-modules': ['shim-node-globals'],
		'wrap-package-modules': ['shim-node-modules'],
	};

	Object.keys(tasks).forEach(name => {
		var dependencies = tasks[name];

		gulp.task(
			taskPrefix + name,
			dependencies.map(name => taskPrefix + name),
			() => require('./lib/' + name + '.js')(options)
		);
	});

	gulp.task(
		taskPrefix + 'build',
		Object.keys(tasks).map(name => taskPrefix + name)
	);

	if (task) {
		gulp.task(task, [taskPrefix + 'build']);
	}
}

module.exports = {
	attach: attach,
};
