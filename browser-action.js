let button = document.querySelector('#submit');
button.onclick = () => {
	browser.tabs.query({active: true}, (tabs) => {
		let currentTabId = tabs[0].id;
		browser.tabs.sendMessage(currentTabId, {'srt_data': 'fake SRT data'});
	});
};