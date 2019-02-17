const DEBUG = true;

function main() {
	if(DEBUG) console.log('Netflix SRT subs active');

	// Get the URL without any query parameters or anchors
	let url = window.location.href;
	url = url.split('?')[0];
	url = url.split('#')[0]; // In case there is no query parameters

	// URL is, eg, https://www.netflix.com/watch/70136341 -- want the 70136341
	let urlSplitOnSlash = url.split('/');
	let videoId = urlSplitOnSlash[urlSplitOnSlash.length - 1];

	if(DEBUG) console.log(`Netflix SRT subs URL: ${url} Video ID: ${videoId}`);

	// We seem to be on a video page
	if(videoId.match(/\d+/)) {
		if(DEBUG) console.log(`Netflix SRT subs detected this page to be a video (id = ${videoId})`);
		setInterval(() => {
			console.log(getTimeInVideo(videoId));
		}, 500)
	}
}

/**
 * Gets the time into the video in seconds.
 */
function getTimeInVideo(videoId) {
	// https://stackoverflow.com/a/42047162/1968462
	let video = document.evaluate(`//*[@id="${videoId}"]/video`, document).iterateNext();
	if(video) {
		return video.currentTime;
	}
	else {
		return null;
	}
}

/**
 * Receives the SRT text from the background script.
 */
function receiveSrtText(message) {
	if('srt_data' in message) {
		console.log(`RECEIVED: ${message['srt_data']}`);
	}
	else {
		console.log(`Received unexpected message: ${JSON.stringify(message)}`);
	}
	return Promise.resolve();
}
browser.runtime.onMessage.addListener(receiveSrtText);

main();