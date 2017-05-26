'use strict';

var esprima = require('esprima');
var traverse = require('estraverse').traverse;

function visit(file, visitor) {
	var source = String(file.contents);

	var ast = esprima.parse(source, { range: true, tolerant: true });

	traverse(ast, {
		enter: visitor,
	});
}

function visitRequires(file, visitor) {
	visit(file, function(node, parent) {
		if (
			parent &&
			parent.type == 'CallExpression' &&
			node.type == 'Identifier' &&
			node.name == 'require'
		) {
			var argument = parent.arguments[0];

			if (argument.type == 'Literal' && argument.value) {
				visitor(node, parent, argument);
			}
		}
	});
}

function replace(file, replacements) {
	var source = String(file.contents);
	var offsetCorrection = 0;

	replacements.forEach(function(replacement) {
		source =
			source.slice(0, replacement.start + offsetCorrection) +
			replacement.to +
			source.slice(replacement.end + offsetCorrection);

		// Account for changes in file offset due to replacement
		offsetCorrection +=
			replacement.to.length - (replacement.end - replacement.start);
	});

	file.contents = new Buffer(source);
}

module.exports = {
	visit: visit,
	visitRequires: visitRequires,
	replace: replace,
};
