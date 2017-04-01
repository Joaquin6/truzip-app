var fs = require("fs");
var Q = require("q");
var sprintf = require("sprintf-js").sprintf;
var _ = require('underscore');
var Exception = require('../libs/utils').Exception;
var CSSParser = require("../libs/cssparser");
var templateDir = __dirname + '/../templates/emails/';

_.templateSettings = {
	evaluate : /\{\[([\s\S]+?)\]\}/g,
	interpolate : /\{\{([\s\S]+?)\}\}/g
};

module.exports = {
	getAgentEmailTemplate : function(bind) {
		var deferred = Q.defer();
		var files = this.__getAgentFiles(bind);
		var context = {};
		context.subject = bind.subject;
		context.to = bind.to;
		var that = this;
		this.__getTemplateStyles(files, bind).then(function(bind) {
			that.__getAgentEmailText(files, bind).then(function(textContext) {
				context.text = textContext;
				that.__getAgentEmailHTML(files, bind).then(function(tempObj) {
					console.log('-- Begin attempt "__bindTemplate" for AGENT --');
					that.__bindTemplate(bind, tempObj).then(function(htmlContext) {
						console.log('-- Successfully completed "__bindTemplate" for AGENT --');
						context.attachments = [{
							data : htmlContext,
							alternative : true
						}];
						deferred.resolve(context);
					});
				});
			});
		}).catch(function(err) {
			console.log(err);
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},
	getUserEmailTemplate : function(bind) {
		var deferred = Q.defer();
		var files = this.__getUserFiles(bind);
		var context = {};
		context.subject = bind.subject;
		context.to = bind.to;
		var that = this;
		this.__getTemplateStyles(files, bind).then(function(bind) {
			that.__getUserEmailText(files, bind).then(function(textContext) {
				context.text = textContext;
				that.__getUserEmailHTML(files, bind).then(function(tempObj) {
					console.log('-- Begin attempt "__bindTemplate" for USER --');
					that.__bindTemplate(bind, tempObj).then(function(htmlContext) {
						console.log('-- Successfully completed "__bindTemplate" for USER --');
						context.attachments = [{
							data : htmlContext,
							alternative : true
						}];
						deferred.resolve(context);
					});
				});
			});
		}).catch(function(err) {
			console.log(err);
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},
	getAdminEmailTemplate : function(bind) {
		var deferred = Q.defer();
		var files = this.__getAdminFiles();
		var context = {};
		var that = this;
		this.__getAdminEmailText(files, bind).then(function(textContext) {
			context.text = textContext;
			deferred.resolve(context);
		}).fail(function(err) {
			console.log(err);
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},
	__readFile : function(file) {
		var deferred = Q.defer();
		var filename = templateDir + file;
		fs.readFile(filename, 'utf8', function(err, text) {
			if (err) {
				var msg = sprintf('<<< Templates Module: __readFile: There was an error trying to read file %s! >>>', filename);
				console.log(msg);
				deferred.reject(msg);
			} else
				deferred.resolve(text);
		});
		return deferred.promise;
	},
	__bindTemplate : function(bind, tempObj) {
		var errCnsl = '<<< BINDING ERROR: Templates Module: __bindTemplate >>>';
		var errMsg = 'Templates Module: "__bindTemplate": There was a problem binding the Data provided and the HTML Template!';
		var deferred = Q.defer();
		this.__readFile('main.html').then(function(skeleton) {
			var context = _.template(skeleton);
			context = context(tempObj);
			if (context !== null || context !== undefined) {
				var newContext = _.template(context);
				newContext = newContext(bind);
				if (newContext !== null || newContext !== undefined)
					deferred.resolve(newContext);
				else {
					console.log(errCnsl);
					deferred.reject(errMsg);
				}
			} else {
				console.log(errCnsl);
				deferred.reject(errMsg);
			}
		}).fail(function(err) {
			console.log('Templates Module: "__bindTemplate": There was a problem reading the HTML file (main.html)!');
			console.log(err);
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},
	__getConfigValues : function(bind, type) {
		// These value are editble in the config.json file
		var config = global.config.email.notifications;
		bind.configImagePath = config.imagePath;
		if (type == 'agent')
			bind.configHeaderSlogan = config.agent.slogan;
		else
			bind.configHeaderSlogan = config.user.slogan;
		bind.configHeaderLogoImage = bind.configImagePath + config.logo.image;
		bind.configHeaderLogoImageAlt = config.logo.alternate + ' - ' + bind.configHeaderSlogan;
		bind.configExternalImageAlternate = config.images.externalAlternate;
		if (bind.ImageUrl === undefined || bind.ImageUrl === null)
			bind.ImageUrl = bind.configImagePath + 'head.jpg';
	},
	__fixBindingValues : function(bind) {
		if (bind.LotSize !== undefined) {
			if (bind.LotSize === '0' || parseInt(bind.LotSize) === 0)
				bind.LotSize = null;
		}
		if (bind.BathroomsFull !== undefined) {
			if (bind.BathroomsFull === '0' || parseInt(bind.BathroomsFull) === 0)
				bind.BathroomsFull = null;
		}
		if (bind.Bedrooms !== undefined) {
			if (bind.Bedrooms === '0' || parseInt(bind.Bedrooms) === 0)
				bind.Bedrooms = null;
		}
		if (bind.isAboveMarket) {
			if (bind.YouSave.indexOf('-$') > -1)
				bind.YouSave = bind.YouSave.replace('-$', '$');
		}
		if (!bind.YearBuilt)
			bind.YearBuilt = 'N/A';
		if (!bind.MedianYearBuilt)
			bind.MedianYearBuilt = 'N/A';
		if (!bind.YearBuiltDiff)
			bind.YearBuiltDiff = 'N/A';
	},
	__getAgentFiles : function(bind) {
		this.__getConfigValues(bind, 'agent');
		var filePath = 'agent/';
		var genericFilePath = 'generic/';

		var files = {};
		files.css = 'main.css';
		files.boilerplate = 'main.html';
		files.header = genericFilePath + 'header.html';
		files.footer = genericFilePath + 'footer.html';
		files.text = null;
		files.html = null;

		bind.isAboveMarket = false;
		if (bind.DealType) {
			if (bind.DealType === " Above Market" || bind.DealType === "Above Market")
				bind.isAboveMarket = true;
		}
		// Check if recipient is a GMail
		bind.isGmail = false;
		if (bind.to || bind.email) {
			var email = bind.to || bind.email || null;
			if (email.indexOf('@gmail.com') > -1)
				bind.isGmail = true;
		}

		switch (bind.action) {
		case "AgentSignUp":
			files.text = filePath + 'welcomeNewAgent.txt';
			files.html = filePath + 'welcomeNewAgent.html';
			bind.subject = "Truzip.com - Welcome!";
			break;
		case "UserSignIn":
		case "AssignAgentFromSearch":
		case "SatisfyNewSub":
			files.text = filePath + 'gotNewLead.txt';
			files.html = filePath + 'gotNewLead.html';
			bind.subject = "You have a New Lead - Truzip.com";
			break;
		case "ListingBuyForLess":
			files.text = filePath + 'listingBuyForLess.txt';
			files.html = filePath + 'listingBuyForLess.html';
			bind.subject = "Contact Your Lead - Truzip.com";
			break;
		case "ListingSellForMore":
			files.text = filePath + 'listingSellForMore.txt';
			files.html = filePath + 'listingSellForMore.html';
			bind.subject = "Contact Your Lead - Truzip.com";
			break;
		case "MainBuyForLess":
			files.text = filePath + 'mainBuyForLess.txt';
			files.html = filePath + 'mainBuyForLess.html';
			bind.subject = "Contact Your Lead - Truzip.com";
			if (bind.newUser)
				bind.subject = "You have a New Lead - Truzip.com";
			this.__handleMultiSelect(bind);
			break;
		case "MainSellForMore":
			files.text = filePath + 'mainSellForMore.txt';
			files.html = filePath + 'mainSellForMore.html';
			bind.subject = "Contact Your Lead - Truzip.com";
			if (bind.newUser)
				bind.subject = "You have a New Lead - Truzip.com";
			this.__handleMultiSelect(bind);
			break;
		case "PropertyContactAgent":
			files.text = filePath + 'propertyInfo.txt';
			files.html = filePath + 'propertyInfo.html';
			bind.subject = "Lead Update - Truzip.com";
			this.__fixBindingValues(bind);
			break;
		}
		return files;
	},
	__getAgentEmailText : function(files, bind) {
		var deferred = Q.defer();
		this.__readFile(files.text).then(function(text) {
			var context = _.template(text);
			if (bind.leadsLeft === undefined)
				bind.leadsLeft = null;
			context = context(bind);
			if (context !== undefined || context !== null)
				deferred.resolve(context);
			else
				deferred.reject(Exception('There was a problem binding the Data to the Text Template!', 500));
		}).fail(function(err) {
			console.log(err);
			deferred.reject(Exception(err, 500));
		}).done();
		return deferred.promise;
	},
	__getAgentEmailHTML : function(files, bind) {
		var deferred = Q.defer();
		var that = this;
		var temp = {};
		this.__readFile(files.css).then(function(styles) {
			temp.styles = styles;
			that.__readFile(files.html).then(function(text) {
				temp.htmlBody = text;
				that.__readFile(files.header).then(function(header) {
					var context = _.template(header);
					if (bind.leadsLeft === undefined)
						bind.leadsLeft = null;
					bind.mainHeader = context(bind);
					if (bind.mainHeader === null || bind.mainHeader === undefined) {
						var errMsg = 'There was a problem binding the Data to the Header HTML Template!';
						console.log('-- ' + errMsg + ' --');
						deferred.reject(Exception(errMsg, 500));
					}
					that.__readFile(files.footer).then(function(footer) {
						var ftrContext = _.template(footer);
						bind.mainFooter = ftrContext(bind);
						if (bind.mainFooter !== null || bind.mainFooter !== undefined)
							deferred.resolve(temp);
						else {
							var errMsg = 'There was a problem binding the Data to the Footer HTML Template!';
							console.log('-- ' + errMsg + ' --');
							deferred.reject(Exception(errMsg, 500));
						}
					});
				});
			});
		}).catch(function(err) {
			console.log(err);
			deferred.reject(Exception(err, 500));
		}).done();
		return deferred.promise;
	},
	__getUserFiles : function(bind) {
		this.__getConfigValues(bind, 'user');
		var filePath = 'user/';
		var genericFilePath = 'generic/';

		var files = {};
		files.css = 'main.css';
		files.boilerplate = 'main.html';
		files.header = genericFilePath + 'header.html';
		files.footer = genericFilePath + 'footer.html';
		files.text = null;
		files.html = null;

		bind.isAboveMarket = false;
		if (bind.DealType) {
			if (bind.DealType === " Above Market" || bind.DealType === "Above Market")
				bind.isAboveMarket = true;
		}
		// Check if recipient is a GMail
		bind.isGmail = false;
		if (bind.to || bind.email) {
			var email = bind.to || bind.email || null;
			if (email.indexOf('@gmail.com') > -1)
				bind.isGmail = true;
		}

		switch (bind.action) {
		case "UserSignIn":
		case "MainBuyForLess":
		case "MainSellForMore":
			files.text = filePath + 'welcomeNewUser.txt';
			files.html = filePath + 'welcomeNewUser.html';
			//bind.MainImg = bind.configImagePath + 'modern-house.jpg';
			bind.subject = "Truzip.com - Welcome!";
			this.__handleMultiSelect(bind);
			break;
		case "PropertyContactAgent":
			files.text = filePath + 'propertyInfo.txt';
			files.html = filePath + 'propertyInfo.html';
			bind.subject = "Truzip.com - Your Requested Property Details";
			this.__fixBindingValues(bind);
			break;
		}
		return files;
	},
	__getUserEmailText : function(files, bind) {
		var deferred = Q.defer();
		this.__readFile(files.text).then(function(text) {
			var context = _.template(text);
			context = context(bind);
			if (context !== undefined || context !== null)
				deferred.resolve(context);
			else
				deferred.reject(Exception('Text Template Binding Failed!', 500));
		}).fail(function(err) {
			console.log(err);
			deferred.reject(Exception(err));
		}).done();
		return deferred.promise;
	},
	__getUserEmailHTML : function(files, bind) {
		var deferred = Q.defer();
		var that = this;
		var temp = {};
		this.__readFile(files.html).then(function(htmlBody) {
			temp.htmlBody = htmlBody;
			that.__readFile(files.header).then(function(header) {
				var context = _.template(header);
				bind.mainHeader = context(bind);
				if (bind.mainHeader === null || bind.mainHeader === undefined) {
					var errMsg = 'There was a problem binding the Data to the Header HTML Template!';
					console.log('-- ' + errMsg + ' --');
					deferred.reject(Exception(errMsg, 500));
				}
				that.__readFile(files.footer).then(function(footer) {
					var ftrContext = _.template(footer);
					bind.mainFooter = ftrContext(bind);
					if (bind.mainFooter !== null || bind.mainFooter !== undefined)
						deferred.resolve(temp);
					else {
						var errMsg = 'There was a problem binding the Data to the Footer HTML Template!';
						console.log('-- ' + errMsg + ' --');
						deferred.reject(Exception(errMsg, 500));
					}
				});
			});
		}).catch(function(err) {
			console.log(err);
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},
	__getAdminFiles : function() {
		var filePath = 'admin/';
		var files = {};
		files.text = filePath + 'adsReport.txt';
		return files;
	},
	__getAdminEmailText : function(files, bind) {
		var deferred = Q.defer();
		bind.agentTextList = this.__getAgentTextList(bind.agents);
		bind.typeOfData = 'Important Note: This is Production data!';

		var environment = global.config.environment;
		if (environment === 'dev')
			bind.typeOfData = 'Important Note: This is Development data!';

		this.__readFile(files.text).then(function(text) {
			var context = _.template(text);
			context = context(bind);
			if (context !== undefined || context !== null)
				deferred.resolve(context);
			else
				deferred.reject(Exception('Admin Text Template Binding Failed!', 500));
		}).fail(function(err) {
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},
	__getAgentTextList : function(agents) {
		var agentTextList = [];
		for (var x = 0; x < agents.length; x++) {
			var agentText = [];
			var agent = agents[x];
			agentText.push('First Name: ' + agent.Agent_First_Name);
			agentText.push('Email Address: ' + agent.Agent_Email);
			if (agent.Subscriptions.length > 0) {
				var subs = agent.Subscriptions;
				var numOfSubs = subs.length;
				for (var y = 0; y < numOfSubs; y++) {
					var sub = subs[y];
					var subNum = y + 1;
					agentText.push('		<<< Agent Subscription ' + subNum.toString() + ' of ' + numOfSubs + ' >>>');
					agentText.push('			Subscription Quantity: ' + sub.Subscription_Qty.toString());
					agentText.push('			Amount Left to Satisfy: ' + sub.Subscription_Satisfy.toString());
					agentText.push('			Geo Location: ' + sub.Subscription_Geo);
					agentText.push('			County Location: ' + sub.Subscription_County);
				}
			}
			agentTextList.push(agentText.join("\n"));
		}
		return agentTextList;
	},
	__getTemplateStyles : function(files, bind) {
		var deferred = Q.defer();
		this.__readFile(files.css).then(function(styles) {
			CSSParser.getBindingStyles(styles, files.css, bind).then(function(bind) {
				deferred.resolve(bind);
			});
		}).catch(function(err) {
			console.log('-- Failed To Generated Styles From CSS --');
			console.log(err);
			deferred.reject(err);
		}).done();
		return deferred.promise;
	},
	__handleMultiSelect : function(bind) {
		if (bind.multiSelect && bind.multiInterest)
			bind.city = bind.multiInterest;
		else if (bind.multiInterest == null && bind.multiSelect) {
			var numofCities = bind.city.length;
			var cities = '';
			for (var q = 0; q < bind.city.length; q++) {
				if (q === 0) {
					cities += bind.city[q];
					// first time
					continue;
				}
				var count = numofCities - q;
				if (count === 1)
					cities += ' and ' + bind.city[q];
				// last time
				else
					cities += ', ' + bind.city[q];
			}
			bind.city = cities;
		}
	}
};
