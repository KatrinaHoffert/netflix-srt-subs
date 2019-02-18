# Netflix SRT Subs

This is a Firefox addon for loading arbitrary subtitles in the SRT format onto
any Netflix video. This lets you fill in the gaps for titles that are missing
subtitles as well as allow you to use foreign languages that do not have
subtitles!

## Usage

Usage is easy-peasy. Once installed, the addon will make a small "knob" appear at
the top right corner (don't worry, this fades away after a few seconds of not
moving your mouse!):

![Top right corner of Netflix video](https://i.imgur.com/VsYzoiz.png)

Hovering over this knob will reveal a prompt to select an SRT file to use:

![Once hovered over](https://i.imgur.com/CowaUaU.png)

There are many places you can get SRT files for videos, such as:

* subscene.com
* addic7ed.com
* opensubtitles.org

**Note:** This is *not* an endorsement of these sites. Use them with caution. Never
download or run executables. An adblocker is recommended.

You can also make subtitles yourself with programs like (again, not an endorsement):

* Subrip
* Aegisub
* Subtitle Edit

The SRT format is also simple enough to write in a plain text editor.

## Features

* Subtitles sync to the video's elapsed time, even when pausing, buffering
  occurs, and seeking.
* Basic text formatting (bold, italics, underlined, colours, and different
  font sizes) are supported in SRT files.
* Offsets can be specified on the fly for subtitles that are off sync.
* Effective SRT file parsing that can handle things like non-linear subtitles,
  overlapping timings, and various unusual cases.
* Subtitle positioning is aware of the video size and if controls are visible,
  resulting in an experience comparable to Netflix's native subtitles.

## Found a bug?

Sadly, the nature of Netflix not having any form of official API for their
in-browser player means we are vulnerable to things breaking simply due to changes
in the page structure. That's not to lay blame on Netflix or anything, but
simply to highlight that things breaking can be inevitible. Please file an
issue if it happens with details (browser version, video, anything specific
that you did, etc).
