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

// https://stackoverflow.com/a/35385518/1968462
function htmlToElement(html) {
	let template = document.createElement('template');
	html = html.trim(); // Never return a text node of whitespace as the result
	template.innerHTML = html;
	return template.content.firstChild;
}

/**
 * Displays a file picker to select an SRT file. This must be done since browser
 * actions will close the moment a file picker is opened, which makes it impossible
 * to have any interaction at all.
 */
function displaySrtFilePicker() {
	// Remove if existing
	let existingElement = document.getElementById('netflix-srt-subs-main-box');
	if(existingElement) {
		existingElement.outerHTML = '';
	}

	// TODO: Make this auto-hide
	let html = htmlToElement(`<div style="position: fixed; top: 0; left: 0; background-color: white;
			color: black; z-index: 1; padding: 0.25em;"
			class="netflix-srt-subs-main-box">
			Load subs:
			<input type="file" id="netflix-srt-subs-file-picker" style="display: none;">
			<input type="button" value="Browse..." onclick="document.getElementById('netflix-srt-subs-file-picker').click();">
		</div>`);
	document.body.appendChild(html);

	let fileInput = document.getElementById('netflix-srt-subs-file-picker');
	fileInput.addEventListener('change', () => {
		var file = fileInput.files[0];
		if(file) {
			if(DEBUG) console.log(`Netflix SRT subs loading file ${file}`);
			var reader = new FileReader();
			reader.readAsText(file, "UTF-8");
			reader.onload = (ev) => {
				let fileContents = ev.target.result;

				// TODO: parse and make subs
				console.log(fileContents)
			};
			reader.onerror = () => {
				// TODO: handle nicely
				console.log(` Netflix SRT subs error occurred reading file ${file}`)
			};
		}
		else {
			if(DEBUG) console.log('Netflix SRT subs no file selected');
		}
	});
}

// TODO: detect when video changes and remove subs

main();
displaySrtFilePicker();