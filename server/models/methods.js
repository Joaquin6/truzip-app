var Q = require("q");
var email = require("emailjs/email");
var Exception = require('../libs/utils').Exception;
var sprintf = require("sprintf-js").sprintf;

module.exports = {
	__emailServer : null,
	Email : function(from, to, subject, body, attachments, cc) {
		console.log('-- Begin Attempt to Send Email --');
		var deferred = Q.defer();
		var server = this.__getServer();
		body += "\r\n";
		var params = {
			text : body,
			from : from,
			to : to,
			subject : subject
		};

		if (attachments)
			params.attachment = attachments;
		if (cc)
			params.cc = cc;
		params.bcc = global.config.email.admins.join();

		params.from = "Truzip <" + params.from + ">";
		server.send(params, function(err, message) {
			try {
				if (err) {
					var errmsg = sprintf('-- INTERNAL ERROR: Methods Module: "Email": Email Server Problem! Unable to send message: %s, Error: %s, ErrMessage: %s --', message, JSON.stringify(err), err.message);
					console.error(errmsg);
					deferred.reject(Exception(err.message, err.code));
				} else {
					console.log('-- Successfully Sent Email --');
					deferred.resolve(message);
				}
			} catch (e) {
				console.error("Exception on Sending EMAIL: " + e);
				deferred.reject("Exception on Sending EMAIL");
			}
		});
		return deferred.promise;
	},
	AdminEmail : function(type, subject, body, isDailyReport) {
		console.log('-- Begin Attempt to Send Admin Email --');
		var domain = "@truzip.com";
		var from = type + domain;
		var to = from;

		if (subject == null)
			subject = "Admin Notification - Truzip";

		this.Email(from, to, subject, body).then(function(adminMessage) {
			console.log('-- Successfully Sent Admin Email! --');
		}).fail(function(err) {
			var msg = sprintf('-- INTERNAL ERROR: "AdminEmail": Failed to Send Admin Email! The Subject was: %s --', subject);
			console.log(msg);
			console.error(err);
		}).done();
	},
	__getServer : function() {
		var config = global.config.email;
		if (this.__emailServer)
			return this.__emailServer;
		this.__emailServer = email.server.connect({
			user : config.user,
			password : config.password,
			host : config.host,
			port : config.port,
			ssl : config.ssl
		});
		return this.__emailServer;
	}
};
