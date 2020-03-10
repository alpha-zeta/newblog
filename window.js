module.exports = getWindow;
function getWindow() {
	var url = window.location.href;
	console.log(url);
	console.log(url.split('/').length);
}
