var Q = require("q");
var Exception = require('../utils').Exception;
var Parser = require('css');
var templateDir = __dirname + '/../../templates/emails/';

module.exports = {
	getBindingStyles : function(styles, source, bind) {
		var deferred = Q.defer();
		// Make sure values are correct
		if (styles === undefined || typeof styles !== 'string')
			deferred.reject(Exception('Styles Value Must be a String', 500));
		if (source === undefined || source.indexOf('.css') < 0)
			deferred.reject(Exception('Source Value Must be a CSS File', 500));
		if (bind === undefined || typeof bind !== 'object')
			deferred.reject(Exception('Bind Value Must be an Object', 500));

		var that = this;
		this.__generateAST(styles, source).then(function(ast) {
			that.__addBindingRules(ast.stylesheet.rules, bind).then(function(result) {
				deferred.resolve(result.value);
			});
		}).catch(function(err) {
			console.log('-- INTERNAL ERROR: CSSParser Module: "getBindingStyles": There was a problem generating the Binding Styles --');
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},
	__generateAST : function(styles, source) {
		var deferred = Q.defer();
		source = templateDir + source;
		var ast = Parser.parse(styles, {
			silent: true,
			source: source
		});
		this.__validateASTErrors(ast).then(function(validAST) {
			deferred.resolve(validAST);
		}).fail(function(err) {
			deferred.reject(Exception(err.message, 500));
		}).done();
		return deferred.promise;
	},
	__validateASTErrors : function(ast) {
		var deferred = Q.defer();
		var that = this;
		var errorPromises = [];
		var parsingErrors = ast.stylesheet.parsingErrors;
		if (parsingErrors.length === 0)
			deferred.resolve(ast);
		else if (parsingErrors.length > 0)
			deferred.reject(parsingErrors[0]);
		return deferred.promise;
	},
	__addBindingRules : function(rules, bind) {
		var deferred = Q.defer();
		var promises = [], numOfRules = rules.length, i;
		for (i = 0; i < numOfRules; i++) {
			var promise = this.__applyRules(bind, rules[i]);
			promises.push(promise);
		}
		Q.allSettled(promises).then(function(results) {
			results.forEach(function(result) {
				if (result.state === "rejected")
					deferred.reject(Exception(result.reason, 500));
			});
			deferred.resolve(results[results.length - 1]);
		}).done();
		return deferred.promise;
	},
	__applyRules : function(bind, rule) {
		var deferred = Q.defer();
		var selectors = rule.selectors, declarations = rule.declarations;
		var numOfSelectors = selectors.length, numOfDeclarations = declarations.length;
		var selector, selector_name, declaration, property, value, propVal, lastDecl, imageUrl, lastIdx, lastChar, r, t;
		for (r = 0; r < numOfSelectors; r++) {
			selector = selectors[r];
			if (selector.charAt(0) === '.')
				selector = selector.substr(1);
			selector_name = 'inline_' + selector;
			bind[selector_name] = 'style="';
			for (t = 0; t < numOfDeclarations; t++) {
				declaration = declarations[t];
				lastDecl = numOfDeclarations - t;
				property = declaration.property;
				value = declaration.value;
				// check and replace the property image if ImageUrl is provided
				if (bind.action === "PropertyContactAgent" && selector === "propertyImage") {
					if (property === "background" && bind.ImageUrl) {
						if (value.indexOf('https://www.truzip.com/images/head.jpg') > -1) {
							imageUrl = bind.ImageUrl;
							lastIdx = imageUrl.length - 1;
							lastChar = imageUrl.charAt(lastIdx);
							if (lastChar === "/") {
								bind.ImageUrl = bind.ImageUrl.slice(0, -1);
								console.log('-- Property Image URL had a proceeding "/"... Removed "/" --');
							}
							value = value.replace('https://www.truzip.com/images/head.jpg', bind.ImageUrl);
						}
					}
				}
				propVal = property + ': ' + value + ';';
				// on last decl, add the ending ' " ' (quotation marks)
				if (lastDecl === 1)
					propVal = propVal + '"';
				bind[selector_name] += propVal;
			}
		}
		deferred.resolve(bind);
		return deferred.promise;
	}
};