var properties = require('./properties');
var geos = require('./geos');
var deals = require('./deals');
var methods = require('./methods');
var agents = require('./agents');
var users = require('./users');

module.exports = {
	route : function(app) {
		app.use('/properties', properties);
		app.use('/geos', geos);
		app.use('/deals', deals);
		app.use('/methods', methods);
		app.use('/agents', agents);
		app.use('/users', users);
		geos.prefetch();
		agents.startDailyReports();
	}
};
