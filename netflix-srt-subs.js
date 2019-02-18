const DEBUG = true;
const UPDATE_TIME = 100; // ms
const SUBS_BOTTOM_PADDING_PERCENT = 0.10;
const BUTTON_FADEOUT_TIME = 3000; // ms

let intervalId = null;

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
 * Gets the width of the video, so we can avoid having subtitles in the letterbox area.
 * This works by the assumption that the video will take up 100% height. Then we can
 * Figure out the real width from this and the aspect ratio.
 */
function getVideoRealPixelWidth(videoId) {
	let video = document.evaluate(`//*[@id="${videoId}"]/video`, document).iterateNext();
	if(video) {
		let aspectRatio = video.videoWidth / video.videoHeight;
		return video.offsetHeight * aspectRatio;
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
 * Removes elements by ID, if they exist. Otherwise does nothing.
 */
function removeElementById(id) {
	let existingElement = document.getElementById(id);
	if(existingElement !== null) {
		existingElement.outerHTML = '';
	}
}

/**
 * Displays a file picker to select an SRT file. This must be done since browser
 * actions will close the moment a file picker is opened, which makes it impossible
 * to have any interaction at all. When an SRT file is chosen, we will process it
 * and start displaying subtitles according to the current timestamp of the video.
 */
function displaySrtFilePicker() {
	// Since this method is called at the start, when the addon is refreshed, and on history
	// state update, clear anything that may already exist from a previous run.
	removeElementById('netflix-srt-subs-picker-box');
	removeElementById('netflix-srt-subs-container');
	if(intervalId !== null) clearInterval(intervalId);

	let videoId = getVideoId();
	if(videoId === null) return;

	let html = htmlToElement(`<div id="netflix-srt-subs-picker-box" style="transform: translateX(-100%);">
			Load subs:
			<input type="file" id="netflix-srt-subs-file-picker" style="display: none;" accept=".srt">
			<input type="button" id="netflix-srt-subs-browse-button" value="Browse..."
			onclick="document.getElementById('netflix-srt-subs-file-picker').click();">
			<img src="${browser.extension.getURL("icons/48.png")}" alt="Subs">
			<br>
			Offset: <input type="number" id="netflix-srt-subs-offset" value="0.0" step="0.1">
		</div>`);
	document.body.appendChild(html);

	// Auto show and hide the subtitle loader on hover
	let elementUnderMouse = false;
	let subPickerBox = document.getElementById('netflix-srt-subs-picker-box');
	subPickerBox.addEventListener('mouseover', () => {
		subPickerBox.style.left = '0';
		subPickerBox.style.transform = '';
		elementUnderMouse = true;
	});
	subPickerBox.addEventListener('mouseout', () => {
		subPickerBox.style.left = '32px';
		subPickerBox.style.transform = 'translateX(-100%)';
		elementUnderMouse = false;
	});

	// Hide even the little "nub" after a bit
	let lastMouseMovement = Date.now();
	document.addEventListener('mousemove', () => {
		lastMouseMovement = Date.now();
		subPickerBox.style.opacity = '100';

		// Fade out if the mouse isn't moved for a bit and we're not over the element
		let fadeFunc = () => {
			let elapsedTimeSinceMouseMovement = Date.now() - lastMouseMovement;
			if(!elementUnderMouse && elapsedTimeSinceMouseMovement >= BUTTON_FADEOUT_TIME) {
				subPickerBox.style.opacity = '0';
			}
			else {
				// Restart timer for either the remaining time or the full period if we're still
				// over the element.
				let timeToGive = elapsedTimeSinceMouseMovement - BUTTON_FADEOUT_TIME;
				if(elementUnderMouse) {
					timeToGive = BUTTON_FADEOUT_TIME;
				}
				setTimeout(fadeFunc, timeToGive);
			}
		}
		setTimeout(fadeFunc, BUTTON_FADEOUT_TIME);
	});

	// Read the selected SRT file once we select a file
	let fileInput = document.getElementById('netflix-srt-subs-file-picker');
	fileInput.addEventListener('change', () => {
		// Refocus video controls so spacebar can pause
		let playButtons = document.getElementsByClassName('default-control-button button-nfplayerPlay');
		if(playButtons.length >= 1) {
			playButtons[0].focus();
		}
		else {
			console.log('Cannot refocus play button. Maybe Netflix broke this or video not yet loaded?');
		}

		var file = fileInput.files[0];
		if(file) {
			if(DEBUG) console.log(`Netflix SRT subs loading file ${file.name}`);
			var reader = new FileReader();
			reader.readAsText(file, "UTF-8");
			reader.onload = (ev) => {
				let fileContents = ev.target.result;

				displaySubs(videoId, fileContents)
			};
			reader.onerror = () => {
				// TODO: handle errors in more user friendly manner
				console.log(` Netflix SRT subs error occurred reading file ${file.name}`)
			};
		}
		else {
			if(DEBUG) console.log('Netflix SRT subs no file selected');
		}
	});
}

/**
 * Gets the video ID. This is necessary to get the video element.
 */
function getVideoId() {
	// Get the URL without any query parameters or anchors
	let url = window.location.href;
	if(DEBUG) console.log(`Netflix SRT subs URL: ${url}`);

	match = /netflix\.[a-z]+\/watch\/([0-9]+)/i.exec(url);
	if(match !== null && match.length > 1) {
		let videoId = match[1];
		if(DEBUG) console.log(`Netflix SRT subs detected this page to be a video (id = ${videoId})`);
		return videoId;
	}
	else {
		return null;
	}
}

/**
 * Given the contents of an SRT file, displays the subs in sync with the current video.
 */
function displaySubs(videoId, srtContents) {
	// Remove if existing
	let existingElement = document.getElementById('netflix-srt-subs-container');
	if(existingElement !== null) {
		existingElement.outerHTML = '';
	}

	let html = htmlToElement(`<div id="netflix-srt-subs-container"></div>`);
	document.body.appendChild(html);
	let subContainerElement = document.getElementById('netflix-srt-subs-container');
	let offsetElement = document.getElementById('netflix-srt-subs-offset');

	let subs = getSubtitleRecords(srtContents);
	subs.sort((r1, r2) => r1.from - r2.from); // Sort by from times (so we can efficiently handle overlaps)

	// Loop indefinitely for subs (indefinitely so that we still display correct subs even when we
	// seek  in the video).
	intervalId = setInterval(() => {
		let time = getTimeInVideo(videoId);
		time += parseFloat(offsetElement.value);

		// Unfortunately, this can legit happen by simply loading the subs before the video has
		// loaded. There is no good way to detect if the video has failed to be detected.
		if(time === null) {
			return;
		}

		// Dumb approach: just loop through all the records
		let currentSub = '';
		for(let record of subs) {
			if(time >= record['from'] && time <= record['to']) {
				// Deal with merged subs
				if(currentSub !== '') {
					currentSub += '<br>';
				}
				currentSub += `<span>${record['text']}</span>`;
			}
		}

		// Get the controls for nicer positioning
		let controlsHeight = 0;
		let controlsElements = document.getElementsByClassName('PlayerControlsNeo__bottom-controls');
		let areControlsVisible = controlsElements.length === 1 &&
				!controlsElements[0].className.includes('PlayerControlsNeo__bottom-controls--faded');
		if(controlsElements.length === 0) {
			console.log('Could not find controls. Maybe Netflix broke this feature?');
		}
		else {
			controlsHeight = controlsElements[0].offsetHeight;
		}

		let videoRealWidth = getVideoRealPixelWidth(videoId);
		subContainerElement.style.width = `${videoRealWidth}px`;

		subContainerElement.innerHTML = currentSub;
		if(currentSub === '') {
			subContainerElement.style.display = 'none';
		}
		else {
			subContainerElement.style.display = 'block';

			let offsetFromTop = window.innerHeight;
			if(areControlsVisible) {
				offsetFromTop -= controlsHeight;
			}
			offsetFromTop -= offsetFromTop * SUBS_BOTTOM_PADDING_PERCENT;
			subContainerElement.style.top = `${offsetFromTop}px`;
		}

	}, UPDATE_TIME)
}

/**
 * Processes the SRT file to get a list of from times, to times, and their subtitles.
 */
function getSubtitleRecords(srtContents) {
	let subtitleRecords = [];
	let srtLines = srtContents.split(/\r?\n/);
	let fragmentIndex = 1;
	let lineNumber = 0;
	while(lineNumber < srtLines.length) {
		// Parse fragment by fragment
		// We don't need the index, but let's check it as a form of error detection
		let indexLine = srtLines[lineNumber++].trim();
		if(!indexLine.match(/\d+/)) {
			console.log(`Expected fragment index on line ${lineNumber - 1}, but got ${indexLine}`);
			// Just continue, maybe there is no fragment counts?
		}
		else {
			let currentFragmentIndex = parseInt(indexLine);
			if(currentFragmentIndex !== fragmentIndex) {
				console.log(`Expected fragment ${fragmentIndex} but got ${currentFragmentIndex} on line ${lineNumber - 1}`);
				fragmentIndex = currentFragmentIndex; // Maybe this will work?
			}
			else {
				// Found the right one
				fragmentIndex++;
			}
		}

		// Parse timestamps
		let timestampLine = srtLines[lineNumber++].trim();
		if(!timestampLine.includes('-->')) {
			console.log(`Invalid timestamp line. Got: ${timestampLine} on line ${lineNumber - 1}`);
			// No way to go without this, so skip
			continue;
		}
		let fromAndTo = timestampLine.split('-->');
		if(fromAndTo.length !== 2) {
			console.log(`Invalid timestamp line. Got: ${timestampLine} on line ${lineNumber - 1}`);
			continue;
		}
		let fromSeconds = 0;
		let toSeconds = 0;
		try {
			fromSeconds = parseTimeStampToSeconds(fromAndTo[0].trim());
			toSeconds = parseTimeStampToSeconds(fromAndTo[1].trim());
		} catch(ex) {
			console.log(`Invalid timestamp line. Got: ${timestampLine} on line ${lineNumber - 1}. Details: ${ex}`);
			continue;
		}

		// Now parse remaining lines as the subtitle text until we get a blank line
		let subtitleText = '';
		while(true) {
			let line = srtLines[lineNumber++].trim();
			if(line === '') break;
			// Auto add line breaks
			if(subtitleText !== '') {
				subtitleText += '<br>';
			}
			subtitleText += escapeDangerousHtml(line);
		}

		// We now have a subtitle record!
		subtitleRecords.push({
			'from': fromSeconds,
			'to': toSeconds,
			'text': subtitleText
		});
	}

	return subtitleRecords;
}

/**
 * SRT allows some HTML, like <b>, <i>, <u>, and <font color="...">. Remove the
 * rest (and potentially dangerous parameters).
 */
function escapeDangerousHtml(text) {
	// Wrap in span because we may have multiple nodes
	let whitelistNodes = ['b', 'i', 'u', 'font', '#text', 'br'];
	let whitelistParameters = ['color', 'size'];
	let html = htmlToElement(`<span>${text}</span>`);
	function escapeRecursively(element) {
		if(whitelistNodes.indexOf(element.nodeName.toLowerCase()) === -1) {
			element.parentElement.replaceChild(document.createTextNode(element.innerText), element);
		}
		else {
			if('attributes' in element) {
				let attributesToRemove = [];
				for(let attrIndex = 0; attrIndex < element.attributes.length; ++attrIndex) {
					let attr = element.attributes.item(attrIndex);
					if(whitelistParameters.indexOf(attr.localName) === -1) {
						attributesToRemove.push(attr.localName);
					}
				}
				for(let attribute of attributesToRemove) {
					element.removeAttribute(attribute);
				}
			}
			for(let i = 0; i < element.childNodes.length; ++i) {
				escapeRecursively(element.childNodes[i]);
			}
		}
	}
	for(let i = 0; i < html.childNodes.length; ++i) {
		escapeRecursively(html.childNodes[i]);
	}
	return html.innerHTML;
}

/**
 * Like parseInt but raises an error if something goes wrong.
 */
function parseIntOrError(i) {
	let r = parseInt(i);
	if(!isNaN(r)) {
		return r;
	}
	else {
		throw new Error(`Expected int but got ${i}`);
	}
}

/**
 * Timestamps in the form of `hours:minutes:seconds,milliseconds` suck for programming. Convert
 * to a single number of seconds.
 */
function parseTimeStampToSeconds(timestampString) {
	let timestamp = 0;

	// Try and account for weird subs that might be missing hours or milliseconds
	let secondsAndMs = timestampString.split(',');
	if(secondsAndMs.length > 2) {
		throw new Error(`Timestamp ${timestampString} has too many commas`);
	}
	if(secondsAndMs.length === 2) {
		let ms = parseIntOrError(secondsAndMs[1]);
		timestamp += ms / 1000;
	}

	// From the end add seconds * 1, minutes * 60, hours * 60 * 60...
	let timeComponents = secondsAndMs[0].split(':');
	secondsMultiplier = 1;
	for(let i = timeComponents.length - 1; i >= 0; --i) {
		let timeComponent = parseIntOrError(timeComponents[i]);
		timestamp += timeComponent * secondsMultiplier;
		secondsMultiplier *= 60;
	}

	return timestamp;
}

// TODO: allow clearing subs
// TODO: make sub style configurable
// TODO: less repetetion of computation

displaySrtFilePicker();
if(DEBUG) console.log('Netflix SRT subs active');

// Netflix's homepage doesn't actually load a new page when you choose a video, so when we detect
// the history has changed, then we probably loaded a new video, so determine again if we should
// be displaying the file picker.
browser.runtime.onMessage.addListener((data) => {
	if (data.action === "pageChanged") {
		if(DEBUG) console.log('Netflix SRT subs page changed');
		displaySrtFilePicker();
	}
});