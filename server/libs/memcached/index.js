var Memcached = require('memcached');

module.exports = {
	initialize : function() {
		var host = global.config[global.config.environment].memcached;
		Memcached.config.maxValue = 3145728;
		// about 3MB max size
		global.memcached = new Memcached(host);
		console.info("Connected to Memcached: " + host);
	},
	getInstance : function() {
		return global.memcached;
	}
};
