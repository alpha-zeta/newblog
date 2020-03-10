module.exports = getDate;
function getDate() {
	var date = new Date();
	var options = {
		day   : 'numeric',
		month : 'short',
		year  : 'numeric'
	};

	var day = date.toLocaleDateString('en-US', options);
	return day;
}
