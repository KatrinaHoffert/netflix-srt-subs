console.log('Netflix SRT subs background script running');

// Netflix annoyingly doesn't seem to have a good way to detect when we either start a video or
// when we transition. This will catch all netflix page transitions.
// https://www.reddit.com/r/javascript/comments/4svcfn/how_do_i_detect_windowlocationhref_changes_on/d5crplx/
browser.webNavigation.onHistoryStateUpdated.addListener(e => {
	// send message to the tab that started watching
	browser.tabs.sendMessage(e.tabId, {action: 'pageChanged'} );
}, {url: [{hostSuffix: 'netflix.com'}]});