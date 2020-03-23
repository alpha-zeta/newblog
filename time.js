module.exports = getTime;
function getTime(x) {
	let date = new Date();
	let options = {
		timeZone : x,
		hour     : 'numeric',
		minute   : 'numeric'
	};
	let intlDateObj = new Intl.DateTimeFormat('en-GB', options);

	let localTime = intlDateObj.format(date);
	return localTime;
}
