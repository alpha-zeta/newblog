module.exports = getTime;
function getTime() {
	var time = new Date();
	var currentTime = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	return currentTime;
}
