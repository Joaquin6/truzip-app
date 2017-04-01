exports.Exception = function(message, code) {
	var error = new Error(message);
	error.code = code;
	return error;
};

// useful method of returning approx size of object
exports.memorySizeOf = function(obj) {
	var bytes = 0;

	function sizeOf(obj) {
		if (obj !== null && obj !== undefined) {
			switch(typeof obj) {
			case 'number':
				bytes += 8;
				break;
			case 'string':
				bytes += obj.length * 2;
				break;
			case 'boolean':
				bytes += 4;
				break;
			case 'object':
				var objClass = Object.prototype.toString.call(obj).slice(8, -1);
				if (objClass === 'Object' || objClass === 'Array') {
					for (var key in obj) {
						if (!obj.hasOwnProperty(key))
							continue;
						sizeOf(obj[key]);
					}
				} else
					bytes += obj.toString().length * 2;
				break;
			}
		}
		return bytes;
	};

	function formatByteSize(bytes) {
		if (bytes < 1024)
			return bytes + " bytes";
		else if (bytes < 1048576)
			return (bytes / 1024).toFixed(3) + " KiB";
		else if (bytes < 1073741824)
			return (bytes / 1048576).toFixed(3) + " MiB";
		else
			return (bytes / 1073741824).toFixed(3) + " GiB";
	};

	return formatByteSize(sizeOf(obj));
};

exports.shuffle = function(array) {
	var currentIndex = array.length,
	    temporaryValue,
	    randomIndex;

	// While there remain elements to shuffle...
	while (0 !== currentIndex) {

		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;

		// And swap it with the current element.
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}

	return array;
};

exports.daysHoursMinsFormat = function(t) {
	var cd = 24 * 60 * 60 * 1000,
	    ch = 60 * 60 * 1000,
	    d = Math.floor(t / cd),
	    h = Math.floor((t - d * cd) / ch),
	    m = Math.round((t - d * cd - h * ch) / 60000),
	    pad = function(n) {
		return n < 10 ? '0' + n : n;
	};
	if (m === 60) {
		h++;
		m = 0;
	}
	if (h === 24) {
		d++;
		h = 0;
	}
	return [d + "Days", pad(h) + "Hours", pad(m) + "Mins"].join(':');
};

exports.isAdminEmail = function(email) {
	for (var i = 0; i < global.config.email.admins.length; i++) {
		var admin = config.email.admins[i];
		if (admin.indexOf(email) > -1)
			return true;
	}
	return false;
};
