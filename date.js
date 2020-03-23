module.exports = getDate;
function getDate(x) {
	let date = new Date();

	let intlDateObj = new Intl.DateTimeFormat('en-GB', {
		timeZone : x
	});

	let localTime = intlDateObj.format(date);
	return localTime;
}
