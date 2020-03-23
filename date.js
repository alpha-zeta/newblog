module.exports = getDate;
function getDate(x) {
	let date = new Date();
	let options = {
		year     : 'numeric',
		month    : 'short',
		day      : 'numeric',
		timeZone : x
	};
	let intlDateObj = new Intl.DateTimeFormat('en-GB', options);

	let localTime = intlDateObj.format(date);
	return localTime;
}
